// src/sqlite-runtime.mjs — THE one home for "import the SQLite runtime" (milestone 126 /
// ADR-008).
//
// WHY THIS EXISTS. `node:sqlite` raises an `ExperimentalWarning` on first import, and that
// line was — measurably — the ONLY output of an eleven-and-a-half-hour loop session. It is
// the first thing an operator sees from a command that then prints nothing for hours, and
// it is not actionable.
//
// WHY NOT A FLAG. `--no-warnings` and `--disable-warning=ExperimentalWarning` both work and
// both are blanket: they hide the deprecation warnings this repository wants to see. The
// filter here swallows exactly one warning — an `ExperimentalWarning` whose message names
// SQLite — and only while the import is in flight. `FF-12608` sweeps `src/`, `bin/`,
// `scripts/`, `src/bundle/` and `package.json` for the flags, because the cheap wrong fix is
// one line away at all times.
//
// WHY ONE HOME. Two modules imported the runtime and each carried its own copy of the same
// resolve body (`src/effects/journal.mjs`, `src/global-work-store.mjs`). This is a
// SUBTRACTION — two copies of one act become one — and the house rule (extend existing
// surfaces, never add siblings) applied to the smallest subject it has.
//
// WHAT THIS LEAF DOES NOT DO. It decides no policy. Each caller keeps its OWN refusal —
// the store throws `sqlite-unavailable` (501) and honours `options.sqlite === false`, the
// journal degrades in its own words — and each keeps its own `DatabaseSync` check, because
// that check is why a runtime without `DatabaseSync` is a coded refusal today where an
// INJECTED module is passed through unvalidated. A leaf that absorbed either would move a
// behaviour ADR-008 §2 says does not move.

// The real runtime, behind a function so a test can put a counting or throwing importer in
// its place. Beside `options.sqlite` (an injected MODULE, which both callers already
// accept), this is the injected IMPORT — the seam that makes "the leaf is what imported it"
// and "a throwing runtime" drivable in-process, with no filesystem trick and no reliance on
// a warning Node raises only once per process.
const defaultImporter = () => import("node:sqlite");

// Is this `emitWarning` call the one warning we swallow?
//
// `process.emitWarning` takes THREE shapes, and a predicate that reads only the second
// argument is blind to two of them (measured at the contract beat, node v22.22.2):
//
//   emitWarning(message, "ExperimentalWarning")      — what Node uses for THIS warning,
//                                                      called as (message, type, null, null)
//   emitWarning(error)                               — an Error whose `.name` IS the type;
//                                                      a type argument beside it is IGNORED
//   emitWarning(message, { type: "…" })              — the options form
//
// The message test is what keeps this targeted rather than a mute: another experimental
// warning raised during the same import still prints.
function isSqliteExperimentalWarning(args) {
  const [first, second] = args;

  if (first instanceof Error) {
    // The Error form: `.name` wins, and any type argument beside it is ignored — which is
    // what Node itself does, so reading the type argument here would disagree with the
    // warning the operator would have seen.
    return first.name === "ExperimentalWarning" && /SQLite/.test(String(first.message ?? ""));
  }

  const type =
    typeof second === "string"
      ? second
      : second != null && typeof second === "object"
        ? second.type
        : undefined;
  return type === "ExperimentalWarning" && /SQLite/.test(String(first ?? ""));
}

// importSqliteRuntime({ importer }) → the `node:sqlite` module.
//
// The filter is installed around the import and RESTORED IN A `finally`, so it is never in
// force for the lifetime of the process: an unrelated warning raised during an unrelated
// await can never be swallowed, and a throwing import still restores. Loading this module
// installs nothing — the wrap exists only for the duration of one call.
//
// A throw from the importer propagates UNCHANGED. Each caller catches it and raises its own
// coded refusal; this leaf never re-wraps it, so a caller that wants the original object
// (and its `code`) still has it.
export async function importSqliteRuntime(options = {}) {
  const importer = typeof options.importer === "function" ? options.importer : defaultImporter;
  const original = process.emitWarning;

  process.emitWarning = function filteredEmitWarning(...args) {
    if (isSqliteExperimentalWarning(args)) return undefined;
    // Forwarded UNCHANGED — a wrapper that rebuilt the call would strip the `code` and
    // `ctor` off every warning it passed on.
    return original.apply(this, args);
  };

  try {
    return await importer();
  } finally {
    process.emitWarning = original;
  }
}
