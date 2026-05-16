---
name: kzk-pre-commit-gate
version: 1.13.0
description: "Pre-commit gate runs sequential gates (AGENTS.md sync, freshness Gate 0.5, ai-slop, secrets AKIA/ASIA, prod code-first, build, test, docker compose smoke Gate 3.5, Playwright Gate 4, fix-scope Gate 4.5, fresh-agent verifier Gate 5) before every commit. One FAIL blocks. Triggers: commit, pre-commit, Gate 0-5. References harness-share.md §3."
---

> Authoritative source: `harness-share.md` §3. On conflict, that wins.

# kzk-pre-commit-gate

## Gate 0 — Touched-files AGENTS.md sync

If the commit adds or removes a source file (`git diff --cached --name-status` status `A` or `D`), or creates a new directory under any tracked source root (configure the list in your CLAUDE.md), the corresponding `AGENTS.md` file(s) in those directories MUST be updated in the SAME commit. Reason: `deepinit` was historically deferred to "pre-merge" and routinely degenerated into a token-burn skill load with no real regen. Forcing AGENTS.md to ride along with the file change keeps the manifest honest one commit at a time.

Concrete rule:

- New file `path/to/dir/<file>` → `path/to/dir/AGENTS.md` Key Files / Components table updated to include it.
- New directory under a tracked source root → new `AGENTS.md` file authored, parent's Subdirectories table updated, parent reference tag (`<!-- Parent: ../AGENTS.md -->`) set.
- File deletion → corresponding row removed from the AGENTS.md table.
- Pure modification of an existing file (no rename, no add, no delete) → no AGENTS.md change needed; skip.
- Trivial 1-line typo / variable rename in an existing file → skip.
- Test-only adds (`*.test.{ts,tsx}` co-located with the implementation) → may share one row with the implementation file; explicit AGENTS.md row optional.

Failure → fix the AGENTS.md, re-stage, new commit. NEVER amend.

**Optional skill-level extension (NOT a Gate 0 gate requirement). Gate 0 alone passes on the AGENTS.md edit.** After that pass, load the deepinit_manifest tool schema — `ToolSearch(query="select:mcp__plugin_oh-my-claudecode_t__deepinit_manifest")` — then call with `action=save`. After `ToolSearch` resolves the tool, **read the loaded schema before calling** — do not hardcode `action="save"` as the full call shape if other params appear as required. If the schema requires more than `action`, log the extra params + values used in the commit body. Current OMC shape: `mcp__plugin_oh-my-claudecode_t__deepinit_manifest(action="save")`. Run once at the END of the commit batch (autonomous run) or at PR-creation time (interactive). If ToolSearch returns no result, search by keyword `ToolSearch(query="+deepinit_manifest")` and call the resolved name. If neither search finds the tool (OMC plugin not installed or not surfaced), skip — log `deepinit_manifest tool unavailable, manifest baseline skipped this commit` in the commit body and continue. Manifest baseline file is gitignored (`.omc/deepinit-manifest.json`); it lets the next session's `action=diff` produce a real signal.

### Gate 0.5 — Freshness guard

> See `kzk-freshness-guard` §Detection Logic for the full procedure (staged files → CRG symbol reverse-refs → stale detection → auto-fix dispatch → restage). Bypass with `KZK_GATE05_SKIP=1` env.
>
> **When CRG is not installed**: degraded grep mode + WARN (silent skip is forbidden). Auto-branches based on `crg-utils.ensureCRG()` result.

## Gate 1 — ai-slop-cleaner

`Skill("oh-my-claudecode:ai-slop-cleaner")` on changed files. Removes dead code / duplicate / needless abstraction / boundary leak.

Trivial 1-line flag changes may skip → commit body must say `ai-slop-cleaner skipped (trivial)`.

## Gate 1.5 — secrets scan

Before committing, scan staged files for accidental secrets:

```bash
git diff --cached | grep -iE "(password|secret|api_key|aws_secret|private_key|token)\s*[:=]\s*['\"]?[A-Za-z0-9+/]{8,}" || true
```

Also check for `AKIA`/`ASIA` prefixes (AWS key patterns) per `kzk-production-access`. If any match found → unstage the file, remove the secret, re-stage. Never commit secrets even in test fixtures.

Trivial false positives (e.g. test fixture strings that are obviously fake) → commit body must say `secrets-scan: false positive — <reason>`.

## Gate 1.6 — Production code-first check (Plan E rev2)

> Authoritative source: `kzk-production-access` §Production state changes (rev2). On conflict, that wins.

**Trigger condition** (cycle 1 #12 — based on staged path, not commit message):
Enter gate when any added/removed line (`+`/`-`) in the staged diff matches the following:
- Changed directory: `migrations/`, `infra/`, `scripts/prod/`, `terraform/`, `cloudformation/`, `cdk/`, `serverless.yml`
- Or staged text lines contain shell command traces of production CLI calls

Doc-only fast path (commit message `docs(`/`chore(`/`style(` prefix) is evaluated separately — does not conflict with the staged-path trigger.

**Check — FAIL patterns (direct execution traces)**:

| Pattern | Meaning |
|---|---|
| staged diff `+` lines with `psql .* (ALTER TABLE\|DROP TABLE\|CREATE INDEX)` shell-command traces | DB schema ad-hoc |
| `aws iam create-policy` / `aws iam put-policy` / `aws iam attach-role-policy` shell traces | IAM ad-hoc |
| `aws s3api put-bucket-(lifecycle-configuration\|policy)` shell traces | S3 ad-hoc |
| `aws lambda update-function-configuration` shell traces (IaC-managed Lambda only) | Lambda env ad-hoc |

heredoc / `psql -f migration.sql` style script-driven calls are **NOT FAIL** (scripted = intended). Exact matching is guaranteed by the fixture-based shell test (`install/test/fixtures/gate-1.6-adhoc-grep.sh`).

**Check — WARN patterns (missing idempotency, cycle 1 #3)**:

| Pattern | Handling |
|---|---|
| New `*.sql` file missing `IF NOT EXISTS` / `IF EXISTS` / `ON CONFLICT` keywords | WARN (does not block commit). Recommends user review. Regex limitations cause many false positives — human gate. |

WARN = stderr output + commit proceeds. FAIL = commit halted.

**On FAIL**:
- Halt commit + user output: "Gate 1.6 — direct execution trace detected. Replace with migration / IaC."
- Auto-append user-queue entry `Q-PROD-CODE-FIRST-<COMMIT-HASH>`.

**Skip conditions**:
- Staged path is not in a production-related directory
- Doc-only fast path satisfied (evaluated independently of Gate 1.6 trigger)
- User explicitly added `[env-exception]` tag in commit message body (runtime-only category acknowledged)

## Gate 2 — build green

Run the repo's build command (e.g. `npm run build`). Verify dist artifact exists (e.g. `dist/main.js`, `dist/index.html`). Exit code 0.

## Gate 3 — module test pass

`npm test` scoped to changed area is acceptable mid-work. Full regression at PR time.

## Gate 3.5 — Conditional docker compose smoke

**Trigger condition** (path-aware, NOT root-anchored):

Runs when ALL of the following are true:
1. Bash command is `git commit` / `gh pr create|merge` / `git push origin main` (commit-signal guard — other commands silent passthrough).
2. Staged files include at least one match for `/(^|\/)Dockerfile(\..+)?$/`, `/(^|\/)(docker-)?compose(\..+)?\.ya?ml$/`, or `/(^|\/)backend\//` (or custom `triggers.includes` globs from `.kzk/docker-smoke.json`).
3. Commit is NOT doc-only (all staged files match doc extensions / doc directories — same exception as Gate 5).

**Bypass env precedence** (highest to lowest):
- `KZK_GATE35_DISABLE=1` → persistent disable + queue code `Q-GATE35-DISABLED`
- `KZK_GATE35_SKIP=1` → one-shot skip + queue code `Q-GATE35-SKIPPED`
- `CI=true` or `CI=1` → CI auto-skip + queue code `Q-GATE35-CI-SKIP`
- Inline env-prefix form: `KZK_GATE35_SKIP=1 git commit ...`

**Docker command**: `docker compose up --build -d` (timeout default 600000ms, configurable).

**Optional smoke endpoint**: if `.kzk/docker-smoke.json` has an `endpoint` field, a GET (or HEAD) is issued after docker up. Non-2xx response → BLOCK.

**Config file** (`.kzk/docker-smoke.json`, optional):
- `endpoint` — smoke ping URL (absent = build success only)
- `method` — `"GET"` | `"HEAD"` (default `"GET"`)
- `dockerTimeoutMs` — 1–3600000 (default 600000)
- `smokeTimeoutMs` — 1–300000 (default 30000)
- `triggers.includes` / `triggers.excludes` — additional glob patterns
- Malformed JSON → BLOCK (fail-loud, not silent ignore)

**Failure behavior**: docker up non-zero or smoke ping non-2xx → commit blocked, stderr shown. Append queue entry with queue code.

**OPT-IN propagation**: `install-global.sh --docker-gate` flag. Runtime disable: `KZK_GATE35_DISABLE=1`.

**Hook**: `docker-compose-gate.mjs` (project-local `.claude/hooks/` ↔ global `install/hooks/` pair, 9 marker regions byte-equal per cycle 57 drift-detection pattern).

## Gate 4 — UI/CSS visual verification (Playwright MCP)

If any changed file matches `src/**/*.{tsx,ts,css}` (or your repo's equivalent frontend source glob), Gate 4 is mandatory. See `kzk-playwright-verification` skill for the full routine. Skipping / deferring / "do it later in the final sweep" is forbidden.

Exception: change is solely under `src/**/*.test.{tsx,ts}` — Gate 4 may be skipped.

## Gate 4.5 — Fix Scope Sanity Check (Plan B)

> See `kzk-fix-scope-expansion` §Gate 4.5 for the full procedure (Trigger / Skip / Cache / Sanity / BLOCK message). SoT: `harness-share.md §3.5`. Bypass with `KZK_GATE45_SKIP=1` env.

## Gate 5 — Fresh-agent verifier (Plan C rev2)

Final check just before commit. Confirm Stage 3 result PASS from `kzk-large-task-delegation` §Three-stage review §Stage 3 (cache hit) or dispatch a new verifier call.

### Trigger — ANY of (rev2 #12):

(a) `git diff --cached --name-only` shows 3+ files
(b) high-risk tag (auth / payment / migration / public API) — stated in plan body or commit body marker
(c) **All main-authored commits** — blocks main self-approve hole

If all three are false → Gate 5 N/A.

### Procedure

1. **Stage 3 cache lookup** — key = `(staged_diff_hash, acceptance_hash, verifier_model)`. Cache hit within the same turn → cite PASS + add to commit body: `Gate 5: Stage 3 cite (verifier <subagent_type> <model>) PASS — <verifier one-liner>`. PASS.
2. **Cache miss** → Gate 5 dispatches a new verifier call. Dispatch rules are the same as `kzk-large-task-delegation` §Three-stage review §Stage 3 §Verifier dispatch.
   - diff base = `git diff --cached` (Gate 5 unit)
   - acceptance excerpt = current plan §Acceptance Criteria SoT first (fallback: raw user criteria)
   - VERDICT parsing regex `^VERDICT: (PASS|FAIL|PARTIAL)$`
3. **Verdict handling**: See `kzk-large-task-delegation` §Three-stage review §PASS/FAIL/PARTIAL handling table — same logic. diff base = `--cached` (Gate 5) vs `HEAD~1` (Stage 3).

### Stage 3 vs Gate 5 separation (prevent duplicate calls)

- Stage 3: cycle unit ("does this cycle result satisfy the spec"), diff base = `HEAD~1`
- Gate 5: commit unit ("did this commit's diff receive verifier PASS"), diff base = `--cached`

When both fire at the end of the same cycle commit, one verifier call is made + both stages cite the cached result. Cache rules: `kzk-large-task-delegation` §Three-stage review §Stage 3 ↔ Gate 5 cache contract.

### Doc-only commit exception

> See `## Doc-only commit exception and patch policy` below for the single source of truth.

### Plan C self-bootstrap N/A (rev2 #1)

The first commit applying Plan C itself is N/A once — must state in commit body: `Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit.`

### Autonomous mode

Gate 5 PASS → commit without user confirmation (same as other gates). FAIL / BLOCK / INVALID / dispatch fail → halt + user-queue.

## Doc-only commit exception and patch policy

If the commit touches **no** source code — only docs/configs (`*.md`, `docs/**`, `CLAUDE.md`, `DESIGN.md`, `harness-flow-progress.md`, `skills/**/*.md`, `.claude/skills/**/*.md`, `docs/screenshots/**`) — then apply the minimal gate set:

- Gate 0 (AGENTS.md sync) N/A unless the doc commit itself adds/removes files under a source root
- Gate 1 (ai-slop-cleaner) only on touched md if needed
- Gate 1.5 (secrets scan) **always required**
- Gate 2 (build) skipped
- Gate 3 (test) skipped
- Gate 4 N/A
- Gate 5 N/A
- Verify: `bash install/verify-install.sh --ac 2` (kzk marker block row count, ≤ 5s)

Doc-only commits go straight to commit after Gate 1.5 + AC2.

Any single source-code line in the same commit revokes this exception → run all applicable gates.

**AGENTS.md / README.md**: standalone update (no source add/delete) = doc-only OK. Same commit as source add/delete = exception revoked.

**Skill files** (`skills/**/*.md`): doc-only ONLY for existing skill edits. ADDING a new skill triggers Gate 0 (if AGENTS.md hierarchy present) + README/CLAUDE.md skill-count update flow.

**Autonomous mode**: commit without user prompt when gates pass. Non-autonomous: confirm with user.

## Autonomous-mode commit policy

User explicitly entered autonomous mode ("ralph로 돌려", "자는 동안 진행", "끝까지 끝내줘"):

- All applicable gates pass (6 if AGENTS.md hierarchy present; 5 otherwise) → commit without user confirmation
- Push respects the session **branch contract** locked at autonomous-mode entry (`kzk-autonomous-boundary`). Direct-`main` push is allowed only if the user explicitly authorized direct-main flow this session — never as a silent default.
- PR creation is allowed if the contract specifies PR-flow; final merge always waits for explicit user "merge it" regardless of contract

Non-autonomous (default): every commit waits for user OK after gates pass. No auto-commit.

## Commit message

- English, conventional commits (`feat(scope): ...`, `refactor(scope): ...`)
- HEREDOC for multi-line bodies, EOF quoted (`<<'EOF'`) to disable variable expansion
- **NEVER** include `Co-Authored-By:` lines
- pre-commit hook bypass (`--no-verify`) forbidden unless user explicitly orders it
- Gate-4 commits must include `Playwright: <screenshot_paths> + snapshot captured (console 0 err) + visual verified`

## Failure protocol

- 1st failure: fix root cause, re-stage, new commit
- **Autonomous mode:** 3 consecutive build/test failures on the same area → halt, append user-queue entry (see `kzk-autonomous-boundary`). **Interactive mode:** surface failures to user, do not auto-halt.
- Critic / verifier / Gate 4 visual reviewer 2 consecutive FAILs on the same change (Gate 4 Playwright visual review, plan reviewer, verifier agent) → halt + user-queue entry. See `kzk-autonomous-boundary` for the full halt condition list. Exception: `kzk-web-loop` overrides consecutive-FAIL halts with skip+next-issue (see `kzk-web-loop` §Failure Handling).
- Gate 5 verifier 2 consecutive FAILs on same thread → halt + `Q-VERIFIER-FAIL`. INVALID_VERDICT → `Q-VERIFIER-INVALID`. dispatch fail → `Q-VERIFIER-DISPATCH-FAIL`. See `kzk-autonomous-boundary` §Halt conditions table (reason / action / resume schema).
- Never `git commit --amend` after a hook failure (the commit didn't happen — amending hits the previous commit)

## Interaction with other kzk-*

- **kzk-freshness-guard**: Gate 0.5 owner. CRG-based stale meta-doc detection + auto-fix.
- **kzk-autonomous-boundary**: Owns the halt protocol invoked when ≥2 consecutive reviewer/critic FAILs (or ≥3 consecutive build/test FAILs) occur during gate runs.
- **kzk-playwright-verification**: Implements Gate 4 (browser smoke + screenshot drop).
- **kzk-test-coverage**: Gate 3 runs the same test command this skill owns at session close.
- **kzk-large-task-delegation**: Gate 5 verifier dispatch is a sibling to this skill's §Three-stage review §Stage 3. Same thread / same cache key → one verifier call only (cache hit citation preferred). Subagent prompts must echo the gate sequence so delegated executors commit with full gate awareness.
- **kzk-web-loop**: Owns the override exception that lets the loop bypass full Gate 0–4 in indefinite-loop mode (see kzk-web-loop §Failure Handling).
- **kzk-pre-merge-sync**: Consumes the gate-PASS line this skill emits in the PR footer.
- **kzk-production-access** (Axis E): Gate 1.6 rule body has kzk-production-access §Production state changes as SoT.

## Post-commit CRG refresh

CRG rebuild is mandatory immediately after every commit — to reflect the new commit's changes in the CRG index. Prevents the next task from reading a stale CRG.

### Procedure

Immediately after commit success (`git commit` exit 0):
1. `code-review-graph update` (incremental, default `--base HEAD~1`) — updates only the changes from the just-committed commit
2. Verify with `code-review-graph status` (confirm `Built at commit: <new sha>`)
3. Invalidate session cache — reset `CRG_LAST_BUILT_SHA` from `kzk-codebase-survey §Step 0.5 (e)` → next CRG call re-triggers `(f)` rule

### Skip conditions

- `KZK_CRG_NO_REFRESH=1` env (CI / debug)
- Doc-only commit (no source code change — no CRG impact)
- No commit occurred (user abort or hook fail)

### Anti-pattern

- Skipping CRG update after commit → next plan / next fix-start reads stale CRG → false-positive callsite mismatches
- Do not automate via post-commit hook → main must consciously run the update. In autonomous mode, explicitly run update immediately after commit.

### Cross-ref

- **kzk-codebase-survey §Step 0.5 (e)/(f)**: session cache invalidate + auto-refresh on first call after invalidate
- **kzk-autonomous-loop §Multi-plan CRG refresh**: plan end (= commit) → CRG update → new plan start causes cache miss → reload
- **harness-share.md §3.5 CRG auto-refresh policy**: unified SoT
