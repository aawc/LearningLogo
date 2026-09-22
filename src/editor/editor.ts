import { highlightLogoCode } from './highlighter.ts';

export type ChangeCallback = (value: string) => void;

export class LogoEditor {
  private container: HTMLElement;
  private wrapperEl!: HTMLElement;
  private gutterEl!: HTMLElement;
  private backdropEl!: HTMLElement;
  private codeEl!: HTMLElement;
  private textareaEl!: HTMLTextAreaElement;
  private onChangeCallback: ChangeCallback | null = null;
  private activeLineNumber: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildDOM();
    this.setupListeners();
  }

  private buildDOM(): void {
    this.container.innerHTML = '';

    this.wrapperEl = document.createElement('div');
    this.wrapperEl.className = 'editor-wrapper';

    // Gutter for line numbers
    this.gutterEl = document.createElement('div');
    this.gutterEl.className = 'line-gutter';
    this.gutterEl.setAttribute('aria-hidden', 'true');

    // Backdrop with syntax highlighted code
    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'backdrop';
    this.backdropEl.setAttribute('aria-hidden', 'true');

    const pre = document.createElement('pre');
    this.codeEl = document.createElement('code');
    this.codeEl.className = 'highlight-layer';
    pre.appendChild(this.codeEl);
    this.backdropEl.appendChild(pre);

    // Transparent native textarea
    this.textareaEl = document.createElement('textarea');
    this.textareaEl.className = 'input-layer';
    this.textareaEl.setAttribute('spellcheck', 'false');
    this.textareaEl.setAttribute('autocomplete', 'off');
    this.textareaEl.setAttribute('autocapitalize', 'off');
    this.textareaEl.setAttribute('wrap', 'off');
    this.textareaEl.setAttribute('aria-label', 'Logo code input editor');

    this.wrapperEl.appendChild(this.gutterEl);
    this.wrapperEl.appendChild(this.backdropEl);
    this.wrapperEl.appendChild(this.textareaEl);
    this.container.appendChild(this.wrapperEl);

    this.updateGutterAndHighlight();
  }

  private setupListeners(): void {
    this.textareaEl.addEventListener('input', () => {
      this.updateGutterAndHighlight();
      if (this.onChangeCallback) {
        this.onChangeCallback(this.textareaEl.value);
      }
    });

    this.textareaEl.addEventListener('scroll', () => {
      this.syncScroll();
    });

    // Support Tab key indentation
    this.textareaEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.insertAtCursor('  ');
      }
    });
  }

  private syncScroll(): void {
    this.backdropEl.scrollTop = this.textareaEl.scrollTop;
    this.backdropEl.scrollLeft = this.textareaEl.scrollLeft;
    this.gutterEl.scrollTop = this.textareaEl.scrollTop;
  }

  private updateGutterAndHighlight(): void {
    const text = this.textareaEl.value;
    const { html } = highlightLogoCode(text);
    this.codeEl.innerHTML = html + '\n';

    const lines = text.split('\n');
    const lineCount = Math.max(1, lines.length);

    let gutterHtml = '';
    for (let i = 1; i <= lineCount; i++) {
      const isActive = this.activeLineNumber === i;
      gutterHtml += `<div class="gutter-line${isActive ? ' line-active' : ''}">${i}</div>`;
    }
    this.gutterEl.innerHTML = gutterHtml;
  }

  setValue(code: string): void {
    this.textareaEl.value = code;
    this.updateGutterAndHighlight();
  }

  getValue(): string {
    return this.textareaEl.value;
  }

  setOnChange(callback: ChangeCallback): void {
    this.onChangeCallback = callback;
  }

  highlightExecutionLine(lineNumber: number | null): void {
    this.activeLineNumber = lineNumber;
    this.updateGutterAndHighlight();
  }

  clearExecutionHighlight(): void {
    this.highlightExecutionLine(null);
  }

  insertAtCursor(text: string, cursorOffset?: number): void {
    this.textareaEl.focus();
    const start = this.textareaEl.selectionStart;
    const end = this.textareaEl.selectionEnd;

    if (typeof this.textareaEl.setRangeText === 'function') {
      this.textareaEl.setRangeText(text, start, end, 'end');
    } else {
      const currentVal = this.textareaEl.value;
      this.textareaEl.value = currentVal.substring(0, start) + text + currentVal.substring(end);
      const endPos = start + text.length;
      this.textareaEl.setSelectionRange(endPos, endPos);
    }

    if (cursorOffset !== undefined) {
      const newPos = start + cursorOffset;
      this.textareaEl.setSelectionRange(newPos, newPos);
    }

    this.updateGutterAndHighlight();
    if (this.onChangeCallback) {
      this.onChangeCallback(this.textareaEl.value);
    }
  }

  getCursorPosition(): { line: number; column: number; index: number } {
    const index = this.textareaEl.selectionStart;
    const textBefore = this.textareaEl.value.substring(0, index);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const column = (lines[lines.length - 1]?.length ?? 0) + 1;
    return { line, column, index };
  }

  setSelectionRange(start: number, end: number): void {
    this.textareaEl.setSelectionRange(start, end);
    this.textareaEl.focus();
  }
}
