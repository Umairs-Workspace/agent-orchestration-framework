@executable @cli @work @validate
Feature: A purity guard bans the dependencies a module may not have, never the number of files it may occupy

  A guard that reads "pure" as a ban on the token `import` forbids the only decomposition that would
  fix the module it guards. Measured, not projected: `wc -l src/phase-brief.mjs` is **1,651** (432 when
  70/ADR-002 was written) and `wc -l src/work-loops-checks.mjs` is **1,284** (380 when 52/ADR-007 was).
  The fourth cost is worse than size — the checks leaf may not import `src/work-audit/`'s sweep
  declarers, so it holds a byte-copy of them and a second control binds two of the three copies while
  the third diverges unwatched.

  **The class is eleven assertion sites in nine control files, measured rather than inherited.**
  `grep -rn 'doesNotMatch(.*import' test/arch/*.test.mjs` returns **31** sites in **20** files; keeping
  only those whose pattern carries no specifier (`from "…/command-core.mjs"`, `node:fs`) and is not
  scoped to a dynamic `import(` leaves **11 sites in 9 files**. Six are not the three the ADR names,
  and two of those guard `src/work-acceptor/rule.mjs` and `src/work-acceptor/ledger.mjs` — modules
  **already inside one family directory**, with the guard forbidding the edge between them.

  The widened predicate is not a weakened one: only the **unit** moves, from file to family, and every
  other leg is re-asserted per file over the whole family. It is widened through **one home**, because
  nine controls each spelling their own specifier extractor is the duplication this milestone exists
  to remove — the argument `stripComments` already won (TECH_DEBT item 24, ratcheted by
  `test/arch/acd-comment-stripper-order.test.mjs`).

  What would quietly undo this: a tenth guard written next year with the token ban, which is why the
  claim is asserted as a **class** over `test/arch/**` rather than over three named files; a family
  resolver that answers the empty set after a rename; a second hand-rolled classifier beside the one
  home; and widening the unit while quietly dropping one of the other legs, which reads as a green
  diff and is the one shape a reviewer cannot see.

  ADR-001 §1 (the one admitted control-side change), ADR-002. FF-11901.

  Scenario Outline: a purity guard's subject is a FAMILY, resolved from the tree rather than named as a file
    Given a purity guard whose subject is `src/<name>`
    And the tree state is <tree>
    When the guard resolves its family
    Then the family members are <members>

    Examples: the directory wins where it exists, and the resolution is reported in the message
      | tree                                                  | members                                          |
      | only `src/phase-brief.mjs` exists                     | that one file                                    |
      | `src/phase-brief/` exists with three `.mjs` files      | those three files                                |
      | `src/phase-brief/` exists with a nested subdirectory   | every `.mjs` under it, at any depth              |
      | both `src/<name>/` and `src/<name>.mjs` exist          | the directory's `.mjs` files, and not the file    |
      | `src/work-acceptor/` as it stands today                | its six `.mjs` files                             |
      | neither the file nor the directory exists              | none, and the guard FAILS naming the subject     |

  Scenario Outline: a specifier is admitted only when it resolves inside the family
    Given a family resolved from `src/<name>/`
    And a family file carrying the import specifier <specifier>
    When the guard classifies that specifier
    Then the verdict is <verdict>
    And a violation's message names the offending file and the specifier

    Examples: intra-family is not an import OUT of the module; everything else still is
      | specifier                        | verdict   |
      | `./sibling.mjs`                  | admitted  |
      | `./nested/leaf.mjs`              | admitted  |
      | `../<name>/sibling.mjs`          | admitted  |
      | `../work-loops-checks.mjs`       | violation |
      | `node:path`                      | violation |
      | `node:fs/promises`               | violation |
      | a bare specifier such as `ws`    | violation |
      | a dynamic `import()` of `../x.mjs` | violation |

  Scenario Outline: every other purity leg is re-asserted per file over the whole family
    Given a family of more than one file
    And one family file reaching <reach>
    When the guard runs
    Then it fails naming that file and that reach

    Examples: the guard is not relaxed — only its unit changed
      | reach                                  |
      | `node:fs`                              |
      | `readFile` / `readdir` / `stat` / `access` |
      | `process.cwd`                          |
      | `Date` / `performance` / `hrtime`      |
      | `fetch`                                |
      | a dynamic `import()` leaving the family |
      | `child_process`                        |

  Scenario: the classifier and the comment stripper each have ONE home
    Given the nine purity controls in this tree
    When their sources are read
    Then each resolves its family and classifies its specifiers through one shared home
    And none spells its own specifier extractor
    And each strips comments through `stripComments` from `test/support/source-slice.mjs`
    And no purity control contains a hand-rolled comment stripper

  Scenario: the guard cannot pass by finding nothing
    Given a purity guard over a family
    When the guard runs
    Then it asserts the family resolved to at least one file
    And it asserts at least one import specifier was classified across the family
    And a family that resolves to zero files fails rather than passing over the empty set

  Scenario Outline: no control under `test/arch/` asserts purity by banning an import statement
    Given the control <control>
    When its source is read
    Then it carries no assertion banning an import statement with no specifier in the pattern
    And its purity claim over <subject> is made by classifying specifiers against the family

    Examples: the eleven sites in nine files, measured at HEAD 2026-09-06
      | control                                                | subject                                      |
      | `acd-session-driver-single-home.test.mjs:114`          | `src/phase-brief.mjs`                        |
      | `acd-phase-brief-single-bag.test.mjs:233`              | `src/phase-brief.mjs`                        |
      | `acd-loop-checks-pure.test.mjs:150,198,257`            | `src/work-loops-checks.mjs`                  |
      | `acd-acceptor-ledger-accrues-across-epochs.test.mjs:180` | `src/work-acceptor/ledger.mjs`             |
      | `acd-acceptor-rule-is-one-object.test.mjs:263`         | `src/work-acceptor/rule.mjs` + `ledger.mjs`  |
      | `acd-loop-cap-single-home.test.mjs:705`                | `src/loop-bounds.mjs`                        |
      | `acd-provenance-stamped-at-write.test.mjs:22`          | `src/claim-provenance.mjs`                   |
      | `acd-trial-metric-declared.test.mjs:179`               | `src/work-counters.mjs`                      |
      | `acd-work-counters-read-only.test.mjs:14`              | `src/work-counters.mjs`                      |

  Scenario Outline: the class detector separates a token ban from a dependency ban
    Given an assertion of the shape <shape> in a control under `test/arch/`
    And the sweep has asserted it read more than one control, so an empty walk fails
    When the class sweep runs
    Then that assertion is <outcome>

    Examples: the sweep must not red the nine legitimate specifier bans it shares the tree with
      | shape                                                     | outcome  |
      | `doesNotMatch(source, /\bimport\b/u)`                     | refused  |
      | `doesNotMatch(source, /^\s*import\s/mu)`                  | refused  |
      | `doesNotMatch(source, /^import .*command-core\.mjs/mu)`   | admitted |
      | `doesNotMatch(source, /^import .*node:fs/mu)`             | admitted |
      | `doesNotMatch(body, /\bimport\s*\(/u)`                    | admitted |
      | `doesNotMatch(source, /from\s+"[^"]*work-audit-drive\.mjs"/u)` | admitted |

  Scenario: the red probe has two halves, and both are driven over literal inputs
    Given the family classifier called with a synthetic family of two files
    When one file imports its sibling by a relative path inside the family
    Then the classifier reports no violation, where the token ban reported one
    When one file imports `node:fs`
    Then the classifier reports a violation naming that file and `node:fs`
    And neither half required an edit to any module under `src/`

  Scenario: the tree as it stands is green under the widened predicate
    Given `src/phase-brief.mjs`, `src/work-loops-checks.mjs` and `src/work-acceptor/` at HEAD
    When every converted purity control runs
    Then each passes
    And no module under `src/` was edited by this story
