@executable @cli @work @work-stream
Feature: A fix appends to the session that wrote the code

  This is the single largest saving available, because a resumed session re-ingests **nothing**
  where a fresh spawn pays the full cache-creation cost to rediscover the tree it is about to edit.
  Milestone 52's signature makes the size of it plain: **13 delta-application runs against 5
  authoring runs**. Twelve of those thirteen currently start cold.

  **Both halves already exist and have never been connected.** The driver already accepts
  `options.resumeSessionId` and appends `["--resume", id]` (`src/agent-session-driver.mjs:653`,
  built for m42's terminal re-attach), and 68/01 made the session id a **persisted fact** on the run
  record (`recordSessionId`, imported at `src/commands/drive.mjs:10`). `--resume` is verified present
  on the installed binary. This task is the join, not new machinery.

  **Degrading is a requirement, not a nicety.** A resume target that no longer resolves — a pruned
  transcript, a run from another machine — must fall back to a cold spawn carrying a brief. A fix
  that refuses to run because it could not be *warmed* is strictly worse than a fix that runs cold,
  and it would turn an optimisation into an outage.

  ADR-008. Task 01 holds the line this must not cross.

  Scenario: a fix resumes the build session that produced the code
    Given a build run that recorded the session it ran as
    And a review of that build that produced findings
    When the fix is spawned
    Then the session is resumed against the build's recorded session
    And the findings are carried as its input

  Scenario: the resumed fix is not handed the tree again
    Given a fix resuming a build session
    When its input is inspected
    Then it carries the findings and the change under review
    And it does not carry the context the resumed session already holds

  Scenario: an unresolvable resume target degrades to a cold spawn
    Given a build run whose recorded session can no longer be resumed
    When the fix is spawned
    Then a fresh session is spawned instead
    And it is handed a compiled brief
    And the fix proceeds

  Scenario: a build that recorded no session degrades the same way
    Given a build run with no recorded session id
    When the fix is spawned
    Then a fresh session is spawned
    And it is handed a compiled brief
    And no session id is invented or derived from a path

  Scenario: the resume target is the build's own session, not the most recent one
    Given an item with several runs across more than one phase
    When a fix resolves its resume target
    Then the target is the session recorded by the build being fixed
    And it is not merely the latest session recorded against the item

  Scenario Outline: resolving a fix's resume target
    Given a prior build run whose session is <state>
    When the fix is spawned
    Then the fix <behaviour>

    Examples: warm where it can be, cold where it must be, never blocked
      | state                              | behaviour                                  |
      | recorded and resumable             | resumes that session                       |
      | recorded but no longer resumable   | spawns cold with a brief                   |
      | never recorded                     | spawns cold with a brief                   |
      | recorded by a run on another node  | spawns cold with a brief                   |

  Scenario Outline: what a resumed fix must still do exactly as a cold one does
    Given a fix that resumed a build session
    When the run is inspected
    Then <behaviour> is unchanged

    Examples: resuming changes the context, not the bookkeeping
      | behaviour                                    |
      | a run record is minted for the fix           |
      | the session id is recorded against that run  |
      | the spend is ingested at settle              |
      | the attempt and retry lineage                |
