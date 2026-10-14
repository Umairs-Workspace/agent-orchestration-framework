Feature: Operator auto-memory source — an opt-in, read-only adapter beside repository lessons
  159/01 binds its four task features (00_opt-in-local-source, 01_map-procedural-entries,
  02_hold-the-kind-policy, 03_recall-and-rebuild) to the REAL CLI. Each scenario writes a synthetic
  Claude home (CLAUDE_CONFIG_DIR) and a temp work stream under an isolated AOF_GLOBAL_HOME, runs
  `aof work memory ...`, and reads the index the backend wrote. This runner has no Examples support,
  so every Scenario Outline row of the task features is expanded here into its own scenario; the
  parser and error edge tables are also held by packages/knowledge/test/claude-auto-memory.suite.mjs.
  The two failure scenarios that need an injected read failure run the knowledge indexer in process,
  because a CLI child cannot be made to fail a read portably. Graph extraction is never started: every
  CLI run gets a PATH holding only node's own directory. The two @manual scenarios are the verifier's.

  Rule: R1 · The operator opts in; the absent setting preserves today's index

  Scenario: E1 · an absent sources setting preserves the existing corpus
    Given a workspace with existing lesson, ADR and imported records
    And its selected Claude project memory contains 70 eligible entries
    And memory.sources is absent
    When I ingest the whole stream with the local backend
    Then the ordered records equal the baseline with no auto-memory source
    And the existing index version is unchanged

  Scenario: E2 · opt-in includes this project's local entries
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the selected Claude project has "feedback.md" of type "feedback" and "project.md" of type "project"
    When I run "aof work memory ingest --all --json"
    Then the result includes one operator lesson from each file beside the existing work records

  Scenario: E3 · selecting a source does not enable a disabled backend
    Given memory.sources is ["claude-auto-memory"] and the backend is "none"
    And the selected Claude project has 2 eligible entries
    When I run "aof work memory ingest --all --json"
    Then the backend reports its existing no-op result
    And no memory index is created

  Scenario: both indexing backends share the source selection · local []
    Given a workspace with existing lesson, ADR and imported records
    And a workspace with backend "local" and memory.sources []
    And the selected Claude project has 2 eligible entries
    When I ingest the whole stream
    Then exactly 0 operator lessons are present
    And all baseline work records remain in their original relative order

  Scenario: both indexing backends share the source selection · graphify absent
    Given a workspace with existing lesson, ADR and imported records
    And a workspace with backend "graphify" and memory.sources absent
    And the selected Claude project has 2 eligible entries
    When I ingest the whole stream
    Then exactly 0 operator lessons are present
    And all baseline work records remain in their original relative order

  Scenario: both indexing backends share the source selection · graphify []
    Given a workspace with existing lesson, ADR and imported records
    And a workspace with backend "graphify" and memory.sources []
    And the selected Claude project has 2 eligible entries
    When I ingest the whole stream
    Then exactly 0 operator lessons are present
    And all baseline work records remain in their original relative order

  Scenario: both indexing backends share the source selection · graphify claude-auto-memory
    Given a workspace with existing lesson, ADR and imported records
    And a workspace with backend "graphify" and memory.sources ["claude-auto-memory"]
    And the selected Claude project has 2 eligible entries
    When I ingest the whole stream
    Then exactly 2 operator lessons are present
    And all baseline work records remain in their original relative order

  Scenario: invalid source settings are rejected as configuration errors · a bare string
    Given memory.sources is "claude-auto-memory"
    When AOF validates the workspace configuration
    Then validation rejects memory.sources
    And no ingest is performed

  Scenario: invalid source settings are rejected as configuration errors · an unknown source
    Given memory.sources is ["unknown-memory"]
    When AOF validates the workspace configuration
    Then validation rejects memory.sources
    And no ingest is performed

  Scenario: invalid source settings are rejected as configuration errors · a duplicate
    Given memory.sources is ["claude-auto-memory", "claude-auto-memory"]
    When AOF validates the workspace configuration
    Then validation rejects memory.sources
    And no ingest is performed

  Scenario: invalid source settings are rejected as configuration errors · a null member
    Given memory.sources is [null]
    When AOF validates the workspace configuration
    Then validation rejects memory.sources
    And no ingest is performed

  Scenario: the selected project and Claude config override determine discovery
    Given the workspace root is project A and the command runs from a subdirectory of A
    And CLAUDE_CONFIG_DIR points to a synthetic Claude home
    And that home has one eligible entry for A and a different eligible entry for project B
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    When I ingest the whole stream
    Then only A's entry is added
    And its source cites the file in the selected synthetic Claude home

  Scenario: a node with no selected auto-memory directory still indexes its work
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the selected project's auto-memory directory does not exist on this node
    When I ingest the whole stream
    Then the baseline work records are indexed successfully
    And no operator lesson is fabricated

  Rule: R2 · Only feedback and project entries become operator-owned lessons

  Scenario: E4 · feedback retains the reason and the application instruction
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "worktree-node-modules-junction-destroys-source.md" is a "feedback" entry named "Avoid junction cleanup" described "Keep source intact" with body "Why: recursive cleanup crosses the link // How to apply: unlink first"
    When I ingest and recall "unlink first" as JSON
    Then a lesson has owner "operator" and id "worktree-node-modules-junction-destroys-source.md"
    And its item and itemSlug are "operator:claude-auto-memory"
    And its title is "Avoid junction cleanup" and summary is "Keep source intact"
    And its text contains both complete body instructions
    And its source is the entry's absolute path followed by ":1"

  Scenario: E5 · project context uses the existing lesson layer
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "aof-acd-project.md" is a "project" entry named "AOF is a CLI" described "What AOF is" with body "AOF is a CLI tool for assistant assets."
    When I ingest and inspect memory status as JSON
    Then the entry is an operator-owned lesson
    And the lesson is counted in the procedural layer
    And no new record type or layer field is added

  Scenario: E6 · reference entries and the memory index are excluded
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "ref.md" is a "reference" entry named "A pointer" described "Where to look" with body "See the board."
    And the memory index "MEMORY.md" has no frontmatter
    When I ingest the whole stream
    Then neither file produces a lesson

  Scenario: only the measured nested type admits a source entry · metadata.type user
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "t.md" is a "user" entry named "T" described "D" with body "B"
    When I ingest the whole stream
    Then that entry contributes 0 lessons

  Scenario: only the measured nested type admits a source entry · metadata.type unsupported
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "t.md" is a "invented" entry named "T" described "D" with body "B"
    When I ingest the whole stream
    Then that entry contributes 0 lessons

  Scenario: only the measured nested type admits a source entry · top-level type without metadata.type
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "t.md" has a top-level type feedback and no metadata.type
    When I ingest the whole stream
    Then that entry contributes 0 lessons

  Scenario: only the measured nested type admits a source entry · nested feedback with a top-level reference
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "t.md" has nested type feedback and a top-level type reference
    When I ingest the whole stream
    Then that entry contributes 1 lessons

  Scenario: only the measured nested type admits a source entry · no type
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "t.md" has no type
    When I ingest the whole stream
    Then that entry contributes 0 lessons

  Scenario: measured scalar and newline forms are readable · LF plain-quoted
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And an enabled feedback entry uses "LF" newlines and no BOM
    And its description scalar is "Reason: keep the source"
    When I ingest the whole stream
    Then its summary is "Reason: keep the source"

  Scenario: measured scalar and newline forms are readable · CRLF BOM single-quoted
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And an enabled feedback entry uses "CRLF" newlines and a UTF-8 BOM
    And its description scalar is 'Reason: keep the source'
    When I ingest the whole stream
    Then its summary is "Reason: keep the source"

  Scenario: measured scalar and newline forms are readable · LF plain
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And an enabled feedback entry uses "LF" newlines and no BOM
    And its description scalar is Reason: keep the source
    When I ingest the whole stream
    Then its summary is "Reason: keep the source"

  Scenario: missing display metadata uses the filename and body
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "remember.md" has metadata.type feedback with name and description absent
    And the first nonblank body line is "Remember to check the result"
    When I ingest the whole stream
    Then the lesson title is "remember.md"
    And its summary is "Remember to check the result"

  Scenario: bad entries produce a diagnosis without losing valid siblings · unterminated frontmatter
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "good.md" is a "project" entry named "Good" described "Fine" with body "Kept."
    And "bad.md" has an unterminated frontmatter block
    When I ingest the whole stream in process
    Then "good.md" contributes one lesson and "bad.md" contributes none
    And a diagnostic identifies "bad.md" and the failure category "unterminated-frontmatter" without its body

  Scenario: bad entries produce a diagnosis without losing valid siblings · duplicate metadata.type
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "good.md" is a "project" entry named "Good" described "Fine" with body "Kept."
    And "bad.md" has a duplicate metadata.type key
    When I ingest the whole stream in process
    Then "good.md" contributes one lesson and "bad.md" contributes none
    And a diagnostic identifies "bad.md" and the failure category "duplicate-key" without its body

  Scenario: bad entries produce a diagnosis without losing valid siblings · unterminated quoted description
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "good.md" is a "project" entry named "Good" described "Fine" with body "Kept."
    And "bad.md" has an unterminated quoted description
    When I ingest the whole stream in process
    Then "good.md" contributes one lesson and "bad.md" contributes none
    And a diagnostic identifies "bad.md" and the failure category "malformed-value" without its body

  Scenario: bad entries produce a diagnosis without losing valid siblings · non-string metadata.type
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "good.md" is a "project" entry named "Good" described "Fine" with body "Kept."
    And "bad.md" has a non-string metadata.type value
    When I ingest the whole stream in process
    Then "good.md" contributes one lesson and "bad.md" contributes none
    And a diagnostic identifies "bad.md" and the failure category "malformed-value" without its body

  Scenario: bad entries produce a diagnosis without losing valid siblings · blank feedback entry
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "good.md" is a "project" entry named "Good" described "Fine" with body "Kept."
    And "bad.md" has feedback type but blank name, description and body
    When I ingest the whole stream in process
    Then "good.md" contributes one lesson and "bad.md" contributes none
    And a diagnostic identifies "bad.md" and the failure category "unusable-entry" without its body

  Scenario: bad entries produce a diagnosis without losing valid siblings · injected permission-denied read
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "good.md" is a "project" entry named "Good" described "Fine" with body "Kept."
    And "bad.md" has an injected permission-denied read failure
    When I ingest the whole stream in process
    Then "good.md" contributes one lesson and "bad.md" contributes none
    And a diagnostic identifies "bad.md" and the failure category "unreadable-entry" without its body

  Scenario: an unreadable memory directory is visible without discarding work lessons
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the source is enabled and reading its directory returns permission denied
    When I ingest the whole stream in process
    Then the baseline work records remain available
    And a diagnostic identifies the auto-memory source as unreadable

  Rule: R3 · Imported lessons have an explicit meaning in the held kind vocabulary

  Scenario: E7 · feedback uses the operator-approved near-miss mapping
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "junction.md" is a "feedback" entry named "Junction reminder" described "Unlink first" with body "Why: junction links cross."
    When I ingest and recall "junction" with kind "near-miss" and owner "operator"
    Then the lesson is returned with kind "near-miss" and tags ["feedback"]
    And its area, stage and status are empty strings

  Scenario: E8 · project facts use the same fixed mapping
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "aof-cli.md" is a "project" entry named "AOF CLI context" described "AOF is a CLI" with body "The AOF CLI renders assets."
    When I ingest and recall "AOF CLI" with kind "near-miss" and owner "operator"
    Then the lesson is returned with kind "near-miss" and tags ["project"]
    And its area, stage and status are empty strings

  Scenario: source prose and unrelated metadata cannot reclassify the lesson · feedback mistake
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "x.md" is a "feedback" entry whose prose calls the event "mistake" and whose unknown metadata declares kind "blocker", owner "developer" and stage "verify"
    When I ingest and recall "x.md" with kind "near-miss" and owner "operator"
    Then its kind remains "near-miss", owner remains "operator" and stage remains empty
    And its tags are ["feedback"]

  Scenario: source prose and unrelated metadata cannot reclassify the lesson · project misunderstanding
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "x.md" is a "project" entry whose prose calls the event "misunderstanding" and whose unknown metadata declares kind "blocker", owner "developer" and stage "verify"
    When I ingest and recall "x.md" with kind "near-miss" and owner "operator"
    Then its kind remains "near-miss", owner remains "operator" and stage remains empty
    And its tags are ["project"]

  Scenario: existing hard filters still separate operator and work-item lessons
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the memory entry "junction.md" is a "feedback" entry named "Junction reminder" described "Unlink first" with body "Why: junction links cross."
    When I ingest the whole stream
    Then recalling "junction" with owner "operator" returns only the operator lesson
    And recalling "junction" with item "45" returns only the work-item lesson
    And recalling "junction" with kind "mistake" and owner "operator" returns no operator lesson

  Scenario: status reports blank source metadata honestly
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the selected Claude project has 2 eligible entries
    When I ingest and inspect memory status against the source-less baseline
    Then lesson and procedural counts each increase by 2
    And the blank-area and blank-stage lesson counts each increase by 2
    And blank-kind, non-enum-kind and blank-owner counts do not increase

  Rule: R4 · Recall preserves separate sources and reflects the next full rebuild

  Scenario: E9 · a known duplicate remains visible beside the repository records
    Given an isolated corpus with the junction auto-memory lesson and matching work records
    And the work records have identities "45/R13", "68/R10" and "72/ADR-007"
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    When I ingest and recall "junction" without an item filter and with limit 20
    Then all four distinct records appear
    And the operator record cites its absolute source while the work records retain their own sources

  Scenario: E10 · deleted source entries disappear on rebuild
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And whole-stream ingest indexed "keep.md" and "remove.md" from the enabled source
    When "remove.md" is deleted and I ingest the whole stream again
    Then "remove.md" has no record and "keep.md" still has one
    And existing work records remain

  Scenario: E11 · disabling and rebuilding removes only adapter contributions
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And whole-stream ingest indexed eligible operator entries beside baseline work records
    When memory.sources becomes [] and I ingest the whole stream again
    Then no operator auto-memory record remains
    And the ordered baseline records equal the source-disabled baseline

  Scenario: rebuild follows edits without accumulating stale records · feedback edited
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And "entry.md" was indexed as a feedback reminder containing "old instruction"
    When its source changes to feedback with body "new instruction" and I ingest again
    Then the source contributes 1 records
    And the same id cites the updated text without old instruction

  Scenario: rebuild follows edits without accumulating stale records · retyped to project
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And "entry.md" was indexed as a feedback reminder containing "old instruction"
    When its source changes to project with body "new instruction" and I ingest again
    Then the source contributes 1 records
    And the same id has tags ["project"] and kind "near-miss"

  Scenario: rebuild follows edits without accumulating stale records · retyped to reference
    Given memory.sources is ["claude-auto-memory"] and the backend is "local"
    And "entry.md" was indexed as a feedback reminder containing "old instruction"
    When its source changes to reference with body "old instruction" and I ingest again
    Then the source contributes 0 records
    And no operator record for "entry.md" remains

  Scenario: a scoped rebuild preserves the existing work-item-only behavior
    Given a workspace with existing lesson, ADR and imported records
    And memory.sources is ["claude-auto-memory"] and the backend is "local"
    And the selected Claude project has 2 eligible entries
    When I run "aof work memory ingest --item 45 --json"
    Then only work-item 45 records are indexed
    And no operator auto-memory record or work-item 68 record is included
