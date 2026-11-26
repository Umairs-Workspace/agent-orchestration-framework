import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, realpath } from "node:fs/promises";
import picomatch from "picomatch";
import { commandError } from "@aof/contracts/error";
import { asList } from "../dependencies.mjs";
import { isLiveStreamRow } from "../discovery.mjs";
import { statusMoveRefusal } from "../records.mjs";
import { inside, itemBoardKey } from "./board-links.mjs";
import { classifyObserved, conflictError } from "./board-conflicts.mjs";

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortIds = ids => [...(ids ?? [])].sort((a, b) => String(a).localeCompare(String(b)));

function resultOf(entry, outcome, code) {
  return { ref: entry.ref, id: entry.id ?? null, outcome, ...(code && { code }) };
}

export function matchesTracked(actual, desired) {
  if (!actual || actual.id == null || actual.revision == null || actual.fault || desired == null) return false;
  return Object.entries(desired).every(([key, value]) => {
    if (key === "dependsIds") return equal(sortIds(actual[key]), sortIds(value));
    if (key === "parentId") return (actual[key] ?? null) === value;
    return actual[key] === value;
  });
}

function normalizedRef(ref) {
  return /^\d+(?:\/\d+)?$/.test(ref) ? ref.split("/").map(Number).join("/") : ref;
}

function lookupRef(links, ref) {
  return Object.values(links).find(entry => entry.id != null && normalizedRef(entry.ref) === normalizedRef(ref));
}

// `dependencies: "omit"` is placement's: a move can leave a sibling's `depends:` naming a ref
// nothing holds any more (file mode keeps it as written), and the board then carries only the
// relations it can name. Publication stays strict, so a dependency is linked before its dependent.
export async function desiredBoardValues(item, local, links, { dependencies = "require" } = {}) {
  const record = await local.read(item.ref, { documentHome: item.documentHome });
  if (record?.fault) throw commandError(`The local document for ${item.ref} is unusable.`, "work-board-document-unusable", 409);
  const meta = record?.metadata ?? {};
  const dependencyRefs = asList(meta.depends).map(dep => {
    const ref = String(dep);
    return item.parent != null && !ref.includes("/") ? `${item.parent}/${ref}` : ref;
  });
  const parent = item.parent == null ? null : lookupRef(links, item.parent);
  if (item.parent != null && !parent) throw commandError(`Publish parent ${item.parent} before ${item.ref}.`, "work-board-parent-unpublished", 409);
  const dependsIds = dependencyRefs.flatMap(ref => {
    const dependency = lookupRef(links, ref);
    if (dependency) return [dependency.id];
    if (dependencies === "omit") return [];
    throw commandError(`Publish dependency ${ref} before ${item.ref}.`, "work-board-dependency-unpublished", 409);
  });
  return {
    type: item.type, ref: item.ref, title: meta.title ?? item.slug, status: meta.status ?? "not-started",
    rank: item.number == null ? null : Number(item.number),
    membership: item.number == null ? "backlog" : "active",
    parentId: parent?.id ?? null,
    dependsIds: sortIds(dependsIds),
  };
}

async function readEntry(board, entry) {
  const request = entry.id == null ? { keys: [entry.key] } : { ids: [entry.id] };
  const read = await board.readItems(request);
  if (read.authoritative === false || read.fault) throw commandError("Board readback is unavailable.", "work-board-readback", 409);
  const candidates = read.items.filter(item => entry.id == null ? item.key === entry.key : item.id === entry.id);
  if (candidates.length > 1) throw commandError(`Multiple board items claim ${entry.ref}.`, "work-board-key-duplicate", 409);
  return candidates[0];
}

function acknowledge(entry, record, desired) {
  entry.id = record.id;
  entry.revision = record.revision;
  entry.acknowledged = desired;
  entry.pending = null;
  return resultOf(entry, "verified");
}

export async function reconcileBoardItem(board, entry, desired, save, { verifyExisting = false, retried = false } = {}) {
  if (entry.conflict != null) return resultOf(entry, "pending", "work-board-conflict");
  if (entry.pending && !equal(entry.pending.desired, desired)) {
    return resultOf(entry, "pending", "work-board-other-intent");
  }

  const alreadyAcknowledged = entry.id != null && equal(entry.acknowledged, desired);
  if (entry.pending || entry.id == null || (verifyExisting && alreadyAcknowledged)) {
    const observed = await readEntry(board, entry).catch(() => null);
    if (matchesTracked(observed, desired)) {
      const result = acknowledge(entry, observed, desired);
      await save();
      return result;
    }
    if (observed === null || entry.pending?.uncertain || (observed && entry.id == null) || (verifyExisting && alreadyAcknowledged)) {
      return resultOf(entry, "pending", observed ? "work-board-values-unverified" : "work-board-readback-pending");
    }
  }
  if (alreadyAcknowledged) {
    return resultOf(entry, "verified");
  }

  const key = entry.pending?.operationKey ?? (entry.id == null ? entry.key : randomUUID());
  entry.desired = desired;
  entry.pending = { desired, operationKey: key, uncertain: true };
  await save();
  let reply;
  try {
    reply = await board.applyChanges({ changes: [{
      ...desired, key, correlationKey: entry.key,
      ...(entry.id != null && { id: entry.id, expectedRevision: entry.revision }),
    }] });
  } catch {
    reply = { writeCode: "work-board-write-uncertain" };
  }
  const write = reply?.results?.find(candidate => candidate.key === key);
  if (write?.outcome === "refused") {
    entry.pending.uncertain = false;
    await save();
    if (entry.id != null && entry.acknowledged) {
      // A refusal of a guarded write means the board moved. Classify what moved it before
      // anything else is attempted: a change AOF does not track is acknowledged and the write
      // retried once under the new revision; any other change latches the conflict.
      // undefined: the readback could not answer, so nothing is classified.
      const observed = await readEntry(board, entry).then(item => item ?? null, () => undefined);
      if (observed !== undefined && classifyObserved(entry, observed)) {
        entry.pending = null;
        await save();
        if (entry.conflict != null) return resultOf(entry, "pending", "work-board-conflict");
        if (!retried) return reconcileBoardItem(board, entry, desired, save, { verifyExisting, retried: true });
      }
    }
    return resultOf(entry, "pending", write.code ?? "work-board-refused");
  }
  if (write?.outcome === "applied" && write.id != null) {
    entry.id = write.id;
    await save();
  }
  const observed = await readEntry(board, entry).catch(() => null);
  if (!matchesTracked(observed, desired)) {
    const pending = resultOf(entry, "pending", observed ? "work-board-values-unverified" : "work-board-readback-pending");
    return reply?.writeCode == null ? pending : { ...pending, writeCode: reply.writeCode };
  }
  const result = acknowledge(entry, observed, desired);
  await save();
  return result;
}

async function artifacts(home, matcher, folder = home) {
  const candidates = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      candidates.push(...await artifacts(home, matcher, file));
      continue;
    }
    const relative = path.relative(home, file).replaceAll("\\", "/");
    if (!matcher(relative) || (!entry.isFile() && !entry.isSymbolicLink())) continue;
    const real = await realpath(file).catch(() => null);
    if (real && inside(home, real)) candidates.push({ relative, file: real });
  }
  return candidates;
}

async function copyArtifacts(board, entry, workDir, save) {
  const patterns = board.definition.capabilities?.attachments?.paths;
  if (!board.copyAttachment || !patterns?.length) return true;
  const home = await realpath(path.resolve(workDir, entry.documentHome));
  if (!inside(await realpath(workDir), home)) throw commandError("The artifact home is outside the work directory.", "work-board-home-invalid", 409);
  entry.attachments ??= {};
  for (const { relative, file } of await artifacts(home, picomatch(patterns))) {
    const bytes = await readFile(file);
    const contentKey = createHash("sha256").update(relative).update("\0").update(bytes).digest("hex");
    if (entry.attachments[contentKey]?.url) continue;
    entry.attachments[contentKey] = { path: relative };
    await save();
    const result = await board.copyAttachment({ id: entry.id, expectedRevision: entry.revision, name: path.basename(relative), bytes, contentKey });
    if (result?.outcome !== "applied" || !result.url || result.revision == null) return false;
    entry.revision = result.revision;
    entry.attachments[contentKey].url = result.url;
    await save();
  }
  return true;
}

export async function publishRefined({ workspace, board, file, links }, { ref, descendants = false }) {
  return links.claim(async (state, save) => {
    const local = await file.snapshot();
    const roots = local.items.filter(item => normalizedRef(item.ref) === normalizedRef(ref) && isLiveStreamRow(item));
    if (roots.length > 1) throw commandError(`Multiple local drafts match ${ref}.`, "work-board-draft-ambiguous", 409);
    const [root] = roots;
    if (!root) throw commandError(`No numbered local draft matches ${ref}.`, "work-board-draft-not-found", 404);
    const candidates = descendants ? [root, ...local.items.filter(item => item.parent === root.ref)] : [root];
    const results = [];
    for (const item of candidates) {
      const key = await itemBoardKey(workspace.workDir, item.documentHome, { create: true });
      const entry = state.links[key] ??= { key };
      Object.assign(entry, { ref: item.ref, documentHome: item.documentHome });
      await save();
      if (entry.conflict != null) {
        results.push(resultOf(entry, "pending", "work-board-conflict"));
        break;
      }
      const desired = await desiredBoardValues(item, local, state.links);
      const outcome = await reconcileBoardItem(board, entry, desired, save, { verifyExisting: true });
      if (outcome.outcome === "verified" && !await copyArtifacts(board, entry, workspace.workDir, save)) {
        results.push(resultOf(entry, "pending", "work-board-attachment-unverified"));
      } else {
        results.push(outcome);
      }
      if (results.at(-1).outcome !== "verified") break;
    }
    return { ref, published: results.length === candidates.length && results.every(row => row.outcome === "verified"), results };
  });
}

export async function mutateBoardLifecycle({ workspace, board, file, links }, request) {
  return links.claim(async (state, save) => {
    const local = await file.snapshot();
    const item = local.items.find(row => row.ref === request.ref && (request.documentHome == null || request.documentHome === row.documentHome));
    const key = await itemBoardKey(workspace.workDir, item?.documentHome);
    const entry = key == null ? null : state.links[key];
    if (!entry || entry.id == null) return file.mutate(request);
    if (entry.conflict != null) throw conflictError(entry);
    const { toStatus, expectFrom } = request;
    const record = await local.read(item.ref, { documentHome: item.documentHome });
    if (record?.fault) throw commandError(`The local document for ${item.ref} is unusable.`, "record-doc-unusable", 422);
    const from = record?.metadata?.status;
    // The file store's own refusal, so a refused move reads the same in either store (209/05).
    const refusal = statusMoveRefusal(item, from, toStatus, { operation: request.operation, expectFrom });
    if (refusal != null) throw refusal;
    const desired = { ...entry.acknowledged, status: toStatus };
    const outcome = await reconcileBoardItem(board, entry, desired, save);
    if (outcome.code === "work-board-conflict") throw conflictError(entry);
    if (outcome.outcome !== "verified") {
      throw commandError(`Board update pending for ${item.ref} (board ID ${entry.id}). Retry the same status change.`, outcome.code, 409);
    }
    return file.mutate(request);
  });
}
