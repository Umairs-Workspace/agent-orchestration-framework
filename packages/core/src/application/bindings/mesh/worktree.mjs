import { executionRuntimes } from "@aof/contracts/loop-bounds";
// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createMeshWorktrees } from "@aof/mesh/worktrees";
import { prepareCodexWorktree } from "../../../codex-settings.mjs";

export function assembleMeshWorktree({ degradeServices, workServices, provideWorkToolchain }) {
  // Core composition; mesh owns policy and execution owns Git mechanisms.

  const { reportDegrade } = degradeServices;
  const { loadWorkspace } = workServices;

  const worktrees = createMeshWorktrees({
    prepareRuntimeAssets: (projectRoot, worktree, execution) => executionRuntimes(execution).includes("codex") ? prepareCodexWorktree(projectRoot, worktree) : undefined,
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
