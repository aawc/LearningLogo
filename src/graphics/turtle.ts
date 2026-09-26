import { CoordinateTransform, type Point2D } from './coordinates.ts';
import { resolveColor } from './palette.ts';

export type PenMode = 'PENDOWN' | 'PENUP' | 'PENERASE' | 'PENREVERSE';

export interface TurtleFont {
  name: string;
  size: number;
  attributes: number; // bitmask: 0=normal, 1=bold, 2=italic, 4=underline
}

export type DrawElement =
  | { type: 'line'; from: Point2D; to: Point2D; color: string; width: number; mode: PenMode }
  | { type: 'dot'; point: Point2D; color: string; width: number; mode: PenMode }
  | { type: 'oval'; center: Point2D; xRadius: number; yRadius: number; filled: boolean; color: string; strokeWidth: number; mode: PenMode }
  | { type: 'rect'; corner: Point2D; width: number; height: number; filled: boolean; color: string; strokeWidth: number; mode: PenMode }
  | { type: 'text'; point: Point2D; text: string; font: TurtleFont; color: string; mode: PenMode }
  | { type: 'fill'; startPoint: Point2D; fillColor: string; boundaryColor?: string; mode: PenMode };

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
  penMode: PenMode;
  origin: Point2D;
  speed: number;
  velocity: number;
  stepSize: number;
  turtleSize: number;
  font: TurtleFont;
}

export class Turtle {
  private x = 0;
  private y = 0;
  private heading = 0; // 0 deg = North, clockwise
  private penMode: PenMode = 'PENDOWN';
  private isVisible = true;
  private penColor = '#0072B2'; // Accessible Primary Blue
  private penWidth = 2;
  private origin: Point2D = { x: 0, y: 0 };
  private speed = 1.0;
  private velocity = 0;
  private stepSize = 1.0;
  private turtleSize = 1.0;
  private font: TurtleFont = { name: 'Arial', size: 12, attributes: 0 };
  private pathSegments: PathSegment[] = [];
  private drawElements: DrawElement[] = [];

  getState(): TurtleState {
    return {
      x: this.x,
      y: this.y,
      heading: this.heading,
      isPenDown: this.isPenDownMode(),
      isVisible: this.isVisible,
      penColor: this.penColor,
      penWidth: this.penWidth,
      penMode: this.penMode,
      origin: { ...this.origin },
      speed: this.speed,
      velocity: this.velocity,
      stepSize: this.stepSize,
      turtleSize: this.turtleSize,
      font: { ...this.font },
    };
  }

  getPathSegments(): readonly PathSegment[] {
    return this.pathSegments;
  }

  getDrawElements(): readonly DrawElement[] {
    return this.drawElements;
  }

  getOrigin(): Point2D {
    return { ...this.origin };
  }

  setOrigin(x: number, y: number): void {
    this.origin = { x, y };
  }

  resetOrigin(): void {
    this.origin = { x: 0, y: 0 };
  }

  distanceTo(x: number, y: number): number {
    return CoordinateTransform.calculateDistance({ x: this.x, y: this.y }, { x, y });
  }

  getPolarDistance(): number {
    return CoordinateTransform.cartesianToPolarDistance(this.x, this.y);
  }

  getPolarAngle(): number {
    return CoordinateTransform.cartesianToPolarAngle(this.x, this.y);
  }

  getPolarHeading(): number {
    return CoordinateTransform.cartesianToPolarHeading(this.heading);
  }

  setPolarHeading(angle: number): void {
    this.heading = CoordinateTransform.polarToCartesianHeading(angle);
  }

  getPolarPos(): [number, number] {
    return [this.getPolarDistance(), this.getPolarAngle()];
  }

  setPolarPos(distance: number, angle: number): void {
    this.setPolarHeading(angle);
    const disp = CoordinateTransform.polarToDisplacement(distance, angle);
    this.setXY(disp.x, disp.y);
  }

  getTurtleSize(): number {
    return this.turtleSize;
  }

  setTurtleSize(size: number): void {
    const valid = Number.isFinite(size) ? size : 1.0;
    this.turtleSize = Math.max(0.01, Math.min(99.0, valid));
  }

  getSpeed(): number {
    return this.speed;
  }

  setSpeed(speed: number): void {
    const valid = Number.isFinite(speed) ? speed : 1.0;
    this.speed = Math.max(0.1, Math.min(1.0, valid));
    this.velocity = 0;
  }

  getVelocity(): number {
    return this.velocity;
  }

  setVelocity(v: number): void {
    this.velocity = Number.isFinite(v) ? v : 0;
  }

  getStepSize(): number {
    return this.stepSize;
  }

  setStepSize(size: number): void {
    const valid = Number.isFinite(size) ? size : 1.0;
    this.stepSize = Math.max(0, valid);
  }

  getPenMode(): PenMode {
    return this.penMode;
  }

  setPenMode(mode: PenMode): void {
    this.penMode = mode;
  }

  penUp(): void {
    this.setPenMode('PENUP');
  }

  penDown(): void {
    this.setPenMode('PENDOWN');
  }

  penErase(): void {
    this.setPenMode('PENERASE');
  }

  penReverse(): void {
    this.setPenMode('PENREVERSE');
  }

  isPenDownMode(): boolean {
    return this.penMode !== 'PENUP';
  }

  getFont(): TurtleFont {
    return { ...this.font };
  }

  setFont(name: string, size?: number, attributes?: number): void {
    this.font = {
      name,
      size: size ?? 12,
      attributes: attributes ?? 0,
    };
  }

  resetFont(): void {
    this.font = { name: 'Arial', size: 12, attributes: 0 };
  }

  getFonts(): readonly string[] {
    return ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana'];
  }

  forward(distance: number): void {
    const effectiveDistance = distance * this.stepSize;
    const disp = CoordinateTransform.calculateDisplacement(effectiveDistance, this.heading);
    const newX = this.x + disp.x;
    const newY = this.y + disp.y;

    if (this.isPenDownMode()) {
      const seg: PathSegment = {
        from: { x: this.x + this.origin.x, y: this.y + this.origin.y },
        to: { x: newX + this.origin.x, y: newY + this.origin.y },
        color: this.penColor,
        width: this.penWidth,
      };
      this.pathSegments.push(seg);
      this.drawElements.push({
        type: 'line',
        from: seg.from,
        to: seg.to,
        color: seg.color,
        width: seg.width,
        mode: this.penMode,
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

  setPenColor(color: string | number): void {
    this.penColor = resolveColor(color);
  }

  setPenWidth(width: number): void {
    const valid = Number.isFinite(width) ? width : 2;
    this.penWidth = Math.max(1, valid);
  }

  setXY(x: number, y: number): void {
    if (this.isPenDownMode()) {
      const seg: PathSegment = {
        from: { x: this.x + this.origin.x, y: this.y + this.origin.y },
        to: { x: x + this.origin.x, y: y + this.origin.y },
        color: this.penColor,
        width: this.penWidth,
      };
      this.pathSegments.push(seg);
      this.drawElements.push({
        type: 'line',
        from: seg.from,
        to: seg.to,
        color: seg.color,
        width: seg.width,
        mode: this.penMode,
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

  dot(x?: number, y?: number, color?: string | number): void {
    const targetX = x ?? this.x;
    const targetY = y ?? this.y;
    const resolvedColor = color !== undefined ? resolveColor(color) : this.penColor;
    if (this.isPenDownMode()) {
      this.drawElements.push({
        type: 'dot',
        point: { x: targetX + this.origin.x, y: targetY + this.origin.y },
        color: resolvedColor,
        width: this.penWidth,
        mode: this.penMode,
      });
    }
  }

  stampOval(xRadius: number, yRadius: number, filled = false, color?: string | number): void {
    const resolvedColor = color !== undefined ? resolveColor(color) : this.penColor;
    if (this.isPenDownMode()) {
      this.drawElements.push({
        type: 'oval',
        center: { x: this.x + this.origin.x, y: this.y + this.origin.y },
        xRadius,
        yRadius,
        filled,
        color: resolvedColor,
        strokeWidth: this.penWidth,
        mode: this.penMode,
      });
    }
  }

  stampRect(width: number, height: number, filled = false, color?: string | number): void {
    const resolvedColor = color !== undefined ? resolveColor(color) : this.penColor;
    if (this.isPenDownMode()) {
      this.drawElements.push({
        type: 'rect',
        corner: { x: this.x + this.origin.x, y: this.y + this.origin.y },
        width,
        height,
        filled,
        color: resolvedColor,
        strokeWidth: this.penWidth,
        mode: this.penMode,
      });
    }
  }

  turtleText(text: string): void {
    if (this.isPenDownMode()) {
      this.drawElements.push({
        type: 'text',
        point: { x: this.x + this.origin.x, y: this.y + this.origin.y },
        text,
        font: { ...this.font },
        color: this.penColor,
        mode: this.penMode,
      });
    }
  }

  fill(color?: string | number, boundaryColor?: string | number): void {
    const resolvedColor = color !== undefined ? resolveColor(color) : this.penColor;
    const resolvedBoundary = boundaryColor !== undefined ? resolveColor(boundaryColor) : undefined;
    if (this.isPenDownMode()) {
      this.drawElements.push({
        type: 'fill',
        startPoint: { x: this.x + this.origin.x, y: this.y + this.origin.y },
        fillColor: resolvedColor,
        boundaryColor: resolvedBoundary,
        mode: this.penMode,
      });
    }
  }

  arc(angle: number, radius: number): void {
    if (!this.isPenDownMode() || radius <= 0 || angle === 0) return;
    const steps = Math.max(12, Math.ceil(Math.abs(angle) / 5));
    let prevX = this.x + radius * Math.sin((this.heading * Math.PI) / 180);
    let prevY = this.y + radius * Math.cos((this.heading * Math.PI) / 180);
    for (let i = 1; i <= steps; i++) {
      const curDeg = this.heading + (angle * i) / steps;
      const rad = (curDeg * Math.PI) / 180;
      const curX = this.x + radius * Math.sin(rad);
      const curY = this.y + radius * Math.cos(rad);
      const seg: PathSegment = {
        from: { x: prevX + this.origin.x, y: prevY + this.origin.y },
        to: { x: curX + this.origin.x, y: curY + this.origin.y },
        color: this.penColor,
        width: this.penWidth,
      };
      this.pathSegments.push(seg);
      this.drawElements.push({
        type: 'line',
        from: seg.from,
        to: seg.to,
        color: seg.color,
        width: seg.width,
        mode: this.penMode,
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
    this.drawElements = [];
    this.x = 0;
    this.y = 0;
    this.heading = 0;
  }

  clean(): void {
    this.pathSegments = [];
    this.drawElements = [];
  }

  hideTurtle(): void {
    this.isVisible = false;
  }

  showTurtle(): void {
    this.isVisible = true;
  }
}
