import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStore } from '../../../src/storage/local_store.ts';
import { createProject } from '../../../src/storage/project.ts';

describe('Local Persistence Store', () => {
  let store: LocalStore;

  beforeEach(() => {
    localStorage.clear();
    store = new LocalStore();
  });

  it('saves and restores autosave draft', () => {
    store.saveDraft('FD 100 RT 90');
    expect(store.getDraft()).toBe('FD 100 RT 90');

    store.clearDraft();
    expect(store.getDraft()).toBeNull();
  });

  it('performs CRUD operations on projects library', () => {
    const p1 = createProject('Square', 'REPEAT 4 [ FD 100 RT 90 ]');
    const p2 = createProject('Circle', 'REPEAT 360 [ FD 1 RT 1 ]');

    store.saveProject(p1);
    store.saveProject(p2);

    const list = store.listProjects();
    expect(list.length).toBe(2);

    const fetched = store.getProject(p1.id);
    expect(fetched?.name).toBe('Square');

    store.deleteProject(p1.id);
    expect(store.listProjects().length).toBe(1);
    expect(store.getProject(p1.id)).toBeNull();
  });

  it('logs quota exceeded errors to console.error when setItem throws', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    try {
      store.saveDraft('FD 500');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[LocalStorage Quota Exceeded]',
        expect.any(Error)
      );

      consoleErrorSpy.mockClear();
      const p = createProject('Test', 'FD 10');
      store.saveProject(p);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[LocalStorage Quota Exceeded]',
        expect.any(Error)
      );
    } finally {
      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });
});
