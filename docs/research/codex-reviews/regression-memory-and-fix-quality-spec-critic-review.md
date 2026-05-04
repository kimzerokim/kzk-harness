# Spec Critic Review — Cycle 1

> Date: 2026-05-04. Method: codex CLI 실패 (exit 144, stdin 대기) → `oh-my-claudecode:critic` opus fallback.
> Subject: `docs/plans/regression-memory-and-fix-quality-spec.md`
> **Verdict: REVISE**

## Critic 의 사실 확인 (메인이 별도 검증함)

- `install/scripts/` 디렉토리 부재 (실제 구조: `install/` 직속 `dependencies.sh`, `install-global.sh`, `hooks/`, `lib/`, `test/`)
- `which gstack` = not found in this environment
- `install/dependencies.sh` 에 gstack 자동 설치 entry **없음** (현재 entry: code-review-graph + codex)
- Hook 등록 메커니즘: `install-global.sh:619-642` `enable_hooks()` 함수가 `~/.claude/skills/.kzk-harness-shared/hooks/keyword-detector.mjs` 를 복사하고 `~/.claude/settings.json` 의 `hooks.UserPromptSubmit` 배열에 jq 로 append. PreToolUse/PostToolUse 등록 path 부재.

## 12 항목 진단

### 1. Architecture / 통합 결합도
4 axis 응집도는 합리. 분리 권고 없음. **Plan 진행 순서 변경**: A→D→B→C. 이유:
- B 의 Fix-start hook 이 D 의 regression-recall hook 과 같은 UserPromptSubmit 슬롯 → B 가 먼저면 D 가 덮어쓰거나 jq merge 충돌
- C (verifier) 는 A/B/D 모두를 검증하는 안전망 → 마지막

### 2. Axis A — TDD 자기검증 차단 — REJECT 수준
"Read 도구 호출 로그 audit" 은 메인 self-audit = 자기검증 또. Enforcement 후보:
- **(a) PreToolUse hook**: settings.json `hooks.PreToolUse` 등록, `Read` 호출 가로채서 path 매칭 시 deny. 가장 확실.
- **(b) Fresh subagent dispatch prompt**: sonnet executor 가 dispatch 받을 때 prompt 안에 "implementation file path 명시 + Read 차단" 룰. fresh agent 라 자기 prompt 위반 못 함. 더 simple.

권고: spec 에 (a) 또는 (b) 명시. 자기선언만이면 axis A 는 placebo.

### 3. Axis B — Fix scope 누수
**Fix-during hook 매 Edit 후 = latency 누적.** 자율 cycle 100회면 ~25분 추가. PostToolUse 발동 메커니즘도 install-global.sh 에 부재. 권고:
- Throttle: "같은 파일 첫 Edit 만 발동, sibling-callsite check"
- 또는 fix-during 제거 → fix-start + fix-verify + Pre-commit Gate 4.5 만으로 안전망 충분

### 4. Axis C — Fresh-agent verification
"단일/다중 cycle" 분기 기준 측정 불가능. 권고:
- `git diff --shortstat` 로 측정: 3 파일 미만 + 100 LoC 미만 → sonnet, 그 외 → opus

### 5. Axis D — Regression memory
False-positive 누적 처리 룰 부재. 권고:
- entry schema 에 `dismiss_count` 필드 추가
- recall 시 `confidence_decayed = confidence * (0.85 ** dismiss_count)`
- dismiss_count ≥ 3 → 자동 archived
- 사용자가 inject 시 X 표시할 수단

**더 큰 문제: gstack `/learn` schema 가 dismiss_count/confidence 를 받는지 미검증.** 가설 검증서가 가정만 함. spec 이 fields 임의 확장.

### 6. Cross-axis interference
**Axis A read 금지 룰 + Axis D 의 hook 코드 read 충돌.** 권고:
- Axis A anti-pattern 에 예외: "TDD red 단계가 아닌 경우, hook/install 인프라 코드 read 허용"
- 또는 Axis A 룰 적용 범위를 "feature 개발 task 의 TDD red 단계" 로 좁힘

### 7. Hook deployment 메커니즘 — CRITICAL
- 사용자가 `--enable-hooks` 안 한 환경에서 D plan commit → hook 코드 있는데 등록 안 됨, silently disabled
- keyword-detector.mjs 와 같은 UserPromptSubmit 슬롯 공존 룰 무답
- 권고: spec 에 명시
  - `install/install-global.sh` 의 `enable_hooks()` 에 `regression-recall.mjs` wire
  - 두 hook 을 `harness-shared` dispatcher 로 통합 OR 같은 settings.json UserPromptSubmit 배열에 append (룰: keyword-detector 먼저, regression-recall 다음)

### 8. Stale entry 검증 비용
매 hook 발동 시 git blame × N entries → recall latency 폭발. 권고:
- cron 또는 cycle 끝 단발. hook path 에서는 entry 의 캐시된 stale flag 만 read
- `install/scripts/` 디렉토리 신규 생성 명시 (현재 없음)

### 9. Skill count 동기화
신규 skill 2개 (B + D). 14→16 정확. 그러나 동기화 4 지점:
- `CLAUDE.md` line 3
- `CLAUDE.md` "All N skills" line
- `README.md` line 3
- `README.md` install command skill count

Plan B/D 각각의 §구현 변경 에 4 sync points 명시 누락.

### 10. Test 전략
- Plan D 의 `regression-recall.mjs` / `regression-stale-check.sh` = 코드, unit test 가능. 권고: `install/test/regression-recall.test.mjs` (기존 dir) + fixture (mock /learn JSONL)
- Plan A/B/C 의 SKILL.md = markdown. 권고: `install/test/` 에 hook 트리거 시뮬레이션 test (예: kzk-test-coverage 로드 시 Anti-pattern 섹션 존재 확인)

### 11. Rollback safety
spec line 279 "hook 제거 가능" 만으로 부족. Plan D hook 이 자가개선 cycle 자체를 break 하면 자가-회복 불가.
- 권고: `DISABLE_OMC=kzk-regression-memory` 또는 `OMC_SKIP_HOOKS=regression-recall` 환경변수로 즉시 비활성화 path. settings.json 수정 없이.

### 12. 놓친 함정
1. **gstack 미설치 환경** — `dependencies.sh` 에 gstack auto-install entry 없음. spec 이 dependencies.sh 수정한다고만 적고 무엇을 수정할지 무답. brew/npm 설치 path 도 없음.
2. **/learn CLI 시그니처 미검증** — `gstack-learnings-search --query <keyword>` 라고 spec 가정. 실제 시그니처 확인 안 됨. 권고: Plan D Step 0 에 `gstack learn --help` 출력 결과 박아놓고 정확한 sub-command 사용.
3. **Codex 계속 실패 시 same-vendor blind spot** — codex CLI 가 4 plan 모두에서 실패하면 critic opus self-review = 동일 벤더 누적. 권고: 최소 2개 plan 은 codex CLI 성공 강제 (인자 전달 방식 수정 — `printf '%s' "$prompt" | codex exec - -s read-only ...` stdin path 가능성).

## Pre-commitment Predictions (모두 적중)

(1) hook 등록 메커니즘 모호 ✓
(2) gstack `/learn` 의존성 검증 누락 ✓
(3) Axis A 룰의 enforcement 부재 ✓
(4) Cross-axis 충돌 (A × D) — spec 이 인지만 하고 답 없음 ✓
(5) Skill count 회계 — 정확하지만 sync 지점 4곳 명시 누락 ✓

## Bottom-line

**REVISE.** 4 axis 응집도는 OK. 결함은 인프라 가정 + enforcement 메커니즘 + plan 순서.

핵심 revision 포인트:
1. Plan 순서 A→D→B→C
2. Axis A enforcement = (b) fresh subagent dispatch prompt 룰 (가장 simple)
3. Axis B fix-during 제거 → fix-start + fix-verify + Gate 4.5 만
4. Axis C verifier 분기 = `git diff --shortstat` 기준
5. Axis D entry schema dismiss_count + confidence decay + gstack /learn 시그니처 검증 단계
6. Cross-axis A×D 룰 범위 좁힘
7. Hook deployment = install-global.sh `enable_hooks()` 확장 + dispatcher 통합 룰
8. Stale check = cron/cycle-end 단발
9. Skill count 4 sync 지점 명시
10. Test 전략 (regression-recall.test.mjs + skill 텍스트 검증)
11. Rollback = `OMC_SKIP_HOOKS=regression-recall` env path
12. Codex CLI stdin path 재시도 룰
