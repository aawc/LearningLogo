import type { SourceLocation } from './token.ts';

export interface BaseNode {
  loc: SourceLocation;
}

export interface ProgramNode extends BaseNode {
  type: 'Program';
  body: ASTNode[];
}

export interface CommandCallNode extends BaseNode {
  type: 'CommandCall';
  name: string;
  args: ExpressionNode[];
}

export interface ProcedureDefNode extends BaseNode {
  type: 'ProcedureDef';
  name: string;
  params: string[];
  body: ASTNode[];
}

export interface RepeatNode extends BaseNode {
  type: 'Repeat';
  count: ExpressionNode;
  body: ASTNode[];
}

export interface IfNode extends BaseNode {
  type: 'If';
  condition: ExpressionNode;
  thenBody: ASTNode[];
}

export interface IfElseNode extends BaseNode {
  type: 'IfElse';
  condition: ExpressionNode;
  thenBody: ASTNode[];
  elseBody: ASTNode[];
}

export interface MakeNode extends BaseNode {
  type: 'Make';
  varName: string;
  value: ExpressionNode;
}

export interface BinaryOpNode extends BaseNode {
  type: 'BinaryOp';
  op: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface UnaryOpNode extends BaseNode {
  type: 'UnaryOp';
  op: string;
  operand: ExpressionNode;
}

export interface NumberLiteralNode extends BaseNode {
  type: 'NumberLiteral';
  value: number;
}

export interface WordLiteralNode extends BaseNode {
  type: 'WordLiteral';
  value: string;
}

export interface ListLiteralNode extends BaseNode {
  type: 'ListLiteral';
  elements: (ASTNode | string | number)[];
}

export interface VarLookupNode extends BaseNode {
  type: 'VarLookup';
  name: string;
}

export interface StopNode extends BaseNode {
  type: 'Stop';
}

export interface OutputNode extends BaseNode {
  type: 'Output';
  value: ExpressionNode;
}

export type ExpressionNode =
  | BinaryOpNode
  | UnaryOpNode
  | NumberLiteralNode
  | WordLiteralNode
  | ListLiteralNode
  | VarLookupNode
  | CommandCallNode;

export type StatementNode =
  | CommandCallNode
  | ProcedureDefNode
  | RepeatNode
  | IfNode
  | IfElseNode
  | MakeNode
  | StopNode
  | OutputNode;

export type ASTNode = StatementNode | ExpressionNode | ProgramNode;
