// messaging:init / messaging:enable / messaging:disable / messaging:status — `aof messaging`, the
// one way a notify channel's webhook enters aof and the per-project switch that turns it on
// (milestone 131 / story 08; ADR-005 §1, as amended at 131/08). One module registers the four, as
// `mesh/desktop.mjs` registers its verbs: they are one surface, and the channel TYPE is a
// positional, so a second type is a `CHANNELS` entry and a store file, never a new verb.
//
//   init <type>     — machine-wide. Reads the URL from a hidden prompt (a TTY) or the first line
//                     of stdin, checks it with the type's `accepts`, and stores it through
//                     `writeMessagingSecret` (`src/notify/secret.mjs`, the store's ONE home). It
//                     needs no project and writes nothing in one.
//   enable <type>   — per project. Adds `work.notify.channels.<type> = { type }` to the project's
//   disable <type>    `.aof/aof.config.json`; disable removes every channel of the type. Both go
//                     through `readConfig`/`writeConfig` (`src/work/delegation.mjs`) and change no
//                     key outside `work.notify`. No write ever carries a `url`, `webhook` or
//                     `token` key (FF-13106).
//   status          — per type: stored on this machine, the env override set, enabled here. It
//                     asks the store only whether a URL is present, and never reads an env var's
//                     value into its answer.
//
// THE ARGV RULE. argv lands in shell history and the process list, so the URL never arrives by
// argv: any positional after the type — or a URL-looking type — is refused
// `messaging-secret-in-argv` before any read or write, and no refusal ever repeats what it refused.
// `--url=<value>` is refused by the face's own `parseSpecArgv` as an unknown flag, which names the
// flag and never its value.
//
// PROMPTING IS A FACE CONCERN (the `promptOrchestratorModel` precedent): the async argv adapter
// reads the URL — through an injectable `{ stdin, isTTY, promptSecret }` seam, so the TTY path is
// driven with a fake prompt — and hands `run()` an input no face prints. `run()` stays headless.
import { existsSync } from "node:fs";
import { commandError } from "../../command-error.mjs";
import { CHANNELS, DEFAULT_URL_ENV } from "../../notify/notify.mjs";
import { messagingSecretPath, messagingSecretPresent, writeMessagingSecret } from "../../notify/secret.mjs";
import { readConfig, writeConfig } from "../../work/delegation.mjs";

const TYPES = Object.freeze(Object.keys(CHANNELS));
const KNOWN = TYPES.join(", ");
// A word that could be a channel type is safe to name back; anything else is not repeated.
const TYPE_WORD = /^[a-z][a-z0-9-]{0,31}$/u;
const URL_LIKE = /[:/]/u;
const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const nonBlank = (value) => typeof value === "string" && value.trim().length > 0;

const labelOf = (type) => CHANNELS[type]?.label ?? type;
const initHint = (type) => `aof messaging init ${type}`;

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

// Every verb points at `init`, the one door the URL enters by: only it prompts or reads stdin.
function secretInArgv() {
  return commandError(
    "The webhook URL is never read from the command line — argv lands in shell history and the process list. Run `aof messaging init <type>` and paste the URL at the prompt, or pipe it on stdin.",
    "messaging-secret-in-argv",
    400,
  );
}

function refuseExtra(positionals, from, verb) {
  if (positionals.length > from) {
    throw commandError(`\`aof messaging ${verb}\` takes ${from === 0 ? "no argument" : "only the channel type"} — the extra argument was not read.`, "messaging-unexpected-argument", 400);
  }
}

// ── init: the URL's one door ───────────────────────────────────────────────────────────────────

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

// readSecretInput(type, seams) → the URL as typed or piped, trimmed. Never printed.
async function readSecretInput(type, { stdin, isTTY, promptSecret } = defaultSecretSeams()) {
  const raw = isTTY ? await promptSecret({ message: `${labelOf(type)} webhook URL:` }) : await readFirstLine(stdin);
  return typeof raw === "string" ? raw.trim() : "";
}

export const messagingInitCommand = {
  id: "messaging:init",
  input: {
    type: "object",
    properties: { type: { type: "string" }, url: { type: "string" } },
    required: ["type", "url"],
    additionalProperties: false,
  },

  async run(input) {
    const { type, url } = input;
    if (!Object.hasOwn(CHANNELS, type)) {
      throw commandError(`That is not a messaging channel type — the known type is ${KNOWN}.`, "messaging-unknown-channel", 400);
    }
    if (!nonBlank(url)) {
      throw commandError(`No ${labelOf(type)} webhook URL was given — nothing was stored.`, "messaging-url-empty", 400);
    }
    if (!CHANNELS[type].accepts(url.trim())) {
      throw commandError(`That is not a ${labelOf(type)} webhook URL (https, a ${labelOf(type)} host, /api/webhooks/<id>/<token>) — nothing was stored.`, "messaging-url-invalid", 400);
    }
    const written = await writeMessagingSecret(type, url.trim());
    return { type, path: written.path, replaced: written.replaced };
  },

  cli: {
    route: ["messaging", "init"],
    spec: {
      usage: "aof messaging init <type>   (the URL is read from a hidden prompt or stdin, never argv) [--json]",
      workspace: false,
    },

    // ASYNC by design: the URL is read HERE, before invoke, from the prompt or stdin.
    async argv(positionals, _options, seams = defaultSecretSeams()) {
      if (positionals[0] !== undefined && positionals.length > 1) throw secretInArgv();
      const type = channelTypeFrom(positionals, "init");
      return { type, url: await readSecretInput(type, seams) };
    },

    render: (result) => [
      `${result.replaced ? "Replaced" : "Stored"} the ${labelOf(result.type)} webhook for this machine at ${result.path}.`,
      `Switch it on per project with \`aof messaging enable ${result.type}\`.`,
    ].join("\n"),

    json: ({ type, path, replaced }) => ({ type, path, replaced }),
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

const noWebhookLine = (type) => `No webhook is stored on this machine yet — run \`${initHint(type)}\`.`;

const TARGET_INPUT = Object.freeze({
  type: "object",
  properties: { type: { type: "string" }, targetDir: { type: "string" } },
  required: ["type", "targetDir"],
  additionalProperties: false,
});

function switchArgv(verb) {
  return (positionals) => {
    const type = channelTypeFrom(positionals, verb);
    refuseExtra(positionals, 1, verb);
    return { type, targetDir: process.cwd() };
  };
}

const switchJson = ({ notes, ...rest }) => rest;

export const messagingEnableCommand = {
  id: "messaging:enable",
  input: TARGET_INPUT,

  async run({ type, targetDir }) {
    const { configPath, config } = await projectConfigOrRefuse(targetDir, "enable");
    const stored = await messagingSecretPresent(type);
    const notes = [];
    const existing = channelNamesOfType(config, type);
    let channels = existing;
    let changed = false;
    if (existing.length > 0) {
      notes.push(`${type} is already enabled for this project (${existing.map((name) => `"${name}"`).join(", ")}) — nothing changed.`);
    } else {
      if (!isPlainObject(config.work)) config.work = {};
      if (!isPlainObject(config.work.notify)) config.work.notify = { channels: {} };
      if (!isPlainObject(config.work.notify.channels)) config.work.notify.channels = {};
      let name = type;
      for (let n = 2; Object.hasOwn(config.work.notify.channels, name); n += 1) name = `${type}-${n}`;
      config.work.notify.channels[name] = { type };
      await writeConfig(configPath, config);
      channels = [name];
      changed = true;
      notes.push(`Enabled ${type} for this project in ${configPath}.`);
    }
    if (!stored) notes.push(noWebhookLine(type));
    return { type, configPath, changed, channels, stored, notes };
  },

  cli: {
    route: ["messaging", "enable"],
    spec: { usage: "aof messaging enable <type> [--json]", workspace: false },
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
      const first = names.length > 0 ? config.work.notify.channels[names[0]] : null;
      const name = typeof first?.urlEnv === "string" ? first.urlEnv : DEFAULT_URL_ENV;
      channels.push({
        type,
        stored: await messagingSecretPresent(type),
        path: messagingSecretPath(type),
        envOverride: { name, set: nonBlank(env[name]) },
        project: inProject ? { enabled: names.length > 0, channels: names } : null,
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
      `  this project: ${entry.project == null ? "no project here" : entry.project.enabled ? `enabled (${entry.project.channels.join(", ")})` : "disabled"}`,
    ].join("\n")).join("\n\n"),

    json: ({ channels }) => ({ channels }),
  },
};
