// Milestone 172 / story 01 / task 00 — the conversation panel's threads, read from the review records in
// one pure model (`conversation-model.mjs`, 172/ADR-003 §2). It took over `note-threads.mjs`, so 171/05's
// cases moved here with their subject: a note's pin, where it sits (`canvas-anchor.mjs`, 171/ADR-001),
// a thread's turns, and what a reply does. The panel and the pins on a drawn canvas are the smoke's
// (test/smoke/diagram-editor.smoke.mjs). node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cornerAnchor } from "@aof/diagrams-ui/canvas-anchor";
import { reviewInvocations } from "@aof/diagrams-ui/editor-state";
import { STATE, WHOLE_DIAGRAM, composerSubject, conversationOf, noteStatus, notePins, proposalOutcome, replyTarget, replyToNote, threadHolding, threadOf, threadsOf, turnAuthor } from "@aof/diagrams-ui/conversation-model";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
// The Background: "ADR-003-push-stream.excalidraw" holds four nodes, each a box with its label.
const node = (id, label, x) => [
  { id: `box-${id}`, type: "rectangle", x, y: 300, width: 160, height: 80, customData: { aof: { id } } },
  { id: `label-${id}`, type: "text", x, y: 330, width: 120, height: 20, text: label, originalText: label, containerId: `box-${id}` },
];
const ELEMENTS = [...node("Session", "Architect session", 0), ...node("Store", "Review store", 240), ...node("Events", "Events route", 480), ...node("Editor", "Editor", 720)];
let seq = 0;
const at = (minute) => `2026-10-27T14:${String(minute).padStart(2, "0")}:00.000Z`;
// A note on the named Mermaid ids; `by: "architect"` gives it an answer as its last turn.
const note = (selectedIds, { id = null, status = "open", by = "operator", minute = null, text = null } = {}) => {
  seq += 1;
  const when = at(minute ?? seq);
  const thread = [{ by: "operator", text: text ?? `note ${seq}`, at: when }];
  if (by === "architect") thread.push({ by: "architect", text: "an answer", at: when });
  return { id: id ?? `n${seq}`, status, createdAt: when, selectedIds, request: thread[0].text, thread };
};
const proposal = (requestId, { status = "pending", reason = null, minute = 30 } = {}) => ({
  id: `p-${requestId}`, requestId, status, reason, createdAt: at(minute), decidedAt: status === "pending" ? null : at(minute + 1),
  summary: 'Label the watch edge "watch · 150 ms debounce"', rationale: "So the debounce is visible.", changes: [{ key: "edge:Store->Events#1", change: "changed" }],
});
const VIEW = { appState: { scrollX: 0, scrollY: 0, zoom: { value: 1 } }, viewport: { width: 1200, height: 800 } };
const subjects = (threads) => threads.map((thread) => thread.subject);
const holding = (threads, subject) => threads.find((thread) => thread.subject === subject);

export const conversationModelTests = [
  // ── R1 · Every note on the diagram is a thread in the panel ─────────────────────────────────
  { name: "172/01 task00 E1 · notes become threads under the subjects they name", run: () => {
    const events = note(["Events"], { minute: 1 });
    const first = note(["Session"], { minute: 2 });
    const second = note(["Session"], { minute: 3 });
    const whole = note([], { minute: 4 });
    const threads = threadsOf([second, whole, events, first], [], ELEMENTS);
    assert.deepEqual([...subjects(threads)].sort(), ["Architect session", "Events route", WHOLE_DIAGRAM]);
    assert.deepEqual(holding(threads, "Architect session").notes.map((item) => item.id), [first.id, second.id], "both of its notes, oldest first");
    assert.deepEqual(holding(threads, "Architect session").selectedIds, ["Session"]);
    assert.deepEqual(holding(threads, WHOLE_DIAGRAM).elementIds, []);
  } },
  { name: "172/01 task00 E2 · a note on a deleted shape is read under \"Whole diagram\" with no pin", run: () => {
    const threads = threadsOf([note(["cache"])], [], ELEMENTS);
    assert.deepEqual(subjects(threads), [WHOLE_DIAGRAM]);
    assert.deepEqual(notePins(threads), [], "no pin is placed for it");
    assert.deepEqual(subjects(threadsOf([note(["Events", "cache"])], [], ELEMENTS)), [WHOLE_DIAGRAM], "one of its shapes gone is enough");
  } },
  { name: "172/01 task00 E3 · a withdrawn note has no thread and no pin", run: () => {
    const threads = threadsOf([note(["Editor"], { id: "r3", status: "withdrawn" })], [], ELEMENTS);
    assert.equal(threadHolding(threads, "r3"), null, "no thread holds r3");
    assert.deepEqual(notePins(threads), [], "no pin is placed on Editor");
  } },
  ...[
    ["E4 · ", "last turn is the architect's", () => [note(["Events"], { by: "architect" })], [], STATE.answered],
    ["E4 · ", "last turn is the operator's", () => [note(["Events"])], [], STATE.waiting],
    ["E4 · ", "request is answered by a pending proposal", () => [note(["Events"], { id: "r9", status: "proposed" })], [proposal("r9")], STATE.proposed],
    ["", "record predates threads and holds an answer", () => [{ id: "old", status: "answered", request: "Why?", answer: "Because.", createdAt: at(1), answeredAt: at(2), selectedIds: ["Events"] }], [], STATE.answered],
  ].map(([example, last, notes, proposals, state]) => ({ name: `172/01 task00 ${example}a thread's state says who has the last word: a note whose ${last} reads "${state}"`, run: () => {
    assert.equal(holding(threadsOf(notes(), proposals, ELEMENTS), "Events route").state, state);
  } })),
  { name: "172/01 task00 · the states read as the panel shows them", run: () => {
    assert.deepEqual(STATE, { answered: "Answered", waiting: "Waiting for the architect", proposed: "A proposal answers this", accepted: "Proposal accepted", rejected: "Proposal rejected" });
  } },
  { name: "172/01 task00 · threads are listed with the most recent activity first", run: () => {
    const threads = threadsOf([note(["Events"], { minute: 2 }), note(["Editor"], { minute: 5 })], [], ELEMENTS);
    assert.deepEqual(subjects(threads), ["Editor", "Events route"], "Editor (14:05) before Events route (14:02)");
    const answeredLater = note(["Events"], { minute: 2 });
    answeredLater.thread.push({ by: "architect", text: "later", at: at(9) });
    assert.deepEqual(subjects(threadsOf([answeredLater, note(["Editor"], { minute: 5 })], [], ELEMENTS)), ["Events route", "Editor"], "an answer is activity");
  } },

  // ── R4 · A proposal is decided in the thread that asked for it ──────────────────────────────
  { name: "172/01 task00 E11 · a proposal is held by the thread whose note it answers", run: () => {
    const asked = note(["Events"], { id: "r7", status: "proposed" });
    const { threads, proposals, pending } = conversationOf([asked, note(["Editor"])], [proposal("r7")], ELEMENTS);
    const thread = holding(threads, "Events route");
    assert.equal(thread.proposal.id, "p-r7");
    assert.equal(thread.proposal.summary, 'Label the watch edge "watch · 150 ms debounce"');
    assert.deepEqual(thread.proposal.changes, [{ key: "edge:Store->Events#1", change: "changed" }]);
    assert.deepEqual(thread.notes[0].proposals.map((item) => item.id), ["p-r7"], "on the note it answers");
    assert.equal(pending, 1, "the count of pending proposals is 1");
    assert.deepEqual(proposals.map((item) => [item.id, item.threadKey, item.subject]), [["p-r7", thread.key, "Events route"]], "the Proposals tab names the thread it answers");
  } },
  { name: "172/01 task00 E12 · a rejected proposal keeps its outcome and its reason", run: () => {
    const asked = note(["Events"], { id: "r7", status: "proposed" });
    const { threads, pending } = conversationOf([asked], [proposal("r7", { status: "rejected", reason: "keep the label short" })], ELEMENTS);
    assert.equal(proposalOutcome(holding(threads, "Events route").proposal), "Rejected — keep the label short");
    assert.equal(pending, 0);
    assert.equal(proposalOutcome({ status: "rejected" }), "Rejected");
    assert.match(proposalOutcome({ status: "accepted", decidedAt: at(5) }), /^Accepted \d\d:\d\d$/u);
    assert.equal(proposalOutcome({ status: "pending" }), null, "a pending proposal shows its actions");
  } },

  // ── 171/05's cases, moved with their subject ─────────────────────────────────────────────────
  { name: "171/05 E7 · a thread on a shape is pinned to that shape's corner", run: () => {
    const pins = notePins(threadsOf([note(["Events"])], [], ELEMENTS));
    assert.deepEqual(pins.map((pin) => [pin.label, pin.count, pin.elementIds]), [["Events route", 1, ["box-Events", "label-Events"]]]);
    assert.deepEqual(cornerAnchor({ bounds: [480, 300, 640, 380], ...VIEW, size: { width: 12, height: 12 } }), { x: 640 - 6, y: 300 - 6 });
  } },
  { name: "171/05 E11 · a note on two shapes is one thread, pinned once, named for both", run: () => {
    const threads = threadsOf([note(["Events", "Editor"])], [], ELEMENTS);
    assert.equal(notePins(threads).length, 1);
    assert.equal(threads[0].subject, "Events route, Editor");
    assert.deepEqual(threads[0].elementIds, ["box-Editor", "box-Events", "label-Editor", "label-Events"]);
  } },
  { name: "171/05 E12 · a thread whose last word is the architect's is pinned in the console's primary colour", run: async () => {
    assert.equal(notePins(threadsOf([note(["Events"], { by: "architect" })], [], ELEMENTS))[0].answered, true);
    const overlay = await readFile(path.join(src, "CanvasOverlay.tsx"), "utf8");
    assert.match(overlay, /pin\.answered \? "bg-primary" : "bg-muted-foreground"/u, "answered reads primary, otherwise muted");
  } },
  { name: "171/05 E13 · a thread that waits on the architect is pinned muted", run: () => {
    assert.equal(notePins(threadsOf([note(["Events"])], [], ELEMENTS))[0].answered, false);
    assert.equal(noteStatus(note(["Events"])), STATE.waiting);
    assert.equal(noteStatus(note(["Events"], { by: "architect" })), STATE.answered);
  } },
  { name: "171/05 · a thread's turns are the record's, or — before threads — its request then its answer", run: () => {
    const legacy = { id: "old", status: "answered", request: "Why?", answer: "Because.", createdAt: "a", answeredAt: "b" };
    assert.deepEqual(threadOf(legacy).map((turn) => [turnAuthor(turn), turn.text]), [["You", "Why?"], ["Architect", "Because."]]);
  } },
  { name: "172/01 task00 · a reply continues the thread's latest note, and asking opens the new note's thread", run: () => {
    const older = note(["Session"], { minute: 1 });
    const newer = note(["Session"], { minute: 2 });
    const threads = threadsOf([older, newer], [], ELEMENTS);
    assert.equal(replyTarget(threads[0]).id, newer.id);
    assert.equal(threadHolding(threads, older.id).key, threads[0].key);
    assert.equal(composerSubject("Events route"), "about Events route");
    assert.equal(composerSubject(""), "about the whole diagram");
  } },

  // ── R1 · A reply continues the note, reopens it, and reaches an open session ─────────────────
  { name: "171/05 E14 · a reply made while the architect's session runs is delivered to it", run: async () => {
    const recorded = [];
    const handed = [];
    const outcome = await replyToNote({
      requestId: "n7", text: "And what about the cache?",
      record: async (reply) => { recorded.push(reply); },
      deliver: (invocations) => { handed.push(invocations); return "typed"; },
      invocations: (requestId) => reviewInvocations({ ref: "171", file: "ADR-006-threads.excalidraw", requestId }),
    });
    assert.deepEqual(recorded, [{ requestId: "n7", text: "And what about the cache?" }]);
    assert.deepEqual(handed, [["/aof:diagram-review 171 ADR-006-threads.excalidraw n7"]]);
    assert.equal(outcome, "typed");
  } },
  { name: "171/05 · a reply with no session running is recorded and waits", run: async () => {
    const recorded = [];
    const invocations = (requestId) => reviewInvocations({ ref: "171", file: "ADR-006-threads.excalidraw", requestId });
    assert.equal(await replyToNote({ requestId: "n7", text: "Still there?", record: async (reply) => { recorded.push(reply); }, deliver: () => "waiting", invocations }), "waiting");
    assert.equal(await replyToNote({ requestId: "n7", text: "Still there?", record: async (reply) => { recorded.push(reply); }, deliver: null, invocations }), "waiting", "with no surface to deliver through");
    assert.equal(recorded.length, 2, "recorded both times");
    await assert.rejects(replyToNote({ requestId: "n7", text: "  ", record: async () => assert.fail("an empty reply is not recorded"), deliver: null, invocations }), /Write a reply first/);
  } },
];
