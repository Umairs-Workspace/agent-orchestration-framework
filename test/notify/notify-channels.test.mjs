import { defaultFoundation as _aofFoundation } from "aof/foundation-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// test/notify/notify-channels.test.mjs — milestone 131 / story 02, tasks 00, 02, 03, 05 and 06
// (ADR-005 §1-§5), story 09, tasks 01-02 (ADR-007 §3-§4, §6), and story 10, tasks 02 and 04 (ADR-008
// §4, §7: the ask message indexed at delivery, and `allow` offering the reply). The family's registration (00),
// the `work.notify` schema and its one reader (02; 09 task 01: a channel names its Discord channel by
// `channelId` and its token override by `tokenEnv`), the one envelope builder (03), the bounded
// never-throwing delivery (05; 09 task 02: the bot posts through `discordRequest` and `notify`
// answers each posted message's id) and the one firing site this story lands, the milestone accept
// in `work:status` (06).
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
const setDegradeSinkForTest = _aofFoundation.degrade.setDegradeSinkForTest;
const invoke = _aofApplication.invoke;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
import { renderDiscord, sendDiscord } from "@aof/messaging/discord";
const CHANNELS = _aofApplication.messaging.notify.CHANNELS;
const EVENTS = _aofApplication.messaging.notify.EVENTS;
const NOTIFY_TIMEOUT_MS = _aofApplication.messaging.notify.NOTIFY_TIMEOUT_MS;
const buildNotifyEnvelope = _aofApplication.messaging.notify.buildNotifyEnvelope;
const notify = _aofApplication.messaging.notify.notify;
const resolveNotifyConfig = _aofApplication.messaging.notify.resolveNotifyConfig;
const askMessagesDir = _aofApplication.messaging.askMessages.askMessagesDir;
const readAskMessage = _aofApplication.messaging.askMessages.readAskMessage;
const recordAskMessage = _aofApplication.messaging.askMessages.recordAskMessage;
const writeMessagingSecret = _aofApplication.messaging.secret.writeMessagingSecret;
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import {
  FLAT_LAYER_THRESHOLD,
  SOURCE_DIRECTORY_BUDGETS,
  SOURCE_DIRECTORY_EXEMPTIONS,
  readTreeListing,
  sourceDirectoryBudgetViolations,
} from "../arch/testing/acd-source-directory-budget.test.mjs";
import { REGRESSION_DIVIDER, REGRESSION_HEADER, REGRESSION_HEADING } from "@aof/work/regression-record";
import { stripComments } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const NOW = () => new Date("2026-09-23T17:00:00.000Z");
// Synthetic bot tokens (09 QA ruling 1): a base64url snowflake, a short middle, a named third segment.
const SECRET = "MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.secret-token";
const HOOK_B_TOKEN = "OTg3NjU0MzIxMDk4NzY1NDMy.AbCdEf.other-token";
const CHANNEL = "123456789012345678";
const CHANNEL_B = "876543210987654321";
const ROUTE = (id = CHANNEL) => `https://discord.com/api/v10/channels/${id}/messages`;
const authOf = (call) => call.init.headers.authorization;

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
// object with the three members `discordRequest` reads.
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
const OPS = { channels: { ops: { type: "discord", channelId: CHANNEL, tokenEnv: "HOOK_A" } } };
const statusOf = async (specPath) => /^status: (.+)$/mu.exec(await readFile(specPath, "utf8"))[1];

// ── task 05: the delivery's workspace and envelope ─────────────────────────────────────────────
const workspaceWith = (notifyBlock) => ({ config: { work: { notify: notifyBlock } } });
const WORKSPACE = workspaceWith(OPS);
const ENV = buildNotifyEnvelope("session-needs-input", { ref: "127/02", phase: "build", elapsedMs: 720000, question: "Move the residue?" }, { config: {}, now: NOW });
const hasSecret = (value) => JSON.stringify(value).includes("secret-token");

// ── 131/10 task 02's fixtures: a fresh global home on the process (the index and the store are the
// process's), and a workspace whose `discord` channel posts to CHANNEL.
async function withIsolatedHome(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-notify-index-")));
  const home = path.join(tmp, "home");
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    const workspace = { projectRoot: path.join(tmp, "project"), config: { work: { notify: { channels: { discord: { type: "discord", channelId: CHANNEL } } } } } };
    return await body({ home, workspace });
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(tmp, { recursive: true, force: true });
  }
}
const askEnvelope = (event) => buildNotifyEnvelope(event, { ref: "131/03", phase: "build", elapsedMs: 1000, question: "Q?", stop: { id: "x" }, outcome: { title: "T" } }, { config: {}, now: NOW });
// A fetch answering 200 with `{ id }` as JSON, the way Discord answers a posted message.
const postedAs = (id) => async () => response(200, { body: { id }, headers: { "content-type": "application/json" } });

export const notifyChannelsTests = [
  // ── task 00: the family is founded and registered ───────────────────────────────────────────
  {
    name: "131/02 task00 — src/notify and test/notify are exemptions naming their members, and the live tree's budget holds",
    async run() {
      const src = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "packages/core/src/notify");
      assert.ok(src, "packages/core/src/notify is an exemption");
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
      const live = (await readTreeListing()).filter((entry) => !["packages/core/src/notify", "test/notify"].includes(entry.dir) && !(entry.name === "notify" && ["src", "test"].includes(entry.dir)));
      const withFiles = (dir, n) => [
        ...live,
        { dir: dir.split("/")[0], name: "notify", kind: "dir" },
        ...Array.from({ length: n }, (_, i) => ({ dir, name: `m${i}.mjs`, kind: "file" })),
      ];
      const keepOther = (dir) => (dir === "packages/core/src/notify" ? withFiles("test/notify", 4) : withFiles("packages/core/src/notify", 4));
      const naming = (listing, dir) => sourceDirectoryBudgetViolations(listing, SOURCE_DIRECTORY_BUDGETS, SOURCE_DIRECTORY_EXEMPTIONS).filter((v) => (v.message ?? "").includes(`${dir}/`));
      for (const [dir, n, count] of [["packages/core/src/notify", 4, 0], ["packages/core/src/notify", 8, 0], ["packages/core/src/notify", 9, 1], ["test/notify", 4, 0], ["test/notify", 9, 1]]) {
        const other = dir === "packages/core/src/notify" ? "test/notify" : "packages/core/src/notify";
        const listing = [...withFiles(dir, n), ...keepOther(dir).filter((e) => e.dir === other || (e.name === "notify" && e.dir === other.split("/")[0]))];
        const violations = naming(listing, dir);
        assert.equal(violations.length, count, `${dir} with ${n} files: ${JSON.stringify(violations.map((v) => v.message))}`);
        if (count === 1) assert.match(violations[0].message, /owes a ROW/u, "it now owes a row");
      }
      assert.ok(FLAT_LAYER_THRESHOLD === 8, "the threshold these rows are measured against");
      const absent = [...live, { dir: "test", name: "notify", kind: "dir" }, ...Array.from({ length: 4 }, (_, i) => ({ dir: "test/notify", name: `m${i}.mjs`, kind: "file" }))];
      assert.equal(naming(absent, "packages/core/src/notify").length, 1, "an absent src/notify is one stale-exemption violation");
    },
  },

  // ── task 02: work.notify names the env var, never the secret ────────────────────────────────
  {
    name: "131/02 task02 — the schema admits a channel naming its env var and every well-formed block, and refuses the URL itself",
    async run() {
      const validate = await compileSchema();
      const D = { type: "discord", channelId: CHANNEL };
      assert.ok(validate(configOf({ channels: { ops: { ...D, tokenEnv: "AOF_DISCORD_BOT_TOKEN", events: ["session-needs-input", "milestone-accepted"] } }, link: "https://example.test/board/{ref}" })), JSON.stringify(validate.errors));
      for (const block of [
        { channels: {} },
        { channels: { ops: D } },
        { channels: { ops: { ...D, tokenEnv: "A" } } },
        { channels: { ops: { ...D, tokenEnv: "HOOK_2_B" } } },
        { channels: { ops: { ...D, events: ["loop-died"] } } },
        { channels: { ops: { ...D, events: [...EVENTS] } } },
        { channels: { ops: D, b: { ...D, channelId: CHANNEL_B, tokenEnv: "HOOK_B" } }, link: "https://example.test/board" },
        { channels: { ops: { ...D, channelId: "12345678901234567" } } },
        { channels: { ops: { ...D, channelId: "12345678901234567890" } } },
      ]) {
        assert.ok(validate(configOf(block)), `${JSON.stringify(block)}: ${JSON.stringify(validate.errors)}`);
      }
      assert.equal(validate(configOf({ channels: { ops: { type: "discord", channelId: CHANNEL, url: SECRET } } })), false);
      assert.ok(validate.errors.some((e) => e.keyword === "additionalProperties" && e.instancePath === "/work/notify/channels/ops"), "the error points at the channel's unknown property");
    },
  },
  {
    name: "131/02 task02 — a malformed channel is refused where it is malformed, and a malformed block at the block (thirty-six rows)",
    async run() {
      const validate = await compileSchema();
      const at = (p) => `/work/notify${p}`;
      const D = { type: "discord", channelId: CHANNEL };
      const channelRows = [
        [{ ...D, webhook: SECRET }, "additionalProperties", "/channels/ops"],
        [{ ...D, token: "abc" }, "additionalProperties", "/channels/ops"],
        [{ ...D, urlEnv: "HOOK_A" }, "additionalProperties", "/channels/ops"],
        [{ ...D, tokenEnv: "aof_hook" }, "pattern", "/channels/ops/tokenEnv"],
        [{ ...D, tokenEnv: "1HOOK" }, "pattern", "/channels/ops/tokenEnv"],
        [{ ...D, tokenEnv: "_HOOK" }, "pattern", "/channels/ops/tokenEnv"],
        [{ ...D, tokenEnv: "AOF-HOOK" }, "pattern", "/channels/ops/tokenEnv"],
        [{ ...D, tokenEnv: "" }, "pattern", "/channels/ops/tokenEnv"],
        [{ ...D, tokenEnv: SECRET }, "pattern", "/channels/ops/tokenEnv"],
        [{ ...D, tokenEnv: 42 }, "type", "/channels/ops/tokenEnv"],
        [{ type: "discord" }, "required", "/channels/ops"],
        [{ ...D, channelId: "not-a-snowflake" }, "pattern", "/channels/ops/channelId"],
        [{ ...D, channelId: "1234567890123456" }, "pattern", "/channels/ops/channelId"],
        [{ ...D, channelId: "123456789012345678901" }, "pattern", "/channels/ops/channelId"],
        [{ ...D, channelId: 123456789012345678 }, "type", "/channels/ops/channelId"],
        [{ ...D, type: "slack" }, "enum", "/channels/ops/type"],
        [{ ...D, type: "Discord" }, "enum", "/channels/ops/type"],
        [{ channelId: CHANNEL, tokenEnv: "HOOK_A" }, "required", "/channels/ops"],
        [{ ...D, events: ["session-exploded"] }, "enum", "/channels/ops/events/0"],
        [{ ...D, events: [] }, "minItems", "/channels/ops/events"],
        [{ ...D, events: ["loop-died", "loop-died"] }, "uniqueItems", "/channels/ops/events"],
        [{ ...D, events: "loop-died" }, "type", "/channels/ops/events"],
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
    name: "131/02 task02 — the resolver applies its defaults, answers null for nothing to notify, and never throws (thirteen rows)",
    run() {
      assert.deepEqual(resolveNotifyConfig({ work: { notify: { channels: { ops: { type: "discord" } } } } }), { channels: [{ name: "ops", type: "discord", channelId: null, tokenEnv: "AOF_DISCORD_BOT_TOKEN", allow: [], events: [...EVENTS] }], link: null });
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
      const kept = channelsOf({ channels: { ops: { type: "discord", channelId: CHANNEL, tokenEnv: "HOOK_A", events: ["milestone-accepted", "loop-died"] } }, link: "https://example.test/{ref}" });
      assert.deepEqual(kept, { channels: [{ name: "ops", type: "discord", channelId: CHANNEL, tokenEnv: "HOOK_A", allow: [], events: ["milestone-accepted", "loop-died"] }], link: "https://example.test/{ref}" });
      assert.deepEqual(channelsOf({ channels: { zeta: { type: "discord" }, alpha: { type: "discord" } } }).channels.map((c) => c.name), ["zeta", "alpha"]);
      assert.deepEqual(channelsOf({ channels: { ops: { type: "discord" }, 2: { type: "discord" } } }).channels.map((c) => c.name), ["2", "ops"]);
      assert.deepEqual(channelsOf({ channels: { ops: null, alerts: { type: "discord" } } }).channels, [{ name: "alerts", type: "discord", channelId: null, tokenEnv: "AOF_DISCORD_BOT_TOKEN", allow: [], events: [...EVENTS] }]);
      assert.deepEqual(channelsOf({ channels: { ops: { type: "slack" } } }).channels, [{ name: "ops", type: "slack", channelId: null, tokenEnv: "AOF_DISCORD_BOT_TOKEN", allow: [], events: [...EVENTS] }]);
      assert.deepEqual(channelsOf({ channels: { ops: { type: "discord", channelId: 42, tokenEnv: 42, events: "loop-died" } }, link: 7 }), { channels: [{ name: "ops", type: "discord", channelId: null, tokenEnv: "AOF_DISCORD_BOT_TOKEN", allow: [], events: [...EVENTS] }], link: null });

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
    name: "131/02 task05 — a 2xx delivers once, with the token from env, the rendered body; an absent block makes no call; the send is one JSON POST with a signal",
    async run() {
      const events = degradeSink();
      const spy = fetchSpy();
      assert.deepEqual(await notify(WORKSPACE, ENV, { env: { HOOK_A: SECRET }, fetch: spy }), { delivered: ["ops"], failed: [], messages: [{ channel: "ops", channelId: CHANNEL, messageId: null }] });
      assert.equal(spy.calls.length, 1);
      assert.equal(spy.calls[0].url, ROUTE());
      assert.equal(authOf(spy.calls[0]), `Bot ${SECRET}`);
      assert.equal(spy.calls[0].init.method, "POST");
      assert.deepEqual(JSON.parse(spy.calls[0].init.body), renderDiscord(ENV));

      const none = fetchSpy();
      assert.deepEqual(await notify({ config: {} }, ENV, { env: { HOOK_A: SECRET }, fetch: none }), { delivered: [], failed: [], messages: [] });
      assert.equal(none.calls.length, 0);
      assert.deepEqual(notifyEvents(events), []);

      const direct = fetchSpy();
      await sendDiscord(SECRET, CHANNEL, renderDiscord(ENV), { fetch: direct, timeoutMs: 50 });
      const { url, init } = direct.calls[0];
      assert.equal(url, ROUTE());
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
    name: "131/02 task05 — every answer Discord can give maps to one result, one degrade and one send answer (sixteen rows)",
    async run() {
      const OK = { delivered: ["ops"], failed: [], messages: [{ channel: "ops", channelId: CHANNEL, messageId: null }] };
      const FAILED = { delivered: [], failed: ["ops"], messages: [] };
      const fail = (reason, status, retryAfter = null) => ({ ok: false, status, messageId: null, reason, retryAfter });
      const rows = [
        [() => response(200), OK, null, { ok: true, status: 200, messageId: null, reason: null, retryAfter: null }],
        [() => response(204), OK, null, { ok: true, status: 204, messageId: null, reason: null, retryAfter: null }],
        [() => response(400), FAILED, ["notify-delivery-failed", "400"], fail("status", 400)],
        [() => response(404), FAILED, ["notify-delivery-failed", "404"], fail("status", 404)],
        [() => response(500), FAILED, ["notify-delivery-failed", "500"], fail("status", 500)],
        [() => response(429, { body: { retry_after: 1.5 } }), FAILED, ["notify-rate-limited", "1.5"], fail("rate-limited", 429, 1.5)],
        [() => response(429, { headers: { "Retry-After": "2" }, json: async () => { throw new SyntaxError("not json"); } }), FAILED, ["notify-rate-limited", "2"], fail("rate-limited", 429, 2)],
        [() => response(429, { body: { retry_after: 0.8 }, headers: { "Retry-After": "3" } }), FAILED, ["notify-rate-limited", "0.8"], fail("rate-limited", 429, 0.8)],
        [() => response(429, { body: { retry_after: "soon" }, headers: { "Retry-After": "3" } }), FAILED, ["notify-rate-limited", "3"], fail("rate-limited", 429, 3)],
        [() => response(429, { headers: { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }, json: async () => { throw new SyntaxError("no body"); } }), FAILED, ["notify-rate-limited", null], fail("rate-limited", 429)],
        [() => response(429, { json: async () => { throw new SyntaxError("no body"); } }), FAILED, ["notify-rate-limited", null], fail("rate-limited", 429)],
        [() => response(429, { headers: { "Retry-After": "4" }, json: never }), FAILED, ["notify-rate-limited", "4"], fail("rate-limited", 429, 4)],
        [() => { throw new TypeError("fetch failed"); }, FAILED, ["notify-delivery-failed", "TypeError"], fail("error", null)],
        [() => Promise.reject(undefined), FAILED, ["notify-delivery-failed", null], fail("error", null)],
        [(url, init) => untilAborted(init), FAILED, ["notify-delivery-failed", null], fail("timeout", null)],
        [() => never(), FAILED, ["notify-delivery-failed", null], fail("timeout", null)],
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
          assert.deepEqual(await sendDiscord(SECRET, CHANNEL, renderDiscord(ENV), { fetch: fetchSpy(behaviour), timeoutMs: 50 }), send, `row ${index}: send`);
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/02 task05 — a channel that cannot be sent fails without a call, degraded notify-channel-unconfigured by name (eight rows)",
    async run() {
      const D = { type: "discord", channelId: CHANNEL };
      try {
        for (const [channel, env, named] of [
          [{ ...D, tokenEnv: "HOOK_A" }, {}, ["ops", "HOOK_A"]],
          [{ ...D, tokenEnv: "HOOK_A" }, { HOOK_A: "" }, ["ops", "HOOK_A"]],
          [{ ...D, tokenEnv: "HOOK_A" }, { HOOK_A: "  " }, ["ops", "HOOK_A"]],
          [D, { HOOK_A: SECRET }, ["ops", "AOF_DISCORD_BOT_TOKEN"]],
          [{ ...D, type: "slack", tokenEnv: "HOOK_A" }, { HOOK_A: SECRET }, ["ops"]],
          [{ ...D, tokenEnv: "HOOK_A" }, { HOOK_A: "https://discord.com/api/webhooks/111/secret-token" }, ["ops", "aof messaging init discord"]],
          [{ type: "discord", tokenEnv: "HOOK_A" }, { HOOK_A: SECRET }, ["ops", "aof messaging enable discord --channel <id>"]],
          [{ ...D, channelId: "../../users/@me", tokenEnv: "HOOK_A" }, { HOOK_A: SECRET }, ["ops", "aof messaging enable discord --channel <id>"]],
        ]) {
          const events = degradeSink();
          const spy = fetchSpy();
          assert.deepEqual(await notify(workspaceWith({ channels: { ops: channel } }), ENV, { env, fetch: spy }), { delivered: [], failed: ["ops"], messages: [] });
          assert.equal(spy.calls.length, 0);
          const seen = notifyEvents(events);
          assert.deepEqual(seen.map((e) => e.code), ["notify-channel-unconfigured"]);
          for (const word of named) assert.ok(seen[0].message.includes(word), `${seen[0].message} names ${word}`);
          assert.ok(!hasSecret(seen), "and never the token");
        }
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  {
    name: "131/02 task05 — channels are selected by event, sent in parallel, and reported in config order (nine rows)",
    async run() {
      const a = { type: "discord", channelId: CHANNEL, tokenEnv: "HOOK_A" };
      const bb = { type: "discord", channelId: CHANNEL_B, tokenEnv: "HOOK_B" };
      const env = { HOOK_A: SECRET, HOOK_B: HOOK_B_TOKEN };
      const byUrl = (forA, forB) => (url) => (url === ROUTE(CHANNEL) ? forA() : forB());
      const later = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
      const rows = [
        [{ ops: { ...a, events: ["milestone-accepted"] } }, () => response(204), { delivered: [], failed: [] }, 0, []],
        [{ ops: { ...a, events: ["session-needs-input"] } }, () => response(204), { delivered: ["ops"], failed: [] }, 1, []],
        [{ ops: a, alerts: bb }, byUrl(() => response(204), () => response(500)), { delivered: ["ops"], failed: ["alerts"] }, 2, [["notify-delivery-failed", "alerts"]]],
        [{ ops: a, alerts: bb }, byUrl(() => response(500), () => response(204)), { delivered: ["alerts"], failed: ["ops"] }, 2, [["notify-delivery-failed", "ops"]]],
        [{ ops: a, alerts: bb }, byUrl(() => later(30, response(204)), () => response(204)), { delivered: ["ops", "alerts"], failed: [] }, 2, []],
        [{ ops: a, alerts: bb }, byUrl(() => response(429), () => response(500)), { delivered: [], failed: ["ops", "alerts"] }, 2, [["notify-rate-limited", "ops"], ["notify-delivery-failed", "alerts"]]],
        [{ ops: a, alerts: bb }, () => response(500), { delivered: [], failed: ["ops", "alerts"] }, 2, [["notify-delivery-failed", null]]],
        [{ ops: { ...a, tokenEnv: "HOOK_Z", events: ["milestone-accepted"] }, alerts: bb }, () => response(204), { delivered: ["alerts"], failed: [] }, 1, []],
        [{ ops: { ...a, tokenEnv: "HOOK_Z" }, alerts: bb }, () => response(204), { delivered: ["alerts"], failed: ["ops"] }, 1, [["notify-channel-unconfigured", "HOOK_Z"]]],
      ];
      try {
        for (const [index, [channels, behaviour, result, calls, degrades]] of rows.entries()) {
          const events = degradeSink();
          const spy = fetchSpy(behaviour);
          const answer = await notify(workspaceWith({ channels }), ENV, { env, fetch: spy, timeoutMs: 50 });
          assert.deepEqual({ delivered: answer.delivered, failed: answer.failed }, result, `row ${index}`);
          assert.deepEqual(answer.messages.map((m) => m.channel), result.delivered, `row ${index}: one message per delivered channel, in config order`);
          assert.equal(spy.calls.length, calls, `row ${index}: ${calls} call(s)`);
          if (index === 4) assert.deepEqual(spy.calls.map((c) => c.url), [ROUTE(CHANNEL), ROUTE(CHANNEL_B)], "HOOK_B was called before HOOK_A settled");
          if (index >= 7) assert.deepEqual(spy.calls.map(authOf), [`Bot ${HOOK_B_TOKEN}`], "the one call is with HOOK_B's token");
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
          [null, ENV, { delivered: [], failed: [], messages: [] }, []],
          [{}, ENV, { delivered: [], failed: [], messages: [] }, []],
          [WORKSPACE, null, { delivered: [], failed: [], messages: [] }, []],
          [WORKSPACE, { event: "session-exploded" }, { delivered: [], failed: [], messages: [] }, []],
          [WORKSPACE, throwing, { delivered: [], failed: ["ops"], messages: [] }, ["notify-delivery-failed"]],
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
    name: "131/02 task05 — the token never leaves env, whatever carries it back (six rows)",
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
          assert.deepEqual(result, { delivered: [], failed: ["ops"], messages: [] }, `row ${index}`);
          assert.ok(!hasSecret(events) && !hasSecret(result), `row ${index}: the token stayed in env — ${JSON.stringify(events)}`);
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
        // 131/13: line 1 names the project (the config's `name`, else its folder), before the node.
        assert.equal(JSON.parse(spy.calls[0].init.body).content, "**90 — accepted** · fixture\nFixture milestone");
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
        ["events loop-died only", { channels: { ops: { type: "discord", channelId: CHANNEL, tokenEnv: "HOOK_A", events: ["loop-died"] } } }, { env: { HOOK_A: SECRET }, fetch: fetchSpy() }, 0, []],
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
        // 131/13: line 1 names the project (`fixture`), before the node.
        [null, {}, undefined, "**90 — accepted** · fixture"],
        ["Ship it @everyone", {}, undefined, "**90 — accepted** · fixture\nShip it @everyone"],
        ["Fixture milestone", { mesh: { nodeId: "node-7297" } }, "https://x.test/{ref}", "**90 — accepted** · fixture · node-7297\nFixture milestone\nhttps://x.test/90"],
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
  // ── 131/09 task 01: a channel names its Discord channel by id ────────────────────────────────
  {
    name: "131/09 task01 — the schema accepts the bot channel and refuses the webhook keys (six rows), validated over the whole config document",
    async run() {
      const validate = await compileSchema();
      for (const [channel, valid] of [
        [{ type: "discord", channelId: "123456789012345678" }, true],
        [{ type: "discord", channelId: "123456789012345678", tokenEnv: "MY_BOT" }, true],
        [{ type: "discord" }, false],
        [{ type: "discord", channelId: "123456789012345678", urlEnv: "X" }, false],
        [{ type: "discord", channelId: "123456789012345678", token: "x" }, false],
        [{ type: "discord", channelId: "not-a-snowflake" }, false],
      ]) {
        assert.equal(validate(configOf({ channels: { discord: channel } })), valid, `${JSON.stringify(channel)}: ${JSON.stringify(validate.errors)}`);
      }
    },
  },
  {
    name: "131/09 task02 — a 2xx whose body never arrives is delivered with no message id, never reported as a failure",
    async run() {
      const events = degradeSink();
      try {
        const hanging = () => ({ status: 200, headers: { get: () => "application/json" }, json: never });
        assert.deepEqual(await sendDiscord(SECRET, CHANNEL, { content: "x" }, { fetch: hanging, timeoutMs: 50 }), { ok: true, status: 200, messageId: null, reason: null, retryAfter: null });
        const answer = await notify(WORKSPACE, ENV, { env: { HOOK_A: SECRET }, fetch: hanging, timeoutMs: 50 });
        assert.deepEqual(answer, { delivered: ["ops"], failed: [], messages: [{ channel: "ops", channelId: CHANNEL, messageId: null }] });
        assert.deepEqual(notifyEvents(events), [], "nothing degraded");
      } finally {
        setDegradeSinkForTest(undefined);
      }
    },
  },
  // ── 131/10 task 02: an ask message is indexed when the notifier posts it ─────────────────────
  {
    name: "131/10 task02 — a posted ask is indexed by its message id, with exactly the seven keys, and readAskMessage answers it",
    async run() {
      await withIsolatedHome(async ({ home, workspace }) => {
        await writeMessagingSecret("discord", SECRET);
        const answer = await notify(workspace, askEnvelope("session-needs-input"), { env: {}, fetch: postedAs("998877665544332211"), timeoutMs: 50 });
        assert.deepEqual(answer.delivered, ["discord"]);
        const file = path.join(home, "messaging", "discord-asks", "998877665544332211.json");
        const record = JSON.parse(await readFile(file, "utf8"));
        assert.deepEqual(Object.keys(record), ["messageId", "channelId", "event", "ref", "workspaceId", "projectRoot", "postedAt"]);
        assert.deepEqual({ ...record, postedAt: typeof record.postedAt }, {
          messageId: "998877665544332211", channelId: CHANNEL, event: "session-needs-input", ref: "131/03",
          workspaceId: resolveWorkspaceId(workspace), projectRoot: workspace.projectRoot, postedAt: "string",
        });
        assert.deepEqual(await readAskMessage("998877665544332211"), record, "the reader answers that record");
      });
    },
  },
  {
    name: "131/10 task02 — which events are indexed (five rows): the two ask events, and no other",
    async run() {
      for (const [event, indexed] of [
        ["session-needs-input", true],
        ["session-parked-unanswered", true],
        ["session-answered", false],
        ["loop-halted", false],
        ["milestone-accepted", false],
      ]) {
        await withIsolatedHome(async ({ workspace }) => {
          await writeMessagingSecret("discord", SECRET);
          const answer = await notify(workspace, askEnvelope(event), { env: {}, fetch: postedAs("111111111111111111"), timeoutMs: 50 });
          assert.deepEqual(answer.delivered, ["discord"], event);
          assert.equal((await readAskMessage("111111111111111111")) != null, indexed, `${event}: ${indexed ? "holds a record" : "holds no record"}`);
        });
      }
    },
  },
  {
    name: "131/10 task02 — an index that cannot be written never fails the send: delivered, and one notify-ask-index (two rows)",
    async run() {
      for (const id of ["1", "121212121212121212"]) {
        await withIsolatedHome(async ({ workspace }) => {
          const events = degradeSink();
          try {
            await writeMessagingSecret("discord", SECRET);
            // The index directory's path is occupied by a plain file.
            await writeFile(askMessagesDir(), "not a directory\n", "utf8");
            const answer = await notify(workspace, askEnvelope("session-needs-input"), { env: {}, fetch: postedAs(id), timeoutMs: 50 });
            assert.deepEqual(answer.delivered, ["discord"], `id ${id}: delivered`);
            assert.deepEqual(notifyEvents(events).map((e) => e.code), ["notify-ask-index"], `id ${id}: one notify-ask-index`);
            assert.ok(!hasSecret(events), "and never the token");
          } finally {
            setDegradeSinkForTest(undefined);
          }
        });
      }
    },
  },
  {
    name: "131/10 task02 — old records are pruned at write: 31 days old goes, 29 days old and the new one stay",
    async run() {
      await withIsolatedHome(async () => {
        const now = new Date("2026-09-25T12:00:00.000Z");
        const daysAgo = (days) => () => new Date(now.getTime() - days * 86_400_000);
        await recordAskMessage({ messageId: "310000000000000031", channelId: CHANNEL, event: "session-needs-input", ref: "131/01" }, { now: daysAgo(31) });
        await recordAskMessage({ messageId: "290000000000000029", channelId: CHANNEL, event: "session-needs-input", ref: "131/02" }, { now: daysAgo(29) });
        await recordAskMessage({ messageId: "100000000000000001", channelId: CHANNEL, event: "session-needs-input", ref: "131/03" }, { now: () => now });
        assert.equal(await readAskMessage("310000000000000031"), null, "the 31-day record is gone");
        assert.notEqual(await readAskMessage("290000000000000029"), null, "the 29-day record remains");
        assert.notEqual(await readAskMessage("100000000000000001"), null, "the new one remains");
      });
    },
  },
  {
    name: "131/10 task02 — the reader refuses a message id that is not a snowflake (three rows), reading no file outside discord-asks/",
    async run() {
      await withIsolatedHome(async ({ home }) => {
        const bait = { messageId: "../secret", channelId: CHANNEL, event: "session-needs-input", ref: "131/03", workspaceId: "w", projectRoot: "/", postedAt: "2026-09-25T12:00:00.000Z" };
        await mkdir(path.join(home, "messaging"), { recursive: true });
        await writeFile(path.join(home, "messaging", "secret.json"), JSON.stringify(bait), "utf8");
        for (const id of ["../secret", "abc", ""]) assert.equal(await readAskMessage(id), null, JSON.stringify(id));
        await assert.rejects(recordAskMessage({ ...bait }), (error) => error.code === "notify-ask-index", "the writer refuses it too");
      });
    },
  },

  // ── 131/10 task 04: the ask message says it can be answered by reply ────────────────────────
  {
    name: "131/10 task04 — notify passes replyable from each channel's allow: only the allowlisted channel offers the reply",
    async run() {
      await withIsolatedHome(async ({ workspace }) => {
        await writeMessagingSecret("discord", SECRET);
        const posts = [];
        const fetch = async (url, init) => {
          posts.push({ url, content: JSON.parse(init.body).content });
          return response(200);
        };
        const channels = {
          open: { type: "discord", channelId: CHANNEL, allow: ["222222222222222222"] },
          closed: { type: "discord", channelId: CHANNEL_B },
        };
        await notify({ ...workspace, config: { work: { notify: { channels } } } }, askEnvelope("session-needs-input"), { env: {}, fetch, timeoutMs: 50 });
        const byChannel = Object.fromEntries(posts.map((post) => [post.url.includes(CHANNEL_B) ? "closed" : "open", post.content]));
        assert.ok(byChannel.open.includes("reply to this message"), byChannel.open);
        assert.ok(!byChannel.closed.includes("reply to this message"), byChannel.closed);
      });
    },
  },
  {
    name: "131/10 task04 — the schema's allowlist (four rows): unique snowflakes",
    async run() {
      const validate = await compileSchema();
      for (const [allow, valid] of [
        [["222222222222222222"], true],
        [[], true],
        [["222222222222222222", "222222222222222222"], false],
        [["umami"], false],
      ]) {
        assert.equal(validate(configOf({ channels: { discord: { type: "discord", channelId: CHANNEL, allow } } })), valid, `${JSON.stringify(allow)}: ${JSON.stringify(validate.errors)}`);
      }
    },
  },
];
