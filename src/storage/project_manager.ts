import type { LocalStore } from './local_store.ts';
import type { Project } from './project.ts';
import { createProject } from './project.ts';
import { writeToFileHandle } from './file_system.ts';

export interface ProjectState {
  activeProjectId: string | null;
  activeProjectName: string;
  activeFileHandle: FileSystemFileHandle | null;
  isDirty: boolean;
}

export interface ProjectManagerOptions {
  store: LocalStore;
  getCurrentCode: () => string;
  setCode: (code: string) => void;
  initialProjectName?: string;
}

export class ProjectManager {
  private readonly store: LocalStore;
  private readonly getCurrentCode: () => string;
  private readonly setCode: (code: string) => void;

  private activeProjectId: string | null = null;
  private activeProjectName: string = 'Untitled Project';
  private activeFileHandle: FileSystemFileHandle | null = null;
  private isDirty: boolean = false;

  private readonly listeners: Set<(state: ProjectState) => void> = new Set();

  constructor(options: ProjectManagerOptions) {
    this.store = options.store;
    this.getCurrentCode = options.getCurrentCode;
    this.setCode = options.setCode;

    if (options.initialProjectName) {
      this.activeProjectName = options.initialProjectName;
    }
  }

  public getStore(): LocalStore {
    return this.store;
  }

  public listProjects(): Project[] {
    return this.store.listProjects();
  }

  public getProject(id: string): Project | null {
    return this.store.getProject(id);
  }

  public getActiveProjectId(): string | null {
    return this.activeProjectId;
  }

  public getActiveProjectName(): string {
    return this.activeProjectName;
  }

  public getActiveFileHandle(): FileSystemFileHandle | null {
    return this.activeFileHandle;
  }

  public getIsDirty(): boolean {
    return this.isDirty;
  }

  public getState(): ProjectState {
    return {
      activeProjectId: this.activeProjectId,
      activeProjectName: this.activeProjectName,
      activeFileHandle: this.activeFileHandle,
      isDirty: this.isDirty,
    };
  }

  public onStateChange(listener: (state: ProjectState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  public markDirty(dirty: boolean = true): void {
    if (this.isDirty !== dirty) {
      this.isDirty = dirty;
      this.emitChange();
    }
  }

  public setActiveFileHandle(handle: FileSystemFileHandle | null, name?: string): void {
    this.activeFileHandle = handle;
    this.activeProjectId = null;
    if (name) {
      this.activeProjectName = name;
    } else if (handle?.name) {
      this.activeProjectName = handle.name.replace(/\.(logo|json)$/i, '');
    }
    this.emitChange();
  }

  public newProject(name?: string, initialCode?: string): void {
    this.activeProjectId = null;
    this.activeProjectName = name?.trim() || 'Untitled Project';
    this.activeFileHandle = null;
    this.isDirty = false;
    if (initialCode !== undefined) {
      this.setCode(initialCode);
    }
    this.emitChange();
  }

  public async save(): Promise<boolean> {
    const code = this.getCurrentCode();

    if (this.activeFileHandle) {
      await writeToFileHandle(this.activeFileHandle, code);
      this.isDirty = false;
      this.emitChange();
      return true;
    }

    if (this.activeProjectId) {
      const existing = this.store.getProject(this.activeProjectId);
      let success: boolean;
      if (existing) {
        existing.code = code;
        existing.name = this.activeProjectName;
        existing.updatedAt = Date.now();
        success = this.store.saveProject(existing);
      } else {
        const newProj = createProject(this.activeProjectName, code);
        newProj.id = this.activeProjectId;
        success = this.store.saveProject(newProj);
      }
      if (!success) {
        throw new Error('Storage quota exceeded or storage unavailable');
      }
      this.isDirty = false;
      this.emitChange();
      return true;
    }

    // No existing ID or file handle -> save as new project in store
    const created = createProject(this.activeProjectName, code);
    const success = this.store.saveProject(created);
    if (!success) {
      throw new Error('Storage quota exceeded or storage unavailable');
    }
    this.activeProjectId = created.id;
    this.activeProjectName = created.name;
    this.isDirty = false;
    this.emitChange();
    return true;
  }

  public async saveAs(name?: string): Promise<Project> {
    const code = this.getCurrentCode();
    const projName = name?.trim() || this.activeProjectName;
    const project = createProject(projName, code);
    const success = this.store.saveProject(project);
    if (!success) {
      throw new Error('Storage quota exceeded or storage unavailable');
    }

    this.activeProjectId = project.id;
    this.activeProjectName = project.name;
    this.activeFileHandle = null;
    this.isDirty = false;
    this.emitChange();
    return project;
  }

  public renameProject(newName: string): void {
    this.activeProjectName = newName.trim() || 'Untitled Project';

    if (this.activeProjectId) {
      const proj = this.store.getProject(this.activeProjectId);
      if (proj) {
        proj.name = this.activeProjectName;
        proj.updatedAt = Date.now();
        this.store.saveProject(proj);
      }
    }

    this.emitChange();
  }

  public duplicateProject(id: string): Project | null {
    const original = this.store.getProject(id);
    if (!original) return null;

    const copy = createProject(`${original.name} (Copy)`, original.code);
    this.store.saveProject(copy);
    return copy;
  }

  public deleteProject(id: string): void {
    this.store.deleteProject(id);
    if (this.activeProjectId === id) {
      this.activeProjectId = null;
      this.activeProjectName = 'Untitled Project';
      this.activeFileHandle = null;
      this.isDirty = false;
    }
    this.emitChange();
  }

  public loadProject(project: Project): void {
    this.activeProjectId = project.id;
    this.activeProjectName = project.name;
    this.activeFileHandle = null;
    this.isDirty = false;
    this.setCode(project.code);
    this.emitChange();
  }

  public loadFromFile(file: File, handle?: FileSystemFileHandle | null, code?: string): void {
    this.activeProjectId = null;
    this.activeFileHandle = handle ?? null;
    this.activeProjectName = file.name.replace(/\.(logo|json)$/i, '') || 'Untitled Project';
    this.isDirty = false;
    if (code !== undefined) {
      this.setCode(code);
    }
    this.emitChange();
  }
}
