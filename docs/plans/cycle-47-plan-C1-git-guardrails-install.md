# Plan C1 — git-guardrails-claude-code install (cycle 47)

## Frozen

- Date: 2026-05-07
- Spec source: `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` §4
- Survey source: `docs/harness/surveys/2026-05-07-cycle-47-b2-c1-queue-survey.md` Sub-scope C1
- Upstream SKILL.md: `https://raw.githubusercontent.com/mattpocock/skills/main/skills/misc/git-guardrails-claude-code/SKILL.md` (95 lines, fetched 2026-05-07)
- Sequencing: runs after Plan B2 and Plan Y (Y must complete AC-Y-1 first so NOT_USED entries land in correct section)

## Scope

**In scope (HIGH cluster — 1 skill):**
- Install `git-guardrails-claude-code` globally: fetch SKILL.md from upstream + create hook script + register PreToolUse hook in `~/.claude/settings.json`

**Out of scope:**
- MEDIUM cluster (5 skills: setup-matt-pocock-skills, to-issues, to-prd, triage, write-a-skill) — deferred; issue-tracker workflow not adopted (spec §4.3)
- LOW cluster (8 skills) — permanently skipped (spec §4.4)
- kzk-harness CLAUDE.md skill row addition — not needed; git-guardrails is external, not a kzk-* skill
- Any kzk-* skill edits — C1 is install-only; B2 handles kzk-autonomous-boundary cross-ref

MEDIUM (5) + LOW (8) = 13 entries recorded in `docs/harness/user-queue.md` `## 사용하지 않음 (NOT_USED)` section by Plan Y. AC-C1-4 verifies they exist.

## Files to create / modify

| File | Action | Notes |
|---|---|---|
| `~/.claude/skills/git-guardrails-claude-code/SKILL.md` | NEW | Copy from upstream GitHub |
| `~/.claude/hooks/block-dangerous-git.sh` | NEW | Hook script — spec §4.2 version (see divergence note) |
| `~/.claude/settings.json` | MODIFY | Append Bash matcher entry to existing PreToolUse array |

## Hook script content

From spec §4.2. Executor MUST use this version verbatim (not the upstream script — see divergence note below).

```bash
#!/usr/bin/env bash
# git-guardrails-claude-code: block destructive git ops
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

BLOCKED_PATTERNS=(
  "git push --force"
  "git push -f"
  "git reset --hard"
  "git clean -f"
  "git branch -D"
  "git checkout \."
  "git checkout -- \."
)

for PATTERN in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$CMD" | grep -qE "$PATTERN"; then
    echo "{\"decision\": \"block\", \"reason\": \"[git-guardrails] destructive git op blocked: $PATTERN. Explicit user OK required per kzk-autonomous-boundary.\"}"
    exit 0
  fi
done

echo "{\"decision\": \"approve\"}"
```

After creation: `chmod +x ~/.claude/hooks/block-dangerous-git.sh`

**Upstream divergence note** (fetched 2026-05-07):
- Upstream blocks ALL `git push` (no `--force` required), outputs to stderr, exits 2 — no JSON output
- Spec §4.2 blocks only `git push --force` / `git push -f`, outputs JSON `{"decision":"block"|"approve"}`, exits 0
- **Use spec §4.2 version.** Reason: upstream would block normal `git push origin <branch>` in autonomous PR-flow, breaking AC-C1-3 positive test and violating spec §8 R2 safety requirement

## settings.json hook entry

From spec §4.2. This is an **append** to the existing `PreToolUse` array — NOT a replace.

Entry to append:
```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "command": "bash ~/.claude/hooks/block-dangerous-git.sh"
    }
  ]
}
```

**Merge logic** (current state as of 2026-05-07):
- `~/.claude/settings.json` exists and already contains `hooks.PreToolUse` array with one entry (matcher: `"Edit|Write"`)
- Executor MUST read the file first, then use `jq` to append the new entry:
  ```bash
  jq '.hooks.PreToolUse += [{"matcher":"Bash","hooks":[{"type":"command","command":"bash ~/.claude/hooks/block-dangerous-git.sh"}]}]' \
    ~/.claude/settings.json > /tmp/settings-new.json && mv /tmp/settings-new.json ~/.claude/settings.json
  ```
- If `jq` absent: read file, manually splice the new object into the PreToolUse array before the closing `]`
- If `hooks.PreToolUse` absent entirely: create it as a new array containing the single entry
- NEVER overwrite the entire file; preserve `env`, `permissions`, `PostToolUse`, `UserPromptSubmit`, `statusLine`, `enabledPlugins`, `extraKnownMarketplaces` keys

## Acceptance criteria (presence-only)

- **AC-C1-1**: `~/.claude/skills/git-guardrails-claude-code/SKILL.md` exists (`ls` confirms)
- **AC-C1-2**: `jq '.hooks.PreToolUse[] | select(.matcher=="Bash")' ~/.claude/settings.json` returns non-empty output
- **AC-C1-3**: Two bash tests both pass:
  - BLOCK test: `echo '{"tool_input":{"command":"git push --force origin main"}}' | bash ~/.claude/hooks/block-dangerous-git.sh` → output contains `"decision": "block"`
  - APPROVE test: `echo '{"tool_input":{"command":"git push origin main"}}' | bash ~/.claude/hooks/block-dangerous-git.sh` → output contains `"decision": "approve"`
- **AC-C1-4**: `grep -c "mattpocock" docs/harness/user-queue.md` returns 13 (Plan Y inserts these; C1 executor verifies after Y completes)

## NOT_USED entries (for Plan Y to insert)

Ready for copy-paste into `docs/harness/user-queue.md` `## 사용하지 않음 (NOT_USED)` section. 13 entries total. Format: `- [ ] YYYY-MM-DD — <skill> (mattpocock <category>) — <reason>`.

MEDIUM (5):
- [ ] 2026-05-07 — setup-matt-pocock-skills (mattpocock MEDIUM) — issue-tracker workflow not adopted; prerequisite for entire MEDIUM cluster, installs docs/agents/ structure outside current kzk-harness scope
- [ ] 2026-05-07 — to-issues (mattpocock MEDIUM) — setup-matt-pocock-skills prerequisite unmet; issue-tracker workflow not adopted
- [ ] 2026-05-07 — to-prd (mattpocock MEDIUM) — setup-matt-pocock-skills prerequisite unmet; trigger overlaps with kzk-spec-and-review
- [ ] 2026-05-07 — triage (mattpocock MEDIUM) — setup-matt-pocock-skills prerequisite unmet; requires GitHub issue workflow
- [ ] 2026-05-07 — write-a-skill (mattpocock MEDIUM) — skill-creator (oh-my-claudecode) already covers this (YAGNI)

LOW (8):
- [ ] 2026-05-07 — tdd (mattpocock LOW) — trigger keyword conflicts with kzk-test-coverage; no autonomous-mode awareness
- [ ] 2026-05-07 — zoom-out (mattpocock LOW) — redundant with kzk-codebase-survey + kzk-large-task-delegation explore subagent pattern
- [ ] 2026-05-07 — prototype (mattpocock LOW) — UI/UX throwaway prototyping; kzk-harness is a skill/workflow repo, not a product
- [ ] 2026-05-07 — migrate-to-shoehorn (mattpocock LOW) — TypeScript test-only tool; kzk-harness has no TS test infra
- [ ] 2026-05-07 — scaffold-exercises (mattpocock LOW) — domain-specific to ai-hero course platform; not applicable
- [ ] 2026-05-07 — setup-pre-commit (mattpocock LOW) — Node.js/Husky only; conflicts with kzk-pre-commit-gate multi-gate discipline
- [ ] 2026-05-07 — edit-article (mattpocock LOW) — personal document editing tool; not applicable to kzk-harness workflow
- [ ] 2026-05-07 — obsidian-vault (mattpocock LOW) — hardcoded vault path (/mnt/d/Obsidian Vault/); not portable

## Subagent dispatch prompt (haiku executor — mechanical)

```
You are a mechanical executor. Implement Plan C1 exactly as specified. No scope expansion.

Working directory: /Users/kimzerokim/work/personal/kzk-harness

Steps (execute in order):

1. Create directory ~/.claude/skills/git-guardrails-claude-code/
   mkdir -p ~/.claude/skills/git-guardrails-claude-code

2. Fetch upstream SKILL.md and save:
   curl -sSL "https://raw.githubusercontent.com/mattpocock/skills/main/skills/misc/git-guardrails-claude-code/SKILL.md" \
     > ~/.claude/skills/git-guardrails-claude-code/SKILL.md
   Verify: wc -l ~/.claude/skills/git-guardrails-claude-code/SKILL.md (expect ~95 lines)

3. Create directory ~/.claude/hooks/ if absent:
   mkdir -p ~/.claude/hooks

4. Write ~/.claude/hooks/block-dangerous-git.sh using EXACTLY the spec §4.2 content
   (NOT the upstream script). Content is in plan section "## Hook script content".
   Then: chmod +x ~/.claude/hooks/block-dangerous-git.sh

5. Append Bash matcher entry to ~/.claude/settings.json PreToolUse array using jq:
   jq '.hooks.PreToolUse += [{"matcher":"Bash","hooks":[{"type":"command","command":"bash ~/.claude/hooks/block-dangerous-git.sh"}]}]' \
     ~/.claude/settings.json > /tmp/settings-new.json && mv /tmp/settings-new.json ~/.claude/settings.json

6. Run AC verification:
   AC-C1-1: ls ~/.claude/skills/git-guardrails-claude-code/SKILL.md
   AC-C1-2: jq '.hooks.PreToolUse[] | select(.matcher=="Bash")' ~/.claude/settings.json
   AC-C1-3 BLOCK: echo '{"tool_input":{"command":"git push --force origin main"}}' | bash ~/.claude/hooks/block-dangerous-git.sh
   AC-C1-3 APPROVE: echo '{"tool_input":{"command":"git push origin main"}}' | bash ~/.claude/hooks/block-dangerous-git.sh

Report: one line per AC with PASS/FAIL. If any FAIL, do not proceed — report the failure.
Do NOT: touch kzk-* skills, edit CLAUDE.md, install MEDIUM/LOW skills, commit anything.
```

## Edge cases

| Scenario | Handling |
|---|---|
| `~/.claude/settings.json` absent | Create minimal file: `{"hooks":{"PreToolUse":[<new-entry>]}}` — preserve nothing (file was absent) |
| `~/.claude/settings.json` corrupted (invalid JSON) | Halt; report to user before touching file |
| `hooks.PreToolUse` key absent in settings.json | `jq '.hooks.PreToolUse = [<new-entry>]'` (create key) |
| Bash matcher entry already present (idempotent re-run) | Check first: `jq '.hooks.PreToolUse[] | select(.matcher=="Bash")' ~/.claude/settings.json` — if non-empty, skip append |
| `jq` absent | Install via `brew install jq` or use python3 -c json fallback to manually splice |
| Upstream divergence in hook protocol | Use spec §4.2 JSON decision protocol; upstream exit-2/stderr protocol is incompatible with Claude Code hook JSON API |
| `~/.claude/hooks/` directory absent | `mkdir -p ~/.claude/hooks` before writing script |
| Existing Bash matcher conflict | If existing Bash matcher entry already references a different script, append new entry alongside it (Claude Code evaluates all matching hooks in sequence) |

## DO NOT

- Do NOT install MEDIUM or LOW skills (setup-matt-pocock-skills, to-issues, to-prd, triage, write-a-skill, tdd, zoom-out, prototype, migrate-to-shoehorn, scaffold-exercises, setup-pre-commit, edit-article, obsidian-vault)
- Do NOT add a row to kzk-harness CLAUDE.md skills table (git-guardrails is external, not a kzk-* skill)
- Do NOT edit any kzk-* SKILL.md files (B2 handles kzk-autonomous-boundary cross-ref separately)
- Do NOT commit before all AC items pass
- Do NOT use the upstream hook script — use spec §4.2 version (upstream blocks all `git push`, breaking autonomous PR-flow)

## Commit message

```
refactor: cycle 47 — Plan C1 git-guardrails-claude-code install

- Install ~/.claude/skills/git-guardrails-claude-code/SKILL.md (upstream fetch)
- Create ~/.claude/hooks/block-dangerous-git.sh (spec §4.2 JSON protocol)
- Append Bash PreToolUse hook entry to ~/.claude/settings.json
- Hard-block: git push --force/push -f/reset --hard/clean -f/branch -D/checkout .
- Normal git push (no --force) passes through — autonomous PR-flow unaffected
- NOT_USED: 13 MEDIUM/LOW mattpocock skills recorded in user-queue.md (Plan Y)
- Spec: docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md §4
```
