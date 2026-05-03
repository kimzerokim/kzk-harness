# kzk-harness

Workflow skill layer for [Claude Code](https://claude.ai/code). Installs 14 `kzk-*` skills into any project — commit gates, autonomous mode boundaries, Playwright verification, large task delegation, and more.

Each skill is a markdown file loaded by Claude when you mention its trigger keyword. No runtime, no config files, no build step.

## Install

Open Claude Code in your project root and paste:

```
Install kzk-harness: first verify the current directory is a project (has CLAUDE.md or is a git repository) — if not, abort with "kzk-harness must be installed from a project root directory."

Then:
1. git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
2. For each skill in /tmp/kzk-harness/skills/: copy to .claude/skills/<name>/SKILL.md. Version check: read the `version:` field in the frontmatter of both the source and any existing target. Only overwrite if source version is higher (or target does not exist).
3. Copy /tmp/kzk-harness/harness-share.md to the project root (overwrite).
4. If CLAUDE.md does not exist, create it. Read CLAUDE.md and add or update an "## Active Skills (kzk-harness)" section listing all 14 kzk-* skills with their trigger keywords (read from each SKILL.md frontmatter description field). Do not modify any other section.
5. Install code-review-graph globally: run `python3 -m pip install --user code-review-graph && code-review-graph install` in the user's home directory. Then run `code-review-graph build` in the project root to build the knowledge graph. If pip is unavailable or PEP 668 blocks it, try `pipx install code-review-graph` as fallback; if both fail, skip and note it.
6. rm -rf /tmp/kzk-harness
```

## Update

Re-paste the install command. Skills with a higher version overwrite existing ones. Locally bumped versions are preserved.

## Skills

| Skill | Trigger keywords |
|---|---|
| `kzk-pre-commit-gate` | commit, pre-commit, Gate 0/1/1.5/2/3/4, AGENTS.md sync, secrets scan, doc-only |
| `kzk-large-task-delegation` | 3+ file edits, 200+ LoC, subagent dispatch, opus/sonnet routing |
| `kzk-playwright-verification` | Playwright, Gate 4, browser_navigate, screenshot, MCP drop |
| `kzk-autonomous-boundary` | ralph, autonomous mode, halt condition, main branch boundary |
| `kzk-autonomous-loop` | rate limit, context 80%, multi-plan continuation |
| `kzk-background-monitoring` | run_in_background, Monitor, long-running, build, install |
| `kzk-codex-cross-verification` | codex review, cross-verify, spec draft, plan draft, major design, architecture review |
| `kzk-pre-merge-sync` | merge, feature branch, CLAUDE.md sync, deepinit |
| `kzk-production-access` | AWS, DB, SSM, production, credential |
| `kzk-test-coverage` | session close, coverage gap, touched files |
| `kzk-tool-retry` | Edit fail, Write fail, File has not been read yet |
| `kzk-user-queue` | ambiguous decision, user returns, queue review |
| `kzk-web-loop` | web loop, 웹 루프, 12시간, 자율 개선, loop forever, 무한 개선 |
| `kzk-codebase-survey` | codebase survey, 코드베이스 탐색, deep explore, survey first, before planning |

## harness-share.md

Also installed: `harness-share.md` — a portable workflow guide covering the full 6-gate pre-commit flow (Gate 0 conditional on AGENTS.md hierarchy), autonomous mode rules, session tracking, and more. Referenced by the skills as a shared source of truth.

## License

MIT
