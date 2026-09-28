@manual @docs @work @work-stream
Feature: the Discord guide sets up the bot, from the Developer Portal to the first post

  ADR-007. `wiki/architecture/discord-notifications.md` was written for the webhook. It is
  rewritten as the bot's setup guide. The webhook sections are deleted, not kept as an
  alternative. The guide covers:
  - the Developer Portal steps: create an application, add its bot, copy the token;
  - the Message Content intent: which toggle, and that story 10's replies need it;
  - `aof messaging init discord` and the invite URL it prints, with the scope and every permission
    bit named;
  - finding a channel id (Developer Mode → Copy Channel ID);
  - `aof messaging enable discord --channel <id>`, and `status`;
  - where each piece lives, and which is committed.

  RULINGS (PO, 2026-09-25). (1) The guide names each permission by name and bit:
  VIEW_CHANNEL `1<<10`, SEND_MESSAGES `1<<11`, ADD_REACTIONS `1<<6`, READ_MESSAGE_HISTORY
  `1<<16`, USE_APPLICATION_COMMANDS `1<<31`, total `2147552320`. (2) It says that for an
  application whose Application ID differs from its bot's user id, the portal's Application ID
  goes in `client_id`. (3) Answering by reply (10) and the slash commands (11) get one short
  section each, marked as arriving with those stories, so the guide is not rewritten three
  times. (4) No real token, channel id or user id appears in it.

  Scenario: an operator can follow the guide to a first post
    Given the rewritten guide and an isolated `AOF_GLOBAL_HOME`
    When the developer walks it with the fixture token (`init`, the invite URL printed, `enable --channel`, `status`)
    Then every command it shows runs as written, and every output it quotes matches
    And the evidence is recorded in `VERIFICATION.md` under 131/09

  Scenario: the guide carries no secret and no webhook
    When the guide is grepped for `api/webhooks`, for a three-segment token shape, and for 17-to-20-digit numbers other than the documented permission total
    Then there are no hits
