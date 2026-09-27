@executable @cli @work @work-stream
Feature: one zero-import formatter spells the headline, the cost, the elapsed wait and the one-line ask for every face

  ADR-006 §1, DESIGN "The one shape". `src/notify/form.mjs` is pure and imports nothing. It exports
  exactly six functions: `formatElapsed`, `oneLineAsk`, `eventPhrase`, `headline`, `cost` and
  `accountLine`. `src/notify/form.d.mts` types each. The terminal, the Discord renderer and (story
  05) the board read these, so the event phrases and the elapsed ladder are spelled here and
  nowhere else.

  RULINGS (PO, 2026-09-23). (1) `formatElapsed(ms)` floors at each rung: `<n>s` under a minute,
  `<n>m` under an hour, `<h>h <m>m` under a day (`<h>h` when the minutes are 0), `<d>d <h>h` beyond
  (`<d>d` when the hours are 0). `0` reads `0s`. A negative, non-finite or non-number `ms` answers
  `null`. (2) `oneLineAsk(text)` collapses every whitespace run, newlines included, to one space and
  trims the ends. Up to 100 code points it is returned whole. Longer, it is cut at the last space
  within the first 100 code points, provided that space falls in the last 20 (index 80 or later);
  otherwise it is hard-cut at 100. The cut is right-trimmed and `…` is appended, so the text before
  the `…` is never longer than 100. A non-string or blank `text` answers `null`. (3) `eventPhrase`,
  `headline`, `cost` and `accountLine` take the ENVELOPE (task 03), never loose arguments.
  `eventPhrase` answers, by `event`: `waiting on you`; `answered by <outcome.by>`; `parked,
  unanswered`; `loop halted on <stop.id>`; `loop died`; `loop relaunched`; `accepted`. An unknown
  event answers `null`. (4) `headline(e)` is `<e.ref> — <eventPhrase(e)>`, with an em dash between
  single spaces. (5) `cost(e)` is `(<phase>, <formatElapsed(elapsedMs)>)`, or `(<phase>)` when the
  elapsed is `null`. It is `null` when `phase` is `null`, omitted whole and never a placeholder.
  (6) `accountLine(e)` is `headline(e)`, then ` <cost>` when there is a cost, then `: <oneLineAsk(question)>`
  when there is a one-line ask. (7) The Discord line 1 (task 04) is built from the same `headline(e)` and `cost(e)`, so with the
  `**` markers removed it shares a PREFIX with `accountLine(e)`, as QA ruling (6) states exactly.
  That shared prefix is the byte-identity FF-13108 (131/06) asserts.

  RULINGS (QA, 2026-09-23). (1) "Negative" means `ms < 0`, so `-0` reads `0s`. A fraction floors.
  A `BigInt`, a numeric string or a `Number` object is not a number and answers `null`. There is no
  rung past days. (2) "Whitespace" is JavaScript's `\s`, so U+00A0 and U+3000 collapse too, and a
  run becomes one U+0020. The window is code points 0 to 99, so a space at index 100 is outside it.
  (3) `outcome.by` is the answerer's actor NAME as a string (ADR-003's `by.actor`, not its `by`
  object). A non-string or blank `outcome.by` makes the phrase `answered`, and a non-string or blank
  `stop.id` makes it `loop halted`. A part is omitted, never printed as `null` or `[object Object]`.
  (4) `cost` keys on `formatElapsed`'s answer, so an `elapsedMs` it refuses reads as a null elapsed.
  A non-string or blank `phase` is a null phase. (5) `headline` and `accountLine` answer `null`
  when `eventPhrase` does; only a hand-built object can carry an unknown event. (6) On PO ruling
  (7): read literally it fails whenever there is a one-line ask (`accountLine` goes on `: <ask>`,
  the Discord line goes on ` · <node>`), and for `loop-halted`, whose Discord headline gains
  ` at <stop.ref>`. What holds for every event is a shared PREFIX: both begin with `headline(e)`,
  and, except for `loop-halted`, with `headline(e)` then ` <cost(e)>` when there is one. FF-13108
  asserts that prefix.

  Background:
    Given `E(<fields>)` is an envelope from `buildNotifyEnvelope` (task 03) with ref `"127/02"` and the given fields

  Scenario: the module imports nothing and exports the six
    When `src/notify/form.mjs` is read with its comments stripped
    Then it has no `import` statement, no `import(` call and no `require(` call
    And its export names are exactly `formatElapsed`, `oneLineAsk`, `eventPhrase`, `headline`, `cost` and `accountLine`
    And `src/notify/form.d.mts` declares an exported function for each of the six and for nothing else

  Scenario: the elapsed wait has one ladder
    When `formatElapsed` is asked of 45 s, 12 min, 3 h 10 min, 3 h and 2 d 4 h in milliseconds
    Then it answers `"45s"`, `"12m"`, `"3h 10m"`, `"3h"` and `"2d 4h"`

  Scenario Outline: each rung floors, and its boundary belongs to the next rung
    When `formatElapsed(<ms>)` is asked
    Then it answers `<answer>`

    Examples:
      | ms            | answer    |
      | `0`           | "0s"      |
      | `-0`          | "0s"      |
      | `999`         | "0s"      |
      | `1500.7`      | "1s"      |
      | `59999`       | "59s"     |
      | `60000`       | "1m"      |
      | `3599999`     | "59m"     |
      | `3600000`     | "1h"      |
      | `3660000`     | "1h 1m"   |
      | `86399999`    | "23h 59m" |
      | `86400000`    | "1d"      |
      | `89940000`    | "1d"      |
      | `90000000`    | "1d 1h"   |
      | `172800000`   | "2d"      |
      | `189000000`   | "2d 4h"   |
      | `34560000000` | "400d"    |

  Scenario Outline: a wait that is not a non-negative finite number has no elapsed
    When `formatElapsed(<ms>)` is asked
    Then it answers `null`, and no error is thrown

    Examples:
      | ms                   |
      | `-1`                 |
      | `-86400000`          |
      | `NaN`                |
      | `Infinity`           |
      | `-Infinity`          |
      | `"60000"`            |
      | `60000n`             |
      | `new Number(60000)`  |
      | `null`               |
      | `undefined`          |

  Scenario: a long question becomes one clipped line
    When `oneLineAsk` is asked of a 300-character question that holds newlines and runs of spaces
    Then it answers one line with no newline and no double space, at most 100 characters before a trailing `…`

  Scenario Outline: the one-line ask collapses, trims, then clips on the last space in the last 20
    When `oneLineAsk(<text>)` is asked
    Then it answers <answer>

    Examples:
      | text                                       | answer                                  |
      | `"  Move the residue?  "`                  | `"Move the residue?"`                   |
      | `"a\r\nb\tc"`                              | `"a b c"`                               |
      | `"a \n\n  b"`                              | `"a b"`                                 |
      | `"a b　c"`                        | `"a b c"`                               |
      | 100 `"a"`                                  | 100 `"a"`, whole                        |
      | `"  "`, 100 `"a"`, `"\n"`                  | 100 `"a"`, whole                        |
      | 50 `"a"`, `"   "`, 49 `"b"`                | 50 `"a"`, `" "`, 49 `"b"`, whole        |
      | 101 `"a"`                                  | 100 `"a"`, `"…"`                        |
      | 80 `"a"`, `" "`, 20 `"b"`                  | 80 `"a"`, `"…"`                         |
      | 79 `"a"`, `" "`, 21 `"b"`                  | 79 `"a"`, `" "`, 20 `"b"`, `"…"`        |
      | 99 `"a"`, `" "`, 5 `"b"`                   | 99 `"a"`, `"…"`                         |
      | 100 `"a"`, `" "`, `"b"`                    | 100 `"a"`, `"…"`                        |
      | 80 `"a"`, `" "`, 19 `"b"`, `" "`, 10 `"c"` | 80 `"a"`, `"…"`                         |
      | 50 `"a"`, `"\n\n\n\n"`, 50 `"b"`           | 50 `"a"`, `" "`, 49 `"b"`, `"…"`        |
      | 85 `"a"`, `"  \n "`, 30 `"b"`              | 85 `"a"`, `"…"`                         |
      | 100 `"😀"`                                 | 100 `"😀"`, whole                       |
      | 101 `"😀"`                                 | 100 `"😀"`, `"…"`                       |
      | 99 `"a"`, 5 `"😀"`                         | 99 `"a"`, `"😀"`, `"…"`                 |

  Scenario Outline: nothing to ask answers null
    When `oneLineAsk(<text>)` is asked
    Then it answers `null`, and no error is thrown

    Examples:
      | text             |
      | `""`             |
      | `"  \n\t "`      |
      | `" "`       |
      | `null`           |
      | `undefined`      |
      | `42`             |
      | `["Q?"]`         |

  Scenario: the account line is headline, cost and one-line ask
    When `accountLine(E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "Move the residue?\nOptions: a, b" }))` is asked
    Then it answers `"127/02 — waiting on you (build, 12m): Move the residue? Options: a, b"`

  Scenario: an event with no phase has no cost and no dangling brackets
    When `accountLine(E({ event: "milestone-accepted", outcome: { title: "The human in the loop" } }))` is asked for ref `"131"`
    Then it answers `"131 — accepted"`

  Scenario Outline: every event has its phrase, and the account line omits what it lacks
    When `eventPhrase` and `accountLine` are asked of <envelope>
    Then `eventPhrase` answers <phrase>, and `accountLine` answers <account>

    Examples:
      | envelope                                                                                              | phrase                          | account                                                             |
      | `E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "Q?" })`               | `"waiting on you"`              | `"127/02 — waiting on you (build, 12m): Q?"`                        |
      | `E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { by: "umair", answer: "b" } })` | `"answered by umair"`     | `"127/02 — answered by umair (build, 12m)"`                         |
      | `E({ event: "session-parked-unanswered", phase: "build", elapsedMs: 11400000, question: "Move?\nOptions: a, b" })` | `"parked, unanswered"` | `"127/02 — parked, unanswered (build, 3h 10m): Move? Options: a, b"` |
      | `E({ ref: "127", event: "loop-halted", elapsedMs: 60000, stop: { id: "story-failed", ref: "127/03" } })` | `"loop halted on story-failed"` | `"127 — loop halted on story-failed"`                             |
      | `E({ ref: "127", event: "loop-died", elapsedMs: 60000, outcome: { cause: "SIGKILL" } })`               | `"loop died"`                   | `"127 — loop died"`                                                 |
      | `E({ ref: "127", event: "loop-relaunched", elapsedMs: 60000, outcome: { cause: null } })`              | `"loop relaunched"`             | `"127 — loop relaunched"`                                           |
      | `E({ ref: "131", event: "milestone-accepted", outcome: { title: "T" } })`                              | `"accepted"`                    | `"131 — accepted"`                                                  |
      | `E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { answer: "b" } })`        | `"answered"`                    | `"127/02 — answered (build, 12m)"`                                  |
      | `E({ event: "session-answered", phase: "build", outcome: { by: { actor: "umair" }, answer: "b" } })`   | `"answered"`                    | `"127/02 — answered (build)"`                                       |
      | `E({ ref: "127", event: "loop-halted", stop: { remedy: "Fix it." } })`                                 | `"loop halted"`                 | `"127 — loop halted"`                                               |
      | `E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "  \n " })`            | `"waiting on you"`              | `"127/02 — waiting on you (build, 12m)"`                            |
      | `E({ event: "session-needs-input", question: "Q?" })`                                                  | `"waiting on you"`              | `"127/02 — waiting on you: Q?"`                                     |
      | the hand-built `{ event: "session-exploded", ref: "127/02" }`                                          | `null`                          | `null`                                                              |

  Scenario Outline: the cost is the phase and the elapsed wait, or nothing
    When `cost(E({ event: <event>, phase: <phase>, elapsedMs: <elapsed> }))` is asked
    Then it answers <cost>

    Examples:
      | event                  | phase      | elapsed    | cost                  |
      | "session-needs-input"  | "build"    | `720000`   | `"(build, 12m)"`      |
      | "session-needs-input"  | "refine"   | `11400000` | `"(refine, 3h 10m)"`  |
      | "session-needs-input"  | "verify"   | `0`        | `"(verify, 0s)"`      |
      | "session-needs-input"  | "build"    | `null`     | `"(build)"`           |
      | "session-needs-input"  | "build"    | `-5`       | `"(build)"`           |
      | "session-needs-input"  | `null`     | `720000`   | `null`                |
      | "session-needs-input"  | `null`     | `null`     | `null`                |
      | "session-needs-input"  | `""`       | `720000`   | `null`                |
      | "loop-halted"          | "build"    | `60000`    | `null`                |
      | "milestone-accepted"   | "verify"   | `5`        | `null`                |

  Scenario Outline: the Discord line 1 and the account line share their opening bytes
    When line 1 of `renderDiscord(<envelope>)` (task 04) has its `**` markers removed
    Then it begins with <prefix>, and so does `accountLine(<envelope>)`

    Examples:
      | envelope                                                                                      | prefix                                      |
      | `E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "Q?" })`       | `"127/02 — waiting on you (build, 12m)"`    |
      | `E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { by: "umair" } })` | `"127/02 — answered by umair (build, 12m)"` |
      | `E({ ref: "127", event: "loop-halted", stop: { id: "story-failed", ref: "127/03" } })`         | `"127 — loop halted on story-failed"`       |
      | `E({ ref: "131", event: "milestone-accepted", outcome: { title: "T" } })`                      | `"131 — accepted"`                          |
