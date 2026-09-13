// FF-5901 — THE AUDITOR VOCABULARY WIDENS ADDITIVELY AND ADMITS NOTHING THAT COULD ACT.
//
// Milestone 59 / story 00. The invariant, from ADR-001:
//
//   `NODE_KINDS` equals its SIX frozen literals and is a superset of 58's five;
//   `ADMITTED_KEYS.auditor` equals its frozen key set and OMITS `actuator`, `optimizing`,
//   `controlled`, `reference`, `ground`, `counter`, `determinism`, `layer`, `owner` and `ceiling`;
//   `audits`, `measurement`, `cadence` and `escalation` are required for the kind; `audits` refuses
//   an `item:` endpoint; an auditor's `measurement` refuses every `prose:` pointer while `loop` and
//   `watcher` keep theirs; `EDGE_KEYS` gains exactly `reporting` and no seventh; an auditor declares
//   `data-feed` and `reporting` and NO OTHER edge (ADR-001 §5a); `ENDPOINT_SCHEMES` is UNCHANGED, so
//   no record may point at an auditor; and every one of the SIXTEEN records shipped before 59 parses
//   with zero new findings, in the same codes and the same counts.
//
// WHY THE OUTBOUND EDGE SET IS PART OF THIS GATE AND NOT A CONVENTION. `checkPairing`
// (`src/work/loops-checks.mjs:409-412`) adds EVERY source's `monitoring` endpoint to its `paired`
// set — the predicate reads the edge, not the source's kind — so an auditor declaring
// `monitoring: [loop:x]` would clear that loop's `loop-unpaired-optimizer`, a `GATING_CODES` member,
// **by auditing it**: the audit buying the green gate it exists to report on, and FF-5910's "zero
// gating findings" passing for the wrong reason. `target-setting` would make the auditor an owner of
// some loop's reference, and `veto` / `parameter-tuning` would make it an arbiter of what it audits.
// All four are refused at the ENDPOINT with the loader's existing `loop-bad-value`; the keys stay in
// `ADMITTED_KEYS.auditor`, which this gate asserts as an equality, so the refusal is decided on the
// model rather than by shrinking a frozen set.
//
// WHY THE OMISSIONS ARE THE HEADLINE. A watcher's absent `actuator` is the strongest thing 57
// shipped — a node with no vocabulary for acting cannot claim to act on what it watches, and it
// costs nothing to enforce because the key is simply not admitted for the kind. The arbiter repeated
// it for four keys; the auditor repeats it for ten, and each names a specific way the audit could
// stop being independent. Every one is refused by the loader's EXISTING
// `loop-key-not-admitted-for-kind`, so `LOADER_FINDING_CODES` does not grow — which this gate
// asserts against the array itself rather than against the cases below.
//
// WHY `determinism` IS NOT ADMITTED, AND WHAT REPLACES IT. It would have exactly one legal value
// (ADR-001 §2), so it would be an enum that says nothing and could later be widened to admit a
// judge. The same guarantee is bought by refusing a `prose:` measurement: a prose authority means a
// person or a model read something and reported it, which is the agent-as-judge auditing this
// milestone puts out of scope, wearing a machine's clothes. That refusal is therefore asserted here
// as a RULE ON A FIELD rather than as an absent enum, and it is asserted BESIDE a loop and a watcher
// carrying the same value, because the claim is a difference between kinds and not a difference
// between values.
//
// WHY THE COMPATIBILITY LEG IS OVER THE CORPUS AND NOT OVER AN EXAMPLE — 58's reason, unchanged.
// The sixteen records under `src/bundle/loops/` are the framework's own declaration of how it
// improves itself, installed into every project that runs aof. The oracle is the signature milestone
// 57 froze over ELEVEN of them and 58 re-used over fourteen, copied here rather than re-measured: an
// oracle re-derived from the tree it is measuring proves nothing. The sixteen-record signature must
// equal it EXACTLY, which says three things at once — nothing new appeared on any record, the two
// records 58/01 added still contribute nothing, and no record was re-classified into the kind this
// story adds.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMITTED_KEYS, EDGE_KEYS, ENDPOINT_SCHEMES, FIELD_KINDS, LOADER_FINDING_CODES, NODE_KINDS,
  POINTER_SCHEMES, SENTINEL_TOKENS, loadLoops,
} from "../../../src/work/loops.mjs";
import { withLoopRegistry } from "../../support/loop-registry-fixture.mjs";
import { withShippedRegistry } from "../../support/registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const EDGES = Object.freeze([
  "data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting",
]);
const PRIOR_KINDS = Object.freeze(["loop", "actor", "anchor", "watcher", "arbiter"]);
const AUDITOR_KEYS = Object.freeze([
  "id", "kind", "title", "audits", "measurement", "cadence", "escalation", ...EDGES,
]);
const AUDITOR_REQUIRED = Object.freeze(["audits", "measurement", "cadence", "escalation"]);
// ADR-001 §5a — the auditor's outbound edge set, and its complement. Both are stated, and their union
// is asserted against `EDGE_KEYS`, so a seventh edge key cannot arrive without a ruling for it.
const AUDITOR_ADMITS_EDGE = Object.freeze(["data-feed", "reporting"]);
const AUDITOR_REFUSES_EDGE = Object.freeze(["target-setting", "veto", "parameter-tuning", "monitoring"]);
// ADR-001 §2's table, one entry per row. Each is a specific way the audit could stop being
// independent: acting on what it found, driving a metric, holding a setpoint, grounding itself,
// being a watcher, sitting on the supervision axis, or carrying an accountability that is not its.
const CANNOT_ACT = Object.freeze([
  "actuator", "optimizing", "controlled", "reference", "ground", "counter", "determinism",
  "layer", "owner", "ceiling",
]);
// The seventeen codes a load could emit before this milestone. 59 adds none.
const PRE_59_CODES = Object.freeze([
  "loop-record-unparseable", "loop-missing-field", "loop-bad-value", "loop-expected-list",
  "loop-expected-scalar", "loop-empty-list", "loop-unknown-key", "loop-key-not-admitted-for-kind",
  "loop-malformed-frontmatter-line", "loop-id-mismatch", "loop-graph-dangling-endpoint",
  "loop-owner-unknown", "loop-cadence-unknown", "loop-ceiling-unknown", "loop-ceiling-uncapped",
  "loop-ceiling-pointer-unresolved", "loop-field-prose-only",
]);

// THE SIXTEEN RECORDS SHIPPED BEFORE 59 — NAMED, not counted. A `null` seed would measure a moving
// set while claiming to measure a fixed one, which is precisely what breaks the moment 59/04 ships
// the day-one auditor into this directory.
const PRE_59_RECORDS = Object.freeze([
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
  "run-lifecycle-policy.md",
  "run-liveness.md",
  "run-resilience.md",
  "speed-thoroughness-autonomy.md",
  "verify-triage-accept.md",
]);

// The signature milestone 57 froze over the eleven records that existed then and 58 re-used over
// fourteen — copied, never re-derived. `path.basename : code : the key the message names`.
const PRE_59_SIGNATURE = Object.freeze([
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

const signatureOf = (model, only) => model.findings
  .filter((finding) => only.includes(path.basename(finding.path)))
  .map((finding) => {
    const key = ["reference", "measurement", "actuator", "owner", "ceiling", "counter", "observes",
      "resolves", "dwell", "layer", "audits", "escalation", "checked"]
      .find((candidate) => finding.message.startsWith(candidate)) ?? "?";
    return `${path.basename(finding.path)}:${finding.code}:${key}`;
  });

const render = (stem, fields) => `---\n${Object.entries(fields)
  .filter(([, value]) => value !== null)
  .map(([key, value]) => `${key}: ${value}\n`)
  .join("")}---\n# ${stem}\n`;

const auditor = (stem, overrides = {}) => render(stem, {
  id: `auditor:${stem}`,
  kind: "auditor",
  title: stem,
  audits: "[module:src/work/loops-checks.mjs#checkGrounding]",
  measurement: "[command:work:doctor]",
  cadence: "event:per-milestone",
  escalation: "actor:operator",
  ...overrides,
});
const actor = (stem) => render(stem, { id: `actor:${stem}`, kind: "actor", title: stem, ground: "exogenous" });
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
const watcher = (stem, overrides = {}) => render(stem, {
  id: `watcher:${stem}`,
  kind: "watcher",
  title: stem,
  counter: "contract changes",
  determinism: "counter",
  measurement: "[command:work:ratchet]",
  ...overrides,
});

const codesOf = (model, name) => model.findings
  .filter((finding) => path.basename(finding.path) === name)
  .map((finding) => finding.code);
const messagesOf = (model, name) => model.findings
  .filter((finding) => path.basename(finding.path) === name)
  .map((finding) => finding.message);
const nodeOf = (model, name) => model.nodes.find((node) => path.basename(node.path) === name);

async function overRegistry(files, run) {
  return withLoopRegistry(files, async (fixture) => run(await loadLoops(fixture.workDir)));
}

export const archTests = [
  {
    name: "arch/59 FF-5901: the sixth kind widens the vocabulary additively and admits nothing that could act",
    run: async () => {
      // ——— the frozen literals —————————————————————————————————————————————————————
      assert.deepEqual([...NODE_KINDS], [...PRIOR_KINDS, "auditor"], "six frozen literals, the sixth appended");
      for (const kind of PRIOR_KINDS) assert.equal(NODE_KINDS.has(kind), true, `${kind}: a superset of 58's five`);
      assert.deepEqual([...ADMITTED_KEYS.auditor].sort(), [...AUDITOR_KEYS].sort(), "the auditor's frozen key set");
      assert.deepEqual([...EDGE_KEYS], [...EDGES], "exactly `reporting` is gained, and no seventh edge key");
      assert.equal(EDGE_KEYS.size, 6, "…six, counted as well as named");

      // ——— the ten omissions, decided over the vocabulary ————————————————————————————
      for (const key of CANNOT_ACT) {
        assert.equal(ADMITTED_KEYS.auditor.has(key), false, `an auditor admits no ${key}`);
        assert.equal(ADMITTED_KEYS.all.has(key), true,
          `…and ${key} is still a key SOME kind admits, so the omission is per-kind and not a deletion`);
      }
      assert.equal(CANNOT_ACT.length, 10, "ADR-001 §2's table is ten rows, and every one is asserted");
      // `determinism` IS THE ONE WORTH SAYING TWICE: it is omitted here and NOT replaced by an enum
      // of its own, so the guarantee has to be bought on `measurement` — which the behavioural leg
      // below is. A future milestone that admitted `determinism` on the auditor would fail here.
      assert.equal(ADMITTED_KEYS.auditor.has("determinism"), false, "no determinism enum on the auditor");
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("determinism")), ["watcher"],
        "…and it stays the watcher's alone");

      // ——— `ENDPOINT_SCHEMES` IS UNCHANGED ——————————————————————————————————————————
      // 58/ADR-003 §6's precedent: widen the endpoint vocabulary only for an edge actually declared.
      // Nothing points AT an auditor, so an auditor is a SOURCE and never a target — which is the
      // structural form of "nothing in the machinery can supervise the audit into silence".
      assert.deepEqual([...ENDPOINT_SCHEMES], ["loop", "actor", "item", "command", "config", "module", "arbiter"],
        "the endpoint vocabulary is what 58 left — no auditor, no watcher, no anchor");
      assert.equal(ENDPOINT_SCHEMES.has("auditor"), false, "`auditor:` is not an admissible endpoint");

      // ——— NO NEW FINDING CODE ——————————————————————————————————————————————————————
      assert.deepEqual([...LOADER_FINDING_CODES], [...PRE_59_CODES],
        "the loader's frozen code array did not grow — every refusal this milestone adds is an existing code");

      // ——— the sets are frozen ——————————————————————————————————————————————————————
      for (const set of [NODE_KINDS, EDGE_KEYS, ENDPOINT_SCHEMES, ADMITTED_KEYS.auditor, ADMITTED_KEYS.all]) {
        const before = [...set];
        set.add("not-admitted");
        set.delete(before[0]);
        set.clear();
        assert.deepEqual([...set], before, "the vocabulary cannot be widened or narrowed at runtime");
      }
      assert.equal(Object.isFrozen(ADMITTED_KEYS), true);
      // The union is DERIVED from the kind vocabulary, so a seventh kind with no set of its own
      // fails here rather than silently admitting nothing.
      assert.deepEqual(Object.keys(ADMITTED_KEYS).sort(), ["all", ...NODE_KINDS].sort());
      for (const kind of NODE_KINDS) {
        for (const key of ADMITTED_KEYS[kind]) assert.equal(ADMITTED_KEYS.all.has(key), true, `${kind}/${key}`);
      }
      // The two keys this story adds land on ONE kind each.
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("audits")), ["auditor"], "audits");
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("escalation")), ["auditor"], "escalation");
    },
  },

  {
    name: "arch/59 FF-5901: the four declarations are required, and the ten omissions are refused by the existing code",
    run: async () => {
      // REQUIRED, decided by loading a record without each — a required-key list is only a claim
      // about the loader if the loader is the thing asked.
      for (const key of AUDITOR_REQUIRED) {
        await overRegistry({ "gates.md": auditor("gates", { [key]: null }) }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), ["loop-missing-field"], `${key}: required`);
          assert.equal(messagesOf(model, "gates.md")[0], `Required field is missing: ${key}`, key);
        });
      }
      await overRegistry({ "gates.md": auditor("gates") }, (model) => {
        assert.deepEqual(model.findings, [], "…and the complete record raises nothing");
        assert.equal(nodeOf(model, "gates.md").kind, "auditor");
      });
      // `id`, `kind` and `title` are required of every kind and of this one too — the identity
      // triple is not something a new kind may opt out of.
      for (const key of ["id", "kind", "title"]) {
        await overRegistry({ "gates.md": auditor("gates", { [key]: null }) }, (model) => {
          assert.ok(codesOf(model, "gates.md").includes("loop-missing-field"), `${key}: required`);
        });
      }

      // THE TEN OMISSIONS, THROUGH THE LOADER, with the EXISTING code and no other finding.
      for (const [key, value] of Object.entries({
        actuator: "[command:work:next]",
        optimizing: "false",
        controlled: "the gates",
        reference: "[module:src/work/loops.mjs#loadLoops]",
        ground: "exogenous",
        counter: "contract changes",
        determinism: "counter",
        layer: "operational",
        owner: "actor:product-owner",
        ceiling: "none",
      })) {
        await overRegistry({ "gates.md": auditor("gates", { [key]: value }) }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), ["loop-key-not-admitted-for-kind"], `${key}: one slip, one finding`);
          assert.equal(messagesOf(model, "gates.md")[0], `Key ${key} is not admitted for kind auditor`, key);
          const node = nodeOf(model, "gates.md");
          assert.equal(key in node.fields, false, `${key}: not parsed onto the node`);
          assert.equal(key in node.edges, false, `${key}: nor onto its edges`);
        });
      }
      assert.equal(CANNOT_ACT.length, Object.keys({
        actuator: 0, optimizing: 0, controlled: 0, reference: 0, ground: 0,
        counter: 0, determinism: 0, layer: 0, owner: 0, ceiling: 0,
      }).length, "the driven set and the declared set are the same ten");
    },
  },

  {
    name: "arch/59 FF-5901: `audits` refuses an item endpoint, and an auditor's measurement refuses every prose authority",
    run: async () => {
      // `audits` ADMITS THE INSTRUMENT SCHEMES AND REFUSES `item:`. A work item IS the work, and
      // stating the subject is what makes "the audit does not review the work" checkable.
      const neighbours = { "alpha.md": loop("alpha"), "sentry.md": watcher("sentry"), "operator.md": actor("operator") };
      for (const raw of [
        "module:src/work/loops-checks.mjs#checkGrounding",
        "command:work:doctor",
        "config:work.audit.anchorStaleDays",
        "loop:alpha",
        "watcher:sentry",
      ]) {
        await overRegistry({ ...neighbours, "gates.md": auditor("gates", { audits: `[${raw}]` }) }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), [], `${raw}: admitted as an instrument`);
          assert.equal(FIELD_KINDS.has(nodeOf(model, "gates.md").fields.audits[0].kind), true, raw);
        });
      }
      for (const raw of ["item:59/00", "item:59", "prose:docs/evidence.md", "instrument:the-gates", "unknown"]) {
        await overRegistry({ ...neighbours, "gates.md": auditor("gates", { audits: `[${raw}]` }) }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), ["loop-bad-value"], `${raw}: refused`);
          assert.equal(messagesOf(model, "gates.md")[0], `Invalid value for audits: ${raw}`, `${raw}: naming the audits key`);
          assert.equal("audits" in nodeOf(model, "gates.md").fields, false, raw);
        });
      }
      // ONE SLUG GRAMMAR FOR EVERY REGISTRY SCHEME. `loop:`, `watcher:` and `anchor:` all name a
      // record in this directory, so `splitUri` holds all three to the same id shape. Measured: with
      // `watcher` and `anchor` outside `INTRA_REGISTRY_SCHEMES` an `audits: [watcher:bad slug]` is
      // ADMITTED as an instrument — an id with a space that no record can ever have — so this leg is
      // the only thing standing between the widening and a silent revert.
      for (const raw of ["anchor:bad_slug", "watcher:bad slug", "anchor:-leading-dash", "loop:bad_slug"]) {
        await overRegistry({ ...neighbours, "gates.md": auditor("gates", { audits: `[${raw}]` }) }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), ["loop-bad-value"], `${raw}: refused`);
          assert.equal("audits" in nodeOf(model, "gates.md").fields, false, raw);
        });
      }
      // …AND A WELL-FORMED ID OF EACH OF THE THREE IS ADMITTED, so the grammar decides a shape
      // rather than refusing the scheme.
      for (const raw of ["loop:alpha", "watcher:sentry", "anchor:gauge-2"]) {
        await overRegistry({ ...neighbours, "gates.md": auditor("gates", { audits: `[${raw}]` }) }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), [], `${raw}: admitted`);
          assert.equal(nodeOf(model, "gates.md").fields.audits[0].kind, "ref", raw);
        });
      }

      // NON-VACUITY FOR THE `item:` ROW SPECIFICALLY: it is an admissible endpoint everywhere else,
      // so its refusal here is a decision about `audits` and not about the scheme being unknown.
      assert.equal(ENDPOINT_SCHEMES.has("item"), true);
      await overRegistry({ "alpha.md": loop("alpha", { "data-feed": "[item:59/00]" }), "operator.md": actor("operator") }, (model) => {
        assert.deepEqual(codesOf(model, "alpha.md"), [], "a loop may still feed on a work item");
      });

      // AN AUDITOR'S MEASUREMENT REFUSES EVERY `prose:` POINTER, while a loop and a watcher keep
      // theirs — the same value, three kinds, in ONE load, so the claim is a difference between
      // kinds. This is what stands in for the `determinism` enum the kind deliberately omits.
      const document = "prose:src/bundle/commands/verify.md";
      await overRegistry({
        "operator.md": actor("operator"),
        "alpha.md": loop("alpha", { measurement: `[${document}]` }),
        "sentry.md": watcher("sentry", { measurement: `[${document}]` }),
        "gates.md": auditor("gates", { measurement: `[${document}]` }),
      }, (model) => {
        for (const name of ["alpha.md", "sentry.md"]) {
          assert.deepEqual(codesOf(model, name), ["loop-field-prose-only"], `${name}: keeps the prose it is allowed`);
          assert.equal(model.findings.find((finding) => path.basename(finding.path) === name).severity, "warn", name);
          assert.equal(nodeOf(model, name).fields.measurement[0].kind, "prose", `${name}: and it reaches the model`);
        }
        assert.deepEqual(codesOf(model, "gates.md"), ["loop-bad-value"], "the auditor's is refused outright");
        assert.equal(model.findings.find((finding) => path.basename(finding.path) === "gates.md").severity, "error");
        assert.equal("measurement" in nodeOf(model, "gates.md").fields, false, "…and never reaches the model");
      });
      // EVERY MACHINE SCHEME STILL LANDS, so the rule is about `prose:` and not about the key.
      for (const scheme of POINTER_SCHEMES) {
        const raw = { module: "module:src/work/loops.mjs#loadLoops", command: "command:work:doctor", config: "config:work.audit.anchorStaleDays" }[scheme];
        await overRegistry({ "operator.md": actor("operator"), "gates.md": auditor("gates", { measurement: `[${raw}]` }) }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), [], `${scheme}: a machine authority is admitted`);
        });
      }
      // `prose:` IS THE SENTINEL THE REST OF THE REGISTRY KNOWS, so the refusal is stated against
      // the exported set rather than against one string.
      assert.equal(SENTINEL_TOKENS.has("prose:"), true, "`prose:` is a sentinel of this registry…");
      assert.equal(POINTER_SCHEMES.has("prose"), false, "…and never a pointer scheme");
    },
  },

  {
    name: "arch/59 FF-5901: no record may point at an auditor, on any edge key",
    run: async () => {
      // DRIVEN OVER EVERY EDGE KEY AND OVER A DECLARED AUDITOR, so this is a refusal by SCHEME and
      // not a dangling-endpoint result wearing another name. An auditor is a source, never a target.
      for (const key of EDGE_KEYS) {
        await overRegistry({
          "operator.md": actor("operator"),
          "alpha.md": loop("alpha", { [key]: "[auditor:gates]" }),
          "gates.md": auditor("gates"),
        }, (model) => {
          assert.deepEqual(codesOf(model, "alpha.md"), ["loop-bad-value"], `${key}: refused`);
          assert.equal(messagesOf(model, "alpha.md")[0], `Invalid value for ${key}: auditor:gates`, `${key}: naming the edge key`);
          const reachable = model.nodes.flatMap((node) => Object.values(node.edges).flat()).map((entry) => entry.raw);
          assert.equal(reachable.includes("auditor:gates"), false, `${key}: the auditor is not reachable as any edge's endpoint`);
        });
      }
      // AND THE REPORT GOES THE OTHER WAY, on the edge this milestone adds — otherwise the refusals
      // above would be satisfied by a registry in which `reporting` did not work at all.
      await overRegistry({
        "operator.md": actor("operator"),
        "gates.md": auditor("gates", { reporting: "[actor:operator]" }),
      }, (model) => {
        assert.deepEqual(model.findings, [], "an auditor reports to a declared actor");
        assert.deepEqual(Object.keys(nodeOf(model, "gates.md").edges), ["reporting"]);
        assert.strictEqual(nodeOf(model, "gates.md").edges.reporting[0].resolved, true);
      });
    },
  },

  {
    name: "arch/59 FF-5901: an auditor declares `data-feed` and `reporting` and no other edge",
    run: async () => {
      // THE REFUSED FOUR (ADR-001 §5a). Each key is ADMITTED for the kind — the frozen set is not
      // shrunk — and no endpoint on it is, so each entry is the existing `loop-bad-value` naming the
      // edge key and nothing reaches `node.edges`.
      for (const key of AUDITOR_REFUSES_EDGE) {
        assert.equal(ADMITTED_KEYS.auditor.has(key), true, `${key}: the key stays in the frozen admitted set`);
        await overRegistry({
          "operator.md": actor("operator"),
          "alpha.md": loop("alpha"),
          "gates.md": auditor("gates", { [key]: "[loop:alpha]" }),
        }, (model) => {
          assert.deepEqual(codesOf(model, "gates.md"), ["loop-bad-value"], `${key}: refused`);
          assert.equal(messagesOf(model, "gates.md")[0], `Invalid value for ${key}: loop:alpha`, `${key}: naming the edge key`);
          assert.equal(key in nodeOf(model, "gates.md").edges, false, `${key}: nothing reaches node.edges`);
          assert.equal(PRE_59_CODES.includes(codesOf(model, "gates.md")[0]), true,
            `${key}: with a code that predates this milestone`);
          assert.deepEqual(codesOf(model, "alpha.md"), [], `${key}: and the loop is untouched`);
        });
      }

      // THE HOLE `monitoring` CLOSES, decided over the model a check would read. No monitoring edge
      // exists at all, so no pairing can be derived from one — which is a claim the LOADER can make
      // and 59/00 can therefore land, without reaching into `src/work/loops-checks.mjs`.
      await overRegistry({
        "operator.md": actor("operator"),
        "alpha.md": loop("alpha", { optimizing: "true" }),
        "gates.md": auditor("gates", { monitoring: "[loop:alpha]" }),
      }, (model) => {
        const monitored = model.nodes.flatMap((node) => node.edges.monitoring ?? []).map((entry) => entry.raw);
        assert.deepEqual(monitored, [], "an auditor cannot pair an optimizing loop by monitoring it");
        assert.deepEqual(codesOf(model, "gates.md"), ["loop-bad-value"]);
      });
      // …AND A WATCHER STILL PAIRS ONE, so the refusal is about the auditor and not about the key.
      await overRegistry({
        "operator.md": actor("operator"),
        "alpha.md": loop("alpha", { optimizing: "true" }),
        "sentry.md": watcher("sentry", { monitoring: "[loop:alpha]" }),
      }, (model) => {
        assert.deepEqual(model.findings, [], "a watcher's monitoring edge is untouched");
        assert.equal(nodeOf(model, "sentry.md").edges.monitoring[0].raw, "loop:alpha");
      });

      // THE TWO IT DOES DECLARE BOTH LAND, in both directions of the claim: the admitted set and the
      // refused set partition the whole edge vocabulary, so a seventh edge key added later without a
      // ruling would fail here rather than being silently admissible.
      for (const key of AUDITOR_ADMITS_EDGE) {
        await overRegistry({
          "operator.md": actor("operator"),
          "gates.md": auditor("gates", { [key]: "[actor:operator]" }),
        }, (model) => {
          assert.deepEqual(model.findings, [], `${key}: accepted`);
          assert.deepEqual(Object.keys(nodeOf(model, "gates.md").edges), [key], key);
          assert.strictEqual(nodeOf(model, "gates.md").edges[key][0].resolved, true, key);
        });
      }
      assert.deepEqual(
        [...AUDITOR_ADMITS_EDGE, ...AUDITOR_REFUSES_EDGE].sort(), [...EDGE_KEYS].sort(),
        "the two admitted and the four refused are exactly the six edge keys — every one has a ruling",
      );
    },
  },

  {
    name: "arch/59 FF-5901: every one of the sixteen records shipped before 59 parses with zero new findings",
    run: async () => {
      await withShippedRegistry(PRE_59_RECORDS, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        assert.equal(fixture.seeds.length, 16, "the sixteen records shipped before 59 are the corpus this claim is about");
        assert.equal(model.nodes.length, fixture.names.length,
          `every record of the closed fixture is parsed (added: ${fixture.added.join(", ") || "none"})`);
        const pre59 = model.nodes.filter((node) => PRE_59_RECORDS.includes(path.basename(node.path)));
        assert.equal(pre59.length, 16, "and all sixteen are among them");

        // THE ORACLE IS 57's, RE-USED BY 58, NOT A RE-MEASUREMENT.
        assert.deepEqual(signatureOf(model, PRE_59_RECORDS), [...PRE_59_SIGNATURE],
          "each reports the same finding codes, in the same counts, as it did before the widening");

        // NEITHER SILENCED NOR MULTIPLIED — counted, because "unchanged" is a claim about NUMBER as
        // much as about presence.
        const own = model.findings.filter((finding) => PRE_59_RECORDS.includes(path.basename(finding.path)));
        const counted = (code) => own.filter((finding) => finding.code === code).length;
        assert.equal(counted("loop-field-prose-only"), 12, "the prose-only warnings carried since milestone 52");
        assert.equal(counted("loop-owner-unknown"), 6, "the owner-unknown warnings carried since milestone 52");
        assert.equal(own.length, 18, "and nothing else at all");
        assert.deepEqual(model.findings.filter((finding) => finding.severity === "error"), [],
          "no error-severity finding anywhere in the closed fixture");

        // NONE OF THE FIVE PRIOR KINDS IS RE-CLASSIFIED as the kind this story adds, and the story
        // ships NO record of it — the day-one auditor is 59/04's.
        const byKind = {};
        for (const node of pre59) byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
        assert.deepEqual(byKind, { loop: 7, actor: 2, anchor: 3, watcher: 3, arbiter: 1 },
          "seven loops, two actors, three anchors, three watchers, one arbiter — every pre-59 record keeps the kind it had");
        assert.equal(model.nodes.some((node) => node.kind === "auditor"), false,
          "and 59/00 ships the grammar and no record written in it");
      });

      // …AND THE SAME OVER THE REGISTRY AOF ACTUALLY INSTALLS, which is what a reader of this
      // repository has on disk. A widening that broke the framework's own declaration of how it
      // improves itself would break the thing this milestone exists to make trustworthy.
      const installed = await loadLoops(path.join(root, ".aof"));
      assert.equal(installed.present, true);
      assert.deepEqual(
        signatureOf(installed, PRE_59_RECORDS).sort(), [...PRE_59_SIGNATURE].sort(),
        "the installed registry carries the same signature as the shipped one",
      );
    },
  },
];
