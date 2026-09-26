import type { LocalStore } from './local_store.ts';
import type { Project } from './project.ts';
import { ProjectManager } from './project_manager.ts';
import { exportProjectJson } from './file_io.ts';

export type LoadProjectCallback = (code: string, name: string) => void;

export interface ProjectModalOptions {
  onImportFile?: () => void;
  onExportProject?: (project: Project) => void;
  onLoadProject?: LoadProjectCallback;
  onNewProject?: (name: string) => void;
}

export class ProjectModal {
  private projectManager: ProjectManager;
  private store: LocalStore;
  private modalEl: HTMLElement | null = null;
  private onLoadProject: LoadProjectCallback | null = null;
  private onImportFile: (() => void) | null = null;
  private onExportProject: ((project: Project) => void) | null = null;
  private onNewProject: ((name: string) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    managerOrStore: ProjectManager | LocalStore,
    getCurrentCode?: () => string,
    options?: ProjectModalOptions
  ) {
    if (managerOrStore instanceof ProjectManager) {
      this.projectManager = managerOrStore;
      this.store = managerOrStore.getStore();
      this.onImportFile = options?.onImportFile ?? null;
      this.onExportProject = options?.onExportProject ?? null;
      this.onLoadProject = options?.onLoadProject ?? null;
      this.onNewProject = options?.onNewProject ?? null;
    } else {
      this.store = managerOrStore;
      const getCode = getCurrentCode ?? (() => '');
      this.projectManager = new ProjectManager({
        store: this.store,
        getCurrentCode: getCode,
        setCode: (code) => {
          if (this.onLoadProject) {
            this.onLoadProject(code, this.projectManager.getActiveProjectName());
          }
        },
      });
      this.onImportFile = options?.onImportFile ?? null;
      this.onExportProject = options?.onExportProject ?? null;
      this.onLoadProject = options?.onLoadProject ?? null;
      this.onNewProject = options?.onNewProject ?? null;
    }
  }

  setOnLoadProject(cb: LoadProjectCallback): void {
    this.onLoadProject = cb;
  }

  setOnImportFile(cb: () => void): void {
    this.onImportFile = cb;
  }

  setOnExportProject(cb: (project: Project) => void): void {
    this.onExportProject = cb;
  }

  setOnNewProject(cb: (name: string) => void): void {
    this.onNewProject = cb;
  }

  private confirmDiscardIfDirty(): boolean {
    if (!this.projectManager.getIsDirty()) return true;
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return true;
    try {
      const res = window.confirm('You have unsaved changes. Discard them?');
      if (res === undefined) return true;
      return Boolean(res);
    } catch {
      return true;
    }
  }

  open(): void {
    if (this.modalEl) return;

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-backdrop';
    this.modalEl.setAttribute('role', 'dialog');
    this.modalEl.setAttribute('aria-modal', 'true');
    this.modalEl.setAttribute('aria-label', 'Projects Library');

    // Backdrop dismissal
    this.modalEl.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    // Escape key dismissal
    this.boundOnKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    window.addEventListener('keydown', this.boundOnKeyDown);

    const card = document.createElement('div');
    card.className = 'modal-card';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    const title = document.createElement('h2');
    title.textContent = 'Projects Library';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close projects modal');
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';

    // Action Bar
    const actionBar = document.createElement('div');
    actionBar.className = 'modal-actions-bar';

    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'dbg-btn btn-new-project';
    newBtn.textContent = '+ New Project';
    newBtn.addEventListener('click', () => {
      if (!this.confirmDiscardIfDirty()) return;
      const name = window.prompt('Enter new project name:', 'My Logo Project');
      if (name !== null) {
        this.projectManager.newProject(name);
        if (this.onNewProject) {
          this.onNewProject(name);
        }
        this.renderProjectList(listContainer);
      }
    });

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'dbg-btn btn-import-project';
    importBtn.textContent = '📥 Import File';
    importBtn.addEventListener('click', () => {
      if (this.onImportFile) {
        this.onImportFile();
      }
    });

    const saveAsBtn = document.createElement('button');
    saveAsBtn.type = 'button';
    saveAsBtn.className = 'dbg-btn btn-run btn-save-as-project';
    saveAsBtn.textContent = '💾 Save As New';
    saveAsBtn.addEventListener('click', async () => {
      const defaultName = this.projectManager.getActiveProjectName() || 'My Logo Project';
      const name = window.prompt('Save current project as:', defaultName);
      if (name !== null && name.trim()) {
        await this.projectManager.saveAs(name.trim());
        this.renderProjectList(listContainer);
      }
    });

    actionBar.appendChild(newBtn);
    actionBar.appendChild(importBtn);
    actionBar.appendChild(saveAsBtn);
    body.appendChild(actionBar);

    // Project List Container
    const listContainer = document.createElement('div');
    listContainer.className = 'modal-project-list';
    this.renderProjectList(listContainer);
    body.appendChild(listContainer);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    const doneBtn = document.createElement('button');
    doneBtn.className = 'dbg-btn';
    doneBtn.textContent = 'Close';
    doneBtn.addEventListener('click', () => this.close());
    footer.appendChild(doneBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    this.modalEl.appendChild(card);

    document.body.appendChild(this.modalEl);
  }

  private renderProjectList(container: HTMLElement): void {
    container.innerHTML = '';
    const projects = this.store.listProjects();

    if (projects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'var-empty';
      empty.textContent = 'No saved projects found. Create a new project or save your current work above!';
      container.appendChild(empty);
      return;
    }

    const activeId = this.projectManager.getActiveProjectId();

    for (const proj of projects) {
      const item = document.createElement('div');
      item.className = 'project-item';

      const info = document.createElement('div');
      info.className = 'project-info';

      const titleRow = document.createElement('div');
      titleRow.className = 'project-title-row';

      const pTitle = document.createElement('span');
      pTitle.className = 'project-title';
      pTitle.textContent = proj.name;
      titleRow.appendChild(pTitle);

      if (proj.id === activeId) {
        const badge = document.createElement('span');
        badge.className = 'badge-current';
        badge.textContent = '[Current]';
        titleRow.appendChild(badge);
      }

      const pDate = document.createElement('span');
      pDate.className = 'project-date';
      pDate.textContent = new Date(proj.updatedAt).toLocaleDateString();

      info.appendChild(titleRow);
      info.appendChild(pDate);

      const actions = document.createElement('div');
      actions.className = 'project-actions';

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'dbg-btn btn-proj-open';
      openBtn.textContent = 'Open';
      openBtn.setAttribute('aria-label', `Open project "${proj.name}"`);
      openBtn.addEventListener('click', () => {
        if (!this.confirmDiscardIfDirty()) return;
        this.projectManager.loadProject(proj);
        if (this.onLoadProject) {
          this.onLoadProject(proj.code, proj.name);
        }
        this.close();
      });

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'dbg-btn btn-proj-rename';
      renameBtn.textContent = 'Rename';
      renameBtn.setAttribute('aria-label', `Rename project "${proj.name}"`);
      renameBtn.addEventListener('click', () => {
        const newName = window.prompt('Rename project:', proj.name);
        if (newName !== null && newName.trim()) {
          if (this.projectManager.getActiveProjectId() === proj.id) {
            this.projectManager.renameProject(newName.trim());
          } else {
            proj.name = newName.trim();
            proj.updatedAt = Date.now();
            this.store.saveProject(proj);
          }
          this.renderProjectList(container);
        }
      });

      const dupBtn = document.createElement('button');
      dupBtn.type = 'button';
      dupBtn.className = 'dbg-btn btn-proj-duplicate';
      dupBtn.textContent = 'Duplicate';
      dupBtn.setAttribute('aria-label', `Duplicate project "${proj.name}"`);
      dupBtn.addEventListener('click', () => {
        this.projectManager.duplicateProject(proj.id);
        this.renderProjectList(container);
      });

      const exportBtn = document.createElement('button');
      exportBtn.type = 'button';
      exportBtn.className = 'dbg-btn btn-proj-export';
      exportBtn.textContent = 'Export';
      exportBtn.setAttribute('aria-label', `Export project "${proj.name}"`);
      exportBtn.addEventListener('click', () => {
        if (this.onExportProject) {
          this.onExportProject(proj);
        } else {
          exportProjectJson(proj.name, proj);
        }
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'dbg-btn btn-stop btn-proj-delete';
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('aria-label', `Delete project "${proj.name}"`);
      delBtn.addEventListener('click', () => {
        if (window.confirm(`Delete project "${proj.name}"?`)) {
          this.projectManager.deleteProject(proj.id);
          this.renderProjectList(container);
        }
      });

      actions.appendChild(openBtn);
      actions.appendChild(renameBtn);
      actions.appendChild(dupBtn);
      actions.appendChild(exportBtn);
      actions.appendChild(delBtn);

      item.appendChild(info);
      item.appendChild(actions);
      container.appendChild(item);
    }
  }

  close(): void {
    if (this.boundOnKeyDown) {
      window.removeEventListener('keydown', this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
    }
  }
}
