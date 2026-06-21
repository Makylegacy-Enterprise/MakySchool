#!/usr/bin/env bash
# Downloads a project-local Caddy binary (no sudo / system install required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$ROOT/infrastructure/caddy/bin"
CADDY="$BIN_DIR/caddy"
VERSION="2.9.1"

if [[ -x "$CADDY" ]]; then
  exit 0
fi

mkdir -p "$BIN_DIR"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *)
    echo "ensure-caddy: unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

URL="https://github.com/caddyserver/caddy/releases/download/v${VERSION}/caddy_${VERSION}_${OS}_${ARCH}.tar.gz"
TMP="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "ensure-caddy: downloading Caddy v${VERSION} for ${OS}_${ARCH}..."
curl -fsSL "$URL" | tar -xz -C "$TMP" caddy
mv "$TMP/caddy" "$CADDY"
chmod +x "$CADDY"
echo "ensure-caddy: installed $CADDY"
