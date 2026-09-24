@executable @cli @work @work-stream
Feature: the notify family is founded as a metered exemption, and its suites are registered where a runner sees them

  ADR-005 §2. `src/notify/` is a new family of four files (`form.mjs`, `form.d.mts`, `notify.mjs`,
  `discord.mjs`), under `FLAT_LAYER_THRESHOLD`, and so it is an EXEMPTION in
  `test/arch/testing/acd-source-directory-budget.test.mjs`, not a row. Its suites live in a new
  `test/notify/` directory, which is an exemption too. `test/notify/index.mjs` names its suites by
  import and spread, and `scripts/test.mjs` imports that index once. This story writes the budget
  file BEFORE story 06 edits its `test/arch/loop` row.

  RULINGS (PO, 2026-09-23). (1) The two exemption entries name their members and cite 131/ADR-005,
  the way the `src/loop` and `src/diagrams` entries do. (2) `test/notify/` holds `index.mjs` and the
  three suites `notify-form.test.mjs`, `notify-channels.test.mjs` and `notify-discord.test.mjs`. That
  is four members, under the threshold. (3) Every suite's cases run under an isolated
  `AOF_GLOBAL_HOME`, and no case reaches the network: `fetch` is always injected.

  RULINGS (QA, 2026-09-23). (1) The cases are placed by subject: task 01's in
  `notify-form.test.mjs`, task 04's in `notify-discord.test.mjs`, and tasks 02, 03, 05 and 06's in
  `notify-channels.test.mjs`. Task 06 drives `work:status` through the command, so it needs no
  fifth suite here and no new suite anywhere else. (2) A suite the index imports but does not
  spread, or spreads empty, is the dead-suite failure `scripts/test.mjs`'s header names. So each of
  the three must run a non-zero number of cases on its own under `--only`.

  Scenario: the source family is an exemption that names its four members
    When `SOURCE_DIRECTORY_EXEMPTIONS` is read from `test/arch/testing/acd-source-directory-budget.test.mjs`
    Then it holds an entry whose `directory` is `"src/notify"`
    And that entry's `why` names `form.mjs`, `form.d.mts`, `notify.mjs` and `discord.mjs`, and cites ADR-005
    And the budget's own run over the live tree is green

  Scenario: the suite directory is an exemption too
    When `SOURCE_DIRECTORY_EXEMPTIONS` is read
    Then it holds an entry whose `directory` is `"test/notify"`, and the budget's run over the live tree is green

  Scenario: the suites are registered through one index and one registry import
    When `scripts/test.mjs` is read
    Then it imports `../test/notify/index.mjs` exactly once and spreads what it exports
    And `test/notify/index.mjs` imports and spreads each suite in the directory, and decides nothing by `readdir`
    And `node scripts/test.mjs --only test/notify/notify-channels.test.mjs` runs a non-zero number of cases

  Scenario Outline: each notify suite runs its own cases through the registry
    When `node scripts/test.mjs --only test/notify/<suite>` is run under an isolated `AOF_GLOBAL_HOME`
    Then it runs a non-zero number of cases and exits 0
    And `test/notify/index.mjs` both imports and spreads `<suite>`'s exported array, holding the cases of task <tasks>

    Examples:
      | suite                    | tasks              |
      | notify-form.test.mjs     | 01                 |
      | notify-channels.test.mjs | 02, 03, 05 and 06  |
      | notify-discord.test.mjs  | 04                 |

  Scenario Outline: the exemptions hold only while the family stays small
    Given a synthesized listing of the live tree in which `<directory>` <state>
    When the shipped `sourceDirectoryBudget` is asked of that listing, with the live table and exemptions
    Then it reports <violations> naming `<directory>`

    Examples:
      | directory   | state                    | violations                              |
      | src/notify  | holds 4 direct files     | no violation                            |
      | src/notify  | holds 8 direct files     | no violation                            |
      | src/notify  | holds 9 direct files     | one violation saying it now owes a row  |
      | test/notify | holds 4 direct files     | no violation                            |
      | test/notify | holds 9 direct files     | one violation saying it now owes a row  |
      | src/notify  | is absent                | one stale-exemption violation           |
