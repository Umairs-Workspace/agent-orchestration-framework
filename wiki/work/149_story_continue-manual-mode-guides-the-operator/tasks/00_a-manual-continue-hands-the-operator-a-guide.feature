@executable @docs @work @work-stream
Feature: a manual continue hands the operator a guide instead of a build

  WHY. `--solo` and `--orchestrated` decide which agents do the work. `--manual` is a third
  answer: the operator does. The session then builds nothing. It reads the story as the story
  lane's step 1 reads it, mints the run so the story is started, runs the story's tests once,
  prints a guide in the terminal, closes its run and hands the operator to `aof:review`.

  The behaviour lives in `packages/core/assets/commands/continue.md`, in one marked region
  `<manual_mode>` inside `<process>`, so a renumbered step cannot move these controls. Its rows
  land beside the 140/00 continue-mode rows in `test/loop/autonomous-shell-out-prompt.test.mjs`.

  Rule: R1 · A manual continue starts the story and hands the operator a guide, building nothing

    Scenario: E1 · a manual continue on a red story spawns no builder and prints the guide
      When the `<manual_mode>` region of `packages/core/assets/commands/continue.md` is read
      Then it says no `aof-developer` is spawned, in solo and in orchestrated mode alike
      And it says no file outside the item's own folder is written
      And it says the session prints the guide and stops

    Scenario: E2 · the guide names everything the operator needs before touching code
      When the `<manual_mode>` region is read
      Then it names the guide's parts in this order:
        | part                                                                                           |
        | the scenarios still red, by name                                                               |
        | the user story                                                                                 |
        | each task file with its scenario names, read from `aof work tasks <ref> --json`                |
        | every `reads:` entry and every `files:` entry, each with one line on why it matters            |
        | the test files among `files:`, and the command `aof test --scope impacted --story <ref>`       |
        | the build plan's mechanism and known traps, when the story has a `PLAN.md`                     |
        | an order to take the tasks in, with the reason for it                                          |

    Scenario: E3 · a manual continue starts the story through its run
      When the `<manual_mode>` region is read
      Then it says the run is minted with `aof work run-start <ref> --json` before the guide is printed
      And it says the run is closed with `aof work run-complete <ref> --outcome done` after the guide is printed
      And it says the session writes no status move of its own

    Scenario: E4 · a re-run prints the guide again, headed by what is still red
      When the `<manual_mode>` region is read
      Then it says every manual run runs `aof test --scope impacted --story <ref>` once, before the guide
      And it says the guide is printed in the terminal only, and no guide file is written to the story folder
      And it says that when every scenario is green the guide says so and names `aof:review <ref>` as the next step

    Scenario Outline: the manual region holds each rule a manual continue needs
      When the `<manual_mode>` region is read
      Then it says <rule>

      Examples:
        | rule                                                                                                                      |
        | a story whose `reads:` is absent, or whose tasks are thin or untagged, halts and sends the operator to `aof:refine <ref>` |
        | the story is read exactly as the story lane's step 1 reads it, and no wider                                               |
        | no gate ladder is walked and no reviewer is spawned                                                                       |
        | its hand-back is `guided: <ref> is yours to build` and names `aof:review <ref>` next, never `aof:verify`                  |

    Scenario: the output section names the manual outcome
      When the `<output>` section of `continue.md` is read
      Then it lists the outcome `guided: <ref> is yours to build`, whose next step is `aof:review <ref>`

    Scenario: the argument hint and every render carry --manual
      When the bundle member `continue` is loaded
      Then its argument hint is `<item ref, or a NN/MM-PP story span> [--solo | --orchestrated | --manual] [--thinking <level>]`
      And `.claude/commands/aof/continue.md`, `.codex/skills/aof-continue/SKILL.md` and `.opencode/commands/aof/continue.md` on disk each carry `<manual_mode>`
      And `aof work update --dry-run --json` at the repository root reports each of the three `skip`
