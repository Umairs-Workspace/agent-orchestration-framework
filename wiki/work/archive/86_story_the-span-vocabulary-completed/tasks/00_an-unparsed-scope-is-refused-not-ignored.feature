@cli @work @work-stream
Feature: A story-grained scope that is not a valid span is refused, never silently ignored

  A SCOPE THAT IS IGNORED WITHOUT SAYING SO IS WORSE THAN ONE THAT IS REFUSED. `inRange`'s trailing
  fall-through admits every unparsed shape as "no scope at all", so the walk answers for the whole
  stream and the operator has no signal. The cost is not abstract: the answer contains other
  milestones' stories, and the lane that consumes it dispatches worktrees and spawns developers.

  THE TWO SURFACES MUST AGREE. `findWork` answers `[]` for `44/01-03x`; `nextWork` answers with the
  whole stream. One ref, two commands, two meanings — and the disagreement is invisible until work
  has already been done against the wrong one.

  A FREE-TEXT SCOPE IS NOT A TYPO. The fall-through is load-bearing for non-numeric scopes, so the
  refusal is scoped to shapes that CLAIM to be story-grained — anything matching a leading `NN/` that
  is not a valid ref or span. Refusing every unparsed string would break slug scopes.

  AN EN-DASH IS NOT A HYPHEN. `44/01–02` is what a copy-paste out of a document that auto-corrected
  the hyphen produces. It reads as a valid span and is not one, and it is one of the three shapes
  measured in this story's own table. It is listed among the refused rows deliberately: it differs
  from `44/01-02` by one invisible codepoint (U+2013 EN DASH), which is precisely why it must be
  refused out loud rather than silently widened to the whole stream.

  A DESCENDING SPAN IS VALID AND ADMITS NOTHING. `44/03-01` parses — story 84 shipped it that way,
  matching how `decideLoopScope` treats `53-52` — so it is not a shape this refusal may claim. It is
  listed among the untouched forms because it is the nearest neighbour to every shape being refused,
  and a refusal drawn one character too wide would swallow it.

  @executable
  Scenario Outline: a story-grained shape that is not a valid span is refused
    When the walk is scoped by <scope>
    Then it refuses rather than answering
    And the refusal names the admitted forms

    Examples:
      | scope       |
      | 44/01-03x   |
      | 44/         |
      | 44/01-      |
      | 44/01-02-03 |
      | 44/01–02    |

  @executable
  Scenario: a bare story ref scopes the walk to that story rather than to the stream
    When the walk is scoped by 44/01
    Then it answers with that story alone
    And it does not answer with another milestone's stories
    And it does not offer the milestone itself for acceptance

  @executable
  Scenario Outline: find and next agree about every story-grained ref
    When a ref of shape <shape> is given to both find and next
    Then neither answers with an item the other excludes

    Examples:
      | shape     |
      | 44/01     |
      | 44/01-03  |
      | 44/01-03x |
      | 44/01–02  |
      | 44/40-42  |

  @executable
  Scenario Outline: the scope forms that already worked are untouched
    When the walk is scoped by <scope>
    Then it answers exactly as it did before this change

    Examples:
      | scope    |
      | 44       |
      | 44-46    |
      | 44/01-03 |
      | 44/03-01 |
      | a slug   |
      | no scope |
