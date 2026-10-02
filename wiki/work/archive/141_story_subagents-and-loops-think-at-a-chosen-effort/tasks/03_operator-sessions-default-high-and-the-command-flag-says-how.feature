@cli @assets @distribution
Feature: an operator's session in an aof project defaults to high, and a command's --thinking says how to set it

  A session the operator types in cannot have its effort changed from inside. The Agent tool
  takes a model but no effort, and a running session's effort changes only through `/effort`,
  which a command cannot run for them. `.claude/settings.json`'s `effortLevel` is read once, at
  session start. So the default for a typed session has to be in place BEFORE it starts:
  `mergeClaudeSettings` (`src/claude-settings.mjs`) fills `effortLevel: "high"` in when the
  document has none. Claude Code treats a project `effortLevel` as the default only for models
  the operator has not saved a level for (`modelSettings`), so the operator's own saved choice
  still wins. Subagents with no `effort:` line inherit the session's level (task 02).

  A default only fills a gap. It never overwrites an `effortLevel` already in the document,
  because the file has other authors (ADR-002 of milestone 43). A `settings.claude.effortLevel`
  in the project config is aof-authored and wins as it does today.

  The three phase commands take `--thinking <level>` and answer it honestly. They STOP before
  minting a run or running any role, tell the operator the `/effort` command to run, and state
  that the flag changed nothing. A command never reports an effort as set when it was not.

  @executable
  Scenario Outline: the settings merge fills the default and never overwrites
    Given `settings.claude.effortLevel` in the project config is <configured>
    And `.claude/settings.json` holds <before>
    When `aof work update` merges the settings
    Then `.claude/settings.json`'s `effortLevel` is <after>

    Examples:
      | configured | before                         | after      |
      | unset      | no file                        | `"high"`   |
      | unset      | a document with no effortLevel | `"high"`   |
      | unset      | `effortLevel: "medium"`        | `"medium"` |
      | `"xhigh"`  | a document with no effortLevel | `"xhigh"`  |
      | `"xhigh"`  | `effortLevel: "medium"`        | `"xhigh"`  |

  @executable
  Scenario: a second merge writes nothing
    Given `aof work update` has filled `effortLevel: "high"`
    When `aof work update` runs again
    Then the settings outcome reports the file unchanged and nothing is written

  @executable
  Scenario: every other operator key survives the fill
    Given `.claude/settings.json` holds operator `permissions`, an operator hook and `enabledPlugins`
    When the merge fills `effortLevel`
    Then each of those values is byte-identical after the write

  @executable
  Scenario Outline: a phase command's --thinking stops before any work and names /effort
    When the `<config>` block of `src/bundle/commands/<command>.md` is read
    Then it states that `--thinking <level>` stops the command before the run is minted and before any role runs
    And it states the stop prints `/effort <level>`, spelling `extra-high` as `xhigh`, and says to re-run the command without `--thinking`
    And it states the stop says the session's effort was NOT changed and that subagents inherit it unless `work.agents.effort` pins their role
    And it states an unknown level is named as unknown, listing the six accepted spellings

    Examples:
      | command  |
      | continue |
      | refine   |
      | verify   |

  @executable
  Scenario: the renders, the manifest and the lock agree with the source
    When `aof work update --dry-run --json` runs at the repo root
    Then `summary` reads `created` 0, `updated` 0, `deleted` 0 and `drift-warning` 0
    And each rendered `continue`, `refine` and `verify` file (`.claude`, `.codex`, `.opencode`) carries the `--thinking` stop as the source does
    And `serializeBundleManifest(generateBundleManifest())` equals the bytes of `src/bundle/manifest.json`

  @manual
  Scenario: the live install launches at the chosen effort
    Given the payload is installed with `node scripts/install-local.mjs --skip-ui` and `aof work update` has run at the repo root
    When `aof work drive continue 141 --thinking extra-high --dry-run --json` and `aof work drive continue 141 --dry-run --json` run
    Then they answer `effort` `{ "level": "xhigh", "source": "--thinking" }` and `{ "level": "high", "source": "default" }`
    And `.claude/settings.json` at the repo root carries an `effortLevel`, recorded in VERIFICATION.md with the value found
