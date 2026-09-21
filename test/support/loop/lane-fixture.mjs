// test/support/loop/lane-fixture.mjs — THE WAVE'S FIXTURE (milestone 129 / story 04): a REAL
// git repo carrying milestone `07`, a committed `.aof/aof.config.json` with the rubric and
// `work.loop.concurrency: "refine_first"`, and the seams the wave is driven through —
// the child (`ctx.spawnLaneDrive`), git (`ctx.exec`, real by default), the registry
// (`ctx.invokeRegistered`, real by default with scripted `work:grade` / `work:validate` /
// `work:doctor` answers recording the workspace they were asked in), the clock, the timers
// and the signal source.
//
// WHY A REAL REPO. Every claim the wave makes is a claim about what `git worktree` does: that a
// lane's run record lands in the LANE and not the primary until the merge, that a merge is a
// fast-forward when the primary did not move, that a conflict leaves the lane intact. A scripted
// git would assert the fixture's opinion of git (the `dispatch-lane-fixture` lesson, kept).
//
// Born in the subject directory `test/support/loop/` because `test/support` is at its ceiling
// (the budget row asks exactly this of the next helper).
import { mkdtemp, mkdir, writeFile, rm, realpath, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import os from "node:os";
import path from "node:path";

import { loadWorkspace } from "../../../src/work.mjs";
import { resolveRefInWorktree } from "../../../src/work/dispatch.mjs";
import { createFakePtySpawn, createFakeWhich } from "../mesh-worker-terminal-fixture.mjs";
import { createStopSource, loopStopsDir } from "../../../src/loop/stop-request.mjs";

// git(args, cwd) — argv form only, never a shell string.
export function git(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }, (error, stdout, stderr) => {
      if (error && (error.code === "ENOENT" || error.killed || error.signal)) reject(error);
      else resolve({ stdout: String(stdout ?? ""), stderr: String(stderr ?? ""), status: error ? (typeof error.code === "number" ? error.code : 1) : 0 });
    });
  });
}

// The `exec(args, { cwd })` seam `src/mesh/worktree.mjs` reads — real git, with the fixture's
// own identity so a commit under the mesh identity and one under the fixture's both land.
export const realExec = (args, { cwd }) => git(args, cwd);

function frontmatter(fields) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`).join("\n")}\n---\n`;
}

const FEATURE = `@executable
Feature: Ready
  Scenario: ready
    Given a fixture
    When it runs
    Then it passes
`;

export const MILESTONE = "07";
export const MILESTONE_SLUG = "07_milestone_wave";

/**
 * withLaneRepo(body, options) — an initialised repo carrying milestone `07` with `stories`
 * (each `{ number, status, tasks, files, depends }`, defaults: not-started, one task feature,
 * a disjoint `files:` entry), committed on `main`.
 *
 *   options.rubric   — `true` (default) declares `work.rubric` running `runner.cjs`; `false`
 *                      declares none
 *   options.config   — merged into `work`
 *   options.commit   — extra files `{ "path": "body" }` committed with the stream
 */
export async function withLaneRepo(body, { stories = ["01", "03"], rubric = true, config = {}, commit = {}, milestone = MILESTONE } = {}) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-lane-")));
  try {
    await git(["init", "-b", "main"], root);
    await git(["config", "user.email", "fixture@aof.test"], root);
    await git(["config", "user.name", "aof fixture"], root);
    await git(["config", "core.autocrlf", "false"], root);

    const workDir = path.join(root, "wiki", "work");
    const milestoneDir = path.join(workDir, `${milestone}_milestone_wave`);
    await mkdir(milestoneDir, { recursive: true });
    await writeFile(path.join(milestoneDir, "SPEC.md"), `${frontmatter({
      type: "milestone", number: milestone, slug: "wave", status: "in-progress",
      title: '"Wave"', created: "2026-09-01", updated: "2026-09-01", schema: 1,
    })}# 07 · Wave\n`, "utf8");
    await writeFile(path.join(milestoneDir, "STATE.md"), "---\ndoc: state\n---\n# State\n\n## Notes\n", "utf8");
    const storyDirs = new Map();
    for (const story of stories) {
      const spec = typeof story === "string" ? { number: story } : story;
      const number = spec.number;
      const dir = path.join(milestoneDir, "stories", `${number}_story_s${number}`);
      storyDirs.set(`${milestone}/${number}`, dir);
      await mkdir(path.join(dir, "tasks"), { recursive: true });
      await writeFile(path.join(dir, "STORY.md"), `${frontmatter({
        type: "story", number, slug: `s${number}`, parent: milestone, status: spec.status ?? "not-started",
        title: `"Story ${number}"`, created: "2026-09-01", updated: "2026-09-01", schema: 1,
        ...(spec.depends ? { depends: spec.depends } : {}),
        files: spec.files ?? [`src/s${number}.mjs`],
      })}# Story ${number}\n`, "utf8");
      if (spec.tasks !== false) await writeFile(path.join(dir, "tasks", "00_ready.feature"), FEATURE, "utf8");
    }

    await mkdir(path.join(root, ".aof"), { recursive: true });
    const work = {
      dir: "./wiki/work",
      loop: { concurrency: "refine_first", ...(config.loop ?? {}) },
      autonomous: { maxAttempts: 3, ...(config.autonomous ?? {}) },
      ...(rubric ? { rubric: { command: [process.execPath, "runner.cjs"], report: { format: "tap", path: "report.tap", floor: 1 } } } : {}),
      ...Object.fromEntries(Object.entries(config).filter(([key]) => !["loop", "autonomous"].includes(key))),
    };
    await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "lane-fixture", work }, null, 2)}\n`, "utf8");
    await writeFile(path.join(root, "runner.cjs"), "process.stdout.write('TAP version 13\\n1..0\\n');\n", "utf8");
    for (const [rel, text] of Object.entries(commit)) {
      await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
      await writeFile(path.join(root, rel), text, "utf8");
    }
    // `.aof/mesh/` is runtime state: a materialised lane must never show as an uncommitted
    // change of the origin tree.
    await writeFile(path.join(root, ".gitignore"), ".aof/mesh/\n", "utf8");
    await git(["add", "-A"], root);
    await git(["commit", "-q", "-m", "fixture: the stream"], root);

    const workspace = await loadWorkspace(root);
    return await body({ root, workDir, milestoneDir, storyDirs, workspace, milestone, storyDir: (ref) => storyDirs.get(ref) });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

export async function headSha(root) {
  return (await git(["rev-parse", "HEAD"], root)).stdout.trim();
}

export async function replaceStatus(file, status) {
  const body = await readFile(file, "utf8");
  await writeFile(file, body.replace(/^status: .*$/mu, `status: ${status}`), "utf8");
}

export async function statusOf(file) {
  return /^status: (.*)$/mu.exec(await readFile(file, "utf8"))?.[1] ?? null;
}

// The story's STORY.md AS IT LIVES IN A LANE.
export async function laneStoryFile(fx, lane, ref) {
  const item = await resolveRefInWorktree(fx.root, fx.workDir, lane, ref);
  return item == null ? null : path.join(item.dir, "STORY.md");
}

/**
 * fakeLaneChild({ answers, onSpawn }) — a recording `spawnLaneDrive`. By default it does what a
 * child `/aof:continue` session does at its close — moves the LANE's STORY.md to `in-review` —
 * and answers a `done` document with `sessionId` `s-<ref>`. `answers[ref]` scripts the
 * answer(s) for one member: a single answer, an array consumed call by call (the last repeating),
 * or a function of the call. `pause[ref]` is a promise the child awaits AFTER the status move,
 * so a test can inspect the lane mid-flight and then release it.
 */
export function fakeLaneChild(fx, { answers = {}, pause = {}, onSpawn } = {}) {
  const calls = [];
  const counts = new Map();
  const spawn = async (input) => {
    const at = counts.get(input.ref) ?? 0;
    counts.set(input.ref, at + 1);
    calls.push({ ...input });
    onSpawn?.(input, at);
    const scripted = answers[input.ref];
    const answer = typeof scripted === "function"
      ? await scripted(input, at)
      : Array.isArray(scripted)
        ? scripted[Math.min(at, scripted.length - 1)]
        : scripted;
    if (answer === undefined || answer?.outcome === "document" && answer?.document?.outcome === "done") {
      const file = await laneStoryFile(fx, input.lane, input.ref);
      if (file != null && existsSync(file)) await replaceStatus(file, "in-review");
    }
    if (pause[input.ref] != null) await pause[input.ref];
    if (answer === undefined) {
      return { outcome: "document", document: { outcome: "done", sessionId: `s-${input.ref}`, settlementContext: {} }, exitCode: 0, stderrTail: [] };
    }
    return { exitCode: null, stderrTail: [], document: null, ...answer };
  };
  spawn.calls = calls;
  return spawn;
}

/** A deferred: `{ promise, resolve }` — the pause a test releases. */
export function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

// TAP shapes for the stubbed rubric spawn (the `loop-grade-fixture` family's).
export const passingTap = (names = ["alpha"]) => `TAP version 13\n${names.map((name, index) => `ok ${index + 1} - ${name}`).join("\n")}\n1..${names.length}\n`;
export const failingTap = (failing = [["beta", "beta did not close"]], passing = ["alpha"]) => {
  const lines = ["TAP version 13"];
  let ordinal = 0;
  for (const name of passing) lines.push(`ok ${++ordinal} - ${name}`);
  for (const [name, message] of failing) lines.push(`not ok ${++ordinal} - ${name}`, "  ---", `  error: '${message}'`, "  ...");
  lines.push(`1..${ordinal}`);
  return `${lines.join("\n")}\n`;
};
export const emits = (text, status = 0) => ({ status, stdout: text, stderr: "", error: null, signal: null });

/**
 * stubRubric(plan) — a recording `spawnRubric` for the REAL `work:grade`: `plan(call)` or an
 * array read call by call; every call records `options.cwd` — the workspace the grade ran in.
 */
export function stubRubric(plan) {
  const calls = [];
  const spawn = (program, args, options) => {
    const at = calls.length;
    calls.push({ program, args, options, cwd: options?.cwd ?? null });
    const answer = typeof plan === "function" ? plan(at, options) : Array.isArray(plan) ? plan[Math.min(at, plan.length - 1)] : plan;
    return typeof answer === "function" ? answer(at) : answer;
  };
  spawn.calls = calls;
  return spawn;
}

/**
 * scriptedRegistry({ grade, validate, doctor, next, dispatch }) — an `invokeRegistered` seam.
 * Each key, when given, is `(input, ctx, real) => answer` and is recorded with the workspace root
 * it was asked in; anything not scripted goes to the real registry.
 */
export function scriptedRegistry(scripts = {}) {
  const calls = [];
  const ids = { grade: "work:grade", validate: "work:validate", doctor: "work:doctor", next: "work:next", dispatch: "work:dispatch", tasks: "work:tasks" };
  const seam = async (id, input, ctx) => {
    const { invoke } = await import("../../../src/command-core.mjs");
    const real = () => invoke(id, input, ctx);
    const key = Object.entries(ids).find(([, value]) => value === id)?.[0];
    const script = key == null ? undefined : scripts[key];
    calls.push({ id, input, projectRoot: ctx?.workspace?.projectRoot ?? null });
    if (typeof script !== "function") return await real();
    return await script(input, ctx, real);
  };
  seam.calls = calls;
  seam.of = (id) => calls.filter((call) => call.id === id);
  return seam;
}

/** A capturing report/narrate collector. */
export function collector() {
  const lines = [];
  const report = (line) => { lines.push(String(line)); };
  report.lines = lines;
  report.matching = (needle) => lines.filter((line) => line.includes(needle));
  return report;
}

/** Injected timers: `fire()` runs every armed interval once; `advance(ms)` fires per elapsed period. */
export function fakeTimers() {
  const armed = new Map();
  let seq = 0;
  return {
    setInterval(fn, ms) { const id = ++seq; armed.set(id, { fn, ms, handle: { unref() { return this; } } }); return { id, unref() { return this; } }; },
    clearInterval(handle) { armed.delete(handle?.id); },
    armed,
    async fire() { for (const { fn } of armed.values()) await fn(); },
    async advance(ms) { for (const { fn, ms: period } of armed.values()) { for (let i = 0; i < Math.floor(ms / period); i += 1) await fn(); } },
  };
}

/** A signal source the wave subscribes to — `raise("SIGINT")` delivers to every listener. */
export function fakeSignals() {
  const emitter = new EventEmitter();
  return {
    on: (event, fn) => emitter.on(event, fn),
    off: (event, fn) => emitter.off(event, fn),
    raise: (event) => emitter.emit(event),
    listeners: (event) => emitter.listenerCount(event),
  };
}

/**
 * primaryDriver(fx, { onCommand }) — the fake PTY driver for the drives the shell makes in the
 * PRIMARY (refine, verify). Completes every command; `onCommand` sees the directive and may
 * move a status (a verify's `done`).
 */
export function primaryDriver(fx, { onCommand } = {}) {
  const typed = [];
  const fake = createFakePtySpawn({
    onWrite({ chunk, emitExit }) {
      const command = chunk.replace(/[\r\n]+$/u, "");
      typed.push(command);
      onCommand?.(command.split("\n\n")[0]);
      emitExit(0);
    },
  });
  return {
    typed,
    directives: () => typed.map((line) => line.split("\n\n")[0]),
    spawnCalls: fake.spawnCalls,
    options: {
      ptySpawn: fake.spawn,
      which: createFakeWhich(["claude"]),
      watchTranscriptSessionId: async () => `session-${typed.length}`,
      commandDelayMs: 0,
    },
  };
}

/** The `/aof:verify <ref>` completer: moves the item to `done` when its verify is driven. */
export function verifyCompleter(fx) {
  return async (command) => {
    const match = /^\/aof:verify (\S+)$/u.exec(command);
    if (match == null) return;
    const ref = match[1];
    const file = ref === (fx.milestone ?? MILESTONE) ? path.join(fx.milestoneDir, "SPEC.md") : path.join(fx.storyDir(ref), "STORY.md");
    if (existsSync(file)) await replaceStatus(file, "done");
  };
}

/** The loop ctx for one run: the fixture's workspace plus every injected seam. */
export function laneCtx(fx, { child, registry, rubric, driver, report, timers, signals, now, exec = realExec, extra = {} } = {}) {
  return {
    workspace: fx.workspace,
    exec,
    ...(child == null ? {} : { spawnLaneDrive: child }),
    ...(registry == null ? {} : { invokeRegistered: registry }),
    ...(rubric == null ? {} : { spawnRubric: rubric }),
    ...(driver == null ? {} : { agentSessionDriverOptions: driver.options }),
    ...(report == null ? {} : { report }),
    ...(timers == null ? {} : { waveTimers: timers }),
    // 130/02 — the wave reads the shell's ONE stop source (130/ADR-001 §5-§6), so a suite raising
    // signals hands them to a REAL source over its emitter double: `ctx.stopSource` is the seam,
    // the file half reads the isolated aof home (absent → level 0), no interval is armed.
    ...(signals == null ? {} : { stopSource: createStopSource({ loopRunId: "wave-under-test", dir: loopStopsDir(), process: signals, pollMs: 0 }) }),
    ...(now == null ? {} : { now }),
    ...extra,
  };
}
