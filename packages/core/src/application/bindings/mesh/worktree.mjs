// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshWorktrees } from "@aof/mesh/worktrees";

export function assembleMeshWorktree({ degradeServices, workServices, provideWorkToolchain }) {
  // Core composition; mesh owns policy and execution owns Git mechanisms.

  const { reportDegrade } = degradeServices;
  const { loadWorkspace } = workServices;

  const worktrees = createMeshWorktrees({
    reportDegrade,
    loadWorkspace,
    toolchain: () => provideWorkToolchain(),
  });
  const {
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

  return { DEFAULT_WORKTREE_RETENTION_MS, WORKTREE_PREPARE_DEADLINE_EXPIRED, WORKTREE_PREPARE_FAILED, WORKTREE_PREPARE_NOT_STARTED, addDispatchWorktree, addSessionWorktree, addWorktree, adoptRemoteBranch, advanceBranchToBase, commitWorktreeChanges, defaultGitExec, dispatchWorktreeSlug, ensureCommitAvailable, findItemWorktree, headCommit, isInsideMeshWorktree, isUnderMeshDispatchWorktreesRoot, isUnderMeshSessionWorktreesRoot, isUnderMeshWorktreesRoot, listWorktrees, localBranchExists, meshDispatchWorktreePath, meshDispatchWorktreesRoot, meshIdentityArgs, meshItemBranchName, meshSessionWorktreePath, meshSessionWorktreesRoot, meshWorktreePath, meshWorktreesRoot, parsePorcelainStatus, remoteBranchExists, removeDispatchWorktree, removeWorktree, resolveExec, reuseWorktreeOnBranch, sessionWorktreeSlug, sweepRetainedWorktrees };
}
