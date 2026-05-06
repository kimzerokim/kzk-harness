# Plan B2 — Fix layer-pivot inline (cycle 47)

## Frozen

2026-05-07 | spec: `docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md` §3 | survey: `docs/harness/surveys/2026-05-07-cycle-47-b2-c1-queue-survey.md` §Sub-scope B2 | codex: `docs/research/codex-reviews/cycle-47-spec-critic-review.md`

## Scope

Single commit on main. Exactly 3 file edits:

1. `skills/kzk-fix-scope-expansion/SKILL.md` — insert `## Fix layer pivot (Phase 2)` section between L108 and L110; bump `version: 1.3.0` → `version: 1.4.0`
2. `~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` — identical changes (global mirror; zero drift confirmed)
3. `~/.claude/skills/kzk-autonomous-boundary/SKILL.md` — append `Q-FIX-PIVOT-FAIL` row after `Q-CODEX-DISPATCH-FAIL` row in halt table

Out of scope: `harness-share.md §3.5` (deferred, spec §7), `kzk-user-queue` producer table (Plan Y §5.3).

## Anchors

**Files 1 & 2** — old_string for section insert (unique):
```
**Cache 부재**: N/A (fix-scope-trigger hook 비활성 또는 fix intent 아닌 commit).

## 자가-skip guard
```
Version anchor: `version: 1.3.0` (frontmatter L3).

**File 3** — old_string (last halt table row, unique):
```
| `Q-CODEX-DISPATCH-FAIL` | codex subagent dispatch 자체 실패 — `kzk-codex-handoff §Fresh subagent 호출 패턴` 정의 | BLOCK + Q-CODEX-DISPATCH-FAIL entry. fallback 1: 메인 직접 codex. fallback 2: critic opus | fallback PASS 또는 사용자 manual review OK |
```

---

## New section content (verbatim from spec §3.3)

```markdown
## Fix layer pivot (Phase 2)

> Authoritative source: 현재 self-authoritative. harness-share.md §N 신설 시 그것이 우선.

### Operational definitions (added cycle 47)

- **"같은 방향 (same direction)"**: 두 연속 fix attempt 가 같은 root-cause label 을 공유한 경우. label 형식 = `<layer>:<symptom-key>` (예: `L1:tailscale-mtu-fragmentation`). label 충돌 시 = same direction.
- **"실패 (failure)"**: 다음 중 하나 — (a) 추가한 test 가 red 상태로 남음, (b) 사용자 보고 증상이 fix 후 동일 (변화 없음), (c) fix 후 30 초 내 동일 stack trace 재발. (a)(b)(c) 모두 검증 가능 신호.
- **레이어 라벨 사전** (L3 표 의미 = 본체 코드, 예시 텍스트 충돌 수정):
  - L0 = 외부 설정 / OS / 네트워크 / 인프라 (kubelet config, /etc/, route table)
  - L1 = wrapper / IaC / 배포 스크립트
  - L2 = SW 내부 설정 (config file, env var consumed by app)
  - L3 = 본체 application 소스 코드

### When to escalate

**Same-layer consecutive fail rule**: 동일 레이어에서 같은 방향 fix 가 2회 연속 실패 시 → 한 레이어 바깥으로 escalate.

Layer 계층 (바깥 → 안):

| 레이어 | 범위 예시 |
|---|---|
| **L0** | OS / 외부 환경 — route, DNS, firewall, env var, 시스템 권한 |
| **L1** | wrapper / middleware config — proxy, reverse-proxy, load balancer |
| **L2** | SW internal config — app config, feature flag, 설정 파일 |
| **L3** | SW core logic — 소스 코드, 알고리즘, 데이터 구조 |

탐색 순서: 문제가 발생한 레이어 → L0 방향으로 escalate.

**예시 (Tailscale 케이스)**: Claude 가 L3 (본체 소스 코드) 에서 2회 실패 → L2 (SW 내부 설정) 확인 → L1 (wrapper) 확인 → L0 (route add) 에서 1줄 fix 성공.

### Fix-verify hook 확장

Fix-verify hook (§Fix-verify hook 참조) 실행 후, 동일 레이어에서 2회 연속 실패 감지 시:

1. 현재 레이어 기록 (L0/L1/L2/L3)
2. 한 레이어 바깥으로 이동, 해당 레이어에서 원인 재조사
3. L0 도달 후에도 미해결 → `Q-FIX-PIVOT-FAIL` entry 를 `docs/harness/user-queue.md` `## OPEN` 섹션에 추가 후 halt

### Q-FIX-PIVOT-FAIL entry 형식

~~~markdown
- [ ] YYYY-MM-DD HH:MM — Q-FIX-PIVOT-FAIL — <함수명/증상> 모든 레이어 escalate 후 미해결 (cycle N)
~~~

상세 항목은 entry 아래 sub-list:
~~~markdown
  - Context: <증상 + 레이어별 시도 내역 (L3→L2→L1→L0)>
  - Tentative default: 사용자 직접 L0 환경 확인
  - Impact: 자율실행 halt — 레이어 전환 없이 진행 불가
~~~

### Anti-patterns (G1/G2/G4)

- G1: L3 단독 집중, L0 미검토 → layer 계층 순서대로 바깥부터 확인
- G2: 실패 후 동일 방향으로 variation 반복 2회 → 즉시 레이어 전환
- G4: "왜 안 되는지" 설명만 제공, 1줄 fix 미제공 → 진단은 sub-bullet, 첫 줄은 항상 실행 가능한 fix
```

---

## Halt table row content (verbatim)

```
| Q-FIX-PIVOT-FAIL | layer-pivot 룰이 L0 도달 후에도 fix 실패 (`kzk-fix-scope-expansion §Fix layer pivot`) | halt + Q-FIX-PIVOT-FAIL entry. fallback: 외부 시스템 또는 사용자 manual 분석 | 사용자 결정 (분석 결과 기반 fix 재진입 또는 task abandon) |
```

---

## Acceptance criteria (presence-only)

> Presence-only: grep exit 0 = pass.

- **AC-B2-1**: `grep -l "## Fix layer pivot" skills/kzk-fix-scope-expansion/SKILL.md ~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` → 2 paths
- **AC-B2-2**: `grep "^version: 1.4.0" skills/kzk-fix-scope-expansion/SKILL.md ~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` → 2 hits
- **AC-B2-3**: `grep "Q-FIX-PIVOT-FAIL" ~/.claude/skills/kzk-autonomous-boundary/SKILL.md` → ≥ 1 hit

---

## Subagent dispatch prompt (sonnet executor)

You are executing Plan B2 of cycle 47. Working directory: `/Users/kimzerokim/work/personal/kzk-harness`. Make exactly 3 file edits. No new files. No harness-share.md edits. No Co-Authored-By trailers. Read each target file before editing.

Pre-flight: `diff skills/kzk-fix-scope-expansion/SKILL.md ~/.claude/skills/kzk-fix-scope-expansion/SKILL.md` — any output → halt, queue Q-PLAN-B2-DRIFT.

**Edit 1** — `skills/kzk-fix-scope-expansion/SKILL.md`: (a) replace `version: 1.3.0` → `version: 1.4.0`; (b) insert the full `## Fix layer pivot (Phase 2)` section (verbatim from "New section content" above) between `**Cache 부재**: N/A...` and `## 자가-skip guard`.

**Edit 2** — `~/.claude/skills/kzk-fix-scope-expansion/SKILL.md`: same two changes as Edit 1.

**Edit 3** — `~/.claude/skills/kzk-autonomous-boundary/SKILL.md`: pre-flight `grep -c "Q-FIX-PIVOT-FAIL"` — skip if ≥ 1. Otherwise find the `Q-CODEX-DISPATCH-FAIL` table row and append the halt row from "Halt table row content" immediately after it.

Run all three AC checks. Then commit (repo file only):
```bash
git add skills/kzk-fix-scope-expansion/SKILL.md
git commit -m "$(cat <<'EOF'
refactor: cycle 47 — Plan B2 fix layer-pivot inline

Add ## Fix layer pivot (Phase 2) to kzk-fix-scope-expansion (v1.3.0→1.4.0).
Global mirror synced. Q-FIX-PIVOT-FAIL row added to kzk-autonomous-boundary
halt table. Resolves G1/G2 meta-gaps. G3/G4 deferred per spec §7.

Spec: docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md §3
EOF
)"
```

---

## Edge cases

- **Repo/global drift**: diff non-empty → halt, queue Q-PLAN-B2-DRIFT, do not silently merge
- **Q-FIX-PIVOT-FAIL already in boundary file**: skip Edit 3 if grep count ≥ 1
- **`## 자가-skip guard` anchor missing**: anchor is content-based (unique string), resilient to line shifts; if still missing → halt

---

## DO NOT

- Edit `harness-share.md` §3.5 (deferred, spec §7)
- Edit `kzk-user-queue` SKILL.md producer table (Plan Y §5.3)
- Bump version beyond `1.4.0`
- Use Write tool (Edit only — files exist)
- Add `Co-Authored-By` trailers

---

## Commit message

```
refactor: cycle 47 — Plan B2 fix layer-pivot inline

Add ## Fix layer pivot (Phase 2) to kzk-fix-scope-expansion (v1.3.0→1.4.0).
Global mirror synced. Q-FIX-PIVOT-FAIL row added to kzk-autonomous-boundary
halt table. Resolves G1/G2 meta-gaps. G3/G4 deferred per spec §7.

Spec: docs/superpowers/specs/2026-05-07-cycle-47-b2-c1-queue-design.md §3
```
```
