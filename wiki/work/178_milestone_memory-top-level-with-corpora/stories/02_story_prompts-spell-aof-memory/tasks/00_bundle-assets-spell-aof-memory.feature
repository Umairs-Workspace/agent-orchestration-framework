Feature: Every bundle asset and the runtime folders rendered from it spell aof memory

  WHY. While the prompts spell `aof work memory`, every agent run in Claude Code, Codex and Cowork
  calls the alias, and the new command is the one nobody calls (178/ADR-003). The assets are the
  source of truth, and the runtime folders are generated output (AGENTS.md), so the change is made
  in `packages/*/assets/` and re-rendered. A guard keeps the old spelling from coming back.

  Rule: R1 · Every shipped asset spells aof memory

    @executable @docs @assets @memory
    Scenario: E1 · refine's architect recall spells the new command
      When "packages/core/assets/commands/refine.md" is read
      Then its architect recall reads "aof memory recall \"<the decision in a few words>\" --area architecture --block"
      And the codex workflow variant spells "aof memory" wherever it spelled "aof work memory"

    @executable @docs @assets @memory
    Scenario: E2 · no asset spells the retired path
      When every file under "packages/*/assets/" is scanned for "aof", "work" and "memory" separated only by whitespace
      Then no file matches
      And the count of "aof memory" occurrences across the assets is at least 53

    @executable @docs @assets @memory
    Scenario Outline: E3 · FF-17802 refuses a planted old spelling, however it is wrapped
      Given a planted asset "packages/core/assets/commands/planted.md" whose line 4 holds "<planted>"
      When the FF-17802 control runs over the assets
      Then it fails naming "packages/core/assets/commands/planted.md" and line 4

      Examples:
        | example | planted                                |
        | E3      | aof work\n  memory recall "x" --block   |
        |         | aof work memory ingest                 |
        |         | `aof  work  memory status`             |

    @executable @docs @assets @memory
    Scenario: the guard is not vacuous
      When the FF-17802 control runs
      Then it reports having scanned at least 15 asset files that spell "aof memory"

  Rule: R2 · The generated folders are re-rendered, never hand-edited

    @executable @cli @assets @memory
    Scenario: E4 · the rendered runtime folders carry the new spelling
      Given "aof work update" has run in this repository
      Then ".claude/commands/aof/refine.md", ".agents/skills/aof-refine/procedure.md" and ".opencode/commands/aof/refine.md" each hold "aof memory recall"
      And ".codex/aof/workflows/workflow-contract.md" and ".aof/loops/retrospective-memory-ingest.md" hold no "aof work memory"

    @executable @cli @assets @memory
    Scenario: E5 · a second render has nothing left to change
      Given "aof work update" has run in this repository
      When "aof work update --dry-run" runs
      Then it reports no file to write
      And every rendered file's hash in ".aof/aof.lock.json" matches the file on disk

  Rule: R3 · The planner skills change the spelling only

    @executable @docs @planning @memory
    Scenario: E6 · Hyperagent's skills rename the command and keep the substitution
      When "packages/integration-hyperagent/assets/skills/aof-refine/SKILL.md" is read
      Then its "CLI steps are replaced" list maps "aof memory recall" to "search the repository (code search scoped to `<work.dir>`)"
      And the substitution text after the arrow is byte-identical to before this story
      And no Hyperagent skill names an MCP memory tool

    @executable @cli @planning @memory
    Scenario: E7 · the Cowork planning skill is rendered with the new spelling
      Given a temp project under an isolated "AOF_GLOBAL_HOME"
      When "aof planning init --runtime cowork --force" renders the planning skill
      Then the rendered shatter skill holds "aof memory recall"
      And holds no "aof work memory"
