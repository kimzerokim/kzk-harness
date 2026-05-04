# kzk-harness

Workflow skill layer for [Claude Code](https://claude.ai/code). Installs 14 `kzk-*` skills into any project — commit gates, autonomous mode boundaries, Playwright verification, large task delegation, and more.

Each skill is a markdown file loaded by Claude when you mention its trigger keyword. No runtime, no config files, no build step.

## Install

Open Claude Code in your project root and paste:

```
Install kzk-harness: first verify the current directory is a project (has CLAUDE.md or is a git repository) — if not, abort with "kzk-harness must be installed from a project root directory."

Then:
1. git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
2. **Sync skills (handles new installs, version bumps, AND renames/removals).**
   - For each skill in /tmp/kzk-harness/skills/: copy to .claude/skills/<name>/SKILL.md. Version check: read the `version:` field in the frontmatter of both the source and any existing target. Overwrite if source version is higher OR if target does not exist. If target version is HIGHER than source (locally bumped), preserve and log "skipped <name> — local v<X> > source v<Y>".
   - After copying, scan .claude/skills/ for any existing `kzk-*` directory whose name is NOT present in /tmp/kzk-harness/skills/ — those are renamed-away or removed-upstream. List them to the user once with the message "These local kzk-* skills are no longer in the source repo (renamed or removed): <list>. Delete?" and delete on yes.
3. Copy /tmp/kzk-harness/harness-share.md to the project root (always overwrite — this file has no version field; source is the single canonical version).
4. **Refresh CLAUDE.md skills section (handles renames + trigger updates).** If CLAUDE.md does not exist, create it. Read CLAUDE.md. If `## Active Skills (kzk-harness)` exists, REPLACE the entire section (heading + table, up to the next `##` heading or end-of-file) with a fresh table listing all kzk-* skills currently in /tmp/kzk-harness/skills/ — for each, read its SKILL.md frontmatter and extract the `name:` and the trigger keywords from `description:` (the comma-separated list following "Required triggers:" or all keywords listed for that skill). If the section does not exist, append it after the H1. Do not modify any other section of CLAUDE.md.
5. Install external dependencies: run `bash /tmp/kzk-harness/install/dependencies.sh "$(pwd)"`. The script auto-installs `code-review-graph` (pip --user → pipx fallback) and `codex` CLI (npm → brew fallback), detects `gh` and `aws-vault`, and detects the Claude Code plugins (`oh-my-claudecode` via `~/.claude/plugins/installed_plugins.json`, `playwright-mcp` via `~/.claude.json` / `<project>/.mcp.json` MCP server entries) — if either plugin is missing, the script emits the `/plugin` install command instead. Never hard-fails. See `install/dependencies.md` for per-skill fallback behavior.
6. rm -rf /tmp/kzk-harness
```

## Update

Re-paste the install command. On re-run:
- Skills with a higher source version overwrite existing ones; locally bumped versions are preserved.
- `harness-share.md` is always overwritten with the source version.
- The `## Active Skills (kzk-harness)` section in CLAUDE.md is replaced with a fresh table reflecting renames and trigger updates.
- Stale `kzk-*` skills (renamed-away or removed-upstream) are listed for confirmation and deleted on yes.
- External dependencies (`install/dependencies.sh`) re-run is idempotent — already-installed deps are detected only.

## Usage — starting a new feature

Skills load when you say their trigger keyword in chat. You don't `/invoke` anything — just describe the work and the relevant skill activates. The flow below is the canonical end-to-end shape for a non-trivial feature (≥ 3 files or ≥ 200 LoC). For a trivial fix, jump straight to step 5.

1. **Write the spec.** "이 기능 spec 좀 잡자: <one-paragraph description>". The phrase `spec 잡자` / `spec draft` (or `plan draft`) auto-loads `kzk-spec-and-review`. The skill enforces a Step 0 precondition: if no codebase survey report exists for the topic in `docs/harness/surveys/` (or the latest is > 7 days old / stale per git history), it auto-triggers `kzk-codebase-survey` first — Step 0.5 + Steps 1–8 (scope expansion via `code-review-graph` MCP/CLI or grep fallback, parallel deep read, library doc fetch via context7, type-contract scan, env-var scan). The survey report path is then cited in the draft prompt as "Required reading" before draft begins. After the draft, the skill sends it to the codex CLI for cross-vendor review (or `oh-my-claudecode:critic` opus fallback), synthesizes the verdict, and saves it to `docs/research/codex-reviews/<topic>-critic-review.md`. You see a 🔴/🟡/⚪ bucketed summary; revise until you accept it.

2. **Write the plan.** "plan 작성해줘". This re-enters `kzk-spec-and-review` (the same Step 0 → 1–3 loop applies to plans) with the survey report from Step 1 reused if still fresh. Output: `docs/plans/<topic>.md` with codex review at `docs/plans/<topic>-critic-review.md`. For multi-task plans that feed sonnet executors, `kzk-large-task-delegation`'s narrower in-skill plan-critic loop also triggers — same opus planner + parallel codex consult + critic. Halt + queue on 2 consecutive critic FAILs. Plan freezes after a clean review pass.

3. **Branch + dispatch.** Switch to `feature/<topic>` (NEVER edit on `main`). Say "ok 이대로 ralph로 돌려" or "executor에게 넘겨" — `kzk-large-task-delegation` dispatches a sonnet executor subagent with the frozen plan + survey report + Gate 0–4 instructions in the prompt.

4. **Autonomous run (optional).** Phrases like "끝까지 끝내줘", "자는 동안 진행해" trigger `kzk-autonomous-boundary`. The loop continues until completion, halts on (a) ≥ 2 consecutive reviewer/critic FAILs OR ≥ 3 consecutive build/test FAILs on the same area, (b) destructive op without ok-sign, (c) `kzk-tool-retry` exhausted. Halts append to `docs/harness/user-queue.md` for you to resolve when you return. Rate-limit / context-80% / multi-plan continuation handled by `kzk-autonomous-loop` (sleep + ScheduleWakeup, then resume).

5. **Commit.** Saying "commit" loads `kzk-pre-commit-gate`. The skill runs up to 6 gates per commit batch — Gate 0 (AGENTS.md sync, conditional), Gate 1 (ai-slop-cleaner), Gate 1.5 (secrets scan), Gate 2 (build), Gate 3 (tests), Gate 4 (Playwright UI smoke if UI changed via `kzk-playwright-verification`). Each commit message ends with the gate-PASS line consumed by `kzk-pre-merge-sync`.

6. **PR + merge.** "PR 올려줘" loads `kzk-pre-merge-sync`. Runs `/oh-my-claudecode:deepinit` to refresh AGENTS.md/CLAUDE.md against the final feature-branch tip, then `gh pr create` with the gate-PASS footer. **You** approve the merge — explicit "merge it" required. The autonomous loop will not merge to `main` on its own.

The skills cross-reference each other; you don't have to memorize the whole chain. Trigger keywords are listed in the table below.

## Skills

| Skill | Trigger keywords |
|---|---|
| `kzk-pre-commit-gate` | commit, pre-commit, Gate 0/1/1.5/2/3/4, AGENTS.md sync, secrets scan, doc-only |
| `kzk-large-task-delegation` | 3+ file edits, 200+ LoC, subagent dispatch, opus/sonnet routing, read-heavy audit, spec 검증, 버그 전수조사, 마무리 해줘, 전수 검토, 끝내줘 |
| `kzk-playwright-verification` | Playwright, Gate 4, browser_navigate, screenshot, MCP drop |
| `kzk-autonomous-boundary` | ralph, ralph로 체크, ralph로 확인, autonomous mode, halt condition, main branch boundary |
| `kzk-autonomous-loop` | rate limit, context 80%, multi-plan continuation |
| `kzk-background-monitoring` | run_in_background, Monitor, long-running, build, install |
| `kzk-spec-and-review` | spec 잡자/작성, plan 작성, spec/plan/design draft, major design, architecture review, codex review, cross-verify |
| `kzk-pre-merge-sync` | merge, feature branch, CLAUDE.md sync, deepinit |
| `kzk-production-access` | AWS, SSM, DB, production, credential, destructive, AKIA, ASIA, aws-vault |
| `kzk-test-coverage` | session close, coverage gap, touched files |
| `kzk-tool-retry` | Edit fail, Write fail, File has not been read yet |
| `kzk-user-queue` | ambiguous decision, user returns, queue review |
| `kzk-web-loop` | web loop, 웹 루프, 자율 개선, loop forever, 무한 개선, 무한 루프, 계속 돌려 |
| `kzk-codebase-survey` | codebase survey, 코드베이스 탐색, deep explore, survey first, before planning, 구현 검증, spec verification, 버그 전수조사, spec 체크, 스펙 체크, 하나하나 확인, ralph로 체크 |

## harness-share.md

Also installed: `harness-share.md` — a portable workflow guide covering the full 6-gate pre-commit flow (Gate 0 conditional on AGENTS.md hierarchy), autonomous mode rules, session tracking, and more. Referenced by the skills as a shared source of truth.

## License

MIT
