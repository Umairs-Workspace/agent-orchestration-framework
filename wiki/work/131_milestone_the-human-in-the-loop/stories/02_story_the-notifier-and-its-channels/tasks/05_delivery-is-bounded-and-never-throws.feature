@executable @cli @work @work-stream
Feature: notify is awaited, bounded at five seconds, never retried, never throws, and never lets the URL out of env

  ADR-005 §5. `notify(workspace, envelope, { env, fetch })` in `src/notify/notify.mjs` resolves the
  workspace's `work.notify` through `resolveNotifyConfig` (task 02), selects the channels whose
  `events` hold the envelope's event, and sends to them in parallel through `CHANNELS[type]`.
  `CHANNELS` is `{ discord }`: `renderDiscord` (task 04) and `sendDiscord(url, body, { fetch,
  timeoutMs })`. Each send is bounded by `NOTIFY_TIMEOUT_MS = 5000`. Nothing is retried. It answers
  `{ delivered, failed }`, lists of channel names, and it never rejects. A failure is reported once
  through `reportDegrade` by name: `notify-channel-unconfigured`, `notify-delivery-failed` or
  `notify-rate-limited`. The URL is read only as `env[urlEnv]`, at the point of send, and it never
  reaches the envelope, a degrade message, a returned value or a log.

  RULINGS (PO, 2026-09-23). (1) An absent or channel-less `work.notify` answers
  `{ delivered: [], failed: [] }` with ZERO `fetch` calls and no degrade. A channel whose `events`
  omit the envelope's event is in neither list and is not called. (2) `env` defaults to
  `process.env` and `fetch` to `globalThis.fetch`; tests always inject both. An optional
  `timeoutMs` defaults to `NOTIFY_TIMEOUT_MS`, so a case proves the bound without waiting 5 s. (3) `sendDiscord` POSTs
  `JSON.stringify(body)` to the URL with `content-type: application/json` and an abort signal at
  `timeoutMs`. It never throws, and answers `{ ok: true, status }` for a 2xx, or
  `{ ok: false, reason, status, retryAfter }` where `reason` is `"status"`, `"rate-limited"`,
  `"timeout"` or `"error"`. `retryAfter` is the 429 body's `retry_after`, else the `Retry-After`
  header as a number, else `null`. (4) The degrade codes: an unset or blank `env[urlEnv]`, or a
  channel whose `type` has no `CHANNELS` entry, is `notify-channel-unconfigured`, and the message
  names the channel and the env var's NAME. A 429 is `notify-rate-limited`, and the message names
  the channel and the `retryAfter`. A non-2xx, a timeout, a thrown `fetch` or a throwing renderer is
  `notify-delivery-failed`, and the message names the channel and the status or the error's `name`.
  (5) A degrade message is built from those parts only, never from a raw `error.message`, and a
  final pass replaces any occurrence of the URL with `<redacted>`. (6) `delivered` and `failed` keep
  config order. (7) `reportDegrade` throttles per code for 5 s, so each case resets the sink with
  `setDegradeSinkForTest` before it runs.

  RULINGS (QA, 2026-09-23). (1) A selected channel that cannot be sent (an unset or blank env var,
  or a `type` with no `CHANNELS` entry) is in `failed`, and `fetch` is not called for it. The env var
  is read only for a selected channel, so one whose `events` exclude the event is never reported
  unconfigured. (2) `status` is `null` when no response arrived, and `retryAfter` is `null` for
  anything but a 429. The body's `retry_after` counts only as a finite number. The header counts
  only when `Number(header)` is finite, so an HTTP-date `Retry-After` reads `null`. An unreadable
  429 body falls through to the header. (3) The bound covers the whole send, including a 429's body
  read, and the send keeps it itself, so a `fetch` that ignores its signal still resolves at the
  bound. Once a response has arrived its status decides: a 429 whose body has not settled by the
  bound is `notify-rate-limited`, with the header's value or `null`. (4) A rejection that is not an
  `Error` (a string, `undefined`) is `notify-delivery-failed` all the same, and its message names the
  channel and nothing taken from the value. (5) `reportDegrade` throttles per code, not per channel.
  With two channels failing on one code in one call, the sink receives the first, and `failed` is the
  complete account. (6) A workspace or envelope that cannot be read (`null`, no config, no known
  event) selects no channel. It answers `{ delivered: [], failed: [] }`, with no call and no degrade.


  RULINGS (PO, answering the developer, 2026-09-23). (1) A `Retry-After` header counts only when it
  is non-blank after `trim()` and reads as a finite number of seconds; an empty or blank header
  reads `retryAfter: null`, never `0`. (2) The bound is a plain `setTimeout` raced against the send,
  cleared when the send settles and never `unref`'d: a promise waiting only on `AbortSignal.timeout`
  does not hold the process open, so a never-settling `fetch` would end the test process instead.
  Background:
    Given a workspace whose `work.notify` is `{ channels: { ops: { type: "discord", urlEnv: "HOOK_A" } } }`
    And `env` = `{ HOOK_A: "https://discord.com/api/webhooks/111/secret-token" }`
    And `fetch` is an injected spy, and the degrade sink is the injected test sink
    And `ENV` is a `session-needs-input` envelope from `buildNotifyEnvelope`

  Scenario: a 2xx delivers once, to the URL from env, with the rendered body
    Given `fetch` answers `204`
    When `notify(workspace, ENV, { env, fetch })` is awaited
    Then it answers `{ delivered: ["ops"], failed: [] }`
    And `fetch` was called exactly once, with the URL `env.HOOK_A`, method `POST`, and a body that parses to `renderDiscord(ENV)`

  Scenario: an absent block makes no call at all
    Given the workspace has no `work.notify`
    When `notify(workspace, ENV, { env, fetch })` is awaited
    Then it answers `{ delivered: [], failed: [] }`, `fetch` was never called, and the degrade sink received nothing

  Scenario: a hanging webhook is abandoned at the bound, and the call still resolves
    Given `NOTIFY_TIMEOUT_MS` is exported as `5000`
    And `fetch` never settles until its signal aborts
    When `notify(workspace, ENV, { env, fetch, timeoutMs: 50 })` is awaited
    Then it resolves `{ delivered: [], failed: ["ops"] }` once the 50 ms bound passes, without rejecting and without a second call
    And the degrade sink received one event coded `notify-delivery-failed`

  Scenario: no failure lets the URL out
    When `notify` is awaited against a `fetch` that throws an error whose message contains `env.HOOK_A`
    Then it resolves `{ delivered: [], failed: ["ops"] }`
    And no degrade event, and nothing in the resolved value, contains `secret-token`

  Scenario: the send is one JSON POST carrying an abort signal
    Given `fetch` answers `204`
    When `sendDiscord(env.HOOK_A, renderDiscord(ENV), { fetch, timeoutMs: 50 })` is awaited
    Then `fetch` was called once with `env.HOOK_A` and an init whose `method` is `"POST"`, whose `content-type` header is `application/json`, whose `body` is `JSON.stringify(renderDiscord(ENV))` and whose `signal` is an `AbortSignal` not yet aborted

  Scenario Outline: every answer the webhook can give maps to one result, one degrade and one send answer
    Given `fetch` <behaviour>
    When `notify(workspace, ENV, { env, fetch, timeoutMs: 50 })` is awaited
    Then it resolves <result>, and the degrade sink received <degrade>
    And `sendDiscord(env.HOOK_A, renderDiscord(ENV), { fetch, timeoutMs: 50 })` answers <send>, and neither call rejects

    Examples:
      | behaviour                                                         | result                                | degrade                                            | send                                                                   |
      | answers `200`                                                     | `{ delivered: ["ops"], failed: [] }`  | nothing                                            | `{ ok: true, status: 200 }`                                            |
      | answers `204`                                                     | `{ delivered: ["ops"], failed: [] }`  | nothing                                            | `{ ok: true, status: 204 }`                                            |
      | answers `400`                                                     | `{ delivered: [], failed: ["ops"] }`  | one `notify-delivery-failed` naming ops and 400    | `{ ok: false, reason: "status", status: 400, retryAfter: null }`       |
      | answers `404`                                                     | `{ delivered: [], failed: ["ops"] }`  | one `notify-delivery-failed` naming ops and 404    | `{ ok: false, reason: "status", status: 404, retryAfter: null }`       |
      | answers `500`                                                     | `{ delivered: [], failed: ["ops"] }`  | one `notify-delivery-failed` naming ops and 500    | `{ ok: false, reason: "status", status: 500, retryAfter: null }`       |
      | answers `429` with body `{ "retry_after": 1.5 }`                  | `{ delivered: [], failed: ["ops"] }`  | one `notify-rate-limited` naming ops and 1.5       | `{ ok: false, reason: "rate-limited", status: 429, retryAfter: 1.5 }`  |
      | answers `429` with header `Retry-After: 2` and a non-JSON body    | `{ delivered: [], failed: ["ops"] }`  | one `notify-rate-limited` naming ops and 2         | `{ ok: false, reason: "rate-limited", status: 429, retryAfter: 2 }`    |
      | answers `429` with body `{ "retry_after": 0.8 }` and header `3`   | `{ delivered: [], failed: ["ops"] }`  | one `notify-rate-limited` naming ops and 0.8       | `{ ok: false, reason: "rate-limited", status: 429, retryAfter: 0.8 }`  |
      | answers `429` with body `{ "retry_after": "soon" }` and header `3` | `{ delivered: [], failed: ["ops"] }` | one `notify-rate-limited` naming ops and 3         | `{ ok: false, reason: "rate-limited", status: 429, retryAfter: 3 }`    |
      | answers `429` with an HTTP-date `Retry-After` and no body         | `{ delivered: [], failed: ["ops"] }`  | one `notify-rate-limited` naming ops               | `{ ok: false, reason: "rate-limited", status: 429, retryAfter: null }` |
      | answers `429` with neither                                        | `{ delivered: [], failed: ["ops"] }`  | one `notify-rate-limited` naming ops               | `{ ok: false, reason: "rate-limited", status: 429, retryAfter: null }` |
      | answers `429` with header `4` and a body that never settles       | `{ delivered: [], failed: ["ops"] }`  | one `notify-rate-limited` naming ops and 4         | `{ ok: false, reason: "rate-limited", status: 429, retryAfter: 4 }`    |
      | throws a `TypeError`                                              | `{ delivered: [], failed: ["ops"] }`  | one `notify-delivery-failed` naming ops, TypeError | `{ ok: false, reason: "error", status: null, retryAfter: null }`       |
      | rejects with `undefined`                                          | `{ delivered: [], failed: ["ops"] }`  | one `notify-delivery-failed` naming ops            | `{ ok: false, reason: "error", status: null, retryAfter: null }`       |
      | never settles until its signal aborts                             | `{ delivered: [], failed: ["ops"] }`  | one `notify-delivery-failed` naming ops            | `{ ok: false, reason: "timeout", status: null, retryAfter: null }`     |
      | ignores its signal and never settles                              | `{ delivered: [], failed: ["ops"] }`  | one `notify-delivery-failed` naming ops            | `{ ok: false, reason: "timeout", status: null, retryAfter: null }`     |

  Scenario Outline: a channel that cannot be sent fails without a call
    Given the channel `ops` is <channel>, and `env` is <env>
    When `notify(workspace, ENV, { env, fetch })` is awaited
    Then it resolves `{ delivered: [], failed: ["ops"] }`, and `fetch` was never called
    And the degrade sink received one `notify-channel-unconfigured` naming <named>

    Examples:
      | channel                                   | env                                              | named          |
      | `{ type: "discord", urlEnv: "HOOK_A" }`   | `{}`                                             | ops and HOOK_A |
      | `{ type: "discord", urlEnv: "HOOK_A" }`   | `{ HOOK_A: "" }`                                 | ops and HOOK_A |
      | `{ type: "discord", urlEnv: "HOOK_A" }`   | `{ HOOK_A: "  " }`                               | ops and HOOK_A |
      | `{ type: "discord" }`                     | `{ HOOK_A: "https://discord.com/api/webhooks/111/secret-token" }` | ops and AOF_DISCORD_WEBHOOK_URL |
      | `{ type: "slack", urlEnv: "HOOK_A" }`     | `{ HOOK_A: "https://discord.com/api/webhooks/111/secret-token" }` | ops            |

  Scenario Outline: channels are selected by event, sent in parallel, and reported in config order
    Given `a` = `{ type: "discord", urlEnv: "HOOK_A" }`, `b` = `{ type: "discord", urlEnv: "HOOK_B" }`, and `env` also holds `HOOK_B`
    And `work.notify` is `{ channels: <channels> }`, and `fetch` answers <answers>
    When `notify(workspace, ENV, { env, fetch, timeoutMs: 50 })` is awaited, `ENV` being a `session-needs-input` envelope
    Then it resolves <result>, after <calls>
    And the degrade sink received <degrade>

    Examples:
      | channels                                                               | answers                            | result                                          | calls                                         | degrade                                             |
      | `{ ops: { ...a, events: ["milestone-accepted"] } }`                    | `204`                              | `{ delivered: [], failed: [] }`                 | no call                                       | nothing                                             |
      | `{ ops: { ...a, events: ["session-needs-input"] } }`                   | `204`                              | `{ delivered: ["ops"], failed: [] }`            | one call                                      | nothing                                             |
      | `{ ops: a, alerts: b }`                                                | HOOK_A `204`, HOOK_B `500`         | `{ delivered: ["ops"], failed: ["alerts"] }`    | two calls                                     | one `notify-delivery-failed` naming alerts          |
      | `{ ops: a, alerts: b }`                                                | HOOK_A `500`, HOOK_B `204`         | `{ delivered: ["alerts"], failed: ["ops"] }`    | two calls                                     | one `notify-delivery-failed` naming ops             |
      | `{ ops: a, alerts: b }`                                                | HOOK_A `204` after 30 ms, HOOK_B `204` at once | `{ delivered: ["ops", "alerts"], failed: [] }` | two calls, HOOK_B's before HOOK_A settled | nothing                                     |
      | `{ ops: a, alerts: b }`                                                | HOOK_A `429`, HOOK_B `500`         | `{ delivered: [], failed: ["ops", "alerts"] }`  | two calls                                     | one `notify-rate-limited` and one `notify-delivery-failed` |
      | `{ ops: a, alerts: b }`                                                | `500` to both                      | `{ delivered: [], failed: ["ops", "alerts"] }`  | two calls                                     | exactly one `notify-delivery-failed` (throttled)  |
      | `{ ops: { ...a, urlEnv: "HOOK_Z", events: ["milestone-accepted"] }, alerts: b }` | `204`                    | `{ delivered: ["alerts"], failed: [] }`         | one call, to HOOK_B                           | nothing                                             |
      | `{ ops: { ...a, urlEnv: "HOOK_Z" }, alerts: b }`                       | `204`                              | `{ delivered: ["alerts"], failed: ["ops"] }`    | one call, to HOOK_B                           | one `notify-channel-unconfigured` naming ops and HOOK_Z |

  Scenario Outline: nothing it is handed makes it reject
    When `notify(<workspace>, <envelope>, { env, fetch })` is awaited
    Then it resolves <result>, `fetch` was never called, and the degrade sink received <degrade>

    Examples:
      | workspace   | envelope                                               | result                               | degrade                                    |
      | `null`      | `ENV`                                                  | `{ delivered: [], failed: [] }`      | nothing                                    |
      | `{}`        | `ENV`                                                  | `{ delivered: [], failed: [] }`      | nothing                                    |
      | `workspace` | `null`                                                 | `{ delivered: [], failed: [] }`      | nothing                                    |
      | `workspace` | the hand-built `{ event: "session-exploded" }`         | `{ delivered: [], failed: [] }`      | nothing                                    |
      | `workspace` | a copy of `ENV` whose `question` getter throws         | `{ delivered: [], failed: ["ops"] }` | one `notify-delivery-failed` naming ops    |

  Scenario Outline: the URL never leaves env, whatever carries it back
    Given `fetch` <failure>
    When `notify(workspace, ENV, { env, fetch, timeoutMs: 50 })` is awaited
    Then it resolves `{ delivered: [], failed: ["ops"] }`
    And no degrade event, and nothing in the resolved value, contains `secret-token`

    Examples:
      | failure                                                               |
      | throws an `Error` whose `name` is set to `env.HOOK_A`                 |
      | rejects with the string `env.HOOK_A`                                  |
      | answers `400` with a body whose text holds `env.HOOK_A`               |
      | answers `429` with `Retry-After` set to `env.HOOK_A`                  |
      | never settles until its signal aborts, whose reason holds `env.HOOK_A` |
