import { describe, it, expect } from 'vitest';
import { tokenize } from '../../../src/interpreter/lexer.ts';
import { TokenType } from '../../../src/interpreter/token.ts';
import { LexerError } from '../../../src/interpreter/errors.ts';

describe('Lexer (Tokenizer)', () => {
  it('tokenizes simple commands with numbers', () => {
    const tokens = tokenize('FD 100 RT 90');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.IDENTIFIER,
      TokenType.NUMBER,
      TokenType.IDENTIFIER,
      TokenType.NUMBER,
      TokenType.EOF,
    ]);
    expect(tokens[0]?.value).toBe('FD');
    expect(tokens[1]?.value).toBe(100);
    expect(tokens[2]?.value).toBe('RT');
    expect(tokens[3]?.value).toBe(90);
  });

  it('normalizes identifiers to uppercase (case-insensitivity)', () => {
    const tokens = tokenize('fOrWaRd 50');
    expect(tokens[0]?.type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0]?.value).toBe('FORWARD');
    expect(tokens[0]?.raw).toBe('fOrWaRd');
  });

  it('tokenizes word literals and variable lookups with leading prefix stripped in value', () => {
    const tokens = tokenize('"RADIUS :LENGTH');
    expect(tokens[0]?.type).toBe(TokenType.WORD_LITERAL);
    expect(tokens[0]?.value).toBe('RADIUS');
    expect(tokens[0]?.raw).toBe('"RADIUS');

    expect(tokens[1]?.type).toBe(TokenType.VAR_LOOKUP);
    expect(tokens[1]?.value).toBe('LENGTH');
    expect(tokens[1]?.raw).toBe(':LENGTH');
  });

  it('tokenizes delimiters and nested list brackets', () => {
    const tokens = tokenize('REPEAT 4 [ FD 10 ]');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.IDENTIFIER,
      TokenType.NUMBER,
      TokenType.LIST_OPEN,
      TokenType.IDENTIFIER,
      TokenType.NUMBER,
      TokenType.LIST_CLOSE,
      TokenType.EOF,
    ]);
  });

  it('tokenizes arithmetic operators and comparison operators', () => {
    const tokens = tokenize('2 + 3 * :X <> 10 <= 5 >= 6 = 7');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.VAR_LOOKUP,
      TokenType.OPERATOR,
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.NUMBER,
      TokenType.EOF,
    ]);
    expect(tokens[5]?.value).toBe('<>');
    expect(tokens[7]?.value).toBe('<=');
    expect(tokens[9]?.value).toBe('>=');
    expect(tokens[11]?.value).toBe('=');
  });

  it('ignores comments and whitespace correctly', () => {
    const tokens = tokenize('; Draw a square\nCS ; reset screen\n');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.IDENTIFIER,
      TokenType.EOF,
    ]);
    expect(tokens[0]?.value).toBe('CS');
  });

  it('tracks accurate source locations (line, column, offset, length)', () => {
    const tokens = tokenize('  FD 50\nRT 90');
    expect(tokens[0]).toMatchObject({
      type: TokenType.IDENTIFIER,
      value: 'FD',
      loc: { line: 1, column: 3, offset: 2, length: 2 },
    });
    expect(tokens[1]).toMatchObject({
      type: TokenType.NUMBER,
      value: 50,
      loc: { line: 1, column: 6, offset: 5, length: 2 },
    });
    expect(tokens[2]).toMatchObject({
      type: TokenType.IDENTIFIER,
      value: 'RT',
      loc: { line: 2, column: 1, offset: 8, length: 2 },
    });
  });

  it('throws friendly LexerError on unrecognized symbols', () => {
    expect(() => tokenize('FD @50')).toThrow(LexerError);
    try {
      tokenize('FD @50');
    } catch (e) {
      expect(e).toBeInstanceOf(LexerError);
      const err = e as LexerError;
      expect(err.loc.line).toBe(1);
      expect(err.loc.column).toBe(4);
      expect(err.message).toContain('@');
      expect(err.hint).toBeTruthy();
    }
  });

  it('tokenizes modulo operator %', () => {
    const tokens = tokenize('10 % 3');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.NUMBER,
      TokenType.EOF,
    ]);
    expect(tokens[1]?.value).toBe('%');
  });

  it('tokenizes leading decimal numbers like .5 and .75', () => {
    const tokens = tokenize('.5 + .75');
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.NUMBER,
      TokenType.OPERATOR,
      TokenType.NUMBER,
      TokenType.EOF,
    ]);
    expect(tokens[0]?.value).toBe(0.5);
    expect(tokens[2]?.value).toBe(0.75);
  });
});
