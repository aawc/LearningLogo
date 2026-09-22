import type { LogoValue } from './environment.ts';
import { RuntimeError } from './errors.ts';

export type PrimitiveFn = (args: LogoValue[]) => LogoValue;

const PRIMITIVES: Record<string, PrimitiveFn> = {
  SUM: (args) => Number(args[0] ?? 0) + Number(args[1] ?? 0),
  DIFFERENCE: (args) => Number(args[0] ?? 0) - Number(args[1] ?? 0),
  PRODUCT: (args) => Number(args[0] ?? 0) * Number(args[1] ?? 0),
  QUOTIENT: (args) => {
    const divisor = Number(args[1] ?? 1);
    if (divisor === 0) {
      throw new RuntimeError('Cannot divide by zero.', { line: 1, column: 1, offset: 0, length: 0 });
    }
    return Number(args[0] ?? 0) / divisor;
  },
  REMAINDER: (args) => Number(args[0] ?? 0) % Number(args[1] ?? 1),
  SQRT: (args) => Math.sqrt(Number(args[0] ?? 0)),
  ROUND: (args) => Math.round(Number(args[0] ?? 0)),
  RANDOM: (args) => Math.floor(Math.random() * Number(args[0] ?? 100)),
  ABS: (args) => Math.abs(Number(args[0] ?? 0)),
  SIN: (args) => {
    const rad = (Number(args[0] ?? 0) * Math.PI) / 180;
    const val = Math.sin(rad);
    return Math.abs(val) < 1e-10 ? 0 : Number(val.toFixed(8));
  },
  COS: (args) => {
    const rad = (Number(args[0] ?? 0) * Math.PI) / 180;
    const val = Math.cos(rad);
    return Math.abs(val) < 1e-10 ? 0 : Number(val.toFixed(8));
  },

  // Strings and lists
  FIRST: (args) => {
    const val = args[0];
    if (Array.isArray(val)) return val[0] ?? '';
    return String(val)[0] ?? '';
  },
  LAST: (args) => {
    const val = args[0];
    if (Array.isArray(val)) return val[val.length - 1] ?? '';
    const str = String(val);
    return str[str.length - 1] ?? '';
  },
  BUTFIRST: (args) => {
    const val = args[0];
    if (Array.isArray(val)) return val.slice(1);
    return String(val).slice(1);
  },
  BF: (args) => PRIMITIVES['BUTFIRST']!(args),
  BUTLAST: (args) => {
    const val = args[0];
    if (Array.isArray(val)) return val.slice(0, -1);
    return String(val).slice(0, -1);
  },
  BL: (args) => PRIMITIVES['BUTLAST']!(args),
  COUNT: (args) => {
    const val = args[0];
    if (Array.isArray(val)) return val.length;
    return String(val).length;
  },
  ITEM: (args) => {
    const idx = Number(args[0] ?? 1) - 1;
    const target = args[1];
    if (Array.isArray(target)) return target[idx] ?? '';
    return String(target)[idx] ?? '';
  },
  FPUT: (args) => {
    const item = args[0] ?? '';
    const list = args[1] ?? [];
    if (Array.isArray(list)) return [item, ...list];
    return [item, list];
  },
  LPUT: (args) => {
    const item = args[0] ?? '';
    const list = args[1] ?? [];
    if (Array.isArray(list)) return [...list, item];
    return [list, item];
  },
  SENTENCE: (args) => {
    const flatten = (v: LogoValue | undefined): LogoValue[] => {
      if (v === undefined) return [];
      return Array.isArray(v) ? v : [v];
    };
    return [...flatten(args[0]), ...flatten(args[1])];
  },
  SE: (args) => PRIMITIVES['SENTENCE']!(args),
  WORD: (args) => args.map((a) => String(a)).join(''),
  LIST: (args) => [...args],

  // Logic
  'EQUAL?': (args) => args[0] === args[1],
  'LESS?': (args) => Number(args[0] ?? 0) < Number(args[1] ?? 0),
  'GREATER?': (args) => Number(args[0] ?? 0) > Number(args[1] ?? 0),
  AND: (args) => Boolean(args[0]) && Boolean(args[1]),
  OR: (args) => Boolean(args[0]) || Boolean(args[1]),
  NOT: (args) => !Boolean(args[0]),
};

export function isPrimitive(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(PRIMITIVES, name.toUpperCase());
}

export function executePrimitive(name: string, args: LogoValue[]): LogoValue {
  const upper = name.toUpperCase();
  const fn = PRIMITIVES[upper];
  if (!fn) {
    throw new RuntimeError(`Unknown primitive '${name}'`, { line: 1, column: 1, offset: 0, length: 0 });
  }
  return fn(args);
}
