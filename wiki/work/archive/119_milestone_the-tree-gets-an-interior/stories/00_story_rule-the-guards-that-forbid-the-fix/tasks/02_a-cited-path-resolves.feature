@executable @cli @work @validate
Feature: A path cited in a delivered document resolves at HEAD or through a rename the repository itself recorded

  `src/work-doctor.mjs:522` resolves every control path cited in every item's `## Fitness functions`
  register with a bare `stat(path.join(projectRoot, control))`. Measured at HEAD on 2026-09-06 by
  running `fitnessDeclarations` and `citedControlPathsIn` from `src/work-doctor-controls.mjs` over
  every `wiki/work/*/ARCHITECTURE.md` and `stat`-ing each result against the repo root: **163
  distinct control paths, 188 register rows, 21 documents, 6 unresolvable** — and all six are this
  milestone's own `pending` declarations. Those registers belong to done items where a delivered
  record is immutable, so a story that moves `test/arch/**` leaves permanent findings no legal edit
  can clear.

  **The wider universe no gate has ever covered, measured with an anchored extractor over
  `wiki/work/**` (2,161 files): 344 distinct `src/**.mjs` tokens carrying 8,085 citations, of which
  67 distinct tokens / 385 citations do not resolve at HEAD.** The anchor is load-bearing and is a
  criterion here, not a detail: `grep -rhoE 'src/[A-Za-z0-9_./-]+\.mjs' wiki/work/` — no left anchor —
  reports 366 / 9,507 with **89** unresolvable, and the 22-token difference is `ui/src/**` paths
  clipped of their `ui/` prefix. An extractor that manufactures 22 phantom casualties prices the
  ceiling wrong on the day it is pinned.

  **The map is derived from history, so it cannot go stale — and on the day it lands it resolves
  almost nothing, which is the honest shape of this control.**
  `git log --diff-filter=R -M --name-status --format= | grep -c '^R'` returns **20** rename records in
  the whole reachable history, two of them under `src/` (`src/commands/errors.mjs` →
  `src/command-error.mjs` is real, committed and immutable, and is the positive case this control can
  drive without a fixture). None of the 67 is among them: they are prospective module names planning
  prose invented and paths a delete rather than a rename removed. So the ceiling is seeded, not zero,
  and the map's own non-vacuity has to be asserted — a resolver that answers "no renames, ever" would
  pass every leg of this control silently, which is the defect one contract over.

  **The doctor's spine may not spawn, and this decides where the git read lives.**
  `test/arch/acd-controls-never-execute.test.mjs:457` asserts `src/work-doctor.mjs` names none of
  `child_process`, `execFileSync`, `spawnSync`, `execSync`, and `:455` pins leg A's source text as
  `controlProbes[control] = (await stat(`. The git read therefore happens at the impure command edge
  and is handed into the snapshot exactly as `projectRoot` already is (`:465`), and leg A's `stat`
  stays the first branch with the rename map consulted only on its miss. The resolver's name matters
  too: `:678` compares the spine's `./work-doctor-*.mjs` imports against a closed roster, so naming
  the module `src/work-doctor-cited-path.mjs` reds a delivered control while `src/cited-path-resolve.mjs`
  does not.

  What would quietly undo this: a hand-kept redirect table, which is the stored fact this milestone
  exists to remove, at the scale of 8,085 citations; a rename map that answers empty and is never
  asked whether it is; an extractor without the left anchor; a ceiling that rises "just once"; and
  widening `control-unresolved` to mean *somebody moved a file*, which blinds the gate for every
  future item to buy this one milestone's move.

  ADR-001 §3, ADR-003 (the map is derived), ADR-004. FF-11903.

  Scenario Outline: one resolver answers every citation, at HEAD or through recorded history
    Given the cited path <cited>
    When the resolver is asked to resolve it against this repository
    Then the answer is <answer>

    Examples: two ways to resolve, and four ways not to
      | cited                                                  | answer                                   |
      | a `src/` path that exists at HEAD                      | resolved, at its own path                |
      | `src/commands/errors.mjs`, renamed once in history      | resolved, at `src/command-error.mjs`     |
      | a path renamed twice in history                        | resolved, at its final path              |
      | a path renamed to somewhere that no longer exists       | unresolved                               |
      | a path deleted with no rename record                    | unresolved                               |
      | a `src/` path that never existed                       | unresolved                               |
      | a cited path carrying a `:line` locator                 | resolved on the file, the locator dropped |
      | `ui/src/fleet/scope.mjs`                               | resolved, and never read as `src/fleet/scope.mjs` |

  Scenario: one home, two readers, and no second resolution rule
    Given the doctor's control probe and FF-11903's citation sweep
    When both resolve a cited path
    Then both call the same exported resolver
    And no second rename-resolution rule exists anywhere in `src/` or `test/`
    And no file in the repository stores a redirect table of moved paths

  Scenario: the spine still executes nothing, and the git read is handed to it
    Given `src/work-doctor.mjs` after the probe is re-pointed at the resolver
    When its source is read
    Then it names none of `child_process`, `execFileSync`, `spawnSync` or `execSync`
    And leg A still assigns `controlProbes[control]` from an `await stat(` of the joined path
    And the rename map reaches the snapshot as data supplied by the command edge
    And `src/commands/doctor.mjs` is the module that reads the repository's history

  Scenario: the map is derived and is asserted to be non-empty
    Given the rename map built from this repository's history
    When the control runs
    Then the map is read from git's own rename records and from no file in the tree
    And the control asserts the map is non-empty before asserting anything through it
    And the control names one known rename it resolved, so an empty map cannot read as a pass

  Scenario Outline: `control-unresolved` keeps its exact meaning and stops meaning "somebody moved a file"
    Given a fitness register whose enforced-by cell cites <citation>
    When `aof work doctor` runs over the item
    Then it reports <finding>

    Examples: the finding is about a control that does not exist, never about a move
      | citation                                                  | finding             |
      | a control file that exists at HEAD                        | no finding          |
      | a control file the repository's history records as renamed | no finding          |
      | a control file that never existed                          | `control-unresolved` |
      | a control file deleted with no rename record               | `control-unresolved` |
      | no path at all                                            | `control-unresolved` |

  Scenario: the citation sweep is bounded by a shrink-only ceiling pinned to a measured count
    Given the sweep over every `src/**.mjs` citation under `wiki/work/**`
    When it runs at the commit it lands on
    Then it reports each unresolvable citation by path
    And it fails when the count of unresolvable citations exceeds the declared ceiling
    And the ceiling's own comment carries the command that produced its value
    And raising the ceiling fails the control's shrink-only leg

  Scenario: the sweep cannot pass by reading nothing
    Given the sweep over `wiki/work/**`
    When it runs
    Then it asserts it scanned more than one document
    And it asserts it extracted more than one `src/` citation
    And a walk that yields no citations fails rather than reporting zero unresolvable

  Scenario: the red probe is a citation to a path that never existed
    Given a planted `src/` citation in a document under `wiki/work/`
    And no file at that path and no rename record naming it
    When the sweep runs
    Then it fails naming the planted path and the document citing it
    And removing the planted citation returns the sweep to green

  Scenario: an uncommitted move is not yet a recorded rename
    Given a file moved in the working tree with the move not yet committed
    When the resolver is asked for its old path
    Then the answer is unresolved
    And the control's message says the rename is not in the repository's history
