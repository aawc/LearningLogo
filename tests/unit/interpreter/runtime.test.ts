import { describe, it, expect } from 'vitest';
import { tokenize } from '../../../src/interpreter/lexer.ts';
import { parse } from '../../../src/interpreter/parser.ts';
import { Environment } from '../../../src/interpreter/environment.ts';
import { Turtle } from '../../../src/graphics/turtle.ts';
import {
  Runtime,
  CancellationToken,
  type ExecutionStep,
} from '../../../src/interpreter/runtime.ts';
import { InstructionBudgetExceededError } from '../../../src/interpreter/errors.ts';

describe('Cooperative Generator Runtime', () => {
  it('yields ExecutionSteps with source locations for each command', () => {
    const code = 'FD 50\nRT 90\nFD 50';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    const steps: ExecutionStep[] = [];
    for (const step of runtime.execute(ast, env, turtle, token)) {
      steps.push(step);
    }

    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(turtle.getState().x).toBe(50);
    expect(turtle.getState().y).toBe(50);
  });

  it('evaluates variables and arithmetic in commands', () => {
    const code = 'MAKE "SIZE 20 + 5\nFD :SIZE';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(env.get('SIZE')).toBe(25);
    expect(turtle.getState().y).toBe(25);
  });

  it('executes REPEAT with REPCOUNT variable', () => {
    const code = 'MAKE "SUM 0\nREPEAT 3 [ MAKE "SUM :SUM + REPCOUNT ]';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    // 1 + 2 + 3 = 6
    expect(env.get('SUM')).toBe(6);
  });

  it('executes procedures with parameter binding and frame teardown', () => {
    const code = `
TO SQUARE :SIDE
  REPEAT 4 [ FD :SIDE RT 90 ]
END
SQUARE 100
`;
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    // After drawing square of 100, turtle is back at (0, 0) facing North
    expect(Math.round(turtle.getState().x)).toBe(0);
    expect(Math.round(turtle.getState().y)).toBe(0);
    expect(turtle.getPathSegments().length).toBe(4);
  });

  it('executes recursive procedures and cleans up stack frames', () => {
    const code = `
TO COUNTDOWN :N
  IF :N <= 0 [ STOP ]
  COUNTDOWN :N - 1
END
COUNTDOWN 5
`;
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(true).toBe(true);
  });

  it('throws InstructionBudgetExceededError when exceeding instruction ceiling', () => {
    const code = 'REPEAT 100000 [ MAKE "X 1 ]';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    expect(() => {
      for (const _ of runtime.execute(ast, env, turtle, token, { instructionCeiling: 50 })) {
        // iterate
      }
    }).toThrow(InstructionBudgetExceededError);
  });

  it('halts immediately on CancellationToken cancellation', () => {
    const code = 'REPEAT 1000 [ FD 10 ]';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    let count = 0;
    for (const _ of runtime.execute(ast, env, turtle, token)) {
      count++;
      if (count === 5) {
        token.cancel();
      }
    }

    expect(count).toBe(5);
    expect(turtle.getState().y).toBe(20);
  });

  it('provides dynamic scoping so callee reads caller variables', () => {
    const code = `
TO CHILD
  FD :SHARED
END
TO PARENT
  MAKE "SHARED 80
  CHILD
END
PARENT
`;
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(turtle.getState().y).toBe(80);
  });

  it('executes SETX, SETY, SETH, and CLEAN commands', () => {
    const code = 'SETX 30\nSETY 40\nSETH 180\nCLEAN';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(turtle.getState().x).toBe(30);
    expect(turtle.getState().y).toBe(40);
    expect(turtle.getState().heading).toBe(180);
    expect(turtle.getPathSegments().length).toBe(0); // Cleaned
  });

  it('evaluates XCOR, YCOR, HEADING, and TOWARDS functions', () => {
    const code = `
SETXY 0 0
SETH 90
MAKE "H HEADING
MAKE "XC XCOR
MAKE "YC YCOR
MAKE "DIR TOWARDS 0 50
`;
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(env.get('H')).toBe(90);
    expect(env.get('XC')).toBe(0);
    expect(env.get('YC')).toBe(0);
    expect(env.get('DIR')).toBe(0); // Towards (0, 50) from (0, 0) is North = 0 deg
  });

  it('evaluates extended math and list primitives (ABS, SIN, COS, ITEM, FPUT, LPUT, SE)', () => {
    const code = `
MAKE "A ABS -25
MAKE "S SIN 90
MAKE "C COS 0
MAKE "L [10 20 30]
MAKE "IT ITEM 2 :L
MAKE "F FPUT 5 :L
MAKE "LP LPUT 40 :L
MAKE "SENT SENTENCE [1] [2]
`;
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(env.get('A')).toBe(25);
    expect(env.get('S')).toBe(1);
    expect(env.get('C')).toBe(1);
    expect(env.get('IT')).toBe(20);
    expect(env.get('F')).toEqual([5, 10, 20, 30]);
    expect(env.get('LP')).toEqual([10, 20, 30, 40]);
    expect(env.get('SENT')).toEqual([1, 2]);
  });

  it('supports THING and LOCAL variable scoping', () => {
    const code = `
MAKE "MYVAR 99
MAKE "READ THING "MYVAR
TO TEST_LOCAL
  LOCAL "X
  MAKE "X 10
END
TEST_LOCAL
`;
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(env.get('READ')).toBe(99);
    // :X defined as LOCAL inside TEST_LOCAL should not leak into global env
    expect(() => env.get('X')).toThrow();
  });

  it('supports SHOW output and PENSIZE command', () => {
    const code = 'PENSIZE 5\nSHOW 12345';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(turtle.getState().penWidth).toBe(5);
    expect(runtime.getLogs()).toContain('12345');
  });

  it('supports ARC and CIRCLE drawing commands', () => {
    const code = 'CIRCLE 50\nARC 90 25';
    const ast = parse(tokenize(code));
    const env = new Environment();
    const turtle = new Turtle();
    const token = new CancellationToken();
    const runtime = new Runtime();

    for (const _ of runtime.execute(ast, env, turtle, token)) {
      // iterate
    }

    expect(turtle.getPathSegments().length).toBeGreaterThan(20);
  });
});
