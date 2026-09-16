@executable @cli @work @validate
Feature: The registry spreads one index per directory, registrationDecision stays the single decider, and the assembled array holds the same 9,139 entries it held before the move

  `scripts/test.mjs` is 5,142 lines assembling 1,023 imports through 1,025 spreads (`wc -l`;
  `grep -c "^import"`; `grep -cE "^\s*\.\.\.[A-Za-z]"`). The 1,025 is not a typo for 1,021: four
  suite files export TWO runner-shaped arrays each — `test/loop-bounds.test.mjs`,
  `test/slots-before-work.test.mjs`, `test/loop-record-projection.test.mjs` and
  `test/loop-record-command.test.mjs` (`runnerBindings` from `src/work-audit/census.mjs` over the
  runner's source). An index that re-exports one binding per file silently halves four suites, and
  `runnerShapedExports` (`scripts/test.mjs`) already carries that hazard in writing on the selection
  path. It is the first row of the matrix below for that reason.

  THE LOAD-BEARING NUMBER, measured 2026-09-06. `node src/work-audit-probe.mjs scripts/test.mjs`
  reports **9,139 assembled entries, 9,139 of them distinct**, in 5.4s. Importing the runner and then
  re-reading the 1,021 walked suites outside the two-entry shrink-only baseline yields **9,139
  distinct names, with 0 assembled names that no file on disk exports and 0 exported names the array
  is missing.** The array is therefore a function of the tree's suites and of the names inside them,
  not of the registry's shape — which is exactly what makes a per-directory index invisible to
  `59/FF-5903` and `72/FF-7203` (ADR-010 §2), and why FF-11906 extends the second rather than minting
  a sibling.

  SET EQUALITY ALONE CANNOT SEE A DELETION. If a suite vanishes with its entries, both sides shrink
  together and the equality still holds. That hole is why the claim below has two halves: the
  equality at HEAD, and the name set captured with the same probe command before the first file
  moves, compared against the set at the tip. Neither half is sufficient; the pair is.

  AND THE COMPARISON MUST IMPORT THE RUNNER FIRST. Measured: reading the suites first and the runner
  second dies at `scripts/test.mjs:3736` with `ReferenceError: Cannot access
  'testCommandContractTests' before initialization`, because `test/test-command-contract.test.mjs:51`
  imports the runner (TECH_DEBT item 26's TDZ ring) and a suite-then-runner order evaluates the
  registry mid-cycle. `59/FF-5903`'s control is green for this reason and no other: it runs inside
  the runner's own process.

  Nine suites read the runner's SOURCE TEXT, and two of them pin literal comment lines in it:
  `test/arch/acd-loop-finding-envelope.test.mjs:513-515` requires two exact marker comments and their
  line order, both of which a per-directory index deletes. Loud, and repaired in this diff — and that
  file is one of `53/FF-5311`'s two digest-frozen suites, so the repair carries a residue re-stamp
  (task 00).

  What would quietly undo this: an index deriving its own membership by `readdir`, a second answer to
  a question `registrationDecision` already answers, agreeing until the day somebody changes the
  assembly and only one of the two notices; an index re-exporting one binding per file, which halves
  the four two-array suites without failing anything; and `scripts/test-unit.mjs` importing an index —
  its 98 hand-listed specifiers all name moved files and must be re-pointed, but the moment it
  spreads an index the second registration home TECH_DEBT item 71 names becomes a second INDEX, and
  its 919-case lane stops being a hand-listed subset of what CI runs.

  ADR-010 §1, §2, §3, §4. ADR-008. ADR-003 §1, §4. FF-11906 extends `72/FF-7203`; `59/FF-5903` and
  `72/FF-7203` survive untouched in claim.

  Scenario: the assembled array holds the same names after the restructure as before
    Given the assembled name set captured with `node src/work-audit-probe.mjs scripts/test.mjs` at this story's base commit, before the first file moved
    When the same command is run at the story's tip
    Then the two sets are compared member by member
    And no name was added and no name was removed
    And both sets carry the same entry count, 9,139 at the base commit
    And each set is non-vacuous at more than 9,000 names, so an empty answer fails rather than matching

  Scenario: and the equality is not an artefact of both sides moving together
    Given the runner is imported first and its assembled array read
    And every `*.test.mjs` under `test/`, walked recursively, is then re-read for the names it exports
    Then the assembled set and that union are equal in both directions
    And no name is assembled twice
    And the walk found more than 1,000 files and read more than 1,000 of them outside the two-entry shrink-only baseline, so neither side can be empty
    And every relocated suite's content delta touches import specifiers only, so no name-bearing line changed

  Scenario Outline: what the registry and its indexes may and may not do
    Given <shape>
    When the suite registry is assembled and its controls run
    Then it is <verdict>

    Examples: the honest shape, and every way of arriving at a second answer
      | shape                                                              | verdict                                                        |
      | an index imports and spreads each suite in its own directory       | admitted                                                       |
      | an index derives its members with `readdir`                        | refused: a second decider beside registrationDecision          |
      | an index re-exports one binding for a file that exports two        | refused: half of four suites would stop being assembled        |
      | an index is imported by the registry and not spread                | refused: 59/FF-5903's own defect, one level up                 |
      | the registry names a `*.test.mjs` specifier directly               | refused: the registry names directories, not suites            |
      | a directory holds a suite and carries no index                     | refused: those suites reach no runner                          |
      | a directory carries two indexes                                    | refused: two homes for one directory's membership              |
      | one directory's suite is spread by another directory's index       | refused: the same entries assembled twice, or under two owners |
      | `scripts/test-unit.mjs` imports or spreads an index                | refused: item 71's second home becomes a second index          |
      | `scripts/test-unit.mjs`'s 98 specifiers re-pointed at moved files  | admitted: an import specifier pointing at a moved file         |

  Scenario: the set of indexes the registry reaches equals the set of directories holding a suite
    Given the registry's import specifiers
    When the directories under `test/` that hold at least one `*.test.mjs` are listed
    Then every one of them is reached by the registry, directly or through exactly one aggregating index
    And every index the registry reaches owns at least one suite, transitively
    And neither set is empty
    And the registry no longer grows a line per suite: a new suite is registered in its own directory's index, and `scripts/test.mjs` is unchanged by its arrival

  Scenario: registrationDecision is still the only answer to which file contributed which entries
    Given `src/work-audit/census.mjs`'s decider
    When the modules and indexes in this story's write set are read
    Then none of them re-derives registration by a pattern over an import line, a matcher over a spread row, a second baseline of unregistered suites, or a second read of the assembled array
    And the extended control still reports a planted re-derivation by the file that holds it and by what it duplicates
    And the extension's own red probe gives one index a `readdir`-derived membership and is reported
    And the control's ORIGINAL claim is re-proved red on the defect it was written for, over a module that produces `assembled` or `suiteNames` instead of accepting them

  Scenario: scripts/test-unit.mjs is re-pointed and becomes nothing else
    Given the file's 98 suite imports, 46 of them under `test/arch/`
    When the move has landed
    Then all 98 specifiers name their suites at the new paths and the script still runs
    And it still exports nothing and is still named by no pipeline
    And it imports no index and spreads none
    And the 919 cases it runs remain a subset of what `scripts/test.mjs` assembles, so TECH_DEBT item 71 is neither paid nor worsened
