#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist-release"
VERSION="${1:-${VERSION:-1.0.0}}"

echo "Packaging LearningLogo for Linux v${VERSION}..."
mkdir -p "${DIST_DIR}"

for ARCH in amd64 arm64; do
  STAGE_DIR="${DIST_DIR}/learning-logo-linux-${ARCH}"
  rm -rf "${STAGE_DIR}"
  mkdir -p "${STAGE_DIR}"

  # Compile executable
  GOOS=linux GOARCH="${ARCH}" go build -trimpath \
    -ldflags="-s -w -X main.Version=${VERSION}" \
    -o "${STAGE_DIR}/learning-logo" \
    "${ROOT_DIR}/cmd/learning-logo/main.go"

  # Copy desktop and icon assets
  cp "${ROOT_DIR}/assets/linux/learning-logo.desktop" "${STAGE_DIR}/"
  if [ -f "${ROOT_DIR}/public/icon-512.png" ]; then
    cp "${ROOT_DIR}/public/icon-512.png" "${STAGE_DIR}/learning-logo.png"
  fi

  # Add README notes
  cat <<EOF > "${STAGE_DIR}/README.txt"
LearningLogo v${VERSION}
100% Offline Educational Logo Programming Environment for Kids

Run:
  ./learning-logo [file.logo]

Options:
  --port <N>      Specify custom port (default: dynamic loopback port)
  --no-browser    Do not automatically open default browser
  --version       Display version
EOF

  # Create tar.gz archive
  (
    cd "${DIST_DIR}"
    tar -czf "learning-logo-linux-${ARCH}.tar.gz" "learning-logo-linux-${ARCH}"
  )

  echo "Linux ${ARCH} packaged successfully: ${DIST_DIR}/learning-logo-linux-${ARCH}.tar.gz"
done

echo "[PASS] Linux packaging completed."
