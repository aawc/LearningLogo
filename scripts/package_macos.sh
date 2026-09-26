#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist-release"
VERSION="${1:-${VERSION:-1.0.0}}"

echo "Packaging LearningLogo for macOS v${VERSION}..."
mkdir -p "${DIST_DIR}"

for ARCH in amd64 arm64; do
  APP_DIR="${DIST_DIR}/LearningLogo-${ARCH}.app"
  rm -rf "${APP_DIR}"
  mkdir -p "${APP_DIR}/Contents/MacOS"
  mkdir -p "${APP_DIR}/Contents/Resources"

  # Compile executable
  GOOS=darwin GOARCH="${ARCH}" go build -trimpath \
    -ldflags="-s -w -X main.Version=${VERSION}" \
    -o "${APP_DIR}/Contents/MacOS/learning-logo" \
    "${ROOT_DIR}/cmd/learning-logo/main.go"

  # Copy Info.plist and update version
  sed "s/1.0.0/${VERSION}/g" "${ROOT_DIR}/assets/macos/Info.plist" > "${APP_DIR}/Contents/Info.plist"

  # Copy icon if available
  if [ -f "${ROOT_DIR}/public/icon-512.png" ]; then
    cp "${ROOT_DIR}/public/icon-512.png" "${APP_DIR}/Contents/Resources/AppIcon.png"
  fi

  # Create ZIP archive
  (
    cd "${DIST_DIR}"
    rm -f "learning-logo-macos-${ARCH}.zip"
    zip -9 -r -q "learning-logo-macos-${ARCH}.zip" "LearningLogo-${ARCH}.app"
  )

  # Create DMG if hdiutil is present (macOS)
  if command -v hdiutil >/dev/null 2>&1; then
    echo "Creating DMG for ${ARCH}..."
    hdiutil create -volname "LearningLogo" -srcfolder "${APP_DIR}" -ov -format UDZO "${DIST_DIR}/learning-logo-macos-${ARCH}.dmg"
  fi

  echo "macOS ${ARCH} packaged successfully."
done

echo "[PASS] macOS packaging completed."
