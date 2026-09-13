// FF-6303 — aof holds NO clock and NO receiver, and the face writes nothing (63/ADR-003,
// ADR-008 §7, ADR-010 §6).
//
// A clock in `src/` is a supervisor with one entry in its table, and the first flag on a read face
// is how a read face stops being one. This control asks two questions the sibling
// `acd-trigger-is-a-caller-not-a-coordinator` does not: does anything in this family SCHEDULE, and
// does anything in it WRITE. The two rows are separate files on purpose — they fail for different
// reasons and their red probes mutate different things, so merged onto one file one probe's red
// would be indistinguishable from the other's.
//
// THE WRITE CLAIM IS PROVEN THE ONLY HONEST WAY (53/FF-5306's idiom). A path assembled from a
// variable resolves somewhere no reader can see, so a static sweep cannot answer it: list the
// tree and every byte of it, run the command in both renderings, list it again, compare. And run
// it TWICE, because a write that is merely idempotent survives a single comparison and is still a
// write.
//
// THE CLOCK CLAIM IS ASSERTED OVER THE WHOLE IMPORT CLOSURE, not just over the family's own four
// files, so a timer reached through a helper is caught. That walk turns up exactly one timer in
// the whole closure and it is not a scheduler — `renameWithRetry`'s bounded backoff in
// `src/fs.mjs` — so the leg is written as a RATCHET rather than as an exemption: the closure holds
// that one, at that one site, and any second timer anywhere in it fails.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { functionBody, stripComments } from "../../support/source-slice.mjs";
import { spawnCliSync } from "../../support/cli-spawn.mjs";
import { getCommand } from "../../../src/command-core.mjs";
import { buildTriggerReport, triggerCommand } from "../../../src/commands/trigger.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const cliPath = path.join(root, "bin", "aof.mjs");

// THE FAMILY AND ITS CLOSURE ARE EXPORTED, and `acd-trigger-is-a-caller-not-a-coordinator` reads
// them from here. That is a shared DERIVATION, not a merged claim: the two rows keep their own
// files and their own assertions, so a probe that reds one still leaves the other legible — which
// is the whole reason the register kept them apart. What is NOT duplicated is the closure walk
// itself; a second brace-and-import walker written beside this one is the species TECH_DEBT 24
// and 57 have already been paid for twice.
export const FAMILY = [
  "src/commands/trigger.mjs",
  ...readdirSync(path.join(root, "src", "work-trigger"))
    .filter((name) => name.endsWith(".mjs"))
    .sort()
    .map((name) => `src/work-trigger/${name}`),
];

const sourceOf = (file) => stripComments(readFileSync(path.join(root, file), "utf8"));

// The family's own STATIC import closure. The deferred `await import("../command-core.mjs")` is
// the registry seam this face is required to reach through and is deliberately not walked: the
// registry is the door, not a helper this family carries.
function importClosure(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length > 0) {
    const relative = queue.shift();
    if (seen.has(relative)) continue;
    seen.add(relative);
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) continue;
    for (const { specifier } of importSpecifiers(sourceOf(relative)).filter((entry) => !entry.dynamic)) {
      if (!specifier.startsWith(".")) continue;
      queue.push(path.relative(root, path.resolve(path.dirname(absolute), specifier)).split(path.sep).join("/"));
    }
  }
  return [...seen].sort();
}

export const CLOSURE = importClosure(FAMILY);
export const familySource = (file) => sourceOf(file);
const CLOSURE_TEXT = CLOSURE.map((file) => sourceOf(file)).join("\n");
const FAMILY_TEXT = FAMILY.map((file) => sourceOf(file)).join("\n");

// A clock and a receiver, by every spelling either takes.
const RECEIVERS = [
  { what: "a repeating timer", pattern: /\bsetInterval\b/u, plant: "setInterval(() => fire(), 60_000);" },
  { what: "a next-tick scheduler", pattern: /\bsetImmediate\b/u, plant: "setImmediate(() => fire());" },
  { what: "an HTTP server", pattern: /node:https?\b|createServer\s*\(/u, plant: 'import { createServer } from "node:http";' },
  { what: "a listening socket", pattern: /\.listen\s*\(/u, plant: "server.listen(4182);" },
  { what: "a socket bind", pattern: /node:net\b|node:dgram\b|\.bind\s*\(\s*\d/u, plant: 'import net from "node:net";' },
  // A crontab expression is five whitespace-separated fields of digits, `*`, `/`, `,` and `-`.
  // Matched as that SHAPE rather than as "a longish string of punctuation", which reads a string
  // literal spanning two indented lines as a schedule and would have made this leg red for a
  // reason unrelated to what it was written to catch.
  { what: "a cron-expression evaluator", pattern: /cron-?parser|cronExpression|\bcrontab\b|["'](?:[\d*/,-]+\s+){4}[\d*/,-]+["']/u, plant: 'const next = parse("*/5 * * * *");' },
];

async function snapshot(directory) {
  const files = new Map();
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) files.set(path.relative(directory, absolute), await readFile(absolute));
    }
  }
  await walk(directory);
  return files;
}

function sameTree(before, after, what) {
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), `${what}: no file created or removed`);
  for (const [file, bytes] of before) assert.deepEqual(after.get(file), bytes, `${file} is byte-identical after ${what}`);
}

async function fixture(members) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "aof-trigger-clock-"));
  await mkdir(path.join(directory, ".aof"), { recursive: true });
  await mkdir(path.join(directory, "wiki", "work", "63_milestone_triggers"), { recursive: true });
  await writeFile(
    path.join(directory, ".aof", "aof.config.json"),
    `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(directory, "wiki", "work", "63_milestone_triggers", "SPEC.md"),
    "---\ntype: milestone\nnumber: 63\nslug: triggers\nstatus: in-progress\ntitle: \"Triggers\"\ncreated: 2026-09-01\nupdated: 2026-09-01\n---\n# 63\n",
    "utf8",
  );
  await writeFile(
    path.join(directory, ".aof", "triggers.jsonc"),
    `${JSON.stringify({ version: 1, members }, null, 2)}\n`,
    "utf8",
  );
  return directory;
}

const member = (over = {}) => ({ id: "wake", protects: "a stalled driver", source: "cron", scope: "63", level: "L1", ...over });

function cli(cwd, args) {
  const result = spawnCliSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const workspaceFor = (directory) => ({ projectRoot: directory, workDir: path.join(directory, "wiki", "work"), config: {} });

const registryStub = (answers = {}, unregistered = []) => ({
  registry: { getCommand, invoke: async () => { throw new Error("no reading expected"); } },
  resolveCommand: (id) => (unregistered.includes(id) ? undefined : (id === "work:loop" ? getCommand("work:loop") : { id })),
  invoke: async (id) => {
    if (!Object.prototype.hasOwnProperty.call(answers, id)) throw new Error(`no answer for ${id}`);
    return answers[id];
  },
});

export const archTests = [
  {
    name: "architecture: FF-6303 no timer, cron evaluator, server or listening socket is reachable from the family — statically or through its whole import closure",
    run: () => {
      assert.ok(CLOSURE.length > FAMILY.length, `the closure walk really walked (${CLOSURE.length} files from ${FAMILY.length})`);
      for (const file of FAMILY) assert.ok(CLOSURE.includes(file), `${file} is in its own closure`);
      for (const receiver of RECEIVERS) {
        assert.doesNotMatch(FAMILY_TEXT, receiver.pattern, `no module in the trigger family holds ${receiver.what}`);
        assert.doesNotMatch(CLOSURE_TEXT, receiver.pattern, `and none is reachable through its import closure either: ${receiver.what}`);
        assert.match(receiver.plant, receiver.pattern, `the detector for ${receiver.what} sees a planted "${receiver.plant}"`);
      }
    },
  },
  {
    name: "architecture: FF-6303 the family itself holds no setTimeout, and the ONE in its closure is a bounded write retry rather than a schedule",
    run: () => {
      // The family's own files hold none at all.
      assert.doesNotMatch(FAMILY_TEXT, /\bsetTimeout\b/u, "no module in the trigger family holds a setTimeout");
      // …and across the WHOLE closure there is exactly one, at one site, and it schedules nothing:
      // it is `renameWithRetry`'s linear backoff between attempts at an atomic rename. Written as
      // a RATCHET rather than as an exemption — a second timer anywhere in the closure fails here,
      // and so does a change to this one, so the closure can never quietly acquire a scheduler.
      const sites = CLOSURE.flatMap((file) => [...sourceOf(file).matchAll(/\bsetTimeout\b/gu)].map(() => file));
      assert.deepEqual(sites, ["src/fs.mjs"], `the closure holds exactly one setTimeout, in src/fs.mjs (got ${sites.join(", ") || "none"})`);
      // ASSERTED AS A SHAPE, NEVER AS ITS ARITHMETIC. `src/fs.mjs` has 52 `src/` dependents and
      // none of them is ours; pinning `25 * (attempt + 1)` byte-for-byte would red this control
      // the day someone tunes that constant for the Windows rename contention the retry exists
      // for — sending its reader to hunt a defect in a family that did not change, which is the
      // failure FF-6308's own row forbids by name. What this row actually claims is that the one
      // timer in the closure SCHEDULES NOTHING, and that is a property of its shape and its site.
      const fs = sourceOf("src/fs.mjs");
      const body = functionBody(fs, "function renameWithRetry(");
      assert.ok(body != null, "renameWithRetry is where it lives, and its body was found");
      assert.equal((body.match(/\bsetTimeout\b/gu) ?? []).length, 1, "the file's one timer is inside that function");
      // It is the resolver of an AWAITED promise — the call site blocks on it rather than
      // arranging for something to happen later, which is the whole difference from a schedule.
      const shape = /await new Promise\(\(([\w$]+)\) => setTimeout\(\1, ([^;]+?)\)\);/u.exec(body);
      assert.ok(shape != null, `the timer is awaited as a promise resolver — got: ${body.split("\n").find((line) => line.includes("setTimeout"))?.trim()}`);
      // Its delay is an expression over the retry counter, so it is bounded by the loop that owns
      // it. The VALUE is not asserted; that the delay is per-attempt and calls nothing is.
      const delay = shape[2];
      assert.match(delay, /\battempt\b/u, `the delay is an expression over the retry counter (got "${delay}")`);
      assert.doesNotMatch(delay, /[A-Za-z_$][\w$]*\s*\(/u, `and calls nothing to obtain it (got "${delay}")`);
      // …and the loop that owns it is bounded by a literal ceiling, so the retry cannot run on.
      assert.match(body, /for \(let attempt = 0; attempt < \d+; attempt \+= 1\)/u, "the retry loop is bounded by a literal ceiling");
      // NON-VACUITY: the shape reader really does read, and a schedule-shaped timer is refused.
      assert.equal(/await new Promise\(\(([\w$]+)\) => setTimeout\(\1, ([^;]+?)\)\);/u.test("setTimeout(() => fire(), 60000);"), false, "a bare schedule does not read as an awaited backoff");
    },
  },
  {
    name: "architecture: FF-6303 two runs over one tree, in both renderings, leave every byte where they found it",
    async run() {
      // Taken from the OUTSIDE: list the tree and every byte of it, run the command, list it
      // again. Twice, because a write that is merely idempotent survives one comparison.
      const directory = await fixture([member(), member({ id: "gated", source: "ci-signal", level: "L3" })]);
      try {
        const before = await snapshot(directory);
        const humanFirst = cli(directory, ["work", "trigger"]);
        sameTree(before, await snapshot(directory), "the first human run");
        const jsonFirst = cli(directory, ["work", "trigger", "--json"]);
        sameTree(before, await snapshot(directory), "the first machine run");
        const humanSecond = cli(directory, ["work", "trigger"]);
        const jsonSecond = cli(directory, ["work", "trigger", "--json"]);
        sameTree(before, await snapshot(directory), "a second run of each");
        // Nothing accumulated between the runs: the same answer, twice, from both faces.
        assert.equal(humanSecond.stdout, humanFirst.stdout, "the human face says the same thing twice");
        assert.deepEqual(JSON.parse(jsonSecond.stdout), JSON.parse(jsonFirst.stdout), "and so does the machine face");
        // And the fixture really did exercise both a resolution and a refusal, so the byte
        // comparison is over a run that had something to say.
        const document = JSON.parse(jsonFirst.stdout);
        assert.ok(document.resolved.length > 0, "the run resolved something");
        assert.ok(document.refused.length > 0, "and refused something");
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  },
  {
    name: "architecture: FF-6303 the family declares no --strict and no --dry-run, and the two faces render ONE object",
    async run() {
      assert.deepEqual(Object.keys(triggerCommand.cli.spec.flags), ["signal"], "the only flag this face declares is --signal");
      assert.doesNotMatch(triggerCommand.cli.spec.usage, /--strict|--dry-run/u, "and the usage advertises neither");
      assert.doesNotMatch(FAMILY_TEXT, /["']--?(?:strict|dry-?run)["']|\bdryRun\b|\bstrict\b/u, "no module in the family spells either flag");
      // One object, two renderings: `json` is the identity on the result, and `render` is a pure
      // function of that same object.
      const directory = await fixture([member()]);
      try {
        const report = await buildTriggerReport({}, { workspace: workspaceFor(directory), trigger: registryStub() });
        assert.equal(triggerCommand.cli.json(report), report, "the machine face emits the object itself");
        const rendered = triggerCommand.cli.render(report);
        assert.equal(triggerCommand.cli.render(JSON.parse(JSON.stringify(report))), rendered, "and the human face is a pure function of it");
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  },
  {
    name: "architecture: FF-6303 the exit rule is a CAUSE — a run that produced an answer exits 0 however many refusals it carries",
    async run() {
      const directory = await mkdtemp(path.join(os.tmpdir(), "aof-trigger-exit-"));
      try {
        const workspace = workspaceFor(directory);
        const cases = [
          {
            what: "an unresolved scope",
            deps: { compiled: { version: 1, triggers: [{ id: "story", protects: "x", source: "cron", scope: "63/01", level: "L1" }] }, ...registryStub() },
            input: {},
          },
          {
            what: "an ungated level",
            deps: {
              declaration: { version: 1, members: [member({ level: "L3" })] },
              ...registryStub({
                "work:doctor": { loopReady: { score: 10, clears: "none", blocking: [], checks: [] } },
                "work:loops-groundedness": { present: false, state: "absent", components: [], authorities: [], error: null },
              }),
            },
            input: {},
          },
          {
            what: "a refused source",
            deps: { declaration: { version: 1, members: [member()] }, ...registryStub() },
            input: { signal: { source: "not-a-source" } },
          },
          {
            what: "an empty declaration",
            deps: { declaration: { version: 1, members: [] }, ...registryStub() },
            input: {},
          },
        ];
        for (const entry of cases) {
          const report = await buildTriggerReport(entry.input, { workspace, trigger: entry.deps });
          assert.equal(report.failure, undefined, `${entry.what}: an answer was produced, so nothing failed`);
          assert.equal(triggerCommand.cli.exit(report), 0, `${entry.what}: the run exits 0`);
        }
        // …and it really is a findings-free gate: at least one of those runs carried a refusal.
        const refusing = await buildTriggerReport({}, { workspace, trigger: cases[1].deps });
        assert.ok(refusing.refused.length > 0, "the exit-0 side was driven over a run carrying refusals");
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  },
  {
    name: "architecture: FF-6303 …while a run that produced NO answer states the failure first and exits non-zero",
    async run() {
      const directory = await mkdtemp(path.join(os.tmpdir(), "aof-trigger-exit-fail-"));
      try {
        const workspace = workspaceFor(directory);
        const cases = [
          {
            what: "an unparseable declaration",
            deps: { declaration: { version: 1, members: [member({ level: "not-a-level" })] }, ...registryStub() },
            input: {},
          },
          {
            what: "an unreachable registry",
            deps: { declaration: { version: 1, members: [member({ level: "L3" })] }, ...registryStub({}, ["work:doctor"]) },
            input: {},
          },
          {
            what: "an unreadable invocation",
            deps: { declaration: { version: 1, members: [member()] }, ...registryStub() },
            input: { signal: 7 },
          },
        ];
        for (const entry of cases) {
          const report = await buildTriggerReport(entry.input, { workspace, trigger: entry.deps });
          assert.ok(report.failure != null, `${entry.what}: no answer was produced, so the run failed`);
          assert.equal(Object.keys(triggerCommand.cli.json(report))[0], "failure", `${entry.what}: the failure is stated first in --json`);
          assert.equal(typeof report.failure.code, "string", `${entry.what}: it carries a code`);
          assert.deepEqual(report.resolved, [], `${entry.what}: and nothing is reported as resolved`);
          assert.equal(triggerCommand.cli.exit(report), 1, `${entry.what}: the run exits non-zero`);
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  },
  {
    name: "architecture: FF-6303 the exit mapping is the single-expression form, so the two sides cannot drift into a per-case table",
    run: () => {
      // `src/commands/tune.mjs:590` already ships this exact shape, and the reason it is pinned as
      // a SHAPE is that ADR-010 §6 states the rule as a CAUSE: an enumeration would have to grow a
      // branch for every case nobody listed, which is how one reading put an unreachable registry
      // on both sides of the rule at once.
      const expression = String(triggerCommand.cli.exit).replace(/\s+/gu, " ").trim();
      assert.equal(expression, "(result) => (result.failure == null ? 0 : 1)", "the exit adapter is one expression over whether a failure exists");
      assert.equal(String(getCommand("work:tune").cli.exit).replace(/\s+/gu, " ").trim(), expression, "byte for byte the expression the sibling face already ships");
      assert.doesNotMatch(sourceOf("src/commands/trigger.mjs"), /exit:\s*\(result\)\s*=>\s*\{/u, "and it is not a per-case table wearing an adapter's name");
    },
  },
];
