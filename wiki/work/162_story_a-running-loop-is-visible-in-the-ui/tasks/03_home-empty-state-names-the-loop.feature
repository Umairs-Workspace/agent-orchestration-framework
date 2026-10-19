@ui @work @board
Feature: The home's empty state names the running loop

  Rule: R4 · The home page never shows an empty grid beside "N runs in flight" while a loop is running

    @executable
    Scenario: E12 · a running loop whose session has not registered is named
      Given a live node reports one run in flight and loop 03 at refine of 03/07
      And no session row exists and the loop entry carries no session id
      When the home page's empty state is composed
      Then it names "loop 03 · refine 03/07" and says its session has not reported yet
      And it does not show the sentence blaming the bundle

    @executable
    Scenario: E13 · a run that belongs to no loop keeps today's sentence
      Given a live node reports one run in flight and no loop
      And no session row exists
      When the home page's empty state is composed
      Then it reads "1 run in flight · no session is reporting a terminal."
      And its second line is the bundle sentence, unchanged

    @executable
    Scenario Outline: what the empty state says about a loop's session
      Given a live node reports loop 03 at refine of 03/07
      And <session>
      When the home page's state is chosen
      Then the page is <state>
      And <copy>

      Examples:
        | session                                                         | state     | copy                                                                    |
        | the loop entry carries no session id and no session row exists  | empty     | the copy names loop 03 and says its session has not reported yet       |
        | the entry names session 89b1d500 and no session row exists      | empty     | the copy names loop 03 and says "session 89b1d500 is not relaying"     |
        | the entry names session 89b1d500 and its session row exists     | populated | the session's pane is in the grid and loop 03's line is above it        |

    @executable
    Scenario: a loop on a stale node is not named
      Given a stale node's presence still lists loop 03
      And no live node reports a loop or a run
      When the home page's state is chosen
      Then the page says nothing is running
      And loop 03 is not named
