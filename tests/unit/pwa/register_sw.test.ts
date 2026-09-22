import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateBanner } from '../../../src/pwa/update_banner.ts';

describe('PWA Auto-Update Banner Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('mounts hidden update banner', () => {
    const banner = new UpdateBanner(container);
    expect(container.querySelector('.pwa-update-toast')).not.toBeNull();
    expect(banner.isVisible()).toBe(false);
  });

  it('shows update banner with update message and reload button', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    banner.show(onReload);

    expect(banner.isVisible()).toBe(true);
    expect(container.textContent).toContain('Update Available');

    const reloadBtn = container.querySelector('.update-reload-btn') as HTMLButtonElement;
    expect(reloadBtn).not.toBeNull();
    reloadBtn.click();

    expect(onReload).toHaveBeenCalled();
  });

  it('passes waiting service worker to onUpdateFound callback', async () => {
    const { registerServiceWorker } = await import('../../../src/pwa/register_sw.ts');

    const mockWaitingWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    };

    let loadHandler: (() => void) | null = null;
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'load') {
        loadHandler = handler as () => void;
      }
    });

    const mockRegistration = {
      waiting: mockWaitingWorker,
      installing: null,
      addEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        controller: {},
        addEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    const onUpdateFound = vi.fn();
    registerServiceWorker(onUpdateFound);

    if (loadHandler) {
      (loadHandler as () => void)();
    }

    // Await microtasks for register().then()
    await Promise.resolve();
    await Promise.resolve();

    expect(onUpdateFound).toHaveBeenCalledWith(mockWaitingWorker);
  });
});
