@executable @cli @work @work-stream
Feature: a Discord reply to the bot's ask message, from an allowlisted user, answers the waiting session through `work:answer`

  ADR-008 §3, §5, §6. On `MESSAGE_CREATE`, `src/discord/replies.mjs` reads
  `message_reference.message_id`, looks it up with `readAskMessage`, loads the workspace at the
  record's `projectRoot`, and finds the discord channel whose `channelId` matches. If the author's
  id is in that channel's `allow`, it runs `invoke("work:answer", { ref, text: content, as:
  "@<username>", via: "discord" }, { workspace })` in-process. `work:answer` (`resume.mjs`) learns
  `via: "discord"`. Its sanitation, first-answer-wins and `session-answered` are 04's and stay
  untouched.

  RULINGS (PO, 2026-09-25). (1) `allow` is `work.notify.channels.<name>.allow`: unique snowflakes,
  and absent by default. Absent or empty means nobody answers from Discord. (2) On success the bot
  adds a ✅ reaction to the reply and posts no text, because `session-answered` is already posted.
  (3) On a refusal it posts one reply to the user's message with `allowed_mentions: { parse: [],
  replied_user: false }`, and the line comes from the code, as the table below shows. (4) It stays
  silent, with no post and no invoke, for: a message from a bot, a message with no reference, a
  reference with no index record, and a record whose `channelId` differs from the reply's channel.
  (5) The actor is `@<username>`, clipped to 80 code points. If the username fails the verb's
  actor check, the actor is `@discord-user`. A user id never lands on the record.

  RULINGS (QA, 2026-09-25). (1) The cases run the real `work:answer` over a real ask file in an
  isolated home, with `discordRequest` faked, so the reaction and the reply are observed as
  requests. (2) The ask file's state is read back from disk.

  RULINGS (developer, feasibility, 2026-09-25). (1) The in-process `invoke` is reached by a
  deferred import of `src/command-core.mjs`, as `declarations.mjs` does, so `src/discord/` sits in
  no guarded static closure. (2) Reactions use `PUT
  /channels/{c}/messages/{m}/reactions/%E2%9C%85/@me` through `discordRequest`.

  Background:
    Given a project whose `discord` channel has `channelId` "123456789012345678" and `allow: ["222222222222222222"]`
    And a waiting ask file for ref `131/03` in that workspace
    And an index record for message "900000000000000001" naming that channel, ref `131/03` and the project's root

  Scenario: an allowlisted reply answers the ask
    When a `MESSAGE_CREATE` arrives from user "222222222222222222", named "umami", in channel "123456789012345678", replying to "900000000000000001" with "take option B"
    Then the ask file reads `answered` with answer "take option B" and `by: { actor: "@umami", via: "discord", node: <the control's id> }`
    And one ✅ reaction was put on the reply, and no text message was posted by the reply handler

  Scenario Outline: what the bot answers to a reply
    Given <given>
    When a reply arrives from <user> to "900000000000000001" with <text>
    Then the ask file reads <state>, and the bot <posts>

    Examples:
      | given                                      | user                  | text                    | state      | posts                                                                                       |
      | nothing more                               | "333333333333333333"  | "do it"                 | `waiting`  | one reply: not on this project's answer list, naming `work.notify.channels.discord.allow`   |
      | the channel has no `allow`                 | "222222222222222222"  | "do it"                 | `waiting`  | one reply: answering from Discord is off for this project, naming the `allow` key          |
      | the ask already answered by "@umami"       | "222222222222222222"  | "again"                 | `answered` | one reply: already answered by @umami, with how long ago                                   |
      | the ask file cleared                       | "222222222222222222"  | "late"                  | absent     | one reply: `131/03` is no longer waiting                                                   |
      | nothing more                               | "222222222222222222"  | 8,001 characters        | `waiting`  | one reply: the answer is too long, at most 8,000 characters                                |
      | nothing more                               | "222222222222222222"  | "" (an attachment only) | `waiting`  | one reply: the answer is empty                                                             |

  Scenario Outline: messages the bot ignores in silence
    When <message> arrives
    Then no request is sent to Discord, `work:answer` is not invoked, and the ask file still reads `waiting`

    Examples:
      | message                                                                    |
      | a message from a bot author replying to "900000000000000001"                |
      | a message with no `message_reference`                                      |
      | a reply to "900000000000000999", which has no index record                 |
      | a reply to "900000000000000001" posted in channel "444444444444444444"     |

  Scenario: the CLI face still has no via flag
    When `aof work answer 131/03 "x" --via discord` runs
    Then it is refused as an unknown flag, and the ask file still reads `waiting`
