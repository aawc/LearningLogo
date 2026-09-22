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

  it('renders turtle chevron to the sprite canvas with rotation', () => {
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
    };

    const viewport = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };
    renderer.renderTurtle(turtleState, viewport);

    const ctx = spriteCanvas.getContext('2d')!;
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.translate).toHaveBeenCalledWith(450, 250);
    expect(ctx.rotate).toHaveBeenCalledWith((90 * Math.PI) / 180);
    expect(ctx.restore).toHaveBeenCalled();
  });
});
