@executable @cli @work @work-stream
Feature: a lost or failing case is red, and a case that is not isolated is logged

  `scripts/test-sharded.mjs` already maps every registered case to its suite file, runs a failed
  unit once more alone after the pool drains, and reports what it lost. This task binds those
  answers to the gate row. A case that is red in the pool and green alone is a test that is not
  isolated (144 Q2): the run does not fail on it, and its name is logged on the gate row.

  The runner prints each such case as one TAP comment line, `# not isolated - <case>`. The gate
  reads those lines from the run's output. The row's detail cell then reads, in order: the failing cases,
  the not-isolated cases, and the run line task 02 defines, joined by ` · `.

  Scenario: a case red in the pool and red again alone makes the row red and names it
    Given the case `loop wave merges home` fails in the pool and fails again when its unit runs alone
    When `aof work regression-gate 134` runs the sharded program
    Then the program exits 1 and prints `not ok - loop wave merges home`
    And the row it appends is `red` and its detail names `loop wave merges home`

  Scenario: a case red in the pool and green alone is logged on a green row
    Given the case `fleet boards branch deleted` fails in the pool and passes when its unit runs alone
    And every other case passes
    When `aof work regression-gate 134` runs the sharded program
    Then the program exits 0 and prints `# not isolated - fleet boards branch deleted`
    And the row it appends is `green` and its detail begins `not isolated: fleet boards branch deleted · `
    And the row satisfies the door

  Scenario: every not-isolated case is named, in the order the run reported them
    Given the cases `core workspace`, `advertised paths` and `asset base seam` each fail in the pool and pass alone
    When `aof work regression-gate 134` runs the sharded program
    Then the row's detail begins `not isolated: core workspace, advertised paths, asset base seam · `

  Scenario Outline: a run that cannot account for every registered case is red
    Given <loss>
    When `aof work regression-gate 134` runs the sharded program
    Then the program exits 1 and prints `<line>`
    And the row it appends is `red` and its detail carries that line's text

    Examples:
      | loss                                                                 | line                                                                                           |
      | one registered case is exported by no suite file the index imports   | not ok - the sharded run cannot account for the registry: 1 case(s) map to no suite file, 0 duplicate entries |
      | a unit assigned 5 cases exits 0 having executed 3, and again alone   | not ok - test/loop/loop-command-wave.test.mjs: executed 3 of 5 assigned cases                  |

  Scenario: --strict still makes a not-isolated case fail the run
    Given the case `fleet boards branch deleted` fails in the pool and passes alone
    When `node scripts/test-sharded.mjs --strict` runs
    Then it exits 1 and still prints `# not isolated - fleet boards branch deleted`
