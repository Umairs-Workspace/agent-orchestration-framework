@executable @cli @work @work-stream
Feature: The local slot is the lane, counted before a lane is opened

  Independent review rejected the first answer to this half. A production caller for the bounded
  pool was supplied, and the pool's lane frees the instant the worktree exists — before any agent
  starts. So the peak it measures is worktree-CREATION concurrency, and the process that does the
  work is spawned later, by an orchestrator, out of this command's reach. A process-local pool
  cannot bound the lifetime of work it neither starts nor owns, and reporting a materialisation
  peak as agent concurrency would publish exactly the number-nothing-obeys this milestone is named
  after.

  The lane is what actually spans the worker's lifetime: created before the developer is spawned,
  because there is nothing to build in otherwise, and removed only when the work merges back. It is
  git's own durable record, readable by a process that opened none of it — which is what the retired
  lease store was reached for and is not needed for. Counting it introduces no lease table, no claim
  file, no column and no run-record write.

  A quiet lane still holds its slot. Quiet means one thing only — no file change for ten minutes —
  which is what a long test run, a startup grace and a parked run all look like. Releasing on quiet
  would over-admit during precisely the states this milestone introduces.

  The cost is stated rather than discovered: a lane whose agent died holds capacity until someone
  sweeps it. That is the safe direction, the recovery verb already exists, and the lane is named in
  the report rather than mysterious.

  ADR-006 (2026-08-22 amendment). FF-6910.

  Scenario: a machine already at its lane bound refuses the next dispatch
    Given a machine holding as many dispatch lanes as the bound allows
    When a further ref is dispatched
    Then it is refused as at capacity
    And that ref is still ready to be dispatched later

  Scenario: the refusal leaves nothing behind to clean up
    Given a dispatch refused because the machine was at its lane bound
    When the live lanes are inspected
    Then no lane exists for the refused ref
    And the lane count is what it was before the refusal

  Scenario: re-dispatching a ref that already holds a lane is admitted at the bound
    Given a machine at its lane bound
    And one of those lanes belongs to a ref being dispatched again
    When that ref is dispatched
    Then its existing lane is returned
    And no second slot is consumed

  Scenario: each lane opened counts against the next member of the same request
    Given a request to dispatch more refs than the bound allows
    When it is dispatched
    Then no more lanes are opened than the bound allows
    And the members that were not opened are each refused as at capacity

  Scenario: a refusal is a per-member answer, not a fault
    Given a request in which some members are over the bound
    When it is dispatched
    Then the admitted members have their lanes
    And each refused member is reported with a code saying why
    And the request itself succeeded

  Scenario: cleaning up a finished lane returns its capacity
    Given a machine at its lane bound
    When one lane is cleaned up
    And a further ref is dispatched
    Then that ref is admitted

  Scenario: a lane whose agent died holds capacity until it is swept
    Given a machine at its lane bound
    And one of those lanes has been abandoned by whatever was working in it
    When a further ref is dispatched
    Then it is refused as at capacity
    And the report names the lane holding the slot and when it was last active

  Scenario: sweeping a stranded lane returns its capacity
    Given a machine at its lane bound including one stranded lane
    When the stranded lane is swept away
    And a further ref is dispatched
    Then that ref is admitted

  Scenario Outline: a lane the sweep will not remove keeps its slot
    Given a machine at its lane bound including a stranded lane <lane>
    When the stranded lanes are swept for removal
    Then that lane is reported as kept rather than removed
    And a further ref is still refused as at capacity

    Examples: capacity comes back when a lane goes, and only then
      | lane                                       |
      | holding uncommitted work                   |
      | this workspace cannot attribute to any ref |

  Scenario Outline: which lanes hold a slot
    Given a machine whose only lane is <lane>
    When the counted set of lanes is computed
    Then that lane <treatment>

    Examples: a slot is held by a tree work can happen in, not by a claim about it
      | lane                                           | treatment     |
      | actively changing files                        | holds a slot  |
      | quiet, having changed nothing for an hour      | holds a slot  |
      | quiet, with uncommitted work in it             | holds a slot  |
      | quiet, with nothing uncommitted in it          | holds a slot  |
      | freshly opened, having produced nothing yet    | holds a slot  |
      | whose ref this workspace cannot name           | holds a slot  |
      | whose directory has been deleted underneath it | holds no slot |
      | reported by git as prunable                    | holds no slot |

  Scenario Outline: the bound's edges
    Given a machine holding <open> lanes and a bound of <bound>
    When one further ref that holds no lane is dispatched
    Then it is <outcome>
    And no lane the machine already held was removed

    Examples: one under, exactly at, over — and a bound of one
      | open | bound | outcome                |
      | 0    | 1     | admitted               |
      | 1    | 1     | refused as at capacity |
      | 2    | 3     | admitted               |
      | 3    | 3     | refused as at capacity |
      | 4    | 3     | refused as at capacity |

  Scenario Outline: a request mixing refs that hold a lane with refs that do not
    Given a machine holding <open> lanes out of a bound of <bound>
    And a request naming <reused> refs that already hold one of those lanes and <fresh> that hold none
    When it is dispatched
    Then every reused ref is given the lane it already had
    And <opened> new lanes are opened
    And <refused> members are refused as at capacity

    Examples: reuse is free, so only the refs without a lane are measured against the bound
      | open | bound | reused | fresh | opened | refused |
      | 3    | 3     | 2      | 1     | 0      | 1       |
      | 3    | 3     | 3      | 0     | 0      | 0       |
      | 2    | 3     | 1      | 2     | 1      | 1       |
      | 0    | 2     | 0      | 3     | 2      | 1       |
      | 4    | 3     | 1      | 1     | 0      | 1       |

  Scenario: a concurrency figure in the answer says what it counted
    Given a dispatch request whose lanes are opened concurrently
    When its answer is read
    Then any peak it reports names lanes materialised rather than work in progress

  Scenario: deciding whether there is room writes nothing
    Given a machine deciding whether it may open another lane
    When the decision has been taken
    Then nothing was written but the lanes that were opened
    And the run record is byte-for-byte what it was

  Scenario: a mesh assignment's tree is not counted as a local lane
    Given a machine running work under a mesh assignment
    When the counted set of local lanes is computed
    Then the assignment's own tree is not among them
    And the machine's local capacity is unchanged by it

  Scenario: a ref already at work in a mesh assignment's tree is admitted at the bound
    Given a machine at its lane bound
    And a ref whose work is already under way in a mesh assignment's own tree
    When that ref is dispatched
    Then it is admitted
    And no new lane was opened for it

  # A ref holding no dispatch lane is not therefore fresh: it may already be at work in a tree the
  # lane count does not see. Reuse must be free wherever the work already lives, or the door stops
  # being re-runnable — which is the one thing a loop cannot survive.
