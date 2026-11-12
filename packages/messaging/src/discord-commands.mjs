import path from "node:path";
import { accountLine, cost, formatElapsed, headline } from "./form.mjs";

// Core supplies configured application services; construction performs no I/O.
export function createDiscordCommands({ reportDegrade, findAskMessage, STOP_STATES, resolveWorkspaceId, hasLoopOnDefault }) {
// src/discord/commands.mjs — THE SLASH COMMANDS (milestone 131 / story 11, ADR-009; milestone 191 /
// story 06, 191/ADR-006). `/status`, `/asks`, `/loop stop|resume|start` and `/session start|list|end`
// — registered per guild and answered in the bot process, each by a REGISTERED verb dispatched
// in-process: `work:list` for the two views, `work:loop` for the loop's three actions, and
// `mesh:session-start`, `mesh:session-list` and `mesh:session-end` for a session (`mesh:status` only
// offers the live nodes while typing). Nothing here starts a process: `/loop resume` and `/loop start`
// hand the loop to the supervisor through `work:loop`'s `handOff` and `startHandOff`, and the
// supervisor — the desktop app — launches it; `/session start` is a directive the node acts on.
//
// THE ORDER is the contract (ADR-009 §4). Every COMMAND is DEFERRED first — the `type: 5`
// callback, before any config read or dispatch, well inside Discord's 3 s — and answered last by ONE
// edit of the original response. A VIEW is private and an ACTION is attributed: the commands in
// `IN_CHANNEL` steer something and answer where the channel can see who asked, and every other one
// defers ephemerally — `/session start` among them, because its reply carries the link that opens
// the session (operator, 191/06 Q1).
//
// WHO REACHES WHAT (ADR-009 §2-§3, §7). The workspaces COUNTED are the served ones whose `work.notify`
// has a discord channel with the interaction's `channel_id`; of those, the ones KEPT are those whose
// matched channel's `allow` holds the user. A DM names no project and is refused. A `/loop` command
// needs exactly one kept workspace: its `project` option names it by id or folder name, and several
// with no option is refused naming each candidate.
//
// PICKED, NOT TYPED (191/05, ADR-006 §1-§3). Every command's project option is `project`, with
// `autocomplete: true`. An AUTOCOMPLETE interaction (type 4) is not a command: it is never deferred
// (Discord allows none) and is answered at once with a type 8 callback. `project` offers the KEPT
// workspaces and dispatches no verb; `node`, `item` and `session` each read their own source — the
// live nodes of `mesh:status`, the project's in-progress rows of `work:list`, the live sessions of
// `mesh:session-list` — and only ever in a KEPT workspace, the same allowlist that guards the
// command, so nothing is offered that the user could not then address. A DM, an unserved channel or
// a stranger gets `[]`, never a refusal. Autocomplete only suggests: the command still resolves what
// arrives.
//
// The renders read `src/notify/form.mjs`, so a waiting row reads exactly as it does on the terminal
// and in a posted message's first line; a reply longer than Discord's 2,000 characters is clipped at a
// line boundary with `… and N more`.

const REPLY_MAX = 2000;
const EPHEMERAL = 64;
const DEFERRED_CHANNEL_MESSAGE = 5;
const APPLICATION_COMMAND = 2;
const SUB_COMMAND = 1;
const STRING = 3;
const AUTOCOMPLETE = 4;
const AUTOCOMPLETE_RESULT = 8;
// Discord's own ceiling on an autocomplete answer.
const MAX_CHOICES = 25;
// DEFAULT DECISION (ADR-009 §1): the hourly re-registration pass.
const REGISTER_INTERVAL_MS = 60 * 60 * 1000;
// DEFAULT DECISION (191/ADR-003 §3): how long `/session start` watches for the session's link — well
// inside the 15 minutes a deferred interaction's token lives.
const SESSION_WAIT_MS = 45_000;

const PROJECT_OPTION = Object.freeze({ type: STRING, name: "project", description: "The project to address, picked from the ones this channel serves you", required: false, autocomplete: true });
const SCOPE_OPTION = Object.freeze({ type: STRING, name: "scope", description: "The loop's scope, as `aof work loop` takes it (e.g. 131 or 131-133)", required: true });
// 191/ADR-006 §3: the options of the session commands. A start NEEDS its project; Discord lists a
// required option before the optional ones.
const START_PROJECT_OPTION = Object.freeze({ ...PROJECT_OPTION, description: "The project to start Claude in, picked from the ones this channel serves you", required: true });
const NODE_OPTION = Object.freeze({ type: STRING, name: "node", description: "The node to start it on, picked from the live ones (default: this control node)", required: false, autocomplete: true });
const ITEM_OPTION = Object.freeze({ type: STRING, name: "item", description: "A work item in progress in the project, to start the session on", required: false, autocomplete: true });
const SESSION_OPTION = Object.freeze({ type: STRING, name: "session", description: "The session to end, picked from the live ones in this channel's projects", required: true, autocomplete: true });

// THE TABLE (ADR-009 §1): what every guild an aof channel lives in is given, bulk-overwritten.
const COMMANDS = Object.freeze([
  Object.freeze({ name: "status", type: 1, description: "What is in progress in this channel's projects", options: Object.freeze([PROJECT_OPTION]) }),
  Object.freeze({ name: "asks", type: 1, description: "The questions waiting on an answer in this channel's projects", options: Object.freeze([PROJECT_OPTION]) }),
  Object.freeze({
    name: "loop",
    type: 1,
    description: "Stop a loop, hand a supervised one back to the supervisor, or ask it to start a new one",
    options: Object.freeze([
      Object.freeze({ type: SUB_COMMAND, name: "stop", description: "Ask the loop to stop: the first request drains, a second cancels the in-flight session", options: Object.freeze([SCOPE_OPTION, PROJECT_OPTION]) }),
      Object.freeze({ type: SUB_COMMAND, name: "resume", description: "Ask the supervisor to relaunch a supervised loop with --resume", options: Object.freeze([SCOPE_OPTION, PROJECT_OPTION]) }),
      Object.freeze({ type: SUB_COMMAND, name: "start", description: "Ask the supervisor to start a new supervised loop on a scope", options: Object.freeze([SCOPE_OPTION, PROJECT_OPTION]) }),
    ]),
  }),
  Object.freeze({
    name: "session",
    type: 1,
    description: "Start Claude in a project and open it from your phone, or see and end the sessions running",
    options: Object.freeze([
      Object.freeze({ type: SUB_COMMAND, name: "start", description: "Start Claude with Remote Control in a project; only you see the link that opens it", options: Object.freeze([START_PROJECT_OPTION, NODE_OPTION, ITEM_OPTION]) }),
      Object.freeze({ type: SUB_COMMAND, name: "list", description: "The live sessions in this channel's projects, each with its node and age", options: Object.freeze([PROJECT_OPTION]) }),
      Object.freeze({ type: SUB_COMMAND, name: "end", description: "End a live session; the channel sees who ended it", options: Object.freeze([SESSION_OPTION]) }),
    ]),
  }),
]);
const TABLE_KEY = JSON.stringify(COMMANDS);
// WHERE A COMMAND ANSWERS (ADR-009 §4, 191/ADR-006 §4), keyed `<command> <subcommand>`: the ones that
// steer something, attributed in the channel. Every command not named here is answered privately.
const IN_CHANNEL = Object.freeze(["loop stop", "loop resume", "loop start", "session end"]);

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
function createRegistrar({ request, servedWorkspaces }) {
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
  let focused = null;
  for (const option of sub == null ? top : (Array.isArray(sub.options) ? sub.options : [])) {
    if (option?.type === STRING && typeof option.value === "string") options[option.name] = option.value;
    if (option?.focused === true) focused = { name: option.name, value: typeof option.value === "string" ? option.value : "" };
  }
  return { name: data?.name ?? null, sub: sub?.name ?? null, options, focused };
}

// clipReply(text) → at most 2,000 characters, cut at a line boundary with `… and N more`.
function clipReply(text) {
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
function statusLine(row, nowMs) {
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
      // An in-progress row, or ANY row whose ask waits or is parked: a lane's story reads
      // `not-started` in the primary until its lane merges, and its waiting ask is exactly what
      // /status must show (found at 131/07's live run, F-131-11).
      const rows = (await listOf(workspace, context)).filter((row) => row?.status === "in-progress" || row?.ask?.state === "waiting" || row?.ask?.state === "parked");
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

// settle(run) → a verb's answer or its refusal, whether the refusal was answered as a value
// (`{ ok: false, code, … }`, kept as `answer`) or thrown coded. An uncoded throw is not a refusal.
async function settle(run) {
  try {
    const answer = await run();
    if (answer?.ok === false) return { refused: true, code: answer.code, message: answer.message ?? null, answer };
    return { refused: false, answer };
  } catch (error) {
    if (typeof error?.code !== "string") throw error;
    return { refused: true, code: error.code, message: error.message, answer: null };
  }
}

const dispatchLoop = (context, input, workspace) => settle(() => context.invoke("work:loop", input, { workspace }));

// The level sentence of a stop, from 130's answer.
function stopSentence(answer) {
  if (answer?.state === STOP_STATES.honoured) return "not running — marked stopped; /loop resume clears it";
  if (answer?.request === "cancel") return "cancelling the in-flight session";
  return "draining (a second /loop stop cancels the in-flight session)";
}

// The kept workspaces a typed `project` names: by workspace id, then by folder name.
function named(kept, wanted) {
  return kept.filter((workspace) => resolveWorkspaceId(workspace) === wanted || folderOf(workspace) === wanted);
}

async function answerLoop(command, kept, user, context) {
  const scope = command.options.scope;
  let targets = kept;
  if (typeof command.options.project === "string") {
    const wanted = command.options.project;
    targets = named(kept, wanted);
    if (targets.length === 0) {
      return refusal("discord-scope-ambiguous", `No project here is named ${wanted} — pick one of ${kept.map(folderOf).join(", ")} with \`project:\``);
    }
  } else if (kept.length > 1 && command.sub !== "start") {
    // ONE CHANNEL, SEVERAL PROJECTS (operator, 07's live run): the scope names a loop, and only a
    // project that has one on it can mean it. The one project with a loop on the scope is taken;
    // `project:` is asked for only when two projects both have one. A START is the exception: the
    // scope it names has usually never run, so no loop can say which project is meant.
    const hasLoopOn = context.hasLoopOn ?? hasLoopOnDefault;
    const flags = await Promise.all(kept.map((workspace) => hasLoopOn(workspace, scope).catch(() => false)));
    targets = kept.filter((_, index) => flags[index]);
    if (targets.length === 0) {
      return refusal("discord-loop-not-found", `No project in this channel has a loop on scope ${scope} — the projects are ${kept.map(folderOf).join(", ")}`);
    }
  }
  if (targets.length !== 1) {
    return refusal("discord-scope-ambiguous", command.sub === "start"
      ? `This channel serves several projects — pick the one to start ${scope} in with \`project:\`: ${targets.map(folderOf).join(", ")}`
      : `Several projects in this channel have a loop on scope ${scope} — pick one of ${targets.map(folderOf).join(", ")} with \`project:\``);
  }
  const [workspace] = targets;
  const who = `@${user.username}`;
  if (command.sub === "start") {
    // 191/ADR-005: the bot only asks. The verb writes the start request, and the supervisor starts it.
    const result = await dispatchLoop(context, { scope, startHandOff: true }, workspace);
    if (!result.refused) return `${who} asked the supervisor to start ${scope} — it starts on its next poll`;
    // The verb's own sentence names the terminal's spelling; the channel is given the command's.
    if (result.code === "loop-start-resumable") return `/loop start ${scope} was refused (${result.code}): ${scope} has a halted supervised loop, and a fresh start would reset its budget — resume it with \`/loop resume scope:${scope}\``;
    return `/loop start ${scope} was refused (${result.code}): ${result.message}`;
  }
  if (command.sub === "stop") {
    const result = await dispatchLoop(context, { scope, stop: true }, workspace);
    if (result.refused) return `/loop stop ${scope} was refused (${result.code}): ${result.message}`;
    return `${who} asked ${scope} to stop — ${stopSentence(result.answer)}`;
  }
  const result = await dispatchLoop(context, { scope, handOff: true }, workspace);
  if (result.refused) return `/loop resume ${scope} was refused (${result.code}): ${result.message}`;
  return `${who} handed ${scope} to the supervisor — it relaunches with --resume on its next poll`;
}

// ── the session commands (191/06, 191/ADR-006 §3-§4) ────────────────────────────────────────────

// liveSessions(workspaces, context) → one `{ workspace, sessions, code }` per project: its live
// sessions as `mesh:session-list` answers them, or the `code` its read failed with. Each project is
// asked about by its own id and never unscoped, so a project the user may not address is never read.
async function liveSessions(workspaces, context) {
  const read = [];
  for (const workspace of workspaces) {
    try {
      const answer = await context.invoke("mesh:session-list", { project: resolveWorkspaceId(workspace) }, { workspace });
      read.push({ workspace, sessions: Array.isArray(answer?.sessions) ? answer.sessions : [], code: null });
    } catch (error) {
      read.push({ workspace, sessions: [], code: error?.code ?? (error instanceof Error ? error.name : "error") });
    }
  }
  return read;
}

// sessionLine(session, nowMs) → `<name> — <node> · <age>`: the age since its start when its presence
// states one, else `last seen <elapsed> ago` from its last ping — the verb's own fallback on the
// terminal. Neither stated, the line carries no time: one is never invented.
function sessionLine(session, nowMs) {
  const since = (instant) => {
    const ms = Date.parse(instant ?? "");
    return Number.isFinite(ms) ? formatElapsed(Math.max(0, nowMs - ms)) : null;
  };
  const age = since(session?.startedAt);
  const seen = age == null ? since(session?.lastPingAt) : null;
  return `${session.name} — ${session.nodeId}${age != null ? ` · ${age}` : seen != null ? ` · last seen ${seen} ago` : ""}`;
}

async function renderSessions(workspaces, context, nowMs) {
  const sections = [];
  for (const { workspace, sessions, code } of await liveSessions(workspaces, context)) {
    const lines = code != null
      ? [`could not read ${folderOf(workspace)}: ${code}`]
      : sessions.length === 0 ? ["no live sessions"] : sessions.map((session) => sessionLine(session, nowMs));
    sections.push([`**${folderOf(workspace)}**`, ...lines].join("\n"));
  }
  return sections.join("\n\n");
}

// `/session start`: the verb starts it and waits for the link; the reply says where to open it.
async function answerSessionStart(command, counted, kept, context) {
  const wanted = command.options.project;
  let targets = kept;
  if (typeof wanted === "string") {
    targets = named(kept, wanted);
    if (targets.length === 0) {
      // A project this channel serves but this user is not listed on is refused as such, by name.
      const barred = counted.find(({ workspace }) => named([workspace], wanted).length > 0);
      if (barred != null) return refusal("discord-command-not-allowed", `You are not on the answer list of ${folderOf(barred.workspace)} (\`work.notify.channels.${barred.name}.allow\`) — nothing was started`);
      return refusal("discord-scope-ambiguous", `No project here is named ${wanted} — the projects are ${kept.map(folderOf).join(", ")}`);
    }
  }
  if (targets.length !== 1) return refusal("discord-scope-ambiguous", `Pick the project to start Claude in with \`project:\` — one of ${targets.map(folderOf).join(", ")}`);
  const [workspace] = targets;
  const { node, item } = command.options;
  const input = {
    project: resolveWorkspaceId(workspace),
    ...(typeof node === "string" ? { node } : {}),
    ...(typeof item === "string" ? { item } : {}),
    waitMs: SESSION_WAIT_MS,
  };
  const result = await settle(() => context.invoke("mesh:session-start", input, { workspace }));
  const started = result.answer ?? {};
  const project = `**${folderOf(workspace)}**`;
  if (result.refused) {
    // The verb's own sentence when it refused before the push; the node's code when the node did.
    const why = result.message ?? `${started.nodeId ?? "the node"} refused it before it began`;
    return `The session in ${project} was not started (${result.code}): ${why}`;
  }
  const where = `${started.nodeId ?? node ?? "this control node"} in ${project}${started.item ? `, on ${started.item}` : ""}`;
  if (typeof started.link === "string" && started.link.length > 0) return `Claude started on ${where}: ${started.link}`;
  // No link is not a failure (191/ADR-003 §4): the session is named, with the path to it in the app.
  return `Claude started on ${where}, with no link yet. Open the Claude app, tap **Code**, and find ${started.name ? `**${started.name}**` : "the session"} there.`;
}

// `/session end`: only a live session of a KEPT project is ended — the verb itself would end any.
async function answerSessionEnd(command, counted, kept, user, context) {
  const wanted = String(command.options.session ?? "").trim();
  const read = await liveSessions(kept, context);
  const live = read.flatMap(({ workspace, sessions }) => sessions.map((session) => ({ ...session, workspace })));
  // The id is the address — what the picker sends — so an exact id wins over a name.
  const byId = live.filter((session) => session.sessionId === wanted);
  const matches = byId.length > 0 ? byId : live.filter((session) => session.name === wanted);
  if (matches.length === 0) {
    const unread = read.filter(({ code }) => code != null);
    if (unread.length > 0) return `/session end could not read the live sessions of ${unread.map(({ workspace }) => folderOf(workspace)).join(", ")} (${unread[0].code}) — nothing was ended`;
    // The projects this user is not listed on were never read, so a session of theirs is a miss here.
    if (kept.length < counted.length) return refusal("discord-command-not-allowed", `No live session called ${wanted} is in a project you may address in this channel — nothing was ended`);
    return refusal("discord-session-not-found", `No live session is called ${wanted} in this channel's projects — \`/session list\` shows the live ones`);
  }
  if (matches.length > 1) return refusal("discord-session-ambiguous", `More than one live session is called ${wanted} — pick it from the ones \`/session end\` offers`);
  const [session] = matches;
  const result = await settle(() => context.invoke("mesh:session-end", { session: session.sessionId }, { workspace: session.workspace }));
  if (result.refused && result.answer == null) return `/session end ${session.name} was refused (${result.code}): ${result.message}`;
  const answer = result.answer ?? {};
  const name = answer.name ?? session.name;
  const node = answer.nodeId ?? session.nodeId;
  const who = `@${user.username}`;
  if (answer.ended === true) return `${who} ended ${name} on ${node}`;
  // The request was sent and the end is not confirmed: said as that, never as an end.
  const seen = answer.listed === false ? `${node}'s presence could not be read to confirm it` : `${name} is still listed`;
  return `${who} asked ${node} to end ${name} — the request was sent, but ${seen}${answer.code ? ` (${answer.code})` : ""}. \`/session list\` shows whether it went.`;
}

// reach(interaction, context) → who the interaction reaches, read ONCE (each served workspace loaded
// once): `{ dm: true }` for a direct message, else `{ user, counted, kept }` — COUNTED the served
// workspaces whose discord channel is this one, KEPT those whose matched channel's `allow` holds the
// user (ADR-009 §2-§3). The command and the autocomplete both read it, so an offer never names a
// project the command would then refuse.
async function reach(interaction, context) {
  const user = interaction.member?.user;
  if (!isPlainObject(interaction.member) || !isPlainObject(user)) return { dm: true };
  const counted = [];
  for (const workspace of await context.servedWorkspaces()) {
    const match = discordChannels(workspace).find(([, channel]) => channel.channelId === interaction.channel_id);
    if (match != null) counted.push({ workspace, channel: match[1], name: match[0] });
  }
  const kept = counted.filter(({ channel }) => Array.isArray(channel.allow) && channel.allow.includes(user.id)).map(({ workspace }) => workspace);
  return { dm: false, user, counted, kept };
}

// The reply to one deferred command (everything after the deferral).
async function answerCommand(interaction, command, context) {
  const { dm, user, counted, kept } = await reach(interaction, context);
  if (dm) return refusal("discord-command-dm", "aof's commands answer in a project channel, not in a direct message");
  if (counted.length === 0) return "This channel is not an aof project channel — enable one with `aof messaging enable discord --channel <id>`.";
  if (kept.length === 0) {
    const keys = [...new Set(counted.map(({ name }) => `work.notify.channels.${name}.allow`))].join(", ");
    return refusal("discord-command-not-allowed", `You are not on the answer list of any project in this channel (\`${keys}\`) — nothing was run`);
  }
  const nowMs = context.now().getTime();
  if (command.name === "loop") return answerLoop(command, kept, user, context);
  if (command.name === "session" && command.sub === "start") return answerSessionStart(command, counted, kept, context);
  if (command.name === "session" && command.sub === "end") return answerSessionEnd(command, counted, kept, user, context);
  let views = kept;
  if (typeof command.options.project === "string") {
    views = named(kept, command.options.project);
    if (views.length === 0) return refusal("discord-scope-ambiguous", `No project here is named ${command.options.project} — the projects are ${kept.map(folderOf).join(", ")}`);
  }
  if (command.name === "status") return renderStatus(views, context, nowMs);
  if (command.name === "session") return renderSessions(views, context, nowMs);
  return renderAsks(views, context, nowMs, interaction.guild_id);
}

// rank(choices, typed) → at most 25 of them, case ignored: those whose name starts with what was
// typed, then those that merely contain it, each group in the order given.
function rank(choices, typed) {
  const needle = String(typed ?? "").toLowerCase();
  const prefixed = [];
  const containing = [];
  for (const choice of choices) {
    const folded = choice.name.toLowerCase();
    if (folded.startsWith(needle)) prefixed.push(choice);
    else if (folded.includes(needle)) containing.push(choice);
  }
  return [...prefixed, ...containing].slice(0, MAX_CHOICES);
}

// projectChoices(kept, typed) → `{ name: <folder>, value: <workspaceId> }` per kept project, ranked.
function projectChoices(kept, typed) {
  const choices = [];
  for (const workspace of kept) {
    const name = folderOf(workspace);
    const value = resolveWorkspaceId(workspace);
    if (name !== "" && typeof value === "string") choices.push({ name, value });
  }
  return rank(choices, typed);
}

// A choice whose name is its own value, for each string given.
const namedChoices = (values) => values.filter((value) => typeof value === "string" && value.length > 0).map((value) => ({ name: value, value }));

// choicesOf(command, kept, context) → what the focused option offers, each from its own source
// (191/ADR-006 §2-§3) and only ever read in a KEPT project. An option with no source offers nothing.
async function choicesOf(command, kept, context) {
  const { name, value } = command.focused;
  if (name === PROJECT_OPTION.name) return projectChoices(kept, value);
  if (kept.length === 0) return [];
  if (name === SESSION_OPTION.name) {
    // Shown by the ADR-002 name; the value is the session's id, its one unambiguous address.
    const sessions = (await liveSessions(kept, context)).flatMap((entry) => entry.sessions);
    return rank(sessions.filter((session) => typeof session?.name === "string" && typeof session.sessionId === "string").map((session) => ({ name: session.name, value: session.sessionId })), value);
  }
  // `node` and `item` are read in the ONE project the command names so far, else the only kept one.
  const picked = typeof command.options.project === "string" ? named(kept, command.options.project) : kept;
  if (name === NODE_OPTION.name) {
    // The roster is the mesh's, the same from every project, so any kept project can read it. A
    // node is live when it has beaten and is not stale.
    const status = await context.invoke("mesh:status", {}, { workspace: picked[0] ?? kept[0] });
    const nodes = Array.isArray(status?.nodes) ? status.nodes : [];
    return rank(namedChoices(nodes.filter((node) => isPlainObject(node?.presence) && node.stale !== true).map((node) => node.nodeId)), value);
  }
  if (name === ITEM_OPTION.name && picked.length === 1) {
    const rows = await listOf(picked[0], context);
    return rank(namedChoices((Array.isArray(rows) ? rows : []).filter((row) => row?.status === "in-progress").map((row) => row.ref)), value);
  }
  return [];
}

// answerAutocomplete(interaction, context) → the choices sent. ONE type 8 callback, never deferred:
// a DM, an unserved channel, a stranger, an unknown focused option or a failed read is `[]`.
async function answerAutocomplete(interaction, context) {
  let choices = [];
  try {
    const command = commandOf(interaction.data);
    if (command.focused != null) {
      const { dm, kept } = await reach(interaction, context);
      if (!dm) choices = await choicesOf(command, kept, context);
    }
  } catch (error) {
    // The offer is still answered, empty: Discord shows nothing rather than an error, and the
    // command itself reports whatever is wrong when it runs.
    choices = [];
    reportDegrade("discord-autocomplete-failed", new Error(`an autocomplete could not read what this channel offers (${error?.code ?? (error instanceof Error ? error.name : "error")})`));
  }
  await context.request("POST", `/interactions/${interaction.id}/${interaction.token}/callback`, {
    type: AUTOCOMPLETE_RESULT,
    data: { choices },
  });
  return choices;
}

// handleInteraction(interaction, context) → the reply's content (a command) or the choices offered
// (an autocomplete). `context` is the bot's: `{ request, invoke, servedWorkspaces, now }`. A
// command's deferral is sent FIRST; the one edit of the original response is sent LAST, whatever
// happened between.
async function handleInteraction(interaction, context) {
  if (interaction?.type === AUTOCOMPLETE) return answerAutocomplete(interaction, context);
  if (interaction?.type !== APPLICATION_COMMAND) return null;
  const command = commandOf(interaction.data);
  const ephemeral = !IN_CHANNEL.includes(`${command.name} ${command.sub}`) || !isPlainObject(interaction.member);
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

return { REGISTER_INTERVAL_MS, COMMANDS, createRegistrar, clipReply, statusLine, handleInteraction };
}
