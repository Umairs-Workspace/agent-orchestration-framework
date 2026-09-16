@executable @cli @work @work-stream
Feature: Handed the same facts, the pre-flight answers exactly what the loop's own gate answers, and handed none it says so

  A second gate is the risk this whole story exists to avoid, and it never arrives announced. It
  arrives as a threshold copied so the pre-flight can answer without a round trip, or a component
  verdict re-listed so the message reads better. Both are correct on the day they are written and
  both drift, and the drift is invisible from either side: the pre-flight admits a workspace the loop
  will refuse, or refuses one the loop would have run, and the only symptom is an unattended caller
  being told one thing before a launch and another thing inside it.

  Black-box, the claim has one honest shape: over the same facts, the two answers are the same answer
  — the same verdict, the same code, the same failing halves, the same particulars. That is checkable
  without opening either file, and it is checkable across the whole span of facts rather than at a
  single happy point, which is what the first matrix does. A copied threshold survives a one-row test
  and dies on the row where the score sits at its threshold but clears a lower rung.

  That the facts are handed in rather than fetched has an observable form too, and it is the second
  matrix's neighbour below: put facts on disk that disagree with the facts handed in, and the answer
  follows the hand. A pre-flight that consulted the workspace it happens to be standing in would
  answer from the disk, and would also answer differently in a different directory — which is exactly
  the property an unattended caller, resolving for a workspace it is not inside, cannot afford.

  Handed nothing, the pre-flight says so rather than guessing. Guessing has two shapes and both are
  bad: treating missing facts as passing admits the dangerous rung on no evidence, and treating them
  as a workspace that failed sends the operator to fix a score that was never read. The one thing a
  caller must be able to tell apart is "your workspace does not qualify" from "you did not give me
  the readings". The near-miss in the same matrix is the implementation that validates the facts
  before looking at the level, which breaks every rung that never needed facts in the first place.

  ADR-004 §1, §4. FF-6304. 53/ADR-007.

  Scenario Outline: over the same facts, the pre-flight and the loop's own gate are indistinguishable
    Given gate facts in which <facts>
    When a declared L3 is put to the loop's own gate and to the trigger's pre-flight
    Then both answer <answer>
    And neither answer says anything the other does not

    Examples: the span of the gate, not one point on it
      | facts                                        | answer                        |
      | both halves pass                             | admitted at L3                |
      | the score is one short of the threshold      | refused, naming the score     |
      | the score is at the threshold but clears L2  | refused, naming the score     |
      | the score reading is missing                 | refused, naming the score     |
      | the report never reached the reported state  | refused, on groundedness      |
      | the report is reported but not present       | refused, on groundedness      |
      | one component is self-referential            | refused, on groundedness      |
      | one component is stale                       | refused, on groundedness      |
      | one component is grounded only exogenously   | refused, on groundedness      |
      | the score is one short and a component stale | refused, naming both halves   |

  Scenario Outline: what the caller did not hand in is said, not guessed
    Given a trigger declaring <level>
    And a caller that hands in <facts>
    When the trigger is resolved
    Then the answer is <answer>

    Examples: a rung that needs no facts is not blocked by facts it never needed
      | level | facts                            | answer                                        |
      | L3    | no gate facts at all             | refused, saying the gate facts were not given |
      | L3    | a score reading and no report    | refused, saying the report was not given      |
      | L3    | a report and no score reading    | refused, saying the score was not given       |
      | L3    | both readings present but empty  | a refusal, and never an admission             |
      | L1    | no gate facts at all             | resolved at L1                                |
      | L2    | no gate facts at all             | resolved at L2                                |
      | none  | no gate facts at all             | resolved at the loop's own default            |

  Scenario Outline: the answer follows the facts it was handed, not the workspace it is standing in
    Given a workspace whose own readings <disk>
    When a trigger declaring L3 is resolved with handed-in facts that <handed>
    Then the answer is <answer>

    Examples: if the disk could move the answer, the facts were not handed in
      | disk        | handed      | answer                           |
      | would pass  | would fail  | refused, naming the failing half |
      | would fail  | would pass  | admitted at L3                   |

  Scenario: resolution needs no registry, no workspace and no clock
    Given gate facts handed in and no registered command available to the resolver
    When a trigger declaring L3 is resolved
    Then it answers from the facts alone
    And no registered command is invoked
    And no file is read

  Scenario: the same facts twice give the same answer
    Given one reading of the gate facts
    When a trigger declaring L3 is resolved twice, at two clock readings and in two directories
    Then the two answers are identical

  Scenario: the refusal for facts that were not supplied is distinguishable from one for facts that failed
    Given one resolution refused because no gate facts were handed in
    And one resolution refused because the facts handed in failed the gate
    When both refusals are read in their machine form
    Then they can be told apart without reading their prose
    And neither reports a score or a component that was never read
