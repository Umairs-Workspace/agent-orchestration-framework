import { WebSocket } from "ws";
import { discordRequest } from "./discord.mjs";

// Core supplies configured application services; construction performs no I/O.
export function createDiscordGateway({ reportDegrade }) {
// src/discord/gateway.mjs — THE GATEWAY CONNECTION (milestone 131 / story 10; ADR-008 §2). The ONE
// module that opens Discord's gateway socket (FF-13111). It identifies once and RESUMES on every
// reconnect, because IDENTIFY is limited to 1,000 a day per token and Discord resets a token past
// it; it stops, by name, on a close that no reconnect can fix.
//
// THE MACHINE: `GET /gateway/bot` (through `discordRequest`, the one authorised door) → connect →
// HELLO (heartbeat on its interval, the first beat jittered) → IDENTIFY or RESUME → READY or RESUMED
// → dispatches, each handed to `onDispatch(t, d)`. The session is three values — `session_id`,
// `resume_gateway_url` and the last sequence — and it lives only as long as this process.
// - It re-identifies only after INVALID_SESSION `d: false` or close 4007/4009.
// - It will not IDENTIFY while `session_start_limit.remaining < 10`: it degrades
//   `discord-identify-budget` and waits `reset_after`.
// - Closes 4004 and 4010–4014 are fatal: the connection stops and degrades once.
// - A heartbeat with no ACK before the next beat is a dead connection: closed (4000) and resumed.
// - Any other drop reconnects with backoff from 1 s, doubling to a 60 s cap, with jitter; a READY or
//   RESUMED resets it.
//
// Everything that touches the world is injected — the socket factory (default: the `ws` package
// already in the lockfile), the timers, the randomness and the request — so a test drives a fake
// gateway on a fake clock. It acts on a socket's `close` only (the `ws` client emits `close` after
// `error`, and acting on both would schedule two reconnects), and it never throws into the daemon.
// The token rides only the IDENTIFY and RESUME frames; no degrade message carries it.

// GUILD_MESSAGES (1 << 9) | MESSAGE_CONTENT (1 << 15): the replies and their text (ADR-008 §2).
const GATEWAY_INTENTS = (1 << 9) | (1 << 15);
// DEFAULT DECISION (ADR-008 §2): the identify floor, well above zero so a restart loop cannot spend
// the day's budget.
const IDENTIFY_FLOOR = 10;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 60_000;
// The close code this module sends when it drops a connection it means to resume: 1000 and 1001
// would invalidate the session.
const RESUME_CLOSE = 4000;
const STOP_CLOSE = 1000;
const OP = Object.freeze({ dispatch: 0, heartbeat: 1, identify: 2, resume: 6, reconnect: 7, invalidSession: 9, hello: 10, ack: 11 });
const REIDENTIFY_CLOSES = new Set([4007, 4009]);
// The fatal closes, each with the degrade it reports and the remedy it names.
const FATAL_CLOSES = Object.freeze({
  4004: ["discord-token-rejected", "Discord rejected the bot token (close 4004) — run `aof messaging init discord` with the token from the Developer Portal"],
  4010: ["discord-gateway-fatal", "the gateway closed with 4010 (invalid shard)"],
  4011: ["discord-gateway-fatal", "the gateway closed with 4011 (sharding required)"],
  4012: ["discord-gateway-fatal", "the gateway closed with 4012 (invalid API version)"],
  4013: ["discord-gateway-fatal", "the gateway closed with 4013 (invalid intents)"],
  4014: ["discord-intent-disallowed", "the gateway closed with 4014 (disallowed intents) — turn on Message Content Intent under Bot → Privileged Gateway Intents in the Discord Developer Portal"],
});

const defaultSocketFactory = (url) => new WebSocket(url);

function degrade(code, message) {
  reportDegrade(code, new Error(message));
}

// startGateway({ token, onDispatch, request, fetch, socketFactory, timers, random }) → { stop, state }.
// Starts connecting at once. `stop()` closes the socket and leaves no timer behind.
function startGateway({
  token,
  onDispatch,
  request = discordRequest,
  fetch,
  socketFactory = defaultSocketFactory,
  timers = { setTimeout, clearTimeout },
  random = Math.random,
} = {}) {
  let stopped = false;
  let socket = null;
  let sessionId = null;
  let resumeUrl = null;
  let seq = null;
  let heartbeatTimer = null;
  let reconnectTimer = null;
  let acked = true;
  let attempt = 0;

  const clearTimer = (timer) => { if (timer != null) timers.clearTimeout(timer); };
  const forgetSession = () => { sessionId = null; resumeUrl = null; seq = null; };
  // A send on a dying socket throws; its close follows and decides what happens next, so the send
  // only says it failed, by the frame's op and the error's name.
  const send = (target, frame) => {
    try {
      target.send(JSON.stringify(frame));
    } catch (error) {
      degrade("discord-gateway-send-failed", `a gateway frame (op ${frame.op}) could not be sent (${error instanceof Error ? error.name : "error"})`);
    }
  };

  function halt() {
    stopped = true;
    clearTimer(heartbeatTimer);
    clearTimer(reconnectTimer);
    heartbeatTimer = null;
    reconnectTimer = null;
  }

  function fatal(code) {
    const [degradeCode, message] = FATAL_CLOSES[code];
    halt();
    degrade(degradeCode, `the Discord bot stopped: ${message}`);
  }

  function scheduleReconnect() {
    if (stopped) return;
    const base = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
    attempt += 1;
    const delay = Math.floor(base / 2 + (base / 2) * random());
    reconnectTimer = timers.setTimeout(run, delay);
  }

  function run() {
    reconnectTimer = null;
    connect().catch((error) => {
      degrade("discord-gateway-unreachable", `connecting to the Discord gateway failed (${error instanceof Error ? error.name : "error"})`);
      scheduleReconnect();
    });
  }

  async function connect() {
    if (stopped) return;
    const resuming = sessionId != null && resumeUrl != null;
    let url = resumeUrl;
    if (!resuming) {
      const answer = await request(token, "GET", "/gateway/bot", null, { fetch });
      if (stopped) return;
      if (!answer.ok) {
        if (answer.status === 401) return fatal(4004);
        degrade("discord-gateway-unreachable", `GET /gateway/bot failed (${answer.status != null ? `status ${answer.status}` : answer.reason})`);
        return scheduleReconnect();
      }
      const limit = answer.json?.session_start_limit;
      if (typeof limit?.remaining === "number" && limit.remaining < IDENTIFY_FLOOR) {
        const wait = Math.max(0, Number(limit.reset_after) || 0);
        degrade("discord-identify-budget", `the bot's identify budget is nearly spent (${limit.remaining} left) — waiting ${wait} ms before connecting`);
        reconnectTimer = timers.setTimeout(run, wait);
        return;
      }
      url = answer.json?.url;
      if (typeof url !== "string" || url.length === 0) {
        degrade("discord-gateway-unreachable", "GET /gateway/bot answered no url");
        return scheduleReconnect();
      }
    }
    open(`${url.replace(/\/+$/u, "")}/?v=10&encoding=json`, resuming);
  }

  function open(url, resuming) {
    let target;
    try {
      target = socketFactory(url);
    } catch (error) {
      degrade("discord-gateway-unreachable", `opening the gateway socket failed (${error instanceof Error ? error.name : "error"})`);
      scheduleReconnect();
      return;
    }
    socket = target;
    target.on("error", () => {});
    target.on("message", (data) => {
      if (target === socket) onFrame(target, data, resuming);
    });
    target.on("close", (code) => {
      if (target === socket) onClose(code);
    });
  }

  function startHeartbeat(target, interval) {
    clearTimer(heartbeatTimer);
    acked = true;
    const every = Number(interval) > 0 ? Number(interval) : 41_250;
    const beat = () => {
      heartbeatTimer = null;
      if (target !== socket || stopped) return;
      if (!acked) {
        target.close(RESUME_CLOSE);
        return;
      }
      acked = false;
      send(target, { op: OP.heartbeat, d: seq });
      heartbeatTimer = timers.setTimeout(beat, every);
    };
    heartbeatTimer = timers.setTimeout(beat, Math.floor(every * random()));
  }

  function onFrame(target, data, resuming) {
    let frame;
    try {
      frame = JSON.parse(String(data));
    } catch {
      return;
    }
    if (typeof frame?.s === "number") seq = frame.s;
    switch (frame?.op) {
      case OP.hello:
        startHeartbeat(target, frame.d?.heartbeat_interval);
        send(target, resuming
          ? { op: OP.resume, d: { token, session_id: sessionId, seq } }
          : { op: OP.identify, d: { token, intents: GATEWAY_INTENTS, properties: { os: process.platform, browser: "aof", device: "aof" } } });
        return;
      case OP.ack:
        acked = true;
        return;
      case OP.heartbeat:
        send(target, { op: OP.heartbeat, d: seq });
        return;
      case OP.reconnect:
        target.close(RESUME_CLOSE);
        return;
      case OP.invalidSession:
        if (frame.d !== true) forgetSession();
        target.close(RESUME_CLOSE);
        return;
      case OP.dispatch:
        dispatch(frame.t, frame.d);
        return;
      default:
    }
  }

  function dispatch(t, d) {
    if (t === "READY") {
      sessionId = typeof d?.session_id === "string" ? d.session_id : null;
      resumeUrl = typeof d?.resume_gateway_url === "string" ? d.resume_gateway_url : null;
      attempt = 0;
    } else if (t === "RESUMED") {
      attempt = 0;
    }
    const failed = (error) => degrade("discord-dispatch-failed", `the bot's ${String(t)} handler failed (${error instanceof Error ? error.name : "error"})`);
    try {
      Promise.resolve(onDispatch?.(t, d)).catch(failed);
    } catch (error) {
      failed(error);
    }
  }

  function onClose(code) {
    socket = null;
    clearTimer(heartbeatTimer);
    heartbeatTimer = null;
    if (stopped) return;
    if (Object.hasOwn(FATAL_CLOSES, code)) return fatal(code);
    if (REIDENTIFY_CLOSES.has(code)) forgetSession();
    scheduleReconnect();
  }

  run();

  return {
    stop() {
      halt();
      const target = socket;
      socket = null;
      // Closing a socket that is already closing is a no-op for the `ws` client, never a throw.
      target?.close(STOP_CLOSE);
    },
    state: () => ({ connected: socket != null, sessionId, seq, stopped }),
  };
}

return { GATEWAY_INTENTS, IDENTIFY_FLOOR, startGateway };
}
