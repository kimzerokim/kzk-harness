---
name: kzk-spec-and-review
version: 2.5.0
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

1. **Draft** — main orchestrates; actual md file writing dispatches to `oh-my-claudecode:executor` (sonnet). Prompt must include survey report path from Step 0 as "Required reading: <path>" (not just file-listed — the draft must actually cite findings from the survey). Main drafts only when ≤ 5 LoC total change (typo, single-line append).
2. **Codex consult** — run `codex exec` CLI directly (see §Codex execution shape below). CLI not available (`command not found`) or stuck per §Codex execution shape (60s no first token → retry; 5 min total → kill) → fallback: `Agent(subagent_type="oh-my-claudecode:critic", prompt=<same review prompt>)` (model 생략 → 메인 opus 버전 상속). **Both paths (CLI and fallback critic) MUST save the verdict to a named file using the Verdict file convention below — chat history alone is insufficient and does not count as the artifact.**
3. **Synthesize** — main categorizes each codex point as 🔴 즉시 fix / 🟡 spec 단계 디테일 / ⚪ push-back (cite reasons per bucket). Then dispatch revision edits per §Spec/plan revision dispatch below. Main never directly Edit/Write the md file for 2+ edits.

## Spec/plan revision dispatch (post-critic edits)

Main = orchestrator (categorize, decide). Subagent = executor (apply edits to md file).

| Revision scope | Dispatch |
|---|---|
| 1 edit, ≤ 5 LoC | Main direct OK |
| 2+ edits or 5+ LoC | `Agent(subagent_type="oh-my-claudecode:executor", model="sonnet")` |

**Executor dispatch prompt must include:**
- Full path to the md file to edit
- Critic verdict file path (for reference)
- Categorized edit list: each item = section anchor + exact change description + 🔴/🟡 tag
- "Read the target file first. Apply edits precisely at the cited sections. Do not rewrite uninvolved sections."

**Why sonnet (not haiku writer):** post-critic spec revision requires understanding technical context from the critic feedback — lock semantics, cascade logic, API contracts. Haiku lacks the depth for precise technical edits. Writer (haiku) is appropriate for standalone documentation, not spec revision.

**Anti-pattern (gridless cycle 7 incident):** main directly applied 7+ Edit operations to a spec file after critic review. Correct flow: main categorizes → builds edit list → dispatches single executor with all edits bundled.

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

## Codex execution shape (CLI best practice)

### Plain text mode (recommended for reviews)

```bash
# 1. Write prompt to file (from §Codex prompt skeleton above)
cat > /tmp/<topic>-review-prompt.txt << 'EOF'
<prompt content>
EOF

# 2. Pipe stdin → codex exec, redirect stdout to file
#    MUST use `-` arg so codex reads prompt from stdin (not shell $VAR expansion)
#    MUST use --ephemeral to avoid session file clutter
cat /tmp/<topic>-review-prompt.txt \
  | codex exec \
    -s read-only --ephemeral \
    -C <repo-root> \
    -c 'model_reasoning_effort="high"' \
    - \
    2>/tmp/codex-err.txt \
    > /tmp/codex-out.txt
CODEX_EXIT=$?

# 3. Check exit + non-empty output
if [ $CODEX_EXIT -ne 0 ] || [ ! -s /tmp/codex-out.txt ]; then
  # → fallback to critic agent
fi
```

### JSON mode (when structured parsing needed)

```bash
cat /tmp/<topic>-review-prompt.txt \
  | codex exec \
    -s read-only --ephemeral \
    -C <repo-root> \
    --json \
    - \
    2>/tmp/codex-err.txt \
    > /tmp/codex-out.json

# --json produces NDJSON (one JSON object per line), NOT a single JSON object.
# NEVER pipe --json directly to jq — always redirect to file first.
jq -r 'select(.type == "item.completed" and .item.type == "agent_message") | .item.text' \
  /tmp/codex-out.json > /tmp/codex-out.txt
```

### Hard rules

1. **Prompt via stdin pipe** (`cat file | codex exec ... -`). Never pass multi-line prompt as `codex exec "$VAR"` — shell escaping breaks on newlines, quotes, backticks.
2. **`--json` output → file → jq**. Never `--json | jq` direct pipe — codex emits NDJSON (one JSON object per line), jq expects single JSON by default and chokes.
3. **`--ephemeral`** always — prevents session file accumulation from automated runs.
4. **Short single-line prompt exception**: `codex exec "short prompt" < /dev/null` is safe. Multi-line → always use stdin pipe.
5. **Plain text mode preferred** for review use cases — simpler, no NDJSON parsing needed. Use JSON mode only when you need structured fields (token counts, thread IDs).

### Timeout + stuck detection

- `timeout: 300000` (5 min). Background-monitor per `kzk-background-monitoring`.
- No first token in 60s → kill + retry once. No output in 5 min total → stuck, kill + fallback to critic agent.
- Empty stdout or non-zero exit: save error stub to verdict file ("codex exit <N>, stderr: <first 200 chars>") then fall back to `Agent(subagent_type="oh-my-claudecode:critic", prompt=<same review prompt>)` (model 생략 → 메인 opus 버전 상속).

## Cost / cadence

- Per round: ~2-3 min wall, ~25-30k tokens
- 1 spec = 1 round. 1 major plan = 1 round.
- **User explicit OFF only** ("이번엔 codex 빼고") skips the loop. No silent skip.

## Prompt size guideline (codex CLI timeout 차단)

큰 prompt = codex stdin 대기 또는 5min stuck 위험. timeout 빈도 줄이는 룰:

- **Read 의무 = 검토 대상 plan/spec 본문 + cycle N-1 verdict 정제 file 만**. sister plan / spec 다른 본문은 *context only* (인용 / locked decision 만 prompt 안에 박음, full read 안 시킴).
- **prompt 본문 < 500 lines**. 12 카테고리 → 6-8 max.
- **응답 형식 < 700 단어**. "각 항목 짧은 진단 + 권고" 명시.
- **plan 본문 자체가 1500+ LoC** 면 codex 가 read 만 5+ 분 → 미리 핵심 변경 부분만 발췌해서 prompt 에 inline. plan 전체 read 시키지 않음.
- timeout (60s no first token, 5min total) 발생 시 fallback critic opus.

지표: codex prompt 가 다음 중 하나 trigger 면 size 줄임 후 재시도:
- prompt 자체 > 800 lines
- "Read 의무" 가 4+ 파일
- 검증 카테고리 12+

본 룰은 사용자 명시 (cycle 33) — codex 에 plan 넘길 때 작게.

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
