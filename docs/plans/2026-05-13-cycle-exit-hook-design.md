# Cycle-Exit Hook + 4 Sub-check Sub-system — Design & Plan

**Date**: 2026-05-13
**Author**: kzk-harness self-improvement cycle (post cycle 25 회귀 postmortem)
**Status**: DRAFT — pending user review + codex cross-vendor review
**Plan path**: `docs/plans/2026-05-13-cycle-exit-hook-design.md` (canonical per harness-share.md §5)
**Branch contract**: main 직접 commit, PR 없이, default propagate (3-slot 답: 2026-05-13 user)

---

## 0. Context

Cycle 25 (grid-lock + row API refactor) 종료 후 6건 회귀 release 됨 — 셀편집 전면 불가 (P1), lock 버튼 disabled, history UI 스타일 mismatch, toolbar 크기 drift, viewId undefined → 500, Export border 누락. 포스트모템: `(외부 프로젝트 postmortem 인용)`.

5가지 검출 gap (G1–G5):
- **G1**: large-cycle exit fresh-agent verifier 부재 — cycle 25 final commit 후 user-persona test 없음
- **G2**: Endpoint deletion 시 callsite 전수 sweep 안 함 — CRG `query_graph(callers_of)` 미사용
- **G3**: Dev watch (`npm run start:dev`) ≠ prod dist (`node dist/main`) divergence 안 잡힘
- **G4**: "Phase 2 에서 활성화" 같은 stub 이 release 까지 살아남음 — cycle 종료 sweep 없음
- **G5**: SoT (`feature-list.md` F17) "wip" 인데 코드는 release — Gate 0a manual self-check 누락

본 plan 의 목표: harness 가 cycle 25 류 회귀를 **반복 못 하게** enforcement layer 한 단계 추가. `kzk-pre-merge-sync` 의 trigger 를 conversational keyword → hook-driven enforcement 로 승격.

---

## 1. Goal

**One-line**: `.claude/hooks/check-skill-flow-fresh.mjs` 가 SoT-HTML drift 를 hook 으로 강제하는 것과 정확히 동일한 형태로, `check-cycle-exit.mjs` 가 cycle-exit fresh-agent verifier dispatch + 4 sub-check 를 hook 으로 강제한다.

**Success criteria**:
1. `git commit` / `gh pr create` / `git push origin main` 중 cycle-exit signal 매칭되는 invocation 은 hook 이 BLOCK
2. BLOCK 메시지가 메인에게 fresh-agent verifier dispatch + 4 sub-check 를 정확히 instruct
3. `KZK_CYCLE_EXIT_VERIFIED=1` env var 와 함께 재시도하면 통과
4. `KZK_CYCLE_EXIT_SKIP=1` 비상 bypass 작동 + `Q-CYCLE-EXIT-STALE` queue entry 자동 등록
5. Default propagate — `install/install-global.sh` 가 다른 프로젝트에 자동 설치
6. 이 cycle 의 final commit 자체가 hook 발동 → dogfooding 완료
7. Codex cross-vendor review PASS (BLOCKER 0)

---

## 2. Scope

### In-scope (이 plan)
- (A) Reconcile: 글로벌 → repo SoT back-port (3 skill, 의도된 cycle 25 fix 의 부분 구현)
- (B) Net-new: `check-cycle-exit.mjs` hook 구현 + 등록
- (C) `kzk-pre-merge-sync` 에 §6 Prod-build smoke + §7 SoT alignment sub-check 신설
- (D) `kzk-autonomous-boundary` 의 cycle-exit verifier mandate 를 4 sub-check 로 명시화
- (E) `harness-share.md §14.5` 갱신 + `§3` Gate 6 시퀀스 추가
- (F) `docs/site/skill-flow.html` + `.ko.html` 카드/표 갱신 + fingerprint regen
- (G) `install/install-global.sh` propagation 로직 추가 (default ON)
- (H) `harness-flow-progress.md` cycle entry

### Out-of-scope (deferred — 별도 cycle / 별도 결정)
- **AI-3 Drizzle dist lint**: application-level, 하네스 gate 가 잡을 일 아님 (prod-build smoke 가 일반적으로 cover)
- **AI-4 shadcn Button gate**: cycle 26 application task, DESIGN.md 사회적 합의
- **B option (SoT as derived view)**: `feature-list.md` 자체를 commit-message marker 기반 generate. 큰 architecture 변경 — 별도 cycle 의 design topic
- **`kzk-pre-commit-gate` Gate 6 통합**: 이 plan 에서는 cycle-exit hook 을 별도 hook 파일로 둠. Gate 6 통합은 hook 안정화 후 별도 cycle 에서 검토
- **Signal C (SoT diff 감지)**: 폐기 결정 (2026-05-13 user). 사유: kzk-harness 자체에는 `docs/sot/feature-list.md` 없고, 다른 프로젝트마다 SoT 경로/이름 천차만별이라 generic 감지 어려움. SoT alignment 는 cycle-exit verifier 의 sub-check 3 에서만 처리 (verifier 가 해당 프로젝트 컨텍스트에서 SoT 파일 위치 추정)

### Brainstorm step justification (kzk-spec-and-review §22.5) — recorded-evidence path

Codex review cycle 1 의 BLOCKER 5: ALL-of 조건 (trivial + pre-specified + no-new-capability) 중 **trivial 이 false** 이므로 ALL-of skip 경로 불가. 따라서 §22.5 의 alternate path 인 **"explicit standalone skip command path with recorded evidence"** 로 정당화.

**Recorded evidence** (이 conversation, 2026-05-12 ~ 2026-05-13):

1. Turn 1 (사용자) — cycle 25 외부 프로젝트 postmortem 제시: 6 회귀 + 5 detection gap (G1–G5) + 5 systemic 5-whys + 6 AI 액션 아이템
2. Turn 2 (main) — 진단: phase-local correctness ≠ cycle-global integrity, 3 high-leverage fixes, 2 low-leverage 거부
3. Turn 3 (사용자) — G1–G5 통합 강조 + Signal C 등 sub-question
4. Turn 4 (main) — 4 gap → 1 cycle-exit step 통합 안 + 4 sub-check sub-structure 도출
5. Turn 5 (사용자) — "`kzk-pre-merge-sync` 안 쓰고 있어. commit/cycle 끝날 때 잡게 못해주나?" — hook-driven enforcement 방향 합의
6. Turn 6 (main) — Signal A/B/C + bypass env var + Gate 6 + 트레이드오프 명시
7. Turn 7 (사용자) — "이거 수정하는 플랜 + codex 교차검증 + 자율 실행" + 3-slot branch contract 답 (main 직접 / PR 없이 / default propagate)
8. Turn 8 (사용자 interactive) — 4 Q 답: marker scope (명시 marker 만), Signal C 폐기, draft PR BLOCK, prod-build adapt (HTML/SoT)

→ 5 conversational turns + 4 explicit interactive decisions = brainstorming-equivalent dialog. Goal-space 탐색 (G1–G5 → 1 cycle-exit step), tradeoff 명시 (Signal C 폐기 사유, draft PR BLOCK 사유), alternative 검토 (option B SoT-as-derived-view 거부, AI-3/AI-4 application-level 거부) 모두 수행. spec-and-review §22.5 의 "recorded evidence" 충족.

§3 Discovery + §3.3 + §3.3a 가 이 evidence 의 frozen 형태. Step 0 survey 는 §3 Discovery cover, Step 1 spec draft = 이 문서, Step 2 codex review iterate (cycle 1 ⛛ 5 BLOCKER → fix → cycle 2 재실행), Step 3 frozen plan + executor dispatch.

---

## 3. Discovery (Step 0 survey 결과 요약)

### 3.1 글로벌 ↔ repo drift 현황 (2026-05-13 19:57 기준)

| Skill | Repo (SoT) | Global (~/.claude/) | Drift 내용 | Status |
|---|---|---|---|---|
| kzk-fix-scope-expansion | v1.6.0 | v1.7.0 | description endpoint deprecation trigger 8개 키워드, Step 4 신설 (API deprecation flow), 새 섹션 `## Use case: API deprecation sweep` | **Back-port 필요** |
| kzk-pre-merge-sync | v(repo) | v(global) | checklist 에 stub sweep 한 줄, 새 §5 Stub sweep 섹션 (BLOCK/WARN 분류, convention, "Phase 2+ — not implemented yet" 자리) | **Back-port + §6/§7 추가 필요** |
| kzk-autonomous-boundary | v(repo) | v(global) | `§Autonomous completion fresh-agent verifier` 에 Large-cycle exit trigger (non-autonomous sessions, keyword `final`/`baseline`/`migration`/`c25` + ≥ 3 modules) 추가, anti-pattern 1개 추가 | **Back-port + 4 sub-check mandate 명시화 필요** |
| kzk-pre-commit-gate | identical | identical | drift 없음 | 변경 없음 |
| kzk-spec-and-review | identical | identical | drift 없음 | 변경 없음 |

**메모리 정책 위반**: `feedback_kzk_repo_global_skill_drift.md` — kzk-* 변경은 repo SoT 만 수정, ~/.claude/** mirror 는 install 시점 자동 propagate. 글로벌 직접 edit 은 위반. 본 plan 으로 reconcile.

### 3.2 기존 인프라 재사용 매핑

| 신설 컴포넌트 | 참조 template / 동일 패턴 |
|---|---|
| `.claude/hooks/check-cycle-exit.mjs` | `.claude/hooks/check-skill-flow-fresh.mjs` — stdin payload, block decision JSON, --regen/--status CLI, REPO_ROOT 계산 |
| `install/hooks/check-cycle-exit.mjs` | `install/hooks/freshness-guard.mjs`, `regression-recall.mjs` 등 8개 hook 의 propagation 패턴 |
| `.claude/settings.json` 등록 | 기존 PreToolUse Bash matcher 패턴 (한 matcher 안에 `hooks: [...]` 배열로 추가) |
| `install/install-global.sh` propagation | 기존 `--enable-hooks` 플래그 패턴 (단 cycle-exit 는 default ON 이므로 플래그 없이도 등록) |
| Bypass env var | `KZK_SKILL_FLOW_SKIP=1` 패턴 동일. queue entry 형식도 동일 (`docs/harness/user-queue.md` 에 `Q-CYCLE-EXIT-STALE` 추가) |
| Fingerprint regen | `--regen` CLI mode 가 이미 `check-skill-flow-fresh.mjs` 에 있음 — `kzk-pre-merge-sync` / `kzk-fix-scope-expansion` SKILL.md 본문 변경 시 자동 regen 필요 |

### 3.3 Hook 발동 신호 분류 (2 signal 만 — Signal C 폐기 per 2026-05-13 user 결정)

**Signal A — PR-flow** (clean trigger via Bash command match): PreToolUse Bash matcher 가 다음 패턴 매칭:
- `\bgh pr create\b` (subcommand match — `--draft` 포함 모든 형태 BLOCK per 2026-05-13 user 결정)
- `\bgh pr merge\b` (직접 호출 시)
- `\bgit push\b.*\borigin\s+(?:[^\s:]+:)?main\b` — `git push origin main` / `git push -u origin main` / `git push --force origin main` / `git push --force-with-lease origin main` / `git push origin HEAD:main` / `git push origin <sha>:main` / `git push origin feature/foo:main` 등 모든 플래그 + refspec 조합 매칭 (loose match — `git push` 와 `origin <optional refspec>main` 사이에 임의 토큰 허용; refspec 의 왼쪽 ref 는 optional, 오른쪽이 `main` 이면 매칭)

**Signal B — direct-main / feature-branch milestone** (explicit commit-message marker only — per 2026-05-13 user 결정, cycle keyword 제외): PreToolUse Bash matcher 가 `git commit` 호출 감지 + commit message 분석. 다음 정규식 중 1개라도 매칭하면 BLOCK:
- `^MILESTONE:` (한 줄 시작, 또는 commit body 의 한 줄 시작)
- `^CYCLE-EXIT:` (동일)
- `^STUB-CLEAR:` (stub 해소 — sub-check 2 sweep 완료 신호)

Commit message 추출 우선순위:
1. `-m "..."` (직접 인자 추출)
2. `-F <path>` (파일 read)
3. `.git/COMMIT_EDITMSG` (interactive commit, hook timing 이 file write 후라 일반적으로 신뢰 가능)
4. 위 3개 다 없거나 비어있으면 → 일단 pass (false negative 허용, hook 의 fail-open 정책)

### 3.3a Commit convention (hook 정규식이 이걸 매칭, 메인은 commit 만들 때 이 convention 따름)

확정 (2026-05-13 user 동의):

```text
# Cycle-exit commit (hook BLOCK 대상 — fresh-agent verifier 의무)
feat(grid): grid lock + history split-pane (cycle 25 final)

CYCLE-EXIT: cycle 25 final
- 4 phases merged: M3 / phase 2-4
- migration: single baseline
- ...

# Stub 도입 commit (후속 sweep 대상)
feat(toolbar): grid lock button (UI stub)

STUB: TopToolbar lock button disabled (Phase 2 wiring)
Unblocked when: useGridLock hook + backend REST endpoint both ready

# Stub 해소 commit (cycle-exit signal — hook BLOCK 대상)
feat(toolbar): wire grid lock button to useGridLock

STUB-CLEAR: TopToolbar lock button

# Milestone (PR 대체 commit — hook BLOCK 대상)
feat(harness): cycle 56 done

MILESTONE: cycle 56 — cycle-exit hook + 4 sub-check
```

규칙:
- Marker (`MILESTONE:` / `CYCLE-EXIT:` / `STUB-CLEAR:` / `STUB:` / `Unblocked when:`) 는 **commit body 의 한 줄 시작** 또는 subject 줄 시작
- Subject 가 conventional commit 형식 (`type(scope): desc`) 인 것과 무관 — marker 는 body 또는 subject 어디든 OK (정규식 multiline mode 사용)
- `STUB:` 만 있고 marker 매칭 없으면 hook BLOCK 안 함 (stub 도입은 cycle-exit 아님). `STUB-CLEAR:` 가 cycle-exit signal
- Agentic coding context: commit 만드는 메인/executor 가 이 convention 을 항상 따르도록 `kzk-pre-merge-sync §5` 본문에 명시 + executor dispatch prompt template 에 inject

### 3.4 4 Sub-check mandate (cycle-exit fresh-agent verifier 가 수행)

| Sub-check | Source gap | 검사 내용 | 출력 |
|---|---|---|---|
| 1. Prod-build user-persona smoke | G1 + G3 | `npm run build && node dist/main` (또는 `vite preview`) 로 prod-like 환경 띄움. "사용자 5분 내 첫 행동 3개" 시나리오 navigate (Playwright MCP). dev watch 와 별개 환경 — **두 환경 다 돌리는 게 핵심** | screenshot 3+ / console errors 0 / network errors 0 |
| 2. Stub sweep | G4 | `git log <cycle-start>..HEAD --grep='STUB:'` + JSX 패턴 grep (`// STUB:`, `{/* STUB:`) + UI text 패턴 (`Phase \d+ 에서 활성화`, `coming soon`, `TODO`). User-visible 경로면 BLOCK, behind-flag 면 WARN | 미해결 stub list — 다음 cycle plan 첫 task 로 이관 또는 user confirm |
| 3. SoT alignment | G5 | `docs/sot/feature-list.md` (또는 동등 SoT) 의 `wip`/`tbd`/`todo` marker 가 cycle 의 staged 코드 변경과 일치하는지. CRG `semantic_search_nodes` 로 feature symbol 의 현재 implementation state 와 SoT marker 비교 | 미일치 항목 list — auto-fix 시도 후 user confirm |
| 4. Spec-freeze re-check | Bug 2 류 | Spec 의 시각/레이아웃 ambiguity (`Gridly 스타일`, `nice spacing`, `proper hierarchy` 같은 modifier) 가 implementation 으로 흡수됐는지. Fresh agent 가 spec 다시 읽고 screenshot 비교 | mismatched modifier list + 결정 필요 항목 |

각 sub-check 는 **fresh agent (oh-my-claudecode:verifier opus) 가 수행**. 메인 self-execute 금지 (`kzk-autonomous-boundary §Q-COMPLETION-SELF-VERIFY` rule).

---

## 4. Reconcile (Phase A): Global → Repo SoT back-port

### A-1. `skills/kzk-fix-scope-expansion/SKILL.md` v1.6.0 → v1.7.0

글로벌 변경을 repo 로 복사. 변경 요약:
- Frontmatter `version: 1.6.0` → `1.7.0`
- Frontmatter `description` 에 endpoint deprecation trigger 8개 키워드 추가 (`'endpoint 삭제', 'endpoint deletion', 'deprecate', 'deprecated', 'removed in cycle', 'removed in phase', '@deprecated', 'API 폐지', 'API removal'`)
- Body Step 4 신설: "API deprecation flow" — endpoint path pattern 으로 grep, CRG `detect-changes --base HEAD~1` preferred
- 기존 Step 4–7 → Step 5–8 로 재번호
- 새 섹션 `## Use case: API deprecation sweep` 추가 (글로벌과 동일 본문)

**Validation**: back-port 후 `diff skills/kzk-fix-scope-expansion/SKILL.md ~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` → 차이 없어야 함.

### A-2. `skills/kzk-pre-merge-sync/SKILL.md` §5 Stub sweep 추가

글로벌 변경을 repo 로 복사:
- Checklist 에 `- [ ] Stub sweep: ...` 한 줄 추가
- 새 §5 Stub sweep 섹션 (BLOCK/WARN 분류, commit body convention `STUB: <desc>` + `Unblocked when: <condition>`, Phase 2+ 자동 detection 자리)
- "Interaction with other kzk-*" 섹션의 `kzk-autonomous-boundary` 줄에 "cycle-exit verifier dispatched per that rule runs this skill's §5 stub sweep" 부연

**버전 bump**: kzk-pre-merge-sync 현재 버전 확인 후 minor bump (예: 1.x → 1.(x+1)). 글로벌은 이미 적용된 상태지만 version bump 는 양쪽에 동시.

### A-3. `skills/kzk-autonomous-boundary/SKILL.md` Large-cycle exit trigger 추가

글로벌 변경을 repo 로 복사:
- `§Autonomous completion fresh-agent verifier` 본문 §Trigger 에 세 번째 bullet 추가: "Large-cycle exit trigger (non-autonomous sessions): commit message contains `final` / `baseline` / `migration` / `c25` AND changed file set spans ≥ 3 modules OR includes migration SQL OR includes `CLAUDE.md`"
- Anti-pattern 에 "Not autonomous mode so exit verifier doesn't apply" 반박 추가

**버전 bump**: 동일.

### A-Validation
3개 skill back-port 후:
```bash
for s in kzk-fix-scope-expansion kzk-pre-merge-sync kzk-autonomous-boundary; do
  diff -q "skills/$s/SKILL.md" "$HOME/.claude/skills/$s/SKILL.md" || echo "STILL DIFFERS: $s"
done
```
출력 비어 있어야 함. 단 본 plan §B/§C 의 net-new 변경 (4 sub-check mandate 명시화, §6/§7 신설) 은 repo 에 추가로 들어가므로, **back-port 단계 commit 이후** 글로벌과 일시적으로 다시 차이 발생 → install-global.sh 재실행으로 글로벌이 repo 를 따라잡음 (`§G`).

---

## 5. Net-new (Phase B): `check-cycle-exit.mjs` hook 구현

### B-1. 파일 신설 — `.claude/hooks/check-cycle-exit.mjs`

구조 (template = `check-skill-flow-fresh.mjs`):

```js
#!/usr/bin/env node
// check-cycle-exit.mjs — kzk-harness PreToolUse hook.
//
// Purpose: enforce cycle-exit fresh-agent verifier dispatch + 4 sub-check
// before `git commit` (Signal B) / `gh pr create` / `git push origin main`
// (Signal A) that indicate cycle exit.
//
// Bypass:
//   KZK_CYCLE_EXIT_VERIFIED=1 — verifier dispatched + 4 sub-check PASS
//   KZK_CYCLE_EXIT_SKIP=1 — emergency, leaves Q-CYCLE-EXIT-STALE in user-queue
//
// CLI modes:
//   --status : print current signal detection + bypass state
//   --dry-run "<command>" : test signal match without invoking real commit

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
// ... read stdin → parse tool_input.command → match signal → block/pass
```

핵심 로직:
1. Stdin payload JSON 파싱 → `tool_name === "Bash"` && `tool_input.command`
2. Signal A: command 가 `\bgh pr (create|merge)\b` 또는 `\bgit push\b.*\borigin\s+(?:[^\s:]+:)?main\b` 매칭 (§3.3 와 동일 — refspec form `HEAD:main` / `<sha>:main` / `feature/foo:main` 포함)
3. Signal B: command 가 `\bgit commit\b` 매칭 → staged commit message 추출:
   - `-m "..."` 직접 추출
   - `-F <path>` 파일 read
   - 둘 다 없으면 `.git/COMMIT_EDITMSG` read
   - Message 가 marker pattern 매칭 (multiline mode): `^MILESTONE:` OR `^CYCLE-EXIT:` OR `^STUB-CLEAR:` (3 marker only — cycle keyword regex 제외 per §3.3 결정)
4. 매칭 + `KZK_CYCLE_EXIT_VERIFIED=1` 없음 → block decision JSON 출력. Block reason 메시지에 4 sub-check mandate 구체적으로 명시
5. `KZK_CYCLE_EXIT_SKIP=1` 매칭 → pass + user-queue 에 `Q-CYCLE-EXIT-STALE` entry append + stderr 에 경고
6. Signal 매칭 없음 → pass (다른 commit 들은 통과)

Block 메시지 (한국어 fallback 영어):

```
🛑 Cycle-exit detected (signal: <A|B> / pattern: <matched>).

`kzk-pre-merge-sync` §5–§7 의 4 sub-check 를 fresh agent 로 dispatch 하세요:
  1. Prod-build user-persona smoke (npm run build && node dist/main + Playwright)
  2. Stub sweep (git log --grep='STUB:' + UI text + JSX comment patterns)
  3. SoT alignment (docs/sot/feature-list.md ↔ staged code)
  4. Spec-freeze re-check (Gridly 스타일 같은 시각 modifier 흡수 확인)

Dispatch: oh-my-claudecode:verifier opus with cycle-exit mandate.
Verifier PASS 후 재시도: KZK_CYCLE_EXIT_VERIFIED=1 <원래 command>

Emergency bypass: KZK_CYCLE_EXIT_SKIP=1 <원래 command>
  → docs/harness/user-queue.md 에 Q-CYCLE-EXIT-STALE 자동 등록
```

### B-2. 파일 신설 — `install/hooks/check-cycle-exit.mjs`

`.claude/hooks/check-cycle-exit.mjs` 의 propagation copy. 단 hardcoded path 차이:
- `.claude/hooks/` 는 `REPO_ROOT = path.resolve(__dirname, "..", "..")` 로 repo root 추정
- `install/hooks/` 는 `~/.claude/skills/.kzk-harness-shared/hooks/` 에 배포되므로 CWD 기반 + git rev-parse fallback 사용 (다른 8개 hook 와 동일 패턴 — `install/hooks/regression-recall.mjs` 등의 path 추정 로직 mirror)

### B-3. `.claude/settings.json` 갱신

기존:
```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/check-skill-flow-fresh.mjs\"" }] }
    ]
  }
}
```

신설 (같은 matcher 안에 추가):
```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [
        { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/check-skill-flow-fresh.mjs\"" },
        { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/check-cycle-exit.mjs\"" }
      ]}
    ]
  }
}
```

**Order matters**: skill-flow-fresh 가 먼저, cycle-exit 가 다음. SoT-HTML drift 가 cycle-exit 보다 우선 (HTML 이 stale 이면 cycle-exit 도 잘못된 SoT 봄).

### B-4. `install/install-global.sh` propagation (idempotency-safe)

Default ON 결정 — `--enable-hooks` 플래그 없이도 등록.

**Idempotency mechanism (BLOCKER 3 fix per codex cycle 1)**: 재실행 시 중복 entry 방지를 위해 기존 `update_hooks_canonical` 함수 (line 639–768) 패턴 그대로 사용:
- `update_hooks_canonical` 가 jq 로 `settings.json` 의 PreToolUse / PostToolUse / UserPromptSubmit arrays 를 reconstruct
- Managed whitelist (현재 7 filenames) 에 `check-cycle-exit.mjs` 추가 → reconstruct 시 정확히 한 번만 등록 보장
- User custom hooks (whitelist 외) 는 preserve
- 반복 `--update` 호출이 멱등 (canonical state 가 idempotent fixed point)

수정 위치:
- `install/install-global.sh` line ~640 managed whitelist 배열에 `"check-cycle-exit.mjs"` 추가
- Hook 파일 복사 로직: `install/hooks/check-cycle-exit.mjs` → `~/.claude/skills/.kzk-harness-shared/hooks/check-cycle-exit.mjs`
- jq reconstruct 가 PreToolUse Bash matcher 안에 `node "$HOME/.claude/skills/.kzk-harness-shared/hooks/check-cycle-exit.mjs"` entry 자동 등록
- `--no-cycle-exit-hook` opt-in opt-out 플래그 (CI 테스트 / 명시적 disable 시)
- Runtime opt-out: `KZK_CYCLE_EXIT_DISABLE=1` env var (BLOCKER 4 NIT per codex cycle 1 NITS — 이미 installed 환경의 emergency local suppression. Hook 이 env var 감지 시 loud stderr warning + Q-CYCLE-EXIT-DISABLED queue entry 후 pass)

**정책 대비**: `.claude/hooks/check-skill-flow-fresh.mjs` 는 install-global 이 절대 안 가져감 (project-local 보호). cycle-exit hook 은 반대로 default propagate — 두 정책의 차이를 install-global.sh 헤더 주석에 명시.

### B-5. Tests

`tests/check-cycle-exit.test.mjs` (또는 `tests/hooks/cycle-exit.test.mjs`):

**Signal A — PR/push**:
- `gh pr create --title "x"` → BLOCK
- `gh pr create --draft --title "x"` → BLOCK (draft 도)
- `gh pr merge 123 --squash` → BLOCK
- `git push origin main` → BLOCK
- `git push -u origin main` → BLOCK
- `git push --force origin main` → BLOCK
- `git push --force-with-lease origin main` → BLOCK
- `git push origin HEAD:main` → BLOCK (HEAD ref, refspec form)
- Negative: `gh pr view 123` → pass
- Negative: `gh pr list` → pass
- Negative: `git push origin feature/foo` → pass
- Negative: `git push origin develop` → pass

**Signal B — commit marker**:
- `git commit -m "MILESTONE: cycle 56 done"` → BLOCK
- `git commit -m "CYCLE-EXIT: cycle 25 final"` → BLOCK
- `git commit -m "STUB-CLEAR: lock button"` → BLOCK
- `git commit -m "feat(x): y" -m "MILESTONE: z"` → BLOCK (2nd -m body)
- `git commit -F /tmp/msg.txt` 의 file content marker → BLOCK
- `git commit -F /nonexistent.txt` → pass (file read fail, fail-open)
- `git commit` interactive (COMMIT_EDITMSG marker present) → BLOCK
- Negative: `git commit -m "fix(foo): bar"` → pass
- Negative: `git commit -m "Milestone: lowercase"` → pass (정규식 case-sensitive)
- Negative: `git commit -m "c25 final"` → pass (cycle keyword 제외 결정)
- Negative: `git commit -m "STUB: introducing stub"` → pass (STUB 도입은 cycle-exit 아님)
- Edge: `git commit -m ""` → pass (empty body)

**Bypass env var**:
- `KZK_CYCLE_EXIT_VERIFIED=1 git commit -m "MILESTONE: x"` → pass
- `KZK_CYCLE_EXIT_SKIP=1 git commit -m "MILESTONE: x"` → pass + queue entry `Q-CYCLE-EXIT-STALE` written
- `KZK_CYCLE_EXIT_VERIFIED=1 KZK_CYCLE_EXIT_SKIP=1 git commit -m "MILESTONE: x"` → BLOCK with "conflicting trust states" message (fail-closed)
- `KZK_CYCLE_EXIT_DISABLE=1 git commit -m "MILESTONE: x"` → pass + loud stderr warning + `Q-CYCLE-EXIT-DISABLED`
- Edge: queue file write fail (permission) → BLOCK with stderr warning (fail-closed for queue write)

**Edge**:
- empty stdin payload → pass + stderr warning (hook의 fail-open 정책)
- malformed stdin JSON → pass + stderr warning
- Non-Bash tool name → pass (matcher 외 도구는 pass-through)
- `git commit -m "...\nMILESTONE: x\n..."` 다중 라인 body 의 중간 줄 marker → BLOCK (multiline regex)

Test runner: existing pattern (node native test runner via `node --test` 또는 vitest — 다른 install/hooks tests 의 pattern 따름).

---

## 6. Net-new (Phase C): Sub-check 명시화

### C-1. `skills/kzk-pre-merge-sync/SKILL.md` §6 + §7 추가

A-2 의 §5 Stub sweep 뒤에:

**§6 Prod-build user-persona smoke** (G3 + G1 통합):
- Trigger: cycle-exit fresh-agent verifier 의 sub-check 1
- 명령어: `npm run build && node dist/main` (NestJS) 또는 `vite preview` (Vite) 또는 프로젝트별 dist serve 명령
- 시나리오: `docs/sot/persona-scenarios.md` (신설 또는 기존) 에서 "사용자 5분 내 첫 행동 3개" 정의 (예: 시트 셀 편집, lock 버튼 클릭, view 없는 URL 직접 접근)
- Playwright MCP 로 시나리오 실행, screenshot 3+, console errors 0, network 4xx/5xx 0 요구
- 실패 시 cycle-exit BLOCK 지속

**§7 SoT alignment** (G5):
- Trigger: cycle-exit fresh-agent verifier 의 sub-check 3
- `docs/sot/feature-list.md` (또는 동등) 의 `wip`/`tbd`/`todo` marker 와 staged code 의 feature symbol implementation state 비교
- CRG `semantic_search_nodes(name=<feature_symbol>)` 가 primary tool, grep fallback
- 미일치 항목 자동 수정 시도 → user confirm 후 BLOCK 해제

### C-2. `skills/kzk-autonomous-boundary/SKILL.md` 4 sub-check mandate 명시화

A-3 의 Large-cycle exit trigger 뒤에 `§Mandate` 신설:

```markdown
### Mandate (4 sub-check)

cycle-exit fresh-agent verifier 가 수행할 검사:
1. **Prod-build user-persona smoke** — see `kzk-pre-merge-sync §6`
2. **Stub sweep** — see `kzk-pre-merge-sync §5`
3. **SoT alignment** — see `kzk-pre-merge-sync §7`
4. **Spec-freeze re-check** — spec 의 시각/레이아웃 modifier 가 implementation 으로 흡수됐는지 fresh agent 가 spec 재독 + screenshot 비교

4 sub-check 중 1개라도 FAIL → cycle-exit BLOCK 지속. 메인이 4 sub-check 결과 보고하고 `KZK_CYCLE_EXIT_VERIFIED=1` 와 함께 재시도.
```

### C-3. `STUB:` / `STUB-CLEAR:` commit message convention 정의

`harness-share.md §3` 에 hook-enforced commit message convention 추가:
- `STUB: <one-line>` 본문 라인 = 의도된 stub 도입
- `Unblocked when: <condition>` 다음 라인 = 해소 조건
- `STUB-CLEAR: <stub-id>` = stub 해소 commit (이 commit 은 cycle-exit hook signal 매칭)

`kzk-pre-commit-gate` Gate 1.5 에 stub format validation 추가 (별도 작업 — out-of-scope 로 두되 §C-3 에서 marker 정의만).

### C-4. Verifier dispatch prompt template (BLOCKER 2 fix per codex cycle 1 — spec-freeze artifact gate)

기존 `oh-my-claudecode:verifier` agent (harness-share.md §354 Stage 3, kzk-autonomous-boundary §105, kzk-large-task-delegation §333) 를 재사용. Cycle-exit 컨텍스트 prompt template.

**Sub-check 4 강화 (BLOCKER 2)**: codex cycle 1 지적 — spec 의 시각/레이아웃 modifier 가 ambiguous 하면 verifier 가 implementation 시점에 alignment 확인해도 "spec 에 무엇이 frozen 됐는지" 알 수 없음 (Bug 2 history UX = `Gridly 스타일` 만 명시 + split-pane vs tab vs full-page 결정 안 됨). 두 곳에 gate 추가:

(a) **Spec-authoring 시점 gate** (out-of-scope 의 일부 — kzk-spec-and-review 본문에 push). Spec draft 에 visual/layout modifier (예: `Gridly 스타일`, `nice spacing`, `proper hierarchy`, `clean look`) 가 있으면 **frozen artifact 1개 이상 필수**:
- ASCII wireframe (text-only mockup)
- Layout token list (예: `gridArea: 'history-pane' | 'edit-pane' | ...`)
- Approved screenshot reference (existing screenshot URL / 기존 component reference)
- Component library element name (예: `<SplitPane>` 명시)

Spec 에 modifier 있으나 frozen artifact 없으면 spec-and-review codex 가 🔴 BLOCKER 로 분류 — frozen 후 implementation 진입.

(b) **Implementation 시점 sub-check 4 verifier 가 수행**:

Cycle-exit 컨텍스트 prompt template:

```text
Role: fresh-agent verifier per kzk-autonomous-boundary §Autonomous completion fresh-agent verifier.

Trigger: cycle-exit hook (check-cycle-exit.mjs) BLOCKED a commit/push.
Marker matched: <CYCLE-EXIT: ... | MILESTONE: ... | STUB-CLEAR: ...>
Cycle scope: <base ref> .. HEAD  (or last N commits if no base ref)
Project context: <app project | kzk-harness self-improvement>

Execute 4 sub-checks. Each FAIL → BLOCK verdict.

1. Prod-build user-persona smoke (§kzk-pre-merge-sync §6)
   - App project: `npm run build` then start prod-mode (`node dist/main` / `vite preview` / project-specific)
   - kzk-harness self: render docs/site/skill-flow.html + .ko.html in real browser via Playwright MCP, verify fingerprint match (check-skill-flow-fresh.mjs --status), navigate docs/site/index.html
   - Persona scenario: read docs/sot/persona-scenarios.md if exists, else infer first 3 user actions from CLAUDE.md or README
   - PASS condition: 3+ screenshot, console errors 0, network 4xx/5xx 0

2. Stub sweep (§kzk-pre-merge-sync §5)
   - `git log <base>..HEAD --format='%H %s%n%b' | grep 'STUB:'`
   - `grep -rE '// STUB:|\{/\* STUB:|Phase \d+ 에서 활성화|coming soon|TODO' <src dirs>`
   - Classify: user-visible (BLOCK) vs behind-flag/unused (WARN)

3. SoT alignment (§kzk-pre-merge-sync §7)
   - Locate SoT file: try `docs/sot/feature-list.md` → `docs/PRD.md` → README "## Features" section
   - Cross-ref staged code's new feature symbols vs SoT marker (`wip` / `mvp` / `done`)
   - CRG `semantic_search_nodes(name=<symbol>)` preferred, grep fallback

4. Spec-freeze re-check (§kzk-autonomous-boundary §Mandate + §C-4 spec-freeze artifact gate)
   - Locate spec: `docs/plans/<date>-*-design.md` referenced in cycle commits (search `git log <base>..HEAD --grep='docs/plans/'`)
   - For each visual/layout modifier in spec (`Gridly 스타일`, `nice spacing`, `proper hierarchy`, `clean look`, `split-pane`, `tab UI`, `responsive layout`):
     - Check: spec 에 frozen artifact (ASCII wireframe / layout token / approved screenshot / component library name) 동반?
     - 없음 → BLOCK with reason "spec ambiguity: <modifier> needs frozen artifact"
     - 있음 → implementation screenshot (sub-check 1) 과 비교
   - Compare to implementation screenshots from sub-check 1 — visual diff > threshold → flag

VERDICT format (first line MANDATORY per §kzk-large-task-delegation Stage 3):
  VERDICT: <PASS | BLOCK>

Sub-check outcomes:
  1. Prod-build smoke: <PASS|FAIL — reason>
  2. Stub sweep: <PASS|FAIL — list>
  3. SoT alignment: <PASS|FAIL — list>
  4. Spec-freeze re-check: <PASS|FAIL — list>

Evidence: <paths to screenshots / log excerpts / git refs>
```

이 template 은 `kzk-pre-merge-sync §5` 본문 안에 인용 형태로도 박혀야 — executor dispatch 시 inject. 또는 별도 파일 `skills/kzk-pre-merge-sync/verifier-prompt-template.md` 로 분리해서 두 곳에서 reference 만. Codex 의견 받은 후 결정.

---

## 7. Net-new (Phase D): `harness-share.md` 갱신

### D-1. `§3` Gate sequence 에 Gate 6 추가 (**PRIMARY normative body** — BLOCKER 4 fix per codex cycle 1)

`harness-share.md §3` 가 Gate 6 의 **primary SoT**. `§14.5` 는 cross-ref only.

기존 Gate 0–5 sequence 끝에:
```
**Gate 6 — Cycle-exit verifier** (조건부 발동, hook-enforced)
- Trigger: hook `check-cycle-exit.mjs` 가 Signal A (PR/push) 또는 Signal B (commit message marker) 매칭
- Markers (Signal B): `^MILESTONE:` / `^CYCLE-EXIT:` / `^STUB-CLEAR:` (3개, multiline mode)
- Action: fresh-agent verifier dispatch (`oh-my-claudecode:verifier`) 의무. 메인 self-execute 금지 (Q-COMPLETION-SELF-VERIFY).
- Sub-checks (mandate 본 plan §C-4 verifier prompt template 참조): prod-build smoke, stub sweep, SoT alignment, spec-freeze re-check (4개)
- Pass condition: 4 sub-check 모두 PASS + `KZK_CYCLE_EXIT_VERIFIED=1` env var
- Bypass: `KZK_CYCLE_EXIT_SKIP=1` (Q-CYCLE-EXIT-STALE queue entry 자동 등록)
- Disable (installed env): `KZK_CYCLE_EXIT_DISABLE=1` (loud warning + Q-CYCLE-EXIT-DISABLED)
- Conflict: VERIFIED + SKIP 둘 다 set → BLOCK (fail-closed, 명시 메시지)
- Short-circuit: skill-flow-fresh hook 이 먼저 BLOCK 하면 cycle-exit 실행 안 됨 — 두 hook 다 PASS 해야 commit 진행 (AND condition, race 없음)
```

### D-2. `§14.5` cycle-exit hook **cross-reference only** (BLOCKER 4 fix)

기존 §14.5 본문 (autonomous-loop continuation 컨텍스트) 안의 cycle-exit 언급은 cross-ref 형태:

```markdown
### Cycle-exit gate (hook-driven — cross-ref)

`kzk-pre-merge-sync` 의 trigger 는 conversational keyword 가 아니라 hook 으로 enforce.
구현: `.claude/hooks/check-cycle-exit.mjs` (repo-local) + `~/.claude/skills/.kzk-harness-shared/hooks/check-cycle-exit.mjs` (글로벌, install-global default propagate).

**Normative body 는 §3 Gate 6**. 본 §14.5 는 cross-reference + 다른 자율 mode 메커니즘 (rate-limit, auto-compact) 와의 관계만 기술.
```

### D-3. Skill cross-ref 갱신

- `kzk-autonomous-boundary` cross-ref 의 cycle-exit verifier 부분이 4 sub-check 명시화로 갱신됨을 반영
- `kzk-fix-scope-expansion` v1.7.0 endpoint deprecation flow 가 cycle-exit hook 의 Gate 4.5 와 동시 작동함을 명시

---

## 8. Net-new (Phase E): HTML + fingerprint regen

### E-1. `docs/site/skill-flow.html` 갱신

- `kzk-pre-merge-sync` 카드: §5/§6/§7 sub-section bullet 추가
- `kzk-fix-scope-expansion` 카드: version 1.7.0 + endpoint deprecation flow bullet
- `kzk-autonomous-boundary` 카드: Large-cycle exit trigger + Mandate (4 sub-check) bullet
- 새 hook 등장: workflow diagram (mermaid) 에 `check-cycle-exit.mjs` 노드 추가, Gate 6 sequence 표시
- §3 External skill loading 표 update (3 skill 의 v-bump)
- §8 Task-by-task usage 표에 cycle-exit hook flow 추가

### E-2. `docs/site/skill-flow.ko.html` 갱신

E-1 의 한국어 mirror. 본문 번역 자체는 기존 `5925970` commit 처럼 일관.

### E-3. Fingerprint regen

```bash
node .claude/hooks/check-skill-flow-fresh.mjs --regen
```

`docs/site/skill-flow.html` 의 `KZK_SKILL_FLOW_FINGERPRINT` 코멘트 갱신. `.ko.html` 은 fingerprint 안 들어감 (현재 hook 정책).

---

## 9. Net-new (Phase F): 테스트 + dogfooding

### F-1. Hook unit test (B-5 참조)

### F-2. Install propagation test

`install/install-global.sh --update` 를 임시 디렉토리에서 dry-run 으로 실행, `~/.claude/skills/.kzk-harness-shared/hooks/check-cycle-exit.mjs` 생성 + `~/.claude/settings.json` 에 matcher entry 추가됨을 검증.

### F-3. End-to-end dogfooding

이 cycle 의 final commit 자체가 cycle-exit hook 발동 대상:
1. 모든 변경 staged
2. `git commit -m "feat(harness): cycle-exit hook + 4 sub-check enforcement (cycle 56 final)"` 시도
3. Hook 이 Signal B 매칭 → BLOCK
4. `oh-my-claudecode:verifier` opus dispatch with cycle-exit mandate. mandate context = harness-self-improvement (앱 코드 없으므로 4 sub-check 를 harness 컨텍스트로 adapt):
   - sub-check 1 (prod-build smoke) → adapt to: skill-flow HTML 렌더 + GitHub Pages preview build
   - sub-check 2 (stub sweep) → 그대로
   - sub-check 3 (SoT alignment) → `docs/sot/feature-list.md` 없으므로 `harness-share.md` ↔ `skills/*/SKILL.md` ↔ `docs/site/skill-flow.html` 3중 alignment
   - sub-check 4 (spec-freeze re-check) → 본 plan ↔ implementation 일치
5. Verifier PASS → `KZK_CYCLE_EXIT_VERIFIED=1 git commit ...` 재시도
6. Commit 통과 (단 `check-skill-flow-fresh.mjs` 도 통과해야 — fingerprint regen 선행)
7. `harness-flow-progress.md` cycle entry 작성

---

## 10. Risk + mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hook 거짓 양성 (commit message 의 무관한 단어가 매칭) | low (marker only 결정 후) | low (bypass 가능) | Marker 만 매칭 (`^(MILESTONE|CYCLE-EXIT|STUB-CLEAR):`) — cycle keyword 제외 결정 (2026-05-13 user). 일반 conventional commit subject 와 거의 충돌 없음. bypass env var + queue entry 자동 등록 |
| Hook 거짓 음성 (cycle-exit commit 인데 marker 없음) | medium → low | medium (G1 재현 가능) | Agentic coding context — commit 만드는 메인/executor 가 §3.3a convention 따르도록 `kzk-pre-merge-sync §5` 본문에 명시 + executor dispatch prompt template inject. Signal A (`gh pr create` / `git push origin main`) 가 PR/push 시점에 catch-net. Signal C 폐기 결정 (2026-05-13 user) — SoT alignment 는 verifier sub-check 3 에서만 |
| 다른 프로젝트에서 false trigger | medium | medium | Hook 은 `git commit` / `gh pr` 명령만 본다. 일반 dev 명령에는 영향 없음. Opt-out 플래그 `--no-cycle-exit-hook` 제공 |
| Verifier dispatch 비용 (cycle 당 ~10–15분 + opus 토큰) | low | low | Cycle 당 1회. cycle 25 류 회귀 1건 = 30+ commits + user 직접 진단 vs verifier 1회 ≈ 명백히 이득 |
| 글로벌 mirror 와 repo 가 또 drift | medium | low | 본 plan back-port + install-global 재실행으로 reconcile. 메모리 `feedback_kzk_repo_global_skill_drift.md` 강화 — 사용자한테 글로벌 직접 edit 금지 재확인 |
| Hook 자체 버그로 BLOCK 풀리지 않음 | low | high | `KZK_CYCLE_EXIT_SKIP=1` 비상 bypass 가 fail-open 보장. 추가로 hook 의 모든 throw path 가 fail-open (pass + stderr warning) — `check-skill-flow-fresh.mjs` 동일 정책 mirror |
| `kzk-pre-commit-gate` 와 순서 충돌 | low | medium | settings.json 에서 `check-skill-flow-fresh` 먼저, `check-cycle-exit` 다음. 두 hook 다 pass 해야 commit 진행 |

---

## 11. Codex review checklist (Step 2)

본 plan 을 frozen 하기 전 codex CLI 로 cross-vendor review. `kzk-codex-handoff` 의 5 hard rules 준수:
- Stdin pipe (plan 본문을 stdin 으로)
- `--ephemeral` 항상
- `--json → file → jq` (pipe 금지)
- Short prompt via arg ("review this plan for blocker/nit/push-back")
- Plain text mode

Review 질문:
1. Signal A/B 의 정규식이 거짓 양성/거짓 음성 다 catch 하는가?
2. 4 sub-check 가 cycle 25 회귀 6건 (1a, 1b, 3, 3-b, 4, 4-b) 을 _실제로_ 잡았을지 시뮬레이션
3. Bypass env var 2개 (VERIFIED / SKIP) 의 구분이 명확한가? 둘 다 있으면 어느 게 우선?
4. Default propagate 정책의 다른 프로젝트 fallout — opt-out 메커니즘 충분한가?
5. Hook order (`skill-flow-fresh` → `cycle-exit`) 이 맞는가? cycle-exit hook 이 staged diff 를 봐야 하는데 skill-flow-fresh 가 먼저 fail 하면 staged 상태는 보존됨 — OK
6. Glob/install-global 의 hook 재실행이 멱등인가?
7. Test coverage 가 충분한가? Negative cases 빠진 게 있나?
8. `harness-share.md §3 Gate 6` 와 `§14.5 cycle-exit gate` 가 conflict 없나?
9. Brainstorm skip 정당화가 충분한가? (spec-and-review §22.5 의 `ALL-of` 조건 충족)

Loop: BLOCKER 0 + structural change 없음 → PASS. Cycle ≥ 5 + BLOCKER 잔존 → HALT + user-queue 등록.

---

## 12. Rollout sequence

### 12.1 Plan freeze (Step 3)
- 본 문서 사용자 review → codex review iterate → frozen
- Frozen 시점에 본 plan 의 §0–§11 변경 금지, §12+ 만 실행 추적

### 12.2 Executor dispatch order (3-phase)

**Phase A — Reconcile (1 commit)**:
- executor sonnet — A-1 + A-2 + A-3 (3 skill back-port)
- Commit: `refactor(skills): back-port global mirror cycle-25-fix changes to repo SoT`
- 이 commit 은 cycle-exit hook 발동 안 함 (marker 없음). 단 skill-flow-fresh 가 fingerprint stale → 같은 commit 에 §E-3 fingerprint regen 포함, HTML 갱신은 다음 phase

**Phase B + C — Hook + sub-check (1–2 commits)**:
- executor sonnet — B-1 ~ B-5 (hook 구현 + 등록) + C-1 ~ C-3 (sub-check 본문)
- Commit: `feat(hooks): cycle-exit gate + 4 sub-check enforcement`
- 이 commit 도 marker 없음

**Phase D + E — Meta-doc + HTML (1 commit)**:
- executor sonnet — D-1 ~ D-3 (harness-share) + E-1 ~ E-3 (HTML + regen)
- Commit: `docs: harness-share §3/§14.5 + skill-flow HTML sync for cycle-exit gate`

**Phase G — Install propagation (1 commit)**:
- executor sonnet — install-global.sh 수정
- Commit: `feat(install): default-propagate check-cycle-exit.mjs to ~/.claude global`
- `install/install-global.sh --update` 로 글로벌 mirror 갱신 (사용자 confirm 후)

**Phase F — Dogfood + final commit**:
- 메인이 4 sub-check fresh-agent verifier dispatch
- Verifier PASS → `KZK_CYCLE_EXIT_VERIFIED=1 git commit -m "feat(harness): cycle-exit hook + 4 sub-check enforcement (cycle 56 final)"`
- 이 commit 은 Signal B 매칭 → hook BLOCK → verifier 결과 첨부 → bypass 후 통과
- `harness-flow-progress.md` cycle entry 작성 → 추가 commit

### 12.3 Total commits
약 5–6 commits. 모두 main 직접 commit (branch contract 답).

---

## 13. Resolved questions (2026-05-13 user interactive)

- **Q-1 [RESOLVED]**: Signal B marker scope — 명시 marker 3개만 (`MILESTONE:` / `CYCLE-EXIT:` / `STUB-CLEAR:`). Cycle keyword (`c\d+ final`) 제외. Agentic coding 이므로 commit 만드는 에이전트가 convention 따르도록 §3.3a 명시 + dispatch prompt inject
- **Q-2 [RESOLVED]**: `gh pr create --draft` → BLOCK 동일 (cycle-exit 가능성). Draft 도 fresh-agent verifier 시점이 적절함
- **Q-3 [DEFERRED]**: Verifier dispatch 가 hook 안에서 spawn? — 거부 (hook timeout + self-verification 아류). 메인이 dispatch + bypass 재시도 흐름 유지
- **Q-4 [RESOLVED via kzk-user-queue]**: `KZK_CYCLE_EXIT_SKIP=1` queue entry → 다음 user prompt 시점에 `kzk-user-queue §Stage 1 classify` 가 자동 검토. OK
- **Q-5 [RESOLVED]**: Prod-build smoke harness-context adapt → HTML/SoT alignment 로 일반화 (§F-3 형태). 이 repo 의 "user-facing artifact" = `docs/site/skill-flow.html`. 렌더 + index 접근 + fingerprint 어긋남 없음 확인
- **Q-6 [RESOLVED]**: Signal C (SoT diff 감지) → 폐기. 각 프로젝트 SoT 경로/이름 천차만별 → generic 감지 어려움. sub-check 3 에서 처리

## 13a. Open question for codex (cross-vendor lens)

- **OQ-1**: §3.3 정규식 + §3.3a convention 이 거짓 양성/거짓 음성 균형 OK?
- **OQ-2**: 4 sub-check 가 cycle 25 회귀 6건 (1a, 1b, 3, 3-b, 4, 4-b) 을 _실제로_ 잡았을지 시뮬레이션 — 특히 sub-check 4 (spec-freeze re-check) 가 Bug 2 (history UX) 을 잡을 메커니즘?
- **OQ-3**: Bypass env var 2개 동시 set (VERIFIED + SKIP) 시 어느 게 우선? → 제안: 둘 다 set 은 비정상이라 BLOCK + 명시 메시지
- **OQ-4**: Default propagate 정책의 다른 프로젝트 fallout — opt-out 메커니즘 (`--no-cycle-exit-hook`) 충분한가? 추가로 환경변수 `KZK_CYCLE_EXIT_DISABLE=1` 도?
- **OQ-5**: Hook order (`skill-flow-fresh` → `cycle-exit`) — cycle-exit 가 commit message 봐야 하는데 skill-flow-fresh 가 먼저 BLOCK 하면 cycle-exit 가 실행 안 됨. 문제 있나?
- **OQ-6**: `install/install-global.sh` 의 hook 재실행 멱등성 — 같은 matcher entry 중복 추가 방지 로직
- **OQ-7**: Test coverage 가 충분한가? §B-5 의 30+ 테스트 케이스 (Signal A 12 + Signal B 13 + Bypass 5 + Edge 4) 외 빠진 게 있나? (cycle 1 codex 지적 후 11→30+ 확장됨)
- **OQ-8**: `harness-share.md §3 Gate 6` 와 `§14.5 cycle-exit gate` 본문이 conflict 없나? 두 곳 모두 SoT 인데 어느 게 primary?
- **OQ-9 [RESOLVED via cycle 1 fix]**: §22.5 의 ALL-of 경로 (trivial + pre-specified + no-new-capability) 는 trivial false 로 불가. 대신 alternate path "explicit standalone skip command path with recorded evidence" 로 충족 — §2 의 brainstorm justification 본문에 8 turn conversation + 4 interactive decisions evidence 기록. Codex cycle 2 RESOLVED 확인

---

## 14. Definitions (reference)

- **Cycle**: 자가개선 또는 application 의 한 단위 작업. multi-phase 가능. `harness-flow-progress.md` 의 cycle entry 단위
- **Cycle-exit**: cycle 의 마지막 commit / PR / push (Signal A/B 정의대로)
- **Sub-check**: cycle-exit fresh-agent verifier 가 수행하는 4개 검사
- **Marker**: commit message 의 cycle-exit 신호 token — 3개만 (`MILESTONE:`, `CYCLE-EXIT:`, `STUB-CLEAR:`). Cycle keyword (`c\d+ final` 류) 는 §3.3 결정으로 명시 제외
- **Bypass env var**: `KZK_CYCLE_EXIT_VERIFIED` (verifier 결과 첨부) vs `KZK_CYCLE_EXIT_SKIP` (queue 등록 + 비상 통과)

---

## END OF DRAFT

Reviewer (user + codex) — focus on §3.3 Signal patterns, §3.4 Sub-check mandate, §10 Risk table, §11 Codex checklist, §13 Open questions.
