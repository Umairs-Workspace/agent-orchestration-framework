@executable @cli @work @work-stream
Feature: held members dispatch after the colliding lane merges, and capacity is dispatch's answer

  ADR-002 §4 and ADR-006. The loop READS the wave (`work:next --through-review` → `wave`,
  `heldSet`), hands `decideWave` the refs its own lanes hold in flight and the set-aside refs,
  and asks `invokeRegistered("work:dispatch", { refs: dispatch })` to admit the rest — the bound
  rides that answer (`bound`, per-member `admitted` / `refused` with code
  `dispatch-capacity-full`) and the loop narrates it, reads no config key and holds no number.
  After EVERY merge the loop re-asks `work:next` and `work:dispatch`: a HELD member (127/03,
  colliding with 02 on `files:`) is offered once 02 is `in-review` and out of the ready set, and
  its lane is cut from the primary's HEAD at that instant — AFTER 02's merge — so it is based on
  02's work by construction. A member refused `at-capacity` while this loop has lanes in flight is
  re-asked as those lanes close; `at-capacity` with NO lane of this loop in flight means foreign
  lanes hold the slots (`holders`) and the loop halts `lane-open-failed` with producer
  `work:dispatch:at-capacity`, naming them and `aof work dispatch --list` — it never polls foreign
  state. A wave of ONE still gets a lane (ADR-001 §5). An EMPTY wave with a non-empty `heldSet`
  and lanes in flight waits for a merge; with nothing in flight it is a `dependency-blocked` halt
  naming the held refs (the engine's existing shape for `held`).

  Background:
    Given a fixture milestone `27` with stories `27/02`, `27/03`, `27/04`, `27/05` where `27/02` and `27/03` both declare `src/cli.mjs` in `files:` and `27/04`, `27/05` are disjoint
    And `work.dispatch.concurrency` 3 and injected git, child and command seams

  Scenario: the first wave is the write-disjoint pair and the collider is held
    Given `27/05` is `done`
    When the BUILD phase starts
    Then `work:next` answered `wave: [27/02, 27/04]`, `heldSet: [27/03]`
    And `decideWave` was handed `live: []`, `setAside: []` and answered `{ dispatch: ["27/02", "27/04"], hold: ["27/03"] }`
    And `work:dispatch` was asked with `refs: ["27/02", "27/04"]` and lanes opened for both
    And the narration says `Wave 1 — dispatching 27/02, 27/04 (bound 3); held: 27/03.`

  Scenario: the held member is dispatched only after the colliding lane merged, from the merged HEAD
    Given `27/02`'s lane finishes, is graded clean and merges to `main` at commit M1 while `27/04` is still open
    When the loop re-asks after the merge
    Then `work:next` answers `wave: [27/03]` and `work:dispatch` is asked for `27/03`
    And `27/03`'s lane `baseCommit` is M1 and its `brief.lane.baseCommit` is M1
    And `27/03` was never dispatched before M1 existed

  Scenario: a lane is re-asked for nothing it already holds
    Given `27/04` is still in flight when the loop re-asks
    When `work:next` answers `wave: [27/04, 27/03]`
    Then `work:dispatch` is asked with `refs: ["27/03"]` only

  Scenario Outline: admission is the bound against the wave, in wave order, and the rest wait for a lane to close
    Given `work.dispatch.concurrency` <bound>, no foreign lane, and `work:next` answers a wave of <wave>
    When the BUILD phase asks `work:dispatch`
    Then <admitted> are admitted and their children are spawned before any of them settles
    And <refused> are refused `dispatch-capacity-full` and narrated `<ref> — at capacity (<bound>/<bound>), waiting for a lane to close.`
    And after the first merge the refused are re-asked and admitted, in wave order

    Examples:
      | bound | wave                     | admitted             | refused        |
      | 1     | `27/04`                  | `27/04`              | none           |
      | 1     | `27/02, 27/04`           | `27/02`              | `27/04`        |
      | 1     | `27/02, 27/04, 27/05`    | `27/02`              | `27/04, 27/05` |
      | 2     | `27/02, 27/04`           | `27/02, 27/04`       | none           |
      | 2     | `27/02, 27/04, 27/05`    | `27/02, 27/04`       | `27/05`        |
      | 3     | `27/02, 27/04, 27/05`    | `27/02, 27/04, 27/05` | none          |

  Scenario Outline: foreign holders count against the bound, and only a fully foreign capacity halts
    Given `work.dispatch.concurrency` <bound> and <foreign> foreign lane(s) under the dispatch root that this loop did not open
    When `work:next` answers a wave of <wave> and the BUILD phase asks `work:dispatch`
    Then <admitted> are admitted
    And the loop's answer to the refusal is <answer>

    Examples:
      | bound | foreign | wave           | admitted | answer                                                                                  |
      | 2     | 1       | `27/02, 27/04` | `27/02`  | wait; `27/04` is re-asked after `27/02`'s merge and admitted while the foreign lane still holds its slot |
      | 2     | 2       | `27/02, 27/04` | none     | halt `lane-open-failed` / `work:dispatch:at-capacity` naming both holders                |
      | 1     | 1       | `27/04`        | none     | halt `lane-open-failed` / `work:dispatch:at-capacity` naming the holder                  |
      | 3     | 3       | `27/02`        | none     | halt `lane-open-failed` / `work:dispatch:at-capacity` naming three holders               |
      | 2     | 1       | `27/02` after `27/04` merged and closed, foreign still holding | `27/02` | admitted — one slot is free once this loop's lane closed |

  Scenario: a wave of one still gets a lane, whichever answer shape dispatch gives
    Given only `27/04` is ready
    When the BUILD phase runs
    Then `work:dispatch` is asked with `refs: ["27/04"]` and its `action: "open"` answer (`worktree`, `branch`, `bound`) is read exactly as a `dispatched[]` entry would be
    And `27/04` is driven in a lane, not in the primary
    And when that single open throws instead of answering, the loop halts `lane-open-failed` naming the error

  Scenario: at capacity with own lanes in flight waits for a lane to close
    Given `work.dispatch.concurrency` 1 and `27/02` in flight
    When `work:dispatch` refuses `27/04` with `dispatch-capacity-full`
    Then the narration says `27/04 — at capacity (1/1), waiting for a lane to close.`
    And no `work:dispatch` ask is made until `27/02` closes, and `27/04` is then re-asked and admitted

  Scenario: at capacity with no own lane in flight is a named halt
    Given `work:dispatch` refuses every member with `dispatch-capacity-full` and `holders` naming two foreign lanes
    When the BUILD phase starts
    Then the loop halts with stop `lane-open-failed` and producer `work:dispatch:at-capacity`
    And the halt's details carry `holders` as the two lanes' refs with their `lastActivityAt`, `occupied` 3, `bound` 3 and the remedy `aof work dispatch --list`
    And the loop made no further `work:dispatch` ask and the wave run is `failed`

  Scenario: an empty dispatch with held members and nothing in flight is dependency-blocked
    Given `27/04` was set aside (handed to its plan) and `work:next` answers `wave: [27/04]`, `heldSet: [27/03]` with no lane open
    When the BUILD phase asks and `decideWave` answers `{ dispatch: [], hold: ["27/03"] }`
    Then the loop halts with stop `dependency-blocked` naming `27/03` in its `skipped` detail
    And no lane is opened and no `work:dispatch` ask is made

  Scenario: an empty dispatch with held members and a lane in flight waits for the merge
    Given `27/02` is in flight (its primary STORY.md still `not-started`) and `work:next` answers `wave: [27/02]`, `heldSet: [27/03]`
    When the loop re-asks and `decideWave` answers `{ dispatch: [], hold: ["27/03"] }`
    Then no halt is reported and no `work:dispatch` ask is made
    And after `27/02` merges the re-ask answers `wave: [27/03]` and `27/03` is dispatched

  Scenario: the bound is narrated from dispatch's answer, never read from config
    Given the fake `work:dispatch` answers `bound: 7` whatever the config says
    When the wave runs
    Then every narrated bound is `7`
    And `src/loop/wave.mjs` contains no read of `config.work.dispatch` or `config.work.loop` and no numeric concurrency literal
