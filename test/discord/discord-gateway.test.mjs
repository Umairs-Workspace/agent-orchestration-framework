// test/discord/discord-gateway.test.mjs — milestone 131 / story 10, task 01
// (01_the-gateway-resumes-rather-than-re-identifies.feature; ADR-008 §2). The gateway connection
// over a fake socket factory and a fake clock: no real socket and no real timer runs (QA ruling 1),
// and the token rides only the IDENTIFY and RESUME frames (QA ruling 2).
import assert from "node:assert/strict";
import { GATEWAY_INTENTS, startGateway } from "../../packages/core/src/discord/gateway.mjs";
import { TOKEN, TOKEN_SEGMENT, degradeSink, fakeClock, fakeGateway, flush, ready, releaseDegradeSink } from "./discord-fixture.mjs";

const HALF = () => 0.5;

// A gateway over the fakes, started and flushed to its first IDENTIFY.
async function started({ limit, onDispatch = () => {} } = {}) {
  const clock = fakeClock();
  const fake = fakeGateway({ limit });
  const handle = startGateway({ token: TOKEN, onDispatch, request: fake.request, socketFactory: fake.socketFactory, timers: clock.timers, random: HALF });
  await flush();
  return { clock, fake, handle };
}

// A connection that reached READY with session "s1" and last sequence 42.
async function atReady() {
  const world = await started();
  ready(world.fake.current(), { sessionId: "s1", seq: 42 });
  await flush();
  return world;
}

const codes = (events) => events.map((event) => event.code).filter((code) => code.startsWith("discord-"));

export const discordGatewayTests = [
  {
    name: "131/10 task01 — a fresh connection identifies once with intents 33280, heartbeats within the interval carrying the last sequence, and dispatches",
    async run() {
      const dispatched = [];
      const { clock, fake, handle } = await started({ onDispatch: (t, d) => { dispatched.push({ t, d }); } });
      try {
        assert.deepEqual(fake.requests.map((r) => `${r.method} ${r.route}`), ["GET /gateway/bot"], "the URL comes from GET /gateway/bot");
        assert.equal(fake.current().url, "wss://gateway.example.test/?v=10&encoding=json");
        assert.equal(GATEWAY_INTENTS, 33280);
        const [identify] = fake.identifies();
        assert.equal(fake.identifies().length, 1, "IDENTIFY once");
        assert.equal(identify.d.token, TOKEN);
        assert.equal(identify.d.intents, 33280);
        ready(fake.current(), { sessionId: "s1", seq: 7 });
        await clock.advance(41_250);
        assert.ok(fake.beats().length >= 1, "a heartbeat within 41,250 ms of the fake clock");
        assert.equal(fake.beats()[0].d, 7, "carrying the last sequence");
        fake.current().receive({ op: 0, t: "MESSAGE_CREATE", s: 8, d: { id: "1", content: "hi" } });
        await flush();
        assert.deepEqual(dispatched.map((entry) => entry.t), ["READY", "MESSAGE_CREATE"]);
        assert.deepEqual(dispatched[1].d, { id: "1", content: "hi" });
      } finally {
        handle.stop();
      }
    },
  },
  {
    name: "131/10 task01 — what the gateway does after a close (eight rows)",
    async run() {
      const rows = [
        ["code 1006", (s) => s.drop(1006), "resume"],
        ["an op 7 RECONNECT first", (s) => s.receive({ op: 7, d: null }), "resume"],
        ["op 9 INVALID_SESSION d:true", (s) => s.receive({ op: 9, d: true }), "resume"],
        ["op 9 INVALID_SESSION d:false", (s) => s.receive({ op: 9, d: false }), "identify"],
        ["code 4009", (s) => s.drop(4009), "identify"],
        ["code 4004", (s) => s.drop(4004), "discord-token-rejected"],
        ["code 4014", (s) => s.drop(4014), "discord-intent-disallowed"],
        ["code 4013", (s) => s.drop(4013), "discord-gateway-fatal"],
      ];
      for (const [label, close, does] of rows) {
        const events = degradeSink();
        const { clock, fake, handle } = await atReady();
        try {
          close(fake.current());
          await flush();
          await clock.advance(2_000);
          if (does === "resume") {
            assert.equal(fake.sockets.length, 2, `${label}: reconnected`);
            assert.equal(fake.current().url, "wss://resume.example.test/?v=10&encoding=json", `${label}: to resume_gateway_url`);
            const resume = fake.current().sent.find((frame) => frame.op === 6);
            assert.deepEqual(resume?.d, { token: TOKEN, session_id: "s1", seq: 42 }, `${label}: RESUME with s1 and 42`);
            assert.equal(fake.identifies().length, 1, `${label}: no second IDENTIFY`);
          } else if (does === "identify") {
            assert.equal(fake.sockets.length, 2, `${label}: reconnected`);
            assert.equal(fake.current().sent.filter((frame) => frame.op === 2).length, 1, `${label}: IDENTIFY on the new socket`);
            assert.equal(fake.resumes().length, 0, `${label}: no RESUME`);
          } else {
            assert.equal(fake.sockets.length, 1, `${label}: no reconnect`);
            await clock.advance(120_000);
            assert.equal(fake.sockets.length, 1, `${label}: still none after two minutes`);
            assert.deepEqual(codes(events), [does], `${label}: one ${does}`);
            if (does === "discord-gateway-fatal") assert.match(events.find((e) => e.code === does).message, /4013/u);
            if (does === "discord-token-rejected") assert.match(events.find((e) => e.code === does).message, /aof messaging init discord/u);
            if (does === "discord-intent-disallowed") assert.match(events.find((e) => e.code === does).message, /Message Content Intent/u);
            assert.equal(clock.pending(), 0, `${label}: no timer left`);
          }
          assert.ok(!JSON.stringify(events).includes(TOKEN_SEGMENT), `${label}: no degrade holds the token`);
        } finally {
          handle.stop();
          releaseDegradeSink();
        }
      }
    },
  },
  {
    name: "131/10 task01 — the identify budget is respected: no IDENTIFY, one discord-identify-budget, and a retry after reset_after",
    async run() {
      const events = degradeSink();
      const { clock, fake, handle } = await started({ limit: { remaining: 5, reset_after: 60_000 } });
      try {
        assert.equal(fake.sockets.length, 0, "no socket is opened");
        assert.equal(fake.identifies().length, 0, "no IDENTIFY");
        assert.deepEqual(codes(events), ["discord-identify-budget"]);
        await clock.advance(59_999);
        assert.equal(fake.requests.length, 1, "nothing before reset_after");
        await clock.advance(1);
        assert.equal(fake.requests.length, 2, "it tries again after 60,000 ms");
      } finally {
        handle.stop();
        releaseDegradeSink();
      }
    },
  },
  {
    name: "131/10 task01 — a missed heartbeat ACK is a dead connection: closed and resumed on a new socket",
    async run() {
      const { clock, fake, handle } = await atReady();
      try {
        await clock.advance(41_250 * 2);
        assert.equal(fake.sockets[0].closedWith, 4000, "the silent socket is closed with 4000, keeping the session");
        await clock.advance(2_000);
        assert.equal(fake.sockets.length, 2, "a new socket");
        assert.deepEqual(fake.sockets[1].sent.find((frame) => frame.op === 6)?.d, { token: TOKEN, session_id: "s1", seq: 42 }, "RESUME on it");
        assert.equal(fake.identifies().length, 1, "no second IDENTIFY");
      } finally {
        handle.stop();
      }
    },
  },
  {
    name: "131/10 task01 — an ACKed heartbeat keeps the connection; a handler fault degrades discord-dispatch-failed and the connection stays",
    async run() {
      const events = degradeSink();
      const { clock, fake, handle } = await started({ onDispatch: (t) => { if (t === "MESSAGE_CREATE") throw new TypeError("boom"); } });
      try {
        ready(fake.current(), { sessionId: "s1", seq: 1 });
        for (let i = 0; i < 3; i += 1) {
          await clock.advance(41_250);
          fake.current().receive({ op: 11 });
        }
        assert.equal(fake.sockets.length, 1, "ACKed beats keep the one socket");
        fake.current().receive({ op: 0, t: "MESSAGE_CREATE", s: 2, d: {} });
        await flush();
        assert.deepEqual(codes(events), ["discord-dispatch-failed"]);
        assert.equal(fake.current().closedWith, null, "the connection stays up");
      } finally {
        handle.stop();
        releaseDegradeSink();
      }
    },
  },
  {
    name: "131/10 task01 — reconnects back off from 1 s, doubling to a 60 s cap, and a READY resets it",
    async run() {
      const clock = fakeClock();
      const opened = [];
      const request = async () => ({ ok: true, status: 200, json: { url: "wss://g.example.test", session_start_limit: { remaining: 1000, reset_after: 0 } }, reason: null, retryAfter: null });
      // Every socket dies at once, before HELLO: the backoff is all that paces the retries.
      const socketFactory = (url) => {
        opened.push(clock.now());
        const listeners = new Map();
        const socket = { on: (event, fn) => listeners.set(event, fn), send: () => {}, close: () => {} };
        queueMicrotask(() => listeners.get("close")?.(1006));
        return socket;
      };
      const handle = startGateway({ token: TOKEN, onDispatch: () => {}, request, socketFactory, timers: clock.timers, random: () => 0.999999 });
      try {
        await flush();
        await clock.advance(400_000);
        const gaps = opened.slice(1).map((at, i) => at - opened[i]);
        assert.deepEqual(gaps.slice(0, 7).map((gap) => Math.round(gap / 1000)), [1, 2, 4, 8, 16, 32, 60], `the gaps double to the cap: ${gaps}`);
        assert.ok(gaps.every((gap) => gap <= 60_000), "never above 60 s");
      } finally {
        handle.stop();
      }
    },
  },
  {
    name: "131/10 task01 — stop closes the connection, schedules nothing, and leaves no timer",
    async run() {
      const { clock, fake, handle } = await atReady();
      await clock.advance(10_000);
      handle.stop();
      await flush();
      assert.equal(fake.current().closedWith, 1000, "the socket is closed");
      assert.equal(clock.pending(), 0, "no timer remains");
      await clock.advance(120_000);
      assert.equal(fake.sockets.length, 1, "no reconnect is scheduled");
    },
  },
  {
    name: "131/10 task01 — the token rides only IDENTIFY and RESUME frames",
    async run() {
      const { clock, fake, handle } = await atReady();
      try {
        fake.current().drop(1006);
        await clock.advance(41_250 * 3);
        const carrying = fake.frames().filter((frame) => JSON.stringify(frame).includes(TOKEN_SEGMENT)).map((frame) => frame.op);
        assert.ok(carrying.length >= 2, "the IDENTIFY and the RESUME carry it");
        assert.deepEqual([...new Set(carrying)].sort(), [2, 6], "and no other frame does");
      } finally {
        handle.stop();
      }
    },
  },
];
