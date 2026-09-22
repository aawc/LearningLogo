import {
  type VersionsManifest,
  type VersionSwitcherOptions,
  validateVersionsManifest,
  resolveVersionUrl
} from './version_switcher_types.ts';

declare const __APP_VERSION__: string;

export class VersionSwitcher {
  private readonly container: HTMLElement;
  private readonly currentVersion: string;
  private readonly manifestUrl: string;
  private readonly onBeforeSwitch?: () => void;
  private readonly navigate: (url: string) => void;

  private rootEl!: HTMLElement;
  private triggerBtn!: HTMLButtonElement;
  private menuEl!: HTMLElement;
  private listEl!: HTMLUListElement;

  private isDropdownOpen = false;
  public readonly loadManifestPromise: Promise<void>;

  private readonly boundOnDocumentClick: (e: MouseEvent) => void;
  private readonly boundOnKeyDown: (e: KeyboardEvent) => void;

  constructor(container: HTMLElement, options: VersionSwitcherOptions = {}) {
    this.container = container;

    // Detect version or default
    const detectedVersion =
      options.currentVersion ??
      (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0');

    this.currentVersion = detectedVersion.startsWith('v')
      ? detectedVersion
      : `v${detectedVersion}`;

    this.manifestUrl = options.manifestUrl ?? './versions.json';
    this.onBeforeSwitch = options.onBeforeSwitch;
    this.navigate = options.navigate ?? ((url: string) => {
      window.location.href = url;
    });

    this.boundOnDocumentClick = this.handleDocumentClick.bind(this);
    this.boundOnKeyDown = this.handleKeyDown.bind(this);

    this.renderBase();
    this.bindEvents();

    this.loadManifestPromise = this.loadManifest();
  }

  private renderBase(): void {
    this.rootEl = document.createElement('div');
    this.rootEl.className = 'version-switcher';

    this.triggerBtn = document.createElement('button');
    this.triggerBtn.type = 'button';
    this.triggerBtn.className = 'version-trigger';
    this.triggerBtn.setAttribute('aria-haspopup', 'listbox');
    this.triggerBtn.setAttribute('aria-expanded', 'false');
    this.triggerBtn.setAttribute('aria-label', 'Select application version');

    const tagSpan = document.createElement('span');
    tagSpan.className = 'version-tag';
    tagSpan.textContent = this.currentVersion;

    const caretSpan = document.createElement('span');
    caretSpan.className = 'version-caret';
    caretSpan.setAttribute('aria-hidden', 'true');
    caretSpan.textContent = '▾';

    this.triggerBtn.appendChild(tagSpan);
    this.triggerBtn.appendChild(caretSpan);

    this.menuEl = document.createElement('div');
    this.menuEl.className = 'version-menu';
    this.menuEl.setAttribute('role', 'listbox');
    this.menuEl.setAttribute('aria-label', 'Available versions');
    this.menuEl.hidden = true;

    const header = document.createElement('div');
    header.className = 'version-menu-header';
    header.textContent = 'Available Releases';
    this.menuEl.appendChild(header);

    this.listEl = document.createElement('ul');
    this.listEl.className = 'version-list';
    this.listEl.setAttribute('role', 'presentation');
    this.menuEl.appendChild(this.listEl);

    this.rootEl.appendChild(this.triggerBtn);
    this.rootEl.appendChild(this.menuEl);
    this.container.appendChild(this.rootEl);
  }

  private bindEvents(): void {
    this.triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.triggerBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!this.isDropdownOpen) {
          this.open();
        }
        const firstOption = this.listEl.querySelector<HTMLElement>('.version-option');
        firstOption?.focus();
      }
    });

    document.addEventListener('click', this.boundOnDocumentClick);
    window.addEventListener('keydown', this.boundOnKeyDown);
  }

  private handleDocumentClick(e: MouseEvent): void {
    if (!this.isDropdownOpen) return;
    const target = e.target as Node | null;
    if (target && !this.rootEl.contains(target)) {
      this.close();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isDropdownOpen) {
      this.close();
      this.triggerBtn.focus();
    }
  }

  public toggle(): void {
    if (this.isDropdownOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    this.isDropdownOpen = true;
    this.menuEl.hidden = false;
    this.triggerBtn.setAttribute('aria-expanded', 'true');
  }

  public close(): void {
    this.isDropdownOpen = false;
    this.menuEl.hidden = true;
    this.triggerBtn.setAttribute('aria-expanded', 'false');
  }

  private async loadManifest(): Promise<void> {
    try {
      const res = await fetch(this.manifestUrl, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      const manifest = validateVersionsManifest(data);
      if (!manifest) {
        throw new Error('Invalid manifest schema');
      }
      this.renderMenu(manifest);
    } catch {
      this.renderOffline();
    }
  }

  private renderMenu(manifest: VersionsManifest): void {
    this.listEl.innerHTML = '';

    for (const item of manifest.versions) {
      const isCurrent = item.version === this.currentVersion;
      const li = document.createElement('li');
      li.className = 'version-option';
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.setAttribute('data-version', item.version);
      li.setAttribute('aria-selected', isCurrent ? 'true' : 'false');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'version-opt-name';
      nameSpan.textContent = item.version;
      li.appendChild(nameSpan);

      const badgesContainer = document.createElement('span');
      badgesContainer.style.display = 'inline-flex';
      badgesContainer.style.gap = '4px';

      if (item.isLatest) {
        const latestBadge = document.createElement('span');
        latestBadge.className = 'version-badge version-badge-latest';
        latestBadge.textContent = '[Latest]';
        badgesContainer.appendChild(latestBadge);
      }

      if (isCurrent) {
        const currentBadge = document.createElement('span');
        currentBadge.className = 'version-badge version-badge-current';
        currentBadge.textContent = '[Current]';
        badgesContainer.appendChild(currentBadge);
      }

      li.appendChild(badgesContainer);

      const selectVersion = () => {
        this.close();
        if (isCurrent) return;

        this.onBeforeSwitch?.();
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        const currentHash = typeof window !== 'undefined' ? window.location.hash : '';
        const targetUrl = resolveVersionUrl(item, currentPath, currentHash);
        this.navigate(targetUrl);
      };

      li.addEventListener('click', (e) => {
        e.stopPropagation();
        selectVersion();
      });

      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectVersion();
          return;
        }

        const options = Array.from(this.listEl.querySelectorAll<HTMLElement>('.version-option'));
        const index = options.indexOf(li);
        if (index === -1) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (index + 1) % options.length;
          options[nextIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (index - 1 + options.length) % options.length;
          options[prevIndex]?.focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          options[0]?.focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          options[options.length - 1]?.focus();
        }
      });

      this.listEl.appendChild(li);
    }
  }

  private renderOffline(): void {
    const tagSpan = this.triggerBtn.querySelector('.version-tag');
    if (tagSpan) {
      tagSpan.textContent = `${this.currentVersion} [Offline]`;
    }

    this.listEl.innerHTML = '';
    const offlineLi = document.createElement('li');
    offlineLi.className = 'version-option';
    offlineLi.style.cursor = 'default';
    offlineLi.setAttribute('role', 'option');
    offlineLi.setAttribute('aria-selected', 'true');

    const label = document.createElement('span');
    label.className = 'version-badge version-badge-offline';
    label.textContent = `${this.currentVersion} (Offline Mode)`;
    offlineLi.appendChild(label);
    this.listEl.appendChild(offlineLi);
  }

  public destroy(): void {
    document.removeEventListener('click', this.boundOnDocumentClick);
    window.removeEventListener('keydown', this.boundOnKeyDown);
    this.rootEl.remove();
  }
}
