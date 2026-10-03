@cli @work @design
Feature: /aof:loop-diagram draws the plan in the operator's session

  WHY. The engine's drawing step is a skill only an agent can follow, so the command the operator
  types is a bundle command: `/aof:loop-diagram <ref>`. The session runs the CLI half, stops on
  any stop it answers, follows the drawing instructions, then runs the export. Nothing is spawned,
  so there is no `claude -p` and no second session. The bundle prose names aof's verbs and never
  the generator (FF-13301 sweeps the bundle). The `execution/` place has one home, the diagram
  layout module, just as `diagrams/` does (FF-13302).

  @executable
  Scenario: the bundle ships the command beside the others
    When the bundle is rendered by "aof work update"
    Then ".claude/commands/aof/loop-diagram.md" exists
    And the bundle's command count is one more than before
    And its argument hint is "<milestone ref>"

  @executable
  Scenario: the command runs the plan, stops on a stop, and exports only after drawing
    When "packages/core/assets/commands/loop-diagram.md" is read
    Then it runs "aof diagram plan <ref> loop --json" first
    And on "loop-not-refine-first", "loop-not-refined" or "loop-not-a-milestone" it reports the message and stops
    And on "enabled: false" or "available: false" it reports where the plan was written and why nothing was drawn, then stops
    And otherwise it follows the answer's "instructions" and then runs "aof diagram export <ref> loop --json"
    And it reports the written paths

  @executable
  Scenario: the generator is still named once
    When FF-13301 sweeps the source tree and the bundle
    Then "loop-diagram.md" does not name the generator

  @executable
  Scenario: the execution folder has one home
    When FF-13302 sweeps the source tree
    Then outside the diagram layout module no module builds an "execution/" path or spells "loop-plan.json" or "loop.html"
    And a red probe that spells "execution/loop.svg" in "plan.mjs" fails it, naming the file

  @manual
  Scenario: a real milestone is drawn end to end in this repository
    Given the payload is installed and this repository runs "refine_first"
    When "/aof:loop-diagram 135" is run in a Claude Code session
    Then "wiki/work/135_milestone_key-examples-in-the-contract/execution/" holds "loop-plan.json", "loop.html", "loop.svg" and "loop.png"
    And the waves in "loop.svg" match "loop-plan.json"

  @uat
  Scenario: the operator can read the parallelism off the picture
    Given the diagram drawn for 135
    When the operator opens "loop.png"
    Then they can tell which stories build in the same wave, which were held and why, and which were already built
