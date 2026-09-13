class FrozenSet {
  #values;

  constructor(values) {
    this.#values = new Set(values);
    Object.freeze(this);
  }

  get size() {
    return this.#values.size;
  }

  has(value) {
    return this.#values.has(value);
  }

  entries() {
    return this.#values.entries();
  }

  keys() {
    return this.#values.keys();
  }

  values() {
    return this.#values.values();
  }

  [Symbol.iterator]() {
    return this.#values[Symbol.iterator]();
  }

  forEach(callback, thisArg) {
    this.#values.forEach((value) => callback.call(thisArg, value, value, this));
  }

  add() {
    return this;
  }

  delete() {
    return false;
  }

  clear() {}
}

export const CHECK_FINDING_CODES = new FrozenSet([
  "loop-graph-ungrounded-component",
  "loop-graph-grounded-exogenous-only",
  "loop-anchor-absent",
  "loop-anchor-stale",
  "loop-counter-equals-controlled",
  "loop-counter-not-deterministic",
  "loop-unpaired-optimizer",
  "loop-unowned-reference",
  "loop-target-setting-not-admitted",
  "loop-layer-undeclared",
  "loop-layer-contradicts-cadence",
  "loop-self-referential-edge",
  "loop-shared-actuator-unarbitrated",
  "loop-arbiter-priority-incomplete",
  "loop-timescale-inversion",
  "loop-timescale-not-comparable",
  "loop-layer-inversion",
  "loop-layer-skipped",
  "loop-watcher-is-judge",
  "loop-watcher-shares-actuator",
  "loop-watcher-shares-measurement",
]);

// 58/ADR-005 §1 — EIGHT codes join 57's five and the set reaches thirteen. Every one of them is
// this milestone's own subject: a loop nobody admissibly owns, a source not entitled to own one, a
// shared actuator no arbiter resolves, an arbiter whose recorded order does not match what it
// vetoes, a supervisor no slower than what it supervises on either axis, and a declared place in
// the hierarchy that is missing or contradicted. NOTHING INHERITED MOVES (§2): the grounding,
// anchor and watcher-census codes keep their severity, and so do all seventeen loader codes.
// The two codes that report a PREFERENCE (`loop-layer-skipped`) or an honest inability to decide
// (`loop-timescale-not-comparable`) stay warnings — a run that fails on "cannot decide" teaches
// people to stop reading.
export const GATING_CODES = new FrozenSet([
  "loop-unpaired-optimizer",
  "loop-watcher-shares-measurement",
  "loop-watcher-shares-actuator",
  "loop-counter-equals-controlled",
  "loop-counter-not-deterministic",
  "loop-unowned-reference",
  "loop-target-setting-not-admitted",
  "loop-shared-actuator-unarbitrated",
  "loop-arbiter-priority-incomplete",
  "loop-timescale-inversion",
  "loop-layer-inversion",
  "loop-layer-undeclared",
  "loop-layer-contradicts-cadence",
]);

// 58/ADR-002 §6 — the minimum separation ratio between two clocked loops. It stays 3, it stays a
// FROZEN LITERAL, and it is exported so a gate can assert the number rather than grep for a digit.
// Not a config key, twice over: this module imports nothing (52/ADR-007 §7), and a control whose
// threshold the optimizer may lower is not a control. A ratio belongs to the CLOCK axis alone —
// the ordinal axis below compares ranks with < and ===, and never divides them.
export const MIN_SEPARATION_RATIO = 3;

export const CHECK_IDS = Object.freeze([
  "grounding",
  "anchor-grounding",
  "pairing",
  "reference-ownership",
  "actuator-arbitration",
  "timescale",
]);

// 59/ADR-001 §3 — `reporting` is the SIXTH edge key and it arrives HERE too, for the reason
// FF-5805's kind-parity leg exists: this list says which edges the module's traversals follow, the
// loader's `EDGE_KEYS` says which a record may declare, and a key admitted there and missing here is
// invisible to the decomposition, to the grounding flood and — new in this story — to the inbound
// count that decides whether a loop is consulted at all. A declared `reporting` edge from an auditor
// to the loop it reports on IS a consumer of that loop; omitting the key would offer an audited loop
// for pruning on the ground that nothing consults it, which is the same silent hole one axis over.
// Nothing points AT an auditor (`ENDPOINT_SCHEMES` stays closed, 59/ADR-001 §3), so admitting the
// key cannot launder ground into one either.
const EDGE_KEYS = Object.freeze([
  "data-feed",
  "target-setting",
  "monitoring",
  "veto",
  "parameter-tuning",
  "reporting",
]);

export const GROUND_VERDICTS = new FrozenSet([
  "anchored",
  "exogenous-only",
  "self-referential",
  "stale",
]);

// 59/ADR-005 §1/§2 — THREE ANSWERS, NOT TWO, and the third is the one every anchor shipped before
// this milestone is in. `checked:` is optional (59/ADR-005 §2), so an anchor that has never declared
// a date is UNDATED — a real and different state from STALE. Collapsing the two would redden every
// inherited anchor the instant the window landed, which is the wall of inherited red 54/04 refused
// once already; and it would lose the distinction between *never dated* and *dated, a while ago*,
// which is the one an operator acts on.
export const ANCHOR_FRESHNESS_VERDICTS = new FrozenSet(["fresh", "stale", "undated"]);

// 59/ADR-004 §2 — THE THRESHOLD HAS ONE HOME. A counter that reads the same number every cycle is
// either a very stable system or a metric nobody computes any more, and the two are indistinguishable
// from the number alone. The judgment is therefore deliberately weak and deliberately loud, and N is
// declared HERE — once — so it can be argued about in one place instead of being a digit buried in a
// check. The value is the story's own sentence ("a watcher whose counter has not changed in twenty
// cycles is not evidence of stability"). It is a COUNT OF CYCLES, never a duration: nothing in this
// module converts it to time, which is what keeps FF-5907's no-duration-literal leg true.
export const UNMOVED_CYCLES = 20;

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareFindings(left, right) {
  return compareCodeUnits(left.path, right.path) ||
    compareCodeUnits(left.code, right.code) ||
    compareCodeUnits(left.message, right.message);
}

function ordered(findings) {
  return findings.sort(compareFindings);
}

function finding(code, path, message) {
  return { code, severity: GATING_CODES.has(code) ? "error" : "warn", path, message };
}

// 58/ADR-003 §6 — MEMBERSHIP IS A PRECONDITION OF FOUR CHECKS, not of arbitration alone. This
// disjunction says which nodes THIS MODULE'S traversals consider; the loader's node-kind vocabulary
// says which kinds a record may declare. They are different claims and they agree by discipline,
// because a pure leaf cannot ask the loader what the vocabulary is — so a kind admitted there and
// missing here is invisible at once to the grounding decomposition, to the anchor lane, to the
// ownership lane as an edge SOURCE, and to arbitration. A node kind filtered out of the traversal
// does not merely fail to report itself: it silently degrades the verdict of every node that
// reached ground through it. `FF-5805` holds `NODE_KINDS` to be a SUBSET of this list, driven over
// the loader's whole vocabulary, so a sixth kind admitted there and missing here fails CI instead of
// being silently invisible four times over. The converse containment is NOT gated — its control is a
// single hand-written kind — and deliberately so: an extra disjunct here is unreachable, because the
// loader nulls any kind outside `NODE_KINDS` before a node can reach this module.
// 59/ADR-001 §5 assigns this line to this story: 59/00 widened `NODE_KINDS` with `auditor`, and a
// kind admitted there and missing here is filtered out of every traversal above — which is exactly
// the degradation 58/ADR-005 §6b measured when the arbiter was invisible. `auditor` is added on the
// same warrant and by the same gate (FF-5805's parity leg, driven over the loader's whole
// vocabulary, so a SEVENTH kind fails CI instead of vanishing four times over).
function isGraphNode(node) {
  return node?.kind === "loop" || node?.kind === "actor" || node?.kind === "anchor"
    || node?.kind === "watcher" || node?.kind === "arbiter" || node?.kind === "auditor";
}

function graph(model) {
  const nodes = (model?.nodes ?? []).filter(isGraphNode);
  const byId = new Map();
  for (const node of nodes) {
    if (typeof node.id === "string" && !byId.has(node.id)) byId.set(node.id, node);
  }

  const ids = [...byId.keys()].sort(compareCodeUnits);
  const adjacency = new Map(ids.map((id) => [id, new Set()]));
  for (const id of ids) {
    const node = byId.get(id);
    for (const edgeKey of EDGE_KEYS) {
      for (const endpoint of node.edges?.[edgeKey] ?? []) {
        if (byId.has(endpoint?.raw)) adjacency.get(id).add(endpoint.raw);
      }
    }
  }

  return { ids, byId, adjacency };
}

export function decomposeLoopGraph(model) {
  const { ids, adjacency } = graph(model);
  const indices = new Map();
  const lowlinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  let nextIndex = 0;

  function visit(id) {
    indices.set(id, nextIndex);
    lowlinks.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);

    const neighbours = [...adjacency.get(id)].sort(compareCodeUnits);
    for (const neighbour of neighbours) {
      if (!indices.has(neighbour)) {
        visit(neighbour);
        lowlinks.set(id, Math.min(lowlinks.get(id), lowlinks.get(neighbour)));
      } else if (onStack.has(neighbour)) {
        lowlinks.set(id, Math.min(lowlinks.get(id), indices.get(neighbour)));
      }
    }

    if (lowlinks.get(id) !== indices.get(id)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== id);
    component.sort(compareCodeUnits);
    components.push(component);
  }

  for (const id of ids) {
    if (!indices.has(id)) visit(id);
  }

  return components.sort((left, right) => compareCodeUnits(left[0], right[0]));
}

function authorityResolved(resolutions, id, raw, declaredResolution) {
  if (raw == null) return true;
  const value = resolutions instanceof Map
    ? resolutions.get(id) ?? resolutions.get(raw)
    : resolutions?.[id] ?? resolutions?.[raw];
  if (value == null) return declaredResolution !== false;
  return typeof value === "object" ? value.resolved !== false : value !== false;
}

function analyseGrounding(model, resolutions = {}, unrefreshedAnchors = null) {
  const { byId, adjacency } = graph(model);
  const facts = new Map([...byId.keys()].map((id) => [
    id,
    { classes: new Set(), stale: new Set(), unrefreshed: new Set(), refreshed: false },
  ]));

  for (const [id, node] of byId) {
    const ground = node.fields?.ground;
    if (ground?.kind !== "enum" || (node.kind !== "actor" && node.kind !== "anchor")) continue;
    const pointer = node.kind === "anchor" ? node.fields?.observes?.raw : null;
    const stale = pointer != null && !authorityResolved(resolutions, id, pointer, node.fields?.observes?.resolved) ? pointer : null;
    // 59/ADR-005 §2 — A STALE ANCHOR DEGRADES A VERDICT; IT DOES NOT DELETE ONE. Which seed a node
    // reached ground through is recorded per node, so the component can distinguish *grounded only
    // through anchors nobody refreshed* from *grounded*. A seed that is not an unrefreshed anchor
    // marks the node REFRESHED, which is what stops a fresh sibling's ground being wiped out by a
    // stale one. `unrefreshedAnchors` is null unless a window was handed in, so this whole axis is
    // inert on the two-argument call and 55's verdicts are byte-identical.
    const unrefreshed = unrefreshedAnchors?.has(id) === true;
    const pending = [id];
    const reached = new Set();
    while (pending.length > 0) {
      const current = pending.pop();
      if (reached.has(current)) continue;
      reached.add(current);
      const fact = facts.get(current);
      fact.classes.add(ground.value);
      if (stale != null) fact.stale.add(stale);
      if (unrefreshed) fact.unrefreshed.add(id);
      else fact.refreshed = true;
      for (const endpoint of adjacency.get(current)) pending.push(endpoint);
    }
  }

  const components = decomposeLoopGraph(model).map((members) => {
    const groundClasses = new Set();
    const staleAuthorities = new Set();
    const unrefreshedGround = new Set();
    let refreshed = false;
    for (const id of members) {
      for (const value of facts.get(id)?.classes ?? []) groundClasses.add(value);
      for (const value of facts.get(id)?.stale ?? []) staleAuthorities.add(value);
      for (const value of facts.get(id)?.unrefreshed ?? []) unrefreshedGround.add(value);
      if (facts.get(id)?.refreshed === true) refreshed = true;
    }
    const classes = [...groundClasses].sort(compareCodeUnits);
    const stale = [...staleAuthorities].sort(compareCodeUnits);
    // 55's CLASSIFICATION, computed from the ground classes and the authority resolutions alone.
    // Freshness may not reach this expression: it is what the two-argument call reports, and it is
    // what `buildGroundednessReport` emits its findings from on BOTH calls.
    const groundVerdict = classes.length === 0
      ? "self-referential"
      : stale.length > 0
        ? "stale"
        : classes.every((value) => value === "exogenous")
          ? "exogenous-only"
          : "anchored";
    // ONLY through unrefreshed anchors. One fresh anchor edge is enough to keep the component
    // grounded, and the stale sibling is still reported at its own record — the two are separate
    // facts about separate records and they do not cancel (ADR-005 §2).
    const groundOnlyUnrefreshed = classes.length > 0 && unrefreshedGround.size > 0 && !refreshed;
    const unrefreshedNames = groundOnlyUnrefreshed ? [...unrefreshedGround].sort(compareCodeUnits) : [];
    // A STALE ANCHOR DEGRADES A VERDICT; IT DOES NOT DELETE ONE (ADR-005 §2, and STORY.md §Notes
    // verbatim). The degradation therefore sits BESIDE the classification rather than replacing it:
    // `verdict` degrades to `stale`, `groundVerdict` still says what the ground was, and the finding
    // the classification earns is emitted either way. Folding the two into one ternary made a
    // handed-in window DELETE a `loop-graph-grounded-exogenous-only` warning — the audit and
    // `aof work loops groundedness` then disagreed about one registry, which is precisely the
    // substitution "degrades rather than disappears" exists to forbid.
    const verdict = groundOnlyUnrefreshed ? "stale" : groundVerdict;
    const component = { members, verdict, groundClasses: classes, staleAuthorities: stale };
    // These two keys exist only where a window was handed in. An empty `unrefreshedGround: []` on a
    // report that never asked the question would read as "no anchor is stale", which is the
    // substitution ADR-004 §1 exists to forbid.
    if (unrefreshedAnchors != null) {
      component.groundVerdict = groundVerdict;
      component.unrefreshedGround = unrefreshedNames;
    }
    return component;
  });

  const anchoredLoops = new Set();
  for (const node of byId.values()) {
    if (node.kind !== "anchor") continue;
    for (const endpoint of node.edges?.["data-feed"] ?? []) {
      if (byId.get(endpoint.raw)?.kind === "loop") anchoredLoops.add(endpoint.raw);
    }
  }
  const unanchoredLoops = [...byId.values()]
    .filter((node) => node.kind === "loop" && !anchoredLoops.has(node.id))
    .map((node) => node.id)
    .sort(compareCodeUnits);

  return { byId, components, unanchoredLoops };
}

/**
 * 59/ADR-005 §1/§2 — the report gains a THIRD argument and nothing else moves. `freshness` is
 * `{ now, window }`, both numbers on the same clock, both handed IN: the module reads no clock and
 * converts no unit, so days-to-window is the impure command edge's arithmetic and not this leaf's
 * (ADR-005 §4, FF-5907). Called with two arguments — which is what `work:loops groundedness` and
 * `work:loops validate` do — the result is byte-identical to 55's, because a report that was never
 * given a window has nothing to say about freshness and saying `[]` would read as "nothing is stale".
 */
export function buildGroundednessReport(model, resolutions = {}, freshness = null) {
  const anchorFreshness = freshness == null ? null : assessAnchorFreshness(model, freshness);
  const unrefreshedAnchors = anchorFreshness == null
    ? null
    : new Set(anchorFreshness.anchors.filter((entry) => entry.verdict === "stale").map((entry) => entry.id));
  const { byId, components, unanchoredLoops } = analyseGrounding(model, resolutions, unrefreshedAnchors);
  const findings = anchorFreshness == null ? [] : [...anchorFreshness.findings];
  for (const component of components) {
    const members = component.members.join(", ");
    if (component.unrefreshedGround?.length > 0) {
      // A DEGRADED VERDICT, NOT A DELETED ONE. The edge is declared and the authority resolves; what
      // has lapsed is the reading. So this is its own code beside the component verdict, and the
      // loop is emphatically NOT `unanchored` — that lane is computed from the declared edge below
      // and never consults freshness.
      findings.push(auditFinding(
        "loop-ground-stale",
        model.source,
        `Component [${members}] is grounded only through anchors nobody refreshed: ${component.unrefreshedGround.join(", ")}`,
      ));
    }
    // EMITTED FROM THE CLASSIFICATION, NEVER FROM THE DEGRADED VERDICT. This is the line that keeps
    // a three-argument call a strict SUPERSET of the two-argument one: every finding `work:loops
    // groundedness` reports over a registry is still reported when the audit hands in a window.
    const classified = component.groundVerdict ?? component.verdict;
    if (classified === "anchored") continue;
    if (classified === "stale") {
      findings.push(finding(
        "loop-anchor-stale",
        model.source,
        `Component [${members}] is stale because ${component.staleAuthorities.join(", ")} no longer resolves`,
      ));
      continue;
    }
    if (classified === "exogenous-only") {
      findings.push(finding(
        "loop-graph-grounded-exogenous-only",
        model.source,
        `Component [${members}] is grounded by exogenous ground only`,
      ));
      continue;
    }
    findings.push(finding(
      "loop-graph-ungrounded-component",
      model.source,
      `Component [${members}] has no path from exogenous ground`,
    ));
  }
  for (const id of unanchoredLoops) {
    findings.push(finding(
      "loop-anchor-absent",
      byId.get(id).path,
      `${id} has no inbound data-feed edge from an anchor`,
    ));
  }
  const report = { components, unanchoredLoops, findings: ordered(findings) };
  if (anchorFreshness != null) {
    report.anchors = anchorFreshness.anchors;
    report.read = anchorFreshness.read;
  }
  return report;
}

export function checkGrounding(model, resolutions = {}) {
  return buildGroundednessReport(model, resolutions).findings.filter((item) =>
    item.code === "loop-graph-grounded-exogenous-only" || item.code === "loop-graph-ungrounded-component");
}

export function checkAnchorGrounding(model, resolutions = {}) {
  return buildGroundednessReport(model, resolutions).findings.filter((item) =>
    item.code === "loop-anchor-absent" || item.code === "loop-anchor-stale");
}

function validNodes(model) {
  return (model?.nodes ?? []).filter(isGraphNode);
}

function endpoints(node, edgeKey) {
  return node.edges?.[edgeKey] ?? [];
}

function declaredIds(nodes) {
  return new Set(nodes.map((node) => node.id));
}

function rawValues(entries) {
  const values = new Set();
  for (const entry of entries ?? []) {
    if (typeof entry?.raw === "string") values.add(entry.raw);
  }
  return values;
}

function intersection(left, right) {
  return [...left].filter((value) => right.has(value)).sort(compareCodeUnits);
}

function normalizedPhrase(field) {
  return typeof field?.raw === "string"
    ? field.raw.trim().replace(/\s+/gu, " ").toLowerCase()
    : null;
}

export function checkPairing(model) {
  const nodes = validNodes(model);
  const ids = declaredIds(nodes);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const paired = new Set();
  const selfReferential = new Set();
  const findings = [];

  for (const source of nodes) {
    if (source.kind === "watcher") {
      const determinism = source.fields?.determinism?.value;
      if (determinism === "judge") {
        findings.push(
          finding(
            "loop-watcher-is-judge",
            source.path,
            `${source.id} uses a model judge`,
          ),
        );
      }
      if (determinism === "counter") {
        const rejected = new Set();
        for (const authority of source.fields?.measurement ?? []) {
          const scheme = authority?.pointer?.scheme;
          if (authority?.kind === "pointer" && (scheme === "module" || scheme === "command")) continue;
          if (typeof authority?.raw === "string") rejected.add(authority.raw);
        }
        for (const authority of [...rejected].sort(compareCodeUnits)) {
          findings.push(
            finding(
              "loop-counter-not-deterministic",
              source.path,
              `${source.id} declares deterministic counting but cites ${authority}`,
            ),
          );
        }
      }
    }

    for (const endpoint of endpoints(source, "monitoring")) {
      if (!ids.has(endpoint?.raw)) continue;
      if (endpoint.raw === source.id) selfReferential.add(source.id);
      else paired.add(endpoint.raw);

      const watched = byId.get(endpoint.raw);
      if (source.kind !== "watcher" || watched?.kind !== "loop" || endpoint.raw === source.id) continue;

      const sharedMeasurements = intersection(
        rawValues(source.fields?.measurement),
        rawValues(watched.fields?.measurement),
      );
      if (sharedMeasurements.length > 0) {
        findings.push(
          finding(
            "loop-watcher-shares-measurement",
            source.path,
            `${source.id} shares measurement ${sharedMeasurements.join(", ")} with ${watched.id}`,
          ),
        );
      }

      if (source.fields?.determinism?.value === "judge") {
        const proseAuthorities = rawValues(
          (source.fields?.measurement ?? []).filter((entry) => entry?.kind === "prose"),
        );
        const sharedActuators = intersection(proseAuthorities, rawValues(watched.fields?.actuator));
        if (sharedActuators.length > 0) {
          findings.push(
            finding(
              "loop-watcher-shares-actuator",
              source.path,
              `${source.id} judges ${watched.id} through shared actuator ${sharedActuators.join(", ")}`,
            ),
          );
        }
      }

      const counter = normalizedPhrase(source.fields?.counter);
      const controlled = normalizedPhrase(watched.fields?.controlled);
      if (counter !== null && controlled !== null && counter === controlled) {
        findings.push(
          finding(
            "loop-counter-equals-controlled",
            source.path,
            `${source.id} counter equals ${watched.id} controlled value after normalization`,
          ),
        );
      }
    }
  }

  for (const node of nodes) {
    if (selfReferential.has(node.id)) {
      findings.push(
        finding(
          "loop-self-referential-edge",
          node.path,
          `${node.id} declares a self-referential monitoring edge`,
        ),
      );
    }
    if (node.kind === "loop" && node.fields?.optimizing?.value === true && !paired.has(node.id)) {
      findings.push(
        finding(
          "loop-unpaired-optimizer",
          node.path,
          `${node.id} is optimizing without inbound monitoring from another node`,
        ),
      );
    }
  }
  return ordered(findings);
}

// 58/ADR-001 §1 — THE THREE ADMISSIBLE SOURCES OF A REFERENCE, and they are the three the
// hierarchy is made of: a slower LOOP whose output is the inner loop's setpoint, an ACTOR who owns
// what is worth controlling at all, and an ANCHOR on a rule no cycle is permitted to revise. The
// anchor branch is narrowed to that one ground on purpose — it is what stops "declare an anchor for
// any loop whose owner you cannot find" becoming the loophole, because only a frozen rule is an
// authority rather than an observation. Two exclusions are load-bearing rather than bookkeeping: a
// WATCHER that sets a target acts on what it watches, and an ARBITER that sets a target has stopped
// arbitrating and become a supervisor.
const ADMISSIBLE_ANCHOR_GROUND = "frozen-rule";

function setsReferenceAdmissibly(node) {
  if (node.kind === "loop" || node.kind === "actor") return true;
  return node.kind === "anchor" && node.fields?.ground?.value === ADMISSIBLE_ANCHOR_GROUND;
}

function inadmissibleSourceDescription(node) {
  if (node.kind !== "anchor") return `a ${node.kind}`;
  return `an anchor grounded on ${node.fields?.ground?.value ?? "nothing"}`;
}

/**
 * 58/ADR-002 §1a — THE LANE RULE. A per-node claim about what a loop DECLARES is this check's; a
 * per-edge claim about SEPARATION between two loops is the timescale check's. So the two layer
 * census codes are emitted here, per node, which is what reaches a loop with no supervising edge at
 * all — and it costs no seventh check id (ADR-005 §3).
 */
export function checkReferenceOwnership(model) {
  const nodes = validNodes(model);
  const ids = declaredIds(nodes);
  const owned = new Set();
  const selfReferential = new Set();
  const findings = [];

  for (const source of nodes) {
    const admissible = setsReferenceAdmissibly(source);
    for (const endpoint of endpoints(source, "target-setting")) {
      if (typeof endpoint?.raw !== "string") continue;
      if (!admissible) {
        // REFUSING A SOURCE IS NOT A SUBSTITUTE FOR FINDING AN OWNER (ADR-001 §1). An
        // inadmissible edge confers nothing, so the endpoint is deliberately NOT added to
        // `owned` and the loop it points at is still reported unowned. The two findings are
        // separate facts about separate records and they do not cancel.
        findings.push(
          finding(
            "loop-target-setting-not-admitted",
            source.path,
            `${source.id} is ${inadmissibleSourceDescription(source)} and may not set the reference of ${endpoint.raw}`,
          ),
        );
        continue;
      }
      if (!ids.has(endpoint.raw)) continue;
      if (endpoint.raw === source.id) selfReferential.add(source.id);
      else owned.add(endpoint.raw);
    }
  }

  for (const node of nodes) {
    if (selfReferential.has(node.id)) {
      findings.push(
        finding(
          "loop-self-referential-edge",
          node.path,
          `${node.id} declares a self-referential target-setting edge`,
        ),
      );
    }
    if (node.kind !== "loop") continue;
    if (!owned.has(node.id)) {
      findings.push(
        finding(
          "loop-unowned-reference",
          node.path,
          `${node.id} has no inbound target-setting edge from another node`,
        ),
      );
    }
    // ADR-002 §1/§3 — the layer is an OPTIONAL KEY and a COMPUTED REQUIREMENT, which is 55/ADR-002
    // §2's ruling applied verbatim: requiring the key would redden every record the instant the
    // schema landed. Where the cadence carries a scope ordinal the declaration is CROSS-CHECKED
    // against it, so a loop cannot declare itself slow to dodge an inversion. Where the cadence is
    // a clock there is no scope ordinal at all — a clock says nothing about scope — and the
    // declaration stands on its record's own narrative rather than being refused.
    const rank = node.fields?.layer?.rank;
    if (typeof rank !== "number") {
      findings.push(finding("loop-layer-undeclared", node.path, `${node.id} declares no layer`));
      continue;
    }
    const scopeRank = node.fields?.cadence?.scopeRank;
    if (typeof scopeRank === "number" && scopeRank !== rank) {
      findings.push(
        finding(
          "loop-layer-contradicts-cadence",
          node.path,
          `${node.id} declares layer ${node.fields.layer.raw} at rank ${rank} against a cadence whose scope rank is ${scopeRank}`,
        ),
      );
    }
  }
  return ordered(findings);
}

function vetoedIds(node) {
  const vetoes = new Set();
  for (const endpoint of endpoints(node, "veto")) {
    if (typeof endpoint?.raw === "string") vetoes.add(endpoint.raw);
  }
  return vetoes;
}

/**
 * 58/ADR-003 §5 — the recorded ORDER is bound to the VETO SET so the two cannot drift apart: a
 * priority list must be a permutation of the arbiter's own veto endpoints, with no omission, no
 * extra and no repeat. The order WITHIN it is the policy, so any order over the right set is
 * admitted. An arbiter that declares neither key is left to the loader, which already requires
 * both of them, rather than being reported twice for one absence.
 */
function priorityDefect(node) {
  const vetoes = vetoedIds(node);
  const priority = (node.fields?.priority ?? [])
    .map((entry) => entry?.raw)
    .filter((raw) => typeof raw === "string");
  if (vetoes.size === 0 && priority.length === 0) return null;
  const repeated = [...new Set(priority.filter((raw, index) => priority.indexOf(raw) !== index))].sort(compareCodeUnits);
  const omitted = [...vetoes].filter((raw) => !priority.includes(raw)).sort(compareCodeUnits);
  const extra = [...new Set(priority.filter((raw) => !vetoes.has(raw)))].sort(compareCodeUnits);
  if (repeated.length === 0 && omitted.length === 0 && extra.length === 0) return null;
  const parts = [];
  if (omitted.length > 0) parts.push(`omits [${omitted.join(", ")}]`);
  if (extra.length > 0) parts.push(`names [${extra.join(", ")}] it does not veto`);
  if (repeated.length > 0) parts.push(`repeats [${repeated.join(", ")}]`);
  return parts.join(", ");
}

export function checkActuatorArbitration(model) {
  const nodes = validNodes(model);
  const actuatorUsers = new Map();

  for (const node of nodes) {
    if (node.kind !== "loop") continue;
    const uniqueActuators = new Set((node.fields?.actuator ?? []).map((entry) => entry?.raw));
    uniqueActuators.delete(undefined);
    for (const actuator of uniqueActuators) {
      if (!actuatorUsers.has(actuator)) actuatorUsers.set(actuator, new Set());
      actuatorUsers.get(actuator).add(node.id);
    }
  }

  const findings = [];
  for (const [actuator, userSet] of actuatorUsers) {
    if (userSet.size < 2) continue;
    const contenders = [...userSet].sort(compareCodeUnits);
    // 58/ADR-003 §9 — ENTITLEMENT IS A PROPERTY OF THE KIND, and coverage never substitutes for
    // it. Before this, any non-contending node of any kind that happened to veto every contender
    // cleared the finding — so a bare list of loop ids, on a record saying nothing about the
    // trade-off, answered it. Only an arbiter clears it now, because the arbiter is the kind that
    // must RECORD the trade-off to exist at all. The two standing exclusions are untouched: a
    // party to the conflict never clears it, and a veto over some but not all clears nothing.
    const covering = nodes.filter((node) => !userSet.has(node.id) && contenders.every((id) => vetoedIds(node).has(id)));
    if (covering.some((node) => node.kind === "arbiter")) continue;
    const pretender = covering[0];
    findings.push(
      finding(
        "loop-shared-actuator-unarbitrated",
        model.source,
        pretender == null
          ? `Actuator ${actuator} is shared by [${contenders.join(", ")}] without a non-member arbiter`
          : `Actuator ${actuator} is shared by [${contenders.join(", ")}] without a non-member arbiter; ${pretender.id} vetoes every contender but is a ${pretender.kind}`,
      ),
    );
  }

  // A DEFECTIVE ORDER DOES NOT UN-CLEAR THE ACTUATOR (ADR-003 §5). The two codes are independent
  // facts about separate records and BOTH gate, so coupling them would buy nothing and would cost
  // a second finding for one slip, anchored at the registry and naming an actuator that is not the
  // defect. This one is reported at the arbiter's own record, which is where the defect is.
  for (const node of nodes) {
    if (node.kind !== "arbiter") continue;
    const defect = priorityDefect(node);
    if (defect == null) continue;
    findings.push(
      finding(
        "loop-arbiter-priority-incomplete",
        node.path,
        `${node.id} declares a priority that ${defect}`,
      ),
    );
  }
  return ordered(findings);
}

function cadenceDescription(node) {
  const cadence = node.fields?.cadence;
  if (typeof cadence?.raw === "string") return cadence.raw;
  if (cadence?.kind === "periodic") return `periodic (${cadence.ms} ms)`;
  if (cadence?.kind === "event") return `event (${cadence.trigger})`;
  return cadence?.kind ?? "missing cadence";
}

/**
 * 58/ADR-002 §4/§5 — TWO AXES, DECIDED IN ORDER, AND NEITHER DERIVED FROM THE OTHER.
 *
 * Where both ends carry a declared layer the ORDINAL axis decides: exactly one boundary per
 * supervising edge, so a step of one is the supervision relation, a step of zero or upward is an
 * inversion — the SPEC's own sentence, that an outer loop which is not slower does not supervise
 * its inner loop but fights it — and a step of two or more is a legible, sometimes-right, never
 * silent skip. Where both ends carry a clock the RATIO rule decides exactly as it did before, and
 * an edge inverted on both axes yields two findings because it is two independent slips rather
 * than one slip reported twice. Where NEITHER axis can answer, the pair is reported as not
 * comparable and nothing is invented: no duration is derived from an event trigger to manufacture
 * a ratio, which is the fabricated conversion 52/ADR-006 §5 refuses.
 *
 * Every finding here is anchored to a target-setting EDGE. This check emits no per-node finding at
 * all — the per-node census belongs to checkReferenceOwnership (§1a) — which is what keeps 52's
 * frozen cadence cross-product byte-identical over a registry that declares no layer.
 */
export function checkTimescale(model) {
  const loops = validNodes(model).filter((node) => node.kind === "loop");
  const byId = new Map(loops.map((node) => [node.id, node]));
  const findings = [];

  for (const source of loops) {
    for (const endpoint of endpoints(source, "target-setting")) {
      const target = byId.get(endpoint?.raw);
      if (!target || target.id === source.id) continue;
      const sourceCadence = source.fields?.cadence;
      const targetCadence = target.fields?.cadence;
      const sourceLayer = source.fields?.layer;
      const targetLayer = target.fields?.layer;
      const bothPeriodic = sourceCadence?.kind === "periodic" && targetCadence?.kind === "periodic";
      // EXACTLY ONE END IS NOT ENOUGH (§5): there is no crossing to measure against a rank that
      // was never declared, and reporting one would mean inventing the missing rank. The
      // undeclared end is reported once, on its own record, by the per-node census.
      const bothLayered = typeof sourceLayer?.rank === "number" && typeof targetLayer?.rank === "number";

      if (bothLayered) {
        const separation = sourceLayer.rank - targetLayer.rank;
        if (separation <= 0) {
          findings.push(
            finding(
              "loop-layer-inversion",
              source.path,
              `${source.id} (layer ${sourceLayer.raw}) target-sets ${target.id} (layer ${targetLayer.raw}) from no slower layer`,
            ),
          );
        } else if (separation > 1) {
          findings.push(
            finding(
              "loop-layer-skipped",
              source.path,
              `${source.id} (layer ${sourceLayer.raw}) target-sets ${target.id} (layer ${targetLayer.raw}) across ${separation} layer boundaries`,
            ),
          );
        }
      }

      if (bothPeriodic) {
        const ratio = sourceCadence.ms / targetCadence.ms;
        if (ratio < MIN_SEPARATION_RATIO) {
          findings.push(
            finding(
              "loop-timescale-inversion",
              source.path,
              `${source.id} (${cadenceDescription(source)}) target-sets ${target.id} (${cadenceDescription(target)}) at directed period ratio ${ratio}`,
            ),
          );
        }
        continue;
      }
      // The layer axis already decided this edge, so there is nothing the clocks are needed for.
      if (bothLayered) continue;

      const nonClock = [];
      if (sourceCadence?.kind !== "periodic") {
        nonClock.push(`${source.id} (${cadenceDescription(source)})`);
      }
      if (targetCadence?.kind !== "periodic") {
        nonClock.push(`${target.id} (${cadenceDescription(target)})`);
      }
      findings.push(
        finding(
          "loop-timescale-not-comparable",
          source.path,
          `${source.id} target-sets ${target.id}; non-clock cadence: ${nonClock.join(", ")}`,
        ),
      );
    }
  }
  return ordered(findings);
}

// =================================================================================================
// THE AUDIT LANES — 59/ADR-004, 59/ADR-005. FF-5907, FF-5908.
//
// Four judgments the existing checks could not make, in the module that already holds them, and
// under the constraint that made this the story most likely to break the leaf: `work-loops-checks`
// imports NOTHING (52/ADR-007 §4, 55/FF-5503, 58/FF-5804). So every clock reading and every window
// arrives as an ARGUMENT, the module holds no date literal and no duration literal, and converting
// `work.audit.anchorStaleDays` into a window on this clock is the impure command edge's arithmetic
// (ADR-005 §2/§4) — not this leaf's.
//
// These lanes are NOT `work:loops validate` checks. `CHECK_IDS` stays SIX and `CHECK_FINDING_CODES`
// stays at its twenty-one, deliberately: 58/ADR-005 §3 refused a seventh check id because
// `COMPOSED_CHECK_IDS` in `src/work/doctor-loop-ready.mjs` is a second copy of that list kept in step
// by nothing, and 59/ADR-007 §1 refuses to put the audit on the frozen cost ladder at all. The audit
// is a separate command over the same parsed model (59/04), so these codes live in their own frozen
// set, disjoint from the check lane's.
//
// ── EVERY LANE SAYS WHAT IT READ (ADR-004 §1) ──
//
// A lane that found nothing and a lane that LOOKED AT NOTHING are indistinguishable in a finding
// list, and the second is the failure this milestone exists to catch. So a clean result is not
// representable here either: every lane returns a `read` record carrying its population and its
// floor, every lane's floor is declared once in `AUDIT_LANES`, and a lane below its floor emits
// `audit-ran-on-nothing` naming the sweep, the root it walked, what it got and the floor it missed.
//
// THE RULE HAS ONE HOME AND TWO MECHANICAL COPIES, BOUND BY A GATE. `src/work-audit/census.mjs`
// already ships `readRecord`/`readFinding` in exactly this shape; this leaf may not import them,
// because importing anything is the one thing the purity invariant forbids. So FF-5908 asserts the
// two emitters produce a byte-identical finding for the same read record, which is the same move
// 58/FF-5807 made for the two copies of `CHECK_IDS` that a module boundary forced apart: where a
// boundary makes one home impossible, the gate is what keeps the copies from drifting.
// =================================================================================================

export const AUDIT_LANE_FINDING_CODES = new FrozenSet([
  "anchor-stale",
  "loop-ground-stale",
  "instrument-silent",
  "metric-unmoved",
  "loop-unconsulted",
  "audit-ran-on-nothing",
]);

// SEVERITY IS A PROPERTY OF THE CODE, IN A TABLE — 57/ADR-003's rule, applied to the second lane.
// No construction site in this module spells a severity, which is what makes "the audit reports and
// never enforces" checkable rather than promised. Five of the six are `warn` on purpose: a stale
// anchor DEGRADES a verdict (ADR-005 §2), an unmoved metric is "something to look at, not a fault"
// (ADR-004 §2), and a prune candidate is a finding with a name on it that the audit may not act on
// (ADR-004 §4). The one error is the sweep that ran on nothing, because a lane that looked at
// nothing reporting clean is the failure the whole milestone is about.
const AUDIT_LANE_SEVERITY = Object.freeze({
  "anchor-stale": "warn",
  "loop-ground-stale": "warn",
  "instrument-silent": "warn",
  "metric-unmoved": "warn",
  "loop-unconsulted": "warn",
  "audit-ran-on-nothing": "error",
});

// THE LANE REGISTRY. One entry per lane, each declaring what it reads, the floor below which its
// result means nothing, and the BASIS that states the limit of its own claim. A lane added here
// without a floor, or an `assess*` export with no entry here, fails FF-5908 rather than passing
// silently over nothing.
//
// THE SHAPE IS `EVIDENCE_SWEEP`'s, DELIBERATELY — `{id, what, floor, basis}` with the ROOT supplied
// per call, because these lanes walk whichever registry they are handed rather than a fixed
// directory (`src/work-audit/evidence.mjs`). The `basis` values are the census's own three, not a
// private vocabulary: a lane over the parsed registry makes a DISK-level claim (it says what the
// declarations say, not what any runner does with them), and a lane over readings somebody else
// obtained makes a RUNTIME one. Sharing the vocabulary is what lets ONE validator decide whether a
// lane is declared at all, which is the whole of ADR-004 §1.
export const AUDIT_LANES = Object.freeze([
  Object.freeze({
    id: "anchor-freshness",
    what: "every kind: anchor node in the parsed registry, read against the window handed in",
    basis: "disk",
    floor: 1,
  }),
  Object.freeze({
    id: "instrument-silence",
    what: "every declared instrument handed in, judged against its OWN cadence — one rule, not one per channel; it says what the readings say, never what the instrument's code does",
    basis: "runtime",
    floor: 1,
  }),
  Object.freeze({
    id: "metric-movement",
    what: "every counter handed in with its recorded readings, judged against the declared number of cycles; it says what the readings say, never whether the counter is still being computed",
    basis: "runtime",
    floor: 1,
  }),
  Object.freeze({
    id: "loop-consultation",
    what: "every kind: loop node in the parsed registry, read against its inbound edges and whichever executions the caller could observe",
    basis: "disk",
    floor: 1,
  }),
]);

const AUDIT_LANE_BY_ID = new Map(AUDIT_LANES.map((lane) => [lane.id, lane]));

function laneNamed(id) {
  const lane = AUDIT_LANE_BY_ID.get(id);
  // REFUSED, NEVER DEFAULTED. A lane with no registry entry has no floor, and a floor invented at
  // the call site is the shape ADR-004 §1 exists to forbid.
  if (lane == null) throw new TypeError(`work-loops-checks: no audit lane is declared for "${id}"`);
  return lane;
}

function auditFinding(code, path, message) {
  return { code, severity: AUDIT_LANE_SEVERITY[code], path, message };
}

/** The read record. Complete by construction: there is no partial form and no default count. */
function readRecord(lane, root, count) {
  return Object.freeze({ sweep: lane.id, root, what: lane.what, basis: lane.basis, count, floor: lane.floor });
}

/**
 * Below-floor is deliberately not the same as zero — a population that shrank by ninety per cent is
 * the same failure a step earlier. The text is byte-identical to `readFinding` in
 * `src/work-audit/census.mjs`, and FF-5908 is what holds the two copies together.
 */
function readFinding(read) {
  if (read.count >= read.floor) return null;
  return auditFinding(
    "audit-ran-on-nothing",
    read.root,
    `the "${read.sweep}" sweep read ${read.count} of a required ${read.floor} while walking ${read.root} — it ran on nothing, or on so little that a clean result would mean nothing. ${read.what}`,
  );
}

/** A lane result: findings first (ran-on-nothing included), then the read that produced them. */
function laneResult(lane, root, count, findings) {
  const read = readRecord(lane, root, count);
  const emitted = [...findings];
  const ranOnNothing = readFinding(read);
  if (ranOnNothing != null) emitted.push(ranOnNothing);
  return { findings: ordered(emitted), read };
}

function requiredNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`work-loops-checks: ${label} must be a finite number handed in on the call`);
  }
  return value;
}

function requiredRoot(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("work-loops-checks: an audit lane must be told the root it is reading");
  }
  return value;
}

// A ratio of an elapsed span to the window it is measured against, and NEVER a duration rendered in
// units. Two numbers handed in on the same clock divide to a unit-free multiple, which is how a
// finding can say "how long it has been quiet" while this module stays free of the ms/s/m/h/d table
// the loader keeps (FF-5907's no-duration-literal leg).
const RATIO_DIGITS = 2;
const asMultiple = (elapsed, window) => (elapsed / window).toFixed(RATIO_DIGITS);

/**
 * 59/ADR-005 §1/§2 — AN ANCHOR NOBODY REFRESHED STOPS BEING GROUND WITHOUT STOPPING BEING AN ANCHOR.
 *
 * Three answers, and the third is load-bearing. An anchor past its window is `stale`; an anchor that
 * has never declared a `checked:` date is `undated`, which is where every anchor shipped before this
 * milestone sits and is emphatically NOT stale; an anchor inside its window is `fresh`. The boundary
 * is inclusive — checked exactly as long ago as the window allows is still fresh — because a window
 * that expires the instant it is reached would make "90 days" mean "89".
 *
 * `freshness` is `{ now, window }`, both on the same clock and both handed in. No clock is read, no
 * unit is converted and no date is parsed: the loader already put the epoch on the parsed field
 * (`fields.checked.ms`), exactly as `ms` rides on a periodic cadence.
 */
export function assessAnchorFreshness(model, freshness) {
  const lane = laneNamed("anchor-freshness");
  const now = requiredNumber(freshness?.now, "freshness.now");
  const window = requiredNumber(freshness?.window, "freshness.window");
  const root = requiredRoot(model?.source);

  const anchors = [];
  const findings = [];
  for (const node of validNodes(model).filter((entry) => entry.kind === "anchor")) {
    const checked = node.fields?.checked;
    const at = typeof checked?.ms === "number" ? checked.ms : null;
    const elapsed = at == null ? null : now - at;
    const verdict = at == null ? "undated" : elapsed > window ? "stale" : "fresh";
    anchors.push({
      id: node.id,
      path: node.path,
      checked: typeof checked?.raw === "string" ? checked.raw : null,
      verdict,
      window,
      elapsed,
    });
    if (verdict !== "stale") continue;
    findings.push(auditFinding(
      "anchor-stale",
      node.path,
      `${node.id} was last checked ${checked.raw}, ${asMultiple(elapsed, window)} windows ago — it resolves, and it is no longer a reading about today`,
    ));
  }
  anchors.sort((left, right) => compareCodeUnits(left.id, right.id));
  return { anchors, ...laneResult(lane, root, anchors.length, findings) };
}

/**
 * 59/ADR-004 §2 — AN INSTRUMENT THAT HAS SAID NOTHING INSIDE ITS OWN CADENCE.
 *
 * ONE RULE, NOT ONE PER CHANNEL. A feedback channel, a watcher's counter and a loop's own
 * measurement are covered by the same sentence because the rule is keyed on `cadence:` — a field
 * every record in this registry already carries — so a channel added later needs no new check.
 *
 * An instrument whose cadence is `unknown` has NO WINDOW to judge against, and the result says so
 * rather than guessing one on its behalf; that is 52/ADR-002's declared-gap rule, which makes an
 * honest `unknown` a reported state and never a silent pass.
 *
 * AN EVENT CADENCE IS JUDGED BY ITS OWN SCOPE. No duration is derived from a trigger — that is the
 * fabricated conversion 52/ADR-006 §5 refuses — so an `event:` instrument is judged against
 * OCCURRENCES of its trigger since its last reading, and `cadence.ms` is never read on that branch.
 */
export function assessInstrumentSilence(instruments, observation) {
  const lane = laneNamed("instrument-silence");
  const now = requiredNumber(observation?.now, "observation.now");
  const root = requiredRoot(observation?.root);

  const considered = [];
  const findings = [];
  for (const instrument of instruments ?? []) {
    const cadence = instrument?.cadence;
    const declared = typeof cadence?.raw === "string" ? cadence.raw : null;
    // A CADENCE THAT IS ABSENT OR HONESTLY `unknown` IS A DIFFERENT FACT FROM ONE THAT IS PRESENT
    // AND UNUSABLE, and this is the lane whose whole thesis is that two states a reader would merge
    // are different. 52/ADR-002's rule: a declared gap is an honest finding, a malformed value is a
    // defect. Filing a broken `periodic:` as "declares no cadence" would report a bug as an omission
    // and send the reader to the wrong place — so `cadence-malformed` is its own reason.
    const usablePeriodic = cadence?.kind === "periodic" && typeof cadence.ms === "number";
    const usableEvent = cadence?.kind === "event" && typeof cadence.trigger === "string";
    const present = cadence != null && cadence.kind !== "unknown";
    const entry = {
      id: instrument?.id ?? null,
      path: instrument?.path ?? root,
      cadence: declared,
      verdict: "unjudgeable",
      window: null,
      quiet: null,
      reason: usablePeriodic || usableEvent ? null : present ? "cadence-malformed" : "cadence-unknown",
    };

    if (usablePeriodic) {
      const at = typeof instrument?.reading?.at === "number" ? instrument.reading.at : null;
      const elapsed = at == null ? null : now - at;
      entry.window = { kind: "periodic", span: cadence.ms };
      // NO READING AT ALL IS SILENCE, and it is the story's headline case — the watcher whose counter
      // quietly stopped being produced. The boundary is inclusive on the other side: a reading exactly
      // one period old is DUE, not overdue, which is task 00's window rule applied to a cadence.
      entry.verdict = at == null || elapsed > cadence.ms ? "silent" : "heard";
      entry.quiet = elapsed == null ? null : { elapsed, periods: asMultiple(elapsed, cadence.ms) };
    } else if (usableEvent) {
      const occurrences = typeof instrument?.reading?.occurrences === "number"
        ? instrument.reading.occurrences
        : null;
      entry.window = { kind: "event", trigger: cadence.trigger, occurrences: 1 };
      if (occurrences == null) {
        // NOBODY COUNTED IS NOT NOBODY SPOKE (ADR-004 §1) — the same rule `assessLoopConsultation`
        // enforces by REQUIRING its executions. An event instrument with no occurrence count is
        // unjudgeable; reporting silence here would be a verdict about a question never asked.
        entry.reason = "no-occurrence-count";
      } else {
        entry.verdict = occurrences >= entry.window.occurrences ? "silent" : "heard";
        entry.quiet = { occurrences };
      }
    }

    considered.push(entry);
    if (entry.verdict !== "silent") continue;
    const quiet = entry.window.kind === "periodic"
      ? entry.quiet == null
        ? "and has never produced one"
        : `and has produced none for ${entry.quiet.periods} of its own declared periods`
      : `and has produced none across ${entry.quiet.occurrences} occurrence(s) of ${entry.window.trigger}`;
    findings.push(auditFinding(
      "instrument-silent",
      entry.path,
      `${entry.id} declares cadence ${entry.cadence} ${quiet}`,
    ));
  }
  return { instruments: considered, ...laneResult(lane, root, considered.length, findings) };
}

/**
 * 59/ADR-004 §2 — A METRIC THAT HAS NOT MOVED.
 *
 * A counter reading the same number every cycle is either a very stable system or a metric nobody
 * computes any more, and the second is the one this milestone exists to catch. The judgment is
 * deliberately weak and deliberately loud, and the threshold is `UNMOVED_CYCLES` — one declared home,
 * never a literal at a call site.
 *
 * THREE NON-VERDICTS, EACH A DIFFERENT FACT. Fewer readings than the threshold is NOT YET JUDGEABLE
 * (an answer, not a pass); no readings at all is SILENT, which is the silence lane's subject and not
 * this one's, so it is named here and its finding is raised there; and a counter that moved is
 * simply not reported.
 *
 * This lane reads no clock at all — not even a handed-in one. A cycle is a count.
 */
export function assessMetricMovement(counters, observation) {
  const lane = laneNamed("metric-movement");
  const root = requiredRoot(observation?.root);
  const cycles = observation?.cycles ?? UNMOVED_CYCLES;
  requiredNumber(cycles, "observation.cycles");

  const considered = [];
  const findings = [];
  for (const counter of counters ?? []) {
    const readings = Array.isArray(counter?.readings) ? counter.readings : [];
    const entry = {
      id: counter?.id ?? null,
      path: counter?.path ?? root,
      counter: typeof counter?.counter === "string" ? counter.counter : null,
      verdict: "silent",
      cycles,
      value: null,
      held: 0,
      readings: readings.length,
    };

    if (readings.length > 0) {
      const value = readings[readings.length - 1];
      let held = 0;
      for (let index = readings.length - 1; index >= 0 && Object.is(readings[index], value); index -= 1) held += 1;
      entry.value = value;
      entry.held = held;
      entry.verdict = readings.length < cycles ? "not-yet-judgeable" : held >= cycles ? "unmoved" : "moved";
    }

    considered.push(entry);
    if (entry.verdict !== "unmoved") continue;
    findings.push(auditFinding(
      "metric-unmoved",
      entry.path,
      `${entry.id} counts ${entry.counter} and has held ${String(entry.value)} for ${entry.held} of a declared ${cycles} cycles`,
    ));
  }
  return { counters: considered, ...laneResult(lane, root, considered.length, findings) };
}

/**
 * 59/ADR-004 §4 — A LOOP NOBODY CONSULTS IS NAMED, AND IS NEVER REMOVED.
 *
 * A declared loop that nothing feeds, nothing watches, nothing reports to and nothing has ever run
 * is graph weight that looks like coverage. The audit names it and stops there: removing a node is
 * an edit to a governed declaration, and the kind that produces this finding has no vocabulary in
 * which to act (ADR-001 §2). That omission is the point rather than an inconvenience around it — and
 * it is why this function is a pure `(model, observation) => result` that mutates neither.
 *
 * INBOUND IS OVER THE WHOLE EDGE VOCABULARY, self-edges excluded: a loop that only points at itself
 * has no consumer. `executions` is REQUIRED and has no default, because "nobody asked whether it ran"
 * and "it has never run" are the two facts ADR-004 §1 refuses to let a report conflate.
 *
 * Only a `kind: loop` node is offered for pruning. An anchor with no inbound edge is an anchor doing
 * its job — ground flows outward from it — and the unconsulted-loop rule says nothing about one.
 */
export function assessLoopConsultation(model, observation) {
  const lane = laneNamed("loop-consultation");
  const root = requiredRoot(model?.source);
  if (observation?.executions == null) {
    throw new TypeError("work-loops-checks: loop-consultation must be told which loops were observed to run");
  }
  const executed = new Set(observation.executions);

  const nodes = validNodes(model);
  const ids = declaredIds(nodes);
  const inbound = new Map([...ids].map((id) => [id, new Set()]));
  for (const source of nodes) {
    for (const edgeKey of EDGE_KEYS) {
      for (const endpoint of endpoints(source, edgeKey)) {
        if (!ids.has(endpoint?.raw) || endpoint.raw === source.id) continue;
        inbound.get(endpoint.raw).add(source.id);
      }
    }
  }

  const considered = [];
  const findings = [];
  for (const node of nodes) {
    if (node.kind !== "loop") continue;
    const consumers = [...inbound.get(node.id)].sort(compareCodeUnits);
    const ran = executed.has(node.id);
    const entry = {
      id: node.id,
      path: node.path,
      inbound: consumers,
      executed: ran,
      verdict: consumers.length > 0 ? "consulted" : ran ? "executed" : "prune-candidate",
    };
    considered.push(entry);
    if (entry.verdict !== "prune-candidate") continue;
    findings.push(auditFinding(
      "loop-unconsulted",
      node.path,
      `${node.id} is a prune candidate: no declared node names it on any edge, and no execution of it was observed — it is reported, never removed`,
    ));
  }
  return { loops: considered, ...laneResult(lane, root, considered.length, findings) };
}
