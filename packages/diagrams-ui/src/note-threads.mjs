// NOTE THREADS ON THE CANVAS (milestone 171 / ADR-006) — pure: no React, no DOM, no SDK. A note is a
// thread on its request record; this module says which notes are pinned beside which shape, what a
// pin says, and what a reply does. Where a pin or a thread SITS is `canvas-anchor.mjs`'s answer
// (FF-17102), and the overlay draws them (`NoteThread.tsx`, inside `CanvasOverlay.tsx`).
import { projectScene } from "@aof/diagrams/scene-view";

// A withdrawn note is gone from the canvas; an open, answered or proposed one is a live conversation.
const PINNED = new Set(["open", "answered", "proposed"]);
const oldestFirst = (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id));

// A note's turns, oldest first — a record from before threads has the turns its request and answer imply.
export function threadOf(note) {
  if (Array.isArray(note?.thread)) return note.thread;
  const turns = [{ by: "operator", text: note?.request ?? "", at: note?.createdAt ?? null }];
  if (typeof note?.answer === "string" && note.answer.length > 0) turns.push({ by: "architect", text: note.answer, at: note.answeredAt ?? null });
  return turns;
}
const answeredLast = (note) => threadOf(note).at(-1)?.by === "architect";

// One pin per shape — or per set of shapes one note names together — holding its notes oldest first.
// A whole-diagram note, a withdrawn one, and one naming a shape no longer on the canvas get no pin:
// they are read in the review panel. `answered` is true when some note's last turn is the architect's
// (the pin then reads in the console's primary colour; otherwise it is muted).
export function notePins(requests, elements) {
  const { model, index } = projectScene(Array.isArray(elements) ? elements : []);
  const labels = new Map(model.nodes.map((node) => [node.id, node.label || node.id]));
  const groups = new Map();
  for (const note of (Array.isArray(requests) ? requests : []).filter(Boolean).sort(oldestFirst)) {
    const ids = Array.isArray(note.selectedIds) ? note.selectedIds : [];
    if (!PINNED.has(note.status) || ids.length === 0 || ids.some((id) => !index[id])) continue;
    const elementIds = [...new Set(ids.flatMap((id) => index[id].elementIds))].sort();
    const key = elementIds.join(" ");
    if (!groups.has(key)) groups.set(key, { key, elementIds, label: ids.map((id) => labels.get(id) ?? id).join(", "), notes: [] });
    groups.get(key).notes.push(note);
  }
  return [...groups.values()].map((group) => ({ ...group, count: group.notes.length, answered: group.notes.some(answeredLast) }));
}

// What the thread's header says of a note: waiting on the architect, or what it is now.
export function noteStatus(note) {
  if (note?.status === "proposed") return "A proposal answers this note";
  return answeredLast(note) ? "Answered" : "Waiting for the architect";
}
export const turnAuthor = (turn) => (turn?.by === "architect" ? "Architect" : "You");

// A REPLY: the operator's turn recorded on the note's thread, then handed — as a note is — to the
// architect's session when one is running (ADR-005's delivery); with none it waits. Answers the outcome.
export async function replyToNote({ requestId, text, record, deliver, invocations }) {
  const reply = String(text ?? "").trim();
  if (!reply) throw new Error("Write a reply first.");
  await record({ requestId, text: reply });
  return deliver ? deliver(invocations(requestId)) : "waiting";
}
