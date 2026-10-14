Feature: A retried build recalls and acknowledges its prior attempt before building

  WHY. A developer on attempt 2 cannot ask what happened on attempt 1 (157 SPEC). ADR-004 adds a
  second continue edge, "continue-episodic", beside the unchanged near-miss edge: on attempt 2 or
  later, refresh the index, recall the item's whole delivery history, and name the prior attempt's
  failureReason and findings in the build record before writing code. It captures one completed
  observation, as m153/ADR-004's edges do.

  Rule: R1 · A retried build acknowledges its prior attempt before building

    @manual @cli @work @memory
    Scenario: E1 · attempt 2 names the prior failure and finding before building
      Given a disposable story "39/02" whose attempt-1 run failed with failureReason "cap-exhausted"
      And its VERIFICATION.md declares finding "F-02"
      When continue starts attempt 2 of "39/02"
      Then it runs "aof work memory ingest" and then "aof work memory recall \"\" --item 39/02 --area delivery --all --json" before any implementation
      And the build record names the attempt-1 run, "cap-exhausted" and "F-02" before the first code change
      And exactly one "continue-episodic" observation by actor "developer" is in the story's ledger
      And that observation carries the query and scope as run and a verdict for every returned record

    @manual @cli @work @memory
    Scenario: E2 · a first attempt has no episodic edge
      Given a disposable story on attempt 1
      When continue builds it
      Then no episodic recall runs and no "continue-episodic" observation is recorded
      And the "continue-developer" near-miss edge runs as before

    @manual @cli @work @memory
    Scenario: E3 · with memory off the prior attempt is reported unavailable
      Given a disposable story on attempt 2 in a workspace whose memory backend is "none"
      When continue starts the attempt
      Then the build record says the prior attempt's evidence is unavailable
      And the story's ledger holds one "continue-episodic" observation with records []
      And no acknowledgement of a prior failure is invented

    @manual @cli @work @memory
    Scenario: the prior attempt is the run's retryOf, else the latest earlier terminal attempt
      Given a disposable story whose attempt-3 run has retryOf the attempt-1 run, and whose attempt-2 run was cancelled
      When continue starts attempt 3
      Then the build record identifies the attempt-1 run as the prior attempt

    @executable @docs @work @memory
    Scenario: the authored and rendered continue procedure binds the episodic edge
      Given the authored and rendered continue procedures
      When the registered edge control checks the "continue-episodic" edge
      Then it finds the attempt-2 condition, the ingest-then-recall order and exactly one "--item <ref> --area delivery --all --json" recall
      And it finds one record-recall submission with edge "continue-episodic" and actor "developer"
      And removing that submission makes the control fail naming "continue-episodic"
