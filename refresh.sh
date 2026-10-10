#!/usr/bin/env bash
# Root-level wrapper: refresh GMGN token data -> render -> pull --rebase --autostash -> push.
# Usage: bash /workspace/alpha-dashboard/refresh.sh ["commit label"]   (extra args after label go to refresh_tokens.py)
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
PY=/workspace/.venv-xl/bin/python; [ -x "$PY" ] || PY=python3
LABEL="${1:-tokens $(date +%m/%d\ %H:%M)}"; shift || true
"$PY" scripts/refresh_tokens.py "$@"
"$PY" update_heat.py render
git add -A index.html posts.xlsx data.json 2>/dev/null || true
git diff --cached --quiet || git commit -qm "$LABEL"
git pull -q --rebase --autostash origin main
git push -q origin HEAD:main
echo "OK $(git rev-parse --short HEAD) $LABEL"
