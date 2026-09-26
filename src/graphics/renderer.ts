import { CoordinateTransform, type Point2D, type ViewportState } from './coordinates.ts';
import { resolveColor } from './palette.ts';
import type { DrawElement, PathSegment, TurtleFont, TurtleState } from './turtle.ts';

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

  renderDrawElements(elements: readonly DrawElement[], viewport: ViewportState): void {
    if (!this.pathCtx) return;

    this.pathCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    for (const element of elements) {
      if (element.mode === 'PENUP') continue;

      this.pathCtx.save();
      switch (element.mode) {
        case 'PENDOWN':
          this.pathCtx.globalCompositeOperation = 'source-over';
          break;
        case 'PENERASE':
          this.pathCtx.globalCompositeOperation = 'destination-out';
          break;
        case 'PENREVERSE':
          this.pathCtx.globalCompositeOperation = 'difference';
          break;
      }

      switch (element.type) {
        case 'line': {
          const p1 = CoordinateTransform.logoToCanvas(element.from, viewport);
          const p2 = CoordinateTransform.logoToCanvas(element.to, viewport);
          this.pathCtx.beginPath();
          this.pathCtx.strokeStyle = element.color;
          this.pathCtx.lineWidth = element.width * viewport.zoom;
          this.pathCtx.lineCap = 'round';
          this.pathCtx.lineJoin = 'round';
          this.pathCtx.moveTo(p1.x, p1.y);
          this.pathCtx.lineTo(p2.x, p2.y);
          this.pathCtx.stroke();
          break;
        }
        case 'dot': {
          const p = CoordinateTransform.logoToCanvas(element.point, viewport);
          const radius = Math.max(1, (element.width * viewport.zoom) / 2);
          this.pathCtx.beginPath();
          this.pathCtx.fillStyle = element.color;
          this.pathCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          this.pathCtx.fill();
          break;
        }
        case 'oval': {
          const center = CoordinateTransform.logoToCanvas(element.center, viewport);
          const rx = Math.abs(element.xRadius * viewport.zoom);
          const ry = Math.abs(element.yRadius * viewport.zoom);
          this.pathCtx.beginPath();
          this.pathCtx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
          if (element.filled) {
            this.pathCtx.fillStyle = element.color;
            this.pathCtx.fill();
          } else {
            this.pathCtx.strokeStyle = element.color;
            this.pathCtx.lineWidth = element.strokeWidth * viewport.zoom;
            this.pathCtx.stroke();
          }
          break;
        }
        case 'rect': {
          const corner = CoordinateTransform.logoToCanvas(element.corner, viewport);
          const w = element.width * viewport.zoom;
          const h = element.height * viewport.zoom;
          // In Logo, corner is bottom-left, in Canvas 2D Y grows downwards
          const left = w >= 0 ? corner.x : corner.x + w;
          const top = h >= 0 ? corner.y - h : corner.y;
          this.pathCtx.beginPath();
          this.pathCtx.rect(left, top, Math.abs(w), Math.abs(h));
          if (element.filled) {
            this.pathCtx.fillStyle = element.color;
            this.pathCtx.fill();
          } else {
            this.pathCtx.strokeStyle = element.color;
            this.pathCtx.lineWidth = element.strokeWidth * viewport.zoom;
            this.pathCtx.stroke();
          }
          break;
        }
        case 'text': {
          const p = CoordinateTransform.logoToCanvas(element.point, viewport);
          const style = (element.font.attributes & 2) ? 'italic ' : '';
          const weight = (element.font.attributes & 1) ? 'bold ' : '';
          const size = Math.round(element.font.size * viewport.zoom);
          this.pathCtx.font = `${style}${weight}${size}pt ${element.font.name}`;
          this.pathCtx.fillStyle = element.color;
          this.pathCtx.fillText(element.text, p.x, p.y);
          break;
        }
        case 'fill': {
          this.executeScanlineFill(element.startPoint, element.fillColor, viewport);
          break;
        }
      }

      this.pathCtx.restore();
    }
  }

  private executeScanlineFill(startPoint: Point2D, fillColor: string, viewport: ViewportState): void {
    if (!this.pathCtx || !this.pathCtx.getImageData || !this.pathCtx.putImageData) return;

    const canvasPt = CoordinateTransform.logoToCanvas(startPoint, viewport);
    const px = Math.round(canvasPt.x * this.currentDpr);
    const py = Math.round(canvasPt.y * this.currentDpr);

    const bufferWidth = this.pathCanvas.width;
    const bufferHeight = this.pathCanvas.height;

    if (px < 0 || px >= bufferWidth || py < 0 || py >= bufferHeight) return;

    try {
      const imgData = this.pathCtx.getImageData(0, 0, bufferWidth, bufferHeight);
      const pixels = new Uint32Array(imgData.data.buffer);
      const targetColor = pixels[py * bufferWidth + px];
      const fillRgba = this.colorToRgba32(fillColor);

      if (targetColor === fillRgba) return;

      const queue: [number, number][] = [[px, py]];
      const visited = new Uint8Array(bufferWidth * bufferHeight);
      let steps = 0;
      const maxSteps = bufferWidth * bufferHeight;

      while (queue.length > 0 && steps < maxSteps) {
        steps++;
        const [cx, cy] = queue.pop()!;
        if (cx < 0 || cx >= bufferWidth || cy < 0 || cy >= bufferHeight) continue;

        const idx = cy * bufferWidth + cx;
        if (visited[idx] || pixels[idx] !== targetColor) continue;

        let left = cx;
        while (left > 0 && pixels[cy * bufferWidth + left - 1] === targetColor && !visited[cy * bufferWidth + left - 1]) {
          left--;
        }

        let right = cx;
        while (right < bufferWidth - 1 && pixels[cy * bufferWidth + right + 1] === targetColor && !visited[cy * bufferWidth + right + 1]) {
          right++;
        }

        for (let i = left; i <= right; i++) {
          const iIdx = cy * bufferWidth + i;
          pixels[iIdx] = fillRgba;
          visited[iIdx] = 1;
        }

        // Scan row above with contiguous span tracking (F5)
        if (cy > 0) {
          let inSpan = false;
          for (let i = left; i <= right; i++) {
            const upIdx = (cy - 1) * bufferWidth + i;
            if (!visited[upIdx] && pixels[upIdx] === targetColor) {
              if (!inSpan) {
                queue.push([i, cy - 1]);
                inSpan = true;
              }
            } else {
              inSpan = false;
            }
          }
        }

        // Scan row below with contiguous span tracking (F5)
        if (cy < bufferHeight - 1) {
          let inSpan = false;
          for (let i = left; i <= right; i++) {
            const downIdx = (cy + 1) * bufferWidth + i;
            if (!visited[downIdx] && pixels[downIdx] === targetColor) {
              if (!inSpan) {
                queue.push([i, cy + 1]);
                inSpan = true;
              }
            } else {
              inSpan = false;
            }
          }
        }
      }

      this.pathCtx.putImageData(imgData, 0, 0);
    } catch {
      // Gracefully handle canvas tainted or test mock absence
    }
  }

  private colorToRgba32(color: string): number {
    const resolved = resolveColor(color);
    if (resolved.startsWith('#') && resolved.length === 7) {
      const r = parseInt(resolved.slice(1, 3), 16);
      const g = parseInt(resolved.slice(3, 5), 16);
      const b = parseInt(resolved.slice(5, 7), 16);
      // Little-endian Uint32Array RGBA format: (A << 24) | (B << 16) | (G << 8) | R
      return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
    return 0xff000000 >>> 0;
  }

  getPixelColor(logoPoint: Point2D, viewport: ViewportState, backgroundColor: string = '#FFFFFF'): [number, number, number] {
    const resolvedBg = resolveColor(backgroundColor);
    let br = 255;
    let bg = 255;
    let bb = 255;
    if (resolvedBg.startsWith('#') && resolvedBg.length === 7) {
      br = parseInt(resolvedBg.slice(1, 3), 16);
      bg = parseInt(resolvedBg.slice(3, 5), 16);
      bb = parseInt(resolvedBg.slice(5, 7), 16);
    }

    if (!this.pathCtx || !this.pathCtx.getImageData) {
      return [br, bg, bb];
    }
    const canvasPt = CoordinateTransform.logoToCanvas(logoPoint, viewport);
    const px = Math.round(canvasPt.x * this.currentDpr);
    const py = Math.round(canvasPt.y * this.currentDpr);

    const bufferWidth = this.pathCanvas.width || Math.round(this.cssWidth * this.currentDpr);
    const bufferHeight = this.pathCanvas.height || Math.round(this.cssHeight * this.currentDpr);

    // Out of bounds check (F1)
    if (px < 0 || px >= bufferWidth || py < 0 || py >= bufferHeight) {
      return [br, bg, bb];
    }

    try {
      const imgData = this.pathCtx.getImageData(px, py, 1, 1);
      const alpha = imgData.data[3];
      // Transparent unpainted pixel defaults to background color (F1)
      if (alpha === 0 || alpha === undefined) {
        return [br, bg, bb];
      }
      return [imgData.data[0] ?? br, imgData.data[1] ?? bg, imgData.data[2] ?? bb];
    } catch {
      return [br, bg, bb];
    }
  }

  isPixelActive(logoPoint: Point2D, viewport: ViewportState, backgroundColor: string = '#FFFFFF'): boolean {
    const [r, g, b] = this.getPixelColor(logoPoint, viewport, backgroundColor);
    const resolvedBg = resolveColor(backgroundColor);
    let br = 255;
    let bg = 255;
    let bb = 255;
    if (resolvedBg.startsWith('#') && resolvedBg.length === 7) {
      br = parseInt(resolvedBg.slice(1, 3), 16);
      bg = parseInt(resolvedBg.slice(3, 5), 16);
      bb = parseInt(resolvedBg.slice(5, 7), 16);
    }
    return !(r === br && g === bg && b === bb);
  }

  measureTextBaseline(font: TurtleFont): number {
    if (this.pathCtx && this.pathCtx.measureText) {
      const style = (font.attributes & 2) ? 'italic ' : '';
      const weight = (font.attributes & 1) ? 'bold ' : '';
      this.pathCtx.font = `${style}${weight}${font.size}pt ${font.name}`;
      const metrics = this.pathCtx.measureText('Mg');
      if (metrics) {
        const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
        if (ascent && !isNaN(ascent)) return Math.round(ascent);
      }
    }
    return Math.round(font.size * 0.8);
  }

  measureTextDimensions(text: string, font: TurtleFont): [number, number] {
    if (this.pathCtx && this.pathCtx.measureText) {
      const style = (font.attributes & 2) ? 'italic ' : '';
      const weight = (font.attributes & 1) ? 'bold ' : '';
      this.pathCtx.font = `${style}${weight}${font.size}pt ${font.name}`;
      const metrics = this.pathCtx.measureText(text);
      if (metrics) {
        const width = Math.round(metrics.width ?? (text.length * font.size * 0.6));
        const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? Math.round(font.size * 0.8);
        const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? Math.round(font.size * 0.2);
        const height = Math.round(ascent + descent);
        return [width, height];
      }
    }
    return [Math.round(text.length * font.size * 0.6), Math.round(font.size * 1.2)];
  }

  renderTurtle(turtleState: TurtleState, viewport: ViewportState): void {
    if (!this.spriteCtx) return;

    this.spriteCtx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    if (!turtleState.isVisible) return;

    // Anchor turtle sprite to its origin offset (F3)
    const center = CoordinateTransform.logoToCanvas(
      {
        x: turtleState.x + (turtleState.origin?.x ?? 0),
        y: turtleState.y + (turtleState.origin?.y ?? 0),
      },
      viewport
    );

    this.spriteCtx.save();
    this.spriteCtx.translate(center.x, center.y);
    // Heading 0 is North (up). Canvas rotation rotates clockwise from positive X or North
    // Since Heading is clockwise from North (0° = -Y), rotate by heading degrees
    this.spriteCtx.rotate((turtleState.heading * Math.PI) / 180);
    this.spriteCtx.scale(turtleState.turtleSize, turtleState.turtleSize);

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
