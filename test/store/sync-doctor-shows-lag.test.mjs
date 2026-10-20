import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
// Traceability wiring for milestone 164 / story 03 (owed sync never gives up and shows its lag):
//   .../03_story_owed-sync-never-gives-up-and-shows-its-lag/tasks/01_doctor-shows-the-sync-lag.feature (@executable)
//
// `aof work doctor` states each workspace's sync: what is owed and for how long, after how many
// attempts and why, when it last synced, and how many of this workspace's records changed since
// (164/03 Q1). The facts are seeded where production keeps them — the effects journal's owed
// `publish-projection` steps and this node's observation baseline — under an isolated home. The
// result is read through the command in-process; the text report and `validate`'s exit code
// through the real CLI.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../support/cli-spawn.mjs";

const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const invoke = _aofApplication.invoke;
const syncWorkspace = _aofApplication.mesh.globalWorkPublisher.syncWorkspace;
const openGlobalWorkProjectionStore = _aofApplication.mesh.store.openGlobalWorkProjectionStore;
const openEffectsJournal = _aofApplication.effects.journal.openEffectsJournal;
const appendEvent = _aofApplication.effects.journal.appendEvent;
const markStep = _aofApplication.effects.journal.markStep;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const NODE = "node-7297";
const AOF = { id: "ws-aof", dir: "aof", milestone: "164", story: "00" };
const TEST_REPO = { id: "ws-aof-test-repo", dir: "aof-test-repo", milestone: "01", story: "00" };

const frontmatter = (fields) => `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n`;

async function writeRecords(root, workspace, { milestoneStatus = "in-progress", storyStatus = "not-started" } = {}) {
  const milestone = path.join(root, "wiki", "work", `${workspace.milestone}_milestone_m${workspace.milestone}`);
  const story = path.join(milestone, "stories", `${workspace.story}_story_s${workspace.story}`);
  await mkdir(path.join(story, "tasks"), { recursive: true });
  await writeFile(path.join(milestone, "SPEC.md"), frontmatter({ type: "milestone", number: workspace.milestone, slug: `m${workspace.milestone}`, status: milestoneStatus, title: `Milestone ${workspace.milestone}`, created: "2026-10-01", updated: "2026-10-01", schema: 1 }), "utf8");
  await writeFile(path.join(story, "STORY.md"), frontmatter({ type: "story", number: workspace.story, slug: `s${workspace.story}`, parent: workspace.milestone, status: storyStatus, title: `Story ${workspace.story}`, created: "2026-10-01", updated: "2026-10-01", schema: 1 }), "utf8");
}

// Two mesh-propagating workspaces, registered under their names, each observed once by the sync pass.
async function withTwoWorkspaces(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-sync-doctor-")));
  const home = path.join(tmp, "home");
  const env = { AOF_GLOBAL_HOME: home };
  const prior = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    const fx = { tmp, home, env, roots: {}, workspaces: {} };
    for (const workspace of [AOF, TEST_REPO]) {
      const root = path.join(tmp, workspace.dir);
      await writeRecords(root, workspace);
      await mkdir(path.join(root, ".aof"), { recursive: true });
      await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: workspace.dir, work: { dir: "./wiki/work" }, mesh: { enabled: true, nodeId: NODE, workspaceId: workspace.id } }, null, 2)}\n`, "utf8");
      fx.roots[workspace.id] = root;
      fx.workspaces[workspace.id] = await loadWorkspace(root, undefined, { env });
      await syncWorkspace(fx.workspaces[workspace.id], { globalWorkStoreOptions: { env }, journalOptions: { env } });
    }
    return await body(fx);
  } finally {
    if (prior === undefined) delete process.env.AOF_GLOBAL_HOME; else process.env.AOF_GLOBAL_HOME = prior;
    await rm(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

async function withStoreDb(fx, body) {
  const store = await openGlobalWorkProjectionStore({ env: fx.env });
  try { return await body(store.db); } finally { store.close(); }
}

// Every observation of a workspace on this node was last written at `at`.
const lastSynced = (fx, workspace, at) => withStoreDb(fx, (db) => db.prepare("UPDATE work_item_observations SET observed_at = ? WHERE workspace_id = ? AND node_id = ?").run(at, workspace.id, NODE));

// An owed sync for `workspace` that has failed `attempts` times since `ago` with `error`.
async function failingSync(fx, workspace, { attempts, agoMs, error }) {
  const journal = await openEffectsJournal({ env: fx.env });
  try {
    const now = new Date(Date.now() - agoMs).toISOString();
    appendEvent(journal, { eventId: `owed-${workspace.id}`, name: "workspace.changed", payload: { workspaceRoot: fx.roots[workspace.id], workspaceId: workspace.id, digest: "d-owed" }, now, collapseKey: `ws:${workspace.id}` }, [{ key: "publish-projection", locus: "local" }]);
    for (let attempt = 0; attempt < attempts; attempt += 1) markStep(journal, `owed-${workspace.id}`, "publish-projection", { status: "failed", error, now: new Date().toISOString() });
  } finally {
    journal.close();
  }
}

const doctorIn = (fx, workspace) => invoke("work:doctor", {}, { workspace: fx.workspaces[workspace.id], globalWorkStoreOptions: { env: fx.env }, effectsJournalOptions: { env: fx.env } });
const entryFor = (result, workspace) => (result.sync ?? []).find((entry) => entry.workspaceId === workspace.id);
const codes = (result, code) => result.findings.filter((finding) => finding.code === code);

function aofCli(fx, workspace, args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(AOF_|CLAUDE)/.test(key)));
  const result = spawnCliSync(process.execPath, [CLI, ...args], { cwd: fx.roots[workspace.id], encoding: "utf8", env: { ...env, AOF_GLOBAL_HOME: fx.home, NODE_NO_WARNINGS: "1" } });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export const syncDoctorShowsLagTests = [
  {
    name: "164/03 E4 · a failing owed sync is shown with its age, attempts and error, and warns",
    run: () => withTwoWorkspaces(async (fx) => {
      await failingSync(fx, AOF, { attempts: 7, agoMs: 40 * 60_000, error: "database is locked" });
      const result = await doctorIn(fx, AOF);
      const entry = entryFor(result, AOF);
      assert.equal(entry?.owed, true, "the sync block for aof says its sync is owed");
      assert.equal(Math.round(entry.owedForMs / 60_000), 40, "…for 40 minutes");
      assert.equal(entry.attempts, 7, "…after 7 attempts");
      assert.equal(entry.lastError, "database is locked");
      const failing = codes(result, "sync-failing");
      assert.equal(failing.length, 1);
      assert.equal(failing[0].severity, "warn");
      assert.match(failing[0].message, /^aof:/, "the finding names aof");
    }),
  },
  {
    name: "164/03 E5 · with everything in sync, each workspace shows its last sync and no finding",
    run: () => withTwoWorkspaces(async (fx) => {
      await lastSynced(fx, AOF, "2026-10-19T09:00:00.000Z");
      await lastSynced(fx, TEST_REPO, "2026-10-19T08:30:00.000Z");
      const result = await doctorIn(fx, AOF);
      assert.equal(entryFor(result, AOF)?.lastSyncedAt, "2026-10-19T09:00:00.000Z");
      assert.equal(entryFor(result, TEST_REPO)?.lastSyncedAt, "2026-10-19T08:30:00.000Z");
      assert.ok(result.sync.every((entry) => entry.owed === false), "it says nothing is owed");
      assert.equal(codes(result, "sync-failing").length + codes(result, "sync-behind").length, 0);
    }),
  },
  {
    name: "164/03 E6 · records changed since the last sync are counted and warned on",
    run: () => withTwoWorkspaces(async (fx) => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
      await lastSynced(fx, TEST_REPO, twoHoursAgo);
      await writeRecords(fx.roots[TEST_REPO.id], TEST_REPO, { milestoneStatus: "done", storyStatus: "in-review" }); // two hand edits
      const result = await doctorIn(fx, TEST_REPO);
      const entry = entryFor(result, TEST_REPO);
      assert.equal(entry?.changed, 2, "2 records changed and not yet synced");
      assert.equal(entry.lastSyncedAt, twoHoursAgo, "…last synced 2 hours ago");
      const behind = codes(result, "sync-behind");
      assert.equal(behind.length, 1);
      assert.equal(behind[0].severity, "warn");
      assert.match(behind[0].message, /^aof-test-repo:/, "the finding names aof-test-repo");
    }),
  },
  {
    // Found live on the control node (2026-10-19): two archived imported milestones read "changed"
    // forever, because doctor fingerprinted SPEC.md where the store projects AOF.md.
    name: "164/03 · a milestone whose record doc is an imported AOF.md is judged over the doc the store projects, and reads in sync",
    run: () => withTwoWorkspaces(async (fx) => {
      const milestone = path.join(fx.roots[AOF.id], "wiki", "work", `${AOF.milestone}_milestone_m${AOF.milestone}`);
      await writeFile(path.join(milestone, "AOF.md"), frontmatter({ type: "milestone", number: AOF.milestone, slug: `m${AOF.milestone}`, status: "done", title: "Imported", created: "2026-10-01", updated: "2026-10-01", schema: 1 }), "utf8");
      await syncWorkspace(fx.workspaces[AOF.id], { globalWorkStoreOptions: { env: fx.env }, journalOptions: { env: fx.env } });
      const result = await doctorIn(fx, AOF);
      assert.equal(entryFor(result, AOF)?.changed, 0, "nothing reads as changed after the sync published it");
      assert.equal(codes(result, "sync-behind").length, 0);
    }),
  },
  {
    name: "164/03 · the text report prints one sync line per workspace",
    run: () => withTwoWorkspaces(async (fx) => {
      await failingSync(fx, AOF, { attempts: 7, agoMs: 40 * 60_000, error: "database is locked" });
      const report = aofCli(fx, AOF, ["work", "doctor"]);
      const lines = report.stdout.split(/\r?\n/).filter((line) => line.startsWith("sync: "));
      assert.equal(lines.length, 2, `one sync line for aof and one for aof-test-repo:\n${report.stdout}`);
      const aofLine = lines.find((line) => line.startsWith("sync: aof —"));
      assert.ok(aofLine, "a line for aof");
      for (const part of ["owed", "40m", "7 attempts", "database is locked"]) assert.ok(aofLine.includes(part), `the aof line names "${part}": ${aofLine}`);
      assert.ok(lines.some((line) => line.startsWith("sync: aof-test-repo —")), "a line for aof-test-repo");
    }),
  },
  {
    name: "164/03 · sync findings never fail validate",
    run: () => withTwoWorkspaces(async (fx) => {
      await failingSync(fx, AOF, { attempts: 7, agoMs: 40 * 60_000, error: "database is locked" });
      const validate = aofCli(fx, AOF, ["work", "validate"]);
      assert.equal(validate.status, 0, `${validate.stdout}${validate.stderr}`);
    }),
  },
];
