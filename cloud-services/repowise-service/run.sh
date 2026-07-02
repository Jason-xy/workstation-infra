#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

IMAGE="${IMAGE:-repowise:local}"
NAME="${NAME:-repowise}"

if [[ "${1:-}" == "--build" ]]; then
  docker build -t "$IMAGE" .
  exit 0
fi
[[ $# -eq 0 ]] || { echo "usage: ./run.sh [--build]" >&2; exit 1; }
[[ -f .env ]] || { echo "Missing .env" >&2; exit 1; }

unset REPO_HOST_PATH LLM_PROVIDER \
  OPENAI_API_KEY OPENAI_BASE_URL OPENAI_MODEL \
  ANTHROPIC_API_KEY ANTHROPIC_BASE_URL ANTHROPIC_MODEL
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${REPO_HOST_PATH:?set REPO_HOST_PATH in .env}"
: "${LLM_PROVIDER:?set LLM_PROVIDER in .env}"
case "${LLM_PROVIDER,,}" in
  openai) : "${OPENAI_API_KEY:?set OPENAI_API_KEY in .env}"; : "${OPENAI_MODEL:?set OPENAI_MODEL in .env}" ;;
  anthropic) : "${ANTHROPIC_API_KEY:?set ANTHROPIC_API_KEY in .env}"; : "${ANTHROPIC_MODEL:?set ANTHROPIC_MODEL in .env}" ;;
  *) echo "LLM_PROVIDER must be openai or anthropic" >&2; exit 1 ;;
esac
[[ -d "$REPO_HOST_PATH/.git" ]] || { echo "REPO_HOST_PATH is not a git repository: $REPO_HOST_PATH" >&2; exit 1; }

exec docker run --rm --name "$NAME" \
  -p 7337:7337 \
  -p 3000:3000 \
  -v "$REPO_HOST_PATH:/workspace/repo" \
  -e LLM_PROVIDER="$LLM_PROVIDER" \
  -e OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  -e OPENAI_BASE_URL="${OPENAI_BASE_URL:-}" \
  -e OPENAI_MODEL="${OPENAI_MODEL:-}" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
  -e ANTHROPIC_BASE_URL="${ANTHROPIC_BASE_URL:-}" \
  -e ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-}" \
  "$IMAGE"
