@executable @cli @work @work-stream
Feature: enable and disable switch a channel type per project by writing only work.notify

  ADR-005 §1, as amended at 131/08. The per-project switch is the `work.notify` block.
  `aof messaging enable discord` adds the channel `discord: { type: "discord" }`, and
  `aof messaging disable discord` removes every channel whose `type` is `discord`. Both go
  through `readConfig`/`writeConfig` in `src/work/delegation.mjs`, the project config's existing
  writer, and change no key outside `work.notify`.

  RULINGS (PO, 2026-09-25). (1) Enable is idempotent. When any channel of the type already exists,
  under any name, it changes nothing and says `already enabled`, and it keeps that channel's
  `urlEnv` and `events`. (2) Disable removes the `notify` block when nothing else is left in it.
  If a `link` remains, it leaves `channels: {}` beside it, which is the same honest no-op
  (ADR-005 §1). Disabling a type that is not enabled changes nothing and says `not enabled`.
  (3) Enable writes the channel whether or not this machine has a URL stored, because the config
  is committed and is read on other machines too. When none is stored here, it adds the line
  `No webhook is stored on this machine yet — run \`aof messaging init discord\`.`
  (4) No write ever carries a `url`, `webhook` or `token` key, and the result validates against
  `schemas/aof.schema.json`. (5) With no `.aof/aof.config.json` above the working directory, both
  verbs are refused `messaging-no-project`, and nothing is written.

  RULINGS (QA, 2026-09-25). (1) "Changes no key outside `work.notify`" is asserted by deep-equal
  of the parsed config before and after, with `work.notify` deleted from both. (2) A no-op is
  asserted byte-for-byte on the file, not just by parse. (3) Cases run in a temp project under a
  fresh `AOF_GLOBAL_HOME`, never in this repository.

  Scenario: enable adds the channel and nothing else
    Given a project config with no `work.notify`
    When `aof messaging enable discord` runs in it
    Then `work.notify` is `{ channels: { discord: { type: "discord" } } }`, every other key is unchanged, and the file validates

  Scenario: disable removes it
    Given the project has the `discord` channel enabled and no `link`
    When `aof messaging disable discord` runs
    Then the config has no `work.notify` key, and every other key is unchanged

  Scenario: a hand-named channel is respected
    Given `work.notify` is `{ channels: { ops: { type: "discord", urlEnv: "OPS_HOOK", events: ["loop-halted"] } } }`
    When `aof messaging enable discord` runs
    Then the file is byte-unchanged and the output says `already enabled`

  Scenario Outline: disable over what is there
    Given `work.notify` is `<before>`
    When `aof messaging disable discord` runs
    Then `work.notify` is `<after>`

    Examples:
      | before                                                                                                | after                                                   |
      | `{ channels: { discord: { type: "discord" } }, link: "https://x.test/{ref}" }`                        | `{ channels: {}, link: "https://x.test/{ref}" }`        |
      | `{ channels: { a: { type: "discord" }, b: { type: "discord", urlEnv: "B" } } }`                       | absent                                                  |
      | `{ channels: {} }`                                                                                    | `{ channels: {} }`, byte-unchanged, `not enabled`       |

  Scenario Outline: enable reports whether this machine can send
    Given a project config with no `work.notify`, and <stored>
    When `aof messaging enable discord` runs
    Then the output <line> the line `No webhook is stored on this machine yet`

    Examples:
      | stored                      | line                  |
      | no URL stored               | contains              |
      | a URL stored by `init`      | does not contain      |

  Scenario: no project, no write
    Given a directory with no `.aof/aof.config.json` above it
    When `aof messaging enable discord` runs there
    Then it exits non-zero with code `messaging-no-project`, and no file is created
