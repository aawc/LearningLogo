import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeApp } from '../../src/main.ts';

describe('App Lifecycle & Error Invalidation Integration (F5, F6)', () => {
  let domContainer: HTMLDivElement;
  let originalLocation: Location;
  let originalProd: boolean;

  beforeEach(() => {
    originalProd = import.meta.env.PROD;
    domContainer = document.createElement('div');
    domContainer.innerHTML = `
      <div id="header-container"></div>
      <div id="pwa-banner"></div>
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
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        origin: 'http://localhost:5173',
        pathname: '/',
        href: 'http://localhost:5173/',
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
});
