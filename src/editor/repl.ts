export type ExecuteCallback = (command: string) => void;

export class ReplConsole {
  private container: HTMLElement;
  private inputEl!: HTMLInputElement;
  private history: string[] = [];
  private historyIndex = -1;
  private tempBuffer = '';
  private onExecuteCallback: ExecuteCallback | null = null;
  private maxHistory = 50;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildDOM();
    this.setupListeners();
  }

  private buildDOM(): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'repl-wrapper';

    const prompt = document.createElement('span');
    prompt.className = 'repl-prompt';
    prompt.textContent = '?';
    prompt.setAttribute('aria-hidden', 'true');

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.className = 'repl-input';
    this.inputEl.placeholder = 'Type a Logo command (e.g. FD 100) and press Enter';
    this.inputEl.setAttribute('aria-label', 'Logo immediate command input');
    this.inputEl.setAttribute('autocomplete', 'off');
    this.inputEl.setAttribute('autocapitalize', 'off');
    this.inputEl.setAttribute('spellcheck', 'false');

    wrapper.appendChild(prompt);
    wrapper.appendChild(this.inputEl);
    this.container.appendChild(wrapper);
  }

  private setupListeners(): void {
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      } else if (e.key === 'Escape') {
        this.inputEl.value = '';
        this.historyIndex = -1;
      }
    });
  }

  private submit(): void {
    const raw = this.inputEl.value;
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Add to history
    this.history.push(trimmed);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = -1;
    this.tempBuffer = '';

    this.inputEl.value = '';

    if (this.onExecuteCallback) {
      this.onExecuteCallback(trimmed);
    }
  }

  private navigateHistory(direction: number): void {
    if (this.history.length === 0) return;

    if (this.historyIndex === -1) {
      this.tempBuffer = this.inputEl.value;
      if (direction < 0) {
        this.historyIndex = this.history.length - 1;
      }
    } else {
      this.historyIndex += direction;
    }

    if (this.historyIndex < 0) {
      this.historyIndex = 0;
    } else if (this.historyIndex >= this.history.length) {
      this.historyIndex = -1;
      this.inputEl.value = this.tempBuffer;
      return;
    }

    this.inputEl.value = this.history[this.historyIndex] ?? '';
    // Move cursor to end of input
    const len = this.inputEl.value.length;
    this.inputEl.setSelectionRange(len, len);
  }

  setOnExecute(callback: ExecuteCallback): void {
    this.onExecuteCallback = callback;
  }

  focus(): void {
    this.inputEl.focus();
  }
}
