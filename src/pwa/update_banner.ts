export class UpdateBanner {
  private container: HTMLElement;
  private toastEl!: HTMLElement;
  private messageEl!: HTMLElement;
  private reloadBtn!: HTMLButtonElement;
  private onReloadCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildDOM();
  }

  private buildDOM(): void {
    this.container.innerHTML = '';
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'pwa-update-toast';
    this.toastEl.hidden = true;

    this.messageEl = document.createElement('span');
    this.messageEl.className = 'update-msg';
    this.messageEl.textContent = '🚀 Update Available! Click to refresh:';

    this.reloadBtn = document.createElement('button');
    this.reloadBtn.type = 'button';
    this.reloadBtn.className = 'dbg-btn btn-run update-reload-btn';
    this.reloadBtn.textContent = 'Update Now';

    this.reloadBtn.addEventListener('click', () => {
      if (this.onReloadCallback) {
        this.onReloadCallback();
      }
    });

    this.toastEl.appendChild(this.messageEl);
    this.toastEl.appendChild(this.reloadBtn);
    this.container.appendChild(this.toastEl);
  }

  show(onReload: () => void): void {
    this.onReloadCallback = onReload;
    this.toastEl.hidden = false;
  }

  hide(): void {
    this.toastEl.hidden = true;
  }

  isVisible(): boolean {
    return !this.toastEl.hidden;
  }
}
