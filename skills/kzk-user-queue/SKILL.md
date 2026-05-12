---
name: kzk-user-queue
version: 1.4.0
description: "Autonomous-run ambiguous-decision queue at docs/harness/user-queue.md. Append Pending entry with tentative default and proceed — never halt. On user return: Stage 1 classify A/B/C, Stage 2 GROUP A interactive, Stage 3 resolution loop max 3. References harness-share.md §6."
---

> Authoritative source: `harness-share.md` §6. On conflict, that wins.

# kzk-user-queue

## Append-during-autonomous protocol

Ambiguous decision encountered during autonomous run:

1. Append a Pending entry (template below)
2. Pick a **tentative default** and proceed — do not stop. ("너가 실행해놔야 내가 유저 큐를 보지" rule)
3. Implement the decision via **flag / config / parameter**, not hardcoded. So override = config flip, not rollback
4. In subagent prompt: "이 결정은 user-queue entry #N 기준 잠정. 사용자가 뒤집을 수 있게 parametrize 해서 구현해라"

## Entry template

```markdown
### Q-<TOPIC> — <one-line summary>

- **Context**: <situation + why decision needed>
- **Options**:
  1. <option 1>
  2. <option 2>
  3. <option 3>
- **Tentative default**: <option N> — <reason>
- **Override mechanism**: append `**DECISION (YYYY-MM-DD):** Option N` at the bottom of this entry
- **Impact**: <forward-only? rollback cost? blast radius?>
```

## Interactive Queue Review (when user returns)

Three-stage protocol. Do not enter dogfood / next-Plan until Stage 1 + 2 finish.

### Stage 1 — classify Pending entries into 3 groups

- **GROUP A** — default already applied to code. Override = rollback cost
- **GROUP B** — actually pending (no current effect, can wait until next Plan)
- **GROUP C** — gate for a future Plan (no decision needed now)

### Stage 2 — GROUP A interactive 1-by-1

Highest-impact first (behavior > API > UX > refactor > tooling). For each entry, one `AskUserQuestion`:

- Format: "Q-N — <context one line>. Current default: <Option>. Override?"
- Options: accept / override to Option X / explain in detail / skip

On user response:

1. Append `**DECISION (YYYY-MM-DD):** <choice>` to that entry
2. "accept" entries → bulk-move to `## Resolved`
3. "override" → file rollback/forward task as a NEW user-queue entry, dispatch to subagent

GROUP B / C stay labeled "후속 plan 시점 재확인".

### Stage 3 — Resolution Loop (after user appends DECISIONs)

User commit appends DECISIONs → kick a Stage-3 iteration:

- Apply Resolved decisions to affected artifacts (PRD / plan / code)
- Max **3 iterations** (infinite-loop guard)
- Same entry processed twice OR DECISIONs conflict → move to `## Escalated` section + separate user session

## Anti-patterns

- Hardcoding the tentative default (no flag) — user override = expensive rollback
- Not appending the entry but proceeding silently — user has no record of the call
- Re-asking the same Q-* across sessions — already in `## Resolved`

## Interaction with other kzk-*

Queue producers — skills that append entries to `docs/harness/user-queue.md`:

- **kzk-tool-retry**: Q-TOOL entries (Edit/Write retry exhaustion).
- **kzk-test-coverage**: Q-COV entries (coverage exemption requests).
- **kzk-web-loop**: Q-WEBLOOP and Q-PLUGIN entries.
- **kzk-codebase-survey**: Q-INSTALL entries (code-review-graph install failures).
- **kzk-production-access**: Q-PROD entries (destructive AWS/DB operations).
- **kzk-background-monitoring**: Q-SUBAGENT entries (subagent stuck-or-empty).
- **kzk-autonomous-boundary**: Halts append here when autonomous mode pauses.
- **kzk-autonomous-boundary** (Q-TDD-MAIN): 자율 mode 에서 메인 컨텍스트가 TDD red 직접 진입 시도.
- **kzk-autonomous-boundary** (Q-MAIN-DIRECT-EDIT): 자율 mode 에서 메인 컨텍스트 직접 multi-file edit.
- **kzk-autonomous-boundary** + **kzk-large-task-delegation** + **kzk-pre-commit-gate** (Q-VERIFIER-FAIL): verifier 2회 연속 FAIL.
- **kzk-autonomous-boundary** + **kzk-large-task-delegation** + **kzk-pre-commit-gate** (Q-VERIFIER-INVALID): verifier 응답 `VERDICT:` prefix 누락.
- **kzk-autonomous-boundary** + **kzk-large-task-delegation** + **kzk-pre-commit-gate** (Q-VERIFIER-DISPATCH-FAIL): verifier subagent dispatch 실패.
- **kzk-codex-handoff** + **kzk-autonomous-boundary** (Q-CODEX-DISPATCH-FAIL): codex subagent dispatch 실패.
- **kzk-production-access** + **kzk-pre-commit-gate** (Q-PROD-CODE-FIRST-<TOPIC>): 프로덕션 state 변경 code-first check 실패.
- **kzk-fix-scope-expansion** (Q-FIX-PIVOT-FAIL): 모든 레이어 escalate 후에도 fix 실패 (cycle 47 신규).
