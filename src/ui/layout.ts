export interface SplitLayoutOptions {
  minRatio?: number;        // default 0.20
  maxRatio?: number;        // default 0.80
  minPixelWidth?: number;   // default 200
  storageKey?: string;      // default 'learning_logo_split_ratio'
  onResize?: (ratio: number) => void;
}

export class SplitLayout {
  private editorPane: HTMLElement;
  private canvasPane: HTMLElement;
  private workspace: HTMLElement;
  private splitter: HTMLElement;
  private options: SplitLayoutOptions;

  private minRatio: number;
  private maxRatio: number;
  private minPixelWidth: number;
  private storageKey: string;

  private ratio: number;
  private isDragging = false;
  private activePointerId: number | null = null;
  private resizeHandler: (() => void) | null = null;
  private rafHandle: number | null = null;
  private pendingClientX: number | null = null;

  constructor(
    editorPane: HTMLElement,
    canvasPane: HTMLElement,
    workspace: HTMLElement,
    splitter?: HTMLElement | null,
    options?: SplitLayoutOptions
  ) {
    this.editorPane = editorPane;
    this.canvasPane = canvasPane;
    this.workspace = workspace;
    this.options = options ?? {};

    this.minRatio = this.options.minRatio ?? 0.20;
    this.maxRatio = this.options.maxRatio ?? 0.80;
    this.minPixelWidth = this.options.minPixelWidth ?? 200;
    this.storageKey = this.options.storageKey ?? 'learning_logo_split_ratio';

    this.splitter = this.initSplitter(splitter);
    this.ratio = this.loadSavedRatio();
    this.init();
  }

  private initSplitter(splitter?: HTMLElement | null): HTMLElement {
    if (splitter) {
      return splitter;
    }
    const existing = this.workspace.querySelector<HTMLElement>('#pane-splitter');
    if (existing) {
      return existing;
    }
    const newSplitter = document.createElement('div');
    newSplitter.id = 'pane-splitter';
    newSplitter.className = 'pane-splitter';
    if (this.canvasPane && this.canvasPane.parentNode === this.workspace) {
      this.workspace.insertBefore(newSplitter, this.canvasPane);
    } else {
      this.workspace.appendChild(newSplitter);
    }
    return newSplitter;
  }

  private init(): void {
    this.initAria();
    this.attachEventListeners();
    this.updateOrientation();
  }

  private initAria(): void {
    this.splitter.setAttribute('role', 'separator');
    this.splitter.setAttribute('tabindex', '0');
    this.splitter.setAttribute('aria-orientation', 'vertical');
    this.splitter.setAttribute('aria-label', 'Resize editor and canvas panes');
    this.splitter.setAttribute('aria-valuemin', Math.round(this.minRatio * 100).toString());
    this.splitter.setAttribute('aria-valuemax', Math.round(this.maxRatio * 100).toString());
    this.splitter.setAttribute('aria-valuenow', Math.round(this.ratio * 100).toString());
  }

  private attachEventListeners(): void {
    this.splitter.addEventListener('pointerdown', this.handlePointerDown);
    this.splitter.addEventListener('pointermove', this.handlePointerMove);
    this.splitter.addEventListener('pointerup', this.handlePointerUp);
    this.splitter.addEventListener('pointercancel', this.handlePointerCancel);
    this.splitter.addEventListener('lostpointercapture', this.handlePointerCancel);
    this.splitter.addEventListener('keydown', this.handleKeyDown);
    this.splitter.addEventListener('dblclick', this.handleDoubleClick);

    if (typeof window !== 'undefined') {
      this.resizeHandler = () => {
        this.updateOrientation();
        this.options.onResize?.(this.ratio);
      };
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.isStacked() || this.isDragging || (e.pointerType === 'mouse' && e.button !== 0)) {
      return;
    }
    e.preventDefault();
    this.isDragging = true;
    this.activePointerId = e.pointerId;

    if (typeof this.splitter.setPointerCapture === 'function') {
      try {
        this.splitter.setPointerCapture(e.pointerId);
      } catch {
        // Ignore environments where pointer capture might fail
      }
    }

    this.workspace.classList.add('is-resizing');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('is-resizing');
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }
    this.pendingClientX = e.clientX;
    if (this.rafHandle !== null) {
      return;
    }
    const updateRatio = () => {
      this.rafHandle = null;
      if (!this.isDragging || this.pendingClientX === null) {
        return;
      }
      const workspaceRect = this.workspace.getBoundingClientRect();
      if (workspaceRect.width > 0) {
        const relativeX = this.pendingClientX - workspaceRect.left;
        const rawRatio = relativeX / workspaceRect.width;
        this.setRatio(rawRatio, false);
        this.options.onResize?.(this.ratio);
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      this.rafHandle = requestAnimationFrame(updateRatio);
    } else {
      updateRatio();
    }
  };

  private handlePointerUp = (_e: PointerEvent): void => {
    if (!this.isDragging) {
      return;
    }
    if (this.rafHandle !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafHandle);
      }
      this.rafHandle = null;
    }
    if (this.pendingClientX !== null) {
      const workspaceRect = this.workspace.getBoundingClientRect();
      if (workspaceRect.width > 0) {
        const relativeX = this.pendingClientX - workspaceRect.left;
        const rawRatio = relativeX / workspaceRect.width;
        this.setRatio(rawRatio, false);
      }
      this.pendingClientX = null;
    }
    this.isDragging = false;
    if (this.activePointerId !== null) {
      if (typeof this.splitter.releasePointerCapture === 'function') {
        try {
          this.splitter.releasePointerCapture(this.activePointerId);
        } catch {
          // Ignore environments where releasePointerCapture fails
        }
      }
      this.activePointerId = null;
    }

    this.workspace.classList.remove('is-resizing');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('is-resizing');
    }

    this.persistRatio();
    this.options.onResize?.(this.ratio);
  };

  private handlePointerCancel = (_e?: PointerEvent | Event): void => {
    if (!this.isDragging) {
      return;
    }
    if (this.rafHandle !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafHandle);
      }
      this.rafHandle = null;
    }
    this.pendingClientX = null;
    this.isDragging = false;
    if (this.activePointerId !== null) {
      if (typeof this.splitter.releasePointerCapture === 'function') {
        try {
          this.splitter.releasePointerCapture(this.activePointerId);
        } catch {
          // Ignore
        }
      }
      this.activePointerId = null;
    }

    this.workspace.classList.remove('is-resizing');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('is-resizing');
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.isStacked()) {
      return;
    }
    let newRatio: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
        newRatio = Math.round((this.ratio - 0.02) * 100) / 100;
        break;
      case 'ArrowRight':
        newRatio = Math.round((this.ratio + 0.02) * 100) / 100;
        break;
      case 'PageDown':
        newRatio = Math.round((this.ratio - 0.10) * 100) / 100;
        break;
      case 'PageUp':
        newRatio = Math.round((this.ratio + 0.10) * 100) / 100;
        break;
      case 'Home':
        newRatio = this.minRatio;
        break;
      case 'End':
        newRatio = this.maxRatio;
        break;
      case 'Enter':
      case ' ':
        newRatio = 0.50;
        break;
      default:
        return;
    }

    e.preventDefault();
    this.setRatio(newRatio, true);
    this.options.onResize?.(this.ratio);
  };

  private handleDoubleClick = (): void => {
    if (this.isStacked()) {
      return;
    }
    this.setRatio(0.50, true);
    this.options.onResize?.(this.ratio);
  };

  private clampRatio(ratio: number): number {
    let min = this.minRatio;
    let max = this.maxRatio;

    if (!this.isStacked() && typeof this.workspace.getBoundingClientRect === 'function') {
      const rect = this.workspace.getBoundingClientRect();
      if (rect.width > 0 && this.minPixelWidth > 0) {
        const minPixelRatio = this.minPixelWidth / rect.width;
        const maxPixelRatio = (rect.width - this.minPixelWidth) / rect.width;
        min = Math.max(min, minPixelRatio);
        max = Math.min(max, maxPixelRatio);
      }
    }

    if (min > max) {
      return 0.50;
    }
    return Math.max(min, Math.min(max, ratio));
  }

  private applyRatio(): void {
    this.splitter.setAttribute('aria-valuenow', Math.round(this.ratio * 100).toString());
    if (this.isStacked()) {
      this.editorPane.style.flex = '';
      this.canvasPane.style.flex = '';
      this.editorPane.style.width = '';
      this.canvasPane.style.width = '';
    } else {
      const percentage = (this.ratio * 100).toFixed(2);
      this.editorPane.style.flex = `0 0 ${percentage}%`;
      this.canvasPane.style.flex = '1 1 0%';
    }
  }

  private loadSavedRatio(): number {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.storageKey);
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (Number.isFinite(parsed)) {
            return this.clampRatio(parsed);
          }
        }
      }
    } catch (err) {
      console.warn('[SplitLayout] Failed to load split ratio from localStorage:', err);
    }
    return 0.50;
  }

  private persistRatio(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, this.ratio.toString());
      }
    } catch (err) {
      console.warn('[SplitLayout] Failed to save split ratio to localStorage:', err);
    }
  }

  public getEditorPane(): HTMLElement {
    return this.editorPane;
  }

  public getCanvasPane(): HTMLElement {
    return this.canvasPane;
  }

  public getSplitter(): HTMLElement {
    return this.splitter;
  }

  public getRatio(): number {
    return this.ratio;
  }

  public setRatio(ratio: number, persist = false): void {
    const clamped = this.clampRatio(ratio);
    this.ratio = Math.round(clamped * 10000) / 10000;
    this.applyRatio();
    if (persist) {
      this.persistRatio();
    }
  }

  public updateOrientation(): void {
    const isMobile = this.isStacked();
    if (isMobile) {
      this.workspace.classList.add('workspace-stacked');
      this.workspace.classList.remove('workspace-side-by-side');
    } else {
      this.workspace.classList.add('workspace-side-by-side');
      this.workspace.classList.remove('workspace-stacked');
    }
    this.setRatio(this.ratio, false);
  }

  public isStacked(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  public destroy(): void {
    if (this.rafHandle !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafHandle);
      }
      this.rafHandle = null;
    }
    this.pendingClientX = null;
    this.isDragging = false;
    this.activePointerId = null;

    this.workspace.classList.remove('is-resizing');
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('is-resizing');
    }

    this.splitter.removeEventListener('pointerdown', this.handlePointerDown);
    this.splitter.removeEventListener('pointermove', this.handlePointerMove);
    this.splitter.removeEventListener('pointerup', this.handlePointerUp);
    this.splitter.removeEventListener('pointercancel', this.handlePointerCancel);
    this.splitter.removeEventListener('lostpointercapture', this.handlePointerCancel);
    this.splitter.removeEventListener('keydown', this.handleKeyDown);
    this.splitter.removeEventListener('dblclick', this.handleDoubleClick);

    if (this.resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}

export function createFeedbackButton(onClick?: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'feedback-btn';
  btn.className = 'dbg-btn feedback-btn';
  btn.type = 'button';
  btn.innerHTML = '<span aria-hidden="true">💬</span> Feedback';
  btn.setAttribute('aria-label', 'Open feedback dialog');
  if (onClick) {
    btn.addEventListener('click', onClick);
  }
  return btn;
}
