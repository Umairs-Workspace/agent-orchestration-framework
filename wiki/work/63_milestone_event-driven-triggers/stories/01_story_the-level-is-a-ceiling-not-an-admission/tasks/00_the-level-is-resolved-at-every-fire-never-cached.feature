@executable @cli @work @work-stream
Feature: A level is resolved at the fire it belongs to, and no answer outlives the facts that produced it

  A declaration is a request made once; the facts that decide it move constantly. A workspace's
  readiness score changes with every check that starts passing, its anchors decay on a schedule
  nobody sets, and its groundedness is a reading taken at a moment rather than a property of the
  repository. An admission computed when the declaration was compiled is therefore a permission with
  no expiry, handed to the one caller that will never notice it has gone stale — the one nobody is
  watching.

  The wrong implementation here is not careless, it is efficient. Resolving once at compile time and
  carrying the verdict on the compiled trigger is faster, tidier, and passes every test that resolves
  a trigger once. Only a second resolution catches it, and only when the facts underneath have moved
  between the two. That is why the matrix below fires one trigger twice rather than two triggers once.

  Both directions are required, for different reasons. A cached admission runs an unattended loop on a
  workspace that has since stopped qualifying, which is the danger. A cached refusal keeps refusing a
  workspace that has since fixed the thing it was refused for, which is merely wrong — but it is the
  same bug, and it is the half that gets reported. A refusal that has to change which half it names is
  the third reading, and it catches the implementation that recomputes the verdict but keeps the
  payload it printed last time.

  What a trigger produces is a pre-flight and never an authority. The loop gates again when it is
  entered, so an answer of "admitted" is a prediction about a moment that has not happened yet. When
  the prediction and the fire-time gate disagree, the fire-time gate is what runs: the earlier answer
  is carried in as nothing at all, and having pre-flighted makes the later gate no softer.

  ADR-004 §2, §4. FF-6304.

  Scenario Outline: one trigger, two fires, two readings of the same workspace
    Given a trigger declaring L3
    When it is resolved over gate facts in which <first reading>
    And it is resolved again over gate facts in which <second reading>
    Then the first answer is <first answer>
    And the second answer is <second answer>

    Examples: the answer tracks the facts in both directions, and so does the refusal's payload
      | first reading           | second reading            | first answer              | second answer             |
      | both halves pass        | the score fell one short  | admitted at L3            | refused, naming the score |
      | the score is one short  | both halves pass          | refused, naming the score | admitted at L3            |
      | both halves pass        | a component went stale    | admitted at L3            | refused on groundedness   |
      | a component is stale    | both halves pass          | refused on groundedness   | admitted at L3            |
      | the score is one short  | only a component is stale | refused, naming the score | refused on groundedness   |
      | both halves pass        | both halves pass          | admitted at L3            | admitted at L3            |

  Scenario: compiling the declaration answers nothing about admission
    Given a declaration whose members declare L3
    When it is compiled over a workspace that passes the gate
    And it is compiled again over a workspace that does not
    Then the two compiled sets are the same
    And no compiled trigger carries an admission, a refusal or a resolved level

  Scenario: resolving does not write back to what was resolved
    Given a trigger that was resolved and refused
    When the declaration and the compiled trigger are read again
    Then neither of them carries the verdict
    And resolving the trigger a second time consults neither

  Scenario: an answer already given is not disturbed by the next one
    Given a trigger resolved at L3 over gate facts that pass
    When the same trigger is resolved again over gate facts that fail
    Then the second answer is a refusal
    And the first answer still reads as admitted at L3

  Scenario: the pre-flight is a prediction, and the loop gates the level again at fire time
    Given a trigger whose resolution admitted L3
    When the gate facts move before the launch and the loop is entered
    Then the loop's own gate refuses the run
    And the earlier resolution admits nothing
    And no part of the resolution is carried into the loop as a grant

  Scenario: a refused resolution never reaches the fire-time gate at all
    Given a trigger whose resolution was refused
    When the resolution is read
    Then no work:loop input is emitted for it
    And the fire-time gate is never asked about it

  Scenario: the answer says which moment it belongs to
    Given a resolution admitting L3
    When it is read in its machine form
    Then it says the level was resolved for this fire
    And it says the loop will gate that level again when it is entered
