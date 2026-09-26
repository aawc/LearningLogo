#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist-release"
VERSION="${1:-${VERSION:-1.0.0}}"

echo "Packaging LearningLogo for Windows (amd64) v${VERSION}..."
mkdir -p "${DIST_DIR}"

# 1. Compile Windows Executable
GOOS=windows GOARCH=amd64 go build -trimpath \
  -ldflags="-s -w -X main.Version=${VERSION}" \
  -o "${DIST_DIR}/learning-logo.exe" \
  "${ROOT_DIR}/cmd/learning-logo/main.go"

# 2. Package ZIP archive
(
  cd "${DIST_DIR}"
  zip -9 -q "learning-logo-windows-amd64.zip" "learning-logo.exe"
)

# 3. Compile NSIS Installer if makensis is available
if command -v makensis >/dev/null 2>&1; then
  echo "Compiling NSIS installer..."
  makensis -DPRODUCT_VERSION="${VERSION}" \
    -DOUTFILE="${DIST_DIR}/learning-logo-windows-amd64-installer.exe" \
    -DBIN_SOURCE="${DIST_DIR}/learning-logo.exe" \
    "${ROOT_DIR}/scripts/installer.nsi"
  echo "Installer generated: ${DIST_DIR}/learning-logo-windows-amd64-installer.exe"
else
  echo "[WARN] makensis not found. Skipping NSIS installer compilation."
fi

echo "[PASS] Windows packaging completed."
