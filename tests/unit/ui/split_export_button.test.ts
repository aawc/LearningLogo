import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { SplitExportButton } from '../../../src/ui/split_export_button.ts';

describe('SplitExportButton Component (Requirement 2)', () => {
  let container: HTMLDivElement;
  let onExportLogo: Mock<() => void>;
  let onExportPng: Mock<() => void>;
  let onExportJson: Mock<() => void>;
  let splitButton: SplitExportButton;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onExportLogo = vi.fn();
    onExportPng = vi.fn();
    onExportJson = vi.fn();

    splitButton = new SplitExportButton(container, {
      onExportLogo,
      onExportPng,
      onExportJson,
    });
  });

  afterEach(() => {
    splitButton.destroy();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders main button, toggle button, and accessible menu structure', () => {
    const mainBtn = container.querySelector('.split-btn-main') as HTMLButtonElement;
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;

    expect(mainBtn).not.toBeNull();
    expect(mainBtn.textContent).toContain('Export');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-haspopup')).toBe('menu');
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    expect(menu).not.toBeNull();
    expect(menu.hidden).toBe(true);

    const items = menu.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(3);
    expect(items[0]?.textContent).toContain('Logo Code');
    expect(items[1]?.textContent).toContain('Canvas Drawing');
    expect(items[2]?.textContent).toContain('Project Data');
  });

  it('triggers onExportLogo when main button is clicked', () => {
    const mainBtn = container.querySelector('.split-btn-main') as HTMLButtonElement;
    mainBtn.click();

    expect(onExportLogo).toHaveBeenCalledTimes(1);
    expect(onExportPng).not.toHaveBeenCalled();
    expect(onExportJson).not.toHaveBeenCalled();
  });

  it('toggles dropdown visibility and aria-expanded when toggle button is clicked', () => {
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;

    expect(menu.hidden).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

    toggleBtn.click();
    expect(menu.hidden).toBe(false);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

    toggleBtn.click();
    expect(menu.hidden).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes dropdown when clicking outside', () => {
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;

    toggleBtn.click();
    expect(menu.hidden).toBe(false);

    document.body.click();
    expect(menu.hidden).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('invokes appropriate callbacks and closes menu when selecting items', () => {
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');

    // Select Logo Code
    toggleBtn.click();
    items[0]?.click();
    expect(onExportLogo).toHaveBeenCalledTimes(1);
    expect(menu.hidden).toBe(true);

    // Select Canvas Drawing (.png)
    toggleBtn.click();
    items[1]?.click();
    expect(onExportPng).toHaveBeenCalledTimes(1);
    expect(menu.hidden).toBe(true);

    // Select Project Data (.json)
    toggleBtn.click();
    items[2]?.click();
    expect(onExportJson).toHaveBeenCalledTimes(1);
    expect(menu.hidden).toBe(true);
  });

  it('closes dropdown on Escape key and returns focus to toggle button', () => {
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;

    toggleBtn.click();
    expect(menu.hidden).toBe(false);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.hidden).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggleBtn);
  });

  it('supports ArrowDown and ArrowUp keyboard navigation through menu items', () => {
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');

    // ArrowDown on toggle button opens menu and focuses first item
    toggleBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(menu.hidden).toBe(false);
    expect(document.activeElement).toBe(items[0]);

    // ArrowDown moves to second item
    items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);

    // ArrowDown moves to third item
    items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);

    // ArrowDown wraps back to first item
    items[2]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);

    // ArrowUp wraps to last item
    items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
  });

  it('triggers item action on Enter keypress', () => {
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');

    toggleBtn.click();
    items[1]?.focus();
    items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onExportPng).toHaveBeenCalledTimes(1);
    expect(menu.hidden).toBe(true);
  });

  it('closes dropdown when focus moves outside the component (focusout)', () => {
    const toggleBtn = container.querySelector('.split-btn-toggle') as HTMLButtonElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;

    toggleBtn.click();
    expect(menu.hidden).toBe(false);

    const outsideBtn = document.createElement('button');
    document.body.appendChild(outsideBtn);

    const focusOutEvent = new FocusEvent('focusout', {
      bubbles: true,
      relatedTarget: outsideBtn,
    });
    splitButton.getElement().dispatchEvent(focusOutEvent);

    expect(menu.hidden).toBe(true);
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  });
});
