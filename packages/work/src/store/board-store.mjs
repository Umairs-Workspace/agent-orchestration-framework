import { commandError } from "@aof/contracts/error";
import { createFileWorkItemStore } from "./file-store.mjs";
import { createBoardLinks, localBoardItems } from "./board-links.mjs";
import { mutateBoardLifecycle, publishRefined } from "./board-publication.mjs";
import { applyBoardPlacement } from "./board-placement.mjs";

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
        metadata: entry.fault ? localRecord.metadata : { ...localRecord.metadata, title: entry.record.metadata.title, status: entry.record.metadata.status },
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
    async mutate(request, runtime) {
      const context = await board();
      if (request.operation === "publish") return publishRefined(context, request.input);
      if (request.operation === "status" || request.operation === "rollback") return mutateBoardLifecycle(context, request);
      return applyBoardPlacement(context, request, runtime);
    },
  };
}
