@executable @cli @work @work-stream
Feature: when a channel takes answers, its ask message says so, and the schema holds the allowlist

  ADR-008 §3, §7. `schemas/aof.schema.json` gains `allow` on the discord channel: an array of
  unique snowflakes. `renderDiscord` gains `{ replyable }`, and `notify` passes `replyable: true`
  for a channel whose `allow` is non-empty. For `session-needs-input` the action line then reads
  ``Answer: reply to this message, or `aof work answer <ref> "…"` ``. For
  `session-parked-unanswered` it reads ``Answer to resume: reply to this message, or `aof work
  answer <ref> "…"` ``. Every other event's line is unchanged.

  RULINGS (PO, 2026-09-25). (1) This departs from DESIGN §3's action line on purpose, and ADR-008
  §7 records it. (2) The action line still never truncates, and the body yields as before.

  RULINGS (QA, 2026-09-25). The 2,000-character case is re-run with the longer action line, and
  the body is clipped, not the line.

  Scenario Outline: the action line follows the channel's allowlist
    Given a `<event>` envelope for ref `131/03`
    When `renderDiscord` runs with `replyable: <replyable>`
    Then its action line is <line>

    Examples:
      | event                       | replyable | line                                                                  |
      | session-needs-input         | true      | ``Answer: reply to this message, or `aof work answer 131/03 "…"` ``   |
      | session-needs-input         | false     | ``Answer: `aof work answer 131/03 "…"` ``                             |
      | session-parked-unanswered   | true      | ``Answer to resume: reply to this message, or `aof work answer 131/03 "…"` `` |
      | loop-halted                 | true      | ``Resume: `aof work loop 131 --resume` ``                             |

  Scenario: notify passes replyable from the channel's allow
    Given two discord channels, one with `allow: ["222222222222222222"]` and one without
    When `notify` runs for `session-needs-input` with a fake fetch
    Then the first channel's posted content carries "reply to this message", and the second's does not

  Scenario: a long ask keeps the longer action line whole
    Given a `session-needs-input` envelope with a 3,000-character question, rendered with `replyable: true`
    When `renderDiscord` runs
    Then `content` is at most 2,000 characters and ends with the whole action line and the link

  Scenario Outline: the schema's allowlist
    Given a discord channel with `allow` = <allow>
    When the config is validated
    Then it is <verdict>

    Examples:
      | allow                                              | verdict |
      | `["222222222222222222"]`                           | valid   |
      | `[]`                                               | valid   |
      | `["222222222222222222", "222222222222222222"]`     | invalid |
      | `["umami"]`                                        | invalid |
