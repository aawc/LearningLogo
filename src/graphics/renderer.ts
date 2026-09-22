import { CoordinateTransform, type ViewportState } from './coordinates.ts';
import type { PathSegment, TurtleState } from './turtle.ts';

export class CanvasRenderer {
  private pathCanvas: HTMLCanvasElement;
  private spriteCanvas: HTMLCanvasElement;
  private pathCtx: CanvasRenderingContext2D | null = null;
  private spriteCtx: CanvasRenderingContext2D | null = null;
  private currentDpr = 1;
  private cssWidth = 800;
  private cssHeight = 600;

  constructor(pathCanvas: HTMLCanvasElement, spriteCanvas: HTMLCanvasElement) {
    this.pathCanvas = pathCanvas;
    this.spriteCanvas = spriteCanvas;
    this.pathCtx = pathCanvas.getContext('2d');
    this.spriteCtx = spriteCanvas.getContext('2d');
  }

  getDpr(): number {
    return this.currentDpr;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number = window.devicePixelRatio || 1): void {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.currentDpr = dpr;

    const bufferWidth = Math.round(cssWidth * dpr);
    const bufferHeight = Math.round(cssHeight * dpr);

    this.pathCanvas.width = bufferWidth;
    this.pathCanvas.height = bufferHeight;
    this.pathCanvas.style.width = `${cssWidth}px`;
    this.pathCanvas.style.height = `${cssHeight}px`;

    this.spriteCanvas.width = bufferWidth;
    this.spriteCanvas.height = bufferHeight;
    this.spriteCanvas.style.width = `${cssWidth}px`;
    this.spriteCanvas.style.height = `${cssHeight}px`;

    if (this.pathCtx) {
      this.pathCtx.scale(dpr, dpr);
    }
    if (this.spriteCtx) {
      this.spriteCtx.scale(dpr, dpr);
    }
  }

  renderPaths(segments: readonly PathSegment[], viewport: ViewportState): void {
    if (!this.pathCtx) return;

    this.pathCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    for (const segment of segments) {
      const p1 = CoordinateTransform.logoToCanvas(segment.from, viewport);
      const p2 = CoordinateTransform.logoToCanvas(segment.to, viewport);

      this.pathCtx.beginPath();
      this.pathCtx.strokeStyle = segment.color;
      this.pathCtx.lineWidth = segment.width;
      this.pathCtx.lineCap = 'round';
      this.pathCtx.lineJoin = 'round';
      this.pathCtx.moveTo(p1.x, p1.y);
      this.pathCtx.lineTo(p2.x, p2.y);
      this.pathCtx.stroke();
    }
  }

  renderTurtle(turtleState: TurtleState, viewport: ViewportState): void {
    if (!this.spriteCtx) return;

    this.spriteCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    if (!turtleState.isVisible) return;

    const center = CoordinateTransform.logoToCanvas(
      { x: turtleState.x, y: turtleState.y },
      viewport
    );

    this.spriteCtx.save();
    this.spriteCtx.translate(center.x, center.y);
    // Heading 0 is North (up). Canvas rotation rotates clockwise from positive X or North
    // Since Heading is clockwise from North (0° = -Y), rotate by heading degrees
    this.spriteCtx.rotate((turtleState.heading * Math.PI) / 180);

    // Draw accessible turtle chevron
    // Heading 0 points up towards -Y
    this.spriteCtx.beginPath();
    this.spriteCtx.moveTo(0, -14); // Nose
    this.spriteCtx.lineTo(9, 10);  // Right foot
    this.spriteCtx.lineTo(0, 4);   // Tail notch
    this.spriteCtx.lineTo(-9, 10); // Left foot
    this.spriteCtx.closePath();

    this.spriteCtx.fillStyle = turtleState.penColor;
    this.spriteCtx.fill();
    this.spriteCtx.strokeStyle = '#000000';
    this.spriteCtx.lineWidth = 1.5;
    this.spriteCtx.stroke();

    this.spriteCtx.restore();
  }

  clear(): void {
    if (this.pathCtx) {
      this.pathCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    }
    if (this.spriteCtx) {
      this.spriteCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    }
  }
}
