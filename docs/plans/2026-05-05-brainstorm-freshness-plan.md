# Implementation Plan: Brainstorm Flow + Freshness Guard

> Spec: `docs/superpowers/specs/2026-05-05-brainstorm-flow-freshness-guard-design.md` (Frozen, codex rev1)
> Status: Frozen
> Branch contract: main direct, push when done, no PR

---

## Phase 1: CRG 유틸 + 읽기 전용 감지

### Task 1.1: `install/lib/crg-utils.mjs`
- 8 exported functions (getChangedFiles, getChangedSymbols, reverseRefs, findStaleMetaDocs, validateLineRefs, ensureCRG, ensureCRGIndex, extractDocRefs)
- CRG CLI wrapper: `code-review-graph` subprocess calls
- ensureCRG(): `which code-review-graph` check, false+WARN on missing
- findStaleMetaDocs(): grep changed file paths + symbol names across meta globs
- validateLineRefs(): parse `file:line` patterns in doc, check against current code
- **Test**: `install/test/crg-utils.test.mjs` — mock `execSync` for CRG calls, test each function

### Task 1.2: `skills/kzk-freshness-guard/SKILL.md`
- New skill (17th): frontmatter (name, version 1.0.0, description with trigger keywords)
- Authoritative source line → harness-share.md §30
- Sections: Triggers, Detection Logic (CRG flow), Auto-invocation Points (6), Edge Case Guards, Auto-fix Strategy, CRG Degraded Mode, Interaction with other kzk-*
- Trigger keywords: "stale 체크", "freshness", "문서 신선도", "stale check", "freshness guard"

### Task 1.3: `install/hooks/freshness-guard.mjs`
- Hook adapter: PreToolUse hook type (fires before commit-related tools)
- Imports crg-utils.mjs functions
- Outputs system-reminder text with stale doc list
- Recursion guard: `_FRESHNESS_GUARD_RUNNING` env flag
- **Test**: `install/test/freshness-guard.test.mjs`

---

## Phase 2: Pre-commit 통합 + hook wiring

### Task 2.1: `skills/kzk-pre-commit-gate/SKILL.md` (v1.5.0 → v1.6.0)
- Insert Gate 0.5 section between Gate 0 and Gate 1
- Description/trigger updates: add "Gate 0.5", "freshness guard", "stale"
- Gate 0.5 flow: staged files → crg-utils.findStaleMetaDocs() → BLOCK/WARN/PASS
- Partial failure contract reference
- Cross-ref: kzk-freshness-guard

### Task 2.2: `install/hooks/keyword-detector.mjs`
- Add new RULES entry for exploratory keywords:
  - skills: ["kzk-spec-and-review"]
  - triggers: ["어떻게 하면", "방법 찾자", "아이디어", "설계하자", "브레인스토밍", "고민", "어떤 방향"]
  - why: "brainstorm mode flag"
  - Extra: system-reminder includes "(brainstorm mode)" marker

### Task 2.3: `install/hooks/dispatcher.mjs`
- Add `freshness_guard` manifest key
- Add freshness-guard.mjs to subHooks array

### Task 2.4: `install/install-global.sh`
- Add `--freshness-guard` CLI flag
- Add `DO_FRESHNESS_GUARD` global
- Add `cp` line in `enable_hooks()` for freshness-guard.mjs
- Add arg to `update_hook_manifest()`
- Add key in jq manifest write

---

## Phase 3: Auto-fix + cross-skill 확산

### Task 3.1: `skills/kzk-spec-and-review/SKILL.md` (v2.5.0 → v2.6.0)
- Add Step -1 (brainstorming) section before Step 0
- Keyword detection → brainstorm mode flag → Skill("superpowers:brainstorming")
- Design doc path → Step 1 required reading
- Skip mechanism: "brainstorming 스킵" → Step 0
- CRG spec reference validation (extractDocRefs + validateLineRefs)

### Task 3.2: Cross-ref updates (4 skills)
- `kzk-codebase-survey/SKILL.md` (v1.7.0 → v1.8.0): freshness check at survey start, cross-ref to kzk-freshness-guard
- `kzk-fix-scope-expansion/SKILL.md` (v1.0.0 → v1.1.0): impact radius → meta doc detection via crg-utils
- `kzk-large-task-delegation/SKILL.md` (v1.10.0 → v1.11.0): CRG scope estimation cross-ref
- `kzk-pre-merge-sync/SKILL.md` (v1.3.0 → v1.4.0): freshness sweep step (new §4)

### Task 3.3: Documentation updates
- `harness-share.md`: §30 (freshness guard), §31 (brainstorm auto-chaining), Gate 0.5 in §3
- `CLAUDE.md`: skill count 16→17, add kzk-freshness-guard row, self-trigger matrix update
- `README.md`: skill count 16→17, add table row, install command update
- `install/dependencies.md`: add freshness-guard dependency note (CRG required)

### Task 3.4: Full test + install verification
- `bash install/test/run-tests.sh`
- `bash install/test/skill-text-checks.sh`
- `yes | bash install/install-global.sh "$(pwd)"` — verify hook copy + manifest
- Verify 17 skills in CLAUDE.md/README.md counts match

---

## Execution strategy

- Phase 1 Task 1.1 first (foundation)
- Phase 1 Tasks 1.2 + 1.3 parallel (skill doc + hook adapter are independent)
- Phase 2 Tasks 2.1–2.4 sequential (each depends on prior wiring)
- Phase 3 Task 3.1 + 3.2 parallel, then 3.3, then 3.4
- Each Phase = 1 commit
- Final: push to main
