@executable @cli @work @validate
Feature: The two gate readings come through the registry, and a registry that cannot answer yields no verdict at all

  The top autonomy level is admitted by one gate over two readings — the workspace's loop-ready score
  and its groundedness — and those readings are obtained at the command boundary through the registry,
  exactly as the loop itself obtains them when it fires. The face gathers them and hands them on; it
  reads neither from disk and computes neither for itself.

  This is only observable at the moment a reading is unavailable, because that is the only moment a
  fallback can appear, and everywhere else the two designs look identical. A fallback is precisely the
  second gate that must not exist: a face that answered "the gate passes" when nobody answered for the
  score would be admitting an unattended run on its own authority, and it would do so invisibly on
  every day the registry is healthy.

  The unavailabilities are told apart because the operator's next move differs for each. A registry
  that answers for no such command, and a call that raises, are both this installation being broken —
  the readings are registered in the same place this command is. A reading that came back but carries
  no gate half is a fact about this workspace: something answered, and what it said cannot decide the
  gate, so the triggers that needed it are refused by name at exit zero. The line is one sentence: not
  reaching the registry is this command's own failure, and what a reached registry said is about the
  work.

  A pre-flight is not an admission and the surface has to say so. The loop gates again when it fires,
  so the authority is unchanged and unreachable from here. What an unattended caller buys is learning
  before the launch, in a refusal it can read, that the level it declared is not available today —
  instead of discovering it inside a process whose output nobody is watching.

  Every rescue that turns this green the wrong way is comfortable to write, and each is invisible on a
  normal day: a catch that treats an unobtainable reading as a pass, a default to the level below the
  one declared, a reading remembered from an earlier run, a score worked out locally from whatever
  came back. The last one is the worst, because it is a second gate wearing the first one's answer.

  ADR-004 §1, §3, §4. ADR-003 §2. ADR-001 §2. FF-6304. FF-6301.

  Scenario Outline: how a gate reading turns out, what is named, and whose failure it was
    Given a trigger declaring the level the gate governs
    And <situation>
    When the run finishes
    Then the report names <named>
    And the run exits <status>

    Examples: reaching the registry is this command's machinery; what a reached registry said is the work
      | situation                                                    | named                                                     | status         |
      | the registry answers for no such command as a gate reading   | the command it asked for, and that nothing answers for it | unsuccessfully |
      | obtaining a gate reading raises a failure                    | the failure raised, and which reading was being obtained  | unsuccessfully |
      | a reading comes back with no gate half readable in it        | which reading it could not read, for each trigger needing it | successfully |
      | both readings come back and one half of the gate fails       | the failing half, and the reading that failed it          | successfully   |
      | both readings come back and the gate passes                  | the resolution, at the level the trigger declared         | successfully   |

  Scenario Outline: what a trigger whose gate reading was not obtained may never be rendered as
    Given a trigger declaring the level the gate governs
    And a run in which no gate reading could be obtained
    When that trigger's line is read
    Then it does not read as <mistake>

    Examples: every one of these is a gate this command decided on its own authority
      | mistake                                                          |
      | admitted at the level it declared                                |
      | resolved at a level below the one it declared                    |
      | a gate that passed                                               |
      | refused for a reason from the gate's own vocabulary              |
      | a refusal naming no failing half at all                          |
      | carrying a score or a groundedness reading this run worked out   |
      | the answer the same trigger was given on an earlier run          |

  Scenario: a run that cannot reach the registry says so before it says anything else
    Given a run for which the registry answers for no such command as a gate reading
    When the machine-readable rendering is read
    Then it states the failure before it states anything else
    And it names the command it asked for
    And no trigger in that run carries a resolved level
    And the run exits unsuccessfully
    And the tree is unchanged

  Scenario: a declaration that asks for no gated level asks the registry for no reading
    Given a declaration none of whose triggers declares the level the gate governs
    And a registry that answers for no such command as either gate reading
    When the run finishes
    Then every declared trigger resolves
    And nothing is reported as having failed
    And the run exits successfully

  Scenario: two readings in one process give two answers, because nothing is remembered
    Given one trigger declaring the level the gate governs
    When it is resolved against a reading under which the gate passes
    And it is resolved again in the same process against a reading under which the gate fails
    Then the first answer is a resolution at the level declared
    And the second answer is a refusal naming the failing half
    And neither answer was carried over from the other

  Scenario: every trigger in one run is decided against the same readings
    Given several triggers declaring the level the gate governs
    When the run finishes
    Then each of them is decided against the same two readings
    And the report states those readings once for the run
    And no two of them disagree about whether the gate passed

  Scenario: the answer is a pre-flight, and the report says the loop decides again
    Given a trigger that resolves at the level the gate governs
    When its resolution is read
    Then it carries no admission that the run may proceed
    And the report states that the loop resolves this gate again when it fires
    And nothing in the resolution would let the loop skip that

  Scenario: a reading that decides the gate is used as it came back
    Given a run in which one half of the gate fails
    When the refusal is read
    Then the failing half is named in the words the gate's own answer used
    And the reading that failed is carried as the registry returned it
    And no part of it is re-phrased, re-scored or summarised into a verdict of this command's own
