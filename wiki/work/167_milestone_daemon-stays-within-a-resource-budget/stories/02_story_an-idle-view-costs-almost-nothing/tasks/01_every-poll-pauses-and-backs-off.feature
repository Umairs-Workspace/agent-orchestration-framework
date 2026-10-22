@executable @ui @work @board
Feature: Every UI poll pauses while hidden and backs off while unchanged

  WHY. Every open view polled every 5 s forever, even minimised to the tray, even when nothing had
  changed for an hour. Each poll in the UI now runs through one cadence: nothing while the window
  is hidden, at once when it is shown, slowing to every 15 s while the answers stay the same, and
  back to every 5 s on any change or click.

  Background:
    Given an injected clock and visibility
    And the board and the fleet are mounted with a base cadence of 5 seconds

  Rule: R2 · A hidden view polls nothing, and polls at once when shown

    Scenario: E3 · a window hidden for ten minutes makes no request
      Given the window becomes hidden
      When 10 minutes pass
      Then the fleet and the board make no request

    Scenario: E4 · a window shown again polls at once
      Given the window has been hidden for 10 minutes
      When the window becomes visible
      Then the fleet and the board each poll at once, before any delay

  Rule: R3 · A visible view backs off while nothing changes, and snaps back on a change or an action

    Scenario: E5 · unchanged answers slow the board to every 15 seconds
      Given the board is visible
      When its list poll answers 304 four times in a row
      Then the delays between its polls are 5, 10, 15 and 15 seconds

    Scenario: E6 · a changed answer returns the cadence to 5 seconds
      Given the board's list poll has slowed to every 15 seconds
      When a poll answers a changed list
      Then the next poll is 5 seconds later

    Scenario: E7 · a pending assign holds the fleet at 5 seconds
      Given the fleet's status poll has slowed to every 15 seconds
      When the operator clicks Assign on a fleet card
      Then the fleet polls every 5 seconds until the assign resolves
      And the Sent hold and the assign timeout end at the same times as before this change

    Scenario Outline: a user action on a surface returns its cadence to 5 seconds
      Given the <surface> poll has slowed to every 15 seconds
      When the operator <action>
      Then the next <surface> poll is 5 seconds later

      Examples:
        | surface      | action                       |
        | board list   | opens an item's detail panel |
        | detail runs  | switches to the Runs tab     |
        | fleet status | changes the scope            |
        | home feed    | changes the layout filter    |

    Scenario: the clock ticks and the launcher's outcome wait are not slowed
      Given the window is visible and every poll has slowed to every 15 seconds
      When 3 seconds pass
      Then the relative times on the board and the fleet re-render every second
      And a session launch still asks for its outcome at its own fixed interval
