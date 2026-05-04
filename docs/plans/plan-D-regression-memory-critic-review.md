# Plan D Critic Review — Cycle 1 (codex CLI 성공)

> Date: 2026-05-04. Method: codex CLI stdin path (exit 0).
> Subject: `docs/plans/plan-D-regression-memory.md` (rev1, 1010 LoC, 15 tasks).
> Spec: rev6 frozen.
> **Verdict: REVISE**

## 12 항목 진단

### #1 spec rev6 acceptance cover — 부분 미달
- `dismiss_count ≥ 3 → archived` spec lock (line 29) 인데 Plan D task 에 mutation write path 없음. `dismiss` 명령 언급만 (line 160, 318)
- `stale` flag 가 sidecar 6필드 외 7th 필드로 덧붙여짐 (line 395-456)

권고: dismiss/archive mutation task 추가. sidecar schema 6필드 유지 vs 7필드 승격 명시.

### #2 Step 0 내부 모순
- Task 0 = gstack 없으면 Plan D 정지 (line 61)
- Task 7/10 = sidecar-only degraded mode 진행 (line 690, 794)

권고: backend lock 이면 recall 기능 stop, cycle retro WARN 만 degraded 허용.

### #3 Default DISABLED + 자동 enable — fail-closed 부재
- "4 plan" 잘못 (실제 5: A/D/B/C/E) — line 739, 751
- install-global.sh 가 jq 부재 / 중복 append 로 실패해도 merge block 안 함

권고: "5 plans" 정정. settings 등록 성공 + duplicate 없음 확인 실패 → merge block 못박기.

### #4 Recall hook orphan cleanup 위험
search hit key 기준이라 (line 345-348) 현재 query 에 안 걸린 정상 sidecar entry 까지 orphan 으로 삭제됨.

권고: `searchHits` / `allLearnKeys` 분리. cleanup 은 전체 `/learn` snapshot 기준. query normalization "raw prompt 전체" → 추출 keyword 규칙 명시.

### #5 자가-skip guard false positive
marker 에 명사 단독 ("자가개선", "메타 cycle") 들어감 (line 248-250). spec lock 은 동사구만.

권고: `KZK_AUTONOMOUS=1` 우선 + 동사구만 통일. 정상 bugfix prompt skip 위험 차단.

### #6 Orphan cleanup atomicity 부재
- hook 즉시 `writeFileSync` (line 297-303)
- stale-check 별도 tmp+mv (line 425-456)
- 동시 실행 시 유실

권고: sidecar writer 통일. `flock`/lockdir + temp + atomic rename 공용 규약.

### #7 gstack 미설치 silent skip 위반
recall path 의 `querylearn()` 가 실패 시 `null` 반환하고 끝 (line 278-289). silent skip 금지 lock 위반.

권고: hook 자체가 stderr WARN 의무. `_warn` 같은 structured reason 남김.

### #8 Fixture drift 룰 과함
"Plan D 변경 시 재캡처 의무" 너무 넓음.

권고: `/learn` actual schema, CLI signature, fixture 포맷 변경 시만 재캡처. Task 5 예시 = "illustrative only, Step 0 actual wins".

### #9 Cross-skill silent breakage
- `pre-merge-sync` auto-enable rerun 시 hook 중복 append 위험
- `large-task-delegation` reminder verbatim inject — prompt bloating 통제 없음
- `web-loop` cycle retro entry — `file_snapshot` canonical source 없음

권고: install idempotency / reminder size cap / retro snapshot sentinel 규칙 추가.

### #10 Rollback 6-level — 반쪽
표는 spec 베꼈지만 실제 설치 산출물 (`~/.claude/.../regression-recall.mjs`) + 중복 settings entry 정리 절차 없음.

권고: uninstall/cleanup 절차 rollback 표에 추가.

### #11 Skill count 동기화 (14→15) — none
정확.

### #12 놓친 함정
- **dismiss 경로 부재** (가장 큼) — `dismiss_count`/`last_dismissed_at`/`archived` 전부 dead field
- stale flag 가 sidecar schema 몰래 확장

frozen 전 정리 의무.

## Bottom-line

11개 결함 + 1 none. dismiss mutation path 부재 (#12) = spec/plan split-brain 위험. orphan cleanup race + atomicity (#4, #6) = 구현자 사고 위험. gstack silent skip (#7) = 사용자 lock 위반. 모두 frozen 전 정리.

**Bottom-line: REVISE → rev2 SHIP 도달 가능**
