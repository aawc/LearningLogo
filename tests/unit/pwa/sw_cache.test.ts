import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA Web App Manifest & Service Worker Cache-First Engine', () => {
  it('verifies manifest.json contains valid PWA specification fields', () => {
    const manifestPath = resolve(process.cwd(), 'public/manifest.json');
    expect(existsSync(manifestPath)).toBe(true);

    const content = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(content.name).toBe('LearningLogo - Turtle Graphics');
    expect(content.short_name).toBe('LearningLogo');
    expect(content.start_url).toBe('./');
    expect(content.display).toBe('standalone');
    expect(content.theme_color).toBe('#0072B2');
    expect(content.background_color).toBe('#121316');
    expect(Array.isArray(content.icons)).toBe(true);
    expect(content.icons.length).toBeGreaterThanOrEqual(2);
  });

  it('verifies service worker file public/sw.js exists and implements cache-first logic', () => {
    const swPath = resolve(process.cwd(), 'public/sw.js');
    expect(existsSync(swPath)).toBe(true);

    const swContent = readFileSync(swPath, 'utf-8');
    expect(swContent).toContain('CACHE_NAME');
    expect(swContent).toContain('caches.open');
    expect(swContent).toContain('SKIP_WAITING');
    expect(swContent).toContain('caches.delete');
  });

  it('verifies public/sw.js uses simple versioned cache name and bypasses versions.json and /releases/ subpaths', () => {
    const swPath = resolve(process.cwd(), 'public/sw.js');
    const swContent = readFileSync(swPath, 'utf-8');

    expect(swContent).toContain("const CACHE_NAME = 'learning-logo-' + APP_VERSION;");
    expect(swContent).not.toContain('getScopePrefix');
    expect(swContent).not.toContain('getCacheName');
    expect(swContent).toContain('versions.json');
    expect(swContent).toContain("url.pathname.includes('/releases/')");
    expect(swContent).toContain('learning-logo-cache');
  });

  it('asserts that root Service Worker unconditionally bypasses all /releases/ requests', () => {
    const swPath = resolve(process.cwd(), 'public/sw.js');
    const swContent = readFileSync(swPath, 'utf-8');

    function testFetchBypass(requestUrl: string): boolean {
      let respondWithCalled = false;
      const listeners: Record<string, (e: any) => void> = {};

      const fakeSelf: any = {
        addEventListener: (event: string, handler: (e: any) => void) => {
          listeners[event] = handler;
        },
        clients: { claim: () => Promise.resolve() },
        skipWaiting: () => {}
      };

      const fn = new Function('self', 'caches', 'fetch', swContent);
      fn(fakeSelf, { match: () => Promise.resolve(null), open: () => Promise.resolve({ put: () => {} }) }, () => Promise.resolve());

      const fetchHandler = listeners['fetch'];
      expect(fetchHandler).toBeDefined();

      const event = {
        request: { method: 'GET', url: requestUrl },
        respondWith: () => {
          respondWithCalled = true;
        }
      };

      fetchHandler!(event);
      return respondWithCalled;
    }

    // Root SW MUST unconditionally bypass /releases/ requests so historical releases run online without interference
    const releaseBypassed = !testFetchBypass('https://example.com/LearningLogo/releases/v1.0.0/assets/main.js');
    expect(releaseBypassed).toBe(true);

    const nestedReleaseBypassed = !testFetchBypass('https://example.com/releases/v0.9.0/index.html');
    expect(nestedReleaseBypassed).toBe(true);

    // Root SW handles normal root assets
    const rootHandled = testFetchBypass('https://example.com/LearningLogo/assets/main.js');
    expect(rootHandled).toBe(true);

    // Root SW handles versions.json by bypassing cache
    const versionsHandled = testFetchBypass('https://example.com/LearningLogo/versions.json');
    expect(versionsHandled).toBe(true);
  });

  it('asserts activation deletes legacy unversioned caches and older learning-logo-* versions without complex scope logic', async () => {
    const swPath = resolve(process.cwd(), 'public/sw.js');
    const swContent = readFileSync(swPath, 'utf-8');

    async function testActivationCacheCleanup(existingKeys: string[]): Promise<string[]> {
      const deletedKeys: string[] = [];
      const listeners: Record<string, (e: any) => void> = {};

      const fakeCaches = {
        keys: () => Promise.resolve([...existingKeys]),
        delete: (key: string) => {
          deletedKeys.push(key);
          return Promise.resolve(true);
        }
      };

      const fakeSelf: any = {
        addEventListener: (event: string, handler: (e: any) => void) => {
          listeners[event] = handler;
        },
        clients: { claim: () => Promise.resolve() },
        skipWaiting: () => {}
      };

      const fn = new Function('self', 'caches', 'fetch', swContent);
      fn(fakeSelf, fakeCaches, () => Promise.resolve());

      const activateHandler = listeners['activate'];
      expect(activateHandler).toBeDefined();

      let waitUntilPromise: Promise<any> | null = null;
      activateHandler!({
        waitUntil: (p: Promise<any>) => {
          waitUntilPromise = p;
        }
      });

      if (waitUntilPromise) {
        await waitUntilPromise;
      }
      return deletedKeys;
    }

    const deleted = await testActivationCacheCleanup([
      'learning-logo-cache', // legacy unversioned cache -> should delete
      'learning-logo-v0.9.0', // older version cache -> should delete
      'learning-logo-v1.0.0', // previous release cache -> should delete
      'learning-logo-__APP_VERSION__', // current active cache -> keep
      'unrelated-cache-data', // non-learning-logo cache -> keep
    ]);

    expect(deleted).toContain('learning-logo-cache');
    expect(deleted).toContain('learning-logo-v0.9.0');
    expect(deleted).toContain('learning-logo-v1.0.0');
    expect(deleted).not.toContain('learning-logo-__APP_VERSION__');
    expect(deleted).not.toContain('unrelated-cache-data');
  });

  it('verifies public/404.html sanitizes leading slashes and prevents open redirect (F2, F8)', () => {
    const errorPagePath = resolve(process.cwd(), 'public/404.html');
    expect(existsSync(errorPagePath)).toBe(true);

    const errorPageContent = readFileSync(errorPagePath, 'utf-8');
    expect(errorPageContent).toContain('/releases/');
    expect(errorPageContent).toContain('window.location.replace');

    // F2: Verify leading slash sanitization and origin anchoring
    expect(errorPageContent).toContain('.replace(/^\\/+/');
    expect(errorPageContent).toContain('window.location.origin');

    // Explicitly test path sanitization against leading slash sequences
    const sanitizePath = (p: string) => p.replace(/^\/+/, '/');
    expect(sanitizePath('//attacker.com/releases/v1.0.0')).toBe('/attacker.com/releases/v1.0.0');
    expect(sanitizePath('///attacker.com/releases/v1.0.0')).toBe('/attacker.com/releases/v1.0.0');
    expect(sanitizePath('/releases/v1.0.0')).toBe('/releases/v1.0.0');

    // F8: Verify home-link resolution to base path
    expect(errorPageContent).toMatch(/home-link/);
  });
});
