// test/notify/notify-messaging.test.mjs — milestone 131 / story 08, tasks 00 to 05 (ADR-005 §1, as
// amended at 131/08). `aof messaging`: the family's registration and budget (00), the machine-wide
// owner-only store (01), `init`'s prompt-or-stdin door that never reads argv (02), the per-project
// `enable`/`disable` switch that writes only `work.notify` (03), `status`, which says whether and
// never what (04), and the notifier reading the store at the point of send (05). FF-13106's
// amended legs live in `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs`.
//
// ISOLATION. Every case runs under a fresh `AOF_GLOBAL_HOME` of its own (`withHome`), and every
// project is a temp directory — no case touches the real `~/.aof` or this repository's config. A
// URL is a fixture, never a real webhook, and "never echoes" is asserted over stdout, stderr and
// every file the run left under the global home (where the degrade sink writes), for the whole URL
// and for its token segment.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { setDegradeSinkForTest } from "../../src/degrade.mjs";
import { invoke, listCommands } from "../../src/command-core.mjs";
import { isDiscordWebhookUrl } from "../../src/notify/discord.mjs";
import { CHANNELS, buildNotifyEnvelope, notify } from "../../src/notify/notify.mjs";
import { messagingSecretPath, messagingSecretPresent, readMessagingSecret, writeMessagingSecret } from "../../src/notify/secret.mjs";
import { messagingInitCommand, messagingStatusCommand } from "../../src/commands/messaging/messaging.mjs";
import {
  SOURCE_DIRECTORY_BUDGETS,
  SOURCE_DIRECTORY_EXEMPTIONS,
  readTreeListing,
  sourceDirectoryBudgetViolations,
} from "../arch/testing/acd-source-directory-budget.test.mjs";
import { stripComments } from "../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BIN = path.join(repoRoot, "bin", "aof.mjs");
const URL_A = "https://discord.com/api/webhooks/123/tok_EN-1";
const TOKEN_A = "tok_EN-1";
const URL_B = "https://discord.com/api/webhooks/456/tok_OVER-2";
const TOKEN_B = "tok_OVER-2";
const STORED = "https://discord.com/api/webhooks/123/stored";
const OVERRIDE = "https://discord.com/api/webhooks/9/override";
const VERBS = ["init", "enable", "disable", "status"];

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
async function assertNothingLeaked(texts, home, secrets = [URL_A, TOKEN_A]) {
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
async function codeOf(fn) {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  return null;
}
const seams = ({ stdin = "", isTTY = false, answer = URL_A } = {}) => {
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

// ── task 05's fixtures ─────────────────────────────────────────────────────────────────────────
const NOW = () => new Date("2026-09-25T12:00:00.000Z");
const ENVELOPE = buildNotifyEnvelope("session-needs-input", { ref: "131/08", phase: "build", elapsedMs: 1000, question: "Ship it?" }, { config: {}, now: NOW });
const DISCORD_ON = Object.freeze({ config: { work: { notify: { channels: { discord: { type: "discord" } } } } } });
function fetchSpy(status = 204) {
  const calls = [];
  const spy = async (url) => {
    calls.push(url);
    return { status, headers: { get: () => null }, json: async () => ({}) };
  };
  spy.calls = calls;
  return spy;
}

export const notifyMessagingTests = [
  // ── task 00: the family is founded and registered ─────────────────────────────────────────────
  {
    name: "131/08 task00 — the four messaging commands are routed, each at [\"messaging\", <verb>]",
    run() {
      const byId = new Map(listCommands().map((command) => [command.id, command]));
      for (const verb of VERBS) {
        const command = byId.get(`messaging:${verb}`);
        assert.ok(command, `messaging:${verb} is registered`);
        assert.deepEqual(command.cli?.route, ["messaging", verb], `messaging:${verb}'s route`);
      }
      assert.equal(listCommands().filter((command) => command.id.startsWith("messaging:")).length, 4, "exactly four");
    },
  },
  {
    name: "131/08 task00 — aof --help carries a Messaging: section listing the four usage lines, and no URL",
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
      const exemption = SOURCE_DIRECTORY_EXEMPTIONS.find((entry) => entry.directory === "src/commands/messaging");
      assert.ok(exemption, "src/commands/messaging is an exemption");
      assert.ok(exemption.why.includes("131/08") && exemption.why.includes("messaging.mjs"), "its why names 131/08 and its member");
      const row = SOURCE_DIRECTORY_BUDGETS.find((entry) => entry.directory === "src/commands");
      assert.equal(row.ceiling, 69, "the src/commands row is still 69");
      assert.equal(row.allowance, 0);
      for (const [dir, member] of [["src/notify", "secret.mjs"], ["test/notify", "notify-messaging"]]) {
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

  // ── task 01: the machine-wide, owner-only store ───────────────────────────────────────────────
  {
    name: "131/08 task01 — a written URL is read back from <AOF_GLOBAL_HOME>/messaging/discord.secret",
    async run() {
      await withHome(async (home) => {
        const written = await writeMessagingSecret("discord", URL_A);
        const expected = path.join(home, "messaging", "discord.secret");
        assert.equal(written.path, expected);
        assert.equal(messagingSecretPath("discord"), expected, "the path is the process's global home");
        assert.equal(await readFile(expected, "utf8"), `${URL_A}\n`, "the URL and one trailing newline, nothing else");
        assert.equal(await readMessagingSecret("discord"), URL_A);
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
          await writeMessagingSecret("discord", URL_A);
          assert.equal(await readMessagingSecret("discord"), URL_A);
          return;
        }
        await chmod(file, 0o644);
        await chmod(path.dirname(file), 0o755);
        await writeMessagingSecret("discord", URL_A);
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
  {
    name: "131/08 task01 — the Discord URL shape (ten rows), and it is the discord channel's accepts",
    run() {
      for (const [value, accepted] of [
        ["https://discord.com/api/webhooks/123/tok_EN-1", true],
        ["https://discordapp.com/api/webhooks/123/tok", true],
        ["https://ptb.discord.com/api/v10/webhooks/123/tok", true],
        ["https://canary.discord.com/api/webhooks/123/tok", true],
        ["http://discord.com/api/webhooks/123/tok", false],
        ["https://discord.com/api/webhooks/abc/tok", false],
        ["https://discord.com/api/webhooks/123/", false],
        ["https://evil.example/api/webhooks/123/tok", false],
        ["https://discord.com.evil.example/api/webhooks/1/t", false],
        [" ", false],
      ]) {
        assert.equal(isDiscordWebhookUrl(value), accepted, value);
      }
      assert.equal(CHANNELS.discord.accepts, isDiscordWebhookUrl);
    },
  },

  // ── task 02: init reads a prompt or stdin, never argv ─────────────────────────────────────────
  {
    name: "131/08 task02 — a URL piped on stdin is stored, and nothing printed contains it",
    async run() {
      await withHome(async (home) => {
        const run = cli(["messaging", "init", "discord"], { home, input: `${URL_A}\n` });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(await readMessagingSecret("discord"), URL_A);
        const [first, second] = run.stdout.trim().split("\n");
        assert.equal(first, `Stored the Discord webhook for this machine at ${messagingSecretPath("discord")}.`);
        assert.equal(second, "Switch it on per project with `aof messaging enable discord`.");
        await assertNothingLeaked([run.stdout, run.stderr], home);
      });
    },
  },
  {
    name: "131/08 task02 — on a TTY the prompt asks `Discord webhook URL:` through a password prompt, stores the URL, and nothing printed contains it",
    async run() {
      await withHome(async () => {
        const events = degradeSink();
        try {
          const seam = seams({ isTTY: true, answer: URL_A });
          const input = await messagingInitCommand.cli.argv(["discord"], {}, seam);
          assert.deepEqual(seam.prompts, [{ message: "Discord webhook URL:" }], "the prompt seam was asked once, with the message");
          const result = await invoke("messaging:init", input, {});
          assert.equal(await readMessagingSecret("discord"), URL_A);
          await assertNothingLeaked([messagingInitCommand.cli.render(result), JSON.stringify(messagingInitCommand.cli.json(result)), JSON.stringify(events)]);
          const source = stripComments(await readFile(path.join(repoRoot, "src", "commands", "messaging", "messaging.mjs"), "utf8"));
          assert.match(source, /const\s*\{\s*password\s*\}\s*=\s*await\s+import\("@inquirer\/prompts"\)/u, "the default seam is @inquirer/prompts' password");
          assert.doesNotMatch(source, /\bmask\s*:/u, "and it sets no mask, so nothing is echoed");
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
  {
    name: "131/08 task02 — a second init replaces the first and says Replaced; --json answers { type, path, replaced } with no URL",
    async run() {
      await withHome(async (home) => {
        await writeMessagingSecret("discord", URL_B);
        const run = cli(["messaging", "init", "discord"], { home, input: `${URL_A}\n` });
        assert.equal(run.status, 0, run.stderr);
        assert.equal(await readMessagingSecret("discord"), URL_A, "the stored URL is the new one");
        assert.match(run.stdout, /^Replaced the Discord webhook/u);
        const json = cli(["messaging", "init", "discord", "--json"], { home, input: `${URL_A}\n` });
        assert.deepEqual(jsonOf(json), { type: "discord", path: messagingSecretPath("discord"), replaced: true });
        await assertNothingLeaked([run.stdout, run.stderr, json.stdout, json.stderr], home);
      });
    },
  },
  {
    name: "131/08 task02 — a refused init stores nothing and echoes nothing (six rows)",
    async run() {
      for (const [args, input, code] of [
        [["discord", URL_A], "", "messaging-secret-in-argv"],
        [["discord", TOKEN_A], "", "messaging-secret-in-argv"],
        [["discord", `--url=${URL_A}`], "", "unknown-flag"],
        [["discord"], "\n", "messaging-url-empty"],
        [["discord"], "https://evil.example/api/webhooks/123/tok_EN-1", "messaging-url-invalid"],
        [["discord"], "http://discord.com/api/webhooks/123/tok_EN-1", "messaging-url-invalid"],
      ]) {
        await withHome(async (home) => {
          for (const json of [false, true]) {
            const run = cli(["messaging", "init", ...args, ...(json ? ["--json"] : [])], { home, input });
            assert.notEqual(run.status, 0, `${args.join(" ")} exits non-zero`);
            if (json) assert.equal(jsonOf(run).code, code, `${args.join(" ")}: ${run.stdout}`);
            await assertNothingLeaked([run.stdout, run.stderr], home);
          }
          assert.equal(await stat(messagingSecretPath("discord")).then(() => true, () => false), false, "no discord.secret exists");
        });
      }
    },
  },

  // ── task 03: enable and disable write only work.notify ────────────────────────────────────────
  {
    name: "131/08 task03 — enable adds { channels: { discord: { type: \"discord\" } } } and nothing else, and the file validates; disable removes it",
    async run() {
      const validate = await compileSchema();
      await withHome(async () => {
        await withProject(baseConfig(), async ({ root, configPath }) => {
          const before = JSON.parse(await readFile(configPath, "utf8"));
          await invoke("messaging:enable", { type: "discord", targetDir: root }, {});
          const enabled = JSON.parse(await readFile(configPath, "utf8"));
          assert.deepEqual(enabled.work.notify, { channels: { discord: { type: "discord" } } });
          assert.deepEqual(withoutNotify(enabled), withoutNotify(before), "every other key is unchanged");
          assert.ok(validate(enabled), JSON.stringify(validate.errors));
          await invoke("messaging:disable", { type: "discord", targetDir: root }, {});
          const disabled = JSON.parse(await readFile(configPath, "utf8"));
          assert.equal(Object.hasOwn(disabled.work, "notify"), false, "no work.notify key");
          assert.deepEqual(disabled, before, "every other key is unchanged");
          for (const text of [JSON.stringify(enabled), JSON.stringify(disabled)]) assert.doesNotMatch(text, /"(?:url|webhook|token)"/iu, "no url, webhook or token key");
        });
      });
    },
  },
  {
    name: "131/08 task03 — a hand-named channel is respected: enable is byte-unchanged and says already enabled",
    async run() {
      await withHome(async () => {
        const block = { channels: { ops: { type: "discord", urlEnv: "OPS_HOOK", events: ["loop-halted"] } } };
        await withProject(baseConfig(block), async ({ root, configPath }) => {
          const bytes = await readFile(configPath);
          const result = await invoke("messaging:enable", { type: "discord", targetDir: root }, {});
          assert.ok((await readFile(configPath)).equals(bytes), "the file is byte-unchanged");
          assert.equal(result.changed, false);
          assert.match(result.notes.join("\n"), /already enabled/u);
        });
      });
    },
  },
  {
    name: "131/08 task03 — disable over what is there (three rows)",
    async run() {
      await withHome(async () => {
        for (const [before, after, unchanged] of [
          [{ channels: { discord: { type: "discord" } }, link: "https://x.test/{ref}" }, { channels: {}, link: "https://x.test/{ref}" }, false],
          [{ channels: { a: { type: "discord" }, b: { type: "discord", urlEnv: "B" } } }, undefined, false],
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
          if (stored) await writeMessagingSecret("discord", URL_A);
          await withProject(baseConfig(), async ({ root }) => {
            const result = await invoke("messaging:enable", { type: "discord", targetDir: root }, {});
            const text = result.notes.join("\n");
            assert.equal(text.includes("No webhook is stored on this machine yet"), !stored, text);
            if (!stored) assert.ok(text.includes("No webhook is stored on this machine yet — run `aof messaging init discord`."));
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
          const run = cli(["messaging", "enable", "discord", "--json"], { home, cwd: root });
          assert.notEqual(run.status, 0);
          assert.equal(jsonOf(run).code, "messaging-no-project");
          assert.deepEqual(await readdir(root), [], "no file is created");
        });
      });
    },
  },

  // ── task 04: status says whether, never what ──────────────────────────────────────────────────
  {
    name: "131/08 task04 — status never shows the value, in text or JSON",
    async run() {
      await withHome(async () => {
        await writeMessagingSecret("discord", URL_A);
        await withProject(baseConfig({ channels: { discord: { type: "discord" } } }), async ({ root }) => {
          const result = await invoke("messaging:status", { targetDir: root }, { env: { AOF_DISCORD_WEBHOOK_URL: URL_B } });
          const entry = result.channels.find((channel) => channel.type === "discord");
          assert.equal(entry.stored, true);
          assert.deepEqual(entry.envOverride, { name: "AOF_DISCORD_WEBHOOK_URL", set: true });
          assert.deepEqual(entry.project, { enabled: true, channels: ["discord"] });
          const text = messagingStatusCommand.cli.render(result);
          assert.equal(text, [
            "discord",
            `  this machine: set (${messagingSecretPath("discord")})`,
            "  env override AOF_DISCORD_WEBHOOK_URL: set",
            "  this project: enabled (discord)",
          ].join("\n"));
          await assertNothingLeaked([text, JSON.stringify(messagingStatusCommand.cli.json(result))], null, [URL_A, TOKEN_A, URL_B, TOKEN_B]);
        });
      });
    },
  },
  {
    name: "131/08 task04 — the three facts (four rows), and status is a report that exits 0",
    async run() {
      for (const [stored, env, notifyBlock, expected] of [
        [false, {}, null, { stored: false, set: false, project: null }],
        [true, {}, { channels: { discord: { type: "discord" } } }, { stored: true, set: false, project: { enabled: true, channels: ["discord"] } }],
        [false, { AOF_DISCORD_WEBHOOK_URL: URL_B }, undefined, { stored: false, set: true, project: { enabled: false, channels: [] } }],
        [true, { AOF_DISCORD_WEBHOOK_URL: "  " }, { channels: { discord: { type: "discord" } } }, { stored: true, set: false, project: { enabled: true, channels: ["discord"] } }],
      ]) {
        await withHome(async () => {
          if (stored) await writeMessagingSecret("discord", URL_A);
          await withProject(notifyBlock === null ? null : baseConfig(notifyBlock), async ({ root }) => {
            const result = await invoke("messaging:status", { targetDir: root }, { env });
            const entry = result.channels.find((channel) => channel.type === "discord");
            assert.deepEqual({ stored: entry.stored, set: entry.envOverride.set, project: entry.project }, expected, JSON.stringify({ stored, env, notifyBlock }));
          });
        });
      }
      await withHome(async (home) => {
        await withProject(null, async ({ root }) => {
          const run = cli(["messaging", "status"], { home, cwd: root, env: { AOF_DISCORD_WEBHOOK_URL: "" } });
          assert.equal(run.status, 0, run.stderr);
          assert.match(run.stdout, /this machine: not set — run `aof messaging init discord`/u);
          assert.match(run.stdout, /this project: no project here/u);
        });
      });
    },
  },
  {
    name: "131/08 task04 — a hand-named channel's env var is the one reported",
    async run() {
      await withHome(async () => {
        await withProject(baseConfig({ channels: { ops: { type: "discord", urlEnv: "OPS_HOOK" } } }), async ({ root }) => {
          const result = await invoke("messaging:status", { targetDir: root }, { env: {} });
          const entry = result.channels.find((channel) => channel.type === "discord");
          assert.equal(entry.envOverride.name, "OPS_HOOK");
          assert.deepEqual(entry.project.channels, ["ops"]);
        });
      });
    },
  },

  // ── task 05: the notifier reads the store at the point of send ────────────────────────────────
  {
    name: "131/08 task05 — a stored URL is used when the env var is unset",
    async run() {
      await withHome(async () => {
        await writeMessagingSecret("discord", URL_A);
        const spy = fetchSpy();
        assert.deepEqual(await notify(DISCORD_ON, ENVELOPE, { env: {}, fetch: spy }), { delivered: ["discord"], failed: [] });
        assert.deepEqual(spy.calls, [URL_A], "the fetch was called with the stored URL");
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
          assert.deepEqual(await notify(workspace, ENVELOPE, { env: {}, fetch: spy }), { delivered: [], failed: ["discord"] });
          assert.deepEqual(events.filter((e) => String(e.code).startsWith("notify-")).map((e) => e.code), ["notify-channel-unconfigured"]);
          await writeMessagingSecret("discord", URL_A);
          assert.deepEqual(await notify(workspace, ENVELOPE, { env: {}, fetch: spy }), { delivered: ["discord"], failed: [] });
          assert.deepEqual(spy.calls, [URL_A]);
        } finally {
          setDegradeSinkForTest(undefined);
        }
      });
    },
  },
  {
    name: "131/08 task05 — which URL a send uses (four rows); the env override wins, a blank one does not",
    async run() {
      for (const [stored, env, expected] of [
        [STORED, undefined, [STORED]],
        [STORED, OVERRIDE, [OVERRIDE]],
        [STORED, "   ", [STORED]],
        [null, undefined, []],
      ]) {
        await withHome(async () => {
          const events = degradeSink();
          try {
            if (stored != null) await writeMessagingSecret("discord", stored);
            const spy = fetchSpy();
            await notify(DISCORD_ON, ENVELOPE, { env: env === undefined ? {} : { AOF_DISCORD_WEBHOOK_URL: env }, fetch: spy });
            assert.deepEqual(spy.calls, expected, JSON.stringify({ stored, env }));
            if (expected.length === 0) {
              const seen = events.filter((e) => e.code === "notify-channel-unconfigured");
              assert.equal(seen.length, 1);
              assert.equal(seen[0].message, "notify channel \"discord\" has no webhook URL — set AOF_DISCORD_WEBHOOK_URL or run `aof messaging init discord`", "the degrade names both remedies");
            }
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
          await writeMessagingSecret("discord", URL_A, { env: { AOF_GLOBAL_HOME: elsewhere } });
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
];
