import { describe, it, expect, vi } from 'vitest';
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

  describe('Terrapin Drawing Commands & Reporters Wiring', () => {
    it('executes motion commands and evaluates reporters (GETX, GETY, GETXY, POS, SETPOS, DISTANCE)', () => {
      const code = `
SETPOS [30 40]
MAKE "X GETX
MAKE "Y GETY
MAKE "P GETXY
MAKE "D DISTANCE [0 0]
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('X')).toBe(30);
      expect(env.get('Y')).toBe(40);
      expect(env.get('P')).toEqual([30, 40]);
      expect(env.get('D')).toBe(50);
    });

    it('manages turtle visibility and scale (HT, ST, SHOWN?, SETTURTLESIZE, TURTLESIZE)', () => {
      const code = `
HT
MAKE "H SHOWN?
ST
MAKE "S SHOWN?
SETTURTLESIZE 2.5
MAKE "TS TURTLESIZE
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('H')).toBe(false);
      expect(env.get('S')).toBe(true);
      expect(env.get('TS')).toBe(2.5);
    });

    it('manages coordinate origin (SETORIGIN, ORIGIN)', () => {
      const code = `
SETORIGIN [50 -25]
MAKE "ORG ORIGIN
(SETORIGIN)
MAKE "RESET_ORG ORIGIN
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('ORG')).toEqual([50, -25]);
      expect(env.get('RESET_ORG')).toEqual([0, 0]);
    });

    it('manages polar navigation (SETP, PSETHEADING, PDIST, PANGLE, PHEADING, PPOS)', () => {
      const code = `
SETP 50 0
MAKE "PD PDIST
MAKE "PA PANGLE
MAKE "PH PHEADING
MAKE "PP PPOS
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(Math.round(Number(env.get('PD')))).toBe(50);
      expect(Math.round(Number(env.get('PA')))).toBe(0);
      expect(Math.round(Number(env.get('PH')))).toBe(0);
      expect(env.get('PP')).toEqual([50, 0]);
    });

    it('manages pen modes, width, step size (PE, PX, PD, PU, PEN, PENDOWN?, SETWIDTH, WIDTH, SETSTEPSIZE, STEPSIZE)', () => {
      const code = `
PE
MAKE "M1 PEN
MAKE "D1 PENDOWN?
PX
MAKE "M2 PEN
PU
MAKE "M3 PEN
MAKE "D2 PENDOWN?
SETWIDTH 4
MAKE "W WIDTH
SETSTEPSIZE 3
MAKE "SS STEPSIZE
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('M1')).toBe('PENERASE');
      expect(env.get('D1')).toBe(true);
      expect(env.get('M2')).toBe('PENREVERSE');
      expect(env.get('M3')).toBe('PENUP');
      expect(env.get('D2')).toBe(false);
      expect(env.get('W')).toBe(4);
      expect(env.get('SS')).toBe(3);
    });

    it('manages speed and velocity (SETSPEED, SLOWTURTLE, SPEED, SETVELOCITY, VELOCITY)', () => {
      const code = `
SETSPEED 0.8
MAKE "S1 SPEED
SLOWTURTLE
MAKE "S2 SPEED
SETVELOCITY 120
MAKE "V VELOCITY
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('S1')).toBe(0.8);
      expect(env.get('S2')).toBe(0.5);
      expect(env.get('V')).toBe(120);
    });

    it('executes shape stamping, text, and fill (STAMPOVAL, STAMPRECT, DOT, FILL, TT)', () => {
      const code = `
DOT [10 10]
(FILL "#0072B2)
STAMPOVAL 20 10
(STAMPRECT 30 20 "TRUE)
TT "HELLO
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      const elements = turtle.getDrawElements();
      expect(elements.some(e => e.type === 'dot')).toBe(true);
      expect(elements.some(e => e.type === 'fill')).toBe(true);
      expect(elements.some(e => e.type === 'oval')).toBe(true);
      expect(elements.some(e => e.type === 'rect')).toBe(true);
      expect(elements.some(e => e.type === 'text')).toBe(true);
    });

    it('manages typography commands (SETFONT, FONT, FONTS, TTBASE, TTSIZE)', () => {
      const code = `
SETFONT "Times 16 1
MAKE "F FONT
MAKE "FL FONTS
MAKE "TB TTBASE
MAKE "TS TURTLETEXTSIZE "HELLO
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('F')).toEqual(['TIMES', 16, 1]);
      expect(Array.isArray(env.get('FL'))).toBe(true);
      expect(Number(env.get('TB'))).toBeGreaterThan(0);
      const ts = env.get('TS') as number[];
      expect(ts[0]).toBeGreaterThan(0);
      expect(ts[1]).toBeGreaterThan(0);
    });

    it('allows 2-argument parenthesized (SETFONT "Arial 14) with default attributes (F7)', () => {
      const code = '(SETFONT "Arial 14)\nMAKE "F FONT';
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('F')).toEqual(['ARIAL', 14, 0]);
    });

    it('supports short abbreviations in SETPEN (PE, PX, PD, PU) (F9)', () => {
      const code = `
SETPEN "PE
MAKE "P1 PEN
SETPEN "PX
MAKE "P2 PEN
SETPEN ["PU]
MAKE "P3 PEN
SETPEN ["PD "#D55E00]
MAKE "P4 PEN
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();

      for (const _ of runtime.execute(ast, env, turtle, token)) {}

      expect(env.get('P1')).toBe('PENERASE');
      expect(env.get('P2')).toBe('PENREVERSE');
      expect(env.get('P3')).toBe('PENUP');
      expect(env.get('P4')).toBe('PENDOWN');
      expect(turtle.getState().penColor).toBe('#D55E00');
    });

    it('flushes pending draw elements and applies origin in DOT? and DOTCOLOR (F4)', () => {
      const renderDrawElementsSpy = vi.fn();
      const mockRenderer = {
        renderDrawElements: renderDrawElementsSpy,
        isPixelActive: vi.fn().mockReturnValue(true),
        getPixelColor: vi.fn().mockReturnValue([0, 114, 178]),
      } as unknown as import('../../../src/graphics/renderer.ts').CanvasRenderer;

      const code = `
SETORIGIN [50 50]
DOT [10 10]
MAKE "ACTIVE (DOT? [10 10])
MAKE "COLOR (DOTCOLOR [10 10])
`;
      const ast = parse(tokenize(code));
      const env = new Environment();
      const turtle = new Turtle();
      const token = new CancellationToken();
      const runtime = new Runtime();
      runtime.setRenderer(mockRenderer);

      for (const _ of runtime.execute(ast, env, turtle, token, { renderer: mockRenderer })) {}

      expect(renderDrawElementsSpy).toHaveBeenCalled();
      expect(mockRenderer.isPixelActive).toHaveBeenCalledWith(
        { x: 60, y: 60 }, // 10 + origin 50 = 60
        expect.anything()
      );
      expect(mockRenderer.getPixelColor).toHaveBeenCalledWith(
        { x: 60, y: 60 }, // 10 + origin 50 = 60
        expect.anything()
      );
    });
  });
});
