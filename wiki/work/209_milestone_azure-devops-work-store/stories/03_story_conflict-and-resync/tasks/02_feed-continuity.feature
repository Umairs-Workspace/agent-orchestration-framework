@cli @work @board
Feature: Recover detection when the change feed loses its position
  Rule: R3 · Loss of feed continuity falls back to comparing every linked item
    @executable
    Scenario: E8 · An unchanged board resumes polling without a stop
      Given 17/02, 17/03 and 18/00 are linked at their acknowledged revisions
      When the board rejects the saved feed position
      Then AOF reads every linked item, finds each revision unchanged, and records no stop
      And the next poll starts from a new feed position

    @executable
    Scenario: E9 · A change made while the feed was lost is still found
      Given 17/03 is linked to board item 412 at acknowledged revision 3
      When the board rejects the saved feed position and 412 is at revision 5 with a new title
      Then exactly one stop is recorded, naming 17/03, 412 and revision 5

    @executable
    Scenario: A change between startup comparison and the first poll is not missed
      Given AOF is starting with no usable feed position
      When a teammate retitles 412 after AOF compared it and before the first poll
      Then a stop is recorded for 17/03 by the first poll

    @executable
    Scenario: A deleted linked item seen in the feed is a stop
      When the change feed reports board item 411 deleted
      Then a stop is recorded naming 17/02 and 411 as deleted on the board
      And the local documents of 17/02 remain readable
