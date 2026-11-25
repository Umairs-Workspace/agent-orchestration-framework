import { commandError } from "@aof/contracts/error";
import path from "node:path";
import { createFileWorkItemStore } from "./file-store.mjs";

const stores = new WeakMap();

// Workspace identity scopes the provider. A test or embedding application can
// supply a store without constructing a tracking directory.
export function resolveWorkItemStore(workspace) {
  if (workspace.workItemStore != null) return workspace.workItemStore;
  return workspaceStore(workspace);
}

export function bindWorkItemStore(workspace) {
  Object.defineProperty(workspace, "workItemStore", { get: () => workspaceStore(workspace) });
  return workspace;
}

// Compatibility for existing query rules and repository-document readers. Only
// this edge turns the store's optional document home into the legacy dir field.
// A bare work directory is retained for older package callers; production passes
// its workspace so an injected or configured store is never lost.
export async function readWorkItemView(workspaceOrDir, options) {
  const workspace = typeof workspaceOrDir === "string" ? { workDir: workspaceOrDir } : workspaceOrDir;
  const snapshot = await resolveWorkItemStore(workspace).snapshot(options);
  const homes = new WeakMap();
  const items = snapshot.items.map(({ documentHome, ...identity }) => {
    const dir = documentHome == null ? null : path.resolve(workspace.workDir, documentHome);
    const item = {
      number: identity.number, type: identity.type, slug: identity.slug,
      name: dir == null ? null : path.basename(dir), dir,
      ref: identity.ref, parent: identity.parent,
      ...(identity.backlog !== undefined ? { backlog: identity.backlog } : {}),
      ...(identity.archived === true ? { archived: true } : {}),
    };
    homes.set(item, documentHome);
    return item;
  });
  const record = (item, options = {}) => snapshot.read(item.ref, {
    ...options,
    documentHome: homes.get(item) ?? (item.dir == null ? undefined : path.relative(workspace.workDir, item.dir).replaceAll("\\", "/")),
  });
  return { items, snapshot, record, frontmatter: async item => (await record(item))?.metadata ?? {} };
}

function lazyBoardStore(workspace, manifest) {
  let selected;
  const load = () => selected ??= import("./board-store.mjs")
    .then(({ createBoardWorkItemStore }) => createBoardWorkItemStore(workspace, manifest));
  const operations = ["snapshot", "changeToken", "readItems", "readChanges", "applyChanges", "boardCapabilities", "mutate"];
  return Object.fromEntries(operations.map(operation =>
    [operation, async (...args) => (await load())[operation](...args)]));
}

function workspaceStore(workspace) {
  let store = stores.get(workspace);
  if (store == null) {
    const selection = workspace.config?.work?.store;
    if (selection === undefined || selection === "files") {
      store = createFileWorkItemStore(workspace.workDir);
    } else if (selection && Object.keys(selection).length === 1 &&
        typeof selection.manifest === "string" && selection.manifest.trim() !== "") {
      store = lazyBoardStore(workspace, selection.manifest);
    } else {
      throw commandError(`Unsupported work.store ${JSON.stringify(selection)}. Use files or a board manifest selection.`, "work-store-unsupported", 400);
    }
    stores.set(workspace, store);
  }
  return store;
}

// The launcher retains workspace observations without knowing their mechanism.
// Tokens remain authoritative for polling providers that need no observation handle.
export function createWorkItemObservations(options = {}) {
  const entries = new Map();
  let closed = false;
  const keyOf = workspace => path.resolve(typeof workspace === "string" ? workspace : workspace.workDir);
  const dispose = entry => {
    const close = () => {
      if (entry.disposed) return;
      entry.disposed = true;
      return entry.handle?.dispose?.();
    };
    try {
      return Promise.resolve(entry.pending ? entry.pending.then(close) : close())
        .catch(error => options.reportDegrade?.("work-store-observation-dispose", error));
    } catch (error) { options.reportDegrade?.("work-store-observation-dispose", error); }
  };
  return {
    async arm(workspaces) {
      for (const workspace of workspaces) {
        if (closed) break;
        const key = keyOf(workspace);
        if (entries.has(key)) continue;
        const entry = { handle: null, pending: null, disposed: false };
        entries.set(key, entry);
        try {
          entry.pending = Promise.resolve(resolveWorkItemStore(workspace).observe?.(options))
            .then(handle => { entry.handle = handle; });
          await entry.pending;
        } catch (error) { options.reportDegrade?.("work-store-observation-unavailable", error, { path: key }); }
        finally { entry.pending = null; }
        if (entries.get(key) !== entry) await dispose(entry);
      }
    },
    retain(workspaces) {
      const keep = new Set([...workspaces].map(keyOf));
      const pending = [];
      for (const [key, entry] of entries) {
        if (keep.has(key)) continue;
        entries.delete(key);
        pending.push(dispose(entry));
      }
      return Promise.all(pending);
    },
    close() {
      closed = true;
      const pending = [...entries.values()].map(dispose);
      entries.clear();
      return Promise.all(pending);
    },
  };
}
