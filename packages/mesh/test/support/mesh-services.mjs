// The mesh package's own services, built from its public factories — what a mesh suite uses instead of
// reaching `@aof/mesh` through the assembled application. The one collaborator the package does not own is
// core's path policy; it is reduced here to what the mesh reads (the global mesh root under AOF_GLOBAL_HOME),
// and it REFUSES to fall back to the real home, so a suite run outside the isolated runner cannot write there.
import path from "node:path";
import { createMeshLauncherLock } from "@aof/mesh/launcher-lock";
import { createMeshRegistry } from "@aof/mesh/registry";
import { createMeshRelay } from "@aof/mesh/relay";
import { createMeshStore } from "@aof/mesh/store";

export function globalMeshPaths(options = {}) {
  const home = (options.env ?? process.env).AOF_GLOBAL_HOME;
  if (!home) throw new Error("mesh test services need AOF_GLOBAL_HOME (run through the isolated runner)");
  return { meshRoot: path.join(path.resolve(home), "mesh") };
}

export const reportDegrade = () => {};

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
