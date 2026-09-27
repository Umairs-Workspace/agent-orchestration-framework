@executable @cli @work @validate
Feature: A lane that came back under its floor is a finding naming what it walked, never a quiet zero

  A lane with no input produces no candidates, and a pass with no candidates says "nothing to
  propose" — the same sentence a healthy harness with nothing left to fix would produce. The only
  thing that keeps the second sentence meaningful is the first one being unavailable: a lane that read
  nothing says so, by name, in the run where it happened.

  Below the floor is deliberately not the same as zero. A population that shrank by nine tenths is the
  same failure one step earlier, and it is the one that survives longest, because a smaller number
  still looks like a number. The boundary is therefore exact rather than approximate, and it is worth
  stating in a table: at the floor is a read, one short of it is a finding. An implementation can get
  that comparison off by one in either direction, and both directions are silent.

  What a starved lane contributes is nothing at all, rather than an empty set. An empty set flows into
  the rest of the pass and arrives at the far end indistinguishable from "considered, and nothing there
  was worth proposing" — which is exactly the sentence that must not be reachable from a lane nobody
  read. The finding is what stands in its place.

  Alongside that, the finding is emitted with the run, never instead of it. A pass that stopped at its first
  starved lane would suppress two readings in order to report one absence. A change that turns this
  green by lowering a floor until the count clears it, or by treating an unread lane as a lane with
  nothing to say, has broken this criterion rather than satisfied it.

  A floor does not relax when a scope narrows, so a lane starved by the scope it was given is the same
  finding as a lane starved by a store that emptied — and the finding names the scope it was measured
  under, so that "this scope holds no evidence" cannot be misread as "this instrument is broken". The
  one case that raises no lane finding at all is a scope that matched no item, because then no lane ran.

  ADR-007 §1, §3. ADR-001 §5. ADR-012 §13. FF-6205.

  Scenario Outline: what a lane read, against the floor it declared, decides all of it
    Given a lane declaring a floor
    When it comes back having read <count>
    Then the run <finding>
    And the lane <contribution>

    Examples: the boundary is exact, and only one side of it is a finding
      | count                   | finding                              | contribution                    |
      | nothing at all          | carries tune-ran-on-nothing for it   | contributes nothing to the pass |
      | one short of its floor  | carries tune-ran-on-nothing for it   | contributes nothing to the pass |
      | exactly its floor       | carries no such finding for it       | contributes everything it read  |
      | one more than its floor | carries no such finding for it       | contributes everything it read  |
      | many times its floor    | carries no such finding for it       | contributes everything it read  |

  Scenario: the finding says which lane, what it walked, what it got and what it needed
    Given a lane that came back under its floor
    When the finding is read
    Then it names the lane
    And it names the root that lane walked
    And it states the count it read and the floor it missed
    And it names the scope it was measured under
    And it is reported under this pass's own code, distinguishable from the audit's and the acceptor's

  Scenario: the finding is reported alongside what the other lanes found, never instead of the run
    Given one lane below its floor and two lanes above theirs
    When the run is read
    Then it carries the finding for the starved lane
    And it carries the records and the results of the other two lanes
    And the run is not abandoned at the lane that read nothing

  Scenario: every starved lane is named, not the first one
    Given all three lanes below their floors
    When the run is read
    Then it carries one finding for each of them
    And each finding names its own lane, its own root and its own floor

  Scenario: a starved lane contributes nothing rather than an empty set that reads as a pass
    Given a lane that read nothing
    When the pass reports what it produced
    Then no candidate is built from that lane
    And the pass does not report that the lane offered nothing worth proposing
    And the reason nothing came from it is the finding, in the same run

  Scenario: a lane that was read and yielded nothing says something different
    Given a lane whose count is above its floor
    And nothing in what it read that the pass would build a candidate from
    When the run is read
    Then it carries no finding that the lane ran on nothing
    And what it reports is a lane that was read and yielded no candidate

  Scenario: the finding survives both faces
    Given a run in which a lane came back under its floor
    When the run is read as an emitted object and again as a rendered report
    Then the finding is present on both
    And neither face renders that lane as a clean zero
