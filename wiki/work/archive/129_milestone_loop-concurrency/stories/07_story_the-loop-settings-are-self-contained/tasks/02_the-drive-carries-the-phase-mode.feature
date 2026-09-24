@executable @cli @work @distribution
Feature: the drive carries the phase mode — the flag is composed from work.loop.agents.<phase>.mode, --orchestrated joins the prompts, the surface is named

  A driven session resolves its role mode PROMPT-SIDE: `refine.md` and `continue.md` read
  `work.agents.mode` (`solo` → inline; anything else → orchestrated) and `--solo` overrides an
  orchestrated config for one run. That is one direction. For the loop's refine and continue phases
  to be INDEPENDENT of each other and of the workspace default, the other direction must exist too,
  so both prompts gain `--orchestrated` as `--solo`'s twin: it overrides a solo config for one run,
  and the two together are refused before anything runs. The phase drive (`aof work drive
  refine|continue <ref>`, `src/commands/drive.mjs`) composes the flag from the bounds home:
  `work.loop.agents.<phase>.mode` `solo` → `/aof:<phase> <ref> --solo`, `orchestrated` →
  `… --orchestrated`, `null` (unset) → `/aof:<phase> <ref>` exactly as at HEAD — the fallback to
  `work.agents.mode` is then the prompt's own read, untouched. `verify` never carries a flag
  (`verify.md` reads no mode). `--dry-run` shows the composed command, so the composition is read
  off a real child process. `autonomous.md`'s `<config>` paragraph names the three keys and their
  workspace twins in the same sentence-neighbourhood as `work.loop.concurrency` (FF-7101 leg a binds
  them; no numeral is stated). The renders, `src/bundle/manifest.json` and `.aof/aof.lock.json`
  regenerate through `aof work update` / `scripts/generate-bundle-manifest.mjs`. ADR-001 §5 carries
  the dated amendment.

  Background:
    Given `src/commands/drive.mjs`, `src/bundle/commands/{refine,continue,autonomous}.md` after this story

  Scenario Outline: the phase drive composes the flag from the loop key, and nothing when unset
    Given `.aof/aof.config.json` carries <config>
    When `aof work drive <phase> 53/00 --dry-run --json` runs as a real child process in the fixture
    Then `command` is <command>

    Examples:
      | phase     | config                                                            | command                            |
      | refine    | no `work.loop.agents` key                                         | `/aof:refine 53/00`                |
      | refine    | `work.loop.agents.refine.mode: "solo"`                            | `/aof:refine 53/00 --solo`         |
      | refine    | `work.loop.agents.refine.mode: "orchestrated"`                    | `/aof:refine 53/00 --orchestrated` |
      | refine    | `work.loop.agents.continue.mode: "solo"` (refine unset)           | `/aof:refine 53/00`                |
      | continue  | `work.loop.agents.continue.mode: "solo"`                          | `/aof:continue 53/00 --solo`       |
      | continue  | `work.loop.agents.refine.mode: "solo"` (continue unset)           | `/aof:continue 53/00`              |
      | continue  | `work.loop.agents.continue.mode: "Solo"`                          | `/aof:continue 53/00`              |
      | continue  | `work.agents.mode: "solo"` and no `work.loop.agents` key          | `/aof:continue 53/00`              |
      | verify    | `work.loop.agents.continue.mode: "solo"`                          | `/aof:verify 53/00`                |

  Scenario: the two phases are independent
    Given `.aof/aof.config.json` carries `work.loop.agents.refine.mode: "solo"` and `work.loop.agents.continue.mode: "orchestrated"` and `work.agents.mode: "solo"`
    When `aof work drive refine 53/00 --dry-run --json` and `aof work drive continue 53/00 --dry-run --json` run
    Then the first answers `/aof:refine 53/00 --solo` and the second `/aof:continue 53/00 --orchestrated`

  Scenario: the composed command is what the driver is launched with
    Given `.aof/aof.config.json` carries `work.loop.agents.continue.mode: "solo"`
    When `work:drive-continue` runs in-process with a recording session driver
    Then the driver's `command` is `/aof:continue 53/00 --solo` and its brief phase is `continue`

  Scenario Outline: both prompts parse --orchestrated as --solo's twin
    When `src/bundle/commands/<prompt>.md` is read
    Then its `argument-hint` names both `--solo` and `--orchestrated`
    And its `<config>` block states that `--orchestrated` overrides a solo `work.agents.mode` to orchestrated for this run
    And it states that `--solo` and `--orchestrated` together are refused before any role runs
    And it names `work.loop.agents.<prompt>.mode` as the key the loop composes the flag from, falling back to `work.agents.mode`

    Examples:
      | prompt   |
      | refine   |
      | continue |

  Scenario: the autonomous prompt names the surface beside the mode
    When the `<config>` block of `src/bundle/commands/autonomous.md` is read
    Then the paragraph naming `work.loop.concurrency` also names `work.loop.dispatch.concurrency`, `work.loop.agents.refine.mode` and `work.loop.agents.continue.mode`
    And it names `work.dispatch.concurrency` and `work.agents.mode` as their fallbacks
    And `statedValues(sentence, unit)` is `[]` for every sentence of it
    And the prompt's count of `aof work loop` stays exactly 2 and its config-key set is exactly `work.agents`, `work.agents.mode`, `work.codeReview.autoComplete`, `work.dispatch.concurrency`, `work.loop.agents.continue.mode`, `work.loop.agents.refine.mode`, `work.loop.concurrency`, `work.loop.dispatch.concurrency`

  Scenario: FF-7101 binds the three keys and stays green
    When `test/arch/command/acd-prompt-bounds-name-their-home.test.mjs` runs under an isolated global home
    Then `boundStatementProblems(await bundleAssets())` is `[]`
    And every case passes

  Scenario: the renders, the manifest and the lock agree with the source
    When `aof work update --dry-run --json` runs at the repo root
    Then `summary` reads `created` 0, `updated` 0, `deleted` 0 and `drift-warning` 0
    And each of the nine rendered files (`refine`, `continue`, `autonomous` × `.claude`, `.codex`, `.opencode`) contains `--orchestrated` or the three keys as its source does
    And `serializeBundleManifest(generateBundleManifest())` equals the bytes of `src/bundle/manifest.json`

  Scenario: ADR-001 §5 records the amendment
    When `wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md` is read
    Then ADR-001 carries a dated 2026-09-15 amendment naming `work.loop.agents.refine.mode`, `work.loop.agents.continue.mode`, `--orchestrated` and the fallback to `work.agents.mode`
