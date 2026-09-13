@executable @cli @work @validate
Feature: One grammar answers all three sources — a scope resolves through the loop's own forms, or is refused by name

  The loop already publishes which scopes it admits, and it is a short list: a driver, and a range of
  drivers. Three sources arriving from three directions do not get three readings of it. The single
  most valuable property of the table below is that it has one answer column rather than three — the
  cadence, the CI signal and the finding all put the same string to the same question, and any row
  where they diverge is a second grammar that has already been written.

  A fourth scope parser is the measured cost this refuses. It is never introduced deliberately: it
  arrives as a trim before the comparison, a tolerated trailing hyphen, a helpful coercion of a number
  to its digits. Each is a rule about what a scope may look like, authored somewhere the loop cannot
  see, and it stays invisible until the day the two readings disagree and a signal resolves to a scope
  its declaration never named. So the padded, the coerced and the nearly-well-formed all sit in the
  table alongside the clean cases, and they are refusals.

  The story-shaped signal is the one that matters most, and it is already ruled on. A signal naming an
  item inside a driver is refused, and the refusal names the driver the item belongs to so the caller
  can declare that scope if it is what they meant. What must not happen is the widening happening by
  itself: an implicit walk up to the milestone turns a signal about one story into an unattended run
  over a whole stream, which is a scope nobody asked for and the largest blast radius this milestone
  can produce by accident. Naming the driver and resolving to it are therefore separated on purpose,
  and the second half of that pair is asserted as an absence.

  Where the grammar is imported rather than copied, the observable is movement. Change what the loop
  admits and these answers change with it, with nothing in this family edited to bring it about. A
  private copy passes every test that only ever exercises today's forms, and fails silently on the
  first day the original moves — it keeps answering, just not the same answers as the command that
  will receive them.

  Last, a well-formed scope naming no item is still a scope. Form and existence are different
  questions with different owners, and conflating them here would make a source that reads the work
  tree in order to answer a question about a string.

  ADR-007 §2. 53/ADR-003. ADR-001 §3. FF-6307.

  Scenario Outline: one grammar, three sources, one answer
    Given the same scope <scope> declared for a cadence trigger, named by a CI signal, and named by a capture's attribution
    When each source resolves its own signal
    Then all three <answer>
    And the three answers differ in nothing but which source produced them

    Examples: the admitted forms are the loop's, and so are the refusals
      | scope                              | answer                                                     |
      | 63                                 | resolve it, as a driver                                    |
      | 7                                  | resolve it, as a driver                                    |
      | 60-63                              | resolve it, as a range                                     |
      | 63-63                              | resolve it, as a range covering one driver                 |
      | 999                                | resolve it, as a driver, whether or not an item bears it   |
      | 63/04                              | refuse it, and name 63 as the driver it belongs to         |
      | 63/04/02                           | refuse it, and name 63 as the driver it belongs to         |
      | 63-                                | refuse it, the range naming no upper driver                |
      | -63                                | refuse it, the range naming no lower driver                |
      | 63-60                              | refuse it, the range admitting no driver                   |
      | 60-63-66                           | refuse it                                                  |
      | the-signals-that-are-not-the-mesh  | refuse it, a slug matching no admitted form                |
      | the empty string                   | refuse it                                                  |
      | a run of spaces                    | refuse it                                                  |
      | 63 with a space either side        | refuse it, a scope being neither trimmed nor repaired      |
      | the number 63 rather than the text | refuse it, values never being coerced                      |

  Scenario: a story-shaped signal is refused with its driver named, and is never widened to it
    Given a signal naming an item inside a driver, from any of the three sources
    When it is resolved
    Then it is refused with a code
    And the refusal names the driver that item belongs to
    And no answer produced for that signal carries that driver as a resolved scope
    And the caller is pointed at the command that drives a single item instead

  Scenario: the refusal is the loop's own answer rather than a re-phrasing of it
    Given a scope no admitted form matches
    When a source refuses it
    Then the refusal carries the code the loop's own scope decision produces for that scope
    And it carries the same admitted forms, with their examples, in the same order
    And its stated reason is the loop's own, not a sentence written here

  Scenario Outline: when the loop's admitted forms move, these answers move with them
    Given a copy of the tree in which <change> is made to the loop's own scope forms and to nothing else in it
    When a signal naming <scope> is resolved by the source loaded from that copy
    Then it <answer>
    And no file in this family was edited to bring it about

    Examples: an imported grammar moves, a copied one does not
      | change                              | scope                             | answer     |
      | a story-shaped form is admitted     | 63/04                             | resolves   |
      | a slug form is admitted             | the-signals-that-are-not-the-mesh | resolves   |
      | the range form is withdrawn         | 60-63                             | is refused |
      | the driver form stops admitting a single digit | 7                      | is refused |

  Scenario: a well-formed scope naming no item is a scope, not a refusal
    Given a signal naming a driver no item in this workspace bears
    When it is resolved
    Then it resolves, as a driver
    And the same answer is given beside an empty work tree and beside this one
    And no source consults the work tree to decide whether a scope is well formed

  Scenario: the three sources are not three grammars
    Given one scope that resolves and one that does not
    When each of the three sources is handed both
    Then the resolving one resolves for all three, in the same form
    And the refused one is refused by all three, under the same code
    And no source admits a form the other two refuse
