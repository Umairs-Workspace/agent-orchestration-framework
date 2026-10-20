// THE EDITOR'S PURE STATE — @aof/diagrams-ui's headless half (no React, no DOM, no SDK), the
// `runs.mjs` / `freshness.mjs` contract applied one package over: the node suites and the editor
// drive the SAME code. It moved out of `apps/ui/src/board/diagrams.mjs` with the editor when
// diagramming became its own package pair (@aof/diagrams for the node half, this one for the
// browser half), so the board carries only the figure and reaches the editor by one lazy import.
//
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

// The slash command that asks the architect to review a recorded request (same style as action.mjs).
export function diagramReviewInvocation(ref, file, requestId) {
  return `/aof:diagram-review ${ref} ${file} ${requestId}`;
}

// ---- Excalidraw editor: review state ----
// Pure review-panel helpers for the Excalidraw editor (no React, no DOM).
export const POLL_MS = 5000;

export function pendingProposals(proposals) {
  return (Array.isArray(proposals) ? proposals : []).filter((p) => p && p.status === "pending");
}

export function operationCounts(proposal) {
  const counts = { add: 0, update: 0, delete: 0 };
  for (const op of Array.isArray(proposal?.operations) ? proposal.operations : []) {
    if (op && Object.hasOwn(counts, op.op)) counts[op.op] += 1;
  }
  return counts;
}

export function describeCounts(proposal) {
  const c = operationCounts(proposal);
  const parts = [];
  if (c.add) parts.push(`${c.add} added`);
  if (c.update) parts.push(`${c.update} changed`);
  if (c.delete) parts.push(`${c.delete} removed`);
  return parts.length ? parts.join(", ") : "no operations";
}

// Ids of elements the proposal touches. `existingOnly` drops adds (they are not on the canvas yet).
export function touchedIds(proposal, { existingOnly = false } = {}) {
  const ids = [];
  for (const op of Array.isArray(proposal?.operations) ? proposal.operations : []) {
    if (!op || (existingOnly && op.op === "add")) continue;
    const id = op.op === "add" ? op.element?.id : op.id;
    if (typeof id === "string" && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function selectionFor(ids) {
  return Object.fromEntries(ids.map((id) => [id, true]));
}

export function staleConflictIds(message) {
  const match = /changed since it was made:\s*(.*?)\.?\s*$/s.exec(String(message ?? ""));
  return match ? match[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

export function describeError(code, message) {
  const text = String(message ?? "").trim();
  switch (code) {
    case "diagram-proposal-stale": {
      const ids = staleConflictIds(text);
      return `This proposal is out of date: ${ids.length ? `element${ids.length > 1 ? "s" : ""} ${ids.join(", ")} changed` : "elements it touches changed"} after it was made. Your canvas was not changed. Ask the architect again.`;
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

// Poll only while the editor is open and the tab is visible.
export function shouldPoll({ open = true, visible = true } = {}) {
  return Boolean(open) && Boolean(visible);
}
