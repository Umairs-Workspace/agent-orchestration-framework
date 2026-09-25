// src/notify/discord.mjs — THE DISCORD CHANNEL (milestone 131; ADR-005 §2, DESIGN §3). A webhook
// renderer and its sender, the first entry in `CHANNELS` (`src/notify/notify.mjs`).
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

// The body and the action line, by event (DESIGN §3's table).
function bodyAndAction(e) {
  switch (e.event) {
    case "session-needs-input": return { body: e.question, action: `Answer: \`${e.answerPath}\`` };
    case "session-answered": return { body: e.outcome?.answer, action: "The session is resuming." };
    case "session-parked-unanswered": return { body: oneLineAsk(e.question), action: `Answer to resume: \`${e.answerPath}\`` };
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

// isDiscordWebhookUrl(value) → whether `value` is a Discord webhook URL (131/08, ADR-005 §1 as
// amended): `https` only, one of Discord's four hosts, an optional `/v<N>` after `/api`, a numeric
// id and a token of `[A-Za-z0-9_-]`. The pattern is spelled escaped, never as the literal
// FF-13106 forbids in `src/**`. It is the `accepts` of the `discord` entry in `CHANNELS`.
const DISCORD_WEBHOOK_RE = /^https:\/\/(?:discord|discordapp|ptb\.discord|canary\.discord)\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[A-Za-z0-9_-]+$/u;
export function isDiscordWebhookUrl(value) {
  return typeof value === "string" && DISCORD_WEBHOOK_RE.test(value);
}

// renderDiscord(envelope) → `{ content, username: "aof", allowed_mentions: { parse: [] } }`.
export function renderDiscord(envelope) {
  const { body, action } = bodyAndAction(envelope);
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
  return { content, username: "aof", allowed_mentions: { parse: [] } };
}

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

// sendDiscord(url, body, { fetch, timeoutMs, onError }) → `{ ok: true, status }` for a 2xx, else
// `{ ok: false, reason, status, retryAfter }` with `reason` one of "status", "rate-limited",
// "timeout" or "error". One JSON POST carrying an abort signal, and the bound is kept here too — a
// plain timer raced against the whole send, 429 body read included, cleared when the send settles
// and never unref'd (an unref'd wait would let a never-settling fetch end the process instead). It
// never throws and never retries. `onError` hears the NAME of a thrown error, never its message,
// so the caller can say what failed without the URL riding a message out.
export async function sendDiscord(url, body, { fetch = globalThis.fetch, timeoutMs = 5000, onError } = {}) {
  const controller = new AbortController();
  let status = null;
  let timer = null;
  let retryAfter = null;
  const bound = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(status === 429
        ? { ok: false, reason: "rate-limited", status, retryAfter }
        : { ok: false, reason: "timeout", status: null, retryAfter: null });
    }, timeoutMs);
  });
  const send = (async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      status = response.status;
      if (status >= 200 && status < 300) return { ok: true, status };
      if (status === 429) {
        retryAfter = headerRetryAfter(response);
        retryAfter = await retryAfterOf(response);
        return { ok: false, reason: "rate-limited", status, retryAfter };
      }
      return { ok: false, reason: "status", status, retryAfter: null };
    } catch (error) {
      if (controller.signal.aborted) return { ok: false, reason: "timeout", status: null, retryAfter: null };
      onError?.(error instanceof Error ? error.name : "error");
      return { ok: false, reason: "error", status: null, retryAfter: null };
    }
  })();
  try {
    return await Promise.race([send, bound]);
  } finally {
    clearTimeout(timer);
  }
}
