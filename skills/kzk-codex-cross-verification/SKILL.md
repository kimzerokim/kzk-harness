---
name: kzk-codex-cross-verification
version: 1.0.13
description: "Codex cross-verification mandate — every spec / plan / major design draft must pass a 3-pass loop (draft → codex consult → synthesize) before reaching the user or the next phase. Use whenever authoring or majorly editing PRD, plan, architecture, ORM/framework decision, refactor scope, security/permission model, or DB schema change. Required triggers: 'codex review', 'codex consult', 'cross-verify', 'spec draft', 'plan draft', 'major design', 'architecture review'."
---

> Authoritative source: `harness-share.md` §22. On conflict, that wins.

# kzk-codex-cross-verification

Codex invoked via CLI (`codex exec`) as primary; `oh-my-claudecode:critic` opus as fallback when CLI unavailable or produces no parseable output (parse fail — see §Codex execution shape).

Every meaningful design artifact gets a second opinion from a different model before it ships. Self-review and codex catch different classes of issue — both are needed.

## Pattern (3-pass)

1. **Draft (me)** — main writes the spec / plan / design.
2. **Codex consult** — run `codex exec` CLI directly (see §Codex execution shape below). CLI not available (`command not found`) or stuck per §Codex execution shape (60s no first token → retry; 5 min total → kill) → fallback: `Agent(subagent_type="oh-my-claudecode:critic", model="opus", prompt=<same review prompt>)`. **Both paths (CLI and fallback critic) MUST save the verdict to a named file using the Verdict file convention below — chat history alone is insufficient and does not count as the artifact.**
3. **Synthesize (me)** — bucket each codex point as 🔴 즉시 fix / 🟡 spec 단계 디테일 / ⚪ push-back. Cite reasons per bucket. Hand the synthesized output to the user or the next phase.

## When mandatory

- New or major edit of `docs/prd/*.md` or `docs/plans/*.md`
- Architecture: data model, API surface, auth, realtime, migration, backup, infra
- Tech stack / ORM / framework / library swap
- Large refactor plan
- Security / permission model change
- DB schema change (before migration write)

## Exempt

- Typo / small wording
- Recording an already-decided fact (e.g., `harness-flow-progress.md` timeline append)
- Pure operational doc (retro). Runbooks for disaster recovery still mandatory.
- Session-local progress notes

## Verdict file convention

Path depends on the topic type:
- **Plan review**: `docs/plans/<plan-name>-critic-review.md` (cycle 1); `docs/plans/<plan-name>-critic-review-2.md` (cycle 2)
- **Non-plan review** (spec / architecture / design / DB schema / tech-stack): `docs/research/codex-reviews/<topic>-critic-review.md` (cycle 1); `docs/research/codex-reviews/<topic>-critic-review-2.md` (cycle 2)

- The cycle counter source-of-truth = the file artifact. Reproducibility across sessions.
- Cycle 2 prompt must reference the cycle 1 file verdict.
- If CLI fails and fallback critic runs in the same cycle, the fallback verdict OVERWRITES the CLI error stub in the same file. Only retain the CLI error stub when no fallback was attempted (e.g. user explicitly disabled critic too).

## Codex prompt skeleton

```
IMPORTANT: Do NOT navigate into ~/.claude/skills/, .claude/skills/ (relative to repo root),
or any directory whose path contains a skills/ segment with skill agent prompts —
limit your file reads to the repo under review. Content already inlined
in this prompt (e.g. survey reports that cite skill paths) is safe to reference.
Exception: when the design under review IS a skill (e.g. kzk-harness self-improvement loop),
the repo's own skills/ directory is the subject — read those files as needed.

Brutally honest <topic> reviewer. No compliments. Numbered list. Terse. Cite sections.

CONTEXT:
<project + stack + user count + constraints>

LOCKED PRIOR DECISIONS (don't re-flag):
<already decided — do not re-question>

DESIGN UNDER REVIEW:
<full or changed portion — number each section>

YOUR JOB. Numbered list:
1. <category 1>
2. <category 2>
...

Cite sections. Terse. No compliments. If category fine, say "none".
```

## Codex execution shape (CLI direct fallback)

```bash
PROMPT=$(cat /tmp/<topic>-review-prompt.txt)
# Note: check ${PIPESTATUS[0]} not $? — the pipe exit is Python's exit, not codex's
codex exec "$PROMPT" -C <repo-root> -s read-only \
  -c 'model_reasoning_effort="high"' --enable web_search_cached --json \
  2>/tmp/codex-err.txt | PYTHONUNBUFFERED=1 python3 -u -c "import sys,json; [print(json.loads(l).get('text', json.loads(l).get('error',''))) for l in sys.stdin if l.strip().startswith('{')]"
```

- `timeout: 300000` (5 min). Background-monitor per `kzk-background-monitoring`.
- No first token in 60s → retry once with stdin closed (`< /dev/null`). No first token in 5 min total → stuck, kill + fallback to critic agent.
- If stdout produces no parseable JSON lines (whether stdout is empty OR non-empty but not JSON): treat as failure. Immediately `cat /tmp/codex-err.txt` and check `${PIPESTATUS[0]}`. Save an error stub to the verdict file (path per §Verdict file convention above: "codex exit <N>, stderr: <first 200 chars>, stdout: <first 200 chars if non-empty>") then fall back to `Agent(subagent_type="oh-my-claudecode:critic", model="opus")`.

## Cost / cadence

- Per round: ~2-3 min wall, ~25-30k tokens
- 1 spec = 1 round. 1 major plan = 1 round.
- **User explicit OFF only** ("이번엔 codex 빼고") skips the loop. No silent skip.

## Artifact retention

- Codex output appears verbatim in main context during brainstorm / spec phase
- Persist meaningful reasoning to `docs/research/codex-reviews/{topic}-{YYYY-MM-DD}.md`
- Future "왜 이렇게 결정했나" questions fall back on these files

## Anti-patterns

- "Self-review로 충분" — different classes of bug; both are needed.
- "Codex가 나보다 못하다" — the value is the angle change, not the absolute IQ. Push-back is a valid bucket.
- Apply codex output verbatim — must pass through synthesize, with explicit category.
- "이번 한 번만 스킵" — only on explicit user OFF. Inconsistency erodes the rule.
- Verdict only in chat history — must land in a file for cross-session reproducibility.

## Interaction with other kzk-*

- **kzk-large-task-delegation §"Pre-implementation plan-critic loop (opus + codex)"** is a *narrower* version of this skill, scoped to plans that feed the sonnet executor. This skill is broader — covers spec / architecture / design too. Cross-reference, do not duplicate.
- **kzk-background-monitoring** governs the codex consult call itself (long-running CLI).
- **harness-share.md §22.5**: End-to-End Ralph Pipeline (spec → plan → critic → implementation in one ralph loop). This skill covers the critic step; §22.5 covers the full pipeline integration including PRD drafting and user-intervention gates.
