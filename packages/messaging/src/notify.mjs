import { discordInviteUrl, isDiscordBotToken, isDiscordSnowflake, renderDiscord, renderDiscordTest, sendDiscord } from "./discord.mjs";
import { trimRun } from "@aof/foundation/text";

// Core supplies configured application services; construction performs no I/O.
export function createNotifier({ reportDegrade, resolveWorkspaceId, recordAskMessage, readMessagingSecret }) {
// src/notify/notify.mjs — THE NOTIFIER (milestone 131; ADR-005, ADR-007, ADR-008 §4 and §7). A driven session that needs a
// human, an answer, a park, a halt, a death and an acceptance reach the operator where they are.
// One config reader (`resolveNotifyConfig`), one envelope builder (`buildNotifyEnvelope`), one
// channel registry (`CHANNELS`, a renderer and a sender per type, Discord first) and one delivery
// (`notify`). A second channel type is a renderer entry and a schema enum member, never a second
// pipeline.
//
// THE SECRET is the bot token (ADR-007, superseding ADR-005 §1's webhook URL). The config names only
// the Discord channel it posts to (`channelId`, not a secret) and the ENV VAR that may override the
// token (`tokenEnv`). The token is resolved at the point of send, on EVERY send and never cached (as
// amended at 131/08): `env[tokenEnv]` when it is set and not blank, else the machine-wide store
// `aof messaging init` wrote (`readMessagingSecret`, `./secret.mjs`), read from the PROCESS's
// global home — never one derived from the injected `env`. So a daemon started before the `init`
// sends with the new token, with no restart. The token never reaches the envelope, a degrade
// message, a returned value or a log; it goes on the wire only through `discordRequest`.
//
// DELIVERY is awaited (an un-awaited promise in an exiting CLI is dropped — the death class 129
// measured), bounded at NOTIFY_TIMEOUT_MS per channel, never retried, and never throws: a failing
// channel never blocks or fails the run that fired it. Each failure degrades once, by name.
//
// THE ASK INDEX (131/10, ADR-008 §4). A delivered `session-needs-input` or
// `session-parked-unanswered` is recorded by its posted message id (`./ask-messages.mjs`), so a
// Discord reply to it can find its ask. The record is best-effort: a write that fails degrades
// `notify-ask-index` and never turns a delivery into a failure.

// The seven events, in ADR-005 §3's order. A site passes one of these as a literal.
const EVENTS = Object.freeze([
  "session-needs-input",
  "session-answered",
  "session-parked-unanswered",
  "loop-halted",
  "loop-died",
  "loop-relaunched",
  "milestone-accepted",
]);

// DEFAULT DECISION (ADR-007 §3): the env var that overrides the token when a channel names none.
const DEFAULT_TOKEN_ENV = "AOF_DISCORD_BOT_TOKEN";
// DEFAULT DECISION (ADR-005 §5): each channel's send is abandoned at five seconds.
const NOTIFY_TIMEOUT_MS = 5000;
// The events whose posted message is indexed, so a reply to it answers the ask (ADR-008 §4).
const ASK_EVENTS = Object.freeze(["session-needs-input", "session-parked-unanswered"]);

// The channel registry: per type, one renderer, one sender, the credential shape it `accepts`, the
// channel-id shape it takes (`validChannelId`), the setup URL `init` prints (`invite`), the message
// `aof messaging test` posts (`renderTest`), and the `label` and `credential` a human reads (all but
// `render` serve `aof messaging` too, 131/08-09). The sender is `send(credential, channelId, body, opts)`.
const CHANNELS = Object.freeze({
  discord: Object.freeze({
    render: renderDiscord,
    renderTest: renderDiscordTest,
    send: sendDiscord,
    accepts: isDiscordBotToken,
    validChannelId: isDiscordSnowflake,
    invite: discordInviteUrl,
    label: "Discord",
    credential: "bot token",
  }),
});

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const nonBlank = (value) => typeof value === "string" && value.trim().length > 0;

// resolveNotifyConfig(config) → the ONE reading of `work.notify`, with its defaults applied, or
// `null` when there is nothing to notify (absent, not an object, or no usable channel). Nothing
// validates the block at run time, so this meets shapes the schema refuses and never throws on
// them: a channel that is not a plain object is skipped; a key absent or of the wrong JSON type
// takes its default; a present value of the right type passes through, unchecked. The answer is a
// frozen copy — the config it read is neither frozen nor shared. It never reads `process.env`.
function resolveNotifyConfig(config) {
  const block = isPlainObject(config) && isPlainObject(config.work) ? config.work.notify : undefined;
  if (!isPlainObject(block) || !isPlainObject(block.channels)) return null;
  const channels = [];
  for (const [name, channel] of Object.entries(block.channels)) {
    if (!isPlainObject(channel)) continue;
    channels.push(Object.freeze({
      name,
      type: channel.type,
      channelId: typeof channel.channelId === "string" ? channel.channelId : null,
      tokenEnv: typeof channel.tokenEnv === "string" ? channel.tokenEnv : DEFAULT_TOKEN_ENV,
      allow: Object.freeze(Array.isArray(channel.allow) ? channel.allow.filter((id) => typeof id === "string") : []),
      events: Object.freeze(Array.isArray(channel.events) ? [...channel.events] : [...EVENTS]),
    }));
  }
  if (channels.length === 0) return null;
  return Object.freeze({
    channels: Object.freeze(channels),
    link: typeof block.link === "string" ? block.link : null,
  });
}

// What each event keeps from the fields it is handed — every other nullable key is `null`, even
// when the fields pass it (ADR-005 §3, as amended at 131/02: `stop` carries `ref`, the halting
// item, because a loop event's `ref` is its scope).
const ANSWER_PATH = (ref) => `aof work answer ${ref} "…"`;
const RESUME_PATH = (ref) => `aof work loop ${ref} --resume`;
const EVENT_SHAPES = Object.freeze({
  "session-needs-input": { phase: true, elapsedMs: true, question: true, answerPath: ANSWER_PATH },
  "session-answered": { phase: true, elapsedMs: true, outcome: ["by", "answer"] },
  "session-parked-unanswered": { phase: true, elapsedMs: true, question: true, outcome: ["askedAt", "parkedAt"], answerPath: ANSWER_PATH },
  "loop-halted": { elapsedMs: true, stop: ["id", "producer", "remedy", "ref"], answerPath: RESUME_PATH },
  "loop-died": { elapsedMs: true, outcome: ["cause"], answerPath: RESUME_PATH },
  "loop-relaunched": { elapsedMs: true, outcome: ["cause"] },
  "milestone-accepted": { outcome: ["title"] },
});

// A nested object with exactly its own sub-keys: a missing one reads `null`, an unknown one is
// dropped, and a non-object reads as all-null — so a renderer reads `outcome.cause` unguarded.
function pick(value, keys) {
  const source = isPlainObject(value) ? value : {};
  const out = {};
  for (const key of keys) out[key] = Object.hasOwn(source, key) ? source[key] ?? null : null;
  return Object.freeze(out);
}

function notifyError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// buildNotifyEnvelope(event, fields, { config, now }) → the ONE builder of the eleven-key envelope,
// frozen through: `{ event, ref, at, node, phase, elapsedMs, question, stop, outcome, answerPath,
// link }`. `node` is `fields.node` when given (a worker's ask posted by the control, 131/ADR-010 §4),
// else `config.mesh.nodeId ?? null`; `link` is the configured template with every
// `{ref}` filled (read through `resolveNotifyConfig`, so a channel-less block has no link). An
// event that is not one of the seven is a programmer error, refused `notify-unknown-event`.
function buildNotifyEnvelope(event, fields = {}, { config = {}, now = () => new Date() } = {}) {
  if (typeof event !== "string" || !Object.hasOwn(EVENT_SHAPES, event)) {
    throw notifyError(`"${String(event)}" is not a notify event — the events are ${EVENTS.join(", ")}`, "notify-unknown-event");
  }
  const shape = EVENT_SHAPES[event];
  const given = isPlainObject(fields) ? fields : {};
  const ref = given.ref ?? null;
  const resolved = resolveNotifyConfig(config);
  const nodeId = isPlainObject(config) && isPlainObject(config.mesh) ? config.mesh.nodeId ?? null : null;
  return Object.freeze({
    event,
    ref,
    at: new Date(now()).toISOString(),
    node: typeof given.node === "string" && given.node.length > 0 ? given.node : nodeId,
    phase: shape.phase ? given.phase ?? null : null,
    elapsedMs: shape.elapsedMs ? given.elapsedMs ?? null : null,
    question: shape.question ? given.question ?? null : null,
    stop: shape.stop ? pick(given.stop, shape.stop) : null,
    outcome: shape.outcome ? pick(given.outcome, shape.outcome) : null,
    answerPath: shape.answerPath ? shape.answerPath(ref) : null,
    link: resolved?.link == null ? null : resolved.link.replaceAll("{ref}", String(ref)),
  });
}

// A degrade message built from named parts only — never a raw `error.message` — with a final pass
// that replaces any occurrence of the token, so a message can never carry the credential.
function degrade(code, message, secret) {
  const safe = nonBlank(secret) ? message.split(secret).join("<redacted>") : message;
  reportDegrade(code, new Error(safe));
}

// A channel's token, resolved at the point of send: the env override when it is set and not blank,
// else the stored token for the channel's type, else nothing. Read on every send, never cached.
async function resolveToken(channel, env) {
  const override = env?.[channel.tokenEnv];
  if (nonBlank(override)) return override;
  return readMessagingSecret(channel.type);
}

// resolveBotToken(env) → the bot token this machine would post with — the `AOF_DISCORD_BOT_TOKEN`
// override when it is set and not blank, else the store — or `null` when neither holds a bot token.
// The one read the control node's launcher asks before it starts the bot (131/10, ADR-008 §1).
async function resolveBotToken(env = process.env) {
  const token = await resolveToken({ type: "discord", tokenEnv: DEFAULT_TOKEN_ENV }, env);
  return nonBlank(token) && CHANNELS.discord.accepts(token) ? token : null;
}

// Records a delivered ask message in the index, and degrades rather than throws when it cannot.
async function indexAskMessage(workspace, envelope, channel, messageId) {
  if (!ASK_EVENTS.includes(envelope.event) || messageId == null) return;
  try {
    await recordAskMessage({
      messageId,
      channelId: channel.channelId,
      event: envelope.event,
      ref: envelope.ref,
      workspaceId: resolveWorkspaceId(workspace),
      projectRoot: typeof workspace?.projectRoot === "string" ? workspace.projectRoot : null,
    });
  } catch (error) {
    degrade("notify-ask-index", `notify channel "${channel.name}" posted the ask for ${String(envelope.ref)}, but its message could not be indexed for a reply (${error?.code === "notify-ask-index" ? error.message : error instanceof Error ? error.name : "error"})`);
  }
}

// projectName(workspace) → the name a message carries for its project: the config's `name`, else the
// project folder's own name, else `null` (a render then names none).
function projectName(workspace) {
  const name = workspace?.config?.name;
  if (nonBlank(name)) return name.trim();
  const root = workspace?.projectRoot;
  if (!nonBlank(root)) return null;
  const folder = trimRun(root, "\\/", { start: false }).split(/[\\/]/u).pop();
  return nonBlank(folder) ? folder : null;
}

// readyChannel(channel, env) → `{ entry, token }` for a channel that can be sent to, or
// `{ problem, token }` naming why it cannot — its type, its token, or its channel id. The ONE set of
// pre-send checks: `deliver` degrades the problem, `sendTestMessage` answers it. `token` rides the
// answer only so a degrade can redact it; no problem message ever contains it.
async function readyChannel(channel, env) {
  const entry = Object.hasOwn(CHANNELS, channel.type) ? CHANNELS[channel.type] : null;
  if (entry == null) return { problem: `notify channel "${channel.name}" has type "${String(channel.type)}", which no renderer serves`, token: null };
  const token = await resolveToken(channel, env);
  if (!nonBlank(token)) {
    return { problem: `notify channel "${channel.name}" has no ${entry.label} ${entry.credential} — set ${channel.tokenEnv} or run \`aof messaging init ${channel.type}\``, token: null };
  }
  if (!entry.accepts(token)) {
    // An old webhook URL left in the store, or a mistyped override: the shape is named, never the value.
    return { problem: `notify channel "${channel.name}" holds a credential that is not a ${entry.label} ${entry.credential} — run \`aof messaging init ${channel.type}\``, token };
  }
  if (!entry.validChannelId(channel.channelId)) {
    return { problem: `notify channel "${channel.name}" names no ${entry.label} channel id — run \`aof messaging enable ${channel.type} --channel <id>\``, token };
  }
  return { entry, token };
}

// One channel's delivery. Answers the posted message's `{ channel, channelId, messageId }` when
// delivered, else `null`; every failure degrades once. It never throws: a throwing renderer is a
// delivery failure like any other.
async function deliver(workspace, channel, envelope, { env, fetch, timeoutMs }) {
  const ready = await readyChannel(channel, env);
  if (ready.problem != null) {
    degrade("notify-channel-unconfigured", ready.problem, ready.token);
    return null;
  }
  const { entry, token } = ready;
  let body;
  try {
    body = entry.render(envelope, { replyable: channel.allow.length > 0, project: projectName(workspace) });
  } catch (error) {
    degrade("notify-delivery-failed", `notify channel "${channel.name}" could not render the message (${error instanceof Error ? error.name : "error"})`, token);
    return null;
  }
  let errorName = null;
  const result = await entry.send(token, channel.channelId, body, { fetch, timeoutMs, onError: (name) => { errorName = name; } });
  if (result.ok) {
    const messageId = result.messageId ?? null;
    await indexAskMessage(workspace, envelope, channel, messageId);
    return { channel: channel.name, channelId: channel.channelId, messageId };
  }
  if (result.reason === "rate-limited") {
    degrade("notify-rate-limited", `notify channel "${channel.name}" was rate limited (retry after ${result.retryAfter ?? "unknown"})`, token);
  } else {
    const detail = result.status != null ? `status ${result.status}` : result.reason === "timeout" ? `no answer within ${timeoutMs}ms` : String(errorName ?? "error");
    degrade("notify-delivery-failed", `notify channel "${channel.name}" failed to deliver (${detail})`, token);
  }
  return null;
}

// notify(workspace, envelope, { env, fetch, timeoutMs }) → `{ delivered, failed, messages }`:
// channel names in config order, and one `{ channel, channelId, messageId }` per delivered channel
// (ADR-007 §6 — the firing sites ignore it; story 10 indexes an ask's message by it). Selects the
// channels whose `events` hold the envelope's event and sends to them in parallel. An absent or
// channel-less block, or an envelope or workspace that cannot be read, is an honest no-op: no call
// and no degrade (17/ADR-004). Never rejects.
async function notify(workspace, envelope, { env = process.env, fetch = globalThis.fetch, timeoutMs = NOTIFY_TIMEOUT_MS } = {}) {
  const resolved = resolveNotifyConfig(workspace?.config);
  const event = isPlainObject(envelope) ? envelope.event : null;
  if (resolved == null || typeof event !== "string" || !EVENTS.includes(event)) return { delivered: [], failed: [], messages: [] };
  const selected = resolved.channels.filter((channel) => channel.events.includes(event));
  const outcomes = await Promise.all(selected.map((channel) =>
    deliver(workspace, channel, envelope, { env, fetch, timeoutMs }).catch(() => {
      degrade("notify-delivery-failed", `notify channel "${channel.name}" failed to deliver (error)`);
      return null;
    })));
  return {
    delivered: selected.filter((_, index) => outcomes[index] != null).map((channel) => channel.name),
    failed: selected.filter((_, index) => outcomes[index] == null).map((channel) => channel.name),
    messages: outcomes.filter((outcome) => outcome != null),
  };
}

// sendTestMessage(workspace, { type, env, fetch, timeoutMs }) → one `{ channel, channelId, ok,
// messageId, problem, status, reason, retryAfter }` per channel of `type` in the project, in config
// order: `aof messaging test` (131, after 09's live setup). It posts the type's own test message
// (`renderTest`) through the SAME pre-send checks and sender a notification uses, so a green test is
// the path an ask will take. Unlike `notify`, it DEGRADES NOTHING: the caller asked, so each outcome
// is answered as a value for the caller to print. It is not a notification: no envelope, no event,
// no ask index, and not one of the firing sites. Never rejects; the token never enters an answer.
async function sendTestMessage(workspace, { type, env = process.env, fetch = globalThis.fetch, timeoutMs = NOTIFY_TIMEOUT_MS } = {}) {
  const resolved = resolveNotifyConfig(workspace?.config);
  const channels = (resolved?.channels ?? []).filter((channel) => channel.type === type);
  const project = projectName(workspace);
  return await Promise.all(channels.map(async (channel) => {
    const base = { channel: channel.name, channelId: channel.channelId, ok: false, messageId: null, problem: null, status: null, reason: null, retryAfter: null };
    try {
      const ready = await readyChannel(channel, env);
      if (ready.problem != null) return { ...base, problem: ready.problem };
      const result = await ready.entry.send(ready.token, channel.channelId, ready.entry.renderTest({ project }), { fetch, timeoutMs });
      return { ...base, ok: result.ok === true, messageId: result.messageId ?? null, status: result.status ?? null, reason: result.reason ?? null, retryAfter: result.retryAfter ?? null };
    } catch (error) {
      return { ...base, reason: error instanceof Error ? error.name : "error" };
    }
  }));
}

return { EVENTS, DEFAULT_TOKEN_ENV, NOTIFY_TIMEOUT_MS, ASK_EVENTS, CHANNELS, resolveNotifyConfig, buildNotifyEnvelope, resolveBotToken, notify, sendTestMessage };
}
