@cli @work @memory
Feature: The ladder door closes behind the migrated verb, and the frozen lists move with it

  A migration that leaves its old door open is two doors, and `acd-command-route-derived` (rule 4)
  refuses that shape for every routed verb: "a surviving branch must delegate to runCommandFace".
  This task is the subtraction — the ladder branch, the shim and the help tail's hand-written line
  — and the bookkeeping the repository's own gates demand when a `work:*` command is born.

  **FOUR FROZEN LISTS MOVE, EACH FOR ITS OWN REASON.** `command-core-contract`'s `WORK_IDS` census is
  "exactly the known work ids, no more, no fewer", so `work:memory` is added or the registry is
  wrong. `acd-work-command-route-coverage`'s `BOARD_DEFERRED` carve-out takes `memory` with a reason:
  recall is a CLI and hook affordance, and no board button is asked for. `acd-work-command-cli-
  bijection`'s `argsFor` gains the probe (task 00). And `acd-console-log-confined`'s PRINTERS map
  loses its `work/memory.mjs` row, so its ceiling FALLS 12 → 11 — the ratchet's own comment says
  "when either joins the route table its row goes", and a ceiling that may only fall is the
  point. The `commands/mesh/session.mjs` row stays: `aof session` is not this story's.

  **THE MODULE'S HOME IS DECIDED BY A DELIVERED CONTROL.** `acd-source-directory-budget` holds
  `src/commands/` at 67 direct children with allowance 0 — "never a 68th flat sibling" — and every
  control that judges a command module walks `src/commands/**`. So the module founds
  `src/commands/work/`, the family its own id declares, and that directory gets a budget row of its
  own whose `why` names the fold of the other `work:*` commands as a separate item. Founding a
  family with one member is stated, not smuggled: 119/02's rows are the precedent.

  @executable
  Scenario: the ladder holds no memory branch and no memory shim
    Given `src/cli.mjs` read through the comment stripper
    When it is searched for the memory door
    Then no `subcommand === "memory"` branch remains
    And no `workMemoryCommandCli` function remains
    And `workMemoryCommand` is imported by nothing under `src/`
    And `acd-command-route-derived`'s no-second-door rule passes unedited

  @executable
  Scenario: the help text lists the verb where the registry puts it
    Given `aof --help`
    When its output is read
    Then the `Work` family carries a line beginning `aof work memory`
    And the static `Also:` tail no longer names `aof work memory`
    And the tail still names `aof session`

  @executable
  Scenario: the command module founds the work family, budgeted
    Given the repository tree after this change
    When `src/commands/` is counted as the budget counts it
    Then `src/commands/` holds no more direct-child files than its ceiling
    And `src/commands/work/memory.mjs` exists and exports the `work:memory` command
    And `SOURCE_DIRECTORY_BUDGETS` carries a row for `src/commands/work` whose `why` names the fold as a separate item

  @executable
  Scenario: the four frozen lists have moved, and the printer ratchet fell
    Given the four gates after this change
    When each is read
    Then `WORK_IDS` in `command-core-contract` carries `work:memory`
    And `BOARD_DEFERRED` in `acd-work-command-route-coverage` carries `memory` with a stated reason
    And `argsFor("memory")` in `acd-work-command-cli-bijection` is the task 00 probe
    And `PRINTERS` in `acd-console-log-confined` has no `work/memory.mjs` row and `PRINTER_CEILING` is 11
    And `src/work/memory.mjs` calls `console.log` nowhere

  @executable
  Scenario: the seam's existing callers are untouched
    Given every test that imports `runMemory` or `parseMemoryArgv` from `src/work/memory.mjs`
    When the suites in `test/memory/` and `test/command/declared-id.test.mjs` run
    Then they pass with no edit to them

  @executable
  Scenario: story 125's README control goes green
    Given `test/arch/command/acd-readme-names-what-ships.test.mjs` unedited
    When it runs over the shipped README
    Then the row "every command the README spells resolves" passes
    And the five `aof work memory` lines resolve through `deriveRouteTable`
