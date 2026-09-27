@executable @cli @work @validate
Feature: One command that selects, launches and prints what failed

  The chore this replaces is measured. There is a rule saying never run the full suite here and run
  focused suites instead, and no command that does it — so every agent writes the same throwaway
  script again, which is why 805 of 4,950 write events are scratchpad files and why one throwaway
  command was re-run 33 times.

  A tool that replaces a chore has to be better than the chore at the chore's own job, and the job is
  answering one question: did my change break anything. Everything a passing test prints is noise
  against that question, and there are thousands of them. So failures only, by default: each failure
  with its assertion output, then one summary line carrying what was selected out of what, the scope
  asked for, the graph's build time, and every widening. `--verbose` restores the full stream and
  removes nothing from it.

  The way a two-faced command rots is that the human output and the machine output drift, because each
  is assembled where it is printed. Then a claim verified through `--json` is not the claim an operator
  reads. Both faces render from ONE result object, so a field that exists for one exists for the other.

  The scope forms are three and they are closed. `impacted` asks the selector; `file` takes what the
  caller named; `all` asks nothing and runs everything. There is no fourth, and an unrecognised scope
  is a refusal rather than a quiet fallback to one of the three — a fallback here is a narrowing
  nobody asked for, which is the invariant story 01 exists to hold.

  ADR-001 §1, ADR-003. FF-7204.

  Scenario Outline: the scope form decides what is selected and whether the result may stand
    Given a project with a declared runner and a graph the selector can read
    When the test command is run with the scope <asked for>
    Then <selected> is what the runner is asked to run
    And the result reports the scope it ran as <ran as>
    And the result <verdict> stand as a verdict

    Examples: the three closed scope forms, and a fourth that is not one of them
      | asked for | selected                                           | ran as   | verdict |
      | all       | every registered suite                             | all      | may     |
      | impacted  | the registered suites the changed set reaches       | impacted | may not |
      | impacted  | every registered suite, because a change widened it | all      | may not |
      | file      | only the suite files the caller named               | file     | may not |
      | sweep     | nothing at all, and no runner is launched           | none     | may not |

  Scenario Outline: an input that is not one of the three forms is refused, never defaulted
    Given the scope <given>
    When the test command is run
    Then the result is a coded refusal naming what was not understood
    And nothing was selected and no runner was launched

    Examples: the inputs a quiet fallback would swallow
      | given                               |
      | a word that is not one of the three |
      | an empty scope                      |
      | one of the three in a different case |
      | file, with no file named             |

  Scenario Outline: what a run prints, and what it exits with
    Given a project with a declared runner and a selection in which <mix>
    When the test command is run <face>
    Then <printed> is printed
    And one summary line reports what was selected out of what, the scope, the graph's build time and every widening
    And the exit status is <status>

    Examples: the failures-only contract, over every outcome mix against both faces
      | mix               | face           | printed                                                               | status   |
      | every test passes | with no option | no passing row and no failure                                         | zero     |
      | every test passes | with --verbose | a passing row for every test                                          | zero     |
      | some tests fail   | with no option | each failing test with its assertion output, and no passing row       | non-zero |
      | some tests fail   | with --verbose | a passing row for each passing test, and each failure with its output | non-zero |
      | every test fails  | with no option | every failing test with its assertion output                          | non-zero |
      | every test fails  | with --verbose | every failing test with its assertion output                          | non-zero |

  Scenario Outline: verbose restores the passing rows and removes nothing
    Given a failures-only run in which <mix>
    When the same run is repeated with the verbose option
    Then <restored> is printed as well
    And every line the failures-only run printed appears in the verbose output

    Examples: the comparison is a containment, never a count of lines
      | mix               | restored                                 |
      | every test passes | a passing row for every test             |
      | some tests fail   | a passing row for each passing test      |
      | every test fails  | nothing, there being no passing row to add |

  Scenario Outline: the human face and the machine face render from one result
    Given one completed run rendered as text and as machine-readable output
    When <field> is read from each
    Then both carry the same answer

    Examples: the fields a drift between the two faces would separate
      | field                                         |
      | how many suites were selected out of how many |
      | the scope the run ran as                      |
      | the graph's build time                        |
      | each widening and the file that caused it     |
      | whether the result may stand as a verdict     |
      | a failing test's assertion text               |
