# Cycle 47 Survey — B2 + C1 + Y
> Date: 2026-05-07  
> CRG cache: 28 files, 205 nodes, 1965 edges (session-cached, not rebuilt)  
> Sub-scopes: B2 (layer-pivot inline), C1 (mattpocock/skills audit), Y (user-queue format)

---

## Sub-scope B2 — kzk-fix-scope-expansion layer-pivot inline

### Current SKILL.md state

- **Path**: `/Users/kimzerokim/.claude/skills/kzk-fix-scope-expansion/SKILL.md`  
  Repo canonical: `/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-fix-scope-expansion/SKILL.md`
- **Version**: 1.3.0
- **Line count**: 144
- **Drift**: `diff` produced no output — global and repo versions are **identical**. No drift.

### Section map (for insertion anchor)

```
## Why                          (L12)
## Fix-start hook               (L22)
  ### Trigger 룰                (L24)
  ### hook-shared import 의무   (L38)
  ### CRG 시그니처              (L47)
  ### grep fallback             (L56)
  ### cache 위치                (L65)
  ### recall consumer 관계      (L69)
## Fix-verify hook              (L74)
## Gate 4.5                     (L88)
## 자가-skip guard              (L110)
## Default DISABLED 정책        (L114)
## Rollback (6 level)           (L125)
## Interaction with other kzk-* (L136)
```

### Phase 2 design doc — §10 Out of scope (verbatim extract)

From `/Users/kimzerokim/work/personal/kzk-harness/docs/plans/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` §10:

> - 4 메타-갭 차단 룰 (FIX-LABEL / 자가-점검 ladder / 자동 위임 / Q-FIX-PIVOT-FAIL halt / kzk-fix-layer-pivot 스킬 / kzk-codex-consult 스킬)
> - keyword-detector.mjs trigger 매핑 추가
> - 반증 계측 (codex 호출 성공률 / 에러율 사용자 수동 기록)
> - mattpocock/skills audit
> - harness-share.md §N entry 신설

And from §1.1, the 4 meta-gaps (G1–G4) that motivate the layer-pivot rule:

| Gap | Name | Summary |
|---|---|---|
| G1 | wrong-layer fix | Only attempts fix inside SW — does not check external env (route/DNS) first |
| G2 | same-direction loop | After 1 failure, repeats variations in same direction |
| G3 | knowledge trap | Reaches for complex solution, overlooks simpler external fix |
| G4 | explanation > fix | Explains "why it fails" rather than providing 1-line fix |

**Layer hierarchy** (inferred from design doc framing, Tailscale incident):
- L0: OS-level / external config (route add, DNS, firewall)
- L1: wrapper / middleware config
- L2: SW internal config
- L3: SW core logic

**Proposed rule (Phase 2 deferred — NOT yet in SKILL.md)**: When a same-layer fix fails 2× consecutively, escalate to the next outer layer (L3 → L2 → L1 → L0). Emit `Q-FIX-PIVOT-FAIL` to user-queue if all layers exhausted.

### Insertion recommendation

- **After**: `## Gate 4.5` section (L88–L108), before `## 자가-skip guard` (L110)
- **Rationale**: Gate 4.5 is the post-fix sanity check. The new `## Fix layer pivot` section belongs between fix verification (Gate 4.5) and the skip/disable housekeeping sections — it is a continuation of fix-execution rules, not a hook or gate config concern.
- **Proposed new section heading**: `## Fix layer pivot (Phase 2)`

**Draft section content** (for executor to fill in):

```markdown
## Fix layer pivot (Phase 2)

> Authoritative source: harness-share.md §TBD (Phase 2 신설 예정). 현재 self-authoritative.

### When to escalate

**Same-layer consecutive fail rule**: 동일 레이어에서 같은 방향 fix 가 2회 연속 실패 시 → 한 레이어 바깥으로 escalate.

Layer 계층 (바깥 → 안):
- **L0**: OS / 외부 환경 (route, DNS, firewall, env var)
- **L1**: wrapper / middleware config
- **L2**: SW internal config
- **L3**: SW core logic

탐색 순서: 문제가 발생한 레이어 → L0 방향으로 escalate.

### Self-check (Fix-verify hook 확장)

Fix-verify hook 실행 후, fix 가 같은 레이어에서 2회 연속 실패 시:
1. 현재 레이어 기록 (L3/L2/L1/L0)
2. 한 레이어 바깥으로 이동, 해당 레이어에서 원인 재조사
3. L0 도달 후에도 실패 → `Q-FIX-PIVOT-FAIL` to `docs/harness/user-queue.md`

### Q-FIX-PIVOT-FAIL entry 형식

```markdown
### Q-FIX-PIVOT-FAIL — <함수명/증상> 모든 레이어 escalate 후에도 미해결

- **Context**: <증상 + 레이어별 시도 내역>
- **Options**:
  1. 사용자 직접 개입 (L0 환경 확인)
  2. 외부 전문가 / 문서 참조
  3. 현 상태로 workaround 처리 후 계속
- **Tentative default**: Option 1
- **Override**: 이 entry 하단 `**DECISION (YYYY-MM-DD):** Option N`
- **Impact**: 자율실행 halt — 레이어 전환 없이 진행 불가
```

### Anti-patterns

- 실패 후 동일 방향으로 variation 반복 (G2)
- L3 단독 집중, L0 미검토 (G1/G3)
- "왜 안 되는지" 설명만 제공, 1줄 fix 미제공 (G4)
```

### Cross-references that need updating if this section is added

| File | Update needed |
|---|---|
| `harness-share.md` | §3.5 또는 신규 §N 에 Fix layer pivot 룰 추가 (Phase 2 plan) |
| `kzk-autonomous-boundary` SKILL.md | §Halt conditions 표에 `Q-FIX-PIVOT-FAIL` row 추가 |
| `kzk-user-queue` SKILL.md | Queue producers 섹션에 `kzk-fix-scope-expansion: Q-FIX-PIVOT-FAIL` 추가 |
| `kzk-pre-commit-gate` SKILL.md | Gate 4.5 cross-ref 에 layer-pivot 언급 (옵션) |
| `docs/plans/2026-05-06-codex-handoff-and-fix-layer-pivot-design.md` | §10 에서 해당 항목 완료 표시 (Phase 2 cycle 에서) |

### Version bump

현재 1.3.0 → 신규 섹션 추가 후 **1.4.0** 권장.

---

## Sub-scope C1 — mattpocock/skills audit

### Already integrated (do not re-audit)

| Skill | Status | Source |
|---|---|---|
| `improve-codebase-architecture` | Integrated cycle 42 | `~/.claude/skills/` (not symlinked from `.agents`) |
| `caveman` | Symlinked | `~/.claude/skills/caveman → ../../.agents/skills/caveman` |
| `diagnose` | Symlinked | `~/.claude/skills/diagnose → ../../.agents/skills/diagnose` |
| `grill-me` | Symlinked | `~/.claude/skills/grill-me → ../../.agents/skills/grill-me` |
| `grill-with-docs` | Symlinked | `~/.claude/skills/grill-with-docs → ../../.agents/skills/grill-with-docs` |

All four symlinks confirm mattpocock origin (`.agents/skills/`), not gstack.

### Audit candidates — full table

#### Available locally at `~/.agents/skills/<name>/SKILL.md`

| Skill | Name (frontmatter) | Purpose summary | Integration value | Overlap |
|---|---|---|---|---|
| `tdd` | `tdd` | Vertical-slice TDD with tracer bullets. Red→Green→Refactor per behavior, test public interfaces only. Explicit anti-horizontal-slicing rule. | **LOW** | `kzk-test-coverage` covers TDD discipline with anti-self-verification + autonomous dispatch rule. The mattpocock `tdd` is simpler and has no autonomous-mode awareness. Adding it would create a competing trigger for the same keyword. |
| `to-issues` | `to-issues` | Converts plans/specs/PRDs into independently-grabbable GitHub/GitLab issues via vertical slices. Publishes with `needs-triage` label. | **MEDIUM** | No kzk-* skill covers issue-tracker publishing. Orthogonal to harness workflow gates. Useful if kzk-harness adopts `setup-matt-pocock-skills`. |
| `to-prd` | `to-prd` | Converts conversation context + codebase into a PRD and publishes to issue tracker. No interview — synthesis only. | **MEDIUM** | `kzk-spec-and-review` covers internal spec/plan authoring with codex review. `to-prd` is issue-tracker oriented (external publish). Orthogonal but overlaps on "create a spec" trigger. |
| `triage` | `triage` | Issue triage state machine: `needs-triage → needs-info / ready-for-agent / ready-for-human / wontfix`. Integrates `/grill-with-docs` for info gathering. | **MEDIUM** | No kzk-* skill. Clean addition if GitHub issue workflow is adopted. Requires `setup-matt-pocock-skills` first. |
| `zoom-out` | `zoom-out` | One-liner: "go up a layer of abstraction, map all relevant modules and callers." `disable-model-invocation: true`. | **LOW** | `kzk-codebase-survey` + `kzk-large-task-delegation` cover this more thoroughly. `zoom-out` is a quick one-shot prompt — redundant with the explore subagent pattern. |
| `write-a-skill` | `write-a-skill` | Guides creation of skills with proper structure, description requirements (max 1024 chars, trigger-based), scripts, and file splitting rules. | **MEDIUM** | `skill-creator` (available as oh-my-claudecode skill) already handles this. `write-a-skill` is simpler but doesn't have eval/benchmark features. Could serve as lightweight alternative for kzk-harness–specific skill authoring guidance. |
| `setup-matt-pocock-skills` | `setup-matt-pocock-skills` | Bootstraps `## Agent skills` block in CLAUDE.md/AGENTS.md + `docs/agents/` dir with issue-tracker, triage-label, and domain-doc config. Gate for `to-issues`, `to-prd`, `triage`, `diagnose`, `tdd`. `disable-model-invocation: true`. | **MEDIUM** | Required prerequisite if any MEDIUM skills above are adopted. No kzk-* equivalent. |

#### Fetched from GitHub (not installed locally)

| Skill | Name (frontmatter) | Purpose summary | Integration value | Overlap |
|---|---|---|---|---|
| `prototype` | `prototype` | Throwaway prototyping: routes to terminal logic app (state machine questions) or UI variants (multiple designs on one route). Throwaway-from-day-one rule. | **LOW** | kzk-harness is a skill/workflow repo, not a product. Prototype is UI/UX-oriented. Low relevance. |
| `git-guardrails-claude-code` | `git-guardrails-claude-code` | Sets up PreToolUse hook blocking `git push`, `reset --hard`, `clean -f`, `branch -D`, `checkout .`. Project or global scope. | **HIGH** | `kzk-autonomous-boundary` has soft guardrails (requires explicit OK for destructive ops) but no actual hook that blocks the command at OS level. This installs a hard PreToolUse blocker. Directly extends Gate 0 / autonomous-boundary discipline. |
| `migrate-to-shoehorn` | `migrate-to-shoehorn` | Migrates TypeScript test `as` assertions to `@total-typescript/shoehorn`. Test-code only. | **LOW** | TypeScript project specific. kzk-harness has no TS test infra. |
| `scaffold-exercises` | `scaffold-exercises` | Creates exercise directory structures for `pnpm ai-hero-cli internal lint`. Course/exercise specific. | **LOW** | Domain-specific (ai-hero course platform). Not applicable. |
| `setup-pre-commit` | `setup-pre-commit` | Sets up Husky + lint-staged + Prettier + typecheck + test scripts. Node.js project specific. | **LOW** | kzk-harness uses its own `kzk-pre-commit-gate` with multi-gate discipline. Husky is a different layer (Node.js only, no Gate 0–5 awareness). |
| `edit-article` | `edit-article` | Restructures articles section by section, max 240 chars/paragraph. Personal writing tool. | **LOW** | Personal/writing domain. Not applicable to kzk-harness workflow. |
| `obsidian-vault` | `obsidian-vault` | Manages `/mnt/d/Obsidian Vault/AI Research/` with wikilinks and index notes. Hardcoded vault path. | **LOW** | Personal productivity, hardcoded to user's machine path. Not applicable. |

### Recommended integration list

**Priority 1 — HIGH (install now):**

| Skill | Action | Rationale |
|---|---|---|
| `git-guardrails-claude-code` | Fetch from GitHub + install globally | Hard PreToolUse blocker for destructive git ops. Directly strengthens `kzk-autonomous-boundary` with an OS-level enforcement layer. Currently missing from kzk-harness. |

**Priority 2 — MEDIUM (install if issue-tracker workflow adopted):**

| Skill | Action | Prerequisite | Rationale |
|---|---|---|---|
| `setup-matt-pocock-skills` | Install first (prerequisite) | None | Bootstraps the `docs/agents/` config that `to-issues`, `to-prd`, `triage` depend on |
| `to-issues` | Install after setup | `setup-matt-pocock-skills` | Enables plan→GitHub-issue publishing, orthogonal to kzk-* gates |
| `to-prd` | Install after setup | `setup-matt-pocock-skills` | Issue-tracker PRD; note trigger overlap with `kzk-spec-and-review` — add disambiguating trigger language |
| `triage` | Install after setup | `setup-matt-pocock-skills` | Issue state machine; pairs with already-installed `grill-with-docs` |
| `write-a-skill` | Optional | None | Simpler skill-authoring guide; `skill-creator` already covers this but `write-a-skill` has kzk-harness-relevant SKILL.md structure guidance |

**Skip (LOW):** `tdd`, `zoom-out`, `prototype`, `migrate-to-shoehorn`, `scaffold-exercises`, `setup-pre-commit`, `edit-article`, `obsidian-vault`.

---

## Sub-scope Y — user-queue.md format strengthening

### Current file state

**Path**: `/Users/kimzerokim/work/personal/kzk-harness/docs/harness/user-queue.md`  
**Line count**: 8  
**Current content** (verbatim):

```
# User Queue

Pending decisions that require user input before resuming autonomous execution.

---

- Q-AUTONOMOUS-SOT (2026-05-06 cycle 43 audit) — status: RESOLVED (cycle 44). harness-share.md §33 신설 (Autonomous-mode Detection SoT). kzk-test-coverage §자율 mode 판별, kzk-regression-memory §자가-skip guard, kzk-autonomous-boundary frontmatter → §33 cross-ref. canonical form "ralph로 돌려" (붙여쓰기) 채택.
```

**Entry count**: 1 total, 0 OPEN, 1 RESOLVED (inline, not in a `## RESOLVED` section), 0 NOT_USED.

### Migration plan

**Current entry → proposed mapping:**

| Entry | Current state | Target section | New format |
|---|---|---|---|
| Q-AUTONOMOUS-SOT | Inline resolved note (no section header) | `## RESOLVED` | `- [x] 2026-05-06 HH:MM — Q-AUTONOMOUS-SOT — autonomous-mode detection SoT 신설 (cycle 44)` |

**Proposed migrated file:**

```markdown
# User Queue

> 시간 역순 — 최신 entry 위. 작업 끝 시 `- [x]` 체크.

## OPEN

_(없음)_

## RESOLVED

- [x] 2026-05-06 — Q-AUTONOMOUS-SOT — autonomous-mode detection SoT 신설, harness-share.md §33 (cycle 44)

## 사용하지 않음 (NOT_USED)

_(없음)_
```

Note: exact timestamp (HH:MM) for the Q-AUTONOMOUS-SOT entry is unknown — only date `2026-05-06` is recorded. Executor should use `2026-05-06 00:00` as placeholder or omit HH:MM for entries predating the new format.

### Q-entry producers (complete map)

All entries found by grep across `~/.claude/skills/kzk-*/SKILL.md`:

| Q-entry pattern | Producer skill | Trigger condition |
|---|---|---|
| `Q-TOOL-<FILE>` | `kzk-tool-retry` | Edit/Write double failure |
| `Q-COV-<FILE>` | `kzk-test-coverage` | Coverage gap / missing coverage script |
| `Q-COV-SETUP` | `kzk-test-coverage` | `test:cov` script missing |
| `Q-TDD-MAIN` | `kzk-test-coverage` + `kzk-autonomous-boundary` | Autonomous main tries direct TDD red |
| `Q-WEBLOOP-<N>-<TOPIC>` | `kzk-web-loop` | Ambiguous decision in web loop |
| `Q-PLUGIN-PREFLIGHT` | `kzk-web-loop` | Plugin subcommand unavailable |
| `Q-PLUGIN-RESTART` | `kzk-web-loop` | Plugins installed, session restart needed |
| `Q-INSTALL-CRG-MANUAL` | `kzk-codebase-survey` | CRG install fails (pip + pipx both fail) |
| `Q-CRG-EMPTY-INDEX` | `kzk-codebase-survey` | CRG build produced 0 nodes |
| `Q-VERIFIER-FAIL` | `kzk-large-task-delegation` + `kzk-pre-commit-gate` + `kzk-autonomous-boundary` | Verifier 2× consecutive FAIL |
| `Q-VERIFIER-INVALID` | `kzk-large-task-delegation` + `kzk-pre-commit-gate` + `kzk-autonomous-boundary` | Verifier response missing `VERDICT:` prefix |
| `Q-VERIFIER-DISPATCH-FAIL` | `kzk-large-task-delegation` + `kzk-pre-commit-gate` + `kzk-autonomous-boundary` | Verifier subagent dispatch failure |
| `Q-CODEX-DISPATCH-FAIL` | `kzk-codex-handoff` + `kzk-autonomous-boundary` | Codex subagent dispatch failure |
| `Q-MAIN-DIRECT-EDIT` | `kzk-autonomous-boundary` | Main context direct multi-file edit in autonomous mode |
| `Q-PROD-CODE-FIRST-<TOPIC>` | `kzk-production-access` + `kzk-pre-commit-gate` | Production state change code-first check fails |
| `Q-SUBAGENT-EMPTY-[name]` | `kzk-background-monitoring` | Subagent result empty or truncated |
| `Q-AUTONOMOUS-SOT` | (historical — cycle 43) | Autonomous detection SoT missing (now resolved) |
| `Q-FIX-PIVOT-FAIL` | `kzk-fix-scope-expansion` (Phase 2 — not yet added) | All fix layers exhausted |

**Gap**: `kzk-user-queue` SKILL.md §Interaction producer table lists only 7 producers and omits:
- `kzk-autonomous-boundary` (Q-TDD-MAIN, Q-MAIN-DIRECT-EDIT, Q-VERIFIER-*, Q-CODEX-DISPATCH-FAIL)
- `kzk-pre-commit-gate` (Q-PROD-CODE-FIRST-*, Q-VERIFIER-* via Gate 5)
- `kzk-codex-handoff` (Q-CODEX-DISPATCH-FAIL)

**This is a P1 deficiency in kzk-user-queue SKILL.md** — the producer table is stale/incomplete.

### Cross-ref skills needing update if format changes

Files that reference `user-queue.md`:

| File | Reference type | Update needed on format change |
|---|---|---|
| `/Users/kimzerokim/.claude/skills/kzk-user-queue/SKILL.md` | Owns the format definition | Update entry template to match new format (checkboxes, sections, timestamp) |
| `/Users/kimzerokim/.claude/skills/kzk-autonomous-loop/SKILL.md` | "Ambiguous decisions go to docs/harness/user-queue.md" | Low — just a pointer, no format dependency |
| `/Users/kimzerokim/.claude/skills/kzk-codex-handoff/SKILL.md` | Q-CODEX-DISPATCH-FAIL append | Low — just entry name, no format dependency |
| `/Users/kimzerokim/.claude/skills/kzk-production-access/SKILL.md` | Q-PROD-CODE-FIRST-<TOPIC> append | Low |
| `/Users/kimzerokim/.claude/skills/kzk-tool-retry/SKILL.md` | Q-TOOL-<FILE> append with template | Medium — references "using the kzk-user-queue template" |
| `/Users/kimzerokim/.claude/skills/kzk-web-loop/SKILL.md` | Multiple raw `echo "Q-..." >> docs/harness/user-queue.md` patterns | **High** — raw appends bypass section structure; after format change, these will write to wrong section |
| `/Users/kimzerokim/.claude/skills/kzk-background-monitoring/SKILL.md` | Q-SUBAGENT-EMPTY-[name] append | Low |
| `/Users/kimzerokim/.claude/skills/kzk-large-task-delegation/SKILL.md` | Q-VERIFIER-* entries | Low |
| `/Users/kimzerokim/.claude/skills/kzk-pre-commit-gate/SKILL.md` | Q-PROD-CODE-FIRST-* + Q-VERIFIER-* | Low |
| `/Users/kimzerokim/work/personal/kzk-harness/harness-share.md` §6 | Authoritative source for entry format | **High** — §6 entry format must be updated to match new checkbox + section structure |

**Critical path for format migration**:
1. Update `harness-share.md §6` entry format (checkbox, sections, timestamp) — this is the authoritative source
2. Update `kzk-user-queue` SKILL.md entry template + producer table (add missing producers)
3. Update `kzk-web-loop` SKILL.md raw `echo >>` patterns → structured section-aware appends
4. Migrate `docs/harness/user-queue.md` existing entry to new format

---

## Cross-references / blast radius

### B2 (fix-scope-expansion layer-pivot)

If the `## Fix layer pivot` section is added to `kzk-fix-scope-expansion`:

| File | Change type |
|---|---|
| `skills/kzk-fix-scope-expansion/SKILL.md` | New section + version 1.3.0 → 1.4.0 |
| `~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` | Sync (install-global.sh cp) |
| `~/.claude/skills/kzk-autonomous-boundary/SKILL.md` | Add Q-FIX-PIVOT-FAIL row to §Halt conditions table |
| `~/.claude/skills/kzk-user-queue/SKILL.md` | Add kzk-fix-scope-expansion to producer table |
| `harness-share.md` | Phase 2: add §N for layer-pivot rule (deferred per §10) |

harness-share §3.5 does NOT need updating for Phase 2 inline (it covers CRG auto-refresh policy, not layer-pivot logic). The new section is self-authoritative until harness-share §N is created in a future cycle.

### C1 (mattpocock/skills)

If `git-guardrails-claude-code` is installed:

| File | Change type |
|---|---|
| `~/.claude/settings.json` | New PreToolUse hook entry |
| `~/.claude/hooks/block-dangerous-git.sh` | New script (executable) |
| `kzk-autonomous-boundary` SKILL.md | Cross-ref note: "OS-level git guardrails via `git-guardrails-claude-code`" |

If MEDIUM cluster is adopted (setup-matt-pocock-skills + to-issues + to-prd + triage):

| File | Change type |
|---|---|
| `CLAUDE.md` | New `## Agent skills` block |
| `docs/agents/issue-tracker.md` | New file |
| `docs/agents/triage-labels.md` | New file |
| `docs/agents/domain.md` | New file |

### Y (user-queue format)

harness-share.md §6 is the authoritative source for entry format. If the format is changed to checkbox + OPEN/RESOLVED/NOT_USED sections, harness-share §6 must be updated first. kzk-user-queue SKILL.md references §6 as SoT — updating §6 propagates authority automatically.

`kzk-web-loop` raw `echo >>` appends are the highest-risk callsite: 5 separate echo-to-file patterns that write directly to `user-queue.md` without section awareness. These will produce malformed entries under the new format. They need to be updated to use section-aware write helpers or explicit `## OPEN` insertion.

---

## Summary for executor

**B2**: Insert `## Fix layer pivot (Phase 2)` section into `kzk-fix-scope-expansion/SKILL.md` between `## Gate 4.5` (ends L108) and `## 자가-skip guard` (starts L110). Bump version 1.3.0 → 1.4.0. Add Q-FIX-PIVOT-FAIL to `kzk-autonomous-boundary` halt table and `kzk-user-queue` producer table. harness-share §N entry is Phase 2 deferred.

**C1**: Install `git-guardrails-claude-code` globally (HIGH). Stage MEDIUM cluster (setup-matt-pocock-skills + to-issues + to-prd + triage + write-a-skill) for a future cycle when issue-tracker workflow is wanted. Skip all 8 LOW skills.

**Y**: Migrate `docs/harness/user-queue.md` to checkbox + OPEN/RESOLVED/NOT_USED format. Update `harness-share.md §6` entry format first (authoritative source). Update `kzk-user-queue` SKILL.md producer table (add 3 missing producers: kzk-autonomous-boundary full halt table, kzk-pre-commit-gate, kzk-codex-handoff). Audit `kzk-web-loop` raw `echo >>` patterns for section-awareness.
