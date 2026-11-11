Feature: Test selection, contract derivation and seam liveness ask relations, and report exactly what they report today

  WHY. Three readers in `@aof/work` parse `graphify-out/graph.json` themselves, each with its own
  unavailable vocabulary. After this task each one asks the code corpus's `relations` and maps the
  port's answer onto the vocabulary it already speaks. So the impacted-test lane widens for the same
  reasons, the refine-time proposal names the same files, and the seam audit raises the same
  findings and limits, while the code graph has one reader (179/ADR-004).

  THE FIXTURE: the hand-written graph of 179/02 task 01, in a temp project. "src/a.mjs" imports
  "src/b.mjs", "src/c.mjs" calls "src/a.mjs", and "src/lonely.mjs" has no edges. Each reader is
  driven in process through the application's assembled service, with a "relations" that records
  every call it receives.

  @executable @cli @adapter @work
  Scenario Outline: each reader asks relations once, with every path it needs
    When <reader> runs over the fixture
    Then "relations" was called exactly once, with <paths>
    And the reader opened no graph file itself

    Examples:
      | reader                                               | paths                                        |
      | test selection for the changed set "src/b.mjs"       | "src/b.mjs"                                  |
      | contract derivation for a story whose subject is "src/a.mjs" | "src/a.mjs"                          |
      | the seam-liveness lane over the fixture's "src/"     | every exporting module under "src/"          |

  @executable @cli @adapter @work
  Scenario: test selection selects through relations what it selected before
    Given suites registered for "src/a.mjs" and "src/c.mjs"
    When test selection runs for the changed set "src/b.mjs"
    Then the selected suites are those of "src/a.mjs" and "src/c.mjs"
    And "builtAt" is the artifact's own modification instant

  @executable @cli @adapter @work
  Scenario Outline: test selection widens for the same reasons as before
    Given the code graph artifact is <state>
    When test selection runs for the changed set "src/b.mjs"
    Then it widens to every suite with reason "<reason>"
    And "builtAt" is null

    Examples:
      | state                       | reason           |
      | absent                      | no-graph         |
      | a file holding "{not json"  | graph-unreadable |

  @executable @cli @adapter @work
  Scenario Outline: derivation reports the graph unavailable in its own vocabulary
    Given the code graph artifact is <state>
    When contract derivation runs for a story whose subject is "src/a.mjs"
    Then its graph is unavailable as "<unavailable>"
    And the proposal still carries the citations of its documents alone

    Examples:
      | state                       | unavailable |
      | absent                      | absent      |
      | a file holding "{not json"  | unreadable  |

  @executable @cli @adapter @work
  Scenario: derivation proposes the same coupled files as before
    When contract derivation runs for a story whose subject is "src/a.mjs"
    Then it proposes "src/b.mjs" and "src/c.mjs" with the graph as their reason

  @executable @cli @adapter @work
  Scenario: seam liveness finds the same uncalled export as before
    Given "src/lonely.mjs" exports "unused" and no other file imports it
    When the seam-liveness lane runs over the fixture
    Then it raises a finding for "src/lonely.mjs" naming "unused"
    And it raises none for "src/a.mjs" or "src/b.mjs"

  @executable @cli @adapter @work
  Scenario Outline: seam liveness reports an unavailable graph as a limit with the same sentence
    Given the code graph artifact is <state>
    When the seam-liveness lane runs over the fixture
    Then it raises no finding
    And its limit reads "<limit>"

    Examples:
      | state                       | limit                                                                                         |
      | absent                      | no code graph was available — the artifact is not on disk, and this project may never have built one |
      | a file holding "{not json"  | the code graph could not be read (<the parser's message>)                                     |

  @executable @cli @adapter @work
  Scenario: two selections in one process each read the artifact, so a rebuilt graph is seen
    Given test selection ran once for "src/b.mjs"
    And the artifact is rewritten so "src/lonely.mjs" also imports "src/b.mjs"
    When test selection runs again for "src/b.mjs"
    Then the suites of "src/lonely.mjs" are now selected too
