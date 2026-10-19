Feature: Short files pack into one unit
  The sharded runner packs suite files whose recorded time is short into shared units, so a run
  starts far fewer processes. A long file keeps its own unit, a file is never split across units, and
  every registered case still runs exactly once.

  @executable @cli @work @work-stream
  Scenario Outline: A file packs or stands alone by its recorded time
    Given a pack threshold of 15 seconds and a pack target of 60 seconds
    And a file whose recorded time is <seconds> seconds and which <chunking>
    When the runner plans its units
    Then the file is <placement>

    Examples:
      | seconds | chunking                         | placement                                    |
      | 3       | does not declare independent cases | packed with other short files               |
      | 14.9    | does not declare independent cases | packed with other short files               |
      | 15      | does not declare independent cases | its own unit                                |
      | 120     | declares independent cases        | split into case chunks, none of them packed |
      | none    | has no recorded time              | estimated at half a second a case, and packed when that is under 15 seconds |

  @executable @cli @work @work-stream
  Scenario: A packed unit fills to its target and never splits a file
    Given forty short files recorded at 4 seconds each
    When the runner plans its units with a pack target of 60 seconds
    Then each packed unit holds whole files and is estimated at no more than 60 seconds
    And no file appears in two units

  @executable @cli @work @work-stream
  Scenario: Every registered case runs exactly once across packed units
    Given a registry whose cases come from a mix of short, long and chunkable files
    When the runner plans and the plan is expanded to its cases
    Then every registered case is assigned exactly once
    And a plan that lost or doubled a case is refused before any unit starts

  @executable @cli @work @work-stream
  Scenario: The shard entry runs a packed unit's files with their positions
    Given two suite files exporting 3 and 4 cases
    When the shard entry runs a unit naming the first file with positions "0,2" and the second with all of its positions
    Then 6 cases ran, under one "# executed 6 cases" line

  @executable @cli @work @work-stream
  Scenario: The shard entry's existing forms still work
    Given one suite file exporting 4 cases
    When the shard entry runs that file with the positions "1,3", and then runs that file and a second one as a selection
    Then the first run executed the cases at positions 1 and 3, and the second ran every case of both files

  @executable @cli @work @work-stream
  Scenario: The plan shows how many processes the run will start
    Given the runner's "--plan" form
    When it prints the plan
    Then it names the number of units, how many of them are packed, and how many files they hold
