import { TokenType, type Token } from './token.ts';
import { ParserError } from './errors.ts';
import type {
  ProgramNode,
  ASTNode,
  ExpressionNode,
  CommandCallNode,
  RepeatNode,
  IfNode,
  IfElseNode,
  MakeNode,
  ProcedureDefNode,
  BinaryOpNode,
  NumberLiteralNode,
  WordLiteralNode,
  VarLookupNode,
  ListLiteralNode,
  StopNode,
  OutputNode,
} from './ast.ts';

const COMMAND_ARITY: Record<string, number> = {
  FD: 1,
  FORWARD: 1,
  BK: 1,
  BACK: 1,
  RT: 1,
  RIGHT: 1,
  LT: 1,
  LEFT: 1,
  CS: 0,
  CLEARSCREEN: 0,
  HOME: 0,
  PU: 0,
  PENUP: 0,
  PD: 0,
  PENDOWN: 0,
  HT: 0,
  HIDETURTLE: 0,
  ST: 0,
  SHOWTURTLE: 0,
  SETPC: 1,
  SETPENCOLOR: 1,
  SETPW: 1,
  SETPENWIDTH: 1,
  SETBG: 1,
  SETBACKGROUND: 1,
  SETXY: 2,
  PRINT: 1,
  PR: 1,
  STOP: 0,
  OUTPUT: 1,
  OP: 1,
  // Prefix Primitives & Extended Commands
  SUM: 2,
  DIFFERENCE: 2,
  PRODUCT: 2,
  QUOTIENT: 2,
  REMAINDER: 2,
  RANDOM: 1,
  SQRT: 1,
  ROUND: 1,
  ABS: 1,
  SIN: 1,
  COS: 1,
  AND: 2,
  OR: 2,
  NOT: 1,
  FIRST: 1,
  LAST: 1,
  BUTFIRST: 1,
  BF: 1,
  BUTLAST: 1,
  BL: 1,
  COUNT: 1,
  ITEM: 2,
  FPUT: 2,
  LPUT: 2,
  SENTENCE: 2,
  SE: 2,
  WORD: 2,
  LIST: 2,
  THING: 1,
  LOCAL: 1,
  SETX: 1,
  SETY: 1,
  SETH: 1,
  SETHEADING: 1,
  TOWARDS: 2,
  XCOR: 0,
  YCOR: 0,
  HEADING: 0,
  CLEAN: 0,
  PENSIZE: 1,
  ARC: 2,
  CIRCLE: 1,
  SHOW: 1,
};

const PRECEDENCE: Record<string, number> = {
  '=': 10,
  '<>': 10,
  '<': 10,
  '>': 10,
  '<=': 10,
  '>=': 10,
  '+': 20,
  '-': 20,
  '*': 30,
  '/': 30,
  '%': 30,
};

export class Parser {
  private tokens: Token[];
  private cursor = 0;
  private userArities = new Map<string, number>();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.scanProcedureDeclarations();
  }

  private scanProcedureDeclarations(): void {
    for (let i = 0; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (!t) continue;
      if (t.type === TokenType.IDENTIFIER && String(t.value).toUpperCase() === 'TO') {
        const next = this.tokens[i + 1];
        if (next && next.type === TokenType.IDENTIFIER) {
          const procName = String(next.value).toUpperCase();
          let paramCount = 0;
          let j = i + 2;
          while (j < this.tokens.length && this.tokens[j]?.type === TokenType.VAR_LOOKUP) {
            paramCount++;
            j++;
          }
          this.userArities.set(procName, paramCount);
        }
      }
    }
  }

  parse(): ProgramNode {
    const startLoc = this.currentToken().loc;
    const body: ASTNode[] = [];

    while (!this.isAtEnd()) {
      body.push(this.parseStatement());
    }

    return {
      type: 'Program',
      body,
      loc: startLoc,
    };
  }

  private parseStatement(): ASTNode {
    const token = this.currentToken();

    if (token.type === TokenType.IDENTIFIER) {
      const name = String(token.value).toUpperCase();

      if (name === 'REPEAT') {
        return this.parseRepeat();
      }
      if (name === 'IF') {
        return this.parseIf();
      }
      if (name === 'IFELSE') {
        return this.parseIfElse();
      }
      if (name === 'MAKE') {
        return this.parseMake();
      }
      if (name === 'TO') {
        return this.parseProcedureDef();
      }
      if (name === 'STOP') {
        this.advance();
        return { type: 'Stop', loc: token.loc } as StopNode;
      }
      if (name === 'OUTPUT' || name === 'OP') {
        this.advance();
        const value = this.parseExpression();
        return { type: 'Output', value, loc: token.loc } as OutputNode;
      }

      return this.parseCommandCall();
    }

    if (token.type === TokenType.LIST_OPEN) {
      return this.parseListLiteral();
    }

    // Default expression statement
    return this.parseExpression();
  }

  private parseRepeat(): RepeatNode {
    const startToken = this.consume(TokenType.IDENTIFIER, 'Expected REPEAT');
    const count = this.parseExpression();
    const body = this.parseBlock();
    return {
      type: 'Repeat',
      count,
      body,
      loc: startToken.loc,
    };
  }

  private parseIf(): IfNode {
    const startToken = this.consume(TokenType.IDENTIFIER, 'Expected IF');
    const condition = this.parseExpression();
    const thenBody = this.parseBlock();
    return {
      type: 'If',
      condition,
      thenBody,
      loc: startToken.loc,
    };
  }

  private parseIfElse(): IfElseNode {
    const startToken = this.consume(TokenType.IDENTIFIER, 'Expected IFELSE');
    const condition = this.parseExpression();
    const thenBody = this.parseBlock();
    const elseBody = this.parseBlock();
    return {
      type: 'IfElse',
      condition,
      thenBody,
      elseBody,
      loc: startToken.loc,
    };
  }

  private parseMake(): MakeNode {
    const startToken = this.consume(TokenType.IDENTIFIER, 'Expected MAKE');
    const varToken = this.currentToken();

    let varName = '';
    if (varToken.type === TokenType.WORD_LITERAL) {
      varName = String(varToken.value);
      this.advance();
    } else if (varToken.type === TokenType.IDENTIFIER) {
      varName = String(varToken.value);
      this.advance();
    } else {
      throw new ParserError(
        `Expected variable name after MAKE (e.g. MAKE "SIZE 50), found '${varToken.raw}'`,
        varToken.loc,
        'Make sure to specify variable name with a leading quote, like "RADIUS'
      );
    }

    const value = this.parseExpression();
    return {
      type: 'Make',
      varName,
      value,
      loc: startToken.loc,
    };
  }

  private parseProcedureDef(): ProcedureDefNode {
    const startToken = this.consume(TokenType.IDENTIFIER, 'Expected TO');
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected procedure name after TO');
    const name = String(nameToken.value);
    const params: string[] = [];

    // Parse parameters prefixed with colon (VAR_LOOKUP)
    while (this.currentToken().type === TokenType.VAR_LOOKUP) {
      const pToken = this.advance();
      params.push(String(pToken.value));
    }

    const body: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const cur = this.currentToken();
      if (cur.type === TokenType.IDENTIFIER && String(cur.value).toUpperCase() === 'END') {
        this.advance();
        return {
          type: 'ProcedureDef',
          name,
          params,
          body,
          loc: startToken.loc,
        };
      }
      body.push(this.parseStatement());
    }

    throw new ParserError(
      `Expected 'END' to close procedure '${name}' started at line ${startToken.loc.line}`,
      startToken.loc,
      `Add 'END' at the end of procedure '${name}'.`
    );
  }

  private parseBlock(): ASTNode[] {
    const openToken = this.consume(TokenType.LIST_OPEN, 'Expected [ to begin code block');
    const body: ASTNode[] = [];

    while (!this.isAtEnd()) {
      if (this.currentToken().type === TokenType.LIST_CLOSE) {
        this.advance();
        return body;
      }
      body.push(this.parseStatement());
    }

    throw new ParserError(
      `Expected ']' to close block opened at line ${openToken.loc.line}, column ${openToken.loc.column}`,
      openToken.loc,
      "Check for missing closing bracket ']'."
    );
  }

  private parseCommandCall(): CommandCallNode {
    const idToken = this.consume(TokenType.IDENTIFIER, 'Expected command identifier');
    const name = String(idToken.value).toUpperCase();
    const arity = this.userArities.get(name) ?? COMMAND_ARITY[name] ?? 0;
    const args: ExpressionNode[] = [];

    for (let i = 0; i < arity; i++) {
      if (this.isAtEnd() || this.currentToken().type === TokenType.LIST_CLOSE) {
        throw new ParserError(
          `Command '${name}' expects ${arity} arguments, but ran out of inputs.`,
          idToken.loc,
          `Make sure to provide all numbers or expressions for ${name}.`
        );
      }
      args.push(this.parseExpression());
    }

    return {
      type: 'CommandCall',
      name,
      args,
      loc: idToken.loc,
    };
  }

  public parseExpression(minPrecedence: number = 0): ExpressionNode {
    let left = this.parsePrefix();

    while (!this.isAtEnd()) {
      const cur = this.currentToken();
      if (cur.type !== TokenType.OPERATOR) {
        break;
      }

      const op = String(cur.value);
      const precedence = PRECEDENCE[op];
      if (precedence === undefined || precedence < minPrecedence) {
        break;
      }

      this.advance();
      // Left-associative: next precedence is minPrecedence + 1
      const right = this.parseExpression(precedence + 1);
      left = {
        type: 'BinaryOp',
        op,
        left,
        right,
        loc: left.loc,
      } as BinaryOpNode;
    }

    return left;
  }

  private parsePrefix(): ExpressionNode {
    const token = this.currentToken();

    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {
        type: 'NumberLiteral',
        value: Number(token.value),
        loc: token.loc,
      } as NumberLiteralNode;
    }

    if (token.type === TokenType.WORD_LITERAL) {
      this.advance();
      return {
        type: 'WordLiteral',
        value: String(token.value),
        loc: token.loc,
      } as WordLiteralNode;
    }

    if (token.type === TokenType.VAR_LOOKUP) {
      this.advance();
      return {
        type: 'VarLookup',
        name: String(token.value),
        loc: token.loc,
      } as VarLookupNode;
    }

    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression(0);
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    if (token.type === TokenType.LIST_OPEN) {
      return this.parseListLiteral();
    }

    if (token.type === TokenType.OPERATOR && token.value === '-') {
      this.advance();
      const operand = this.parseExpression(30);
      return {
        type: 'UnaryOp',
        op: '-',
        operand,
        loc: token.loc,
      };
    }

    if (token.type === TokenType.IDENTIFIER) {
      // Identifier in expression position: could be a function/command call or variable
      return this.parseCommandCall();
    }

    throw new ParserError(
      `Unexpected token '${token.raw || token.type}' in expression`,
      token.loc,
      'Expected a number, word, variable :NAME, or parenthesized expression.'
    );
  }

  private parseListLiteral(): ListLiteralNode {
    const startToken = this.consume(TokenType.LIST_OPEN, 'Expected [');
    const elements: ASTNode[] = [];

    while (!this.isAtEnd() && this.currentToken().type !== TokenType.LIST_CLOSE) {
      elements.push(this.parseStatement());
    }

    this.consume(TokenType.LIST_CLOSE, "Expected ']' at end of list");
    return {
      type: 'ListLiteral',
      elements,
      loc: startToken.loc,
    };
  }

  private isAtEnd(): boolean {
    return this.cursor >= this.tokens.length || this.tokens[this.cursor]?.type === TokenType.EOF;
  }

  private currentToken(): Token {
    const token = this.tokens[this.cursor];
    if (!token) {
      const last = this.tokens[this.tokens.length - 1];
      return {
        type: TokenType.EOF,
        value: '',
        raw: '',
        loc: last ? last.loc : { line: 1, column: 1, offset: 0, length: 0 },
      };
    }
    return token;
  }

  private advance(): Token {
    const token = this.currentToken();
    if (!this.isAtEnd()) {
      this.cursor++;
    }
    return token;
  }

  private consume(type: TokenType, errorMessage: string): Token {
    const cur = this.currentToken();
    if (cur.type !== type) {
      throw new ParserError(
        `${errorMessage} (found '${cur.raw || cur.type}')`,
        cur.loc,
        `Expected token of type ${type}`
      );
    }
    return this.advance();
  }
}

export function parse(tokens: Token[]): ProgramNode {
  const parser = new Parser(tokens);
  return parser.parse();
}
