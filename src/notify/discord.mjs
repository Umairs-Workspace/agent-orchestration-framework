// src/notify/discord.mjs — THE DISCORD CHANNEL (milestone 131; ADR-005 §2, DESIGN §3, ADR-007). The
// bot's renderer, its token shape, its invite URL and its one authorised request, the first entry in
// `CHANNELS` (`src/notify/notify.mjs`).
//
// ONE DOOR (ADR-007 §4). `discordRequest` is the only `src/**` code that puts the bot token on the
// wire or names Discord's API host: posting (`sendDiscord`) goes through it, and so does every later
// inbound use (10, 11). It never throws and never retries, and a caller hears a status or an error
// NAME from it, never a message the token could ride out on.
//
// PLAIN `content`, NO EMBED: a phone's push preview shows `content` and nothing useful for an
// embed-only message, and reaching the human where they are is the point. `allowed_mentions:
// { parse: [] }` means a question containing `@everyone` pings no one; `content` is never escaped.
//
// At most four parts, each omitted when absent and never a placeholder: line 1 (bold headline, cost,
// node), the body, the action line, the link. Line 1, the action line and the link never truncate;
// the body takes what is left of 2,000 UTF-16 units and is clipped with a suffix, and a clipped body
// holding an odd number of code fences is closed BEFORE the suffix, so an open block can never
// swallow the answer command.
import { cost, headline, oneLineAsk } from "./form.mjs";

const DISCORD_CONTENT_MAX = 2000;
const CUT_WINDOW = 20;
const FENCE = "```";
const nonBlank = (value) => typeof value === "string" && value.trim().length > 0;

// The body and the action line, by event (DESIGN §3's table). When the channel takes answers by reply
// (`replyable`, 131/10, ADR-008 §7), the two ask lines offer the reply first — a deliberate departure
// from DESIGN §3, because the reply is an answer path on the same face.
function bodyAndAction(e, replyable) {
  const answer = replyable ? `reply to this message, or \`${e.answerPath}\`` : `\`${e.answerPath}\``;
  switch (e.event) {
    case "session-needs-input": return { body: e.question, action: `Answer: ${answer}` };
    case "session-answered": return { body: e.outcome?.answer, action: "The session is resuming." };
    case "session-parked-unanswered": return { body: oneLineAsk(e.question), action: `Answer to resume: ${answer}` };
    case "loop-halted": return { body: e.stop?.remedy, action: `Resume: \`${e.answerPath}\`` };
    case "loop-died": return { body: e.outcome?.cause, action: `Resume: \`${e.answerPath}\`` };
    case "loop-relaunched": return { body: e.outcome?.cause, action: null };
    case "milestone-accepted": return { body: e.outcome?.title, action: null };
    default: return { body: null, action: null };
  }
}

// Line 1: `**<headline>**` (a halt gains ` at <stop.ref>` inside the bold), then ` <cost>`, then
// ` · <node>`, each only when present. Built from `form.mjs`'s headline and cost, never re-spelled.
function firstLine(e) {
  const halt = e.event === "loop-halted" && nonBlank(e.stop?.ref) ? ` at ${e.stop.ref}` : "";
  const price = cost(e);
  return `**${headline(e)}${halt}**${price == null ? "" : ` ${price}`}${e.node == null ? "" : ` · ${e.node}`}`;
}

const countFences = (text) => text.split(FENCE).length - 1;

// clipBody(body, room, suffix) → the body cut to fit `room` units with its suffix, or null when not
// even the suffix fits. The cut is at the last whitespace inside the room when one falls in its last
// 20 units, else hard; it never splits a surrogate pair; the kept part is right-trimmed; a kept part
// with an odd number of fences gains a closing fence before the suffix.
function clipBody(body, room, suffix) {
  if (room < suffix.length) return null;
  const fit = (keepRoom, withFence) => {
    let keep = body.slice(0, Math.max(0, keepRoom));
    const last = keep.charCodeAt(keep.length - 1);
    if (keep.length > 0 && last >= 0xd800 && last <= 0xdbff) keep = keep.slice(0, -1);
    let cut = -1;
    for (let i = keep.length - 1; i >= Math.max(0, keepRoom - CUT_WINDOW); i -= 1) {
      if (/\s/u.test(keep[i])) { cut = i; break; }
    }
    if (cut >= 0) keep = keep.slice(0, cut);
    keep = keep.trimEnd();
    const fenced = withFence || countFences(keep) % 2 === 1;
    return { keep, fenced };
  };
  const plain = fit(room - suffix.length, false);
  if (!plain.fenced) return `${plain.keep}${suffix}`;
  const closing = `\n${FENCE}`;
  const fenced = fit(room - suffix.length - closing.length, true);
  // Re-cutting for the fence's room may have dropped the fence that made the count odd.
  if (countFences(fenced.keep) % 2 === 0) return `${fenced.keep}${suffix}`;
  return `${fenced.keep}${closing}${suffix}`;
}

// renderDiscord(envelope, { replyable }) → `{ content, allowed_mentions: { parse: [] } }`. A bot
// cannot set a `username` (ADR-007 §5), so the message is the bot's own; every line, cap and clip is
// DESIGN §3's.
export function renderDiscord(envelope, { replyable = false } = {}) {
  const { body, action } = bodyAndAction(envelope, replyable === true);
  const fixedBefore = [firstLine(envelope)];
  const fixedAfter = [action, envelope.link].filter((line) => line != null);
  let bodyLine = nonBlank(body) ? body : null;
  if (bodyLine != null) {
    const whole = [...fixedBefore, bodyLine, ...fixedAfter].join("\n");
    if (whole.length > DISCORD_CONTENT_MAX) {
      const fixedLength = [...fixedBefore, ...fixedAfter].join("\n").length + 1; // the body's own newline
      const suffix = `…${envelope.link == null ? " (continued in the terminal)" : " (continues at the link)"}`;
      bodyLine = clipBody(bodyLine, DISCORD_CONTENT_MAX - fixedLength, suffix);
    }
  }
  const content = [...fixedBefore, ...(bodyLine == null ? [] : [bodyLine]), ...fixedAfter].join("\n");
  return { content, allowed_mentions: { parse: [] } };
}

// ── the bot token and its invite ─────────────────────────────────────────────────────────────────

const SNOWFLAKE_RE = /^[0-9]{17,20}$/u;
const TOKEN_SEGMENT_RE = /^[A-Za-z0-9_-]+$/u;

// discordBotId(token) → the snowflake the token's first segment decodes to, or `null` when the value
// is not three dot-separated base64url segments whose first decodes to a 17-20 digit id. Offline.
export function discordBotId(token) {
  if (typeof token !== "string") return null;
  const segments = token.split(".");
  if (segments.length !== 3 || !segments.every((segment) => TOKEN_SEGMENT_RE.test(segment))) return null;
  const id = Buffer.from(segments[0], "base64url").toString("utf8");
  return SNOWFLAKE_RE.test(id) ? id : null;
}

// isDiscordBotToken(value) → whether `value` has a bot token's shape (ADR-007 §1). It is the
// `accepts` of the `discord` entry in `CHANNELS`; a webhook URL is not one.
export function isDiscordBotToken(value) {
  return discordBotId(value) != null;
}

// isDiscordSnowflake(value) → whether `value` is a Discord id as config carries it: 17-20 digits.
export function isDiscordSnowflake(value) {
  return typeof value === "string" && SNOWFLAKE_RE.test(value);
}

// The invite's permissions (ADR-007 §2): VIEW_CHANNEL 1<<10, SEND_MESSAGES 1<<11, ADD_REACTIONS
// 1<<6, READ_MESSAGE_HISTORY 1<<16 and USE_APPLICATION_COMMANDS 1<<31 — BigInt, because `1 << 31`
// is negative in a 32-bit shift.
export const DISCORD_INVITE_PERMISSIONS = String([10n, 11n, 6n, 16n, 31n].reduce((sum, bit) => sum | (1n << bit), 0n));

// discordInviteUrl(token) → the OAuth2 URL that adds the bot to a server with the commands scope
// and the five permissions, or `null` for a value that is not a bot token. Computed offline from the
// token's decoded id; it carries the id, which is public, and never the token.
export function discordInviteUrl(token) {
  const id = discordBotId(token);
  if (id == null) return null;
  return `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot+applications.commands&permissions=${DISCORD_INVITE_PERMISSIONS}`;
}

// ── the one authorised request ───────────────────────────────────────────────────────────────────

const DISCORD_API = "https://discord.com/api/v10";
// Discord asks every bot client to identify itself as `DiscordBot (<url>, <version>)`.
const USER_AGENT = "DiscordBot (aof, 0.1.0)";

// The retry hint of a 429: the body's `retry_after` when it is a finite number, else the
// `Retry-After` header when it is non-blank and a finite number of seconds, else `null`.
function headerRetryAfter(response) {
  const raw = response?.headers?.get?.("retry-after");
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : null;
}

async function retryAfterOf(response) {
  try {
    const parsed = await response.json();
    if (typeof parsed?.retry_after === "number" && Number.isFinite(parsed.retry_after)) return parsed.retry_after;
  } catch {
    // An unreadable 429 body falls through to the header.
    return headerRetryAfter(response);
  }
  return headerRetryAfter(response);
}

// A response's JSON body when its content type says JSON, else `null`; an unreadable body is `null`.
async function jsonOf(response) {
  const type = response?.headers?.get?.("content-type");
  if (typeof type !== "string" || !/\bjson\b/iu.test(type)) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// discordRequest(token, method, route, body, { fetch, timeoutMs, onError }) → `{ ok, status, json,
// reason, retryAfter }`: `ok` for a 2xx, else `reason` one of "status", "rate-limited", "timeout" or
// "error". One request to `<API>/<route>` carrying `Authorization: Bot <token>`, a JSON body when
// `body` is not null, and an abort signal. The bound is a plain timer raced against the whole
// request, body reads included, cleared when it settles and never unref'd (an unref'd wait would let
// a never-settling fetch end the process instead). It never throws and never retries. `onError`
// hears the NAME of a thrown error, never its message.
export async function discordRequest(token, method, route, body, { fetch = globalThis.fetch, timeoutMs = 5000, onError } = {}) {
  const controller = new AbortController();
  let status = null;
  let timer = null;
  let retryAfter = null;
  const failed = (reason) => ({
    ok: false,
    status: reason === "timeout" || reason === "error" ? null : status,
    json: null,
    reason,
    retryAfter: reason === "rate-limited" ? retryAfter : null,
  });
  // A 2xx whose body never arrives was still accepted by Discord: it is delivered, with no JSON,
  // rather than reported as a failure for a message that was posted.
  const bound = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      if (status != null && status >= 200 && status < 300) resolve({ ok: true, status, json: null, reason: null, retryAfter: null });
      else resolve(failed(status === 429 ? "rate-limited" : "timeout"));
    }, timeoutMs);
  });
  const send = (async () => {
    try {
      const headers = { authorization: `Bot ${token}`, "user-agent": USER_AGENT };
      if (body != null) headers["content-type"] = "application/json";
      const response = await fetch(`${DISCORD_API}${route}`, {
        method,
        headers,
        ...(body != null ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      status = response.status;
      if (status === 429) {
        retryAfter = headerRetryAfter(response);
        retryAfter = await retryAfterOf(response);
        return failed("rate-limited");
      }
      if (status < 200 || status >= 300) return failed("status");
      return { ok: true, status, json: await jsonOf(response), reason: null, retryAfter: null };
    } catch (error) {
      if (controller.signal.aborted) return failed("timeout");
      onError?.(error instanceof Error ? error.name : "error");
      return failed("error");
    }
  })();
  try {
    return await Promise.race([send, bound]);
  } finally {
    clearTimeout(timer);
  }
}

// sendDiscord(token, channelId, body, opts) → `{ ok, status, messageId, reason, retryAfter }`: one
// `POST /channels/{channelId}/messages` through `discordRequest`. `messageId` is the posted
// message's `id` (story 10 maps a reply back to its ask through it), `null` when the answer carries
// none or the post failed.
export async function sendDiscord(token, channelId, body, opts = {}) {
  const result = await discordRequest(token, "POST", `/channels/${channelId}/messages`, body, opts);
  const id = result.json?.id;
  return { ok: result.ok, status: result.status, messageId: result.ok && typeof id === "string" ? id : null, reason: result.reason, retryAfter: result.retryAfter };
}
