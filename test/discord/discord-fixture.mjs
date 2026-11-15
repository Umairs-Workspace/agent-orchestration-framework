import { defaultFoundation as _aofFoundation } from "aof/foundation-services";
import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// test/discord/discord-fixture.mjs — the Discord bot's shared fixtures (milestone 131 / story 10;
// ADR-008). ONE home for the fake gateway (task 01), the reply background (task 03) and the command
// background (191/06: the bot on the fake gateway, and the verbs a command dispatches), shared by the
// suites in this directory and by `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs`
// (task 05 QA ruling 2: reused, never copied). `test/support/` is a row at its ceiling, so they live
// here, under this directory's exemption.
//
// NOTHING REAL RUNS. The clock is a fake whose `advance(ms)` fires due timers in order; the socket
// factory hands back fake sockets that record every frame sent; `request` stands in for
// `discordRequest`; and the reply background is a temp project under a fresh global home.
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const setDegradeSinkForTest = _aofFoundation.degrade.setDegradeSinkForTest;
const clearAsk = _aofApplication.loop.askRequest.clearAsk;
const loopAsksDir = _aofApplication.loop.askRequest.loopAsksDir;
const openAsk = _aofApplication.loop.askRequest.openAsk;
const readAsks = _aofApplication.loop.askRequest.readAsks;
const recordAskMessage = _aofApplication.messaging.askMessages.recordAskMessage;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const startDiscordBot = _aofApplication.messaging.discord.bot.startDiscordBot;
const startGateway = _aofApplication.messaging.discord.gateway.startGateway;
import { resolveWorkspaceId } from "@aof/mesh/workspace-identity";

// A synthetic bot token (131/09 QA ruling 1); its third segment is what a leak check greps for.
export const TOKEN_SEGMENT = "gatewaySecretSegment0123456";
export const TOKEN = `MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.${TOKEN_SEGMENT}`;
export const CHANNEL = "123456789012345678";
export const ALLOWED = "222222222222222222";
export const STRANGER = "333333333333333333";
export const ASK_MESSAGE = "900000000000000001";
export const REPLY_MESSAGE = "910000000000000001";
export const NODE = "node-7297";

// Lets every queued microtask and immediate run — the gateway's awaits and the fake's deliveries.
export async function flush(rounds = 20) {
  for (let i = 0; i < rounds; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

// fakeClock() → `{ timers, advance(ms), pending(), now() }`. `timers` is the `{ setTimeout,
// clearTimeout }` pair the gateway takes; `advance` fires every timer due within `ms`, in time order,
// flushing after each.
export function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    timers: {
      setTimeout: (fn, ms) => {
        const id = nextId;
        nextId += 1;
        timers.set(id, { at: now + Math.max(0, Number(ms) || 0), fn });
        return id;
      },
      clearTimeout: (id) => { timers.delete(id); },
    },
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        let due = null;
        for (const [id, timer] of timers) {
          if (timer.at <= target && (due == null || timer.at < due.timer.at)) due = { id, timer };
        }
        if (due == null) break;
        timers.delete(due.id);
        now = due.timer.at;
        due.timer.fn();
        await flush();
      }
      now = target;
      await flush();
    },
    pending: () => timers.size,
    now: () => now,
  };
}

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.sent = [];
    this.closedWith = null;
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }

  emit(event, ...args) {
    for (const fn of this.listeners.get(event) ?? []) fn(...args);
  }

  send(text) {
    this.sent.push(JSON.parse(text));
  }

  // The client closing: the close event follows on the next microtask, as a real socket's does.
  close(code) {
    if (this.closedWith != null) return;
    this.closedWith = code;
    queueMicrotask(() => this.emit("close", code));
  }

  // The server's side.
  receive(frame) {
    this.emit("message", JSON.stringify(frame));
  }

  drop(code) {
    this.closedWith = code;
    this.emit("close", code);
  }
}

// fakeGateway({ limit, helloInterval }) → the seams `startGateway` takes (`request`,
// `socketFactory`) and what they saw. Every socket answers HELLO as soon as it opens; the test plays
// READY, dispatches, closes and ACKs by hand.
export function fakeGateway({ limit = { remaining: 1000, reset_after: 0 }, helloInterval = 41_250, url = "wss://gateway.example.test" } = {}) {
  const sockets = [];
  const requests = [];
  const request = async (token, method, route, body) => {
    requests.push({ token, method, route, body });
    if (route === "/gateway/bot") return { ok: true, status: 200, json: { url, session_start_limit: limit }, reason: null, retryAfter: null };
    return { ok: true, status: 204, json: null, reason: null, retryAfter: null };
  };
  const socketFactory = (socketUrl) => {
    const socket = new FakeSocket(socketUrl);
    sockets.push(socket);
    if (helloInterval != null) queueMicrotask(() => socket.receive({ op: 10, d: { heartbeat_interval: helloInterval } }));
    return socket;
  };
  const frames = () => sockets.flatMap((socket) => socket.sent);
  return {
    request,
    socketFactory,
    sockets,
    requests,
    current: () => sockets.at(-1),
    frames,
    identifies: () => frames().filter((frame) => frame.op === 2),
    resumes: () => frames().filter((frame) => frame.op === 6),
    beats: () => frames().filter((frame) => frame.op === 1),
  };
}

// ready(socket, { sessionId, seq }) — the server's READY, carrying the resume URL.
export function ready(socket, { sessionId = "s1", seq = 1, resumeUrl = "wss://resume.example.test" } = {}) {
  socket.receive({ op: 0, t: "READY", s: seq, d: { session_id: sessionId, resume_gateway_url: resumeUrl } });
}

// A degrade-sink spy, reset per case: `reportDegrade` throttles each code for 5 s.
export function degradeSink() {
  const events = [];
  setDegradeSinkForTest(() => ({ write: (event) => events.push(event) }));
  return events;
}
export const releaseDegradeSink = () => setDegradeSinkForTest(undefined);

// ── the reply background (task 03) ────────────────────────────────────────────────────────────────

// withReplyWorld(body, { allow }) — a fresh global home on the process (the index and the ask store
// are the process's), a project whose `discord` channel has `channelId` CHANNEL and `allow` (omitted
// when `null`), a milestone `131` with story `03`, a WAITING ask file for `131/03`, and an index
// record for message ASK_MESSAGE naming that channel, ref and root. The body gets the world.
export async function withReplyWorld(body, { allow = [ALLOWED] } = {}) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-discord-reply-")));
  const home = path.join(tmp, "home");
  const root = path.join(tmp, "project");
  const previous = process.env.AOF_GLOBAL_HOME;
  process.env.AOF_GLOBAL_HOME = home;
  try {
    const story = path.join(root, "wiki", "work", "131_milestone_fixture", "stories", "03_story_lane");
    await mkdir(story, { recursive: true });
    await mkdir(path.join(root, ".aof"), { recursive: true });
    await writeFile(path.join(root, "wiki", "work", "131_milestone_fixture", "SPEC.md"), "---\ntype: milestone\nnumber: 131\nslug: fixture\nstatus: in-progress\ntitle: Fixture\n---\n# 131\n", "utf8");
    await writeFile(path.join(story, "STORY.md"), "---\ntype: story\nnumber: 03\nslug: lane\nparent: 131\nstatus: in-progress\ntitle: Lane\n---\n# 131/03\n", "utf8");
    const channel = { type: "discord", channelId: CHANNEL, ...(allow == null ? {} : { allow }) };
    const config = { name: "fixture", work: { dir: "./wiki/work", notify: { channels: { discord: channel } } }, mesh: { nodeId: NODE } };
    await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
    const workspace = await loadWorkspace(root);
    const workspaceId = resolveWorkspaceId(workspace);
    await openAsk(loopAsksDir(), { runId: "R1", workspaceId, ref: "131/03", sessionId: "S1", phase: "build", scope: "131", question: "Which option?" });
    await recordAskMessage({ messageId: ASK_MESSAGE, channelId: CHANNEL, event: "session-needs-input", ref: "131/03", workspaceId, projectRoot: workspace.projectRoot });

    const discord = [];
    const request = async (method, route, payload) => {
      discord.push({ method, route, body: payload });
      return { ok: true, status: 200, json: null, reason: null, retryAfter: null };
    };
    const posted = [];
    const fetch = async (url, init) => {
      posted.push({ url, init });
      return { status: 200, headers: { get: () => "application/json" }, json: async () => ({ id: "990000000000000001" }) };
    };
    const { invoke } = await Promise.resolve(Object.freeze({
  loadWorkspace: _aofApplication.loadWorkspace,
  getCommand: _aofApplication.getCommand,
  listCommands: _aofApplication.listCommands,
  invoke: _aofApplication.invoke,
}));
    const invoked = [];
    const context = {
      request,
      invoke: async (id, input, ctx) => {
        invoked.push({ id, input });
        return await invoke(id, input, ctx);
      },
      loadWorkspace: (projectRoot) => loadWorkspace(projectRoot),
      answerContext: { notifyOptions: { env: {}, fetch } },
    };
    const askState = async () => {
      const record = (await readAsks(loopAsksDir(), { workspaceId })).find((entry) => entry.ref === "131/03");
      return record == null ? { state: "absent" } : record;
    };
    const clear = () => clearAsk(loopAsksDir(), "R1");
    return await body({ root, home, workspace, workspaceId, context, discord, invoked, posted, askState, clear });
  } finally {
    if (previous === undefined) delete process.env.AOF_GLOBAL_HOME;
    else process.env.AOF_GLOBAL_HOME = previous;
    await rm(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}

// reply({ from, username, text, to, channel, bot }) → a `MESSAGE_CREATE` payload.
export function reply({ from = ALLOWED, username = "umami", text = "take option B", to = ASK_MESSAGE, channel = CHANNEL, bot = false, id = REPLY_MESSAGE } = {}) {
  return {
    id,
    channel_id: channel,
    author: { id: from, username, ...(bot ? { bot: true } : {}) },
    content: text,
    ...(to == null ? {} : { message_reference: { message_id: to } }),
  };
}

// ── the command background (191/06) ──────────────────────────────────────────────────────────────

// The session every command case speaks of: its id, the ADR-002 name the Claude app lists it under,
// and the control node it runs on.
export const SESSION_ID = "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10";
export const SESSION_NAME = "aof-0b9e6c1e";
export const CONTROL_NODE = "node-6eb3";

// A coded error, as a registered verb throws a refusal.
export const coded = (code, message = code) => Object.assign(new Error(message), { code });

// fakeVerbs({ nodes, items, sessions, start, end, loop }) → an `invoke(id, input, ctx)` standing in
// for the six verbs a command may dispatch, each answering in its real verb's shape:
//   `mesh:status`        `{ nodes }` — `nodes` are node ids (live) or whole node rows;
//   `work:list`          the rows of `items[<workspace id>]`;
//   `mesh:session-list`  the `sessions` of the ONE project asked about, as the verb scopes them — so
//                        a session of a project the bot never asks about is never answered;
//   `mesh:session-start`, `mesh:session-end`, `work:loop` — `start`, `end`, `loop`: a value, an Error
//                        to throw, or a function of the input.
// Any other verb throws: a command that reaches a seventh is a failing case, not a silent `[]`.
export function fakeVerbs({ nodes = [CONTROL_NODE], items = {}, sessions = [], start = null, end = null, loop = null } = {}) {
  const scripted = (answer, input) => {
    const value = typeof answer === "function" ? answer(input) : answer;
    if (value instanceof Error) throw value;
    return value;
  };
  return async (id, input, ctx) => {
    if (id === "mesh:status") {
      return { nodes: nodes.map((node) => (typeof node === "string" ? { nodeId: node, presence: { nodeId: node, heartbeatAt: "2026-09-25T12:00:00.000Z" }, stale: false } : node)), boards: [], isControlNode: true };
    }
    if (id === "work:list") return items[resolveWorkspaceId(ctx.workspace)] ?? [];
    if (id === "mesh:session-list") return { ok: true, project: input.project ?? null, sessions: sessions.filter((session) => input.project == null || session.workspaceId === input.project) };
    if (id === "mesh:session-start") return scripted(start, input);
    if (id === "mesh:session-end") return scripted(end, input);
    if (id === "work:loop") return scripted(loop, input);
    throw new Error(`fakeVerbs: no answer scripted for ${id}`);
  };
}

// onBot(interaction, { workspaces, invoke, now }) → the ordered sequence of what the BOT did with one
// interaction delivered over the fake gateway: every Discord request it sent (`{ kind: "request",
// method, route, body }`) and every verb it dispatched (`{ kind: "invoke", id, input, workspace }`,
// `workspace` the project folder it was dispatched in). The bot is the real one — the gateway, the
// dispatch table, the handler and `discordRequest` — over a fake socket and a fake `fetch`; it is
// stopped once the interaction is answered (the edit of a command, the callback of an autocomplete).
export async function onBot(interaction, { workspaces, invoke = fakeVerbs(), now = () => new Date("2026-09-25T12:00:00.000Z") } = {}) {
  const sequence = [];
  const clock = fakeClock();
  const fake = fakeGateway();
  const fetch = async (url, init) => {
    sequence.push({ kind: "request", method: init.method, route: url.replace("https://discord.com/api/v10", ""), body: init.body == null ? null : JSON.parse(init.body) });
    return { status: 200, headers: { get: () => "application/json" }, json: async () => ({}) };
  };
  const bot = startDiscordBot({
    token: TOKEN,
    fetch,
    timers: clock.timers,
    now,
    servedWorkspaces: async () => workspaces,
    invoke: async (id, input, ctx) => {
      sequence.push({ kind: "invoke", id, input, workspace: path.basename(ctx.workspace.projectRoot) });
      return await invoke(id, input, ctx);
    },
    gateway: (options) => startGateway({ ...options, request: fake.request, socketFactory: fake.socketFactory, timers: clock.timers, random: () => 0.5 }),
  });
  try {
    await flush();
    fake.current().receive({ op: 0, t: "INTERACTION_CREATE", s: 2, d: interaction });
    const answered = (entry) => entry.kind === "request" && (interaction.type === 4 ? entry.body?.type === 8 : entry.method === "PATCH");
    for (let i = 0; i < 200 && !sequence.some(answered); i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    await flush();
    return sequence;
  } finally {
    bot.stop();
  }
}
