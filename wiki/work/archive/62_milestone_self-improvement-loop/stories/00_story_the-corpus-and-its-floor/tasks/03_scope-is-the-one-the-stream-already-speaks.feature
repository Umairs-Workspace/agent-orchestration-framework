@executable @cli @work @work-stream
Feature: A scope means here exactly what it already means on validate, doctor and audit

  This stream has paid once for scope grammars written more than once: three independent parsers, of
  which the one the loop depends on fails open. So there is nothing new to learn at this command. The
  forms are the ones the stream already speaks, they are answered by the rule the stream already
  keeps, and the day that rule admits something new this command admits it too — not before, and with
  nothing edited here to bring it about.

  The form the plan wrote is a range, and it is deliberately not admitted. A range lives in exactly
  one of those three parsers, the one that fails open. Rather than being parsed here and then refused,
  it resolves to nothing exactly as any other text nobody speaks does — so this command teaches an
  operator no vocabulary the rest of the stream cannot answer.

  The criterion easiest to get half right is the last pair: an unresolved scope matches nothing AND
  the run still succeeds. Both halves matter. Failing on it turns a typo into an error; walking the
  lanes over a population the operator never selected turns the same typo into three lanes reporting
  that they ran on nothing, which is an instrument alarm raised by a slip of the keyboard. A scope
  that matched nothing is not a lane that read nothing, and the report must say the first.

  A change that admits the range because the plan used the word, that errors on a reference matching
  nothing, or that resolves a scope by matching folder names on disk, has left the shared rule behind
  and is the fourth parser this criterion exists to refuse.

  Inheritance is only observable by moving the shared rule, and this command owns no part of it — two
  stories build over that module in one tree at once. So the move is made on a COPY of the tree and the
  copy is what answers: a control may not mutate a file it does not own.

  ADR-008 §1, §2. ADR-007 §3. ADR-012 §13. ADR-013 §10. FF-6205.

  Scenario Outline: the forms the stream already speaks, and the ones it does not
    Given the work stream as it stands
    When the corpus is asked for <scope>
    Then it reads <selection>

    Examples: what each form a reader might type selects
      | scope                                                       | selection                                             |
      | nothing at all                                              | every item of the stream                              |
      | a milestone number                                          | that milestone and every story under it               |
      | a story ref, NN/SS                                          | that story alone, and not its milestone               |
      | a fragment of a milestone's slug                            | that milestone alone, and not its stories             |
      | a fragment of a story's slug                                | that story alone, and not the milestone above it      |
      | a milestone number with spaces around it                    | what the same number selects without them             |
      | a range, NN-MM                                              | nothing — no form of the stream's scope reads a range |
      | a number no item carries                                    | nothing                                               |
      | text no item's slug carries                                 | nothing                                               |
      | a story ref whose milestone exists and whose story does not | nothing                                               |

  Scenario: an unresolved scope matches nothing and the run still succeeds
    Given a scope no item of the stream carries
    When the corpus is assembled for it
    Then nothing is read
    And the run says so, naming the reference that was asked for
    And it exits successfully, because a reference that matched nothing is not a failure

  Scenario: a scope that matched nothing is not a lane that read nothing
    Given a scope no item of the stream carries
    When the run is read
    Then no lane reports having run on nothing
    And what the report is about is the reference, not the state of the instruments

  Scenario: a scope that matched items narrows the population and nothing else
    Given a scope matching a single story
    When the corpus is assembled for it
    Then every lane still states the root it walked, the count it found and the floor it was held to
    And a lane below that floor under this scope is the same finding it would be over the whole stream

  Scenario: the same scope selects the same items here as it does elsewhere in the stream
    Given a scope in any of the forms the stream speaks
    When the items it selects here are compared with the items the stream's other scoped reads select
    Then the two sets are identical
    And nothing is selected here that those reads would not select

  Scenario: a widened scope grammar is inherited, never introduced
    Given a range form that matches nothing because the stream's scope rule does not admit it
    When a copy of the tree is taken to a temporary directory
    And the copy's scope rule is rewritten to admit that form
    And the corpus in the copy is asked for the same scope
    Then it selects whatever the rewritten rule says it selects
    And the tree under test was not edited to bring it about

  Scenario: a scope is a reference to resolve, never a path to walk
    Given a scope spelling a folder that exists on disk but matching no item's reference or slug
    When the corpus is assembled for it
    Then nothing is read
    And the run reports that the reference matched nothing
