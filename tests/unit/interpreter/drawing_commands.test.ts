import { describe, it, expect, vi } from 'vitest';
import { tokenize } from '../../../src/interpreter/lexer.ts';
import { parse } from '../../../src/interpreter/parser.ts';
import { Environment } from '../../../src/interpreter/environment.ts';
import { Turtle } from '../../../src/graphics/turtle.ts';
import { CanvasRenderer } from '../../../src/graphics/renderer.ts';
import { Runtime, CancellationToken } from '../../../src/interpreter/runtime.ts';

function runScript(code: string, turtle = new Turtle(), renderer?: CanvasRenderer): { env: Environment; turtle: Turtle; runtime: Runtime } {
  const ast = parse(tokenize(code));
  const env = new Environment();
  const token = new CancellationToken();
  const runtime = new Runtime();
  if (renderer) {
    runtime.setRenderer(renderer);
  }
  for (const _ of runtime.execute(ast, env, turtle, token)) {}
  return { env, turtle, runtime };
}

function createMockRenderer(): CanvasRenderer {
  const pCanvas = document.createElement('canvas');
  const sCanvas = document.createElement('canvas');
  pCanvas.width = 800;
  pCanvas.height = 600;
  const pixels = new Uint8ClampedArray(800 * 600 * 4); // 0 = transparent

  let activeFillStyle = '#000000';
  let activeStrokeStyle = '#000000';

  const ctx = {
    scale: vi.fn(),
    clearRect: vi.fn(() => {
      pixels.fill(0);
    }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn((cx: number, cy: number, r: number) => {
      // Paint pixels in circle bounding box
      const minX = Math.max(0, Math.floor(cx - r));
      const maxX = Math.min(799, Math.ceil(cx + r));
      const minY = Math.max(0, Math.floor(cy - r));
      const maxY = Math.min(599, Math.ceil(cy + r));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const idx = (y * 800 + x) * 4;
          pixels[idx] = 0;
          pixels[idx + 1] = 114;
          pixels[idx + 2] = 178;
          pixels[idx + 3] = 255;
        }
      }
    }),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({
      width: 100,
      fontBoundingBoxAscent: 12,
      fontBoundingBoxDescent: 3,
      actualBoundingBoxAscent: 10,
    }),
    getImageData: vi.fn((x: number, y: number) => {
      const clampedX = Math.max(0, Math.min(799, Math.round(x)));
      const clampedY = Math.max(0, Math.min(599, Math.round(y)));
      const idx = (clampedY * 800 + clampedX) * 4;
      return {
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([
          pixels[idx] ?? 0,
          pixels[idx + 1] ?? 0,
          pixels[idx + 2] ?? 0,
          pixels[idx + 3] ?? 0,
        ]),
      };
    }),
    putImageData: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    get strokeStyle() { return activeStrokeStyle; },
    set strokeStyle(v) { activeStrokeStyle = v; },
    get fillStyle() { return activeFillStyle; },
    set fillStyle(v) { activeFillStyle = v; },
    lineWidth: 1,
    font: '',
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(pCanvas, 'getContext').mockReturnValue(ctx);
  vi.spyOn(sCanvas, 'getContext').mockReturnValue(ctx);
  return new CanvasRenderer(pCanvas, sCanvas);
}

describe('Terrapin Logo 56 Drawing Commands Specification Verification', () => {
  describe('Group 1: Motion Commands (15 commands)', () => {
    it('1. FORWARD (FD)', () => {
      const { turtle } = runScript('FORWARD 50 FD 25');
      expect(Math.round(turtle.getState().y)).toBe(75);
    });

    it('2. BACK (BK)', () => {
      const { turtle } = runScript('BACK 30 BK 20');
      expect(Math.round(turtle.getState().y)).toBe(-50);
    });

    it('3. RIGHT (RT)', () => {
      const { turtle } = runScript('RIGHT 45 RT 45');
      expect(turtle.getState().heading).toBe(90);
    });

    it('4. LEFT (LT)', () => {
      const { turtle } = runScript('LEFT 30 LT 15');
      expect(turtle.getState().heading).toBe(315);
    });

    it('5. HOME', () => {
      const { turtle } = runScript('FD 100 RT 90 HOME');
      expect(turtle.getState().x).toBe(0);
      expect(turtle.getState().y).toBe(0);
      expect(turtle.getState().heading).toBe(0);
    });

    it('6. SETXY (SETPOS)', () => {
      const { turtle: t1 } = runScript('SETXY 35 45');
      expect(t1.getState().x).toBe(35);
      expect(t1.getState().y).toBe(45);

      const { turtle: t2 } = runScript('SETPOS [80 90]');
      expect(t2.getState().x).toBe(80);
      expect(t2.getState().y).toBe(90);
    });

    it('7. SETX', () => {
      const { turtle } = runScript('SETX 120');
      expect(turtle.getState().x).toBe(120);
      expect(turtle.getState().y).toBe(0);
    });

    it('8. SETY', () => {
      const { turtle } = runScript('SETY -65');
      expect(turtle.getState().x).toBe(0);
      expect(turtle.getState().y).toBe(-65);
    });

    it('9. GETX (XCOR)', () => {
      const { env } = runScript('SETX 42\nMAKE "X1 GETX\nMAKE "X2 XCOR');
      expect(env.get('X1')).toBe(42);
      expect(env.get('X2')).toBe(42);
    });

    it('10. GETY (YCOR)', () => {
      const { env } = runScript('SETY -99\nMAKE "Y1 GETY\nMAKE "Y2 YCOR');
      expect(env.get('Y1')).toBe(-99);
      expect(env.get('Y2')).toBe(-99);
    });

    it('11. GETXY (POS)', () => {
      const { env } = runScript('SETXY 15 25\nMAKE "P1 GETXY\nMAKE "P2 POS');
      expect(env.get('P1')).toEqual([15, 25]);
      expect(env.get('P2')).toEqual([15, 25]);
    });

    it('12. HEADING', () => {
      const { env } = runScript('RT 135\nMAKE "H HEADING');
      expect(env.get('H')).toBe(135);
    });

    it('13. SETHEADING (SETH)', () => {
      const { turtle: t1 } = runScript('SETHEADING 270');
      expect(t1.getState().heading).toBe(270);

      const { turtle: t2 } = runScript('SETH 180');
      expect(t2.getState().heading).toBe(180);
    });

    it('14. TOWARDS', () => {
      const { env } = runScript('MAKE "T1 TOWARDS 100 0\nMAKE "T2 TOWARDS [0 100]');
      expect(env.get('T1')).toBe(90);  // Towards East (100, 0) is 90°
      expect(env.get('T2')).toBe(0);   // Towards North (0, 100) is 0°
    });

    it('15. DISTANCE', () => {
      const { env } = runScript('MAKE "D1 DISTANCE 30 40\nMAKE "D2 DISTANCE [0 50]');
      expect(env.get('D1')).toBe(50);
      expect(env.get('D2')).toBe(50);
    });
  });

  describe('Group 2: Visibility & Scale Commands (5 commands)', () => {
    it('16. SHOWTURTLE (ST)', () => {
      const { turtle } = runScript('HT ST');
      expect(turtle.getState().isVisible).toBe(true);
    });

    it('17. HIDETURTLE (HT)', () => {
      const { turtle } = runScript('HIDETURTLE');
      expect(turtle.getState().isVisible).toBe(false);
    });

    it('18. SHOWN? (SHOWNP)', () => {
      const { env } = runScript('MAKE "S1 SHOWN?\nHT\nMAKE "S2 SHOWNP');
      expect(env.get('S1')).toBe(true);
      expect(env.get('S2')).toBe(false);
    });

    it('19. TURTLESIZE (TSIZE)', () => {
      const { env } = runScript('MAKE "TS1 TURTLESIZE\nSETTURTLESIZE 3\nMAKE "TS2 TSIZE');
      expect(env.get('TS1')).toBe(1.0);
      expect(env.get('TS2')).toBe(3.0);
    });

    it('20. SETTURTLESIZE (SETTSIZE, SETTS)', () => {
      const { turtle: t1 } = runScript('SETTURTLESIZE 2');
      expect(t1.getTurtleSize()).toBe(2);

      const { turtle: t2 } = runScript('SETTSIZE 1.5');
      expect(t2.getTurtleSize()).toBe(1.5);

      const { turtle: t3 } = runScript('SETTS 0.5');
      expect(t3.getTurtleSize()).toBe(0.5);
    });
  });

  describe('Group 3: Coordinate Origin Commands (2 commands)', () => {
    it('21. ORIGIN', () => {
      const { env } = runScript('SETORIGIN [20 30]\nMAKE "O ORIGIN');
      expect(env.get('O')).toEqual([20, 30]);
    });

    it('22. SETORIGIN', () => {
      const { turtle: t1 } = runScript('SETORIGIN [100 200]');
      expect(t1.getOrigin()).toEqual({ x: 100, y: 200 });

      const { turtle: t2 } = runScript('SETORIGIN 50 60');
      expect(t2.getOrigin()).toEqual({ x: 50, y: 60 });

      const { turtle: t3 } = runScript('SETORIGIN 50 60\n(SETORIGIN)');
      expect(t3.getOrigin()).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Group 4: Polar Coordinates Commands (6 commands)', () => {
    it('23. PDIST', () => {
      const { env } = runScript('SETXY 3 4\nMAKE "D PDIST');
      expect(env.get('D')).toBe(5);
    });

    it('24. PANGLE', () => {
      const { env } = runScript('SETXY 0 10\nMAKE "A PANGLE');
      expect(env.get('A')).toBe(90); // North in polar is 90°
    });

    it('25. PHEADING', () => {
      const { env } = runScript('SETH 90\nMAKE "PH PHEADING');
      expect(env.get('PH')).toBe(0); // East (90° Cartesian) is 0° Polar
    });

    it('26. PSETHEADING (PSETH)', () => {
      const { turtle: t1 } = runScript('PSETHEADING 0');
      expect(t1.getState().heading).toBe(90);

      const { turtle: t2 } = runScript('PSETH 90');
      expect(t2.getState().heading).toBe(0);
    });

    it('27. PPOS', () => {
      const { env } = runScript('SETXY 10 0\nMAKE "P PPOS');
      expect(env.get('P')).toEqual([10, 0]);
    });

    it('28. SETP', () => {
      const { turtle: t1 } = runScript('SETP 20 90');
      expect(Math.round(t1.getState().x)).toBe(0);
      expect(Math.round(t1.getState().y)).toBe(20);
      expect(t1.getState().heading).toBe(0);

      const { turtle: t2 } = runScript('SETP [10 0]');
      expect(Math.round(t2.getState().x)).toBe(10);
      expect(Math.round(t2.getState().y)).toBe(0);
      expect(t2.getState().heading).toBe(90);
    });
  });

  describe('Group 5: Pen Modes & Attributes Commands (11 commands)', () => {
    it('29. PENDOWN (PD)', () => {
      const { turtle } = runScript('PU PD');
      expect(turtle.getPenMode()).toBe('PENDOWN');
    });

    it('30. PENUP (PU)', () => {
      const { turtle } = runScript('PENUP');
      expect(turtle.getPenMode()).toBe('PENUP');
    });

    it('31. PENERASE (PE)', () => {
      const { turtle: t1 } = runScript('PENERASE');
      expect(t1.getPenMode()).toBe('PENERASE');

      const { turtle: t2 } = runScript('PE');
      expect(t2.getPenMode()).toBe('PENERASE');
    });

    it('32. PENREVERSE (PX)', () => {
      const { turtle: t1 } = runScript('PENREVERSE');
      expect(t1.getPenMode()).toBe('PENREVERSE');

      const { turtle: t2 } = runScript('PX');
      expect(t2.getPenMode()).toBe('PENREVERSE');
    });

    it('33. PEN', () => {
      const { env } = runScript('PE\nMAKE "P PEN');
      expect(env.get('P')).toBe('PENERASE');
    });

    it('34. PENDOWN? (PENDOWNP)', () => {
      const { env } = runScript('MAKE "D1 PENDOWN?\nPU\nMAKE "D2 PENDOWNP');
      expect(env.get('D1')).toBe(true);
      expect(env.get('D2')).toBe(false);
    });

    it('35. SETPEN', () => {
      const { turtle: t1 } = runScript('SETPEN "PENERASE');
      expect(t1.getPenMode()).toBe('PENERASE');

      const { turtle: t2 } = runScript('SETPEN ["PENREVERSE "#D55E00]');
      expect(t2.getPenMode()).toBe('PENREVERSE');
      expect(t2.getState().penColor).toBe('#D55E00');
    });

    it('36. SETWIDTH (SETW)', () => {
      const { turtle: t1 } = runScript('SETWIDTH 6');
      expect(t1.getState().penWidth).toBe(6);

      const { turtle: t2 } = runScript('SETW 8');
      expect(t2.getState().penWidth).toBe(8);
    });

    it('37. WIDTH', () => {
      const { env } = runScript('SETWIDTH 5\nMAKE "W WIDTH');
      expect(env.get('W')).toBe(5);
    });

    it('38. SETSTEPSIZE', () => {
      const { turtle } = runScript('SETSTEPSIZE 4\nFD 10');
      expect(Math.round(turtle.getState().y)).toBe(40);
    });

    it('39. STEPSIZE', () => {
      const { env } = runScript('SETSTEPSIZE 7\nMAKE "SS STEPSIZE');
      expect(env.get('SS')).toBe(7);
    });
  });

  describe('Group 6: Speed & Dynamics Commands (5 commands)', () => {
    it('40. SPEED', () => {
      const { env } = runScript('SETSPEED 0.6\nMAKE "SP SPEED');
      expect(env.get('SP')).toBe(0.6);
    });

    it('41. SETSPEED', () => {
      const { turtle } = runScript('SETSPEED 0.3');
      expect(turtle.getSpeed()).toBe(0.3);
    });

    it('42. SLOWTURTLE', () => {
      const { turtle } = runScript('SLOWTURTLE');
      expect(turtle.getSpeed()).toBe(0.5);
    });

    it('43. VELOCITY', () => {
      const { env } = runScript('SETVELOCITY 250\nMAKE "V VELOCITY');
      expect(env.get('V')).toBe(250);
    });

    it('44. SETVELOCITY', () => {
      const { turtle } = runScript('SETVELOCITY 80');
      expect(turtle.getVelocity()).toBe(80);
    });
  });

  describe('Group 7: Shapes, Dots & Fills Commands (6 commands)', () => {
    it('45. DOT', () => {
      const { turtle: t1 } = runScript('DOT [15 25]');
      expect(t1.getDrawElements().some(e => e.type === 'dot' && e.point.x === 15 && e.point.y === 25)).toBe(true);

      const { turtle: t2 } = runScript('(DOT 5 5)');
      expect(t2.getDrawElements().some(e => e.type === 'dot' && e.point.x === 5 && e.point.y === 5)).toBe(true);

      const { turtle: t3 } = runScript('(DOT)');
      expect(t3.getDrawElements().some(e => e.type === 'dot' && e.point.x === 0 && e.point.y === 0)).toBe(true);
    });

    it('46. DOT? (DOTP)', () => {
      const renderer = createMockRenderer();
      const code = `
MAKE "BEFORE DOT?
DOT [10 10]
MAKE "AFTER (DOTP [10 10])
MAKE "UNPAINTED (DOT? [50 50])
`;
      const { env } = runScript(code, new Turtle(), renderer);
      expect(env.get('BEFORE')).toBe(false);
      expect(env.get('AFTER')).toBe(true);
      expect(env.get('UNPAINTED')).toBe(false);
    });

    it('47. DOTCOLOR', () => {
      const renderer = createMockRenderer();
      const code = `
MAKE "C_EMPTY DOTCOLOR
DOT [20 20]
MAKE "C_DRAWN (DOTCOLOR [20 20])
`;
      const { env } = runScript(code, new Turtle(), renderer);
      expect(env.get('C_EMPTY')).toEqual([255, 255, 255]);
      expect(env.get('C_DRAWN')).toEqual([0, 114, 178]);
    });

    it('48. FILL', () => {
      const { turtle: t1 } = runScript('FILL');
      expect(t1.getDrawElements().some(e => e.type === 'fill')).toBe(true);

      const { turtle: t2 } = runScript('(FILL "#CC79A7)');
      expect(t2.getDrawElements().some(e => e.type === 'fill' && e.fillColor === '#CC79A7')).toBe(true);
    });

    it('49. STAMPOVAL', () => {
      const { turtle: t1 } = runScript('STAMPOVAL 50 30');
      const oval1 = t1.getDrawElements().find(e => e.type === 'oval');
      expect(oval1).toBeDefined();
      if (oval1 && oval1.type === 'oval') {
        expect(oval1.xRadius).toBe(50);
        expect(oval1.yRadius).toBe(30);
        expect(oval1.filled).toBe(false);
      }

      const { turtle: t2 } = runScript('(STAMPOVAL 40 20 "TRUE)');
      const oval2 = t2.getDrawElements().find(e => e.type === 'oval');
      expect(oval2).toBeDefined();
      if (oval2 && oval2.type === 'oval') {
        expect(oval2.filled).toBe(true);
      }
    });

    it('50. STAMPRECT', () => {
      const { turtle: t1 } = runScript('STAMPRECT 60 40');
      const rect1 = t1.getDrawElements().find(e => e.type === 'rect');
      expect(rect1).toBeDefined();
      if (rect1 && rect1.type === 'rect') {
        expect(rect1.width).toBe(60);
        expect(rect1.height).toBe(40);
        expect(rect1.filled).toBe(false);
      }

      const { turtle: t2 } = runScript('(STAMPRECT 80 50 "TRUE)');
      const rect2 = t2.getDrawElements().find(e => e.type === 'rect');
      expect(rect2).toBeDefined();
      if (rect2 && rect2.type === 'rect') {
        expect(rect2.filled).toBe(true);
      }
    });
  });

  describe('Group 8: Typography Commands (6 commands)', () => {
    it('51. FONT', () => {
      const { env } = runScript('MAKE "F FONT');
      expect(env.get('F')).toEqual(['Arial', 12, 0]);
    });

    it('52. FONTS', () => {
      const { env } = runScript('MAKE "FL FONTS');
      const list = env.get('FL') as string[];
      expect(list).toContain('Arial');
      expect(list).toContain('Courier New');
    });

    it('53. SETFONT', () => {
      const { turtle: t1 } = runScript('SETFONT "Courier 18 2');
      expect(t1.getFont()).toEqual({ name: 'COURIER', size: 18, attributes: 2 });

      const { turtle: t2 } = runScript('(SETFONT)');
      expect(t2.getFont()).toEqual({ name: 'Arial', size: 12, attributes: 0 });
    });

    it('54. TURTLETEXT (TT)', () => {
      const { turtle: t1 } = runScript('TURTLETEXT "TERRAPIN');
      const text1 = t1.getDrawElements().find(e => e.type === 'text');
      expect(text1).toBeDefined();
      if (text1 && text1.type === 'text') {
        expect(text1.text).toBe('TERRAPIN');
      }

      const { turtle: t2 } = runScript('TT [LOGO RULES]');
      const text2 = t2.getDrawElements().find(e => e.type === 'text');
      expect(text2).toBeDefined();
      if (text2 && text2.type === 'text') {
        expect(text2.text).toBe('LOGO RULES');
      }
    });

    it('55. TURTLETEXTBASE (TTBASE)', () => {
      const renderer = createMockRenderer();
      const { env } = runScript('MAKE "TB1 TURTLETEXTBASE\nMAKE "TB2 TTBASE', new Turtle(), renderer);
      expect(Number(env.get('TB1'))).toBeGreaterThan(0);
      expect(Number(env.get('TB2'))).toBeGreaterThan(0);
    });

    it('56. TURTLETEXTSIZE (TTSIZE)', () => {
      const renderer = createMockRenderer();
      const { env } = runScript('MAKE "S1 TURTLETEXTSIZE "LOGO\nMAKE "S2 TTSIZE [HELLO WORLD]', new Turtle(), renderer);
      const s1 = env.get('S1') as number[];
      const s2 = env.get('S2') as number[];
      expect(s1[0]).toBeGreaterThan(0);
      expect(s1[1]).toBeGreaterThan(0);
      expect(s2[0]).toBeGreaterThan(0);
      expect(s2[1]).toBeGreaterThan(0);
    });
  });

  describe('Edge-Case & Robustness Verification', () => {
    it('supports negative coordinates in parenthesized commands: (DOT -10 -20)', () => {
      const { turtle } = runScript('(DOT -10 -20)');
      const elements = turtle.getDrawElements();
      const dotEl = elements.find(e => e.type === 'dot');
      expect(dotEl).toBeDefined();
      if (dotEl && dotEl.type === 'dot') {
        expect(dotEl.point).toEqual({ x: -10, y: -20 });
      }
    });

    it('supports parenthesized STAMPOVAL with negative radii: (STAMPOVAL -50 50 "TRUE)', () => {
      const { turtle } = runScript('(STAMPOVAL -50 50 "TRUE)');
      const elements = turtle.getDrawElements();
      const ovalEl = elements.find(e => e.type === 'oval');
      expect(ovalEl).toBeDefined();
      if (ovalEl && ovalEl.type === 'oval') {
        expect(ovalEl.xRadius).toBe(-50);
        expect(ovalEl.yRadius).toBe(50);
        expect(ovalEl.filled).toBe(true);
      }
    });

    it('supports parenthesized STAMPRECT with negative dimensions: (STAMPRECT -40 30 "TRUE)', () => {
      const { turtle } = runScript('(STAMPRECT -40 30 "TRUE)');
      const elements = turtle.getDrawElements();
      const rectEl = elements.find(e => e.type === 'rect');
      expect(rectEl).toBeDefined();
      if (rectEl && rectEl.type === 'rect') {
        expect(rectEl.width).toBe(-40);
        expect(rectEl.height).toBe(30);
        expect(rectEl.filled).toBe(true);
      }
    });

    it('verifies SETORIGIN and turtle sprite and path alignment under origin shifts', () => {
      const { turtle } = runScript('SETORIGIN 100 -50\nFD 40');
      const state = turtle.getState();
      expect(state.origin).toEqual({ x: 100, y: -50 });
      expect(state.x).toBe(0);
      expect(state.y).toBe(40);

      const segments = turtle.getPathSegments();
      expect(segments.length).toBe(1);
      expect(segments[0]?.from).toEqual({ x: 100, y: -50 });
      expect(segments[0]?.to).toEqual({ x: 100, y: -10 });

      // Reset origin
      const { turtle: resetTurtle } = runScript('SETORIGIN 100 -50\n(SETORIGIN)\nFD 20');
      expect(resetTurtle.getState().origin).toEqual({ x: 0, y: 0 });
      const resetSegs = resetTurtle.getPathSegments();
      expect(resetSegs[0]?.from).toEqual({ x: 0, y: 0 });
      expect(resetSegs[0]?.to).toEqual({ x: 0, y: 20 });
    });

    it('verifies DOT? and DOTCOLOR accuracy on blank, painted, and out-of-bounds canvas', () => {
      const renderer = createMockRenderer();
      const code = `
MAKE "BLANK_QUERY DOT?
MAKE "BLANK_COLOR DOTCOLOR
DOT [30 30]
MAKE "PAINTED_QUERY (DOT? [30 30])
MAKE "PAINTED_COLOR (DOTCOLOR [30 30])
MAKE "OOB_QUERY (DOT? [9999 9999])
MAKE "OOB_COLOR (DOTCOLOR [9999 9999])
`;
      const { env } = runScript(code, new Turtle(), renderer);
      expect(env.get('BLANK_QUERY')).toBe(false);
      expect(env.get('BLANK_COLOR')).toEqual([255, 255, 255]);
      expect(env.get('PAINTED_QUERY')).toBe(true);
      expect(env.get('PAINTED_COLOR')).toEqual([0, 114, 178]);
      expect(env.get('OOB_QUERY')).toBe(false);
      expect(env.get('OOB_COLOR')).toEqual([255, 255, 255]);
    });

    it('verifies flood fill (FILL) behavior, bounds safety, and custom colors', () => {
      const { turtle: t1 } = runScript('SETXY 10 20\nFILL');
      const el1 = t1.getDrawElements().find(e => e.type === 'fill');
      expect(el1).toBeDefined();
      if (el1 && el1.type === 'fill') {
        expect(el1.startPoint).toEqual({ x: 10, y: 20 });
        expect(el1.fillColor).toBe('#0072B2');
      }

      const { turtle: t2 } = runScript('(FILL "#D55E00)');
      const el2 = t2.getDrawElements().find(e => e.type === 'fill');
      expect(el2).toBeDefined();
      if (el2 && el2.type === 'fill') {
        expect(el2.fillColor).toBe('#D55E00');
      }
    });

    it('verifies SETPEN with all shorthand modes (PE, PU, PD, PX) and combined arrays', () => {
      const { turtle: tPE } = runScript('SETPEN "PE');
      expect(tPE.getPenMode()).toBe('PENERASE');
      expect(tPE.isPenDownMode()).toBe(true);

      const { turtle: tPU } = runScript('SETPEN "PU');
      expect(tPU.getPenMode()).toBe('PENUP');
      expect(tPU.isPenDownMode()).toBe(false);

      const { turtle: tPD } = runScript('PU\nSETPEN "PD');
      expect(tPD.getPenMode()).toBe('PENDOWN');
      expect(tPD.isPenDownMode()).toBe(true);

      const { turtle: tPX } = runScript('SETPEN "PX');
      expect(tPX.getPenMode()).toBe('PENREVERSE');
      expect(tPX.isPenDownMode()).toBe(true);

      const { turtle: tArr } = runScript('SETPEN ["PE "#CC79A7]');
      expect(tArr.getPenMode()).toBe('PENERASE');
      expect(tArr.getState().penColor).toBe('#CC79A7');
    });

    it('verifies TURTLETEXT, TTBASE, TTSIZE, and SETFONT variants', () => {
      const renderer = createMockRenderer();
      const code = `
(SETFONT)
MAKE "F_DEFAULT FONT
SETFONT "Courier 16 3
MAKE "F_CUSTOM FONT
SETFONT ["Times 14 1]
MAKE "F_LIST FONT
TURTLETEXT [HELLO WORLD]
TT "SOLO
MAKE "BASE TTBASE
MAKE "SZ TTSIZE [HELLO WORLD]
`;
      const { env, turtle } = runScript(code, new Turtle(), renderer);
      expect(env.get('F_DEFAULT')).toEqual(['Arial', 12, 0]);
      expect(env.get('F_CUSTOM')).toEqual(['COURIER', 16, 3]);
      expect(env.get('F_LIST')).toEqual(['TIMES', 14, 1]);

      const textElements = turtle.getDrawElements().filter(e => e.type === 'text');
      expect(textElements.length).toBe(2);
      expect(textElements[0]?.type === 'text' && textElements[0].text).toBe('HELLO WORLD');
      expect(textElements[1]?.type === 'text' && textElements[1].text).toBe('SOLO');

      expect(Number(env.get('BASE'))).toBeGreaterThan(0);
      expect((env.get('SZ') as number[])[0]).toBeGreaterThan(0);
      expect((env.get('SZ') as number[])[1]).toBeGreaterThan(0);
    });
  });
});
