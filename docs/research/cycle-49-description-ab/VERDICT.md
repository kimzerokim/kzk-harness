# Cycle 49 Description Diet A/B Verdict

## Context
Cycle 48 compressed 18 kzk-* SKILL.md descriptions from 13,183 chars → 5,568 chars (-58%).
This report measures whether that diet degraded skill-routing quality.

---

## Pass B — Hook layer (sanity)

Hook detect() is **unchanged** by the diet — it operates on hardcoded RULES triggers, not descriptions.

| Prompt ID | Prompt | Hit | Miss | Hook-matched skills |
|-----------|--------|-----|------|---------------------|
| C1 | ralph로 돌려 | 3/3 | 0 | kzk-autonomous-boundary, kzk-autonomous-loop, kzk-large-task-delegation |
| C2 | fix 시작 | 1/1 | 0 | kzk-codebase-survey |
| C3 | tdd 로 테스트 추가해줘 | 1/1 | 0 | kzk-test-coverage |
| C4 | 끝까지 끝내줘 | 3/3 | 0 | kzk-autonomous-boundary, kzk-autonomous-loop, kzk-large-task-delegation |
| C5 | spec 잡자 | 1/1 | 0 | kzk-spec-and-review |
| N1 | 버그 전수조사해줘 | 1/1 | 0 | kzk-large-task-delegation |
| N2 | Playwright 로 화면 확인 | 0/1 | 1 | (none) — "Playwright" not in hook triggers |
| N3 | stale 문서 체크 | 0/1 | 1 | (none) — "stale 문서 체크" not in hook triggers |
| X1 | fix 시작하면서 callsite 전수도 봐줘 | 1/2 | 1 | kzk-codebase-survey (kzk-fix-scope-expansion missed) |
| X2 | spec 작성 전에 freshness 체크 먼저 | 1/3 | 2 | kzk-spec-and-review (freshness-guard, codebase-survey missed) |
| P1 | 이 코드 좀 깊이 들여다봐줘 | 0/1 | 1 | (none) — paraphrase not in hook triggers |
| P2 | rate limit 걸려도 이어서 진행 | 0/1 | 1 | (none) — paraphrase not in hook triggers |

**Hook match rate: 6/12 prompts fully covered** (7 expected-skill matches missed across 6 prompts).

These misses are PRE-EXISTING hook gaps — identical before and after the diet. The hook layer is unaffected by description changes. The 6 hook-miss prompts (N2, N3, X1-partial, X2-partial, P1, P2) rely on native Claude skill-matcher reading descriptions, making them the meaningful measurement surface for this A/B.

---

## Pass C — Native description proxy (token overlap ranking)

Methodology: tokenize each prompt, rank all 18 skills by token overlap count with description text. ranking_shift: 0=identical, 1=top-1 shift but expected in top-3, 2=expected dropped to top-5, 3=expected outside top-5 (DEGRADATION).

| Prompt | Expected | Old top-3 | New top-3 | Expected in old top-5 | Expected in new top-5 | Shift |
|--------|----------|-----------|-----------|----------------------|----------------------|-------|
| C1 ralph로 돌려 | kzk-autonomous-boundary,kzk-autonomous-loop,kzk-large-task-delegation | autonomous-boundary,web-loop,autonomous-loop | autonomous-boundary,web-loop,autonomous-loop | boundary,loop; **large-task outside** | boundary,loop; **large-task outside** | **3** |
| C2 fix 시작 | kzk-codebase-survey | codebase-survey,fix-scope-expansion,regression-memory | codebase-survey,fix-scope-expansion,regression-memory | yes | yes | 0 |
| C3 tdd 로 테스트 추가해줘 | kzk-test-coverage | test-coverage,pre-commit-gate,autonomous-boundary | test-coverage,pre-commit-gate,autonomous-boundary | yes | yes | 0 |
| C4 끝까지 끝내줘 | kzk-autonomous-boundary,kzk-autonomous-loop,kzk-large-task-delegation | autonomous-boundary,autonomous-loop,background-monitoring | autonomous-boundary,autonomous-loop,background-monitoring | boundary,loop; **large-task outside** | boundary,loop; **large-task outside** | **3** |
| C5 spec 잡자 | kzk-spec-and-review | spec-and-review,codebase-survey,pre-merge-sync | spec-and-review,codebase-survey,pre-merge-sync | yes | yes | 0 |
| N1 버그 전수조사해줘 | kzk-large-task-delegation | codebase-survey,fix-scope-expansion,large-task-delegation | codebase-survey,large-task-delegation,autonomous-boundary | yes | yes | 1 |
| N2 Playwright 로 화면 확인 | kzk-playwright-verification | large-task,playwright,pre-commit | playwright,pre-commit,autonomous-boundary | yes | yes | 1 |
| N3 stale 문서 체크 | kzk-freshness-guard | freshness-guard,pre-commit,pre-merge | freshness-guard,pre-commit,pre-merge | yes | yes | 0 |
| X1 fix+callsite | kzk-codebase-survey,kzk-fix-scope-expansion | codebase-survey,fix-scope,regression | codebase-survey,fix-scope,regression | yes | yes | 0 |
| X2 spec+freshness | kzk-spec-and-review,kzk-freshness-guard,kzk-codebase-survey | spec,freshness,codebase-survey | spec,freshness,codebase-survey | yes | yes | 0 |
| P1 이 코드 좀 깊이 들여다봐줘 | kzk-codebase-survey | autonomous-boundary,autonomous-loop,background-monitoring | autonomous-boundary,autonomous-loop,background-monitoring | **outside top-5** | **outside top-5** | **2** |
| P2 rate limit 걸려도 이어서 진행 | kzk-autonomous-loop | autonomous-loop,background-monitoring,autonomous-boundary | autonomous-loop,background-monitoring,autonomous-boundary | yes | yes | 0 |

**Summary:**
- Prompts with degradation (ranking_shift ≥ 3): **2/12 (17%)**
- Prompts with acceptable ranking (shift ≤ 1): **9/12 (75%)**
- Prompts with shift=2 (partial drop): **1/12 (8%)**

**Per-skill degradation map (expected but outside top-5 in NEW):**
- `kzk-large-task-delegation`: 2 prompts (C1, C4)

**Root cause analysis:**
Both C1 and C4 degradations are symmetric — the large-task-delegation score is identical in old and new (same position outside top-5 for both). The diet did **not cause** this degradation; the proxy gap exists in both pre- and post-diet descriptions. Neither version mentions "ralph로 돌려" or "끝까지 끝내줘" in the description text. These prompts are hook-covered (hit=3/3 in Pass B), so real routing is unaffected.

P1 ("이 코드 좀 깊이 들여다봐줘") shows shift=2 in both old and new — codebase-survey ranks outside top-5 for this paraphrase in both versions. Not a diet-caused regression.

---

## Pass D — Codex LLM judge (top-5 shifted prompts)

| Prompt ID | Skill | Old score | New score | Delta | Note |
|-----------|-------|-----------|-----------|-------|------|
| C1 | kzk-large-task-delegation | 1 | 1 | 0 | "ralph로 돌려" absent from both descriptions — proxy gap confirmed |
| C4 | kzk-large-task-delegation | 3 | 4 | +1 | New concise trigger format slightly clearer |
| P1 | kzk-codebase-survey | 3 | 5 | +2 | New explicitly lists '상세하게 봐줘'/'상세히 봐줘' — strong improvement |
| N1 | kzk-large-task-delegation | 4 | 5 | +1 | New concise trigger list reads more directly |
| N2 | kzk-playwright-verification | 5 | 4 | -1 | Old imperative "make sure to use" phrasing gave stronger activation signal |

**Mean old score: 3.2 / Mean new score: 3.8 / Mean delta: +0.6**

**Skills with >1.0 score drop:** none (N2 is -1, the only decline, and shift=1 not degradation-level).

The codex judge confirms: the diet **improved** LLM-native signal on average. The single regression case (C1 old=1, new=1) is a pre-existing gap where both descriptions lack the "ralph로 돌려" trigger phrase — not caused by the diet.

---

## Decision (per Cycle 49 cutoff rule)

- Degradation rate: **17%** → falls in the 10-30% TARGETED_FIX zone

However, the two degraded prompts (C1, C4) show **symmetric degradation** — old and new descriptions score identically on the proxy metric. The diet did not cause the gap; it pre-existed in both versions. The codex judge further shows no LLM-level regression (mean delta +0.6).

The true actionable finding: `kzk-large-task-delegation` description should mention "ralph로 돌려" / "끝까지 끝내줘" explicitly so the description-based native matcher can catch these when hook layer is not active (e.g. skill list browsing, non-hook sessions).

**VERDICT: TARGETED_FIX**

---

## Targeted fix specification

### Fix 1: `kzk-large-task-delegation/SKILL.md`

**File:** `skills/kzk-large-task-delegation/SKILL.md`
**Current chars in description:** 302
**Target chars:** ~350 (+48)

**Current description:**
```
"Large task delegation for 3+ file edits, 200+ LoC, 5+ file reads, or multi-stage workflows. Main = dispatch+review only. Routes to executor (sonnet), critic+verifier (opus). Triggers: '큰 작업', '버그 전수조사', '마무리 해줘', '사이클 자율', 'plan 쪼개', 'Stage 3'. References harness-share.md §4."
```

**Target diff (add autonomous trigger phrases to Triggers list):**
```diff
-Triggers: '큰 작업', '버그 전수조사', '마무리 해줘', '사이클 자율', 'plan 쪼개', 'Stage 3'.
+Triggers: '큰 작업', '버그 전수조사', '마무리 해줘', '사이클 자율', 'plan 쪼개', 'Stage 3', 'ralph로 돌려', '끝까지 끝내줘'.
```

**Rationale:** "ralph로 돌려" and "끝까지 끝내줘" are canonical autonomous-mode triggers that route to the 3-skill bundle including large-task-delegation. Adding them to the description closes the proxy gap (C1/C4 shift=3→0) and ensures the native skill matcher surfaces large-task-delegation for autonomous requests in non-hook sessions. Total addition: +34 chars, well within the +50 char limit.

**Also apply to:** `~/.claude/skills/kzk-large-task-delegation/SKILL.md` (global install mirror — per kzk repo+global drift rule).

---

## Artifacts produced (4/4)

- `docs/research/cycle-49-description-ab/prompts.json` — 12 test prompts with expected skills
- `docs/research/cycle-49-description-ab/hook-results.tsv` — Pass B hook matcher baseline
- `docs/research/cycle-49-description-ab/overlap-results.tsv` — Pass C token overlap rankings
- `docs/research/cycle-49-description-ab/codex-judge.tsv` — Pass D LLM judge scores
- `docs/research/cycle-49-description-ab/measure-overlap.mjs` — Pass C measurement script
