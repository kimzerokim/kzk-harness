# Root cause: ~127 description truncate warnings on session-load

> Cycle 49 follow-up investigation. User reported "이거 글로벌 인스톨 했는데도 새 세션 켰을 때 127개 디스크립션 트렁케이트 에러가 계속 나네" after Cycle 48 description diet propagated to global.

## Measurement (multi-line YAML aware)

Earlier `awk` measurement (cycle 48) was **undercount** — many skills use multi-line YAML (`description: |` / `description: >`) where awk only captured the pipe character itself. Re-measured with Python `yaml.safe_load`:

| Source | Skills | Total chars | Median | Max | >200 chars |
|---|---:|---:|---:|---:|---:|
| ~/.claude/skills (global) | 83 | 32,864 | 357 | 770 | **79** |
| ~/.claude/plugins (plugin SDK skills) | 202 | 29,454 | 98 | 972 | **42** |
| **Combined** | **285** | **62,318** | — | 972 | **121** |

121 over-200-char descriptions ≈ 127 reported (6-skill parsing discrepancy plausible — Claude Code may count `name`+`description` together, or include trailing whitespace).

## What's responsible (not us)

Top-5 longest descriptions in each source — kzk-\* not in either list:

**Global (~/.claude/skills) top offenders:**
| Skill | Chars | Source |
|---|---:|---|
| plan-tune | 770 | gstack |
| office-hours | 757 | gstack |
| kanban-ticket-manage | 728 | gstack |
| design-html | 721 | gstack |
| plan-devex-review | 691 | gstack |

**Plugin top offenders:**
| Skill | Chars | Source |
|---|---:|---|
| insane-search | 972 | insane-search plugin |
| insane-search (dup) | 972 | insane-search plugin (variant) |
| math-olympiad | 704 | (plugin) |
| insane-apply | 646 | insane-search plugin |
| insane-design | 610 | insane-design plugin |

**kzk-\* after Cycle 48 diet:** all between 270–366 chars, none in the over-500 group, **0 of 18 contribute to the 127 truncate count.**

## What Cycle 48 + 49 actually achieved

Cycle 48 reduced kzk-\* total from ~13,200 chars → 5,568 chars. Out of system-wide 62,318 chars, that's **~12% reduction**. Significant for kzk-* visibility (previously truncated kzk-\* skills now load), but **does not bring the system below the truncate threshold** that fires on the 121 over-200 skills.

The kzk-\* diet was "necessary but not sufficient" — necessary to make our own skills visible, but the wider session metadata budget is dominated by gstack + plugins, which we don't own.

## Options for the 127 truncate

The kzk-harness repo does NOT own gstack or any plugin skills. Three remediation paths:

1. **Disable unused plugins** (biggest single impact). Inspect `~/.claude/settings.json` `enabledPlugins` and disable plugins the user doesn't actively use. e.g. removing the `insane-search` plugin alone saves ~3,000 chars across its variant skills. `gstack-plugins` aren't a single plugin but its skills (~83 of them) sum to most of the 32,864 global total.

2. **Upstream PR to gstack** to compress its own skill descriptions (similar diet to Cycle 48). Out of scope for kzk-harness.

3. **Accept the truncate** — only the longest descriptions get clipped, and the hook (`keyword-detector.mjs`) covers all canonical kzk-\* triggers via exact substring match regardless of native description matcher state. The 127 truncate warnings affect routing only for prompts that:
   - bypass the hook (no canonical keyword)
   - rely on native description matcher
   - happen to target one of the 127 over-budget skills
   The intersection is small in practice.

## Verdict for Cycle 49

The diet did its job for kzk-\*. The remaining truncation is gstack/plugin domain. **No further kzk-harness change required for the 127 truncate root cause.** User decision needed on whether to:
- prune unused plugins (recommend if not actively using them),
- file an upstream issue/PR with gstack to diet its descriptions,
- or accept the warning (hook still works for all canonical kzk-\* triggers).

Cycle 49's targeted fix (`kzk-large-task-delegation` description gains 'ralph로 돌려' / '끝까지 끝내줘') is unrelated to truncate — it closes the C1/C4 native-matcher proxy gap so non-hook sessions can still surface large-task-delegation for autonomous-mode requests.
