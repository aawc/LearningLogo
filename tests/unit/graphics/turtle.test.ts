import { describe, it, expect } from 'vitest';
import { Turtle } from '../../../src/graphics/turtle.ts';

describe('Turtle State Machine', () => {
  it('initializes at origin (0, 0) facing North (0 deg) with pen down', () => {
    const turtle = new Turtle();
    const state = turtle.getState();
    expect(state.x).toBe(0);
    expect(state.y).toBe(0);
    expect(state.heading).toBe(0);
    expect(state.isPenDown).toBe(true);
    expect(state.isVisible).toBe(true);
    expect(state.penColor).toBe('#0072B2');
    expect(turtle.getPathSegments().length).toBe(0);
  });

  it('moves forward recording line segment when pen is down', () => {
    const turtle = new Turtle();
    turtle.forward(100);

    const state = turtle.getState();
    expect(Math.round(state.x)).toBe(0);
    expect(Math.round(state.y)).toBe(100);

    const segments = turtle.getPathSegments();
    expect(segments.length).toBe(1);
    expect(segments[0]?.from).toEqual({ x: 0, y: 0 });
    expect(Math.round(segments[0]?.to.x ?? 0)).toBe(0);
    expect(Math.round(segments[0]?.to.y ?? 0)).toBe(100);
  });

  it('does not record line segments when pen is up', () => {
    const turtle = new Turtle();
    turtle.penUp();
    turtle.forward(50);

    expect(turtle.getState().isPenDown).toBe(false);
    expect(turtle.getPathSegments().length).toBe(0);
    expect(Math.round(turtle.getState().y)).toBe(50);
  });

  it('turns right and left updating heading accurately', () => {
    const turtle = new Turtle();
    turtle.right(90);
    expect(turtle.getState().heading).toBe(90);

    turtle.forward(100);
    expect(Math.round(turtle.getState().x)).toBe(100);
    expect(Math.round(turtle.getState().y)).toBe(0);

    turtle.left(45);
    expect(turtle.getState().heading).toBe(45);
  });

  it('clears screen and resets path segments on CLEARSCREEN', () => {
    const turtle = new Turtle();
    turtle.forward(100);
    expect(turtle.getPathSegments().length).toBe(1);

    turtle.clearScreen();
    expect(turtle.getPathSegments().length).toBe(0);
    expect(turtle.getState().x).toBe(0);
    expect(turtle.getState().y).toBe(0);
    expect(turtle.getState().heading).toBe(0);
  });

  it('sets X coordinate and draws segment when pen is down', () => {
    const turtle = new Turtle();
    turtle.setX(75);
    expect(turtle.getState().x).toBe(75);
    expect(turtle.getState().y).toBe(0);
    expect(turtle.getPathSegments().length).toBe(1);
    expect(turtle.getPathSegments()[0]?.to).toEqual({ x: 75, y: 0 });
  });

  it('sets Y coordinate and draws segment when pen is down', () => {
    const turtle = new Turtle();
    turtle.setY(-50);
    expect(turtle.getState().x).toBe(0);
    expect(turtle.getState().y).toBe(-50);
    expect(turtle.getPathSegments().length).toBe(1);
    expect(turtle.getPathSegments()[0]?.to).toEqual({ x: 0, y: -50 });
  });

  it('sets heading directly with normalization', () => {
    const turtle = new Turtle();
    turtle.setHeading(450); // 450 % 360 = 90
    expect(turtle.getState().heading).toBe(90);
  });

  it('cleans path segments without moving turtle or altering heading', () => {
    const turtle = new Turtle();
    turtle.forward(100);
    turtle.right(45);
    expect(turtle.getPathSegments().length).toBe(1);

    turtle.clean();
    expect(turtle.getPathSegments().length).toBe(0);
    expect(Math.round(turtle.getState().y)).toBe(100);
    expect(turtle.getState().heading).toBe(45);
  });

  describe('Origin Offsets & Distance Calculations', () => {
    it('manages coordinate origin offset', () => {
      const turtle = new Turtle();
      expect(turtle.getOrigin()).toEqual({ x: 0, y: 0 });
      expect(turtle.getState().origin).toEqual({ x: 0, y: 0 });

      turtle.setOrigin(100, -50);
      expect(turtle.getOrigin()).toEqual({ x: 100, y: -50 });
      expect(turtle.getState().origin).toEqual({ x: 100, y: -50 });

      turtle.resetOrigin();
      expect(turtle.getOrigin()).toEqual({ x: 0, y: 0 });
    });

    it('calculates distance to target point', () => {
      const turtle = new Turtle();
      turtle.setXY(10, 20);
      expect(turtle.distanceTo(40, 60)).toBe(50);
    });
  });

  describe('Polar Navigation', () => {
    it('reports polar distance, angle, and position', () => {
      const turtle = new Turtle();
      turtle.setXY(30, 40);
      expect(turtle.getPolarDistance()).toBe(50);
      // Math.atan2(40, 30) * 180 / Math.PI ≈ 53.13°
      expect(Math.round(turtle.getPolarAngle() * 100) / 100).toBe(53.13);
      const polarPos = turtle.getPolarPos();
      expect(polarPos[0]).toBe(50);
      expect(Math.round(polarPos[1] * 100) / 100).toBe(53.13);
    });

    it('reports and sets polar heading', () => {
      const turtle = new Turtle();
      // Initially facing North (0° Cartesian -> 90° Polar)
      expect(turtle.getPolarHeading()).toBe(90);

      turtle.setPolarHeading(0); // East in polar -> 90° Cartesian
      expect(turtle.getState().heading).toBe(90);
      expect(turtle.getPolarHeading()).toBe(0);

      turtle.setPolarHeading(270); // South in polar -> 180° Cartesian
      expect(turtle.getState().heading).toBe(180);
      expect(turtle.getPolarHeading()).toBe(270);
    });

    it('sets polar position (distance and angle) and aims turtle at that polar heading', () => {
      const turtle = new Turtle();
      // Move to 100 units at 0° polar (East)
      turtle.setPolarPos(100, 0);
      expect(Math.round(turtle.getState().x)).toBe(100);
      expect(Math.round(turtle.getState().y)).toBe(0);
      expect(turtle.getPolarHeading()).toBe(0);
      expect(turtle.getState().heading).toBe(90); // 90° Cartesian is East
    });
  });

  describe('Scale, Speed, Velocity & Step Size', () => {
    it('manages turtle visual scale with clamping [0.01, 99.0]', () => {
      const turtle = new Turtle();
      expect(turtle.getTurtleSize()).toBe(1.0);

      turtle.setTurtleSize(2.5);
      expect(turtle.getTurtleSize()).toBe(2.5);

      turtle.setTurtleSize(0.005);
      expect(turtle.getTurtleSize()).toBe(0.01);

      turtle.setTurtleSize(150);
      expect(turtle.getTurtleSize()).toBe(99.0);
    });

    it('manages speed clamped [0.1, 1.0] and resets velocity to 0 on speed change', () => {
      const turtle = new Turtle();
      expect(turtle.getSpeed()).toBe(1.0);
      expect(turtle.getVelocity()).toBe(0);

      turtle.setVelocity(100);
      expect(turtle.getVelocity()).toBe(100);

      turtle.setSpeed(0.5);
      expect(turtle.getSpeed()).toBe(0.5);
      expect(turtle.getVelocity()).toBe(0); // reset by setSpeed

      turtle.setSpeed(0.01);
      expect(turtle.getSpeed()).toBe(0.1);

      turtle.setSpeed(2.0);
      expect(turtle.getSpeed()).toBe(1.0);
    });

    it('applies step size multiplier to forward and back movements', () => {
      const turtle = new Turtle();
      expect(turtle.getStepSize()).toBe(1);

      turtle.setStepSize(5);
      expect(turtle.getStepSize()).toBe(5);

      turtle.forward(10); // 10 * 5 = 50
      expect(Math.round(turtle.getState().y)).toBe(50);

      turtle.back(4); // 4 * 5 = 20
      expect(Math.round(turtle.getState().y)).toBe(30);
    });

    it('guards numerical setters against NaN', () => {
      const turtle = new Turtle();
      turtle.setTurtleSize(NaN);
      expect(Number.isFinite(turtle.getTurtleSize())).toBe(true);

      turtle.setStepSize(NaN);
      expect(Number.isFinite(turtle.getStepSize())).toBe(true);

      turtle.setPenWidth(NaN);
      expect(Number.isFinite(turtle.getState().penWidth)).toBe(true);
    });
  });

  describe('Pen Modes & Typography', () => {
    it('manages pen modes: PENDOWN, PENUP, PENERASE, PENREVERSE', () => {
      const turtle = new Turtle();
      expect(turtle.getPenMode()).toBe('PENDOWN');
      expect(turtle.isPenDownMode()).toBe(true);

      turtle.penUp();
      expect(turtle.getPenMode()).toBe('PENUP');
      expect(turtle.isPenDownMode()).toBe(false);

      turtle.penErase();
      expect(turtle.getPenMode()).toBe('PENERASE');
      expect(turtle.isPenDownMode()).toBe(true);

      turtle.penReverse();
      expect(turtle.getPenMode()).toBe('PENREVERSE');
      expect(turtle.isPenDownMode()).toBe(true);

      turtle.setPenMode('PENDOWN');
      expect(turtle.getPenMode()).toBe('PENDOWN');
    });

    it('manages font state and font listing', () => {
      const turtle = new Turtle();
      expect(turtle.getFont()).toEqual({ name: 'Arial', size: 12, attributes: 0 });

      turtle.setFont('Times New Roman', 16, 1);
      expect(turtle.getFont()).toEqual({ name: 'Times New Roman', size: 16, attributes: 1 });

      turtle.resetFont();
      expect(turtle.getFont()).toEqual({ name: 'Arial', size: 12, attributes: 0 });

      const fonts = turtle.getFonts();
      expect(fonts).toContain('Arial');
      expect(fonts).toContain('Courier New');
    });
  });

  describe('Drawing Element Model (DrawElement)', () => {
    it('records dot elements when pen is active', () => {
      const turtle = new Turtle();
      turtle.setXY(50, 50);
      turtle.dot();

      const elements = turtle.getDrawElements();
      const dotEl = elements.find(el => el.type === 'dot');
      expect(dotEl).toBeDefined();
      if (dotEl && dotEl.type === 'dot') {
        expect(dotEl.point).toEqual({ x: 50, y: 50 });
        expect(dotEl.color).toBe('#0072B2');
      }
    });

    it('records shape stamps (oval and rect)', () => {
      const turtle = new Turtle();
      turtle.stampOval(40, 20, true, '#D55E00');
      turtle.stampRect(60, 30, false);

      const elements = turtle.getDrawElements();
      const oval = elements.find(el => el.type === 'oval');
      expect(oval).toBeDefined();
      if (oval && oval.type === 'oval') {
        expect(oval.xRadius).toBe(40);
        expect(oval.yRadius).toBe(20);
        expect(oval.filled).toBe(true);
        expect(oval.color).toBe('#D55E00');
      }

      const rect = elements.find(el => el.type === 'rect');
      expect(rect).toBeDefined();
      if (rect && rect.type === 'rect') {
        expect(rect.width).toBe(60);
        expect(rect.height).toBe(30);
        expect(rect.filled).toBe(false);
      }
    });

    it('records text and fill elements', () => {
      const turtle = new Turtle();
      turtle.turtleText('Hello Logo');
      turtle.fill('#009E73');

      const elements = turtle.getDrawElements();
      const textEl = elements.find(el => el.type === 'text');
      expect(textEl).toBeDefined();
      if (textEl && textEl.type === 'text') {
        expect(textEl.text).toBe('Hello Logo');
        expect(textEl.font.name).toBe('Arial');
      }

      const fillEl = elements.find(el => el.type === 'fill');
      expect(fillEl).toBeDefined();
      if (fillEl && fillEl.type === 'fill') {
        expect(fillEl.fillColor).toBe('#009E73');
      }
    });

    it('clears all drawElements on clean() and clearScreen()', () => {
      const turtle = new Turtle();
      turtle.forward(10);
      turtle.dot();
      expect(turtle.getDrawElements().length).toBeGreaterThan(0);

      turtle.clean();
      expect(turtle.getDrawElements().length).toBe(0);

      turtle.stampOval(20, 20);
      expect(turtle.getDrawElements().length).toBe(1);

      turtle.clearScreen();
      expect(turtle.getDrawElements().length).toBe(0);
    });
  });
});
