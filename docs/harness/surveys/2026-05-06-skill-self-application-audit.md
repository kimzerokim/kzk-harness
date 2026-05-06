# Skill §32 Self-Application Audit (2026-05-06)

Cycle 43. Audits 18 SKILL.md bodies against harness-share.md §32 (DRY/YAGNI/KISS + Deletion test + Depth + Design It Twice + Dependency 4-tier + obsolete test). Conservative — information-loss changes excluded.

---

## 1. kzk-autonomous-boundary (97 LoC)

### DRY
- Lines 52–53: halt condition re-states the list also in §Halt conditions table immediately below. The prose summary ("reviewer/critic 2 consecutive FAIL…") duplicates the table header content verbatim.
  - **Verbatim prose (L52–53):** `"reviewer/critic 2 consecutive FAIL / build / test 3 consecutive FAIL / main access required…"`
  - **Verbatim table (L57+):** same triggers, same action text, just formatted as table rows
  - **Primary:** table (L57+). **Cross-ref fix:** replace prose list with "See table below."
- Lines 89–97 §Interaction block: Q-TDD-MAIN entry cross-ref at L94 says "Plan C task 3, 흡수 종료"; also stated at L68 (§Q-TDD-MAIN 흡수 종료). Same closure note in two places.

### YAGNI
- Line 66–68: §Q-TDD-MAIN 흡수 종료 is a one-time historical closure note. It references "Plan A rev2 frozen" and "Plan C task 3" — internal cycle history that doesn't affect runtime behavior. **Deletion test:** removing this paragraph does not break any agent behavior. → **YAGNI delete candidate.**

### KISS
- Lines 59–64 (halt table): each row has a long `Action` cell with duplicated boilerplate ("halt + user-queue entry `Q-…`" appears in every row). Could compact to: Action = "halt + user-queue `Q-X`" without re-explaining halt mechanics per row.
- Lines 80–88 §Branch policy detail: verbose 8-line explanation of branch shapes that largely duplicates CLAUDE.md "Autonomous Execution Boundary". Could reduce to 3-bullet summary + "see CLAUDE.md" cross-ref.

### Deletion test
- §Q-TDD-MAIN 흡수 종료 (L66–68): safe to delete — behavior defined in halt table.
- §Rollback / revert policy (L70–78): useful, not deletable.
- §Interaction with other kzk-* (L89–97): required for cross-skill navigation; keep.

**권고 LoC target:** 97 → ~82 (-15)

---

## 2. kzk-autonomous-loop (70 LoC)

### DRY
- Lines 52–58 §Halt conditions (re-stated): explicitly labeled "re-stated; canonical source: kzk-autonomous-boundary". The 4-bullet list duplicates kzk-autonomous-boundary §Halt conditions exactly.
  - **kzk-autonomous-loop L54–57 verbatim:** `"reviewer/critic 2 consecutive FAIL… build/test 3 consecutive FAIL… main access required… user-queue decision required"`
  - **kzk-autonomous-boundary L46–53 verbatim:** identical content in table + prose
  - **Primary:** kzk-autonomous-boundary. **Fix:** compress to 1 line: "Halt conditions: see kzk-autonomous-boundary §Halt conditions (canonical)."

### YAGNI
- None identified.

### KISS
- Lines 61–63 §Visibility (Session-12 lesson): references "kzk-playwright-verification 'Result narration' section — same rule." The narration rule is fully defined in kzk-playwright-verification. This mention is useful but could be tighter: 2 lines → 1 line.

### Deletion test
- §Halt conditions re-stated (L52–58): safe to compress to 1-line cross-ref; kzk-autonomous-boundary is canonical.

**권고 LoC target:** 70 → ~63 (-7)

---

## 3. kzk-background-monitoring (70 LoC)

### DRY
- Lines 56–57: "Session resume" paragraph duplicates the wakeup restate format already defined in kzk-autonomous-loop §Rate-limit polling step 4 verbatim.
  - **kzk-background-monitoring L56:** `"Resuming: Cycle N, last: [issue], queue: [N remaining], next action: [X]"`
  - **kzk-autonomous-loop L18:** `"Resuming: Cycle N, last: [issue], queue: [N remaining], next action: [X]"` — identical string
  - **Primary:** kzk-autonomous-loop. **Fix:** kzk-background-monitoring cross-refs that skill for the restate format, doesn't repeat the template.

### YAGNI
- Lines 13–14 `> Marginal value` callout on stuck thresholds: this was added to highlight a previously missed gap. Now that it's documented, the `> **Marginal value**` banner is noise — the rule stands on its own.
- Lines 26–27 same `> **Marginal value**` callout on narration mandate: same issue.

### KISS
- Lines 40–46 §Stuck-diagnosis quick set: 3-line bash snippet is fine; not verbose.
- Lines 59–64 §Anti-patterns: emoji markers (❌) are style — borderline per §32 KISS but not a blocker.

### Deletion test
- §Stuck-diagnosis quick set (L40–46): if deleted, agent would need to reconstruct `ps`/`ls`/`cat` pattern from memory. Marginal but keep.
- §Subagent completion verification (L48–55): keep — Q-SUBAGENT-EMPTY pattern is not defined elsewhere.

**권고 LoC target:** 70 → ~64 (-6)

---

## 4. kzk-codebase-survey (269 LoC)

### DRY
- Lines 241–258 §Anti-pattern cycle7-handoff style (L249–258): describes the pattern to avoid in 10 lines. The same anti-pattern is described in kzk-large-task-delegation §Anti-pattern — Main direct-edit (L430–444) with more detail.
  - **kzk-codebase-survey L252–255 verbatim:** "메인이 spec 작성을 위해 reference 코드 파일 여러 개를 순서대로 직접 read / 메인이 Bash(ls/find) → Read 를 연속으로 호출해 reference 목록 수집…"
  - **kzk-large-task-delegation L434–438 verbatim:** "메인이 Bash(ls)/Read 를 reference collection 목적으로 연속 호출 (같은 응답 내 2+ 연속 Read, 또는 Bash(ls/find) → Read 패턴) / 메인이 같은 응답에서 3+ 파일 read 시도 / 메인이 spec 작성 / library 변경의 preparation phase 에서 reference 코드 직접 read"
  - **Primary:** kzk-large-task-delegation (larger, more specific). **Fix:** compress cycle7 block to 3 lines + cross-ref.
- Lines 263–269 §Interaction: kzk-freshness-guard and kzk-fix-scope-expansion mentions are correct cross-refs, not redundant.

### YAGNI
- Lines 187–210 §Autonomous Dispatch Shape: full pseudocode Agent() dispatch. This is useful but the shape is generic — identical dispatch shape appears in kzk-large-task-delegation §Code examples (L163–191) and kzk-web-loop step 1a. The survey-specific parameters (Step 0.5 + 1–8, report path) justify keeping the block, but the Agent() boilerplate wrapper (~8 lines) repeats across skills.

### KISS
- Lines 139–185 §Report format: the full template is 46 lines. Necessary as canonical format; not reducible without information loss.
- Lines 220–235 §MCP tool surface: 8-row table is well-structured and non-redundant.

### Deletion test
- §Autonomous Dispatch Shape (L187–210): if deleted, autonomous callers can infer structure from kzk-large-task-delegation. Marginal keep — the survey-specific prompt text justifies retention.
- §Anti-pattern cycle7-handoff (L249–258): safe to compress to 4-line cross-ref.

**권고 LoC target:** 269 → ~255 (-14)

---

## 5. kzk-codex-handoff (122 LoC)

### DRY
- Lines 125–135 §Codex prompt skeleton: NOT in this file — that's in kzk-spec-and-review. This skill correctly delegates the skeleton to that skill. No DRY issue here.
- Lines 117–123 §Interaction: mentions kzk-spec-and-review owns prompt skeleton — correct boundary.
- Lines 101–106 §Changelog: cycle history entries (Cycle 36, 38, 39, 41). The Changelog section was added in Cycle 38 to separate history from body. **YAGNI / Deletion test:** no agent uses the Changelog at runtime. Safe to delete or move to a separate changelog file if history is needed. **Deletion test PASS** (body behavior unchanged without it).

### YAGNI
- §Changelog (L101–106): 6 lines of cycle history with no runtime behavior. **YAGNI delete candidate.**

### KISS
- Lines 55–65 §Fallback 사다리 table: concise 5-row table. Well-structured.
- Lines 22–48 §Codex CLI 호출 패턴: two code blocks (plain text + JSON mode) with comments. Necessary — no compression without loss.

### Deletion test
- §Glossary (L93–99): 4 definitions. If deleted, NDJSON and E0–E4 terms appear in the body without definition — borderline. Keep (small footprint, prevents confusion).
- §Changelog: safe to delete.

**권고 LoC target:** 122 → ~116 (-6)

---

## 6. kzk-fix-scope-expansion (147 LoC)

### DRY
- Lines 89–108 §Gate 4.5: this section duplicates kzk-pre-commit-gate §Gate 4.5 (L115–135) nearly verbatim.
  - **kzk-fix-scope-expansion L100–107 verbatim:** "Trigger: .kzk-harness/fix-scope-cache.jsonl 존재 시 / Skip: KZK_GATE45_SKIP=1 / Cache policy: JSONL append… / Sanity check: callsite list ⊄ git diff --cached --name-only → BLOCK / BLOCK 시 메시지: Gate 4.5: callsite N곳 중 M곳 미수정."
  - **kzk-pre-commit-gate L119–133 verbatim:** "Trigger: .kzk-harness/fix-scope-cache.jsonl 존재 시 / Skip: KZK_GATE45_SKIP=1 / Cache policy: JSONL append… / Sanity check: callsite list ⊄ git diff --cached --name-only → BLOCK / BLOCK 시 메시지: Gate 4.5: callsite N곳 중 M곳 미수정."
  - **Exact match** on trigger/skip/cache/sanity/block message. **Primary:** kzk-fix-scope-expansion (definition SoT per its own L90). **Fix:** kzk-pre-commit-gate §Gate 4.5 compresses to: "See kzk-fix-scope-expansion §Gate 4.5 and harness-share.md §3.5." Current duplication is intentional for gate discoverability but creates drift risk.

### YAGNI
- Lines 128–135 §Rollback (6 level): detailed rollback table with install-global.sh / jq specifics. Runtime agents don't read this to decide behavior; it's operational reference. Marginal keep — provides genuine recovery guidance. Not YAGNI.

### KISS
- Lines 23–36 §Fix-start hook / Trigger 룰: step-by-step list with code is necessary.
- Lines 69–72 §recall consumer 관계 (Plan D): 4-line cross-ref noting slot ordering — useful, not verbose.

### Deletion test
- §자가-skip guard (L110–115): 6 lines. If deleted, agents fall back to hook-shared.mjs source. Safe cross-ref compress: "자가-skip guard: hook-shared.mjs §SELF_IMPROVE_VERBPHRASES (단일 SoT)."

**권고 LoC target:** 147 → ~140 (-7)

---

## 7. kzk-freshness-guard (91 LoC)

### DRY
- Lines 64–68 §Pre-commit Gate 0.5: this content repeats kzk-pre-commit-gate §Gate 0.5 (L29–43). The gate logic (getChangedFiles → findStaleMetaDocs → branch) is defined in both.
  - **kzk-freshness-guard L65–69 verbatim:** "staged 파일 → CRG 심볼 역참조 → stale 감지 / stale 발견: BLOCK + 목록 + auto-fix dispatch + restage / stale 없음: PASS"
  - **kzk-pre-commit-gate L33–42 verbatim:** "crg-utils.getChangedFiles('staged') → staged 파일 목록 / crg-utils.findStaleMetaDocs → stale 목록 / stale 발견 → BLOCK + auto-fix dispatch + restage / stale 없음 → PASS"
  - **Primary:** kzk-freshness-guard (owns the detection logic). kzk-pre-commit-gate §Gate 0.5 should compress to cross-ref. Both are needed for discoverability but should not maintain duplicate procedure text.

### YAGNI
- None identified.

### KISS
- Lines 15–27 §Detection Logic: pseudocode block is clear and non-verbose. Keep.
- Lines 54–62 §Auto-fix table: 5-row table, concise. Keep.

### Deletion test
- §CRG Canonical Contract (L72–75): 4-line rule ("crg-utils.mjs = single entry point"). If deleted, agents might call CLI directly. Keep — enforcement rule.
- §Rollback (L87–92): 3-line env-var list. Safe to keep (small, operational).

**권고 LoC target:** 91 → ~87 (-4)

---

## 8. kzk-large-task-delegation (455 LoC)

### DRY
- Lines 261–274 §Anti-self-verification boilerplate: identical text block also in kzk-test-coverage §Anti-pattern L34–47 and inline boilerplate in §Subagent prompt requirements L263–272. Three locations for the same boilerplate.
  - **kzk-large-task-delegation L264–273 verbatim:** `"[ANTI-SELF-VERIFICATION RULE…] TDD red 단계… 허용 read: spec / acceptance criteria… 금지 read: 지금 작성하려는 함수 본문…"`
  - **kzk-test-coverage L34–46 verbatim:** same semantic content but framed as "Anti-pattern — Test-from-implementation"
  - These serve different consumers (dispatch prompt injection vs. skill trigger), so full deduplication risks silent gaps in dispatch prompts. However the boilerplate inside the dispatch block (L264–273) and the §Anti-pattern definition (L261–274) are the same block — the §Anti-self-verification boilerplate header section is the declaration; the inline in §Subagent prompt requirements is the injection point. These two locations within this skill are justified.
- Lines 404–413 §Session-6 lesson and Lines 415–428 §Session-28 lesson: historical narrative sections (~25 combined LoC) that describe past incidents. Useful for onboarding/context but contain no runtime rules beyond what is stated in the operational sections above them.
  - **Deletion test:** removing these does NOT break any rule enforcement. The "Operational checks" (L424–428) and "Skill-load chain rule" (L420–423) contain the actionable rules — those must stay. The narrative paragraphs (L404–418) can be trimmed.

### YAGNI
- Lines 155–159 §Default split: "Typical session: 50% sonnet + 30% haiku + 20% opus" distribution note. No agent enforces this ratio; it's guidance. Marginally useful but could be reduced to 1 line.
- Lines 397–403 §Plan C self-bootstrap N/A exception: applies only to a one-time historical bootstrap commit. **Deletion test:** safe to delete — any new Plan C would author its own exception note. **YAGNI delete candidate.**

### KISS
- Lines 163–191 §Code examples: 4 code blocks illustrating model routing. Clear, non-verbose. Keep.
- Lines 327–346 §Verifier prompt structure: 3-block mandatory format. Necessary — agents reference this for dispatch prompt construction.
- Lines 381–395 §Stage 3 ↔ Gate 5 cache 규약: cache key triple definition. Necessary for cross-skill consistency.

### Deletion test
- §Plan C self-bootstrap N/A exception (L397–403): safe to delete.
- §Session-6 lesson narrative prose (L404–413, first 9 lines up to "Re-prevention:"): safe to trim; Re-prevention bullets (L410–413) stay.
- §Session-28 lesson incident narrative (L415–418): safe to trim; operational rules (L420–428) stay.

**권고 LoC target:** 455 → ~425 (-30)

---

## 9. kzk-playwright-verification (115 LoC)

### DRY
- Lines 51–65 §Result narration table: this table is the canonical definition. kzk-background-monitoring §Narration mandate (L26–29) cross-refs this table — correct pattern. No DRY issue here.
- Lines 87–95 §Self-recovery 5 steps: steps 1–5 are specific to Playwright MCP reconnect. kzk-web-loop §Playwright Resilience (L170–188) defines a cascade recovery that overlaps with steps 1–3.
  - **kzk-playwright-verification L91–95 verbatim:** "claude mcp list → claude mcp add playwright → /mcp reconnect → ToolSearch → restart session"
  - **kzk-web-loop L174–186 verbatim:** "ToolSearch(+browser navigate) → claude mcp list → claude mcp add playwright → wait 10s → retry → DEGRADED MODE"
  - Semantic overlap on steps 1–3. Primary: kzk-playwright-verification (defines the 5-step self-recovery). kzk-web-loop defines its own cascade recovery (different because it never halts). These serve different consumers; both justified.

### YAGNI
- Lines 99–101 §Token-migration warning (shadcn + Tailwind v4): project-specific note about CSS variable bridging. This is adopter-specific context, not a universal harness rule. **Deletion test:** removing does not affect any harness protocol. **YAGNI candidate** — better suited for an adopting project's CLAUDE.md.

### KISS
- Lines 73–85 §Debug cheatsheet table: 8 specific symptom/cause/fix rows. Necessary operational reference; keep.

### Deletion test
- §Token-migration warning (L99–101): safe to delete from the skill; move to adopter docs if needed.

**권고 LoC target:** 115 → ~112 (-3)

---

## 10. kzk-pre-commit-gate (250 LoC)

### DRY
- Lines 115–135 §Gate 4.5: duplicates kzk-fix-scope-expansion §Gate 4.5 (see item 6 above). **Critical cross-skill DRY.**
- Lines 29–43 §Gate 0.5: duplicates kzk-freshness-guard §Pre-commit Gate 0.5 (see item 7 above). **Critical cross-skill DRY.**
- Lines 137–168 §Gate 5: partially duplicates kzk-large-task-delegation §Three-stage review §Stage 3 (L296–401). However, kzk-pre-commit-gate §Gate 5 correctly states it's a "commit-unit" gate (diff base = --cached) while Stage 3 is a "cycle-unit" check (diff base = HEAD~1). The distinction is real and both are needed. The VERDICT table (L157–162) is a near-verbatim copy of kzk-large-task-delegation L358–364, though.
  - **kzk-pre-commit-gate L157–162 verbatim:** "PASS → commit 진행 / PARTIAL → commit BLOCK + 추가 fix cycle / FAIL → commit BLOCK + fix cycle. 2 consecutive FAIL → halt + Q-VERIFIER-FAIL / INVALID_VERDICT → commit BLOCK + Q-VERIFIER-INVALID / Dispatch fail → commit BLOCK + Q-VERIFIER-DISPATCH-FAIL"
  - **kzk-large-task-delegation L358–364 verbatim:** identical verdict/action mapping
  - **Primary:** kzk-large-task-delegation. **Fix:** Gate 5 verdict table → single cross-ref line.

### YAGNI
- Lines 182–198 §Doc-only commit exception: 17 lines. Necessary — gate bypass rules must be explicit.
- Lines 200–212 §Doc-only patch policy: 13 lines. Overlaps with §Doc-only commit exception — the patch policy (L200–212) is an extension specifying minimal verification set. Could merge with §Doc-only commit exception to reduce split.

### KISS
- Lines 215–222 §Autonomous-mode commit policy: 8-line policy block. Concise. Keep.
- Lines 225–230 §Commit message: 6-line rules. Keep.

### Deletion test
- §Doc-only patch policy (L200–212): consolidate with §Doc-only commit exception — same topic, split without strong reason.

**권고 LoC target:** 250 → ~230 (-20)

---

## 11. kzk-pre-merge-sync (105 LoC)

### DRY
- Lines 87–98 §4. Freshness sweep: 12-line block that describes the same crg-utils.getChangedFiles + findStaleMetaDocs + auto-fix flow as kzk-freshness-guard §자동 호출 지점 row "kzk-pre-merge-sync" and §Detection Logic.
  - **kzk-pre-merge-sync L91–97 verbatim:** "crg-utils.getChangedFiles('base') → branch 전체 변경 파일 / crg-utils.findStaleMetaDocs → stale 감지 / stale 발견 시: auto-fix dispatch (Gate 0.5 와 동일 전략)"
  - **kzk-freshness-guard §Detection Logic L17–27:** same function calls, same branching logic
  - **Primary:** kzk-freshness-guard. **Fix:** §4 compresses to: "kzk-freshness-guard §자동 호출 지점 'kzk-pre-merge-sync' row — branch-wide stale sweep."

### YAGNI
- Lines 76–85 §Combined PR description footer: checklist template is useful but partially duplicates CLAUDE.md "Branch contract" section. However this is a concrete artifact template agents copy, so keep.

### KISS
- Lines 47–68 §3. Hook auto-enable: 22-line section with fail-closed verification. Necessary — not reducible without losing the verification steps.

### Deletion test
- §4. Freshness sweep (L87–98): safe to compress to 3-line cross-ref.

**권고 LoC target:** 105 → ~96 (-9)

---

## 12. kzk-production-access (75 LoC)

### DRY
- Lines 32–35 §Production state changes: repeats the "코드 우선 / AI 직접 호출 금지 / 멱등성" rules also in kzk-pre-commit-gate §Gate 1.6 FAIL patterns (L70–83) and the production-code-first boilerplate in kzk-large-task-delegation L244–255.
  - **kzk-production-access L32–35 verbatim:** "코드 우선: migrations/ / IaC / scripts/prod/ 로 작성, git tracked / AI 직접 호출 금지: psql … ALTER TABLE / aws iam create-policy … 즉시 실행 X / 멱등성: SQL IF NOT EXISTS / ON CONFLICT DO NOTHING"
  - **kzk-large-task-delegation L244–255 verbatim:** "[PRODUCTION-CODE-FIRST RULE] AI 직접 실행 금지… script 작성 → 사용자 review… 멱등성 의무: IF NOT EXISTS / ON CONFLICT DO NOTHING"
  - **Primary:** kzk-production-access (declared SoT in kzk-pre-commit-gate §Gate 1.6 header). The boilerplate in kzk-large-task-delegation is intentional injection text — that redundancy is by design. No change needed on the boilerplate.

### YAGNI
- Lines 17–29 §자가 점검 (5 questions): `> **Marginal value**` callout banner (L18–19) is noise for same reason as kzk-background-monitoring (cycle 41 compression already happened but banner persisted).

### KISS
- Lines 44–50 §Environment exceptions table: 2-row table, concise. Keep.
- Lines 52–58 §Credential handling table: 2-row table, concise. Keep.

### Deletion test
- §자가 점검 (L17–29): if deleted, agent loses the 5-question self-check. Keep — distinct enforcement value.
- §Anti-patterns (L60–68): if deleted, agents lose the concrete forbidden examples. Keep.

**권고 LoC target:** 75 → ~73 (-2)

---

## 13. kzk-regression-memory (157 LoC)

### DRY
- Lines 129–136 §Default DISABLED 정책: repeats kzk-pre-merge-sync §3 Hook auto-enable logic (hook default DISABLED, auto-enable on merge, fail-closed).
  - **kzk-regression-memory L129–135 verbatim:** "D commit 시점: hook 파일은 추가하지만 settings.json 등록 안 함 / 자동 enable on main 머지: 5 plan (A→D→B→C→E) 모두 끝나고 kzk-pre-merge-sync 의 마지막 step 에서 install-global.sh --enable-hooks --regression-recall 자동 호출 (사용자 confirm 게이트) / fail-closed"
  - **kzk-pre-merge-sync L48–67 verbatim:** same 5-plan ordering, same install-global.sh command, same fail-closed verification
  - **Primary:** kzk-pre-merge-sync (first-enable gate). kzk-regression-memory's §Default DISABLED should compress to: "Default DISABLED — see kzk-pre-merge-sync §3 for enable gate and fail-closed verification."

### YAGNI
- Lines 139–149 §Rollback (7 level): detailed rollback table. Runtime agents don't use this table at execution time. Operational reference only. **Marginal keep** — recovery procedures are genuinely useful when things break.

### KISS
- Lines 15–39 §Storage 모델: two tables (Backend + Sidecar). Necessary — field semantics are load-bearing for hook implementation.
- Lines 43–68 §Recall 룰: 9-step numbered list. Necessary — hook logic specification.
- Lines 91–107 §자가-skip guard: env-var and verb-phrase list. Necessary — false-positive prevention.

### Deletion test
- §Default DISABLED 정책 (L129–136): safe to compress to 2-line cross-ref.

**권고 LoC target:** 157 → ~148 (-9)

---

## 14. kzk-spec-and-review (158 LoC)

### DRY
- Lines 125–127 §Codex consult — 호출 메커니즘: 2-line block that just says "> See kzk-codex-handoff §Codex CLI 호출 패턴." This is already a cross-ref, not duplication. Correct pattern.
- Lines 129–133 §Cost / cadence: "Per round: ~2-3 min wall, ~25-30k tokens. 1 spec = 1 round. 1 major plan = 1 round. User explicit OFF only skips the loop."
  - This is also stated in kzk-codex-handoff §Cost / cadence (L90–92): "1 round = ~2-3 min wall, ~25-30k tokens. 사용자 explicit OFF 만 skip."
  - **Primary split:** kzk-codex-handoff owns the per-call cost. kzk-spec-and-review owns the per-spec cadence rule ("1 spec = 1 round"). Minor overlap on the token/time numbers.
- Lines 135–136 §Prompt size guideline: "> See kzk-codex-handoff §Prompt size guideline." Already a cross-ref. Correct.

### YAGNI
- Lines 139–143 §Artifact retention: 5-line section. "Future '왜 이렇게 결정했나' questions fall back on these files." This is rationale, not a rule agents act on. **Deletion test:** if deleted, agents still know to save verdict files from §Verdict file convention. **Marginal YAGNI candidate** — 3 lines could compress to 1.

### KISS
- Lines 96–123 §Codex prompt skeleton: full template block. Necessary — agents reference this verbatim. Keep.
- Lines 88–95 §Verdict file convention: path format + cycle counter rules. Necessary. Keep.

### Deletion test
- §Artifact retention (L139–143): compressible to 1-line rationale.

**권고 LoC target:** 158 → ~154 (-4)

---

## 15. kzk-test-coverage (93 LoC)

### DRY
- Lines 59–68 §자율 mode 판별: the autonomous-mode keyword list (KZK_AUTONOMOUS=1, "ralph 로 돌려", "web-loop 진입", etc.) duplicates kzk-autonomous-boundary §Allowed actions and kzk-regression-memory §자가-skip guard §자율 mode 판별 section.
  - **kzk-test-coverage L60–64 verbatim:** "환경변수 KZK_AUTONOMOUS=1 → 자율 mode (가장 신뢰) / 환경변수 unset 시 보조 키워드 매칭 — 동사구만: 'ralph 로 돌려', 'web-loop 진입', 'autonomous-loop 시작', 'harness 개선 루프 시작', '자가개선 cycle 진입', '끝까지 끝내줘'"
  - **kzk-regression-memory L95–107 verbatim:** "환경변수 KZK_HARNESS_SELF_IMPROVEMENT=1 → 즉시 skip / 환경변수 KZK_AUTONOMOUS=1 → 즉시 skip / user prompt 에서 self-improvement 동사구 grep — harness 개선 루프 시작 / 스킬 개선해줘 / harness loop 진입 / 자가개선 cycle 진입 / 자가개선 돌려줘 / 메타 cycle 진입 / ralph 로 돌려"
  - These serve slightly different purposes (kzk-test-coverage: determines when to forbid main direct TDD; kzk-regression-memory: determines when to skip recall injection). Overlap is real but justification differs. **Primary for autonomous-mode determination:** no single SoT today — **Critical gap.** A single `harness-share.md §autonomous-mode-detection` definition should be the SoT for all three.
- Lines 88–93 §Interaction (last bullet on Plan A / kzk-autonomous-boundary): contains a lengthy historical note about "split-brain위험 인지 — Plan A frozen 시 follow-up issue 등록 의무." This is historical closure text similar to kzk-autonomous-boundary §Q-TDD-MAIN 흡수 종료. **YAGNI delete candidate.**

### YAGNI
- Lines 88–93: historical Plan A follow-up note in §Interaction. **YAGNI delete candidate.**

### KISS
- Lines 19–28 §TDD sequence: 4-step numbered list. Concise. Keep.
- Lines 34–45 §Red 단계 허용/금지 read: well-structured. Keep.

**권고 LoC target:** 93 → ~86 (-7)

---

## 16. kzk-tool-retry (109 LoC)

### DRY
- Lines 60–68 §PreToolUse guard (edit-read-guard hook): describes the hook's read-log scope, cross-turn session behavior, bypass token, kill switch. This information is also in harness-share.md §27.1 (per L81 cross-ref). No redundancy within the skill set — this is the primary definition.

### YAGNI
- None identified.

### KISS
- Lines 32–50 §Pre-emptive Read protocol (invalidators table): 6-row table. Necessary — agents reference this table to decide when to re-read. Keep.
- Lines 70–79 §edit-read-guard block 시 무중단 자동 복구: 4-step mandatory procedure. Clear. Keep.

### Deletion test
- §Forbidden anti-pattern (L88–90): 3-line callout. If deleted, the rule is implicitly covered by §Default policy. Marginally deletable — but as a named forbidden callout it adds clarity. Keep.

**권고 LoC target:** 109 → ~109 (0 — well-optimized)

---

## 17. kzk-user-queue (84 LoC)

### DRY
- Lines 76–85 §Interaction / Queue producers list: lists 7 producer skills with entry prefixes. This is a useful index. kzk-autonomous-boundary §Halt conditions table also lists Q-entry names but doesn't describe all producers. No harmful duplication.

### YAGNI
- None identified.

### KISS
- Lines 38–56 §Interactive Queue Review three-stage protocol: clear, structured. Keep.
- Lines 14–18 §Append-during-autonomous protocol: 4-step list. Concise. Keep.

### Deletion test
- All sections appear necessary for queue lifecycle management. No deletable sections identified.

**권고 LoC target:** 84 → ~84 (0 — well-optimized)

---

## 18. kzk-web-loop (254 LoC)

### DRY
- Lines 225–235 §Subagent Dispatch Requirements: 10-line list of mandatory dispatch prompt fields. This is a verbatim extract of kzk-large-task-delegation §Subagent prompt requirements (L209–222).
  - **kzk-web-loop L226–235 verbatim:** "Scope: file paths + line ranges / Branch name / Required reading: CLAUDE.md, spec doc path, harness-share.md §25 / Rules: TDD strict, context7 mandate, kzk-pre-commit-gate (6 gates…), DO-NOT-MODIFY paths / Commit convention: English conventional commits, no Co-Authored-By / Working directory absolute path / Return format on success / Halt condition: BLOCKED → user-queue entry"
  - **kzk-large-task-delegation L209–221 verbatim:** same list with identical items
  - **Primary:** kzk-large-task-delegation. **Fix:** §Subagent Dispatch Requirements → 2 lines: "All dispatch prompts include the mandatory fields from kzk-large-task-delegation §Subagent prompt requirements, plus: harness-share.md §25 as required reading, branch name, 6-gate or 5-gate pre-commit rule."
- Lines 68–84 §5.5 Cycle 회고: partially duplicates kzk-regression-memory §Cycle 회고 통합 5W1H. The web-loop–specific file_snapshot and sidecar atomic append details are the same as kzk-regression-memory L109–118.
  - **kzk-web-loop L74–79 verbatim:** `{"key":"cycle-N-<axis>","file_snapshot":"<path>:<line>@<git rev-parse HEAD:path>","related_cycles":[N],"dismiss_count":0,"last_dismissed_at":null,"archived":false,"stale":false}`
  - **kzk-regression-memory L116 verbatim:** same JSONL template (same 7 fields in same order)
  - **Primary:** kzk-regression-memory. **Fix:** web-loop §5.5 references kzk-regression-memory §Cycle 회고 통합 §Where row, drops the JSONL template duplicate.

### YAGNI
- Lines 115–162 §Plugin Pre-flight: 48-line section with full bash script, session restart logic, graceful degradation table. This is web-loop–specific setup logic. Not reducible without loss — the degradation table and restart queue entry are non-obvious. Keep.

### KISS
- Lines 93–113 §Evaluation Criteria (P0/P1/P2): clean 3-section priority list. Keep.
- Lines 169–188 §Playwright Resilience: cascade recovery diagram. Well-structured. Keep.

### Deletion test
- §Subagent Dispatch Requirements (L225–235): safe to compress to 2-line cross-ref + web-loop additions.
- §5.5 JSONL template within cycle 회고 (L74–79): safe to cross-ref kzk-regression-memory.

**권고 LoC target:** 254 → ~234 (-20)

---

## Summary Table

| # | Skill | LoC | DRY 발견 | YAGNI 발견 | KISS 압축 | Deletion test obsolete | 권고 LoC target |
|---|---|---|---|---|---|---|---|
| 1 | kzk-autonomous-boundary | 97 | L52-53 halt list duplicates table; L68 closure note dup | L66-68 §Q-TDD-MAIN closure note | L59-64 halt table Action cells; L80-88 branch policy | §Q-TDD-MAIN 흡수 종료 (L66-68) | ~82 (-15) |
| 2 | kzk-autonomous-loop | 70 | L52-58 halt list duplicates kzk-autonomous-boundary exactly | — | L61-63 visibility note | §Halt conditions re-stated → 1-line cross-ref | ~63 (-7) |
| 3 | kzk-background-monitoring | 70 | L56 restate format duplicates kzk-autonomous-loop L18 | L13-14, L26-27 marginal value banners | — | Marginal value banners (L13-14, L26-27) | ~64 (-6) |
| 4 | kzk-codebase-survey | 269 | L249-258 cycle7 anti-pattern dup kzk-large-task-delegation §Anti-pattern | — | L249-258 compress to 4-line cross-ref | §Anti-pattern cycle7-handoff verbose block | ~255 (-14) |
| 5 | kzk-codex-handoff | 122 | — | L101-106 §Changelog (6 lines, runtime-inert) | — | §Changelog | ~116 (-6) |
| 6 | kzk-fix-scope-expansion | 147 | L89-108 §Gate 4.5 duplicates kzk-pre-commit-gate §Gate 4.5 | — | L110-115 자가-skip guard compress to cross-ref | §자가-skip guard compress | ~140 (-7) |
| 7 | kzk-freshness-guard | 91 | L64-68 §Gate 0.5 proc dup kzk-pre-commit-gate §Gate 0.5 | — | — | — | ~87 (-4) |
| 8 | kzk-large-task-delegation | 455 | L358-364 VERDICT table dup in kzk-pre-commit-gate §Gate 5 | L397-403 Plan C self-bootstrap N/A | L404-418 session lesson narrative prose | Plan C self-bootstrap N/A (L397-403); session-6/28 narrative prose | ~425 (-30) |
| 9 | kzk-playwright-verification | 115 | — | L99-101 shadcn/Tailwind migration note (project-specific) | — | §Token-migration warning (L99-101) | ~112 (-3) |
| 10 | kzk-pre-commit-gate | 250 | L115-135 Gate 4.5 dup fix-scope-expansion; L29-43 Gate 0.5 dup freshness-guard; L157-162 VERDICT table dup kzk-large-task-delegation | — | L200-212 §Doc-only patch policy merge with §Doc-only exception | §Doc-only patch policy consolidate | ~230 (-20) |
| 11 | kzk-pre-merge-sync | 105 | L87-98 §4 Freshness sweep dup kzk-freshness-guard Detection Logic | — | §4 compress to 3-line cross-ref | §4 Freshness sweep procedure | ~96 (-9) |
| 12 | kzk-production-access | 75 | L32-35 code-first rules dup kzk-large-task-delegation boilerplate (by-design injection — no change) | L18-19 marginal value banner | — | Marginal value banner (L18-19) | ~73 (-2) |
| 13 | kzk-regression-memory | 157 | L129-136 §Default DISABLED dup kzk-pre-merge-sync §3 | — | §Default DISABLED → 2-line cross-ref | §Default DISABLED procedure text | ~148 (-9) |
| 14 | kzk-spec-and-review | 158 | L129-133 §Cost/cadence minor overlap with kzk-codex-handoff | L139-143 §Artifact retention compress | §Artifact retention 5-line → 1-line | §Artifact retention verbose | ~154 (-4) |
| 15 | kzk-test-coverage | 93 | L59-68 autonomous-mode keyword list: no single SoT across 3 skills (Critical) | L88-93 Plan A historical note in §Interaction | Autonomous-mode detection: needs harness-share §N SoT | Plan A historical follow-up note (L88-93) | ~86 (-7) |
| 16 | kzk-tool-retry | 109 | — | — | — | — | ~109 (0) |
| 17 | kzk-user-queue | 84 | — | — | — | — | ~84 (0) |
| 18 | kzk-web-loop | 254 | L225-235 §Subagent Dispatch Requirements dup kzk-large-task-delegation; L74-79 JSONL template dup kzk-regression-memory | — | Both compress to cross-ref + delta | §Subagent Dispatch Requirements; JSONL template in §5.5 | ~234 (-20) |
| **Total** | | **2721** | | | | | **~2558 (-163)** |

---

## 합산 추정 LoC 감소

2721 → ~2558 총 **-163 LoC** 추정 (6.0% 감소)

cycle 42 에서 이미 처리된 3 marginal SKILL 이 있더라도 남은 15개 에서 충분한 압축 여지 발견.

---

## Critical 발견

### 1. Cross-skill §Gate 4.5 exact duplication (P0)
kzk-fix-scope-expansion §Gate 4.5 (L89-108) ↔ kzk-pre-commit-gate §Gate 4.5 (L115-135): trigger / skip / cache policy / sanity check / BLOCK message — 20줄 완전 중복. **Primary: kzk-fix-scope-expansion.** kzk-pre-commit-gate §Gate 4.5 → "See kzk-fix-scope-expansion §Gate 4.5 and harness-share.md §3.5" 3-line cross-ref.

### 2. Cross-skill §Gate 0.5 procedure duplication (P0)
kzk-freshness-guard §Pre-commit Gate 0.5 (L64-69) ↔ kzk-pre-commit-gate §Gate 0.5 (L29-43): detection flow duplicated. **Primary: kzk-freshness-guard.** kzk-pre-commit-gate §Gate 0.5 → 5-line cross-ref preserving KZK_GATE05_SKIP and CRG degraded-mode note.

### 3. Autonomous-mode detection keyword list: no single SoT (P1)
Three skills each define their own autonomous-mode detection list:
- kzk-test-coverage L59-64: 6 verb phrases
- kzk-regression-memory L95-107: 7 verb phrases (slightly different set)
- kzk-autonomous-boundary: implicit in trigger description

These lists have drift potential (one gets updated, others don't). **Recommendation: add `harness-share.md §autonomous-mode-detection` as SoT, all three skills cross-ref it.**

### 4. VERDICT table duplication (P1)
kzk-large-task-delegation §Three-stage review §PASS/FAIL/PARTIAL 처리 table (L358-364) ↔ kzk-pre-commit-gate §Gate 5 verdict processing (L157-162): near-verbatim. **Primary: kzk-large-task-delegation.** Gate 5 → "Verdict handling: per kzk-large-task-delegation §Three-stage review §VERDICT 처리 table (same logic, diff base = --cached)."

### 5. §Subagent Dispatch Requirements in kzk-web-loop exact duplication (P1)
kzk-web-loop L225-235 ↔ kzk-large-task-delegation L209-221: same 8-field list. Cross-ref fix with 2-line delta noting web-loop specific additions (harness-share §25 required reading, 6-gate/5-gate conditional).

---

## 권고 — 다음 step (executor sonnet dispatch)

아래 변경 유형별로 executor dispatch 시 정확한 line range 와 변경 type 명시.

### Batch A — DRY cross-ref replace (kzk-pre-commit-gate 가 primary 수정 대상)
1. **kzk-pre-commit-gate §Gate 4.5** (L115-135, 21 lines): Delete duplicate body. Replace with: `> Cross-ref: kzk-fix-scope-expansion §Gate 4.5 (canonical). Skip: KZK_GATE45_SKIP=1. Cache: .kzk-harness/fix-scope-cache.jsonl. See harness-share.md §3.5.`
2. **kzk-pre-commit-gate §Gate 0.5** (L29-43, 15 lines): Compress to 6-line cross-ref retaining KZK_GATE05_SKIP and CRG degraded note.
3. **kzk-pre-commit-gate §Gate 5 VERDICT table** (L157-162, 6 lines): Replace table with: `Verdict handling per kzk-large-task-delegation §Three-stage review §VERDICT 처리 (diff base = --cached for Gate 5 vs HEAD~1 for Stage 3; otherwise identical).`

### Batch B — DRY cross-ref replace (각 skill)
4. **kzk-autonomous-loop §Halt conditions re-stated** (L52-58): 7 lines → 1 line cross-ref.
5. **kzk-pre-merge-sync §4 Freshness sweep** (L87-98): 12 lines → 3-line cross-ref.
6. **kzk-regression-memory §Default DISABLED** (L129-136): 8 lines → 2-line cross-ref.
7. **kzk-web-loop §Subagent Dispatch Requirements** (L225-235): 11 lines → 2-line cross-ref + delta.
8. **kzk-web-loop §5.5 JSONL template** (L74-79): 6-line template → cross-ref kzk-regression-memory §Cycle 회고 통합 §Where.
9. **kzk-background-monitoring §Session resume** (L56-57): 2-line restate format → cross-ref kzk-autonomous-loop step 4.
10. **kzk-codebase-survey §Anti-pattern cycle7-handoff** (L249-258): 10 lines → 4-line compress with cross-ref kzk-large-task-delegation §Anti-pattern.

### Batch C — YAGNI delete
11. **kzk-autonomous-boundary §Q-TDD-MAIN 흡수 종료** (L66-68): delete 3 lines.
12. **kzk-codex-handoff §Changelog** (L101-106): delete 6 lines.
13. **kzk-large-task-delegation §Plan C self-bootstrap N/A exception** (L397-403): delete 7 lines.
14. **kzk-large-task-delegation §Session-6/28 incident narrative prose** (L404-418 narrative portions, keep Re-prevention bullets L410-413 + Operational checks L424-428): delete ~14 narrative lines.
15. **kzk-test-coverage §Interaction Plan A historical note** (L88-93): delete 6 lines.
16. **kzk-playwright-verification §Token-migration warning** (L99-101): delete 3 lines.
17. **kzk-background-monitoring marginal value banners** (L13-14, L26-27): delete 4 lines.
18. **kzk-production-access marginal value banner** (L18-19): delete 2 lines.

### Batch D — KISS compress (non-DRY verbose)
19. **kzk-autonomous-boundary §Branch policy detail** (L80-88): compress 9 lines → 4 lines + "see CLAUDE.md Autonomous Execution Boundary".
20. **kzk-pre-commit-gate §Doc-only commit exception + §Doc-only patch policy** (L182-212): merge two sections, eliminate split → save ~6 lines.
21. **kzk-spec-and-review §Artifact retention** (L139-143): 5 lines → 1 line.

### Structural gap — needs architect decision (not executor)
22. **Autonomous-mode detection SoT**: three skills (kzk-test-coverage, kzk-regression-memory, kzk-autonomous-boundary) each maintain their own keyword list. Needs harness-share.md §autonomous-mode-detection section as SoT. This is a §32 DRY violation that requires a new harness-share section — architect scope, not executor scope.

