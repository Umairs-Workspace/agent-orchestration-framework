@executable @ui @distribution @adapter
Feature: A held declaration and a halted loop are both visible — Start/Stop by id is a hold, duplicate-run is the fourth named clean exit, an exit-0 child's last line surfaces, and the spawn roster is an allow-list of four

  `SupervisorState` (`app/desktop/crates/app/src/supervisor.rs:74-88`) holds exactly two fixed
  signals, `server_signal` and `ui_signal`, read at six sites in `main.rs` (`:103-104`, `:146`,
  `:224-225`, `:289`, `:422`, `:435`); `SupervisorCommand` (`:111`) is Start/Stop for two named
  children. `CleanExitReason::classify` (`supervision.rs:64`) names three clean exit-1 modes;
  `handle_exit` (`:493-520`) surfaces a named one through `last_clean_exit` and surfaces nothing on
  exit 0. A halting loop prints its stop, ref and exact resume command
  (`src/commands/loop.mjs:2026`, printed to STDOUT through `work:loop`'s one `cli.launch` printer,
  `:2069-2076`) and exits 0 — the sentence the operator most needs, and the one that vanishes.
  `read_tail` (`:534-552`) already keeps the last 4-8 KiB, and `handle_exit`'s `msg` is stdout and
  stderr joined by a newline, so a child that printed only to stdout hands the classifier a tail
  that ENDS in a blank line.

  `duplicate-run` classifies on the store's MESSAGE, not on its code, and this was CONFIRMED at the
  feasibility beat by reading the path end to end. The store refuses a second non-terminal run per
  item with `runError("a non-terminal run already exists for this item", "duplicate-run", 409)`
  (`src/run-store.mjs:589-593`). `work:loop` declares `cli.launch`, so its non-`--json` body is
  awaited by the face and a throw propagates untouched (`src/spine/face.mjs:157-164`) to
  `bin/aof.mjs:5`, which prints `error.message` ALONE — to stderr, with exit 1. The token
  `duplicate-run` is spelled only in the `--json` envelope (`emitJsonErrorEnvelope`), and a
  declaration's argv is `["work","loop",<scope>,"--level",<level>,"--resume"]`, which never asks
  for it. A classifier keyed on the token alone would therefore never fire on the exact spawn this
  story creates. The enum member keeps the ADR's name; the match is on what the child actually
  prints, and both spellings are admitted so a future `--json` caller is not a silent hole.

  THE HOLD RULE, AND WHERE IT IS ENFORCED. A named clean exit places the same hold an operator Stop
  places, released when the row disappears or lifted by an operator Start (STORY.md `## Notes`,
  STATE.md). It is enforced HERE — the classification says whether a hold is placed — and read
  there: task 01's plan only reads `held`, and so keeps no exit-code rule. An exit-0 child is a
  clean exit with no NAME: it places no hold, and a persisting row starts it again next tick. That
  asymmetry is the whole rule, and it is one column of the table below.

  WHERE EACH STEP IS OBSERVED, AND THE TWO SEAMS IT NEEDS. `SupervisorState`, the IPC commands and
  `handle_exit` all live in `crates/app`, which `cargo test` never compiles — so both decisions move
  to pure core functions in `supervision.rs`, and the shell keeps only the applying.
  (a) THE CLASSIFIER. A child's label, whether it exited SUCCESSFULLY, and its tail in; the named
      reason (or none), the ramp signal, the notice to raise (or none) and whether a hold is placed
      out. Its input is the `success: bool` `handle_exit` already receives — never an exit code,
      because a code in the input is the exit-code rule ADR-006 §4 forbids, one seam over.
  (b) THE NOTICE. The standing notice carries the id of the child it names, and a pure function
      decides what stands after a given id starts — the standing notice, or nothing when the
      starting id is the one it names. Today's blanket clear (`supervisor.rs:434`) is what this
      replaces; the IPC view-model still receives a plain string (`main.rs:106`).
  Steps that begin "the Rust source" are the Node sweep over `app/desktop/**/*.rs` with comments
  stripped; "the shell still compiles" is the harness's `cargo check` over
  `app/desktop/crates/app/Cargo.toml` (`scripts/test.mjs:183-215`). The live half — an operator
  Stop that survives ten real ticks on the real supervisor — is task 04's.

  36/ADR-004 §3 states the allow-list of spawnable verbs is `{status, serve, ui}`, but
  `acd-desktop-read-only-fleet` implements a deny-list of five mutation verbs, so a `["work","loop"]`
  spawn passes today by silence. That control is extended in its own file — never a sibling — to a
  named roster of exactly four. The literal `["work","loop"]` therefore appears in the Rust tree
  twice, in the roster and in task 00's runtime gate, and both are the ADMITTED VERB'S NAME — the
  same species as `["mesh","status"]`, and a named exemption from FF-12606's no-loop-vocabulary
  leg, exactly as the role latch is its named exemption for `is_control_node`.

  What would quietly undo this: a third fixed signal field "for loops" (the match one level down);
  `duplicate-run` matched on its code, so a refused launch restart-storms anyway; a named clean exit
  that places no hold, so the refusal is re-attempted every thirtieth second; an exit-0 that DOES
  place one, so a halted-then-relisted loop never comes back; the exit-0 tail surfaced only for
  daemons; a notice that is the whole tail rather than a line; one child's start clearing another
  child's notice, which the blanket clear at `:434` does today and which N children make routine;
  and a new control for the roster beside the existing one.

  ADR-006 §2, §5-§8. 36/ADR-004. FF-12606.

  Scenario: signals live in one map and the six consumers still resolve
    Given the shell crate's source
    When it is inspected with comments stripped
    Then it carries no per-child signal field on the shared supervisor state
    And the server and user-interface signals are resolved through one map by the two reserved ids the core crate names
    And the shell still compiles under the harness's `cargo check`, every consumer in `main.rs` reading the same value it read before

  Scenario: Start and Stop are addressed by id and become a hold
    Given the shell crate's source
    When it is inspected with comments stripped
    Then its Start and Stop commands carry a declaration id rather than naming two fixed children
    And each sets that controller's hold, the flag the reconcile reads
    And the Rust source shows no path by which a tick clears a hold other than the row disappearing

  Scenario Outline: how a child's exit is classified and what the operator is shown
    Given a supervised child that exits <exit> after printing <tail>
    When the exit is classified
    Then it is classified as <reason>
    And its signal becomes <signal>
    And the notice it raises is <notice>
    And a hold is placed: <hold>
    And a backoff is scheduled only when the signal is `restarting`
    And a raised notice replaces the standing one, while raising none leaves the standing one alone

    Examples: the three named clean exits that exist today, unchanged but for the hold they now place
      | exit | tail                                                          | reason                   | signal     | notice                       | hold |
      | 1    | `ui-build-missing`                                            | ui-build-missing         | stopped    | the child's label and reason | yes  |
      | 1    | `listen EADDRINUSE: address already in use 127.0.0.1:4182`    | EADDRINUSE               | stopped    | the child's label and reason | yes  |
      | 1    | `AOF mesh launcher is already running (pid 4242).`            | launcher already running | stopped    | the child's label and reason | yes  |

    Examples: the fourth, and the crash it is currently mistaken for
      | exit | tail                                                                                              | reason              | signal     | notice                       | hold |
      | 1    | `a non-terminal run already exists for this item`                                                 | duplicate-run       | stopped    | the child's label and reason | yes  |
      | 1    | `{"ok":false,"error":"a non-terminal run already exists for this item","code":"duplicate-run"}`    | duplicate-run       | stopped    | the child's label and reason | yes  |
      | 1    | `segmentation fault`                                                                              | not named — a crash | restarting | none                         | no   |
      | 1    | nothing at all                                                                                    | not named — a crash | restarting | none                         | no   |
      | 137  | nothing at all                                                                                    | not named — a crash | restarting | none                         | no   |

    Examples: exit 0, where the halt line lives and where no hold is placed
      | exit | tail                                                                                                                              | reason                | signal  | notice                                   | hold |
      | 0    | `124 — halted on session-needs-input at 124/00 (producer driver:needs-input). Resume with: aof work loop 124 --resume`             | a clean exit, unnamed | stopped | that line, labelled with the child        | no   |
      | 0    | `124 — loop done.`                                                                                                                | a clean exit, unnamed | stopped | that line, labelled with the child        | no   |
      | 0    | the halt line, then the trailing newline `handle_exit` adds for an empty stderr                                                   | a clean exit, unnamed | stopped | the last NON-EMPTY line, labelled         | no   |
      | 0    | nothing at all                                                                                                                    | a clean exit, unnamed | stopped | none                                      | no   |
      | 0    | whitespace only                                                                                                                   | a clean exit, unnamed | stopped | none                                      | no   |
      | 0    | more output than `read_tail`'s bound retains, ending in the halt line                                                             | a clean exit, unnamed | stopped | the last non-empty line of the retained tail — one line, never the whole tail | no |

  Scenario: a notice names one child, and only that child's start clears it
    Given a standing notice raised by a declaration's exit-0 halt line
    When any other supervised child is started or restarted
    Then the standing notice is still that declaration's, unaltered
    When the child the notice names is started again
    Then nothing stands
    And at most one notice stands at a time, so a later one replaces an earlier one rather than accumulating

  Scenario: the spawn roster is an allow-list of exactly four, in the existing control's file
    Given `test/arch/ui/acd-desktop-read-only-fleet.test.mjs`
    When it runs over the Rust tree
    Then it admits exactly `mesh status`, `mesh serve`, `mesh ui` and `work loop`
    And a planted `["work","tune"]` spawn in a synthetic source trips it
    And the five forbidden mutation verbs still trip it
    And no new control file asserts the roster
