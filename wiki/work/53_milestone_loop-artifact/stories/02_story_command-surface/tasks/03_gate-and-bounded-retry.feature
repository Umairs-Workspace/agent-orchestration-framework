@executable @cli @work @validate
Feature: The gate — deterministic `work:validate` between the phases, and a retry the shell actually bounds

  `GATE_ORDER` is frozen (ADR-005 §6) and 54 depends on it: `drive continue` → `work:validate <ref>`
  → on findings, re-`drive continue`, up to the resolved cap → `drive verify`. Deterministic
  before model is true here by construction — `validate` is the only gate this shell runs and it
  reads no model. The bound is the milestone's opening sentence made real: today's cap is a
  sentence in `autonomous.md:14` that a model may skip; here it is a counter the shell enforces
  and cannot skip.

  The cap is READ, never chosen (ADR-009 §1). It resolves from `work.autonomous.maxAttempts` with
  the existing default of 3 — the same key `src/commands/run-retry.mjs:62`,
  `src/commands/resume.mjs:119` and `src/commands/run-start.mjs:200` already read (the measured
  three, ADR-010's corrected FF-5310), and this repo's own `.aof/aof.config.json` already sets. No
  new key, no new default, no new resolution site; `--cap` is an invocation override in the shape
  `work resume --max-attempts` already established, not a second home for the value.

  Two counters, deliberately distinct. `cycle` is the LOOP's: 1-based, per `(ref, phase)`,
  recorded on `brief.loop.cycle`. `attempt` is the STORE's, on the run record. They differ because
  a gate re-drive follows a session that ended `done` — the session was fine, the stream was not —
  so there is no failed prior to retry and the re-drive mints a fresh run at attempt 1 carrying
  cycle 2. Confusing the two would either re-use the store's ceiling for a thing it does not
  measure or invent a second ceiling, and ADR-009 §1 forbids both.

  What 53 does NOT do at the gate: it ships no rubric. The re-drive types the same
  `/aof:continue <ref>` command line the first drive typed; the findings are the RECORD the loop
  reports on exhaustion, not an argument it invents (ADR-009 §2 — 54 supplies the structured
  feedback that rides the retry, and consumes this order and this bound unchanged).

  THE SEAM. The loop body runs in-process over a temp-`AOF_GLOBAL_HOME` fixture stream with
  `test/support/mesh-worker-terminal-fixture.mjs`'s `{ptySpawn, which}` injected through the
  declared seam `ctx.agentSessionDriverOptions` (ADR-010 §2); the scripted
  agent's `onWrite` handler decides whether the phase it was handed FIXES the fixture's seeded
  validation defect or leaves it in place, which is how a red-then-green gate is scripted
  deterministically. The gate itself is composed in-process through the registry
  (`invoke("work:validate", { scope: ref })`), so what the loop reads is the `{findings}` envelope
  — never a parsed render, and never a spawned CLI's exit code.
  Mechanised as `test/loop-command-gate.test.mjs`, imported AND spread in `scripts/test.mjs` inside
  this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with the
  contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-005 §6, ADR-009 §1 and §2, ADR-003 §3, ADR-010 §2 and §7, RESEARCH §Q8.

  Scenario: the gate runs between continue and verify, and no model turn precedes it
    Given a fixture stream whose story `03/01` is ready with tasks authored
    And a scripted agent that marks the story done and leaves the stream clean
    When I run the loop body for scope `03`
    Then the recorded order is: one `/aof:continue 03/01` session, then the validate gate, then one `/aof:verify 03/01` session
    And no session is spawned between the continue settling and the gate running
    And the gate's scope is exactly the ref just driven

  Scenario: a clean gate goes straight to verify
    Given a fixture stream that validates clean
    When I run the loop body for scope `03`
    Then the gate reports zero findings
    And exactly one `/aof:continue 03/01` session was spawned — no re-drive
    And the next session typed is `/aof:verify 03/01`
    And `brief.loop.cycle` on the continue run is 1

  Scenario: findings send the loop back to continue, once, and the cycle counter says so
    Given a fixture stream carrying one validation finding under `03/01`
    And a scripted agent that repairs the stream on its second continue session
    When I run the loop body for scope `03` with a resolved cap of 3
    Then the recorded sequence is continue, gate (1 finding), continue, gate (0 findings), verify
    And exactly two `/aof:continue 03/01` sessions were spawned
    And the two continue runs carry `brief.loop.cycle` 1 and 2
    And both carry the store's own `attempt` of 1 — a gate re-drive is a fresh run, not a retry lineage
    And the second continue types the same `/aof:continue 03/01` command line as the first

  Scenario: the cap is exhausted and the findings are the record
    Given a fixture stream carrying one validation finding under `03/01`
    And a scripted agent that never repairs it
    When I run the loop body for scope `03` with a resolved cap of 3
    Then exactly three `/aof:continue 03/01` sessions were spawned, at cycles 1, 2 and 3
    And no `/aof:verify` session is ever spawned for `03/01`
    And the loop halts with the stop `cap-exhausted`
    And the human report names `03/01`, the cap it reached, and the gate findings that were still outstanding
    And the human report names the exact resume command

  Scenario: a cap of 1 permits no re-drive at all
    Given a fixture stream carrying one validation finding under `03/01`
    And a scripted agent that never repairs it
    When I run the loop body for scope `03` with `--cap 1`
    Then exactly one `/aof:continue 03/01` session was spawned
    And the loop halts with `cap-exhausted` after the first red gate
    And the human report still carries the findings

  Scenario: the cap is read from the existing key, with the existing default
    Given a fixture whose config declares no `work.autonomous` block at all
    When I run `aof work loop 03 --json`
    Then `cap` is 3
    Given a fixture whose config sets `work.autonomous.maxAttempts` to 2
    When I run `aof work loop 03 --json`
    Then `cap` is 2
    When I run `aof work loop 03 --cap 5 --json`
    Then `cap` is 5 — the invocation override wins over config
    And no configuration file was written by any of these runs

  Scenario: the gate reads findings, not an exit code and not a rendered line
    Given a fixture stream carrying two validation findings under `03/01`
    When I run the loop body for scope `03`
    Then the loop's decision is taken from the `{findings}` the command returned
    And it is unaffected by `work:validate`'s CLI exit adapter, which is a face concern
    And no CLI subprocess was spawned to run the gate
    And the reported findings carry the same `path` and `problem` pairs `aof work validate 03/01 --json` reports

  Scenario: the gate does not run after a refine
    Given a fixture stream whose milestone `03` holds no stories
    And a scripted agent that authors one story and marks nothing done
    When I run the loop body for scope `03`
    Then the first typed command line is `/aof:refine 03`
    And no validate gate runs between that session settling and the next `work:next` ask
    And the gate belongs to the continue → verify boundary alone

  Scenario: the cycle counter is per (ref, phase), not per loop and not per item
    Given a fixture stream with two ready stories, each carrying one validation finding
    And a scripted agent that repairs each story on its second continue session
    When I run the loop body for scope `03`
    Then `03/01`'s two continue runs carry cycles 1 and 2
    And `03/02`'s two continue runs carry cycles 1 and 2 — the counter restarts per ref
    And the verify run for each story carries cycle 1

  Scenario: a driven phase that reports done without advancing the item is bounded by the same cap
    Given a fixture stream whose story `03/01` is ready with tasks authored
    And a scripted agent that settles `done` but changes nothing at all
    When I run the loop body for scope `03` with a resolved cap of 3
    Then `work:next 03` keeps answering the same ref
    And the loop drives `03/01` at most `cap` times for that phase
    And it then halts with `cap-exhausted` naming `03/01`
    And the loop never runs unbounded against a stream that is not advancing

  Examples: the cap boundary — how many continue sessions, and where it ends
    | resolved cap | the agent repairs the stream on cycle | continue sessions | verify spawned | outcome                    |
    | 3            | 1                                     | 1                 | yes            | gate clean, verify runs    |
    | 3            | 2                                     | 2                 | yes            | gate clean on cycle 2      |
    | 3            | 3                                     | 3                 | yes            | gate clean on the last cycle |
    | 3            | never                                 | 3                 | no             | halt cap-exhausted         |
    | 1            | never                                 | 1                 | no             | halt cap-exhausted         |
    | 1            | 1                                     | 1                 | yes            | gate clean on the only cycle |
    | 2            | 2                                     | 2                 | yes            | gate clean on the last cycle |
    | 2            | never                                 | 2                 | no             | halt cap-exhausted         |
    | 5            | 4                                     | 4                 | yes            | gate clean on cycle 4      |

  Examples: cap resolution — read, never chosen (ADR-009 §1)
    | config `work.autonomous.maxAttempts` | `--cap` | resolved cap | note                                    |
    | (absent)                             | (absent)| 3            | the existing default, no new one        |
    | 3                                    | (absent)| 3            | this repo's own committed value         |
    | 2                                    | (absent)| 2            | config is honoured                      |
    | 2                                    | 5       | 5            | the invocation override wins            |
    | (absent)                             | 1       | 1            | the no-retry boundary                   |

  Examples: the two counters, and why they differ
    | event                                    | brief.loop.cycle | run record attempt | store mode |
    | first continue on 03/01                  | 1                | 1                  | start      |
    | re-drive after a red gate                | 2                | 1                  | start      |
    | second re-drive after a second red gate  | 3                | 1                  | start      |
    | verify on 03/01 after a clean gate       | 1                | 1                  | start      |
    | resume of an infra-killed continue run   | its own          | 2                  | retry      |
