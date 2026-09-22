import type { ProcedureDefNode } from './ast.ts';
import { RuntimeError } from './errors.ts';

export type LogoValue = number | string | boolean | LogoValue[];

export class Environment {
  private bindings: Map<string, LogoValue> = new Map();
  private procedures: Map<string, ProcedureDefNode> = new Map();
  private parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.parent = parent;
  }

  get(name: string): LogoValue {
    const key = name.toUpperCase();
    if (this.bindings.has(key)) {
      return this.bindings.get(key)!;
    }
    if (this.parent !== null) {
      return this.parent.get(key);
    }
    throw new RuntimeError(
      `Turtle doesn't know what :${name.toUpperCase()} is.`,
      { line: 1, column: 1, offset: 0, length: 0 },
      `Did you define it with MAKE "${name.toUpperCase()} <value>?`
    );
  }

  set(name: string, value: LogoValue): void {
    const key = name.toUpperCase();
    // If already bound in this frame, update here
    if (this.bindings.has(key)) {
      this.bindings.set(key, value);
      return;
    }
    // Search ancestor frames
    let current: Environment | null = this.parent;
    while (current !== null) {
      if (current.bindings.has(key)) {
        current.bindings.set(key, value);
        return;
      }
      current = current.parent;
    }
    // If not found in any frame, bind in the root/global environment
    const root = this.getRoot();
    root.bindings.set(key, value);
  }

  defineLocal(name: string, value: LogoValue): void {
    this.bindings.set(name.toUpperCase(), value);
  }

  defineProcedure(name: string, def: ProcedureDefNode): void {
    const root = this.getRoot();
    root.procedures.set(name.toUpperCase(), def);
  }

  getProcedure(name: string): ProcedureDefNode | null {
    const root = this.getRoot();
    return root.procedures.get(name.toUpperCase()) ?? null;
  }

  createChild(): Environment {
    return new Environment(this);
  }

  private getRoot(): Environment {
    let current: Environment = this;
    while (current.parent !== null) {
      current = current.parent;
    }
    return current;
  }

  getAllVariables(): Record<string, LogoValue> {
    const result: Record<string, LogoValue> = {};
    if (this.parent !== null) {
      Object.assign(result, this.parent.getAllVariables());
    }
    for (const [k, v] of this.bindings.entries()) {
      result[k] = v;
    }
    return result;
  }
}
