---
type: story
number: 00
slug: pre-session-frame-queue
title: "A resize sent the instant the socket opens is no longer thrown on the floor — the server queues pre-session frames and drains them in order once the PTY is live"
parent: 46
status: done
owner: product-owner
created: 2026-08-08
updated: 2026-08-08
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 00 · The first frame is not dropped — a bounded pre-session queue on the server

## User story

As the operator opening a terminal,
I want the geometry the browser sends the moment the socket opens to actually reach the PTY,
so that the agent's TUI paints at the size of the pane I am looking at — the first time, without me
having to nudge the window to make it right.

Today it self-heals by accident. `TerminalDock` sends its fit on `socket.onopen`
([TerminalDock.tsx:214-215](../../../../../ui/src/board/TerminalDock.tsx#L214-L215)), and
[terminal-ws.mjs](../../../../../src/terminal-ws.mjs) does not register `ws.on("message")` until
**after** `loadWorkspace` + `trustCwd` + `await spawn(...)` — so that frame lands on the floor with no
buffer and no error. A later `ResizeObserver` tick sends another one and nobody notices. A pane that
never resizes again keeps the wrong geometry, and milestone 49's grid opens N panes at once and hits it
N times.

**Measured, not inferred** — spike 44 §Investigation: an on-open `resize(111, 11)` never reached the
PTY; the identical frame 400 ms later did. `ptyResizeApplied` held exactly one entry.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_pre-session-frames-are-queued-and-drained.feature`
- [ ] `tasks/01_the-queue-is-bounded-and-degrades-honestly.feature`

## Notes

**Order: none. This story depends on nothing and nothing depends on it.** The architect's
[§Story-boundary guidance](../../ARCHITECTURE.md) puts it first among the three server-side seams that
have no edge to any `ui/` file — `src/terminal-ws.mjs` has three dependents
(`mesh-worker-execution.mjs`, `setup-ui.mjs`, one test) and none of them is in `ui/`. It ships operator
value on its own and is parallel-eligible from day one.

**Governing ADR: [ADR-008](../../ARCHITECTURE.md).** The fix is on the **server**, by registering the
message listener at *connection* time into a bounded queue that `wireSession` drains **in order** — not
by a client-side timer and not by a `ready` handshake. Both of those alternatives are rejected in the
ADR and the reasons are load-bearing: a timer re-introduces the race at a different duration, and a
handshake changes the ADR-003 frozen wire envelope, which is a contract this story has no mandate to
touch.

**This is a fix to an existing latent defect, not a new feature.** Tag its scenarios `@bug`. The
originating evidence is spike 44's `## Investigation`, not a UAT finding, so there is no `@finding-<id>`
to carry.

**PO scope ruling, 2026-08-08 (QA F-46-QA-1) — the orphaned PTY is IN scope, because it is the same
bug.** QA found that `handleConnection` runs on to `await spawn` ([terminal-ws.mjs:237](../../../../../src/terminal-ws.mjs#L237))
even after the client has closed, and `wireSession` registers `ws.on("close")` only at
[:324](../../../../../src/terminal-ws.mjs#L324) — so a `close` that already fired reaches no listener
and `term.kill()` ([:332](../../../../../src/terminal-ws.mjs#L332)) is never called. **A PTY outlives
its socket.**

That is not a second defect that happens to be nearby: it is *the identical root cause* — a listener
registered after the async gap misses the event that already fired — and ADR-008's fix (register at
connection time) closes both by construction. Fixing the dropped frame and leaving the orphaned process
would be shipping half a fix, and milestone 49's grid multiplies a leaked PTY by N exactly as it
multiplies a dropped frame. It carries its own `@bug` scenario in task 01 so it can be moved whole if
this ruling is ever revisited, rather than a `Then` quietly vanishing.

**Two build constraints QA wrote into the contract, both worth reading before coding** — the overflow's
degrade code must **not** reuse the module's generic `"terminal-ws"` code, because
[degrade.mjs](../../../../../src/degrade.mjs) throttles per code for 5s and an unrelated failure in the
same window would silence the overflow entirely (the exact silence ADR-008 forbids); and a
frame-**count** ceiling alone does not bound memory, since the `WebSocketServer`
([:113](../../../../../src/terminal-ws.mjs#L113)) sets no `maxPayload`.

**Backlog candidate, pinned not fixed:** an unknown JSON control type (`{"type":"paste"}`) parses as an
object, fails the `resize` test, and is typed into the agent's prompt as literal text
([:308-321](../../../../../src/terminal-ws.mjs#L308-L321)). Task 00 pins today's behaviour so the drain
cannot silently change it; a story chartered to buffer frames is not the place to redesign the envelope.

**No `@uat` lane, deliberately.** The operator outcome is *already true* at the board today — roughly
400 ms late — because the `ResizeObserver` tick repairs it
([TerminalDock.tsx:266-267](../../../../../ui/src/board/TerminalDock.tsx#L266-L267)). A human judging a
live dock would sign off a broken server exactly as readily as a fixed one, so a `@uat` row here would
pass either way and prove nothing.

**What must not move.** The wire envelope stays frozen (ADR-003, milestone 03): raw PTY frames plus the
JSON `{resize}` / `{exit}` / `{error}` control messages, unchanged. `terminal-ws.mjs` still writes its
own PTY — [acd-fleet-terminal-input-constrained's](../../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs)
final assertion checks exactly that and must stay green.
