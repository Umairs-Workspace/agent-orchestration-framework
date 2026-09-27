@executable @cli @adapter @distribution
Feature: Every attended launch resolves byte-for-byte as it did before the fourth point compiled

  This is the safety leg, and it is the reason the change can be small at all. One enforcement point,
  two callers, and the requirement on both is that nothing moves: a session a human drives, a phase
  driver's session and each single-phase directive the mesh types all come back with the same program,
  the same arguments in the same order, and the same environment key for key and value for value.

  Exact rather than approximate, because of what this one seam decides. It is the sole producer of the
  instruction that makes a stalled run announce itself to a remote human; it removes the environment
  that would otherwise attach a worker session to somebody's open editor or leave the run with no
  transcript to read; and it carries the model, effort and cache-window decisions two later milestones
  put there. A comparison that checked the program and the number of arguments would pass a launch whose
  flags were reordered — and a reordered argument list is a different cache key, which is a real cost
  paid silently.

  The literal failure is worth naming because the declaration invites it. The member's old rule spells
  an argument, and honouring it by appending that argument to the session command line would break every
  attended launch on the first compile, since no runtime accepts it. No attended launch carries it.

  The subtler failure is placement. The environment is built, then stripped of the attachment vectors,
  and only then added to — everything aof itself sets is set after the strip so the strip can never eat
  it. A branch inserted at the wrong point leaves a run with no telemetry, or a cache window that
  quietly shortens, or no transcript at all, and not one of those three fails loudly. So the environment
  is compared as a whole and its decisions are named individually.

  ADR-005 §2. FF-6305.

  Scenario Outline: every attended launch resolves exactly as it did before
    Given <launch>
    When it is resolved
    Then the program is the same one it resolved before the fourth point compiled
    And the arguments are the same tokens in the same order
    And the environment holds the same keys with the same values, with none added and none removed
    And it is a launch rather than a refusal

    Examples: every attended shape this seam produces
      | launch                                                       |
      | a session a human drives locally, with no directive          |
      | a session a human drives locally, carrying a phase directive |
      | the session the refine directive is typed into               |
      | the session the continue directive is typed into             |
      | the session the verify directive is typed into               |
      | a session resumed from a persisted conversation              |
      | a session carrying a chosen model and a chosen effort        |
      | a session carrying a chosen model and no effort              |
      | a session carrying neither a model nor an effort             |
      | a session carrying run attribution                           |
      | a session carrying no attribution                            |
      | a session carrying the run's item directory and run id       |

  Scenario Outline: the environment decisions an attended launch makes are unchanged
    Given any attended launch
    When its environment is read
    Then <expectation>

    Examples: the keys this seam decides, each named rather than sampled
      | expectation                                                                      |
      | none of the editor-attachment keys are present                                   |
      | none of the parent-session keys are present                                      |
      | the inherited effort override is not present                                     |
      | the one-hour prompt-cache key is present and set                                  |
      | the telemetry attribution keys are present exactly when attribution was supplied  |
      | the run item directory and run id are present exactly when a heartbeat was given  |
      | every other inherited key rides through untouched                                |

  Scenario: no attended launch carries the argument the old rule spelled
    Given every attended launch this seam resolves
    When the arguments are read
    Then none of them carries the argument the envelope member used to name
    And none of them carries any argument the runtime would reject

  Scenario: every attended session still carries the instruction that produces the needs-input signal
    Given an attended session launch
    When its arguments are read
    Then the appended worker instruction is present
    And it is the same instruction it was before the fourth point compiled

  Scenario: an attended launch is never refused
    Given a workspace whose frozen set is installed
    When each attended launch is resolved
    Then none of them is refused
    And none of them is answered with the unattended launch shape

  Scenario: an attended launch does not move when the declared launch does
    Given two workspaces whose envelope members declare different launches
    When the same attended launch is resolved in each
    Then the two answers are identical in program, arguments and environment
    And neither answer names anything the envelope member declares
