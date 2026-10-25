# 04 · A note reaches the open session — build plan

## Mechanism

**One seam in the terminal, one function in the surface.**

- `input-policy.mjs` gains a pure rule: given the last sequence typed, a later input
  `{ seq, text }`, and the session's facts (input enabled, socket open), answer `type` or a reason
  it is not delivered. `TerminalControl.tsx` takes an optional `laterInput` prop and an
  `onLaterInput(result)` callback; inside the session effect it keeps the last typed sequence in a
  ref and sends `text + "\r"` on the raw path when the rule says `type` — the same path
  `sendCommand` uses. The mount's own `command` is untouched. `acd-terminal-control-boundary` keeps
  the decision out of the component, which is why the rule is in `input-policy.mjs`.
- `DiagramSurface.tsx` owns `deliver(invocations)`: when the dock is open and its session reported
  open (the control's existing state, surfaced through `onLaterInput`/a state callback), it hands
  each invocation to `laterInput` with the next sequence; otherwise, for an ask, it opens the dock
  with the first invocation as the mount's `command` and queues the rest as later inputs typed once
  the socket opens; for a note it answers "waiting". The editor's `onAskArchitect` becomes
  `onDeliver(invocations, kind)` returning the outcome, and the editor's notices follow it.
- The editor composes the invocations: an ask or a first draft yields
  `[single(id)]`, plus `batch()` when other notes are open (171/04 Q1); a note yields `[single(id)]`
  only when the surface says a session is live. `diagramReviewInvocation` stays the one author of
  the slash command (FF-6306).
- `apps/ui/src` is digest-frozen (FF-5307 in `acd-loop-state-rides-the-run-record`): re-pin with
  the measured diff and the reason.

## Verification step

Headless: the input-policy suite and the TerminalControl socket suite (a fake socket records what
is sent), and the diagram suite for `deliver`. In the browser smoke, the dock's PTY echoes what is
typed: open the dock, add a note, see the invocation in the terminal. The real session is the
operator's `@uat`.

## Out of scope

- Typing into a session on another node (the surface mirrors no worker session).
- Retrying an input the session did not take.
- A server path into a PTY.
