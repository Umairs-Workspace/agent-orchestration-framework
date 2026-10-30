---
doc: retrospective
promotionFrom: 1
---
# 03 · The preflight checks the Mac — retrospective

## R1 · A kernel allow-list red the story lane never ran

**Kind:** mistake (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Recurs:** 161/01/R1 · **Promoted to:** none

**What happened:** 03 added `import os from "node:os"` to `desktop-preflight.mjs`, and `yarn-installation/extracted kernels cannot import core…` went red. The row for that module still named only `node:fs/promises`, `node:child_process` and `node:path`. The story's lane never ran that gate, so verify found it.

**Why:** The allow-list pins each module's imports in a suite no story lane selects by dependency.

**Lesson:** When a story adds an import to a package module, run `test/bundle/yarn-installation.test.mjs` in its lane.

**Refs:** VERIFICATION `## Findings` F-01; m172/F-172-03; 161/01/R1.

## R2 · The daemon probe modelled launchd's environment as PATH and HOME

**Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** product-owner · **Promoted to:** control:FF-12607

**What happened:** With `claude` signed in, both the preflight's `daemon-claude-authenticated` and the runbook's probe read it as logged out. `claude` finds its macOS sign-in in the login keychain under `$USER`, and launchd does set `USER` and `LOGNAME` for the job. So the real daemons were authenticated, and the probes reported a false FAIL.

**Why:** ADR-004 §4 specified the probe's environment from what aof passes, not from what launchd gives the process.

**Lesson:** Model a daemon's environment from the real process (`ps eww`), not from the variables you set.

**Refs:** VERIFICATION `## Findings` F-09; ADR-004 §4 (amended); FF-12607's 175 leg.

## R3 · A shared inert seam silently replaced a row's own fake

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The first cut put an inert `runner` into the autostart suite's `inertPreflightCtx`. Every win32 row spreads that helper after its registry runner, so the fake registry was replaced. One row went red, and the rest would have passed vacuously.

**Why:** A spread placed last overrides every key it carries, including the one a row set on purpose.

**Lesson:** Name inert seams explicitly per row, and keep shared helpers free of seams a row may set.

**Refs:** milestone STATE `## Feedback (for retro)` (175/03, inert seam).
