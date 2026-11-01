@executable @docs @assets @work-stream
Feature: manual is its own command, and continue builds only

  WHY. `continue.md` carried 149's `<manual_mode>`, about 40 lines that no build reads. The operator
  moved it out (2026-10-31): `aof:manual <ref>` prints the same guide, and `continue` carries builds
  only (179/ARCHITECTURE ADR-001). This supersedes 149/00's E1–E4, its rule outline, its `<output>`
  row and its argument hint (ADR-001 §5). The 149 rows in
  `test/loop/autonomous-shell-out-prompt.test.mjs` follow this contract, and the 149 `.feature` is
  not edited.

  Rule: R1 · Manual is its own command, and continue builds only

    Scenario: E1 · the manual command prints 149's guide and builds nothing
      When `packages/core/assets/commands/manual.md` is read
      Then it says no `aof-developer` is spawned and no file outside the item's own folder is written
      And it says `aof test --scope impacted --story <ref>` runs once, before the guide
      And it names the guide's parts in 149/00 E2's order, from the scenarios still red to an order to take the tasks in
      And it says the run is closed with `aof work run-complete <ref> --outcome done` after the guide is printed
      And its hand-back is `guided: <ref> is yours to build`, naming `aof:review <ref>` next and never `aof:verify`

    Scenario: E2 · continue carries no operator-led mode
      When `packages/core/assets/commands/continue.md` and the `continue` section of `packages/core/assets/variants/codex/workflow.md` are read
      Then neither holds a `<manual_mode>` region
      And neither lists the outcome `guided: <ref> is yours to build`
      And the `continue` argument hint is `<item ref, or a NN/MM-PP story span> [--solo | --orchestrated] [--thinking <level>]`

    Scenario: E6 · continue names --manual nowhere
      When `packages/core/assets/commands/continue.md` and the `continue` section of `packages/core/assets/variants/codex/workflow.md` are read
      Then neither contains the text `--manual`
      And neither names `aof:manual`

    Scenario Outline: the manual command holds each rule 149's region held
      When `packages/core/assets/commands/manual.md` is read
      Then it says <rule>

      Examples:
        | rule                                                                                                                      |
        | a story whose `reads:` is absent, or whose tasks are thin or untagged, halts and sends the operator to `aof:refine <ref>` |
        | the story is read exactly as continue's story lane step 1 reads it, and no wider                                          |
        | no gate ladder is walked and no reviewer is spawned                                                                       |
        | the guide is printed in the terminal only, and no guide file is written to the story folder                               |
        | when every scenario is green the guide says so and names `aof:review <ref>` as the next step                              |
        | the session writes no status move of its own                                                                              |

    Scenario: the manual command is a bundle member on every runtime, and the renders are current
      When the bundle member `manual` is loaded
      Then it is a `command` with runtimes `claude` and `opencode`, a Codex variant section `manual`, and namespace `aof`
      And its argument hint is `<story or task ref>`
      And `.claude/commands/aof/manual.md`, `.agents/skills/aof-manual/SKILL.md` and `.opencode/commands/aof/manual.md` exist on disk
      And `aof work update --dry-run --json` at the repository root reports every `manual`, `continue` and `review` render `skip`

    Scenario: FF-17901 · continue builds only
      When `test/arch/command/acd-continue-builds-only.test.mjs` runs
      Then it fails if `continue.md` or the Codex `continue` section holds `<manual_mode>` or a `guided:` outcome

    Scenario: the docs and the review prompt name the manual command
      When `README.md`, `docs/acd.md` and `packages/core/assets/commands/review.md` are read
      Then each names `aof:manual <ref>` where it named `aof:continue <ref> --manual`
      And none contains `aof:continue <ref> --manual`
