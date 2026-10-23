// packages/foundation/src/cost-meter.mjs — THE COST METER (milestone 167, ADR-001 and ADR-002).
//
// `mesh serve` held more than one core for 17 hours and nothing said so: the degrade sink throttles
// each code to one line per 5 s, so a read that falls back to disk 100 times a second looks exactly
// like one that falls back once. This leaf is what each daemon process measures itself with. It
// reads the process's own CPU and event-loop utilisation, counts work BY CAUSE with the workspace
// (or route, client, code) it was for, and hands out a snapshot a separate command can read.
//
// ONE METER PER PROCESS. `processCostMeter` is the instance every count site in a daemon reaches;
// `createCostMeter` exists so a test drives its own over an injected clock and CPU reader. This is
// the only module in `packages/` that reads either clock (FF-16701), and it has ZERO imports: the
// degrade reporter beside it counts through it, and that entry is browser-safe.
//
// THE BUDGET HAS ONE HOME, HERE (ADR-002, FF-16702). The measure is CPU-seconds per wall-second as
// a percentage of ONE core, over a sliding 60 s window, for this process alone (the `git` children
// a daemon spawns are the work the operator asked for). A daemon is `viewer-open` when it served a
// `fleet` or `board` request in the last 30 s and `idle` otherwise; the snapshot states which, so
// no reader infers it. The numbers are the operator's answer to 167/00 Q1 (2026-10-20). Readers
// import them or read them off `aof mesh status --json` `cost.budget`; none re-declares them.

export const DAEMON_BUDGET = Object.freeze({ idlePercent: 2, viewerOpenPercent: 10 });

// The closed set of causes. A count site names one of these and nothing else: a cause outside the
// set is refused naming the set, so a typo at a site is a loud failure, never a silent zero.
// `stat-walk` (167/ADR-009) is one real walk of a work tree in a process that watches its trees.
export const COST_CAUSES = Object.freeze(["full-disk-read", "cache-hit", "cache-miss", "sync-pass", "sync-failure", "request", "degrade", "stat-walk"]);

// The labels a count may carry. Anything else on the labels object is dropped, never stored.
export const COST_LABELS = Object.freeze(["workspaceId", "route", "client", "code"]);

// The clients a request may name (`X-AOF-Client`). Any other value, or none, counts as `unknown`.
export const COST_CLIENTS = Object.freeze(["fleet", "board"]);
export const COST_CLIENT_HEADER = "x-aof-client";

export const COST_SAMPLE_SECONDS = 15; // a snapshot is written, and a sample taken, this often
export const COST_WINDOW_SECONDS = 60; // the window the budget is judged over
export const VIEWER_OPEN_SECONDS = 30; // a fleet/board request this recent makes the daemon viewer-open
export const COST_STALE_SECONDS = 45; // three missed writes: a snapshot this old reads `not-reporting`
export const COST_DAEMONS = Object.freeze(["serve", "ui"]);

const TOP_CAUSES = 5;
// 167/04 R2 — the faults a daemon counted since it started (`sync-failure` and `degrade`), each
// with its labels. A fault said once (a permanent sync failure, a removed registration) counts 1 and
// never reaches the top causes beside a per-tick cause, so it is named here, bounded.
const FAULT_CAUSES = Object.freeze(["sync-failure", "degrade"]);
export const COST_FAULTS_LIMIT = 20;

// requestClient(header) — the client a request names, normalised to the closed set.
export function requestClient(header) {
  const value = Array.isArray(header) ? header[0] : header;
  return COST_CLIENTS.includes(value) ? value : "unknown";
}

// The process readers. Read through `globalThis` so the module needs no import and degrades to a
// zero reading where a host has neither (a browser bundle that pulls in the degrade reporter).
const readProcessCpuMicros = () => {
  const usage = globalThis.process?.cpuUsage?.();
  return usage == null ? 0 : usage.user + usage.system;
};
const readProcessEventLoop = () => {
  const reading = globalThis.performance?.eventLoopUtilization?.();
  return reading == null ? { idle: 0, active: 0 } : { idle: reading.idle, active: reading.active };
};

const round = (value) => (Number.isFinite(value) ? Math.round(value * 100) / 100 : null);

function normaliseLabels(labels) {
  const out = {};
  if (labels == null || typeof labels !== "object") return out;
  for (const key of COST_LABELS) {
    const value = labels[key];
    if (typeof value === "string" && value.length > 0) out[key] = value;
  }
  return out;
}

const counterKey = (cause, labels) => `${cause}\u0000${COST_LABELS.map((key) => labels[key] ?? "").join("\u0000")}`;

// createCostMeter({ clock, cpuMicros, eventLoop, pid, strict }) — one meter.
//   clock     () => epoch ms (default Date.now)
//   cpuMicros () => cumulative user+system CPU of this process in µs (default process.cpuUsage)
//   eventLoop () => cumulative { idle, active } ms (default performance.eventLoopUtilization)
//   strict    an unknown cause THROWS (default). A non-strict meter drops it and remembers the
//             name in the snapshot's `refused`, so a production daemon never dies of a typo.
export function createCostMeter({ clock = () => Date.now(), cpuMicros = readProcessCpuMicros, eventLoop = readProcessEventLoop, pid = globalThis.process?.pid ?? null, strict = true } = {}) {
  const counters = new Map(); // key → { cause, labels, count }
  const refused = new Set();
  const reading = () => ({ at: clock(), cpu: cpuMicros(), loop: eventLoop(), counts: new Map([...counters].map(([key, entry]) => [key, entry.count])) });
  const start = reading();
  let samples = []; // the 15 s ring: the window is a subtraction, never a timer of its own
  let lastViewerAt = null;

  function count(cause, labels = {}) {
    if (!COST_CAUSES.includes(cause)) {
      if (strict) throw new RangeError(`unknown cost cause "${cause}" — the meter accepts ${COST_CAUSES.join(", ")}`);
      refused.add(String(cause));
      return;
    }
    const normalised = normaliseLabels(labels);
    const key = counterKey(cause, normalised);
    const entry = counters.get(key);
    if (entry) entry.count += 1;
    else counters.set(key, { cause, labels: normalised, count: 1 });
    if (cause === "request" && COST_CLIENTS.includes(normalised.client)) lastViewerAt = clock();
  }

  // total(cause, labels) — the count since start of every counter for `cause` whose labels include
  // every label given (an absent label matches any value).
  function total(cause, labels = {}) {
    const wanted = normaliseLabels(labels);
    let sum = 0;
    for (const entry of counters.values()) {
      if (entry.cause !== cause) continue;
      if (Object.entries(wanted).every(([key, value]) => entry.labels[key] === value)) sum += entry.count;
    }
    return sum;
  }

  const list = () => [...counters.values()].map((entry) => ({ cause: entry.cause, labels: { ...entry.labels }, count: entry.count }));

  // sample() — one 15 s reading into the ring; readings older than the window are dropped.
  function sample() {
    const now = reading();
    samples.push(now);
    const horizon = now.at - (COST_WINDOW_SECONDS + COST_SAMPLE_SECONDS) * 1000;
    samples = samples.filter((entry) => entry.at >= horizon);
    return now;
  }

  const stateAt = (at) => (lastViewerAt != null && at - lastViewerAt <= VIEWER_OPEN_SECONDS * 1000 ? "viewer-open" : "idle");

  // snapshot({ daemon }) — what a reader needs, taken now. The window's base is the oldest reading
  // still inside 60 s, or the meter's start while the daemon is younger than that.
  function snapshot({ daemon } = {}) {
    const now = reading();
    const inWindow = samples.filter((entry) => now.at - entry.at <= COST_WINDOW_SECONDS * 1000 && entry.at < now.at);
    const base = inWindow[0] ?? start;
    const share = (from) => {
      const wallMs = now.at - from.at;
      return wallMs > 0 ? round(((now.cpu - from.cpu) / 1000 / wallMs) * 100) : null;
    };
    const utilisation = (from) => {
      const active = now.loop.active - from.loop.active;
      const idle = now.loop.idle - from.loop.idle;
      return active + idle > 0 ? round(active / (active + idle)) : null;
    };
    const topCauses = [...counters].map(([key, entry]) => ({ cause: entry.cause, labels: { ...entry.labels }, count: entry.count - (base.counts.get(key) ?? 0) }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause))
      .slice(0, TOP_CAUSES);
    const faults = [...counters.values()].filter((entry) => FAULT_CAUSES.includes(entry.cause))
      .map((entry) => ({ cause: entry.cause, labels: { ...entry.labels }, count: entry.count }))
      .sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause))
      .slice(0, COST_FAULTS_LIMIT);
    const state = stateAt(now.at);
    return {
      schema: 1,
      daemon: daemon ?? null,
      pid,
      at: new Date(now.at).toISOString(),
      startedAt: new Date(start.at).toISOString(),
      windowSeconds: Math.round(Math.min(COST_WINDOW_SECONDS * 1000, now.at - base.at) / 1000),
      cpuPercent: share(base),
      cpuPercentSinceStart: share(start),
      eventLoopUtilization: utilisation(base),
      eventLoopUtilizationSinceStart: utilisation(start),
      state,
      budgetPercent: budgetFor(state),
      topCauses,
      faults,
      ...(refused.size > 0 ? { refused: [...refused] } : {}),
    };
  }

  return { count, total, counters: list, sample, snapshot };
}

const budgetFor = (state) => (state === "viewer-open" ? DAEMON_BUDGET.viewerOpenPercent : DAEMON_BUDGET.idlePercent);

// judge(snapshot) → { state, budgetPercent, over } — the one judgement on one window. Over means
// strictly above the budget: 2% idle is within it, 2.1% is not.
export function judge(snapshot) {
  const state = snapshot?.state === "viewer-open" ? "viewer-open" : "idle";
  const budgetPercent = budgetFor(state);
  const share = Number(snapshot?.cpuPercent);
  return { state, budgetPercent, over: Number.isFinite(share) && share > budgetPercent };
}

// describeCost(snapshots, nowMs) → the `cost` block `aof mesh status --json` carries and the doctor
// lane judges. ONE reading of the snapshots, so the two never disagree about what is stale.
//   snapshots — the parsed `<nodeId>.<daemon>.json` records (absent daemons simply are not listed)
export function describeCost(snapshots, nowMs) {
  const daemons = [];
  for (const snapshot of Array.isArray(snapshots) ? snapshots : []) {
    if (snapshot == null || typeof snapshot !== "object" || !COST_DAEMONS.includes(snapshot.daemon)) continue;
    const atMs = Date.parse(snapshot.at);
    const ageSeconds = Number.isFinite(atMs) && Number.isFinite(nowMs) ? Math.max(0, Math.round((nowMs - atMs) / 1000)) : null;
    const reporting = ageSeconds != null && ageSeconds <= COST_STALE_SECONDS;
    const { state, budgetPercent, over } = judge(snapshot);
    daemons.push({
      daemon: snapshot.daemon,
      status: reporting ? state : "not-reporting",
      state,
      at: snapshot.at ?? null,
      ageSeconds,
      pid: snapshot.pid ?? null,
      cpuPercent: snapshot.cpuPercent ?? null,
      budgetPercent,
      over: reporting && over,
      topCauses: (Array.isArray(snapshot.topCauses) ? snapshot.topCauses : []).slice(0, 3),
      faults: (Array.isArray(snapshot.faults) ? snapshot.faults : []).slice(0, COST_FAULTS_LIMIT),
    });
  }
  daemons.sort((a, b) => COST_DAEMONS.indexOf(a.daemon) - COST_DAEMONS.indexOf(b.daemon));
  return {
    budget: { ...DAEMON_BUDGET, windowSeconds: COST_WINDOW_SECONDS },
    staleAfterSeconds: COST_STALE_SECONDS,
    daemons,
  };
}

// causeLabel(entry) — "full-disk-read for 52294b307214c27d", "request for /api/work/list (board)".
export function causeLabel(entry) {
  const labels = entry?.labels ?? {};
  const subject = labels.workspaceId ?? labels.route ?? labels.code ?? null;
  const client = labels.route != null && labels.client != null ? ` (${labels.client})` : "";
  return subject == null ? String(entry?.cause) : `${entry.cause} for ${subject}${client}`;
}

// startCostSnapshots({ meter, daemon, publish, ticker, onError }) — the 15 s writer each daemon runs.
// Every tick takes a sample and publishes a snapshot; `stop()` publishes once more (a clean stop
// leaves the last word on disk) — ONCE MORE: a writer stopped before its first tick wrote nothing and
// writes nothing, so a daemon started and stopped inside 15 s leaves no file behind. `ticker` is the launcher's injected `{ start, stop }` shape, so a
// test never waits on the clock. A publish fault is handed to `onError`, never thrown at the tick.
export function startCostSnapshots({ meter = processCostMeter, daemon, publish, ticker = unrefIntervalTicker(), onError = () => {} } = {}) {
  if (typeof publish !== "function") throw new TypeError("startCostSnapshots requires publish.");
  let wrote = false;
  const write = () => {
    wrote = true;
    try {
      // The snapshot is taken BEFORE this tick's sample: a sample taken first becomes the window's
      // base whenever the clock has moved a millisecond between the two, and the snapshot then
      // reports an empty window (no causes, no CPU share). Measured on 167/00's launcher test.
      const snapshot = meter.snapshot({ daemon });
      meter.sample();
      return Promise.resolve(publish(snapshot)).catch(onError);
    } catch (error) {
      onError(error);
      return Promise.resolve();
    }
  };
  const handle = ticker.start(COST_SAMPLE_SECONDS, () => { write(); });
  let stopped = false;
  return {
    write,
    stop() {
      if (stopped) return Promise.resolve();
      stopped = true;
      ticker.stop(handle);
      return wrote ? write() : Promise.resolve();
    },
  };
}

// A real ticker that never holds a process open on its own account.
function unrefIntervalTicker() {
  return {
    start(intervalSeconds, onTick) {
      const handle = setInterval(onTick, intervalSeconds * 1000);
      handle?.unref?.();
      return handle;
    },
    stop(handle) {
      clearInterval(handle);
    },
  };
}

// The process's one meter. Non-strict: a production daemon drops an unknown cause rather than die.
export const processCostMeter = createCostMeter({ strict: false });
