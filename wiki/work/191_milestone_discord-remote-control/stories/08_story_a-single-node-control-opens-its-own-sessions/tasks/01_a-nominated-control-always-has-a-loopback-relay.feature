@executable @cli @work @work-stream
Feature: a nominated control always has a loopback relay

  WHY. With no `mesh.relay.url` the control built no relay, so no session could open locally. Setting
  the URL does not help on a loopback-bound control: the stream server takes its port from the same
  URL, and the relay binds `127.0.0.1` on that port, so the two collide (F-03). A nominated control
  with no URL now derives its relay on its own port, 4183. `loopbackRelayUrl` stays the one
  derivation (ADR-001 amendment 2026-11-14 §2–§4, §8).

  Rule: the derivation

    Scenario Outline: loopbackRelayUrl answers by nomination and configuration
      Given a config with `mesh.relay.url` <url> on a node that <nomination>
      When the loopback relay URL is derived
      Then it answers <answer>

      Examples:
        | url                              | nomination                     | answer                              |
        | unset                            | is the nominated control       | "ws://127.0.0.1:4183/ws/relay"      |
        | unset                            | is not the nominated control   | null                                |
        | "ws://127.0.0.1:4182/ws/relay"   | is the nominated control       | "ws://127.0.0.1:4182/ws/relay"      |
        | "ws://127.0.0.1:4182/ws/relay"   | is not the nominated control   | "ws://127.0.0.1:4182/ws/relay"      |

  Rule: a single-node control binds two ports that never collide

    Scenario: a loopback control with no relay URL asks for 4182 and 4183
      Given a nominated control with `fabric` "direct", `address` "127.0.0.1" and no `mesh.relay.url`
      When its serve daemon starts with injected stream-server and relay seams
      Then the stream server is asked to bind "127.0.0.1" port 4182
      And the relay is asked to bind port 4183
      And no `EADDRINUSE` warning is emitted
      And a session-spawn handler is built for the control's own node

    Scenario: every reader on the control dials the derived relay
      Given a nominated control with no `mesh.relay.url`
      When the terminal push transport, the fleet subscriber transport and the `mesh ui` probe are built
      Then all three resolve "ws://127.0.0.1:4183/ws/relay"
      And the probe reports the relay as configured

  Rule: a configured relay is unchanged

    Scenario: a control with a relay URL and a LAN address binds as before
      Given a nominated control with `mesh.relay.url` "ws://127.0.0.1:4182/ws/relay" and `address` "192.168.1.20"
      When its serve daemon starts with injected stream-server and relay seams
      Then the stream server is asked to bind "192.168.1.20" port 4182
      And the relay is asked to bind port 4182
      And the push transport dials "ws://127.0.0.1:4182/ws/relay"

    Scenario: invite and join still read the configured key
      Given a nominated control with no `mesh.relay.url`
      When `aof mesh invite` reads the URL a worker is told to dial
      Then it reads no relay URL, as before, because a worker can never dial a loopback address

  Rule: the refusals name the nomination first

    Scenario Outline: a refusal for a missing relay names `mesh.relay.controlNode`
      Given a node that is not the nominated control and has no `mesh.relay.url`
      When <verb> is run
      Then it is refused with code "<code>"
      And the message names `mesh.relay.controlNode` before `mesh.relay.url`

      Examples:
        | verb                     | code                          |
        | `aof mesh session start` | session-dispatch-unavailable  |
        | `aof mesh session end`   | session-dispatch-unavailable  |
