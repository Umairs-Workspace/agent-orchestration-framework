<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 49/02, THE DIRECTORY RATCHET: `acd-ui-directory-budget`, the
# tree-level counter that six per-file ceilings cannot be. It lands with the diff that
# creates `ui/src/home/`, because a ratchet authored after the growth it was meant to
# question is a ratchet that ratifies it (ARCHITECTURE bad cut 4).
#
# THE MEASUREMENT THAT BUYS IT, and it is the whole argument. `ui/src` went 54 -> 71 ->
# 91 -> 99 files across four milestones (+83%) and 10,887 -> 20,228 lines (+86%), with
# EVERY per-file gate green throughout: m46 +17 files, m47 +8, m48 +0, m49 ~+9 and an
# 8th top-level directory. The tree grows by ADDING FILES, which is the one shape a
# per-file ceiling is structurally blind to — and worse, it is the shape the per-file
# ceiling REWARDS, because the sanctioned remedy for a large file is a new sibling with
# a prop boundary. TECH_DEBT item 33 says so in terms: "the correct per-file move and the
# tree-level degradation are the same move ... Fix (b) has stopped being a suggestion".
# This is items 28/33's own fix (b), and m49 is the Nth instance.
#
# THE MODEL, READ AT SOURCE — test/arch/acd-ui-surface-file-budget.test.mjs:
#  - a NAMED table with a per-entry ceiling AND a non-vacuity floor, each entry carrying
#    a `why` that names the next extraction (:55-154);
#  - the ceiling assertion, whose refusal names the reason and states that raising the
#    number needs an ADR and not a diff, and that it may NOT be met by deleting
#    rationale (:176-183, ADR-014/E3);
#  - a self-check that every budgeted subject still EXISTS, because "a budget entry
#    naming a file that is no longer on disk makes the ratchet guard a number that is not
#    true" (:186-207);
#  - the declare-your-intent line `BUDGET_REQUIRED_ABOVE = 800` (:167) and the sweep that
#    makes the TABLE ITSELF ratcheted (:209-234) — added because every prior entry was
#    added by a reviewer happening to notice, and that process demonstrably missed one;
#  - the file predicate `/\.(tsx?|mts|mjs)$/` (:222);
#  - and the non-vacuity clause that the walk really walked, `scanned > 50` (:239-247),
#    which exists because a rename of `ui/src` would otherwise empty the loop and leave a
#    guard that guards nothing.
#
# THE TREE AS MEASURED AT THIS REFINE (2026-08-13, working tree, by that same predicate):
# SEVEN top-level directories under `ui/src` — `app` 13, `board` 21, `components` 7,
# `config` 4, `fleet` 20, `lib` 1, `terminal` 30 = 96 — plus the ROOT modules `main.tsx`
# and `vite-env.d.ts` = 98. ARCHITECTURE §Codebase health quotes 99, which is an
# ALL-FILES count including `index.css`. THE TWO NUMBERS DIFFER BY ONE and that is not
# pedantry: a ratchet whose total disagrees with the health table nobody can reconcile is
# a ratchet a reviewer stops trusting. The predicate is therefore DECLARED and SHARED,
# and it has its own scenario.
#
# NOT ASSERTED HERE, each with an owner:
#  - that `ui/src/home/` imports nothing from `ui/src/fleet/` or `ui/src/board/` —
#    `acd-terminal-control-boundary`'s new EMPTY `home →` baseline (its
#    `FLEET_TO_BOARD_BASELINE` shape is at
#    test/arch/acd-terminal-control-boundary.test.mjs:116-122, shrink-only and `.d.mts`
#    swept, because "the invisible kind counts").
#  - per-FILE line ceilings, including the budget entry `ui/src/home/`'s component earns
#    at delivery — `acd-ui-surface-file-budget`, unchanged by this task.
#  - that the suite is registered at all — `acd-test-suite-registration`, m43/ADR-014 E7.
#    An unregistered suite is no gate; registration in scripts/test.mjs is a delivery
#    obligation of this task and is asserted by that existing gate, not restated here.
#
# THE TRAPS:
#  1. A PLANT THAT TOUCHES THE REAL TREE. No scenario may `mkdir ui/src/<plant>` or write
#     a file into `ui/src`: it races every other suite reading the same tree, and a
#     crashed run leaves the plant behind so every subsequent run is red for the wrong
#     reason. Plants are synthesized LISTINGS handed to the detector.
#  2. A PLANT FED TO A COPY. m46's mutation review found exactly that in
#     `affordanceFormViolations`, so the shipped detector was never once driven to a
#     violation. The detector's violations function is exported and every plant below
#     goes to it.
#  3. A ONE-DIRECTIONAL TABLE. A table naming six of seven directories passes silently on
#     the seventh — the same vacuity `BUDGET_REQUIRED_ABOVE` was added to close for files.
#  4. THE ROOT ESCAPE HATCH. A gate that counts only directories is satisfied by putting
#     the next nine files in `ui/src` itself. `src/` already has this ratchet and it is
#     the one that is holding (109 root modules, flat across four milestones).
#  5. A CEILING SET ABOVE THE DELIVERED TREE "for headroom". That is the ratifying move
#     bad cut 4 names, and it is what makes the 9th directory a diff instead of a
#     conversation.
#
# ISOLATION. The detector reads the repo tree and synthesized listings; it touches no
# store, no server and no port (:4181/:4182 are held by the live daemons). A fresh
# `AOF_GLOBAL_HOME=$(mktemp -d)` on every run, per the guard hook. Focused runs only,
# never the full suite.

@executable @ui @work @validate
Feature: the ui/src directory budget — a named list of top-level directories and a per-directory file-count ceiling, so a tree that grows by adding files is finally visible to a gate
  In order that the fourth consecutive milestone to grow `ui/src` by adding files is the LAST one that can do it with every gate green
  a shipped detector names the eight top-level directories and each one's file ceiling, refuses a ninth directory and a directory over its count, reports the headroom before it is spent, and can be driven to a violation rather than merely observed staying quiet

  Background:
    Given the SHIPPED `acd-ui-directory-budget` violations function, exported from its own suite and imported directly
    And it accepts a TREE LISTING as an argument, so a plant is a synthesized listing and never a real directory on disk
    And "a violation" means an element of its returned array, and "the report" means its returned non-failing summary
    And the real `ui/src` tree as it stands after `ui/src/home/` lands

  # THE HEADLINE, and it is the one thing a ratchet has to be able to do. m46's review
  # found a detector whose only plant went to a re-implemented copy; this scenario exists
  # so that cannot be true of this one.
  Scenario: a ninth top-level directory FIRES the shipped detector
    Given a synthesized listing identical to the real tree plus a 9th top-level directory `ui/src/panels/` holding two files
    When I assert the plant LANDED — the synthesized listing differs from the clean one — and then run the shipped detector over it
    Then it returns at least one violation
    And the violation names `ui/src/panels/`
    And its message says that a new top-level directory is a DECISION and needs a table entry, not a diff
    And running the same detector over the clean listing in the same test returns no violations
    # "A 9th is a decision, not a diff" is ARCHITECTURE's own phrasing of what this gate
    # buys. The empty-directory row in the boundary table below is the sharper half: a
    # directory with NO files in it must still fire, because the cost this gate meters is
    # the directory, not its contents.

  Scenario Outline: the per-directory ceiling fires on a count, and stays quiet under it
    Given a synthesized listing in which `<directory>` holds <files> files against a ceiling of <ceiling>
    When I run the shipped detector over it
    Then it returns <violations> violation(s)
    And when it does fire, the message names the directory, the measured count and the ceiling

    Examples:
      | case                             | directory            | files | ceiling | violations |
      | comfortably under                | ui/src/terminal/     | 25    | 32      | 0          |
      | one under the ceiling            | ui/src/terminal/     | 31    | 32      | 0          |
      | exactly at the ceiling           | ui/src/terminal/     | 32    | 32      | 0          |
      | one over the ceiling             | ui/src/terminal/     | 33    | 32      | 1          |
      | far over the ceiling             | ui/src/terminal/     | 60    | 32      | 1          |
      | the new directory, at its own    | ui/src/home/         | 8     | 8       | 0          |
      | the new directory, one over      | ui/src/home/         | 9     | 8       | 1          |
      | an empty new directory           | ui/src/panels/       | 0     | (none)  | 1          |
      | a directory that has emptied out | ui/src/lib/          | 0     | 2       | 1          |
    # THE LAST ROW IS A SELF-CHECK, NOT A COUNT: a named directory that no longer has any
    # files in it is the directory-level twin of `acd-ui-surface-file-budget`'s "a budget
    # entry naming a file that is no longer on disk" clause (:186-207) — the table would
    # otherwise go on guarding a number about a directory nobody uses, and read green.
    # THE CEILINGS IN THIS TABLE ARE ILLUSTRATIVE. The real numbers are set at DELIVERY,
    # just above the delivered count, by the milestone that delivers the tree — the same
    # asymmetry every entry in `acd-ui-surface-file-budget`'s table records and for the
    # same reason. What this task pins is the SHAPE and the fact that the gate can fire.

  # BOTH DIRECTIONS, because a one-directional table is the vacuity this whole family of
  # gates keeps re-learning.
  Scenario: the table and the tree must agree in both directions
    Given the shipped detector and the real `ui/src` tree
    When I run it
    Then every directory named in the table exists in the tree
    And every top-level directory in the tree is named in the table
    And the table is non-empty, and every entry's ceiling is a positive integer
    And a synthesized listing that REMOVES a named directory fires, and a synthesized listing that ADDS an unnamed one fires — the two plants are distinct and both are driven
    # The second plant is the one the per-file gate needed `BUDGET_REQUIRED_ABOVE` to
    # close, added at m46/05 for exactly this reason: every entry before it had been
    # added by a reviewer happening to notice, and that process missed `shell-layout.mjs`
    # while it grew 845 -> 1,006 lines in a single story.

  # THE SWEEP MUST REALLY SWEEP. The failure mode this family of gates has actually had.
  Scenario Outline: a sweep that cannot see the tree FAILS, and never passes quietly
    Given <the situation>
    When I run the shipped detector
    Then it fails, naming what it could not read
    And it does NOT return an empty violations array

    Examples:
      | case                                | the situation                                                  |
      | the root was renamed                | the detector is pointed at a `ui/src` that does not exist       |
      | the root is empty                   | the listing carries no directories and no files at all          |
      | the listing is not an array         | the detector is handed `null`                                   |
      | every directory vanished            | the listing carries only root files                             |
    # Modelled directly on `acd-ui-surface-file-budget`'s own non-vacuity clause
    # (:236-247): "a rename of `ui/src` would otherwise empty the loop and leave a guard
    # that guards nothing — the exact shape m46 keeps finding." An empty answer from a
    # sweep is indistinguishable from a clean tree unless the sweep says how much it saw.

  Scenario: the detector reports what it measured, so a green run is evidence rather than silence
    Given the shipped detector and the real `ui/src` tree
    When I run it
    Then the report names every top-level directory with its measured file count and its ceiling
    And the report carries a total file count for `ui/src`
    And that total equals the sum of the per-directory counts plus the root file count — the gate's own arithmetic closes
    And the counts it reports for `app`, `board`, `components`, `config`, `fleet`, `lib` and `terminal` are the counts a plain listing of those directories gives

  # THE PREDICATE. The scenario that reconciles 98 with 99.
  Scenario Outline: what counts as a file is DECLARED, and it is the same predicate the per-file ratchet uses
    Given a synthesized directory holding exactly one file named <the file>
    When I run the shipped detector and read the count it reports for that directory
    Then the count is <counted>

    Examples:
      | case                        | the file           | counted |
      | a logic module              | axis.mjs           | 1       |
      | its type sibling            | axis.d.mts         | 1       |
      | a component                 | Grid.tsx           | 1       |
      | a plain TypeScript module   | api.ts             | 1       |
      | a stylesheet                | grid.css           | 0       |
      | a fixture payload           | fixture.json       | 0       |
      | a note                      | README.md          | 0       |
      | a mock                      | s1-home.png        | 0       |
      | a snapshot directory        | __snapshots__/     | 0       |
    # THE ROWS THAT COUNT ARE EXACTLY `/\.(tsx?|mts|mjs)$/` — the predicate
    # `acd-ui-surface-file-budget` already sweeps with (:222) — reused rather than
    # re-typed, so the two gates can never disagree about what a file is. That predicate
    # is also what makes the numbers in this header reproducible: 96 in directories + 2
    # root modules = 98, where ARCHITECTURE §Codebase health quotes 99 by counting
    # `index.css` too. Whichever the table declares, it must declare it: a gate whose
    # total silently differs from the health table's by one is a gate a reviewer stops
    # reconciling and then stops reading.
    # `.d.mts` counting is load-bearing and not obvious: this milestone adds roughly four
    # of them, and a predicate that missed them would under-count the tree by half of
    # what m49 actually adds.

  # THE ROOT ESCAPE HATCH. A QA-ADDED CLAUSE, flagged as such.
  Scenario: the root of `ui/src` is budgeted too, so "put it in the root" is not the way past the gate
    Given a synthesized listing identical to the real tree plus a third root module `ui/src/bootstrap.mjs`
    When I assert the plant LANDED and run the shipped detector over it
    Then it returns at least one violation naming the root
    And the clean listing — `main.tsx` and `vite-env.d.ts` — returns none
    # A QA-ADDED CLAUSE, ROUTED TO THE ARCHITECT rather than assumed. ARCHITECTURE's
    # §Fitness functions entry specifies "a NAMED, explicit list of `ui/src/*` top-level
    # directories ... plus a per-directory FILE-COUNT ceiling" and says nothing about the
    # root. Driven, that leaves the cheapest possible route past the gate wide open: nine
    # new files in `ui/src` itself breach nothing. The `src/` half of the codebase already
    # meters exactly this — ARCHITECTURE's own health table records "`src/` root-level
    # `.mjs` 109 — flat — item 10's ratchet is holding", which is the strongest available
    # evidence that a root counter works. One extra table row is the whole cost. If the
    # architect refuses it, this scenario is deleted with a reason, not left unwritten.

  # THE HEADROOM REPORT — item 33's fix (c), which the same story takes because it is a
  # handful of lines in the same suite.
  Scenario Outline: a directory close to its ceiling is REPORTED without failing
    Given a synthesized listing in which `ui/src/fleet/` holds <files> files against a ceiling of <ceiling>
    When I run the shipped detector
    Then the violations array is <violations>
    And the report <reports it> as being within 5% of its budget

    Examples:
      | case                          | files | ceiling | violations | reports it   |
      | plenty of room                | 15    | 22      | empty      | does not     |
      | just outside the warning band | 20    | 22      | empty      | does not     |
      | inside the warning band       | 21    | 22      | empty      | does         |
      | exactly at the ceiling        | 22    | 22      | empty      | does         |
      | over the ceiling              | 23    | 22      | non-empty  | (it FAILED)  |
    # Reporting headroom rather than only breach is what turns this from an alarm into a
    # ratchet: the milestone that is ABOUT to spend the last of a budget finds out at its
    # own review rather than the next one's. It never fails on its own — a warning that
    # can fail CI is a ceiling with a second, softer number, which is two ceilings.

  # THE RATCHET MUST NOT RATIFY. The bad-cut-4 pin, expressed as a value a reviewer reads.
  Scenario: the delivered numbers are the delivered tree, not a headroom allowance
    Given the shipped table as this story delivers it
    When I read each entry's ceiling against the measured count of its directory
    Then every entry declares its own allowance, and no ceiling exceeds its directory's delivered count by more than the allowance that entry declares
    And `ui/src/home/`'s own entry is present in the SAME diff that creates the directory
    And every entry carries a `why` that names what the NEXT growth in that directory should do instead of adding a sibling
    And the sum of every ceiling in the table is not greater than the delivered file count plus the sum of the declared allowances
    # ARCHITECTURE admits m49 "cannot pay for itself in file count and this ADR does not
    # pretend it can" — m46/ADR-001 promised a net-negative subtree and shipped 2.2x the
    # files, and the sharp part there was the PREDICTION, not the number. A ceiling set
    # generously here would hand the next milestone the same free growth that produced
    # 54 -> 99, with a gate's blessing on it.
