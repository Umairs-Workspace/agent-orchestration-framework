import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// test/notify/notify-global-channel.test.mjs — story 194, tasks 00 to 02, the posting and CLI half.
// A Discord channel declared in the global `aof.config.json` is layered under a project with no
// `work.notify.channels` key by the one loader (`loadWorkspace`), so the notifier posts there; a
// project with the key, `{}` included, keeps its own (194 Q1/Q5); `aof messaging` sets the global
// channel with `--global`, shows where a project's channels come from, and switches the global one
// off per project (194 Q2).
//
// ISOLATION. Every case runs under a fresh `AOF_GLOBAL_HOME` (`withHome`) and temp projects; the
// token is the 131/09 synthetic fixture and every post goes to a fetch spy.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const invoke = _aofApplication.invoke;
const buildNotifyEnvelope = _aofApplication.messaging.notify.buildNotifyEnvelope;
const notify = _aofApplication.messaging.notify.notify;
const writeMessagingSecret = _aofApplication.messaging.secret.writeMessagingSecret;
const messagingStatusCommand = _aofApplication.getCommand("messaging:status");
const loadWorkspace = _aofWorkspace.work.loadWorkspace;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BIN = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
const TOKEN = "MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.a1B2c3D4e5F6g7H8i9J0k1L2m3N";
const GLOBAL_CHANNEL = "1571198918107078736";
const OWN_CHANNEL = "1580000000000000001";
const ALLOWED = "1119197349521137757";
const GLOBAL = { type: "discord", channelId: GLOBAL_CHANNEL, allow: [ALLOWED] };

const writeJson = async (file, value) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const readJsonFile = async (file) => JSON.parse(await readFile(file, "utf8"));

// A fresh global home on the process (the store's and the loader's home), with `global` as its
// `aof.config.json` (none when null) and a stored token.
async function withHome(global, body) {
  const home = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-notify-global-home-")));
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    if (global != null) await writeJson(path.join(home, "aof.config.json"), global);
    await writeMessagingSecret("discord", TOKEN);
    return await body({ home, globalPath: path.join(home, "aof.config.json") });
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(home, { recursive: true, force: true });
  }
}
// A temp project whose config holds `notify` under `work` (no `notify` key when undefined).
async function withProject(notify, body) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-notify-global-project-")));
  const configPath = path.join(root, ".aof", "aof.config.json");
  await writeJson(configPath, { name: "fixture", resources: [], work: { dir: "./wiki/work", ...(notify === undefined ? {} : { notify }) } });
  try {
    return await body({ root, configPath });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const globalOf = (channels, extra = {}) => ({ ...extra, work: { notify: { channels } } });

function fetchSpy() {
  const calls = [];
  const spy = async (url, init) => {
    calls.push({ url, body: init.body == null ? null : JSON.parse(init.body) });
    return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id: "990000000000000001" }) };
  };
  spy.calls = calls;
  return spy;
}
const postedTo = (spy) => spy.calls.map((call) => /\/channels\/(\d+)\/messages/u.exec(call.url)?.[1]).filter(Boolean);
const STOP = buildNotifyEnvelope("loop-halted", { ref: "194", stop: { reason: "fixture" } }, { config: {}, now: () => new Date("2026-11-14T12:00:00.000Z") });
const notifyLoaded = async (root, spy) => notify(await loadWorkspace(root), STOP, { env: {}, fetch: spy });

function cli(args, { home, cwd }) {
  const run = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env, AOF_GLOBAL_HOME: home, AOF_DISCORD_BOT_TOKEN: "" } });
  return { status: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" };
}

export const notifyGlobalChannelTests = [
  // ── task 00: a project with no channel of its own uses the global one ───────────────────────
  {
    name: "194 task00 — a project with no channels key loads the global channel, and keeps its own link (two rows)",
    async run() {
      for (const [label, notifyBlock, link] of [
        ["no work.notify", undefined, undefined],
        ["a link and no channels", { link: "https://x.test/{ref}" }, "https://x.test/{ref}"],
      ]) {
        await withHome(globalOf({ discord: GLOBAL }), async ({ globalPath }) => {
          await withProject(notifyBlock, async ({ root }) => {
            const workspace = await loadWorkspace(root);
            assert.deepEqual(workspace.config.work.notify.channels, { discord: GLOBAL }, label);
            assert.equal(workspace.config.work.notify.link, link, `${label}: link`);
            assert.deepEqual(workspace.notifyChannelsFrom, { layer: "global", configPath: globalPath }, `${label}: provenance`);
          });
        });
      }
    },
  },
  {
    name: "194 task00 E1 — a loop stop in a project with no channel of its own posts to the global channel, once",
    async run() {
      await withHome(globalOf({ discord: GLOBAL }), async () => {
        await withProject(undefined, async ({ root }) => {
          const spy = fetchSpy();
          const answer = await notifyLoaded(root, spy);
          assert.deepEqual(answer.delivered, ["discord"]);
          assert.deepEqual(postedTo(spy), [GLOBAL_CHANNEL]);
        });
      });
    },
  },
  {
    name: "194 task00 — a global link is not inherited, because a link names one repo",
    async run() {
      await withHome({ work: { notify: { channels: { discord: GLOBAL }, link: "https://global.test/{ref}" } } }, async () => {
        await withProject(undefined, async ({ root }) => {
          const workspace = await loadWorkspace(root);
          assert.equal(Object.hasOwn(workspace.config.work.notify, "link"), false);
        });
      });
    },
  },
  {
    name: "194 task00 — a global config aof cannot use leaves a channel-less project silent and never breaks loading (three rows)",
    async run() {
      for (const [label, write] of [
        ["does not exist", async () => {}],
        ["is not valid JSON", async (home) => writeFile(path.join(home, "aof.config.json"), "{ not json", "utf8")],
        ["has channels set to a string", async (home) => writeJson(path.join(home, "aof.config.json"), { work: { notify: { channels: "discord" } } })],
      ]) {
        await withHome(null, async ({ home }) => {
          await write(home);
          await withProject(undefined, async ({ root }) => {
            const workspace = await loadWorkspace(root);
            assert.equal(workspace.config.work.notify, undefined, label);
            assert.equal(workspace.notifyChannelsFrom, null, label);
          });
        });
      }
    },
  },

  // ── task 01: a project's own channels replace the global ones ────────────────────────────────
  {
    name: "194 task01 E5 — a project with a channel of its own posts there only",
    async run() {
      await withHome(globalOf({ discord: GLOBAL }), async () => {
        await withProject({ channels: { discord: { type: "discord", channelId: OWN_CHANNEL } } }, async ({ root, configPath }) => {
          const spy = fetchSpy();
          await notifyLoaded(root, spy);
          assert.deepEqual(postedTo(spy), [OWN_CHANNEL]);
          assert.deepEqual((await loadWorkspace(root)).notifyChannelsFrom, { layer: "project", configPath });
        });
      });
    },
  },
  {
    name: "194 task01 E7 — disabling discord in a project that only inherits the global channel records \"none here\", and the global config is untouched",
    async run() {
      await withHome(globalOf({ discord: GLOBAL }), async ({ globalPath }) => {
        await withProject(undefined, async ({ root, configPath }) => {
          const before = await readFile(globalPath, "utf8");
          const result = await invoke("messaging:disable", { type: "discord", targetDir: root }, {});
          assert.equal(result.changed, true);
          assert.deepEqual((await readJsonFile(configPath)).work.notify, { channels: {} });
          assert.equal(await readFile(globalPath, "utf8"), before);
          const spy = fetchSpy();
          assert.deepEqual((await notifyLoaded(root, spy)).delivered, []);
          assert.equal(spy.calls.length, 0, "nothing is posted");
        });
      });
    },
  },
  {
    name: "194 task01 — disabling a project's own channel while a global one exists leaves \"none here\", not the global channel",
    async run() {
      await withHome(globalOf({ discord: GLOBAL }), async () => {
        await withProject({ channels: { discord: { type: "discord", channelId: OWN_CHANNEL } } }, async ({ root, configPath }) => {
          await invoke("messaging:disable", { type: "discord", targetDir: root }, {});
          assert.deepEqual((await readJsonFile(configPath)).work.notify, { channels: {} });
          assert.deepEqual((await loadWorkspace(root)).config.work.notify.channels, {});
        });
      });
    },
  },
  {
    name: "194 task01 — with no global channel, disable removes the block exactly as it does today",
    async run() {
      await withHome(null, async () => {
        await withProject({ channels: { discord: { type: "discord", channelId: OWN_CHANNEL } } }, async ({ root, configPath }) => {
          await invoke("messaging:disable", { type: "discord", targetDir: root }, {});
          assert.equal(Object.hasOwn((await readJsonFile(configPath)).work, "notify"), false);
        });
      });
    },
  },
  {
    name: "194 task01 — enabling discord again in an opted-out project gives it a channel of its own",
    async run() {
      await withHome(globalOf({ discord: GLOBAL }), async ({ globalPath }) => {
        await withProject({ channels: {} }, async ({ root, configPath }) => {
          const before = await readFile(globalPath, "utf8");
          await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: OWN_CHANNEL }, {});
          assert.deepEqual((await readJsonFile(configPath)).work.notify.channels, { discord: { type: "discord", channelId: OWN_CHANNEL } });
          assert.equal(await readFile(globalPath, "utf8"), before);
        });
      });
    },
  },

  // ── task 02: the global channel from `aof messaging` ─────────────────────────────────────────
  {
    name: "194 task02 E8 — enable --global outside any project writes the global config and no project",
    async run() {
      await withHome(null, async ({ home, globalPath }) => {
        const cwd = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-notify-global-bare-")));
        try {
          const run = cli(["messaging", "enable", "discord", "--channel", GLOBAL_CHANNEL, "--allow", ALLOWED, "--global"], { home, cwd });
          assert.equal(run.status, 0, run.stderr);
          assert.deepEqual((await readJsonFile(globalPath)).work.notify.channels.discord, GLOBAL);
          assert.equal(existsSync(path.join(cwd, ".aof", "aof.config.json")), false);
        } finally {
          await rm(cwd, { recursive: true, force: true });
        }
      });
    },
  },
  {
    name: "194 task02 — enable --global keeps every other key of the global config and writes no secret-shaped key",
    async run() {
      await withHome({ mesh: { fabric: "direct", relay: { controlNode: "node-6eb3" } } }, async ({ globalPath }) => {
        await invoke("messaging:enable", { type: "discord", targetDir: os.tmpdir(), channelId: GLOBAL_CHANNEL, global: true }, {});
        const written = await readJsonFile(globalPath);
        assert.deepEqual(written.mesh, { fabric: "direct", relay: { controlNode: "node-6eb3" } });
        assert.doesNotMatch(JSON.stringify(written), /"(url|webhook|token)"/u);
      });
    },
  },
  {
    name: "194 task02 — enable --global inside a project still writes only the global config",
    async run() {
      await withHome(null, async ({ globalPath }) => {
        await withProject(undefined, async ({ root, configPath }) => {
          const before = await readFile(configPath, "utf8");
          await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: GLOBAL_CHANNEL, global: true }, {});
          assert.equal(await readFile(configPath, "utf8"), before);
          assert.equal((await readJsonFile(globalPath)).work.notify.channels.discord.channelId, GLOBAL_CHANNEL);
        });
      });
    },
  },
  {
    name: "194 task02 — enable --global refuses a global config it cannot read, and leaves it as it was",
    async run() {
      await withHome(null, async ({ globalPath }) => {
        await writeFile(globalPath, "{ not json", "utf8");
        await assert.rejects(invoke("messaging:enable", { type: "discord", targetDir: os.tmpdir(), channelId: GLOBAL_CHANNEL, global: true }, {}), (error) => error.code === "messaging-global-config-unreadable");
        assert.equal(await readFile(globalPath, "utf8"), "{ not json");
      });
    },
  },
  {
    name: "194 task02 — status still reports, exit 0, over a global config it cannot read, and disable in a project still works",
    async run() {
      await withHome(null, async ({ home, globalPath }) => {
        await writeFile(globalPath, "{ not json", "utf8");
        await withProject({ channels: { discord: { type: "discord", channelId: OWN_CHANNEL } } }, async ({ root, configPath }) => {
          const run = cli(["messaging", "status"], { home, cwd: root });
          assert.equal(run.status, 0, run.stderr);
          assert.match(run.stdout, /global: unreadable — .*messaging-global-config-unreadable|global: unreadable — The global config/u);
          assert.match(run.stdout, new RegExp(`this project: enabled \\(discord → ${OWN_CHANNEL}\\)`, "u"));
          await invoke("messaging:disable", { type: "discord", targetDir: root }, {});
          assert.equal(Object.hasOwn((await readJsonFile(configPath)).work, "notify"), false, "an unreadable global file reads as no global channels, as the loader reads it");
          assert.equal(await readFile(globalPath, "utf8"), "{ not json");
        });
      });
    },
  },
  {
    name: "194 task02 E9 — status says where each project's discord channel comes from (four rows)",
    async run() {
      const rows = [
        ["A inherits", undefined, `enabled (discord → ${GLOBAL_CHANNEL}, 1 may answer by reply, from the global config)`, "global"],
        ["B has its own", { channels: { discord: { type: "discord", channelId: OWN_CHANNEL } } }, `enabled (discord → ${OWN_CHANNEL})`, "project"],
        ["C opted out", { channels: {} }, "disabled here (the global channel is switched off)", "project"],
        ["no project", null, "no project here", null],
      ];
      for (const [label, notifyBlock, projectLine, from] of rows) {
        await withHome(globalOf({ discord: GLOBAL }), async () => {
          const check = async (targetDir) => {
            const result = await invoke("messaging:status", { targetDir }, { env: {} });
            const text = messagingStatusCommand.cli.render(result);
            assert.ok(text.includes(`  global: enabled (discord → ${GLOBAL_CHANNEL}, 1 may answer by reply)`), `${label}: ${text}`);
            assert.ok(text.includes(`  this project: ${projectLine}`), `${label}: ${text}`);
            const [entry] = messagingStatusCommand.cli.json(result).channels;
            assert.equal(entry.project?.from ?? null, from, `${label}: from`);
          };
          if (notifyBlock === null) {
            const bare = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-notify-global-bare-")));
            try { await check(bare); } finally { await rm(bare, { recursive: true, force: true }); }
          } else {
            await withProject(notifyBlock, async ({ root }) => check(root));
          }
        });
      }
    },
  },
  {
    name: "194 task02 E10 — test in a project that inherits the global channel posts one message to it",
    async run() {
      await withHome(globalOf({ discord: GLOBAL }), async () => {
        await withProject(undefined, async ({ root }) => {
          const spy = fetchSpy();
          const result = await invoke("messaging:test", { type: "discord", targetDir: root }, { env: {}, fetch: spy });
          assert.deepEqual(postedTo(spy), [GLOBAL_CHANNEL]);
          assert.ok(result.results.every((entry) => entry.ok), JSON.stringify(result));
        });
      });
    },
  },
  {
    name: "194 task02 E11 — disable --global removes the global channels, keeps the rest of the file, and touches no project",
    async run() {
      await withHome(globalOf({ discord: GLOBAL }, { mesh: { fabric: "direct" } }), async ({ globalPath }) => {
        await withProject({ channels: { discord: { type: "discord", channelId: OWN_CHANNEL } } }, async ({ root, configPath }) => {
          const before = await readFile(configPath, "utf8");
          const result = await invoke("messaging:disable", { type: "discord", targetDir: root, global: true }, {});
          assert.equal(result.changed, true);
          assert.deepEqual(await readJsonFile(globalPath), { mesh: { fabric: "direct" } });
          assert.equal(await readFile(configPath, "utf8"), before);
        });
      });
    },
  },
  {
    name: "194 task02 — disable --global with no global channel changes nothing, says so, and creates no file",
    async run() {
      await withHome(null, async ({ globalPath }) => {
        const result = await invoke("messaging:disable", { type: "discord", targetDir: os.tmpdir(), global: true }, {});
        assert.equal(result.changed, false);
        assert.match(result.notes.join("\n"), /not enabled globally — nothing changed/u);
        assert.equal(existsSync(globalPath), false);
      });
    },
  },
];
