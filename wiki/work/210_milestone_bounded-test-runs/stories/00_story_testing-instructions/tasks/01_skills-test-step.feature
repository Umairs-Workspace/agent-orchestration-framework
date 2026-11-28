@cli @work @validate @docs
Feature: every skill that tests reads the instructions, picks suites, states why, and leaves the tree to the gate

  WHY. The old wording forbade naming suite files and said a story-scoped green does not prove the
  tree, so an agent proved the tree itself after every fix (SPEC, Objective). The new wording is
  ADR-001's five steps, written once at each skill's test step in the bundle's own sources. The
  renders and goldens follow through `aof work update` and `scripts/golden.mjs`, never by hand.

  Rule: R1 · Every skill that tests reads the project's instructions before it chooses suites

    @executable
    Scenario Outline: E1 · each rendered skill reads the instructions at its test step
      Given this repository after "aof work update"
      When I read the rendered <skill>
      Then its test step tells the agent to read the file named in "work.test.instructions" before running anything
      And it runs suites as "aof test <suite>… --reason"

      Examples:
        | skill                                  |
        | ".claude/commands/aof/continue.md"     |
        | ".claude/commands/aof/review.md"       |
        | ".claude/commands/aof/verify.md"       |
        | ".claude/commands/aof/manual.md"       |
        | ".claude/commands/aof/teach.md"        |
        | ".claude/commands/aof/repair.md"       |

    @executable
    Scenario: E2 · the Codex render carries the same test step as the Claude Code render
      Given this repository after "aof work update"
      When I read ".agents/skills/aof-continue/procedure.md"
      Then its test step tells the agent to read the file named in "work.test.instructions" and to run "aof test --failed" after a fix

    @executable
    Scenario: E3 · no source or render keeps the old selection wording
      When I search the bundle sources, this repository's renders and the work-init goldens
      Then none contains "never name suite files", "wearing prose" applied to suites, "--scope impacted", "--scope file" or "--scope all"

  Rule: R3 · The skills keep every run bounded, and the review lane checks the choice

    @executable
    Scenario: E7 · the build terminator sends fixes to --failed and the tree to the gate
      When I read the rendered continue skill's build terminator
      Then it says to check a fix with "aof test --failed"
      And it says never to run "aof test --all" in story work, because the whole tree is the regression gate's

    @executable
    Scenario: E8 · a stopped fix loop is handed over, never pushed through
      When I read the rendered continue and repair skills
      Then each says that a "test-fix-stopped" refusal is answered by a blocker in the item's STATE.md, or in a driven session by the loop's question, and the agent stops

    @executable
    Scenario: E9 · a pre-existing red is recorded, not fixed
      When I read the rendered continue skill's build terminator
      Then it says a failure "aof test" labels pre-existing is recorded by case name under "## Feedback (for retro)" and is not the story's to fix

    @executable
    Scenario: the UAT sweep runs the whole tree as --all
      When I read the rendered add-uat skill and the UAT SESSION and STATE templates
      Then each names the regression sweep as one "aof test --all" for the session

    @executable
    Scenario: the review lanes' prose tells the structural lane to check the choice of suites
      When I read the rendered continue skill's review lanes
      Then the structural lane compares the story's recorded runs and reasons with "aof test --suggest" for the story's changed files
      And it raises a finding for a suite that imports or names a changed file, appears in no recorded run, and is named by no recorded reason

    @manual
    Scenario: E12 · a structural lane raises a finding for an importer left unrun with no reason
      Given a scratch story that changed "src/record.mjs", whose recorded named runs omit "test/record.test.mjs", which imports it
      And no recorded reason names "test/record.test.mjs"
      When a structural review lane runs on the story
      Then it raises one finding naming "test/record.test.mjs" and "src/record.mjs"

    @manual
    Scenario: E13 · a stated exclusion is accepted
      Given the same scratch story, with a recorded reason "test/record.test.mjs left out: it binds :4182"
      When a structural review lane runs on the story
      Then it raises no finding for "test/record.test.mjs"

  Rule: R2 · A project with no instructions file is told how to get one

    @executable
    Scenario: E6 · map-tests drafts the instructions file and hands it to the operator
      When I read the rendered "/aof:map-tests" skill
      Then it drafts the instructions file from the repository's test roots, runner scripts, native "node:test" packages and known hazards
      And it sets "work.test.instructions", and asks the operator to edit the draft
      And it neither authors couplings nor replays commits

    @executable
    Scenario: the goldens match the renders
      When I run "node scripts/golden.mjs --lane work-init" and each of its "work-stream-fixture", "work-stream-life", "work-stream-place" and "work-stream-read" lanes
      Then none reports a difference
