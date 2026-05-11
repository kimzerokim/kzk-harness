# Playwright OAuth Hardening — Critic Review

> Cycle: 1
> Previous: none
> Topic: kzk-playwright-verification §OAuth click-through protocol rewrite + Q-PW-OAUTH-* halt registration
> Date: 2026-05-11
> Codex exit: 0, wall: 139s, stdout size:     5561 bytes

---

1. **Protocol correctness gaps**
1. [🔴 BLOCKER] Popup OAuth (`window.open`) is not handled as a first-class branch. Current success check is only “URL contains `accounts.google.com` OR modal advanced in 5s,” so parent-tab stays “stuck” even when popup is the real flow ([SKILL.md:84](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:84)).
2. [🔴 BLOCKER] Consent loop counter depends on URL regex `accounts.google.com/.*/consent`; if Google serves consent under a different path, counter never increments and loop cap can be bypassed ([SKILL.md:100](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:100), [SKILL.md:101](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:101)).
3. [🔴 BLOCKER] Callback verification hardcodes `/auth/callback?code=...` then protected-route visibility, with no explicit wait/backoff for app-side session creation race and no alternate callback shapes (popup/postMessage, different callback paths) ([SKILL.md:105](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:105)).
4. [🔴 BLOCKER] COOP/COEP / iframe-cross-origin failure mode is not modeled; it collapses into generic stuck with no diagnostic branch, so autonomous recovery quality is poor ([SKILL.md:109](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:109), [SKILL.md:120](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:120)).

2. **Halt entry coverage gaps**
1. [🔴 BLOCKER] No explicit handling for Google terminal error pages (`redirect_uri_mismatch`, `access_denied`, `invalid_client`, callback 4xx/5xx). These are not cleanly covered by the 5 entries and can produce wrong retries/stall loops ([SKILL.md:113](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:113), [autonomous-boundary:80](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:80)).
2. [🟡 NIT] Challenge trigger examples are narrow; passkey/security-key/device-verification/account-locked interstitials are not explicitly listed, so routing to `Q-PW-OAUTH-CHALLENGE` is underspecified ([SKILL.md:111](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:111), [autonomous-boundary:84](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:84)).
3. [⚪ PUSH-BACK candidate] “Continue as `<other-user>`” silent path can bypass picker ambiguity logic and log into wrong account without halting; fixing this may collide with locked “target email mandatory X” scope ([SKILL.md:90](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:90), [SKILL.md:96](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:96)).

3. **Cross-ref consistency**
1. [🔴 BLOCKER] Source-of-truth conflict inside Gate 4 docs: protocol says agent drives OAuth (no user wait), but cheatsheet still says “user logs in in Chrome window” for login redirect case. That contradiction will regress behavior ([playwright:69](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:69), [playwright:75](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:75), [harness-share:215](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:215)).
2. [🟡 NIT] New cheatsheet row omits one `Q-PW-OAUTH-STUCK` trigger (“sign-in click verification fails 2x”), so summary and canonical table are slightly out of sync ([harness-share:222](/Users/kimzerokim/work/personal/kzk-harness/harness-share.md:222), [playwright:120](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:120), [autonomous-boundary:83](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-autonomous-boundary/SKILL.md:83)).

4. **Forbidden patterns**
1. [🔴 BLOCKER] Missing explicit ban on caching account row index/order across sessions. Row order is unstable; this causes wrong-account clicks.
2. [🔴 BLOCKER] Missing explicit ban on hardcoded XPath / deep CSS chains for Google UI (fragile against frequent markup changes); only label/structural hints are documented now ([SKILL.md:79](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:79), [SKILL.md:123](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:123)).
3. [🟡 NIT] Missing explicit anti-pattern: clicking consent-like CTAs without confirming Google host/context first (can click wrong in-app “Continue” button in modal-heavy UIs).

5. **Korean/English label coverage**
1. [🔴 BLOCKER] Missing `Sign up with Google` in pre-click label set; this is common in production signup flows and will false-stuck ([SKILL.md:80](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:80)).
2. [🔴 BLOCKER] Missing `Continue as <name/email>` in consent/continuation heuristics; this is a high-frequency Google CTA and currently not listed ([SKILL.md:96](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:96)).
3. [🟡 NIT] Korean high-impact variants absent: `Google로 로그인`, `구글로 로그인`, `Google로 계속하기` (spacing/form variation is common) ([SKILL.md:81](/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-playwright-verification/SKILL.md:81)).
