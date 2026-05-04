---
name: kzk-pre-merge-sync
version: 1.4.0
description: "Pre-merge/milestone checklist — sync CLAUDE.md + run deepinit before any user-visible milestone. Top triggers: 'merge', 'PR 직전', 'deepinit', 'CLAUDE.md sync', 'milestone marker'. Body §Triggers for full list."
---

> Authoritative source: `harness-share.md` §14.5 + §15. On conflict, that wins.

# kzk-pre-merge-sync

## Triggers

`merge`, `merge 전`, `feature branch`, `PR`, `PR 직전`, `deepinit`, `Pre-Merge`, `milestone marker`, `CLAUDE.md update`, `CLAUDE.md sync`, `manifest 재생성`.

Two checks before any user-visible milestone, regardless of branch contract (see `kzk-autonomous-boundary` §Branch contract):

- **PR-flow**: run before `gh pr create` on the feature-branch tip (target = `feature/<topic>` in adopting projects, or repo-specific like `harness-test` for kzk-harness self-test).
- **Direct-main / direct-no-PR flow**: run before each user-visible milestone commit — typically a topic's final/closing commit, a release-equivalent state, or any commit the user is likely to call out as "this is the version to use." Don't run before every direct-main commit; that's noise. Run when the milestone matters.

## 1. CLAUDE.md sync (mandatory)

Verify the following sections in repo root `CLAUDE.md` match the current code state. Fix mismatches before merge:

- **Tech Stack** — `package.json` deps + ORM / framework / library changes
- **Project Structure** — new modules / directories / files
- **API Endpoints** — controller endpoint additions / removals / path changes
- **Database** — schema changes (table add/remove, column add/remove)
- **Key Rules** — any rule change
- **Environment Variables** — new env var

Checkpoint: PR description includes the literal line `CLAUDE.md updated to match current state`. Reviewer blocks merge if missing.

Automation: dispatch a fresh subagent with prompt "compare CLAUDE.md vs current code (Tech Stack / Project Structure / API Endpoints / Database / Key Rules / Env Vars), list outdated sections, propose patch in single Edit". OMC `/document-release` is broader-scope (whole docs/) — direct dispatch is preferred for CLAUDE.md alone.

## 2. `/oh-my-claudecode:deepinit` (mandatory)

Regenerates project manifest + skill/tool inventory + memory.

```
Skill("oh-my-claudecode:deepinit")
```

- Target — **PR-flow**: every feature branch → `main` merge, exactly once locally before `gh pr create`. **Direct-main / direct-no-PR flow**: once before each user-visible milestone commit (see opening section above for what counts as a milestone).
- **In autonomous mode under PR-flow**: deepinit runs at PR-creation time on the feature-branch tip, regardless of prior local deepinit in the same session. Merge is gated by explicit user "merge it" — the deepinit refresh happens on the feature branch, not at merge time.
- **In autonomous mode under direct-main / direct-no-PR flow**: deepinit runs before the milestone-marker commit. Skipping deepinit just because there is no PR boundary is a violation — the contract changed, not the discipline.
- Why: PRD / plan / skill md changes that aren't reflected in OMC memory cause the next session's agent to start with stale context
- Failure → check log, fix, do not skip. Skip = block merge.
- Checkpoint: PR description includes the literal line `deepinit ran`

## 3. Hook auto-enable (Plan D + Plan B, fail-closed)

**5 plan (A→D→B→C→E)** 모두 끝나고 `feature/memory` → `main` 머지 직전, regression-recall + fix-scope-trigger hook 의 default DISABLED 를 ENABLED 로 전환:

```bash
bash install/install-global.sh --enable-hooks --regression-recall --fix-scope-trigger
```

`--regression-recall` + `--fix-scope-trigger` 는 explicit dependency 로 `--enable-hooks` (keyword-detector) 도 자동 enable.

**사용자 confirm 게이트 의무** — 자동 호출 전 user 명시 confirm 받음. 거부 시 manual enable path 안내:
- 거부 → 후속 enable 은 사용자가 직접 위 command 실행. PR description 또는 milestone commit message 에 "regression-recall hook left disabled by user request" 명시 의무
- ACK → install-global.sh 자동 호출, 결과 stdout 로 사용자에게 보고

**fail-closed 검증** (codex #3):
1. `install-global.sh --enable-hooks --regression-recall --fix-scope-trigger` exit code 검사 — non-zero → merge block (`exit 1`)
2. settings.json 의 `UserPromptSubmit` 배열에 `regression-recall.mjs` entry 1개만 존재 검증 (jq 로 count). 0개 또는 2개+ → merge block
3. `jq` 미설치 시 사전 검사 → 사용자에게 `brew install jq` 안내 + merge block

위 3 검증 모두 PASS 시만 머지 진행.

**왜**: Plan D + B commit 시점에는 default DISABLED — 다음 cycle 의 자가오염 차단. 5 plan 끝나고 머지 단계가 first-enable 의 자연 게이트 (망각 차단). fail-closed 라 silent install 실패가 사용자 모르게 머지되는 패턴 차단.

Skip = block merge. 단, 사용자가 명시적으로 "regression-recall 비활성 유지" 선언한 경우만 skip 허용 (PR description 또는 milestone commit message 에 명시).

Checkpoint: PR description (PR-flow) 또는 milestone commit message (direct-main flow) 에 다음 줄 의무:
- ENABLED: `regression-recall hook enabled via kzk-pre-merge-sync step 3`
- ENABLED: `fix-scope-trigger hook enabled via kzk-pre-merge-sync step 3`
- 사용자 명시 거부: `regression-recall hook left disabled by user request`

## Combined PR description footer

```
## Pre-merge checklist

- [x] CLAUDE.md updated to match current state
- [x] deepinit ran
- [x] kzk-pre-commit-gate full gate PASS (Gate 0 N/A if no AGENTS.md hierarchy; otherwise all of 0, 1, 1.5, 2, 3, 4) on final commit
- [ ] Experiment complete + user merge approval received (PR-flow), OR milestone marker reached + user notified (direct-main / direct-no-PR flow). Skip if PR target is a non-main feature branch.
- [ ] regression-recall hook enabled via step 3 (or user-declined per spec rev6 §Default DISABLED, fail-closed verified)
```

## 4. Freshness sweep

> Cross-ref: `kzk-freshness-guard` §자동 호출 지점

merge/milestone 직전 전체 메타 문서 CRG 기반 최종 검증:

1. `crg-utils.getChangedFiles('base')` → branch 전체 변경 파일
2. `crg-utils.findStaleMetaDocs(changedFiles)` → stale 메타 문서 감지
3. stale 발견 시: auto-fix dispatch (Gate 0.5 와 동일 전략) → fix 후 추가 commit
4. stale 없음 → PASS, merge 진행

## Interaction with other kzk-*

- **kzk-autonomous-boundary**: Defines when autonomous PR creation is allowed (post-review explicit user merge approval is the sole exception).
- **kzk-pre-commit-gate**: Provides the gate-PASS line this skill writes into the PR footer.
- **kzk-spec-and-review**: Pre-PR `deepinit_manifest` refresh updates the AGENTS.md memory that codex review reads.
- **kzk-regression-memory**: 본 skill step 3 가 regression-recall hook 의 first-enable gate. spec rev6 §Default DISABLED 의 자동 enable 진입점. fail-closed (jq 부재 / install-global.sh non-zero / duplicate entry → merge block).
- **kzk-freshness-guard**: merge 직전 전체 freshness sweep (§4)
