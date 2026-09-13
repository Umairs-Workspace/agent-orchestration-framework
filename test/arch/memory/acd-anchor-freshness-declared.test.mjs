// FF-5902 — ANCHOR FRESHNESS IS DECLARED, ON THE ANCHOR ALONE, AND CANNOT OPT ITSELF OUT.
//
// Milestone 59 / story 00. The invariant, from ADR-005 §2:
//
//   `checked:` is admitted on `kind: anchor` ONLY and on no other kind; it is OPTIONAL; it admits
//   an ISO date and refuses every `SENTINEL_TOKENS` member and every reserved field prefix, so
//   `checked: unknown` and `checked: prose:…` are each `loop-bad-value`; and the anchor's existing
//   keys, requirements and finding codes are unchanged.
//
// WHAT THIS IS FOR, AND WHAT IT IS NOT. Milestone 55 can already tell an operator that an anchor's
// cited authority no longer RESOLVES — a structural fact. It cannot tell them that a live-soak
// observation is four months old, which is a TEMPORAL one, and an operator acts on the two
// differently: one is broken, the other has simply stopped being evidence. This gate is about the
// field that difference is declared in. Whether a given date is too old is a WINDOW, the window is
// 59/03's, and nothing here compares a date to anything — which is also why `src/work-loops-checks
// .mjs` can stay the pure leaf that imports nothing (52/ADR-007, ADR-005 §4).
//
// WHY OPTIONAL IS PART OF THE INVARIANT. An anchor that has never declared a date is not thereby
// stale — it is UNDATED, which is a third state and a real one. Making the key required would have
// forced a date onto every shipped anchor at the moment the key landed, and a date supplied to
// satisfy a schema is exactly the fabrication 55/ADR-002 refused a required field for.
//
// WHY THE SENTINELS ARE REFUSED AGAINST THE EXPORTED SET. `checked: unknown` is the shape that
// would let an anchor opt out of freshness while APPEARING to declare it, and `checked: prose:…`
// would let a paragraph date a reading. Both are refused, and the refusal is driven over
// `SENTINEL_TOKENS` and `POINTER_SCHEMES` themselves rather than over three strings somebody chose,
// so a milestone that added a fourth sentinel would find it already refused here.
//
// WHY THE EPOCH IS ASSERTED. The parsed field carries the millisecond a window is compared against,
// exactly as `ms` rides on a periodic cadence and `rank` on a layer. That is what lets 59/03 hold no
// date literal and read no clock — the number is handed to it, never derived by it.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMITTED_KEYS, FIELD_KINDS, GROUND_VALUES, LOADER_FINDING_CODES, NODE_KINDS, POINTER_SCHEMES,
  SENTINEL_TOKENS, loadLoops,
} from "../../../src/work/loops.mjs";
import { withLoopRegistry } from "../../support/loop-registry-fixture.mjs";
import { withShippedRegistry } from "../../support/registry-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const EDGES = Object.freeze([
  "data-feed", "target-setting", "monitoring", "veto", "parameter-tuning", "reporting",
]);
// 55/ADR-001 §5's set, plus the one key this story adds. Stated whole, so a key DROPPED from the
// anchor by a later milestone fails here as loudly as one invented.
const ANCHOR_KEYS = Object.freeze(["id", "kind", "title", "ground", "observes", "checked", ...EDGES]);
const ANCHOR_REQUIRED = Object.freeze(["id", "kind", "title", "ground", "observes"]);

const render = (stem, fields) => `---\n${Object.entries(fields)
  .filter(([, value]) => value !== null)
  .map(([key, value]) => `${key}: ${value}\n`)
  .join("")}---\n# ${stem}\n`;

const anchor = (stem, overrides = {}) => render(stem, {
  id: `anchor:${stem}`,
  kind: "anchor",
  title: stem,
  ground: "live-soak",
  observes: "module:src/run-store.mjs#isStale",
  ...overrides,
});
const actor = (stem, overrides = {}) => render(stem, { id: `actor:${stem}`, kind: "actor", title: stem, ground: "exogenous", ...overrides });
const watcher = (stem, overrides = {}) => render(stem, {
  id: `watcher:${stem}`, kind: "watcher", title: stem,
  counter: "contract changes", determinism: "counter", measurement: "[command:work:ratchet]", ...overrides,
});
const arbiter = (stem, overrides = {}) => render(stem, {
  id: `arbiter:${stem}`, kind: "arbiter", title: stem,
  resolves: "which loop wins the shared agent", priority: "[loop:alpha]", dwell: "cycles:2", ...overrides,
});
const auditor = (stem, overrides = {}) => render(stem, {
  id: `auditor:${stem}`, kind: "auditor", title: stem,
  audits: "[command:work:doctor]", measurement: "[command:work:doctor]",
  cadence: "event:per-milestone", escalation: "actor:operator", ...overrides,
});
const loop = (stem, overrides = {}) => render(stem, {
  id: `loop:${stem}`, kind: "loop", title: stem,
  controlled: "attempt count",
  reference: "[module:src/run-store.mjs#isRetryable]",
  measurement: "[module:src/run-store.mjs#attempts]",
  actuator: "[command:work:next]",
  cadence: "event:per-item", ceiling: "none", owner: "actor:product-owner", optimizing: "false",
  ...overrides,
});

const RECORD_OF_KIND = Object.freeze({ loop, actor, anchor, watcher, arbiter, auditor });

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
    name: "arch/59 FF-5902: `checked` is admitted on the anchor alone, and is optional there",
    run: async () => {
      // ON THE ANCHOR ALONE, decided over the vocabulary — every kind there will ever be, not the
      // five that exist beside it today.
      assert.deepEqual([...NODE_KINDS].filter((kind) => ADMITTED_KEYS[kind].has("checked")), ["anchor"],
        "`checked:` is admitted on `kind: anchor` and on no other kind");
      assert.deepEqual([...ADMITTED_KEYS.anchor].sort(), [...ANCHOR_KEYS].sort(),
        "the anchor's admitted set is 55's, plus `checked` and the edge keys");
      assert.equal(ADMITTED_KEYS.all.has("checked"), true, "…and it is inside the union");

      // AND ON NO OTHER KIND, through the LOADER — a vocabulary claim and a parse claim are two
      // different things, and only the second is what an author meets.
      for (const kind of NODE_KINDS) {
        if (kind === "anchor") continue;
        await overRegistry({
          "operator.md": actor("operator"),
          "subject.md": RECORD_OF_KIND[kind]("subject", { checked: "2026-08-29" }),
        }, (model) => {
          const refused = model.findings.filter((finding) => finding.code === "loop-key-not-admitted-for-kind");
          assert.equal(refused.length, 1, `${kind}: the EXISTING not-admitted-for-kind finding`);
          assert.equal(refused[0].message, `Key checked is not admitted for kind ${kind}`, kind);
          assert.equal("checked" in nodeOf(model, "subject.md").fields, false, `${kind}: nothing reached the model`);
        });
      }

      // OPTIONAL — an anchor with no date is a valid anchor, and nothing is invented on its behalf.
      await overRegistry({ "gauge.md": anchor("gauge") }, (model) => {
        assert.deepEqual(model.findings, [], "an undated anchor raises nothing");
        assert.equal("checked" in nodeOf(model, "gauge.md").fields, false, "undated is a third state, not stale");
        assert.equal(nodeOf(model, "gauge.md").fields.checked, undefined);
      });
      // …and it is optional because the REQUIREMENTS did not widen: 55's five are still 55's five.
      for (const key of ANCHOR_REQUIRED) {
        await overRegistry({ "gauge.md": anchor("gauge", { [key]: null }) }, (model) => {
          assert.ok(codesOf(model, "gauge.md").includes("loop-missing-field"), `${key}: still required`);
        });
      }
      assert.equal(ANCHOR_REQUIRED.includes("checked"), false, "and `checked` is not among them");
    },
  },

  {
    name: "arch/59 FF-5902: an ISO date is admitted and every sentinel and reserved prefix is refused",
    run: async () => {
      // A REAL CALENDAR DATE, carrying the epoch a window will be compared against.
      for (const raw of ["2026-08-29", "2024-02-29", "2026-01-01", "2026-12-31", "1970-01-01"]) {
        await overRegistry({ "gauge.md": anchor("gauge", { checked: raw }) }, (model) => {
          assert.deepEqual(model.findings, [], raw);
          const field = nodeOf(model, "gauge.md").fields.checked;
          assert.equal(field.kind, "date", `${raw}: typed as a date`);
          assert.equal(FIELD_KINDS.has(field.kind), true, `${raw}: in the exported field-kind vocabulary`);
          assert.equal(field.raw, raw, `${raw}: kept verbatim`);
          assert.equal(field.value, raw, raw);
          const [year, month, day] = raw.split("-").map(Number);
          assert.equal(field.ms, Date.UTC(year, month - 1, day), `${raw}: carrying the epoch, in UTC`);
        });
      }

      // EVERY SENTINEL, driven over the exported set. `checked: unknown` is the shape that would let
      // an anchor opt out of freshness while appearing to declare it, so the refusal is the point.
      assert.ok(SENTINEL_TOKENS.size >= 4, `non-vacuous: ${SENTINEL_TOKENS.size} sentinels`);
      for (const token of SENTINEL_TOKENS) {
        await overRegistry({ "gauge.md": anchor("gauge", { checked: token }) }, (model) => {
          assert.deepEqual(codesOf(model, "gauge.md"), ["loop-bad-value"], `${token}: refused`);
          assert.equal(messagesOf(model, "gauge.md")[0], `Invalid value for checked: ${token}`,
            `${token}: naming the checked key and quoting the value`);
          assert.equal("checked" in nodeOf(model, "gauge.md").fields, false, `${token}: no date is readable`);
        });
      }

      // EVERY RESERVED FIELD PREFIX — the three pointer schemes and `prose:`. A pointer is a
      // producer of readings, never a date; admitting one would let a paragraph date a reading.
      const prefixed = {
        module: "module:src/run-store.mjs#isStale",
        command: "command:work:next",
        config: "config:work.audit.anchorStaleDays",
        prose: "prose:docs/evidence.md",
      };
      for (const scheme of [...POINTER_SCHEMES, "prose"]) {
        const raw = prefixed[scheme];
        await overRegistry({ "gauge.md": anchor("gauge", { checked: raw }) }, (model) => {
          assert.deepEqual(codesOf(model, "gauge.md"), ["loop-bad-value"], `${raw}: refused`);
          assert.equal(messagesOf(model, "gauge.md")[0], `Invalid value for checked: ${raw}`, raw);
        });
      }

      // AND EVERY OTHER WAY TO LOOK DATED WITHOUT BEING A DATE — a day no calendar has, a partial
      // date, a locale spelling, a timestamp, and a shape the schema does not take at all.
      for (const raw of [
        "2026-02-30", "2026-13-01", "2026-00-10", "2026-08-32", "2026-8-9", "26-08-29",
        "2026-08", "2026", "29/08/2026", "yesterday", "2026-08-29T12:00:00Z", "[2026-08-29]",
      ]) {
        await overRegistry({ "gauge.md": anchor("gauge", { checked: raw }) }, (model) => {
          const codes = codesOf(model, "gauge.md");
          assert.equal(codes.length, 1, `${raw}: one slip, one finding`);
          assert.ok(["loop-bad-value", "loop-expected-scalar"].includes(codes[0]), `${raw}: ${codes[0]}`);
          assert.equal("checked" in nodeOf(model, "gauge.md").fields, false, `${raw}: no date is readable off the anchor`);
        });
      }
      // NO NEW FINDING CODE was spent on any of it.
      assert.equal(LOADER_FINDING_CODES.includes("loop-bad-value"), true);
      assert.equal(LOADER_FINDING_CODES.length, 17, "the loader's code array is what it was before this milestone");
    },
  },

  {
    name: "arch/59 FF-5902: the anchor's existing keys, requirements and finding codes are unchanged",
    run: async () => {
      // 55/ADR-001's THREE RULES, each re-decided beside a date so "unchanged" is a claim about the
      // rules and not about a record that happens not to exercise them.
      await overRegistry({ "gauge.md": anchor("gauge", { ground: "measured", checked: "2026-08-29" }) }, (model) => {
        assert.deepEqual(codesOf(model, "gauge.md"), ["loop-bad-value"], "the ground finding is exactly what it was");
        assert.equal(messagesOf(model, "gauge.md")[0], "Invalid value for ground: measured");
        assert.equal(nodeOf(model, "gauge.md").fields.checked.raw, "2026-08-29", "and the checked date is still readable");
      });
      await overRegistry({ "gauge.md": anchor("gauge", { observes: "prose:docs/evidence.md", checked: "2026-08-29" }) }, (model) => {
        assert.deepEqual(codesOf(model, "gauge.md"), ["loop-bad-value"], "an anchor's authority may still not be prose");
        assert.equal(messagesOf(model, "gauge.md")[0], "Invalid value for observes: prose:docs/evidence.md");
        assert.equal(nodeOf(model, "gauge.md").fields.checked.raw, "2026-08-29");
      });
      await overRegistry({ "alpha.md": loop("alpha", { ground: "live-soak" }), "operator.md": actor("operator") }, (model) => {
        assert.deepEqual(codesOf(model, "alpha.md"), ["loop-key-not-admitted-for-kind"],
          "a loop still cannot claim its own ground — the host of `ground:` did not widen");
      });
      // …AND EVERY FROZEN GROUND CLASS STILL PARSES, beside a date. The date is orthogonal to 55's
      // taxonomy, not a seventh branch of it.
      assert.equal(GROUND_VALUES.size, 6, "six ground classes, as 55 froze them");
      for (const ground of GROUND_VALUES) {
        await overRegistry({ "gauge.md": anchor("gauge", { ground, checked: "2026-01-31" }) }, (model) => {
          assert.deepEqual(model.findings, [], ground);
          assert.equal(nodeOf(model, "gauge.md").fields.ground.value, ground, ground);
          assert.equal(nodeOf(model, "gauge.md").fields.checked.raw, "2026-01-31", ground);
        });
      }

      // OVER THE SHIPPED ANCHORS. 59/00 adds the key and no record, so every anchor on disk is
      // UNDATED — and its silence must cost it nothing, which is the whole reason the key is
      // optional. Read off the registry rather than listed, so it cannot go stale for the reason a
      // literal list would.
      const shipped = await loadLoops(path.join(root, ".aof"));
      const anchors = shipped.nodes.filter((node) => node.kind === "anchor");
      assert.ok(anchors.length >= 2, `non-vacuous: ${anchors.length} shipped anchor records`);
      for (const node of anchors) {
        const name = path.basename(node.path);
        assert.equal("checked" in node.fields, false, `${name}: undated`);
        assert.equal(shipped.findings.some((finding) => finding.path === node.path), false,
          `${name}: and carries no finding at all, so the absent date costs it nothing`);
      }
      // …and the same over the SHIPPED (pre-install) corpus, closed under its endpoints.
      await withShippedRegistry(null, async (fixture) => {
        const model = await loadLoops(fixture.workDir);
        const dated = model.nodes.filter((node) => "checked" in node.fields);
        assert.deepEqual(dated, [], "no record shipped before 59/03 declares a checked date");
        assert.equal(
          model.findings.some((finding) => /checked/u.test(finding.message)), false,
          "and no finding anywhere names the key this story adds",
        );
      });
    },
  },
];
