import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// test/discord/discord-commands.test.mjs — milestone 131 / story 11, tasks 00 to 04 (ADR-009). The
// slash commands: the table and its per-guild registration (00), the deferral before any dispatch and
// the allowlist that decides who reaches what (01), the two views over `work:list` (02), `/loop stop`
// through 130's verb (03) and `/loop resume` handing the loop to the supervisor (04). The requests
// are observed through a faked `discordRequest` (00 QA ruling 1), the hour and the gateway are 10's
// fakes, and `invoke` is injected and records its calls (01 QA ruling 1) — except where a case runs
// the REAL verb over real run records, to read back what it wrote.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const COMMANDS = _aofApplication.messaging.discord.commands.COMMANDS;
const REGISTER_INTERVAL_MS = _aofApplication.messaging.discord.commands.REGISTER_INTERVAL_MS;
const clipReply = _aofApplication.messaging.discord.commands.clipReply;
const handleInteraction = _aofApplication.messaging.discord.commands.handleInteraction;
const statusLine = _aofApplication.messaging.discord.commands.statusLine;
const startDiscordBot = _aofApplication.messaging.discord.bot.startDiscordBot;
const startGateway = _aofApplication.messaging.discord.gateway.startGateway;
const recordAskMessage = _aofApplication.messaging.askMessages.recordAskMessage;
const loopResumesDir = _aofApplication.loop.stopRequest.loopResumesDir;
const loopStopsDir = _aofApplication.loop.stopRequest.loopStopsDir;
const readStopRequest = _aofApplication.loop.stopRequest.readStopRequest;
const requestLoopStop = _aofApplication.loop.stopRequest.requestLoopStop;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";
import { TOKEN, degradeSink, fakeClock, fakeGateway, flush, releaseDegradeSink } from "./discord-fixture.mjs";

const CHANNEL = "111111111111111111";
const GUILD = "900000000000000000";
const APP = "800000000000000000";
const ALPHA_USER = "222222222222222222";
const BETA_USER = "333333333333333333";
const NOW = new Date("2026-09-25T12:00:00.000Z");

// A served workspace as the bot reads one: a project root and its config.
const served = (name, { channelId = CHANNEL, allow } = {}) => ({
  projectRoot: path.join(os.tmpdir(), "aof-discord-commands", name),
  config: { name, work: { notify: { channels: { discord: { type: "discord", channelId, ...(allow ? { allow } : {}) } } } } },
});
const ALPHA = served("alpha", { allow: [ALPHA_USER] });
const BETA = served("beta", { allow: [BETA_USER] });

// An interaction as the gateway hands it: a command, its options, a member and a channel.
function interaction({ name = "status", sub = null, options = {}, user = ALPHA_USER, username = "umami", channel = CHANNEL, member = true } = {}) {
  const strings = Object.entries(options).map(([key, value]) => ({ type: 3, name: key, value }));
  return {
    id: "700000000000000001",
    token: "interaction-token",
    application_id: APP,
    type: 2,
    channel_id: channel,
    guild_id: GUILD,
    ...(member ? { member: { user: { id: user, username } } } : { user: { id: user, username } }),
    data: { name, options: sub == null ? strings : [{ type: 1, name: sub, options: strings }] },
  };
}

// The bot's context over fakes: every request and every invoke recorded, in one ordered sequence.
function context({ workspaces = [ALPHA, BETA], invoke } = {}) {
  const sequence = [];
  return {
    sequence,
    request: async (method, route, body) => {
      sequence.push({ kind: "request", method, route, body });
      return { ok: true, status: 200, json: null, reason: null, retryAfter: null };
    },
    invoke: async (id, input, ctx) => {
      sequence.push({ kind: "invoke", id, input, workspace: path.basename(ctx.workspace.projectRoot) });
      return invoke ? invoke(id, input, ctx) : [];
    },
    servedWorkspaces: async () => workspaces,
    now: () => NOW,
  };
}
const invokes = (sequence) => sequence.filter((entry) => entry.kind === "invoke");
const edit = (sequence) => sequence.filter((entry) => entry.kind === "request" && entry.method === "PATCH").at(-1)?.body?.content;

export const discordCommandsTests = [
  // ── task 00: the table and its registration ─────────────────────────────────────────────────
  {
    name: "131/11 task00 (191/05) — the table is the four commands: status, asks, and loop with stop and resume, each taking scope and project",
    run() {
      assert.deepEqual(COMMANDS.map((command) => command.name), ["status", "asks", "loop"]);
      const optionsOf = (list) => Object.fromEntries(list.map((option) => [option.name, option]));
      for (const command of COMMANDS.slice(0, 2)) assert.deepEqual(optionsOf(command.options).project, { type: 3, name: "project", description: optionsOf(command.options).project.description, required: false, autocomplete: true });
      const loop = COMMANDS[2];
      assert.deepEqual(loop.options.map((sub) => [sub.name, sub.type]), [["stop", 1], ["resume", 1]]);
      for (const sub of loop.options) {
        const options = optionsOf(sub.options);
        assert.equal(options.scope.type, 3);
        assert.equal(options.scope.required, true, `${sub.name}: a required string scope`);
        assert.equal(options.project.required, false, `${sub.name}: an optional string project`);
        assert.equal(options.project.autocomplete, true, `${sub.name}: an autocompleted project`);
      }
      assert.ok(Object.isFrozen(COMMANDS));
    },
  },
  {
    name: "131/11 task00 — READY registers the table once per guild, a failed lookup skips only its channel, and the hourly pass registers only what changed",
    async run() {
      const events = degradeSink();
      try {
        const clock = fakeClock();
        const fake = fakeGateway();
        const calls = [];
        const guildOf = { "111111111111111111": GUILD, "222222222222222222": GUILD, "444444444444444444": "910000000000000000" };
        let workspaces = [served("alpha", { channelId: "111111111111111111" }), served("beta", { channelId: "222222222222222222" }), served("gamma", { channelId: "555555555555555555" })];
        const fetch = async (url, init) => {
          const route = url.replace("https://discord.com/api/v10", "");
          calls.push({ method: init.method, route, body: init.body == null ? null : JSON.parse(init.body) });
          const channel = /^\/channels\/(\d+)$/u.exec(route)?.[1];
          if (channel != null) {
            return guildOf[channel] == null
              ? { status: 404, headers: { get: () => "application/json" }, json: async () => ({}) }
              : { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id: channel, guild_id: guildOf[channel] }) };
          }
          return { status: 200, headers: { get: () => "application/json" }, json: async () => [] };
        };
        const bot = startDiscordBot({
          token: TOKEN,
          fetch,
          timers: clock.timers,
          servedWorkspaces: async () => workspaces,
          gateway: (options) => startGateway({ ...options, request: fake.request, socketFactory: fake.socketFactory, timers: clock.timers, random: () => 0.5 }),
        });
        try {
          await flush();
          fake.current().receive({ op: 0, t: "READY", s: 1, d: { session_id: "s1", resume_gateway_url: "wss://resume.example.test", application: { id: APP } } });
          for (let i = 0; i < 100 && !calls.some((call) => call.method === "PUT"); i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
          await flush();
          assert.deepEqual(calls.filter((call) => call.method === "GET").map((call) => call.route).sort(), ["/channels/111111111111111111", "/channels/222222222222222222", "/channels/555555555555555555"]);
          const puts = calls.filter((call) => call.method === "PUT");
          assert.deepEqual(puts.map((call) => call.route), [`/applications/${APP}/guilds/${GUILD}/commands`], "exactly one PUT for the one guild both channels live in");
          assert.deepEqual(puts[0].body, JSON.parse(JSON.stringify(COMMANDS)), "whose body is the table");
          const failed = events.filter((event) => event.code === "discord-command-register-failed");
          assert.equal(failed.length, 1);
          assert.match(failed[0].message, /555555555555555555/u, "the failed channel is named");

          calls.length = 0;
          await clock.advance(REGISTER_INTERVAL_MS);
          for (let i = 0; i < 50; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
          assert.equal(calls.filter((call) => call.method === "PUT").length, 0, "the hourly pass sends no PUT when nothing changed");

          workspaces = [...workspaces, served("delta", { channelId: "444444444444444444" })];
          calls.length = 0;
          await clock.advance(REGISTER_INTERVAL_MS);
          for (let i = 0; i < 100 && !calls.some((call) => call.method === "PUT"); i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
          assert.deepEqual(calls.filter((call) => call.method === "PUT").map((call) => call.route), [`/applications/${APP}/guilds/910000000000000000/commands`], "a guild added since is registered on that pass");
        } finally {
          bot.stop();
          assert.equal(clock.pending(), 0, "stop clears the hourly timer");
        }
      } finally {
        releaseDegradeSink();
      }
    },
  },

  // ── task 01: the deferral, then only an allowed workspace ────────────────────────────────────
  {
    name: "131/11 task01 — the deferral precedes the dispatch: the ephemeral callback, then work:list for alpha only, then the edit",
    async run() {
      const ctx = context();
      await handleInteraction(interaction({ name: "asks", user: ALPHA_USER }), ctx);
      const shape = ctx.sequence.map((entry) => (entry.kind === "invoke" ? `invoke ${entry.id} ${entry.workspace}` : `${entry.method} ${entry.route}`));
      assert.deepEqual(shape, [
        "POST /interactions/700000000000000001/interaction-token/callback",
        "invoke work:list alpha",
        `PATCH /webhooks/${APP}/interaction-token/messages/@original`,
      ]);
      assert.deepEqual(ctx.sequence[0].body, { type: 5, data: { flags: 64 } }, "type 5, ephemeral");
      assert.deepEqual(ctx.sequence[1].input, { mesh: true });
    },
  },
  {
    name: "131/11 task01 — who reaches what (four rows)",
    async run() {
      for (const [label, spec, invoked, reply] of [
        ["an alpha user's /status", { name: "status", user: ALPHA_USER }, [["work:list", "alpha", { mesh: true }]], null],
        ["a stranger's /status", { name: "status", user: "444444444444444444" }, [], /discord-command-not-allowed/u],
        ["/status in another channel", { name: "status", user: ALPHA_USER, channel: "555555555555555555" }, [], /not an aof project channel/u],
        ["an alpha user's /loop stop", { name: "loop", sub: "stop", options: { scope: "131" }, user: ALPHA_USER }, [["work:loop", "alpha", { scope: "131", stop: true }]], null],
      ]) {
        const ctx = context({ invoke: async (id) => (id === "work:loop" ? { ok: true, request: "drain", state: "requested", live: true } : []) });
        await handleInteraction(interaction(spec), ctx);
        assert.deepEqual(invokes(ctx.sequence).map((entry) => [entry.id, entry.workspace, entry.input]), invoked, label);
        if (reply != null) assert.match(edit(ctx.sequence), reply, `${label}: ${edit(ctx.sequence)}`);
      }
    },
  },
  {
    name: "131/11 task01 (131/14 task00) — an ambiguous loop command names its candidates, and project: picks one",
    async run() {
      const both = [served("alpha", { allow: [ALPHA_USER] }), served("beta", { allow: [BETA_USER, ALPHA_USER] })];
      // 131/14: two projects are ambiguous only when BOTH have a loop on the scope.
      const ambiguous = { ...context({ workspaces: both }), hasLoopOn: async () => true };
      await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "131" } }), ambiguous);
      assert.deepEqual(invokes(ambiguous.sequence), [], "invoke is never called");
      assert.match(edit(ambiguous.sequence), /discord-scope-ambiguous/u);
      assert.match(edit(ambiguous.sequence), /alpha/u);
      assert.match(edit(ambiguous.sequence), /beta/u);
      assert.match(edit(ambiguous.sequence), /`project:`/u, "the refusal names the option by its one word");
      const picked = context({ workspaces: both, invoke: async () => ({ ok: true, request: "drain", state: "requested" }) });
      await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "131", project: "beta" } }), picked);
      assert.deepEqual(invokes(picked.sequence).map((entry) => [entry.id, entry.workspace]), [["work:loop", "beta"]]);
    },
  },
  {
    name: "131/14 task00 — one channel, several projects: /loop takes the one project with a loop on the scope, and says so when none has one",
    async run() {
      const both = [served("alpha", { allow: [ALPHA_USER] }), served("beta", { allow: [BETA_USER, ALPHA_USER] })];
      const answer = async () => ({ ok: true, request: "drain", state: "requested", live: true });
      const onlyBeta = async (workspace, scope) => path.basename(workspace.projectRoot) === "beta" && scope === "131";
      for (const sub of ["stop", "resume"]) {
        const ctx = { ...context({ workspaces: both, invoke: answer }), hasLoopOn: onlyBeta };
        await handleInteraction(interaction({ name: "loop", sub, options: { scope: "131" } }), ctx);
        assert.deepEqual(invokes(ctx.sequence).map((entry) => [entry.id, entry.workspace]), [["work:loop", "beta"]], `/loop ${sub} reaches the project with the loop, with no project:`);
      }
      const none = { ...context({ workspaces: both, invoke: answer }), hasLoopOn: async () => false };
      await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "131" } }), none);
      assert.deepEqual(invokes(none.sequence), [], "nothing is invoked");
      assert.match(edit(none.sequence), /No project in this channel has a loop on scope 131 .*\(discord-loop-not-found\)/u);
      const single = { ...context({ workspaces: [served("alpha", { allow: [ALPHA_USER] })], invoke: answer }), hasLoopOn: async () => { throw new Error("not consulted"); } };
      await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "131" } }), single);
      assert.deepEqual(invokes(single.sequence).map((entry) => entry.id), ["work:loop"], "one project needs no lookup: the verb itself refuses a scope with no loop");
    },
  },
  {
    name: "131/11 task01 — a DM is deferred ephemerally and refused, and nothing is invoked",
    async run() {
      const ctx = context();
      await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "131" }, member: false }), ctx);
      assert.deepEqual(ctx.sequence[0].body, { type: 5, data: { flags: 64 } }, "deferred ephemerally");
      assert.deepEqual(invokes(ctx.sequence), []);
      assert.match(edit(ctx.sequence), /direct message/u);
    },
  },
  {
    name: "131/11 task01 — a long reply is clipped at a line boundary with … and N more",
    async run() {
      const rows = Array.from({ length: 60 }, (_, i) => ({ ref: `131/${String(i).padStart(2, "0")}`, status: "in-progress", ask: { state: "waiting", phase: "build", askedAt: "2026-09-25T11:48:00.000Z", question: `Question ${i} ${"x".repeat(40)}` } }));
      const ctx = context({ workspaces: [ALPHA], invoke: async () => rows });
      await handleInteraction(interaction({ name: "asks" }), ctx);
      const content = edit(ctx.sequence);
      assert.ok(content.length <= 2000, `${content.length} ≤ 2,000`);
      assert.match(content, /\n… and \d+ more$/u);
      assert.equal(clipReply("short"), "short");
    },
  },

  // ── task 02: the two views over work:list ────────────────────────────────────────────────────
  {
    name: "131/11 task02 — /asks lists a waiting and a parked ask as accountLine, the first with its jump link",
    async run() {
      const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-discord-asks-")));
      const previous = process.env.AOF_GLOBAL_HOME;
      process.env.AOF_GLOBAL_HOME = tmp;
      try {
        await recordAskMessage({ messageId: "900000000000000001", channelId: CHANNEL, event: "session-needs-input", ref: "131/03", workspaceId: resolveWorkspaceId(ALPHA), projectRoot: ALPHA.projectRoot });
        const rows = [
          { ref: "131/03", status: "in-progress", ask: { state: "waiting", phase: "build", askedAt: "2026-09-25T11:48:00.000Z", question: "Split the story?" } },
          { ref: "131/05", status: "in-progress", ask: { state: "parked", phase: "continue", askedAt: "2026-09-25T09:00:00.000Z", question: "Ship it?" } },
          { ref: "131/06", status: "in-progress" },
        ];
        const ctx = context({ workspaces: [ALPHA], invoke: async () => rows });
        await handleInteraction(interaction({ name: "asks" }), ctx);
        assert.deepEqual(edit(ctx.sequence).split("\n"), [
          "131/03 — waiting on you (build, 12m): Split the story?",
          `https://discord.com/channels/${GUILD}/${CHANNEL}/900000000000000001`,
          "131/05 — parked, unanswered (continue, 3h): Ship it?",
        ]);
      } finally {
        if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
        else process.env.AOF_GLOBAL_HOME = previous;
        await rm(tmp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "131/11 task02 — /status per row (four rows)",
    run() {
      const nowMs = NOW.getTime();
      assert.equal(statusLine({ ref: "131/09", status: "in-progress" }, nowMs), "131/09");
      assert.equal(statusLine({ ref: "131/10", status: "in-progress", execution: { state: "running", nodeId: "node-2976" } }, nowMs), "131/10 — running · node-2976");
      assert.equal(statusLine({ ref: "131/03", status: "in-progress", ask: { state: "waiting", phase: "build", askedAt: "2026-09-25T11:48:00.000Z" } }, nowMs), "131/03 — waiting on you (build, 12m)");
    },
  },
  {
    name: "131/11 task02 — /status renders only in-progress rows, one section per workspace; nothing to show says so; one failure does not hide another",
    async run() {
      const rows = [{ ref: "131/10", status: "in-progress", execution: { state: "running", nodeId: "node-2976" } }, { ref: "131/01", status: "done" }];
      const one = context({ workspaces: [ALPHA], invoke: async () => rows });
      await handleInteraction(interaction({ name: "status" }), one);
      assert.equal(edit(one.sequence), "**alpha**\n131/10 — running · node-2976", "a done row renders no line");

      const empty = context({ workspaces: [ALPHA], invoke: async () => [] });
      await handleInteraction(interaction({ name: "status" }), empty);
      assert.equal(edit(empty.sequence), "**alpha**\nnothing in progress");
      const noAsks = context({ workspaces: [ALPHA], invoke: async () => [] });
      await handleInteraction(interaction({ name: "asks" }), noAsks);
      assert.equal(edit(noAsks.sequence), "no questions waiting");

      const both = [served("alpha", { allow: [ALPHA_USER] }), served("beta", { allow: [ALPHA_USER] })];
      const failing = context({
        workspaces: both,
        invoke: async (id, input, ctx) => {
          if (path.basename(ctx.workspace.projectRoot) === "alpha") throw Object.assign(new Error("no"), { code: "workspace-load-failed" });
          return rows;
        },
      });
      await handleInteraction(interaction({ name: "status" }), failing);
      assert.equal(edit(failing.sequence), "**alpha**\ncould not read alpha: workspace-load-failed\n\n**beta**\n131/10 — running · node-2976");
    },
  },
  {
    name: "131/11 task02 (F-131-11) — /status also renders a row whose ask waits or is parked, whatever its status: a lane's story reads not-started in the primary until it merges",
    async run() {
      const asked = (state) => ({ state, phase: "build", askedAt: "2026-09-25T11:48:00.000Z" });
      const rows = [
        { ref: "03", status: "in-progress" },
        { ref: "03/00", status: "not-started", ask: asked("waiting") },
        { ref: "03/01", status: "not-started", ask: asked("parked") },
        { ref: "03/02", status: "not-started" },
        { ref: "03/03", status: "not-started", ask: asked("answered") },
      ];
      const ctx = context({ workspaces: [ALPHA], invoke: async () => rows });
      await handleInteraction(interaction({ name: "status" }), ctx);
      assert.equal(edit(ctx.sequence), "**alpha**\n03\n03/00 — waiting on you (build, 12m)\n03/01 — parked, unanswered (build, 12m)", "a waiting or parked ask shows; a not-started row with no standing ask does not");
    },
  },

  // ── task 03: /loop stop through 130's verb ───────────────────────────────────────────────────
  {
    name: "131/11 task03 — the reply follows the level the real verb reached (three rows), and the stop starts nothing",
    async run() {
      for (const [label, live, before, request, sentence] of [
        ["live, no request", true, null, { level: 1, state: "requested" }, "draining (a second /loop stop cancels the in-flight session)"],
        ["live, a level 1 request", true, "drain", { level: 2, state: "requested" }, "cancelling the in-flight session"],
        ["not live", false, null, { state: "honoured" }, "not running — marked stopped; /loop resume clears it"],
      ]) {
        await withLoopProject({ live }, async ({ workspace, loopRunId, invokeReal, spawned }) => {
          if (before === "drain") await requestLoopStop(loopStopsDir(), { loopRunId, scope: "131", by: { node: null, pid: 1 } });
          const ctx = context({ workspaces: [workspace], invoke: invokeReal });
          await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "131" }, username: "umami" }), ctx);
          const record = await readStopRequest(loopStopsDir(), loopRunId);
          for (const [key, value] of Object.entries(request)) assert.equal(record[key], value, `${label}: ${key}`);
          assert.equal(edit(ctx.sequence), `@umami asked 131 to stop — ${sentence}`, label);
          assert.deepEqual(ctx.sequence.filter((entry) => entry.kind === "request").map((entry) => entry.body?.data?.flags ?? null)[0], null, `${label}: deferred in-channel`);
          assert.equal(spawned.length, 0, `${label}: no launch seam was reached`);
        });
      }
    },
  },
  {
    name: "131/11 task03 — a refusal is shown with its code and message, and not retried",
    async run() {
      let calls = 0;
      const ctx = context({ workspaces: [ALPHA], invoke: async () => { calls += 1; return { ok: false, code: "loop-stop-no-declaration", message: "No run in scope 999 carries a loop declaration" }; } });
      await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "999" } }), ctx);
      assert.equal(calls, 1, "invoke was called exactly once");
      assert.equal(edit(ctx.sequence), "/loop stop 999 was refused (loop-stop-no-declaration): No run in scope 999 carries a loop declaration");
    },
  },

  // ── task 04: /loop resume hands the loop to the supervisor ───────────────────────────────────
  {
    name: "131/11 task04 — /loop resume dispatches the hand-off and replies in the channel; the real verb writes the request and starts nothing",
    async run() {
      await withLoopProject({ live: false }, async ({ workspace, loopRunId, invokeReal, spawned }) => {
        const ctx = context({ workspaces: [workspace], invoke: invokeReal });
        await handleInteraction(interaction({ name: "loop", sub: "resume", options: { scope: "131" }, username: "umami" }), ctx);
        assert.deepEqual(invokes(ctx.sequence).map((entry) => [entry.id, entry.input]), [["work:loop", { scope: "131", handOff: true }]]);
        assert.equal(edit(ctx.sequence), "@umami handed 131 to the supervisor — it relaunches with --resume on its next poll");
        const request = JSON.parse(await readFile(path.join(loopResumesDir(), `${loopRunId}.json`), "utf8"));
        assert.deepEqual(Object.keys(request), ["loopRunId", "scope", "workspaceId", "by", "requestedAt"]);
        assert.equal(spawned.length, 0, "no process was spawned");
      });
    },
  },

  // ── 191/05 task00: one word for the project on every command ────────────────────────────────
  {
    name: "191/05 task00 — each command addresses the project it is given, by folder or by id (three rows)",
    async run() {
      const answer = async (id) => (id === "work:loop" ? { ok: true, request: "drain", state: "requested", live: true } : []);
      for (const [label, spec] of [
        ["/status project:aof", { name: "status", options: { project: "aof" } }],
        ["/asks project:ws-a", { name: "asks", options: { project: "ws-a" } }],
        ["/loop resume scope:191 project:ws-a", { name: "loop", sub: "resume", options: { scope: "191", project: "ws-a" } }],
      ]) {
        const ctx = { ...context({ workspaces: pair(), invoke: answer }), hasLoopOn: async () => true };
        await handleInteraction(interaction(spec), ctx);
        assert.deepEqual([...new Set(invokes(ctx.sequence).map((entry) => entry.workspace))], ["aof"], `${label} addresses only aof`);
      }
    },
  },
  {
    name: "191/05 task00 — an unknown project is refused discord-scope-ambiguous, naming the ones there are",
    async run() {
      const ctx = context({ workspaces: pair() });
      await handleInteraction(interaction({ name: "status", options: { project: "aoff" } }), ctx);
      assert.deepEqual(invokes(ctx.sequence), [], "nothing is invoked");
      const reply = edit(ctx.sequence);
      assert.match(reply, /\(discord-scope-ambiguous\)$/u);
      assert.match(reply, /\baof\b/u);
      assert.match(reply, /\bnotes\b/u);
    },
  },
  {
    name: "191/05 task00 E1 — /loop stop scope:191 project:aof writes the stop request for scope 191 in workspace ws-a",
    async run() {
      await withLoopProject({ live: true, folder: "aof", workspaceId: "ws-a", scope: "191" }, async ({ workspace, loopRunId, invokeReal }) => {
        const notes = projectAt("notes", "ws-n");
        const ctx = { ...context({ workspaces: [workspace, notes], invoke: invokeReal }), hasLoopOn: async () => true };
        await handleInteraction(interaction({ name: "loop", sub: "stop", options: { scope: "191", project: "aof" } }), ctx);
        assert.deepEqual(invokes(ctx.sequence).map((entry) => [entry.id, entry.workspace]), [["work:loop", "aof"]]);
        const record = await readStopRequest(loopStopsDir(), loopRunId);
        assert.equal(record.scope, "191");
        assert.equal(record.workspaceId, "ws-a");
      });
    },
  },
  {
    name: "191/05 task00 E2 — after READY a guild holding the old table is overwritten once with the new one, and no option is named workspace",
    async run() {
      const events = degradeSink();
      try {
        const clock = fakeClock();
        const fake = fakeGateway();
        const calls = [];
        // The guild's last overwrite carried the old table: what Discord holds names `workspace`.
        let held = [{ name: "status", options: [{ type: 3, name: "workspace" }] }];
        const fetch = async (url, init) => {
          const route = url.replace("https://discord.com/api/v10", "");
          const body = init.body == null ? null : JSON.parse(init.body);
          calls.push({ method: init.method, route, body });
          if (init.method === "PUT") held = body;
          if (/^\/channels\/\d+$/u.test(route)) return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id: CHANNEL, guild_id: GUILD }) };
          return { status: 200, headers: { get: () => "application/json" }, json: async () => [] };
        };
        const bot = startDiscordBot({
          token: TOKEN,
          fetch,
          timers: clock.timers,
          servedWorkspaces: async () => pair(),
          gateway: (options) => startGateway({ ...options, request: fake.request, socketFactory: fake.socketFactory, timers: clock.timers, random: () => 0.5 }),
        });
        try {
          await flush();
          fake.current().receive({ op: 0, t: "READY", s: 1, d: { session_id: "s1", resume_gateway_url: "wss://resume.example.test", application: { id: APP } } });
          for (let i = 0; i < 100 && !calls.some((call) => call.method === "PUT"); i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
          await flush();
          const puts = calls.filter((call) => call.method === "PUT");
          assert.deepEqual(puts.map((call) => call.route), [`/applications/${APP}/guilds/${GUILD}/commands`], "the guild is overwritten once");
          assert.deepEqual(held, JSON.parse(JSON.stringify(COMMANDS)), "with the new table");
          const project = (options) => options.find((option) => option.name === "project");
          for (const [label, options] of [
            ["/status", held[0].options],
            ["/asks", held[1].options],
            ["/loop stop", held[2].options[0].options],
            ["/loop resume", held[2].options[1].options],
          ]) {
            assert.deepEqual(project(options), { type: 3, name: "project", description: project(options).description, required: false, autocomplete: true }, `${label}: an optional autocompleted string project`);
          }
          const names = [];
          const walk = (options) => { for (const option of options ?? []) { names.push(option.name); walk(option.options); } };
          for (const command of held) walk(command.options);
          assert.ok(!names.includes("workspace"), `no command or subcommand has an option named workspace: ${names.join(", ")}`);
          assert.equal(events.filter((event) => event.code === "discord-command-register-failed").length, 0);
        } finally {
          bot.stop();
        }
      } finally {
        releaseDegradeSink();
      }
    },
  },

  // ── 191/05 task01: the project is offered, never refused, while typing ──────────────────────
  {
    name: "191/05 task01 — an autocomplete answers type 8 with the kept projects, without a deferral or a verb",
    async run() {
      const ctx = context({ workspaces: pair() });
      const choices = await handleInteraction(autocomplete({ name: "status", value: "" }), ctx);
      assert.deepEqual(ctx.sequence, [{
        kind: "request",
        method: "POST",
        route: "/interactions/700000000000000001/interaction-token/callback",
        body: { type: 8, data: { choices: [{ name: "aof", value: "ws-a" }, { name: "notes", value: "ws-n" }] } },
      }], "one type 8 callback: no type 5, no invoke, no edit");
      assert.deepEqual(choices, [{ name: "aof", value: "ws-a" }, { name: "notes", value: "ws-n" }]);
      const loop = context({ workspaces: pair() });
      await handleInteraction(autocomplete({ name: "loop", sub: "stop", value: "no", others: { scope: "191" } }), loop);
      assert.deepEqual(offered(loop.sequence), [{ name: "notes", value: "ws-n" }], "a /loop subcommand's focused project is offered too");
    },
  },
  {
    name: "191/05 task01 — a prefix match ranks above a containment match",
    async run() {
      const ctx = context({ workspaces: [projectAt("taof", "ws-t"), projectAt("aof", "ws-a")] });
      await handleInteraction(autocomplete({ value: "aof" }), ctx);
      assert.deepEqual(offered(ctx.sequence).map((choice) => choice.name), ["aof", "taof"]);
    },
  },
  {
    name: "191/05 task01 — never more than 25 choices",
    async run() {
      const thirty = Array.from({ length: 30 }, (_, i) => projectAt(`p${String(i).padStart(2, "0")}`, `ws-${i}`));
      const ctx = context({ workspaces: thirty });
      await handleInteraction(autocomplete({ value: "" }), ctx);
      assert.equal(offered(ctx.sequence).length, 25);
    },
  },
  {
    name: "191/05 task01 — an interaction from nowhere useful gets an empty list (two rows)",
    async run() {
      for (const [label, spec] of [
        ["from a direct message", { member: false }],
        ["from a channel no project serves", { channel: "555555555555555555" }],
      ]) {
        const ctx = context({ workspaces: pair() });
        await handleInteraction(autocomplete({ value: "", ...spec }), ctx);
        assert.deepEqual(ctx.sequence.map((entry) => entry.body), [{ type: 8, data: { choices: [] } }], label);
      }
      const events = degradeSink();
      try {
        const failing = { ...context(), servedWorkspaces: async () => { throw Object.assign(new Error("no"), { code: "workspace-load-failed" }); } };
        await handleInteraction(autocomplete({ value: "" }), failing);
        assert.deepEqual(failing.sequence.map((entry) => entry.body), [{ type: 8, data: { choices: [] } }], "a failed read is still answered, empty");
        assert.equal(events.filter((event) => event.code === "discord-autocomplete-failed").length, 1, "and reported");
      } finally {
        releaseDegradeSink();
      }
    },
  },
  {
    name: "191/05 task01 E3 — a user allowed on one project is offered only that one",
    async run() {
      const workspaces = [projectAt("aof", "ws-a"), projectAt("notes", "ws-n", { allow: [BETA_USER] })];
      for (const value of ["", "a"]) {
        const ctx = context({ workspaces });
        await handleInteraction(autocomplete({ value }), ctx);
        assert.deepEqual(offered(ctx.sequence), [{ name: "aof", value: "ws-a" }], `typed "${value}"`);
      }
    },
  },
  {
    name: "191/05 task01 E4 — a user on no allowlist is offered nothing, and nothing is posted",
    async run() {
      const ctx = context({ workspaces: pair() });
      await handleInteraction(autocomplete({ value: "a", user: "444444444444444444" }), ctx);
      assert.deepEqual(ctx.sequence.map((entry) => [entry.method, entry.body]), [["POST", { type: 8, data: { choices: [] } }]], "one empty type 8 callback: no refusal text, no edit");
    },
  },
  {
    name: "191/05 task01 E5 — case is ignored",
    async run() {
      const ctx = context({ workspaces: pair() });
      await handleInteraction(autocomplete({ value: "NO" }), ctx);
      assert.deepEqual(offered(ctx.sequence), [{ name: "notes", value: "ws-n" }]);
    },
  },
];

// A served workspace with a folder and a pinned workspace id, on CHANNEL, allowing ALPHA_USER.
function projectAt(folder, workspaceId, { allow = [ALPHA_USER] } = {}) {
  return {
    projectRoot: path.join(os.tmpdir(), "aof-discord-commands", folder),
    config: { name: folder, mesh: { workspaceId }, work: { notify: { channels: { discord: { type: "discord", channelId: CHANNEL, allow } } } } },
  };
}
// The background: a channel serving "aof" (id ws-a) and "notes" (id ws-n), ALPHA_USER allowed on both.
const pair = () => [projectAt("aof", "ws-a"), projectAt("notes", "ws-n")];

// An autocomplete interaction (type 4) with `project` focused, as the gateway hands one.
function autocomplete({ name = "status", sub = null, value = "", others = {}, user = ALPHA_USER, channel = CHANNEL, member = true } = {}) {
  const base = interaction({ name, sub, options: others, user, channel, member });
  const focused = { type: 3, name: "project", value, focused: true };
  const data = sub == null
    ? { ...base.data, options: [...base.data.options, focused] }
    : { ...base.data, options: [{ ...base.data.options[0], options: [...base.data.options[0].options, focused] }] };
  return { ...base, type: 4, data };
}
// The choices of the one type 8 callback a sequence holds.
const offered = (sequence) => {
  const callbacks = sequence.filter((entry) => entry.kind === "request" && entry.body?.type === 8);
  assert.equal(callbacks.length, 1, "exactly one type 8 callback");
  return callbacks[0].body.data.choices;
};

// A project with milestone 131 and one run record carrying a SUPERVISED loop declaration, under a
// fresh global home set on the process. `live` makes the run running with a fresh heartbeat; else it
// is done. `invokeReal` runs the registered verb in-process with a spawn seam that records.
async function withLoopProject({ live, folder = "project", workspaceId = null, scope = "131" }, body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-discord-loop-")));
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = path.join(tmp, "home");
  try {
    const root = path.join(tmp, folder);
    const itemDir = path.join(root, "wiki", "work", `${scope}_milestone_fixture`);
    await mkdir(path.join(itemDir, "runs"), { recursive: true });
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(path.join(itemDir, "SPEC.md"), `---\ntype: milestone\nnumber: ${scope}\nslug: fixture\ntitle: Fixture\nstatus: in-progress\ndepends: []\ncreated: 2026-09-25\nupdated: 2026-09-25\nschema: 1\naofVersion: 0.1.0\n---\n# Fixture\n`, "utf8");
    const at = new Date().toISOString();
    const loopRunId = "lr-131";
    const record = {
      runId: "run-1", itemRef: scope, retryOf: null, state: live ? "running" : "done", attempt: 1,
      failureReason: null, resumeAfter: null, reclaimedAt: null, createdAt: at, heartbeatAt: live ? at : null, updatedAt: at,
      brief: { loop: { loopRunId, scope, level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: at, id: "loop:autonomous-cascade", supervised: true } },
    };
    await writeFile(path.join(itemDir, "runs", "run-1.json"), JSON.stringify(record, null, 2), "utf8");
    await writeFile(path.join(root, ".aof", "aof.config.json"), JSON.stringify({ name: "fixture", ...(workspaceId == null ? {} : { mesh: { workspaceId } }), work: { dir: "wiki/work", notify: { channels: { discord: { type: "discord", channelId: CHANNEL, allow: [ALPHA_USER] } } } } }, null, 2), "utf8");
    const workspace = await loadWorkspace(root, undefined, { env: process.env });
    const { invoke } = await Promise.resolve(Object.freeze({
  loadWorkspace: _aofApplication.loadWorkspace,
  getCommand: _aofApplication.getCommand,
  listCommands: _aofApplication.listCommands,
  invoke: _aofApplication.invoke,
}));
    const spawned = [];
    const invokeReal = (id, input, ctx) => invoke(id, input, { ...ctx, spawnPhaseDrive: (...args) => { spawned.push(args); }, invokeRegistered: async (...args) => { spawned.push(args); } });
    return await body({ workspace, loopRunId, invokeReal, spawned });
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}
