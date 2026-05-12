---
name: kzk-regression-memory
version: 1.6.0
description: "Regression memory auto-recall via UserPromptSubmit hook on fix start. gstack /learn JSONL primary + sidecar (dismiss_count, stale, archived). Decay confidence × 0.85^dismiss. Triggers: 'regression memory', '재발 방지', 'fix recall'. Default DISABLED until pre-merge-sync step 3. References harness-share.md §29."
---

> Authoritative source: `harness-share.md` §29. On conflict, that wins.

# kzk-regression-memory

## Why

Regression amnesia is one of five meta-gaps in the autonomous/self-improvement cycle. Even when past fix records exist, they are not retrieved at fix-start time. This skill matches fix-start prompts, auto-recalls relevant history, and tracks user dismiss actions through to archive.

## Storage model

**Backend = gstack /learn JSONL (project-scoped, ~/.gstack/projects/{slug}/learnings.jsonl):**

| field | type | semantics |
|---|---|---|
| `key` | string | bug-slug (FK to sidecar) |
| `type` | enum | `pitfall` \| `pattern` \| `architecture` |
| `insight` | string | one-line summary + root cause + fix location |
| `confidence` | int 0-10 | verifier result |
| `source` | enum | `fix` \| `review` \| `retro` |

**Sidecar = project-local (.kzk-harness/regression-meta.jsonl) — 7 fields:**

| field | type | semantics |
|---|---|---|
| `key` | string | 1:1 FK matching `/learn` key |
| `file_snapshot` | string | `<path>:<line>@<commit-SHA>`. Canonical source = evaluator's `git rev-parse HEAD:<file>` result at end of cycle |
| `related_cycles` | int[] | cycle numbers |
| `dismiss_count` | int | cumulative dismiss count (incremented only by CLI mutation) |
| `last_dismissed_at` | ISO8601 \| null | timestamp of most recent dismiss |
| `archived` | bool | true → excluded from recall results. Auto-set to true when `dismiss_count >= 3` (CLI mutation responsibility) |
| `stale` | bool | true → file_snapshot SHA mismatch (updated by regression-stale-check.sh). Promoted to 7th schema field (rev1 in-memory-only rule retired — disk storage OK, sidecar is own SoT) |

**Sidecar is a metadata extension with its own SoT for dismiss + stale state** — not a derived view. Both `dismiss_count` and `stale` originate from user/hardware actions and cannot be reconstructed from `/learn`. Sidecar is git-tracked. On loss, only dismiss/decay/stale reset — `/learn` data is preserved.

**FK rule**: every `key` in the sidecar must exist in `/learn`. Absent entries are invalid → orphan cleanup rules apply (see below).

## Recall rules

When the UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) fires:

1. Evaluate self-skip guard (see §Self-skip guard) — skip immediately on match
2. **Normalize** user prompt: `prompt.slice(0, 200)` + whitespace split + FIX_KEYWORDS / regex-based keyword extraction. Never use the raw full prompt (codex answer #4)
3. `direct JSONL read from ~/.gstack/projects/*/learnings.jsonl` (hook reads files directly, no CLI)
4. **gstack not installed**: `querylearn()` returns `_warn:"gstack-learnings-not-found"` structured reason. Emit stderr WARN. Zero results injected. Silent skip forbidden (codex answer #7)
5. Sidecar JSONL grep — fetch `dismiss_count`, `archived`, `last_dismissed_at`, `stale` for each hit
6. **Decay formula**: `confidence_decayed = confidence * (0.85 ** dismiss_count)`. Floating point.
7. Filters:
   - `archived: true` → exclude
   - `confidence_decayed < 4` → exclude
8. **Orphan cleanup** (codex answer #4 — separate `searchHits` vs `allLearnKeys`):
   - **searchHits** = keys from current query results only
   - **allLearnKeys** = `direct JSONL read — collect all key fields from ~/.gstack/projects/*/learnings.jsonl`
   - Cleanup uses `allLearnKeys` snapshot only — sidecar entry whose key is absent from `allLearnKeys` → auto-delete + stderr log (`[regression-recall] orphan key removed: <key>`). Normal entries not matched by the current query are preserved.
9. Inject remaining hits as a system-reminder:
   ```
   🚨 [REGRESSION RECALL] 과거 유사 fix N건:
   - <key>: <insight> (cycle <N>, confidence_decayed <X.XX>) [⚠ stale if SHA mismatch]
   ⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.
   dismiss: kzk-regression-memory dismiss <key>  (sidecar dismiss_count++)
   ```

Zero matches → `{"continue":true}` (silent pass-through; `_warn` attached if gstack plugin not installed or `~/.gstack/projects/` absent)

## Dismiss/Archive CLI mutation path (codex answer #1)

New CLI: `install/bin/kzk-regression-memory.mjs`

**Usage**:
```bash
node install/bin/kzk-regression-memory.mjs dismiss <key>
```

**Behavior**:
1. Find matching entry by `key` in the sidecar (`.kzk-harness/regression-meta.jsonl`)
2. Not found → stderr error + exit 1
3. Mutate the matched entry:
   - `dismiss_count++`
   - `last_dismissed_at = new Date().toISOString()`
   - `archived = (dismiss_count >= 3)` (spec rev6 lock — line 29)
4. Use the **shared atomic writer** (`install/lib/sidecar-write.mjs`) — lockdir + tmp + atomic mv (codex answer #6)
5. Print result to stdout: `dismissed: <key> (count=<N>, archived=<bool>)`

**Why**: rev1 only mentioned the `dismiss` command without implementing mutation. `dismiss_count` / `last_dismissed_at` / `archived` were dead fields → spec/plan split-brain. Adding the CLI mutation path eliminates dead fields.

## Self-skip guard

Do not inject when the main prompt is part of an autonomous/self-improvement cycle.

> See harness-share.md §33 Autonomous-mode Detection SoT (Category B).
> This hook: skip immediately when Category B verb phrase or `KZK_HARNESS_SELF_IMPROVEMENT=1` / `KZK_AUTONOMOUS=1` matches.

Reason: if the recall hook fires during a self-improvement cycle, the injection contaminates the cycle's own progress and blocks autonomous continuation.

## Cycle retrospective integration (5W1H)

| W | Detail |
|---|---|
| Who | The party writing the cycle entry to `harness-flow-progress.md` (main context or evaluator subagent). If subagent, the dispatch prompt must include a log-call obligation. |
| When | Immediately after cycle commit, in the step following `harness-flow-progress.md` update |
| What | 1 entry per cycle. `key=cycle-<N>-<axis>`, `type=pattern`, `insight=<one-line summary>`, `confidence=<verifier result>`, `source=retro` |
| How | `Skill("learn") invocation in conversation context (gstack /learn skill — NOT CLI)`. Sidecar simultaneously appends `key`, `file_snapshot=<path>:<line>@<git rev-parse HEAD:path>`, `related_cycles=[N]`, and remaining fields at default. **Use sidecar atomic writer** (codex answer #9) |
| On failure | gstack plugin not installed or `~/.gstack/projects/` absent → emit stderr WARN at cycle commit time + mark cycle body "regression memory inactive (gstack not installed)". Silent skip forbidden. Cycle itself continues (only retrospective entry is missing) |
| Where (kzk-web-loop) | Extract from evaluator result paragraph at the end of a `kzk-web-loop` cycle. `file_snapshot` canonical source = evaluator captures sentinel SHA via `git rev-parse HEAD:<file>` |

## Stale check

`install/scripts/regression-stale-check.sh`:

- Run timing: cron (user's choice) or one-shot at cycle end (hooked from kzk-web-loop etc.)
- Compare `file_snapshot` SHA of each entry against HEAD → detect file deletion/modification
- On change detected: print stale flag to stderr, update the `stale` 7th field in sidecar atomically (via lib/sidecar-write). No automatic archive (user decision)
- Recall hook reads the `stale` field from sidecar — live `git blame` in the hook path is forbidden (performance)

## Default DISABLED policy

> See `kzk-pre-merge-sync` §3 for the enable gate, fail-closed verification, and user-confirm protocol (auto-enable after 5 plans complete; jq absent or duplicate entry → merge block).

## Rollback (7 levels — codex answer #10)

| Level | Mechanism |
|---|---|
| Single plan revert | `git revert <Plan-D-commit-sha>` |
| Immediate hook disable | `OMC_SKIP_HOOKS=regression-recall` |
| Immediate skill disable | `DISABLE_OMC=kzk-regression-memory` |
| Cycle self-recovery impossible | Remove hook entry from settings.json manually |
| Sidecar loss | dismiss_count + stale reset only — `/learn` data preserved |
| Plan D self-contamination | Hook is default DISABLED so no immediate threat. If found after enable: `OMC_SKIP_HOOKS=regression-recall` immediately |
| **Global install artifact cleanup** | Remove `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + clean duplicate `UserPromptSubmit` entry in settings.json (`uninstall-global.sh --regression-recall` reverse path, or jq command: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |

## Interaction with other kzk-*

- **kzk-pre-merge-sync**: final step calls `--enable-hooks --regression-recall` automatically (with user confirm). Prevents first-enable amnesia. Fail-closed.
- **kzk-web-loop**: step 5.5 calls `Skill("learn") (gstack /learn skill)` at cycle end — writes retrospective entry automatically. gstack plugin not installed or `~/.gstack/projects/` absent → stderr WARN. `file_snapshot` canonical = `git rev-parse HEAD:<file>`.
- **kzk-large-task-delegation**: recall results are injected into subagent dispatch prompts. Fix-start recall = subagents also receive recall results. **Size cap 200 chars** — truncate + warning on overflow.
- **kzk-fix-scope-expansion** (Plan B): reads recall results as a consumer — the fix-start hook fires after Plan D.
- **kzk-autonomous-boundary**: self-skip guard greps for autonomous-mode verb phrases + `KZK_AUTONOMOUS=1` env — prevents self-contamination of autonomous cycle main prompts.
