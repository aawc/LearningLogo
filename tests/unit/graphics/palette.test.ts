import { describe, it, expect } from 'vitest';
import {
  OKABE_ITO_PALETTE,
  resolveColor,
} from '../../../src/graphics/palette.ts';

describe('Okabe-Ito Colorblind-Safe Palette', () => {
  it('contains 8 distinct accessible colors with verified hex codes', () => {
    expect(OKABE_ITO_PALETTE.length).toBe(8);
    expect(OKABE_ITO_PALETTE[0]?.hex).toBe('#000000'); // Black
    expect(OKABE_ITO_PALETTE[1]?.hex).toBe('#0072B2'); // Blue
    expect(OKABE_ITO_PALETTE[2]?.hex).toBe('#D55E00'); // Vermilion / Orange
    expect(OKABE_ITO_PALETTE[3]?.hex).toBe('#56B4E9'); // Sky Blue
    expect(OKABE_ITO_PALETTE[4]?.hex).toBe('#009E73'); // Bluish Green
    expect(OKABE_ITO_PALETTE[5]?.hex).toBe('#F0E442'); // Yellow
    expect(OKABE_ITO_PALETTE[6]?.hex).toBe('#CC79A7'); // Reddish Purple
    expect(OKABE_ITO_PALETTE[7]?.hex).toBe('#E69F00'); // Orange
  });

  it('includes text indicator and accessible label on every palette entry', () => {
    for (const entry of OKABE_ITO_PALETTE) {
      expect(entry.indicator).toBeTruthy();
      expect(entry.indicator).toMatch(/^\[.+\]$/);
      expect(entry.name).toBeTruthy();
    }
  });

  it('resolves color indices and color names', () => {
    expect(resolveColor(1)).toBe('#0072B2');
    expect(resolveColor(2)).toBe('#D55E00');
    expect(resolveColor('BLUE')).toBe('#0072B2');
    expect(resolveColor('ORANGE')).toBe('#D55E00');
    expect(resolveColor('VERMILION')).toBe('#D55E00');
    expect(resolveColor('#123456')).toBe('#123456');
  });
});
