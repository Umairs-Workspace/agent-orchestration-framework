@executable @cli @work @validate
Feature: The refresh is a hand-run program the audit cannot reach, and the markdown view is generated from the one home

  A rule that silently fetches is a rule whose result depends on the day it ran. That is the sentence
  the whole design answers to, and it is why the corpus is checked into the tree rather than looked up
  per diagnosis: the audit is a join over data that is already there, and the same audit over the same
  corpus and the same project answers the same thing tomorrow.

  Which makes the refresh path the dangerous half. A `--refresh` flag on the audit command would leave
  determinism as a PROMISE — a thing the audit does not do today, that anybody can make it do next
  week with one option and a good reason. A separate program is a different kind of guarantee: no
  registered command names it, the audit family's import closure cannot reach it, and neither of those
  facts is an intention. They are absences a control can plant against.

  It lives under `scripts/`, deliberately, and that is the third half of the same argument. The
  installed payload carries `src/` and no `scripts/`, so a program filed there cannot travel and cannot
  be invoked in a governed project even by accident. The corpus travels; the thing that rewrites it
  does not. It is run by hand, it is the only thing in this milestone that touches the network, and it
  reports drift rather than quietly moving a number under a reviewer.

  The markdown view exists because a human-readable table was asked for and is worth having. It is a
  RENDERING, never a second declaration. A hand-authored twin of a machine-readable fact is the species
  that goes stale exactly where somebody reads it and nowhere the code can notice, so the view carries
  a generated stamp, it is written only by the refresh, nothing parses it, and a hand edit does not
  survive the next render. The module is the only home.

  ADR-007 §2b, §3. FF-7705.

  Scenario: the refresh re-verifies each row against its source and stamps the date it did so
    Given a reference corpus whose rows carry sources
    When the refresh program is run by hand and every row's source answers
    Then each row's checked date is the date the refresh ran
    And each row's value is unchanged unless a new one was supplied for it
    And the corpus module on disk carries those rows
    And every row still carries all six of its fields, and no seventh

  Scenario Outline: what the refresh decides alone, and what it hands back rather than rewriting
    Given a reference corpus row, a fetch of its source that <source state>, and <supplied>
    When the refresh program's core is run over that row
    Then it reports <report>

    Examples: a six-field row declares no extraction rule, so a value is CONFIRMED and never scraped
      | source state         | supplied                          | report                                                                       |
      | answers              | no new value                      | nothing for that row, and its checked date moves to the day it ran           |
      | answers              | the value the row already carries  | nothing for that row, and its checked date moves to the day it ran           |
      | answers              | a value differing from the row's   | that row, the value it carried and the value now recorded                    |
      | does not answer      | no new value                      | that row, that its source could not be reached, and its checked date unmoved |
      | names no resolvable address | no new value               | that row, that its source could not be reached, and its checked date unmoved |

  Scenario: the refresh names every row it could not confirm, and exits saying so
    Given a reference corpus of four rows, one of which has drifted and one of whose sources does not answer
    When the refresh program is run by hand
    Then its report names both of those rows and neither of the other two
    And its report says how many rows it checked
    And a reader of the report can tell a drifted row from an unreachable one

  Scenario: the generated view says it was generated
    Given the generated markdown view as it ships
    When it is read
    Then it carries a stamp naming the program that wrote it and when
    And it says it is not to be hand-edited

  Scenario: the view follows the module, because the module is the only home
    Given a reference corpus module and the view rendered from it
    When one row's value is changed in the module and the view is rendered again
    Then the view shows the changed value
    And every row of the module appears in the view
    And the view shows no row and no value the module does not carry

  Scenario: a hand edit to the view does not survive the next render
    Given the generated view with one row's value edited by hand
    When the view is rendered again from the unchanged module
    Then the view is the rendering of the module's rows
    And the hand-edited value is gone

  Scenario Outline: a reader of the generated view is planted and reported
    Given <planted> planted in the shipped source
    When the source is read for a reader of that file
    Then the planted read is reported by the file that holds it
    And with nothing planted no reader is found

    Examples: the ways a generated view becomes a second source of truth
      | planted                                             |
      | a read of the view's path                           |
      | a parse of the view's table                         |
      | an import naming the view                           |
      | the view's path spelled as a literal in a module    |

  Scenario Outline: a door onto the refresh is planted and reported
    Given <planted> planted
    When the registered commands and the audit family's import closure are read for the refresh program
    Then the planted reference is reported by the place that holds it
    And with nothing planted none is found

    Examples: the doors that must not open onto the refresh
      | planted                                                                |
      | an import of the refresh program from a module of the audit family     |
      | a dynamic import of the refresh program from a module of the audit family |
      | a registered command whose declaration names the refresh program       |
      | a spawn of the refresh program from a module under the payload's source |

  Scenario Outline: no option of the audit is a refresh
    Given the options the audit command accepts
    When <option> is looked for among them and in every module this story adds
    Then it is absent

    Examples: the flag that would make determinism a promise
      | option              |
      | --refresh-baselines |
      | --refresh-reference |
      | --refresh           |
      | --check-sources     |
      | --update-corpus     |

  Scenario: the corpus travels and the program that rewrites it does not
    Given an installed payload
    When it is read for the reference corpus and for the refresh program
    Then the corpus is in it and its rows are readable
    And the refresh program is not in it

  Scenario Outline: a network capability on the audit path is planted and reported
    Given <planted> planted in a module of the audit family's import closure
    When that closure is read for a network capability
    Then the planted capability is reported by the file that holds it
    And with nothing planted none is found

    Examples: every shape a fetch takes
      | planted                                      |
      | a call to fetch                              |
      | an import of the https builtin               |
      | an import of the http builtin                |
      | an import of an http client dependency       |
      | an http:// literal in a request position     |
      | an https:// literal in a request position    |
      | a web-fetch tool invocation                  |

  Scenario: a URL that is data is not a network capability
    Given a reference corpus row carrying its source URL as data
    And a module of the audit family carrying a documentation link in a comment
    When the closure is read for a network capability
    Then neither is reported
    And the reference rows still carry their source URLs

  Scenario Outline: two runs on two days, and only the corpus's own dates may move the answer
    Given one reference corpus, one loop model and one project
    And a row whose checked date <crossing> the staleness window between the two instants
    When the bounds lane is run at the first instant and again at the second
    Then the two answers differ by <difference>
    And no network was reached on either run

    Examples: determinism, and the one thing that is allowed to change
      | crossing                | difference                                              |
      | does not cross          | nothing at all                                          |
      | crosses                 | exactly one audit-reference-stale finding naming that row |

  Scenario: nothing but the corpus and the project decides the answer
    Given one reference corpus, one loop model and one project
    When the bounds lane is run twice at the same instant from two different working directories
    Then the two answers carry the same findings in the same order
    And neither answer names a source that was contacted
