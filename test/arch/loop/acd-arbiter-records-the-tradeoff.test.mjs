// milestone 58 / story 02 — FF-5805.
//
// THE ARBITER RECORDS THE TRADE-OFF AND CANNOT ACT, and the membership that makes any of it
// reachable. Four legs, and the fourth is the one the other three sit on: `isGraphNode`
// (`src/work/loops-checks.mjs`) is a hand-written disjunction, not the loader's vocabulary, so a
// kind the registry admits and this list omits is filtered out of EVERY traversal — invisible to
// the grounding decomposition, to the anchor lane, to the ownership lane as an edge source, and to
// arbitration. The parity leg is therefore driven over `NODE_KINDS` rather than over the one kind
// 58 adds, so a SIXTH kind fails here instead of vanishing four times over.
//
// 58/ADR-003 §5/§6/§9, ADR-007 §1a.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NODE_KINDS } from "../../../src/work/loops.mjs";
import {
  checkActuatorArbitration,
  checkAnchorGrounding,
  checkGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkTimescale,
  decomposeLoopGraph,
} from "../../../src/work/loops-checks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCE = path.join(root, "arbiter-fixture-not-on-disk", "loops");
const filePath = (id) => path.join(SOURCE, `${id.replace(/[^A-Za-z0-9]+/gu, "-")}.md`);
// Split rather than sliced: an `indexOf`-sentinel slice is the shape F-47-04-ARCH-2 refuses across
// every fitness function, and this file is one. The cut here is over an ENDPOINT STRING rather than
// over source text, so the ratchet's own hazard does not apply — but the detector reads the idiom,
// not the subject, and an exception argued in a comment is not a mechanism. `scheme:operand` splits
// on the FIRST colon and rejoins the rest, so `command:work:next` keeps `work:next` as its operand.
const endpoint = (raw) => {
  const [scheme, ...rest] = raw.split(":");
  return { raw, scheme, operand: rest.join(":"), resolved: true };
};
const model = (nodes) => ({ source: SOURCE, present: true, findings: [], nodes });

function node(id, kind, { fields = {}, edges = {} } = {}) {
  const built = {};
  for (const [key, list] of Object.entries(edges)) built[key] = list.map(endpoint);
  return { id, kind, title: id, path: filePath(id), fields, edges: built };
}

const loop = (id, actuator, edges) => node(id, "loop", {
  fields: {
    cadence: { key: "cadence", raw: "event:per-item", kind: "event", trigger: "per-item", scopeRank: 1 },
    layer: { key: "layer", raw: "management", kind: "enum", value: "management", rank: 1 },
    optimizing: { key: "optimizing", raw: "false", kind: "flag", value: false },
    actuator: [{ key: "actuator", raw: actuator, kind: "pointer" }],
  },
  edges,
});

/** A node of `kind` that vetoes `targets` and is party to no contest. */
function vetoer(kind, targets, priority = targets) {
  const fields = {};
  if (kind === "arbiter") {
    fields.resolves = { key: "resolves", raw: "whose demand wins", kind: "phrase" };
    fields.dwell = { key: "dwell", raw: "cycles:2", kind: "cycles", cycles: 2 };
    fields.priority = priority.map((raw) => ({ key: "priority", raw, kind: "ref" }));
  }
  if (kind === "anchor") {
    fields.ground = { key: "ground", raw: "process-exit", kind: "enum", value: "process-exit" };
    fields.observes = { key: "observes", raw: "module:src/x.mjs#y", kind: "pointer" };
  }
  if (kind === "actor") fields.ground = { key: "ground", raw: "exogenous", kind: "enum", value: "exogenous" };
  if (kind === "watcher") {
    fields.counter = { key: "counter", raw: "interventions", kind: "phrase" };
    fields.determinism = { key: "determinism", raw: "counter", kind: "enum", value: "counter" };
  }
  return node(`${kind}:judge`, kind, { fields, edges: { veto: targets } });
}

const X = "command:work:run-retry";
const contenders = () => [loop("loop:a", X), loop("loop:b", X)];
const unarbitrated = (findings) => findings.filter((f) => f.code === "loop-shared-actuator-unarbitrated");
const incomplete = (findings) => findings.filter((f) => f.code === "loop-arbiter-priority-incomplete");

export const archTests = [
  {
    name: "arch/58 FF-5805: a shared actuator clears only on a non-contending node whose KIND is arbiter",
    run: () => {
      // ENTITLEMENT IS A PROPERTY OF THE KIND, and coverage never substitutes for it. The whole
      // point of the narrowing: a bare `veto:` list on any record cleared the finding before,
      // recording no priority, no owned knobs and no statement of the conflict.
      for (const kind of NODE_KINDS) {
        if (kind === "loop") continue;
        const covering = model([...contenders(), vetoer(kind, ["loop:a", "loop:b"])]);
        const findings = checkActuatorArbitration(covering);
        assert.equal(
          unarbitrated(findings).length, kind === "arbiter" ? 0 : 1,
          `${kind}: a non-contending node of this kind ${kind === "arbiter" ? "clears" : "does not clear"} the shared actuator`,
        );
        if (kind !== "arbiter") {
          assert.ok(unarbitrated(findings)[0].message.includes("[loop:a, loop:b]"), `${kind}: the finding still names every contender`);
          assert.ok(unarbitrated(findings)[0].message.includes(`${kind}:judge`), `${kind}: …and names what was found in its place`);
        }
      }
      // A vetoing LOOP is the same refusal, stated over the kind the old predicate most easily
      // admitted — a peer with a veto list and nothing else.
      const byLoop = model([...contenders(), loop("loop:supervisor", "command:other", { veto: ["loop:a", "loop:b"] })]);
      assert.equal(unarbitrated(checkActuatorArbitration(byLoop)).length, 1, "loop: a non-contending loop does not clear it either");

      // THE TWO STANDING EXCLUSIONS SURVIVE. A party to the conflict clears nothing however
      // complete its veto, and a veto over some but not all contenders clears nothing.
      const party = model([loop("loop:a", X, { veto: ["loop:a", "loop:b"] }), loop("loop:b", X)]);
      const partyFindings = unarbitrated(checkActuatorArbitration(party));
      assert.equal(partyFindings.length, 1, "a contender never clears its own contest");
      // …AND THE VERDICT ALONE CANNOT HOLD THAT EXCLUSION, which is why the MESSAGE is asserted
      // here too. An arbiter can never be a contender — `actuator` is not one of the arbiter's
      // admitted keys — so deleting the `!userSet.has(node.id)` guard from `covering` leaves every
      // verdict in this file identical and changes only the text: the finding then names a PARTY to
      // the conflict as the node found in an arbiter's place ("loop:a vetoes every contender but is
      // a loop"), which is incoherent on its face. The message is the only surface on which the
      // exclusion is observable at all, so it is the surface the exclusion is pinned to.
      assert.equal(
        partyFindings[0].message,
        `Actuator ${X} is shared by [loop:a, loop:b] without a non-member arbiter`,
        "a party to the conflict is never named as the node found in an arbiter's place",
      );
      for (const id of ["loop:a", "loop:b"]) {
        assert.equal(
          partyFindings[0].message.includes(`; ${id} vetoes every contender`), false,
          `${id} drives the contested actuator, so it may never be reported as the pretender`,
        );
      }
      const partial = model([...contenders(), loop("loop:c", X), vetoer("arbiter", ["loop:a", "loop:b"])]);
      assert.equal(unarbitrated(checkActuatorArbitration(partial)).length, 1, "an arbiter vetoing some but not all contenders clears nothing");

      // NON-VACUITY: the same three fixtures with the one field changed DO clear.
      assert.equal(unarbitrated(checkActuatorArbitration(model([...contenders(), vetoer("arbiter", ["loop:a", "loop:b"])]))).length, 0,
        "…and an entitled, non-contending, complete veto clears — so every refusal above is a rule and not a dead check");
    },
  },
  {
    name: "arch/58 FF-5805: an arbiter's priority is a permutation of its own veto set, and no arbiter declares target-setting",
    run: () => {
      const three = ["loop:a", "loop:b", "loop:c"];
      const cases = [
        { label: "the same three, most important first", priority: ["loop:a", "loop:b", "loop:c"], reported: false },
        { label: "the same three in another order", priority: ["loop:c", "loop:a", "loop:b"], reported: false },
        { label: "two of the three", priority: ["loop:a", "loop:b"], reported: true },
        { label: "the three plus one it does not veto", priority: [...three, "loop:d"], reported: true },
        { label: "one it does not veto instead of one it does", priority: ["loop:a", "loop:b", "loop:d"], reported: true },
        { label: "one of the three twice, another omitted", priority: ["loop:a", "loop:a", "loop:b"], reported: true },
        { label: "all three with one repeated", priority: [...three, "loop:a"], reported: true },
      ];
      for (const item of cases) {
        const subject = vetoer("arbiter", three, item.priority);
        const findings = incomplete(checkActuatorArbitration(model([subject])));
        assert.equal(findings.length, item.reported ? 1 : 0, `${item.label}: ${item.reported ? "reported" : "not reported"}`);
        if (!item.reported) continue;
        assert.equal(findings[0].path, subject.path, `${item.label}: reported at the arbiter's own record`);
        assert.equal(findings[0].severity, "error", `${item.label}: and it gates — the independence of the two codes is CONDITIONAL on that`);
        assert.ok(findings[0].message.includes(subject.id), `${item.label}: the message names the arbiter`);
      }
      // An order over nothing is still an order that does not match what it vetoes.
      assert.equal(incomplete(checkActuatorArbitration(model([vetoer("arbiter", [], ["loop:a", "loop:b"])]))).length, 1,
        "an arbiter that vetoes nothing has recorded an order over nothing");

      // A DEFECTIVE ORDER DOES NOT UN-CLEAR THE ACTUATOR — two independent facts, each reported
      // once, at the record that carries it.
      const both = checkActuatorArbitration(model([...contenders(), vetoer("arbiter", ["loop:a", "loop:b"], ["loop:a", "loop:a"])]));
      assert.equal(incomplete(both).length, 1, "the defective order is reported");
      assert.equal(unarbitrated(both).length, 0, "…and the actuator it arbitrates stays cleared");

      // AN ARBITER THAT SETS A TARGET HAS STOPPED ARBITRATING (ADR-001 §1). The ownership lane is
      // the one that says so, which is only possible because the traversal considers the node.
      const setter = node("arbiter:setter", "arbiter", { edges: { "target-setting": ["loop:a"] } });
      const refused = checkReferenceOwnership(model([setter, loop("loop:a", X)]));
      assert.deepEqual(
        refused.filter((f) => f.code === "loop-target-setting-not-admitted").map((f) => f.path), [setter.path],
        "an arbiter declaring target-setting is refused at its own record",
      );
    },
  },
  {
    name: "arch/58 FF-5805: isGraphNode accepts every member of NODE_KINDS, so no declared kind is filtered out of the traversals",
    run: () => {
      // THE PARITY LEG. `isGraphNode` is private and hand-written; what is observable is whether a
      // node of a given kind is a MEMBER of the decomposition every structural traversal walks.
      // Driven over the loader's whole vocabulary, so a sixth kind fails here rather than being
      // silently invisible in four checks at once.
      assert.ok(NODE_KINDS.size >= 5, `non-vacuous: the vocabulary carries ${NODE_KINDS.size} kinds`);
      for (const kind of NODE_KINDS) {
        const subject = node(`${kind}:member`, kind);
        const components = decomposeLoopGraph(model([subject]));
        assert.deepEqual(components, [[subject.id]], `${kind}: a declared node of this kind is a member of the graph the checks traverse`);
      }
      // THE CONTROL: a kind the vocabulary does NOT declare is filtered out, so the sweep above is
      // a decision about membership and not a check that always answers yes.
      assert.equal(NODE_KINDS.has("record-unusable"), false, "the control kind is outside the vocabulary");
      assert.deepEqual(decomposeLoopGraph(model([node("loop:ghost", "record-unusable")])), [], "an unusable kind is not a graph node");

      // BEING SEEN IS NOT BEING COUNTED AS A LOOP. The three lanes that narrow to `kind: loop`
      // say nothing about an arbiter, so widening membership cannot manufacture a finding.
      const arbiter = vetoer("arbiter", ["loop:a", "loop:b"]);
      const registry = model([...contenders(), arbiter]);
      for (const [lane, check] of [["reference-ownership", checkReferenceOwnership], ["pairing", checkPairing], ["timescale", checkTimescale]]) {
        assert.deepEqual(
          check(registry).filter((f) => f.path === arbiter.path), [],
          `${lane}: no finding names the arbiter — it is not a loop, and membership does not make it one`,
        );
      }

      // MEMBERSHIP IS A PRECONDITION OF FOUR LANES, so the two that the arbitration/ownership legs
      // above do not reach are decided here rather than asserted by the decomposition alone. A node
      // filtered out of the traversal does not merely fail to report itself: it silently degrades
      // the verdict of every node that reached ground through it (ADR-005 §6b), which is why the
      // GROUNDING lane is the one that must see it.
      const priorityAuthor = node("actor:operator", "actor", {
        fields: { ground: { key: "ground", raw: "exogenous", kind: "enum", value: "exogenous" } },
        edges: { "parameter-tuning": [arbiter.id] },
      });
      const grounded = checkGrounding(model([arbiter, priorityAuthor]));
      assert.deepEqual(
        grounded.map((f) => f.code), ["loop-graph-grounded-exogenous-only", "loop-graph-grounded-exogenous-only"],
        "grounding: the arbiter's own component is decomposed and a verdict about it is reported",
      );
      assert.ok(grounded.some((f) => f.message.includes(arbiter.id)), "…and the verdict names the arbiter");

      // ANCHOR-GROUNDING: an anchor whose authority no longer resolves carries its staleness
      // forward onto the arbiter's component — reachable only because the arbiter is traversed.
      const gate = node("anchor:gate", "anchor", {
        fields: {
          ground: { key: "ground", raw: "frozen-rule", kind: "enum", value: "frozen-rule" },
          observes: { key: "observes", raw: "module:src/gone.mjs#absent", kind: "pointer", resolved: false },
        },
        edges: { "data-feed": [arbiter.id] },
      });
      const stale = checkAnchorGrounding(model([arbiter, gate]));
      const staleComponent = stale.filter((f) => f.code === "loop-anchor-stale");
      assert.equal(staleComponent.length, 2, "anchor-grounding: the anchor's own component and the one it feeds are both reported stale");
      assert.equal(
        staleComponent.filter((f) => f.message.includes(arbiter.id)).length, 1,
        "…and exactly one of them names the arbiter, which only a traversed node can be",
      );
    },
  },
];
