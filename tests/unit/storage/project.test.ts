import { describe, it, expect } from 'vitest';
import {
  createProject,
  serializeProject,
  deserializeProject,
  validateProject,
} from '../../../src/storage/project.ts';

describe('Project Schema & Serialization', () => {
  it('creates project with generated id, timestamps, and schema version', () => {
    const project = createProject('My Square', 'REPEAT 4 [ FD 100 RT 90 ]');
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('My Square');
    expect(project.code).toBe('REPEAT 4 [ FD 100 RT 90 ]');
    expect(project.createdAt).toBeGreaterThan(0);
    expect(project.updatedAt).toBeGreaterThan(0);
    expect(project.version).toBe(1);
  });

  it('validates valid and invalid project objects', () => {
    const valid = createProject('Valid', 'FD 10');
    expect(validateProject(valid)).toBe(true);

    expect(validateProject(null)).toBe(false);
    expect(validateProject({})).toBe(false);
    expect(validateProject({ id: '123', name: 'Test' })).toBe(false);
  });

  it('serializes and deserializes cleanly round-trip', () => {
    const proj = createProject('Polygon', 'TO POLYGON :N ... END');
    const jsonStr = serializeProject(proj);
    expect(typeof jsonStr).toBe('string');

    const recovered = deserializeProject(jsonStr);
    expect(recovered).toEqual(proj);
  });

  it('returns null on deserializing malformed JSON', () => {
    const recovered = deserializeProject('{ not valid json');
    expect(recovered).toBeNull();
  });
});
