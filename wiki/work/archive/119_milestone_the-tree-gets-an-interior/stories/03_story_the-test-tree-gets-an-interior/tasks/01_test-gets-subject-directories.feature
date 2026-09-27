@executable @cli @work @validate
Feature: test/'s 589 flat siblings live in subject directories, and everything that reaches a suite by path still reaches it

  `test/` holds 594 direct children (`ls test | wc -l`): 589 `*.test.mjs` siblings
  (`ls test/*.test.mjs | wc -l`), plus `arch/`, `fixtures/`, `integration/`, `support/` and
  `installer-shell.mjs`. That is 36% more suites than the directory item 63 has always been about,
  and it went unledgered until 2026-09-02 — an artefact of where milestone 58 happened to be
  looking, not a judgement that this half was fine.

  This half is affordable because the readers were already built to recurse, which was measured
  rather than hoped. `walkSuiteFiles` (`src/work-audit/census.mjs`) walks `test` recursively and
  returns 1,023 suite paths today; `59/FF-5903`'s control asserts the walk reached `test/arch/` and
  `test/integration/` by PREFIX (`test/arch/acd-test-suite-registration.test.mjs:184-192`), and a
  prefix survives a deeper tree. Selection is a prefix predicate too: `work.test.roots` is `["test"]`
  in `.aof/aof.config.json`, and `isSuiteFile` (`src/work-test-select.mjs`) tests
  `<root>/` against the path, so `test/<subject>/x.test.mjs` selects exactly as `test/x.test.mjs`
  did. `TEST_ROOTS` (`src/work-audit/census.mjs`) stays the same three — a subject directory is
  UNDER `test`, not a fourth root — and `test/arch/acd-seam-liveness-unknown-is-a-limit.test.mjs:281`
  holds it to at least three.

  What is not free is the depth of every relative specifier. 480 of the 589 `test/` suites import
  `../src/…` and 278 import `./support/…` (`grep -rl 'from "\.\./src/' test/*.test.mjs | wc -l`;
  `grep -rl 'from "\./support/' test/*.test.mjs | wc -l`); under `test/arch/` it is 271 and 153 of
  433. Every one of those gains a segment. That is ADR-008's second kind of change — an import
  specifier pointing at a file — and it is the whole of what a moved suite's body may contain, which
  is what keeps the names inside these files identical and is why task 02's membership claim can rest
  on it.

  What would quietly undo this: a suite moved without its `./support/` specifier re-depthed, which
  fails at import and is loud, versus a suite whose FIXTURE path is built from `import.meta.url` and
  silently resolves to a directory that now holds nothing; `test/support/` growing a second copy of a
  helper because the deeper relative path made importing the one home look awkward — 66 files live
  there and it is the home TECH_DEBT item 24's ratchet depends on; and treating `installer-shell.mjs`
  or `test/integration/`'s non-suite programs as siblings to be grouped, when `scripts/check.mjs` and
  two `package.json` scripts reach them by their exact paths.

  ADR-010 §1. ADR-008. ADR-009. ADR-003 §4. FF-11904, FF-11906.

  Scenario: test has an interior and the five things that are not suites stay where they are
    Given the restructure has landed
    When `test/` is listed
    Then it holds no `*.test.mjs` direct child
    And every directory beneath it that holds a suite carries exactly one `index.mjs`
    And `arch/`, `fixtures/`, `integration/`, `support/` and `installer-shell.mjs` are at the paths they occupied before
    And `test/support/` still holds one copy of each helper, `source-slice.mjs` included

  Scenario Outline: a reader that reaches a suite by path reaches the same set afterwards
    Given <reader>
    When it runs against the restructured tree
    Then <outcome>

    Examples: every path-reaching reader measured at this beat
      | reader                                              | outcome                                                          |
      | the recursive suite walk over `test`                | returns the same 1,023 paths, at their new locations             |
      | the declared test roots                             | are still exactly three, and a subject directory is not a fourth |
      | `aof test --scope file` naming a moved suite        | runs that suite and reports it registered                        |
      | `aof test --scope file` naming a suite's old path   | reports it unusable BY PATH rather than running nothing quietly  |
      | `aof test --scope impacted` after a `src/` edit     | selects the same suites, through the same graph edges            |
      | `aof test --scope all`                              | reports `gate: true` with nothing widened                        |
      | `npm run test:smoke:cli`                            | runs the integration smoke at its unchanged path                 |
      | `scripts/check.mjs`                                 | runs the runner and the smoke, both by their unchanged paths     |

  Scenario: a moved suite's body changes only where a specifier points
    Given the diff of any suite this story relocated
    When its content delta is read
    Then every changed line is an import specifier or the `from` clause of one
    And no line that carries a test's name is changed
    And no assertion, fixture literal or floor is changed

  Scenario Outline: a suite that reaches a shared file by relative path resolves at its new depth
    Given a suite moved into a subject directory
    When it imports <target>
    Then the specifier is re-depthed and resolves
    And an unre-depthed specifier fails at import rather than resolving to something else

    Examples: the four relative shapes present in this tree
      | target                          |
      | a module under `src/`           |
      | a helper under `test/support/`  |
      | a file under `test/fixtures/`   |
      | another suite in the same group |

  Scenario: the budget row falls rather than keeping headroom
    Given FF-11904's table carries a `test/` row at the count measured when 119/01 landed it
    When this story shrinks that layer
    Then the row is lowered to the new measured count with no headroom
    And the control fails if the row is left where it was
    And every flat directory this story creates under `test/` is a row or a declared exemption, so a table naming the parents cannot pass silently on the children
    And each row's sweep asserts it really read, so a rename reds the row instead of emptying it
