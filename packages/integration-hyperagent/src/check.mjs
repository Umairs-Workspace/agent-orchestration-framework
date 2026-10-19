// Check a plan branch the AOF Planner pushed — WITHOUT touching the operator's checkout.
//
// Fetch the branch, extract its tip into a temporary directory through a PRIVATE index file
// (`read-tree` + `checkout-index --prefix`, with GIT_INDEX_FILE pointing outside the repository — so
// the operator's index, HEAD, working tree and worktree list are never touched, and nothing is
// registered that would need pruning), run `aof work validate` over that tree (the injected
// `validateAt`), list what the branch changed against its base, and delete the directory whatever
// happened. Files outside the planning lane (anything that is not a work record or
// a planning document) are reported as `outOfLane`: Hyperagent plans and never builds, so a source or
// test file on a plan branch is a finding for the operator, not something to merge silently.
//
// git and validation are INJECTED (core passes @aof/execution's `defaultGitExec` and its own
// validator), so this package spawns nothing of its own.
import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { isSafeBranch } from "./config.mjs";

export function checkError(message, code) {
  return Object.assign(new Error(message), { code });
}

async function git(gitExec, args, cwd, failureCode, env) {
  const result = await gitExec(args, env ? { cwd, env } : { cwd });
  if (result.status !== 0) {
    throw checkError(`git ${args[0]} failed: ${(result.stderr || result.stdout || "").trim()}`, failureCode);
  }
  return result.stdout;
}

// A path a planning step may write: a work record, a planning document, or a PRD at the root.
export function inPlanningLane(file, workDir) {
  const normalized = String(file).replaceAll("\\", "/");
  const work = String(workDir).replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  return normalized.startsWith(`${work}/`)
    || normalized.startsWith("wiki/planning/")
    || /^PRD-[^/]+\.md$/.test(normalized);
}

export async function checkPlanBranch({ projectRoot, branch, base, remote = "origin", workDir, gitExec, validateAt, tmpRoot = os.tmpdir() }) {
  if (!isSafeBranch(branch)) throw checkError(`"${branch}" is not a usable branch name.`, "hyperagent-branch-invalid");
  if (!isSafeBranch(base)) throw checkError(`"${base}" is not a usable base branch.`, "hyperagent-base-invalid");
  if (!/^[A-Za-z0-9._-]+$/.test(remote)) throw checkError(`"${remote}" is not a usable remote name.`, "hyperagent-remote-invalid");

  const remoteRef = `${remote}/${branch}`;
  await git(gitExec, ["fetch", "--no-tags", remote, `+refs/heads/${branch}:refs/remotes/${remoteRef}`], projectRoot, "hyperagent-fetch-failed");
  await git(gitExec, ["fetch", "--no-tags", remote, `+refs/heads/${base}:refs/remotes/${remote}/${base}`], projectRoot, "hyperagent-fetch-failed");
  const commit = (await git(gitExec, ["rev-parse", "--verify", `refs/remotes/${remoteRef}^{commit}`], projectRoot, "hyperagent-branch-missing")).trim();
  const changed = (await git(gitExec, ["diff", "--name-only", `refs/remotes/${remote}/${base}...refs/remotes/${remoteRef}`], projectRoot, "hyperagent-diff-failed"))
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const scratch = await mkdtemp(path.join(tmpRoot, "aof-hyperplan-"));
  const tree = path.join(scratch, "tree");
  const env = { ...process.env, GIT_INDEX_FILE: path.join(scratch, "index") };
  try {
    await git(gitExec, ["read-tree", commit], projectRoot, "hyperagent-extract-failed", env);
    await git(gitExec, ["checkout-index", "--all", "--force", `--prefix=${tree}${path.sep}`], projectRoot, "hyperagent-extract-failed", env);
    const findings = await validateAt(tree);
    return {
      branch,
      base,
      commit,
      changed,
      outOfLane: changed.filter((file) => !inPlanningLane(file, workDir)),
      findings: findings.map((finding) => ({
        path: path.relative(tree, finding.path).replaceAll("\\", "/") || ".",
        problem: finding.problem
      })),
      pass: findings.length === 0
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
