@executable @cli @work @validate
Feature: Registration, the frozen lists, and a module name the gate itself decides

  The writer registers into the same command core every `work:*` command uses (08/ADR-001), which is
  what makes the registry-derived bijection cover it with no edit. Two frozen lists then move
  deliberately: the `WORK_IDS` census and the `BOARD_DEFERRED` carve-out.

  THE NAME IS FORCED, AND THAT IS THE POINT OF THE GATE. 52/FF-5201 DISCOVERS loop modules from disk
  by two patterns — `src/work-loops*.mjs` and `src/commands/loops-*.mjs` — asserts the discovered set
  equals its expected six, and then asserts every discovered module contains no write call form
  (`test/arch/acd-loop-registry-not-an-item-type.test.mjs:16-19, :27-36, :70-75`). Its own comment
  names this shape as the case it exists to catch: *"a writer `src/commands/loops-init.mjs`"*. So
  adding `--out` to `src/commands/loops-graph.mjs`, or shipping a writer named into the `loops-`
  family, would be red twice over — once for changing the discovered set, once for writing.

  The writer therefore takes the name 78/ADR-009 established for exactly this reason: the registry is
  framework data and read-only by law, and this document is a derived projection that lands outside it,
  so it belongs to the second family — where `src/work-loop.mjs`, `src/loop-bounds.mjs` and
  `src/loop-progress.mjs` already sit. This is the distinction the gate encodes, not an evasion of it,
  and the invariant is asserted independently by this story's own write-scope criteria.

  THE ROUTE AND THE ID DIVERGE, DELIBERATELY. An operator looks for this beside `aof work loops graph`,
  so that is where the route sits; the id and the module carry the family name the gate requires.
  `work:loops-graph` already routes to `aof work loops graph`, so a declared route that is not the id's
  own segments is the established shape and the bijection's mapping covers it.

  THE BOARD DEFERRAL IS A DECISION ALREADY RECORDED. Chore 64 — `done` — closed the `work:loops-*`
  route gap by documented carve-out rather than by route, on the grounds that 52/FF-5202 asserts `ui/`
  never references the loop family, so a served route would be a door no UI is permitted to open. This
  command joins that carve-out with its own entry and its own reason. This story does not reopen 64.

  Scenario: the command is registered once, in the shared core
    Given the command registry
    Then it exposes the loop-document command exactly once
    And the command is reachable from the CLI beside the other loop verbs

  Scenario: the module names sit outside the registry family's discovery patterns
    Given 52/FF-5201's two discovery patterns
    Then no module added by this story matches either pattern
    And FF-5201's expected module list is unchanged
    And its read-only sweep over the registry family is neither widened nor weakened

  Scenario: the frozen renderer's own module gains no write call form
    Given `src/commands/loops-graph.mjs`
    Then it contains no write call form
    And it declares no output-path input
    And FF-5201's sweep over it passes exactly as before

  Scenario: the CLI face and the registered command agree
    Given the registered loop-document command
    When the CLI is invoked for it as a real subprocess
    Then the CLI face and the registry entry expose the same verb and the same flags
    And `--json` emits one parseable document

  Scenario: the frozen command census admits the new id
    Given the frozen `WORK_IDS` list
    Then it carries the new command's id
    And the registry exposes exactly the ids that list names

  Scenario: the command is a documented `BOARD_DEFERRED` member with no served route
    Given the route-coverage control
    Then the new command's op segment is a member of the `BOARD_DEFERRED` set
    And its entry carries the recorded reason for the deferral
    And no `/api/work` route is served for it

  Scenario: the UI gains no reference to the loop family
    Given the `ui/` source tree
    Then it carries no token naming this command, its modules or its id
    And 52/FF-5202's assertion that `ui/` never references the loop family is unchanged

  Scenario: no ACD command wrapper is owed, and its absence is deliberate
    Given the bundle command-parity control
    Then it is scoped to the `work:insert-*` family and does not demand a wrapper for this command
    And this command ships without one, as the four `work:loops-*` read verbs do

  Scenario: every registry read verb and the new writer leave a fixture registry byte-identical
    Given a fixture loop registry
    When the four `work:loops-*` commands and the writer with `--write` all run against it
    Then every file in the registry directory is byte-identical to before
