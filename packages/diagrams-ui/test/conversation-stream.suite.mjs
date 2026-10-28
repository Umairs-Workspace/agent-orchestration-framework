// Milestone 172 / story 02 / task 00 — the stream's `conversation` events become each thread's live turn
// and the session's state, in two pure reducers (172/ADR-002 §3, ADR-003 §2): `conversationStep`
// (`conversation-stream.mjs`) over the events, and `withLiveTurns` (`conversation-model.mjs`), which
// merges a live turn into its thread until the recorded turn replaces it. The browser half is the
// smoke's (test/smoke/diagram-editor.smoke.mjs). node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { CONVERSATION_INITIAL, SESSION, batchLine, conversationStep, denialLine, sessionChip } from "@aof/diagrams-ui/conversation-stream";
import { STATE, STOPPED_LINE, STARTING_LINE, notePins, threadsOf, withLiveTurns } from "@aof/diagrams-ui/conversation-model";

// The Background: the thread "Events route" for note "r7" of "ADR-003-push-stream.excalidraw".
const ELEMENTS = [
  { id: "box-Events", type: "rectangle", x: 0, y: 0, width: 160, height: 80, customData: { aof: { id: "Events" } } },
  { id: "label-Events", type: "text", x: 0, y: 30, width: 120, height: 20, text: "Events route", originalText: "Events route", containerId: "box-Events" },
];
const asked = "2026-10-27T14:02:00.000Z";
const note = (extra = {}) => ({ id: "r7", status: "open", createdAt: asked, selectedIds: ["Events"], request: "Why does the route re-stamp?", thread: [{ by: "operator", text: "Why does the route re-stamp?", at: asked }], ...extra });
const thread = (conversation, notes = [note()], proposals = []) => withLiveTurns(threadsOf(notes, proposals, ELEMENTS), conversation).find((item) => item.subject === "Events route");
const run = (events, state = CONVERSATION_INITIAL) => events.reduce((prior, event) => conversationStep(prior, { at: "2026-10-27T14:03:00.000Z", ...event }), state);
const starting = run([{ type: "session", state: "started" }]);
const answering = (text = "", requestId = "r7") => run([{ type: "session", state: "started" }, { type: "turn", requestId }, ...(text ? [{ type: "text", requestId, text }] : [])]);

const streamTests = [
  // ── R1 · Asking delivers the question, and its answer streams into the new thread ──────────
  { name: "172/02 task00 E1 · the answer grows in its thread as its text arrives", run: () => {
    const state = run([{ type: "turn", requestId: "r7" }, { type: "text", requestId: "r7", text: "The writer is " }, { type: "text", requestId: "r7", text: "another process" }], starting);
    assert.equal(thread(state).live.text, "The writer is another process");
    assert.equal(state.session, SESSION.answering);
    assert.equal(thread(state).state, STATE.answering, "the thread reads that the architect is answering");
  } },
  { name: "172/02 task00 · until the first text arrives the open thread says the architect is starting", run: () => {
    const state = run([{ type: "turn", requestId: "r7" }], starting);
    assert.equal(state.session, SESSION.starting);
    assert.equal(thread(state).live.startingLine, STARTING_LINE);
  } },
  { name: "172/02 task00 E3 · a delivery waiting behind another turn reads as queued", run: () => {
    const state = run([{ type: "session", queued: ["r7"] }], answering("Working", "r5"));
    assert.equal(thread(state).state, "Queued — the architect is answering another note");
    assert.equal(thread(run([{ type: "turn", requestId: "r7" }], state)).state, STATE.answering, "and answering once its turn begins");
  } },
  { name: "172/02 task00 · an editor that connects mid-answer starts from the snapshot", run: () => {
    const state = run([{ type: "snapshot", state: "answering", requestId: "r7", text: "The writer is another", queued: 0 }]);
    assert.equal(thread(state).live.text, "The writer is another");
    assert.equal(state.session, SESSION.answering);
  } },
  { name: "172/02 task00 · a batch turn is never guessed onto a thread", run: () => {
    const state = run([{ type: "turn", requestId: null }, { type: "text", requestId: null, text: "Reviewing 2 notes" }], starting);
    assert.equal(thread(state).live, undefined, "no thread holds a live turn");
    assert.equal(batchLine(state), "Reviewing 2 notes", "the panel's header line");
    assert.equal(batchLine(run([{ type: "turn-end", requestId: null, outcome: "done" }], state)), null, "and the line goes when the batch ends");
  } },

  // ── R4 · What the architect records replaces what streamed ──────────────────────────────────
  { name: "172/02 task00 E8 · the recorded answer replaces the live turn", run: () => {
    const state = answering("The writer is another process");
    assert.ok(thread(state).live);
    const answered = note({ status: "answered", thread: [...note().thread, { by: "architect", text: "The writer is another process.", at: "2026-10-27T14:03:05.000Z" }] });
    const after = thread(state, [answered]);
    assert.equal(after.lastTurn.text, "The writer is another process.", "the thread's latest turn is the recorded answer");
    assert.equal(after.live ?? null, null, "the thread has no live turn");
    assert.equal(after.state, STATE.answered);
  } },
  { name: "172/02 task00 · an architect turn recorded before the live turn began does not replace it", run: () => {
    const earlier = note({ thread: [...note().thread, { by: "architect", text: "An earlier answer.", at: "2026-10-27T14:02:30.000Z" }, { by: "operator", text: "And now?", at: "2026-10-27T14:02:50.000Z" }] });
    assert.equal(thread(answering("Next answer"), [earlier]).live.text, "Next answer");
  } },
  { name: "172/02 task00 E9 · a proposal replaces the live turn", run: () => {
    const state = answering("I will relabel the edge");
    const proposed = note({ status: "proposed" });
    const proposal = { id: "p1", requestId: "r7", status: "pending", createdAt: "2026-10-27T14:03:04.000Z", summary: "Relabel", rationale: "Because.", changes: [] };
    const after = thread(state, [proposed], [proposal]);
    assert.equal(after.proposal.id, "p1", "the thread's latest turn holds the proposal");
    assert.equal(after.live ?? null, null, "the thread has no live turn");
  } },
  { name: "172/02 task00 E10 · a turn that ends with nothing recorded says the architect stopped", run: () => {
    const state = run([{ type: "turn-end", requestId: "r7", outcome: "failed", denials: [] }], answering("The writer is"));
    const after = thread(state);
    assert.equal(after.live.stopped, true, "the thread offers Ask again");
    assert.equal(STOPPED_LINE, "The architect stopped before it answered");
    assert.equal(after.notes[0].status, "open", "note r7 is still open");
    assert.equal(after.state, STATE.waiting);
  } },

  // ── R5 · The panel says what the architect's session is doing ───────────────────────────────
  ...[
    ["E11 · ", CONVERSATION_INITIAL, 'a "session" event with state "starting"', { type: "session", state: "starting" }, SESSION.starting],
    ["", starting, 'a "text" event for "r7"', { type: "text", requestId: "r7", text: "The" }, SESSION.answering],
    ["", answering("The writer"), 'a "turn-end" event for "r7" with nothing queued', { type: "turn-end", requestId: "r7", outcome: "done" }, SESSION.idle],
    ["", run([{ type: "turn-end", requestId: "r7", outcome: "done" }], answering("x")), 'a "session" event with state "ended"', { type: "session", state: "ended", reason: "idle" }, SESSION.ended],
    ["", answering("The writer"), 'a "session" event with state "ended"', { type: "session", state: "ended", reason: "exited" }, SESSION.ended],
  ].map(([example, before, label, event, after]) => ({ name: `172/02 task00 ${example}the session state follows the events: ${before.session} + ${label} → ${after}`, run: () => {
    assert.equal(conversationStep(before, event).session, after);
  } })),
  { name: "172/02 task00 · a turn-end with a delivery queued keeps the session answering", run: () => {
    const state = run([{ type: "session", queued: ["r8"] }, { type: "turn-end", requestId: "r7", outcome: "done" }], answering("x"));
    assert.equal(state.session, SESSION.answering);
  } },
  { name: "172/02 task00 · the chip says what the session is doing, and an unavailable session says so", run: () => {
    assert.deepEqual(sessionChip(CONVERSATION_INITIAL), { label: "Not started", live: false, title: undefined });
    assert.deepEqual(sessionChip(starting), { label: "Starting…", live: true, title: undefined });
    assert.equal(sessionChip(answering("x")).label, "Answering");
    assert.deepEqual(sessionChip(conversationStep(answering("x"), { type: "session", state: "ended", reason: "idle" })), { label: "Ended", live: false, title: "idle" });
    const unavailable = conversationStep(CONVERSATION_INITIAL, { type: "session", state: "unavailable", reason: "No claude executable resolves on this server's PATH." });
    assert.equal(unavailable.session, SESSION.unavailable);
    assert.equal(sessionChip(unavailable).label, "Unavailable");
  } },
  { name: "172/02 task00 E13 · a denied tool is named in the thread", run: () => {
    const state = run([{ type: "turn-end", requestId: "r7", outcome: "done", denials: [{ tool: "Bash", input: "git status" }] }], answering("Answered without it"));
    assert.deepEqual(thread(state).denials.map(denialLine), ["The architect was not allowed to run git status"]);
    assert.equal(denialLine({ tool: "WebFetch", input: "" }), "The architect was not allowed to use WebFetch");
  } },
  { name: "172/02 task00 · the pin of a thread being answered gains its halo", run: () => {
    const [pin] = notePins(withLiveTurns(threadsOf([note()], [], ELEMENTS), answering("The")));
    assert.equal(pin.answering, true);
    assert.equal(pin.answered, true, "primary while answering");
    assert.equal(notePins(threadsOf([note()], [], ELEMENTS))[0].answering, false);
  } },
];

export const conversationStreamTests = streamTests;
