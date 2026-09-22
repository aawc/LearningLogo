# LearningLogo: AI Agent & Developer Steering Guide

## Mission & Purpose
LearningLogo is a free, open-source, client-only, offline-first Progressive Web Application (PWA) designed to teach children (ages 6–14) computational thinking and geometry through classic educational turtle graphics. It runs natively across low-cost touchscreen Chromebooks, smartphones, tablets, and laptops, requiring zero account creation, zero server dependencies, and zero tracking.

All development in this repository must prioritize pedagogical clarity, robust offline reliability, accessibility, and zero-friction entry for learners and educators.

---

## Core Principles & Pedagogical Ethos

1. **Seymour Papert's Constructionism**:
   Learners construct knowledge through active creation, spatial exploration, and tinkering ("low floor, high ceiling, wide walls").
2. **Body-Syntonic Geometry**:
   Spatial movements (`FORWARD`, `BACK`, `LEFT`, `RIGHT`) relate directly to a child's intuitive sense of navigation and bodily orientation.
3. **Compassionate, Constructive Diagnostics**:
   Errors are not reprimands; they are friendly clues that explain what the turtle was expecting and how to adjust the instructions.
4. **Universal Accessibility & Red-Green Colorblind Friendliness**:
   Every visual cue, diagnostic badge, diagram, and turtle color palette must be completely accessible to learners with color vision deficiencies, specifically red-green color blindness.
5. **Privacy & Classroom Safety**:
   Zero user data collection, zero network tracking, zero external CDN dependencies at runtime. Fully compliant with student privacy expectations (COPPA/FERPA by architecture: code never leaves the device).

---

## Technology Stack & Architectural Decisions

- **Language & Runtime**: TypeScript 5.x targeting modern ES2022+ standards with strict type checking enabled.
- **Build & Development Tool**: Vite for sub-second Hot Module Replacement (HMR) and optimized, zero-friction static production bundling.
- **UI Architecture**: Pure, lightweight modular TypeScript with native Web Components / lightweight reactive UI. Zero heavy framework runtime bloat (React/Angular) to guarantee instantaneous load times (< 1.0s FCP) on low-end Chromebooks and 3G mobile connections. Total production bundle target: < 150 KB gzipped.
- **Graphics & Turtle Subsystem**: HTML5 2D Canvas with sub-pixel high-DPI scaling (`window.devicePixelRatio`), Cartesian coordinate space with center origin (0, 0), Y-axis pointing North, and 0° heading facing North.
- **Interpreter Subsystem**: Recursive-descent AST parser and non-blocking cooperative execution engine with time-slicing and instruction budget limits to eliminate browser freezing from infinite loops.
- **PWA & Offline Architecture**: Native Service Worker with Cache-First asset strategy, versioned caches, immediate update toast notification, and Web App Manifest configured for GitHub Pages static hosting with base path compatibility.
- **Test Framework**: Vitest for fast, native TypeScript unit and integration testing.

---

## Repository Structure

```
LearningLogo/
├── LICENSE                 # MIT License
├── PROMPT.md               # Developer & AI agent steering guide (this file)
├── PRD.md                  # Product Requirements Document
├── docs/
│   ├── DESIGN.md           # In-depth technical architecture and subsystem contracts
│   └── TEST_STRATEGY.md    # Testing philosophy, TDD rules, and verification plan
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── favicon.ico         # App icon
│   └── icons/              # Responsive PWA application icons
├── src/
│   ├── index.html          # Application entry point
│   ├── main.ts             # Application bootstrapping and wiring
│   ├── styles/             # Modular CSS with colorblind-friendly tokens
│   ├── interpreter/        # Core Logo language engine
│   │   ├── token.ts        # Lexer token definitions and types
│   │   ├── lexer.ts        # Lexical analyzer
│   │   ├── ast.ts          # Abstract Syntax Tree node definitions
│   │   ├── parser.ts       # Recursive-descent parser
│   │   ├── environment.ts  # Scope and variable bindings
│   │   ├── primitives.ts   # Logo primitive procedure registry
│   │   ├── runtime.ts      # Cooperative step-execution runtime
│   │   └── errors.ts       # Friendly educational error formatting
│   ├── graphics/           # Canvas & Turtle rendering subsystem
│   │   ├── coordinates.ts  # Cartesian (0,0) to Canvas coordinate transforms
│   │   ├── turtle.ts       # Turtle state machine (position, heading, pen)
│   │   ├── palette.ts      # Okabe-Ito colorblind-safe color registry
│   │   └── renderer.ts     # Canvas 2D path and turtle sprite renderer
│   ├── editor/             # Interactive code editor & REPL
│   │   ├── editor.ts       # Syntax-highlighted code editor component
│   │   ├── highlighter.ts  # Token-based syntax highlighter
│   │   ├── toolbar.ts      # Touch-friendly quick-symbol ribbon for mobile/Chromebook
│   │   └── repl.ts         # Single-line immediate command console with history
│   ├── debugger/           # Step execution & visual tracer
│   │   ├── state.ts        # Debugger state machine (RUNNING, PAUSED, STEPPING)
│   │   ├── tracer.ts       # Editor line and AST node execution highlighting
│   │   └── inspector.ts    # Call stack and variable scope inspector
│   ├── storage/            # Project persistence & sharing
│   │   ├── project.ts      # Project schema, serialization, and deserialization
│   │   ├── local_store.ts  # Browser localStorage / IndexedDB adapter
│   │   └── url_share.ts    # Lossless URL-fragment code compression & sharing
│   └── pwa/                # Progressive Web App offline subsystem
│       ├── register_sw.ts  # Service worker registration and update listener
│       └── sw.ts           # Service worker implementation (Cache-First)
└── tests/                  # Test suites matching src/ structure
    ├── unit/               # Unit tests (Lexer, Parser, Runtime, Math, Turtle)
    └── integration/        # Integration tests (Editor, Debugger, Storage, PWA)
```

---

## Strict Engineering & Behavioral Standards

### 1. In-Repository File Placement Policy
All files created for this project—including source code, tests, documentation, specifications, plans, designs, artifacts, scratch scripts, logs, and temporary test fixtures—**MUST** be placed inside this repository (`/usr/local/google/home/vakh/git/hub/aawc/LearningLogo`).
Never write or save project files to `/tmp`, `~/.gemini/jetski/brain/`, or `$HOME`.

### 2. Red-Green Color Blindness Accessibility & Diff Presentation
The maintainer is red-green color blind. All output—including UI designs, color palettes, documentation, test outputs, and diff presentations—**MUST** be red-green color blindness friendly. Never rely solely on red versus green differentiation.

- **Diff Line Prefixes**:
  - Every removed line MUST be explicitly prefixed with `[-]` or `[REMOVED]`.
  - Every added line MUST be explicitly prefixed with `[+]` or `[ADDED]`.
  - Unmodified context lines: Prefix with `[ ]` or standard two-space indentation.
- **Inline & Word-Level Diffs**:
  - Use explicit text markup: `~~[REMOVED: old_text]~~` and `**[ADDED: new_text]**`, or `[-old-]` / `{+new+}`.
- **Status Indicators**:
  - Use explicit text labels with distinct geometric symbols:
    `[PASS]`, `[FAIL]`, `[OK]`, `[ADDED]`, `[REMOVED]`, `[MODIFIED]`, `[WARN]`, `[PENDING]`.
  - Never use bare colored circles (such as green/red dots).
- **Color Palettes & Diagrams**:
  - Primary color contrast pair: Blue (`#0072B2`) vs Orange (`#D55E00`).
  - Secondary colors: Yellow (`#F0E442`), Magenta (`#CC79A7`), Cyan/Sky Blue (`#56B4E9`).
  - Double encoding: Always pair color with secondary visual cues (line patterns, hatch marks, geometric markers, or text labels).

### 3. No GitHub Alert Syntax
Do not use GitHub-style alert boxes (`> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!TIP]`, `> [!CAUTION]`) as they break when synced to or from external documentation tools. Use standard Markdown formatting such as `**Note:**` or `**Important:**`.

### 4. Proprietary Environment Reference Ban
Do not mention proprietary commercial environments by name. Refer strictly to "classic educational turtle graphics environments", "Papert's original Logo", or "standard educational Logo environments".

### 5. Design Document Code Scope Policy
Design documents must focus on architecture, interface contracts, state machines, sequence flows, and system rationale.
- Do not include large code blocks, implementation scaffolding, or boilerplate code.
- Limit code snippets strictly to minimal illustrative signatures, type interfaces, or pseudocode necessary to substantiate technical contracts.

### 6. Test-Driven Development (TDD) & Zero-Mock Discipline
- Write unit tests before implementing production code (Red-Green-Refactor).
- Verify the Red state (test fails before implementation) and Green state (test passes with implementation).
- Zero-mock policy for domain logic: Lexer, parser, AST evaluator, turtle math, and coordinate conversions must be tested with real functions and real mathematical assertions, not artificial mocks.
- Every function and block must contain complete working logic. No placeholder `pass`, `TODO`, `...`, or `NotImplementedError`.

### 7. Diagnostic Intent Explanation
During troubleshooting, code discovery, or diagnostics, explain the hypothesis being tested and the technical rationale *before* executing the command or tool call.

### 8. Source Control & Atomic Commit Standards
- **Atomic Commits**: Group changes into small, single-purpose, independent commits with Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- **Structured Commit Descriptions**: Articulate technical rationale, design decisions, background context, and applicable design document citations in the commit message body.
- **Bug Fix Root Cause Explanation**: When fixing a bug, explain the verified technical root cause—identifying the defect mechanism rather than merely symptoms—both in dialogue and in the commit body.
- **Tag Hygiene**: Omit internal tracking tags (such as `TAG=agy`, `CONV=<id>`) from commit messages.
- **Pre-Commit Verification**: Run type checking and test suite verification before committing.

### 9. Self-Documentation Synchronization
Keep `PROMPT.md`, `PRD.md`, `docs/DESIGN.md`, and `docs/TEST_STRATEGY.md` synchronized whenever repository structure, architectural decisions, rules, or core interfaces are modified.

### 10. Linux & Cloudtop Development Gotchas (File Watcher ENOSPC & Networking)
- **Inotify Watcher Exhaustion**: On Linux / cloudtop workstations running concurrent IDEs, language servers, and tooling, the OS `fs.inotify.max_user_watches` table can easily be exhausted, causing tools like Vite to fail during startup with `Error: ENOSPC: System limit for number of file watchers reached`.
- **Project Watcher Configuration**: Never rely solely on default OS inotify watcher registration in development tooling. In `vite.config.ts`, `server.watch` must specify:
  - `usePolling: true` (bypasses kernel inotify table allocation without root privileges)
  - `interval: 200` (balances fast HMR updates with minimal CPU load)
  - `ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**']` (eliminates polling churn over massive non-source trees)
- **Host Sysctl Alternative**: For developers with root access wishing to raise the OS inotify limit globally:
  `sudo sysctl -w fs.inotify.max_user_watches=524288`
- **Cloudtop Remote Binding & Web Proxy Access**: The Vite server must bind to `host: '0.0.0.0'` on `port: 5173` to allow frictionless local port forwarding and browser connectivity across remote workstations and containers. Additionally, Vite enforces host header validation to guard against DNS rebinding; requests arriving through Cloudtop web proxy URLs (`*.proxy.googlers.com`, `*.c.googlers.com`) are rejected with `Blocked request. This host ("...proxy.googlers.com") is not allowed. To allow this host, add "..." to server.allowedHosts in vite.config.js` unless `server.allowedHosts` is configured. In `vite.config.ts`, `server.allowedHosts: true` (or an explicit list `['.proxy.googlers.com', '.c.googlers.com', 'localhost', '127.0.0.1']`) must be configured to permit Cloudtop web proxy access.

