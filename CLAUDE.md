# kzk-harness

This is the kzk-harness repository — a workflow skill layer for Claude Code. It contains 14 `kzk-*` skills installed into any project via the one-liner in `README.md`.

## Active Skills (kzk-harness)

All 14 skills are active in this repo. Load one by mentioning its trigger keyword.

| Skill | Trigger keywords |
|---|---|
| `kzk-pre-commit-gate` | commit, pre-commit, Gate 0/1/1.5/2/3/4, AGENTS.md sync, secrets scan, doc-only |
| `kzk-large-task-delegation` | 3+ file edits, 200+ LoC, subagent dispatch, opus/sonnet routing |
| `kzk-playwright-verification` | Playwright, Gate 4, browser_navigate, screenshot, MCP drop |
| `kzk-autonomous-boundary` | ralph, autonomous mode, halt condition, main branch boundary |
| `kzk-autonomous-loop` | rate limit, context 80%, multi-plan continuation |
| `kzk-background-monitoring` | run_in_background, Monitor, long-running, build, install |
| `kzk-spec-and-review` | spec 잡자/작성, plan 작성, spec/plan/design draft, major design, architecture review, codex review, cross-verify |
| `kzk-pre-merge-sync` | merge, feature branch, CLAUDE.md sync, deepinit |
| `kzk-production-access` | AWS, SSM, DB, production, credential, destructive, AKIA, ASIA, aws-vault |
| `kzk-test-coverage` | session close, coverage gap, touched files |
| `kzk-tool-retry` | Edit fail, Write fail, File has not been read yet |
| `kzk-user-queue` | ambiguous decision, user returns, queue review |
| `kzk-web-loop` | web loop, 웹 루프, 자율 개선, loop forever, 무한 개선, 무한 루프, 계속 돌려 |
| `kzk-codebase-survey` | codebase survey, 코드베이스 탐색, deep explore, survey first, before planning |

## Autonomous Execution Boundary

Autonomous mode = explicit user permission only. Triggers: "ralph로 돌려", "자는 동안 진행해", "끝까지 끝내줘".

All edits happen on `feature/<topic>` branches. `main` merge requires explicit user "merge it" after review.

## Self-Improvement Loop (kzk-harness specific)

This repo can run its own improvement loop — not web usability, but skill quality.

Trigger: "harness 개선 루프", "스킬 개선해줘", "harness loop"

### Loop structure

Each cycle:
1. **EVALUATOR** (fresh `oh-my-claudecode:critic`, opus) — audits all `skills/*/SKILL.md` files against `harness-share.md` and the spec in `docs/superpowers/specs/` for:
   - **P0**: broken trigger keywords, missing frontmatter, contradictions with harness-share.md
   - **P1**: incomplete failure handling, missing cross-references to sister skills, ambiguous instructions
   - **P2**: outdated version numbers, missing anti-patterns, wording drift across sister skills
2. Pick top issue → **EXECUTOR** (sonnet) implements the fix
3. Update `harness-flow-progress.md` with cycle entry
4. Back to step 1

No-halt policy applies (same as `kzk-web-loop`). Ambiguous decisions → `docs/harness/user-queue.md`.

## Shared Reference

`harness-share.md` — full workflow guide. All skills reference it as authoritative source. Sections:
- §1–§14.5: Core workflow (gates, autonomous mode, rate limit, context, plan continuation)
- §15–§24: Supporting protocols (deepinit, production access, visibility, MCP reconnect, codex review)
- §25: kzk-web-loop autonomous web improvement loop
- §26: kzk-codebase-survey mandatory deep codebase explorer
- §27: kzk-tool-retry tool-failure auto-retry discipline

## External Tools

All external dependencies are installed by `install/dependencies.sh` (run automatically by the README install command). The authoritative list with per-skill fallback behavior lives in `install/dependencies.md`.

Quick reference:
- `code-review-graph` (auto, pip --user → pipx) — Tree-sitter + SQLite knowledge graph. Used by `kzk-codebase-survey` Steps 0.5/1/2. Fallback: grep-based scope expansion.
- `codex` CLI (auto, npm → brew) — cross-vendor second opinion. Used by `kzk-spec-and-review`, `kzk-large-task-delegation`. Fallback: `oh-my-claudecode:critic` opus.
- `gh` CLI (detected only) — required for PR workflow. Install: `brew install gh`.
- `aws-vault` (detected only, optional) — STS-backed AWS credentials. Used by `kzk-production-access`.
- Claude Code plugins (`/plugin` inside a session): `oh-my-claudecode` (subagents, deepinit_manifest), `playwright-mcp` (Gate 4 + web-loop browser MCP).

Re-run after install: `bash /path/to/kzk-harness/install/dependencies.sh "$(pwd)"`.

## Skill Development Rules

When adding or editing skills in this repo:
- Frontmatter: `name`, `version`, `description` (with trigger keywords)
- Authoritative source line: `> Authoritative source: harness-share.md §N. On conflict, that wins.`
- All file paths must be absolute or repo-root relative (no ambiguity)
- Cross-references to sister skills by name, not by description
- Version bump on any functional change (not cosmetic)
- Update `README.md` skills table if adding a new skill
- When adding a new skill, also update the skill count in `CLAUDE.md` line 3, `CLAUDE.md` "All N skills" line, `README.md` line 3, and the `README.md` install command skill count
