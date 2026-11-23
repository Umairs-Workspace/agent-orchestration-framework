// Fix wall time for the CLI's date-only status/scaffold fields and doctor freshness.
// Timers and elapsed-time measurements still run normally.
const RealDate = Date;
const instant = RealDate.UTC(2026, 0, 16, 12);
globalThis.Date = new Proxy(RealDate, {
  apply() {
    return new RealDate(instant).toString();
  },
  construct(target, args, newTarget) {
    return Reflect.construct(target, args.length ? args : [instant], newTarget);
  },
  get(target, key, receiver) {
    if (key === "now") return () => instant;
    return Reflect.get(target, key, receiver);
  },
});
