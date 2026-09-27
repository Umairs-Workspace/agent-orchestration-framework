@executable @cli @work @board
Feature: Loop state reaches the board through the face that already exists — `brief.loop` on the run records

  Durable loop state is a DECLARATION, never a POSITION (ADR-004 §1), and it rides the `brief`
  bag of every run the loop mints — a bag the run store already persists opaque and verbatim
  (`src/run-store.mjs:337, :352`). So this milestone writes no new persistence code at all: no
  store module, no path builder, no atomic-write seam, no state machine, no 16th record key. The
  consequence an operator sees is that `aof work run-status <ref>` — the ONE face the board reads
  (`src/board-ui.mjs:110-119` is a thin `invoke`, zero logic) — starts carrying loop state with
  no board change whatsoever. `src/commands/run-status.mjs`, `src/board-ui.mjs`, `ui/` and
  `src/run-store.mjs` are not edited by this milestone, so this feature asserts the new fact and
  the UNCHANGED contract in the same breath: if the record's own shape, the empty-history answer
  or the render moved, that is a regression, not a feature.

  The envelope is frozen at seven keys (ADR-004 §2) and every one is answerable from it: which
  loop invocation this run belongs to, what it was scoped to, at what level, under what cap,
  which phase this run is, which gate cycle, and when the LOOP started (not when the run did).
  That last distinction is what makes a loop's aggregate history a one-key filter over runs
  rather than a document some second store would have to keep in step.

  THE SEAM. The loop body runs in-process over a temp-`AOF_GLOBAL_HOME` fixture stream with
  `test/support/mesh-worker-terminal-fixture.mjs`'s `{ptySpawn, which}` injected through the
  declared seam `ctx.agentSessionDriverOptions` (ADR-010 §2) and a scripted
  agent that advances the stream; every assertion then reads the records back through the real
  `work:run-status` — by CLI (`aof work run-status <ref> --json`) and by in-process `invoke`, the
  same two doors the CLI and the board use.
  Mechanised as `test/loop-command-board-state.test.mjs`, imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with
  the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-004 §2 and §5, ADR-005 §3, ADR-010 §2, RESEARCH §Q4.

  Scenario: a driven phase leaves a run whose `brief.loop` carries exactly the frozen seven keys
    Given a fixture stream whose story `03/01` is ready with tasks authored
    And a scripted agent that marks it done and leaves the stream clean
    When I run the loop body for scope `03`
    And I run `aof work run-status 03/01 --json`
    Then the run for the continue phase carries `brief.loop`
    And `brief.loop` carries exactly the keys loopRunId, scope, level, cap, phase, cycle and startedAt
    And it carries no eighth key
    And every key is populated — none is null or an empty string

  Scenario: the values are the loop's own, and they say which run this is
    Given the same fixture and one completed loop over scope `03`
    When I read `03/01`'s runs back
    Then `brief.loop.scope` is `03` — the admitted scope verbatim
    And `brief.loop.level` is `L2`
    And `brief.loop.cap` is the resolved cap, equal to a probe under the same config and flags
    And `brief.loop.phase` is `continue` on the continue run and `verify` on the verify run
    And `brief.loop.cycle` is the 1-based gate cycle for that `(ref, phase)`
    And `brief.loop.startedAt` is an ISO-8601 Z instant

  Scenario: one loop invocation, one `loopRunId`, carried by every run it drives
    Given a fixture stream with two ready stories and a scripted agent that marks each done
    When I run the loop body for scope `03` once
    And I read the runs of `03/01` and `03/02` back
    Then every run the loop minted carries the same `brief.loop.loopRunId`
    And every one carries the same `brief.loop.startedAt` — the LOOP's start, not each run's
    And each run's own `createdAt` differs from the others, so the two facts are distinguishable
    When I run the loop body for scope `03` a second time
    Then the runs it mints carry a different `loopRunId`
    And the two invocations' runs are separable by that one key alone

  Scenario: `work:run-status`'s own contract is unchanged
    Given the fixture stream after one completed loop
    When I run `aof work run-status 03/01 --json`
    Then the document is `{ ref, runs }` exactly as before this milestone
    And every record carries the frozen 15 keys, unrenamed and unreordered
    And no record carries a `loopRunId`, `phase` or `cycle` key of its own — those live inside `brief`
    When I run `aof work run-status 03/01`
    Then the human render is the unchanged `<ref> — N run(s):` list of runId and state
    And it prints no loop line, because this milestone edits no face

  Scenario: an item the loop never drove still answers exactly as it always did
    Given a fixture stream whose milestone `03` was never looped
    When I run `aof work run-status 03 --json`
    Then `runs` is empty and the answer is not an error
    When I run `aof work run-status 03`
    Then the render is the unchanged `03 — no runs.` line

  Scenario: the board's own door returns the same records the CLI prints
    Given the fixture stream after one completed loop
    When I invoke `work:run-status` in-process with `{ ref: "03/01" }`
    Then the result carries the same runs, in the same order, as `aof work run-status 03/01 --json`
    And each record's `brief.loop` is byte-identical between the two doors
    And no face re-shaped, filtered or summarised it on the way out

  Scenario: `brief` is opaque — the loop adds one key and disturbs nothing else
    Given a fixture stream carrying a pre-existing run on `03/02` whose `brief` holds an unrelated key
    When I run the loop body for scope `03`
    And I read `03/02`'s runs back
    Then the pre-existing run's `brief` is unchanged, including its unrelated key
    And the runs the loop minted carry `brief.loop` and whatever else the mint already carried
    And nothing reshaped an existing `brief`

  Scenario: a range loop records against the items it drove, never against the range
    Given a fixture stream with milestones `50`, `51` and `52`, each holding one ready story
    When I run the loop body for scope `50-52`
    Then each driven story's own runs carry `brief.loop.scope` of `50-52`
    And every run record the loop minted belongs to an item it actually drove
    And no run record was minted for an item the loop did not drive

  Scenario: an L1 loop leaves no run at all, so there is no loop state to read
    Given a fixture stream whose story `03/01` is ready
    When I run the loop body for scope `03` with `--level L1`
    And I run `aof work run-status 03/01 --json`
    Then `runs` is empty
    And no `brief.loop` exists anywhere in the fixture — L1 mints nothing to carry one

  Examples: the frozen `brief.loop` envelope (ADR-004 §2), read back through `work:run-status`
    | key       | value on the continue run of a `--level L2` loop over scope 03 | same across the invocation's runs |
    | loopRunId | the id minted by this driving invocation                        | yes                               |
    | scope     | "03" — the admitted scope verbatim                              | yes                               |
    | level     | "L2"                                                            | yes                               |
    | cap       | the resolved cap (config, else 3, else `--cap`)                 | yes                               |
    | phase     | "continue"                                                      | no — per run                      |
    | cycle     | 1 on the first drive of that (ref, phase)                       | no — per run                      |
    | startedAt | the LOOP's start instant, ISO-8601 Z                            | yes                               |

  Examples: what this milestone must NOT have changed, asserted from the outside
    | surface                             | before                          | after one loop                  |
    | `work:run-status` result shape      | { ref, runs }                   | { ref, runs }                   |
    | the run record's key count          | the frozen 15                   | the frozen 15                   |
    | the empty-history answer            | `<ref> — no runs.`, exit 0      | `<ref> — no runs.`, exit 0      |
    | the run-status human render         | runId + state per line          | runId + state per line          |
    | `--json` projection                 | the result, passed through      | the result, passed through      |
