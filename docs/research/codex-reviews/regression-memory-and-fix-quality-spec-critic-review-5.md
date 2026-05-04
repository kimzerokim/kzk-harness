# Spec Critic Review — Cycle 5

> Date: 2026-05-04. Method: critic opus.
> Subject: rev5 of `docs/plans/regression-memory-and-fix-quality-spec.md`
> Cycle 4 verdict: REVISE (5분 lock).
> **Cycle 5 verdict: SHIP** ✅

## Cycle 4 답 매트릭스

| # | Cycle 4 결함 | 충분/불충분 | 근거 |
|---|---|---|---|
| #1 MAJOR pre-merge-sync 의무 | 충분 | Plan D 행 "주요 변경" 에 명시 추가 |
| #2 MAJOR 자율 키워드 false positive | 충분 | KZK_AUTONOMOUS 우선 + 키워드 동사구 좁힘 |
| #3 MAJOR orphan cleanup | 충분 | recall hook + stale-check 자동 GC + 자동만 / 수동 없음 |
| #5 MINOR acceptance 발췌 | 충분 (plan 흡수) | Plan C 위임 명시 |

**4/4 충분.**

## rev5 신규 결함

### #1 MINOR (plan 흡수 OK) — `KZK_AUTONOMOUS=0` 동작 미정
`(1) =1 우선, (2) 미설정 시 보조 키워드`. `=0` 명시 시 동작 ambiguity. Plan A Layer (b) 구현 시 한 줄 lock 가능.

### #2 MINOR (plan 흡수 OK) — orphan cleanup race
recall hook 자동 GC + stale-check 동시 실행 시 JSONL race. 1인 프로젝트 충돌 확률 낮음. Plan D 에서 file lock 또는 atomic rename 흡수.

### #3 — pre-merge-sync user confirm UX
none. line 125 "사용자 confirm" + line 127 "manual enable path" 로 해결.

### #4 — keyword-detector reverse on uninstall
none. Plan D rollback 책임.

**spec-level 신규 결함: zero.**

## 결함 수렴 곡선

| Cycle | 결함 수 |
|---|---|
| 1 | 12 |
| 2 | 8 |
| 3 | 7 |
| 4 | 4 |
| 5 | 0 |

정상 수렴.

## Bottom-line: SHIP ✅

5 cycle 만에 spec 완성도 plan 진입 임계 도달. 더 cycle 돌리면 over-specification.

Spec 에서 lock 된 결정 사항 (full):
- Backend = `/learn` + sidecar (split SoT)
- Plan 순서 A→D→B→C
- Hook DISABLED at D commit + 자동 enable on main 머지 via kzk-pre-merge-sync
- Layer (a) sonnet dispatch boilerplate + Layer (b) 자율 mode 메인 직접 TDD 금지
- 자율 키워드 동사구 좁힘 + KZK_AUTONOMOUS 우선
- Orphan 자동 GC (수동 path 없음)
- Fixture 재캡처 의무 (Plan D Step 0)
- 회고 5W1H (Who/When/What/How/실패시/Where)
- gstack 미설치 stderr WARN + entry 의무 (silent skip 금지)
- 6-level rollback
- Skill count 14→16, 4 sync 지점
- Verifier `git diff --shortstat` 분기 (3 파일/100 LoC)
- Pre-commit Gate 4.5 (scope sanity) + Gate 5 (fresh-agent verify)
- Codex CLI stdin path 재시도, 4 plan 중 2개 codex 성공 목표

다음 단계: Plan A → Plan D → Plan B → Plan C 순 작성 + 각 plan codex review → cycle 자율실행 → main 머지 (kzk-pre-merge-sync).
