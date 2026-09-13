@executable @cli @work @validate
Feature: A snapshot series that reports zero has been read, and is named rather than omitted

  There are three states here that a reader will conflate unless the surface refuses to let them: no
  series at all, a series present whose reading names nothing, and a series present whose reading names
  something. Omitting the second collapses it into the first, and the milestone is then silently
  declining to look at the one instrument it exists to consume. Letting the second stand in for the
  third claims evidence that was never gathered. Both mistakes are invisible in the output they
  produce, which is why the distinction is a criterion rather than a nicety.

  So the lane keeps three numbers apart: the series it walked, the readings it took from them, and the
  readings that carry an attribution. One number cannot say all three, and each of the three failures
  above is a different one of them going to zero. The floor is over readings, because reading is what
  this lane does — what a reading turns out to contain is a different question with a different answer.

  Reading a series whose content is zero is consuming it, and reading six of them is not running on
  nothing. At HEAD there are eight snapshot directories across seven items, six of them carrying a
  readings file, and a series is read at one snapshot per item — so the lane walks seven series and
  takes six readings, and that is a lane that read. What is zero is the content of those six: every one
  names no session and no run, though the instrument that wrote them recorded that it had found
  transcripts. That zero is this milestone's headline input rather than a starved lane, and the story
  that computes distances is where it is answered.

  There is a fourth state and it was measured rather than imagined: two of the eight directories, both
  under one item, carry a written report and no readings file at all. "Present" and "readable" are
  therefore not the same claim, and a series that yielded no reading may not be counted among the
  readings that named nothing — that would be the pass asserting a reading it never took.

  A change that drops this lane when it is empty, that renders its zero as "no observability data", or
  that reports a lane which read six series as a lane that ran on nothing, turns the milestone's
  central measurement back into the silence it was commissioned to end.

  ADR-007 §2, §3. ADR-012 §1, §2, §3. FF-6205.

  Scenario Outline: what is on disk for an item decides which of the three numbers it moves
    Given an item whose snapshot series is <series>
    When the observations lane reads that item
    Then it is reported as <reported>
    And it counts as <counted>

    Examples: absence, unreadable, read-and-empty, and read-and-attributed
      | series                                            | reported                                       | counted                                          |
      | never written for this item at all                | no series for this item                        | neither a series nor a reading                   |
      | a snapshots directory holding no snapshot         | no series, by the same answer as never written | neither a series nor a reading                   |
      | present, with no readings file beside its report  | a series whose reading could not be taken      | a series walked, and no reading                  |
      | present, with a readings file that will not parse | a series whose reading could not be taken      | a series walked, and no reading                  |
      | present, its reading naming no session and no run | a series read, naming nothing                  | a series walked and a reading, no attribution    |
      | present, its reading naming one or more sessions  | a series read, with what it names              | a series walked, a reading, and its attributions |

  Scenario: a series that names nothing is never rendered as no series at all
    Given an item whose series was read and names nothing
    And an item for which no snapshot was ever written
    When the lane's record is read
    Then the two items are distinguishable in it
    And the first is reported as walked and read, the second as never observed

  Scenario: the lane states three numbers, because one number cannot carry three facts
    Given items in scope, several carrying a series, and none of their readings naming anything
    When the lane's record is read
    Then it states how many series it walked
    And it states how many readings it took
    And it states how many of those readings carry an attribution
    And all three are separately legible

  Scenario: a reading that names nothing is still a reading
    Given every series in scope read successfully and naming nothing
    When the lane's count is compared with its floor
    Then the readings it took are what the floor is measured against
    And the lane is not below its floor on account of what those readings name
    And the lane is not reported as having run on nothing
    And the zero it reports is the count of readings carrying an attribution

  Scenario: a scope in which nothing was ever observed is the lane genuinely reading nothing
    Given a scope in which no item carries a snapshot series
    When the run is read
    Then the observations lane still appears, with the root it walked and the floor it was held to
    And it is not omitted for having nothing to say
    And it reports having run on nothing, naming the scope it was measured under

  Scenario: a series that yielded no reading is not a series that read zero
    Given a series whose most recent snapshot carries no readable readings
    When the lane's record is read
    Then that item is not counted among the readings
    And what could not be read is stated rather than folded into any of the three numbers

  Scenario: the series speaks with its most recent snapshot
    Given an item with an older snapshot carrying readings and a newer one carrying none
    When the observations lane reads that item
    Then what it reports is the newer snapshot's answer
    And the older snapshot is not searched for a better one
