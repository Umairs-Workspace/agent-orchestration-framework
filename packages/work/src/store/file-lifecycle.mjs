import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { setItemStatus, rollbackItemStatus } from "../records.mjs";

// Resolve identity afresh; the existing writer then reads the authoritative
// status at the mutation boundary, retaining its surgical edit and refusals.
export async function applyFileLifecycle(store, workDir, request) {
  const { operation, ref, documentHome, toStatus, expectFrom, now } = request;
  if (operation !== "status" && operation !== "rollback") {
    throw commandError(`Unsupported work store operation ${JSON.stringify(operation)}.`, "work-store-operation-unsupported", 400);
  }
  const snapshot = await store.snapshot();
  const matches = snapshot.items.filter(item => item.ref === ref && (documentHome == null || item.documentHome === documentHome));
  if (matches.length !== 1) {
    throw commandError(`Expected one work item for ref ${JSON.stringify(ref)}; found ${matches.length}.`, matches.length === 0 ? "ref-not-found" : "ambiguous-ref", matches.length === 0 ? 404 : 409);
  }
  const identity = matches[0];
  const item = { ...identity, dir: path.resolve(workDir, identity.documentHome) };
  return operation === "rollback"
    ? rollbackItemStatus(item, toStatus, { now })
    : setItemStatus(item, toStatus, { expectFrom, now });
}
