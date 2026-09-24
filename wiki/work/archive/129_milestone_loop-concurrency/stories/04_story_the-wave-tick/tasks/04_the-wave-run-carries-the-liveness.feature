@executable @cli @work @work-stream
Feature: a milestone-level wave run carries the loop's liveness and the supervisor sees one declaration

  ADR-007 §1-§2. The supervisor (`decideSupervisedDeclarations`, `src/mesh/declarations.mjs`,
  the desktop `reconcile`) reads the PRIMARY tree only and lists one row per `brief.loop.scope`,
  relaunching a stale or retryable declaration as `aof work loop <scope> --resume`. A solo wave's
  lane runs live in lanes until they merge, so with nothing in flight in the primary a loop
  that died mid-wave would be invisible. Before dispatching a wave the loop therefore mints ONE
  milestone-level run in the primary — `transitionRunStart(milestoneItem, { brief })` with
  `brief.loop` (`phase: "continue"`, the loop's declaration) and the additive `brief.wave:
  { members, baseCommit, bound }` — and, while any lane is open, keeps it alive on an interval of
  `heartbeatMs / 3`: append `{ runId, at }` to the milestone's `runs/.heartbeats.ndjson` (the
  hook's exact bytes) and call `consumeHeartbeatQueue(milestoneItem)` so `record.heartbeatAt` —
  the only thing `isStale` reads — is fresh. The wave run settles `done` when the wave closes and
  `failed` on a halt; its `driven` row has `ref: <milestone>`, `phase: "continue"`, `wave:
  { members, bound }`. Lane runs carry the wave run's `brief.loop` verbatim except `cycle`, so
  they are CHILDREN of the one declaration and never a second row.

  RULINGS (Three Amigos, 2026-09-13). THE WAVE RUN IS RE-MINTED AFTER EVERY MERGE while any lane
  stays open — settled `done`, then a new one minted before the re-ask — because
  `decideSupervisedDeclarations` reads the scope's latest run by `createdAt` and a merged lane's
  `done` run, minted after the wave run, would otherwise hide a live loop (zero rows). A wave run is
  therefore an EPOCH between merges: `brief.wave.members` names the lanes in flight at its mint plus
  the members admitted right after it, and the milestone never holds two non-terminal runs. THE
  INTERVAL IS A RATIFIED DEPARTURE from FF-6903's letter (`acd-heartbeat-by-consumption`, "no periodic
  self-ping"): that control's subject is a SESSION, whose tool use is its liveness; the wave run has
  no session — the loop process is the actor and its interval is its honest liveness — and the
  control's scan is extended to admit exactly this one timer by name.

  Background:
    Given a fixture milestone `07` with a two-member wave and injected git, child and clock seams
    And `work.loop.heartbeatMs` 900000 in the fixture config

  Scenario: the wave run is minted before the first dispatch and carries the wave
    When the wave runs
    Then the milestone's `runs/` holds a record minted BEFORE `work:dispatch` was first asked
    And its `brief.loop.phase` is `"continue"` and `brief.wave` deep-equals `{ members: ["07/01", "07/03"], baseCommit: <B0>, bound: 3 }`
    And `Object.keys(record.brief.loop)` is the nine loop keys in order
    And `Object.keys(record.brief.wave)` is `["members", "baseCommit", "bound"]` and `members` is in the `work:next` wave's order
    And `brief.wave.baseCommit` equals the primary's HEAD at the mint and each lane's `brief.lane.baseCommit`

  Scenario Outline: the wave run is heartbeated on the interval only while a lane is open
    Given <lanes> lane(s) open and the clock seam advances 300000ms <ticks> time(s)
    When the interval fires
    Then the milestone's `runs/.heartbeats.ndjson` received <lines> line(s), each exactly `{"runId":"<wave run>","at":"<iso>"}` plus a newline
    And `consumeHeartbeatQueue` ran after each append and the record's `heartbeatAt` equals the last `at`
    And `isStale(record, now, 900000)` is false at every sampled instant

    Examples:
      | lanes | ticks | lines |
      | 2     | 3     | 3     |
      | 1     | 1     | 1     |
      | 0     | 3     | 0     |

  Scenario: the interval is cleared when the last lane closes and re-armed for the next wave
    Given a wave whose two lanes close at different instants
    When the last lane closes
    Then no further line is appended however far the clock advances
    And no `setInterval` handle keeps the process alive (`unref`'d, or cleared)
    And a `work:dispatch` ask made while the wave run is still `running` mints no second milestone run (the store refuses `duplicate-run`) and the interval stays armed
    And a wave run is settled before the next one is minted, so the milestone never holds two non-terminal runs

  Scenario Outline: the wave run settles with the wave
    Given the wave <ending>
    When it closes
    Then the wave run's `state` is <state> and its `failureReason` is <reason>
    And `updatedAt` is not before every lane run's `updatedAt` that merged

    Examples:
      | ending                                                    | state       | reason              |
      | merges every lane clean                                   | "done"      | null                |
      | merges every lane with one cleanup refused                | "done"      | null                |
      | halts `lane-merge-conflict` on one lane                   | "failed"    | "agent_error"       |
      | halts `lane-merge-refused` on one lane                    | "failed"    | "agent_error"       |
      | halts `lane-open-failed` at capacity with foreign holders | "failed"    | "agent_error"       |
      | halts `grade-indeterminate` in one lane                   | "failed"    | "agent_error"       |
      | is interrupted once by the operator and drains            | "failed"    | "agent_error"       |
      | is interrupted twice and every child is cancelled         | "failed"    | "agent_error"       |
      | dies with the loop process (no settle) and is resumed     | "failed"    | "runtime_offline"   |

  Scenario: every lane run is a child of the wave run's declaration
    When the wave runs
    Then each lane run's `brief.loop` deep-equals the wave run's `brief.loop` except its `cycle`
    And no lane run's `brief.loop.scope` is the story's own ref
    And no lane run carries a `brief.wave` key and the wave run carries no `brief.lane` key

  Scenario Outline: the wave run is re-minted after every merge, so the loop is never hidden
    Given a wave of `07/01`, `07/03` where <event>
    When the supervisor asks `decideSupervisedDeclarations` at that instant with the primary's items
    Then it yields exactly one row for scope `07`
    And the milestone's runs hold <runs>

    Examples:
      | event                                                        | runs                                                                        |
      | both lanes are open                                          | one `running` wave run                                                      |
      | `07/01` merged, `07/03` still open                           | the first wave run `done`, `07/01`'s lane run `done`, a NEWER wave run `running` |
      | `07/01` merged, then `07/05` admitted while `07/03` is open  | the newest wave run `running` with `brief.wave.members` `["07/03", "07/05"]` |
      | both merged, nothing open                                    | every wave run `done`; the supervisor lists the loop only if a lineage is resumable |

  Scenario: the supervisor lists exactly one row for the loop
    Given the loop is `--supervised`, the wave has merged, and the primary holds the wave run (`running`) plus both lane runs (`done`, minted AFTER the wave run)
    When `decideSupervisedDeclarations` is asked with the primary's items and a `now` inside the staleness window
    Then it yields exactly one row, whose `loopRunId` is the loop's and whose `scope` is `"07"`

  Scenario: an unsupervised loop's wave run lists nothing
    Given the loop is not `--supervised` and the wave run is running and fresh
    When `decideSupervisedDeclarations` is asked
    Then it yields zero rows

  Scenario: a dead loop mid-wave is listed for relaunch on its wave run
    Given the loop is `--supervised` and its process died with both lanes open and the wave run's last heartbeat older than `heartbeatMs`
    When `decideSupervisedDeclarations` is asked with `now` past the staleness window and a resumable lineage
    Then it yields one row for scope `07` whose argv resolves to `aof work loop 07 --resume`
    And the lane runs, still in their lanes, contributed nothing to the answer

  Scenario: the wave run's driven row names the wave
    When the wave runs
    Then `state.driven` contains a row `{ ref: "07", phase: "continue", wave: { members: ["07/01", "07/03"], bound: 3 } }` with its `runId`, `outcome` `"done"` and `attempt` 1
    And that row precedes every lane row in `state.driven`
    And `reportLine` prints `Driven 07 — continue (done).` for it exactly as for any row, and no `Accepted milestone 07.` for it
