import { resolveWorkItemStore } from "../store/work-item-store.mjs";

export async function resyncBoardOnRequest(input, { workspace }) {
  const store = resolveWorkItemStore(workspace);
  if (typeof store.resync !== "function") {
    return { ref: input.ref, resynced: false, skipped: "local-file-mode" };
  }
  return store.resync({ ref: input.ref });
}
