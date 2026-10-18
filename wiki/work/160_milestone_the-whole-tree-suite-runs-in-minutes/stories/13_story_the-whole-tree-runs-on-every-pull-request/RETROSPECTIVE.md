---
doc: retrospective
promotionFrom: 1
---
# 160/13 · The whole tree runs on every pull request — retrospective

## R1 · The budget was measured on the wrong machine for three rounds

**Kind:** misunderstanding · **Area:** process (estimate) · **Stage:** verify · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

**What happened:** 160's objective put the 10-minute budget on the Windows control node, a machine that also
carries the operator's other work. Its wall time moved by about the budget itself between runs of the same code
(15.3 and 23.6 min at 8 workers on two days), so two rounds of speed work could not show whether they worked. The
operator moved the budget to the pull request suite; on the runner the same tree takes 1.8 minutes.

**Why:** The objective named the machine the gate happened to run on, not the place where the runtime is paid:
every PR waits on it.

**Lesson:** A time budget belongs to an environment that is the same on every run. Name that environment in the
objective, and measure there first.

**Refs:** ../../SPEC.md (re-aimed 2026-10-17); ../../VERIFICATION.md (the worker sweep; round 3).

## R2 · A suite that had only ever run on Windows

**Kind:** near-miss (finding) · **Area:** process (test) · **Stage:** verify · **Owner:** developer · **Raised by:** verifier (CI) · **Promoted to:** none

**What happened:** The first Linux run was red on 23 cases, none a defect in the product: Windows-relative homes,
drive-letter assumptions, a fixture without an execute bit, Windows-only installer rows, a shallow clone, missing
system libraries, and a test's `stop()` that waited for `close` with no bound (F-08).

**Why:** Every run of the tree had been on the control node.

**Lesson:** Run the suite on a second platform before relying on it as a gate; a fixed path in a test is built from
the platform's root, never from a drive letter.

**Refs:** ../../VERIFICATION.md F-08.

## R3 · A verify fix was checked by the tail of a log

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier · **Promoted to:** none

**What happened:** To clear 162's FF-16004 red I made `drive-status.mjs` load lazily. A local sweep of the
affected suites showed the failures, but I read its last lines and saw only an unrelated flake; CI then caught the
broken synchronous ticker (F-10).

**Why:** The sweep's output was long, and I read the tail rather than grepping its `not ok` lines.

**Lesson:** Judge a run by every `not ok` line and the `# executed` totals, never by its tail.

**Refs:** ../../VERIFICATION.md F-10.
