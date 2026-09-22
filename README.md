# LearningLogo

LearningLogo is a free, open-source, client-only, offline-first Progressive Web Application (PWA) designed to teach children (ages 6–14) computational thinking and geometry through classic educational turtle graphics.

It runs entirely in modern browsers across low-cost touchscreen Chromebooks, smartphones, tablets, and laptops, requiring zero account registration, zero backend server dependencies, and zero tracking.

---

## Key Features

- **Client-Side Interpreter**: Fast recursive-descent AST parser and cooperative execution engine supporting classic Logo primitives (`FORWARD`, `BACK`, `LEFT`, `RIGHT`, `REPEAT`, `TO ... END`, variables, math expressions, and conditionals) with time-sliced execution to prevent browser UI lockup.
- **Accessible Turtle Graphics**: High-DPI HTML5 2D Canvas with Cartesian coordinates `(0, 0)` centered at origin, 0° heading North, and Okabe-Ito colorblind-safe palettes.
- **Touch-Friendly Code Editor & REPL**: Multi-line editor with token-based syntax highlighting, single-line immediate REPL command console with history, and a quick-symbol ribbon for bracket/quote insertion on touchscreen devices.
- **Step Debugger & Tracer**: Interactive execution tracer supporting step-by-step evaluation, call stack inspection, and variable watch panels.
- **Offline-First PWA**: Native Service Worker with Cache-First asset caching strategy and seamless update notifications.
- **Zero-Friction Sharing**: URL-fragment code compression for instant project sharing and local storage persistence without accounts or servers.

---

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

### Cloudtop Web Proxy Host Blocking (`server.allowedHosts`)

#### Issue Description
When accessing the Vite dev server through a Cloudtop web proxy URL (such as `https://<port>-<hash>.proxy.googlers.com` or `*.c.googlers.com`), Vite may reject incoming HTTP requests with:
```text
Blocked request. This host ("...proxy.googlers.com") is not allowed. To allow this host, add "..." to server.allowedHosts in vite.config.js
```

#### Defect Mechanism & Root Cause
Vite enforces host header validation to mitigate DNS rebinding attacks. By default, Vite only permits requests targeting `localhost` and `127.0.0.1`. When accessing the dev server remotely through a Cloudtop web proxy or reverse proxy domain, the browser transmits the proxy hostname in the HTTP `Host` header. Without explicit host authorization, Vite rejects the request with HTTP 403.

#### Repository-Level Solution
In `vite.config.ts`, `server.allowedHosts` is set to `true` (permitting Cloudtop proxy subdomains such as `*.proxy.googlers.com` and `*.c.googlers.com` alongside localhost):

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

Alternatively, specific host domains can be explicitly listed (for example, `allowedHosts: ['.proxy.googlers.com', '.c.googlers.com', 'localhost', '127.0.0.1']`).

### Remote Cloudtop & Container Access

The dev server binds to `host: '0.0.0.0'` on port `5173` with `allowedHosts: true`. When developing on a remote cloudtop instance or container:
- The server is accessible locally via `http://localhost:5173`.
- The server can be accessed through SSH port forwarding or Cloudtop web proxy URLs (`*.proxy.googlers.com`, `*.c.googlers.com`) without host blocking errors.

---

## License

This project is licensed under the terms of the MIT License. See `LICENSE` for details.
