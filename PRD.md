# LearningLogo: Product Requirements Document (PRD)

## 1. Executive Summary & Vision
LearningLogo is a free, zero-cost, open-source, client-side, offline-first Progressive Web Application (PWA) designed to teach children computational thinking, geometric intuition, and procedural reasoning through classic educational turtle graphics.

Hosted entirely as a static web application on GitHub Pages, LearningLogo operates with:
- **Zero Financial Cost**: 100% free with no paywalls, premium tiers, or in-app purchases.
- **Zero Registration**: No accounts, usernames, passwords, or emails required.
- **Zero Telemetry**: No tracking scripts, advertising SDKs, third-party cookies, or analytics.
- **Zero Server Dependency**: 100% client-side computation; all code parsing, evaluation, graphics rendering, project storage, and sharing occur directly in the learner's browser.
- **Universal Hardware Reach**: Optimized for low-end touchscreen Chromebooks, smartphones (iOS and Android), family laptops, and tablets.

---

## 2. Target Personas & Use Cases

### Persona 1: Maya — Elementary School Student (Age 9)
- **Device**: Classroom-managed touchscreen Chromebook (Intel Celeron, 4 GB RAM, 1366x768 display).
- **Context**: Learning basic geometry and introduction to coding in 4th-grade math/science class.
- **Needs & Pain Points**:
  - Typing punctuation marks (brackets `[ ]`, quotes `"`, colons `:`) on physical or on-screen keyboards is frustrating and slow.
  - Frustrated by cryptic error messages; needs gentle, plain-language visual diagnostics.
  - Needs immediate visual feedback: wants to see the turtle move the moment she enters a command.
  - Uses touch input and trackpad interchangeably.

### Persona 2: Leo — Middle School Student (Age 12)
- **Device**: Android smartphone (portrait mode on the bus) and a shared family Windows laptop (landscape mode at home).
- **Context**: Exploring math patterns, generative art, and self-directed coding challenges.
- **Needs & Pain Points**:
  - Wants to write complex procedures (`TO TREE :BRANCH ... END`) with recursion and loops.
  - Needs to debug mistakes step-by-step to understand why his polygon or spiral is misaligned.
  - Wants to export his turtle drawings as high-resolution PNG images and share his code via a quick link with friends without requiring an account.

### Persona 3: Ms. Davis — K-8 STEM Educator
- **Device**: District-managed laptop connected to a classroom projector; oversees a lab of 25 Chromebooks.
- **Context**: Teaching 45-minute computer science modules. School Wi-Fi frequently drops or blocks external cloud services.
- **Needs & Pain Points**:
  - Cannot spend 15 minutes helping students sign up or recover lost passwords.
  - Needs the app to load instantly from cache even when school internet drops completely.
  - Needs to project code with high-contrast, accessible visual indicators that are readable from the back of the room.
  - Needs students to save projects locally or export them as plain text/JSON to submit to Google Classroom.

### Persona 4: Sam — Independent Learner & Parent at Home
- **Device**: iPad / Tablet or desktop browser with offline usage.
- **Context**: Parent guiding a child through programming concepts at home.
- **Needs & Pain Points**:
  - Demands complete safety and privacy for their child; zero risk of external chat or data collection.
  - Values adherence to classic educational turtle graphics environments and proven constructionist curriculum standards.

---

## 3. Core Pedagogical Principles

1. **Constructionism & Mindstorms**:
   Rooted in Seymour Papert's educational philosophy: children learn best when building public, tangible artifacts. The turtle provides a computational object-to-think-with.
2. **Body-Syntonic Geometry**:
   Commands (`FORWARD 100`, `RIGHT 90`) are formulated from the turtle's personal frame of reference. A child projects themselves into the turtle's position to solve spatial problems.
3. **Low Floor, High Ceiling, Wide Walls**:
   - *Low Floor*: Typing `FD 100` produces immediate visual action on the first visit in under 3 seconds.
   - *High Ceiling*: Procedural abstraction (`TO`), first-class lists, recursion, parameter passing, and dynamic control structures support advanced computer science education.
   - *Wide Walls*: Enables generative art, geometric proofs, game mechanics, linguistic list manipulation, and mathematics.
4. **Constructive Error Culture**:
   Errors are not failures; they are educational feedback. Messages such as *"Turtle doesn't know how to 'FDD'. Did you mean 'FD 50'?"* or *"You opened a bracket '[' on line 3, but forgot to close it with ']'."* empower learners to self-correct.

---

## 4. Functional Requirements

### FR-1: Complete Educational Logo Language Core

#### 1.1 Turtle Motion & Spatial State
- `FORWARD` (`FD`) `<distance>`: Move forward by `<distance>` steps along current heading.
- `BACK` (`BK`) `<distance>`: Move backward by `<distance>` steps along current heading.
- `LEFT` (`LT`) `<angle>`: Rotate counter-clockwise by `<angle>` degrees.
- `RIGHT` (`RT`) `<angle>`: Rotate clockwise by `<angle>` degrees.
- `HOME`: Move turtle to coordinate (0, 0) and reset heading to 0° (facing North).
- `CLEARSCREEN` (`CS`): Clear canvas drawing surface, reset turtle position to (0, 0), and heading to 0°.
- `CLEAN`: Clear canvas drawing surface without moving turtle.
- `SETXY` `<x>` `<y>`: Move turtle directly to coordinate (x, y).
- `SETX` `<x>`: Set horizontal coordinate to `<x>` maintaining current Y.
- `SETY` `<y>`: Set vertical coordinate to `<y>` maintaining current X.
- `XCOR`: Return current X coordinate.
- `YCOR`: Return current Y coordinate.
- `HEADING`: Return current heading in degrees [0, 360).
- `SETHEADING` (`SETH`) `<angle>`: Set absolute heading in degrees (0 = North, 90 = East, 180 = South, 270 = West).
- `TOWARDS` `<x>` `<y>`: Return heading angle needed to face coordinate (x, y).

#### 1.2 Pen & Appearance Controls
- `PENUP` (`PU`): Lift pen; turtle moves without drawing.
- `PENDOWN` (`PD`): Lower pen; turtle draws as it moves.
- `PENCOLOR` (`SETPC`) `<color>`: Set pen color using color palette index (0–15), colorblind-safe color name, or hex/RGB string.
- `PENSIZE` `<size>`: Set stroke width in pixels (clamped 1 to 50).
- `HIDETURTLE` (`HT`): Hide turtle cursor icon.
- `SHOWTURTLE` (`ST`): Show turtle cursor icon.
- `ARC` `<angle>` `<radius>`: Draw an arc with specified angle and radius.
- `CIRCLE` `<radius>`: Draw a circle centered at turtle position or tangent to heading.

#### 1.3 Control Flow & Procedures
- `REPEAT` `<count>` `[ <instructions> ]`: Execute instructions in list `<count>` times. Inside the repeat block, the pseudo-variable `REPCOUNT` returns current 1-indexed iteration.
- `IF` `<condition>` `[ <then-instructions> ]`: Execute instructions if condition evaluates to true.
- `IFELSE` `<condition>` `[ <then-instructions> ]` `[ <else-instructions> ]`: Conditional branch.
- `TO` `<procname>` `[ :param1 :param2 ... ]` `...` `END`: Define a named procedure with optional parameters.
- `STOP`: Terminate execution of the current procedure early.
- `OUTPUT` (`OP`) `<value>`: Return a value from a procedure to the caller.

#### 1.4 Variables & Environments
- `MAKE` `"name` `<value>`: Bind `<value>` to variable `name` in current scope.
- `:name`: Dereference variable `name`.
- `THING` `"name`: Functional lookup of variable `name`.
- `LOCAL` `"name`: Declare variable `name` strictly within local procedure scope.

#### 1.5 Mathematics & Logic
- Infix operators: `+` (addition), `-` (subtraction), `*` (multiplication), `/` (division), `%` (modulo).
- Prefix operators: `SUM`, `DIFFERENCE`, `PRODUCT`, `QUOTIENT`, `REMAINDER`.
- Relational comparisons: `=`, `<`, `>`, `<=`, `>=`, `<>` (not equal).
- Boolean logic: `AND` `<expr1>` `<expr2>`, `OR` `<expr1>` `<expr2>`, `NOT` `<expr>`.
- Math functions: `RANDOM` `<max>`, `SQRT` `<val>`, `ROUND` `<val>`, `ABS` `<val>`, `SIN` `<deg>`, `COS` `<deg>`.

#### 1.6 Words & Lists
- Words: Prefixed with quote `"hello`.
- Lists: Delimited by square brackets `[apple banana cherry]`.
- Operations: `FIRST` `<list|word>`, `BUTFIRST` (`BF`), `LAST`, `BUTLAST` (`BL`), `ITEM` `<index>` `<list>`, `COUNT` `<list|word>`, `FPUT` `<elem>` `<list>`, `LPUT` `<elem>` `<list>`, `SENTENCE` (`SE`) `<item1>` `<item2>`.
- Console Output: `PRINT` (`PR`) `<value>`, `SHOW` `<value>`.

---

### FR-2: Graphics & Canvas Subsystem

- **Coordinate System**: Pure Cartesian plane where origin (0, 0) is centered on the canvas. Positive X extends East (right); positive Y extends North (up). Heading 0° points North, with clockwise rotation.
- **Rendering Technology**: HTML5 2D Canvas with subpixel rendering scaled to `window.devicePixelRatio` for razor-sharp vector lines on high-DPI / Retina screens.
- **Colorblind-Safe Palettes**: Default palette built upon the Okabe-Ito 8-color model (optimized for deuteranopia, protanopia, and tritanopia):
  - Black (`#000000`)
  - Blue (`#0072B2`)
  - Vermilion/Orange (`#D55E00`)
  - Sky Blue (`#56B4E9`)
  - Bluish Green (`#009E73`)
  - Yellow (`#F0E442`)
  - Reddish Purple (`#CC79A7`)
  - Amber/Orange (`#E69F00`)
- **Turtle Cursor**: Directional turtle sprite / vector chevron that indicates exact coordinate location, heading angle, and pen up/down state.
- **View Navigation**: Pan, zoom in/out, and "Reset View" controls to accommodate large drawings.
- **Export**: One-click export of the active canvas to high-resolution PNG image with transparent or white background.

---

### FR-3: Interactive Editor & Command Console

- **Dual-Mode Coding**:
  - *Main Editor*: Multi-line editor for writing complete procedures, programs, and functions. Features line numbers, syntax highlighting, bracket pairing, and auto-indentation.
  - *REPL / Command Line*: Single-line console at bottom for immediate command execution (`FD 50`, `RT 90`) with up/down arrow command history navigation.
- **Touch & Mobile Quick-Symbol Ribbon**:
  - Dedicated virtual toolbar above the mobile/touch keyboard providing instant tap access to brackets `[` and `]`, quotes `"`, colon `:`, and common keywords (`FD `, `BK `, `LT `, `RT `, `REPEAT `).
  - Tap targets adhere to minimum 48x48px size standard.
- **Educational Diagnostics**:
  - Real-time syntax validation. Malformed brackets, unclosed procedures (`TO` without `END`), and invalid tokens are highlighted in-place with friendly contextual tooltips.

---

### FR-4: Debugger & Visual Execution Tracer

- **Execution State Machine**: Supports `IDLE`, `RUNNING`, `PAUSED`, and `STEPPING` states.
- **Non-Blocking Architecture**: The interpreter yields control cooperatively (via generator iteration or requestAnimationFrame time-slicing), ensuring the browser UI never locks up during execution.
- **Infinite Loop Safeguards**:
  - Real-time instruction counter.
  - If a loop exceeds threshold (e.g., 50,000 operations without visual yield), execution safely pauses with an alert: *"The turtle has been running for a long time. Pause or Stop?"*.
- **Step Execution Controls**:
  - *Run*: Continuous execution at selected speed.
  - *Pause*: Freeze execution immediately.
  - *Step Into*: Execute the single next AST command and halt.
  - *Step Over*: Execute procedure to completion before halting.
  - *Stop*: Instantly abort execution and restore `IDLE` state.
- **Visual Tracing**:
  - Synchronized highlighting: As the turtle moves forward on the canvas, the corresponding line and token in the code editor glow.
  - Speed Slider: Controls execution delay from 0 ms (instant turbo draw) to 1000 ms (slow, step-by-step pedagogical animation).
- **Scope & Stack Inspector**:
  - Expandable panel showing active procedure call stack and current variable values.

---

### FR-5: Project Management, Sharing & Offline PWA

- **Zero-Login Local Persistence**:
  - Automatic draft autosave to browser `localStorage` / `IndexedDB` every 3 seconds.
  - Built-in Project Library modal for saving, loading, renaming, and deleting multiple named projects.
- **File Import / Export**:
  - Export as `.logo` (plain text source code) or `.json` (complete project bundle including code and canvas metadata).
  - Drag-and-drop or file picker import of `.logo` and `.json` files.
- **Accountless URL Sharing**:
  - Encode and compress project code into URL hash fragments (`#code=...`) using LZ-string compression.
  - Enables teachers to share starter assignments via simple links with zero backend server.
- **Progressive Web Application (PWA)**:
  - Service Worker precaches all static assets (HTML, CSS, JS, icons).
  - Fully functional offline after initial load.
  - Installable to home screen or desktop on ChromeOS, Android, iOS Safari, Windows, and macOS.
  - Update Notification: Non-intrusive banner appears when a new version is deployed to GitHub Pages: *"New version available. [Reload to Update]"*.

### FR-6: Editor-Grade Local Disk File I/O Subsystem
- **Direct Disk Persistence**: Bidirectional file synchronization using the HTML5 File System Access API with automatic fallback to download blobs.
- **In-Place File Save**: `Ctrl+S` / `Cmd+S` saves directly to active file handle without re-prompting dialogs.
- **Save As & Open Dialogs**: `Ctrl+Shift+S` opens file picker to save a copy; `Ctrl+O` loads disk `.logo` files.
- **New Project Reset**: `Ctrl+N` resets editor to starter template, clears active file handle, and resets file name to `Untitled.logo`.
- **Drag-and-Drop Loading**: Dragging `.logo` or `.json` files onto window or editor loads code and binds active file handle.
- **Data Loss Prevention**: Unsaved changes confirmation dialog (`confirmDiscardUnsaved`) before Open, New, or loading, paired with browser `beforeunload` warning.
- **Dual Visual State Encoding**: Document title bar sync (`*Untitled.logo - LearningLogo`) and colorblind-safe badges (`[Saved]` / `[Unsaved]`).

### FR-7: High-Performance Go Desktop Binary & Loopback Server
- **Single-Binary Portability**: Hermetic desktop binary written in Go with embedded production web assets via `//go:embed all:dist`.
- **Loopback Security Architecture**: Bound strictly to `127.0.0.1` on dynamic ports (`:0`) or configured `--port`, enforcing origin verification and path traversal prevention.
- **Automatic Browser Launch**: Launches default browser on startup (`rundll32` on Windows, `open` on macOS, `xdg-open` on Linux), with `--no-browser` headless override.
- **Command-Line File Opening**: Positional argument `learning-logo [file.logo]` automatically opens and binds specified file.

### FR-8: Multi-Platform Installers & Automated VirusTotal Pipeline
- **Native Packaging Matrix**:
  - Windows: Modern UI 2 NSIS installer with desktop/start menu shortcuts and uninstaller registry entries, plus standalone zip.
  - macOS: `LearningLogo.app` bundle configured via `Info.plist` and zip archive.
  - Linux: FreeDesktop application launcher (`.desktop`), icon integration, and standalone tarballs.
- **Automated VirusTotal Evaluation**: Pipeline automatically submits every binary and installer to VirusTotal via `crazy-max/ghaction-virustotal@v5` and formats permanent SHA-256 detection links in release notes.

---

## 5. Non-Functional Requirements (NFRs)

### NFR-1: Performance & Resource Footprint
- **Initial Load Time**: First Contentful Paint (FCP) under 1.0s on 3G network conditions; Time to Interactive (TTI) under 1.5s.
- **Bundle Size**: Total production JavaScript and CSS bundle under 150 KB gzipped.
- **Memory Ceiling**: Operational heap memory under 50 MB to prevent tab crashes on 2 GB RAM Chromebooks.
- **Animation Frame Rate**: Smooth 60 fps canvas rendering during turtle movements.

### NFR-2: Accessibility & Inclusivity
- **Red-Green Colorblindness Compliance**: All UI badges, status tags, and diffs use dual encoding (text prefix + distinct shape) and colorblind-safe palettes (Blue `#0072B2` vs Orange `#D55E00`).
- **WCAG 2.1 AA Standards**: Minimum 4.5:1 contrast ratio for all text elements.
- **Keyboard & Screen Reader Navigability**: Full keyboard navigation across editor, buttons, and debugger controls with descriptive ARIA attributes.
- **Touch Ergonomics**: All interactive touch targets meet or exceed 48x48px with appropriate tap padding.

### NFR-3: Privacy, Security & Compliance
- **COPPA & FERPA Compliant by Design**: Zero personally identifiable information (PII) is created, stored, or transmitted.
- **No Third-Party Scripts**: Zero analytics, trackers, external fonts, or external CDNs at runtime.
- **Content Security Policy (CSP)**: Strict CSP disallowing `eval()` and unauthorized remote scripts.

### NFR-4: Device & Platform Support
- **ChromeOS**: Chrome 90+ (touchscreen and non-touch Chromebooks).
- **Mobile Phones**: iOS Safari 15+, Android Chrome 90+ (both portrait and landscape layouts).
- **Desktop & Laptops**: Chrome, Firefox, Safari, Edge across Windows, macOS, and Linux.

---

## 6. Pedagogical Curriculum & Progression

1. **Milestone 1: Spatial Commands**:
   - `FD`, `BK`, `LT`, `RT`, `CS`, `PU`, `PD`.
   - Projects: Squares, equilateral triangles, staircases, houses.
2. **Milestone 2: Loops & Algorithmic Geometry**:
   - `REPEAT`, `REPCOUNT`.
   - Projects: Regular polygons, starbursts, circles, spirangles.
3. **Milestone 3: Procedures & Modularity**:
   - `TO <name> ... END`.
   - Projects: Cityscapes (reusable `TO HOUSE` and `TO WINDOW`), flowers.
4. **Milestone 4: Variables & Parametric Design**:
   - `MAKE`, `:var`, `TO POLYGON :SIDES :LENGTH`.
   - Projects: Scalable shapes, dynamic grids, interactive drawings.
5. **Milestone 5: Logic, Math & Recursion**:
   - `IF`, `IFELSE`, `STOP`, mathematical expressions, recursive branching.
   - Projects: Binary trees, Koch snowflakes, Sierpiński triangles.
