@executable @cli @work @work-stream
Feature: An unattributed run reports what it cost, and the join that could not place it does not widen to compensate

  Two hundred and sixteen unattributed runs reported as `216` is honest and unusable. The same runs
  reported with their windows and their spend are the same truth, actionable — the difference between
  *"216 things happened that I cannot place"* and *"216 things happened, and here is what they cost"*.

  The temptation, with an empty index, is to widen the join: match the agent's prose against the
  item, or the item's ref against a session directory name. That is exactly FF-6805's retired path
  and the defect it was retired for — a hex substring pulled an unrelated milestone into a snapshot.
  Absence stays reported. The body added here is a FACE change and the contract says so on both
  sides: the detail grows, the join does not.

  The acceptance oracle is committed and independent. `.aof/mine-transcripts.mjs` produced every
  figure in this milestone's SPEC by reading
  `~/.claude/projects/<slug>/<sessionId>/subagents/agent-*.jsonl` directly. When observe reports the
  same totals for the same window, the story is done — and until it does, the discrepancy is the
  finding rather than the miner's problem.

  What would quietly undo this: a fallback that matches anything but a session id; an unattributed
  run silently dropped from the list once the list exists, so the count and the body disagree; and
  reporting zero as a healthy value when `transcriptsFound` is true, which is the state both
  committed snapshots are in today.

  ADR-003. FF-9601.

  Scenario: a milestone whose phases minted runs reports non-zero spend
    Given a milestone whose refine and continue phases each minted a run carrying a session id
    And transcripts exist for those sessions
    When `aof work observe` runs over that milestone
    Then `runs.count` is greater than zero
    And `totalOutputTokens` is greater than zero
    And `activeUnionMs` is greater than zero

  Scenario: an unattributed run keeps its count and gains a body
    Given a transcript whose session matches no run record
    When `aof work observe` runs over the stream
    Then that run is counted among the unattributed
    And it is listed with its session, its active window and its spend
    And it is marked unattributed rather than attributed to any item

  Scenario: the count and the body agree
    Given several transcripts whose sessions match no run record
    When `aof work observe` runs over the stream
    Then the number of listed unattributed runs equals the reported count

  Scenario Outline: the join is on the session id and on nothing else
    Given a transcript session and an item related by <relation>
    When `aof work observe` builds its session index
    Then the run is <outcome>

    Examples: one join, and four near-misses that must not become one
      | relation                                                        | outcome                        |
      | a run record for that item carrying that session id             | attributed to that item        |
      | the item's ref appearing in the session directory name          | unattributed                   |
      | the item's ref appearing in the agent's prose                   | unattributed                   |
      | a session id sharing a hex prefix with another item's           | unattributed                   |
      | a run record for that item carrying a null session id           | unattributed                   |

  Scenario: no second path from a transcript to an item ref exists
    Given the module set this story touches
    When it is examined for transcript-to-item resolution
    Then the session-id join is the only one
    And no ref-substring, prose or heuristic match is present

  Scenario: the totals agree with the independent miner
    Given a milestone whose phase runs carry session ids
    And the committed standalone transcript miner run over the same window
    When both report output tokens and active time
    Then the two agree
