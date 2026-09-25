import type { Project } from './project.ts';
import { validateProject } from './project.ts';

const DRAFT_KEY = 'learning_logo_draft';
const PROJECTS_KEY = 'learning_logo_projects';

export class LocalStore {
  // Autosave Draft
  saveDraft(code: string): void {
    try {
      localStorage.setItem(DRAFT_KEY, code);
    } catch (err) {
      console.error('[LocalStorage Quota Exceeded]', err);
    }
  }

  getDraft(): string | null {
    try {
      return localStorage.getItem(DRAFT_KEY);
    } catch (err) {
      console.error('[LocalStorage Error]', err);
      return null;
    }
  }

  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      console.error('[LocalStorage Error]', err);
    }
  }

  // Projects CRUD
  listProjects(): Project[] {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(validateProject);
      }
      return [];
    } catch (err) {
      console.error('[LocalStorage Error]', err);
      return [];
    }
  }

  saveProject(project: Project): boolean {
    const list = this.listProjects();
    const idx = list.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      list[idx] = { ...project, updatedAt: Date.now() };
    } else {
      list.unshift(project);
    }
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.error('[LocalStorage Quota Exceeded]', err);
      return false;
    }
  }

  getProject(id: string): Project | null {
    const list = this.listProjects();
    return list.find((p) => p.id === id) ?? null;
  }

  deleteProject(id: string): void {
    const list = this.listProjects().filter((p) => p.id !== id);
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('[LocalStorage Error]', err);
    }
  }
}
