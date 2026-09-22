export enum DebuggerState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STEPPING = 'STEPPING',
}

export type StateChangeListener = (newState: DebuggerState, prevState: DebuggerState) => void;

const VALID_TRANSITIONS: Record<DebuggerState, DebuggerState[]> = {
  [DebuggerState.IDLE]: [DebuggerState.RUNNING, DebuggerState.STEPPING],
  [DebuggerState.RUNNING]: [DebuggerState.PAUSED, DebuggerState.IDLE],
  [DebuggerState.PAUSED]: [DebuggerState.RUNNING, DebuggerState.STEPPING, DebuggerState.IDLE],
  [DebuggerState.STEPPING]: [DebuggerState.PAUSED, DebuggerState.IDLE, DebuggerState.RUNNING],
};

export class DebuggerStateMachine {
  private currentState: DebuggerState = DebuggerState.IDLE;
  private listeners: StateChangeListener[] = [];

  getState(): DebuggerState {
    return this.currentState;
  }

  transition(nextState: DebuggerState): boolean {
    if (this.currentState === nextState) return true;

    const allowed = VALID_TRANSITIONS[this.currentState] ?? [];
    if (!allowed.includes(nextState)) {
      return false;
    }

    const prevState = this.currentState;
    this.currentState = nextState;

    for (const listener of this.listeners) {
      listener(this.currentState, prevState);
    }

    return true;
  }

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  reset(): void {
    this.transition(DebuggerState.IDLE);
  }
}
