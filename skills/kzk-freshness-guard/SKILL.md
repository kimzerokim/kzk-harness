---
name: kzk-freshness-guard
version: 1.2.0
description: "Stale 메타 문서 자동 감지 + CRG 심볼 역참조 + auto-fix — make sure to use this skill at Gate 0.5 (pre-commit staged-path stale check), kzk-spec-and-review Step 0 (spec/plan reference freshness), and kzk-pre-merge-sync §4 (pre-merge full sweep). For fix-start flows, this skill is invoked via kzk-codebase-survey (the hub) — 'fix 시작' direct trigger routes through codebase-survey, not here directly. Direct triggers for this skill: 'stale 체크', 'freshness guard', 'Gate 0.5', 'KZK_GATE05_SKIP', 'stale doc', pre-merge sweep. Detection logic: CRG reverseRefs → meta-doc grep → line-ref validation. Auto-fix per doc type (AGENTS.md row update, CLAUDE.md section rewrite, spec/survey line-ref refresh). References harness-share.md §30."
---

> Authoritative source: `harness-share.md` §30. On conflict, that wins.

# kzk-freshness-guard

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

## File path reference resilience (fallback path lookup)

stale 메타 문서 reference 의 file path 가 *not found* 일 때:

### 1. 명시 path missing → 즉시 halt 금지

명시 path 부재 시 즉시 ERROR / 사용자 prompt X. 다른 경로 탐색 의무 — file rename / 디렉토리 이동 가능성.

### 2. Fallback lookup 절차

a. **file basename 추출** — path 의 마지막 segment (예: `TextCellEditor.test.tsx`)
b. **lookup 시작점 = repo root 만** — `git rev-parse --show-toplevel`. 다른 repo / system-wide path 탐색 X. (사용자 결정: "이상한 곳" 부터 시작 금지)
c. **search 명령 (우선순위)**:
   1. `git ls-files | grep -F "<basename>"` — git tracked file (primary)
   2. `find <repo-root> -name "<basename>" -type f -not -path '*/node_modules/*' -not -path '*/.git/*'` — gitignored 포함 fallback (예: untracked 새 파일)
d. **결과 처리**:
   - **1 hit**: 그 path 로 reference update + WARN (`path moved: <old> → <new>`)
   - **다중 hit**: 가장 가까운 path 선택 (depth 짧은 / staged file 와 같은 디렉토리). WARN + 채택 path 명시
   - **0 hit**: file 자체 부재 (rename 가능성 0) → ERROR + reference 제거 권고 + user-queue `Q-FILE-MISSING-<basename>` entry 등록

### 3. Anti-pattern

- ❌ 명시 path not found → 즉시 사용자에게 "이 path 없는데 어떻게 할까요?" — fallback 의무 수행 후 결과 보고
- ❌ 명시 path 부터 시작 → 부재 → halt — 다른 경로 탐색 후 halt
- ❌ system-wide find / 다른 repo (`~/web/...`, `~/Library/...`) 탐색 — 항상 현재 repo root 부터

### 4. Trigger 시점

본 절차는 다음 trigger 에서 발동:
- §Detection Logic 의 staged file ↔ 메타 문서 reference 매칭 시 path 비교
- Gate 0.5 pre-commit 단계 stale check (kzk-pre-commit-gate cross-ref)
- pre-merge sweep (kzk-pre-merge-sync §4 cross-ref)
- 사용자 명시 stale 체크 trigger

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
