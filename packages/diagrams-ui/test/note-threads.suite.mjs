// Milestone 171 / story 05 — a note's thread pinned beside the shape it names, driven headlessly:
// which notes are pinned to which shapes and what a pin says (`note-threads.mjs`, ADR-006), where a
// pin and its thread sit (`canvas-anchor.mjs`, ADR-001), and what a reply does (ADR-005's delivery).
// The pin and its popover on a drawn canvas are the smoke's (test/smoke/diagram-editor.smoke.mjs).
// node:assert/strict, `{ name, run }` shape.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { besideAnchor, cornerAnchor } from "@aof/diagrams-ui/canvas-anchor";
import { reviewInvocations } from "@aof/diagrams-ui/editor-state";
import { noteStatus, notePins, replyToNote, threadOf, turnAuthor } from "@aof/diagrams-ui/note-threads";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
// The Background: the nodes "gateway" (400,300 160×80) and "cache" (640,300 120×80), each a box with its label.
const node = (id, x, width) => [
  { id: `box-${id}`, type: "rectangle", x, y: 300, width, height: 80, customData: { aof: { id } } },
  { id: `label-${id}`, type: "text", x, y: 330, width: 60, height: 20, text: id, originalText: id, containerId: `box-${id}` },
];
const ELEMENTS = [...node("gateway", 400, 160), ...node("cache", 640, 120)];
const WITHOUT_GATEWAY = node("cache", 640, 120);
let seq = 0;
const note = (selectedIds, { status = "open", by = "operator", at = `2026-10-25T10:0${seq}:00.000Z` } = {}) => {
  seq += 1;
  const thread = [{ by: "operator", text: `note ${seq}`, at }];
  if (by === "architect") thread.push({ by: "architect", text: "an answer", at });
  return { id: `n${seq}`, status, createdAt: at, selectedIds, request: `note ${seq}`, thread };
};
// What `getCommonBounds` answers for unrotated boxes and their labels: the union of their rectangles.
const boundsOf = (elementIds) => {
  const own = ELEMENTS.filter((element) => elementIds.includes(element.id));
  return [Math.min(...own.map((e) => e.x)), Math.min(...own.map((e) => e.y)), Math.max(...own.map((e) => e.x + e.width)), Math.max(...own.map((e) => e.y + e.height))];
};
const VIEW = { appState: { scrollX: 0, scrollY: 0, zoom: { value: 1 } }, viewport: { width: 1200, height: 800 } };
const PIN = { width: 12, height: 12 };
const THREAD = { width: 320, height: 240 };

export const noteThreadTests = [
  // ── R3 · A note's thread is read beside the shape it names ──────────────────────────────────
  { name: "171/05 E7 · a note on a shape is pinned to that shape's corner, and its thread opens beside it", run: () => {
    const pins = notePins([note(["gateway"])], ELEMENTS);
    assert.equal(pins.length, 1);
    assert.deepEqual(pins[0].elementIds, ["box-gateway", "label-gateway"]);
    const bounds = boundsOf(pins[0].elementIds);
    assert.deepEqual(cornerAnchor({ bounds, ...VIEW, size: PIN }), { x: 560 - 6, y: 300 - 6 }, "centred on gateway's top-right corner");
    assert.deepEqual(besideAnchor({ bounds, ...VIEW, size: THREAD }), { x: 560 + 8, y: 300, side: "right" }, "the thread beside gateway, top-aligned");
  } },
  { name: "171/05 E8 · two notes on one shape share a pin that counts them, oldest first", run: () => {
    const older = note(["gateway"]);
    const newer = note(["gateway"]);
    const [pin] = notePins([newer, older], ELEMENTS);
    assert.equal(pin.count, 2);
    assert.deepEqual(pin.notes.map((item) => item.id), [older.id, newer.id]);
  } },
  { name: "171/05 E9 · a note on the whole diagram has no pin, and stays in the review panel", run: () => {
    assert.deepEqual(notePins([note([])], ELEMENTS), []);
  } },
  { name: "171/05 E10 · a note on a shape since deleted has no pin, and stays in the review panel", run: () => {
    assert.deepEqual(notePins([note(["gateway"])], WITHOUT_GATEWAY), []);
    assert.deepEqual(notePins([note(["gateway", "cache"])], WITHOUT_GATEWAY), [], "one of its shapes gone is enough");
  } },
  { name: "171/05 · a withdrawn note has no pin, and stays in the review panel", run: () => {
    assert.deepEqual(notePins([note(["gateway"], { status: "withdrawn" })], ELEMENTS), []);
  } },
  { name: "171/05 E11 · a note on two shapes is pinned once, to the box enclosing both", run: () => {
    const pins = notePins([note(["gateway", "cache"])], ELEMENTS);
    assert.equal(pins.length, 1);
    assert.deepEqual(cornerAnchor({ bounds: boundsOf(pins[0].elementIds), ...VIEW, size: PIN }), { x: 760 - 6, y: 300 - 6 });
  } },
  { name: "171/05 · a pin and its thread stay on screen: out of view, nothing; near the right edge, the thread goes left", run: () => {
    const bounds = boundsOf(["box-gateway"]);
    assert.equal(cornerAnchor({ bounds, appState: { scrollX: -2000, scrollY: 0, zoom: { value: 1 } }, viewport: VIEW.viewport, size: PIN }), null);
    const nearEdge = besideAnchor({ bounds, appState: { scrollX: 500, scrollY: 0, zoom: { value: 1 } }, viewport: VIEW.viewport, size: THREAD });
    assert.equal(nearEdge.side, "left");
    assert.equal(nearEdge.x, 900 - 8 - 320, "to the left of the box, the gap clear of it");
  } },

  // ── R4 · The pin says whether the architect is waiting on the operator ───────────────────────
  { name: "171/05 E12 · a note whose last turn is the architect's is pinned in the console's primary colour", run: async () => {
    assert.equal(notePins([note(["gateway"], { by: "architect" })], ELEMENTS)[0].answered, true);
    const component = await readFile(path.join(src, "NoteThread.tsx"), "utf8");
    assert.match(component, /pin\.answered \? "bg-primary" : "bg-muted-foreground"/u, "answered reads primary, otherwise muted");
  } },
  { name: "171/05 E13 · a note whose last turn is the operator's is pinned muted", run: () => {
    assert.equal(notePins([note(["gateway"])], ELEMENTS)[0].answered, false);
    assert.equal(noteStatus(note(["gateway"])), "Waiting for the architect");
    assert.equal(noteStatus(note(["gateway"], { by: "architect" })), "Answered");
  } },
  { name: "171/05 · a thread's turns are the record's, or — before threads — its request then its answer", run: () => {
    const legacy = { id: "old", status: "answered", request: "Why?", answer: "Because.", createdAt: "a", answeredAt: "b" };
    assert.deepEqual(threadOf(legacy).map((turn) => [turnAuthor(turn), turn.text]), [["You", "Why?"], ["Architect", "Because."]]);
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
