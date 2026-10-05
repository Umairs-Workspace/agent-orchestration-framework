@executable @cli @work @memory
Feature: A story's retrospective is indexed and recalled under its own ref and its milestone's

  WHY. The retrospective prompt has written a story's lessons into the story's own folder since
  story 85, and 284 such lessons exist, but the index reads RETROSPECTIVE.md for top-level
  milestones only, so none of them is ever recalled. ADR-006 moves the read onto the any-item,
  subtree-scoped leg that OUTCOME.md already rides: what is on disk is read, whatever the item's
  type.

  THE FIXTURE BELOW: a temp stream holding milestone "134_milestone_discovery" with a
  RETROSPECTIVE.md of R1 to R3; its story "01_story_the-baseline-is-counted" with a RETROSPECTIVE.md
  of R1 ("a contract cited a file no branch carried") and R2; its story "02_story_the-map" with a
  RETROSPECTIVE.md of R1 ("the map is a document"); the parentless story "145_story_loop-diagram"
  with a RETROSPECTIVE.md of R1 to R3; and "150_uat_gate" with no RETROSPECTIVE.md. Records are
  built by "buildRecords(null, …)" under an isolated "AOF_GLOBAL_HOME".

  Rule: R1 · Every item's retrospective is read, whatever the item's type

    Scenario: E1 · a nested story's lessons carry the story's ref
      When the records are built
      Then two lesson records carry item "134/01", with ids "R1" and "R2"
      And the "R1" record's source is "134_milestone_discovery/stories/01_story_the-baseline-is-counted/RETROSPECTIVE.md" at the line of its heading

    Scenario: E2 · a parentless story's lessons carry its number
      When the records are built
      Then three lesson records carry item "145", with ids "R1", "R2" and "R3"

    Scenario: E3 · a milestone's own retrospective yields exactly its own lessons
      When the records are built
      Then the lesson records with item "134" are "R1", "R2" and "R3", in that order
      And each one's source is "134_milestone_discovery/RETROSPECTIVE.md"

    Scenario: E4 · an item carrying no retrospective yields no lesson
      When the records are built
      Then no lesson record carries item "150"

    Scenario: within one milestone, records keep their order: lessons, then ADRs, then deliveries
      Given milestone "134" also carries an ARCHITECTURE.md with "ADR-001" and an OUTCOME.md with one delivered capability
      When the records are built
      Then among records with item "134", every lesson precedes every ADR, and every ADR precedes every capability

  Rule: R2 · A milestone's scope reaches its stories' lessons, and a story's scope reaches only its own

    Scenario: E5 · a milestone-scoped recall returns a story's lesson
      When "recall" runs the query "contract cited a file no branch carried" with scope item "134"
      Then the records include "R1" with item "134/01"

    Scenario: E6 · a story-scoped recall returns none of its sibling's lessons
      When "recall" runs the query "contract cited a file no branch carried" with scope item "134/02"
      Then no returned record carries item "134/01"

    Scenario: E7 · a milestone-scoped rebuild reaches its stories' retrospectives
      When the records are built with only "134"
      Then lesson records carry item "134", "134/01" and "134/02"
      And no lesson record carries item "145"

  Rule: R3 · The larger pool still holds every eval pair

    Scenario: E8 · the retrieval eval holds every pair over the live corpus with story lessons indexed
      Given the record set built in memory from the repository's "wiki/work"
      And it holds at least one lesson record whose item is a nested story ref
      When the retrieval eval of FF-14801 runs every pair
      Then every pair is reported held
