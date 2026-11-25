import { commandError } from "@aof/contracts/error";
import { resolveWorkItemStore } from "../store/work-item-store.mjs";

export async function publishAtRefinementClose(input, { workspace }) {
  const store = resolveWorkItemStore(workspace);
  if (typeof store.boardCapabilities !== "function") {
    return { ref: input.ref, published: false, skipped: "local-file-mode", results: [] };
  }
  if (input.refinementComplete !== true) {
    throw commandError("Board publication requires a completed refinement. Supply --refinement-complete at the phase close or when retrying its publication.", "work-board-refinement-required", 409);
  }
  return store.mutate({
    operation: "publish",
    input: { ref: input.ref, descendants: input.descendants === true },
  });
}
