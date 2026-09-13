// THE OBSERVATION CENSUS — A COUNT THAT SAYS WHAT IT FILTERED, OR IT IS NOT A COUNT.
// Milestone 61 / story 02. ADR-006 §5 and §6, FF-6107.
//
// ── WHY THIS FILE EXISTS, MEASURED ───────────────────────────────────────────────────────
//
// The store this acceptor counts over has NO BOUNDARY between production and test. Spike 60
// measured the effects journal at 8,576 events, of which `run.started` is 3,926 — and
// 3,848 of those 3,926 were written by the test suite, into item directories under the OS
// temp root. `assignment.settled` is 245 synthetic of 328; `feedback.recorded` 166 raw
// against 55 real. A count over this journal that does not filter is not a smaller truth:
// it is a different number wearing a truth's clothes, and it will be read as evidence about
// the work when it is overwhelmingly evidence about the suite.
//
// The second trap is subtler, and the spike's own first pass fell into it. A worktree the
// framework creates to dispatch an item registers its own `workspaceRoot`, so the work done
// inside it counts as a DIFFERENT WORKSPACE. Measured: 8 of 52 review verdicts (15%) and five
// `run.started` arrivals on 2026-08-23 written under `dispatch-worktrees/dispatch-70-06` —
// which is why the on-disk census (61 records across 52 items) and the journal census
// disagreed at 48 until the collapse was applied and it became 53.
//
// So the filtering is not optional and it is not silent. The number a population leads with
// is the FILTERED one; the unfiltered total appears only inside `excluded`, where it cannot be
// mistaken for the count.
//
// ── WHY THE READ RECORD IS IMPORTED AND THE FINDING IS NOT (ADR-006 §6) ──────────────────
//
// A sweep that read nothing and a sweep that found nothing are indistinguishable unless the
// sweep says what it read — 59/ADR-004 §1, and this repository has already been bitten by it
// (a renamed fixture root turned a probe into a comparison of nothing with nothing, and it
// passed). `src/work-audit/reads.mjs` already owns that shape and imports nothing, so this
// module IMPORTS `readRecord`, `sweepDeclarationProblems` and `SWEEP_BASES` from it rather
// than restating them. One shape, one home; 59/FF-5908's ratchet is paid, not re-opened.
//
// `readFinding` is DELIBERATELY NOT IMPORTED, and the reason is precise: that constructor
// hardcodes `code: "audit-ran-on-nothing"`, which is the AUDITOR's code. The acceptor builds
// its own finding, from the same read record, with its own code — so only the code string
// differs. The message is therefore restated here, once, and FF-6107 asserts the two findings
// key-by-key so the shape cannot drift.
//
// ── WHY THE DISPATCH CONVENTION IS DERIVED, NEVER RE-SPELLED (ADR-006 §5) ────────────────
//
// `src/mesh/worktree.mjs` is the ONLY module in `src/` that spells `dispatch-worktrees`, and
// it stays that way. The fold reaches the convention through that module's exported predicate
// (`isUnderMeshDispatchWorktreesRoot`) and its exported slug (`dispatchWorktreeSlug`), so a
// rename of the lane's root or of its slug prefix moves this classifier with it instead of
// leaving a second literal behind to rot.
import os from "node:os";
import path from "node:path";

// THE READ RECORD'S ONE HOME — imported, never restated (ADR-006 §6).
import { SWEEP_BASES, readRecord, sweepDeclarationProblems } from "../work-audit/reads.mjs";
// THE DISPATCH CONVENTION'S ONE HOME — derived, never re-spelled (ADR-006 §5).
import {
  dispatchWorktreeSlug,
  isUnderMeshDispatchWorktreesRoot,
  meshDispatchWorktreesRoot,
} from "../mesh/worktree.mjs";
// The journal is DUMB STORAGE and owns its own SQL; this module reads through its exported
// reader rather than reaching into the database handle.
import { readEvents } from "../effects/journal.mjs";

// ── THE POPULATIONS, AND THEIR FLOORS ────────────────────────────────────────────────────

// The two payload fields that say WHERE an observation was written. The fixture test reads
// BOTH (the spike filtered on `itemDir`, and a run written by a fixture may carry a temp
// `workspaceRoot` too); attribution reads only the second, below.
export const OBSERVATION_LOCATION_FIELDS = Object.freeze(["itemDir", "workspaceRoot"]);

// The ONE field that attributes an observation to a workspace. An `itemDir` is a path INSIDE
// a workspace, not a workspace, and deriving one from the other would mean spelling a second
// directory convention here. An event carrying no `workspaceRoot` is `unlocated` — reported,
// never quietly attributed (SPIKE §Recorded: the null-`workspaceRoot` partition is real).
//
// MEASURED ON THE LIVE JOURNAL, 2026-08-30, and this is why the rule is DECLARE rather than
// GUESS: 7 `run.started` events carry a null `workspaceRoot` and a real production `itemDir`,
// 2 of them this workspace's. The spike's corrected count of 53 attributed those by `itemDir`;
// this census reports them as `unlocated` instead, so the number it leads with is 49 and the
// four it does not claim are visible on the record rather than folded in on an inference.
export const OBSERVATION_WORKSPACE_FIELD = "workspaceRoot";

// `assignment.settled` is the population this rule bites hardest, and it is recorded here
// rather than discovered later: its payload carries `assignmentId`, `workspaceId`, `itemRef`,
// `state`, `previousState`, `targetNodeId`, `runId`, `sessionId` and `branch` — and NO path at
// all. All 328 of them are therefore `unlocated`, the count is 0, and the census says so with a
// finding. That is the honest answer for a population no path field can attribute, and it is
// exactly the case ADR-006 §6 exists for: at HEAD the finding IS the result.

// Windows compares paths case-insensitively and this store proves what pretending otherwise
// costs: measured on the live journal, `C:\Source\umami\aof` and `c:\Source\umami\aof` appear
// as TWO workspaces, splitting 51 run-starts into 49 and 2. That is the dispatch-worktree
// fragmentation wearing a different mask, so it is answered in the same place. On POSIX the
// case IS the identity, and nothing is folded.
//
// `darwin` is DELIBERATELY NOT INCLUDED although its default volume is case-insensitive too:
// the fold is applied where fragmentation was MEASURED, and a case-sensitive APFS volume is a
// supported configuration. If the Mac worker's journal ever shows the same split, this is the
// one line that answers it — and the evidence will be on the record first.
const CASE_INSENSITIVE_PATHS = process.platform === "win32";

// The identity a workspace is counted under. The DISPLAY spelling is whichever the store used
// first; only the comparison is case-folded, so the report never invents a path nobody wrote.
export function workspaceKey(workspace) {
  if (typeof workspace !== "string") return workspace;
  return CASE_INSENSITIVE_PATHS ? workspace.toLowerCase() : workspace;
}

// THE FLOOR RULE HAS ONE HOME AND IS DERIVED FROM A MEASUREMENT RATHER THAN TYPED PER LANE.
// Each sweep declares the production population Spike 60 measured for it on the control node
// (2026-08-30, after the dispatch collapse); the floor is HALF of that. Half, because a floor
// AT the measurement would fire on ordinary variation and a floor of 1 would call a store that
// lost 98% of its history healthy — and the failure this floor exists to catch is precisely a
// census that read almost nothing and reported a confident number.
export const FLOOR_DIVISOR = 2;

export function floorFromMeasured(measured) {
  return Math.max(1, Math.ceil(measured / FLOOR_DIVISOR));
}

// A sweep's declared root is a PLACEHOLDER: the journal's real path is per node and is
// supplied per call, checked against the read record itself (`reads.mjs` sanctions exactly
// this — "a sweep whose root is supplied per call passes a placeholder here").
export const JOURNAL_ROOT_PLACEHOLDER = "<the node's effects journal>";

// The sweep ceiling. The journal held 8,576 events in total at the spike's measurement, so
// this is an order of magnitude of headroom — but a population that HITS it is truncated, and
// a truncated population says so on its record rather than presenting a ceiling as a total.
export const CENSUS_EVENT_LIMIT = 100_000;

function observationSweep({ id, event, what, measured }) {
  return Object.freeze({
    id,
    event,
    root: JOURNAL_ROOT_PLACEHOLDER,
    what,
    // RUNTIME, not DISK, and the distinction is load-bearing: the journal is the running
    // system's own per-node record, and the on-disk run records genuinely disagree with it
    // (61 on disk against 53 in the journal, SPIKE §Lane A). A `disk` claim here would claim
    // the on-disk census this sweep does not read.
    basis: SWEEP_BASES[2],
    measured,
    floor: floorFromMeasured(measured),
  });
}

// EVERY POPULATION THE ACCEPTOR COUNTS, IN ONE REGISTRY. The census is driven from this list,
// so a population added without a floor (or without a root, a description or a basis) fails at
// `assertObservationSweepsDeclared` rather than being reported as a count with no floor.
export const OBSERVATION_SWEEPS = Object.freeze([
  observationSweep({
    id: "observations:run-started",
    event: "run.started",
    what: "run-start observations in this node's effects journal, excluding test fixtures and folding dispatch worktrees into their parent workspace",
    // SPIKE §Lane A, corrected at review: 3,926 raw, 3,848 of them fixtures, 53 production
    // arrivals once `dispatch-worktrees/dispatch-70-06` is folded into its parent.
    measured: 53,
  }),
  observationSweep({
    id: "observations:assignment-settled",
    event: "assignment.settled",
    what: "settled mesh assignments in this node's effects journal, excluding test fixtures and folding dispatch worktrees into their parent workspace",
    // SPIKE §Lane A: 328 raw, 245 synthetic, 83 real.
    measured: 83,
  }),
  observationSweep({
    id: "observations:feedback-recorded",
    event: "feedback.recorded",
    what: "recorded feedback in this node's effects journal, excluding test fixtures and folding dispatch worktrees into their parent workspace",
    // SPIKE §Lane A: 166 raw, 55 real.
    measured: 55,
  }),
]);

// The census's own vocabulary. Two codes, both of them "this number is not a count".
export const OBSERVATION_FINDING_CODES = Object.freeze(["acceptor-ran-on-nothing", "acceptor-census-unfiltered"]);

// How an observation was disposed of. Every event lands in exactly one of these, so nothing
// disappears between the unfiltered total and the count.
export const OBSERVATION_DISPOSITIONS = Object.freeze(["counted", "fixture", "other-workspace", "unlocated"]);

// ── THE REFUSAL ──────────────────────────────────────────────────────────────────────────

// A population that declares no floor is REFUSED, naming it — never reported with a count and
// no floor, because that record is indistinguishable from a lane that looked at nothing. The
// validator is the audit's (`sweepDeclarationProblems`); only the refusal is ours, and it is
// raised before any part of a report is built.
export function assertObservationSweepsDeclared(sweeps = OBSERVATION_SWEEPS) {
  const problems = sweepDeclarationProblems(sweeps);
  if (problems.length > 0) {
    throw new TypeError(
      `work-acceptor: the observation census refuses to run — ${problems.join("; ")}. A population reported without a floor cannot tell "found nothing" from "looked at nothing" (ADR-006 §6).`,
    );
  }
  return sweeps;
}

// ── WHERE AN OBSERVATION WAS WRITTEN ─────────────────────────────────────────────────────

const TEMP_ENV_KEYS = Object.freeze(["TMPDIR", "TEMP", "TMP"]);

// The roots under which a path is a TEST FIXTURE rather than work. Derived from the runtime's
// own temp location plus the env vars that override it (the suite runs under
// `AOF_GLOBAL_HOME=$(mktemp -d)`, and `mkdtemp(path.join(os.tmpdir(), …))` is how every
// fixture in this repository is built), never from a name prefix: the spike's `aof-cli-*` is
// one of a dozen prefixes in use, and a prefix list would silently stop matching the day a
// suite picked a new one.
export function fixtureRoots({ env = process.env, tmpdir = os.tmpdir() } = {}) {
  const roots = [tmpdir, ...TEMP_ENV_KEYS.map((key) => env?.[key])];
  const seen = new Set();
  for (const root of roots) {
    if (typeof root !== "string" || root.length === 0) continue;
    seen.add(path.resolve(root));
  }
  return Object.freeze([...seen]);
}

function isUnder(root, candidate) {
  const base = path.resolve(root);
  const target = path.resolve(candidate);
  return target === base || (target + path.sep).startsWith(base + path.sep);
}

// Is this path a test fixture's? Prefix-child of any fixture root, the same shape
// `isUnderMeshDispatchWorktreesRoot` uses, so "under" has one meaning in this module.
export function isFixtureLocation(candidate, roots = fixtureRoots()) {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  return roots.some((root) => isUnder(root, candidate));
}

// The framework's dispatch-worktree slug PREFIX, derived rather than typed: the lane's own
// slug function applied to a probe ref returns `<prefix><probe>`, so what remains when the
// probe is removed IS the prefix. A rename in `mesh-worktree.mjs` moves this with it.
const SLUG_PROBE = "probe";
const DISPATCH_SLUG_PREFIX = dispatchWorktreeSlug(SLUG_PROBE).slice(0, -SLUG_PROBE.length);

// foldDispatchWorktree(candidate) — a worktree the framework created to dispatch an item is
// NOT a workspace; it is work done inside its parent. Returns the workspace the path belongs
// to, plus the worktrees it was folded out of.
//
// The parent is FOUND rather than parsed: each ancestor is offered to the dispatch lane's own
// predicate, and the ancestor that answers "yes, this path is under my dispatch root" is the
// parent workspace. Nothing here spells the directory name, so the convention has one home.
// The loop repeats, so a dispatch worktree materialised inside another one folds all the way
// home rather than half-way.
export function foldDispatchWorktree(candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) return { workspace: null, folded: false, worktrees: Object.freeze([]) };
  let workspace = path.resolve(candidate);
  const worktrees = [];
  for (;;) {
    const parent = dispatchParentOf(workspace);
    if (parent == null) break;
    const slug = path.relative(meshDispatchWorktreesRoot(parent), workspace).split(path.sep)[0];
    worktrees.push(Object.freeze({
      slug,
      path: path.join(meshDispatchWorktreesRoot(parent), slug),
      parent,
      // Did the dispatch lane MINT this directory, or is it a stray under the lane's root? It
      // folds either way — it is not a workspace in either case — but the census says which.
      minted: typeof slug === "string" && slug.startsWith(DISPATCH_SLUG_PREFIX),
    }));
    workspace = parent;
  }
  return { workspace, folded: worktrees.length > 0, worktrees: Object.freeze(worktrees) };
}

function dispatchParentOf(candidate) {
  let directory = path.resolve(candidate);
  for (;;) {
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    if (isUnderMeshDispatchWorktreesRoot(parent, candidate)) return parent;
    directory = parent;
  }
}

// classifyObservation(event, …) — where an observation was written decides how it is counted,
// and the answer is one of exactly four dispositions.
//
// `subject` is the workspace being counted FOR, already folded — the census resolves it once
// per population rather than re-walking the same ancestor chain for every event, and a caller
// that passes only `workspaceRoot` gets the same answer at the cost of one fold per call. The
// subject is folded on both paths: this workspace may itself BE a dispatch worktree (it is,
// while this story is being built inside one), and a census run from inside one must count the
// parent's population rather than an empty lane of its own.
export function classifyObservation(event, {
  workspaceRoot,
  subject = foldDispatchWorktree(workspaceRoot ?? "").workspace,
  roots = fixtureRoots(),
} = {}) {
  const payload = event?.payload ?? {};
  const locations = OBSERVATION_LOCATION_FIELDS
    .map((field) => payload[field])
    .filter((value) => typeof value === "string" && value.length > 0);
  if (locations.some((location) => isFixtureLocation(location, roots))) {
    return Object.freeze({ disposition: "fixture", workspace: null, folded: false, worktrees: Object.freeze([]) });
  }
  const declared = payload[OBSERVATION_WORKSPACE_FIELD];
  if (typeof declared !== "string" || declared.length === 0) {
    return Object.freeze({ disposition: "unlocated", workspace: null, folded: false, worktrees: Object.freeze([]) });
  }
  const fold = foldDispatchWorktree(declared);
  const mine = subject != null && workspaceKey(fold.workspace) === workspaceKey(subject);
  return Object.freeze({
    disposition: mine ? "counted" : "other-workspace",
    workspace: fold.workspace,
    folded: fold.folded,
    worktrees: fold.worktrees,
  });
}

// ── THE FINDINGS ─────────────────────────────────────────────────────────────────────────

// `acceptor-ran-on-nothing` — the audit's finding with the acceptor's code. Below-floor is
// deliberately not the same as zero: a population that shrank by 90% is the same failure a
// step earlier. The message is restated rather than imported because `readFinding` hardcodes
// the AUDITOR's code (ADR-006 §6); FF-6107 asserts the two key-by-key, so the only difference
// that can ever exist between them is that code string.
export function observationFinding(read) {
  if (read.count >= read.floor) return null;
  return Object.freeze({
    code: OBSERVATION_FINDING_CODES[0],
    severity: "error",
    path: read.root,
    message: `the "${read.sweep}" sweep read ${read.count} of a required ${read.floor} while walking ${read.root} — it ran on nothing, or on so little that a clean result would mean nothing. ${read.what}`,
  });
}

// `acceptor-census-unfiltered` — a census that excluded no event and folded no worktree over a
// store measured at 3,848 fixtures in 3,926 run-starts has not demonstrated that it filtered;
// it has demonstrated that its filter did not engage. Its number is therefore reported as a
// finding rather than presented as a filtered count.
export function unfilteredFinding(population) {
  if (population.filtered) return null;
  const read = population.read;
  return Object.freeze({
    code: OBSERVATION_FINDING_CODES[1],
    severity: "error",
    path: read.root,
    message: `the "${read.sweep}" sweep excluded no event and folded no worktree over ${population.excluded.unfilteredTotal} it walked at ${read.root} — a census that filtered nothing is not a filtered count, and this store was measured at 3,848 test fixtures in 3,926 run-starts (ADR-006 §5).`,
  });
}

// ── THE CENSUS ───────────────────────────────────────────────────────────────────────────

// countPopulation(sweep, events, …) — one population, filtered, folded, and stating both.
export function countPopulation(sweep, events, { workspaceRoot, root = sweep?.root, roots = fixtureRoots(), limit = CENSUS_EVENT_LIMIT } = {}) {
  assertObservationSweepsDeclared([sweep]);
  const list = Array.isArray(events) ? events : [];
  const byWorkspace = new Map();
  const excluded = { unfilteredTotal: list.length, fixtures: 0, otherWorkspace: 0, unlocated: 0 };
  const foldedWorktrees = new Map();
  let foldedEvents = 0;
  // The workspace this census is FOR, folded once (this checkout may itself be a dispatch
  // worktree, and a census run from inside one counts its parent's population).
  const subject = foldDispatchWorktree(workspaceRoot ?? "").workspace;
  for (const event of list) {
    const seen = classifyObservation(event, { workspaceRoot, subject, roots });
    if (seen.folded) {
      foldedEvents += 1;
      for (const worktree of seen.worktrees) foldedWorktrees.set(worktree.path, worktree);
    }
    if (seen.disposition === "fixture") {
      excluded.fixtures += 1;
      continue;
    }
    if (seen.disposition === "unlocated") {
      excluded.unlocated += 1;
      continue;
    }
    // Keyed by identity, displayed by the spelling the store used first.
    const key = workspaceKey(seen.workspace);
    const tally = byWorkspace.get(key) ?? { display: seen.workspace, count: 0 };
    tally.count += 1;
    byWorkspace.set(key, tally);
    if (seen.disposition === "other-workspace") excluded.otherWorkspace += 1;
  }
  // THE NUMBER THIS POPULATION LEADS WITH IS THE FILTERED ONE. The unfiltered total lives in
  // `excluded` and nowhere else on this record.
  const count = subject == null ? 0 : byWorkspace.get(workspaceKey(subject))?.count ?? 0;
  const filtered = excluded.fixtures + excluded.otherWorkspace + excluded.unlocated > 0 || foldedWorktrees.size > 0;
  const population = {
    sweep: sweep.id,
    event: sweep.event,
    workspace: subject,
    read: readRecord(sweep, count, root),
    count,
    filtered,
    excluded: Object.freeze({ ...excluded }),
    folded: Object.freeze({
      worktrees: foldedWorktrees.size,
      events: foldedEvents,
      slugs: Object.freeze([...foldedWorktrees.values()].map((worktree) => worktree.slug)),
    }),
    byWorkspace: Object.freeze(Object.fromEntries([...byWorkspace.values()].map((tally) => [tally.display, tally.count]))),
    // A population that hit its own ceiling read a floor, not a total, and says so.
    truncated: list.length >= limit,
  };
  population.findings = Object.freeze([observationFinding(population.read), unfilteredFinding(population)].filter(Boolean));
  return Object.freeze(population);
}

// observationCensus({ eventsFor, … }) — every declared population, each with its read record,
// what it excluded and what it folded.
//
// `counts` is the report's headline mapping, and a population whose census filtered NOTHING is
// deliberately absent from it: its number is reported as a finding instead, on the record, so
// it cannot be picked up and read as a filtered count.
export function observationCensus({ eventsFor, workspaceRoot, root, sweeps = OBSERVATION_SWEEPS, roots = fixtureRoots(), limit = CENSUS_EVENT_LIMIT } = {}) {
  assertObservationSweepsDeclared(sweeps);
  if (typeof eventsFor !== "function") throw new TypeError("work-acceptor: the observation census needs an `eventsFor(sweep)` reader.");
  const populations = sweeps.map((sweep) => countPopulation(sweep, eventsFor(sweep), { workspaceRoot, root, roots, limit }));
  const counts = {};
  const findings = [];
  for (const population of populations) {
    if (population.filtered) counts[population.sweep] = population.count;
    for (const finding of population.findings) findings.push(Object.freeze({ sweep: population.sweep, ...finding }));
  }
  return Object.freeze({
    workspace: foldDispatchWorktree(workspaceRoot ?? "").workspace,
    root: root ?? null,
    populations: Object.freeze(populations),
    counts: Object.freeze(counts),
    findings: Object.freeze(findings),
  });
}

// readObservationCensus(journal, …) — the census over a real journal. The journal owns its own
// SQL (it is dumb storage by design), so this reaches it through `readEvents` and never
// through the database handle.
export function readObservationCensus(journal, { workspaceRoot, sweeps = OBSERVATION_SWEEPS, roots = fixtureRoots(), limit = CENSUS_EVENT_LIMIT } = {}) {
  return observationCensus({
    eventsFor: (sweep) => readEvents(journal, { name: sweep.event, limit }),
    workspaceRoot,
    root: journal?.databasePath ?? null,
    sweeps,
    roots,
    limit,
  });
}
