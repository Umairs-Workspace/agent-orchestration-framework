@executable @cli @work @work-stream
Feature: --quiet silences in-flight lines only — the terminal account is byte-identical, the probe never launches, and the flag exists in three places or not at all

  `work:loop`'s input schema is `additionalProperties: false` (`src/commands/loop.mjs:2035-2047`),
  its `cli.spec.flags` declares five flags (`:2053-2059`) and its `cli.argv` shapes them
  (`:2061-2068`); a flag absent from any of the three does not exist. `cli.launch` returns the body
  only when `--json` is absent (`src/spine/face.mjs:157-165`), so the registered `run()` stays the
  frozen probe (53/ADR-005, `acd-loop-probe-contract`). `53/ADR-016` makes the launcher's terminal
  report the one authoritative account the autonomous wrapper quotes — every driven ref and phase,
  accepted milestones, and on a halt the stop id, the halted ref and the exact `aof work loop
  <range> --resume` command. A flag that could suppress any of that would make the wrapper's promise
  conditional on a flag.

  The ratchet is the flag's direction: silence is the behaviour that has to be asked for.

  THE SCHEMA IS A DECLARATION, NOT A DOOR, AND THIS CONTRACT SAYS SO RATHER THAN PRETENDING
  OTHERWISE. `invoke` (`src/command-core.mjs:316-322`) calls `command.run` without validating the
  input, so nothing at run time refuses an undeclared key; the schema is what the CLI, the trigger
  layer and the bijection controls read. The buildable claim is therefore CONFORMANCE — the check
  `acd-trigger-is-a-caller-not-a-coordinator.test.mjs:140-155` already performs against this very
  schema — and that is what the legs below assert.

  What would quietly undo this: `--quiet` implemented as a `NO_PRINT` swap on `report` itself, which
  silences the halt's resume command too; the same swap reaching the two account lines that are not
  `reportLine` sites — `Nothing to resume in <scope> …` (`:1276`) and the L1 row lines (`:1023`),
  the latter being an L1 invocation's ENTIRE output; the flag accepted by the argv shaper but absent
  from the closed schema, so it exists on the command line and nowhere else; and a `--verbose` that
  makes the loud default the opt-in.

  ADR-002 §4-§6, AMENDED. 53/ADR-016. FF-12602.

  Scenario Outline: under `--quiet`, zero in-flight lines and the same account
    Given two fresh instances of the same fixture, driven with the same injected `now`, one with `--quiet` and one without, both halting <stop>
    When both invocations return
    Then the quiet run's collector holds no `Driving`, `Retrying`, `Resumed`, `Reclaimed` or `Gate …` line
    And the lines from the first `Driven …` row onward are byte-identical between the two runs
    And the loud run holds <loudInFlight> in-flight line(s) the quiet run lacks
    And the last line of both names the stop <stop>, the ref <ref>, the producer <producer> and `aof work loop 03 --resume`, and carries <detail>

    Examples: the stops a fixture reaches, and the detail each account carries
      | stop                | producer                     | ref   | loudInFlight | detail                           |
      | session-needs-input | driver:needs-input           | 03/01 | at least 1   | sessionId=session-1              |
      | run-not-retryable   | run-store:not-retryable      | 03/01 | at least 1   | failureReason=agent_error        |
      | retry-parked        | run-store:retry-parked       | 03/01 | at least 1   | readyAt=2026-08-17T13:00:00.000Z |
      | cap-exhausted       | run-store:attempts-exhausted | 03/01 | at least 3   | attempt=3                        |
      | uat-gate            | work:tasks:counts.uat        | 03/01 | at least 2   | uatCount=1                       |
      | dependency-blocked  | work:next:state=blocked      | 03    | 0            | waitingOn=["2"]                  |

  Scenario: a stop reached before any drive prints the same bytes loud or quiet
    Given a scope that halts `dependency-blocked` before spawning anything, driven twice
    When both invocations return
    Then the two runs' output is byte-identical in full, line for line
    And neither run printed an in-flight line, because none was reachable

  Scenario: a halt under `--quiet` still names its stop, its ref and its resume command
    Given a loop fixture that halts `session-needs-input` under `--quiet`
    When the invocation returns
    Then the last line reports the stop id, the halted ref, the producer and `aof work loop 03 --resume`
    And that line is byte-identical to the same fixture's last line without `--quiet`
    And every `Driven …` row and every `Accepted milestone …` line the loud run printed is printed here too

  Scenario: `--level L1 --quiet` prints exactly what `--level L1` prints
    Given two fresh instances of the loop fixture driven at `--level L1`, one with `--quiet`
    When both invocations return
    Then the two outputs are byte-identical, line for line
    And both are non-empty: one row line per item the walk offers
    And `runL1` reaches no `reportLine` site, which is why classifying by call site rather than by role would have silenced this invocation entirely

  Scenario Outline: the two account lines that are not `reportLine` sites, ruled explicitly
    Given <invocation> against the loop fixture
    When it returns
    Then <output>

    Examples: `--quiet` is a rule about a class of line, not about a call to `report`
      | invocation                                                        | output                                                                                                   |
      | `aof work loop 03 --resume --quiet` with no prior declaration      | the one line `Nothing to resume in 03 — no run carries a loop declaration.` is printed: it is the account |
      | `aof work loop 03 --resume` with no prior declaration              | the same one line, byte-identical                                                                        |
      | `aof work loop 03 --level L1 --quiet`                              | one row line per item the walk offers — the L1 rows are the account, and `--quiet` does not touch them    |
      | `aof work loop 03 --level L1`                                      | the same rows, byte-identical                                                                            |

  Scenario Outline: the flag lands in three places
    Given the registered `work:loop` command
    When <home> is inspected
    Then `quiet` is <declaration>

    Examples: absent from any one of the three and the flag does not exist
      | home                                                     | declaration                                                                                            |
      | the input schema, which is `additionalProperties: false` | a declared `boolean` property, so `{ scope: "03", quiet: true }` conforms to the schema where today it carries an undeclared key |
      | `cli.spec.flags`                                         | a `boolean` flag with a description — six flags where there were five — and the usage line spells `[--quiet]` |
      | `cli.argv`                                               | shaped onto the input only when `--quiet` is passed, exactly as `--resume` and `--dry-run` are          |

  Scenario: the schema stays closed around the one flag that was added
    Given the registered `work:loop` command's input schema
    When `{ scope: "03", verbose: true }` is checked against it
    Then it does not conform: `verbose` is an additional key on a closed schema
    And `{ scope: "03", quiet: true }` does conform
    And `required` is still exactly `["scope"]`, and `properties` gained exactly one key

  Scenario: `--json` still never launches
    Given `aof work loop 03 --quiet --json`
    When it returns
    Then the document is the frozen probe — its ten keys in their order, with `driven` empty
    And no run is minted and the work tree is byte-identical before and after
    And nothing but that one document reaches stdout

  Scenario: the default is loud
    Given `aof work loop 03` with no `--quiet`
    When it drives one phase
    Then at least one in-flight line reaches the launcher's printer before the terminal account
    And no `--verbose` flag is declared anywhere in the command
