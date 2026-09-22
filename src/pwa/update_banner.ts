export class UpdateBanner {
  private container: HTMLElement;
  private toastEl!: HTMLElement;
  private messageEl!: HTMLElement;
  private reloadBtn!: HTMLButtonElement;
  private dismissBtn!: HTMLButtonElement;
  private onReloadCallback: (() => void) | null = null;
  private onDismissCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildDOM();
  }

  private buildDOM(): void {
    this.container.innerHTML = '';
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'pwa-update-toast';
    this.toastEl.setAttribute('role', 'status');
    this.toastEl.setAttribute('aria-live', 'polite');
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

    this.dismissBtn = document.createElement('button');
    this.dismissBtn.type = 'button';
    this.dismissBtn.className = 'update-dismiss-btn';
    this.dismissBtn.setAttribute('aria-label', 'Dismiss update notification');
    this.dismissBtn.textContent = '✕';

    this.dismissBtn.addEventListener('click', () => {
      this.hide();
      if (this.onDismissCallback) {
        this.onDismissCallback();
      }
    });

    this.toastEl.appendChild(this.messageEl);
    this.toastEl.appendChild(this.reloadBtn);
    this.toastEl.appendChild(this.dismissBtn);
    this.container.appendChild(this.toastEl);
  }

  show(onReload: () => void, onDismiss?: () => void): void {
    this.onReloadCallback = onReload;
    this.onDismissCallback = onDismiss ?? null;
    this.toastEl.hidden = false;
  }

  hide(): void {
    this.toastEl.hidden = true;
  }

  isVisible(): boolean {
    return !this.toastEl.hidden;
  }
}
