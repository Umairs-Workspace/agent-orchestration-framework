@executable @cli @work @work-stream
Feature: a minted run moves its own item to in-progress, through the ledger, with no caller cooperation

  A minted run is the one unambiguous "work has started" fact the system has, so it is the fact that
  moves the item. Declared as a reactor on `run.started` in `src/effects/table.mjs` — beside its
  mirror, the `run.completed` rollback — rather than remembered at each of the four mint sites, and
  reached by all of them because none can mint without the transition seam (`transitionRunStart`):
  `work:run-start`, `work:resume`, `work:run-retry`, and both of the worker's mints.

  BOUNDED TO not-started|blocked, via the writer's `expectFrom`. A mint against an item already
  `in-review` must not drag it back to the bench, and the self-edge a redelivery asks for is refused
  rather than re-written — which is what makes this reactor idempotent without a dedup key of its own.
  `status-edge-not-applicable` is therefore the SANCTIONED no-op here, the same shape
  `rollback-not-applicable` is for the rollback reactor.

  CASCADE ORDER IS LOAD-BEARING. The advance is a `checkout`-locus step declared BEFORE the
  `local`-locus `publish-projection`, so the snapshot the publish reactor derives from disk carries
  `in-progress`. Without that order the board and the fleet would publish `not-started` for an item
  whose run had just started, which is the lie this story exists to remove.

  DRIFT SELF-HEALS THROUGH MACHINERY THAT ALREADY EXISTED. The d5 file-store reconciler
  (`src/effects/reconcile.mjs`) re-derives `run.started` for a `running` record whose event a crash
  ate. That re-derivation now carries this reactor, so a status the crash window skipped is repaired
  by the next reconcile rather than needing a `doctor` check to report it.

  DELIBERATELY NOT ITS COUNTERPART ON `run.completed`. A run carries no phase — the same run
  vocabulary serves refine, build and verify — so advancing to `in-review` when a run completes `done`
  would mark a refined-but-unbuilt story accept-ready. Everything past `in-progress` is a judgement.

  Scenario: minting a run moves its item from not-started to in-progress
    Given a story whose record doc frontmatter status is "not-started"
    When a run is minted for it through the transition seam
    Then the run record state is "running"
    And the story's frontmatter status is "in-progress"
    And the raised run.started cascade includes the advance-status step

  Scenario: a mint against an item already in-progress writes nothing
    Given a story whose record doc frontmatter status is "in-progress"
    When a run is minted for it through the transition seam
    Then the record doc is byte-unchanged

  Scenario: the reclaim scan rolls a stale run's item back, and the mint that follows moves it forward again
    Given item "20" with a stale running orphan and frontmatter status "in-progress"
    When the restart-time reclaim scan force-fails that run
    Then item "20" frontmatter status is "not-started"
    And the orphan is failed, runtime_offline, and carries a reclaimedAt stamp
    When I then run "aof work run-start 20"
    Then item "20" frontmatter status is "in-progress"
    And "aof work next" offers item "20" again

  # NOT AN ACCEPTANCE CRITERION, recorded so the omission is deliberate: the reactor also skips an
  # event whose payload names no local folder (the worker's no-workspace mint), reporting
  # `no-item-dir` rather than fabricating a path. That is a white-box property of one reactor's
  # payload handling, not a black-box observable — it fails the litmus, so it is not a scenario here.
