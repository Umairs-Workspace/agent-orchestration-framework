// FF-13104 + FF-13105 — AN ANSWER REACHES A SESSION ONLY AS A RESUMED COMMAND, AND A WAITING LANE
// DOES NOT HALT THE WAVE (milestone 131 / story 06; ARCHITECTURE `## Fitness functions`, ADR-001,
// ADR-003 §7, ADR-004). Which of this directory's three subjects: the LADDER — what the loop does
// with a drive that stopped to ask: it waits in the run's owner, resumes the same session with the
// answer typed, and parks at the bound, while every other lane keeps building.
//
// FF-13104, structural. `src/mesh/terminal-input.mjs`, `src/terminal-ws.mjs` and the driver import
// neither `src/loop/ask-request.mjs` nor `src/loop/ask.mjs` (resolved specifiers, through
// `test/support/module-family.mjs`), and `src/commands/resume.mjs` imports no terminal-input
// module: the live-PTY wait is not built (ADR-001 §2). The driver has no branch that skips
// `stopForOutcome` for `needs-input`: it compares no outcome against the word, and every
// `"needs-input"` it spells outside its transcript mapping (`readTranscriptTerminalOutcome`) is an
// argument of `stopForOutcome(`. Fixture: `work:drive-continue` with `--answer` whose `runId` or
// session is not the lent run's refuses `drive-answer-not-own` before any mint or spawn; with its
// own run, the fake PTY (the drive suite's, `test/support/mesh-worker-terminal-fixture.mjs`)
// receives `--resume <the ask's session>` and a typed body byte-identical to the answer.
//
// FF-13105, fixture over `test/support/loop/lane-fixture.mjs` — 03's lane harness, never a second
// one. Two lanes, `07/01` answering needs-input: `07/03` merges while `07/01` waits; the waiting
// lane's record carries the open ask and a heartbeat newer than it, and `waiting on you` is
// narrated; writing `answered` re-drives the lane's child with `--answer` on the same run, it
// settles and merges, and the ask file is gone. With the fixture's immediate-park wait the lane
// closes parked and unmerged, `session-parked-unanswered` is posted once, and the halt is
// `session-needs-input` only after `07/03` merged. Structural: `haltDecision("session-needs-input"`
// is spelled only inside `ask.mjs`'s `parkedHalt`; the sites task 00 ruling 5 names each call
// `awaitAnswer(` — the shell, `cycle.mjs`'s retry ladder and verify branch, and `wave.mjs`'s lane
// branch, with the `--resume` re-entry allowed as a fifth — and nothing else calls it.
// `LOOP_STOPS` is unchanged.
//
// Every sweep reports what it read; every cut is on the language's own structure through
// `test/support/source-slice.mjs`.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Readable } from "node:stream";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";
import { functionBody, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { createFakePtySpawn, createFakeWhich } from "../../support/mesh-worker-terminal-fixture.mjs";
import {
  collector,
  emits,
  fakeLaneChild,
  fakeSignals,
  fakeTimers,
  git,
  laneCtx,
  passingTap,
  primaryDriver,
  stubRubric,
  verifyCompleter,
  withLaneRepo,
} from "../../support/loop/lane-fixture.mjs";
import { getCommand } from "../../../src/command-core.mjs";
import { runLoopBody } from "../../../src/commands/loop.mjs";
import { resolveItemExact } from "../../../src/commands/resolve.mjs";
import { transitionRunStart } from "../../../src/effects/run-transitions.mjs";
import { answerAsk, askRequestPath, loopAsksDir, openAsk, readAsk, readAsks } from "../../../src/loop/ask-request.mjs";
import { meshDispatchWorktreePath } from "../../../src/mesh/worktree.mjs";
import { readRuns, recordSessionId } from "../../../src/run-store.mjs";
import { claudeProjectsDir } from "../../../src/work/observe.mjs";
import { resolveRefInWorktree } from "../../../src/work/dispatch.mjs";
import { LOOP_STOPS } from "../../../src/work/loop.mjs";
import { resolveWorkspaceId } from "../../../src/workspace-identity.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const toPosix = (value) => String(value).split(path.sep).join("/");

const ASK_HOME = "src/loop/ask-request.mjs";
const ASK = "src/loop/ask.mjs";
const DRIVER = "src/agent-session-driver.mjs";
const RESUME = "src/commands/resume.mjs";
const TERMINAL_FACES = Object.freeze(["src/mesh/terminal-input.mjs", "src/terminal-ws.mjs", DRIVER]);
const TERMINAL_INPUT_RE = /(?:^|\/)terminal-input(?:[-.][^/]*)?\.mjs$/u;
const TRANSCRIPT_MAPPING = "async function readTranscriptTerminalOutcome(";
// Task 00 ruling 5: the sites that compose the wait, by file and enclosing top-level function.
const WAIT_SITES = Object.freeze([
  { file: "src/commands/loop.mjs", fn: "runLoopBody", what: "the shell" },
  { file: "src/loop/cycle.mjs", fn: "retryUntilTerminal", what: "cycle.mjs's retry ladder" },
  { file: "src/loop/cycle.mjs", fn: "settleStoryCycle", what: "cycle.mjs's verify branch" },
  { file: "src/loop/wave.mjs", fn: "runWaveBuild", what: "wave.mjs's lane branch" },
]);
const REENTRY_SITE = Object.freeze({ file: "src/loop/cycle.mjs", fn: "reenterPrimaryAsks", what: "the --resume re-entry" });
const HALT_SPELLING = 'haltDecision("session-needs-input"';
const PARKED_HALT = "export function parkedHalt(";
// The stop set as 130 delivered it — 131 adds none (ADR-004).
const LOOP_STOPS_AT_130 = Object.freeze([
  "uat-gate", "dependency-blocked", "cap-exhausted", "deadline-exhausted", "progress-exhausted", "no-progress",
  "grade-indeterminate", "session-needs-input", "run-not-retryable", "retry-parked", "unmapped-item-type",
  "operator-interrupt", "lane-open-failed", "lane-merge-refused", "lane-merge-conflict",
]);

function assertRead(what, count, floor, unit = "file(s)") {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} ${unit}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

function resolved(fromRel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return specifier;
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
  return joined.endsWith(".mjs") ? joined : `${joined}.mjs`;
}

async function srcUnits() {
  const units = [];
  for (const file of await readSrcFiles(repoRoot)) {
    const raw = await readFile(file.path, "utf8");
    units.push({ rel: `src/${toPosix(file.rel)}`, raw, code: stripComments(raw) });
  }
  return units;
}

const unitOf = (units, rel) => {
  const unit = units.find((entry) => entry.rel === rel);
  assert.ok(unit != null, `NOT FOUND: ${rel} is not under src/** — the control cannot claim anything about a module it did not read`);
  return unit;
};

const resolvedImports = (unit) => importSpecifiers(unit.code).map(({ specifier }) => resolved(unit.rel, specifier));

// The top-level function each index sits in (the last top-level declaration before it).
function enclosingTopLevel(code, index) {
  let owner = "<module>";
  for (const match of code.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gmu)) {
    if (match.index > index) break;
    owner = match[1];
  }
  return owner;
}

// Every call of `name(` that is not its own declaration: `{ rel, fn, at }`.
function callSites(units, name) {
  const sites = [];
  const re = new RegExp(`(?<![\\w$.])${name}\\s*\\(`, "gu");
  for (const { rel, code } of units) {
    for (const match of code.matchAll(re)) {
      const before = code.slice(Math.max(0, match.index - 16), match.index);
      if (/function\s*$/u.test(before)) continue;
      sites.push({ rel, fn: enclosingTopLevel(code, match.index), at: match.index });
    }
  }
  return sites;
}

// The driver's needs-input spellings that could skip the settle: an outcome COMPARED against the
// word, and a `"needs-input"` outside the transcript mapping that is not an argument of
// `stopForOutcome(`. PURE over the stripped source, so the self-check can plant the skip.
export function needsInputSkips(code) {
  const found = [];
  for (const match of code.matchAll(/(?:[!=]==?\s*["']needs-input["']|["']needs-input["']\s*[!=]==?|\bcase\s+["']needs-input["'])/gu)) {
    found.push(`a comparison: ${match[0]}`);
  }
  const mapping = functionBody(code, TRANSCRIPT_MAPPING);
  const mappingAt = mapping == null ? -1 : code.indexOf(mapping);
  const settles = [...code.matchAll(/\bstopForOutcome\s*\(/gu)]
    .map((match) => matchedParenSpan(code, match.index))
    .filter((span) => span != null);
  for (const match of code.matchAll(/["']needs-input["']/gu)) {
    if (mappingAt >= 0 && match.index > mappingAt && match.index < mappingAt + mapping.length) continue;
    if (settles.some((span) => match.index > span.open && match.index < span.close)) continue;
    const line = code.slice(code.lastIndexOf("\n", match.index) + 1, code.indexOf("\n", match.index)).trim();
    if (!found.some((entry) => entry.endsWith(line))) found.push(`outside stopForOutcome(: ${line}`);
  }
  return found;
}

async function refusalOf(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
}

// ── FF-13104's drive fixture: milestone 03, story 03/01, a lent running run on session S1 and an
// answered ask file for it — the drive suite's shape, driven through the registered command.
const ANSWER = "take option B\nand keep the tests";
const SUBMIT_KEY = String.fromCharCode(13);

async function withLentAnswer(body) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-arch-131-drive-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  const storyDir = path.join(workDir, "03_milestone_fixture", "stories", "01_story_ready");
  let runId = null;
  try {
    await mkdir(path.join(storyDir, "tasks"), { recursive: true });
    await writeFile(path.join(workDir, "03_milestone_fixture", "SPEC.md"), "---\ntype: milestone\nnumber: 3\nslug: fixture\ntitle: Fixture\nstatus: in-progress\ndepends: []\n---\n# Fixture\n");
    await writeFile(path.join(storyDir, "STORY.md"), "---\ntype: story\nnumber: 1\nslug: ready\ntitle: Ready\nparent: 3\nstatus: in-progress\ndepends: []\n---\n# Ready\n");
    await writeFile(path.join(storyDir, "tasks", "00_ready.feature"), "@executable\nFeature: Ready\n  Scenario: ready\n    Given a fixture\n    When it runs\n    Then it passes\n");
    const workspace = {
      projectRoot,
      workDir,
      configPath: path.join(projectRoot, ".aof", "aof.config.json"),
      config: { work: { dir: "wiki/work", autonomous: { maxAttempts: 3 } } },
    };
    const item = await resolveItemExact({ workspace }, "03/01");
    ({ record: { runId } } = await transitionRunStart(item, { now: new Date().toISOString() }));
    await recordSessionId(item, { runId, sessionId: "S1" });
    const env = { CLAUDE_CONFIG_DIR: path.join(projectRoot, ".claude-test") };
    const projects = claudeProjectsDir({ cwd: projectRoot, env });
    await mkdir(projects, { recursive: true });
    await writeFile(path.join(projects, "S1.jsonl"), `${JSON.stringify({ type: "assistant", message: { stop_reason: "end_turn", content: [{ type: "text", text: "Q\nNEEDS_INPUT" }] } })}\n`);
    const dir = loopAsksDir();
    await openAsk(dir, { runId, ref: "03/01", workspaceId: "w1", sessionId: "S1", phase: "build", question: "Q" });
    await answerAsk(dir, { workspaceId: "w1", ref: "03/01", text: ANSWER, by: { actor: "you", via: "cli", node: null } });
    return await body({ workspace, item, runId, file: askRequestPath(dir, runId), env });
  } finally {
    if (runId != null) await rm(askRequestPath(loopAsksDir(), runId), { force: true });
    await rm(projectRoot, { recursive: true, force: true });
  }
}

// The fake PTY, scripted as the drive suite scripts it: the body is one paste, the Enter submits
// and the session exits done.
function scriptedPty(sessionId = "S1") {
  const typed = [];
  const fake = createFakePtySpawn({
    onWrite: ({ chunk, rawChunk, emitExit }) => {
      if (rawChunk === SUBMIT_KEY) {
        emitExit(0);
        return;
      }
      typed.push(chunk.replace(/[\r\n]+$/u, ""));
    },
  });
  const options = {
    ptySpawn: fake.spawn,
    which: createFakeWhich(["claude"]),
    watchTranscriptSessionId: async () => sessionId,
    commandDelayMs: 0,
    submitDelayMs: 0,
    trustWorktree: async () => {},
  };
  return { ...fake, typed, options };
}

// ── FF-13105's lane fixture: one wave over 07 with every seam injected (03's `runWave`).
async function runWave(fx, { child, report, extra = {} }) {
  const driver = primaryDriver(fx, { onCommand: verifyCompleter(fx) });
  const ctx = laneCtx(fx, { child, rubric: stubRubric(emits(passingTap())), report, driver, timers: fakeTimers(), signals: fakeSignals(), now: new Date().toISOString(), extra });
  return await runLoopBody({ scope: fx.milestone }, ctx);
}

const HOOK = "https://discord.com/api/webhooks/131/arch";
function notifying(fx) {
  fx.workspace.config.work.notify = { channels: { ops: { type: "discord", urlEnv: "HOOK" } } };
  const posts = [];
  const fetch = async (url, init) => {
    posts.push(JSON.parse(init.body));
    return { status: 204, headers: { get: () => null }, json: async () => ({}) };
  };
  return { posts, notifyOptions: { env: { HOOK }, fetch } };
}
const asking = (sessionId = "s-1") => ({ outcome: "document", document: { outcome: "needs-input", sessionId } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mergedLine = (ref) => new RegExp(`^Lane ${ref.replace("/", "\\/")} — merge: (fast-forwarded|merged)`, "u");

export const archTests = [
  {
    name: "arch/131 FF-13104 (acd-loop-ask-waits-in-place): structural — the terminal faces and the driver import neither ask module, and resume.mjs imports no terminal-input module",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      for (const face of TERMINAL_FACES) {
        const reached = resolvedImports(unitOf(units, face)).filter((target) => target === ASK_HOME || target === ASK);
        assert.deepEqual(reached, [], `${face} imports neither src/loop/ask-request.mjs nor src/loop/ask.mjs — an answer reaches a session only as a resumed command, never through a live terminal (ADR-001 §2): it imports ${reached.join(", ")}`);
      }
      const resume = unitOf(units, RESUME);
      const imports = resolvedImports(resume);
      assertRead(`the import specifiers of ${RESUME}`, imports.length, 5, "specifier(s)");
      const terminal = imports.filter((target) => TERMINAL_INPUT_RE.test(target));
      assert.deepEqual(terminal, [], `src/commands/resume.mjs imports no terminal-input module — the verb writes the ask file, it never types into a PTY: ${terminal.join(", ")}`);
      assert.ok(TERMINAL_INPUT_RE.test("src/mesh/terminal-input.mjs"), "self-check: the terminal-input module is what the needle matches");
    },
  },
  {
    name: "arch/131 FF-13104 (acd-loop-ask-waits-in-place): structural — the driver has no branch that skips stopForOutcome for needs-input",
    run: async () => {
      const units = await srcUnits();
      const driver = unitOf(units, DRIVER);
      assert.ok(functionBody(driver.code, TRANSCRIPT_MAPPING) != null, `NOT FOUND: ${TRANSCRIPT_MAPPING} — the mapping the sweep exempts has moved`);
      const settled = [...driver.code.matchAll(/\bstopForOutcome\s*\(\s*\{\s*outcome:\s*["']needs-input["']/gu)].length;
      assertRead("the driver's needs-input settles", settled, 1, "site(s)");
      const skips = needsInputSkips(driver.code);
      assert.deepEqual(skips, [], `the driver has no branch that skips stopForOutcome for needs-input — found ${skips.join("; ")}. A needs-input drive kills its PTY and settles; a later answer continues through --resume (ADR-001 §1)`);
      // SELF-CHECK — a keep-alive branch is seen, the delivered settle is not.
      assert.ok(needsInputSkips('function f(r) { if (r.outcome === "needs-input") return; stopForOutcome({ outcome: "needs-input" }); }').some((entry) => entry.startsWith("a comparison")), "self-check: a comparison that keeps the PTY alive is seen");
      assert.equal(needsInputSkips('function f() { resolve({ outcome: "needs-input" }); }').length, 1, "self-check: a needs-input resolved around the settle is seen");
      assert.equal(needsInputSkips('function f() { stopForOutcome({ outcome: "needs-input" }); }').length, 0, "self-check: the delivered settle is clean");
    },
  },
  {
    name: "arch/131 FF-13104 (acd-loop-ask-waits-in-place): fixture — work:drive-continue with an --answer that is not the lent run's own refuses drive-answer-not-own before any mint or spawn",
    run: async () => {
      const command = getCommand("work:drive-continue");
      assert.ok(command != null, "NOT FOUND: work:drive-continue is not registered");
      for (const [label, over] of [["a foreign run", { runId: "20260925T000000000Z-9999" }], ["a foreign session", { sessionId: "S2" }]]) {
        await withLentAnswer(async ({ workspace, item, runId, file }) => {
          const record = JSON.parse(await readFile(file, "utf8"));
          await writeFile(file, JSON.stringify({ ...record, ...over }, null, 2));
          const before = JSON.stringify(await readRuns(item));
          const pty = scriptedPty();
          const stdin = new Readable({ read() {} });
          let resumed = false;
          stdin.resume = () => { resumed = true; return stdin; };
          const error = await refusalOf(command.run({ ref: "03/01", run: runId, answer: file }, { workspace, agentSessionDriverOptions: pty.options, stdin }));
          assert.equal(error?.code, "drive-answer-not-own", `${label}: work:drive-continue refuses drive-answer-not-own before any mint or spawn — it answered ${error?.code ?? "no refusal"} (${error?.message ?? "it ran"})`);
          assert.equal(pty.spawnCalls.length, 0, `${label}: refuses drive-answer-not-own before any mint or spawn — the PTY was spawned`);
          assert.equal(resumed, false, `${label}: stdin was never resumed`);
          assert.equal(JSON.stringify(await readRuns(item)), before, `${label}: refuses drive-answer-not-own before any mint or spawn — the runs changed`);
        });
      }
    },
  },
  {
    name: "arch/131 FF-13104 (acd-loop-ask-waits-in-place): fixture — with its own run, the fake PTY receives --resume <the ask's session> and a typed body byte-identical to the answer",
    run: async () => {
      await withLentAnswer(async ({ workspace, item, runId, file, env }) => {
        const pty = scriptedPty("S1");
        await getCommand("work:drive-continue").run({ ref: "03/01", run: runId, answer: file }, { workspace, agentSessionDriverOptions: { ...pty.options, env }, stdin: new Readable({ read() {} }) });
        assert.equal(pty.spawnCalls.length, 1, "one session was spawned");
        const args = pty.spawnCalls[0].args;
        const at = args.indexOf("--resume");
        assert.deepEqual(args.slice(at, at + 2), ["--resume", "S1"], `the session resumed is the ask's own: ${args.join(" ")}`);
        assert.deepEqual(pty.typed, [ANSWER], "the typed body is the answer, byte for byte");
        const runs = await readRuns(item);
        assert.deepEqual(runs.map((run) => [run.runId, run.state]), [[runId, "running"]], "no run was minted, and the lent run is still running");
      });
    },
  },
  {
    name: "arch/131 FF-13105 (acd-loop-ask-waits-in-place): fixture — one lane asks and the other merges while it waits; the waiting record carries the ask and a newer heartbeat, waiting on you is narrated, and the answer re-drives the same run with --answer and clears the file",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const { notifyOptions } = notifying(fx);
        const child = fakeLaneChild(fx, { answers: { "07/01": [asking(), undefined] } });
        const report = collector();
        let checks = 0;
        let waiting = null;
        const wait = {
          now: () => new Date(),
          read: (runId) => readAsk(loopAsksDir(), runId),
          expired: () => false,
          next: async () => {
            checks += 1;
            await sleep(10);
            if (checks < 2 || !report.lines.some((line) => mergedLine("07/03").test(line))) return;
            if (waiting == null) {
              const laneItem = await resolveRefInWorktree(fx.root, fx.workDir, meshDispatchWorktreePath(fx.root, "07/01"), "07/01");
              waiting = (await readRuns(laneItem)).find((run) => run.state === "running") ?? null;
            }
            const workspaceId = resolveWorkspaceId(fx.workspace);
            for (const ask of await readAsks(loopAsksDir(), { workspaceId })) {
              if (ask.ref === "07/01" && ask.answer == null) await answerAsk(loopAsksDir(), { workspaceId, ref: ask.ref, text: "use the existing seam", by: { actor: "umami", via: "cli", node: null } });
            }
          },
        };
        const state = await runWave(fx, { child, report, extra: { askWait: wait, notifyOptions } });
        assert.equal(state.state, "done", report.lines.join("\n"));
        const mergedAt = (ref) => report.lines.findIndex((line) => mergedLine(ref).test(line));
        assert.ok(mergedAt("07/03") > -1 && mergedAt("07/03") < mergedAt("07/01"), `the other lane closes and merges while 07/01 waits:\n${report.lines.join("\n")}`);
        assert.ok(report.lines.some((line) => line.includes("07/01 — waiting on you")), "waiting on you is narrated");

        assert.ok(waiting != null, "the waiting lane's record was read while it waited");
        const ask = waiting.asks.at(-1);
        assert.ok(ask != null && ask.answeredAt == null && typeof ask.askedAt === "string", `the waiting lane's record carries the open ask: ${JSON.stringify(waiting.asks)}`);
        assert.ok(Date.parse(waiting.heartbeatAt) > Date.parse(ask.askedAt), `…and a heartbeat newer than the ask: heartbeatAt ${waiting.heartbeatAt}, askedAt ${ask.askedAt}`);

        const spawns = child.calls.filter((call) => call.ref === "07/01");
        assert.equal(spawns.length, 2, "the answer re-drives the lane's own child");
        assert.equal(spawns[1].runId, spawns[0].runId, "…on the same run");
        assert.equal(spawns[1].answerFile, askRequestPath(loopAsksDir(), spawns[0].runId), "…with --answer <its ask file>");
        assert.equal(await readAsk(loopAsksDir(), spawns[0].runId), null, "the ask file is gone");
        assert.ok(!existsSync(meshDispatchWorktreePath(fx.root, "07/01")), "the answered lane merged and was cleaned up");
        const settled = (await readRuns(await resolveItemExact({ workspace: fx.workspace }, "07/01"))).find((run) => run.runId === spawns[0].runId);
        assert.equal(settled?.state, "done", `the answered run settles done — it reads ${settled?.state ?? "absent"}`);
        assert.ok(settled.asks.at(-1)?.answeredAt != null, "…with its ask answered on the record");
      });
    },
  },
  {
    name: "arch/131 FF-13105 (acd-loop-ask-waits-in-place): fixture — with an immediate-park wait the lane closes parked and unmerged, session-parked-unanswered is posted once, and the halt is session-needs-input only after the other lane merged",
    run: async () => {
      await withLaneRepo(async (fx) => {
        const { posts, notifyOptions } = notifying(fx);
        const child = fakeLaneChild(fx, { answers: { "07/01": asking(), "07/03": async () => { await sleep(30); return undefined; } } });
        const report = collector();
        // No `askWait` in `extra`: `laneCtx`'s own is the fixture's immediate park.
        const state = await runWave(fx, { child, report, extra: { notifyOptions } });
        assert.equal(state.act?.stop, "session-needs-input", report.lines.join("\n"));
        assert.equal(state.act?.ref, "07/01");
        const haltAt = report.lines.findLastIndex((line) => line.includes(" — halted on "));
        const mergedAt = report.lines.findIndex((line) => mergedLine("07/03").test(line));
        assert.ok(mergedAt > -1 && mergedAt < haltAt, `the halt is session-needs-input only after the other lane merged:\n${report.lines.join("\n")}`);

        const lane = meshDispatchWorktreePath(fx.root, "07/01");
        assert.ok(existsSync(lane), "the parked lane's worktree is kept");
        assert.notEqual((await git(["merge-base", "--is-ancestor", "aof/mesh/07-01", "HEAD"], fx.root)).status, 0, "…and its branch is unmerged");
        const [run] = await readRuns(await resolveRefInWorktree(fx.root, fx.workDir, lane, "07/01"));
        assert.ok(run.asks.at(-1)?.parkedAt != null && run.asks.at(-1)?.answeredAt == null, "the lane closes parked: one parked, unanswered ask");
        assert.equal((await readAsk(loopAsksDir(), run.runId))?.state, "parked");
        const parked = posts.filter((post) => post.content.includes("parked, unanswered"));
        assert.equal(parked.length, 1, `session-parked-unanswered is notified once — posted ${parked.length} time(s)`);
        assert.ok(parked[0].content.includes("07/01"));
      });
    },
  },
  {
    name: "arch/131 FF-13105 (acd-loop-ask-waits-in-place): structural — session-needs-input reaches haltDecision only inside ask.mjs's parkedHalt, and LOOP_STOPS is unchanged",
    run: async () => {
      const units = await srcUnits();
      assertRead("the src/** sweep", units.length, 150);
      const ask = unitOf(units, ASK);
      const parkedHalt = functionBody(ask.code, PARKED_HALT);
      assert.ok(parkedHalt != null && parkedHalt.includes(HALT_SPELLING), `NOT FOUND: ${PARKED_HALT} spelling ${HALT_SPELLING} — the one spelling has moved`);
      const start = ask.code.indexOf(parkedHalt);
      const strays = [];
      for (const { rel, code } of units) {
        for (let at = code.indexOf(HALT_SPELLING); at !== -1; at = code.indexOf(HALT_SPELLING, at + 1)) {
          if (rel === ASK && at > start && at < start + parkedHalt.length) continue;
          strays.push(`${rel} (in ${enclosingTopLevel(code, at)})`);
        }
      }
      assert.deepEqual(strays, [], `"session-needs-input" reaches haltDecision only inside ask.mjs's parkedHalt — spelled in ${strays.join(", ")}. Route the halt through parkedHalt (ADR-004)`);
      assert.deepEqual([...LOOP_STOPS], [...LOOP_STOPS_AT_130], "LOOP_STOPS is unchanged — a waiting lane adds no stop (ADR-004)");
    },
  },
  {
    name: "arch/131 FF-13105 (acd-loop-ask-waits-in-place): structural — each site under ruling 5 calls awaitAnswer(, the --resume re-entry is the one allowed fifth, and nothing else calls it",
    run: async () => {
      const units = await srcUnits();
      const calls = callSites(units, "awaitAnswer");
      assertRead("the awaitAnswer( call sites", calls.length, WAIT_SITES.length, "site(s)");
      for (const site of WAIT_SITES) {
        assert.ok(calls.some(({ rel, fn }) => rel === site.file && fn === site.fn), `${site.what} (${site.file} ${site.fn}) calls awaitAnswer( — every needs-input site composes the wait (ADR-004): sites found ${calls.map(({ rel, fn }) => `${rel}#${fn}`).join(", ")}`);
      }
      const allowed = [...WAIT_SITES, REENTRY_SITE];
      const others = calls.filter(({ rel, fn }) => !allowed.some((site) => site.file === rel && site.fn === fn));
      assert.deepEqual(others.map(({ rel, fn }) => `${rel}#${fn}`), [], "awaitAnswer( is called only at the named sites and the --resume re-entry");
    },
  },
];
