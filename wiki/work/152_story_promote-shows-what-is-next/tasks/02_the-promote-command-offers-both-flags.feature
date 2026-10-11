@cli @docs @work @work-stream
Feature: /aof:promote offers --show-candidates and --next-item

  WHY. The operator works through `/aof:promote`, not the bare CLI. A flag the wrapper never
  mentions is one an agent following the wrapper will never pass: it would go back to reading the
  backlog by hand, which is the work this story removes. The wrapper gains both modes. Each runs
  the verb on its `--json` face and reports what the verb answered. The wrapper never ranks, filters
  or picks an item itself.

  Rule: R4 · --next-item promotes the head of the candidate list, and is never combined with a slug or --show-candidates

    @executable
    Scenario: the wrapper's argument hint names the three ways to call it
      When the bundle command member "promote" is read from packages/core/assets/commands/promote.md
      Then its "argument-hint" reads "<backlog slug> [at <position P>] | --next-item [at <position P>] | --show-candidates"

    @executable
    Scenario Outline: each mode drives the verb on its machine face
      When the body of packages/core/assets/commands/promote.md is read
      Then it names the command "<command>"
      And the mode is described as "<what>"

      Examples:
        | command                                     | what                                                                               |
        | aof work promote --show-candidates --json   | reports `candidates` in order, then `waiting` with what each waits on, and writes nothing |
        | aof work promote --next-item --json         | promotes the first candidate and reports the minted ref, exactly as a named promote does   |

    @executable
    Scenario: the wrapper chooses nothing by itself
      When the body of packages/core/assets/commands/promote.md is read
      Then it tells the agent never to choose a candidate by reading the backlog or its "depends:" lines
      And it names "promote-no-candidates" as a stop to report, not a reason to search the backlog
      And the existing promote parity guard still holds: the wrapper computes no number of its own

    @executable
    Scenario: the rendered runtime copies match the asset
      When "aof work update" renders the bundle into this repository
      Then ".claude/commands/aof/promote.md", ".opencode/commands/aof/promote.md" and ".codex/skills/aof-promote/SKILL.md" carry the new argument hint and both modes
      And ".aof/aof.lock.json" records the new content hash of each copy
