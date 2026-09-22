import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateVersionsManifest,
  resolveVersionUrl,
  type VersionItem,
  type VersionsManifest
} from '../../../src/ui/version_switcher_types.ts';
import { VersionSwitcher } from '../../../src/ui/version_switcher.ts';

describe('Version Switcher Types & Helpers', () => {
  describe('validateVersionsManifest', () => {
    it('validates a conformant manifest structure', () => {
      const raw = {
        latest: 'v1.1.0',
        generatedAt: '2026-09-22T14:00:00Z',
        versions: [
          {
            version: 'v1.1.0',
            name: 'v1.1.0 (Latest)',
            date: '2026-09-22T14:00:00Z',
            path: '',
            notesUrl: 'https://github.com/aawc/LearningLogo/releases/tag/v1.1.0',
            isLatest: true
          },
          {
            version: 'v1.0.0',
            name: 'v1.0.0',
            date: '2026-09-21T10:00:00Z',
            path: 'releases/v1.0.0/',
            notesUrl: 'https://github.com/aawc/LearningLogo/releases/tag/v1.0.0',
            isLatest: false
          }
        ]
      };

      const validated = validateVersionsManifest(raw);
      expect(validated).not.toBeNull();
      expect(validated?.latest).toBe('v1.1.0');
      expect(validated?.versions).toHaveLength(2);
    });

    it('rejects invalid manifests', () => {
      expect(validateVersionsManifest(null)).toBeNull();
      expect(validateVersionsManifest('invalid string')).toBeNull();
      expect(validateVersionsManifest({})).toBeNull();
      expect(validateVersionsManifest({ latest: 'v1.0.0' })).toBeNull();
      expect(
        validateVersionsManifest({
          latest: 'v1.0.0',
          generatedAt: 'now',
          versions: [{ version: 'v1.0.0' }] // missing required fields
        })
      ).toBeNull();
    });
  });

  describe('resolveVersionUrl', () => {
    const latestItem: VersionItem = {
      version: 'v1.1.0',
      name: 'v1.1.0 (Latest)',
      date: '2026-09-22',
      path: '',
      notesUrl: '',
      isLatest: true
    };

    const olderItem: VersionItem = {
      version: 'v1.0.0',
      name: 'v1.0.0',
      date: '2026-09-21',
      path: 'releases/v1.0.0/',
      notesUrl: '',
      isLatest: false
    };

    it('resolves URLs correctly when navigating from root', () => {
      expect(resolveVersionUrl(latestItem, '/', '')).toBe('./');
      expect(resolveVersionUrl(olderItem, '/', '')).toBe('./releases/v1.0.0/');
      expect(resolveVersionUrl(olderItem, '/LearningLogo/', '')).toBe('./releases/v1.0.0/');
    });

    it('resolves URLs correctly when navigating from a sub-release directory', () => {
      expect(resolveVersionUrl(latestItem, '/releases/v1.0.0/', '')).toBe('../../');
      expect(resolveVersionUrl(olderItem, '/releases/v1.1.0/', '')).toBe('../v1.0.0/');
    });

    it('preserves hash fragments accurately', () => {
      const hash = '#code=FD%20100%0ART%2090';
      expect(resolveVersionUrl(latestItem, '/', hash)).toBe('./#code=FD%20100%0ART%2090');
      expect(resolveVersionUrl(olderItem, '/', hash)).toBe('./releases/v1.0.0/#code=FD%20100%0ART%2090');
      expect(resolveVersionUrl(latestItem, '/releases/v1.0.0/', hash)).toBe('../../#code=FD%20100%0ART%2090');
    });
  });
});

describe('VersionSwitcher UI Component', () => {
  let container: HTMLElement;
  const mockManifest: VersionsManifest = {
    latest: 'v1.1.0',
    generatedAt: '2026-09-22T14:00:00Z',
    versions: [
      {
        version: 'v1.1.0',
        name: 'v1.1.0 (Latest)',
        date: '2026-09-22T14:00:00Z',
        path: '',
        notesUrl: 'https://github.com/aawc/LearningLogo/releases/tag/v1.1.0',
        isLatest: true
      },
      {
        version: 'v1.0.0',
        name: 'v1.0.0',
        date: '2026-09-21T10:00:00Z',
        path: 'releases/v1.0.0/',
        notesUrl: 'https://github.com/aawc/LearningLogo/releases/tag/v1.0.0',
        isLatest: false
      }
    ]
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock global fetch
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('versions.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockManifest
        } as unknown as Response;
      }
      return { ok: false, status: 404 } as unknown as Response;
    });
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders trigger button with initial version tag', () => {
    const switcher = new VersionSwitcher(container, { currentVersion: 'v1.0.0' });
    const trigger = container.querySelector('.version-trigger') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('v1.0.0');
    switcher.destroy();
  });

  it('populates available releases and displays current and latest badges', async () => {
    const switcher = new VersionSwitcher(container, { currentVersion: 'v1.0.0' });
    await switcher.loadManifestPromise;

    const options = container.querySelectorAll('.version-option');
    expect(options.length).toBe(2);

    // First option (v1.1.0 Latest)
    const opt0 = options[0] as HTMLElement;
    expect(opt0.textContent).toContain('v1.1.0');
    expect(opt0.textContent).toContain('[Latest]');

    // Second option (v1.0.0 Current)
    const opt1 = options[1] as HTMLElement;
    expect(opt1.textContent).toContain('v1.0.0');
    expect(opt1.textContent).toContain('[Current]');

    switcher.destroy();
  });

  it('toggles dropdown visibility on button click', async () => {
    const switcher = new VersionSwitcher(container, { currentVersion: 'v1.0.0' });
    await switcher.loadManifestPromise;

    const trigger = container.querySelector('.version-trigger') as HTMLButtonElement;
    const menu = container.querySelector('.version-menu') as HTMLElement;

    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    expect(menu.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    trigger.click();
    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    switcher.destroy();
  });

  it('closes dropdown when Escape key is pressed', async () => {
    const switcher = new VersionSwitcher(container, { currentVersion: 'v1.0.0' });
    await switcher.loadManifestPromise;

    const trigger = container.querySelector('.version-trigger') as HTMLButtonElement;
    const menu = container.querySelector('.version-menu') as HTMLElement;

    trigger.click();
    expect(menu.hidden).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.hidden).toBe(true);

    switcher.destroy();
  });

  it('triggers onBeforeSwitch and invokes navigate when a new version is selected', async () => {
    const onBeforeSwitch = vi.fn();
    const navigate = vi.fn();

    const switcher = new VersionSwitcher(container, {
      currentVersion: 'v1.0.0',
      onBeforeSwitch,
      navigate
    });
    await switcher.loadManifestPromise;

    const options = container.querySelectorAll('.version-option');
    const targetOpt = options[0] as HTMLElement; // v1.1.0

    targetOpt.click();

    expect(onBeforeSwitch).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    switcher.destroy();
  });

  it('does not navigate if selecting the currently active version', async () => {
    const onBeforeSwitch = vi.fn();
    const navigate = vi.fn();

    const switcher = new VersionSwitcher(container, {
      currentVersion: 'v1.0.0',
      onBeforeSwitch,
      navigate
    });
    await switcher.loadManifestPromise;

    const options = container.querySelectorAll('.version-option');
    const currentOpt = options[1] as HTMLElement; // v1.0.0

    currentOpt.click();

    expect(onBeforeSwitch).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    switcher.destroy();
  });

  it('displays offline indicator when manifest fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const switcher = new VersionSwitcher(container, { currentVersion: 'v1.0.0' });
    await switcher.loadManifestPromise;

    const trigger = container.querySelector('.version-trigger') as HTMLButtonElement;
    expect(trigger.textContent).toContain('[Offline]');
    switcher.destroy();
  });

  it('manages focus with ArrowDown, ArrowUp, Home, and End across options in dropdown list (F6)', async () => {
    const switcher = new VersionSwitcher(container, { currentVersion: 'v1.0.0' });
    await switcher.loadManifestPromise;

    const trigger = container.querySelector('.version-trigger') as HTMLButtonElement;
    trigger.click(); // Open dropdown

    const options = Array.from(container.querySelectorAll<HTMLElement>('.version-option'));
    expect(options.length).toBe(2);

    const [firstOpt, secondOpt] = options as [HTMLElement, HTMLElement];

    // Focus first option
    firstOpt.focus();
    expect(document.activeElement).toBe(firstOpt);

    // ArrowDown moves focus from first to second option
    firstOpt.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(secondOpt);

    // ArrowDown on last option wraps to first option
    secondOpt.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(firstOpt);

    // ArrowUp on first option wraps to last option
    firstOpt.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(secondOpt);

    // ArrowUp moves focus from second to first option
    secondOpt.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(firstOpt);

    // End key moves focus to last option
    firstOpt.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(secondOpt);

    // Home key moves focus to first option
    secondOpt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(firstOpt);

    switcher.destroy();
  });
});
