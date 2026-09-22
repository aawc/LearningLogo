import type { LocalStore } from './local_store.ts';
import { createProject } from './project.ts';

export type LoadProjectCallback = (code: string, name: string) => void;

export class ProjectModal {
  private store: LocalStore;
  private modalEl: HTMLElement | null = null;
  private onLoadProject: LoadProjectCallback | null = null;
  private getCurrentCode: () => string;

  constructor(store: LocalStore, getCurrentCode: () => string) {
    this.store = store;
    this.getCurrentCode = getCurrentCode;
  }

  setOnLoadProject(cb: LoadProjectCallback): void {
    this.onLoadProject = cb;
  }

  open(): void {
    if (this.modalEl) return;

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'modal-backdrop';
    this.modalEl.setAttribute('role', 'dialog');
    this.modalEl.setAttribute('aria-modal', 'true');
    this.modalEl.setAttribute('aria-label', 'Projects Library');

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
    this.renderProjectList(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'dbg-btn btn-run';
    saveBtn.textContent = 'Save Current as New Project';
    saveBtn.addEventListener('click', () => {
      const name = window.prompt('Enter project name:', 'My Logo Project');
      if (name) {
        const code = this.getCurrentCode();
        const p = createProject(name, code);
        this.store.saveProject(p);
        this.renderProjectList(body);
      }
    });

    footer.appendChild(saveBtn);
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
      empty.textContent = 'No saved projects found. Click below to save your current work!';
      container.appendChild(empty);
      return;
    }

    for (const proj of projects) {
      const item = document.createElement('div');
      item.className = 'project-item';

      const info = document.createElement('div');
      info.className = 'project-info';
      const pTitle = document.createElement('span');
      pTitle.className = 'project-title';
      pTitle.textContent = proj.name;
      const pDate = document.createElement('span');
      pDate.className = 'project-date';
      pDate.textContent = new Date(proj.updatedAt).toLocaleDateString();
      info.appendChild(pTitle);
      info.appendChild(pDate);

      const actions = document.createElement('div');
      actions.className = 'project-actions';

      const openBtn = document.createElement('button');
      openBtn.className = 'dbg-btn';
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        if (this.onLoadProject) {
          this.onLoadProject(proj.code, proj.name);
        }
        this.close();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'dbg-btn btn-stop';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (window.confirm(`Delete project "${proj.name}"?`)) {
          this.store.deleteProject(proj.id);
          this.renderProjectList(container);
        }
      });

      actions.appendChild(openBtn);
      actions.appendChild(delBtn);

      item.appendChild(info);
      item.appendChild(actions);
      container.appendChild(item);
    }
  }

  close(): void {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
      this.modalEl = null;
    }
  }
}
