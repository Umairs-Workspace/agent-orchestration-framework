Feature: R2 · Only feedback and project entries become operator-owned lessons

  @executable @cli @adapter @memory
  Scenario: E4 · Feedback retains the reason and the application instruction
    Given the enabled source contains "worktree-node-modules-junction-destroys-source.md"
    And its frontmatter has name "Avoid junction cleanup" and description "Keep source intact"
    And metadata.type is "feedback"
    And its body contains "Why: recursive cleanup crosses the link" and "How to apply: unlink first"
    When I ingest and recall "unlink first" as JSON
    Then a lesson has owner "operator" and id "worktree-node-modules-junction-destroys-source.md"
    And its item and itemSlug are "operator:claude-auto-memory"
    And its title is "Avoid junction cleanup" and summary is "Keep source intact"
    And its text contains both complete body instructions
    And its source is the entry's absolute path followed by ":1"

  @executable @cli @adapter @memory
  Scenario: E5 · Project context uses the existing lesson layer
    Given the enabled source contains "aof-acd-project.md" with metadata.type "project"
    And its body describes AOF as a CLI
    When I ingest and inspect memory status as JSON
    Then the entry is an operator-owned lesson
    And the lesson is counted in the procedural layer
    And no new record type or layer field is added

  @executable @cli @adapter @memory
  Scenario: E6 · Reference entries and the memory index are excluded
    Given the enabled source contains a reference entry and MEMORY.md without frontmatter
    When I ingest the whole stream
    Then neither file produces a lesson

  @executable @cli @adapter @memory
  Scenario Outline: Only the measured nested type admits a source entry
    Given the enabled source contains a valid Markdown entry with <type_shape>
    When I ingest the whole stream
    Then that entry contributes <count> lessons

    Examples:
      | type_shape                                              | count |
      | metadata.type user                                      | 0     |
      | metadata.type unsupported                               | 0     |
      | top-level type feedback without metadata.type            | 0     |
      | metadata.type feedback and top-level type reference      | 1     |
      | no type                                                 | 0     |

  @executable @cli @adapter @memory
  Scenario Outline: Measured scalar and newline forms are readable
    Given an enabled feedback entry uses "<newlines>" newlines and <bom>
    And its description scalar is <description>
    When I ingest the whole stream
    Then its summary is "Reason: keep the source"

    Examples:
      | newlines | bom            | description                  |
      | LF       | no BOM         | "Reason: keep the source"    |
      | CRLF     | a UTF-8 BOM    | 'Reason: keep the source'     |
      | LF       | no BOM         | Reason: keep the source      |

  @executable @cli @adapter @memory
  Scenario: Missing display metadata uses the filename and body
    Given the enabled source contains "remember.md" with metadata.type "feedback"
    And name and description are absent
    And the first nonblank body line is "Remember to check the result"
    When I ingest the whole stream
    Then the lesson title is "remember.md"
    And its summary is "Remember to check the result"

  @executable @cli @adapter @memory
  Scenario Outline: Bad entries produce a diagnosis without losing valid siblings
    Given the enabled source contains "good.md" with metadata.type "project"
    And "bad.md" has <problem>
    When I ingest the whole stream
    Then "good.md" contributes one lesson and "bad.md" contributes none
    And a diagnostic identifies "bad.md" and the failure category without its body

    Examples:
      | problem                                                |
      | an unterminated frontmatter block                       |
      | a duplicate metadata.type key                           |
      | an unterminated quoted description                      |
      | a non-string metadata.type value                        |
      | feedback type but blank name, description and body      |
      | an injected permission-denied read failure               |

  @executable @cli @adapter @memory
  Scenario: An unreadable memory directory is visible without discarding work lessons
    Given the source is enabled and reading its directory returns permission denied
    When I ingest the whole stream
    Then the baseline work records remain available
    And a diagnostic identifies the auto-memory source as unreadable
