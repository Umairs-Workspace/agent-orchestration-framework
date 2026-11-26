import { commandError } from "@aof/contracts/error";
import { localBoardItems } from "./board-links.mjs";
import { desiredBoardValues, reconcileBoardItem } from "./board-publication.mjs";
import { conflictError } from "./board-conflicts.mjs";

export async function applyBoardPlacement(context, request, runtime) {
  const { workspace, file, board, links } = context;
  if (request.operation === "archive" || request.operation === "archive-move") {
    throw commandError("Archive is available only in local file mode.", "work-board-archive-local-only", 400);
  }
  if (request.stage === "plan" && request.operation === "renumber") {
    return file.mutate({ ...request, input: { ...request.input, allowReparent: true } }, runtime);
  }
  if (request.stage !== "apply" || !["reindex", "renumber"].includes(request.operation)) {
    return file.mutate(request, runtime);
  }
  return links.claim(async (state, save) => {
    const before = await file.snapshot();
    const linkedBefore = await localBoardItems(workspace.workDir, before, state.links);
    const unsettled = [];
    for (const [key, item] of linkedBefore) {
      const entry = state.links[key];
      if (entry.conflict != null) throw conflictError(entry);
      if (entry.id != null && entry.pending) unsettled.push(item.ref);
    }
    if (unsettled.length) {
      throw commandError(`Board changes are pending for ${unsettled.join(", ")}. Recover them before moving work.`, "work-board-placement-pending", 409);
    }
    const result = await file.mutate(request, runtime);
    const after = await file.snapshot();
    const local = await localBoardItems(workspace.workDir, after, state.links);
    // Publish every changed address before resolving any dependency to a board
    // ID, so a reindex that moves both ends of a link uses the final refs.
    for (const [key, item] of local) {
      Object.assign(state.links[key], { ref: item.ref, documentHome: item.documentHome });
    }
    if (local.size > 0) await save();
    const pending = [];
    for (const [key, item] of local) {
      const entry = state.links[key];
      if (entry.id == null) continue;
      const desired = await desiredBoardValues(item, after, state.links, { dependencies: "omit" });
      const outcome = await reconcileBoardItem(board, entry, desired, save);
      if (outcome.outcome !== "verified") pending.push(outcome);
    }
    if (pending.length) {
      const error = commandError("Local placement moved; some board changes need recovery.", "work-board-placement-pending", 409);
      error.detail = { ...result, pending };
      throw error;
    }
    return result;
  });
}
