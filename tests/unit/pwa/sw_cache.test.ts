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
});
