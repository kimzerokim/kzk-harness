# User Queue

> 시간 역순 — 최신 entry 위. 작업 끝 시 `- [x]` 체크.

## OPEN

_(없음)_

## RESOLVED

- [x] 2026-05-06 20:58 — Q-AUTONOMOUS-SOT — autonomous-mode detection SoT 신설 (cycle 44)

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


## Pending — Q-DESIGN-BOILERPLATE (2026-05-20T04:00:00.000Z)
- Context: kzk-large-task-delegation §Task-level dispatch shape design (`docs/plans/2026-05-20-task-level-dispatch-design.md`), Cycle 1 codex review BLOCKER B1.
- Original user choice (clarifying Q&A round): Hybrid boilerplate (agent definition for general guardrails + kzk-specific inlined).
- Codex finding: OMC `agents/executor.md:21-30,55-70,95-104` does NOT carry kzk-required TDD strict / production-code-first / code-quality / anti-self-verification rules. The "inherit from agent definition" premise is factually false.
- Tentative default (autonomous cycle 2): retreat to **Defensive** — all kzk-required boilerplate inlined per dispatch. Agent definition only relied upon for OMC's own Tool_Usage / Failure_Modes_To_Avoid (generic). Rationale: cannot silently drop protections to chase a leaner prompt.
- User decision needed (post-hoc): accept Defensive retreat, or pin a specific OMC version + add OMC parity PR as out-of-scope follow-up.

## Pending — Q-DESIGN-WAVE (2026-05-20T04:00:00.000Z)
- Context: kzk-large-task-delegation §Multi-dispatch wave shape design, Cycle 1 codex review PUSH-BACK P2.
- Original user choice (clarifying Q&A round): Hybrid wave identification (plan `## Dependencies` recommended + main fallback file-disjoint heuristic).
- Codex finding: File-disjoint heuristic is too weak for semantic dependencies (shared types/contracts/tests can race even when file lists are disjoint).
- Tentative default (autonomous cycle 2): **Dependency declaration mandatory for any plan with parallel waves**. File-disjoint fallback retained only for legacy plans without `## Dependencies`, defaulting conservative sequential (no auto-parallelism) when uncertain.
- User decision needed (post-hoc): accept mandatory-declaration retreat, or keep Hybrid with explicit semantic-dependency caveat in plan-writing guide.


