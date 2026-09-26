// messaging:init / messaging:enable / messaging:disable / messaging:status / messaging:test — `aof messaging`, the
// one way a notify channel's credential enters aof and the per-project switch that turns it on
// (milestone 131 / stories 08-09; ADR-005 §1 as amended at 131/08, ADR-007). One module registers
// the five, as `mesh/desktop.mjs` registers its verbs: they are one surface, and the channel TYPE is
// a positional, so a second type is a `CHANNELS` entry and a store file, never a new verb.
//
//   init <type>     — machine-wide. Reads the credential (for discord, the bot token) from a hidden
//                     prompt (a TTY) or the first line of stdin, checks it with the type's `accepts`,
//                     and stores it through `writeMessagingSecret` (`src/notify/secret.mjs`, the
//                     store's ONE home). For discord it prints the invite URL, computed offline
//                     from the token's decoded id. It needs no project and writes nothing in one.
//   enable <type>   — per project. `enable discord --channel <id>` adds `work.notify.channels.<type>
//   disable <type>    = { type, channelId }` to the project's `.aof/aof.config.json`; disable
//                     removes every channel of the type. Both go through `readConfig`/`writeConfig`
//                     (`src/work/delegation.mjs`) and change no key outside `work.notify`. No write
//                     ever carries a `url`, `webhook` or `token` key (FF-13106).
//   test <type>     — per project. Posts one test message to each channel of the type through the
//                     notifier's own checks and sender (`sendTestMessage`), and on a failure names the
//                     fix from Discord's answer (401 token, 403 permissions, 404 channel). Exits non-zero
//                     when any channel was not reached.
//   status          — per type: stored on this machine, the env override set, enabled here, with
//                     which channel ids and how many user ids may answer by reply on each (ADR-007
//                     §7, 131/10's `allow`). It asks the store only whether a credential is present,
//                     and never reads an env var's value into its answer.
//
// THE ARGV RULE. argv lands in shell history and the process list, so the token never arrives by
// argv: any positional after the type — or a URL-looking type — is refused
// `messaging-secret-in-argv` before any read or write, and no refusal ever repeats what it refused.
// `--token=<value>` is refused by the face's own `parseSpecArgv` as an unknown flag, which names the
// flag and never its value.
//
// PROMPTING IS A FACE CONCERN (the `promptOrchestratorModel` precedent): the async argv adapter
// reads the token — through an injectable `{ stdin, isTTY, promptSecret }` seam, so the TTY path is
// driven with a fake prompt — and hands `run()` an input no face prints. `run()` stays headless.
import { existsSync } from "node:fs";
import path from "node:path";
import { commandError } from "../../command-error.mjs";
import { CHANNELS, DEFAULT_TOKEN_ENV, sendTestMessage } from "../../notify/notify.mjs";
import { messagingSecretPath, messagingSecretPresent, writeMessagingSecret } from "../../notify/secret.mjs";
import { readConfig, writeConfig } from "../../work/delegation.mjs";

const TYPES = Object.freeze(Object.keys(CHANNELS));
const KNOWN = TYPES.join(", ");
// A word that could be a channel type is safe to name back; anything else is not repeated.
const TYPE_WORD = /^[a-z][a-z0-9-]{0,31}$/u;
const URL_LIKE = /[:/]/u;
const GUIDE = "wiki/architecture/discord-notifications.md";
const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const nonBlank = (value) => typeof value === "string" && value.trim().length > 0;

const labelOf = (type) => CHANNELS[type]?.label ?? type;
const credentialOf = (type) => `${labelOf(type)} ${CHANNELS[type]?.credential ?? "credential"}`;
const initHint = (type) => `aof messaging init ${type}`;
const enableHint = (type) => `aof messaging enable ${type} --channel <id>`;

// The channel type a verb names, refused by code when it is missing, unknown or argv-borne secret.
function channelTypeFrom(positionals, verb) {
  const type = positionals[0];
  if (type === undefined) {
    throw commandError(`Name a channel type: \`aof messaging ${verb} <type>\` — the known type is ${KNOWN}.`, "messaging-channel-required", 400);
  }
  if (typeof type === "string" && URL_LIKE.test(type)) throw secretInArgv();
  if (!Object.hasOwn(CHANNELS, type)) {
    const named = typeof type === "string" && TYPE_WORD.test(type) ? `"${type}" is not` : "That is not";
    throw commandError(`${named} a messaging channel type — the known type is ${KNOWN}.`, "messaging-unknown-channel", 400);
  }
  return type;
}

// Every verb points at `init`, the one door the token enters by: only it prompts or reads stdin.
function secretInArgv() {
  return commandError(
    "A bot token is never read from the command line — argv lands in shell history and the process list. Run `aof messaging init <type>` and paste the token at the prompt, or pipe it on stdin.",
    "messaging-secret-in-argv",
    400,
  );
}

function refuseExtra(positionals, from, verb) {
  if (positionals.length > from) {
    throw commandError(`\`aof messaging ${verb}\` takes ${from === 0 ? "no argument" : "only the channel type"} — the extra argument was not read.`, "messaging-unexpected-argument", 400);
  }
}

// ── init: the token's one door ─────────────────────────────────────────────────────────────────

async function promptSecretDefault({ message }) {
  // Lazy, so the non-interactive paths never load the prompt library. No `mask`: nothing is echoed.
  const { password } = await import("@inquirer/prompts");
  return password({ message });
}

// The seam a test drives: the stdin stream, whether it is a terminal, and the hidden prompt.
function defaultSecretSeams() {
  return { stdin: process.stdin, isTTY: Boolean(process.stdin.isTTY), promptSecret: promptSecretDefault };
}

// The first line of a stream, without its line ending. A stream that ends first answers what came.
async function readFirstLine(stream) {
  let buffer = "";
  for await (const chunk of stream) {
    buffer += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    const newline = buffer.indexOf("\n");
    if (newline !== -1) return buffer.slice(0, newline).replace(/\r$/u, "");
  }
  return buffer.replace(/\r$/u, "");
}

// readSecretInput(type, seams) → the credential as typed or piped, trimmed. Never printed.
async function readSecretInput(type, { stdin, isTTY, promptSecret } = defaultSecretSeams()) {
  const raw = isTTY ? await promptSecret({ message: `${credentialOf(type)}:` }) : await readFirstLine(stdin);
  return typeof raw === "string" ? raw.trim() : "";
}

export const messagingInitCommand = {
  id: "messaging:init",
  input: {
    type: "object",
    properties: { type: { type: "string" }, secret: { type: "string" } },
    required: ["type", "secret"],
    additionalProperties: false,
  },

  async run(input) {
    const { type, secret } = input;
    if (!Object.hasOwn(CHANNELS, type)) {
      throw commandError(`That is not a messaging channel type — the known type is ${KNOWN}.`, "messaging-unknown-channel", 400);
    }
    if (!nonBlank(secret)) {
      throw commandError(`No ${credentialOf(type)} was given — nothing was stored.`, "messaging-url-empty", 400);
    }
    if (!CHANNELS[type].accepts(secret.trim())) {
      throw commandError(
        `That is not a ${credentialOf(type)} (three dot-separated segments, the first naming the bot's id). The ${labelOf(type)} channel takes a bot token, not a webhook URL — ${GUIDE} shows where to copy it. Nothing was stored.`,
        "messaging-token-invalid",
        400,
      );
    }
    const written = await writeMessagingSecret(type, secret.trim());
    const inviteUrl = CHANNELS[type].invite?.(secret.trim()) ?? null;
    return { type, path: written.path, replaced: written.replaced, inviteUrl };
  },

  cli: {
    route: ["messaging", "init"],
    spec: {
      usage: "aof messaging init <type>   (the bot token is read from a hidden prompt or stdin, never argv) [--json]",
      workspace: false,
    },

    // ASYNC by design: the token is read HERE, before invoke, from the prompt or stdin.
    async argv(positionals, _options, seams = defaultSecretSeams()) {
      if (positionals[0] !== undefined && positionals.length > 1) throw secretInArgv();
      const type = channelTypeFrom(positionals, "init");
      return { type, secret: await readSecretInput(type, seams) };
    },

    render: (result) => [
      `${result.replaced ? "Replaced" : "Stored"} the ${credentialOf(result.type)} for this machine at ${result.path}.`,
      ...(result.inviteUrl == null ? [] : [`Invite the bot to your server: ${result.inviteUrl}`]),
      `Switch it on per project with \`${enableHint(result.type)}\`.`,
    ].join("\n"),

    json: ({ type, path, replaced, inviteUrl }) => ({ type, path, replaced, inviteUrl }),
  },
};

// ── enable / disable: the per-project switch ───────────────────────────────────────────────────

// The project's config, or a refusal when no `.aof/aof.config.json` stands above `targetDir`.
async function projectConfigOrRefuse(targetDir, verb) {
  const { configPath, config } = await readConfig(targetDir);
  if (!existsSync(configPath)) {
    throw commandError(`\`aof messaging ${verb}\` switches a channel per project, and there is no .aof/aof.config.json here or above — run it inside a project.`, "messaging-no-project", 400);
  }
  return { configPath, config };
}

// The names of the project's channels of `type`, in config order.
function channelNamesOfType(config, type) {
  const channels = config?.work?.notify?.channels;
  if (!isPlainObject(channels)) return [];
  return Object.entries(channels).filter(([, channel]) => isPlainObject(channel) && channel.type === type).map(([name]) => name);
}

const noSecretLine = (type) => `No ${credentialOf(type)} is stored on this machine yet — run \`${initHint(type)}\`.`;

// The channel id `enable` was handed, refused by code when it is missing or not the type's shape.
// The value is named back only once it has passed the shape check.
function checkedChannelId(type, channelId) {
  if (channelId === undefined || channelId === null || channelId === "") {
    throw commandError(`\`aof messaging enable ${type}\` needs the ${labelOf(type)} channel to post to: \`${enableHint(type)}\` (Developer Mode → Copy Channel ID).`, "messaging-channel-id-required", 400);
  }
  if (!CHANNELS[type].validChannelId(channelId)) {
    throw commandError(`That is not a ${labelOf(type)} channel id — an id is 17 to 20 digits (Developer Mode → Copy Channel ID).`, "messaging-channel-id-invalid", 400);
  }
  return channelId;
}

// The user ids `--allow` was handed (a comma list), each checked as a snowflake, de-duplicated in the
// order given. `undefined` when no `--allow` was passed.
function checkedAllow(type, allow) {
  if (allow === undefined || allow === null) return undefined;
  const ids = String(allow).split(",").map((id) => id.trim()).filter((id) => id.length > 0);
  if (ids.length === 0 || ids.some((id) => !CHANNELS[type].validChannelId(id))) {
    throw commandError(`\`--allow\` takes ${labelOf(type)} user ids, comma-separated — an id is 17 to 20 digits (Developer Mode → right-click a name → Copy User ID). Nothing was changed.`, "messaging-allow-invalid", 400);
  }
  return [...new Set(ids)];
}

// Adds `ids` to a channel's `allow`, keeping what is there and its order. Answers how many were new.
function mergeAllow(channel, ids) {
  if (ids === undefined) return 0;
  const current = Array.isArray(channel.allow) ? channel.allow.filter((id) => typeof id === "string") : [];
  const added = ids.filter((id) => !current.includes(id));
  if (added.length > 0 || !Array.isArray(channel.allow)) channel.allow = [...current, ...added];
  return added.length;
}

const allowNote = (name, added, total) => (added === 0
  ? `Everyone named by --allow already answers on "${name}" (${total} may answer by reply).`
  : `Added ${added} user id${added === 1 ? "" : "s"} to the answer list of "${name}" (${total} may answer by reply).`);

const TARGET_INPUT = Object.freeze({
  type: "object",
  properties: { type: { type: "string" }, targetDir: { type: "string" } },
  required: ["type", "targetDir"],
  additionalProperties: false,
});

function switchArgv(verb) {
  return (positionals, options = {}) => {
    const type = channelTypeFrom(positionals, verb);
    refuseExtra(positionals, 1, verb);
    return {
      type,
      targetDir: process.cwd(),
      ...(verb === "enable" && options.channel !== undefined ? { channelId: options.channel } : {}),
      ...(verb === "enable" && options.allow !== undefined ? { allow: String(options.allow) } : {}),
    };
  };
}

const switchJson = ({ notes, ...rest }) => rest;

export const messagingEnableCommand = {
  id: "messaging:enable",
  input: {
    type: "object",
    properties: {
      type: { type: "string" },
      targetDir: { type: "string" },
      channelId: { type: "string" },
      allow: { type: "string" },
    },
    required: ["type", "targetDir"],
    additionalProperties: false,
  },

  // A channel of this type already on the id is left byte-unchanged. A channel of this type with NO
  // id — one 08's enable wrote — is completed in place (DEFAULT DECISION: its `urlEnv`, which the
  // schema now refuses, goes with it), so a re-run upgrades rather than leaving a channel that
  // degrades on every send. Any other id adds a channel, numbered `<type>-2`, `<type>-3`, … as 08 does.
  // `--allow` ADDS user ids to that channel's `allow` (131/ADR-008 §3's answer list), keeping the ones
  // already there: re-running with the same id changes nothing, and nothing here ever removes one.
  async run({ type, targetDir, channelId, allow }) {
    const id = checkedChannelId(type, channelId);
    const allowIds = checkedAllow(type, allow);
    const { configPath, config } = await projectConfigOrRefuse(targetDir, "enable");
    const stored = await messagingSecretPresent(type);
    const notes = [];
    const existing = channelNamesOfType(config, type);
    const onId = existing.filter((name) => config.work.notify.channels[name].channelId === id);
    const idless = existing.find((name) => typeof config.work.notify.channels[name].channelId !== "string");
    let channels = onId;
    let changed = false;
    // The answer list, applied to the channel(s) this enable lands on; its note follows the channel's.
    const applyAllow = (names) => {
      let added = 0;
      for (const name of names) added += mergeAllow(config.work.notify.channels[name], allowIds);
      return added;
    };
    const allowNotes = (names) => (allowIds === undefined ? [] : names.map((name) => allowNote(name, 0, config.work.notify.channels[name].allow.length)));
    if (onId.length > 0) {
      const added = applyAllow(onId);
      if (allowIds === undefined) {
        notes.push(`${type} is already enabled for this project on channel ${id} (${onId.map((name) => `"${name}"`).join(", ")}) — nothing changed.`);
      } else {
        notes.push(`${type} is already enabled for this project on channel ${id} (${onId.map((name) => `"${name}"`).join(", ")}).`);
        if (added > 0) {
          await writeConfig(configPath, config);
          changed = true;
          notes.push(...onId.map((name) => allowNote(name, added, config.work.notify.channels[name].allow.length)));
        } else {
          notes.push(...allowNotes(onId));
        }
      }
    } else if (idless !== undefined) {
      const channel = config.work.notify.channels[idless];
      delete channel.urlEnv;
      channel.channelId = id;
      const added = applyAllow([idless]);
      await writeConfig(configPath, config);
      channels = [idless];
      changed = true;
      notes.push(`Set channel ${id} on "${idless}" for this project in ${configPath}.`);
      if (allowIds !== undefined) notes.push(allowNote(idless, added, channel.allow.length));
    } else {
      if (!isPlainObject(config.work)) config.work = {};
      if (!isPlainObject(config.work.notify)) config.work.notify = { channels: {} };
      if (!isPlainObject(config.work.notify.channels)) config.work.notify.channels = {};
      let name = type;
      for (let n = 2; Object.hasOwn(config.work.notify.channels, name); n += 1) name = `${type}-${n}`;
      config.work.notify.channels[name] = { type, channelId: id };
      const added = applyAllow([name]);
      await writeConfig(configPath, config);
      channels = [name];
      changed = true;
      notes.push(`Enabled ${type} on channel ${id} for this project in ${configPath}.`);
      if (allowIds !== undefined) notes.push(allowNote(name, added, config.work.notify.channels[name].allow.length));
    }
    if (!stored) notes.push(noSecretLine(type));
    return { type, configPath, changed, channels, channelId: id, stored, notes };
  },

  cli: {
    route: ["messaging", "enable"],
    spec: {
      usage: "aof messaging enable <type> --channel <id> [--allow <user-id>[,<user-id>…]] [--json]",
      workspace: false,
      flags: {
        channel: { type: "string", description: "the Discord channel id the bot posts to (not a secret)" },
        allow: { type: "string", description: "Discord user ids that may answer by reply and run the slash commands, comma-separated; added to the channel's list" },
      },
    },
    argv: switchArgv("enable"),
    render: (result) => result.notes.join("\n"),
    json: switchJson,
  },
};

export const messagingDisableCommand = {
  id: "messaging:disable",
  input: TARGET_INPUT,

  async run({ type, targetDir }) {
    const { configPath, config } = await projectConfigOrRefuse(targetDir, "disable");
    const removed = channelNamesOfType(config, type);
    if (removed.length === 0) {
      return { type, configPath, changed: false, removed, notes: [`${type} is not enabled for this project — nothing changed.`] };
    }
    const notify = config.work.notify;
    for (const name of removed) delete notify.channels[name];
    // Nothing else left in the block → the block goes. A remaining `link` keeps `channels: {}`
    // beside it, the same honest no-op (ADR-005 §1).
    if (Object.keys(notify.channels).length === 0 && Object.keys(notify).every((key) => key === "channels")) delete config.work.notify;
    await writeConfig(configPath, config);
    return { type, configPath, changed: true, removed, notes: [`Disabled ${type} for this project in ${configPath} (removed ${removed.map((name) => `"${name}"`).join(", ")}).`] };
  },

  cli: {
    route: ["messaging", "disable"],
    spec: { usage: "aof messaging disable <type> [--json]", workspace: false },
    argv: switchArgv("disable"),
    render: (result) => result.notes.join("\n"),
    json: switchJson,
  },
};

// ── status: presence, never the value ──────────────────────────────────────────────────────────

export const messagingStatusCommand = {
  id: "messaging:status",
  input: {
    type: "object",
    properties: { targetDir: { type: "string" } },
    required: ["targetDir"],
    additionalProperties: false,
  },

  // `ctx.env` is the env the override is looked up in (a test injects one); the store is always
  // the process's own global home.
  async run({ targetDir }, ctx = {}) {
    const env = ctx.env ?? process.env;
    const { configPath, config } = await readConfig(targetDir);
    const inProject = existsSync(configPath);
    const channels = [];
    for (const type of TYPES) {
      const names = inProject ? channelNamesOfType(config, type) : [];
      const entries = names.map((name) => config.work.notify.channels[name]);
      const first = entries[0] ?? null;
      const name = typeof first?.tokenEnv === "string" ? first.tokenEnv : DEFAULT_TOKEN_ENV;
      channels.push({
        type,
        stored: await messagingSecretPresent(type),
        path: messagingSecretPath(type),
        envOverride: { name, set: nonBlank(env[name]) },
        project: inProject
          ? {
            enabled: names.length > 0,
            channels: names,
            channelIds: entries.map((entry) => (typeof entry.channelId === "string" ? entry.channelId : null)),
            allowCounts: entries.map((entry) => (Array.isArray(entry.allow) ? entry.allow.length : 0)),
          }
          : null,
      });
    }
    return { channels };
  },

  cli: {
    route: ["messaging", "status"],
    spec: { usage: "aof messaging status [--json]", workspace: false },

    argv(positionals) {
      refuseExtra(positionals, 0, "status");
      return { targetDir: process.cwd() };
    },

    render: ({ channels }) => channels.map((entry) => [
      entry.type,
      `  this machine: ${entry.stored ? `set (${entry.path})` : `not set — run \`${initHint(entry.type)}\``}`,
      `  env override ${entry.envOverride.name}: ${entry.envOverride.set ? "set" : "not set"}`,
      `  this project: ${projectLine(entry)}`,
    ].join("\n")).join("\n\n"),

    json: ({ channels }) => ({ channels }),
  },
};

// `enabled (discord → 123…, 2 may answer by reply, ops → no channel id — run …)`, `disabled`, or
// `no project here`.
function projectLine(entry) {
  if (entry.project == null) return "no project here";
  if (!entry.project.enabled) return "disabled";
  const each = entry.project.channels.map((name, index) => {
    const id = entry.project.channelIds[index];
    if (id == null) return `${name} → no channel id — run \`${enableHint(entry.type)}\``;
    const allowed = entry.project.allowCounts[index];
    return allowed > 0 ? `${name} → ${id}, ${allowed} may answer by reply` : `${name} → ${id}`;
  });
  return `enabled (${each.join(", ")})`;
}

// ── test: one real post, and what went wrong if it did not arrive ──────────────────────────────

// What a failed test post means, in the operator's words, from Discord's own answer. A status names
// the fix; a pre-send problem is already worded by the notifier.
function testHint(type, entry) {
  if (entry.problem != null) return entry.problem;
  if (entry.reason === "rate-limited") return `Discord rate limited the bot — try again in ${entry.retryAfter ?? "a few"} seconds.`;
  if (entry.reason === "timeout") return "Discord did not answer in time — check the network, then try again.";
  switch (entry.status) {
    case 401: return `Discord rejected the bot token (401) — store the current one with \`${initHint(type)}\`.`;
    case 403: return `The bot may not post in channel ${entry.channelId} (403) — invite it to that server with the URL \`${initHint(type)}\` printed, and give it View Channel and Send Messages there.`;
    case 404: return `Discord knows no channel ${entry.channelId} that the bot can see (404) — check the id (Developer Mode → Copy Channel ID), and that the bot is in that server.`;
    default: return entry.status != null ? `Discord refused the post (status ${entry.status}).` : `The post failed (${entry.reason ?? "error"}).`;
  }
}

export const messagingTestCommand = {
  id: "messaging:test",
  input: TARGET_INPUT,

  // `ctx.env` / `ctx.fetch` are the seams a test drives; the store is the process's own global home.
  async run({ type, targetDir }, ctx = {}) {
    const { configPath, config } = await projectConfigOrRefuse(targetDir, "test");
    if (channelNamesOfType(config, type).length === 0) {
      throw commandError(`${type} is not enabled for this project — run \`${enableHint(type)}\` first.`, "messaging-not-enabled", 400);
    }
    const workspace = { config, projectRoot: path.dirname(path.dirname(configPath)) };
    const results = (await sendTestMessage(workspace, { type, ...(ctx.env ? { env: ctx.env } : {}), ...(ctx.fetch ? { fetch: ctx.fetch } : {}) }))
      .map((entry) => ({ ...entry, hint: entry.ok ? null : testHint(type, entry) }));
    const failed = results.filter((entry) => !entry.ok);
    if (failed.length > 0) {
      const lines = results.map((entry) => (entry.ok ? `  ${entry.channel} → ${entry.channelId}: posted` : `  ${entry.channel} → ${entry.channelId ?? "no channel id"}: not posted — ${entry.hint}`));
      throw commandError(`The ${labelOf(type)} test message did not reach ${failed.length === results.length ? "the channel" : `${failed.length} of ${results.length} channels`}:\n${lines.join("\n")}`, "messaging-test-failed", 502);
    }
    return { type, results };
  },

  cli: {
    route: ["messaging", "test"],
    spec: { usage: "aof messaging test <type>   (posts one test message to each of the project's channels of that type) [--json]", workspace: false },

    argv(positionals) {
      const type = channelTypeFrom(positionals, "test");
      refuseExtra(positionals, 1, "test");
      return { type, targetDir: process.cwd() };
    },

    render: ({ type, results }) => results.map((entry) => `Posted the ${labelOf(type)} test message to ${entry.channel} → ${entry.channelId}${entry.messageId ? ` (message ${entry.messageId})` : ""}.`).join("\n"),

    json: ({ type, results }) => ({ type, results: results.map(({ channel, channelId, ok, messageId, status, hint }) => ({ channel, channelId, ok, messageId, status, hint })) }),
  },
};
