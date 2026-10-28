# 00 · The architect answers in a headless session — build plan

## Mechanism

**A generic conversation in execution, the diagram's vocabulary in diagrams, one join in core.**

- `conversation-session.mjs` exports `createConversations({ spawnChild, resolveExecutable,
  launch, reportDegrade, timers, idleMs })` → `{ deliver(key, { cwd, text, requestId, tools }),
  subscribe(key, listener) → unsubscribe, snapshot(key), close() }`. Per key it holds the child,
  a FIFO of deliveries, the turn in flight and the live text so far. `deliver` answers `started`,
  `sent` or `queued`. The child is spawned with an argv (codex-app-server's `spawnChild` /
  `terminateOwned` shape is the precedent, tree-kill on Windows included), stdin written one JSON
  line per user message, stdout split on newlines and fed to a pure `readStreamJsonLine(state,
  line)` in the same module that answers `{ state, events }`: `text_delta` → `text`, an `assistant`
  `tool_use` → `activity` (the tool name and a short label), `result` → `turn-end` (outcome and
  `permission_denials`), anything unknown ignored. The idle clock starts when the last subscriber
  leaves with no turn in flight, and stops when one returns.
- The launch argv is built in one function the arch test reads (FF-17201): `-p --input-format
  stream-json --output-format stream-json --include-partial-messages --verbose
  --permission-prompts none --allowedTools …` plus `--model`/`--effort` from
  `resolveSessionLaunch` for the refine phase. `isSessionAttachmentKey` moves into
  `session-model.mjs`; `session-driver.mjs` imports it.
- `review-session.mjs` (pure) exports `reviewInvocation(ref, file, requestId?)` and
  `REVIEW_SESSION_TOOLS`. `scene.mjs` gains `--action session` → `{ invocation, tools }`, refusing
  an unknown request id with the scene command's existing refusal shape.
- `board-ui.mjs`: `createBoardApi` takes an optional `conversations` port. `POST
  /api/diagram/conversation` admits the write, invokes `diagram:scene` `session`, and delivers
  keyed `${ref}\n${file}` with `options.projectDir`; no port → 503
  `architect-session-unavailable`. `streamDiagramEvents` subscribes the port on connect, writes the
  snapshot as the first `conversation` event, forwards each event, and unsubscribes on close.
- Core's `bindings/board-ui.mjs` constructs the conversations from the terminal providers'
  `resolveProvider("claude")` (or `AOF_ARCHITECT_EXECUTABLE`; a `.mjs` runs under
  `process.execPath`) and closes them with the server.
- `diagram-review.md`: one paragraph for a conversation — write the answer as the turn's final
  text, then record that same text with `respond`. Re-render its three tracked copies.

## Verification step

Headless: the reader over recorded stream-json lines (RESEARCH Q1's shapes); the session module
against `stand-in-claude.mjs`, a node script that reads stream-json lines and writes scripted
deltas, a tool use, a denial and a `result`; the route through the board API with a fake port; the
two arch tests with their planted red probes. Then task 03: a real `claude` through the module
against the test-bed diagram, its event log pasted into VERIFICATION.

## Out of scope

- Anything in the editor beyond the one import (story 02).
- Approving tools from the editor (`--permission-prompts host`).
- Resuming a previous conversation.
