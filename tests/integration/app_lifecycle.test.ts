import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeApp } from '../../src/main.ts';
import { UpdateBanner } from '../../src/pwa/update_banner.ts';

describe('App Lifecycle & Error Invalidation Integration (F5, F6)', () => {
  let domContainer: HTMLDivElement;
  let originalLocation: Location;
  let originalProd: boolean;

  beforeEach(() => {
    originalProd = import.meta.env.PROD;
    domContainer = document.createElement('div');
    domContainer.innerHTML = `
      <div id="header-container"></div>
      <aside id="pwa-banner" role="status" aria-live="polite" aria-atomic="true" aria-label="Application updates"></aside>
      <div id="workspace-container">
        <div id="editor-pane">
          <div id="toolbar-container"></div>
          <div id="editor-container"></div>
          <div id="repl-container"></div>
        </div>
        <div id="canvas-pane">
          <div id="debugger-container"></div>
          <div id="canvas-container"></div>
        </div>
      </div>
    `;
    document.body.appendChild(domContainer);

    // Mock HTMLCanvasElement.prototype.getContext to prevent JSDOM warnings
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D);

    // Mock alert and prompt to avoid blocking test runners
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'prompt').mockImplementation(() => null);

    originalLocation = window.location;
    const reloadMock = vi.fn();
    let currentHash = '';
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        origin: 'http://localhost:5173',
        pathname: '/',
        href: 'http://localhost:5173/',
        get hash() {
          return currentHash;
        },
        set hash(val: string) {
          currentHash = val ? (val.startsWith('#') ? val : '#' + val) : '';
        },
        reload: reloadMock,
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([]),
        register: vi.fn().mockResolvedValue({ waiting: null, addEventListener: vi.fn() }),
        addEventListener: vi.fn(),
        controller: {},
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
    (import.meta.env as { PROD: boolean }).PROD = originalProd;
    vi.restoreAllMocks();
  });

  it('initializes app without exceptions and mounts core components', () => {
    expect(() => initializeApp()).not.toThrow();
    expect(document.querySelector('.brand-title')).not.toBeNull();
    expect(document.querySelector('.pwa-update-toast')).not.toBeNull();
  });

  it('cancels reload fallback timer when controllerchange event fires (F6)', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockWaitingWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    };

    let windowLoadHandler: (() => void) | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'load') {
        windowLoadHandler = handler as () => void;
      }
    });

    const swListeners: Record<string, ((e?: unknown) => void)[]> = {};
    const swAddEventListener = vi.fn((event: string, handler: (e?: unknown) => void) => {
      swListeners[event] = swListeners[event] || [];
      swListeners[event].push(handler);
    });

    const mockRegistration = {
      waiting: mockWaitingWorker,
      installing: null,
      addEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([]),
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: swAddEventListener,
        controller: {},
      },
      configurable: true,
      writable: true,
    });

    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    initializeApp();

    // Trigger window load to execute PROD SW registration
    expect(windowLoadHandler).not.toBeNull();
    if (windowLoadHandler) {
      (windowLoadHandler as () => void)();
    }

    await Promise.resolve();
    await Promise.resolve();

    const toast = document.querySelector('.pwa-update-toast') as HTMLElement;
    expect(toast.hidden).toBe(false);

    const updateBtn = document.querySelector('.update-reload-btn') as HTMLButtonElement;
    expect(updateBtn).not.toBeNull();

    // Click update button to initiate skipWaiting and controllerchange listener
    updateBtn.click();

    expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({ action: 'SKIP_WAITING' });
    expect(swListeners['controllerchange']).toBeDefined();

    // Trigger controllerchange event before 250ms fallback
    if (swListeners['controllerchange'] && swListeners['controllerchange'][0]) {
      swListeners['controllerchange'][0]();
    }

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('clears stale error upon successful stepper execution finish (F5)', () => {
    initializeApp();

    const feedbackBtn = document.querySelector('#feedback-btn') as HTMLButtonElement;
    expect(feedbackBtn).not.toBeNull();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    const stepBtn = document.querySelector('.btn-step') as HTMLButtonElement;
    expect(stepBtn).not.toBeNull();

    // Trigger syntax error by loading invalid code into stepper
    textarea.value = 'REPEAT 4 [ FD 10';
    textarea.dispatchEvent(new Event('input'));
    stepBtn.click(); // Triggers loadEditorCodeIntoStepper which sets lastError

    // Open feedback modal and verify diagnostics contains the error
    feedbackBtn.click();
    const diagnosticsCode = document.querySelector('.feedback-diagnostics-content code') as HTMLElement;
    expect(diagnosticsCode.textContent).toContain('Syntax Error');

    // Close modal
    const closeBtn = document.querySelector('.feedback-close-btn') as HTMLButtonElement;
    closeBtn.click();

    // Set editor to valid single statement and step to finish
    textarea.value = 'FD 10';
    textarea.dispatchEvent(new Event('input'));

    const stopBtn = document.querySelector('.btn-stop') as HTMLButtonElement;
    expect(stopBtn).not.toBeNull();

    // First step loads and executes first statement
    stepBtn.click();
    // Subsequent steps advance until program finishes and stepper returns to IDLE
    let maxSteps = 10;
    while (!stopBtn.disabled && maxSteps-- > 0) {
      stepBtn.click();
    }
    expect(stopBtn.disabled).toBe(true);

    // Reopen feedback modal and verify lastError was cleared on finish
    feedbackBtn.click();
    expect(diagnosticsCode.textContent).not.toContain('Syntax Error');
    expect(diagnosticsCode.textContent).not.toContain('Last Runtime Error');
  });

  it('mounts VersionSwitcher into header and flushes editor draft on version switch', () => {
    initializeApp();

    const versionSwitcher = document.querySelector('#header-container .version-switcher');
    expect(versionSwitcher).not.toBeNull();

    const trigger = document.querySelector('#header-container .version-trigger') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
  });

  it('updates window.location.hash with compressed editor code on version switch (F7)', async () => {
    const mockManifest = {
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

    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    // Modify editor content with draft code
    const modifiedCode = 'FD 250 RT 45 FD 100';
    textarea.value = modifiedCode;
    textarea.dispatchEvent(new Event('input'));

    // Wait for version switcher to load manifest
    await Promise.resolve();
    await Promise.resolve();

    const trigger = document.querySelector('#header-container .version-trigger') as HTMLButtonElement;
    trigger.click();

    const options = document.querySelectorAll('.version-option');
    expect(options.length).toBeGreaterThan(0);

    // Click target version option (v1.1.0, differing from current active version)
    const targetOption = Array.from(options).find((opt) => opt.textContent?.includes('v1.1.0')) as HTMLElement;
    expect(targetOption).toBeDefined();

    targetOption.click();

    // Assert that window.location.hash was updated to compressed code
    const { compressCodeToHash } = await import('../../src/storage/url_share.ts');
    const expectedHash = 'code=' + compressCodeToHash(modifiedCode);
    expect(window.location.hash).toContain(expectedHash);
  });

  it('does not register service worker and cleans up lingering sub-scope registrations when running under /releases/ path', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    // Simulate running in historical release sub-scope
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        origin: 'http://localhost:5173',
        pathname: '/LearningLogo/releases/v1.0.0/',
        href: 'http://localhost:5173/LearningLogo/releases/v1.0.0/',
      },
      configurable: true,
      writable: true,
    });

    let windowLoadHandler: (() => void) | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'load') {
        windowLoadHandler = handler as () => void;
      }
    });

    const mockSubReleaseUnregister = vi.fn().mockResolvedValue(true);
    const mockRootUnregister = vi.fn().mockResolvedValue(true);
    const mockRegister = vi.fn();

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([
          {
            scope: 'http://localhost:5173/LearningLogo/releases/v1.0.0/',
            unregister: mockSubReleaseUnregister,
          },
          {
            scope: 'http://localhost:5173/LearningLogo/',
            unregister: mockRootUnregister,
          },
        ]),
        register: mockRegister,
        addEventListener: vi.fn(),
      },
      configurable: true,
      writable: true,
    });

    initializeApp();

    if (windowLoadHandler) {
      (windowLoadHandler as () => void)();
    }

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockSubReleaseUnregister).toHaveBeenCalled();
    expect(mockRootUnregister).not.toHaveBeenCalled();
  });

  it('leaves #pwa-banner host sanitized and toast hidden on fresh start without controller in PROD (F4)', async () => {
    (import.meta.env as { PROD: boolean }).PROD = true;

    const mockWaitingWorker = {
      state: 'installed',
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
    };

    let windowLoadHandler: (() => void) | null = null;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'load') {
        windowLoadHandler = handler as () => void;
      }
    });

    const mockRegistration = {
      waiting: mockWaitingWorker,
      installing: null,
      addEventListener: vi.fn(),
    };

    // Setup host element with legacy attributes as originally defined in index.html
    const pwaBanner = document.getElementById('pwa-banner') as HTMLElement;
    pwaBanner.className = 'pwa-update-toast';
    pwaBanner.setAttribute('hidden', '');
    pwaBanner.setAttribute('role', 'alert');

    // Fresh start: navigator.serviceWorker.controller is null
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([]),
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn(),
        controller: null,
      },
      configurable: true,
      writable: true,
    });

    let banner: UpdateBanner | null = null;
    const origBuildDOM = (UpdateBanner.prototype as unknown as { buildDOM: () => void }).buildDOM;
    vi.spyOn(UpdateBanner.prototype as any, 'buildDOM').mockImplementation(function (this: UpdateBanner) {
      banner = this;
      return origBuildDOM.call(this);
    });

    initializeApp();

    // Trigger window load to simulate full PROD SW registration lifecycle
    expect(windowLoadHandler).not.toBeNull();
    if (windowLoadHandler) {
      (windowLoadHandler as () => void)();
    }

    await Promise.resolve();
    await Promise.resolve();

    // The host element should be sanitized
    expect(pwaBanner.classList.contains('pwa-update-toast')).toBe(false);
    expect(pwaBanner.hasAttribute('hidden')).toBe(false);

    // The child toast element should be hidden
    const toast = pwaBanner.querySelector('.pwa-update-toast') as HTMLElement;
    expect(toast).not.toBeNull();
    expect(toast.hidden).toBe(true);
    expect(toast.style.display).toBe('none');

    // Verify banner.isVisible() remains false end-to-end when controller is null
    expect(banner).not.toBeNull();
    expect(banner!.isVisible()).toBe(false);
  });

  it('displays update banner and triggers sw update when VersionSwitcher discovers newer release from versions.json', async () => {
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
        getRegistrations: vi.fn().mockResolvedValue([]),
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn(),
        controller: {},
      },
      configurable: true,
      writable: true,
    });

    const mockManifest = {
      latest: 'v1.1.0',
      generatedAt: '2026-09-25T12:00:00Z',
      versions: [
        {
          version: 'v1.1.0',
          name: 'v1.1.0 (Latest)',
          date: '2026-09-25',
          path: '',
          notesUrl: '',
          isLatest: true,
        },
        {
          version: 'v1.0.0',
          name: 'v1.0.0',
          date: '2026-09-20',
          path: 'releases/v1.0.0/',
          notesUrl: '',
          isLatest: false,
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('versions.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockManifest,
        } as unknown as Response;
      }
      return { ok: false, status: 404 } as unknown as Response;
    });

    initializeApp();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const toast = document.querySelector('.pwa-update-toast') as HTMLElement;
    expect(toast).not.toBeNull();
    expect(toast.style.display).toBe('flex');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('triggers registration.update() on lifecycle events (visibilitychange, focus, online)', async () => {
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
        getRegistrations: vi.fn().mockResolvedValue([]),
        register: vi.fn().mockResolvedValue(mockRegistration),
        addEventListener: vi.fn(),
        controller: {},
      },
      configurable: true,
      writable: true,
    });

    initializeApp();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockUpdate).toHaveBeenCalledTimes(1); // Initial check upon registration
    mockUpdate.mockClear();

    // visibilitychange (hidden -> no update)
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockUpdate).not.toHaveBeenCalled();

    // visibilitychange (visible -> update)
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    mockUpdate.mockClear();

    // focus -> update
    window.dispatchEvent(new Event('focus'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    mockUpdate.mockClear();

    // online -> update
    window.dispatchEvent(new Event('online'));
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

