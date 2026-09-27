@executable @cli @work @work-stream
Feature: the bot token enters by `aof messaging init discord`, is kept machine-wide, and init prints the invite URL

  ADR-007 §1-§2. The Discord credential is now a bot token. `init discord` keeps 08's door
  unchanged: it reads the value from a hidden prompt on a TTY or from the first line of stdin,
  never from argv, and stores it through `writeMessagingSecret("discord", …)` in the same
  owner-only `discord.secret` file. The shape check is `isDiscordBotToken` in
  `src/notify/discord.mjs`, and it is the `discord` entry's `accepts`. `isDiscordWebhookUrl` and the
  webhook sender are deleted.

  RULINGS (PO, 2026-09-25). (1) A bot token is three dot-separated base64url segments. The first
  segment decodes to a snowflake (17 to 20 digits). (2) `init` prints the invite URL
  `https://discord.com/oauth2/authorize?client_id=<id>&scope=bot+applications.commands&permissions=2147552320`.
  `<id>` is the decoded snowflake. `init` makes no network call. (3) A webhook URL piped into
  `init discord` is refused `messaging-token-invalid`, and the message says the channel now takes
  a bot token and names the guide. (4) The prompt's label reads `Discord bot token:`. (5) The
  refusal names the shape, never the value.

  RULINGS (QA, 2026-09-25). (1) The token fixtures are synthetic: a base64url of
  `"123456789012345678"`, then `.AbCdEf.`, then 27 base64url characters. A real token never
  appears in a test. (2) "Never echoed" is checked by grepping stdout, stderr and the `--json`
  document for the token's third segment.

  RULINGS (developer, feasibility, 2026-09-25). (1) Decoding is `Buffer.from(seg, "base64url")`
  followed by a `^[0-9]{17,20}$` test. (2) 08's `readSecretInput` seam is reused with the prompt
  label changed. It adds no new face path.

  Scenario: a token piped on stdin is stored and the invite URL is printed
    Given an isolated `AOF_GLOBAL_HOME`
    When the fixture token is piped into `aof messaging init discord`
    Then `<home>/messaging/discord.secret` holds exactly the token and a newline
    And stdout names the file and prints the invite URL with `client_id=123456789012345678` and `permissions=2147552320`
    And none of stdout, stderr or `--json` carries the token's third segment

  Scenario: the prompt path stores the token with nothing echoed
    Given the TTY seam with a fake hidden prompt answering the fixture token
    When `aof messaging init discord` runs
    Then the prompt was asked `Discord bot token:`, and the token is stored

  Scenario Outline: what init refuses, storing nothing
    Given an isolated `AOF_GLOBAL_HOME` with nothing stored
    When <input> is given to `aof messaging init discord`
    Then it exits non-zero with `<code>`, nothing is stored, and no output carries the input

    Examples:
      | input                                                           | code                     |
      | a Discord webhook URL on stdin                                  | messaging-token-invalid  |
      | `abc.def` on stdin (two segments)                               | messaging-token-invalid  |
      | a three-segment value whose first segment decodes to `hello`   | messaging-token-invalid  |
      | an empty line on stdin                                          | messaging-url-empty      |
      | the token as a second positional                                | messaging-secret-in-argv |

  Scenario: the webhook helpers are gone
    When `src/notify/discord.mjs`'s exports are read
    Then they hold `isDiscordBotToken`, `discordRequest`, `sendDiscord` and `renderDiscord`, and no `isDiscordWebhookUrl`
