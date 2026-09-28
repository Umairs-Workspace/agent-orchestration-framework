@executable @ui @work @board
Feature: every word and state the ask card shows is decided by one pure function over the ask, and the header stops offering a second answer door

  ADR-006 §1, §4; DESIGN §1. `askCardState(ask, { ref, phase, error, sent, text, expanded,
  nowMs })` is exported from `ui/src/board/action.mjs`, typed in `action.d.mts`, and is where the
  card's decisions live, because the board has no React harness and a rule only a component
  exercises has no test. It is pure: no React, no IO, no clock of its own — `nowMs` is the
  board's 1 s `now`, so the elapsed wait ticks without a fetch. The elapsed words come from
  `formatElapsed` and the answered phrase from `eventPhrase`, imported from
  `../../../src/notify/form.mjs` — the ONE `ui/src` import that resolves outside `ui/src`
  (FF-13108). `action.mjs` spells no elapsed ladder and no event phrase of its own. The board's
  `relativeTime` is not used for the wait. `primaryAction` gains one rule: while `item.ask`
  stands, a `mirror` action's label is `Open terminal — <nodeId>` and never `Answer on <nodeId>`.

  RULINGS (PO, 2026-09-23).
  (1) `phase` is the card's SEND phase, `"idle"` (the default), `"sending"` or `"error"`; `error`
  is `{ code, message }` from the rejected `workApi.answer`; `sent` is the eight-key answer
  document from a resolved one; `text` is the textarea's current value. The ask's own `phase`
  (`refine`/`build`/`verify`) is read off `ask.phase`.
  (2) It answers ELEVEN keys, in this order: `{ state, heading, cost, question, unreadable,
  toggle, notice, helper, button, receipt, message }`. `state` is `waiting`, `parked` or
  `answered`: `answered` when `sent` is given or `ask.state` is answered; else `parked` when
  `ask.parkedAt` is set; else `waiting`. `null` in, `null` out: no ask, no card.
  (3) `heading`: `WAITING ON YOU` is `eventPhrase({ event: "session-needs-input" })` upper-cased;
  `PARKED — UNANSWERED` is DESIGN §1's own word for the card; answered is `eventPhrase` of
  `session-answered` with `outcome.by` = the answerer's actor, upper-cased.
  (4) `cost` joins with ` · `: the ask's phase when it has one, then the wait, then `on <node>`
  when `ask.local` is false. The wait is `formatElapsed(nowMs − askedAt)` while waiting;
  `asked <formatElapsed(nowMs − askedAt)> · parked <formatElapsed(nowMs − parkedAt)>` while
  parked; `formatElapsed(answeredAt − askedAt)` once answered, frozen. A part that cannot be
  computed is omitted, never printed as a placeholder; nothing left is `null`.
  (5) `question` is `ask.question` verbatim — never trimmed, collapsed or clipped (the clamp is
  CSS). `unreadable` is `The session's question could not be read — open its terminal to see
  it.` when `question` is `null` or blank, else `null`. There is no loading state: the ask rides
  the list row, so the card fetches nothing (a DEPARTURE from DESIGN §1's `Loading the question…`,
  which no reachable path can show). `toggle` is `Show less` when `expanded`, else `Show the full
  question`; the component shows it only when the text is clamped.
  (6) `notice` is `The session stopped waiting at its bound. Your answer resumes it.` while
  parked, else `null`. `helper` is `Sent to the session word for word and kept on the run
  record.`, plus ` Delivered to <node>.` when `ask.local` is false.
  (7) `button` is `{ label, disabled, busy }`: `Send answer`, or `Send answer and resume` while
  parked, or `Sending…` while sending; `disabled` while sending or while `text` is blank after
  `trim()`; `busy` only while sending. There is no second button and no default text: nothing
  the function answers can prefill the textarea.
  (8) `receipt` is `null` until answered, then `✓ Answered by <actor> · <wait> — the session is
  resuming`, or, when the ask was parked, `✓ Answered by <actor> · <wait> — resumes with the loop
  (<resume>)` (ADR-006 §4's DEFAULT DECISION). `<resume>` is `sent.resume` when `sent` carries
  one, else `aof work loop <scope> --resume` with `<scope>` = `ask.scope` when it is a non-blank
  string, else `ref`'s top-level item (04 PO ruling 3's rule, so the two never disagree). The
  wait after a send is `sent.answeredAt − ask.askedAt`. The actor is `sent.by.actor ?? ask.by?.actor`,
  and `you` when neither is a non-blank string. Once answered, `button` and `helper` are `null`.
  (9) `message` is `null` unless `phase` is `"error"`, then `{ text, title }` with `title` the
  server's sentence and `text` shaped by the code: `ask-already-answered`, `answer-not-waiting`
  and `session-not-parked` read `✕ Not sent — the session is no longer waiting`;
  `terminal-resume-not-started`, `terminal-resume-target-not-connected` and
  `session-target-not-connected` read `✕ Not sent — <node> is unreachable`; any other code, or
  none, reads `✕ Not sent — <message>`. An error never clears `text`: the function has no output
  that could.

  RULINGS (QA, 2026-09-23).
  (1) Cell shorthand: `UB` = `{ actor: "umami", via: "board", node: "node-7297" }`; `D(<f>)` = the
  answer document `{ ok: true, ref: "03/01", runId: "R1", delivery: "waiting", state:
  "answered", by: UB, answeredAt: "2026-09-23T17:12:00.000Z", resume: null }` overridden by `f`;
  `W` = `A({ runId: null, state: "waiting", question: null, phase: null, local: false, node:
  "node-2976", sessionId: "S9" })`; `EX` = `{ active: true, state: "running", code:
  "needs-input", nodeId: "node-2976", sessionId: "S9" }`; `U` = the `unreadable` sentence. A
  `label` of `null` means `button` is `null`. A bare `17:05` is `"2026-09-23T17:05:00.000Z"`.
  (2) Blank is the verb's blank (131/01 task 03, PO 3): a non-string, or empty after `trim()`.
  The card pre-empts no other refusal (ADR-003 §2), so 8,001 characters enables Send.
  (3) A wait is floored at 0: an instant ahead of `nowMs` (clock skew with the asking node) reads
  `0s`, as 04 task 00's QA (4) floors the announced wait. An unparseable instant or a non-finite
  `nowMs` is a part that cannot be computed. For the PO to ratify.
  (4) Once answered, the answered instant is `sent.answeredAt` when `sent` is given, else
  `ask.answeredAt`; the cost and the receipt both read it, and `nowMs` moves neither.
  (5) A receipt whose wait cannot be computed drops ` · <wait>`: `✓ Answered by umami — …`.
  (6) The answered heading names the receipt's actor, so a blank actor reads `ANSWERED BY YOU`.
  (7) A non-string `question` is `null`. A `phase` is a part only when a non-blank string
  (131/02 task 01, QA 4).
  (8) A mesh `sent` with `state: "dispatched"` reads the resuming receipt: the row's `code` turns
  `resumed` on the next poll, which drops the mesh ask and the card (task 00). For the PO to ratify.
  (9) `item.ask` stands when it is a non-null object; `ask: null` keeps today's label.

  RULINGS (developer, 2026-09-23).
  (10) Feasible as written. From `ui/src/board/`, `../../../src/notify/form.mjs` is the repo's
  `src/`. A scratch probe of the same shape was measured: `tsc -b` under the ui tsconfig
  (`include: ["src"]`, no `rootDir`, no `composite`) pulls the outside `.d.mts` into the program
  and exits 0, and `vite build` bundles the `.mjs`. The dev server's `fs.allow` defaults to the
  workspace root, and the repo's `package.json` declares `workspaces: ["ui"]`, so `src/` is
  served. `ui/tsconfig.app.json` and `ui/vite.config.ts` stay byte-unchanged; FF-5307 hashes both.
  (11) `test/ui/board-action.test.mjs` imports `action.mjs` under plain Node. `form.mjs` imports
  nothing, so the edge loads nothing more. No arch test fences a `ui` to `src` import today
  (FF-13108 is 06's). `action.d.mts` may `import type` from the same specifier.
  (12) `formatElapsed` answers `null` for a negative, so QA 3's floor is `Math.max(0, delta)` on
  a finite delta, before the call. `eventPhrase` takes a hand-built `{ event, outcome: { by } }`.
  (13) "No elapsed ladder" is a textual check: comments stripped, `action.mjs` holds none of
  `60000`, `3600000`, `86400000`, `% 60` or `/ 60`, and no template literal ending `}s`, `}m`,
  `}h` or `}d`.
  (14) The mirror branch keeps `needsInput` from `execution.code`, and only `label` reads
  `item.ask`. No `.tsx` reads `needsInput` today, and `Board.tsx` is the only caller.

  RULINGS (PO, ratifying, 2026-09-23). QA (1)–(9) and developer (10)–(14) RATIFIED.

  Background:
    Given `A(<fields>)` is a thirteen-key ask fact (task 00) with `runId: "R1"`, `phase: "build"`, `askedAt: "2026-09-23T17:00:00.000Z"`, `node: "node-7297"`, `local: true`, `scope: "03"`, `question: "Decision needed: move the residue?\nOptions: a, b"`, overridden by the given fields
    And `T(<clock>)` is `Date.parse(<clock>)`, and `ctx` is `{ ref: "03/01", phase: "idle", text: "", expanded: false, nowMs: T("2026-09-23T17:12:00.000Z") }` unless a case overrides it

  Scenario: a waiting local ask reads as a question with an empty reply and no fast path
    When `askCardState(A({ state: "waiting" }), ctx)` is asked
    Then it answers `{ state: "waiting", heading: "WAITING ON YOU", cost: "build · 12m", question: "Decision needed: move the residue?\nOptions: a, b", unreadable: null, toggle: "Show the full question", notice: null, helper: "Sent to the session word for word and kept on the run record.", button: { label: "Send answer", disabled: true, busy: false }, receipt: null, message: null }`, keys in that order

  Scenario Outline: Send is enabled only by words, and never by whitespace
    When `askCardState(A({ state: "waiting" }), { ...ctx, text: <text> })` is asked
    Then its `button.disabled` is <disabled>

    Examples:
      | text | disabled |
      | `""` | `true` |
      | `" "` | `true` |
      | `"\n\n"` | `true` |
      | `"\t \r\n"` | `true` |
      | `" 　"` | `true` |
      | `"\u000b"` | `true` |
      | `undefined` | `true` |
      | `null` | `true` |
      | `42` | `true` |
      | `"b"` | `false` |
      | `"  b  "` | `false` |
      | `"take b —\n  keep the tests"` | `false` |
      | `"​"` (not removed by `trim()`) | `false` |
      | a string of 8,001 `"a"` (ruling 2) | `false` |

  Scenario Outline: the heading, the cost and the button follow the state the ask is in
    When `askCardState(<ask>, { ...ctx, <ctx> })` is asked
    Then it answers `state` <state>, `heading` <heading>, `cost` <cost>, `notice` <notice> and `button.label` <label>

    Examples:
      | ask | ctx | state | heading | cost | notice | label |
      | `A({ state: "parked", parkedAt: "2026-09-23T19:10:00.000Z" })` | `nowMs: T("2026-09-23T20:10:00.000Z")` | `"parked"` | `"PARKED — UNANSWERED"` | `"build · asked 3h 10m · parked 1h"` | `"The session stopped waiting at its bound. Your answer resumes it."` | `"Send answer and resume"` |
      | `A({ state: "waiting", parkedAt: 17:10 })` | `nowMs: ctx.nowMs` | `"parked"` | `"PARKED — UNANSWERED"` | `"build · asked 12m · parked 2m"` | the parked notice | `"Send answer and resume"` |
      | `A({ state: "parked", askedAt: null, parkedAt: 17:10 })` | `nowMs: ctx.nowMs` | `"parked"` | `"PARKED — UNANSWERED"` | `"build · parked 2m"` | the parked notice | `"Send answer and resume"` |
      | `A({ state: "answered", parkedAt: "2026-09-23T19:10:00.000Z", answeredAt: "2026-09-23T20:00:00.000Z", by: UB, answer: "take b" })` | `nowMs: T("2026-09-23T20:10:00.000Z")` | `"answered"` | `"ANSWERED BY UMAMI"` | `"build · 3h"` | `null` | `null` |
      | `A({ state: "waiting" })` | `sent: D(), nowMs: T("2026-09-23T17:30:00.000Z")` | `"answered"` | `"ANSWERED BY UMAMI"` | `"build · 12m"` (ruling 4) | `null` | `null` |
      | `A({ state: "parked", parkedAt: 17:10 })` | `sent: D({ delivery: "parked", resume: "aof work loop 03 --resume" })` | `"answered"` | `"ANSWERED BY UMAMI"` | `"build · 12m"` | `null` | `null` |
      | `A({ state: "answered", answeredAt: 17:05, by: { actor: "you", via: "cli", node: "node-7297" } })` | `nowMs: ctx.nowMs` | `"answered"` | `"ANSWERED BY YOU"` | `"build · 5m"` | `null` | `null` |
      | `A({ state: "answered", answeredAt: null, by: null })` | `nowMs: ctx.nowMs` | `"answered"` | `"ANSWERED BY YOU"` (ruling 6) | `"build"` | `null` | `null` |
      | `A({ state: "waiting", phase: null })` | `nowMs: ctx.nowMs` | `"waiting"` | `"WAITING ON YOU"` | `"12m"` | `null` | `"Send answer"` |
      | `A({ state: "waiting", phase: "  " })` | `nowMs: ctx.nowMs` | `"waiting"` | `"WAITING ON YOU"` | `"12m"` (ruling 7) | `null` | `"Send answer"` |
      | `A({ state: "waiting", askedAt: null })` | `nowMs: ctx.nowMs` | `"waiting"` | `"WAITING ON YOU"` | `"build"` | `null` | `"Send answer"` |
      | `A({ state: "waiting", phase: null, askedAt: null })` | `nowMs: ctx.nowMs` | `"waiting"` | `"WAITING ON YOU"` | `null` | `null` | `"Send answer"` |

  Scenario Outline: the wait ticks on the board's clock and is spelled by the one formatter
    When `askCardState(A({ state: "waiting", askedAt: <askedAt> }), { ...ctx, nowMs: T(<now>) })` is asked
    Then its `cost` is <cost>

    Examples:
      | askedAt | now | cost |
      | `"2026-09-23T17:12:00.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 0s"` |
      | `"2026-09-23T17:11:01.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 59s"` |
      | `"2026-09-23T17:11:00.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 1m"` |
      | `"2026-09-23T17:00:00.000Z"` | `"2026-09-23T17:12:59.999Z"` | `"build · 12m"` |
      | `"2026-09-23T16:12:00.001Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 59m"` |
      | `"2026-09-23T16:12:00.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 1h"` |
      | `"2026-09-23T14:12:00.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 3h"` |
      | `"2026-09-23T14:02:00.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 3h 10m"` |
      | `"2026-09-22T17:12:00.001Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 23h 59m"` |
      | `"2026-09-22T17:12:00.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 1d"` |
      | `"2026-09-21T13:12:00.000Z"` | `"2026-09-23T17:12:00.000Z"` | `"build · 2d 4h"` |
      | `"2026-09-23T17:12:05.000Z"` (ahead of the board) | `"2026-09-23T17:12:00.000Z"` | `"build · 0s"` (ruling 3) |
      | `"yesterday"` | `"2026-09-23T17:12:00.000Z"` | `"build"` |
      | `"2026-09-23T17:00:00.000Z"` | `"not a date"` (`nowMs` is `NaN`) | `"build"` |

  Scenario Outline: the question is shown verbatim, or said to be unreadable, never re-worded
    When `askCardState(A({ state: "waiting", question: <question> }), ctx)` is asked
    Then its `question` is <shown> and its `unreadable` is <unreadable>

    Examples:
      | question | shown | unreadable |
      | `"```sh\nrm -rf .\n```"` (a fenced block) | the same string | `null` |
      | `"<img src=x onerror=alert(1)>"` | the same string | `null` |
      | `"**Decide** [here](javascript:alert(1))"` | the same string | `null` |
      | `"  Move the residue?  \n"` | the same string, untrimmed | `null` |
      | `"a\r\n\r\n\r\nb"` | the same string, uncollapsed | `null` |
      | a string of 5,000 `"a"` | those 5,000, unclipped | `null` |
      | `""` | `""` | `U` |
      | `"  \n\t "` | `"  \n\t "` | `U` |
      | `null` | `null` | `U` |
      | `42` | `null` (ruling 7) | `U` |

  Scenario Outline: a worker's ask names its node in the cost and the helper, and nothing else changes
    When `askCardState(A({ state: "waiting", local: false, node: "node-2976", <fields> }), ctx)` is asked
    Then its `cost` is <cost>, its `helper` ends ` Delivered to node-2976.`, and every other key equals the local case's

    Examples:
      | fields | cost |
      | `sessionId: "S9"` | `"build · 12m · on node-2976"` |
      | `runId: null, sessionId: "S9", phase: null` | `"12m · on node-2976"` |
      | `askedAt: null` | `"build · on node-2976"` |
      | `phase: null, askedAt: null` | `"on node-2976"` |
      | `askedAt: "2026-09-23T14:02:00.000Z"` | `"build · 3h 10m · on node-2976"` |

  Scenario Outline: sending holds the words and says it is busy
    When `askCardState(<ask>, { ...ctx, phase: "sending", text: "take b" })` is asked
    Then its `button` deep-equals `{ label: "Sending…", disabled: true, busy: true }` and its `message` is `null`

    Examples:
      | ask |
      | `A({ state: "waiting" })` |
      | `A({ state: "parked", parkedAt: 17:10 })`, whose idle label is `Send answer and resume` |
      | `W`, a worker's ask |
      | `A({ state: "waiting", question: null })`, unreadable but answerable |

  Scenario Outline: an answer is a receipt held in place, naming who and how it resumes
    When `askCardState(<ask>, { ...ctx, <ctx> })` is asked
    Then its `state` is `"answered"`, its `receipt` is <receipt>, and its `button` and `helper` are `null`

    Examples:
      | ask | ctx | receipt |
      | `A({ state: "waiting" })` | `sent: D(), nowMs: T("2026-09-23T17:30:00.000Z")` | `"✓ Answered by umami · 12m — the session is resuming"` |
      | `A({ state: "parked", parkedAt: 17:03 })` | `sent: D({ delivery: "parked", resume: "aof work loop 03 --resume" })` | `"✓ Answered by umami · 12m — resumes with the loop (aof work loop 03 --resume)"` |
      | `A({ state: "parked", parkedAt: 17:03 })` | `sent: D({ delivery: "parked", resume: "aof work loop 03/01 --resume" })` | `"✓ Answered by umami · 12m — resumes with the loop (aof work loop 03/01 --resume)"` |
      | `A({ state: "parked", parkedAt: 17:03 })` | `sent: D({ delivery: "parked", resume: null })` | `"✓ Answered by umami · 12m — resumes with the loop (aof work loop 03 --resume)"` |
      | `A({ state: "answered", answeredAt: 17:05, by: UB, answer: "take b" })` | `nowMs: T("2026-09-23T17:30:00.000Z")` | `"✓ Answered by umami · 5m — the session is resuming"` |
      | `A({ state: "answered", parkedAt: 17:03, answeredAt: 17:05, by: UB })` | `nowMs: ctx.nowMs` | `"✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"` |
      | `A({ state: "answered", scope: null, parkedAt: 17:03, answeredAt: 17:05, by: UB })` | `ref: "03/01"` | `"✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"` |
      | `A({ state: "answered", scope: "  ", parkedAt: 17:03, answeredAt: 17:05, by: UB })` | `ref: "03/01"` | `"✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"` |
      | `A({ state: "answered", scope: null, parkedAt: 17:03, answeredAt: 17:05, by: UB })` | `ref: "03"` | `"✓ Answered by umami · 5m — resumes with the loop (aof work loop 03 --resume)"` |
      | `A({ state: "answered", scope: "03/01", parkedAt: 17:03, answeredAt: 17:05, by: UB })` | `ref: "03/01"` | `"✓ Answered by umami · 5m — resumes with the loop (aof work loop 03/01 --resume)"` |
      | `A({ state: "answered", answeredAt: 17:05, by: { actor: "  ", via: "cli", node: null } })` | `nowMs: ctx.nowMs` | `"✓ Answered by you · 5m — the session is resuming"` |
      | `A({ state: "answered", answeredAt: 17:05, by: null })` | `nowMs: ctx.nowMs` | `"✓ Answered by you · 5m — the session is resuming"` |
      | `A({ state: "waiting" })` | `sent: D({ by: { actor: "", via: "board", node: null } })` | `"✓ Answered by you · 12m — the session is resuming"` |
      | `A({ state: "waiting", askedAt: null })` | `sent: D()` | `"✓ Answered by umami — the session is resuming"` (ruling 5) |
      | `A({ state: "waiting" })` | `sent: D({ answeredAt: "2026-09-23T16:59:58.000Z" })` | `"✓ Answered by umami · 0s — the session is resuming"` (ruling 3) |
      | `W` | `sent: D({ runId: null, delivery: "mesh", state: "dispatched" })` | `"✓ Answered by umami · 12m — the session is resuming"` (ruling 8) |

  Scenario Outline: a refusal is named by its code and keeps what was typed
    When `askCardState(A({ state: "waiting", local: <local>, node: "node-2976" }), { ...ctx, phase: "error", text: "take b", error: { code: <code>, message: <message> } })` is asked
    Then its `message` deep-equals `{ text: <text>, title: <message> }`, its `button` is `{ label: "Send answer", disabled: false, busy: false }`, and its `state` is `"waiting"`

    Examples:
      | local | code | message | text |
      | `true` | `"ask-already-answered"` | `"already answered by umami"` | `"✕ Not sent — the session is no longer waiting"` |
      | `true` | `"answer-not-waiting"` | `"03/01 has no waiting ask"` | `"✕ Not sent — the session is no longer waiting"` |
      | `false` | `"session-not-parked"` | `"session S9 is not parked"` | `"✕ Not sent — the session is no longer waiting"` |
      | `false` | `"terminal-resume-not-started"` | `"the worker refused before spawn"` | `"✕ Not sent — node-2976 is unreachable"` |
      | `false` | `"terminal-resume-target-not-connected"` | `"target not connected"` | `"✕ Not sent — node-2976 is unreachable"` |
      | `false` | `"session-target-not-connected"` | `"session target not connected"` | `"✕ Not sent — node-2976 is unreachable"` |
      | `true` | `"answer-empty"` | `"the answer is empty"` | `"✕ Not sent — the answer is empty"` |
      | `true` | `"answer-too-long"` | `"the answer is over 8,000 characters"` | `"✕ Not sent — the answer is over 8,000 characters"` |
      | `true` | `"answer-control-chars"` | `"the answer holds a control character"` | `"✕ Not sent — the answer holds a control character"` |
      | `true` | `"answer-actor-invalid"` | `"the actor cannot be recorded"` | `"✕ Not sent — the actor cannot be recorded"` |
      | `false` | `"resume-capacity-full"` | `"no resume slot is free"` | `"✕ Not sent — no resume slot is free"` |
      | `true` | `"non-loopback-host"` | `"non-loopback host"` | `"✕ Not sent — non-loopback host"` |
      | `true` | `"ref-not-found"` | `"no item 03/01"` | `"✕ Not sent — no item 03/01"` |
      | `true` | `"ASK-ALREADY-ANSWERED"` (not a listed code) | `"x"` | `"✕ Not sent — x"` |
      | `true` | `"session-exploded"` (unknown) | `"Request failed (500)"` | `"✕ Not sent — Request failed (500)"` |
      | `true` | `undefined` (a network failure) | `"Failed to fetch"` | `"✕ Not sent — Failed to fetch"` |

  Scenario: no ask is no card
    When `askCardState(null, ctx)` and `askCardState(undefined, ctx)` are asked
    Then each answers `null`

  Scenario Outline: while an ask stands, the header offers the terminal and never a second answer
    When `primaryAction(<item>, { hasBreakdown: true, liveForRef: false })` is asked
    Then its `kind` is <kind> and its `label` is <label>

    Examples:
      | item | kind | label |
      | `{ status: "in-progress", execution: EX, ask: W }` | `"mirror"` | `"Open terminal — node-2976"` |
      | `{ status: "in-progress", execution: EX }` (an older worker, no fact) | `"mirror"` | `"Answer on node-2976"` |
      | `{ status: "in-progress", execution: EX, ask: null }` | `"mirror"` | `"Answer on node-2976"` (ruling 9) |
      | `{ status: "in-progress", execution: EX, ask: A({ state: "answered", answeredAt: 17:05, by: UB }) }` | `"mirror"` | `"Open terminal — node-2976"` |
      | `{ status: "in-progress", execution: { ...EX, code: null }, ask: A({ state: "waiting" }) }` | `"mirror"` | `"Open terminal — node-2976"` |
      | `{ status: "in-progress", execution: { ...EX, code: null } }` | `"mirror"` | `"Open terminal — node-2976"` |
      | `{ status: "in-progress", execution: { ...EX, sessionId: null }, ask: A({ state: "waiting" }) }` | `"running"` | `"Running on node-2976"` |
      | `{ status: "in-progress", ask: A({ state: "waiting" }) }` (a local lane) | `"continue"` | `"Continue"` |
      | `{ status: "in-review", ask: A({ state: "parked", parkedAt: 17:03 }) }` | `"verify"` | `"Verify"` |
      | `{ status: "blocked", ask: A({ state: "waiting" }) }` | `"blocked"` | `"Blocked"` |

  Scenario: the card's words come from the one formatter, and the board spells no second one
    When `ui/src/board/action.mjs` is read, comments stripped
    Then it imports `formatElapsed` and `eventPhrase` from `../../../src/notify/form.mjs`, it spells neither `waiting on you` nor an elapsed unit ladder, and `action.d.mts` declares `askCardState` and its eleven-key answer
