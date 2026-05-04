# Design: Brainstorm Flow 자동 체이닝 + Freshness Guard

> Date: 2026-05-05
> Status: Frozen (codex review rev1 applied)
> Author: brainstorming session (Opus 4.6 + user)

---

## 1. 개요

kzk-harness에 두 가지 기능 추가:

1. **kzk-spec-and-review 확장 (brainstorming 자동 체이닝)** — 탐색적 키워드 감지 시 `superpowers:brainstorming` 자동 호출 후 spec-and-review로 연결
2. **kzk-freshness-guard (신규 스킬)** — stale 메타 문서 자동 감지 + CRG 기반 심볼 역참조 + auto-fix. 모든 사용자 프로젝트에서 동작.

---

## 2. Feature 1: Brainstorming 자동 체이닝

### 2.1. 변경 대상

- `kzk-spec-and-review/SKILL.md` — Step -1 (brainstorming) 추가
- `install/hooks/keyword-detector.mjs` — 탐색적 키워드 추가

### 2.2. 키워드 분기

| 키워드 유형 | 예시 | 동작 |
|---|---|---|
| 탐색적 (brainstorm 먼저) | "어떻게 하면", "방법 찾자", "아이디어", "설계하자", "브레인스토밍", "고민", "어떤 방향" | Step -1 → brainstorming → Step 0 |
| 명확 (기존 flow) | "spec 잡자", "plan 만들어", "codex review" | Step 0부터 직접 진입 |

### 2.3. Step -1 동작

```
탐색적 키워드 감지
  ↓ keyword-detector → system-reminder: "LOAD kzk-spec-and-review (brainstorm mode)"
  ↓
kzk-spec-and-review 진입
  ↓ Step -1: Skill("superpowers:brainstorming") 호출
  ↓ brainstorming 완료 → design doc 경로 반환 (docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md)
  ↓
Step 0: codebase survey (기존, brainstorming design doc을 required reading에 포함)
Step 1-3: 기존 flow
```

### 2.4. Brainstorming 결과 연결

- brainstorming이 생성한 design doc 경로를 Step 1 Draft의 CONTEXT에 `Required reading: <design-doc-path>`로 포함
- brainstorming에서 결정된 사항은 codex consult prompt의 `LOCKED PRIOR DECISIONS`에 포함
- brainstorming 단계에서 사용자가 직접 "skip brainstorming" / "brainstorming 스킵" 하면 Step 0으로 즉시 이동

### 2.5. 변경 파일 목록

1. `skills/kzk-spec-and-review/SKILL.md` — Step -1 섹션 추가, 키워드 분기 로직, version bump
2. `install/hooks/keyword-detector.mjs` — 탐색적 키워드 패턴 추가 (기존 `kzk-spec-and-review` 매칭에 brainstorm mode flag 동봉)

---

## 3. Feature 2: kzk-freshness-guard

### 3.1. 목적

코드 변경 시 메타 문서(CLAUDE.md, AGENTS.md, spec, survey, auto-memory)가 stale 되는 것을 자동 감지하고 갱신. 모든 사용자 프로젝트에서 동작 (kzk-harness 전용 경로 참조 없음).

### 3.2. 감지 로직 (CRG 적극 활용)

```
1. 변경 파일 목록 수집 (staged diff / recent commits / manual scan)
2. CRG query (필수, 미설치 시 WARN + degraded grep mode):
   a. code-review-graph symbol-dependents <file> → 변경 파일의 exported 심볼
   b. 각 심볼의 reverse references → 어떤 파일이 이 심볼을 사용
3. 메타 문서 스캔:
   a. 변경된 파일 경로 grep → CLAUDE.md, AGENTS.md, docs/**, memory/**
   b. 변경된 심볼/함수명 grep → 같은 범위
   c. line number 참조 감지: <file>:<line> 또는 "line NNN" 패턴 → 변경 파일이면 stale 확정
4. 결과: stale 문서 목록 + 각각의 stale 이유
```

#### CRG 미설치 시 동작

- **WARN 출력**: `⚠️ [freshness-guard] CRG 미설치 — degraded mode (grep only). 정밀 심볼 역참조 불가. 설치: pip install --user code-review-graph && code-review-graph install`
- **fallback**: 파일명 grep + `git diff --cached -U0` hunk header에서 함수명 추출
- **silent skip 금지**: 항상 WARN 표시하여 사용자가 CRG 설치 필요성 인지

### 3.3. 자동 호출 지점 (6곳)

| 시점 | 트리거 | 입력 | 동작 |
|---|---|---|---|
| kzk-spec-and-review Step 0 전 | survey/spec 작성 직전 | 참조할 기존 spec/survey | stale이면 갱신 후 진행 + recursion guard 적용 |
| kzk-codebase-survey 시작 전 | survey 진입 시 | 기존 survey 리포트 | line reference 유효성 CRG 체크 + recursion guard 적용 |
| Plan execution 직전 | frozen plan 읽을 때 | plan이 참조하는 코드 | plan 작성 이후 코드 변경 감지 |
| Pre-commit Gate 0.5 | staged diff 기준 | staged 코드 파일 | BLOCK + auto-fix + 재커밋 |
| kzk-pre-merge-sync | merge 직전 | 전체 메타 문서 | CLAUDE.md + AGENTS.md + 전체 최종 점검 |
| 수동 트리거 | "stale 체크", "freshness", "문서 신선도" | 전체 | 전체 스캔 |

### 3.3.1. Edge case 가드

- **no-git repo**: `.git` 디렉토리 없으면 freshness guard 전체 skip + WARN
- **unborn HEAD**: `git rev-parse HEAD` 실패 시 skip + WARN (초기 커밋 전)
- **shallow history**: `git diff HEAD~5` 실패 시 `git diff --cached` 로 fallback
- **renamed/deleted files**: `git diff --diff-filter=R` + `--diff-filter=D` 감지, 삭제된 파일 참조는 stale 확정
- **recursion guard**: freshness check 실행 중 다른 freshness check 호출 금지. 전역 플래그 `_FRESHNESS_GUARD_RUNNING=true` 설정, 재진입 시 즉시 skip. depth=1 cap.

### 3.4. Auto-fix 전략 (문서 종류별 분기)

| 문서 종류 | 갱신 전략 | 실행자 |
|---|---|---|
| AGENTS.md | Gate 0 패턴: 행 단위 추가/삭제/갱신 | 메인 직접 (기존 Gate 0 로직) |
| CLAUDE.md | 변경된 섹션만 재작성 (라우팅 블록, 스킬 테이블 등) | executor (sonnet) |
| spec/survey (docs/) | line number 참조 갱신 + 변경된 코드 설명 반영 | executor (sonnet) |
| auto-memory (memory/) | CRG로 사실 검증 → stale이면 삭제 또는 내용 갱신 | 메인 판단 후 Write |
| plan (docs/plans/) | frozen → 갱신 금지, WARN만 출력 ("plan이 참조하는 코드 변경됨") | WARN only |

### 3.5. Pre-commit 통합 (Gate 0.5)

기존 Gate 순서에 삽입:

```
Gate 0: AGENTS.md sync (기존)
Gate 0.5: Freshness guard (신규)
  → staged 코드 파일 → CRG 심볼 역참조 → 메타 문서 stale 감지
  → stale 발견 시:
    1. 사용자에게 stale 목록 + 이유 명시적 표시
    2. auto-fix dispatch (문서 종류별 전략)
    3. fix 완료 후 갱신된 메타 문서를 같은 커밋에 stage
  → stale 없음: PASS
  → partial failure (일부 fix 성공, 일부 실패):
    1. 성공한 fix만 stage
    2. 실패한 fix는 WARN 출력 + user-queue entry 추가
    3. Gate 판정: WARN (commit 허용, 단 user-queue에 미해결 stale 기록)
Gate 1: ai-slop-cleaner (기존)
```

### 3.6. CRG 공통 유틸 라이브러리

`install/lib/crg-utils.mjs` — 모든 스킬이 공유:

```javascript
// --- Types ---
// DiffContext: 'staged' | 'base' | 'recent' (HEAD~5)
// SymbolInfo: { name: string, file: string, line: number, kind: 'function'|'class'|'export'|'type' }
// ReverseRef: { symbol: string, referencedIn: string, line: number, kind: string }
// StaleDoc: { path: string, reason: string, severity: 'BLOCK'|'WARN', symbols: string[] }
// LineRef: { docPath: string, targetFile: string, line: number, valid: boolean, currentLine?: number }

// 변경 파일 수집 (diff context별)
export function getChangedFiles(context: DiffContext): string[] { ... }

// 변경 파일 → exported 심볼 목록 (CRG query)
export function getChangedSymbols(files: string[]): SymbolInfo[] { ... }

// 심볼 → 역참조 파일+라인 목록 (CRG query)
export function reverseRefs(symbols: SymbolInfo[]): ReverseRef[] { ... }

// 변경 파일 → stale 메타 문서 목록 + 이유 + severity
export function findStaleMetaDocs(changedFiles: string[], metaGlobs: string[]): StaleDoc[] { ... }

// 문서 내 file:line 참조 → 현재 코드와 대조 + 수정 제안
export function validateLineRefs(docPath: string): LineRef[] { ... }

// CRG 설치 여부 체크 + WARN (미설치 시 false 반환)
export function ensureCRG(): boolean { ... }

// CRG DB 빌드/리빌드 (인덱스 없거나 stale 시)
export function ensureCRGIndex(rootDir: string): void { ... }

// 메타 문서에서 코드 참조 추출 (file paths, function names, line refs)
export function extractDocRefs(docPath: string): { files: string[], symbols: string[], lineRefs: LineRef[] } { ... }
```

**Canonical contract**: crg-utils.mjs가 CRG 사용의 단일 진입점. 다른 스킬은 직접 `code-review-graph` CLI를 호출하지 않고 이 라이브러리를 통해 접근.

#### CRG 활용 확산 (기존 스킬 강화)

| 스킬 | 현재 CRG 사용 | 추가 활용 |
|---|---|---|
| kzk-codebase-survey | Step 0.5, 1, 2 (이미 활용) | freshness check: survey 시작 시 기존 리포트 stale 검증 |
| kzk-fix-scope-expansion | callsite 전수 조회 (이미 활용) | impact radius: 변경 심볼의 reverse dep → 영향받는 메타 문서 자동 감지 |
| kzk-spec-and-review | 미사용 | spec reference 검증: spec 내 코드 참조를 CRG로 현재 코드와 대조 |
| kzk-large-task-delegation | 미사용 | scope estimation 정밀화: CRG dependency graph로 변경 영향 범위 자동 산출 |
| kzk-pre-commit-gate | 미사용 | Gate 0.5: CRG 심볼 역참조 기반 stale 메타 문서 감지 |
| kzk-pre-merge-sync | 미사용 | 최종 freshness sweep: merge 직전 전체 메타 문서 CRG 기반 검증 |

### 3.7. 범용성 (다른 프로젝트 동작)

- hook과 스킬 모두 `$PWD` 기반 — kzk-harness 전용 경로 참조 없음
- CRG 미설치 시 grep degraded mode + WARN (silent skip 금지)
- `memory/` 경로는 `~/.claude/projects/<project-hash>/memory/` (Claude Code 표준)
- 메타 문서 glob 패턴 기본값: `CLAUDE.md`, `AGENTS.md`, `docs/**/*.md`, `~/.claude/projects/*/memory/**/*.md`
- 프로젝트별 override: `.claude/settings.local.json`의 `freshness_guard.meta_globs` 키

---

## 4. 신규 파일 목록

| 파일 | 유형 | 설명 |
|---|---|---|
| skills/kzk-freshness-guard/SKILL.md | 신규 스킬 | 17번째 kzk 스킬 |
| install/lib/crg-utils.mjs | 공유 라이브러리 | CRG 래퍼 + stale 감지 core logic (순수 라이브러리, hook 무관) |
| install/hooks/freshness-guard.mjs | hook | hook adapter — crg-utils 호출 + Claude Code hook I/O 변환 (system-reminder 텍스트 생성) |
| install/test/freshness-guard.test.mjs | 테스트 | 감지 로직 단위 테스트 |
| install/test/crg-utils.test.mjs | 테스트 | CRG 유틸 단위 테스트 |

## 5. 수정 파일 목록

| 파일 | 변경 내용 |
|---|---|
| skills/kzk-spec-and-review/SKILL.md | Step -1 brainstorming 추가, CRG spec reference 검증 |
| skills/kzk-codebase-survey/SKILL.md | freshness check cross-ref 추가 |
| skills/kzk-fix-scope-expansion/SKILL.md | impact radius → 메타 문서 감지 cross-ref |
| skills/kzk-large-task-delegation/SKILL.md | CRG scope estimation cross-ref |
| skills/kzk-pre-commit-gate/SKILL.md | Gate 0.5 freshness guard 섹션 추가 |
| skills/kzk-pre-merge-sync/SKILL.md | freshness sweep cross-ref 추가 |
| install/hooks/keyword-detector.mjs | 탐색적 키워드 패턴 추가 |
| install/hooks/dispatcher.mjs | freshness-guard hook 등록 |
| install/install-global.sh | freshness-guard hook copy + manifest entry |
| install/dependencies.md | kzk-freshness-guard dependency 행 추가 |
| harness-share.md | §Gate 0.5 + §freshness guard 섹션 추가 |
| CLAUDE.md (project) | 스킬 카운트 16→17, freshness-guard 행 추가 |
| README.md | 스킬 카운트 + 테이블 행 추가 |

## 6. Acceptance Criteria

### Feature 1 (Brainstorming 체이닝)
- [ ] AC1: "어떻게 하면" 키워드 입력 시 keyword-detector가 brainstorm mode flag inject
- [ ] AC2: kzk-spec-and-review가 brainstorm mode 감지 시 Step -1 (brainstorming) 자동 호출
- [ ] AC3: brainstorming 결과 design doc 경로가 Step 1 Draft의 required reading에 포함
- [ ] AC4: "spec 잡자" 키워드는 기존대로 Step 0부터 진입 (regression 없음)
- [ ] AC5: "brainstorming 스킵" 시 Step 0으로 즉시 이동

### Feature 2 (Freshness Guard)
- [ ] AC6: staged diff → CRG 심볼 역참조 → stale 메타 문서 감지 동작
- [ ] AC7: CRG 미설치 시 WARN 출력 + grep degraded mode (silent skip 금지)
- [ ] AC8: Pre-commit Gate 0.5에서 stale 감지 시 BLOCK + 사용자에게 목록 표시 + auto-fix
- [ ] AC9: 수동 트리거 `stale 체크` / `freshness` / `문서 신선도` 입력 시 전체 스캔 동작
- [ ] AC10: auto-fix가 문서 종류별 분기 (AGENTS.md 행단위, spec line ref 갱신, memory 삭제/갱신, plan WARN only)
- [ ] AC11: kzk-harness 외 다른 프로젝트에서도 동작 ($PWD 기반)
- [ ] AC12: install/test/freshness-guard.test.mjs 전체 PASS
- [ ] AC13: crg-utils.mjs의 getChangedSymbols, reverseRefs, findStaleMetaDocs, validateLineRefs, ensureCRG 함수 동작

## 7. 구현 순서 (3-Phase)

### Phase 1: CRG 유틸 + 읽기 전용 감지 (이 스펙의 핵심)
1. `install/lib/crg-utils.mjs` + `install/test/crg-utils.test.mjs` (기반 라이브러리)
2. `kzk-freshness-guard/SKILL.md` (스킬 정의 — 감지 + WARN 동작만)
3. `install/hooks/freshness-guard.mjs` + `install/test/freshness-guard.test.mjs` (hook adapter — 감지 결과 → system-reminder)

### Phase 2: Pre-commit 통합 + hook wiring
4. `kzk-pre-commit-gate` Gate 0.5 통합
5. `install/hooks/keyword-detector.mjs` 탐색적 키워드 추가
6. `install/hooks/dispatcher.mjs` freshness-guard hook 등록
7. `install/install-global.sh` hook copy + manifest entry

### Phase 3: Auto-fix + cross-skill 확산
8. `kzk-spec-and-review` Step -1 brainstorming + CRG spec reference
9. 나머지 스킬 CRG cross-ref 추가 (codebase-survey, fix-scope, large-task, pre-merge-sync)
10. `harness-share.md` + `CLAUDE.md` + `README.md` + `dependencies.md` 갱신
11. 전체 테스트 + install 검증
