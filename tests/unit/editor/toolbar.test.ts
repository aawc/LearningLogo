import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TouchRibbon } from '../../../src/editor/toolbar.ts';
import { LogoEditor } from '../../../src/editor/editor.ts';

describe('Mobile Touch Ribbon Toolbar', () => {
  let container: HTMLElement;
  let editorContainer: HTMLElement;
  let editor: LogoEditor;

  beforeEach(() => {
    container = document.createElement('div');
    editorContainer = document.createElement('div');
    document.body.appendChild(container);
    document.body.appendChild(editorContainer);
    editor = new LogoEditor(editorContainer);
  });

  it('mounts virtual symbol buttons with accessible aria labels', () => {
    new TouchRibbon(container, editor);
    const buttons = container.querySelectorAll('button.ribbon-btn');

    expect(buttons.length).toBeGreaterThanOrEqual(10);
    for (const btn of buttons) {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
      expect(btn.classList.contains('ribbon-btn')).toBe(true);
    }
  });

  it('inserts symbol text at editor cursor on button click', () => {
    const spy = vi.spyOn(editor, 'insertAtCursor');
    new TouchRibbon(container, editor);

    const fdBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'FD'
    );
    expect(fdBtn).toBeDefined();
    fdBtn?.click();

    expect(spy).toHaveBeenCalledWith('FD 50 ');
  });

  it('inserts smart bracket pair and places cursor inside', () => {
    const spy = vi.spyOn(editor, 'insertAtCursor');
    new TouchRibbon(container, editor);

    const bracketPairBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '[ ]'
    );
    expect(bracketPairBtn).toBeDefined();
    bracketPairBtn?.click();

    expect(spy).toHaveBeenCalledWith('[  ]', 2);
  });

  it('supports arrow key navigation across ribbon buttons', () => {
    new TouchRibbon(container, editor);
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button.ribbon-btn'));
    expect(buttons.length).toBeGreaterThan(1);

    buttons[0]?.focus();
    buttons[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(buttons[1]);

    buttons[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
  });
});
