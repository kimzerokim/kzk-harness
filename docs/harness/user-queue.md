# User Queue

> 시간 역순 — 최신 entry 위. 작업 끝 시 `- [x]` 체크.

## OPEN

_(없음)_

## RESOLVED

- [x] 2026-05-06 20:58 — Q-AUTONOMOUS-SOT — autonomous-mode detection SoT 신설 (cycle 44)
- [x] 2026-05-20 — Q-DESIGN-BOILERPLATE — accepted Defensive retreat (all kzk-required boilerplate inlined per dispatch). OMC executor.md verified to lack kzk-specific guardrails. Implementation: skills/kzk-large-task-delegation/SKILL.md §Task-level dispatch shape (commit dfa30fb). Cycle 1 codex B1 forcing factor. design §3, §5.1, §6.
- [x] 2026-05-20 — Q-DESIGN-WAVE — accepted mandatory `## Dependencies` retreat for parallel-wave plans + sidecar fallback for legacy. File-disjoint heuristic dropped due to semantic-dependency race risk. Implementation: §Multi-dispatch wave shape + §Plan size policy sidecar (commit dfa30fb). Cycle 1 codex P2 forcing factor. design §3, §5.2, §5.3.

## 사용하지 않음 (NOT_USED)

_mattpocock/skills MEDIUM cluster (cycle 47 C1 심사 결과 defer):_
- [ ] 2026-05-07 — setup-matt-pocock-skills (mattpocock MEDIUM) — issue-tracker workflow not adopted; prerequisite for entire MEDIUM cluster, installs docs/agents/ structure outside current kzk-harness scope
- [ ] 2026-05-07 — to-issues (mattpocock MEDIUM) — setup-matt-pocock-skills prerequisite unmet; issue-tracker workflow not adopted
- [ ] 2026-05-07 — to-prd (mattpocock MEDIUM) — setup-matt-pocock-skills prerequisite unmet; trigger overlaps with kzk-spec-and-review
- [ ] 2026-05-07 — triage (mattpocock MEDIUM) — setup-matt-pocock-skills prerequisite unmet; requires GitHub issue workflow
- [ ] 2026-05-07 — write-a-skill (mattpocock MEDIUM) — skill-creator (oh-my-claudecode) already covers this (YAGNI)

_mattpocock/skills LOW cluster (cycle 47 C1 심사 결과 영구 skip):_
- [ ] 2026-05-07 — tdd (mattpocock LOW) — trigger keyword conflicts with kzk-test-coverage; no autonomous-mode awareness
- [ ] 2026-05-07 — zoom-out (mattpocock LOW) — redundant with kzk-codebase-survey + kzk-large-task-delegation explore subagent pattern
- [ ] 2026-05-07 — prototype (mattpocock LOW) — UI/UX throwaway prototyping; kzk-harness is a skill/workflow repo, not a product
- [ ] 2026-05-07 — migrate-to-shoehorn (mattpocock LOW) — TypeScript test-only tool; kzk-harness has no TS test infra
- [ ] 2026-05-07 — scaffold-exercises (mattpocock LOW) — domain-specific to ai-hero course platform; not applicable
- [ ] 2026-05-07 — setup-pre-commit (mattpocock LOW) — Node.js/Husky only; conflicts with kzk-pre-commit-gate multi-gate discipline
- [ ] 2026-05-07 — edit-article (mattpocock LOW) — personal document editing tool; not applicable to kzk-harness workflow
- [ ] 2026-05-07 — obsidian-vault (mattpocock LOW) — hardcoded vault path (/mnt/d/Obsidian Vault/); not portable


## Pending — Q-TOOL-EDIT-RETRY-EXHAUSTED (2026-05-12T09:14:12.768Z)
- Path: `/tmp/test-t6.txt`
- Error class: generic-edit
- Tool response (truncated): Error editing file
- Retry count: 2 consecutive failures within 60s window.
- Tentative default: skip this file, continue with next task.



