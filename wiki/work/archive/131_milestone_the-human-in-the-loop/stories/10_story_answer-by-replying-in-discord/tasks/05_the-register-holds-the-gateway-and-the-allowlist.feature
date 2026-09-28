@executable @cli @work @work-stream
Feature: the register holds the gateway to one module and a Discord answer to the allowlist — FF-13111 and FF-13112 landed

  ADR-008. `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` is founded with FF-13111
  and FF-13112, exactly as the register rows state them. It is registered by one import and one
  spread in `test/arch/loop/index.mjs`, and the `test/arch/loop` row of
  `acd-source-directory-budget` rises from 65 to 66 with a `why` naming this file. Both register
  entries lose `pending (10)`. Each gets a red probe in `VERIFICATION.md`'s fitness register. Story
  11 appends FF-13113 to this file.

  RULINGS (QA, 2026-09-25). (1) Both controls are non-vacuous. The sweep must find
  `src/discord/gateway.mjs`, `src/discord/replies.mjs` and one `invoke("work:answer"` call. (2)
  The fixtures reuse task 01's fake gateway and task 03's background, through `test/discord/discord-fixture.mjs`
  (task 00 budgets it), not by copying them. `test/support/` is a row at its ceiling.

  Scenario: both controls are green on the built tree
    When the new arch file runs under an isolated `AOF_GLOBAL_HOME`
    Then FF-13111 and FF-13112 are green, and the budget row reads 66

  Scenario Outline: each control reds on its probe
    Given <probe>
    When the arch file runs
    Then <control> is red and its message names <names>

    Examples:
      | probe                                                                  | control  | names                       |
      | the gateway sends IDENTIFY on every reconnect                          | FF-13111 | the second IDENTIFY         |
      | `replies.mjs` constructs its own socket                                | FF-13111 | `src/discord/replies.mjs`   |
      | `replies.mjs` skips the allowlist check                                | FF-13112 | the non-allowlisted user    |
      | `replies.mjs` calls `answerAsk` directly                               | FF-13112 | `ask-request.mjs`           |
