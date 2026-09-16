@executable @cli @work @validate
Feature: A citation resolves only when the thing it names is on disk, never because it is well-formed

  This repository has already run the experiment. Nine of the `<path>:<line>` citations the loop
  registry is built on are wrong; every one of them is well-formed; and the count got WORSE after the
  fix was scheduled — twelve of fifteen defining lines off by up to 355, and a record written to
  demonstrate the discipline itself off by one. Nothing there was malformed, and nothing there was
  checked. Well-formedness is therefore not the test, and this criterion is written so that no
  citation can pass on the strength of its shape.

  There are two shapes and each asks two questions. A document citation names a file and, optionally,
  a line: the file must be on disk, and where a line is given the file must have that line. An id
  citation names an item and an id: the item must be on disk, and the id must be DECLARED in that
  item's documents — cited is not declared, and a register whose rows cite resolves nothing.

  An id citation is QUALIFIED, always. A bare id is addressable only inside its own item, and a
  citation is read outside every item, so a bare id in that position is ambiguous by construction: the
  same id is declared in dozens of items and nothing in the text says which one is meant. Nothing is
  lost by refusing it, because the proposer is never forced into one — it builds each citation out of a
  record it read from a KNOWN item, so it can always write the qualified form. A bare id met inside a
  source document is that document's prose, not a citation to be carried forward.

  The check happens at EMIT time, against the tree this run is reading. Deferring it to read time
  moves the failure onto whoever trusted the proposal, which is exactly the position item 68's readers
  were left in. And WHICH question failed is part of the answer: an absent file, a line past the end,
  an absent item and an undeclared id are four different defects in the proposer, and a check that
  reports only "did not resolve" tells nobody which one they have.

  A change that turns this green the wrong way is easy to recognise. It accepts a citation because it
  parses; or it treats a citation no grammar could read as vacuously fine; or it keeps the file check
  and drops the line check — which passes every one of item 68's nine.

  ADR-006 §1, §2. FF-6204.

  Scenario Outline: what the citation names decides whether it resolves
    Given a proposal whose provenance carries <citation>
    When the provenance is resolved at emit time
    Then the citation <outcome>

    Examples: a document citation — the file, and where one is given, the line
      | citation                                                       | outcome                                      |
      | a work-relative path to a file on disk, with no line            | resolves                                     |
      | a path to a file on disk, with a line that file has             | resolves                                     |
      | a path to a file on disk, with a line past the end of that file | does not resolve — the file has no such line |
      | a path to a file on disk, with a line range ending past its end | does not resolve — the file has no such line |
      | a path to a file on disk, with a line of zero                   | does not resolve — the file has no such line |
      | a path to a file on disk that is empty, with its first line     | does not resolve — the file has no such line |
      | a well-formed path to a file that is not on disk                | does not resolve — there is no such file     |
      | a path written relative to the document it was read from        | resolves, as the repo-relative path it reduces to |

    Examples: an id citation — the item, and the declaration
      | citation                                                        | outcome                                       |
      | a qualified ref carrying the optional prefix, naming a declared id | resolves                                   |
      | the same ref written without that prefix                        | resolves, identically                         |
      | a ref naming an item that is not on disk                        | does not resolve — there is no such item      |
      | a ref naming an item on disk and an id it declares nowhere      | does not resolve — the id is declared nowhere there |
      | a ref naming an id that item's documents only cite              | does not resolve — a citing register declares nothing |
      | a bare id carrying no item ref at all                           | is not emitted as provenance at all           |

  Scenario: no citation is accepted on the strength of its shape
    Given a set of citations every one of which is well-formed
    And a proposal carrying each of them in turn
    When the provenance is resolved
    Then each citation whose target is absent does not resolve
    And no citation resolves without its target having been looked for

  Scenario: a bare id in a source document is prose, not a citation to carry forward
    Given a source document whose text names an id with no item ref
    When provenance is built from a record read out of that document
    Then no bare id is emitted as a citation
    And the record is cited by the qualified form, naming the item it was read from

  Scenario: the check is made at emit, not when the corpus was read
    Given a citation whose target was on disk when the corpus was read
    When that target is removed before the proposal is emitted
    And the provenance is resolved
    Then the citation does not resolve
    And no proposal is emitted carrying it

  Scenario: the answer names which question failed
    Given a citation failing for an absent file, and one for a line past the end
    And a citation failing for an absent item, and one for an id declared nowhere in it
    When each is resolved
    Then each failure names the citation as it was written
    And each failure is distinguishable from the other three

  Scenario: a citation without a line is not failed for the absence of one
    Given a document citation naming a file on disk and no line at all
    When the provenance is resolved
    Then it resolves
    And no line is required of it
