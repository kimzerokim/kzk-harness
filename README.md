# kzk-harness

Workflow skill layer for [Claude Code](https://claude.ai/code). Installs 18 `kzk-*` skills into any project — commit gates, autonomous mode boundaries, Playwright verification, large task delegation, and more.

Each skill is a markdown file loaded by Claude when you mention its trigger keyword. No runtime, no config files, no build step.

## Install

Open Claude Code in any directory, paste this prompt, and answer the one question. Works for first-time install and re-install.

```
kzk-harness 설치해줘.

먼저 사용자에게 묻기: "GLOBAL 설치 (권장: ~/.claude/skills/ 에 설치, 모든 Claude Code 세션에서 자동 활성) vs PROJECT-ONLY 설치 (현 디렉토리의 .claude/skills/ 에만, 다른 프로젝트 영향 X) — 어느 쪽?"

답이 GLOBAL (default 권장) 이면:
  git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
  bash /tmp/kzk-harness/install/install-global.sh --enable-hooks --regression-recall --fix-scope-trigger --freshness-guard
  rm -rf /tmp/kzk-harness

답이 PROJECT-ONLY 면:
  1. 현 디렉토리가 project root 인지 verify (CLAUDE.md 존재 OR git repo). 아니면 abort: "kzk-harness must be installed from a project root directory."
  2. git clone --depth 1 https://github.com/kimzerokim/kzk-harness.git /tmp/kzk-harness
  3. /tmp/kzk-harness/skills/kzk-* 각각의 SKILL.md 를 .claude/skills/<name>/ 로 sync. Version-aware: 두 frontmatter 의 `version:` 비교 — source ≥ target 또는 target 없으면 overwrite, target > source 면 preserve + log "skipped <name> — local v<X> > source v<Y>"
  4. .claude/skills/kzk-* 중 source 에 없는 것 (rename / removed) 한 번에 사용자에게 묻고 yes 면 삭제
  5. /tmp/kzk-harness/harness-share.md 를 project root 에 복사 (overwrite — version field 없음, source 가 single canonical)
  6. CLAUDE.md 의 `## Active Skills (kzk-harness)` 섹션 refresh (없으면 H1 뒤 append). 다른 섹션 손대지 X. 새 표는 source 의 kzk-* 각각에 대해 SKILL.md frontmatter 의 name + description "Required triggers:" 부분 추출
  7. bash /tmp/kzk-harness/install/dependencies.sh "$(pwd)"
  8. rm -rf /tmp/kzk-harness
```

**Why global is recommended** — install once, every Claude Code session in any directory auto-activates. No per-project migration. Update with one command. No config files accumulate inside project trees. The 18 skill `.md` files live in `~/.claude/skills/kzk-*` (auto-loaded), the umbrella `harness-share.md` lives in `~/.claude/skills/.kzk-harness-shared/` (dot-prefix prevents Claude from treating it as an invocable skill), and a clearly-marked block in `~/.claude/CLAUDE.md` carries the routing table. Outside that block, your existing `~/.claude/CLAUDE.md` is left byte-for-byte identical.

**Project artifacts** (`harness-flow-progress.md`, `docs/harness/`, `docs/plans/`, `.web-loop/`, `.omc/`, `docs/research/codex-reviews/`) always stay in `$PWD` per spec §6.2 — the install never writes outside `~/.claude/` (global mode) or outside the project root (project-only mode).

**External dependencies** (auto-installed by `dependencies.sh` for both modes): `code-review-graph` (pip --user → pipx fallback), `codex` CLI (npm → brew fallback), `gh` and `aws-vault` (detected only). Claude Code plugins (`oh-my-claudecode`, `playwright-mcp`) detected via `~/.claude/plugins/installed_plugins.json` and `~/.claude.json` — missing plugins emit the `/plugin` install command. Never hard-fails. See `install/dependencies.md` for per-skill fallback behavior.

**code-review-graph indexing is per-project.** The binary is installed once globally (or per Python env), but the SQLite knowledge graph is built per project root on first `kzk-codebase-survey` trigger (or via `bash install/dependencies.sh "$(pwd)"` from that project — the first arg is the project root the build runs in). The global install runs `--skip-project` and never builds a graph; each project bootstraps its own index.

## Update

Re-run the install one-liner above (`install-global.sh` is idempotent — version-aware overwrite).
Or, from a permanent checkout:

```
cd /path/to/kzk-harness && git pull && bash install/install-global.sh --update --enable-hooks --regression-recall --fix-scope-trigger --freshness-guard
```

## Uninstall

```
bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh
```

Removes the marker block from `~/.claude/CLAUDE.md`, deletes `~/.claude/skills/kzk-*` and `~/.claude/skills/.kzk-harness-shared/`. Per-project artifacts (`harness-flow-progress.md`, `.web-loop/`, etc.) are left untouched — pass `--purge-project-artifacts <path>` to opt-in clean a specific repo.

External dependencies (codex CLI, code-review-graph) are not auto-removed since other tools may use them. Manual removal: `pip uninstall code-review-graph`, `npm uninstall -g @openai/codex`.

## Usage — starting a new feature

Skills load when you say their trigger keyword in chat. You don't `/invoke` anything — just describe the work and the relevant skill activates. The flow below is the canonical end-to-end shape for a non-trivial feature (≥ 3 files or ≥ 200 LoC). For a trivial fix, jump straight to step 5.

1. **Write the spec.** "이 기능 spec 좀 잡자: <one-paragraph description>". The phrase `spec 잡자` / `spec draft` (or `plan draft`) auto-loads `kzk-spec-and-review` (R5). The skill enforces a Step 0 precondition: if no codebase survey report exists for the topic in `docs/harness/surveys/` (or the latest is > 7 days old / stale per git history), it auto-triggers `kzk-codebase-survey` first — Step 0.5 + Steps 1–8 (scope expansion via `code-review-graph` MCP/CLI; **CRG is mandatory in v1.17.0+** — grep fallback only via explicit `KZK_CRG_GREP_FALLBACK=1`; parallel deep read, library doc fetch via context7, type-contract scan, env-var scan). The survey report path is then cited in the draft prompt as "Required reading" before draft begins. After the draft, the skill sends it to the codex CLI for cross-vendor review (or `oh-my-claudecode:critic` opus fallback), synthesizes the verdict, and saves it to `docs/plans/<topic>-design.md` (spec/brainstorming drafts) or `docs/research/codex-reviews/<topic>-critic-review.md` (spec/non-plan codex review) — the canonical paths as of 2026-05-12. You see a 🔴/🟡/⚪ bucketed summary; revise until you accept it.

2. **Write the plan.** "plan 작성해줘". This re-enters `kzk-spec-and-review` (the same Step 0 → 1–3 loop applies to plans) with the survey report from Step 1 reused if still fresh. Output: `docs/plans/<topic>-plan.md` (implementation plan) with codex review at `docs/plans/<topic>-critic-review.md` (plan critic reviews always land in `docs/plans/`; non-plan spec/brainstorming codex reviews land in `docs/research/codex-reviews/<topic>-critic-review.md`). For multi-task plans that feed sonnet executors, `kzk-large-task-delegation`'s narrower in-skill plan-critic loop also triggers — same opus planner + parallel codex consult + critic. Halt + queue on 2 consecutive critic FAILs. Plan freezes after a clean review pass.

3. **Branch + dispatch.** Switch to `feature/<topic>` (NEVER edit on `main`). Say "ok 이대로 ralph로 돌려" or "executor에게 넘겨" — `kzk-large-task-delegation` dispatches a sonnet executor subagent with the frozen plan + survey report + Gate 0–4 instructions in the prompt.

4. **Autonomous run (optional).** Phrases like "끝까지 끝내줘", "자는 동안 진행해" trigger `kzk-autonomous-boundary`. The loop continues until completion, halts on (a) ≥ 2 consecutive reviewer/critic FAILs OR ≥ 3 consecutive build/test FAILs on the same area, (b) destructive op without ok-sign, (c) `kzk-tool-retry` exhausted, (d) `Q-COMPACT-EVASION` (context ≥ 50% without `/compact <remaining tasks>`), (e) `Q-SURVEY-MISSING` (large-task dispatch in autonomous mode without a prior codebase-survey). Halts append to `docs/harness/user-queue.md` for you to resolve when you return. Rate-limit / context-50% / multi-plan continuation handled by `kzk-autonomous-loop` (sleep + ScheduleWakeup, then resume).

5. **Commit.** Saying "commit" loads `kzk-pre-commit-gate`. The skill runs 10 gates per commit batch — Gate 0 / 0.5 / 1 / 1.5 / 1.6 / 2 / 3 / 4 / 4.5 / 5 (AGENTS.md sync, freshness-guard, ai-slop-cleaner, secrets scan, production code-first, build, tests, Playwright UI smoke, fix-scope, fresh-agent verifier). Each commit message ends with the gate-PASS line consumed by `kzk-pre-merge-sync`.

6. **PR + merge.** "PR 올려줘" loads `kzk-pre-merge-sync`. Runs `/oh-my-claudecode:deepinit` to refresh AGENTS.md/CLAUDE.md against the final feature-branch tip, then `gh pr create` with the gate-PASS footer. **You** approve the merge — explicit "merge it" required. The autonomous loop will not merge to `main` on its own.

The skills cross-reference each other; you don't have to memorize the whole chain. Trigger keywords are listed in the table below.

## Skills

| Skill | Trigger keywords |
|---|---|
| `kzk-pre-commit-gate` | commit, pre-commit, Gate 0/1/1.5/2/3/4, AGENTS.md sync, secrets scan, doc-only |
| `kzk-large-task-delegation` | 3+ file edits, 200+ LoC, subagent dispatch, opus/sonnet routing, read-heavy audit, spec 검증, 버그 전수조사, 마무리 해줘, 전수 검토, 끝내줘 |
| `kzk-playwright-verification` | Playwright, Gate 4, browser_navigate, screenshot, MCP drop, dev/prod build trap, dev server health, OAuth multi-account, Q-PW-OAUTH-* |
| `kzk-autonomous-boundary` | ralph, ralph로 체크, ralph로 확인, autonomous mode, halt condition, main branch boundary, autonomous completion verifier, Q-COMPLETION-SELF-VERIFY, autonomous TDD enforce, Q-TDD-AUTO-MISSING |
| `kzk-autonomous-loop` | rate limit, context 50%, multi-plan continuation |
| `kzk-background-monitoring` | run_in_background, Monitor, long-running, build, install |
| `kzk-spec-and-review` | spec 잡자/작성, plan 작성, spec/plan/design draft, major design, architecture review, codex review, cross-verify, iterative loop, PASS/CONTINUE/HALT gate, brainstorm default ON |
| `kzk-pre-merge-sync` | merge, feature branch, CLAUDE.md sync, deepinit |
| `kzk-production-access` | AWS, SSM, DB, production, credential, destructive, AKIA, ASIA, aws-vault |
| `kzk-test-coverage` | session close, coverage gap, touched files, autonomous + code change auto-TDD, Q-TDD-AUTO-MISSING |
| `kzk-tool-retry` | Edit fail, Write fail, File has not been read yet |
| `kzk-user-queue` | ambiguous decision, user returns, queue review |
| `kzk-web-loop` | web loop, 웹 루프, 자율 개선, loop forever, 무한 개선, 무한 루프, 계속 돌려 |
| `kzk-codebase-survey` | codebase survey, 코드베이스 탐색, deep explore, survey first, before planning, 구현 검증, spec verification, 버그 전수조사, spec 체크, 스펙 체크, 하나하나 확인, ralph로 체크, 상세하게 봐줘, 상세히 봐줘, detailed analysis |
| `kzk-regression-memory` | regression memory, 재발 방지, fix 시작, recall, 과거 fix 조회, gstack learn, dismiss recall |
| `kzk-fix-scope-expansion` | fix scope expansion, 한 callsite, 호출자 전수, fix-start, callsite mismatch, Gate 4.5, KZK_GATE45_SKIP |
| `kzk-freshness-guard` | stale 체크, freshness, 문서 신선도, stale check, freshness guard, Gate 0.5, KZK_GATE05_SKIP |
| `kzk-codex-handoff` | Codex CLI 호출 안정화, stdin pipe, --ephemeral, Preflight, E0-E4 fallback 사다리 |

## harness-share.md

Also installed: `harness-share.md` — a portable workflow guide covering the 10-gate pre-commit flow (Gate 0 / 0.5 / 1 / 1.5 / 1.6 / 2 / 3 / 4 / 4.5 / 5), autonomous mode rules, session tracking, and more. Referenced by the skills as a shared source of truth.

## 작업 유형별 베스트 프랙티스 (한국어)

설치만 해도 18개 kzk-* 스킬이 자동 로드되지만, **어떤 phrase 로 prompt 를 시작하느냐** 에 따라 자동 활성화되는 skill 묶음이 달라집니다. 매칭은 두 경로로:

- **`install/hooks/keyword-detector.mjs`** UserPromptSubmit hook (`install-global.sh --enable-hooks` 후) — 매 prompt 마다 phrase 매칭 → 강제 system-reminder 주입
- **Claude Code 자체 skill discovery** — `~/.claude/skills/kzk-*/SKILL.md` description + body §Triggers 매칭

### 현재 매칭되는 키워드 (9 RULES — keyword-detector.mjs forced injection)

keyword-detector.mjs RULES (forced system-reminder injection via UserPromptSubmit hook):

| RULE | 매칭 phrase 예시 (source: keyword-detector.mjs) | 자동 로드 skill |
|---|---|---|
| **R1 — Large task** | `큰 작업`, `버그 전수조사`, `구현 검증`, `마무리 해줘`, `전수 검토`, `끝내줘`, `large task`, `subagent dispatch`, `3+ file edits`, `200+ LoC`, `5+ file read`, `read-heavy audit`, `spec verification`, `implementation audit`, `사용성 버그`, `사용성 회귀`, `qa scan`, `QA scan`, `여러 plan 으로 쪼개`, `플랜 쪼개`, `plan 쪼개`, `사이클 자율`, `버그들 모두`, `모두 잡아줘`, `리팩토링`, `refactor`, `정리해줘`, `cleanup`, `개선해줘`, `전반적으로`, `통째로`, `scope estimate` | `kzk-large-task-delegation` |
| **R2 — Survey chain** | `codebase survey`, `코드베이스 탐색`, `deep explore`, `survey first`, `before planning`, `구현 확인`, `spec vs implementation`, `spec 체크`, `스펙 체크`, `하나하나 확인`, `ralph로 체크`, `상세하게 봐줘`, `상세하게 봐달라`, `상세히 봐줘`, `상세히 봐달라`, `상세하게 분석`, `detailed analysis` | `kzk-codebase-survey` + `kzk-large-task-delegation` (chain) |
| **R3 — Survey simple** | `코드 서베이`, `코드서베이`, `서베이 해줘`, `서베이해줘`, `code survey`, `코드베이스 서베이`, `코드 survey` | `kzk-codebase-survey` (large-task-delegation 동반 X) |
| **R4 — Fix start** | `fix 시작`, `버그 수정`, `에러 fix`, `regression fix`, `버그 수정 시작` | `kzk-codebase-survey` (fix-start hub — internally lazy-invokes fix-scope-expansion + freshness-guard) |
| **R5 — Spec/plan** | `spec 잡자`, `spec 작성`, `spec draft`, `plan draft`, `plan 작성`, `design draft`, `major design`, `architecture review`, `codex review`, `codex consult`, `cross-verify`, `플랜 만들`, `plan 만들`, `여러 plan`, `플랜 여러개`, `메타 plan`, `meta plan`, `spec 만들` | `kzk-spec-and-review` |
| **R6 — Autonomous mode** | `ralph로 돌려`, `ralph로 체크`, `ralph로 확인`, `자는 동안 진행`, `실행해놔야 queue 보지`, `끝까지 끝내줘`, `autonomous mode`, `자율실행`, `자율 실행`, `자율로 돌려`, `kzk 자율실행`, `kzk 자율 실행` | `kzk-autonomous-boundary` + `kzk-large-task-delegation` + `kzk-autonomous-loop` (3-set) |
| **R7 — Self-improvement** | `harness 개선 루프`, `스킬 개선해줘`, `harness loop`, `자가개선`, `자가개선 루프`, `재발 방지`, `메타 갭` | `kzk-spec-and-review` + `kzk-large-task-delegation` + `kzk-pre-commit-gate` + `kzk-autonomous-loop` (4-set) |
| **R8 — TDD discipline** | `tdd`, `TDD`, `test first`, `테스트 먼저`, `테스트부터`, `failing test`, `red-green`, `테스트 추가`, `테스트 추가해줘`, `test 추가`, `coverage 추가` | `kzk-test-coverage` |
| **R9 — Brainstorm mode** | `어떻게 하면`, `방법 찾자`, `아이디어`, `설계하자`, `브레인스토밍`, `고민해`, `어떤 방향`, `how should we`, `brainstorm`, `let's design` | `kzk-spec-and-review` (Step -1 brainstorming 자동 호출) |

Beyond the 9 RULES above, Claude Code also discovers skills via each `SKILL.md` frontmatter `description` field — phrases like `commit`, `merge`, `Playwright`, `AWS`, `freshness` will surface the corresponding skill via that softer discovery path (no system-reminder injection, but the skill loads when its description matches the conversation). This is why the §6 skill cards list a broader trigger set than the 9 RULES — the chips reflect each skill's `description` triggers, not the keyword-detector's hardcoded list.

(추가 phrase 는 각 skill 본문의 `## Triggers` 섹션 참조 — description Top triggers 는 시스템 리마인더 노출용 부분 집합.)

---

### 작업 유형별 가이드

#### 1. 단순 버그 픽스 (1 파일 / ≤ 30 LoC / 명확한 증상)

- **좋은 prompt**: `"<X> 가 <Y> 로 동작 안 함. 기대: <Z>. 고쳐줘."`
- **자동 로드**: 없음 (메인 직접 처리). 커밋 시 `commit` 발화로 `kzk-pre-commit-gate` 자동 활성.
- **메인 역할**: 직접 read + edit + commit.
- **피하기**: 단일 버그에 `버그 전수조사` / `사용성 버그` 같은 large-task trigger 발화 → over-dispatch.

#### 2. 다중 버그 / 사용성 회귀 sweep (3+ 파일 또는 모호한 증상)

- **좋은 prompt**: `"<영역> 사용성 버그 모두 잡아줘"`, `"버그 전수조사 해줘"`, `"플랜 여러개로 쪼개고 사이클 자율로 돌면서 모두 개선"`
- **자동 로드**:
  - 위 phrase 들은 **R1 (`kzk-large-task-delegation` 만)** 을 keyword-detector 로 forced 주입. `kzk-codebase-survey` 는 description matching 으로 *보조* 로드 (softer path, 보장 X).
  - **R2 chain (둘 다 forced 주입) 보장하려면** prompt 에 R2 phrase 추가: `"... codebase survey 먼저 돌리고"`, `"survey first"`, `"상세하게 봐줘"`, `"하나하나 확인"`. 그래야 keyword-detector 가 `kzk-codebase-survey + kzk-large-task-delegation` 둘 다 inject.
- **메인 역할**: 5+ 파일 직접 read **금지**. EXPLORER subagent (`oh-my-claudecode:explore`) 위임 → 결과 합성 → 메타 plan → executor sonnet 위임 cycle 반복. 메인은 orchestrate + verify + commit 만. (R2 phrase 없이 R1 만 발동 시에도 `kzk-large-task-delegation` 본문이 read-heavy audit dispatch shape 에서 EXPLORER 위임을 강제하므로 메인 직접 read 는 어차피 금지.)
- **자율 모드 결합**: 발화 끝에 `"... 자율로 돌려"` / `"끝까지 끝내줘"` 추가 → R6 발동 → `kzk-autonomous-boundary` + `kzk-large-task-delegation` + `kzk-autonomous-loop` 3개 모두 inject. 시작 전 branch 3-슬롯 contract 확인 강제 + autonomous-boundary §Pre-dispatch survey rule 에 의해 large-task-delegation 직전 `kzk-codebase-survey` 자동 선행 (Q-SURVEY-MISSING halt 가 enforce).

#### 3. 소규모 신기능 (≤ 200 LoC, 1-2 파일, 명확한 spec)

- **좋은 prompt**: `"<기능 설명>. 인수기준: <accept criteria>. 테스트 포함."`
- **자동 로드**: 없음. 메인 직접 진행.
- **TDD 원할 시**: prompt 에 `"TDD 로 진행"` 명시 → `superpowers:test-driven-development` 호출.

#### 4. 중·대형 신기능 (3+ 파일 또는 200+ LoC, ORM / API / DB 영역)

권장 3-phase 시퀀스:

1. **Spec phase** — `"이 기능 spec 잡자: <one-paragraph 설명>"` → `kzk-spec-and-review` 발동
   - Step 0: `kzk-codebase-survey` 자동 선행 (관련 파일 + 외부 라이브러리 docs + TS 타입 contract scan)
   - Step 1-3: planner opus draft → codex CLI 병렬 consult → critic opus → 합성된 frozen spec
2. **Plan phase** — `"plan 작성해줘"` → 같은 skill, plan 단위 한 번 더
3. **Execution phase** — `"ok 이대로 진행"` 또는 `"ralph로 돌려"` → `kzk-large-task-delegation` 발동, `kzk-autonomous-boundary` ASK-FIRST contract 후 executor sonnet dispatch

- **메인 역할**: spec/plan 작성 + executor 결과 review + Pre-commit Gate 0-5 (전체 10-gate 시퀀스) + 최종 commit.

#### 5. 아키텍처 / 설계 결정 / DB schema / 보안

- **좋은 prompt**: `"spec 잡자: <topic>. major design 이라 codex review 필수."`
- **자동 로드**: `kzk-spec-and-review` (codex consult mandatory)
- **모델 / thinking**: opus + xhigh effort (Cycle 29 가이드). plan/critic/verify 모두 opus.
- **메인 역할**: planner opus dispatch + codex 병렬 consult + critic opus + 합성 frozen plan. 코드는 executor 위임.

#### 6. 메커니컬 리팩토링 (Cycle 29 신규 haiku tier)

- **대상**: rename / version bump / config flag toggle / lint follow-up / single-line change × N 파일
- **좋은 prompt**: `"[mechanical] X 를 Y 로 모든 파일에서 rename"`
- **자동 로드**: `kzk-large-task-delegation` (3+ 파일 시)
- **메인 역할**: executor `model: 'haiku'` dispatch — codex consult skip, opus thinking 불필요.
- **체크**: 메인이 inferring 해야 할 부분 (variable name 결정, error 메시지 wording, conditional 분기) 있으면 sonnet 으로 escalate.

#### 7. 구현 검증 / spec audit (read-only)

- **좋은 prompt**: `"<spec file> 제대로 구현됐나 ralph로 체크"`, `"구현 검증해줘"`, `"하나하나 확인"`, `"spec vs implementation 매칭 확인"`
- **자동 로드**: R2 chain (keyword-detector forced) — `kzk-codebase-survey` + `kzk-large-task-delegation`
- **메인 역할**: 절대 직접 read X. EXPLORER subagent 위임 (`oh-my-claudecode:explore`, `model: 'sonnet'` 깊은 read / `'haiku'` 타겟 lookup). CRG MCP / CLI 우선, grep fallback.
- **출력**: `docs/harness/surveys/YYYY-MM-DD-<topic>-verification.md` (verdict file)

#### 8. 자기개선 (harness 룰 변경 / 메타 갭 닫기)

- **좋은 prompt**: `"자가개선 루프 돌려보자"`, `"harness 개선 루프"`, `"재발 방지"`, `"메타 갭 닫자"`
- **자동 로드**: R7 4-set 메타 스택 (keyword-detector forced) — `kzk-spec-and-review` + `kzk-large-task-delegation` + `kzk-pre-commit-gate` + `kzk-autonomous-loop`
- **메인 역할**: spec phase (필요 시 codex skip 명시 + 사유) → executor sonnet/haiku dispatch → 메인 검증 + atomic commit. **자기 자신에게 룰 적용 의무** — 메인이 직접 large-task 실행하면 그 자체가 메타 갭 (Session-28 lesson).

#### 9. 자율 모드 진입 (장시간 / 사용자 부재)

- **좋은 prompt**: `"끝까지 끝내줘"`, `"자는 동안 진행"`, `"ralph로 돌려"`, `"실행해놔야 queue 보지"`
- **자동 로드**: `kzk-autonomous-boundary` 즉시 발동
- **메인 역할 (필수)**: 진입 전 ASK FIRST 3-슬롯 명시 답 받기 — (a) 별 branch vs 직접 commit (b) branch 이름 (c) PR 여부. silent default 금지. 직접 main commit 은 사용자 명시 인가 ("main 직접", "main에 바로 커밋") 시만 허용.
- **rate limit / context 50% / multi-Plan**: `kzk-autonomous-loop` 자동 (`/compact <remaining tasks>` 인자 필수 — 빈 `/compact` 금지, `Q-COMPACT-EVASION` halt 발동 + ScheduleWakeup 5h 윈도우). 대용량 변경 dispatch 전 codebase-survey 없으면 `Q-SURVEY-MISSING` halt.

#### 10. commit / PR / merge

- **좋은 prompt**: `"commit"`, `"PR 올려줘"`, `"merge it"`
- **자동 로드**: `kzk-pre-commit-gate` (Gate 0-5, 전체 10-gate) → `kzk-pre-merge-sync` (PR/milestone 직전 deepinit + CLAUDE.md sync)
- **메인 역할 (Cycle 29 신규 fast path)**: 변경이 doc-only (`*.md`, `docs/**`) 면 Gate 1.5 secrets + verify-install AC2 만, full suite 는 cycle close 1회.
- **doc-only 아닌 일반 commit**: Gate 0 (AGENTS.md sync, hierarchy 있으면) → Gate 0.5 (freshness-guard) → Gate 1 (ai-slop-cleaner) → Gate 1.5 (secrets AKIA/ASIA) → Gate 1.6 (production code-first) → Gate 2 (build) → Gate 3 (test) → Gate 4 (Playwright, UI 변경 시) → Gate 4.5 (fix-scope) → Gate 5 (fresh-agent verifier).

#### 11. production / DB / IAM / credential

- **좋은 prompt**: `"AWS 에 SSM 으로 접속해서 ..."`, `"production DB <X> drop"`, `"이 자격증명으로 production 변경"` (명시 필수)
- **자동 로드**: `kzk-production-access`
- **메인 역할**: 명시-인가 외에는 read-only 호출도 금지 (read-only 도 사용자 명시 요청 필수). Multi-step 시 단계별 OK 사인 (AI propose → user OK → AI 실행 → 결과 보고). STS (`ASIA` prefix, SessionToken 동반) 만 한시 허용. permanent (`AKIA`) 는 사용 거부 + revoke 절차 안내.

#### 12. UI / Playwright Gate 4 / OAuth 로그인

- **자동 로드**: 변경이 `web/src/**/*.{tsx,ts,css}` 포함 시 `kzk-pre-commit-gate` Gate 4 가 `kzk-playwright-verification` 호출 강제
- **dev/prod build trap 주의**: dev 서버 health pre-check 필수 (process alive + log tail error grep). Tailwind v4 `@import` 순서 문제처럼 dev 에서 실패 / prod 에서 통과하는 false-negative 방지.
- **OAuth 막힘 신호**: `"Google 로그인 화면 떴어"`, `"로그인 버튼"`, `"login 화면"` → OAuth click-through protocol 발동
- **OAuth halt 항목 (Q-PW-OAUTH-* 6개)**: `Q-PW-OAUTH-NEW-ACCOUNT` (신규 계정 필요), `Q-PW-OAUTH-MULTI-ACCOUNT` (계정 picker N≥2), `Q-PW-OAUTH-CONSENT-LOOP` (동의 페이지 4회 초과), `Q-PW-OAUTH-STUCK` (30초 무변화), `Q-PW-OAUTH-CHALLENGE` (reCAPTCHA/OTP/passkey), `Q-PW-OAUTH-PROVIDER-ERROR` (provider 측 오류)
- **메인 역할**: 앱 내 "Sign in with Google" 버튼은 메인이 직접 클릭 (사용자 대기 X). Google 계정 picker 까지 cached 계정 자동 클릭. password / MFA prompt 만 halt + user-queue.
- **시각 검수**: 변경 영역 포함 3+ 페이지 navigate + screenshot fullPage + console error 0 확인 + 1-3 문장 narration 의무.

#### 13. 자율 모드 + 대용량 변경 (autonomous + multi-file)

- **좋은 prompt**: `"끝까지 끝내줘"` + `"버그 전수조사"` / `"사용성 회귀 모두 잡아줘"` 조합
- **자동 로드**: `kzk-autonomous-boundary` (3-슬롯 contract 확인) + `kzk-codebase-survey` (pre-dispatch survey 필수) + `kzk-large-task-delegation` (executor sonnet dispatch)
- **메인 역할**:
  1. branch contract 3-슬롯 ASK FIRST (destination / branch name / PR 여부)
  2. EXPLORER subagent 로 `kzk-codebase-survey` 선행 — autonomous 모드에서 multi-file scope 의 large-task dispatch 직전 필수 (survey 없으면 `Q-SURVEY-MISSING` halt)
  3. survey 결과 + frozen plan 포함하여 executor sonnet dispatch
  4. 각 cycle 끝 `kzk-pre-commit-gate` Gate 0-5 + atomic commit
  5. context 50% 도달 시 `/compact <remaining tasks>` 인자 필수 (`Q-COMPACT-EVASION` 방지)
- **피하기**: survey 없이 바로 executor dispatch → `Q-SURVEY-MISSING`. 메인이 5+ 파일 직접 read → `Q-MAIN-DIRECT-EDIT`.

---

### 메타 룰 (모든 작업 공통)

1. **Branch contract** — autonomous 또는 multi-commit 작업 시 시작 전 ASK FIRST 3-슬롯. 사용자 명시 ("main 직접 + no PR" 등) 외엔 새 branch 가 default.
2. **5+ file read = 메인 금지** — 무조건 EXPLORER subagent 위임 (read-heavy audit dispatch shape).
3. **3+ file edit OR 200+ LoC = executor 위임** — 메인은 orchestrate + verify + commit. 직접 실행하면 Session-6/Session-28 anti-pattern.
4. **Session 단위 contract 고정** — scope 가 material 하게 바뀔 때만 재확인 (doc-only → code, single-module → multi-module, low-risk → destructive).
5. **doc-only 빠른 길** — `*.md` / `docs/**` 단독 commit 은 Gate 1.5 + AC2 만, full suite 는 cycle close 1회 (Cycle 29 fast path).
6. **Scope estimation (Cycle 30 신규)** — non-trivial 요청은 `git status` + 디렉토리 scan + CRG 로 30초 추정 → 1-line preamble (`[scope] est. N files / M LoC → <route>`) → 그 라우팅으로 진행. 사용자가 override 안 하면 estimate 따름. 추정 빗나가면 (mid-execution 5+ 파일 read 또는 3+ 파일 edit 진입) 즉시 halt + restart 위임.
7. **TDD sequence (Cycle 30 신규)** — autonomous 모드 또는 large-task dispatch 의 모든 신기능 / 버그픽스: 실패 test 먼저 (red) → impl (green) → refactor → commit. 버그픽스 = 회귀 test 가 first artifact, 없으면 incomplete.
8. **`/compact` 인자 의무 (Cycle 54 신규)** — autonomous 모드 내 context 50% 도달 시 반드시 `/compact <remaining tasks>` 형태로 호출. 인자 없는 빈 `/compact` 는 `Q-COMPACT-EVASION` halt 발동. `<remaining tasks>` 는 아직 완료되지 않은 plan 항목 요약 (1-3 줄).

---

### 모델 / thinking-level 요약 (Cycle 29-30)

| Tier | 사용 |
|---|---|
| **Opus + xhigh** | plan authoring (default), critic on architecture/security, semantic verify, ambiguous spec |
| **Opus + high** | well-scoped plan, mechanical critic (≤200 LoC, no security), pre-spec'd verify |
| **Sonnet** | 일반 implementation (executor), mechanical verify (build/test/screenshot), explorer 깊은 read |
| **Haiku** | version bump, frontmatter rewrite, single-line config, lint follow-up, progress log append, atomic rename, explorer 타겟 lookup, git ops 단순 (status/log/diff/commit -m/fast-forward merge/non-conflict cherry-pick) |

목표 분포: 50% sonnet + 30% haiku + 20% opus. `model` 파라미터 명시 누락 = opus default = 비용 폭증, 절대 금지.

---

### 트리거 갭 (현재 매칭 안 되는 흔한 phrase)

- `"<X> 만들어줘"` (단순 신기능) — 의도된 동작 (단순 작업은 메인 직접)
- `"성능 개선"` / `"perf"` — performance audit trigger 없음 (별도 cycle 후보)
- `"보안 감사"` / `"security review"` — `kzk-production-access` 가 부분 cover (Claude Code description matching), audit 자체 keyword-detector RULE 없음

(닫힌 갭: Cycle 30 — `"테스트 추가"` / `"TDD"` / `"테스트 먼저"` → R8 `kzk-test-coverage`. Cycle 50+ — `"상세하게 봐줘"` / `"상세히 봐줘"` / `"detailed analysis"` → R2 `kzk-codebase-survey`. Cycle 54 — `context 50%` compact 인자 의무 / CRG mandatory / pre-dispatch survey rule → R2/R6 coverage. `"commit"`, `"merge"`, `"AWS"`, `"Playwright"`, `"freshness"` 등 — keyword-detector RULE 없음, Claude Code description matching 으로만 커버.)

위 갭 닫고 싶으면 `"자가개선 루프"` 호출 → `install/hooks/keyword-detector.mjs` RULES 확장 cycle.

---

## License

MIT
