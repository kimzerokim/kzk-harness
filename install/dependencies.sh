#!/usr/bin/env bash
# kzk-harness external dependency installer.
#
# Detects each dependency and installs what can be installed automatically.
# Never hard-fails — every kzk-* skill has a documented fallback (grep for
# code-review-graph, oh-my-claudecode:critic for codex CLI, etc.).
#
# Run from any directory. Idempotent. Re-running only acts on missing deps.
#
# Authoritative dep list: install/dependencies.md (in the kzk-harness repo).

set -u

PROJECT_ROOT="${1:-$(pwd)}"
SUMMARY=()

emit() { printf '%s\n' "$*"; }
record() { SUMMARY+=("$1"); }

# Ensure ~/.local/bin is on PATH for pip --user installs in this script's lifetime
mkdir -p "$HOME/.local/bin"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) export PATH="$HOME/.local/bin:$PATH" ;;
esac

emit "kzk-harness: installing external dependencies (project: $PROJECT_ROOT)"
emit ""

# ---------------------------------------------------------------------------
# 1. code-review-graph (Python) — used by kzk-codebase-survey Step 0.5/1
# ---------------------------------------------------------------------------
if command -v code-review-graph >/dev/null 2>&1; then
  record "code-review-graph: already installed ($(code-review-graph --version 2>/dev/null || echo 'version unknown'))"
else
  emit "[1/2] code-review-graph not found — attempting install..."
  installed=0

  if command -v python3 >/dev/null 2>&1; then
    if python3 -m pip install --user code-review-graph 2>/tmp/kzk-crg-pip.log; then
      installed=1
      record "code-review-graph: installed via 'python3 -m pip install --user'"
    fi
  fi

  if [ "$installed" -eq 0 ] && command -v pipx >/dev/null 2>&1; then
    if pipx install code-review-graph 2>/tmp/kzk-crg-pipx.log; then
      installed=1
      record "code-review-graph: installed via pipx"
    fi
  fi

  if [ "$installed" -eq 0 ]; then
    record "code-review-graph: SKIPPED (pip & pipx both failed or unavailable). kzk-codebase-survey will fall back to grep. Manual install: 'pipx install code-review-graph' (or python3 -m pip install --user code-review-graph)."
  else
    # First-time setup: download tree-sitter grammars etc.
    code-review-graph install >/dev/null 2>&1 || true
  fi
fi

# Build the graph for this project (background — does not block install completion)
if command -v code-review-graph >/dev/null 2>&1 && [ -d "$PROJECT_ROOT" ]; then
  emit "Building code-review-graph index for $PROJECT_ROOT (background)..."
  ( cd "$PROJECT_ROOT" && code-review-graph build >/tmp/kzk-crg-build.log 2>&1 & )
  record "code-review-graph: build started in background (log: /tmp/kzk-crg-build.log)"
fi

# ---------------------------------------------------------------------------
# 2. codex CLI (OpenAI) — used by kzk-codex-cross-verification, kzk-large-task-delegation
# ---------------------------------------------------------------------------
if command -v codex >/dev/null 2>&1; then
  record "codex CLI: already installed ($(codex --version 2>/dev/null || echo 'version unknown'))"
else
  emit "[2/2] codex CLI not found — attempting install..."
  installed=0

  if command -v npm >/dev/null 2>&1; then
    if npm install -g @openai/codex 2>/tmp/kzk-codex-npm.log; then
      installed=1
      record "codex CLI: installed via 'npm install -g @openai/codex'"
    fi
  fi

  if [ "$installed" -eq 0 ] && command -v brew >/dev/null 2>&1; then
    if brew install codex 2>/tmp/kzk-codex-brew.log; then
      installed=1
      record "codex CLI: installed via 'brew install codex'"
    fi
  fi

  if [ "$installed" -eq 0 ]; then
    record "codex CLI: SKIPPED (npm & brew both failed or unavailable). kzk-codex-cross-verification will fall back to oh-my-claudecode:critic agent. Manual install: 'npm i -g @openai/codex' or 'brew install codex'."
  fi
fi

# ---------------------------------------------------------------------------
# 3. gh CLI (GitHub) — used by kzk-pre-merge-sync (PR creation)
# ---------------------------------------------------------------------------
if command -v gh >/dev/null 2>&1; then
  record "gh CLI: already installed"
else
  record "gh CLI: NOT INSTALLED. kzk-pre-merge-sync requires it for 'gh pr create'. Install: 'brew install gh' (macOS) / 'sudo apt install gh' (Debian) / see https://cli.github.com/."
fi

# ---------------------------------------------------------------------------
# 4. aws-vault (optional, only if using kzk-production-access for AWS work)
# ---------------------------------------------------------------------------
if command -v aws-vault >/dev/null 2>&1; then
  record "aws-vault: already installed"
else
  record "aws-vault: NOT INSTALLED (optional — only needed for kzk-production-access AWS workflows). Install: 'brew install aws-vault'."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
emit ""
emit "=== kzk-harness dependency install summary ==="
for line in "${SUMMARY[@]}"; do
  emit "  - $line"
done
emit ""
emit "Claude Code plugin dependencies (install in a Claude Code session via /plugin — cannot be automated from shell):"
emit "  - oh-my-claudecode (recommended)  — provides critic/executor/verifier agents, deepinit_manifest tool, ToolSearch helpers."
emit "  - playwright-mcp (kzk-web-loop required) — provides browser_navigate/screenshot MCP tools for Gate 4 + web loop."
emit ""
emit "See install/dependencies.md in the kzk-harness repo for the authoritative list and per-skill fallback behavior."
