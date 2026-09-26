import { describe, it, expect, vi } from 'vitest';
import { CanvasRenderer } from '../../../src/graphics/renderer.ts';
import type { PathSegment, TurtleState } from '../../../src/graphics/turtle.ts';

describe('Canvas 2D High-DPI Renderer', () => {
  function createMockCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({
        width: 120,
        fontBoundingBoxAscent: 14,
        fontBoundingBoxDescent: 4,
        actualBoundingBoxAscent: 12,
      }),
      getImageData: vi.fn().mockReturnValue({
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([0, 114, 178, 255]), // #0072B2
      }),
      putImageData: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);
    return canvas;
  }

  it('initializes and resizes with High-DPI DPR scaling', () => {
    const pathCanvas = createMockCanvas();
    const spriteCanvas = createMockCanvas();
    const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);

    renderer.resize(800, 600, 2);

    expect(pathCanvas.width).toBe(1600);
    expect(pathCanvas.height).toBe(1200);
    expect(spriteCanvas.width).toBe(1600);
    expect(spriteCanvas.height).toBe(1200);
  });

  it('renders vector path segments to the path canvas', () => {
    const pathCanvas = createMockCanvas();
    const spriteCanvas = createMockCanvas();
    const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
    renderer.resize(800, 600, 1);

    const segments: PathSegment[] = [
      {
        from: { x: 0, y: 0 },
        to: { x: 0, y: 100 },
        color: '#0072B2',
        width: 2,
      },
    ];

    const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };
    renderer.renderPaths(segments, viewport);

    const ctx = pathCanvas.getContext('2d')!;
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(400, 300);
    expect(ctx.lineTo).toHaveBeenCalledWith(400, 200);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('renders turtle chevron to the sprite canvas with rotation and scaling', () => {
    const pathCanvas = createMockCanvas();
    const spriteCanvas = createMockCanvas();
    const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
    renderer.resize(800, 600, 1);

    const turtleState: TurtleState = {
      x: 50,
      y: 50,
      heading: 90,
      isPenDown: true,
      isVisible: true,
      penColor: '#0072B2',
      penWidth: 2,
      penMode: 'PENDOWN',
      origin: { x: 0, y: 0 },
      speed: 1.0,
      velocity: 0,
      stepSize: 1,
      turtleSize: 2.0,
      font: { name: 'Arial', size: 12, attributes: 0 },
    };

    const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };
    renderer.renderTurtle(turtleState, viewport);

    const ctx = spriteCanvas.getContext('2d')!;
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.translate).toHaveBeenCalledWith(450, 250);
    expect(ctx.rotate).toHaveBeenCalledWith((90 * Math.PI) / 180);
    expect(ctx.scale).toHaveBeenCalledWith(2.0, 2.0);
    expect(ctx.restore).toHaveBeenCalled();
  });

  describe('DrawElement Pipeline & Compositing', () => {
    it('renders dots, ovals, rects, lines, and text using renderDrawElements', () => {
      const pathCanvas = createMockCanvas();
      const spriteCanvas = createMockCanvas();
      const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
      renderer.resize(800, 600, 1);

      const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };
      renderer.renderDrawElements([
        { type: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, color: '#0072B2', width: 2, mode: 'PENDOWN' },
        { type: 'dot', point: { x: 20, y: 20 }, color: '#D55E00', width: 4, mode: 'PENDOWN' },
        { type: 'oval', center: { x: 0, y: 0 }, xRadius: 30, yRadius: 15, filled: true, color: '#009E73', strokeWidth: 1, mode: 'PENDOWN' },
        { type: 'rect', corner: { x: 10, y: 10 }, width: 40, height: 20, filled: false, color: '#CC79A7', strokeWidth: 2, mode: 'PENDOWN' },
        { type: 'text', point: { x: 0, y: 0 }, text: 'Terrapin', font: { name: 'Arial', size: 14, attributes: 1 }, color: '#000000', mode: 'PENDOWN' },
      ], viewport);

      const ctx = pathCanvas.getContext('2d')!;
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.ellipse).toHaveBeenCalled();
      expect(ctx.rect).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalledWith('Terrapin', 400, 300);
    });

    it('sets destination-out for PENERASE and difference for PENREVERSE', () => {
      const pathCanvas = createMockCanvas();
      const spriteCanvas = createMockCanvas();
      const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
      const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };

      renderer.renderDrawElements([
        { type: 'line', from: { x: 0, y: 0 }, to: { x: 10, y: 10 }, color: '#000', width: 2, mode: 'PENERASE' },
        { type: 'dot', point: { x: 0, y: 0 }, color: '#000', width: 2, mode: 'PENREVERSE' },
        { type: 'dot', point: { x: 0, y: 0 }, color: '#000', width: 2, mode: 'PENUP' }, // should be ignored
      ], viewport);

      const ctx = pathCanvas.getContext('2d')!;
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('queries pixel color and active state with getPixelColor and isPixelActive', () => {
      const pathCanvas = createMockCanvas();
      const spriteCanvas = createMockCanvas();
      const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
      renderer.resize(800, 600, 1);
      const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };

      const color = renderer.getPixelColor({ x: 0, y: 0 }, viewport);
      expect(color).toEqual([0, 114, 178]);

      const active = renderer.isPixelActive({ x: 0, y: 0 }, viewport, '#FFFFFF');
      expect(active).toBe(true);
    });

    it('measures text baseline and dimensions', () => {
      const pathCanvas = createMockCanvas();
      const spriteCanvas = createMockCanvas();
      const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);

      const font = { name: 'Arial', size: 14, attributes: 0 };
      const baseline = renderer.measureTextBaseline(font);
      expect(baseline).toBeGreaterThan(0);

      const dims = renderer.measureTextDimensions('Test', font);
      expect(dims[0]).toBeGreaterThan(0);
      expect(dims[1]).toBeGreaterThan(0);
    });

    it('anchors turtle sprite translation to origin offset (F3)', () => {
      const pathCanvas = createMockCanvas();
      const spriteCanvas = createMockCanvas();
      const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
      renderer.resize(800, 600, 1);

      const turtleState: TurtleState = {
        x: 50,
        y: 50,
        heading: 0,
        isPenDown: true,
        isVisible: true,
        penColor: '#0072B2',
        penWidth: 2,
        penMode: 'PENDOWN',
        origin: { x: 100, y: -50 }, // world: x=150, y=0
        speed: 1.0,
        velocity: 0,
        stepSize: 1,
        turtleSize: 1.0,
        font: { name: 'Arial', size: 12, attributes: 0 },
      };

      const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };
      renderer.renderTurtle(turtleState, viewport);

      const ctx = spriteCanvas.getContext('2d')!;
      // logoToCanvas(150, 0) = (400 + 150, 300 - 0) = (550, 300)
      expect(ctx.translate).toHaveBeenCalledWith(550, 300);
    });

    it('returns background color for transparent pixels or out-of-bounds (F1)', () => {
      const pathCanvas = createMockCanvas();
      const spriteCanvas = createMockCanvas();
      const ctx = pathCanvas.getContext('2d')!;
      // Mock transparent unpainted pixel
      vi.spyOn(ctx, 'getImageData').mockReturnValue({
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([0, 0, 0, 0]),
      } as unknown as ImageData);

      const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
      renderer.resize(800, 600, 1);
      const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };

      const color = renderer.getPixelColor({ x: 0, y: 0 }, viewport, '#FFFFFF');
      expect(color).toEqual([255, 255, 255]);
      expect(renderer.isPixelActive({ x: 0, y: 0 }, viewport, '#FFFFFF')).toBe(false);
    });

    it('executes scanline flood fill when DrawElement type is fill (F5)', () => {
      const pathCanvas = createMockCanvas();
      const spriteCanvas = createMockCanvas();
      const renderer = new CanvasRenderer(pathCanvas, spriteCanvas);
      renderer.resize(800, 600, 1);
      const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };

      const ctx = pathCanvas.getContext('2d')!;
      // Provide an image buffer with target color
      const buffer = new Uint8ClampedArray(800 * 600 * 4);
      vi.spyOn(ctx, 'getImageData').mockReturnValue({
        width: 800,
        height: 600,
        data: buffer,
      } as unknown as ImageData);

      renderer.renderDrawElements([
        { type: 'fill', startPoint: { x: 0, y: 0 }, fillColor: '#0072B2', mode: 'PENDOWN' },
      ], viewport);

      expect(ctx.putImageData).toHaveBeenCalled();
    });
  });
});
