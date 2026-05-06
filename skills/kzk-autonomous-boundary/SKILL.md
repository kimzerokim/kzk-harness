---
name: kzk-autonomous-boundary
version: 1.7.0
description: "Autonomous-mode boundary — make sure to use this skill whenever the user's prompt matches the Category A trigger phrases in harness-share.md §33 Autonomous-mode Detection SoT (canonical: 'ralph로 돌려', '끝까지 끝내줘', etc.), or any phrasing that requests autonomous multi-commit execution. Enforces the mandatory ASK-FIRST 3-slot branch/PR contract (branch destination, branch name, PR mode) before any autonomous or harness-driven multi-commit flow begins. Governs halt conditions (reviewer 2× FAIL, build 3× FAIL, main-access required), destructive-op guardrails (force-push, reset --hard, PR auto-merge), and Q-entry patterns (Q-TDD-MAIN, Q-MAIN-DIRECT-EDIT, Q-VERIFIER-FAIL, Q-VERIFIER-INVALID, Q-VERIFIER-DISPATCH-FAIL). References harness-share.md §2 + §33."
---

> Authoritative source: repo `CLAUDE.md` "Autonomous Execution Boundary" + `harness-share.md` §2. On conflict, those win.

# kzk-autonomous-boundary

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
| `Q-TDD-MAIN` | 자율 mode 의 메인 컨텍스트가 직접 TDD red 단계 진입 시도 | halt + Q-TDD-MAIN entry. cross-ref: `kzk-test-coverage` §자율 mode 메인 직접 TDD 금지 | fresh sonnet dispatch PASS 또는 사용자 명시 override (1회만) |
| `Q-MAIN-DIRECT-EDIT` | 자율 mode 에서 메인이 직접 Edit/Write 로 코드/스킬 변경 시도 (신호: 5+ 파일 read / 3+ 파일 edit / 200+ LoC) | halt + Q-MAIN-DIRECT-EDIT entry. cross-ref: `kzk-large-task-delegation §Anti-pattern §Main direct-edit` | fresh executor subagent dispatch PASS 또는 사용자 명시 override (1회만) |
| `Q-VERIFIER-FAIL` | verifier 가 같은 thread `(plan_path, acceptance_id, round)` 에서 2 consecutive FAIL | halt + Q-VERIFIER-FAIL entry. commit BLOCK 유지 | PASS 또는 user-approved plan revision (rev bump 명시) |
| `Q-VERIFIER-INVALID` | verifier 응답 첫 줄이 `VERDICT: PASS\|FAIL\|PARTIAL` 정규식 매칭 실패 | fail-closed BLOCK + Q-VERIFIER-INVALID entry | retry (stricter prompt) PASS 또는 사용자 manual verify OK |
| `Q-VERIFIER-DISPATCH-FAIL` | verifier subagent dispatch 자체 실패 (timeout / unavailable) | BLOCK + Q-VERIFIER-DISPATCH-FAIL entry. fallback: `oh-my-claudecode:code-reviewer` | fallback PASS 또는 사용자 manual review OK |
| `Q-CODEX-DISPATCH-FAIL` | codex subagent dispatch 자체 실패 — `kzk-codex-handoff §Fresh subagent 호출 패턴` 정의 | BLOCK + Q-CODEX-DISPATCH-FAIL entry. fallback 1: 메인 직접 codex. fallback 2: critic opus | fallback PASS 또는 사용자 manual review OK |


## Rollback / revert policy

If the autonomous loop committed code that is later found to be wrong (reviewer FAIL after commit, or test regression discovered in a later cycle):

1. `git revert <sha>` — prefer revert over reset; preserves history
2. Never `git reset --hard` on a pushed branch without explicit user "hard reset it"
3. Append a user-queue entry with: which commit, why reverted, what the correct approach should be
4. Resume the loop from the next issue — do not re-attempt the same issue immediately after revert

## Branch policy detail

> See CLAUDE.md "Autonomous Execution Boundary" for branch shape examples (PR-flow / direct-main / direct-no-PR / long-lived branch).

- Under PR-flow: **One Plan = one PR (no batch).** PR description must include `CLAUDE.md updated` + `deepinit ran` (see `kzk-pre-merge-sync`).
- Under direct-main flow: atomic-commit discipline applies; `kzk-pre-merge-sync` checks before milestone commits.

## Interaction with other kzk-*

- **kzk-tool-retry**: When any Edit/Write/Bash fails during autonomous execution, apply 1-retry before halting or queuing. This skill defines halt conditions; kzk-tool-retry defines the single-call retry discipline that runs before those conditions are evaluated.
- **kzk-autonomous-loop**: polite-stop ban and multi-Plan continuation rules. This skill defines what STOPS the loop; that one defines how the loop CONTINUES.
- **kzk-user-queue**: halt conditions that require a user decision append entries here and await a DECISION line before resuming.
- **kzk-test-coverage**: Plan A Layer (b) 자율 mode 메인 직접 TDD 금지 룰의 halt entry (`Q-TDD-MAIN`) 가 본 skill 의 §Halt conditions 표에 등록됨.
- **kzk-large-task-delegation / kzk-pre-commit-gate**: Plan C Stage 3 / Gate 5 verifier 관련 halt entry (`Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`) 가 본 skill §Halt conditions 표에 등록됨.
- **kzk-large-task-delegation / kzk-codebase-survey**: 메인 직접 multi-file edit / 5+ 파일 read 시도 halt entry (`Q-MAIN-DIRECT-EDIT`) 가 본 skill §Halt conditions 표에 등록됨. cross-ref: `kzk-large-task-delegation §Anti-pattern §Main direct-edit` / `kzk-codebase-survey §Preparation phase delegation`.
- **kzk-codex-handoff**: `Q-CODEX-DISPATCH-FAIL` halt entry 의 정의 출처. 본 skill §Halt conditions 표가 그 entry 를 등록.
