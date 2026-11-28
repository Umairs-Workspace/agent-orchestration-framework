---
type: milestone
number:
slug: delete-the-rename-ledger
title: "Paths in finished work are history — the rename ledger and its resolver are deleted, and only live work and live controls are held to today's tree"
status: not-started
owner: product-owner
created: 2026-11-28
updated: 2026-11-28
schema: 1
aofVersion: 0.1.0
---
# Paths in finished work are history

## Objective

`.aof/rename-ledger.tsv` goes, and nothing replaces it. Today it holds about 2,600 hand-carried
records (2,243 renames, 313 forwards), and it grows on every refactor. It exists because two rules
collide. A delivered record may never be edited (119/ADR-004). And gates hold every path that
record cites to today's tree, forever. So every moved or deleted file breaks some finished item,
and the only legal repair is another ledger line. 210/04 just paid this tax: deleting two modules
turned 190/01's `reads:` red, and two `F` lines were added to make it pass.

The fix is to stop treating a path in finished work as a live link. A done story's `reads:` says
what it read when it was built. That is history, exactly like a commit message. A path is checked
against today's tree only where staleness means something is actually broken:
- the `reads:` and `files:` of a story that is still live;
- a fitness-function control that is meant to keep enforcing.

When a control moves, the register row is updated or retired, as 210/04 did for 72/FF-7202 and
190/FF-19003. A redirect never hides a stale register.

An outsider can verify it:
- the ledger file is gone;
- `aof work validate` and `aof work doctor` pass on the whole stream;
- deleting a module that some done story's `reads:` names leaves both green;
- deleting a test file that a live register row names turns the doctor red, naming the row.

## Scope

In scope:

- **Delete the ledger and the resolver behind it:** `.aof/rename-ledger.tsv`,
  `packages/work/src/citation-history.mjs`, and the rename/forward half of
  `packages/work/src/cited-path-resolve.mjs`. Delete their controls and fixtures with them:
  - `test/audit/cited-path-resolve.test.mjs`
  - `test/arch/command/acd-wiki-citation-resolver.test.mjs`
  - `test/arch/command/acd-cited-path-resolves.test.mjs` and its high-water ratchet
  - `packages/work/test/citation-history.test.mjs`
  - the support helpers in `test/support/`
- **`validate` checks `reads:` only on live stories.** In `packages/work/src/commands/validate.mjs`,
  a story whose status is `done` has its `reads:` read as history and not resolved. A live story
  is still refused for a missing path.
- **The doctor's control probe resolves at HEAD only.** In `packages/work/src/doctor/index.mjs`, a
  register row whose control no longer exists is a real finding (`control-unresolved`). The way out
  is the retirement convention 210 introduced: the row stays, is marked retired, and names its
  successor control. That convention is written down as an ADR here, so that it is an ADR rather
  than a precedent.
- **The other readers of the resolver are decided one by one:**
  - the workspace-wiki citation probe, `packages/work/src/wiki-citations.mjs` (161/ADR-001): wiki
    pages are editable, so a stale citation is fixed in the page;
  - `aof tune`'s provenance, `packages/work/src/tune/provenance.mjs`;
  - FF-11903's sweep over source citations in `wiki/work/**`.

  Each is either checked at HEAD for live documents or dropped. None keeps a redirect.
- **The ADRs:**
  - 119/ADR-004 is superseded: a delivered record stays unedited, but its paths are no longer held
    to today's tree;
  - 127/VERIFICATION F-A's ledger is retired;
  - 136/VERIFICATION F-136-01's forward records are retired;
  - the delivered controls that pin all of this are retired or amended in the same stories, with
    their registers' rows retired as above, never left dangling.
- **What delivered controls currently miss once the ledger is gone.** Before deleting anything,
  run `aof work doctor` against a tree with no ledger. What it reports is this milestone's real
  work list.

Out of scope:

- Editing any delivered record's `reads:` or prose. Leaving finished records alone is the point.
- Rewriting history, or recovering the renames the public-root cut lost. They stop mattering.
- How workspace-wiki pages are written. Only whether their citations are checked changes.

## Stories

To be broken down by `aof:refine`.

## Dependencies

- 210 (Bounded test runs). It must be accepted first. Its two `F` records for
  `packages/work/src/testing/declared.mjs` and
  `packages/core/src/application/bindings/work/test-select.mjs` are the last lines added to the
  ledger, and they go with it.
