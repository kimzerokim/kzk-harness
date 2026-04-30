---
name: kzk-user-queue
version: 1.0.0
description: "user-queue protocol — append entries with tentative defaults during autonomous runs, parametrize so user can override cheaply, then run interactive 1-by-1 review (Stage 1/2/3) when user returns. Required triggers: 'user-queue', 'Q-PLAN', 'Pending', 'Resolved', 'DECISION', 'Interactive Queue Review', 'Stage 3', '모호 결정'."
---

> Authoritative source: repo `CLAUDE.md` "User Queue 운용" + "Interactive Queue Review Protocol" + `harness-share.md` §6. On conflict, those win.

# kzk-user-queue

Path: `docs/harness/user-queue.md`. Two sections: `## Pending` and `## Resolved`. Git-tracked.

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

Detail: `docs/harness/ralph-items.md` "Stage 3 — User Queue Resolution Loop"

## Anti-patterns

- Hardcoding the tentative default (no flag) — user override = expensive rollback
- Not appending the entry but proceeding silently — user has no record of the call
- Re-asking the same Q-* across sessions — already in `## Resolved`
