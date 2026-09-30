// test/discord/discord-replies.test.mjs — milestone 131 / story 10, task 03
// (03_an-allowlisted-reply-answers-the-ask.feature; ADR-008 §3, §5, §6). The answer by reply runs the
// REAL `work:answer` over a real ask file in an isolated home, with `discordRequest` faked, so the
// reaction and the refusal replies are observed as requests (QA ruling 1), and the ask file's state
// is read back from disk (QA ruling 2).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerAsk, loopAsksDir } from "../../packages/core/src/loop/ask-request.mjs";
import { discordActor, handleReply } from "../../packages/core/src/discord/replies.mjs";
import { openGlobalWorkProjectionStore } from "../../packages/core/src/global-work-store.mjs";
import { ALLOWED, ASK_MESSAGE, CHANNEL, NODE, REPLY_MESSAGE, STRANGER, TOKEN, degradeSink, releaseDegradeSink, reply, withReplyWorld } from "./discord-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REACTION = `/channels/${CHANNEL}/messages/${REPLY_MESSAGE}/reactions/%E2%9C%85/@me`;
const REPLY_ROUTE = `/channels/${CHANNEL}/messages`;

export const discordRepliesTests = [
  {
    name: "131/10 task03 — an allowlisted reply answers the ask through work:answer, and the bot reacts ✅ and posts no text",
    async run() {
      degradeSink();
      try {
        await withReplyWorld(async ({ context, discord, invoked, askState }) => {
          const outcome = await handleReply(reply({ from: ALLOWED, username: "umami", text: "take option B" }), context);
          assert.deepEqual(outcome, { action: "answered" });
          const record = await askState();
          assert.equal(record.state, "answered");
          assert.equal(record.answer, "take option B");
          assert.deepEqual(record.by, { actor: "@umami", via: "discord", node: NODE });
          assert.deepEqual(invoked.map((entry) => entry.id), ["work:answer"], "the one answer path is work:answer");
          assert.deepEqual(invoked[0].input, { ref: "131/03", text: "take option B", as: "@umami", via: "discord" });
          assert.deepEqual(discord.map((call) => `${call.method} ${call.route}`), [`PUT ${REACTION}`], "one ✅ reaction and no text message");
        });
      } finally {
        releaseDegradeSink();
      }
    },
  },
  {
    name: "131/10 task03 — what the bot answers to a reply (six rows): the ask file's state, and one reply that pings nobody",
    async run() {
      const rows = [
        ["a stranger", {}, async () => {}, { from: STRANGER, text: "do it" }, "waiting", /not on this project's answer list \(`work\.notify\.channels\.discord\.allow`\)/u],
        ["no allow", { allow: null }, async () => {}, { text: "do it" }, "waiting", /Answering from Discord is off for this project.*`work\.notify\.channels\.discord\.allow`/u],
        ["already answered by @umami", {}, async ({ workspaceId }) => {
          await answerAsk(loopAsksDir(), { workspaceId, ref: "131/03", text: "first", by: { actor: "@umami", via: "discord", node: NODE }, now: () => new Date(Date.now() - 180_000) });
        }, { text: "again" }, "answered", /already answered by @umami <t:\d+:R>/u],
        ["the ask file cleared", {}, async ({ clear }) => { await clear(); }, { text: "late" }, "absent", /`131\/03` is no longer waiting/u],
        ["8,001 characters", {}, async () => {}, { text: "x".repeat(8001) }, "waiting", /too long — at most 8,000 characters/u],
        ["an attachment only", {}, async () => {}, { text: "" }, "waiting", /the answer is empty/iu],
      ];
      for (const [label, world, given, message, state, line] of rows) {
        degradeSink();
        try {
          await withReplyWorld(async (w) => {
            await given(w);
            const outcome = await handleReply(reply(message), w.context);
            assert.equal(outcome.action, "refused", `${label}: refused`);
            assert.equal((await w.askState()).state, state, `${label}: the ask file reads ${state}`);
            assert.equal(w.discord.length, 1, `${label}: one reply`);
            const [call] = w.discord;
            assert.equal(`${call.method} ${call.route}`, `POST ${REPLY_ROUTE}`, `${label}: a reply in the channel`);
            assert.match(call.body.content, line, `${label}: ${call.body.content}`);
            assert.deepEqual(call.body.message_reference, { message_id: REPLY_MESSAGE }, `${label}: to the user's message`);
            assert.deepEqual(call.body.allowed_mentions, { parse: [], replied_user: false }, `${label}: pinging nobody`);
            if (state === "answered") assert.equal((await w.askState()).answer, "first", `${label}: the first answer stands`);
          }, world);
        } finally {
          releaseDegradeSink();
        }
      }
    },
  },
  {
    name: "131/10 task03 — messages the bot ignores in silence (four rows): no request, no invoke, the ask still waiting",
    async run() {
      for (const [label, message] of [
        ["a bot author", reply({ bot: true })],
        ["no message_reference", reply({ to: null })],
        ["a reply to an unindexed message", reply({ to: "900000000000000999" })],
        ["a reply posted in another channel", reply({ channel: "444444444444444444" })],
      ]) {
        await withReplyWorld(async ({ context, discord, invoked, askState }) => {
          const outcome = await handleReply(message, context);
          assert.equal(outcome.action, "ignored", label);
          assert.deepEqual(discord, [], `${label}: no request is sent to Discord`);
          assert.deepEqual(invoked, [], `${label}: work:answer is not invoked`);
          assert.equal((await askState()).state, "waiting", `${label}: the ask still waits`);
        });
      }
    },
  },
  {
    name: "131/10 task03 — the actor is @<username> clipped to 80 code points, @discord-user when the name fails the verb's check, and never a user id",
    run() {
      assert.equal(discordActor("umami"), "@umami");
      assert.equal([...discordActor("é".repeat(200))].length, 80);
      assert.equal(discordActor("bad\u0007name"), "@discord-user");
      assert.equal(discordActor(""), "@discord-user");
      assert.equal(discordActor(undefined), "@discord-user");
      assert.ok(!discordActor("umami").includes(ALLOWED), "never the user id");
    },
  },
  {
    name: "131/10 task03 — the CLI face still has no via flag: --via discord is refused as an unknown flag, and the ask still waits",
    async run() {
      await withReplyWorld(async ({ root, home, askState }) => {
        const run = spawnSync(process.execPath, [path.join(repoRoot, "bin", "aof.mjs"), "work", "answer", "131/03", "x", "--via", "discord", "--json"], {
          cwd: root, encoding: "utf8", windowsHide: true, env: { ...process.env, AOF_GLOBAL_HOME: home },
        });
        assert.notEqual(run.status, 0, "refused");
        assert.equal(JSON.parse(run.stdout).code, "unknown-flag", run.stdout);
        assert.equal((await askState()).state, "waiting");
      });
    },
  },
  {
    name: "131/10 task03 — the reply handler's index lookup is the index's: the record names the ask message and its channel",
    async run() {
      await withReplyWorld(async () => {
        const { readAskMessage } = await import("../../packages/core/src/notify/ask-messages.mjs");
        const record = await readAskMessage(ASK_MESSAGE);
        assert.equal(record.channelId, CHANNEL);
        assert.equal(record.ref, "131/03");
      });
    },
  },
  {
    name: "131/12 task03 — a Discord reply answers a worker's ask through the worker's resume, announces session-answered once, and reacts",
    async run() {
      degradeSink();
      try {
        await withReplyWorld(async ({ context, discord, workspaceId, clear }) => {
          // No local ask file: the question is a WORKER's, parked on the control's assignment row.
          await clear();
          const store = await openGlobalWorkProjectionStore({ env: process.env });
          try {
            store.db.prepare(`
              INSERT INTO global_assignments (assignment_id, item_ref, workspace_id, target_node_id, issuer, state, run_id, assigned_at, updated_at, session_id, code, ask)
              VALUES ('asg-w', '131/03', ?, 'node-2976', 'node-7297', 'running', 'run-w', '2026-09-25T11:00:00.000Z', '2026-09-25T11:30:00.000Z', 'sess-w', 'needs-input', ?)
            `).run(workspaceId, JSON.stringify({ question: "Which option?", phase: "build", askedAt: "2026-09-25T11:30:00.000Z" }));
          } finally {
            store.close();
          }
          const resumes = [];
          const posts = [];
          const fetch = async (url, init) => {
            posts.push(JSON.parse(init.body));
            return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id: "990000000000000002" }) };
          };
          const worker = {
            ...context,
            answerContext: {
              notifyOptions: { env: { AOF_DISCORD_BOT_TOKEN: TOKEN }, fetch },
              invokeRegistered: async (id, input) => { resumes.push({ id, input }); return { confirmed: true, confirmedRunId: "run-w" }; },
            },
          };
          const outcome = await handleReply(reply({ from: ALLOWED, username: "umami", text: "take option B" }), worker);
          assert.deepEqual(outcome, { action: "answered" });
          assert.equal(resumes.length, 1, "mesh:terminal-resume was invoked once");
          assert.equal(resumes[0].id, "mesh:terminal-resume");
          assert.equal(resumes[0].input.session, "sess-w");
          assert.equal(resumes[0].input.answer.text, "take option B");
          assert.equal(resumes[0].input.answer.by.via, "discord");
          assert.equal(posts.length, 1, "exactly one session-answered POST");
          assert.match(posts[0].content, /^\*\*131\/03 — answered by @umami\*\* \(build, /u, "with the worker's phase and wait");
          assert.deepEqual(discord.map((call) => call.method), ["PUT"], "and the reply gets a ✅ reaction");
        });
      } finally {
        releaseDegradeSink();
      }
    },
  },
];
