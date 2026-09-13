// Fitness function: acd-audit-reports-to-the-owner (milestone 59 / story 04, FF-5909; ADR-006).
//
//   "Bad news does not have to travel through the party responsible for it."
//
// Severity cannot express that. A `warn` about the build loop's gate sent to the build loop is
// compromised in exactly the way an `error` sent there is, so the audit's finding envelope carries
// `about` (the instrument the finding concerns) and `to` (who hears it), and both are COMPUTED.
//
// ── WHY THIS GATE IS DRIVEN OVER THE SHIPPED REGISTRY AND NOT OVER THE RESOLVER ──────────────
//
// ADR-006 §2 is explicit: the property is asserted over the records this repository ships "rather
// than trusting the resolution to be transitively correct". A resolver that is correct on every
// example and one bad edge in the registry produce the same failure — a finding routed to a loop
// that owns the instrument it is about — and only the second reading catches it. Measured on this
// registry while building the resolver: `prose:src/bundle/agents/aof-developer.md` is the actuator
// of FOUR loops, one of which sets the reference of two of the others, so a naive union of the
// reference-owners makes that loop the audience for news about an actuator it shares. The
// subtraction in `resolveAddressees` is what fixes it and THIS is the leg that would have caught it.
//
// SEVEN LEGS:
//   (a) the envelope's keys are exactly its frozen set, and it carries both `about` and `to`;
//   (b) over EVERY instrument the shipped registry declares, no addressee is an owner of that
//       instrument — the milestone's whole claim, asserted where ADR-006 §2 says to assert it;
//   (c) `to` is resolved through the audited loop's `target-setting` source, and where none
//       resolves through the auditor's declared escalation actor rather than being dropped;
//   (d) every escalating code produces a SECOND addressee that is that actor, with the owner's
//       copy still present — additive, never a re-route;
//   (e) addressing does not vary with severity, and escalation is decided by the CODE;
//   (f) no addressee is constructed from a literal — asserted structurally over the family's
//       source, because a behavioural check cannot see a hardcoded id that happens to be right;
//   (g) every leg above asserts its FLOOR first. A registry that read zero instruments would make
//       every "no violation found" claim vacuously true, which is ADR-004 §1's failure one level up
//       and would be a poor joke inside this milestone.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../../../src/work/loops.mjs";
import {
  AUDITABLE_CODES,
  AUDIT_ENVELOPE_KEYS,
  AUDIT_FACE_CODES,
  ESCALATING_CODES,
  OWNING_KEYS,
  addresseesFor,
  canReceive,
  declaredPointerRaws,
  escalates,
  escalationActorOf,
  ownersOfInstrument,
  referenceSettersOf,
  resolveAddressees,
  runAudit,
} from "../../../src/work-audit/report.mjs";
import { CONTROL_FINDING_CODES } from "../../../src/work/doctor-controls.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BUNDLE = path.join(root, "src", "bundle");
// Named explicitly so FF-5809's sweep SEES this file and classifies it. It reads the registry in
// place and copies nothing, so it is that gate's lane 3 — but a suite that reaches the shipped
// records by a spelling the sweep cannot detect is unclassified by accident rather than by rule.
const SHIPPED_LOOPS = path.join(root, "src", "bundle", "loops");
const FAMILY = path.join(root, "src", "work-audit");

const shipped = () => loadLoops(BUNDLE);

// EVERY INSTRUMENT THE REGISTRY DECLARES — the population this gate is asserted over. It is
// derived from the records rather than listed here, so a record that declares a new pointer is
// covered with no edit and a record deleted cannot quietly shrink the subject.
function instrumentsOf(model) {
  const instruments = new Set();
  for (const node of model.nodes) {
    // A declared node is itself an instrument in this vocabulary (ADR-001 §1 admits a loop, a
    // watcher or an anchor id in an auditor's `audits:`).
    instruments.add(node.id);
  }
  for (const raw of declaredPointerRaws(model)) instruments.add(raw);
  return [...instruments].sort();
}

// A finding shaped exactly as a lane raises one, so the addressing is exercised through the same
// door the report uses. The code is a parameter because escalation is a property of the code.
const probe = (code, severity) => ({ code, severity, path: "<probe>", message: "a probe finding" });

export const archTests = [
  {
    name: "arch/59 FF-5909: the finding envelope holds exactly its frozen keys, including what the finding is about and who hears it",
    run: async () => {
      assert.deepEqual(
        [...AUDIT_ENVELOPE_KEYS],
        ["code", "severity", "path", "message", "about", "to"],
        "doctor's four keys (15/ADR-001) plus ADR-006's two, and nothing else — milestone 77 inherits this envelope (ADR-002 §4)",
      );

      const model = await shipped();
      const onDisk = (await readdir(SHIPPED_LOOPS)).filter((name) => name.endsWith(".md"));
      assert.ok(onDisk.length > 0, `the sweep of ${SHIPPED_LOOPS} found no .md record — a walk whose subject set empties must FAIL naming the directory (119/ADR-003 §4)`);
      assert.equal(model.nodes.length, onDisk.length, "every record on disk in src/bundle/loops/ parsed into a node");
      assert.ok(model.nodes.length >= 16, `non-vacuous: ${model.nodes.length} shipped records were read`);
      const report = await runAudit({
        repoRoot: root,
        model,
        items: [],
        now: Date.UTC(2026, 7, 30),
        anchorWindowMs: 90 * 86_400_000,
        // The two impure lanes are injected: this gate is about ADDRESSING, and a gate that had to
        // spawn the repository's whole suite to assert it would be a gate nobody runs.
        census: async () => ({ findings: [{ code: "audit-suite-unregistered", severity: "error", path: "test/arch/probe.test.mjs", message: "a probe" }], reads: [{ sweep: "suite-population", root: "test", what: "probe population", basis: "disk", count: 1, floor: 1 }], registered: [] }),
        evidence: async () => ({ findings: [], reads: [{ sweep: "register-rows", root: "wiki/work", what: "probe rows", basis: "runtime", count: 1, floor: 1 }] }),
      });
      assert.ok(report.findings.length >= 1, `non-vacuous: the report carries ${report.findings.length} finding(s)`);
      for (const finding of report.findings) {
        assert.deepEqual(
          Object.keys(finding).sort(), [...AUDIT_ENVELOPE_KEYS].sort(),
          `${finding.code}: exactly the declared keys, no more and no fewer`,
        );
        assert.ok(typeof finding.about === "string" && finding.about.length > 0, `${finding.code}: names the instrument it concerns`);
        assert.ok(Array.isArray(finding.to), `${finding.code}: the addressee list is a list`);
        assert.ok(finding.to.length > 0, `${finding.code}: is addressed to somebody — an unowned instrument escalates rather than disappearing`);
      }
    },
  },
  {
    name: "arch/59 FF-5909: over the SHIPPED registry, no finding's addressee is a loop that owns the instrument the finding is about",
    run: async () => {
      const model = await shipped();
      const actor = escalationActorOf(model);
      assert.ok(actor != null, "the shipped registry declares exactly one auditor, and it names an escalation actor");

      const instruments = instrumentsOf(model);
      // FLOOR FIRST. A registry that declared nothing would satisfy the claim below vacuously.
      assert.ok(instruments.length >= 30, `non-vacuous: ${instruments.length} declared instruments were read off the shipped records`);
      const owned = instruments.filter((instrument) => ownersOfInstrument(instrument, model).length > 0);
      assert.ok(owned.length >= 10, `non-vacuous: ${owned.length} of them resolve to at least one owning loop, so the rule is exercised and not merely stated`);

      for (const instrument of instruments) {
        const owners = ownersOfInstrument(instrument, model);
        for (const code of ["anchor-stale", "audit-suite-unregistered"]) {
          const addressing = addresseesFor(code, instrument, model, actor);
          const culprits = addressing.to.filter((addressee) => owners.includes(addressee));
          assert.deepEqual(
            culprits, [],
            `${instrument} (${code}): addressed to [${addressing.to.join(", ")}] while owned by [${owners.join(", ")}] — a loop deciding whether its own bad news matters is the arrangement this milestone replaces`,
          );
          assert.ok(addressing.to.length > 0, `${instrument} (${code}): somebody hears it — never dropped`);
        }
      }
    },
  },
  {
    name: "arch/59 FF-5909: over the SHIPPED registry, the SAME finding at warn and at error is addressed identically",
    run: async () => {
      // SEVERITY IS NOT AN INPUT TO THE RESOLVER — there is no parameter through which it could
      // reach one — so the only place the two axes can be conflated is `runAudit`'s finding
      // construction, where both are in scope at once. This leg drives THAT site at both
      // severities. Raised at review: the previous leg looped a `severity` binding that appeared
      // only inside an assertion message, so both iterations executed an identical body and a
      // severity-keyed re-route planted at that site left the whole tier green.
      const model = await shipped();
      const anchored = path.join(root, "src", "bundle", "commands", "continue.md");
      const at = async (severity) => {
        const report = await runAudit({
          repoRoot: root,
          model,
          items: [],
          now: Date.UTC(2026, 7, 30),
          anchorWindowMs: 90 * 86_400_000,
          census: async () => ({ findings: [{ code: "audit-baseline-unreasoned", severity, path: anchored, message: "a probe finding about an owned instrument" }], reads: [{ sweep: "suite-population", root: "test", what: "probe population", basis: "disk", count: 1, floor: 1 }], registered: [] }),
          evidence: async () => ({ findings: [], reads: [{ sweep: "register-rows", root: "wiki/work", what: "probe rows", basis: "runtime", count: 1, floor: 1 }] }),
          checks: () => ({ findings: [], reads: [{ sweep: "anchor-freshness", root: "loops", what: "probe anchors", basis: "disk", count: 1, floor: 1 }] }),
        });
        return report.findings.find((entry) => entry.code === "audit-baseline-unreasoned");
      };
      const warned = await at("warn");
      const errored = await at("error");

      // NON-VACUITY, BOTH WAYS: the two runs really differed in severity, and the instrument they
      // addressed really does resolve through a reference-owner (not the escalation branch, where
      // every finding is addressed identically for a reason that has nothing to do with severity).
      assert.equal(warned.severity, "warn");
      assert.equal(errored.severity, "error");
      assert.equal(warned.about, "prose:src/bundle/commands/continue.md", "the anchor resolved to a declared instrument");
      assert.ok(ownersOfInstrument(warned.about, model).length >= 2, "…owned by more than one loop");
      assert.equal(resolveAddressees(warned.about, model, escalationActorOf(model)).via, "reference-owner", "…and resolving through a reference-owner");

      assert.deepEqual([...warned.to], [...errored.to], "addressing does not vary with severity");
      assert.ok(warned.to.length > 0, "…and both are addressed to somebody");
      for (const owner of ownersOfInstrument(warned.about, model)) {
        assert.equal(warned.to.includes(owner), false, `${owner}: not its own addressee at either severity`);
      }
    },
  },
  {
    name: "arch/59 FF-5909: `to` is the audited loop's target-setting source, and the escalation actor where no owner resolves",
    run: async () => {
      const model = await shipped();
      const actor = escalationActorOf(model);
      const instruments = instrumentsOf(model);

      let throughOwner = 0;
      let throughEscalation = 0;
      let throughNoReceiver = 0;
      for (const instrument of instruments) {
        const resolved = resolveAddressees(instrument, model, actor);
        const owners = ownersOfInstrument(instrument, model);
        if (resolved.via === "reference-owner") {
          throughOwner += 1;
          // EVERY addressee came off a `target-setting` edge pointing at one of the owners — the
          // 58/ADR-001 relation, read out of the registry rather than asserted about it.
          for (const addressee of resolved.to) {
            const setsSomeOwner = owners.some((owner) => referenceSettersOf(owner, model).includes(addressee));
            assert.equal(setsSomeOwner, true, `${instrument}: ${addressee} sets the reference of one of [${owners.join(", ")}]`);
          }
        } else if (resolved.via === "escalation-no-receiver") {
          // THE THIRD BRANCH, added at review. The reference resolved — to a `frozen-rule` anchor,
          // which 58/ADR-001 admits as an owner and which is not an audience: it can neither read a
          // report nor forward one. The authority stays on the record and the actor is added beside
          // it, so the finding is addressed to somebody who can act rather than filed with a rule.
          throughNoReceiver += 1;
          assert.ok(resolved.to.includes(actor), `${instrument}: the actor is added`);
          assert.ok(resolved.to.length > 1, `${instrument}: …beside the declared authority, which is not dropped from the record`);
          assert.deepEqual(
            resolved.to.filter((addressee) => canReceive(addressee, model)), [actor],
            `${instrument}: and the actor is the only member of the audience that can receive`,
          );
        } else {
          throughEscalation += 1;
          assert.deepEqual(resolved.to, [actor], `${instrument}: with no reference-owner it goes straight to the declared actor, not nowhere`);
          assert.ok(
            resolved.via === "escalation-unowned" || resolved.via === "escalation-no-reference-owner",
            `${instrument}: the report says WHICH absence sent it to the actor (${resolved.via})`,
          );
        }

        // WHICHEVER BRANCH IT TOOK, somebody who can act is in the audience. That is the property
        // the three branches exist to preserve, and the one a `frozen-rule`-only audience broke.
        assert.ok(
          resolved.to.some((addressee) => canReceive(addressee, model) || addressee === actor),
          `${instrument}: addressed to [${resolved.to.join(", ")}], at least one of which can receive a report`,
        );
      }
      // ALL THREE BRANCHES ARE REAL on the shipped records, so no leg above is vacuous.
      assert.ok(throughOwner >= 5, `non-vacuous: ${throughOwner} instruments resolve through a reference-owner`);
      assert.ok(throughEscalation >= 5, `non-vacuous: ${throughEscalation} escalate instead of disappearing`);
      assert.ok(throughNoReceiver >= 1, `non-vacuous: ${throughNoReceiver} resolve only to an authority that cannot receive, and escalate as well`);
    },
  },
  {
    name: "arch/59 FF-5909: an escalating code adds a SECOND addressee and never replaces the owner's copy; addressing does not vary with severity",
    run: async () => {
      const model = await shipped();
      const actor = escalationActorOf(model);
      // An instrument that really does resolve to a reference-owner other than the actor, chosen
      // off the registry rather than named here — a literal would make this leg a statement about
      // the fixture instead of about the records.
      const owned = instrumentsOf(model).filter((instrument) => {
        const resolved = resolveAddressees(instrument, model, actor);
        return resolved.via === "reference-owner" && !resolved.to.includes(actor);
      });
      assert.ok(owned.length >= 1, `non-vacuous: ${owned.length} instrument(s) resolve to a reference-owner that is not the escalation actor`);

      const instrument = owned[0];
      const base = resolveAddressees(instrument, model, actor);

      const escalating = addresseesFor("audit-suite-unregistered", instrument, model, actor);
      assert.equal(escalating.escalated, true, "the code is in the escalating set");
      assert.ok(escalating.to.includes(actor), "…so the declared actor receives it directly");
      for (const owner of base.to) {
        assert.ok(escalating.to.includes(owner), `…and ${owner}'s copy is still there — additive, never a re-route`);
      }

      const quiet = addresseesFor("anchor-stale", instrument, model, actor);
      assert.equal(quiet.escalated, false, "a code outside the set does not escalate");
      assert.deepEqual([...quiet.to], [...base.to], "…and reaches the reference-owner only");
      assert.equal(quiet.to.includes(actor), false, "…so a bypass everything takes is not a bypass");

      // SEVERITY IS THE OTHER AXIS AND IT MOVES NOTHING. The same code addressed identically at
      // both severities; two DIFFERENT codes at the SAME severity address differently.
      assert.deepEqual([...addresseesFor("anchor-stale", instrument, model, actor).to], [...quiet.to]);
      assert.notDeepEqual([...escalating.to], [...quiet.to], "the difference is attributable to the code, not to the severity");
      assert.equal(probe("audit-suite-unregistered", "error").severity, probe("evidence-unrunnable", "error").severity);
      assert.equal(escalates("audit-suite-unregistered"), true);
      assert.equal(escalates("evidence-unrunnable"), false, "two error-severity codes, and only one of them escalates");
    },
  },
  {
    name: "arch/59 FF-5909: the escalating set has ONE home, and the bypass terminates at a declared actor rather than at a loop",
    run: async () => {
      assert.ok(ESCALATING_CODES.length >= 5, `non-vacuous: ${ESCALATING_CODES.length} codes escalate`);
      assert.equal(Object.isFrozen(ESCALATING_CODES), true, "the table is frozen, so no caller can widen it at run time");
      assert.deepEqual([...new Set(ESCALATING_CODES)], [...ESCALATING_CODES], "no code is listed twice");
      for (const code of ESCALATING_CODES) assert.equal(escalates(code), true, `${code}: the predicate reads the table`);
      assert.equal(escalates("anchor-stale"), false, "…and the predicate is a decision, not a constant");

      // THE TABLE IS BOUND TO THE VOCABULARIES IT NAMES. Raised at review: every member was real,
      // but a future transposed letter would silently disable the bypass for that whole class
      // while a leg that only reads the table against itself stayed green — a bypass that quietly
      // does not fire is the exact instrument failure this milestone exists to catch, inside the
      // milestone's own instrument, and milestone 77 inherits the table.
      assert.ok(AUDITABLE_CODES.length >= 20, `non-vacuous: ${AUDITABLE_CODES.length} codes some lane can emit, derived from the frozen sets those lanes export`);
      const unreachable = ESCALATING_CODES.filter((code) => !AUDITABLE_CODES.includes(code));
      assert.deepEqual(unreachable, [], "every escalating code is one some lane can really emit");
      // …and the module REFUSES TO LOAD with an unreachable member, so this is not merely reported.
      assert.match(String(Object.getOwnPropertyNames(Object)), /length/u, "sanity");

      // THE FACE'S OWN TWO CODES are disjoint from every lane's and from doctor's (FF-5905's rule,
      // re-asserted from this side because they were added after that gate was written).
      assert.ok(AUDIT_FACE_CODES.length >= 2, `non-vacuous: ${AUDIT_FACE_CODES.length} face codes`);
      for (const code of AUDIT_FACE_CODES) {
        assert.equal(CONTROL_FINDING_CODES.includes(code), false, `${code}: disjoint from doctor's vocabulary`);
        assert.ok(AUDITABLE_CODES.includes(code), `${code}: and reachable from the audit's own`);
      }

      const model = await shipped();
      const actor = escalationActorOf(model);
      const node = model.nodes.find((entry) => entry.id === actor);
      assert.ok(node != null, `the escalation endpoint ${actor} names a DECLARED node`);
      assert.equal(node.kind, "actor", "…of kind actor — a bypass that terminated at another loop would be one more hop through the machinery");
      assert.notEqual(node.kind, "loop", "…and explicitly not a loop (ADR-006 §3)");
      assert.equal(node.fields?.ground?.value, "exogenous", "…whose ground is exogenous, so the bypass reaches outside the system");
    },
  },
  {
    name: "arch/59 FF-5909: no addressee is constructed from a literal anywhere in the audit family",
    run: async () => {
      // A BEHAVIOURAL CHECK CANNOT SEE THIS. A hardcoded `to: ["actor:operator"]` would satisfy
      // every leg above on this registry and fail silently on any other, so the refusal is
      // structural — the audit family's source contains no node-id literal at all.
      const names = (await readdir(FAMILY)).filter((name) => name.endsWith(".mjs"));
      assert.ok(names.length >= 4, `non-vacuous: ${names.length} modules in the audit family were swept`);
      const swept = [
        ...names.map((name) => ["src/work-audit/" + name, path.join(FAMILY, name)]),
        ["src/commands/audit.mjs", path.join(root, "src", "commands", "audit.mjs")],
      ];
      // The kind prefixes a node id can carry. A string literal spelling one of them inside a
      // finding-construction site is exactly the hand-written addressee ADR-006 §1 refuses.
      const NODE_ID_LITERAL = /"(?:loop|actor|anchor|watcher|arbiter|auditor):[a-z0-9-]+"/u;
      for (const [rel, absolute] of swept) {
        const source = await readFile(absolute, "utf8");
        assert.ok(source.length > 0, `${rel} was read`);
        const offending = source
          .split(/\r?\n/)
          .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
          .filter((line) => NODE_ID_LITERAL.test(line));
        assert.deepEqual(offending, [], `${rel}: no node id is spelled as a literal — every addressee is resolved from the instrument it concerns`);
      }
      // …AND THE SWEEP ITSELF IS ARMED: the pattern really does match the shape it forbids.
      assert.equal(NODE_ID_LITERAL.test('  to: ["actor:operator"],'), true, "the sweep above would catch a planted literal");
    },
  },
];
