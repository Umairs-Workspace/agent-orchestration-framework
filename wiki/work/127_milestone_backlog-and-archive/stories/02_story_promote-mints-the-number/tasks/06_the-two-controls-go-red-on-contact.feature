@manual @cli @work @work-stream
Feature: FF-12703 and FF-12704 land, go red for the probes their register rows name, and insert-shared shrinks

  Every declared control owes a RED PROBE in the milestone's `VERIFICATION.md` fitness register
  once it lands (the refine skill's own rule; 127/01 task 05 is the precedent). The two this story
  lands are FF-12703 (`test/arch/work/acd-one-mint.test.mjs`) and FF-12704
  (`test/arch/work/acd-intake-write-side-only.test.mjs`), each exporting `archTests` and
  registered by one import + one spread in `test/arch/work/index.mjs` (119/ADR-010). Landing them
  clears the `pending — 127/02` markers from `ARCHITECTURE.md`'s register — by landing the file,
  never by re-marking.

  FF-12703 AS THIS CONTRACT SHARPENS IT (tasks 00 and 03, the amendments ratified in this beat):
  (a) `appendPosition` is defined in `src/work-promote/promotion.mjs` only, and its src callers are
  exactly `promote.mjs`, `promote-finding-to-chore.mjs`, `promote-gap-to-chore.mjs` and
  `migrate-folder.mjs` (127/01 made the last one a caller; the register's "promote family" is read
  as that set); (b) the TOP-LEVEL slot-open (`transitionStreamReindexed` with `space: "top-level"`)
  is called from `src/commands/promote.mjs` and nowhere else under `src/commands/`, and
  `runInsertTopLevel` is defined there; (c) none of the four verb faces
  `src/commands/insert-{milestone,chore,uat,story}.mjs` contains `parseInt`, `Math.max` or a
  `number:` write; (d) `src/work/reindex.mjs`'s src importers, read from import specifiers over
  comment-stripped source (three comment-only mentions exist), are exactly
  `{ src/commands/insert-shared.mjs, src/effects/stream-transitions.mjs }` or a strict subset;
  (e) no `src/bundle/commands/add-*.md` computes a number (`max` … `+ 1`). Non-vacuous: (a) finds
  four callers, (b) finds the one call, (d) finds two importers, (e) reads five prompts.

  FF-12704 AS THIS CONTRACT SPELLS IT (task 04): the word `intake` (a word match, comment-stripped)
  appears in `src/**` only in `src/work/init.mjs`, `src/commands/init-update.mjs`,
  `src/commands/promote.mjs` and `src/bundle/commands/*.md`; the named readers contain it zero
  times; `init.mjs` and `promote.mjs` contain it at least once each.

  The probe is applied to a scratch copy or reverted immediately — the working tree is shared with
  concurrent lanes, so a probe is never left in place across a hand-back. Each run is a focused
  suite (`node scripts/test.mjs --only test/arch/work/index.mjs` under
  `AOF_GLOBAL_HOME=$(mktemp -d)`); never the full suite on this machine.

  Scenario: FF-12703 fails for a second mint, a second slot-open caller, and a prompt that computes
    Given the landed control passing at HEAD
    When `const next = Math.max(...items.map((i) => Number.parseInt(i.number, 10))) + 1;` is added to `src/commands/insert-milestone.mjs`
    Then the control fails naming `insert-milestone.mjs` as an insert verb that computes a number
    When that is reverted and `import { countShiftedByInsert } from "../work/reindex.mjs";` is added to `src/commands/promote.mjs`
    Then the control fails naming `promote.mjs` as a third importer of the engine
    When that is reverted and a call `transitionStreamReindexed(ctx.workspace, { at, space: "top-level" })` is pasted into `src/commands/insert-chore.mjs`
    Then the control fails naming `insert-chore.mjs` as a second top-level slot-open caller
    When that is reverted and the line `1. Next top-level number NN = max NN across work.dir + 1, zero-padded.` is pasted back into `src/bundle/commands/add-chore.md`
    Then the control fails naming `add-chore.md` as a prompt that computes a number
    And all four messages are recorded against FF-12703 in `VERIFICATION.md`, and the tree is clean afterwards

  Scenario: FF-12704 fails for a reader that branches on intake
    Given the landed control passing at HEAD
    When `if (config?.work?.intake === "stream") return items;` is added before the backlog walk in `listItems` (`src/work.mjs`)
    Then the control fails naming `src/work.mjs` as a reader carrying the token
    When that is reverted and every `intake` in `src/commands/promote.mjs` is renamed to `mode`
    Then the control fails its non-vacuity leg naming `promote.mjs` as a writer that no longer carries the token
    And both messages are recorded against FF-12704 in `VERIFICATION.md`, and the tree is clean afterwards

  Scenario: insert-shared shrinks, and the number is recorded
    Given `src/commands/insert-shared.mjs` at 638 lines at this story's HEAD (`wc -l`, 2026-09-12)
    When the build is complete and the file is measured again
    Then it is shorter, and both numbers are recorded in `VERIFICATION.md` beside FF-12703's probe — a file that grew is a review finding, not a note

  Scenario: the register carries no pending marker for this story's controls
    Given `wiki/work/127_milestone_backlog-and-archive/ARCHITECTURE.md`
    When the `## Fitness functions` rows for FF-12703 and FF-12704 are read after the build
    Then each names its landed file with no `pending` token, and `aof work doctor 127/02` reports no `control-unresolved` finding for either
