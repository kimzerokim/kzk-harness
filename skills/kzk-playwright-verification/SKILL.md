---
name: kzk-playwright-verification
version: 1.2.0
description: "Playwright MCP Gate 4 routine + OAuth click-through protocol + result-narration mandate. Top triggers: 'Playwright', 'Gate 4', '로그인 버튼', 'browser_navigate', 'Google 로그인'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §3 Gate 4. On conflict, that wins.

# kzk-playwright-verification

## Triggers

`Playwright`, `Gate 4`, `browser_navigate`, `browser_take_screenshot`, `screenshot 검수`, `MCP drop`, `visual verification`, `Result narration`, `long-running tool`, `Cooked for Nm`, `silence`, `stuck`, `Bash background`, `Agent dispatch progress`, `Google 로그인`, `OAuth 막힘`, `login 화면`, `로그인 버튼`, `sign in with google`.

Build/test green ≠ visual PASS. Session-6 ui-migration-shadcn lesson: every M-milestone passed build+vitest, but sidebar links rendered as bare blue underlines, Cards as border-only, Badges unstyled. Gate 4 catches this.

## Standard verification routine (UI commit, just before Gate 4 PASS)

1. Build/test green confirmed
2. `mcp__playwright__browser_navigate` — visit ≥3 representative pages including the changed area
3. Per page: `mcp__playwright__browser_snapshot` (functional regression) + `mcp__playwright__browser_take_screenshot fullPage=true` (saved to `docs/screenshots/<session>/<topic>-NN.png`)
4. `mcp__playwright__browser_console_messages level=error` → 0 errors
5. **Visual inspection** — actually look at the screenshot. shadcn primitives in default-brittle states (unstyled anchors, padding-less badges, border-only cards) = FAIL. Visual regression blocks the commit.
6. `mcp__playwright__browser_click` / `browser_fill_form` for primary interactions if any changed
7. Commit body includes `Playwright: <screenshot_paths> + snapshot captured (console 0 err) + visual verified`

Subagent has Playwright MCP drop / cannot run → halt, append user-queue entry, return. Auto-defer is forbidden.

Exception: `kzk-web-loop` overrides this — see `kzk-web-loop` §Playwright Resilience (cascade recovery + degraded mode instead of halt).

## Authentication (Playwright profile is persistent)

1. First run per session: `browser_navigate('<your-app-login-url>')`. Match your app's actual login route — kzk-harness does not assume a specific path shape. Examples: `http://localhost:3000/auth/google`, `https://staging.example.com/login`, `http://auth.local.example.com/` (subdomain auth).
2. **OAuth click-through is the agent's job, not the user's.** When a login screen appears, the agent clicks all in-app OAuth buttons itself — see §OAuth click-through protocol below. Do NOT polite-stop on "사용자가 로그인하기를 기다린다."
3. Subsequent `browser_navigate` calls inherit the session cookie automatically.
4. 24h expiry / logout → repeat step 1.

## OAuth click-through protocol (agent never waits for the user on login UI)

The Playwright Chromium profile is persistent — Google session cookies survive across runs. The agent's job is to drive the OAuth click chain itself; only halt when actual human credentials (password / 2FA) are required, which a cached profile usually avoids.

Click chain (in order, each step conditional on the previous):

1. **App's "Sign in with Google" button** — `browser_snapshot` to find the ref; common labels: `Sign in with Google`, `Continue with Google`, `Google 로그인`, `Google 으로 시작`, anchor `<a href="/auth/google">`, button with Google `<svg>` icon. **Click it.** Do not wait — this is in-app UI, not Google's domain yet.
2. **Google account picker page** (`accounts.google.com/o/oauth2/...` or `accounts.google.com/AccountChooser`) — `browser_snapshot`. If a previously-used account is listed (cached profile), click the user's email row directly. Do not type credentials. If no cached account is listed → halt + user-queue (`Q-PW-OAUTH-NEW-ACCOUNT — fresh profile, user must sign in once`).
3. **OAuth consent screen** (`Continue` / `Allow`) — click the primary continue button. This is also agent-driven, no user wait.
4. **App-side OAuth callback** — `browser_navigate` lands on `<app>/auth/callback?code=...` then redirects to the protected route. Verify by checking final URL + a known authenticated element (e.g., user avatar or project list) via `browser_snapshot`.

If at step 2 Google demands password / SMS OTP (uncached profile, account changed, security re-prompt) → halt. The user must sign in once in the Chromium window; the cached cookie then covers all subsequent agent runs.

**Forbidden patterns:**

- Stopping at the app login screen with "사용자 로그인 대기" / "Google 로그인 화면 떴어요, 진행해주세요" — that's a Session-X regression, the agent must click the button itself.
- Typing the user's email or password into Google's form — never. Cached profile or halt; no third option.
- Re-running `browser_navigate('/auth/google')` repeatedly hoping the redirect just succeeds — when stuck, snapshot first, identify the actual block (account picker, consent, MFA), then act per the chain above.

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

The user otherwise sees only "Cooked for Nm" otherwise — that reads as stuck and erodes autonomous trust. (Session 12 lesson — user explicitly flagged this twice.)

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

## Self-recovery — Playwright MCP not connected / tools not surfaced (mandatory)

If main context cannot see `mcp__playwright__*` in the deferred tool list (or `claude mcp list` says not connected), do NOT polite-stop. Run the following before asking the user:

1. `claude mcp list` — confirm state (`playwright: ... ✓ Connected` expected)
2. If not registered at all: `claude mcp add playwright npx '@playwright/mcp@latest'`
3. `/mcp` reconnect — request the user to invoke `/mcp` (the dialog briefly opens; even if dismissed the registration is applied)
4. `ToolSearch query="+browser navigate"` — verify the tool surfaces in the deferred catalog
5. Still missing → Claude Code only surfaces MCP tools discovered at session start. Ask the user to restart the session. Background processes and `.claude.json` registration persist, so resumption is immediate.

These 5 steps are main-context responsibility; do not delegate to a subagent (subagents share the same MCP visibility limit).

## Token-migration warning (shadcn + Tailwind v4)

Official shadcn new-york blocks use **prefix-less** tokens (`--background / --primary / --sidebar`). When mixing with Tailwind v4 `@theme { --color-* }`, the bridge `@theme inline { --color-background: var(--background); ... }` is required. Renaming variables but moving the values does NOT make utility classes work. Always confirm against `/shadcn-ui/ui` via context7 before migrating tokens.

## Anti-patterns

- "Will fix Playwright in the final sweep" — forbidden
- snapshot only, no screenshot — accessibility tree misses color/spacing/font regressions
- Reading the screenshot but stating "looks good" without an explicit visual claim. Build/test green ≠ visual PASS. Mandatory format: name elements + name tokens (e.g. "Card has shadow, padding looks correct, primary CTA blue is the brand token")
- "I'll bypass via dev token" when MCP drops — see `harness-share.md` §19 MCP Reconnect Protocol
- **Stopping at any login UI to "wait for user to log in"** — see §OAuth click-through protocol. The agent clicks; only halt on uncached Google account picker or password/MFA prompt.

## Interaction with other kzk-*

- **kzk-pre-commit-gate**: This skill implements Gate 4 (browser smoke + screenshot).
- **kzk-background-monitoring**: Reuses the narration table this skill defines for long-running browser actions.
- **kzk-web-loop**: Cascade-recovery override — web loop's playwright resilience rule overrides this skill's hard-stop when MCP repeatedly fails.
