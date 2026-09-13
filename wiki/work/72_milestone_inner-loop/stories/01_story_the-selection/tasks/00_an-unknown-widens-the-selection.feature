@executable @cli @work @validate
Feature: An unknown widens the selection to the whole suite, and says which unknown did it

  Selection exists to make verification cheap. The way it becomes worthless is not by being slow — it
  is by being confidently wrong once. An agent that trusts a subset and is handed a subset derived
  from a gap has been told a falsehood in the shape of an answer, and it will not find out.

  So the rule is one-directional. Coupling the graph knows narrows the run; coupling the graph does
  NOT know widens it. A changed file the graph has never seen — a file created this turn, a rename, a
  coverage gap — has UNKNOWN dependents, and recording unknown as "none affected" is the exact mistake
  the grounding protocol names. Correct-but-slow, never wrong-and-fast.

  A widening that is silent is barely better than no widening: the operator sees the whole suite run
  and cannot tell whether that was the answer or a fallback. So each widening is NAMED, with the file
  and the reason that caused it, and the four reasons are exhaustive — no artifact, a file the graph
  does not hold, a file whose dependents include no registered suite, and an artifact that cannot be
  read.

  The thing that would quietly undo all of it is a flag. `--no-widen` or `--strict-scope` would be
  requested within a week by someone who knows their change is local, and it would be used by an agent
  that does not. There is no such option, and the absence is asserted rather than merely omitted.

  The last hazard is staleness. A graph built a week ago answers confidently about a tree that no
  longer exists. This selector never builds one — a build is minutes even when nothing changed, and an
  inner-loop tool that might cost minutes before it costs seconds is not one — so the only defence is
  to report the artifact's build time on every single result, including the widened ones, and take it
  from the artifact rather than from a clock read at call time.

  ADR-002 §1, §2, §3, §5. FF-7202.

  Scenario: coupling the graph knows narrows the selection to the suites that can break
    Given a code graph that holds a changed file and the suites depending on it
    When the selection is computed for that changed file
    Then the selected suites are the registered suites among its dependents
    And the selection did not widen

  Scenario Outline: an unknown widens the selection to the whole suite and names what widened it
    Given a changed file and a code graph that is <graph state>
    When the selection is computed for that changed file
    Then the whole suite is selected
    And the widening names that file with the reason <reason>
    And the selection is not a proper subset of the whole suite

    Examples: the four widening reasons, driven positively and exhaustively
      | graph state                                       | reason                  |
      | absent — no artifact on disk                      | no-graph                |
      | an artifact holding no node for that file         | not-in-graph            |
      | an artifact whose dependents for it hold no suite | no-registered-dependent |
      | an artifact on disk that does not parse           | graph-unreadable        |

  Scenario: the four reasons are the whole vocabulary
    Given every widening this selection can report
    When the reason carried by each is read
    Then it is one of the four
    And no widening carries a reason outside them

  Scenario Outline: the rule is checked from both sides, so neither side passes unexamined
    Given a selection result that <result>
    When it is checked against the widening rule
    Then the check <verdict>

    Examples: the two-sided assertion
      | result                                                        | verdict |
      | widened and selected the whole suite                          | admits  |
      | widened and selected a proper subset of the whole suite       | refuses |
      | did not widen and resolved every changed file in the graph    | admits  |
      | did not widen and carried a changed file that did not resolve | refuses |

  Scenario Outline: the selector never builds a graph and opens no second route to one
    Given <route> planted in a module this story adds
    When the modules are read for a route to the graph
    Then the planted route is reported by the file that holds it
    And with nothing planted no route is found
    And the graph artifact is reached only through the shared normalisation and impact functions

    Examples: the routes to the graph that must not exist
      | route                                             |
      | an invocation of the graph build                  |
      | a second read of the graph artifact file          |
      | a parse of the artifact outside the shared reader |
      | a child process of any kind                       |

  Scenario Outline: no option suppresses a widening
    Given the options this selection accepts
    When <option> is looked for among them and in every module this story adds
    Then it is absent

    Examples: the suppressors that must not exist
      | option          |
      | --no-widen      |
      | --strict-scope  |
      | --narrow        |
      | --assume-fresh  |
      | --skip-widening |

  Scenario: no option this selection does accept can turn a widened result narrow
    Given every option this selection accepts
    When a widening is produced and each option is applied in turn
    Then the whole suite is still selected
    And the widening is still named

  Scenario Outline: the changed set is read from the base that was given
    Given a working tree carrying uncommitted changes and one commit made since HEAD~1
    When the selection is computed with the base <base>
    Then the changed set is <changed set>
    And no default branch is inferred in place of a base
    And no result is returned that selected nothing

    Examples: the base of the changed set
      | base        | changed set                                          |
      | none given  | the index and working-tree changes                   |
      | HEAD~1      | those changes and every change since HEAD~1          |
      | no-such-rev | not answered — a coded refusal naming the revision   |

  Scenario Outline: a changed file that is itself a registered suite is in its own selection
    Given a code graph in which <changed file> has <dependents>
    When the selection is computed for that changed file
    Then the selected suites are <selected>
    And the selection <widening>

    Examples: the union is taken before the intersection, so a changed suite selects itself
      | changed file             | dependents                        | selected                              | widening      |
      | a registered suite file  | only the runner, which is no suite | that suite file alone                 | did not widen |
      | a registered suite file  | the runner and one other suite     | that suite file and the other suite   | did not widen |
      | a source module          | two registered suites             | those two suites                      | did not widen |
      | a source module          | only files that are no suite       | the whole suite                       | widened, naming it |

  Scenario Outline: every result reports the artifact's own build time, widened or not
    Given an artifact whose recorded build time is a fixed past instant
    When the selection is computed for a changed set that <case>
    Then the result reports <build time>

    Examples: the build time on every path
      | case                                       | build time                               |
      | resolves entirely in the graph             | the artifact's instant                   |
      | widens because a file is not in the graph  | the artifact's instant                   |
      | widens because the artifact does not parse | no build time, and the widening says why |
      | widens because there is no artifact        | no build time, and the widening says why |

  Scenario: the build time is the artifact's, never the moment of the call
    Given an artifact whose recorded build time is a fixed past instant
    When the selection is computed twice with time passing between the two calls
    Then both results report that same instant
    And neither reports an instant later than the artifact's

  Scenario Outline: selection is pure and caches nothing between calls
    Given one changed set and two code graphs that couple it differently
    When the selection is computed against <first> and then against <second> in one process
    Then the second result answers from <second> rather than repeating the first

    Examples: the order of the two calls does not decide the answer
      | first   | second  |
      | graph A | graph B |
      | graph B | graph A |
