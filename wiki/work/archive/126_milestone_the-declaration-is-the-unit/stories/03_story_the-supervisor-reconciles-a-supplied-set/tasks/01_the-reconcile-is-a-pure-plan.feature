@executable @ui @distribution @adapter
Feature: The reconcile is a pure plan — rows plus live controllers in, start/stop/retain out, a held declaration untouched by a tick, and an exited child whose row persists started again

  `scripts/test.mjs:183-215` runs `cargo test` over `app/desktop/Cargo.toml`, whose workspace
  excludes `crates/app`, and only `cargo check` over the shell crate — a test written beside the
  spawning code in `supervisor.rs` would never run. The reconcile decision therefore lives in
  `crates/core` as a pure function with its `#[cfg(test)]` beside `supervision.rs`'s existing tests
  (`:182-286`), the same core/shell split 36/ADR-002 already drew. `handle_exit`
  (`app/desktop/crates/app/src/supervisor.rs:493-520`) already treats an exit-0 as `desired =
  false, "stopped"` (`:501-505`); the plan's job is that the next tick starts it again if — and
  only if — its row is still there. The role latch's property — a manual Stop is never overridden
  by the next poll (`:370-376`) — generalises to a `held` flag per controller.

  The plan is told whether a child is DESIRED and whether it is HELD, and nothing else about why it
  stopped. That is ADR-006 §4 made observable: two cases differing only in "did it exit 0" produce
  the same outcome, so an exit-code rule cannot be added without reddening the table.

  `held` IS AN INPUT, AND A NAMED CLEAN EXIT SETS IT. The hold rule the contract beat settled
  (STORY.md `## Notes`, STATE.md): a named clean exit places the same hold an operator Stop places,
  released when the row disappears or lifted by an operator Start. `duplicate-run` means a live run
  exists on that scope and the predicate keeps listing one, so a reconciler that restarted after
  every named clean exit would re-attempt a refused mint every 30 s for as long as the operator's
  own terminal loop ran. That rule is enforced ENTIRELY by who sets `held` — task 03's classifier —
  and costs this plan nothing: the reconcile still has no exit-code rule, and an exit-0 child (a
  clean exit with no NAME) sets no hold and is started again while its row persists. Held is a
  property of the controller, not of the exit; the plan only reads it.

  The two reserved ids are the reconcile's blind spot, deliberately, and in BOTH directions
  (ADR-005 §7). A supplied row carrying `mesh-serve` or `mesh-ui` is not a declaration — the
  daemons are seeded, not supplied, and the poll that would supply them is itself one of them. And
  a daemon controller never has a row, so a reconcile that stopped every controller without one
  would kill `mesh status` on its first tick and never read another answer.

  WHERE EACH STEP IS OBSERVED. The tables and the plan scenarios are `cargo test` over a pure
  `reconcile(rows, live) -> Plan` in `supervision.rs` — rows and live controllers as plain values,
  a plan of start/stop/retain out, nothing borrowed from the shell. Steps that begin "the Rust
  source" are the Node sweep over `app/desktop/**/*.rs` with comments stripped
  (`test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs`), which is the only way to observe
  an absence in a crate `cargo test` never compiles.

  What would quietly undo this: an exit-code rule in the plan ("it exited 0, do not restart"),
  which is completion semantics crossing into Rust; a tick that flips a held controller; the plan
  implemented inline in the shell's poll loop where `cargo test` cannot reach it; a named clean
  exit that leaves no hold, so a `duplicate-run` refusal is re-attempted every thirtieth second;
  and a reserved id admitted on either side of the comparison.

  ADR-006 §3-§5. ADR-005 §7. STATE.md "Level-triggered dissolved the lifetime problem". FF-12606.

  Scenario Outline: the plan for one id
    Given the reconcile input for id <id>, where a row is <row>, a live controller is <controller>, its child's desired flag is <desired>, whether it exited 0 is <exited 0>, and its hold is <held>
    When the plan is computed
    Then the plan for <id> is <plan>
    And the plan names no other id

    Examples: a supplied declaration id
      | id | row     | controller | desired | exited 0 | held | plan   | why                                                          |
      | a  | absent  | absent     | n/a     | n/a      | n/a  | none   | nothing is declared and nothing is running                   |
      | a  | present | absent     | n/a     | n/a      | n/a  | start  | a row with no child starts                                   |
      | a  | absent  | present    | yes     | no       | no   | stop   | a child with no row stops                                    |
      | a  | absent  | present    | no      | yes      | no   | stop   | its row is gone; the controller is retired with it           |
      | a  | present | present    | yes     | no       | no   | retain | both present and running — the steady state                  |
      | a  | present | present    | no      | yes      | no   | start  | THE level-triggered property: an unnamed clean exit holds nothing and aof still says run it |
      | a  | present | present    | no      | no       | no   | start  | the SAME outcome for a child that did not exit 0 — the pair that refuses an exit-code rule |
      | a  | present | present    | yes     | no       | yes  | retain | the operator started it; the tick does not drive it          |
      | a  | present | present    | no      | yes      | yes  | retain | the operator stopped it; a tick never restarts it            |
      | a  | present | present    | no      | no       | yes  | retain | THE HOLD RULE: a named clean exit holds it exactly as a Stop does (STORY.md Notes) |
      | a  | absent  | present    | yes     | no       | yes  | stop   | the row is gone, so the hold is released with it             |
      | a  | absent  | present    | no      | yes      | yes  | stop   | same, for a child that had already exited                    |
      | a  | absent  | present    | no      | no       | yes  | stop   | same, for one held by a named clean exit                     |

    Examples: a reserved daemon id, which the reconcile drives in neither direction
      | id         | row     | controller | desired | exited 0 | held | plan | why                                                     |
      | mesh-serve | present | present    | yes     | no       | no   | none | a supplied row cannot address a seeded daemon           |
      | mesh-serve | present | absent     | n/a     | n/a      | n/a  | none | nor can it create one                                   |
      | mesh-ui    | absent  | present    | yes     | no       | no   | none | a daemon never has a row, and must never be stopped for want of one |
      | mesh-serve | absent  | present    | no      | no       | no   | none | including one the role latch has not started yet        |

  Scenario: one plan carries every outcome, and a hold on one id does not reach its sibling
    Given rows `{a, b, d}` and live controllers `{b, c, d}`, where `b`'s child is running, `c` has no row, `d` is held by an operator Stop, and none of the four is a reserved id
    When the plan is computed
    Then `a` is to be started, `b` is retained, `c` is to be stopped, and `d` is retained
    And all four outcomes occur in this one plan
    And nothing else appears in it

  Scenario: a hold survives every tick until its row goes
    Given a declaration whose controller is held and whose row is present
    When the plan is computed ten times over that unchanged input
    Then every one of the ten plans retains it and none starts it
    When its row disappears
    Then the eleventh plan stops it

  Scenario: the plan is a pure function of what it is handed
    Given the same reconcile input twice, in a different row order
    When the plan is computed from each
    Then the two plans are equal as sets
    And the Rust source shows the reconcile reading no clock, spawning nothing and opening no file

  Scenario: the plan runs under cargo test in the core crate
    Given the repository's test harness
    When its cargo lane runs `cargo test` over `app/desktop/Cargo.toml`
    Then the reconcile plan's tests are among those that run
    And the Rust source shows the shell crate holding no reconcile decision of its own
    And the plan's input carries no exit code, no failure reason and no scope
