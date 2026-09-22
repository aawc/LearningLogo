import { describe, it, expect } from 'vitest';
import { CoordinateTransform } from '../../../src/graphics/coordinates.ts';

describe('Cartesian Coordinate Transformations & Trigonometry', () => {
  const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };

  it('projects Logo origin (0,0) to center of canvas (400, 300)', () => {
    const canvasPt = CoordinateTransform.logoToCanvas({ x: 0, y: 0 }, viewport);
    expect(canvasPt.x).toBe(400);
    expect(canvasPt.y).toBe(300);
  });

  it('inverts Y-axis so positive Y extends North (up on screen)', () => {
    const canvasPt = CoordinateTransform.logoToCanvas({ x: 0, y: 100 }, viewport);
    expect(canvasPt.x).toBe(400);
    expect(canvasPt.y).toBe(200);
  });

  it('maps positive X to East (right on screen)', () => {
    const canvasPt = CoordinateTransform.logoToCanvas({ x: 100, y: 0 }, viewport);
    expect(canvasPt.x).toBe(500);
    expect(canvasPt.y).toBe(300);
  });

  it('applies zoom scaling centered at canvas origin', () => {
    const zoomedViewport = { width: 800, height: 600, zoom: 2, panX: 0, panY: 0 };
    const canvasPt = CoordinateTransform.logoToCanvas({ x: 50, y: 50 }, zoomedViewport);
    expect(canvasPt.x).toBe(500); // 400 + 50*2
    expect(canvasPt.y).toBe(200); // 300 - 50*2
  });

  it('calculates displacement for cardinal headings', () => {
    // 0 deg: North (dx=0, dy=100)
    const north = CoordinateTransform.calculateDisplacement(100, 0);
    expect(Math.round(north.x)).toBe(0);
    expect(Math.round(north.y)).toBe(100);

    // 90 deg: East (dx=100, dy=0)
    const east = CoordinateTransform.calculateDisplacement(100, 90);
    expect(Math.round(east.x)).toBe(100);
    expect(Math.round(east.y)).toBe(0);

    // 180 deg: South (dx=0, dy=-100)
    const south = CoordinateTransform.calculateDisplacement(100, 180);
    expect(Math.round(south.x)).toBe(0);
    expect(Math.round(south.y)).toBe(-100);

    // 270 deg: West (dx=-100, dy=0)
    const west = CoordinateTransform.calculateDisplacement(100, 270);
    expect(Math.round(west.x)).toBe(-100);
    expect(Math.round(west.y)).toBe(0);
  });

  it('normalizes heading angles to [0, 360)', () => {
    expect(CoordinateTransform.normalizeHeading(450)).toBe(90);
    expect(CoordinateTransform.normalizeHeading(-90)).toBe(270);
    expect(CoordinateTransform.normalizeHeading(-360)).toBe(0);
    expect(CoordinateTransform.normalizeHeading(360)).toBe(0);
  });

  it('inversely maps canvas coordinate back to Logo coordinate', () => {
    const logoPt = CoordinateTransform.canvasToLogo({ x: 500, y: 200 }, viewport);
    expect(logoPt.x).toBe(100);
    expect(logoPt.y).toBe(100);
  });
});
