@executable @docs @work @planning
Feature: A driven --autonomous cascade asks its business questions one after another, and every rendered copy of refine is what the source renders

  WHY. The --autonomous block asks every open business question at its one end review "in batches
  of four". In a driven session a batch is one ask with four tokens, which anchors none of them
  (ADR-001 §2). So a driven cascade asks one question per call, each its own ask and wait
  (ADR-002 §2). The prose lands in the bundle source; the three rendered copies and the manifest
  hash follow it.

  THE TEXT UNDER TEST: the --autonomous block of "packages/core/assets/commands/refine.md", from
  its bold lead to the end of its bullets.

  Rule: R1 · A driven refine asks each business question as its own message

    Scenario: E2 · a driven cascade asks its open business questions one after another
      Given the --autonomous block of the source "packages/core/assets/commands/refine.md"
      When its business-question rule is read
      Then it says that in a session whose environment carries "AOF_RUN_ID" each call carries one question
      And it says each such question is its own ask and its own wait
      And it still says an interactive cascade asks in batches of four
      And it still says a question the person does not answer leaves its story at the Contract gate while the other stories go on

  Rule: The bundle ships the prose

    Scenario Outline: every rendered copy of refine is exactly what the source renders
      Given the manifest "packages/core/assets/manifest.json" holds the hash of the changed source
      When "aof work update --dry-run --json" is run
      Then it answers "skip" for "<copy>"

      Examples:
        | copy                               |
        | .claude/commands/aof/refine.md     |
        | .codex/skills/aof-refine/SKILL.md  |
        | .opencode/commands/aof/refine.md   |
