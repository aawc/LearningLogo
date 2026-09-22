import type { SourceLocation } from './token.ts';

export class LogoError extends Error {
  readonly loc: SourceLocation;
  readonly hint: string;

  constructor(message: string, loc: SourceLocation, hint: string = '') {
    super(`${message} (line ${loc.line}, column ${loc.column})`);
    this.name = 'LogoError';
    this.loc = loc;
    this.hint = hint;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LexerError extends LogoError {
  constructor(message: string, loc: SourceLocation, hint: string = '') {
    super(message, loc, hint);
    this.name = 'LexerError';
  }
}

export class ParserError extends LogoError {
  constructor(message: string, loc: SourceLocation, hint: string = '') {
    super(message, loc, hint);
    this.name = 'ParserError';
  }
}

export class RuntimeError extends LogoError {
  constructor(message: string, loc: SourceLocation, hint: string = '') {
    super(message, loc, hint);
    this.name = 'RuntimeError';
  }
}

export class InstructionBudgetExceededError extends RuntimeError {
  constructor(ceiling: number, loc: SourceLocation) {
    super(
      `Turtle ran for more than ${ceiling.toLocaleString()} steps! Possible infinite loop detected.`,
      loc,
      'Check your REPEAT loops or recursive procedures to make sure they have a stopping condition.'
    );
    this.name = 'InstructionBudgetExceededError';
  }
}

export class ExecutionAbortedError extends LogoError {
  constructor(loc: SourceLocation = { line: 1, column: 1, offset: 0, length: 0 }) {
    super('Execution stopped by user.', loc, 'You pressed stop.');
    this.name = 'ExecutionAbortedError';
  }
}
