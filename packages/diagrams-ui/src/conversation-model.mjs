// THE CONVERSATION MODEL (milestone 172 / ADR-003 §2) — pure: no React, no DOM, no SDK. The panel draws
// threads it does not compute. This module turns the review records and the scene into threads — one
// per subject: the shapes a note names, or "Whole diagram" for a note that names none, or names a
// shape no longer on the canvas — each with its notes oldest first, its state, the proposals that
// answer its notes, and when it last moved. It took over `note-threads.mjs` (171/ADR-006): a note's
// thread record, its pin and the reply flow live here, so a pin and a panel card read one model and
// can never disagree about a note. Where a pin SITS is still `canvas-anchor.mjs`'s answer (FF-17102).
import { projectScene } from "@aof/diagrams/scene-view";

export const WHOLE_DIAGRAM = "Whole diagram";
export const WHOLE_DIAGRAM_KEY = "whole-diagram";
export const STATE = Object.freeze({
  answered: "Answered",
  waiting: "Waiting for the architect",
  proposed: "A proposal answers this",
  accepted: "Proposal accepted",
  rejected: "Proposal rejected",
});

// A withdrawn note is gone from the panel and the canvas; an open, answered or proposed one is a live
// conversation.
const LIVE = new Set(["open", "answered", "proposed"]);
const oldestFirst = (a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id));
const latest = (...values) => values.filter((value) => typeof value === "string" && value.length > 0).sort().at(-1) ?? null;

// A note's turns, oldest first — a record from before threads has the turns its request and answer imply.
export function threadOf(note) {
  if (Array.isArray(note?.thread)) return note.thread;
  const turns = [{ by: "operator", text: note?.request ?? "", at: note?.createdAt ?? null }];
  if (typeof note?.answer === "string" && note.answer.length > 0) turns.push({ by: "architect", text: note.answer, at: note.answeredAt ?? null });
  return turns;
}
export const turnAuthor = (turn) => (turn?.by === "architect" ? "Architect" : "You");

// The newest proposal answering a note, by the request it names.
const newestFirst = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(b.id).localeCompare(String(a.id));
function proposalsByRequest(proposals) {
  const by = new Map();
  for (const proposal of (Array.isArray(proposals) ? proposals : []).filter(Boolean).sort(newestFirst)) {
    if (typeof proposal.requestId !== "string") continue;
    if (!by.has(proposal.requestId)) by.set(proposal.requestId, []);
    by.get(proposal.requestId).push(proposal);
  }
  return by;
}

// What a note's state says: who has the last word. A note a proposal answers says what became of the
// proposal; a waiting note is one whose last turn is the operator's.
export function noteStatus(note, proposal = null) {
  if (note?.status === "proposed") {
    if (proposal?.status === "accepted") return STATE.accepted;
    if (proposal?.status === "rejected") return STATE.rejected;
    return STATE.proposed;
  }
  return threadOf(note).at(-1)?.by === "architect" ? STATE.answered : STATE.waiting;
}

// A turn's or a decision's time as the panel shows it, `HH:MM` in local time; nothing for no time.
export function clockOf(at) {
  const date = new Date(at ?? "");
  return Number.isNaN(date.getTime()) ? "" : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
// What a decided proposal reads in place of its actions.
export function proposalOutcome(proposal) {
  const at = clockOf(proposal?.decidedAt);
  if (proposal?.status === "accepted") return at ? `Accepted ${at}` : "Accepted";
  if (proposal?.status === "rejected") return proposal.reason ? `Rejected — ${proposal.reason}` : "Rejected";
  return null;
}

// threadsOf(requests, proposals, elements) -> threads, the most recent activity first. A thread is
// `{ key, subject, elementIds, selectedIds, notes, state, lastTurn, proposal, updatedAt }`; each note
// carries its `turns` and the `proposals` that answer it (newest first), and the thread's state and
// last turn are its most recently active note's.
export function threadsOf(requests, proposals, elements) {
  const { model, index } = projectScene(Array.isArray(elements) ? elements : []);
  const labels = new Map(model.nodes.map((node) => [node.id, node.label || node.id]));
  const answering = proposalsByRequest(proposals);
  const groups = new Map();
  for (const record of (Array.isArray(requests) ? requests : []).filter(Boolean).sort(oldestFirst)) {
    if (!LIVE.has(record.status)) continue;
    const ids = Array.isArray(record.selectedIds) ? record.selectedIds : [];
    const onCanvas = ids.length > 0 && ids.every((id) => index[id]);
    const elementIds = onCanvas ? [...new Set(ids.flatMap((id) => index[id].elementIds))].sort() : [];
    const key = onCanvas ? elementIds.join(" ") : WHOLE_DIAGRAM_KEY;
    if (!groups.has(key)) groups.set(key, { key, subject: onCanvas ? ids.map((id) => labels.get(id) ?? id).join(", ") : WHOLE_DIAGRAM, elementIds, selectedIds: [], notes: [] });
    const group = groups.get(key);
    for (const id of onCanvas ? ids : []) if (!group.selectedIds.includes(id)) group.selectedIds.push(id);
    const turns = threadOf(record);
    const own = answering.get(record.id) ?? [];
    const updatedAt = latest(record.createdAt, ...turns.map((turn) => turn.at), ...own.flatMap((proposal) => [proposal.createdAt, proposal.decidedAt]));
    group.notes.push({ ...record, turns, proposals: own, state: noteStatus(record, own[0] ?? null), updatedAt });
  }
  return [...groups.values()].map((group) => {
    const active = [...group.notes].sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt))).at(-1);
    return {
      ...group,
      state: active.state,
      lastTurn: active.turns.at(-1) ?? null,
      proposal: group.notes.flatMap((note) => note.proposals).sort(newestFirst)[0] ?? null,
      updatedAt: active.updatedAt,
    };
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || a.key.localeCompare(b.key));
}

// conversationOf(requests, proposals, elements) -> what the panel draws: the threads, every proposal
// newest first with the thread it answers, and the count of pending proposals.
export function conversationOf(requests, proposals, elements) {
  const threads = threadsOf(requests, proposals, elements);
  const threadOfRequest = new Map(threads.flatMap((thread) => thread.notes.map((note) => [note.id, thread])));
  const listed = (Array.isArray(proposals) ? proposals : []).filter(Boolean).sort(newestFirst).map((proposal) => {
    const thread = threadOfRequest.get(proposal.requestId) ?? null;
    return { ...proposal, threadKey: thread?.key ?? null, subject: thread?.subject ?? null };
  });
  return { threads, proposals: listed, pending: listed.filter((proposal) => proposal.status === "pending").length };
}

// The note a thread replies to: the one a reply continues is the conversation the subject is having now.
export const replyTarget = (thread) => thread?.notes?.at(-1) ?? null;

// One pin per thread on the canvas — a "Whole diagram" thread has none. `answered` is true unless the
// thread waits on the architect (the pin then reads in the console's primary colour; otherwise muted).
export function notePins(threads) {
  return (Array.isArray(threads) ? threads : []).filter((thread) => thread.elementIds.length > 0).map((thread) => ({
    key: thread.key, elementIds: thread.elementIds, label: thread.subject, notes: thread.notes,
    count: thread.notes.length, answered: thread.state !== STATE.waiting,
  }));
}

// The thread holding a note, by the note's id: asking opens the new note's thread.
export const threadHolding = (threads, noteId) => (Array.isArray(threads) ? threads : []).find((thread) => thread.notes.some((note) => note.id === noteId)) ?? null;

// The panel's composer names what it will ask about: the selection's label, or the whole diagram.
export const composerSubject = (label) => (label ? `about ${label}` : "about the whole diagram");

// A REPLY: the operator's turn recorded on the note's thread, then handed — as a note is — to the
// architect's session when one is running; with none it waits. Answers the outcome.
export async function replyToNote({ requestId, text, record, deliver, invocations }) {
  const reply = String(text ?? "").trim();
  if (!reply) throw new Error("Write a reply first.");
  await record({ requestId, text: reply });
  return deliver ? deliver(invocations(requestId)) : "waiting";
}
