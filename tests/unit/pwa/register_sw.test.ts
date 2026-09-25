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

  it('mounts hidden update banner with accessible live region in host container (F1)', () => {
    const banner = new UpdateBanner(container);
    const toast = container.querySelector('.pwa-update-toast');
    expect(toast).not.toBeNull();
    expect(toast?.hasAttribute('role')).toBe(false);
    expect(toast?.hasAttribute('aria-live')).toBe(false);
    expect(container.getAttribute('role')).toBe('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(container.getAttribute('aria-atomic')).toBe('true');
    expect(banner.isVisible()).toBe(false);
  });

  it('ensures toast style.display is "none" when hidden and "flex" when shown', () => {
    const banner = new UpdateBanner(container);
    const toast = container.querySelector('.pwa-update-toast') as HTMLElement;
    expect(toast).not.toBeNull();
    expect(toast.style.display).toBe('none');
    expect(banner.isVisible()).toBe(false);

    banner.show(vi.fn());
    expect(toast.style.display).toBe('flex');
    expect(banner.isVisible()).toBe(true);

    banner.hide();
    expect(toast.style.display).toBe('none');
    expect(banner.isVisible()).toBe(false);
  });

  it('defensively sanitizes legacy host container attributes and classes on initialization', () => {
    container.className = 'pwa-update-toast extra-class';
    container.setAttribute('hidden', '');

    new UpdateBanner(container);

    expect(container.classList.contains('pwa-update-toast')).toBe(false);
    expect(container.classList.contains('extra-class')).toBe(true);
    expect(container.hasAttribute('hidden')).toBe(false);
  });

  it('dismisses banner and calls onDismissCallback when Escape key is pressed', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    banner.show(onReload, onDismiss);

    expect(banner.isVisible()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(banner.isVisible()).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Verify listener is cleaned up and does not trigger callback multiple times
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss banner when Escape is pressed while an input outside the toast is focused (F2)', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    banner.show(onReload, onDismiss);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(banner.isVisible()).toBe(true);
    expect(onDismiss).not.toHaveBeenCalled();

    input.remove();
  });

  it('does not dismiss banner when Escape is pressed while a textarea outside the toast is focused (F2)', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    banner.show(onReload, onDismiss);

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(banner.isVisible()).toBe(true);
    expect(onDismiss).not.toHaveBeenCalled();

    textarea.remove();
  });

  it('dismisses banner when Escape is pressed while focus is inside the toast element (F2)', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    banner.show(onReload, onDismiss);

    const reloadBtn = container.querySelector('.update-reload-btn') as HTMLButtonElement;
    reloadBtn.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(banner.isVisible()).toBe(false);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('destroys banner, unregisters keydown listener, and removes toast from DOM (F3)', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    const onDismiss = vi.fn();
    banner.show(onReload, onDismiss);

    expect(banner.isVisible()).toBe(true);
    expect(container.querySelector('.pwa-update-toast')).not.toBeNull();

    banner.destroy();

    expect(banner.isVisible()).toBe(false);
    expect(container.querySelector('.pwa-update-toast')).toBeNull();

    // Verify keydown listener is unregistered and does not call onDismiss
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('disables reload button and changes text to Updating... on click to prevent race conditions (F5)', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    banner.show(onReload);

    const reloadBtn = container.querySelector('.update-reload-btn') as HTMLButtonElement;
    expect(reloadBtn.disabled).toBe(false);
    expect(reloadBtn.textContent).toBe('Update Now');

    reloadBtn.click();

    expect(reloadBtn.disabled).toBe(true);
    expect(reloadBtn.textContent).toBe('Updating...');
    expect(onReload).toHaveBeenCalledTimes(1);

    // Clicking again while disabled must not trigger callback again
    reloadBtn.click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('resets reload button state when banner is re-shown', () => {
    const banner = new UpdateBanner(container);
    const onReload = vi.fn();
    banner.show(onReload);

    const reloadBtn = container.querySelector('.update-reload-btn') as HTMLButtonElement;
    reloadBtn.click();
    expect(reloadBtn.disabled).toBe(true);
    expect(reloadBtn.textContent).toBe('Updating...');

    banner.hide();
    banner.show(onReload);
    expect(reloadBtn.disabled).toBe(false);
    expect(reloadBtn.textContent).toBe('Update Now');
  });

  it('logs a warning and does not crash when reload button is clicked without a registered callback', () => {
    new UpdateBanner(container);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reloadBtn = container.querySelector('.update-reload-btn') as HTMLButtonElement;
    expect(reloadBtn).not.toBeNull();

    expect(() => reloadBtn.click()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No reload callback registered')
    );
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

  it('does not trigger onUpdateFound when registration.waiting is present but controller is null (fresh start)', async () => {
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
        controller: null, // Fresh start: no controller yet!
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
    expect(onUpdateFound).not.toHaveBeenCalled();
  });

  it('does not register service worker and unregisters sub-scope worker when location is under /releases/', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        pathname: '/LearningLogo/releases/v1.0.0/',
        href: 'https://example.com/LearningLogo/releases/v1.0.0/',
      },
      configurable: true,
      writable: true,
    });

    try {
      const mockSubReleaseUnregister = vi.fn().mockResolvedValue(true);
      const mockRootUnregister = vi.fn().mockResolvedValue(true);

      const mockRegistrations = [
        {
          scope: 'https://example.com/LearningLogo/releases/v1.0.0/',
          unregister: mockSubReleaseUnregister,
        },
        {
          scope: 'https://example.com/LearningLogo/',
          unregister: mockRootUnregister,
        },
      ];

      const mockRegister = vi.fn();
      const mockGetRegistrations = vi.fn().mockResolvedValue(mockRegistrations);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: mockRegister,
          getRegistrations: mockGetRegistrations,
        },
        configurable: true,
        writable: true,
      });

      registerServiceWorker();

      await Promise.resolve();
      await Promise.resolve();

      expect(mockRegister).not.toHaveBeenCalled();
      expect(mockGetRegistrations).toHaveBeenCalled();
      expect(mockSubReleaseUnregister).toHaveBeenCalled();
      expect(mockRootUnregister).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('safely catches unregistration failures for historical release service worker', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        pathname: '/LearningLogo/releases/v1.0.0/',
        href: 'https://example.com/LearningLogo/releases/v1.0.0/',
      },
      configurable: true,
      writable: true,
    });

    try {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockUnregister = vi.fn().mockRejectedValue(new Error('Sub-release unregister failed'));
      const mockRegistration = {
        scope: 'https://example.com/LearningLogo/releases/v1.0.0/',
        unregister: mockUnregister,
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn(),
          getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
        },
        configurable: true,
        writable: true,
      });

      registerServiceWorker();

      await Promise.resolve();
      await Promise.resolve();

      expect(mockUnregister).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('historical release'),
        expect.any(Error)
      );
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('registers immediately without waiting for load event when document.readyState is "complete"', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockRegister = vi.fn().mockResolvedValue({
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        controller: {},
        addEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
    });

    registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledWith('./sw.js');
  });

  it('calls registration.update() immediately upon registration in PROD mode', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: mockUpdate,
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

    registerServiceWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('triggers registration.update() on visibilitychange (when visible), window focus, and online events', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: mockUpdate,
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

    registerServiceWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdate).toHaveBeenCalledTimes(1); // initial update
    mockUpdate.mockClear();

    // 1. visibilitychange when hidden -> should NOT trigger update
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockUpdate).not.toHaveBeenCalled();

    // 2. visibilitychange when visible -> should trigger update
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    mockUpdate.mockClear();

    // 3. window focus -> should trigger update
    window.dispatchEvent(new Event('focus'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    mockUpdate.mockClear();

    // Rapid focus event within cooldown -> throttled
    window.dispatchEvent(new Event('focus'));
    expect(mockUpdate).not.toHaveBeenCalled();

    // 4. window online after cooldown -> should trigger update
    const baseNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(baseNow + 60_000);
    window.dispatchEvent(new Event('online'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('calls onUpdateFound immediately when worker in updatefound is already in installed state', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const installedWorker = {
      state: 'installed',
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
    };

    let updatefoundListener: (() => void) | null = null;
    const mockRegistration = {
      waiting: null,
      installing: installedWorker,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'updatefound') {
          updatefoundListener = handler as () => void;
        }
      }),
      update: vi.fn().mockResolvedValue(undefined),
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

    await Promise.resolve();
    await Promise.resolve();

    expect(updatefoundListener).not.toBeNull();
    if (updatefoundListener) {
      (updatefoundListener as () => void)();
    }

    expect(onUpdateFound).toHaveBeenCalledWith(installedWorker);
  });

  it('calls onUpdateFound when registration.installing is null but registration.waiting is populated on updatefound', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const waitingWorker = {
      state: 'installed',
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
    };

    let updatefoundListener: (() => void) | null = null;
    const mockRegistration = {
      waiting: null as { state: string; addEventListener: unknown; postMessage: unknown } | null,
      installing: null,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'updatefound') {
          updatefoundListener = handler as () => void;
        }
      }),
      update: vi.fn().mockResolvedValue(undefined),
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

    await Promise.resolve();
    await Promise.resolve();

    mockRegistration.waiting = waitingWorker;
    expect(updatefoundListener).not.toBeNull();
    if (updatefoundListener) {
      (updatefoundListener as () => void)();
    }

    expect(onUpdateFound).toHaveBeenCalledWith(waitingWorker);
  });

  it('returns a ServiceWorkerHandle with working update() and getRegistration() methods', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: mockUpdate,
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

    const handle = registerServiceWorker();
    expect(handle).toBeDefined();
    expect(typeof handle?.update).toBe('function');
    expect(typeof handle?.getRegistration).toBe('function');
    expect(typeof handle?.cleanup).toBe('function');

    await Promise.resolve();
    await Promise.resolve();

    expect(handle?.getRegistration()).toBe(mockRegistration);
    await handle?.update();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('detaches all window and document listeners when handle.cleanup() is called (F2)', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: mockUpdate,
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

    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');
    const documentRemoveSpy = vi.spyOn(document, 'removeEventListener');

    const handle = registerServiceWorker();
    expect(handle).toBeDefined();
    expect(typeof handle?.cleanup).toBe('function');

    await Promise.resolve();
    await Promise.resolve();

    mockUpdate.mockClear();

    // Act: clean up handle
    handle?.cleanup?.();

    // Verify listeners were removed from window and document
    expect(windowRemoveSpy).toHaveBeenCalledWith('load', expect.any(Function));
    expect(windowRemoveSpy).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(windowRemoveSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(documentRemoveSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    // Verify that subsequent window and document events do not trigger update
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('prevents event listeners and update checks if handle.cleanup() is called before registration completes (F2)', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: mockUpdate,
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

    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');
    const handle = registerServiceWorker();

    // Clean up immediately before async register resolves
    handle?.cleanup?.();
    expect(windowRemoveSpy).toHaveBeenCalledWith('load', expect.any(Function));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('throttles rapid window focus and online events within the 60-second cooldown period (F3)', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    let currentTime = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      update: mockUpdate,
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

    registerServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    mockUpdate.mockClear();

    // 1. Initial focus event -> triggers update immediately
    window.dispatchEvent(new Event('focus'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    mockUpdate.mockClear();

    // 2. Rapid focus within 15s -> throttled (no update)
    currentTime += 15_000;
    window.dispatchEvent(new Event('focus'));
    expect(mockUpdate).not.toHaveBeenCalled();

    // 3. Initial online event -> triggers update immediately
    window.dispatchEvent(new Event('online'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    mockUpdate.mockClear();

    // 4. Rapid online within 20s -> throttled (no update)
    currentTime += 20_000;
    window.dispatchEvent(new Event('online'));
    expect(mockUpdate).not.toHaveBeenCalled();

    // 5. Focus after 60s cooldown elapsed (total +75s from first focus) -> triggers update
    currentTime += 40_000;
    window.dispatchEvent(new Event('focus'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    mockUpdate.mockClear();

    // 6. Rapid focus event immediately afterwards -> throttled
    currentTime += 5_000;
    window.dispatchEvent(new Event('focus'));
    expect(mockUpdate).not.toHaveBeenCalled();

    // 7. Online after 60s cooldown elapsed (total +105s from first online) -> triggers update
    currentTime += 40_000;
    window.dispatchEvent(new Event('online'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

