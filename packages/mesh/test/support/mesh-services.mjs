// The mesh package's own services, built from its public factories — what a mesh suite uses instead of
// reaching `@aof/mesh` through the assembled application. The one collaborator the package does not own is
// core's path policy; it is reduced here to what the mesh reads (the global mesh geometry under
// AOF_GLOBAL_HOME), and it REFUSES to fall back to the real home, so a suite run outside the isolated runner
// cannot write there.
//
// Every other collaborator core's bindings hand a mesh factory is either built here from a package the mesh
// already depends on, reduced to a faithful stand-in (named below), or — when no suite using the helper ever
// reaches it — a refusal, so a suite that starts to need it fails loudly and belongs at the root instead.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { importSqliteRuntime } from "@aof/foundation/sqlite-runtime";
import { toWireProvenance } from "@aof/contracts/cache-provenance";
import { isStale } from "@aof/contracts/freshness";
import { createRunStore } from "@aof/execution/runs";
import { listItems } from "@aof/work/discovery";
import { parseFrontmatter, recordDoc } from "@aof/work/records";
import { resolveCacheStalenessSeconds } from "@aof/mesh/cache-policy";
import { createControlStreamServices } from "@aof/mesh/control-stream-server";
import { EFFECT_ACK_FRAME_KIND, EFFECT_STEP_FRAME_KIND } from "@aof/mesh/effect-frames";
import { createGlobalNodeRegistry } from "@aof/mesh/global-node-registry";
import { createGlobalMeshQuery } from "@aof/mesh/global-query";
import { createMeshLauncher } from "@aof/mesh/launcher";
import { createMeshLauncherLock } from "@aof/mesh/launcher-lock";
import { deriveNodeId, sidecarPathFor } from "@aof/mesh/node-identity";
import { createMeshPresence } from "@aof/mesh/presence";
import { createGlobalWorkProjectionStore } from "@aof/mesh/projection-store";
import { createGlobalWorkPublisher } from "@aof/mesh/publisher";
import { createRecoveryPush } from "@aof/mesh/recovery-push";
import { createMeshRegistry } from "@aof/mesh/registry";
import { createMeshRelay } from "@aof/mesh/relay";
import { PRESENCE_SIGNAL_KIND } from "@aof/mesh/relay-client";
import { createMeshResync } from "@aof/mesh/resync";
import { createMeshSessions } from "@aof/mesh/session";
import { TABLE_CLASSIFICATION } from "@aof/mesh/store-metadata";
import { createMeshStore } from "@aof/mesh/store";
import { createTerminalMirroring } from "@aof/mesh/terminal-mirror";
import { createTerminalRelayBridge } from "@aof/mesh/terminal-relay-bridge";
import { createMeshUiServer } from "@aof/mesh/ui-serve";
import { resolveCloneUrl } from "@aof/mesh/worker-repo-admission";
import { createWorkerStreamServices } from "@aof/mesh/worker-stream-client";
import { resolveWorkspaceId, workspaceIdFromPath } from "@aof/mesh/workspace-identity";

// Core's globalMeshPaths geometry, rooted at AOF_GLOBAL_HOME only.
export function globalMeshPaths(options = {}) {
  const home = (options.env ?? process.env).AOF_GLOBAL_HOME;
  if (!home) throw new Error("mesh test services need AOF_GLOBAL_HOME (run through the isolated runner)");
  const meshRoot = path.join(path.resolve(home), "mesh");
  const workRoot = path.join(meshRoot, "work");
  return {
    meshRoot,
    workRoot,
    nodesRoot: path.join(meshRoot, "nodes"),
    workspacesRoot: path.join(meshRoot, "workspaces"),
    databasePath: path.join(workRoot, "projection.sqlite"),
    identityPath: path.join(meshRoot, "identity.json"),
  };
}

export const reportDegrade = () => {};

// A collaborator the suite never reaches.
export function unreached(owner, name) {
  return () => { throw new Error(`${owner} reached ${name}, which this mesh suite never uses: the suite is cross-package`); };
}

// A collaborator VALUE the suite never reaches: reading any property of it refuses.
export function unreachedValue(owner, name) {
  return new Proxy({}, { get() { unreached(owner, name)(); } });
}

// Core's loadWorkspace, reduced to the fixture projects mesh suites build: the project's own
// `.aof/aof.config.json` at the root it is handed, the paths derived from it, and the global mesh root resolved
// from the SAME env. The real loader also overlays a global config and an identity sidecar; this one refuses
// when either exists rather than silently disagreeing with it.
export async function loadFixtureWorkspace(cwd, explicitConfig, { env = process.env } = {}) {
  const projectRoot = path.resolve(cwd);
  const aofDir = path.join(projectRoot, ".aof");
  const configPath = explicitConfig ? path.resolve(projectRoot, explicitConfig) : path.join(aofDir, "aof.config.json");
  const meshPaths = globalMeshPaths({ env });
  const overlays = [path.join(path.resolve(env.AOF_GLOBAL_HOME), "aof.config.json"), meshPaths.identityPath, sidecarPathFor(aofDir)];
  const present = overlays.filter((file) => existsSync(file));
  if (present.length) throw new Error(`loadFixtureWorkspace does not model the overlay(s) ${present.join(", ")}: use the real loader at the root`);
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const workDir = path.resolve(projectRoot, config.work?.dir ?? "./wiki/work");
  return { configPath, config, configFault: null, projectRoot, workDir, aofDir, identityPath: meshPaths.identityPath, globalMeshRoot: meshPaths.meshRoot };
}

export function meshStoreServices() {
  return createMeshStore({ globalMeshPaths });
}

export function meshRegistryServices() {
  return createMeshRegistry({ meshDir: meshStoreServices().meshDir });
}

export function meshRelayServices() {
  const store = meshStoreServices();
  const registry = createMeshRegistry({ meshDir: store.meshDir });
  const { isControlNode, readRegistry, writeRegistry, admitNode, consumePendingInvite, isInviteConsumed, isInviteExpired, verifyCredential } = registry;
  const { publishNodeRecord, readNodeRecord } = store;
  return {
    registry,
    store,
    relay: createMeshRelay({ isControlNode, readRegistry, writeRegistry, admitNode, consumePendingInvite, isInviteConsumed, isInviteExpired, verifyCredential, publishNodeRecord, readNodeRecord, reportDegrade }),
  };
}

export function meshLauncherLockServices() {
  return createMeshLauncherLock({ globalMeshPaths, reportDegrade });
}

// The run store's path builders, from `@aof/execution`'s own factory. Work's answer readers are never reached.
export function runStoreServices() {
  return createRunStore({ reportDegrade, getAnswerTokens: unreached("the run store", "getAnswerTokens"), readSessionAnswers: unreached("the run store", "readSessionAnswers") });
}

// Table classification over the mesh's OWN tables (core aggregates every domain's; only the mesh's are in this store).
const tableClass = (table) => TABLE_CLASSIFICATION[table]?.class ?? null;
const refRemapTables = (locus) => Object.entries(TABLE_CLASSIFICATION)
  .filter(([, entry]) => entry.refRemap?.locus === locus)
  .map(([table, entry]) => ({ table, column: entry.refRemap.column }));

export function globalWorkStoreServices() {
  return createGlobalWorkProjectionStore({ importSqliteRuntime, globalMeshPaths, listItems, parseFrontmatter, recordDoc, workspaceIdFromPath, resolveWorkspaceId, reportDegrade, tableClass, refRemapTables, deriveNodeId, toWireProvenance });
}

export function meshSessionServices() {
  return createMeshSessions({ meshDir: meshStoreServices().meshDir, isStale, reportDegrade });
}

// Presence over the mesh's own store, sessions and projection store. Run and loop liveness are never reached.
export function meshPresenceServices() {
  const { meshDir, presenceRecordPath } = meshStoreServices();
  const { readSessionRecordsForNode, isSessionLive, resolveSessionTtlSeconds } = meshSessionServices();
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices();
  const owner = "mesh presence";
  return createMeshPresence({
    meshDir, presenceRecordPath, readSessionRecordsForNode, isSessionLive, resolveSessionTtlSeconds, openGlobalWorkProjectionStore, globalMeshPaths,
    readRuns: unreached(owner, "readRuns"), isStale: unreached(owner, "isStale"), STOP_LEVELS: unreachedValue(owner, "STOP_LEVELS"), loopStopsDir: unreached(owner, "loopStopsDir"), readStopRequest: unreached(owner, "readStopRequest"),
  });
}

export function globalNodeRegistryServices() {
  const { readNodeRecords } = meshStoreServices();
  const { readPresenceRecords, readPresenceRecord, assemblePresenceRecord } = meshPresenceServices();
  return createGlobalNodeRegistry({ globalMeshPaths, resolveWorkspaceId, readNodeRecords, readPresenceRecords, readPresenceRecord, assemblePresenceRecord, resolveCloneUrl, reportDegrade });
}

// Work's content records are never reached.
export function globalWorkPublisherServices() {
  const { openGlobalWorkProjectionStore, publishWorkspaceSnapshot, recordWorkspaceProjectionError, workspaceIdFor, readWorkspaceProjectionItems } = globalWorkStoreServices();
  const { publishGlobalRegistryDescriptorsToStore } = globalNodeRegistryServices();
  return createGlobalWorkPublisher({ globalMeshPaths, openGlobalWorkProjectionStore, publishWorkspaceSnapshot, recordWorkspaceProjectionError, workspaceIdFor, readWorkspaceProjectionItems, readWorkspaceContentRecords: unreached("the global work publisher", "readWorkspaceContentRecords"), publishGlobalRegistryDescriptorsToStore, resolveWorkspaceId, reportDegrade });
}

export function globalMeshQueryServices() {
  const { openGlobalWorkProjectionStore, queryGlobalWorkProjection, globalStoreError, workspaceIdFor } = globalWorkStoreServices();
  const { queryGlobalRegistry } = globalNodeRegistryServices();
  const { MESH_GLOBAL_DISABLED_CODE } = globalWorkPublisherServices();
  return { ...createGlobalMeshQuery({ globalMeshPaths, openGlobalWorkProjectionStore, queryGlobalWorkProjection, globalStoreError, workspaceIdFor, queryGlobalRegistry, MESH_GLOBAL_DISABLED_CODE, resolveCacheStalenessSeconds }), workspaceIdForProjectRoot: workspaceIdFor };
}

export function meshTerminalRelayBridgeServices() {
  return createTerminalRelayBridge({ reportDegrade });
}

// The worker stream client. Recovery-push and resync frames are mesh's own, over the mesh's projection store;
// the worktree branch namer is never reached.
export function workerStreamClientServices() {
  const { buildTerminalFrameEnvelope, buildTerminalEndEnvelope, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND } = meshTerminalRelayBridgeServices();
  const loadProjectionStore = async () => globalWorkStoreServices();
  const { RECOVERY_PUSH_KIND, buildRecoveryPushResultFrame } = createRecoveryPush({ meshItemBranchName: unreached("recovery push", "meshItemBranchName"), loadProjectionStore });
  const { RESYNC_KIND, buildResyncResultFrame } = createMeshResync({ loadProjectionStore });
  return createWorkerStreamServices({ buildTerminalFrameEnvelope, buildTerminalEndEnvelope, TERMINAL_INPUT_KIND, TERMINAL_RESUME_KIND, RECOVERY_PUSH_KIND, buildRecoveryPushResultFrame, RESYNC_KIND, buildResyncResultFrame, reportDegrade, EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND });
}

export function meshTerminalMirrorServices() {
  const { DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes } = meshRelayServices().relay;
  const { TERMINAL_FRAME_KIND, loopbackRelayUrl } = meshTerminalRelayBridgeServices();
  const { backoffDelaySeconds } = workerStreamClientServices();
  return createTerminalMirroring({ DEFAULT_MAX_FRAME_BYTES, resolveMaxFrameBytes, TERMINAL_FRAME_KIND, loopbackRelayUrl, backoffDelaySeconds, reportDegrade });
}

// The control stream server. The effects journal, dispatch and assignment transitions are @aof/effects' and
// core's; the frames these suites send (snapshot, presence, terminal, directive) never reach them.
export function controlStreamServerServices() {
  const { openGlobalWorkProjectionStore, upsertWorkItems, upsertWorkItemContent, appendNodeLogEntries } = globalWorkStoreServices();
  const { redactDescriptor } = globalNodeRegistryServices();
  const { publishPresenceRecord } = meshPresenceServices();
  const { TERMINAL_FRAME_KIND } = meshTerminalRelayBridgeServices();
  const loadProjectionStore = async () => globalWorkStoreServices();
  const { RECOVERY_PUSH_RESULT_KIND, applyRecoveryPushResultFrame } = createRecoveryPush({ meshItemBranchName: unreached("recovery push", "meshItemBranchName"), loadProjectionStore });
  const { RESYNC_RESULT_KIND, applyResyncResultFrame } = createMeshResync({ loadProjectionStore });
  const owner = "the control stream server";
  return createControlStreamServices({
    openGlobalWorkProjectionStore, upsertWorkItems, upsertWorkItemContent, appendNodeLogEntries, redactDescriptor, publishPresenceRecord,
    transitionAssignmentState: unreached(owner, "transitionAssignmentState"), effectsFor: unreached(owner, "effectsFor"), openEffectsJournal: unreached(owner, "openEffectsJournal"),
    appendEvent: unreached(owner, "appendEvent"), markStep: unreached(owner, "markStep"), readEventSteps: unreached(owner, "readEventSteps"), drainEffects: unreached(owner, "drainEffects"), CONTROL_LOCI: unreachedValue(owner, "CONTROL_LOCI"),
    EFFECT_STEP_FRAME_KIND, EFFECT_ACK_FRAME_KIND, TERMINAL_FRAME_KIND, PRESENCE_SIGNAL_KIND, RECOVERY_PUSH_RESULT_KIND, applyRecoveryPushResultFrame, RESYNC_RESULT_KIND, applyResyncResultFrame, reportDegrade,
  });
}

// The fleet UI server over the mesh's own status query and terminal mirror, with the fixture workspace loader.
// The board, assignment, loop-stop and provider routes are never reached; the dist is always the suite's own.
export function meshUiServeServices() {
  const { queryGlobalMeshStatus, workspaceIdForProjectRoot } = globalMeshQueryServices();
  const { createTerminalMirror } = meshTerminalMirrorServices();
  const { buildTerminalInputEnvelope } = meshTerminalRelayBridgeServices();
  const owner = "the fleet UI server";
  return createMeshUiServer({
    assetPath: unreached(owner, "assetPath"), serveBoard: unreached(owner, "serveBoard"), queryGlobalMeshStatus, workspaceIdForProjectRoot, resolveCacheStalenessSeconds,
    loadWorkspace: loadFixtureWorkspace, assignWork: unreached(owner, "assignWork"), STOP_REFUSALS: unreachedValue(owner, "STOP_REFUSALS"), stopLoop: unreached(owner, "stopLoop"), createTerminalMirror, buildTerminalInputEnvelope,
    PROVIDER_IDS: unreachedValue(owner, "PROVIDER_IDS"), reportDegrade,
  });
}

// The launcher's pure resolvers. Every runtime collaborator of the launcher is refused.
export function meshLauncherServices() {
  const provided = { globalMeshPaths, reportDegrade };
  return createMeshLauncher(new Proxy(provided, { get: (target, key) => (key in target ? target[key] : unreached("the mesh launcher", String(key))) }));
}
