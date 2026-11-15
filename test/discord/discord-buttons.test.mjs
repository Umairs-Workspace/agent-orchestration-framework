import { defaultApplication as _aofApplication } from "aof/default-application";
// test/discord/discord-buttons.test.mjs — milestone 191 / story 07 (ADR-007): the buttons on a
// notification. Task 01 (01_the-right-notifications-carry-buttons.feature): which posted messages
// carry `components`, the one `custom_id` grammar, and what the index records for a message posted
// with buttons — each case through the real `notify` with an injected `fetch`, under a fresh global
// home. Task 02 (02_a-tap-is-checked-and-dispatched-like-a-reply.feature): a tap is deferred first,
// placed by the index, held to the record's own channel `allow` and dispatched to one of three verbs
// — over a recording context, and E4/E6 end to end over the reply background's real `work:answer`.
// The bot's routing of a type-3 interaction is driven through `createDiscordBot` with spies.
import assert from "node:assert/strict";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buttonId, parseButtonId } from "@aof/messaging/discord-buttons";
import { createDiscordBot } from "@aof/messaging/bot";
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { ALLOWED, CHANNEL, STRANGER, TOKEN, withReplyWorld } from "./discord-fixture.mjs";
const buildNotifyEnvelope = _aofApplication.messaging.notify.buildNotifyEnvelope;
const notify = _aofApplication.messaging.notify.notify;
const recordAskMessage = _aofApplication.messaging.askMessages.recordAskMessage;
const readIndexedMessage = _aofApplication.messaging.askMessages.readIndexedMessage;
const readAskMessage = _aofApplication.messaging.askMessages.readAskMessage;
const handleButton = _aofApplication.messaging.discord.buttons.handleButton;

const NOW = () => new Date("2026-11-12T10:00:00.000Z");
const NODE = "node-6eb3";
// Message ids are snowflakes; the contract's "9001" and "9002" name these.
const HALT_MESSAGE = "900100000000000001";
const ASK_MESSAGE_2 = "900200000000000002";
const PRUNED_MESSAGE = "800000000000000008";
const APP = "800000000000000000";
const GUILD = "700000000000000000";

const labelsOf = (body) => (body.components ?? []).flatMap((row) => row.components).map((part) => part.label);
const idsOf = (body) => (body.components ?? []).flatMap((row) => row.components).map((part) => part.custom_id);

// A project whose `discord` channel is CHANNEL, `allow` omitted when null.
const projectConfig = (allow) => ({
  name: "aof",
  mesh: { nodeId: NODE },
  work: { notify: { channels: { discord: { type: "discord", channelId: CHANNEL, ...(allow == null ? {} : { allow }) } } } },
});

// withHome(body) — a fresh global home on the process (the index is the process's).
async function withHome(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-discord-buttons-")));
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = path.join(tmp, "home");
  try {
    return await body({ root: path.join(tmp, "project") });
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}

// posting(id) → a fetch answering every post with message `id`, and the bodies it was handed.
function posting(id) {
  const bodies = [];
  const fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id }) };
  };
  return { fetch, bodies };
}

// deliver(event, fields, { allow, id }) → the body posted for one envelope, and the workspace.
async function deliver(root, event, fields, { allow = [ALLOWED], id = HALT_MESSAGE } = {}) {
  const workspace = { projectRoot: root, config: projectConfig(allow) };
  const envelope = buildNotifyEnvelope(event, fields, { config: workspace.config, now: NOW });
  const { fetch, bodies } = posting(id);
  const answer = await notify(workspace, envelope, { env: { AOF_DISCORD_BOT_TOKEN: TOKEN }, fetch, timeoutMs: 200 });
  assert.deepEqual(answer.delivered, ["discord"], `${event} was delivered`);
  return { body: bodies[0], workspace };
}
const HALT = { ref: "191", elapsedMs: 60000, stop: { id: "gate-red", producer: "gate", remedy: "fix the gate", ref: "191/02" } };
const DIED = { ref: "191", elapsedMs: 60000, outcome: { cause: "daemon-restarted" } };
const ASK = (choices) => ({ ref: "191/02", phase: "build", elapsedMs: 60000, question: "Ship it?", ...(choices === undefined ? {} : { choices }) });

// ── task 02's background: a recording context over a fresh home ───────────────────────────────

// tapWorld(body, { answers }) — workspace "ws-a" ("aof") whose channel allows ALLOWED (@sam); a
// context whose every request and invoke is recorded in one sequence; `answers[id]` is what an
// invoke of verb `id` answers (a function may throw).
async function tapWorld(body, { answers = {} } = {}) {
  return withHome(async ({ root }) => {
    const workspace = { projectRoot: root, config: projectConfig([ALLOWED]) };
    const workspaceId = resolveWorkspaceId(workspace);
    const sequence = [];
    const context = {
      request: async (method, route, payload) => { sequence.push({ kind: "request", method, route, body: payload }); return { ok: true, status: 200, json: null }; },
      invoke: async (id, input, ctx) => {
        sequence.push({ kind: "invoke", id, input, workspace: ctx?.workspace });
        const answer = answers[id];
        return typeof answer === "function" ? answer(input) : answer ?? { ok: true };
      },
      loadWorkspace: async (projectRoot) => (projectRoot === root ? workspace : { projectRoot, config: {} }),
      answerContext: {},
    };
    const index = (messageId, fields) => recordAskMessage({ messageId, channelId: CHANNEL, workspaceId, projectRoot: root, ...fields });
    const invokes = () => sequence.filter((entry) => entry.kind === "invoke");
    const edit = () => sequence.filter((entry) => entry.kind === "request" && entry.route.endsWith("/messages/@original")).at(-1)?.body?.content;
    return body({ root, workspace, workspaceId, context, sequence, index, invokes, edit });
  });
}

// tap({ id, message, user, username, member, components }) → a type-3 INTERACTION_CREATE payload.
function tap({ id, message, user = ALLOWED, username = "sam", member = true, components = null }) {
  return {
    id: "600000000000000001",
    token: "itoken",
    application_id: APP,
    type: 3,
    channel_id: CHANNEL,
    guild_id: GUILD,
    ...(member ? { member: { user: { id: user, username } } } : { user: { id: user, username } }),
    message: { id: message, channel_id: CHANNEL, ...(components == null ? {} : { components }) },
    data: { custom_id: id, component_type: 2 },
  };
}

const describe = (sequence) => sequence.map((entry) => (entry.kind === "invoke" ? `invoke ${entry.id}` : `${entry.method} ${entry.route}`)).join(" → ");

export const discordButtonsTests = [
  // ── task 01 ─────────────────────────────────────────────────────────────────────────────────────
  {
    name: "191/07 task01 — every custom_id comes from the one grammar, and parseButtonId reads each back",
    run: () => withHome(async ({ root }) => {
      const halt = await deliver(root, "loop-halted", HALT);
      const ask = await deliver(root, "session-needs-input", ASK(["Yes, ship it", "No, hold"]), { id: ASK_MESSAGE_2 });
      assert.deepEqual([...idsOf(halt.body), ...idsOf(ask.body)], ["aof:resume", "aof:session", "aof:answer:0", "aof:answer:1"]);
      assert.deepEqual(idsOf(halt.body), [buttonId("resume"), buttonId("session")], "buttonId spells the halt's two");
      assert.deepEqual(["aof:resume", "aof:session", "aof:answer:0", "aof:answer:1"].map(parseButtonId), [
        { action: "resume", index: null }, { action: "session", index: null }, { action: "answer", index: 0 }, { action: "answer", index: 1 },
      ]);
      for (const bad of ["aof:delete", "aof:answer:", "aof:answer:x", "other:resume", "", null]) assert.equal(parseButtonId(bad), null, JSON.stringify(bad));
      assert.throws(() => buttonId("delete"), TypeError);
    }),
  },
  {
    name: "191/07 task01 — a halt's message is indexed with its scope and node, its ref the halted item",
    run: () => withHome(async ({ root }) => {
      const { workspace } = await deliver(root, "loop-halted", HALT, { id: HALT_MESSAGE });
      const record = await readIndexedMessage(HALT_MESSAGE);
      assert.deepEqual(
        { event: record.event, scope: record.scope, nodeId: record.nodeId, ref: record.ref, workspaceId: record.workspaceId, projectRoot: record.projectRoot, channelId: record.channelId },
        { event: "loop-halted", scope: "191", nodeId: NODE, ref: "191/02", workspaceId: resolveWorkspaceId(workspace), projectRoot: root, channelId: CHANNEL },
      );
      assert.equal(await readAskMessage(HALT_MESSAGE), null, "a halt's record is not an ask's: a reply to it answers nothing");
    }),
  },
  {
    name: "191/07 task01 — an ask's message is indexed with the choices it rendered, in order",
    run: () => withHome(async ({ root }) => {
      await deliver(root, "session-needs-input", ASK(["Yes, ship it", "No, hold"]), { id: ASK_MESSAGE_2 });
      const record = await readAskMessage(ASK_MESSAGE_2);
      assert.deepEqual(record.choices, ["Yes, ship it", "No, hold"]);
      assert.equal(record.ref, "191/02");
      assert.ok(!("scope" in record) && !("nodeId" in record), "an ask's record adds no halt keys");
    }),
  },
  {
    name: "191/07 task01 — the other events carry no buttons (two rows)",
    run: () => withHome(async ({ root }) => {
      for (const [event, fields] of [
        ["session-answered", { ref: "191/02", outcome: { by: "@kim", answer: "No, hold" } }],
        ["loop-relaunched", { ref: "191", outcome: { cause: "daemon-restarted" } }],
      ]) {
        const { body } = await deliver(root, event, fields);
        assert.ok(!("components" in body), `${event}: no components`);
      }
    }),
  },
  {
    name: "191/07 task01 R1 E1 — a halt or a death in an allowlisted channel carries Resume and Open a session here (two rows)",
    run: () => withHome(async ({ root }) => {
      for (const [event, fields] of [["loop-halted", HALT], ["loop-died", DIED]]) {
        const { body } = await deliver(root, event, fields);
        assert.deepEqual(labelsOf(body), ["Resume", "Open a session here"], event);
        assert.equal(body.components.length, 1, `${event}: one action row`);
        assert.equal(body.components[0].type, 1);
        assert.ok(body.components[0].components.every((part) => part.type === 2), "buttons");
        assert.deepEqual(body.allowed_mentions, { parse: [] }, "and still pings no one");
      }
      const died = await readIndexedMessage(HALT_MESSAGE);
      assert.deepEqual({ event: died.event, scope: died.scope, ref: died.ref }, { event: "loop-died", scope: "191", ref: null }, "a death names its scope and no item");
    }),
  },
  {
    name: "191/07 task01 R1 E2 — a channel with no allowlist gets no buttons, and its halt is not indexed",
    run: () => withHome(async ({ root }) => {
      for (const allow of [null, []]) {
        const { body } = await deliver(root, "loop-halted", HALT, { allow });
        assert.ok(!("components" in body), `allow ${JSON.stringify(allow)}: no components`);
      }
      assert.equal(await readIndexedMessage(HALT_MESSAGE), null, "a halt with no buttons has nothing to tap, so nothing is indexed");
    }),
  },
  {
    name: "191/07 task01 R2 E4 — a two-choice question carries one button per choice, in order",
    run: () => withHome(async ({ root }) => {
      const { body } = await deliver(root, "session-needs-input", ASK(["Yes, ship it", "No, hold"]), { id: ASK_MESSAGE_2 });
      assert.deepEqual(labelsOf(body), ["Yes, ship it", "No, hold"]);
      assert.match(body.content, /Answer: reply to this message, or `aof work answer 191\/02 "…"`/u, "the reply still answers too");
    }),
  },
  {
    name: "191/07 task01 R2 E5 — a question the buttons cannot carry is answered by reply (four rows)",
    run: () => withHome(async ({ root }) => {
      for (const [label, choices] of [
        ["6 choices", ["A", "B", "C", "D", "E", "F"]],
        ["a choice of 81 characters", ["x".repeat(81), "short"]],
        ["one choice", ["only one"]],
        ["no choices", undefined],
      ]) {
        const { body } = await deliver(root, "session-needs-input", ASK(choices), { id: ASK_MESSAGE_2 });
        assert.ok(!("components" in body), `${label}: no components`);
        assert.match(body.content, /Answer: reply to this message/u, `${label}: its action line says to answer by reply`);
        assert.ok(!("choices" in (await readAskMessage(ASK_MESSAGE_2))), `${label}: the record holds no rendered choices`);
      }
    }),
  },
  {
    name: "191/07 task01 R2 — a parked question with three choices carries three buttons",
    run: () => withHome(async ({ root }) => {
      const { body } = await deliver(root, "session-parked-unanswered", { ...ASK(["A", "B", "C"]), outcome: { askedAt: "2026-11-12T09:00:00.000Z", parkedAt: "2026-11-12T10:00:00.000Z" } }, { id: ASK_MESSAGE_2 });
      assert.deepEqual(labelsOf(body), ["A", "B", "C"]);
      assert.deepEqual(idsOf(body), ["aof:answer:0", "aof:answer:1", "aof:answer:2"]);
      assert.deepEqual((await readAskMessage(ASK_MESSAGE_2)).choices, ["A", "B", "C"]);
    }),
  },

  // ── task 02 ─────────────────────────────────────────────────────────────────────────────────────
  {
    name: "191/07 task02 — tapping Resume is deferred ephemerally first, then hands the loop to the supervisor",
    run: () => tapWorld(async ({ index, context, sequence, invokes, edit, workspace }) => {
      await index(HALT_MESSAGE, { event: "loop-halted", ref: "191/02", scope: "191", nodeId: NODE });
      const result = await handleButton(tap({ id: "aof:resume", message: HALT_MESSAGE }), context);
      assert.equal(result.action, "resumed");
      assert.equal(sequence[0].kind, "request", `the deferral is sent before anything else: ${describe(sequence)}`);
      assert.equal(sequence[0].route, "/interactions/600000000000000001/itoken/callback");
      assert.deepEqual(sequence[0].body, { type: 5, data: { flags: 64 } }, "deferred ephemerally");
      assert.deepEqual(invokes().map(({ id, input }) => ({ id, input })), [{ id: "work:loop", input: { scope: "191", handOff: true } }]);
      assert.equal(invokes()[0].workspace, workspace, "in workspace ws-a, the index record's");
      assert.match(edit(), /@sam handed 191 to the supervisor — it relaunches 191 with --resume on its next poll/u);
    }),
  },
  {
    name: "191/07 task02 — a tap the index cannot place is expired and dispatches nothing (two rows)",
    run: () => tapWorld(async ({ index, context, invokes, edit }) => {
      await index(ASK_MESSAGE_2, { event: "session-needs-input", ref: "191/02", choices: ["A", "B"] });
      await index(HALT_MESSAGE, { event: "loop-halted", ref: "191/02", scope: "191", nodeId: NODE });
      for (const [id, message] of [["aof:answer:7", ASK_MESSAGE_2], ["aof:delete", HALT_MESSAGE], ["aof:resume", ASK_MESSAGE_2], ["aof:answer:0", HALT_MESSAGE]]) {
        const result = await handleButton(tap({ id, message }), context);
        assert.equal(result.code, "discord-button-expired", `${id} on ${message}`);
        assert.match(edit(), /discord-button-expired/u);
      }
      assert.equal(invokes().length, 0, "no verb is invoked");
    }),
  },
  {
    name: "191/07 task02 — a tap from a direct message is refused discord-command-dm and invokes nothing",
    run: () => tapWorld(async ({ index, context, invokes, edit }) => {
      await index(HALT_MESSAGE, { event: "loop-halted", ref: "191/02", scope: "191", nodeId: NODE });
      const result = await handleButton(tap({ id: "aof:resume", message: HALT_MESSAGE, member: false }), context);
      assert.equal(result.code, "discord-command-dm");
      assert.match(edit(), /discord-command-dm/u);
      assert.equal(invokes().length, 0);
    }),
  },
  {
    name: "191/07 task02 — the bot routes a type-3 interaction to handleButton, and slash commands still reach handleInteraction",
    async run() {
      const seen = [];
      let dispatch = null;
      const { startDiscordBot } = createDiscordBot({
        reportDegrade: () => {},
        REGISTER_INTERVAL_MS: 3_600_000,
        createRegistrar: () => ({ register: async () => {} }),
        handleInteraction: async (d) => { seen.push(["handleInteraction", d.type]); },
        handleButton: async (d) => { seen.push(["handleButton", d.type]); },
        handleReply: async () => {},
        startGateway: () => ({ stop() {} }),
      });
      const bot = startDiscordBot({ token: TOKEN, servedWorkspaces: async () => [], gateway: ({ onDispatch }) => { dispatch = onDispatch; return { stop() {} }; } });
      try {
        await dispatch("INTERACTION_CREATE", { type: 2 });
        await dispatch("INTERACTION_CREATE", { type: 4 });
        await dispatch("INTERACTION_CREATE", { type: 3 });
        assert.deepEqual(seen, [["handleInteraction", 2], ["handleInteraction", 4], ["handleButton", 3]]);
      } finally {
        bot.stop();
      }
    },
  },
  {
    name: "191/07 task02 R1 E3 — Open a session here starts Claude at the halted item, and the reply carries the link or the session's name",
    run: () => tapWorld(async ({ index, context, invokes, edit, workspaceId }) => {
      await index(HALT_MESSAGE, { event: "loop-halted", ref: "191/02", scope: "191", nodeId: NODE });
      context.invoke = (() => {
        const inner = context.invoke;
        let n = 0;
        return async (id, input, ctx) => {
          await inner(id, input, ctx);
          n += 1;
          return n === 1
            ? { ok: true, outcome: "started", nodeId: NODE, name: "aof · s1", link: "https://claude.ai/code/session_1" }
            : { ok: true, outcome: "no-link", nodeId: NODE, name: "aof · s2", link: null };
        };
      })();
      await handleButton(tap({ id: "aof:session", message: HALT_MESSAGE }), context);
      assert.deepEqual(invokes()[0].input, { project: workspaceId, item: "191/02", node: NODE, waitMs: 45000 });
      assert.equal(invokes()[0].id, "mesh:session-start");
      assert.match(edit(), /https:\/\/claude\.ai\/code\/session_1/u, "the link");
      await handleButton(tap({ id: "aof:session", message: HALT_MESSAGE }), context);
      assert.match(edit(), /aof · s2/u, "with no link, the session's name");
      assert.match(edit(), /Claude app/u, "and where to find it");
    }),
  },
  {
    name: "191/07 task02 R2 E4 — tapping a choice answers the ask with its label, as @<username> via discord, and disables the buttons",
    async run() {
      await withReplyWorld(async ({ context, workspace, workspaceId, askState, discord }) => {
        await recordAskMessage({ messageId: ASK_MESSAGE_2, channelId: CHANNEL, event: "session-needs-input", ref: "131/03", workspaceId, projectRoot: workspace.projectRoot, choices: ["Yes, ship it", "No, hold"] });
        const components = [{ type: 1, components: [{ type: 2, style: 2, label: "Yes, ship it", custom_id: "aof:answer:0" }, { type: 2, style: 2, label: "No, hold", custom_id: "aof:answer:1" }] }];
        const result = await handleButton(tap({ id: "aof:answer:1", message: ASK_MESSAGE_2, username: "sam", components }), context);
        assert.equal(result.action, "answered", result.content);
        const record = await askState();
        assert.deepEqual([record.state, record.answer, record.by.actor, record.by.via], ["answered", "No, hold", "@sam", "discord"]);
        const disable = discord.find((call) => call.method === "PATCH" && call.route === `/channels/${CHANNEL}/messages/${ASK_MESSAGE_2}`);
        assert.ok(disable != null, `message ${ASK_MESSAGE_2}'s buttons are edited: ${discord.map((c) => `${c.method} ${c.route}`).join(", ")}`);
        assert.ok(disable.body.components[0].components.every((part) => part.disabled === true), "to disabled");
      });
    },
  },
  {
    name: "191/07 task02 R2 E6 — a second tap names who answered and when, disables the buttons, and records no second answer",
    async run() {
      await withReplyWorld(async ({ context, workspace, workspaceId, askState, discord }) => {
        await recordAskMessage({ messageId: ASK_MESSAGE_2, channelId: CHANNEL, event: "session-needs-input", ref: "131/03", workspaceId, projectRoot: workspace.projectRoot, choices: ["Yes, ship it", "No, hold"] });
        const components = [{ type: 1, components: [{ type: 2, style: 2, label: "Yes, ship it", custom_id: "aof:answer:0" }] }];
        await handleButton(tap({ id: "aof:answer:1", message: ASK_MESSAGE_2, username: "kim", components }), context);
        const first = await askState();
        const before = discord.length;
        const second = await handleButton(tap({ id: "aof:answer:0", message: ASK_MESSAGE_2, username: "sam", components }), context);
        assert.equal(second.code, "ask-already-answered");
        const hhmm = new Date(first.answeredAt).toISOString().slice(11, 16);
        assert.match(second.content, /@kim/u, "names who answered");
        assert.ok(second.content.includes(hhmm), `and when (${hhmm}): ${second.content}`);
        assert.ok(discord.slice(before).some((call) => call.method === "PATCH" && call.route === `/channels/${CHANNEL}/messages/${ASK_MESSAGE_2}` && call.body.components[0].components.every((part) => part.disabled)), "the buttons are edited to disabled");
        const after = await askState();
        assert.deepEqual([after.answer, after.by.actor, after.answeredAt], ["No, hold", "@kim", first.answeredAt], "no second answer is recorded");
      });
    },
  },
  {
    name: "191/07 task02 R3 E7 — a user not on the allowlist is refused discord-button-not-allowed, naming the allowlist key, and nothing is invoked",
    run: () => tapWorld(async ({ index, context, invokes, edit }) => {
      await index(HALT_MESSAGE, { event: "loop-halted", ref: "191/02", scope: "191", nodeId: NODE });
      const result = await handleButton(tap({ id: "aof:resume", message: HALT_MESSAGE, user: STRANGER }), context);
      assert.equal(result.code, "discord-button-not-allowed");
      assert.match(edit(), /`work\.notify\.channels\.discord\.allow`/u, "names the allowlist key");
      assert.equal(invokes().length, 0);
    }),
  },
  {
    name: "191/07 task02 R3 E8 — a tap on a pruned message is expired and dispatches nothing",
    run: () => tapWorld(async ({ index, context, invokes, edit, sequence }) => {
      // Written 31 days ago, then pruned by the next write — the index's own 30-day prune.
      await recordAskMessage({ messageId: PRUNED_MESSAGE, channelId: CHANNEL, event: "loop-halted", ref: "191/02", workspaceId: "ws-a", projectRoot: "/nowhere", scope: "191", nodeId: NODE }, { now: () => new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) });
      await index(HALT_MESSAGE, { event: "loop-halted", ref: "191/02", scope: "191", nodeId: NODE });
      assert.equal(await readIndexedMessage(PRUNED_MESSAGE), null, "the 31-day record was pruned");
      const result = await handleButton(tap({ id: "aof:resume", message: PRUNED_MESSAGE }), context);
      assert.equal(result.code, "discord-button-expired");
      assert.match(edit(), /discord-button-expired/u);
      assert.equal(invokes().length, 0, "no verb is invoked");
      assert.deepEqual(sequence.map((entry) => entry.method), ["POST", "PATCH"], "the deferral, then the one edit — nothing else");
    }),
  },
];
