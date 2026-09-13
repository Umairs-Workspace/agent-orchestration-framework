// FF-5801 — THE SUPERVISION VOCABULARY WIDENS ADDITIVELY AND ADMITS NOTHING THAT COULD ACT.
//
// Milestone 58 / story 00. The invariant, from ADR-002, ADR-003 and ADR-004:
//
//   `NODE_KINDS` equals its five frozen literals and is a superset of 57's four;
//   `ADMITTED_KEYS.arbiter` equals its frozen key set and OMITS `actuator`, `measurement`,
//   `cadence` and `ground`; `resolves`, `priority` and `dwell` are required for the kind;
//   `resolves` and `counter` accept and reject IDENTICALLY — both admit a non-empty phrase and
//   refuse every `SENTINEL_TOKENS` member and every reserved field prefix — while `controlled`
//   keeps its distinct pointer-or-phrase rule unchanged; `dwell` admits exactly `cycles:<n≥1>`
//   and `none` and not `unknown`; `LAYER_VALUES` equals its three frozen literals; `layer` is
//   admitted on `kind: loop` ONLY and is NOT required; `ENDPOINT_SCHEMES` gains exactly
//   `arbiter`; no sixth edge key and no `dead-band` key exists in any admitted set; and every one
//   of the FOURTEEN records shipped before 58 parses with zero new findings.
//
// WHY THE COMPATIBILITY LEG IS OVER THE CORPUS AND NOT OVER AN EXAMPLE. The fourteen records under
// `src/bundle/loops/` are the framework's own declaration of how it improves itself, installed into
// every project that runs aof. A widening that re-classified one of them, or raised a single new
// finding against one, would break the thing this milestone exists to make trustworthy while
// claiming to strengthen it. The oracle is the signature milestone 57 froze over ELEVEN of them
// (`acd-watcher-taxonomy-additive.test.mjs:40-59`, authored before this story and untouched by it):
// the fourteen-record signature must equal it exactly, which says both that nothing new appeared
// and that the three watcher records still contribute nothing.
//
// WHY `LAYER_VALUES` IS ASSERTED AGAINST THE SOURCE LINE RATHER THAN AN EXPORT. Milestone 52's
// delivered `00_frozen-vocabulary.feature:22` requires that "no twelfth set is exported", and a
// delivered acceptance criterion is immutable. 57 hit this exactly once before and answered it the
// same way for `DETERMINISM_VALUES`; this is that precedent applied, not a new one. The BEHAVIOUR
// of the three literals is then decided over the loader, so the source match is a claim about the
// home rather than the only evidence the enum is closed.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMITTED_KEYS, EDGE_KEYS, ENDPOINT_SCHEMES, NODE_KINDS, POINTER_SCHEMES, SENTINEL_TOKENS,
  loadLoops,
} from "../../../src/work/loops.mjs";
import { withLoopRegistry } from "../../support/loop-registry-fixture.mjs";
import { withShippedRegistry } from "../../support/registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
// `reporting` is 59/ADR-001 §3's sixth edge key. 58's claim — an arbiter's admitted set is its three
// declarations plus THE EDGE KEYS, whatever they are — is unchanged by the widening and is restated
// against the whole set rather than against 58's five, so a member dropped still fails.
const EDGES = Object.freeze(["data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting"]);
const PRIOR_KINDS = Object.freeze(["loop", "actor", "anchor", "watcher"]);
// 59/ADR-001 §1 — the sixth kind, appended after the arbiter and deleting nothing.
const LATER_KINDS = Object.freeze(["auditor"]);
const ARBITER_KEYS = Object.freeze(["id", "kind", "title", "resolves", "priority", "dwell", ...EDGES]);
const CANNOT_ACT = Object.freeze(["actuator", "measurement", "cadence", "ground"]);

// The signature milestone 57 froze over the ELEVEN records that existed then — copied here as the
// oracle for "zero new findings", and deliberately not re-derived: an oracle re-measured from the
// tree it is measuring proves nothing. `path.basename : code : the key the message names`.
const PRE_58_SIGNATURE = Object.freeze([
  "autonomous-cascade.md:loop-field-prose-only:actuator",
  "autonomous-cascade.md:loop-owner-unknown:owner",
  "build-to-green.md:loop-field-prose-only:reference",
  "build-to-green.md:loop-field-prose-only:measurement",
  "build-to-green.md:loop-field-prose-only:actuator",
  "build-to-green.md:loop-owner-unknown:owner",
  "mesh-assignment-reclaim.md:loop-owner-unknown:owner",
  "retrospective-memory-ingest.md:loop-field-prose-only:reference",
  "retrospective-memory-ingest.md:loop-field-prose-only:measurement",
  "retrospective-memory-ingest.md:loop-owner-unknown:owner",
  "review-fix-rereview.md:loop-field-prose-only:reference",
  "review-fix-rereview.md:loop-field-prose-only:measurement",
  "review-fix-rereview.md:loop-field-prose-only:actuator",
  "review-fix-rereview.md:loop-owner-unknown:owner",
  "run-resilience.md:loop-owner-unknown:owner",
  "verify-triage-accept.md:loop-field-prose-only:reference",
  "verify-triage-accept.md:loop-field-prose-only:measurement",
  "verify-triage-accept.md:loop-field-prose-only:actuator",
]);

// THE FOURTEEN RECORDS SHIPPED BEFORE 58 — NAMED, not counted. The whole directory was the same
// corpus only until 58/01 landed the reference hierarchy, which adds `run-lifecycle-policy.md` and
// `speed-thoroughness-autonomy.md` to it; a `null` seed would then be measuring a moving set while
// claiming to measure a fixed one. The seed is the claim, and the helper closes it under the
// endpoints these fourteen declare — after 58/01 that pulls the arbiter in through `operator.md`'s
// new edge, which is exactly what the closure is for (FF-5809).
const PRE_58_RECORDS = Object.freeze([
  "autonomous-cascade-watcher.md",
  "autonomous-cascade.md",
  "build-to-green-watcher.md",
  "build-to-green.md",
  "mesh-assignment-reclaim.md",
  "operator.md",
  "product-owner.md",
  "retrospective-memory-ingest.md",
  "review-fix-rereview-watcher.md",
  "review-fix-rereview.md",
  "rubric-process-exit.md",
  "run-liveness.md",
  "run-resilience.md",
  "verify-triage-accept.md",
]);

const signatureOf = (model, only = null) => model.findings.filter((finding) =>
  only === null || only.includes(path.basename(finding.path))).map((finding) => {
  const key = ["reference", "measurement", "actuator", "owner", "ceiling", "counter", "observes", "resolves", "dwell", "layer"]
    .find((candidate) => finding.message.startsWith(candidate)) ?? "?";
  return `${path.basename(finding.path)}:${finding.code}:${key}`;
});

const render = (stem, fields) => `---\n${Object.entries(fields)
  .filter(([, value]) => value !== null)
  .map(([key, value]) => `${value === "" ? `${key}:` : `${key}: ${value}`}\n`)
  .join("")}---\n# ${stem}\n`;

const arbiter = (stem, overrides = {}) => render(stem, {
  id: `arbiter:${stem}`,
  kind: "arbiter",
  title: stem,
  resolves: "which loop wins the shared agent",
  priority: "[loop:alpha]",
  dwell: "cycles:2",
  ...overrides,
});

const watcher = (stem, overrides = {}) => render(stem, {
  id: `watcher:${stem}`,
  kind: "watcher",
  title: stem,
  counter: "contract changes",
  determinism: "counter",
  measurement: "[module:src/work/loops.mjs#loadLoops]",
  ...overrides,
});

const loop = (stem, overrides = {}) => render(stem, {
  id: `loop:${stem}`,
  kind: "loop",
  title: stem,
  controlled: "attempt count",
  reference: "[module:src/run-store.mjs#isRetryable]",
  measurement: "[module:src/run-store.mjs#attempts]",
  actuator: "[command:work:next]",
  cadence: "event:per-item",
  ceiling: "none",
  owner: "actor:product-owner",
  optimizing: "false",
  ...overrides,
});

/** The codes one record's findings carry, in order. */
const codesFor = (model, filename) =>
  model.findings.filter((finding) => path.basename(finding.path) === filename).map((finding) => finding.code);

/** Load one authored record and return its code array — the shared driver for the value legs. */
async function codesOf(filename, text) {
  return withLoopRegistry({ [filename]: text }, async (fixture) => codesFor(await loadLoops(fixture.workDir), filename));
}

export const archTests = [
  {
    name: "arch/58 FF-5801: the fifth kind widens the vocabulary additively and admits nothing that could act",
    run: async () => {
      const loaderSource = await readFile(path.join(root, "src", "work", "loops.mjs"), "utf8");

      // ——— the frozen literals ———————————————————————————————————————————————————————
      assert.deepEqual([...NODE_KINDS], [...PRIOR_KINDS, "arbiter", ...LATER_KINDS],
        "the arbiter is the fifth literal, still appended after 57's four and still present after 59's sixth");
      for (const kind of PRIOR_KINDS) assert.equal(NODE_KINDS.has(kind), true, `${kind}: a superset of 57's four`);
      assert.deepEqual([...ADMITTED_KEYS.arbiter].sort(), [...ARBITER_KEYS].sort());
      for (const key of CANNOT_ACT) {
        assert.equal(ADMITTED_KEYS.arbiter.has(key), false, `an arbiter admits no ${key}`);
        assert.equal(ADMITTED_KEYS.all.has(key), true, `…and ${key} is still a key SOME kind admits, so the omission is per-kind and not a deletion`);
      }
      assert.deepEqual([...EDGE_KEYS], [...EDGES],
        "the edge keys are exactly the frozen set — 58 added none, and 59/ADR-001 §3 added `reporting` and no seventh");
      assert.deepEqual([...ENDPOINT_SCHEMES], ["loop", "actor", "item", "command", "config", "module", "arbiter"],
        "the endpoint vocabulary gains exactly `arbiter` — no watcher, no anchor");
      assert.match(loaderSource, /const LAYER_VALUES = frozenSet\("operational", "management", "governance"\);/u,
        "LAYER_VALUES equals its three frozen literals, in the loader and nowhere else");
      assert.equal("LAYER_VALUES" in (await import("../../../src/work/loops.mjs")), false,
        "…and it is NOT exported: 52's delivered `00_frozen-vocabulary.feature:22` says no twelfth set is, and 57 answered this the same way for DETERMINISM_VALUES");

      // `dead-band` (ADR-004 §5) exists in NO admitted set. A refusal recorded as a sentence in an
      // ADR is a refusal that the next author widens by accident; this is the same refusal as a
      // control, and it is what makes "an empty field is not honesty" enforceable.
      for (const kind of [...NODE_KINDS, "all"]) {
        assert.equal(ADMITTED_KEYS[kind].has("dead-band"), false, `${kind}: no dead-band key`);
      }
      // EVERY declared kind has its own admitted-key set, and every one of its keys is in the
      // union — derived from `NODE_KINDS`, so a sixth kind with no set of its own fails here.
      assert.deepEqual(Object.keys(ADMITTED_KEYS).sort(), ["all", ...NODE_KINDS].sort());
      for (const kind of NODE_KINDS) {
        for (const key of ADMITTED_KEYS[kind]) assert.equal(ADMITTED_KEYS.all.has(key), true, `${kind}/${key}`);
      }
      // The three new keys and the layer axis land where the ADRs put them and nowhere else.
      for (const key of ["resolves", "priority", "dwell"]) {
        assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has(key)), ["arbiter"], key);
      }
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("layer")), ["loop"], "layer");

      // The frozen collections refuse a runtime widening — the language primitive, not only the
      // public override (52/RETROSPECTIVE R1: "a frozen collection contract must probe the
      // language primitive").
      for (const set of [NODE_KINDS, EDGE_KEYS, ENDPOINT_SCHEMES, ADMITTED_KEYS.arbiter, ADMITTED_KEYS.all]) {
        const before = [...set];
        set.add("not-admitted");
        set.delete(before[0]);
        set.clear();
        assert.deepEqual([...set], before, "frozen against add, delete and clear alike");
        assert.equal(Object.isFrozen(set), true);
      }
      assert.equal(Object.isFrozen(ADMITTED_KEYS), true);
    },
  },

  {
    name: "arch/58 FF-5801: the three declarations are required, and `layer` deliberately is not",
    run: async () => {
      for (const field of ["id", "kind", "title", "resolves", "priority", "dwell"]) {
        const codes = await codesOf("subject.md", arbiter("subject", { [field]: null }));
        assert.deepEqual(codes, ["loop-missing-field"], `${field}: required for the kind`);
      }
      // `layer` IS NOT REQUIRED, and that is the load-bearing choice (ADR-002 §1): making it a
      // required KEY would redden all seven shipped loop records the instant this schema landed,
      // before a single one had been rewritten. The requirement is COMPUTED by a later story's
      // check instead — which is a different lane, and this control is what pins the difference.
      assert.deepEqual(await codesOf("alpha.md", loop("alpha")), [], "a loop declaring no layer is read clean");
      assert.deepEqual(await codesOf("alpha.md", loop("alpha", { layer: "management" })), [], "…and one declaring a layer is read clean too");
    },
  },

  {
    name: "arch/58 FF-5801: `resolves` and `counter` accept and reject identically, and `controlled` keeps its own rule",
    run: async () => {
      // The corpus is DERIVED from the two vocabularies the rule is stated against, not typed: a
      // hand-listed corpus that missed a sentinel would agree with a loader that missed the same
      // one. Reserved prefixes are the three pointer schemes plus `prose:`, cross-checked against
      // the loader's own line so the derivation cannot drift from the constant it mirrors.
      const loaderSource = await readFile(path.join(root, "src", "work", "loops.mjs"), "utf8");
      const reserved = [...[...POINTER_SCHEMES].map((scheme) => `${scheme}:`), "prose:"];
      assert.match(
        loaderSource,
        /const RESERVED_FIELD_PREFIXES = Object\.freeze\(\["module:", "command:", "config:", "prose:"\]\);/u,
        "the reserved prefixes this corpus is derived from are the loader's own four",
      );
      assert.deepEqual(reserved.sort(), ["command:", "config:", "module:", "prose:"]);

      // A WELL-FORMED pointer per prefix, so the parity claim is about the PREFIX RULE and not
      // about a malformed operand both keys would refuse for a different reason.
      const pointerFor = (prefix) => ({
        "module:": "module:src/work/loops.mjs#loadLoops",
        "command:": "command:work:next",
        "config:": "config:work.loop.reviewRounds",
        "prose:": "prose:src/bundle/agents/aof-developer.md",
      })[prefix];

      const corpus = [
        ...[...SENTINEL_TOKENS].map((token) => ({ value: token, why: "a sentinel" })),
        ...reserved.map((prefix) => ({ value: pointerFor(prefix), why: "a reserved prefix" })),
        { value: "", why: "an empty value" },
        { value: "which loop wins the shared agent", why: "a phrase" },
        { value: "speed vs thoroughness: whose demand wins", why: "a phrase carrying a colon" },
      ];

      for (const { value, why } of corpus) {
        const asResolves = await codesOf("trade-off.md", arbiter("trade-off", { resolves: value }));
        const asCounter = await codesOf("sentry.md", watcher("sentry", { counter: value }));
        assert.deepEqual(asResolves, asCounter, `${why} "${value}": every value either key admits, the other admits`);
      }
      // NON-VACUITY: the corpus really does contain both outcomes, so the equality above is not
      // two empty arrays agreeing.
      assert.deepEqual(await codesOf("trade-off.md", arbiter("trade-off", { resolves: "which loop wins the shared agent" })), []);
      assert.deepEqual(await codesOf("trade-off.md", arbiter("trade-off", { resolves: "unknown" })), ["loop-bad-value"]);
      assert.deepEqual(await codesOf("trade-off.md", arbiter("trade-off", { resolves: "config:work.loop.reviewRounds" })), ["loop-bad-value"]);

      // AND `controlled` KEEPS ITS DISTINCT POINTER-OR-PHRASE RULE UNCHANGED. This is the clause
      // that stops the "one branch, not two copies" refactor from quietly collapsing three rules
      // into one: `controlled` admits what `resolves` refuses.
      for (const prefix of reserved) {
        const value = pointerFor(prefix);
        assert.deepEqual(await codesOf("alpha.md", loop("alpha", { controlled: value })), prefix === "prose:" ? ["loop-field-prose-only"] : [],
          `controlled admits ${prefix}, which resolves refuses`);
        assert.deepEqual(await codesOf("trade-off.md", arbiter("trade-off", { resolves: value })), ["loop-bad-value"],
          `…and resolves really does refuse ${prefix}, so the contrast is between two live rules`);
      }
      assert.deepEqual(await codesOf("alpha.md", loop("alpha", { controlled: "attempt count" })), [], "…and a phrase besides");
      assert.deepEqual(await codesOf("alpha.md", loop("alpha", { controlled: "unknown" })), ["loop-bad-value"], "…while a sentinel is refused on all three keys alike");
    },
  },

  {
    name: "arch/58 FF-5801: `dwell` admits exactly a count of cycles at or above one, or none",
    run: async () => {
      for (const value of ["cycles:1", "cycles:2", "cycles:12", "cycles:99", "none"]) {
        assert.deepEqual(await codesOf("trade-off.md", arbiter("trade-off", { dwell: value })), [], value);
      }
      for (const value of ["cycles:0", "cycles:-1", "cycles:", "cycles", "cycles:2.5", "cycles:two", "2", "periodic:2", "uncapped", "unknown", ""]) {
        assert.deepEqual(await codesOf("trade-off.md", arbiter("trade-off", { dwell: value })), ["loop-bad-value"], value);
      }
      // `unknown` IS REFUSED WHILE IT REMAINS A MEMBER OF THE SENTINEL VOCABULARY (ADR-004 §3):
      // the sentinel exists for facts the repository does not supply, and a dwell is a policy its
      // author chooses. A field whose author may write "I do not know" in place of a decision is a
      // field that records the evening's mood, so the refusal is the feature.
      assert.equal(SENTINEL_TOKENS.has("unknown"), true, "the sentinel is still in the vocabulary…");
      assert.deepEqual(await codesOf("alpha.md", loop("alpha", { cadence: "unknown" })), ["loop-cadence-unknown"],
        "…and still admitted where a fact CAN be absent, which is what makes the dwell's refusal a decision rather than a gap");
    },
  },

  {
    name: "arch/58 FF-5801: every one of the fourteen records shipped before 58 parses with zero new findings",
    run: async () => {
      await withShippedRegistry(PRE_58_RECORDS, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(fixture.seeds.length, 14, "the fourteen records shipped before 58 are the corpus this claim is about");
        assert.equal(model.nodes.length, fixture.names.length, `every record of the closed fixture is parsed (added: ${fixture.added.join(", ") || "none"})`);
        const pre58 = model.nodes.filter((node) => PRE_58_RECORDS.includes(path.basename(node.path)));
        assert.equal(pre58.length, 14, "and all fourteen are among them");
        // THE ORACLE IS 57's, NOT A RE-MEASUREMENT. The signature over the fourteen equals the one
        // milestone 57 froze over eleven — which says two things at once: nothing new appeared on
        // any record, and the three watcher records still contribute nothing at all.
        assert.deepEqual(signatureOf(model, PRE_58_RECORDS), [...PRE_58_SIGNATURE],
          "each reports the same finding codes, in the same counts, as it did before the widening");
        // The prose-only and owner-unknown warnings carried since milestone 52 are neither
        // silenced nor multiplied — counted, because "unchanged" is a claim about NUMBER as much
        // as about presence.
        const own = model.findings.filter((finding) => PRE_58_RECORDS.includes(path.basename(finding.path)));
        const counted = (code) => own.filter((finding) => finding.code === code).length;
        assert.equal(counted("loop-field-prose-only"), 12);
        assert.equal(counted("loop-owner-unknown"), 6);
        assert.equal(own.length, 18, "and nothing else at all");
        assert.deepEqual(model.findings.filter((finding) => finding.severity === "error"), [], "no error-severity finding anywhere in the closed fixture");
        // NONE OF THE FOUR PRIOR KINDS IS RE-CLASSIFIED as the kind this story adds.
        const byKind = {};
        for (const node of pre58) byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
        assert.deepEqual(byKind, { loop: 7, actor: 2, anchor: 2, watcher: 3 },
          "seven loops, two actors, two anchors, three watchers — every pre-58 record keeps the kind it had");
      });
    },
  },
];
