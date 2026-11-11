Feature: The docs spell aof memory, history keeps the alias, and the learning-edge control reads the new spelling

  WHY. The README and the config schema are what an operator reads to find memory's commands, so
  they spell the canonical path. Story 125's README control resolves every `aof …` they spell
  against the route table, which `aof memory` joins in 178/01. Tests of the alias and the work
  stream's record of what happened keep the old spelling (178/ADR-003). The learning-edge control
  parses the prompts' memory invocations by regex, so it must read the new spelling or go vacuous.

  Rule: R4 · The docs spell aof memory, and tests and history keep the alias

    @executable @docs @assets @memory
    Scenario: E8 · the README's memory commands spell aof memory and resolve
      When "README.md" is read
      Then its memory block holds "aof memory status", "aof memory reindex" and "aof memory recall \"pin line endings\""
      And its command reference line reads "aof memory <verb> [args] [--json]" with the verbs recall, record-recall, recurrence, ingest, reindex and status
      And story 125's control resolves every "aof memory" line it spells through the route table

    @executable @docs @assets @memory
    Scenario: the README's milestone table keeps milestone 05's delivery as it was
      When "README.md"'s delivered-milestones table is read
      Then the row for "05 | Work Memory" still names "aof work memory"

    @executable @docs @assets @memory
    Scenario: E9 · the schema and the knowledge README name the canonical command
      Then "schemas/aof.schema.json"'s "memory.backend" description names "the `aof memory` verbs"
      And "packages/knowledge/README.md" names its commands as the five graph commands, "memory", its alias "work:memory", and "import:milestone"

    @executable @docs @assets @memory
    Scenario: E10 · tests of the alias and the work stream keep the old spelling
      Then "test/integration/features/work-memory.feature" still runs "work memory status"
      And no file under "wiki/work/" was rewritten by this story's migration

    @executable @docs @assets @memory
    Scenario: E11 · the learning-edge control reads the new spelling and stays non-vacuous
      When the learning-edge control parses "packages/core/assets/commands/refine.md"
      Then it finds at least one "aof memory recall" invocation carrying "--block"
      And every roster entry carries at least one "aof memory recall"
      And a planted body holding only "aof work memory recall \"seam\" --block" yields no invocation
