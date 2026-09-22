export enum TokenType {
  NUMBER = 'NUMBER',
  WORD_LITERAL = 'WORD_LITERAL',
  VAR_LOOKUP = 'VAR_LOOKUP',
  IDENTIFIER = 'IDENTIFIER',
  LIST_OPEN = 'LIST_OPEN',
  LIST_CLOSE = 'LIST_CLOSE',
  OPERATOR = 'OPERATOR',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  COMMENT = 'COMMENT',
  EOF = 'EOF',
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
  length: number;
}

export interface Token {
  type: TokenType;
  value: string | number;
  raw: string;
  loc: SourceLocation;
}
