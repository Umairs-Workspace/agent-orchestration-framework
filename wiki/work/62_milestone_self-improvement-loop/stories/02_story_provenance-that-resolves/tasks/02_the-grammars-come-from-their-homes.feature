@executable @cli @work @validate
Feature: A change to either citation grammar reaches this reader, with nothing here edited to bring it

  The observable form of "the grammar is imported rather than restated" is not the import. It is
  MOVEMENT: change what the owning grammar admits and this reader's answers change with it, in both
  directions, with nothing here edited. A private copy passes every test that only ever exercises
  today's grammar and fails on the first day the original moves — and the failure is silent, because a
  reader with a stale copy still returns citations, just not the same ones as everybody else.

  There are two grammars, and a re-home that reaches only one half is the measured failure this is
  written against, so both halves move in the same table and one case moves both at once. That case is
  the one that catches a half-done migration, and it is the only case that does.

  Moving a grammar to observe the movement means moving a module this story does not own, and two
  builders sharing one worktree while one of them edits the other's source is a failure this stream has
  already had. So the change is made to a COPY of the tree in a temporary directory and the reader is
  loaded from the copy — the admitted technique, and the reason this criterion can be checked at all
  without a control mutating a file it has no write on.

  The reason this matters more here than in a tidiness argument is what the guards are FOR. Both
  grammars carry rules that were measured rather than designed: a dotted id names nothing in the
  namespace, a clause pointer cites its base id and fabricates no second item, a family reference
  containing a wildcard names a set rather than a file. Absent any one of them, the reader
  MANUFACTURES a citation nobody wrote — and a manufactured citation dangles, which demotes a proposal
  that was fine. A drifting copy does not merely miss findings here; it invents them.

  Last, a citation neither grammar recognises is not vacuously fine. "No grammar matched it" and "its
  target exists" are different answers, and only one of them is a pass; a reader that conflates them
  gives a proposal credit for provenance it never had.

  ADR-006 §1, ADR-013 §10. FF-6204.

  Scenario Outline: what the owning grammar admits is what this reader admits
    Given a copy of the tree in a temporary directory
    And a proposal whose provenance carries a citation of a form under change
    When <change> is made to the owning grammar in that copy and to nothing else in it
    And the provenance is resolved by the reader loaded from that copy
    Then <effect>
    And no file outside the copy was changed to bring it about

    Examples:
      | change                                                | effect                                                        |
      | a form is added to the id namespace                    | a citation of that form is read as an id citation and resolved |
      | a form is dropped from the id namespace                | a citation of that form is no longer read as an id citation    |
      | the qualified-ref shape stops admitting the prefix      | a prefixed ref is no longer read as a ref                     |
      | the qualified-ref shape stops admitting a nested ref     | a ref naming an item inside another is no longer read as a ref |
      | the cited-path shape admits a further locator form      | a citation written with it has its line checked                |
      | the cited-path shape stops admitting a locator form     | the same citation is checked for its file alone                |
      | both shapes are changed in one edit                     | both changes are observed in the same run                      |

  Scenario Outline: the guards the grammars own stop this reader manufacturing a citation
    Given provenance text reading <text>
    When its citations are extracted
    Then <reading>
    And no proposal is demoted for a citation its author never wrote

    Examples:
      | text                                            | reading                                              |
      | a clause pointer into a numbered decision        | the base id is cited, and no second item is           |
      | a dotted id behind an item ref                   | nothing is cited, the namespace carrying no dotted form |
      | a family reference containing a wildcard         | no document is cited, a wildcard naming a set          |
      | a truncated path fragment left in prose          | no document is cited                                   |
      | a bare filename with no directory component      | no document is cited                                   |

  Scenario: a citation neither grammar recognises is reported, never counted as resolved
    Given a proposal whose provenance carries text neither grammar reads as a citation
    When the provenance is resolved
    Then that text is reported as a citation that could not be read
    And it is not counted as a citation that resolved
    And it is not counted towards the proposal's evidence

  Scenario: this reader admits no form of its own
    Given a citation shape neither owning grammar admits
    When the provenance is resolved
    Then it is not read as a citation here either
    And no form is admitted here that the owning grammars refuse

  Scenario: widening one grammar does not widen the other
    Given a copy of the tree in which the document-path shape is widened and the id shape is untouched
    When provenance carrying both shapes is resolved by the reader loaded from that copy
    Then the document citation is read by the widened rule
    And the id citation is read exactly as it was before
