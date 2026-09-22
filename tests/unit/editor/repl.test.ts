import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplConsole } from '../../../src/editor/repl.ts';

describe('Immediate Command REPL Console', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders prompt indicator and input element', () => {
    new ReplConsole(container);
    expect(container.querySelector('.repl-prompt')?.textContent).toBe('?');
    expect(container.querySelector('.repl-input')).not.toBeNull();
  });

  it('submits command on Enter, invokes callback, and clears input', () => {
    const repl = new ReplConsole(container);
    const onExecute = vi.fn();
    repl.setOnExecute(onExecute);

    const input = container.querySelector('.repl-input') as HTMLInputElement;
    input.value = 'FD 100';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onExecute).toHaveBeenCalledWith('FD 100');
    expect(input.value).toBe('');
  });

  it('navigates command history using ArrowUp and ArrowDown', () => {
    const repl = new ReplConsole(container);
    repl.setOnExecute(vi.fn());

    const input = container.querySelector('.repl-input') as HTMLInputElement;

    input.value = 'FD 50';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    input.value = 'RT 90';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    // ArrowUp once -> 'RT 90'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(input.value).toBe('RT 90');

    // ArrowUp twice -> 'FD 50'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(input.value).toBe('FD 50');

    // ArrowDown -> 'RT 90'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(input.value).toBe('RT 90');

    // ArrowDown past end -> empty buffer
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(input.value).toBe('');
  });

  it('ignores empty input submissions', () => {
    const repl = new ReplConsole(container);
    const onExecute = vi.fn();
    repl.setOnExecute(onExecute);

    const input = container.querySelector('.repl-input') as HTMLInputElement;
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onExecute).not.toHaveBeenCalled();
  });
});
