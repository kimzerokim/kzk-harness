#!/usr/bin/env bash
# precedence-probe.sh — AC8 project-vs-global precedence probe.
#
# Authoritative spec: docs/plans/2026-05-04-kzk-global-install-design.md §13 AC8
# Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md Task E
#
# Writes a stub SKILL.md globally + locally with the SAME name and the SAME
# trigger keyword, asks claude (in the project dir) to quote the SKILL.md body,
# observes which one wins. project wins → G6 holds → exit 0.  global wins →
# spec §8.1 must change → exit 2 INCONCLUSIVE.  neither cited → exit 3
# INCONCLUSIVE (synthesis or no-skill path).
#
# Always cleans up both probe SKILL.md dirs in a trap EXIT — even on signal /
# error / SKIP.
#
# Usage:
#   bash install/lib/precedence-probe.sh                 # full probe
#   bash install/lib/precedence-probe.sh --probe-only    # alias (current default)
#   bash install/lib/precedence-probe.sh --help

set -u
set -o pipefail

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
PROBE_ONLY=0
PROJECT_ROOT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --probe-only) PROBE_ONLY=1; shift ;;
    -h|--help)
      cat <<'USAGE'
precedence-probe.sh — AC8 project-vs-global precedence probe

Usage:
  bash install/lib/precedence-probe.sh [--probe-only] [<project-root>]

Behavior:
  1. Generates a unique probe skill name kzk-precedence-probe-<uuid>
  2. Writes a stub SKILL.md to ~/.claude/skills/<name>/ (RESULT_BODY:global-wins)
  3. Writes the same to <project-root>/.claude/skills/<name>/ (RESULT_BODY:project-wins)
  4. Invokes claude -p '<trigger phrase>' --session-id <uuid> --output-format json
  5. Parses .result; verdict: project-wins -> exit 0
                              global-wins  -> exit 2 INCONCLUSIVE
                              neither      -> exit 3 INCONCLUSIVE
  6. ALWAYS cleans up via trap EXIT.

Exit codes:
  0  PASS (project wins, G6 holds)
  2  INCONCLUSIVE: precedence inverts (global wins) — spec §8.1 rewrite needed
  3  INCONCLUSIVE: no skill activated / synthesis path
  4  SKIP: claude CLI not in PATH
  5  setup error (uuidgen missing, mkdir failure, etc.)
USAGE
      exit 0
      ;;
    --) shift; break ;;
    -*)
      printf 'unknown flag: %s\n' "$1" >&2
      exit 5
      ;;
    *)
      PROJECT_ROOT="$1"
      shift
      ;;
  esac
done
: "$PROBE_ONLY"  # silence unused-var with set -u

# ---------------------------------------------------------------------------
# Tooling guards
# ---------------------------------------------------------------------------
if ! command -v uuidgen >/dev/null 2>&1; then
  printf 'precedence-probe SETUP-FAIL: uuidgen not in PATH\n' >&2
  exit 5
fi

if ! command -v claude >/dev/null 2>&1; then
  printf 'SKIP precedence-probe: claude CLI not in PATH\n'
  exit 4
fi

# ---------------------------------------------------------------------------
# Generate unique probe name (no caching collisions across runs)
# ---------------------------------------------------------------------------
# shellcheck disable=SC2018,SC2019  # ASCII-only UUID, [:upper:]/[:lower:] not needed
PROBE_UUID="$(uuidgen | tr 'A-Z' 'a-z')"
PROBE_NAME="kzk-precedence-probe-${PROBE_UUID}"
TRIGGER_KEYWORD="kzk-probe-test-${PROBE_UUID}"
SESSION_ID="$(uuidgen)"

# Test project dir defaults to a tempdir if not supplied
if [ -z "$PROJECT_ROOT" ]; then
  PROJECT_ROOT="$(mktemp -d -t kzk-probe-XXXXXX)"
  CLEANUP_PROJECT_ROOT=1
else
  CLEANUP_PROJECT_ROOT=0
fi

GLOBAL_SKILL_DIR="$HOME/.claude/skills/$PROBE_NAME"
PROJECT_SKILL_DIR="$PROJECT_ROOT/.claude/skills/$PROBE_NAME"

# ---------------------------------------------------------------------------
# Cleanup trap — fires on EXIT regardless of signal / error path
# ---------------------------------------------------------------------------
# shellcheck disable=SC2329  # invoked via trap below
cleanup() {
  local code=$?
  rm -rf "$GLOBAL_SKILL_DIR" 2>/dev/null || true
  rm -rf "$PROJECT_SKILL_DIR" 2>/dev/null || true
  if [ "$CLEANUP_PROJECT_ROOT" -eq 1 ] && [ -d "$PROJECT_ROOT" ]; then
    rm -rf "$PROJECT_ROOT" 2>/dev/null || true
  fi
  # Final defense: scrub any kzk-precedence-probe-* dirs that match our prefix
  # (e.g. from a previous interrupted run).
  for d in "$HOME"/.claude/skills/kzk-precedence-probe-*; do
    [ -d "$d" ] || continue
    rm -rf "$d" 2>/dev/null || true
  done
  exit "$code"
}
trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# Write stub SKILL.md to global and project dirs
# ---------------------------------------------------------------------------
mkdir -p "$GLOBAL_SKILL_DIR" "$PROJECT_SKILL_DIR"

cat >"$GLOBAL_SKILL_DIR/SKILL.md" <<EOF
---
name: $PROBE_NAME
version: 1.0.0
description: "kzk precedence probe stub. Trigger keyword: $TRIGGER_KEYWORD. Used only by install/lib/precedence-probe.sh."
---

# precedence-probe (global)

When the trigger keyword $TRIGGER_KEYWORD appears, quote this line literally:

RESULT_BODY:global-wins
EOF

cat >"$PROJECT_SKILL_DIR/SKILL.md" <<EOF
---
name: $PROBE_NAME
version: 99.0.0
description: "kzk precedence probe stub. Trigger keyword: $TRIGGER_KEYWORD. Used only by install/lib/precedence-probe.sh."
---

# precedence-probe (project)

When the trigger keyword $TRIGGER_KEYWORD appears, quote this line literally:

RESULT_BODY:project-wins
EOF

# ---------------------------------------------------------------------------
# Invoke claude inside the project root
# ---------------------------------------------------------------------------
PROMPT="Trigger keyword: $TRIGGER_KEYWORD. Quote the literal RESULT_BODY: line you found in the matched SKILL.md and only that line — no commentary, no markdown."

RAW_RESPONSE=$(
  cd "$PROJECT_ROOT" && \
  claude -p "$PROMPT" \
    --session-id "$SESSION_ID" \
    --output-format json 2>/dev/null \
  || true
)

# Parse .result via jq; fallback to raw text if jq fails to parse
RESULT_TEXT=""
if command -v jq >/dev/null 2>&1; then
  RESULT_TEXT="$(printf '%s' "$RAW_RESPONSE" | jq -r '.result // empty' 2>/dev/null || true)"
fi
if [ -z "$RESULT_TEXT" ]; then
  RESULT_TEXT="$RAW_RESPONSE"
fi

# ---------------------------------------------------------------------------
# Verdict
# ---------------------------------------------------------------------------
if printf '%s' "$RESULT_TEXT" | grep -q 'RESULT_BODY:project-wins'; then
  printf 'PASS\n'
  printf 'precedence-probe: project SKILL.md wins (G6 holds — install-global.sh safe to ship)\n'
  exit 0
elif printf '%s' "$RESULT_TEXT" | grep -q 'RESULT_BODY:global-wins'; then
  printf 'INCONCLUSIVE: precedence inverts (global wins)\n'
  printf 'precedence-probe: global SKILL.md won — spec §8.1 must change before merge.\n'
  printf 'Response was:\n%s\n' "$RESULT_TEXT" >&2
  exit 2
else
  printf 'INCONCLUSIVE: no skill activated\n'
  printf 'precedence-probe: neither RESULT_BODY line cited (synthesis or no-skill path).\n'
  printf 'Response was:\n%s\n' "$RESULT_TEXT" >&2
  exit 3
fi
