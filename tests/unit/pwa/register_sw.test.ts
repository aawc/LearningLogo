import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpdateBanner } from '../../../src/pwa/update_banner.ts';
import { registerServiceWorker } from '../../../src/pwa/register_sw.ts';

describe('PWA Auto-Update Banner Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('mounts hidden update banner with accessible live region (F7)', () => {
    const banner = new UpdateBanner(container);
    const toast = container.querySelector('.pwa-update-toast');
    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('status');
    expect(toast?.getAttribute('aria-live')).toBe('polite');
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

  it('renders dismiss button and hides banner when clicked', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    banner.show(onReload, onDismiss);

    const dismissBtn = container.querySelector('.update-dismiss-btn') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss update notification');

    dismissBtn.click();
    expect(banner.isVisible()).toBe(false);
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('Service Worker Registration Lifecycle', () => {
  let originalEnv: boolean;

  beforeEach(() => {
    originalEnv = import.meta.env.PROD;
  });

  afterEach(() => {
    (import.meta.env as { PROD: boolean }).PROD = originalEnv;
    vi.restoreAllMocks();
  });

  it('unregisters lingering service workers in DEV mode', async () => {
    (import.meta.env as { PROD: boolean }).PROD = false;

    const mockUnregister = vi.fn().mockResolvedValue(true);
    const mockRegistration = {
      unregister: mockUnregister,
    };

    const mockGetRegistrations = vi.fn().mockResolvedValue([mockRegistration]);
    const mockRegister = vi.fn();

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: mockGetRegistrations,
        register: mockRegister,
      },
      configurable: true,
      writable: true,
    });

    registerServiceWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetRegistrations).toHaveBeenCalled();
    expect(mockUnregister).toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('safely catches unregistration failures in DEV mode (F4)', async () => {
    (import.meta.env as { PROD: boolean }).PROD = false;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockUnregister = vi.fn().mockRejectedValue(new Error('Unregister failed'));
    const mockRegistration = {
      unregister: mockUnregister,
    };

    const mockGetRegistrations = vi.fn().mockResolvedValue([mockRegistration]);

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: mockGetRegistrations,
      },
      configurable: true,
      writable: true,
    });

    registerServiceWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUnregister).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to unregister service worker:',
      expect.any(Error)
    );
  });

  it('registers service worker and passes waiting worker in PROD mode', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockWaitingWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    };

    let loadHandler: (() => void) | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'load') {
        loadHandler = handler as () => void;
      }
    });

    const mockRegistration = {
      waiting: mockWaitingWorker,
      installing: null,
      addEventListener: vi.fn(),
    };

    const mockRegister = vi.fn().mockResolvedValue(mockRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: {},
        addEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    const onUpdateFound = vi.fn();
    registerServiceWorker(onUpdateFound);

    expect(loadHandler).not.toBeNull();
    if (loadHandler) {
      (loadHandler as () => void)();
    }

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRegister).toHaveBeenCalledWith('./sw.js');
    expect(onUpdateFound).toHaveBeenCalledWith(mockWaitingWorker);
  });
});
