# Implementation Plan: GitHub Pages Deployment with Automated Releases & Multi-Version Switching

## 1. Analysis & Findings

### 1.1 Current Repository Context & Baseline Assessment
- **Repository Location**: `/usr/local/google/home/vakh/git/hub/aawc/LearningLogo`
- **Application Architecture**: Offline-first, client-only Educational Logo Programming Environment built with TypeScript, Vite 6, and HTML5 Canvas. No backend server or database exists.
- **Current Remote**: `github-aawc` (`git@github.com:aawc/LearningLogo.git`), default branch `main`.
- **Existing Build & Quality Baseline**:
  - `npm run typecheck`: `[PASS]` (TypeScript 5.6.3, 0 errors).
  - `npm run test`: `[PASS]` (Vitest 4.1.11, all unit and integration tests passing).
  - `npm run audit`: `[PASS]` (0 vulnerabilities).
  - `npm run build`: `[PASS]` (Outputs bundle to `dist/`, assets inline limit 4096B, target ES2022).
- **Vite Base Path**: `vite.config.ts` configures `base: './'`, enabling relative asset resolution.
- **Existing CI Configuration**: `.github/workflows/security.yml` executes on push and pull request to `main`, validating audit, typecheck, tests, and build. No deployment workflow or GitHub Pages configuration currently exists.
- **Current Git Tag State**: 0 tags exist in repository.

### 1.2 Depressive Realism & Concrete Failure Mode Analysis

Deploying multi-version releases to GitHub Pages introduces subtle distributed state and client caching failure modes. Below is the diagnostic analysis of each failure mechanism and its concrete mitigation:

1. **Failure Mode 1: Atomic Deployment Overwrite on GitHub Pages**
   - *Failure Mechanism*: The standard GitHub Pages deployment action (`actions/deploy-pages`) deploys an atomic zip artifact. If a new build only uploads `dist/`, all past version subdirectories are destroyed on the live site.
   - *Remediation*: Maintain a persistent multi-version staging tree backed by the `gh-pages` branch. The deployment workflow checks out `gh-pages` (depth 1), places the new build into `releases/<tag>/`, copies the latest build to root `/`, prunes releases older than the retention threshold, distributes `versions.json`, and deploys the entire aggregated tree.

2. **Failure Mode 2: Concurrency Races and Mid-Deploy Overwrites**
   - *Failure Mechanism*: Rapid sequential pushes to `main` trigger concurrent workflow runs. If two runs execute concurrently without locking, Run 2 can checkout `gh-pages` before Run 1 finishes, compute colliding version tags, or cause non-fast-forward push rejections.
   - *Remediation*: Enforce workflow-level serialized concurrency using `concurrency: group: github-pages-deploy, cancel-in-progress: false`. Deployment jobs queue and execute in strict sequence.

3. **Failure Mode 3: Subdirectory Trailing Slash & Relative Path Breakage**
   - *Failure Mechanism*: Assets are built with `base: './'`. When a user navigates to `https://aawc.github.io/LearningLogo/releases/v1.0.0` without a trailing slash, browsers resolve `./assets/index.js` relative to `/LearningLogo/assets/index.js` (parent directory), triggering 404 HTTP errors.
   - *Remediation*:
     1. Client version switcher explicitly navigates to trailing-slash URLs (`releases/v1.0.0/`).
     2. Deploy a custom `404.html` at the site root that detects missing trailing slashes on `/releases/<tag>` routes and issues an immediate `window.location.replace()` to append the trailing slash before any asset requests fail.

4. **Failure Mode 4: Service Worker Cross-Version Cache Pollution & Sub-Scope Race Conditions**
   - *Failure Mechanism*: If Service Workers are registered across historical subdirectories (`/releases/vX.Y.Z/`), multiple active service workers collide on origin storage, risk cross-scope caching races, and complicate cache invalidation. Furthermore, if a root Service Worker intercepts `/releases/` asset requests, users switching to an older version receive cached files from `latest`, producing hybrid "Frankenbuilds".
   - *Remediation & Architecture Simplification*:
     1. Adopt a simplified PWA model: only the canonical latest release at the site root operates as an installable, offline-capable PWA.
     2. Historical releases under `/releases/vX.Y.Z/` are opened strictly from live URLs without Service Worker overhead, caching interference, or registration.
     3. Service Worker registration is guarded in `src/pwa/register_sw.ts`: if `window.location.pathname.includes('/releases/')`, registration is prevented and any lingering sub-scope registrations are cleaned up.
     4. Root Service Worker (`public/sw.js`) uses simple cache naming (`const CACHE_NAME = 'learning-logo-' + APP_VERSION;`) and unconditionally bypasses `/releases/` subpaths (`if (url.pathname.includes('/releases/')) return;`) and `versions.json`.
     5. Cache activation purges legacy `learning-logo-cache` and older `learning-logo-*` versions without complex scope heuristics.

5. **Failure Mode 5: Repository Storage Bloat on `gh-pages`**
   - *Failure Mechanism*: Indefinitely retaining full static builds for hundreds of pushes causes Git repository hypertrophy.
   - *Remediation*: Implement an automated retention policy in the deployment script: retain the latest 20 releases in `gh-pages/releases/`. All historical releases remain permanently preserved in GitHub Releases as git tags and downloadable `.zip` assets.

6. **Failure Mode 6: Infinite CI Trigger Loops**
   - *Failure Mechanism*: Workflows that commit version updates back to `main` trigger redundant `push` events, risking recursion or hitting branch protection rules.
   - *Remediation*: Never push commits back to `main`. Version tags and GitHub Releases serve as the sole source of version truth. CI only pushes deployment artifacts to `gh-pages`.

---

## 2. System Architecture Diagram

```
+-----------------------------------------------------------------------------------------+
| Push to 'main' Branch (Developer Commit)                                                |
+-----------------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------------+
| GitHub Actions: .github/workflows/deploy.yml                                            |
| Concurrency Group: github-pages-deploy (cancel-in-progress: false)                       |
| Permissions: contents: write, pages: write, id-token: write                             |
+-----------------------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-----------------------------+        +--------------------------------------------------+
| 1. Quality Gates            |        | 2. Automated Version Tag Determination           |
| - npm run audit             |        | - scripts/determine_release_version.mjs          |
| - npm run typecheck         |        | - Inspect git history since last tag             |
| - npm run test              |        | - Conventional Commits: major / minor / patch    |
+-----------------------------+        | - Fallback to v1.0.0 if no prior tags            |
                                       +--------------------------------------------------+
                                                      |
                                                      v
                                       +--------------------------------------------------+
                                       | 3. Production Build & Version Injection          |
                                       | - VITE_APP_VERSION=$TAG npm run build            |
                                       | - Inject version into dist/sw.js CACHE_NAME      |
                                       | - Zip dist/ -> learning-logo-$TAG.zip            |
                                       +--------------------------------------------------+
                                                      |
                                                      v
                                       +--------------------------------------------------+
                                       | 4. GitHub Release Creation                       |
                                       | - gh release create $TAG learning-logo-$TAG.zip  |
                                       |   --title "Release $TAG" --generate-notes        |
                                       +--------------------------------------------------+
                                                      |
                                                      v
+-----------------------------------------------------------------------------------------+
| 5. Multi-Version Staging Tree Assembly                                                  |
| - Fetch / initialize 'gh-pages' branch working tree                                     |
| - Copy dist/* -> site_deploy/releases/$TAG/                                             |
| - Copy dist/* -> site_deploy/ (root serves latest release)                              |
| - Prune releases older than 20 versions in site_deploy/releases/                        |
| - scripts/generate_versions_manifest.mjs -> site_deploy/versions.json                   |
| - Sync versions.json into every site_deploy/releases/*/ directory                       |
| - Add .nojekyll and 404.html redirect normalizer                                        |
+-----------------------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-----------------------------+        +--------------------------------------------------+
| 6. Branch Persistence       |        | 7. GitHub Pages Deployment                       |
| - Commit & push site_deploy |        | - actions/upload-pages-artifact@v3               |
|   to 'gh-pages' branch      |        | - actions/deploy-pages@v4                        |
+-----------------------------+        +--------------------------------------------------+
                                                      |
                                                      v
+-----------------------------------------------------------------------------------------+
| Client-Side Runtime & Version Switcher (src/ui/version_switcher.ts)                     |
| - Mounted in header-actions of LearningLogo app                                         |
| - Fetches ./versions.json with cache: 'no-cache'                                        |
| - Validates schema (validateVersionsManifest)                                           |
| - Displays current version badge [Current] and dropdown menu of available releases      |
| - On switch: preserves editor state in localStorage & URL #code hash                    |
| - Navigates to target version URL with trailing slash                                   |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Duckie Knowledge Retrieval Summary

Consultation with Duckie surfaced critical architectural guidance incorporated into this plan:

- **Advice on Concurrency & Overwrites**: GitHub Actions jobs running without concurrency locks create lost update races on deployment branches.
  - *Action Taken*: Configured `concurrency: group: github-pages-deploy, cancel-in-progress: false` to ensure queueing rather than cancellation or parallel collision.
- **Advice on Storage Bloat**: Committing every bundle across unlimited releases causes git repository bloat.
  - *Action Taken*: Established an automated retention cap of 20 active releases on the `gh-pages` branch, with perpetual archiving in GitHub Releases.
- **Advice on Service Worker Scope & Cache Collisions**: Root service workers intercept subdirectories, and generic cache names cross-contaminate versions.
  - *Action Taken*: Added versioned cache names (`learning-logo-${APP_VERSION}`), bypassed `/releases/` interception from root SW, and excluded `versions.json` from SW cache.
- **Advice on Client Manifest Validation**: Dynamic runtime manifests must be schema-validated to prevent UI crashes if a manifest is malformed.
  - *Action Taken*: Designed a strict TypeScript validator (`validateVersionsManifest`) validating types, non-empty arrays, and safe path structures before DOM rendering.

---

## 4. Technical Specifications

### 4.1 Release Versioning & Tag Determination (`scripts/determine_release_version.mjs`)
- **Execution**: Node.js ESM script running during CI.
- **Input**: Local git repository tags and commit history (`git tag -l "v*.*.*"`, `git log <lastTag>..HEAD`).
- **Algorithm**:
  1. Retrieve all tags matching semver pattern `v[0-9]+.[0-9]+.[0-9]+`.
  2. If 0 tags exist:
     - Read `version` from `package.json` (e.g. `1.0.0`).
     - Tag output is `v${version}` (e.g. `v1.0.0`).
  3. If previous tags exist:
     - Sort semver descending to identify `$LATEST_TAG` (e.g. `v1.0.0`).
     - Inspect commit subjects since `$LATEST_TAG` via `git log ${LATEST_TAG}..HEAD --format=%s`.
     - Bump rules:
       - Major: If any commit contains `BREAKING CHANGE:` or matches `^[a-z]+(\([a-z0-9_-]+\))?!:`.
       - Minor: If any commit matches `^feat(\([a-z0-9_-]+\))?:`.
       - Patch: Default for `fix`, `docs`, `refactor`, `chore`, `ci`, or untyped commits.
     - Compute `$NEXT_VERSION = v${major}.${minor}.${patch}`.
  4. Collision Check: Verify `$NEXT_VERSION` does not exist in remote tags; if collision occurs, increment patch until unique.
  5. Output: Writes `version=${NEXT_VERSION}` to `$GITHUB_OUTPUT`.

### 4.2 Manifest Schema & Generation Engine (`scripts/generate_versions_manifest.mjs`)
- **Schema Specification (`versions.json`)**:
```json
{
  "latest": "v1.0.1",
  "generatedAt": "2026-09-22T14:55:00Z",
  "versions": [
    {
      "version": "v1.0.1",
      "name": "v1.0.1 (Latest)",
      "date": "2026-09-22T14:55:00Z",
      "path": "",
      "notesUrl": "https://github.com/aawc/LearningLogo/releases/tag/v1.0.1",
      "isLatest": true
    },
    {
      "version": "v1.0.0",
      "name": "v1.0.0",
      "date": "2026-09-21T10:00:00Z",
      "path": "releases/v1.0.0/",
      "notesUrl": "https://github.com/aawc/LearningLogo/releases/tag/v1.0.0",
      "isLatest": false
    }
  ]
}
```
- **Distribution**: Script writes `versions.json` to the site root and copies it into each `releases/*/` directory to guarantee local resolution regardless of directory depth.

### 4.3 Service Worker & PWA Architecture (`public/sw.js` & `src/pwa/register_sw.ts`)
- **PWA Scope Separation**: Only the latest release at the site root operates as an installable offline PWA. Historical releases under `/releases/vX.Y.Z/` operate strictly as live online pages to keep caching and service worker lifecycle management simple, reliable, and decoupled.
- **Dynamic Cache Name**: `const CACHE_NAME = 'learning-logo-' + APP_VERSION;` (injected during production build).
- **Fetch Bypasses**:
  - `if (url.pathname.endsWith('versions.json')) return event.respondWith(fetch(event.request, { cache: 'no-cache' }));`
  - `if (url.pathname.includes('/releases/')) return;` (Root SW unconditionally bypasses historical release paths).
- **Registration Guard (`src/pwa/register_sw.ts`)**:
  - If `window.location.pathname.includes('/releases/')`, skips SW registration and unregisters any lingering service worker registrations at that sub-scope.
- **Simple Activation Cleanup**: SW activation sweeps all cache keys, purging legacy unversioned `learning-logo-cache` and previous versions of `learning-logo-*` that do not match `CACHE_NAME`.

### 4.4 Subdirectory Trailing Slash & 404 Normalization (`public/404.html`)
- **Mechanism**: GitHub Pages routes non-existent files to `404.html`.
- **Script Logic**:
  If `location.pathname` matches `/releases/[^/]+$` (missing trailing slash):
  `window.location.replace(location.pathname + '/' + location.search + location.hash);`

### 4.5 Client-Side Version Selector UI Component
- **Module**: `src/ui/version_switcher.ts` and `src/ui/version_switcher_types.ts`.
- **Styling**: `src/styles/version_switcher.css`.
- **UX & Accessibility**:
  - Unobtrusive button in `header-actions` displaying current version badge (e.g. `[v1.0.1] ▾`).
  - Colorblind-accessible status badges: `[Current]`, `[Latest]`.
  - Full keyboard accessibility: `Escape` closes, `Enter`/`Space` selects, ARIA roles `listbox` and `option`.
  - State preservation: preserves active code by maintaining `#code=...` hash across version switches and flushing `store.saveDraft()`.
  - Offline resilience: If `versions.json` fetch fails or client is offline, shows current version with offline indicator (`[Offline]`).

### 4.6 GitHub Actions Deployment Workflow (`.github/workflows/deploy.yml`)
- **Triggers**: `push: branches: [main]`, `workflow_dispatch`.
- **Concurrency**: `group: github-pages-deploy`, `cancel-in-progress: false`.
- **Permissions**: `contents: write`, `pages: write`, `id-token: write`.
- **Runner Environment**: `ubuntu-latest`, Node.js 22.

---

## 5. Step-by-Step Implementation Roadmap

All implementation steps are explicitly delegated to the **Implementer** subagent.

### Pre-Flight Check / Workspace Verification
1. Inspect git workspace using `git status`. Ensure staged files in `PROMPT.md` and `README.md` are uncommitted baselines and untouched.
2. Verify Node.js environment (`node -v`, `npm -v`).

---

### Task 1: Version Determination & Manifest Generation Scripts (To be executed by Implementer)
- **Target Files**:
  - `scripts/determine_release_version.mjs`
  - `scripts/generate_versions_manifest.mjs`
- **Verification Target**:
  - `tests/unit/scripts/release_version.test.ts`

1. **Audit**: Inspect `package.json` scripts and Node ESM runtime capabilities.
2. **RED**: Implement unit tests in `tests/unit/scripts/release_version.test.ts` testing:
   - Initial version calculation with 0 tags (returns `v1.0.0`).
   - Patch bump for fix/refactor commits.
   - Minor bump for feat commits.
   - Major bump for breaking change commits.
   - Manifest schema generation and descending semver ordering.
   - Verify test fails: `npm test tests/unit/scripts/release_version.test.ts`.
3. **GREEN**:
   - Create `scripts/determine_release_version.mjs` with git inspection and semver bump logic.
   - Create `scripts/generate_versions_manifest.mjs` with manifest generation logic.
4. **Verification**:
   - `npm run typecheck`
   - `npm test tests/unit/scripts/release_version.test.ts`

---

### Task 2: Build-Time Version Injection & Service Worker Isolation (To be executed by Implementer)
- **Target Files**:
  - `vite.config.ts`
  - `src/vite-env.d.ts`
  - `public/sw.js`
  - `src/pwa/register_sw.ts`
  - `public/404.html`
- **Verification Target**:
  - `tests/unit/pwa/sw_cache.test.ts`
  - `tests/unit/pwa/register_sw.test.ts`

1. **Audit**: Review `vite.config.ts`, `src/pwa/register_sw.ts`, and `public/sw.js`.
2. **RED**: Update `tests/unit/pwa/sw_cache.test.ts` and `tests/unit/pwa/register_sw.test.ts` to assert:
   - `public/sw.js` uses simple `CACHE_NAME = 'learning-logo-' + APP_VERSION`.
   - `public/sw.js` excludes `versions.json` from caching.
   - `public/sw.js` unconditionally bypasses `/releases/` subpaths.
   - `src/pwa/register_sw.ts` skips registration and unregisters sub-scope workers when visiting `/releases/`.
   - `public/404.html` exists and contains trailing-slash redirect logic.
   - Verify test fails: `corepack npm test tests/unit/pwa/sw_cache.test.ts`.
3. **GREEN**:
   - In `vite.config.ts`, expose `__APP_VERSION__` via `define: { __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || '1.0.0') }`.
   - Update `src/vite-env.d.ts` to declare `declare const __APP_VERSION__: string;`.
   - Update `public/sw.js` with simple versioned `CACHE_NAME`, `/releases/` bypass, and legacy/older cache cleanup.
   - Guard `src/pwa/register_sw.ts` against `/releases/` subpaths and unregister sub-scope SWs.
   - Create `public/404.html` with trailing-slash normalization script.
4. **Verification**:
   - `corepack npm run typecheck`
   - `corepack npm test tests/unit/pwa/sw_cache.test.ts`
   - `corepack npm test tests/unit/pwa/register_sw.test.ts`
   - `corepack npm run build`

---

### Task 3: Client-Side Version Switcher Core & UI (To be executed by Implementer)
- **Target Files**:
  - `src/ui/version_switcher_types.ts`
  - `src/ui/version_switcher.ts`
  - `src/styles/version_switcher.css`
- **Verification Target**:
  - `tests/unit/ui/version_switcher.test.ts`

1. **Audit**: Review `src/ui/layout.ts` and CSS token definitions in `src/styles/tokens.css`.
2. **RED**: Create `tests/unit/ui/version_switcher.test.ts` verifying:
   - `validateVersionsManifest()` rejects invalid JSON or malformed schema.
   - `resolveVersionUrl()` accurately constructs URLs from root and subpaths while preserving `#code=` hash.
   - `VersionSwitcher` renders badge, toggles dropdown on click, displays `[Current]` badge, and handles keyboard events.
   - Graceful offline fallback when fetch fails.
   - Verify test fails: `npm test tests/unit/ui/version_switcher.test.ts`.
3. **GREEN**:
   - Implement `src/ui/version_switcher_types.ts` with types and `validateVersionsManifest`.
   - Implement `src/ui/version_switcher.ts` with component logic and DOM management.
   - Create `src/styles/version_switcher.css` with colorblind-accessible styles.
4. **Verification**:
   - `npm run typecheck`
   - `npm test tests/unit/ui/version_switcher.test.ts`

---

### Task 4: Application Lifecycle Integration (To be executed by Implementer)
- **Target Files**:
  - `src/main.ts`
  - `src/styles/base.css`
- **Verification Target**:
  - `tests/integration/app_lifecycle.test.ts`

1. **Audit**: Inspect `src/main.ts` header initialization (lines 270-352).
2. **RED**: Update `tests/integration/app_lifecycle.test.ts` to verify:
   - Version switcher mounts into `#header-container`.
   - Switching versions flushes current code to `LocalStore` draft.
   - Verify test fails: `npm test tests/integration/app_lifecycle.test.ts`.
3. **GREEN**:
   - Import `VersionSwitcher` and `version_switcher.css` in `src/main.ts`.
   - Mount version switcher into `actions` container alongside `projectsBtn`, `shareBtn`, etc.
   - Wire version switch event to flush draft to `LocalStore`.
4. **Verification**:
   - `npm run typecheck`
   - `npm test tests/integration/app_lifecycle.test.ts`
   - `npm run build`

---

### Task 5: GitHub Actions Workflow Configuration (To be executed by Implementer)
- **Target Files**:
  - `.github/workflows/deploy.yml`
- **Verification Target**:
  - Workflow syntax inspection and dry-run script testing.

1. **Audit**: Inspect `.github/workflows/security.yml`.
2. **RED**: Write validation script/test verifying `.github/workflows/deploy.yml` contains:
   - `concurrency.cancel-in-progress: false`
   - `permissions: { contents: write, pages: write, id-token: write }`
   - Checkout with `fetch-depth: 0`
   - Release creation and pages deployment steps.
3. **GREEN**:
   - Create `.github/workflows/deploy.yml` implementing the complete pipeline:
     1. Checkout (fetch-depth: 0)
     2. Node 22 setup & npm ci
     3. Security audit, typecheck, test suite
     4. Calculate version via `scripts/determine_release_version.mjs`
     5. Production build with `VITE_APP_VERSION`
     6. Package zip asset `learning-logo-${TAG}.zip`
     7. Create GitHub Release via `gh release create`
     8. Stage multi-version tree, prune old releases, generate `versions.json`
     9. Commit and push to `gh-pages` branch
     10. Upload Pages artifact and deploy via `actions/deploy-pages@v4`
4. **Verification**:
   - Validate YAML syntax.
   - Run complete local build and test pipeline.

---

### Task 6: Documentation Synchronization & Repository Verification (To be executed by Implementer)
- **Target Files**:
  - `README.md`
  - `PROMPT.md`
- **Verification Target**:
  - Full repository test and build suite.

1. **Documentation Updates**:
   - Document the GitHub Pages deployment architecture, release tagging conventions, and version switcher in `README.md`.
   - Update `PROMPT.md` with new deployment workflows and scripts.
2. **Full Pipeline Verification**:
   - `npm run audit`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
   - Verify bundle size remains within budget (< 150 kB gzipped).

---

## 6. Verification & Validation Plan

### 6.1 Automated Test Execution Command Matrix
| Target / Check | Command | Expected Output | Status Indicator |
| :--- | :--- | :--- | :--- |
| Security Audit | `npm run audit` | 0 vulnerabilities found | `[PASS]` |
| Type Checking | `npm run typecheck` | 0 errors | `[PASS]` |
| Unit Tests | `npm test tests/unit/` | All unit tests passing | `[PASS]` |
| Integration Tests | `npm test tests/integration/` | All lifecycle tests passing | `[PASS]` |
| Production Build | `npm run build` | Clean bundle in `dist/` | `[PASS]` |

### 6.2 Manual & Multi-Version Scenario Verification
1. **Local Multi-Version Directory Simulation**:
   - Build current version into `test_deploy/releases/v1.0.0/`.
   - Build simulated version into `test_deploy/releases/v1.0.1/` and `test_deploy/`.
   - Generate `test_deploy/versions.json`.
   - Serve `test_deploy` via local HTTP server.
   - Verify version selector displays versions, allows switching between `v1.0.1` and `v1.0.0`, and retains code in `#code=` URL hash.
2. **Trailing Slash Fallback Simulation**:
   - Request `http://localhost:<PORT>/releases/v1.0.0` directly; verify `404.html` immediately appends `/` and loads assets cleanly.
3. **Offline & SW Isolation Check**:
   - Load page, disconnect network in browser devtools, confirm app remains functional and displays offline badge gracefully without caching stale `versions.json`.
