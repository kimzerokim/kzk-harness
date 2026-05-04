---
name: kzk-web-loop
version: 1.5.0
description: "Autonomous web page improvement loop — indefinite self-directed cycles via fresh evaluator agent. Top triggers: 'web loop', '웹 루프', '무한 루프', '자율 개선', '계속 돌려'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §25. On conflict, that wins.

# kzk-web-loop

## Triggers

`web loop`, `웹 루프`, `자율 개선`, `loop forever`, `무한 개선`, `무한 루프`, `계속 돌려`.

Runs a self-directed improvement cycle on a web project until the user explicitly stops it. Solves two problems: (1) Claude lacks a self-directed task source and stops to ask for direction, (2) Playwright MCP calls frequently hang and stall the loop. This skill generates its own task queue from a built-in evaluation checklist and treats Playwright as an optional enhancement with cascade recovery.

## Entry

Say a trigger keyword, optionally with a one-line goal:

```
웹 루프 시작해줘 [optional one-line goal]
```

**One-time setup checklist (before cycle 1):**

1. **Plugin pre-flight** — Run §Plugin Pre-flight. Detect superpowers / gstack / OMC; install missing ones. Record availability in a local variable for the rest of this run.

2. **Branch** — Run the `kzk-autonomous-boundary` ASK-FIRST branch contract before any commit. Web-loop's default proposal: separate branch named `feature/web-loop-<goal-slug>`, PR-flow. The user can override to a different name OR direct-main / direct-no-PR if they explicitly say so. Do NOT silently create `feature/web-loop-...` without an explicit OK.

3. **Goal clarification** — If no goal is given:
   - superpowers available → `Skill("superpowers:brainstorming")` (keep to 2-3 questions max, then lock the goal)
   - gstack available (no superpowers) → `Skill("gstack:office-hours")` as alternative
   - neither available → infer from `CLAUDE.md`, `README.md`, and main entry file: `package.json` `main` field → `src/index.*` → `src/main.*`

4. **`harness-flow-progress.md`** — Create at repo root with `# harness-flow-progress` if missing.

5. **`.web-loop/`, `.web-loop/plans/`, and `.web-loop/surveys/`** — Create if missing. These are gitignored.

## Loop Structure

Each cycle executes these steps in order:

**1a. TOOL RUNNER** (`oh-my-claudecode:executor`, `model=sonnet`) — fresh subagent. Runs `npm test` (or project test command), Playwright screenshots + snapshots (if available, per §Playwright Resilience), counts console errors. Saves raw output to `.web-loop/cycle-N-report.md` (flat file directly under `.web-loop/`, e.g. `.web-loop/cycle-1-report.md`). Returns immediately after saving — does not interpret results.

**1b. EVALUATOR AGENT** (`oh-my-claudecode:critic`, `model=opus`) — fresh subagent with zero memory of previous cycles. Reads `.web-loop/cycle-N-report.md` + the built-in checklist (see §Evaluation Criteria). Outputs a prioritized issue list: P0 / P1 / P2.

**2. Pick top-priority issue** — take the highest-severity issue for which `harness-flow-progress.md` has NO line starting with `Cycle N (` that contains this issue's text (N = current cycle number). Each cycle is independent — an issue fixed in Cycle 3 may recur and be picked again in Cycle 9.

**3. Ambiguous?** — If any decision is unclear, append an entry to `docs/harness/user-queue.md` (per `kzk-user-queue` skill) with a tentative default and continue immediately. Never stop to ask the user. Use `Q-WEBLOOP-<N>-<TOPIC>` prefix for web-loop–originated entries (e.g., `Q-WEBLOOP-3-PLAYWRIGHT-DROP`).

**4a. P0 fast path** — If the issue is P0, dispatch `oh-my-claudecode:executor` (`model=sonnet`) directly with the evaluator's issue description verbatim (passed as a quoted string, not re-interpreted) + file scope + branch name + pre-commit gate rules. Implements via TDD, passes `kzk-pre-commit-gate` (6 gates: 0, 1, 1.5, 2, 3, 4 if AGENTS.md hierarchy present; 5 gates (1, 1.5, 2, 3, 4) otherwise), commits.

**4b. P1/P2 plan gate** (per `kzk-large-task-delegation` plan-critic loop requirement) — If the issue is P1 or P2:

  **superpowers available:**
  1. `Skill("kzk-codebase-survey")` — EXPLORER runs all steps (Step 0.5 + Step 1–8), saves report to `.web-loop/surveys/cycle-N-survey.md`. Report path passed to writing-plans as required reading.
  2. `Skill("superpowers:writing-plans")` — creates a frozen plan (default path: `docs/plans/YYYY-MM-DD-<topic>.md`). After the skill returns, main controller copies the plan to `.web-loop/plans/cycle-N-plan.md` so the loop's state dir stays consistent (canonical plan remains in `docs/plans/` for git tracking; in-cycle reads use `.web-loop/plans/`). Both copies are read-only after Frozen. Any plan amendment requires a new `## Frozen v2` section in `docs/plans/...` and re-copy to `.web-loop/plans/`. Prompt includes survey report path.
  3. `Skill("superpowers:subagent-driven-development")` — reads frozen plan, dispatches implementer subagent, 2-stage spec + quality review. gstack available → append `Skill("gstack:review")` as the final code review pass.
  4. Second consecutive FAIL from the same reviewer (or 3+ FAILs total across all reviewers in the same cycle) → skip issue, append to `docs/harness/user-queue.md`, pick next issue.

  **superpowers unavailable (fallback):**
  1. `Skill("kzk-codebase-survey")` — EXPLORER runs, report saved to `.web-loop/surveys/cycle-N-survey.md`.
  2. PLANNER (`oh-my-claudecode:planner`, `model=opus`) authors frozen plan → `docs/plans/YYYY-MM-DD-<topic>.md` with `## Frozen` header. Main controller copies plan to `.web-loop/plans/cycle-N-plan.md` (canonical plan stays in `docs/plans/` for git tracking). Prompt includes survey report path.
  3. CRITIC (`oh-my-claudecode:critic`, `model=opus`) reviews. Critic prompt: "Check the plan covers every item in Features to Preserve and Integration Points in the survey report. Any gap = FAIL." FAIL → planner revises once. Second consecutive FAIL from the same reviewer, or 3+ FAILs total across all reviewers in the same cycle → skip + user-queue.
  4. EXECUTOR (`oh-my-claudecode:executor`, `model=sonnet`) implements via TDD → `kzk-pre-commit-gate` → commit.

  Either path: evaluator's issue description is passed verbatim (quoted string). All dispatches include file scope + branch name + pre-commit gate rules (6 gates: 0, 1, 1.5, 2, 3, 4 if AGENTS.md hierarchy present; 5 gates (1, 1.5, 2, 3, 4) otherwise).

**5. Update `harness-flow-progress.md`** — append one line using the canonical format (see §State Persistence):
- Completed: `Cycle N (YYYY-MM-DD HH:MM) — [P-level] [issue one-liner] — queue: N remaining — PW: ok|degraded`
- Skipped: `Cycle N (YYYY-MM-DD HH:MM) — skipped — [issue one-liner] — [reason] — queue: N remaining — PW: ok|degraded`

**5.5. Cycle 회고 → gstack learn add** (Plan D)

cycle commit 직후, harness-flow-progress 갱신 다음 step 으로 회고 entry 자동 작성:

```bash
gstack learn add \
  --key "cycle-N-<axis>" \
  --type pattern \
  --insight "<evaluator paragraph 한 줄 요약>" \
  --confidence <verifier 결과 0-10> \
  --source retro
```

동시에 sidecar (`.kzk-harness/regression-meta.jsonl`) 에 append. **file_snapshot canonical source** = cycle 끝 evaluator 가 cycle 내 첫 변경 파일에 대해 `git rev-parse HEAD:<file>` 로 sentinel SHA 캡처:

```jsonl
{"key":"cycle-N-<axis>","file_snapshot":"<path>:<line>@<git rev-parse HEAD:path>","related_cycles":[N],"dismiss_count":0,"last_dismissed_at":null,"archived":false,"stale":false}
```

sidecar append 는 `install/lib/sidecar-write.mjs` 의 `mutateSidecar()` 통과 의무 (atomic write).

**gstack 미설치 시**: stderr WARN 출력 + `harness-flow-progress.md` cycle entry 본문에 `regression memory 비활성 (gstack 미설치)` 의무 표기. cycle 진행 자체는 계속 (회고 entry 만 누락).

**참조**: `kzk-regression-memory` §Cycle 회고 통합 5W1H — Where 행이 본 step. file_snapshot canonical source 정의.

**6. Back to step 1a.**

**Result narration:** Per `kzk-background-monitoring` + `kzk-playwright-verification` §Result narration, narrate 1-3 sentences after each subagent dispatch OR Skill invocation (tool runner / evaluator / brainstorming / writing-plans / subagent-driven-development / planner / critic / executor): file count / commit / phase / latest output snippet. Silence between dispatches is forbidden.

The loop runs until the user explicitly stops it. No automatic termination.

## Evaluation Criteria

The evaluator agent checks these in strict priority order. When no P0/P1 issues remain, deepen automatically: `P2 → refactor opportunities → performance → documentation gaps`. There is always something to improve.

### P0 — Fix immediately (block everything else)
- Console errors > 0
- Test suite failures (vitest or e2e)
- Build errors / TypeScript compile errors
- Layout visually broken (elements overlapping, invisible content, clipped UI)

### P1 — Fix this cycle
- Accessibility: unlabeled `<button>` or `<input>`, color contrast failing WCAG AA
- Responsive layout broken at 375 px or 768 px breakpoints
- Primary interaction with > 300 ms feedback delay (no loading indicator)
- Missing error state for form submission or async operation

### P2 — Improvement opportunities
- Cyclomatic complexity > 10 per function
- Same logic duplicated in 3+ places
- `any` types or unsafe type casts
- Spacing / color values not from the project design system tokens
- Touched files with no test coverage
- Non-obvious logic without an inline explanation

## Plugin Pre-flight

Run once at loop start (Setup Checklist step 1). Detect each plugin; **install immediately if missing** — treat like `npm install`, not a suggestion.

### Step-by-step (run in this exact order)

```bash
# 1. Get current plugin list (capture exit code; if subcommand unavailable, degrade)
if ! PLUGINS=$(claude plugin list 2>/tmp/plugin-err.txt); then
  echo "Q-PLUGIN-PREFLIGHT — claude plugin subcommand unavailable ($(cat /tmp/plugin-err.txt | head -1)), pre-flight skipped" >> docs/harness/user-queue.md
  PLUGINS=""
fi

# 2. Install missing plugins right now (only runs if plugin list succeeded)
if [ -n "$PLUGINS" ]; then
  echo "$PLUGINS" | grep -qi "oh-my-claudecode" || claude plugin install oh-my-claudecode
  echo "$PLUGINS" | grep -qi "superpowers"       || claude plugin install superpowers
  echo "$PLUGINS" | grep -qi "gstack"            || claude plugin install gstack
fi
```

If any `claude plugin install` command fails (network error, registry issue, unknown name):
1. Log to `docs/harness/user-queue.md` with the exact error and plugin name, then continue without that plugin (see graceful degradation table below)

### Session restart (only if newly installed)

Newly installed plugins require a Claude Code session restart to surface their skills. If any plugin was just installed:

1. Append to `docs/harness/user-queue.md`:
   ```
   Q-PLUGIN-RESTART — plugins installed, session restart required
   - Installed: [list of newly installed plugins]
   - Action: restart Claude Code session, then re-trigger the web loop for full plugin access
   ```
2. Continue the loop in **degraded mode** (see graceful degradation table below — same fallbacks apply as if the plugin install had failed). Do NOT halt. The degradation table covers all missing-plugin scenarios.

If all plugins were already installed → no restart needed, continue to step 2 (Branch).

### Graceful degradation (install failed despite retries)

Missing plugins never halt the loop once it's running.

| Plugin missing | Fallback |
|---|---|
| superpowers | Step 4b fallback path (raw planner/critic/executor agents) |
| gstack | Skip `gstack:review` and `gstack:office-hours` steps |
| OMC | Use `Agent(subagent_type="general-purpose")` calls |

---

## Playwright Resilience

Playwright is an **optional enhancement**. The loop continues without it.

```
① Pre-flight: ToolSearch("+browser navigate")
   → tool NOT in catalog → DEGRADED MODE immediately (skip steps ②-③)

② Call mcp__playwright__browser_navigate(url)
   → response received → proceed with screenshot + snapshot → done

   → no response / error → cascade recovery:
      Attempt 1: `claude mcp list` → if unregistered: `claude mcp add playwright npx '@playwright/mcp@latest'`
      Attempt 2: wait 10 s → retry mcp__playwright__browser_navigate once
      Attempt 3: still failing → DEGRADED MODE

DEGRADED MODE:
  • Skip visual check this cycle
  • Log "visual check unavailable, cycle N" to user-queue
  • Continue with test + code analysis only
  • Auto-retry Playwright pre-flight on next cycle
```

Playwright drop never halts the loop.

## Failure Handling

Every failure skips the current issue and picks the next one. All skipped issues are recorded in `docs/harness/user-queue.md`.

| Scenario | Recovery | True halt? |
|---|---|---|
| Build fails 3× on same issue | Skip → next issue | Only if every issue in queue fails 3× |
| Reviewer FAIL 2× on same task | Skip → next issue (overrides kzk-autonomous-loop's halt-on-reviewer-FAIL — intentional: keep the cycle moving across tasks) | No |
| Playwright MCP hangs | Cascade recovery → degraded mode | No |
| Playwright auth expired | Skip visual this cycle → continue | No |
| Rate limit (5 h window) | `ScheduleWakeup(delaySeconds=600)` → resume | No |
| Context ≥ 80 % | `/compact` → one-line restate → continue | No |
| Subagent returns BLOCKED | Skip → next issue | No |
| Git conflict | `git fetch && git rebase` → skip file if fails | No |
| Missing npm package | `npm install <pkg>` → retry | No |
| Evaluator finds no issues | Deepen criteria level → always find something | No |
| Every issue in queue blocked | Halt + user-queue summary | Yes |
| System-level failure (disk full, network down) | Cleanup temp files → retry; halt if unrecoverable | Yes (last resort) |
| User explicit stop | Immediate halt | Yes |

## State Persistence

After every cycle, append to `harness-flow-progress.md`:

```
Cycle N (YYYY-MM-DD HH:MM) — [P-level] [issue one-liner] — queue: N remaining — PW: ok|degraded
```

After `/compact`, restate in one line before the next tool call:
"Cycle N, last: [issue], queue: [N remaining], PW: [ok/degraded]"

This allows the loop to resume correctly after rate-limit wakeups and context resets.

## Subagent Dispatch Requirements

Every tool runner, evaluator, planner, critic, and executor dispatch prompt must include (per `kzk-large-task-delegation`):

- Scope: file paths + line ranges
- Branch name (never `main` — per `kzk-autonomous-boundary`)
- Required reading: `CLAUDE.md`, spec doc path, harness-share.md §25
- Rules: TDD strict, context7 mandate, `kzk-pre-commit-gate` (6 gates: 0, 1, 1.5, 2, 3, 4 if AGENTS.md hierarchy present; 5 gates (1, 1.5, 2, 3, 4) otherwise), DO-NOT-MODIFY paths
- Commit convention: English conventional commits, no Co-Authored-By
- Working directory absolute path
- Return format on success
- Halt condition: BLOCKED → user-queue entry

## Halt Conditions

Halt and append user-queue summary only when:
- User explicitly stops the loop
- Every issue in the current queue has failed 3× (nothing left to try)
- System-level failure that prevents any progress (disk full, etc.)

**Who writes the halt summary:** Main context (not a subagent). Append to `docs/harness/user-queue.md` with: cycle number, last issue attempted, failure count, and recommended next action. Then stop.

Anything else → keep going.

## Interaction with other kzk-*

- **kzk-tool-retry**: Any Edit/Write/Bash failure within a cycle gets 1 auto-retry before the failure is counted toward the 3× skip threshold. Do not count the first failure as a cycle failure.
- **kzk-pre-commit-gate**: All executor dispatches must run all applicable gates (6 if AGENTS.md hierarchy present; 5 otherwise) before committing.
- **kzk-autonomous-boundary**: All boundary conditions apply normally. The reviewer FAIL halt (defined in `kzk-autonomous-loop`) is overridden by web-loop per `harness-share.md` §25 — skip+next-issue instead of halt.
- **kzk-user-queue**: skipped issues and ambiguous decisions are appended here with Q-WEBLOOP-<N>-<TOPIC> prefix.
- **kzk-regression-memory**: cycle 끝 step 5.5 에서 `gstack learn add` 호출 + sidecar atomic append. file_snapshot = `git rev-parse HEAD:<file>` (canonical, evaluator 가 cycle 끝에 캡처). 회고 entry 자동 작성.
