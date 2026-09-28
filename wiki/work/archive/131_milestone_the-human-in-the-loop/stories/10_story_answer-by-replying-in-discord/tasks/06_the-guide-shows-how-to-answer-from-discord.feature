@manual @docs @work @work-stream
Feature: the Discord guide shows how to let a person answer by replying

  ADR-008. 09 left a marked section in `wiki/architecture/discord-notifications.md` for answering
  by reply. This task fills it with what an operator needs:
  - the Message Content intent, and the fatal close the bot reports without it;
  - that the control node's serve daemon holds the connection, so the desktop app must be running;
  - how to find a Discord user id (Developer Mode → Copy User ID);
  - the `allow` key, with a config example;
  - what the bot does on a reply: ✅, a refusal line, or silence.

  RULINGS (PO, 2026-09-25). (1) The example uses placeholder ids only. (2) The guide states that
  nobody can answer from Discord until `allow` is set.

  Scenario: an operator can turn on answering from the guide alone
    Given the updated guide
    When the developer follows its reply section against task 03's fixture project
    Then every config it shows validates against the schema, every refusal line it quotes matches the built text, and the evidence is recorded in `VERIFICATION.md` under 131/10

  Scenario: the guide carries no real id or token
    When the guide is grepped for a three-segment token shape and for 17-to-20-digit numbers other than the documented placeholders and permission total
    Then there are no hits
