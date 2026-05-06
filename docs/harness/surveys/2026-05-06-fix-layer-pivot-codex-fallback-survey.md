# Survey — fix-layer-pivot-codex-fallback

**Date**: 2026-05-06  
**Scope**: New skill `kzk-fix-layer-pivot-codex-fallback` — codebase survey across 6 categories.  
**Status**: Facts only. No draft, no recommendation. Step 1 draft dispatch reads this file.

---

## Section 1 — 17 kzk-* cross-ref

| Skill | Trigger 충돌 | 본문 중복 가능성 | Cross-ref §Section 후보 | Codex 호출 룰 보유 |
|---|---|---|---|---|
| `kzk-spec-and-review` | 없음 (brainstorm/spec/plan 계열 전용) | §Codex execution shape 전체 — **새 스킬이 직접 재사용 대상** | §Codex execution shape, §Timeout+stuck, §Hard rules 5종 | **YES — primary owner** |
| `kzk-fix-scope-expansion` | **`fix 시작`** 직접 충돌 (kzk-fix-scope-expansion §Triggers line 1) | fix-start hook 진입점 공유. callsite 전수 조회 = 새 스킬 FIX-LABEL 기록 시점과 겹침 | §Fix-start hook, §Recall consumer 관계, §Default DISABLED | 없음 |
| `kzk-regression-memory` | **`fix 시작`**, **`recall`**, **`버그 수정`**, **`regression fix`** 직접 충돌 | fix-start 시점 hook 진입. 순서: regression-recall → fix-scope-trigger → (새 스킬). decay/dismiss 패턴은 새 스킬 fail-count 설계와 구조적 유사 | §Recall 룰 (hook 진입 순서), §자가-skip guard, §Storage 모델 | 없음 |
| `kzk-large-task-delegation` | 없음 | Codex CLI plan-critic loop (§Pre-implementation plan-critic loop). Codex fallback = `oh-my-claudecode:critic` opus — 새 스킬 fallback ladder와 동일 구조 | §Pre-implementation plan-critic loop, §Model routing, §Stage 3 verifier | **YES — plan-critic loop에서 codex 사용** |
| `kzk-autonomous-boundary` | 없음 (autonomous mode 전용) | §Halt conditions 표 — 새 스킬에서 `Q-FIX-PIVOT-FAIL` 추가 후보 (2회 fail = Codex 위임 → Codex도 실패 = halt or queue) | §Halt conditions 표 (Q-VERIFIER-FAIL 패턴 참조), §Allowed actions | 없음 |
| `kzk-tool-retry` | 없음 (tool fail = single call 재시도) | **구분 필요**: kzk-tool-retry = 단일 tool call 1회 재시도. 새 스킬 = strategy-level fail 2회 → Codex 위임. 개념 다름. | §Default policy ("Tool failure is data"), §Queue-on-double-failure | 없음 |
| `kzk-pre-commit-gate` | 없음 | Gate 4.5 fix-scope sanity. 새 스킬 FIX-LABEL과 Gate 4.5 callsite mismatch 감지는 다른 축 | §Gate 4.5, §Gate 5 (verifier) | 없음 |
| `kzk-codebase-survey` | `fix 시작`, `버그 수정`, `callsite 전수` 충돌 | Step 0.5 → EXPLORER dispatch shape. 새 스킬 Codex 위임도 EXPLORER 안에서 호출하므로 EXPLORER dispatch 룰 적용 | §EXPLORER Agent, §Preparation phase delegation | 없음 |
| `kzk-freshness-guard` | 없음 | fix 시 변경 심볼 impact radius → 메타 문서 stale 감지. 새 스킬 layer ladder와 직접 연결 없음 | §Pre-commit Gate 0.5 cross-ref | 없음 |
| `kzk-pre-merge-sync` | 없음 | PR 직전 deepinit. 새 스킬과 직접 교차 없음 | 없음 | 없음 |
| `kzk-production-access` | 없음 | production access boundary. 교차 없음 | 없음 | 없음 |
| `kzk-test-coverage` | 없음 | TDD sequence. 교차 없음 | 없음 | 없음 |
| `kzk-playwright-verification` | 없음 | Gate 4 browser smoke. 교차 없음 | 없음 | 없음 |
| `kzk-autonomous-loop` | 없음 | rate-limit polling / context compact. 교차 없음 | 없음 | 없음 |
| `kzk-background-monitoring` | 없음 | **codex consult special case** 항목 있음 — codex 5min stuck 규칙을 kzk-spec-and-review §Codex execution shape으로 위임. 새 스킬도 동일 cross-ref 필요 | §Codex consult special case | 없음 (cross-ref만) |
| `kzk-user-queue` | 없음 | Q-entry 패턴 — 새 스킬 Codex fail = Q-FIX-PIVOT-CODEX-FAIL entry 후보 | §Q-entry 구조, §Max 3 iterations | 없음 |
| `kzk-web-loop` | 없음 | Reviewer FAIL 2× skip 패턴. 새 스킬 2-fail → Codex 위임과 패턴 유사하나 목적 다름 | 없음 | 없음 |

### 본문 발췌 (verbatim)

#### kzk-spec-and-review §Codex execution shape — Hard rules 5종

```
### Hard rules

1. **Prompt via stdin pipe** (`cat file | codex exec ... -`). Never pass multi-line prompt as `codex exec "$VAR"` — shell escaping breaks on newlines, quotes, backticks.
2. **`--json` output → file → jq**. Never `--json | jq` direct pipe — codex emits NDJSON (one JSON object per line), jq expects single JSON by default and chokes.
3. **`--ephemeral`** always — prevents session file accumulation from automated runs.
4. **Short single-line prompt exception**: `codex exec "short prompt" < /dev/null` is safe. Multi-line → always use stdin pipe.
5. **Plain text mode preferred** for review use cases — simpler, no NDJSON parsing needed. Use JSON mode only when you need structured fields (token counts, thread IDs).
```

#### kzk-spec-and-review §Codex execution shape — Timeout + stuck

```
### Timeout + stuck detection

- `timeout: 300000` (5 min). Background-monitor per `kzk-background-monitoring`.
- No first token in 60s → kill + retry once. No output in 5 min total → stuck, kill + fallback to critic agent.
- Empty stdout or non-zero exit: save error stub to verdict file ("codex exit <N>, stderr: <first 200 chars>") then fall back to `Agent(subagent_type="oh-my-claudecode:critic", prompt=<same review prompt>)` (model 생략 → 메인 opus 버전 상속).
```

#### kzk-spec-and-review §Codex execution shape — Plain text mode (재사용 핵심)

```bash
# 1. Write prompt to file (from §Codex prompt skeleton above)
cat > /tmp/<topic>-review-prompt.txt << 'EOF'
<prompt content>
EOF

# 2. Pipe stdin → codex exec, redirect stdout to file
cat /tmp/<topic>-review-prompt.txt \
  | codex exec \
    -s read-only --ephemeral \
    -C <repo-root> \
    -c 'model_reasoning_effort="high"' \
    - \
    2>/tmp/codex-err.txt \
    > /tmp/codex-out.txt
CODEX_EXIT=$?

# 3. Check exit + non-empty output
if [ $CODEX_EXIT -ne 0 ] || [ ! -s /tmp/codex-out.txt ]; then
  # → fallback to critic agent
fi
```

#### kzk-tool-retry §Triggers + 1-retry 룰 (단일 tool fail vs strategy fail 구분용)

```
## Default policy

**Every tool failure = 1 automatic retry, no user prompt in between.** Only after the retry also fails do you log to `docs/harness/user-queue.md` (or repo equivalent) and proceed to the next task. Asking the user "should I retry?" between attempts breaks autonomous discipline.
```

```
## Interaction with other kzk-*

- **kzk-user-queue**: queue destination after the retry also fails.
- **kzk-autonomous-boundary**: polite-stop ban is enforced jointly. This skill specifies the auto-retry; that one specifies the broader "do not stop politely".
- **kzk-background-monitoring**: long-running task stuck detection is parallel. This skill = single tool call retry; that one = process lifecycle.
```

#### kzk-fix-scope-expansion §Triggers (fix-start trigger 충돌 점검)

```
## Triggers

`fix 시작`, `callsite 전수`, `Gate 4.5`, `fix-scope-cache`, `callsite mismatch`, `KZK_GATE45_SKIP`,
`버그 수정`, `에러 fix`, `regression fix`, `함수 수정 영향`, `fix-start`, `fix scope`, `한 callsite`,
`호출자 전수`, `callsite 누락`, `fix 범위`, `fix scope 누수`.
```

```
### recall consumer 관계 (Plan D)

fix-scope-trigger.mjs 는 regression-recall.mjs **다음 슬롯** 에 `UserPromptSubmit` 배열 등록.
Plan D recall 결과가 먼저 inject 된 후, B 의 callsite reminder 가 그 다음 슬롯에서 inject.
```

#### kzk-regression-memory §Recall 룰 (fix-start hook 진입 순서)

```
## Recall 룰

UserPromptSubmit hook (`install/hooks/regression-recall.mjs`) 발동 시:

1. 자가-skip guard 평가 (아래 §자가-skip guard) — 매칭 시 즉시 skip
2. user prompt **normalization**: `prompt.slice(0, 200)` + 공백 split + FIX_KEYWORDS / 정규식 기반 키워드 추출. raw prompt 전체 사용 X (codex #4 답)
3. `direct JSONL read from ~/.gstack/projects/*/learnings.jsonl` (hook reads files directly, no CLI)
```

진입 순서: **regression-recall → fix-scope-trigger → (새 스킬 FIX-LABEL 기록)**.  
새 스킬이 UserPromptSubmit hook을 추가한다면 fix-scope-trigger 다음 슬롯 등록 필요.

#### kzk-autonomous-boundary §Halt conditions 표 — Q-FIX-PIVOT-FAIL 추가 가능성

기존 표 패턴 (Q-VERIFIER-FAIL 참조):
```
| `Q-VERIFIER-FAIL` | `kzk-large-task-delegation` §Stage 3 / `kzk-pre-commit-gate` §Gate 5 의 verifier 가 같은 thread 안에서 2 consecutive FAIL | halt + user-queue entry ... commit BLOCK 유지 | PASS 또는 user-approved plan revision |
```

새 스킬의 `Q-FIX-PIVOT-FAIL` (Codex 위임도 실패한 경우) 추가 후보 위치: §Halt conditions 표. 패턴은 Q-VERIFIER-FAIL과 동일 구조 (trigger / action / resume 3열).

#### kzk-large-task-delegation §Stage 3 verifier (Codex 답 verifier 검증 흐름)

```
## Model routing (mandatory split for subagent dispatch)

| Phase | Subagent type | Model | Cross-check |
|---|---|---|---|
| Semantic verify | `oh-my-claudecode:verifier` | **opus** | Codex CLI consult on uncertain assertions |
| Quick research / file search | `oh-my-claudecode:explore` | **sonnet** (deep reads) / **haiku** (targeted lookups) | none |
```

Codex 답 sanity-check 흐름: Codex 응답 → 새 스킬 자체 sanity check (명백 오류 거름) → 채택. verifier subagent 별도 dispatch는 LOCKED 결정 외에는 강제 아님.

---

## Section 2 — Codex CLI 환경 + 재사용 인프라

### 설치 상태

- **which codex**: `/Users/kimzerokim/.nvm/versions/node/v22.22.1/bin/codex`
- **codex --version**: `codex-cli 0.128.0`
- 설치 경로: nvm node v22.22.1 전역 설치

### install/lib/ 재사용 가능 helper (Codex CLI 호출 관련)

`/Users/kimzerokim/work/personal/kzk-harness/install/lib/` 파일 목록:
- `cache-write.mjs` — lockdir + tmp + atomic mv (JSONL append)
- `claude-md-marker.sh` — CLAUDE.md marker 주입
- `crg-utils.mjs` — code-review-graph 유틸
- `hook-shared.mjs` — FIX_KEYWORDS / shouldSkip / detectFixIntent / normalizeQuery (단일 SoT)
- `precedence-probe.sh` — hook precedence 탐지
- `sidecar-write.mjs` — sidecar atomic write
- `turn-state.mjs` — turn state 관리

**Codex CLI 직접 호출 helper는 없음** — `install/lib/`에 codex exec wrapper .mjs 없음.  
`install/bin/`에도 codex wrapper 없음 (`kzk-regression-memory.mjs` dismiss CLI만 존재).

Codex 호출 인프라는 `kzk-spec-and-review §Codex execution shape`의 bash 패턴이 전부. 새 스킬은 이 bash 패턴을 EXPLORER subagent 안에서 그대로 재사용.

### §Codex execution shape Hard rules 재사용 매핑

| Hard rule | 새 스킬 적용 여부 | 비고 |
|---|---|---|
| 1. stdin pipe (`cat file \| codex exec ... -`) | **그대로 재사용** | FIX-LABEL + 실패 컨텍스트를 /tmp 파일로 write 후 pipe |
| 2. `--json` → file → jq (NDJSON) | plain text mode 사용으로 N/A | review 용도 = plain text 충분 |
| 3. `--ephemeral` 항상 | **그대로 재사용** | 자동 실행 중 session 파일 축적 방지 |
| 4. 짧은 단일 라인 예외 | N/A (fix 컨텍스트는 멀티라인) | |
| 5. plain text mode 선호 | **그대로 재사용** | |
| timeout 60s no-first-token → kill+retry once | **그대로 재사용** | |
| 5min total → stuck → fallback to critic opus | **그대로 재사용** | 새 스킬 fallback ladder의 최종 단계 |
| empty stdout / non-zero exit → error stub → fallback | **그대로 재사용** | |

---

## Section 3 — mattpocock/skills

- **find 결과**: 설치 없음. `~/.claude`, `~/.config`, `~/Library/Application Support`, `~/.npm`, `~/.local` 하위 maxdepth 8 탐색 — mattpocock 디렉토리 0건.
- **SKILL.md grep**: mattpocock 포함 SKILL.md 0건.
- **결론**: `npx skills@latest add mattpocock/skills` 미실행 상태. 설치 위치 없음.

---

## Section 4 — Hook 진입점

### keyword-detector.mjs 구조

파일: `/Users/kimzerokim/work/personal/kzk-harness/install/hooks/keyword-detector.mjs`  
전체 147줄 (verbatim 가독 가능 크기).

**구조**: `RULES` 배열 (7개 rule 객체). 각 rule = `{ skills: string[], why: string, triggers: string[] }`.  
`detect(input)` 함수: input에 trigger 포함 시 → skill → `matched` Map 에 accumulate → 배열 반환.  
`buildReminder(matches)` → `🚨 [kzk] LOAD before edit: <skillNames> (matched: <triggers>)` 형태 system-reminder inject.  
brainstorm-mode 감지: `why.startsWith("brainstorm-mode:")` rule 매칭 시 "Mode: brainstorm — Step -1 brainstorming 자동 호출" 추가 라인.

**새 스킬 trigger 추가 위치**: `RULES` 배열에 새 객체 추가:
```js
{
  skills: ["kzk-fix-layer-pivot-codex-fallback"],
  why: "fix layer pivot + codex fallback — FIX-LABEL 기록 후 2-fail = Codex 위임",
  triggers: [
    "fix 시작", // ← 이미 kzk-fix-scope-expansion + kzk-regression-memory 잡음 — 중복 주의
    "wrong layer", "삽질", "layer 바꿔", "layer pivot",
    "codex fallback", "fix 방향 바꿔", "다른 방향으로 fix",
  ],
}
```
단, `fix 시작`은 기존 2개 스킬이 이미 잡고 있어 새 rule에 포함 시 3개 스킬이 동시 inject됨 — SKILL.md §Triggers 설계 시 결정 필요.

### regression-recall.mjs hook 순서

파일: `/Users/kimzerokim/work/personal/kzk-harness/install/hooks/regression-recall.mjs`  
UserPromptSubmit hook. `hook-shared.mjs`에서 `FIX_KEYWORDS`, `shouldSkip`, `detectFixIntent`, `normalizeQuery` import.

**진입 순서** (settings.json UserPromptSubmit 배열 순서 기반):
1. `regression-recall.mjs` — 과거 fix recall inject
2. `fix-scope-trigger.mjs` — callsite 전수 조회 inject  
3. `keyword-detector.mjs` — skill load reminder inject
4. **(새 스킬 hook이 있다면)** fix-scope-trigger 다음 슬롯

`kzk-fix-scope-expansion §Recall consumer 관계` 명시: "fix-scope-trigger.mjs 는 regression-recall.mjs **다음 슬롯**에 등록". 새 스킬 hook은 fix-scope-trigger 다음 슬롯.

새 스킬의 hook 필요성: LOCKED 결정 사항인 "fix 시작 시 FIX-LABEL 1줄 작성"은 UserPromptSubmit hook이 아닌 **메인 컨텍스트 룰** (LLM이 직접 수행)이므로 hook 추가 불필요. Codex 위임은 fail count 기반 = 실행 중 트리거. hook은 선택적.

---

## Section 5 — 파일 배치

### 글로벌 vs 본 repo 동기화 메커니즘

**본 repo 내 스킬 위치**: `/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-*/SKILL.md` (17개 디렉토리)

**글로벌 설치 위치**: `~/.claude/skills/kzk-*/SKILL.md`

**동기화 메커니즘** (`install/install-global.sh` `sync_skills()` 함수, line 271–327):
- source: `$SOURCE_REPO_DIR/skills/kzk-*/SKILL.md`
- dest: `$HOME/.claude/skills/<name>/SKILL.md`
- 방식: **file copy** (symlink 아님 — `--symlink-mode`도 SKILL.md는 file-copy, harness-share.md만 symlink)
- 버전 비교: `sort -V` 기반. local version > source version이면 skip (preserve). 같거나 낮으면 copy.
- 보조 파일: `src_dir/*` (SKILL.md 제외) 도 copy.

**새 스킬 배치 절차**:
1. `/Users/kimzerokim/work/personal/kzk-harness/skills/kzk-fix-layer-pivot-codex-fallback/SKILL.md` 생성
2. `bash install/install-global.sh --update` 실행 → `~/.claude/skills/kzk-fix-layer-pivot-codex-fallback/SKILL.md` copy됨
3. `install-global.sh` 내 skill count 검증 라인 업데이트 (17→18)
4. `CLAUDE.md` skill count 및 표 업데이트
5. `README.md` skill count 및 표 업데이트

### install/dependencies.md codex 등록 (verbatim 5줄)

```
### codex CLI (recommended)

- **Purpose**: Cross-vendor second opinion on plans / specs / architecture (different model family from Claude → catches different blind spots).
- **Used by**: `kzk-spec-and-review` (primary), `kzk-large-task-delegation` (plan-critic loop).
- **Install**: `npm install -g @openai/codex` (npm path) or `brew install codex` (Homebrew path).
- **Fallback if missing**: Skills fall back to `Agent(subagent_type="oh-my-claudecode:critic", model="opus", ...)`. Same review structure, just same-vendor (Claude opus reviewing Claude opus).
```

새 스킬 추가 시 `install/dependencies.md` 의 per-skill dependency matrix 표에 행 추가 필요:
```
| `kzk-fix-layer-pivot-codex-fallback` | — | codex CLI OR OMC (`critic` agent — at least one required) |
```

---

## Section 6 — design doc 자리

### 디렉토리

`/Users/kimzerokim/work/personal/kzk-harness/docs/superpowers/specs/` — 존재 확인.

### 기존 spec 파일명 예

```
2026-05-03-kzk-web-loop-design.md
2026-05-04-kzk-codebase-survey-design.md
2026-05-04-kzk-global-install-design.md
2026-05-05-brainstorm-flow-freshness-guard-design.md
```

**네이밍 패턴**: `YYYY-MM-DD-<kebab-topic>-design.md`

**새 스킬 design doc 경로**: `/Users/kimzerokim/work/personal/kzk-harness/docs/superpowers/specs/2026-05-06-fix-layer-pivot-codex-fallback-design.md`

---

## 부록 A — fix-start trigger 충돌 정리

`fix 시작` 키워드를 현재 잡는 스킬:
1. `kzk-regression-memory` — recall hook inject
2. `kzk-fix-scope-expansion` — callsite 전수 조회 inject
3. `kzk-codebase-survey` — survey 선행 inject (§Triggers line)

새 스킬이 `fix 시작`도 trigger로 등록 시 → 4개 스킬 동시 inject. SKILL.md 초안 시 `fix 시작` 포함 여부 결정 필요. 대안: `layer pivot`, `wrong-layer fix`, `같은 방향 삽질`, `fix 방향` 등 새 스킬 고유 trigger로 제한.

## 부록 B — EXPLORER subagent 안에서 Codex 호출 패턴

LOCKED: Codex 호출은 fresh subagent (oh-my-claudecode:explore 또는 helper) 안에서.  
`kzk-large-task-delegation §Model routing`: `oh-my-claudecode:explore` model=sonnet (deep reads) / haiku (targeted).  
Codex 호출은 실행 시간이 길어 (`kzk-background-monitoring §Scope` — `codex exec` = long-running) subagent 안에서 `run_in_background` + Monitor 패턴 또는 foreground 실행.  
EXPLORER subagent dispatch prompt에 포함 의무: FIX-LABEL 텍스트, 실패 횟수 N, 실패 컨텍스트 (어떤 fix를 어느 방향으로 시도했고 어떻게 실패했는지).

