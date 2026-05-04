# kzk-harness external dependencies

Authoritative list of every external tool the 17 `kzk-*` skills depend on, why, and the fallback behavior when missing.

`install/dependencies.sh` auto-installs what can be installed from a shell. The Claude Code plugin entries (oh-my-claudecode, playwright-mcp) must be installed inside a Claude Code session via `/plugin` — they cannot be installed from a shell script.

The skills are designed to degrade gracefully: if a dependency is missing, the relevant skill takes a documented fallback path. Nothing in the install flow is hard-fail.

## Auto-installable (handled by `install/dependencies.sh`)

### code-review-graph (recommended)

- **Purpose**: Tree-sitter + SQLite knowledge graph of the codebase for blast-radius analysis and scope expansion.
- **Used by**: `kzk-codebase-survey` Steps 0.5, 1, 2 (prefers MCP tools when registered — see the skill's `## MCP tool surface` section).
- **Install**: `python3 -m pip install --user code-review-graph` then `code-review-graph install` and `code-review-graph build` (per project).
- **Fallback if missing**: `kzk-codebase-survey` switches to grep-based scope expansion. Survey still produces a report, just less precise on transitive imports / reverse deps.
- **PEP 668 fallback**: `pipx install code-review-graph`.
- **Side effects of `code-review-graph install`**: registers itself as an MCP server across multiple AI editors. Creates: `.mcp.json`, `.claude/` (settings + skills slot), `.cursor/mcp.json`, `.kiro/`, `.cursorrules`, `.opencode.json`, `.windsurfrules`, `AGENTS.md`, `GEMINI.md`. Also appends an "MCP Tools: code-review-graph" usage block to `CLAUDE.md`. The kzk-harness repo's `.gitignore` excludes these artifacts because the harness itself is not a downstream consumer; adopting projects can keep the MCP registration to give Claude Code direct access to graph tools (preferred path in `kzk-codebase-survey`).

### codex CLI (recommended)

- **Purpose**: Cross-vendor second opinion on plans / specs / architecture (different model family from Claude → catches different blind spots).
- **Used by**: `kzk-spec-and-review` (primary), `kzk-large-task-delegation` (plan-critic loop).
- **Install**: `npm install -g @openai/codex` (npm path) or `brew install codex` (Homebrew path).
- **Fallback if missing**: Skills fall back to `Agent(subagent_type="oh-my-claudecode:critic", model="opus", ...)`. Same review structure, just same-vendor (Claude opus reviewing Claude opus).

## Detected only (manual install — too heavy or environment-specific to auto-install)

### gh CLI (required for PR workflow)

- **Purpose**: GitHub PR creation, status checks, comment fetch.
- **Used by**: `kzk-pre-merge-sync`, `kzk-autonomous-boundary` (PR-creation step in autonomous mode).
- **Install**: `brew install gh` (macOS) / `sudo apt install gh` (Debian) / see https://cli.github.com/.
- **Fallback if missing**: None — PR workflow halts. User must create PR manually or install `gh`.

### aws-vault (optional)

- **Purpose**: STS-backed AWS credential vault — keeps permanent IAM keys (`AKIA*`) out of plaintext.
- **Used by**: `kzk-production-access` recommends it whenever AWS access is needed.
- **Install**: `brew install aws-vault`.
- **Fallback if missing**: User must use `aws sso login` / 1Password CLI / equivalent. `kzk-production-access` will refuse plaintext permanent IAM keys.

## Claude Code plugin dependencies (detected only — manual install via `/plugin`)

These are Claude Code plugins, installed from inside a Claude Code session — `/plugin` slash command. The shell installer cannot install them, but it does **detect** whether they are already present and reports `installed (version X)` vs `NOT DETECTED`.

Detection sources:
- **oh-my-claudecode**: `~/.claude/plugins/installed_plugins.json` — checked via `jq` for any key matching `oh-my-claudecode@*`.
- **playwright-mcp**: scans `~/.claude.json` (user-level) and `<project>/.mcp.json` (project-level) for an MCP server entry containing `"playwright"` and `@playwright/mcp`.

### oh-my-claudecode (OMC) — recommended

- **Purpose**: Provides specialized subagents (`critic`, `executor`, `verifier`, `planner`, `architect`, `code-reviewer`, `document-specialist`), `deepinit_manifest` tool, `ToolSearch` deferred-tool helper, and the `/oh-my-claudecode:*` skill suite.
- **Used by**: `kzk-large-task-delegation` (subagent dispatch), `kzk-pre-commit-gate` (Gate 0 deepinit_manifest, reviewer agents), `kzk-spec-and-review` (critic fallback), `kzk-pre-merge-sync` (deepinit), `kzk-test-coverage` (verifier).
- **Install**: in a Claude Code session, run `/plugin` and install `oh-my-claudecode`. Or follow https://github.com/kimzerokim/oh-my-claudecode.
- **Fallback if missing**: 
  - `deepinit_manifest` tool unavailable → `kzk-pre-commit-gate` Gate 0 skips the manifest baseline (still passes on AGENTS.md edits).
  - Reviewer agents unavailable → no automatic critic; user must run reviews manually.
  - Codex fallback unavailable → if codex CLI is also missing, `kzk-spec-and-review` halts with "no reviewer available".

### gstack (recommended)

- **Purpose**: Project learnings storage (JSONL) for regression memory recall. The `/learn` skill manages learnings; the hook reads JSONL files directly.
- **Used by**: `kzk-regression-memory` (recall hook reads `~/.gstack/projects/<slug>/learnings.jsonl`), `kzk-web-loop` (cycle retrospective via `/learn` skill).
- **Install**: `/plugin` inside a Claude Code session — search for `gstack`.
- **Fallback if missing**: `kzk-regression-memory` recall returns 0 results. Sidecar-only mode. Cycle retrospective entries are not persisted to gstack learnings.
- **Detection**: `~/.gstack/projects/` directory existence.

### playwright-mcp — required for kzk-web-loop, recommended for Gate 4

- **Purpose**: Browser automation MCP tools (`browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, etc.).
- **Used by**: `kzk-playwright-verification` (Gate 4 browser smoke), `kzk-web-loop` (loop core navigation + screenshot drop).
- **Install**: in a Claude Code session, run `/plugin` and install `playwright-mcp`. Or run `claude mcp add playwright -- npx -y @playwright/mcp@latest`.
- **Fallback if missing**: 
  - `kzk-playwright-verification` Gate 4: skipped with a logged note. Gate 4 is conditional on UI-touching changes; non-UI commits still pass.
  - `kzk-web-loop`: cannot run. Loop start halts with "playwright MCP unavailable — install via /plugin".

## Per-skill dependency matrix

| Skill | Hard deps | Soft deps (degrades gracefully) |
|---|---|---|
| `kzk-pre-commit-gate` | git | OMC (`deepinit_manifest`, reviewer agents) |
| `kzk-large-task-delegation` | — | OMC (subagents), codex CLI (plan-critic loop) |
| `kzk-playwright-verification` | — | playwright-mcp |
| `kzk-autonomous-boundary` | git | — |
| `kzk-autonomous-loop` | — | — (uses ScheduleWakeup, built-in) |
| `kzk-background-monitoring` | — | — (uses Monitor, built-in) |
| `kzk-spec-and-review` | — | codex CLI OR OMC (`critic` agent — at least one required) |
| `kzk-pre-merge-sync` | git, gh | OMC (`deepinit` skill) |
| `kzk-production-access` | — | aws-vault |
| `kzk-test-coverage` | — | OMC (`verifier`) |
| `kzk-tool-retry` | — | — |
| `kzk-user-queue` | — | — |
| `kzk-web-loop` | playwright-mcp | code-review-graph (via `kzk-codebase-survey`), gstack (cycle retro `/learn` skill) |
| `kzk-codebase-survey` | — | code-review-graph |
| `kzk-regression-memory` | — | gstack plugin (`~/.gstack/projects/` JSONL) |
| `kzk-freshness-guard` | code-review-graph (required, WARN on missing) | crg-utils.mjs (shared lib) |

## Manual smoke test — `--skip-project` flag

```bash
# Assert build SKIPPED line appears and "Building code-review-graph" does NOT:
bash /path/to/kzk-harness/install/dependencies.sh --skip-project 2>&1 \
  | grep -q 'build SKIPPED (--skip-project' && echo PASS || echo FAIL

# Assert codex/code-review-graph binary install is still attempted (not skipped):
bash /path/to/kzk-harness/install/dependencies.sh --skip-project 2>&1 \
  | grep -qE 'code-review-graph: (already installed|installed via|SKIPPED .pip)' && echo PASS || echo FAIL

# Positional path + flag (flag must win — build still SKIPPED):
bash /path/to/kzk-harness/install/dependencies.sh /tmp --skip-project 2>&1 \
  | grep -q 'build SKIPPED (--skip-project' && echo PASS || echo FAIL

# Flag first, path second (flag must win):
bash /path/to/kzk-harness/install/dependencies.sh --skip-project /tmp 2>&1 \
  | grep -q 'build SKIPPED (--skip-project' && echo PASS || echo FAIL
```

## Re-running the installer

Idempotent. Re-run after:
- adding `code-review-graph` or `codex` post-install (script will skip if already present)
- moving to a new project root (the script's first arg is the project root for the `code-review-graph build` step; default is `$(pwd)`)

```bash
bash /path/to/kzk-harness/install/dependencies.sh /path/to/your/project
```
