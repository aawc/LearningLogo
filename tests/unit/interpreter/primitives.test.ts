import { describe, it, expect } from 'vitest';
import { executePrimitive, isPrimitive } from '../../../src/interpreter/primitives.ts';

describe('Logo Primitives Registry', () => {
  it('identifies standard math and list primitives', () => {
    expect(isPrimitive('SUM')).toBe(true);
    expect(isPrimitive('PRODUCT')).toBe(true);
    expect(isPrimitive('FIRST')).toBe(true);
    expect(isPrimitive('RANDOM')).toBe(true);
    expect(isPrimitive('UNKNOWN_CMD')).toBe(false);
  });

  it('computes math primitives correctly', () => {
    expect(executePrimitive('SUM', [10, 25])).toBe(35);
    expect(executePrimitive('DIFFERENCE', [50, 15])).toBe(35);
    expect(executePrimitive('PRODUCT', [6, 7])).toBe(42);
    expect(executePrimitive('QUOTIENT', [100, 4])).toBe(25);
    expect(executePrimitive('REMAINDER', [17, 5])).toBe(2);
    expect(executePrimitive('SQRT', [81])).toBe(9);
    expect(executePrimitive('ROUND', [3.7])).toBe(4);
    expect(executePrimitive('ABS', [-42])).toBe(42);
    expect(executePrimitive('SIN', [90])).toBe(1);
    expect(executePrimitive('COS', [0])).toBe(1);
  });

  it('computes list and word primitives correctly', () => {
    expect(executePrimitive('FIRST', ['HELLO'])).toBe('H');
    expect(executePrimitive('LAST', ['HELLO'])).toBe('O');
    expect(executePrimitive('BUTFIRST', ['HELLO'])).toBe('ELLO');
    expect(executePrimitive('BF', ['HELLO'])).toBe('ELLO');
    expect(executePrimitive('BUTLAST', ['HELLO'])).toBe('HELL');
    expect(executePrimitive('BL', ['HELLO'])).toBe('HELL');
    expect(executePrimitive('COUNT', ['TEST'])).toBe(4);
    expect(executePrimitive('ITEM', [2, ['A', 'B', 'C']])).toBe('B');
    expect(executePrimitive('FPUT', ['X', ['Y', 'Z']])).toEqual(['X', 'Y', 'Z']);
    expect(executePrimitive('LPUT', ['Z', ['X', 'Y']])).toEqual(['X', 'Y', 'Z']);
    expect(executePrimitive('SENTENCE', [['HELLO'], ['WORLD']])).toEqual(['HELLO', 'WORLD']);
    expect(executePrimitive('SE', ['A', 'B'])).toEqual(['A', 'B']);
    expect(executePrimitive('WORD', ['TURTLE', 'GRAPHICS'])).toBe('TURTLEGRAPHICS');
  });

  it('computes logic primitives correctly', () => {
    expect(executePrimitive('EQUAL?', [5, 5])).toBe(true);
    expect(executePrimitive('EQUAL?', [5, 6])).toBe(false);
    expect(executePrimitive('LESS?', [3, 10])).toBe(true);
    expect(executePrimitive('GREATER?', [10, 3])).toBe(true);
    expect(executePrimitive('AND', [true, false])).toBe(false);
    expect(executePrimitive('OR', [true, false])).toBe(true);
    expect(executePrimitive('NOT', [true])).toBe(false);
  });
});
