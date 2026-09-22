import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogoEditor } from '../../../src/editor/editor.ts';

describe('Twin-Layer Interactive Editor Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('scaffolds gutter, backdrop, and textarea into container', () => {
    new LogoEditor(container);
    expect(container.querySelector('.editor-wrapper')).not.toBeNull();
    expect(container.querySelector('.line-gutter')).not.toBeNull();
    expect(container.querySelector('.backdrop')).not.toBeNull();
    expect(container.querySelector('.input-layer')).not.toBeNull();
  });

  it('updates text value, line gutter numbers, and syntax backdrop', () => {
    const editor = new LogoEditor(container);
    editor.setValue('FD 100\nRT 90\nFD 50');

    expect(editor.getValue()).toBe('FD 100\nRT 90\nFD 50');

    const gutterLines = container.querySelectorAll('.gutter-line');
    expect(gutterLines.length).toBe(3);
    expect(gutterLines[0]?.textContent).toBe('1');
    expect(gutterLines[1]?.textContent).toBe('2');
    expect(gutterLines[2]?.textContent).toBe('3');

    const backdrop = container.querySelector('.highlight-layer');
    expect(backdrop?.innerHTML).toContain('hl-command');
  });

  it('triggers change callback on input', () => {
    const editor = new LogoEditor(container);
    const onChange = vi.fn();
    editor.setOnChange(onChange);

    const textarea = container.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'CS';
    textarea.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('CS');
  });

  it('synchronizes scroll from textarea to backdrop and gutter', () => {
    new LogoEditor(container);
    const textarea = container.querySelector('.input-layer') as HTMLTextAreaElement;
    const backdrop = container.querySelector('.backdrop') as HTMLElement;
    const gutter = container.querySelector('.line-gutter') as HTMLElement;

    textarea.scrollTop = 120;
    textarea.dispatchEvent(new Event('scroll'));

    expect(backdrop.scrollTop).toBe(120);
    expect(gutter.scrollTop).toBe(120);
  });

  it('highlights and clears execution line in gutter and backdrop', () => {
    const editor = new LogoEditor(container);
    editor.setValue('FD 100\nRT 90\nFD 50');

    editor.highlightExecutionLine(2);
    expect(container.querySelector('.line-active')?.textContent).toBe('2');

    editor.clearExecutionHighlight();
    expect(container.querySelector('.line-active')).toBeNull();
  });

  it('inserts text at cursor with offset', () => {
    const editor = new LogoEditor(container);
    editor.setValue('FD 100 ');

    const textarea = container.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.setSelectionRange(7, 7);

    editor.insertAtCursor('RT 90');
    expect(editor.getValue()).toBe('FD 100 RT 90');
  });

  it('uses setRangeText to preserve native undo stack during insertAtCursor', () => {
    const editor = new LogoEditor(container);
    editor.setValue('FD 100 ');

    const textarea = container.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.setSelectionRange(7, 7);

    // Mock setRangeText on textarea
    textarea.setRangeText = vi.fn(function (
      this: HTMLTextAreaElement,
      replacement: string,
      start?: number,
      end?: number
    ) {
      const s = start ?? this.selectionStart;
      const e = end ?? this.selectionEnd;
      this.value = this.value.substring(0, s) + replacement + this.value.substring(e);
      this.setSelectionRange(s + replacement.length, s + replacement.length);
    });

    editor.insertAtCursor('RT 90');
    expect(textarea.setRangeText).toHaveBeenCalledWith('RT 90', 7, 7, 'end');
    expect(editor.getValue()).toBe('FD 100 RT 90');
  });
});
