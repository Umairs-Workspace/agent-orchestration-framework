@cli @adapter @validate
Feature: An unattended launch is the launch the declaration names, or it is a coded refusal

  The envelope has two answers and the second one is the whole of the enforcement. A run cannot skip a
  gate the loop walks; what can skip it is a launch that is a session instead of a loop. So the only
  thing an envelope can usefully refuse is a request to run unattended as something other than the
  declared launch, and refusing is not a side effect of this point — it is the point.

  The failure that must not be reachable is a quiet fallback. Asked for an unattended launch it cannot
  honour, an envelope that hands back the ordinary session shape has produced exactly the run this
  enforcement point exists to prevent, and it has produced it while reporting success. Nothing
  downstream reads a launch object and asks whether it was the one requested.

  A second and quieter one: this seam already has an honest degrade — it answers with nothing when the
  runtime cannot be resolved at all — and a refusal folded into that same answer is indistinguishable
  from a missing binary. A caller that cannot tell "the runtime is not installed here" from "that is not
  the launch the declaration names" can act on neither, and an unattended caller is the one with nobody
  reading its log.

  A refusal must also carry nothing a determined caller could still spawn. A refusal with a half-built
  program and argv hanging off it is a launch with a warning attached, and the warning is the part that
  gets dropped.

  ADR-005 §2. FF-6305.

  @executable
  Scenario: an unattended launch resolves the program and arguments the declaration names
    Given a workspace whose frozen set is installed
    When an unattended launch matching the declaration is resolved
    Then the resolved program is the one the envelope member declares
    And the resolved arguments begin with the ones it declares, in the order it declares them
    And a launch object is returned rather than a refusal

  @executable
  Scenario: an unattended launch carries none of the session's own arguments
    Given a workspace whose frozen set is installed
    When an unattended launch is resolved
    Then it carries no appended session instruction
    And it carries no interactive permission mode
    And it carries no resumed conversation
    And nothing about it identifies it as a session

  @executable
  Scenario Outline: an unattended request that is not the declared launch is refused
    Given a workspace whose frozen set is installed
    When an unattended launch is requested <request>
    Then it is refused with a code
    And the refusal names the envelope member
    And no launch object is returned
    And no process is started

    Examples: every way a request can fail to be the declared launch
      | request                                                   |
      | naming a program the declaration does not name            |
      | naming no program at all                                  |
      | carrying no arguments at all                              |
      | carrying a leading argument the declaration does not name |
      | with one of the declared arguments removed                |
      | with the declared arguments in a different order          |
      | with an argument spliced in before the declared ones      |
      | naming the declared program with a session's arguments    |

  @executable
  Scenario: a refusal is not the answer given when the runtime cannot be found
    Given a workspace whose frozen set is installed
    And a runtime whose binary cannot be resolved
    When an unattended launch is requested
    Then the answer is the same one an unresolvable runtime has always produced
    And it is distinguishable from the refusal a mismatched request produces

  @executable
  Scenario: a refusal carries nothing a caller could spawn
    Given an unattended request that does not match the declaration
    When the refusal is read
    Then it carries no program
    And it carries no arguments
    And it carries no environment

  @executable
  Scenario: the declared launch is read from the declaration at every resolution
    Given two workspaces whose envelope members declare different launches
    When an unattended launch is resolved in each
    Then each answer is the launch its own workspace declares
    And neither answer is the other's

  @manual
  Scenario: a real unattended launch is observed running end to end
    Given a workspace whose frozen set is installed
    And the unattended launch the envelope resolves for it
    When a human runs that program and those arguments verbatim, with nobody attending, to completion
    Then the process that starts is the declared program and not an interactive session
    And it walks the continue, validate, doctor, grade and verify gates in that order
    And it ends of its own accord, having asked nobody for anything
    And the observation records the command as run, the gates seen in order, and the exit status
