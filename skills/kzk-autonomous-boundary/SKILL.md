---
name: kzk-autonomous-boundary
version: 1.12.0
description: "Autonomous-mode boundary. Mandatory ASK-FIRST 3-slot branch contract (destination, name, PR mode) before any autonomous flow; post-contract continuation in same turn (Cycle 48). Autonomous completion fresh-agent verifier (mandatory pre-exit) — main self-declared 'verification PASS' / 'loop exit' forbidden. Halt conditions, destructive-op guardrails, Q-entry patterns (Q-TDD-MAIN, Q-TDD-AUTO-MISSING, Q-MAIN-DIRECT-EDIT, Q-VERIFIER-*, Q-COMPLETION-SELF-VERIFY, Q-PW-OAUTH-NEW-ACCOUNT/MULTI-ACCOUNT/CONSENT-LOOP/STUCK/CHALLENGE/PROVIDER-ERROR). Triggers: 'ralph로 돌려', '끝까지 끝내줘', '자율실행', autonomous TDD enforce, Q-TDD-AUTO-MISSING. References harness-share.md §2 + §33."
---

> Authoritative source: repo `CLAUDE.md` "Autonomous Execution Boundary" + `harness-share.md` §2. On conflict, those win.

# kzk-autonomous-boundary

## Allowed actions (autonomous mode ON)

- Auto-commit after `kzk-pre-commit-gate` full PASS (6 gates if AGENTS.md hierarchy present, otherwise 5; Gate 0 N/A without hierarchy; see that skill)
- Move to next task after TDD test passes
- Worktree parallel execution (`/superpowers:using-git-worktrees`)
- **Subagent dispatch (mandatory for multi-file / 5+ file read / 200+ LoC work)** — `oh-my-claudecode:executor` (sonnet) for implementation, `oh-my-claudecode:explore` (sonnet) for reference collection, `oh-my-claudecode:code-reviewer` / `oh-my-claudecode:critic` / `oh-my-claudecode:verifier` for review. Multi-file / 5+ file read / 200+ LoC 작업은 메인 직접 수행 금지 — 항상 subagent 위임. 메인 직접 허용 범위: 1-2 파일 단순 edit (≤ 30 LoC) 또는 운영 명령 (git status, install, ls) 에 한함.
- Document writing, plan elaboration, review execution
- **Autonomous completion fresh-agent verifier (mandatory pre-exit)** — autonomous loop 의 마지막 commit 후 다음 cycle 진입 또는 종료 보고 직전 `oh-my-claudecode:verifier` dispatch 의무. 본문 §Autonomous completion — fresh-agent verifier.
- **Autonomous + code-file change → TDD strict auto-trigger** (see `kzk-test-coverage §Autonomous mode TDD enforcement`). Explicit 'tdd' keyword not required — the presence of a code-file change in autonomous mode is sufficient. Fresh sonnet dispatch required for TDD red phase (`Q-TDD-MAIN` rule). No failing-then-passing test in the same cycle → halt `Q-TDD-AUTO-MISSING`.

## Branch contract — ASK FIRST (mandatory entry step)

Before entering any autonomous-style flow (`ralph`, `ulw`, `autopilot`, `web-loop`, harness self-improvement, "끝까지 끝내줘", "자는 동안 진행해", "실행해놔야 queue 보지") OR any harness-driven multi-commit task, the agent MUST get an explicit branch contract from the user. Three slots:

1. **Branch destination** — "Make a separate branch, or commit directly to the current branch?"
2. **Branch name** (only if separate branch) — propose a default (e.g., `feature/<topic>`, `harness-test`, `feature/web-loop-<goal-slug>`) and ask "OK as `<proposed>`?"
3. **PR mode** — "PR required, or direct commits without PR?"

Wait for an explicit answer on each slot. The answers become the operating contract for the rest of the session and are recorded in the first session log line. Re-confirm only when scope materially changes (doc-only → code change, single-module → multi-module, low-risk → destructive).

Do NOT silently default to `feature/<topic>`. Do NOT silently default to PR-flow. Do NOT silently default to direct-main. The user picks.

### Post-contract continuation (Cycle 48 lesson — polite-stop bridge)

Contract Q is a legitimate halt-for-input. But once all 3 slots are answered, the agent **MUST proceed to the next stage (plan / dispatch / Pass A) within the SAME turn**. Ending the turn after only echoing the answers = polite-stop violation, even though no work was reported and no FAIL occurred.

Required sequence after AskUserQuestion answer arrives:
1. Echo contract one-liner (`Operating contract: branch=<X>, name=<Y>, PR=<Z>`)
2. **Immediately call the first dispatch tool** (Agent for executor / Read for small main edits / Bash for git op) in the same turn — no "Waiting for next instruction" filler, no second AskUserQuestion to confirm scope
3. If the next stage genuinely needs another decision (e.g. unclear scope), append it to user-queue and continue with tentative default — do NOT halt for it

Anti-pattern signature: turn ends with `User answered Claude's questions: ...` then no follow-up tool call. That == polite-stop. cross-ref: `kzk-autonomous-loop §Polite-stop ban examples`.

## Forbidden actions (regardless of contract)

- **Direct `main` commits without explicit per-session authorization.** "main에 바로 커밋", "main 직접" or equivalent within the current session = OK. Without that = `main` is off-limits, halt + ask.
- **`git push --force` to a pushed / shared branch** without separate explicit "force push 해줘"
- **`git reset --hard` on a pushed branch** without separate explicit "hard reset 해줘"
- **PR auto-merge** — final merge always waits for explicit user "merge it"
- Auto-overriding user PRD / design docs (must follow Documentation Storage Rules in repo CLAUDE.md)
- Force-commit when a Pre-commit Gate fails
- **Autonomous + code-file change WITHOUT a failing-then-passing test in the same cycle (TDD bypass).** Halt with `Q-TDD-AUTO-MISSING`. Cross-ref: `kzk-test-coverage §Autonomous mode TDD enforcement`.
- Adding files outside the declared source root (see CLAUDE.md for your repo's rootDir constraints)
- Continuing the loop after reviewer FAILs **2 times in a row** → halt + user-queue entry
  Exception: `kzk-web-loop` intentionally overrides this — skip the failing issue, pick the next one (see `kzk-web-loop` §Failure Handling and `harness-share.md` §25 "Reviewer FAIL override").
- **Main self-declared "verification PASS" / "다 됐다" / "loop exit" / "completion confirmed" 결론** — fresh-agent verifier dispatch 의무. main 자기 결과 (production build PASS + unit test PASS + 코드 wiring 확인) 만으로 종료 선언 금지. dev/prod 격차 + browser 시야 사각지대 (사용자가 직접 페이지 열어 stale 발견 → rework 큰 비용). 본문 §Autonomous completion — fresh-agent verifier.

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
| `Q-FIX-PIVOT-FAIL` | layer-pivot 룰이 L0 도달 후에도 fix 실패 (`kzk-fix-scope-expansion §Fix layer pivot`) | halt + Q-FIX-PIVOT-FAIL entry. fallback: 외부 시스템 또는 사용자 manual 분석 | 사용자 결정 (분석 결과 기반 fix 재진입 또는 task abandon) |
| `Q-COMPLETION-SELF-VERIFY` | 자율실행 종료 직전 main 이 fresh-agent verifier dispatch 없이 "다 됐다" / "verification PASS" / "loop exit" / "completion confirmed" 결론 시도 | halt + Q-COMPLETION-SELF-VERIFY entry. 종료 보고 BLOCK. cross-ref: §Autonomous completion — fresh-agent verifier | fresh-agent verifier dispatch PASS 또는 사용자 명시 override (1회만) |
| `Q-PW-OAUTH-NEW-ACCOUNT` | OAuth account picker 에 cached 계정 row 0개 (fresh Chromium profile / no cached session). 절차: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | 사용자가 Chromium 창에서 1회 직접 로그인 → cached cookie 이후 runs 커버 |
| `Q-PW-OAUTH-MULTI-ACCOUNT` | OAuth account picker 에 cached 계정 row ≥ 2개 — 어느 계정인지 모호. 절차: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry (어느 email 사용할지 질문) | 사용자가 target email 명시 → agent 해당 row 만 클릭 |
| `Q-PW-OAUTH-CONSENT-LOOP` | consent_page_count > 4 — 비정상 scope chain 또는 Google UI 변경 의심. 절차: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | 사용자 scope chain / UI 변경 수동 검토 후 resume |
| `Q-PW-OAUTH-STUCK` | 동일 URL ≥ 30s + console/DOM 변화 없음, 또는 sign-in click 검증 2회 연속 실패. 절차: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | 수동 진단 (MCP 상태, login modal, 네트워크) 후 resume |
| `Q-PW-OAUTH-CHALLENGE` | Google 페이지에서 reCAPTCHA / "Verify it's you" / SMS OTP / 비밀번호 입력 요구 / passkey prompt / security key / device verification / account locked / 'less secure apps' interstitial. 절차: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | 사용자가 Chromium 창에서 challenge 1회 완료 → 이후 runs 정상 |
| `Q-PW-OAUTH-PROVIDER-ERROR` | OAuth provider config error / backend misconfig — e.g. `redirect_uri_mismatch`, `error=access_denied`, COOP/COEP-blocked popup, 4xx/5xx on callback. Note: `error=access_denied` can be EITHER (a) backend config issue OR (b) user-declined consent — full dual-cause note + resume guidance in `kzk-playwright-verification §OAuth click-through protocol` halt table. Full trigger body: `kzk-playwright-verification §OAuth click-through protocol` + halt table row | halt + Q-PW-OAUTH-PROVIDER-ERROR entry with captured error code + URL | Backend/OAuth config fix (Google Cloud Console redirect URI, OAuth client) — usually outside Playwright scope. If user-declined: re-prompt user with intent. Full resume: `kzk-playwright-verification §OAuth click-through protocol` halt table. |
| `Q-TDD-AUTO-MISSING` | Autonomous mode active (Category A verb phrase OR `KZK_AUTONOMOUS=1`) AND code-file change detected (per `kzk-test-coverage §Autonomous mode TDD enforcement`) but no failing-then-passing test present in the same cycle (TDD bypass) | halt + Q-TDD-AUTO-MISSING entry. commit BLOCK | TDD test added (Red → Green) in the same cycle OR user explicit override ("TDD 빼고", 1회만) |


## Autonomous completion — fresh-agent verifier (mandatory)

자율실행 mode 가 "다 됐다" / "완료" / "verification PASS" / "loop exit" 결론을 내리기 직전 의무 단계. **main self-declared completion 금지** — main 의 자체 결과 (production build PASS + unit test PASS + 코드 wiring 확인) 만으로 종료 보고하면 dev/prod 환경 격차 + browser 시야 사각지대를 못 잡음 (사용자가 직접 페이지 열어 stale / 깨진 화면 발견 → rework 큰 비용).

### Trigger

- 자율실행 loop (`ralph` / `ulw` / `web-loop` / `autopilot` / harness self-improvement / "끝까지 끝내줘" / "자는 동안 진행해") 의 마지막 commit 후, 다음 사이클 진입 또는 사용자에게 종료 보고 직전
- Plan C Stage 3 verifier 와는 **별개 trigger** — Stage 3 = per-commit code-level lens, 본 절차 = autonomous run 전체의 exit gate (user-persona run-level lens)
- 단일 cycle (`/improve` 1회) 도 의무. cycle 1개 = main 의 self-verification 사각지대 동일.

### Dispatch

```
Agent(
  subagent_type="oh-my-claudecode:verifier",
  prompt=<완료-검증 prompt — 아래 §Verifier 임무 참조>,
)
```

model 분기 (Gate 5 schema 동일):
- 변경 합계 < 3 files && < 100 LoC && non-UI → `model="sonnet"` 명시
- 그 외 (multi-file / UI 변경 포함 / high-risk: auth/payment/migration/public API) → model 생략 (메인 opus 상속)

### Verifier 임무 (prompt 명시 의무 항목)

1. **Dev server health 사전 검수** — `kzk-playwright-verification §Dev/prod build divergence trap` 전체 절차 적용. `ps aux | grep -E "vite|next|nest"` + dev log tail 50 line error 패턴 grep (`vite:css`, `Module build failed`, `HMR ERROR`, `parse error`). 1개라도 발견 시 → FAIL.
2. **Playwright user-persona navigate** — 변경 영역 포함 ≥ 3 페이지. `page.reload({ bypassCache: true })` 1회 강제 + full-page screenshot + `browser_console_messages level=error AND level=warning` (HMR warning 포함).
3. **HMR / module reload error 점검** — browser console 의 `[HMR]`, `[vite]`, `[next]` prefix 경고 0개.
4. **User-persona visual check** — 사용자가 페이지 열면 보일 화면 명시적 시각 검수. shadcn primitive default brittle (unstyled anchor / 무padding badge / border-only card), padding / layout, copy text 신선도. "looks good" 금지 — name elements + name tokens.
5. **변경 의도 vs 실제 화면 일치 여부** — 이번 cycle 의 acceptance criteria 가 페이지에서 실제로 보이는지 사용자 시야에서 검수.

### VERDICT enforcement (Gate 5 schema 동일)

- 응답 첫 줄 `VERDICT: PASS|FAIL|PARTIAL` 정규식 강제
- PASS 받기 전 autonomous loop 종료 / 완료 보고 BLOCK
- 같은 thread (autonomous run id) 2 consecutive FAIL → halt + `Q-VERIFIER-FAIL` (기존 entry 재사용)
- VERDICT line 정규식 위반 → fail-closed BLOCK + `Q-VERIFIER-INVALID`
- verifier subagent dispatch 자체 실패 → BLOCK + `Q-VERIFIER-DISPATCH-FAIL` (fallback: `oh-my-claudecode:code-reviewer`)
- main 이 dispatch 자체를 생략하고 "다 됐다" 결론 시도 → halt + `Q-COMPLETION-SELF-VERIFY` (§Halt conditions table)

### Anti-patterns

- **main self-declared completion** — production build PASS + unit test PASS + 코드 wiring 확인 = "다 됐다" 결론. dev/prod 격차 (e.g. Tailwind v4 @import order = dev fail / prod pass) + browser 시야 사각지대 못 잡음. fresh-agent dispatch 의무.
- **Stage 3 Gate 5 verifier PASS 했으므로 exit verifier 생략** — 다른 lens. Gate 5 = per-commit code-level, exit verifier = run-level user-persona. 모두 의무.
- **"한 cycle 밖에 안 됐으니 verifier 과한 듯"** — cycle 1개 = main 의 self-verification 사각지대 동일. 비용은 sonnet 1회 (~50k token), rework 평균 비용 (이번 cycle 20 enum 작업: 5 추가 commit + 사용자 직접 진단) 대비 매우 저렴.
- **"사용자가 직접 화면 보고 confirm 해주면 되니까 verifier 패스"** — 사용자에게 verification 책임 전가 = autonomous 의 의미 자체 위반. 사용자가 화면 열어보는 건 fallback 이지 primary path 가 아님.

### Cross-ref

- `kzk-playwright-verification §Dev/prod build divergence trap` — verifier Step 1 (dev server health) 에서 사용할 detection procedure
- `kzk-pre-commit-gate §Gate 5` — per-commit verifier (별개 trigger, 같은 schema)
- `harness-share.md §3 Gate 5` — Gate 5 SoT (본 § 는 그 위의 run-level exit gate)
- §Halt conditions table 의 `Q-COMPLETION-SELF-VERIFY` / `Q-VERIFIER-*` entries — 본 절차 위반 / 실패 시 halt entry

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
- **kzk-test-coverage**: Plan A Layer (b) 자율 mode 메인 직접 TDD 금지 룰의 halt entry (`Q-TDD-MAIN`) 가 본 skill 의 §Halt conditions 표에 등록됨. 추가: 자율 mode + code-file change 의 auto-trigger TDD enforcement 룰 본문은 `kzk-test-coverage §Autonomous mode TDD enforcement` 에 정의; 그 halt entry (`Q-TDD-AUTO-MISSING`) 는 본 skill §Halt conditions 표에 등록됨 (§Allowed actions + §Forbidden actions 에서도 cross-ref).
- **kzk-large-task-delegation / kzk-pre-commit-gate**: Plan C Stage 3 / Gate 5 verifier 관련 halt entry (`Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`) 가 본 skill §Halt conditions 표에 등록됨.
- **kzk-large-task-delegation / kzk-codebase-survey**: 메인 직접 multi-file edit / 5+ 파일 read 시도 halt entry (`Q-MAIN-DIRECT-EDIT`) 가 본 skill §Halt conditions 표에 등록됨. cross-ref: `kzk-large-task-delegation §Anti-pattern §Main direct-edit` / `kzk-codebase-survey §Preparation phase delegation`.
- **kzk-codex-handoff**: `Q-CODEX-DISPATCH-FAIL` halt entry 의 정의 출처. 본 skill §Halt conditions 표가 그 entry 를 등록.
- **kzk-playwright-verification**: §Autonomous completion — fresh-agent verifier 의 Step 1 (dev server health) detection procedure 는 그 skill 의 §Dev/prod build divergence trap 에 위임. 본 skill 의 exit verifier 가 trigger / VERDICT enforcement / Halt entry 정의. Q-PW-OAUTH-* halt entries (6종 — NEW-ACCOUNT, MULTI-ACCOUNT, CONSENT-LOOP, STUCK, CHALLENGE, PROVIDER-ERROR) 정의는 그 skill 의 §OAuth click-through protocol 본문에 위임. 본 §Halt conditions 표는 entry 등록만 담당.

## Pre-dispatch survey rule (autonomous mode)

**Rule**: Inside autonomous mode, every `kzk-large-task-delegation` dispatch MUST be preceded by `kzk-codebase-survey` if a survey report for the topic is not already in the dispatch context.

**Rationale**: large-task scope estimation (3+ files / 200+ LoC / 5+ reads) is itself a read-heavy audit. Autonomous mode forbids main from reading 5+ files directly. Survey must run first inside an EXPLORER subagent (`oh-my-claudecode:explore`, sonnet) so main never absorbs raw code at saturation.

**Exception**: If the current turn already produced a `kzk-codebase-survey` report path (same-turn carry-forward), reuse it — do not re-dispatch.

**Halt on miss**: If `kzk-large-task-delegation` detects multi-file scope but no survey context exists, append `Q-SURVEY-MISSING` to `docs/harness/user-queue.md` and halt the delegation. Resume after survey completes.

**Cross-ref**: `kzk-large-task-delegation §Scope estimation`, `kzk-codebase-survey §8-step`, `harness-share.md §4`.
