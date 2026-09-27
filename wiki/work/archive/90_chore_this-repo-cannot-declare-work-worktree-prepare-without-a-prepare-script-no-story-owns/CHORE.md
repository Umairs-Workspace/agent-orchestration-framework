---
type: chore
number: 90
slug: this-repo-cannot-declare-work-worktree-prepare-without-a-prepare-script-no-story-owns
title: "This Repo Cannot Declare Work Worktree Prepare Without A Prepare Script No Story Owns"
status: done
owner: <role>
created: 2026-09-03
updated: 2026-09-04
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 90 · This Repo Cannot Declare Work Worktree Prepare Without A Prepare Script No Story Owns

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Milestone 72 shipped the worktree prepare step — every materialisation door runs the project's
declared `work.worktree.prepare` inside the fresh tree, so an agent no longer pays for a dependency
install out of its own tokens (72/ADR-007). **This repo cannot take its own medicine.** The seam hands
the operating system an argument vector and no shell reads it (72/ADR-001 §5), and on Windows every
package manager entry point is a `.cmd` batch shim — a shell script — which `src/work-toolchain.mjs`
refuses to compile as a declaration at all. Its own remedy names the fix: *"declare an executable and
the script it runs"*. No story owns that script, so the declaration has stayed absent and every
dispatch lane here still installs by hand.

## Definition of Done

- [x] Add scripts/prepare-worktree.mjs (a node script that runs the dependency install portably, since npm/yarn/pnpm are .cmd shims on Windows and a shim is undeclarable under ADR-001's no-shell rule), then declare work.worktree.prepare in .aof/aof.config.json as {command: node, args: [scripts/prepare-worktree.mjs], deadlineMs: 900000} and confirm a dispatch worktree is prepared through it.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "This repo cannot declare work.worktree.prepare without a prepare script no story owns" (`.aof/aof.config.json:23`)
- **Raised reviewing:** `72/00`, review round 1
- **Promotion key:** `finding:72/00:this repo cannot declare work.worktree.prepare without a prepare script no story owns`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

## How it was confirmed (2026-09-04)

- **The declaration compiles.** `resolveWorktreePrepare` over this repo's own
  `.aof/aof.config.json` answers `ok: true`, `command: "node"`,
  `program: "C:\Program Files\nodejs\node.EXE"` — a real executable, not a `.cmd` shim, so the
  compile-time refusal the finding named is discharged rather than worked around.
- **A dispatch worktree was prepared through it.** `aof work dispatch 90` materialised
  `.aof/mesh/dispatch-worktrees/dispatch-90` on `aof/mesh/90` and **exited 0**. That exit IS the
  confirmation: ADR-007 §4 makes a failed prepare throw *and* remove the tree, so a zero-exit
  dispatch that leaves a tree standing cannot have skipped or failed the step. Corroborated
  positively from inside the tree — `ws`, `node-pty`, `ajv` and `esbuild` all resolve, and
  node-pty's native binding loads. Cache-warm wall-clock ≈ 6 min.
- **TECH_DEBT item 36 is not reintroduced, checked at the source rather than assumed.** The
  workspace link the install creates resolves to
  `…/dispatch-worktrees/dispatch-90/ui` — *inside* the tree — so `git worktree remove` cannot
  follow it out. After `aof work dispatch --cleanup 90` (`outcome: removed`, `branchRemoved: true`)
  the primary checkout still holds its 124 tracked `ui/` files and its root `node_modules`.
- **Gate + craft pass.** `aof work validate 90` and `aof work validate` both PASS;
  `aof work doctor 90` healthy, 0 errors (its one `numbering-gap` warn is pre-existing and
  stream-wide). Focused suites green: `work-toolchain-declaration`, `mesh-worktree-prepare`,
  `mesh-worktree-materialize`, and both milestone-72 ratchets — FF-7201
  (`acd-declared-program-single-speller`, whose one-reader census covers `work.worktree.prepare`)
  and FF-7207 (`acd-worktree-never-linked`).

## Review findings (solo lanes, round 1 — no Blockers)

- **Important → promoted to chore `112`.** The declared step installs the FULL workspace set, `ui`
  included, on every dispatch. ADR-007's Consequences already prices one install per assignment;
  what is new here is this repo's choice of install SCOPE, and no lane has measured it.
- **Nit → recorded here.** The prepare FAILURE path (non-zero exit ⇒ tree removed, stdout/stderr
  riding the throw) was not driven by this chore. It needs nothing new: `test/mesh-worktree-prepare.test.mjs`
  already drives it against a stub seam under 72/04's contract, so this change adds no uncovered
  behaviour and owes no acceptance criteria.

## Accept decision (2026-09-04)

**Accepted.** Both chore close criteria (ADR-003) hold, checked at the source:

1. **Checklist ticked** — every box under `## Definition of Done` reads `- [x]`, none left `- [ ]`.
   Confirmed at the source rather than from the tick: `scripts/prepare-worktree.mjs` exists, and
   `.aof/aof.config.json` carries `work.worktree.prepare` = `{command: "node", args:
   ["scripts/prepare-worktree.mjs"], deadlineMs: 900000}`.
2. **Validate green** — `aof work validate 90` → `PASS — 90 is well-formed.`; the unscoped
   `aof work validate` → `PASS — work stream is well-formed.` (no regression).

`aof work doctor 90` reports 0 errors and no `control-unresolved` at either severity; its single
`numbering-gap` warn is pre-existing and stream-wide, not this chore's. No `.feature` was run and no
behavioural-verify step applies — a chore carries no acceptance scenarios by design. The round-1
Important finding (install scope covers the `ui` workspace) is routed to chore `112` and is not a
blocker here.
