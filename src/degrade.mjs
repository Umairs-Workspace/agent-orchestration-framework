// src/degrade.mjs — "errors are events, not silence" (m42 wave (a), TECH_DEBT
// item 3's sweep). Every former silent catch in src/ now reports here: one coded
// JSONL event into the mesh-log sink family (degrade.log beside the daemons' own
// logs), throttled per code so a hot degrade loop is bounded, and NEVER throwing —
// a degrade reporter that could itself crash the daemon would be worse than the
// silence it replaces.
//
// This module and mesh-log.mjs are the ONLY sanctioned silent-catch homes left
// (the acd-no-new-silent-catch baseline): the sink's own faults have nowhere
// lower to report.
import { createMeshLogSink } from "./mesh/log.mjs";

const THROTTLE_MS = 5000;
const lastByCode = new Map();
let sink = null;
let sinkFactory = null;

// setDegradeSinkForTest(factory) — inject a fake sink factory (undefined resets).
export function setDegradeSinkForTest(factory) {
  sinkFactory = factory;
  sink = null;
  lastByCode.clear();
}

// 138/ADR-004 §3 — the throttle's memory is bounded: a daemon hosting session after session keys
// each one's evidence separately, so entries past their window are swept once the map grows.
const THROTTLE_SWEEP_AT = 256;

const isPlainObject = (value) => value != null && typeof value === "object"
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

// reportDegrade(code, error, extra) — the ONE degrade event emitter. Best-effort
// by contract: a throttled repeat is dropped (the first event named the class),
// and any fault in the reporter itself is swallowed (the sanctioned floor).
//
// 138/ADR-004 §3 — `extra.key`, a non-empty string, throttles per (code, key) instead of per code,
// so one process hosting several sessions (the mesh worker daemon) never drops a second session's
// screen behind the first's; it is not written. `extra.screen`, a plain object, rides the event as
// `screen`. A caller passing neither writes exactly the event it always did.
export function reportDegrade(code, error, extra = {}) {
  try {
    const now = Date.now();
    const throttleKey = typeof extra?.key === "string" && extra.key.length > 0 ? `${code}\u0000${extra.key}` : code;
    const last = lastByCode.get(throttleKey) ?? 0;
    if (now - last < THROTTLE_MS) return;
    if (lastByCode.size >= THROTTLE_SWEEP_AT) {
      for (const [key, at] of lastByCode) if (now - at >= THROTTLE_MS) lastByCode.delete(key);
    }
    lastByCode.set(throttleKey, now);
    sink ??= (sinkFactory ?? ((proc) => createMeshLogSink(proc, { env: process.env })))("degrade");
    sink.write({
      level: "degrade",
      code,
      message: String(error?.message ?? error ?? ""),
      ...(typeof extra?.path === "string" ? { path: extra.path } : {}),
      ...(isPlainObject(extra?.screen) ? { screen: extra.screen } : {}),
    });
  } catch {
    // The reporter must never throw or recurse — this is the sanctioned floor.
  }
}
