@executable @cli @work @work-stream
Feature: the preflight names the control's relay

  WHY. A relay that is derived, not configured, is invisible unless something names it. And a
  `mesh.relay.url` set on a loopback-bound control collides with the stream server, which only
  shows up as sessions that never open. The desktop preflight names both (ADR-001 amendment
  2026-11-14 §5), on every platform.

  Scenario Outline: control-relay-loopback reports the relay
    Given a node that <nomination>, with `mesh.address` "<address>" and `mesh.relay.url` <url>
    When `aof mesh desktop install --dry-run` prints its preflight
    Then the `control-relay-loopback` row reads "<result>"
    And its line <says>

    Examples:
      | nomination                    | address       | url                            | result | says                                                                                         |
      | is the nominated control      | 127.0.0.1     | unset                          | pass   | names "ws://127.0.0.1:4183/ws/relay" and says it is derived because no `mesh.relay.url` is set |
      | is the nominated control      | 192.168.1.20  | "ws://127.0.0.1:4182/ws/relay" | pass   | names "ws://127.0.0.1:4182/ws/relay"                                                         |
      | is the nominated control      | 127.0.0.1     | "ws://127.0.0.1:4182/ws/relay" | fail   | says to remove `mesh.relay.url` from `~/.aof/aof.config.json`, and that changing its port does not help |
      | is not the nominated control  | 127.0.0.1     | unset                          | skip   | says this node is not the control                                                            |
