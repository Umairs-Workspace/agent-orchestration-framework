@executable @cli @work @validate
Feature: Both false-positive shapes are derived from the tree on every run, and no exemption names a module

  The naive filter returned 3 of 148 `src/*.mjs` — one genuine (`src/sync.mjs:8 createSyncPlan`, no
  dependents, confirmed twice) and two false. `src/work-audit-probe.mjs` is a PROGRAM: it declares no
  export and ends in `await main()`, and it is spawned rather than imported. `src/scaffold.mjs` is
  reached by an `await import("../scaffold.mjs")` at `src/commands/assets-add.mjs:33`, which a graph
  of static edges never sees.

  The obvious remedy is a list of two names. It is refused. A control that STORES a fact about the
  tree sends its next bill to a stranger — six carriers in three families already, TECH_DEBT item 81
  — and here the bill is exact: the ledger is right on the day it is written, the third false
  positive arrives without one, and the entry for a module that has since gained a caller suppresses
  a real finding forever. Both shapes are DERIVED from the corpus in front of the lane, every run.

  A file with no export is not a seam. It cannot strand an export it does not have, and the shape is
  decidable from the file itself with nothing remembered about it.

  A file named by a resolvable relative `await import()` literal is referenced. Two measurements fix
  how that sweep must work. It runs over `src/**` and not one directory level, because the two live
  instances sit at `src/commands/assets-add.mjs:33` and `src/commands/assets-clean.mjs:22`, and a
  top-level-only sweep reports `scaffold.mjs` and `clean.mjs` — two real modules — falsely.

  Resolution is RELATIVE, never by basename. `src/notion/sync-work.mjs:26` imports `"./sync.mjs"`,
  which is `src/notion/sync.mjs`. A basename match would suppress `src/sync.mjs` — the only genuine
  finding in the repository — and leave the rule vacuous while looking cleaner than the correct one.
  That is the failure mode worth driving hardest: a rule that reports nothing because it suppressed
  everything is indistinguishable, from the outside, from a healthy tree.

  What a derivation buys and a ledger cannot is that both suppressions hold over a corpus this lane
  has never seen, with no aof checkout behind it and no module whose name it could have stored.

  ADR-006 §2. FF-7704. TECH_DEBT 81.

  Scenario Outline: a module declaring no export is never a candidate
    Given a source module on disk under src/ that <shape>
    And a code graph in which it has no dependents
    When the seam lane is run
    Then the module <verdict>
    And no exemption entry anywhere in the result names it

    Examples: a program is not a seam, and zero exports is the whole predicate
      | shape                                              | verdict                             |
      | declares no export and ends in `await main()`      | is not a candidate and is not named |
      | declares no export and ends in a top-level call    | is not a candidate and is not named |
      | declares no export and holds only comments         | is not a candidate and is not named |
      | exports one function and ends in `await main()`    | is named as an unwired seam at warn |
      | exports one function and is spawned by another module | is named as an unwired seam at warn |

  Scenario Outline: a resolvable dynamic-import literal is a reference, swept at every depth under src/
    Given a source module on disk under src/ that exports a function and has no dependent
    And an `await import()` naming it by <literal>, written in <holder>
    When the seam lane is run
    Then the module <verdict>

    Examples: the sweep is src/**, because a one-level sweep reports two real modules falsely
      | literal               | holder                              | verdict                             |
      | "./scaffold.mjs"      | a module at the top of src/         | is not named                        |
      | "../scaffold.mjs"     | a module one directory under src/   | is not named                        |
      | "../../scaffold.mjs"  | a module two directories under src/ | is not named                        |
      | "../src/scaffold.mjs" | a file under test/                  | is named as an unwired seam at warn |

  Scenario Outline: a literal is resolved against the file that holds it, never matched by basename
    Given src/sync.mjs and src/notion/sync.mjs on disk, each exporting a function and neither with a dependent
    And an `await import(<literal>)` written in <holder>
    When the seam lane is run
    Then <suppressed> is not named
    And <still named> is named as an unwired seam at warn

    Examples: the basename trap, measured on this repository at src/notion/sync-work.mjs:26
      | literal        | holder                   | suppressed          | still named         |
      | "./sync.mjs"   | src/notion/sync-work.mjs | src/notion/sync.mjs | src/sync.mjs        |
      | "../sync.mjs"  | src/notion/sync-work.mjs | src/sync.mjs        | src/notion/sync.mjs |
      | "./sync.mjs"   | src/dsl.mjs              | src/sync.mjs        | src/notion/sync.mjs |

  Scenario Outline: an import that resolves to nothing on disk suppresses nothing
    Given a source module on disk under src/ that exports a function and has no dependent
    And <import> written in another module under src/
    When the seam lane is run
    Then the module is named as an unwired seam at warn

    Examples: only a resolvable relative literal is a reference
      | import                                                          |
      | an `await import()` naming a relative path that is on no disk file |
      | an `await import()` naming a bare package specifier              |
      | an `await import()` naming the module by its basename alone      |
      | an `await import()` naming a path resolving outside src/         |

  Scenario Outline: an import the lane cannot read as a literal is a stated blindness, not a suppression
    Given a source module on disk under src/ that exports a function and has no dependent
    And <import> written in another module under src/
    When the seam lane is run
    Then the module is named as an unwired seam at warn
    And the result carries a limit saying an import it cannot read as a literal is invisible to it

    Examples: the shapes a text read cannot resolve
      | import                                                     |
      | an `await import()` whose argument is a variable            |
      | an `await import()` whose argument is a template holding an interpolation |
      | an `await import()` whose argument is an element of an array |

  Scenario: both suppressions hold over a corpus this lane has never seen
    Given a corpus of source modules built for this run alone, holding no name from any other project
    And a code graph over that corpus in which no module has a dependent
    And in it one module with no export that ends in `await main()`
    And one module reached only by a resolvable relative `await import()` from a subdirectory
    And one module that exports a function and is reached by nothing
    When the seam lane is run over that corpus
    Then exactly one audit-seam-unwired finding is reported, naming the third module
    And neither of the first two is named
    And no name from any other project appears anywhere in the result

  Scenario: the suppression is recomputed for each corpus and never remembered between them
    Given two corpora differing only in whether one module is named by a resolvable `await import()`
    And a code graph over each in which that module has no dependent
    When the seam lane is run against the first and then against the second in one process
    Then that module is not named in the first result
    And it is named as an unwired seam at warn in the second
    And the second answer is not the first repeated
