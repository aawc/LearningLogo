import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackModal } from '../../../src/feedback/feedback_modal.ts';
import type { CaptureContext } from '../../../src/feedback/state_capture.ts';

describe('FeedbackModal Component', () => {
  let container: HTMLElement;
  let mockContext: CaptureContext;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockContext = {
      editor: { getValue: () => 'FD 100' },
      turtle: {
        getState: () => ({
          x: 0,
          y: 100,
          heading: 0,
          penDown: true,
          penColor: '#0072B2',
          penSize: 2,
          visible: true,
        }),
        getPathSegments: () => [],
      },
      stepper: {
        getState: () => 'IDLE',
      },
      repl: {
        getHistory: () => ['FD 100'],
      },
      lastError: null,
    };
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('initializes in closed state', () => {
    const modal = new FeedbackModal(container, () => mockContext);
    expect(modal.isOpen()).toBe(false);
    expect(container.querySelector('.feedback-dialog')).not.toBeNull();
  });

  it('opens and displays category selection, notes input, and diagnostics preview', () => {
    const modal = new FeedbackModal(container, () => mockContext);
    modal.open();

    expect(modal.isOpen()).toBe(true);

    const dialog = container.querySelector('.feedback-dialog') as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    const categorySelect = container.querySelector('#feedback-category') as HTMLSelectElement;
    expect(categorySelect).not.toBeNull();
    expect(categorySelect.value).toBe('bug');

    const descInput = container.querySelector('#feedback-description') as HTMLTextAreaElement;
    expect(descInput).not.toBeNull();

    const diagnostics = container.querySelector('.feedback-diagnostics') as HTMLDetailsElement;
    expect(diagnostics).not.toBeNull();
    expect(diagnostics.textContent).toContain('FD 100');
  });

  it('copies markdown report to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    const modal = new FeedbackModal(container, () => mockContext);
    modal.open();

    const copyBtn = container.querySelector('#feedback-copy-btn') as HTMLButtonElement;
    expect(copyBtn).not.toBeNull();

    copyBtn.click();
    await Promise.resolve();

    expect(writeTextMock).toHaveBeenCalled();
    const firstWriteCall = writeTextMock.mock.calls[0];
    expect(firstWriteCall).toBeDefined();
    const copiedText = firstWriteCall![0];
    expect(copiedText).toContain('## [BUG REPORT]');
    expect(copiedText).toContain('FD 100');
  });

  it('opens pre-filled GitHub issue URL when github button is clicked', () => {
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);

    const modal = new FeedbackModal(container, () => mockContext);
    modal.open();

    const descInput = container.querySelector('#feedback-description') as HTMLTextAreaElement;
    descInput.value = 'Turtle heading issue';
    descInput.dispatchEvent(new Event('input'));

    const githubBtn = container.querySelector('#feedback-github-btn') as HTMLButtonElement;
    expect(githubBtn).not.toBeNull();
    githubBtn.click();

    expect(openMock).toHaveBeenCalled();
    const firstOpenCall = openMock.mock.calls[0];
    expect(firstOpenCall).toBeDefined();
    const targetUrl = firstOpenCall![0] as string;
    expect(targetUrl).toContain('https://github.com/aawc/LearningLogo/issues/new');
    expect(targetUrl).toContain('Turtle+heading+issue');
    expect(firstOpenCall![1]).toBe('_blank');
    expect(firstOpenCall![2]).toBe('noopener,noreferrer');
  });

  it('closes on close button click and on Escape key press', () => {
    const modal = new FeedbackModal(container, () => mockContext);
    modal.open();
    expect(modal.isOpen()).toBe(true);

    const closeBtn = container.querySelector('.feedback-close-btn') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    expect(modal.isOpen()).toBe(false);

    modal.open();
    expect(modal.isOpen()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.isOpen()).toBe(false);
  });

  it('restores focus to previous active element upon close (F1)', () => {
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const modal = new FeedbackModal(container, () => mockContext);
    modal.open();

    const descInput = container.querySelector('#feedback-description') as HTMLTextAreaElement;
    expect(document.activeElement).toBe(descInput);

    modal.close();
    expect(document.activeElement).toBe(triggerBtn);

    triggerBtn.remove();
  });

  it('traps Tab and Shift+Tab focus navigation within modal elements (F1)', () => {
    const modal = new FeedbackModal(container, () => mockContext);
    modal.open();

    const closeBtn = container.querySelector('.feedback-close-btn') as HTMLButtonElement;
    const githubBtn = container.querySelector('#feedback-github-btn') as HTMLButtonElement;

    // Last element is githubBtn. Pressing Tab should wrap to closeBtn (first element)
    githubBtn.focus();
    expect(document.activeElement).toBe(githubBtn);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    window.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeBtn);

    // First element is closeBtn. Pressing Shift+Tab should wrap to githubBtn (last element)
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(shiftTabEvent);
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(githubBtn);

    modal.close();
  });
});
