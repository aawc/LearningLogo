import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { ProjectModal } from '../../../src/storage/project_modal.ts';
import { ProjectManager } from '../../../src/storage/project_manager.ts';
import { LocalStore } from '../../../src/storage/local_store.ts';
import { createProject, type Project } from '../../../src/storage/project.ts';

describe('Enhanced ProjectModal (Requirement 1 - UI)', () => {
  let store: LocalStore;
  let currentCode: string;
  let manager: ProjectManager;
  let modal: ProjectModal;
  let onImportFileSpy: Mock<() => void>;
  let onExportProjectSpy: Mock<(project: Project) => void>;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    store = new LocalStore();
    currentCode = 'FD 100 RT 90';

    manager = new ProjectManager({
      store,
      getCurrentCode: () => currentCode,
      setCode: (code) => {
        currentCode = code;
      },
      initialProjectName: 'Active Project',
    });

    onImportFileSpy = vi.fn();
    onExportProjectSpy = vi.fn();

    modal = new ProjectModal(manager, undefined, {
      onImportFile: onImportFileSpy,
      onExportProject: onExportProjectSpy,
    });
  });

  afterEach(() => {
    modal.close();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders modal dialog with action bar and close button', () => {
    modal.open();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const actionBar = document.querySelector('.modal-actions-bar');
    expect(actionBar).not.toBeNull();

    const newBtn = actionBar?.querySelector('.btn-new-project');
    const importBtn = actionBar?.querySelector('.btn-import-project');
    const saveAsBtn = actionBar?.querySelector('.btn-save-as-project');

    expect(newBtn).not.toBeNull();
    expect(newBtn?.textContent).toContain('New Project');
    expect(importBtn).not.toBeNull();
    expect(importBtn?.textContent).toContain('Import File');
    expect(saveAsBtn).not.toBeNull();
    expect(saveAsBtn?.textContent).toContain('Save As New');
  });

  it('triggers onImportFile when Import File button is clicked', () => {
    modal.open();
    const importBtn = document.querySelector('.btn-import-project') as HTMLButtonElement;
    importBtn.click();

    expect(onImportFileSpy).toHaveBeenCalledTimes(1);
  });

  it('creates a new project when New Project action button is clicked', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('My New Project');
    modal.open();

    const newBtn = document.querySelector('.btn-new-project') as HTMLButtonElement;
    newBtn.click();

    expect(manager.getActiveProjectName()).toBe('My New Project');
    expect(manager.getActiveProjectId()).toBeNull();
  });

  it('saves current code as new project when Save As New action button is clicked', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Archived Drawing');
    modal.open();

    const saveAsBtn = document.querySelector('.btn-save-as-project') as HTMLButtonElement;
    await saveAsBtn.click();

    const projects = store.listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.name).toBe('Archived Drawing');
    expect(manager.getActiveProjectName()).toBe('Archived Drawing');
  });

  it('displays [Current] badge only on the actively loaded project', () => {
    const p1 = createProject('First Project', 'FD 50');
    const p2 = createProject('Second Project', 'RT 45');
    store.saveProject(p1);
    store.saveProject(p2);

    manager.loadProject(p2);
    modal.open();

    const items = document.querySelectorAll('.project-item');
    expect(items.length).toBe(2);

    const p2Item = Array.from(items).find((el) => el.textContent?.includes('Second Project'));
    const p1Item = Array.from(items).find((el) => el.textContent?.includes('First Project'));

    expect(p2Item?.querySelector('.badge-current')).not.toBeNull();
    expect(p2Item?.querySelector('.badge-current')?.textContent).toBe('[Current]');
    expect(p1Item?.querySelector('.badge-current')).toBeNull();
  });

  it('renders per-item action buttons: Open, Rename, Duplicate, Export, Delete', () => {
    const p1 = createProject('Star Pattern', 'REPEAT 5 [ FD 50 RT 144 ]');
    store.saveProject(p1);
    modal.open();

    const item = document.querySelector('.project-item') as HTMLElement;
    expect(item).not.toBeNull();

    const actions = item.querySelector('.project-actions');
    expect(actions?.querySelector('.btn-proj-open')).not.toBeNull();
    expect(actions?.querySelector('.btn-proj-rename')).not.toBeNull();
    expect(actions?.querySelector('.btn-proj-duplicate')).not.toBeNull();
    expect(actions?.querySelector('.btn-proj-export')).not.toBeNull();
    expect(actions?.querySelector('.btn-proj-delete')).not.toBeNull();
  });

  it('opens project and closes modal when Open button is clicked', () => {
    const p1 = createProject('Star Pattern', 'REPEAT 5 [ FD 50 RT 144 ]');
    store.saveProject(p1);
    modal.open();

    const openBtn = document.querySelector('.btn-proj-open') as HTMLButtonElement;
    openBtn.click();

    expect(manager.getActiveProjectId()).toBe(p1.id);
    expect(manager.getActiveProjectName()).toBe('Star Pattern');
    expect(currentCode).toBe(p1.code);
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('renames project when Rename button is clicked', () => {
    const p1 = createProject('Old Name', 'FD 100');
    store.saveProject(p1);
    vi.spyOn(window, 'prompt').mockReturnValue('Brand New Name');

    modal.open();
    const renameBtn = document.querySelector('.btn-proj-rename') as HTMLButtonElement;
    renameBtn.click();

    const updated = store.getProject(p1.id);
    expect(updated?.name).toBe('Brand New Name');
    expect(document.querySelector('.project-title')?.textContent).toContain('Brand New Name');
  });

  it('duplicates project when Duplicate button is clicked', () => {
    const p1 = createProject('Spiral', 'REPEAT 36 [ FD 5 RT 10 ]');
    store.saveProject(p1);

    modal.open();
    const dupBtn = document.querySelector('.btn-proj-duplicate') as HTMLButtonElement;
    dupBtn.click();

    expect(store.listProjects()).toHaveLength(2);
    const items = document.querySelectorAll('.project-item');
    expect(items.length).toBe(2);
    expect(document.body.textContent).toContain('Spiral (Copy)');
  });

  it('exports project when Export button is clicked', () => {
    const p1 = createProject('Exportable', 'FD 30');
    store.saveProject(p1);

    modal.open();
    const exportBtn = document.querySelector('.btn-proj-export') as HTMLButtonElement;
    exportBtn.click();

    expect(onExportProjectSpy).toHaveBeenCalledWith(p1);
  });

  it('deletes project after user confirmation when Delete button is clicked', () => {
    const p1 = createProject('To Delete', 'FD 20');
    store.saveProject(p1);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    modal.open();
    const delBtn = document.querySelector('.btn-proj-delete') as HTMLButtonElement;
    delBtn.click();

    expect(store.listProjects()).toHaveLength(0);
    expect(document.querySelectorAll('.project-item')).toHaveLength(0);
    expect(document.querySelector('.var-empty')).not.toBeNull();
  });

  it('closes modal when Escape key is pressed (F3)', () => {
    modal.open();
    expect(document.querySelector('.modal-backdrop')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('closes modal when clicking on backdrop, but stays open when clicking card (F3)', () => {
    modal.open();
    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement;
    const card = document.querySelector('.modal-card') as HTMLElement;
    expect(backdrop).not.toBeNull();

    // Clicking card does not close modal
    card.click();
    expect(document.querySelector('.modal-backdrop')).not.toBeNull();

    // Clicking backdrop directly closes modal
    backdrop.click();
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('invokes onNewProject callback when creating new project (F4)', () => {
    const onNewProjectSpy = vi.fn();
    const customModal = new ProjectModal(manager, undefined, {
      onNewProject: onNewProjectSpy,
    });

    vi.spyOn(window, 'prompt').mockReturnValue('Fractal Tree');
    customModal.open();

    const newBtn = document.querySelector('.btn-new-project') as HTMLButtonElement;
    newBtn.click();

    expect(onNewProjectSpy).toHaveBeenCalledWith('Fractal Tree');
    customModal.close();
  });

  it('sets descriptive, unique aria-label on per-item action buttons referencing project name (F6)', () => {
    const p = createProject('Geometrics', 'REPEAT 3 [ FD 100 RT 120 ]');
    store.saveProject(p);

    modal.open();

    const openBtn = document.querySelector('.btn-proj-open') as HTMLButtonElement;
    const renameBtn = document.querySelector('.btn-proj-rename') as HTMLButtonElement;
    const dupBtn = document.querySelector('.btn-proj-duplicate') as HTMLButtonElement;
    const exportBtn = document.querySelector('.btn-proj-export') as HTMLButtonElement;
    const delBtn = document.querySelector('.btn-proj-delete') as HTMLButtonElement;

    expect(openBtn.getAttribute('aria-label')).toBe('Open project "Geometrics"');
    expect(renameBtn.getAttribute('aria-label')).toBe('Rename project "Geometrics"');
    expect(dupBtn.getAttribute('aria-label')).toBe('Duplicate project "Geometrics"');
    expect(exportBtn.getAttribute('aria-label')).toBe('Export project "Geometrics"');
    expect(delBtn.getAttribute('aria-label')).toBe('Delete project "Geometrics"');
  });

  it('confirms discarding unsaved changes before creating new project when dirty', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    manager.markDirty(true);
    modal.open();

    const newBtn = document.querySelector('.btn-new-project') as HTMLButtonElement;
    newBtn.click();

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));
    expect(manager.getActiveProjectName()).toBe('Active Project');
  });

  it('confirms discarding unsaved changes before loading another project when dirty', () => {
    const p = createProject('Geometrics', 'REPEAT 3 [ FD 100 RT 120 ]');
    store.saveProject(p);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    manager.markDirty(true);
    modal.open();

    const openBtn = document.querySelector('.btn-proj-open') as HTMLButtonElement;
    openBtn.click();

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));
    expect(manager.getActiveProjectId()).not.toBe(p.id);
  });
});
