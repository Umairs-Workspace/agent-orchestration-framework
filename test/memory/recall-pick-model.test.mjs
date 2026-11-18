// Milestone 201 / story 01 — the pick is a model call a project can see and set (ADR-004).
//
//   00_the-pick-asks-claude-once-from-outside-the-project.feature   R1
//   01_a-model-that-cannot-answer-leaves-the-lexical-block.feature  R2
//   02_a-project-sets-the-pick.feature                              R3
//
// Every case runs the REAL CLI in a scratch project with its own global home, over an index built
// by `aof memory ingest`, against a STAND-IN `claude` named through `AOF_RECALL_PICK_EXECUTABLE`
// (packages/execution/test/fixtures/claude-stand-in.mjs). The stand-in logs how it was started and
// what it was sent, and answers as each scenario says. No case starts the real `claude`.
//
// RANK IS THE RANKER'S: "the record ranked 3rd" is the third record of an unpicked
// `recall --all --json` over the same project, never a position this file computed.
//
// R4's cases (`aof memory status`, `aof project show`) are in memory-status.test.mjs and
// test/command/config-inspect.test.mjs, over the fixture this file exports.
import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../support/cli-spawn.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
export const STAND_IN = path.join(repoRoot, "packages", "execution", "test", "fixtures", "claude-stand-in.mjs");
export const PICK_EXECUTABLE = "AOF_RECALL_PICK_EXECUTABLE";

const QUERY = "worktree junction";
const missLine = (code, count = 5) => `[memory] pick unavailable (${code}) — this block is the lexical top ${count}; records intact.\n`;

// ---------------------------------------------------------------- fixture ----

// A scratch project whose retrospective holds `lessons` lessons that all say the query, ranked in
// the order written: each is longer than the one before, and the first carries the query in its
// title. `memory` is the config's memory node. `run(args, { env, pick })` runs the CLI there:
//   pick: "stand-in" (the default) names the stand-in; "none" names nothing and empties PATH, so no
//   `claude` resolves; any other string is the executable to name.
// It answers { status, stdout, stderr, elapsedMs, log, starts, stdin }, the last three read from
// the stand-in's own log for that run.
export async function makePickProject({ lessons = 60, memory = { backend: "local" }, ingest = true } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-201-01-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-201-01-home-"));
  const scratch = await mkdtemp(path.join(os.tmpdir(), "aof-201-01-scratch-"));
  const emptyPath = path.join(scratch, "empty-path");
  await mkdir(emptyPath);
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const milestone = path.join(root, "wiki", "work", "39_milestone_fixture");
  await mkdir(milestone, { recursive: true });
  const writeConfig = (node) => writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" }, ...(node ? { memory: node } : {}) }, null, 2)}\n`, "utf8");
  await writeConfig(memory);
  await writeFile(path.join(milestone, "SPEC.md"), "---\ntype: milestone\nnumber: 39\nslug: fixture\nstatus: in-progress\ntitle: \"Fixture\"\ncreated: 2026-11-17\nupdated: 2026-11-17\nschema: 1\n---\n# 39 · Fixture\n", "utf8");
  const sections = Array.from({ length: lessons }, (_, index) => {
    const n = index + 1;
    return [
      `## R${n} — ${n === 1 ? "Worktree junction teardown" : `Cleanup step ${n}`}`, "",
      "- **Kind:** near-miss · **Area:** tooling · **Stage:** build · **Owner:** developer",
      `- **What happened:** a worktree junction was removed with its target${" and the cleanup ran again".repeat(n)}.`,
      "- **Lesson:** unlink the worktree junction first.", "",
    ].join("\n");
  });
  await writeFile(path.join(milestone, "RETROSPECTIVE.md"), ["---", "doc: retrospective", "---", "# 39 · Fixture — Retrospective", "", ...sections].join("\n"), "utf8");

  let runs = 0;
  function run(args, { env = {}, pick = "stand-in" } = {}) {
    const logFile = path.join(scratch, `stand-in-${runs += 1}.log`);
    const childEnv = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1", STAND_IN_LOG: logFile, ...env };
    delete childEnv[PICK_EXECUTABLE];
    if (pick === "stand-in") childEnv[PICK_EXECUTABLE] = STAND_IN;
    else if (pick === "none") childEnv.PATH = emptyPath;
    else childEnv[PICK_EXECUTABLE] = pick;
    const started = Date.now();
    const result = spawnCliSync(process.execPath, [cliPath, ...args], { cwd: root, encoding: "utf8", env: childEnv });
    const elapsedMs = Date.now() - started;
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", elapsedMs, logFile };
  }
  // What the stand-in logged for one run: every entry, its `start` entries, and the stdin it read.
  async function standIn(ran) {
    const log = (await readFile(ran.logFile, "utf8").catch(() => "")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const starts = log.filter((entry) => entry.start).map((entry) => entry.start);
    return { log, starts, stdin: log.find((entry) => "stdin" in entry)?.stdin ?? null };
  }
  if (ingest && memory?.backend && memory.backend !== "none") assert.equal(run(["memory", "ingest"]).status, 0, "the fixture ingests");
  const ranked = ingest && memory?.backend && memory.backend !== "none" ? JSON.parse(run(["memory", "recall", QUERY, "--all", "--json"]).stdout) : [];
  const dispose = async () => { for (const dir of [root, home, scratch]) await rm(dir, { recursive: true, force: true }); };
  return { root, home, scratch, ranked, run, standIn, writeConfig, dispose };
}

// The record ids a block's lines open with, in order.
export const blockIds = (stdout) => stdout.split("\n").filter(Boolean).map((line) => line.split(" ")[0]);
const ids = (records) => records.map((record) => record.id);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const within = (parent, child) => { const relative = path.relative(parent, child); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
const BLOCK = ["memory", "recall", QUERY, "--block"];

// One project for the cases that only vary what the stand-in does.
async function withProject(options, body) {
  const fx = await makePickProject(options);
  try { await body(fx); } finally { await fx.dispose(); }
}

export const recallPickModelTests = [
  // ===================================================================
  // 00_the-pick-asks-claude-once-from-outside-the-project.feature — R1
  // ===================================================================
  {
    name: "201/01 task 00 E1 + E2 + outline · one process is started at haiku with the query and 20 cards on stdin, no tools, outside the project, with nothing of the calling session, and its answer is the block",
    run: () => withProject({}, async (fx) => {
      const ran = fx.run(BLOCK, { env: { STAND_IN_ANSWER: "[3, 1]", CLAUDECODE: "1", CLAUDE_CODE_SSE_PORT: "4711" } });
      assert.equal(ran.status, 0, ran.stderr);
      const { starts, stdin } = await fx.standIn(ran);
      assert.equal(starts.length, 1, "the stand-in was started exactly once");
      const [{ argv, cwd, env }] = starts;
      assert.equal(argv[argv.indexOf("--model") + 1], "haiku", "it was asked for the model haiku");
      assert.ok(stdin.includes(`\nQuery: ${QUERY}\n`), "its stdin held the query");
      assert.ok(stdin.startsWith("You choose which memory records an agent reads"), "…after the pick's instruction, which rides stdin and no flag");
      assert.ok(!argv.some((arg) => /system-prompt/u.test(arg)), "the launch carries no system-prompt flag of either form");
      assert.deepEqual([...stdin.matchAll(/^\[(\d+)\] /gmu)].map((match) => Number(match[1])), Array.from({ length: 20 }, (_, index) => index + 1), "…and 20 numbered cards");
      assert.equal(argv[argv.indexOf("--tools") + 1], "", "it was given no tools");
      assert.ok(!within(fx.root, cwd), "its working directory is not the project and not inside it");
      assert.deepEqual(blockIds(ran.stdout), ids([fx.ranked[2], fx.ranked[0]]), "the block is the records ranked 3rd and 1st, in that order");
      assert.equal(ran.stderr, "");
      // E2 — nothing of the calling session reaches the child.
      assert.ok(!env.includes("CLAUDECODE") && !env.includes("CLAUDE_CODE_SSE_PORT"), "the stand-in's environment holds neither CLAUDECODE nor CLAUDE_CODE_SSE_PORT");
      assert.ok(env.includes("HOME") && env.includes("PATH"), "it still holds HOME and PATH");
      // Outline — what the launch asks for, and what it never asks for.
      assert.ok(argv.includes("-p") || argv.includes("--print"), "the arguments include --print or -p");
      assert.equal(argv[argv.indexOf("--output-format") + 1], "json", "the arguments include --output-format json");
      for (const flag of ["--no-session-persistence", "--strict-mcp-config", "--disable-slash-commands"]) assert.ok(argv.includes(flag), `the arguments include ${flag}`);
      for (const never of ["--bare", "--dangerously-skip-permissions"]) assert.ok(!argv.includes(never), `the arguments do not include ${never}`);
      assert.ok(!argv.some((arg) => arg.includes(QUERY) || arg.includes("was removed with its target")), "the arguments do not include the query or any card's text");
      assert.ok(stdin.includes("a worktree junction was removed with its target"), "non-vacuous: the card text the arguments lack is on stdin");
    }),
  },
  {
    // The feature's second When is a bare query miss. Under the local ranker that still shortlists
    // every survivor (201/00 task 00 E6 has the same defect), so the recall that needs no pick here
    // is the one with no record in scope.
    name: "201/01 task 00 · a recall that needs no pick starts no process: --json, and a block with no record in scope",
    run: () => withProject({}, async (fx) => {
      for (const args of [["memory", "recall", QUERY, "--json"], ["memory", "recall", "no record says this", "--kind", "no-such-kind", "--block"], ["memory", "recall", QUERY, "--block", "--all"], ["memory", "status"]]) {
        const ran = fx.run(args);
        assert.equal(ran.status, 0, ran.stderr);
        assert.equal((await fx.standIn(ran)).starts.length, 0, `aof ${args.join(" ")}: the stand-in was never started`);
      }
    }),
  },

  // ===================================================================
  // 01_a-model-that-cannot-answer-leaves-the-lexical-block.feature — R2
  // ===================================================================
  {
    name: "201/01 task 01 E4 + E7 · no claude on the node, and a claude that is only a shell shim: no process is started, the block is the 5 best-ranked records, and stderr names pick-unavailable at exit 0",
    run: () => withProject({}, async (fx) => {
      const shim = path.join(fx.scratch, "claude.cmd");
      await writeFile(shim, `#!/bin/sh\necho started >> "${path.join(fx.scratch, "shim-started")}"\n`, "utf8");
      await chmod(shim, 0o755);
      for (const [label, pick] of [["E4 no claude resolves on PATH", "none"], ["E7 claude resolves to claude.cmd", shim]]) {
        const ran = fx.run(BLOCK, { pick });
        assert.equal(ran.status, 0, `[${label}] the exit code is 0 (${ran.stderr})`);
        assert.deepEqual(blockIds(ran.stdout), ids(fx.ranked.slice(0, 5)), `[${label}] the block is the 5 best-ranked records`);
        assert.equal(ran.stderr, missLine("pick-unavailable"), `[${label}] stderr is the pick-unavailable line`);
        assert.equal((await fx.standIn(ran)).starts.length, 0, `[${label}] no process is started`);
      }
      assert.equal(await readFile(path.join(fx.scratch, "shim-started"), "utf8").catch(() => null), null, "the shim itself never ran");
    }),
  },
  {
    name: "201/01 task 01 E5 · a claude that does not answer in time is ended: with timeoutMs 1000 the command returns within 5 seconds, stderr names pick-timeout, and the stand-in is no longer running",
    run: () => withProject({ memory: { backend: "local", recall: { pick: { timeoutMs: 1000 } } } }, async (fx) => {
      // The five seconds are the pick's own: measured over what the same command costs with no pick
      // to make, so a loaded machine's slow process start is not read as a slow pick.
      const unpicked = fx.run(["memory", "recall", QUERY, "--json"]);
      const ran = fx.run(BLOCK, { env: { STAND_IN_DELAY_MS: "30000" } });
      assert.equal(ran.status, 0, ran.stderr);
      assert.ok(ran.elapsedMs - unpicked.elapsedMs < 5000, `the command returned in ${ran.elapsedMs} ms, ${ran.elapsedMs - unpicked.elapsedMs} ms more than a recall with no pick`);
      assert.ok(ran.elapsedMs < 30000, "…and well inside the 30 seconds the stand-in would have taken");
      assert.equal(ran.stderr, missLine("pick-timeout"));
      assert.deepEqual(blockIds(ran.stdout), ids(fx.ranked.slice(0, 5)));
      const { starts, log } = await fx.standIn(ran);
      assert.equal(starts.length, 1);
      for (let waited = 0; alive(starts[0].pid) && waited < 3000; waited += 50) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(alive(starts[0].pid), false, "the stand-in process is no longer running");
      assert.ok(!log.some((entry) => "answered" in entry), "it was ended before it answered");
    }),
  },
  {
    name: "201/01 task 01 E6 + outline + one attempt · what the model sends back, and what the recall makes of it — [2] | [] | a fenced array | prose | not JSON | an error result | no output | not executable | a signal | not signed in",
    run: () => withProject({}, async (fx) => {
      const notExecutable = path.join(fx.scratch, "claude-not-executable");
      await writeFile(notExecutable, "#!/bin/sh\necho '{}'\n", "utf8");
      await chmod(notExecutable, 0o644);
      const top = ids(fx.ranked.slice(0, 5));
      const rows = [
        { behaviour: "answers [2]", env: { STAND_IN_ANSWER: "[2]" }, block: [fx.ranked[1].id], names: null },
        { behaviour: "answers []", env: { STAND_IN_ANSWER: "[]" }, block: [], names: null },
        { behaviour: "answers a fenced array", env: { STAND_IN_ANSWER: "```json\n[4, 2]\n```" }, block: [fx.ranked[3].id, fx.ranked[1].id], names: null },
        { behaviour: "answers \"none of these apply\"", env: { STAND_IN_ANSWER: "none of these apply" }, block: top, names: "pick-unreadable" },
        { behaviour: "exits 0 with output that is not JSON", env: { STAND_IN_MODE: "not-json" }, block: top, names: "pick-unreadable" },
        { behaviour: "exits 0 with a JSON result marked as an error", env: { STAND_IN_MODE: "error-result" }, block: top, names: "pick-failed" },
        { behaviour: "exits 0 with no output", env: { STAND_IN_MODE: "no-output" }, block: top, names: "pick-unreadable" },
        { behaviour: "cannot be started (the file is not executable)", pick: notExecutable, block: top, names: "pick-failed", starts: 0 },
        { behaviour: "is ended by a signal before it answers", env: { STAND_IN_MODE: "signal" }, block: top, names: "pick-failed" },
        { behaviour: "E6 prints \"Not logged in\" and exits 1", env: { STAND_IN_MODE: "not-logged-in" }, block: top, names: "pick-failed" },
      ];
      for (const row of rows) {
        const ran = fx.run(BLOCK, { env: row.env ?? {}, ...(row.pick ? { pick: row.pick } : {}) });
        assert.equal(ran.status, 0, `[${row.behaviour}] the exit code is 0 (${ran.stderr})`);
        assert.deepEqual(blockIds(ran.stdout), row.block, `[${row.behaviour}] the block`);
        assert.equal(ran.stderr, row.names === null ? "" : missLine(row.names), `[${row.behaviour}] stderr ${row.names === null ? "is empty" : `names ${row.names}`}`);
        assert.equal((await fx.standIn(ran)).starts.length, row.starts ?? 1, `[${row.behaviour}] a miss costs one attempt: the stand-in was started exactly once`);
      }
    }),
  },

  // ===================================================================
  // 02_a-project-sets-the-pick.feature — R3
  // ===================================================================
  {
    name: "201/01 task 02 E8 + E9 · with no setting the pick is on at haiku; a project that turns it off starts no process, gets the 5 best-ranked records, and stderr is empty",
    run: () => withProject({}, async (fx) => {
      const on = fx.run(BLOCK, { env: { STAND_IN_ANSWER: "[2]" } });
      const asked = (await fx.standIn(on)).starts;
      assert.equal(asked.length, 1);
      assert.equal(asked[0].argv[asked[0].argv.indexOf("--model") + 1], "haiku", "[E8] the stand-in was asked for the model haiku");
      assert.deepEqual(blockIds(on.stdout), [fx.ranked[1].id], "[E8] the block is the record ranked 2nd");

      await fx.writeConfig({ backend: "local", recall: { pick: { enabled: false } } });
      const off = fx.run(BLOCK, { env: { STAND_IN_ANSWER: "[2]" } });
      assert.equal(off.status, 0, off.stderr);
      assert.equal((await fx.standIn(off)).starts.length, 0, "[E9] the stand-in was never started");
      assert.deepEqual(blockIds(off.stdout), ids(fx.ranked.slice(0, 5)), "[E9] the block is the 5 best-ranked records");
      assert.equal(off.stderr, "", "[E9] stderr is empty");
    }),
  },
  {
    name: "201/01 task 02 E10 · a project names its own model and time limit: the stand-in is asked for sonnet, and under timeoutMs 45000 one that answers after 25 seconds is still read",
    run: () => withProject({ memory: { backend: "local", recall: { pick: { model: "sonnet", timeoutMs: 45000 } } } }, async (fx) => {
      const ran = fx.run(BLOCK, { env: { STAND_IN_ANSWER: "[2]", STAND_IN_DELAY_MS: "25000" } });
      assert.equal(ran.status, 0, ran.stderr);
      const { starts } = await fx.standIn(ran);
      assert.equal(starts[0].argv[starts[0].argv.indexOf("--model") + 1], "sonnet", "the stand-in was asked for the model sonnet");
      assert.ok(ran.elapsedMs >= 25000, `the stand-in answered after 25 seconds (${ran.elapsedMs} ms), past the default limit`);
      assert.deepEqual(blockIds(ran.stdout), [fx.ranked[1].id], "…and it is still read");
      assert.equal(ran.stderr, "");
    }),
  },
  {
    name: "201/01 task 02 E11 · a bad value is refused at the path the author wrote: timeoutMs 500 refuses every memory verb with invalid-memory-recall-pick, and the stand-in is never started",
    run: () => withProject({ memory: { backend: "local", recall: { pick: { timeoutMs: 500 } } }, ingest: false }, async (fx) => {
      for (const args of [BLOCK, ["memory", "status"], ["memory", "recall", QUERY, "--json"]]) {
        const ran = fx.run(args);
        assert.equal(ran.status, 1, `aof ${args.join(" ")} is refused`);
        assert.equal((await fx.standIn(ran)).starts.length, 0, "the stand-in was never started");
        if (args.includes("--json")) {
          const envelope = JSON.parse(ran.stdout);
          assert.equal(envelope.code, "invalid-memory-recall-pick");
          assert.ok(envelope.error.startsWith("memory.recall.pick.timeoutMs is 500"), "the refusal names the path the author wrote");
        } else {
          assert.ok(ran.stderr.startsWith("memory.recall.pick.timeoutMs is 500"), ran.stderr);
          assert.equal(ran.stdout, "");
        }
      }
      const validated = JSON.parse(fx.run(["project", "validate", "--json"]).stdout);
      const refused = validated.diagnostics.filter((entry) => entry.code === "invalid-memory-recall-pick");
      assert.deepEqual(refused.map((entry) => entry.path), ["memory.recall.pick.timeoutMs"], "it refuses at memory.recall.pick.timeoutMs");
    }),
  },
  {
    name: "201/01 task 02 outline · the three keys, at their edges — {} | pick {} | 1000 | 120000 | 999 | 120001 | a string | a blank model | enabled 'no' | an unknown key | pick false | an unknown recall key",
    run: () => withProject({ ingest: false }, async (fx) => {
      const rows = [
        [{}, null], [{ pick: {} }, null], [{ pick: { timeoutMs: 1000 } }, null], [{ pick: { timeoutMs: 120000 } }, null],
        [{ pick: { timeoutMs: 999 } }, "memory.recall.pick.timeoutMs"], [{ pick: { timeoutMs: 120001 } }, "memory.recall.pick.timeoutMs"],
        [{ pick: { timeoutMs: "20000" } }, "memory.recall.pick.timeoutMs"], [{ pick: { model: "" } }, "memory.recall.pick.model"],
        [{ pick: { enabled: "no" } }, "memory.recall.pick.enabled"], [{ pick: { effort: "low" } }, "memory.recall.pick.effort"],
        [{ pick: false }, "memory.recall.pick"], [{ shortlist: 40 }, "memory.recall.shortlist"],
      ];
      for (const [recall, at] of rows) {
        await fx.writeConfig({ backend: "local", recall });
        const report = JSON.parse(fx.run(["project", "validate", "--json"]).stdout);
        const refused = report.diagnostics.filter((entry) => entry.code === "invalid-memory-recall-pick").map((entry) => entry.path);
        assert.deepEqual(refused, at === null ? [] : [at], `memory.recall = ${JSON.stringify(recall)} reports ${at === null ? "no invalid-memory-recall-pick diagnostic" : `invalid-memory-recall-pick at ${at}`}`);
      }
    }),
  },
  {
    name: "201/01 task 02 · the settings are honoured whichever backend serves the records: with the pick off the stand-in is never started under local or under graphify",
    run: async () => {
      for (const backend of ["local", "graphify"]) {
        await withProject({ memory: { backend, recall: { pick: { enabled: false } } } }, async (fx) => {
          const ran = fx.run(BLOCK);
          assert.equal(ran.status, 0, `[${backend}] ${ran.stderr}`);
          assert.equal(blockIds(ran.stdout).length, 5, `[${backend}] the block is the lexical top 5`);
          assert.equal((await fx.standIn(ran)).starts.length, 0, `[${backend}] the stand-in was never started`);
          // …and with it on, the same backend's records are what the stand-in is shown.
          await fx.writeConfig({ backend });
          const on = fx.run(BLOCK, { env: { STAND_IN_ANSWER: "[2]" } });
          assert.equal((await fx.standIn(on)).starts.length, 1, `[${backend}] with the pick on, the stand-in is asked`);
          assert.equal(blockIds(on.stdout).length, 1);
        });
      }
    },
  },
];
