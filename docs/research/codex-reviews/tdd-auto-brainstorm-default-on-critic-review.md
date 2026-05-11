# TDD Auto + Brainstorm Default ON — Critic Review (Cycle 1)

> Cycle: 1
> Previous: none
> Topic: cycle 54 — autonomous TDD enforcement (Q-TDD-AUTO-MISSING) + spec-and-review §Step -1 brainstorming default ON
> Date: 2026-05-11
> Codex exit: 0, wall: 205s, stdout:     3696 bytes

---

**1. Policy correctness gaps**
1. 🔴 BLOCKER — Brainstorm skip logic is internally contradictory: it says “ALL conditions must hold” but enumerates `OR` between 1/2/3, which permits skip on a single condition. This violates your locked 4-way-AND rule. [skills/kzk-spec-and-review/SKILL.md:17](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-spec-and-review/SKILL.md:17), [harness-share.md:1195](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:1195)
2. 🔴 BLOCKER — `code-file` predicate is logically broken: “does NOT match ALL of the following patterns” is effectively always true for normal files; it should be “does NOT match ANY”. Current text over-triggers auto-TDD. [skills/kzk-test-coverage/SKILL.md:77](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-test-coverage/SKILL.md:77)
3. 🔴 BLOCKER — Boundary drift from SoT (`kzk-pre-commit-gate` doc-only fast path): upgraded rule uses `skills/**` (whole tree) instead of `skills/**/*.md` (docs only). That reclassifies potential non-md skill assets as doc-only incorrectly. [skills/kzk-test-coverage/SKILL.md:80](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-test-coverage/SKILL.md:80), [harness-share.md:576](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:576), [skills/kzk-pre-commit-gate/SKILL.md:151](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-pre-commit-gate/SKILL.md:151)

**2. Halt entry coverage**
1. 🔴 BLOCKER — `Q-TDD-AUTO-MISSING` has no enforceable evidence contract for “failing→passing in same cycle” (no required artifact/log schema), so bypass is easy and classification is non-deterministic. [skills/kzk-test-coverage/SKILL.md:92](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-test-coverage/SKILL.md:92), [skills/kzk-autonomous-boundary/SKILL.md:88](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:88)
2. 🟡 NIT — Infra-missing case is uncategorized at halt granularity: missing coverage/test setup is queued as `Q-COV-SETUP`, but auto-TDD halt table has no dedicated infra/setup reason, only bypass reason. [skills/kzk-test-coverage/SKILL.md:114](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-test-coverage/SKILL.md:114), [skills/kzk-autonomous-boundary/SKILL.md:70](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:70)

**3. Cross-ref bidirectional integrity**
1. 🔴 BLOCKER — `harness-share §33` cross-ref matrix uses `A + C` / `B + C` while `Category C` is undefined in the SoT body; downstream skills reference that ambiguous label. [harness-share.md:1299](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:1299), [harness-share.md:1340](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:1340), [skills/kzk-test-coverage/SKILL.md:60](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-test-coverage/SKILL.md:60)
2. none

**4. Skip-condition tightness for brainstorming default ON**
1. 🔴 BLOCKER — Current connective structure is gameable: explicit `skip brainstorming` alone can pass because of `OR`, despite “ALL must hold” claim. [skills/kzk-spec-and-review/SKILL.md:19](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-spec-and-review/SKILL.md:19), [harness-share.md:1196](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:1196)
2. 🟡 NIT — Condition 3 (“user pre-specified ALL details”) has no evidence requirement, so main can silently self-assert and skip without auditability. [skills/kzk-spec-and-review/SKILL.md:21](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-spec-and-review/SKILL.md:21)

**5. Backward-compat / drift (sister skills)**
1. none
