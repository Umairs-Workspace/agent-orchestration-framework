import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
// Story 163 — `aof work questions`, the read side of `aof work answer`. Every case drives the REAL
// registry over temp fixture repos and an isolated aof home: real ask files, real run records (in
// the primary checkout and in a dispatch lane), real workspace descriptors and a real mesh store.
// The clock is injected (`now`), never read.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleAssignmentRecord, insertAssignment, updateAssignmentState } from "@aof/mesh/assignment-record";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import { stripComments } from "../support/source-slice.mjs";

const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const invoke = _aofApplication.invoke;
const getCommand = _aofApplication.getCommand;
const loopAsksDir = _aofApplication.loop.askRequest.loopAsksDir;
const askRequestPath = _aofApplication.loop.askRequest.askRequestPath;
const standingAsk = _aofApplication.loop.ask.standingAsk;
const meshDispatchWorktreePath = _aofApplication.mesh.worktree.meshDispatchWorktreePath;
const openGlobalWorkProjectionStore = _aofApplication.mesh.store.openGlobalWorkProjectionStore;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(REPO_ROOT, "packages", "core", "bin", "aof.mjs");
const NOW = "2026-10-17T14:32:00Z";
const RUN_A = "20261017T090000000Z-0000";
const RUN_B = "20261017T110000000Z-0000";
const RUN_L = "20261017T120000000Z-0000";
const QUESTIONS_ROW_KEYS = ["ref", "runId", "phase", "runtime", "askedAt", "workspace", "state", "question", "choices", "answer"];

// ---- fixtures -------------------------------------------------------------------------------

async function makeRepo(root, { name, workspaceId }) {
  const workDir = path.join(root, "wiki", "work");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(path.join(root, ".aof", "aof.config.json"), JSON.stringify({ name, work: { dir: "./wiki/work" }, mesh: { workspaceId } }, null, 2), "utf8");
  return workDir;
}

async function writeItem(workDir, ref) {
  const [top, child] = ref.split("/");
  let dir;
  if (child == null) {
    dir = path.join(workDir, `${top}_story_s${top}`);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "STORY.md"), `---\ntype: story\nnumber: "${top}"\nslug: s${top}\nstatus: in-progress\ntitle: "Story ${top}"\ncreated: 2026-10-17\nupdated: 2026-10-17\n---\n# ${top}\n`, "utf8");
  } else {
    const milestone = path.join(workDir, `${top}_milestone_m${top}`);
    await mkdir(milestone, { recursive: true });
    await writeFile(path.join(milestone, "SPEC.md"), `---\ntype: milestone\nnumber: "${top}"\nslug: m${top}\nstatus: in-progress\ntitle: "Milestone ${top}"\ncreated: 2026-10-17\nupdated: 2026-10-17\n---\n# ${top}\n`, "utf8");
    dir = path.join(milestone, "stories", `${child}_story_s${child}`);
    await mkdir(path.join(dir, "tasks"), { recursive: true });
    await writeFile(path.join(dir, "STORY.md"), `---\ntype: story\nnumber: "${child}"\nslug: s${child}\nstatus: in-progress\ntitle: "Story ${ref}"\nparent: "${top}"\ncreated: 2026-10-17\nupdated: 2026-10-17\n---\n# ${child}\n`, "utf8");
  }
  return dir;
}

function runRecord(itemRef, runId, { state = "running", heartbeatAt = "2026-10-17T14:31:50.000Z", entries = [] } = {}) {
  return {
    runId, itemRef, state, attempt: 1, outcome: state === "running" ? null : state === "failed" ? "failed" : "done",
    sessionId: `S-${runId}`, brief: {}, createdAt: "2026-10-17T08:00:00.000Z", updatedAt: heartbeatAt,
    failureReason: state === "failed" ? "timeout" : null, heartbeatAt, retryOf: null, reclaimedAt: null,
    node: null, resumeAfter: null, spend: null, asks: entries,
  };
}

async function writeRun(itemDir, record) {
  const file = path.join(itemDir, "runs", `${record.runId}.json`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

// One ask file, written whole in the record's own key order, with any extra keys after.
async function writeAsk(env, fields) {
  const record = {
    runId: null, ref: null, workspaceId: null, loopRunId: null, scope: null, sessionId: null, phase: "build", node: null,
    question: "Which store?", askedAt: "2026-10-17T14:02:00Z", state: "waiting", parkedAt: null, answer: null, answeredAt: null, by: null,
    ...fields,
  };
  const dir = loopAsksDir(env);
  await mkdir(dir, { recursive: true });
  await writeFile(askRequestPath(dir, record.runId), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

async function writeDescriptor(env, { workspaceId, name, projectRoot }) {
  const root = path.join(path.dirname(loopAsksDir(env)), "workspaces");
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, `${workspaceId}.json`), JSON.stringify({ workspaceId, projectRoot, name }, null, 2), "utf8");
}

async function seedWorkerAsk(env, { itemRef, workspaceId, node = "node-9549", ask = null }) {
  const store = await openGlobalWorkProjectionStore({ env });
  try {
    const record = assembleAssignmentRecord({ itemRef, workspaceId, targetNodeId: node, issuer: "control-a", now: "2026-10-17T14:00:00.000Z" });
    insertAssignment(store, record);
    updateAssignmentState(store, record.assignmentId, "running", { now: "2026-10-17T14:05:00.000Z", runId: "worker-run", sessionId: "worker-session", code: "needs-input", ...(ask == null ? {} : { ask }) });
  } finally {
    store.close?.();
  }
}

// A world: an isolated aof home and the "aof" workspace checkout (`wsA`), plus a second
// "acme-core" checkout (`wsB`) for the --all cases.
async function withWorld(body) {
  const base = await mkdtemp(path.join(os.tmpdir(), "aof-questions-"));
  const home = path.join(base, "home");
  const repo = path.join(base, "aof");
  const other = path.join(base, "acme-core");
  const env = { AOF_GLOBAL_HOME: home };
  try {
    const workDir = await makeRepo(repo, { name: "aof", workspaceId: "wsA" });
    const otherWorkDir = await makeRepo(other, { name: "acme-core", workspaceId: "wsB" });
    const ctx = { workspace: await loadWorkspace(repo), globalWorkStoreOptions: { env } };
    return await body({ base, home, env, repo, workDir, other, otherWorkDir, ctx });
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

const questions = (ctx, input = {}) => invoke("work:questions", { now: NOW, ...input }, ctx);
const render = (rows) => getCommand("work:questions").cli.render(rows);
const blockFor = (text, ref) => text.split("\n\n").find((block) => block.startsWith(`${ref} `)) ?? "";

function cli(world, args) {
  const result = spawnCliSync(process.execPath, [CLI, ...args], { cwd: world.repo, encoding: "utf8", env: { ...process.env, AOF_GLOBAL_HOME: world.home, NODE_NO_WARNINGS: "1" } });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

// ---- task 00 — the operator reads every question the loop is waiting on ----------------------

const readsEveryQuestionTests = [
  {
    name: "operator-reads-open-questions/00 E1 · a waiting refine question is printed whole with its answer line",
    run: () => withWorld(async ({ env, workDir, ctx }) => {
      const dir = await writeItem(workDir, "011");
      await writeRun(dir, runRecord("011", RUN_A));
      await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA", phase: "refine", runtime: "claude", askedAt: "2026-10-17T14:02:00Z", question: "Which store owns the cache?\nOptions: A) disk B) memory" });
      const rows = await questions(ctx);
      const text = render(rows);
      assert.equal(rows.length, 1, "one row is printed for 011");
      const block = blockFor(text, "011");
      for (const fact of ["refine", "claude", "2026-10-17T14:02:00Z", "30m"]) assert.ok(block.includes(fact), `the row names ${fact}:\n${block}`);
      assert.ok(block.includes("  Which store owns the cache?\n  Options: A) disk B) memory"), `both lines of the question:\n${block}`);
      assert.ok(block.includes('aof work answer 011 "…"'), "the answer line");
    }),
  },
  {
    name: "operator-reads-open-questions/00 E2 · a codex question's choices are numbered under it",
    run: () => withWorld(async ({ env, workDir, ctx }) => {
      const dir = await writeItem(workDir, "011");
      await writeRun(dir, runRecord("011", RUN_A));
      await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA", runtime: "codex", question: "Where should the cache live?", choices: ["disk", "memory", "both"], questionToken: "q1" });
      const block = blockFor(render(await questions(ctx)), "011");
      const lines = block.split("\n");
      const at = lines.indexOf("  Where should the cache live?");
      assert.ok(at > 0, block);
      assert.deepEqual(lines.slice(at + 1, at + 4), ["  1. disk", "  2. memory", "  3. both"], "numbered under the question");
    }),
  },
  {
    name: "operator-reads-open-questions/00 E3 · a parked question is listed, marked parked, with the loop's resume line",
    run: () => withWorld(async ({ env, workDir, ctx }) => {
      const dir = await writeItem(workDir, "04/02");
      await writeRun(dir, runRecord("04/02", RUN_A));
      await writeAsk(env, { runId: RUN_A, ref: "04/02", workspaceId: "wsA", scope: "04", state: "parked", parkedAt: "2026-10-17T14:20:00Z" });
      const block = blockFor(render(await questions(ctx)), "04/02");
      assert.match(block, /PARKED/u, "marked parked");
      assert.ok(block.includes('aof work answer 04/02 "…"'), "the answer line");
      assert.ok(block.includes("the loop resumes with: aof work loop 04 --resume"), block);
    }),
  },
  {
    name: "operator-reads-open-questions/00 E4 · with nothing waiting the verb prints one line and exits 0",
    run: async () => {
      const rows = [
        ["no ask file", async () => {}],
        ["only asks in the answered state", async ({ env, workDir }) => {
          const dir = await writeItem(workDir, "011");
          await writeRun(dir, runRecord("011", RUN_A));
          await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA", state: "answered", answer: "disk", answeredAt: "2026-10-17T14:10:00Z" });
        }],
        ["only another workspace's waiting asks", async ({ env }) => {
          await writeAsk(env, { runId: RUN_A, ref: "007", workspaceId: "wsB" });
        }],
      ];
      for (const [label, plant] of rows) {
        await withWorld(async (world) => {
          await plant(world);
          const result = cli(world, ["work", "questions"]);
          assert.equal(result.stdout.trim(), "No open questions.", `${label}: ${result.stdout}${result.stderr}`);
          assert.equal(result.status, 0, `${label}: exit 0`);
        });
      }
    },
  },
  {
    name: "operator-reads-open-questions/00 E5 · --json emits one row per open question",
    run: () => withWorld(async ({ env, workDir, ctx }) => {
      const dir = await writeItem(workDir, "011");
      await writeRun(dir, runRecord("011", RUN_A));
      await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA", phase: "refine", runtime: "claude" });
      const parsed = JSON.parse(JSON.stringify(getCommand("work:questions").cli.json(await questions(ctx))));
      assert.ok(Array.isArray(parsed) && parsed.length === 1, "an array of one row");
      for (const key of QUESTIONS_ROW_KEYS) assert.ok(Object.hasOwn(parsed[0], key), `the row carries ${key}`);
      assert.equal(parsed[0].answer, 'aof work answer 011 "…"');
    }),
  },
  {
    name: "operator-reads-open-questions/00 E12 · a question on a lane running on another machine is listed with its node",
    run: () => withWorld(async ({ env, ctx }) => {
      await seedWorkerAsk(env, { itemRef: "05/01", workspaceId: "wsA", ask: { question: "Ship the migration now?", phase: "continue", askedAt: "2026-10-17T14:05:00.000Z" } });
      const block = blockFor(render(await questions(ctx)), "05/01");
      assert.ok(block.includes("on node-9549"), block);
      assert.ok(block.includes("  Ship the migration now?"), block);
      assert.ok(block.includes('aof work answer 05/01 "…"'), block);
    }),
  },
  {
    name: "operator-reads-open-questions/00 E13 · a worker question whose text never reached this machine says where to read it",
    run: () => withWorld(async ({ env, ctx }) => {
      await seedWorkerAsk(env, { itemRef: "05/01", workspaceId: "wsA" });
      const block = blockFor(render(await questions(ctx)), "05/01");
      assert.ok(block.includes("did not reach this machine") && block.includes("open the worker's terminal to read it"), block);
      assert.ok(block.includes('aof work answer 05/01 "…"'), block);
    }),
  },
  {
    name: "operator-reads-open-questions/00 E6 · of two open asks on one ref only the latest is listed",
    run: () => withWorld(async ({ env, workDir, ctx }) => {
      const dir = await writeItem(workDir, "011");
      await writeRun(dir, runRecord("011", RUN_A));
      await writeRun(dir, runRecord("011", RUN_B));
      await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA", askedAt: "2026-10-17T09:00:00Z", question: "first?" });
      await writeAsk(env, { runId: RUN_B, ref: "011", workspaceId: "wsA", askedAt: "2026-10-17T11:00:00Z", question: "second?" });
      const rows = await questions(ctx);
      assert.equal(rows.filter((row) => row.ref === "011").length, 1, "exactly one row for 011");
      const text = render(rows);
      assert.ok(text.includes("second?") && !text.includes("first?"), text);
    }),
  },
  {
    name: "operator-reads-open-questions/00 E7 · a ref whose latest ask is already answered is not listed",
    run: () => withWorld(async ({ env, workDir, ctx }) => {
      const dir = await writeItem(workDir, "011");
      await writeRun(dir, runRecord("011", RUN_A));
      await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA", state: "answered", answer: "disk", answeredAt: "2026-10-17T14:10:00Z" });
      assert.deepEqual((await questions(ctx)).map((row) => row.ref), []);
    }),
  },
  {
    name: "operator-reads-open-questions/00 E11 · an ask whose run has stopped is marked stale with no answer line",
    run: () => withWorld(async ({ env, repo, workDir, ctx }) => {
      const dir = await writeItem(workDir, "011");
      await writeRun(dir, runRecord("011", RUN_A, { state: "failed" }));
      const laneDir = await writeItem(path.join(meshDispatchWorktreePath(repo, "011"), "wiki", "work"), "011");
      await writeRun(laneDir, runRecord("011", RUN_A, { state: "failed" }));
      await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA" });
      const [row] = await questions(ctx);
      assert.equal(row.liveness, "stale");
      const block = blockFor(render([row]), "011");
      assert.match(block, /STALE: its loop stopped/u, block);
      assert.ok(!block.includes("aof work answer"), `no answer line:\n${block}`);
      assert.ok(block.includes("aof work loop 011 --resume clears it"), block);
    }),
  },
  {
    name: "operator-reads-open-questions/00 an ask whose run is running in the item's dispatch lane is live",
    run: () => withWorld(async ({ env, repo, workDir, ctx }) => {
      await writeItem(workDir, "011");
      const laneDir = await writeItem(path.join(meshDispatchWorktreePath(repo, "011"), "wiki", "work"), "011");
      await writeRun(laneDir, runRecord("011", RUN_L));
      await writeAsk(env, { runId: RUN_L, ref: "011", workspaceId: "wsA" });
      const [row] = await questions(ctx);
      assert.equal(row.liveness, "live", "not marked stale");
      assert.ok(blockFor(render([row]), "011").includes('aof work answer 011 "…"'));
    }),
  },
  {
    name: "operator-reads-open-questions/00 a local ask outranks a worker's ask on the same ref",
    run: () => withWorld(async ({ env, workDir, ctx }) => {
      const dir = await writeItem(workDir, "05/01");
      await writeRun(dir, runRecord("05/01", RUN_A));
      await writeAsk(env, { runId: RUN_A, ref: "05/01", workspaceId: "wsA", question: "local?" });
      await seedWorkerAsk(env, { itemRef: "05/01", workspaceId: "wsA", ask: { question: "worker?", phase: "build", askedAt: "2026-10-17T14:05:00.000Z" } });
      const rows = await questions(ctx);
      assert.equal(rows.filter((row) => row.ref === "05/01").length, 1, "exactly one row");
      const text = render(rows);
      assert.ok(text.includes("local?") && !text.includes("worker?"), text);
    }),
  },
];

// ---- task 01 — --all widens to every workspace on this node ---------------------------------

const allWorkspacesTests = [
  {
    name: "operator-reads-open-questions/01 E8 · without --all only this workspace's questions, with --all every workspace's",
    run: () => withWorld(async ({ env, repo, workDir, other, otherWorkDir, ctx }) => {
      await writeRun(await writeItem(workDir, "011"), runRecord("011", RUN_A));
      await writeRun(await writeItem(otherWorkDir, "007"), runRecord("007", RUN_B));
      await writeAsk(env, { runId: RUN_A, ref: "011", workspaceId: "wsA" });
      await writeAsk(env, { runId: RUN_B, ref: "007", workspaceId: "wsB" });
      await writeDescriptor(env, { workspaceId: "wsA", name: "aof", projectRoot: repo });
      await writeDescriptor(env, { workspaceId: "wsB", name: "acme-core", projectRoot: other });
      assert.deepEqual((await questions(ctx)).map((row) => row.ref), ["011"], "only 011 without --all");
      const rows = await questions(ctx, { all: true });
      assert.deepEqual(rows.map((row) => row.ref).sort(), ["007", "011"], "both with --all");
      const block = blockFor(render(rows), "007");
      assert.ok(block.includes("workspace acme-core"), block);
      assert.ok(block.includes(`answer from the checkout: ${other}`), block);
      assert.equal(rows.find((row) => row.ref === "007").liveness, "live", "its run is read from its own checkout");
    }),
  },
  {
    name: "operator-reads-open-questions/01 E9 · an ask whose workspace has no descriptor is listed under its workspace id",
    run: () => withWorld(async ({ env, ctx }) => {
      await writeAsk(env, { runId: RUN_A, ref: "007", workspaceId: "52294b307214c27d" });
      const [row] = await questions(ctx, { all: true });
      assert.equal(row.workspace.name, "52294b307214c27d");
      assert.ok(blockFor(render([row]), "007").includes("workspace 52294b307214c27d"));
    }),
  },
  {
    name: "operator-reads-open-questions/01 E14 · an ask in a workspace whose checkout cannot be read reports unknown liveness",
    run: () => withWorld(async ({ env, base, ctx }) => {
      await writeAsk(env, { runId: RUN_B, ref: "007", workspaceId: "wsB" });
      await writeDescriptor(env, { workspaceId: "wsB", name: "acme-core", projectRoot: path.join(base, "not-on-this-machine") });
      const [row] = await questions(ctx, { all: true });
      assert.equal(row.liveness, "unknown", "liveness reported unknown");
      const block = blockFor(render([row]), "007");
      assert.match(block, /liveness unknown/u, block);
      assert.doesNotMatch(block, /STALE/u, "not marked stale");
    }),
  },
  {
    name: "operator-reads-open-questions/01 --all --json carries each row's workspace id and name",
    run: () => withWorld(async ({ env, other, otherWorkDir, ctx }) => {
      await writeRun(await writeItem(otherWorkDir, "007"), runRecord("007", RUN_B));
      await writeAsk(env, { runId: RUN_B, ref: "007", workspaceId: "wsB" });
      await writeDescriptor(env, { workspaceId: "wsB", name: "acme-core", projectRoot: other });
      const [row] = JSON.parse(JSON.stringify(getCommand("work:questions").cli.json(await questions(ctx, { all: true }))));
      assert.equal(row.workspace.id, "wsB");
      assert.equal(row.workspace.name, "acme-core");
    }),
  },
];

// ---- task 02 — resume sends the operator to the questions, from one rule ---------------------

const resumePointsAtQuestionsTests = [
  {
    name: "operator-reads-open-questions/02 E10 · a waiting row keeps NEEDS YOUR ANSWER and the tail names the questions verb",
    run: () => withWorld(async ({ workDir, ctx }) => {
      const dir = await writeItem(workDir, "011");
      await writeRun(dir, runRecord("011", RUN_A, { entries: [{ question: "Which store owns the cache?", phase: "refine", askedAt: "2026-10-17T14:02:00.000Z", parkedAt: null, answer: null, answeredAt: null, by: null }] }));
      const text = getCommand("work:resume").cli.render(await invoke("work:resume", { now: NOW }, ctx));
      assert.match(text, /^ {2}011 {2}NEEDS YOUR ANSWER/mu, text);
      assert.ok(text.includes("aof work questions"), text);
      assert.ok(!text.includes("Which store owns the cache?"), "no question text");
    }),
  },
  {
    name: "operator-reads-open-questions/02 resume and the loop agree on whether a run waits on a human",
    run: async () => {
      const open = { question: "Which store?", phase: "build", askedAt: "2026-10-17T14:02:00.000Z", parkedAt: null, answer: null, answeredAt: null, by: null };
      const rows = [
        ["an object with no answeredAt", open, "waiting-on-you", true],
        ["an object with an answeredAt", { ...open, answer: "disk", answeredAt: "2026-10-17T14:10:00.000Z" }, "in-flight", false],
        ["an array", [open], "in-flight", false],
      ];
      for (const [label, entry, state, standing] of rows) {
        await withWorld(async ({ workDir, ctx }) => {
          const dir = await writeItem(workDir, "011");
          const record = runRecord("011", RUN_A, { entries: [entry] });
          await writeRun(dir, record);
          const result = await invoke("work:resume", { now: NOW }, ctx);
          assert.equal(result.pending.find((row) => row.ref === "011")?.state, state, `${label}: the row's state`);
          assert.deepEqual(standingAsk(record), standing ? entry : null, `${label}: standingAsk`);
        });
      }
    },
  },
  {
    name: "operator-reads-open-questions/02 the waiting-on-a-human rule is written once",
    run: async () => {
      const resume = stripComments(await readFile(path.join(REPO_ROOT, "packages", "work", "src", "commands", "resume.mjs"), "utf8"));
      assert.doesNotMatch(resume, /\bfunction\s+openLastAsk\b|\bopenLastAsk\s*=/u, "resume.mjs defines no openLastAsk");
      assert.match(resume, /function createReentryCommands\(\{[^}]*\bstandingAsk\b/u, "the reentry commands take standingAsk");
      const binding = stripComments(await readFile(path.join(REPO_ROOT, "packages", "core", "src", "application", "bindings", "commands", "resume.mjs"), "utf8"));
      assert.match(binding, /const \{ standingAsk \} = loopAskServices;/u, "the binding takes it from the loop's ask services");
      assert.match(binding, /createReentryCommands\(\{[^}]*\bstandingAsk\b/u, "and hands it to the reentry commands");
    },
  },
];

// ---- task 03 — the verb ships its /aof:questions wrapper -------------------------------------

const BUNDLE_QUESTIONS = path.join(REPO_ROOT, "packages", "core", "assets", "commands", "questions.md");
const bodyOf = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, "").trim();

const bundleWrapperTests = [
  {
    name: "operator-reads-open-questions/03 the bundle carries a questions wrapper that runs the verb",
    run: async () => {
      const text = await readFile(BUNDLE_QUESTIONS, "utf8");
      const process = /<process>([\s\S]*?)<\/process>/u.exec(text)?.[1] ?? "";
      assert.ok(process.includes("aof work questions"), "its process runs aof work questions");
      assert.ok(text.includes("--all") && text.includes("--json"), "it names --all and --json");
      const tools = /^allowed-tools:\s*\[([^\]]*)\]/mu.exec(text)?.[1] ?? "";
      assert.doesNotMatch(tools, /\b(?:Write|Edit|NotebookEdit)\b/u, "it writes no file");
      assert.doesNotMatch(text, /(?<!never )\brun `aof work answer/iu, "it answers no question");
    },
  },
  {
    name: "operator-reads-open-questions/03 aof work update renders the wrapper into a repo",
    run: async () => {
      const base = await mkdtemp(path.join(os.tmpdir(), "aof-questions-bundle-"));
      try {
        const env = { ...process.env, AOF_GLOBAL_HOME: path.join(base, "home"), NODE_NO_WARNINGS: "1" };
        const project = path.join(base, "project");
        await mkdir(project);
        const init = spawnCliSync(process.execPath, [CLI, "work", "init", "--runtime", "claude", "--json"], { cwd: project, encoding: "utf8", env });
        assert.equal(init.status, 0, init.stderr);
        const update = spawnCliSync(process.execPath, [CLI, "work", "update", "--json"], { cwd: project, encoding: "utf8", env });
        assert.equal(update.status, 0, update.stderr);
        const rendered = await readFile(path.join(project, ".claude", "commands", "aof", "questions.md"), "utf8");
        assert.equal(bodyOf(rendered), bodyOf(await readFile(BUNDLE_QUESTIONS, "utf8")), "the rendered body is the bundle's");
      } finally {
        await rm(base, { recursive: true, force: true });
      }
    },
  },
  {
    name: "operator-reads-open-questions/03 the registry, the CLI route and the bundle agree on the new verb",
    run: () => withWorld(async (world) => {
      const command = getCommand("work:questions");
      assert.deepEqual(command?.cli?.route, ["work", "questions"], "work:questions has a CLI adapter reachable as aof work questions");
      const result = cli(world, ["work", "questions", "--json"]);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), [], "parseable JSON on a fixture stream");
      const edge = await readFile(path.join(REPO_ROOT, "test", "arch", "memory", "acd-learning-edge-reaches-every-cut.test.mjs"), "utf8");
      assert.match(edge, /"questions\.md": "reads the loop's open questions; answers none, cuts nothing"/u, "the learning-edge classification names questions.md as a read that cuts nothing");
    }),
  },
];

export const loopCommandQuestionsTests = [
  ...readsEveryQuestionTests,
  ...allWorkspacesTests,
  ...resumePointsAtQuestionsTests,
  ...bundleWrapperTests,
];
