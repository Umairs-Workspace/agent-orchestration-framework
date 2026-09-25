@executable @cli @work @work-stream
Feature: the register holds the bot token to its store and the wire to one door — FF-13106 amended, FF-13110 landed

  ADR-007. Both controls live in `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs`, the
  file that already holds FF-13106. The ARCHITECTURE register declares both with `pending (09)`.
  This task lands them, and the build removes the marker from both register entries. Each gets a
  red probe in `VERIFICATION.md`'s fitness register, recording what was changed to make it fail
  and the message observed.

  RULINGS (PO, 2026-09-25). (1) FF-13106's schema leg becomes: a channel has `channelId` and
  `tokenEnv`, and no `url`, `webhook`, `token` or `urlEnv`. Its read leg becomes: the token is read
  only as `env[<tokenEnv>]` or through `readMessagingSecret`. The ban on the incoming-webhook path
  literal and the store-path leg (08) stand. (2) FF-13110 is added exactly as the register row
  states it.

  RULINGS (QA, 2026-09-25). Both controls are non-vacuous. The sweep must find
  `src/notify/discord.mjs` and at least one `discordRequest(` call, or it fails.

  Scenario: both controls are green on the built tree
    When `acd-loop-ask-reaches-every-face` runs under an isolated `AOF_GLOBAL_HOME`
    Then FF-13106 and FF-13110 are green, and every other control in the file stays green

  Scenario Outline: each control reds on its probe
    Given <probe>
    When `acd-loop-ask-reaches-every-face` runs
    Then <control> is red and its message names <names>

    Examples:
      | probe                                                                  | control  | names                          |
      | `notify.mjs` builds its own `Authorization: Bot` header                | FF-13110 | `src/notify/notify.mjs`        |
      | the schema's discord channel regains a `urlEnv` property               | FF-13106 | `urlEnv`                       |
      | the failure degrade interpolates the token                             | FF-13106 | the degrade code               |
