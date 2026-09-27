@executable @cli @work @work-stream
Feature: the terminal family is founded as four metered exemptions, its suites are registered once, and FF-5301 admits the one new edge

  ADR-001 §6 and §7. `src/terminal/` holds three members (`screen.mjs`, `session-screen.mjs`,
  `claude-screens.mjs`), under `FLAT_LAYER_THRESHOLD`, so it is an EXEMPTION in
  `test/arch/testing/acd-source-directory-budget.test.mjs`, not a row, on 133's precedent. Its
  suites live in `test/terminal/`, its controls in `test/arch/terminal/`, and its recordings in
  `test/fixtures/claude-screens/`: three more exemptions. `scripts/test.mjs` imports each of the two
  suite indexes once. The driver's one new import is `./terminal/session-screen.mjs`, so FF-5301's
  frozen direct set gains that one entry and its reach ceiling rises from 25 to 28.

  RULINGS (PO, 2026-09-27). (1) Each exemption names every member the milestone plans for it,
  story 01's included, and cites 138/ADR-001, so story 01 edits no budget line. (2) The members:
  `test/terminal/` holds `index.mjs`, `screen-model`, `session-screen-ready`,
  `session-screen-verdicts`, `session-screen-evidence` and story 01's `claude-screens-registry`
  suites (six); `test/arch/terminal/` holds `index.mjs`, FF-13801's `acd-screen-has-one-reader`
  and story 01's FF-13802 `acd-screen-registry-is-recorded` (three); `test/fixtures/claude-screens/`
  holds `ready`, `first-run`, `usage-limit`, and story 01's `trust`, `mcp-approval` and `login`
  (six `.json` files). (3) The `src` root row is not touched: no module is added at the `src/`
  root. (4) FF-5302's frozen seventeen do not move.

  RULINGS (QA, 2026-09-27). (1) Story 01's members do not exist yet when this story lands, so an
  exemption whose `why` names a member that is absent is not a violation; only a directory that is
  absent is (the budget's existing stale-exemption rule). (2) A suite the index imports but does
  not spread, or spreads empty, is a dead suite, so each suite this story lands runs a non-zero
  number of cases on its own under `--only`. (3) The reach is measured with FF-5301's own walker
  after the build and written into the assertion's message with its reason, as reaches 22 to 25
  were.

  Scenario: the source family is an exemption that names its three members
    When `SOURCE_DIRECTORY_EXEMPTIONS` is read from `test/arch/testing/acd-source-directory-budget.test.mjs`
    Then it holds an entry whose `directory` is `"src/terminal"`, whose `why` names `screen.mjs`, `session-screen.mjs` and `claude-screens.mjs` and cites 138/ADR-001
    And the budget's own run over the live tree is green

  Scenario: the root row is unchanged
    When the `src` row of the budget table is read
    Then its count and allowance are what they were at the story's base commit

  Scenario Outline: each test-side directory is an exemption naming its planned members
    When `SOURCE_DIRECTORY_EXEMPTIONS` is read
    Then it holds an entry whose `directory` is `"<directory>"` and whose `why` names <members>

    Examples:
      | directory                    | members                                                                                                                                      |
      | test/terminal                | `index.mjs`, `screen-model`, `session-screen-ready`, `session-screen-verdicts`, `session-screen-evidence` and `claude-screens-registry`       |
      | test/arch/terminal           | `index.mjs`, `acd-screen-has-one-reader` and `acd-screen-registry-is-recorded`                                                               |
      | test/fixtures/claude-screens | `ready`, `first-run`, `usage-limit`, `trust`, `mcp-approval` and `login`                                                                     |

  Scenario: the suites are registered through two indexes and one registry import each
    When `scripts/test.mjs` is read
    Then it imports `../test/terminal/index.mjs` exactly once and `../test/arch/terminal/index.mjs` exactly once, and spreads what each exports
    And each index imports and spreads every suite it names, and decides nothing by `readdir`

  Scenario Outline: each suite this story lands runs its own cases through the registry
    When `node scripts/test.mjs --only <suite>` is run under an isolated `AOF_GLOBAL_HOME`
    Then it runs a non-zero number of cases and exits 0

    Examples:
      | suite                                                   |
      | test/terminal/screen-model.test.mjs                     |
      | test/terminal/session-screen-ready.test.mjs             |
      | test/terminal/session-screen-verdicts.test.mjs          |
      | test/terminal/session-screen-evidence.test.mjs          |
      | test/arch/terminal/acd-screen-has-one-reader.test.mjs   |

  Scenario Outline: the exemptions hold only while the family stays small
    Given a synthesized listing of the live tree in which `<directory>` <state>
    When the shipped `sourceDirectoryBudget` is asked of that listing, with the live table and exemptions
    Then it reports <violations> naming `<directory>`

    Examples:
      | directory                    | state                 | violations                             |
      | src/terminal                 | holds 3 direct files  | no violation                           |
      | src/terminal                 | holds 8 direct files  | no violation                           |
      | src/terminal                 | holds 9 direct files  | one violation saying it now owes a row |
      | test/terminal                | holds 9 direct files  | one violation saying it now owes a row |
      | test/fixtures/claude-screens | holds 6 direct files  | no violation                           |
      | src/terminal                 | is absent             | one stale-exemption violation          |

  Scenario: FF-5301 admits the one new direct import and names the new reach
    When `test/arch/session/acd-session-driver-mesh-blind.test.mjs` is run
    Then its `EXPECTED_DIRECT` holds `terminal/session-screen.mjs` beside the eight it held, and the driver's direct source-import set equals it
    And the root-inclusive reach ceiling is 28, its message names `session-screen.mjs`, `screen.mjs` and `claude-screens.mjs` and cites 138/ADR-001 §7, and the measured reach is 28
    And no denied subtree is entered, and the control is green

  Scenario: the export set does not move
    When FF-5302 is run
    Then the driver's export set is the frozen seventeen, and the control is green
