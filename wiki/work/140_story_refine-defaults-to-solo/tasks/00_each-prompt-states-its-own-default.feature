@executable @cli @work @distribution
Feature: each prompt states its own default — an unset work.agents.mode plays refine solo and continue orchestrated

  `refine.md` and `continue.md` resolve their role mode from `work.agents.mode` and treat every value
  other than `"solo"` — an unset key included — as orchestrated. After this task the unset case is
  each command's OWN default: refine plays every role inline, continue spawns its role agents. A set
  `work.agents.mode` still governs both, and `--solo` / `--orchestrated` still override it for one
  run exactly as 129/07 delivered.

  Each prompt also stops promising the loop's fallback to `work.agents.mode`: the loop composes a
  flag on every refine and continue it drives (task 01), so a loop-driven session never reads that
  key. That SUPERSEDES the prompt rows of
  `129/07/tasks/02_the-drive-carries-the-phase-mode.feature` ("…falling back to `work.agents.mode`"),
  which stays delivered and untouched; the test cases backing those rows are re-pointed here.

  The orchestrated refine keeps its Three Amigos but gives each story ONE `aof-qa`: the Examples
  tables for all of a story's tasks are one QA pass. On 2026-09-27 an orchestrated story refine had
  about eleven `aof-qa` agents in flight, one per task, each re-reading the same story and code.

  Scenario Outline: an unset work.agents.mode resolves to the command's own default
    When the `<config>` block of `src/bundle/commands/<prompt>.md` is read
    Then it states that an unset `work.agents.mode` resolves to <default>
    And it states that `work.agents.mode: "<other>"` resolves to <other>

    Examples:
      | prompt   | default      | other        |
      | refine   | solo         | orchestrated |
      | continue | orchestrated | solo         |

  Scenario Outline: the prompt names what the loop composes, and no fallback to work.agents.mode
    When the `<config>` block of `src/bundle/commands/<prompt>.md` is read
    Then it states that the loop composes a flag on every <prompt> it drives: `work.loop.agents.<prompt>.mode` when set, `--solo` when unset
    And it states that a loop-driven <prompt> never reads `work.agents.mode`
    And it does not contain "composes nothing when it is unset"
    And it names `src/loop-bounds.mjs` as the home of the loop's default

    Examples:
      | prompt   |
      | refine   |
      | continue |

  Scenario: an orchestrated refine gives each story one QA agent
    When the story Contract step of `src/bundle/commands/refine.md` is read
    Then it states that under orchestrated mode one `aof-qa` writes the Examples tables for all of the story's tasks
    And it states that the QA pass is never split into one agent per task

  Scenario: the schema describes the per-command default and the loop's own key
    When the `work.agents.mode` description in `schemas/aof.schema.json` is read
    Then it states that an unset key resolves to each command's own default, refine solo and every other role-spawning command orchestrated
    And it states that a loop-driven session reads `work.loop.agents.<phase>.mode`, never this key

  Scenario: the renders, the manifest and the lock agree with the source
    When `aof work update --dry-run --json` runs at the repo root
    Then `summary` reads `created` 0, `updated` 0, `deleted` 0 and `drift-warning` 0
    And each of the six rendered `refine` and `continue` files (`.claude`, `.codex`, `.opencode`) states its prompt's unset default as the source does
    And `serializeBundleManifest(generateBundleManifest())` equals the bytes of `src/bundle/manifest.json`
