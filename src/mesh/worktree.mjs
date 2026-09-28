// Transitional core composition; mesh owns policy and execution owns Git mechanisms.
import { createMeshWorktrees } from "@aof/mesh/worktrees";
import { reportDegrade } from "../degrade.mjs";
import { loadWorkspace } from "../work.mjs";

const worktrees = createMeshWorktrees({
  reportDegrade,
  loadWorkspace,
  toolchain: () => import("../work/toolchain.mjs"),
});
export const {
  DEFAULT_WORKTREE_RETENTION_MS,
  WORKTREE_PREPARE_DEADLINE_EXPIRED,
  WORKTREE_PREPARE_FAILED,
  WORKTREE_PREPARE_NOT_STARTED,
  addDispatchWorktree,
  addSessionWorktree,
  addWorktree,
  adoptRemoteBranch,
  advanceBranchToBase,
  commitWorktreeChanges,
  defaultGitExec,
  dispatchWorktreeSlug,
  ensureCommitAvailable,
  findItemWorktree,
  headCommit,
  isInsideMeshWorktree,
  isUnderMeshDispatchWorktreesRoot,
  isUnderMeshSessionWorktreesRoot,
  isUnderMeshWorktreesRoot,
  listWorktrees,
  localBranchExists,
  meshDispatchWorktreePath,
  meshDispatchWorktreesRoot,
  meshIdentityArgs,
  meshItemBranchName,
  meshSessionWorktreePath,
  meshSessionWorktreesRoot,
  meshWorktreePath,
  meshWorktreesRoot,
  parsePorcelainStatus,
  remoteBranchExists,
  removeDispatchWorktree,
  removeWorktree,
  resolveExec,
  reuseWorktreeOnBranch,
  sessionWorktreeSlug,
  sweepRetainedWorktrees,
} = worktrees;
