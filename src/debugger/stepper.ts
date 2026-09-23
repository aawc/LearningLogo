import { DebuggerState, DebuggerStateMachine } from './state.ts';
import {
  Runtime,
  CancellationToken,
  type ExecutionStep,
} from '../interpreter/runtime.ts';
import type { ProgramNode, CommandCallNode } from '../interpreter/ast.ts';
import type { Environment } from '../interpreter/environment.ts';
import type { Turtle } from '../graphics/turtle.ts';

export type StepCallback = (step: ExecutionStep) => void;
export type FinishCallback = () => void;
export type ErrorCallback = (error: unknown) => void;

export class StepperController {
  private stateMachine = new DebuggerStateMachine();
  private runtime = new Runtime();
  private cancelToken = new CancellationToken();
  private generator: Generator<ExecutionStep, void, unknown> | null = null;
  private speed = 50; // 0 (slowest) to 100 (turbo)
  private onStepCallback: StepCallback | null = null;
  private onFinishCallback: FinishCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  private onStopCallback: (() => void) | null = null;
  private timerId: number | null = null;
  private callStack: string[] = ['Global'];
  private lastStep: ExecutionStep | null = null;

  getState(): DebuggerState {
    return this.stateMachine.getState();
  }

  getStateMachine(): DebuggerStateMachine {
    return this.stateMachine;
  }

  getSpeed(): number {
    return this.speed;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0, Math.min(100, speed));
  }

  calculateDelay(speed: number): number {
    if (speed >= 100) return 0; // Turbo
    const factor = (100 - speed) / 100;
    return Math.round(1000 * factor * factor);
  }

  setOnStep(cb: StepCallback): void {
    this.onStepCallback = cb;
  }

  setOnFinish(cb: FinishCallback): void {
    this.onFinishCallback = cb;
  }

  setOnError(cb: ErrorCallback): void {
    this.onErrorCallback = cb;
  }

  setOnStop(cb: () => void): void {
    this.onStopCallback = cb;
  }

  load(program: ProgramNode, env: Environment, turtle: Turtle): void {
    this.stop();
    this.cancelToken.reset();
    this.callStack = ['Global'];
    this.lastStep = null;
    this.generator = this.runtime.execute(program, env, turtle, this.cancelToken);
  }

  run(): void {
    if (!this.generator) return;
    const current = this.getState();
    if (current === DebuggerState.IDLE || current === DebuggerState.PAUSED) {
      if (this.stateMachine.transition(DebuggerState.RUNNING)) {
        this.scheduleNextTick();
      }
    }
  }

  pause(): void {
    if (this.stateMachine.transition(DebuggerState.PAUSED)) {
      this.clearTimer();
    }
  }

  resume(): void {
    this.run();
  }

  stepInto(): void {
    if (!this.generator) return;
    const current = this.getState();
    if (current === DebuggerState.IDLE) {
      this.stateMachine.transition(DebuggerState.STEPPING);
    } else if (current === DebuggerState.PAUSED) {
      this.stateMachine.transition(DebuggerState.STEPPING);
    }

    this.executeSingleStep();
    if (this.getState() === DebuggerState.STEPPING) {
      this.stateMachine.transition(DebuggerState.PAUSED);
    }
  }

  stepOver(): void {
    if (!this.generator) return;
    const current = this.getState();
    if (current === DebuggerState.IDLE) {
      this.stateMachine.transition(DebuggerState.STEPPING);
    } else if (current === DebuggerState.PAUSED) {
      this.stateMachine.transition(DebuggerState.STEPPING);
    }

    const startDepth = this.callStack.length;
    let hasMore = this.executeSingleStep();
    if (!hasMore || this.getState() !== DebuggerState.STEPPING) {
      return;
    }

    // If the step just executed was a COMMAND for a user procedure, execute the FRAME_PUSH
    if (this.lastStep?.type === 'COMMAND' && this.lastStep.node.type === 'CommandCall') {
      const cmdName = String((this.lastStep.node as CommandCallNode).name).toUpperCase();
      if (this.lastStep.env.getProcedure(cmdName)) {
        hasMore = this.executeSingleStep();
      }
    }

    while (hasMore && this.callStack.length > startDepth) {
      hasMore = this.executeSingleStep();
      if (!hasMore || this.getState() !== DebuggerState.STEPPING) {
        return;
      }
    }

    if (this.getState() === DebuggerState.STEPPING) {
      this.stateMachine.transition(DebuggerState.PAUSED);
    }
  }

  stop(): void {
    this.clearTimer();
    this.cancelToken.cancel();
    this.generator = null;
    this.callStack = ['Global'];
    this.lastStep = null;
    this.stateMachine.transition(DebuggerState.IDLE);
    if (this.onStopCallback) {
      this.onStopCallback();
    }
  }

  private executeSingleStep(): boolean {
    if (!this.generator) return false;

    try {
      const res = this.generator.next();
      if (res.done) {
        this.clearTimer();
        this.generator = null;
        this.callStack = ['Global'];
        this.lastStep = null;
        this.stateMachine.transition(DebuggerState.IDLE);
        if (this.onFinishCallback) {
          this.onFinishCallback();
        }
        return false;
      }

      const step = res.value;
      if (step.type === 'FRAME_PUSH') {
        const procName = 'name' in step.node ? String(step.node.name) : 'Procedure';
        this.callStack.push(procName);
      } else if (step.type === 'FRAME_POP') {
        if (this.callStack.length > 1) {
          this.callStack.pop();
        }
      }

      const enrichedStep: ExecutionStep = {
        ...step,
        callStack: [...this.callStack],
      };
      this.lastStep = enrichedStep;

      if (this.onStepCallback) {
        this.onStepCallback(enrichedStep);
      }
      return true;
    } catch (err) {
      this.stop();
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
      return false;
    }
  }

  private scheduleNextTick(): void {
    if (this.getState() !== DebuggerState.RUNNING) return;

    const delay = this.calculateDelay(this.speed);

    if (delay === 0) {
      // Turbo mode: batch multiple steps within 12ms frame
      const start = performance.now();
      while (performance.now() - start < 12) {
        const hasMore = this.executeSingleStep();
        if (!hasMore || this.getState() !== DebuggerState.RUNNING) {
          return;
        }
      }
      this.timerId = window.setTimeout(() => this.scheduleNextTick(), 0);
    } else {
      this.timerId = window.setTimeout(() => {
        const hasMore = this.executeSingleStep();
        if (hasMore && this.getState() === DebuggerState.RUNNING) {
          this.scheduleNextTick();
        }
      }, delay);
    }
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
