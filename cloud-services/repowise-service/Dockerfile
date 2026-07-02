FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    REPOWISE_REPO_PATH=/workspace/repo \
    REPOWISE_EMBEDDER=mock

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      git \
      nodejs \
      tini \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir repowise \
    && node --version \
    && repowise --version

RUN cat > /usr/local/bin/repowise-entrypoint <<'SCRIPT' \
    && chmod +x /usr/local/bin/repowise-entrypoint
#!/usr/bin/env bash
set -Eeuo pipefail

log() { printf '[repowise] %s\n' "$*"; }
fail() { printf '[repowise] ERROR: %s\n' "$*" >&2; exit 1; }

REPO_PATH="${REPOWISE_REPO_PATH:-/workspace/repo}"
PROVIDER="${LLM_PROVIDER:-}"
PROVIDER="${PROVIDER,,}"

[[ -d "$REPO_PATH" ]] || fail "Repository mount not found: $REPO_PATH"
[[ -d "$REPO_PATH/.git" ]] || fail "Mounted path is not a git repository: $REPO_PATH"
[[ -w "$REPO_PATH" ]] || fail "Repository mount must be writable for init/update: $REPO_PATH"
git config --global --add safe.directory "$REPO_PATH"
git -C "$REPO_PATH" rev-parse --is-inside-work-tree >/dev/null

case "$PROVIDER" in
  openai)
    MODEL="${OPENAI_MODEL:-}"
    [[ -n "${OPENAI_API_KEY:-}" ]] || fail "OPENAI_API_KEY is required when LLM_PROVIDER=openai"
    [[ -n "$MODEL" ]] || fail "OPENAI_MODEL is required when LLM_PROVIDER=openai"
    export OPENAI_API_KEY
    if [[ -n "${OPENAI_BASE_URL:-}" ]]; then export OPENAI_BASE_URL; else unset OPENAI_BASE_URL; fi
    ;;
  anthropic)
    MODEL="${ANTHROPIC_MODEL:-}"
    [[ -n "${ANTHROPIC_API_KEY:-}" ]] || fail "ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic"
    [[ -n "$MODEL" ]] || fail "ANTHROPIC_MODEL is required when LLM_PROVIDER=anthropic"
    export ANTHROPIC_API_KEY
    if [[ -n "${ANTHROPIC_BASE_URL:-}" ]]; then export ANTHROPIC_BASE_URL; else unset ANTHROPIC_BASE_URL; fi
    ;;
  *)
    fail "LLM_PROVIDER must be 'openai' or 'anthropic'"
    ;;
esac

export REPOWISE_PROVIDER="$PROVIDER"
export REPOWISE_MODEL="$MODEL"
export REPOWISE_REPO_PATH="$REPO_PATH"
export REPOWISE_HOST=127.0.0.1
export REPOWISE_DB_URL="sqlite+aiosqlite:///${REPO_PATH}/.repowise/wiki.db"
export REPOWISE_PORT=7337

mkdir -p "$REPO_PATH/.repowise"
cd "$REPO_PATH"

has_sync_commit() {
  python - <<'PY'
import json, pathlib, sys
p = pathlib.Path(".repowise/state.json")
try:
    v = json.loads(p.read_text()).get("last_sync_commit")
except Exception:
    v = None
sys.exit(0 if isinstance(v, str) and v else 1)
PY
}

ensure_sync_commit() {
  has_sync_commit && return 0
  local head
  head="$(git -C "$REPO_PATH" rev-parse HEAD)"
  python - "$head" <<'PY'
import json, pathlib, sys
p = pathlib.Path(".repowise/state.json")
data = json.loads(p.read_text())
data["last_sync_commit"] = sys.argv[1]
p.write_text(json.dumps(data, indent=2) + "\n")
PY
  log "Recorded Repowise sync commit: ${head:0:12}"
}

init_args=(. --provider "$REPOWISE_PROVIDER" --model "$REPOWISE_MODEL" --yes --no-workspace --no-codex --no-agents --no-distill-hook --no-claude-md)

if has_sync_commit; then
  log "Updating existing Repowise index."
  repowise update . --provider "$REPOWISE_PROVIDER" --model "$REPOWISE_MODEL" --no-workspace --no-agents --no-cost-tracking
elif [[ -f .repowise/state.json ]]; then
  log "Found Repowise cache without sync commit; resuming initialization."
  repowise init "${init_args[@]}" --resume
else
  log "Initializing Repowise index."
  repowise init "${init_args[@]}"
fi
ensure_sync_commit

log "Starting Repowise API and Web UI."
exec repowise serve --host 0.0.0.0 --port 7337 --ui-port 3000
SCRIPT

WORKDIR /workspace/repo
EXPOSE 7337 3000
ENTRYPOINT ["tini", "--", "/usr/local/bin/repowise-entrypoint"]
