// THE AUDIT REPORT — the lane registry, the computed addressing, and the declared bypass.
// Milestone 59 / story 04. ADR-002 §2/§4, ADR-004 §1/§1a, ADR-006 §1/§2/§3. FF-5908, FF-5909.
//
// Three lanes exist by the time this module runs — the census that knows which gates CI actually
// assembles (59/01), the evidence lane that has RE-RUN what the registers claim (59/02), and the
// checks that know which anchors have gone stale and which loops nobody consults (59/03). What
// none of them has is a face, an audience, or a route to that audience. This module supplies the
// second and third; `src/commands/audit.mjs` supplies the first.
//
// ── WHY ADDRESSING IS A SEPARATE AXIS FROM SEVERITY (ADR-006 §1) ─────────────────────────────
//
// A report that tells the build loop its own gate is dead is a report the build loop can decide is
// not urgent, and severity cannot express the difference: a `warn` sent to the culprit is
// compromised in exactly the way an `error` sent there is. So every finding this module emits
// carries two keys doctor's findings do not — `about` (the instrument the finding concerns) and
// `to` (who hears it) — and BOTH are computed. Nothing here constructs an addressee from a
// literal; no node id is spelled anywhere in this file.
//
// SEVERITY IS NOT AN INPUT TO ANY FUNCTION BELOW, and that is the enforceable form of the rule:
// `addresseesFor` takes a code, an instrument and a registry, and there is no parameter through
// which a severity could reach it. `runAudit` is the one place both facts are in scope at once, so
// it is the one place the axes could be conflated — which is why FF-5909 and the behavioural suite
// both drive the SAME instrument through `runAudit` at `warn` and at `error` and compare the
// addressees, rather than calling the resolver twice with a value it never sees.
//
// ── HOW `to` IS RESOLVED, AND THE TWO RULES THAT MAKE IT WORTH HAVING ────────────────────────
//
//   about  →  the loop(s) that OWN that instrument  →  each owner's `target-setting` source  →  to
//
// …minus any candidate that is ITSELF an owner of the instrument. That subtraction is not
// bookkeeping and it is the part a transitively-correct resolver gets wrong: measured over the
// registry this repository ships, `prose:src/bundle/agents/aof-developer.md` is the actuator of
// FOUR loops, one of which sets the reference of two of the others. Union the reference-owners
// naively and that cascade — a loop that shares the very actuator the finding is about — becomes
// the audience for news about it. FF-5909 asserts the property over the shipped records rather
// than over the function, precisely so that one bad edge in the registry fails the gate.
//
// …and PLUS the escalation actor where what remains cannot RECEIVE. 58/ADR-001 admits three owners
// of a reference — a slower loop, an actor, or a `frozen-rule` anchor — and only the first two are
// an audience. Measured on the shipped registry: six instruments belonging to `loop:run-resilience`
// resolve solely to `anchor:run-lifecycle-policy`, a frozen rule that can neither read a report nor
// forward one, so a non-escalating finding about any of them was addressed and thereby dropped.
// The anchor stays in `to` — it is the declared authority, and saying so is honest — and the actor
// is added beside it so somebody can act.
//
// ── ESCALATION IS A DECLARED BYPASS, NOT A SEVERITY (ADR-006 §3) ─────────────────────────────
//
// A hierarchy can absorb a report on the way up, one polite layer at a time. So a finding whose
// CODE is in `ESCALATING_CODES` gets a SECOND addressee — the auditor's declared `escalation:`
// actor, reached directly — and the owner's copy is still there. It is additive, never a re-route.
// Which findings escalate is a property of the code in ONE table, exactly as 58/ADR-005 made
// severity a property of the code, so no finding decides its own escalation where it is raised.
//
// AND THE TABLE IS BOUND TO THE VOCABULARIES IT NAMES. A member that is not a code any lane can
// emit — one transposed letter — silently disables the bypass for that whole class while a gate
// that only checks "every member of the table is in the table" stays green. A bypass that quietly
// does not fire is the exact instrument failure this milestone exists to catch, so the binding is
// a module-scope refusal: the process does not start with an unreachable member in the table.
import path from "node:path";

import { AUDIT_FINDING_CODES, runCensus } from "./census.mjs";
import { EVIDENCE_FINDING_CODES, runEvidence } from "./evidence.mjs";
import { limitDeclarationProblems, readFinding, sweepDeclarationProblems } from "./reads.mjs";
import { PROMPT_LAYER_FINDING_CODES, runPromptLayer } from "./prompt-layer.mjs";
import { HOOK_WIRING_FINDING_CODES, HOOK_WIRING_SWEEPS, runHookWiring } from "./hook-wiring.mjs";
import { SEAM_LIVENESS_FINDING_CODES, runSeamLiveness } from "./seam-liveness.mjs";
import { DECLARED_BOUNDS_FINDING_CODES, runDeclaredBounds } from "./declared-bounds.mjs";
import {
  AUDIT_LANE_FINDING_CODES,
  assessAnchorFreshness,
  assessInstrumentSilence,
  assessLoopConsultation,
  assessMetricMovement,
} from "../work/loops-checks.mjs";

// ── THE FINDING ENVELOPE, FROZEN ─────────────────────────────────────────────────────────────
//
// Doctor's four keys (15/ADR-001) plus ADR-006's two, and nothing else. Milestone 77 adds LANES to
// this command (ADR-002 §4); the envelope it inherits is this one, which is why it is frozen by a
// control now rather than settled later.
export const AUDIT_ENVELOPE_KEYS = Object.freeze(["code", "severity", "path", "message", "about", "to"]);

// ── THE FACE'S OWN TWO CODES ─────────────────────────────────────────────────────────────────
//
// Everything else in the report comes from a lane. These two are facts about the REPORTING
// APPARATUS itself, which no lane can see because no lane knows there is an addressee: the bypass
// has no declared endpoint, or the registry declares more than one auditor. Both are `error`, and
// both are disjoint from every lane's vocabulary and from doctor's `CONTROL_FINDING_CODES`.
export const AUDIT_FACE_CODES = Object.freeze([
  "audit-escalation-undeclared",
  "audit-auditor-not-unique",
]);

// ── THE CODE SPACE IS DERIVED FROM THE REGISTRY (77/ADR-001 §4, ADR-008 §4) ──────────────────
//
// It used to be derived from three imported constants, which is one improvement short: a FOURTH
// lane widened the audit's vocabulary without widening this, and the guard that keeps these codes
// apart from doctor's would have run green over all seven of milestone 77's codes without ever
// having looked at one. So each registry entry now declares its OWN vocabulary and the space is a
// fold over whatever is registered — registering a lane puts its codes inside the check, and there
// is no enumeration left to forget.
export function auditableCodesFor(lanes = REPORT_LANES) {
  return Object.freeze([...new Set([
    ...lanes.flatMap((lane) => [...(lane.codes ?? [])]),
    ...AUDIT_FACE_CODES,
  ])].sort());
}

// THE ONE CODE THAT BELONGS TO NO LANE. `audit-ran-on-nothing` is the READ CONTRACT's, raised
// structurally by the registry's own floor backstop on behalf of whichever lane read short — so it
// already sits in two lane vocabularies and would read as a collision under a pairwise check that
// did not know it is lane-neutral. Carved out here, once, with the reason attached, rather than
// silently subtracted at a comparison site.
export const LANE_NEUTRAL_CODES = Object.freeze(["audit-ran-on-nothing"]);

/**
 * PURE. The collisions across the registered lanes' own vocabularies — one entry per code two lanes
 * both declare. `audit-ran-on-nothing` is excluded by `LANE_NEUTRAL_CODES`; every other shared code
 * is a finding whose fix is ambiguous, because the reader cannot tell which of two rules to satisfy.
 */
export function laneVocabularyCollisions(lanes = REPORT_LANES, neutral = LANE_NEUTRAL_CODES) {
  const holders = new Map();
  for (const lane of lanes) {
    for (const code of lane.codes ?? []) {
      if (neutral.includes(code)) continue;
      if (!holders.has(code)) holders.set(code, []);
      holders.get(code).push(lane.id);
    }
  }
  return Object.freeze([...holders.entries()]
    .filter(([, lanesHolding]) => lanesHolding.length > 1)
    .map(([code, lanesHolding]) => Object.freeze({ code, lanes: Object.freeze(lanesHolding) })));
}

// ── THE ESCALATING SET — ONE TABLE, KEYED ON THE CODE ────────────────────────────────────────
//
// Every member is a finding about an instrument that is NOT MEASURING, or about the bypass itself.
// That is the class a reference-owner has the least incentive to forward and the operator has the
// most need to hear: a gate CI never assembles, a register whose control contradicts it, a sweep
// that ran on nothing, an audit with nowhere to escalate to. A finding about an instrument that is
// merely OLD or QUIET (`anchor-stale`, `instrument-silent`, `loop-unconsulted`,
// `evidence-still-failing`) is a degradation its owner can act on in their own cycle, and is
// deliberately NOT here — a bypass everything takes is not a bypass.
export const ESCALATING_CODES = Object.freeze([
  "audit-ran-on-nothing",
  "audit-runtime-membership-unavailable",
  "audit-suite-unregistered",
  "audit-suite-imported-never-spread",
  "evidence-contradicted",
  "evidence-unregistered",
  "evidence-none-reproduced",
  ...AUDIT_FACE_CODES,
]);

const ESCALATING = new Set(ESCALATING_CODES);

/** PURE. Whether a finding escalates, decided by its code and by nothing else. */
export function escalates(code) {
  return ESCALATING.has(code);
}

// ── THE OWNING KEYS (ADR-006 §2) ─────────────────────────────────────────────────────────────
//
// A loop OWNS an instrument when it names it as what it reads, what bounds it, or what it acts
// through. `reference:` is deliberately absent: a reference is what the loop is TOLD, not an
// instrument the loop keeps, and 58/ADR-001 already gives it its own owner.
export const OWNING_KEYS = Object.freeze(["measurement", "ceiling", "actuator"]);

// The edges by which a non-loop node IS an instrument of a loop: an anchor feeds a loop's ground,
// a watcher watches a loop's own optimisation. `target-setting`, `veto` and `parameter-tuning` are
// GOVERNANCE edges — a node that sets a loop's reference is not thereby the loop's instrument —
// and admitting them would let a finding about an authority be addressed to that same authority.
const INSTRUMENT_EDGES = Object.freeze(["data-feed", "monitoring"]);

// The kinds that can RECEIVE a report. 58/ADR-001 admits three owners of a reference and only two
// of them are an audience: a `frozen-rule` anchor is an authority no cycle revises, which is
// precisely why it can neither read a finding nor forward one.
const RECEIVING_KINDS = Object.freeze(["actor", "loop"]);

// The parsed field kinds that name an INSTRUMENT. Taken from the loader's own classification
// rather than guessed from the text: a `pointer` names a module symbol, a command or a config key,
// a `ref` names a declared record, and a `prose:` pointer names a document. `none`, `unknown`, a
// phrase, a flag, an enum and every cadence form are declarations ABOUT a loop, not instruments of
// it — `ceiling: none` is the absence of a ceiling and must not be addressable.
const INSTRUMENT_FIELD_KINDS = Object.freeze(["pointer", "ref", "prose"]);

const nodesOf = (model) => (Array.isArray(model?.nodes) ? model.nodes : []);
const byId = (model) => new Map(nodesOf(model).map((node) => [node.id, node]));

/** Every raw INSTRUMENT pointer any record in the registry declares, in one pass. */
export function declaredPointerRaws(model) {
  const raws = new Set();
  for (const node of nodesOf(model)) {
    for (const value of Object.values(node.fields ?? {})) {
      for (const entry of Array.isArray(value) ? value : [value]) {
        if (typeof entry?.raw === "string" && INSTRUMENT_FIELD_KINDS.includes(entry.kind)) raws.add(entry.raw);
      }
    }
  }
  return raws;
}

/** The repo-relative file a `prose:` / `module:` pointer names, or null for any other scheme. */
export function pointerFile(raw) {
  if (typeof raw !== "string") return null;
  if (raw.startsWith("prose:")) return raw.slice("prose:".length).split("#")[0];
  if (raw.startsWith("module:")) return raw.slice("module:".length).split("#")[0];
  return null;
}

function repoRelative(target, repoRoot) {
  if (typeof target !== "string" || target.length === 0) return null;
  if (!path.isAbsolute(target)) return target.split(path.sep).join("/");
  if (typeof repoRoot !== "string" || repoRoot.length === 0) return null;
  const rel = path.relative(repoRoot, target);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/**
 * PURE. The instrument a finding is ABOUT, computed from what the lane anchored it to — never
 * declared on the finding by the lane that raised it.
 *
 * Three answers, in order of how much the registry already knows about the anchor:
 *   1. the anchor IS a declared record — the node's own id is the instrument (a loop, a watcher or
 *      an anchor is an instrument in this vocabulary, ADR-001 §1);
 *   2. the anchor is a file for which the registry declares EXACTLY ONE pointer — that pointer is
 *      the instrument, in the spelling the registry itself uses, which is what lets an owner
 *      resolve;
 *   3. otherwise the audit's own `file:` form.
 *
 * CASE 3 INCLUDES AMBIGUITY, AND THAT IS THE FIX RATHER THAN A FALLBACK. Two shipped files carry
 * several declared symbols apiece (`src/run-store.mjs` carries six, `src/mesh/assignment-reclaim.mjs`
 * two). Picking one of them would attribute a finding about the FILE to the owner of ONE symbol in
 * it — and picking it out of an unordered `Set`, as this did before review, meant a record edit
 * could silently move the addressee. Where the registry names several instruments inside one file,
 * the finding is about the file and the file is what it says.
 */
export function instrumentFor(finding, { model, repoRoot, fallback = null } = {}) {
  const declared = nodesOf(model).find((node) => node.path === finding?.path);
  if (declared?.id != null) return declared.id;
  const rel = repoRelative(finding?.path, repoRoot);
  if (rel == null) return fallback;
  const named = [...declaredPointerRaws(model)].filter((raw) => pointerFile(raw) === rel).sort();
  return named.length === 1 ? named[0] : `file:${rel}`;
}

/** PURE. Every loop that owns the named instrument. ADR-006 §2. */
export function ownersOfInstrument(about, model) {
  const index = byId(model);
  const owners = new Set();

  const named = index.get(about);
  if (named?.kind === "loop") {
    // A LOOP AUDITED AS AN INSTRUMENT OWNS ITSELF, and that is what makes "never its own
    // addressee" bite: the resolution below then hands the finding to whoever sets ITS reference.
    owners.add(named.id);
  } else if (named != null) {
    for (const key of INSTRUMENT_EDGES) {
      for (const endpoint of named.edges?.[key] ?? []) {
        if (index.get(endpoint?.raw)?.kind === "loop") owners.add(endpoint.raw);
      }
    }
  }

  for (const node of nodesOf(model)) {
    if (node.kind !== "loop") continue;
    for (const key of OWNING_KEYS) {
      const value = node.fields?.[key];
      for (const entry of Array.isArray(value) ? value : [value]) {
        if (entry?.raw === about) owners.add(node.id);
      }
    }
  }
  return Object.freeze([...owners].sort());
}

/** PURE. Every node declaring a `target-setting` edge to the named node (58/ADR-001). */
export function referenceSettersOf(nodeId, model) {
  const setters = new Set();
  for (const node of nodesOf(model)) {
    for (const endpoint of node.edges?.["target-setting"] ?? []) {
      if (endpoint?.raw === nodeId && node.id !== nodeId) setters.add(node.id);
    }
  }
  return Object.freeze([...setters].sort());
}

/** PURE. Whether a declared node can RECEIVE a report at all — an actor or a loop, never a rule. */
export function canReceive(nodeId, model) {
  return RECEIVING_KINDS.includes(byId(model).get(nodeId)?.kind);
}

/** PURE. Every record declaring the auditor kind. */
export function auditorsOf(model) {
  return nodesOf(model).filter((node) => node.kind === "auditor");
}

/** PURE. The single shipped auditor, or null when the registry declares none (or more than one). */
export function auditorOf(model) {
  const auditors = auditorsOf(model);
  return auditors.length === 1 ? auditors[0] : null;
}

/**
 * PURE. The actor the audit can reach directly, or null.
 *
 * UNANIMITY, NOT UNIQUENESS. A project that runs `aof work update` receives the framework's
 * auditor and may declare its own — which is what 59/00's grammar exists for — so more than one
 * auditor is a realistic registry rather than a malformed one. Two auditors naming the SAME actor
 * still name one endpoint, and refusing to resolve it would drop every escalating finding in
 * silence (measured at review: `to: []` on a registry that loads with zero error findings). Two
 * auditors naming DIFFERENT actors name no single endpoint, and that is reported rather than
 * guessed. Either way the plurality itself is a finding — see `auditorFindings`.
 */
export function escalationActorOf(model) {
  const declared = [...new Set(
    auditorsOf(model)
      .map((auditor) => auditor?.fields?.escalation?.raw)
      .filter((raw) => typeof raw === "string"),
  )];
  return declared.length === 1 ? declared[0] : null;
}

/**
 * PURE. What the report must say about its own bypass before it says anything else. A silent
 * absence here would void ADR-006 §3 for the whole run, so the two ways the endpoint fails to
 * resolve are named rather than left to be inferred from an empty `to`.
 */
export function auditorFindings(model, anchor) {
  const auditors = auditorsOf(model);
  const actor = escalationActorOf(model);
  const findings = [];

  if (auditors.length > 1) {
    findings.push(Object.freeze({
      code: "audit-auditor-not-unique",
      severity: "error",
      path: anchor,
      message: `${auditors.length} records declare the auditor kind (${auditors.map((auditor) => auditor.id).sort().join(", ")}), and they name ${actor == null ? "different escalation actors, so no single bypass endpoint resolves" : `one escalation actor (${actor}), so the bypass still resolves`} — a registry with more than one auditor is admissible, but which one the audit reports through must not be decided by directory order`,
    }));
  }
  if (actor == null) {
    findings.push(Object.freeze({
      code: "audit-escalation-undeclared",
      severity: "error",
      path: anchor,
      message: auditors.length === 0
        ? "no record declares the auditor kind, so this audit has no declared actor to escalate to and every finding that no reference-owner can receive would go nowhere (ADR-006 §3)"
        : `the ${auditors.length} declared auditors name different escalation actors, so no single bypass endpoint resolves and every escalating finding would go nowhere (ADR-006 §3)`,
    }));
  }
  return findings;
}

/**
 * PURE. Who hears about this instrument, and why. The return carries its own derivation so a
 * reader — and the control — can see that the addressee came OUT of the registry rather than off
 * a literal. SEVERITY IS NOT A PARAMETER: there is no channel by which it could reach this.
 */
export function resolveAddressees(about, model, escalationActor = null) {
  const owners = ownersOfInstrument(about, model);
  const candidates = new Set();
  for (const owner of owners) {
    for (const setter of referenceSettersOf(owner, model)) candidates.add(setter);
  }
  // THE CULPRIT IS NEVER THE AUDIENCE. A candidate that also owns the instrument would be hearing
  // about its own gate, which is the whole arrangement this milestone exists to replace.
  for (const owner of owners) candidates.delete(owner);

  const escalated = escalationActor == null ? [] : [escalationActor];
  if (candidates.size === 0) {
    return Object.freeze({
      about,
      owners,
      to: Object.freeze(escalated),
      via: owners.length === 0 ? "escalation-unowned" : "escalation-no-reference-owner",
    });
  }

  const audience = [...candidates].sort();
  // AN AUTHORITY IS NOT AN AUDIENCE. Where everything the reference resolves to is a frozen rule,
  // the finding is addressed and thereby dropped, so the actor is added BESIDE the authority
  // rather than instead of it — the record of who owns the reference stays true.
  if (!audience.some((addressee) => canReceive(addressee, model))) {
    return Object.freeze({
      about,
      owners,
      to: Object.freeze([...new Set([...audience, ...escalated])].sort()),
      via: "escalation-no-receiver",
    });
  }
  return Object.freeze({ about, owners, to: Object.freeze(audience), via: "reference-owner" });
}

/**
 * PURE. The full addressing of one finding: the reference-owners, PLUS the escalation actor as a
 * second copy when the code is in the escalating set. Additive — the owner's copy is never
 * replaced, because a bypass that re-routed would leave the owner uninformed and call it progress.
 */
export function addresseesFor(code, about, model, escalationActor = null) {
  const base = resolveAddressees(about, model, escalationActor);
  const escalated = escalates(code);
  const to = new Set(base.to);
  if (escalated && escalationActor != null) to.add(escalationActor);
  return Object.freeze({ ...base, escalated, to: Object.freeze([...to].sort()) });
}

// ── THE LANE REGISTRY (ADR-004 §1, FF-5908; ADR-002 §4) ──────────────────────────────────────
//
// One entry per lane the audit assembles, and EACH ENTRY CARRIES ITS OWN RUNNER. That is the part
// milestone 77 inherits: this registry was a frozen description dispatched by a ternary chain whose
// final `else` was the checks lane, so a fourth entry appended by 77 would have re-run the registry
// checks under its own name and duplicated every finding with no test red. A lane the registry
// cannot execute must fail loudly, never fall through to another lane's result.
//
// `scoped` is the whole of scope-as-filter: an ITEM scope narrows the audit to that item's own
// instruments, and a repository-wide lane audits instruments no single item owns, so it does not
// run under one. `population` is what an item-scoped lane would actually sweep, so the report can
// tell "your scope matched nothing" from "your scope matched items that declare no register".
// `instrument` is the lane's own subject — what a finding it raises is about when the finding's
// anchor is not a file the registry knows.
export const REPORT_LANES = Object.freeze([
  Object.freeze({
    id: "instrument-census",
    what: "the suites on disk, the runner's bindings, and the names the runner actually assembles in a child process",
    scoped: false,
    instrument: "module:scripts/test.mjs#tests",
    whyUnscoped: "the suite population is a repository-wide instrument that no single work item owns",
    population: null,
    codes: AUDIT_FINDING_CODES,
    run: (ctx) => ctx.census({ repoRoot: ctx.repoRoot, ...ctx.bound }),
  }),
  Object.freeze({
    id: "evidence-re-run",
    what: "every (fitness-register row, cited control) pair in scope, re-executed rather than re-read",
    scoped: true,
    instrument: "module:src/work/doctor-controls.mjs#fitnessDeclarations",
    whyUnscoped: null,
    codes: EVIDENCE_FINDING_CODES,
    // The items this lane can actually sweep: the ones carrying a register to re-run.
    population: (ctx) => ctx.matched.filter((item) => typeof item?.docTexts?.["ARCHITECTURE.md"] === "string"),
    run: (ctx) => ctx.evidence({
      repoRoot: ctx.repoRoot,
      items: ctx.population,
      scope: ctx.requested,
      registration: ctx.registration,
      ...ctx.bound,
    }),
  }),
  Object.freeze({
    id: "registry-checks",
    what: "the declared loop registry: anchor freshness, instrument silence, metric movement and loop consultation",
    scoped: false,
    instrument: "module:src/work/loops-checks.mjs#buildGroundednessReport",
    whyUnscoped: "the loop registry is a repository-wide instrument that no single work item owns",
    population: null,
    codes: AUDIT_LANE_FINDING_CODES,
    run: (ctx) => ctx.checks(ctx.model, { now: ctx.now, anchorWindowMs: ctx.anchorWindowMs, executions: ctx.executions }),
  }),

  // ── MILESTONE 77's FOUR LANES (ADR-001 §2, ADR-010 §2) ─────────────────────────────────────
  //
  // Each is a PURE function over injected inputs and a subject root, authored in its own story and
  // registered here — the inversion ADR-010 §2 chose over four writers on this one file. Every fact
  // the family may not read for itself arrives on `ctx`, supplied by the face: the marker key, the
  // audited settings, the resolved role routing, the reference rows and what this project declares
  // for them, and the instant. None of the four starts a child process.
  Object.freeze({
    id: "prompt-layer",
    what: "the prompt documents this project has INSTALLED, read for a role ordered to run a program it was never granted, and for one rule stated twice in the same words",
    scoped: false,
    instrument: "module:src/work-audit/prompt-layer.mjs#runPromptLayer",
    whyUnscoped: "the installed prompt layer is a project-wide instrument that no single work item owns",
    population: null,
    codes: PROMPT_LAYER_FINDING_CODES,
    run: (ctx) => ctx.promptLayer({ root: ctx.repoRoot, roleRouting: ctx.roleRouting, now: ctx.now }),
  }),
  Object.freeze({
    id: "hook-wiring",
    what: "the audited project's hook registrations, read for one invocation registered twice under one event and one matcher",
    scoped: false,
    instrument: "module:src/work-audit/hook-wiring.mjs#runHookWiring",
    whyUnscoped: "the settings file is a project-wide instrument that no single work item owns",
    population: null,
    codes: HOOK_WIRING_FINDING_CODES,
    run: (ctx) => ctx.hookWiring({ settings: ctx.settings, markerKey: ctx.markerKey, settingsPath: ctx.settingsPath, now: ctx.now }),
  }),
  Object.freeze({
    id: "seam-liveness",
    what: "the audited tree's exported modules, joined against the code graph for a seam no production caller reaches",
    scoped: false,
    instrument: "module:src/work-audit/seam-liveness.mjs#runSeamLiveness",
    whyUnscoped: "the source tree is a project-wide instrument that no single work item owns",
    population: null,
    codes: SEAM_LIVENESS_FINDING_CODES,
    run: (ctx) => ctx.seamLiveness({ root: ctx.repoRoot, now: ctx.now }),
  }),
  Object.freeze({
    id: "declared-bounds",
    what: "the bounds this project declares about its own loops, joined against the bounds other systems ship",
    scoped: false,
    instrument: "module:src/work-audit/declared-bounds.mjs#runDeclaredBounds",
    whyUnscoped: "the loop registry and the reference corpus are project-wide instruments that no single work item owns",
    population: null,
    codes: DECLARED_BOUNDS_FINDING_CODES,
    run: (ctx) => ctx.declaredBounds({
      model: ctx.model,
      declaredBounds: ctx.declaredBoundValues,
      now: ctx.now,
      ...(ctx.referenceRows == null ? {} : { rows: ctx.referenceRows }),
    }),
  }),
]);

// Every code any REGISTERED lane can emit, plus the face's own. Declared here, after the registry,
// because it is a fold over it: a lane that arrives without its `codes` widens nothing and is
// caught by FF-7707 rather than silently leaving its vocabulary outside every check.
export const AUDITABLE_CODES = auditableCodesFor(REPORT_LANES);

// THE BINDING, AT MODULE SCOPE — and it moved DOWN HERE when the code space became derived from the
// registry (77/ADR-001 §4), because a fold over `REPORT_LANES` cannot be read before that registry
// exists. A table member no lane can emit is a bypass that never fires, and it would pass any gate
// that reads the table against itself. This refuses to load instead.
const UNREACHABLE = ESCALATING_CODES.filter((code) => !AUDITABLE_CODES.includes(code));
if (UNREACHABLE.length > 0) {
  throw new Error(
    `the escalating set names ${UNREACHABLE.length} code(s) no lane can emit — [${UNREACHABLE.join(", ")}] — so the bypass would silently never fire for them (ADR-006 §3)`,
  );
}

/**
 * The registry's own refusal. A lane that returns no read record, or one whose record is not
 * declared by the SAME validator every sweep is declared by, is a programming error in the audit
 * and must not degrade into a quiet pass over an unswept population (ADR-004 §1).
 */
/**
 * The limits half of the same rule (D-59-3). A lane that states no limit returns an empty list — an
 * honest answer — but a lane that states one the face cannot render is REFUSED here rather than
 * rendered blank, because a blank limit is worse than no limit: it says a caveat exists and then
 * withholds it. The refusal names the lane and the keys, so the fix is the message.
 */
export function assertLaneLimits(laneId, limits, reads = []) {
  // A TEXT SWEEP OWES A LIMIT (77/05, task 00). `reads.mjs` says a text-level sweep "must state its
  // own limit", and until 77 that was a sentence rather than a refusal — a lane reading TEXT and
  // stating nothing reported clean in exactly the case where it is blind. The obligation is checked
  // FROM THE READ RECORD, so a fifth lane cannot arrive without it.
  const textSweeps = (reads ?? []).filter((read) => read?.basis === "text").map((read) => read.sweep);
  if (textSweeps.length > 0 && (limits === undefined || limits.length === 0)) {
    throw new Error(`the "${laneId}" lane read TEXT in its "${textSweeps.join(", ")}" sweep and stated no limit — a text-level sweep that states no limit reports clean in exactly the case where it is blind (ADR-004 §1)`);
  }
  if (limits === undefined) return [];
  const problems = limitDeclarationProblems(limits);
  if (problems.length > 0) {
    throw new Error(`the "${laneId}" lane returned an unrenderable limit: ${problems.join("; ")}`);
  }
  return limits;
}

/**
 * THE REGISTRY'S SECOND REFUSAL (77/05, task 00). An entry with no runner already fails loudly; two
 * entries sharing ONE runner is the same defect wearing the other face — the registry would report
 * one lane's result twice, under two names, and redden nothing. Both are refused before any lane
 * runs, so a broken registry cannot produce a partial report that reads like a finished one.
 */
export function assertLaneRunnersDistinct(lanes = REPORT_LANES) {
  const holders = new Map();
  for (const lane of lanes) {
    if (typeof lane.run !== "function") {
      throw new Error(
        `the "${lane.id}" lane declares no runner — a registered lane the registry cannot execute must fail rather than fall through to another lane's result (ADR-002 §4: milestone 77 adds lanes to this same registry)`,
      );
    }
    if (!holders.has(lane.run)) holders.set(lane.run, []);
    holders.get(lane.run).push(lane.id);
  }
  const shared = [...holders.values()].filter((ids) => ids.length > 1);
  if (shared.length > 0) {
    throw new Error(
      `${shared.map((ids) => `the ${ids.map((id) => `"${id}"`).join(" and ")} lanes declare the same runner`).join("; ")} — each would report the other's result under its own name, which is the fall-through a fourth lane would have hit`,
    );
  }
  return lanes;
}

export function assertLaneRead(laneId, reads) {
  if (!Array.isArray(reads) || reads.length === 0) {
    throw new Error(`the "${laneId}" lane returned no read record — a clean lane result is not representable without one (ADR-004 §1)`);
  }
  // The read record is validated as a SWEEP DECLARATION, so "declared" has one definition for the
  // registry a lane ships and for the record that lane returns.
  const problems = sweepDeclarationProblems(reads.map((read) => ({ ...read, id: read?.sweep })));
  if (problems.length > 0) {
    throw new Error(`the "${laneId}" lane returned an undeclared read record: ${problems.join("; ")}`);
  }
  for (const read of reads) {
    if (typeof read.count !== "number" || !Number.isFinite(read.count)) {
      throw new Error(`the "${laneId}" lane's "${read.sweep}" read declares no count — "found nothing" and "looked at nothing" would be the same answer`);
    }
  }
  return reads;
}

/**
 * PURE. The floor comparison, applied FROM THE REGISTRY over whatever a lane returned — which is
 * what FF-5908's declared invariant asks for and what the first cut of this module left to each
 * lane's own good behaviour. All three lanes do emit their own, so this is a duplicate-suppressing
 * backstop rather than the primary path; the point is that a FOURTH lane cannot arrive without it.
 * A lane that read below its floor and said nothing is reported here, by the same emitter, in the
 * same words.
 */
export function unreportedFloorFindings(reads, reported) {
  const seen = new Set((reported ?? []).map((finding) => `${finding.code} ${finding.path} ${finding.message}`));
  const out = [];
  for (const read of reads) {
    const ranOnNothing = readFinding(read);
    if (ranOnNothing == null) continue;
    if (seen.has(`${ranOnNothing.code} ${ranOnNothing.path} ${ranOnNothing.message}`)) continue;
    out.push(ranOnNothing);
  }
  return out;
}

// The four checks-leaf assessments, driven as ONE lane. Each is a pure `(subject, observation)`
// function that reads no clock — every reading arrives on the call (52/ADR-007, FF-5907).
export function runRegistryChecks(model, { now, anchorWindowMs, executions = [] } = {}) {
  const findings = [];
  const reads = [];
  const collect = (result) => {
    findings.push(...result.findings);
    reads.push(result.read);
    return result;
  };

  const freshness = collect(assessAnchorFreshness(model, { now, window: anchorWindowMs }));
  // Every record that declares a cadence is an instrument that can go quiet, which is ADR-004 §2's
  // one rule rather than one rule per channel. No reading source exists on this node yet, so each
  // is offered with the reading it has — none — and the lane decides what that means against the
  // cadence the record itself declares.
  const instruments = nodesOf(model)
    .filter((node) => node.fields?.cadence != null)
    .map((node) => ({ id: node.id, path: node.path, cadence: node.fields.cadence, reading: null }));
  const silence = collect(assessInstrumentSilence(instruments, { now, root: model.source }));
  const counters = nodesOf(model)
    .filter((node) => node.fields?.counter != null)
    .map((node) => ({ id: node.id, path: node.path, counter: node.fields.counter.raw, readings: [] }));
  const movement = collect(assessMetricMovement(counters, { root: model.source }));
  // `executions` is REQUIRED by the lane and has no default there: "nobody asked whether it ran"
  // and "it has never run" are the two facts ADR-004 §1 refuses to let a report conflate. This
  // node observes none, and says so by handing an empty list rather than by omitting the argument.
  const consultation = collect(assessLoopConsultation(model, { executions }));

  return {
    findings,
    reads,
    anchors: freshness.anchors,
    instruments: silence.instruments,
    counters: movement.counters,
    loops: consultation.loops,
  };
}

/** PURE. Scope-as-filter, with `work:doctor`'s semantics: an unresolved scope matches nothing. */
export function matchesScope(item, scope) {
  if (scope == null) return true;
  return [item?.ref, item?.number, item?.name, item?.slug]
    .filter((value) => value != null)
    .map(String)
    .includes(String(scope));
}

/**
 * Run every registered lane and address every finding it produced.
 *
 * The lanes are INJECTABLE — the census and the evidence lane each start bounded child processes,
 * and a report assembler that could only be exercised by running the repository's whole test suite
 * would be an assembler nobody tests. Injection is the seam, never a second implementation.
 *
 * `population` is the WHOLE item set the scope resolves against, and `items` is the subset an
 * item-scoped lane can sweep. They are two arguments because they answer two questions, and
 * collapsing them made a real story with no fitness register render byte-identically to a typo.
 */
export async function runAudit({
  repoRoot,
  model = { source: null, present: false, nodes: [], findings: [] },
  items = [],
  population = null,
  scope = null,
  now,
  anchorWindowMs,
  executions = [],
  lanes = REPORT_LANES,
  census = runCensus,
  evidence = runEvidence,
  checks = runRegistryChecks,
  // MILESTONE 77's four runners, injectable on the same terms as the three above.
  promptLayer = runPromptLayer,
  hookWiring = runHookWiring,
  seamLiveness = runSeamLiveness,
  declaredBounds = runDeclaredBounds,
  // …AND THE FACTS THE FAMILY MAY NOT READ FOR ITSELF (ADR-008 §5). Each arrives from the face at
  // the impure boundary: the marker naming framework-authored hook entries, the audited settings
  // object and where it was read from, the audited project's resolved role routing, and what this
  // project declares for each bound the reference carries. A fact read in two places has two expiry
  // dates, and it is the second reader that goes stale.
  markerKey = null,
  settings = null,
  // The lane's OWN declared placeholder when the face supplies no path — the same arrangement every
  // other sweep uses, and the reason a read record can never carry an empty root: a finding that
  // could not say what it walked is refused at `assertLaneRead`, not rendered blank.
  settingsPath = HOOK_WIRING_SWEEPS[0].root,
  roleRouting = {},
  declaredBoundValues = {},
  referenceRows = null,
  registration = null,
  deadlineMs = null,
} = {}) {
  const requested = typeof scope === "string" && scope.trim() !== "" ? scope.trim() : null;
  const resolvable = Array.isArray(population) ? population : items;
  const matchedRefs = requested == null
    ? resolvable.map((item) => item?.ref ?? item?.name ?? null)
    : resolvable.filter((item) => matchesScope(item, requested)).map((item) => item?.ref ?? item?.name ?? null);
  const matched = requested == null ? items : items.filter((item) => matchesScope(item, requested));
  // A SCOPE THAT MATCHES NOTHING IS NOT A LANE THAT READ NOTHING. Running the lanes over an empty
  // population would emit `audit-ran-on-nothing` for each of them, which would report the operator's
  // typo as the instrument going blind. Doctor's rule instead (15/ADR-001): an unresolved scope
  // matches nothing, so nothing is audited, the report says so, and it does not fail.
  const nothingMatched = requested != null && matchedRefs.length === 0;

  const escalationActor = escalationActorOf(model);
  const registryAnchor = model?.source ?? repoRoot ?? ".";
  const bound = deadlineMs == null ? {} : { deadlineMs };
  const laneReports = [];
  const findings = [];
  const reads = [];
  const limits = [];
  // THE JOIN THE EVIDENCE LANE CANNOT MAKE ON ITS OWN (59/02's `REGISTRATION_LIMIT`). "Does any
  // runner assemble this control?" is the census's answer, and until now nobody had both in one
  // place — so a cited control on disk that `scripts/test.mjs` never assembles was driven, passed,
  // and reported `confirmed`, which renders "it does not run in CI" as "it is fine". The face is
  // where the two lanes meet, so the join happens here and nowhere else. It is keyed on the SHAPE a
  // lane returns (an answer about which suites are assembled), never on a lane id, so 77's lanes
  // inherit the join rather than a special case. An injected `registration` always wins; where no
  // lane supplied one the answer stays absent and the evidence lane says so.
  let joined = registration;

  // THE BYPASS IS DESCRIBED BEFORE ANYTHING IS ADDRESSED THROUGH IT. An endpoint that does not
  // resolve would otherwise show up only as an empty `to` on some later finding, which is the
  // silence ADR-006 §3 exists to remove.
  const faceFindings = auditorFindings(model, registryAnchor);

  const address = (raw) => {
    const about = instrumentFor(raw, { model, repoRoot, fallback: null }) ?? registryAnchor;
    return Object.freeze({
      code: raw.code,
      severity: raw.severity,
      // BASIS-NEUTRAL, doctor's keystone verbatim (15/ADR-001): the raw absolute in its on-disk
      // OS form, with NO projection. The lanes anchor repo-relative where their subject is a
      // repository path; resolving here is what keeps ONE rule for every face.
      path: path.isAbsolute(raw.path) ? raw.path : path.resolve(repoRoot ?? ".", raw.path),
      message: raw.message,
      about,
      // SEVERITY IS NOT PASSED. `raw.severity` is copied onto the envelope above and reaches no
      // part of the resolution below — the two axes meet here and nowhere else, which is why this
      // one call site is what FF-5909 drives at both severities.
      to: addresseesFor(raw.code, about, model, escalationActor).to,
    });
  };

  for (const finding of faceFindings) findings.push(address(finding));

  // BOTH REGISTRY REFUSALS, BEFORE ANY LANE RUNS. A registry that cannot be executed as written
  // must fail as a whole rather than half-produce a report that reads like a finished one.
  assertLaneRunnersDistinct(lanes);

  for (const lane of lanes) {
    const laneItems = typeof lane.population === "function"
      ? lane.population({ matched, requested, model })
      : matched;

    const skip = nothingMatched
      ? `the scope "${requested}" matched no item of the work stream, so nothing was audited`
      : requested != null && !lane.scoped
        ? `${lane.whyUnscoped} — a scoped run audits that item's instruments and no others`
        // A SCOPE THAT MATCHED REAL ITEMS WITH NOTHING FOR THIS LANE TO SWEEP is a third fact, and
        // it is deliberately NOT `audit-ran-on-nothing`: the operator named the population and it
        // is legitimately empty. Unscoped, an empty population IS the instrument going blind, and
        // the lane runs and reports it — which is the difference between the two cases.
        : requested != null && lane.scoped && matchedRefs.length > 0 && laneItems.length === 0
          ? `the ${matchedRefs.length} item(s) matching "${requested}" declare no fitness register, so this lane had nothing to re-run`
          : null;
    if (skip != null) {
      laneReports.push(Object.freeze({ ...lane, run: undefined, population: undefined, ran: false, why: skip, findings: 0, reads: Object.freeze([]) }));
      continue;
    }

    const result = await lane.run({
      repoRoot,
      model,
      matched,
      population: laneItems,
      requested,
      now,
      anchorWindowMs,
      executions,
      registration: joined,
      bound,
      census,
      evidence,
      checks,
      promptLayer,
      hookWiring,
      seamLiveness,
      declaredBounds,
      markerKey,
      settings,
      settingsPath,
      roleRouting,
      declaredBoundValues,
      referenceRows,
    });

    if (joined == null && Array.isArray(result.registered)) {
      const assembled = new Set(result.registered);
      joined = Object.freeze({
        runner: result.runner ?? "scripts/test.mjs",
        assembles: (control) => assembled.has(String(control ?? "").replaceAll("\\", "/")),
      });
    }

    const laneReads = assertLaneRead(lane.id, result.reads);
    reads.push(...laneReads);
    limits.push(...assertLaneLimits(lane.id, result.limits, laneReads).map((limit) => ({ lane: lane.id, ...limit })));

    const raised = [...(result.findings ?? []), ...unreportedFloorFindings(laneReads, result.findings ?? [])];
    for (const raw of raised) findings.push(address(raw));
    laneReports.push(Object.freeze({ ...lane, run: undefined, population: undefined, ran: true, why: null, findings: raised.length, reads: Object.freeze(laneReads) }));
  }

  return Object.freeze({
    scope: Object.freeze({
      requested,
      applied: requested != null,
      matched: Object.freeze(matchedRefs),
      audited: Object.freeze(matched.map((item) => item?.ref ?? item?.name ?? null)),
      nothingMatched,
    }),
    lanes: Object.freeze(laneReports),
    findings: Object.freeze(findings),
    reads: Object.freeze(reads),
    limits: Object.freeze(limits),
    // WHERE THE BYPASS TERMINATES, stated on every run so a report that could not escalate says so
    // rather than quietly addressing nothing — with the auditor set it was computed from.
    escalation: escalationActor,
    auditors: Object.freeze(auditorsOf(model).map((auditor) => auditor.id).sort()),
    registry: Object.freeze({ source: model?.source ?? null, present: model?.present === true }),
    summary: Object.freeze({
      error: findings.filter((finding) => finding.severity === "error").length,
      warn: findings.filter((finding) => finding.severity === "warn").length,
      escalated: findings.filter((finding) => escalates(finding.code)).length,
      lanes: laneReports.filter((lane) => lane.ran).length,
    }),
  });
}
