// 78/00 — THE EXECUTION PROJECTION: what actually ran for one work item.
//
// The arithmetic half of the loop execution record. It takes two things it is HANDED — the loaded
// loop registry model (`loadLoops`'s `nodes`) and the run records belonging to one item — and
// returns the execution facts. It opens no file, reads no clock and spawns nothing; FF-7801 holds
// that structurally, and it is what lets the renderer (78/01) and the writer (78/02) be built
// beside this module rather than behind it.
//
// THE NAME IS LOAD-BEARING (ADR-009). `src/loop-record.mjs`, not `src/work-loops-record.mjs`:
// 52/FF-5201 discovers `src/work-loops*.mjs` and `src/commands/loops-*.mjs` and holds every
// discovered module read-only. The registry is framework data; an execution is a per-item fact.
// This module belongs to the EXECUTION family — `work-loop.mjs`, `loop-bounds.mjs`,
// `loop-progress.mjs` — and takes that family's name.
//
// ZERO IS A MEASUREMENT, NEVER AN ABSENCE (ADR-003). At refine, 0 of 61 run records under
// `wiki/work` carried `brief.loop`. The empty answer is therefore the ORDINARY case for every item
// in this repository today, not an edge case — so the model always carries its own join coverage.
// A model that renders nothing without saying why is indistinguishable from a broken projection.

import { LOOP_BOUND_CONFIG_RESOLVERS } from "./loop-bounds.mjs";

// The three gap classes of ADR-005, frozen in the order they are reported. Three and not one
// because they have three different remedies: instrument the loop, drive it, or fix the registry.
export const GAP_CLASSES = Object.freeze(["ran-undeclared", "declared-never-ran", "authority-unresolved"]);

// ADR-004's four ceiling states. The three non-numeric ones are NOT collapsed into "no limit":
// "terminates by construction" (`none`), "nobody has said" (`unknown`) and "deliberately unbounded"
// (`uncapped`) have three different remedies, and a record that showed one word for all three would
// be the record we already have.
export const CEILING_STATES = Object.freeze(["bounded", "none", "unknown", "uncapped"]);
const CEILING_SENTINELS = Object.freeze(["none", "unknown", "uncapped"]);

// THE AUTHORITY THIS MODEL CAN HONESTLY ANSWER FOR (ADR-005). The class names "an actuator or
// reference owner the endpoint grammar cannot resolve", and the two halves are not equally
// reachable from a pure leaf:
//
//   `owner` and the edge keys cite INTRA-REGISTRY nodes — `actor:`, `loop:`, `arbiter:` — so
//   whether they resolve is a question about the declared id set, which the model already holds.
//   The loader asks it the same way (`value.resolved = declaredIds.has(value.raw)`), and where it
//   has already answered, that answer is read rather than recomputed.
//
//   `actuator:` and `reference:` admit `module:`/`command:`/`config:`/`prose:` alone
//   (`FIELD_LIST_KEYS` through `machineField`, `src/work/loops.mjs`) — never an intra-registry
//   scheme. Whether one of THOSE resolves is a question about a file on disk or the command
//   registry, which a module reaching no `node:fs` cannot answer and must not pretend to. It is
//   the registry's own grounding lane that answers it, and 78/STATE.md records the seam.
//
// So this class is exactly: an intra-registry citation, on a loop that ran, naming no declared node.
const AUTHORITY_FIELD_KEYS = Object.freeze(["owner"]);

// Endpoint schemes that name a node INSIDE the registry, and so can be checked against the declared
// ids without leaving the model. Mirrors the loader's own intra-registry rule
// (`src/work/loops.mjs`, `value.resolved = declaredIds.has(value.raw)`) rather than restating a
// second opinion about what "resolves" means.
const INTRA_REGISTRY_SCHEMES = Object.freeze(["loop", "actor", "arbiter"]);

const compareCodeUnits = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

// The run order the whole projection reads in — `compareRuns`'s shape (`src/work/loop.mjs`), so a
// record does not reorder because two runs share a timestamp.
function compareRuns(left, right) {
  const byTime = compareCodeUnits(String(left?.createdAt ?? ""), String(right?.createdAt ?? ""));
  return byTime || compareCodeUnits(String(left?.runId ?? ""), String(right?.runId ?? ""));
}

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

// THE JOIN IS ONE KEY, AND IT IS TWO HALVES: a `loopRunId` to group by, and a loop id to resolve
// against the registry. Runs are grouped by `loopRunId` because one loop RUN mints many run
// records — a naive group-by-loop-id would fuse two separate engagements of one loop into one.
//
// THE PRODUCER EXISTS AS OF 102 (this note was a finding, F-78-A, and is kept as the record of
// what it cost). Milestone 53's declaration carried seven keys — loopRunId, scope, level, cap,
// phase, cycle, startedAt — and NO loop id, so `id` was a key nothing wrote: the join below could
// only ever be exercised by fixtures, and coverage stayed 0 in this repository even once the loop
// shell was driven. 102/00 appended `id` to the envelope as its eighth key and 102/01 has the loop
// shell hand in `loop:autonomous-cascade`, so a run minted by the shell now joins here for real
// (`test/loop/loop-declaration-join.test.mjs` drives the producer, the store and this reader end to
// end). Runs minted BEFORE that producer existed still carry no declaration — they stay counted in
// `runsFound` and absent from `runsCarryingDeclaration`, which is ADR-003's point exactly.
function declarationOf(run) {
  const loop = run?.brief?.loop;
  if (loop === null || typeof loop !== "object" || Array.isArray(loop)) return null;
  if (!isNonEmptyString(loop.loopRunId) || !isNonEmptyString(loop.id)) return null;
  return loop;
}

// A BOUND IS A POSITIVE INTEGER OR IT IS NOT A BOUND (129/ADR-001 §1) — the one predicate every
// number this projection puts on a ceiling passes, whether it came from a record's own `cycles`,
// a resolver's answer or a raw config key.
function positiveIntegerOrNull(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

// A `config:` ceiling pointer resolved to the number actually IN EFFECT. The `work.loop.*` knobs
// answer through their own resolvers (`src/loop-bounds.mjs`), so a configured value above its
// clamp resolves to the clamp — the bound the machinery would really enforce, not the bound the
// file claims. Any other dotted key is read straight off the injected config, which is how
// `work.autonomous.maxAttempts` is read everywhere else (`src/work/doctor-loop-ready.mjs`).
// Pure either way: the config object is handed in, never read from disk.
//
// The bounds home now holds a MODE beside its numbers — `work.loop.concurrency` resolves to
// `"sequential"` or `"refine_first"` — and a loop record citing it as a `ceiling:` must not
// project a string as its bound: `compareToBound` would read `4 < "refine_first"` and answer a
// comparison nobody made. So the resolver's answer passes the SAME guard a raw key already does,
// and a non-numeric answer is `null` — the pointer stays `bounded` (the author declared a limit)
// with no number on it and `comparison: null`, exactly as a `module:` pointer projects.
function configBound(key, config) {
  const resolver = Object.hasOwn(LOOP_BOUND_CONFIG_RESOLVERS, key)
    ? LOOP_BOUND_CONFIG_RESOLVERS[key]
    : null;
  if (typeof resolver === "function") return positiveIntegerOrNull(resolver({ config }));
  const value = key.split(".").reduce((at, part) => (at == null ? undefined : at[part]), config);
  return positiveIntegerOrNull(value);
}

// The declared ceiling, as its own state (ADR-004). The pair the record holds side by side is
// "cycles observed" against "ceiling declared"; neither is derivable from the other, and this half
// comes from the registry record alone.
function ceilingOf(node, config) {
  const declared = node?.fields?.ceiling;
  const entries = Array.isArray(declared) ? declared : declared == null ? [] : [declared];
  // `declared` is the raw entries AS DECLARED, a list and never a joined string: how they read on
  // the page is 78/01's decision, and a projection that pre-formats them has taken it for the
  // renderer. An absent ceiling declares nothing, which is an empty list rather than a null.
  if (entries.length === 0) return { state: "unknown", bound: null, declared: Object.freeze([]) };

  const sentinel = entries.find((entry) => CEILING_SENTINELS.includes(entry?.kind));
  if (sentinel) {
    return { state: sentinel.kind, bound: null, declared: Object.freeze([String(sentinel.raw ?? sentinel.kind)]) };
  }

  // Everything else is a DECLARED BOUND. It is `bounded` whether or not this projection can put a
  // number on it: a pointer whose target it cannot resolve purely (a `module:` citation) is still a
  // loop whose author declared a limit, and reporting it as `unknown` would put a word on the page
  // that the registry does not say.
  let bound = null;
  for (const entry of entries) {
    const cycles = positiveIntegerOrNull(entry?.cycles);
    if (cycles != null) { bound = cycles; break; }
    if (entry?.pointer?.scheme !== "config") continue;
    const resolved = configBound(String(entry.pointer.operand ?? ""), config);
    if (resolved != null) { bound = resolved; break; }
  }
  const raws = entries.map((entry) => String(entry?.raw ?? "")).filter((raw) => raw.length > 0);
  return { state: "bounded", bound, declared: Object.freeze(raws) };
}

// Cycles observed against the bound declared — and NOTHING about whether the bound was respected.
// That judgement stays with the reader and the signature (ADR-004).
function compareToBound(cycles, ceiling) {
  if (ceiling.bound == null) return null;
  if (cycles < ceiling.bound) return "within";
  return cycles === ceiling.bound ? "at" : "over";
}

// The states a run cannot move out of (19/ADR-001). An engagement whose last run sits in one of
// these has ENDED; anything else is still in flight, which is a different fact from having failed.
const TERMINAL_STATES = Object.freeze(["done", "failed", "cancelled"]);

function engagementOf(loopRunId, runs, registryById, config) {
  const ordered = [...runs].sort(compareRuns);
  const declarations = ordered.map((run) => declarationOf(run));
  const id = declarations.find((loop) => loop != null)?.id ?? null;
  const node = registryById.get(id) ?? null;

  // The phases entered, in the order they were FIRST entered — a phase entered twice is listed
  // once, at its first entry, because the record answers "where did this go" and not "how often".
  const phases = [];
  for (const loop of declarations) {
    const phase = loop?.phase;
    if (isNonEmptyString(phase) && !phases.includes(phase)) phases.push(phase);
  }

  // Cycles are counted from the declarations on the runs, never from the registry (ADR-004). The
  // highest cycle an engagement reached is what it observed; a resumed lineage re-declares its
  // cycle, so counting records would count the same cycle twice.
  const cycles = declarations.reduce(
    (top, loop) => (Number.isSafeInteger(loop?.cycle) && loop.cycle > top ? loop.cycle : top),
    0,
  );

  // The attempt chain as a CHAIN, not a count: each link names the run it retried, so a reader can
  // follow the lineage rather than infer it from a number. `attempts` below is the number of RUN
  // RECORDS in the engagement — the store mints one per attempt — never a max over the `attempt`
  // ordinal, which would report 1 for an engagement whose only run was a reclaimed retry.
  const retryChain = ordered
    .filter((run) => isNonEmptyString(run?.retryOf))
    .map((run) => Object.freeze({ runId: String(run.runId ?? ""), retryOf: String(run.retryOf) }));

  const last = ordered.at(-1) ?? null;
  const lastState = String(last?.outcome ?? last?.state ?? "");
  const ended = TERMINAL_STATES.includes(lastState);
  const lastDeclaration = declarations.at(-1) ?? null;
  const ceiling = ceilingOf(node, config);

  return Object.freeze({
    loopRunId,
    loop: id,
    declared: node != null,
    startedAt: declarations.find((loop) => loop != null)?.startedAt ?? null,
    cycles,
    ceiling: Object.freeze({ ...ceiling, comparison: compareToBound(cycles, ceiling) }),
    phases: Object.freeze(phases),
    attempts: ordered.length,
    retryChain: Object.freeze(retryChain),
    // Carried through, never re-derived: a failed run reports the failure reason it recorded, a
    // settled one the loop's own stop reason, and a run still in flight reports neither.
    outcome: ended ? lastState : null,
    stopReason: ended ? (last?.failureReason ?? lastDeclaration?.stopReason ?? null) : null,
  });
}

// The endpoints of one node the endpoint grammar cannot resolve — an intra-registry citation naming
// a node the registry does not declare. `resolved` is the loader's own answer where it set one
// (it marks every edge endpoint); the declared-id check is the same question asked of an entry it
// did not mark, never a second opinion about what "resolves" means.
function unresolvedAuthorities(node, declaredIds) {
  const cited = [];
  for (const key of AUTHORITY_FIELD_KEYS) {
    const declared = node?.fields?.[key];
    cited.push(...(Array.isArray(declared) ? declared : declared == null ? [] : [declared]));
  }
  for (const endpoints of Object.values(node?.edges ?? {})) {
    cited.push(...(Array.isArray(endpoints) ? endpoints : []));
  }

  const found = [];
  for (const entry of cited) {
    const scheme = entry?.scheme ?? entry?.pointer?.scheme ?? null;
    if (!INTRA_REGISTRY_SCHEMES.includes(scheme)) continue;
    const raw = String(entry?.raw ?? "");
    if (raw.length === 0) continue;
    const resolved = entry?.resolved ?? null;
    if (resolved === false || (resolved == null && !declaredIds.has(raw))) found.push(raw);
  }
  return found;
}

// Gaps are deduplicated by subject and sorted by the subject's code-unit sort, so the rendered
// record is stable across regenerations (78/01 renders these bytes and FF-7803 freezes them).
function gapList(subjects) {
  return Object.freeze([...new Set(subjects)]
    .sort(compareCodeUnits)
    .map((subject) => Object.freeze({ subject })));
}

/**
 * The execution model for ONE work item.
 *
 * @param registry the loaded loop registry model — `loadLoops`'s return, or its `nodes` array.
 * @param runs     the run records belonging to the item.
 * @param config   the workspace config object, for resolving a `config:` ceiling pointer to the
 *                 number in effect. Handed in, never read from disk.
 */
export function projectExecution({ registry, runs, config } = {}) {
  const nodes = Array.isArray(registry) ? registry : Array.isArray(registry?.nodes) ? registry.nodes : [];
  const records = Array.isArray(runs) ? runs : [];
  const declaredIds = new Set(nodes.map((node) => node?.id).filter((id) => isNonEmptyString(id)));
  const registryById = new Map(nodes.filter((node) => isNonEmptyString(node?.id)).map((node) => [node.id, node]));
  const loops = nodes.filter((node) => node?.kind === "loop" && isNonEmptyString(node?.id));

  // COVERAGE IS STATED WHETHER OR NOT ANYTHING JOINED (ADR-003) — how many run records were found
  // for the item, how many carried a loop declaration, and the ratio. It counts RECORDS, not
  // engagements, so "14 runs, 0 carried a declaration" stays a finding an operator can act on.
  const carrying = records.filter((run) => declarationOf(run) != null);
  const coverage = Object.freeze({
    runsFound: records.length,
    runsCarryingDeclaration: carrying.length,
    ratio: records.length === 0 ? 0 : carrying.length / records.length,
  });

  const byLoopRunId = new Map();
  for (const run of carrying) {
    const key = declarationOf(run).loopRunId;
    if (!byLoopRunId.has(key)) byLoopRunId.set(key, []);
    byLoopRunId.get(key).push(run);
  }

  const engagements = [...byLoopRunId.entries()]
    .map(([loopRunId, group]) => engagementOf(loopRunId, group, registryById, config))
    .sort((left, right) => compareCodeUnits(String(left.startedAt ?? ""), String(right.startedAt ?? ""))
      || compareCodeUnits(left.loopRunId, right.loopRunId));

  const ranIds = new Set(engagements.map((engagement) => engagement.loop).filter((id) => isNonEmptyString(id)));

  const gaps = Object.freeze({
    // A declaration whose loop id resolves to no registry record — the loop ran and is not declared.
    "ran-undeclared": gapList(engagements.filter((e) => !e.declared && isNonEmptyString(e.loop)).map((e) => e.loop)),
    // Bounded by the REGISTRY's size, not the work stream's: every declared loop with no run
    // carrying its id. Loud today by construction, which is the finding rather than a defect.
    "declared-never-ran": gapList(loops.filter((node) => !ranIds.has(node.id)).map((node) => node.id)),
    // An authority the endpoint grammar cannot resolve, on a loop that actually ran.
    "authority-unresolved": gapList(engagements
      .filter((engagement) => engagement.declared)
      .flatMap((engagement) => unresolvedAuthorities(registryById.get(engagement.loop), declaredIds))),
  });

  return Object.freeze({ coverage, engagements: Object.freeze(engagements), gaps });
}
