import path from "node:path";
import { readFile } from "node:fs/promises";
import { listItems, readStreamSnapshot, workTreeStatDigest, createWorkTreeWatches } from "../discovery.mjs";
import { readItemMeta, recordDoc, parseFrontmatter } from "../records.mjs";

// One file-watch set serves all retained workspace observations. Releasing one
// handle must not close another workspace's watcher or reset its remembered walk.
let observations = null;
function observeFiles(workDir, options) {
  const state = observations ??= { watches: createWorkTreeWatches(options), refs: new Map() };
  const key = path.resolve(workDir);
  state.refs.set(key, (state.refs.get(key) ?? 0) + 1);
  state.watches.arm([key]);
  let disposed = false;
  return { dispose() {
    if (disposed) return;
    disposed = true;
    const count = state.refs.get(key) - 1;
    if (count > 0) state.refs.set(key, count);
    else state.refs.delete(key);
    state.watches.retain(state.refs.keys());
    if (state.refs.size === 0) {
      state.watches.close();
      if (observations === state) observations = null;
    }
  } };
}

export function createFileWorkItemStore(workDir) {
  const store = {
    async mutate(request, runtime) {
      // Mutation engines are loaded only at the write door. Observation must not
      // initialise lifecycle or placement services just to open a snapshot.
      if (request.operation !== "status" && request.operation !== "rollback") {
        const { applyFilePlacement } = await import("./file-placement.mjs");
        return applyFilePlacement(store, workDir, request, runtime);
      }
      const { applyFileLifecycle } = await import("./file-lifecycle.mjs");
      return applyFileLifecycle(store, workDir, request);
    },
    async snapshot(options) {
      let source;
      try {
        source = await readStreamSnapshot(workDir, options);
      } catch (error) {
        // Legacy enumerators tolerate an absent or unreadable work root.
        const items = await listItems(workDir);
        options?.meter?.count?.("full-disk-read", options.labels ?? {});
        source = {
          items,
          authoritative: false,
          fault: { code: error.code ?? "work-stream-unreadable", message: error.message },
          digest: null,
          fromMemo: false,
          record: async item => ({ doc: recordDoc(item), meta: await readItemMeta(item), fault: null }),
        };
      }
      const homeOf = item => path.relative(workDir, item.dir).replaceAll("\\", "/");
      const byHome = new Map(source.items.map(item => [homeOf(item), item]));
      const byRef = new Map();
      for (const item of source.items) {
        const matches = byRef.get(item.ref) ?? [];
        matches.push(item);
        byRef.set(item.ref, matches);
      }
      return {
        token: source.digest,
        authoritative: source.authoritative !== false,
        fault: source.fault ?? null,
        fromMemo: source.fromMemo,
        // Preserve enumeration order; query-specific ordering belongs to the
        // existing list/find rules, and must not duplicate ambiguous parents.
        items: source.items.map(item => ({
          ref: item.ref,
          number: item.number,
          type: item.type,
          slug: item.slug,
          parent: item.parent,
          documentHome: homeOf(item),
          ...(item.backlog !== undefined ? { backlog: item.backlog } : {}),
          ...(item.archived === true ? { archived: true } : {}),
        })),
        async read(ref, { documentHome, diagnostics = false } = {}) {
          const matches = byRef.get(ref) ?? [];
          if (documentHome == null && matches.length > 1) {
            return { metadata: {}, fault: { kind: "ambiguous", ref } };
          }
          const item = documentHome == null ? matches[0] : byHome.get(documentHome);
          if (item != null && item.ref !== ref) return null;
          if (item == null) return null;
          // Doctor historically judges an imported milestone's original SPEC,
          // while projection/readiness use its AOF digest. Preserve that answer
          // inside the file provider, without teaching a consumer to reopen it.
          if (diagnostics && recordDoc(item) === "AOF.md") {
            try {
              const text = await readFile(path.join(item.dir, "SPEC.md"), "utf8");
              return { metadata: parseFrontmatter(text), recordText: text, recordDocument: "SPEC.md", fault: null };
            } catch (error) {
              return { metadata: {}, recordText: null, recordDocument: "SPEC.md", fault: { kind: "read", code: error.code ?? null, message: error.message } };
            }
          }
          const { doc, meta, fault, text } = await source.record(item);
          return { metadata: { ...meta }, fault, recordDocument: doc, recordText: text };
        },
      };
    },
    changeToken: options => workTreeStatDigest(workDir, options),
    observe: options => observeFiles(workDir, options),
  };
  return store;
}
