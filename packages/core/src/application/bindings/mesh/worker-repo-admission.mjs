// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createWorkerRepoAdmission } from "@aof/mesh/worker-repo-admission";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import * as api0 from "@aof/mesh/worker-repo-admission";

export function assembleMeshWorkerRepoAdmission({ workServices, workspaceServices, globalWorkStoreServices }) {
  // Core composition for mesh-owned runtime services.

  const { loadWorkspace } = workServices;
  const { globalMeshPaths } = workspaceServices;
  const { openGlobalWorkProjectionStore } = globalWorkStoreServices;

  const { workerHasRepo, meshCheckoutsRoot, meshCheckoutPath, isUnderMeshCheckoutsRoot, buildAskpassShim, redactCredentialFromText, cloneRepoForWorkspace, pinWorkspaceIdInCheckout, admitWorkspaceRepo, resolveScopedCheckout } = createWorkerRepoAdmission({ loadWorkspace, globalMeshPaths, openGlobalWorkProjectionStore, resolveWorkspaceId });

  return { workerHasRepo, meshCheckoutsRoot, meshCheckoutPath, isUnderMeshCheckoutsRoot, buildAskpassShim, redactCredentialFromText, cloneRepoForWorkspace, pinWorkspaceIdInCheckout, admitWorkspaceRepo, resolveScopedCheckout, "resolveCloneUrl": api0.resolveCloneUrl, "parseRepoFromCloneUrl": api0.parseRepoFromCloneUrl };
}
