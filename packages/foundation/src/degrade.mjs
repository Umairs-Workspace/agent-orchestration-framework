// Instance-scoped, throttled diagnostics. Storage and its location belong to the caller.
export function createDegradeReporter({ createSink, clock = () => Date.now() }) {
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
  function reportDegrade(code, error, extra = {}) {
    try {
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
        ...(isPlainObject(extra?.screen) ? { screen: extra.screen } : {}),
      });
    } catch {
      // The reporter must never throw or recurse — this is the sanctioned floor.
    }
  }

  return { reportDegrade };
}
