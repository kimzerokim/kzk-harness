# Playwright OAuth Hardening — Critic Review (Cycle 3)

> Cycle: 3
> Previous: docs/research/codex-reviews/playwright-oauth-hardening-critic-review-2.md
> BLOCKERs resolved since cycle 2: 5 of 5 + 3 NITs + 1 push-back scope clarification (all 9 applied)
> Topic: kzk-playwright-verification §OAuth click-through protocol — final regression + residual
> Date: 2026-05-11
> Codex exit: 0, wall: 137s, stdout:     1423 bytes

---

1. **Regression check**  
none

2. **Residual protocol gaps at implementation level**  
- 🔴 BLOCKER: Named/reused popup branch is still operationally underspecified. In [SKILL.md:94](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:94), it says “enumerate tabs via `mcp__playwright__browser_tabs`” but does not define the required `list -> select(index)` call shape, and has no deterministic rule when multiple `accounts.google.com` tabs are open. This can cause wrong-tab selection or false `STUCK` in real runs.  
- 🟡 NIT: Provider-error signatures should explicitly include popup non-OAuth error names (`popup_failed_to_open`, `popup_closed`) alongside current COOP/COEP/silent-close wording in [SKILL.md:139](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:139). Today it is implied, but not explicit.

3. **Halt entry coverage**  
none (6 entries are still sufficient; no uncategorized post-cycle-2 case found)

4. **Cross-ref bidirectional integrity**  
none (6/6 `Q-PW-OAUTH-*` entries exist in both tables with consistent trigger intent; boundary table correctly defers full trigger body to canonical source)

5. **Forbidden patterns / Anti-patterns coherence**  
none

Sources used for API/behavior alignment check:  
- https://playwright.dev/mcp/tools/tabs  
- https://developers.google.com/identity/oauth2/web/guides/error
