@executable @cli @work @validate
Feature: Registration, the frozen lists, and the deferral that is a decision

  The command registers into the SAME core every `work:*` command uses (08/ADR-001), which is what
  makes the registry-derived bijection cover it automatically. Two frozen lists then have to move,
  deliberately: the `WORK_IDS` census, and the `BOARD_DEFERRED` carve-out.

  THE DEFERRAL IS A DECISION, NOT AN OVERSIGHT (ADR-008), and the milestone's own `SPEC.md` asked for
  the opposite. Chore 64 — `done` — closed the `work:loops-*` route gap by carve-out rather than by
  route, recording that *"a board face for this family is not a deferral awaiting a decision — it is a
  decision already recorded at 53's gate"*, because 52/FF-5202 asserts `ui/` never references the loop
  family. This command joins that carve-out with its own documented entry, and the SPEC's
  board-reachability scope item is withdrawn.

  THE NAME IS THE OTHER HALF OF THE DESIGN (ADR-009). 52/FF-5201 discovers `src/work-loops*.mjs` and
  `src/commands/loops-*.mjs` from disk, asserts the discovered set equals its expected six, and holds
  every discovered module free of write calls. This command writes, so it must not be discovered — and
  it is not, because it belongs to the execution family (`work-loop.mjs`, `loop-bounds.mjs`,
  `loop-progress.mjs`), which sits outside those patterns by construction.

  Scenario: the command is registered once, in the shared core
    Given the command registry
    Then it exposes `work:loop-record` exactly once
    And the command is reachable as `aof work loop-record`

  Scenario: the CLI face and the registered command agree
    Given the registered `work:loop-record` command
    When the CLI is invoked for it as a real subprocess
    Then the CLI face and the registry entry expose the same verb and the same flags

  Scenario: the frozen command census admits the new id
    Given the frozen `WORK_IDS` list
    Then it carries `work:loop-record`
    And the registry exposes exactly the ids that list names

  Scenario: the command is a documented `BOARD_DEFERRED` member with no served route
    Given the route-coverage control
    Then `loop-record` is a member of the `BOARD_DEFERRED` set
    And its entry carries the recorded reason for the deferral
    And no `/api/work/loop-record` route exists

  Scenario: the UI gains no reference to this command
    Given the `ui/` source tree
    Then it carries no `loop-record` token
    And 52/FF-5202's assertion that `ui/` never references the loop family is unchanged

  Scenario: FF-5201's discovered module set is unchanged by this milestone
    Given 52/FF-5201's two discovery patterns
    Then no module added by this milestone matches either pattern
    And FF-5201's expected module list is byte-unchanged
    And its read-only sweep over the registry family is neither widened nor weakened

  Scenario: the four registry commands remain read-only
    Given a fixture loop registry
    When the four `work:loops-*` commands and `work:loop-record --write` all run
    Then every file in the registry directory is byte-identical to before
