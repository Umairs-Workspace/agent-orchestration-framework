import { defaultFoundation as _aofFoundation } from "aof/foundation-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
// test/notify/notify-messaging.test.mjs — milestone 131 / story 08, tasks 00 to 05 (ADR-005 §1, as
// amended at 131/08), and story 09, tasks 00 to 03 (ADR-007). `aof messaging`: the family's
// registration and budget (08/00), the machine-wide owner-only store (08/01), `init`'s
// prompt-or-stdin door that never reads argv (08/02; 09/00: it takes a bot token and prints the
// invite URL), the per-project `enable`/`disable` switch that writes only `work.notify` (08/03;
// 09/01: `enable --channel <id>`), `status`, which says whether and never what (08/04; 09/03), and
// the notifier reading the store at the point of send (08/05; 09/02: the bot posts to the channel
// by id and answers the posted message's id). FF-13106's and FF-13110's legs live in
// `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs`.
//
// ISOLATION. Every case runs under a fresh `AOF_GLOBAL_HOME` of its own (`withHome`), and every
// project is a temp directory — no case touches the real `~/.aof` or this repository's config. A
// token is a synthetic fixture (09 QA ruling 1), never a real one, and "never echoes" is asserted
// over stdout, stderr and every file the run left under the global home (where the degrade sink
// writes), for the whole token and for its third segment.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
const setDegradeSinkForTest = _aofFoundation.degrade.setDegradeSinkForTest;
const invoke = _aofApplication.invoke;
const listCommands = _aofApplication.listCommands;
import * as discordModule from "@aof/messaging/discord";
const CHANNELS = _aofApplication.messaging.notify.CHANNELS;
const buildNotifyEnvelope = _aofApplication.messaging.notify.buildNotifyEnvelope;
const notify = _aofApplication.messaging.notify.notify;
const sendTestMessage = _aofApplication.messaging.notify.sendTestMessage;
const messagingSecretPath = _aofApplication.messaging.secret.messagingSecretPath;
const messagingSecretPresent = _aofApplication.messaging.secret.messagingSecretPresent;
const readMessagingSecret = _aofApplication.messaging.secret.readMessagingSecret;
const writeMessagingSecret = _aofApplication.messaging.secret.writeMessagingSecret;
const messagingInitCommand = _aofApplication.getCommand("messaging:init");
const messagingStatusCommand = _aofApplication.getCommand("messaging:status");
import {
  SOURCE_DIRECTORY_BUDGETS,
  SOURCE_DIRECTORY_EXEMPTIONS,
  readTreeListing,
  sourceDirectoryBudgetViolations,
} from "../arch/testing/acd-source-directory-budget.test.mjs";
import { stripComments } from "../support/source-slice.mjs";

const { isDiscordBotToken } = discordModule;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BIN = path.join(repoRoot, "packages", "core", "bin", "aof.mjs");
// The fixture token (09 QA ruling 1): base64url("123456789012345678"), `.AbCdEf.`, 27 base64url
// characters. Its third segment is what a leak check greps for.
const SEG_A = "a1B2c3D4e5F6g7H8i9J0k1L2m3N";
const TOKEN_A = `MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.${SEG_A}`;
const SEG_B = "z9Y8x7W6v5U4t3S2r1Q0p9O8n7M";
const TOKEN_B = `OTg3NjU0MzIxMDk4NzY1NDMy.AbCdEf.${SEG_B}`;
const CHANNEL = "123456789012345678";
const INVITE = `https://discord.com/oauth2/authorize?client_id=${CHANNEL}&scope=bot+applications.commands&permissions=2147552320`;
// A webhook URL, built from parts so this file never spells the path literal FF-13106 bans in src/**.
const WEBHOOK_URL = ["https://discord.com/api", "webhooks", "123", "tok_EN-1"].join("/");
// 131/13 adds `test`, the fifth verb, after `status` in the registry.
const VERBS = ["init", "enable", "disable", "status", "test"];

// A fresh global home for the body, set on the process (the store's home is the PROCESS's) and
// restored after; the directory is removed.
async function withHome(body) {
  const home = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-messaging-home-")));
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    return await body(home);
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(home, { recursive: true, force: true });
  }
}

// A temp project whose `.aof/aof.config.json` holds `config` (or none at all when `config` is null).
async function withProject(config, body) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-messaging-project-")));
  const configPath = path.join(root, ".aof", "aof.config.json");
  if (config != null) {
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }
  try {
    return await body({ root, configPath });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const baseConfig = (notifyBlock) => ({
  name: "fixture",
  resources: [],
  work: { dir: "./wiki/work", ...(notifyBlock === undefined ? {} : { notify: notifyBlock }) },
});
const withoutNotify = (config) => {
  const copy = structuredClone(config);
  if (copy.work) delete copy.work.notify;
  return copy;
};

// The real CLI, spawned under `home`, with `input` on stdin (a pipe, never a TTY).
function cli(args, { home, cwd = repoRoot, input = "", env = {} } = {}) {
  const run = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    input,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, AOF_GLOBAL_HOME: home, ...env },
  });
  return { status: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" };
}
const jsonOf = (run) => JSON.parse(run.stdout);

// Every file under the home but the store itself — where a degrade or a log would land.
async function filesUnder(dir, skip) {
  const out = [];
  const walk = async (at) => {
    let entries = [];
    try { entries = await readdir(at, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (full !== skip) out.push({ path: full, text: await readFile(full, "utf8").catch(() => "") });
    }
  };
  await walk(dir);
  return out;
}
async function assertNothingLeaked(texts, home, secrets = [TOKEN_A, SEG_A]) {
  const left = home == null ? [] : (await filesUnder(home, messagingSecretPath("discord", { AOF_GLOBAL_HOME: home }))).map((file) => file.text);
  for (const text of [...texts, ...left]) {
    for (const secret of secrets) assert.ok(!String(text).includes(secret), `nothing printed or logged contains ${secret}: ${String(text).slice(0, 300)}`);
  }
}

function degradeSink() {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  return events;
}
const notifyEventsOf = (events) => events.filter((event) => String(event.code).startsWith("notify-"));
const seams = ({ stdin = "", isTTY = false, answer = TOKEN_A } = {}) => {
  const prompts = [];
  return {
    prompts,
    stdin: Readable.from([stdin]),
    isTTY,
    promptSecret: async (config) => { prompts.push(config); return answer; },
  };
};

async function compileSchema() {
  const Ajv2020 = (await import("ajv/dist/2020.js")).default;
  const schema = JSON.parse(await readFile(path.join(repoRoot, "schemas", "aof.schema.json"), "utf8"));
  return new Ajv2020({ allErrors: true, strict: false }).compile(schema);
}

// ── the notifier's fixtures (08/05, 09/01-02) ──────────────────────────────────────────────────
const NOW = () => new Date("2026-09-25T12:00:00.000Z");
const ENVELOPE = buildNotifyEnvelope("session-needs-input", { ref: "131/08", phase: "build", elapsedMs: 1000, question: "Ship it?" }, { config: {}, now: NOW });
const discordOn = (channel = { type: "discord", channelId: CHANNEL }) => Object.freeze({ config: { work: { notify: { channels: { discord: channel } } } } });
const DISCORD_ON = discordOn();
// A spy standing in for `fetch`: it records each call's URL, method, authorization and body, and
// answers `status` with `json` as a JSON body.
function fetchSpy({ status = 200, json = { id: "1" }, behaviour = null } = {}) {
  const calls = [];
  const spy = async (url, init) => {
    calls.push({ url, method: init.method, authorization: init.headers.authorization, body: init.body == null ? null : JSON.parse(init.body) });
    if (behaviour != null) return behaviour(url, init);
    return { status, headers: { get: (name) => (name.toLowerCase() === "content-type" ? "application/json" : null) }, json: async () => json };
  };
  spy.calls = calls;
  return spy;
}
const auths = (spy) => spy.calls.map((call) => call.authorization);

export const notifyMessagingTests = [
  // ── 08 task 00: the family is founded and registered ──────────────────────────────────────────
  {
    name: "131/08 task00 — the messaging commands are routed, each at [\"messaging\", <verb>] (four at 08, five since 131/13)",
    run() {
      const byId = new Map(listCommands().map((command) => [command.id, command]));
      for (const verb of VERBS) {
        const command = byId.get(`messaging:${verb}`);
        assert.ok(command, `messaging:${verb} is registered`);
        assert.deepEqual(command.cli?.route, ["messaging", verb], `messaging:${verb}'s route`);
      }
      assert.equal(listCommands().filter((command) => command.id.startsWith("messaging:")).length, VERBS.length, `exactly ${VERBS.length}`);
    },
  },
  {
    name: "131/08 task00 — aof --help carries a Messaging: section listing one usage line per verb, and no URL",
    async run() {
      await withHome(async (home) => {
        const run = cli(["--help"], { home });
        assert.equal(run.status, 0, run.stderr);
        const at = run.stdout.indexOf("\nMessaging:\n");
        assert.ok(at >= 0, `a Messaging: section: ${run.stdout.slice(0, 400)}`);
        const section = run.stdout.slice(at + 1).split("\n\n")[0].split("\n").slice(1);
        assert.deepEqual(section.map((line) => line.trim().split(" ").slice(0, 3).join(" ")), VERBS.map((verb) => `aof messaging ${verb}`));
        assert.ok(!/https?:\/\//u.test(section.join("\n")), "the section holds no URL");
      });
    },
  },
  {
    name: "131/08 task00 — the new directories are budgeted: src/commands/messaging an exemption naming 131/08, the src/commands row still 69, and the live tree green",
    async run() {
      const exemption = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "packages/core/src/commands/messaging");
      assert.ok(exemption, "packages/core/src/commands/messaging is an exemption");
      assert.ok(exemption.why.includes("131/08") && exemption.why.includes("messaging.mjs"), "its why names 131/08 and its member");
      const row = SOURCE_DIRECTORY_BUDGETS.find((entry) => entry.directory === "packages/core/src/commands");
      assert.equal(row.ceiling, 69, "the src/commands row is still 69");
      assert.equal(row.allowance, 0);
      for (const [dir, member] of [["packages/core/src/notify", "secret.mjs"], ["test/notify", "notify-messaging"]]) {
        assert.ok(SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === dir).why.includes(member), `${dir}'s why names ${member}`);
      }
      const named = sourceDirectoryBudgetViolations(await readTreeListing())
        .filter((v) => /src\/commands|(?:src|test)\/notify/u.test(v.message ?? JSON.stringify(v)));
      assert.deepEqual(named, [], "the budget's own run over the live tree names none of them");
    },
  },
  {
    name: "131/08 task00 — the suite is registered through the notify index",
    async run() {
      const index = stripComments(await readFile(path.join(repoRoot, "test", "notify", "index.mjs"), "utf8"));
      assert.match(index, /import\s*\{\s*notifyMessagingTests\s*\}\s*from\s*"\.\/notify-messaging\.test\.mjs"/u);
      assert.match(index, /\.\.\.notifyMessagingTests\b/u);
    },
  },
  {
    name: "131/08 task00 — an unknown or missing channel type is refused by code, naming discord (four rows)",
    async run() {
      await withHome(async (home) => {
        for (const [args, code] of [
          [["messaging", "init", "slack"], "messaging-unknown-channel"],
          [["messaging", "enable", "slack"], "messaging-unknown-channel"],
          [["messaging", "disable"], "messaging-channel-required"],
          [["messaging", "init"], "messaging-channel-required"],
        ]) {
          const run = cli([...args, "--json"], { home });
          assert.notEqual(run.status, 0, `${args.join(" ")} exits non-zero`);
          const envelope = jsonOf(run);
          assert.equal(envelope.code, code, `${args.join(" ")}: ${envelope.error}`);
          assert.ok(envelope.error.includes("discord"), `the message names discord: ${envelope.error}`);
        }
      });
    },
  },

  // ── 08 task 01: the machine-wide, owner-only store ────────────────────────────────────────────
  {
    name: "131/08 task01 — a written secret is read back from <AOF_GLOBAL_HOME>/messaging/discord.secret",
    async run() {
      await withHome(async (home) => {
        const written = await writeMessagingSecret("discord", TOKEN_A);
        const expected = path.join(home, "messaging", "discord.secret");
        assert.equal(written.path, expected);
        assert.equal(messagingSecretPath("discord"), expected, "the path is the process's global home");
        assert.equal(await readFile(expected, "utf8"), `${TOKEN_A}\n`, "the token and one trailing newline, nothing else");
        assert.equal(await readMessagingSecret("discord"), TOKEN_A);
        assert.equal(await messagingSecretPresent("discord"), true);
        const leftovers = (await readdir(path.dirname(expected))).filter((name) => name !== "discord.secret");
        assert.deepEqual(leftovers, [], "the atomic write leaves no temporary file");
      });
    },
  },
  {
    name: "131/08 task01 — on POSIX the file is 0600 and its directory 0700, re-applied over an existing 0644 file (win32: no mode asserted, by ruling)",
    async run() {
      await withHome(async () => {
        const file = messagingSecretPath("discord");
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, "old\n", "utf8");
        if (process.platform === "win32") {
          // Ruling 3: the file inherits the user profile's owner-only ACL; the write still replaces.
          await writeMessagingSecret("discord", TOKEN_A);
          assert.equal(await readMessagingSecret("discord"), TOKEN_A);
          return;
        }
        await chmod(file, 0o644);
        await chmod(path.dirname(file), 0o755);
        await writeMessagingSecret("discord", TOKEN_A);
        assert.equal((await stat(file)).mode & 0o777, 0o600, "the file is 0600");
        assert.equal((await stat(path.dirname(file))).mode & 0o777, 0o700, "the directory is 0700");
      });
    },
  },
  {
    name: "131/08 task01 — nothing stored reads null and not present; an unreadable store reads null too",
    async run() {
      await withHome(async () => {
        assert.equal(await readMessagingSecret("discord"), null);
        assert.equal(await messagingSecretPresent("discord"), false);
        // A directory where the file should be is unreadable as a file: null, never a throw.
        await mkdir(messagingSecretPath("discord"), { recursive: true });
        assert.equal(await readMessagingSecret("discord"), null);
      });
    },
  },

  // ── 09 task 00: the bot token enters by init, and init prints the invite ──────────────────────
  {
    name: "131/09 task00 — the bot token's shape (nine rows), and it is the discord channel's accepts",
    run() {
      for (const [value, accepted] of [
        [TOKEN_A, true],
        [TOKEN_B, true],
        [`${Buffer.from("12345678901234567").toString("base64url")}.x.y`, true],
        [WEBHOOK_URL, false],
        ["abc.def", false],
        [`${Buffer.from("hello").toString("base64url")}.AbCdEf.${SEG_A}`, false],
        [`${Buffer.from("1234567890123456").toString("base64url")}.AbCdEf.${SEG_A}`, false],
        [`${TOKEN_A}.extra`, false],
        [` ${TOKEN_A}`, false],
      ]) {
        assert.equal(isDiscordBotToken(value), accepted, value);
      }
      assert.equal(CHANNELS.discord.accepts, isDiscordBotToken);
    },
  },
  {
    name: "131/09 task00 — a token piped on stdin is stored and the invite URL is printed; nothing printed carries its third segment",
    async run() {
      await withHome(async (home) => {
        const run = cli(["messaging", "init", "discord"], { home, input: `${TOKEN_A}\n` });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(await readFile(path.join(home, "messaging", "discord.secret"), "utf8"), `${TOKEN_A}\n`, "exactly the token and a newline");
        assert.deepEqual(run.stdout.trim().split("\n"), [
          `Stored the Discord bot token for this machine at ${messagingSecretPath("discord")}.`,
          `Invite the bot to your server: ${INVITE}`,
          "Switch it on per project with `aof messaging enable discord --channel <id>`.",
        ]);
        const json = cli(["messaging", "init", "discord", "--json"], { home, input: `${TOKEN_A}\n` });
        assert.deepEqual(jsonOf(json), { type: "discord", path: messagingSecretPath("discord"), replaced: true, inviteUrl: INVITE });
        assert.match(jsonOf(json).inviteUrl, /client_id=123456789012345678&.*permissions=2147552320/u);
        await assertNothingLeaked([run.stdout, run.stderr, json.stdout, json.stderr], home);
      });
    },
  },
  {
    name: "131/09 task00 — on a TTY the prompt asks `Discord bot token:` through a password prompt, stores the token, and nothing printed contains it",
    async run() {
      await withHome(async () => {
        const events = degradeSink();
        try {
          const seam = seams({ isTTY: true, answer: TOKEN_A });
          const input = await messagingInitCommand.cli.argv(["discord"], {}, seam);
          assert.deepEqual(seam.prompts, [{ message: "Discord bot token:" }], "the prompt seam was asked once, with the label");
          const result = await invoke("messaging:init", input, {});
          assert.equal(await readMessagingSecret("discord"), TOKEN_A);
          await assertNothingLeaked([messagingInitCommand.cli.render(result), JSON.stringify(messagingInitCommand.cli.json(result)), JSON.stringify(events)]);
          const source = stripComments(await readFile(path.join(repoRoot, "packages", "messaging", "src", "commands.mjs"), "utf8"));
          assert.match(source, /const\s*\{\s*password\s*\}\s*=\s*await\s+import\("@inquirer\/prompts"\)/u, "the default seam is @inquirer/prompts' password");
          assert.doesNotMatch(source, /\bmask\s*:/u, "and it sets no mask, so nothing is echoed");
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
  {
    name: "131/09 task00 — a second init replaces the first and says Replaced",
    async run() {
      await withHome(async (home) => {
        await writeMessagingSecret("discord", TOKEN_B);
        const run = cli(["messaging", "init", "discord"], { home, input: `${TOKEN_A}\n` });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(await readMessagingSecret("discord"), TOKEN_A, "the stored token is the new one");
        assert.match(run.stdout, /^Replaced the Discord bot token/u);
        await assertNothingLeaked([run.stdout, run.stderr], home, [TOKEN_A, SEG_A, TOKEN_B, SEG_B]);
      });
    },
  },
  {
    name: "131/09 task00 — what init refuses stores nothing and echoes nothing (seven rows)",
    async run() {
      const hello = `${Buffer.from("hello").toString("base64url")}.AbCdEf.${SEG_A}`;
      for (const [args, input, code, secrets] of [
        [["discord"], `${WEBHOOK_URL}\n`, "messaging-token-invalid", [WEBHOOK_URL, "tok_EN-1"]],
        [["discord"], "abc.def\n", "messaging-token-invalid", ["abc.def"]],
        [["discord"], `${hello}\n`, "messaging-token-invalid", [hello, SEG_A]],
        [["discord"], "\n", "messaging-url-empty", []],
        [["discord", TOKEN_A], "", "messaging-secret-in-argv", [TOKEN_A, SEG_A]],
        [["discord", WEBHOOK_URL], "", "messaging-secret-in-argv", [WEBHOOK_URL, "tok_EN-1"]],
        [["discord", `--token=${TOKEN_A}`], "", "unknown-flag", [TOKEN_A, SEG_A]],
      ]) {
        await withHome(async (home) => {
          for (const json of [false, true]) {
            const run = cli(["messaging", "init", ...args, ...(json ? ["--json"] : [])], { home, input });
            assert.notEqual(run.status, 0, `${args.join(" ")} exits non-zero`);
            if (json) assert.equal(jsonOf(run).code, code, `${args.join(" ")}: ${run.stdout}`);
            await assertNothingLeaked([run.stdout, run.stderr], home, secrets);
          }
          assert.equal(await stat(messagingSecretPath("discord")).then(() => true, () => false), false, "no discord.secret exists");
        });
      }
      await withHome(async (home) => {
        const run = cli(["messaging", "init", "discord", "--json"], { home, input: `${WEBHOOK_URL}\n` });
        const { error } = jsonOf(run);
        assert.match(error, /bot token/u, `the refusal says the channel now takes a bot token: ${error}`);
        assert.ok(error.includes("wiki/architecture/discord-notifications.md"), `and names the guide: ${error}`);
      });
    },
  },
  {
    name: "131/09 task00 — the webhook helpers are gone: discord.mjs exports the token check, the door, the sender and the renderer",
    run() {
      for (const name of ["isDiscordBotToken", "discordRequest", "sendDiscord", "renderDiscord"]) {
        assert.equal(typeof discordModule[name], "function", `discord.mjs exports ${name}`);
      }
      assert.equal(Object.hasOwn(discordModule, "isDiscordWebhookUrl"), false, "and no isDiscordWebhookUrl");
    },
  },

  // ── 08 task 03 / 09 task 01: enable and disable write only work.notify ────────────────────────
  {
    name: "131/09 task01 — enable --channel writes { type, channelId } and nothing else, and the file validates; disable removes it",
    async run() {
      const validate = await compileSchema();
      await withHome(async () => {
        await withProject(baseConfig(), async ({ root, configPath }) => {
          const before = JSON.parse(await readFile(configPath, "utf8"));
          await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: CHANNEL }, {});
          const enabled = JSON.parse(await readFile(configPath, "utf8"));
          assert.deepEqual(enabled.work.notify, { channels: { discord: { type: "discord", channelId: CHANNEL } } });
          assert.deepEqual(withoutNotify(enabled), withoutNotify(before), "every other key is unchanged");
          assert.ok(validate(enabled), JSON.stringify(validate.errors));
          await invoke("messaging:disable", { type: "discord", targetDir: root }, {});
          const disabled = JSON.parse(await readFile(configPath, "utf8"));
          assert.equal(Object.hasOwn(disabled.work, "notify"), false, "no work.notify key");
          assert.deepEqual(disabled, before, "every other key is unchanged");
          for (const text of [JSON.stringify(enabled), JSON.stringify(disabled)]) assert.doesNotMatch(text, /"(?:url|webhook|token|urlEnv)"/iu, "no url, webhook, token or urlEnv key");
        });
      });
    },
  },
  {
    name: "131/09 task01 — the CLI's --channel flag reaches the write",
    async run() {
      await withHome(async (home) => {
        await withProject(baseConfig(), async ({ root, configPath }) => {
          const run = cli(["messaging", "enable", "discord", "--channel", CHANNEL], { home, cwd: root });
          assert.equal(run.status, 0, run.stderr);
          assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")).work.notify, { channels: { discord: { type: "discord", channelId: CHANNEL } } });
        });
      });
    },
  },
  {
    name: "131/09 task01 — what enable refuses leaves the config unchanged (three rows)",
    async run() {
      await withHome(async (home) => {
        for (const [argv, code] of [
          [["messaging", "enable", "discord"], "messaging-channel-id-required"],
          [["messaging", "enable", "discord", "--channel", "12ab"], "messaging-channel-id-invalid"],
          [["messaging", "enable", "discord", "--channel", "123"], "messaging-channel-id-invalid"],
        ]) {
          await withProject(baseConfig(), async ({ root, configPath }) => {
            const bytes = await readFile(configPath);
            const run = cli([...argv, "--json"], { home, cwd: root });
            assert.notEqual(run.status, 0, argv.join(" "));
            assert.equal(jsonOf(run).code, code, `${argv.join(" ")}: ${run.stdout}`);
            assert.ok((await readFile(configPath)).equals(bytes), "the config is unchanged");
          });
        }
      });
    },
  },
  {
    name: "131/09 task01 — the same id changes nothing, a different id adds discord-2, and a channel 08 left without an id is completed in place (three rows)",
    async run() {
      await withHome(async () => {
        const other = "876543210987654321";
        for (const [before, id, after, changed] of [
          [{ channels: { discord: { type: "discord", channelId: CHANNEL, events: ["loop-halted"] } } }, CHANNEL, null, false],
          [{ channels: { discord: { type: "discord", channelId: CHANNEL } } }, other, { channels: { discord: { type: "discord", channelId: CHANNEL }, "discord-2": { type: "discord", channelId: other } } }, true],
          [{ channels: { discord: { type: "discord", urlEnv: "OLD_HOOK", events: ["loop-halted"] } } }, CHANNEL, { channels: { discord: { type: "discord", events: ["loop-halted"], channelId: CHANNEL } } }, true],
        ]) {
          await withProject(baseConfig(before), async ({ root, configPath }) => {
            const bytes = await readFile(configPath);
            const result = await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: id }, {});
            assert.equal(result.changed, changed, JSON.stringify(before));
            if (!changed) {
              assert.ok((await readFile(configPath)).equals(bytes), "byte-unchanged");
              assert.match(result.notes.join("\n"), /already enabled/u);
            } else {
              assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")).work.notify, after, JSON.stringify(before));
            }
          });
        }
      });
    },
  },
  {
    name: "131/08 task03 — disable over what is there (three rows)",
    async run() {
      await withHome(async () => {
        for (const [before, after, unchanged] of [
          [{ channels: { discord: { type: "discord", channelId: CHANNEL } }, link: "https://x.test/{ref}" }, { channels: {}, link: "https://x.test/{ref}" }, false],
          [{ channels: { a: { type: "discord", channelId: CHANNEL }, b: { type: "discord", channelId: CHANNEL, tokenEnv: "B" } } }, undefined, false],
          [{ channels: {} }, { channels: {} }, true],
        ]) {
          await withProject(baseConfig(before), async ({ root, configPath }) => {
            const bytes = await readFile(configPath);
            const result = await invoke("messaging:disable", { type: "discord", targetDir: root }, {});
            const config = JSON.parse(await readFile(configPath, "utf8"));
            assert.deepEqual(config.work.notify, after, JSON.stringify(before));
            if (unchanged) {
              assert.ok((await readFile(configPath)).equals(bytes), "byte-unchanged");
              assert.match(result.notes.join("\n"), /not enabled/u);
            }
          });
        }
      });
    },
  },
  {
    name: "131/08 task03 — enable reports whether this machine can send (two rows)",
    async run() {
      for (const stored of [false, true]) {
        await withHome(async () => {
          if (stored) await writeMessagingSecret("discord", TOKEN_A);
          await withProject(baseConfig(), async ({ root }) => {
            const result = await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: CHANNEL }, {});
            const text = result.notes.join("\n");
            assert.equal(text.includes("No Discord bot token is stored on this machine yet"), !stored, text);
            if (!stored) assert.ok(text.includes("No Discord bot token is stored on this machine yet — run `aof messaging init discord`."));
          });
        });
      }
    },
  },
  {
    name: "131/08 task03 — no project, no write: enable is refused messaging-no-project and creates no file",
    async run() {
      await withHome(async (home) => {
        await withProject(null, async ({ root }) => {
          const run = cli(["messaging", "enable", "discord", "--channel", CHANNEL, "--json"], { home, cwd: root });
          assert.notEqual(run.status, 0);
          assert.equal(jsonOf(run).code, "messaging-no-project");
          assert.deepEqual(await readdir(root), [], "no file is created");
        });
      });
    },
  },

  // ── 08 task 04 / 09 task 03: status says whether, never what ──────────────────────────────────
  {
    name: "131/09 task03 — status reports the bot and each channel id, and never the token, in text or JSON",
    async run() {
      await withHome(async () => {
        await writeMessagingSecret("discord", TOKEN_A);
        await withProject(baseConfig({ channels: { discord: { type: "discord", channelId: CHANNEL } } }), async ({ root }) => {
          const result = await invoke("messaging:status", { targetDir: root }, { env: {} });
          const [entry] = result.channels;
          assert.equal(entry.type, "discord");
          assert.equal(entry.stored, true);
          assert.deepEqual(entry.envOverride, { name: "AOF_DISCORD_BOT_TOKEN", set: false });
          assert.deepEqual(entry.project, { enabled: true, channels: ["discord"], channelIds: [CHANNEL], allowCounts: [0] });
          const text = messagingStatusCommand.cli.render(result);
          assert.equal(text, [
            "discord",
            `  this machine: set (${messagingSecretPath("discord")})`,
            "  env override AOF_DISCORD_BOT_TOKEN: not set",
            `  this project: enabled (discord → ${CHANNEL})`,
          ].join("\n"));
          await assertNothingLeaked([text, JSON.stringify(messagingStatusCommand.cli.json(result))], null);
        });
      });
    },
  },
  {
    name: "131/08 task04 — the three facts (four rows), and status is a report that exits 0",
    async run() {
      const ON = { channels: { discord: { type: "discord", channelId: CHANNEL } } };
      for (const [stored, env, notifyBlock, expected] of [
        [false, {}, null, { stored: false, set: false, project: null }],
        [true, {}, ON, { stored: true, set: false, project: { enabled: true, channels: ["discord"], channelIds: [CHANNEL], allowCounts: [0] } }],
        [false, { AOF_DISCORD_BOT_TOKEN: TOKEN_B }, undefined, { stored: false, set: true, project: { enabled: false, channels: [], channelIds: [], allowCounts: [] } }],
        [true, { AOF_DISCORD_BOT_TOKEN: "  " }, ON, { stored: true, set: false, project: { enabled: true, channels: ["discord"], channelIds: [CHANNEL], allowCounts: [0] } }],
      ]) {
        await withHome(async () => {
          if (stored) await writeMessagingSecret("discord", TOKEN_A);
          await withProject(notifyBlock === null ? null : baseConfig(notifyBlock), async ({ root }) => {
            const result = await invoke("messaging:status", { targetDir: root }, { env });
            const entry = result.channels.find((channel) => channel.type === "discord");
            assert.deepEqual({ stored: entry.stored, set: entry.envOverride.set, project: entry.project }, expected, JSON.stringify({ stored, env, notifyBlock }));
            await assertNothingLeaked([JSON.stringify(result), messagingStatusCommand.cli.render(result)], null, [TOKEN_A, SEG_A, TOKEN_B, SEG_B]);
          });
        });
      }
      await withHome(async (home) => {
        await withProject(null, async ({ root }) => {
          const run = cli(["messaging", "status"], { home, cwd: root, env: { AOF_DISCORD_BOT_TOKEN: "" } });
          assert.equal(run.status, 0, run.stderr);
          assert.match(run.stdout, /this machine: not set — run `aof messaging init discord`/u);
          assert.match(run.stdout, /this project: no project here/u);
        });
      });
    },
  },
  {
    name: "131/08 task04 — a hand-named channel's env var is the one reported, and a channel left without an id says how to set one",
    async run() {
      await withHome(async () => {
        await withProject(baseConfig({ channels: { ops: { type: "discord", tokenEnv: "OPS_BOT" } } }), async ({ root }) => {
          const result = await invoke("messaging:status", { targetDir: root }, { env: {} });
          const entry = result.channels.find((channel) => channel.type === "discord");
          assert.equal(entry.envOverride.name, "OPS_BOT");
          assert.deepEqual(entry.project, { enabled: true, channels: ["ops"], channelIds: [null], allowCounts: [0] });
          assert.match(messagingStatusCommand.cli.render(result), /ops → no channel id — run `aof messaging enable discord --channel <id>`/u);
        });
      });
    },
  },

  {
    name: "131/10 (ADR-007 §7) — status reports how many user ids may answer by reply on each channel, never the ids",
    async run() {
      await withHome(async () => {
        const allow = ["222222222222222222", "333333333333333333"];
        await withProject(baseConfig({ channels: { discord: { type: "discord", channelId: CHANNEL, allow } } }), async ({ root }) => {
          const result = await invoke("messaging:status", { targetDir: root }, { env: {} });
          assert.deepEqual(result.channels[0].project.allowCounts, [2]);
          const text = messagingStatusCommand.cli.render(result);
          assert.ok(text.includes("this project: enabled (discord → 123456789012345678, 2 may answer by reply)"), text);
          for (const id of allow) assert.ok(!text.includes(id) && !JSON.stringify(result).includes(id), "no user id is shown");
        });
      });
    },
  },

  // ── 08 task 05 / 09 tasks 01-02: the notifier reads the store at the point of send ────────────
  {
    name: "131/09 task02 — a notification is posted by the bot to the configured channel, and notify answers the posted message's id",
    async run() {
      await withHome(async () => {
        await writeMessagingSecret("discord", TOKEN_A);
        const spy = fetchSpy({ json: { id: "998877665544332211" } });
        const answer = await notify(DISCORD_ON, ENVELOPE, { env: {}, fetch: spy });
        assert.deepEqual(answer, { delivered: ["discord"], failed: [], messages: [{ channel: "discord", channelId: CHANNEL, messageId: "998877665544332211" }] });
        assert.equal(spy.calls.length, 1);
        const [call] = spy.calls;
        assert.equal(call.method, "POST");
        assert.equal(call.url, `https://discord.com/api/v10/channels/${CHANNEL}/messages`);
        assert.equal(call.authorization, `Bot ${TOKEN_A}`);
        assert.ok(typeof call.body.content === "string" && call.body.content.length > 0, "the body holds content");
        assert.deepEqual(call.body.allowed_mentions, { parse: [] }, "and allowed_mentions");
      });
    },
  },
  {
    name: "131/08 task05 — init after start is picked up with no restart: one process, one workspace object",
    async run() {
      await withHome(async () => {
        const events = degradeSink();
        try {
          const workspace = { config: structuredClone(DISCORD_ON.config) };
          const spy = fetchSpy();
          assert.deepEqual(await notify(workspace, ENVELOPE, { env: {}, fetch: spy }), { delivered: [], failed: ["discord"], messages: [] });
          assert.deepEqual(notifyEventsOf(events).map((e) => e.code), ["notify-channel-unconfigured"]);
          await writeMessagingSecret("discord", TOKEN_A);
          assert.deepEqual((await notify(workspace, ENVELOPE, { env: {}, fetch: spy })).delivered, ["discord"]);
          assert.deepEqual(auths(spy), [`Bot ${TOKEN_A}`]);
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
  {
    name: "131/09 task02 — which token a send uses (five rows); the env override wins, a blank one does not, and a stored webhook URL is not a token",
    async run() {
      for (const [stored, env, expected] of [
        [TOKEN_A, undefined, [`Bot ${TOKEN_A}`]],
        [TOKEN_A, TOKEN_B, [`Bot ${TOKEN_B}`]],
        [TOKEN_A, "   ", [`Bot ${TOKEN_A}`]],
        [WEBHOOK_URL, undefined, []],
        [null, undefined, []],
      ]) {
        await withHome(async () => {
          const events = degradeSink();
          try {
            if (stored != null) await writeMessagingSecret("discord", stored);
            const spy = fetchSpy();
            await notify(DISCORD_ON, ENVELOPE, { env: env === undefined ? {} : { AOF_DISCORD_BOT_TOKEN: env }, fetch: spy });
            assert.deepEqual(auths(spy), expected, JSON.stringify({ stored, env }));
            if (expected.length === 0) {
              const seen = notifyEventsOf(events);
              assert.deepEqual(seen.map((e) => e.code), ["notify-channel-unconfigured"]);
              assert.ok(seen[0].message.includes("aof messaging init discord"), `the degrade names init: ${seen[0].message}`);
              assert.ok(!JSON.stringify(seen).includes("tok_EN-1"), "and never the stored value");
            }
          } finally {
            setDegradeSinkForTest(undefined);
          }
        });
      }
    },
  },
  {
    name: "131/09 task01 — a channel left without an id degrades by name at send, and the fetch is not called",
    async run() {
      await withHome(async () => {
        const events = degradeSink();
        try {
          await writeMessagingSecret("discord", TOKEN_A);
          const spy = fetchSpy();
          const envelope = buildNotifyEnvelope("milestone-accepted", { ref: "131", outcome: { title: "T" } }, { config: {}, now: NOW });
          const answer = await notify(discordOn({ type: "discord" }), envelope, { env: {}, fetch: spy });
          assert.deepEqual(answer.failed, ["discord"]);
          assert.equal(spy.calls.length, 0, "the fetch was not called");
          const seen = notifyEventsOf(events);
          assert.deepEqual(seen.map((e) => e.code), ["notify-channel-unconfigured"]);
          assert.ok(seen[0].message.includes("aof messaging enable discord --channel <id>"), seen[0].message);
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
  {
    name: "131/09 task02 — a failed post degrades by name, resolves with no message and never carries the token (five rows)",
    async run() {
      const reply = (status, json = {}) => ({ status, headers: { get: () => "application/json" }, json: async () => json });
      for (const [label, behaviour, code, named] of [
        ["401", () => reply(401), "notify-delivery-failed", "401"],
        ["403", () => reply(403), "notify-delivery-failed", "403"],
        ["429", () => reply(429, { retry_after: 1.5 }), "notify-rate-limited", "1.5"],
        ["throws TypeError", () => { throw new TypeError(`fetch failed ${TOKEN_A}`); }, "notify-delivery-failed", "TypeError"],
        ["hangs", () => new Promise(() => {}), "notify-delivery-failed", "50ms"],
      ]) {
        await withHome(async () => {
          const events = degradeSink();
          try {
            await writeMessagingSecret("discord", TOKEN_A);
            const answer = await notify(DISCORD_ON, ENVELOPE, { env: {}, fetch: fetchSpy({ behaviour }), timeoutMs: 50 });
            assert.deepEqual({ failed: answer.failed, messages: answer.messages }, { failed: ["discord"], messages: [] }, label);
            const seen = notifyEventsOf(events);
            assert.deepEqual(seen.map((e) => e.code), [code], label);
            assert.ok(seen[0].message.includes(named), `${label}: names ${named} in ${seen[0].message}`);
            await assertNothingLeaked([JSON.stringify(seen), JSON.stringify(answer)], null);
          } finally {
            setDegradeSinkForTest(undefined);
          }
        });
      }
    },
  },
  {
    name: "131/08 task05 — an injected env never moves the store: AOF_GLOBAL_HOME in the handed env is not read",
    async run() {
      await withHome(async () => {
        const elsewhere = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-messaging-elsewhere-")));
        try {
          await writeMessagingSecret("discord", TOKEN_A, { env: { AOF_GLOBAL_HOME: elsewhere } });
          const spy = fetchSpy();
          await notify(DISCORD_ON, ENVELOPE, { env: { AOF_GLOBAL_HOME: elsewhere }, fetch: spy });
          assert.deepEqual(spy.calls, [], "the process's home holds nothing, so nothing is sent");
        } finally {
          setDegradeSinkForTest(undefined);
          await rm(elsewhere, { recursive: true, force: true });
        }
      });
    },
  },
  // ── 131/13: `enable --allow` and `aof messaging test` ───────────────────────────────────────────
  {
    name: "131/13 task00 — enable --allow adds user ids to the channel's allow, unique and in order, keeps what is there, and the file validates",
    async run() {
      const validate = await compileSchema();
      await withHome(async () => {
        await withProject(baseConfig(), async ({ root, configPath }) => {
          const first = await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: CHANNEL, allow: "222222222222222222, 333333333333333333,222222222222222222" }, {});
          assert.equal(first.changed, true);
          const once = JSON.parse(await readFile(configPath, "utf8"));
          assert.deepEqual(once.work.notify, { channels: { discord: { type: "discord", channelId: CHANNEL, allow: ["222222222222222222", "333333333333333333"] } } });
          assert.ok(validate(once), JSON.stringify(validate.errors));
          assert.ok(first.notes.some((note) => note.includes("Added 2 user ids") && note.includes("2 may answer by reply")), first.notes.join(" | "));

          const again = await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: CHANNEL, allow: "333333333333333333" }, {});
          assert.equal(again.changed, false, "an id already listed changes nothing");
          assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")), once, "the file is unchanged");

          const more = await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: CHANNEL, allow: "444444444444444444" }, {});
          assert.equal(more.changed, true);
          assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")).work.notify.channels.discord.allow, ["222222222222222222", "333333333333333333", "444444444444444444"], "added at the end, nothing removed");

          const plain = await invoke("messaging:enable", { type: "discord", targetDir: root, channelId: CHANNEL }, {});
          assert.equal(plain.changed, false);
          assert.ok(plain.notes[0].endsWith("— nothing changed."), "without --allow the note is 09's, unchanged");
        });
      });
    },
  },
  {
    name: "131/13 task00 — a bad --allow id is refused messaging-allow-invalid before any write, and the CLI's --allow reaches the write",
    async run() {
      await withHome(async (home) => {
        await withProject(baseConfig(), async ({ root, configPath }) => {
          const before = await readFile(configPath, "utf8");
          for (const allow of ["12", "abc", "", " , "]) {
            await assert.rejects(
              invoke("messaging:enable", { type: "discord", targetDir: root, channelId: CHANNEL, allow }, {}),
              (error) => error.code === "messaging-allow-invalid",
              `allow ${JSON.stringify(allow)} is refused`,
            );
          }
          assert.equal(await readFile(configPath, "utf8"), before, "nothing was written");
          const run = cli(["messaging", "enable", "discord", "--channel", CHANNEL, "--allow", "555555555555555555"], { home, cwd: root });
          assert.equal(run.status, 0, run.stderr);
          assert.deepEqual(JSON.parse(await readFile(configPath, "utf8")).work.notify.channels.discord.allow, ["555555555555555555"]);
          const status = cli(["messaging", "status"], { home, cwd: root });
          assert.match(status.stdout, new RegExp(`discord → ${CHANNEL}, 1 may answer by reply`, "u"));
        });
      });
    },
  },
  {
    name: "131/13 task01 — messaging test posts the bot's test message to each discord channel through the one door, answers the message id, and degrades nothing",
    async run() {
      await withHome(async () => {
        const events = degradeSink();
        try {
          await writeMessagingSecret("discord", TOKEN_A);
          await withProject({ ...baseConfig(), name: "smoke", work: { ...baseConfig().work, notify: { channels: { discord: { type: "discord", channelId: CHANNEL } } } } }, async ({ root }) => {
            const spy = fetchSpy({ json: { id: "998877665544332211" } });
            const result = await invoke("messaging:test", { type: "discord", targetDir: root }, { env: {}, fetch: spy });
            assert.equal(spy.calls.length, 1, "one post");
            assert.match(spy.calls[0].url, new RegExp(`/channels/${CHANNEL}/messages$`, "u"));
            assert.equal(spy.calls[0].method, "POST");
            assert.equal(spy.calls[0].authorization, `Bot ${TOKEN_A}`);
            assert.deepEqual(spy.calls[0].body, CHANNELS.discord.renderTest({ project: "smoke" }));
            assert.match(spy.calls[0].body.content, /^\*\*aof — test message\*\* · smoke\n/u, "line 1 names the project");
            assert.deepEqual(spy.calls[0].body.allowed_mentions, { parse: [] }, "it pings nobody");
            assert.deepEqual(result.results.map(({ channel, channelId, ok, messageId }) => ({ channel, channelId, ok, messageId })), [{ channel: "discord", channelId: CHANNEL, ok: true, messageId: "998877665544332211" }]);
            assert.deepEqual(notifyEventsOf(events), [], "a test degrades nothing");
            await assertNothingLeaked([JSON.stringify(result)], null);
          });
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
  {
    name: "131/13 task01 — a refused test post is messaging-test-failed with the fix named from Discord's answer (401, 403, 404), and never the token",
    async run() {
      await withHome(async () => {
        const events = degradeSink();
        try {
          await writeMessagingSecret("discord", TOKEN_A);
          const on = { ...baseConfig(), work: { ...baseConfig().work, notify: { channels: { discord: { type: "discord", channelId: CHANNEL } } } } };
          await withProject(on, async ({ root }) => {
            for (const [status, words] of [[401, "rejected the bot token"], [403, "may not post in channel"], [404, "knows no channel"]]) {
              const spy = fetchSpy({ status, json: { message: "nope", code: 0 } });
              await assert.rejects(
                invoke("messaging:test", { type: "discord", targetDir: root }, { env: {}, fetch: spy }),
                (error) => {
                  assert.equal(error.code, "messaging-test-failed");
                  assert.ok(error.message.includes(words) && error.message.includes(`(${status})`), error.message);
                  assert.ok(!error.message.includes(TOKEN_A) && !error.message.includes(SEG_A), "the token is never named");
                  return true;
                },
              );
            }
          });
          assert.deepEqual(notifyEventsOf(events), [], "a test degrades nothing");
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
  {
    name: "131/13 task01 — with no token, or no discord channel, messaging test posts nothing and says what to run",
    async run() {
      await withHome(async () => {
        const spy = fetchSpy();
        const on = { ...baseConfig(), work: { ...baseConfig().work, notify: { channels: { discord: { type: "discord", channelId: CHANNEL } } } } };
        await withProject(on, async ({ root }) => {
          await assert.rejects(
            invoke("messaging:test", { type: "discord", targetDir: root }, { env: {}, fetch: spy }),
            (error) => error.code === "messaging-test-failed" && error.message.includes("aof messaging init discord"),
          );
        });
        await withProject(baseConfig(), async ({ root }) => {
          await assert.rejects(
            invoke("messaging:test", { type: "discord", targetDir: root }, { env: {}, fetch: spy }),
            (error) => error.code === "messaging-not-enabled" && error.message.includes("aof messaging enable discord --channel <id>"),
          );
        });
        assert.deepEqual(spy.calls, [], "nothing was posted");
        assert.deepEqual(await sendTestMessage({ config: {} }, { type: "discord", env: {}, fetch: spy }), [], "no channel, no answer");
      });
    },
  },
  {
    name: "131/13 task01 — messaging:test is routed at [\"messaging\", \"test\"] and --help lists it after status",
    async run() {
      const command = listCommands().find((entry) => entry.id === "messaging:test");
      assert.ok(command, "messaging:test is registered");
      assert.deepEqual(command.cli?.route, ["messaging", "test"]);
      await withHome(async (home) => {
        const run = cli(["--help"], { home });
        assert.equal(run.status, 0, run.stderr);
        const section = run.stdout.slice(run.stdout.indexOf("\nMessaging:\n") + 1).split("\n\n")[0];
        assert.ok(section.indexOf("aof messaging test <type>") > section.indexOf("aof messaging status"), section);
      });
    },
  },
  {
    name: "131/13 task01 — every message's line 1 names the project: the config's name, else the project folder, and none when neither is known",
    async run() {
      await withHome(async () => {
        const events = degradeSink();
        try {
          await writeMessagingSecret("discord", TOKEN_A);
          const channels = { discord: { type: "discord", channelId: CHANNEL } };
          for (const [workspace, expected] of [
            [{ config: { name: "named", work: { notify: { channels } } }, projectRoot: path.join(os.tmpdir(), "folder-a") }, "**131/08 — waiting on you** (build, 1s) · named"],
            [{ config: { work: { notify: { channels } } }, projectRoot: path.join(os.tmpdir(), "folder-b") }, "**131/08 — waiting on you** (build, 1s) · folder-b"],
            [{ config: { work: { notify: { channels } } } }, "**131/08 — waiting on you** (build, 1s)"],
          ]) {
            const spy = fetchSpy();
            await notify(workspace, ENVELOPE, { env: {}, fetch: spy });
            assert.equal(spy.calls[0].body.content.split("\n")[0], expected);
          }
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
];
