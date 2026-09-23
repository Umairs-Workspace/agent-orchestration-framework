@executable @cli @work @work-stream
Feature: The render names the record — phase, cycle against cap, level, attempt, session, node, failure reason and provenance, all read off keys the record already holds

  `work:run-status`'s render (`src/commands/run-status.mjs:90-96`) prints `runId` and `state` per
  run — two of the record's sixteen keys (`src/run-store.mjs:525-544`, read forward at `:552-571`) —
  and none of the eight the loop envelope carries on `brief.loop` (`src/work/loop.mjs:1130-1162`:
  `loopRunId, scope, level, cap, phase, cycle, startedAt, id`). The `--json` adapter passes the whole
  result through (`:99`). The result also carries `fromWorker` and `reportedBy` when the cache
  answered (`:48-72`), and `answeredFrom` on every path. `68/ADR-002`: phase is read from
  `brief.loop.phase`, never minted.

  How every scenario below is driven, so no step is ambiguous about its seam: the render is a pure
  function of what it is handed, so each one calls `runStatusCommand.cli.render(result, faceCtx)`
  directly over a literal result of the shape `run()` returns (the `cli.render(result, {})` idiom
  `test/audit/audit-command.test.mjs:149` already uses), with at least one result taken from a real
  `invoke("work:run-status", …)` through `src/command-core.mjs` so the literals are not a private
  shape. `faceCtx` carries a fixed `now`; the elapsed and heartbeat-age figures it feeds are task
  01's subject, not this one's, and no scenario here asserts them. A `queued` record is a literal
  here of necessity — no verb mints one (`src/run-store.mjs:268`) — and the four-key worker record
  is planted through the projection's own writer (`streamRun`,
  `test/support/cache-read-fixture.mjs:203`), which writes exactly those four keys.

  What would quietly undo this: a render that computes a phase or a cycle instead of reading it; a
  render that hides `fromWorker` so a two-day-old cached `running` (TECH_DEBT item 19) reads as a
  live fact; and the empty-history line changed so that `no runs` stops being the one sentence an
  operator greps for.

  ADR-003 §1. 68/ADR-002. FF-12603.

  Scenario Outline: the loop envelope is READ — what the record holds is named, what it does not hold is not invented
    Given an item whose latest run carries <brief.loop> on its brief
    When `aof work run-status <ref>` renders
    Then that run's line shows exactly <shown> of the phase, the cycle against its cap, and the level
    And it shows no value for any of those three the record does not hold
    And no `undefined`, `null` or `NaN` reaches the output

    Examples: the envelope shapes a record can carry
      | brief.loop                                                  | shown                   |
      | the eight keys — phase `continue`, cycle 2, cap 3, `L2`     | `continue`, `2/3`, `L2` |
      | phase `verify`, cycle 3, cap 3, no `level`                  | `verify`, `3/3`         |
      | phase `refine`, level `L1`, no `cycle`                      | `refine`, `L1`          |
      | cycle 1, cap 1, level `L3`, no `phase`                       | `1/1`, `L3`             |
      | phase `wibble` — a word no phase vocabulary holds — cycle 2, cap 3, `L2` | `wibble`, `2/3`, `L2` |
      | `{}` — a run minted by hand through `work:run-start`        | none                    |
      | a brief whose `loop` is null                                 | none                    |

  Scenario Outline: the lineage and attribution facts are named, and a null is a silence
    Given a run whose `attempt` is <attempt>, `sessionId` is <session> and `node` is <node>
    When the render runs
    Then that run's line shows <shown>
    And it names no session or node the record does not carry

    Examples: the attribution a record can and cannot supply
      | attempt | session   | node         | shown                                           |
      | 1       | `sess-a1` | `win-host-a` | attempt 1, session `sess-a1`, node `win-host-a` |
      | 2       | `sess-a2` | `aof-wsl`    | attempt 2, session `sess-a2`, node `aof-wsl`    |
      | 3       | null      | `aof-wsl`    | attempt 3 and the node, and no session           |
      | 1       | `sess-c1` | null         | attempt 1 and the session, and no node           |
      | 1       | null      | null         | attempt 1 alone                                  |

  Scenario Outline: a state is rendered with the reason and the stamps that go with it, and with nothing else
    Given a run in state <state> with `failureReason` <reason>, `reclaimedAt` <reclaimed> and `resumeAfter` <resume>
    When the render runs
    Then that run's line shows <shown>
    And it shows no failure reason, reclaim marker or resume instant the record does not carry

    Examples: every state, and every failure reason the classifier knows (`src/run-store.mjs:287-301`)
      | state     | reason            | reclaimed | resume                     | shown                                                       |
      | running   | null              | null      | null                       | `running`                                                   |
      | done      | null              | null      | null                       | `done`                                                      |
      | cancelled | null              | null      | null                       | `cancelled`                                                 |
      | queued    | null              | null      | null                       | `queued`                                                    |
      | failed    | `runtime_offline` | stamped   | null                       | `failed`, `runtime_offline`, and that it was reclaimed      |
      | failed    | `timeout`         | null      | null                       | `failed`, `timeout`                                         |
      | failed    | `session_limit`   | null      | `2026-09-08T20:10:00.000Z` | `failed`, `session_limit`, and the instant it resumes after |
      | failed    | `agent_error`     | null      | null                       | `failed`, `agent_error`                                     |
      | failed    | null              | null      | null                       | `failed`, and no reason at all                              |

  Scenario Outline: the heading says which source answered the RUNS
    Given an item whose run history is <answer>
    When the render runs
    Then the heading shows <heading>

    Examples: `fromWorker` is the marker for the RUNS; `answeredFrom` reads `disk` only when this checkout answered BOTH the item and its runs — `:71` hardcodes `cache` for a disk-resolved item whose runs were streamed, and `:73` carries the item's own `cache` through
      | answer                                                                     | heading                                                                          |
      | read from this checkout's own `runs/` dir                                  | the ref and the run count, and no worker marker                                  |
      | the worker projection, `reportedBy` `aof-wsl`                              | the ref, the run count, that the history is the worker's mirror, and `aof-wsl`   |
      | the worker projection with no node on any row, so `reportedBy` is null     | the ref, the run count, that it is the worker's mirror, and no node name         |
      | read from this checkout's `runs/` dir for a ref the CACHE resolved (`answeredFrom` `cache`, no `fromWorker`) | the ref and the run count, and no worker marker |

  Scenario: a worker-streamed record is rendered from what it actually carries
    Given a cache-answered history whose only record carries `runId`, `itemRef`, `state` `running` and `node` and nothing else
    When the render runs
    Then the line shows the run id, `running` and the node
    And it shows no attempt, session, phase, cycle, level or failure reason
    And no `undefined` or `NaN` reaches the output

  Scenario: every run is on its own line, in the order the result holds them
    Given an item with three runs — a `done` first attempt, a `failed` retry and a `running` third
    When the render runs
    Then there are three run lines, one per record, in the order `runs` holds them
    And each line names its own record's state, and no line borrows a fact from another record

  Scenario Outline: the empty-history line is unchanged, whoever answered
    Given <item>
    When the render runs
    Then the output is exactly `<ref> — no runs.`
    And nothing is appended to it — no count, no provenance and no worker marker

    Examples: ADR-003 §1 holds this line fixed on every producing site that can reach it — `:73` with an empty disk read, `:62` and `:50` with an empty cache-answered history. A cache-answered empty history renders the SAME sentence as a disk one: the provenance an operator's tooling needs is in the `--json` document (task 02), and this line stays the one string a script can grep for.
      | item                                                                      |
      | an item with no `runs/` dir at all                                        |
      | an item whose `runs/` dir holds no records                                |
      | an item the worker streams, whose streamed history is empty (`fromWorker` true, `reportedBy` `aof-wsl`) |
      | a ref only a streamed item row answers for, with no streamed runs (`:50`) |
