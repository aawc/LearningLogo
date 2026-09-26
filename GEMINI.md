# LearningLogo: AI Developer Steering & Engineering Standards

## 1. Project Philosophy & Core Mandates

- **Pedagogical Integrity**: Seymour Papert's Constructionism and body-syntonic turtle geometry.
- **Universal Accessibility**: All visual indicators, badges, diffs, and palettes must be strictly red-green colorblind safe (Okabe-Ito palette: Blue `#0072B2` vs Orange `#D55E00`, explicit text tags `[PASS]`, `[FAIL]`, `[Saved]`, `[Unsaved]`). Never use bare colored circles.
- **No GitHub Alert Syntax**: Do not use GitHub alert callouts (`> [!NOTE]`, `> [!WARNING]`) because they break when syncing with external documentation tools.
- **In-Repository File Placement**: All project assets, test fixtures, scripts, documentation, and metadata must reside strictly within the repository boundary.
- **Go Implementation Policy**: Pure Go (`golang`) is the required language for all system utilities, desktop binaries, loopback embed servers, and backend automation in this workspace.

---

## 2. Desktop Architecture & Packaging Subsystem

### 2.1 Single-Binary Go Server (`cmd/learning-logo`, `pkg/server`)
- Compiles into a single statically linked binary with zero host dependencies.
- Embeds production web assets via `//go:embed all:dist` in `pkg/server/embed.go`.
- Dynamic port allocation (`:0`) or configured `--port` on loopback `127.0.0.1`.
- Origin header verification prevents cross-origin DNS rebinding attacks.
- Strict path sanitization (`filepath.Clean`, rejecting `..` traversal sequences).
- Cross-platform browser launcher (`rundll32` on Windows, `open` on macOS, `xdg-open` on Linux).

### 2.2 Native Packaging Scripts
- `scripts/package_windows.sh`: Compiles Windows executable, packages `learning-logo-windows-amd64.zip`, and compiles NSIS Modern UI 2 installer via `scripts/installer.nsi`.
- `scripts/package_macos.sh`: Assembles `LearningLogo.app` bundle metadata (`assets/macos/Info.plist`), and packages `learning-logo-macos-amd64.zip` and `learning-logo-macos-arm64.zip`.
- `scripts/package_linux.sh`: Assembles `learning-logo-linux-amd64.tar.gz` and `learning-logo-linux-arm64.tar.gz` with FreeDesktop application launcher (`assets/linux/learning-logo.desktop`).

---

## 3. Editor-Grade Local Disk File I/O Subsystem

- **Storage Abstraction (`src/storage/file_system.ts`)**:
  - `hasFileSystemAccess()`: Detects File System Access API support.
  - `saveFileAsWithHandle()`: Save file picker with fallback to `downloadBlob`.
  - `openFileWithPicker()`: Native file picker with fallback to input file dialog.
  - `verifyHandlePermission()`: Queries and requests file handle read/write permissions.
  - `readFileFromHandle()`: Reads file content and File object from FileSystemFileHandle.
- **State Management (`src/storage/project_manager.ts`)**:
  - Tracks `activeFileName` (default `'Untitled.logo'`).
  - `save()`: In-place write to `activeFileHandle` without dialog if present; if null, automatically invokes `saveAs()`.
  - `saveAs(suggestedName)`: Opens save file picker, writes content, binds handle and filename, clears dirty state.
  - `openFile()`: Native picker file loading with handle binding.
  - `newFile()`: Resets code to starter template, clears handle, resets filename to `Untitled.logo`.
- **User Interface (`src/main.ts`)**:
  - Header buttons: `btn-new` ("📄 New"), `btn-open` ("📂 Open..."), `btn-save` ("💾 Save"), `btn-save-as` ("💾 Save As...").
  - Keyboard shortcuts: `Ctrl+S` / `Cmd+S`, `Ctrl+Shift+S` / `Cmd+Shift+S`, `Ctrl+O` / `Cmd+O`, `Ctrl+N` / `Cmd+N`.
  - Confirmation dialogs: `confirmDiscardUnsaved` guards Open, New, and project switches.
  - Drag-and-drop: Dragging `.logo` or `.json` files loads code and binds handles.
  - `beforeunload`: Warns users if unsaved changes exist.

---

## 4. VirusTotal Evaluation & Release Pipeline (`.github/workflows/release.yml`)

- Triggered on push to `main`, tags `v*`, and manual `workflow_dispatch`.
- Multi-platform matrix build across Windows, macOS, and Linux.
- Scans all binaries, installers, and archives with VirusTotal via `crazy-max/ghaction-virustotal@v5`.
- Generates permanent SHA-256 detection links (`https://www.virustotal.com/gui/file/<sha256>/detection`) in release notes.
- Publishes release with attached artifacts via `softprops/action-gh-release@v2`.

---

## 5. Verification Commands

```bash
# Typecheck TypeScript
corepack npm run typecheck

# Full Vitest Test Suite (all tests must pass)
corepack npm run test

# Production Web Build
corepack npm run build

# Go Server & API Unit Tests
go test -v ./...

# Compile Desktop Executable
go build -trimpath -ldflags="-s -w" -o bin/learning-logo cmd/learning-logo/main.go
```
