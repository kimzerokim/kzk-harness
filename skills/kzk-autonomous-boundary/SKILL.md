---
name: kzk-autonomous-boundary
version: 1.4.0
description: "Autonomous-mode boundary — ASK-FIRST 3-slot branch/PR contract, halt conditions, destructive-op guardrails. Top triggers: 'ralph로 돌려', '자율실행', 'main 직접', '끝까지 끝내줘', 'branch contract'. Body §Triggers for full list."
---

> Authoritative source: repo `CLAUDE.md` "Autonomous Execution Boundary" + `harness-share.md` §2. On conflict, those win.

# kzk-autonomous-boundary

## Triggers

`autonomous`, `ralph로 돌려`, `ralph로 체크`, `ralph로 확인`, `자는 동안 진행`, `실행해놔야 queue 보지`, `끝까지 끝내줘`, `branch contract`, `feature branch boundary`, `main 직접 접근`, `main에 바로 커밋`, `reviewer FAIL`, `자율실행`, `자율 실행`, `자율로 돌려`, `Q-TDD-MAIN`, `Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`, `verifier 2 FAIL`, `verifier consecutive FAIL halt`, `verification thread halt`, `INVALID_VERDICT halt`.

Autonomous mode = explicit user permission only. Triggers: "ralph로 돌려", "자는 동안 진행해", "실행해놔야 queue 보지", "끝까지 끝내줘". No autonomous mode = no auto-commits, no agent dispatch chains.

## Allowed actions (autonomous mode ON)

- Auto-commit after `kzk-pre-commit-gate` full PASS (6 gates if AGENTS.md hierarchy present, otherwise 5; Gate 0 N/A without hierarchy; see that skill)
- Move to next task after TDD test passes
- Worktree parallel execution (`/superpowers:using-git-worktrees`)
- **Subagent dispatch (mandatory for multi-file / 5+ file read / 200+ LoC work)** — `oh-my-claudecode:executor` (sonnet) for implementation, `oh-my-claudecode:explore` (sonnet) for reference collection, `oh-my-claudecode:code-reviewer` / `oh-my-claudecode:critic` / `oh-my-claudecode:verifier` for review. Multi-file / 5+ file read / 200+ LoC 작업은 메인 직접 수행 금지 — 항상 subagent 위임. 메인 직접 허용 범위: 1-2 파일 단순 edit (≤ 30 LoC) 또는 운영 명령 (git status, install, ls) 에 한함.
- Document writing, plan elaboration, review execution

## Branch contract — ASK FIRST (mandatory entry step)

Before entering any autonomous-style flow (`ralph`, `ulw`, `autopilot`, `web-loop`, harness self-improvement, "끝까지 끝내줘", "자는 동안 진행해", "실행해놔야 queue 보지") OR any harness-driven multi-commit task, the agent MUST get an explicit branch contract from the user. Three slots:

1. **Branch destination** — "Make a separate branch, or commit directly to the current branch?"
2. **Branch name** (only if separate branch) — propose a default (e.g., `feature/<topic>`, `harness-test`, `feature/web-loop-<goal-slug>`) and ask "OK as `<proposed>`?"
3. **PR mode** — "PR required, or direct commits without PR?"

Wait for an explicit answer on each slot. The answers become the operating contract for the rest of the session and are recorded in the first session log line. Re-confirm only when scope materially changes (doc-only → code change, single-module → multi-module, low-risk → destructive).

Do NOT silently default to `feature/<topic>`. Do NOT silently default to PR-flow. Do NOT silently default to direct-main. The user picks.

## Forbidden actions (regardless of contract)

- **Direct `main` commits without explicit per-session authorization.** "main에 바로 커밋", "main 직접" or equivalent within the current session = OK. Without that = `main` is off-limits, halt + ask.
- **`git push --force` to a pushed / shared branch** without separate explicit "force push 해줘"
- **`git reset --hard` on a pushed branch** without separate explicit "hard reset 해줘"
- **PR auto-merge** — final merge always waits for explicit user "merge it"
- Auto-overriding user PRD / design docs (must follow Documentation Storage Rules in repo CLAUDE.md)
- Force-commit when a Pre-commit Gate fails
- Adding files outside the declared source root (see CLAUDE.md for your repo's rootDir constraints)
- Continuing the loop after reviewer FAILs **2 times in a row** → halt + user-queue entry
  Exception: `kzk-web-loop` intentionally overrides this — skip the failing issue, pick the next one (see `kzk-web-loop` §Failure Handling and `harness-share.md` §25 "Reviewer FAIL override").

## Halt conditions (entire autonomous run)

Halt and append a user-queue entry when:

- reviewer/critic 2 consecutive FAIL
- build / test 3 consecutive FAIL
- `main` access required for the next step **and** the session contract did not authorize direct-main flow
- A user-queue decision is required to proceed
- Crossing into a code/plan area pre-dating a current rule (e.g. plan written before PRD v1.13) — halt, do NOT retroactively rewrite policy via subagent guess

Anything else → keep going (see `kzk-autonomous-loop` for polite-stop ban).

### Halt conditions table (reason / action / resume schema)

| Trigger | Reason | Action | Resume |
|---|---|---|---|
| `Q-TDD-MAIN` | 자율 mode 의 메인 컨텍스트가 직접 TDD red 단계 진입 시도 (Plan A Layer b cross-ref) | halt + user-queue entry `Q-TDD-MAIN — 자율 cycle 의 메인 직접 TDD 시도, fresh sonnet dispatch 재시작 필요`. 메인 직접 test 작성 즉시 중단. cross-ref: `kzk-test-coverage` §Anti-pattern §자율 mode 메인 직접 TDD 금지 / `kzk-large-task-delegation` §Anti-self-verification boilerplate | fresh sonnet dispatch PASS (test 작성을 subagent 가 수행) 또는 사용자 명시 override (1회만, queue 에 OK 기록) |
| `Q-MAIN-DIRECT-EDIT` | 자율 mode / harness self-improvement / 라이브러리 변경에서 메인 컨텍스트가 직접 Edit/Write 로 코드/스킬 변경 시도 — Q-TDD-MAIN 의 일반화. 신호: 5+ 파일 read 또는 multi-file edit (3+ 파일 / 200+ LoC). | halt + user-queue entry `Q-MAIN-DIRECT-EDIT — 메인 직접 작업 시도, EXPLORER/EXECUTOR subagent dispatch 재시작 필요`. 메인 직접 Edit 즉시 중단. cross-ref: `kzk-large-task-delegation §Anti-pattern §Main direct-edit` / `kzk-codebase-survey §Preparation phase delegation` | fresh executor subagent dispatch PASS 또는 사용자 명시 override (1회만, queue 에 OK 기록) |
| `Q-VERIFIER-FAIL` | `kzk-large-task-delegation` §Stage 3 / `kzk-pre-commit-gate` §Gate 5 의 verifier 가 같은 thread = `(plan_path, acceptance_id, verification_round)` 안에서 2 consecutive FAIL (PARTIAL 2회 같은 지적사항이면 FAIL escalate 포함) | halt + user-queue entry `Q-VERIFIER-FAIL — verifier 2 consecutive FAIL on thread (<plan>:<acceptance_id>:<round>), 사용자 결정 필요 (verifier 지적 무시 / 추가 fix / plan revision)`. commit BLOCK 유지 | PASS 또는 user-approved plan revision (rev bump 명시) — 둘 중 하나만 thread reset |
| `Q-VERIFIER-INVALID` | verifier 응답 첫 줄이 `VERDICT: PASS\|FAIL\|PARTIAL` 정규식 매칭 실패 (prose only, 형식 위반, empty 등) | fail-closed BLOCK + user-queue entry `Q-VERIFIER-INVALID — verifier 응답 형식 위반, 사용자 결정 필요 (manual verify / retry with stricter prompt / plan revision)` | retry verifier (stricter prompt) PASS 또는 사용자 manual verify OK 또는 plan revision |
| `Q-VERIFIER-DISPATCH-FAIL` | verifier subagent dispatch 자체 실패 (no response / timeout / subagent type unavailable) | BLOCK + user-queue entry `Q-VERIFIER-DISPATCH-FAIL — verifier dispatch 실패, fallback path 또는 사용자 직접 review 결정 필요`. fallback: `oh-my-claudecode:code-reviewer` 시도 | fallback PASS 또는 사용자 manual review OK |

### Q-TDD-MAIN 흡수 종료 (Plan A → Plan C cross-ref)

Plan A rev2 frozen 의 follow-up 로 위임된 `Q-TDD-MAIN` cross-ref 등록은 본 Plan C task 3 에서 흡수 완료. **별도 follow-up 없음**. 이후 어떤 plan 도 Q-TDD-MAIN 의 halt 표 등록을 새로 건드리지 않는다 — split-brain 차단. 룰 본문 수정은 `kzk-test-coverage` §Anti-pattern 영역 한정.

## Rollback / revert policy

If the autonomous loop committed code that is later found to be wrong (reviewer FAIL after commit, or test regression discovered in a later cycle):

1. `git revert <sha>` — prefer revert over reset; preserves history
2. Never `git reset --hard` on a pushed branch without explicit user "hard reset it"
3. Append a user-queue entry with: which commit, why reverted, what the correct approach should be
4. Resume the loop from the next issue — do not re-attempt the same issue immediately after revert

## Branch policy detail

- The branch contract is per-session, not hardcoded. Common shapes:
  - PR-flow on `feature/<topic>` (most projects' default)
  - PR-flow on a repo-specific name (`harness-test` for kzk-harness's own self-test convention)
  - Direct-main, no PR (small docs / config sweeps the user explicitly authorized — kzk-harness self-improvement runs in this mode when the user says so)
  - Direct on a non-main feature branch, no PR (long-lived experiment branch)
- Under PR-flow: **One Plan = one PR (no batch).** First plan-direction error → other plans stay protected. PR description must include `CLAUDE.md updated to match current state` + `deepinit ran` lines (see `kzk-pre-merge-sync`).
- Under direct-main / direct-no-PR flow: same atomic-commit discipline applies. `kzk-pre-merge-sync` checks run before user-visible milestone commits (see that skill).

## Interaction with other kzk-*

- **kzk-tool-retry**: When any Edit/Write/Bash fails during autonomous execution, apply 1-retry before halting or queuing. This skill defines halt conditions; kzk-tool-retry defines the single-call retry discipline that runs before those conditions are evaluated.
- **kzk-autonomous-loop**: polite-stop ban and multi-Plan continuation rules. This skill defines what STOPS the loop; that one defines how the loop CONTINUES.
- **kzk-user-queue**: halt conditions that require a user decision append entries here and await a DECISION line before resuming.
- **kzk-test-coverage**: Plan A Layer (b) 자율 mode 메인 직접 TDD 금지 룰의 halt entry (`Q-TDD-MAIN`) 가 본 skill 의 §Halt conditions 표에 등록됨 (Plan C task 3, 흡수 종료).
- **kzk-large-task-delegation / kzk-pre-commit-gate**: Plan C Stage 3 / Gate 5 verifier 관련 halt entry (`Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`) 가 본 skill §Halt conditions 표에 등록됨.
- **kzk-large-task-delegation / kzk-codebase-survey**: 메인 직접 multi-file edit / 5+ 파일 read 시도 halt entry (`Q-MAIN-DIRECT-EDIT`) 가 본 skill §Halt conditions 표에 등록됨. cross-ref: `kzk-large-task-delegation §Anti-pattern §Main direct-edit` / `kzk-codebase-survey §Preparation phase delegation`.
