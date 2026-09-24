@executable @cli @work @work-stream
Feature: the Discord message is plain content of at most four parts, within 2,000 characters whenever its fixed lines fit, and only its body ever yields

  ADR-005 §2, DESIGN §3. `renderDiscord(envelope)` in `src/notify/discord.mjs` answers
  `{ content, username: "aof", allowed_mentions: { parse: [] } }`. There is no embed: a phone's push
  preview shows `content`, and `parse: []` means a question containing `@everyone` pings no one.
  `content` is at most four lines, in this order, each omitted when absent and never a placeholder:
  line 1 `**<headline>** <cost> · <node>`, the body, the action line, the link. Line 1, the action
  line and the link never truncate. The body takes what is left of 2,000 and is clipped with a
  suffix; an odd number of code fences in the clipped body gets a closing fence BEFORE the suffix,
  so an open block can never swallow the answer command.

  RULINGS (PO, 2026-09-23). (1) Line 1 is `**<headline(e)>**`, then ` <cost(e)>` when there is a
  cost, then ` · <node>` when `node` is not `null`. `headline` and `cost` are `form.mjs`'s (task 01),
  never re-spelled here. (2) The body and action line, by event:
  - `session-needs-input`: body = `question` verbatim; action = ``Answer: `<answerPath>` ``.
  - `session-answered`: body = `outcome.answer` verbatim; action = `The session is resuming.`
  - `session-parked-unanswered`: body = `oneLineAsk(question)`; action = ``Answer to resume: `<answerPath>` ``.
  - `loop-halted`: line 1's headline gains ` at <stop.ref>` inside the bold when `stop.ref` is not
    `null`; body = `stop.remedy`; action = ``Resume: `<answerPath>` ``.
  - `loop-died`: body = `outcome.cause`; action = ``Resume: `<answerPath>` ``.
  - `loop-relaunched`: body = `outcome.cause`; no action line.
  - `milestone-accepted`: body = `outcome.title`; no action line.
  A `null`, non-string or blank body omits the body line. (3) Lines are joined by `\n`. The cap is
  counted in UTF-16 code units (`content.length`), which never undercounts Discord's own count.
  (4) The body is clipped only when the whole would exceed 2,000. It is cut at the last whitespace in
  the room left, or hard-cut when there is none in its last 20 units, then right-trimmed. Then comes
  `\n` + ```` ``` ```` if the kept part holds an odd number of ```` ``` ````, then `…`, then
  ` (continues at the link)` when there is a link, else ` (continued in the terminal)`. The room is
  computed so that the result, suffix and fence included, is at most 2,000. (5) When not even the
  suffix fits, the body line is omitted. (6) A clip never splits a surrogate pair.

  RULINGS (QA, 2026-09-23). (1) "At most four lines" counts the four PARTS. The body is verbatim,
  so a question or answer with newlines keeps them, and `content` then has more than four
  `\n`-separated lines. (2) A cut that would split a surrogate pair drops the pair whole, so the
  kept part may be one unit short of its room. The kept part is always a prefix of the body.
  (3) Whitespace for the cut is `\s`, newline included. The last 20 units of a room `K` are indexes
  `K − 20` to `K − 1`, as in task 01's window. (4) Where a closing fence is needed, the exact cut is
  pinned only by the result being at most 2,000 and the fence standing directly before `…`. A body
  that is not clipped is left as written, whatever its fence count. (5) PO ruling (5) is read
  literally. When the room equals the suffix's length, the body line is the suffix alone; one unit
  less and it is omitted. When line 1, the action line and the link alone pass 2,000,
  `renderDiscord` still answers them and does not throw. Discord's `400` is then task 05's
  `notify-delivery-failed`, so the title's "under 2,000" holds whenever the fixed lines fit.
  (6) ` at <stop.ref>` is added only for a non-blank string `stop.ref`. (7) The mention guard is
  `parse: []` alone. `content` is never escaped.

  Background:
    Given `E(<fields>)` is an envelope from `buildNotifyEnvelope` with ref `"127/02"`, node `"aof-wsl"` and link `"https://example.test/127/02"`

  Scenario: an ask posts four lines with no mentions allowed
    When `renderDiscord(E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "Move the residue? @everyone" }))` is asked
    Then `content` is the four lines `**127/02 — waiting on you** (build, 12m) · aof-wsl`, `Move the residue? @everyone`, ``Answer: `aof work answer 127/02 "…"` `` and `https://example.test/127/02`
    And `username` is `"aof"` and `allowed_mentions` deep-equals `{ parse: [] }`, and the body has no `embeds` key

  Scenario: a 3,000-character ask with an open fence keeps line 1, the command and the link
    Given a question of 3,000 characters whose first 200 open a ```` ``` ```` block that is never closed
    When `renderDiscord` is asked of the ask envelope carrying it
    Then `content.length` is at most 2,000
    And its first line, its action line and its last line are exactly those of the unclipped message
    And the body line ends `…` + ` (continues at the link)`, preceded by a closing fence, and the whole `content` holds an even number of ```` ``` ````

  Scenario: an accept has a headline and a title and nothing else
    When `renderDiscord` is asked of a `milestone-accepted` envelope for ref `"131"` with title `"The human in the loop"` and no node or link
    Then `content` is `**131 — accepted**` + `\n` + `The human in the loop`

  Scenario Outline: each event's message is its line 1, its body and its action line, parts omitted when absent
    Given the link template is `https://example.test/{ref}`
    When `renderDiscord(<envelope>)` is asked
    Then `content` is these lines joined by `\n`: <lines>

    Examples:
      | envelope                                                                                                     | lines                                                                                                                              |
      | `E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { by: "umair", answer: "take b" } })` | `**127/02 — answered by umair** (build, 12m) · aof-wsl`; `take b`; `The session is resuming.`; `https://example.test/127/02` |
      | `E({ event: "session-parked-unanswered", phase: "build", elapsedMs: 11400000, question: "Move?\nOptions: a, b" })` | `**127/02 — parked, unanswered** (build, 3h 10m) · aof-wsl`; `Move? Options: a, b`; ``Answer to resume: `aof work answer 127/02 "…"` ``; `https://example.test/127/02` |
      | `E({ ref: "127", event: "loop-halted", elapsedMs: 60000, stop: { id: "story-failed", remedy: "Fix the gate.", ref: "127/03" } })` | `**127 — loop halted on story-failed at 127/03** · aof-wsl`; `Fix the gate.`; ``Resume: `aof work loop 127 --resume` ``; `https://example.test/127` |
      | `E({ ref: "127", event: "loop-halted", elapsedMs: 60000, stop: { id: "story-failed", remedy: "Fix the gate." } })` | `**127 — loop halted on story-failed** · aof-wsl`; `Fix the gate.`; ``Resume: `aof work loop 127 --resume` ``; `https://example.test/127` |
      | `E({ ref: "127", event: "loop-died", elapsedMs: 60000, outcome: { cause: "SIGKILL" } })`                     | `**127 — loop died** · aof-wsl`; `SIGKILL`; ``Resume: `aof work loop 127 --resume` ``; `https://example.test/127`                |
      | `E({ ref: "127", event: "loop-died", elapsedMs: 60000 })`                                                    | `**127 — loop died** · aof-wsl`; ``Resume: `aof work loop 127 --resume` ``; `https://example.test/127`                           |
      | `E({ ref: "127", event: "loop-relaunched", elapsedMs: 60000, outcome: { cause: "host slept" } })`           | `**127 — loop relaunched** · aof-wsl`; `host slept`; `https://example.test/127`                                                   |
      | `E({ ref: "127", event: "loop-relaunched" })` built with no node and no link                                 | `**127 — loop relaunched**`                                                                                                        |
      | `E({ ref: "131", event: "milestone-accepted", outcome: { title: "The human in the loop" } })`               | `**131 — accepted** · aof-wsl`; `The human in the loop`; `https://example.test/131`                                               |
      | `E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "  \n " })`                  | `**127/02 — waiting on you** (build, 12m) · aof-wsl`; ``Answer: `aof work answer 127/02 "…"` ``; `https://example.test/127/02`   |
      | `E({ event: "session-needs-input", question: "Q?" })`                                                        | `**127/02 — waiting on you** · aof-wsl`; `Q?`; ``Answer: `aof work answer 127/02 "…"` ``; `https://example.test/127/02`         |
      | `E({ event: "session-needs-input", phase: "build", question: "Q?" })`                                        | `**127/02 — waiting on you** (build) · aof-wsl`; `Q?`; ``Answer: `aof work answer 127/02 "…"` ``; `https://example.test/127/02` |
      | `E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: "A\n\nB" })`                 | `**127/02 — waiting on you** (build, 12m) · aof-wsl`; `A`; an empty line; `B`; ``Answer: `aof work answer 127/02 "…"` ``; `https://example.test/127/02` |
      | `E({ event: "session-answered", phase: "build", elapsedMs: 720000, outcome: { by: "umair", answer: 42 } })`  | `**127/02 — answered by umair** (build, 12m) · aof-wsl`; `The session is resuming.`; `https://example.test/127/02`               |

  Scenario Outline: a mention stays in the text and pings no one
    When `renderDiscord(E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: <question> }))` is asked
    Then the second line of `content` is <question> byte for byte
    And `allowed_mentions` deep-equals `{ parse: [] }`

    Examples:
      | question                          |
      | `"@everyone look"`                |
      | `"@here now"`                     |
      | `"ping <@123456789012345678>"`    |
      | `"ping <@&987654321098765432>"`   |

  Scenario Outline: only the body yields, to the unit, and never mid-pair
    Given `A(f)` is `E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, ...f })`, whose line 1 is 50 units, action line 36 and link 27
    And so the body's room is 1,884 with the link and 1,912 without, and the kept part's room is 1,859 and 1,883
    When `renderDiscord` is asked of `A({ question: <question> })` with the link <link>
    Then the body line is <body>, and `content.length` is <length>
    And line 1, the action line and (when present) the link are exactly those of the unclipped message

    Examples:
      | question                          | link    | body                                                    | length |
      | 1,883 `"a"`                       | present | the question, untouched                                 | 1,999  |
      | 1,884 `"a"`                       | present | the question, untouched                                 | 2,000  |
      | 1,885 `"a"`                       | present | 1,859 `"a"`, `"… (continues at the link)"`              | 2,000  |
      | 3,000 `"a"`                       | present | 1,859 `"a"`, `"… (continues at the link)"`              | 2,000  |
      | 1,839 `"a"`, `" "`, 200 `"b"`     | present | 1,839 `"a"`, `"… (continues at the link)"`              | 1,980  |
      | 1,838 `"a"`, `" "`, 200 `"b"`     | present | 1,838 `"a"`, `" "`, 20 `"b"`, `"… (continues at the link)"` | 2,000 |
      | 1,850 `"a"`, `"\n"`, 200 `"b"`    | present | 1,850 `"a"`, `"… (continues at the link)"`              | 1,991  |
      | 1,845 `"a"`, `" \t "`, 200 `"b"`  | present | 1,845 `"a"`, `"… (continues at the link)"`              | 1,986  |
      | 1,858 `"a"`, `"😀"`, 200 `"b"`    | present | 1,858 `"a"`, `"… (continues at the link)"`              | 1,999  |
      | 1,857 `"a"`, `"😀"`, 200 `"b"`    | present | 1,857 `"a"`, `"😀"`, `"… (continues at the link)"`      | 2,000  |
      | 1,912 `"a"`                       | absent  | the question, untouched                                 | 2,000  |
      | 1,913 `"a"`                       | absent  | 1,883 `"a"`, `"… (continued in the terminal)"`          | 2,000  |

  Scenario Outline: a clipped body closes an open fence before the suffix, and only then
    When `renderDiscord(E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: <question> }))` is asked
    Then `content.length` is at most 2,000, and the body line's text before any fence and suffix is a prefix of the question
    And the `…` of the suffix is preceded by <before>

    Examples:
      | question                                      | before                                  |
      | `"```js\n"`, 3,000 `"a"`                      | `"\n```"`, a closing fence              |
      | `"```\n```\n```\n"`, 3,000 `"a"`              | `"\n```"`, a closing fence              |
      | `"```\nx\n```\n"`, 3,000 `"a"`                | `"a"`, with no fence added              |
      | 3,000 `"a"`, `"\n```\nx"`                     | `"a"`, since the fence lay past the cut |

  Scenario: an unclipped body with an open fence is left as written
    When `renderDiscord` is asked of the ask envelope whose question is `"```\n"` then 1,000 `"a"`
    Then the body line is that question exactly, with no fence and no suffix added

  Scenario Outline: when the fixed lines leave no room, the body goes and the fixed lines stay
    Given the link template is one that fills, for ref `"127/02"`, to <n> characters
    When `renderDiscord(E({ event: "session-needs-input", phase: "build", elapsedMs: 720000, question: <question> }))` is asked
    Then `content` is <content>, with `content.length` <length>, and no error is thrown

    Examples:
      | n     | question     | content                                                                     | length |
      | 1,886 | 3,000 `"a"`  | four lines, the body line exactly `"… (continues at the link)"`             | 2,000  |
      | 1,887 | 3,000 `"a"`  | three lines: line 1, the action line and the link                           | 1,975  |
      | 2,000 | `"Q?"`       | three lines: line 1, the action line and the link                           | 2,088  |
