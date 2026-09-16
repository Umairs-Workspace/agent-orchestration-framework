@executable @ui @distribution @adapter
Feature: The poll supplies the set every tenth tick — one interval, one spawn, the flag on every tenth, the role latch untouched, and every declaration spawn trusted and rooted

  `poll_loop` (`app/desktop/crates/app/src/supervisor.rs:331-380`) ticks one
  `tokio::time::interval(POLL_INTERVAL)` of 3 s (`:62`) and spawns
  `form_mesh_status_spawn(&resolved)` — the resolved absolute `aof` plus
  `["mesh","status","--json"]` (`app/desktop/crates/core/src/resolve.rs:129-134`). The pure cadence
  model is `poll.rs` (`run_cadence`, `FleetDataCommand::mesh_status_json`), which the
  `@executable` scenarios of 36/00 exercise. `supervise_child` (`:386-488`) spawns every child from
  `resolved.path` with a plain argv, sets no `current_dir`, and assigns it to the Job Object
  (`assign_to_job`, `:429`). The role latch starts the server once when the poll says control
  (`:370-376`).

  36/ADR-004's "no second cadence" is about exactly this: one interval, one command, and the
  reconcile rides every tenth tick rather than a second loop. `--declarations` is a flag on the one
  admitted verb, so the flagged tick issues the SAME command, not a second one — which is what
  keeps `acd-desktop-single-data-path` satisfied without an edit.

  WHERE EACH STEP IS OBSERVED, AND THE TWO SEAMS IT NEEDS. A real `tokio::time::interval` and a
  real `Command::spawn` live in `crates/app`, which `cargo test` never compiles — so the cadence
  and the spawn FORM are pure core, and only their absences are swept.
  (a) THE CADENCE. `poll.rs` grows a pure per-tick decision — the tick number in, whether this poll
      carries `--declarations` out — and `run_cadence` records the argv AND the tick it rode on.
      36/00's two delivered `poll.rs` tests drive ticks 1-3, none of which is flagged, so they stay
      green untouched.
  (b) THE SPAWN FORM. A child's spawn form is produced by a pure function over the child and the
      resolved `aof`, returning program, args and working directory — the shell then turns that one
      value into `Command::new`/`args`/`current_dir`. `resolve.rs`'s `SpawnForm` is the value it
      returns and it gains `cwd`, `None` for the two daemons; `form_mesh_status_spawn` is unmoved.
  Steps that begin "the Rust source" are the Node sweep over `app/desktop/**/*.rs` with comments
  stripped (`test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs`). The live parenthood of a
  spawned child — that it really is in the Job Object and really has no console — is task 04's, on
  the real supervisor, because no fixture substitutes for it.

  What would quietly undo this: a second `tokio::time::interval` for declarations; the flag on
  every tick (167 ms of aof at 3 s, paid by the fleet view too); a declaration spawned without its
  `cwd` so identity derives from the app's launch directory; a bare `Command::new("aof")`; the
  `cwd` joined into the argv or quoted as though a shell would read it; a second spawn site that
  skips the Job Object; and the server's role latch replaced by a row from the answer, which has no
  base case.

  ADR-005 §2, §5. ADR-006 §3. 36/ADR-004. FF-12606.

  Scenario Outline: how many of a run's polls carry the declarations flag
    Given the pure cadence driven for <ticks> ticks
    When the fleet-data commands issued are recorded
    Then <polls> `mesh status --json` polls were issued and no other fleet-data command
    And <flagged> of them also carry `--declarations`
    And the flagged ticks are <which>

    Examples: the cadence, at and around its boundary
      | ticks | polls | flagged | which      | why                                                       |
      | 0     | 0     | 0       | none       | a supervisor that has not ticked has reconciled nothing   |
      | 1     | 1     | 0       | none       | the first tick is a fleet poll; no reconcile is due yet   |
      | 9     | 9     | 0       | none       | the last tick below the first reconcile                   |
      | 10    | 10    | 1       | 10         | 30 s at the 3 s interval (ADR-005 §2)                     |
      | 11    | 11    | 1       | 10         | the flag does not stick to every later tick               |
      | 20    | 20    | 2       | 10, 20     | the second reconcile is a further 30 s, not a further 3 s |
      | 30    | 30    | 3       | 10, 20, 30 | the headline count                                        |

  Scenario Outline: the spawn form a child produces
    Given <child> whose argv is <argv> and whose `cwd` is <cwd>
    When its spawn form is produced
    Then the program is the resolved absolute co-located `aof` path
    And the arguments are that argv as discrete strings, unquoted and unjoined
    And the working directory is <working directory>

    Examples: the seeded daemons, whose spawn is unchanged
      | child                | argv                          | cwd    | working directory                       | why                                    |
      | the mesh server      | ["mesh","serve","--serve"]    | none   | not set — inherited, exactly as today   | 36/ADR-002's spawn is reused verbatim  |
      | the mesh web UI      | ["mesh","ui"]                 | none   | not set — inherited, exactly as today   | same                                   |

    Examples: declaration rows
      | child                | argv                                                | cwd                                  | working directory | why                                                    |
      | a declaration        | ["work","loop","124","--level","L2","--resume"]     | C:/Source/umami/aof                  | that path         | identity comes from the workspace, not the launcher    |
      | a declaration        | ["work","loop","126","--level","L3","--resume"]     | C:/Source/Umami User/my project      | that path         | a space in a path is not a shell problem when there is no shell |
      | a declaration        | ["work","loop","126/03","--level","L2","--resume"]  | C:/Source/umami/aof/.aof/worktrees/126-03 | that path    | two declarations on one node need not share a directory |

  Scenario: a row the parse dropped never reaches a spawn form at all
    Given a document whose rows are one with an empty argv and one with no `cwd`
    When it is parsed and the supervised set is composed
    Then neither row is in the set, so neither has a spawn form to produce
    And the set's only members are the two seeded daemons, whose forms are unchanged

  Scenario: one spawn site, and every child joins the same Job Object
    Given the shell crate's source
    When it is inspected with comments stripped
    Then exactly one function spawns a supervised child, and it assigns every child it spawns to the Job Object
    And it sets each child's working directory from the child's own `cwd` and from nowhere else
    And no spawn passes a bare program name or a shell-string command

  Scenario: the role latch is unchanged and no second interval exists
    Given the shell crate's source
    When it is inspected with comments stripped
    Then it constructs exactly one poll interval
    And the server is still started once by the role latch and never by a declaration row
    And the user-interface daemon is still started immediately

  Scenario: controllers come and go with rows across successive ticks
    Given a live set holding only the two seeded daemons
    When the plan for a tick supplying one declaration row is computed and applied to that set
    Then the resulting live set holds that id, and the plan started it
    When the plan for a following tick supplying no rows is computed and applied to that set
    Then the plan stops that id and the resulting live set holds it no longer
    And the two daemon ids are in the live set unchanged after both ticks, named by neither plan
