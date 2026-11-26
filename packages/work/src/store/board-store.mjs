import { commandError } from "@aof/contracts/error";
import { createFileWorkItemStore } from "./file-store.mjs";
import { createBoardLinks, localBoardItems } from "./board-links.mjs";
import { mutateBoardLifecycle, publishRefined } from "./board-publication.mjs";
import { applyBoardPlacement } from "./board-placement.mjs";
import { BOARD_POLL_INTERVAL_MS, listConflicts, pollBoardChanges, resyncBoardItem } from "./board-conflicts.mjs";

function projectedRecord(item) {
  return {
    boardId: item.id, revision: item.revision,
    metadata: {
      ...item.metadata, title: item.title, status: item.status,
      parent: item.parent, depends: item.depends ?? [],
    },
    fault: item.fault ?? null,
    recordDocument: null,
    recordText: null,
  };
}

// The board answers for the tracked values a record carries, and only those: a record with no
// title or status of its own (a task's .feature) reads as it does over files, never as the
// defaults publication had to give the board item (209/05).
function overlay(local, remote) {
  const merged = { ...local };
  for (const key of ["title", "status"]) if (Object.hasOwn(local, key)) merged[key] = remote[key];
  return merged;
}

async function makeSnapshot({ workspace, board, file, links }, options) {
  const [reply, local, state] = await Promise.all([board.readItems({}), file.snapshot(options), links.read()]);
  const localByKey = await localBoardItems(workspace.workDir, local, state.links);
  const remoteIds = new Map(reply.items.map(row => [row.id, row]));
  const knownIds = new Set();
  const tracked = new Map();
  for (const [key, item] of localByKey) {
    const entry = state.links[key];
    if (entry.id == null) continue;
    knownIds.add(entry.id);
    const remote = remoteIds.get(entry.id);
    const fault = remote?.fault ?? (remote == null
      ? { code: "work-board-linked-item-missing", message: `Missing board ID ${entry.id} linked to ${item.ref}.` } : null);
    tracked.set(item.documentHome, {
      record: remote && projectedRecord(remote),
      fault, boardId: entry.id, revision: entry.revision,
      // A conflicted item answers with the values AOF intends until a resync restores them.
      conflicted: entry.conflict != null,
    });
  }
  const items = [...local.items];
  const remote = new Map();
  const localRefs = new Set(items.map(item => item.ref));
  for (const item of reply.items) {
    if (knownIds.has(item.id) || localRefs.has(item.ref)) continue;
    if (remote.has(item.ref)) throw commandError(`The board returned multiple items for ref ${item.ref}`, "work-board-ambiguous-ref", 409);
    remote.set(item.ref, item);
    const { ref, number, type, slug, parent, backlog, archived } = item;
    items.push({ ref, number, type, slug, parent,
      ...(backlog !== undefined && { backlog }),
      ...(archived === true && { archived }),
    });
  }
  return {
    source: "board",
    token: JSON.stringify([reply.token ?? null, local.token ?? null]),
    authoritative: reply.authoritative !== false && ![...tracked.values()].some(row => row.fault != null),
    fault: reply.fault ?? [...tracked.values()].find(row => row.fault)?.fault ?? null,
    items,
    async read(ref, options = {}) {
      const localRecord = await local.read(ref, options);
      if (localRecord == null) {
        const item = remote.get(ref);
        return item == null || options.documentHome != null ? null : projectedRecord(item);
      }
      const home = options.documentHome ?? local.items.find(item => item.ref === ref)?.documentHome;
      const entry = tracked.get(home);
      if (!entry || localRecord.fault) return localRecord;
      return {
        ...localRecord,
        metadata: entry.fault || entry.conflicted ? localRecord.metadata : overlay(localRecord.metadata, entry.record.metadata),
        boardId: entry.boardId,
        revision: entry.record?.revision ?? entry.revision,
        fault: entry.fault,
      };
    },
  };
}

export function createBoardWorkItemStore(workspace, manifest) {
  let selection;
  const file = createFileWorkItemStore(workspace.workDir);
  const board = () => selection ??= import("./board-definition.mjs").then(async ({ loadBoardDefinition }) => {
    const selected = await loadBoardDefinition(workspace, manifest);
    return { workspace, board: selected, file, links: createBoardLinks(workspace, selected.manifestPath, selected.definition.board) };
  });

  return {
    async snapshot(options) {
      return makeSnapshot(await board(), options);
    },
    async changeToken() {
      const { board: selected } = await board();
      return JSON.stringify([(await selected.readItems({})).token ?? null, await file.changeToken()]);
    },
    async readItems(input) { return (await board()).board.readItems(input); },
    async readChanges(input) { return (await board()).board.readChanges(input); },
    async applyChanges(input) { return (await board()).board.applyChanges(input); },
    async boardCapabilities() {
      const { board: { definition, accessProbe, copyAttachment } } = await board();
      return { attachments: definition.capabilities?.attachments, accessProbe, copyAttachment };
    },
    async boardConflicts(options) {
      return listConflicts(await (await board()).links.read(), options);
    },
    async pollChanges() {
      return pollBoardChanges(await board());
    },
    async resync(input) {
      return resyncBoardItem(await board(), input);
    },
    // The launcher arms one observation per workspace. Polls never overlap, and a poll that finds
    // the journal claimed by a writer waits for the next interval.
    observe(options = {}) {
      const intervalMs = options.boardPollIntervalMs ?? BOARD_POLL_INTERVAL_MS;
      let running = null;
      const tick = () => {
        running ??= this.pollChanges()
          .catch(error => { if (error?.code !== "work-board-busy") options.reportDegrade?.("work-board-poll", error); })
          .finally(() => { running = null; });
      };
      const timer = setInterval(tick, intervalMs);
      timer.unref?.();
      tick();
      return { dispose() { clearInterval(timer); } };
    },
    async mutate(request, runtime) {
      const context = await board();
      if (request.operation === "publish") return publishRefined(context, request.input);
      if (request.operation === "status" || request.operation === "rollback") return mutateBoardLifecycle(context, request);
      return applyBoardPlacement(context, request, runtime);
    },
  };
}
