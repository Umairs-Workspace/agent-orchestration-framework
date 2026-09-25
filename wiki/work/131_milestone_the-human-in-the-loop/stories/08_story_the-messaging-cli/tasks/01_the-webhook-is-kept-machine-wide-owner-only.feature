@executable @cli @work @work-stream
Feature: the webhook is kept in one owner-only file under the global home, known to one module

  ADR-005 §1, as amended at 131/08. `src/notify/secret.mjs` is the ONE module that knows the
  store's path: `<defaultGlobalWorkspaceDir()>/messaging/<type>.secret`. It exports
  `messagingSecretPath(type, env)`, `readMessagingSecret(type, options)`,
  `writeMessagingSecret(type, url, options)` and `messagingSecretPresent(type, options)`.
  `isDiscordWebhookUrl(value)` lives in `src/notify/discord.mjs`, beside the renderer, and the
  `CHANNELS` entry for `discord` carries it as `accepts`.

  RULINGS (PO, 2026-09-25). (1) The file holds the URL and one trailing newline, nothing else. A
  read trims it. (2) The write is atomic: a temporary file in the same directory, then a rename.
  A reader never sees a half-written URL. (3) On POSIX the file is `0600` and the directory is
  `0700`, and both are re-applied when the file already exists, because `writeFile`'s `mode`
  acts only on creation. On win32 no mode is asserted. The file sits under the user profile and
  inherits its owner-only ACL, and that is the stated reason, not a gap. (4) The store's home is
  the PROCESS's global home (`defaultGlobalWorkspaceDir(process.env)`), so `AOF_GLOBAL_HOME`
  relocates it. An `env` handed to `notify` never moves it (task 05's ruling 3).

  RULINGS (QA, 2026-09-25). (1) Every case runs with `AOF_GLOBAL_HOME` set to a fresh temp dir.
  No case may touch the real `~/.aof`. (2) The accepted shapes are Discord's four hosts: `discord.com`,
  `discordapp.com`, `ptb.discord.com` and `canary.discord.com`. Each takes an optional `/v<N>`
  after `/api`, a numeric id and a token of `[A-Za-z0-9_-]`, over `https` only. The pattern is
  spelled escaped, never as the literal `discord.com/api/webhooks` that FF-13106 forbids in
  `src/**`. (3) An absent file and an unreadable file both read as `null`. Neither throws.

  Scenario: a written URL is read back from the global home
    Given `AOF_GLOBAL_HOME` is a fresh temp dir
    When `writeMessagingSecret("discord", "https://discord.com/api/webhooks/123/tok_EN-1")` runs
    Then `<AOF_GLOBAL_HOME>/messaging/discord.secret` exists, and `readMessagingSecret("discord")` answers the same URL

  Scenario: the file is owner-only on POSIX
    Given a POSIX platform
    When the URL is written over an existing file whose mode is `0644`
    Then the file's mode is `0600` and its directory's is `0700`

  Scenario: nothing is stored
    When `readMessagingSecret("discord")` runs against a fresh global home
    Then it answers `null`, and `messagingSecretPresent("discord")` answers `false`

  Scenario Outline: the Discord URL shape
    When `isDiscordWebhookUrl(<value>)` is asked
    Then it answers `<accepted>`

    Examples:
      | value                                                   | accepted |
      | `"https://discord.com/api/webhooks/123/tok_EN-1"`       | true     |
      | `"https://discordapp.com/api/webhooks/123/tok"`         | true     |
      | `"https://ptb.discord.com/api/v10/webhooks/123/tok"`    | true     |
      | `"https://canary.discord.com/api/webhooks/123/tok"`     | true     |
      | `"http://discord.com/api/webhooks/123/tok"`             | false    |
      | `"https://discord.com/api/webhooks/abc/tok"`            | false    |
      | `"https://discord.com/api/webhooks/123/"`               | false    |
      | `"https://evil.example/api/webhooks/123/tok"`           | false    |
      | `"https://discord.com.evil.example/api/webhooks/1/t"`   | false    |
      | `" "`                                                   | false    |
