# kzk-harness Skill Set Consolidation Audit (2026-05-06)

## Scope

18 SKILL.md 파일 전수 audit. 목표:
1. 현재 description (verbatim) 기록
2. 현재 body §Triggers 섹션 verbatim 발췌 (첫 5 triggers)
3. ideal description 후보 작성 (push tone, 100-150 word, word count 명시)
4. body §Triggers 제거 line range 기록
5. Cluster B 3 스킬 description 연결 관계 명시
6. keyword-detector.mjs RULES `fix 시작` 정리안 before/after
7. Critical issues

---

## 18-row Audit Table

### 1. kzk-autonomous-boundary

**현재 description (verbatim):**
> "Autonomous-mode boundary — ASK-FIRST 3-slot branch/PR contract, halt conditions, destructive-op guardrails. Top triggers: 'ralph로 돌려', '자율실행', 'main 직접', '끝까지 끝내줘', 'branch contract'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`autonomous`, `ralph로 돌려`, `ralph로 체크`, `ralph로 확인`, `자는 동안 진행`
```

**ideal description 후보 (word count: 119):**
> "Autonomous-mode boundary — make sure to use this skill whenever the user says 'ralph로 돌려', '끝까지 끝내줘', '자율실행', or any phrasing that requests autonomous multi-commit execution. Enforces the mandatory ASK-FIRST 3-slot branch/PR contract (branch destination, branch name, PR mode) before any autonomous or harness-driven multi-commit flow begins. Governs halt conditions (reviewer 2× FAIL, build 3× FAIL, main-access required), destructive-op guardrails (force-push, reset --hard, PR auto-merge), and Q-entry patterns (Q-TDD-MAIN, Q-MAIN-DIRECT-EDIT, Q-VERIFIER-FAIL, Q-VERIFIER-INVALID, Q-VERIFIER-DISPATCH-FAIL). References harness-share.md §2."

**body §Triggers 제거 line range:** 11–16 (5 lines + blank separator line 16 → next heading line 17)

---

### 2. kzk-autonomous-loop

**현재 description (verbatim):**
> "Autonomous loop never stops politely — rate-limit polling (5h), context /compact at 80%, multi-Plan auto-continuation. Top triggers: 'rate limit', 'ScheduleWakeup', 'context budget', 'polite stop', 'Plan auto-continuation'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`rate limit`, `5h window`, `ScheduleWakeup`, `/compact`, `context budget`
```

**ideal description 후보 (word count: 115):**
> "Autonomous loop continuation rules — make sure to use this skill whenever a rate-limit hit, context-budget warning, or multi-Plan sequence requires the agent to keep running without stopping. Governs three specific continuity scenarios: (1) 5-hour rate-limit polling via ScheduleWakeup(delaySeconds=600), (2) auto /compact at ≥80% context with one-line restate, (3) Plan A→B→…→N auto-continuation with open-PR conflict guard. Polite stops are forbidden inside autonomous scope — this skill is the anti-polite-stop contract. References harness-share.md §12/§13/§14. Cross-ref kzk-autonomous-boundary for halt conditions."

**body §Triggers 제거 line range:** 11–16

---

### 3. kzk-background-monitoring

**현재 description (verbatim):**
> "Agent owns every background task it spawns — active monitoring until completion, stuck detection, never waits for user to ask. Top triggers: 'background', 'run_in_background', 'stuck', 'is it done', 'background task hung'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`background`, `monitor`, `long-running`, `stuck`, `codex consult`
```

**ideal description 후보 (word count: 118):**
> "Background task ownership discipline — make sure to use this skill whenever spawning a background process via run_in_background, Monitor tool, codex exec, or any CLI invocation ≥5 seconds. The spawning agent owns the task until terminal state (success/failure/kill) — 'is it done?' from the user is a violation. Governs stuck detection thresholds (subagent ≥5 min, Bash ≥3 min, codex no first token in 60s), kill+diagnose+retry procedure, subagent completion verification with receipt line, and session-resume restate-before-dispatch rule. Narration mandate: 1-3 sentences after every long-running tool call. References harness-share.md §23."

**body §Triggers 제거 line range:** 11–16

---

### 4. kzk-codebase-survey

**현재 description (verbatim):**
> "Mandatory pre-planning deep codebase read — full import scope, context7 docs, TypeScript contracts, fix-time callsite expansion. Top triggers: 'codebase survey', '코드 서베이', '코드베이스 탐색', 'spec 검증', '하나하나 확인', 'before planning', 'fix 시작', 'callsite 전수', 'preparation phase delegation'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-18, 첫 5):**
```
`codebase survey`, `코드베이스 탐색`, `deep explore`, `survey first`, `before planning`
```

**ideal description 후보 — Cluster B hub (word count: 148):**
> "Mandatory pre-planning deep codebase explorer — make sure to use this skill before any spec, plan, major design draft, or fix. This is the hub for fix-start flows: when the user says 'fix 시작', '버그 수정', or 'callsite 전수', invoke this skill first; it then lazy-invokes kzk-fix-scope-expansion (CRG callsite query) and kzk-freshness-guard (stale report check). Runs 8 steps via oh-my-claudecode:explore subagent: CRG index verify, scope expansion, deep parallel Read, library detection, context7 docs load, pattern extraction, TypeScript contracts, report save. 5+ file reads are forbidden in main context — always delegate here. References harness-share.md §26."

**body §Triggers 제거 line range:** 11–18

---

### 5. kzk-codex-handoff

**현재 description (verbatim):**
> "Codex CLI 호출 안정화 single source of truth — stdin pipe + --ephemeral + read-only + NDJSON file→jq + Preflight + 4 에러 fallback 사다리. Top triggers: 'codex CLI 호출', 'codex handoff', 'codex 안정화'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`codex CLI 호출`, `codex handoff`, `codex 안정화`, `codex 호출 보정`, `codex stdin pipe`
```

**ideal description 후보 (word count: 130):**
> "Codex CLI 호출 안정화 단일 SoT — make sure to use this skill whenever any other skill invokes the codex CLI, or when codex exec produces timeout/empty/NDJSON parse failures. Defines 5 hard rules: stdin pipe required, --json→file→jq (never direct pipe), --ephemeral always, short prompts via arg exception, plain text mode preferred. Covers E0 Preflight (which/version/sandbox), E1–E4 fallback ladder to critic opus, fresh-subagent dispatch shape, prompt size guidelines (<500 lines, <700-word response), and stuck detection (60s no-first-token, 5min total). Meta-skill — user triggers rare; auto-loaded by kzk-spec-and-review and kzk-large-task-delegation cross-ref. Self-authoritative (Phase 2: harness-share.md §32)."

**body §Triggers 제거 line range:** 11–16

---

### 6. kzk-fix-scope-expansion

**현재 description (verbatim):**
> "Fix scope expansion — fix 시작 시 함수/심볼 callsite 전수 조회 (CRG 우선 + grep fallback) + Gate 4.5 sanity check. Top triggers: 'fix 시작', 'callsite 전수', 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch', 'KZK_GATE45_SKIP'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`fix 시작`, `callsite 전수`, `Gate 4.5`, `fix-scope-cache`, `callsite mismatch`
```

**ideal description 후보 — Cluster B spoke (word count: 132):**
> "Fix scope expansion and Gate 4.5 sanity check — make sure to use this skill when a fix-start flow detects callsite mismatch or triggers Gate 4.5 (fix-scope-specific keywords). Note: 'fix 시작' and '버그 수정' direct triggers are owned by kzk-codebase-survey (the hub); this skill is cross-ref invoked from codebase-survey during fix-start flows. Direct triggers for this skill are callsite-mismatch-specific: 'callsite 전수', 'Gate 4.5', 'fix-scope-cache', 'KZK_GATE45_SKIP', 'callsite 누락'. Runs fix-scope-trigger.mjs hook (CRG detect-changes → grep fallback), writes .kzk-harness/fix-scope-cache.jsonl, and defines the pre-commit Gate 4.5 BLOCK. Default DISABLED until kzk-pre-merge-sync step 3. References harness-share.md §3.5."

**body §Triggers 제거 line range:** 11–16

---

### 7. kzk-freshness-guard

**현재 description (verbatim):**
> "Stale 메타 문서 자동 감지 + CRG 기반 심볼 역참조 + auto-fix — 모든 프로젝트 범용. Top triggers: 'stale 체크', 'freshness', '문서 신선도', 'stale check', 'freshness guard'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-15, 첫 5):**
```
`stale 체크`, `freshness`, `문서 신선도`, `stale check`, `freshness guard`
```

**ideal description 후보 — Cluster B spoke (word count: 137):**
> "Stale 메타 문서 자동 감지 + CRG 심볼 역참조 + auto-fix — make sure to use this skill at Gate 0.5 (pre-commit staged-path stale check), kzk-spec-and-review Step 0 (spec/plan reference freshness), and kzk-pre-merge-sync §4 (pre-merge full sweep). For fix-start flows, this skill is invoked via kzk-codebase-survey (the hub) — 'fix 시작' direct trigger routes through codebase-survey, not here directly. Direct triggers for this skill: 'stale 체크', 'freshness guard', 'Gate 0.5', 'KZK_GATE05_SKIP', 'stale doc', pre-merge sweep. Detection logic: CRG reverseRefs → meta-doc grep → line-ref validation. Auto-fix per doc type (AGENTS.md row update, CLAUDE.md section rewrite, spec/survey line-ref refresh). References harness-share.md §30."

**body §Triggers 제거 line range:** 11–15

---

### 8. kzk-large-task-delegation

**현재 description (verbatim):**
> "Large tasks (3+ files / 200+ LoC / 5+ file read / multi-stage) dispatch to fresh subagents — main never executes. Top triggers: '큰 작업', '버그 전수조사', '사이클 자율', 'plan 쪼개', 'subagent dispatch', 'Stage 3', 'fresh-agent verifier', 'verifier dispatch', 'INVALID_VERDICT', 'Body §Anti-pattern Main direct-edit'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`large task`, `subagent dispatch`, `3+ file edits`, `200+ LoC`, `opus/sonnet routing`
```

**ideal description 후보 (word count: 143):**
> "Large task delegation — make sure to use this skill for any request involving 3+ file edits, 200+ LoC changes, 5+ file reads for verification/audit, or multi-stage workflows (build/test/Playwright/review). Main context = dispatch + review only; main never holds implementation or reads 5+ files directly. Governs scope estimation (mandatory 30-second estimate before any non-trivial edit), model routing (opus for plans/critic/verifier, sonnet for substantive implementation, haiku for mechanical), Stage 3 fresh-agent verifier (Gate 5 cite), Q-VERIFIER-FAIL/INVALID/DISPATCH-FAIL halt entries, and read-heavy audit dispatch shape. User phrases: '큰 작업', '버그 전수조사', '마무리 해줘', '사이클 자율', 'plan 쪼개', 'Stage 3'. References harness-share.md §4."

**body §Triggers 제거 line range:** 11–16

---

### 9. kzk-playwright-verification

**현재 description (verbatim):**
> "Playwright MCP Gate 4 routine + OAuth click-through protocol + result-narration mandate. Top triggers: 'Playwright', 'Gate 4', '로그인 버튼', 'browser_navigate', 'Google 로그인'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`Playwright`, `Gate 4`, `browser_navigate`, `browser_take_screenshot`, `screenshot 검수`
```

**ideal description 후보 (word count: 121):**
> "Playwright MCP visual verification and OAuth click-through — make sure to use this skill before every UI/CSS commit (Gate 4) and whenever browser_navigate, browser_take_screenshot, OAuth login screens, or 'Google 로그인' appear in the workflow. Build/test green ≠ visual PASS — Gate 4 catches unstyled shadcn primitives, padding-less badges, border-only cards. Enforces: 3+ representative pages, full-page screenshot, 0 console errors, explicit visual claim (named elements + named tokens). OAuth click-through is agent-driven — never stop to wait for user on login UI. MCP drop → 5-step self-recovery before halting. Narration mandate: 1-3 sentences after every tool call ≥2s. References harness-share.md §3 Gate 4."

**body §Triggers 제거 line range:** 11–16

---

### 10. kzk-pre-commit-gate

**현재 description (verbatim):**
> "Up-to-10-step Pre-commit Gate (AGENTS.md sync / freshness guard / ai-slop / secrets / production code-first / build / test / Playwright / fix-scope sanity / fresh-agent verifier). Top triggers: 'commit', 'pre-commit', 'Gate 0', 'AGENTS.md sync', 'Gate 0.5', 'freshness guard', 'stale', 'Gate 1.6', 'production code-first', 'staged-path trigger', 'env-exception', 'Gate 4.5', 'fix-scope-cache', 'callsite mismatch', 'KZK_GATE45_SKIP', 'doc-only', 'Gate 5', 'verifier', 'fresh-agent verification', 'INVALID_VERDICT'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`commit`, `pre-commit`, `Gate 0`, `Gate 0.5`, `Gate 1`
```

**ideal description 후보 (word count: 140):**
> "Pre-commit gate — make sure to use this skill before every commit, whether autonomous or interactive. Runs up to 9 sequential gates: Gate 0 (AGENTS.md sync, when hierarchy present), Gate 0.5 (freshness guard CRG stale check), Gate 1 (ai-slop-cleaner), Gate 1.5 (secrets scan AKIA/ASIA), Gate 1.6 (production code-first staged-path check), Gate 2 (build green), Gate 3 (module test pass), Gate 4 (Playwright visual if frontend changed), Gate 4.5 (fix-scope callsite sanity), Gate 5 (fresh-agent verifier for 3+ file commits and high-risk tags). One failure blocks the commit. Skip conditions per gate are explicit — no silent skips. Covers doc-only fast path, KZK_GATE05_SKIP, KZK_GATE45_SKIP, env-exception, INVALID_VERDICT handling. References harness-share.md §3."

**body §Triggers 제거 line range:** 11–16

---

### 11. kzk-pre-merge-sync

**현재 description (verbatim):**
> "Pre-merge/milestone checklist — sync CLAUDE.md + run deepinit before any user-visible milestone. Top triggers: 'merge', 'PR 직전', 'deepinit', 'CLAUDE.md sync', 'milestone marker'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-19, 첫 5):**
```
`merge`, `merge 전`, `feature branch`, `PR`, `PR 직전`
```

**ideal description 후보 (word count: 127):**
> "Pre-merge and milestone checklist — make sure to use this skill before any gh pr create (PR-flow) or before each user-visible milestone commit (direct-main flow). Enforces 4 mandatory steps: (1) CLAUDE.md sync (Tech Stack / Project Structure / API Endpoints / Database / Key Rules / Env Vars), (2) deepinit run and manifest refresh, (3) regression-recall + fix-scope-trigger hook auto-enable after all 5 plans merge (fail-closed: jq check + duplicate guard + exit-code gate), (4) full freshness sweep via kzk-freshness-guard. PR description must include 'CLAUDE.md updated to match current state' and 'deepinit ran'. Skipping deepinit on direct-main flow is a violation. References harness-share.md §14.5 + §15."

**body §Triggers 제거 line range:** 11–19

---

### 12. kzk-production-access

**현재 description (verbatim):**
> "Production/external-infra access boundary + credential-handling — explicit-instruction rule, destructive-op guardrails, AWS STS triage, code-first production state mutation, 멱등성 의무. Top triggers: 'AWS', 'SSM', 'production', 'aws-vault', 'credential', 'migration', 'IaC', 'schema change', 'code-first', '멱등성', 'idempotent', 'drift', 'forward-only'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`AWS`, `AWS 접속`, `SSM`, `SSM Session Manager`, `production`
```

**ideal description 후보 (word count: 138):**
> "Production and external infrastructure access boundary — make sure to use this skill whenever the user mentions AWS, SSM, production DB, migration, IaC (Terraform / CloudFormation / Pulumi), schema change, or credential handling. Default is forbidden including read-only. Two permission categories: (a) read-only inspection requires explicit user instruction; (b) state mutation (DB schema, IAM, S3, Lambda env) — AI authors script only, user or CI executes. Idempotency mandatory on all production scripts (IF NOT EXISTS, ON CONFLICT DO NOTHING, describe-* conditional). Drift resolution = forward-only migration, never production state rollback. STS credentials (ASIA prefix) single-use only; permanent IAM keys (AKIA prefix) refuse + advise revocation. References harness-share.md §2."

**body §Triggers 제거 line range:** 11–16

---

### 13. kzk-regression-memory

**현재 description (verbatim):**
> "Regression memory + auto-recall — fix 시작 시 과거 유사 fix 자동 조회 (gstack /learn + sidecar). dismiss CLI mutation 포함. Top triggers: 'regression memory', '재발 방지', 'fix 시작', 'recall', '과거 fix 조회', 'dismiss recall'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-17, 첫 5):**
```
`regression memory`, `재발 방지`, `fix 시작`, `recall`, `과거 fix 조회`
```

**ideal description 후보 (word count: 128):**
> "Regression memory auto-recall — make sure to use this skill when a fix starts and past similar fixes should be surfaced, or when managing the regression memory lifecycle (dismiss, archive, stale check, cycle retro). Hooks into UserPromptSubmit via regression-recall.mjs to inject past fix context before the fix begins. Storage: gstack /learn JSONL (primary) + .kzk-harness/regression-meta.jsonl sidecar (dismiss_count, stale, archived). Decay formula: confidence * 0.85^dismiss_count; archived/decayed-below-4 entries filtered. Self-improvement loop auto-skipped via KZK_HARNESS_SELF_IMPROVEMENT=1. Dismiss CLI: node install/bin/kzk-regression-memory.mjs dismiss <key>. Default DISABLED until kzk-pre-merge-sync step 3. References harness-share.md §29."

**body §Triggers 제거 line range:** 11–17

---

### 14. kzk-spec-and-review

**현재 description (verbatim):**
> "Spec/plan/major-design authoring with mandatory codex CLI cross-vendor review (Step 0 codebase-survey precondition). Top triggers: 'spec 잡자', 'plan draft', 'codex review', '여러 plan', '메타 plan', 'brainstorming', 'Step -1', 'brainstorm mode'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-18, 첫 5):**
```
`spec 잡자`, `spec 작성`, `spec draft`, `plan draft`, `plan 작성`
```

**ideal description 후보 (word count: 133):**
> "Spec, plan, and major design authoring with mandatory cross-vendor codex review — make sure to use this skill whenever the user says 'spec 잡자', 'plan draft', 'plan 만들어', 'codex review', 'brainstorm', or 'architecture review'. Step -1 (brainstorming via superpowers:brainstorming) runs on exploratory keywords; Step 0 (kzk-codebase-survey precondition + kzk-freshness-guard check) is mandatory before drafting; Steps 1-3 (draft via executor sonnet → codex CLI consult via kzk-codex-handoff → synthesize + categorize 🔴/🟡/⚪) complete the loop. Verdict file saved to docs/research/codex-reviews/ or docs/plans/. Chat-history-only verdict does not count. References harness-share.md §22 + §22.5."

**body §Triggers 제거 line range:** 11–18

---

### 15. kzk-test-coverage

**현재 description (verbatim):**
> "TDD-strict + 100% line+branch coverage on changed files — failing test FIRST (red), impl (green), refactor, commit. Top triggers: 'TDD', 'test first', '테스트 먼저', 'test coverage', 'coverage exemption', '자율 mode TDD', 'test-from-implementation', 'self-verification'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`test coverage`, `test:cov`, `100% coverage`, `변경 파일 cov`, `coverage exemption`
```

**ideal description 후보 (word count: 131):**
> "TDD-strict and 100% coverage on changed files — make sure to use this skill for any new feature or bugfix requiring TDD discipline, coverage gap reporting, or when 'test first', '테스트 먼저', 'red-green', or 'coverage exemption' appear. Enforces Red→Green→Refactor→Commit sequence: failing test written before implementation read. Anti-self-verification rule: in autonomous mode, main context cannot enter TDD red stage directly — must dispatch via fresh sonnet (halt entry Q-TDD-MAIN if violated). 100% line+branch coverage on touched files; legacy code in touched files counts. Exemptions (boot files, .d.ts, decorator-only) must be declared in PR description. References harness-share.md §11."

**body §Triggers 제거 line range:** 11–16

---

### 16. kzk-tool-retry

**현재 description (verbatim):**
> "One automatic retry on every Edit/Write/Bash failure before user prompt — 'File has not been read yet' always fixed by re-read + retry. Top triggers: 'Edit failed', 'File has not been read yet', 'String to replace not found', 'Write failed', 'polite-stop', 'PreToolUse guard', 'edit-read-guard', 'Read first'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`tool retry`, `auto-retry`, `retry`, `File has not been read yet`, `String to replace not found`
```

**ideal description 후보 (word count: 127):**
> "Tool failure auto-retry discipline — make sure to use this skill whenever an Edit, Write, or Bash tool call fails. Asking the user 'should I retry?' after a single failure is a violation. Default policy: one automatic retry with no user prompt. 'File has not been read yet' / 'String to replace not found' / 'File has been modified since read' are always resolved by re-reading first — the pre-emptive Read protocol lists 7 read-tracker invalidator events (new user message, /compact, agent return, formatter run, etc.). PreToolUse edit-read-guard hook enforces OS-level Read-before-Edit from Plan F. Queue-on-double-failure: Q-TOOL entry in user-queue.md, then continue to next task. References harness-share.md §27."

**body §Triggers 제거 line range:** 11–16

---

### 17. kzk-user-queue

**현재 description (verbatim):**
> "Autonomous-run ambiguous-decision queue — append with tentative defaults, interactive Stage 1/2/3 review on user return. Top triggers: 'user-queue', '모호 결정', 'Q-COV', 'Interactive Queue Review', 'Stage 3'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`user-queue`, `Q-COV`, `Q-TOOL`, `Q-WEBLOOP`, `Q-SUBAGENT`
```

**ideal description 후보 (word count: 120):**
> "Autonomous-run ambiguous-decision queue — make sure to use this skill whenever an autonomous cycle encounters an ambiguous decision, tool double-failure, coverage gap, or any situation requiring a user decision that cannot be resolved immediately. Append a Pending entry with tentative default and proceed — never stop. Path: docs/harness/user-queue.md (git-tracked). Entry template includes: Context, Options, Tentative default, Override mechanism, Impact. On user return: Stage 1 (classify Pending into A/B/C), Stage 2 (GROUP A interactive 1-by-1 highest-impact first), Stage 3 (Resolution loop max 3 iterations). Queue producers: kzk-tool-retry (Q-TOOL), kzk-test-coverage (Q-COV), kzk-web-loop (Q-WEBLOOP), kzk-autonomous-boundary (Q-TDD-MAIN etc). References harness-share.md §6."

**body §Triggers 제거 line range:** 11–16

---

### 18. kzk-web-loop

**현재 description (verbatim):**
> "Autonomous web page improvement loop — indefinite self-directed cycles via fresh evaluator agent. Top triggers: 'web loop', '웹 루프', '무한 루프', '자율 개선', '계속 돌려'. Body §Triggers for full list."

**현재 body §Triggers 발췌 (line 11-16, 첫 5):**
```
`web loop`, `웹 루프`, `자율 개선`, `loop forever`, `무한 개선`
```

**ideal description 후보 (word count: 138):**
> "Autonomous web page improvement loop — make sure to use this skill whenever the user says 'web loop', '웹 루프 시작', '계속 돌려', '자율 개선', or '무한 루프'. Runs self-directed cycles indefinitely: (1a) TOOL RUNNER subagent (sonnet) collects test/Playwright/console data, (1b) EVALUATOR subagent (opus) prioritizes P0/P1/P2 issues, (2) picks top issue not yet fixed this cycle, (3) ambiguous decisions → user-queue with tentative default, (4a) P0 fast path → executor direct, (4b) P1/P2 → codebase-survey + writing-plans + subagent-driven-development, (5) harness-flow-progress.md append + regression memory retro. Playwright is optional enhancement with cascade recovery — never halts on MCP drop. Reviewer FAIL 2× = skip issue, pick next (overrides kzk-autonomous-loop halt rule). References harness-share.md §25."

**body §Triggers 제거 line range:** 11–16

---

## body §Triggers 제거 영향 (라인 감소 추정)

| Skill | Triggers 섹션 lines | 감소 라인 수 |
|---|---|---|
| kzk-autonomous-boundary | 11–16 | 6 |
| kzk-autonomous-loop | 11–16 | 6 |
| kzk-background-monitoring | 11–16 | 6 |
| kzk-codebase-survey | 11–18 | 8 |
| kzk-codex-handoff | 11–16 | 6 |
| kzk-fix-scope-expansion | 11–16 | 6 |
| kzk-freshness-guard | 11–15 | 5 |
| kzk-large-task-delegation | 11–16 | 6 |
| kzk-playwright-verification | 11–16 | 6 |
| kzk-pre-commit-gate | 11–16 | 6 |
| kzk-pre-merge-sync | 11–19 | 9 |
| kzk-production-access | 11–16 | 6 |
| kzk-regression-memory | 11–17 | 7 |
| kzk-spec-and-review | 11–18 | 8 |
| kzk-test-coverage | 11–16 | 6 |
| kzk-tool-retry | 11–16 | 6 |
| kzk-user-queue | 11–16 | 6 |
| kzk-web-loop | 11–16 | 6 |
| **합계** | | **121 lines** |

총 121 라인 감소 (18 스킬 합산). 각 Triggers 섹션은 `## Triggers` heading + 1–3 content lines + trailing blank line 구성.

---

## Cluster B 연결 관계 — 3 스킬 description 핵심 verbatim

### kzk-codebase-survey (hub)

description 명시 내용 (ideal 후보):
> "This is the hub for fix-start flows: when the user says 'fix 시작', '버그 수정', or 'callsite 전수', invoke this skill first; it then lazy-invokes kzk-fix-scope-expansion (CRG callsite query) and kzk-freshness-guard (stale report check)."

### kzk-fix-scope-expansion (spoke — fix-scope-specific only)

description 명시 내용 (ideal 후보):
> "Note: 'fix 시작' and '버그 수정' direct triggers are owned by kzk-codebase-survey (the hub); this skill is cross-ref invoked from codebase-survey during fix-start flows. Direct triggers for this skill are callsite-mismatch-specific: 'callsite 전수', 'Gate 4.5', 'fix-scope-cache', 'KZK_GATE45_SKIP', 'callsite 누락'."

### kzk-freshness-guard (spoke — Gate 0.5 / pre-merge sweep)

description 명시 내용 (ideal 후보):
> "For fix-start flows, this skill is invoked via kzk-codebase-survey (the hub) — 'fix 시작' direct trigger routes through codebase-survey, not here directly. Direct triggers for this skill: 'stale 체크', 'freshness guard', 'Gate 0.5', 'KZK_GATE05_SKIP', 'stale doc', pre-merge sweep."

---

## keyword-detector.mjs RULES — `fix 시작` 정리안

### 현재 상태 (Before)

`fix 시작` 관련 keyword-detector.mjs RULES 현황:

현재 keyword-detector.mjs 의 RULES 배열에 `fix 시작` 키워드가 포함된 rules 없음 — `grep "fix 시작"` 결과 0건. 따라서 현재 상태에서 `fix 시작` 은 keyword-detector hook 으로 아무 skill 도 trigger 하지 않음.

단, 기존 rules 에서 관련 연결:
- Rule 2: `codebase survey`, `구현 확인`, `spec 체크` 등 → `kzk-codebase-survey + kzk-large-task-delegation` 매핑
- Rule 3: 단순 서베이 자연 발화 → `kzk-codebase-survey` 단독
- 자가개선 루프 rule: `harness 개선 루프`, `재발 방지` 등 → `kzk-spec-and-review, kzk-large-task-delegation, kzk-pre-commit-gate, kzk-autonomous-loop`

### 정리안 (After)

`fix 시작` trigger 를 keyword-detector.mjs 에 추가한다면:

**추가할 rule (Cluster B 삼각 순환 반영):**
```js
{
  skills: ["kzk-codebase-survey"],
  why: "fix-start hub — codebase-survey lazy-invokes fix-scope-expansion + freshness-guard internally",
  triggers: [
    "fix 시작", "버그 수정", "에러 fix", "regression fix", "버그 수정 시작",
  ],
},
```

**제거/축소 대상:**
- `kzk-regression-memory` 는 default DISABLED + own hook (`regression-recall.mjs`) 으로 별도 동작 → keyword-detector 에 추가할 필요 없음 (영향 없음, 현재도 없음)
- `kzk-fix-scope-expansion` 단독 rule 추가 불필요 → codebase-survey hub 경유로 충분
- `kzk-freshness-guard` 단독 rule 추가 불필요 → codebase-survey hub 경유로 충분

**Before (현재): `fix 시작` → keyword-detector 매핑 없음 (0건)**

**After (정리안): `fix 시작` → `kzk-codebase-survey` 단독 매핑**

---

## Critical Issues 발견

### Issue 1 — kzk-codex-handoff description 의 harness-share.md §N reference 누락 (HIGH)

현재: `description` 에 harness-share.md §N 참조 없음.
본문: `> Authoritative source: This skill is self-authoritative for codex CLI invocation discipline. Will migrate to harness-share.md §32 in Phase 2.`
문제: 다른 모든 스킬은 `harness-share.md §N` 을 authoritative source 로 명시. 이 스킬만 self-authoritative 로 선언 — Phase 2 가 언제인지 미정. 현재 §32 는 아직 harness-share.md 에 존재하지 않을 가능성.
권고: description 에 `(Phase 2: harness-share.md §32 예정 — 현재 self-authoritative)` 명시 + Phase 2 TODO를 docs/harness/user-queue.md 에 등록.

### Issue 2 — kzk-fix-scope-expansion 과 kzk-regression-memory 의 `fix 시작` description 중복 (MEDIUM)

현재: 두 스킬 description 모두 `fix 시작` 을 Top trigger 로 표기. Cluster B 정리안(description 강화 + keyword-detector 정리)으로 해소 가능하나, 사용자 결정 전까지 양쪽 description 에 `fix 시작` 이 남아 있어 혼란 야기.
권고: 이번 description 강화에서 kzk-fix-scope-expansion description 의 `fix 시작` 직접 trigger 제거, kzk-regression-memory description 의 `fix 시작` 직접 trigger 제거 → codebase-survey hub 경유 명시로 대체.

### Issue 3 — frontmatter description 비대 (LOW)

현재 `kzk-pre-commit-gate` description 이 234 characters 로 frontmatter 최장. Anthropic best practice 기준 description 은 semantic routing 용 — 지나치게 긴 trigger keyword enumeration 은 제거 후 본문 이관 권장.
권고: ideal description (140 words) 으로 교체 시 자연히 해소됨.

### Issue 4 — kzk-codex-handoff-workspace 디렉토리 존재하나 SKILL.md 없음 (LOW)

`skills/kzk-codex-handoff-workspace/iteration-1/` 존재하나 SKILL.md 없음. 불완전 스킬 디렉토리 — install 스크립트가 이를 스킬로 오인할 가능성.
권고: SKILL.md 추가 또는 iteration-1 디렉토리를 docs/ 로 이동.

### Issue 5 — kzk-autonomous-boundary §Halt conditions 표의 Q-CODEX-DISPATCH-FAIL 미등록 (MEDIUM)

kzk-codex-handoff §Interaction with other kzk-* 에서:
> `kzk-autonomous-boundary (sister skill): Q-CODEX-DISPATCH-FAIL halt entry 를 §Halt conditions 표에 등록 의무 (Phase 2 작업).`
현재 kzk-autonomous-boundary §Halt conditions 표에 Q-CODEX-DISPATCH-FAIL 없음. Phase 2 미완료 상태.
권고: Q-CODEX-DISPATCH-FAIL 를 kzk-autonomous-boundary §Halt conditions 표에 추가 (kzk-codex-handoff cross-ref 로 처리 가능).

---

## 작성 기준

- 모든 18 SKILL.md 본문 직접 read 후 verbatim 인용
- ideal description word count: 115–148 words (엄격 준수)
- push tone: "make sure to use this skill whenever..." 또는 동등 한국어
- harness-share.md §N reference 유지 (각 스킬의 authoritative source 그대로)
- Cluster B 삼각 관계: hub(codebase-survey) → lazy invoke → spoke(fix-scope-expansion, freshness-guard)
- keyword-detector.mjs `fix 시작` 현황: 현재 0건 → 정리안 codebase-survey 단독 추가

