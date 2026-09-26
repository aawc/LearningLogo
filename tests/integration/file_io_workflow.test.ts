import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeApp, DEFAULT_STARTER_CODE } from '../../src/main.ts';

describe('Desktop File I/O Workflow Integration (Phase 1)', () => {
  let domContainer: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    domContainer = document.createElement('div');
    domContainer.innerHTML = `
      <div id="header-container"></div>
      <aside id="pwa-banner" role="status" aria-live="polite" aria-atomic="true" aria-label="Application updates"></aside>
      <div id="workspace-container">
        <div id="editor-pane">
          <div id="toolbar-container"></div>
          <div id="editor-container"></div>
          <div id="repl-container"></div>
        </div>
        <div id="canvas-pane">
          <div id="debugger-container"></div>
          <div id="canvas-container"></div>
        </div>
      </div>
    `;
    document.body.appendChild(domContainer);

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D);

    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'prompt').mockImplementation(() => null);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).showOpenFilePicker;
    delete (window as any).showSaveFilePicker;
    vi.restoreAllMocks();
  });

  it('mounts header buttons for New, Open, Save, and Save As', () => {
    initializeApp();

    const btnNew = document.querySelector('.btn-new') as HTMLButtonElement;
    const btnOpen = document.querySelector('.btn-open') as HTMLButtonElement;
    const btnSave = document.querySelector('.btn-save') as HTMLButtonElement;
    const btnSaveAs = document.querySelector('.btn-save-as') as HTMLButtonElement;

    expect(btnNew).not.toBeNull();
    expect(btnNew.textContent).toContain('New');

    expect(btnOpen).not.toBeNull();
    expect(btnOpen.textContent).toContain('Open');

    expect(btnSave).not.toBeNull();
    expect(btnSave.textContent).toContain('Save');

    expect(btnSaveAs).not.toBeNull();
    expect(btnSaveAs.textContent).toContain('Save As');
  });

  it('syncs document.title with activeFileName and dirty marker asterisk', () => {
    initializeApp();

    expect(document.title).toContain('Untitled.logo');
    expect(document.title).not.toContain('*');

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'FD 120 RT 60';
    textarea.dispatchEvent(new Event('input'));

    expect(document.title).toContain('*');
    expect(document.title).toContain('Untitled.logo');
  });

  it('triggers saveAs when btn-save-as is clicked', async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockHandle = {
      name: 'snowflake.logo',
      createWritable: vi.fn().mockResolvedValue(mockWritable),
    } as unknown as FileSystemFileHandle;

    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
    (window as any).showOpenFilePicker = vi.fn();

    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'REPEAT 6 [ FD 50 BK 50 RT 60 ]';
    textarea.dispatchEvent(new Event('input'));

    const btnSaveAs = document.querySelector('.btn-save-as') as HTMLButtonElement;
    expect(btnSaveAs).not.toBeNull();
    btnSaveAs.click();

    await new Promise((r) => setTimeout(r, 50));

    expect((window as any).showSaveFilePicker).toHaveBeenCalled();
    expect(mockWritable.write).toHaveBeenCalledWith('REPEAT 6 [ FD 50 BK 50 RT 60 ]');
    expect(document.title).toContain('snowflake.logo');
    expect(document.title).not.toContain('*');
  });

  it('prompts confirmation when opening file if editor is dirty, and respects cancellation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const mockHandle = {
      name: 'remote.logo',
      getFile: vi.fn(),
    };
    (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);
    (window as any).showSaveFilePicker = vi.fn();

    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'FD 999';
    textarea.dispatchEvent(new Event('input'));

    const btnOpen = document.querySelector('.btn-open') as HTMLButtonElement;
    btnOpen.click();

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));
    expect((window as any).showOpenFilePicker).not.toHaveBeenCalled();
  });

  it('executes openFile when confirmed and binds file handle', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const mockFile = new File(['CS REPEAT 4 [ FD 100 RT 90 ]'], 'square.logo', {
      type: 'text/plain',
    });
    const mockHandle = {
      name: 'square.logo',
      getFile: vi.fn().mockResolvedValue(mockFile),
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    };
    (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);
    (window as any).showSaveFilePicker = vi.fn();

    initializeApp();

    const btnOpen = document.querySelector('.btn-open') as HTMLButtonElement;
    btnOpen.click();

    await new Promise((r) => setTimeout(r, 50));

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    expect(textarea.value).toBe('CS REPEAT 4 [ FD 100 RT 90 ]');
    expect(document.title).toContain('square.logo');
    expect(document.title).not.toContain('*');
  });

  it('confirms discard and resets to DEFAULT_STARTER_CODE when btn-new is clicked', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'CUSTOM CODE';
    textarea.dispatchEvent(new Event('input'));

    const btnNew = document.querySelector('.btn-new') as HTMLButtonElement;
    btnNew.click();

    expect(confirmSpy).toHaveBeenCalled();
    expect(textarea.value).toBe(DEFAULT_STARTER_CODE);
    expect(document.title).toContain('Untitled.logo');
    expect(document.title).not.toContain('*');
  });

  it('handles Ctrl+Shift+S, Ctrl+O, and Ctrl+N keyboard shortcuts', async () => {
    initializeApp();

    const mockSaveAsHandle = {
      name: 'shortcut_test.logo',
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    };
    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue(mockSaveAsHandle);
    (window as any).showOpenFilePicker = vi.fn();

    // Ctrl+Shift+S (Save As)
    const saveAsEvent = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSaveAs = vi.spyOn(saveAsEvent, 'preventDefault');
    window.dispatchEvent(saveAsEvent);
    expect(preventDefaultSaveAs).toHaveBeenCalled();

    // Ctrl+O (Open)
    const openEvent = new KeyboardEvent('keydown', {
      key: 'o',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultOpen = vi.spyOn(openEvent, 'preventDefault');
    window.dispatchEvent(openEvent);
    expect(preventDefaultOpen).toHaveBeenCalled();

    // Ctrl+N (New)
    const newEvent = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultNew = vi.spyOn(newEvent, 'preventDefault');
    window.dispatchEvent(newEvent);
    expect(preventDefaultNew).toHaveBeenCalled();
  });

  it('loads file dropped onto the window via drag and drop', async () => {
    initializeApp();

    const droppedFile = new File(['FD 77 RT 77'], 'dropped_file.logo', { type: 'text/plain' });
    const mockHandle = {
      kind: 'file',
      name: 'dropped_file.logo',
      getFile: vi.fn().mockResolvedValue(droppedFile),
    };

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as any;
    dropEvent.dataTransfer = {
      items: [
        {
          kind: 'file',
          getAsFileSystemHandle: vi.fn().mockResolvedValue(mockHandle),
          getAsFile: () => droppedFile,
        },
      ],
      files: [droppedFile],
    };

    window.dispatchEvent(dropEvent);

    await new Promise((r) => setTimeout(r, 50));

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    expect(textarea.value).toBe('FD 77 RT 77');
    expect(document.title).toContain('dropped_file.logo');
  });

  it('prompts beforeunload warning when changes are unsaved', () => {
    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'FD 100';
    textarea.dispatchEvent(new Event('input'));

    const beforeUnloadEvent = new Event('beforeunload', { bubbles: true, cancelable: true }) as any;
    const preventDefaultSpy = vi.spyOn(beforeUnloadEvent, 'preventDefault');

    window.dispatchEvent(beforeUnloadEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('probes desktop API and loads activeFile passed via command-line argument', async () => {
    const originalFetch = window.fetch;
    window.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ activeFile: '/path/to/cli_diagram.logo' }),
        });
      }
      if (url.startsWith('/api/file')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('REPEAT 36 [ FD 10 RT 10 ]'),
        });
      }
      return Promise.resolve({ ok: false });
    });

    initializeApp();

    await new Promise((r) => setTimeout(r, 50));

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    expect(textarea.value).toBe('REPEAT 36 [ FD 10 RT 10 ]');
    expect(document.title).toContain('cli_diagram.logo');
    expect(document.title).not.toContain('*');

    window.fetch = originalFetch;
  });
});
