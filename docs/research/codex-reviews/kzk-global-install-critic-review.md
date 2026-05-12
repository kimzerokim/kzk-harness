---
topic: kzk-global-install
reviewer: critic-opus
date: 2026-05-04
codex_status: timeout-after-5min-no-verdict-fallback
spec: docs/plans/2026-05-04-kzk-global-install-design.md
---

# kzk-harness Global Install — Critic Review

## Pre-commitment Predictions

Before reading the spec in detail, I predicted these likely problem areas:

1. **Skill discovery sub-dir conflicts** — putting an umbrella `kzk-harness/` dir alongside per-skill `kzk-*/` dirs in `~/.claude/skills/` would either be silently ignored or treated as a broken skill (no SKILL.md).
2. **Symlink dev mode leaks WIP drafts** to all repos (the user's own Q5).
3. **Project-vs-global precedence** assertion without verification (Q2).
4. **`harness-share.md` resolution** — every SKILL.md says `> Authoritative source: harness-share.md §N` as a bare filename; works in repo dev (cwd-based) but breaks in foreign repos where the file lives at `~/.claude/skills/kzk-harness/harness-share.md`.
5. **`<!-- BEGIN kzk-harness skills -->` marker race** during concurrent `install --update` and OMC's own CLAUDE.md writers.

Findings 1, 2, 4 confirmed. Finding 3 confirmed as a real Q2 risk the spec acknowledges but does not resolve. Finding 5 is partial — addressed (idempotent rule) but no concurrency guard.

I escalated to **ADVERSARIAL** mode after confirming finding 1 (umbrella dir) AND surfacing 3 additional MAJOR findings that cluster around the same root cause: spec asserts how Claude Code skill discovery behaves without verifying it.

---

## Axis 1 — Open Questions Q1–Q5

### Q1 — Skill discovery sub-dir spec — VERDICT: 🟡 partial

The spec asks "is `~/.claude/skills/<dir>/SKILL.md` auto-scan official or convention?". **Evidence on disk says it is real and works**: `/Users/kimzerokim/.claude/skills/canary/SKILL.md`, `/Users/kimzerokim/.claude/skills/cso/SKILL.md`, etc., plus the runtime list at the start of this very session shows `canary`, `cso`, `freeze`, etc. as available skills. Same pattern in plugin caches (superpowers `skills/brainstorming/SKILL.md`).

However the spec then proposes putting `~/.claude/skills/kzk-harness/` as an **umbrella dir without a SKILL.md** (only `harness-share.md`, `VERSION`, `README.md`). gstack has `~/.claude/skills/gstack/` and that dir DOES contain `SKILL.md` — gstack itself is also a skill. So spec §6.1's umbrella pattern **diverges from the proven pattern** and is not validated by any of the three reference systems.

- **Recommended one-line spec edit**: Section 6.1: "Place `harness-share.md` / `VERSION` / `README.md` directly at `~/.claude/skills/kzk-harness/` AND include a stub `SKILL.md` (frontmatter-only, `name: kzk-harness`, description = "umbrella skill for shared harness-share.md reference") so Claude Code's scanner does not flag the dir as malformed."

### Q2 — Project-over-global precedence — VERDICT: 🔴 breaks

Spec §8.1 assumes "프로젝트 → 글로벌". I cannot verify this from the host system: there is no documented Claude Code precedence rule, and the spec itself flags Q2 as unverified. The G6 acceptance criterion ("기존 per-project install 호환") **silently breaks** if precedence is reversed (global wins) — every existing per-project user gets stale globally-pinned skills overriding their bumped local versions.

- **Recommended one-line spec edit**: Section 8.1: "Add AC8: Before merging, run a precedence probe — install a local SKILL.md with `version: 99.0.0` and a global with `version: 1.0.0`, both `name: kzk-test-precedence`, then trigger and inspect which one's content was loaded; if global wins, switch §8.1's strategy to **prefix-based naming** (e.g. global stays `kzk-X`, per-project rename `kzk-X-local`) and add to install-global.sh: warn-and-rename existing `.claude/skills/kzk-*` dirs."

### Q3 — `~/.claude/CLAUDE.md` auto-load — VERDICT: ✅ holds

Confirmed by inspection: `/Users/kimzerokim/.claude/CLAUDE.md` is currently in this session's system prompt (cited as "user's private global instructions for all projects"), and OMC's `<!-- OMC:START -->` block at its top is rendered into the kickoff context. So the assumption is correct.

- **Recommended one-line spec edit**: Section 5: replace "Anthropic 가 자동 로드한다는 사양 자체는 있음" with "Confirmed: `~/.claude/CLAUDE.md` is auto-loaded into every Claude Code session's system context (verified 2026-05-04 against an active session)."

### Q4 — omc/gstack hook conflict on triggers — VERDICT: 🟡 partial

OMC ships UserPromptSubmit hooks (`keyword-detector.mjs`) that fire on every prompt and intercept "ralph", "autopilot", etc. kzk-autonomous-boundary's trigger keywords include "ralph로 체크" / "ralph로 확인" — the **first token "ralph"** matches OMC's keyword detector before kzk's SKILL.md description-based matching gets a chance. The spec's mitigation ("description 명확화") is hand-waving — OMC's hook fires at the runtime layer, SKILL.md description is at the planning layer. They do not race; OMC's hook always wins on bare "ralph".

The spec's existing trigger choices ("ralph로 체크", "ralph로 확인") are deliberate variants but kzk-autonomous-boundary still includes the bare `ralph` keyword (verified `/Users/kimzerokim/.claude/skills/...` patterns in skill catalog).

- **Recommended one-line spec edit**: Section 11 R3: "install-global.sh detects OMC's UserPromptSubmit hook (`~/.claude/plugins/cache/omc/.../hooks/keyword-detector.mjs`); if present, warns the user that `ralph` triggers OMC, recommend the user adopt phrase variants `ralph로 체크` / `ralph로 확인` for kzk-autonomous-boundary."

### Q5 — Symlink dev mode WIP leak — VERDICT: 🔴 breaks

The spec acknowledges the risk (Section 11 R7) but the mitigation ("dev mode 활성 시 install 결과에 명시. branch protect 룰") is insufficient: the user develops kzk-harness on `feature/<topic>` branches with WIP SKILL.md frontmatter changes; symlink resolves to `<repo>/skills/kzk-X/SKILL.md` directly, bypassing the version-check guard that protects file-copy installs from picking up WIP. Branch protect prevents `main` edits but NOT `feature/*` edits.

- **Recommended one-line spec edit**: Section 8.2: "Symlink dev mode is reversed — instead of symlinking 14 skills globally, symlink ONLY `harness-share.md` from `~/.claude/skills/kzk-harness/` to the repo root. Per-skill SKILL.md files use the file-copy install + manual `--update` after each commit, so global-installed skills always match the merged-to-`main` content, not WIP drafts."

---

## Axis 2 — Architecture (§6) Critique

### §6.3 single-source vs dual-source — HOLDS

§6.3's reasoning ("two sources drift") is sound for `harness-share.md`. Verified all 14 SKILL.md files cite `harness-share.md` as a bare filename without absolute path (e.g. `> Authoritative source: harness-share.md §22`), so a single global copy is fine **so long as Claude can resolve "harness-share.md" without an explicit cwd**. In foreign repos where the file is NOT at cwd, Claude must guess `~/.claude/skills/kzk-harness/harness-share.md` — undocumented behavior. Recommended adding a marker line in §6.5 SKILL.md frontmatter discipline: `> Authoritative source path: ~/.claude/skills/kzk-harness/harness-share.md (when global) or ./harness-share.md (when project-local)`.

### §6.1 umbrella dir — BREAKS gstack-pattern

Verified gstack's `~/.claude/skills/gstack/SKILL.md` is itself a real skill — so the umbrella IS a skill. kzk-harness's proposed `~/.claude/skills/kzk-harness/` has only `harness-share.md` + `VERSION` + `README.md` (no SKILL.md). This is **untested territory** in Claude Code. Either: (a) Claude scanner ignores SKILL.md-less dirs cleanly, (b) it warns/errors on a malformed skill dir, or (c) it mistakes the README.md as a skill. Spec does not commit a position. Add SKILL.md stub or rename umbrella to `~/.claude/skills/.kzk-harness-shared/` (dotfile, ignored by scanner). See Q1 recommendation.

### §6.4 marker convention idempotency — PARTIAL

The `<!-- BEGIN kzk-harness skills -->`/`<!-- END kzk-harness skills -->` pattern is consistent with OMC's `<!-- OMC:START -->`/`<!-- OMC:VERSION:4.13.5 -->` (verified at `~/.claude/CLAUDE.md` line 1-2). However:

1. **No concurrency guard**: two `install-global.sh --update` invocations racing (one user, one cron-like ralph cycle) can corrupt the marker block. spec only mitigates via single-process backup — but POSIX file copy is not atomic across the read-modify-write pattern. Add `flock /tmp/kzk-install-global.lock` to install-global.sh.
2. **`<!-- END -->` missing in OMC's pattern** — OMC seems to use only `<!-- OMC:START -->` + `<!-- OMC:VERSION:N -->` and trusts the next H1/section break as the implicit end. The kzk spec uses explicit BEGIN/END which is more robust BUT means a user typing inside the block but past `<!-- END -->` is safe, while editing right after `<!-- BEGIN -->` is destructive. spec §6.4 mitigation (preview prompt) is adequate but not enforced — it should be a hard `--yes` gate, not silent.

---

## Axis 3 — Migration / Backward Compat (§8)

### §8.1 precedence — see Q2 (BREAKS without verification)

### §8.2 symlink-mode — see Q5 (BREAKS WIP isolation)

### §8.3 uninstall — PARTIAL

The uninstall script removes the marker block, the 14 dirs, and the umbrella, but **does not remove per-project artifacts** (`harness-flow-progress.md`, `docs/harness/`, `.web-loop/`, `.omc/`, `docs/research/codex-reviews/`). On reinstall, those orphaned artifacts pre-populate skill working dirs with stale state (e.g., `.web-loop/cycle-N-report.md` from 6 months ago), and the user thinks they're new cycles. Spec §8.3 step 3 says "백업은 유지 (사용자 수동 삭제)" but does NOT address per-project artifact orphans.

- **Recommended fix**: Add `uninstall-global.sh --purge-project-artifacts <path>` for the user to opt-in clean specific repos. Default is leave-as-is, with a printed list of "found orphaned artifacts in: <list of $HOME-relative paths>" for user awareness. Also add to `install-global.sh --update`: detect very old `.web-loop/cycle-*-report.md` (mtime > 90 days) and warn.

---

## Axis 4 — Self-Trigger Matrix (§10) Completeness

The 7-row matrix covers the main canonical chains. Real user prompts that fall outside:

1. **"이거 어떻게 동작해?" / "이 코드 설명해줘"** for a feature spanning 5+ files — verified-by-spec the user's exact pattern. Currently the spec maps this to row 1 (`kzk-large-task-delegation §Read-heavy audit`), but row 1's example is "spec ↔ 구현 매칭 / 버그 전수조사", framed as audit. Generic "explain how X works" reads as an exploration request, not an audit — likely misses. **Add row 8**: "Explain / understand / how-does-X-work (5+ files) → kzk-codebase-survey (without spec authoring)".

2. **Web-loop sessions** — `kzk-web-loop` is in the matrix but only implicitly via "자가개선 cycle" which talks about kzk-harness itself. External-repo web-loop runs (the actual primary use case) are not called out. **Add row 9**: "External web product loop ('웹 루프 돌려', '자율 개선') → kzk-web-loop (assumes web project)".

3. **Production access** ("AWS 한번 살펴봐", "DB 상태 확인") — currently row 6 ("Production / DB / IAM 작업") is fine but does not mention that kzk-production-access **must precede** any kzk-large-task-delegation EXPLORER subagent that crosses prod boundary. Spec §10 should clarify: kzk-production-access has primacy over delegation.

4. **`commit it` / `let's commit` (English)** — spec rows 4 mention "Cycle 끝에서 commit" but the trigger keyword in `kzk-pre-commit-gate` description (`commit, pre-commit, ...`) is fine. Not a gap, just verifying.

5. **PR review request** ("이 PR 리뷰 좀") — not in the matrix. Maps to no kzk skill currently (kzk-pre-merge-sync handles author-side, not reviewer-side). **Either add a new skill (out of scope for this spec) or note in matrix row 4 that reviewer-side PR reviews are a known gap, route to OMC `code-reviewer` agent.**

6. **Implementation verification** ("구현이 spec 대로 됐나 확인") — covered by row 1 BUT row 1's chain is `kzk-large-task-delegation §Read-heavy audit`. Should be `kzk-codebase-survey` first, then large-task-delegation. Spec §26 (kzk-codebase-survey) explicitly lists this use case ("Implementation verification (spec ↔ 코드 매칭, 버그 전수조사, 기존 시스템 audit)"). **Update row 1 chain**: `kzk-codebase-survey → kzk-large-task-delegation §Read-heavy audit`.

---

## Axis 5 — Acceptance Criteria (§13)

| AC | Verifiable? | Concrete test |
|---|---|---|
| AC1 — trigger fires in new dir | 🟡 partial — "인용됨" is fuzzy | `mkdir /tmp/kzk-test && cd /tmp/kzk-test && claude -p '"spec 잡자" 한 줄 발화 후, 메인이 kzk-spec-and-review 의 Step 0 codebase survey 룰 또는 Step 1-3 cross-vendor review 절차를 명시적으로 인용하는지 응답하라' 2>&1 \| grep -E "(Step 0\|cross-vendor\|kzk-codebase-survey)"` |
| AC2 — marker + 14 rows | ✅ verifiable | `awk '/<!-- BEGIN kzk-harness skills -->/,/<!-- END kzk-harness skills -->/' ~/.claude/CLAUDE.md \| grep -c '^\| kzk-' \| grep -q '^14$'` |
| AC3 — idempotent re-run | 🟡 partial — "stale 0 + 변경 0" only true when source unchanged | Run install twice; second run should `git diff --stat` against `~/.claude/skills/kzk-*` and produce 0 changed bytes. Use `find ~/.claude/skills -name 'kzk-*' -newer /tmp/kzk-install-marker -type f` should return empty. |
| AC4 — symlink + edit reflects | ✅ verifiable | After `--symlink-mode`: `echo "TEST_TOKEN_$$" >> /Users/kimzerokim/work/personal/kzk-harness/skills/kzk-codebase-survey/SKILL.md && cd /tmp && claude -p '<trigger>' \| grep TEST_TOKEN_` (cleanup: revert) |
| AC5 — external repo opus-read avoidance | 🔴 not verifiable as written | "메인이 직접 5+ 파일 opus read 하지 않음" — main agent's behavior cannot be observed without instrumentation. Concrete test: `claude --output-format json -p '<trigger>' \| jq '[.message[] \| select(.tool_use.name == "Read")] \| length'` should be ≤ 2 from main, with a Task/Agent dispatch present. |
| AC6 — uninstall preserves omc/gstack | ✅ verifiable | Pre-uninstall snapshot: `grep -c '<!-- OMC:START\|## office-hours' ~/.claude/CLAUDE.md`. Post-uninstall: same count. Diff check: `diff <(grep -v 'kzk-harness' ~/.claude/CLAUDE.md.kzk-bak-*) ~/.claude/CLAUDE.md` empty. |
| AC7 — new skill auto-propagation | ✅ verifiable | Add `skills/kzk-foo/SKILL.md` to source repo, run `install-global.sh --update`, then `ls -1 ~/.claude/skills/kzk-foo/SKILL.md` exits 0. |

**Fuzziness**: AC1 and AC5 need behavioral instrumentation. AC3's "변경 0" needs file-stat snapshot. Recommend adding the bash tests above directly to §13.

---

## Axis 6 — P0/P1/P2 Findings

**P0 (BLOCK)**

1. **§6.1 umbrella dir lacks SKILL.md** — diverges from gstack's proven pattern. Either Claude scanner errors, ignores cleanly, or rejects. Spec must verify or add a stub SKILL.md. **Confidence: HIGH** (verified gstack has SKILL.md; verified spec proposes none; behavior of mismatched case unverified).

2. **Q2 precedence assumption unverified, but G6 depends on it** — spec asserts project-over-global; if Claude Code is global-over-project (common pattern in many tools), G6 silently breaks for every existing per-project user. **Confidence: MEDIUM** (untested but high-impact). Concrete probe required before merge (see Q2 fix).

**P1 (REVISE)**

3. **R9 / Q4 — OMC `ralph` UserPromptSubmit hook intercepts kzk triggers**. Spec mitigation is hand-waving. install-global.sh must detect OMC's hook and warn. **Confidence: HIGH** (verified OMC pattern via `~/.claude/CLAUDE.md` OMC:START block + UserPromptSubmit hook architecture in OMC plugin cache).

4. **Symlink dev mode leaks WIP** (Q5) — `feature/*` branch SKILL.md drafts leak globally, breaking trigger discipline in unrelated repos. Spec mitigation is "branch protect main" — wrong layer. **Confidence: HIGH**.

5. **No concurrency guard on `~/.claude/CLAUDE.md` writes** — `flock` missing from spec. Race risk under autonomous loops. **Confidence: MEDIUM** (race possible, not confirmed via reproduction).

6. **Self-trigger matrix row 1 misses kzk-codebase-survey precedence** — row 1 chain should be `kzk-codebase-survey → kzk-large-task-delegation`, not large-task-delegation alone. Without survey first, executor lacks scope context (literally the §26 use case). **Confidence: HIGH** (verified §26 of harness-share.md).

7. **AC5 not verifiable as written** — "메인이 직접 5+ 파일 opus read 하지 않음" needs instrumentation. spec lacks the mechanism. **Confidence: HIGH**.

**P2 (NICE-TO-HAVE)**

8. **§7.2 step 7 — `--skip-project` flag** is a real gap (verified `dependencies.sh` has 0 occurrences of `--skip-project` or `version_check`); spec calls it correctly as a future implementation step. Mark as known TBD in plan, not now in spec. **Confidence: HIGH**.

9. **§8.3 uninstall leaves orphaned per-project artifacts**. Document the orphan list, opt-in `--purge-project-artifacts` flag.

10. **§1.3 row 3 minor inaccuracy** — OMC plugin path is `~/.claude/plugins/cache/omc/oh-my-claudecode/4.13.5/` (verified), spec implies `claude-plugins-official` namespace (which is superpowers). Cosmetic — but the spec uses this comparison to justify decisions, so accuracy matters.

---

## Self-Audit

- All P0/P1 findings cite file:line (`~/.claude/skills/...`, spec §N) or quoted spec text. ✅
- LOW confidence findings: none — all moved to P2 or open questions if uncertain.
- Refutability check: P1 finding #5 (concurrency) could be refuted with "ralph never runs install-global.sh" — author could fairly push back. Keeping at P1, not P0.
- Style vs flaw: all are flaws (architecture or verifiability), not stylistic preferences.

## Realist Check

- **P0 #1 (umbrella dir)**: realistic worst case = Claude Code logs a warning + ignores the dir. Mitigated by the fact that even if it errors, harness-share.md content does not need to be a skill — it's referenced markdown. Severity holds at P0 because verification is one-line work.
- **P0 #2 (precedence)**: worst case = G6 silently broken for ~5 existing kzk-harness users. Holds at P0 because it requires a 5-min probe to verify, not blocked.
- **P1 #3 (OMC ralph hook)**: confirmed real interception pattern. Mitigated only if user already uses non-bare-ralph variants. Stays P1.
- **P1 #5 (concurrency)**: not confirmed via repro, only theoretical. Downgrade to P2? Real-world: ralph cycles do not run install-global.sh during runtime; user only runs it manually. **Downgraded to P2** — mitigated by: install is not a runtime path in autonomous loops.

---

## Open Questions (unscored)

- Is gstack's `gstack/` dir simultaneously a skill AND an umbrella, or are those two separate roles? Spec assumes umbrella-without-skill is allowed; gstack has no umbrella-without-skill.
- Does Claude Code rate-limit / throttle the SKILL.md auto-scan? If so, having 14 kzk-* dirs adds startup latency (small, but non-zero, and combines with gstack's 50+ + omc's many).
- What does superpowers do when its UserPromptSubmit hook interception trips kzk-* trigger keywords? OMC has the `keyword-detector.mjs`, superpowers has SessionStart only — possibly safer.

---

## VERDICT

**Bucket: 🟡 REVISE**

Top 3 must-fix before freeze:
1. **§6.1 umbrella dir** — add stub `SKILL.md` to `~/.claude/skills/kzk-harness/` OR rename to `.kzk-harness-shared/` (dotfile). Validates against gstack's actual layout.
2. **§8.1 precedence (Q2)** — add a precedence-probe step to plan + AC8 to spec acceptance criteria. G6 hinges on this and it is currently unverified.
3. **§10 row 1** — change chain from `kzk-large-task-delegation §Read-heavy audit` to `kzk-codebase-survey → kzk-large-task-delegation §Read-heavy audit`. Survey must precede; this is the literal §26 use case.

Top 3 nice-to-have:
1. **AC5** — add concrete observability test using `claude --output-format json` + `jq` Read-tool count.
2. **R3 / Q4** — install-global.sh detects OMC `keyword-detector.mjs` and warns about `ralph` keyword interception.
3. **§8.2 symlink-mode** — invert: symlink ONLY `harness-share.md`, file-copy SKILL.md files, manual `--update` after each commit.

**Frozen-readiness**: spec is fundamentally sound — gstack-base decision is well-supported by direct evidence, harness-share.md single-source decision is correct, marker-based CLAUDE.md injection is consistent with OMC's proven pattern. Three structural issues (umbrella dir SKILL.md gap, unverified precedence assumption, missing survey-first ordering in self-trigger matrix) must be resolved before plan drafting. None are show-stoppers; each is a 1-2 line spec edit. After those edits, the spec is ready to drive `kzk-spec-and-review` plan generation. Estimated revision effort: 30 minutes.
