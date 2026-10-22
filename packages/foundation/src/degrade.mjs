import { processCostMeter } from './cost-meter.mjs';

// Instance-scoped, throttled diagnostics. Storage and its location belong to the caller.
// 167/ADR-001 — every report is COUNTED on the process's cost meter before the throttle can drop
// its line, so a code that fires a hundred times a second reads as a rate, not as one line per 5 s.
export function createDegradeReporter({ createSink, clock = () => Date.now(), meter = processCostMeter }) {
  if (typeof createSink !== 'function') throw new TypeError('createDegradeReporter requires createSink.');
  const THROTTLE_MS = 5000;
  const lastByCode = new Map();
  let sink = null;

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
  // 167/ADR-001 — `extra.workspaceId`, a non-empty string, names the workspace the fault was for: it
  // is counted with the report and written on the line.
  function reportDegrade(code, error, extra = {}) {
    const workspaceId = typeof extra?.workspaceId === "string" && extra.workspaceId.length > 0 ? extra.workspaceId : null;
    try {
      // Counted first, so the throttle below can drop the line but never the count.
      meter?.count?.("degrade", { code: String(code), ...(workspaceId ? { workspaceId } : {}) });
      const now = clock();
      const throttleKey = typeof extra?.key === "string" && extra.key.length > 0 ? `${code}\u0000${extra.key}` : code;
      const last = lastByCode.get(throttleKey) ?? 0;
      if (now - last < THROTTLE_MS) return;
      if (lastByCode.size >= THROTTLE_SWEEP_AT) {
        for (const [key, at] of lastByCode) if (now - at >= THROTTLE_MS) lastByCode.delete(key);
      }
      lastByCode.set(throttleKey, now);
      sink ??= createSink("degrade");
      sink.write({
        level: "degrade",
        code,
        message: String(error?.message ?? error ?? ""),
        ...(typeof extra?.path === "string" ? { path: extra.path } : {}),
        ...(workspaceId ? { workspaceId } : {}),
        ...(isPlainObject(extra?.screen) ? { screen: extra.screen } : {}),
      });
    } catch {
      // The reporter must never throw or recurse — this is the sanctioned floor.
    }
  }

  return { reportDegrade };
}
