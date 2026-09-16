@cli @work @work-stream
Feature: The cache-ratio target is a measured number, and STATE stops calling it open

  70/02 shipped the target mechanism and deliberately did not choose the number. STATE § Still open
  records why: *"The ratio ships with a target mechanism; the number itself wants one measured run
  under 70/01's flags to be chosen honestly rather than guessed at refine."* Until it is set,
  `work.observability.cacheRatioTarget` is absent and every phase reports verdict `—`. This task is
  where that open question is closed, and it can only be closed after 00 has produced a figure to
  close it with.

  **A MISCONFIGURED TARGET IS INVISIBLE, WHICH IS WHY SETTING IT IS NOT THE SAME AS HAVING SET IT.**
  Finding F-09 measured this on the shipped reader: a target of `"1.5"` (a string) or `-1` renders
  **byte-identically to an absent target** — *"No cache-ratio target is configured"*, verdict `—`.
  Nothing else on any operator surface contradicts it: `work.observability` is declared nowhere in
  `schemas/aof.schema.json` (whose `work` object is `additionalProperties: true`, so the key is
  legal and wholly unvalidated), nothing runs Ajv at validate time, and `aof project doctor` reports
  `config-valid` regardless (F-07). **A green validate therefore proves nothing about this key**, and
  the only evidence that the target took is the report stating it. That is what this task verifies.

  **A TARGET CHOSEN TO BE MET IS NOT A TARGET.** The verdict's whole purpose is that a prefix which
  silently stops being shared becomes visible. A number set at or below the worst phase measured
  cannot ever go missed, and would convert the milestone's own instrument into decoration.

  ADR-008 — the verdict reports; it does not enforce. No run is failed, capped, retried or killed on
  a missed target, and this task adds no path that would. Closes finding F-12 with 00 and 01.

  @manual @finding-F-12
  Scenario: the target is set from the warm measurement
    Given a measured cache ratio for this milestone's own phases
    When the target is chosen
    Then it is set in this repo's workspace config
    And the value derives from the measurement rather than from a guess

  @manual @finding-F-12
  Scenario: the report is the evidence that the target took
    Given the target set in the workspace config
    When the report is produced
    Then the report states the target it judged against
    And each measured phase carries a met-or-missed verdict instead of a dash
    And a report still saying no target is configured is treated as the target not having taken

  @manual
  Scenario: the target carries its derivation
    Given a configured target
    When it is recorded
    Then the runs, phases and figure it was taken from are recorded with it
    And a later reader can tell a measured target from a guessed one

  @manual
  Scenario: the target is falsifiable
    Given the measured ratios across the phases
    When the target is chosen
    Then it is chosen so that a prefix which stops being shared would miss it
    And a target at or below the worst measured phase is refused

  @manual
  Scenario: setting the target changes no run
    Given a phase whose measured ratio misses the configured target
    When the report is produced
    Then the verdict is recorded in the report
    And no run is failed, retried, capped or killed as a result

  @manual
  Scenario: STATE stops listing it as open
    Given the target is set and its derivation recorded
    When STATE is read
    Then the open question naming this target is no longer open
    And what replaced it is the measurement, not a decision to defer

  @manual
  Scenario Outline: what the recorded target must carry
    Given a target recorded without <element>
    When the record is reviewed
    Then it is <verdict>

    Examples: an undocumented target is indistinguishable from a guessed one
      | element                        | verdict                                        |
      | the runs it was measured over  | refused — its derivation cannot be checked     |
      | the phases it was taken across | refused — a phase-specific figure is not a target |
      | the date it was measured       | refused — a target ages with the tree          |
      | all three                      | admitted                                       |

  @manual
  Scenario Outline: target values, and what the report must say for each
    Given a cache-ratio target configured as <input>
    When the report is produced
    Then the report states <outcome>

    Examples: F-09 — three of these render identically today, which is exactly why the report is read
      | input                          | outcome                                                    |
      | the measured number            | the target, and a verdict per measured phase               |
      | a number written as a string   | no target configured — the value did not take              |
      | a negative number              | no target configured — the value did not take              |
      | absent entirely                | no target configured — the ratio is still reported         |
