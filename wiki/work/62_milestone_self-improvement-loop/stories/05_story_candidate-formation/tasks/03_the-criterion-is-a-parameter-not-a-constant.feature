@executable @cli @work @validate
Feature: What makes two records one cluster is a named value a caller can read, vary and disagree with

  The similarity criterion is the one thing this story deliberately does not settle. Which lesson
  sections belong together is a judgement that can only be made honestly against the real corpus, and
  the corpus is 392 sections written by many hands over many months. So the contract here is not the
  number. The contract is that whatever number is chosen is a thing a reader can find, read back and
  move — because a criterion nobody can find is a criterion nobody can disagree with, and a proposer
  whose grouping rule cannot be argued with is asking for more trust than this milestone gives
  anything.

  Buried in an expression, the same rule is unfalsifiable in the ordinary way: a reviewer who thinks
  the clustering is too coarse has no way to demonstrate it except by rewriting the module, and the
  next person to touch it will not know whether the number was measured or typed. Exposed as a named
  parameter with a stated range, it becomes an argument anybody can run: set it there, look at what
  comes out, and say why the other setting is better.

  Varying it must also visibly do something, which is the leg that catches the failure worth catching.
  A parameter that is accepted, recorded and then ignored while a constant elsewhere does the real
  work is worse than a bare constant, because it advertises a control that is not connected. If two
  records can be put together at one setting and apart at another, the parameter is what governs; if
  they cannot, something else is.

  The direction of the change is what makes the parameter meaningful rather than merely present.
  Loosening the rule may only ever merge, never split: no pair of records that shared a candidate is
  separated by loosening, and no pair on separate candidates is joined by tightening. Without that,
  the value is a dial with no stated meaning, and a reader moving it has no idea which way they went.

  The criterion also declares the ordered range it may occupy, and declaring one is what keeps the
  abstention reviewable. A reader shown a single number is shown a point; a reader shown the range is
  shown the space the choice was made inside, and can say the value sits at the wrong end of it. The
  range is also what makes an out-of-range value refusable rather than quietly re-tuned, and what gives
  looser and tighter any meaning at all. It forbids less than it appears to: the categorical rule this
  corpus invites — group the records whose Kind, Area, Stage and Owner meta agree — expresses itself
  as how many of those four fields must agree, which is scalar and ordered, loosest at one and
  tightest at four. Requiring a range does not ban categorical clustering; it makes a rule that reads
  categories declare its own strength. What the range does not do is pin a value: this contract asks
  for no particular number, and a build that makes it green by pinning one has answered the question
  the story exists to leave open.

  ADR-013 §1a. ADR-007 §4. ADR-014 §6. FF-6209.

  Scenario Outline: moving the criterion moves the clustering, and only in the direction it may
    Given a corpus spanning a range of similarity, from which candidates have been formed
    When the criterion is <change> and candidates are formed from the same records again
    Then the number of candidates <count>
    And <membership>
    And every record handed in is still carried on exactly one candidate

    Examples: the two directions, the two extremes, and the null move
      | change                              | count                   | membership                                          |
      | loosened by one step                | does not increase       | no pair that shared a candidate is separated        |
      | loosened by several steps           | does not increase       | no pair that shared a candidate is separated        |
      | loosened to the loosest it admits   | is at its smallest here | every pair that ever shared a candidate still does  |
      | tightened by one step               | does not decrease       | no pair on separate candidates is joined            |
      | tightened by several steps          | does not decrease       | no pair on separate candidates is joined            |
      | tightened to the tightest it admits | is at its largest here  | no pair joined at any looser setting is joined here |
      | set to the value it already had     | is identical            | the candidates are identical, source for source     |

  Scenario: the parameter is readable, and the run says what it clustered under
    Given formation called with a criterion the caller chose
    When the result is read
    Then it names the criterion and states the value it clustered under
    And that value is the one the caller supplied

  Scenario: a caller who supplies nothing gets a stated default rather than a hidden one
    Given formation called with no criterion supplied
    When the result is read
    Then it states the value it clustered under
    And that value is readable by a caller who wants to vary it
    And the value is the parameter's declared default rather than a number found in an expression

  Scenario: the parameter is what governs, demonstrated on one pair
    Given two records that state nearly the same lesson in nearly the same words
    When candidates are formed under a criterion loose enough to place them together
    And candidates are formed again under a criterion tight enough to place them apart
    Then the two records share a candidate in the first run
    And they are on separate candidates in the second
    And nothing but the criterion differed between the two runs

  Scenario: loosening never separates a pair, anywhere in the corpus
    Given candidates formed under some criterion
    When the criterion is loosened and candidates are formed again
    Then every pair of records that shared a candidate before shares one now
    And the only difference admitted is that pairs previously apart are now together
    And no pair is separated

  Scenario: a criterion outside the range the parameter admits is refused, not quietly replaced
    Given formation called with a criterion outside the range the parameter declares
    When candidates are formed
    Then formation refuses, naming the parameter and the range it admits
    And it does not fall back to the default
    And no candidates are returned from that call

  Scenario: the criterion changes the grouping and nothing else about a candidate
    Given candidates formed under two different criteria over one corpus
    When a candidate present in both sets is read from each
    Then its target is the same in both
    And the citations on it are constructed the same way in both
    And what differs is which records are grouped together
