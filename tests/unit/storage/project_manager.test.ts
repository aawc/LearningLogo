import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ProjectManager } from '../../../src/storage/project_manager.ts';
import { LocalStore } from '../../../src/storage/local_store.ts';
import { createProject } from '../../../src/storage/project.ts';

describe('ProjectManager State Management (Requirement 1 - Core)', () => {
  let store: LocalStore;
  let currentCode: string;
  let setCodeFn: Mock<(code: string) => void>;
  let manager: ProjectManager;

  beforeEach(() => {
    localStorage.clear();
    store = new LocalStore();
    currentCode = 'FD 100 RT 90';
    setCodeFn = vi.fn();

    manager = new ProjectManager({
      store,
      getCurrentCode: () => currentCode,
      setCode: setCodeFn,
    });
  });

  it('initializes with default untitled state and not dirty', () => {
    expect(manager.getActiveProjectId()).toBeNull();
    expect(manager.getActiveProjectName()).toBe('Untitled Project');
    expect(manager.getActiveFileHandle()).toBeNull();
    expect(manager.getIsDirty()).toBe(false);
  });

  it('updates dirty state and notifies subscribers on markDirty', () => {
    const subscriber = vi.fn();
    const unsub = manager.onStateChange(subscriber);

    manager.markDirty(true);
    expect(manager.getIsDirty()).toBe(true);
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({ isDirty: true })
    );

    manager.markDirty(false);
    expect(manager.getIsDirty()).toBe(false);
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({ isDirty: false })
    );

    unsub();
    manager.markDirty(true);
    expect(subscriber).toHaveBeenCalledTimes(2);
  });

  it('saves new project to store and binds activeProjectId on first save', async () => {
    currentCode = 'REPEAT 4 [ FD 50 RT 90 ]';
    manager.renameProject('Square Drawing');

    await manager.save();

    const activeId = manager.getActiveProjectId();
    expect(activeId).not.toBeNull();
    expect(manager.getIsDirty()).toBe(false);

    const saved = store.getProject(activeId!);
    expect(saved).not.toBeNull();
    expect(saved?.name).toBe('Square Drawing');
    expect(saved?.code).toBe('REPEAT 4 [ FD 50 RT 90 ]');
    expect(store.listProjects()).toHaveLength(1);
  });

  it('overwrites active project in-place without creating duplicate projects', async () => {
    await manager.save();
    const initialId = manager.getActiveProjectId();
    expect(store.listProjects()).toHaveLength(1);

    // Modify code and save again
    currentCode = 'CIRCLE 50';
    manager.markDirty(true);
    await manager.save();

    expect(manager.getActiveProjectId()).toBe(initialId);
    expect(manager.getIsDirty()).toBe(false);
    expect(store.listProjects()).toHaveLength(1);

    const updated = store.getProject(initialId!);
    expect(updated?.code).toBe('CIRCLE 50');
  });

  it('saves directly to active file handle when handle is present', async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockHandle = {
      name: 'disk_program.logo',
      createWritable: vi.fn().mockResolvedValue(mockWritable),
    } as unknown as FileSystemFileHandle;

    manager.setActiveFileHandle(mockHandle, 'disk_program');
    expect(manager.getActiveFileHandle()).toBe(mockHandle);
    expect(manager.getActiveProjectName()).toBe('disk_program');

    currentCode = 'FD 200';
    manager.markDirty(true);
    await manager.save();

    expect(mockHandle.createWritable).toHaveBeenCalled();
    expect(mockWritable.write).toHaveBeenCalledWith('FD 200');
    expect(mockWritable.close).toHaveBeenCalled();
    expect(manager.getIsDirty()).toBe(false);
    // Did not create unnecessary store projects
    expect(store.listProjects()).toHaveLength(0);
  });

  it('creates a new copy with saveAs and updates active project', async () => {
    await manager.save();
    const firstId = manager.getActiveProjectId();

    currentCode = 'NEW CODE';
    const newProj = await manager.saveAs('Branch Project');

    expect(newProj.name).toBe('Branch Project');
    expect(manager.getActiveProjectId()).toBe(newProj.id);
    expect(manager.getActiveProjectName()).toBe('Branch Project');
    expect(store.listProjects()).toHaveLength(2);
    expect(store.getProject(firstId!)?.code).not.toBe('NEW CODE');
    expect(store.getProject(newProj.id)?.code).toBe('NEW CODE');
  });

  it('renames active project and persists change to store', () => {
    const proj = createProject('Initial Name', 'CS');
    store.saveProject(proj);
    manager.loadProject(proj);

    manager.renameProject('Updated Name');
    expect(manager.getActiveProjectName()).toBe('Updated Name');

    const updated = store.getProject(proj.id);
    expect(updated?.name).toBe('Updated Name');
  });

  it('duplicates existing project in store with (Copy) suffix', () => {
    const proj = createProject('Pattern', 'REPEAT 8 [ FD 20 RT 45 ]');
    store.saveProject(proj);

    const duplicate = manager.duplicateProject(proj.id);
    expect(duplicate).not.toBeNull();
    expect(duplicate?.name).toBe('Pattern (Copy)');
    expect(duplicate?.code).toBe(proj.code);
    expect(duplicate?.id).not.toBe(proj.id);
    expect(store.listProjects()).toHaveLength(2);
  });

  it('deletes project from store and resets active state if active project was deleted', () => {
    const proj1 = createProject('P1', 'FD 10');
    const proj2 = createProject('P2', 'FD 20');
    store.saveProject(proj1);
    store.saveProject(proj2);

    manager.loadProject(proj1);
    expect(manager.getActiveProjectId()).toBe(proj1.id);

    // Deleting unrelated project does not reset active state
    manager.deleteProject(proj2.id);
    expect(store.listProjects()).toHaveLength(1);
    expect(manager.getActiveProjectId()).toBe(proj1.id);

    // Deleting active project resets to new untitled project
    manager.deleteProject(proj1.id);
    expect(store.listProjects()).toHaveLength(0);
    expect(manager.getActiveProjectId()).toBeNull();
    expect(manager.getActiveProjectName()).toBe('Untitled Project');
  });

  it('loads project and updates editor code', () => {
    const proj = createProject('Spiral', 'REPEAT 100 [ FD 5 RT 10 ]');
    store.saveProject(proj);

    manager.loadProject(proj);
    expect(manager.getActiveProjectId()).toBe(proj.id);
    expect(manager.getActiveProjectName()).toBe('Spiral');
    expect(setCodeFn).toHaveBeenCalledWith(proj.code);
    expect(manager.getIsDirty()).toBe(false);
  });

  it('resets to new project with newProject()', () => {
    const proj = createProject('Old Project', 'FD 10');
    store.saveProject(proj);
    manager.loadProject(proj);
    manager.markDirty(true);

    manager.newProject('Fresh Start');
    expect(manager.getActiveProjectId()).toBeNull();
    expect(manager.getActiveProjectName()).toBe('Fresh Start');
    expect(manager.getActiveFileHandle()).toBeNull();
    expect(manager.getIsDirty()).toBe(false);
  });
});
