# Task-Level Dispatch Shape Implementation Plan

> Status: **FROZEN** (Plan codex review cycle 3 PASS, 0 BLOCKER + 0 NIT + 0 PUSH-BACK). Implementation ready.
> Spec source: `docs/plans/2026-05-20-task-level-dispatch-design.md` (frozen)
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the task-level dispatch shape + multi-dispatch wave shape + plan size policy defined in `docs/plans/2026-05-20-task-level-dispatch-design.md` (spec frozen 2026-05-20 after 5-cycle codex review PASS). This adds three new sections to `kzk-large-task-delegation` skill, mirrors body to `harness-share.md §4`, adds 1-line cross-refs in §2/§11.1/§32, updates install/test grep contracts, refreshes skill-flow HTML + fingerprint, and bumps SKILL.md frontmatter version.

**Architecture:** Markdown skill body additions + cross-doc mirroring. Preserves existing `§Anti-self-verification boilerplate` / `§Code-quality-discipline boilerplate` / `§Production-code-first boilerplate` section bodies (Defensive policy: all kzk-required boilerplate stays inlined). No code changes — pure skill/doc/test-contract updates. Dogfood opportunity: implement this plan using the wave-dispatch pattern that the design itself defines.

**Tech Stack:** Markdown (skill files, harness-share.md, CLAUDE.md, plan/design docs), bash (`install/test/skill-text-checks.sh` grep harness), HTML/CSS (`docs/site/skill-flow{,.ko}.html`), Node.js (`check-skill-flow-fresh.mjs` fingerprint hook).

**Spec source of truth:** `docs/plans/2026-05-20-task-level-dispatch-design.md` (frozen). All task bodies derive content verbatim from that spec.

## Dependencies

(Per design §5.2 mandatory `## Dependencies` declaration.)

- T1 → T2 → T3 → T4 (all touch `skills/kzk-large-task-delegation/SKILL.md`; sequential within file).
- T1-T4 → T5 (T5 mirrors SKILL.md content to `harness-share.md §4`).
- T1-T4 → T7 (T7 grep targets verify final SKILL.md content).
- **T6 → T7** (cycle 2 plan fix B1: T7 also verifies harness-share §2/§11.1/§32 cross-refs added in T6).
- T1-T4 → T9 (T9 reflects new sections in `skill-flow.html`).
- T5 → T6 (both touch `harness-share.md`; sequential within file).
- T9 → T10 (KO parity); T9 → T11 (fingerprint regen reads EN body).
- **T10 → T11** (cycle 2 plan fix B2: T11's commit step stages both EN + KO files, so T10 must land first to avoid race).
- T8 (`CLAUDE.md`) ⊥ everything else — independent.
- T12 depends on all (final commit through pre-commit gates).

## Execution waves

- **Wave 1**: T1 → T2 → T3 → T4 (sequential, same file SKILL.md) ∥ T8 (CLAUDE.md, independent).
- **Wave 2**: T5 → T6 → T7 (sequential — T7 now after T6 per cycle 2 fix B1) ∥ T9 (skill-flow.html EN, independent of harness-share).
- **Wave 3**: T10 → T11 (sequential — T11 commit stages both files per cycle 2 fix B2).
- **Wave 4**: T12 (pre-commit gates + final commit).

Per design §Multi-dispatch wave shape: parallel within wave via `Agent()` calls in single message with `run_in_background: true`. Sequential across waves.

---

### Task 1: SKILL.md frontmatter version bump + §Task-level dispatch shape

**Files:**
- Modify: `skills/kzk-large-task-delegation/SKILL.md` (frontmatter `version:` + insert new section after `§Subagent prompt requirements` block at line ~235)

**Spec reference:** design §5.1 (lines 132-235 of design doc)

- [ ] **Step 1: Read current frontmatter version**

Run: `head -10 skills/kzk-large-task-delegation/SKILL.md`
Expected: see `version: X.Y.Z` (e.g. `version: 1.3.0`).

- [ ] **Step 2: Bump version (minor bump for functional change)**

Edit frontmatter: `version: 1.3.0` → `version: 1.4.0` (or whatever current → current+0.1.0).

- [ ] **Step 3: Insert §Task-level dispatch shape after existing §Subagent prompt requirements section**

Locate end of `§Subagent prompt requirements` block (around `SKILL.md:235`). Insert new section verbatim from design §5.1 (Plan reference policy + Dispatch prompt anatomy + Per-task line guide). The anatomy template block (~66 lines) is copied as-is including all 14 boilerplate sub-sections (Branch contract verification / Task body / Anti-self-verification / Production-code-first / Code-quality-discipline / TDD strict / Plan reference policy / Halt conditions / context7 / Pre-commit gate / Race-condition awareness / Regression-recall / CRG refresh / Commit convention / Output contract).

The Literal block extraction rule (right above anatomy template) must also be included.

- [ ] **Step 4: Verify section is present**

Run: `grep -n "^## §Task-level dispatch shape\|^### Task-level dispatch shape" skills/kzk-large-task-delegation/SKILL.md`
Expected: at least one match (heading present).

Run: `grep -c "DO NOT add Co-Authored-By" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1 (commit convention block inlined).

Run: `grep -c "HOTFIX_ACK_DEFER" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1 (hotfix bypass mentioned in per-task line guide).

- [ ] **Step 5: DO NOT commit yet — Task 1 leaves the file partially updated.** Next task continues editing same file.

---

### Task 2: §Multi-dispatch wave shape (same file, sequential after T1)

**Files:**
- Modify: `skills/kzk-large-task-delegation/SKILL.md` (insert section after §Task-level dispatch shape)

**Spec reference:** design §5.2

- [ ] **Step 1: Insert §Multi-dispatch wave shape section verbatim from design**

Sections: Wave 식별 정책 + 권장 plan 본문 형식 (필수) + Semantic-dependency note + Wave dispatch 절차 + Wave 사이즈 가이드 + Three-stage review 와의 관계.

Critical text to include:
- "`## Dependencies` 섹션 의무 (canonical heading). `## Execution waves` 는 optional supplement."
- "Wave 1 의 모든 task 를 fresh subagent 로 병렬 dispatch (`Agent()` calls in single message, `run_in_background: true` per existing SKILL.md:291 + harness-share.md:381 parallel-dispatch rule)."
- "한 wave 에 최대 5 parallel task 권장 (kzk operational empirical observation)."

- [ ] **Step 2: Verify**

Run: `grep -c "## Dependencies" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1.

Run: `grep -c "run_in_background: true" skills/kzk-large-task-delegation/SKILL.md`
Expected: **≥ 2** (cycle 2 plan fix NIT 3: existing :291 + new wave dispatch — both refer to it. Single-occurrence count would mean new section not inserted).

Run: `grep -c "fresh subagent 로 병렬 dispatch\|fresh subagent per task in parallel" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1 (cycle 2 plan fix NIT 3: unique phrase from §Multi-dispatch wave shape proves section actually inserted, not just legacy text).

Run: `grep -c "최대 5 parallel\|maximum 5 parallel" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1.

- [ ] **Step 3: DO NOT commit — T3/T4 continue editing same file.**

---

### Task 3: §Plan size policy (same file, sequential after T2)

**Files:**
- Modify: `skills/kzk-large-task-delegation/SKILL.md` (insert section after §Multi-dispatch wave shape)

**Spec reference:** design §5.3

- [ ] **Step 1: Insert §Plan size policy section verbatim from design**

Sections: Plan file 자체 크기 + Per-task atomicity (의무 + hard trigger) + Phase split 권장 threshold + Cross-phase dependency 표기 (gridless reference) + Migration 정책 + Dependency addendum sidecar.

Critical text:
- "Line cap 없음 (gridless `grid-lock-phase-2-plan.md` 3,031 라인 정상)."
- "Task body soft cap = ≤120 라인 (cycle 3 B1' fix — was 150)."
- "50+ task / 5,000+ 라인 / 9+ Group 단위 → phase 분리 권장."
- Dependency addendum sidecar: `<plan-basename>-dependencies.md` + Conflict 처리 rule.

- [ ] **Step 2: Verify**

Run: `grep -c "≤120 라인\|≤120 lines" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1 (active soft cap).

Run: `grep -c "Q-SIDECAR-DRIFT" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1 (sidecar conflict rule).

Run: `grep -c "grandfather" skills/kzk-large-task-delegation/SKILL.md`
Expected: ≥ 1 (migration policy).

- [ ] **Step 3: DO NOT commit — T4 final SKILL.md edit pending.**

---

### Task 4: SKILL.md:252 표현 명확화 — "100–220 lines" budget scope

**Files:**
- Modify: `skills/kzk-large-task-delegation/SKILL.md:252` (existing line "Typical prompt = 60-150 lines for opus, 100-220 lines for sonnet")

**Spec reference:** design §2.5 + §4 layout sketch last bullet

- [ ] **Step 1: Locate existing line**

Run: `grep -n "Typical prompt" skills/kzk-large-task-delegation/SKILL.md`
Expected: single match around line 252.

- [ ] **Step 2: Edit to clarify "task dispatch prompt" scope**

Change from:
`Typical prompt = 60-150 lines for opus, 100-220 lines for sonnet. Terse prompt = shallow work.`

To:
`Typical task dispatch prompt = 60-150 lines for opus, 100-220 lines for sonnet (per §Task-level dispatch shape per-task line guide). This is the prompt sent per task, not the plan file itself — plan files can be thousands of lines (see §Plan size policy). Terse prompt = shallow work.`

- [ ] **Step 3: Verify**

Run: `grep -c "Typical task dispatch prompt" skills/kzk-large-task-delegation/SKILL.md`
Expected: 1.

Run: `grep -c "plan files can be thousands of lines" skills/kzk-large-task-delegation/SKILL.md`
Expected: 1.

- [ ] **Step 4: Commit SKILL.md (T1+T2+T3+T4 atomic — all SKILL.md changes in one commit)**

Pre-commit gate auto-runs. Doc-only change → most gates skip. Gate 0.5 freshness check should pass since SoT (this file) is the change.

Commit message (no Co-Authored-By per global CLAUDE.md):
```
git add skills/kzk-large-task-delegation/SKILL.md
git commit -m "$(cat <<'EOF'
feat(kzk-large-task-delegation): add §Task-level dispatch shape + wave shape + plan size policy

implements docs/plans/2026-05-20-task-level-dispatch-design.md (frozen
post-cycle-5 codex review PASS). adds three sections preserving existing
boilerplate body sections. clarifies SKILL.md:252 "100-220 lines" as task
dispatch prompt scope, not plan file size. frontmatter version bump.
EOF
)"
```

- [ ] **Step 5: Verify commit succeeded**

Run: `git log -1 --oneline`
Expected: commit with the new message visible.

Run: `git status`
Expected: clean (only SKILL.md was modified).

---

### Task 5: harness-share.md §4 mirror

**Files:**
- Modify: `harness-share.md` §4 (mirror SKILL.md §Task-level dispatch + §Multi-dispatch wave + §Plan size policy verbatim)

**Spec reference:** design §4 architecture table — "`harness-share.md §4` SKILL.md mirror" + design §7 cross-doc sync matrix

- [ ] **Step 1: Locate §4 (kzk-large-task-delegation section) in harness-share.md**

Run: `grep -n "^## §4\|^### §4\|^## 4\." harness-share.md | head -5`
Expected: identify §4 line range.

- [ ] **Step 2: Insert mirror body**

Copy §Task-level dispatch shape + §Multi-dispatch wave shape + §Plan size policy verbatim from SKILL.md (post-T4 state) into the corresponding location in `harness-share.md §4`. Preserve existing §4 content; new sections go after the existing §Subagent prompt requirements equivalent block.

- [ ] **Step 3: Verify line-by-line diff (skill ↔ harness-share §4 sections)**

Run:
```bash
# Extract the §Task-level dispatch shape body from both files and diff.
sed -n '/^### §Task-level dispatch shape\|^## §Task-level dispatch shape/,/^### §Multi-dispatch\|^## §Multi-dispatch/p' skills/kzk-large-task-delegation/SKILL.md > /tmp/skill-task-level.txt
sed -n '/^### §Task-level dispatch shape\|^## §Task-level dispatch shape/,/^### §Multi-dispatch\|^## §Multi-dispatch/p' harness-share.md > /tmp/harness-task-level.txt
diff /tmp/skill-task-level.txt /tmp/harness-task-level.txt
```
Expected: empty diff (1:1 match).

Repeat for §Multi-dispatch wave shape and §Plan size policy.

- [ ] **Step 4: DO NOT commit — T6 continues editing same file.**

---

### Task 6: harness-share.md §2 / §11.1 / §32 cross-references

**Files:**
- Modify: `harness-share.md` §2 (1-line cross-ref add), §11.1 (1-line), §32 (1-line)

**Spec reference:** design §4 architecture rows for §2/§11.1/§32

- [ ] **Step 1: Locate each section**

Actual headings in harness-share.md (verified 2026-05-20):
- §2 = `## 2. Autonomous Execution Boundary` (line ~47) — cross-ref goes at end of §2 body, before §3.
- §11.1 = `### 11.1 Anti-Self-Verification (TDD)` (line ~609) — cross-ref at end of §11.1 body, before §11.2.
- §32 = `## §32 Code Quality Discipline ...` (line ~1293) — cross-ref at end of §32 body, before next §.

Run (cycle 2 plan fix NIT 1 — use actual heading patterns):
```bash
grep -nE "^## 2\. Autonomous|^### 11\.1 Anti-Self|^## §32 Code Quality" harness-share.md
```
Expected: 3 matches (one line per heading).

- [ ] **Step 2: Add 1-line cross-ref to each**

For each of §2 (Plan E production code-first), §11.1 (Anti-Self-Verification), §32 (Code Quality Discipline), append at the end of the section body (before next heading) a single line:

```
> Dispatch anatomy canonical reference: §4 kzk-large-task-delegation §Task-level dispatch shape.
```

(Use blockquote so the cross-ref is visually distinct from section body.)

- [ ] **Step 3: Verify**

Run: `grep -c "Dispatch anatomy canonical reference" harness-share.md`
Expected: 3 (one per section).

- [ ] **Step 4: Commit harness-share.md (T5+T6 together)**

```bash
git add harness-share.md
git commit -m "$(cat <<'EOF'
chore(harness-share): mirror §4 from kzk-large-task-delegation + cross-refs in §2/§11.1/§32

§4 now mirrors the three new sections (Task-level dispatch shape,
Multi-dispatch wave shape, Plan size policy) added to
skills/kzk-large-task-delegation/SKILL.md. §2/§11.1/§32 each get a 1-line
blockquote pointing at §4 as dispatch anatomy canonical reference.
EOF
)"
```

- [ ] **Step 5: Verify commit**

Run: `git log -1 --oneline`; `git status` (clean).

---

### Task 7: install/test/skill-text-checks.sh grep expectations

**Files:**
- Modify: `install/test/skill-text-checks.sh` (add grep assertions for new SKILL.md content)

**Spec reference:** design §7 cross-doc sync matrix row + §9 R4 risk

- [ ] **Step 1: Read existing grep block for kzk-large-task-delegation**

Run: `grep -n "kzk-large-task-delegation\|LTD\|LTD_E" install/test/skill-text-checks.sh`
Expected: existing assertions around lines 63-66, 93-95.

- [ ] **Step 2: Add new grep assertions for the new sections**

Insert after the existing `# kzk-large-task-delegation boilerplate — positive` block (around line 63):

```bash
# kzk-large-task-delegation Task-level dispatch shape — positive
assert_grep "kzk-large-task-delegation Task-level dispatch shape 헤더" "Task-level dispatch shape" "$LTD"
assert_grep "kzk-large-task-delegation dispatch anatomy" "Dispatch prompt anatomy" "$LTD"
assert_grep "kzk-large-task-delegation ≤120 라인 soft cap" "≤120 라인" "$LTD"
assert_grep "kzk-large-task-delegation no Co-Authored-By" "DO NOT add Co-Authored-By" "$LTD"
assert_grep "kzk-large-task-delegation HOTFIX_ACK_DEFER bypass" "HOTFIX_ACK_DEFER" "$LTD"

# kzk-large-task-delegation Multi-dispatch wave shape — positive
assert_grep "kzk-large-task-delegation wave shape 헤더" "Multi-dispatch wave shape" "$LTD"
assert_grep "kzk-large-task-delegation ## Dependencies 의무" "## Dependencies" "$LTD"
assert_grep "kzk-large-task-delegation run_in_background true" "run_in_background: true" "$LTD"

# kzk-large-task-delegation Plan size policy — positive
assert_grep "kzk-large-task-delegation plan size policy 헤더" "Plan size policy" "$LTD"
assert_grep "kzk-large-task-delegation phase split threshold (task count)" "50+ task" "$LTD"
assert_grep "kzk-large-task-delegation phase split threshold (line count)" "5,000+" "$LTD"
assert_grep "kzk-large-task-delegation phase split threshold (group count)" "9+ Group" "$LTD"
assert_grep "kzk-large-task-delegation sidecar drift" "Q-SIDECAR-DRIFT" "$LTD"

# harness-share §4 mirror — positive (verify cross-ref in §2/§11.1/§32)
assert_grep "harness-share §4 dispatch canonical cross-ref presence" "Dispatch anatomy canonical reference" "$SHARE"

# harness-share cross-ref exact count (cycle 2 plan fix NIT 2; cycle 3 plan fix NIT — robust integer)
xref_count=$(grep -c "Dispatch anatomy canonical reference" "$SHARE" 2>/dev/null)
xref_count=${xref_count:-0}
if [ "$xref_count" -eq 3 ]; then
  printf "PASS: harness-share cross-ref exact count = 3\n"
  PASS=$((PASS+1))
else
  printf "FAIL: harness-share cross-ref count = %s, expected 3\n" "$xref_count"
  FAIL=$((FAIL+1))
  ERRORS+=("harness-share cross-ref count drift: got $xref_count, want 3")
fi
```

(Adjust `$SHARE` definition if it doesn't already exist in this block — check existing definitions of `$LTD`, `$SHARE` near top of script.)

- [ ] **Step 3: Run the test script**

Run: `bash install/test/skill-text-checks.sh`
Expected: `N PASS, 0 FAIL` (where N = previous count + new assertions count). Exit 0.

If FAIL: read the failure output, identify which assertion missed. If the assertion is correct but SKILL.md / harness-share.md content differs from spec, return to T1-T6 to fix. If the assertion text is wrong, fix the assertion.

- [ ] **Step 4: Commit**

```bash
git add install/test/skill-text-checks.sh
git commit -m "$(cat <<'EOF'
test(install): add grep assertions for new kzk-large-task-delegation sections

verifies §Task-level dispatch shape, §Multi-dispatch wave shape, §Plan
size policy bodies and the harness-share §2/§11.1/§32 cross-refs after
implementing docs/plans/2026-05-20-task-level-dispatch-design.md.
EOF
)"
```

- [ ] **Step 5: Verify commit**

Run: `git log -1 --oneline`; `git status` (clean).

---

### Task 8: CLAUDE.md self-trigger matrix row

**Files:**
- Modify: `CLAUDE.md` (this repo's CLAUDE.md, NOT global) — add 1 row to "Self-trigger reminder" / "Self-trigger matrix" section.

**Spec reference:** design §4 architecture row "Self-trigger matrix 1줄 추가"

- [ ] **Step 1: Locate self-trigger matrix in CLAUDE.md**

Run: `grep -n "Self-trigger reminder\|Self-trigger matrix" CLAUDE.md`
Expected: at least one heading found around the self-improvement loop section.

- [ ] **Step 2: Add new row**

Insert below the existing `Multi-file 코드 변경` row (or wherever the matrix lists dispatch-related triggers):

```
- **Plan 큰 경우 (50+ task / 5k+ 라인) = task-level wave dispatch with `## Dependencies` 의무** = `kzk-large-task-delegation §Task-level dispatch shape` + `§Multi-dispatch wave shape` + `§Plan size policy` (post 2026-05-20 design)
```

- [ ] **Step 3: Verify**

Run: `grep -c "task-level wave dispatch" CLAUDE.md`
Expected: ≥ 1.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
docs(CLAUDE.md): add task-level wave dispatch row to self-trigger matrix

points at new §Task-level dispatch shape / §Multi-dispatch wave shape /
§Plan size policy sections in kzk-large-task-delegation. references
2026-05-20 design.
EOF
)"
```

---

### Task 9: docs/site/skill-flow.html update — EN card + diagram

**Files:**
- Modify: `docs/site/skill-flow.html` (kzk-large-task-delegation card body + workflow diagram nodes)

**Spec reference:** design §4 architecture row + §7 cross-doc sync matrix

- [ ] **Step 1: Locate kzk-large-task-delegation card**

Run: `grep -n "kzk-large-task-delegation" docs/site/skill-flow.html | head -10`
Expected: card section heading + body.

- [ ] **Step 2: Update card body**

Add three new bullet items to the card body listing the new sections:
- §Task-level dispatch shape (per-task ≤120 lines, all boilerplate inlined)
- §Multi-dispatch wave shape (`## Dependencies` mandatory, `run_in_background: true`)
- §Plan size policy (no plan cap, phase split at 50+/5k+/9+Group, sidecar addendum)

- [ ] **Step 3: Update workflow diagram (mermaid block)**

Locate the mermaid diagram for the dispatch workflow. Add nodes:
```
main_reads_plan[Main reads plan once] --> identify_waves[Identify waves from ## Dependencies]
identify_waves --> wave_n[Wave N: parallel Agent() calls, run_in_background: true]
wave_n --> wave_reviewer[Wave reviewer subagent合 review]
wave_reviewer --> next_wave_or_commit
```

(Adjust syntax to match existing mermaid style in the file.)

- [ ] **Step 4: Verify**

Run: `grep -c "Task-level dispatch shape" docs/site/skill-flow.html`
Expected: ≥ 1.

Run: `grep -c "## Dependencies" docs/site/skill-flow.html`
Expected: ≥ 1.

Open the file locally in a browser (optional smoke test): `open docs/site/skill-flow.html` and check the kzk-large-task-delegation card + diagram renders.

- [ ] **Step 5: DO NOT commit — T10 + T11 follow before commit.**

---

### Task 10: docs/site/skill-flow.ko.html — Korean parity

**Files:**
- Modify: `docs/site/skill-flow.ko.html` (mirror T9 changes in Korean)

**Spec reference:** design §7 — "convention-only, no fingerprint hook" — manual parity check required

- [ ] **Step 1: Mirror T9 card body changes in Korean**

Translate the three new bullet items to Korean (matching tone of existing ko file):
- §Task-level dispatch shape (task 당 ≤120 라인, 모든 boilerplate 인라인)
- §Multi-dispatch wave shape (`## Dependencies` 의무, `run_in_background: true`)
- §Plan size policy (plan cap 없음, phase split 50+/5k+/9+Group, sidecar addendum)

- [ ] **Step 2: Mirror T9 diagram update**

Same mermaid node additions, Korean labels.

- [ ] **Step 3: Verify**

Run: `grep -c "Task-level dispatch\|task-level\|작업 단위 dispatch" docs/site/skill-flow.ko.html`
Expected: ≥ 1.

- [ ] **Step 4: DO NOT commit — T11 fingerprint regen next.**

---

### Task 11: skill-flow.html fingerprint regen

**Files:**
- Modify: `docs/site/skill-flow.html` (embedded fingerprint comment block)

**Spec reference:** design §7 + CLAUDE.md "Skill Development Rules" + `.claude/hooks/check-skill-flow-fresh.mjs`

- [ ] **Step 1: Run fingerprint regen**

Run: `node .claude/hooks/check-skill-flow-fresh.mjs --regen`
Expected: success message + updated fingerprint embedded in `docs/site/skill-flow.html`.

- [ ] **Step 2: Verify status**

Run: `node .claude/hooks/check-skill-flow-fresh.mjs --status`
Expected: "fresh" or equivalent OK status.

- [ ] **Step 3: Commit T9 + T10 + T11 together (skill-flow site update atomic)**

```bash
git add docs/site/skill-flow.html docs/site/skill-flow.ko.html
git commit -m "$(cat <<'EOF'
docs(skill-flow): reflect §Task-level dispatch / wave shape / plan size policy in EN+KO

kzk-large-task-delegation card + workflow diagram updated to show
task-level dispatch + wave shape + plan size policy from 2026-05-20
design. fingerprint regen via check-skill-flow-fresh.mjs --regen.
KO manual parity per convention.
EOF
)"
```

- [ ] **Step 4: Verify commit + pre-commit hook passes**

Run: `git log -1 --oneline`; `git status` (clean).

The `check-skill-flow-fresh.mjs` PreToolUse hook should auto-allow the commit since fingerprint is now fresh.

---

### Task 12: Final pre-commit gate verification + summary commit

**Files:**
- No edits — verification only.

**Spec reference:** design §8 verification scenarios + §15 next steps

- [ ] **Step 1: Verify all changes committed (presence/set, not strict order — cycle 2 plan fix NIT 4)**

Run: `git log --oneline -10`
Expected: see 5 commits from this plan present (T1-T4 squashed → 1 SKILL.md commit; T5-T6 → 1 harness-share commit; T7 → 1 install/test commit; T8 → 1 CLAUDE.md commit; T9-T11 → 1 skill-flow commit). Order may vary because T8 (CLAUDE.md) is independent and could land at any point in Wave 1.

Verify by unique commit-msg phrases:
```bash
git log --oneline -10 | grep -c "feat(kzk-large-task-delegation)"  # T1-T4 commit
git log --oneline -10 | grep -c "chore(harness-share)"              # T5-T6 commit
git log --oneline -10 | grep -c "test(install)"                     # T7 commit
git log --oneline -10 | grep -c "docs(CLAUDE.md)"                   # T8 commit
git log --oneline -10 | grep -c "docs(skill-flow)"                  # T9-T11 commit
```
Expected: each grep returns 1.

Run: `git status`
Expected: clean working tree.

- [ ] **Step 2: Run install/test/skill-text-checks.sh full suite**

Run: `bash install/test/skill-text-checks.sh`
Expected: all PASS, exit 0.

- [ ] **Step 3: Run cycle-exit 4 sub-check (autonomous-boundary §33)**

Per `kzk-autonomous-boundary §Cycle-exit mandate`:
- (a) prod-build smoke — N/A (doc-only)
- (b) stub sweep — `grep -rn "TODO\|TBD\|FIXME" docs/plans/2026-05-20-task-level-dispatch-{design,plan}.md skills/kzk-large-task-delegation/SKILL.md harness-share.md install/test/skill-text-checks.sh` → no new placeholders (existing tracked OK)
- (c) SoT alignment — `diff <(sed -n '/Task-level dispatch shape/,/Plan size policy/p' skills/kzk-large-task-delegation/SKILL.md) <(sed -n '/Task-level dispatch shape/,/Plan size policy/p' harness-share.md)` → empty diff
- (d) spec-freeze re-check — `head -5 docs/plans/2026-05-20-task-level-dispatch-design.md` → "Status: **FROZEN**"

- [ ] **Step 4: Dispatch fresh-agent verifier (per autonomous-boundary §33)**

Dispatch `oh-my-claudecode:verifier` (opus) with:
- Required reading: this plan, design doc, all 5 commits.
- Task: independently verify each of T1-T11 was correctly implemented by reading the current state of each touched file.
- Pass criteria: all grep checks pass + design ↔ SKILL.md ↔ harness-share §4 1:1 match + fingerprint fresh.
- Return verdict: VERIFIED / FAILED with file:line citations.

If verifier FAILED → return to failing task, fix, repeat T12.

- [ ] **Step 5: User-queue cleanup**

After verifier PASS, append to `docs/harness/user-queue.md` "RESOLVED" section:
```
- [x] 2026-05-20 — Q-DESIGN-BOILERPLATE — implemented as Defensive (all kzk-required inlined); see commit history + design §3.
- [x] 2026-05-20 — Q-DESIGN-WAVE — implemented as mandatory ## Dependencies + sidecar fallback; see commit history + design §3.
```

Move the corresponding `## Pending — Q-DESIGN-BOILERPLATE` and `## Pending — Q-DESIGN-WAVE` blocks to RESOLVED section (or delete the Pending blocks if format prefers).

Final commit for the cleanup:
```bash
git add docs/harness/user-queue.md
git commit -m "$(cat <<'EOF'
chore(user-queue): resolve Q-DESIGN-BOILERPLATE + Q-DESIGN-WAVE post implementation

both retreats from cycle 1-2 codex review are now reflected in shipped
SKILL.md + harness-share §4. design doc frozen, implementation
verified by fresh opus verifier.
EOF
)"
```

- [ ] **Step 6: Done**

Run: `git log --oneline -10`
Expected: ~6 commits from this plan, clean history.

Implementation complete. Spec frozen, plan implemented, cross-doc synced, tests passing, verifier PASS, user-queue resolved.

---

## Self-Review Checklist (writing-plans skill mandate)

**Spec coverage:** All 7 architecture rows from design §4 → T1-T11. Verification scenarios from design §8 → T7 (grep tests), T12 step 4 (verifier). Cross-doc matrix from design §7 → T5 (harness §4), T6 (§2/§11.1/§32), T7 (install/test), T8 (CLAUDE.md), T9-T11 (skill-flow + fingerprint), T12 (user-queue cleanup).

**Placeholder scan:** No "TBD", "TODO", "fill in details" in any task body. Each step has either exact text to insert (with verbatim quote from design doc), exact bash command with expected output, or exact verification grep.

**Type consistency:** Section names used consistently across tasks — `§Task-level dispatch shape`, `§Multi-dispatch wave shape`, `§Plan size policy`. Commit conventions consistent (HEREDOC, no Co-Authored-By). Path references absolute or repo-relative throughout.

**Atomicity check (design §5.1 hard trigger ≤120 lines per task body):** Each task body in this plan averages ~80 lines. T5 mirror task is the longest at ~50 lines body — under cap. No `## Split rationale` needed.

**Dependency check (design §5.2 mandatory):** `## Dependencies` declared at top + `## Execution waves` showing wave grouping. Same-file edits are sequential. Cross-file independent edits are wave-parallel candidates.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-05-20-task-level-dispatch-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent (sonnet) per task via `superpowers:subagent-driven-development`. Waves per top-level `## Execution waves` (cycle 2 plan fix — must match, not the old shape):
- Wave 1 = T1→T2→T3→T4 sequential (same file SKILL.md) ∥ T8 (CLAUDE.md, independent)
- Wave 2 = T5→T6→T7 sequential (T7 verifies T6 cross-refs per cycle 2 fix B1) ∥ T9 (skill-flow.html EN, independent of harness-share)
- Wave 3 = T10→T11 sequential (T11 commit stages both EN+KO per cycle 2 fix B2)
- Wave 4 = T12 final verification + cleanup

Two-stage review per task. **This is the design's own dogfood.**

**2. Inline Execution** — main executes tasks directly via `superpowers:executing-plans`. Faster but no fresh-context guarantee. Use only if dogfood not required.

Which approach?
