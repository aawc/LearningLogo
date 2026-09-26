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
- **Graphics & Turtle Subsystem**: HTML5 2D Canvas with sub-pixel high-DPI scaling (`window.devicePixelRatio`), Cartesian coordinate space with center origin (0, 0), Y-axis pointing North, and 0° heading facing North. Fully supports all 56 Terrapin Logo drawing commands covering pure decoupled state management, origin translation, polar coordinate navigation, pen erase/reverse compositing, shapes, high-performance in-memory scanline flood fill, and typography.
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
│   ├── TEST_STRATEGY.md    # Testing philosophy, TDD rules, and verification plan
│   └── plans/              # Architecture and implementation plans
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── favicon.ico         # App icon
│   ├── 404.html            # Trailing-slash URL normalizer for Pages subdirectories
│   ├── sw.js               # Service Worker implementation (Cache-First & version-isolated)
│   └── icons/              # Responsive PWA application icons
├── scripts/
│   ├── determine_release_version.mjs  # Conventional Commits semver calculation
│   ├── generate_versions_manifest.mjs # Manifest generation & retention pruning
│   └── pre_commit.sh                  # Local pre-commit verification gate
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
│   ├── ui/                 # UI components and layout managers
│   │   ├── layout.ts       # Split pane and header layout management
│   │   ├── version_switcher.ts       # In-app multi-version release switcher
│   │   └── version_switcher_types.ts # Manifest schema validator & URL resolver
│   └── pwa/                # Progressive Web App offline subsystem
│       ├── register_sw.ts  # Service worker registration and update listener
│       └── update_banner.ts # PWA update notification toast
├── .github/workflows/
│   ├── security.yml        # Security and quality verification workflow
│   └── deploy.yml          # Automated release and multi-version Pages deploy
└── tests/                  # Test suites matching src/ and scripts/ structure
    ├── unit/               # Unit tests (Lexer, Parser, Runtime, Scripts, UI, PWA)
    └── integration/        # Integration tests (Editor, Debugger, Storage, Lifecycle)
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
- **Strict Atomic Commit Mandate**: All commits in this repository **MUST** be atomic. Commits must be small, single-purpose, and independently coherent:
  - Each commit must represent a single logical unit of change. Monolithic changesets grouping unrelated features, refactors, docs, CI workflows, or bugfixes into a single commit are strictly prohibited.
  - Every individual commit must be self-contained and leave the repository in a fully working state: build (`npm run build`), strict type check (`npm run typecheck`), and full test suite (`npm run test`) must pass cleanly at every commit in git history.
- **Conventional Commits & Structured Descriptions**: Each commit message must follow structured Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `ci:`, `chore:`) with:
  - Concise, imperative subject line under 72 characters.
  - Detailed body articulating technical rationale, architectural decisions, and background context.
  - Explicit citations to applicable design documents or implementation plans (specifying exact file paths and line ranges, e.g. `Plan Citation: docs/plans/...:L1-L50`).
- **Bug Fix Root Cause Explanation**: When fixing a bug or regression, the commit message body must explicitly explain the verified technical root cause—identifying the underlying defect mechanism and circumstances under which it manifested, rather than merely describing observable symptoms—before explaining how the fix remediates it.
- **Pre-Commit Confirmation Policy**: Never execute `git commit` without prior explicit review and approval from the user for the proposed commit sequence, staged file manifests, and structured commit messages.
- **Tag Hygiene**: Omit internal tracking tags (such as `TAG=agy`, `CONV=<id>`) from commit messages.
- **Pre-Commit Quality Gate**: Run dependency security audit (`npm run audit`), strict type checking (`npm run typecheck`), and full test suite verification (`npm run test`) before proposing or making commits.

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
- **Remote Workstation Binding & Web Proxy Access**: The Vite server must bind to `host: '0.0.0.0'` on `port: 5173` to allow frictionless local port forwarding and browser connectivity across remote workstations and containers. Additionally, Vite enforces host header validation to guard against DNS rebinding; requests arriving through remote development web proxy URLs (such as `https://<port>-<session-id>.proxy.example.com`) are rejected with `Blocked request. This host ("...") is not allowed. To allow this host, add "..." to server.allowedHosts in vite.config.js` unless `server.allowedHosts` is configured. In `vite.config.ts`, `server.allowedHosts: true` (or an explicit list `['.proxy.example.com', 'localhost', '127.0.0.1']`) must be configured to permit remote web proxy access.

### 11. Dependency Vulnerability Audits & Pre-Commit Quality Gates
- **Zero Moderate+ Vulnerability Standard**: All direct and transitive dependencies must maintain zero vulnerabilities at or above CVSS moderate severity (`npm audit --audit-level=moderate`).
- **Pre-Commit Gate (`scripts/pre_commit.sh`)**: Local pre-commit verification executes three sequential gates before allowing commits:
  1. Dependency audit (`npm run audit`)
  2. Strict type check (`npm run typecheck`)
  3. Full test suite execution (`npm run test`)
- **Automated CI Enforcement (`.github/workflows/security.yml`)**: Continuous integration runs clean dependency install (`npm ci`), security audit, strict type checking, full test suite, and production bundle validation on all pushes and pull requests to `main`.

### 12. Automated Deployment, Multi-Version Persistence & Release Governance
- **GitHub Pages Repository Source Configuration (Critical Prerequisite)**: The GitHub repository **MUST** have its Pages build source configured to **GitHub Actions** under **Settings -> Pages -> Build and deployment -> Source**. If left on "Deploy from a branch" (or uninitialized), the GitHub Pages REST API endpoint (`POST /repos/{owner}/{repo}/pages/deployments`) returns HTTP 404 (`Error: HttpError: Not Found`) during `actions/deploy-pages@v4`.
- **Dual-Deployment Role Separation**: The deployment pipeline intentionally separates dual deployment concerns:
  1. `actions/deploy-pages@v4` provides the official Pages deployment mechanism via GitHub Actions OIDC and the `github-pages` environment (`environment: { name: 'github-pages', url: ... }`).
  2. The `gh-pages` branch is synchronized purely for durable multi-version release retention across ephemeral runner instances (cloning `/releases/` from `gh-pages` before building). The repository must **not** have Pages source configured to deploy from `gh-pages`.
- **Workflow & Concurrency**: The deployment workflow (`.github/workflows/deploy.yml`) runs on push to `main` with `concurrency: group: github-pages-deploy, cancel-in-progress: false` to guarantee queueing without mid-deploy race conditions.
- **Conventional Commits Versioning (`scripts/determine_release_version.mjs`)**: Version increments are computed strictly from git history since the latest release tag (`BREAKING CHANGE:` -> major, `feat:` -> minor, other -> patch).
- **Multi-Version Tree & Retention Cap**: Historical releases are preserved in `releases/vX.Y.Z/` on the `gh-pages` branch, with the latest release served at the root `/`. An automated retention cap retains the 20 most recent releases on GitHub Pages; all releases are archived perpetually in GitHub Releases.
- **Service Worker & PWA Scope Boundary**: Only the latest release at the site root operates as an offline PWA. Historical releases in `releases/vX.Y.Z/` are opened from live URLs only without Service Worker overhead or cache pollution. The root Service Worker uses simple versioned cache naming (`const CACHE_NAME = 'learning-logo-' + APP_VERSION;`), unconditionally bypasses `/releases/` subpaths and `versions.json`, and `src/pwa/register_sw.ts` skips registration and unregisters lingering sub-scope registrations when running under `/releases/`.
- **Subdirectory URL Normalization (`public/404.html`)**: The custom 404 handler automatically appends a trailing slash to release subpaths (`/releases/vX.Y.Z` -> `/releases/vX.Y.Z/`) to avoid relative asset resolution breakage.
- **Client-Side Version Switcher (`src/ui/version_switcher.ts`)**: Built with colorblind-safe palettes (`#0072B2` vs `#D55E00`), full keyboard accessibility, draft persistence on switch, and offline resilience.
