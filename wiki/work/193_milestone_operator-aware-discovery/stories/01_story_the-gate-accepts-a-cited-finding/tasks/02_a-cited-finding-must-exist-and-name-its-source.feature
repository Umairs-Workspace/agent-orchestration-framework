@executable @cli @work @validate
Feature: A cited finding must exist and name its source

  WHY. "A cited finding is not a default" holds only if the citation is checked (SPEC Scope, second
  bullet). The lane resolves every `researched F<n>` against the research document the story's
  milestone holds, and reports one that leads nowhere as `example-research-unanchored` (ADR-002 §2).
  The check proves a source is named; whether the source is right is the reviewer's (ADR-001 §9).

  Background:
    Given a project with "work.examples.enabled" true
    And story "193/01" in status "in-progress" under milestone "193"

  Rule: R3 · A cited finding must exist and name its source

    Scenario: E6 · a citation with no finding behind it is reported
      Given the story's map holds an example "E4" labelled "[researched F3]"
      And the milestone's "RESEARCH.md" holds no "## F3 · " heading
      When "aof work doctor 193/01 --json" runs
      Then it reports "example-research-unanchored" at severity "error" for the story's "EXAMPLES.md"
      And the message names "E4", its line and "F3", and the research document it looked in

    Scenario: E7 · a finding that names no source is reported
      Given the story's map holds an example "E4" labelled "[researched F3]"
      And the milestone's "RESEARCH.md" holds "## F3 · " with a Finding line and no Source line
      When "aof work doctor 193/01 --json" runs
      Then it reports "example-research-unanchored" for "E4", and the message says "F3" names no source

    Scenario: E8 · with no research document, every citation is reported
      Given the story's map holds an example labelled "[researched F1]" and a question in state "researched F1"
      And the milestone has no "RESEARCH.md"
      When "aof work doctor 193/01 --json" runs
      Then it reports "example-research-unanchored" twice, once for the example and once for the question

    Scenario Outline: a citation resolves only to one sourced finding
      Given the story's map holds an example "E1" labelled "[researched F2]"
      And the milestone's "RESEARCH.md" holds <document>
      When "aof work doctor 193/01 --json" runs
      Then "example-research-unanchored" is <reported> for "E1"

      Examples:
        | document                                              | reported     |
        | "## F2 · " with a Source line                         | not reported |
        | "## F2 · " twice, each with a Source line             | reported     |
        | "### F2 · " with a Source line                        | reported     |
        | "## F2 · " whose Source line is empty                 | reported     |
        | "## F2 · " inside an HTML comment only                | reported     |
        | "## F1 · " with a Source line, and no "F2"            | reported     |

    Scenario Outline: the document a story cites is its milestone's, or its own when it has none
      Given a story "<story>" whose map cites finding "F1"
      And a sourced "## F1 · " heading in "<document>" and in no other file
      When "aof work doctor <story> --json" runs
      Then "example-research-unanchored" is <reported>

      Examples:
        | story  | document                              | reported     |
        | 193/01 | the milestone folder's RESEARCH.md    | not reported |
        | 193/01 | the story folder's RESEARCH.md        | reported     |
        | 181    | the story folder's RESEARCH.md        | not reported |

    Scenario: a map that cites nothing needs no research document
      Given the story's map holds only "[proposed]" examples and a "technical" question
      And the milestone has no "RESEARCH.md"
      When "aof work doctor 193/01 --json" runs
      Then it reports no "example-research-unanchored"

    Scenario Outline: the finding takes the acceptance horizon
      Given the story is in status "<status>" and its map cites a finding that does not resolve
      When "aof work doctor 193/01 --json" runs
      Then "example-research-unanchored" is reported at severity "<severity>"

      Examples:
        | status      | severity |
        | in-progress | error    |
        | in-review   | error    |
        | done        | warn     |

    Scenario: the gate does not ask which beat wrote the map
      Given "work.examples.operatorAware" is absent from the project's config
      And the story's map holds an example labelled "[researched F1]" and the milestone's "RESEARCH.md" holds no "## F1 · " heading
      When "aof work doctor 193/01 --json" runs
      Then it reports "example-research-unanchored", exactly as it does with the switch on

    Scenario: the lane itself reads no file
      Given a snapshot whose story row carries the map's text and the research document's text
      When the examples lane judges that snapshot with no filesystem
      Then it produces the same findings "aof work doctor" produces for that story
