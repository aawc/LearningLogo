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
});
