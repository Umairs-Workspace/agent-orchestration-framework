@manual @docs @work @work-stream
Feature: the Discord guide lists the four commands, who may run them, and what each one does

  ADR-009. The commands section 09 left in `wiki/architecture/discord-notifications.md` is filled
  in. It covers:
  - the `applications.commands` scope, already in the invite URL;
  - that the commands appear in a server once the bot is connected;
  - each command, its options and whether its reply is ephemeral;
  - that the commands reach only projects whose channel is the one they are run in, for users in
    that channel's `allow`;
  - what `/loop resume` needs: a loop started with `--supervised`, and the desktop app running.

  RULINGS (PO, 2026-09-25). The guide says `/loop resume` starts nothing itself. It asks the
  supervisor, and an unsupervised loop is resumed from a terminal.

  Scenario: an operator can use each command from the guide alone
    Given the updated guide
    When the developer checks each command's quoted reply against task 01–04's fixtures
    Then every quoted reply and refusal matches the built text, and the evidence is recorded in `VERIFICATION.md` under 131/11
