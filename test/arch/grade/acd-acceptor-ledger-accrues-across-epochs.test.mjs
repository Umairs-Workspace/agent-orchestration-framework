// FF-6106 (milestone 61 / ADR-006 §1–§4a) — THE LEDGER ACCRUES ACROSS EPOCHS AND
// REFUSES AN INCOMPLETE RULING AT CONSTRUCTION.
//
// A ledger scoped to one milestone would be the off switch wearing a discipline's
// clothes: at a measured yield below one discordant pair per milestone such a counter
// can never exceed one, so the acceptor could never fire and nobody would be able to see
// why. Evidence therefore carries forward; the milestone is recorded and reported, and
// it is not a filter.
//
// THE STRONGEST LEG IS AN ABSENCE, AND IT IS CHECKED AS ONE. What the total must never
// do is span a criterion change — pairs collected under two different rules are pairs
// from two different experiments. That is arithmetic rather than a rule somebody
// remembers to apply: the arithmetic leaf NEVER SEES A DIGEST, so "sum across two
// criteria" is not a path it refuses but a thing it cannot express (ADR-006 §4a). This
// control therefore looks for the digest in the leaf's CODE — read, compared or named —
// and for the selection in `criterion.mjs`, where it belongs (61/01's FF-6105).
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { codeOnly } from "../run/acd-progress-ledger-consumed.test.mjs";
import { assertFamilyPurity } from "../../support/module-family.mjs";
import { criterionDigest, defaultCriterion, makeCriterion, rulingsUnderCurrentCriterion } from "../../../src/work-acceptor/criterion.mjs";
import { deriveRule } from "../../../src/work-acceptor/rule.mjs";
import {
  LEDGER_INCOMPLETE,
  PAIR_OUTCOMES,
  RULING_INCOMPLETE,
  RULING_KEYS,
  accrue,
  assembleLedger,
  attained,
  evaluateRun,
  makeRuling,
} from "../../../src/work-acceptor/ledger.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEDGER_MODULE = "src/work-acceptor/ledger.mjs";

// ADR-006 §3's frozen key set, restated here so the control compares two independent
// statements of it. `dwell` and `dwellFrom` are in; a computed `dwellExpiry` is not, and
// its absence is asserted rather than assumed — nothing in this system counts a cycle of
// the receiving loop, so an expiry would be a fabricated conversion (ADR-010 §5).
const ADR_006_KEYS = Object.freeze([
  "key", "from", "to", "epochId", "criterion", "ledger", "evalue",
  "counterMetric", "dwell", "dwellFrom", "provenance", "verdict", "refusals",
]);

const shipped = defaultCriterion();
const { N: _derived, ...shippedFields } = shipped;
const rule = deriveRule(shipped);
const W = PAIR_OUTCOMES.FAVOURABLE;
const L = PAIR_OUTCOMES.UNFAVOURABLE;

const ruling = ({ underCriterion = shipped, ...overrides } = {}) => makeRuling({
  key: "work.loop.reviewRounds",
  from: 1,
  to: 2,
  epochId: "61",
  criterion: criterionDigest(underCriterion),
  ledger: [W],
  evalue: attained({ wins: 1, losses: 0 }, rule),
  counterMetric: { before: 0, after: 0, direction: "unchanged", measured: true },
  dwell: "cycles:2",
  dwellFrom: "61",
  provenance: "acceptor",
  verdict: "report-only",
  refusals: [],
  ...overrides,
});

async function walk(dir, prefix = "src") {
  const found = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) found.push(...await walk(path.join(dir, entry.name), `${prefix}/${entry.name}`));
    else if (entry.name.endsWith(".mjs")) found.push(`${prefix}/${entry.name}`);
  }
  return found;
}

// PURE — source in, findings out. A digest REACHES the arithmetic when the code reads a
// `criterion` member, compares a digest, or binds either as an identifier. A key name
// inside the frozen list is a STRING and is stripped before this looks, which is the
// whole point: the leaf carries the key as data and never consults its value.
export function digestContacts(code) {
  const source = codeOnly(code);
  const findings = [];
  for (const [pattern, what] of [
    [/\.\s*criterion\b/u, "reads a `criterion` member"],
    [/\[\s*""\s*\]\s*(?=[.;)\s])/u, "indexes by a computed key"],
    [/\bdigest\b/iu, "names a digest"],
    [/\bcriterion\s*[=:,)]/u, "binds `criterion` as an identifier"],
    [/\bcriterionDigest\b|\bdigestValue\b/u, "calls the digest helpers"],
  ]) {
    if (pattern.test(source)) findings.push(what);
  }
  return findings;
}

function refusalFrom(body) {
  try {
    body();
  } catch (error) {
    return error;
  }
  assert.fail("expected a refusal, and nothing was refused");
  return null;
}

export const archTests = [
  {
    name: "arch/61 FF-6106 the accrual crosses epochs — the epoch id is carried and reported, and is not a filter",
    run: () => {
      const rulings = ["57", "58", "59", "60", "61"].map((epochId) => ruling({ epochId }));
      const totals = ["57", "61", "62", null].map((open) => accrue({ rulings, rule, open }).total);
      assert.deepEqual(totals, [5, 5, 5, 5], "the total is the same whichever milestone is open");
      const ledger = accrue({ rulings, rule, open: "61" });
      assert.equal(ledger.epochsCounted, 5, "…and every epoch is reported");
      assert.deepEqual([...ledger.epochs], ["57", "58", "59", "60", "61"]);
      assert.equal(ledger.open, "61", "the open milestone is provenance, consulted by nothing");
      // AN EPOCH-SCOPED COUNTER IS THE SHAPE THAT SILENTLY GUARANTEES SILENCE: at one
      // ruling per epoch it could never exceed one, and this total does.
      assert.equal(ledger.total > 1, true);
      const perEpoch = Math.max(...ledger.epochs.map((epochId) => ledger.rulings.filter((entry) => entry.epochId === epochId).length));
      assert.equal(perEpoch, 1, "…even though no single epoch holds more than one ruling");
    },
  },
  {
    name: "arch/61 FF-6106 RULING_KEYS equals ADR-006 §3's frozen set — dwell and dwellFrom in, no computed dwellExpiry",
    run: async () => {
      assert.deepEqual([...RULING_KEYS], ADR_006_KEYS, "two independent statements of one frozen set");
      assert.equal(RULING_KEYS.includes("dwell"), true);
      assert.equal(RULING_KEYS.includes("dwellFrom"), true);
      assert.equal(RULING_KEYS.includes("dwellExpiry"), false);
      // …and the leaf has no expiry ANYWHERE, so there is nothing to compute one from.
      const source = await readFile(path.join(root, ...LEDGER_MODULE.split("/")), "utf8");
      assert.doesNotMatch(codeOnly(source), /\bdwellExpiry\b|\bexpiresAt\b/u, "no computed expiry exists to be read");
      // A ruling written key by key off the frozen set carries exactly those keys.
      assert.deepEqual(Object.keys(ruling()), [...RULING_KEYS]);
    },
  },
  {
    name: "arch/61 FF-6106 a record missing any frozen key is refused at construction AND again at assembly",
    run: () => {
      for (const part of RULING_KEYS) {
        const incomplete = { ...ruling() };
        delete incomplete[part];
        const atConstruction = refusalFrom(() => makeRuling(incomplete));
        assert.equal(atConstruction.code, RULING_INCOMPLETE, `${part}: refused at construction`);
        assert.equal(atConstruction.part, part);
        // AND AGAIN AT ASSEMBLY. A record already on disk was not necessarily written
        // through the constructor, so the same completeness is re-asserted.
        const atAssembly = refusalFrom(() => assembleLedger([ruling(), incomplete]));
        assert.equal(atAssembly.code, LEDGER_INCOMPLETE, `${part}: refused at assembly`);
        assert.equal(atAssembly.part, part);
        assert.equal(atAssembly.at, 1, `${part}: naming which ruling`);
        // …and nothing renders it with a blank in it: the accrual refuses too.
        assert.equal(refusalFrom(() => accrue({ rulings: [incomplete], rule })).code, LEDGER_INCOMPLETE);
      }
      assert.equal(assembleLedger([ruling(), ruling()]).length, 2, "…and a complete pair assembles");
    },
  },
  {
    name: "arch/61 FF-6106 the W/L/T sequence is stored in order, and no code path re-sorts it",
    run: async () => {
      const alternating = [W, L, W, L, W];
      const ledger = accrue({ rulings: [ruling({ ledger: alternating })], rule });
      assert.deepEqual([...ledger.sequence], alternating);
      assert.notDeepEqual([...ledger.sequence], [...alternating].sort());
      assert.deepEqual([...evaluateRun(alternating, rule).admittedPairs], alternating);
      const source = codeOnly(await readFile(path.join(root, ...LEDGER_MODULE.split("/")), "utf8"));
      assert.doesNotMatch(source, /\.sort\s*\(/u, "the arithmetic leaf sorts nothing");
      assert.doesNotMatch(source, /\.reverse\s*\(/u);
    },
  },
  {
    name: "arch/61 FF-6106 the arithmetic leaf imports nothing, holds no date or duration literal, and takes `now` on the call",
    run: async () => {
      const source = await readFile(path.join(root, ...LEDGER_MODULE.split("/")), "utf8");
      // PURITY IS ABOUT EXTERNAL DEPENDENCIES (119/ADR-002). The leaf already lives inside a family
      // directory — `src/work-acceptor/` — and the old token ban forbade the edge BETWEEN its own
      // members, which is exactly the decomposition a growing leaf needs. The family is the
      // containment boundary; the claim stays scoped to the leaf, because the four other members of
      // `src/work-acceptor/` legitimately open files and no ADR ever made them pure.
      await assertFamilyPurity(assert, root, "src/work-acceptor", { members: [LEDGER_MODULE] });
      assert.doesNotMatch(source, /\brequire\s*\(/u);
      const code = codeOnly(source);
      assert.doesNotMatch(code, /\bDate\b|\bperformance\.now\b|\bprocess\.hrtime\b/u, "it reads no clock");
      assert.doesNotMatch(code, /\b\d+\s*\*\s*60\s*\*\s*1000\b|\b\d{4,}_?\d*\s*(?:\*\s*)?(?:ms|Ms)\b/u, "it holds no duration literal");
      assert.match(code, /\bnow\b/u, "…and `now` arrives on the call");
      // BEHAVIOURAL: two different supplied moments produce identical totals.
      const rulings = [ruling({ epochId: "60" }), ruling({ epochId: "61" })];
      const early = accrue({ rulings, rule, now: "2020-01-01T00:00:00.000Z" });
      const late = accrue({ rulings, rule, now: "2030-01-01T00:00:00.000Z" });
      assert.equal(early.total, late.total);
      assert.equal(early.evaluation.wealth, late.evaluation.wealth);
      assert.notEqual(early.readAt, late.readAt, "the moment is recorded, never consulted");
    },
  },
  {
    name: "arch/61 FF-6106 the arithmetic leaf never sees a digest, so summing across two criteria is not expressible in it",
    run: async () => {
      const source = await readFile(path.join(root, ...LEDGER_MODULE.split("/")), "utf8");
      assert.deepEqual(digestContacts(source), [], "no digest is read, compared or named in the arithmetic leaf");
      // NON-VACUITY: the detector sees a planted contact of each shape.
      assert.equal(digestContacts("const held = ruling.criterion;\n").length > 0, true);
      assert.equal(digestContacts("if (digestValue(a) === digestValue(b)) keep();\n").length > 0, true);
      // …and it does NOT see the key name carried as data in the frozen set.
      assert.deepEqual(digestContacts('const KEYS = ["key", "criterion", "ledger"];\n'), []);

      // THE CONSEQUENCE, MEASURED: handed rulings rendered under two different criteria,
      // the leaf totals ALL of them. It cannot refuse what it cannot see — which is why
      // the reset is `criterion.mjs`'s selection and not a check here (ADR-006 §4a).
      const earlier = makeCriterion({ ...shippedFields, lambda: 0.75 });
      const mixed = [ruling({ underCriterion: earlier }), ruling({ underCriterion: earlier }), ruling(), ruling()];
      assert.equal(accrue({ rulings: mixed, rule }).total, 4, "the leaf totals the list it was handed");
      // …and the SELECTION, done where identity lives, is what makes the accrual honest.
      const selected = rulingsUnderCurrentCriterion(mixed, criterionDigest(shipped));
      assert.equal(accrue({ rulings: selected, rule }).total, 2, "…and the run since the criterion moved is two");
    },
  },
  {
    name: "arch/61 FF-6106 no second module in src/ derives W/L/T totals or an e-value",
    run: async () => {
      const walked = await walk(path.join(root, "src"));
      const derivers = [];
      const talliers = [];
      for (const rel of walked) {
        const code = codeOnly(await readFile(path.join(root, rel), "utf8"));
        // The pair vocabulary as it survives the comment/string stripper. The four words
        // themselves live in string literals, so what is looked for is the IDENTIFIERS a
        // module would have to bind in order to do this arithmetic at all.
        if (!/\b(?:wins|losses|FAVOURABLE|UNFAVOURABLE)\b/u.test(code)) continue;
        if (/\bMath\.pow\s*\(/u.test(code) || /\*\*/u.test(code)) derivers.push(rel);
        if (/\bfilter\s*\([\s\S]{0,80}?(?:FAVOURABLE|UNFAVOURABLE)\b/u.test(code)) talliers.push(rel);
      }
      assert.ok(walked.length > 150, `src/**/*.mjs was actually walked: ${walked.length} modules`);
      assert.deepEqual(derivers, [LEDGER_MODULE], "one e-value derivation in src/");
      assert.deepEqual(talliers, [LEDGER_MODULE], "one W/L/T tally in src/");
    },
  },
];
