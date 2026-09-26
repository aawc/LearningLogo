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

  describe('Euclidean Distance and Polar Coordinate Math', () => {
    it('calculates Euclidean distance between two points', () => {
      const p1 = { x: 10, y: 20 };
      const p2 = { x: 40, y: 60 };
      expect(CoordinateTransform.calculateDistance(p1, p2)).toBe(50);
      expect(CoordinateTransform.calculateDistance(p1, p1)).toBe(0);
    });

    it('calculates polar distance (hypotenuse) from displacement', () => {
      expect(CoordinateTransform.cartesianToPolarDistance(3, 4)).toBe(5);
      expect(CoordinateTransform.cartesianToPolarDistance(0, 0)).toBe(0);
      expect(CoordinateTransform.cartesianToPolarDistance(-5, 12)).toBe(13);
    });

    it('calculates polar angle in degrees counter-clockwise from East [0, 360)', () => {
      // East (10, 0) -> 0 deg
      expect(CoordinateTransform.cartesianToPolarAngle(10, 0)).toBe(0);
      // North (0, 10) -> 90 deg
      expect(CoordinateTransform.cartesianToPolarAngle(0, 10)).toBe(90);
      // West (-10, 0) -> 180 deg
      expect(CoordinateTransform.cartesianToPolarAngle(-10, 0)).toBe(180);
      // South (0, -10) -> 270 deg
      expect(CoordinateTransform.cartesianToPolarAngle(0, -10)).toBe(270);
      // Origin (0, 0) -> 0 deg
      expect(CoordinateTransform.cartesianToPolarAngle(0, 0)).toBe(0);
    });

    it('converts between Cartesian heading (clockwise from North) and Polar heading (counter-clockwise from East)', () => {
      // North: Cartesian 0 -> Polar 90
      expect(CoordinateTransform.cartesianToPolarHeading(0)).toBe(90);
      expect(CoordinateTransform.polarToCartesianHeading(90)).toBe(0);

      // East: Cartesian 90 -> Polar 0
      expect(CoordinateTransform.cartesianToPolarHeading(90)).toBe(0);
      expect(CoordinateTransform.polarToCartesianHeading(0)).toBe(90);

      // South: Cartesian 180 -> Polar 270
      expect(CoordinateTransform.cartesianToPolarHeading(180)).toBe(270);
      expect(CoordinateTransform.polarToCartesianHeading(270)).toBe(180);

      // West: Cartesian 270 -> Polar 180
      expect(CoordinateTransform.cartesianToPolarHeading(270)).toBe(180);
      expect(CoordinateTransform.polarToCartesianHeading(180)).toBe(270);
    });

    it('calculates displacement from polar distance and angle', () => {
      // 10 units at 0 deg (East): dx=10, dy=0
      const east = CoordinateTransform.polarToDisplacement(10, 0);
      expect(Math.round(east.x)).toBe(10);
      expect(Math.round(east.y)).toBe(0);

      // 10 units at 90 deg (North): dx=0, dy=10
      const north = CoordinateTransform.polarToDisplacement(10, 90);
      expect(Math.round(north.x)).toBe(0);
      expect(Math.round(north.y)).toBe(10);

      // 10 units at 180 deg (West): dx=-10, dy=0
      const west = CoordinateTransform.polarToDisplacement(10, 180);
      expect(Math.round(west.x)).toBe(-10);
      expect(Math.round(west.y)).toBe(0);

      // 10 units at 270 deg (South): dx=0, dy=-10
      const south = CoordinateTransform.polarToDisplacement(10, 270);
      expect(Math.round(south.x)).toBe(0);
      expect(Math.round(south.y)).toBe(-10);
    });
  });
});
