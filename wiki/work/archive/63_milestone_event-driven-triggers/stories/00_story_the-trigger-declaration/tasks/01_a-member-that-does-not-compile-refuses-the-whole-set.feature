@executable @cli @work @validate
Feature: One member that does not compile refuses the whole set, and no partially-compiled set is ever returned

  A trigger set with one member silently skipped is worse than no trigger set at all, because it
  reports as armed. Every other failure in this area announces itself the first time someone looks; a
  set that compiled nine of ten members announces nothing, and the tenth is missing on exactly the day
  it was supposed to fire. So the answer to a bad member is a refusal with a code, and the refusal is
  of the whole declaration — not a warning beside a smaller set, not a `skipped` list, not a member
  quietly dropped and counted.

  The plausible wrong implementation is the obvious one, and it passes a naive test. Validate each
  member in order, collect the good ones, and throw when you meet a bad one: with the bad member last,
  every good member has already been compiled and a callable answer exists to hand back. With it first,
  nothing has been built and the same code refuses cleanly. That is why the position of the bad member
  is a column in a table below rather than an implementation detail — the two arrangements are the same
  declaration, and they must produce the same answer.

  The ways a member fails are enumerated rather than described, because each one is a different line of
  a validator and each one is individually skippable. Identity failures (no id, an id declared twice)
  are separate from field failures (no scope, a scope no loop scope form admits, a level that does not
  exist, a malformed cadence, no statement of what it protects), and a thing that is not a member at all
  is separate again — a null in the members array has no id to name it by, so the refusal has to locate
  it some other way or it names nothing.

  One boundary is deliberately on the other side. A declaration with no members compiles to an empty
  set; it is not a refusal. Whether this repository's own shipped declaration says anything is a claim
  about that declaration, made where it can be checked against the real one, and an empty answer here
  is empty rather than absent.

  ADR-002 §2. FF-6302.

  Scenario: one bad member among good ones refuses the whole compile, and nothing is armed
    Given a declaration of five members of which exactly one does not compile
    When it is compiled
    Then the compile is refused with a code
    And the refusal names the member that did not compile
    And no compiled set is handed back
    And none of the four good members is armed, installed or reported as accepted
    When the bad member is removed and the declaration compiled again
    Then the four remaining members compile, each unchanged from what it declares

  Scenario Outline: where the bad member sits does not change the answer
    Given a declaration of five members whose one bad member is <position>
    When it is compiled
    Then the compile is refused with a code naming that member
    And no compiled set is handed back
    And no member declared before it is armed

    Examples: the arrangement an in-order validator gets wrong is the last one
      | position         |
      | the first of five |
      | the third of five |
      | the last of five  |

  Scenario Outline: the ways a member fails to compile
    Given a declaration of good members and one member that <fault>
    When it is compiled
    Then the compile is refused with a code
    And the refusal <names>

    Examples: identity, and things that are not members at all
      | fault                                     | names                                            |
      | declares no id                            | locates the member by its position in the set    |
      | declares an id an earlier member declared | names the id that was declared twice             |
      | declares an id that is not a string       | locates the member by its position               |
      | is null                                   | locates the member by its position               |
      | is a string rather than an object         | locates the member by its position               |
      | is an array rather than an object         | locates the member by its position               |

    Examples: the fields a member declares
      | fault                                       | names                                              |
      | declares no source                          | names the member                                   |
      | names a source that does not exist          | names the member and lists the sources that do     |
      | declares no scope                           | names the member                                   |
      | declares the scope "63/01", a story ref      | names the member and the scope it declared         |
      | declares the scope "63-", a range with no end | names the member and the scope it declared       |
      | declares a scope that is not a string       | names the member                                   |
      | declares no level                           | names the member                                   |
      | declares the level "L4"                     | names the member and lists the levels that do exist |
      | declares the level "l3", in the wrong case  | names the member, and never reads it as its neighbour |
      | declares the cadence "periodic:0s"          | names the member and the cadence it declared       |
      | declares the cadence "event:per-sprint"     | names the member and the cadence it declared       |
      | declares no statement of what it protects   | names the member                                   |
      | declares an empty statement of what it protects | names the member                               |

  Scenario: the scopes that do compile, so the refusals above are refusing something narrower than everything
    Given a member whose scope is a driver
    And a member whose scope is a range of drivers
    When the declaration is compiled
    Then both compile
    And each compiled trigger carries the scope its member declared, unaltered

  Scenario: the answer to a bad member is a refusal, never a warning beside a partial answer
    Given a declaration with one member that does not compile
    When it is compiled
    Then nothing is reported on any warning channel in place of the refusal
    And the answer carries no list of members that were skipped, dropped or ignored
    And there is no count of how many members compiled

  Scenario: two bad members are still one refusal, and still nothing compiles
    Given a declaration of five members of which two do not compile
    When it is compiled
    Then the compile is refused with a code
    And the refusal names a member that did not compile rather than reporting a total
    And no compiled set is handed back

  Scenario Outline: a malformed declaration is refused differently from a malformed member
    Given a declaration that <shape>
    When it is compiled
    Then it is refused with a code that names no member
    And that code is not the one a bad member raises

    Examples: the declaration itself, refused before any member is reached
      | shape                                     |
      | is not an object                          |
      | is an array                               |
      | is null                                   |
      | declares no member list                   |
      | declares a member list that is not a list |

  Scenario: a declaration with no members compiles to an empty set rather than refusing
    Given a declaration whose member list is empty
    When it is compiled
    Then it compiles
    And the answer holds no triggers
    And the answer is an empty set rather than an absent one
