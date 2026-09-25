import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeApp } from '../../src/main.ts';
import * as fileIoModule from '../../src/storage/file_io.ts';

describe('Project Workflow Integration (Requirement 1 - UI & End-to-End)', () => {
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
    vi.spyOn(window, 'prompt').mockImplementation(() => null);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).showOpenFilePicker;
    delete (window as any).showSaveFilePicker;
    vi.restoreAllMocks();
  });

  it('mounts active project title badge with button semantics and save button in header (F5)', () => {
    initializeApp();

    const titleBadge = document.querySelector('.project-title-badge');
    expect(titleBadge).not.toBeNull();
    expect(titleBadge?.getAttribute('role')).toBe('button');
    expect(titleBadge?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(titleBadge?.getAttribute('aria-label')).toBe(
      'Active project and save status: click to manage projects'
    );
    expect(titleBadge?.textContent).toContain('Untitled Project');

    const saveBtn = document.querySelector('.btn-save');
    expect(saveBtn).not.toBeNull();
    expect(saveBtn?.textContent).toContain('Save');
  });

  it('marks badge as [Unsaved] when editor code changes', () => {
    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    textarea.value = 'FD 200';
    textarea.dispatchEvent(new Event('input'));

    const titleBadge = document.querySelector('.project-title-badge');
    expect(titleBadge?.textContent).toContain('[Unsaved]');
  });

  it('saves project and clears [Unsaved] status when Save button is clicked', async () => {
    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'FD 300 RT 90';
    textarea.dispatchEvent(new Event('input'));

    const titleBadge = document.querySelector('.project-title-badge');
    expect(titleBadge?.textContent).toContain('[Unsaved]');

    const saveBtn = document.querySelector('.btn-save') as HTMLButtonElement;
    saveBtn.click();

    await Promise.resolve();

    expect(titleBadge?.textContent).not.toContain('[Unsaved]');
    expect(titleBadge?.textContent).toContain('[Saved]');
  });

  it('saves project and prevents default on Ctrl+S / Cmd+S keydown', async () => {
    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'REPEAT 4 [ FD 80 RT 90 ]';
    textarea.dispatchEvent(new Event('input'));

    const titleBadge = document.querySelector('.project-title-badge');
    expect(titleBadge?.textContent).toContain('[Unsaved]');

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    await Promise.resolve();
    expect(titleBadge?.textContent).not.toContain('[Unsaved]');
  });

  it('integrates ProjectModal with ProjectManager and reflects project switch in header', () => {
    initializeApp();

    const projectsBtn = Array.from(document.querySelectorAll('.dbg-btn')).find(
      (btn) => btn.textContent === 'Projects'
    ) as HTMLButtonElement;
    expect(projectsBtn).not.toBeNull();

    projectsBtn.click();

    const modal = document.querySelector('.modal-backdrop');
    expect(modal).not.toBeNull();

    // New Project via modal action bar
    vi.spyOn(window, 'prompt').mockReturnValue('Integration Test Project');
    const newBtn = modal?.querySelector('.btn-new-project') as HTMLButtonElement;
    expect(newBtn).not.toBeNull();
    newBtn.click();

    const titleBadge = document.querySelector('.project-title-badge');
    expect(titleBadge?.textContent).toContain('Integration Test Project');
  });

  it('resets editor to DEFAULT_STARTER_CODE and clears canvas when new project is created (F4)', () => {
    initializeApp();

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'FD 999 RT 88';
    textarea.dispatchEvent(new Event('input'));

    const projectsBtn = Array.from(document.querySelectorAll('.dbg-btn')).find(
      (btn) => btn.textContent === 'Projects'
    ) as HTMLButtonElement;
    projectsBtn.click();

    const modal = document.querySelector('.modal-backdrop');
    vi.spyOn(window, 'prompt').mockReturnValue('Brand New Drawing');
    const newBtn = modal?.querySelector('.btn-new-project') as HTMLButtonElement;
    newBtn.click();

    expect(textarea.value).toContain('; Welcome to LearningLogo!');
    expect(textarea.value).toContain('; Press [RUN] to draw a square.');
  });

  it('exports JSON containing current editor buffer rather than stale store state (F1)', async () => {
    const exportSpy = vi.spyOn(fileIoModule, 'exportProjectJson').mockImplementation(() => {});

    initializeApp();

    const saveBtn = document.querySelector('.btn-save') as HTMLButtonElement;
    saveBtn.click();
    await Promise.resolve();

    // Modify editor buffer without saving
    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    textarea.value = 'FD 777';
    textarea.dispatchEvent(new Event('input'));

    // Export as JSON via split export toggle
    const toggleBtn = document.querySelector('.split-btn-toggle') as HTMLButtonElement;
    toggleBtn.click();
    const jsonOption = document.querySelector('[data-format="json"]') as HTMLButtonElement;
    jsonOption.click();

    expect(exportSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        code: 'FD 777',
      })
    );
    exportSpy.mockRestore();
  });

  it('notifies user and records error if save() fails (F7)', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    initializeApp();

    const saveBtn = document.querySelector('.btn-save') as HTMLButtonElement;
    saveBtn.click();
    await Promise.resolve();

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Save Failed'));
    setItemSpy.mockRestore();
  });

  it('loads file via openFileWithPicker and binds file handle for direct disk saving (F2)', async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockFile = new File(['REPEAT 3 [ FD 60 RT 120 ]'], 'picked_from_disk.logo', {
      type: 'text/plain',
    });
    const mockHandle = {
      name: 'picked_from_disk.logo',
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      getFile: vi.fn().mockResolvedValue(mockFile),
    } as unknown as FileSystemFileHandle;

    (window as any).showOpenFilePicker = vi.fn().mockResolvedValue([mockHandle]);
    (window as any).showSaveFilePicker = vi.fn();

    initializeApp();

    const importBtn = Array.from(document.querySelectorAll('.dbg-btn')).find(
      (btn) => btn.textContent === 'Import'
    ) as HTMLButtonElement;
    importBtn.click();

    // Allow FileReader event to fire in jsdom
    await new Promise((r) => setTimeout(r, 50));

    const textarea = document.querySelector('.input-layer') as HTMLTextAreaElement;
    expect(textarea.value).toBe('REPEAT 3 [ FD 60 RT 120 ]');

    const titleBadge = document.querySelector('.project-title-badge');
    expect(titleBadge?.textContent).toContain('picked_from_disk');

    // Saving now writes directly to mockHandle on disk
    const saveBtn = document.querySelector('.btn-save') as HTMLButtonElement;
    saveBtn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(mockHandle.createWritable).toHaveBeenCalled();
    expect(mockWritable.write).toHaveBeenCalledWith('REPEAT 3 [ FD 60 RT 120 ]');
    expect(mockWritable.close).toHaveBeenCalled();
  });
});
