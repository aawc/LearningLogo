import { describe, it, expect, vi } from 'vitest';
import { StepperController } from '../../../src/debugger/stepper.ts';
import { DebuggerState } from '../../../src/debugger/state.ts';
import { tokenize } from '../../../src/interpreter/lexer.ts';
import { parse } from '../../../src/interpreter/parser.ts';
import { Environment } from '../../../src/interpreter/environment.ts';
import { Turtle } from '../../../src/graphics/turtle.ts';

describe('Non-Blocking Stepper Controller', () => {
  it('initializes in IDLE state with default speed', () => {
    const stepper = new StepperController();
    expect(stepper.getState()).toBe(DebuggerState.IDLE);
    expect(stepper.getSpeed()).toBe(50);
  });

  it('calculates non-linear delay from speed parameter', () => {
    const stepper = new StepperController();
    expect(stepper.calculateDelay(100)).toBe(0);      // Turbo
    expect(stepper.calculateDelay(0)).toBe(1000);     // Slowest
    expect(stepper.calculateDelay(50)).toBe(250);     // 1000 * (1 - 0.5)^2 = 250
  });

  it('steps into 1 command and pauses when in IDLE or PAUSED', () => {
    const stepper = new StepperController();
    const ast = parse(tokenize('FD 50\nRT 90'));
    const env = new Environment();
    const turtle = new Turtle();

    const onStep = vi.fn();
    stepper.setOnStep(onStep);

    stepper.load(ast, env, turtle);
    stepper.stepInto();

    expect(stepper.getState()).toBe(DebuggerState.PAUSED);
    expect(onStep).toHaveBeenCalled();
  });

  it('stops execution immediately and resets to IDLE', () => {
    const stepper = new StepperController();
    const ast = parse(tokenize('REPEAT 1000 [ FD 10 ]'));
    const env = new Environment();
    const turtle = new Turtle();

    stepper.load(ast, env, turtle);
    stepper.run();
    expect(stepper.getState()).toBe(DebuggerState.RUNNING);

    stepper.stop();
    expect(stepper.getState()).toBe(DebuggerState.IDLE);
  });

  it('guards run() and stepInto() against uninitialized generator remaining in IDLE', () => {
    const stepper = new StepperController();
    // No program loaded: generator is null
    stepper.run();
    expect(stepper.getState()).toBe(DebuggerState.IDLE);

    stepper.stepInto();
    expect(stepper.getState()).toBe(DebuggerState.IDLE);
  });

  it('tracks callStack on procedure entry and exit and emits step.callStack', () => {
    const stepper = new StepperController();
    const code = `
TO BOX
  FD 20
END
BOX
`;
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();

    const stackHistory: string[][] = [];
    stepper.setOnStep((step) => {
      if (step.callStack) {
        stackHistory.push([...step.callStack]);
      }
    });

    stepper.load(ast, env, turtle);
    // Step through execution
    do {
      stepper.stepInto();
    } while (stepper.getState() !== DebuggerState.IDLE);

    // After stepping through, at least one step had ['Global', 'BOX'] in its stack
    const enteredBox = stackHistory.some((stack) => stack.includes('BOX'));
    expect(enteredBox).toBe(true);
  });

  it('implements stepOver to step through an entire procedure call without halting inside', () => {
    const stepper = new StepperController();
    const procDef = `
TO SQUARE
  REPEAT 4 [ FD 10 RT 90 ]
END
`;
    const env = new Environment();
    for (const stmt of parse(tokenize(procDef)).body) {
      if (stmt.type === 'ProcedureDef') env.defineProcedure(stmt.name, stmt);
    }

    const ast = parse(tokenize('SQUARE\nFD 50'));
    const turtle = new Turtle();

    stepper.load(ast, env, turtle);
    // Step over SQUARE (the entire procedure)
    stepper.stepOver();

    expect(stepper.getState()).toBe(DebuggerState.PAUSED);
    // Square was executed: turtle completed 4 segments of square
    expect(turtle.getPathSegments().length).toBe(4);
  });
});
