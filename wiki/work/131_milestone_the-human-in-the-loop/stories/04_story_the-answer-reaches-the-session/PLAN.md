# 04 · The answer reaches the session — build plan

## Mechanism

One verb, three legs, and one admission. Nothing here waits: the verb writes a request and
returns, and the owner (03) or the worker (mesh) is what resumes the session.

1. **The verb joins `resume.mjs`.** `answerCommand` sits beside `resumeCommand` and is one more
   entry in the core's `COMMANDS`. Its ladder is `resolveItemExact` → 01's `answerAsk` → the
   mesh leg → `answer-not-waiting`. `answerAsk` sanitises before it looks anything up, so a bad
   answer dies at 400 whichever leg would have carried it. `by` is built once, at the top, from
   `as`, `via` and `meshNodeIdOf`. `session-answered` is one awaited `notify` after a successful
   file write, shaped exactly as 02's accept site (`ctx.notifyOptions` is the seam; the document
   is computed before the call and returned unchanged). The mesh leg reaches
   `mesh:terminal-resume` through a deferred `import("../command-core.mjs")` — the registry
   imports this file, so a static import closes the ring; `loop.mjs`'s `invokeRegistered` is the
   pattern, `ctx.invokeRegistered` first.
2. **The mesh leg is one additive object on a frame the fabric already carries.** `answer:
   { text, by, askedAt }` goes on the terminal-resume schema, into `signal` (omitted when
   absent), through the control router's DOWN frame (add one key to the `dispatchDirective`
   object, guarded the way `reservedAt` is), into `frame.answer` on the worker. The worker's
   only change is the spawn brief's `command` and passing `answer` into `createMeshParkResume`;
   the record write lives in `park-resume.mjs`'s `markProcessStarted`, beside the liveness
   heartbeat, as `openRunAsk` then `answerRunAsk` under one try that degrades.
3. **The board route is the fleet's admission, copied once, plus one predicate shared.**
   Hoist `admitWriteRequest` into `board-ui.mjs` (method, Origin, Host, content-type, in that
   order), switch the six write branches to match on pathname and call it before `readJsonBody`,
   and add the answer branch as a three-key body lift onto `invoke("work:answer", …)`.
   `isLoopbackHost` is a regex-shaped predicate in `static-serve.mjs`; both helpers call it
   between the Origin and content-type checks.
4. **The sweep's new case is the first branch of `readinessRow`.** Read `run.asks.at(-1)`,
   answer the waiting row with two more keys, and leave the rest of the function as it is.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run the story's suites through `node scripts/test.mjs
--only …`: the four `test/mesh/terminal/*` and `test/assignment/blocked-run-parking` files, the
two board suites, `mesh-ui-serve`, `run-session-limit-resume`, `command-core-contract`, and the
three arch gates in `files:`. Then one hand probe end to end: open a `waiting` ask file for a
fixture item by hand, stand the board up with `aof work ui` against that fixture, POST
`/api/work/answer` from a page at `http://127.0.0.1:<port>` and read the file back as `answered`
with `via: "board"`; repeat with `curl -H 'Host: evil.example:1' -H 'Origin: http://evil.example:1'`
and read 403 `non-loopback-host`. A wrong build shows as a GET to a write path answering the
namespace 404 instead of 405, a feedback POST admitted without an Origin, or a resume frame that
reaches the worker without its `answer` key.

## Out of scope

- Consuming the answer: the owner's poll, `answerRunAsk` on a local record and the `--answer`
  re-drive are 03's. This verb never reads a run record.
- The board card, the `ask` fact on list rows, `workApi.answer` and the `ui/` digest: 05's.
- The FF-13104, FF-13107 and FF-13109 controls: 06's. This story's cases prove the behaviour.
- Carrying a worker's QUESTION to the control, and notifying a worker's ask: the follow-up item
  STATE records.

## Known traps

- `src/mesh/worker-execution.mjs` is at its 1,914-line sink ceiling. Every added line needs a
  removed one; the two-line `command: null` comment is the obvious cut. Anything larger moves
  into `park-resume.mjs`.
- `acd-board-write-isolation` counts `method === "POST"` literals to find POST routes. The
  pathname-first branches remove them all; re-base its detection on `admitWriteRequest(` calls in
  the same change, or the allowlist goes vacuous and the count passes for the wrong reason.
- `mesh-terminal-relay-bridge` and `mesh-terminal-input-path` pin the envelope's and the DOWN
  frame's key sets exactly. `answer` is present only when carried; the no-answer path must stay
  byte-identical to today's fixtures.
- Node's `fetch` silently drops a caller-set `Host` header. The Host rows in every suite go
  through `node:http`.
- `acd-loop-state-rides-the-run-record` pins `src/board-ui.mjs` by digest. Re-pin it LAST, with
  the comment and the measured diff, after 01's `src/run-store.mjs` re-pin has landed from its
  own lane; and 130's uncommitted `carriedBrief` edit already moves the store digest in this
  shared checkout.
- `run-session-limit-resume` is shared with 01 (the seventeenth key). Edit only the sweep cases.
