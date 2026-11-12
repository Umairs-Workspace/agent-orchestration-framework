// src/discord/buttons.mjs — THE BUTTONS ON A NOTIFICATION (milestone 191 / story 07; ADR-007). A halt
// or a death carries `Resume` and `Open a session here`; a question with two to five fixed choices
// carries one button per choice. A tap is one more way to say what a reply or a command already
// says: it passes the same allowlist and reaches the same verbs.
//
// ONE GRAMMAR (ADR-007 §4). `buttonId` and `parseButtonId` are the only code that spells a
// `custom_id`: `aof:answer:<n>`, `aof:resume` or `aof:session`. The id names an ACTION and, for an
// answer, a choice's index — never a project, a ref or a scope. Everything a tap dispatches comes
// from the message index (`./ask-messages.mjs`), read by `interaction.message.id`, so nothing the
// client sends can address another project (FF-19107).
//
// THE PRESS (ADR-007 §5). `handleButton` defers ephemerally FIRST (type 5, flags 64), then finds the
// index record, checks the user against that record's own channel `allow`, dispatches one of three
// registered verbs — `work:answer`, `work:loop` or `mesh:session-start` — and answers by ONE edit of
// the deferred reply. An answer, or the refusal `ask-already-answered`, also disables the original
// message's buttons. Nothing here starts a process, and every Discord call goes through the bot's
// `request` (the one door, `discordRequest`).

// The three spellings (ADR-007 §4). An answer's index follows its prefix.
const ANSWER_PREFIX = "aof:answer:";
const RESUME_ID = "aof:resume";
const SESSION_ID = "aof:session";
const ID_HEAD = "aof";

// Discord's own limits: five buttons to an action row, and a button label of at most 80 characters.
const MAX_CHOICES = 5;
const MIN_CHOICES = 2;
const LABEL_MAX = 80;
const ACTION_ROW = 1;
const BUTTON = 2;
const PRIMARY = 1;
const SECONDARY = 2;
// The interaction answers this module sends: a deferred reply, shown only to the one who tapped.
const DEFERRED_CHANNEL_MESSAGE = 5;
const EPHEMERAL = 64;
// Discord's ceiling on a message's `content`; a verb's refusal is quoted, so the reply is clipped to it.
const REPLY_MAX = 2000;
// DEFAULT DECISION (ADR-007 §5): how long `Open a session here` waits for the session's link.
const SESSION_WAIT_MS = 45_000;

const HALT_EVENTS = Object.freeze(["loop-halted", "loop-died"]);
const ASK_EVENTS = Object.freeze(["session-needs-input", "session-parked-unanswered"]);

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

// buttonId(action, index) → the `custom_id` of one button: `aof:answer:<index>`, `aof:resume` or
// `aof:session`. Throws for any other action, or an answer without a whole, non-negative index.
export function buttonId(action, index) {
  if (action === "resume") return RESUME_ID;
  if (action === "session") return SESSION_ID;
  if (action === "answer" && Number.isSafeInteger(index) && index >= 0) return `${ANSWER_PREFIX}${index}`;
  throw new TypeError(`no button id for action ${JSON.stringify(action)}${action === "answer" ? ` with index ${JSON.stringify(index)}` : ""}`);
}

// parseButtonId(text) → `{ action, index }` (`index` null unless the action is `answer`), or `null`
// for an id this grammar does not spell. Only the leading segments are read: anything after them is
// ignored, never trusted, because nothing a tap dispatches is read from the id.
export function parseButtonId(text) {
  if (typeof text !== "string") return null;
  const [head, action, index] = text.split(":");
  if (head !== ID_HEAD) return null;
  if (action === "resume" || action === "session") return { action, index: null };
  if (action === "answer" && /^[0-9]{1,2}$/u.test(index ?? "")) return { action, index: Number(index) };
  return null;
}

// choiceLabels(choices) → the labels of an ask's choices: a string is its own label, an object its
// `label` (a codex choice is `{ label, description }`). Anything else is left out.
export function choiceLabels(choices) {
  if (!Array.isArray(choices)) return [];
  return choices
    .map((choice) => (typeof choice === "string" ? choice : isPlainObject(choice) && typeof choice.label === "string" ? choice.label : null))
    .filter((label) => typeof label === "string");
}

// buttonChoices(envelope) → the choices an ask's buttons carry — two to five non-blank labels of at
// most 80 characters each — or `null` when the question cannot be answered with one tap (ADR-007 §1).
export function buttonChoices(envelope) {
  if (!ASK_EVENTS.includes(envelope?.event)) return null;
  const labels = choiceLabels(envelope.choices);
  if (labels.length < MIN_CHOICES || labels.length > MAX_CHOICES) return null;
  if (labels.some((label) => label.trim() === "" || label.length > LABEL_MAX)) return null;
  return labels;
}

const button = (label, customId, style) => ({ type: BUTTON, style, label, custom_id: customId });

// renderButtons(envelope) → the message's `components` — one action row — or `null` when the event
// carries none. The caller decides whether the channel is one a tap can use (`replyable`, ADR-007 §1).
export function renderButtons(envelope) {
  if (HALT_EVENTS.includes(envelope?.event)) {
    return [{ type: ACTION_ROW, components: [button("Resume", buttonId("resume"), PRIMARY), button("Open a session here", buttonId("session"), SECONDARY)] }];
  }
  const labels = buttonChoices(envelope);
  if (labels == null) return null;
  return [{ type: ACTION_ROW, components: labels.map((label, index) => button(label, buttonId("answer", index), SECONDARY)) }];
}

// disabledComponents(components) → the same rows with every button disabled, or `null` when there is
// nothing to disable.
export function disabledComponents(components) {
  if (!Array.isArray(components) || components.length === 0) return null;
  return components.map((row) => ({
    ...row,
    components: Array.isArray(row?.components) ? row.components.map((part) => ({ ...part, disabled: true })) : [],
  }));
}

// Core supplies configured application services; construction performs no I/O.
export function createDiscordButtons({ readIndexedMessage, readAsks, loopAsksDir, resolveWorkspaceId, discordActor }) {
  function refusal(code, text) {
    return { code, content: `${text} (${code})` };
  }

  const expired = () => refusal("discord-button-expired", "This button has expired — its message is no longer one aof can place (a message is kept 30 days). Nothing was run; use the terminal or a slash command instead");

  // The discord channel of `config` whose `channelId` is `channelId`, as `[name, channel]`, or null.
  function channelOf(config, channelId) {
    const channels = config?.work?.notify?.channels;
    if (!isPlainObject(channels)) return null;
    for (const [name, channel] of Object.entries(channels)) {
      if (isPlainObject(channel) && channel.type === "discord" && channel.channelId === channelId) return [name, channel];
    }
    return null;
  }

  // Who answered `ref` first, and when, read from the ask store — never parsed out of a refusal's prose.
  async function firstAnswer(workspace, ref) {
    const asks = await readAsks(loopAsksDir(), { workspaceId: resolveWorkspaceId(workspace) });
    const answered = asks.filter((record) => record.ref === ref && record.state === "answered").at(-1);
    return answered == null ? null : { actor: answered.by?.actor ?? "someone", at: answered.answeredAt };
  }

  // `HH:MM UTC`, then Discord's own relative stamp, which each reader's client renders in its locale.
  function whenOf(iso) {
    const ms = Date.parse(iso ?? "");
    if (!Number.isFinite(ms)) return "earlier";
    return `at ${new Date(ms).toISOString().slice(11, 16)} UTC (<t:${Math.floor(ms / 1000)}:R>)`;
  }

  // A verb's refusal, whether answered as a value (`{ ok: false, code, message }`) or thrown coded.
  // `call` is one literal `invoke("<verb>", …)`, so FF-13112 and FF-19107 read every verb this module
  // reaches.
  async function settle(call) {
    try {
      const answer = await call();
      if (answer?.ok === false) return { refused: true, code: answer.code ?? "refused", message: answer.message ?? null };
      return { refused: false, answer };
    } catch (error) {
      if (typeof error?.code !== "string") throw error;
      return { refused: true, code: error.code, message: error.message };
    }
  }

  // The answer to one tap, after the deferral: `{ action, code?, content, disable }`.
  async function answerTap(interaction, context) {
    const user = interaction.member?.user;
    if (!isPlainObject(interaction.member) || !isPlainObject(user)) {
      return { action: "refused", ...refusal("discord-command-dm", "aof's buttons answer in a project channel, not in a direct message"), disable: false };
    }
    const record = await readIndexedMessage(interaction.message?.id);
    const tap = parseButtonId(interaction.data?.custom_id);
    // The index, never the id, says what the message is. A tap the index cannot place is expired.
    if (record == null || tap == null || record.channelId !== interaction.channel_id || typeof record.projectRoot !== "string" || record.projectRoot.length === 0) {
      return { action: "refused", ...expired(), disable: false };
    }
    const choices = Array.isArray(record.choices) ? record.choices : [];
    const placed = tap.action === "answer"
      ? ASK_EVENTS.includes(record.event) && tap.index < choices.length && typeof choices[tap.index] === "string"
      : HALT_EVENTS.includes(record.event);
    if (!placed) return { action: "refused", ...expired(), disable: false };

    const workspace = await context.loadWorkspace(record.projectRoot);
    const found = channelOf(workspace?.config, record.channelId);
    const key = `work.notify.channels.${found?.[0] ?? "discord"}.allow`;
    const allow = Array.isArray(found?.[1]?.allow) ? found[1].allow : [];
    if (!allow.includes(user.id)) {
      return { action: "refused", ...refusal("discord-button-not-allowed", `You are not on this project's answer list (\`${key}\`), so nothing was run`), disable: false };
    }
    const who = discordActor(user.username);
    const { invoke } = context;

    if (tap.action === "answer") {
      const label = choices[tap.index];
      const result = await settle(() => invoke("work:answer", { ref: record.ref, text: label, as: who, via: "discord" }, { ...(context.answerContext ?? {}), workspace }));
      if (!result.refused) return { action: "answered", content: `${who} answered \`${record.ref}\`: ${label}`, disable: true };
      if (result.code === "ask-already-answered") {
        const first = await firstAnswer(workspace, record.ref).catch(() => null);
        const content = first == null
          ? `\`${record.ref}\` was already answered — the first answer stands. (ask-already-answered)`
          : `\`${record.ref}\` was already answered by ${first.actor} ${whenOf(first.at)} — the first answer stands. (ask-already-answered)`;
        return { action: "refused", code: result.code, content, disable: true };
      }
      return { action: "refused", code: result.code, content: `The answer was not taken (\`${result.code}\`) — answer from the terminal with \`aof work answer ${record.ref} "…"\`.`, disable: false };
    }

    if (tap.action === "resume") {
      const scope = record.scope;
      if (typeof scope !== "string" || scope.length === 0) return { action: "refused", ...expired(), disable: false };
      const result = await settle(() => invoke("work:loop", { scope, handOff: true }, { workspace }));
      if (result.refused) return { action: "refused", code: result.code, content: `Resume ${scope} was refused (${result.code})${result.message ? `: ${result.message}` : ""}`, disable: false };
      return { action: "resumed", content: `${who} handed ${scope} to the supervisor — it relaunches ${scope} with --resume on its next poll`, disable: false };
    }

    const input = {
      project: record.workspaceId,
      ...(typeof record.ref === "string" && record.ref.length > 0 ? { item: record.ref } : {}),
      ...(typeof record.nodeId === "string" && record.nodeId.length > 0 ? { node: record.nodeId } : {}),
      waitMs: SESSION_WAIT_MS,
    };
    const result = await settle(() => invoke("mesh:session-start", input, { workspace }));
    const where = input.item ?? record.scope ?? "the project";
    if (result.refused) return { action: "refused", code: result.code, content: `The session at ${where} was not started (${result.code})${result.message ? `: ${result.message}` : ""}`, disable: false };
    const started = result.answer ?? {};
    const node = started.nodeId ?? input.node ?? "the control";
    const content = typeof started.link === "string" && started.link.length > 0
      ? `Claude is open at ${where} on ${node}: ${started.link}`
      : `A session was started at ${where} on ${node}${started.name ? ` — find it in the Claude app as **${started.name}**` : ""}; it posted no link within ${SESSION_WAIT_MS / 1000}s.`;
    return { action: "session", content, disable: false };
  }

  // handleButton(interaction, context) → `{ action, code?, content }`. `context` is the bot's:
  // `{ request, invoke, loadWorkspace, answerContext }`. The deferral is sent FIRST and the one edit
  // of the deferred reply LAST, whatever happened between.
  async function handleButton(interaction, context) {
    await context.request("POST", `/interactions/${interaction.id}/${interaction.token}/callback`, {
      type: DEFERRED_CHANNEL_MESSAGE,
      data: { flags: EPHEMERAL },
    });
    let outcome;
    try {
      outcome = await answerTap(interaction, context);
    } catch (error) {
      outcome = { action: "failed", content: `The button failed (${error?.code ?? (error instanceof Error ? error.name : "error")}).`, disable: false };
    }
    const content = outcome.content.length > REPLY_MAX ? `${outcome.content.slice(0, REPLY_MAX - 1)}…` : outcome.content;
    await context.request("PATCH", `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
      content,
      allowed_mentions: { parse: [] },
    });
    const disabled = outcome.disable ? disabledComponents(interaction.message?.components) : null;
    if (disabled != null) {
      await context.request("PATCH", `/channels/${interaction.channel_id}/messages/${interaction.message.id}`, { components: disabled });
    }
    return { action: outcome.action, ...(outcome.code == null ? {} : { code: outcome.code }), content };
  }

  return { handleButton };
}
