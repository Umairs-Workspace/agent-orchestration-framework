@executable @cli @work @validate
Feature: Each prerequisite limb names what it looked at, so a reader can check it instead of believing it

  Two things stand between this machinery and a live proposal that no ruling can name, because they are
  not reasons a ruling did not commit: no admitted knob has a value that reaches a decision, and no run
  record carries the session id the attribution join needs. Both are engineering in another milestone's
  blast radius. Naming them is this milestone's work; closing them is not.

  A limb stated as a sentence is an assertion, and an assertion inherited across a milestone boundary
  is how a wrong number survives. The spike that sequenced this arc named three limbs, and two of the
  three measured differently when they were re-run rather than re-quoted — one was already closed, and
  one turned out to remove half of what it claimed. A limb that says only "no knob has a consumer" is
  indistinguishable from a limb that has been true, false and true again while the sentence sat still.

  So the observable is the evidence, not the claim. The consumer limb names the knobs it examined and,
  for each one, the sites where the value was resolved and what became of it there; the attribution
  limb names how many run records it examined and how many carried a session id.

  Where that evidence comes from is the second half of the criterion, and it is settled the same way
  the removal text is. The consumer limb's sites and their dispositions arrive on the acceptor's own
  report, as the grounds beneath its inadmissibility refusal — so this surface reads them rather than
  deriving them, assembles no set of source units, and walks no tree of its own. Whether a resolution
  site is a consumer is a judgement made once, by the probe that owns it, and reported here as it was
  given. A second walk would be a second answer about the same tree, and the two would disagree the
  first time either of them moved.

  A limb reporting without naming its subject fails this criterion however true its claim happens to
  be, and so does a limb whose evidence does not move when the report it was read from moves.

  ADR-001 §2, §2a. ADR-002 §3. ADR-012 §5. ADR-013 §4. ADR-009 §1. 60/SPIKE §Outcome. FF-6206.

  Scenario Outline: a limb states its subject and its reading, and offers per-member detail
    Given the <limb> limb stands
    When it is read
    Then it names the subject it examined, which is <subject>
    And it states <reading>
    And for each member of that subject it states <detail>

    Examples: the two limbs this milestone measures and does not own
      | limb                   | subject                                     | reading                                                          | detail                                                           |
      | decision-site consumer | the knobs the acceptor's report answers for | how many of them have a value that reaches a decision            | the sites its grounds name, and what became of the value at each |
      | run attribution        | the run records in the corpus handed to it  | how many records were examined and how many carried a session id | the items whose runs could not be joined, named by reference     |

  Scenario Outline: the consumer limb's reading over the repository as it stands
    Given an acceptor report over the repository as it stands
    When the decision-site-consumer limb is read
    Then it names <knob>
    And the sites it names for that knob are <sites>
    And every one of them is reported as a resolution that did not reach a decision
    And each is named by the file and the line the report's grounds gave for it

    Examples: three admitted knobs, no consumer among them — the reading taken at refine
      | knob                              | sites                                                |
      | the review-rounds knob            | a single site, where the resolved value is discarded |
      | the build-no-progress-rounds knob | more than one site, in more than one module          |
      | the attempts-ceiling knob         | more sites than either of the other two              |

  Scenario: the consumer limb reports the count as well as the verdict
    Given an acceptor report over the repository as it stands
    When the decision-site-consumer limb is read
    Then it states that none of the admitted knobs has a value reaching a decision
    And it states how many knobs it examined
    And for each of them it names the home that declares it, which is not counted as its own consumer

  Scenario: the sites and their dispositions are the acceptor's, not this surface's
    Given an acceptor report whose grounds name a site where a knob's value is resolved and discarded
    And a site where the value is composed into an object no decision reads that field back out of
    And a site where the value is handed off without reaching a decision
    When the consumer limb is read
    Then each site carries the disposition the report's grounds gave it
    And none of the three is reported as a consumer
    And no disposition of this surface's own is introduced for any of them

  Scenario: a report carrying no grounds is not made up for from somewhere else
    Given an acceptor report that carries no admissibility grounds for a proposal
    When the consumer limb is read
    Then it is reported as unmeasured, naming the grounds that were absent
    And no sites are reported for it from any other source
    And no reading for it is reached by any route other than the report

  Scenario: the evidence moves when the acceptor's grounds move, with nothing edited
    Given two acceptor reports whose grounds name different sites for the same knob
    When the consumer limb is read from each
    Then the sites it names differ between the two readings
    And no sentence was edited to make that happen

  Scenario Outline: the attribution limb states both halves of its count
    Given a corpus of <examined> run records of which <attributed> carry a session id
    When the run-attribution limb is read
    Then it states that it examined <examined> records
    And it states that <attributed> of them carried a session id
    And it names the reading the rounds counter returns while the join cannot be made

    Examples: the count is stated in both halves, so a reader can see the gap rather than infer it
      | examined | attributed |
      | 61       | 0          |
      | 61       | 9          |
      | 12       | 0          |
      | 1        | 0          |

  Scenario: the attribution limb's reading over the corpus as it stands
    Given the corpus as it stands
    When the run-attribution limb is read
    Then it states that none of the records it examined carried a session id
    And it states the number of records it examined rather than reporting an absence
    And it names the items whose runs it could not join

  Scenario: a limb offered without its evidence is not a measurement
    Given a limb standing with no subject named and no reading behind it
    When the distance is read
    Then that limb is not reported as measured
    And it is reported as unmeasured, naming what could not be read

  Scenario: each limb names the engineering that would close it, and whose it is
    Given both limbs stand
    When each is read
    Then each names the work that would close it
    And each states that the work is outside this milestone
    And neither is stated as work this surface will do

  Scenario: the limb's measurement stands beneath the refusal it grounds, and alone where there is none
    Given a tunable proposal the acceptor refuses on a ground one limb measures
    And an advisory proposal the acceptor never saw
    When both distances are read
    Then the tunable proposal shows the limb's measurement as the evidence beneath that refusal
    And the advisory proposal shows the limb's measurement in its own right
    And the same reading is stated in both places
