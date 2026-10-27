// THE EDITOR'S PURE STATE — @aof/diagrams-ui's headless half (no React, no DOM, no SDK), the
// `runs.mjs` / `freshness.mjs` contract applied one package over: the node suites and the editor
// drive the SAME code. It moved out of `apps/ui/src/board/diagrams.mjs` with the editor when
// diagramming became its own package pair (@aof/diagrams for the node half, this one for the
// browser half), so the board carries only the figure and reaches the editor by one lazy import.
//
import { reviewInvocation } from "@aof/diagrams/review-session";

// ---- Excalidraw editor: scene draft ----
// Document fingerprints intentionally exclude SDK session state (camera, selections, tools).
// All element properties, including bindings, customData, labels and deletion, are retained.
// The backend validates the ADR member grammar; this only keeps the name a bare `.svg` member.
export function sceneFileName(svgFile) {
  const name = String(svgFile ?? "");
  if (!name.endsWith(".svg") || name.length <= 4 || /[/\\]/.test(name) || name.includes("..") || /[?#%\s]/.test(name)) throw new Error("Invalid diagram member");
  return name.slice(0, -4) + ".excalidraw";
}
export function sceneFingerprint(scene) {
  if (!scene) return "";
  return JSON.stringify({
    elements: scene.elements,
    files: scene.files,
    viewBackgroundColor: scene.appState?.viewBackgroundColor,
    gridSize: scene.appState?.gridSize,
  });
}

// The slash command that asks the architect to review a recorded request; with no request id it is
// the BATCH form (170/06). Spelled once, in @aof/diagrams' review-session (172/ADR-002, FF-17202) —
// the editor keeps the name it has always called it by.
export const diagramReviewInvocation = reviewInvocation;

// What one delivery hands the architect (171/ADR-005, 171/04 Q1): a request's own review invocation,
// then — when other notes are waiting — the batch invocation that examines them, so a session started
// for a question also takes the notes already written. With no request id it is the batch alone
// ("Review notes"). The surface decides what of it is typed.
export function reviewInvocations({ ref, file, requestId = null, waiting = 0 } = {}) {
  if (!requestId) return [diagramReviewInvocation(ref, file)];
  const own = diagramReviewInvocation(ref, file, requestId);
  return waiting > 0 ? [own, diagramReviewInvocation(ref, file)] : [own];
}

// DELIVERY TO THE ARCHITECT'S SESSION (172/ADR-002 §1). The editor names request ids; the board's
// conversation route derives what to type from them and hands it to the server's session, which answers
// one turn at a time in the order it was handed them. `deliveryFor(action, facts)` answers the bodies an
// action posts, in order: a question (or a first draft) its own request, then — when other notes wait —
// one batch review, so the session takes them after it (171/04 Q1); a reply and Ask again their note's
// request; Review with the architect one batch review; saving a note or withdrawing one, nothing.
export const DELIVERY_ACTIONS = Object.freeze(["ask", "first-draft", "reply", "ask-again", "review", "note", "withdraw"]);
export function deliveryFor(action, { requestId = null, waiting = 0 } = {}) {
  switch (action) {
    case "ask":
    case "first-draft":
      if (!requestId) return [];
      return waiting > 0 ? [{ requestId }, {}] : [{ requestId }];
    case "reply":
    case "ask-again":
      return requestId ? [{ requestId }] : [];
    case "review":
      return [{}];
    default:
      return [];
  }
}

// THE ONE ASK PATH (171/ADR-001): the bar's Ask architect and the canvas overlay's both come here, so
// a canvas ask and a bar ask are the same record and the same launch. An unsaved canvas is saved
// first and the request is recorded against the revision that save answered. The selection is named
// AFTER the save, because a shape drawn since the last one gets its Mermaid id there. The architect
// is launched only once the request has an id.
export async function askArchitect({ text, selection, unsaved, revision, save, record, launch, invocation }) {
  const question = String(text ?? "").trim();
  if (!question) throw new Error("Enter a question or requested change first.");
  const baseRevision = unsaved ? (await save()).revision : revision;
  const id = await record({ baseRevision, selectedIds: [...(selection() ?? [])], request: question });
  if (id) launch(invocation(id), id);
  return id;
}

// ---- Excalidraw editor: review state ----
// Pure review-panel helpers for the Excalidraw editor (no React, no DOM).
export const POLL_MS = 5000;

export function pendingProposals(proposals) {
  return (Array.isArray(proposals) ? proposals : []).filter((p) => p && p.status === "pending");
}

// A proposal records its changes as keyed facts (`node:API`, `edge:A->B#1`, `layout:API`, …) — the
// panel counts them and Preview selects the ids they name.
export function operationCounts(proposal) {
  const counts = { add: 0, update: 0, delete: 0 };
  const map = { added: "add", changed: "update", removed: "delete" };
  for (const change of Array.isArray(proposal?.changes) ? proposal.changes : []) {
    if (change && map[change.change]) counts[map[change.change]] += 1;
  }
  return counts;
}

export function describeCounts(proposal) {
  const c = operationCounts(proposal);
  const parts = [];
  if (c.add) parts.push(`${c.add} added`);
  if (c.update) parts.push(`${c.update} changed`);
  if (c.delete) parts.push(`${c.delete} removed`);
  return parts.length ? parts.join(", ") : "no changes";
}

// The Mermaid ids a proposal touches. `existingOnly` drops what it adds (not on the canvas yet).
export function touchedIds(proposal, { existingOnly = false } = {}) {
  const ids = [];
  for (const change of Array.isArray(proposal?.changes) ? proposal.changes : []) {
    if (!change || (existingOnly && change.change === "added")) continue;
    const id = String(change.key ?? "").slice(String(change.key ?? "").indexOf(":") + 1);
    if (id && change.key !== "direction" && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function selectionFor(ids) {
  return Object.fromEntries(ids.map((id) => [id, true]));
}

// Sliced, not matched: a `\s*(.*?)\.?\s*$` pattern is polynomial on a long run of whitespace after
// the marker (CodeQL js/polynomial-redos), and the message comes from the server.
const STALE_MARKER = "changed since it was made:";
export function staleConflictIds(message) {
  const text = String(message ?? "");
  const at = text.indexOf(STALE_MARKER);
  if (at < 0) return [];
  let list = text.slice(at + STALE_MARKER.length).trim();
  if (list.endsWith(".")) list = list.slice(0, -1);
  return list.split(",").map((s) => s.trim()).filter(Boolean);
}

export function describeError(code, message) {
  const text = String(message ?? "").trim();
  switch (code) {
    case "diagram-proposal-stale": {
      const ids = staleConflictIds(text);
      return `This proposal is out of date: ${ids.length ? `${ids.join(", ")} changed` : "what it touches changed"} on both sides since it was made. Your diagram was not changed. Ask the architect again.`;
    }
    case "diagram-scene-conflict":
      return "The saved draft changed elsewhere. Your canvas was not changed; export your drawing before reopening the latest draft.";
    case "diagram-proposal-decided":
      return "This proposal was already accepted or rejected. Refreshing the list.";
    case "diagram-item-delivered":
      return "This item is delivered or archived, so the draft is read-only.";
    default:
      return text || "Request failed.";
  }
}

// Poll only while the editor is open and the tab is visible — and, since 171/ADR-003, only while the
// review stream is not open: the poll is the stream's fallback, not a second channel.
export function shouldPoll({ open = true, visible = true, stream = "down" } = {}) {
  return Boolean(open) && Boolean(visible) && stream !== "open";
}

// ---- Excalidraw editor: notes (170/05) ----
// A NOTE is a review request the operator recorded without starting a session; it is open until
// answered, proposed for, or withdrawn.
export function openNotes(requests) {
  return (Array.isArray(requests) ? requests : []).filter((r) => r && r.status === "open");
}
