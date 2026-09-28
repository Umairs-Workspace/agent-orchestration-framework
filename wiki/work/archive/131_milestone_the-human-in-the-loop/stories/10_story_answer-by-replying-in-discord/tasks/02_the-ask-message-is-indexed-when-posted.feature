@executable @cli @work @work-stream
Feature: an ask message is indexed by its Discord message id when the notifier posts it

  ADR-008 §4. When `notify` delivers `session-needs-input` or `session-parked-unanswered` to a
  discord channel, it records `{ messageId, channelId, event, ref, workspaceId, projectRoot,
  postedAt }` through `recordAskMessage` in `src/notify/ask-messages.mjs`. The record lives at
  `<messagingStoreDir()>/discord-asks/<messageId>.json`. `messagingStoreDir` is a new export of
  `src/notify/secret.mjs`, so the `messaging` segment is still spelled there alone.
  `readAskMessage(messageId)` is the reader 10's reply handler uses.

  RULINGS (PO, 2026-09-25). (1) Only the two ask events are indexed. The other five are not. (2)
  `workspaceId` is `resolveWorkspaceId(workspace)`, and `projectRoot` is the workspace's own
  project root. (3) A write failure degrades `notify-ask-index` and never changes `notify`'s answer.
  (4) Each write prunes records whose `postedAt` is older than 30 days. (5) A message id that is not
  a snowflake is never used as a file name, and `readAskMessage` answers `null` for it.

  RULINGS (QA, 2026-09-25). (1) Records are read back from the isolated global home, never from a
  return value. (2) The prune is driven by an injected clock.

  Scenario: a posted ask is indexed
    Given the token stored, `discord` enabled with `channelId` "123456789012345678", and a fake fetch answering 200 `{ "id": "998877665544332211" }`
    When `notify` runs for `session-needs-input` on ref `131/03`
    Then `<home>/messaging/discord-asks/998877665544332211.json` holds exactly the seven keys, with `event: "session-needs-input"`, `ref: "131/03"` and the workspace's id and root
    And `readAskMessage("998877665544332211")` answers that record

  Scenario Outline: which events are indexed
    Given a delivered post answering message id "111111111111111111"
    When `notify` runs for `<event>`
    Then the index <has>

    Examples:
      | event                       | has                         |
      | session-needs-input         | holds a record for it       |
      | session-parked-unanswered   | holds a record for it       |
      | session-answered            | holds no record             |
      | loop-halted                 | holds no record             |
      | milestone-accepted          | holds no record             |

  Scenario: an index that cannot be written never fails the send
    Given the `discord-asks` directory path is occupied by a plain file
    When `notify` runs for `session-needs-input` with a fetch answering 200 `{ "id": "1" }`
    Then it answers `delivered: ["discord"]`, and one `notify-ask-index` degrade is reported

  Scenario: old records are pruned at write
    Given a record whose `postedAt` is 31 days before the injected clock, and one 29 days before
    When a new ask is indexed
    Then the 31-day record is gone, and the 29-day record and the new one remain

  Scenario Outline: the reader refuses a message id that is not a snowflake
    When `readAskMessage(<id>)` runs
    Then it answers `null`, and no file outside `discord-asks/` is read

    Examples:
      | id                   |
      | `"../secret"`        |
      | `"abc"`              |
      | `""`                 |
