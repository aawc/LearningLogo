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
    (this.container as HTMLElement & { __updateBanner?: UpdateBanner }).__updateBanner = this;
    this.buildDOM();
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        !this.toastEl.contains(activeEl)
      ) {
        return;
      }
      this.hide();
      if (this.onDismissCallback) {
        this.onDismissCallback();
      }
    }
  };

  private registerKeydownListener(): void {
    window.removeEventListener('keydown', this.handleKeydown);
    window.addEventListener('keydown', this.handleKeydown);
  }

  private unregisterKeydownListener(): void {
    window.removeEventListener('keydown', this.handleKeydown);
  }

  private buildDOM(): void {
    this.container.classList.remove('pwa-update-toast');
    this.container.removeAttribute('hidden');
    if (!this.container.hasAttribute('role')) {
      this.container.setAttribute('role', 'status');
    }
    if (!this.container.hasAttribute('aria-live')) {
      this.container.setAttribute('aria-live', 'polite');
    }
    if (!this.container.hasAttribute('aria-atomic')) {
      this.container.setAttribute('aria-atomic', 'true');
    }
    this.container.innerHTML = '';

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'pwa-update-toast';
    this.toastEl.hidden = true;
    this.toastEl.style.display = 'none';

    this.messageEl = document.createElement('span');
    this.messageEl.className = 'update-msg';
    this.messageEl.textContent = '🚀 Update Available! Click to refresh:';

    this.reloadBtn = document.createElement('button');
    this.reloadBtn.type = 'button';
    this.reloadBtn.className = 'dbg-btn btn-run update-reload-btn';
    this.reloadBtn.textContent = 'Update Now';

    this.reloadBtn.addEventListener('click', () => {
      if (this.reloadBtn.disabled) {
        return;
      }
      this.reloadBtn.disabled = true;
      this.reloadBtn.textContent = 'Updating...';
      if (this.onReloadCallback) {
        this.onReloadCallback();
      } else {
        console.warn('No reload callback registered for PWA update banner.');
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
    this.reloadBtn.disabled = false;
    this.reloadBtn.textContent = 'Update Now';
    this.toastEl.hidden = false;
    this.toastEl.style.display = 'flex';
    this.registerKeydownListener();
  }

  hide(): void {
    this.toastEl.hidden = true;
    this.toastEl.style.display = 'none';
    this.unregisterKeydownListener();
  }

  destroy(): void {
    this.hide();
    this.toastEl.remove();
    delete (this.container as HTMLElement & { __updateBanner?: UpdateBanner }).__updateBanner;
    this.onReloadCallback = null;
    this.onDismissCallback = null;
  }

  isVisible(): boolean {
    return (
      this.toastEl.parentElement !== null &&
      !this.toastEl.hidden &&
      this.toastEl.style.display !== 'none'
    );
  }
}
