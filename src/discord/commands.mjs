// src/discord/commands.mjs — THE SLASH COMMANDS (milestone 131 / story 11; ADR-009). Four commands —
// `/status`, `/asks`, `/loop stop` and `/loop resume` — registered per guild and answered in the bot
// process, each by a REGISTERED verb dispatched in-process: `work:list` for the two views, `work:loop`
// for the two actions. Nothing here starts a process: `/loop resume` hands the declaration to the
// supervisor through `work:loop`'s `handOff`, and the supervisor — the desktop app — relaunches it.
//
// THE ORDER is the contract (ADR-009 §4). Every interaction is DEFERRED first — the `type: 5`
// callback, before any config read or dispatch, well inside Discord's 3 s — and answered last by ONE
// edit of the original response. `/status` and `/asks` are views and defer ephemerally; the `/loop`
// subcommands steer a loop and answer where the channel can see who asked.
//
// WHO REACHES WHAT (ADR-009 §2-§3, §7). The workspaces COUNTED are the served ones whose `work.notify`
// has a discord channel with the interaction's `channel_id`; of those, the ones KEPT are those whose
// matched channel's `allow` holds the user. A DM names no project and is refused. A `/loop` command
// needs exactly one kept workspace: its `workspace` option names it by id or folder name, and several
// with no option is refused naming each candidate.
//
// The renders read `src/notify/form.mjs`, so a waiting row reads exactly as it does on the terminal
// and in a posted message's first line; a reply longer than Discord's 2,000 characters is clipped at a
// line boundary with `… and N more`.
import path from "node:path";
import { reportDegrade } from "../degrade.mjs";
import { accountLine, cost, headline } from "../notify/form.mjs";
import { findAskMessage } from "../notify/ask-messages.mjs";
import { STOP_STATES } from "../loop/stop-request.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";

const REPLY_MAX = 2000;
const EPHEMERAL = 64;
const DEFERRED_CHANNEL_MESSAGE = 5;
const APPLICATION_COMMAND = 2;
const SUB_COMMAND = 1;
const STRING = 3;
// DEFAULT DECISION (ADR-009 §1): the hourly re-registration pass.
export const REGISTER_INTERVAL_MS = 60 * 60 * 1000;

const WORKSPACE_OPTION = Object.freeze({ type: STRING, name: "workspace", description: "The project to address, by id or folder name, when this channel serves several", required: false });
const SCOPE_OPTION = Object.freeze({ type: STRING, name: "scope", description: "The loop's scope, as `aof work loop` takes it (e.g. 131 or 131-133)", required: true });

// THE TABLE (ADR-009 §1): what every guild an aof channel lives in is given, bulk-overwritten.
export const COMMANDS = Object.freeze([
  Object.freeze({ name: "status", type: 1, description: "What is in progress in this channel's projects", options: Object.freeze([WORKSPACE_OPTION]) }),
  Object.freeze({ name: "asks", type: 1, description: "The questions waiting on an answer in this channel's projects", options: Object.freeze([WORKSPACE_OPTION]) }),
  Object.freeze({
    name: "loop",
    type: 1,
    description: "Stop a loop, or hand a supervised one back to the supervisor",
    options: Object.freeze([
      Object.freeze({ type: SUB_COMMAND, name: "stop", description: "Ask the loop to stop: the first request drains, a second cancels the in-flight session", options: Object.freeze([SCOPE_OPTION, WORKSPACE_OPTION]) }),
      Object.freeze({ type: SUB_COMMAND, name: "resume", description: "Ask the supervisor to relaunch a supervised loop with --resume", options: Object.freeze([SCOPE_OPTION, WORKSPACE_OPTION]) }),
    ]),
  }),
]);
const TABLE_KEY = JSON.stringify(COMMANDS);

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const folderOf = (workspace) => path.basename(String(workspace?.projectRoot ?? ""));

function refusal(code, text) {
  return `${text} (${code})`;
}

// The discord channels of a workspace's config, as `[name, channel]` pairs.
function discordChannels(workspace) {
  const channels = workspace?.config?.work?.notify?.channels;
  if (!isPlainObject(channels)) return [];
  return Object.entries(channels).filter(([, channel]) => isPlainObject(channel) && channel.type === "discord");
}

// ── registration (ADR-009 §1) ───────────────────────────────────────────────────────────────────

// createRegistrar({ request, servedWorkspaces }) → { register(applicationId, { force }) } — one pass:
// each served discord channel's guild (`GET /channels/{id}`), each guild overwritten once with the
// table. A guild whose last successful overwrite carried the same table is skipped unless `force`.
export function createRegistrar({ request, servedWorkspaces }) {
  const registered = new Map();
  return {
    async register(applicationId, { force = false } = {}) {
      const channelIds = new Set();
      for (const workspace of await servedWorkspaces()) {
        for (const [, channel] of discordChannels(workspace)) if (typeof channel.channelId === "string") channelIds.add(channel.channelId);
      }
      const guilds = new Set();
      for (const channelId of channelIds) {
        const answer = await request("GET", `/channels/${channelId}`, null);
        const guild = answer?.ok ? answer.json?.guild_id : null;
        if (typeof guild !== "string") {
          reportDegrade("discord-command-register-failed", new Error(`the guild of channel ${channelId} could not be read (${answer?.status != null ? `status ${answer.status}` : answer?.reason ?? "error"}), so its commands were not registered`));
          continue;
        }
        guilds.add(guild);
      }
      for (const guild of guilds) {
        if (!force && registered.get(guild) === TABLE_KEY) continue;
        const answer = await request("PUT", `/applications/${applicationId}/guilds/${guild}/commands`, COMMANDS);
        if (answer?.ok) registered.set(guild, TABLE_KEY);
        else reportDegrade("discord-command-register-failed", new Error(`the commands of guild ${guild} could not be registered (${answer?.status != null ? `status ${answer.status}` : answer?.reason ?? "error"})`));
      }
    },
  };
}

// ── the answer to one interaction ───────────────────────────────────────────────────────────────

// The command, its subcommand and its string options, from the interaction's `data`.
function commandOf(data) {
  const top = Array.isArray(data?.options) ? data.options : [];
  const sub = top.find((option) => option?.type === SUB_COMMAND) ?? null;
  const options = {};
  for (const option of sub == null ? top : (Array.isArray(sub.options) ? sub.options : [])) {
    if (option?.type === STRING && typeof option.value === "string") options[option.name] = option.value;
  }
  return { name: data?.name ?? null, sub: sub?.name ?? null, options };
}

// clipReply(text) → at most 2,000 characters, cut at a line boundary with `… and N more`.
export function clipReply(text) {
  if (text.length <= REPLY_MAX) return text;
  const lines = text.split("\n");
  for (let keep = lines.length - 1; keep >= 0; keep -= 1) {
    const candidate = `${lines.slice(0, keep).join("\n")}\n… and ${lines.length - keep} more`;
    if (candidate.length <= REPLY_MAX) return candidate;
  }
  return `… and ${lines.length} more`;
}

// The envelope-shaped view `form.mjs` reads, for a row's ask.
function askView(row, nowMs) {
  const askedMs = Date.parse(row.ask?.askedAt ?? "");
  return {
    event: row.ask?.state === "parked" ? "session-parked-unanswered" : "session-needs-input",
    ref: row.ref,
    phase: row.ask?.phase ?? null,
    elapsedMs: Number.isFinite(askedMs) ? Math.max(0, nowMs - askedMs) : null,
    question: row.ask?.question ?? null,
  };
}

// statusLine(row, nowMs) → one in-progress row: its ref, its execution's state and node, and a waiting
// ask as `waiting on you (<phase>, <elapsed>)`.
export function statusLine(row, nowMs) {
  const parts = [row.ref];
  if (isPlainObject(row.ask) && (row.ask.state === "waiting" || row.ask.state === "parked")) {
    const view = askView(row, nowMs);
    const price = cost(view);
    return `${headline(view)}${price == null ? "" : ` ${price}`}`;
  }
  if (isPlainObject(row.execution) && typeof row.execution.state === "string") {
    const node = row.execution.nodeId ?? row.execution.node ?? null;
    parts.push(` — ${row.execution.state}${node == null ? "" : ` · ${node}`}`);
  }
  return parts.join("");
}

async function listOf(workspace, context) {
  return await context.invoke("work:list", { mesh: true }, { workspace });
}

async function renderStatus(workspaces, context, nowMs) {
  const sections = [];
  for (const workspace of workspaces) {
    let lines;
    try {
      const rows = (await listOf(workspace, context)).filter((row) => row?.status === "in-progress");
      lines = rows.length === 0 ? ["nothing in progress"] : rows.map((row) => statusLine(row, nowMs));
    } catch (error) {
      lines = [`could not read ${folderOf(workspace)}: ${error?.code ?? (error instanceof Error ? error.name : "error")}`];
    }
    sections.push([`**${folderOf(workspace)}**`, ...lines].join("\n"));
  }
  return sections.join("\n\n");
}

async function renderAsks(workspaces, context, nowMs, guildId) {
  const lines = [];
  for (const workspace of workspaces) {
    let rows;
    try {
      rows = (await listOf(workspace, context)).filter((row) => row?.ask?.state === "waiting" || row?.ask?.state === "parked");
    } catch (error) {
      lines.push(`could not read ${folderOf(workspace)}: ${error?.code ?? (error instanceof Error ? error.name : "error")}`);
      continue;
    }
    for (const row of rows) {
      lines.push(accountLine(askView(row, nowMs)));
      const posted = await findAskMessage({ workspaceId: resolveWorkspaceId(workspace), ref: row.ref });
      if (posted != null && typeof guildId === "string") lines.push(`https://discord.com/channels/${guildId}/${posted.channelId}/${posted.messageId}`);
    }
  }
  return lines.length === 0 ? "no questions waiting" : lines.join("\n");
}

// A verb's refusal, whether answered as a value (`{ ok: false, code, message }`) or thrown coded.
async function dispatchLoop(context, input, workspace) {
  try {
    const answer = await context.invoke("work:loop", input, { workspace });
    if (answer?.ok === false) return { refused: true, code: answer.code, message: answer.message };
    return { refused: false, answer };
  } catch (error) {
    if (typeof error?.code !== "string") throw error;
    return { refused: true, code: error.code, message: error.message };
  }
}

// The level sentence of a stop, from 130's answer.
function stopSentence(answer) {
  if (answer?.state === STOP_STATES.honoured) return "not running — marked stopped; /loop resume clears it";
  if (answer?.request === "cancel") return "cancelling the in-flight session";
  return "draining (a second /loop stop cancels the in-flight session)";
}

async function answerLoop(command, kept, user, context) {
  const scope = command.options.scope;
  let targets = kept;
  if (typeof command.options.workspace === "string") {
    const wanted = command.options.workspace;
    targets = kept.filter((workspace) => resolveWorkspaceId(workspace) === wanted || folderOf(workspace) === wanted);
  }
  if (targets.length !== 1) {
    const names = kept.map(folderOf).join(", ");
    return refusal("discord-scope-ambiguous", targets.length === 0
      ? `No project here is named ${command.options.workspace} — pick one of ${names} with \`workspace:\``
      : `This channel reaches several projects — pick one of ${names} with \`workspace:\``);
  }
  const [workspace] = targets;
  const who = `@${user.username}`;
  if (command.sub === "stop") {
    const result = await dispatchLoop(context, { scope, stop: true }, workspace);
    if (result.refused) return `/loop stop ${scope} was refused (${result.code}): ${result.message}`;
    return `${who} asked ${scope} to stop — ${stopSentence(result.answer)}`;
  }
  const result = await dispatchLoop(context, { scope, handOff: true }, workspace);
  if (result.refused) return `/loop resume ${scope} was refused (${result.code}): ${result.message}`;
  return `${who} handed ${scope} to the supervisor — it relaunches with --resume on its next poll`;
}

// The reply to one deferred command (everything after the deferral).
async function answerCommand(interaction, command, context) {
  const user = interaction.member?.user;
  if (!isPlainObject(interaction.member) || !isPlainObject(user)) {
    return refusal("discord-command-dm", "aof's commands answer in a project channel, not in a direct message");
  }
  const counted = [];
  for (const workspace of await context.servedWorkspaces()) {
    const match = discordChannels(workspace).find(([, channel]) => channel.channelId === interaction.channel_id);
    if (match != null) counted.push({ workspace, channel: match[1], name: match[0] });
  }
  if (counted.length === 0) return "This channel is not an aof project channel — enable one with `aof messaging enable discord --channel <id>`.";
  const kept = counted.filter(({ channel }) => Array.isArray(channel.allow) && channel.allow.includes(user.id)).map(({ workspace }) => workspace);
  if (kept.length === 0) {
    const keys = [...new Set(counted.map(({ name }) => `work.notify.channels.${name}.allow`))].join(", ");
    return refusal("discord-command-not-allowed", `You are not on the answer list of any project in this channel (\`${keys}\`) — nothing was run`);
  }
  const nowMs = context.now().getTime();
  if (command.name === "loop") return answerLoop(command, kept, user, context);
  let views = kept;
  if (typeof command.options.workspace === "string") {
    views = kept.filter((workspace) => resolveWorkspaceId(workspace) === command.options.workspace || folderOf(workspace) === command.options.workspace);
    if (views.length === 0) return refusal("discord-scope-ambiguous", `No project here is named ${command.options.workspace} — the projects are ${kept.map(folderOf).join(", ")}`);
  }
  if (command.name === "status") return renderStatus(views, context, nowMs);
  return renderAsks(views, context, nowMs, interaction.guild_id);
}

// handleInteraction(interaction, context) → the reply's content. `context` is the bot's:
// `{ request, invoke, servedWorkspaces, now }`. The deferral is sent FIRST; the one edit of the
// original response is sent LAST, whatever happened between.
export async function handleInteraction(interaction, context) {
  if (interaction?.type !== APPLICATION_COMMAND) return null;
  const command = commandOf(interaction.data);
  const ephemeral = command.name !== "loop" || !isPlainObject(interaction.member);
  await context.request("POST", `/interactions/${interaction.id}/${interaction.token}/callback`, {
    type: DEFERRED_CHANNEL_MESSAGE,
    ...(ephemeral ? { data: { flags: EPHEMERAL } } : {}),
  });
  let content;
  try {
    content = await answerCommand(interaction, command, context);
  } catch (error) {
    content = `/${[command.name, command.sub].filter(Boolean).join(" ")} failed (${error?.code ?? (error instanceof Error ? error.name : "error")}).`;
  }
  const clipped = clipReply(content);
  await context.request("PATCH", `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    content: clipped,
    allowed_mentions: { parse: [] },
  });
  return clipped;
}
