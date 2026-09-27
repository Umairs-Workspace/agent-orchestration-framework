@executable @cli @work @work-stream
Feature: ITEM_RE has one home, and every other reader of the work root asks the enumerator

  Three homes today, measured `grep -rn "ITEM_RE = " src`: `src/work.mjs:69` (exported),
  `src/work/doctor.mjs:84` (an exported COPY, re-imported by `src/work/doctor-freshness.mjs:19`) and
  `src/commands/migrate-folder.mjs:61` (a private copy). All three are the same regex; the second and
  third exist so that a milestone-37 change to the vocabulary had to be made three times.

  The modules that pair a `readdir` of a work root with an item-name match, re-read for this contract
  rather than taken from ADR-001 §5's table — two of its rows are corrected here, in this authoring
  beat, per the ratification rule:

    src/work/doctor.mjs:541-556       KEEP, allow-listed — NOT "retire": doctor's ITEM enumeration is
                                      already `listItems` (`:372`). This readdir is the ORPHAN lane's
                                      raw listing (`orphanFolderGroup`, `:668-690`) — the one reader
                                      whose job is to see what the enumerator DROPS, so it cannot ask
                                      the enumerator. It learns the two roots (task 03).
    src/work/doctor-freshness.mjs:254 RETIRE its regex use — `roadmapFolderMismatch` matches `ITEM_RE`
                                      over `snapshot.topEntries` (no readdir of its own); `snapshot.items`
                                      (milestones, parent null) is the same answer already in hand.
                                      Freshness then imports no regex.
    src/commands/migrate-folder.mjs:308 RETIRE the WORK-ROOT scan — `nextFreeSlot` computes an append
                                      number over the root; that is `appendPosition`'s job (`src/work-
                                      promote/promotion.mjs:52`, ADR-003 §2). The private regex at `:61`
                                      goes. Its `:388`/`:436` readdirs of the SOURCE tree with
                                      `STORY_FOLDER_RE` (`/^(\d+)[-_]+…/`, `:71`) stay — a foreign
                                      tree, read-only (`acd-migrate-read-only-source`) — KEEP, allow-listed.
    src/work-tune/provenance.mjs:23   KEEP, allow-listed — the citation resolver is SYNCHRONOUS end to
                                      end (`resolveCitationAtEmit` → `emitProposals`, consumed sync at
                                      `src/commands/tune.mjs:352` and by its suites); `listItems` is
                                      async. It imports the shared `ITEM_RE` (`acd-proposal-provenance-
                                      resolves` pins that import textually), so it is a second readdir,
                                      never a second regex home. It learns the archive root so an
                                      archived milestone's declarations still resolve.
    src/work/observe.mjs:700,1167,1453 RETIRE — `buildSessionItemIndex`, `resolveMilestoneFolder` and
                                      `countUnattributedRuns` each `readdir` `<cwd>/wiki/work` (+ each
                                      milestone's `stories/`) with `/^(\d+)_/`: a real work-root scanner
                                      ADR-001's count of seven missed, and one that cannot see `archive/`.
                                      All three are async and take exactly `listItems`'s rows.
    src/commands/ratchet.mjs:104,171  KEEP, allow-listed — `walkFiles` walks an ITEM subtree for files
                                      and `itemRefOf` parses path SEGMENTS with `/^(\d+)_/`; the sweep
                                      cannot tell that from a listing, so the reason is recorded.
    src/integrations/routing.mjs:253  KEEP, allow-listed — matches a FOREIGN `NN-slug`/`NN_slug` form
                                      (`NUMBERED_FOLDER_RE`) the shared grammar does not admit.
    src/import/recovery.mjs:55        KEEP, allow-listed — scans a FOREIGN source tree with
                                      `AOF_MILESTONE_RE` + loose forms; not a work-root scanner.
    src/memory/local-indexing.mjs:520 NOT a pairing — walks the wiki for `AOF.md` FILES with no item-name
                                      match anywhere in its code (the shape is named in comments only),
                                      de-duplicating against `listItems`'s row dirs (`indexedAof`,
                                      `:677-700`). ADR-001 §5 lists it as a keeper; the sweep will not
                                      find it, so it is asserted ABSENT rather than allow-listed.
    src/mesh/worker-execution.mjs:288 NOT a scanner — `readdir`s `.aof/mesh/worktrees`, never a work root.

  `migrate-folder.mjs` calling `appendPosition` makes it a fourth caller of the mint. FF-12703 (story
  02) names the caller family; that family must list `src/commands/migrate-folder.mjs`, and the note
  is recorded in the milestone's STATE.md for story 02's refine.

  What would quietly undo this: a re-derived regex "scoped to milestones" in a new module (the
  recovery/routing precedent, admitted only for FOREIGN trees); a `readdir(workDir)` in a command
  that "just needs the folder names"; a fifth keeper added to the allow-list without a reason in the
  row; a keeper whose reason is stale because its foreign form was retired.

  ADR-001 §5. FF-12701.

  Scenario: the item regex and the leaf regex are each defined in exactly one src file
    Given a comment-stripped read of every file under `src/**`
    When each is searched for a `const` binding of `ITEM_RE` or `BACKLOG_ITEM_RE` to a regex literal
    Then `src/work.mjs` holds one definition of each
    And no other src file defines either — `src/work/doctor.mjs` imports `ITEM_RE` from `src/work.mjs`, and `src/commands/migrate-folder.mjs` no longer references it (its only use was `nextFreeSlot`)
    And every other src reference to either name is an import from `src/work.mjs`, or a re-export of that import

  Scenario: doctor's family reaches the regex through one import
    Given `src/work/doctor.mjs` and `src/work/doctor-freshness.mjs`
    When their imports are read
    Then `src/work/doctor.mjs` imports `ITEM_RE` from `../work.mjs` and defines none
    And `src/work/doctor-freshness.mjs` imports no `ITEM_RE` at all, because `roadmapFolderMismatch` now reads milestone numbers off `snapshot.items`
    And `test/work/record/work-doctor.test.mjs` and `test/work/doctor-freshness-structural.test.mjs` pass unchanged, so no finding moved

  Scenario: migrate-folder mints its append number through the one mint
    Given `src/commands/migrate-folder.mjs`
    When its append-number path is read
    Then `nextFreeSlot` is gone and the number comes from `appendPosition` in `src/work-promote/promotion.mjs`
    And the file holds no `readdir` of the work directory paired with an item match
    And over the three-root fixture the migrated milestone lands at `12`, after `11_chore_beta` and never on the archived `05` or `06`
    And `test/work/migrate-command-core.test.mjs` and `test/arch/work/acd-migrate-read-only-source.test.mjs` pass unchanged

  Scenario: provenance resolves a managed entry under the root and under the archive
    Given `src/work-tune/provenance.mjs`
    When `canonicalManagedEntry` is read
    Then it still imports `ITEM_RE` from `../work.mjs` and imports the archive root's name from the same file, spelling neither root name itself
    And `resolveCitationAtEmit("m05/ADR-001", { rootDir })` over the three-root fixture, with an `ADR-001` declared in `archive/05_milestone_zeta/ARCHITECTURE.md`, answers `ok: true`
    And `test/planning/tune-provenance.test.mjs` and `test/arch/planning/acd-proposal-provenance-resolves.test.mjs` pass unchanged

  Scenario: observe enumerates through the enumerator
    Given `src/work/observe.mjs`
    When `buildSessionItemIndex`, `resolveMilestoneFolder` and `countUnattributedRuns` are read
    Then each takes its items from `listItems(workDir)` and holds no `readdir` of the work root or of a milestone's `stories/`
    And the file holds no regex literal beginning `/^(\d+)_`
    And over the three-root fixture `resolveMilestoneFolder({ ref: "05" })` answers the archived folder `archive/05_milestone_zeta`
    And the observe suites pass unchanged

  Scenario: the sweep finds the enumerator's own pairing and no undeclared second one
    Given the arch-test `test/arch/work/acd-work-root-one-enumerator.test.mjs`, registered by one import and one spread in `test/arch/work/index.mjs`
    When it sweeps a comment-stripped read of every file under `src/**` for a `readdir`/`readdirSync` paired in the same file with an item-name match — the identifiers `ITEM_RE`/`BACKLOG_ITEM_RE`, a regex literal containing `_(milestone|story|task|uat|spike|chore)_` or `_milestone_`, or a numbered-folder regex literal beginning `/^(\d+)`
    Then it finds `src/work.mjs`'s pairing, so the sweep is non-vacuous
    And every other pairing it finds is one of exactly six allow-listed paths, each row carrying its reason: `src/work/doctor.mjs` (the orphan lane sees what the enumerator drops), `src/integrations/routing.mjs` (foreign `NN-slug` form), `src/import/recovery.mjs` (foreign source tree), `src/commands/migrate-folder.mjs` (foreign source tree, its stories/tasks scan), `src/work-tune/provenance.mjs` (synchronous resolver over the shared regex), `src/commands/ratchet.mjs` (walks an item subtree; parses path segments, never a listing)
    And `src/memory/local-indexing.mjs` is asserted to hold no item-name match at all, so it can never become a keeper silently
    And an allow-listed path whose pairing the sweep no longer finds is itself a failure, so a stale keeper cannot outlive its reason
    And the control passes at HEAD

  Scenario Outline: the sweep's verdict per file at HEAD
    Given the landed control and a comment-stripped read of `<file>`
    When the sweep looks in that file for a `readdir`/`readdirSync` paired with an item-name match
    Then it finds <pairing>
    And its verdict for the file is <verdict>

    Examples: the anchor, the six keepers, the two retired, and the two that never paired
      | file                            | pairing | verdict                                       | why                                                             |
      | src/work.mjs                    | yes     | the anchor — its absence fails the control    | non-vacuity                                                     |
      | src/work/doctor.mjs             | yes     | allow-listed                                  | the orphan lane sees what the enumerator drops                  |
      | src/integrations/routing.mjs    | yes     | allow-listed                                  | foreign `NN-slug` form                                          |
      | src/import/recovery.mjs         | yes     | allow-listed                                  | foreign source tree                                             |
      | src/commands/migrate-folder.mjs | yes     | allow-listed                                  | foreign source tree — its `STORY_FOLDER_RE` scans at `:388`/`:436` |
      | src/work-tune/provenance.mjs    | yes     | allow-listed                                  | synchronous resolver; shared regex; walks root + archive        |
      | src/commands/ratchet.mjs        | yes     | allow-listed                                  | walks an item subtree for files; parses path segments           |
      | src/memory/local-indexing.mjs   | no      | passes; a match appearing here fails          | the shape lives in its comments only, which the strip removes   |
      | src/work/observe.mjs            | no      | passes; a pairing appearing here fails        | retired onto `listItems`                                        |
      | src/work/doctor-freshness.mjs   | no      | passes; it imports no regex                   | retired onto `snapshot.items`                                   |
      | src/mesh/worker-execution.mjs   | no      | passes                                        | `readdir`s `.aof/mesh/worktrees`, never a work root             |

