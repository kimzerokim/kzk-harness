# kzk-harness

Workflow skill layer for [Claude Code](https://claude.ai/code). Installs 14 `kzk-*` skills into any project — commit gates, autonomous mode boundaries, Playwright verification, large task delegation, and more.

Each skill is a markdown file loaded by Claude when you mention its trigger keyword. No runtime, no config files, no build step.

## Install

Open Claude Code in any directory, paste this prompt, and answer the one question. Works for first-time install and re-install.

```
kzk-harness 설치해줘.

먼저 사용자에게 묻기: "GLOBAL 설치 (권장: ~/.claude/skills/ 에 설치, 모든 Claude Code 세션에서 자동 활성) vs PROJECT-ONLY 설치 (현 디렉토리의 .claude/skills/ 에만, 다른 프로젝트 영향 X) — 어느 쪽?"

답이 GLOBAL (default 권장) 이면:
  git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
  bash /tmp/kzk-harness/install/install-global.sh
  rm -rf /tmp/kzk-harness

답이 PROJECT-ONLY 면:
  1. 현 디렉토리가 project root 인지 verify (CLAUDE.md 존재 OR git repo). 아니면 abort: "kzk-harness must be installed from a project root directory."
  2. git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
  3. /tmp/kzk-harness/skills/kzk-* 각각의 SKILL.md 를 .claude/skills/<name>/ 로 sync. Version-aware: 두 frontmatter 의 `version:` 비교 — source ≥ target 또는 target 없으면 overwrite, target > source 면 preserve + log "skipped <name> — local v<X> > source v<Y>"
  4. .claude/skills/kzk-* 중 source 에 없는 것 (rename / removed) 한 번에 사용자에게 묻고 yes 면 삭제
  5. /tmp/kzk-harness/harness-share.md 를 project root 에 복사 (overwrite — version field 없음, source 가 single canonical)
  6. CLAUDE.md 의 `## Active Skills (kzk-harness)` 섹션 refresh (없으면 H1 뒤 append). 다른 섹션 손대지 X. 새 표는 source 의 kzk-* 각각에 대해 SKILL.md frontmatter 의 name + description "Required triggers:" 부분 추출
  7. bash /tmp/kzk-harness/install/dependencies.sh "$(pwd)"
  8. rm -rf /tmp/kzk-harness
```

**Why global is recommended** — install once, every Claude Code session in any directory auto-activates. No per-project migration. Update with one command. No config files accumulate inside project trees. The 14 skill `.md` files live in `~/.claude/skills/kzk-*` (auto-loaded), the umbrella `harness-share.md` lives in `~/.claude/skills/.kzk-harness-shared/` (dot-prefix prevents Claude from treating it as an invocable skill), and a clearly-marked block in `~/.claude/CLAUDE.md` carries the routing table. Outside that block, your existing `~/.claude/CLAUDE.md` is left byte-for-byte identical.

**Project artifacts** (`harness-flow-progress.md`, `docs/harness/`, `docs/plans/`, `.web-loop/`, `.omc/`, `docs/research/codex-reviews/`) always stay in `$PWD` per spec §6.2 — the install never writes outside `~/.claude/` (global mode) or outside the project root (project-only mode).

**External dependencies** (auto-installed by `dependencies.sh` for both modes): `code-review-graph` (pip --user → pipx fallback), `codex` CLI (npm → brew fallback), `gh` and `aws-vault` (detected only). Claude Code plugins (`oh-my-claudecode`, `playwright-mcp`) detected via `~/.claude/plugins/installed_plugins.json` and `~/.claude.json` — missing plugins emit the `/plugin` install command. Never hard-fails. See `install/dependencies.md` for per-skill fallback behavior.

**code-review-graph indexing is per-project.** The binary is installed once globally (or per Python env), but the SQLite knowledge graph is built per project root on first `kzk-codebase-survey` trigger (or via `bash install/dependencies.sh "$(pwd)"` from that project — the first arg is the project root the build runs in). The global install runs `--skip-project` and never builds a graph; each project bootstraps its own index.

## Update

Re-run the install one-liner above (`install-global.sh` is idempotent — version-aware overwrite).
Or, from a permanent checkout:

```
cd /path/to/kzk-harness && git pull && bash install/install-global.sh --update
```

## Uninstall

```
bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh
```

Removes the marker block from `~/.claude/CLAUDE.md`, deletes `~/.claude/skills/kzk-*` and `~/.claude/skills/.kzk-harness-shared/`. Per-project artifacts (`harness-flow-progress.md`, `.web-loop/`, etc.) are left untouched — pass `--purge-project-artifacts <path>` to opt-in clean a specific repo.

External dependencies (codex CLI, code-review-graph) are not auto-removed since other tools may use them. Manual removal: `pip uninstall code-review-graph`, `npm uninstall -g @openai/codex`.

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
