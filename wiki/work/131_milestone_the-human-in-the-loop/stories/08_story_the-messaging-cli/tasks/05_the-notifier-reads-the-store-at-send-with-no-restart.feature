@executable @cli @work @work-stream
Feature: the notifier reads the stored webhook at the point of send, the env var overrides it, and no restart is needed

  ADR-005 §1, as amended at 131/08. In `src/notify/notify.mjs`, `deliver` resolves a channel's URL
  on every send. It uses `env[urlEnv]` when that is set and not blank. Otherwise it uses
  `readMessagingSecret(channel.type)`. Otherwise it degrades `notify-channel-unconfigured`. Nothing
  is cached, so a daemon that was running before `init` sends with the new URL.

  RULINGS (PO, 2026-09-25). (1) The env var wins, because it is the override. (2) The unconfigured
  degrade now names both remedies: `notify channel "<name>" has no webhook URL — set <urlEnv> or
  run \`aof messaging init <type>\``. (3) The store's home is the process's global home. An `env`
  injected into `notify` is the override's source only. So `notify(ws, envelope, { env: {} })`
  under a test's `AOF_GLOBAL_HOME` never reads the real `~/.aof`. (4) FF-13106 is amended in
  `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs`. Its env-read leg admits
  `readMessagingSecret(` as the second read inside `src/notify/`. A new leg holds that the
  `messaging` store segment is joined into a path only in `src/notify/secret.mjs`, and that
  `src/commands/messaging/messaging.mjs` imports the store only from it. The leg's red probe is
  recorded in `VERIFICATION.md`'s fitness register.

  RULINGS (QA, 2026-09-25). (1) "No restart" is one process and one workspace object. `notify`
  runs once before `writeMessagingSecret` and once after, and the second run delivers. (2) The URL
  a send used is observed through the fake `fetch`'s first argument, never through output.
  (3) The existing `notify-channels` cases that expect `notify-channel-unconfigured` stay green
  unchanged, because their global home is an empty temp dir.

  Scenario: a stored URL is used when the env var is unset
    Given the fixture URL is stored, and the workspace has `discord` enabled
    When `notify` runs with `env: {}` and a fake fetch answering 204
    Then it answers `{ delivered: ["discord"], failed: [] }`, and the fetch was called with the stored URL

  Scenario: init after start is picked up with no restart
    Given nothing is stored, and one workspace object with `discord` enabled
    When `notify` runs, then `writeMessagingSecret` stores the fixture URL, then `notify` runs again with the same workspace
    Then the first answers `failed: ["discord"]` with one `notify-channel-unconfigured`, and the second answers `delivered: ["discord"]`

  Scenario Outline: which URL a send uses
    Given <stored>, and the channel's `urlEnv` is `AOF_DISCORD_WEBHOOK_URL` set to <env>
    When `notify` runs with a fake fetch answering 204
    Then the fetch <called>

    Examples:
      | stored                        | env                                             | called                                           |
      | `…/123/stored` stored         | unset                                           | was called with `…/123/stored`                   |
      | `…/123/stored` stored         | `"https://discord.com/api/webhooks/9/override"` | was called with `…/9/override`                   |
      | `…/123/stored` stored         | `"   "`                                         | was called with `…/123/stored`                   |
      | nothing stored                | unset                                           | was not called, and the degrade names both remedies |

  Scenario: the amended FF-13106 reds on a second home for the path
    Given `src/commands/messaging/messaging.mjs` joins `"messaging"` into a path itself
    When FF-13106 runs
    Then its store-path leg is red and names that file, and every other FF-13106 leg stays green
