@executable @cli @work @work-stream
Feature: An absent level takes the loop's default, a refused one takes nothing, and no reading of the output confuses the two

  There are three answers here and the middle one is the one a reasonable implementer collapses. A
  trigger that declares no level is a caller with no opinion, and it takes whatever the loop takes
  when nobody says — a rung low enough that no gate is consulted for it. A trigger that declares the
  unattended rung and clears its gate runs there. A trigger that declares the unattended rung and
  fails its gate takes nothing: not the rung it asked for, and not the default either.

  The collapse is seductive because the first and third answers appear to land in the same place. Both
  end at a level that needs no gate, so treating a failed gate as "fall back to the default" produces
  output that looks correct, runs, and is wrong in the only way that matters: an unattended caller
  that asked for the dangerous rung is told it got a run, and never learns it got a different one.
  The two outcomes must therefore be visibly different things, in the machine form and in the rendered
  one, and a caller that only reads the level must not be able to mistake one for the other.

  There is a fourth answer and it belongs to neither: a level the ladder does not carry. An absent
  level and an empty string are the near-miss pair — one is a caller with no opinion, the other is a
  caller whose opinion did not parse — and any implementation that tests the declared level for
  truthiness renders them the same. So does one that trims, lower-cases or otherwise repairs what it
  was handed. A level is matched as declared or it is refused as unknown, and the refusal says what
  the ladder does carry.

  Order is part of the contract too. A level the ladder does not know is refused as unknown before any
  workspace fact is consulted, so a bad spelling over a failing workspace reports a bad spelling —
  not a gate failure that would send the author to fix the wrong thing.

  ADR-004 §3. FF-6304.

  Scenario Outline: what was declared, against the facts, decides which of the four answers comes back
    Given a trigger whose declaration carries <declared level>
    And gate facts that <gate>
    When the trigger is resolved
    Then the resolution is <the resolution>

    Examples: absent, admitted, refused and unknown are four outcomes and never three
      | declared level               | gate                 | the resolution                            |
      | no level key at all          | pass both halves     | resolved at the loop's own default        |
      | no level key at all          | fail both halves     | resolved at the loop's own default        |
      | a level key set to null      | fail both halves     | resolved at the loop's own default        |
      | no level key at all          | are not supplied     | resolved at the loop's own default        |
      | L1                           | fail both halves     | resolved at L1, with no gate consulted    |
      | L2                           | fail both halves     | resolved at L2, with no gate consulted    |
      | L2                           | are not supplied     | resolved at L2, with no gate consulted    |
      | L3                           | pass both halves     | resolved at L3                            |
      | L3                           | fail on the score    | refused, naming the score half            |
      | L3                           | fail on groundedness | refused, naming the groundedness half     |
      | L3                           | fail both halves     | refused, naming both halves               |
      | L3                           | are not supplied     | refused, saying the facts were not given  |
      | an empty string              | pass both halves     | refused as an unknown level               |
      | a single space               | pass both halves     | refused as an unknown level               |
      | L2 with a trailing space     | pass both halves     | refused as an unknown level               |
      | l3 in lower case             | pass both halves     | refused as an unknown level               |
      | L4                           | pass both halves     | refused as an unknown level               |
      | the number 3                 | pass both halves     | refused as an unknown level               |
      | an object                    | pass both halves     | refused as an unknown level               |
      | L4                           | fail both halves     | refused as unknown, before any gate       |

  Scenario: a defaulted level and a refused level are different things in the machine form
    Given one trigger declaring no level and one declaring L3, both over gate facts the gate fails
    When both resolutions are read in their machine form
    Then the first is an answer carrying a level
    And the second is a refusal carrying a code
    And a caller that reads only the level finds no level on the second

  Scenario: a defaulted level and a refused level are different things in the rendered form
    Given the same two triggers and the same failing facts
    When the resolutions are rendered for a human
    Then the first is shown as a trigger that will run at the default level
    And the second is shown as a trigger that will not run, with the half that refused it
    And the second is not shown as a trigger that will run at the default level

  Scenario: the default is the loop's own and is not restated here
    Given a trigger declaring no level
    When it is resolved
    Then the level it takes is the level the loop resolves for a request that declares none

  Scenario: an unknown level is refused rather than defaulted or repaired
    Given a trigger declaring a level the ladder does not carry
    When it is resolved
    Then it is refused with the unknown-level code
    And the refusal names the levels the ladder does carry
    And it names the level as it was declared, unrepaired
    And no default is substituted for it
