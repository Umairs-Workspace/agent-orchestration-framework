// src/notify/notify.mjs — THE NOTIFIER (milestone 131; ADR-005). A driven session that needs a
// human, an answer, a park, a halt, a death and an acceptance reach the operator where they are.
// One config reader (`resolveNotifyConfig`), one envelope builder (`buildNotifyEnvelope`), one
// channel registry (`CHANNELS`, a renderer and a sender per type, Discord first) and one delivery
// (`notify`). A second channel type is a renderer entry and a schema enum member, never a second
// pipeline.
//
// THE SECRET. A Discord webhook URL carries its token in its path, so the URL IS the credential.
// The config names only the ENV VAR that may override it (`urlEnv`). The URL is resolved at the
// point of send, on EVERY send and never cached (as amended at 131/08): `env[urlEnv]` when it is set
// and not blank, else the machine-wide store `aof messaging init` wrote (`readMessagingSecret`,
// `./secret.mjs`), read from the PROCESS's global home — never one derived from the injected `env`.
// So a daemon started before the `init` sends with the new URL, with no restart. The URL never
// reaches the envelope, a degrade message, a returned value or a log.
//
// DELIVERY is awaited (an un-awaited promise in an exiting CLI is dropped — the death class 129
// measured), bounded at NOTIFY_TIMEOUT_MS per channel, never retried, and never throws: a failing
// webhook never blocks or fails the run that fired it. Each failure degrades once, by name.
import { reportDegrade } from "../degrade.mjs";
import { isDiscordWebhookUrl, renderDiscord, sendDiscord } from "./discord.mjs";
import { readMessagingSecret } from "./secret.mjs";

// The seven events, in ADR-005 §3's order. A site passes one of these as a literal.
export const EVENTS = Object.freeze([
  "session-needs-input",
  "session-answered",
  "session-parked-unanswered",
  "loop-halted",
  "loop-died",
  "loop-relaunched",
  "milestone-accepted",
]);

// DEFAULT DECISION (ADR-005 §1): the env var a channel reads when it names none.
export const DEFAULT_URL_ENV = "AOF_DISCORD_WEBHOOK_URL";
// DEFAULT DECISION (ADR-005 §5): each channel's send is abandoned at five seconds.
export const NOTIFY_TIMEOUT_MS = 5000;

// The channel registry: per type, one renderer, one sender, the URL shape it `accepts` and the
// `label` a human reads (the last two serve `aof messaging`, 131/08).
export const CHANNELS = Object.freeze({
  discord: Object.freeze({ render: renderDiscord, send: sendDiscord, accepts: isDiscordWebhookUrl, label: "Discord" }),
});

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
const nonBlank = (value) => typeof value === "string" && value.trim().length > 0;

// resolveNotifyConfig(config) → the ONE reading of `work.notify`, with its two defaults applied, or
// `null` when there is nothing to notify (absent, not an object, or no usable channel). Nothing
// validates the block at run time, so this meets shapes the schema refuses and never throws on
// them: a channel that is not a plain object is skipped; a key absent or of the wrong JSON type
// takes its default; a present value of the right type passes through, unchecked. The answer is a
// frozen copy — the config it read is neither frozen nor shared. It never reads `process.env`.
export function resolveNotifyConfig(config) {
  const block = isPlainObject(config) && isPlainObject(config.work) ? config.work.notify : undefined;
  if (!isPlainObject(block) || !isPlainObject(block.channels)) return null;
  const channels = [];
  for (const [name, channel] of Object.entries(block.channels)) {
    if (!isPlainObject(channel)) continue;
    channels.push(Object.freeze({
      name,
      type: channel.type,
      urlEnv: typeof channel.urlEnv === "string" ? channel.urlEnv : DEFAULT_URL_ENV,
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
// link }`. `node` is `config.mesh.nodeId ?? null`; `link` is the configured template with every
// `{ref}` filled (read through `resolveNotifyConfig`, so a channel-less block has no link). An
// event that is not one of the seven is a programmer error, refused `notify-unknown-event`.
export function buildNotifyEnvelope(event, fields = {}, { config = {}, now = () => new Date() } = {}) {
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
    node: nodeId,
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
// that replaces any occurrence of the URL, so a message can never carry the credential.
function degrade(code, message, url) {
  const safe = nonBlank(url) ? message.split(url).join("<redacted>") : message;
  reportDegrade(code, new Error(safe));
}

// A channel's URL, resolved at the point of send: the env override when it is set and not blank,
// else the stored URL for the channel's type, else nothing. Read on every send, never cached.
async function resolveUrl(channel, env) {
  const override = env?.[channel.urlEnv];
  if (nonBlank(override)) return override;
  return readMessagingSecret(channel.type);
}

// One channel's delivery. Answers true when delivered; every failure degrades once and answers
// false. It never throws: a throwing renderer is a delivery failure like any other.
async function deliver(channel, envelope, { env, fetch, timeoutMs }) {
  const entry = Object.hasOwn(CHANNELS, channel.type) ? CHANNELS[channel.type] : null;
  if (entry == null) {
    degrade("notify-channel-unconfigured", `notify channel "${channel.name}" has type "${String(channel.type)}", which no renderer serves`);
    return false;
  }
  const url = await resolveUrl(channel, env);
  if (!nonBlank(url)) {
    degrade("notify-channel-unconfigured", `notify channel "${channel.name}" has no webhook URL — set ${channel.urlEnv} or run \`aof messaging init ${channel.type}\``);
    return false;
  }
  let body;
  try {
    body = entry.render(envelope);
  } catch (error) {
    degrade("notify-delivery-failed", `notify channel "${channel.name}" could not render the message (${error instanceof Error ? error.name : "error"})`, url);
    return false;
  }
  let errorName = null;
  const result = await entry.send(url, body, { fetch, timeoutMs, onError: (name) => { errorName = name; } });
  if (result.ok) return true;
  if (result.reason === "rate-limited") {
    degrade("notify-rate-limited", `notify channel "${channel.name}" was rate limited (retry after ${result.retryAfter ?? "unknown"})`, url);
  } else {
    const detail = result.status != null ? `status ${result.status}` : result.reason === "timeout" ? `no answer within ${timeoutMs}ms` : String(errorName ?? "error");
    degrade("notify-delivery-failed", `notify channel "${channel.name}" failed to deliver (${detail})`, url);
  }
  return false;
}

// notify(workspace, envelope, { env, fetch, timeoutMs }) → `{ delivered, failed }`, lists of channel
// names in config order. Selects the channels whose `events` hold the envelope's event and sends to
// them in parallel. An absent or channel-less block, or an envelope or workspace that cannot be
// read, is an honest no-op: no call and no degrade (17/ADR-004). Never rejects.
export async function notify(workspace, envelope, { env = process.env, fetch = globalThis.fetch, timeoutMs = NOTIFY_TIMEOUT_MS } = {}) {
  const resolved = resolveNotifyConfig(workspace?.config);
  const event = isPlainObject(envelope) ? envelope.event : null;
  if (resolved == null || typeof event !== "string" || !EVENTS.includes(event)) return { delivered: [], failed: [] };
  const selected = resolved.channels.filter((channel) => channel.events.includes(event));
  const outcomes = await Promise.all(selected.map((channel) =>
    deliver(channel, envelope, { env, fetch, timeoutMs }).catch(() => {
      degrade("notify-delivery-failed", `notify channel "${channel.name}" failed to deliver (error)`);
      return false;
    })));
  return {
    delivered: selected.filter((_, index) => outcomes[index]).map((channel) => channel.name),
    failed: selected.filter((_, index) => !outcomes[index]).map((channel) => channel.name),
  };
}
