@executable @cli @work @work-stream
Feature: Admission survives a control restart, and a resumed park re-acquires its slot

  Independent review found the mesh half reserved nothing that outlived the scheduler. Occupancy
  was read from rows already running, plus a reservation the control process held in memory for
  work it had sent but not yet seen acknowledged. A control restart erases that memory, and a row
  a worker has ACCEPTED but not yet begun running is then counted by nobody — so the next tick
  over-admits onto a machine that is already full.

  The correction is to prove occupancy from the row's own state. A worker-authored `accepted` row
  is durable evidence that admission happened, and it is the only such evidence that survives a
  restart. The once-guard stays exactly what it always was — a record of what has been sent, within
  one scheduler's lifetime, deliberately unpersisted — and is never read as occupancy: a send that
  is never acknowledged must not consume a slot no one can see, forever.

  The second gap is the park's other end. A parked run leaves the counted set, which is the whole
  point — the largest measured lost-time category stops holding capacity. But the release is not a
  right of return. Nothing today re-checks the bound when the human finally answers, so a resumed
  park can walk a target past its bound through a door the tick never sees.

  This task owns the RULE and the door's answer. Making the park itself real is the sibling story's;
  what is settled here is that every path which puts a target back to work asks the same question
  first.

  ONE RESIDUE IS NAMED RATHER THAN ASSERTED, because it was measured. Between the moment the
  scheduler sends work and the moment a worker writes down that it took it, occupancy rests on a
  reservation held inside the scheduler's own scan. An answer arriving in that window, from another
  process, cannot see it — and both are admitted. Closing it durably would mean recording the send
  itself as occupancy, which is the thing this design refuses: a send that is never acknowledged
  would then hold a slot nobody can see, forever. So the promise here is that decisions taken one
  after the other never exceed the bound, and that once a worker has taken the work no answer can
  take that slot. The remaining window is a known hole with a named cost, not an untested claim.

  ADR-006 (2026-08-22 amendment), ADR-007. FF-6911.

  Scenario: an accepted row holds a slot on its own state
    Given a target whose assignments are all accepted but none yet running
    And it holds as many as its bound allows
    When the tick runs
    Then a further row targeting it is not dispatched
    And that row stays assigned for a later tick

  Scenario: occupancy is unchanged by a control restart
    Given a target at its bound whose occupancy the scheduler has observed
    When the control scheduler is restarted
    And the next tick runs
    Then a further row targeting it is still not dispatched

  Scenario: a sent row is not double-counted once it is acknowledged
    Given a row dispatched this scan whose worker then accepts it
    When the counted set for its target is computed
    Then it occupies exactly one slot

  Scenario: a send that is never acknowledged does not hold a slot forever
    Given a row whose directive was sent and which never left assigned
    When later ticks run
    Then it does not occupy a slot on the strength of having been sent
    And the target's capacity reflects only work a worker has taken

  Scenario: each send counts before the next row of the same scan is considered
    Given several assigned rows targeting one idle target
    When a single tick runs
    Then no more are sent than the bound allows
    And the remainder stay assigned for a later tick

  Scenario Outline: what survives a control restart as occupancy
    Given an assignment <situation>
    When the control scheduler is restarted
    And the counted set for its target is computed
    Then it is <treatment>

    Examples: only what a worker durably wrote outlives the scheduler's memory
      | situation                                        | treatment   |
      | a worker has accepted but not yet begun          | counted     |
      | a worker is running                              | counted     |
      | running and coded as waiting on a human          | not counted |
      | still assigned, whose directive was already sent | not counted |
      | still assigned, whose directive was never sent   | not counted |

  Scenario: a row sent before a restart is offered again after it
    Given a row whose directive was sent and which never left assigned
    And its target is under its bound
    When the control scheduler is restarted
    And the next tick runs
    Then that row is dispatched
    And the bound was consulted before it was sent

  Scenario: a parked run's answer is refused while its target is full
    Given a run parked waiting on a human
    And its target has since filled to its bound
    When the answer arrives
    Then the answer is refused with a code saying the target is at capacity
    And the run stays parked
    And no second run is started for it

  Scenario: a parked run's answer is admitted when its target has room
    Given a run parked waiting on a human
    And its target is under its bound
    When the answer arrives
    Then the run resumes
    And it occupies a slot again

  Scenario Outline: whether a parked run's answer is admitted
    Given a run parked waiting on a human
    And its target holds <occupied> other counted rows against a bound of <bound>
    When the answer arrives
    Then the answer is <answer>
    And the run <disposition>

    Examples: a target can be over its bound after the bound is lowered under it
      | occupied | bound | answer   | disposition  |
      | 0        | 1     | admitted | resumes      |
      | 1        | 1     | refused  | stays parked |
      | 2        | 3     | admitted | resumes      |
      | 3        | 3     | refused  | stays parked |
      | 4        | 3     | refused  | stays parked |

  Scenario: a parked run does not count against its own return
    Given a target whose bound is one
    And whose only assignment is a run parked waiting on a human
    When that run's answer arrives
    Then it is admitted
    And it occupies the slot again

  Scenario: an answer refused for capacity can be given again once a slot frees
    Given an answer refused because its target was at capacity
    When work on that target finishes
    And the same answer is given again
    Then the run resumes
    And no second run was started for it

  Scenario: two answers cannot both take the last free slot
    Given two runs parked on one target with one slot free
    When both answers arrive together
    Then exactly one resumes
    And the other is refused as at capacity and stays parked

  Scenario: a tick and an answer decided one after the other never exceed the bound
    Given a target with exactly one free slot
    And an assigned row waiting for that target
    And a run parked on that target
    When the tick runs and the answer arrives after it
    Then exactly one of them took the slot
    And whichever did not is left as it was, still assigned or still parked

  Scenario: an answer takes no slot the scheduler has already given away
    Given a target at its bound because a worker has accepted the work it was sent
    And a run parked on that target
    When the answer arrives
    Then it is refused as at capacity
    And the run stays parked

  Scenario: leaving the park is what rejoins the counted set
    Given a parked run being resumed
    When its capacity is re-acquired
    And it stops being marked as waiting on a human
    Then those happen as one change
    And no moment exists in which it is neither parked nor counted

  Scenario Outline: what occupies a slot on a target
    Given an assignment in state <state> with code <code>
    When the counted set for its target is computed
    Then it is <treatment>

    Examples: occupancy is proved by the row, and only the park releases it
      | state     | code            | treatment   |
      | accepted  | none            | counted     |
      | running   | none            | counted     |
      | running   | some other code | counted     |
      | running   | needs-input     | not counted |
      | assigned  | none            | not counted |
      | reclaimed | none            | not counted |
      | done      | none            | not counted |
      | failed    | none            | not counted |
      | withdrawn | none            | not counted |

  # Two claims deliberately do NOT live here: that occupancy membership has exactly one home in the
  # source, and that every door which starts or resumes work consults it. Both are whole-source
  # enumerations that no behaviour can observe, and both are already declared as FF-6911.
