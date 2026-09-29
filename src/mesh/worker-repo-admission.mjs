// Transitional core composition for mesh-owned runtime services.
import { createWorkerRepoAdmission } from "@aof/mesh/worker-repo-admission";
import { loadWorkspace } from "../work.mjs";
import { globalMeshPaths } from "../workspace.mjs";
import { openGlobalWorkProjectionStore } from "../global-work-store.mjs";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";


export const { workerHasRepo, meshCheckoutsRoot, meshCheckoutPath, isUnderMeshCheckoutsRoot, buildAskpassShim, redactCredentialFromText, cloneRepoForWorkspace, pinWorkspaceIdInCheckout, admitWorkspaceRepo, resolveScopedCheckout } = createWorkerRepoAdmission({ loadWorkspace, globalMeshPaths, openGlobalWorkProjectionStore, resolveWorkspaceId });

export { resolveCloneUrl, parseRepoFromCloneUrl } from "@aof/mesh/worker-repo-admission";
