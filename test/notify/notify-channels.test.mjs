// test/notify/notify-channels.test.mjs — milestone 131 / story 02, tasks 00, 02, 03, 05 and 06
// (ADR-005 §1-§5). The family's registration (00), the `work.notify` schema and its one reader (02),
// the one envelope builder (03), the bounded never-throwing delivery (05) and the one firing site
// this story lands, the milestone accept in `work:status` (06).
//
// No case reaches the network: `fetch` is always an injected spy, and every case runs under the
// isolated `AOF_GLOBAL_HOME` the runner hands it. `reportDegrade` throttles per code for 5 s, so
// every case that reads the degrade sink resets it first (`setDegradeSinkForTest`).
import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { invoke } from "../../src/command-core.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { renderDiscord, sendDiscord } from "../../src/notify/discord.mjs";
import { CHANNELS, EVENTS, NOTIFY_TIMEOUT_MS, buildNotifyEnvelope, notify, resolveNotifyConfig } from "../../src/notify/notify.mjs";
import {
  FLAT_LAYER_THRESHOLD,
  SOURCE_DIRECTORY_BUDGETS,
  SOURCE_DIRECTORY_EXEMPTIONS,
  readTreeListing,
  sourceDirectoryBudgetViolations,
} from "../arch/testing/acd-source-directory-budget.test.mjs";
import { REGRESSION_DIVIDER, REGRESSION_HEADER, REGRESSION_HEADING } from "../../src/regression-record.mjs";
import { stripComments } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const NOW = () => new Date("2026-09-23T17:00:00.000Z");
const SECRET = "https://discord.com/api/webhooks/111/secret-token";
const HOOK_B_URL = "https://discord.com/api/webhooks/222/other-token";

function degradeSink() {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  return events;
}
const notifyEvents = (events) => events.filter((event) => String(event.code).startsWith("notify-"));
async function refusal(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  return null;
}

// A spy standing in for `fetch`. `answer(url, init, n)` decides each response; a response is a plain
// object with the three members `sendDiscord` reads.
function fetchSpy(answer = () => response(204)) {
  const calls = [];
  const spy = (url, init) => {
    calls.push({ url, init, at: calls.length });
    return answer(url, init, calls.length);
  };
  spy.calls = calls;
  return spy;
}
function response(status, { body, headers = {}, json } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    json: json ?? (async () => (typeof body === "string" ? JSON.parse(body) : body)),
  };
}
const never = () => new Promise(() => {});
const untilAborted = (init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason ?? new Error("aborted"))));

// ── task 02: the schema ────────────────────────────────────────────────────────────────────────
async function compileSchema() {
  const Ajv2020 = (await import("ajv/dist/2020.js")).default;
  const schema = JSON.parse(await readFile(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
  return new Ajv2020({ allErrors: true, strict: false }).compile(schema);
}
const configOf = (notifyBlock) => ({ name: "x", resources: [], work: { notify: notifyBlock } });

// ── task 06: the accept door's fixture ────────────────────────────────────────────────────────
const git = promisify(execFile);
const PINNED_DATE = "2026-09-01T00:00:00Z";
const specDoc = (status, title = "Fixture milestone") => [
  "---", "type: milestone", "number: 90", "slug: fixture", ...(title == null ? [] : [`title: ${JSON.stringify(title)}`]),
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "depends: []", "---", "# 90 · Fixture", "",
].join("\n");
const storyDoc = (status) => [
  "---", "type: story", "number: 00", "slug: lane", "parent: 90", 'title: "Lane"',
  `status: ${status}`, "created: 2026-09-01", "updated: 2026-09-01", "---", "# 90/00 · Lane", "",
].join("\n");

// A milestone "90" and its story "90/00" in a real git repo whose HEAD is pinned, so two fixtures
// built alike name one commit and their accept results can differ only by what notify changed.
async function withAcceptFixture({ status = "in-review", storyStatus = "in-review", title, notifyBlock, extraConfig = {}, notifyOptions, record = null } = {}, body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-notify-accept-")));
  const root = path.join(tmp, "repo");
  const home = path.join(tmp, "home");
  const mDir = path.join(root, "wiki", "work", "90_milestone_fixture");
  const sDir = path.join(mDir, "stories", "00_story_lane");
  await mkdir(home, { recursive: true });
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await mkdir(sDir, { recursive: true });
  const work = { dir: "./wiki/work", ...(extraConfig.work ?? {}), ...(notifyBlock === undefined ? {} : { notify: notifyBlock }) };
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", ...extraConfig, work }, null, 2)}\n`, "utf8");
  await writeFile(path.join(mDir, "SPEC.md"), specDoc(status, title === undefined ? "Fixture milestone" : title), "utf8");
  await writeFile(path.join(sDir, "STORY.md"), storyDoc(storyStatus), "utf8");
  if (record != null) await writeFile(path.join(mDir, "REGRESSION.md"), record, "utf8");
  const dated = { ...process.env, GIT_AUTHOR_DATE: PINNED_DATE, GIT_COMMITTER_DATE: PINNED_DATE };
  await git("git", ["init", "-q", "-b", "main"], { cwd: root });
  await git("git", ["-c", "user.email=fixture@aof.local", "-c", "user.name=fixture", "-c", "commit.gpgsign=false", "commit", "-q", "--allow-empty", "-m", "fixture"], { cwd: root, env: dated });
  const env = { AOF_GLOBAL_HOME: home };
  const workspace = await loadWorkspace(root, undefined, { env });
  const ctx = { workspace, globalWorkStoreOptions: { env }, effectsJournalOptions: { env }, ...(notifyOptions === undefined ? {} : { notifyOptions }) };
  try {
    return await body({ ctx, specPath: path.join(mDir, "SPEC.md"), mDir });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
const OPS = { channels: { ops: { type: "discord", urlEnv: "HOOK_A" } } };
const statusOf = async (specPath) => /^status: (.+)$/mu.exec(await readFile(specPath, "utf8"))[1];

// ── task 05: the delivery's workspace and envelope ─────────────────────────────────────────────
const workspaceWith = (notifyBlock) => ({ config: { work: { notify: notifyBlock } } });
const WORKSPACE = workspaceWith(OPS);
const ENV = buildNotifyEnvelope("session-needs-input", { ref: "127/02", phase: "build", elapsedMs: 720000, question: "Move the residue?" }, { config: {}, now: NOW });
const hasSecret = (value) => JSON.stringify(value).includes("secret-token");

export const notifyChannelsTests = [
  // ── task 00: the family is founded and registered ───────────────────────────────────────────
  {
    name: "131/02 task00 — src/notify and test/notify are exemptions naming their members, and the live tree's budget holds",
    async run() {
      const src = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "src/notify");
      assert.ok(src, "src/notify is an exemption");
      for (const member of ["form.mjs", "form.d.mts", "notify.mjs", "discord.mjs", "ADR-005"]) assert.ok(src.why.includes(member), `its why names ${member}`);
      assert.ok(SOURCE_DIRECTORY_EXEMPTIONS.some((entry) => entry.directory === "test/notify"), "test/notify is an exemption");
      const listing = await readTreeListing();
      const named = sourceDirectoryBudgetViolations(listing).filter((v) => /(?:src|test)\/notify/u.test(v.message ?? JSON.stringify(v)));
      assert.deepEqual(named, [], "the budget's own run over the live tree names neither directory");
    },
  },
  {
    name: "131/02 task00 — the suites are registered through one index and one registry import, and the index decides nothing by readdir",
    async run() {
      const registry = await readFile(path.join(repoRoot, "scripts", "test.mjs"), "utf8");
      assert.equal(registry.split("../test/notify/index.mjs").length - 1, 1, "scripts/test.mjs imports the index once");
      assert.match(registry, /\.\.\.notifyTests\b/u, "and spreads what it exports");
      const index = stripComments(await readFile(path.join(repoRoot, "test", "notify", "index.mjs"), "utf8"));
      assert.doesNotMatch(index, /readdir/u, "the index decides nothing by readdir");
      for (const [suite, binding] of [["notify-form", "notifyFormTests"], ["notify-channels", "notifyChannelsTests"], ["notify-discord", "notifyDiscordTests"]]) {
        assert.match(index, new RegExp(`import\\s*\\{\\s*${binding}\\s*\\}\\s*from\\s*"\\./${suite}\\.test\\.mjs"`, "u"), `${suite} is imported`);
        assert.match(index, new RegExp(`\\.\\.\\.${binding}\\b`, "u"), `${suite} is spread`);
      }
    },
  },
  {
    name: "131/02 task00 — each notify suite runs a non-zero number of its own cases through the registry",
    run() {
      for (const suite of ["notify-form", "notify-discord"]) {
        const run = spawnSync(process.execPath, ["scripts/test.mjs", "--only", `test/notify/${suite}.test.mjs`], {
          cwd: repoRoot, encoding: "utf8", env: { ...process.env }, windowsHide: true,
        });
        assert.equal(run.status, 0, `${suite} exits 0: ${run.stdout.slice(-400)}${run.stderr.slice(-400)}`);
        assert.ok((run.stdout.match(/^ok - /gmu) ?? []).length > 0, `${suite} ran a non-zero number of cases`);
      }
      assert.ok(notifyChannelsTests.length > 0, "this suite's own cases are running now");
    },
  },
  {
    name: "131/02 task00 — the exemptions hold only while the family stays small (six rows)",
    async run() {
      const live = (await readTreeListing()).filter((entry) => !["src/notify", "test/notify"].includes(entry.dir) && !(entry.name === "notify" && ["src", "test"].includes(entry.dir)));
      const withFiles = (dir, n) => [
        ...live,
        { dir: dir.split("/")[0], name: "notify", kind: "dir" },
        ...Array.from({ length: n }, (_, i) => ({ dir, name: `m${i}.mjs`, kind: "file" })),
      ];
      const keepOther = (dir) => (dir === "src/notify" ? withFiles("test/notify", 4) : withFiles("src/notify", 4));
      const naming = (listing, dir) => sourceDirectoryBudgetViolations(listing, SOURCE_DIRECTORY_BUDGETS, SOURCE_DIRECTORY_EXEMPTIONS).filter((v) => (v.message ?? "").includes(`${dir}/`));
      for (const [dir, n, count] of [["src/notify", 4, 0], ["src/notify", 8, 0], ["src/notify", 9, 1], ["test/notify", 4, 0], ["test/notify", 9, 1]]) {
        const other = dir === "src/notify" ? "test/notify" : "src/notify";
        const listing = [...withFiles(dir, n), ...keepOther(dir).filter((e) => e.dir === other || (e.name === "notify" && e.dir === other.split("/")[0]))];
        const violations = naming(listing, dir);
        assert.equal(violations.length, count, `${dir} with ${n} files: ${JSON.stringify(violations.map((v) => v.message))}`);
        if (count === 1) assert.match(violations[0].message, /owes a ROW/u, "it now owes a row");
      }
      assert.ok(FLAT_LAYER_THRESHOLD === 8, "the threshold these rows are measured against");
      const absent = [...live, { dir: "test", name: "notify", kind: "dir" }, ...Array.from({ length: 4 }, (_, i) => ({ dir: "test/notify", name: `m${i}.mjs`, kind: "file" }))];
      assert.equal(naming(absent, "src/notify").length, 1, "an absent src/notify is one stale-exemption violation");
    },
  },

  // ── task 02: work.notify names the env var, never the secret ────────────────────────────────
  {
    name: "131/02 task02 — the schema admits a channel naming its env var and every well-formed block, and refuses the URL itself",
    async run() {
      const validate = await compileSchema();
      assert.ok(validate(configOf({ channels: { ops: { type: "discord", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: ["session-needs-input", "milestone-accepted"] } }, link: "https://example.test/board/{ref}" })), JSON.stringify(validate.errors));
      for (const block of [
        { channels: {} },
        { channels: { ops: { type: "discord" } } },
        { channels: { ops: { type: "discord", urlEnv: "A" } } },
        { channels: { ops: { type: "discord", urlEnv: "HOOK_2_B" } } },
        { channels: { ops: { type: "discord", events: ["loop-died"] } } },
        { channels: { ops: { type: "discord", events: [...EVENTS] } } },
        { channels: { ops: { type: "discord" }, b: { type: "discord", urlEnv: "HOOK_B" } }, link: "https://example.test/board" },
      ]) {
        assert.ok(validate(configOf(block)), `${JSON.stringify(block)}: ${JSON.stringify(validate.errors)}`);
      }
      assert.equal(validate(configOf({ channels: { ops: { type: "discord", url: SECRET } } })), false);
      assert.ok(validate.errors.some((e) => e.keyword === "additionalProperties" && e.instancePath === "/work/notify/channels/ops"), "the error points at the channel's unknown property");
    },
  },
  {
    name: "131/02 task02 — a malformed channel is refused where it is malformed, and a malformed block at the block (thirty rows)",
    async run() {
      const validate = await compileSchema();
      const at = (p) => `/work/notify${p}`;
      const channelRows = [
        [{ type: "discord", webhook: SECRET }, "additionalProperties", "/channels/ops"],
        [{ type: "discord", token: "abc" }, "additionalProperties", "/channels/ops"],
        [{ type: "discord", urlEnv: "aof_hook" }, "pattern", "/channels/ops/urlEnv"],
        [{ type: "discord", urlEnv: "1HOOK" }, "pattern", "/channels/ops/urlEnv"],
        [{ type: "discord", urlEnv: "_HOOK" }, "pattern", "/channels/ops/urlEnv"],
        [{ type: "discord", urlEnv: "AOF-HOOK" }, "pattern", "/channels/ops/urlEnv"],
        [{ type: "discord", urlEnv: "" }, "pattern", "/channels/ops/urlEnv"],
        [{ type: "discord", urlEnv: SECRET }, "pattern", "/channels/ops/urlEnv"],
        [{ type: "discord", urlEnv: 42 }, "type", "/channels/ops/urlEnv"],
        [{ type: "slack" }, "enum", "/channels/ops/type"],
        [{ type: "Discord" }, "enum", "/channels/ops/type"],
        [{ urlEnv: "HOOK_A" }, "required", "/channels/ops"],
        [{ type: "discord", events: ["session-exploded"] }, "enum", "/channels/ops/events/0"],
        [{ type: "discord", events: [] }, "minItems", "/channels/ops/events"],
        [{ type: "discord", events: ["loop-died", "loop-died"] }, "uniqueItems", "/channels/ops/events"],
        [{ type: "discord", events: "loop-died" }, "type", "/channels/ops/events"],
        [null, "type", "/channels/ops"],
        ["discord", "type", "/channels/ops"],
      ];
      for (const [channel, keyword, where] of channelRows) {
        assert.equal(validate(configOf({ channels: { ops: channel } })), false, JSON.stringify(channel));
        assert.ok(validate.errors.some((e) => e.keyword === keyword && e.instancePath === at(where)), `${JSON.stringify(channel)} → ${keyword} at ${where}: ${JSON.stringify(validate.errors.map((e) => [e.keyword, e.instancePath]))}`);
      }
      const blockRows = [
        [{ channels: {}, url: SECRET }, "additionalProperties", ""],
        [{ channels: {}, webhook: SECRET }, "additionalProperties", ""],
        [{ channels: {}, token: "abc" }, "additionalProperties", ""],
        [{ channels: {}, retries: 3 }, "additionalProperties", ""],
        [{ link: "https://example.test/{ref}" }, "required", ""],
        [{ channels: [] }, "type", "/channels"],
        [{ channels: {}, link: 42 }, "type", "/link"],
        [{ channels: {}, link: "" }, "minLength", "/link"],
        [{ channels: {}, link: "   " }, "pattern", "/link"],
        [[], "type", ""],
        ["discord", "type", ""],
        [null, "type", ""],
      ];
      for (const [block, keyword, where] of blockRows) {
        assert.equal(validate(configOf(block)), false, JSON.stringify(block));
        assert.ok(validate.errors.some((e) => e.keyword === keyword && e.instancePath === at(where)), `${JSON.stringify(block)} → ${keyword} at ${at(where)}: ${JSON.stringify(validate.errors.map((e) => [e.keyword, e.instancePath]))}`);
      }
    },
  },
  {
    name: "131/02 task02 — the resolver applies the two defaults, answers null for nothing to notify, and never throws (thirteen rows)",
    run() {
      assert.deepEqual(resolveNotifyConfig({ work: { notify: { channels: { ops: { type: "discord" } } } } }), { channels: [{ name: "ops", type: "discord", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: [...EVENTS] }], link: null });
      for (const config of [
        undefined, null, {}, { work: null }, { work: {} }, { work: { notify: null } }, { work: { notify: "discord" } },
        { work: { notify: [] } }, { work: { notify: {} } }, { work: { notify: { channels: {} } } }, { work: { notify: { channels: null } } },
        { work: { notify: { channels: [{ type: "discord" }] } } }, { work: { notify: { channels: { ops: null } } } },
      ]) {
        assert.equal(resolveNotifyConfig(config), null, JSON.stringify(config));
      }
    },
  },
  {
    name: "131/02 task02 — the resolver keeps what is given, defaults what is not, in config order; its answer is frozen and the config untouched",
    run() {
      const channelsOf = (block) => resolveNotifyConfig({ work: { notify: block } });
      const kept = channelsOf({ channels: { ops: { type: "discord", urlEnv: "HOOK_A", events: ["milestone-accepted", "loop-died"] } }, link: "https://example.test/{ref}" });
      assert.deepEqual(kept, { channels: [{ name: "ops", type: "discord", urlEnv: "HOOK_A", events: ["milestone-accepted", "loop-died"] }], link: "https://example.test/{ref}" });
      assert.deepEqual(channelsOf({ channels: { zeta: { type: "discord" }, alpha: { type: "discord" } } }).channels.map((c) => c.name), ["zeta", "alpha"]);
      assert.deepEqual(channelsOf({ channels: { ops: { type: "discord" }, 2: { type: "discord" } } }).channels.map((c) => c.name), ["2", "ops"]);
      assert.deepEqual(channelsOf({ channels: { ops: null, alerts: { type: "discord" } } }).channels, [{ name: "alerts", type: "discord", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: [...EVENTS] }]);
      assert.deepEqual(channelsOf({ channels: { ops: { type: "slack" } } }).channels, [{ name: "ops", type: "slack", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: [...EVENTS] }]);
      assert.deepEqual(channelsOf({ channels: { ops: { type: "discord", urlEnv: 42, events: "loop-died" } }, link: 7 }), { channels: [{ name: "ops", type: "discord", urlEnv: "AOF_DISCORD_WEBHOOK_URL", events: [...EVENTS] }], link: null });

      const config = { work: { notify: { channels: { ops: { type: "discord", events: ["loop-died"] } } } } };
      const answer = resolveNotifyConfig(config);
      for (const value of [answer, answer.channels, answer.channels[0], answer.channels[0].events]) assert.ok(Object.isFrozen(value));
      assert.ok(!Object.isFrozen(config.work.notify.channels.ops.events));
      assert.notEqual(config.work.notify.channels.ops.events, answer.channels[0].events);
    },
  },

  // ── task 03: one envelope, built in one place ────────────────────────────────────────────────
  {
    name: "131/02 task03 — an ask envelope carries the question, the phase, the wait and the answer command, in the eleven keys; EVENTS holds the seven",
    run() {
      const config = { mesh: { nodeId: "node-2976" }, work: { notify: { channels: { ops: { type: "discord" } }, link: "https://example.test/{ref}" } } };
      const e = buildNotifyEnvelope("session-needs-input", { ref: "127/02", phase: "build", elapsedMs: 720000, question: "Move the residue?" }, { config, now: NOW });
      assert.deepEqual(e, { event: "session-needs-input", ref: "127/02", at: "2026-09-23T17:00:00.000Z", node: "node-2976", phase: "build", elapsedMs: 720000, question: "Move the residue?", stop: null, outcome: null, answerPath: 'aof work answer 127/02 "…"', link: "https://example.test/127/02" });
      assert.deepEqual(Object.keys(e), ["event", "ref", "at", "node", "phase", "elapsedMs", "question", "stop", "outcome", "answerPath", "link"]);
      assert.deepEqual([...EVENTS], ["session-needs-input", "session-answered", "session-parked-unanswered", "loop-halted", "loop-died", "loop-relaunched", "milestone-accepted"]);
      assert.ok(Object.isFrozen(EVENTS));

      const accept = buildNotifyEnvelope("milestone-accepted", { ref: "131", phase: "verify", elapsedMs: 5, outcome: { title: "The human in the loop" } }, { config: {}, now: NOW });
      for (const key of ["phase", "elapsedMs", "question", "stop", "answerPath", "node", "link"]) assert.equal(accept[key], null, `${key} is null`);
      assert.deepEqual(accept.outcome, { title: "The human in the loop" });
    },
  },
  {
    name: "131/02 task03 — each event keeps its own keys from the same full fields and nulls the rest (seven rows)",
    run() {
      const F = { ref: "127", phase: "build", elapsedMs: 720000, question: "Q?", stop: { id: "story-failed", producer: "gate", remedy: "Fix it.", ref: "127/03" }, outcome: { by: "umair", answer: "b", askedAt: "A", parkedAt: "P", cause: "SIGKILL", title: "T" } };
      const answer = 'aof work answer 127 "…"';
      const resume = "aof work loop 127 --resume";
      for (const [event, phase, elapsedMs, question, stop, outcome, answerPath] of [
        ["session-needs-input", "build", 720000, "Q?", null, null, answer],
        ["session-answered", "build", 720000, null, null, { by: "umair", answer: "b" }, null],
        ["session-parked-unanswered", "build", 720000, "Q?", null, { askedAt: "A", parkedAt: "P" }, answer],
        ["loop-halted", null, 720000, null, F.stop, null, resume],
        ["loop-died", null, 720000, null, null, { cause: "SIGKILL" }, resume],
        ["loop-relaunched", null, 720000, null, null, { cause: "SIGKILL" }, null],
        ["milestone-accepted", null, null, null, null, { title: "T" }, null],
      ]) {
        const e = buildNotifyEnvelope(event, F, { config: {}, now: NOW });
        assert.deepEqual({ phase: e.phase, elapsedMs: e.elapsedMs, question: e.question, stop: e.stop, outcome: e.outcome, answerPath: e.answerPath }, { phase, elapsedMs, question, stop, outcome, answerPath }, event);
      }
    },
  },
  {
    name: "131/02 task03 — a nested object has exactly its own sub-keys, missing ones null (thirteen rows)",
    run() {
      for (const [event, fields, key, value] of [
        ["loop-halted", { ref: "127", stop: { id: "x" } }, "stop", { id: "x", producer: null, remedy: null, ref: null }],
        ["loop-halted", { ref: "127", stop: { id: "x", url: "u", token: "t" } }, "stop", { id: "x", producer: null, remedy: null, ref: null }],
        ["loop-halted", { ref: "127" }, "stop", { id: null, producer: null, remedy: null, ref: null }],
        ["loop-halted", { ref: "127", stop: "boom" }, "stop", { id: null, producer: null, remedy: null, ref: null }],
        ["loop-died", { ref: "127", outcome: {} }, "outcome", { cause: null }],
        ["loop-died", { ref: "127" }, "outcome", { cause: null }],
        ["session-answered", { ref: "127/02", outcome: { by: "umair" } }, "outcome", { by: "umair", answer: null }],
        ["session-answered", { ref: "127/02", outcome: { by: { actor: "umair" }, answer: "b" } }, "outcome", { by: { actor: "umair" }, answer: "b" }],
        ["session-parked-unanswered", { ref: "127/02", outcome: { parkedAt: "P", cause: "x" } }, "outcome", { askedAt: null, parkedAt: "P" }],
        ["milestone-accepted", { ref: "131" }, "outcome", { title: null }],
        ["milestone-accepted", { ref: "131", outcome: { title: "T", by: "x" } }, "outcome", { title: "T" }],
        ["session-needs-input", { ref: "127/02", stop: { id: "x" } }, "stop", null],
        ["session-needs-input", { ref: "127/02", outcome: { title: "T" } }, "outcome", null],
      ]) {
        assert.deepEqual(buildNotifyEnvelope(event, fields, { config: {}, now: NOW })[key], value, `${event} ${JSON.stringify(fields)}`);
      }
    },
  },
  {
    name: "131/02 task03 — the node and the link come from config, and the link fills every ref (eleven rows)",
    run() {
      const N = (t) => ({ work: { notify: { channels: { ops: { type: "discord" } }, link: t } } });
      for (const [config, link, node] of [
        [{}, null, null],
        [undefined, null, null],
        [{ mesh: {} }, null, null],
        [{ mesh: { nodeId: "node-2976" } }, null, "node-2976"],
        [N("https://x.test/{ref}"), "https://x.test/127/02", null],
        [N("https://x.test/{ref}?focus={ref}"), "https://x.test/127/02?focus=127/02", null],
        [N("https://x.test/board"), "https://x.test/board", null],
        [N("https://x.test/{REF}"), "https://x.test/{REF}", null],
        [N("{ref}"), "127/02", null],
        [N(undefined), null, null],
        [{ work: { notify: { channels: {}, link: "https://x.test/{ref}" } } }, null, null],
      ]) {
        const e = buildNotifyEnvelope("session-needs-input", { ref: "127/02" }, { config, now: NOW });
        assert.deepEqual([e.link, e.node], [link, node], JSON.stringify(config));
      }
    },
  },
  {
    name: "131/02 task03 — anything but one of the seven is refused notify-unknown-event, and the envelope is frozen through and shares nothing",
    run() {
      for (const event of ["", "SESSION-NEEDS-INPUT", "milestone_accepted", " loop-died", "constructor", "__proto__", "toString", undefined, null, "session-exploded"]) {
        assert.throws(() => buildNotifyEnvelope(event, { ref: "127/02" }, { config: {}, now: NOW }), (error) => error.code === "notify-unknown-event", String(event));
      }
      const fields = { ref: "131", outcome: { title: "T" } };
      const e = buildNotifyEnvelope("milestone-accepted", fields, { config: {}, now: NOW });
      fields.outcome.title = "X";
      assert.ok(Object.isFrozen(e) && Object.isFrozen(e.outcome));
      assert.equal(e.outcome.title, "T");
      assert.ok(Object.isFrozen(buildNotifyEnvelope("loop-halted", { ref: "127", stop: { id: "x" } }, { config: {}, now: NOW }).stop));
    },
  },

  // ── task 05: delivery is bounded and never throws ───────────────────────────────────────────
  {
    name: "131/02 task05 — a 2xx delivers once to the URL from env with the rendered body; an absent block makes no call; the send is one JSON POST with a signal",
    async run() {
      const events = degradeSink();
      const spy = fetchSpy();
      assert.deepEqual(await notify(WORKSPACE, ENV, { env: { HOOK_A: SECRET }, fetch: spy }), { delivered: ["ops"], failed: [] });
      assert.equal(spy.calls.length, 1);
      assert.equal(spy.calls[0].url, SECRET);
      assert.equal(spy.calls[0].init.method, "POST");
      assert.deepEqual(JSON.parse(spy.calls[0].init.body), renderDiscord(ENV));

      const none = fetchSpy();
      assert.deepEqual(await notify({ config: {} }, ENV, { env: { HOOK_A: SECRET }, fetch: none }), { delivered: [], failed: [] });
      assert.equal(none.calls.length, 0);
      assert.deepEqual(notifyEvents(events), []);

      const direct = fetchSpy();
      await sendDiscord(SECRET, renderDiscord(ENV), { fetch: direct, timeoutMs: 50 });
      const { url, init } = direct.calls[0];
      assert.equal(url, SECRET);
      assert.equal(init.method, "POST");
      assert.equal(init.headers["content-type"], "application/json");
      assert.equal(init.body, JSON.stringify(renderDiscord(ENV)));
      assert.ok(init.signal instanceof AbortSignal && !init.signal.aborted);
      assert.equal(NOTIFY_TIMEOUT_MS, 5000);
      assert.deepEqual(Object.keys(CHANNELS), ["discord"]);
      setDegradeSinkForTest(undefined);
    },
  },
  {
    name: "131/02 task05 — every answer the webhook can give maps to one result, one degrade and one send answer (sixteen rows)",
    async run() {
      const rows = [
        [() => response(200), { delivered: ["ops"], failed: [] }, null, { ok: true, status: 200 }],
        [() => response(204), { delivered: ["ops"], failed: [] }, null, { ok: true, status: 204 }],
        [() => response(400), { delivered: [], failed: ["ops"] }, ["notify-delivery-failed", "400"], { ok: false, reason: "status", status: 400, retryAfter: null }],
        [() => response(404), { delivered: [], failed: ["ops"] }, ["notify-delivery-failed", "404"], { ok: false, reason: "status", status: 404, retryAfter: null }],
        [() => response(500), { delivered: [], failed: ["ops"] }, ["notify-delivery-failed", "500"], { ok: false, reason: "status", status: 500, retryAfter: null }],
        [() => response(429, { body: { retry_after: 1.5 } }), { delivered: [], failed: ["ops"] }, ["notify-rate-limited", "1.5"], { ok: false, reason: "rate-limited", status: 429, retryAfter: 1.5 }],
        [() => response(429, { headers: { "Retry-After": "2" }, json: async () => { throw new SyntaxError("not json"); } }), { delivered: [], failed: ["ops"] }, ["notify-rate-limited", "2"], { ok: false, reason: "rate-limited", status: 429, retryAfter: 2 }],
        [() => response(429, { body: { retry_after: 0.8 }, headers: { "Retry-After": "3" } }), { delivered: [], failed: ["ops"] }, ["notify-rate-limited", "0.8"], { ok: false, reason: "rate-limited", status: 429, retryAfter: 0.8 }],
        [() => response(429, { body: { retry_after: "soon" }, headers: { "Retry-After": "3" } }), { delivered: [], failed: ["ops"] }, ["notify-rate-limited", "3"], { ok: false, reason: "rate-limited", status: 429, retryAfter: 3 }],
        [() => response(429, { headers: { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }, json: async () => { throw new SyntaxError("no body"); } }), { delivered: [], failed: ["ops"] }, ["notify-rate-limited", null], { ok: false, reason: "rate-limited", status: 429, retryAfter: null }],
        [() => response(429, { json: async () => { throw new SyntaxError("no body"); } }), { delivered: [], failed: ["ops"] }, ["notify-rate-limited", null], { ok: false, reason: "rate-limited", status: 429, retryAfter: null }],
        [() => response(429, { headers: { "Retry-After": "4" }, json: never }), { delivered: [], failed: ["ops"] }, ["notify-rate-limited", "4"], { ok: false, reason: "rate-limited", status: 429, retryAfter: 4 }],
        [() => { throw new TypeError("fetch failed"); }, { delivered: [], failed: ["ops"] }, ["notify-delivery-failed", "TypeError"], { ok: false, reason: "error", status: null, retryAfter: null }],
        [() => Promise.reject(undefined), { delivered: [], failed: ["ops"] }, ["notify-delivery-failed", null], { ok: false, reason: "error", status: null, retryAfter: null }],
        [(url, init) => untilAborted(init), { delivered: [], failed: ["ops"] }, ["notify-delivery-failed", null], { ok: false, reason: "timeout", status: null, retryAfter: null }],
        [() => never(), { delivered: [], failed: ["ops"] }, ["notify-delivery-failed", null], { ok: false, reason: "timeout", status: null, retryAfter: null }],
      ];
      try {
        for (const [index, [behaviour, result, degrade, send]] of rows.entries()) {
          const events = degradeSink();
          const spy = fetchSpy(behaviour);
          assert.deepEqual(await notify(WORKSPACE, ENV, { env: { HOOK_A: SECRET }, fetch: spy, timeoutMs: 50 }), result, `row ${index}: result`);
          assert.equal(spy.calls.length, 1, `row ${index}: no second call`);
          const seen = notifyEvents(events);
          if (degrade == null) assert.deepEqual(seen, [], `row ${index}: nothing degraded`);
          else {
            assert.deepEqual(seen.map((e) => e.code), [degrade[0]], `row ${index}: one ${degrade[0]}`);
            assert.match(seen[0].message, /ops/u, `row ${index}: names ops`);
            if (degrade[1] != null) assert.ok(seen[0].message.includes(degrade[1]), `row ${index}: names ${degrade[1]} in ${seen[0].message}`);
          }
          assert.deepEqual(await sendDiscord(SECRET, renderDiscord(ENV), { fetch: fetchSpy(behaviour), timeoutMs: 50 }), send, `row ${index}: send`);
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/02 task05 — a channel that cannot be sent fails without a call, degraded notify-channel-unconfigured by name (five rows)",
    async run() {
      try {
        for (const [channel, env, named] of [
          [{ type: "discord", urlEnv: "HOOK_A" }, {}, ["ops", "HOOK_A"]],
          [{ type: "discord", urlEnv: "HOOK_A" }, { HOOK_A: "" }, ["ops", "HOOK_A"]],
          [{ type: "discord", urlEnv: "HOOK_A" }, { HOOK_A: "  " }, ["ops", "HOOK_A"]],
          [{ type: "discord" }, { HOOK_A: SECRET }, ["ops", "AOF_DISCORD_WEBHOOK_URL"]],
          [{ type: "slack", urlEnv: "HOOK_A" }, { HOOK_A: SECRET }, ["ops"]],
        ]) {
          const events = degradeSink();
          const spy = fetchSpy();
          assert.deepEqual(await notify(workspaceWith({ channels: { ops: channel } }), ENV, { env, fetch: spy }), { delivered: [], failed: ["ops"] });
          assert.equal(spy.calls.length, 0);
          const seen = notifyEvents(events);
          assert.deepEqual(seen.map((e) => e.code), ["notify-channel-unconfigured"]);
          for (const word of named) assert.ok(seen[0].message.includes(word), `${seen[0].message} names ${word}`);
          assert.ok(!hasSecret(seen), "and never the URL");
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/02 task05 — channels are selected by event, sent in parallel, and reported in config order (nine rows)",
    async run() {
      const a = { type: "discord", urlEnv: "HOOK_A" };
      const bb = { type: "discord", urlEnv: "HOOK_B" };
      const env = { HOOK_A: SECRET, HOOK_B: HOOK_B_URL };
      const byUrl = (forA, forB) => (url) => (url === SECRET ? forA() : forB());
      const later = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
      const rows = [
        [{ ops: { ...a, events: ["milestone-accepted"] } }, () => response(204), { delivered: [], failed: [] }, 0, []],
        [{ ops: { ...a, events: ["session-needs-input"] } }, () => response(204), { delivered: ["ops"], failed: [] }, 1, []],
        [{ ops: a, alerts: bb }, byUrl(() => response(204), () => response(500)), { delivered: ["ops"], failed: ["alerts"] }, 2, [["notify-delivery-failed", "alerts"]]],
        [{ ops: a, alerts: bb }, byUrl(() => response(500), () => response(204)), { delivered: ["alerts"], failed: ["ops"] }, 2, [["notify-delivery-failed", "ops"]]],
        [{ ops: a, alerts: bb }, byUrl(() => later(30, response(204)), () => response(204)), { delivered: ["ops", "alerts"], failed: [] }, 2, []],
        [{ ops: a, alerts: bb }, byUrl(() => response(429), () => response(500)), { delivered: [], failed: ["ops", "alerts"] }, 2, [["notify-rate-limited", "ops"], ["notify-delivery-failed", "alerts"]]],
        [{ ops: a, alerts: bb }, () => response(500), { delivered: [], failed: ["ops", "alerts"] }, 2, [["notify-delivery-failed", null]]],
        [{ ops: { ...a, urlEnv: "HOOK_Z", events: ["milestone-accepted"] }, alerts: bb }, () => response(204), { delivered: ["alerts"], failed: [] }, 1, []],
        [{ ops: { ...a, urlEnv: "HOOK_Z" }, alerts: bb }, () => response(204), { delivered: ["alerts"], failed: ["ops"] }, 1, [["notify-channel-unconfigured", "HOOK_Z"]]],
      ];
      try {
        for (const [index, [channels, behaviour, result, calls, degrades]] of rows.entries()) {
          const events = degradeSink();
          const spy = fetchSpy(behaviour);
          assert.deepEqual(await notify(workspaceWith({ channels }), ENV, { env, fetch: spy, timeoutMs: 50 }), result, `row ${index}`);
          assert.equal(spy.calls.length, calls, `row ${index}: ${calls} call(s)`);
          if (index === 4) assert.deepEqual(spy.calls.map((c) => c.url), [SECRET, HOOK_B_URL], "HOOK_B was called before HOOK_A settled");
          if (index >= 7) assert.deepEqual(spy.calls.map((c) => c.url), [HOOK_B_URL], "the one call is to HOOK_B");
          const seen = notifyEvents(events);
          // The channels send in parallel, so the order their degrades land in is not the contract.
          assert.deepEqual(seen.map((e) => e.code).sort(), degrades.map(([code]) => code).sort(), `row ${index}: degrades`);
          for (const [code, word] of degrades) {
            if (word != null) assert.ok(seen.some((e) => e.code === code && e.message.includes(word)), `row ${index}: ${code} names ${word}`);
          }
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/02 task05 — nothing it is handed makes it reject (five rows)",
    async run() {
      const throwing = Object.create(null);
      for (const [key, value] of Object.entries(ENV)) if (key !== "question") throwing[key] = value;
      Object.defineProperty(throwing, "question", { get() { throw new Error("getter"); }, enumerable: true });
      try {
        for (const [workspace, envelope, result, degrade] of [
          [null, ENV, { delivered: [], failed: [] }, []],
          [{}, ENV, { delivered: [], failed: [] }, []],
          [WORKSPACE, null, { delivered: [], failed: [] }, []],
          [WORKSPACE, { event: "session-exploded" }, { delivered: [], failed: [] }, []],
          [WORKSPACE, throwing, { delivered: [], failed: ["ops"] }, ["notify-delivery-failed"]],
        ]) {
          const events = degradeSink();
          const spy = fetchSpy();
          assert.deepEqual(await notify(workspace, envelope, { env: { HOOK_A: SECRET }, fetch: spy }), result);
          assert.equal(spy.calls.length, 0, "fetch was never called");
          assert.deepEqual(notifyEvents(events).map((e) => e.code), degrade);
          if (degrade.length > 0) assert.match(notifyEvents(events)[0].message, /ops/u);
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/02 task05 — the URL never leaves env, whatever carries it back (six rows)",
    async run() {
      const named = new Error("boom");
      named.name = SECRET;
      const rows = [
        () => { throw new Error(`connect failed for ${SECRET}`); },
        () => { throw named; },
        () => Promise.reject(SECRET),
        () => response(400, { body: SECRET, json: async () => { throw new Error(SECRET); } }),
        () => response(429, { headers: { "Retry-After": SECRET }, json: async () => { throw new Error(SECRET); } }),
        (url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new Error(`aborted ${SECRET}`)))),
      ];
      try {
        for (const [index, behaviour] of rows.entries()) {
          const events = degradeSink();
          const result = await notify(WORKSPACE, ENV, { env: { HOOK_A: SECRET }, fetch: fetchSpy(behaviour), timeoutMs: 50 });
          assert.deepEqual(result, { delivered: [], failed: ["ops"] }, `row ${index}`);
          assert.ok(!hasSecret(events) && !hasSecret(result), `row ${index}: the URL stayed in env — ${JSON.stringify(events)}`);
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },

  // ── task 06: an accepted milestone is announced ─────────────────────────────────────────────
  {
    name: "131/02 task06 — accepting a milestone posts one accept message; a failing webhook does not fail the accept; a story's done announces nothing",
    async run() {
      const spy = fetchSpy();
      await withAcceptFixture({ notifyBlock: OPS, notifyOptions: { env: { HOOK_A: SECRET }, fetch: spy } }, async ({ ctx, specPath }) => {
        const moved = await invoke("work:status", { ref: "90", status: "done", gateOverride: "fixture" }, ctx);
        assert.equal(moved.moved, true);
        assert.equal(await statusOf(specPath), "done");
        assert.equal(spy.calls.length, 1);
        assert.equal(JSON.parse(spy.calls[0].init.body).content, "**90 — accepted**\nFixture milestone");
      });

      const events = degradeSink();
      try {
        await withAcceptFixture({ notifyBlock: OPS, notifyOptions: { env: { HOOK_A: SECRET }, fetch: fetchSpy(() => { throw new TypeError("down"); }) } }, async ({ ctx, specPath }) => {
          const moved = await invoke("work:status", { ref: "90", status: "done", gateOverride: "fixture" }, ctx);
          assert.equal(moved.moved, true);
          assert.equal(await statusOf(specPath), "done");
          assert.deepEqual(notifyEvents(events).map((e) => e.code), ["notify-delivery-failed"]);
        });
      } finally {
        setDegradeSinkForTest(undefined);
      }

      const story = fetchSpy();
      await withAcceptFixture({ notifyBlock: OPS, notifyOptions: { env: { HOOK_A: SECRET }, fetch: story } }, async ({ ctx }) => {
        await invoke("work:status", { ref: "90/00", status: "done" }, ctx);
        assert.equal(story.calls.length, 0);
      });
    },
  },
  {
    name: "131/02 task06 — only a milestone's move into done posts, once (twelve rows)",
    async run() {
      const rows = [
        ["90", "in-review", { status: "done", gateOverride: "fixture" }, { moved: true }, 1],
        ["90", "in-progress", { status: "done", gateOverride: "fixture" }, { moved: true }, 1],
        ["90", "in-review", { status: "done", gateOverride: "fixture", ifApplicable: true }, { moved: true }, 1],
        ["90", "done", { status: "done", gateOverride: "fixture", ifApplicable: true }, { moved: false, code: "status-edge-not-applicable" }, 0],
        ["90", "done", { status: "done", gateOverride: "fixture" }, { throws: "status-edge-not-applicable" }, 0],
        ["90", "not-started", { status: "done", gateOverride: "fixture" }, { throws: "status-edge-not-applicable" }, 0],
        ["90", "not-started", { status: "in-progress" }, { moved: true }, 0],
        ["90", "in-progress", { status: "in-review" }, { moved: true }, 0],
        ["90", "in-review", { status: "blocked" }, { moved: true }, 0],
        ["90", "in-review", {}, { status: "in-review" }, 0],
        ["90/00", "in-review", { status: "done" }, { moved: true }, 0],
        ["90/00", "in-progress", { status: "done" }, { moved: true }, 0],
      ];
      for (const [ref, from, input, outcome, calls] of rows) {
        const spy = fetchSpy();
        const status = ref === "90" ? from : "in-review";
        const storyStatus = ref === "90/00" ? from : "in-review";
        await withAcceptFixture({ status, storyStatus, notifyBlock: OPS, notifyOptions: { env: { HOOK_A: SECRET }, fetch: spy } }, async ({ ctx }) => {
          const label = `${ref} at ${from} with ${JSON.stringify(input)}`;
          if (outcome.throws) {
            const error = await refusal(() => invoke("work:status", { ref, ...input }, ctx));
            assert.equal(error?.code, outcome.throws, label);
          } else {
            const result = await invoke("work:status", { ref, ...input }, ctx);
            for (const [key, value] of Object.entries(outcome)) assert.equal(result[key], value, `${label}: ${key}`);
          }
          assert.equal(spy.calls.length, calls, `${label}: ${calls} call(s)`);
        });
      }
    },
  },
  {
    name: "131/02 task06 — a refused accept posts nothing and is refused exactly as before (four rows)",
    async run() {
      const redRecord = [
        "# Regression gate", "", REGRESSION_HEADING, "", REGRESSION_HEADER, REGRESSION_DIVIDER,
        "| a1b2c3d4e5f60718293a4b5c6d7e8f9012345678 | 2026-09-04T11:22:33Z | all | red | arch red |", "",
      ].join("\n");
      const rows = [
        ["over its artifact budget", { extraConfig: { work: { doctor: { budgets: { spec: 3 } } } } }, { gateOverride: "fixture" }, "artifact-budget-exceeded"],
        ["no regression gate row", {}, {}, "regression-gate-missing"],
        ["a red newest row", { record: redRecord }, {}, "regression-gate-red"],
        ["an empty override reason", {}, { gateOverride: "" }, "gate-override-reason-required"],
      ];
      for (const [label, setup, input, code] of rows) {
        const outcomes = [];
        for (const notifyBlock of [OPS, undefined]) {
          const spy = fetchSpy();
          await withAcceptFixture({ ...setup, notifyBlock, notifyOptions: { env: { HOOK_A: SECRET }, fetch: spy } }, async ({ ctx, specPath }) => {
            const error = await refusal(() => invoke("work:status", { ref: "90", status: "done", ...input }, ctx));
            assert.equal(error?.code, code, `${label}: ${error?.message}`);
            assert.equal(await statusOf(specPath), "in-review");
            assert.equal(spy.calls.length, 0);
            outcomes.push({ code: error.code, status: error.status, message: error.message.replaceAll(/aof-notify-accept-\w+/gu, "<tmp>") });
          });
        }
        assert.deepEqual(outcomes[0], outcomes[1], `${label}: refused alike with and without work.notify`);
      }
    },
  },
  {
    name: "131/02 task06 — whatever the notification does, the accept's result is the same (eight rows)",
    async run() {
      const input = { ref: "90", status: "done", gateOverride: "fixture", now: "2026-09-23T17:00:00.000Z" };
      const baseline = await withAcceptFixture({}, async ({ ctx }) => invoke("work:status", input, ctx));
      const strip = (result) => JSON.parse(JSON.stringify(result));
      const rows = [
        ["answers 204", OPS, { env: { HOOK_A: SECRET }, fetch: fetchSpy(() => response(204)) }, 1, []],
        ["answers 500", OPS, { env: { HOOK_A: SECRET }, fetch: fetchSpy(() => response(500)) }, 1, ["notify-delivery-failed"]],
        ["answers 429", OPS, { env: { HOOK_A: SECRET }, fetch: fetchSpy(() => response(429)) }, 1, ["notify-rate-limited"]],
        ["never settles, 50 ms", OPS, { env: { HOOK_A: SECRET }, fetch: fetchSpy(() => never()), timeoutMs: 50 }, 1, ["notify-delivery-failed"]],
        ["no HOOK_A", OPS, { env: {}, fetch: fetchSpy() }, 0, ["notify-channel-unconfigured"]],
        ["no work.notify", undefined, { env: { HOOK_A: SECRET }, fetch: fetchSpy() }, 0, []],
        ["no channels", { channels: {} }, { env: { HOOK_A: SECRET }, fetch: fetchSpy() }, 0, []],
        ["events loop-died only", { channels: { ops: { type: "discord", urlEnv: "HOOK_A", events: ["loop-died"] } } }, { env: { HOOK_A: SECRET }, fetch: fetchSpy() }, 0, []],
      ];
      try {
        for (const [label, notifyBlock, notifyOptions, calls, degrades] of rows) {
          const events = degradeSink();
          await withAcceptFixture({ notifyBlock, notifyOptions }, async ({ ctx, specPath }) => {
            const result = await invoke("work:status", input, ctx);
            assert.equal(await statusOf(specPath), "done", label);
            assert.deepEqual(strip(result), strip(baseline), `${label}: the result is the same as without work.notify`);
            assert.equal(notifyOptions.fetch.calls.length, calls, `${label}: ${calls} call(s)`);
            assert.deepEqual(notifyEvents(events).map((e) => e.code), degrades, `${label}: degrades`);
          });
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/02 task06 — the accept message carries the record's title, the node and the link (three rows)",
    async run() {
      for (const [title, extraConfig, link, content] of [
        [null, {}, undefined, "**90 — accepted**"],
        ["Ship it @everyone", {}, undefined, "**90 — accepted**\nShip it @everyone"],
        ["Fixture milestone", { mesh: { nodeId: "node-7297" } }, "https://x.test/{ref}", "**90 — accepted** · node-7297\nFixture milestone\nhttps://x.test/90"],
      ]) {
        const spy = fetchSpy();
        await withAcceptFixture({ title, extraConfig, notifyBlock: { ...OPS, ...(link ? { link } : {}) }, notifyOptions: { env: { HOOK_A: SECRET }, fetch: spy } }, async ({ ctx }) => {
          await invoke("work:status", { ref: "90", status: "done", gateOverride: "fixture" }, ctx);
          const body = JSON.parse(spy.calls[0].init.body);
          assert.equal(body.content, content);
          assert.deepEqual(body.allowed_mentions, { parse: [] });
        });
      }
    },
  },
];
