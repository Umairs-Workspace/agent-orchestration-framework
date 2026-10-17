@cli @work @work-stream
Feature: A loop-driven session streams to its session card, read-only

  Rule: R1 · A loop-driven Claude session streams its terminal output, live and read-only, to its session card

    @executable
    Scenario: E1 · a sequential loop drive's session streams live on the control node
      Given the control node's daemon has opened its terminal ingress
      And loop 03 drives refine of 03/07 in a child drive on that node
      When the child's Claude session prints a chunk of output
      Then the fleet mirror receives a terminal frame for the control node and that session carrying exactly those bytes
      And the session's record states that it is relayed and names loop 03's run as its driver
      And the home pane for that session opens a stream instead of reading "no live output — no assignment is relaying this session"

    @executable
    Scenario: E2 · each wave lane's session streams only its own output
      Given a wave drives 01 and 02 in two lanes on one node
      When each lane's Claude session prints its own chunk
      Then the mirror holds each chunk under its own lane's session only
      And neither lane's session card shows the other lane's bytes

    @executable
    Scenario: E3 · typing into a loop session's card reaches nothing
      Given a session row that is relayed and names a loop run as its driver
      When the home mounts that session's pane
      Then the pane opens a stream
      And its posture is read-only with the reason "read-only — a loop drives this session; answer it with aof work answer"
      And no keystroke typed into the pane is sent anywhere

    @executable
    Scenario: E4 · a finished drive ends its session's stream
      Given loop 03's child drive is streaming its session
      When the drive finishes
      Then the stream's end marker is sent exactly once for that session
      And the session card shows the stream ended

    @executable
    Scenario: E5 · a loop on a worker node streams through that worker's own stream
      Given a worker node whose daemon has opened its terminal ingress
      And a loop on that worker drives a story in a child drive
      When the child's Claude session prints a chunk of output
      Then the worker sends the chunk up its own admitted stream to the control node
      And the control node relays it to the mirror under the worker's connection-bound node id

    @executable
    Scenario Outline: a failing ingress never slows or fails the drive
      Given loop 03 drives refine of 03/07 in a child drive
      And the ingress <condition>
      When the child's Claude session prints output and then finishes
      Then the drive settles with the outcome its session reached
      And <frames>
      And at most one coded degrade event is reported for the drive

      Examples:
        | condition                                 | frames                                             |
        | file is absent because no daemon runs     | no terminal frame is sent                          |
        | refuses the token the child presents      | no terminal frame is read from the connection      |
        | closes after the first chunk              | only the first chunk reaches the mirror            |

    @executable
    Scenario: the ingress stamps the daemon's own node id on every frame
      Given the control node's daemon has opened its terminal ingress
      When a local client presenting the right token sends a frame that names another node's id
      Then the frame reaches the mirror under the control node's own id
      And no frame is ever routed under the id the client named

    @executable
    Scenario Outline: only a session with no driving loop mounts interactive
      Given a session row whose relaying fact is <relaying> and whose driving loop run is <loop run>
      When the home mounts that session's pane
      Then the pane's posture is <posture>

      Examples:
        | relaying | loop run                   | posture     |
        | true     | absent                     | interactive |
        | true     | null                       | interactive |
        | true     | 20261017T081933836Z-0000   | read-only   |
        | true     | the number 42              | read-only   |
        | true     | an empty string            | read-only   |
        | false    | 20261017T081933836Z-0000   | read-only   |

    @executable
    Scenario Outline: a hook that restarts the session record keeps the loop's facts
      Given a loop session's record states that it is relayed and names loop run 20261017T081933836Z-0000
      When the session's own hook <writes> the record without either fact
      Then the record still states that it is relayed
      And it still names loop run 20261017T081933836Z-0000

      Examples:
        | writes                              |
        | starts                              |
        | pings                               |

    @uat
    Scenario: the operator watches running loops stream on both machines
      Given the build is installed on the control node and the WSL worker, and both daemons restarted
      And one loop runs on the control node and one on the WSL worker
      When the operator opens the home page on the control node
      Then each loop's session card shows its Claude screen updating live
      And typing into either card is refused as read-only
