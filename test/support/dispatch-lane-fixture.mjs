// test/support/dispatch-lane-fixture.mjs — a REAL git repo with a REAL work stream, for
// story 65 / task 02's lane scenarios.
//
// WHY A REAL REPO AND NOT AN EXEC DOUBLE. Every claim this task makes is a claim about what
// `git worktree` actually does: that two lanes cannot see each other's edits, that a branch
// can be checked out in at most one tree (which is what makes the racing-dispatchers
// scenario resolve rather than fork), that `git worktree remove` clears the admin metadata a
// bare `rm` leaves behind, and that `git branch -d` refuses an unmerged line. A scripted
// double would assert the fixture's opinion of git, which is exactly the shape of test that
// passes while the feature is broken. This is milestone 35's own resolution for tasks 00/03
// (RESEARCH.md §4/§5) reused for the same reason.
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";

// git(args, cwd) — argv form only, never a shell string (mesh-worktree.mjs's discipline).
export function git(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, windowsHide: true }, (error, stdout, stderr) => {
      if (error && (error.code === "ENOENT" || error.killed || error.signal)) reject(error);
      else resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), status: error ? (typeof error.code === "number" ? error.code : 1) : 0 });
    });
  });
}

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`).join("\n")}\n---\n`;
}

// withDispatchRepo(body, { stories, shared }) — an initialised git repo carrying milestone
// 53 with `stories` (each not-started), a committed `.aof/aof.config.json`, and — when
// `shared` is given — a committed source file BOTH lanes will edit (the vvw-352 overlap,
// reconstructed).
export async function withDispatchRepo(body, { stories = ["00", "01"], shared = null, config = {} } = {}) {
  // realpath: macOS's tmpdir is a symlink, and `git worktree list --porcelain` reports
  // resolved paths — an unresolved fixture root makes every prefix-child check a false red.
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-dispatch-")));
  try {
    await git(["init", "-b", "main"], root);
    await git(["config", "user.email", "fixture@aof.test"], root);
    await git(["config", "user.name", "aof fixture"], root);

    const workDir = path.join(root, "wiki", "work");
    const milestoneDir = path.join(workDir, "53_milestone_dispatch");
    await mkdir(milestoneDir, { recursive: true });
    await writeFile(path.join(milestoneDir, "SPEC.md"), frontmatter({
      type: "milestone", number: "53", slug: "dispatch", status: "in-progress",
      title: '"Dispatch"', created: "2026-08-01", updated: "2026-08-01", schema: 1,
    }), "utf8");
    for (const story of stories) {
      const number = typeof story === "string" ? story : story.number;
      const status = typeof story === "string" ? "not-started" : (story.status ?? "not-started");
      const dir = path.join(milestoneDir, "stories", `${number}_story_s${number}`);
      await mkdir(path.join(dir, "tasks"), { recursive: true });
      await writeFile(path.join(dir, "STORY.md"), frontmatter({
        type: "story", number, slug: `s${number}`, parent: "53", status,
        title: `"Story ${number}"`, created: "2026-08-01", updated: "2026-08-01", schema: 1,
        ...(typeof story === "object" && story.depends ? { depends: story.depends } : {}),
      }), "utf8");
    }

    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(
      path.join(root, ".aof", "aof.config.json"),
      `${JSON.stringify({ name: "dispatch-fixture", work: { dir: "./wiki/work", ...config }, ...(config.mesh ? { mesh: config.mesh } : {}) }, null, 2)}\n`,
      "utf8",
    );
    if (shared != null) {
      await mkdir(path.dirname(path.join(root, shared.path)), { recursive: true });
      await writeFile(path.join(root, shared.path), shared.body ?? "// the file both stories edit\n", "utf8");
    }
    // `.aof/mesh/` is runtime state on a real node; ignore it here so a materialised lane
    // never shows up as an uncommitted change of the ORIGIN tree (which is the very thing
    // "the operator's main working tree is untouched" asserts).
    await writeFile(path.join(root, ".gitignore"), ".aof/mesh/\n", "utf8");

    await git(["add", "-A"], root);
    await git(["commit", "-m", "fixture: the stream"], root);
    return await body({ root, workDir, milestoneDir });
  } finally {
    // maxRetries 5 at the default 100ms retryDelay is 500ms of patience, and that is a
    // WALL-CLOCK ASSUMPTION about how fast Windows releases a handle after the process
    // holding it has already exited. Measured 2026-08-24 (VERIFICATION F-69-V22): under a
    // saturated machine — 14 concurrent workers against 6 CPU burners — ten of eleven
    // failures in this suite's process-spawning scenarios were `EBUSY: rmdir` in exactly
    // this teardown, never an assertion. The children HAD exited (`Promise.all` on their
    // `exit` events resolved first); the handles simply had not been reaped yet.
    // 2s of retrying costs nothing on a healthy run and removes the whole class.
    await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

// dirtyPaths(cwd) — `git status --porcelain` as a path list, for "the operator's main
// working tree is untouched" and "the sweep never removes a tree holding uncommitted work".
export async function dirtyPaths(cwd) {
  const result = await git(["status", "--porcelain"], cwd);
  return String(result.stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
