---
topic: kzk-global-install-plan
reviewer: critic-opus
date: 2026-05-04
codex_status: parallel-consult-(see-codex-out.jsonl-snapshot)
spec_review: docs/research/codex-reviews/kzk-global-install-critic-review.md
plan: docs/plans/2026-05-04-kzk-global-install.md
---

# kzk-global-install Plan — Critic Review

## VERDICT: 🟡 REVISE

Pre-commitment 5/5 — escalated to ADVERSARIAL. One CRITICAL bug (AC5 jq query references a JSON shape that does not exist; empirically verified `claude -p ... --output-format json` returns `{type:"result",result:"..."}` not `.messages`), five MAJOR (stub helper bodies, missing `enable_hooks()`, AC8 INCONCLUSIVE escape, AC4 cleanup-as-prose, omc regex escape), two MINOR (spec curl-pipe drift vs README, AC2 escape).

## Axis 1 — Plan-author 5 challenge points

1. **AC8 INCONCLUSIVE → HALT (re-affirm).** Allow `--ac8-attested-by-user "<typed-string>"` flag that writes Q-AC8-MANUAL to `docs/harness/user-queue.md` AND requires literal date-string match. Default remains halt.
2. **`bash <(curl ...)` MITM → P1 not P0.** README must publish `git clone + bash install/install-global.sh` only. Spec §7.1 still has the curl-pipe form — drift; document in plan §1.
3. **`flock` necessity → keep at P2 with R-PLAN-3 implementation.** 2-line cost, cheap insurance, real-world race rare.
4. **AC5 ≤ 4 vs ≤ 2 → ≤ 4 with per-call file_path logging.** Threshold of count alone is insufficient; FAIL if any read path matches `(^|/)src/|(^|/)app/|(^|/)lib/` even when count ≤ 4.
5. **Symlink-mode SOURCE_REPO_DIR → REFUSE not loud-print.** Multi-checkout detection: `find $HOME -maxdepth 6 -type d -name .git -path '*/kzk-harness/.git'`; > 1 → exit 2 unless `--symlink-mode-force`.

## Axis 2 — Sonnet executor readiness

| Task | Verdict | Top failure mode |
|---|---|---|
| A install-global.sh | 🟡 NEEDS-DETAIL | `claude_md_extract_block`/`_strip_block`/`_inject_block` are `{ ... }` stubs; `enable_hooks()` called but not defined |
| B uninstall-global.sh | ✅ READY | inherits A's marker helper |
| C README rewrite | ✅ READY | verbatim citations of line numbers |
| D dependencies.sh --skip-project | ✅ READY | 30 LoC additive flag |
| E verify-install.sh | 🔴 OPUS-ONLY | AC5 jq broken (C1); AC1 brittle freeform parse; AC4 cleanup as prose |
| F kzk-pre-merge-sync verification | 🟡 NEEDS-DETAIL | skill has no `--dry-run` shape; replace with concrete subagent prompt |

## Axis 3 — AC verifiability

- AC1 🟡 partial — instruct claude to start with literal `SKILL_MATCHED:<name>` marker
- AC2 ✅ awk + grep -cE concrete
- AC3 ✅ sha256sum diff concrete
- AC4 🟡 cleanup discipline missing
- AC5 🔴 NOT verifiable as written (jq references nonexistent shape)
- AC6 ✅ snapshot-and-diff concrete
- AC7 ✅ add+remove+update sequence concrete
- AC8 🟡 "fresh Claude session" undefined; require `--session-id $(uuidgen)` and discriminator-quoted prompt

## Axis 4 — Dispatch order

Plan said "D + A parallel" but A's Step 7 invokes `dependencies.sh --skip-project`. If A ships first, dependencies.sh:14 `PROJECT_ROOT="${1:-$(pwd)}"` treats `--skip-project` as positional arg. Revised order:
1. AC8 probe (extract from E)
2. Task D (sequential before A — pre-req for A's Step 7)
3. Task A (sequential after D)
4. Task B (sequential after A)
5. Task C (parallel-safe with A/B — different files)
6. Task E (sequential after A+B+C+D)
7. Task F (sequential after E)

## Axis 5 — P0/P1/P2

### CRITICAL
**C1. AC5 jq query references nonexistent JSON shape** — `claude -p "..." --output-format json` returns `{"type":"result","subtype":"success","result":"...","duration_ms":...}` with no `.messages` field. Verified empirically. Stream-json `--verbose` emits per-event lines `{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read",...}]}}` — line-delimited, not `.messages` array. AC5 is silent always-pass as written. Fix: replace with
```
claude -p '<prompt>' --output-format stream-json --verbose 2>/dev/null \
  | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Read") | .input.file_path' \
  | tee /tmp/kzk-ac5-reads.log \
  | wc -l
```
FAIL on count ≥ 5 OR any path in log matching `(^|/)src/|(^|/)app/|(^|/)lib/`.

### MAJOR (5)
**M1. `enable_hooks()` called but undefined** (plan line 272 calls `enable_hooks` but no function body; sonnet will fabricate non-atomic settings.json edit).
**M2. Marker helpers stubbed** (`claude_md_extract_block`/`_strip_block`/`_inject_block` are `{ ... }`; need ~30 lines awk + mktemp + mv discipline).
**M3. AC8 INCONCLUSIVE escape missing** (CI sandbox / fresh machine without `claude` in PATH → install deadlock; promote OQ1 to binding rule).
**M4. AC4 cleanup as prose** (Plan line 583 "revert harness-share.md" — sonnet leaves dirty tree; wrap in bash trap or backup-restore).
**M5. omc regex escape ambiguity** (heredoc form `\\b` vs raw `\b` — clarify which form goes where).

### MINOR (2)
**Mn1. spec §7.1 curl-pipe drift** (plan adopts git-clone but spec is frozen with curl-pipe; document supersession in plan §1).
**Mn2. AC2 awk quoting in bats** (cosmetic; heredoc-wrap if used).

## What's missing
- Rollback for partial Task A failure (sync_skills succeeds + update_claude_md_routing fails → 14 dirs no routing).
- G2 boundary runtime guard (no test confirming no writes outside $HOME/.claude/).
- omc OMC:START block byte-diff test (assert kzk install+uninstall preserves omc routing exactly).
- Symlink-mode VERSION fallback when no git tag.
- install/AGENTS.md seed at end of plan execution.

## Top 3 must-fix
1. AC5 jq query (C1) — empirically broken, silent failure mode, exact replacement provided above.
2. Stub helpers + enable_hooks (M1+M2) — ~50 lines of bash with mktemp+mv discipline; reference gstack setup.
3. Dispatch order D before A — A consumes D's flag; revise §5 line 750 to sequential.

## Top 3 nice-to-have
1. `--ac8-attested-by-user` flag for CI/fresh-machine paths.
2. AC4 cleanup as bash trap not prose.
3. install/AGENTS.md seed task.

## Frozen-readiness
Structurally excellent — file-line discipline, DO-NOT deltas, explicit tests. One verifier bug + four plan-detail gaps. ~80-line plan diff, ~75 min opus revision time. Post-fix: sonnet-ready for A/B/C/D/F; Task E should remain opus due to live-CLI brittleness.
