---
name: kzk-freshness-guard
version: 1.0.0
description: "Stale 메타 문서 자동 감지 + CRG 기반 심볼 역참조 + auto-fix — 모든 프로젝트 범용. Top triggers: 'stale 체크', 'freshness', '문서 신선도', 'stale check', 'freshness guard'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §30. On conflict, that wins.

# kzk-freshness-guard

## Triggers

`stale 체크`, `freshness`, `문서 신선도`, `stale check`, `freshness guard`,
`stale doc`, `meta stale`, `문서 갱신`, `doc refresh`, `freshness scan`.

## Why

코드 변경 시 메타 문서(CLAUDE.md, AGENTS.md, spec, survey, memory)가 stale 되는 5대 메타갭 중 하나. CRG 심볼 역참조로 코드 변경의 영향을 받는 메타 문서를 자동 감지하고 갱신. 모든 프로젝트에서 동작 ($PWD 기반).

## Detection Logic

```
1. 변경 파일 목록 수집 (staged diff / recent commits / manual scan)
2. CRG query (필수, 미설치 시 WARN + degraded grep mode):
   a. crg-utils.getChangedSymbols(files) → 변경 파일의 exported 심볼
   b. crg-utils.reverseRefs(symbols) → 심볼 역참조 파일 목록
3. 메타 문서 스캔 (crg-utils.findStaleMetaDocs):
   a. 변경된 파일 경로 grep → CLAUDE.md, AGENTS.md, docs/**, memory/**
   b. 변경된 심볼/함수명 grep → 같은 범위
   c. line number 참조: file:line 패턴 → 변경 파일이면 stale 확정
4. 결과: stale 문서 목록 + 각각의 stale 이유 + severity (BLOCK/WARN)
```

## CRG 미설치 시 동작

- WARN 출력: `⚠️ [freshness-guard] CRG 미설치 — degraded mode (grep only). 정밀 심볼 역참조 불가.`
- Fallback: 파일명 grep + git diff --cached -U0 hunk header에서 함수명 추출
- Silent skip 금지

## 자동 호출 지점 (6곳)

| 시점 | 트리거 | 동작 |
|---|---|---|
| kzk-spec-and-review Step 0 전 | survey/spec 작성 직전 | stale이면 갱신 후 진행 + recursion guard |
| kzk-codebase-survey 시작 전 | survey 진입 시 | line reference 유효성 CRG 체크 + recursion guard |
| Plan execution 직전 | frozen plan 읽을 때 | plan 작성 이후 코드 변경 감지 |
| Pre-commit Gate 0.5 | staged diff 기준 | BLOCK + auto-fix + 재커밋 |
| kzk-pre-merge-sync | merge 직전 | CLAUDE.md + AGENTS.md + 전체 최종 점검 |
| 수동 트리거 | "stale 체크" 등 | 전체 스캔 |

## Edge Case 가드

- no-git repo: `.git` 없으면 전체 skip + WARN
- unborn HEAD: `git rev-parse HEAD` 실패 시 skip + WARN
- shallow history: `git diff HEAD~5` 실패 시 `git diff --cached` fallback
- renamed/deleted files: `--diff-filter=R/D` 감지, 삭제 파일 참조 = stale 확정
- recursion guard: `_FRESHNESS_GUARD_RUNNING=true` 전역 플래그, depth=1 cap

## Auto-fix 전략 (문서 종류별)

| 문서 종류 | 갱신 전략 | 실행자 |
|---|---|---|
| AGENTS.md | Gate 0 패턴: 행 단위 | 메인 직접 |
| CLAUDE.md | 변경 섹션만 재작성 | executor (sonnet) |
| spec/survey | line ref 갱신 + 코드 설명 반영 | executor (sonnet) |
| auto-memory | CRG 사실 검증 → 삭제/갱신 | 메인 판단 후 Write |
| plan | frozen → 갱신 금지, WARN만 | WARN only |

## Pre-commit Gate 0.5

- Gate 0 (AGENTS.md sync) 와 Gate 1 (ai-slop) 사이 삽입
- staged 파일 → CRG 심볼 역참조 → stale 감지
- stale 발견: BLOCK + 목록 표시 + auto-fix dispatch + restage
- Partial failure: 성공분만 stage, 실패분 WARN + user-queue
- stale 없음: PASS

## CRG Canonical Contract

- `install/lib/crg-utils.mjs` = CRG 사용의 단일 진입점
- 다른 스킬은 직접 `code-review-graph` CLI 호출 금지 → crg-utils 통해 접근

## Interaction with other kzk-*

- **kzk-pre-commit-gate**: Gate 0.5 소유
- **kzk-spec-and-review**: Step 0 전 freshness check, Step -1 brainstorming 후 spec reference 검증
- **kzk-codebase-survey**: survey 시작 전 기존 리포트 stale 검증
- **kzk-fix-scope-expansion**: impact radius → 메타 문서 감지
- **kzk-large-task-delegation**: CRG scope estimation
- **kzk-pre-merge-sync**: merge 직전 전체 freshness sweep
- **kzk-tool-retry**: freshness hook 실패 시 1-retry

## Rollback

- Hook 즉시 비활성: `OMC_SKIP_HOOKS=freshness-guard`
- Skill 비활성: `DISABLE_OMC=kzk-freshness-guard`
- Gate 0.5 skip: `KZK_GATE05_SKIP=1` env flag
