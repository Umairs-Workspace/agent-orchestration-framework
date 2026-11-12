@executable @docs @assets @work-stream
Feature: On renders it, and off renders none of it

  WHY. Not every project needs facts looked up and questions explained, and no project should
  load prose it has turned off (ADR-006). So the beat ships as fragments of the practice, through
  milestone 193's slots: a project with the switch on is given it, for Claude and for Codex, and a
  project with the switch off is given exactly what it was given before this story existed.
  FF-19204 is that second half, as a control.

  "ON" is a scratch project whose "work.examples" is "{ enabled: true, operatorAware: true }".
  "CLASSIC" is the same project with "{ enabled: true }". "NONE" is the same project with no
  "work.examples". Each is rendered with "aof work update" under its own "AOF_GLOBAL_HOME".

  Scenario: a project with the switch on is given the operator-aware beat, in place of the classic one
    When ON's rendered refine command is read
    Then its discovery passage holds the operator-aware beat
    And it holds no sentence of CLASSIC's discovery passage that tells the PO how to label a question

  Scenario Outline: each runtime's render carries its half
    When ON is rendered for "<runtime>"
    Then its "<artefact>" says <content>

    Examples:
      | runtime | artefact          | content                                                                          |
      | claude  | refine command    | the three labels, the research step by level, the batch and the question's shape |
      | claude  | PO agent          | the three labels, the new default, and the recommendation on each question       |
      | claude  | researcher agent  | one finding per domain question, with its source                                 |
      | claude  | architect agent   | a "technical" label that is really a fact is relabelled "domain"                 |
      | codex   | refine skill      | the three labels, the research step by level, the batch and the question's shape |
      | codex   | PO agent          | the three labels, the new default, and the recommendation on each question       |
      | codex   | researcher agent  | one finding per domain question, with its source                                 |
      | codex   | architect agent   | a "technical" label that is really a fact is relabelled "domain"                 |

  Scenario: the Codex beat asks through its own question tool
    When ON's Codex refine skill is read
    Then the research step and the batch name the native question tool, as the rest of that skill does
    And no sentence of the beat tells Codex to call "AskUserQuestion"

  Scenario: a project with the switch off is given the beat it has today
    When CLASSIC is rendered
    Then its refine command, PO agent, researcher agent and architect agent are byte-for-byte what CLASSIC rendered before this story
    And none of them holds "researched", "Background:" or "work.operator"

  Scenario: a project with discovery off is given no discovery prose at all
    When NONE is rendered
    Then its refine command holds no sentence about the example map, the operator's profile or the operator's role

  Scenario: this checkout, which has not turned the switch on, does not change
    When "aof work update --dry-run --json" runs in this checkout
    Then it plans no change to any rendered command, agent or installed template

  Scenario: turning the switch on is one update away
    Given CLASSIC, rendered
    When "aof work init-config --operator-aware on" runs, then "aof work update"
    Then its refine command now holds the operator-aware beat
    And turning it off and updating again restores CLASSIC's render byte for byte

  Scenario: the switch on installs the template variants that teach the new forms
    When ON's installed ".aof/templates/work/story/EXAMPLES.md" is parsed
    Then the map reports no malformed line
    And its questions include one "domain", one "policy" and one "technical", and none is "business"
    And its examples include one of each provenance: "proposed", "confirmed", "stated" and "researched"
    And its comment says a question that cannot be placed is "domain", and that only "answered" closes a "policy" question
    And it is at most 50 lines

  Scenario: the research template variant shows a finding, and a copy of it cites nothing
    When ON's installed ".aof/templates/work/milestone/RESEARCH.md" is read
    Then it shows a finding as a "## F<n> · " heading with a "- **Finding:**" line and a "- **Source:**" line
    And reading it through the finding reader answers no finding
    And its specimen, taken out of its comment, reads as one sourced finding

  Scenario: with the switch off, the default templates are installed, unchanged
    When CLASSIC's installed "EXAMPLES.md" and "RESEARCH.md" templates are read
    Then each is byte-for-byte the default template

  Scenario: a record doc with domains still reads as a work item
    Given a fixture milestone whose "SPEC.md" frontmatter holds "domains: [tenancy-law, property-management]"
    When "aof work find" and "aof work validate" run over it
    Then the item resolves with its status and title
    And validation reports nothing for the key

  Scenario: the guide says who decides what, and that it is a choice
    When the discovery section of "wiki/acceptance-criteria.md" is read
    Then it says operator-aware discovery is off unless a project turns on "work.examples.operatorAware"
    And it says that with it on a fact about the world is researched first and closed by a finding that names its source
    And it says a decision goes to a person, and the build waits for the answer
    And it says the operator's profile decides how a fact is handled, and names "work.operator"
    And it still restates no line of the map's grammar

  Scenario: the practice's README says what it ships and what turns it on
    When "packages/specification-by-example/README.md" is read
    Then it names the operator-aware fragments and template variants, and the two keys that turn them on

  Scenario: FF-19204 · off renders none of it
    When "test/arch/examples/acd-examples-off-is-today.test.mjs" runs
    Then it fails unless CLASSIC's rendered refine command, its three agents (for Claude and for Codex) and its two installed templates equal what the same project renders from a bundle with the practice's operator-aware members removed
    And it fails unless the same holds with "operatorAware: false"

  Scenario Outline: FF-19204 · each planted leak turns the control red
    Given <planted>
    When the FF-19204 cases run
    Then the control fails and names the artefact that differs

    Examples:
      | planted                                                                       |
      | an operator-aware fragment whose only key is "work.examples.enabled"          |
      | a sentence of the operator-aware beat written into core's refine source       |
      | a template variant installed without asking the switch                        |
      | a slot that leaves a marker line behind when nothing fills it                 |
