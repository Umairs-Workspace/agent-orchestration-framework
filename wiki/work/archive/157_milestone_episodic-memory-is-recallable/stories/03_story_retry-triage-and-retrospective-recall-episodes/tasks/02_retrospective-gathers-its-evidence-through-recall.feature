Feature: The retrospective gathers its episodic evidence through recall

  WHY. The retrospective reads findings, feedback and runs once, as raw files, so nothing proves the
  memory can return them (157 SPEC). ADR-004 makes recall the evidence path: refresh observability,
  ingest, then one "--all" recall of the item's delivery history. Opening a cited source to check
  it is allowed; enumerating raw files is not. m153's recurrence pass and post-authoring ingest stay.

  Rule: R3 · The retrospective's evidence comes through recall

    @manual @cli @work @memory
    Scenario: E6 · every finding, feedback entry and terminal run is gathered by one recall
      Given a disposable milestone with 3 declared findings, 2 raw feedback rows and 4 terminal runs
      When its retrospective runs
      Then it runs the observability refresh, then "aof work memory ingest", then "aof work memory recall \"\" --item <ref> --area delivery --all --json"
      And the retrospective's evidence cites all 9 records by their sources
      And no FEEDBACK.ndjson, VERIFICATION.md or run record is read except to open a cited source
      And STATE's feedback projection is not counted as further evidence
      And no recall observation is recorded for this evidence step

    @manual @cli @work @memory
    Scenario: E7 · with memory off the episodic evidence is reported unavailable
      Given a disposable milestone in a workspace whose memory backend is "none"
      When its retrospective runs
      Then it reports its episodic evidence as unavailable
      And it does not fall back to reading the raw ledgers

    @manual @cli @work @memory
    Scenario: the retrospective's own open run is absent and the m153 passes remain
      Given a disposable milestone whose retrospective runs inside an open run
      When it gathers its evidence
      Then that open run is not among the recalled records
      And each new lesson still runs the recurrence match before it is written
      And "aof work memory ingest" still runs after the lessons are authored

    @executable @docs @work @memory
    Scenario: the authored and rendered retrospective procedure gathers through recall
      Given the authored and rendered retrospective procedures
      When the registered edge control checks the retrospective's evidence step
      Then it finds the observability refresh, ingest and "--item <ref> --area delivery --all --json" recall in that order
      And it finds the m153 recurrence pass and post-authoring ingest unchanged
      And removing the "--all" recall makes the control fail naming the retrospective
