export interface Point2D {
  x: number;
  y: number;
}

export interface ViewportState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
}

export class CoordinateTransform {
  /**
   * Projects Logo coordinate (0,0 center, Y-North, X-East) to HTML5 Canvas 2D raster space.
   */
  static logoToCanvas(point: Point2D, viewport: ViewportState): Point2D {
    const originX = viewport.width / 2;
    const originY = viewport.height / 2;

    const canvasX = originX + (point.x + viewport.panX) * viewport.zoom;
    const canvasY = originY - (point.y + viewport.panY) * viewport.zoom;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Projects Canvas 2D raster space point back to Logo coordinate space.
   */
  static canvasToLogo(point: Point2D, viewport: ViewportState): Point2D {
    const originX = viewport.width / 2;
    const originY = viewport.height / 2;

    const logoX = (point.x - originX) / viewport.zoom - viewport.panX;
    const logoY = (originY - point.y) / viewport.zoom - viewport.panY;

    return { x: logoX, y: logoY };
  }

  /**
   * Calculates displacement (dx, dy) for moving a given distance at a heading in degrees.
   * Heading 0° is North (dx=0, dy=+d)
   * Heading 90° is East (dx=+d, dy=0)
   * Heading 180° is South (dx=0, dy=-d)
   * Heading 270° is West (dx=-d, dy=0)
   */
  static calculateDisplacement(distance: number, heading: number): Point2D {
    const rad = (heading * Math.PI) / 180;
    let dx = distance * Math.sin(rad);
    let dy = distance * Math.cos(rad);
    if (Math.abs(dx) < 1e-12) dx = 0;
    if (Math.abs(dy) < 1e-12) dy = 0;
    return { x: dx, y: dy };
  }

  /**
   * Normalizes heading degrees to the range [0, 360).
   */
  static normalizeHeading(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
  }

  /**
   * Calculates the heading angle from one point towards another in Logo coordinate space.
   */
  static calculateTowards(from: Point2D, to: Point2D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // Math.atan2(dx, dy) returns angle in radians clockwise from North (+y)
    const rad = Math.atan2(dx, dy);
    const deg = (rad * 180) / Math.PI;
    return CoordinateTransform.normalizeHeading(deg);
  }

  /**
   * Calculates Euclidean distance between two points.
   */
  static calculateDistance(p1: Point2D, p2: Point2D): number {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  /**
   * Calculates polar distance (hypotenuse) from displacement.
   */
  static cartesianToPolarDistance(dx: number, dy: number): number {
    return Math.hypot(dx, dy);
  }

  /**
   * Calculates polar angle in degrees counter-clockwise from East (3 o'clock) in range [0, 360).
   */
  static cartesianToPolarAngle(dx: number, dy: number): number {
    if (dx === 0 && dy === 0) return 0;
    const rad = Math.atan2(dy, dx);
    const deg = (rad * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
  }

  /**
   * Converts Cartesian heading (0° North, clockwise) to Polar heading (0° East, counter-clockwise).
   * North (0°) -> 90°, East (90°) -> 0°, South (180°) -> 270°, West (270°) -> 180°.
   */
  static cartesianToPolarHeading(cartesianHeading: number): number {
    return ((450 - cartesianHeading) % 360 + 360) % 360;
  }

  /**
   * Converts Polar heading (0° East, counter-clockwise) to Cartesian heading (0° North, clockwise).
   * Polar 90° -> North (0°), Polar 0° -> East (90°), Polar 270° -> South (180°), Polar 180° -> West (270°).
   */
  static polarToCartesianHeading(polarHeading: number): number {
    return ((450 - polarHeading) % 360 + 360) % 360;
  }

  /**
   * Calculates displacement (dx, dy) for polar distance and polar angle (degrees counter-clockwise from East).
   */
  static polarToDisplacement(distance: number, polarAngle: number): Point2D {
    const rad = (polarAngle * Math.PI) / 180;
    let dx = distance * Math.cos(rad);
    let dy = distance * Math.sin(rad);
    if (Math.abs(dx) < 1e-12) dx = 0;
    if (Math.abs(dy) < 1e-12) dy = 0;
    return { x: dx, y: dy };
  }
}
