# kzk-harness shared assets — ~/.claude/skills/.kzk-harness-shared/

This directory holds shared assets for the kzk-harness global install. It is
intentionally named with a leading dot so Claude Code's `~/.claude/skills/`
auto-scanner skips it (it contains no invocable skill — only reference files).

## What's here

| File | Purpose |
|---|---|
| `harness-share.md` | Single global source of truth for all kzk-* skill protocols (§1–§27) |
| `VERSION` | The installed kzk-harness release tag (e.g. `2026-05-04-cycle-24`) |
| `README.md` | This file |
| `hooks/keyword-detector.mjs` | N3 opt-in UserPromptSubmit scaffold (inert by default) |

## Updating

Re-run the global install from your kzk-harness checkout:

```bash
cd /path/to/kzk-harness
git pull
bash install/install-global.sh --update
```

Or from a one-shot clone:

```bash
git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
bash /tmp/kzk-harness/install/install-global.sh --update --yes
rm -rf /tmp/kzk-harness
```

## Uninstalling

```bash
bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh
```

This removes the `<!-- BEGIN kzk-harness skills --> ... <!-- END kzk-harness skills -->`
marker block from `~/.claude/CLAUDE.md`, deletes all 14 `~/.claude/skills/kzk-*/`
directories, and removes this umbrella directory. Your existing `~/.claude/CLAUDE.md`
content outside the marker block (omc, gstack, your own notes) is left byte-for-byte
identical.

Backups created during install (`~/.claude/CLAUDE.md.kzk-bak-*`) are left in place —
remove them manually when you are satisfied.

## Troubleshooting

**A kzk-* skill is not triggering in a new repo:**

1. Confirm `~/.claude/CLAUDE.md` contains the routing block:
   ```bash
   grep 'BEGIN kzk-harness skills' ~/.claude/CLAUDE.md
   ```
2. Confirm the skill files exist:
   ```bash
   ls ~/.claude/skills/kzk-*/SKILL.md | wc -l   # should print 14
   ```
3. Start a fresh Claude Code session (existing sessions may not pick up new
   `~/.claude/CLAUDE.md` content).
4. Trigger with an exact keyword from the routing table, e.g. `"spec 잡자"` or
   `"codebase survey"`.

**Install failed partway through:**

Restore from the timestamped backup:
```bash
ls ~/.claude/CLAUDE.md.kzk-bak-*   # find the most recent
cp ~/.claude/CLAUDE.md.kzk-bak-<timestamp> ~/.claude/CLAUDE.md
```

**Security note:** For security-sensitive setups, prefer `git clone + bash install/install-global.sh`
over `bash <(curl ...)` one-liners to avoid MITM exposure. See R-PLAN-7 in the
implementation plan.

## Source repository

https://github.com/kimzerokim/kzk-harness

`harness-share.md` is the single authoritative source for all kzk-* skill
protocols. All SKILL.md files reference it as:
> Authoritative source: harness-share.md §N. On conflict, that wins.
