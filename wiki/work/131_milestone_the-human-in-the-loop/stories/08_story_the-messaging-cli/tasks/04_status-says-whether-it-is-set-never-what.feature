@executable @cli @work @work-stream
Feature: aof messaging status says whether a webhook is set and where it is on, and never shows it

  ADR-005 §1, as amended at 131/08. `aof messaging status` reports, for each type in `CHANNELS`,
  three facts: whether a URL is stored on this machine, whether the env override is set, and
  whether this project has the type enabled. It reads the store only through
  `messagingSecretPresent` and never reads the value.

  RULINGS (PO, 2026-09-25). (1) The text form is one block per type:
  `discord`
  `  this machine: set (<path>)`, or `not set — run \`aof messaging init discord\``
  `  env override <NAME>: set` or `not set`
  `  this project: enabled (<channel names>)`, `disabled`, or `no project here`
  (2) `<NAME>` is the `urlEnv` of the project's channel of that type, else `DEFAULT_URL_ENV`. The
  env var's value is never read into the output; only whether it is non-blank.
  (3) `--json` answers `{ channels: [{ type, stored, path, envOverride: { name, set },
  project: { enabled, channels } | null }] }`. No key holds a URL. (4) It exits 0 whatever it
  finds. It is a report, not a check.

  RULINGS (QA, 2026-09-25). (1) The leak check stores the fixture URL, sets the env var to a
  second fixture URL, and asserts that neither URL nor either token segment appears in the text
  or the JSON. (2) Cases run under a fresh `AOF_GLOBAL_HOME`, with the env injected, never the
  real process env.

  Scenario: status never shows the value
    Given the fixture URL is stored, `AOF_DISCORD_WEBHOOK_URL` is a second fixture URL, and the project has `discord` enabled
    When `aof messaging status` and `aof messaging status --json` run
    Then both report `stored: true`, the override set and the project enabled, and neither contains either URL or either token segment

  Scenario Outline: the three facts
    Given <machine>, <override> and <project>
    When `aof messaging status --json` runs
    Then the `discord` entry is `stored: <stored>`, `envOverride.set: <set>`, `project: <proj>`

    Examples:
      | machine          | override                           | project                              | stored | set   | proj                                         |
      | nothing stored   | no env var                         | no `.aof/aof.config.json` above cwd  | false  | false | null                                         |
      | a URL stored     | no env var                         | `discord` enabled                    | true   | false | `{ enabled: true, channels: ["discord"] }`   |
      | nothing stored   | `AOF_DISCORD_WEBHOOK_URL` set      | no `work.notify`                     | false  | true  | `{ enabled: false, channels: [] }`           |
      | a URL stored     | `AOF_DISCORD_WEBHOOK_URL` is `"  "`| `discord` enabled                    | true   | false | `{ enabled: true, channels: ["discord"] }`   |

  Scenario: a hand-named channel's env var is the one reported
    Given the project's only discord channel is `ops` with `urlEnv: "OPS_HOOK"`
    When `aof messaging status --json` runs
    Then `envOverride.name` is `OPS_HOOK`, and `project.channels` is `["ops"]`
