# Plan B Critic Review — Cycle 1 (codex CLI 성공)

> Date: 2026-05-04. Method: codex CLI stdin path (exit 0).
> Subject: `docs/plans/plan-B-fix-scope-expansion.md` (rev1, 1167 LoC, 14 tasks)
> Spec: rev7 frozen.
> Raw output: `plan-B-fix-scope-expansion-critic-review-raw.md`.
> **Verdict: REVISE**

## 12 항목 진단

### #1 Axis B acceptance cover — 불완전
- spec 의 fix-verify 구현 task 없음
- auto-enable 문서 서술만, kzk-pre-merge-sync 수정 task 없음
- Task numbering 0-14 + acceptance 15 → 관리 흐림

권고: fix-verify 구현 task 추가, kzk-pre-merge-sync 수정 task 추가, numbering 정리.

### #2 D consumer 관계 — hidden hard dependency
fix-scope-trigger.mjs 가 regression-recall.mjs 를 runtime import. `--fix-scope-trigger` 단독 enable 시 파일 존재 보장 없음.

권고: 공용 로직 `install/lib/*` 분리 (둘 다 import) 또는 `--fix-scope-trigger` 가 regression-recall.mjs copy 존재 fail-closed 강제.

### #3 CRG status oracle — Step 0 vs Task 2 시그니처 모순
- Step 0 = status 로 실제 CLI 시그니처 확정
- Task 2 = 검증되지 않은 `--symbol` 경로
- build 후 재검증 실패 시도 silent fallback

권고: Step 0 확정 호출 형태 하나만 SoT lock. build 후 Files/Nodes 재검증 실패 시 `_warn` + grep fallback 명시.

### #4 Cache atomicity 실패
writeAtomic 재사용 = 원자적 파일 교체일 뿐 race 차단 X. D 의 race 차단은 `mutateSidecar()` 의 lockdir.

권고: cache 도 lockdir 경유. `writeSingleEntryWithLock()` wrapper 추가.

### #5 Gate 4.5 sanity 구멍
- commit body escape timing 애매
- cache `last fix wins` → multi-fix commit 마지막만 본다

권고: escape 입력을 gate 실행 전 명시값. multi-fix policy = append/list 재설계.

### #6 자동 enable — kzk-pre-merge-sync 수정 task 부재
D 는 있고 B 는 없음.

권고: 별도 task 추가. step 3 명령 + checklist 를 `--enable-hooks --regression-recall --fix-scope-trigger` 로.

### #7 Fix-verify hook 허상
acceptance / 설명만 있고 구현 task / 파일 / install / test 없음.

권고: 빼거나 만들거나 — explicit trigger, payload, test 추가.

### #8 Test 전략 약함
"mock prompt → expected grep 동작" 검증한다더니 실제 `execSync` 호출 자체 검증 X. stdin/stdout hook flow 안 돔. T12 무의미.

권고: command-runner 주입 으로 CRG/grep 선택 assert. hook JSON input/output 통합 test.

### #9 Cross-skill SoT 거짓말
- Task 1: harness-share authoritative source
- Task 9: kzk-codebase-survey source of truth
둘 중 하나는 거짓. README "up to 6 gates" stale.

권고: SoT 통일. gate count 4.5 반영.

### #10 Rollback 얕음
global install 산출물 cleanup 빠짐. settings.json entry 제거, shared hook 파일 제거, auto-enable reversal.

권고: 6번째 level = global cleanup/uninstall path 추가.

### #11 Skill count (15→16) — none
4 sync points 잡힘. run-tests.sh 까지. "6 gates" 같은 주변 문구도 동기화 범위에 포함.

### #12 놓친 함정
- `fix-scope-cache.json` 이름은 JSON 인데 실제 JSONL 단일행
- grep fallback `.md` 포함 → docs 언급 callsite 오염
- CRG Task 0 `--file`, Task 2 `--symbol` 내부 모순

권고: 포맷명/확장자 정리 (jsonl 확장자), grep 대상 docs 제외, CRG 계약 단일화.

## Bottom-line: REVISE → rev2 SHIP 도달 가능
