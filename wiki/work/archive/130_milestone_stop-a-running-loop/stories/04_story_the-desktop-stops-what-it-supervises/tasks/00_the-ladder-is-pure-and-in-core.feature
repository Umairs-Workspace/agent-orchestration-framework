@executable @cli @work @distribution
Feature: the stop ladder is pure and lives in core — stop_step decides the rung, stop_argv forms the verb from the declaration's own argv, and reconcile retains a held id

  ADR-004 §3-§4; FF-13007's cargo half. `app/desktop/crates/app` is EXCLUDED from cargo test, so
  every decision lives in `mesh_desktop_core::supervision` and the shell only applies it — the
  shape 36/ADR-002 gave the restart backoff. `stop_step(presses: u32, since_cancel_ms:
  Option<u64>, grace_ms: u64, exited: bool) -> StopStep` with `StopStep::{ Request, Cancel, Wait,
  Kill, Done }`: `exited` → `Done`; `presses == 1` → `Request`; `presses >= 2` with no cancel yet →
  `Cancel`; `since_cancel_ms >= grace_ms` → `Kill`; otherwise `Wait`. `stop_argv(child:
  &SupervisedChild) -> Option<Vec<String>>` = the row's `argv[0..3]` + `"--stop"` — the admitted
  prefix `["work", "loop", <scope>]` composed at one home (`declarations.mjs` through `argvFor`) —
  and `None` for a reserved id or an argv shorter than three; the argv is formed HERE and never in
  the shell. `STOP_GRACE_MS = 30_000`, counted from the CANCEL's spawn, never from the drain. The
  desktop counts presses only; the VERB escalates. The existing `reconcile` retains a held id while
  its row persists — the hold placed at press 1 is what keeps a tick from driving the child.

  RULINGS (QA, 2026-09-13): `declaration(id)` is the test module's EXISTING helper — argv
  `["work", "loop", <id>]` (exactly three, the shortest argv `stop_argv` admits), label `loop <id>`,
  cwd `C:/Source/umami/aof`; a longer argv is stated literally in its row. A kill needs two
  presses — `since_cancel_ms` is read only when `presses >= 2`, so a clock with fewer presses is
  never a `Kill`. The ladder never inspects the scope: an empty `argv[2]` still forms
  `["work", "loop", "", "--stop"]`, and the VERB's refusal is what the shell surfaces (task 01).
  `stop_step` is total — the clock is compared, never added to or subtracted from, so no input
  panics.

  Background:
    Given the `mesh_desktop_core` crate's `#[cfg(test)]` module in `supervision.rs`, run by `cargo test --manifest-path app/desktop/Cargo.toml` (which `scripts/test.mjs` runs)
    And its existing helpers `declaration(id)` and `controller(id, desired, held)`

  Scenario Outline: stop_step decides the rung from presses, the cancel clock, the grace and the exit
    When `stop_step(<presses>, <since_cancel_ms>, <grace_ms>, <exited>)` is called
    Then it answers `StopStep::<step>`

    Examples:
      | presses  | since_cancel_ms | grace_ms | exited | step    |
      | 0        | None            | 30_000   | false  | Wait    |
      | 1        | None            | 30_000   | false  | Request |
      | 2        | None            | 30_000   | false  | Cancel  |
      | 3        | None            | 30_000   | false  | Cancel  |
      | u32::MAX | None            | 30_000   | false  | Cancel  |
      | 2        | Some(0)         | 30_000   | false  | Wait    |
      | 2        | Some(29_999)    | 30_000   | false  | Wait    |
      | 2        | Some(30_000)    | 30_000   | false  | Kill    |
      | 5        | Some(90_000)    | 30_000   | false  | Kill    |
      | 2        | Some(u64::MAX)  | 30_000   | false  | Kill    |
      | 1        | Some(90_000)    | 30_000   | false  | Request |
      | 1        | Some(u64::MAX)  | 30_000   | false  | Request |
      | 0        | Some(30_000)    | 30_000   | false  | Wait    |
      | 2        | None            | 0        | false  | Cancel  |
      | 2        | Some(0)         | 0        | false  | Kill    |
      | 2        | Some(0)         | u64::MAX | false  | Wait    |
      | 2        | Some(u64::MAX)  | u64::MAX | false  | Kill    |
      | 0        | None            | 30_000   | true   | Done    |
      | 1        | None            | 30_000   | true   | Done    |
      | 1        | Some(90_000)    | 30_000   | true   | Done    |
      | 2        | Some(0)         | 30_000   | true   | Done    |
      | 2        | Some(30_000)    | 30_000   | true   | Done    |

  Scenario: the grace is a named constant, and its boundary is stated through it
    Then `STOP_GRACE_MS` is `30_000`
    And `stop_step(2, Some(STOP_GRACE_MS - 1), STOP_GRACE_MS, false)` is `Wait` and `stop_step(2, Some(STOP_GRACE_MS), STOP_GRACE_MS, false)` is `Kill`
    And `stop_step(1, Some(STOP_GRACE_MS), STOP_GRACE_MS, false)` is `Request` — a drain press with a stale cancel clock is never a kill

  Scenario Outline: stop_argv forms the verb from the row's own admitted prefix
    When `stop_argv(&<child>)` is called
    Then it answers <answer>

    Examples:
      | child                                                                                    | answer                                                                          |
      | `declaration("L1")` — argv `["work", "loop", "L1"]`, exactly three                         | `Some(["work", "loop", "L1", "--stop"])`                                         |
      | a declaration `"L2"` whose argv is `["work", "loop", "129", "--level", "L2", "--resume"]`   | `Some(["work", "loop", "129", "--stop"])` — the tail after the scope is dropped  |
      | a declaration `"L3"` whose argv is `["work", "loop", ""]`                                  | `Some(["work", "loop", "", "--stop"])` — the scope is never inspected            |
      | `SupervisedChild::mesh_serve()`                                                            | `None`                                                                           |
      | `SupervisedChild::mesh_ui()`                                                               | `None`                                                                           |
      | a child with the reserved id `"mesh-ui"` and the argv `["work", "loop", "129"]`             | `None` — the id decides, whatever the argv                                       |
      | a declaration whose argv is `["work", "loop"]`                                             | `None`                                                                           |
      | a declaration whose argv is `["work"]`                                                     | `None`                                                                           |
      | a declaration whose argv is `[]`                                                           | `None`                                                                           |
      | a declaration whose argv is `["mesh", "serve", "--serve"]`                                 | `None` — not the admitted loop prefix                                            |

  Scenario: the ladder is total
    When `stop_step` is called for every `presses` in {0, 1, 2, u32::MAX} × `since_cancel_ms` in {None, Some(0), Some(u64::MAX)} × `grace_ms` in {0, 30_000, u64::MAX} × `exited` in {false, true}
    Then every call answers one of the five variants and none panics

  Scenario: reconcile retains a held id whether or not it is desired
    Given rows naming `L1` and a live controller for `L1` that is `held`
    When `reconcile(&rows, &live)` is called with `desired` true and, separately, with `desired` false
    Then both plans list `L1` under `retain` and nowhere else — a held child that exited is never started by a tick

  Scenario: a declaration whose row has gone is stopped, hold or no hold
    Given no rows and a live controller for `L1` that is `held`
    When `reconcile(&[], &live)` is called
    Then the plan lists `L1` under `stop` — the hold is released with the row

  Scenario: the shell forms no argv of its own
    When `app/desktop/crates/app/src/supervisor.rs` is read
    Then every spawn of a stop passes `stop_argv(&ctl.spec)` and contains no literal `"--stop"`
