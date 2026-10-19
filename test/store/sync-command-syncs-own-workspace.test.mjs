// Traceability wiring for milestone 164 / story 00 (a local change is noticed and owed):
//   .../00_story_a-local-change-is-noticed-and-owed/tasks/02_every-command-syncs-its-own-workspace.feature (@executable)
//   .../00_story_a-local-change-is-noticed-and-owed/tasks/03_a-linked-worktree-never-publishes-over-its-repository.feature (@executable @bug)
//
// 164/ADR-004 driver 3: every aof command runs the sync pass for the workspace it runs in, just
// before the face drains what the journal owes. These cases spawn the REAL CLI, with no mesh
// daemon, against an isolated global home, and read the two stores the pass writes (the
// projection and the effects journal) at the source.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { spawnCliSync } from "../support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n\n## User story\n\nAs the operator.\n`;
}

async function writeStory(root, status) {
  const dir = path.join(root, "wiki", "work", "164_milestone_sync", "stories", "00_story_noticed");
  await mkdir(path.join(dir, "tasks"), { recursive: true });
  await writeFile(path.join(dir, "STORY.md"), frontmatter({ type: "story", number: "00", slug: "noticed", parent: "164", status, title: "Noticed", schema: 1 }), "utf8");
}

async function writeWorkspace(root, { mesh }) {
  const milestone = path.join(root, "wiki", "work", "164_milestone_sync");
  await mkdir(milestone, { recursive: true });
  await writeFile(path.join(milestone, "SPEC.md"), frontmatter({ type: "milestone", number: "164", slug: "sync", status: "in-progress", title: "Sync", schema: 1 }), "utf8");
  await writeStory(root, "not-started");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const config = { name: "sync-fixture", work: { dir: "./wiki/work" }, ...(mesh ? { mesh: { enabled: true, nodeId: "node-7297" } } : {}) };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function withHome(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-sync-cli-")));
  const home = path.join(tmp, "home");
  await mkdir(home, { recursive: true });
  try {
    return await body({ tmp, home });
  } finally {
    await rm(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

// The command's environment: the isolated home and nothing a driving shell or session leaked.
function aof(cwd, home, args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(AOF_|CLAUDE)/.test(key)));
  const result = spawnCliSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", env: { ...env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" } });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function query(home, file, sql, ...params) {
  const databasePath = path.join(home, "mesh", "work", file);
  if (!existsSync(databasePath)) return [];
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(sql.match(/FROM (\w+)/)[1]);
    return exists ? db.prepare(sql).all(...params) : [];
  } finally {
    db.close();
  }
}

const storyRow = (home) => query(home, "projection.sqlite", "SELECT status, node_id AS nodeId FROM work_items WHERE ref = ?", "164/00")[0] ?? null;
const marks = (home) => query(home, "journal.sqlite", "SELECT event_id AS eventId FROM events WHERE name = ?", "workspace.changed");

export const syncCommandSyncsOwnWorkspaceTests = [
  {
    name: "164/00 E12 · a hand edit reaches the store on the next command, with no daemon",
    async run() {
      await withHome(async ({ tmp, home }) => {
        const root = path.join(tmp, "aof");
        await writeWorkspace(root, { mesh: true });
        assert.equal(aof(root, home, ["work", "list"]).status, 0, "published and observed once");
        assert.equal(storyRow(home)?.status, "not-started");
        await writeStory(root, "in-progress");
        const listed = aof(root, home, ["work", "list"]);
        assert.equal(listed.status, 0, listed.stderr);
        assert.match(listed.stdout, /164\/00/, "the list is printed");
        assert.deepEqual({ ...storyRow(home) }, { status: "in-progress", nodeId: "node-7297" });
      });
    },
  },
  {
    name: "164/00 E13 · no pass runs where the workspace does not propagate — a workspace with no mesh.enabled and no mesh.repo.published",
    async run() {
      await withHome(async ({ tmp, home }) => {
        const root = path.join(tmp, "plain");
        await writeWorkspace(root, { mesh: false });
        await writeStory(root, "in-progress");
        assert.equal(aof(root, home, ["work", "list"]).status, 0);
        assert.deepEqual(marks(home), [], "no workspace.changed event is appended");
        assert.equal(storyRow(home), null, "nothing is written to the store for it");
      });
    },
  },
  {
    name: "164/00 E13 · no pass runs where the workspace does not propagate — a dispatch lane worktree of a mesh-propagating workspace",
    async run() {
      await withHome(async ({ tmp, home }) => {
        const root = path.join(tmp, "aof");
        await writeWorkspace(root, { mesh: true });
        const lane = path.join(root, ".aof", "mesh", "dispatch-worktrees", "164-00");
        await writeWorkspace(lane, { mesh: true });
        await writeStory(lane, "in-progress");
        assert.equal(aof(lane, home, ["work", "list"]).status, 0);
        assert.deepEqual(marks(home), [], "no workspace.changed event is appended");
        assert.equal(storyRow(home), null, "nothing is written to the store for it");
      });
    },
  },
  {
    name: "164/00 E14 · a failing pass changes nothing about the command's own result",
    async run() {
      await withHome(async ({ tmp, home }) => {
        const root = path.join(tmp, "aof");
        await writeWorkspace(root, { mesh: true });
        // The global store cannot be opened: its file's path is a directory.
        await mkdir(path.join(home, "mesh", "work", "projection.sqlite"), { recursive: true });
        await writeStory(root, "in-progress");
        const listed = aof(root, home, ["work", "list", "--json"]);
        assert.equal(listed.status, 0, listed.stderr);
        const document = JSON.parse(listed.stdout); // stdout is exactly the list's one JSON document
        assert.ok(Array.isArray(document) ? document.length > 0 : document != null);
        const degrades = (await readFile(path.join(home, "mesh", "logs", "degrade.log"), "utf8")).trim().split(/\r?\n/).map((line) => JSON.parse(line));
        assert.ok(degrades.some((event) => event.code === "sync-pass"), `a degrade is reported for the sync pass: ${JSON.stringify(degrades.map((event) => event.code))}`);
      });
    },
  },

  // ================================ task 03 · R5 — a linked worktree never publishes (F-06)
  {
    name: "164/00 E15 · a command in a linked worktree of the repository publishes nothing",
    async run() {
      await withRepositoryAndWorktree(async ({ home, root, worktree }) => {
        assert.equal(aof(root, home, ["work", "list"]).status, 0, "the repository's checkout synced once");
        assert.equal(storyRow(home)?.status, "not-started");
        const before = marks(home).length;
        const listed = aof(worktree, home, ["work", "list"]);
        assert.equal(listed.status, 0, listed.stderr);
        assert.equal(storyRow(home)?.status, "not-started", "the worktree's edit did not reach the store");
        assert.deepEqual(projectRoots(home), [root], "the workspace's project root is still the repository's checkout");
        assert.equal(marks(home).length, before, "no workspace.changed event was appended for the worktree");
      });
    },
  },
  {
    name: "164/00 E16 · the repository's own checkout still syncs after a linked worktree ran a command",
    async run() {
      await withRepositoryAndWorktree(async ({ home, root, worktree }) => {
        assert.equal(aof(root, home, ["work", "list"]).status, 0);
        assert.equal(aof(worktree, home, ["work", "list"]).status, 0);
        await writeStory(root, "in-review");
        assert.equal(aof(root, home, ["work", "list"]).status, 0);
        assert.equal(storyRow(home)?.status, "in-review");
      });
    },
  },
];

const projectRoots = (home) => query(home, "projection.sqlite", "SELECT project_root AS root FROM workspaces").map(({ root }) => root);

function git(cwd, args) {
  const result = spawnCliSync("git", ["-c", "user.name=aof-test", "-c", "user.email=aof-test@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
}

// A mesh-published repository (its config pins the workspaceId, as a real one does, so a linked
// worktree of it carries the same id) and a linked `git worktree` of it, where 164/00 is edited.
async function withRepositoryAndWorktree(body) {
  await withHome(async ({ tmp, home }) => {
    const root = path.join(tmp, "repo");
    await writeWorkspace(root, { mesh: true });
    const configPath = path.join(root, ".aof", "aof.config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    await writeFile(configPath, `${JSON.stringify({ ...config, mesh: { ...config.mesh, workspaceId: "ws-linked-worktree" } }, null, 2)}\n`, "utf8");
    git(root, ["init", "-q", "-b", "main"]);
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", "fixture"]);
    const worktree = path.join(tmp, "repo-sibling");
    git(root, ["worktree", "add", "-q", "-b", "sibling", worktree]);
    assert.match(await readFile(path.join(worktree, ".git"), "utf8"), /^gitdir: .*worktrees/mu, "the sibling is a linked worktree (non-vacuous)");
    await writeStory(worktree, "in-progress");
    return await body({ home, root, worktree });
  });
}
