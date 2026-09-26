import { describe, it, expect } from 'vitest';
import { parse } from '../../../src/interpreter/parser.ts';
import { tokenize } from '../../../src/interpreter/lexer.ts';
import { ParserError } from '../../../src/interpreter/errors.ts';
import type {
  CommandCallNode,
  BinaryOpNode,
  RepeatNode,
  IfNode,
  IfElseNode,
  MakeNode,
  ProcedureDefNode,
  NumberLiteralNode,
} from '../../../src/interpreter/ast.ts';

describe('AST Parser with Pratt Precedence', () => {
  it('parses simple command calls with arguments', () => {
    const ast = parse(tokenize('FD 100'));
    expect(ast.type).toBe('Program');
    expect(ast.body.length).toBe(1);
    const cmd = ast.body[0] as CommandCallNode;
    expect(cmd.type).toBe('CommandCall');
    expect(cmd.name).toBe('FD');
    expect(cmd.args.length).toBe(1);
    expect((cmd.args[0] as NumberLiteralNode).value).toBe(100);
  });

  it('parses operator precedence: multiplication over addition', () => {
    const ast = parse(tokenize('MAKE "RES 2 + 3 * 4'));
    const make = ast.body[0] as MakeNode;
    expect(make.type).toBe('Make');
    expect(make.varName).toBe('RES');
    const expr = make.value as BinaryOpNode;
    expect(expr.type).toBe('BinaryOp');
    expect(expr.op).toBe('+');
    expect((expr.left as NumberLiteralNode).value).toBe(2);

    const right = expr.right as BinaryOpNode;
    expect(right.type).toBe('BinaryOp');
    expect(right.op).toBe('*');
    expect((right.left as NumberLiteralNode).value).toBe(3);
    expect((right.right as NumberLiteralNode).value).toBe(4);
  });

  it('parses left-associativity for subtraction and division', () => {
    const ast = parse(tokenize('MAKE "RES 10 - 4 - 2'));
    const make = ast.body[0] as MakeNode;
    const expr = make.value as BinaryOpNode;
    expect(expr.type).toBe('BinaryOp');
    expect(expr.op).toBe('-');
    expect((expr.right as NumberLiteralNode).value).toBe(2);

    const left = expr.left as BinaryOpNode;
    expect(left.type).toBe('BinaryOp');
    expect(left.op).toBe('-');
    expect((left.left as NumberLiteralNode).value).toBe(10);
    expect((left.right as NumberLiteralNode).value).toBe(4);
  });

  it('parses grouping parentheses overriding precedence', () => {
    const ast = parse(tokenize('MAKE "RES (2 + 3) * 4'));
    const make = ast.body[0] as MakeNode;
    const expr = make.value as BinaryOpNode;
    expect(expr.type).toBe('BinaryOp');
    expect(expr.op).toBe('*');
    expect((expr.right as NumberLiteralNode).value).toBe(4);

    const left = expr.left as BinaryOpNode;
    expect(left.type).toBe('BinaryOp');
    expect(left.op).toBe('+');
    expect((left.left as NumberLiteralNode).value).toBe(2);
    expect((left.right as NumberLiteralNode).value).toBe(3);
  });

  it('parses REPEAT loops with list bodies', () => {
    const ast = parse(tokenize('REPEAT 4 [ FD 50 RT 90 ]'));
    expect(ast.body.length).toBe(1);
    const rep = ast.body[0] as RepeatNode;
    expect(rep.type).toBe('Repeat');
    expect((rep.count as NumberLiteralNode).value).toBe(4);
    expect(rep.body.length).toBe(2);
    expect((rep.body[0] as CommandCallNode).name).toBe('FD');
    expect((rep.body[1] as CommandCallNode).name).toBe('RT');
  });

  it('parses conditional IF statement with then-branch', () => {
    const ast = parse(tokenize('IF :X > 0 [ FD 10 ]'));
    const ifNode = ast.body[0] as IfNode;
    expect(ifNode.type).toBe('If');
    const cond = ifNode.condition as BinaryOpNode;
    expect(cond.type).toBe('BinaryOp');
    expect(cond.op).toBe('>');
    expect(ifNode.thenBody.length).toBe(1);
  });

  it('parses conditional IFELSE statement with then and else branches', () => {
    const ast = parse(tokenize('IFELSE :FLAG [ FD 10 ] [ BK 10 ]'));
    const ifElse = ast.body[0] as IfElseNode;
    expect(ifElse.type).toBe('IfElse');
    expect(ifElse.thenBody.length).toBe(1);
    expect((ifElse.thenBody[0] as CommandCallNode).name).toBe('FD');
    expect(ifElse.elseBody.length).toBe(1);
    expect((ifElse.elseBody[0] as CommandCallNode).name).toBe('BK');
  });

  it('parses MAKE variable assignment', () => {
    const ast = parse(tokenize('MAKE "SIZE 50'));
    const make = ast.body[0] as MakeNode;
    expect(make.type).toBe('Make');
    expect(make.varName).toBe('SIZE');
    expect((make.value as NumberLiteralNode).value).toBe(50);
  });

  it('parses procedure definition TO ... END with parameters', () => {
    const ast = parse(tokenize('TO SQUARE :SIDE REPEAT 4 [ FD :SIDE RT 90 ] END'));
    const proc = ast.body[0] as ProcedureDefNode;
    expect(proc.type).toBe('ProcedureDef');
    expect(proc.name).toBe('SQUARE');
    expect(proc.params).toEqual(['SIDE']);
    expect(proc.body.length).toBe(1);
    expect(proc.body[0]?.type).toBe('Repeat');
  });

  it('throws friendly ParserError on unclosed procedure', () => {
    expect(() => parse(tokenize('TO SQUARE FD 50'))).toThrow(ParserError);
    try {
      parse(tokenize('TO SQUARE FD 50'));
    } catch (e) {
      expect(e).toBeInstanceOf(ParserError);
      expect((e as ParserError).message).toContain('END');
    }
  });

  it('throws friendly ParserError on unclosed list bracket', () => {
    expect(() => parse(tokenize('REPEAT 4 [ FD 50'))).toThrow(ParserError);
    try {
      parse(tokenize('REPEAT 4 [ FD 50'));
    } catch (e) {
      expect(e).toBeInstanceOf(ParserError);
      expect((e as ParserError).message).toContain(']');
    }
  });

  it('parses modulo operator % with multiplication precedence', () => {
    const ast = parse(tokenize('MAKE "RES 2 + 10 % 3'));
    const make = ast.body[0] as MakeNode;
    const expr = make.value as BinaryOpNode;
    expect(expr.type).toBe('BinaryOp');
    expect(expr.op).toBe('+');

    const right = expr.right as BinaryOpNode;
    expect(right.type).toBe('BinaryOp');
    expect(right.op).toBe('%');
    expect((right.left as NumberLiteralNode).value).toBe(10);
    expect((right.right as NumberLiteralNode).value).toBe(3);
  });

  it('parses prefix math primitives with registered arity (SUM, DIFFERENCE, PRODUCT, etc.)', () => {
    const ast = parse(tokenize('FD SUM 20 30'));
    const cmd = ast.body[0] as CommandCallNode;
    expect(cmd.name).toBe('FD');
    expect(cmd.args.length).toBe(1);

    const sumCall = cmd.args[0] as CommandCallNode;
    expect(sumCall.type).toBe('CommandCall');
    expect(sumCall.name).toBe('SUM');
    expect(sumCall.args.length).toBe(2);
    expect((sumCall.args[0] as NumberLiteralNode).value).toBe(20);
    expect((sumCall.args[1] as NumberLiteralNode).value).toBe(30);
  });

  it('parses zero-arity commands like XCOR, YCOR, HEADING, CLEAN', () => {
    const ast = parse(tokenize('CLEAN\nMAKE "X XCOR'));
    expect(ast.body.length).toBe(2);
    const cleanCmd = ast.body[0] as CommandCallNode;
    expect(cleanCmd.name).toBe('CLEAN');
    expect(cleanCmd.args.length).toBe(0);

    const make = ast.body[1] as MakeNode;
    const xcorCall = make.value as CommandCallNode;
    expect(xcorCall.name).toBe('XCOR');
    expect(xcorCall.args.length).toBe(0);
  });

  describe('Variadic Parenthesized Invocations & Dual-Parameter Forms', () => {
    it('parses parenthesized zero-arity command calls (DOT), (SETORIGIN), (SETFONT)', () => {
      const ast = parse(tokenize('(DOT)\n(SETORIGIN)\n(SETFONT)'));
      expect(ast.body.length).toBe(3);

      const dotCmd = ast.body[0] as CommandCallNode;
      expect(dotCmd.type).toBe('CommandCall');
      expect(dotCmd.name).toBe('DOT');
      expect(dotCmd.args.length).toBe(0);

      const originCmd = ast.body[1] as CommandCallNode;
      expect(originCmd.name).toBe('SETORIGIN');
      expect(originCmd.args.length).toBe(0);

      const fontCmd = ast.body[2] as CommandCallNode;
      expect(fontCmd.name).toBe('SETFONT');
      expect(fontCmd.args.length).toBe(0);
    });

    it('parses parenthesized variadic calls (FILL "RED), (STAMPOVAL 50 50 "TRUE)', () => {
      const ast = parse(tokenize('(FILL "RED)\n(STAMPOVAL 50 50 "TRUE)'));
      expect(ast.body.length).toBe(2);

      const fillCmd = ast.body[0] as CommandCallNode;
      expect(fillCmd.name).toBe('FILL');
      expect(fillCmd.args.length).toBe(1);

      const ovalCmd = ast.body[1] as CommandCallNode;
      expect(ovalCmd.name).toBe('STAMPOVAL');
      expect(ovalCmd.args.length).toBe(3);
    });

    it('parses dual parameter forms: list [x y] (1 arg) vs scalars x y (2 args)', () => {
      const astList = parse(tokenize('SETXY [50 100] TOWARDS [0 0] DISTANCE [10 20]'));
      expect(astList.body.length).toBe(3);
      expect((astList.body[0] as CommandCallNode).args.length).toBe(1);
      expect((astList.body[1] as CommandCallNode).args.length).toBe(1);
      expect((astList.body[2] as CommandCallNode).args.length).toBe(1);

      const astScalars = parse(tokenize('SETXY 50 100 TOWARDS 0 0 DISTANCE 10 20'));
      expect(astScalars.body.length).toBe(3);
      expect((astScalars.body[0] as CommandCallNode).args.length).toBe(2);
      expect((astScalars.body[1] as CommandCallNode).args.length).toBe(2);
      expect((astScalars.body[2] as CommandCallNode).args.length).toBe(2);
    });

    it('distinguishes parenthesized command calls from math grouping like (HEADING + 90)', () => {
      const ast = parse(tokenize('MAKE "ANGLE (HEADING + 90)'));
      const make = ast.body[0] as MakeNode;
      expect(make.type).toBe('Make');
      const binOp = make.value as BinaryOpNode;
      expect(binOp.type).toBe('BinaryOp');
      expect(binOp.op).toBe('+');
      expect((binOp.left as CommandCallNode).name).toBe('HEADING');
    });

    it('parses parenthesized commands with negative arguments like (DOT -10 20) and (STAMPOVAL -50 50 "TRUE)', () => {
      const ast = parse(tokenize('(DOT -10 20)\n(STAMPOVAL -50 50 "TRUE)\nMAKE "A (HEADING - 90)'));
      expect(ast.body.length).toBe(3);

      const dotCmd = ast.body[0] as CommandCallNode;
      expect(dotCmd.type).toBe('CommandCall');
      expect(dotCmd.name).toBe('DOT');
      expect(dotCmd.args.length).toBe(2);

      const ovalCmd = ast.body[1] as CommandCallNode;
      expect(ovalCmd.type).toBe('CommandCall');
      expect(ovalCmd.name).toBe('STAMPOVAL');
      expect(ovalCmd.args.length).toBe(3);

      const make = ast.body[2] as MakeNode;
      const binOp = make.value as BinaryOpNode;
      expect(binOp.type).toBe('BinaryOp');
      expect(binOp.op).toBe('-');
      expect((binOp.left as CommandCallNode).name).toBe('HEADING');
    });
  });
});
