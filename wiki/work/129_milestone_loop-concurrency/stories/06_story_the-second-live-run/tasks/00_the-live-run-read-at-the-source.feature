@manual @cli @work @work-stream
Feature: the second live run — refine_first driven over a real wave and read at the source

  The milestone was framed from a live run that deadlocked; it is accepted on a live run that
  does not. This is the SPEC § Objective's verifiable outcome, performed once by the operator on
  this repository and read at the source rather than in the loop's account alone. The procedure
  and every reading land in `wiki/work/129_…/STATE.md` (and the target milestone's STATE.md) with
  run ids, lane paths, base shas and the halt's detail. Preconditions are ADR-008 §7's, met FIRST:
  the primary on a branch; HEAD containing every sibling's work a lane must build on; the loop's
  own `wiki/work/<milestone>/` writes accepted as commits under the mesh identity; every other
  dirty file left alone (it blocks only a merge that touches it, by name); the tree DEPLOYED
  (`node scripts/install-local.mjs --skip-ui`, `aof --version` showing the payload build id);
  `loop-diag` on. The target is a milestone whose ready set partitions into a two-member wave
  with a held third — 127's `02`/`04` with `03` held if still live, otherwise the standing test-bed.

  Background:
    Given the operator at the control node with the preconditions above met and recorded

  Scenario: the key is set and the loop is driven over a real wave
    Given `.aof/aof.config.json` carries `work.loop.concurrency: "refine_first"` and `work.agents.mode` is untouched
    When `aof work loop <NN>` runs in the foreground
    Then the account narrates `Wave 1 — dispatching <A>, <B> (bound 3); held: <C>.`
    And `git worktree list` shows two lanes under `.aof/mesh/dispatch-worktrees/` on `aof/mesh/<A>` and `aof/mesh/<B>`

  Scenario: each lane has its own record, heartbeat and grade
    When the two lanes are in flight
    Then each lane's story `runs/` holds one `running` record carrying `brief.lane.worktree` equal to its lane and `brief.loop.loopRunId` equal to the loop's
    And each lane's `runs/.heartbeats.ndjson` grows while its session runs
    And the primary's story `runs/` for `<A>` and `<B>` holds no record yet
    And after each lane's drive its record carries a grade whose failing cases exclude the base's inherited reds

  Scenario: the supervisor sees one loop
    When `aof mesh status --json --declarations` is read while the wave is in flight
    Then exactly one row names the loop's scope and its `loopRunId`
    And the milestone's wave run in the primary is `running` with a fresh `heartbeatAt`

  Scenario: the held member is cut from the merged work
    When lane `<A>` merges home and `<C>` is dispatched
    Then `<C>`'s lane base sha equals the primary's HEAD after `<A>`'s merge
    And `readRuns` on the primary's `<A>` story now returns the `runId` its lane minted

  Scenario: a forced conflict halts by name with the lane intact
    Given the operator hand-edits and commits, in the primary, a file lane `<B>` also changed
    When lane `<B>` finishes and the loop merges
    Then the loop halts with stop `lane-merge-conflict` naming lane, branch, base and tip
    And the primary has no `MERGE_HEAD` and a clean status, and `<B>`'s worktree and branch still exist with its commit
    And after the operator merges `<B>`'s branch by hand, `aof work loop <NN> --resume` reconciles it as already merged, cleans it up and continues

  Scenario: the run ends clean and the readings are recorded
    When the loop completes or halts at the milestone's verify gate
    Then `aof work dispatch --list` reports no live lane
    And the `loop-diag` log ends in a named exit line, never a silent stop
    And STATE.md carries every reading above with its run ids, lane paths, shas and the halt's detail
