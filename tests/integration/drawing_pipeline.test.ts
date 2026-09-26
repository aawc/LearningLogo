import { describe, it, expect, vi } from 'vitest';
import { tokenize } from '../../src/interpreter/lexer.ts';
import { parse } from '../../src/interpreter/parser.ts';
import { Environment } from '../../src/interpreter/environment.ts';
import { Turtle } from '../../src/graphics/turtle.ts';
import { CanvasRenderer } from '../../src/graphics/renderer.ts';
import { Runtime, CancellationToken } from '../../src/interpreter/runtime.ts';

function createMockRenderer(): CanvasRenderer {
  const pCanvas = document.createElement('canvas');
  const sCanvas = document.createElement('canvas');
  const ctx = {
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({
      width: 80,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 2,
    }),
    getImageData: vi.fn().mockReturnValue({
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([0, 114, 178, 255]),
    }),
    putImageData: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(pCanvas, 'getContext').mockReturnValue(ctx);
  vi.spyOn(sCanvas, 'getContext').mockReturnValue(ctx);
  return new CanvasRenderer(pCanvas, sCanvas);
}

function runScript(code: string, renderer?: CanvasRenderer): { turtle: Turtle; env: Environment; runtime: Runtime } {
  const tokens = tokenize(code);
  const ast = parse(tokens);
  const env = new Environment();
  const turtle = new Turtle();
  const token = new CancellationToken();
  const runtime = new Runtime();
  if (renderer) {
    runtime.setRenderer(renderer);
  }

  for (const _ of runtime.execute(ast, env, turtle, token)) {}
  return { turtle, env, runtime };
}

describe('End-to-End Drawing Pipeline Integration Suite', () => {
  it('executes a polar spiral generating line segments at increasing radii and angles', () => {
    const code = `
      CS
      REPEAT 36 [
        SETP (REPCOUNT * 5) (REPCOUNT * 10)
      ]
    `;
    const { turtle } = runScript(code);
    const elements = turtle.getDrawElements();
    expect(elements.length).toBe(36);
    expect(elements.every(e => e.type === 'line')).toBe(true);

    // After 36 iterations, polar distance is 36 * 5 = 180, polar angle is (36 * 10) % 360 = 0
    expect(Math.round(turtle.getPolarDistance())).toBe(180);
    expect(Math.round(turtle.getPolarAngle())).toBe(0);
  });

  it('renders stamped geometric art with nested shapes and rotation', () => {
    const code = `
      CS
      REPEAT 4 [
        STAMPOVAL 40 20
        (STAMPRECT 30 30 "TRUE)
        RT 90
      ]
    `;
    const { turtle } = runScript(code);
    const elements = turtle.getDrawElements();
    // 4 iterations * (1 oval + 1 rect) = 8 draw elements
    expect(elements.length).toBe(8);

    const ovals = elements.filter(e => e.type === 'oval');
    const rects = elements.filter(e => e.type === 'rect');
    expect(ovals.length).toBe(4);
    expect(rects.length).toBe(4);
    expect(rects.every(r => r.type === 'rect' && r.filled === true)).toBe(true);
  });

  it('shifts origin across multiple coordinate systems', () => {
    const code = `
      CS
      SETORIGIN [100 100]
      FD 50
      (SETORIGIN)
      FD 50
    `;
    const { turtle } = runScript(code);
    const elements = turtle.getDrawElements();
    expect(elements.length).toBe(2);

    // First segment drawn with origin [100, 100]: from {x: 100, y: 100} to {x: 100, y: 150}
    expect(elements[0]?.type).toBe('line');
    if (elements[0]?.type === 'line') {
      expect(elements[0].from).toEqual({ x: 100, y: 100 });
      expect(Math.round(elements[0].to.x)).toBe(100);
      expect(Math.round(elements[0].to.y)).toBe(150);
    }

    // Second segment drawn with reset origin [0, 0]
    expect(elements[1]?.type).toBe('line');
    if (elements[1]?.type === 'line') {
      expect(Math.round(elements[1].from.x)).toBe(0);
      expect(Math.round(elements[1].from.y)).toBe(50);
      expect(Math.round(elements[1].to.x)).toBe(0);
      expect(Math.round(elements[1].to.y)).toBe(100);
    }
  });

  it('combines pen erase and pen reverse overlays', () => {
    const code = `
      CS
      FD 100
      PE
      BK 50
      PX
      FD 25
      PD
      FD 25
    `;
    const { turtle } = runScript(code);
    const elements = turtle.getDrawElements();
    expect(elements.length).toBe(4);
    expect(elements[0]?.mode).toBe('PENDOWN');
    expect(elements[1]?.mode).toBe('PENERASE');
    expect(elements[2]?.mode).toBe('PENREVERSE');
    expect(elements[3]?.mode).toBe('PENDOWN');
  });

  it('aligns typography using TTBASE and TTSIZE reporters', () => {
    const renderer = createMockRenderer();
    const code = `
      SETFONT "Helvetica 14 0
      MAKE "BASE TTBASE
      MAKE "DIMS TTSIZE "LOGO
      SETY :BASE
      TT "LOGO
    `;
    const { turtle, env } = runScript(code, renderer);
    expect(Number(env.get('BASE'))).toBeGreaterThan(0);
    expect((env.get('DIMS') as number[])[0]).toBeGreaterThan(0);

    const elements = turtle.getDrawElements();
    const textEl = elements.find(e => e.type === 'text');
    expect(textEl).toBeDefined();
    if (textEl && textEl.type === 'text') {
      expect(textEl.text).toBe('LOGO');
    }
  });

  it('executes flood fill bounded regions in pipeline', () => {
    const renderer = createMockRenderer();
    const code = `
      CS
      REPEAT 4 [ FD 50 RT 90 ]
      PU
      SETXY 25 25
      PD
      (FILL "#0072B2)
    `;
    const { turtle } = runScript(code, renderer);
    const elements = turtle.getDrawElements();
    const fillEl = elements.find(e => e.type === 'fill');
    expect(fillEl).toBeDefined();
    if (fillEl && fillEl.type === 'fill') {
      expect(fillEl.fillColor).toBe('#0072B2');
      expect(fillEl.startPoint).toEqual({ x: 25, y: 25 });
    }
  });
});
