import { describe, it, expect, beforeEach } from 'vitest';
import { SplitLayout } from '../../src/ui/layout.ts';

describe('Responsive Split-Pane Layout Integration', () => {
  let workspace: HTMLElement;
  let editorPane: HTMLElement;
  let canvasPane: HTMLElement;

  beforeEach(() => {
    workspace = document.createElement('div');
    editorPane = document.createElement('div');
    canvasPane = document.createElement('div');
    workspace.appendChild(editorPane);
    workspace.appendChild(canvasPane);
    document.body.appendChild(workspace);
  });

  it('configures side-by-side mode on desktop viewports (>= 768px)', () => {
    window.innerWidth = 1024;
    const layout = new SplitLayout(editorPane, canvasPane, workspace);

    expect(layout.isStacked()).toBe(false);
    expect(workspace.classList.contains('workspace-side-by-side')).toBe(true);
    const splitter = workspace.querySelector('#pane-splitter');
    expect(splitter).not.toBeNull();
    expect(splitter?.getAttribute('role')).toBe('separator');
    expect(editorPane.style.flex).toBe('0 0 50%');
  });

  it('configures stacked mode on mobile viewports (< 768px)', () => {
    window.innerWidth = 500;
    const layout = new SplitLayout(editorPane, canvasPane, workspace);

    expect(layout.isStacked()).toBe(true);
    expect(workspace.classList.contains('workspace-stacked')).toBe(true);
    expect(editorPane.style.flex).toBe('');
    expect(canvasPane.style.flex).toBe('');
  });

  it('preserves existing #pane-splitter element without duplicating it', () => {
    window.innerWidth = 1024;
    const preExistingSplitter = document.createElement('div');
    preExistingSplitter.id = 'pane-splitter';
    workspace.insertBefore(preExistingSplitter, canvasPane);

    const layout = new SplitLayout(editorPane, canvasPane, workspace, preExistingSplitter);
    expect(layout.getSplitter()).toBe(preExistingSplitter);
    expect(workspace.querySelectorAll('#pane-splitter').length).toBe(1);
  });
});
