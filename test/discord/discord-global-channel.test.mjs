import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// test/discord/discord-global-channel.test.mjs — story 194, tasks 00 and 01, the answering half: a
// channel declared in the global `aof.config.json` reaches the bot through the one loader
// (`loadWorkspace`), so a reply, a slash command and the registrar treat it as the project's own —
// and a project's own channels replace it whole, `allow` included (194 Q1). The reply cases run the
// REAL `work:answer` over 10's reply world with the project's config rewritten; the command cases run
// `handleInteraction` and the registrar over real temp projects loaded under an isolated home.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const handleReply = _aofApplication.messaging.discord.replies.handleReply;
const handleInteraction = _aofApplication.messaging.discord.commands.handleInteraction;
const createRegistrar = _aofApplication.messaging.discord.commands.createRegistrar;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
import { ALLOWED, CHANNEL, NODE, STRANGER, degradeSink, releaseDegradeSink, reply, withReplyWorld } from "./discord-fixture.mjs";

const APP = "800000000000000000";
const GUILD = "900000000000000000";
const writeJson = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const globalChannels = (allow) => ({ work: { notify: { channels: { discord: { type: "discord", channelId: CHANNEL, allow } } } } });

// 10's reply world, with the global config holding the channel and the project's own config holding
// `notify` (none when undefined) — the ask, its index record and the channel id are unchanged.
async function withGlobalReplyWorld(notify, body, { globalAllow = [ALLOWED] } = {}) {
  degradeSink();
  try {
    await withReplyWorld(async (world) => {
      await writeJson(path.join(world.home, "aof.config.json"), globalChannels(globalAllow));
      const work = { dir: "./wiki/work", ...(notify === undefined ? {} : { notify }) };
      await writeJson(path.join(world.root, ".aof", "aof.config.json"), { name: "fixture", work, mesh: { nodeId: NODE } });
      await body(world);
    });
  } finally {
    releaseDegradeSink();
  }
}
const lastLine = (discord) => discord.filter((call) => call.method === "POST").at(-1)?.body?.content ?? "";

// Two temp projects with `configs`, loaded under a fresh home whose global config is `global`.
async function withProjects(global, configs, body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-discord-global-")));
  const home = path.join(tmp, "home");
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    if (global != null) await writeJson(path.join(home, "aof.config.json"), global);
    const workspaces = [];
    for (const [name, config] of Object.entries(configs)) {
      const root = path.join(tmp, name);
      await writeJson(path.join(root, ".aof", "aof.config.json"), { name, ...config });
      workspaces.push(await loadWorkspace(root));
    }
    return await body({ home, workspaces });
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(tmp, { recursive: true, force: true });
  }
}
function commandContext(workspaces) {
  const sequence = [];
  return {
    sequence,
    request: async (method, route, body) => {
      sequence.push({ kind: "request", method, route, body });
      return { ok: true, status: 200, json: null, reason: null, retryAfter: null };
    },
    invoke: async (id, input, ctx) => {
      sequence.push({ kind: "invoke", id, workspace: path.basename(ctx.workspace.projectRoot) });
      return [];
    },
    servedWorkspaces: async () => workspaces,
    now: () => new Date("2026-11-14T12:00:00.000Z"),
  };
}
const slash = ({ name = "status", user = ALLOWED, channel = CHANNEL } = {}) => ({
  id: "700000000000000001",
  token: "interaction-token",
  application_id: APP,
  type: 2,
  channel_id: channel,
  guild_id: GUILD,
  member: { user: { id: user, username: "umami" } },
  data: { name, options: [] },
});
const edited = (sequence) => sequence.filter((entry) => entry.kind === "request" && entry.method === "PATCH").at(-1)?.body?.content ?? "";

export const discordGlobalChannelTests = [
  {
    name: "194 task00 E3 — an allowed user's reply in the global channel answers the asking project, which declares no channel",
    async run() {
      await withGlobalReplyWorld(undefined, async ({ context, askState }) => {
        const outcome = await handleReply(reply({ from: ALLOWED, username: "umami", text: "take option B" }), context);
        assert.deepEqual(outcome, { action: "answered" });
        const record = await askState();
        assert.equal(record.state, "answered");
        assert.equal(record.by.actor, "@umami");
      });
    },
  },
  {
    name: "194 task00 E4 — a reply from a user not on the global allow list is refused, naming the key and the global config file",
    async run() {
      await withGlobalReplyWorld(undefined, async ({ context, discord, askState, home }) => {
        const outcome = await handleReply(reply({ from: STRANGER, text: "do it" }), context);
        assert.deepEqual(outcome, { action: "refused", code: "discord-answer-not-allowed" });
        assert.equal((await askState()).state, "waiting");
        const line = lastLine(discord);
        assert.ok(line.includes("`work.notify.channels.discord.allow`"), line);
        assert.ok(line.includes(path.join(home, "aof.config.json")), `the refusal names the global file: ${line}`);
      });
    },
  },
  {
    name: "194 task01 E6 — a project's own allow list on the same channel replaces the global one",
    async run() {
      const own = { channels: { discord: { type: "discord", channelId: CHANNEL, allow: [STRANGER] } } };
      await withGlobalReplyWorld(own, async ({ context, discord, askState, home }) => {
        const refused = await handleReply(reply({ from: ALLOWED, text: "mine" }), context);
        assert.deepEqual(refused, { action: "refused", code: "discord-answer-not-allowed" }, "the global allow list does not reach a project with channels of its own");
        const line = lastLine(discord);
        assert.ok(line.includes("`work.notify.channels.discord.allow`") && !line.includes(home), `the project's own key, with no global path: ${line}`);
        const answered = await handleReply(reply({ from: STRANGER, text: "theirs" }), context);
        assert.deepEqual(answered, { action: "answered" });
        assert.equal((await askState()).state, "answered");
      });
    },
  },
  {
    name: "194 task00 E2 — /status in the global channel reaches every served project that declares none, and the registrar looks the channel up once",
    async run() {
      degradeSink();
      try {
        await withProjects(globalChannels([ALLOWED]), { alpha: { work: { dir: "./wiki/work" } }, beta: { work: { dir: "./wiki/work" } } }, async ({ workspaces }) => {
          const ctx = commandContext(workspaces);
          await handleInteraction(slash({ name: "status" }), ctx);
          const reached = ctx.sequence.filter((entry) => entry.kind === "invoke").map((entry) => entry.workspace).sort();
          assert.deepEqual(reached, ["alpha", "beta"], `both channel-less projects answer: ${edited(ctx.sequence)}`);

          const lookups = [];
          const request = async (method, route) => {
            lookups.push(`${method} ${route}`);
            return { ok: true, status: 200, json: method === "GET" ? { id: CHANNEL, guild_id: GUILD } : [], reason: null, retryAfter: null };
          };
          await createRegistrar({ request, servedWorkspaces: async () => workspaces }).register(APP);
          assert.deepEqual(lookups.filter((call) => call.startsWith("GET")), [`GET /channels/${CHANNEL}`], "the one global channel is looked up once");
        });
      } finally {
        releaseDegradeSink();
      }
    },
  },
  {
    name: "194 task02 — a channel no project and no global config names says how to enable one, both ways",
    async run() {
      degradeSink();
      try {
        await withProjects(globalChannels([ALLOWED]), { alpha: { work: { dir: "./wiki/work" } } }, async ({ workspaces }) => {
          const ctx = commandContext(workspaces);
          await handleInteraction(slash({ name: "status", channel: "1599999999999999999" }), ctx);
          const line = edited(ctx.sequence);
          assert.ok(line.includes("aof messaging enable discord --channel <id>") && line.includes("--global"), line);
        });
      } finally {
        releaseDegradeSink();
      }
    },
  },
  {
    name: "194 task00 — the global config file is read, never written, by loading a project",
    async run() {
      await withProjects(globalChannels([ALLOWED]), { alpha: { work: { dir: "./wiki/work" } } }, async ({ home, workspaces }) => {
        const before = await readFile(path.join(home, "aof.config.json"), "utf8");
        await loadWorkspace(workspaces[0].projectRoot);
        assert.equal(await readFile(path.join(home, "aof.config.json"), "utf8"), before);
      });
    },
  },
];
