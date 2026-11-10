@ui @work @board
Feature: The running loop shows its drive's progress on the home page and the fleet

  Rule: R2 · The running loop shows how long the current drive has run and when it last did something, on the home page as well as the fleet node card

    @executable
    Scenario: E6 · an active drive shows its elapsed time and its last activity
      Given loop 03 is at refine of 03/07, cycle 1 of 3
      And its drive started 36 min ago and last heartbeated 5 s ago
      When the loop's line is composed
      Then it reads "loop 03 · refine 03/07 · cycle 1 of 3 · 36 min · active 5 s ago"
      And the home page and the fleet node card show that same line

    @executable
    Scenario: E7 · between two drives the line carries no progress
      Given loop 03 has no current item between two drives
      When the loop's line is composed
      Then it reads "loop 03 · cycle 2 of 3"
      And it carries neither an elapsed time nor an activity age

    @executable
    Scenario: E8 · a drive quiet for 14 minutes is flagged
      Given loop 03's drive started 50 min ago and last heartbeated 14 min ago
      When the loop's line is composed
      Then its progress reads "50 min · quiet 14 min"
      And the progress is in the warning tone

    @executable
    Scenario: E14 · a drive quiet for just under ten minutes is not flagged
      Given loop 03's drive last heartbeated 9 min 59 s ago
      When the loop's line is composed
      Then its progress ends "active 9 min ago"
      And the progress is not in the warning tone

    @executable
    Scenario Outline: the progress segment by drive age and activity age
      Given a loop's drive started <started> ago
      And its last heartbeat is <heartbeat>
      When the loop's line is composed
      Then its progress segment reads "<segment>"
      And the warning tone is <warning>

      Examples:
        | example | started    | heartbeat         | segment                      | warning |
        |         | 45 s       | not yet written   | 45 s                         | off     |
        | E6      | 36 min     | 5 s ago           | 36 min · active 5 s ago      | off     |
        | E14     | 40 min     | 9 min 59 s ago    | 40 min · active 9 min ago    | off     |
        |         | 40 min     | 10 min 0 s ago    | 40 min · quiet 10 min        | on      |
        | E8      | 50 min     | 14 min ago        | 50 min · quiet 14 min        | on      |
        |         | 65 min     | 30 s ago          | 1 h 05 min · active 30 s ago | off     |

    @executable
    Scenario: the loop entry carries its drive's session and timing
      Given a running loop run whose drive run carries a session id, a creation time and a consumed heartbeat
      When presence reads the active loops
      Then the loop entry carries its eleven keys in their order, followed by its session id, its drive's start and its last activity
      And the last activity is the run's consumed heartbeat, the value the loop's stall bound reads

    @executable
    Scenario: the loop line and the quiet threshold have one home
      Given the fleet node card and the home page both render a running loop
      When their loop lines are composed
      Then both come from the one shared loop-line module
      And the ten-minute quiet threshold is that module's one exported constant

    @executable
    Scenario: the home page shows the running loops above its grid
      Given a live node reports loop 03 running and its session streaming
      When the home page holds a payload
      Then loop 03's line is shown above the session grid
