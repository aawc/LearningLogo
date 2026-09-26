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
import type { Turtle, PenMode } from '../graphics/turtle.ts';
import type { CanvasRenderer } from '../graphics/renderer.ts';
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
  renderer?: CanvasRenderer;
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
  private renderer?: CanvasRenderer;

  getLogs(): readonly string[] {
    return this.outputLogs;
  }

  clearLogs(): void {
    this.outputLogs = [];
  }

  setRenderer(renderer?: CanvasRenderer): void {
    this.renderer = renderer;
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
    this.renderer = options?.renderer ?? this.renderer;

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
          node,
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

    // Built-in turtle commands helper
    const evalArg = (idx: number): LogoValue => {
      const arg = cmd.args[idx];
      if (!arg) {
        throw new RuntimeError(`Missing argument for command ${name}`, cmd.loc);
      }
      return this.evaluateExpression(arg, env, turtle);
    };

    switch (name) {
      // Group 1: Motion Commands
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

      case 'SETXY':
      case 'SETPOS': {
        if (cmd.args.length === 1) {
          const pt = evalArg(0);
          if (Array.isArray(pt)) {
            turtle.setXY(Number(pt[0] ?? 0), Number(pt[1] ?? 0));
          } else {
            turtle.setXY(Number(pt), 0);
          }
        } else {
          turtle.setXY(Number(evalArg(0)), Number(evalArg(1)));
        }
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

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

      // Group 2: Visibility & Scale
      case 'PU':
      case 'PENUP':
        turtle.penUp();
        break;

      case 'PD':
      case 'PENDOWN':
        turtle.penDown();
        break;

      case 'PE':
      case 'PENERASE':
        turtle.penErase();
        break;

      case 'PX':
      case 'PENREVERSE':
        turtle.penReverse();
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

      case 'SETTURTLESIZE':
      case 'SETTSIZE':
      case 'SETTS':
        turtle.setTurtleSize(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      // Group 3: Coordinate Origin
      case 'SETORIGIN': {
        if (cmd.args.length === 0) {
          turtle.resetOrigin();
        } else if (cmd.args.length === 1) {
          const pt = evalArg(0);
          if (Array.isArray(pt)) {
            turtle.setOrigin(Number(pt[0] ?? 0), Number(pt[1] ?? 0));
          } else {
            turtle.setOrigin(Number(pt), 0);
          }
        } else {
          turtle.setOrigin(Number(evalArg(0)), Number(evalArg(1)));
        }
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

      // Group 4: Polar Coordinates
      case 'PSETH':
      case 'PSETHEADING':
        turtle.setPolarHeading(Number(evalArg(0)));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;

      case 'SETP': {
        if (cmd.args.length === 1) {
          const pt = evalArg(0);
          if (Array.isArray(pt)) {
            turtle.setPolarPos(Number(pt[0] ?? 0), Number(pt[1] ?? 0));
          } else {
            turtle.setPolarPos(Number(pt), 0);
          }
        } else {
          turtle.setPolarPos(Number(evalArg(0)), Number(evalArg(1)));
        }
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

      // Group 5: Pen Modes & Attributes
      case 'SETPEN': {
        const normalizeMode = (m: unknown): PenMode | null => {
          const upper = String(m).toUpperCase();
          if (upper === 'PENDOWN' || upper === 'PD') return 'PENDOWN';
          if (upper === 'PENUP' || upper === 'PU') return 'PENUP';
          if (upper === 'PENERASE' || upper === 'PE') return 'PENERASE';
          if (upper === 'PENREVERSE' || upper === 'PX') return 'PENREVERSE';
          return null;
        };

        const arg = evalArg(0);
        if (Array.isArray(arg)) {
          if (arg[0] !== undefined) {
            const mode = normalizeMode(arg[0]);
            if (mode) {
              turtle.setPenMode(mode);
            }
          }
          if (arg[1] !== undefined) {
            turtle.setPenColor(String(arg[1]));
          }
        } else {
          const mode = normalizeMode(arg);
          if (mode) {
            turtle.setPenMode(mode);
          }
        }
        break;
      }

      case 'SETPC':
      case 'SETPENCOLOR':
        turtle.setPenColor(String(evalArg(0)));
        break;

      case 'SETW':
      case 'SETWIDTH':
      case 'SETPW':
      case 'SETPENWIDTH':
      case 'PENSIZE':
        turtle.setPenWidth(Number(evalArg(0)));
        break;

      case 'SETSTEPSIZE':
        turtle.setStepSize(Number(evalArg(0)));
        break;

      // Group 6: Speed & Dynamics
      case 'SETSPEED':
        turtle.setSpeed(Number(evalArg(0)));
        break;

      case 'SLOWTURTLE':
        turtle.setSpeed(0.5);
        break;

      case 'SETVELOCITY':
        turtle.setVelocity(Number(evalArg(0)));
        break;

      // Group 7: Shapes, Dots & Fills
      case 'DOT': {
        if (cmd.args.length === 0) {
          turtle.dot();
        } else if (cmd.args.length === 1) {
          const arg = evalArg(0);
          if (Array.isArray(arg)) {
            turtle.dot(Number(arg[0] ?? turtle.getState().x), Number(arg[1] ?? turtle.getState().y));
          } else {
            turtle.dot(Number(arg), turtle.getState().y);
          }
        } else if (cmd.args.length === 2) {
          const a0 = evalArg(0);
          const a1 = evalArg(1);
          if (Array.isArray(a0)) {
            turtle.dot(Number(a0[0]), Number(a0[1]), String(a1));
          } else {
            turtle.dot(Number(a0), Number(a1));
          }
        } else {
          turtle.dot(Number(evalArg(0)), Number(evalArg(1)), String(evalArg(2)));
        }
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

      case 'FILL': {
        const color = cmd.args.length > 0 ? String(evalArg(0)) : undefined;
        turtle.fill(color);
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

      case 'STAMPOVAL': {
        const rx = Number(evalArg(0));
        const ry = Number(evalArg(1));
        let filled = false;
        if (cmd.args.length > 2) {
          const fArg = evalArg(2);
          filled = String(fArg).toUpperCase() === 'TRUE' || fArg === true;
        }
        const color = cmd.args.length > 3 ? String(evalArg(3)) : undefined;
        turtle.stampOval(rx, ry, filled, color);
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

      case 'STAMPRECT': {
        const w = Number(evalArg(0));
        const h = Number(evalArg(1));
        let filled = false;
        if (cmd.args.length > 2) {
          const fArg = evalArg(2);
          filled = String(fArg).toUpperCase() === 'TRUE' || fArg === true;
        }
        const color = cmd.args.length > 3 ? String(evalArg(3)) : undefined;
        turtle.stampRect(w, h, filled, color);
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

      // Group 8: Typography
      case 'SETFONT': {
        if (cmd.args.length === 0) {
          turtle.resetFont();
        } else if (cmd.args.length === 1) {
          const arg = evalArg(0);
          if (Array.isArray(arg)) {
            turtle.setFont(String(arg[0] ?? 'Arial'), Number(arg[1] ?? 12), Number(arg[2] ?? 0));
          } else {
            turtle.setFont(String(arg));
          }
        } else {
          const name = String(evalArg(0));
          const size = cmd.args[1] ? Number(evalArg(1)) : undefined;
          const attr = cmd.args[2] ? Number(evalArg(2)) : undefined;
          turtle.setFont(name, size, attr);
        }
        break;
      }

      case 'TT':
      case 'TURTLETEXT': {
        const val = evalArg(0);
        turtle.turtleText(Array.isArray(val) ? val.join(' ') : String(val));
        yield { type: 'TURTLE_ACTION', node: cmd, location: cmd.loc, env };
        break;
      }

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

      case 'PRINT':
      case 'PR': {
        const val = evalArg(0);
        this.outputLogs.push(String(val));
        break;
      }

      // Zero-arity / Reporter commands executed as statements (ignore return value)
      case 'XCOR':
      case 'GETX':
      case 'YCOR':
      case 'GETY':
      case 'POS':
      case 'GETXY':
      case 'HEADING':
      case 'TOWARDS':
      case 'DISTANCE':
      case 'SHOWN?':
      case 'SHOWNP':
      case 'TURTLESIZE':
      case 'TSIZE':
      case 'ORIGIN':
      case 'PDIST':
      case 'PANGLE':
      case 'PHEADING':
      case 'PPOS':
      case 'PEN':
      case 'PENDOWN?':
      case 'PENDOWNP':
      case 'WIDTH':
      case 'STEPSIZE':
      case 'SPEED':
      case 'VELOCITY':
      case 'DOT?':
      case 'DOTP':
      case 'DOTCOLOR':
      case 'FONT':
      case 'FONTS':
      case 'TURTLETEXTBASE':
      case 'TTBASE':
      case 'TURTLETEXTSIZE':
      case 'TTSIZE':
      case 'THING':
        break;

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
            if (el.type === 'CommandCall') {
              const cmd = el as CommandCallNode;
              if (cmd.args.length === 0 && !env.getProcedure(cmd.name) && !isPrimitive(cmd.name)) {
                return cmd.name;
              }
            }
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

        // Group 1: Motion Reporters
        if (name === 'XCOR' || name === 'GETX') {
          return turtle.getState().x;
        }
        if (name === 'YCOR' || name === 'GETY') {
          return turtle.getState().y;
        }
        if (name === 'POS' || name === 'GETXY') {
          return [turtle.getState().x, turtle.getState().y];
        }
        if (name === 'HEADING') {
          return turtle.getState().heading;
        }
        if (name === 'TOWARDS') {
          if (cmd.args.length === 1) {
            const pt = this.evaluateExpression(cmd.args[0]!, env, turtle);
            if (Array.isArray(pt)) {
              return turtle.towards(Number(pt[0]), Number(pt[1]));
            }
          }
          const tx = Number(this.evaluateExpression(cmd.args[0]!, env, turtle));
          const ty = Number(this.evaluateExpression(cmd.args[1]!, env, turtle));
          return turtle.towards(tx, ty);
        }
        if (name === 'DISTANCE') {
          if (cmd.args.length === 1) {
            const pt = this.evaluateExpression(cmd.args[0]!, env, turtle);
            if (Array.isArray(pt)) {
              return turtle.distanceTo(Number(pt[0]), Number(pt[1]));
            }
          }
          const dx = Number(this.evaluateExpression(cmd.args[0]!, env, turtle));
          const dy = Number(this.evaluateExpression(cmd.args[1]!, env, turtle));
          return turtle.distanceTo(dx, dy);
        }

        // Group 2: Visibility & Scale
        if (name === 'SHOWN?' || name === 'SHOWNP') {
          return turtle.getState().isVisible;
        }
        if (name === 'TURTLESIZE' || name === 'TSIZE') {
          return turtle.getTurtleSize();
        }

        // Group 3: Coordinate Origin
        if (name === 'ORIGIN') {
          const org = turtle.getOrigin();
          return [org.x, org.y];
        }

        // Group 4: Polar Coordinates
        if (name === 'PDIST') {
          return turtle.getPolarDistance();
        }
        if (name === 'PANGLE') {
          return turtle.getPolarAngle();
        }
        if (name === 'PHEADING') {
          return turtle.getPolarHeading();
        }
        if (name === 'PPOS') {
          return turtle.getPolarPos();
        }

        // Group 5: Pen Modes & Attributes
        if (name === 'PEN') {
          return turtle.getPenMode();
        }
        if (name === 'PENDOWN?' || name === 'PENDOWNP') {
          return turtle.isPenDownMode();
        }
        if (name === 'WIDTH') {
          return turtle.getState().penWidth;
        }
        if (name === 'STEPSIZE') {
          return turtle.getStepSize();
        }

        // Group 6: Speed & Dynamics
        if (name === 'SPEED') {
          return turtle.getSpeed();
        }
        if (name === 'VELOCITY') {
          return turtle.getVelocity();
        }

        // Group 7: Shapes & Pixels
        if (name === 'DOT?' || name === 'DOTP') {
          const defaultVp = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };
          let localPt = { x: turtle.getState().x, y: turtle.getState().y };
          if (cmd.args.length === 1) {
            const arg = this.evaluateExpression(cmd.args[0]!, env, turtle);
            if (Array.isArray(arg)) {
              localPt = { x: Number(arg[0] ?? localPt.x), y: Number(arg[1] ?? localPt.y) };
            }
          } else if (cmd.args.length === 2) {
            localPt = {
              x: Number(this.evaluateExpression(cmd.args[0]!, env, turtle)),
              y: Number(this.evaluateExpression(cmd.args[1]!, env, turtle)),
            };
          }
          const origin = turtle.getOrigin();
          const worldPt = { x: localPt.x + origin.x, y: localPt.y + origin.y };
          if (this.renderer) {
            this.renderer.renderDrawElements(turtle.getDrawElements(), defaultVp);
            return this.renderer.isPixelActive(worldPt, defaultVp);
          }
          return false;
        }

        if (name === 'DOTCOLOR') {
          const defaultVp = { width: 800, height: 600, zoom: 1, panX: 0, panY: 0 };
          let localPt = { x: turtle.getState().x, y: turtle.getState().y };
          if (cmd.args.length === 1) {
            const arg = this.evaluateExpression(cmd.args[0]!, env, turtle);
            if (Array.isArray(arg)) {
              localPt = { x: Number(arg[0] ?? localPt.x), y: Number(arg[1] ?? localPt.y) };
            }
          } else if (cmd.args.length === 2) {
            localPt = {
              x: Number(this.evaluateExpression(cmd.args[0]!, env, turtle)),
              y: Number(this.evaluateExpression(cmd.args[1]!, env, turtle)),
            };
          }
          const origin = turtle.getOrigin();
          const worldPt = { x: localPt.x + origin.x, y: localPt.y + origin.y };
          if (this.renderer) {
            this.renderer.renderDrawElements(turtle.getDrawElements(), defaultVp);
            return this.renderer.getPixelColor(worldPt, defaultVp);
          }
          return [255, 255, 255];
        }

        // Group 8: Typography
        if (name === 'FONT') {
          const f = turtle.getFont();
          return [f.name, f.size, f.attributes];
        }
        if (name === 'FONTS') {
          return [...turtle.getFonts()];
        }
        if (name === 'TURTLETEXTBASE' || name === 'TTBASE') {
          if (this.renderer) {
            return this.renderer.measureTextBaseline(turtle.getFont());
          }
          return Math.round(turtle.getFont().size * 0.8);
        }
        if (name === 'TURTLETEXTSIZE' || name === 'TTSIZE') {
          const tVal = this.evaluateExpression(cmd.args[0]!, env, turtle);
          const text = Array.isArray(tVal) ? tVal.join(' ') : String(tVal);
          if (this.renderer) {
            return this.renderer.measureTextDimensions(text, turtle.getFont());
          }
          return [Math.round(text.length * turtle.getFont().size * 0.6), Math.round(turtle.getFont().size * 1.2)];
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
