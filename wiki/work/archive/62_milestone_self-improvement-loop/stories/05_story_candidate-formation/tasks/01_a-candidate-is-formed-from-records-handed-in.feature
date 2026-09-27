@executable @cli @work @validate
Feature: The same records in yield the same candidates out, in the same order, every time and everywhere

  Formation takes records handed in. It opens no file, asks the clock nothing, reads no argument and
  puts no question to the registry — and the way a reader can tell that from outside is that its
  answer never moves. Purity stated as a property of the source is a claim about a file; purity stated
  as determinism is a claim anybody can check by calling twice.

  Two runs is the weak form of the check and a second process is the strong one, because the ways this
  breaks are almost all invisible inside a warmed process. A cluster keyed on object identity, a tie
  broken by a hash the runtime seeds per process, a set iterated in insertion order that happens to be
  stable while the cache is warm — each of those returns the same answer twice in one process and a
  different one tomorrow. The corpus this runs over is 392 lesson sections and 61 run records, so an
  ordering that is stable by luck is stable until the day it decides an operator's proposal set.

  Input order is the same hazard wearing different clothes. The records arrive from a lane that walked
  a directory, and a directory walk is a filesystem's opinion rather than a fact about the corpus. An
  order-sensitive clustering rule would make the proposals change when a retrospective is renamed,
  which is a change to the evidence nobody made. So the records shuffled produce byte-identical
  candidates, with the same sources on them, in the same order.

  The place that hazard actually hides is the tie-break, which is why the rule about it is fixed rather
  than left to whoever writes the clustering. A record equally close to two clusters has to go
  somewhere, any answer is arbitrary, and the one thing that is not arbitrary is what the answer may be
  a function of: content, never arrival. No input index, position or iteration order may reach it. That
  distinction is invisible on every ordinary run — a tie-break reading input position returns the
  right answer every time the input arrives in the same order as before — so the probe that shows it
  is shuffling the records, not breaking the module.

  The consequence worth stating plainly is that formation cannot fail for an environmental reason. It
  has no path to open and nothing to be denied, so a corpus of records referring to documents that
  were deleted an hour ago still forms exactly the candidates those records describe. Anything that
  makes this go red for want of a file, a workspace or a registry is something formation was not
  supposed to be touching.

  ADR-013 §1, §1a, §2. ADR-014 §5. FF-6209.

  Scenario Outline: nothing outside the records handed in moves the answer
    Given a corpus of lane records from which candidates have been formed
    When <variation> and candidates are formed from the same records again
    Then the candidates are identical to the first set, candidate for candidate
    And the sources on each of them are identical, in the same order
    And the candidates come back in the same order

    Examples: one column of variation, and the answer does not move for any of it
      | variation                                                          |
      | formation is simply called a second time in the same process       |
      | formation is called inside a freshly started process               |
      | the records are shuffled into a different order                    |
      | the records are handed in reversed                                 |
      | the documents the records were parsed out of are edited on disk    |
      | the documents the records were parsed out of are deleted entirely  |
      | the call is made from a working directory outside any workspace    |
      | the clock is moved forward by a day                                |
      | the registry is made unavailable and answers for no command at all |
      | the environment the harness reads is cleared                       |
      | the configuration in force is replaced with a different one        |

  Scenario: a fresh process is the run that matters
    Given a corpus of lane records
    When candidates are formed in one process and again in a second process started from scratch
    Then the two sets are identical, including the order the candidates come back in
    And no ordering in either set depends on the order a set or map happened to be iterated in

  Scenario: shuffling the input does not reshape the clustering
    Given a corpus in which several records sit near the boundary of two clusters
    When the records are shuffled and candidates are formed again
    Then the candidates are byte-identical to the ones formed before the shuffle
    And each record is on the same candidate it was on before
    And no cluster gained or lost a member because the walk order changed
    And every tie among those boundary records was settled the same way as before

  Scenario: a candidate carries nothing that was not in the records
    Given a corpus of lane records
    When a candidate is read
    Then every field on it is derivable from the records it was formed from
    And it carries no timestamp, no run identifier and no value read from the environment

  Scenario: records naming documents that do not exist still form candidates
    Given lane records whose source locators name files that are not on disk
    When candidates are formed
    Then candidates are formed from those records as from any others
    And formation neither fails nor reports a finding about the missing files
    And whether those locators resolve is left to be answered where citations are checked

  Scenario: the order candidates come back in is a function of the records
    Given two corpora that differ by one record
    When candidates are formed from each
    Then the order of the candidates they share is the same in both
    And the order is stated by formation rather than left to the caller to impose
