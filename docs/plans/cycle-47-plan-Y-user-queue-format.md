# Plan Y — user-queue.md format strengthening (cycle 47)

## Frozen

- Date: 2026-05-07
- Spec: `docs/plans/2026-05-07-cycle-47-b2-c1-queue-design.md` §5
- Survey: `docs/harness/surveys/2026-05-07-cycle-47-b2-c1-queue-survey.md` Sub-scope Y (L196)
- Depends on: Plan B2 (Q-FIX-PIVOT-FAIL producer originates there)
- Execution order: B2 → **Y** → C1

---

## Scope

4 file edits, single atomic commit (spec §8 R3 — migration window):

| # | File | Change |
|---|---|---|
| 1 | `harness-share.md` | §6 (L370–424): checkbox format, 3-section structure, RESOLVED capitalize |
| 2 | `~/.claude/skills/kzk-user-queue/SKILL.md` | producer table: 8 new rows after L84 |
| 3 | `~/.claude/skills/kzk-web-loop/SKILL.md` | L119 raw `echo >>` → section-aware awk insert |
| 4 | `docs/harness/user-queue.md` | full migration: 3-section format + 13 NOT_USED entries |

Out of scope: kzk-codebase-survey Q-* (already in table), harness-share.md §N layer-pivot section (Phase 3).

---

## Anchors

```bash
grep -n "^## 6\. user-queue" harness-share.md          # ~370
grep -n "Resolved entries" harness-share.md              # ~378 — capitalize fix
grep -n "^### Entry 형식" harness-share.md              # ~385 — insert after closing ```
grep -n "kzk-autonomous-boundary.*Halts append" ~/.claude/skills/kzk-user-queue/SKILL.md  # ~84 — append after
grep -n 'echo.*Q-PLUGIN-PREFLIGHT.*>>' ~/.claude/skills/kzk-web-loop/SKILL.md             # ~119 — replace
```

---

## New format (full template — verbatim per spec §5.1)

```markdown
# User Queue

> 시간 역순 — 최신 entry 위. 작업 끝 시 `- [x]` 체크.

## OPEN

_(없음)_

## RESOLVED

- [x] 2026-05-06 — Q-AUTONOMOUS-SOT — autonomous-mode detection SoT 신설, harness-share.md §33 (cycle 44)

## 사용하지 않음 (NOT_USED)

_mattpocock/skills MEDIUM cluster (cycle 47 C1 심사 결과 defer):_
- [ ] MEDIUM — setup-matt-pocock-skills — issue-tracker 워크플로 미채택 시 설치 불가 (전제조건 스킬)
- [ ] MEDIUM — to-issues — setup-matt-pocock-skills 선제 필요 + issue-tracker workflow 미채택
- [ ] MEDIUM — to-prd — kzk-spec-and-review 와 트리거 겹침, setup-matt-pocock-skills 선제 필요
- [ ] MEDIUM — triage — GitHub issue workflow 필요, grill-with-docs 연동 필요
- [ ] MEDIUM — write-a-skill — skill-creator (oh-my-claudecode) 이미 존재 (YAGNI)

_mattpocock/skills LOW cluster (cycle 47 C1 심사 결과 영구 skip):_
- [ ] LOW — tdd — kzk-test-coverage 와 트리거 충돌, autonomous-mode 미인식
- [ ] LOW — zoom-out — kzk-codebase-survey + kzk-large-task-delegation 중복
- [ ] LOW — prototype — UI/UX 전용, harness 워크플로와 무관
- [ ] LOW — migrate-to-shoehorn — TS test 전용, kzk-harness TS test infra 없음
- [ ] LOW — scaffold-exercises — ai-hero course platform 도메인 특수
- [ ] LOW — setup-pre-commit — Node.js 전용, kzk-pre-commit-gate 와 계층 충돌
- [ ] LOW — edit-article — 개인 문서 편집 도구, 적용 불가
- [ ] LOW — obsidian-vault — 하드코딩된 vault 경로, 이식 불가
```

---

## Producer table additions (spec §5.3)

Current SKILL.md: 7 producers (L76–L84). **8 new rows** — append after the line ending `...Halts append here when autonomous mode pauses.`:

```markdown
- **kzk-autonomous-boundary** (Q-TDD-MAIN): 자율 mode 에서 메인 컨텍스트가 TDD red 직접 진입 시도.
- **kzk-autonomous-boundary** (Q-MAIN-DIRECT-EDIT): 자율 mode 에서 메인 컨텍스트 직접 multi-file edit.
- **kzk-autonomous-boundary** + **kzk-large-task-delegation** + **kzk-pre-commit-gate** (Q-VERIFIER-FAIL): verifier 2회 연속 FAIL.
- **kzk-autonomous-boundary** + **kzk-large-task-delegation** + **kzk-pre-commit-gate** (Q-VERIFIER-INVALID): verifier 응답 `VERDICT:` prefix 누락.
- **kzk-autonomous-boundary** + **kzk-large-task-delegation** + **kzk-pre-commit-gate** (Q-VERIFIER-DISPATCH-FAIL): verifier subagent dispatch 실패.
- **kzk-codex-handoff** + **kzk-autonomous-boundary** (Q-CODEX-DISPATCH-FAIL): codex subagent dispatch 실패.
- **kzk-production-access** + **kzk-pre-commit-gate** (Q-PROD-CODE-FIRST-<TOPIC>): 프로덕션 state 변경 code-first check 실패.
- **kzk-fix-scope-expansion** (Q-FIX-PIVOT-FAIL): 모든 레이어 escalate 후에도 fix 실패 (cycle 47 신규).
```

Before appending: `grep "Q-FIX-PIVOT-FAIL\|Q-TDD-MAIN\|Q-VERIFIER" ~/.claude/skills/kzk-user-queue/SKILL.md` — skip any pre-existing row.

---

## kzk-web-loop section-aware write replacement (spec §5.4)

1 raw echo confirmed at L119 (spec note: survey "5개" was over-count — grep verified = 1).

**Before** (L119):
```bash
  echo "Q-PLUGIN-PREFLIGHT — claude plugin subcommand unavailable ($(cat /tmp/plugin-err.txt | head -1)), pre-flight skipped" >> docs/harness/user-queue.md
```

**After** (3-line block — preserve surrounding bash context):
```bash
  ENTRY="- [ ] $(date '+%Y-%m-%d %H:%M') — Q-PLUGIN-PREFLIGHT — claude plugin subcommand unavailable ($(cat /tmp/plugin-err.txt | head -1)), pre-flight skipped"
  sed -i '' '/^_(없음)_$/d' docs/harness/user-queue.md
  awk '/^## OPEN$/{print; print ENTRY; next} 1' ENTRY="$ENTRY" docs/harness/user-queue.md > /tmp/uq.tmp && mv /tmp/uq.tmp docs/harness/user-queue.md
```

---

## harness-share.md §6 update content (spec §5.5)

4 targeted Edit changes (never Write):

1. L378: `## Resolved` → `## RESOLVED` (capitalize to match new format)
2. After `### 운용` first bullet, add: `- 파일 위치: \`docs/harness/user-queue.md\`. 시간 역순 — 최신 entry 위.`
3. After closing ` ``` ` of `### Entry 형식` block (~L398), insert:

```markdown
### 섹션 구조

- `## OPEN` — 해결 대기 중인 entry. 최신 entry 위 (시간 역순).
- `## RESOLVED` — 완료된 entry (`- [x]` 체크). 시간 역순.
- `## 사용하지 않음 (NOT_USED)` — 미채택/defer backlog.

Simple one-liner (체크박스 형식):
```markdown
- [ ] YYYY-MM-DD HH:MM — Q-<TOPIC> — <한 줄 요약> (cycle N)
```
완료 시 `- [x]` 로 변경.
```

4. Existing `### Q-<TOPIC>` heading format stays as "상세 entry" form for complex entries.

---

## Acceptance criteria (presence-only)

| ID | Verification command | Expected |
|---|---|---|
| AC-Y-1 | `grep -cE "^## OPEN\|^## RESOLVED\|^## 사용하지 않음" docs/harness/user-queue.md` | 3 |
| AC-Y-1b | `grep "\- \[x\].*Q-AUTONOMOUS-SOT" docs/harness/user-queue.md` | match |
| AC-Y-2 | `grep "Q-FIX-PIVOT-FAIL" ~/.claude/skills/kzk-user-queue/SKILL.md` | match |
| AC-Y-3 | `grep -c 'echo.*Q-.*>>' ~/.claude/skills/kzk-web-loop/SKILL.md` | 0 |
| AC-Y-4 | `grep -c "## OPEN\|## RESOLVED\|## 사용하지 않음\|YYYY-MM-DD HH:MM" harness-share.md` | ≥4 |

---

## Subagent dispatch prompt (sonnet executor — atomic single commit)

```
You are an executor. Implement Plan Y — user-queue.md format strengthening, cycle 47.
Working directory: /Users/kimzerokim/work/personal/kzk-harness
Branch: main direct commit, no PR. All 4 edits in ONE commit.

Read this plan fully before starting:
  /Users/kimzerokim/work/personal/kzk-harness/docs/plans/cycle-47-plan-Y-user-queue-format.md

PREREQUISITE: verify Plan B2 complete:
  grep "Q-FIX-PIVOT-FAIL" ~/.claude/skills/kzk-fix-scope-expansion/SKILL.md
HALT if not found.

STEP 1 — harness-share.md: Edit (never Write). 4 changes from §harness-share.md §6 update content.
STEP 2 — ~/.claude/skills/kzk-user-queue/SKILL.md: Edit. Append 8 producer rows from §Producer table additions. Grep for duplicates first.
STEP 3 — ~/.claude/skills/kzk-web-loop/SKILL.md: Edit. Replace L119 echo line with 3-line block from §kzk-web-loop section-aware write replacement.
STEP 4 — docs/harness/user-queue.md: Write. Full file content from §New format template (verbatim).

Run all 5 ACs from §Acceptance criteria. Fix failures before committing.

Stage exactly:
  git add harness-share.md
  git add ~/.claude/skills/kzk-user-queue/SKILL.md
  git add ~/.claude/skills/kzk-web-loop/SKILL.md
  git add docs/harness/user-queue.md

Commit message (exact, no Co-Authored-By):
  refactor: cycle 47 — Plan Y user-queue format strengthening

  - harness-share.md §6: checkbox format, 3-section structure, RESOLVED capitalized
  - kzk-user-queue SKILL.md: 8 new producer rows (Q-TDD-MAIN, Q-MAIN-DIRECT-EDIT,
    Q-VERIFIER-*, Q-CODEX-DISPATCH-FAIL, Q-PROD-CODE-FIRST-*, Q-FIX-PIVOT-FAIL)
  - kzk-web-loop SKILL.md: raw echo >> replaced with section-aware awk insert
  - docs/harness/user-queue.md: migrated to OPEN/RESOLVED/NOT_USED + 13 NOT_USED entries
```

---

## Edge cases

- **Duplicate rows**: grep before append; skip any row already present.
- **Placeholder removal**: `_(없음)_` in `## OPEN` removed by `sed` before awk insert (web-loop replacement handles this).
- **Anchor mismatch**: use text anchors, not line numbers (approximate).
- **Global skill path**: `~/.claude/skills/kzk-web-loop/SKILL.md` is not git-tracked — edit global path only, not `skills/kzk-web-loop/SKILL.md`.
- **Single-commit**: all 4 files staged together; no intermediate commits (spec §8 R3).

---

## DO NOT

- Non-main branch (direct-main authorized per spec §1)
- Duplicate producer rows
- Write on harness-share.md or any SKILL.md (Edit only)
- Edit `skills/kzk-web-loop/SKILL.md` repo copy — global `~/.claude/skills/` only
- Add `Co-Authored-By` trailers

---

## Commit message

```
refactor: cycle 47 — Plan Y user-queue format strengthening

- harness-share.md §6: checkbox format, 3-section structure, RESOLVED capitalized
- kzk-user-queue SKILL.md: 8 new producer rows (Q-TDD-MAIN, Q-MAIN-DIRECT-EDIT,
  Q-VERIFIER-*, Q-CODEX-DISPATCH-FAIL, Q-PROD-CODE-FIRST-*, Q-FIX-PIVOT-FAIL)
- kzk-web-loop SKILL.md: raw echo >> replaced with section-aware awk insert
- docs/harness/user-queue.md: migrated to OPEN/RESOLVED/NOT_USED format
  with C1 NOT_USED entries (13 mattpocock/skills items)
```
