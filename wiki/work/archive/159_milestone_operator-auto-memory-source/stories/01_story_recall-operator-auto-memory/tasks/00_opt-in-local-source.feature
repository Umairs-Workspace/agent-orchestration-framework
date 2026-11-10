Feature: R1 · The operator opts in; the absent setting preserves today's index

  @executable @cli @adapter @memory
  Scenario: E1 · An absent sources setting preserves the existing corpus
    Given a workspace with existing lesson, ADR and imported records
    And its selected Claude project memory contains 70 eligible entries
    And memory.sources is absent
    When I ingest the whole stream with the local backend
    Then the ordered records equal the baseline with no auto-memory source
    And the existing index version is unchanged

  @executable @cli @adapter @memory
  Scenario: E2 · Opt-in includes this project's local entries
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the selected Claude project has "feedback.md" of type "feedback" and "project.md" of type "project"
    When I run "aof work memory ingest --all --json"
    Then the result includes one operator lesson from each file beside the existing work records

  @executable @cli @adapter @memory
  Scenario: E3 · Selecting a source does not enable a disabled backend
    Given memory.sources is ["claude-auto-memory"] and the backend is "none"
    And two eligible auto-memory entries exist
    When I run "aof work memory ingest --all --json"
    Then the backend reports its existing no-op result
    And no memory index is created

  @executable @cli @adapter @memory
  Scenario Outline: Both indexing backends share the source selection
    Given a workspace with backend "<backend>" and memory.sources <sources>
    And its selected Claude project has two eligible entries
    And any graph extraction invocation is replaced with a local test double
    When I ingest the whole stream
    Then exactly <operator_count> operator lessons are present
    And all baseline work records remain in their original relative order

    Examples:
      | backend  | sources                | operator_count |
      | local    | []                     | 0              |
      | graphify | absent                 | 0              |
      | graphify | []                     | 0              |
      | graphify | ["claude-auto-memory"] | 2              |

  @executable @cli @adapter @memory
  Scenario Outline: Invalid source settings are rejected as configuration errors
    Given memory.sources is <sources>
    When AOF validates the workspace configuration
    Then validation rejects memory.sources
    And no ingest is performed

    Examples:
      | sources                                       |
      | "claude-auto-memory"                          |
      | ["unknown-memory"]                            |
      | ["claude-auto-memory", "claude-auto-memory"]   |
      | [null]                                        |

  @executable @cli @adapter @memory
  Scenario: The selected project and Claude config override determine discovery
    Given the workspace root is project A and the command runs from a subdirectory of A
    And CLAUDE_CONFIG_DIR points to a synthetic Claude home
    And that home has one eligible entry for A and a different eligible entry for project B
    And memory.sources is ["claude-auto-memory"]
    When I ingest the whole stream
    Then only A's entry is added
    And its source cites the file in the selected synthetic Claude home

  @executable @cli @adapter @memory
  Scenario: A node with no selected auto-memory directory still indexes its work
    Given memory.sources is ["claude-auto-memory"]
    And the selected project's auto-memory directory does not exist on this node
    When I ingest the whole stream
    Then the baseline work records are indexed successfully
    And no operator lesson is fabricated
