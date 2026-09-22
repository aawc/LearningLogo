import { CoordinateTransform, type Point2D } from './coordinates.ts';
import { resolveColor } from './palette.ts';

export interface PathSegment {
  from: Point2D;
  to: Point2D;
  color: string;
  width: number;
}

export interface TurtleState {
  x: number;
  y: number;
  heading: number;
  isPenDown: boolean;
  isVisible: boolean;
  penColor: string;
  penWidth: number;
}

export class Turtle {
  private x = 0;
  private y = 0;
  private heading = 0; // 0 deg = North
  private isPenDown = true;
  private isVisible = true;
  private penColor = '#0072B2'; // Accessible Primary Blue
  private penWidth = 2;
  private pathSegments: PathSegment[] = [];

  getState(): TurtleState {
    return {
      x: this.x,
      y: this.y,
      heading: this.heading,
      isPenDown: this.isPenDown,
      isVisible: this.isVisible,
      penColor: this.penColor,
      penWidth: this.penWidth,
    };
  }

  getPathSegments(): readonly PathSegment[] {
    return this.pathSegments;
  }

  forward(distance: number): void {
    const disp = CoordinateTransform.calculateDisplacement(distance, this.heading);
    const newX = this.x + disp.x;
    const newY = this.y + disp.y;

    if (this.isPenDown) {
      this.pathSegments.push({
        from: { x: this.x, y: this.y },
        to: { x: newX, y: newY },
        color: this.penColor,
        width: this.penWidth,
      });
    }

    this.x = newX;
    this.y = newY;
  }

  back(distance: number): void {
    this.forward(-distance);
  }

  right(degrees: number): void {
    this.heading = CoordinateTransform.normalizeHeading(this.heading + degrees);
  }

  left(degrees: number): void {
    this.heading = CoordinateTransform.normalizeHeading(this.heading - degrees);
  }

  penUp(): void {
    this.isPenDown = false;
  }

  penDown(): void {
    this.isPenDown = true;
  }

  setPenColor(color: string | number): void {
    this.penColor = resolveColor(color);
  }

  setPenWidth(width: number): void {
    this.penWidth = Math.max(1, width);
  }

  setXY(x: number, y: number): void {
    if (this.isPenDown) {
      this.pathSegments.push({
        from: { x: this.x, y: this.y },
        to: { x, y },
        color: this.penColor,
        width: this.penWidth,
      });
    }
    this.x = x;
    this.y = y;
  }

  setX(x: number): void {
    this.setXY(x, this.y);
  }

  setY(y: number): void {
    this.setXY(this.x, y);
  }

  setHeading(angle: number): void {
    this.heading = CoordinateTransform.normalizeHeading(angle);
  }

  towards(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
    return CoordinateTransform.normalizeHeading(deg);
  }

  arc(angle: number, radius: number): void {
    if (!this.isPenDown || radius <= 0 || angle === 0) return;
    const steps = Math.max(12, Math.ceil(Math.abs(angle) / 5));
    let prevX = this.x + radius * Math.sin((this.heading * Math.PI) / 180);
    let prevY = this.y + radius * Math.cos((this.heading * Math.PI) / 180);
    for (let i = 1; i <= steps; i++) {
      const curDeg = this.heading + (angle * i) / steps;
      const rad = (curDeg * Math.PI) / 180;
      const curX = this.x + radius * Math.sin(rad);
      const curY = this.y + radius * Math.cos(rad);
      this.pathSegments.push({
        from: { x: prevX, y: prevY },
        to: { x: curX, y: curY },
        color: this.penColor,
        width: this.penWidth,
      });
      prevX = curX;
      prevY = curY;
    }
  }

  circle(radius: number): void {
    this.arc(360, radius);
  }

  home(): void {
    this.setXY(0, 0);
    this.heading = 0;
  }

  clearScreen(): void {
    this.pathSegments = [];
    this.x = 0;
    this.y = 0;
    this.heading = 0;
  }

  clean(): void {
    this.pathSegments = [];
  }

  hideTurtle(): void {
    this.isVisible = false;
  }

  showTurtle(): void {
    this.isVisible = true;
  }
}
