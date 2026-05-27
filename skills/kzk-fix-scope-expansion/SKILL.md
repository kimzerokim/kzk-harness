---
name: kzk-fix-scope-expansion
version: 1.7.0
description: "Fix scope expansion + Gate 4.5 callsite sanity. Cross-ref invoked from kzk-codebase-survey on fix-start flows. Direct triggers: 'callsite 전수', 'Gate 4.5', 'fix-scope-cache', 'KZK_GATE45_SKIP', 'callsite 누락', 'endpoint 삭제', 'endpoint deletion', 'deprecate', 'deprecated', 'removed in cycle', 'removed in phase', '@deprecated', 'API 폐지', 'API removal'. Default DISABLED until kzk-pre-merge-sync step 3. References harness-share.md §3.5."
---

> Authoritative source: harness-share.md §3.5. On conflict, that wins.

# kzk-fix-scope-expansion

## Why

**Fix scope leakage** is a meta-gap in AI autonomous execution cycles: one callsite is patched while other files calling the same function are missed. Plan B (spec rev7 Axis B) blocks this.

Two entry points:
1. **fix-start hook** — detects fix intent on UserPromptSubmit → sweeps all callsites → injects system-reminder
2. **fix-verify manual self-check** — after Edit + test complete, run callsite grep manually

Pre-commit **Gate 4.5** is the final sanity check.

## Fix-start hook

### Trigger rules

`install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit):

1. `hook-shared.shouldSkip(prompt, env)` → if skip reason found, return `{continue:true}` immediately
2. `hook-shared.detectFixIntent(prompt)` → if false, return `{continue:true}` immediately (non-fix silent pass)
3. Symbol extraction (from prompt):
   - backtick pattern: `` `functionName` ``
   - camelCase word (length ≥ 4, contains uppercase)
   - `functionName()` pattern
   - snake_case word
4. **API deprecation flow**: when the prompt contains any of `endpoint 삭제` / `deprecate` / `removed in cycle` / `@deprecated` / `폐지` / `삭제 예정`, treat as fix-start. Skip symbol extraction from prompt; instead extract the endpoint path pattern directly (e.g., `/api/cells/:id`) and use it as the grep search term. CRG command (preferred): `code-review-graph detect-changes --base HEAD~1`. grep fallback: `grep -rn "api/cells\|PATCH.*cells" --include='*.{ts,tsx}' --exclude-dir={node_modules,.git,docs}`
5. If CRG available: run `code-review-graph detect-changes`. On failure/not-installed → grep fallback
6. Capture callsite list → 200 char truncation
7. Append to `.kzk-harness/fix-scope-cache.jsonl` via `writeSingleEntryWithLock(path, commitSHA, callsiteList)`
8. Inject system-reminder

### hook-shared import requirement

```js
import { shouldSkip, detectFixIntent, FIX_KEYWORDS } from '../lib/hook-shared.mjs';
import { writeSingleEntryWithLock } from '../lib/cache-write.mjs';
```

Do not define independent `FIX_KEYWORDS` / `shouldSkip` — hook-shared is the single SoT.

### CRG signature (Task 0 confirmed)

```bash
code-review-graph detect-changes --base HEAD~1
```

`--symbol`, `--file`, `query`, `blast-radius` subcommands do not exist — do not use.

### grep fallback

When CRG is not installed or fails:

```bash
grep -rn <symbol> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}
```

`docs/` exclusion is mandatory — prevents callsite contamination from documentation mentions.

### cache location

`.kzk-harness/fix-scope-cache.jsonl` (JSONL append, key=commit SHA, value=callsite list array).

### hook registration order

fix-scope-trigger.mjs registers in the `UserPromptSubmit` array after other UserPromptSubmit hooks.

## Fix-verify hook (manual self-check rule)

`PostToolUse` hook is not supported by `install-global.sh` → manual rule:

1. After Edit + test complete (feature implemented + tests passing)
2. Run callsite grep using the `FIX_KEYWORDS` list from `hook-shared.detectFixIntent` for the modified function name:
   ```bash
   grep -rn <functionName> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}
   ```
3. If unmodified callsites found: either fix them OR add `"intentionally skipped: <path>"` to commit body
4. Gate 4.5 will BLOCK based on `.kzk-harness/fix-scope-cache.jsonl` — this self-check catches it early

This rule is the pre-emptive self-check counterpart to `kzk-pre-commit-gate` Gate 4.5.

## Use case: API deprecation sweep

When deleting or renaming an API endpoint:

1. Before the delete commit, run callsite sweep for the old endpoint path:
   ```bash
   grep -rn "<old-path-pattern>" web/src api/src --include='*.{ts,tsx}' --exclude-dir={node_modules,.git,docs}
   ```
2. All callsites must be either:
   - Updated to the new endpoint, OR
   - Annotated in the commit body as `intentionally removed: <path> (module archived)`
3. Write the callsite list to `.kzk-harness/fix-scope-cache.jsonl` (same schema as fix-start) so Gate 4.5 can validate before commit.
4. CRG `query_graph(callers_of=<service_method>)` is the preferred deep sweep — finds indirect callers that grep misses (e.g., hook → hook → GridView pattern from cycle 25). For context, see `kzk-codebase-survey §Step 1 Scope expansion` on how to use CRG query_graph in deprecation context.

## Gate 4.5

> SoT: harness-share.md §3.5. On conflict, §3.5 wins.

Positioned between `kzk-pre-commit-gate` Gate 4 and commit (before Gate 5 = Plan C).

**Trigger**: when `.kzk-harness/fix-scope-cache.jsonl` exists.

**Skip**: when `KZK_GATE45_SKIP=1` env var is set (recommended to note reason in commit body).

**Cache policy**: JSONL append/list — union-check all entries whose key is the current cycle commit SHA (`$(git rev-parse HEAD)`). Not `last-fix-wins` — accumulated across multiple calls.

**Sanity check**: callsite list ⊄ `git diff --cached --name-only` → BLOCK.

BLOCK message:
```
Gate 4.5: callsite N곳 중 M곳 미수정.
누락 의도를 commit body 에 명시하거나 해당 callsite 도 수정.
```

**No cache**: N/A (fix-scope-trigger hook inactive or non-fix commit).

## Fix layer pivot (Phase 2)

> Authoritative source: currently self-authoritative. If harness-share.md §N is added, that takes precedence.

### Operational definitions (added cycle 47)

- **"Same direction"**: two consecutive fix attempts share the same root-cause label. Label format = `<layer>:<symptom-key>` (e.g. `L1:tailscale-mtu-fragmentation`). Label conflict = same direction.
- **"Failure"**: any of — (a) added test remains red, (b) user-reported symptom is unchanged after fix, (c) same stack trace recurs within 30 seconds of fix. All three are verifiable signals.
- **Layer label dictionary** (L3 table meaning = application source code, example text conflict resolved):
  - L0 = external config / OS / network / infrastructure (kubelet config, /etc/, route table)
  - L1 = wrapper / IaC / deployment scripts
  - L2 = SW internal config (config file, env var consumed by app)
  - L3 = core application source code

### When to escalate

**Same-layer consecutive fail rule**: if the same-direction fix fails twice in a row at the same layer → escalate one layer outward.

Layer hierarchy (outer → inner):

| Layer | Scope examples |
|---|---|
| **L0** | OS / external environment — route, DNS, firewall, env var, system permissions |
| **L1** | wrapper / middleware config — proxy, reverse-proxy, load balancer |
| **L2** | SW internal config — app config, feature flag, config files |
| **L3** | SW core logic — source code, algorithms, data structures |

Exploration order: start at the layer where the problem appears → escalate toward L0.

**Example (Tailscale case)**: Claude fails twice at L3 (core source code) → check L2 (SW internal config) → check L1 (wrapper) → succeed with a one-line fix at L0 (route add).

### Fix-verify hook extension

After running the fix-verify hook (see §Fix-verify hook), if two consecutive failures at the same layer are detected:

1. Record the current layer (L0/L1/L2/L3)
2. Move one layer outward; re-investigate the root cause at that layer
3. If still unresolved after reaching L0 → append `Q-FIX-PIVOT-FAIL` entry to the `## OPEN` section of `docs/harness/user-queue.md`, then halt

### Q-FIX-PIVOT-FAIL entry format

~~~markdown
- [ ] YYYY-MM-DD HH:MM — Q-FIX-PIVOT-FAIL — <function/symptom> unresolved after all layer escalations (cycle N)
~~~

Detail items as sub-list:
~~~markdown
  - Context: <symptom + per-layer attempt history (L3→L2→L1→L0)>
  - Tentative default: user to inspect L0 environment directly
  - Impact: autonomous execution halted — cannot continue without layer pivot
~~~

### Anti-patterns (G1/G2/G4)

- G1: Focusing only on L3, never checking L0 → check outward from the problem layer in order
- G2: After failure, trying variations in the same direction twice → immediately pivot layers
- G4: Providing only an explanation for why it doesn't work, no one-line fix → diagnosis goes in sub-bullets; first line is always an actionable fix

## Self-skip guard

> Reuses `hook-shared.shouldSkip(prompt, env)`. Single SoT for patterns: `install/lib/hook-shared.mjs` §SELF_IMPROVE_VERBPHRASES.

## Default DISABLED policy

`fix-scope-trigger.mjs` is not registered in `settings.json` at commit time.

Enable at `kzk-pre-merge-sync` step 3:
```bash
bash install/install-global.sh --enable-hooks --fix-scope-trigger
```

Self-contamination prevention: hook stays inactive during B/C cycles → blocks the pattern where the agent's own fix triggers its own recall.

## Rollback (6 levels)

1. **CRG probe fails** — operate in grep-only fallback mode. Print `_warn:"crg-not-installed-grep-fallback"` to stderr.
2. **hook-shared migration causes test failure** — re-verify hook-shared export signatures. Ensure they match D commit 53885de.
3. **cache-write lockdir race** — `writeSingleEntryWithLock` timeout 5s + best-effort write fallback (stderr WARN + write without lock).
4. **Gate 4.5 false positive** — bypass temporarily with `KZK_GATE45_SKIP=1 git commit`. Fix the callsite grep pattern in the next session.
5. **install-global.sh --fix-scope-trigger fails (jq missing)** — run `brew install jq` then retry. On environments without jq → stderr WARN.
6. **global install artifact cleanup** — remove `~/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs` + remove hook entry from `~/.claude/settings.json`. Use `install-global.sh --disable-fix-scope-trigger` or manual jq edit.

Immediate disable: set `OMC_SKIP_HOOKS=fix-scope-trigger` env var.

## Interaction with other kzk-*

- **hook-shared.mjs ordering**: fix-scope-trigger registers in UserPromptSubmit. Shares `hook-shared.mjs` with other hooks (prevents drift).
- **kzk-pre-commit-gate**: Gate 4.5 is defined by this skill. `kzk-pre-commit-gate §Gate 4.5` cross-refs harness-share §3.5.
- **kzk-codebase-survey**: auto-invoked on fix start. SoT = harness-share §3.5. Cross-ref: `kzk-codebase-survey §fix-time trigger`.
- **kzk-pre-merge-sync**: step 3 auto-enables via `--fix-scope-trigger` flag. fail-closed.
- **kzk-large-task-delegation**: when dispatching, if `.kzk-harness/fix-scope-cache.jsonl` exists, inject callsite list into dispatch prompt (200 char cap).
- **hook-shared.mjs**: `install/lib/hook-shared.mjs` — FIX_KEYWORDS / shouldSkip / detectFixIntent single SoT. fix-scope-trigger.mjs must import it.
- **kzk-freshness-guard**: on fix, expands impact radius of changed symbols — `crg-utils.reverseRefs()` results auto-detect meta-docs. Meta-docs in the impact radius are included in fix scope.
