---
name: kzk-autonomous-boundary
version: 1.14.0
description: "Autonomous-mode boundary. Mandatory ASK-FIRST 3-slot branch contract (destination, name, PR mode) before any autonomous flow; post-contract continuation in same turn (Cycle 48). Autonomous completion fresh-agent verifier (mandatory pre-exit) — main self-declared 'verification PASS' / 'loop exit' forbidden. Cycle-exit mandate: 4 sub-check (prod-build smoke, stub sweep, SoT alignment, spec-freeze re-check). Halt conditions, destructive-op guardrails, Q-entry patterns (Q-TDD-MAIN, Q-TDD-AUTO-MISSING, Q-MAIN-DIRECT-EDIT, Q-VERIFIER-*, Q-COMPLETION-SELF-VERIFY, Q-PW-OAUTH-NEW-ACCOUNT/MULTI-ACCOUNT/CONSENT-LOOP/STUCK/CHALLENGE/PROVIDER-ERROR). Triggers: 'ralph로 돌려', '끝까지 끝내줘', '자율실행', autonomous TDD enforce, Q-TDD-AUTO-MISSING. References harness-share.md §2 + §33."
---

> Authoritative source: repo `CLAUDE.md` "Autonomous Execution Boundary" + `harness-share.md` §2. On conflict, those win.

# kzk-autonomous-boundary

## Allowed actions (autonomous mode ON)

- Auto-commit after `kzk-pre-commit-gate` full PASS (6 gates if AGENTS.md hierarchy present, otherwise 5; Gate 0 N/A without hierarchy; see that skill)
- Move to next task after TDD test passes
- Worktree parallel execution (`/superpowers:using-git-worktrees`)
- **Subagent dispatch (mandatory for multi-file / 5+ file read / 200+ LoC work)** — `oh-my-claudecode:executor` (sonnet) for implementation, `oh-my-claudecode:explore` (sonnet) for reference collection, `oh-my-claudecode:code-reviewer` / `oh-my-claudecode:critic` / `oh-my-claudecode:verifier` for review. Multi-file / 5+ file read / 200+ LoC work is forbidden for main to perform directly — always delegate to a subagent. Main's direct-action scope: 1-2 file simple edits (≤ 30 LoC) or operational commands (git status, install, ls) only.
- Document writing, plan elaboration, review execution
- **Autonomous completion fresh-agent verifier (mandatory pre-exit)** — before the last commit of the autonomous loop leads to the next cycle or to a completion report, dispatch `oh-my-claudecode:verifier`. See §Autonomous completion — fresh-agent verifier.
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
- **Main self-declared "verification PASS" / "done" / "loop exit" / "completion confirmed"** — fresh-agent verifier dispatch is mandatory. Main's own results (production build PASS + unit test PASS + code wiring confirmed) alone are not enough to end the run. Dev/prod divergence + browser blind spot (user opens the page and finds it stale → expensive rework). See §Autonomous completion — fresh-agent verifier.

## Halt conditions (entire autonomous run)

Halt and append a user-queue entry when:

- reviewer/critic 2 consecutive FAILs
- build / test 3 consecutive FAILs
- `main` access required for the next step **and** the session contract did not authorize direct-main flow
- A user-queue decision is required to proceed
- Crossing into a code/plan area pre-dating a current rule (e.g. plan written before PRD v1.13) — halt, do NOT retroactively rewrite policy via subagent guess

Anything else → keep going (see `kzk-autonomous-loop` for polite-stop ban).

### Halt conditions table (reason / action / resume schema)

| Trigger | Reason | Action | Resume |
|---|---|---|---|
| `Q-TDD-MAIN` | Main context in autonomous mode attempts to enter TDD red phase directly | halt + Q-TDD-MAIN entry. cross-ref: `kzk-test-coverage` §Autonomous mode — main direct TDD forbidden | fresh sonnet dispatch PASS or explicit user override (one-time only) |
| `Q-MAIN-DIRECT-EDIT` | Main in autonomous mode attempts to directly Edit/Write code/skill changes (signal: 5+ file reads / 3+ file edits / 200+ LoC) | halt + Q-MAIN-DIRECT-EDIT entry. cross-ref: `kzk-large-task-delegation §Anti-pattern §Main direct-edit` | fresh executor subagent dispatch PASS or explicit user override (one-time only) |
| `Q-VERIFIER-FAIL` | Verifier returns 2 consecutive FAILs on same thread `(plan_path, acceptance_id, round)` | halt + Q-VERIFIER-FAIL entry. commit BLOCK maintained | PASS or user-approved plan revision (explicit rev bump) |
| `Q-VERIFIER-INVALID` | Verifier response first line fails `VERDICT: PASS\|FAIL\|PARTIAL` regex match | fail-closed BLOCK + Q-VERIFIER-INVALID entry | retry (stricter prompt) PASS or user manual verify OK |
| `Q-VERIFIER-DISPATCH-FAIL` | Verifier subagent dispatch itself fails (timeout / unavailable) | BLOCK + Q-VERIFIER-DISPATCH-FAIL entry. fallback: `oh-my-claudecode:code-reviewer` | fallback PASS or user manual review OK |
| `Q-CODEX-DISPATCH-FAIL` | Codex subagent dispatch itself fails — defined in `kzk-codex-handoff §Fresh subagent 호출 패턴` | BLOCK + Q-CODEX-DISPATCH-FAIL entry. fallback 1: main runs codex directly. fallback 2: critic opus | fallback PASS or user manual review OK |
| `Q-FIX-PIVOT-FAIL` | Layer-pivot rule fails to resolve after reaching L0 (`kzk-fix-scope-expansion §Fix layer pivot`) | halt + Q-FIX-PIVOT-FAIL entry. fallback: external system or user manual analysis | user decision (re-enter fix based on analysis results, or abandon task) |
| `Q-COMPLETION-SELF-VERIFY` | Main attempts "done" / "verification PASS" / "loop exit" / "completion confirmed" conclusion just before autonomous exit without dispatching fresh-agent verifier | halt + Q-COMPLETION-SELF-VERIFY entry. completion report BLOCKED. cross-ref: §Autonomous completion — fresh-agent verifier | fresh-agent verifier dispatch PASS or explicit user override (one-time only) |
| `Q-PW-OAUTH-NEW-ACCOUNT` | OAuth account picker has 0 cached rows (fresh Chromium profile / no cached session). Procedure: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | User signs in once in Chromium window; cached cookie covers subsequent runs |
| `Q-PW-OAUTH-MULTI-ACCOUNT` | OAuth account picker has ≥ 2 cached rows — target account is ambiguous. Procedure: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry (ask which email to use) | User specifies target email; agent clicks that row only |
| `Q-PW-OAUTH-CONSENT-LOOP` | consent_page_count > 4 — unusual scope chain or suspected Google UI change. Procedure: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | User manually reviews scope chain / UI change then resumes |
| `Q-PW-OAUTH-STUCK` | Same URL ≥ 30s + no console/DOM activity, or sign-in click verification fails 2×. Procedure: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | Manual diagnose (MCP state, login modal, network) then resume |
| `Q-PW-OAUTH-CHALLENGE` | Google page requires reCAPTCHA / "Verify it's you" / SMS OTP / password input / passkey prompt / security key / device verification / account locked / 'less secure apps' interstitial. Procedure: `kzk-playwright-verification §OAuth click-through protocol` | halt + user-queue entry | User completes the challenge once in the Chromium window; subsequent runs are normal |
| `Q-PW-OAUTH-PROVIDER-ERROR` | OAuth provider config error / backend misconfig — e.g. `redirect_uri_mismatch`, `error=access_denied`, COOP/COEP-blocked popup, 4xx/5xx on callback. Note: `error=access_denied` can be EITHER (a) backend config issue OR (b) user-declined consent — full dual-cause note + resume guidance in `kzk-playwright-verification §OAuth click-through protocol` halt table. Full trigger body: `kzk-playwright-verification §OAuth click-through protocol` + halt table row | halt + Q-PW-OAUTH-PROVIDER-ERROR entry with captured error code + URL | Backend/OAuth config fix (Google Cloud Console redirect URI, OAuth client) — usually outside Playwright scope. If user-declined: re-prompt user with intent. Full resume: `kzk-playwright-verification §OAuth click-through protocol` halt table. |
| `Q-TDD-AUTO-MISSING` | Autonomous mode active (Category A verb phrase OR `KZK_AUTONOMOUS=1`) AND code-file change detected (per `kzk-test-coverage §Autonomous mode TDD enforcement`) but no failing-then-passing test present in the same cycle (TDD bypass) | halt + Q-TDD-AUTO-MISSING entry. commit BLOCK | TDD test added (Red → Green) in the same cycle OR explicit user override ("TDD 빼고", one-time only) |


## Autonomous completion — fresh-agent verifier (mandatory)

Mandatory step just before autonomous mode concludes with "done" / "complete" / "verification PASS" / "loop exit". **Main self-declared completion is forbidden** — main's own results (production build PASS + unit test PASS + code wiring confirmed) alone cannot catch dev/prod environment divergence + browser blind spot (user opens page, finds stale / broken screen → expensive rework).

### Trigger

- After the last commit of an autonomous loop (`ralph` / `ulw` / `web-loop` / `autopilot` / harness self-improvement / "끝까지 끝내줘" / "자는 동안 진행해"), before entering the next cycle or reporting completion to the user
- **Separate trigger from Plan C Stage 3 verifier** — Stage 3 = per-commit code-level lens; this procedure = exit gate for the entire autonomous run (user-persona run-level lens)
- Even a single cycle (`/improve` once) is mandatory. One cycle = same main self-verification blind spot.
- **Large-cycle exit trigger (non-autonomous sessions)**: When a commit message contains any of the keywords `final` / `baseline` / `migration` / `c25` (or similar cycle-closing markers) AND the changed file set spans ≥ 3 modules OR includes a migration SQL file OR includes `CLAUDE.md`, dispatch the fresh-agent verifier before reporting completion to the user — even if no autonomous loop (ralph/ulw/autopilot) was active. Rationale: large multi-phase cycles carry the same dev/prod blind spot regardless of execution mode. Keyword match examples: commit subject contains `final`, `baseline`, `single baseline`, `cycle NN final`, `migration`.

### Dispatch

```
Agent(
  subagent_type="oh-my-claudecode:verifier",
  prompt=<completion-verification prompt — see §Verifier tasks below>,
)
```

Model branching (same schema as Gate 5):
- Total changes < 3 files && < 100 LoC && non-UI → specify `model="sonnet"`
- Otherwise (multi-file / includes UI changes / high-risk: auth/payment/migration/public API) → omit model (inherits main opus)

### Verifier tasks (mandatory items in prompt)

1. **Dev server health pre-check** — apply full procedure from `kzk-playwright-verification §Dev/prod build divergence trap`. `ps aux | grep -E "vite|next|nest"` + dev log tail 50 lines error pattern grep (`vite:css`, `Module build failed`, `HMR ERROR`, `parse error`). Any match → FAIL.
2. **Playwright user-persona navigate** — ≥ 3 pages including the changed area. Force one `page.reload({ bypassCache: true })` + full-page screenshot + `browser_console_messages level=error AND level=warning` (including HMR warnings).
3. **HMR / module reload error check** — zero `[HMR]`, `[vite]`, `[next]` prefix warnings in browser console.
4. **User-persona visual check** — explicitly visually verify what the user would see when opening the page. shadcn primitive default-brittle states (unstyled anchor / padding-less badge / border-only card), padding / layout, copy text freshness. "looks good" is forbidden — name elements + name tokens.
5. **Change intent vs actual screen match** — verify from the user's perspective that this cycle's acceptance criteria are actually visible on the page.

### Cycle-exit mandate (4 sub-check)

When the cycle-exit hook (`check-cycle-exit.mjs`) fires and BLOCKS a commit/push, the fresh-agent verifier dispatched to resolve the block MUST execute all 4 sub-checks before returning a verdict. Main self-execute of these checks is forbidden (`Q-COMPLETION-SELF-VERIFY` rule applies).

1. **Prod-build user-persona smoke** — see `kzk-pre-merge-sync §6`. App project: `npm run build` + start prod dist server + Playwright 3+ pages. kzk-harness self: skill-flow HTML render + fingerprint match + index.html nav.
2. **Stub sweep** — see `kzk-pre-merge-sync §5`. `git log <base>..HEAD --grep='STUB:'` + JSX/comment pattern grep + UI text patterns.
3. **SoT alignment** — see `kzk-pre-merge-sync §7`. `docs/sot/feature-list.md` (or equivalent) ↔ staged code feature symbol implementation state.
4. **Spec-freeze re-check** — spec visual/layout modifiers (`Gridly 스타일`, `nice spacing`, `proper hierarchy`, `clean look`, `split-pane`) must have a frozen artifact (ASCII wireframe / layout token / approved screenshot / component library name) AND match implementation screenshots from sub-check 1.

4 sub-check 중 1개라도 FAIL → cycle-exit BLOCK 지속. Verifier returns VERDICT: BLOCK. After all sub-checks PASS, main retries original command with `KZK_CYCLE_EXIT_VERIFIED=1`.

Cross-ref: `kzk-pre-merge-sync §5/§6/§7`, `harness-share.md §3 Gate 6`.

**Verifier dispatch template** (use when cycle-exit hook fires — inject full template from `kzk-pre-merge-sync §7`):

```text
Role: fresh-agent verifier per kzk-autonomous-boundary §Autonomous completion fresh-agent verifier.

Trigger: cycle-exit hook (check-cycle-exit.mjs) BLOCKED a commit/push.
Marker matched: <CYCLE-EXIT: ... | MILESTONE: ... | STUB-CLEAR: ...>
Cycle scope: <base ref> .. HEAD  (or last N commits if no base ref)
Project context: <app project | kzk-harness self-improvement>

Execute 4 sub-checks. Each FAIL → BLOCK verdict.

1. Prod-build user-persona smoke (§kzk-pre-merge-sync §6)
2. Stub sweep (§kzk-pre-merge-sync §5)
3. SoT alignment (§kzk-pre-merge-sync §7)
4. Spec-freeze re-check (§kzk-autonomous-boundary §Mandate above)

VERDICT format (first line MANDATORY):
  VERDICT: <PASS | BLOCK>

Sub-check outcomes:
  1. Prod-build smoke: <PASS|FAIL — reason>
  2. Stub sweep: <PASS|FAIL — list>
  3. SoT alignment: <PASS|FAIL — list>
  4. Spec-freeze re-check: <PASS|FAIL — list>

Evidence: <paths to screenshots / log excerpts / git refs>
```

### VERDICT enforcement (same schema as Gate 5)

- First line of response must match `VERDICT: PASS|FAIL|PARTIAL` regex
- Autonomous loop exit / completion report BLOCKED until PASS received
- 2 consecutive FAILs on same thread (autonomous run id) → halt + `Q-VERIFIER-FAIL` (reuse existing entry)
- VERDICT line regex violation → fail-closed BLOCK + `Q-VERIFIER-INVALID`
- Verifier subagent dispatch itself fails → BLOCK + `Q-VERIFIER-DISPATCH-FAIL` (fallback: `oh-my-claudecode:code-reviewer`)
- Main attempts "done" conclusion without dispatching → halt + `Q-COMPLETION-SELF-VERIFY` (§Halt conditions table)

### Anti-patterns

- **Main self-declared completion** — production build PASS + unit test PASS + code wiring confirmed = "done" conclusion. Cannot catch dev/prod divergence (e.g. Tailwind v4 @import order = dev fail / prod pass) + browser blind spot. Fresh-agent dispatch is mandatory.
- **"Stage 3 Gate 5 verifier PASSED so skip exit verifier"** — different lens. Gate 5 = per-commit code-level, exit verifier = run-level user-persona. Both are mandatory.
- **"Only one cycle so verifier seems excessive"** — one cycle = same main self-verification blind spot. Cost is one sonnet call (~50k tokens) vs average rework cost (this cycle's 20 enum work: 5 extra commits + user direct diagnosis) — far cheaper.
- **"User can look at the screen and confirm, so skip verifier"** — delegating verification responsibility to the user violates the purpose of autonomous mode. User checking the screen is the fallback, not the primary path.
- **"Not autonomous mode so exit verifier doesn't apply"** — the blind spot (dev/prod divergence + browser blind spot) exists in any large-cycle session, not just ralph/ulw. Large-cycle exit trigger covers non-autonomous sessions (see §Trigger third bullet).

### Cross-ref

- `kzk-playwright-verification §Dev/prod build divergence trap` — detection procedure to use in verifier Step 1 (dev server health)
- `kzk-pre-commit-gate §Gate 5` — per-commit verifier (separate trigger, same schema)
- `harness-share.md §3 Gate 5` — Gate 5 SoT (this § is the run-level exit gate above it)
- §Halt conditions table entries `Q-COMPLETION-SELF-VERIFY` / `Q-VERIFIER-*` — halt entries for violations / failures of this procedure

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
- **kzk-test-coverage**: Plan A Layer (b) autonomous mode main-direct TDD forbidden rule's halt entry (`Q-TDD-MAIN`) is registered in this skill's §Halt conditions table. Additionally: the auto-trigger TDD enforcement rule for autonomous mode + code-file change is defined in `kzk-test-coverage §Autonomous mode TDD enforcement`; its halt entry (`Q-TDD-AUTO-MISSING`) is registered in this skill's §Halt conditions table (also cross-referenced in §Allowed actions + §Forbidden actions).
- **kzk-large-task-delegation / kzk-pre-commit-gate**: Plan C Stage 3 / Gate 5 verifier-related halt entries (`Q-VERIFIER-FAIL`, `Q-VERIFIER-INVALID`, `Q-VERIFIER-DISPATCH-FAIL`) are registered in this skill's §Halt conditions table.
- **kzk-large-task-delegation / kzk-codebase-survey**: Main direct multi-file edit / 5+ file read attempt halt entry (`Q-MAIN-DIRECT-EDIT`) is registered in this skill's §Halt conditions table. cross-ref: `kzk-large-task-delegation §Anti-pattern §Main direct-edit` / `kzk-codebase-survey §Preparation phase delegation`.
- **kzk-codex-handoff**: Source of the `Q-CODEX-DISPATCH-FAIL` halt entry definition. This skill's §Halt conditions table registers that entry.
- **kzk-playwright-verification**: §Autonomous completion — fresh-agent verifier Step 1 (dev server health) detection procedure is delegated to that skill's §Dev/prod build divergence trap. This skill defines the trigger / VERDICT enforcement / halt entries. Q-PW-OAUTH-* halt entries (6 types — NEW-ACCOUNT, MULTI-ACCOUNT, CONSENT-LOOP, STUCK, CHALLENGE, PROVIDER-ERROR) are defined in that skill's §OAuth click-through protocol body. This §Halt conditions table only registers the entries.

## Pre-dispatch survey rule (autonomous mode)

**Rule**: Inside autonomous mode, every `kzk-large-task-delegation` dispatch MUST be preceded by `kzk-codebase-survey` if a survey report for the topic is not already in the dispatch context.

**Rationale**: large-task scope estimation (3+ files / 200+ LoC / 5+ reads) is itself a read-heavy audit. Autonomous mode forbids main from reading 5+ files directly. Survey must run first inside an EXPLORER subagent (`oh-my-claudecode:explore`, sonnet) so main never absorbs raw code at saturation.

**Exception**: If the current turn already produced a `kzk-codebase-survey` report path (same-turn carry-forward), reuse it — do not re-dispatch.

**Halt on miss**: If `kzk-large-task-delegation` detects multi-file scope but no survey context exists, append `Q-SURVEY-MISSING` to `docs/harness/user-queue.md` and halt the delegation. Resume after survey completes.

**Cross-ref**: `kzk-large-task-delegation §Scope estimation`, `kzk-codebase-survey §8-step`, `harness-share.md §4`.
