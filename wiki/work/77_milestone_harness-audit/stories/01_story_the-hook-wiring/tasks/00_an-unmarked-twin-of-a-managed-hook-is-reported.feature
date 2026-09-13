@executable @cli @work @validate
Feature: An unmarked twin of a hook aof manages is reported, once, naming the pair

  A hook registered twice under one event and matcher fires twice. Each of those is a cold process
  and the second one buys nothing — and the prompt ping fires on every user turn, so the cost is
  paid per turn, per session, for as long as the file stays in that state.

  The rule that produces the twin is not touched here, and that is the whole design. The merge
  recognises its own and ONLY its own, so a copy of an aof hook written before the marker scheme
  existed is indistinguishable from a hand-authored one, and every update adds a freshly-marked
  copy beside it. The obvious fix — collapse the pair — would also delete this repository's own
  unmarked test-isolation guard, the hook that stops an unisolated test run writing into the real
  global home. That fix is refused, the deferred repair is recorded in the debt register, and this
  lane REPORTS.

  There is a second reason to report rather than repair, and it is a measurement. RESEARCH counted
  three live pairs; by the architecture pass there were ZERO, because 72/03 deleted them by hand,
  mid-session. A write path that touches every operator's settings file is not changed on n = 0
  observed instances. So this control is a RATCHET, green on arrival, and its red is a twin PLANTED
  into a fixture rather than a defect repaired.

  Equivalence is over the RESOLVED INVOCATION — the command and its arguments, with the project
  directory variable left as written and every argument put through the portable-path
  normalisation — never object identity. The lane is handed a PARSED settings object, so the
  reformatting that matters here is not whitespace, which no lane over an object can see: it is key
  order, an extra key that is neither command nor args, and two spellings of one path. An identity
  or serialisation comparison calls each of those distinct and reports nothing.

  The marker key is a PARAMETER, injected beside the settings object, so the family's import
  closure stays free of the module that declares it. That is not a claim about wiring: the same
  object judged under a different injected key gives a different answer, and no other kind of
  evidence would tell a parameter from a constant.

  One pair is ONE finding. A rule that reported from both entries' sides would double the number
  the debt register is waiting on, which is the number that decides whether the merge gets repaired.

  ADR-005 §1, §2, §3. FF-7703. 72/ADR-005 §3.

  Background:
    Given a settings object, a marker key and the path that settings object was read from, all three handed to the lane
    And the resolved invocation of a hook entry is its command plus its arguments, with the project-directory variable left exactly as written and every argument normalised by the same portable-path rule the merge applies — restated in the lane, which may not import the merge, and asserted here only through the behaviour below

  Scenario: an unmarked twin under one event and one matcher is reported
    Given a settings object whose event carries, under one matcher, an entry bearing the injected marker key and an entry lacking it
    And the two resolve to the same invocation
    When the lane runs over that object
    Then it returns one audit-hook-duplicated finding at error
    And the finding names the event, the matcher and the resolved command the two share
    And it returns no other finding

  Scenario: one pair is one finding, not one per entry
    Given a settings object carrying exactly one such pair
    When the lane runs over that object
    Then exactly one audit-hook-duplicated finding is returned
    And no second finding names the same event, matcher and command from the other entry's side

  Scenario: the matcher a finding names is the matcher as written, empty or not
    Given a settings object whose pair sits under the empty matcher
    When the lane runs over that object
    Then the finding names that matcher as the empty one rather than leaving it unsaid
    And the finding still names the event and the resolved command

  Scenario Outline: a reformatted copy is still a copy, and a different invocation is a different rule
    Given a settings object whose event carries, under one matcher, a marked entry and an unmarked entry <difference>
    When the lane runs over that object
    Then the count of audit-hook-duplicated findings returned is <findings>

    Examples: the reformattings — each of these is one process fired twice
      | difference                                                              | findings |
      | identical in every key and every value                                  | 1        |
      | differing only in the order of their keys                               | 1        |
      | where the unmarked one carries an extra key that is neither command nor args | 1   |
      | where the unmarked one spells one argument path with backslashes         | 1        |
      | where the unmarked one spells one argument path with a leading dot-slash | 1        |

    Examples: the distinct invocations — two rules that happen to run one program
      | difference                                                              | findings |
      | where the unmarked one names a different program                        | 0        |
      | where the unmarked one passes a different script argument               | 0        |
      | where the unmarked one passes the same arguments and one more           | 0        |
      | where the unmarked one passes no arguments at all                       | 0        |
      | where the unmarked one spells the project directory expanded            | 0        |

  Scenario Outline: the marker key is injected, so one object gives two answers
    Given one settings object whose event carries, under one matcher, two command-equivalent entries, exactly one of which carries the key "aofManaged"
    When the lane runs over that object with the marker key <injected key>
    Then the count of audit-hook-duplicated findings returned is <findings>

    Examples: one object, two keys — the key is a parameter and not a constant
      | injected key      | findings |
      | aofManaged        | 1        |
      | someOtherMarker   | 0        |

  Scenario: no marker key of the lane's own decides the answer
    Given a settings object carrying a pair under one event and matcher
    When the lane runs over that object with the marker key that pair uses
    And it runs again over that object with a marker key no entry carries
    Then the first run returns a finding and the second returns none

  Scenario: a settings object with no duplicate pair is clean, which is this repository today
    Given a settings object carrying six hook entries — five bearing the injected marker key and one unmarked operator entry — with no unmarked entry command-equivalent to a marked one under its own event and matcher
    When the lane runs over that object
    Then it returns no audit-hook-duplicated finding
    And it reports having swept all six entries

  Scenario Outline: the lane says what it swept, so found-nothing is never mistaken for looked-at-nothing
    Given a settings object carrying <entries> hook entries and no duplicate pair
    When the lane runs over that object
    Then the lane's read record names the hook entries as its population
    And the record declares a floor greater than zero
    And the count it reports is <count>

    Examples: the population is counted, never assumed
      | entries | count |
      | six     | 6     |
      | one     | 1     |
      | none    | 0     |

  Scenario: an object carrying no hook entry at all reports a count below its own floor
    Given a settings object declaring no hook entry
    When the lane runs over that object
    Then the count it reports is below the floor it declares
    And it does not report clean over a population it never had
