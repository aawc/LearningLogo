# Implementation Plan: Terrapin Logo 56 Drawing Commands

**Date**: 2026-09-26  
**Status**: [APPROVED]  
**Author**: Staff AI Architect (Planner)  
**Target Repository**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo`  
**Associated Design**: [docs/design/2026-09-26-terrapin_drawing_commands_design.md](file:///usr/local/google/home/vakh/git/hub/aawc/LearningLogo/docs/design/2026-09-26-terrapin_drawing_commands_design.md)  

---

## Pre-Flight Check / Workspace Verification

1. **VCS & Branch Status**: Active branch is `main` at `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo`. Clean baseline verified with 0 uncommitted changes.
2. **Build & Test Baseline**:
   - TypeScript: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit` -> `0 errors` [PASS].
   - Vitest: `/usr/bin/node ./node_modules/vitest/vitest.mjs run` -> `40 test files passed (336/336 tests)` [PASS].
3. **Workspace Safety**: Planner agent remains strictly read-only regarding existing codebase. All implementation, refactoring, and test execution tasks are delegated to the `implementer` agent.
4. **Accessibility Standards**: Red-green colorblind friendly formatting enforced (`[PASS]`, `[FAIL]`, `[ADDED]`, `[REMOVED]`, `[MODIFIED]`, `[-]`/`[+]`). No GitHub alert syntax.

---

## Delegation & Execution Model

All tasks defined below MUST be executed sequentially by the **Implementer** agent following the strict 4-step gpowers TDD lifecycle:
1. **Audit**: Inspect existing test fixtures, dependencies, and state interfaces.
2. **RED**: Write failing tests asserting expected behavior and verify failure.
3. **GREEN**: Apply minimal production implementation to make tests pass.
4. **Verification**: Run `tsc --noEmit` and `vitest run` on affected targets.

---

## Phase 1: Turtle State Extensions & Coordinate Math

### Task 1.1: Coordinate Math Extensions (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/graphics/coordinates.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/graphics/coordinates.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/graphics/coordinates.ts#L1-L76`.
   - Inspect existing tests in `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/graphics/coordinates.test.ts#L1-L82`.
2. **RED**:
   - Add new tests in `tests/unit/graphics/coordinates.test.ts` testing:
     - `[+]` `CoordinateTransform.calculateDistance(p1, p2)` computing Euclidean distance.
     - `[+]` `CoordinateTransform.cartesianToPolarDistance(dx, dy)` returning hypotenuse.
     - `[+]` `CoordinateTransform.cartesianToPolarAngle(dx, dy)` returning polar angle in degrees `[0, 360)` counter-clockwise from East (3 o'clock): (10, 0) -> 0°, (0, 10) -> 90°, (-10, 0) -> 180°, (0, -10) -> 270°.
     - `[+]` `CoordinateTransform.cartesianToPolarHeading(cartesianHeading)` returning `(450 - cartesianHeading) % 360`: North (0°) -> 90°, East (90°) -> 0°, South (180°) -> 270°, West (270°) -> 180°.
     - `[+]` `CoordinateTransform.polarToCartesianHeading(polarHeading)` returning `(450 - polarHeading) % 360`.
     - `[+]` `CoordinateTransform.polarToDisplacement(distance, polarAngle)` calculating `(dx, dy)` from polar distance and angle.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Implement the static mathematical methods in `CoordinateTransform` in `src/graphics/coordinates.ts`.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/graphics/coordinates.test.ts`

---

### Task 1.2: Turtle State & Motion Extensions (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/graphics/turtle.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/graphics/turtle.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/graphics/turtle.ts#L1-L174`.
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/graphics/turtle.test.ts#L1-L100`.
2. **RED**:
   - Add new tests in `tests/unit/graphics/turtle.test.ts` testing:
     - `[+]` `origin` property: initialized to `[0, 0]`, mutated via `setOrigin(x, y)`, reset via `resetOrigin()`, reported via `getOrigin()`.
     - `[+]` `distanceTo(x, y)`: reports distance from turtle to target point.
     - `[+]` `polar` navigation: `getPolarDistance()`, `getPolarAngle()`, `getPolarHeading()`, `setPolarHeading(angle)`, `getPolarPos()`, `setPolarPos(distance, angle)`.
     - `[+]` `turtleSize` property: initialized to 1.0, clamped between 0.01 and 99.0 via `setTurtleSize(size)`, reported via `getTurtleSize()`.
     - `[+]` `speed` property: initialized to 1.0, clamped 0.1 to 1.0 via `setSpeed(speed)`, resets velocity to 0.
     - `[+]` `velocity` property: initialized to 0, mutated via `setVelocity(v)`.
     - `[+]` `stepSize` property: initialized to 1, mutated via `setStepSize(size)`; `forward(d)` and `back(d)` scale displacement by `stepSize`.
     - `[+]` `penMode` property: supports `'PENDOWN'`, `'PENUP'`, `'PENERASE'`, `'PENREVERSE'`, reported via `getPenMode()`.
     - `[+]` `isPenDownMode()`: reports `true` for `'PENDOWN'`, `'PENERASE'`, `'PENREVERSE'`, and `false` for `'PENUP'`.
     - `[+]` `font` state: initialized to `{ name: 'Arial', size: 12, attributes: 0 }`, mutated via `setFont(name, size, attributes)`, reset via `resetFont()`.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Update `TurtleState` interface in `src/graphics/turtle.ts` with:
     ```typescript
     export type PenMode = 'PENDOWN' | 'PENUP' | 'PENERASE' | 'PENREVERSE';
     export interface TurtleFont { name: string; size: number; attributes: number; }
     ```
   - Implement state properties and corresponding getters/setters in `Turtle`.
   - Update `forward` and `back` to multiply distance by `this.stepSize`.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/graphics/turtle.test.ts`

---

## Phase 2: Drawing Primitives & Canvas Rendering

### Task 2.1: Drawing Element Model in Turtle (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/graphics/turtle.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/graphics/turtle.test.ts`

1. **Audit**:
   - Inspect existing `PathSegment` definition in `src/graphics/turtle.ts#L4-L9`.
2. **RED**:
   - Add new tests in `tests/unit/graphics/turtle.test.ts` verifying:
     - `[+]` `turtle.dot(x?, y?, color?)` appends `{ type: 'dot', ... }` to `drawElements` when pen mode is active.
     - `[+]` `turtle.stampOval(xRadius, yRadius, filled?, color?)` appends `{ type: 'oval', ... }`.
     - `[+]` `turtle.stampRect(width, height, filled?, color?)` appends `{ type: 'rect', ... }`.
     - `[+]` `turtle.turtleText(text)` appends `{ type: 'text', ... }` when pen mode is active.
     - `[+]` `turtle.fill(color?, boundaryColor?)` appends `{ type: 'fill', ... }` when pen mode is active.
     - `[+]` `turtle.clean()` and `turtle.clearScreen()` clear all `drawElements`.
     - `[+]` `turtle.getPathSegments()` continues to return line segments for backward compatibility.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Define `DrawElement` discriminated union in `src/graphics/turtle.ts`.
   - Implement `drawElements: DrawElement[] = []`, `getDrawElements(): readonly DrawElement[]`, and drawing primitive methods on `Turtle`.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/graphics/turtle.test.ts`

---

### Task 2.2: CanvasRenderer Primitives, Compositing & Scanline Fill (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/graphics/renderer.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/graphics/renderer.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/graphics/renderer.ts#L1-L115`.
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/graphics/renderer.test.ts#L1-L85`.
2. **RED**:
   - Add new tests in `tests/unit/graphics/renderer.test.ts` verifying:
     - `[+]` `renderDrawElements` draws lines, dots, ovals, rects, text, and fills.
     - `[+]` `PENERASE` sets `ctx.globalCompositeOperation = 'destination-out'`.
     - `[+]` `PENREVERSE` sets `ctx.globalCompositeOperation = 'difference'`.
     - `[+]` `getPixelColor(x, y, vp)` reads 32-bit pixel data and returns `[r, g, b]`.
     - `[+]` `isPixelActive(x, y, vp)` returns true if pixel differs from canvas background.
     - `[+]` `scanlineFloodFill` correctly fills contiguous pixel regions on `Uint32Array`.
     - `[+]` `measureTextBaseline` and `measureTextDimensions` return valid measurements with headless fallback.
     - `[+]` `renderTurtle` scales sprite by `turtleState.turtleSize`.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Implement `renderDrawElements(elements: readonly DrawElement[], viewport: ViewportState): void` in `CanvasRenderer`.
   - Implement scanline queue flood fill algorithm on `Uint32Array(imgData.data.buffer)`.
   - Implement pixel interrogation (`getPixelColor`, `isPixelActive`).
   - Implement text measurement methods (`measureTextBaseline`, `measureTextDimensions`).
   - Update `renderTurtle` to scale the Chevron sprite path by `turtleState.turtleSize`.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/graphics/renderer.test.ts`

---

## Phase 3: Lexer & Parser Updates

### Task 3.1: Lexer Word Literal & Symbol Extensions (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/lexer.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/interpreter/lexer.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/lexer.ts#L4-L9`.
2. **RED**:
   - Add new tests in `tests/unit/interpreter/lexer.test.ts` verifying:
     - `[+]` Tokenizing words containing `#` (`"#0072B2`), hyphens (`"TIMES-ROMAN`), and dots (`"FILE.LOGO`).
     - `[+]` Tokenizing identifiers ending in `?` (`SHOWN?`, `DOT?`, `PENDOWN?`).
     - `[+]` Tokenizing parentheses around commands (`(DOT)`, `(FILL "RED)`).
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Update `WORD_LITERAL_REGEX` in `src/interpreter/lexer.ts` to `/^"([^\s\[\]\(\)]+)/`.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/interpreter/lexer.test.ts`

---

### Task 3.2: Parser Variadic Parenthesized Invocations & Arity Registry (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/parser.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/interpreter/parser.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/parser.ts#L22-L98`.
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/parser.ts#L159-L200` and `#L321-L344`.
2. **RED**:
   - Add new tests in `tests/unit/interpreter/parser.test.ts` verifying:
     - `[+]` Parsing parenthesized command with 0 arguments: `(DOT)` -> `CommandCallNode` with `args: []`.
     - `[+]` Parsing parenthesized command with variable arguments: `(FILL "RED)`, `(STAMPOVAL 50 50 "TRUE)`.
     - `[+]` Parsing arithmetic grouping without misinterpreting as command: `(2 + 3) * 4`.
     - `[+]` Dual parameter form: `SETXY [50 50]` (1 list argument) vs `SETXY 50 50` (2 numeric arguments).
     - `[+]` Arity registration for all 56 commands and their official aliases.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Populate `COMMAND_ARITY` with all 56 commands & aliases:
     - `DISTANCE: 1` (or 2), `DOT: 1`, `DOTCOLOR: 1`, `FILL: 0`, `FONT: 0`, `FONTS: 0`, `GETX: 0`, `GETY: 0`, `GETXY: 0`, `ORIGIN: 0`, `PANGLE: 0`, `PDIST: 0`, `PEN: 0`, `PENDOWN?: 0`, `PENDOWNP: 0`, `PHEADING: 0`, `PPOS: 0`, `PSETHEADING: 1`, `PSETH: 1`, `SETP: 2`, `SETPEN: 1`, `SETORIGIN: 1`, `SETSPEED: 1`, `SETSTEPSIZE: 1`, `SETTURTLESIZE: 1`, `SETTSIZE: 1`, `SETTS: 1`, `SETVELOCITY: 1`, `SETWIDTH: 1`, `SETW: 1`, `SHOWN?: 0`, `SHOWNP: 0`, `SLOWTURTLE: 0`, `SPEED: 0`, `STAMPOVAL: 2`, `STAMPRECT: 2`, `STEPSIZE: 0`, `TURTLESIZE: 0`, `TSIZE: 0`, `TURTLETEXT: 1`, `TT: 1`, `TURTLETEXTBASE: 0`, `TTBASE: 0`, `TURTLETEXTSIZE: 1`, `TTSIZE: 1`, `VELOCITY: 0`, `WIDTH: 0`.
   - Update `parseStatement()` and `parsePrefix()`: when `TokenType.LPAREN` is followed by an `IDENTIFIER` and not followed by an infix operator, enter parenthesized command mode and collect expressions until `RPAREN`.
   - In `parseCommandCall()`: when parsing commands supporting `[x y]` lists (`SETXY`, `TOWARDS`, `DISTANCE`, `SETORIGIN`, `SETP`, `DOT`, `DOTCOLOR`), check if next token is `[`: if so, consume 1 argument; otherwise consume default scalar arity.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/interpreter/parser.test.ts`

---

## Phase 4: Runtime Execution & Expression Evaluation Wiring

### Task 4.1: Runtime Command Execution Wiring (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/runtime.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/interpreter/runtime.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/runtime.ts#L264-L424`.
2. **RED**:
   - Add new tests in `tests/unit/interpreter/runtime.test.ts` verifying execution of all mutator commands:
     - `[+]` Motion: `FORWARD`/`FD`, `BACK`/`BK`, `RIGHT`/`RT`, `LEFT`/`LT`, `HOME`, `SETXY`/`SETPOS`, `SETX`, `SETY`, `SETHEADING`/`SETH`.
     - `[+]` Visibility: `SHOWTURTLE`/`ST`, `HIDETURTLE`/`HT`, `SETTURTLESIZE`/`SETTSIZE`/`SETTS`.
     - `[+]` Origin: `SETORIGIN` (list, 2 numbers, or empty reset).
     - `[+]` Polar: `PSETHEADING`/`PSETH`, `SETP`.
     - `[+]` Pen Modes: `PENDOWN`/`PD`, `PENUP`/`PU`, `PENERASE`/`PE`, `PENREVERSE`/`PX`, `SETPEN`, `SETWIDTH`/`SETW`, `SETSTEPSIZE`.
     - `[+]` Speed & Velocity: `SETSPEED`, `SLOWTURTLE`, `SETVELOCITY`.
     - `[+]` Shapes & Fill: `DOT`, `FILL`, `STAMPOVAL`, `STAMPRECT`.
     - `[+]` Typography: `SETFONT`, `TURTLETEXT`/`TT`.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - In `Runtime.executeCommand()`, add cases for all drawing and state mutator commands, invoking corresponding methods on `Turtle`.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/interpreter/runtime.test.ts`

---

### Task 4.2: Runtime Expression Evaluation Wiring for Reporters (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/runtime.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/interpreter/runtime.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/interpreter/runtime.ts#L503-L567`.
2. **RED**:
   - Add new tests in `tests/unit/interpreter/runtime.test.ts` verifying evaluation of all reporter commands:
     - `[+]` Motion: `GETX`/`XCOR`, `GETY`/`YCOR`, `GETXY`/`POS`, `HEADING`, `TOWARDS`, `DISTANCE`.
     - `[+]` Visibility: `SHOWN?`/`SHOWNP`, `TURTLESIZE`/`TSIZE`.
     - `[+]` Origin: `ORIGIN`.
     - `[+]` Polar: `PDIST`, `PANGLE`, `PHEADING`, `PPOS`.
     - `[+]` Pen: `PEN`, `PENDOWN?`/`PENDOWNP`, `WIDTH`, `STEPSIZE`.
     - `[+]` Dynamics: `SPEED`, `VELOCITY`.
     - `[+]` Shapes & Pixels: `DOT?`/`DOTP`, `DOTCOLOR`.
     - `[+]` Typography: `FONT`, `FONTS`, `TURTLETEXTBASE`/`TTBASE`, `TURTLETEXTSIZE`/`TTSIZE`.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - In `Runtime.evaluateExpression()`, handle all reporter command names under `case 'CommandCall'`, returning computed values directly from `Turtle` and `CanvasRenderer`.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/interpreter/runtime.test.ts`

---

## Phase 5: Comprehensive Test Suite & App Integration

### Task 5.1: Dedicated 56-Command Unit Test Suite (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/interpreter/drawing_commands.test.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/unit/interpreter/drawing_commands.test.ts`

1. **Audit**:
   - Review the complete 56-command taxonomy in `docs/design/2026-09-26-terrapin_drawing_commands_design.md`.
2. **RED**:
   - Create `tests/unit/interpreter/drawing_commands.test.ts` containing dedicated test cases for all 56 commands across their 8 functional categories:
     - Group 1: Motion (15 commands)
     - Group 2: Visibility & Scale (5 commands)
     - Group 3: Origin (2 commands)
     - Group 4: Polar Coordinates (6 commands)
     - Group 5: Pen Modes & Attributes (11 commands)
     - Group 6: Speed & Dynamics (5 commands)
     - Group 7: Shapes, Dots & Fills (6 commands)
     - Group 8: Typography (6 commands)
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Ensure all runtime, turtle, and parser wiring satisfy all 56 command tests.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/unit/interpreter/drawing_commands.test.ts`

---

### Task 5.2: End-to-End Integration Test Suite (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/integration/drawing_pipeline.test.ts`
- **Verification Target**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/integration/drawing_pipeline.test.ts`

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/tests/integration/end_to_end_scripts.test.ts`.
2. **RED**:
   - Create `tests/integration/drawing_pipeline.test.ts` testing multi-command programs:
     - `[+]` Polar spiral: `REPEAT 36 [SETP (REPCOUNT * 5) (REPCOUNT * 10)]`.
     - `[+]` Stamped geometric art: `REPEAT 4 [STAMPOVAL 40 20 (STAMPRECT 30 30 "TRUE) RT 90]`.
     - `[+]` Origin shifting and multi-origin drawing.
     - `[+]` Pen erase and pen reverse overlays.
     - `[+]` Typography alignment with `TTBASE` and `TTSIZE`.
     - `[+]` Flood fill bounded regions.
   - Run Vitest: verify failure (RED).
3. **GREEN**:
   - Verify that all complex multi-step scripts execute smoothly through the `Runtime` generator without unhandled exceptions or memory leaks.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Test: `/usr/bin/node ./node_modules/vitest/vitest.mjs run tests/integration/drawing_pipeline.test.ts`

---

### Task 5.3: Main Application Wiring & Full Suite Verification (To be executed by Implementer)

- **Target File**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/main.ts`
- **Verification Target**: Entire test suite

1. **Audit**:
   - Review `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo/src/main.ts#L134-L138`.
2. **RED**:
   - Ensure `renderCanvas()` calls `renderer.renderDrawElements(turtle.getDrawElements(), vp)` in addition to `renderPaths`.
3. **GREEN**:
   - Update `renderCanvas()` in `src/main.ts` to invoke `renderDrawElements` for full fidelity rendering of dots, shapes, text, and fills.
4. **Verification**:
   - Typecheck: `/usr/bin/node ./node_modules/typescript/bin/tsc --noEmit`
   - Full Vitest Run: `/usr/bin/node ./node_modules/vitest/vitest.mjs run`
