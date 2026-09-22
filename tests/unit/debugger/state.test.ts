import { describe, it, expect, vi } from 'vitest';
import { DebuggerState, DebuggerStateMachine } from '../../../src/debugger/state.ts';

describe('Debugger State Machine', () => {
  it('initializes in IDLE state', () => {
    const sm = new DebuggerStateMachine();
    expect(sm.getState()).toBe(DebuggerState.IDLE);
  });

  it('allows valid state transitions', () => {
    const sm = new DebuggerStateMachine();

    // IDLE -> RUNNING
    expect(sm.transition(DebuggerState.RUNNING)).toBe(true);
    expect(sm.getState()).toBe(DebuggerState.RUNNING);

    // RUNNING -> PAUSED
    expect(sm.transition(DebuggerState.PAUSED)).toBe(true);
    expect(sm.getState()).toBe(DebuggerState.PAUSED);

    // PAUSED -> STEPPING
    expect(sm.transition(DebuggerState.STEPPING)).toBe(true);
    expect(sm.getState()).toBe(DebuggerState.STEPPING);

    // STEPPING -> PAUSED
    expect(sm.transition(DebuggerState.PAUSED)).toBe(true);
    expect(sm.getState()).toBe(DebuggerState.PAUSED);

    // PAUSED -> RUNNING
    expect(sm.transition(DebuggerState.RUNNING)).toBe(true);
    expect(sm.getState()).toBe(DebuggerState.RUNNING);

    // RUNNING -> IDLE
    expect(sm.transition(DebuggerState.IDLE)).toBe(true);
    expect(sm.getState()).toBe(DebuggerState.IDLE);
  });

  it('rejects invalid state transitions without changing state', () => {
    const sm = new DebuggerStateMachine();

    // IDLE -> PAUSED is invalid
    expect(sm.transition(DebuggerState.PAUSED)).toBe(false);
    expect(sm.getState()).toBe(DebuggerState.IDLE);
  });

  it('notifies listeners on valid state transition', () => {
    const sm = new DebuggerStateMachine();
    const listener = vi.fn();
    sm.subscribe(listener);

    sm.transition(DebuggerState.RUNNING);
    expect(listener).toHaveBeenCalledWith(DebuggerState.RUNNING, DebuggerState.IDLE);
  });
});
