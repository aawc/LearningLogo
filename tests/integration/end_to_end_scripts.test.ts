import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/interpreter/lexer.ts';
import { parse } from '../../src/interpreter/parser.ts';
import { Environment } from '../../src/interpreter/environment.ts';
import { Turtle } from '../../src/graphics/turtle.ts';
import { Runtime, CancellationToken } from '../../src/interpreter/runtime.ts';

function runProgram(code: string): { turtle: Turtle; env: Environment } {
  const tokens = tokenize(code);
  const ast = parse(tokens);
  const env = new Environment();
  const turtle = new Turtle();
  const cancelToken = new CancellationToken();
  const runtime = new Runtime();

  for (const _ of runtime.execute(ast, env, turtle, cancelToken)) {
    // iterate through execution
  }

  return { turtle, env };
}

describe('End-to-End Logo Geometric Integration Suite', () => {
  it('executes closed square and returns turtle to origin facing North', () => {
    const code = `
      CS
      REPEAT 4 [ FD 100 RT 90 ]
    `;
    const { turtle } = runProgram(code);
    const state = turtle.getState();

    expect(Math.abs(state.x)).toBeLessThan(1e-10);
    expect(Math.abs(state.y)).toBeLessThan(1e-10);
    expect(state.heading).toBe(0);

    const segments = turtle.getPathSegments();
    expect(segments.length).toBe(4);
  });

  it('executes parametric regular hexagon returning to origin', () => {
    const code = `
      TO POLYGON :SIDES :LENGTH
        REPEAT :SIDES [ FD :LENGTH RT 360 / :SIDES ]
      END
      CS
      POLYGON 6 50
    `;
    const { turtle } = runProgram(code);
    const state = turtle.getState();

    expect(Math.abs(state.x)).toBeLessThan(1e-10);
    expect(Math.abs(state.y)).toBeLessThan(1e-10);
    expect(state.heading).toBe(0);

    const segments = turtle.getPathSegments();
    expect(segments.length).toBe(6);
  });

  it('executes composite house program with procedural decomposition', () => {
    const code = `
      TO SQUARE :SIDE
        REPEAT 4 [ FD :SIDE RT 90 ]
      END
      TO TRIANGLE :SIDE
        REPEAT 3 [ FD :SIDE RT 120 ]
      END
      TO HOUSE :SIDE
        SQUARE :SIDE
        FD :SIDE
        RT 30
        TRIANGLE :SIDE
      END
      CS
      HOUSE 100
    `;
    const { turtle } = runProgram(code);
    const segments = turtle.getPathSegments();
    // 4 square sides + 1 vertical move to roof + 3 triangle sides = 8 segments
    expect(segments.length).toBe(8);
  });

  it('accumulates loop counter variable correctly', () => {
    const code = `
      MAKE "TOTAL 0
      REPEAT 5 [ MAKE "TOTAL :TOTAL + REPCOUNT ]
    `;
    const { env } = runProgram(code);
    expect(env.get('TOTAL')).toBe(15);
  });
});
