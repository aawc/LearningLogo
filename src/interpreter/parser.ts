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
  // Group 1: Motion (15)
  FD: 1,
  FORWARD: 1,
  BK: 1,
  BACK: 1,
  RT: 1,
  RIGHT: 1,
  LT: 1,
  LEFT: 1,
  HOME: 0,
  SETXY: 2,
  SETPOS: 2,
  SETX: 1,
  SETY: 1,
  GETX: 0,
  XCOR: 0,
  GETY: 0,
  YCOR: 0,
  GETXY: 0,
  POS: 0,
  HEADING: 0,
  SETHEADING: 1,
  SETH: 1,
  TOWARDS: 2,
  DISTANCE: 2,

  // Group 2: Visibility & Scale (5)
  ST: 0,
  SHOWTURTLE: 0,
  HT: 0,
  HIDETURTLE: 0,
  'SHOWN?': 0,
  SHOWNP: 0,
  TURTLESIZE: 0,
  TSIZE: 0,
  SETTURTLESIZE: 1,
  SETTSIZE: 1,
  SETTS: 1,

  // Group 3: Coordinate Origin (2)
  ORIGIN: 0,
  SETORIGIN: 2,

  // Group 4: Polar Coordinates (6)
  PDIST: 0,
  PANGLE: 0,
  PHEADING: 0,
  PSETHEADING: 1,
  PSETH: 1,
  PPOS: 0,
  SETP: 2,

  // Group 5: Pen Modes & Attributes (11)
  PD: 0,
  PENDOWN: 0,
  PU: 0,
  PENUP: 0,
  PE: 0,
  PENERASE: 0,
  PX: 0,
  PENREVERSE: 0,
  PEN: 0,
  'PENDOWN?': 0,
  PENDOWNP: 0,
  SETPEN: 1,
  SETWIDTH: 1,
  SETW: 1,
  WIDTH: 0,
  SETSTEPSIZE: 1,
  STEPSIZE: 0,

  // Group 6: Speed & Dynamics (5)
  SPEED: 0,
  SETSPEED: 1,
  SLOWTURTLE: 0,
  VELOCITY: 0,
  SETVELOCITY: 1,

  // Group 7: Shapes, Dots & Fills (6)
  DOT: 1,
  'DOT?': 0,
  DOTP: 0,
  DOTCOLOR: 0,
  FILL: 0,
  STAMPOVAL: 2,
  STAMPRECT: 2,

  // Group 8: Typography (6)
  FONT: 0,
  FONTS: 0,
  SETFONT: 3,
  TURTLETEXT: 1,
  TT: 1,
  TURTLETEXTBASE: 0,
  TTBASE: 0,
  TURTLETEXTSIZE: 1,
  TTSIZE: 1,

  // General Logo Primitives & System Commands
  CS: 0,
  CLEARSCREEN: 0,
  CLEAN: 0,
  SETPC: 1,
  SETPENCOLOR: 1,
  SETPW: 1,
  SETPENWIDTH: 1,
  SETBG: 1,
  SETBACKGROUND: 1,
  PRINT: 1,
  PR: 1,
  SHOW: 1,
  STOP: 0,
  OUTPUT: 1,
  OP: 1,
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
  PENSIZE: 1,
  ARC: 2,
  CIRCLE: 1,
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

  private isParenthesizedCommandCall(): boolean {
    const next = this.tokens[this.cursor + 1];
    if (!next || next.type !== TokenType.IDENTIFIER) {
      return false;
    }

    const nextNext = this.tokens[this.cursor + 2];
    if (!nextNext || nextNext.type !== TokenType.OPERATOR) {
      return true;
    }

    // If nextNext is an operator other than unary '-', it is infix math grouping like (HEADING + 90)
    if (nextNext.value !== '-') {
      return false;
    }

    // nextNext is '-'. Check if the identifier is an arity-0 numeric reporter
    const name = String(next.value).toUpperCase();
    const isNumericReporter = (
      name === 'XCOR' || name === 'GETX' ||
      name === 'YCOR' || name === 'GETY' ||
      name === 'HEADING' || name === 'REPCOUNT' ||
      name === 'PANGLE' || name === 'PDIST' || name === 'PHEADING' ||
      name === 'WIDTH' || name === 'STEPSIZE' || name === 'SPEED' ||
      name === 'VELOCITY' || name === 'TURTLESIZE' || name === 'TSIZE' ||
      name === 'TURTLETEXTBASE' || name === 'TTBASE'
    );

    // If it is an arity-0 numeric reporter, '-' is an infix operator; otherwise it is a unary negative argument
    return !isNumericReporter;
  }

  private parseStatement(): ASTNode {
    const token = this.currentToken();

    if (token.type === TokenType.LPAREN) {
      if (this.isParenthesizedCommandCall()) {
        return this.parseParenthesizedCommand();
      }
    }

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

  private parseParenthesizedCommand(): CommandCallNode {
    const lparen = this.consume(TokenType.LPAREN, 'Expected (');
    const idToken = this.consume(TokenType.IDENTIFIER, 'Expected command identifier');
    const name = String(idToken.value).toUpperCase();
    const args: ExpressionNode[] = [];

    while (!this.isAtEnd() && this.currentToken().type !== TokenType.RPAREN) {
      args.push(this.parseExpression(0));
    }

    this.consume(TokenType.RPAREN, "Expected ')' after parenthesized command arguments");
    return {
      type: 'CommandCall',
      name,
      args,
      loc: lparen.loc,
    };
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
    let arity = this.userArities.get(name) ?? COMMAND_ARITY[name] ?? 0;

    // Dual parameter support for coordinate points [x y] vs separate scalar arguments
    if (
      (name === 'SETXY' ||
        name === 'SETPOS' ||
        name === 'TOWARDS' ||
        name === 'DISTANCE' ||
        name === 'SETORIGIN' ||
        name === 'SETP' ||
        name === 'SETFONT') &&
      this.currentToken().type === TokenType.LIST_OPEN
    ) {
      arity = 1;
    }

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
      if (this.isParenthesizedCommandCall()) {
        return this.parseParenthesizedCommand();
      }

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
      elements.push(this.parseExpression(35));
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
