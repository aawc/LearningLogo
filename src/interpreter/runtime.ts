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
  UnaryOpNode,
  NumberLiteralNode,
  WordLiteralNode,
  VarLookupNode,
  ListLiteralNode,
  OutputNode,
} from './ast.ts';
import type { SourceLocation } from './token.ts';
import { Environment, type LogoValue } from './environment.ts';
import type { Turtle } from '../graphics/turtle.ts';
import {
  InstructionBudgetExceededError,
  RuntimeError,
} from './errors.ts';
import { executePrimitive, isPrimitive } from './primitives.ts';

export class CancellationToken {
  private _isCancelled = false;

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  cancel(): void {
    this._isCancelled = true;
  }

  reset(): void {
    this._isCancelled = false;
  }
}

export type StepType =
  | 'COMMAND'
  | 'TURTLE_ACTION'
  | 'FRAME_PUSH'
  | 'FRAME_POP'
  | 'YIELD';

export interface ExecutionStep {
  type: StepType;
  node: ASTNode;
  location: SourceLocation;
  env: Environment;
  callStack?: string[];
}

export interface RuntimeOptions {
  instructionCeiling?: number;
  yieldInterval?: number;
}

export class ReturnSignal {
  readonly value?: LogoValue;
  constructor(value?: LogoValue) {
    this.value = value;
  }
}

export class Runtime {
  private instructionCount = 0;
  private instructionCeiling = 100000;
  private outputLogs: string[] = [];

  getLogs(): readonly string[] {
    return this.outputLogs;
  }

  clearLogs(): void {
    this.outputLogs = [];
  }

  *execute(
    program: ProgramNode,
    env: Environment,
    turtle: Turtle,
    cancelToken: CancellationToken,
    options?: RuntimeOptions
  ): Generator<ExecutionStep, void, unknown> {
    this.instructionCount = 0;
    this.instructionCeiling = options?.instructionCeiling ?? 100000;

    for (const stmt of program.body) {
      if (cancelToken.isCancelled) return;
      yield* this.executeStatement(stmt, env, turtle, cancelToken);
    }
  }

  private *executeStatement(
    node: ASTNode,
    env: Environment,
    turtle: Turtle,
    cancelToken: CancellationToken
  ): Generator<ExecutionStep, ReturnSignal | void, unknown> {
    if (cancelToken.isCancelled) return;

    this.instructionCount++;
    if (this.instructionCount > this.instructionCeiling) {
      throw new InstructionBudgetExceededError(this.instructionCeiling, node.loc);
    }

    switch (node.type) {
      case 'ProcedureDef': {
        const proc = node as ProcedureDefNode;
        env.defineProcedure(proc.name, proc);
        return;
      }

      case 'Make': {
        const make = node as MakeNode;
        const val = this.evaluateExpression(make.value, env, turtle);
        env.set(make.varName, val);
        yield {
          type: 'COMMAND',
          node,
          location: node.loc,
          env,
        };
        return;
      }

      case 'Repeat': {
        const rep = node as RepeatNode;
        const countVal = Number(this.evaluateExpression(rep.count, env, turtle));
        const count = Math.max(0, Math.floor(countVal));

        for (let i = 1; i <= count; i++) {
          if (cancelToken.isCancelled) return;
          // Dynamically bind REPCOUNT in frame
          env.defineLocal('REPCOUNT', i);

          for (const stmt of rep.body) {
            if (cancelToken.isCancelled) return;
            const signal = yield* this.executeStatement(stmt, env, turtle, cancelToken);
            if (cancelToken.isCancelled) return;
            if (signal instanceof ReturnSignal) {
              return signal;
            }
          }
        }
        return;
      }

      case 'If': {
        const ifNode = node as IfNode;
        const cond = Boolean(this.evaluateExpression(ifNode.condition, env, turtle));
        if (cond) {
          for (const stmt of ifNode.thenBody) {
            const signal = yield* this.executeStatement(stmt, env, turtle, cancelToken);
            if (signal instanceof ReturnSignal) return signal;
            if (cancelToken.isCancelled) return;
          }
        }
        return;
      }

      case 'IfElse': {
        const ifElse = node as IfElseNode;
        const cond = Boolean(this.evaluateExpression(ifElse.condition, env, turtle));
        const branch = cond ? ifElse.thenBody : ifElse.elseBody;
        for (const stmt of branch) {
          const signal = yield* this.executeStatement(stmt, env, turtle, cancelToken);
          if (signal instanceof ReturnSignal) return signal;
          if (cancelToken.isCancelled) return;
        }
        return;
      }

      case 'Stop': {
        return new ReturnSignal();
      }

      case 'Output': {
        const outNode = node as OutputNode;
        const val = this.evaluateExpression(outNode.value, env, turtle);
        return new ReturnSignal(val);
      }

      case 'CommandCall': {
        const cmd = node as CommandCallNode;
        yield {
          type: 'COMMAND',
          node: cmd,
          location: cmd.loc,
          env,
        };
        if (cancelToken.isCancelled) return;

        const result = yield* this.executeCommand(cmd, env, turtle, cancelToken);
        if (cancelToken.isCancelled) return;
        if (result instanceof ReturnSignal) {
          return result;
        }
        return;
      }

      default:
        // Standalone expression statement
        this.evaluateExpression(node as ExpressionNode, env, turtle);
        return;
    }
  }

  private *executeCommand(
    cmd: CommandCallNode,
    env: Environment,
    turtle: Turtle,
    cancelToken: CancellationToken
  ): Generator<ExecutionStep, ReturnSignal | void, unknown> {
    const name = cmd.name.toUpperCase();

    // Check user-defined procedure
    const userProc = env.getProcedure(name);
    if (userProc) {
      const childEnv = env.createChild();
      // Bind parameters
      for (let i = 0; i < userProc.params.length; i++) {
        const paramName = userProc.params[i]!;
        const argExpr = cmd.args[i];
        const argVal = argExpr ? this.evaluateExpression(argExpr, env, turtle) : 0;
        childEnv.defineLocal(paramName, argVal);
      }

      yield {
        type: 'FRAME_PUSH',
        node: userProc,
        location: cmd.loc,
        env: childEnv,
      };

      for (const stmt of userProc.body) {
        if (cancelToken.isCancelled) return;
        const signal = yield* this.executeStatement(stmt, childEnv, turtle, cancelToken);
        if (signal instanceof ReturnSignal) {
          yield {
            type: 'FRAME_POP',
            node: userProc,
            location: cmd.loc,
            env,
          };
          return signal;
        }
      }

      yield {
        type: 'FRAME_POP',
        node: userProc,
        location: cmd.loc,
        env,
      };
      return;
    }

    // Built-in turtle commands
    const evalArg = (idx: number): LogoValue => {
      const arg = cmd.args[idx];
      if (!arg) {
        throw new RuntimeError(`Missing argument for command ${name}`, cmd.loc);
      }
      return this.evaluateExpression(arg, env, turtle);
    };

    switch (name) {
      case 'FD':
      case 'FORWARD':
        turtle.forward(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'BK':
      case 'BACK':
        turtle.back(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'RT':
      case 'RIGHT':
        turtle.right(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'LT':
      case 'LEFT':
        turtle.left(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'CS':
      case 'CLEARSCREEN':
        turtle.clearScreen();
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'HOME':
        turtle.home();
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'PU':
      case 'PENUP':
        turtle.penUp();
        break;

      case 'PD':
      case 'PENDOWN':
        turtle.penDown();
        break;

      case 'HT':
      case 'HIDETURTLE':
        turtle.hideTurtle();
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'ST':
      case 'SHOWTURTLE':
        turtle.showTurtle();
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'SETPC':
      case 'SETPENCOLOR':
        turtle.setPenColor(String(evalArg(0)));
        break;

      case 'SETPW':
      case 'SETPENWIDTH':
        turtle.setPenWidth(Number(evalArg(0)));
        break;

      case 'SETXY':
        turtle.setXY(Number(evalArg(0)), Number(evalArg(1)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'SETX':
        turtle.setX(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'SETY':
        turtle.setY(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'SETH':
      case 'SETHEADING':
        turtle.setHeading(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'CLEAN':
        turtle.clean();
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'PENSIZE':
        turtle.setPenWidth(Number(evalArg(0)));
        break;

      case 'ARC':
        turtle.arc(Number(evalArg(0)), Number(evalArg(1)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'CIRCLE':
        turtle.circle(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'LOCAL': {
        const arg = cmd.args[0];
        let varName = '';
        if (arg?.type === 'WordLiteral') {
          varName = String((arg as WordLiteralNode).value);
        } else if (arg) {
          varName = String(this.evaluateExpression(arg, env, turtle));
        }
        if (varName) {
          env.defineLocal(varName, 0);
        }
        break;
      }

      case 'SHOW': {
        const val = evalArg(0);
        this.outputLogs.push(String(val));
        break;
      }

      case 'XCOR':
      case 'YCOR':
      case 'HEADING':
      case 'TOWARDS':
      case 'THING':
        break;

      case 'PRINT':
      case 'PR': {
        const val = evalArg(0);
        this.outputLogs.push(String(val));
        break;
      }

      default:
        if (isPrimitive(name)) {
          const evaluatedArgs = cmd.args.map((a) => this.evaluateExpression(a, env, turtle));
          executePrimitive(name, evaluatedArgs);
          break;
        }
        throw new RuntimeError(`Turtle does not know command '${name}'`, cmd.loc);
    }
  }

  public evaluateExpression(
    expr: ExpressionNode,
    env: Environment,
    turtle: Turtle
  ): LogoValue {
    switch (expr.type) {
      case 'NumberLiteral':
        return (expr as NumberLiteralNode).value;

      case 'WordLiteral':
        return (expr as WordLiteralNode).value;

      case 'VarLookup': {
        const v = expr as VarLookupNode;
        return env.get(v.name);
      }

      case 'ListLiteral': {
        const listNode = expr as ListLiteralNode;
        return listNode.elements.map((el) => {
          if (typeof el === 'object' && el !== null && 'type' in el) {
            return this.evaluateExpression(el as ExpressionNode, env, turtle);
          }
          return el;
        });
      }

      case 'UnaryOp': {
        const u = expr as UnaryOpNode;
        const operand = Number(this.evaluateExpression(u.operand, env, turtle));
        if (u.op === '-') return -operand;
        return operand;
      }

      case 'BinaryOp': {
        const b = expr as BinaryOpNode;
        const left = this.evaluateExpression(b.left, env, turtle);
        const right = this.evaluateExpression(b.right, env, turtle);

        switch (b.op) {
          case '+':
            return Number(left) + Number(right);
          case '-':
            return Number(left) - Number(right);
          case '*':
            return Number(left) * Number(right);
          case '/': {
            const denom = Number(right);
            if (denom === 0) {
              throw new RuntimeError('Division by zero.', b.loc);
            }
            return Number(left) / denom;
          }
          case '%': {
            const denom = Number(right);
            if (denom === 0) {
              throw new RuntimeError('Modulo by zero.', b.loc);
            }
            return Number(left) % denom;
          }
          case '=':
            return left === right;
          case '<>':
            return left !== right;
          case '<':
            return Number(left) < Number(right);
          case '>':
            return Number(left) > Number(right);
          case '<=':
            return Number(left) <= Number(right);
          case '>=':
            return Number(left) >= Number(right);
          default:
            throw new RuntimeError(`Unknown operator '${b.op}'`, b.loc);
        }
      }

      case 'CommandCall': {
        const cmd = expr as CommandCallNode;
        const name = cmd.name.toUpperCase();
        if (name === 'REPCOUNT') {
          try {
            return env.get('REPCOUNT');
          } catch {
            return 1;
          }
        }
        if (name === 'XCOR') {
          return turtle.getState().x;
        }
        if (name === 'YCOR') {
          return turtle.getState().y;
        }
        if (name === 'HEADING') {
          return turtle.getState().heading;
        }
        if (name === 'TOWARDS') {
          const tx = Number(this.evaluateExpression(cmd.args[0]!, env, turtle));
          const ty = Number(this.evaluateExpression(cmd.args[1]!, env, turtle));
          return turtle.towards(tx, ty);
        }
        if (name === 'THING') {
          const vArg = cmd.args[0];
          let vName = '';
          if (vArg?.type === 'WordLiteral') {
            vName = String((vArg as WordLiteralNode).value);
          } else if (vArg) {
            vName = String(this.evaluateExpression(vArg, env, turtle));
          }
          return env.get(vName);
        }
        // Check primitive function (e.g. SUM, PRODUCT, etc.)
        if (isPrimitive(name)) {
          const evaluatedArgs = cmd.args.map((a) => this.evaluateExpression(a, env, turtle));
          return executePrimitive(name, evaluatedArgs);
        }
        // Check user-defined function returning with OUTPUT
        const proc = env.getProcedure(name);
        if (proc) {
          const childEnv = env.createChild();
          for (let i = 0; i < proc.params.length; i++) {
            const pName = proc.params[i]!;
            const aExpr = cmd.args[i];
            const aVal = aExpr ? this.evaluateExpression(aExpr, env, turtle) : 0;
            childEnv.defineLocal(pName, aVal);
          }
          const dummyCancel = new CancellationToken();
          for (const stmt of proc.body) {
            const gen = this.executeStatement(stmt, childEnv, turtle, dummyCancel);
            let res = gen.next();
            while (!res.done) {
              res = gen.next();
            }
            if (res.value instanceof ReturnSignal) {
              return res.value.value ?? 0;
            }
          }
          return 0;
        }

        throw new RuntimeError(`Function '${name}' does not return a value`, cmd.loc);
      }

      default:
        return 0;
    }
  }
}
