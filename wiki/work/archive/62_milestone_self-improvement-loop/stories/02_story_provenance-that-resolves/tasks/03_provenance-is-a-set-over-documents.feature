@executable @cli @work @validate
Feature: Provenance is a set over documents, and the floor to emit is never the evidence to commit

  The unit of evidence is the DOCUMENT, because one document is one author's one moment. Two lines of
  one retrospective are two sentences about the same afternoon; counting them as two readings would
  make an anecdote a proposal, which is precisely what the floor exists to prevent. So provenance is
  counted as a set over the documents its citations resolve into — nine citations into one document
  are one source, and two citations into two documents are two.

  The floor is two, and a candidate that misses it is not silently withheld. It appears in findings as
  a below-the-floor candidate carrying its count, because a surface that quietly declines work is
  indistinguishable from one that found none, and the reader cannot tell a thin corpus from a shy
  proposer without being told which happened.

  The second half of this criterion is a naming discipline, and it exists because the two numbers are
  adjacent and different. The floor is what it takes to EMIT a proposal for a human to read. The
  acceptor's evidence is what it takes to COMMIT a change, and a proposal is not a commit. Reported
  without their own names, a reader takes the smaller number for a weaker version of the larger one
  and concludes this surface holds an acceptance rule of its own. It holds none. So the two are
  reported side by side, each named for the thing it governs, and neither is rendered as a stricter or
  laxer form of the other.

  The test of that separation is not the wording, which anyone can improve; it is that moving one
  number does not move the other. A change that turns this criterion green the wrong way counts
  citations instead of documents, counts lines, or reaches for the acceptor's number when the floor is
  the question — and each of those looks like arithmetic rather than like a rule being replaced.

  The naming claim is made over a report HANDED IN, carrying both numbers, because that is the altitude
  this criterion sits at: the composed surface belongs to the face that assembles it, and the same two
  numbers over this repository's own corpus are a milestone-wide claim held by FF-6208 rather than
  here. What is checked here is that a report carrying both can only be read one way.

  ADR-006 §4, ADR-007 §4. FF-6204.

  Scenario Outline: two lines of one document are one source
    Given a candidate whose provenance is <provenance>
    When its evidence is counted
    Then the count of distinct source documents is <sources>
    And the candidate is <outcome>

    Examples:
      | provenance                                                   | sources | outcome                                          |
      | no citation at all                                            | 0       | reported below the evidence floor, with its count |
      | one citation into one document                                | 1       | reported below the evidence floor, with its count |
      | two lines of one retrospective                                | 1       | reported below the evidence floor, with its count |
      | nine citations spread across one document                     | 1       | reported below the evidence floor, with its count |
      | two ids declared in one document of one item                  | 1       | reported below the evidence floor, with its count |
      | an id citation and a path citation naming the same document   | 1       | reported below the evidence floor, with its count |
      | one citation into each of two different documents             | 2       | at the floor, and emitted                         |
      | two ids of one item declared in two of that item's documents  | 2       | at the floor, and emitted                         |
      | three citations across two documents                          | 2       | at the floor, and emitted                         |
      | nine citations across three documents                         | 3       | above the floor, and emitted                      |

  Scenario: a second citation into a document already counted does not cross the floor
    Given a candidate citing two lines of one retrospective
    When a third citation into that same retrospective is added
    Then the count of distinct source documents is still one
    And the candidate is still below the floor

  Scenario: a citation into a second document is what crosses it
    Given a candidate citing two lines of one retrospective
    When a citation into a second document is added
    Then the count of distinct source documents is two
    And the candidate is at the floor and emitted

  Scenario: a candidate below the floor is a finding, not a silence
    Given a candidate whose citations resolve into one document
    When the report is read
    Then the candidate is named as below the evidence floor
    And the finding carries its count of distinct source documents
    And it names the documents the candidate did cite
    And the report states how many candidates it declined for this reason

  Scenario: the report distinguishes documents from citations
    Given a candidate citing one document nine times
    When its record is read
    Then it states nine citations and one distinct source document
    And the floor is stated against the count of documents

  Scenario: the two numbers are reported side by side with their own names
    Given a report handed in carrying the floor to emit a proposal and the evidence to commit a change
    When the report is read
    Then each number is named for the thing it governs
    And neither is rendered as a stricter or laxer form of the other
    And no proposal is described as having met the evidence to commit by meeting the floor

  Scenario: the partition is a function of the citations and the floor, and of nothing else
    Given a report handed in whose candidates are some emitted and some below the floor
    When the same candidates are handed in again with a different evidence-to-commit number
    Then the emitted set is unchanged
    And the set of candidates below the floor is unchanged
    And the count of distinct source documents is unchanged for every candidate

  Scenario: the floor governs emission and decides nothing about committing
    Given a report handed in carrying a candidate at the floor and emitted
    When that candidate's record is read
    Then meeting the floor is not reported as evidence towards a commit
    And no verdict about committing is derived from how many documents it cited
