@executable @cli @work @work-stream
Feature: the register holds the slash commands to deferral, registered verbs and no process start — FF-13113 landed

  ADR-009. FF-13113 is appended to `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs`
  (10's file) exactly as the register row states it. Its register entry loses `pending (11)`, and
  its red probe is recorded in `VERIFICATION.md`. 130's single-home control for the stop request
  (`acd-loop-stop-request-single-home`) gains the `loop-resumes` literal as a second
  owned-by-`stop-request.mjs` segment, with the reason "the resume request lives beside the stop it
  undoes (131/ADR-009 §6)".

  RULINGS (QA, 2026-09-25). (1) The control is non-vacuous: its sweep finds `commands.mjs` and at
  least one `invoke(` call. (2) The deferral leg reuses 10's fake gateway from
  `test/discord/discord-fixture.mjs`.

  Scenario: the control is green on the built tree
    When the arch file and `acd-loop-stop-request-single-home` run under an isolated `AOF_GLOBAL_HOME`
    Then FF-13113 is green, and the stop-request control holds both segments

  Scenario Outline: the control reds on its probe
    Given <probe>
    When the arch file runs
    Then FF-13113 is red and names <names>

    Examples:
      | probe                                                                     | names                          |
      | `commands.mjs` dispatches before the `type: 5` callback                   | the command that dispatched first |
      | `commands.mjs` imports `node:child_process`                               | `src/discord/commands.mjs`     |
      | `commands.mjs` invokes `work:drive`                                       | `work:drive`                   |
      | `loop-resumes` is joined into a path in `src/mesh/declarations.mjs`       | `src/mesh/declarations.mjs`    |
