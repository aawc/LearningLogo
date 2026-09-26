# LearningLogo

LearningLogo is a free, open-source, client-only, offline-first Progressive Web Application (PWA) designed to teach children (ages 6–14) computational thinking and geometry through classic educational turtle graphics.

It runs entirely in modern browsers across low-cost touchscreen Chromebooks, smartphones, tablets, and laptops, requiring zero account registration, zero backend server dependencies, and zero tracking.

---

## Key Features

- **Client-Side Interpreter**: Fast recursive-descent AST parser and cooperative execution engine supporting classic Logo primitives (`FORWARD`, `BACK`, `LEFT`, `RIGHT`, `REPEAT`, `TO ... END`, variables, math expressions, and conditionals) with time-sliced execution to prevent browser UI lockup.
- **Accessible Turtle Graphics**: High-DPI HTML5 2D Canvas with Cartesian coordinates `(0, 0)` centered at origin, 0° heading North, and Okabe-Ito colorblind-safe palettes.
- **Touch-Friendly Code Editor & REPL**: Multi-line editor with token-based syntax highlighting, single-line immediate REPL command console with history, and a quick-symbol ribbon for bracket/quote insertion on touchscreen devices.
- **Resizable Split-Pane Workspace**: Accessible, persistent draggable splitter between code editor and graphics canvas with pointer capture, keyboard navigation (Arrow keys, Home, End), double-click 50/50 reset, and automatic canvas synchronization.
- **Step Debugger & Tracer**: Interactive execution tracer supporting step-by-step evaluation, call stack inspection, and variable watch panels.
- **Editor-Grade Local Disk File I/O**: Direct in-place file editing, file saving, and file opening via File System Access API with drag-and-drop loading, unsaved changes confirmation dialogs, and standard keyboard shortcuts (`Ctrl+S`, `Ctrl+Shift+S`, `Ctrl+O`, `Ctrl+N`).
- **High-Performance Go Desktop Binary**: Self-contained, single-binary desktop executable embedding production web assets with loopback security, dynamic port assignment, and automatic browser launch.
- **Native Multi-Platform Installers**: Windows NSIS installer and standalone zip, macOS `.app` bundle, and Linux FreeDesktop packages with `.desktop` and icon integration.
- **Automated VirusTotal Security Verification**: Automated release pipeline scanning all binaries and installers across 70+ antivirus engines with permanent SHA-256 verification reports on every release.
- **Offline-First PWA**: Native Service Worker with Cache-First asset caching strategy and seamless update notifications.
- **Zero-Friction Sharing**: URL-fragment code compression for instant project sharing and local storage persistence without accounts or servers.
- **Multi-Version Switching & Automated Releases**: Automated GitHub Pages deployment pipeline preserving historical releases in `/releases/vX.Y.Z/` alongside root, complete with an accessible, keyboard-navigable in-app version switcher that maintains editor drafts and `#code=` hash fragments across version transitions.

---

## Desktop Application & Single-Binary Distribution

LearningLogo is available as a single-binary desktop executable written in Go (`github.com/aawc/learning-logo`) with embedded production web assets. It provides an offline desktop experience without external runtime dependencies or node/python requirements.

### Running the Desktop Binary

```bash
# Run with automatic dynamic loopback port and browser launch:
./learning-logo

# Open a specific file on startup:
./learning-logo my_drawing.logo

# Specify a custom port:
./learning-logo --port 8080

# Run in headless/server-only mode without opening a browser window:
./learning-logo --no-browser

# Check version:
./learning-logo --version
```

### Local Disk File I/O & Shortcuts

LearningLogo features a file subsystem with bidirectional disk support:

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Ctrl+S` / `Cmd+S` | **Save** | Writes in-place directly to the active disk file handle without opening dialogs. If no file has been bound yet, prompts the Save As picker. |
| `Ctrl+Shift+S` / `Cmd+Shift+S` | **Save As...** | Opens the native save file picker, writes content, updates active file name, and binds handle. |
| `Ctrl+O` / `Cmd+O` | **Open...** | Prompts to discard unsaved changes if dirty, opens native file picker, and loads code into editor. |
| `Ctrl+N` / `Cmd+N` | **New** | Prompts to discard unsaved changes if dirty, resets editor to starter template, clears active handle, and resets file name to `Untitled.logo`. |

- **Header Indicators**: The title badge displays the active file name and colorblind-safe status badges: `[Saved]` / `[Unsaved]`.
- **Title Bar Synchronization**: Synchronizes `document.title` to `${isDirty ? '*' : ''}${activeFileName} - LearningLogo`.
- **Drag-and-Drop**: Drag any `.logo` or `.json` file from your desktop into the window or editor to load it immediately with active file handle binding.
- **Unsaved Changes Guard**: Prompts confirmation before Open, New, or loading if unsaved changes exist, and issues browser `beforeunload` warnings.

### Native Packaging & Installers

Build scripts located in `scripts/` package native distributions:

- **Windows**:
  - Script: `scripts/package_windows.sh`
  - Output: `dist-release/learning-logo-windows-amd64.zip` and `dist-release/learning-logo-windows-amd64-installer.exe` (via `scripts/installer.nsi`)
  - Features: Installs to `$PROGRAMFILES\LearningLogo`, creates Start Menu and Desktop shortcuts, adds Registry uninstaller entries.
- **macOS**:
  - Script: `scripts/package_macos.sh`
  - Output: `dist-release/learning-logo-macos-amd64.zip`, `dist-release/learning-logo-macos-arm64.zip`, and `.dmg`
  - Features: Complete `LearningLogo.app` bundle configured via `assets/macos/Info.plist`.
- **Linux**:
  - Script: `scripts/package_linux.sh`
  - Output: `dist-release/learning-logo-linux-amd64.tar.gz` and `dist-release/learning-logo-linux-arm64.tar.gz`
  - Features: Standalone binary, FreeDesktop launcher `assets/linux/learning-logo.desktop`, and high-resolution icon.

---

## Automated VirusTotal Security & Release Pipeline

The repository provides an automated security evaluation and release workflow in `.github/workflows/release.yml`:

1. **Multi-Platform Cross-Compilation**: Compiles binaries for `windows/amd64`, `darwin/amd64`, `darwin/arm64`, `linux/amd64`, and `linux/arm64` using `go build -trimpath -ldflags="-s -w"`.
2. **Packaging Matrix**: Packages NSIS installers, macOS `.app` bundles, and Linux tarballs.
3. **Automated VirusTotal Evaluation**: Submits all release artifacts to VirusTotal via `crazy-max/ghaction-virustotal@v5` with API key secrets.
4. **Permanent SHA-256 Verification Links**: Computes SHA-256 checksums and includes permanent detection links in the release notes (`https://www.virustotal.com/gui/file/<sha256>/detection`).
5. **GitHub Release Publication**: Automatically publishes GitHub Releases with attached binaries, installers, and checksum tables via `softprops/action-gh-release@v2`.


---


---

## Supported Terrapin Logo Drawing Commands (56 Commands)

LearningLogo provides full specification compatibility for all 56 Terrapin Logo drawing commands organized across 8 functional groups:

| Group | Commands & Aliases | Syntax & Usage Example | Description |
| :--- | :--- | :--- | :--- |
| **1. Motion** (15) | `FORWARD` (`FD`), `BACK` (`BK`), `RIGHT` (`RT`), `LEFT` (`LT`), `HOME`, `SETXY` (`SETPOS`), `SETX`, `SETY`, `GETX` (`XCOR`), `GETY` (`YCOR`), `GETXY` (`POS`), `HEADING`, `SETHEADING` (`SETH`), `TOWARDS`, `DISTANCE` | `FD 50`, `SETXY [100 200]`, `TOWARDS 50 50`, `DISTANCE [0 100]` | Complete 2D Cartesian navigation supporting dual-parameter list (`[x y]`) and scalar (`x y`) forms, relative turns, and coordinate reporters. |
| **2. Visibility & Scale** (5) | `SHOWTURTLE` (`ST`), `HIDETURTLE` (`HT`), `SHOWN?` (`SHOWNP`), `TURTLESIZE` (`TSIZE`), `SETTURTLESIZE` (`SETTSIZE`, `SETTS`) | `HT`, `ST`, `IF SHOWN? [ ... ]`, `SETTURTLESIZE 2.0` | Controls turtle sprite visibility and visual scaling factor (0.01 to 99.0). |
| **3. Coordinate Origin** (2) | `ORIGIN`, `SETORIGIN` | `SETORIGIN [100 -50]`, `(SETORIGIN)` | Translates turtle coordinate space and sprite alignment; `(SETORIGIN)` resets origin to center `[0 0]`. |
| **4. Polar Navigation** (6) | `PDIST`, `PANGLE`, `PHEADING`, `PSETHEADING` (`PSETH`), `PPOS`, `SETP` | `SETP 100 45`, `SETP [100 45]`, `MAKE "A PANGLE` | Polar coordinate navigation where 0° is East (3 o'clock) counter-clockwise; `SETP` moves to polar radius and aims along polar angle. |
| **5. Pen Modes & Dynamics** (11) | `PENDOWN` (`PD`), `PENUP` (`PU`), `PENERASE` (`PE`), `PENREVERSE` (`PX`), `PEN`, `PENDOWN?` (`PENDOWNP`), `SETPEN`, `SETWIDTH` (`SETW`), `WIDTH`, `SETSTEPSIZE`, `STEPSIZE` | `PE`, `PX`, `SETPEN "PENERASE`, `SETPEN ["PE "#D55E00]`, `SETSTEPSIZE 2` | Advanced compositing modes (`source-over`, `destination-out` erase, `difference` reverse), pen dimensions, and step multipliers. |
| **6. Speed & Dynamics** (5) | `SPEED`, `SETSPEED`, `SLOWTURTLE`, `VELOCITY`, `SETVELOCITY` | `SETSPEED 0.5`, `SLOWTURTLE`, `SETVELOCITY 100` | Motion execution rate configuration and independent velocity simulation. |
| **7. Shapes, Dots & Fills** (6) | `DOT`, `DOT?` (`DOTP`), `DOTCOLOR`, `FILL`, `STAMPOVAL`, `STAMPRECT` | `DOT [10 10]`, `(DOT -10 -20)`, `(DOT? [10 10])`, `(FILL "#0072B2)`, `(STAMPOVAL 50 30 "TRUE)` | Geometric stamp rendering (ovals, rectangles), pixel interrogation reporters, and high-performance scanline flood fill. |
| **8. Typography** (6) | `FONT`, `FONTS`, `SETFONT`, `TURTLETEXT` (`TT`), `TURTLETEXTBASE` (`TTBASE`), `TURTLETEXTSIZE` (`TTSIZE`) | `SETFONT "Courier 16 3`, `TT [HELLO LOGO]`, `MAKE "H TTBASE` | Typography engine supporting font family, size, attributes (bold/italic), text placement, baseline alignment, and bounding box metrics. |

## Tech Stack

- **Language**: TypeScript 5.x (Strict ES2022+)
- **Build Tool**: Vite 6.x
- **Testing**: Vitest 4.x
- **Architecture**: Modular vanilla TypeScript, zero heavy framework runtime bloat (< 150 KB gzipped production bundle)

---

## Getting Started

### Prerequisites

- Node.js (v18+ or v20+ / v22+)
- Corepack (`corepack enable`) or npm

### Installation

```bash
git clone https://github.com/aawc/LearningLogo.git
cd LearningLogo
npm install
```

### Development Scripts

- **Audit Dependencies for Security Vulnerabilities**:
  ```bash
  corepack npm run audit
  ```
  Runs `npm audit --audit-level=moderate` to catch moderate or higher CVE advisories.

- **Start Dev Server**:
  ```bash
  corepack npm run dev
  ```
  Runs Vite dev server with Hot Module Replacement (HMR) at `http://localhost:5173/` (bound to `0.0.0.0`).

- **Run Unit & Integration Tests**:
  ```bash
  corepack npm run test
  ```

- **Type Check**:
  ```bash
  corepack npm run typecheck
  ```

- **Build for Production**:
  ```bash
  corepack npm run build
  ```

- **Preview Production Build**:
  ```bash
  corepack npm run preview
  ```

---

## Automated Deployment, Multi-Version Persistence & Release Scheme

The project implements an automated continuous deployment and release pipeline defined in `.github/workflows/deploy.yml`:

### Repository Prerequisite: GitHub Pages Source Configuration

**Important:** For the automated deployment pipeline to function, the repository must have its GitHub Pages deployment source configured to **GitHub Actions**:

1. In the GitHub repository, navigate to **Settings** -> **Pages** (under "Code and automation").
2. Under **Build and deployment** -> **Source**, select **GitHub Actions** from the dropdown menu (do **not** select "Deploy from a branch" or leave it unconfigured).
3. Once set to **GitHub Actions**, GitHub provisions the Pages deployment API endpoint (`POST /repos/{owner}/{repo}/pages/deployments`) and the `github-pages` deployment environment.

**Dual-Deployment Architecture Rationale:**
The deployment workflow intentionally operates a dual-target architecture:
- **`actions/deploy-pages@v4` (Pages Deployment)**: Deploys the aggregated, multi-version site artifact directly to GitHub Pages CDN using GitHub Actions OIDC authentication and the `github-pages` environment.
- **`gh-pages` Branch (Cross-Run Storage)**: Synchronizes the aggregated release tree to the `gh-pages` branch. Because GitHub Actions runners are ephemeral, the `gh-pages` branch serves as the durable storage mechanism that preserves historical releases in `/releases/vX.Y.Z/` across successive pipeline runs.

If the repository's Pages source is left set to "Deploy from a branch" (targeting `gh-pages`), the workflow's final step (`actions/deploy-pages@v4`) will fail with `Error: HttpError: Not Found` (HTTP 404) because GitHub disables the Actions Pages deployment API for repositories configured for branch-based deployment.

### Pipeline Workflow Architecture
1. **Trigger & Concurrency Lock**: Runs on every push to `main` with concurrency serialization (`group: github-pages-deploy`, `cancel-in-progress: false`) to eliminate race conditions and non-fast-forward push rejections.
2. **Quality Gates**: Pre-deployment quality checks enforce four sequential gates:
   - `[PASS]` Dependency security audit (`npm run audit`)
   - `[PASS]` Strict TypeScript type checking (`npm run typecheck`)
   - `[PASS]` Full Vitest unit & integration test suite (`npm run test`)
   - `[PASS]` Production build validation (`npm run build`)
3. **Automated Semver Determination (`scripts/determine_release_version.mjs`)**:
   - Inspects Git commit history since the latest release tag using Conventional Commits:
     - `BREAKING CHANGE:` or `!:` triggers a **major** bump (`vX.0.0`)
     - `feat:` or `feat(...):` triggers a **minor** bump (`vX.Y.0`)
     - `fix:`, `docs:`, `refactor:`, `chore:` triggers a **patch** bump (`vX.Y.Z`)
   - Defaults to `v1.0.0` when no previous tags exist.
   - Automatically avoids tag collisions by incrementing patch numbers until unique.
4. **GitHub Release Publication**:
   - Packages production artifacts into `learning-logo-$TAG.zip`.
   - Creates a GitHub Release with auto-generated release notes via `gh release create`.
5. **Multi-Version GitHub Pages Staging**:
   - Clones the persistent `gh-pages` branch.
   - Copies the current build into `releases/$TAG/` (preserving historical versions).
   - Copies the current build to the site root `/` (serving the latest release at the canonical entry URL).
   - Enforces a retention cap: retains the 20 most recent releases on Pages; historical releases remain archived in GitHub Releases.
   - Generates and validates `versions.json` via `scripts/generate_versions_manifest.mjs`, copying it to site root and every release subdirectory.
   - Adds `.nojekyll` to prevent Jekyll from skipping underscore-prefixed assets.
   - Deploys the aggregated site tree using official GitHub Pages actions (`upload-pages-artifact@v3` and `deploy-pages@v4`).

### Runtime Service Worker & Subdirectory URL Normalization
- **PWA Scope & Cache Isolation**: Only the latest release at the site root operates as an offline PWA. Historical releases in `/releases/vX.Y.Z/` are designed for live online exploration without Service Worker overhead or cache pollution.
  - The Service Worker cache name is versioned (`const CACHE_NAME = 'learning-logo-' + APP_VERSION;`).
  - When operating at the site root, the Service Worker unconditionally bypasses requests for `/releases/` subpaths and `versions.json`.
  - Service Worker registration is guarded in `src/pwa/register_sw.ts` so that pages loaded under `/releases/` do not register a Service Worker and unregister any lingering registrations at that sub-scope.
- **Trailing Slash Normalization (`public/404.html`)**: Relative assets are built with `base: './'`. When a user requests a versioned subpath without a trailing slash (e.g. `/releases/v1.0.0`), `404.html` detects the missing slash and immediately executes `window.location.replace()` to append `/` before assets fail to load.
- **Client-Side Version Switcher (`src/ui/version_switcher.ts`)**: An accessible dropdown in the application header displays the active version, shows colorblind-safe badges (`[Current]`, `[Latest]`, `[Offline]`), supports full keyboard navigation (Escape, Enter, Arrow keys), and preserves active code drafts and `#code=` hash fragments across version switches.

---

## Pre-Commit Security & Quality Gate

A local pre-commit verification gate is provided in `scripts/pre_commit.sh` that validates changes before committing:
1. **Gate 1**: Dependency security audit (`npm run audit`)
2. **Gate 2**: Strict TypeScript typechecking (`npm run typecheck`)
3. **Gate 3**: Full Vitest test suite (`npm run test`)

To install or update the pre-commit hook in your local Git repository:
```bash
cp scripts/pre_commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```
Or create a symlink:
```bash
ln -sf ../../scripts/pre_commit.sh .git/hooks/pre-commit
```

---

## Troubleshooting & Local Development

### Linux & Cloudtop File Watcher Exhaustion (`ENOSPC`)

#### Issue Description
When running `npm run dev` on Linux or cloudtop environments, Vite may throw the following error upon startup:
```text
Error: ENOSPC: System limit for number of file watchers reached, watch '/path/to/vite.config.ts'
```

#### Defect Mechanism & Root Cause
On Linux systems, file system watchers (such as Chokidar in Vite) rely on the kernel's `inotify` subsystem. The kernel limits the total number of directory and file inotify instances a user can allocate via the `fs.inotify.max_user_watches` sysctl parameter. When multiple development tools run concurrently (e.g., IDE language servers, TypeScript daemons, linters, multiple repositories, or cloudtop workstations), this limit can become completely exhausted. When Vite attempts to register inotify watches on project files, the OS returns `ENOSPC` (Error: No Space left on device).

#### Repository-Level Solution (Zero Sudo Required)
In `vite.config.ts`, the development server is configured with interval-based polling and explicit directory ignore patterns:

```typescript
// vite.config.ts
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 200,
      ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**'],
    },
  },
});
```

- `usePolling: true`: Replaces kernel inotify watch handles with lightweight periodic stat polling, completely bypassing the OS inotify watcher allocation limit.
- `interval: 200`: Polls for changes every 200ms, providing snappy HMR updates while maintaining low CPU utilization.
- `ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**']`: Excludes large dependency, build, and version control directories from watch loops, preventing unnecessary polling overhead.

This configuration works out of the box in unprivileged containers, cloudtop environments, and multi-tenant Linux machines without requiring administrative access.

#### Host-Level Sysctl Remediation (Optional)
If you have root/sudo privileges and prefer native inotify kernel events to save polling cycles across all tools, increase the system-wide inotify watcher limit on your host:

```bash
# Temporarily raise inotify limit:
sudo sysctl -w fs.inotify.max_user_watches=524288

# Persist across reboots:
echo "fs.inotify.max_user_watches=524288" | sudo tee /etc/sysctl.d/60-inotify.conf
sudo sysctl -p /etc/sysctl.d/60-inotify.conf
```

### Remote Workstation & Web Proxy Host Blocking (`server.allowedHosts`)

#### Issue Description
When accessing the Vite dev server through a remote development proxy or cloud workstation proxy URL (such as `https://<port>-<session-id>.proxy.example.com` or `https://<remote-proxy-host>`), Vite may reject incoming HTTP requests with:
```text
Blocked request. This host ("<remote-proxy-host>") is not allowed. To allow this host, add "<remote-proxy-host>" to server.allowedHosts in vite.config.js
```

#### Defect Mechanism & Root Cause
Vite enforces host header validation to mitigate DNS rebinding attacks. By default, Vite only permits requests targeting `localhost` and `127.0.0.1`. When accessing the dev server remotely through a cloud workstation web proxy or reverse proxy domain, the browser transmits the proxy hostname in the HTTP `Host` header. Without explicit host authorization, Vite rejects the request with HTTP 403.

#### Repository-Level Solution
In `vite.config.ts`, `server.allowedHosts` is set to `true` (permitting remote development proxy subdomains alongside localhost):

```typescript
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 200,
      ignored: ['**/dist/**', '**/.git/**', '**/node_modules/**'],
    },
  },
```

Alternatively, specific host domains can be explicitly listed (for example, `allowedHosts: ['.proxy.example.com', 'localhost', '127.0.0.1']`).

### Remote Workstation & Container Access

The dev server binds to `host: '0.0.0.0'` on port `5173` with `allowedHosts: true`. When developing on a remote workstation or container:
- The server is accessible locally via `http://localhost:5173`.
- The server can be accessed through SSH port forwarding or remote web proxy URLs without host blocking errors.

### GitHub Pages Deployment Fails with `HttpError: Not Found`

#### Issue Description
During the `Deploy to GitHub Pages` step (`actions/deploy-pages@v4`) in `.github/workflows/deploy.yml`, the workflow fails with:
```text
Creating Pages deployment with payload:
{
	"artifact_id": ...,
	"pages_build_version": "...",
	"oidc_token": "***"
}
Error: Creating Pages deployment failed
Error: HttpError: Not Found
    at /home/runner/work/_actions/actions/deploy-pages/v4/node_modules/@octokit/request/dist-node/index.js:124:1
```

#### Defect Mechanism & Root Cause
GitHub's REST API endpoint for creating Pages deployments (`POST /repos/{owner}/{repo}/pages/deployments`) is only provisioned when the repository's Pages source is configured to **GitHub Actions**.

By default or on existing repositories with Pages configured, GitHub sets the Pages source to **Deploy from a branch** (or leaves Pages uninitialized). Even though `.github/workflows/deploy.yml` possesses valid OIDC tokens (`id-token: write`), proper permissions (`pages: write`), and specifies `environment: { name: 'github-pages' }`, GitHub returns HTTP 404 `Not Found` because the repository's deployment backend is not set to `workflow`.

Additionally, because the pipeline pushes to the `gh-pages` branch for historical version retention, administrators may be led to configure Pages source to "Deploy from a branch (gh-pages)". This misconfiguration causes `actions/deploy-pages@v4` to fail with HTTP 404.

#### Remediation
1. Go to the repository on GitHub.
2. Click **Settings** -> **Pages** (in the left navigation under "Code and automation").
3. Under **Build and deployment**, locate the **Source** dropdown.
4. Select **GitHub Actions** (switch away from "Deploy from a branch").
5. Re-run the failed deployment workflow (or push a new commit to `main`). The deployment will complete with `[PASS]`.

---

## License

This project is licensed under the terms of the MIT License. See `LICENSE` for details.
