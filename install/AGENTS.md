# install/ — kzk-harness Install Layer

This directory contains the install, uninstall, and verification layer for kzk-harness. Its scripts manage the global `~/.claude/skills/` install, the CLAUDE.md routing block, and external dependency detection.

Related specs:
- `docs/plans/2026-05-04-kzk-global-install-design.md` — frozen design
- `docs/plans/2026-05-04-kzk-global-install.md` — implementation plan (Tasks A–G)

---

## Subdirectory map

```
install/
  install-global.sh        # Global install entrypoint (Task A) [TODO]
  uninstall-global.sh      # Global uninstall entrypoint (Task B) [TODO]
  verify-install.sh        # AC1–AC8 verification harness (Task E) [TODO]
  dependencies.sh          # External CLI dependency installer (existing)
  dependencies.md          # Per-skill fallback documentation (existing)
  UMBRELLA-README.md       # User guide copied to ~/.claude/skills/.kzk-harness-shared/ (Task A) [TODO]
  lib/
    claude-md-marker.sh    # Idempotent BEGIN/END marker helpers, sourced (Task A) [TODO]
    precedence-probe.sh    # AC8 project-vs-global precedence probe (Task E) [TODO]
  hooks/
    keyword-detector.mjs   # N3 opt-in UserPromptSubmit scaffold, default OFF (Task A) [TODO]
  test/
    test_install_global.bats    # 5 tests for install-global.sh (Task A) [TODO]
    test_uninstall_global.bats  # 3 tests for uninstall-global.sh (Task B) [TODO]
    test_verify_install.bats    # 5 tests for verify-install.sh (Task E) [TODO]
    test_dependencies.bats      # Existing + 1 new test for --skip-project (Task D)
```

`lib/` contains scripts that are **sourced**, not executed directly. `hooks/` contains the opt-in keyword-detector scaffold (stays inert unless `--enable-hooks` is passed — non-goal N3 per spec §3). `test/` holds the bats or pure-bash test harness (detected at runtime via `command -v bats`).

---

## Script entry points and exit codes

### `install-global.sh` [TODO — Task A]

Entry point for the global install. Idempotent; safe to re-run.

```
bash install/install-global.sh [flags]
```

Flags: `--update`, `--probe`, `--uninstall`, `--symlink-mode`, `--enable-hooks`, `--yes`, `--ac8-attested-by-user "<DATE> probe-attested"`, `-h`/`--help`.

| Exit code | Meaning |
|-----------|---------|
| 0 | All 9 install steps succeeded and verify-step confirmed 14 skills + marker |
| 1 | Step 8 verification fail (skill count wrong, marker missing, etc.) |
| 2 | Preflight or marker corruption (CLAUDE.md not writable, malformed BEGIN/END) |
| 3 | User declined the marker-replacement prompt (non-`--yes` interactive run) |

### `uninstall-global.sh` [TODO — Task B]

Reverses `install-global.sh`. Idempotent. Delegates to `lib/claude-md-marker.sh`.

```
bash install/uninstall-global.sh [--yes] [--purge-project-artifacts <path>]
```

| Exit code | Meaning |
|-----------|---------|
| 0 | Marker block stripped, skill dirs removed |
| 2 | Marker corruption (BEGIN present, END missing — manual restore required) |

### `verify-install.sh` [TODO — Task E]

Runs AC1–AC8 checks. Requires a completed install. Some ACs need `claude` CLI in PATH; those print a MANUAL instruction when unavailable.

```
bash install/verify-install.sh              # all 8 ACs
bash install/verify-install.sh --ac 8       # single AC
bash install/verify-install.sh --ac 2,3,6  # subset
```

| Exit code | Meaning |
|-----------|---------|
| 0 | All requested ACs passed |
| 1 | One or more ACs failed |
| 2 | Harness setup error |

### `lib/precedence-probe.sh` [TODO — Task E]

Standalone AC8 probe: installs a stub SKILL.md globally and per-project, triggers it, and reports which wins. Run **before** merging Task A (see plan §5 dispatch order).

```
bash install/lib/precedence-probe.sh [project-root]
```

| Exit code | Meaning |
|-----------|---------|
| 0 | Project wins — G6 holds, install-global.sh is safe to ship |
| 1 | Global wins — spec §8.1 must change before install ships |
| 2 | INCONCLUSIVE — `claude` CLI unavailable or response did not cite either body |

### `dependencies.sh` (existing)

External CLI dependency installer. Idempotent. Never hard-fails.

```
bash install/dependencies.sh [--skip-project] [project-root]
```

`--skip-project` skips the `code-review-graph build` step (no single project root in a global install). Added in Task D.

| Exit code | Meaning |
|-----------|---------|
| 0 | All deps installed or gracefully degraded (see summary output) |
| non-zero | Hard failure (rare — script uses `set -u`, not `set -e`) |

---

## Test invocation

```bash
bats install/test/               # if bats-core is installed
bash install/test/run_all.sh     # pure-bash fallback (no bats required)
```

`command -v bats` is tested at runtime; whichever shape is available is used. CI and `kzk-pre-commit-gate` Gate 3 run whichever is present.

---

## Gate 0 baseline (future-readiness)

This `AGENTS.md` is the Gate 0 baseline for `install/`. Per `kzk-pre-commit-gate`, Gate 0 is **conditional on an AGENTS.md hierarchy being present**. This file makes that hierarchy present for `install/` going forward.

Current status: all scripts listed under `[TODO]` above have not yet shipped (Tasks A–E are pending). Gate 0 is **SKIP** for Task G itself (bootstrapping — this IS the first `install/AGENTS.md`; no hierarchy was in force before this commit).

Once Tasks A–E land, any new script added to `install/` or its subdirectories must be reflected in this file in the same commit (Gate 0 rule: new file → AGENTS.md row in same commit).
