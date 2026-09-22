import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportLogoFile,
  exportProjectJson,
  importFromFile,
} from '../../../src/storage/file_io.ts';
import { createProject } from '../../../src/storage/project.ts';

describe('File IO Export and Import Utilities', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('exports code as a .logo file and triggers download', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    exportLogoFile('my_program', 'FD 100 RT 90');

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('exports structured project as a .json file', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const project = createProject('Test Project', 'REPEAT 4 [ FD 50 RT 90 ]');
    exportProjectJson('test_project', project);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('imports raw code from a .logo text file', async () => {
    const code = 'TO STAR\n REPEAT 5 [ FD 50 RT 144 ]\nEND';
    const file = new File([code], 'star.logo', { type: 'text/plain' });

    const imported = await importFromFile(file);
    expect(imported).toBe(code);
  });

  it('imports code from an exported .json project file', async () => {
    const originalCode = 'CS\nREPEAT 36 [ FD 5 RT 10 ]';
    const project = createProject('Circle Drawing', originalCode);
    const jsonStr = JSON.stringify(project);
    const file = new File([jsonStr], 'project.json', { type: 'application/json' });

    const imported = await importFromFile(file);
    expect(imported).toBe(originalCode);
  });
});
