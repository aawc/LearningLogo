import { describe, it, expect } from 'vitest';
import { Environment } from '../../../src/interpreter/environment.ts';
import { RuntimeError } from '../../../src/interpreter/errors.ts';
import type { ProcedureDefNode } from '../../../src/interpreter/ast.ts';

describe('Dynamic Scoping Environment', () => {
  it('binds and retrieves variables in root environment', () => {
    const env = new Environment();
    env.set('X', 42);
    expect(env.get('X')).toBe(42);
  });

  it('handles case-insensitivity for variable names', () => {
    const env = new Environment();
    env.set('Total', 100);
    expect(env.get('TOTAL')).toBe(100);
    expect(env.get('total')).toBe(100);
  });

  it('supports local shadowing in child frames', () => {
    const parent = new Environment();
    parent.set('A', 10);

    const child = parent.createChild();
    child.defineLocal('A', 20);

    expect(child.get('A')).toBe(20);
    expect(parent.get('A')).toBe(10);
  });

  it('provides dynamic scoping access to parent variables', () => {
    const parent = new Environment();
    parent.set('G', 'GLOBAL');

    const child = parent.createChild();
    expect(child.get('G')).toBe('GLOBAL');
  });

  it('mutates existing variables in parent frame when not shadowed', () => {
    const parent = new Environment();
    parent.set('COUNT', 0);

    const child = parent.createChild();
    child.set('COUNT', 1);

    expect(child.get('COUNT')).toBe(1);
    expect(parent.get('COUNT')).toBe(1);
  });

  it('creates global variable when assigning to undefined name in child frame', () => {
    const parent = new Environment();
    const child = parent.createChild();

    child.set('NEW_VAR', 'CREATED');
    expect(child.get('NEW_VAR')).toBe('CREATED');
    expect(parent.get('NEW_VAR')).toBe('CREATED');
  });

  it('registers and retrieves procedure definitions', () => {
    const env = new Environment();
    const mockProc: ProcedureDefNode = {
      type: 'ProcedureDef',
      name: 'SQUARE',
      params: ['SIDE'],
      body: [],
      loc: { line: 1, column: 1, offset: 0, length: 10 },
    };

    env.defineProcedure('SQUARE', mockProc);
    expect(env.getProcedure('square')).toBe(mockProc);
    expect(env.getProcedure('SQUARE')).toBe(mockProc);
  });

  it('throws friendly RuntimeError on undefined variable access', () => {
    const env = new Environment();
    expect(() => env.get('UNKNOWN')).toThrow(RuntimeError);
    try {
      env.get('UNKNOWN');
    } catch (e) {
      expect(e).toBeInstanceOf(RuntimeError);
      expect((e as RuntimeError).message).toContain(':UNKNOWN');
    }
  });
});
