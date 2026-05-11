# Playwright OAuth Hardening — Critic Review (Cycle 4)

> Cycle: 4
> Previous: docs/research/codex-reviews/playwright-oauth-hardening-critic-review-3.md
> BLOCKERs resolved since cycle 3: 1 of 1 + 1 NIT (both applied)
> Topic: kzk-playwright-verification §OAuth click-through protocol — final pass review
> Date: 2026-05-11
> Codex exit: 0, wall: 134s, stdout:     1383 bytes

---

1. **Regression check**
- 🟡 NIT: cycle-3 named/reused popup tab rule can false-trigger ambiguity in common same-host callbacks. In [SKILL.md:96](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:96), tab filter allows `accounts.google.com` **or callback host**; if callback host is same app host, parent tab can be included, making [SKILL.md:99](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:99) (`match >= 2 => STUCK`) fire even with a single real OAuth target tab.  
  Suggested refinement: exclude current parent tab index from candidate set, or use 2-phase match (`accounts.google.com` first, then callback **path** match only if zero).

2. **Residual protocol gaps at implementation level**
- none

3. **Halt entry coverage (6 entries)**
- none (still sufficient)

4. **Cross-ref bidirectional integrity (6 Q-PW-OAUTH-*)**
- none (both halt tables aligned: [playwright halt table](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:157), [autonomous-boundary halt table](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:68); cheatsheet 6-entry statement also consistent at [harness-share.md:215](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:215))

5. **Forbidden patterns / Anti-patterns coherence**
- none
