---
doc: retrospective
promotionFrom: 1
---
# 175 · aof on macOS — retrospective

The per-story lessons live in each story's own `RETROSPECTIVE.md`: 175/00/R1, 175/00/R2, 175/00/R3, 175/01/R1, 175/02/R1, 175/02/R2, 175/03/R1, 175/03/R2, 175/03/R3 and 175/04/R1. This document carries what running the milestone taught.

## R1 · An SSH acceptance scenario was imported from another machine's history

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

**What happened:** Two scenarios required a restart typed in an `ssh localhost` session (02/04 "from SSH, run brings the app up…" and 04/01 E6). This laptop is standalone, and nobody reaches it over SSH. At verify the operator asked where the requirement came from, and descoped it: "Forget ssh… As long as it works as the control node here that is enough."

**Why:** The guard came from the Mac mini, whose SSH-spawned daemons had no login keychain and burned runs (the deploy rules' Mac worker section). Refine carried it into a laptop with a different setup, and the end review did not ask whether it applied.

**Lesson:** When an acceptance scenario guards against a failure seen on another node, name that node in the scenario and confirm at the end review that it applies to this one.

**Refs:** VERIFICATION `### Not run on this laptop, and why`; ADR-003 §2; RESEARCH P4.

## R2 · A probe named like the product outlived its session

**Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** researcher · **Raised by:** product-owner · **Promoted to:** none

**What happened:** The refine session's `MAXCOMLEN` probe ran a copy of `/bin/sleep` named `aof-mesh-desktop` (pid 87074). It got stuck in state `UE` and cannot be signalled until a reboot. At verify it matched every `pgrep -x aof-mesh-desktop`, and `aof mesh desktop stop` signalled it beside the real app and then reported a failure naming only it.

**Why:** The probe was named exactly like the product so that it measured the real name, and nothing reaped it or checked it was gone before the session ended.

**Lesson:** A probe process named like the product is started with a bounded lifetime, and the same session checks that it is gone before it ends.

**Refs:** VERIFICATION `## Findings` F-02, F-06.

## R3 · launchd's cwd `/` was fixed one consumer at a time

**Kind:** mistake · **Area:** architecture · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** Under launchd the daemon's cwd is `/`. F-11 (TECH_DEBT 4 A) stopped the sync pass treating `/` as a workspace. The next day F-14 found the launcher's presence aggregation still reading `/` through the work cache every 15 s, and the work-tree watch still armed on `/wiki/work`.

**Why:** "Is this folder a workspace" was asked inline in the publisher's decision. The tick set that feeds the sync pass, presence and the watches added the launch folder before any consumer asked it.

**Lesson:** When fixing a "not a workspace" condition, list every consumer of the launch workspace (sync, presence, watches) and route them all through one predicate. That predicate is now `hasOwnWorkspaceConfig` in `workspace-identity.mjs`.

**Refs:** VERIFICATION `## Findings` F-11, F-14; TECH_DEBT 4; commits `be93f5dd`, `c81c3b89`.

## R4 · Two verify slips: a backup collision and a forbidden suite

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner · **Promoted to:** none

**What happened:** Two scratch backups both named `ui-serve.mjs` (the mesh module and its core binding) overwrote each other, and the restore wrote the binding's contents over `packages/mesh/src/ui-serve.mjs`. It was restored from an earlier verified copy and its diff re-checked before the commit. Later, a test selection made by grep included `test/store/global-work-propagation.test.mjs`, the suite the deploy rules forbid on this machine because it binds `:4182`. It passed, and the live daemon was unaffected.

**Why:** Backups were named by basename, and the grep's file list was run without being checked against the rules' exclusions.

**Lesson:** Name scratch backups by their full repo path. Check a grep-selected test list against the deploy rules' exclusions before running it.

**Refs:** `.claude/rules/build-deploy-restart.md` § Tests; VERIFICATION `## Findings` F-14 (the suites run).
