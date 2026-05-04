OpenAI Codex v0.120.0 (research preview)
--------
workdir: /Users/kimzerokim/work/personal/kzk-harness
model: gpt-5.4
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 019df304-a724-7d12-9030-e8904c6bb787
--------
user
Edit-Read-Guard spec 검토. brutally honest, 한국어, no compliments.

## Read

`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/edit-read-guard-spec.md` (~200 lines)

## Context

PreToolUse hook 으로 Edit/Write 호출 시 Read tracker 검증 → 자동 deny. + install-global.sh 의 lib copy 누락 fix (현재 hook ESM resolve fail 발생 중).

## YOUR JOB — 6 카테고리

1. **Acceptance criteria 11개** — Architecture / hook 동작 / install path / test / skill 본문 모두 cover?
2. **Read tracker 동작** — turn-id + JSONL append/grep 으로 같은 turn 안 read 검증. race condition / cross-process 위험?
3. **Bypass mechanism** — `KZK_SKIP_READ_GUARD=1` env var. 한 prompt 만 자동 reset 어떻게? (env 는 process-level — Claude Code session 안에서 reset 메커니즘?)
4. **신규 파일 Write 분기** — `fs.existsSync(file_path)` race? 또는 다른 판정?
5. **Hook 등록 순서** — settings.json `UserPromptSubmit` 의 read-log clear 가 keyword-detector / regression-recall / fix-scope-trigger 보다 *먼저* 실행 보장?
6. **놓친 함정** — spec 단계 lock 안 된 회색지대.

각 항목: 짧은 진단 + 권고. fine "none". 마지막 줄 "Bottom-line: SHIP" 또는 "REVISE".

400단어 이내.

codex
스펙 본문부터 읽고, hook 순서와 우회/경합 가정을 같이 대조하겠습니다. 필요한 경우 현재 리포의 `settings.json`/설치 스크립트도 확인해서 spec 누락 여부만 짚겠습니다.
exec
/bin/zsh -lc "sed -n '1,260p' docs/plans/edit-read-guard-spec.md" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
# Spec — PreToolUse Edit/Write Read-Guard + install lib copy fix

> Date: 2026-05-04. Branch: `feature/edit-read-guard`. Order: post-Plan-E follow-up.
> Author: kimzerokim + Claude (opus). PR 없음, 끝나면 main merge.

## Problem

두 결함 동시 발견:

1. **Hook ESM resolve fail** (즉시 user-visible) — `install-global.sh --regression-recall --fix-scope-trigger` 실행 후 매 prompt 마다 `node:internal/modules/esm/resolve:275` error. 원인: hook 만 copy 되고 의존 lib (`hook-shared.mjs`, `cache-write.mjs`) 누락. `regression-recall.mjs`/`fix-scope-trigger.mjs` 가 `../lib/*` import 하지만 `~/.claude/skills/.kzk-harness-shared/lib/` 에 `sidecar-write.mjs` 만 존재.

2. **Edit-before-Read 메타갭** — 본 세션에서 메인이 5+ 회 "File has not been read yet" 에러. `kzk-tool-retry §Pre-emptive Read protocol` (cycle 32 강화) + `§Default — Re-Read on doubt` (cycle 32) 룰 있어도 메인 self-discipline 안 함. 사용자 명시 — "이거 좀 막아줘" (시스템적 차단).

## Locked decisions

| 결정 | 근거 |
|---|---|
| `install-global.sh enable_hooks()` 가 `install/lib/*.mjs` 전부 copy → `~/.claude/skills/.kzk-harness-shared/lib/` | hook ESM resolve fail 즉시 fix |
| 신규 `install/hooks/edit-read-guard.mjs` (PreToolUse hook) | Edit/Write 호출 시 read tracker 검증 → 자동 deny |
| Read tracker 구현 = `~/.cache/kzk-harness/read-log.jsonl` (또는 `/tmp/kzk-harness-read-log.jsonl`) — UserPromptSubmit + PostToolUse(Read) hook 으로 file:line 기록, PreToolUse(Edit/Write) 가 검증 | Claude Code 의 hook 시스템에서 read 추적 가능. Plain JSONL append. |
| 검증 룰: 같은 turn 안에서 file 의 Read 가 없으면 deny + "Read first" 메시지 | minimal — Edit/Write 차단으로 fail-closed |
| Bypass: 환경변수 `KZK_SKIP_READ_GUARD=1` (한 prompt 만, 자동 reset) | 메인이 정당 사유로 skip 필요 시 (예: 신규 파일 Write — 아직 존재 안 함) |
| Default ENABLED on install (`install-global.sh --enable-hooks` 와 함께 등록, 별 flag 없음 — keyword-detector 와 동급) | 사용자 명시 즉시 적용 |
| 신규 파일 Write (file 존재 안 함) 는 deny 안 함 (Read 의무 없음) | logical exception |
| Branch: `feature/edit-read-guard`, PR 없음, 끝나면 main merge | 사용자 명시 |
| Plan 1개 (작은 scope ~300 LoC) | 사용자 명시 "사이클 한번 더" |

## Non-goals

- 다른 tool (Bash, Glob 등) 차단 — Edit/Write 만
- 사용자 사전 ACK 받기 — 자동 enable
- Read tracker 의 cross-session persistence — 같은 prompt 안에서만 (자율실행 cycle 의 한 턴)
- 에러 메시지 다국어 — 영어만

## Architecture

### Read log format

`~/.cache/kzk-harness/read-log.jsonl` (또는 `${TMPDIR}/kzk-harness-read-log.jsonl`):

```jsonl
{"turn":"<turn-id>","file":"/abs/path","ts":"<ISO>"}
```

- turn-id = UserPromptSubmit hook 발동 시 random uuid 생성, 환경변수 `KZK_TURN_ID` 로 전달
- UserPromptSubmit hook 시작 시 read-log.jsonl 비움 (새 turn)
- PostToolUse(Read) 가 entry append
- PreToolUse(Edit/Write) 가 entry grep — 매칭 안 되면 deny

### PreToolUse hook 동작

```
1. tool_input 에서 file_path 추출 (Edit/Write 모두 file_path 필드)
2. file 이 disk 에 없으면 (신규 Write) → allow
3. read-log.jsonl grep — 같은 turn-id + 같은 file_path 매칭
4. 매칭 0 → deny (메시지: "Read this file first within this turn — kzk-edit-read-guard")
5. 매칭 1+ → allow
6. KZK_SKIP_READ_GUARD=1 → allow (bypass + log)
```

### Install path

`install-global.sh` 의 `enable_hooks()` 끝에 추가:
- `cp install/hooks/edit-read-guard.mjs` → `~/.claude/skills/.kzk-harness-shared/hooks/`
- settings.json 의 `hooks.PreToolUse` 배열에 append (Edit + Write matcher)
- settings.json 의 `hooks.UserPromptSubmit` 에 read-log clear 도 추가
- settings.json 의 `hooks.PostToolUse` 에 Read entry append 도 추가

## Acceptance criteria

1. `install/hooks/edit-read-guard.mjs` 신규
2. `install-global.sh enable_hooks()` 가 `install/lib/*.mjs` 전부 copy
3. `install-global.sh enable_hooks()` 가 `edit-read-guard.mjs` 자동 등록 (`--enable-hooks` 와 함께, 별 flag 없음)
4. settings.json 의 `hooks.PreToolUse` (Edit + Write) + `hooks.UserPromptSubmit` (read-log clear) + `hooks.PostToolUse` (Read entry append) 3 hook 모두 등록
5. `KZK_SKIP_READ_GUARD=1` 환경변수 시 bypass
6. 신규 파일 Write (file 존재 안 함) → allow
7. `install/test/edit-read-guard.test.mjs` 신규 — read 후 edit allow / read 없이 edit deny / 신규 write allow / bypass env / cross-turn deny 5 case
8. `install/test/run-tests.sh` 등록
9. `kzk-tool-retry/SKILL.md` v1.2 → v1.3 — §PreToolUse guard 신규 subsection (메인이 hook 동작 인지)
10. `harness-share.md` §27 (kzk-tool-retry) 끝에 PreToolUse guard cross-ref
11. atomic commit + main merge (kzk-pre-merge-sync 거쳐서)

## Plan 분할

1 plan F (작은 scope). 별도 분할 X.

| Plan | 파일 | 주요 변경 | 예상 LoC |
|---|---|---|---|
| **F** | `docs/plans/plan-F-edit-read-guard.md` | 신규 hook + install lib copy fix + tests + skill 본문 | ~350 |

## Test 전략

- behavioral test: `install/test/edit-read-guard.test.mjs` — mock turn-id + read-log fixture + tool_input 시뮬레이션 → deny/allow 판정 검증
- 한계: 실제 Claude Code session 의 hook 실행 여부는 manual cycle 에서 검증 (다음 session 부터 적용)

## Rollback

| Level | 메커니즘 |
|---|---|
| 단일 plan revert | `git revert <Plan-F-commit-sha>` |
| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=edit-read-guard` |
| Bypass per-prompt | `KZK_SKIP_READ_GUARD=1` |
| settings.json hook 수동 제거 | `jq` patch |

## Codex review 의무

본 spec → codex CLI cycle 1 (stdin path, prompt size cap 적용 — 이 spec 본문 < 500 lines). REVISE 면 1 round answer + frozen.

## 메타 룰

- 사용자 자율실행 mode 진입 (사용자 명시 "사이클 한번 더")
- branch contract: `feature/edit-read-guard`, PR 없음, main merge
- cycle F 끝나면 atomic commit + main merge (kzk-pre-merge-sync 거침)

## Open questions (codex 결정)

1. Read log 위치 — `~/.cache/kzk-harness/` vs `${TMPDIR}/` ?
2. UserPromptSubmit hook 의 read-log clear 가 다른 hook (keyword-detector / regression-recall) 보다 *먼저* 실행돼야 — settings.json hook 순서 보장?
3. 신규 파일 Write 판정 — `fs.existsSync(file_path)` 충분 vs race condition?
4. Bypass 사용 통계 — 매 bypass 시 stderr 로그 추가? (사용 빈도 관찰용)

exec
/bin/zsh -lc "rg -n --hidden --glob '"'!*node_modules*'"' --glob '"'!*.git*'"' \"UserPromptSubmit|PreToolUse|edit-read|read guard|read-log|KZK_SKIP_READ_GUARD|install-global\\.sh|settings\\.json\" ." in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
./CLAUDE.md:69:- **사용자 prompt 가 'plan 쪼개', '사이클 자율', '사용성 버그', '버그 전수조사' 등 large-task signal 포함 시** = `install/hooks/keyword-detector.mjs` (UserPromptSubmit hook, `--enable-hooks` 로 활성화 — 매칭 시 system-reminder 강제 주입)
./harness-flow-progress.md:26:Cycle 33 (2026-05-04 19:30) — [Plan B/C executed + Plan E draft + Codex prompt size cap rule] cycle B (commit 1ba063a) + cycle C (commit 3a57251) executed. cycle B: kzk-fix-scope-expansion (16th skill) + fix-start hook (default DISABLED) + Gate 4.5 + hook-shared lib (D consumer drift 차단) + cache-write lockdir + retroactive D regression-recall 정정 + cross-skill (codebase-survey/pre-commit-gate/pre-merge-sync). cycle B sonnet task 11/15 미완성 → 메인 follow-up patch (install-global.sh `--fix-scope-trigger` flag + skill count 15→16 in install-global.sh). cycle C: kzk-large-task-delegation v1.6→v1.7 §Three-stage review (verifier dispatch + VERDICT 정규식 + thread halt) + kzk-pre-commit-gate v1.3→v1.4 Gate 5 (cache key triple) + kzk-autonomous-boundary v1.2→v1.3 halt 표 (Q-TDD-MAIN/VERIFIER-FAIL/INVALID/DISPATCH-FAIL, reason/action/resume schema) + harness-share §3 Gate 5 + §4 Stage 3 + verifier-routing.test.sh 12 case. 38→39 PASS. **spec rev7→rev8** + **kzk-spec-and-review v2.2→v2.3** (사용자 명시 cycle 33 — codex prompt size cap: prompt < 500 lines, Read 의무 ≤ 4 파일, 카테고리 ≤ 8, 응답 < 700 단어, plan 1500+ LoC 면 핵심 변경부만 발췌 inline. timeout 차단). Plan E draft (8 tasks, 12 AC, ~290 LoC) + codex review REVISE 11 항목 (SoT §17→§2, 권한 모델 reverse, Gate 1.6 grep 허술, IaC vs runtime 이분법, forward-only state semantics, AI access lock, Three-stage review reference, fixture test, rollback 2-3 level, trigger staged path 좁힘). Plan E rev2 background revise. — version bumps: kzk-large-task-delegation 1.6→1.7, kzk-pre-commit-gate 1.3→1.4, kzk-autonomous-boundary 1.2→1.3, kzk-spec-and-review 2.2→2.3 — queue: 0 remaining — PW: n/a — branch contract: feature/memory, no PR, 5 plan 끝나면 main merge — next: Plan E rev2 → frozen → cycle E → main merge (kzk-pre-merge-sync step 3 자동 hook enable)
./harness-flow-progress.md:30:Cycle 28 (2026-05-04 14:50) — [Skill-load chain meta-gap prevention] — 트리거: 사용자 "kzk 로드하고 나머지 수정은 메인에서 직접하는 것 같은데 이게 맞아?" + "재발 방지 개선하는 자기개선루프 돌려보자". gridless 2026-05-04 transcript 분석으로 확정된 패턴: 메인이 `kzk-codebase-survey` + `kzk-autonomous-boundary` 만 로드 → codebase survey EXPLORER 1회 dispatch (정상) → 그 후 11+ 파일 직접 read + SingleSelectPopupEditor.tsx 3 edit + Playwright + docker rebuild **모두 메인에서 실행**. `kzk-large-task-delegation` 미로드 = trigger keyword gap ('사용성 버그', '여러 plan 으로 쪼개', '사이클 자율' 미매칭). 자기 자신에게 적용: 메인 = 오케스트레이션 + 검증 + commit, 실제 6 file edit + 200+ LoC 는 executor sonnet 에 dispatch. (1) **Trigger keyword 확장**: `kzk-large-task-delegation` description 에 12 phrase 추가 ('사용성 버그', '사용성 회귀', 'QA scan', '여러 plan 으로 쪼개', '플랜 여러개로 쪼개', 'plan 쪼개', '사이클 자율', '사이클로 자율', '사이클 돌면서', '버그들 모두', '모두 잡아줘', '모두 개선'). `kzk-spec-and-review` description 에 7 phrase 추가 ('플랜 만들', 'plan 만들', '여러 plan', '플랜 여러개', '메타 plan', 'meta plan', 'spec 만들'). (2) **Hook 활성화**: `install/hooks/keyword-detector.mjs` Cycle 26 inert scaffold (`detect() = []`) → 5 RULES / 50+ trigger phrase 매칭 / `hookSpecificOutput.additionalContext` 형식으로 system-reminder 강제 주입 풀 구현. RULES: large-task / codebase-survey-chain (survey 트리거 시 large-task-delegation 도 강제 로드) / spec-and-review / autonomous-boundary / self-improvement-loop (자가개선 트리거 시 spec-and-review + large-task-delegation + pre-commit-gate + autonomous-loop 4-set 강제 로드). (3) **Session-28 worked example body**: `kzk-large-task-delegation §Session-28 lesson (skill-load chain)` 신규 섹션 — gridless transcript 그대로 + skill-load chain 룰 + Operational checks 1-4 (메인 turn 시작 전 점검: 트리거 phrase / 5+ file read / 3+ file edit / 200+ LoC). (4) **harness-share.md §28** 신규 — Skill-load chain 메타 갭 방지 룰 (survey + delegation 동반 로드 의무 + hook 자동화 + Session-28 anti-pattern 명시). (5) **CLAUDE.md self-trigger reminder** 2 row 추가 — "skill-load chain" + "사용자 prompt large-task signal 시 keyword-detector hook 활성화". (6) **install/test/run-tests.sh 5 unit test 추가** — large-task phrase / Session-28 phrase / multi-skill match / self-improvement chain (4-skill 동시 로드) / null-match continue:true. 29/29 PASS (24 기존 + 5 신규). 회귀 검증: verify-install AC2/3/6/7 4/4 PASS. (가짜 fail 1건: install/test + verify-install 병렬 실행 시 `/tmp/kzk-install-global.lock` race — 의도된 R-PLAN-3 lock guard 작동, 회귀 아님. 메모: install-touching tests 는 sequential 실행 의무.) — version bumps: kzk-large-task-delegation 1.1.2→1.2.0, kzk-spec-and-review 2.0.1→2.1.0 — queue: 0 remaining — PW: n/a — branch contract this session: direct-main, no PR (Cycle 27 contract 동일 scope) — next: 글로벌 install --update 로 ~/.claude/skills/ 동기화 + (옵션) install-global.sh --enable-hooks 로 keyword-detector 활성화
./harness-flow-progress.md:34:Cycle 26 (2026-05-04 21:00) — [Major implementation] Plan Tasks A-G executed via 6 parallel/sequential subagent dispatches. 첫 실제 코드 commit (Cycles 20-25 는 spec/plan/skill markdown only). 진행: (병렬 1차) Task D (sonnet) `dependencies.sh --skip-project` 10 LoC + manual smoke test doc + shellcheck clean / Task C (sonnet) README rewrite (78→107 lines, 글로벌 install 우선 + legacy preserved + bash<(curl) drift 제거) / Task G (sonnet) `install/AGENTS.md` 133 lines + 7 TODO marker. (순차 2차) Task A (sonnet ~9분) `install/install-global.sh` 720 LoC + `lib/claude-md-marker.sh` 78 LoC + `UMBRELLA-README.md` 84 lines + `hooks/keyword-detector.mjs` 41 lines (inert scaffold) + `test/run-tests.sh` 269 lines / 10 tests PASS — mkdir-based lock (macOS flock 미지원 우회), multi-checkout SOURCE_REPO_DIR refusal, OMC keyword-detector collision 비차단 경고. (병렬 3차) Task B (sonnet) `uninstall-global.sh` 397 LoC + 3 uninstall test (OMC byte-equal preserve, marker strip, skill removal) → 15 tests PASS / Task E (opus per critic) `verify-install.sh` 497 LoC + `lib/precedence-probe.sh` 197 LoC + 4 verify test → 19 tests PASS — AC5 critic-corrected stream-json 파이프라인 사용 (`--output-format stream-json --verbose | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Read") | .input.file_path'` + dual FAIL count≥5 OR src/app/lib path), AC1/5/8 claude 미설치 시 SKIP 보호, AC8 probe trap-cleanup 다중 방어. (4차) Task F (sonnet) pre-merge verification 보고서 `docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md` 279 lines — 9 sections (branch state, gate-PASS rendering, AC1-8 coverage, 19 test summary, AGENTS.md drift, manual smoke test, 11 deferred items, PR readiness checklist, rendered footer). 추가: `.gitignore` `AGENTS.md`/`GEMINI.md` → `/AGENTS.md`/`/GEMINI.md` (root-only) — Cycle 19 add 의 의도는 code-review-graph 가 root 에 자동 생성하는 파일 ignore 였지만 패턴이 너무 넓어 의도적 `install/AGENTS.md` 도 ignore 되던 것을 root-anchored 로 좁힘. 모든 shellcheck CLEAN (5 shell files), 19/19 tests PASS, 0 secrets. — version bumps: 없음 (skill 변경 없음, install/ 새 코드 + doc 만) — queue: 0 remaining — PW: n/a — next: 사용자 컨펌 → execute (실제 `~/.claude/skills/kzk-*/`, `~/.claude/CLAUDE.md` 글로벌 변경)
./harness-flow-progress.md:35:Cycle 25 (2026-05-04 19:30) — [Major plan authoring + critic-revise] kzk-harness 글로벌 설치 plan 작성 + frozen. spec frozen 입력 → planner opus draft → 병렬 codex CLI consult + critic opus review → critic-revise pass → frozen. 진행: (Step 1) planner opus draft → `docs/plans/2026-05-04-kzk-global-install.md` (781 lines, 6 tasks A-F + AC1-AC8 verbatim, 5 codex challenge points). (Step 2 codex CLI) `codex exec ... -s read-only --json` 5분 타임아웃 (EXIT=124), 7 agent_message progress 리포트만 받음 — verdict 미생성. (Step 2 critic-opus 병렬) full review → 🟡 REVISE: 1 CRITICAL + 5 MAJOR + 2 MINOR. 핵심 발견: AC5 jq query 깨짐 — `claude -p ... --output-format json` 은 `{type:"result", result:"..."}` 반환, `.messages` 필드 없음 (empirically verified). AC5 verifier 가 silent always-pass 상태 = 사용자 우려한 "main reads code weirdly" 패턴이 그대로 새어나감 = spec 존재 의의 자체. (Step 3 EXECUTOR sonnet revise): (a) AC5 jq → `--output-format stream-json --verbose | jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use" and .name=="Read") | .input.file_path'` + dual FAIL (count ≥ 5 OR src/app/lib 경로 매칭); (b) Task A stub 함수 (`claude_md_extract_block/_strip_block/_inject_block`) 와 미정의 `enable_hooks()` 본문 작성 — atomic awk + mktemp+mv + jq settings.json patch ~50 lines bash; (c) §5 dispatch order "D + A 병렬" → "D 순차 → A" (A의 Step 7 이 D의 `--skip-project` flag 소비, 순서 역전 시 positional arg 처리되어 integration test 깨짐 — `dependencies.sh:14` 실측); (d) `--ac8-attested-by-user "<DATE> probe-attested"` flag 추가 (CI 샌드박스 / fresh machine 에서 AC8 INCONCLUSIVE deadlock 회피, 타이핑 컨펌으로 silent 방지); (e) AC4 cleanup prose → bash trap (`git checkout -- harness-share.md`) 으로 dirty tree 방지; (f) Task G `install/AGENTS.md` seed 추가 (install/ 에 6 새 파일 + 기존 3 파일 = 9 파일 future Gate 0 baseline). 최종 plan 863 lines, status=frozen, ## Frozen 본문에 revision 요약. critic-opus 가 system instruction "Do NOT Write report .md" 로 인해 verdict 를 메시지로만 반환 → EXECUTOR 가 별도 verdict file `docs/research/codex-reviews/kzk-global-install-plan-critic-review.md` (98 lines) 작성. — version bumps: 없음 (plan/verdict 작성, skill 변경 없음) — queue: 0 remaining — PW: n/a — next: feature 브랜치 push + PR 생성 → 사용자 컨펌 → execute (Cycle 26: AC8 probe → Task D → A → B → C → E → F → G)
./harness-flow-progress.md:36:Cycle 24 (2026-05-04 18:35) — [Major spec authoring] kzk-harness 글로벌 설치 마이그레이션 spec 작성 + frozen. 사용자 직접 요청: "kzk 설치 스크립트를 글로벌로 + gstack/superpowers/omc 같은 트리거 메커니즘 + docs/harness 등 진행 문서는 프로젝트 루트 유지." 메타 갭 (kzk-* 가 다른 레포에서 트리거 안 됨) 의 1차 원인 = `~/.claude/skills/kzk-*` 미등록 (Cycle 22 트리거 분석 agent 가 evidence 확정). 진행: (Step 0) codebase survey 두 background agent 병렬 — explore sonnet (트리거 분석, 5 axes) + document-specialist sonnet (gstack/superpowers/omc install 메커니즘 비교). (Step 1) planner opus draft → `docs/superpowers/specs/2026-05-04-kzk-global-install-design.md` (406 lines, 16 sections, 5 codex challenge questions). (Step 2) codex CLI consult `codex exec ... -s read-only --json` 5분 타임아웃 (EXIT=124), 89 jsonl line partial output 만 회수 — verdict 미생성. §Codex execution shape fallback 적용 → `oh-my-claudecode:critic` opus 단독 review. (Step 3) critic opus verdict → `docs/research/codex-reviews/kzk-global-install-critic-review.md` (200 lines, 🟡 REVISE) — 3 must-fix + 3 nice-to-have. EXECUTOR sonnet 적용: (1) §6.1 umbrella `~/.claude/skills/kzk-harness/` → dotfile `~/.claude/skills/.kzk-harness-shared/` (gstack의 umbrella가 SKILL.md를 갖는 것과 다르게 kzk umbrella는 shared assets only이므로 auto-scan 제외); (2) AC8 precedence-probe 추가 (project vs global skill 우선순위는 가정 아닌 실측); (3) §10 self-trigger matrix row 1에 `kzk-codebase-survey (Step 0.5 + 1–8)` 선행 — harness-share.md §26 ordering 반영; (4) AC5 fuzzy prose → `jq` Read-count shell test (≤4 threshold, P0 escalation on ≥5); (5) §7.2 install-global.sh 에 OMC `keyword-detector.mjs` 충돌 감지 step 추가 (ralph trigger 가로챔 경고, non-blocking); (6) §8.2 symlink-mode 역전 — `harness-share.md` 만 symlink, SKILL.md 는 file-copy + 명시적 `--update` 제스처 (WIP feature 브랜치 SKILL.md 가 글로벌로 leak 방지). 최종 spec 413 lines + `## Frozen` heading + frontmatter `status: frozen` + `revision: codex-timeout-critic-opus-fallback-applied`. — version bumps: 없음 (spec 작성, skill 변경 없음) — queue: 0 remaining — PW: n/a — next: plan 작성 (Cycle 25)
./harness-share.md:1016:3. 점검 자동화: `install/hooks/keyword-detector.mjs` UserPromptSubmit hook (`install-global.sh --enable-hooks`). 매칭 시 system-reminder 로 강제 skill-load 명시.
./harness-share.md:1035:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
./harness-share.md:1086:- D plan commit 시점: hook 파일 추가 but settings.json 등록 X
./harness-share.md:1087:- **5 plan (A→D→B→C→E)** 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./harness-share.md:1089:- **fail-closed**: install-global.sh exit non-zero / duplicate entry / jq 부재 → merge block
./harness-share.md:1098:| settings.json 수동 | hook entry 수동 제거 |
./harness-share.md:1101:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./README.md:18:  bash /tmp/kzk-harness/install/install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
./README.md:42:Re-run the install one-liner above (`install-global.sh` is idempotent — version-aware overwrite).
./README.md:46:cd /path/to/kzk-harness && git pull && bash install/install-global.sh --update --enable-hooks --regression-recall --fix-scope-trigger
./README.md:52:bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh
./README.md:106:- **`install/hooks/keyword-detector.mjs`** UserPromptSubmit hook (`install-global.sh --enable-hooks` 후) — 매 prompt 마다 phrase 매칭 → 강제 system-reminder 주입
./install/uninstall-global.sh:29:  printf 'another install-global.sh is running — wait or rm -rf %s\n' "$LOCK_DIR" >&2
./install/uninstall-global.sh:49:Usage: bash install/uninstall-global.sh [flags]
./install/uninstall-global.sh:93:# Source the marker helpers (same as install-global.sh)
./install/uninstall-global.sh:248:  # Remove hook entry from ~/.claude/settings.json if present
./install/uninstall-global.sh:249:  local settings="$HOME/.claude/settings.json"
./install/uninstall-global.sh:255:      if jq 'del(.hooks.UserPromptSubmit[]? | select(.hooks[]?.command? | strings | test("kzk-harness-shared")))' \
./install/uninstall-global.sh:261:      emit "  Removed kzk-harness hook entry from ~/.claude/settings.json"
./install/uninstall-global.sh:262:      record "hooks: UserPromptSubmit entry removed"
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:35:| ?? | `install/install-global.sh` |
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:39:| ?? | `install/uninstall-global.sh` |
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:176:# 2. Verify install-global.sh bootstraps (Task A)
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:177:bash install/install-global.sh --help
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:180:# 3. Verify uninstall-global.sh bootstraps (Task B)
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:181:bash install/uninstall-global.sh --help
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:200:# Expected: "AC8 PASS: project wins (G6 holds, install-global.sh is safe to ship)"
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:214:| F3 | UserPromptSubmit hook keyword matching — `--enable-hooks` scaffold ships but is inert by default (N3); `install/hooks/keyword-detector.mjs` is an empty stub returning `[]` | Future F3 |
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:217:| F6 | `bash <(curl ...)` MITM caveat — `install/UMBRELLA-README.md` notes "for security-sensitive setups, prefer git clone + bash install/install-global.sh" (R-PLAN-7) | Future F-NEW |
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:218:| F7 | Hooks default-OFF — `~/.claude/settings.json` UserPromptSubmit wiring only activates with `--enable-hooks` (N3) | Future F3 |
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:232:- [ ] `bash install/install-global.sh --help` exits 0 and prints usage
./docs/harness/surveys/2026-05-04-kzk-global-install-pre-merge.md:233:- [ ] `bash install/uninstall-global.sh --help` exits 0 and prints usage
./install/AGENTS.md:15:  install-global.sh        # Global install entrypoint (Task A) [TODO]
./install/AGENTS.md:16:  uninstall-global.sh      # Global uninstall entrypoint (Task B) [TODO]
./install/AGENTS.md:25:    keyword-detector.mjs   # N3 opt-in UserPromptSubmit scaffold, default OFF (Task A) [TODO]
./install/AGENTS.md:27:    test_install_global.bats    # 5 tests for install-global.sh (Task A) [TODO]
./install/AGENTS.md:28:    test_uninstall_global.bats  # 3 tests for uninstall-global.sh (Task B) [TODO]
./install/AGENTS.md:39:### `install-global.sh` [TODO — Task A]
./install/AGENTS.md:44:bash install/install-global.sh [flags]
./install/AGENTS.md:56:### `uninstall-global.sh` [TODO — Task B]
./install/AGENTS.md:58:Reverses `install-global.sh`. Idempotent. Delegates to `lib/claude-md-marker.sh`.
./install/AGENTS.md:61:bash install/uninstall-global.sh [--yes] [--purge-project-artifacts <path>]
./install/AGENTS.md:95:| 0 | Project wins — G6 holds, install-global.sh is safe to ship |
./install/verify-install.sh:30:INSTALL_SCRIPT="$REPO_ROOT/install/install-global.sh"
./install/verify-install.sh:81:  2   harness setup error (no install-global.sh, no marker lib)
./install/verify-install.sh:126:    record_fail "$ac" "$cfile not present (run install-global.sh first)"
./install/verify-install.sh:155:    record_fail "$ac" "install-global.sh not found at $INSTALL_SCRIPT"
./install/verify-install.sh:190:    record_fail "$ac" "install-global.sh not found"
./install/verify-install.sh:264:    record_fail "$ac" "install-global.sh not found"
./install/verify-install.sh:267:  local uninstall_script="$REPO_ROOT/install/uninstall-global.sh"
./install/verify-install.sh:269:    record_skip "$ac" "uninstall-global.sh not yet present (Task B in progress)"
./install/verify-install.sh:323:    record_fail "$ac" "install-global.sh not found"
./install/verify-install.sh:334:  HOME="$th" bash "$clone_dir/install/install-global.sh" --yes >/dev/null 2>&1 || {
./install/verify-install.sh:353:    # in install-global.sh prefers higher source.  Use sed to bump in-place.
./install/verify-install.sh:362:    HOME="$th" bash "$clone_dir/install/install-global.sh" --update --yes >/dev/null 2>&1 || {
./install/verify-install.sh:475:    printf 'verify-install.sh: install/install-global.sh not found at %s\n' "$INSTALL_SCRIPT" >&2
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:35:| Claude 진입점 | SKILL.md 자동 스캔 + `~/.claude/CLAUDE.md` 의 `## Skill routing` 섹션 자동 주입 | SessionStart 훅 (`startup`/`clear`/`compact`) → `using-superpowers/SKILL.md` 전체를 시스템 컨텍스트에 주입 | UserPromptSubmit 훅 (`*`) → `keyword-detector.mjs` (ralph/autopilot/ulw/ccg) + `skill-injector.mjs` |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:36:| Hooks 사용 | 없음 | SessionStart 1개 | SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop / PreCompact / SessionEnd 전체 |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:39:| Per-session 비용 | 0 (CLAUDE.md 라우팅만) | SessionStart 마다 SKILL.md 인라인 (~kb 단위) | SessionStart + UserPromptSubmit hook latency 매 prompt |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:41:**Recommendation (research B 가 인용한 결론):** gstack 방식 (git clone → `~/.claude/skills/kzk-harness/` 또는 per-skill dir + `~/.claude/CLAUDE.md` 라우팅 주입) 베이스. UserPromptSubmit keyword hook 은 후속 옵션 (Section 7.5).
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:45:위험: `~/.claude/CLAUDE.md` 충돌 (omc / gstack 라우팅과 공존), UserPromptSubmit hook latency, `~/.claude/skills/` 가 Anthropic 공식 사양이 아닌 관례 경로 (Section 11 risk 항).
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:68:- **N3**: omc 처럼 매 prompt UserPromptSubmit hook 로 키워드 매칭. Section 7.5 에서 옵션으로 두되 default OFF.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:81:| Hook 의존 | X | SessionStart 1 | UserPromptSubmit 등 다수 |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:98:**Decision (final, reversible):** gstack 방식 베이스 + idempotent `~/.claude/CLAUDE.md` 라우팅 섹션 주입. UserPromptSubmit hook 은 Section 7.5 옵션으로만 두되 default OFF.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:222:### 7.1 New entrypoint: `install/install-global.sh`
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:229:$ bash <(curl -sSL https://raw.githubusercontent.com/kimzerokim/kzk-harness/main/install/install-global.sh)
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:235:$ bash /path/to/kzk-harness/install/install-global.sh
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:245:5.5. **OMC UserPromptSubmit collision check.** If `~/.claude/plugins/cache/*/oh-my-claudecode/*/scripts/keyword-detector.mjs` exists, grep its keyword table for any kzk-harness trigger ("ralph", "ralph로 체크", "ralph로 확인"). On match, emit a warning: "OMC keyword-detector intercepts 'ralph' before SKILL.md matching — kzk-autonomous-boundary may not activate via that keyword. Consider adding kzk-specific phrase 'ralph로 체크' as the disambiguator (already in v1.0.12) and confirm by triggering in a fresh session." Do not block install.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:268:2. bash /tmp/kzk-harness/install/install-global.sh
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:282:- `bash ~/.claude/skills/kzk-harness/install/install-global.sh --update` (또는 cd kzk-harness && git pull && 재실행).
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:285:### 7.5 Optional: UserPromptSubmit keyword hook (default OFF)
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:287:omc 패턴 차용한 옵션. `~/.claude/skills/kzk-harness/hooks/keyword-detector.mjs` 에 키워드 매핑. 활성화: `install-global.sh --enable-hooks`.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:291:단점: 매 prompt latency + JS 의존 + omc 의 hook 와 충돌 가능 (둘 다 UserPromptSubmit `*` 매처 등록 시 어느 쪽이 먼저 fire 할지 불확정).
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:301:- **Migration tip in install-global.sh:** 사용자에게 "이미 프로젝트 단위 install 한 레포가 있으면 .claude/skills/kzk-*/ 디렉토리를 삭제해서 글로벌과 충돌 방지 권장" 안내. 강제 삭제 X.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:305:**§8.2 dev mode (kzk-harness contributors only):** Symlink ONLY `harness-share.md` (release-frozen, drift-sensitive). File-copy each `skills/*/SKILL.md` into `~/.claude/skills/kzk-*/SKILL.md` with an explicit `bash install/install-global.sh --update` step. Reason: WIP SKILL.md drafts on `feature/*` branches must NOT leak globally — global skills must reflect a deliberate sync gesture. The author's own Q5 raised this; resolution is invert: shared assets symlink (one source of truth), per-skill files copy (explicit gesture).
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:310:bash ~/.claude/skills/kzk-harness/install/uninstall-global.sh
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:323:| Install (global) | `bash install/install-global.sh` | `~/.claude/skills/kzk-*/` 14개 + `~/.claude/skills/.kzk-harness-shared/` + `~/.claude/CLAUDE.md` 마커 추가 + `dependencies.sh --skip-project` |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:324:| Update (global) | `bash ~/.claude/skills/.kzk-harness-shared/install/install-global.sh --update` | 위와 동일하나 stale skill prompt + version-aware overwrite |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:325:| Symlink dev mode | `bash install/install-global.sh --symlink-mode` (kzk-harness repo 안에서) | `~/.claude/skills/kzk-*` → `<repo>/skills/kzk-*` symlink |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:326:| Uninstall | `bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh` | 마커 + 14개 디렉토리 + umbrella 삭제. 백업 유지. |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:359:| R9 | omc 의 UserPromptSubmit hook 가 kzk routing 마커보다 먼저 매칭 → kzk skill 호출 안 됨 | Section 7.5 의 옵션 hook 도입 시 omc 와 ordering 정책 필요. default OFF 로 일단 회피 |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:367:4. **Q4 — omc / gstack hook 충돌:** Section 11 R3, R9. omc 의 UserPromptSubmit hook 가 kzk trigger keyword 를 먼저 잡아 다른 동작 (예: omc ralph) 을 호출하면 kzk-autonomous-boundary 가 안 깨어남. 이를 install 시 자동 detect 가능한가? 가능하면 install-global.sh 에 경고 필요.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:376:- AC3: install-global.sh 두 번째 실행 = stale 0 + 변경 0 (idempotent). 단 source version 이 달라진 skill 만 overwrite.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:379:- AC6: uninstall-global.sh 후 14개 디렉토리 + 마커 삭제. omc / gstack 의 다른 섹션은 그대로.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:380:- AC7: 새 skill 추가 (예: cycle 25 에서 `kzk-foo` 추가) 시 install-global.sh `--update` 1번 으로 다른 레포 컨텍스트에 자동 반영.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:381:- **AC8 (precedence probe)**: Before merging the install-global.sh implementation, run a precedence probe — install a stub `kzk-precedence-probe/SKILL.md` (with frontmatter trigger `'kzk-precedence-probe-test'` and body `"global wins"`) at `~/.claude/skills/kzk-precedence-probe/`, then write the same skill name with body `"project wins"` at `<some-test-project>/.claude/skills/kzk-precedence-probe/`. In a fresh Claude session inside that test project, type the trigger and observe which body activates. If project wins → G6 holds, proceed. If global wins or merged → spec §8.1 must change before install-global.sh ships.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:387:- F3 (Section 7.5 활성화): UserPromptSubmit keyword hook. trigger 정확도 ↑. omc 와 ordering 정책 필요.
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:397:| D3 | UserPromptSubmit hook default OFF (Section 7.5) | O | `--enable-hooks` 옵션 |
./docs/superpowers/specs/2026-05-04-kzk-global-install-design.md:399:| D5 | Symlink dev mode (Section 8.2) | O | install-global.sh 에서 detect 로직 제거 |
./skills/kzk-fix-scope-expansion/SKILL.md:22:1. **fix-start hook** — UserPromptSubmit 시 fix intent 감지 → callsite 전수 조회 → system-reminder inject
./skills/kzk-fix-scope-expansion/SKILL.md:30:`install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit):
./skills/kzk-fix-scope-expansion/SKILL.md:77:fix-scope-trigger.mjs 는 regression-recall.mjs **다음 슬롯** 에 `UserPromptSubmit` 배열 등록.
./skills/kzk-fix-scope-expansion/SKILL.md:82:`PostToolUse` hook 은 `install-global.sh` 미지원 → 수동 rule:
./skills/kzk-fix-scope-expansion/SKILL.md:125:`fix-scope-trigger.mjs` 는 commit 시점에 `settings.json` 에 등록되지 않음.
./skills/kzk-fix-scope-expansion/SKILL.md:129:bash install/install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
./skills/kzk-fix-scope-expansion/SKILL.md:140:5. **install-global.sh --fix-scope-trigger 실패 (jq 부재)** — `brew install jq` 후 재시도. jq 없는 환경 → stderr WARN.
./skills/kzk-fix-scope-expansion/SKILL.md:141:6. **global install 산출물 cleanup** — `~/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs` 제거 + `~/.claude/settings.json` hook entry 제거. `install-global.sh --disable-fix-scope-trigger` 또는 수동 jq edit.
./install/lib/precedence-probe.sh:185:  printf 'precedence-probe: project SKILL.md wins (G6 holds — install-global.sh safe to ship)\n'
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:582:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:583:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:661:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:679:- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:680:- 5 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:682:- merge 직전에 사용자가 enable 명시 거부 가능 — 거부 시 manual enable path 안내 (uninstall-global.sh 의 reverse 항목)
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:783:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:828:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. **5 plan (A→D→B→C→E) 모두 끝나고 main 머지 시점**에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:832:- Recall = UserPromptSubmit hook → `/learn` keyword search + sidecar dismiss/decay → system-reminder inject
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:842:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject, gstack 미설치 시 stderr WARN + `_warn` reason, orphan cleanup 은 `allLearnKeys` snapshot 기준만. **default DISABLED** (settings.json 등록 안 함)
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:849:9. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency). **idempotent append** (jq 로 중복 entry 검사 후 append). 실패 시 exit non-zero
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:852:12. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). **fail-closed**: 등록 실패 (jq 부재 / duplicate / exit non-zero) → merge block
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:872:- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:983:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1049:- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). 키워드/페이스트 매칭 → `code-review-graph` 우선 (`callers_of`, `imports_of`), fallback `grep -rn`. 결과 list 를 system-reminder inject.
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1057:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1061:6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1085:- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1166:**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1171:2. 직전 Bash tool 결과가 non-zero exit (PreToolUse hook 미지원 → 본 path 는 manual recall — fix-verify hook 이 self-check inject)
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1220:**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1429:docs/plans/plan-B-fix-scope-expansion.md:21:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1457:docs/plans/plan-B-fix-scope-expansion.md:243:- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1486:docs/plans/plan-B-fix-scope-expansion.md:963:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1516:docs/plans/plan-B-fix-scope-expansion.md:1132:**전반 한계**: behavioral test 아님. 룰 *기록* + mock fixture 검증. 실제 사용자 prompt 흐름 (UserPromptSubmit 트리거 + system-reminder inject + subagent dispatch 의 cache read + Gate 4.5 BLOCK behavior) 은 manual cycle 검증 의존. spec rev7 §Test 전략 한계 명시 룰 따름.
./docs/plans/plan-C-fresh-agent-verification-critic-review-raw.md:1544:docs/plans/plan-D-regression-memory.md:1327:**`install/install-global.sh` line 602-609** — 14→15:
./skills/kzk-pre-merge-sync/SKILL.md:55:bash install/install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
./skills/kzk-pre-merge-sync/SKILL.md:62:- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고
./skills/kzk-pre-merge-sync/SKILL.md:65:1. `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` exit code 검사 — non-zero → merge block (`exit 1`)
./skills/kzk-pre-merge-sync/SKILL.md:66:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
./skills/kzk-pre-merge-sync/SKILL.md:97:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
./skills/kzk-tool-retry/SKILL.md:33:- **"not been read yet"**: read-tracker reset between Read and Edit. Resets happen across `UserPromptSubmit`, hook events, session restore, `/compact`, agent dispatch return, and any system-reminder injection. A single user message between Read and Edit can reset the tracker.
./docs/plans/plan-B-fix-scope-expansion-critic-review.md:64:global install 산출물 cleanup 빠짐. settings.json entry 제거, shared hook 파일 제거, auto-enable reversal.
./docs/plans/2026-05-04-kzk-global-install.md:34:- **G3** — Trigger accuracy at gstack/superpowers/omc parity. Achieved by SKILL.md description matching alone (no UserPromptSubmit hook by default — see N3).
./docs/plans/2026-05-04-kzk-global-install.md:43:- **N3** — UserPromptSubmit hook keyword matching. Default OFF; the hook scaffold ships in Task A but stays inert unless the user passes `--enable-hooks`. F3 future work.
./docs/plans/2026-05-04-kzk-global-install.md:53:### Task A — `install/install-global.sh` (the entrypoint)
./docs/plans/2026-05-04-kzk-global-install.md:57:- `install/install-global.sh` (new, executable, `#!/usr/bin/env bash`).
./docs/plans/2026-05-04-kzk-global-install.md:78:#   --uninstall       Reverse Task A (delegates to install/uninstall-global.sh).
./docs/plans/2026-05-04-kzk-global-install.md:86:#                     keyword-detector.mjs scaffold + register UserPromptSubmit
./docs/plans/2026-05-04-kzk-global-install.md:87:#                     in ~/.claude/settings.json. Default OFF (N3). The
./docs/plans/2026-05-04-kzk-global-install.md:89:#                     that wires it into settings.json.
./docs/plans/2026-05-04-kzk-global-install.md:120:  #     "install-global.sh must run from a kzk-harness git checkout".
./docs/plans/2026-05-04-kzk-global-install.md:186:  #   "another install-global.sh is running — wait or rm /tmp/kzk-install-global.lock".
./docs/plans/2026-05-04-kzk-global-install.md:266:  if [ "$DO_UNINSTALL" = 1 ]; then exec bash "$SOURCE_REPO_DIR/install/uninstall-global.sh" "${REMAINING_FLAGS[@]}"; fi
./docs/plans/2026-05-04-kzk-global-install.md:321:# enable_hooks — wire keyword-detector.mjs into ~/.claude/settings.json (N3 opt-in)
./docs/plans/2026-05-04-kzk-global-install.md:327:  local settings="$HOME/.claude/settings.json"
./docs/plans/2026-05-04-kzk-global-install.md:330:    .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/2026-05-04-kzk-global-install.md:337:- `install/install-global.sh` — entrypoint, ~250 lines.
./docs/plans/2026-05-04-kzk-global-install.md:347:   - **Setup**: create a tempdir HOME via `export HOME=$(mktemp -d)`. Run `bash install/install-global.sh --yes`.
./docs/plans/2026-05-04-kzk-global-install.md:360:- `shellcheck install/install-global.sh install/lib/claude-md-marker.sh install/UMBRELLA-README.md install/hooks/keyword-detector.mjs` — wait, shellcheck is shell-only; markdown + JS skip. Apply `shellcheck` to `.sh` files only.
./docs/plans/2026-05-04-kzk-global-install.md:361:- `shfmt -w -i 2 -ci install/install-global.sh install/lib/claude-md-marker.sh` — 2-space indent, switch-case indent.
./docs/plans/2026-05-04-kzk-global-install.md:377:- DO NOT activate the UserPromptSubmit hook unless `--enable-hooks` is explicitly passed (N3).
./docs/plans/2026-05-04-kzk-global-install.md:386:### Task B — `install/uninstall-global.sh`
./docs/plans/2026-05-04-kzk-global-install.md:389:**Files created**: `install/uninstall-global.sh` (new, executable).
./docs/plans/2026-05-04-kzk-global-install.md:415:   - If `--enable-hooks` was previously activated, remove the hook entry from `~/.claude/settings.json` (re-uses helper from Task A).
./docs/plans/2026-05-04-kzk-global-install.md:461:bash /tmp/kzk-harness/install/install-global.sh
./docs/plans/2026-05-04-kzk-global-install.md:481:Re-run the install one-liner above (`install-global.sh` is idempotent — version-aware overwrite).
./docs/plans/2026-05-04-kzk-global-install.md:485:cd /path/to/kzk-harness && git pull && bash install/install-global.sh --update
./docs/plans/2026-05-04-kzk-global-install.md:491:bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh
./docs/plans/2026-05-04-kzk-global-install.md:620:  bash "$repo/install/install-global.sh" --symlink-mode --yes
./docs/plans/2026-05-04-kzk-global-install.md:718:  echo "AC8 PASS: project wins (G6 holds, install-global.sh is safe to ship)"
./docs/plans/2026-05-04-kzk-global-install.md:721:  echo "AC8 FAIL: global wins — spec §8.1 must change before install-global.sh ships"
./docs/plans/2026-05-04-kzk-global-install.md:790:After Tasks A–F, `install/` contains 6 new files (`install-global.sh`, `uninstall-global.sh`, `verify-install.sh`, `lib/claude-md-marker.sh`, `lib/precedence-probe.sh`, `hooks/keyword-detector.mjs` scaffold) plus existing `dependencies.sh`, `dependencies.md`, and `UMBRELLA-README.md`.
./docs/plans/2026-05-04-kzk-global-install.md:795:  - `install-global.sh`: exits 0 (success), 1 (verification fail), 2 (preflight/marker corruption), 3 (user declined prompt).
./docs/plans/2026-05-04-kzk-global-install.md:796:  - `uninstall-global.sh`: exits 0 (success), 2 (marker corruption).
./docs/plans/2026-05-04-kzk-global-install.md:813:- **AC3** — install-global.sh 두 번째 실행 = stale 0 + 변경 0 (idempotent). 단 source version 이 달라진 skill 만 overwrite. **Verifier**: `install/verify-install.sh --ac 3`.
./docs/plans/2026-05-04-kzk-global-install.md:816:- **AC6** — uninstall-global.sh 후 14개 디렉토리 + 마커 삭제. omc / gstack 의 다른 섹션은 그대로. **Verifier**: `install/verify-install.sh --ac 6`.
./docs/plans/2026-05-04-kzk-global-install.md:817:- **AC7** — 새 skill 추가 시 `install-global.sh --update` 1번 으로 다른 레포 컨텍스트에 자동 반영. **Verifier**: `install/verify-install.sh --ac 7`.
./docs/plans/2026-05-04-kzk-global-install.md:818:- **AC8 (precedence probe — gate before merge)** — install a stub `kzk-precedence-probe/SKILL.md` globally + locally with the same name, trigger, observe which body activates. project wins → G6 holds, proceed. global wins or merged → spec §8.1 must change before install-global.sh ships. **INCONCLUSIVE handling**: default halt; user-attested path via `--ac8-attested-by-user "<DATE> probe-attested"` (typed-confirmation prevents silent fallthrough); writes Q-AC8-MANUAL to `docs/harness/user-queue.md`. **Verifier**: `install/lib/precedence-probe.sh`.
./docs/plans/2026-05-04-kzk-global-install.md:828:3. **Task A (`install-global.sh` + `lib/claude-md-marker.sh` + helpers)** — sequential after D.
./docs/plans/2026-05-04-kzk-global-install.md:829:4. **Task B (`uninstall-global.sh`)** — sequential after Task A (depends on `claude-md-marker.sh` helper).
./docs/plans/2026-05-04-kzk-global-install.md:839:R1–R10 from spec §11 carry over verbatim (skill discovery convention, marker corruption, omc/gstack trigger collision, dependencies.sh `--skip-project`, 14-dir clutter, stale per-project skill, symlink dev mode WIP leak, backup accumulation, UserPromptSubmit ordering, multi-machine sync). Plan-specific additions:
./docs/plans/2026-05-04-kzk-global-install.md:848:| R-PLAN-6 | `install-global.sh` invoked over an old install with marker absent because user previously hand-edited CLAUDE.md → exit 2 marker corruption stops install. | Provide `--force-rebuild-marker` flag (additive in Task A) that bypasses the END-marker-missing check. Document as recovery path. |
./docs/plans/2026-05-04-kzk-global-install.md:849:| R-PLAN-7 | `bash <(curl ...)` install path in spec §7.1 is exposed to MITM if the user is on hostile networks — spec author flagged it as the "Public flow" but did not address checksum verification. | NOT in scope for this plan (spec did not include it). Note in `install/UMBRELLA-README.md` troubleshooting: "for security-sensitive setups, prefer git clone + bash `install/install-global.sh`". Future work F-NEW. |
./docs/plans/2026-05-04-kzk-global-install.md:854:2. **OQ2** — Should `install-global.sh` have a `--dry-run` flag that prints all 9 step actions WITHOUT writing? Saves the user from running install + uninstall to test. Decision deferred to executor; plan recommends YES (additive, low risk).
./skills/kzk-regression-memory/SKILL.md:52:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./skills/kzk-regression-memory/SKILL.md:138:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
./skills/kzk-regression-memory/SKILL.md:140:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
./skills/kzk-regression-memory/SKILL.md:142:**fail-closed** (codex #3 답): settings.json 등록 성공 + duplicate UserPromptSubmit append 없음 검증 실패 → merge block (exit non-zero). jq 부재 시 merge block.
./skills/kzk-regression-memory/SKILL.md:144:거부 path: 사용자 confirm 거부 → manual enable 안내 (`uninstall-global.sh` 의 reverse 참고). cycle 진행 자체는 영향 X. PR description 또는 milestone commit message 에 명시 의무.
./skills/kzk-regression-memory/SKILL.md:153:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./skills/kzk-regression-memory/SKILL.md:156:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion.md:17:- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). hook-shared import. CRG 시그니처 = Step 0 확정본 단일. fallback `grep -rn --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`. 결과 list 를 `.kzk-harness/fix-scope-cache.jsonl` 에 append (key=cycle commit SHA, value=callsite list). system-reminder inject. **default DISABLED** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만).
./docs/plans/plan-B-fix-scope-expansion.md:27:4. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. hook-shared.mjs import (자가-skip, fix intent). Step 0 확정 CRG 시그니처 단일 사용 (`--symbol` 제거). grep fallback `--include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`. cache-write.mjs 의 `writeSingleEntryWithLock` 경유 JSONL append. escape 판단 = `process.env.KZK_GATE45_SKIP` (commit body 아님). system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만).
./docs/plans/plan-B-fix-scope-expansion.md:33:10. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, `DO_FIX_SCOPE_TRIGGER=0` default. hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 동일). `--fix-scope-trigger` 도 `--enable-hooks` explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1.
./docs/plans/plan-B-fix-scope-expansion.md:37:14. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — step 3 명령에 `--fix-scope-trigger` 추가: `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger`. checklist 항목도 동일 3-flag 형태로 갱신. **fail-closed**: 등록 실패 → merge block (D 와 동일 정책).
./docs/plans/plan-B-fix-scope-expansion.md:61:- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
./docs/plans/plan-B-fix-scope-expansion.md:230:**default DISABLED**: 이 파일을 settings.json 에 등록하지 않음. `install-global.sh --fix-scope-trigger` 호출 시만 등록.
./docs/plans/plan-B-fix-scope-expansion.md:290:{"type":"crg_response_sample","source":"code-review-graph query --file install/hooks/regression-recall.mjs","callsites":["install/test/fix-scope-trigger.test.mjs:42","install/install-global.sh:88"]}
./docs/plans/plan-B-fix-scope-expansion.md:309:### Task 9 — `install/install-global.sh` 갱신
./docs/plans/plan-B-fix-scope-expansion.md:320:    # jq idempotent append to settings.json (D 의 regression-recall 패턴 동일)
./docs/plans/plan-B-fix-scope-expansion.md:387:  install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
./docs/plans/plan-B-fix-scope-expansion.md:456:PostToolUse hook 은 install-global.sh 미지원 → 수동 rule:
./docs/plans/plan-B-fix-scope-expansion.md:504:- `install/install-global.sh` (--fix-scope-trigger flag)
./docs/plans/plan-B-fix-scope-expansion.md:530:5. **install-global.sh --fix-scope-trigger 실패 (jq 부재)** — jq 설치 후 재시도. 수동 jq 없는 환경 → Python `json.tool` fallback (jq 미설치 WARN 출력 후).
./docs/plans/plan-B-fix-scope-expansion.md:531:6. **[신규] global install 산출물 cleanup** — `~/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs` 제거 + `~/.claude/settings.json` 의 hook entry 제거 + auto-enable reversal: `install-global.sh --disable-fix-scope-trigger` (flag 신규 추가 또는 수동 jq edit 지침). regression-recall 도 함께 비활성화 필요 시 `--disable-regression-recall` 병행.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:42:4. **Recall hook detail** — UserPromptSubmit + 키워드 매칭 + sidecar 적용 + system-reminder inject — sonnet executor 가 ambiguous 없이 구현 가능?
./docs/plans/plan-D-regression-memory-critic-review-raw.md:143:docs/plans/plan-D-regression-memory.md:596:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC 변경)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:207:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:225:- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
./docs/plans/plan-D-regression-memory-critic-review-raw.md:226:- 4 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:228:- merge 직전에 사용자가 enable 명시 거부 가능 — 거부 시 manual enable path 안내 (uninstall-global.sh 의 reverse 항목)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:354:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject. **default DISABLED** (settings.json 등록 안 함)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:359:7. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:362:10. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:380:- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
./docs/plans/plan-D-regression-memory-critic-review-raw.md:478:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-D-regression-memory-critic-review-raw.md:531:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:533:**자동 enable on main 머지**: 4 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:535:거부 path: 사용자 confirm 거부 → manual enable 안내 (`uninstall-global.sh` 의 reverse 참고). cycle 진행 자체는 영향 X.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:544:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:561:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
./docs/plans/plan-D-regression-memory-critic-review-raw.md:567:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:578:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
./docs/plans/plan-D-regression-memory-critic-review-raw.md:584:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:722:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
./docs/plans/plan-D-regression-memory-critic-review-raw.md:833:// 한계: behavioral test (실제 settings.json 통합) 는 manual cycle 검증 의존.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:928:- settings.json 실제 등록은 `enable_hooks` test 가 별도 책임 (Task 8).
./docs/plans/plan-D-regression-memory-critic-review-raw.md:955:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC 변경)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:976:  local settings="$HOME/.claude/settings.json"
./docs/plans/plan-D-regression-memory-critic-review-raw.md:985:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-D-regression-memory-critic-review-raw.md:987:    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
./docs/plans/plan-D-regression-memory-critic-review-raw.md:988:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
./docs/plans/plan-D-regression-memory-critic-review-raw.md:990:    # Plan D: append regression-recall.mjs to UserPromptSubmit array (same matcher)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:994:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1000:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1101:bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1108:- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1205:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1238:- D plan commit 시점: hook 파일 추가 but settings.json 등록 X
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1239:- 4 plan 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1249:| settings.json 수동 | hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1270:**`install/install-global.sh` line 602-609** — 14→15:
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1303:- install/install-global.sh: --regression-recall flag + keyword-detector dependency
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1323:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1326:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1341:| Cycle 자가-회복 불가 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1350:- Behavioral test (sonnet dispatch 시뮬레이션 / hook 실 settings.json 통합 / cycle 끝 gstack add 통합) — spec rev6 Non-goals
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1404:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1464:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1478:/bin/zsh -lc 'rg -n "AGENTS|skill count|15|16|regression-recall|stale|dismiss|orphan|KZK_AUTONOMOUS|KZK_HARNESS_SELF_IMPROVEMENT|UserPromptSubmit|sidecar-only|silent skip|confirm|keyword-detector|atomic|rename|lock|flock|mktemp|writeFileSync|settings.json" docs/plans/regression-memory-and-fix-quality-spec.md docs/plans/plan-D-regression-memory.md' in /Users/kimzerokim/work/personal/kzk-harness
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1485:docs/plans/regression-memory-and-fix-quality-spec.md:30:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1486:docs/plans/regression-memory-and-fix-quality-spec.md:31:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1496:docs/plans/regression-memory-and-fix-quality-spec.md:108:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1502:docs/plans/regression-memory-and-fix-quality-spec.md:126:- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1503:docs/plans/regression-memory-and-fix-quality-spec.md:127:- 4 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1516:docs/plans/regression-memory-and-fix-quality-spec.md:230:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1523:docs/plans/plan-D-regression-memory.md:9:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. 4 plan 모두 끝나고 main 머지 시점에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1525:docs/plans/plan-D-regression-memory.md:13:- Recall = UserPromptSubmit hook → `/learn` keyword search + sidecar dismiss/decay → system-reminder inject
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1527:docs/plans/plan-D-regression-memory.md:20:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject. **default DISABLED** (settings.json 등록 안 함)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1531:docs/plans/plan-D-regression-memory.md:25:7. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1534:docs/plans/plan-D-regression-memory.md:28:10. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1550:docs/plans/plan-D-regression-memory.md:144:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1561:docs/plans/plan-D-regression-memory.md:197:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1562:docs/plans/plan-D-regression-memory.md:199:**자동 enable on main 머지**: 4 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1563:docs/plans/plan-D-regression-memory.md:201:거부 path: 사용자 confirm 거부 → manual enable 안내 (`uninstall-global.sh` 의 reverse 참고). cycle 진행 자체는 영향 X.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1565:docs/plans/plan-D-regression-memory.md:210:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1570:docs/plans/plan-D-regression-memory.md:227:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1571:docs/plans/plan-D-regression-memory.md:233:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1587:docs/plans/plan-D-regression-memory.md:371:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1605:docs/plans/plan-D-regression-memory.md:476:// 한계: behavioral test (실제 settings.json 통합) 는 manual cycle 검증 의존.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1620:docs/plans/plan-D-regression-memory.md:571:- settings.json 실제 등록은 `enable_hooks` test 가 별도 책임 (Task 8).
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1630:docs/plans/plan-D-regression-memory.md:617:  local settings="$HOME/.claude/settings.json"
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1633:docs/plans/plan-D-regression-memory.md:626:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1634:docs/plans/plan-D-regression-memory.md:628:    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1635:docs/plans/plan-D-regression-memory.md:629:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1636:docs/plans/plan-D-regression-memory.md:631:    # Plan D: append regression-recall.mjs to UserPromptSubmit array (same matcher)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1639:docs/plans/plan-D-regression-memory.md:635:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1642:docs/plans/plan-D-regression-memory.md:641:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1653:docs/plans/plan-D-regression-memory.md:742:bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1668:docs/plans/plan-D-regression-memory.md:846:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1674:docs/plans/plan-D-regression-memory.md:879:- D plan commit 시점: hook 파일 추가 but settings.json 등록 X
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1675:docs/plans/plan-D-regression-memory.md:880:- 4 plan 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1678:docs/plans/plan-D-regression-memory.md:890:| settings.json 수동 | hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1686:docs/plans/plan-D-regression-memory.md:911:**`install/install-global.sh` line 602-609** — 14→15:
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1698:docs/plans/plan-D-regression-memory.md:944:- install/install-global.sh: --regression-recall flag + keyword-detector dependency
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1700:docs/plans/plan-D-regression-memory.md:960:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1702:docs/plans/plan-D-regression-memory.md:963:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1706:docs/plans/plan-D-regression-memory.md:978:| Cycle 자가-회복 불가 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1710:docs/plans/plan-D-regression-memory.md:987:- Behavioral test (sonnet dispatch 시뮬레이션 / hook 실 settings.json 통합 / cycle 끝 gstack add 통합) — spec rev6 Non-goals
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1725:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1726:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1750:   144	UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-D-regression-memory-critic-review-raw.md:1779:   233	// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:2026:   742	bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-D-regression-memory-critic-review-raw.md:2033:   749	- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고
./docs/plans/plan-D-regression-memory-critic-review-raw.md:2053:    30	| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:2054:    31	| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/plan-D-regression-memory-critic-review-raw.md:2061:3. **Default DISABLED + 자동 enable** 방향은 맞는데 fail-closed가 아닙니다. `4 plan`이라고 써놓고 실제 순서는 5개입니다(`739`, `751`). 또 `install-global.sh`가 `jq` 부재나 중복 append로 실패해도 merge blocker가 아닙니다. 권고: “5 plans”로 고치고, settings 등록 성공 + duplicate 없음 확인 실패 시 merge block으로 못박으세요.
./docs/plans/plan-D-regression-memory-critic-review-raw.md:2088:3. **Default DISABLED + 자동 enable** 방향은 맞는데 fail-closed가 아닙니다. `4 plan`이라고 써놓고 실제 순서는 5개입니다(`739`, `751`). 또 `install-global.sh`가 `jq` 부재나 중복 append로 실패해도 merge blocker가 아닙니다. 권고: “5 plans”로 고치고, settings 등록 성공 + duplicate 없음 확인 실패 시 merge block으로 못박으세요.
./docs/plans/plan-E-production-code-first-critic-review-raw.md:94:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/plan-E-production-code-first-critic-review-raw.md:95:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/plan-E-production-code-first-critic-review-raw.md:173:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
./docs/plans/plan-E-production-code-first-critic-review-raw.md:191:- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
./docs/plans/plan-E-production-code-first-critic-review-raw.md:192:- 5 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
./docs/plans/plan-E-production-code-first-critic-review-raw.md:194:- merge 직전에 사용자가 enable 명시 거부 가능 — 거부 시 manual enable path 안내 (uninstall-global.sh 의 reverse 항목)
./docs/plans/plan-E-production-code-first-critic-review-raw.md:295:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./install/test/fix-scope-trigger.test.mjs:123:    "install/install-global.sh:88: enable_hooks",
./install/test/fix-scope-trigger.test.mjs:194:    const testValue = ["install/hooks/regression-recall.mjs:42", "install/install-global.sh:88"];
./install/test/fix-scope-trigger.test.mjs:236:  const callsites = ["install/hooks/regression-recall.mjs:42", "install/install-global.sh:88"];
./install/test/fix-scope-trigger.test.mjs:237:  const diffFiles = ["install/hooks/regression-recall.mjs", "install/install-global.sh", "harness-share.md"];
./install/UMBRELLA-README.md:14:| `hooks/keyword-detector.mjs` | N3 opt-in UserPromptSubmit scaffold (inert by default) |
./install/UMBRELLA-README.md:23:bash install/install-global.sh --update
./install/UMBRELLA-README.md:30:bash /tmp/kzk-harness/install/install-global.sh --update --yes
./install/UMBRELLA-README.md:37:bash ~/.claude/skills/.kzk-harness-shared/install/uninstall-global.sh
./install/UMBRELLA-README.md:74:**Security note:** For security-sensitive setups, prefer `git clone + bash install/install-global.sh`
./docs/plans/edit-read-guard-spec.md:1:# Spec — PreToolUse Edit/Write Read-Guard + install lib copy fix
./docs/plans/edit-read-guard-spec.md:3:> Date: 2026-05-04. Branch: `feature/edit-read-guard`. Order: post-Plan-E follow-up.
./docs/plans/edit-read-guard-spec.md:10:1. **Hook ESM resolve fail** (즉시 user-visible) — `install-global.sh --regression-recall --fix-scope-trigger` 실행 후 매 prompt 마다 `node:internal/modules/esm/resolve:275` error. 원인: hook 만 copy 되고 의존 lib (`hook-shared.mjs`, `cache-write.mjs`) 누락. `regression-recall.mjs`/`fix-scope-trigger.mjs` 가 `../lib/*` import 하지만 `~/.claude/skills/.kzk-harness-shared/lib/` 에 `sidecar-write.mjs` 만 존재.
./docs/plans/edit-read-guard-spec.md:18:| `install-global.sh enable_hooks()` 가 `install/lib/*.mjs` 전부 copy → `~/.claude/skills/.kzk-harness-shared/lib/` | hook ESM resolve fail 즉시 fix |
./docs/plans/edit-read-guard-spec.md:19:| 신규 `install/hooks/edit-read-guard.mjs` (PreToolUse hook) | Edit/Write 호출 시 read tracker 검증 → 자동 deny |
./docs/plans/edit-read-guard-spec.md:20:| Read tracker 구현 = `~/.cache/kzk-harness/read-log.jsonl` (또는 `/tmp/kzk-harness-read-log.jsonl`) — UserPromptSubmit + PostToolUse(Read) hook 으로 file:line 기록, PreToolUse(Edit/Write) 가 검증 | Claude Code 의 hook 시스템에서 read 추적 가능. Plain JSONL append. |
./docs/plans/edit-read-guard-spec.md:22:| Bypass: 환경변수 `KZK_SKIP_READ_GUARD=1` (한 prompt 만, 자동 reset) | 메인이 정당 사유로 skip 필요 시 (예: 신규 파일 Write — 아직 존재 안 함) |
./docs/plans/edit-read-guard-spec.md:23:| Default ENABLED on install (`install-global.sh --enable-hooks` 와 함께 등록, 별 flag 없음 — keyword-detector 와 동급) | 사용자 명시 즉시 적용 |
./docs/plans/edit-read-guard-spec.md:25:| Branch: `feature/edit-read-guard`, PR 없음, 끝나면 main merge | 사용자 명시 |
./docs/plans/edit-read-guard-spec.md:39:`~/.cache/kzk-harness/read-log.jsonl` (또는 `${TMPDIR}/kzk-harness-read-log.jsonl`):
./docs/plans/edit-read-guard-spec.md:45:- turn-id = UserPromptSubmit hook 발동 시 random uuid 생성, 환경변수 `KZK_TURN_ID` 로 전달
./docs/plans/edit-read-guard-spec.md:46:- UserPromptSubmit hook 시작 시 read-log.jsonl 비움 (새 turn)
./docs/plans/edit-read-guard-spec.md:48:- PreToolUse(Edit/Write) 가 entry grep — 매칭 안 되면 deny
./docs/plans/edit-read-guard-spec.md:50:### PreToolUse hook 동작
./docs/plans/edit-read-guard-spec.md:55:3. read-log.jsonl grep — 같은 turn-id + 같은 file_path 매칭
./docs/plans/edit-read-guard-spec.md:56:4. 매칭 0 → deny (메시지: "Read this file first within this turn — kzk-edit-read-guard")
./docs/plans/edit-read-guard-spec.md:58:6. KZK_SKIP_READ_GUARD=1 → allow (bypass + log)
./docs/plans/edit-read-guard-spec.md:63:`install-global.sh` 의 `enable_hooks()` 끝에 추가:
./docs/plans/edit-read-guard-spec.md:64:- `cp install/hooks/edit-read-guard.mjs` → `~/.claude/skills/.kzk-harness-shared/hooks/`
./docs/plans/edit-read-guard-spec.md:65:- settings.json 의 `hooks.PreToolUse` 배열에 append (Edit + Write matcher)
./docs/plans/edit-read-guard-spec.md:66:- settings.json 의 `hooks.UserPromptSubmit` 에 read-log clear 도 추가
./docs/plans/edit-read-guard-spec.md:67:- settings.json 의 `hooks.PostToolUse` 에 Read entry append 도 추가
./docs/plans/edit-read-guard-spec.md:71:1. `install/hooks/edit-read-guard.mjs` 신규
./docs/plans/edit-read-guard-spec.md:72:2. `install-global.sh enable_hooks()` 가 `install/lib/*.mjs` 전부 copy
./docs/plans/edit-read-guard-spec.md:73:3. `install-global.sh enable_hooks()` 가 `edit-read-guard.mjs` 자동 등록 (`--enable-hooks` 와 함께, 별 flag 없음)
./docs/plans/edit-read-guard-spec.md:74:4. settings.json 의 `hooks.PreToolUse` (Edit + Write) + `hooks.UserPromptSubmit` (read-log clear) + `hooks.PostToolUse` (Read entry append) 3 hook 모두 등록
./docs/plans/edit-read-guard-spec.md:75:5. `KZK_SKIP_READ_GUARD=1` 환경변수 시 bypass
./docs/plans/edit-read-guard-spec.md:77:7. `install/test/edit-read-guard.test.mjs` 신규 — read 후 edit allow / read 없이 edit deny / 신규 write allow / bypass env / cross-turn deny 5 case
./docs/plans/edit-read-guard-spec.md:79:9. `kzk-tool-retry/SKILL.md` v1.2 → v1.3 — §PreToolUse guard 신규 subsection (메인이 hook 동작 인지)
./docs/plans/edit-read-guard-spec.md:80:10. `harness-share.md` §27 (kzk-tool-retry) 끝에 PreToolUse guard cross-ref
./docs/plans/edit-read-guard-spec.md:89:| **F** | `docs/plans/plan-F-edit-read-guard.md` | 신규 hook + install lib copy fix + tests + skill 본문 | ~350 |
./docs/plans/edit-read-guard-spec.md:93:- behavioral test: `install/test/edit-read-guard.test.mjs` — mock turn-id + read-log fixture + tool_input 시뮬레이션 → deny/allow 판정 검증
./docs/plans/edit-read-guard-spec.md:101:| Hook 즉시 비활성 | `OMC_SKIP_HOOKS=edit-read-guard` |
./docs/plans/edit-read-guard-spec.md:102:| Bypass per-prompt | `KZK_SKIP_READ_GUARD=1` |
./docs/plans/edit-read-guard-spec.md:103:| settings.json hook 수동 제거 | `jq` patch |
./docs/plans/edit-read-guard-spec.md:112:- branch contract: `feature/edit-read-guard`, PR 없음, main merge
./docs/plans/edit-read-guard-spec.md:118:2. UserPromptSubmit hook 의 read-log clear 가 다른 hook (keyword-detector / regression-recall) 보다 *먼저* 실행돼야 — settings.json hook 순서 보장?
./docs/plans/regression-memory-and-fix-quality-spec.md:30:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/regression-memory-and-fix-quality-spec.md:31:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/regression-memory-and-fix-quality-spec.md:110:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
./docs/plans/regression-memory-and-fix-quality-spec.md:128:- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
./docs/plans/regression-memory-and-fix-quality-spec.md:129:- 5 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
./docs/plans/regression-memory-and-fix-quality-spec.md:131:- merge 직전에 사용자가 enable 명시 거부 가능 — 거부 시 manual enable path 안내 (uninstall-global.sh 의 reverse 항목)
./docs/plans/regression-memory-and-fix-quality-spec.md:232:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory-critic-review.md:24:- install-global.sh 가 jq 부재 / 중복 append 로 실패해도 merge block 안 함
./install/hooks/keyword-detector.mjs:2:// keyword-detector.mjs — UserPromptSubmit hook for kzk-harness skill auto-load.
./install/hooks/keyword-detector.mjs:10:// Wired into ~/.claude/settings.json by `install-global.sh --enable-hooks` (N3 opt-in).
./install/hooks/keyword-detector.mjs:113:            hookEventName: "UserPromptSubmit",
./docs/plans/plan-D-regression-memory.md:14:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. **5 plan (A→D→B→C→E) 모두 끝나고 main 머지 시점**에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
./docs/plans/plan-D-regression-memory.md:18:- Recall = UserPromptSubmit hook → `/learn` keyword search + sidecar dismiss/decay → system-reminder inject
./docs/plans/plan-D-regression-memory.md:28:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject, gstack 미설치 시 stderr WARN + `_warn` reason, orphan cleanup 은 `allLearnKeys` snapshot 기준만. **default DISABLED** (settings.json 등록 안 함)
./docs/plans/plan-D-regression-memory.md:35:9. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency). **idempotent append** (jq 로 중복 entry 검사 후 append). 실패 시 exit non-zero
./docs/plans/plan-D-regression-memory.md:38:12. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). **fail-closed**: 등록 실패 (jq 부재 / duplicate / exit non-zero) → merge block
./docs/plans/plan-D-regression-memory.md:58:- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
./docs/plans/plan-D-regression-memory.md:169:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-D-regression-memory.md:255:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
./docs/plans/plan-D-regression-memory.md:257:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
./docs/plans/plan-D-regression-memory.md:259:**fail-closed** (codex #3 답): settings.json 등록 성공 + duplicate UserPromptSubmit append 없음 검증 실패 → merge block (exit non-zero). jq 부재 시 merge block.
./docs/plans/plan-D-regression-memory.md:261:거부 path: 사용자 confirm 거부 → manual enable 안내 (`uninstall-global.sh` 의 reverse 참고). cycle 진행 자체는 영향 X. PR description 또는 milestone commit message 에 명시 의무.
./docs/plans/plan-D-regression-memory.md:270:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory.md:273:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-D-regression-memory.md:354:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
./docs/plans/plan-D-regression-memory.md:360:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-D-regression-memory.md:538:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
./docs/plans/plan-D-regression-memory.md:917:- settings.json 실제 등록은 `enable_hooks` test 가 별도 책임 (Task 9).
./docs/plans/plan-D-regression-memory.md:943:### Task 8 — `install/install-global.sh` `enable_hooks()` 확장 (~70 LoC 변경) — codex #3, #9 답
./docs/plans/plan-D-regression-memory.md:971:  local settings="$HOME/.claude/settings.json"
./docs/plans/plan-D-regression-memory.md:977:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
./docs/plans/plan-D-regression-memory.md:986:  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./docs/plans/plan-D-regression-memory.md:994:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-D-regression-memory.md:996:    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
./docs/plans/plan-D-regression-memory.md:997:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
./docs/plans/plan-D-regression-memory.md:1004:    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./docs/plans/plan-D-regression-memory.md:1011:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-D-regression-memory.md:1127:bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-D-regression-memory.md:1134:- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고
./docs/plans/plan-D-regression-memory.md:1137:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
./docs/plans/plan-D-regression-memory.md:1138:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
./docs/plans/plan-D-regression-memory.md:1161:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
./docs/plans/plan-D-regression-memory.md:1242:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
./docs/plans/plan-D-regression-memory.md:1293:- D plan commit 시점: hook 파일 추가 but settings.json 등록 X
./docs/plans/plan-D-regression-memory.md:1294:- **5 plan (A→D→B→C→E)** 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./docs/plans/plan-D-regression-memory.md:1296:- **fail-closed**: install-global.sh exit non-zero / duplicate entry / jq 부재 → merge block
./docs/plans/plan-D-regression-memory.md:1305:| settings.json 수동 | hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory.md:1308:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-D-regression-memory.md:1327:**`install/install-global.sh` line 602-609** — 14→15:
./docs/plans/plan-D-regression-memory.md:1362:- install/install-global.sh: --regression-recall flag + idempotent append + fail-closed
./docs/plans/plan-D-regression-memory.md:1379:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / normalizeQuery / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
./docs/plans/plan-D-regression-memory.md:1384:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인. fail-closed exit code 는 kzk-pre-merge-sync 에서 검증 |
./docs/plans/plan-D-regression-memory.md:1399:| Cycle 자가-회복 불가 | settings.json hook entry 수동 제거 |
./docs/plans/plan-D-regression-memory.md:1402:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path 호출 — 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json > tmp && mv tmp ~/.claude/settings.json`) |
./docs/plans/plan-D-regression-memory.md:1409:- Behavioral test (sonnet dispatch 시뮬레이션 / hook 실 settings.json 통합 / cycle 끝 gstack add 통합) — spec rev6 Non-goals
./install/test/fixtures/fix-scope-callsites.sample.jsonl:4:{"type":"crg_response_sample","source":"code-review-graph detect-changes --base HEAD~1","callsites":["install/test/fix-scope-trigger.test.mjs:42","install/install-global.sh:88"]}
./install/hooks/fix-scope-trigger.mjs:2:// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
./install/hooks/fix-scope-trigger.mjs:223:      hookEventName: "UserPromptSubmit",
./install/install-global.sh:13:#   --uninstall       Reverse Task A (delegates to install/uninstall-global.sh).
./install/install-global.sh:23:#                     keyword-detector.mjs scaffold + register UserPromptSubmit
./install/install-global.sh:24:#                     in ~/.claude/settings.json. Default OFF (N3). The
./install/install-global.sh:26:#                     that wires it into settings.json.
./install/install-global.sh:45:  printf 'another install-global.sh is running — wait or rm -rf %s\n' "$LOCK_DIR" >&2
./install/install-global.sh:73:Usage: bash install/install-global.sh [flags]
./install/install-global.sh:78:  --uninstall                      Delegate to install/uninstall-global.sh
./install/install-global.sh:81:  --enable-hooks                   Wire keyword-detector.mjs into settings.json (N3)
./install/install-global.sh:177:    emit "install-global.sh must run from a kzk-harness git checkout" >&2
./install/install-global.sh:187:      emit "install-global.sh must run from a kzk-harness git checkout (origin: ${origin_url:-<none>})" >&2
./install/install-global.sh:651:  local settings="$HOME/.claude/settings.json"
./install/install-global.sh:657:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
./install/install-global.sh:666:  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./install/install-global.sh:674:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./install/install-global.sh:676:    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
./install/install-global.sh:677:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
./install/install-global.sh:686:    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./install/install-global.sh:693:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./install/install-global.sh:706:    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./install/install-global.sh:713:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./install/install-global.sh:763:    exec bash "$SOURCE_REPO_DIR/install/uninstall-global.sh" "${REMAINING_FLAGS[@]}"
./docs/research/codex-reviews/kzk-global-install-plan-critic-review.md:19:2. **`bash <(curl ...)` MITM → P1 not P0.** README must publish `git clone + bash install/install-global.sh` only. Spec §7.1 still has the curl-pipe form — drift; document in plan §1.
./docs/research/codex-reviews/kzk-global-install-plan-critic-review.md:28:| A install-global.sh | 🟡 NEEDS-DETAIL | `claude_md_extract_block`/`_strip_block`/`_inject_block` are `{ ... }` stubs; `enable_hooks()` called but not defined |
./docs/research/codex-reviews/kzk-global-install-plan-critic-review.md:29:| B uninstall-global.sh | ✅ READY | inherits A's marker helper |
./docs/research/codex-reviews/kzk-global-install-plan-critic-review.md:70:**M1. `enable_hooks()` called but undefined** (plan line 272 calls `enable_hooks` but no function body; sonnet will fabricate non-atomic settings.json edit).
./docs/research/codex-reviews/edit-read-guard-spec-critic-review-raw.md:17:`/Users/kimzerokim/work/personal/kzk-harness/docs/plans/edit-read-guard-spec.md` (~200 lines)
./docs/research/codex-reviews/edit-read-guard-spec-critic-review-raw.md:21:PreToolUse hook 으로 Edit/Write 호출 시 Read tracker 검증 → 자동 deny. + install-global.sh 의 lib copy 누락 fix (현재 hook ESM resolve fail 발생 중).
./docs/research/codex-reviews/edit-read-guard-spec-critic-review-raw.md:27:3. **Bypass mechanism** — `KZK_SKIP_READ_GUARD=1` env var. 한 prompt 만 자동 reset 어떻게? (env 는 process-level — Claude Code session 안에서 reset 메커니즘?)
./docs/research/codex-reviews/edit-read-guard-spec-critic-review-raw.md:29:5. **Hook 등록 순서** — settings.json `UserPromptSubmit` 의 read-log clear 가 keyword-detector / regression-recall / fix-scope-trigger 보다 *먼저* 실행 보장?
./docs/research/codex-reviews/edit-read-guard-spec-critic-review-raw.md:37:스펙 본문부터 읽고, hook 순서와 우회/경합 가정을 같이 대조하겠습니다. 필요한 경우 현재 리포의 `settings.json`/설치 스크립트도 확인해서 spec 누락 여부만 짚겠습니다.
./install/hooks/regression-recall.mjs:2:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./install/hooks/regression-recall.mjs:146:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
./docs/research/codex-reviews/regression-memory-hypothesis.md:41:이 셋이 PreToolUse / UserPromptSubmit hook 으로 잡힘. Hook 없으면 어떤 backend 든 "기억은 있는데 안 꺼냄" 상태. 이건 가설이 아니라 정리(theorem).
./install/test/run-tests.sh:2:# install/test/run-tests.sh — pure-bash test harness for install-global.sh
./install/test/run-tests.sh:67:# Helper: run install-global.sh with a fresh tempdir HOME
./install/test/run-tests.sh:72:  HOME="$TEST_HOME" bash "$REPO_ROOT/install/install-global.sh" --yes 2>/dev/null
./install/test/run-tests.sh:85:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:106:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:136:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:176:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:188:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:232:  stderr_out=$(HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes 2>&1 >/dev/null)
./install/test/run-tests.sh:252:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:253:  HOME="$test_home" bash "$REPO_ROOT/install/uninstall-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:294:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:295:  HOME="$test_home" bash "$REPO_ROOT/install/uninstall-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:351:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:352:  HOME="$test_home" bash "$REPO_ROOT/install/uninstall-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:400:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:425:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./install/test/run-tests.sh:463:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review-3.md:37:권고: `install-global.sh` 의 `--regression-recall` flag 호출 시 keyword-detector 도 자동 enable. 또는 explicit dependency check.
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:91:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:92:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:169:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:187:- D plan commit 시점에 hook 파일은 추가하지만 settings.json 등록 안 함
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:188:- 4 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:190:- merge 직전에 사용자가 enable 명시 거부 가능 — 거부 시 manual enable path 안내 (uninstall-global.sh 의 reverse 항목)
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:291:| Cycle 자가-회복 불가 시 | settings.json hook entry 수동 제거 |
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:783:# install/test/run-tests.sh — pure-bash test harness for install-global.sh
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:848:# Helper: run install-global.sh with a fresh tempdir HOME
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:853:  HOME="$TEST_HOME" bash "$REPO_ROOT/install/install-global.sh" --yes 2>/dev/null
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:866:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:887:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:917:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:957:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./docs/plans/plan-A-tdd-self-verification-block-critic-review-raw.md:969:  HOME="$test_home" bash "$REPO_ROOT/install/install-global.sh" --yes >/dev/null 2>&1
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:9:- `install/scripts/` 디렉토리 부재 (실제 구조: `install/` 직속 `dependencies.sh`, `install-global.sh`, `hooks/`, `lib/`, `test/`)
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:12:- Hook 등록 메커니즘: `install-global.sh:619-642` `enable_hooks()` 함수가 `~/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs` 를 복사하고 `~/.claude/settings.json` 의 `hooks.UserPromptSubmit` 배열에 jq 로 append. PreToolUse/PostToolUse 등록 path 부재.
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:18:- B 의 Fix-start hook 이 D 의 regression-recall hook 과 같은 UserPromptSubmit 슬롯 → B 가 먼저면 D 가 덮어쓰거나 jq merge 충돌
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:23:- **(a) PreToolUse hook**: settings.json `hooks.PreToolUse` 등록, `Read` 호출 가로채서 path 매칭 시 deny. 가장 확실.
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:29:**Fix-during hook 매 Edit 후 = latency 누적.** 자율 cycle 100회면 ~25분 추가. PostToolUse 발동 메커니즘도 install-global.sh 에 부재. 권고:
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:53:- keyword-detector.mjs 와 같은 UserPromptSubmit 슬롯 공존 룰 무답
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:55:  - `install/install-global.sh` 의 `enable_hooks()` 에 `regression-recall.mjs` wire
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:56:  - 두 hook 을 `harness-shared` dispatcher 로 통합 OR 같은 settings.json UserPromptSubmit 배열에 append (룰: keyword-detector 먼저, regression-recall 다음)
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:78:- 권고: `DISABLE_OMC=kzk-regression-memory` 또는 `OMC_SKIP_HOOKS=regression-recall` 환경변수로 즉시 비활성화 path. settings.json 수정 없이.
./docs/research/codex-reviews/regression-memory-and-fix-quality-spec-critic-review.md:104:7. Hook deployment = install-global.sh `enable_hooks()` 확장 + dispatcher 통합 룰
./docs/research/codex-reviews/kzk-global-install-critic-review.md:41:- **Recommended one-line spec edit**: Section 8.1: "Add AC8: Before merging, run a precedence probe — install a local SKILL.md with `version: 99.0.0` and a global with `version: 1.0.0`, both `name: kzk-test-precedence`, then trigger and inspect which one's content was loaded; if global wins, switch §8.1's strategy to **prefix-based naming** (e.g. global stays `kzk-X`, per-project rename `kzk-X-local`) and add to install-global.sh: warn-and-rename existing `.claude/skills/kzk-*` dirs."
./docs/research/codex-reviews/kzk-global-install-critic-review.md:51:OMC ships UserPromptSubmit hooks (`keyword-detector.mjs`) that fire on every prompt and intercept "ralph", "autopilot", etc. kzk-autonomous-boundary's trigger keywords include "ralph로 체크" / "ralph로 확인" — the **first token "ralph"** matches OMC's keyword detector before kzk's SKILL.md description-based matching gets a chance. The spec's mitigation ("description 명확화") is hand-waving — OMC's hook fires at the runtime layer, SKILL.md description is at the planning layer. They do not race; OMC's hook always wins on bare "ralph".
./docs/research/codex-reviews/kzk-global-install-critic-review.md:55:- **Recommended one-line spec edit**: Section 11 R3: "install-global.sh detects OMC's UserPromptSubmit hook (`~/.claude/plugins/cache/omc/.../hooks/keyword-detector.mjs`); if present, warns the user that `ralph` triggers OMC, recommend the user adopt phrase variants `ralph로 체크` / `ralph로 확인` for kzk-autonomous-boundary."
./docs/research/codex-reviews/kzk-global-install-critic-review.md:79:1. **No concurrency guard**: two `install-global.sh --update` invocations racing (one user, one cron-like ralph cycle) can corrupt the marker block. spec only mitigates via single-process backup — but POSIX file copy is not atomic across the read-modify-write pattern. Add `flock /tmp/kzk-install-global.lock` to install-global.sh.
./docs/research/codex-reviews/kzk-global-install-critic-review.md:94:- **Recommended fix**: Add `uninstall-global.sh --purge-project-artifacts <path>` for the user to opt-in clean specific repos. Default is leave-as-is, with a printed list of "found orphaned artifacts in: <list of $HOME-relative paths>" for user awareness. Also add to `install-global.sh --update`: detect very old `.web-loop/cycle-*-report.md` (mtime > 90 days) and warn.
./docs/research/codex-reviews/kzk-global-install-critic-review.md:126:| AC7 — new skill auto-propagation | ✅ verifiable | Add `skills/kzk-foo/SKILL.md` to source repo, run `install-global.sh --update`, then `ls -1 ~/.claude/skills/kzk-foo/SKILL.md` exits 0. |
./docs/research/codex-reviews/kzk-global-install-critic-review.md:142:3. **R9 / Q4 — OMC `ralph` UserPromptSubmit hook intercepts kzk triggers**. Spec mitigation is hand-waving. install-global.sh must detect OMC's hook and warn. **Confidence: HIGH** (verified OMC pattern via `~/.claude/CLAUDE.md` OMC:START block + UserPromptSubmit hook architecture in OMC plugin cache).
./docs/research/codex-reviews/kzk-global-install-critic-review.md:166:- Refutability check: P1 finding #5 (concurrency) could be refuted with "ralph never runs install-global.sh" — author could fairly push back. Keeping at P1, not P0.
./docs/research/codex-reviews/kzk-global-install-critic-review.md:174:- **P1 #5 (concurrency)**: not confirmed via repro, only theoretical. Downgrade to P2? Real-world: ralph cycles do not run install-global.sh during runtime; user only runs it manually. **Downgraded to P2** — mitigated by: install is not a runtime path in autonomous loops.
./docs/research/codex-reviews/kzk-global-install-critic-review.md:182:- What does superpowers do when its UserPromptSubmit hook interception trips kzk-* trigger keywords? OMC has the `keyword-detector.mjs`, superpowers has SessionStart only — possibly safer.
./docs/research/codex-reviews/kzk-global-install-critic-review.md:197:2. **R3 / Q4** — install-global.sh detects OMC `keyword-detector.mjs` and warns about `ralph` keyword interception.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:24:Plan B = `kzk-fix-scope-expansion` 신규 skill (16th) + fix-start hook (UserPromptSubmit, D 의 recall hook 다음 슬롯) + Gate 4.5 (callsite vs git diff sanity) + cross-skill 변경 5개. ~1167 LoC plan markdown.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:43:7. **Fix-verify hook** — PostToolUse hook? install-global.sh 가 미지원 — manual self-check 룰 명확?
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:66:/bin/zsh -lc 'rg -n "''^#|''^##|''^###|Axis B|acceptance|Task [0-9]+|Gate 4'"\\.5|fix-start|fix-verify|fix-scope|regression-recall|skill count|15|16|rollback|Step 0\\.5|CRG|oracle|grep|atomic|sidecar|UserPromptSubmit|recall hook|FIX_KEYWORDS|SELF_IMPROVE_VERBPHRASES|shouldSkip|detectFixIntent\" docs/plans/regression-memory-and-fix-quality-spec.md docs/plans/plan-B-fix-scope-expansion.md docs/plans/plan-D-regression-memory.md docs/plans/plan-A-tdd-self-verification-block.md" in /Users/kimzerokim/work/personal/kzk-harness
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:74:docs/plans/regression-memory-and-fix-quality-spec.md:30:| Hook deployment = `install-global.sh enable_hooks()` 의 같은 settings.json `UserPromptSubmit` 배열에 append (dispatcher 통합 비추). **`--regression-recall` flag 호출 시 keyword-detector 도 자동 enable (explicit dependency)** | cycle 2 #4 + cycle 3 #4 — keyword-detector 누락 silent breakage 차단 |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:75:docs/plans/regression-memory-and-fix-quality-spec.md:31:| Plan D hook = **default DISABLED at D commit**, **자동 enable on main 머지** (`kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 호출) | cycle 2 #1 + cycle 3 #2 — B cycle 자가오염 차단 + first-enable 망각 방지. 사용자가 머지 단계 거치면 자동 활성. |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:89:docs/plans/regression-memory-and-fix-quality-spec.md:109:- Trigger: UserPromptSubmit. (PostToolUse 미사용 — install-global.sh 가 미지원 + cycle 2 #3)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:92:docs/plans/regression-memory-and-fix-quality-spec.md:128:- 5 plan 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 받은 후)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:202:docs/plans/plan-B-fix-scope-expansion.md:13:- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). 키워드/페이스트 매칭 → `code-review-graph` 우선 (`callers_of`, `imports_of`), fallback `grep -rn`. 결과 list 를 system-reminder inject.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:208:docs/plans/plan-B-fix-scope-expansion.md:21:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:211:docs/plans/plan-B-fix-scope-expansion.md:25:6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:252:docs/plans/plan-B-fix-scope-expansion.md:130:**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:255:docs/plans/plan-B-fix-scope-expansion.md:135:2. 직전 Bash tool 결과가 non-zero exit (PreToolUse hook 미지원 → 본 path 는 manual recall — fix-verify hook 이 self-check inject)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:267:docs/plans/plan-B-fix-scope-expansion.md:184:**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:280:docs/plans/plan-B-fix-scope-expansion.md:223:**B commit 시점**: hook 파일 추가, settings.json 등록 X. `--fix-scope-trigger` flag 호출 안 한 상태.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:281:docs/plans/plan-B-fix-scope-expansion.md:225:**자동 enable on main 머지**: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3 (또는 신규 step 3.5) 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:282:docs/plans/plan-B-fix-scope-expansion.md:227:**fail-closed**: install-global.sh exit non-zero / duplicate UserPromptSubmit append 발견 / jq 부재 → merge block.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:289:docs/plans/plan-B-fix-scope-expansion.md:243:- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:295:docs/plans/plan-B-fix-scope-expansion.md:255:**Pattern**: `regression-recall.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput). FIX_KEYWORDS 와 SELF_IMPROVE_VERBPHRASES 는 `regression-recall.mjs` 에서 import — drift 차단.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:297:docs/plans/plan-B-fix-scope-expansion.md:261:// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:328:docs/plans/plan-B-fix-scope-expansion.md:517:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:369:docs/plans/plan-B-fix-scope-expansion.md:714:- settings.json 실제 등록은 `enable_hooks` test (Task 5) 가 별도 책임.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:391:docs/plans/plan-B-fix-scope-expansion.md:779:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:400:docs/plans/plan-B-fix-scope-expansion.md:806:**변경 3 — settings.json idempotent jq append 블록 추가** (D 의 `regression-recall` 블록 다음):
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:403:docs/plans/plan-B-fix-scope-expansion.md:813:    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:406:docs/plans/plan-B-fix-scope-expansion.md:820:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:436:docs/plans/plan-B-fix-scope-expansion.md:951:- **kzk-fix-scope-expansion** (Plan B): hook path 는 fix-scope-trigger.mjs 가 자동 (UserPromptSubmit 시점), survey 는 EXPLORER subagent path (수동, fix-start 시 보강용). CRG 우선 + grep fallback 패턴은 Step 1 과 동일 룰 — drift 차단 위해 본 skill 의 룰이 source of truth.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:439:docs/plans/plan-B-fix-scope-expansion.md:963:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:448:docs/plans/plan-B-fix-scope-expansion.md:999:- 진입점: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:455:docs/plans/plan-B-fix-scope-expansion.md:1011:- Trigger: PostToolUse hook 가능 시 (test 통과 직후) — install-global.sh PostToolUse 미지원 환경 → manual fallback path (사용자 prompt 의 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook 의 sub-mode)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:464:docs/plans/plan-B-fix-scope-expansion.md:1034:- 5 plan (A→D→B→C→E) 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:486:docs/plans/plan-B-fix-scope-expansion.md:1090:Fix-start hook (UserPromptSubmit, Plan D recall consumer slot):
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:494:docs/plans/plan-B-fix-scope-expansion.md:1106:install/install-global.sh: --fix-scope-trigger flag (D --regression-recall sibling).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:506:docs/plans/plan-B-fix-scope-expansion.md:1132:**전반 한계**: behavioral test 아님. 룰 *기록* + mock fixture 검증. 실제 사용자 prompt 흐름 (UserPromptSubmit 트리거 + system-reminder inject + subagent dispatch 의 cache read + Gate 4.5 BLOCK behavior) 은 manual cycle 검증 의존. spec rev7 §Test 전략 한계 명시 룰 따름.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:520:docs/plans/plan-B-fix-scope-expansion.md:1166:- `Q-PLAN-B-FIX-VERIFY-POSTTOOLUSE` — install-global.sh 가 PostToolUse hook event 지원하는지 Step 0 에서 확인. 미지원 → fix-verify hook 은 manual fallback 만. 지원 → 별도 task 추가 검토 (out of scope, 별 plan).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:527:docs/plans/plan-D-regression-memory.md:14:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. **5 plan (A→D→B→C→E) 모두 끝나고 main 머지 시점**에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:529:docs/plans/plan-D-regression-memory.md:18:- Recall = UserPromptSubmit hook → `/learn` keyword search + sidecar dismiss/decay → system-reminder inject
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:534:docs/plans/plan-D-regression-memory.md:28:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject, gstack 미설치 시 stderr WARN + `_warn` reason, orphan cleanup 은 `allLearnKeys` snapshot 기준만. **default DISABLED** (settings.json 등록 안 함)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:540:docs/plans/plan-D-regression-memory.md:35:9. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency). **idempotent append** (jq 로 중복 entry 검사 후 append). 실패 시 exit non-zero
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:542:docs/plans/plan-D-regression-memory.md:38:12. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). **fail-closed**: 등록 실패 (jq 부재 / duplicate / exit non-zero) → merge block
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:568:docs/plans/plan-D-regression-memory.md:169:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:586:docs/plans/plan-D-regression-memory.md:255:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:587:docs/plans/plan-D-regression-memory.md:257:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:588:docs/plans/plan-D-regression-memory.md:259:**fail-closed** (codex #3 답): settings.json 등록 성공 + duplicate UserPromptSubmit append 없음 검증 실패 → merge block (exit non-zero). jq 부재 시 merge block.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:592:docs/plans/plan-D-regression-memory.md:273:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:618:docs/plans/plan-D-regression-memory.md:354:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:620:docs/plans/plan-D-regression-memory.md:360:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:646:docs/plans/plan-D-regression-memory.md:538:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:704:docs/plans/plan-D-regression-memory.md:917:- settings.json 실제 등록은 `enable_hooks` test 가 별도 책임 (Task 9).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:710:docs/plans/plan-D-regression-memory.md:943:### Task 8 — `install/install-global.sh` `enable_hooks()` 확장 (~70 LoC 변경) — codex #3, #9 답
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:715:docs/plans/plan-D-regression-memory.md:986:  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:716:docs/plans/plan-D-regression-memory.md:994:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:717:docs/plans/plan-D-regression-memory.md:997:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:720:docs/plans/plan-D-regression-memory.md:1004:    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:723:docs/plans/plan-D-regression-memory.md:1011:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:745:docs/plans/plan-D-regression-memory.md:1127:bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:748:docs/plans/plan-D-regression-memory.md:1137:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:749:docs/plans/plan-D-regression-memory.md:1138:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:754:docs/plans/plan-D-regression-memory.md:1161:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:766:docs/plans/plan-D-regression-memory.md:1242:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:779:docs/plans/plan-D-regression-memory.md:1294:- **5 plan (A→D→B→C→E)** 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:783:docs/plans/plan-D-regression-memory.md:1308:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:790:docs/plans/plan-D-regression-memory.md:1327:**`install/install-global.sh` line 602-609** — 14→15:
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:804:docs/plans/plan-D-regression-memory.md:1362:- install/install-global.sh: --regression-recall flag + idempotent append + fail-closed
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:809:docs/plans/plan-D-regression-memory.md:1379:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / normalizeQuery / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:813:docs/plans/plan-D-regression-memory.md:1384:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인. fail-closed exit code 는 kzk-pre-merge-sync 에서 검증 |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:820:docs/plans/plan-D-regression-memory.md:1402:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path 호출 — 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json > tmp && mv tmp ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:849:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:853:6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:877:- `INSTALL_GLOBAL = /Users/kimzerokim/work/personal/kzk-harness/install/install-global.sh`
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:963:**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:968:2. 직전 Bash tool 결과가 non-zero exit (PreToolUse hook 미지원 → 본 path 는 manual recall — fix-verify hook 이 self-check inject)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1017:**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1056:**B commit 시점**: hook 파일 추가, settings.json 등록 X. `--fix-scope-trigger` flag 호출 안 한 상태.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1058:**자동 enable on main 머지**: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3 (또는 신규 step 3.5) 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1060:**fail-closed**: install-global.sh exit non-zero / duplicate UserPromptSubmit append 발견 / jq 부재 → merge block.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1076:- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1088:**Pattern**: `regression-recall.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput). FIX_KEYWORDS 와 SELF_IMPROVE_VERBPHRASES 는 `regression-recall.mjs` 에서 import — drift 차단.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1094:// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1128:779:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1387:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1540:// T9: D recall consumer slot order — settings.json append order
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1541://     (룰 검증만 — 실 install-global.sh 호출은 별 test_install 책임)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1589:- settings.json 실제 등록은 `enable_hooks` test (Task 5) 가 별도 책임.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1654:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1681:**변경 3 — settings.json idempotent jq append 블록 추가** (D 의 `regression-recall` 블록 다음):
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1688:    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1695:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1833:- **kzk-fix-scope-expansion** (Plan B): hook path 는 fix-scope-trigger.mjs 가 자동 (UserPromptSubmit 시점), survey 는 EXPLORER subagent path (수동, fix-start 시 보강용). CRG 우선 + grep fallback 패턴은 Step 1 과 동일 룰 — drift 차단 위해 본 skill 의 룰이 source of truth.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1845:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1881:- 진입점: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1893:- Trigger: PostToolUse hook 가능 시 (test 통과 직후) — install-global.sh PostToolUse 미지원 환경 → manual fallback path (사용자 prompt 의 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook 의 sub-mode)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1915:- B plan commit 시점: hook 파일 추가 but settings.json 등록 X
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1916:- 5 plan (A→D→B→C→E) 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1917:- fail-closed: install-global.sh exit non-zero / duplicate entry / jq 부재 → merge block (D 의 fail-closed 와 sibling)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1972:Fix-start hook (UserPromptSubmit, Plan D recall consumer slot):
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:1988:install/install-global.sh: --fix-scope-trigger flag (D --regression-recall sibling).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2009:| D recall consumer 슬롯 순서 | 룰 *기록* 검증 (settings.json append 순서는 install-global.sh 책임) | 실 hook 실행 순서는 manual cycle 검증 |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2014:**전반 한계**: behavioral test 아님. 룰 *기록* + mock fixture 검증. 실제 사용자 prompt 흐름 (UserPromptSubmit 트리거 + system-reminder inject + subagent dispatch 의 cache read + Gate 4.5 BLOCK behavior) 은 manual cycle 검증 의존. spec rev7 §Test 전략 한계 명시 룰 따름.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2031:- **Fix-verify hook 의 PostToolUse 등록** — install-global.sh 가 PostToolUse 미지원이면 본 plan 은 manual fallback 만. 실 PostToolUse 지원 추가는 별도 plan
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2048:- `Q-PLAN-B-FIX-VERIFY-POSTTOOLUSE` — install-global.sh 가 PostToolUse hook event 지원하는지 Step 0 에서 확인. 미지원 → fix-verify hook 은 manual fallback 만. 지원 → 별도 task 추가 검토 (out of scope, 별 plan).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2147:bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2154:- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2157:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2158:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2181:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2253:**Pattern**: `keyword-detector.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2259:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2736:skills/kzk-regression-memory/SKILL.md:52:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2738:skills/kzk-regression-memory/SKILL.md:138:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2739:skills/kzk-regression-memory/SKILL.md:140:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2742:skills/kzk-regression-memory/SKILL.md:156:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2772:docs/plans/plan-D-regression-memory.md:14:신규 skill `kzk-regression-memory` + recall hook 인프라 구축. AI 자율실행 cycle 이 과거 fix 기록을 fix 시작 시점에 자동 조회 (recall), regression 망각 차단. 본 plan 의 hook 은 **commit 시점에 default DISABLED** — keyword-detector 와의 dependency 충돌 + B/C cycle 자가오염 차단. **5 plan (A→D→B→C→E) 모두 끝나고 main 머지 시점**에 `kzk-pre-merge-sync` 의 마지막 step 으로 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 후) 되어 활성.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2773:docs/plans/plan-D-regression-memory.md:28:2. `install/hooks/regression-recall.mjs` 신규 — UserPromptSubmit hook, 자가-skip guard 구현, /learn search + sidecar JSONL grep + decay + archived 필터링, system-reminder inject, gstack 미설치 시 stderr WARN + `_warn` reason, orphan cleanup 은 `allLearnKeys` snapshot 기준만. **default DISABLED** (settings.json 등록 안 함)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2775:docs/plans/plan-D-regression-memory.md:35:9. `install/install-global.sh` `enable_hooks()` 확장 — `--regression-recall` flag 추가, regression-recall.mjs 등록 + keyword-detector 자동 enable (explicit dependency). **idempotent append** (jq 로 중복 entry 검사 후 append). 실패 시 exit non-zero
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2777:docs/plans/plan-D-regression-memory.md:38:12. `skills/kzk-pre-merge-sync/SKILL.md` 갱신 — 마지막 step `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). **fail-closed**: 등록 실패 (jq 부재 / duplicate / exit non-zero) → merge block
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2784:docs/plans/plan-D-regression-memory.md:169:UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2786:docs/plans/plan-D-regression-memory.md:255:**D commit 시점**: hook 파일은 추가하지만 settings.json 등록 안 함. `--regression-recall` flag 호출 안 한 상태.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2787:docs/plans/plan-D-regression-memory.md:257:**자동 enable on main 머지**: **5 plan (A→D→B→C→E)** 모두 끝나고 `kzk-pre-merge-sync` 의 마지막 step 에서 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트). `--regression-recall` 호출 시 keyword-detector 도 explicit dependency 자동 enable.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2790:docs/plans/plan-D-regression-memory.md:273:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path. 또는 jq 명령: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2793:docs/plans/plan-D-regression-memory.md:360:// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2804:docs/plans/plan-D-regression-memory.md:977:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2806:docs/plans/plan-D-regression-memory.md:997:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2823:docs/plans/plan-D-regression-memory.md:1127:bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2826:docs/plans/plan-D-regression-memory.md:1137:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2827:docs/plans/plan-D-regression-memory.md:1138:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2832:docs/plans/plan-D-regression-memory.md:1161:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2833:docs/plans/plan-D-regression-memory.md:1242:- Trigger: `UserPromptSubmit` hook (`install/hooks/regression-recall.mjs`)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2834:docs/plans/plan-D-regression-memory.md:1294:- **5 plan (A→D→B→C→E)** 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall` 자동 호출 (사용자 confirm 게이트)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2837:docs/plans/plan-D-regression-memory.md:1308:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2842:docs/plans/plan-D-regression-memory.md:1362:- install/install-global.sh: --regression-recall flag + idempotent append + fail-closed
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2844:docs/plans/plan-D-regression-memory.md:1379:| `regression-recall.mjs` exports (shouldSkip / detectFixIntent / normalizeQuery / decay / orphanCleanup / buildReminder) | `regression-recall.test.mjs` unit | 함수 단위 검증만. settings.json 통합은 manual |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2848:docs/plans/plan-D-regression-memory.md:1384:| `install-global.sh --regression-recall` flag | (별도 test 없음 — 본 plan 책임 X) | settings.json 수정은 manual cycle 확인. fail-closed exit code 는 kzk-pre-merge-sync 에서 검증 |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2851:docs/plans/plan-D-regression-memory.md:1402:| **Global install 산출물 cleanup** | `~/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs` + `lib/sidecar-write.mjs` + `bin/kzk-regression-memory.mjs` 제거 + 중복 settings.json `UserPromptSubmit` entry 정리 (`uninstall-global.sh --regression-recall` reverse path 호출 — 또는 jq: `jq '.hooks.UserPromptSubmit \|= map(select(.hooks[0].command \| test("regression-recall") \| not))' ~/.claude/settings.json > tmp && mv tmp ~/.claude/settings.json`) |
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2856:skills/kzk-pre-merge-sync/SKILL.md:55:bash install/install-global.sh --enable-hooks --regression-recall
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2859:skills/kzk-pre-merge-sync/SKILL.md:65:1. `install-global.sh --enable-hooks --regression-recall` exit code 검사 — non-zero → merge block (`exit 1`)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2860:skills/kzk-pre-merge-sync/SKILL.md:66:2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2865:skills/kzk-pre-merge-sync/SKILL.md:96:- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2866:docs/plans/plan-B-fix-scope-expansion.md:13:- **fix-start hook** (`install/hooks/fix-scope-trigger.mjs`) — UserPromptSubmit, Plan D recall hook 다음 슬롯에 등록 (consumer 관계). 키워드/페이스트 매칭 → `code-review-graph` 우선 (`callers_of`, `imports_of`), fallback `grep -rn`. 결과 list 를 system-reminder inject.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2868:docs/plans/plan-B-fix-scope-expansion.md:21:2. `install/hooks/fix-scope-trigger.mjs` 신규 — UserPromptSubmit hook. 자가-skip → fix intent detect (FIX_KEYWORDS reuse from Plan D 구현, **import** from `regression-recall.mjs` to avoid drift) → 심볼 추출 (prompt 의 backtick / camelCase / snake_case / func() 패턴) → CRG `query_graph` 또는 CLI `code-review-graph query/blast-radius` 우선 → grep fallback → result truncation (200 char cap, **D recall reminder size cap 룰과 sibling**) → `.kzk-harness/fix-scope-cache.json` atomic write (via `install/lib/sidecar-write.mjs` 의 `writeAtomic` 재사용) → system-reminder inject. CRG 미설치 시 stderr WARN + `_warn:"crg-not-installed-grep-fallback"`. **default DISABLED at commit** (settings.json 등록은 `--fix-scope-trigger` flag 호출 시만)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2870:docs/plans/plan-B-fix-scope-expansion.md:25:6. `install/install-global.sh` `enable_hooks()` 확장 — `--fix-scope-trigger` flag 추가, default off (`DO_FIX_SCOPE_TRIGGER=0`). hook 파일 copy + idempotent jq append (D 의 `--regression-recall` 패턴 그대로). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency. **fail-closed**: jq 부재 / exit non-zero / duplicate entry → return 1
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2878:docs/plans/plan-B-fix-scope-expansion.md:130:**진입점**: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2881:docs/plans/plan-B-fix-scope-expansion.md:184:**Trigger**: test 통과 직후 (PostToolUse hook 가능 시 — install-global.sh 가 PostToolUse 미지원이면 manual). 본 plan B 는 PostToolUse 등록 *시도* 하되 미지원이면 fallback path: 사용자 prompt 가 "test 통과", "all green", "PR 직전" 매칭 시 UserPromptSubmit hook (fix-scope-trigger 의 sub-mode) 으로 발동.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2883:docs/plans/plan-B-fix-scope-expansion.md:223:**B commit 시점**: hook 파일 추가, settings.json 등록 X. `--fix-scope-trigger` flag 호출 안 한 상태.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2884:docs/plans/plan-B-fix-scope-expansion.md:225:**자동 enable on main 머지**: 5 plan (A→D→B→C→E) 모두 끝나고 `kzk-pre-merge-sync` step 3 (또는 신규 step 3.5) 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2886:docs/plans/plan-B-fix-scope-expansion.md:243:- **kzk-regression-memory** (Plan D): D recall hook 다음 슬롯에서 발동 (consumer). 같은 prompt 에 두 system-reminder slot — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향. fix-scope-cache 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. **순서 의존**: settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs 가 fix-scope-trigger.mjs 보다 앞 — install-global.sh 의 `enable_hooks()` 호출 순서가 sibling append 라 자동 보장 (D 가 먼저 enable, B 가 나중).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2889:docs/plans/plan-B-fix-scope-expansion.md:255:**Pattern**: `regression-recall.mjs` 와 동일한 stdin/stdout 모양 (UserPromptSubmit hookSpecificOutput). FIX_KEYWORDS 와 SELF_IMPROVE_VERBPHRASES 는 `regression-recall.mjs` 에서 import — drift 차단.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2890:docs/plans/plan-B-fix-scope-expansion.md:261:// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2908:docs/plans/plan-B-fix-scope-expansion.md:779:### Task 6 — `install/install-global.sh` `enable_hooks()` 확장 (~50 LoC) — D 의 `--regression-recall` 패턴 그대로
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2915:docs/plans/plan-B-fix-scope-expansion.md:806:**변경 3 — settings.json idempotent jq append 블록 추가** (D 의 `regression-recall` 블록 다음):
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2926:docs/plans/plan-B-fix-scope-expansion.md:951:- **kzk-fix-scope-expansion** (Plan B): hook path 는 fix-scope-trigger.mjs 가 자동 (UserPromptSubmit 시점), survey 는 EXPLORER subagent path (수동, fix-start 시 보강용). CRG 우선 + grep fallback 패턴은 Step 1 과 동일 룰 — drift 차단 위해 본 skill 의 룰이 source of truth.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2927:docs/plans/plan-B-fix-scope-expansion.md:963:- **kzk-fix-scope-expansion** (Plan B): D recall 결과를 consumer 로 read — fix-start hook 이 D 다음 슬롯에 발동 (settings.json `UserPromptSubmit` 배열에서 regression-recall.mjs → fix-scope-trigger.mjs 순). 같은 prompt 의 두 system-reminder 슬롯 — D 가 과거 fix 기억, B 가 현재 fix 의 callsite 영향 list. fix-scope-cache (`.kzk-harness/fix-scope-cache.json`) 가 D recall reminder 와 함께 inject 되는 사용자 prompt context. Pre-commit Gate 4.5 의 cache 입력자.
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2929:docs/plans/plan-B-fix-scope-expansion.md:999:- 진입점: `install/hooks/fix-scope-trigger.mjs` (UserPromptSubmit hook)
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2931:docs/plans/plan-B-fix-scope-expansion.md:1034:- 5 plan (A→D→B→C→E) 끝나고 `kzk-pre-merge-sync` step 3 가 `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` 자동 호출 (사용자 confirm 게이트). `--fix-scope-trigger` 도 `--enable-hooks` 의 explicit dependency
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:2935:docs/plans/plan-B-fix-scope-expansion.md:1106:install/install-global.sh: --fix-scope-trigger flag (D --regression-recall sibling).
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:3034:진단: 얕다. D는 global install 산출물 cleanup까지 있는데 B는 없다. settings.json entry 제거, shared hook 파일 제거, auto-enable reversal이 빠졌다.  
./docs/plans/plan-B-fix-scope-expansion-critic-review-raw.md:3085:진단: 얕다. D는 global install 산출물 cleanup까지 있는데 B는 없다. settings.json entry 제거, shared hook 파일 제거, auto-enable reversal이 빠졌다.  

codex
현재 구현의 `enable_hooks()`와 uninstall/기존 hook append 패턴을 확인하겠습니다. spec이 기존 install 구조와 충돌하는지 보는 단계입니다.
exec
/bin/zsh -lc "rg -n \"enable_hooks\\(|UserPromptSubmit|PostToolUse|PreToolUse|regression-recall|fix-scope-trigger|keyword-detector|cp .*install/lib|hooks\\.\" install/install-global.sh install/uninstall-global.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
install/install-global.sh:23:#                     keyword-detector.mjs scaffold + register UserPromptSubmit
install/install-global.sh:81:  --enable-hooks                   Wire keyword-detector.mjs into settings.json (N3)
install/install-global.sh:82:  --regression-recall              Also wire regression-recall.mjs (implies --enable-hooks)
install/install-global.sh:83:  --fix-scope-trigger              Also wire fix-scope-trigger.mjs (Plan B, implies --enable-hooks)
install/install-global.sh:123:      --regression-recall)
install/install-global.sh:127:      --fix-scope-trigger)
install/install-global.sh:481:# Step 5.5 — OMC keyword-detector collision check
install/install-global.sh:487:  for f in "$pattern"/*/oh-my-claudecode/*/scripts/keyword-detector.mjs; do
install/install-global.sh:491:      printf 'WARNING: OMC keyword-detector intercepts '\''ralph'\'' before SKILL.md matching → kzk-autonomous-boundary may not activate via the bare keyword. Use the disambiguator phrases '\''ralph로 체크'\'' / '\''ralph로 확인'\'' which are already in the SKILL.md description (v1.0.12+). Confirm by triggering in a fresh session.\n' >&2
install/install-global.sh:632:enable_hooks() {
install/install-global.sh:638:  cp "$src/install/hooks/keyword-detector.mjs" \
install/install-global.sh:641:  # Plan D: regression-recall hook + sidecar-write lib + dismiss bin
install/install-global.sh:643:    cp "$src/install/hooks/regression-recall.mjs" \
install/install-global.sh:645:    cp "$src/install/lib/sidecar-write.mjs" \
install/install-global.sh:657:    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
install/install-global.sh:663:  # Idempotent append: keyword-detector
install/install-global.sh:664:  local kd_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs"
install/install-global.sh:666:  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:668:    emit "  hooks: keyword-detector.mjs already registered — skip"
install/install-global.sh:669:    record "hooks: keyword-detector skip (already registered)"
install/install-global.sh:674:      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:676:    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
install/install-global.sh:677:    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
install/install-global.sh:680:  # Plan D: regression-recall idempotent append
install/install-global.sh:682:    cp "$src/install/hooks/regression-recall.mjs" \
install/install-global.sh:684:    local rr_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs"
install/install-global.sh:686:    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:688:      emit "  hooks: regression-recall.mjs already registered — skip"
install/install-global.sh:689:      record "hooks: regression-recall skip (already registered)"
install/install-global.sh:693:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:695:      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
install/install-global.sh:696:      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
install/install-global.sh:700:  # Plan B: fix-scope-trigger idempotent append
install/install-global.sh:702:    cp "$src/install/hooks/fix-scope-trigger.mjs" \
install/install-global.sh:704:    local fst_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs"
install/install-global.sh:706:    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
install/install-global.sh:708:      emit "  hooks: fix-scope-trigger.mjs already registered — skip"
install/install-global.sh:709:      record "hooks: fix-scope-trigger skip (already registered)"
install/install-global.sh:713:        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
install/install-global.sh:715:      emit "  hooks: fix-scope-trigger.mjs registered (--fix-scope-trigger)"
install/install-global.sh:716:      record "hooks: fix-scope-trigger hook registered (--fix-scope-trigger, depends on --enable-hooks)"
install/install-global.sh:789:  # Plan D: --regression-recall 는 --enable-hooks 의 explicit dependency
install/install-global.sh:791:    emit "  --regression-recall implies --enable-hooks (explicit dependency)"
install/install-global.sh:795:  # Plan B: --fix-scope-trigger 는 --enable-hooks 의 explicit dependency
install/install-global.sh:797:    emit "  --fix-scope-trigger implies --enable-hooks (explicit dependency)"
install/uninstall-global.sh:251:    local hook_marker=".kzk-harness-shared/hooks/keyword-detector.mjs"
install/uninstall-global.sh:255:      if jq 'del(.hooks.UserPromptSubmit[]? | select(.hooks[]?.command? | strings | test("kzk-harness-shared")))' \
install/uninstall-global.sh:262:      record "hooks: UserPromptSubmit entry removed"

exec
/bin/zsh -lc "sed -n '1,260p' install/install-global.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
#!/usr/bin/env bash
# kzk-harness global install entrypoint.
# Authoritative spec: docs/superpowers/specs/2026-05-04-kzk-global-install-design.md
# Authoritative plan: docs/plans/2026-05-04-kzk-global-install.md
#
# Flags:
#   --update          Re-sync from the source repo. Same as fresh install
#                     except per-skill version-aware overwrite + harness-share
#                     forced overwrite + marker block replaced.
#   --probe           Run the AC8 precedence probe (see Task E).
#                     Exits 0 if project-wins (G6 holds), 1 if global-wins
#                     (BREAKS spec §8.1 — must abort install).
#   --uninstall       Reverse Task A (delegates to install/uninstall-global.sh).
#   --symlink-mode    §8.2 dev mode: file-copy SKILL.md (frozen-to-main),
#                     symlink ONLY harness-share.md from <repo>/harness-share.md
#                     to ~/.claude/skills/.kzk-harness-shared/harness-share.md.
#                     Refuses to run unless invoked from a kzk-harness git repo
#                     (test: git config --get remote.origin.url matches
#                     /(github.com[/:]kimzerokim\/kzk-harness)/).
#   --symlink-mode-force
#                     Skip the multi-checkout refusal check for --symlink-mode.
#   --enable-hooks    Install ~/.claude/skills/.kzk-harness-shared/hooks/
#                     keyword-detector.mjs scaffold + register UserPromptSubmit
#                     in ~/.claude/settings.json. Default OFF (N3). The
#                     scaffold file ships always; this flag is the only thing
#                     that wires it into settings.json.
#   --yes             Skip the "preview marker replacement, proceed?" prompt
#                     (still emits the diff to stdout). Ralph cycles use this.
#   --ac8-attested-by-user "<DATE> probe-attested"
#                     Manual attestation when AC8 cannot run (CI sandbox /
#                     claude not in PATH). Writes Q-AC8-MANUAL to
#                     docs/harness/user-queue.md and proceeds. Requires
#                     literal date-string match (prevents silent fallthrough).
#   -h | --help       Print usage and exit 0.
set -u
set -o pipefail
umask 077

# ---------------------------------------------------------------------------
# Lock guard (R-PLAN-3): prevent concurrent installs corrupting CLAUDE.md
# Uses mkdir-based locking (atomic on macOS + Linux; no util-linux flock needed)
# ---------------------------------------------------------------------------
LOCK_DIR=/tmp/kzk-install-global.lock
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  printf 'another install-global.sh is running — wait or rm -rf %s\n' "$LOCK_DIR" >&2
  exit 2
fi
trap 'rm -rf "$LOCK_DIR"' EXIT

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
DO_PROBE=0
DO_UNINSTALL=0
DO_UPDATE=0
SYMLINK_MODE=0
SYMLINK_MODE_FORCE=0
ENABLE_HOOKS=0
DO_REGRESSION_RECALL=0
AUTO_YES=0
AC8_ATTESTED=""
SOURCE_REPO_DIR=""
BACKUP_PATH=""
SUMMARY=()

emit() { printf '%s\n' "$*"; }
record() { SUMMARY+=("$1"); }

usage() {
  cat <<'USAGE'
kzk-harness global install

Usage: bash install/install-global.sh [flags]

Flags:
  --update                         Re-sync skills + umbrella + CLAUDE.md marker
  --probe                          Run AC8 precedence probe only
  --uninstall                      Delegate to install/uninstall-global.sh
  --symlink-mode                   Dev mode: symlink harness-share.md only
  --symlink-mode-force             Skip multi-checkout refusal for --symlink-mode
  --enable-hooks                   Wire keyword-detector.mjs into settings.json (N3)
  --regression-recall              Also wire regression-recall.mjs (implies --enable-hooks)
  --fix-scope-trigger              Also wire fix-scope-trigger.mjs (Plan B, implies --enable-hooks)
  --yes                            Skip interactive marker-replace prompt
  --ac8-attested-by-user "<DATE>"  Manual AC8 attestation (CI / no claude CLI)
  -h, --help                       Show this help

Exit codes: 0=success 1=verify-fail 2=preflight/marker-corruption 3=user-aborted 4=symlink-mode-multi-checkout
USAGE
}

# ---------------------------------------------------------------------------
# parse_flags
# ---------------------------------------------------------------------------
REMAINING_FLAGS=()
parse_flags() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --update)
        DO_UPDATE=1
        shift
        ;;
      --probe)
        DO_PROBE=1
        shift
        ;;
      --uninstall)
        DO_UNINSTALL=1
        shift
        ;;
      --symlink-mode)
        SYMLINK_MODE=1
        shift
        ;;
      --symlink-mode-force)
        SYMLINK_MODE_FORCE=1
        shift
        ;;
      --enable-hooks)
        ENABLE_HOOKS=1
        shift
        ;;
      --regression-recall)
        DO_REGRESSION_RECALL=1
        shift
        ;;
      --fix-scope-trigger)
        DO_FIX_SCOPE_TRIGGER=1
        shift
        ;;
      --yes)
        AUTO_YES=1
        shift
        ;;
      --ac8-attested-by-user)
        shift
        AC8_ATTESTED="${1:-}"
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        REMAINING_FLAGS+=("$1")
        shift
        ;;
    esac
  done
}

# ---------------------------------------------------------------------------
# run_precedence_probe — delegates to lib/precedence-probe.sh when it exists
# ---------------------------------------------------------------------------
run_precedence_probe() {
  local probe_script="${SOURCE_REPO_DIR}/install/lib/precedence-probe.sh"
  if [ -f "$probe_script" ]; then
    bash "$probe_script"
    return $?
  else
    emit "AC8 probe script not found at $probe_script — run Task E first." >&2
    return 2
  fi
}

# ---------------------------------------------------------------------------
# Step 1 — Pre-flight
# ---------------------------------------------------------------------------
preflight() {
  # Detect SOURCE_REPO_DIR from the script's own location
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local git_top
  git_top="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || true)"

  if [ -z "$git_top" ]; then
    emit "install-global.sh must run from a kzk-harness git checkout" >&2
    exit 1
  fi

  # Verify it is actually a kzk-harness repo
  local origin_url
  origin_url="$(git -C "$git_top" config --get remote.origin.url 2>/dev/null || true)"
  if ! printf '%s\n' "$origin_url" | grep -qE '(github\.com[/:]kimzerokim/kzk-harness)'; then
    # Also accept local-only repos that have a skills/kzk-* dir (for test harness)
    if [ ! -d "$git_top/skills/kzk-pre-commit-gate" ]; then
      emit "install-global.sh must run from a kzk-harness git checkout (origin: ${origin_url:-<none>})" >&2
      exit 1
    fi
  fi

  SOURCE_REPO_DIR="$git_top"

  # Symlink-mode multi-checkout guard (R-PLAN-4)
  if [ "$SYMLINK_MODE" -eq 1 ] && [ "$SYMLINK_MODE_FORCE" -eq 0 ]; then
    local checkout_count
    checkout_count=$(find "$HOME" -maxdepth 6 -type d -name .git \
      -path '*/kzk-harness/.git' 2>/dev/null | wc -l | tr -d ' ')
    if [ "${checkout_count:-0}" -gt 1 ]; then
      emit "ERROR: $checkout_count kzk-harness checkouts found. --symlink-mode refused (ambiguous source)." >&2
      emit "Use --symlink-mode-force to override, or remove extra checkouts." >&2
      exit 4
    fi
  fi

  # Ensure ~/.claude/skills/ exists
  mkdir -p "$HOME/.claude/skills"
  chmod 700 "$HOME/.claude/skills" 2>/dev/null || true

  # Touch CLAUDE.md if missing
  if [ ! -f "$HOME/.claude/CLAUDE.md" ]; then
    touch "$HOME/.claude/CLAUDE.md"
    chmod 600 "$HOME/.claude/CLAUDE.md" 2>/dev/null || true
    emit "Created empty ~/.claude/CLAUDE.md"
  fi

  # Verify CLAUDE.md is writable
  if [ ! -w "$HOME/.claude/CLAUDE.md" ]; then
    emit "$HOME/.claude/CLAUDE.md is read-only — fix permissions before install" >&2
    exit 2
  fi

  # Handle AC8 manual attestation
  if [ -n "$AC8_ATTESTED" ]; then
    if ! printf '%s\n' "$AC8_ATTESTED" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2} probe-attested$'; then
      emit "ERROR: --ac8-attested-by-user requires format '<YYYY-MM-DD> probe-attested'" >&2
      exit 2
    fi
    local queue_dir="$SOURCE_REPO_DIR/docs/harness"
    mkdir -p "$queue_dir"
    local queue_file="$queue_dir/user-queue.md"
    printf '\n## Q-AC8-MANUAL\n\nAC8 precedence probe attested manually by user on %s.\nAttestation string: "%s"\n' \
      "$(date +%Y-%m-%d)" "$AC8_ATTESTED" >>"$queue_file"
    emit "AC8 manual attestation recorded in $queue_file"
  fi
}

# ---------------------------------------------------------------------------
# Step 2 — Backup
# ---------------------------------------------------------------------------
backup_claude_md() {
  local claude_md="$HOME/.claude/CLAUDE.md"
  if [ ! -f "$claude_md" ] || [ ! -s "$claude_md" ]; then
    emit "no existing CLAUDE.md to back up"
    BACKUP_PATH=""
    return 0
  fi

  local ts
  ts=$(date +%Y%m%d-%H%M%S)
  local dest="${claude_md}.kzk-bak-${ts}"
  local n=1
  while [ -f "$dest" ]; do
    dest="${claude_md}.kzk-bak-${ts}.$(printf '%03d' "$n")"
    n=$((n + 1))
  done
  cp -p "$claude_md" "$dest"
  BACKUP_PATH="$dest"
  emit "Backup: $dest"
}

exec
/bin/zsh -lc "sed -n '260,560p' install/install-global.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
}

# ---------------------------------------------------------------------------
# Step 3 — Skill sync
# ---------------------------------------------------------------------------
sync_skills() {
  local skills_src="$SOURCE_REPO_DIR/skills"
  local skills_dst="$HOME/.claude/skills"
  local synced=0
  local skipped=0

  for src_dir in "$skills_src"/kzk-*/; do
    [ -d "$src_dir" ] || continue
    local name
    name="$(basename "$src_dir")"
    local tgt_dir="$skills_dst/$name"
    mkdir -p "$tgt_dir"

    local src_skill="$src_dir/SKILL.md"
    [ -f "$src_skill" ] || continue

    local src_version
    src_version="$(grep -m1 '^version:' "$src_skill" | awk '{print $2}' || true)"
    src_version="${src_version:-0.0.0}"

    local tgt_skill="$tgt_dir/SKILL.md"
    local tgt_version="0.0.0"
    if [ -f "$tgt_skill" ]; then
      tgt_version="$(grep -m1 '^version:' "$tgt_skill" | awk '{print $2}' || true)"
      tgt_version="${tgt_version:-0.0.0}"
    fi

    # Version compare: if tgt_version is strictly higher, preserve
    local higher
    higher="$(printf '%s\n%s\n' "$tgt_version" "$src_version" | sort -V | tail -1)"
    if [ "$tgt_version" != "0.0.0" ] &&
      [ "$higher" = "$tgt_version" ] &&
      [ "$tgt_version" != "$src_version" ]; then
      emit "  skipped $name — local v$tgt_version > source v$src_version"
      record "  $name: skipped (local v$tgt_version > source v$src_version)"
      skipped=$((skipped + 1))
      continue
    fi

    # Copy SKILL.md (always file-copy, even in --symlink-mode per §8.2 inversion)
    cp "$src_skill" "$tgt_dir/SKILL.md"

    # Copy any auxiliary files (future-safe, leave user-added files alone)
    for aux in "$src_dir"/*; do
      [ -f "$aux" ] || continue
      local aux_name
      aux_name="$(basename "$aux")"
      [ "$aux_name" = "SKILL.md" ] && continue
      cp "$aux" "$tgt_dir/$aux_name"
    done

    synced=$((synced + 1))
  done

  emit "  Skills synced: $synced, skipped (local-higher): $skipped"
  record "skill sync: $synced updated, $skipped preserved (local-higher version)"
}

# ---------------------------------------------------------------------------
# Step 4 — Umbrella sync
# ---------------------------------------------------------------------------
sync_umbrella() {
  local umbrella="$HOME/.claude/skills/.kzk-harness-shared"
  mkdir -p "$umbrella"

  if [ "$SYMLINK_MODE" -eq 1 ]; then
    # Symlink harness-share.md (only this file is symlinked per §8.2 inversion)
    local target_hs="$SOURCE_REPO_DIR/harness-share.md"
    local link_hs="$umbrella/harness-share.md"
    if [ -L "$link_hs" ]; then
      rm "$link_hs"
    elif [ -f "$link_hs" ]; then
      rm "$link_hs"
    fi
    ln -sfn "$target_hs" "$link_hs"
    emit "  Symlinked harness-share.md → $target_hs"
    record "umbrella: harness-share.md symlinked (--symlink-mode)"
  else
    cp "$SOURCE_REPO_DIR/harness-share.md" "$umbrella/harness-share.md"
    record "umbrella: harness-share.md copied"
  fi

  # VERSION file
  local ver
  ver="$(git -C "$SOURCE_REPO_DIR" describe --tags --always --dirty 2>/dev/null || true)"
  ver="${ver:-$(date +%Y-%m-%d-cycle-unknown)}"
  printf '%s\n' "$ver" >"$umbrella/VERSION"

  # UMBRELLA-README.md → README.md
  if [ -f "$SOURCE_REPO_DIR/install/UMBRELLA-README.md" ]; then
    cp "$SOURCE_REPO_DIR/install/UMBRELLA-README.md" "$umbrella/README.md"
  fi

  record "umbrella: version=$ver"
}

# ---------------------------------------------------------------------------
# Step 5 — CLAUDE.md routing block
# ---------------------------------------------------------------------------
update_claude_md_routing() {
  # Source the marker helpers
  # shellcheck source=install/lib/claude-md-marker.sh
  source "$SOURCE_REPO_DIR/install/lib/claude-md-marker.sh"

  local claude_md="$HOME/.claude/CLAUDE.md"

  # Check for malformed marker (BEGIN without END)
  if grep -qF "$KZK_MARKER_BEGIN" "$claude_md" &&
    ! grep -qF "$KZK_MARKER_END" "$claude_md"; then
    emit "marker corruption — restore from $BACKUP_PATH manually" >&2
    exit 2
  fi

  # Build routing block content
  local block_file
  block_file=$(mktemp)
  _build_routing_block >"$block_file"

  # Compare new vs existing block
  local old_block
  old_block=$(mktemp)
  if claude_md_block_present "$claude_md"; then
    claude_md_extract_block "$claude_md" >"$old_block"
  fi

  local diff_out
  diff_out=$(diff -u "$old_block" "$block_file" || true)
  rm -f "$old_block"

  if [ -z "$diff_out" ]; then
    emit "  CLAUDE.md marker block unchanged (idempotent)"
    record "CLAUDE.md: no change (already up to date)"
    rm -f "$block_file"
    return 0
  fi

  # Show diff
  emit "  CLAUDE.md routing block diff:"
  printf '%s\n' "$diff_out" | head -40

  if [ "$AUTO_YES" -eq 0 ]; then
    printf 'Replace this region of ~/.claude/CLAUDE.md? (y/N) '
    read -r answer
    if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
      emit "Aborted by user."
      rm -f "$block_file"
      exit 3
    fi
  fi

  # Strip existing block, inject new one (atomic)
  local stripped
  stripped=$(mktemp)
  if claude_md_block_present "$claude_md"; then
    claude_md_strip_block "$claude_md" "$stripped"
  else
    cp "$claude_md" "$stripped"
  fi
  claude_md_inject_block "$stripped" "$block_file" "$claude_md"
  rm -f "$stripped" "$block_file"

  emit "  CLAUDE.md routing block updated"
  record "CLAUDE.md: routing block updated"
}

# _build_routing_block — writes routing block content to stdout (no markers)
_build_routing_block() {
  local skills_src="$SOURCE_REPO_DIR/skills"
  local ver
  ver="$(git -C "$SOURCE_REPO_DIR" describe --tags --always --dirty 2>/dev/null || true)"
  ver="${ver:-$(date +%Y-%m-%d-cycle-unknown)}"
  local install_date
  install_date="$(date +%Y-%m-%d)"

  cat <<EOF
## kzk-harness skills (${ver} installed ${install_date})

> Workflow skill layer. 16 markdown skills auto-load from ~/.claude/skills/kzk-*.
> Project artifacts (\`harness-flow-progress.md\`, \`docs/harness/\`, \`docs/plans/\`,
> \`.web-loop/\`, \`.omc/\`, \`docs/research/codex-reviews/\`) stay in \`\$PWD\`.

| Skill | Trigger keywords |
|---|---|
EOF

  # Emit one row per skill directory
  for skill_dir in "$skills_src"/kzk-*/; do
    [ -d "$skill_dir" ] || continue
    local skill_name
    skill_name="$(basename "$skill_dir")"
    local skill_md="$skill_dir/SKILL.md"
    local triggers=""
    if [ -f "$skill_md" ]; then
      # Extract description line which contains trigger keywords
      triggers="$(grep -m1 '^description:' "$skill_md" | sed 's/^description:[[:space:]]*//' | sed 's/^"//;s/"$//' || true)"
    fi
    printf '| %s | %s |\n' "$skill_name" "$triggers"
  done

  # Self-trigger matrix (verbatim from CLAUDE.md §Self-Improvement Loop)
  cat <<'MATRIX'

### Self-trigger matrix (메타 갭 방지)

- 메인이 5+ 파일 read 가 필요한 검증 → kzk-codebase-survey → kzk-large-task-delegation §Read-heavy audit
- 새 spec / plan / 큰 구조 변경 → kzk-spec-and-review Step 0 → 1–3
- 자가개선 cycle → kzk-large-task-delegation + kzk-pre-commit-gate + kzk-autonomous-loop
- Multi-file 코드 변경 (3+ 파일 / 200+ LoC) → kzk-large-task-delegation §Model routing
- Cycle 끝에서 commit → kzk-pre-commit-gate (Gate 0–4) + kzk-pre-merge-sync
- 다중 cycle 자율 실행 → kzk-autonomous-loop + kzk-autonomous-boundary
- Production / DB / IAM 작업 → kzk-production-access
- UI 변경 commit → kzk-playwright-verification (Gate 4)
MATRIX
}

# ---------------------------------------------------------------------------
# Step 5.5 — OMC keyword-detector collision check
# ---------------------------------------------------------------------------
omc_collision_check() {
  local found=0
  local pattern="$HOME/.claude/plugins/cache"
  # Use glob expansion (not find /) for performance
  for f in "$pattern"/*/oh-my-claudecode/*/scripts/keyword-detector.mjs; do
    [ -f "$f" ] || continue
    if grep -qE '(ralph|autopilot|ulw|ccg)' "$f" 2>/dev/null; then
      found=1
      printf 'WARNING: OMC keyword-detector intercepts '\''ralph'\'' before SKILL.md matching → kzk-autonomous-boundary may not activate via the bare keyword. Use the disambiguator phrases '\''ralph로 체크'\'' / '\''ralph로 확인'\'' which are already in the SKILL.md description (v1.0.12+). Confirm by triggering in a fresh session.\n' >&2
      break
    fi
  done

  if [ "$found" -eq 1 ]; then
    record "OMC collision warning EMITTED"
  fi
}

# ---------------------------------------------------------------------------
# Step 6 — Stale skill cleanup
# ---------------------------------------------------------------------------
cleanup_stale_skills() {
  local skills_src="$SOURCE_REPO_DIR/skills"
  local skills_dst="$HOME/.claude/skills"
  local stale=()

  for installed in "$skills_dst"/kzk-*/; do
    [ -d "$installed" ] || continue
    local name
    name="$(basename "$installed")"
    if [ ! -d "$skills_src/$name" ]; then
      stale+=("$name")
    fi
  done

  if [ ${#stale[@]} -eq 0 ]; then
    return 0
  fi

  emit "  Stale globally-installed kzk-* skills (no longer in source):"
  for s in "${stale[@]}"; do
    emit "    - $s"
  done

  local answer="y"
  if [ "$AUTO_YES" -eq 0 ]; then
    printf 'These kzk-* skills are no longer in source. Delete? (y/N) '
    read -r answer
  fi

  if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    for s in "${stale[@]}"; do
      local target="$skills_dst/$s"
      if [ -L "$target" ]; then
        rm "$target"
      else
        rm -rf "$target"
      fi
      emit "  Removed stale: $s"
    done
    record "stale cleanup: removed ${#stale[@]} stale skill(s): ${stale[*]}"
  else
    record "stale cleanup: skipped (user declined)"
  fi
}

# ---------------------------------------------------------------------------
# Step 7 — Dependencies
# ---------------------------------------------------------------------------
run_dependencies() {
  local dep_script="$SOURCE_REPO_DIR/install/dependencies.sh"
  if [ ! -f "$dep_script" ]; then
    emit "  dependencies.sh not found at $dep_script — skipping (graceful-degrade)"
    record "dependencies: SKIPPED (script not found)"
    return 0
  fi

  emit "  Running dependencies.sh --skip-project ..."

exec
/bin/zsh -lc "sed -n '230,340p' install/uninstall-global.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
    elif [ -d "$d" ]; then
      rm -rf "$d"
      emit "  Removed dir: $name"
    fi
    removed=$((removed + 1))
  done

  # Remove umbrella dotfile
  if [ -d "$skills_dst/.kzk-harness-shared" ]; then
    rm -rf "$skills_dst/.kzk-harness-shared"
    emit "  Removed umbrella: .kzk-harness-shared"
    removed=$((removed + 1))
  elif [ -L "$skills_dst/.kzk-harness-shared" ]; then
    rm "$skills_dst/.kzk-harness-shared"
    emit "  Removed symlink: .kzk-harness-shared"
    removed=$((removed + 1))
  fi

  # Remove hook entry from ~/.claude/settings.json if present
  local settings="$HOME/.claude/settings.json"
  if [ -f "$settings" ] && command -v jq >/dev/null 2>&1; then
    local hook_marker=".kzk-harness-shared/hooks/keyword-detector.mjs"
    if grep -qF "$hook_marker" "$settings" 2>/dev/null; then
      local tmp
      tmp=$(mktemp)
      if jq 'del(.hooks.UserPromptSubmit[]? | select(.hooks[]?.command? | strings | test("kzk-harness-shared")))' \
        "$settings" >"$tmp" 2>/dev/null; then
        mv "$tmp" "$settings"
      else
        rm -f "$tmp"
      fi
      emit "  Removed kzk-harness hook entry from ~/.claude/settings.json"
      record "hooks: UserPromptSubmit entry removed"
    fi
  fi

  emit "  Removed $removed kzk-harness path(s)"
  record "skill dirs: $removed path(s) removed"
  return 0
}

# ---------------------------------------------------------------------------
# Step U3 — List orphaned per-project artifacts
# ---------------------------------------------------------------------------
list_orphaned_artifacts() {
  emit ""
  emit "Scanning for per-project kzk artifacts (capped at depth 5)..."

  local found_paths=()

  # Search patterns for per-project kzk artifacts
  while IFS= read -r p; do
    found_paths+=("$p")
  done < <(find "$HOME" -maxdepth 5 \( \
    -name "harness-flow-progress.md" -o \
    -name ".web-loop" -type d -o \
    -path "*/docs/harness" -type d -o \
    -path "*/docs/research/codex-reviews" -type d \
    \) 2>/dev/null | sort)

  if [ ${#found_paths[@]} -eq 0 ]; then
    emit "  No per-project kzk artifacts found."
    record "project artifacts: none found"
    return 0
  fi

  emit "  Found per-project kzk artifacts:"
  for p in "${found_paths[@]}"; do
    emit "    $p"
  done

  if [ "$PURGE_PROJECT_ARTIFACTS" -eq 0 ]; then
    emit ""
    emit "  (Pass --purge-project-artifacts to delete these. Default is list-only.)"
    record "project artifacts: ${#found_paths[@]} found (list-only, not deleted)"
    return 0
  fi

  # --purge-project-artifacts: confirm before deleting
  local answer="y"
  if [ "$AUTO_YES" -eq 0 ]; then
    emit ""
    printf 'Delete all %d per-project kzk artifact(s) listed above? Type "yes" to confirm: ' \
      "${#found_paths[@]}"
    read -r answer
    if [ "$answer" != "yes" ]; then
      emit "Aborted — no project artifacts deleted."
      record "project artifacts: purge aborted by user"
      exit 3
    fi
  fi

  local deleted=0
  for p in "${found_paths[@]}"; do
    if [ -d "$p" ]; then
      rm -rf "$p"
    elif [ -f "$p" ]; then
      rm -f "$p"
    fi
    emit "  Deleted: $p"
    deleted=$((deleted + 1))
  done
  record "project artifacts: $deleted deleted (--purge-project-artifacts)"
}

# ---------------------------------------------------------------------------
# Step U4 — Print summary
# ---------------------------------------------------------------------------
print_summary() {
  local claude_md="$HOME/.claude/CLAUDE.md"
  local backup_hint=""

exec
/bin/zsh -lc "sed -n '632,725p' install/install-global.sh" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
enable_hooks() {
  local src="$SOURCE_REPO_DIR"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/hooks"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/lib"
  mkdir -p "$HOME/.claude/skills/.kzk-harness-shared/bin"

  cp "$src/install/hooks/keyword-detector.mjs" \
    "$HOME/.claude/skills/.kzk-harness-shared/hooks/"

  # Plan D: regression-recall hook + sidecar-write lib + dismiss bin
  if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ]; then
    cp "$src/install/hooks/regression-recall.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/"
    cp "$src/install/lib/sidecar-write.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/lib/"
    cp "$src/install/bin/kzk-regression-memory.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/bin/"
  fi

  local settings="$HOME/.claude/settings.json"
  if [ ! -f "$settings" ]; then
    printf '{}' >"$settings"
  fi

  if ! command -v jq >/dev/null 2>&1; then
    emit "  hooks: jq not found — cannot update settings.json. Install jq and re-run with --enable-hooks." >&2
    record "hooks: SKIPPED (jq not found)"
    # rev2 codex #3 — fail-closed: jq 부재 시 enable 실패 → exit non-zero (called from kzk-pre-merge-sync step 3)
    return 1
  fi

  # Idempotent append: keyword-detector
  local kd_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs"
  local kd_already
  kd_already=$(jq --arg cmd "$kd_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
  if [ "${kd_already:-0}" -gt 0 ]; then
    emit "  hooks: keyword-detector.mjs already registered — skip"
    record "hooks: keyword-detector skip (already registered)"
  else
    local tmp
    tmp=$(mktemp)
    jq --arg cmd "$kd_cmd" '
      .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
    ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
    emit "  hooks: keyword-detector.mjs registered in ~/.claude/settings.json"
    record "hooks: UserPromptSubmit hook registered (--enable-hooks)"
  fi

  # Plan D: regression-recall idempotent append
  if [ "${DO_REGRESSION_RECALL:-0}" -eq 1 ]; then
    cp "$src/install/hooks/regression-recall.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/" 2>/dev/null || true
    local rr_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/regression-recall.mjs"
    local rr_already
    rr_already=$(jq --arg cmd "$rr_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
    if [ "${rr_already:-0}" -gt 0 ]; then
      emit "  hooks: regression-recall.mjs already registered — skip"
      record "hooks: regression-recall skip (already registered)"
    else
      tmp=$(mktemp)
      jq --arg cmd "$rr_cmd" '
        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
      ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
      emit "  hooks: regression-recall.mjs registered (--regression-recall)"
      record "hooks: regression-recall hook registered (--regression-recall, depends on --enable-hooks)"
    fi
  fi

  # Plan B: fix-scope-trigger idempotent append
  if [ "${DO_FIX_SCOPE_TRIGGER:-0}" -eq 1 ]; then
    cp "$src/install/hooks/fix-scope-trigger.mjs" \
      "$HOME/.claude/skills/.kzk-harness-shared/hooks/" 2>/dev/null || true
    local fst_cmd="node $HOME/.claude/skills/.kzk-harness-shared/hooks/fix-scope-trigger.mjs"
    local fst_already
    fst_already=$(jq --arg cmd "$fst_cmd" '[.hooks.UserPromptSubmit[]?.hooks[]?.command // empty] | map(select(. == $cmd)) | length' "$settings")
    if [ "${fst_already:-0}" -gt 0 ]; then
      emit "  hooks: fix-scope-trigger.mjs already registered — skip"
      record "hooks: fix-scope-trigger skip (already registered)"
    else
      tmp=$(mktemp)
      jq --arg cmd "$fst_cmd" '
        .hooks.UserPromptSubmit |= ((. // []) + [{matcher:"*", hooks:[{type:"command", command:$cmd}]}])
      ' "$settings" >"$tmp" && mv "$tmp" "$settings" || return 1
      emit "  hooks: fix-scope-trigger.mjs registered (--fix-scope-trigger)"
      record "hooks: fix-scope-trigger hook registered (--fix-scope-trigger, depends on --enable-hooks)"
    fi
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Step 9 — Summary
# ---------------------------------------------------------------------------
print_summary() {

exec
/bin/zsh -lc "sed -n '1,220p' install/hooks/fix-scope-trigger.mjs" in /Users/kimzerokim/work/personal/kzk-harness
exec
/bin/zsh -lc "sed -n '1,240p' install/hooks/regression-recall.mjs" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
#!/usr/bin/env node
// regression-recall.mjs — UserPromptSubmit hook for kzk-regression-memory.
// rev2 — codex #4 (orphan cleanup 분리), #5 (자가-skip 동사구), #6 (atomic write),
//        #7 (gstack 미설치 stderr WARN).
// Authoritative spec: docs/plans/regression-memory-and-fix-quality-spec.md (rev7).
// Default DISABLED at Plan D commit. Auto-enabled by kzk-pre-merge-sync last step.

import { execSync } from "node:child_process";
import path from "node:path";
import { mutateSidecar, readSidecar } from "../lib/sidecar-write.mjs";
import { FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent, normalizeQuery } from "../lib/hook-shared.mjs";

// rev2 codex #5 — 동사구만, 명사 단독 금지 (now sourced from hook-shared.mjs — single SoT)
// FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES, shouldSkip, detectFixIntent, normalizeQuery
// all imported above. Local definitions removed to prevent drift.

const DECAY_BASE = 0.85;
const CONFIDENCE_THRESHOLD = 4;

// rev2 codex #7 — gstack 미설치 시 stderr WARN + structured _warn
function querylearn(query) {
  try {
    const out = execSync(`gstack learn search --query ${JSON.stringify(query)} --format jsonl`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    return { entries: out.split("\n").filter(Boolean).map((l) => JSON.parse(l)), warn: null };
  } catch (e) {
    process.stderr.write(`[regression-recall] gstack search failed: ${e.message}\n`);
    return { entries: null, warn: "gstack-not-installed-or-search-failed" };
  }
}

// rev2 codex #4 — full /learn snapshot for orphan cleanup
function listAllLearnKeys() {
  try {
    const out = execSync(`gstack learn list --keys-only`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;  // gstack 미설치 → orphan cleanup skip (false-positive 삭제 차단)
  }
}

function decay(confidence, dismissCount) {
  return confidence * Math.pow(DECAY_BASE, dismissCount);
}

// rev2 codex #4 — cleanup 은 allLearnKeys 기준 (searchHits 아님)
async function orphanCleanup(sidecarPath, allLearnKeys) {
  if (allLearnKeys === null) return null;  // gstack 미가용 → skip
  const keepKeys = new Set(allLearnKeys);
  let removedCount = 0;
  await mutateSidecar(sidecarPath, (entries) => {
    const survivors = entries.filter((e) => keepKeys.has(e.key));
    removedCount = entries.length - survivors.length;
    return survivors;
  });
  if (removedCount > 0) {
    process.stderr.write(`[regression-recall] orphan keys removed: ${removedCount}\n`);
  }
  return removedCount;
}

function buildReminder(hits) {
  if (hits.length === 0) return null;
  const lines = hits.map((h) => {
    const stale = h.staleFlag ? " [⚠ stale]" : "";
    return `- ${h.key}: ${h.insight} (cycle ${h.cycles.join(",")}, confidence_decayed ${h.confidenceDecayed.toFixed(2)})${stale}`;
  });
  return [
    `🚨 [REGRESSION RECALL] 과거 유사 fix ${hits.length}건:`,
    ...lines,
    `⚠ 자동 적용 금지. 매칭 정확성 검토 후 채택.`,
    `dismiss: kzk-regression-memory dismiss <key>`,
  ].join("\n");
}

export {
  shouldSkip, detectFixIntent, normalizeQuery, decay, orphanCleanup,
  buildReminder, FIX_KEYWORDS, SELF_IMPROVE_VERBPHRASES,
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", async () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const repoRoot = process.cwd();
    const sidecarPath = path.join(repoRoot, ".kzk-harness", "regression-meta.jsonl");

    const skip = shouldSkip(prompt, process.env);
    if (skip) {
      process.stdout.write(JSON.stringify({ continue: true, _skip: skip }) + "\n");
      return;
    }
    if (!detectFixIntent(prompt)) {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
      return;
    }

    const query = normalizeQuery(prompt);
    const { entries: learnEntries, warn } = querylearn(query);

    if (learnEntries === null) {
      // gstack 미설치 — silent skip 금지 (codex #7)
      process.stdout.write(JSON.stringify({ continue: true, _warn: warn }) + "\n");
      return;
    }

    // rev2 codex #4 — orphan cleanup 은 allLearnKeys 기준만
    const allKeys = listAllLearnKeys();
    await orphanCleanup(sidecarPath, allKeys);

    // re-read sidecar after potential cleanup
    const sidecarEntries = readSidecar(sidecarPath);
    const sidecarByKey = new Map(sidecarEntries.map((e) => [e.key, e]));

    const hits = [];
    for (const learnEntry of learnEntries) {
      const meta = sidecarByKey.get(learnEntry.key);
      if (!meta) continue;  // sidecar 미존재 = invalid (FK 룰)
      if (meta.archived) continue;
      const dec = decay(learnEntry.confidence, meta.dismiss_count);
      if (dec < CONFIDENCE_THRESHOLD) continue;
      hits.push({
        key: learnEntry.key,
        insight: learnEntry.insight,
        cycles: meta.related_cycles,
        confidenceDecayed: dec,
        staleFlag: meta.stale ?? false,
      });
    }

    const reminder = buildReminder(hits);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}

 succeeded in 0ms:
#!/usr/bin/env node
// fix-scope-trigger.mjs — UserPromptSubmit hook for kzk-fix-scope-expansion (Plan B).
// Detects fix intent, expands callsite scope via CRG or grep, injects system-reminder.
// Default DISABLED at Plan B commit. Auto-enabled by kzk-pre-merge-sync step 3.
// Authoritative spec: docs/plans/plan-B-fix-scope-expansion.md (rev2).

import { execSync } from "node:child_process";
import path from "node:path";
import { shouldSkip, detectFixIntent, FIX_KEYWORDS } from "../lib/hook-shared.mjs";
import { writeSingleEntryWithLock } from "../lib/cache-write.mjs";

// Max chars for system-reminder callsite list
const TRUNCATION_CAP = 200;

/**
 * extractSymbols — extract candidate symbol names from a prompt.
 * Patterns: backtick `name`, camelCase, snake_case, funcName()
 */
function extractSymbols(prompt) {
  const symbols = new Set();

  // backtick pattern: `symbolName`
  const backtickRe = /`([A-Za-z_][A-Za-z0-9_]{2,})`/g;
  let m;
  while ((m = backtickRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // func() pattern: word followed by ()
  const funcCallRe = /\b([A-Za-z_][A-Za-z0-9_]{2,})\s*\(\)/g;
  while ((m = funcCallRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // camelCase: contains at least one uppercase not at start
  const camelRe = /\b([a-z][a-zA-Z0-9]{3,}[A-Z][a-zA-Z0-9]*)\b/g;
  while ((m = camelRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  // snake_case: word_with_underscores (min 2 parts)
  const snakeRe = /\b([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\b/g;
  while ((m = snakeRe.exec(prompt)) !== null) {
    symbols.add(m[1]);
  }

  return [...symbols].slice(0, 3);  // limit to first 3 symbols
}

/**
 * runCRG — run code-review-graph detect-changes and return raw output.
 * DI-injectable runner for testing.
 * CRG signature (Task 0 confirmed): code-review-graph detect-changes --base HEAD~1
 * No --symbol, --file, query, or blast-radius subcommands exist.
 */
export function runCRG(cmd, runner = execSync) {
  return runner(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 });
}

/**
 * runGrep — run grep to find callsites for a symbol.
 * DI-injectable runner for testing.
 * docs/ excluded to prevent documentation mention pollution.
 */
export function runGrep(pattern, runner = execSync) {
  const cmd = `grep -rn ${JSON.stringify(pattern)} --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.sh' --include='*.py' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs`;
  return runner(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 10000 });
}

/**
 * parseCRGOutput — extract file:line references from CRG detect-changes output.
 */
function parseCRGOutput(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const callsites = [];
  for (const line of lines) {
    // detect-changes outputs lines like "path/to/file.mjs: function_name (line N)"
    // or just file paths with impact info
    const fileMatch = line.match(/^([^\s:]+\.[a-z]+)(?::(\d+))?/);
    if (fileMatch && !line.startsWith("[") && !line.startsWith("INFO")) {
      const ref = fileMatch[2] ? `${fileMatch[1]}:${fileMatch[2]}` : fileMatch[1];
      callsites.push(ref);
    }
  }
  return [...new Set(callsites)].slice(0, 20);
}

/**
 * parseGrepOutput — extract file:line references from grep output.
 */
function parseGrepOutput(raw) {
  const lines = raw.split("\n").filter(Boolean);
  const callsites = [];
  for (const line of lines) {
    const m = line.match(/^([^:]+):(\d+):/);
    if (m) {
      callsites.push(`${m[1]}:${m[2]}`);
    }
  }
  return [...new Set(callsites)].slice(0, 20);
}

/**
 * truncateCallsites — join callsites to a string, cap at TRUNCATION_CAP chars.
 */
function truncateCallsites(callsites) {
  const joined = callsites.join(", ");
  if (joined.length <= TRUNCATION_CAP) return joined;
  return joined.slice(0, TRUNCATION_CAP - 3) + "...";
}

/**
 * getCommitSHA — get HEAD commit SHA for cache key.
 */
function getCommitSHA() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return `no-sha-${Date.now()}`;
  }
}

/**
 * handler — main hook handler, testable with DI.
 *
 * @param {object} input — {hook_event_name, prompt} from stdin
 * @param {object} options — {runner} for DI in tests
 * @returns {object|null} — hook output JSON or null
 */
export async function handler(input, { runner = null } = {}) {
  const prompt = String(input.prompt ?? input.user_prompt ?? "");

  // 1. Self-skip guard
  const skip = shouldSkip(prompt, process.env);
  if (skip) {
    return { continue: true, _skip: skip };
  }

  // 2. Fix intent detection
  if (!detectFixIntent(prompt)) {
    return { continue: true };
  }

  // Gate 4.5 escape check (hook still runs, Gate 4.5 itself checks this env var)
  // hook collects callsites regardless; Gate 4.5 skips the check if KZK_GATE45_SKIP=1

  // 3. Extract symbols from prompt
  const symbols = extractSymbols(prompt);
  const primarySymbol = symbols[0] ?? null;

  let callsites = [];
  let crgAvailable = false;

  // 4. CRG path (Task 0 confirmed signature: detect-changes --base HEAD~1)
  try {
    const crgCheck = execSync("command -v code-review-graph", {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 3000,
    });
    crgAvailable = crgCheck.trim().length > 0;
  } catch {
    crgAvailable = false;
  }

  if (crgAvailable) {
    try {
      const crgRunner = runner ?? ((cmd, opts) => execSync(cmd, opts));
      const crgOut = runCRG("code-review-graph detect-changes --base HEAD~1", crgRunner);
      callsites = parseCRGOutput(crgOut);
    } catch (e) {
      process.stderr.write(`[fix-scope-trigger] CRG failed: ${e.message} — grep fallback\n`);
      crgAvailable = false;
    }
  }

  if (!crgAvailable) {
    process.stderr.write(`[fix-scope-trigger] WARN: code-review-graph not installed or failed. grep fallback.\n`);
    const warnReason = "_warn:\"crg-not-installed-grep-fallback\"";

    if (primarySymbol) {
      try {
        const grepRunner = runner ?? ((cmd, opts) => execSync(cmd, opts));
        const grepOut = runGrep(primarySymbol, grepRunner);
        callsites = parseGrepOutput(grepOut);
      } catch (e) {
        // grep exit non-zero = no matches, not an error
        if (!e.message.includes("exit code 1") && e.status !== 1) {
          process.stderr.write(`[fix-scope-trigger] grep failed: ${e.message}\n`);
        }
        callsites = [];
      }
    }
  }

  if (callsites.length === 0) {
    return { continue: true };
  }

  // 5. Truncation
  const callsiteDisplay = truncateCallsites(callsites);

  // 6. Write to cache
  const repoRoot = process.cwd();
  const cachePath = path.join(repoRoot, ".kzk-harness", "fix-scope-cache.jsonl");
  const commitSHA = getCommitSHA();

  try {
    await writeSingleEntryWithLock(cachePath, commitSHA, callsites);
  } catch (e) {
    process.stderr.write(`[fix-scope-trigger] cache write failed: ${e.message}\n`);
  }

  // 7. Build system-reminder
  const symbolNote = primarySymbol ? ` (심볼: ${primarySymbol})` : "";
  const reminder = [
    `[FIX SCOPE] fix intent 감지${symbolNote}. 관련 callsite ${callsites.length}곳:`,
    callsiteDisplay,
    `⚠ 모든 callsite 수정 의무 또는 Gate 4.5 에서 BLOCK. KZK_GATE45_SKIP=1 로 우회 가능 (사유 commit body 기재).`,
    `self-check: grep -rn <functionName> --include='*.{ts,tsx,js,mjs,sh,py}' --exclude-dir={node_modules,.git,docs}`,
  ].join("\n");


exec
/bin/zsh -lc "sed -n '1,220p' install/hooks/keyword-detector.mjs" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
#!/usr/bin/env node
// keyword-detector.mjs — UserPromptSubmit hook for kzk-harness skill auto-load.
//
// Detects user-prompt phrases that should trigger specific kzk-* skill loads
// and emits a system-reminder pointing the main context at the right skills
// BEFORE it can read/edit files. Closes the meta-gap pattern where main loads
// only kzk-codebase-survey for a multi-bug task and skips kzk-large-task-delegation.
//
// Authoritative spec: docs/superpowers/specs/2026-05-04-kzk-global-install-design.md §7.5
// Wired into ~/.claude/settings.json by `install-global.sh --enable-hooks` (N3 opt-in).

const RULES = [
  {
    skills: ["kzk-large-task-delegation"],
    why: "3+ file edits / 5+ file read / multi-plan execution mandates fresh-subagent dispatch — main never executes",
    triggers: [
      "큰 작업", "버그 전수조사", "구현 검증", "마무리 해줘", "전수 검토", "끝내줘",
      "large task", "subagent dispatch", "3+ file edits", "200+ LoC", "5+ file read",
      "read-heavy audit", "spec verification", "implementation audit",
      "사용성 버그", "사용성 회귀", "qa scan", "QA scan",
      "여러 plan 으로 쪼개", "여러 plan으로 쪼개", "플랜 여러개로 쪼개", "플랜 쪼개", "plan 쪼개", "plan 여러개",
      "사이클 자율", "사이클로 자율", "사이클 돌면서", "자율로 돌면서",
      "버그들 모두", "버그 모두 개선", "모두 잡아줘", "모두 개선",
      "리팩토링", "refactor", "정리해줘", "cleanup", "개선해줘", "전반적으로", "통째로", "scope estimate",
    ],
  },
  {
    skills: ["kzk-codebase-survey", "kzk-large-task-delegation"],
    why: "codebase survey precedes any large-scope edit; large-task-delegation is the mandatory next hop",
    triggers: [
      "codebase survey", "코드베이스 탐색", "deep explore", "survey first", "before planning",
      "구현 확인", "spec vs implementation", "spec 체크", "스펙 체크", "하나하나 확인", "ralph로 체크",
    ],
  },
  {
    skills: ["kzk-spec-and-review"],
    why: "spec / plan / major-design authoring requires Step 0 survey + Steps 1-3 codex review",
    triggers: [
      "spec 잡자", "spec 작성", "spec draft", "plan draft", "plan 작성",
      "design draft", "major design", "architecture review", "codex review", "codex consult", "cross-verify",
      "플랜 만들", "plan 만들", "여러 plan", "플랜 여러개", "메타 plan", "meta plan", "spec 만들",
    ],
  },
  {
    skills: ["kzk-autonomous-boundary"],
    why: "autonomous-mode entry requires the ASK-FIRST 3-slot branch contract (kzk-autonomous-boundary §Branch contract)",
    triggers: [
      "ralph로 돌려", "ralph로 체크", "ralph로 확인", "자는 동안 진행",
      "실행해놔야 queue 보지", "끝까지 끝내줘", "autonomous mode",
      "자율실행", "자율 실행", "자율로 돌려",
    ],
  },
  {
    skills: ["kzk-spec-and-review", "kzk-large-task-delegation", "kzk-pre-commit-gate", "kzk-autonomous-loop"],
    why: "self-improvement loop entry — load the full meta-stack to avoid recursive meta-gap",
    triggers: ["harness 개선 루프", "스킬 개선해줘", "harness loop", "자가개선", "자가개선 루프", "재발 방지", "메타 갭"],
  },
  {
    skills: ["kzk-test-coverage"],
    why: "TDD discipline — failing test (red) BEFORE impl (green) BEFORE refactor BEFORE commit; coverage gate gates the result",
    triggers: [
      "tdd", "TDD", "test first", "테스트 먼저", "테스트부터", "failing test", "red-green",
      "테스트 추가", "테스트 추가해줘", "test 추가", "coverage 추가",
    ],
  },
];

function detect(input) {
  const matched = new Map();
  for (const rule of RULES) {
    for (const trig of rule.triggers) {
      if (input.includes(trig)) {
        for (const skill of rule.skills) {
          if (!matched.has(skill)) matched.set(skill, { triggers: new Set(), whys: new Set() });
          matched.get(skill).triggers.add(trig);
          matched.get(skill).whys.add(rule.why);
        }
      }
    }
  }
  return Array.from(matched.entries()).map(([skill, info]) => ({
    skill,
    triggers: Array.from(info.triggers),
    whys: Array.from(info.whys),
  }));
}

function buildReminder(matches) {
  if (matches.length === 0) return null;
  // Group skills into clusters by shared trigger phrases
  const skillNames = matches.map((m) => m.skill).join(", ");
  const allTriggers = [...new Set(matches.flatMap((m) => m.triggers))];
  const triggersStr = allTriggers.map((t) => `'${t}'`).join(", ");
  return `🚨 [kzk] LOAD before edit: ${skillNames} (matched: ${triggersStr})`;
}

export { detect, buildReminder, RULES };

if (process.argv[1] === new URL(import.meta.url).pathname) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { raw += chunk; });
  process.stdin.on("end", () => {
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
    const prompt = String(payload.prompt ?? payload.user_prompt ?? "");
    const matches = detect(prompt);
    const reminder = buildReminder(matches);
    if (reminder) {
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: reminder,
          },
        }) + "\n",
      );
    } else {
      process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    }
  });
}

exec
/bin/zsh -lc "rg -n \"KZK_TURN_ID|process\\.env|hookSpecificOutput|tool_input|tool_name|file_path|Read\" install/hooks install/lib skills -g '"'!**/node_modules/**'"'" in /Users/kimzerokim/work/personal/kzk-harness
 succeeded in 0ms:
install/hooks/keyword-detector.mjs:112:          hookSpecificOutput: {
install/hooks/regression-recall.mjs:99:    const skip = shouldSkip(prompt, process.env);
install/hooks/regression-recall.mjs:146:          hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: reminder },
skills/kzk-spec-and-review/SKILL.md:119:- **Read 의무 = 검토 대상 plan/spec 본문 + cycle N-1 verdict 정제 file 만**. sister plan / spec 다른 본문은 *context only* (인용 / locked decision 만 prompt 안에 박음, full read 안 시킴).
skills/kzk-spec-and-review/SKILL.md:127:- "Read 의무" 가 4+ 파일
install/hooks/fix-scope-trigger.mjs:134:  const skip = shouldSkip(prompt, process.env);
install/hooks/fix-scope-trigger.mjs:222:    hookSpecificOutput: {
skills/kzk-playwright-verification/SKILL.md:113:- Reading the screenshot but stating "looks good" without an explicit visual claim. Build/test green ≠ visual PASS. Mandatory format: name elements + name tokens (e.g. "Card has shadow, padding looks correct, primary CTA blue is the brand token")
install/lib/hook-shared.mjs:36: * @param {object} env — process.env or equivalent
install/lib/hook-shared.mjs:39:export function shouldSkip(prompt, env = process.env) {
skills/kzk-tool-retry/SKILL.md:25:1. Immediately call `Read` on the file (the affected ±10 lines is enough) or `grep -n <substring>` to recover the exact text.
skills/kzk-tool-retry/SKILL.md:33:- **"not been read yet"**: read-tracker reset between Read and Edit. Resets happen across `UserPromptSubmit`, hook events, session restore, `/compact`, agent dispatch return, and any system-reminder injection. A single user message between Read and Edit can reset the tracker.
skills/kzk-tool-retry/SKILL.md:34:- **"modified since read"**: an external tool (sed, formatter, linter, the user, another agent) wrote to the file between your Read and your Edit. The on-disk content moved past your snapshot.
skills/kzk-tool-retry/SKILL.md:36:**Pre-emptive Read protocol — MANDATORY** (prevention is cheaper than recovery):
skills/kzk-tool-retry/SKILL.md:38:The Edit tool requires a Read of the file in the *same effective session window* before it will write. Treat the following events as **read-tracker invalidators** — the next Edit on any affected file MUST be preceded by a fresh Read:
skills/kzk-tool-retry/SKILL.md:42:| User sends a new message | All files you intended to edit | Read each before next Edit |
skills/kzk-tool-retry/SKILL.md:43:| `<system-reminder>` mentions a file was modified by user/linter | The cited file (and any open editor target) | Re-Read before next Edit |
skills/kzk-tool-retry/SKILL.md:44:| You ran `sed -i`, `Write`, formatter, or any non-Edit modifier | All files modified | Re-Read before next Edit |
skills/kzk-tool-retry/SKILL.md:45:| You called an Agent that returned (subagent_type=executor etc.) | All files the agent might have touched | Re-Read before next Edit |
skills/kzk-tool-retry/SKILL.md:46:| `/compact`, session restore, hook event with file edits | All files you'll edit next | Re-Read before next Edit |
skills/kzk-tool-retry/SKILL.md:47:| > 5 turns since last Read of a frequently-edited file | That file | Re-Read before next Edit |
skills/kzk-tool-retry/SKILL.md:49:A 1-line `Read` (offset=1, limit=5) is enough to refresh the tracker — cost is trivial vs. the round-trip cost of a failed Edit.
skills/kzk-tool-retry/SKILL.md:51:**Default — Re-Read on doubt**: 위 표 어느 row 라도 hit 모호 시, 무조건 1-line Re-Read 먼저. cost = 1 tool call vs. failed Edit 의 round-trip (1 error reminder + 1 retry Edit + 메인 컨텍스트 흐름 끊김). 모든 Edit / Write 직전 다음 self-check 의무:
skills/kzk-tool-retry/SKILL.md:53:> "이 파일 마지막 Read 가 *이번 turn 안에* 일어났는가? 그 사이 invalidator (위 표) 발생했는가?"
skills/kzk-tool-retry/SKILL.md:55:답이 "확실히 yes" 이 아니면 → 1-line Re-Read 먼저. Edit 호출 직전 매 cycle.
skills/kzk-tool-retry/SKILL.md:57:**자율실행 cycle 진입 시 강제**: subagent dispatch 끝나고 메인이 Edit 시작할 때 — 그 turn 의 첫 Edit 은 *반드시* 1-line Read 선행. agent return 이 row 4 invalidator 라 추정만 하지 말고 즉시 Re-Read.
skills/kzk-tool-retry/SKILL.md:60:1. Same path → call `Read` once.
skills/kzk-large-task-delegation/SKILL.md:37:The user is often agentic-only — they describe outcomes, not file counts. Threshold rules ("3+ files", "200+ LoC", "5+ file read") are main-context decisions, but main can't decide if it never estimates. **Run a 30-second scope estimate as the first action on any non-trivial request** before any Edit / Write / multi-file Read.
skills/kzk-large-task-delegation/SKILL.md:53:Output to user (1-line preamble before first Read/Edit):
skills/kzk-large-task-delegation/SKILL.md:73:- Estimate says ≤ 30 LoC, but mid-execution main reads 5+ files → halt, restart with EXPLORER subagent (estimate was wrong; respect §Read-heavy audit dispatch shape).
skills/kzk-large-task-delegation/SKILL.md:77:## Read-heavy audit dispatch shape
skills/kzk-large-task-delegation/SKILL.md:81:- Main context **MUST NOT** read 5+ files directly with `Read` — context saturation degrades conclusion quality (the "main reads code weirdly" failure mode).
skills/kzk-large-task-delegation/SKILL.md:83:  1. `oh-my-claudecode:explore` (`model=sonnet` for survey-style deep reads, `model=haiku` for quick targeted file lookups) — file discovery + Read in subagent context.
skills/kzk-large-task-delegation/SKILL.md:434:2. Will main read ≥ 5 files this turn? → §Read-heavy audit dispatch shape mandates EXPLORER subagent.
skills/kzk-background-monitoring/SKILL.md:35:   - stderr shows hang signals like `Reading additional input from stdin...`
skills/kzk-background-monitoring/SKILL.md:50:- ❌ Ignoring `Reading additional input from stdin...` and similar hang signals
skills/kzk-codebase-survey/SKILL.md:21:**Agent dispatch:** `oh-my-claudecode:explore` (`model=sonnet`) for file discovery + parallel `Read` in main context for full reads.
skills/kzk-codebase-survey/SKILL.md:88:### Step 2 — Deep Read (parallel)
skills/kzk-codebase-survey/SKILL.md:90:Read every file in the scope list using parallel `Read` calls. Full file — no excerpts, no line limits.
skills/kzk-codebase-survey/SKILL.md:132:- `process.env.<VAR>` (Node.js)
skills/kzk-codebase-survey/SKILL.md:225:- Reading beyond one transitive hop → over-reading on large codebases (v1 scope limit)
skills/kzk-codebase-survey/SKILL.md:239:| `get_review_context` | Step 2 alt — token-efficient source snippets when scope is too large for full Read |
skills/kzk-production-access/SKILL.md:15:Default = forbidden. Read-only included.
skills/kzk-production-access/SKILL.md:21:**(a) Read-only inspection** (예: `aws s3 ls`, `aws rds describe-*`, `psql -c '\dt'`, `\d users`):
skills/kzk-web-loop/SKILL.md:46:**1b. EVALUATOR AGENT** (`oh-my-claudecode:critic`, `model=opus`) — fresh subagent with zero memory of previous cycles. Reads `.web-loop/cycle-N-report.md` + the built-in checklist (see §Evaluation Criteria). Outputs a prioritized issue list: P0 / P1 / P2.

codex
1. **Acceptance criteria 11개**
진단: 불충분. 구현/테스트/skill 본문은 일부 커버하지만, `uninstall-global.sh` 역경로, `settings.json` 재정렬 보장, path normalization, 기존 hook 공존/idempotency가 AC에 없다. AC11의 `atomic commit + main merge`는 spec acceptance가 아니라 release 절차다.
권고: AC11을 빼고 `uninstall cleanup`, `hook order enforcement`, `realpath normalization`, `settings merge/idempotency`를 넣어라.

2. **Read tracker 동작**
진단: `turn-id`를 env로 전달한다는 핵심 가정이 약하다. hook는 프로세스가 분리되므로 `UserPromptSubmit`에서 만든 env가 이후 `PostToolUse/PreToolUse`에 자동 전파된다는 보장이 없다. JSONL append/grep 자체도 동시 append, partial write, stale line 혼입에 취약하다.
권고: env 전파 가정 버리고 `current-turn.json` 같은 on-disk state를 atomic write로 관리해라. append는 `O_APPEND` + lock, 조회는 `turn file` 기준으로 해라.

3. **Bypass mechanism**
진단: `KZK_SKIP_READ_GUARD=1`의 “한 prompt만 자동 reset”은 현재 설계로는 성립 안 한다. env는 세션/프로세스 스코프라 single-use semantics가 없다.
권고: env 대신 “single-use bypass token file”로 바꿔라. `UserPromptSubmit`가 token 소비 후 삭제, `PreToolUse`는 same-turn token만 1회 허용. 아니면 bypass를 아예 수동 reinstall/temporary settings patch로 제한.

4. **신규 파일 Write 분기**
진단: `fs.existsSync(file_path)`는 TOCTOU다. 그리고 `Edit`와 `Write`를 같은 규칙으로 보면 안 된다. 존재하지 않는 파일에 대한 `Edit`는 allow 예외가 아니라 오류 경로다.
권고: `tool_name`별로 분기해라. `Write`만 `lstat` 기준 ENOENT allow, `Edit`는 기존처럼 read-required. path는 `realpath`/`resolve`로 정규화.

5. **Hook 등록 순서**
진단: 현재 append 방식으로는 “clear가 항상 first” 보장 못 한다. 재설치, 수동 편집, uninstall/reinstall 후 순서 흔들린다.
권고: append 말고 installer가 전체 `UserPromptSubmit` 배열을 재구성해서 canonical order를 강제해라. 더 낫게는 dispatcher hook 1개로 합쳐라.

6. **놓친 함정**
진단: `Read`/`Edit` path 형식 불일치(absolute/relative/symlink), uninstall이 `UserPromptSubmit`만 지우는 현재 구조, shell `grep/cat` 읽기는 tracker에 안 잡히는 skill 충돌이 빠졌다.
권고: skill 본문에 “guard는 `Read` tool만 인정” 명시, uninstall을 `PreToolUse/PostToolUse`까지 확장, path canonicalization을 spec에 고정해라.

Bottom-line: REVISE
tokens used
61,167
1. **Acceptance criteria 11개**
진단: 불충분. 구현/테스트/skill 본문은 일부 커버하지만, `uninstall-global.sh` 역경로, `settings.json` 재정렬 보장, path normalization, 기존 hook 공존/idempotency가 AC에 없다. AC11의 `atomic commit + main merge`는 spec acceptance가 아니라 release 절차다.
권고: AC11을 빼고 `uninstall cleanup`, `hook order enforcement`, `realpath normalization`, `settings merge/idempotency`를 넣어라.

2. **Read tracker 동작**
진단: `turn-id`를 env로 전달한다는 핵심 가정이 약하다. hook는 프로세스가 분리되므로 `UserPromptSubmit`에서 만든 env가 이후 `PostToolUse/PreToolUse`에 자동 전파된다는 보장이 없다. JSONL append/grep 자체도 동시 append, partial write, stale line 혼입에 취약하다.
권고: env 전파 가정 버리고 `current-turn.json` 같은 on-disk state를 atomic write로 관리해라. append는 `O_APPEND` + lock, 조회는 `turn file` 기준으로 해라.

3. **Bypass mechanism**
진단: `KZK_SKIP_READ_GUARD=1`의 “한 prompt만 자동 reset”은 현재 설계로는 성립 안 한다. env는 세션/프로세스 스코프라 single-use semantics가 없다.
권고: env 대신 “single-use bypass token file”로 바꿔라. `UserPromptSubmit`가 token 소비 후 삭제, `PreToolUse`는 same-turn token만 1회 허용. 아니면 bypass를 아예 수동 reinstall/temporary settings patch로 제한.

4. **신규 파일 Write 분기**
진단: `fs.existsSync(file_path)`는 TOCTOU다. 그리고 `Edit`와 `Write`를 같은 규칙으로 보면 안 된다. 존재하지 않는 파일에 대한 `Edit`는 allow 예외가 아니라 오류 경로다.
권고: `tool_name`별로 분기해라. `Write`만 `lstat` 기준 ENOENT allow, `Edit`는 기존처럼 read-required. path는 `realpath`/`resolve`로 정규화.

5. **Hook 등록 순서**
진단: 현재 append 방식으로는 “clear가 항상 first” 보장 못 한다. 재설치, 수동 편집, uninstall/reinstall 후 순서 흔들린다.
권고: append 말고 installer가 전체 `UserPromptSubmit` 배열을 재구성해서 canonical order를 강제해라. 더 낫게는 dispatcher hook 1개로 합쳐라.

6. **놓친 함정**
진단: `Read`/`Edit` path 형식 불일치(absolute/relative/symlink), uninstall이 `UserPromptSubmit`만 지우는 현재 구조, shell `grep/cat` 읽기는 tracker에 안 잡히는 skill 충돌이 빠졌다.
권고: skill 본문에 “guard는 `Read` tool만 인정” 명시, uninstall을 `PreToolUse/PostToolUse`까지 확장, path canonicalization을 spec에 고정해라.

Bottom-line: REVISE
