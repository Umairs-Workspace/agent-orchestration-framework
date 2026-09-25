// src/discord/replies.mjs — THE ANSWER BY REPLY (milestone 131 / story 10; ADR-008 §3, §5, §6). One
// function over a gateway `MESSAGE_CREATE`: a Discord REPLY to the bot's ask message, from a user on
// the ask's own channel `allow` list, answers the waiting session through `work:answer` — the same
// verb, sanitation, first-answer-wins and `session-answered` post as `aof work answer`, with
// `via: "discord"`.
//
// THE ORDER is the contract. The silent exits come first — a bot author, no `message_reference`, a
// reference the index does not know, a record for another channel — and post NOTHING. Then the
// allowlist, read from the ask's own project config: absent or empty means nobody answers from
// Discord. Only then the invoke. On success the bot reacts ✅ and posts no text (the verb posts
// `session-answered`); on a coded refusal it replies with one line built from the code, and never
// pings anyone.
//
// This module never writes an ask file or a run record (ADR-008's invariant, FF-13112): the one
// answer path is `invoke("work:answer", …)`, reached through the bot's context, and it reads the ask
// store only to say who answered first. The actor is `@<username>`, never a user id, because run
// records are committed to a public repo.
import { loopAsksDir, readAsks } from "../loop/ask-request.mjs";
import { readAskMessage } from "../notify/ask-messages.mjs";
import { resolveWorkspaceId } from "../workspace-identity.mjs";

// The verb's own actor bound (`work:answer`): 80 code points, no control character.
const ACTOR_MAX_CODE_POINTS = 80;
const ACTOR_CONTROL_RE = /[\u0000-\u001f\u007f]/u;
const FALLBACK_ACTOR = "@discord-user";
// The ✅ a successful answer is acknowledged with, percent-encoded for the reaction route.
const ANSWERED_REACTION = "%E2%9C%85";
const SNOWFLAKE_RE = /^[0-9]{17,20}$/u;

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

// The answerer's name as the record carries it: `@<username>`, clipped to the verb's bound, or
// `@discord-user` when the username would fail the verb's actor check.
export function discordActor(username) {
  if (typeof username !== "string" || username.trim() === "") return FALLBACK_ACTOR;
  const actor = [...`@${username.trim()}`].slice(0, ACTOR_MAX_CODE_POINTS).join("");
  return ACTOR_CONTROL_RE.test(actor) ? FALLBACK_ACTOR : actor;
}

// The discord channel of `config` whose `channelId` is `channelId`, as `[name, channel]`, or null.
function channelOf(config, channelId) {
  const channels = config?.work?.notify?.channels;
  if (!isPlainObject(channels)) return null;
  for (const [name, channel] of Object.entries(channels)) {
    if (isPlainObject(channel) && channel.type === "discord" && channel.channelId === channelId) return [name, channel];
  }
  return null;
}

// Who answered `ref` first, and when, read from the ask store — the verb's refusal names both only
// in prose, and this line must not parse prose.
async function firstAnswer(workspace, ref) {
  const asks = await readAsks(loopAsksDir(), { workspaceId: resolveWorkspaceId(workspace) });
  const answered = asks.filter((record) => record.ref === ref && record.state === "answered").at(-1);
  return answered == null ? null : { actor: answered.by?.actor ?? "someone", at: answered.answeredAt };
}

// Discord renders `<t:<unix>:R>` as "3 minutes ago" in the reader's own client and locale.
function relativeTime(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? `<t:${Math.floor(ms / 1000)}:R>` : "earlier";
}

// The one line a refusal replies with, by code.
async function refusalLine(code, { ref, workspace }) {
  switch (code) {
    case "ask-already-answered": {
      const first = await firstAnswer(workspace, ref).catch(() => null);
      return first == null
        ? `\`${ref}\` was already answered — the first answer stands.`
        : `\`${ref}\` was already answered by ${first.actor} ${relativeTime(first.at)} — the first answer stands.`;
    }
    case "answer-not-waiting":
      return `\`${ref}\` is no longer waiting on an answer — nothing was changed.`;
    case "answer-too-long":
      return "The answer is too long — at most 8,000 characters. Nothing was changed.";
    case "answer-empty":
      return "The answer is empty — reply with what the session should do.";
    case "answer-control-chars":
      return "The answer carries a control character — reply with plain text.";
    default:
      return `The answer was not taken (\`${code}\`) — answer from the terminal with \`aof work answer ${ref} "…"\`.`;
  }
}

// handleReply(message, context) → `{ action, code? }` — `ignored`, `refused` or `answered`. `context`
// is the bot's: `{ request(method, route, body), invoke(id, input, ctx), loadWorkspace(root),
// answerContext }`. A coded refusal is answered in the channel; an uncoded fault propagates, and the
// gateway's dispatch degrades it `discord-dispatch-failed`.
export async function handleReply(message, { request, invoke, loadWorkspace, answerContext = {} }) {
  if (message?.author?.bot === true) return { action: "ignored", code: "bot-author" };
  // Both ids ride a route below, so each is a snowflake or the message is not one this bot answers.
  if (!SNOWFLAKE_RE.test(String(message?.id)) || !SNOWFLAKE_RE.test(String(message?.channel_id))) return { action: "ignored", code: "not-a-message" };
  const repliedTo = message?.message_reference?.message_id;
  if (typeof repliedTo !== "string") return { action: "ignored", code: "not-a-reply" };
  const record = await readAskMessage(repliedTo);
  if (record == null) return { action: "ignored", code: "not-an-ask" };
  if (record.channelId !== message.channel_id) return { action: "ignored", code: "other-channel" };
  if (typeof record.projectRoot !== "string" || record.projectRoot.length === 0) return { action: "ignored", code: "no-project" };

  const refuse = async (code, line) => {
    await request("POST", `/channels/${message.channel_id}/messages`, {
      content: line,
      message_reference: { message_id: message.id },
      allowed_mentions: { parse: [], replied_user: false },
    });
    return { action: "refused", code };
  };

  const workspace = await loadWorkspace(record.projectRoot);
  const found = channelOf(workspace?.config, record.channelId);
  const key = `work.notify.channels.${found?.[0] ?? "discord"}.allow`;
  const allow = Array.isArray(found?.[1]?.allow) ? found[1].allow : [];
  if (allow.length === 0) {
    return refuse("discord-answer-off", `Answering from Discord is off for this project — nobody is on its answer list (\`${key}\`). Nothing was changed.`);
  }
  if (!allow.includes(message.author?.id)) {
    return refuse("discord-answer-not-allowed", `You are not on this project's answer list (\`${key}\`), so the answer was not taken.`);
  }

  try {
    await invoke(
      "work:answer",
      { ref: record.ref, text: typeof message.content === "string" ? message.content : "", as: discordActor(message.author?.username), via: "discord" },
      { ...answerContext, workspace },
    );
  } catch (error) {
    if (typeof error?.code !== "string") throw error;
    return refuse(error.code, await refusalLine(error.code, { ref: record.ref, workspace }));
  }
  await request("PUT", `/channels/${message.channel_id}/messages/${message.id}/reactions/${ANSWERED_REACTION}/@me`, null);
  return { action: "answered" };
}
