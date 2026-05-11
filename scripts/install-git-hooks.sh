#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

chmod +x .githooks/pre-commit scripts/check-secrets.sh
git config core.hooksPath .githooks

echo "Git hooks installed. pre-commit will run scripts/check-secrets.sh."
