@executable @cli @work @validate
Feature: An unknown is a stated limit, never a clean seam, and the lane never builds the graph it reads

  The audit has no selection to widen, so the widening rule arrives here in the only other form it
  can take: it states the gap out loud. A run that could not resolve a module's coupling and says
  nothing has told a reader "the seams are fine" in the shape of a clean result, and the reader will
  not find out.

  Three absences produce that silence and all three are ordinary. There is no artifact, because
  graphify is an OPTIONAL integration and most projects will never install it. There is an artifact
  that cannot be read or does not parse. And there is a candidate the graph does not hold — which is
  the dangerous one, because an empty `dependents` list on an absent node looks exactly like an empty
  `dependents` list on a present one, and rendering the first as "no dependents" is the precise
  mistake this rule exists to prevent.

  Each of the three yields ZERO findings and a stated limit. Not a finding, because the lane did not
  observe an unwired seam; not silence, because it did not observe a wired one either.

  The floor is the second half of the same honesty. `audit-ran-on-nothing` is an `error`, and a lane
  whose population is "modules the graph covers" would breach its floor — and red a build — in every
  project that never installed an optional tool. So the population is source modules on disk, a floor
  greater than zero is always satisfiable where there is source, and an absent graph costs a limit
  rather than a failure.

  Staleness is the last hazard and it is not solved by rebuilding. A build is minutes even on the
  unchanged path, and a command that might cost minutes before it costs seconds is not one an agent
  runs; so this lane reads the artifact and never builds one. The only defence left is to report the
  artifact's OWN recorded build time on every result, taken from the artifact rather than from a clock
  read at the moment of the call, and to say plainly on the absence paths that there is none.

  The route to the graph is therefore closed in every direction at once: no build invocation, no
  second read of the artifact file, no parse outside the shared reader, and no child process of any
  kind. The check is a census over this lane's own source with comments stripped, so prose explaining
  a rejected design cannot red it — and so that a build described in a comment is still not a build.

  ADR-006 §1, §4, §5. FF-7704. 72/ADR-002 §1, §3. 09/ADR-004.

  Scenario Outline: an artifact that cannot answer produces no finding and a limit that says why
    Given source modules on disk under src/, each exporting a function and none with a dependent
    And <artifact>
    When the seam lane is run
    Then no audit-seam-unwired finding is reported
    And the result carries a limit stating <reason>
    And nothing in the result claims that any seam is wired

    Examples: the absence paths, each driven positively
      | artifact                                                | reason                                             |
      | no graph artifact on disk                               | no code graph was available                        |
      | an artifact on disk that cannot be read                 | the code graph could not be read                   |
      | an artifact on disk that does not parse                 | the code graph could not be read                   |
      | an artifact whose shape the shared reader refuses       | the code graph could not be read                   |

  Scenario: a candidate the graph does not hold is counted in the limit, never reported as unwired
    Given two source modules on disk, each exporting a function
    And a code graph that holds the first with no dependents and does not hold the second
    When the seam lane is run
    Then exactly one audit-seam-unwired finding is reported, naming the first
    And no finding names the second
    And the result carries a limit counting one candidate whose coupling could not be resolved
    And the second module is not described as having no dependents

  Scenario Outline: the floor is taken over source on disk, so an optional tool's absence cannot red a run
    Given <source> on disk under src/
    And <graph>
    When the seam lane is run
    Then the read record counts <count> against a floor greater than zero
    And audit-ran-on-nothing is <floor verdict>

    Examples: what the population is, and the one case that is genuinely nothing
      | source            | graph                          | count | floor verdict     |
      | 148 modules       | an artifact holding all 148    | 148   | not reported      |
      | 148 modules       | an artifact holding three      | 148   | not reported      |
      | 148 modules       | an artifact holding none       | 148   | not reported      |
      | 148 modules       | no artifact at all             | 148   | not reported      |
      | no module at all  | an artifact holding 148        | 0     | reported at error |

  Scenario Outline: every result reports the artifact's own recorded build time
    Given an artifact whose recorded build time is a fixed past instant
    When the seam lane is run against <case>
    Then the result reports <build time>
    And it reports no instant later than the artifact's

    Examples: the build time on every path, present and absent
      | case                                         | build time                            |
      | a graph resolving every candidate            | the artifact's instant                |
      | a graph holding none of the candidates       | the artifact's instant                |
      | an artifact that does not parse              | no build time, and the limit says why |
      | no artifact on disk                          | no build time, and the limit says why |

  Scenario: the build time is the artifact's, never the moment of the call
    Given an artifact whose recorded build time is a fixed past instant
    When the seam lane is run twice with time passing between the two runs
    Then both results report that same instant

  Scenario: a clean run still states what it could not see
    Given a code graph resolving every source module on disk, each with a dependent under src/
    When the seam lane is run
    Then no audit-seam-unwired finding is reported
    And the result still carries the limits this lane can state
    And every limit it carries states both the question it answers and the consequence of not answering it
    And no statement in the result says the seams are fine

  Scenario Outline: the lane never builds a graph and opens no second route to one
    Given <planted> in the module this story adds
    When that module's own source is read for a route to a graph
    Then it is <verdict>

    Examples: every route to a graph, driven positively and negatively
      | planted                                           | verdict                                 |
      | an invocation of the graph build                  | reported, naming the file that holds it |
      | a graphify token in any form                      | reported, naming the file that holds it |
      | a second read of the graph artifact file          | reported, naming the file that holds it |
      | a parse of the artifact outside the shared reader | reported, naming the file that holds it |
      | a child process of any kind                       | reported, naming the file that holds it |
      | a comment describing the rejected build path      | not reported                            |
      | nothing at all                                    | not reported                            |

  Scenario: the artifact is reached through the shipped readers and by no other route
    Given the module this story adds with nothing planted in it
    When its routes to the graph artifact are read
    Then the only ones found are the shipped normalisation and impact functions
    And no run of the lane, under any input, leaves a graph artifact behind that was not already there
