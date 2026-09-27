@executable @cli @work @validate
Feature: A bound this project declares is joined against what everyone else ships, and the join answers in one vocabulary

  The lane asks ONE question — does this project declare a bound where a bound is expected? — and
  answers it from two sources. The loop registry supplies the bounds the project declares about its
  own loops; the reference corpus supplies the bounds other systems ship. One lane, one subject, two
  sources, one set of codes across both, so a reader never has to ask which half of the join a
  finding fell out of.

  An uncapped ceiling is therefore not a second rule here — it is one ROW of this join. The registry
  validation already emits its own warning for that fact and keeps it; two commands emitting one code
  at two severities is the confusion a control one directory over exists to prevent. What is open is
  a governed PROJECT's registry, and that is what this join reaches.

  The severity ladder is fixed per code and was set from evidence. A bound declared nowhere is an
  error where a loop record says so outright and a warning where only the reference notices; a
  declared bound outside the reference range is an ARGUMENT, not a defect, and stays at warn; a stale
  reference row is an old install speaking, and reddening the audited project's build for it would be
  a rule punishing somebody for a fact they do not own. Every error leg is at zero in this repository
  on arrival, by another control's doing, which is the ladder's own proof.

  The loop model arrives INJECTED and already parsed, and `config:` ceiling pointers resolve through
  the one home that declares those knobs — the same home the framework's own hard gate asks. A second
  reading of one parse is not a second derivation; a second parser would be. The registry's own module
  is never reached: it is a god-node with dozens of dependents behind it, and a pure lane that pulls
  it in stops being pure and stops being cheap to test.

  What the lane could not see is stated on every run, clean or not, with the size of each population
  and the floor it read against. A pointer resolving nowhere and a project with no registry at all are
  both ANSWERS, never loops quietly counted as bounded: found-nothing and looked-at-nothing are the
  two facts a report must never merge.

  ADR-007 §1. ADR-008 §1, §2, §3, §4. 69/ADR-004. FF-7705.

  Background:
    Given a parsed loop model handed to the lane, the reference rows it joins against, and a fixed instant supplied as the moment of the run

  Scenario Outline: a ceiling that declares no bound is reported at error; a ceiling that declares one is not
    Given a loop model carrying one loop whose ceiling is <ceiling>
    When the bounds lane runs over that model
    Then the audit-bound-undeclared findings it returns number <count>
    And every finding it returns is at error, and names that loop, the record it was read from, and the ceiling field

    Examples: an uncapped or unknown ceiling is one row of this join
      | ceiling                                                             | count |
      | declared uncapped                                                   | 1     |
      | declared unknown                                                    | 1     |

    Examples: a declared ceiling is not a finding, whichever form it takes
      | ceiling                                                             | count |
      | declared none, the answer of a loop that terminates by construction | 0     |
      | a config: pointer naming a key the bounds home resolves             | 0     |
      | a module: pointer naming a symbol its module exports                | 0     |

  Scenario: the registry's own warning is neither moved nor re-emitted
    Given a loop model carrying one loop whose ceiling is declared uncapped
    When the bounds lane runs over that model
    Then no finding it returns carries the code the registry validation emits for an uncapped ceiling
    And running the registry validation over that same record still returns that code at warn

  Scenario Outline: a bound the reference declares and this project declares nowhere is reported at warn
    Given reference rows carrying a row for <bound> shipped by a named system
    And a project that declares <declaration> for that bound
    When the bounds lane runs
    Then the audit-bound-undeclared findings naming that row number <count>
    And every such finding is at warn, and names the reference row and the system that ships it

    Examples: the reference side of the join, driven from both sides
      | bound           | declaration       | count |
      | a step ceiling  | no value anywhere | 1     |
      | a step ceiling  | a value           | 0     |
      | a spend ceiling | no value anywhere | 1     |
      | a spend ceiling | a value           | 0     |

  Scenario Outline: a declared bound outside the reference range is an argument the lane states
    Given reference rows for one bound carrying the values <reference> shipped by named systems
    And a project declaring <declared> for that bound
    When the bounds lane runs
    Then the audit-bound-off-reference findings it returns number <count>
    And every such finding is at warn, and names the declared value, the reference value it sits outside of, and the system that ships it

    Examples: the range is the spread of the rows for that bound, and both edges are inside it
      | reference          | declared | count |
      | 8 and 12           | 6        | 1     |
      | 8 and 12           | 8        | 0     |
      | 8 and 12           | 10       | 0     |
      | 8 and 12           | 12       | 0     |
      | 8 and 12           | 14       | 1     |
      | a single row of 10 | 10       | 0     |
      | a single row of 10 | 9        | 1     |
      | a single row of 10 | 11       | 1     |

  Scenario Outline: a reference row older than the declared window says so, and the boundary is stated
    Given a declared staleness window and a reference row whose checked date is <age>
    When the bounds lane runs at the fixed instant
    Then the audit-reference-stale findings it returns number <count>
    And every such finding is at warn, and names the row, its checked date and the window it exceeded

    Examples: exactly at the window is not stale
      | age                           | count |
      | the instant of the run        | 0     |
      | one day newer than the window | 0     |
      | exactly the window            | 0     |
      | one day older than the window | 1     |

  Scenario: staleness is the payload speaking, not the audited project
    Given one installed payload whose reference rows include one older than the window, and two governed projects audited through it
    When the bounds lane runs in each
    Then each returns an audit-reference-stale finding naming that row, at warn
    And neither finding names the audited project as the cause

  Scenario Outline: a registry with every ceiling declared returns nothing at error
    Given <model>
    When the bounds lane runs over that model
    Then the error-severity findings it returns number none
    And <resolution>

    Examples: the measured case, and the repository that is already in it — where two pointers name a key the bounds home does not hold
      | model                                                                                                             | resolution                                                                                                                              |
      | a model in which no ceiling is uncapped or unknown and every config: pointer names a key the bounds home resolves  | the loops it reports as declaring a resolved bound number every loop in that model                                                      |
      | this repository's own loop registry as the parsed model                                                           | every loop whose pointer names a key the bounds home does not hold is named in the lane's stated limit, never counted as declaring one   |

  Scenario Outline: an unresolved config pointer is an answer the lane states, not a silent pass
    Given a loop model carrying one loop whose ceiling is a config: pointer naming <key>
    When the bounds lane runs over that model
    Then the loops it reports as declaring a resolved bound number <resolved>
    And its answer names <named>

    Examples: the pointer resolves or it does not, and either way the lane says which
      | key                                    | resolved | named                          |
      | a key the bounds home resolves         | 1        | no unresolved pointer          |
      | a key the bounds home does not resolve | 0        | that loop and that pointer key |
      | an empty key                           | 0        | that loop and that pointer key |

  Scenario: the lane invents no code for the unresolved pointer
    Given a loop model carrying one loop whose ceiling pointer resolves nowhere
    When the bounds lane runs over that model
    Then every finding code it returns is one of audit-bound-undeclared, audit-bound-off-reference and audit-reference-stale
    And none carries the code the registry validation already emits for an unresolved pointer

  Scenario Outline: the model is what the lane reads, and the disk is not
    Given a loop model handed to the lane in which every ceiling is declared
    And a loop registry on disk that <disk>
    When the bounds lane runs
    Then the audit-bound-undeclared findings it returns for loops number none
    And the answer is the answer for the model it was handed

    Examples: the disk does not decide the answer
      | disk                                        |
      | carries records declaring uncapped ceilings |
      | is absent altogether                        |
      | cannot be read                              |

  Scenario: the same model read twice gives the same answer
    Given one loop model and one set of reference rows
    When the bounds lane runs over them twice in one process at the fixed instant
    Then the two answers carry the same findings in the same order
    And neither run changed the model or the rows

  Scenario Outline: a reach for the registry module is planted and reported
    Given <planted> planted in a module this story adds
    When those modules are read for what they reach
    Then the planted reach is reported by the file that holds it
    And with nothing planted none is found

    Examples: the god-node this lane must never pull in
      | planted                                      |
      | an import of the loop registry module        |
      | a dynamic import of the loop registry module |
      | a re-export from the loop registry module    |

  Scenario Outline: the lane says what it swept, so found-nothing is never mistaken for looked-at-nothing
    Given a loop model carrying <loops> and reference rows carrying <rows>
    When the bounds lane runs
    Then it returns a read record for the loops swept and one for the reference rows swept
    And each record declares a floor greater than zero
    And the counts they report are <counts>

    Examples: the population is counted, never assumed
      | loops     | rows      | counts        |
      | six loops | four rows | six and four  |
      | one loop  | one row   | one and one   |
      | no loops  | four rows | none and four |

  Scenario Outline: a project with no loop registry is a stated limit, not a clean result
    Given a project whose loop registry <state>
    When the bounds lane runs
    Then it returns a stated limit saying the loop side of the join went unanswered, and why
    And the audit-bound-undeclared findings it returns for loops number none
    And the reference side of the join is still answered

    Examples: the three ways the loop side goes missing
      | state                        |
      | does not exist               |
      | holds no loop records at all |
      | could not be parsed          |
