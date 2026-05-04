# kzk-harness

This is the kzk-harness repository — a workflow skill layer for Claude Code. It contains 16 `kzk-*` skills installed into any project via the one-liner in `README.md`.

## Active Skills (kzk-harness)

All 16 skills are active in this repo. Load one by mentioning its trigger keyword.

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
| `kzk-regression-memory` | regression memory, 재발 방지, fix 시작, recall, 과거 fix 조회, gstack learn, dismiss recall |
| `kzk-fix-scope-expansion` | fix scope expansion, 한 callsite, 호출자 전수, fix-start, callsite mismatch, Gate 4.5, KZK_GATE45_SKIP |

## Autonomous Execution Boundary

Autonomous mode = explicit user permission only. Triggers: "ralph로 돌려", "자는 동안 진행해", "끝까지 끝내줘".

**Branch contract — ASK FIRST.** Before any autonomous-style flow (or any harness-driven multi-commit task), confirm three slots with the user and wait for explicit answers:

1. Separate branch, or commit directly to current branch?
2. Branch name OK as `<proposed>`? (only if separate branch)
3. PR required, or direct commits without PR?

The answers form the operating contract for the rest of the session. Direct-`main` commits are allowed **only when the user explicitly authorized direct-main flow this session** — never as a silent default. PR is optional, not mandatory. `git push --force` and `git reset --hard` on a pushed branch always require a separate explicit OK regardless of contract.

## Self-Improvement Loop (kzk-harness specific)

This repo can run its own improvement loop — not web usability, but skill quality.

Trigger: "harness 개선 루프", "스킬 개선해줘", "harness loop", "자가개선", "자가개선 돌려줘"

### Loop structure

Each cycle:
1. **EVALUATOR** (fresh `oh-my-claudecode:critic`, opus) — audits all `skills/*/SKILL.md` files against `harness-share.md` and the spec in `docs/superpowers/specs/` for:
   - **P0**: broken trigger keywords, missing frontmatter, contradictions with harness-share.md
   - **P1**: incomplete failure handling, missing cross-references to sister skills, ambiguous instructions
   - **P2**: outdated version numbers, missing anti-patterns, wording drift across sister skills
2. Pick top issue → **EXECUTOR** (sonnet) implements the fix
3. Update `harness-flow-progress.md` with cycle entry
4. Back to step 1

### Self-trigger reminder (메타 갭 방지)

자가개선 루프 진입 시 메인 컨텍스트는 자체 kzk-* 스킬을 적극 호출한다. 다음 매핑이 default:

- **Cycle 진입 전 branch contract 확인** = `kzk-autonomous-boundary §Branch contract — ASK FIRST` (별 branch / 직접 main / branch 이름 / PR 여부 — 사용자 명시 없이 진입 X)
- **Skill-load chain — codebase-survey 트리거 시 large-task-delegation 동반 로드 의무** = `kzk-large-task-delegation §Session-28 lesson` (survey 만 로드하면 메인이 read-heavy audit 직접 수행하는 갭 — 본문 §Operational checks 1–4 점검)
- **EVALUATOR / EXECUTOR dispatch** = `kzk-large-task-delegation §Model routing` (critic opus, executor sonnet)
- **메인이 검증 차원에서 5+ 파일 read 필요 시** = `kzk-large-task-delegation §Read-heavy audit dispatch shape` (메인 직접 read 금지, EXPLORER subagent 위임)
- **메인이 cross-cutting 검증 필요 시** = `kzk-codebase-survey §code-review-graph` (CRG MCP / CLI 우선, grep fallback). 이 레포 자체에 CRG 인덱스 없으면 `code-review-graph build` 부터 — 자기 인프라 부트스트랩 안 한 채 grep 으로 우회하면 메타 갭
- **새 스킬 추가 / 큰 구조 변경 / 글로벌 install 등 메타 작업** = `kzk-spec-and-review` Step 0 (codebase survey 선행) → Step 1–3 (spec → codex 리뷰 → frozen plan)
- **Cycle 끝에서 변경 commit** = `kzk-pre-commit-gate` (Gate 0 conditional + Gate 1.5 secrets) + `kzk-pre-merge-sync` (PR-flow 면 PR 직전, direct-main flow 면 milestone 직전)
- **다중 cycle 자율 실행** = `kzk-autonomous-loop` + `kzk-autonomous-boundary` (rate limit / context 80% / halt 조건)
- **사용자 prompt 가 'plan 쪼개', '사이클 자율', '사용성 버그', '버그 전수조사' 등 large-task signal 포함 시** = `install/hooks/keyword-detector.mjs` (UserPromptSubmit hook, `--enable-hooks` 로 활성화 — 매칭 시 system-reminder 강제 주입)

자가개선 루프가 자기 스킬을 안 쓰는 패턴은 메타 갭 — 즉시 다음 cycle 의 P0 로 처리한다.

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
