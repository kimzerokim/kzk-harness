---
name: kzk-playwright-verification
version: 1.0.0
description: "Playwright MCP-based UI Gate 4 verification routine, debug cheatsheet, and result-narration mandate (also applies to any long-running tool ≥ 2s). Use whenever a commit touches frontend source files or whenever the agent calls a Playwright MCP tool or any long-running tool. Required triggers: 'Playwright', 'Gate 4', 'browser_navigate', 'browser_take_screenshot', 'screenshot 검수', 'MCP drop', 'visual verification', 'Result narration', 'long-running tool', 'Cooked for Nm', 'silence', 'stuck', 'Bash background', 'Agent dispatch progress'."
---

> Authoritative source: `harness-share.md` §3 Gate 4. On conflict, that wins.

# kzk-playwright-verification

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

## Authentication (Playwright profile is persistent)

1. First run per session: `browser_navigate('http://localhost:<PORT>/auth/...')` → user logs in via the Chrome window. Replace `<PORT>` with your app's actual port.
2. Subsequent `browser_navigate` calls inherit the session cookie automatically
3. 24h expiry / logout → repeat step 1

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
| Empty page after login / `/your-protected-route` redirects to `/login` | JWT 24h expiry or cookie drop | `browser_navigate http://localhost:<PORT>/auth/...`, user re-logs in |
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
- Reading screenshot but not actually seeing it — visual judgment must be explicit (e.g. "Card has shadow, padding looks correct, primary CTA blue is the brand token")
- "I'll bypass via dev token" when MCP drops — see `harness-share.md` §19 MCP Reconnect Protocol
