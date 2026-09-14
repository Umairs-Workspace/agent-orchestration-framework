---
type: story
number: 05
slug: the-account-and-the-register
title: "The account and the register — the seven controls land and go red on contact, the never-discards sweep reaches the lane verbs, and the autonomous prompt names the key"
parent: 129
depends: [4]
status: done
owner: product-owner
created: 2026-09-12
updated: 2026-09-14
adrs: [ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008]
reads:
  - wiki/work/129_milestone_loop-concurrency/SPEC.md
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-001
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-002
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-003
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-004
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-005
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-007
  - wiki/work/129_milestone_loop-concurrency/VERIFICATION.md
  - src/loop-bounds.mjs
  - src/work/loop.mjs
  - src/loop/child-drive.mjs
  - src/loop/wave.mjs
  - src/loop/cycle.mjs
  - src/commands/loop.mjs
  - src/work/dispatch.mjs
  - src/mesh/worktree.mjs
  - src/bundle/commands/autonomous.md
  - src/work/bundle-manifest.mjs
  - test/arch/loop/index.mjs
  - test/arch/loop/acd-loop-cap-single-home.test.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/grade/acd-gate-propagation-never-discards.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/arch/work/acd-number-null-safe.test.mjs
  - test/support/loop/lane-fixture.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/support/source-slice.mjs
  - test/support/module-family.mjs
  - test/support/read-src-files.mjs
  - test/arch/audit/acd-audit-never-imports-project-code.test.mjs
  - test/arch/work/acd-number-null-safe.test.mjs
  - test/arch/loop/acd-loop-finding-envelope.test.mjs
  - test/arch/loop/acd-loop-suite-registration.test.mjs
files:
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - test/arch/loop/acd-loop-family-boundary.test.mjs
  - test/arch/loop/acd-lane-records-and-the-declaration.test.mjs
  - test/arch/loop/acd-lane-grade-is-lane-scoped.test.mjs
  - test/arch/loop/index.mjs
  - test/arch/grade/acd-gate-propagation-never-discards.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - src/bundle/commands/autonomous.md
  - .claude/commands/aof/autonomous.md
  - .codex/skills/aof-autonomous/SKILL.md
  - .opencode/commands/aof/autonomous.md
  - src/bundle/manifest.json
  - .aof/aof.lock.json
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/support/source-slice.mjs
schema: 1
aofVersion: 0.1.0
---
# 05 · The account and the register

## User story

As **the reviewer who must be able to falsify every structural claim this milestone makes**,
I want **the seven declared controls to land as four arch-tests under `test/arch/loop/` (registered
by one import and one spread each) plus one extension of the never-discards sweep, each observed
RED under the probe its register row names before it is called green, and the autonomous prompt
to name `work.loop.concurrency` beside its home so FF-7101 binds it**,
so that **a mode with two homes, a PTY driver in the loop family, a recomputed wave, a lane run
minted in the primary, a second declaration, a primary-tree lane grade, or a rebase in the lane's
merge is a red build and not a review finding**.

What lands: FF-12901 (`acd-loop-concurrency-single-home`), FF-12902 + FF-12906
(`acd-loop-family-boundary`), FF-12903 + FF-12907 (`acd-lane-records-and-the-declaration`),
FF-12905 (`acd-lane-grade-is-lane-scoped`), FF-12904 as an extension of
`acd-gate-propagation-never-discards` (`BRANCH_PATH_MODULES` gains `src/work/dispatch.mjs`,
`src/loop/wave.mjs`, `src/loop/cycle.mjs`; the `dirtyPolicy` literal set pinned); the `test/arch/loop`
row raised by exactly four from its value at HEAD when the story lands (54 at `2321dce8`, 55 once story 125's uncommitted control is in); `autonomous.md` naming the key with its three renders, `manifest.json` and
`.aof/aof.lock.json` regenerated; every red probe recorded in `VERIFICATION.md`'s register.

## Tasks

- [x] `tasks/00_the-four-controls-land.feature` — the four files exist at their declared paths, are registered in `test/arch/loop/index.mjs`, export `archTests`, and are non-vacuous (each finds its subject); the row rises by exactly four
- [x] `tasks/01_each-control-goes-red-on-contact.feature` — the register's named probe for FF-12901 … FF-12907 makes exactly the named legs red with the recorded message, and the subject restores byte-identical
- [x] `tasks/02_never-discards-reaches-the-lane.feature` — the extended sweep covers the three new modules, the armed `--abort` leg fires for `dispatch.mjs`, the sanctioned forms stay sanctioned
- [x] `tasks/03_the-prompt-names-the-key.feature` — `autonomous.md` names `work.loop.concurrency` and its two values beside the home; the three renders, the manifest and the lock agree; FF-7101 stays green

## Notes

- Feasibility + QA (2026-09-13): `test/loop/autonomous-shell-out-prompt.test.mjs` deep-equals the
  prompt's `work.*` key set to three — naming the key grows that ONE assertion by
  `work.loop.concurrency`; the file joins the write set. Reuse, never a 124th stripper: the
  string-aware `stripComments` / `functionBody` / `matchedParenSpan` of `test/support/source-slice.mjs`,
  `importSpecifiers` of `test/support/module-family.mjs`, the import-closure walker of
  `acd-audit-never-imports-project-code`, `readSrcFiles`; the enclosing-function rule FF-12906 reuses
  is lifted from `acd-number-null-safe`'s `classifyNumberSites` into a generic `classifySites(source,
  { siteRe, guardRe })` in `source-slice.mjs` (127/01's private copy is folded onto it once 127 lands —
  its file is untracked in this tree and is not touched here). FF-12902's legs are over DIRECT imports
  (`src/commands/loop.mjs`'s static closure already reaches the driver through the registry) and the
  `node:child_process` exclusivity leg is over `src/loop/**` alone. Module scope of every new control
  is import-safe: FF-5311 imports every `test/arch` file to read its entry keys. The manifest and lock
  are whole-derived files 127/02 is also regenerating — 127 commits first (STATE.md).

- The only story that edits `test/arch/loop/index.mjs`; ordered after 04 so no lane collides on the
  budget table.
- Red probes are recorded in `VERIFICATION.md` at verify by the single writer; this story hands the
  observed messages to that record and edits no register row of ARCHITECTURE.md.
