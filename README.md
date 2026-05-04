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
5. Install external dependencies: run `bash /tmp/kzk-harness/install/dependencies.sh "$(pwd)"`. The script auto-installs `code-review-graph` (pip --user → pipx fallback) and `codex` CLI (npm → brew fallback), detects `gh` and `aws-vault`, and emits a summary listing the Claude Code plugins (`oh-my-claudecode`, `playwright-mcp`) that must be installed via `/plugin` inside a Claude Code session. The script never hard-fails — every skill has a documented fallback when a dep is missing. See `install/dependencies.md` for the full list and per-skill behavior.
6. rm -rf /tmp/kzk-harness
```

## Update

Re-paste the install command. Skills with a higher version overwrite existing ones. Locally bumped versions are preserved.

## Usage — starting a new feature

Skills load when you say their trigger keyword in chat. You don't `/invoke` anything — just describe the work and the relevant skill activates. The flow below is the canonical end-to-end shape for a non-trivial feature (≥ 3 files or ≥ 200 LoC). For a trivial fix, jump straight to step 6.

1. **Write the spec.** "이 기능 spec 좀 잡자: <one-paragraph description>". The phrase `spec draft` (or `plan draft`) auto-loads `kzk-codex-cross-verification`. The skill drafts the spec, sends it to the codex CLI for cross-vendor review, synthesizes the verdict, and saves it to `docs/research/codex-reviews/<topic>-critic-review.md`. You see a 🔴/🟡/⚪ bucketed summary; revise until you accept it.

2. **Survey the codebase.** "이 spec 들어가기 전에 codebase survey 한 번 돌려줘". `kzk-codebase-survey` runs Step 0.5 + Steps 1–8 — scope expansion via `code-review-graph` MCP/CLI (or grep fallback), parallel deep read, library doc fetch via context7, type-contract scan, env-var scan. Report saves to `docs/harness/surveys/YYYY-MM-DD-<topic>-survey.md`.

3. **Write the plan.** "plan 작성해줘 — survey report은 docs/harness/surveys/...". This auto-loads `kzk-large-task-delegation`'s pre-implementation plan-critic loop: opus planner drafts the plan, then a parallel codex CLI consult + critic agent review. Halt + queue if 2 consecutive critic FAILs. Plan freezes after a clean review pass.

4. **Branch + dispatch.** Switch to `feature/<topic>` (NEVER edit on `main`). Say "ok 이대로 ralph로 돌려" or "executor에게 넘겨" — `kzk-large-task-delegation` dispatches a sonnet executor subagent with the frozen plan + survey report + Gate 0–4 instructions in the prompt.

5. **Autonomous run (optional).** Phrases like "끝까지 끝내줘", "자는 동안 진행해" trigger `kzk-autonomous-boundary`. The loop continues until completion, halts on (a) ≥ 3 reviewer FAILs, (b) destructive op without ok-sign, (c) `kzk-tool-retry` exhausted. Halts append to `docs/harness/user-queue.md` for you to resolve when you return. Rate-limit / context-80% / multi-plan continuation handled by `kzk-autonomous-loop` (sleep + ScheduleWakeup, then resume).

6. **Commit.** Saying "commit" loads `kzk-pre-commit-gate`. The skill runs up to 6 gates per commit batch — Gate 0 (AGENTS.md sync, conditional), Gate 1 (secrets scan), Gate 1.5 (lint/typecheck), Gate 2 (build), Gate 3 (tests), Gate 4 (Playwright smoke if UI changed via `kzk-playwright-verification`). Each commit message ends with the gate-PASS line consumed by `kzk-pre-merge-sync`.

7. **PR + merge.** "PR 올려줘" loads `kzk-pre-merge-sync`. Runs `/oh-my-claudecode:deepinit` to refresh AGENTS.md/CLAUDE.md against the final feature-branch tip, then `gh pr create` with the gate-PASS footer. **You** approve the merge — explicit "merge it" required. The autonomous loop will not merge to `main` on its own.

The skills cross-reference each other; you don't have to memorize the whole chain. Trigger keywords are listed in the table below.

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
| `kzk-production-access` | AWS, SSM, DB, production, credential, destructive, AKIA, ASIA, aws-vault |
| `kzk-test-coverage` | session close, coverage gap, touched files |
| `kzk-tool-retry` | Edit fail, Write fail, File has not been read yet |
| `kzk-user-queue` | ambiguous decision, user returns, queue review |
| `kzk-web-loop` | web loop, 웹 루프, 자율 개선, loop forever, 무한 개선, 무한 루프, 계속 돌려 |
| `kzk-codebase-survey` | codebase survey, 코드베이스 탐색, deep explore, survey first, before planning |

## harness-share.md

Also installed: `harness-share.md` — a portable workflow guide covering the full 6-gate pre-commit flow (Gate 0 conditional on AGENTS.md hierarchy), autonomous mode rules, session tracking, and more. Referenced by the skills as a shared source of truth.

## License

MIT
