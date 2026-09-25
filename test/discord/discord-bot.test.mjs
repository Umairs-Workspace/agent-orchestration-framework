// test/discord/discord-bot.test.mjs — milestone 131 / story 10, task 00
// (00_the-discord-family-is-founded-and-the-bot-runs-on-the-control.feature; ADR-008 §1). There is no
// launcher suite to extend (developer ruling 2), so the launcher's start and stop of the bot are
// driven here: `startLauncher` over a fake fabric, manual tickers and NO stream server or client,
// with `startDiscordBot` injected as a spy, so no case opens a socket. Then the bot itself, over the
// fake gateway: a `MESSAGE_CREATE` reply reaches the answer, end to end.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startLauncher } from "../../src/mesh/launcher.mjs";
import { startDiscordBot } from "../../src/discord/bot.mjs";
import { startGateway } from "../../src/discord/gateway.mjs";
import { writeMessagingSecret } from "../../src/notify/secret.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import {
  SOURCE_DIRECTORY_EXEMPTIONS,
  readTreeListing,
  sourceDirectoryBudgetViolations,
} from "../arch/testing/acd-source-directory-budget.test.mjs";
import { stripComments } from "../support/source-slice.mjs";
import { ALLOWED, CHANNEL, REPLY_MESSAGE, TOKEN, fakeClock, fakeGateway, flush, ready, reply, withReplyWorld } from "./discord-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function manualTicker() {
  const handles = [];
  return {
    handles,
    start(intervalSeconds, onTick) {
      const handle = { intervalSeconds, onTick, stopped: false };
      handles.push(handle);
      return handle;
    },
    stop(handle) { handle.stopped = true; },
  };
}

// A launcher on `nodeId` in a mesh whose control is `control-a`, under a fresh global home set on the
// process (the token store is the process's). `stored` writes a token first; `env` is the override.
async function withLauncher({ nodeId, stored = false, env = {} }, body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-discord-launcher-")));
  const home = path.join(tmp, "home");
  const repo = path.join(tmp, "repo");
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    await mkdir(path.join(repo, "wiki", "work"), { recursive: true });
    await mkdir(path.join(repo, ".aof"), { recursive: true });
    const config = { name: "fixture", work: { dir: "./wiki/work" }, mesh: { nodeId, fabric: "tailscale", relay: { controlNode: "control-a" } } };
    await writeFile(path.join(repo, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
    if (stored) await writeMessagingSecret("discord", TOKEN);
    const ws = await loadWorkspace(repo, undefined, { env: { AOF_GLOBAL_HOME: home } });
    const started = [];
    const stops = [];
    const warnings = [];
    const startDiscordBot = (options) => {
      started.push(options);
      return { stop: () => { stops.push(true); } };
    };
    const handle = await startLauncher(ws, {
      exec: async () => ({ stdout: JSON.stringify({ BackendState: "Running", Self: { HostName: nodeId, DNSName: `${nodeId}.tail1a2b.ts.net.`, TailscaleIPs: ["100.1.1.1"], Online: true }, Peer: {} }), status: 0 }),
      platform: "linux",
      peerPollTicker: manualTicker(),
      propagationTicker: manualTicker(),
      streamSyncTicker: manualTicker(),
      streamServer: false,
      streamClient: false,
      controlDispatchReclaimTicker: false,
      globalWorkStoreOptions: { env: { AOF_GLOBAL_HOME: home } },
      env,
      onWarning: (warning) => warnings.push(warning),
      startDiscordBot,
    });
    assert.equal(handle.refused, undefined, "the launcher starts");
    try {
      return await body({ handle, started, stops, warnings });
    } finally {
      handle.stop();
    }
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}

export const discordBotTests = [
  {
    name: "131/10 task00 — which node starts the bot (four rows): the control with a token, and nowhere else",
    async run() {
      for (const [label, setup, calls, off] of [
        ["the control node, a token stored", { nodeId: "control-a", stored: true }, 1, 0],
        ["the control node, AOF_DISCORD_BOT_TOKEN set", { nodeId: "control-a", env: { AOF_DISCORD_BOT_TOKEN: TOKEN } }, 1, 0],
        ["the control node, nothing", { nodeId: "control-a" }, 0, 1],
        ["a worker, a token stored", { nodeId: "worker-a", stored: true }, 0, 0],
      ]) {
        await withLauncher(setup, async ({ started, warnings }) => {
          assert.equal(started.length, calls, `${label}: the spy was called ${calls} time(s)`);
          if (calls === 1) assert.equal(started[0].token, TOKEN, `${label}: with the resolved token`);
          const offs = warnings.filter((warning) => warning.code === "discord-bot-off");
          assert.equal(offs.length, off, `${label}: ${off} discord-bot-off`);
          if (off === 1) assert.equal(offs[0].level, "info", "logged at info");
        });
      }
    },
  },
  {
    name: "131/10 task00 — stopping the launcher stops the bot, once",
    async run() {
      let stops = null;
      await withLauncher({ nodeId: "control-a", stored: true }, async (world) => {
        stops = world.stops;
        assert.equal(stops.length, 0, "running");
        world.handle.stop();
        assert.equal(stops.length, 1, "the bot handle's stop was called once");
      });
    },
  },
  {
    name: "131/10 task00 — the launcher reaches bot.mjs only by a deferred import inside its control branch",
    async run() {
      const launcher = stripComments(await readFile(path.join(repoRoot, "src", "mesh", "launcher.mjs"), "utf8"));
      assert.doesNotMatch(launcher, /^\s*import\b[^;]*discord\/bot\.mjs/mu, "no static import of bot.mjs");
      const at = launcher.indexOf('import("../discord/bot.mjs")');
      assert.ok(at > 0, "a deferred import of bot.mjs");
      const guard = launcher.lastIndexOf("if (issuanceAuthority)", at);
      assert.ok(guard > 0 && at - guard < 1200, "inside the control-node branch");
    },
  },
  {
    name: "131/10 task00 — the new directories are budgeted as exemptions naming their members, and the discord suite is reachable from the runner",
    async run() {
      const src = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "src/discord");
      const test = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "test/discord");
      assert.ok(src && test, "src/discord and test/discord are exemptions");
      for (const member of ["131/10", "gateway.mjs", "bot.mjs", "replies.mjs", "commands.mjs"]) assert.ok(src.why.includes(member), `src/discord's why names ${member}`);
      for (const member of ["131/10", "index", "discord-fixture.mjs", "discord-bot", "discord-gateway", "discord-replies", "discord-commands"]) assert.ok(test.why.includes(member), `test/discord's why names ${member}`);
      assert.ok(SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "src/notify").why.includes("ask-messages.mjs"), "src/notify's why names ask-messages.mjs");
      const named = sourceDirectoryBudgetViolations(await readTreeListing()).filter((v) => /(?:src|test)\/discord|src\/notify/u.test(v.message ?? JSON.stringify(v)));
      assert.deepEqual(named, [], "the budget over the live tree names none of them");
      const registry = stripComments(await readFile(path.join(repoRoot, "scripts", "test.mjs"), "utf8"));
      assert.equal(registry.split("../test/discord/index.mjs").length - 1, 1, "scripts/test.mjs imports the index once");
      assert.match(registry, /\.\.\.discordTests\b/u, "and spreads it");
      const run = spawnSync(process.execPath, ["scripts/test.mjs", "--only", "test/discord/discord-gateway.test.mjs"], { cwd: repoRoot, encoding: "utf8", windowsHide: true, env: { ...process.env } });
      assert.equal(run.status, 0, `the gateway suite runs green through the runner: ${run.stdout.slice(-400)}${run.stderr.slice(-400)}`);
      assert.ok((run.stdout.match(/^ok - 131\/10 task01/gmu) ?? []).length > 0, "the discord suite is reachable from the runner");
    },
  },
  {
    name: "131/10 task00 — the bot routes a gateway MESSAGE_CREATE to the answer by reply: an allowlisted reply answers, end to end",
    async run() {
      await withReplyWorld(async ({ context, askState }) => {
        const clock = fakeClock();
        const fake = fakeGateway();
        const calls = [];
        const fetch = async (url, init) => {
          calls.push({ url, method: init.method });
          return { status: 204, headers: { get: () => null }, json: async () => ({}) };
        };
        const bot = startDiscordBot({
          token: TOKEN,
          fetch,
          invoke: context.invoke,
          loadWorkspace: context.loadWorkspace,
          gateway: (options) => startGateway({ ...options, request: fake.request, socketFactory: fake.socketFactory, timers: clock.timers, random: () => 0.5 }),
        });
        try {
          await flush();
          ready(fake.current());
          fake.current().receive({ op: 0, t: "MESSAGE_CREATE", s: 2, d: reply({ from: ALLOWED, text: "take option B" }) });
          // The handler runs real file I/O and the real verb, so wait on the result, bounded.
          for (let i = 0; i < 100 && !calls.some((call) => call.method === "PUT"); i += 1) await new Promise((resolve) => setTimeout(resolve, 20));
          assert.equal((await askState()).state, "answered", "the ask file reads answered");
          assert.ok(calls.some((call) => call.method === "PUT" && call.url.endsWith(`/channels/${CHANNEL}/messages/${REPLY_MESSAGE}/reactions/%E2%9C%85/@me`)), `one ✅ reaction through discordRequest: ${JSON.stringify(calls)}`);
          assert.equal(fake.identifies().length, 1, "one IDENTIFY");
        } finally {
          bot.stop();
        }
      });
    },
  },
];
