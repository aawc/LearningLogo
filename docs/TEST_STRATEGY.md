# LearningLogo: Comprehensive Test Strategy

## 1. Testing Philosophy & Guiding Principles

The testing strategy for LearningLogo is built on three foundational tenets:
1. **Zero-Mock Policy for Domain Logic**:
   The core computational engine—Lexer, Parser, AST Evaluator, Scope Chain, and Turtle Trigonometry—must be tested with concrete inputs and real mathematical assertions. Mocking tokenizer streams or AST nodes produces fragile tests that verify test assumptions rather than actual system behavior.
2. **Red-Green-Refactor TDD Cycle**:
   Every new primitive, syntax rule, or bug fix begins with an automated unit test. The test must be verified in its failing state ([FAIL] / Red) before production code is written, and confirmed in its passing state ([PASS] / Green) once implemented.
3. **Red-Green Colorblind Friendly Reporting**:
   Test output formatters, assertion failures, and CI logs must use unambiguous text tags (`[PASS]`, `[FAIL]`, `[WARN]`, `[SKIP]`) paired with dual-encoded indicators (line markers `[-]` and `[+]`). Bare colored dots or color-only text are strictly prohibited.

---

## 2. Test Architecture & Directory Structure

```
tests/
├── unit/
│   ├── interpreter/
│   │   ├── lexer.test.ts          # Tokenization, edge cases, error tokens
│   │   ├── parser.test.ts         # AST validation, precedence, syntax errors
│   │   ├── environment.test.ts    # Scope frames, variable lookup, dynamic scope
│   │   ├── runtime.test.ts        # Step generator, loop budget, cancellation
│   │   └── primitives.test.ts     # Core math, lists, logic, turtle commands
│   ├── graphics/
│   │   ├── coordinates.test.ts    # Cartesian-to-canvas transforms, heading math
│   │   ├── turtle.test.ts         # Turtle state transitions (FD, BK, LT, RT, PU, PD)
│   │   └── palette.test.ts        # Okabe-Ito color mapping & contrast verification
│   └── storage/
│       ├── project.test.ts        # JSON schema serialization/deserialization
│       └── url_share.test.ts      # LZ-string compression, decompression, round-trip
├── integration/
│   ├── debugger.test.ts           # Debugger state transitions, step-into, pause
│   ├── editor_diagnostics.test.ts # Syntax error detection to line/column mapping
│   ├── end_to_end_scripts.test.ts # Execution of multi-step Logo programs (e.g. square, tree)
│   └── service_worker.test.ts     # Precache asset verification and update notifications
```

---

## 3. Unit Testing Specifications

### 3.1 Lexer Test Suite (`lexer.test.ts`)
- **Word Literals**: Verify `"HELLO`, `"MY_VAR_1` produce `WORD_LITERAL` tokens with stripped leading quotes in value.
- **Variable Lookups**: Verify `:X`, `:SIZE` produce `VAR_LOOKUP` tokens with variable names preserved.
- **Numbers**: Verify integer (`100`), negative (`-50`), floating-point (`3.14159`), and leading decimal (`.5`).
- **Lists & Delimiters**: Verify nested brackets `[ [ FD 10 ] [ RT 90 ] ]` tokenized with balanced counts.
- **Comments & Whitespace**: Verify `; comment text` is stripped without altering following token locations.
- **Source Locations**: Verify exact line, column, and length anchors on every token.

### 3.2 Parser Test Suite (`parser.test.ts`)
- **Operator Precedence**: Verify mathematical expression trees:
  - `2 + 3 * 4` evaluates as `2 + (3 * 4)`.
  - `(2 + 3) * 4` evaluates as `(2 + 3) * 4`.
  - `10 - 4 - 2` evaluates as `(10 - 4) - 2` (left-associative).
- **Control Flow AST**:
  - `REPEAT 4 [ FD 50 RT 90 ]` constructs `RepeatNode` with count expression and child statements.
  - `IFELSE :X > 0 [ FD 10 ] [ BK 10 ]` constructs `IfElseNode` with condition and dual branches.
- **Procedure Definitions**:
  - `TO SQUARE :SIZE REPEAT 4 [ FD :SIZE RT 90 ] END` builds `ProcedureDefNode` with parameter list `["SIZE"]`.
- **Diagnostic Error Handling**:
  - Missing `END` triggers friendly error: *"Expected 'END' to close procedure 'SQUARE' started at line 1"*.
  - Unmatched `]` or `[` returns exact line and column location.

### 3.3 Runtime & Environment Test Suite (`runtime.test.ts`, `environment.test.ts`)
- **Scoping & Variable Lookup**:
  - Global variable `MAKE "X 10` is readable inside procedure.
  - Parameter `:X` in `TO FOO :X` shadows global `:X` within procedure frame.
  - Exiting procedure restores caller scope without leaking local variables.
- **Recursion & Base Cases**:
  - Recursive countdown `TO COUNTDOWN :N IF :N <= 0 [ STOP ] COUNTDOWN :N - 1 END` runs to completion.
- **Loop Ceiling & Yielding**:
  - A runaway loop `REPEAT 1000000 [ FD 1 ]` halts cleanly when instruction budget is exceeded, triggering pause event.
  - Cooperative cancellation token immediately terminates generator execution.

### 3.4 Turtle Geometry & Math Test Suite (`coordinates.test.ts`, `turtle.test.ts`)
- **Heading Calculations**:
  - Heading 0°: $\Delta x = 0, \Delta y = 100$ for `FD 100`.
  - Heading 90°: $\Delta x = 100, \Delta y = 0$ for `FD 100`.
  - Heading 180°: $\Delta x = 0, \Delta y = -100$ for `FD 100`.
  - Heading 270°: $\Delta x = -100, \Delta y = 0$ for `FD 100`.
  - Heading normalization: `RT 450` normalizes to `90°`. `LT 90` from `0°` normalizes to `270°`.
- **Coordinate Projection**:
  - Logo origin (0, 0) on an $800 \times 600$ canvas projects to $(400, 300)$.
  - Logo coordinate $(100, 100)$ projects to $(500, 200)$ (Y-inverted).

---

## 4. Subsystem & Integration Testing

### 4.1 End-to-End Script Execution (`end_to_end_scripts.test.ts`)
Validates that full Logo programs execute through lexer, parser, runtime, and turtle state to produce expected geometric paths:
- **Square Program**:
  ```logo
  CS
  REPEAT 4 [ FD 100 RT 90 ]
  ```
  *Assertions*: Turtle ends at position (0, 0), heading 0°, having recorded 4 path segments of length 100 forming a closed square.
- **House Program (Procedures & Modularity)**:
  Executes `TO SQUARE`, `TO ROOF`, and composite `TO HOUSE`.
  *Assertions*: All procedure calls resolve cleanly; canvas path contains combined square and triangle vectors.

### 4.2 Debugger State Machine (`debugger.test.ts`)
- State transitions strictly follow the state model: `IDLE` -> `RUNNING` -> `PAUSED` -> `STEPPING` -> `IDLE`.
- Step Into yields precisely one AST command step, emits active line number, and pauses.
- Stop button immediately aborts active execution and clears highlight state.

### 4.3 Storage & Share Round-Trip (`url_share.test.ts`, `project.test.ts`)
- Complex multi-line Logo scripts with Unicode characters are compressed to URL hash, decompressed, and asserted identical to original source (`assert.equal(decompressed, original)`).
- Project serialization round-trips code, timestamp, and settings cleanly without data loss.

---

## 5. Accessibility & Colorblindness Verification

1. **Automated Palette Contrast Test**:
   Unit test in `palette.test.ts` calculates the WCAG 2.1 contrast ratio for every color in the Okabe-Ito palette against both white (`#FFFFFF`) and dark background (`#1E1E1E`), asserting minimum ratio $\ge 4.5:1$ for text and $\ge 3.0:1$ for graphical objects.
2. **Dual-Encoding Audit**:
   Every status indicator in the UI must pair color with unambiguous text labels (`[PASS]`, `[FAIL]`, `[WARN]`).

---

## 6. Continuous Integration & Quality Gates

All pull requests and commits are verified through the following sequential quality gate:

| Step | Command | Verification Requirement | Status Indicator |
| :--- | :--- | :--- | :--- |
| **0. Dependency Audit** | `npm audit --audit-level=moderate` | Zero moderate or higher vulnerabilities | `[PASS]` |
| **1. Type Check** | `tsc --noEmit` | Zero TypeScript errors with strict mode | `[PASS]` |
| **2. Unit Tests** | `vitest run tests/unit` | 100% test pass rate | `[PASS]` |
| **3. Integration Tests** | `vitest run tests/integration` | 100% test pass rate | `[PASS]` |
| **4. Bundle Size** | `vite build` | Production bundle $< 150\text{ KB}$ gzipped | `[PASS]` |

### 6.1 Dependency Vulnerability Audit Policy
Dependencies must be continuously audited against known Common Vulnerabilities and Exposures (CVEs) using `npm audit`.
- **Pre-Commit Enforcement**: The pre-commit hook (`scripts/pre_commit.sh`) executes `npm run audit` locally before allowing commits.
- **CI Pipeline Gate**: GitHub Actions (`.github/workflows/security.yml`) executes `npm run audit` on all pushes and pull requests targeting `main`.
- **Threshold**: Zero moderate, high, or critical vulnerabilities are permitted. Any advisory meeting or exceeding CVSS moderate severity blocks the build.
