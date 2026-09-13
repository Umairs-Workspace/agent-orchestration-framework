// THE DECLARED BOUNDS — ONE JOIN, TWO SOURCES, ONE VOCABULARY (milestone 77 / story 03).
// ADR-007 §1. ADR-008 §1, §2, §3, §4. 69/ADR-004.
//
// The lane asks ONE question — does this project declare a bound where a bound is expected? — and
// answers it from two sources. The loop registry supplies the bounds the project declares about its
// own loops; the reference corpus supplies the bounds other systems ship. One lane, one subject, two
// sources, one set of codes across both, so a reader never has to ask which half of the join a
// finding fell out of.
//
// ── AN UNCAPPED CEILING IS ONE ROW OF THIS JOIN, NOT A SECOND RULE ───────────────────────────
//
// `loop-ceiling-uncapped` exists already, declared and emitted at `warn` by the registry validation,
// and it stays exactly there: this lane neither moves it, re-emits it, nor gives it a second
// severity. Two commands emitting one code at two severities is the confusion a control one
// directory over exists to prevent. `69/FF-6902` already hard-gates THIS repository's own registry;
// what is open is a governed PROJECT's, and that is what this join reaches.
//
// ── THE MODEL ARRIVES INJECTED, AND THE DISK IS NEVER READ ───────────────────────────────────
//
// `runAudit` already receives the parsed loop model and the registry-checks lane already consumes it
// that way. This lane does the same and parses nothing: a second reading of one parse is not a
// second derivation, but a second parser would be. It therefore imports NO node builtin, touches no
// filesystem and reads no clock — the instant of the run arrives on the call.
//
// `src/work/loops.mjs` is deliberately NOT imported: 50+ dependents behind it, and it reaches
// `src/work.mjs`. `config:` ceiling pointers resolve through `src/loop-bounds.mjs` (0 imports),
// which is the SAME home the framework's own hard gate asks, so the authority is shared rather than
// copied.
//
// ── THE SEVERITY LADDER IS FIXED HERE, PER CODE, AND IT WAS SET FROM EVIDENCE (ADR-008 §4) ───
//
//   · a loop whose ceiling is `uncapped`/`unknown`      `error` — the record says outright that
//                                                        nothing bounds it
//   · a reference row this project declares nowhere      `warn`  — only the reference noticed
//   · a declared bound outside the reference's range     `warn`  — an ARGUMENT, not a defect
//   · a reference row older than the staleness window    `warn`  — an old install speaking, about a
//                                                        fact the audited project does not own
//
// ── AND WHAT THE LANE COULD NOT SEE IS STATED ON EVERY RUN ───────────────────────────────────
//
// A pointer resolving nowhere and a project with no registry at all are both ANSWERS, never loops
// quietly counted as bounded. found-nothing and looked-at-nothing are the two facts a report must
// never merge, so each population is counted against a floor and each absence is a limit naming its
// own reason.
import { HARNESS_REFERENCE_ROWS, parseCheckedDate } from "../harness-reference.mjs";
import { LOOP_BOUND_CONFIG_KEYS, resolvesLoopBoundConfigKey, LOOP_BOUND_CONFIG_RESOLVERS } from "../loop-bounds.mjs";
import { limitRecord, readRecord } from "./reads.mjs";

// ── THE FROZEN VOCABULARY (ADR-007 §4) ───────────────────────────────────────────────────────
//
// Three codes, and none of them spells the word the exemption ledger already owns.
export const DECLARED_BOUNDS_FINDING_CODES = Object.freeze([
  "audit-bound-undeclared",
  "audit-bound-off-reference",
  "audit-reference-stale",
]);

// A year. The refresh is hand-run and the corpus travels with the payload, so the window is really
// asking "is this install old enough that the numbers it compares against may have moved?" — and a
// year is the shortest span over which that is worth saying out loud without saying it constantly.
export const DEFAULT_REFERENCE_STALE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

// ── THE SWEEP REGISTRY ───────────────────────────────────────────────────────────────────────

export const DECLARED_BOUNDS_SWEEPS = Object.freeze([
  Object.freeze({
    id: "declared-bound-loops",
    what: "every loop record the parsed registry model holds, read for the ceiling it declares",
    root: "<the audited project's loop registry>",
    floor: 1,
    basis: "disk",
    question: "did every loop's declared ceiling resolve to a bound this lane could name?",
  }),
  Object.freeze({
    id: "declared-bound-reference",
    what: "every row of the reference corpus that ships with this payload, joined against what the project declares",
    root: "src/harness-reference.mjs",
    floor: 1,
    basis: "disk",
    question: "is every bound the reference carries declared somewhere in this project?",
  }),
]);

// ── THE ONE MAPPING FROM A REFERENCE BOUND TO A KNOB THIS PROJECT ACTUALLY READS ─────────────
//
// A reference row's `bound` carries its unit, and a mapping is admitted only where the units
// already agree — a comparison across units is a bug with a plausible-looking value. A bound this
// project maps to nothing is NOT an embarrassment to be hidden: it is the finding, at `warn`.
//
// Every value here is asserted to be a member of `LOOP_BOUND_CONFIG_KEYS`, so this map cannot name
// a knob nobody reads; the resolution goes through the bounds home's own resolvers rather than
// through a second reader of the config key.
export const BOUND_CONFIG_KEYS = Object.freeze({
  // Kubernetes' `backoffLimit` and this project's `progressMaxResets` answer one question — how
  // many times may this be re-attempted before we stop — in one unit.
  "retry attempt ceiling (attempts)": "work.loop.progressMaxResets",
});

/**
 * The bounds this project declares, as `{ [bound]: number }`, resolved through the bounds home's
 * own callables. The face hands the answer to the lane; the lane joins and never reads a key.
 */
export function declaredBoundValues(workspace) {
  const declared = {};
  for (const [bound, key] of Object.entries(BOUND_CONFIG_KEYS)) {
    const resolve = LOOP_BOUND_CONFIG_RESOLVERS[key];
    if (typeof resolve !== "function") continue;
    const value = resolve(workspace);
    if (typeof value === "number" && Number.isFinite(value)) declared[bound] = value;
  }
  return Object.freeze(declared);
}

/** The problems with the map above — a value naming a key the bounds home does not declare. */
export function boundConfigKeyProblems(map = BOUND_CONFIG_KEYS) {
  return Object.entries(map)
    .filter(([, key]) => !LOOP_BOUND_CONFIG_KEYS.includes(key))
    .map(([bound, key]) => `the bound "${bound}" maps to "${key}", which is not a key the bounds home declares — a mapping onto a knob nobody reads compares a reference row against nothing`);
}

// ── THE LOOP SIDE ────────────────────────────────────────────────────────────────────────────

const loopNodes = (model) => (Array.isArray(model?.nodes) ? model.nodes : []).filter((node) => node?.kind === "loop");

// A ceiling entry, classified. `declared` says the record answered the question at all; `resolved`
// says this lane could follow the answer to a bound. The two are apart because a `module:` pointer
// is declared and is not this lane's to resolve — the registry validation already owns that, with
// its own code, and inventing a second one here is exactly what ADR-008 §1 refuses.
function classifyCeiling(entry) {
  if (entry?.kind === "uncapped" || entry?.kind === "unknown") {
    return { declared: false, resolved: false, why: entry.kind, pointerKey: null };
  }
  if (entry?.kind === "pointer" && entry.pointer?.scheme === "config") {
    const key = typeof entry.pointer.operand === "string" ? entry.pointer.operand : "";
    return { declared: true, resolved: resolvesLoopBoundConfigKey(key) === true, why: null, pointerKey: key };
  }
  // `none` (terminates by construction), a `module:` pointer, anything else the loader admitted.
  return { declared: true, resolved: true, why: null, pointerKey: null };
}

function loopFindings(model) {
  const findings = [];
  const resolvedLoops = [];
  const unresolvedPointers = [];
  for (const node of loopNodes(model)) {
    const entries = node?.fields?.ceiling;
    const entry = Array.isArray(entries) ? entries[0] : entries;
    if (entry == null) continue; // the loader already refuses a loop declaring no ceiling at all
    const verdict = classifyCeiling(entry);
    if (!verdict.declared) {
      findings.push(Object.freeze({
        code: "audit-bound-undeclared",
        severity: "error",
        path: node.path,
        message: `the loop "${node.id ?? "<unnamed>"}" declares \`ceiling: ${verdict.why}\` in ${node.path} — a loop whose own record says nothing bounds it is a bound that exists only in prose. Declare a ceiling, or point the \`ceiling\` field at the key that already caps it.`,
      }));
      continue;
    }
    if (!verdict.resolved) {
      unresolvedPointers.push(`${node.id ?? "<unnamed>"} → config:${verdict.pointerKey}`);
      continue;
    }
    resolvedLoops.push(node.id ?? node.path);
  }
  return { findings, resolvedLoops, unresolvedPointers };
}

// ── THE REFERENCE SIDE ───────────────────────────────────────────────────────────────────────

// The range for a bound is the SPREAD of the rows that carry it, and both edges are inside it: a
// value equal to the only row anyone ships is not an argument with anybody.
export function boundRange(rows, bound) {
  const carrying = rows.filter((row) => row?.bound === bound && typeof row.value === "number");
  if (carrying.length === 0) return null;
  let low = carrying[0];
  let high = carrying[0];
  for (const row of carrying) {
    if (row.value < low.value) low = row;
    if (row.value > high.value) high = row;
  }
  return Object.freeze({ low, high });
}

function referenceFindings(rows, declaredBounds, { now, staleWindowMs }) {
  const undeclared = [];
  const offReference = [];
  const stale = [];
  const seenBounds = new Set();
  for (const row of rows) {
    const declared = declaredBounds?.[row?.bound];
    const hasDeclaration = typeof declared === "number" && Number.isFinite(declared);
    if (!hasDeclaration) {
      undeclared.push(Object.freeze({
        code: "audit-bound-undeclared",
        severity: "warn",
        path: DECLARED_BOUNDS_SWEEPS[1].root,
        message: `${row.system} ships ${row.value} for "${row.bound}" (reference row ${row.id}) and this project declares no value for it — a bound everyone else ships and nobody here states is a decision that was never taken.`,
      }));
    } else if (!seenBounds.has(row.bound)) {
      seenBounds.add(row.bound);
      const range = boundRange(rows, row.bound);
      const edge = range == null ? null : declared < range.low.value ? range.low : declared > range.high.value ? range.high : null;
      if (edge != null) {
        offReference.push(Object.freeze({
          code: "audit-bound-off-reference",
          severity: "warn",
          path: DECLARED_BOUNDS_SWEEPS[1].root,
          message: `this project declares ${declared} for "${row.bound}" and the reference range is ${range.low.value}–${range.high.value}; ${edge.system} ships ${edge.value} (reference row ${edge.id}). That is an argument, not a defect — it is stated so it can be had.`,
        }));
      }
    }
    const checked = parseCheckedDate(row?.checked);
    if (checked != null && now - checked > staleWindowMs) {
      stale.push(Object.freeze({
        code: "audit-reference-stale",
        severity: "warn",
        path: DECLARED_BOUNDS_SWEEPS[1].root,
        message: `reference row ${row.id} was last checked ${row.checked}, which is older than the ${Math.round(staleWindowMs / (24 * 60 * 60 * 1000))}-day window — the reference corpus ships with the installed aof payload, so this is that payload speaking about its own age and is not a fact about the project being audited.`,
      }));
    }
  }
  return [...undeclared, ...offReference, ...stale];
}

// ── THE LANE ─────────────────────────────────────────────────────────────────────────────────

/**
 * PURE. The bounds join over an injected model, injected reference rows, an injected map of what
 * this project declares, and an injected instant. Returns `{ findings, reads, limits, resolvedLoops,
 * unresolvedPointers }`.
 */
export function runDeclaredBounds({
  model = null,
  rows = HARNESS_REFERENCE_ROWS,
  declaredBounds = {},
  now,
  staleWindowMs = DEFAULT_REFERENCE_STALE_WINDOW_MS,
  sweeps = DECLARED_BOUNDS_SWEEPS,
} = {}) {
  if (typeof now !== "number" || !Number.isFinite(now)) {
    throw new TypeError("work-audit/declared-bounds: the instant of the run is supplied on the call — this lane reads no clock, so two runs over one corpus answer the same thing");
  }
  const nodes = loopNodes(model);
  const answered = nodes.length > 0;
  const loops = answered ? loopFindings(model) : { findings: [], resolvedLoops: [], unresolvedPointers: [] };

  const findings = Object.freeze([
    ...loops.findings,
    ...referenceFindings(Array.isArray(rows) ? rows : [], declaredBounds, { now, staleWindowMs }),
  ]);

  const reads = Object.freeze([
    readRecord(sweeps[0], nodes.length, model?.source ?? sweeps[0].root),
    readRecord(sweeps[1], Array.isArray(rows) ? rows.length : 0, sweeps[1].root),
  ]);

  const limits = [
    limitRecord({
      sweep: sweeps[0].id,
      basis: sweeps[0].basis,
      question: sweeps[0].question,
      answeredBy: null,
      consequence: answered
        ? `${loops.resolvedLoops.length} loop(s) declare a bound this lane could follow. ${loops.unresolvedPointers.length} ceiling pointer(s) named a key the bounds home does not hold and were counted as declaring nothing rather than as declaring a bound${loops.unresolvedPointers.length > 0 ? `: ${loops.unresolvedPointers.join(", ")}` : ""}. The registry validation owns the unresolved-pointer finding and this lane does not re-emit it.`
        : `${registryAbsence(model)} The loop side of the join went unanswered, so NOTHING in this result is a claim that this project's loops are bounded; the reference side was still answered.`,
      authority: null,
    }),
    limitRecord({
      sweep: sweeps[1].id,
      basis: sweeps[1].basis,
      question: sweeps[1].question,
      answeredBy: null,
      consequence: `The reference corpus is the one that ships with this payload — ${Array.isArray(rows) ? rows.length : 0} row(s) — so its freshness is a property of the installed aof version and not of the audited project. A bound no row carries is outside this join entirely rather than reported as agreeing with everybody, and the join is exact on the bound's name and unit: nothing here compares two numbers measured in different things.`,
      authority: null,
    }),
  ];

  return Object.freeze({
    findings,
    reads,
    limits: Object.freeze(limits),
    resolvedLoops: Object.freeze(loops.resolvedLoops),
    unresolvedPointers: Object.freeze(loops.unresolvedPointers),
  });
}

// The three ways the loop side goes missing, kept apart — "there is no registry", "there is one and
// it holds nothing" and "there is one and it did not parse" are three different things to fix.
function registryAbsence(model) {
  if (model?.present === false) return "This project declares no loop registry at all.";
  const unparseable = (Array.isArray(model?.findings) ? model.findings : [])
    .filter((finding) => finding?.code === "loop-record-unparseable");
  if (unparseable.length > 0) return `${unparseable.length} loop record(s) could not be parsed, so no loop was read.`;
  return "This project's loop registry holds no loop records.";
}
