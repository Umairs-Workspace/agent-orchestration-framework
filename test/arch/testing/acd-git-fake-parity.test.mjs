// Fitness function: acd-git-fake-parity (milestone 160 / story 01; FF-16002; ADR-002 §4) —
//
//   "The git model answers and writes exactly as real git for every verb it models, and refuses any
//    verb it does not model."
//
// The model (`test/support/loop/git-fake.mjs`) is only worth having while it is git. So ONE script of
// operations — init, commit, branch, worktree add, write, status, add, commit, merge-base,
// merge --ff-only, worktree remove, and every other argv the loop sends through its port — runs against
// real git in a temp directory and against the model in another. After every step both must answer the
// same status and the same stdout (object ids and the two roots normalised, since neither can be shared),
// and both directories must hold the same files with the same bytes. A verb joins the model only with a
// row here: the last case fails on any verb the model answers that the script never exercises.
//
// stderr is not compared: real git prints advice and line-ending warnings there, and the loop reads none.
//
// Red probe (VERIFICATION.md's register): give the model a default answer for an unknown verb — the
// refusal outline goes red.
import { defaultApplication } from "aof/default-application";
import assert from "node:assert/strict";
import { ChildProcess, execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoFromTemplate, spawnSyncHardened } from "../../support/cli-spawn.mjs";
import { withDispatchRepo } from "../../support/dispatch-lane-fixture.mjs";
import { createGitModel } from "../../support/loop/git-fake.mjs";
import { LANE_REPO, laneCtx, realExec, withLaneRepo } from "../../support/loop/lane-fixture.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

async function withTemp(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-160-08-")));
  try {
    return await body(tmp);
  } finally {
    await rm(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

const IDENTITY = ["-c", "user.name=parity", "-c", "user.email=parity@aof.test"];

function realGit(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C", LANG: "C" } }, (error, stdout, stderr) => {
      if (error && (error.code === "ENOENT" || error.killed || error.signal)) reject(error);
      else resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), status: error ? (typeof error.code === "number" ? error.code : 1) : 0 });
    });
  });
}

// Every file under `dir` (posix, relative), with its bytes, skipping each worktree's `.git`.
function snapshot(dir) {
  const files = {};
  const walk = (at, rel) => {
    if (!existsSync(at)) return;
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(path.join(at, entry.name), childRel);
      else files[childRel] = readFileSync(path.join(at, entry.name)).toString("base64");
    }
  };
  walk(dir, "");
  return files;
}

// One side of the parity run: a root, a port, and the object ids it has minted, in order.
function side(root, exec, headOf) {
  const ids = [];
  const learn = async () => {
    for (const cwd of [root, path.join(root, ".aof", "mesh", "lane")]) {
      if (!existsSync(cwd)) continue;
      const id = await headOf(cwd);
      if (id != null && /^[0-9a-f]{40}$/u.test(id) && !ids.includes(id)) ids.push(id);
    }
  };
  const normalise = (text) => {
    let out = String(text);
    for (const form of [root, root.replaceAll("\\", "/")]) out = out.split(form).join("<root>");
    out = out.replace(/(?<![0-9a-f])[0-9a-f]{7,40}(?![0-9a-f])/gu, (token) => {
      const at = ids.findIndex((id) => id.startsWith(token));
      return at < 0 ? token : `<id ${at}${token.length === 40 ? "" : " short"}>`;
    });
    return out.replaceAll("\\", "/");
  };
  return { root, exec, learn, normalise };
}

// The script: each step is `{ argv, where }` (a port call in the primary or the lane) or `{ write }`.
const LANE = ".aof/mesh/lane";
const SCRIPT = Object.freeze([
  { argv: ["add", "-A"] },
  { argv: [...IDENTITY, "commit", "--no-verify", "-m", "seed"] },
  { argv: ["rev-parse", "HEAD"] },
  { argv: ["symbolic-ref", "-q", "HEAD"] },
  { argv: ["symbolic-ref", "--quiet", "--short", "HEAD"] },
  { argv: ["show-ref", "--verify", "--quiet", "refs/heads/main"] },
  { argv: ["show-ref", "--verify", "--quiet", "refs/heads/missing"] },
  { argv: ["rev-parse", "--git-common-dir"] },
  { argv: ["worktree", "add", "-b", "lane", LANE, "HEAD"] },
  { argv: ["worktree", "list", "--porcelain"] },
  { argv: ["rev-parse", "--git-common-dir"], where: "lane" },
  { write: { "a.txt": "a\nb\n", "n.txt": "new\n", "u/x.txt": "untracked\n", "runs/.heartbeats.ndjson": "{}\n" }, where: "lane" },
  { argv: ["status", "--porcelain"], where: "lane" },
  { argv: ["status", "--porcelain", "--untracked-files=all"], where: "lane" },
  { argv: ["-c", "core.quotePath=false", "status", "--porcelain", "--untracked-files=all"], where: "lane" },
  { argv: ["status", "--porcelain", "--", "a.txt"], where: "lane" },
  { argv: ["check-ignore", "--", ".aof/mesh/x.txt", "a.txt"] },
  { argv: ["check-ignore", "--", "a.txt"] },
  { argv: ["diff", "--numstat", "HEAD", "--"], where: "lane" },
  { argv: ["add", "-A"], where: "lane" },
  { argv: ["diff", "--cached", "--name-only"], where: "lane" },
  { argv: ["reset", "-q", "--", "u"], where: "lane" },
  { argv: ["rm", "-r", "--cached", "-q", "--ignore-unmatch", "--", ":(glob)**/runs/.heartbeats.ndjson"], where: "lane" },
  { argv: ["diff", "--cached", "--name-only", "--", "a.txt"], where: "lane" },
  { argv: ["-c", "core.abbrev=40", ...IDENTITY, "commit", "--no-verify", "-m", "lane work"], where: "lane" },
  { argv: ["rev-parse", "HEAD", "main^{commit}", "--abbrev-ref", "HEAD"], where: "lane" },
  { argv: ["rev-parse", "--verify", "--quiet", "refs/heads/lane"] },
  { argv: ["rev-parse", "--verify", "--quiet", "nope^{commit}"] },
  { argv: ["rev-parse", "-q", "--verify", "MERGE_HEAD"] },
  { argv: ["merge-base", "HEAD", "lane"] },
  { argv: ["merge-base", "--is-ancestor", "HEAD", "lane"] },
  { argv: ["merge-base", "--is-ancestor", "lane", "HEAD"] },
  { argv: ["rev-list", "--count", "main..lane"] },
  { argv: ["-c", "core.quotePath=false", "diff", "--name-only", "--no-renames", "HEAD...lane"] },
  { argv: ["merge", "--ff-only", "lane"] },
  { argv: ["merge", "--ff-only", "lane"] },
  { write: { "wiki/x.md": "own\n" } },
  { argv: ["status", "--porcelain", "--", "wiki"] },
  { argv: ["add", "--", "wiki"] },
  { argv: ["diff", "--cached", "--name-only", "--", "wiki", ":(exclude).aof"] },
  { argv: [...IDENTITY, "commit", "--no-verify", "-m", "own writes", "--", "wiki", ":(exclude).aof"] },
  { argv: ["clean", "-f", "-x", "-q", "--", ":(glob)**/runs/.heartbeats.ndjson"], where: "lane" },
  { remove: "u", where: "lane" },
  { argv: ["status", "--porcelain"], where: "lane" },
  { argv: ["worktree", "remove", LANE] },
  { argv: ["branch", "-d", "lane"] },
  { argv: ["worktree", "prune"] },
  { argv: ["worktree", "list", "--porcelain"] },
]);

// 160/08's merge homes (ADR-009 §1): a lane that changes the stream one way, merged home with the loop's own
// argv. Each row is a script of its own, so a row's shape never depends on another's.
const MERGE_ROWS = Object.freeze([
  ["aof/53-00", "adds"],
  ["aof/53-01", "edits"],
  ["aof/53-02", "deletes"],
  ["aof/53-03", "adds-beside-primary"],
]);
function mergeScript(lane, change) {
  const laneWork = {
    adds: [{ write: { "n.txt": "new\n" }, where: "lane" }],
    edits: [{ write: { "a.txt": "a\nlane\n" }, where: "lane" }],
    deletes: [{ remove: "d/b.txt", where: "lane" }],
    "adds-beside-primary": [{ write: { "n.txt": "new\n" }, where: "lane" }],
  }[change];
  return [
    { argv: ["add", "-A"] },
    { argv: [...IDENTITY, "commit", "--no-verify", "-m", "seed"] },
    { argv: ["worktree", "add", "-b", lane, LANE, "HEAD"] },
    ...laneWork,
    { argv: ["add", "-A"], where: "lane" },
    { argv: [...IDENTITY, "commit", "--no-verify", "-m", "lane work"], where: "lane" },
    ...(change === "adds-beside-primary" ? [{ write: { "m.txt": "primary\n" } }, { argv: ["add", "-A"] }, { argv: [...IDENTITY, "commit", "--no-verify", "-m", "primary work"] }] : []),
    { argv: [...IDENTITY, "merge", "--no-ff", "--no-edit", "-m", `merge ${lane}`, lane] },
    { argv: ["merge", "--no-ff", "--no-edit", "-m", `merge ${lane} again`, lane] },
  ];
}

async function withParity(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-git-parity-")));
  const realRoot = path.join(tmp, "real");
  const modelRoot = path.join(tmp, "model");
  try {
    for (const root of [realRoot, modelRoot]) {
      mkdirSync(path.join(root, "d"), { recursive: true });
      writeFileSync(path.join(root, "a.txt"), "a\n");
      writeFileSync(path.join(root, "d", "b.txt"), "x\ny\n");
      writeFileSync(path.join(root, ".gitignore"), ".aof/mesh/\n");
    }
    await realGit(["init", "-q", "-b", "main"], realRoot);
    await realGit(["config", "core.autocrlf", "false"], realRoot);
    const model = createGitModel({ root: modelRoot });
    model.init();
    const real = side(realRoot, (args, { cwd }) => realGit(args, cwd), async (cwd) => (await realGit(["rev-parse", "HEAD"], cwd)).stdout.trim());
    const fake = side(modelRoot, (args, options) => model.exec(args, options), async (cwd) => { try { return model.head(cwd); } catch { return null; } });
    return await body({ real, fake, model });
  } finally {
    await rm(tmp, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

async function runStep(step, s) {
  const cwd = step.where === "lane" ? path.join(s.root, ...LANE.split("/")) : s.root;
  if (step.write != null) {
    for (const [rel, text] of Object.entries(step.write)) {
      mkdirSync(path.dirname(path.join(cwd, rel)), { recursive: true });
      writeFileSync(path.join(cwd, rel), text);
    }
    return null;
  }
  if (step.remove != null) { rmSync(path.join(cwd, step.remove), { recursive: true, force: true }); return null; }
  const result = await s.exec(step.argv, { cwd });
  await s.learn();
  return { status: result.status, stdout: s.normalise(result.stdout) };
}

// ── the classification rule (tasks/01) ─────────────────────────────────────────────────────────
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The lane-fixture suites this story classified case by case, and the suites that stay on real git whole.
const MOVED_SUITES = Object.freeze([
  "test/loop/loop-command-wave.test.mjs",
  "test/loop/loop-command-reconcile.test.mjs",
  "test/loop/loop-command-stops.test.mjs",
  "test/loop/lane-is-local-slot.test.mjs",
  "test/loop/loop-command-probe.test.mjs",
  "test/arch/loop/acd-loop-ask-waits-in-place.test.mjs",
]);
const REAL_GIT_SUITES = Object.freeze([
  "test/work/lifecycle/work-dispatch-lanes.test.mjs",
  "test/grade/gate-propagation-refusals-leave-branch.test.mjs",
]);
const MOVED_SUITE_INDEXES = Object.freeze({
  "test/loop/index.mjs": MOVED_SUITES.filter((file) => file.startsWith("test/loop/")),
  "test/arch/loop/index.mjs": MOVED_SUITES.filter((file) => file.startsWith("test/arch/loop/")),
});

// ADR-002 §3's subjects, each by what an assertion about it looks like in a case's body.
const KEEP_REAL = Object.freeze([
  ["a lane's commits merge home on the primary", /\bgit\(\[\s*"(merge-base|log)"/u],
  ["a live lane tree is reused by a second dispatch", /\breus(?:e|ed)\b|reopened lane/u],
  ["a dirty lane is refused cleanup", /dispatch-lane-uncommitted-work/u],
  ["residue with no .git marker is refused", /dispatch-lane-residue/u],
  ["the lane branch is deleted with its tree", /\bgit\(\[\s*"branch"|branchRemoved/u],
]);

// THE MOVED SET, as the classification left it at 160/01 (green on the model, the loop its subject, no
// test-side question to git about the repository) and 160/08 re-applied it once the model merged a lane home
// (ADR-009 §2): sixteen more. A move or a return to real git is a diff to this list.
const MOVED = Object.freeze([
  ["test/loop/loop-command-wave.test.mjs", "129/04 task00 the ladder grades in the workspace it is handed, and the sampler and the change reader see the same path"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task00 [outline] the ladder's answer is decided by its rungs in rung order, whichever workspace it grades in (11 rows)"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task00 crossToVerify false stops at the gate; true drives verify as today"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task00 [outline] the bookkeeping maps are written by the ladder exactly as the shell wrote them (4 rows)"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task00 sequential mode is byte-identical — LoopState keeps its ten keys and a sequential driven row its six"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task02 the lane's item is resolved and minted in the lane, never in the primary; the primary holds no record until the merge"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task02 the primary's story docs are untouched while the lane is open"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task02 the child is spawned in the lane with the lent id, the parent deadline and the isolated home"],
  ["test/loop/loop-command-wave.test.mjs", "141/01 every wave lane's child is handed the loop's --thinking, and nothing when the loop has none"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task02 the ladder runs in the lane workspace — every grade, validate and doctor recorded a lane path, never the primary's"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task02 [outline] a child's non-document outcome settles the lane run as the vocabulary says (5 rows)"],
  ["test/loop/loop-command-wave.test.mjs", "138/01 task03 [outline] the lane's settle line names the screen, and the lane's halt line carries it (3 rows)"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task02 a failing grade re-drives in the same lane before any merge, and the fix rides a file under the aof home that is removed after the child"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task03 [outline] the delta is applied per lane against the one baseline (5 rows)"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task03 the first lane's child waits for the baseline and the second lane's does not"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task03 a baseline that cannot be taken degrades once and grades raw"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task03 a resumed loop reads the baseline back by base commit, a held member on a new base measures a new one, and VERIFY never re-grades"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task03 sequential keeps the per-story baseline on the primary"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task04 [outline] the wave run is heartbeated on the interval only while a lane is open; cleared when the last lane closes (3 rows)"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task04 the wave run is re-minted after every merge so the supervisor sees exactly one row, and the driven row names the wave"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task05 [outline] admission is the bound against the wave, in wave order; the refused wait for a lane to close (6 rows)"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task05 foreign holders count against the bound; only a fully foreign capacity halts, naming the holders and the remedy"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task05 a wave of one still gets a lane, read off the open answer; a throwing single open halts lane-open-failed naming the error"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task05 an empty dispatch with held members is dependency-blocked with nothing in flight, and waits for the merge with a lane in flight"],
  ["test/loop/loop-command-wave.test.mjs", "129/04 task05 the bound is narrated from dispatch's answer, never read from config, and wave.mjs holds no concurrency literal"],
  ["test/loop/loop-command-wave.test.mjs", "147/00 E6 — a red grade stops the loop with no repair session, as before"],
  ["test/loop/loop-command-wave.test.mjs", "131/03 task02 — one lane asks, the other merges while it waits, and the answer re-spawns the first lane's own child with --answer and the same run"],
  ["test/loop/loop-command-wave.test.mjs", "131/03 task02 — with no open lane and a parked one, the question is the halt: a story blocked behind the parked lane never halts dependency-blocked"],
  ["test/loop/loop-command-wave.test.mjs", "131/03 task02 — a halt in another lane drains the wave, and the waiting lane parks without a notice and rides the drained list"],
  ["test/loop/loop-command-wave.test.mjs", "131/03 task02 — the operator's stop parks every waiting lane without a notice, and the halt carries them"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task01 BUILD asks work:next with throughReview and reads done as the boundary, never as an accepted milestone"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task01 VERIFY honours a fresh gate on an in-review story — validate, doctor, the recorded grade without a re-run, then verify"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task01 [outline] the fresh gate routes on what validate, doctor and the recorded grade say (6 rows)"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task01 the fresh gate's re-drive is a continue in the primary under sequential; the gate is honoured, not halted, and any other status still halts unmapped"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task01 [outline] the recorded grade is read from the run, then the ledger, then not at all (5 rows)"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task01 a refine-end commit git refuses is a named halt, and the primary is left exactly as it was"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task06 the first signal drains and halts operator-interrupt; the wave run is failed"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task06 [outline] a signal's effect depends on how many lanes are open and whether it is the first (6 rows), and the second signal cancels every child"],
  ["test/loop/loop-command-reconcile.test.mjs", "129/04 task06 a child past the parent deadline is settled timeout and retried in its lane; the lineage budget still bounds it"],
  ["test/loop/loop-command-reconcile.test.mjs", "131/03 task04 — an answered lane is re-driven at reconcile with --answer under the same run, merges, and is never reclaimed"],
  ["test/loop/loop-command-reconcile.test.mjs", "131/03 task04 — an unanswered lane is waited on again without a second notice, and settles when the answer lands"],
  ["test/loop/loop-command-reconcile.test.mjs", "131/03 task04 — a fresh, unparked standing ask has a live owner and is left; an ask file with no waiting run behind it is cleared once"],
  ["test/loop/loop-command-stops.test.mjs", "147/00 E2 — a lane that will not reopen (a dirty worktree) opens a repair session with the same hand-over"],
  ["test/loop/loop-command-stops.test.mjs", "147/00 [outline] each lane stop is handed over when repair is on — lane-merge-refused (lane-open-failed is E2, lane-merge-conflict is E1)"],
  ["test/loop/loop-command-stops.test.mjs", "147/00 [outline] a work.loop.repair that is not a boolean is refused loop-bound-unresolved, naming the key, before anything is driven [${label}]"],
  ["test/loop/loop-command-stops.test.mjs", "147/00 E5 — a UAT gate stops the loop with no repair session, as before; a halt that parked asks is never handed over"],
  ["test/loop/loop-command-stops.test.mjs", "147/01 — a repair that cannot be minted stops the loop with the original halt, naming the refusal"],
]);

// Every case in `files`: its file, its name as written, and its source from its `name:` to the next.
async function caseSites(files) {
  const sites = [];
  for (const file of files) {
    const src = (await readFile(path.join(repoRoot, file), "utf8")).replace(/\r\n/gu, "\n");
    const found = [...src.matchAll(/\n\s*name: ("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`),/gu)].map((match) => ({ at: match.index, name: match[1].slice(1, -1) }));
    found.forEach((site, index) => sites.push({ file, name: site.name, body: src.slice(site.at, index + 1 < found.length ? found[index + 1].at : src.length) }));
  }
  return sites;
}

// Every git process started while `run` runs, with its argv, its exit status and its stderr.
async function gitSpawnsDuring(run) {
  const spawns = [];
  const closed = [];
  const original = ChildProcess.prototype.spawn;
  ChildProcess.prototype.spawn = function countedSpawn(options) {
    const out = original.call(this, options);
    const file = path.basename(String(options?.file ?? "")).toLowerCase();
    if (file === "git" || file === "git.exe") {
      const spawn = { args: options.args.slice(1), status: null, stderr: "" };
      spawns.push(spawn);
      this.stderr?.on("data", (chunk) => { spawn.stderr += chunk; });
      closed.push(new Promise((resolve) => this.once("close", (code) => { spawn.status = code; resolve(); })));
    }
    return out;
  };
  try {
    const result = await run();
    await Promise.all(closed);
    return { result, spawns };
  } finally {
    ChildProcess.prototype.spawn = original;
  }
}

// A direct wiki page citing one source file, as the reader of story 06's history edge finds it.
async function citingPage(fx, cited) {
  await mkdir(path.join(fx.root, "wiki"), { recursive: true });
  await writeFile(path.join(fx.root, "wiki", "notes.md"), `# notes\n\nThe fixture reads \`${cited}\`.\n`, "utf8");
}

const runDoctor = (fx) => defaultApplication.getCommand("work:doctor").run({}, { workspace: fx.workspace });

// The verb a port argv names: the first argument after the leading `-c <key=value>` pairs.
const verbOf = (argv) => { let at = 0; while (argv[at] === "-c") at += 2; return argv[at]; };

export const archTests = [
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): A worktree added on the model holds the commit's files",
    run: () => withParity(async ({ fake, model }) => {
      await fake.exec(["add", "-A"], { cwd: fake.root });
      await fake.exec([...IDENTITY, "commit", "--no-verify", "-m", "seed"], { cwd: fake.root });
      const lane = path.join(fake.root, "lanes", "07-01");
      await fake.exec(["worktree", "add", "-b", "aof/07-01", lane, "HEAD"], { cwd: fake.root });
      const files = snapshot(lane);
      assert.deepEqual(files, Object.fromEntries(Object.entries(snapshot(fake.root)).filter(([rel]) => !rel.startsWith("lanes/"))), "the lane directory holds every file of that commit, byte for byte");
      const listed = (await fake.exec(["worktree", "list", "--porcelain"], { cwd: fake.root })).stdout.split("\n").filter((line) => line.startsWith("worktree "));
      assert.deepEqual(listed, [`worktree ${fake.root.replaceAll("\\", "/")}`, `worktree ${lane.replaceAll("\\", "/")}`], "the primary first and the lane second");
      assert.equal(model.head(lane), model.head(fake.root));
    }),
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): Status reports what changed on disk since HEAD",
    run: () => withParity(async ({ fake }) => {
      await fake.exec(["add", "-A"], { cwd: fake.root });
      await fake.exec([...IDENTITY, "commit", "--no-verify", "-m", "seed"], { cwd: fake.root });
      const lane = path.join(fake.root, "lane");
      await fake.exec(["worktree", "add", "-b", "aof/07-01", lane, "HEAD"], { cwd: fake.root });
      writeFileSync(path.join(lane, "d", "b.txt"), "rewritten\n");
      writeFileSync(path.join(lane, "d", "new.txt"), "new\n");
      const status = await fake.exec(["status", "--porcelain", "--untracked-files=all"], { cwd: lane });
      assert.equal(status.stdout, " M d/b.txt\n?? d/new.txt\n");
    }),
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): A commit on a lane fast-forwards home",
    run: () => withParity(async ({ fake, model }) => {
      await fake.exec(["add", "-A"], { cwd: fake.root });
      await fake.exec([...IDENTITY, "commit", "--no-verify", "-m", "seed"], { cwd: fake.root });
      const lane = path.join(fake.root, "lane");
      await fake.exec(["worktree", "add", "-b", "aof/07-01", lane, "HEAD"], { cwd: fake.root });
      writeFileSync(path.join(lane, "a.txt"), "changed\n");
      await fake.exec(["add", "-A"], { cwd: lane });
      await fake.exec([...IDENTITY, "commit", "--no-verify", "-m", "lane"], { cwd: lane });
      const merged = await fake.exec(["merge", "--ff-only", "aof/07-01"], { cwd: fake.root });
      assert.equal(merged.status, 0, merged.stderr);
      assert.equal((await fake.exec(["rev-parse", "HEAD"], { cwd: fake.root })).stdout.trim(), model.head(lane), "rev-parse HEAD in the primary answers the lane's tip");
      assert.equal(readFileSync(path.join(fake.root, "a.txt"), "utf8"), "changed\n", "the primary's directory holds the lane's change");
    }),
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): [outline] Anything unmodelled is refused by name (4 rows)",
    run: () => withParity(async ({ fake }) => {
      await fake.exec(["add", "-A"], { cwd: fake.root });
      await fake.exec([...IDENTITY, "commit", "--no-verify", "-m", "seed"], { cwd: fake.root });
      // 160/08 (ADR-009 §1) models `merge --no-ff`, so the merge row 160/01 refused is now a merge the model
      // still does not model.
      for (const argv of ["rebase main", "stash push", "log --graph --oneline", "merge --squash aof/07-01"]) {
        const before = snapshot(fake.root);
        await assert.rejects(fake.exec(argv.split(" "), { cwd: fake.root }), (error) => {
          assert.ok(error.message.includes(argv), `the error names "${argv}": ${error.message}`);
          assert.match(error.message, /the git model does not answer/u, "and says the model does not answer it");
          return true;
        });
        assert.deepEqual(snapshot(fake.root), before, `nothing on disk changed for "${argv}"`);
      }
    }),
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): The parity control holds the model to real git",
    run: () => withParity(async ({ real, fake }) => {
      for (const [at, step] of SCRIPT.entries()) {
        const label = `step ${at} ${step.argv?.join(" ") ?? (step.write ? "write" : `remove ${step.remove}`)}${step.where === "lane" ? " (lane)" : ""}`;
        const expected = await runStep(step, real);
        const actual = await runStep(step, fake);
        assert.deepEqual(actual, expected, `${label}: both answer the same status and the same stdout`);
        assert.deepEqual(snapshot(fake.root), snapshot(real.root), `${label}: both directories hold the same files with the same bytes`);
      }
    }),
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): Every verb the model answers has a parity row",
    run: () => withParity(async ({ model }) => {
      const exercised = new Set(SCRIPT.filter((step) => step.argv != null).map((step) => verbOf(step.argv)));
      const missing = model.verbs.filter((verb) => !exercised.has(verb));
      assert.deepEqual(missing, [], `no verb the model answers is missing from the parity script: ${missing.join(", ")}`);
    }),
  },
  // ── 160/08 tasks/00 · the model merges a lane home (ADR-009 §1) ─────────────────────────────
  {
    name: "arch/160 FF-16009 160/08 [outline] A merge home answers and writes as real git (4 rows)",
    run: async () => {
      for (const [lane, change] of MERGE_ROWS) {
        await withParity(async ({ real, fake, model }) => {
          const steps = mergeScript(lane, change);
          for (const [at, step] of steps.entries()) {
            const label = `${lane} step ${at} ${step.argv?.join(" ") ?? (step.write ? "write" : `remove ${step.remove}`)}${step.where === "lane" ? " (lane)" : ""}`;
            const expected = await runStep(step, real);
            const actual = await runStep(step, fake);
            assert.deepEqual(actual, expected, `${label}: both answer the same status and the same stdout`);
            assert.deepEqual(snapshot(fake.root), snapshot(real.root), `${label}: both leave the same files`);
          }
          const realParents = (await realGit(["rev-list", "--parents", "-n", "1", "HEAD"], real.root)).stdout.trim().split(" ").slice(1);
          const head = model.head(fake.root);
          assert.equal(model.parents(head).length, 2, `${lane}: the model's new HEAD is a merge commit`);
          assert.deepEqual(model.parents(head).map((id) => fake.normalise(id)), realParents.map((id) => real.normalise(id)), `${lane}: both new HEADs have the same parents`);
        });
      }
    },
  },
  {
    name: "arch/160 FF-16009 160/08 A merge home over a local change the merge would overwrite refuses as real git",
    run: () => withParity(async ({ real, fake }) => {
      const steps = [...mergeScript("aof/53-01", "edits").slice(0, -1), { write: { "a.txt": "dirty\n" } }, { argv: [...IDENTITY, "merge", "--no-ff", "--no-edit", "-m", "merge aof/53-01", "aof/53-01"] }];
      for (const step of steps) {
        assert.deepEqual(await runStep(step, fake), await runStep(step, real), `${step.argv?.join(" ") ?? "write"}: the same answer`);
        assert.deepEqual(snapshot(fake.root), snapshot(real.root), "the same files");
      }
    }),
  },
  {
    name: "arch/160 FF-16009 160/08 [outline] A merge the model does not model is a thrown error, never an answer (3 rows)",
    run: async () => {
      const rows = [
        ["both sides changed src/shared.mjs since the base", { lane: "one\ntwo\nLANE\n", primary: "one\nPRIMARY\nthree\n" }, "merge --no-ff aof/53-04", "src/shared.mjs"],
        ["both sides changed src/shared.mjs, in different regions", { lane: "one\ntwo\nthree\nfour\nLANE\n", primary: "PRIMARY\ntwo\nthree\nfour\nfive\n" }, "merge --no-ff aof/53-04", "src/shared.mjs"],
        ["nothing else", null, "merge --squash aof/53-04", null],
      ];
      for (const [situation, shared, argv, named] of rows) {
        await withParity(async ({ fake, model }) => {
          mkdirSync(path.join(fake.root, "src"), { recursive: true });
          writeFileSync(path.join(fake.root, "src", "shared.mjs"), "one\ntwo\nthree\nfour\nfive\n");
          for (const step of [{ argv: ["add", "-A"] }, { argv: [...IDENTITY, "commit", "--no-verify", "-m", "seed"] }, { argv: ["worktree", "add", "-b", "aof/53-04", LANE, "HEAD"] }]) await runStep(step, fake);
          if (shared != null) {
            for (const [where, text] of [["lane", shared.lane], [null, shared.primary]]) {
              await runStep({ write: { "src/shared.mjs": text }, where }, fake);
              await runStep({ argv: ["add", "-A"], where }, fake);
              await runStep({ argv: [...IDENTITY, "commit", "--no-verify", "-m", `${where ?? "primary"} edit`], where }, fake);
            }
          }
          const before = { head: model.head(fake.root), files: snapshot(fake.root) };
          await assert.rejects(fake.exec([...IDENTITY, ...argv.split(" ")], { cwd: fake.root }), (error) => {
            assert.ok(error.message.includes(argv), `${situation}: the error names "${argv}": ${error.message}`);
            if (named != null) assert.ok(error.message.includes(named), `${situation}: and names "${named}": ${error.message}`);
            return true;
          });
          assert.equal(model.head(fake.root), before.head, `${situation}: the primary's HEAD is unchanged`);
          assert.deepEqual(snapshot(fake.root), before.files, `${situation}: the primary's files are unchanged`);
        });
      }
    },
  },
  // ── 160/08 tasks/01 · a real-git fixture starts from a template (ADR-009 §3) ────────────────
  {
    name: "arch/160 FF-16009 160/08 A template-built repository is indistinguishable from an init-built one",
    run: () => withTemp(async (tmp) => {
      const built = path.join(tmp, "init-built");
      const copied = path.join(tmp, "template-built");
      for (const dir of [built, copied]) mkdirSync(dir);
      await realGit(LANE_REPO.init, built);
      for (const [name, value] of LANE_REPO.config) await realGit(["config", name, value], built);
      repoFromTemplate(copied, LANE_REPO);
      const answers = {};
      for (const dir of [built, copied]) {
        writeFileSync(path.join(dir, "a.txt"), "a\n");
        mkdirSync(path.join(dir, "d"));
        writeFileSync(path.join(dir, "d", "b.txt"), "b\n");
        await realGit(["add", "-A"], dir);
        await realGit(["commit", "-q", "-m", "first"], dir);
        writeFileSync(path.join(dir, "u.txt"), "untracked\n");
        answers[dir] = [];
        for (const argv of [["config", "--list", "--local"], ["symbolic-ref", "HEAD"], ["status", "--porcelain"], ["ls-tree", "-r", "HEAD"]]) {
          const { status, stdout } = await realGit(argv, dir);
          answers[dir].push({ argv: argv.join(" "), status, stdout });
        }
      }
      assert.deepEqual(answers[copied], answers[built], "config, HEAD, status and the first commit's tree answer the same in both");
    }),
  },
  {
    name: "arch/160 FF-16009 160/08 The template is built once per process",
    run: () => withTemp(async (tmp) => {
      const calls = [];
      const counting = (args, cwd) => { calls.push(args[0]); return spawnSyncHardened("git", args, { cwd, encoding: "utf8", windowsHide: true }); };
      // A key no other case uses, so this template is built here, under the counting port.
      const options = { init: ["init", "-q", "-b", "main"], config: [["user.email", "once@aof.test"], ["user.name", `once ${process.pid} ${Date.now()}`]], git: counting };
      for (const name of ["one", "two", "three"]) {
        const root = path.join(tmp, name);
        mkdirSync(root);
        repoFromTemplate(root, options);
        writeFileSync(path.join(root, "a.txt"), `${name}\n`);
        counting(["add", "-A"], root);
        counting(["commit", "-q", "-m", name], root);
        assert.equal(counting(["rev-list", "--count", "HEAD"], root).stdout.trim(), "1", `${name} holds its one commit`);
      }
      const count = (verb) => calls.filter((call) => call === verb).length;
      assert.equal(count("init"), 1, "init ran once");
      assert.equal(calls.indexOf("config"), 1, "config ran while the template was built…");
      assert.equal(calls.lastIndexOf("config"), 2, "…and only then");
      assert.equal(count("add"), 3, "each repository cost exactly one add");
      assert.equal(count("commit"), 3, "and exactly one commit");
    }),
  },
  {
    name: "arch/160 FF-16009 160/08 Two fixtures copied from one template share nothing",
    run: () => withTemp(async (tmp) => {
      const [first, second] = ["first", "second"].map((name) => repoFromTemplate(path.join(tmp, name), LANE_REPO));
      writeFileSync(path.join(second, "keep.txt"), "kept\n");
      const before = { head: await realGit(["rev-parse", "--verify", "-q", "HEAD"], second), branches: await realGit(["branch", "--list"], second), files: snapshot(second) };
      writeFileSync(path.join(first, "a.txt"), "a\n");
      await realGit(["add", "-A"], first);
      await realGit(["commit", "-q", "-m", "first only"], first);
      assert.equal((await realGit(["rev-list", "--count", "HEAD"], first)).stdout.trim(), "1", "the commit landed in the first");
      assert.deepEqual(await realGit(["rev-parse", "--verify", "-q", "HEAD"], second), before.head, "the second's HEAD is unchanged");
      assert.deepEqual(await realGit(["branch", "--list"], second), before.branches, "its branches are unchanged");
      assert.deepEqual(snapshot(second), before.files, "its files are unchanged");
    }),
  },
  {
    name: "arch/160 FF-16009 160/08 [outline] Each real-git fixture builds from the template (4 rows)",
    run: async () => {
      // The row's fixture, and the function in which it builds a repository (gate-propagation's is the
      // worker fixture it delegates to; the assign fixture builds no repository at all).
      const rows = [
        ["test/support/loop/lane-fixture.mjs", "test/support/loop/lane-fixture.mjs", "export async function withLaneRepo("],
        ["test/support/dispatch-lane-fixture.mjs", "test/support/dispatch-lane-fixture.mjs", "export async function withDispatchRepo("],
        ["test/support/gate-propagation-fixture.mjs", "test/support/mesh-worker-exec-fixture.mjs", "export async function withMeshWorkerExecFixture("],
        ["test/support/mesh-assign-fixture.mjs", "test/support/mesh-assign-fixture.mjs", "export async function withMeshAssignFixture("],
      ];
      for (const [fixture, builder, header] of rows) {
        const body = functionBody(stripComments(await readFile(path.join(repoRoot, builder), "utf8")), header);
        assert.ok(body != null, `${fixture}: its builder ${header} was found`);
        assert.equal(/\[\s*"init"|\[\s*"config"/u.test(body), false, `${fixture}: it makes no "init" and no "config" call of its own`);
        if (fixture !== "test/support/mesh-assign-fixture.mjs") assert.match(body, /repoFromTemplate\(root, [A-Z_]+_REPO\)/u, `${fixture}: it copies the template`);
      }
      // The two that spawn git asynchronously are also watched building, once the template is warm.
      for (const build of [(body) => withLaneRepo(body), (body) => withDispatchRepo(body)]) {
        await build(async () => {});
        const { spawns } = await gitSpawnsDuring(() => build(async (fx) => assert.ok(existsSync(path.join(fx.root, ".git", "HEAD")), "the copy is a repository")));
        const verbs = spawns.map((spawn) => spawn.args.find((arg) => !arg.startsWith("-")));
        assert.deepEqual(verbs.filter((verb) => verb === "init" || verb === "config"), [], `no init and no config while building: ${verbs.join(" ")}`);
      }
    },
  },
  // ── tasks/01 · the loop suites move onto the model by rule ──────────────────────────────────
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): The lane fixture builds a model repository with no git process",
    run: async () => {
      const { spawns } = await gitSpawnsDuring(() => withLaneRepo(async (fx) => {
        assert.equal(laneCtx(fx).exec, fx.model.exec, "laneCtx's exec is the model's port");
        assert.equal(existsSync(path.join(fx.root, ".git")), false, "no .git directory is made");
      }, { git: "fake" }));
      assert.deepEqual(spawns, [], "no git process was started");
    },
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): The lane fixture still builds a real repository by default",
    run: async () => {
      await withLaneRepo(async (fx) => {
        assert.equal(existsSync(path.join(fx.root, ".git")), true, "the root holds a .git directory");
        assert.equal(laneCtx(fx).exec, realExec, "laneCtx's exec is real git");
        assert.equal(fx.model, null);
      });
    },
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): [outline] A case keeps real git when git is its subject (5 rows)",
    run: async () => {
      await keepsRealGit(KEEP_REAL);
    },
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): A case that reaches git outside the port fails loudly on the model",
    run: async () => {
      await outsideSeamFailsLoudly();
    },
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): A real doctor over a stream that resolves on disk runs on the model",
    run: async () => {
      const answers = {};
      for (const mode of ["real", "fake"]) {
        await withLaneRepo(async (fx) => {
          await citingPage(fx, "src/present.mjs");
          const { result, spawns } = await gitSpawnsDuring(() => runDoctor(fx));
          if (mode === "fake") assert.deepEqual(spawns, [], "no git process was started");
          answers[mode] = result.findings.map((finding) => `${finding.code} ${String(finding.message).split(fx.root).join("<root>")}`).sort();
        }, { git: mode, stories: ["01"], commit: { "src/present.mjs": "export const present = 1;\n" } });
      }
      assert.deepEqual(answers.fake, answers.real, "doctor answers as it does on real git");
    },
  },
  {
    name: "arch/160 FF-16002 (acd-git-fake-parity): Every moved case keeps its name and its claim",
    run: async () => {
      await movedSetIsPinned();
    },
  },
  // ── 160/08 tasks/00 · the rule re-applied once the model merges a lane home (ADR-009 §2) ──────
  {
    name: "arch/160 FF-16002 160/08 The moved cases are pinned and still pass",
    run: () => movedSetIsPinned(),
  },
  {
    name: "arch/160 FF-16002 160/08 [outline] A case whose subject is git stays on real git (4 rows)",
    run: async () => {
      const marker = (subject) => KEEP_REAL.filter(([label]) => label === subject);
      await keepsRealGit(marker("a lane's commits merge home on the primary")); // the commit graph a merge home leaves
      await keepsRealGit([...marker("a live lane tree is reused by a second dispatch"), ...marker("a dirty lane is refused cleanup"), ...marker("residue with no .git marker is refused")]); // a worktree being reused or refused
      await keepsRealGit(marker("the lane branch is deleted with its tree")); // the cleanup of a lane's branch and directory
      await outsideSeamFailsLoudly(); // git reached through a seam other than the loop's port
    },
  },
];

// ADR-002 §3's rule over the case bodies: every case that asserts one of `subjects` runs on real git.
async function keepsRealGit(subjects) {
  assert.ok(subjects.length > 0, "the rows name subjects the rule knows");
  const sites = await caseSites([...MOVED_SUITES, ...REAL_GIT_SUITES]);
  for (const [subject, marker] of subjects) {
    const asserting = sites.filter((site) => marker.test(site.body));
    assert.ok(asserting.length > 0, `some case asserts ${subject}`);
    for (const site of asserting) {
      assert.equal(/git: "fake"/u.test(site.body), false, `${site.file} "${site.name}" asserts ${subject}, so it runs over a real repository with exec realExec`);
    }
  }
}

// A case that reaches git through any seam but the loop's port cannot pass on the model: that git finds no
// repository there.
async function outsideSeamFailsLoudly() {
  await withLaneRepo(async (fx) => {
    await citingPage(fx, "src/missing.mjs");
    const { result, spawns } = await gitSpawnsDuring(() => runDoctor(fx));
    // Doctor reads citation history through its own seam, not the loop's port (160/ADR-007): on the
    // model that read reaches a directory with no repository, and git says so.
    assert.ok(spawns.length > 0, "the real work:doctor started git outside the port");
    assert.ok(spawns.every((spawn) => spawn.status !== 0 && /not a git repository/iu.test(spawn.stderr)), `it failed on the missing repository, naming git: ${JSON.stringify(spawns)}`);
    assert.ok(result.findings.some((finding) => finding.code === "wiki-source-unresolved"), "and doctor reports the citation unresolved rather than passing it");
  }, { git: "fake", stories: ["01"], commit: { "src/present.mjs": "export const present = 1;\n" } });
}

// The cases on the model are exactly MOVED, each under its own name, and every moved suite is registered,
// so the gate runs each case under the port the rule assigns it.
async function movedSetIsPinned() {
  const sites = await caseSites(MOVED_SUITES);
  const moved = sites.filter((site) => /git: "fake"/u.test(site.body)).map((site) => [site.file, site.name]);
  assert.deepEqual(moved, MOVED, "the cases on the model are exactly the moved set, each under its own name");
  for (const file of MOVED_SUITES) {
    const names = sites.filter((site) => site.file === file).map((site) => site.name);
    assert.equal(new Set(names).size, names.length, `${file}: every case name is unique`);
  }
  for (const [index, files] of Object.entries(MOVED_SUITE_INDEXES)) {
    const text = await readFile(path.join(repoRoot, index), "utf8");
    for (const file of files) assert.ok(text.includes(`./${path.basename(file)}`), `${file} is registered in ${index}`);
  }
}
