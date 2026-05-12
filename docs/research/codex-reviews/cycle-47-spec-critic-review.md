# Cycle 47 Spec Critic Review (codex-cli, plain text mode, high effort)

> Spec under review: `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` (503 lines)
> Survey reference: `docs/harness/surveys/2026-05-07-cycle-47-b2-c1-queue-survey.md`
> Codex CLI: 0.128.0, sandbox=read-only, ephemeral, model_reasoning_effort=high
> Date: 2026-05-07
> Tokens used: ~90,513

---

## Codex verdict (12 findings)

1. **B2 correctness** (§3.3): Partial fix for G1/G2, but rule is not operationally testable. "같은 방향" and "실패" are undefined (symptom unchanged? test fail? side-effect fail?), so false positives/negatives are likely. Layer labels also blur (`L3` example text conflicts with table semantics).

2. **B2 cross-ref completeness** (§3.4): Incomplete. `fix-scope-expansion` is also referenced in `skills/kzk-pre-commit-gate/SKILL.md`, `skills/kzk-codebase-survey/SKILL.md`, `skills/kzk-autonomous-loop/SKILL.md`. No existing `Q-FIX-PIVOT-FAIL` producers found outside this spec/survey.

3. **C1 hook conflict risk** (§4.2): Normal `git push` should pass, yes. But guard script is regex-only, no allowlist contract, and is bypassable for some destructive variants (`git clean -df`, etc.). Also `jq` missing => likely fail-open approve path.

4. **C1 MEDIUM defer rationale** (§4.3): Over-broad. `write-a-skill` is not issue-tracker-dependent like `to-issues`/`triage`; bundling all 5 under one rationale is weak and internally inconsistent with §4.1's "optional standalone" framing.

5. **Y producer completeness** (§5.3): Still incomplete. Missing at least `Q-FILE-MISSING-<basename>` (`kzk-freshness-guard`), `Q-PW-OAUTH-NEW-ACCOUNT` (`kzk-playwright-verification`), and `Q-AUTOLOOP` mention path (`kzk-autonomous-loop`).

6. **Y migration window** (§5.4): Real risk. If a Q-entry fires mid-migration, old append style can land outside `## OPEN`. Add transitional writer logic that accepts both old and new layouts during rollout. Also, "5 raw echo patterns" does not match current repo file (1 explicit raw append).

7. **Sequencing** (§6): B2→Y dependency is valid (`Q-FIX-PIVOT-FAIL` must exist before producer-table finalization). C1 install itself is technically independent and could run parallel, but C1's NOT_USED recording depends on Y format; locked order is defensible.

8. **AC testability** (§3.5, §4.5, §5.6): Mostly mechanical presence checks, not behavior checks. No executable AC verifies pivot detection logic correctness, layer transition correctness, or section-aware insertion behavior under live append events.

9. **Out-of-scope clarity** (§7): none — looks correct. G3/G4 are explicitly deferred and repeatedly scoped out.

10. **Code Quality Discipline substance** (§9): Partly ceremonial. Several bullets assert outcomes ("depth 적절", "판정: 불필요") without measurable checks or enforcement hooks; DRY/Deletion/Obsolete tests are mostly narrative, not gating criteria.

11. **Risk coverage gaps** (§8): Missing key risks: PreToolUse hook composition/ordering with existing hooks, `jq` dependency failure mode, `Resolved`→`RESOLVED` case-change breaking downstream grep scripts, and pivot rule accidental firing outside true fix flows.

12. **Spec↔survey divergence** (§3.4, §10 vs survey): Direct contradiction on `harness-share.md §3.5`. Survey says §3.5 should **not** be updated for layer-pivot (self-authoritative until new §N), but spec mandates §3.5 edit. Also the "5 raw echo patterns" claim does not match current repo target file.

---

## Synthesize (categorization by main)

### 🔴 즉시 fix (spec revision before plans freeze)

- **#1 B2 correctness**: Add operational definitions for "같은 방향" (same root cause label) and "실패" (test red OR symptom unchanged after fix). Also fix L3 label conflict (table vs example text).
- **#2 B2 cross-ref**: Add 3 more files to §3.4 — `kzk-pre-commit-gate`, `kzk-codebase-survey`, `kzk-autonomous-loop`. Verify each touch.
- **#5 Y producer completeness**: Add 3 more producers — `Q-FILE-MISSING-*` (kzk-freshness-guard), `Q-PW-OAUTH-NEW-ACCOUNT` (kzk-playwright-verification), `Q-AUTOLOOP*` (kzk-autonomous-loop).
- **#6 Y migration window**: Verify actual count of raw echo patterns in kzk-web-loop (spec says 5, codex says 1 — survey said 5, contradiction). Re-verify and correct. Also: the "transitional writer logic accepting both formats" is over-engineering for single-user single-cycle commit — push-back, but document the migration window risk explicitly in §8.
- **#12 Spec↔survey divergence (harness-share §3.5)**: Resolve. Survey says §3.5 not to be touched (B2 layer-pivot is self-authoritative until new §N), spec says update §3.5. Pick one — prefer survey's "self-authoritative until §N migration" path for cycle 47, defer §3.5 edit to a future cycle. Or commit a §N stub addition. Decision: defer §3.5 edit, the SKILL has its own authoritative source line.

### 🟡 spec 단계 디테일 (resolve in plan files, not spec)

- **#3 C1 hook bypass**: `git clean -df` not blocked. Note in Plan C1 implementation — if upstream guard script doesn't cover `clean -df`, add a one-line extension to the local copy (or accept gap and document in spec §8).
- **#8 AC testability**: AC items are presence checks. Behavior tests for pivot logic require autonomous-loop runtime testing — out of cycle 47 scope (logging/instrumentation deferred to G1-G4 work). Document explicitly in spec §3.5 that AC-B2 items are presence-only, behavior validation deferred.
- **#10 §9 Code Quality substance**: Tighten ceremony bullets to specific claims with file references. Where genuinely no enforcement hook exists, mark as "convention-only".
- **#11 Risk gaps (PreToolUse hook ordering, jq fail-open)**: Add to §8 as explicit risks with mitigations.

### ⚪ push-back

- **#4 C1 MEDIUM rationale**: codex argues `write-a-skill` is standalone, not issue-tracker-dependent. **Push-back**: kzk-spec-and-review already covers spec/plan/skill drafting workflow. Adding `write-a-skill` would be redundant for kzk-harness identity. Accept the inconsistency in framing — defer all 5 together is OK, the standalone framing in §4.1 was sloppy wording, fix wording rather than scope.
- **#6 transitional writer logic**: Push-back. Single-user single-commit migration. The probability of a Q-entry firing during the seconds between `git mv user-queue.md` and `git commit` is negligible — over-engineering. Accept the documented risk in §8 + commit Y plan as single atomic commit.
- **#7 Sequencing**: codex agrees B2→Y locked. C1 NOT_USED depends on Y format — locked order is defensible. Accept current sequencing.
- **#9 Out-of-scope clarity**: codex says "none — looks correct". No action.

---

## Decision summary

🔴 5 issues → spec revision dispatch (single executor sonnet round)
🟡 4 issues → plan-level (rolled into Plan B2 / C1 / Y file content)
⚪ 3 issues → push-back, no change
1 issue → codex agrees with spec, no action (#9)

Spec revision will:
1. Add operational definitions for layer-pivot rule (#1)
2. Expand cross-ref list to 6 files (#2)
3. Add 3 more producers to §5.3 (#5)
4. Re-verify raw echo count + correct §5.4 (#6 partial)
5. Remove §3.5 edit requirement, keep §3.4 cross-ref but mark §3.5 as "future cycle" (#12)
6. Add §8 risks: PreToolUse hook ordering, jq fail-open, case-change grep impact (#11)
7. Tighten §9 with concrete file refs or "convention-only" labels (#10)
8. Mark AC items as presence-only with behavior validation deferred (#8)
9. Note in §4.3 that "framing in §4.1 was sloppy" and clean wording (#4)

C1 hook bypass (#3) → handled in Plan C1 file, not spec.

---

## Cycle counter

This is cycle 1 of codex review on cycle 47 spec. Cycle 2 will only run if revision adds new claims that warrant re-review.
