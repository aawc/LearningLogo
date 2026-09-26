import type { LocalStore } from './local_store.ts';
import type { Project } from './project.ts';
import { createProject } from './project.ts';
import {
  writeToFileHandle,
  hasFileSystemAccess,
  openFileWithPicker,
  saveFileAsWithHandle,
  verifyHandlePermission,
  LOGO_FILE_PICKER_TYPES,
} from './file_system.ts';
import { importFromFile } from './file_io.ts';
import { DEFAULT_STARTER_CODE } from '../editor/starter_code.ts';

export interface ProjectState {
  activeProjectId: string | null;
  activeProjectName: string;
  activeFileName: string;
  activeFileHandle: FileSystemFileHandle | null;
  isDirty: boolean;
}

export interface ProjectManagerOptions {
  store: LocalStore;
  getCurrentCode: () => string;
  setCode: (code: string) => void;
  initialProjectName?: string;
  initialFileName?: string;
}

export class ProjectManager {
  private readonly store: LocalStore;
  private readonly getCurrentCode: () => string;
  private readonly setCode: (code: string) => void;

  private activeProjectId: string | null = null;
  private activeProjectName: string = 'Untitled Project';
  private activeFileName: string = 'Untitled.logo';
  private activeFileHandle: FileSystemFileHandle | null = null;
  private isDirty: boolean = false;

  private readonly listeners: Set<(state: ProjectState) => void> = new Set();

  constructor(options: ProjectManagerOptions) {
    this.store = options.store;
    this.getCurrentCode = options.getCurrentCode;
    this.setCode = options.setCode;

    if (options.initialFileName) {
      this.activeFileName = options.initialFileName;
    } else if (options.initialProjectName && options.initialProjectName !== 'Untitled Project') {
      this.activeFileName = `${options.initialProjectName}.logo`;
    } else {
      this.activeFileName = 'Untitled.logo';
    }

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

  public getActiveFileName(): string {
    return this.activeFileName;
  }

  public setActiveFileName(name: string): void {
    this.activeFileName = name;
    this.emitChange();
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
      activeFileName: this.activeFileName,
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
      this.activeProjectName = name.replace(/\.(logo|json)$/i, '');
      this.activeFileName = name.endsWith('.logo') ? name : `${name}.logo`;
    } else if (handle?.name) {
      this.activeFileName = handle.name;
      this.activeProjectName = handle.name.replace(/\.(logo|json)$/i, '');
    }
    this.emitChange();
  }

  public newProject(name?: string, initialCode?: string): void {
    this.activeProjectId = null;
    this.activeProjectName = name?.trim() || 'Untitled Project';
    this.activeFileName = `${this.activeProjectName}.logo`;
    this.activeFileHandle = null;
    this.isDirty = false;
    if (initialCode !== undefined) {
      this.setCode(initialCode);
    }
    this.emitChange();
  }

  public newFile(): void {
    this.activeProjectId = null;
    this.activeProjectName = 'Untitled Project';
    this.activeFileName = 'Untitled.logo';
    this.activeFileHandle = null;
    this.isDirty = false;
    this.setCode(DEFAULT_STARTER_CODE);
    this.emitChange();
  }

  public async openFile(): Promise<boolean> {
    try {
      const res = await openFileWithPicker(LOGO_FILE_PICKER_TYPES);
      if (!res) return false;
      const text =
        typeof res.file.text === 'function'
          ? await res.file.text()
          : await importFromFile(res.file);
      this.loadFromFile(res.file, res.handle ?? null, text);
      return true;
    } catch {
      return false;
    }
  }

  public async save(): Promise<boolean> {
    const code = this.getCurrentCode();

    if (this.activeFileHandle) {
      try {
        const permitted = await verifyHandlePermission(this.activeFileHandle, 'readwrite');
        if (permitted) {
          await writeToFileHandle(this.activeFileHandle, code);
          this.isDirty = false;
          this.emitChange();
          return true;
        }
      } catch {
        // Fallback to saveAs if permission check or in-place write fails
      }
      const res = await this.saveAs(this.activeFileName);
      return res !== null && res !== false;
    }

    if (hasFileSystemAccess()) {
      const res = await this.saveAs(this.activeFileName);
      return res !== null && res !== false;
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

    // No existing ID or file handle and no File System Access API -> save as new project in store
    const created = createProject(this.activeProjectName, code);
    const success = this.store.saveProject(created);
    if (!success) {
      throw new Error('Storage quota exceeded or storage unavailable');
    }
    this.activeProjectId = created.id;
    this.activeProjectName = created.name;
    this.activeFileName = `${created.name}.logo`;
    this.isDirty = false;
    this.emitChange();
    return true;
  }

  public async saveAs(nameOrSuggested?: string): Promise<any> {
    const code = this.getCurrentCode();
    const suggested = nameOrSuggested || this.activeFileName;

    // Always delegate to saveFileAsWithHandle so non-Chromium browsers receive downloadBlob fallback
    const res = await saveFileAsWithHandle(code, suggested, LOGO_FILE_PICKER_TYPES);
    if (!res) {
      return null;
    }

    this.activeFileHandle = res.handle;
    this.activeFileName = res.name.endsWith('.logo') ? res.name : `${res.name}.logo`;
    this.activeProjectName = res.name.replace(/\.(logo|json)$/i, '') || 'Untitled Project';

    // Also persist project to LocalStore for backup / store tracking
    const projName = this.activeProjectName;
    const project = createProject(projName, code);
    const success = this.store.saveProject(project);
    if (!success && !res.handle) {
      throw new Error('Storage quota exceeded or storage unavailable');
    }
    this.activeProjectId = project.id;

    this.isDirty = false;
    this.emitChange();
    return res.handle ?? project;
  }

  public renameProject(newName: string): void {
    this.activeProjectName = newName.trim() || 'Untitled Project';
    this.activeFileName = `${this.activeProjectName}.logo`;

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
      this.activeFileName = 'Untitled.logo';
      this.activeFileHandle = null;
      this.isDirty = false;
    }
    this.emitChange();
  }

  public loadProject(project: Project): void {
    this.activeProjectId = project.id;
    this.activeProjectName = project.name;
    this.activeFileName = `${project.name}.logo`;
    this.activeFileHandle = null;
    this.isDirty = false;
    this.setCode(project.code);
    this.emitChange();
  }

  public loadFromFile(file: File, handle?: FileSystemFileHandle | null, code?: string): void {
    this.activeProjectId = null;
    this.activeFileHandle = handle ?? null;
    this.activeFileName = file.name;
    this.activeProjectName = file.name.replace(/\.(logo|json)$/i, '') || 'Untitled Project';
    this.isDirty = false;
    if (code !== undefined) {
      this.setCode(code);
    }
    this.emitChange();
  }
}
