// FF-5806 — THE DAY-ONE SUPERVISION HIERARCHY IS COMPLETE, ADMISSIBLE AND CORROBORATED.
//
// Milestone 58 / story 01, from 58/ADR-001, ADR-002 and ADR-005. Over the records shipped in
// `src/bundle/loops/`:
//
//   every `kind: loop` record has an inbound `target-setting` edge from another node; every
//   `target-setting` edge's source is a `loop`, an `actor`, or an `anchor` whose `ground:` is
//   `frozen-rule`; every `kind: loop` record declares a `layer:`; every declared layer is
//   corroborated by its cadence's scope rank EXCEPT AT MOST ONE, which this test names; no
//   `owner:` names an actor that does not declare the matching edge; every `config:` endpoint of
//   an arbiter's `parameter-tuning` is cited as a `ceiling:` pointer by one of the loops that
//   arbiter vetoes; and the shipped registry produces ZERO findings whose code is in
//   `GATING_CODES`.
//
// WHY THE SUBJECT IS THE REGISTRY AND NOT THE CHECKS. ADR-001's five new edges are DESIGN ACTS —
// RESEARCH §Q1 looked and found no artifact in this repository that sets those references — so the
// thing that can rot is the CONTENT of the records, not the code that reads them. A check can be
// green over a registry that has quietly lost an edge, gained a second owner for one loop, or had
// a layer edited to dodge a comparison. This control is the standing reader of the hierarchy
// itself, which is why every leg below is computed from the loaded model rather than from a
// literal table — except the day-one tables, which ARE the decision and are therefore written down.
//
// WHY THE ARBITRATION LEG IS STRUCTURAL RATHER THAN A FINDING COUNT. `checkActuatorArbitration`
// clears a shared actuator on a non-contending node that vetoes every contender — and the node
// this story ships is a `kind: arbiter`, which `isGraphNode` did not admit until 58/02 landed
// (58/ADR-003 §6, amended: the two halves have different owners, and 58/02 is the sole writer of
// `src/work/loops-checks.mjs`). So the finding count is 58/02's contract, asserted by FF-5805;
// what THIS control owns is that the registry satisfies the requirement on merit — one arbiter,
// not itself a contender, vetoing every contender for every shared actuator, with an order that
// accounts for exactly those loops. That claim was true before 58/02 and is true after it.
//
// UPDATED BY 58/02, and the update IS the state flip ADR-007 §1b predicted. While the traversal
// filtered the arbiter out, this control could only pin that the three shared-actuator warnings
// were all that remained; with `isGraphNode` widened they go to zero without a single record
// changing, which is what makes the flip evidence rather than a tautology. The leg below now
// reads the end state (an empty arbitration lane) and the merit legs above are unchanged.
import assert from "node:assert/strict";
import path from "node:path";

import { loadLoops } from "../../../src/work/loops.mjs";
import {
  GATING_CODES,
  checkActuatorArbitration,
  checkAnchorGrounding,
  checkGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkTimescale,
} from "../../../src/work/loops-checks.mjs";
import { withShippedRegistry, SHIPPED_LOOPS_DIR } from "../../support/registry-fixture.mjs";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const CHECKS = Object.freeze([
  checkGrounding,
  checkAnchorGrounding,
  checkPairing,
  checkReferenceOwnership,
  checkActuatorArbitration,
  checkTimescale,
]);

// THE DAY-ONE REFERENCE HIERARCHY (ADR-001 §2). Seven loops, seven owners, three admissible
// kinds and no fourth. This literal is the DECISION — the one thing here that is authored rather
// than computed — so an edge that silently moves fails on the row that names it.
const HIERARCHY = Object.freeze([
  ["loop:build-to-green", "loop:autonomous-cascade", "loop"],
  ["loop:review-fix-rereview", "loop:autonomous-cascade", "loop"],
  ["loop:run-resilience", "anchor:run-lifecycle-policy", "anchor"],
  ["loop:mesh-assignment-reclaim", "actor:operator", "actor"],
  ["loop:retrospective-memory-ingest", "actor:operator", "actor"],
  ["loop:autonomous-cascade", "actor:operator", "actor"],
  ["loop:verify-triage-accept", "actor:product-owner", "actor"],
].map((row) => Object.freeze(row)));

// THE DAY-ONE LAYER ASSIGNMENT (ADR-002 §7). `argued` marks the single declaration that rests on
// its record's own narrative because a clock says nothing about scope.
const LAYERS = Object.freeze([
  ["loop:build-to-green", "event:per-phase", "operational", "corroborated"],
  ["loop:review-fix-rereview", "event:per-phase", "operational", "corroborated"],
  ["loop:run-resilience", "event:per-run-start", "operational", "corroborated"],
  ["loop:mesh-assignment-reclaim", "periodic:15s", "operational", "argued"],
  ["loop:autonomous-cascade", "event:per-item", "management", "corroborated"],
  ["loop:verify-triage-accept", "event:per-item", "management", "corroborated"],
  ["loop:retrospective-memory-ingest", "event:per-milestone", "governance", "corroborated"],
].map((row) => Object.freeze(row)));

const LAYER_ORDER = Object.freeze(["operational", "management", "governance"]);

/** Load the whole shipped registry, endpoint-closed by construction, through the one helper. */
async function withShipped(run) {
  return withShippedRegistry(null, async (fixture) => {
    const model = await loadLoops(fixture.workDir);
    assert.equal(
      model.nodes.length,
      fixture.names.length,
      `every shipped record parsed: ${model.nodes.length} of ${fixture.names.length}`,
    );
    assert.deepEqual(
      model.findings.filter((finding) => finding.severity === "error"),
      [],
      "the shipped registry loads with no error-severity finding",
    );
    return run(model, fixture);
  });
}

const byId = (model) => new Map(model.nodes.map((node) => [node.id, node]));
const edgeRaws = (node, key) => (node.edges?.[key] ?? []).map((endpoint) => endpoint.raw);
const loopsOf = (model) => model.nodes.filter((node) => node.kind === "loop");
const compare = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

export const archTests = [
  {
    name: "arch/58 FF-5806: every declared loop is the endpoint of exactly one target-setting edge, from an admissible owner",
    run: () => withShipped(async (model) => {
      const nodes = byId(model);
      const loops = loopsOf(model);
      assert.equal(loops.length, HIERARCHY.length, `non-vacuous: ${loops.length} shipped loops`);

      // Who sets each loop's reference, computed from the edges rather than read off a table.
      const owners = new Map(loops.map((loop) => [loop.id, []]));
      for (const source of model.nodes) {
        for (const raw of edgeRaws(source, "target-setting")) {
          assert.notEqual(raw, source.id, `${source.id}: no node sets its own reference`);
          if (owners.has(raw)) owners.get(raw).push(source.id);
        }
      }

      for (const loop of loops) {
        const setters = owners.get(loop.id);
        assert.equal(setters.length, 1, `${loop.id}: exactly one node sets its reference, found [${setters.join(", ")}]`);
      }

      // ADMISSIBILITY — a loop, an actor, or an anchor grounded on a rule no cycle revises.
      // Anything else (a watcher, an arbiter, an anchor on any other ground) is refused here.
      for (const source of model.nodes) {
        if (edgeRaws(source, "target-setting").length === 0) continue;
        assert.ok(
          source.kind === "loop" || source.kind === "actor" || source.kind === "anchor",
          `${source.id}: a ${source.kind} sets nobody's reference`,
        );
        if (source.kind === "anchor") {
          assert.equal(
            source.fields?.ground?.value,
            "frozen-rule",
            `${source.id}: only a frozen-rule anchor may set a reference`,
          );
        }
      }

      // A node that only watches or only arbitrates sets nobody's reference.
      const abstainers = model.nodes.filter((node) => node.kind === "watcher" || node.kind === "arbiter");
      assert.ok(abstainers.length >= 4, `non-vacuous: ${abstainers.length} watcher/arbiter records`);
      for (const node of abstainers) {
        assert.equal("target-setting" in (node.edges ?? {}), false, `${node.id}: declares no target-setting edge`);
      }

      // THE DAY-ONE TABLE, row by row.
      for (const [loopId, ownerId, kind] of HIERARCHY) {
        assert.deepEqual(owners.get(loopId), [ownerId], `${loopId}: its reference is set by ${ownerId}`);
        assert.equal(nodes.get(ownerId)?.kind, kind, `${ownerId}: is a ${kind}`);
      }

      // The check that reports the absence agrees, and reports nothing.
      assert.deepEqual(checkReferenceOwnership(model), [], "no unowned-reference finding on the shipped registry");
    }),
  },

  {
    name: "arch/58 FF-5806: the accountable owner and the target-setting edge never disagree, and naming one does not silence the other",
    run: () => withShipped(async (model) => {
      const nodes = byId(model);
      let named = 0;
      let unknown = 0;
      for (const loop of loopsOf(model)) {
        const owner = loop.fields?.owner;
        if (owner?.kind === "unknown") {
          unknown += 1;
          continue;
        }
        named += 1;
        assert.equal(owner?.scheme, "actor", `${loop.id}: owner is an actor ref`);
        const actor = nodes.get(owner.raw);
        assert.ok(actor, `${loop.id}: ${owner.raw} is a declared node`);
        assert.ok(
          edgeRaws(actor, "target-setting").includes(loop.id),
          `${loop.id}: owner ${owner.raw} declares the matching target-setting edge`,
        );
      }
      assert.ok(named >= 1, "the rule is exercised: at least one loop names an accountable owner");
      // ADR-001 §6 — the accountability gap is REPORTED, not merged away by the new edges.
      assert.equal(unknown, 6, "the six loops that name no accountable owner still say so");
    }),
  },

  {
    name: "arch/58 FF-5806: every loop declares a layer, at most one of them uncorroborated, and this test names it",
    run: () => withShipped(async (model, fixture) => {
      const loops = loopsOf(model);
      const uncorroborated = [];
      for (const loop of loops) {
        const layer = loop.fields?.layer;
        assert.ok(layer, `${loop.id}: declares a layer`);
        assert.ok(LAYER_ORDER.includes(layer.value), `${loop.id}: ${layer.raw} is one of the three the vocabulary admits`);
        assert.equal(layer.rank, LAYER_ORDER.indexOf(layer.value), `${loop.id}: rank rides on the parsed field`);
        // A LAYER IS AN ORDINAL AND NEVER A DURATION: the parsed layer carries a rank and no
        // interval, and the ranks are the three integers, compared and never divided.
        assert.equal(layer.ms, undefined, `${loop.id}: the layer carries no interval`);

        const scopeRank = loop.fields?.cadence?.scopeRank;
        if (scopeRank === undefined) {
          uncorroborated.push(`${loop.id} (${loop.fields?.cadence?.raw})`);
          continue;
        }
        assert.equal(layer.rank, scopeRank, `${loop.id}: the declared layer agrees with the scope its cadence names`);
      }

      // EXACTLY ONE, AND IT IS NAMED. The bound is what stops "declare the layer and argue it"
      // becoming the way every layer arrives (ADR-002 §3).
      assert.deepEqual(
        uncorroborated,
        ["loop:mesh-assignment-reclaim (periodic:15s)"],
        "one layer rests on argument, and it is the registry's only periodic loop",
      );

      // AND THE RECORD MAKES THE ARGUMENT. An uncorroborated layer is admissible only where it is
      // argued, so the bound above is only half the rule — the other half is that the one record
      // allowed to carry it says, in its own body, that its layer rests on argument and why. The
      // body is the loader's discard, so this is read from the record TEXT the fixture copied.
      const argued = fixture.files["mesh-assignment-reclaim.md"];
      assert.ok(argued, "the argued record is in the fixture");
      const body = argued.slice(argued.indexOf("\n---\n") + 5);
      assert.match(body, /ARGUED rather than corroborated/u, "it declares that its layer is argued, not corroborated");
      assert.match(body, /a clock is a rate|says nothing about scope/iu, "…and why no scope rank can corroborate it");
      assert.match(body, /operational/u, "…and defends the layer it actually declares");

      // A node with no cadence has no place on this axis and declares none.
      for (const node of model.nodes) {
        if (node.kind === "loop") continue;
        assert.equal("layer" in (node.fields ?? {}), false, `${node.id}: a ${node.kind} declares no layer`);
      }

      // The day-one assignment, row by row.
      for (const [loopId, cadence, layer, standing] of LAYERS) {
        const node = model.nodes.find((entry) => entry.id === loopId);
        assert.ok(node, `${loopId}: is shipped`);
        assert.equal(node.fields.cadence.raw, cadence, `${loopId}: cadence`);
        assert.equal(node.fields.layer.value, layer, `${loopId}: layer`);
        const corroborated = node.fields.cadence.scopeRank !== undefined;
        assert.equal(corroborated, standing === "corroborated", `${loopId}: ${standing}`);
      }
    }),
  },

  {
    name: "arch/58 FF-5806: a loop that sets another loop's reference sits exactly one layer above it",
    run: () => withShipped(async (model) => {
      const nodes = byId(model);
      const crossings = [];
      for (const source of loopsOf(model)) {
        for (const raw of edgeRaws(source, "target-setting")) {
          const target = nodes.get(raw);
          if (target?.kind !== "loop") continue;
          const delta = source.fields.layer.rank - target.fields.layer.rank;
          crossings.push([`${source.id} -> ${target.id}`, delta]);
          assert.equal(delta, 1, `${source.id} -> ${target.id}: exactly one layer above, not ${delta}`);
        }
      }
      assert.deepEqual(
        crossings,
        [
          ["loop:autonomous-cascade -> loop:build-to-green", 1],
          ["loop:autonomous-cascade -> loop:review-fix-rereview", 1],
        ],
        "the two loop-to-loop edges this milestone authored, both management -> operational",
      );
    }),
  },

  {
    name: "arch/58 FF-5806: one arbiter records the trade-off, vetoes every contender for every shared actuator, and is party to none of it",
    run: () => withShipped(async (model) => {
      const arbiters = model.nodes.filter((node) => node.kind === "arbiter");
      assert.equal(arbiters.length, 1, "the registry declares exactly one arbiter");
      const [arbiter] = arbiters;

      // It NAMES the conflict, as a phrase a reader meets where the claim is made.
      assert.equal(arbiter.fields.resolves.kind, "phrase", `${arbiter.id}: resolves is a phrase`);
      assert.match(arbiter.fields.resolves.raw, /effort/u, `${arbiter.id}: names the contested quantity`);

      // It declares no way to act, nothing it measures, no cadence and no authority of its own.
      for (const key of ["actuator", "measurement", "cadence", "ground", "controlled", "optimizing"]) {
        assert.equal(key in (arbiter.fields ?? {}), false, `${arbiter.id}: declares no ${key}`);
      }
      assert.equal("target-setting" in (arbiter.edges ?? {}), false, `${arbiter.id}: sets nobody's reference`);

      // THE CONTENDER SETS, COMPUTED. An actuator two or more loops name is contended.
      const users = new Map();
      for (const loop of loopsOf(model)) {
        for (const raw of new Set((loop.fields?.actuator ?? []).map((entry) => entry.raw))) {
          if (!users.has(raw)) users.set(raw, new Set());
          users.get(raw).add(loop.id);
        }
      }
      const shared = [...users.entries()]
        .filter(([, set]) => set.size >= 2)
        .map(([actuator, set]) => [actuator, [...set].sort(compare)])
        .sort((left, right) => compare(left[0], right[0]));
      assert.deepEqual(shared, [
        ["prose:src/bundle/agents/aof-developer.md", [
          "loop:autonomous-cascade",
          "loop:build-to-green",
          "loop:review-fix-rereview",
          "loop:verify-triage-accept",
        ]],
        ["prose:src/bundle/agents/aof-product-owner.md", ["loop:autonomous-cascade", "loop:verify-triage-accept"]],
        ["prose:src/bundle/agents/aof-qa.md", ["loop:autonomous-cascade", "loop:verify-triage-accept"]],
      ], "three shared actuators and four distinct contenders");

      const vetoed = edgeRaws(arbiter, "veto");
      for (const [actuator, contenders] of shared) {
        for (const contender of contenders) {
          assert.ok(vetoed.includes(contender), `${actuator}: the arbiter vetoes ${contender}`);
        }
        assert.equal(contenders.includes(arbiter.id), false, `${actuator}: the arbiter is not itself a contender`);
      }

      // A VETO THAT MISSES ONE CONTENDER CLEARS NOTHING — asserted as the property, over every
      // way of dropping exactly one loop from the veto set. The predicate the check applies is
      // "vetoes EVERY contender", so a set short by one leaves at least one actuator uncovered.
      for (const dropped of vetoed) {
        const partial = new Set(vetoed.filter((id) => id !== dropped));
        const uncleared = shared.filter(([, contenders]) => !contenders.every((id) => partial.has(id)));
        assert.ok(
          uncleared.length >= 1,
          `dropping ${dropped} from the veto set leaves an actuator with nobody entitled to decide`,
        );
      }
    }),
  },

  {
    name: "arch/58 FF-5806: the arbiter's order accounts for exactly the loops it vetoes, and every knob it owns bounds one of them",
    run: () => withShipped(async (model, fixture) => {
      const nodes = byId(model);
      const [arbiter] = model.nodes.filter((node) => node.kind === "arbiter");
      const vetoed = edgeRaws(arbiter, "veto");
      const priority = (arbiter.fields.priority ?? []).map((entry) => entry.raw);

      // A PERMUTATION: each vetoed loop appears exactly once, and nothing it does not veto appears.
      assert.equal(new Set(priority).size, priority.length, `${arbiter.id}: no loop appears twice in the order`);
      assert.deepEqual(
        [...priority].sort(compare),
        [...vetoed].sort(compare),
        `${arbiter.id}: the order is a permutation of the veto set`,
      );
      assert.deepEqual(priority, [
        "loop:verify-triage-accept",
        "loop:review-fix-rereview",
        "loop:build-to-green",
        "loop:autonomous-cascade",
      ], "the recorded trade-off, most-important-first");
      for (const id of priority) assert.equal(nodes.get(id)?.kind, "loop", `${id}: is a declared loop`);

      // THE DWELL is a count of cycles of the receiving loop, and `none` is its own answer.
      const dwell = arbiter.fields.dwell;
      assert.ok(dwell, `${arbiter.id}: declares a dwell`);
      assert.ok(dwell.kind === "cycles" || dwell.kind === "none", `${arbiter.id}: dwell is cycles:<n> or none`);
      if (dwell.kind === "cycles") assert.ok(dwell.cycles >= 1, `${arbiter.id}: a dwell of at least one cycle`);
      // WHOSE CYCLES, said in the record rather than left to the reader. `cycles:2` alone does not
      // say two cycles of WHAT, and the answer is load-bearing: units are cycles of the RECEIVING
      // loop, not wall-clock, because six of the seven loops have no clock at all.
      const arbiterText = fixture.files["speed-thoroughness-autonomy.md"];
      assert.ok(arbiterText, "the arbiter record is in the fixture");
      assert.match(arbiterText, /cycles of the loop that receive[sd]/iu, `${arbiter.id}: says whose cycles they are`);
      assert.match(arbiterText, /before a reversion is considered/iu, `${arbiter.id}: and what standing for them buys`);

      // "BOUNDS" IS COMPUTABLE (ADR-003 §7): every config knob the arbiter claims is cited as a
      // `ceiling:` pointer by one of the loops it vetoes. Reading "bounds" any wider would let an
      // arbiter declare authority over knobs nothing it arbitrates runs within.
      const ceilings = new Map();
      for (const id of vetoed) {
        for (const entry of nodes.get(id)?.fields?.ceiling ?? []) {
          if (!ceilings.has(entry.raw)) ceilings.set(entry.raw, []);
          ceilings.get(entry.raw).push(id);
        }
      }
      const knobs = edgeRaws(arbiter, "parameter-tuning");
      assert.ok(knobs.length >= 1, `${arbiter.id}: claims at least one knob`);
      for (const knob of knobs) {
        if (!knob.startsWith("config:")) continue;
        assert.ok(ceilings.has(knob), `${knob}: cited as a ceiling by a loop the arbiter vetoes`);
      }
      assert.deepEqual(knobs, [
        "config:work.loop.reviewRounds",
        "config:work.loop.buildNoProgressRounds",
        "config:work.autonomous.maxAttempts",
      ], "the knobs the vetoed loops themselves cite as bounds");
    }),
  },

  {
    name: "arch/58 FF-5806: the shipped registry produces zero gating findings and nothing outstanding on the ownership or arbitration lanes",
    run: () => withShipped(async (model, fixture) => {
      const findings = [...model.findings, ...CHECKS.flatMap((check) => check(model))];
      assert.deepEqual(
        findings.filter((finding) => GATING_CODES.has(finding.code)),
        [],
        "no finding from the frozen gating set",
      );
      assert.deepEqual(
        findings.filter((finding) => finding.severity === "error"),
        [],
        "and nothing at error severity",
      );

      // THE OWNERSHIP AND ARBITRATION REQUIREMENTS, ON MERIT — and now also in the count.
      // `reference-ownership` reports nothing: every loop is owned by an admissible source and
      // every loop declares a layer its cadence corroborates. `actuator-arbitration` reports
      // nothing either, which is the state flip 58/02 landed: the same records, the same three
      // contended actuators, and one `kind: arbiter` the traversal can now see clearing all of
      // them (58/ADR-003 §6, ADR-007 §1b). Measured before 58/02: three
      // `loop-shared-actuator-unarbitrated` warnings, from the very node that resolves them.
      assert.deepEqual(checkReferenceOwnership(model), [], "no unowned-reference, not-admitted or layer-census finding");
      assert.deepEqual(
        [...new Set(checkActuatorArbitration(model).map((finding) => finding.code))].sort(compare),
        [],
        "nothing is outstanding on the arbitration lane — the arbiter is a node the check can see",
      );

      assert.ok(fixture.names.length >= 16, `non-vacuous: ${fixture.names.length} shipped records`);
      assert.equal(path.basename(path.dirname(fixture.loopsDir)), "work", "the fixture is a real registry directory");
    }),
  },
  // ──────────────────────────────────────────────────────────────────────────
  // FF-5810 — EVERY CITATION A SHIPPED LOOP RECORD WRITES RESOLVES.
  //
  // 58/ADR-001 §3, ADR-006 §Codebase health. The registry's whole claim is that an AUTHORED
  // edge declares itself authored and a DISCOVERED one cites the artifact it was read from, so
  // a citation nothing checks is the half that rots — and it rots invisibly. 52/ADR-013
  // deliberately routed prose-body line citations OUT of the census as `not-black-box`
  // (`test/loop/work-loops-registry-census.test.mjs:29-31`) on the ground that asserting a line's
  // CONTENT would redden the suite on every unrelated source edit. That reasoning is right and
  // it does not cover the two weaker predicates below, both computable without reading content:
  //
  //   (a) IN RANGE — no cited path is missing, and no cited line or range starts past the
  //       file's last line.
  //   (b) DEFINING LINE — where a record writes `` `<name>` at `<module>.mjs:<n>` `` and
  //       `<name>` is an EXPORTED symbol of that module, `<n>` is the line of its `export`.
  //
  // MEASURED AT 58/01's REVIEW, which is why this exists: three citations of
  // `src/bundle/commands/autonomous.md` named lines 49-81 of a 47-line file, and twelve of
  // fifteen `<symbol> at <module>:<line>` claims were off by +1 to +355 because the modules
  // grew underneath them — two records giving different lines for the SAME export inside one
  // milestone's diff. `TECH_DEBT` item 68 is the ledger; this is the guard that closes it.
  //
  // WHAT THIS DOES NOT DO. It never asserts what a line SAYS, so it cannot go stale the way 52
  // refused; a citation that is in range and on the right export line but describes the wrong
  // thing is out of reach here and stays a reviewer's job (`F-58-01-2`, deferred to item 68).
  {
    name: "arch/58 FF-5810: every path a shipped loop record cites exists and is in range, and every cited defining line is the symbol's own export",
    run: async () => {
      const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
      const names = (await readdir(SHIPPED_LOOPS_DIR)).filter((name) => name.endsWith(".md")).sort();
      assert.ok(names.length >= 16, `non-vacuous: ${names.length} shipped records walked`);

      const lineCounts = new Map();
      const lineCountOf = async (rel) => {
        if (!lineCounts.has(rel)) {
          try {
            lineCounts.set(rel, (await readFile(path.join(repoRoot, rel), "utf8")).split(/\r?\n/).length);
          } catch {
            lineCounts.set(rel, null);
          }
        }
        return lineCounts.get(rel);
      };

      // `export function foo` / `export const foo` / `export class foo`, by name -> 1-based line.
      const exportLines = new Map();
      const exportLineOf = async (rel, symbol) => {
        if (!exportLines.has(rel)) {
          const found = new Map();
          try {
            const lines = (await readFile(path.join(repoRoot, rel), "utf8")).split(/\r?\n/);
            lines.forEach((line, index) => {
              const match = /^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/.exec(line);
              if (match && !found.has(match[1])) found.set(match[1], index + 1);
            });
          } catch { /* an unreadable module is the in-range leg's finding, not this one's */ }
          exportLines.set(rel, found);
        }
        return exportLines.get(rel).get(symbol) ?? null;
      };

      const outOfRange = [];
      const wrongDefiningLine = [];
      let citations = 0;
      let symbolClaims = 0;

      for (const name of names) {
        const text = await readFile(path.join(SHIPPED_LOOPS_DIR, name), "utf8");

        // (a) every `<path>:<line>` or `<path>:<line>-<line>` the record writes.
        for (const match of text.matchAll(/([\w./-]+\.(?:mjs|md|json|js|ts)):(\d+)(?:-(\d+))?/g)) {
          const [, rel, startText, endText] = match;
          if (!rel.startsWith("src/") && !rel.startsWith("scripts/") && !rel.startsWith("ui/")) continue;
          citations += 1;
          const total = await lineCountOf(rel);
          const start = Number(startText);
          const end = endText == null ? start : Number(endText);
          if (total == null) outOfRange.push(`${name}: ${rel} does not exist`);
          else if (start > total || end > total) outOfRange.push(`${name}: ${rel}:${startText}${endText ? `-${endText}` : ""} past EOF (${total} lines)`);
        }

        // (b) every `` `<symbol>` at `<module>:<line>` `` claim, in the two spellings the
        //     records use: backticked symbol then "at", with the module either backticked
        //     whole or split across the "at".
        for (const match of text.matchAll(/`([A-Za-z_$][\w$]*)`[^`]{0,60}?\bat\b[^`]{0,40}?`([\w./-]+\.mjs):(\d+)`/g)) {
          const [, symbol, rel, lineText] = match;
          const actual = await exportLineOf(rel, symbol);
          if (actual == null) continue; // not an exported symbol of that module — (a) still covers the path
          symbolClaims += 1;
          if (actual !== Number(lineText)) wrongDefiningLine.push(`${name}: \`${symbol}\` cited at ${rel}:${lineText}, export is at :${actual}`);
        }
      }

      assert.ok(citations >= 40, `non-vacuous: ${citations} in-repo citations examined`);
      assert.ok(symbolClaims >= 10, `non-vacuous: ${symbolClaims} defining-line claims examined`);
      assert.deepEqual(outOfRange, [], "every cited path exists and every cited line is within it");
      assert.deepEqual(wrongDefiningLine, [], "every cited defining line is the symbol's own export line");
    },
  },
];
