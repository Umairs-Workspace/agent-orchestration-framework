// Compatibility entry; construction belongs to core application assembly.
import { meshWorkerRepoAdmission } from "../application/default.mjs";
export const {
  workerHasRepo,
  meshCheckoutsRoot,
  meshCheckoutPath,
  isUnderMeshCheckoutsRoot,
  buildAskpassShim,
  redactCredentialFromText,
  cloneRepoForWorkspace,
  pinWorkspaceIdInCheckout,
  admitWorkspaceRepo,
  resolveScopedCheckout,
  resolveCloneUrl,
  parseRepoFromCloneUrl,
} = meshWorkerRepoAdmission;
