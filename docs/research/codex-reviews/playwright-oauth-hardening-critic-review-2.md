# Playwright OAuth Hardening — Critic Review (Cycle 2)

> Cycle: 2
> Previous: docs/research/codex-reviews/playwright-oauth-hardening-critic-review.md
> BLOCKERs resolved since cycle 1: 9 of 9 + 4 NITs + 1 reframed PUSH-BACK (all 13 applied)
> Topic: kzk-playwright-verification §OAuth click-through protocol — regression + residual gaps check
> Date: 2026-05-11
> Codex exit: 0, wall: 201s, stdout:     4464 bytes

---

1. **Regression check**
🔴 BLOCKER: stale halt scope text reintroduced. Anti-pattern says halt only on “uncached picker or password/MFA,” which contradicts current 6-entry protocol (includes `CONSENT-LOOP`, `STUCK`, `PROVIDER-ERROR`, etc.) ([SKILL.md:216](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:216), [SKILL.md:142](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:142), [SKILL.md:147](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:147)).  
🔴 BLOCKER: cheatsheet row still says halt is only 4 types for login-redirect symptom; conflicts with same section’s full stuck/consent logic and canonical table ([harness-share.md:215](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:215), [harness-share.md:222](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:222), [SKILL.md:144](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:144), [SKILL.md:145](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:145)).  
🟡 NIT: challenge expansion was applied in body but not propagated to halt tables (partial/stale fix) ([SKILL.md:135](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:135), [SKILL.md:146](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:146), [SKILL.md:84](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:84)).

2. **Residual protocol gaps**
🔴 BLOCKER: popup branch assumes “new popup appears”; no branch for named/reused window context, so flow can proceed in another existing context and be misclassified as stuck ([SKILL.md:90](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:90), [SKILL.md:93](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:93)).  
🔴 BLOCKER: COOP/COEP detection strings are underspecified; current literals are too narrow and can miss common popup-close/postMessage failure signatures, degrading to `STUCK` ([SKILL.md:136](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:136)).  
⚪ PUSH-BACK candidate: callback check uses presence (`code=`/`state=`) + session poll, without state/nonce equality validation; adding strict validation from Playwright side may be out-of-scope unless app exposes expected values ([SKILL.md:123](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:123), [SKILL.md:127](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:127)).

3. **Halt entry coverage**
🔴 BLOCKER: `error=access_denied` is classified as `PROVIDER-ERROR` with “backend config fix” resume, but `access_denied` is often user-decline/cancel path; current action/resume can send wrong remediation ([SKILL.md:147](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:147)).

4. **Cross-ref bidirectional integrity**
🟡 NIT: 6/6 entries are present in both tables, but trigger-detail drift exists. `CHALLENGE` table triggers are narrower than protocol body; `PROVIDER-ERROR` example sets differ between tables (autonomous says “full trigger body” but examples are not aligned) ([SKILL.md:135](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:135), [SKILL.md:146](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:146), [SKILL.md:84](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:84), [SKILL.md:147](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:147), [SKILL.md:85](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:85)).

5. **Forbidden patterns completeness**
🟡 NIT: internal wording conflict. Forbidden says “match by visible text/label/aria-label only,” while protocol explicitly allows structural matching (`href`, icon-only Google G). Clarify “no deep chain selectors” vs “allowed stable structural signals” ([SKILL.md:82](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:82), [SKILL.md:157](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:157)).
