#!/usr/bin/env bash
# Pre-commit Security & Quality Gate
# Enforces:
# 1. Dependency security audit (0 moderate+ vulnerabilities)
# 2. Strict TypeScript typechecking
# 3. Complete Vitest test suite execution

set -euo pipefail

# Unset CDPATH to prevent 'cd' from printing the target directory to stdout
unset CDPATH || true

# Anchor working directory to repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)"
cd "$REPO_ROOT" >/dev/null 2>&1

echo "==> Running Pre-Commit Security & Quality Gates..."

# Determine package manager / runner with explicit existence check
if command -v corepack >/dev/null 2>&1; then
  NPM_CMD="corepack npm"
elif command -v npm >/dev/null 2>&1; then
  NPM_CMD="npm"
else
  echo "[FAIL] Neither 'corepack' nor 'npm' executable found in PATH!" >&2
  exit 1
fi

# Gate 1: Dependency Security Audit
echo "--- [1/3] Gate 1: Dependency Security Audit (moderate+) ---"
if $NPM_CMD run audit; then
  echo "[PASS] Dependency security audit clean (0 moderate+ vulnerabilities)."
else
  echo "[FAIL] Security vulnerabilities detected! Run 'npm audit' or update dependencies before committing."
  exit 1
fi

# Gate 2: TypeScript Strict Typecheck
echo "--- [2/3] Gate 2: TypeScript Strict Typecheck ---"
if $NPM_CMD run typecheck; then
  echo "[PASS] TypeScript strict typecheck passed."
else
  echo "[FAIL] TypeScript compilation errors detected! Fix type errors before committing."
  exit 1
fi

# Gate 3: Vitest Test Suite
echo "--- [3/3] Gate 3: Vitest Test Suite ---"
if $NPM_CMD run test; then
  echo "[PASS] All unit and integration tests passed (100% green)."
else
  echo "[FAIL] Test suite failed! Fix failing tests before committing."
  exit 1
fi

echo "==> [PASS] All pre-commit quality gates passed successfully."
exit 0
