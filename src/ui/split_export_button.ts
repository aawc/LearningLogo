export interface SplitExportButtonOptions {
  onExportLogo: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
}

export class SplitExportButton {
  private readonly container: HTMLElement;
  private readonly options: SplitExportButtonOptions;

  private rootEl!: HTMLElement;
  private mainBtn!: HTMLButtonElement;
  private toggleBtn!: HTMLButtonElement;
  private menuEl!: HTMLElement;
  private menuItems: HTMLButtonElement[] = [];

  private isMenuOpen = false;
  private readonly boundOnDocumentClick: (e: MouseEvent) => void;
  private readonly boundOnWindowKeyDown: (e: KeyboardEvent) => void;
  private readonly boundOnFocusOut: (e: FocusEvent) => void;

  constructor(container: HTMLElement, options: SplitExportButtonOptions) {
    this.container = container;
    this.options = options;

    this.boundOnDocumentClick = this.handleDocumentClick.bind(this);
    this.boundOnWindowKeyDown = this.handleWindowKeyDown.bind(this);
    this.boundOnFocusOut = this.handleFocusOut.bind(this);

    this.render();
    this.bindEvents();
  }

  private render(): void {
    this.rootEl = document.createElement('div');
    this.rootEl.className = 'split-btn-group export-split-button';

    // Main Export Button
    this.mainBtn = document.createElement('button');
    this.mainBtn.type = 'button';
    this.mainBtn.className = 'dbg-btn split-btn-main';
    this.mainBtn.setAttribute('aria-label', 'Export Logo Code');
    this.mainBtn.textContent = 'Export';

    // Toggle Dropdown Button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.type = 'button';
    this.toggleBtn.className = 'dbg-btn split-btn-toggle';
    this.toggleBtn.setAttribute('aria-haspopup', 'menu');
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    this.toggleBtn.setAttribute('aria-label', 'Open export format options');

    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '▾';
    this.toggleBtn.appendChild(caret);

    // Dropdown Menu
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'export-dropdown-menu';
    this.menuEl.setAttribute('role', 'menu');
    this.menuEl.setAttribute('aria-label', 'Export options');
    this.menuEl.hidden = true;

    const formats: Array<{
      format: 'logo' | 'png' | 'json';
      icon: string;
      label: string;
      action: () => void;
    }> = [
      {
        format: 'logo',
        icon: '📄',
        label: 'Logo Code (.logo)',
        action: () => this.options.onExportLogo(),
      },
      {
        format: 'png',
        icon: '🖼️',
        label: 'Canvas Drawing (.png)',
        action: () => this.options.onExportPng(),
      },
      {
        format: 'json',
        icon: '📦',
        label: 'Project Data (.json)',
        action: () => this.options.onExportJson(),
      },
    ];

    this.menuItems = formats.map((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'export-menu-item';
      btn.setAttribute('role', 'menuitem');
      btn.setAttribute('data-format', item.format);

      const iconSpan = document.createElement('span');
      iconSpan.className = 'export-icon';
      iconSpan.setAttribute('aria-hidden', 'true');
      iconSpan.textContent = item.icon;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'export-label';
      labelSpan.textContent = item.label;

      btn.appendChild(iconSpan);
      btn.appendChild(labelSpan);

      const triggerAction = () => {
        this.close();
        item.action();
      };

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerAction();
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerAction();
          return;
        }

        const idx = this.menuItems.indexOf(btn);
        if (idx === -1) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = (idx + 1) % this.menuItems.length;
          this.menuItems[nextIdx]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIdx = (idx - 1 + this.menuItems.length) % this.menuItems.length;
          this.menuItems[prevIdx]?.focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          this.menuItems[0]?.focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          this.menuItems[this.menuItems.length - 1]?.focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
          this.toggleBtn.focus();
        }
      });

      this.menuEl.appendChild(btn);
      return btn;
    });

    this.rootEl.appendChild(this.mainBtn);
    this.rootEl.appendChild(this.toggleBtn);
    this.rootEl.appendChild(this.menuEl);
    this.container.appendChild(this.rootEl);
  }

  private bindEvents(): void {
    this.mainBtn.addEventListener('click', () => {
      this.close();
      this.options.onExportLogo();
    });

    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.toggleBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.isMenuOpen) {
          this.open();
        }
        this.menuItems[0]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.isMenuOpen) {
          this.open();
        }
        this.menuItems[this.menuItems.length - 1]?.focus();
      }
    });

    document.addEventListener('click', this.boundOnDocumentClick);
    window.addEventListener('keydown', this.boundOnWindowKeyDown);
    this.rootEl.addEventListener('focusout', this.boundOnFocusOut);
  }

  private handleDocumentClick(e: MouseEvent): void {
    if (!this.isMenuOpen) return;
    const target = e.target as Node | null;
    if (target && !this.rootEl.contains(target)) {
      this.close();
    }
  }

  private handleFocusOut(e: FocusEvent): void {
    if (!this.isMenuOpen) return;
    const nextTarget = e.relatedTarget as Node | null;
    if (!nextTarget || !this.rootEl.contains(nextTarget)) {
      this.close();
    }
  }

  private handleWindowKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isMenuOpen) {
      this.close();
      this.toggleBtn.focus();
    }
  }

  public open(): void {
    this.isMenuOpen = true;
    this.menuEl.hidden = false;
    this.toggleBtn.setAttribute('aria-expanded', 'true');
  }

  public close(): void {
    this.isMenuOpen = false;
    this.menuEl.hidden = true;
    this.toggleBtn.setAttribute('aria-expanded', 'false');
  }

  public toggle(): void {
    if (this.isMenuOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public isOpen(): boolean {
    return this.isMenuOpen;
  }

  public getElement(): HTMLElement {
    return this.rootEl;
  }

  public destroy(): void {
    document.removeEventListener('click', this.boundOnDocumentClick);
    window.removeEventListener('keydown', this.boundOnWindowKeyDown);
    this.rootEl.removeEventListener('focusout', this.boundOnFocusOut);
    this.rootEl.remove();
  }
}
