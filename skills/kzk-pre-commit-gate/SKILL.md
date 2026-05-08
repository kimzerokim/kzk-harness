---
name: kzk-pre-commit-gate
version: 1.11.0
description: "Pre-commit gate runs sequential gates (AGENTS.md sync, freshness Gate 0.5, ai-slop, secrets AKIA/ASIA, prod code-first, build, test, Playwright Gate 4, fix-scope Gate 4.5, fresh-agent verifier Gate 5) before every commit. One FAIL blocks. Triggers: commit, pre-commit, Gate 0-5. References harness-share.md §3."
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

> See `kzk-freshness-guard` §Detection Logic for the full procedure (staged 파일 → CRG 심볼 역참조 → stale 감지 → auto-fix dispatch → restage). `KZK_GATE05_SKIP=1` env 로 bypass.
>
> **CRG 미설치 시**: degraded grep mode + WARN (silent skip 금지). `crg-utils.ensureCRG()` 결과에 따라 자동 분기.

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

## Gate 1.6 — Production code-first 검증 (Plan E rev2)

> Authoritative source: `kzk-production-access` §Production state changes (rev2). On conflict, that wins.

**Trigger 조건** (cycle 1 #12 — staged path 기반, commit-message 기반 X):
staged diff 의 추가/삭제 행 (`+`/`-`) 중 다음 패턴 발견 시 진입:
- 변경 디렉토리: `migrations/`, `infra/`, `scripts/prod/`, `terraform/`, `cloudformation/`, `cdk/`, `serverless.yml`
- 또는 staged 텍스트 라인이 shell command 형태로 production CLI 호출 흔적

doc-only fast path (commit message `docs(`/`chore(`/`style(` prefix) 와 충돌 X — staged path 가 트리거.

**검증 — FAIL 패턴 (직접 실행 흔적)**:

| 패턴 | 의미 |
|---|---|
| staged diff `+` 라인의 `psql .* (ALTER TABLE\|DROP TABLE\|CREATE INDEX)` shell-command 흔적 | DB schema ad-hoc |
| `aws iam create-policy` / `aws iam put-policy` / `aws iam attach-role-policy` shell 흔적 | IAM ad-hoc |
| `aws s3api put-bucket-(lifecycle-configuration\|policy)` shell 흔적 | S3 ad-hoc |
| `aws lambda update-function-configuration` shell 흔적 (단 IaC-managed Lambda 한정) | Lambda env ad-hoc |

heredoc / `psql -f migration.sql` 같은 script-driven 호출은 **FAIL 아님** (script 화 = 의도). 정확 매칭은 fixture-based shell test (`install/test/fixtures/gate-1.6-adhoc-grep.sh`) 가 보장.

**검증 — WARN 패턴 (멱등성 부재, cycle 1 #3)**:

| 패턴 | 처리 |
|---|---|
| 새 `*.sql` 파일이 `IF NOT EXISTS` / `IF EXISTS` / `ON CONFLICT` 키워드 부재 | WARN (commit 차단 X). 사용자 review 권고. regex 한계로 false positive 다수 — human gate. |

WARN = stderr 출력 + commit 진행. FAIL = commit halt.

**FAIL 시 동작**:
- commit halt + 사용자 출력: "Gate 1.6 — direct execution trace detected. Replace with migration / IaC."
- user-queue `Q-PROD-CODE-FIRST-<COMMIT-HASH>` 자동 append.

**Skip 조건**:
- staged path 가 production-related 디렉토리 아님
- doc-only fast path 충족 (Gate 1.6 trigger 조건과 별개로 평가)
- 사용자 explicit `[env-exception]` tag commit message body 에 명시 (runtime-only 카테고리 인정)

## Gate 2 — build green

Run the repo's build command (e.g. `npm run build`). Verify dist artifact exists (e.g. `dist/main.js`, `dist/index.html`). Exit code 0.

## Gate 3 — module test pass

`npm test` scoped to changed area is acceptable mid-work. Full regression at PR time.

## Gate 4 — UI/CSS visual verification (Playwright MCP)

If any changed file matches `src/**/*.{tsx,ts,css}` (or your repo's equivalent frontend source glob), Gate 4 is mandatory. See `kzk-playwright-verification` skill for the full routine. Skipping / deferring / "do it later in the final sweep" is forbidden.

Exception: change is solely under `src/**/*.test.{tsx,ts}` — Gate 4 may be skipped.

## Gate 4.5 — Fix Scope Sanity Check (Plan B)

> See `kzk-fix-scope-expansion` §Gate 4.5 for the full procedure (Trigger / Skip / Cache / Sanity / BLOCK message). SoT: `harness-share.md §3.5`. `KZK_GATE45_SKIP=1` env 로 bypass.

## Gate 5 — Fresh-agent verifier (Plan C rev2)

Commit 직전 final check. `kzk-large-task-delegation` §Three-stage review §Stage 3 결과 PASS 확인 (cache hit) 또는 verifier 새 호출.

### Trigger — ANY of (rev2 #12):

(a) `git diff --cached --name-only` 결과 3+ 파일
(b) high-risk tag (auth / payment / migration / public API) — plan 본문 명시 또는 commit body marker
(c) **메인 직접 commit 모든 case** — 메인 self-approve hole 차단

조건 만족 시 Gate 5 의무. 셋 다 false → Gate 5 N/A.

### 절차

1. **Stage 3 cache 조회** — key = `(staged_diff_hash, acceptance_hash, verifier_model)`. same turn 안에서 hit 이면 PASS 인용 + commit body 에 `Gate 5: Stage 3 cite (verifier <subagent_type> <model>) PASS — <verifier 인용 1줄>`. PASS.
2. **Cache miss** → Gate 5 가 verifier 새 호출. dispatch 룰은 `kzk-large-task-delegation` §Three-stage review §Stage 3 §Verifier dispatch 와 동일.
   - diff base = `git diff --cached` (Gate 5 단위)
   - acceptance 발췌 = current plan §Acceptance Criteria SoT 우선 (없으면 raw user criteria)
   - VERDICT 파싱 정규식 `^VERDICT: (PASS|FAIL|PARTIAL)$`
3. **Verdict 처리**: See `kzk-large-task-delegation` §Three-stage review §PASS/FAIL/PARTIAL 처리 table — same logic. diff base = `--cached` (Gate 5) vs `HEAD~1` (Stage 3).

### Stage 3 vs Gate 5 분리 (중복 호출 차단)

- Stage 3: cycle 단위 ("이 cycle 결과가 spec 만족하는가"), diff base = `HEAD~1`
- Gate 5: commit 단위 ("이 commit 의 diff 가 verifier PASS 받았는가"), diff base = `--cached`

같은 cycle 끝 commit 에서 두 단계 동시 발동 시 verifier 1회만 호출 + 두 단계 모두 cache 결과 인용. cache 룰: `kzk-large-task-delegation` §Three-stage review §Stage 3 ↔ Gate 5 cache 규약.

### Doc-only commit 예외

> See `## Doc-only commit exception and patch policy` below for the single source of truth.

### Plan C self-bootstrap N/A (rev2 #1)

Plan C 자체 적용 첫 commit 은 N/A 1회만 — commit body 에 명시 의무: `Gate 5 N/A — Plan C self-bootstrap commit, applies from next commit.`

### Autonomous mode

Gate 5 PASS 시 사용자 confirm 없이 commit 허용 (다른 gate 와 동일). FAIL / BLOCK / INVALID / dispatch fail 시 halt + user-queue.

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
- Critic / verifier / Gate 4 visual reviewer 2 consecutive FAIL on the same change (Gate 4 Playwright visual review, plan reviewer, verifier agent) → halt + user-queue entry. See `kzk-autonomous-boundary` for the full halt condition list. Exception: `kzk-web-loop` overrides consecutive-FAIL halts with skip+next-issue (see `kzk-web-loop` §Failure Handling).
- Gate 5 verifier 2 consecutive FAIL on same thread → halt + `Q-VERIFIER-FAIL`. INVALID_VERDICT → `Q-VERIFIER-INVALID`. dispatch fail → `Q-VERIFIER-DISPATCH-FAIL`. See `kzk-autonomous-boundary` §Halt conditions 표 (reason / action / resume schema).
- Never `git commit --amend` after a hook failure (the commit didn't happen — amending hits the previous commit)

## Interaction with other kzk-*

- **kzk-freshness-guard**: Gate 0.5 owner. CRG 기반 stale 메타 문서 감지 + auto-fix.
- **kzk-autonomous-boundary**: Owns the halt protocol invoked when ≥2 consecutive reviewer/critic FAILs (or ≥3 consecutive build/test FAILs) occur during gate runs.
- **kzk-playwright-verification**: Implements Gate 4 (browser smoke + screenshot drop).
- **kzk-test-coverage**: Gate 3 runs the same test command this skill owns at session close.
- **kzk-large-task-delegation**: Gate 5 verifier dispatch 는 본 skill 의 §Three-stage review §Stage 3 와 sibling. 같은 thread / 같은 cache key → verifier 호출 1회만 (cache hit citation 우선). Subagent prompts must echo the gate sequence so delegated executors commit with full gate awareness.
- **kzk-web-loop**: Owns the override exception that lets the loop bypass full Gate 0–4 in indefinite-loop mode (see kzk-web-loop §Failure Handling).
- **kzk-pre-merge-sync**: Consumes the gate-PASS line this skill emits in the PR footer.
- **kzk-production-access** (Axis E): Gate 1.6 룰 본문은 kzk-production-access §Production state changes 가 SoT.

## Post-commit CRG refresh

commit 직후 CRG rebuild 의무 — 새 commit 의 변경을 CRG 인덱스에 반영. 다음 작업이 stale CRG 를 보지 않게.

### 절차

commit 성공 직후 (`git commit` exit 0):
1. `code-review-graph update` (incremental, default `--base HEAD~1`) — 방금 commit 한 변경만 update
2. `code-review-graph status` 로 verify (`Built at commit: <new sha>` 확인)
3. session cache invalidate — `kzk-codebase-survey §Step 0.5 (e)` 의 `CRG_LAST_BUILT_SHA` reset → 다음 CRG call 시 `(f)` 룰 재발동

### Skip 조건

- `KZK_CRG_NO_REFRESH=1` env (CI / debug)
- doc-only commit (소스 코드 변경 X — CRG 영향 없음)
- commit 자체 X (사용자 abort 또는 hook fail)

### Anti-pattern

- commit 후 CRG update skip → 다음 plan / 다음 fix-start 가 stale CRG 사용 → false-positive callsite mismatch
- post-commit hook 으로 자동화 안 함 → 메인이 의식적으로 update 의무. autonomous mode 에서 commit 직후 update 명시.

### Cross-ref

- **kzk-codebase-survey §Step 0.5 (e)/(f)**: session cache invalidate + auto-refresh on first call after invalidate
- **kzk-autonomous-loop §Multi-plan CRG refresh**: plan 끝 (= commit) → CRG update → 새 plan 시작 시 cache miss → reload
- **harness-share.md §3.5 CRG auto-refresh policy**: 통합 SoT
