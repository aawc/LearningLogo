export interface PaletteEntry {
  index: number;
  name: string;
  hex: string;
  role: string;
  indicator: string;
}

export const OKABE_ITO_PALETTE: readonly PaletteEntry[] = [
  { index: 0, name: 'Black', hex: '#000000', role: 'Outline / Default', indicator: '[OUTLINE]' },
  { index: 1, name: 'Blue', hex: '#0072B2', role: 'Primary / Passed', indicator: '[PASS]' },
  { index: 2, name: 'Vermilion', hex: '#D55E00', role: 'Secondary / Failed', indicator: '[FAIL]' },
  { index: 3, name: 'Sky Blue', hex: '#56B4E9', role: 'Accent / Water', indicator: '[SKY]' },
  { index: 4, name: 'Bluish Green', hex: '#009E73', role: 'Nature / Grass', indicator: '[NATURE]' },
  { index: 5, name: 'Yellow', hex: '#F0E442', role: 'Highlight / Sun', indicator: '[WARN]' },
  { index: 6, name: 'Reddish Purple', hex: '#CC79A7', role: 'Flower / Magenta', indicator: '[PURPLE]' },
  { index: 7, name: 'Orange', hex: '#E69F00', role: 'Amber / Attention', indicator: '[AMBER]' },
];

const NAMED_COLOR_MAP: Record<string, string> = {
  BLACK: '#000000',
  BLUE: '#0072B2',
  RED: '#D55E00',
  VERMILION: '#D55E00',
  ORANGE: '#D55E00',
  SKYBLUE: '#56B4E9',
  SKY: '#56B4E9',
  CYAN: '#56B4E9',
  GREEN: '#009E73',
  BLUISHGREEN: '#009E73',
  YELLOW: '#F0E442',
  PURPLE: '#CC79A7',
  REDDISHPURPLE: '#CC79A7',
  MAGENTA: '#CC79A7',
  AMBER: '#E69F00',
  DARKORANGE: '#E69F00',
  WHITE: '#FFFFFF',
};

export function resolveColor(input: string | number): string {
  if (typeof input === 'number') {
    const idx = Math.floor(input) % OKABE_ITO_PALETTE.length;
    const entry = OKABE_ITO_PALETTE[Math.abs(idx)];
    return entry ? entry.hex : '#000000';
  }

  const str = input.trim().toUpperCase();
  if (str.startsWith('#')) {
    return input.trim();
  }

  if (Object.prototype.hasOwnProperty.call(NAMED_COLOR_MAP, str)) {
    return NAMED_COLOR_MAP[str]!;
  }

  return '#000000';
}
