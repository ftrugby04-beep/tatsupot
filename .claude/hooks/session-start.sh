#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 120000}'

cd "$CLAUDE_PROJECT_DIR"

if [ -f "package.json" ]; then
  echo "Installing npm dependencies..."
  npm install
fi
