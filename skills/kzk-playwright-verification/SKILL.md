---
name: kzk-playwright-verification
version: 1.8.0
description: "Playwright MCP visual verification + OAuth click-through. Gate 4 catches unstyled shadcn primitives, padding-less badges, border-only cards. Dev server health pre-check (process alive + log tail error grep) blocks dev/prod divergence trap (e.g. Tailwind v4 @import order = dev fail / prod pass). 3+ pages, full-page screenshot, 0 console errors required. OAuth = agent-driven (no user wait). MCP drop → 5-step self-recovery. Multi-account picker halt (Q-PW-OAUTH-MULTI-ACCOUNT), consent loop 4-page cap (Q-PW-OAUTH-CONSENT-LOOP), stuck/challenge detection (Q-PW-OAUTH-STUCK, Q-PW-OAUTH-CHALLENGE). Popup OAuth branch (window.open) + provider-error halt (Q-PW-OAUTH-PROVIDER-ERROR) + 'Continue as <user>' picker fast-path. References harness-share.md §3 Gate 4. cycle-2 refinements: named popup branch, COOP/COEP signature list, access_denied user-decline note."
---

> Authoritative source: `harness-share.md` §3 Gate 4. On conflict, that wins.

# kzk-playwright-verification

## Standard verification routine (UI commit, just before Gate 4 PASS)

0. **Dev server health pre-check** (mandatory for frontend changes) — see full procedure in §Dev/prod build divergence trap. One-line summary: dev server process alive (`ps aux | grep -E "vite|next|nest" | grep -v grep`) AND the last 50 lines of the dev log have zero error patterns (`vite:css`, `Module build failed`, `error during build`, `HMR ERROR`, `parse error`, `compilation error`). If either check fails → the page is showing a stale build; running Playwright on top of it is meaningless. Fix the root cause first → confirm dev rebuild success in the log → then enter step 1.
1. Build/test green confirmed (production build PASS alone is not enough to end verification — see §Dev/prod build divergence trap)
2. `mcp__playwright__browser_navigate` — visit ≥3 representative pages including the changed area. After the first navigate, force one `page.reload({ bypassCache: true })` or equivalent to flush stale browser cache.
3. Per page: `mcp__playwright__browser_snapshot` (functional regression) + `mcp__playwright__browser_take_screenshot fullPage=true` (saved to `docs/screenshots/<session>/<topic>-NN.png`)
4. `mcp__playwright__browser_console_messages level=error` → 0 errors. Also check `level=warning` once — HMR partial reload failures sometimes surface as warnings (`[vite] hmr update failed`, `[next] hmr error`)
5. **Visual inspection** — actually look at the screenshot. shadcn primitives in default-brittle states (unstyled anchors, padding-less badges, border-only cards) = FAIL. Visual regression blocks the commit.
6. `mcp__playwright__browser_click` / `browser_fill_form` for primary interactions if any changed
7. Commit body includes `Playwright: <screenshot_paths> + snapshot captured (console 0 err, dev log clean) + visual verified`

Subagent has Playwright MCP drop / cannot run → halt, append user-queue entry, return. Auto-defer is forbidden.

Exception: `kzk-web-loop` overrides this — see `kzk-web-loop` §Playwright Resilience (cascade recovery + degraded mode instead of halt).

## Dev/prod build divergence trap (production PASS ≠ dev PASS)

**Symptom**: `npm run build` (production) PASS + autonomous main's self-verification PASS, but when the user opens the page they see yesterday's build or a missing new component. Main reported "done" but from the user's perspective it's broken.

**Root cause patterns** (known):
- **Tailwind v4 + dev `@import` order**: `@import 'tailwindcss';` after inline expansion is followed by `@import url(...)` lines which violate dev mode (esbuild) `"@import must precede all other statements"`. Production build (rollup) is lenient — same source causes **dev fail / prod pass** divergence.
- **Vite HMR partial reload fail**: After adding a new file (e.g. `EnumSelectStep.tsx`), the dev server fails to refresh the module graph → page freezes at the last successful build state. New imports may result in console chunk 404 or silent ignore.
- **Next.js Turbopack / Webpack stale chunk**: Same pattern. `.next/cache` corruption possible.
- **Dev server died but page cached**: Even if vite/next process is dead, the browser shows the previous build from cache. User refreshing (Cmd+R) still hits cache, showing stale content.
- **Dev/prod build tool divergence generally**: rollup vs esbuild, swc vs babel, turbopack vs webpack — lint strictness differs per environment. Either direction (dev fail / prod pass or dev pass / prod fail) is possible.

**Detection (mandatory procedure at Gate 4 step 0)**:

1. **Process alive check**:
   ```bash
   ps aux | grep -E "vite|next|nest" | grep -v grep
   ```
   0 results → dev server is dead. Restart it + confirm build success before proceeding.

2. **Dev log tail error grep**:
   ```bash
   tail -50 <dev log path>   # e.g. /tmp/vite-dev.log, /tmp/next-dev.log
   ```
   FAIL on any of these patterns (1 match = FAIL):
   - `vite:css`, `Module build failed`, `error during build`, `compilation error`
   - `HMR ERROR`, `hmr update failed`, `hmr error`
   - `parse error`, `Unexpected token`, `Cannot find module`
   - `[next-swc-error]`, `[turbopack-error]`

3. **Browser console + warning check**: `browser_console_messages level=error` AND `level=warning`. HMR failures frequently appear at warning level.

4. **Stale cache flush**: After `browser_navigate`, force one `page.reload({ bypassCache: true })` or hard refresh.

**Action when FAIL**:
- Dev build error found → page verification is meaningless. **Fix root cause → restart dev → confirm new build success in log → restart from routine step 1**.
- Do not end verification on production build PASS alone. User environment ≡ dev server output.
- This gap is in the blind spot of main's self-verification — `kzk-autonomous-boundary §Autonomous completion — fresh-agent verifier` defines the dispatch obligation for this procedure.

**Cross-ref**: User sees stale page → this §Dev log tail first → §Debug cheatsheet "stale page" row.

## Authentication (Playwright profile is persistent)

1. First run per session: `browser_navigate('<your-app-login-url>')`. Match your app's actual login route — kzk-harness does not assume a specific path shape. Examples: `http://localhost:3000/auth/google`, `https://staging.example.com/login`, `http://auth.local.example.com/` (subdomain auth).
2. **OAuth click-through is the agent's job, not the user's.** When a login screen appears, the agent clicks all in-app OAuth buttons itself — see §OAuth click-through protocol below. Do NOT polite-stop on "사용자가 로그인하기를 기다린다."
3. Subsequent `browser_navigate` calls inherit the session cookie automatically.
4. 24h expiry / logout → repeat step 1.

## OAuth click-through protocol (agent never waits for the user on login UI)

The Playwright Chromium profile is persistent — Google session cookies survive across runs. The agent drives the full OAuth click chain autonomously; only halt when human intervention is genuinely required (no cached account, multi-account ambiguity, security challenge).

### Pre-click target identification

`browser_snapshot` first to find the sign-in button ref. Representative label heuristics (not exhaustive — infer variants):
- English: `Sign in with Google`, `Continue with Google`, `Log in with Google`, `Sign up with Google`, `Start with Google`
- Korean: `Google 로그인`, `Google 계정으로 로그인`, `Google로 로그인`, `구글로 로그인`, `구글로 계속`
- Structural: anchor `<a href="/auth/google">` or similar, icon-only button with Google G SVG / `[aria-label*=Google i]`

Click the matched ref. Then verify within 5s: URL contains `accounts.google.com` OR the in-app login modal advanced past the button. If still on the app login screen → `browser_snapshot` again (in-app modal may have intercepted) and retry once. After 2 consecutive fails → halt + `Q-PW-OAUTH-STUCK`.

### Popup OAuth detection

After clicking the sign-in button, check for a popup window/new browser context:

- If a new browser window/popup is created OR the parent URL stays unchanged for > 2s while a popup appears → switch to the popup context.
- Inside the popup, run §Account picker page + §Consent / scope review steps as normal.
- After the callback completes (popup closes / postMessage received), the parent window should advance state within 10s. Parent stuck > 10s → halt + `Q-PW-OAUTH-STUCK`.
- If no popup AND parent URL did not change for 2 consecutive verification windows (5s + 2s) → existing 2-fail `Q-PW-OAUTH-STUCK` path applies.
- **Named/reused popup window**: if the sign-in flow uses `window.open(url, '<named-target>')` (e.g. `googleAuth`) or `target='<name>'`, the popup may reuse an existing tab.
  1. Enumerate all browser tabs via `mcp__playwright__browser_tabs` (list action) — returns `[{index, url, title}, ...]`. Capture current parent tab index as `parent_idx`.
  2. **Phase 1 filter** — tabs where URL contains `accounts.google.com` AND `index != parent_idx`.
  3. If phase 1 returns 0 tabs AND the app's OAuth callback path is on the same host as the parent (single-domain SaaS), run **Phase 2 filter** — tabs whose URL path matches the app's known OAuth callback pattern (e.g. `/auth/callback`, `/oauth/callback`, `/auth/google/callback`, `/api/auth/callback/google`) AND `index != parent_idx`.
  4. **Match count = 1** → switch via `mcp__playwright__browser_tabs` (select action, `index=<N>`). Resume protocol at §Account picker page within that tab context.
  5. **Match count = 0** AND parent URL unchanged > 2s → halt `Q-PW-OAUTH-STUCK`.
  6. **Match count ≥ 2** (rare — concurrent OAuth flows in same session) → halt `Q-PW-OAUTH-STUCK` with user-queue note "multiple OAuth tabs open, ambiguous popup target". Resume: user closes extraneous OAuth tabs, then agent retries.

### Account picker page (`accounts.google.com/o/oauth2/...` or `accounts.google.com/AccountChooser`)

`browser_snapshot`. Count **cached account rows** — rows that show an email address + name + avatar. EXCLUDE: "Use another account" / "다른 계정 사용" / "Add account" / "계정 추가" rows (these are actions, not cached sessions).

**"Continue as <name/email>" fast-path** (check BEFORE row counting):

- If the page presents a "Continue as `<name/email>`" CTA as the PRIMARY/SOLE action (one-click shortcut, no account row choice visible) → treat as N == 1 with that account auto-selected. Click it. Common label variants: `Continue as <name>`, `Continue as <email>`, `<name>으로 계속`.
- If "Continue as `<X>`" is shown ALONGSIDE one or more other cached account rows → ambiguous → halt `Q-PW-OAUTH-MULTI-ACCOUNT` (same as N ≥ 2).

- **N == 1** → click that row. Do NOT type credentials. Do NOT ask the user.
- **N == 0** → halt + `Q-PW-OAUTH-NEW-ACCOUNT`. Reason: fresh Chromium profile or no cached session. User must sign in once in the Chromium window; the cached cookie covers all subsequent agent runs.
- **N ≥ 2** → halt + `Q-PW-OAUTH-MULTI-ACCOUNT`. Reason: ambiguous target account — dev assumption (1 account per platform) is violated. Resume after user specifies which email; agent clicks that row only.

### Consent / scope review (`accounts.google.com/.../consent*` URL family)

Primary button label heuristics (not exhaustive): `Continue`, `Allow`, `Yes, continue`, `계속`, `허용`, `동의`, `계속하기`.

Some scopes can be deselected — keep all checkboxes at their defaults, then click the primary CTA.

**Multi-page consent**: maintain a `consent_page_count` counter starting at 0. Increment the counter when EITHER:
- (a) URL matches `accounts.google.com/.*/consent` OR `.../oauthchooseaccount` OR `.../signin/oauth`, OR
- (b) page DOM contains a primary CTA matching the consent label set (`Continue` / `Allow` / `계속` / `허용` / `동의` / `계속하기`).

- `consent_page_count > 4` → halt + `Q-PW-OAUTH-CONSENT-LOOP`. Reason: unusual scope chain or Google UI shift; manual review required.

### App callback verify

Detect callback by ANY of:
- (a) URL on app domain contains `code=` or `state=` query param,
- (b) URL path matches a known callback shape — default examples: `/auth/callback`, `/oauth/callback`, `/auth/google/callback`, `/api/auth/callback/google`,
- (c) popup closed and parent window state advances.

After callback URL detected, poll up to 10s for app-side session creation: a protected-route element appears OR the URL leaves `/auth/*`. Timeout > 10s → halt `Q-PW-OAUTH-STUCK`.

Final state verify: URL matches the protected route AND a known authenticated element is visible via `browser_snapshot` (user avatar, project list, sidebar item, or equivalent).

**Scope note**: CSRF `state` / OIDC `nonce` equality validation is OUTSIDE Playwright scope unless the app exposes the expected value on the page. Playwright verifies query-param presence (`code=`, `state=`) only. App-side validation failure (e.g. `state mismatch`) surfaces as the app rendering a 4xx / error page on callback → routes to `Q-PW-OAUTH-PROVIDER-ERROR` via the existing COOP/error-code detection.

### Stuck detection / escape hatch

- Same URL for 30s + no console activity + no DOM change → halt + `Q-PW-OAUTH-STUCK`.
- `browser_snapshot` returns empty or times out twice consecutively → §Self-recovery — Playwright MCP not connected procedure.
- Page shows reCAPTCHA / "Verify it's you" / SMS OTP / password input from Google; passkey prompt / security key / device verification / account locked / "less secure apps" interstitial → halt + `Q-PW-OAUTH-CHALLENGE`. Reason: cached profile bypasses these normally; their presence means the profile is fresh or Google triggered a security re-prompt — user must complete it once in the Chromium window. (Illustrative, not exhaustive.)
- If browser console shows any of the following COOP/COEP signatures during OAuth, OR popup is silently blocked, OR the callback page shows `error=` query params or Google's terminal error UI → treat as `Q-PW-OAUTH-PROVIDER-ERROR` (NOT stuck, NOT challenge). Include excerpt of error code + URL in the user-queue entry.
  - `Cross-Origin-Opener-Policy policy would block the window.close call`
  - `Failed to execute 'postMessage' on 'DOMWindow'`
  - `Refused to display ... in a frame because it set 'X-Frame-Options'`
  - `not allowed by Cross-Origin-Embedder-Policy`
  - Silent popup close (parent never receives `postMessage` and `window.opener` is null)
  - `popup_failed_to_open` (Google OAuth client lib error name surfaced in console)
  - `popup_closed` (popup dismissed before callback — fires before postMessage)

  Any one match → `Q-PW-OAUTH-PROVIDER-ERROR` (provider/backend config — typically COOP/COEP missing on app side).

### Halt entry table

| Halt entry | Trigger | Action | Resume |
|---|---|---|---|
| `Q-PW-OAUTH-NEW-ACCOUNT` | Account picker has 0 cached rows | halt + user-queue entry | User signs in once in Chromium window; cached cookie covers subsequent runs |
| `Q-PW-OAUTH-MULTI-ACCOUNT` | Account picker has ≥ 2 cached rows | halt + user-queue entry asking which email | User specifies target email; agent clicks that row only |
| `Q-PW-OAUTH-CONSENT-LOOP` | consent_page_count > 4 | halt + user-queue entry | Manual review of scope chain or UI shift |
| `Q-PW-OAUTH-STUCK` | Same URL ≥ 30s + no console/DOM activity, or sign-in click verification fails 2× | halt + user-queue entry | Manual diagnose (MCP state, login modal, network) |
| `Q-PW-OAUTH-CHALLENGE` | reCAPTCHA / Verify-it's-you / SMS OTP / password input from Google / passkey prompt / security key / device verification / account locked / 'less secure apps' interstitial | halt + user-queue entry | User completes the challenge once in the Chromium window |
| `Q-PW-OAUTH-PROVIDER-ERROR` | Callback URL or page shows `error=access_denied` / `error=invalid_client` / `redirect_uri_mismatch` / `error=admin_policy_enforced` / HTTP 4xx-5xx on callback, OR COOP/COEP-blocked popup, OR Google terminal error page. Note: `error=access_denied` can be EITHER (a) backend config issue OR (b) user-declined consent (user clicked 'Cancel' / '거부' on the consent page). User-queue entry MUST capture raw error code + full callback URL so the resumer distinguishes config-fix from user-intent. | halt + user-queue entry with exact error code + redirect URL captured | Backend/OAuth config fix (usually outside Playwright scope — likely Google Cloud Console redirect URI mismatch or app-side OAuth client misconfig). If user-declined: re-prompt user with intent ('재시도 vs abort'). If config: Google Cloud Console / OAuth client fix. |

**Forbidden patterns:**

- Stopping at the app login screen with "사용자 로그인 대기" / "Google 로그인 화면 떴어요, 진행해주세요" — that's a regression; the agent must click the button itself.
- Typing the user's email or password into Google's form — never. Cached profile or halt; no third option.
- Re-running `browser_navigate('/auth/google')` repeatedly hoping the redirect just succeeds — when stuck, snapshot first, identify the actual block (account picker, consent, challenge), then act per the protocol above.
- **Auto-clicking the first row in a multi-account environment** — wrong-account risk; halt with `Q-PW-OAUTH-MULTI-ACCOUNT` is mandatory when N ≥ 2.
- **Clicking 'Continue' indefinitely without a counter** — 4-page cap (`consent_page_count > 4`) is mandatory; exceed it and halt with `Q-PW-OAUTH-CONSENT-LOOP`.
- **Caching the account row index / order across sessions** — row order is unstable across renders and sessions; always re-snapshot and match by email/name text, never by row index.
- **Hardcoded XPath / deep CSS selector chains for Google UI** (e.g. `div > div > div > button:nth-child(3)`) — Google's markup changes frequently; match by visible text / label / aria-label / **stable structural signals** (href anchor like `<a href="/auth/google">`, icon SVG identifier, `[aria-label*=Google i]`) only. Brittle positional/nth-child selectors that depend on rendering order = forbidden; the stable structural signals listed in §Pre-click target identification = OK.
- **Clicking a 'Continue' / 'Allow' CTA without confirming the page host is `accounts.google.com`** — modal-heavy apps may have an in-app 'Continue' that looks identical. Snapshot URL/host before any consent click.

## Result narration — applies to ALL long-running tools, not just Playwright

Mandatory after EVERY Playwright tool call AND every long-running tool with response time ≥ 2s (Bash long-running, Agent dispatch, build, test). Silence between tool calls is forbidden. Stopping mid-routine to wait for user reply is forbidden. Each tool result gets 1-3 sentences interpreting the result + naming the next action, before the next tool call.

| Tool | Required narration shape |
|---|---|
| `browser_navigate` | "Reached URL = ..., console N errors" + next action |
| `browser_snapshot` | One-line element-ref or structural finding + next click target |
| `browser_click` | One-line click outcome (modal / nav / console change) + next action |
| `browser_take_screenshot` | One-line visual impression (style PASS / broken / partial render) + next action |
| `browser_console_messages` | Error/warning count + 1-line key message + (new vs pre-existing) verdict |
| Bash long-running / Agent dispatch / build / test | One-line progress hook (file count / commit / phase / latest output snippet) + next action |
| Last tool of routine | Overall PASS/FAIL verdict + commit/halt/extra-fix decision |

The user otherwise sees only "Cooked for Nm" — that reads as stuck and erodes autonomous trust. (Session 12 lesson — user explicitly flagged this twice.)

## Storage

- `.playwright-mcp/` — screenshots + console logs. Repo `.gitignore` already covers it
- Screenshot filename without abs/rel path may save to repo root → `ls *.png` before commit, move to `.playwright-mcp/`
- Long-term PR evidence → copy to `docs/screenshots/<session>/`

## Debug cheatsheet

| Symptom | Cause | Fix |
|---|---|---|
| `Target page, context or browser has been closed` | MCP session drop | Ask user to run `/mcp` to reconnect, then retry navigate |
| Empty page after login / `<your-protected-route>` redirects to `/login` | JWT 24h expiry or cookie drop | `browser_navigate <your-app-login-url>`, then drive the §OAuth click-through protocol — do NOT wait for the user |
| App login screen visible, agent stuck waiting | Skipped §OAuth click-through protocol | `browser_snapshot` → click the in-app `Sign in with Google` ref; only halt if step 2 (Google account picker) lacks a cached account |
| `Cannot GET <path>` | Backend redirect mismatch or SPA fallback missing | Check auth controller redirect path or frontend route config |
| `--no-sandbox` / Chromium launch error | Chrome-for-Testing launch arg | `/mcp` reconnect first; if recurring, fix MCP config browser args |
| Screenshot saved to repo root | Filename had no path | `ls *.png` pre-commit, move to `.playwright-mcp/` |
| `prose` markdown styling not applied | Tailwind v4 plugin import missing | Add `@plugin "@tailwindcss/typography";` to `src/styles/globals.css` |
| Modal opens with `Function components cannot be given refs` warning | Pre-existing Radix Dialog SlotClone forwardRef issue | Pre-existing library warning. Not a blocker |
| `vitest run --reporter=basic` fails in `loadCustomReporterModule` | vitest 4.1.x — basic reporter module not found | Drop the `--reporter=basic` flag, default reporter works |
| User sees stale page (yesterday's build) / new component missing | Dev server died or dev build failed (e.g. Tailwind v4 @import order = dev fail / prod pass) | `ps aux \| grep -E "vite\|next\|nest"` + `tail -50 <dev log>` error pattern grep → fix root cause → restart dev → confirm success log. See §Dev/prod build divergence trap |

## Self-recovery — Playwright MCP not connected / tools not surfaced (mandatory)

If main context cannot see `mcp__playwright__*` in the deferred tool list (or `claude mcp list` says not connected), do NOT polite-stop. Run the following before asking the user:

1. `claude mcp list` — confirm state (`playwright: ... ✓ Connected` expected)
2. If not registered at all: `claude mcp add playwright npx '@playwright/mcp@latest'`
3. `/mcp` reconnect — request the user to invoke `/mcp` (the dialog briefly opens; even if dismissed the registration is applied)
4. `ToolSearch query="+browser navigate"` — verify the tool surfaces in the deferred catalog
5. Still missing → Claude Code only surfaces MCP tools discovered at session start. Ask the user to restart the session. Background processes and `.claude.json` registration persist, so resumption is immediate.

These 5 steps are main-context responsibility; do not delegate to a subagent (subagents share the same MCP visibility limit).


## Anti-patterns

- "Will fix Playwright in the final sweep" — forbidden
- snapshot only, no screenshot — accessibility tree misses color/spacing/font regressions
- Reading the screenshot but stating "looks good" without an explicit visual claim. Build/test green ≠ visual PASS. Mandatory format: name elements + name tokens (e.g. "Card has shadow, padding looks correct, primary CTA blue is the brand token")
- "I'll bypass via dev token" when MCP drops — see `harness-share.md` §19 MCP Reconnect Protocol
- **Stopping at any login UI to "wait for user to log in"** — see §OAuth click-through protocol. The agent clicks; halt only when the protocol body explicitly calls for it — see §OAuth click-through protocol halt entry table (6 codes: NEW-ACCOUNT / MULTI-ACCOUNT / CONSENT-LOOP / STUCK / CHALLENGE / PROVIDER-ERROR).
- **"production build PASS = verification OK"** — ignores dev/prod divergence. User environment ≡ dev server output; production build PASS alone does not catch dev server stale / dev build failures (e.g. Tailwind v4 @import order). See §Dev/prod build divergence trap.
- **"browser console 0 errors = verification OK"** — when the dev server serves a stale build, modules don't reload and the console looks clean. Log tail + process alive check are both required.
- **Main self-declared "done" / "verification PASS" without fresh-agent verifier** — main's own results (build PASS + unit test PASS + code wiring) alone are not enough to end the run — this violates `kzk-autonomous-boundary §Autonomous completion — fresh-agent verifier`. Fresh-agent dispatch is mandatory.

## Interaction with other kzk-*

- **kzk-pre-commit-gate**: This skill implements Gate 4 (browser smoke + screenshot).
- **kzk-background-monitoring**: Reuses the narration table this skill defines for long-running browser actions.
- **kzk-web-loop**: Cascade-recovery override — web loop's playwright resilience rule overrides this skill's hard-stop when MCP repeatedly fails.
- **kzk-autonomous-boundary**: §Autonomous completion — fresh-agent verifier Step 1 (dev server health) detection procedure is delegated to this skill's §Dev/prod build divergence trap. Halt entries Q-PW-OAUTH-NEW-ACCOUNT / Q-PW-OAUTH-MULTI-ACCOUNT / Q-PW-OAUTH-CONSENT-LOOP / Q-PW-OAUTH-STUCK / Q-PW-OAUTH-CHALLENGE / Q-PW-OAUTH-PROVIDER-ERROR (6 entries) are defined here and registered in kzk-autonomous-boundary §Halt conditions table.
