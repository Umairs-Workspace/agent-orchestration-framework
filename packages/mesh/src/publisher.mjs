import path from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { activeScopeHolders, executionScopeRef, restoreParkedAssignmentResume } from "./assignment-record.mjs";
import { isMeshLaneTree } from "./worktrees.mjs";

export const MESH_GLOBAL_DISABLED_CODE = "mesh-global-disabled";
export const MESH_WORKSPACE_UNCONFIGURED_CODE = "mesh-workspace-unconfigured";
export const MESH_WORKSPACE_LANE_CODE = "mesh-workspace-is-lane";
export const MESH_WORKSPACE_SECONDARY_CHECKOUT_CODE = "mesh-workspace-secondary-checkout";
export const WORKSPACE_CHANGED_EVENT = "workspace.changed";

// Application policy enters explicitly; constructing the service opens no stores or timers.
// The sync pass's ports (detectWorkspaceChanges and the effects journal, registry and dispatcher)
// are needed only when `syncWorkspace` runs, so a publisher built without them still publishes.
export function createGlobalWorkPublisher({ globalMeshPaths, openGlobalWorkProjectionStore, publishWorkspaceSnapshot, recordWorkspaceProjectionError, workspaceIdFor, readWorkspaceProjectionItems, readWorkspaceContentRecords, publishGlobalRegistryDescriptorsToStore, resolveWorkspaceId, reportDegrade, detectWorkspaceChanges, openEffectsJournal, appendEvent, readEventSteps, applicableReactors, drainEffects }) {
// m43 / ADR-012/B4 — the WORKER-side content read moved OUT of the single-writer store
// module into its own home when this story widened it to the artifact manifest. Same
// function, same shapes; imported from where it now lives.
// m43 / ADR-003 + ADR-011/A1 — the ONE derivation of "which execution scopes are held",
// read on the DISK-DERIVED publish path (this module) and handed to the row writer as
// data. assignment-record.mjs imports 0, so there is no cycle back through this seam.
// m42 item 3 — every former silent catch reports a coded degrade event.

// Re-exported so mesh-launcher.mjs (review fix P0.1/P1.7) can derive a workspace's
// canonical id and read its CURRENT item-row set WITHOUT importing global-work-
// store.mjs directly — this module is the ONE seam a mutation caller/the launcher
// is allowed to reach for the global store (fitness acd-global-publisher-single-
// seam: no OTHER caller opens the SQLite store or imports it directly). Re-
// exporting a pure/read helper here does not weaken that invariant — the WRITE
// path (publishWorkspaceSnapshot/openGlobalWorkProjectionStore) still only runs
// inside this module's own publishGlobalWorkSnapshot.
// readWorkspaceContentRecords rides the same re-export rationale: a WORKER-side
// pure read (doc bodies + run records for the worktree-content frame, schema v5) —
// the launcher reaches it through this seam, never the store module directly.


function meshGlobalPropagationDecision(workspaceOrConfig) {
  const config = workspaceOrConfig?.config ?? workspaceOrConfig ?? {};
  const mesh = config?.mesh;
  // A workspace opts into machine-wide propagation EITHER by the global mesh enable
  // (mesh?.enabled === true — set by `aof mesh join` into the global config, merged
  // into every workspace) OR by an explicit per-repo publish marker written by
  // `aof mesh repo publish` (34/story 06, ADR-010): mesh.repo.published === true makes
  // THIS repo a first-class mesh repo whose future work mutations auto-propagate, even
  // on a control node that never "joined". The single-predicate invariant
  // (acd-global-propagation-single-predicate) holds: this ONE function is still the sole
  // decision, and it still literally requires mesh?.enabled === true as one arm.
  if (mesh?.enabled === true || mesh?.repo?.published === true) {
    // …but a DIRECTORY is not a workspace just because a daemon was launched from it
    // (measured 2026-07-26: Task Scheduler's default cwd published C:\WINDOWS\system32
    // — and an installer-dir launch published ~/.aof/bin — as fleet "workspaces": the
    // machine-wide mesh.enabled merges into ANY cwd, so the enable arm alone cannot
    // gate). When the caller supplies a real workspace (it has a projectRoot),
    // propagation additionally requires the workspace's OWN config on disk — the
    // committed .aof/aof.config.json (or the legacy root aof.config.json). A pure
    // config-shaped argument (no projectRoot to check) keeps the enable-arm behaviour.
    const projectRoot = typeof workspaceOrConfig?.projectRoot === "string" ? workspaceOrConfig.projectRoot : null;
    // …nor is a LANE: a dispatch, session or assignment checkout carries the repository's own
    // committed config, so the test below admits it, and every verb its session ran registered it
    // as a separate fleet workspace (2026-10-06). The lane's work reaches the fleet through its
    // repository, once it merges home.
    if (projectRoot != null && isMeshLaneTree(projectRoot)) {
      return {
        enabled: false,
        code: MESH_WORKSPACE_LANE_CODE,
        guidance: `Not publishing ${projectRoot}: it is a mesh lane, not a workspace.`,
      };
    }
    // …nor a LINKED WORKTREE of the repository (164/F-06). It carries the same committed config,
    // so the same `workspaceId`, and since 164 every command publishes: measured live, a sibling
    // `git worktree` of this repository republished all of the workspace's rows, and its root, on
    // every command run in it, and the primary checkout republished them back. A linked worktree's
    // work reaches the store through its repository's checkout, once it merges home.
    if (projectRoot != null && isLinkedWorktree(projectRoot)) {
      return {
        enabled: false,
        code: MESH_WORKSPACE_SECONDARY_CHECKOUT_CODE,
        guidance: `Not publishing ${projectRoot}: it is a linked git worktree of its repository, not the workspace's checkout.`,
      };
    }
    if (projectRoot != null && projectRoot.length > 0) {
      const hasOwnConfig = existsSync(path.join(projectRoot, ".aof", "aof.config.json"))
        || existsSync(path.join(projectRoot, "aof.config.json"));
      if (!hasOwnConfig) {
        return {
          enabled: false,
          code: MESH_WORKSPACE_UNCONFIGURED_CODE,
          guidance: `Not publishing ${projectRoot}: it has no aof config — a launch directory is not a workspace.`,
        };
      }
    }
    return { enabled: true };
  }

  const hasMeshHints = mesh != null && Object.keys(mesh).some((key) => key !== "enabled");
  return {
    enabled: false,
    code: MESH_GLOBAL_DISABLED_CODE,
    guidance: hasMeshHints
      ? "Global work propagation is disabled until config.mesh.enabled is true."
      : null,
  };
}

async function publishGlobalWorkSnapshot(workspace, ctx = {}) {
  const decision = meshGlobalPropagationDecision(workspace);
  if (!decision.enabled) {
    return { published: false, skipped: true, code: decision.code, guidance: decision.guidance };
  }

  const storeOptions = ctx.globalWorkStoreOptions ?? {};
  const paths = storeOptions.paths ?? globalMeshPaths(storeOptions);

  try {
    if (typeof ctx.globalPublisher === "function") {
      const result = await ctx.globalPublisher(workspace, { paths, ctx });
      return { published: true, result };
    }

    const openStore = ctx.openGlobalWorkProjectionStore ?? openGlobalWorkProjectionStore;
    const store = await openStore({ ...storeOptions, paths });
    try {
      // THE HELD-SCOPE READ LIVES HERE (m43 / ADR-011/A1, and it REPLACES 43/01's
      // interim carry rather than extending it).
      //
      // `publishWorkspaceSnapshot` is not the tick — it is the shared row-writer, whose
      // other callers are the WORKER's two frame doors. A lock filter placed inside it
      // fires for the worker's own frames, which was measured to discard the holder's
      // authored delta (its completion frame included) for a whole phase. THIS function
      // is the tick: the one path that reads the calling node's OWN local disk slice
      // (the control's periodic publish and publish-on-mutate), and the only one
      // entitled to step over execution scopes an active assignment holds. So it reads
      // the lock and hands the answer DOWN as data; a frame door reads its own and hands
      // down its own. The store module queries the assignment table for nobody.
      //
      // 43/01's read-carry-reinsert dance is gone with the rebuild that forced it: a row
      // upsert simply does not write a held ref, so there is nothing to carry back over.
      // 164/F-02 — the registry FIRST: it rewrites this workspace's membership from the node
      // roster, and a roster with a torn record is partial, so the registry refuses (writing
      // nothing). The publish then writes nothing at all — no rows, no observations, no stat
      // digest — so the change stays owed, and every pass re-marks it and retries it with backoff
      // until it lands (164/ADR-006, exactly as a refused row write does), loud on every tick.
      const registry = await publishGlobalRegistryDescriptorsToStore(store, workspace, {
        now: ctx.now,
        fabricPeers: ctx.fabricPeers,
        ...(ctx.globalRegistryOptions ?? {}),
      });
      if (registry?.published === false) {
        return { published: false, result: { registry }, warning: { code: registry.code, message: registry.message, path: registry.unreadable?.[0] ?? paths?.databasePath ?? null } };
      }
      const workspaceId = resolveWorkspaceId(workspace);
      const result = await publishWorkspaceSnapshot(store, workspace, {
        now: ctx.now,
        heldScopes: activeScopeHolders(store, workspaceId),
        // The OPERATOR door (ADR-010/D1): the refs a control-side verb just mutated take
        // authorship, because a gate is where authorship legitimately changes hands. It
        // is a REF SET, not a flag on the whole publish — publish-on-mutate carries every
        // row in the workspace, and the operator touched one item, not all of them.
        operatorRefs: ctx.operatorRefs,
        // The stat digest a sync mark noticed (164/ADR-002), recorded only once nothing is owed.
        digest: ctx.digest,
      });
      return { published: true, result: { ...result, registry } };
    } catch (error) {
      try {
        recordWorkspaceProjectionError(store, workspace, error, { now: ctx.now });
      } catch (error) {
        // Recording the projection failure is best-effort; the caller gets the warning.
      reportDegrade("global-work-publisher", error); }
      return { published: false, warning: propagationWarning(error, paths) };
    } finally {
      store.close?.();
    }
  } catch (error) {
    return { published: false, warning: propagationWarning(error, paths) };
  }
}

// isLinkedWorktree(projectRoot) — is this checkout a linked `git worktree`? Its `.git` is a FILE naming
// a gitdir under the main repository's `.git/worktrees/` (a submodule's names `.git/modules/`
// instead, and a clone's `.git` is a directory). Read once per decision; unreadable is "no".
function isLinkedWorktree(projectRoot) {
  try {
    const gitdir = /^gitdir:\s*(.+)$/mu.exec(readFileSync(path.join(projectRoot, ".git"), "utf8"));
    return gitdir != null && /[\\/]worktrees[\\/][^\\/]+[\\/]?$/u.test(gitdir[1].trim());
  } catch {
    return false;
  }
}

// syncWorkspace(workspace, ctx) — THE sync pass (164/ADR-004): detect, mark, drain. Every driver
// (a CLI command for its own workspace; the daemon's start and tick, story 01) runs this one pass.
//
//   detect — the propagation decision first, so nothing is read or written for a workspace that
//            does not propagate (or a lane). Then the stat digest of its record docs: an equal
//            digest is the whole cost on an unchanged tree. Otherwise the store's detector asks
//            the one predicate which refs are owed a publish (164/ADR-002).
//   mark   — a `workspace.changed` event in the EXISTING effects journal (164/ADR-003), with an
//            id from (workspaceId, digest) so noticing one state twice appends once, and the
//            collapse key `ws:<id>` so a workspace owes at most one sync at a time.
//   drain  — that event, through the same `publish-projection` reactor a verb's event uses.
//            `ctx.drain === false` leaves it owed (a caller that drains in bulk).
async function syncWorkspace(workspace, ctx = {}) {
  const decision = meshGlobalPropagationDecision(workspace);
  if (!decision.enabled) return { synced: false, skipped: true, code: decision.code };
  for (const [name, port] of Object.entries({ detectWorkspaceChanges, openEffectsJournal, appendEvent, readEventSteps, applicableReactors, drainEffects })) {
    if (typeof port !== "function") throw new TypeError(`syncWorkspace requires ${name}.`);
  }
  const digest = await workspaceStatDigest(workspace.workDir);
  const storeOptions = ctx.globalWorkStoreOptions ?? {};
  const paths = storeOptions.paths ?? globalMeshPaths(storeOptions);
  // `ctx.openStore` is a caller's shared handle for the detect read (the daemon tick shares one).
  const store = await (ctx.openStore ?? ctx.openGlobalWorkProjectionStore ?? openGlobalWorkProjectionStore)({ ...storeOptions, paths });
  let detected;
  let held = [];
  try {
    detected = await detectWorkspaceChanges(store, workspace, { digest, now: ctx.now });
    // A change on a ref another node's assignment holds waits for that node (164/ADR-001). It is
    // reported, not marked: a mark drained under the lock would settle while the change is still
    // owed. Its baseline does not advance, so the first pass after the lock releases marks it.
    const holders = detected.owed.length > 0 ? activeScopeHolders(store, detected.workspaceId) : new Map();
    held = detected.owed.flatMap((ref) => {
      const holder = holders.get(executionScopeRef(ref));
      const holderNode = holder?.holderNode ?? holder?.targetNodeId ?? null;
      return holder != null && holderNode !== detected.nodeId ? [{ ref, reason: "held-by-assignment", holderNode }] : [];
    });
  } finally {
    store.close?.();
  }
  const { workspaceId } = detected;
  const owed = detected.owed.filter((ref) => !held.some((entry) => entry.ref === ref));
  if (owed.length === 0) return { synced: true, changed: false, workspaceId, digest, ...(held.length > 0 ? { held } : {}) };

  const name = WORKSPACE_CHANGED_EVENT;
  const payload = { workspaceRoot: workspace.projectRoot, workspaceId, digest };
  const reactors = await applicableReactors(name, payload, { workspace });
  const journal = await openEffectsJournal(ctx.journalOptions ?? {});
  try {
    // Noticing one state twice is one event. But a state whose mark already SETTLED while its change
    // is still owed (the lock took the ref between mark and drain) is owed a fresh mark, or the
    // ignored append would leave nothing to drain until some other file moved.
    const base = `workspace-changed:${workspaceId}:${digest}`;
    let eventId = base;
    let appended = false;
    for (let attempt = 1; ; attempt += 1) {
      ({ eventId, appended } = appendEvent(journal, { eventId, name, payload, source: "sync-pass", now: ctx.now, collapseKey: `ws:${workspaceId}` }, reactors));
      const settled = !appended && readEventSteps(journal, eventId).every((step) => step.status !== "pending" && step.status !== "failed");
      if (!settled) break;
      eventId = `${base}:${attempt}`;
    }
    const effects = ctx.drain === false
      ? []
      : await drainEffects({ journal, eventId, now: ctx.now, ctx: { publisherOptions: { globalWorkStoreOptions: storeOptions, ...(ctx.publisherOptions ?? {}) } } });
    return { synced: true, changed: true, workspaceId, digest, owed, eventId, appended, effects, ...(held.length > 0 ? { held } : {}) };
  } finally {
    journal.close();
  }
}

// workspaceStatDigest(workDir) — the stat gate (164/ADR-002): a digest of (path, size, mtimeMs)
// over the work tree's record docs and task features. It only decides whether to LOOK; the
// decision is always the fingerprint comparison. An unreadable tree has no digest, so the pass
// always looks and never records one.
async function workspaceStatDigest(workDir) {
  let entries;
  try {
    entries = await readdir(workDir, { recursive: true, withFileTypes: true });
  } catch (error) {
    reportDegrade("sync-stat-digest", error, { path: workDir });
    return null;
  }
  // Stats run concurrently: measured on this repository's ~3,200 record files, serial awaits
  // cost ~540ms per command and concurrent ones ~240ms.
  const files = entries.filter((entry) => entry.isFile() && /\.(md|feature)$/i.test(entry.name))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
  const lines = await Promise.all(files.map(async (full) => {
    const rel = path.relative(workDir, full).split(path.sep).join("/");
    try {
      const info = await stat(full);
      return `${rel}\0${info.size}\0${info.mtimeMs}`;
    } catch {
      return `${rel}\0gone`;
    }
  }));
  return createHash("sha256").update(lines.sort().join("\n")).digest("hex");
}

// threadPropagationWarnings(result, effects) — the ONE home for putting the
// publish reactor's warning back on a command result (m42 wave (d) leg d4, port
// 1, replacing `withGlobalWorkPropagation`).
//
// THE DECISION THIS ENCODES. Publish-on-mutate is now a `local`-locus reactor, so
// its warning arrives in the effects OUTCOMES rather than from a wrapper around
// the command's own return value. The face threads it back — deliberately —
// rather than letting the two ported verbs' `--json` change shape: the
// `propagationWarnings` key is the established contract of `work:run-start` /
// `work:feedback` / `work:run-complete`, and a warning about THIS command's own
// consequence belongs on its result. The threading is a shared function, not a
// re-remembered `.find()` at each call site, because that copy-per-caller is the
// very disease the port cures.
function threadPropagationWarnings(result, effects = []) {
  let threaded = result;
  for (const outcome of effects) {
    if (outcome?.key !== "publish-projection") continue;
    const warning = outcome.detail?.warning;
    if (warning) threaded = appendPropagationWarning(threaded, warning);
  }
  return threaded;
}

function appendPropagationWarning(result, warning) {
  if (result != null && typeof result === "object" && !Array.isArray(result)) {
    return {
      ...result,
      propagationWarnings: [...(Array.isArray(result.propagationWarnings) ? result.propagationWarnings : []), warning],
    };
  }
  return result;
}

function renderPropagationWarnings(result) {
  const warnings = result?.propagationWarnings;
  if (!Array.isArray(warnings) || warnings.length === 0) return "";
  return warnings.map((warning) => {
    const pathPart = warning.path ? ` at ${warning.path}` : "";
    return `warning: global work propagation ${warning.code}${pathPart}: ${warning.message}`;
  }).join("\n");
}

function renderWithPropagationWarnings(base, result) {
  const warningText = renderPropagationWarnings(result);
  return warningText ? `${base}\n${warningText}` : base;
}

function propagationWarning(error, paths) {
  return {
    code: error?.code ?? "global-work-propagation-failed",
    message: error?.message ?? "Global work propagation failed.",
    path: paths?.databasePath ?? null,
  };
}

// restoreRefusedResumeReservation — 69/05's pre-spawn refusal restore, reached through
// THIS seam rather than by opening the store at the call site (34/ADR-004; fitness
// acd-global-publisher-single-seam). `mesh-launcher.mjs` owns the router-side
// not-connected signal — a provable pre-spawn refusal — but it is one of the two callers
// ADR-004 names as store-blind, and 69/05 first satisfied that need with a direct
// `openGlobalWorkProjectionStore` import in the launcher, which turned the invariant red
// (VERIFICATION F-69-V19).
//
// The durable `assignment.reported` reactor (`src/effects/table.mjs`) remains the NORMAL
// path for a park's capacity release; this is the narrow fallback for the refusal fact
// that exists only in the control process, post-send, and it restores exactly the one
// reservation the refusal envelope names.
async function restoreRefusedResumeReservation(assignmentId, reservation = {}, ctx = {}) {
  const storeOptions = ctx.globalWorkStoreOptions ?? {};
  const paths = storeOptions.paths ?? globalMeshPaths(storeOptions);
  const openStore = ctx.openGlobalWorkProjectionStore ?? openGlobalWorkProjectionStore;
  const store = await openStore({ ...storeOptions, paths });
  try {
    return restoreParkedAssignmentResume(store, assignmentId, reservation);
  } finally {
    store.close?.();
  }
}

return { MESH_GLOBAL_DISABLED_CODE, MESH_WORKSPACE_UNCONFIGURED_CODE, meshGlobalPropagationDecision, publishGlobalWorkSnapshot, syncWorkspace, threadPropagationWarnings, appendPropagationWarning, renderPropagationWarnings, renderWithPropagationWarnings, restoreRefusedResumeReservation };
}
