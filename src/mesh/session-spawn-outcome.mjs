// src/mesh/session-spawn-outcome.mjs — the SPAWN-OUTCOME REGISTRY (milestone 50 /
// story 04, ADR-008 decision 4): the mesh-ui process's ephemeral, tuple-keyed,
// bounded answer to "what happened to the session I asked for?".
//
// WHY IT EXISTS. The worker mints five outcomes for a spawn — four coded refusals and
// one success — and every one of them rides ONE frame, `session-spawn-ack`
// (mesh-session-spawn-directive.mjs), sent AFTER the fleet face already answered
// `200 { ok:true, sessionId }`. Until ADR-008 nothing read that frame: it fell through
// the control's `applyStreamFrame` kind table into the `unknown-frame-kind` path and
// became a daemon-log sentence whose three of four claims were false. This registry is
// the reading end.
//
// EPHEMERAL BY CONTRACT, AND THAT IS THE DECISION. Nothing here is a system of record:
// no fs import, no store, no socket, no durable write, no schema. A rebuilt mesh-ui
// process starts empty — exactly as `createTerminalMirror` does — so killing it loses
// the EXPLANATION of a spawn and never data (nothing was written to lose). ADR-002
// decision 6's no-persist clause and ADR-004 decision 5's "only the worker writes a
// session record" both stand: a failed spawn registers no session, so there is no
// record to hang an outcome on.
//
// NO LIFECYCLE, NO HANDLE, NO TIMER. Expiry is enforced INSIDE `apply`/`read` rather
// than by an interval, so this module owns nothing `server.close` could get wrong and
// exposes no `dispose`/`stop`/`close` for a caller to forget.
//
// KEYED BY THE (nodeId, sessionId) TUPLE, never by sessionId alone — the terminal
// mirror's own `routingKey` discipline. Combined with the control-side F17 re-stamp
// (mesh-launcher.mjs wires the envelope's nodeId from the CONNECTION-bound identity,
// never the worker's self-declared `frame.nodeId`), this makes cross-node forgery
// structurally impossible: worker B's ack keys `(B, sessionId)` and can never resolve a
// spawn the browser is waiting on at `(A, sessionId)`.
//
// ONE IMPORT, and it is the wire kind's ONE home — the registry filters on the SAME
// constant the worker's builder stamps and the control's branch compares, so no
// re-spelled literal can drift between the three ends of this lane.
import { SESSION_SPAWN_ACK_KIND } from "./session-spawn-directive.mjs";

// BORROWED, NOT INVENTED: the terminal mirror's own `MAX_TAIL_KEYS` bound
// (mesh-terminal-mirror.mjs), for the same reason — a control node that has relayed
// many spawns must not grow without bound. LRU-evicted on insertion.
export const MAX_SPAWN_OUTCOMES = 64;

// EIGHT TIMES the client's 15s outcome window (ADR-008 decision 7), which is what makes
// "the browser was not connected at ack time" a non-event: a refreshed tab, a slow first
// poll or a reopened page still finds the answer waiting. Past it an entry reads as
// ABSENT — i.e. `pending` again — because a two-minute-old answer to a question nobody
// asked is not a fact worth keeping.
export const SPAWN_OUTCOME_RETENTION_MS = 120_000;

// routingKey(nodeId, sessionId) — the ONE (nodeId, sessionId) -> string join, so `apply`
// and `read` can never drift on how a tuple is spelled. A missing or non-string half
// never matches anything (no accidental "undefined::x"), which is also what makes
// `read` total: a null tuple, a numeric sessionId and a frozen argument all resolve to
// a null key and answer `null` rather than throwing.
function routingKey(nodeId, sessionId) {
  if (typeof nodeId !== "string" || nodeId.length === 0) return null;
  if (typeof sessionId !== "string" || sessionId.length === 0) return null;
  return `${nodeId}::${sessionId}`;
}

// createSpawnOutcomeRegistry({ now }) -> { apply(envelope), read(nodeId, sessionId) }.
//
// `apply(envelope) -> boolean` is DELIBERATELY `createTerminalMirror().apply`'s consumer
// contract, so the SHIPPED subscriber machinery (parse + backoff + reconnect,
// startTerminalMirrorSubscriber) drives this registry with zero new transport code —
// the same trick `createTerminalInputRouter` already plays on the serve side. It is
// kind-blind to everything but SESSION_SPAWN_ACK_KIND, never throws, and drops a frame
// with no resolvable tuple.
//
// `now` is INJECTED (the ticker-injection idiom every mesh module keeps) — this module
// reads no clock of its own beyond the documented default.
export function createSpawnOutcomeRegistry({ now = () => new Date().toISOString() } = {}) {
  // key -> { ok, code, at, atMs }. INSERTION ORDER IS LRU ORDER (the mirror's own
  // property): an applied tuple is re-inserted at the most-recent end, so eviction
  // always drops the least-recently-applied head.
  const outcomes = new Map();

  // The ONE clock read per operation, resolved to BOTH forms: the wire's ISO string
  // (what the route answers as `at`) and the millisecond number the retention window is
  // arithmetic over. A `now` that yields a number is honoured too, so a test may inject
  // a plain counter.
  const instant = () => {
    const value = typeof now === "function" ? now() : now;
    if (typeof value === "number" && Number.isFinite(value)) {
      return { at: new Date(value).toISOString(), atMs: value };
    }
    const at = typeof value === "string" && value.length > 0 ? value : new Date().toISOString();
    const parsed = Date.parse(at);
    return { at, atMs: Number.isFinite(parsed) ? parsed : 0 };
  };

  // PRUNED ON ACCESS, never on a timer. At most MAX_SPAWN_OUTCOMES entries live here, so
  // this sweep is bounded by construction and costs nothing worth a handle.
  const prune = (nowMs) => {
    for (const [key, entry] of outcomes) {
      if (nowMs - entry.atMs > SPAWN_OUTCOME_RETENTION_MS) outcomes.delete(key);
    }
  };

  return {
    apply(envelope) {
      if (envelope == null || typeof envelope !== "object") return false;
      if (envelope.kind !== SESSION_SPAWN_ACK_KIND) return false;
      const signal = envelope.signal;
      if (signal == null || typeof signal !== "object") return false;
      const key = routingKey(envelope.nodeId, signal.sessionId);
      // NO TUPLE, NO ENTRY. There is nothing to key an outcome on and nothing a browser
      // could ever ask for — dropped, exactly as the mirror drops an unroutable frame.
      if (key == null) return false;
      const { at, atMs } = instant();
      prune(atMs);
      // Refresh the LRU position on re-apply (delete + set), so a tuple that just spoke
      // is the LAST thing evicted rather than the first.
      outcomes.delete(key);
      if (outcomes.size >= MAX_SPAWN_OUTCOMES) {
        const lruKey = outcomes.keys().next().value;
        if (lruKey !== undefined) outcomes.delete(lruKey);
      }
      outcomes.set(key, {
        // STRICT. An `ok` a producer did not state is not a success — the same
        // unstated-fact-is-false rule `workspaceHasRun` keeps one hop down the wire.
        ok: signal.ok === true,
        code: typeof signal.code === "string" && signal.code.length > 0 ? signal.code : null,
        at,
        atMs,
      });
      return true;
    },

    // read(nodeId, sessionId) -> { ok, code, at } | null. A Map lookup and nothing else:
    // no store open, no fs, no network. TOTAL — it answers `null` for every input it
    // cannot key, and never throws.
    read(nodeId, sessionId) {
      const { atMs } = instant();
      prune(atMs);
      const key = routingKey(nodeId, sessionId);
      if (key == null) return null;
      const entry = outcomes.get(key);
      if (entry == null) return null;
      return { ok: entry.ok, code: entry.code, at: entry.at };
    },
  };
}
