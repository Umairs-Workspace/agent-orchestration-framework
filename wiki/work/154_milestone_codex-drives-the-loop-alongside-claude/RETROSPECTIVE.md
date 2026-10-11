---
doc: retrospective
created: 2026-10-08
updated: 2026-10-08
---
# 154 · Retrospective

## R1 · Start live proof at the first integration seam

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** main-session native verification

**What happened:** Native verification exposed failures after the scripted protocol and broad automated suite had passed; the run environment, notification admission and materialized worker view each needed a correction.

**Why:** Scripted transport and isolated component fixtures did not execute the complete chain of real assistant tool calls against the primary run and worker record.

**Lesson:** Complete one small native phase and its real closing commands as soon as the transport is connected, then add a real worker handoff before widening implementation. Retain protocol fixtures for precise failure tests, with live proof as a separate required layer.

**Refs:** m154/02/R1; m154/06/R1; m154/07/R1; VERIFICATION.md D-04, D-06 and D-08.

## R2 · Freeze after native corrections, then pay for the full gate

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** main-session verification

**What happened:** Full regression attempts were superseded by later native fixes. The ea99c42d attempt also progressed slowly while multiple native workloads competed for the same host; it was cancelled and retained as incomplete.

**Why:** The expensive whole-tree gate began before the live acceptance surface had stabilized, and parallel execution increased host contention rather than reliably reducing elapsed time.

**Lesson:** Complete focused native and ownership checks before freezing a candidate for the whole-tree gate. Choose a bounded worker count using observed host load. Never relabel a cancelled run or an older green snapshot as proof for changed production bytes.

**Refs:** VERIFICATION.md; REGRESSION.md; verification/2026-10-08-reverify/regression-3dec8d1e.json; local cancellation records for a2846fce and ea99c42d.

## R3 · Preflight the real host execution policy

**Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** developer · **Raised by:** main-session native verification

**What happened:** Read-only native defaults, inaccessible Store PowerShell and denied Windows child output pipes caused different failures that initially appeared as one generic permission prerequisite.

**Why:** A successful model connection did not establish that the configured host could execute the required write and test commands.

**Lesson:** Before a long workflow, probe the actual selected shell, permitted fixture writes and bounded child capture under the same native policy. Apply only explicit process-local fixture configuration; preserve native approval refusals and report unsupported capabilities separately.

**Refs:** m154/D-01; m154/D-05; verification/2026-10-08-reverify/native-shell-preflight.json; verification/2026-10-08-reverify/native-file-capture.json.
