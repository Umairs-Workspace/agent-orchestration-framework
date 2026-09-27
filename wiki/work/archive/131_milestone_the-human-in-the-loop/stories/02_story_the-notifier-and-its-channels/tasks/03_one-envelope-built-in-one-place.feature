@executable @cli @work @work-stream
Feature: one builder makes the eleven-key envelope every channel renders, for seven named events

  ADR-005 §3. `buildNotifyEnvelope` in `src/notify/notify.mjs` is the ONE builder. The envelope has
  eleven frozen keys, in this order: `{ event, ref, at, node, phase, elapsedMs, question, stop,
  outcome, answerPath, link }`. `EVENTS` holds seven names, and each event carries only its own
  keys; every other nullable key is `null`. `node` is `config.mesh.nodeId ?? null`. `link` is the
  configured template with `{ref}` filled, or `null`. `answerPath` is the answer command for the ask
  events and the `--resume` command for a halt or a death. This story fires only
  `milestone-accepted` (task 06); stories 03 and 04 fire the other six.

  RULINGS (PO, 2026-09-23). (1) The signature is `buildNotifyEnvelope(event, fields, { config, now })`,
  with `now` an injected clock answering a `Date`, and `at` its ISO-8601 UTC-Z string. (2) What each
  event keeps from `fields` (every key not named is `null`):
  - `session-needs-input`: `phase`, `elapsedMs`, `question`; `answerPath` `aof work answer <ref> "…"`.
  - `session-answered`: `phase`, `elapsedMs`, `outcome: { by, answer }`; no `answerPath`.
  - `session-parked-unanswered`: `phase`, `elapsedMs`, `question`, `outcome: { askedAt, parkedAt }`;
    `answerPath` `aof work answer <ref> "…"`.
  - `loop-halted`: `elapsedMs`, `stop: { id, producer, remedy, ref }`; `answerPath`
    `aof work loop <ref> --resume`.
  - `loop-died`: `elapsedMs`, `outcome: { cause }`; `answerPath` `aof work loop <ref> --resume`.
  - `loop-relaunched`: `elapsedMs`, `outcome: { cause }`; no `answerPath`.
  - `milestone-accepted`: `outcome: { title }` only.
  A key the event does not keep is `null` even when `fields` passes it. (3) AMENDMENT to ADR-005 §3,
  ratified here in the beat that raised it: `stop` carries a fourth key, `ref`, the halting item's
  ref or `null`. For the loop events the envelope's `ref` is the loop's SCOPE, and DESIGN §3's halt
  line reads `<scope> — loop halted on <stop> at <ref>`, which the ADR's three keys cannot spell. The
  eleven envelope keys do not move. (4) Missing sub-keys of `stop` and `outcome` read `null`, and
  unknown sub-keys are dropped. (5) `link` replaces every `{ref}` in the template with the ref; a
  template without `{ref}` is used as it is. (6) An unknown `event` is refused with a thrown error
  coded `notify-unknown-event`. It is a programmer error: the six sites pass literals, which FF-13107
  (131/06) enumerates. (7) The envelope and its nested objects are frozen.

  RULINGS (QA, 2026-09-23). (1) An event that keeps `stop` or `outcome` always carries that object.
  Its sub-keys are `null` when `fields` omits the object or passes a non-object, so a renderer
  reads `outcome.cause` without a guard. (2) Sub-key values are kept as given, neither checked nor
  coerced. What an unusable value reads as is the formatter's decision (task 01). (3) The builder
  reads `link` through `resolveNotifyConfig` (task 02), the block's one reader, so a channel-less
  block gives `link: null` even when it carries a template. The ref goes in verbatim, not
  percent-encoded, and `{ref}` matches case-sensitively. (4) An event is known only when it is one
  of the seven by exact string. A lookup never finds `constructor`, `__proto__` or `toString` on a
  prototype. (5) The envelope is a copy, so mutating `fields` after the call changes nothing in
  it. An absent `config` reads as `{}`.

  Scenario: an ask envelope carries the question, the phase, the wait and the answer command
    Given `config` has `mesh.nodeId: "node-2976"` and `work.notify.link: "https://example.test/{ref}"`
    When `buildNotifyEnvelope("session-needs-input", { ref: "127/02", phase: "build", elapsedMs: 720000, question: "Move the residue?" }, { config, now: () => new Date("2026-09-23T17:00:00.000Z") })` is asked
    Then it answers `{ event: "session-needs-input", ref: "127/02", at: "2026-09-23T17:00:00.000Z", node: "node-2976", phase: "build", elapsedMs: 720000, question: "Move the residue?", stop: null, outcome: null, answerPath: "aof work answer 127/02 \"…\"", link: "https://example.test/127/02" }`
    And its keys are exactly those eleven, in that order

  Scenario: EVENTS holds the seven
    When `EVENTS` is read from `src/notify/notify.mjs`
    Then it is the frozen list `session-needs-input`, `session-answered`, `session-parked-unanswered`, `loop-halted`, `loop-died`, `loop-relaunched`, `milestone-accepted`

  Scenario: an accept envelope carries only the title
    When `buildNotifyEnvelope("milestone-accepted", { ref: "131", phase: "verify", elapsedMs: 5, outcome: { title: "The human in the loop" } }, { config: {}, now })` is asked
    Then `phase`, `elapsedMs`, `question`, `stop`, `answerPath`, `node` and `link` are `null`, and `outcome` is `{ title: "The human in the loop" }`

  Scenario: an unknown event is refused
    When `buildNotifyEnvelope("session-exploded", { ref: "127/02" }, { config: {}, now })` is asked
    Then it throws an error coded `notify-unknown-event`

  Scenario Outline: each event keeps its own keys from the same full fields and nulls the rest
    Given `F` = `{ ref: "127", phase: "build", elapsedMs: 720000, question: "Q?", stop: { id: "story-failed", producer: "gate", remedy: "Fix it.", ref: "127/03" }, outcome: { by: "umair", answer: "b", askedAt: "A", parkedAt: "P", cause: "SIGKILL", title: "T" } }`
    When `buildNotifyEnvelope("<event>", F, { config: {}, now })` is asked
    Then `phase` is <phase>, `elapsedMs` <elapsed>, `question` <question>, `stop` <stop>, `outcome` <outcome> and `answerPath` <answerPath>

    Examples:
      | event                     | phase     | elapsed  | question | stop               | outcome                            | answerPath                     |
      | session-needs-input       | `"build"` | `720000` | `"Q?"`   | `null`             | `null`                             | `"aof work answer 127 \"…\""`  |
      | session-answered          | `"build"` | `720000` | `null`   | `null`             | `{ by: "umair", answer: "b" }`     | `null`                         |
      | session-parked-unanswered | `"build"` | `720000` | `"Q?"`   | `null`             | `{ askedAt: "A", parkedAt: "P" }`  | `"aof work answer 127 \"…\""`  |
      | loop-halted               | `null`    | `720000` | `null`   | `F.stop`, all four | `null`                             | `"aof work loop 127 --resume"` |
      | loop-died                 | `null`    | `720000` | `null`   | `null`             | `{ cause: "SIGKILL" }`             | `"aof work loop 127 --resume"` |
      | loop-relaunched           | `null`    | `720000` | `null`   | `null`             | `{ cause: "SIGKILL" }`             | `null`                         |
      | milestone-accepted        | `null`    | `null`   | `null`   | `null`             | `{ title: "T" }`                   | `null`                         |

  Scenario Outline: a nested object has exactly its own sub-keys, missing ones null
    When `buildNotifyEnvelope("<event>", <fields>, { config: {}, now })` is asked
    Then `<key>` deep-equals <value>

    Examples:
      | event                     | fields                                                  | key     | value                                                     |
      | loop-halted               | `{ ref: "127", stop: { id: "x" } }`                     | stop    | `{ id: "x", producer: null, remedy: null, ref: null }`    |
      | loop-halted               | `{ ref: "127", stop: { id: "x", url: "u", token: "t" } }` | stop  | `{ id: "x", producer: null, remedy: null, ref: null }`    |
      | loop-halted               | `{ ref: "127" }`                                        | stop    | `{ id: null, producer: null, remedy: null, ref: null }`   |
      | loop-halted               | `{ ref: "127", stop: "boom" }`                          | stop    | `{ id: null, producer: null, remedy: null, ref: null }`   |
      | loop-died                 | `{ ref: "127", outcome: {} }`                           | outcome | `{ cause: null }`                                         |
      | loop-died                 | `{ ref: "127" }`                                        | outcome | `{ cause: null }`                                         |
      | session-answered          | `{ ref: "127/02", outcome: { by: "umair" } }`           | outcome | `{ by: "umair", answer: null }`                           |
      | session-answered          | `{ ref: "127/02", outcome: { by: { actor: "umair" }, answer: "b" } }` | outcome | `{ by: { actor: "umair" }, answer: "b" }`   |
      | session-parked-unanswered | `{ ref: "127/02", outcome: { parkedAt: "P", cause: "x" } }` | outcome | `{ askedAt: null, parkedAt: "P" }`                   |
      | milestone-accepted        | `{ ref: "131" }`                                        | outcome | `{ title: null }`                                         |
      | milestone-accepted        | `{ ref: "131", outcome: { title: "T", by: "x" } }`      | outcome | `{ title: "T" }`                                          |
      | session-needs-input       | `{ ref: "127/02", stop: { id: "x" } }`                  | stop    | `null`                                                    |
      | session-needs-input       | `{ ref: "127/02", outcome: { title: "T" } }`            | outcome | `null`                                                    |

  Scenario Outline: the node and the link come from config, and the link fills every ref
    Given `N(t)` is the config `{ work: { notify: { channels: { ops: { type: "discord" } }, link: t } } }`
    When `buildNotifyEnvelope("session-needs-input", { ref: "127/02" }, { config: <config>, now })` is asked
    Then `link` is <link> and `node` is <node>

    Examples:
      | config                                                                  | link                                   | node          |
      | `{}`                                                                    | `null`                                 | `null`        |
      | `undefined`                                                             | `null`                                 | `null`        |
      | `{ mesh: {} }`                                                          | `null`                                 | `null`        |
      | `{ mesh: { nodeId: "node-2976" } }`                                     | `null`                                 | `"node-2976"` |
      | `N("https://x.test/{ref}")`                                             | `"https://x.test/127/02"`              | `null`        |
      | `N("https://x.test/{ref}?focus={ref}")`                                 | `"https://x.test/127/02?focus=127/02"` | `null`        |
      | `N("https://x.test/board")`                                             | `"https://x.test/board"`               | `null`        |
      | `N("https://x.test/{REF}")`                                             | `"https://x.test/{REF}"`               | `null`        |
      | `N("{ref}")`                                                            | `"127/02"`                             | `null`        |
      | `N(undefined)`                                                          | `null`                                 | `null`        |
      | `{ work: { notify: { channels: {}, link: "https://x.test/{ref}" } } }`  | `null`                                 | `null`        |

  Scenario Outline: anything but one of the seven is refused
    When `buildNotifyEnvelope(<event>, { ref: "127/02" }, { config: {}, now })` is asked
    Then it throws an error coded `notify-unknown-event`

    Examples:
      | event                    |
      | `""`                     |
      | `"SESSION-NEEDS-INPUT"`  |
      | `"milestone_accepted"`   |
      | `" loop-died"`           |
      | `"constructor"`          |
      | `"__proto__"`            |
      | `"toString"`             |
      | `undefined`              |
      | `null`                   |

  Scenario: the envelope is frozen through and does not share the fields it was built from
    Given `fields` = `{ ref: "131", outcome: { title: "T" } }`
    When `e` = `buildNotifyEnvelope("milestone-accepted", fields, { config: {}, now })` and then `fields.outcome.title` is set to `"X"`
    Then `e` and `e.outcome` are frozen, and `e.outcome.title` is still `"T"`
    And a halt envelope's `stop` is frozen too
