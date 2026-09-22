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
}
