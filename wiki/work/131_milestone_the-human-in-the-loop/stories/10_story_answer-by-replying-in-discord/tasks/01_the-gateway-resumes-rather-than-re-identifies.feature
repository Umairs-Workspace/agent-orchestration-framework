@executable @cli @work @work-stream
Feature: the gateway connection identifies once, resumes on every reconnect, and stops on a fatal close

  ADR-008 §2. `src/discord/gateway.mjs` is the only module that opens the gateway socket.
  - It asks `GET /gateway/bot` (through `discordRequest`) for the URL and `session_start_limit`,
    then connects with `?v=10&encoding=json`.
  - On HELLO it heartbeats every `heartbeat_interval`, and the first beat is jittered.
  - It IDENTIFYs with intents 33280 (`GUILD_MESSAGES | MESSAGE_CONTENT`).
  - It keeps READY's `session_id` and `resume_gateway_url`, and the last `s`.
  - Every reconnect RESUMEs. It re-identifies only after INVALID_SESSION `d: false`, or close 4007
    or 4009.
  - Each dispatch is handed to `onDispatch(t, d)`.

  RULINGS (PO, 2026-09-25). (1) Closes 4004 and 4010–4014 are fatal. The connection stops, and
  degrades once: 4004 → `discord-token-rejected` (naming `aof messaging init discord`), 4014 →
  `discord-intent-disallowed` (naming the portal toggle), and the others →
  `discord-gateway-fatal` with the code. (2) With `remaining < 10`, it does not IDENTIFY. It
  degrades `discord-identify-budget` and waits `reset_after`. (3) Any other drop reconnects with
  backoff from 1 s, doubling to a 60 s cap, with jitter. A successful READY or RESUMED resets it.
  (4) A heartbeat with no ACK before the next beat closes the socket (code 4000) and resumes. (5)
  Nothing here throws into the daemon.

  RULINGS (QA, 2026-09-25). (1) Every case runs over an injected socket factory and a fake clock.
  No real socket and no real timer runs. (2) The token appears in IDENTIFY and RESUME frames only.
  No degrade message holds it.

  RULINGS (developer, feasibility, 2026-09-25). (1) The default factory is the `ws` package,
  already in `package-lock.json`, so no dependency changes. (2) `onDispatch` faults are caught and
  degraded `discord-dispatch-failed`, so a handler cannot kill the connection.

  Scenario: a fresh connection identifies and dispatches
    Given a fake gateway that sends HELLO with `heartbeat_interval` 41250, then READY with `session_id` "s1"
    When the gateway starts
    Then it sent IDENTIFY once, with the token and intents 33280
    And the first heartbeat is sent within 41,250 ms of the fake clock, carrying the last sequence
    And a later `MESSAGE_CREATE` dispatch reaches `onDispatch` with its `t` and `d`

  Scenario Outline: what the gateway does after a close
    Given a connection that reached READY with `session_id` "s1" and last sequence 42
    When the socket closes with <close>
    Then the gateway <does>

    Examples:
      | close                                    | does                                                                              |
      | code 1006                                | reconnects to `resume_gateway_url` and sends RESUME with "s1" and 42, and no IDENTIFY |
      | an op 7 RECONNECT first                  | reconnects and sends RESUME with "s1" and 42                                     |
      | op 9 INVALID_SESSION with `d: true`      | reconnects and sends RESUME                                                       |
      | op 9 INVALID_SESSION with `d: false`     | reconnects and sends IDENTIFY                                                     |
      | code 4009                                | reconnects and sends IDENTIFY                                                     |
      | code 4004                                | does not reconnect, and degrades `discord-token-rejected` once                    |
      | code 4014                                | does not reconnect, and degrades `discord-intent-disallowed` once                 |
      | code 4013                                | does not reconnect, and degrades `discord-gateway-fatal` naming 4013              |

  Scenario: the identify budget is respected
    Given `GET /gateway/bot` answers `session_start_limit: { remaining: 5, reset_after: 60000 }`
    When the gateway starts
    Then it sends no IDENTIFY, degrades `discord-identify-budget` once, and tries again after 60,000 ms of the fake clock

  Scenario: a missed heartbeat ACK is a dead connection
    Given a connection that reached READY and whose fake gateway stops sending ACKs
    When two heartbeat intervals pass on the fake clock
    Then the gateway closes the socket and sends RESUME on a new one

  Scenario: stop closes the connection and schedules nothing
    Given a connection at READY
    When the handle's `stop()` runs
    Then the socket is closed, no reconnect is scheduled, and no timer remains
