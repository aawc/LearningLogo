import {
  captureAppState,
  formatMarkdownReport,
  formatJsonReport,
  generateGitHubIssueUrl,
  type CaptureContext,
  type AppStateSnapshot,
} from './state_capture.ts';

export class FeedbackModal {
  private container: HTMLElement;
  private getContext: () => CaptureContext;
  private backdropEl!: HTMLElement;
  private dialogEl!: HTMLElement;
  private categorySelect!: HTMLSelectElement;
  private descTextarea!: HTMLTextAreaElement;
  private diagnosticsCode!: HTMLElement;
  private copyBtn!: HTMLButtonElement;
  private downloadBtn!: HTMLButtonElement;
  private githubBtn!: HTMLButtonElement;
  private closeBtn!: HTMLButtonElement;
  private currentSnapshot: AppStateSnapshot | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private previousActiveElement: HTMLElement | null = null;

  constructor(container: HTMLElement, getContext: () => CaptureContext) {
    this.container = container;
    this.getContext = getContext;
    this.buildDOM();
    this.setupListeners();
  }

  private buildDOM(): void {
    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'feedback-dialog-backdrop';
    this.backdropEl.hidden = true;

    this.dialogEl = document.createElement('div');
    this.dialogEl.className = 'feedback-dialog';
    this.dialogEl.setAttribute('role', 'dialog');
    this.dialogEl.setAttribute('aria-modal', 'true');
    this.dialogEl.setAttribute('aria-labelledby', 'feedback-title');

    // Header
    const header = document.createElement('div');
    header.className = 'feedback-header';

    const title = document.createElement('h2');
    title.id = 'feedback-title';
    title.className = 'feedback-title';
    title.innerHTML = '<span aria-hidden="true">💬</span> Send Feedback / Bug Report';

    this.closeBtn = document.createElement('button');
    this.closeBtn.type = 'button';
    this.closeBtn.className = 'feedback-close-btn';
    this.closeBtn.setAttribute('aria-label', 'Close dialog');
    this.closeBtn.textContent = '✕';

    header.appendChild(title);
    header.appendChild(this.closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'feedback-body';

    // Category Selector
    const catGroup = document.createElement('div');
    catGroup.className = 'feedback-form-group';
    const catLabel = document.createElement('label');
    catLabel.htmlFor = 'feedback-category';
    catLabel.className = 'feedback-label';
    catLabel.textContent = 'Feedback Category:';

    this.categorySelect = document.createElement('select');
    this.categorySelect.id = 'feedback-category';
    this.categorySelect.className = 'feedback-select';
    this.categorySelect.innerHTML = `
      <option value="bug">🐞 Bug Report</option>
      <option value="feature">✨ Feature Request</option>
      <option value="feedback">💡 General Feedback</option>
    `;

    catGroup.appendChild(catLabel);
    catGroup.appendChild(this.categorySelect);

    // Description Input
    const descGroup = document.createElement('div');
    descGroup.className = 'feedback-form-group';
    const descLabel = document.createElement('label');
    descLabel.htmlFor = 'feedback-description';
    descLabel.className = 'feedback-label';
    descLabel.textContent = 'Description & Steps to Reproduce:';

    this.descTextarea = document.createElement('textarea');
    this.descTextarea.id = 'feedback-description';
    this.descTextarea.className = 'feedback-textarea';
    this.descTextarea.placeholder = 'Please describe what you did, what you expected, and what actually happened...';

    descGroup.appendChild(descLabel);
    descGroup.appendChild(this.descTextarea);

    // Diagnostics Preview Accordion
    const details = document.createElement('details');
    details.className = 'feedback-diagnostics';
    const summary = document.createElement('summary');
    summary.textContent = 'Diagnostic Snapshot Preview (Auto-Attached)';

    const pre = document.createElement('pre');
    pre.className = 'feedback-diagnostics-content';
    this.diagnosticsCode = document.createElement('code');
    pre.appendChild(this.diagnosticsCode);

    details.appendChild(summary);
    details.appendChild(pre);

    body.appendChild(catGroup);
    body.appendChild(descGroup);
    body.appendChild(details);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'feedback-actions';

    this.copyBtn = document.createElement('button');
    this.copyBtn.type = 'button';
    this.copyBtn.id = 'feedback-copy-btn';
    this.copyBtn.className = 'feedback-action-btn feedback-btn-copy';
    this.copyBtn.textContent = '[COPY] Copy Report';

    this.downloadBtn = document.createElement('button');
    this.downloadBtn.type = 'button';
    this.downloadBtn.id = 'feedback-download-btn';
    this.downloadBtn.className = 'feedback-action-btn feedback-btn-download';
    this.downloadBtn.textContent = '[DOWNLOAD] Export JSON';

    this.githubBtn = document.createElement('button');
    this.githubBtn.type = 'button';
    this.githubBtn.id = 'feedback-github-btn';
    this.githubBtn.className = 'feedback-action-btn feedback-btn-github';
    this.githubBtn.textContent = '[ISSUE] Open GitHub Issue';

    actions.appendChild(this.copyBtn);
    actions.appendChild(this.downloadBtn);
    actions.appendChild(this.githubBtn);

    this.dialogEl.appendChild(header);
    this.dialogEl.appendChild(body);
    this.dialogEl.appendChild(actions);
    this.backdropEl.appendChild(this.dialogEl);
    this.container.appendChild(this.backdropEl);
  }

  private setupListeners(): void {
    this.closeBtn.addEventListener('click', () => this.close());

    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        this.close();
      }
    });

    this.categorySelect.addEventListener('change', () => this.updatePreview());
    this.descTextarea.addEventListener('input', () => this.updatePreview());

    this.copyBtn.addEventListener('click', async () => {
      if (!this.currentSnapshot) return;
      const report = formatMarkdownReport(
        this.currentSnapshot,
        this.descTextarea.value,
        this.categorySelect.value
      );

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(report);
          this.copyBtn.textContent = '[COPIED] Copied!';
          setTimeout(() => {
            this.copyBtn.textContent = '[COPY] Copy Report';
          }, 2000);
        }
      } catch (err) {
        console.warn('Failed to copy feedback to clipboard:', err);
      }
    });

    this.downloadBtn.addEventListener('click', () => {
      if (!this.currentSnapshot) return;
      const jsonReport = formatJsonReport(
        this.currentSnapshot,
        this.descTextarea.value,
        this.categorySelect.value
      );

      const blob = new Blob([jsonReport], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `learning-logo-feedback-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    this.githubBtn.addEventListener('click', () => {
      if (!this.currentSnapshot) return;
      const url = generateGitHubIssueUrl(
        this.currentSnapshot,
        this.descTextarea.value,
        this.categorySelect.value
      );
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  private getFocusableElements(): HTMLElement[] {
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    return Array.from(this.dialogEl.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => !el.hasAttribute('disabled') && !el.hidden
    );
  }

  private handleTabFocus(e: KeyboardEvent): void {
    const focusable = this.getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !this.dialogEl.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !this.dialogEl.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  private updatePreview(): void {
    if (!this.currentSnapshot) return;
    const report = formatMarkdownReport(
      this.currentSnapshot,
      this.descTextarea.value,
      this.categorySelect.value
    );
    this.diagnosticsCode.textContent = report;
  }

  open(): void {
    this.previousActiveElement =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const context = this.getContext();
    this.currentSnapshot = captureAppState(context);
    this.updatePreview();
    this.backdropEl.hidden = false;

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Tab') {
        this.handleTabFocus(e);
      }
    };
    window.addEventListener('keydown', this.keydownHandler);

    this.descTextarea.focus();
  }

  close(): void {
    this.backdropEl.hidden = true;
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }
    this.previousActiveElement = null;
  }

  isOpen(): boolean {
    return !this.backdropEl.hidden;
  }
}
