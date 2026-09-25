import { describe, it, expect } from 'vitest';
import { DEFAULT_STARTER_CODE } from '../../../src/main.ts';
import { tokenize } from '../../../src/interpreter/lexer.ts';
import { parse } from '../../../src/interpreter/parser.ts';

describe('Starter Code Template Modernization (Requirements 3 & 4)', () => {
  it('includes canonical web app URL in header comment', () => {
    expect(DEFAULT_STARTER_CODE).toContain('https://varun.khaneja.org/LearningLogo/');
    expect(DEFAULT_STARTER_CODE).toContain('; Welcome to LearningLogo! (https://varun.khaneja.org/LearningLogo/)');
  });

  it('contains simplified instruction without touch ribbon reference', () => {
    expect(DEFAULT_STARTER_CODE).toContain('; Press [RUN] to draw a square.');
    expect(DEFAULT_STARTER_CODE).not.toContain('explore the touch ribbon above');
    expect(DEFAULT_STARTER_CODE.toLowerCase()).not.toContain('touch ribbon');
  });

  it('is valid Logo syntax that parses successfully without throwing', () => {
    expect(() => {
      const tokens = tokenize(DEFAULT_STARTER_CODE);
      const ast = parse(tokens);
      expect(ast.body.length).toBeGreaterThan(0);
    }).not.toThrow();
  });
});
