import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SplitLayout } from '../../../src/ui/layout.ts';

// Polyfill PointerEvent for JSDOM if not present
if (typeof window.PointerEvent === 'undefined') {
  class MockPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? 'mouse';
    }
  }
  // @ts-ignore
  window.PointerEvent = MockPointerEvent;
  // @ts-ignore
  globalThis.PointerEvent = MockPointerEvent;
}

describe('SplitLayout Unit Tests', () => {
  let workspace: HTMLElement;
  let editorPane: HTMLElement;
  let canvasPane: HTMLElement;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafId: number;

  const flushRaf = (): void => {
    const cbs = Array.from(rafCallbacks.values());
    rafCallbacks.clear();
    for (const cb of cbs) {
      cb(performance.now());
    }
  };

  beforeEach(() => {
    window.innerWidth = 1024;
    localStorage.clear();
    document.body.innerHTML = '';
    document.body.className = '';

    rafCallbacks = new Map();
    rafId = 0;
    const mockRaf = vi.fn((cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, cb);
      return id;
    });
    const mockCaf = vi.fn((id: number) => {
      rafCallbacks.delete(id);
    });

    vi.stubGlobal('requestAnimationFrame', mockRaf);
    vi.stubGlobal('cancelAnimationFrame', mockCaf);
    window.requestAnimationFrame = mockRaf;
    window.cancelAnimationFrame = mockCaf;

    workspace = document.createElement('div');
    workspace.id = 'workspace-container';
    workspace.className = 'workspace';

    editorPane = document.createElement('section');
    editorPane.id = 'editor-pane';
    editorPane.className = 'pane';

    canvasPane = document.createElement('section');
    canvasPane.id = 'canvas-pane';
    canvasPane.className = 'pane';

    workspace.appendChild(editorPane);
    workspace.appendChild(canvasPane);
    document.body.appendChild(workspace);

    // Mock getBoundingClientRect
    workspace.getBoundingClientRect = () => ({
      width: 1000,
      height: 600,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    document.body.className = '';
    rafCallbacks.clear();
  });

  describe('DOM Discovery and Element Fallback', () => {
    it('uses explicit splitter element when passed via constructor', () => {
      const explicitSplitter = document.createElement('div');
      explicitSplitter.id = 'custom-splitter';
      workspace.insertBefore(explicitSplitter, canvasPane);

      const layout = new SplitLayout(editorPane, canvasPane, workspace, explicitSplitter);
      expect(layout.getSplitter()).toBe(explicitSplitter);
    });

    it('finds existing #pane-splitter in workspace when not passed explicitly', () => {
      const existingSplitter = document.createElement('div');
      existingSplitter.id = 'pane-splitter';
      workspace.insertBefore(existingSplitter, canvasPane);

      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      expect(layout.getSplitter()).toBe(existingSplitter);
    });

    it('creates fallback splitter between editor and canvas panes when not found in DOM', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      expect(splitter).toBeDefined();
      expect(splitter.id).toBe('pane-splitter');
      expect(splitter.classList.contains('pane-splitter')).toBe(true);
      expect(workspace.contains(splitter)).toBe(true);
      expect(splitter.previousElementSibling).toBe(editorPane);
      expect(splitter.nextElementSibling).toBe(canvasPane);
    });
  });

  describe('WAI-ARIA Accessibility Semantics', () => {
    it('initializes separator with complete ARIA attributes and tabindex', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      expect(splitter.getAttribute('role')).toBe('separator');
      expect(splitter.getAttribute('tabindex')).toBe('0');
      expect(splitter.getAttribute('aria-orientation')).toBe('vertical');
      expect(splitter.getAttribute('aria-label')).toBe('Resize editor and canvas panes');
      expect(splitter.getAttribute('aria-valuemin')).toBe('20');
      expect(splitter.getAttribute('aria-valuemax')).toBe('80');
      expect(splitter.getAttribute('aria-valuenow')).toBe('50');
    });

    it('updates aria-valuenow when ratio changes', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      layout.setRatio(0.65);
      expect(splitter.getAttribute('aria-valuenow')).toBe('65');
    });
  });

  describe('LocalStorage Hydration and Resilience', () => {
    it('restores valid ratio from localStorage on initialization', () => {
      localStorage.setItem('learning_logo_split_ratio', '0.62');
      const layout = new SplitLayout(editorPane, canvasPane, workspace);

      expect(layout.getRatio()).toBeCloseTo(0.62, 2);
      expect(editorPane.style.flex).toBe('0 0 62%');
      expect(layout.getSplitter().getAttribute('aria-valuenow')).toBe('62');
    });

    it('falls back to default 0.50 if stored value is invalid or out-of-bounds', () => {
      localStorage.setItem('learning_logo_split_ratio', 'invalid_string');
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      expect(layout.getRatio()).toBe(0.50);

      localStorage.setItem('learning_logo_split_ratio', '0.99');
      const layoutOutOfBounds = new SplitLayout(editorPane, canvasPane, workspace);
      expect(layoutOutOfBounds.getRatio()).toBeLessThanOrEqual(0.80);
    });

    it('respects custom storageKey option', () => {
      localStorage.setItem('custom_split_key', '0.35');
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, {
        storageKey: 'custom_split_key',
      });

      expect(layout.getRatio()).toBeCloseTo(0.35, 2);
    });

    it('gracefully handles QuotaExceededError or security exceptions when saving', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      });

      expect(() => {
        layout.setRatio(0.60, true);
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('Boundary Clamping Mechanics', () => {
    it('clamps ratio within default bounds (0.20 to 0.80)', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);

      layout.setRatio(0.10);
      expect(layout.getRatio()).toBe(0.20);

      layout.setRatio(0.95);
      expect(layout.getRatio()).toBe(0.80);
    });

    it('respects custom minRatio and maxRatio options', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, {
        minRatio: 0.30,
        maxRatio: 0.70,
      });

      layout.setRatio(0.15);
      expect(layout.getRatio()).toBe(0.30);

      layout.setRatio(0.85);
      expect(layout.getRatio()).toBe(0.70);
    });

    it('enforces minPixelWidth (200px) when workspace dimensions are known', () => {
      workspace.getBoundingClientRect = () => ({
        width: 500,
        height: 600,
        top: 0,
        left: 0,
        right: 500,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, {
        minPixelWidth: 200,
      });

      layout.setRatio(0.25);
      expect(layout.getRatio()).toBe(0.40);

      layout.setRatio(0.75);
      expect(layout.getRatio()).toBe(0.60);
    });

    it('dynamically re-clamps ratio against updated container width in updateOrientation', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, {
        minPixelWidth: 200,
      });
      layout.setRatio(0.75);
      expect(layout.getRatio()).toBe(0.75);

      // Shrink workspace width to 500px: max ratio becomes (500 - 200) / 500 = 0.60
      workspace.getBoundingClientRect = () => ({
        width: 500,
        height: 600,
        top: 0,
        left: 0,
        right: 500,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      layout.updateOrientation();
      expect(layout.getRatio()).toBe(0.60);
      expect(editorPane.style.flex).toBe('0 0 60%');
    });
  });

  describe('Pointer Drag Lifecycle', () => {
    it('manages pointer drag lifecycle with pointer capture and resizing classes', () => {
      const onResize = vi.fn();
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, { onResize });
      const splitter = layout.getSplitter();

      // 1. pointerdown
      const downEvent = new PointerEvent('pointerdown', {
        pointerId: 42,
        clientX: 500,
        bubbles: true,
        cancelable: true,
      });
      splitter.dispatchEvent(downEvent);

      expect(splitter.setPointerCapture).toHaveBeenCalledWith(42);
      expect(workspace.classList.contains('is-resizing')).toBe(true);
      expect(document.body.classList.contains('is-resizing')).toBe(true);

      // 2. pointermove during drag (workspace left=0, width=1000 -> clientX=600 is 60%)
      const moveEvent = new PointerEvent('pointermove', {
        pointerId: 42,
        clientX: 600,
        bubbles: true,
      });
      splitter.dispatchEvent(moveEvent);
      flushRaf();

      expect(layout.getRatio()).toBeCloseTo(0.60, 2);
      expect(editorPane.style.flex).toBe('0 0 60%');
      expect(onResize).toHaveBeenCalledWith(expect.closeTo(0.60, 2));
      // LocalStorage should NOT be committed during pointermove
      expect(localStorage.getItem('learning_logo_split_ratio')).toBeNull();

      // 3. pointerup commits to storage and cleans up
      const upEvent = new PointerEvent('pointerup', {
        pointerId: 42,
        clientX: 600,
        bubbles: true,
      });
      splitter.dispatchEvent(upEvent);

      expect(splitter.releasePointerCapture).toHaveBeenCalledWith(42);
      expect(workspace.classList.contains('is-resizing')).toBe(false);
      expect(document.body.classList.contains('is-resizing')).toBe(false);
      expect(localStorage.getItem('learning_logo_split_ratio')).toBe('0.6');
    });

    it('handles pointercancel by cleaning up resizing classes and releasing capture', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 10, clientX: 500 }));
      expect(workspace.classList.contains('is-resizing')).toBe(true);

      splitter.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 10 }));
      expect(workspace.classList.contains('is-resizing')).toBe(false);
      expect(document.body.classList.contains('is-resizing')).toBe(false);
      expect(splitter.releasePointerCapture).toHaveBeenCalledWith(10);
    });

    it('handles lostpointercapture by delegating to handlePointerCancel', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 10, clientX: 500 }));
      expect(workspace.classList.contains('is-resizing')).toBe(true);
      expect(document.body.classList.contains('is-resizing')).toBe(true);

      splitter.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 10 }));
      expect(workspace.classList.contains('is-resizing')).toBe(false);
      expect(document.body.classList.contains('is-resizing')).toBe(false);
      expect(splitter.releasePointerCapture).toHaveBeenCalledWith(10);
    });

    it('throttles rapid pointermove events via requestAnimationFrame and applies latest position', () => {
      const onResize = vi.fn();
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, { onResize });
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500 }));

      // Dispatch 3 rapid pointermove events
      splitter.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 550 }));
      splitter.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 600 }));
      splitter.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 650 }));

      // Only 1 animation frame should have been requested
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

      // Ratio has not updated yet before frame flushes
      expect(layout.getRatio()).toBe(0.50);

      // Flush animation frame
      flushRaf();

      // Should have processed the latest position (650px / 1000px = 65%)
      expect(layout.getRatio()).toBeCloseTo(0.65, 2);
      expect(editorPane.style.flex).toBe('0 0 65%');
      expect(onResize).toHaveBeenCalledWith(expect.closeTo(0.65, 2));
    });

    it('cancels pending animation frame on pointerup', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500 }));
      splitter.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 600 }));

      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
      splitter.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 600 }));

      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('cancels pending animation frame on pointercancel', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500 }));
      splitter.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 600 }));

      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
      splitter.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));

      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('ignores non-primary mouse buttons on pointerdown', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      // Right-click (button 2)
      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 2 }));
      expect(workspace.classList.contains('is-resizing')).toBe(false);
      expect(splitter.setPointerCapture).not.toHaveBeenCalled();

      // Middle-click (button 1)
      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 1 }));
      expect(workspace.classList.contains('is-resizing')).toBe(false);
    });

    it('guards against concurrent pointerdown during active drag', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0 }));
      expect(splitter.setPointerCapture).toHaveBeenCalledWith(1);

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', button: 0 }));
      expect(splitter.setPointerCapture).not.toHaveBeenCalledWith(2);
    });

    it('ignores pointermove if pointerdown did not occur', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      const initialRatio = layout.getRatio();
      splitter.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 700 }));
      expect(layout.getRatio()).toBe(initialRatio);
    });
  });

  describe('Keyboard Accessibility', () => {
    it('adjusts ratio by -2% on ArrowLeft and +2% on ArrowRight', () => {
      const onResize = vi.fn();
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, { onResize });
      const splitter = layout.getSplitter();

      expect(layout.getRatio()).toBe(0.50);

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      expect(layout.getRatio()).toBeCloseTo(0.48, 2);
      expect(localStorage.getItem('learning_logo_split_ratio')).toBe('0.48');
      expect(onResize).toHaveBeenCalledWith(expect.closeTo(0.48, 2));

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(layout.getRatio()).toBeCloseTo(0.50, 2);
      expect(localStorage.getItem('learning_logo_split_ratio')).toBe('0.5');
    });

    it('adjusts ratio by -10% on PageDown and +10% on PageUp', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
      expect(layout.getRatio()).toBeCloseTo(0.40, 2);

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
      expect(layout.getRatio()).toBeCloseTo(0.50, 2);
    });

    it('jumps to minimum on Home and maximum on End', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(layout.getRatio()).toBe(0.20);

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(layout.getRatio()).toBe(0.80);
    });

    it('resets ratio to 50/50 default on Enter and Space', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      layout.setRatio(0.70);
      expect(layout.getRatio()).toBe(0.70);

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(layout.getRatio()).toBe(0.50);

      layout.setRatio(0.30);
      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(layout.getRatio()).toBe(0.50);
    });
  });

  describe('Double Click Reset', () => {
    it('resets ratio to 50/50, persists to localStorage, and calls onResize on dblclick', () => {
      const onResize = vi.fn();
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, { onResize });
      const splitter = layout.getSplitter();

      layout.setRatio(0.75);
      expect(layout.getRatio()).toBe(0.75);

      splitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(layout.getRatio()).toBe(0.50);
      expect(localStorage.getItem('learning_logo_split_ratio')).toBe('0.5');
      expect(onResize).toHaveBeenCalledWith(0.50);
    });
  });

  describe('Responsive & Mobile Handling', () => {
    it('clears inline flex styles on panes in mobile stacked mode (<768px)', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      layout.setRatio(0.65);
      expect(editorPane.style.flex).toBe('0 0 65%');

      window.innerWidth = 500;
      layout.updateOrientation();

      expect(layout.isStacked()).toBe(true);
      expect(editorPane.style.flex).toBe('');
      expect(canvasPane.style.flex).toBe('');
    });

    it('restores custom split ratio when switching from mobile back to desktop', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      layout.setRatio(0.65);

      window.innerWidth = 500;
      layout.updateOrientation();
      expect(editorPane.style.flex).toBe('');

      window.innerWidth = 1024;
      layout.updateOrientation();
      expect(layout.isStacked()).toBe(false);
      expect(editorPane.style.flex).toBe('0 0 65%');
    });

    it('disables dragging when in mobile stacked mode', () => {
      window.innerWidth = 500;
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 200 }));
      expect(workspace.classList.contains('is-resizing')).toBe(false);
      expect(splitter.setPointerCapture).not.toHaveBeenCalled();
    });

    it('disables keyboard navigation when in mobile stacked mode', () => {
      window.innerWidth = 500;
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      const initialRatio = layout.getRatio();
      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(layout.getRatio()).toBe(initialRatio);

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
      expect(layout.getRatio()).toBe(initialRatio);

      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(layout.getRatio()).toBe(initialRatio);
    });

    it('disables double click reset when in mobile stacked mode', () => {
      window.innerWidth = 500;
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      layout.setRatio(0.70);
      splitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(layout.getRatio()).toBe(0.70);
    });
  });

  describe('Lifecycle and Destroy', () => {
    it('cleans up active resizing classes, dragging state, and pending animation frames on destroy', () => {
      const layout = new SplitLayout(editorPane, canvasPane, workspace);
      const splitter = layout.getSplitter();

      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500 }));
      splitter.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 600 }));
      expect(workspace.classList.contains('is-resizing')).toBe(true);
      expect(document.body.classList.contains('is-resizing')).toBe(true);

      layout.destroy();

      expect(workspace.classList.contains('is-resizing')).toBe(false);
      expect(document.body.classList.contains('is-resizing')).toBe(false);
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('removes all splitter event listeners and window resize listener on destroy', () => {
      const onResize = vi.fn();
      const layout = new SplitLayout(editorPane, canvasPane, workspace, null, { onResize });
      const splitter = layout.getSplitter();

      layout.destroy();

      // Pointer events should no longer trigger dragging
      splitter.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500 }));
      expect(workspace.classList.contains('is-resizing')).toBe(false);

      // Keyboard events should no longer change ratio
      const initialRatio = layout.getRatio();
      splitter.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(layout.getRatio()).toBe(initialRatio);

      // Double-click should no longer reset ratio
      layout.setRatio(0.70);
      splitter.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(layout.getRatio()).toBe(0.70);

      // Window resize should not call onResize
      window.dispatchEvent(new Event('resize'));
      expect(onResize).not.toHaveBeenCalled();
    });
  });
});
