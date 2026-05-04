---
name: kzk-spec-and-review
version: 2.2.0
description: "Spec/plan/major-design authoring with mandatory codex CLI cross-vendor review (Step 0 codebase-survey precondition). Top triggers: 'spec 잡자', 'plan draft', 'codex review', '여러 plan', '메타 plan'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §22 + §22.5 (Step 0 survey precondition references §26). On conflict, that wins.

# kzk-spec-and-review

## Triggers

`spec 잡자`, `spec 작성`, `spec draft`, `plan draft`, `plan 작성`, `design draft`, `major design`, `architecture review`, `codex review`, `codex consult`, `cross-verify`, `플랜 만들`, `plan 만들`, `여러 plan`, `플랜 여러개`, `메타 plan`, `meta plan`, `spec 만들`.

Codex invoked via CLI (`codex exec`) as primary; `oh-my-claudecode:critic` opus as fallback when CLI unavailable or produces no parseable output (parse fail — see §Codex execution shape).

Every meaningful design artifact gets a second opinion from a different model before it ships. Self-review and codex catch different classes of issue — both are needed.

## Step 0 — Codebase survey precondition (mandatory before drafting)

A spec / plan / design draft built without codebase context is the same root cause that `kzk-codebase-survey` exists to fix. Before the 3-pass loop runs, locate or generate a survey report for the topic.

**Lookup order:**
1. **In-session reference** — the current conversation already cites a survey report path (e.g. user pasted it, or this skill was triggered after `kzk-codebase-survey` ran in the same session). Use that path.
2. **Recent on-disk report** — glob `docs/harness/surveys/*-<topic>-survey.md`. Accept the latest if its mtime is ≤ 7 days old AND no commits have changed the surveyed file scope since the report was written (`git log --since=<report-mtime> -- <files-in-scope>` returns empty). Otherwise treat as stale.
3. **Web-loop survey** — if running under `kzk-web-loop`, check `.web-loop/surveys/cycle-<N>-survey.md` for the current cycle.

**If none found:** trigger `kzk-codebase-survey` first, capture the saved report path, then proceed to Step 1 (Draft) with the report path included in the draft prompt as `Required reading: <survey-report-path>`. Survey running cascades through `Skill("kzk-codebase-survey")` — do not draft and survey in parallel.

**Exempt from precondition** (matches the §Exempt list): typo / wording, harness-flow-progress append, retro, session-local notes. Survey adds no value to artifacts that don't touch code logic.

**Survey skip OFF** — only on explicit user "survey 빼고" / "survey skip". No silent skip. Log the skip reason in the verdict file header.

## Pattern (3-pass) — runs after Step 0

1. **Draft (me)** — main writes the spec / plan / design. Survey report path from Step 0 MUST appear in the draft prompt's CONTEXT block as "Required reading: <path>" (not just file-listed — the draft must actually cite findings from the survey).
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
# Note: check ${PIPESTATUS[0]} not $? — the pipe exit is jq's, not codex's
codex exec "$PROMPT" -C <repo-root> -s read-only \
  -c 'model_reasoning_effort="high"' --enable web_search_cached --json \
  2>/tmp/codex-err.txt | jq -rR 'fromjson? | select(.text != null or .error != null) | .text // .error // ""'
```

- `timeout: 300000` (5 min). Background-monitor per `kzk-background-monitoring`.
- No first token in 60s → retry once with stdin closed (`< /dev/null`). No first token in 5 min total → stuck, kill + fallback to critic agent.
- If stdout produces no parseable JSON lines (whether stdout is empty OR non-empty but not JSON): treat as failure. Immediately `cat /tmp/codex-err.txt` and check `${PIPESTATUS[0]}`. Save an error stub to the verdict file (path per §Verdict file convention above: "codex exit <N>, stderr: <first 200 chars>, stdout: <first 200 chars if non-empty>") then fall back to `Agent(subagent_type="oh-my-claudecode:critic", model="opus", prompt=<same review prompt>)`.

## Cost / cadence

- Per round: ~2-3 min wall, ~25-30k tokens
- 1 spec = 1 round. 1 major plan = 1 round.
- **User explicit OFF only** ("이번엔 codex 빼고") skips the loop. No silent skip.

## Artifact retention

- Codex output appears verbatim in main context during brainstorm / spec phase
- Persist meaningful reasoning to the verdict file path defined in §Verdict file convention (`docs/research/codex-reviews/<topic>-critic-review.md` for non-plan reviews; plan reviews land alongside the plan)
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
