#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[*] Executing Step 0: Baseline Tracking"
git add LICENSE PRD.md PROMPT.md docs/
git commit -m "docs: establish baseline architecture, product requirements, and test strategy

Establish product requirements, complete design specification, testing strategy,
and two-phase master implementation plans for the offline-first educational
Logo programming Progressive Web App (PWA).

Design Doc Citation: docs/DESIGN.md:L1-L406
PRD Citation: PRD.md:L1-L242"

echo "[*] Executing Step 1: Tooling & Scaffolding"
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts .gitignore .npmrc index.html tests/unit/scaffolding.test.ts
git commit -m "chore(tooling): scaffold Vite, TypeScript 5 strict, and Vitest test harness

Configure client-side development tooling, strict TypeScript 5 settings,
and Vitest test runner with zero production dependencies to guarantee
sub-150 KB production bundle limits and rapid offline testing.

Design Doc Citation: docs/DESIGN.md:L385-L405"

echo "[*] Executing Step 2: Lexer Subsystem"
git add src/interpreter/token.ts src/interpreter/errors.ts src/interpreter/lexer.ts tests/unit/interpreter/lexer.test.ts
git commit -m "feat(interpreter): implement lexical analyzer with source location tracking and friendly diagnostics

Build the Logo lexical scanner using deterministic sticky regex tokenization,
tracking line, column, and character offset for every token. Includes friendly
pedagogical error reporting on unrecognized tokens.

Design Doc Citation: docs/DESIGN.md:L65-L80
Test Strategy Citation: docs/TEST_STRATEGY.md:L44-L51"

echo "[*] Executing Step 3: AST Parser & Pratt Precedence"
git add src/interpreter/ast.ts src/interpreter/parser.ts tests/unit/interpreter/parser.test.ts
git commit -m "feat(interpreter): implement recursive-descent AST parser with Pratt operator precedence and error recovery

Build the recursive-descent Logo parser with Pratt expression parsing
for mathematical and logical operators. Implements AST node discrimination,
control structures (REPEAT, IF, IFELSE, TO...END), and educational error
diagnostics.

Design Doc Citation: docs/DESIGN.md:L81-L138
Test Strategy Citation: docs/TEST_STRATEGY.md:L52-L65"

echo "[*] Executing Step 4 & 5: Dynamic Scoping Environment & Primitives"
git add src/interpreter/environment.ts src/interpreter/primitives.ts tests/unit/interpreter/environment.test.ts tests/unit/interpreter/primitives.test.ts
git commit -m "feat(interpreter): implement dynamic scoping environment and Logo primitives registry

Implement dynamic scoping symbol table for variable bindings and procedure
definitions, alongside core Logo primitive procedures for math, lists, and logic.

Design Doc Citation: docs/DESIGN.md:L139-L162
PRD Citation: PRD.md:L69-L125"

echo "[*] Executing Step 6 & 7: Coordinates, Turtle & Palette"
git add src/graphics/coordinates.ts src/graphics/palette.ts src/graphics/turtle.ts tests/unit/graphics/
git commit -m "feat(graphics): implement Cartesian coordinate transformations, Okabe-Ito palette, and turtle state machine

Deliver mathematical coordinate system mapping Logo center-origin Cartesian
space to Canvas 2D raster space, 8-color Okabe-Ito accessible palette, and
headless turtle state machine recording vector path segments.

Design Doc Citation: docs/DESIGN.md:L220-L245
Test Strategy Citation: docs/TEST_STRATEGY.md:L77-L87"

echo "[*] Executing Step 8: Generator Runtime & Infinite Loop Guard"
git add src/interpreter/runtime.ts tests/unit/interpreter/runtime.test.ts
git commit -m "feat(interpreter): implement cooperative generator runtime with infinite loop protection

Deliver cooperative generator-based execution runtime yielding execution
steps with source location metadata, procedure call stacks, and 100k instruction
ceiling against runaway loops.

Design Doc Citation: docs/DESIGN.md:L163-L190"

echo "[*] Executing Step 9: Canvas 2D High-DPI Renderer"
git add src/graphics/renderer.ts
git commit -m "feat(graphics): implement high-DPI canvas 2D renderer with viewport controls

Construct the Canvas 2D rendering subsystem featuring devicePixelRatio subpixel
scaling, layered rendering, and pan/zoom Cartesian viewport transformations.

Design Doc Citation: docs/DESIGN.md:L250-L259"

echo "[*] Executing Step 10: Geometric Integration Suite"
git add tests/integration/end_to_end_scripts.test.ts
git commit -m "test(integration): verify end-to-end Logo geometric programs and procedural composition

End-to-end integration tests verifying geometric invariants for closed square,
regular polygon, composite house program, and variable accumulation.

Test Strategy Citation: docs/TEST_STRATEGY.md:L100-L130"

echo "[*] Executing Step 11 & 12: Highlighter & Twin-Layer Editor"
git add src/editor/highlighter.ts src/styles/highlighter.css src/editor/editor.ts src/styles/editor.css src/styles/tokens.css src/styles/base.css tests/unit/editor/highlighter.test.ts tests/unit/editor/editor.test.ts
git commit -m "feat(editor): implement twin-layer native DOM editor with syntax highlighter and scroll sync

Deliver high-performance twin-layer editor with native undo/redo, bracket pair
matching, line gutter, and synchronized backdrop highlighting.

Design Doc Citation: docs/DESIGN.md:L270-L310"

echo "[*] Executing Step 13 & 14: Touch Ribbon & Immediate REPL"
git add src/editor/toolbar.ts src/styles/toolbar.css src/editor/repl.ts src/styles/repl.css tests/unit/editor/toolbar.test.ts tests/unit/editor/repl.test.ts
git commit -m "feat(editor): implement touch-friendly symbol ribbon and immediate command REPL console

Add accessible 48x48px touch ribbon for Chromebook/mobile and single-line
immediate execution REPL with command history traversal.

PRD Citation: PRD.md:L145-L160"

echo "[*] Executing Step 15 & 16: Visual Debugger & Inspector UI"
git add src/debugger/ src/styles/debugger.css tests/unit/debugger/
git commit -m "feat(debugger): implement non-blocking stepper state machine, controls, and inspector panel

Deliver formal debugger state machine, cooperative animation frame loop with
non-linear speed curve, live call stack inspector, and variable scope table.

Design Doc Citation: docs/DESIGN.md:L315-L350"

echo "[*] Executing Step 17 & 18: Storage & URL Hash Sharing"
git add src/storage/ src/styles/modal.css tests/unit/storage/
git commit -m "feat(storage): implement local persistence, file export/import, and URL hash sharing

Add debounced draft autosave, project library modal, .logo/.json/PNG file
export, and zero-backend URL hash compression for instant code sharing.

PRD Citation: PRD.md:L165-L185"

echo "[*] Executing Step 19 & 20: PWA Manifest & Cache-First Service Worker"
git add public/ src/pwa/ src/styles/pwa.css tests/unit/pwa/
git commit -m "feat(pwa): implement web app manifest, cache-first service worker, and auto-update banner

Deliver complete offline PWA capability with web app manifest, cache-first
service worker precaching assets, and auto-update toast.

PRD Citation: PRD.md:L190-L215"

echo "[*] Executing Step 21: Responsive Layout & Application Bootstrap"
git add src/ui/ src/styles/layout.css src/main.ts tests/integration/responsive_layout.test.ts scripts/
git commit -m "feat(ui): implement responsive split-pane layout and application bootstrap

Wire application bootstrap, responsive side-by-side and stacked layout,
viewport observers, and comprehensive UI integrations.

Design Doc Citation: docs/DESIGN.md:L355-L380"

echo "[✓] All atomic commits successfully executed!"
