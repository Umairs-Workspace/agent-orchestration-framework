@executable @docs @assets @scaffold
Feature: The add commands take an --in-stream switch that skips the backlog

  WHY. Under `work.intake: "backlog"` every `aof:add-*` capture lands un-numbered in the backlog,
  and work meant for now needs a second command, `aof:promote <slug>`, before it can be refined.
  The only other way in is flipping `work.intake` for the whole project. `--in-stream` sends one
  capture straight on: the prompt scaffolds into the backlog as always, then runs the one verb that
  mints (`aof work promote`, 127/ADR-003 §1) with no position, so the item lands at the tail. The
  bundle sources are `packages/core/assets/commands/`. Their rendered copies must match a fresh
  render.

  Rule: R1 · `--in-stream` sends one capture straight into the stream, at the tail

    Scenario: E1 · add-story tells the agent to promote a standalone story straight away when --in-stream is given
      When the bundle source "packages/core/assets/commands/add-story.md" is read
      Then its argument hint lists "--in-stream"
      And its intake step says that with "--in-stream" it runs "aof work promote <slug> --json" straight after the scaffold, whatever "work.intake" says
      And its output names the minted ref and "aof:refine <NN>" as the next step

    Scenario: E2 · without the switch, the backlog intake still leaves the capture in the backlog
      When the bundle source "packages/core/assets/commands/add-story.md" is read
      Then its intake step still says that under "work.intake: \"backlog\"" a capture without "--in-stream" stays in the backlog
      And its output still names "aof:promote <slug>" as the next step for that capture

    Scenario: E3 · the switch appends at the tail and names no position
      When the bundle source "packages/core/assets/commands/add-milestone.md" is read
      Then the promote it runs for "--in-stream" carries no "--at"
      And the prompt says the item lands at the tail

    Scenario Outline: every top-level add prompt carries the switch
      When the bundle source "<prompt>" is read
      Then its argument hint lists "--in-stream"
      And its intake step says that with "--in-stream" it runs "aof work promote <slug> --json" straight after the scaffold, whatever "work.intake" says
      And it says "--in-stream" is removed from the arguments before the slug and title are derived

      Examples:
        | prompt                                       |
        | packages/core/assets/commands/add-milestone.md |
        | packages/core/assets/commands/add-story.md     |
        | packages/core/assets/commands/add-chore.md     |
        | packages/core/assets/commands/add-spike.md     |
        | packages/core/assets/commands/add-uat.md       |

    Scenario: the task prompt is not a driver and gains no switch
      When the bundle source "packages/core/assets/commands/add-task.md" is read
      Then it does not mention "--in-stream"

  Rule: R2 · The switch never mints and never reaches around a promote refusal

    Scenario: E4 · a promote refusal after --in-stream is reported and the item stays in the backlog
      When the bundle source "packages/core/assets/commands/add-chore.md" is read
      Then its intake step says a promote refusal after "--in-stream" is reported as a stop
      And that the item stays where it was scaffolded, in the backlog

    Scenario: no add prompt works out a number for the switch
      When the arch-test "FF-12703 (acd-one-mint)" leg (e) runs over "packages/core/assets/commands/add-*.md"
      Then it passes

    Scenario Outline: each rendered prompt matches a fresh render
      When "aof work update --dry-run --json" is run from the repository root
      Then "<copy>" is reported as "skip"

      Examples:
        | copy                                     |
        | .claude/commands/aof/add-milestone.md    |
        | .claude/commands/aof/add-story.md        |
        | .claude/commands/aof/add-chore.md        |
        | .claude/commands/aof/add-spike.md        |
        | .claude/commands/aof/add-uat.md          |
        | .codex/skills/aof-add-milestone/SKILL.md |
        | .codex/skills/aof-add-story/SKILL.md     |
        | .codex/skills/aof-add-chore/SKILL.md     |
        | .codex/skills/aof-add-spike/SKILL.md     |
        | .codex/skills/aof-add-uat/SKILL.md       |
        | .opencode/commands/aof/add-milestone.md  |
        | .opencode/commands/aof/add-story.md      |
        | .opencode/commands/aof/add-chore.md      |
        | .opencode/commands/aof/add-spike.md      |
        | .opencode/commands/aof/add-uat.md        |
