---
name: kzk-codex-cross-verification
version: 1.0.2
description: "Codex cross-verification mandate — every spec / plan / major design draft must pass a 3-pass loop (draft → codex consult → synthesize) before reaching the user or the next phase. Use whenever authoring or majorly editing PRD, plan, architecture, ORM/framework decision, refactor scope, security/permission model, or DB schema change. Required triggers: 'codex review', 'cross-verify', 'spec draft', 'plan draft', 'major design', 'architecture review'."
---

> Authoritative source: `harness-share.md` §22. On conflict, that wins. Codex invoked via CLI (`codex exec`) as primary; `oh-my-claudecode:critic` opus as fallback when CLI unavailable.

# kzk-codex-cross-verification

Every meaningful design artifact gets a second opinion from a different model before it ships. Self-review and codex catch different classes of issue — both are needed.

## Pattern (3-pass)

1. **Draft (me)** — main writes the spec / plan / design.
2. **Codex consult** — run `codex exec` CLI directly (see §Codex execution shape below). CLI not available (`command not found` or exit code 2 / 0-byte stuck within 30 s) → fallback: `Agent(subagent_type="oh-my-claudecode:critic", model="opus", prompt=<same review prompt>)`. Save the verdict to a named file (chat history alone is insufficient).
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

- `docs/plans/<plan-name>-critic-review.md` for cycle 1
- `docs/plans/<plan-name>-critic-review-2.md` for cycle 2 (if a cycle 2 is needed)
- The cycle counter source-of-truth = the file artifact. Reproducibility across sessions.
- Cycle 2 prompt must reference the cycle 1 file verdict.

## Codex prompt skeleton

```
IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/,
.claude/skills/, or agents/. Stay focused on design content below.

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
codex exec "$PROMPT" -C <repo-root> -s read-only \
  -c 'model_reasoning_effort="high"' --enable web_search_cached --json \
  2>/tmp/codex-err.txt | PYTHONUNBUFFERED=1 python3 -u -c "import sys,json; [print(json.loads(l).get('text','')) for l in sys.stdin if l.strip().startswith('{')]"
```

- `timeout: 300000` (5 min). Background-monitor per `kzk-background-monitoring`.
- 30 sec to first token. 5 min 0 byte = stuck — kill + retry with smaller prompt or stdin closed (`< /dev/null`).

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

- **kzk-large-task-delegation §"Pre-implementation plan-critic loop"** is a *narrower* version of this skill, scoped to plans that feed the sonnet executor. This skill is broader — covers spec / architecture / design too. Cross-reference, do not duplicate.
- **kzk-background-monitoring** governs the codex consult call itself (long-running CLI).
