// THE SELECTION — milestone 72 / story 01, ADR-002 §1, §1a, §1b, §1c, §2, §2a, §3, §4 and
// ADR-004 §4. FF-7202 and FF-7203 are its controls.
//
// Selection exists to make verification cheap. The way it becomes worthless is not by being slow —
// it is by being confidently wrong ONCE. An agent handed a subset derived from a gap has been told
// a falsehood in the shape of an answer, and it will not find out.
//
// So the rule is ONE-DIRECTIONAL and it is the whole module:
//
//   COUPLING THE GRAPH KNOWS NARROWS THE RUN. COUPLING THE GRAPH DOES NOT KNOW WIDENS IT.
//
// A changed file the graph reports `present: false` — a file created this turn, a rename, a
// coverage gap — has UNKNOWN dependents, and recording unknown as "none affected" is exactly the
// mistake the grounding protocol names. Correct-but-slow, never wrong-and-fast. Every widening is
// NAMED, with the file and the reason, and the four reasons are exhaustive.
//
// AND THERE IS NO FLAG. `--no-widen` or `--strict-scope` would be asked for within a week by
// someone who knows their change is local, and used by an agent that does not. The absence is
// asserted by the control rather than merely observed here.
//
// ── FOUR DECISIONS THAT EACH LOOK LIKE A DETAIL AND ARE NOT ──────────────────────────────────
//
// 1. THE GRAPH IS READ, NEVER BUILT (ADR-002 §1). A build is minutes even on the unchanged path
//    (1,577 files re-extracted at 22 workers, measured), and an inner-loop tool that might cost
//    minutes before it costs seconds is not one. The artifact is reached ONLY through the shipped
//    `normalizeGraph` + `computeImpact`; this module authors no second reader and no second parse.
//
// 2. `suites` IS A PATH PREDICATE, NOT THE REGISTERED SET (ADR-002 §1a). Registered membership
//    comes from `assembledSuite()`, a child importing 948 test modules — 3.5 s measured — and when
//    that child fails the census answers `audit-runtime-membership-unavailable` and returns
//    `registered: []`. That answer is NOT one of the four widening reasons, so "this file's
//    dependents contain no suite" and "I could not learn what is registered" would render
//    identically. That is precisely the lie this module exists to prevent, wearing its own
//    vocabulary. Registration stays a per-selected-file REPORT (below), never an input to
//    selection, and selection drops from ~3.6 s to ~100 ms.
//
// 3. `roots` IS A PARAMETER, NEVER A CONFIG READ (ADR-002 §1b). FF-7201 makes
//    `src/work/toolchain.mjs` the only module in `src/` that may read `work.test.*`, so a selector
//    reaching for the config would red 72/00's control from a parallel lane.
//
// 4. `assembled` AND `suiteNames` ARE INJECTED (ADR-002 §1c). `registrationDecision` needs a
//    `Map<file, exported names>` whose only shipped producer is an `await import()` of each suite
//    — forbidden here. This module accepts both and produces neither, which is what makes
//    FF-7203's reuse claim clearable by a module that cannot honestly produce provenance.
//
// PURITY IS A CONTRACT, not a style: the same changed set against two planted graphs must yield
// two different answers IN ONE PROCESS. Nothing is cached across calls, and the measured cost of
// that (~80 ms for one changed file, ~400 ms for fifty) is priced in ADR-002 rather than missed.
import { existsSync } from "node:fs";

import { computeImpact } from "../graph-impact.mjs";
import { graphArtifactBuiltAt, graphJsonPath, normalizeGraph, readGraph } from "../graph-normalize.mjs";
// THE REGISTRATION DECIDER, REACHED BY IMPORT AND NEVER RE-DERIVED (FF-7203). Which suite file
// contributed which entries is already decided, once, by the census this project audits
// registration with. A second derivation — a regex over an import line, a spread matcher, a fresh
// baseline — is a second answer that agrees until the day someone changes the assembly and only
// one of the two notices.
import { registrationDecision } from "../work-audit/census.mjs";

// THE FOUR WIDENING REASONS, EXHAUSTIVELY (ADR-002 §3). Frozen here so a fifth is an edit with an
// ADR behind it rather than a string somebody passed.
export const WIDENING_REASONS = Object.freeze([
  "no-graph",
  "not-in-graph",
  "no-registered-dependent",
  "graph-unreadable",
]);

// The two REFUSALS, which are deliberately NOT widening reasons (ADR-002 §5). They differ in kind
// from the four: those are aof failing to KNOW something about the tree; these are there being
// nothing to select at all. A revision that does not resolve, and an empty changed set, would each
// otherwise read as "nothing affected" — the maximal silent narrowing the invariant forbids.
export const SINCE_REV_UNRESOLVABLE = "since-rev-unresolvable";
export const CHANGED_SET_EMPTY = "changed-set-empty";
// A THIRD refusal, for git itself failing to answer. It is not a widening reason for the same
// reason the two above are not — nothing about the tree became known — and it is not one of THEM
// either: reporting "git could not read the working tree" as `since-rev-unresolvable` would send
// the operator to fix a revision that was never the problem. Three situations, three repairs.
export const CHANGED_SET_UNREADABLE = "changed-set-unreadable";

export const SELECTION_SCOPES = Object.freeze(["impacted", "all"]);

// A SUITE FILE IS A PATH, and that is the whole predicate (ADR-002 §1a): a `*.test.mjs` under one
// of the roots the project declared. The roots are handed in — never read from config.
export function isSuiteFile(file, roots) {
  if (typeof file !== "string" || !file.endsWith(".test.mjs")) return false;
  const normalized = file.replaceAll("\\", "/");
  return (roots ?? []).some((root) => {
    const prefix = `${String(root).replaceAll("\\", "/").replace(/\/+$/u, "")}/`;
    return normalized.startsWith(prefix);
  });
}

const widening = (file, reason) => Object.freeze({ file, reason });

function selection({ scope, selected, widened, builtAt, graphPath, changed, resolved = [], refusal = null }) {
  return Object.freeze({
    scope,
    // `gate` is FALSE unless the whole suite was selected AND nothing widened (ADR-002 §4). A
    // selection is a REPORT, and 09/ADR-004 is not crossed because a gate DECIDES A TRANSITION
    // while this decides nothing — it runs a subset and says which.
    gate: scope === "all" && widened.length === 0,
    selected: Object.freeze([...selected]),
    widened: Object.freeze([...widened]),
    builtAt,
    graphPath,
    changed: Object.freeze([...changed]),
    // The changed files the GRAPH ACCOUNTED FOR. Carried so the rule can be checked from the side
    // that does not widen: without it, "did not widen and left a changed file unresolved" is not
    // expressible from a result, and a one-sided check passes the side it cannot see.
    resolved: Object.freeze([...resolved]),
    refusal,
  });
}

// THE SELECTION. Inputs, all of them given rather than discovered:
//
//   projectRoot — where `graphify-out/graph.json` lives
//   changed     — the changed set (see `src/work/test-changed.mjs`, which reads it from git)
//   allSuites   — the whole suite, the thing a widening widens TO
//   roots       — the declared test roots, for the path predicate
//
// Returns the frozen result above. It never throws for a graph that is missing or broken: those
// are answers, and answering them as widenings is the point.
export function selectSuites({ projectRoot, changed = [], allSuites = [], roots = [] } = {}) {
  const graphPath = graphJsonPath(projectRoot);
  const whole = [...allSuites].sort();
  const widenAll = (widened, builtAt) => selection({ scope: "all", selected: whole, widened, builtAt, graphPath, changed });

  // An empty changed set selects NOTHING, which is the maximal silent narrowing — so it is a
  // refusal that names itself rather than a green run over zero tests (ADR-002 §5).
  if (changed.length === 0) {
    return selection({
      scope: "impacted",
      selected: [],
      widened: [],
      builtAt: null,
      graphPath,
      changed,
      refusal: Object.freeze({
        code: CHANGED_SET_EMPTY,
        message: "the changed set is empty, so there is nothing to select — a clean tree is one of the commonest states to be in, and reporting a green run over zero tests would be the silent narrowing this selection exists to refuse.",
      }),
    });
  }

  // NO ARTIFACT. There is no file, so there is no instant either: a fresh clone runs the whole
  // suite and says why.
  if (!existsSync(graphPath)) {
    return widenAll(changed.map((file) => widening(file, "no-graph")), null);
  }

  let graph;
  try {
    graph = normalizeGraph(readGraph(graphPath));
  } catch {
    // AN UNREADABLE ARTIFACT. The file exists and has a perfectly good mtime, and that instant is
    // DELIBERATELY DISCARDED: nothing the artifact claims is trustworthy once it does not parse,
    // and reporting a build time for a graph nobody could read is the confident-wrong-answer
    // species this module is about. `null`, and the widening says why.
    return widenAll(changed.map((file) => widening(file, "graph-unreadable")), null);
  }

  // THE ARTIFACT'S OWN INSTANT, never a clock read at call time (ADR-002 §2). A silently stale
  // graph is the failure this whole step exists to prevent, and the only defence that survives
  // contact is making the age visible in the answer.
  const builtAt = graphArtifactBuiltAt(graphPath);

  const impact = computeImpact(graph, changed);
  const widened = [];
  const selected = new Set();
  const resolved = [];

  for (let index = 0; index < changed.length; index += 1) {
    const file = changed[index];
    const entry = impact[index];

    // PRESENCE OUTRANKS THE UNION, and the order is the invariant rather than an implementation
    // note (ADR-002 §2a). A file that IS a suite by the path predicate but is absent from the
    // graph — a test file created this turn, the second-most-common inner-loop action there is —
    // must WIDEN, not be quietly selected by the union. An implementation that tests the suite
    // predicate first satisfies every other row and is wrong.
    if (entry == null || !entry.present) {
      widened.push(widening(file, "not-in-graph"));
      continue;
    }

    // THE UNION IS TAKEN FIRST, THE PREDICATE LAST (ADR-002 §2a). A changed file that is itself a
    // suite is in its own selection because it CHANGED, not because something imports it: measured,
    // `graph impact` on a test file returns `scripts/test.mjs` — the runner, which is no suite — so
    // under `dependents ∩ suites` alone, editing one test file (the commonest inner-loop action
    // there is) would widen to all 950 suites. The invariant would have survived and the tool
    // would not.
    const candidates = [file, ...entry.dependents].filter((candidate) => isSuiteFile(candidate, roots));
    if (candidates.length === 0) {
      widened.push(widening(file, "no-registered-dependent"));
      continue;
    }
    for (const candidate of candidates) selected.add(candidate);
    resolved.push(file);
  }

  if (widened.length > 0) return widenAll(widened, builtAt);
  return selection({ scope: "impacted", selected: [...selected].sort(), widened: [], builtAt, graphPath, changed, resolved });
}

// THE RULE, CHECKED FROM BOTH SIDES — because a one-sided check passes the side it does not look
// at. A widened result that selected a proper subset is a widening that did not widen; a
// non-widened result carrying a changed file that never resolved is a narrowing that hid an
// unknown. Returns the reasons it is refused, empty when it is admitted.
export function wideningRuleProblems(result, allSuites) {
  const problems = [];
  const whole = new Set(allSuites);
  const widened = result.widened.length > 0;

  if (widened) {
    if (result.scope !== "all") problems.push("a result that widened must carry scope \"all\" — a widening that leaves the scope narrow is a widening in name only.");
    for (const suite of whole) {
      if (!result.selected.includes(suite)) {
        problems.push(`a result that widened selected a PROPER SUBSET of the whole suite: ${suite} is missing. Widening means the whole suite, not more of it.`);
        break;
      }
    }
    for (const entry of result.widened) {
      if (!WIDENING_REASONS.includes(entry.reason)) problems.push(`${entry.file} widened with the reason "${entry.reason}", which is not one of the four: ${WIDENING_REASONS.join(", ")}.`);
      if (typeof entry.file !== "string" || entry.file.length === 0) problems.push(`a widening carries no file, so nothing says what caused it (reason "${entry.reason}").`);
    }
    return problems;
  }

  if (result.scope !== "impacted") problems.push("a result that did not widen must carry scope \"impacted\" — nothing else selected the whole suite.");
  if (result.refusal == null) {
    const accounted = new Set(result.resolved ?? []);
    for (const file of result.changed) {
      if (!accounted.has(file)) {
        problems.push(`${file} is in the changed set, did not resolve in the graph, and the result did not widen — an unknown that narrows is the one thing this rule forbids.`);
      }
    }
  }
  return problems;
}

// ── REGISTRATION IS A REPORT, NOT AN INPUT (ADR-004 §4) ──────────────────────────────────────
//
// Green on a suite nobody registered says nothing about CI — 59/FF-5903's entire finding, at the
// cost of twenty-six suites that were imported and never spread. A selection command makes that
// failure CHEAPER to reach, not harder: it runs suite files by name, so a file no runner assembles
// is exactly as runnable here as one that is.
//
// The verdict is the census's OWN, carried verbatim — its code and its message — so a re-phrasing
// cannot drift from what the audit says about the same file. `assembled` and `suiteNames` are
// given; this module produces neither.
export function registrationReport({ selected = [], assembled = new Set(), suiteNames = new Map(), importedBy = new Set(), baseline } = {}) {
  const decision = registrationDecision({
    files: [...selected],
    suiteNames,
    assembled,
    importedBy,
    ...(baseline === undefined ? {} : { baseline }),
  });

  const registered = new Set(decision.registered);
  const findingFor = new Map(decision.findings.map((finding) => [finding.path, finding]));
  const carriedFor = new Map(decision.unregistered.filter((row) => row.carried).map((row) => [row.file, row]));

  const files = selected.map((file) => {
    if (registered.has(file)) return Object.freeze({ file, registered: true, code: null, message: null, carried: false });
    const carried = carriedFor.get(file);
    if (carried != null) {
      return Object.freeze({ file, registered: false, code: null, message: carried.reason, carried: true, origin: carried.origin ?? null });
    }
    const finding = findingFor.get(file);
    return Object.freeze({
      file,
      registered: false,
      code: finding?.code ?? null,
      message: finding?.message ?? null,
      carried: false,
    });
  });

  return Object.freeze({
    files: Object.freeze(files),
    unregistered: Object.freeze(files.filter((row) => !row.registered).map((row) => row.file)),
    findings: Object.freeze([...decision.findings]),
  });
}
