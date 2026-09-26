import { type Token, TokenType, type SourceLocation } from './token.ts';
import { LexerError } from './errors.ts';

const NUMBER_REGEX = /^-?([0-9]+(\.[0-9]+)?|\.[0-9]+)/;
const IDENTIFIER_REGEX = /^[a-zA-Z_?][a-zA-Z0-9_?]*/;
const WORD_LITERAL_REGEX = /^"[^\s\[\]\(\)]*/;
const VAR_LOOKUP_REGEX = /^:[a-zA-Z0-9_?]*/;
const OPERATOR_REGEX = /^(<=|>=|<>|=|<|>|\+|-|\*|\/|%)/;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  while (index < source.length) {
    const char = source[index];

    // Handle newlines
    if (char === '\n') {
      index++;
      line++;
      column = 1;
      continue;
    }

    // Handle carriage return
    if (char === '\r') {
      index++;
      continue;
    }

    // Handle horizontal whitespace
    if (char === ' ' || char === '\t') {
      index++;
      column++;
      continue;
    }

    // Handle comments: ; to end of line
    if (char === ';') {
      while (index < source.length && source[index] !== '\n' && source[index] !== '\r') {
        index++;
      }
      continue;
    }

    const startLoc: SourceLocation = { line, column, offset: index, length: 0 };
    const remaining = source.slice(index);

    // List Brackets
    if (char === '[') {
      startLoc.length = 1;
      tokens.push({ type: TokenType.LIST_OPEN, value: '[', raw: '[', loc: startLoc });
      index++;
      column++;
      continue;
    }

    if (char === ']') {
      startLoc.length = 1;
      tokens.push({ type: TokenType.LIST_CLOSE, value: ']', raw: ']', loc: startLoc });
      index++;
      column++;
      continue;
    }

    // Parentheses
    if (char === '(') {
      startLoc.length = 1;
      tokens.push({ type: TokenType.LPAREN, value: '(', raw: '(', loc: startLoc });
      index++;
      column++;
      continue;
    }

    if (char === ')') {
      startLoc.length = 1;
      tokens.push({ type: TokenType.RPAREN, value: ')', raw: ')', loc: startLoc });
      index++;
      column++;
      continue;
    }

    // Word literal: "FOO
    if (char === '"') {
      const match = WORD_LITERAL_REGEX.exec(remaining);
      if (match) {
        const raw = match[0];
        const val = raw.slice(1).toUpperCase();
        startLoc.length = raw.length;
        tokens.push({ type: TokenType.WORD_LITERAL, value: val, raw, loc: startLoc });
        index += raw.length;
        column += raw.length;
        continue;
      }
    }

    // Variable lookup: :FOO
    if (char === ':') {
      const match = VAR_LOOKUP_REGEX.exec(remaining);
      if (match) {
        const raw = match[0];
        const val = raw.slice(1).toUpperCase();
        startLoc.length = raw.length;
        tokens.push({ type: TokenType.VAR_LOOKUP, value: val, raw, loc: startLoc });
        index += raw.length;
        column += raw.length;
        continue;
      }
    }

    // Numbers (positive or negative literal with leading space/delimiter)
    const r1 = remaining[1];
    const r2 = remaining[2];
    const isNegativeNumber =
      char === '-' &&
      r1 !== undefined &&
      ((r1 >= '0' && r1 <= '9') ||
        (r1 === '.' && r2 !== undefined && r2 >= '0' && r2 <= '9')) &&
      (index === 0 ||
        source[index - 1] === ' ' ||
        source[index - 1] === '\t' ||
        source[index - 1] === '\n' ||
        source[index - 1] === '\r' ||
        source[index - 1] === '[' ||
        source[index - 1] === '(' ||
        tokens[tokens.length - 1]?.type === TokenType.OPERATOR);

    if (
      (char !== undefined && char >= '0' && char <= '9') ||
      (char === '.' && r1 !== undefined && r1 >= '0' && r1 <= '9') ||
      isNegativeNumber
    ) {
      const match = NUMBER_REGEX.exec(remaining);
      if (match) {
        const raw = match[0];
        const numVal = parseFloat(raw);
        startLoc.length = raw.length;
        tokens.push({ type: TokenType.NUMBER, value: numVal, raw, loc: startLoc });
        index += raw.length;
        column += raw.length;
        continue;
      }
    }

    // Operators
    const opMatch = OPERATOR_REGEX.exec(remaining);
    if (opMatch) {
      const raw = opMatch[0];
      startLoc.length = raw.length;
      tokens.push({ type: TokenType.OPERATOR, value: raw, raw, loc: startLoc });
      index += raw.length;
      column += raw.length;
      continue;
    }

    // Identifiers
    const idMatch = IDENTIFIER_REGEX.exec(remaining);
    if (idMatch) {
      const raw = idMatch[0];
      const val = raw.toUpperCase();
      startLoc.length = raw.length;
      tokens.push({ type: TokenType.IDENTIFIER, value: val, raw, loc: startLoc });
      index += raw.length;
      column += raw.length;
      continue;
    }

    // Unexpected character
    startLoc.length = 1;
    throw new LexerError(
      `Unexpected symbol '${char}'. The turtle only recognizes numbers, words, brackets, and commands.`,
      startLoc,
      `Check if '${char}' was typed by mistake.`
    );
  }

  // Add EOF token
  tokens.push({
    type: TokenType.EOF,
    value: '',
    raw: '',
    loc: { line, column, offset: index, length: 0 },
  });

  return tokens;
}
