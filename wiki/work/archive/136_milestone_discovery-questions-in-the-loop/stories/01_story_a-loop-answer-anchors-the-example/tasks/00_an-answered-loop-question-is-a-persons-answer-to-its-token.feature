@executable @cli @work @work-stream
Feature: An answered loop question on a run record is a person's answer to the token its question opens with

  WHY. Under a loop, a discovery question goes out as 131's ask, and the answer comes back through
  "aof work answer", the board or a Discord reply. The run's owner writes it onto the run record's
  "asks" before it resumes the session (131/ADR-003 §6). The harness writes no "toolUseResult" for
  it, so 134's collector never saw it, and an example the operator settled stayed unanchored.
  ADR-001 makes "collectAnswers" read "asks" beside the transcript: one more input to the same
  checker. Nothing is stamped a second time, and the doctor lane and the build door are unchanged.

  THE FIXTURE BELOW: story "7/2" of milestone "7", with "work.examples.enabled" true. Its map holds
  rule R1 with E2 "[stated Q1]" and question Q1 "answered". The transcript store holds no harness
  answer for "7/2 Q1". "The ask" is an "asks" entry on one of the story's run records whose question
  is "7/2 Q1 · Discovery question — rule R1 · A member may hold at most five loans; settles E2."
  followed by the lines "- Yes" and "- No".

  Rule: R1 · An answered loop question anchors the token its question opens with

    Scenario: E1 · an answered ask anchors its token, and the doctor reports nothing
      Given the story's settled run carries the ask with answer "No", answeredAt "2026-10-03T10:02:00.000Z" and by actor "you", via "cli", node "node-7297"
      When "collectAnswers" is called for "7/2"
      Then it returns exactly one record
      And the record's token is "7/2 Q1" and its question is the ask's question verbatim
      And the record's answer is "No" and its at is "2026-10-03T10:02:00.000Z"
      And the record's toolUseId and entrypoint are null and its sessionId is the run's sessionId
      And the record's by is actor "you", via "cli", node "node-7297"
      And "aof work doctor 7/2 --json" reports no "example-provenance-unanchored" finding

    Scenario: E2 · an ask parked at the bound and never answered anchors nothing
      Given the story's run carries the ask with a parkedAt, answer null and answeredAt null
      When "aof work doctor 7/2 --json" is run
      Then it reports "example-provenance-unanchored" at error for "E2"
      And it reports "example-provenance-unanchored" at error for "Q1"

    Scenario: E3 · an answer written while the run is still running anchors
      Given the story's run is in state "running" and carries the ask answered "No"
      When "collectAnswers" is called for "7/2"
      Then it returns one record whose token is "7/2 Q1"

    Scenario Outline: the ask is read from every run of the story and of its parent milestone, in any state
      Given the ask, answered "No", is on a run of "<item>" in state "<state>"
      When "collectAnswers" is called for "7/2"
      Then it returns one record whose token is "7/2 Q1"

      Examples:
        | item | state   |
        | 7/2  | running |
        | 7/2  | done    |
        | 7/2  | failed  |
        | 7    | running |
        | 7    | done    |

    Scenario: an ask tokened for a sibling story is not this story's answer
      Given the parent milestone's run carries an answered ask whose question opens "7/3 Q1 · "
      When "collectAnswers" is called for "7/2"
      Then it returns no record whose token is "7/3 Q1"

    Scenario: the ask's answer is not stamped onto the run a second time
      Given the story's running run carries the ask answered "No"
      When the run is completed with "aof work run-complete 7/2 --outcome done"
      Then the run record's "brief.answers" holds no record whose token is "7/2 Q1"
      And "collectAnswers" for "7/2" still returns exactly one record whose token is "7/2 Q1"

    Scenario: a loop answer and a harness answer both count, in the order they were given
      Given the transcript store holds a harness answer to "7/2 E4" at "2026-10-03T09:00:00.000Z"
      And the story's run carries the ask answered at "2026-10-03T10:02:00.000Z"
      When "collectAnswers" is called for "7/2"
      Then it returns the "7/2 E4" record and then the "7/2 Q1" record

    Scenario: two asks of the same question on two runs are two records
      Given two runs of "7/2" each carry the ask, answered at different times
      When "collectAnswers" is called for "7/2"
      Then it returns two records whose token is "7/2 Q1"

  Rule: R3 · An answer counts from every channel the loop records it on

    Scenario: E6 · a Discord reply from an allowlisted account anchors, and names the account
      Given the story's run carries the ask answered "No" by actor "@ops-lead", via "discord"
      When "collectAnswers" is called for "7/2"
      Then it returns one record whose token is "7/2 Q1"
      And the record's by is actor "@ops-lead", via "discord"

    Scenario: E7 · an answer from the board's reply box anchors
      Given the story's run carries the ask answered "No" by actor "you", via "board"
      When "collectAnswers" is called for "7/2"
      Then it returns one record whose token is "7/2 Q1"
      And the record's by is actor "you", via "board"

    Scenario Outline: no channel is filtered out
      Given the story's run carries the ask answered "No" via "<via>"
      When "aof work doctor 7/2 --json" is run
      Then it reports no "example-provenance-unanchored" finding

      Examples:
        | via     |
        | cli     |
        | board   |
        | discord |
