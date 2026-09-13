// FF-6105 (milestone 61 / ADR-005) — THE CRITERION IS FROZEN WITHIN THE EPOCH ON THREE
// LAYERS, AND THE ARITHMETIC LAYER CANNOT BE BYPASSED.
//
// The temptation this control exists to refuse is answering with a permission. A permission
// cannot see `aof config set`, cannot see the acceptor's own write, and cannot see a human
// in an editor — so a single-layer answer here is a control that reports as enforced while
// being trivially walked past (55/ADR-004 §4's own indictment). Three layers ship, each
// with its limit stated, and the LOAD-BEARING one is arithmetic:
//
//   1. `rulingsUnderCurrentCriterion` — the accrual sums only the maximal SUFFIX of rulings
//      sharing the digest in force, so a criterion that moves resets the ledger by
//      construction. A straddling total is not refused, it is unrepresentable.
//   2. the coded writer refusal `criterion-frozen-in-epoch`, which binds the seam.
//   3. the sixth frozen-set member `acceptor-criterion`, which binds an agent's tools.
//
// THE SUFFIX/FILTER DISTINCTION IS THE SUBTLE LEG, and it is planted rather than narrated.
// A criterion revised and later revised BACK to an earlier value must not resurrect the
// rulings rendered under the first occurrence: the evidence in between was gathered under a
// different yardstick. A filter on digest equality would splice the two runs together and
// would pass every other assertion in this file, which is precisely why the planted lane at
// the bottom drives a real filter implementation and asserts it is caught.
//
// AND THE FOUR CENSUSES ARE CROSS-CHECKED, all of them. 55/FF-5505 already cross-checks two
// member-set literals against the live declaration; ADR-012 §2 names four sites that go red
// on a sixth member, and a literal moved to the new truth in three of four is a tripwire
// with one leg cut. Each is read out of its own suite's SOURCE here and compared with what
// the declaration actually carries, so a census relaxed to a subset check — or quietly left
// behind — fails this control rather than passing quietly.
import assert from "node:assert/strict";
import { readdir, readFile, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bundledFrozenSet,
  compileFrozenSet,
  FROZEN_ENFORCEMENT_POINTS,
  FROZEN_OWNERSHIP_MARKER,
} from "../../../src/frozen-set.mjs";
import {
  CRITERION_FROZEN_IN_EPOCH,
  CRITERION_RELPATH,
  FROZEN_CRITERION_KEYS,
  FROZEN_CRITERION_MEMBERS,
  LEDGER_RELPATH,
  accrualReport,
  criterionDigest,
  criterionRevisionWindow,
  defaultCriterion,
  makeCriterion,
  rulingsUnderCurrentCriterion,
  writeCriterion,
} from "../../../src/work-acceptor/criterion.mjs";
import { stripComments, functionBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcDir = path.join(repoRoot, "src");

const THE_SELECTOR_HOME = "src/work-acceptor/criterion.mjs";
const MEMBER_ID = "acceptor-criterion";

// ADR-004 §4's four members, and the quantities the one that matters carries. Spelled here
// so the control asserts the DECISION rather than whatever the module happens to declare.
const THE_FOUR_MEMBERS = ["trial-metric", "evidence-threshold", "tunable-set", "frozen-set"];
const INSEPARABLE = ["alpha", "lambda", "N", "B"];

// ─── source sweep ──────────────────────────────────────────────────────────────────────

async function readSources() {
  const sources = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        sources.push({
          file: path.relative(repoRoot, full).replaceAll("\\", "/"),
          body: stripComments(await readFile(full, "utf8")),
        });
      }
    }
  };
  await walk(srcDir);
  return sources;
}

// A module SELECTS RULINGS BY DIGEST when it names both — the rulings it is choosing among
// and the identity it is choosing them by. Pure over the sources, so the planted lane drives
// the same classifier the real sweep does.
export function digestSelectors(sources) {
  return sources
    .filter((entry) => /\brulings?\b/.test(entry.body) && /\bdigest/i.test(entry.body))
    .map((entry) => entry.file)
    .sort();
}

// ─── census parsing ────────────────────────────────────────────────────────────────────

// The array literal that starts at the first `[` at or after `from`, cut on matched
// brackets — never a character window, and never a regex that stops at the first `]`.
function arrayLiteralAt(source, from) {
  const start = source.indexOf("[", from);
  if (start < 0) return null;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "[") depth += 1;
    else if (source[index] === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

// The literal must sit IMMEDIATELY after its anchor (whitespace only between): a scan to the
// next `[` anywhere later in the file would read some other literal as this site's census —
// and, now that the sites derive rather than retype, would report a derivation as a retype.
function literalAfter(source, anchor) {
  const at = source.indexOf(anchor);
  if (at < 0) return null;
  const rest = source.slice(at + anchor.length);
  if (!/^\s*\[/u.test(rest)) return null;
  return arrayLiteralAt(source, at + anchor.length);
}

const flatStrings = (literal) => [...literal.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
const stringPairs = (literal) => [...literal.matchAll(/\[\s*"([^"]*)",\s*"([^"]*)"\s*\]/g)].map((match) => [match[1], match[2]]);

// ─── ledger fixtures ───────────────────────────────────────────────────────────────────

const IN_FORCE = defaultCriterion();
const variant = (patch) => {
  const { N, ...rest } = IN_FORCE;
  void N;
  return makeCriterion({ ...rest, ...patch });
};
const OTHER = variant({ lambda: 0.4 });

let seq = 0;
const ruling = (criterion, extra = {}) => ({
  at: `2026-08-30T00:00:${String(seq++).padStart(2, "0")}.000Z`,
  criterion: criterion == null ? undefined : criterionDigest(criterion),
  ...extra,
});

// THE FILTER THIS IS NOT. A digest-equality filter passes every other assertion in this
// file and resurrects the rulings the criterion moved away from and back to. It is written
// out here so the planted lane can drive it rather than describe it.
const asAFilter = (rulings, digest) => rulings.filter((entry) => entry?.criterion?.digest === digest.digest);

export const archTests = [
  {
    name: "arch/61 FF-6105: the digest selector has ONE home, and no second module in src/ selects rulings by digest",
    run: async () => {
      const sources = await readSources();
      assert.ok(sources.length > 100, `non-vacuity: the scan walked src/ (${sources.length} modules)`);
      assert.deepEqual(
        digestSelectors(sources),
        [THE_SELECTOR_HOME],
        "an enforcement point that lives in another module's file is an enforcement point nobody owns (ADR-005 §1a)",
      );
      const home = sources.find((entry) => entry.file === THE_SELECTOR_HOME);
      assert.match(home.body, /export function rulingsUnderCurrentCriterion\(/, "…and it is exported from that home");
      assert.equal(typeof rulingsUnderCurrentCriterion, "function");
    },
  },

  {
    name: "arch/61 FF-6105: the accrual is the maximal trailing run — a SUFFIX, never a filter, so a criterion revised and revised BACK resurrects nothing",
    run: () => {
      const digest = criterionDigest(IN_FORCE);

      // The whole ledger, when nothing moved.
      const unbroken = [ruling(IN_FORCE), ruling(IN_FORCE), ruling(IN_FORCE)];
      assert.equal(rulingsUnderCurrentCriterion(unbroken, digest).length, 3);

      // Nothing at all, when everything is under a criterion that has since moved.
      assert.equal(rulingsUnderCurrentCriterion([ruling(OTHER), ruling(OTHER)], digest).length, 0);

      // THE LEG THAT MAKES IT A SUFFIX. Three under the criterion in force, then two under
      // another, then one back under the first: the earlier three were gathered under a
      // yardstick the ledger has since left and come back to, and they do not count.
      const thereAndBack = [ruling(IN_FORCE), ruling(IN_FORCE), ruling(IN_FORCE), ruling(OTHER), ruling(OTHER), ruling(IN_FORCE)];
      const counted = rulingsUnderCurrentCriterion(thereAndBack, digest);
      assert.equal(counted.length, 1, "only the trailing run counts");
      assert.equal(counted[0], thereAndBack[thereAndBack.length - 1], "…and it is the newest ruling, not a set gathered from anywhere in the ledger");

      // The filter reading, driven: it passes the two easy shapes above and fails here.
      assert.equal(asAFilter(unbroken, digest).length, 3, "a filter agrees on an unbroken ledger…");
      assert.equal(asAFilter(thereAndBack, digest).length, 4, "…and resurrects the superseded run the moment the criterion comes back");
      assert.notEqual(asAFilter(thereAndBack, digest).length, counted.length, "which is the straddling total this layer makes unrepresentable");

      // A ruling carrying no criterion digest is never counted — the record's `criterion`
      // key is what makes it selectable at all.
      const undigested = [ruling(IN_FORCE), ruling(null)];
      assert.equal(rulingsUnderCurrentCriterion(undigested, digest).length, 0, "a ruling with no digest breaks the run rather than joining it");
      assert.equal(rulingsUnderCurrentCriterion(unbroken, undefined).length, 0, "and nothing is counted against no criterion at all");
    },
  },

  {
    name: "arch/61 FF-6105: the criterion's frozen member set is ADR-004 §4's four, and freezing three of alpha/lambda/N/B is not expressible",
    run: () => {
      assert.deepEqual(FROZEN_CRITERION_MEMBERS.map((member) => member.id), THE_FOUR_MEMBERS, "exactly four members, in the ADR's own order");
      for (const member of FROZEN_CRITERION_MEMBERS) {
        assert.ok(member.covers.length > 0, `${member.id} covers at least one quantity`);
        assert.ok(typeof member.describes === "string" && member.describes.length > 0, `${member.id} says what it is`);
      }

      // The inseparable four sit in ONE member, so there is no member whose revision moves
      // three of them and leaves the fourth: N would then drift by re-choosing lambda, and
      // the guard would report as held while the bar moved.
      const owners = INSEPARABLE.map((quantity) => FROZEN_CRITERION_MEMBERS.find((member) => member.covers.includes(quantity))?.id);
      assert.deepEqual([...new Set(owners)], ["evidence-threshold"], "alpha, lambda, N and B are one member, not four");
      assert.equal(owners.filter(Boolean).length, INSEPARABLE.length, "…and every one of them is covered");

      // The union of what the four cover IS the criterion's key set, so "the criterion
      // moved" and "a frozen member moved" cannot come apart.
      assert.deepEqual([...FROZEN_CRITERION_KEYS].sort(), Object.keys(IN_FORCE).sort());
      assert.equal(new Set(FROZEN_CRITERION_KEYS).size, FROZEN_CRITERION_KEYS.length, "no quantity is covered by two members");
    },
  },

  {
    name: "arch/61 FF-6105: a mid-epoch write through the criterion seam is a coded refusal naming the open epoch, and it writes nothing",
    run: async () => {
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-ff6105-"));
      try {
        const open = criterionRevisionWindow({
          lastClose: { epochId: "61", at: "2026-08-30T00:00:00.000Z" },
          rulings: [{ at: "2026-08-30T06:00:00.000Z", criterion: criterionDigest(IN_FORCE) }],
        });
        assert.equal(open.atBoundary, false, "the fixture really is inside an open epoch");

        let refusal = null;
        try {
          await writeCriterion(dir, { lambda: 0.4 }, { window: open });
        } catch (error) {
          refusal = error;
        }
        assert.ok(refusal != null, "the seam refuses");
        assert.equal(refusal.code, CRITERION_FROZEN_IN_EPOCH);
        assert.equal(refusal.openEpoch, open.openEpoch, "naming the open epoch");
        assert.match(refusal.message, new RegExp(open.openEpoch));
        assert.match(refusal.message, /lambda/, "…and the part that was touched");
        // Facts precede announcements: the refusal is raised before any bytes move.
        assert.equal(existsSync(path.join(dir, ...CRITERION_RELPATH.split("/"))), false, "no criterion record was written");

        // …and at a boundary the same write lands, so the refusal is a gate and not a wall.
        const atBoundary = criterionRevisionWindow({ lastClose: { epochId: "61", at: "2026-08-30T00:00:00.000Z" }, rulings: [] });
        const written = await writeCriterion(dir, { lambda: 0.4 }, { window: atBoundary });
        assert.equal(written.criterion.lambda, 0.4);
        assert.equal(existsSync(written.path), true);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },

  {
    name: "arch/61 FF-6105: the sixth frozen-set member compiles at permission denials, is aofManaged, and names both acceptor paths for Edit and Write",
    run: () => {
      const declaration = bundledFrozenSet();
      const member = declaration.members.find((candidate) => candidate.id === MEMBER_ID);
      assert.ok(member != null, "the declaration carries the sixth member");
      assert.equal(member.enforcementPoint, "permission denials", "at the point `anchors` already compiles to — no fifth compile target");
      assert.ok(FROZEN_ENFORCEMENT_POINTS.includes(member.enforcementPoint));
      assert.equal(FROZEN_ENFORCEMENT_POINTS.length, 4, "…and FROZEN_ENFORCEMENT_POINTS was not widened to admit it");
      assert.equal(member[FROZEN_OWNERSHIP_MARKER], MEMBER_ID, "it is the framework's to manage");
      assert.match(member.protects, /agent/, "and it states the limit it has: it binds an agent, and only an agent");

      const compiled = compileFrozenSet(declaration);
      const mine = compiled.permissions.filter((entry) => entry.id === MEMBER_ID).map((entry) => entry.rule);
      assert.deepEqual(mine, [
        `Edit(${CRITERION_RELPATH})`,
        `Write(${CRITERION_RELPATH})`,
        `Edit(${LEDGER_RELPATH})`,
        `Write(${LEDGER_RELPATH})`,
      ], "both acceptor paths, for both operations");
      assert.ok(compiled.installed.includes(MEMBER_ID), "and it reaches its enforcement point");

      // The knob values are deliberately OUTSIDE it (ADR-005 §4, §5): denying every edit to
      // the file where they live would refuse legitimate work across a repository to protect
      // three keys, and still not bind the framework's own writes.
      assert.equal(
        compiled.permissions.some((entry) => entry.rule.includes("aof.config.json")),
        false,
        "no compiled rule names the file the knob values live in",
      );
    },
  },

  {
    name: "arch/61 FF-6105: EVERY census that pins the member set is DERIVED from the declaration — no site retypes it, and none is relaxed to a bound",
    run: async () => {
      // RE-BASED at chore 120 on 119/ADR-003 (a control stores a DECISION and derives a FACT).
      // ADR-012 §2's tripwire was five literal copies of the member set, each read out of its
      // suite's source here and compared with the declaration — and TECH_DEBT item 81 measured
      // what that cost: every story that moved the set was billed in files it had never read,
      // four stories running. The declaration is the policy's ONE home. What is asserted now is
      // that each site DERIVES from it: no string-array literal follows any of the five anchors,
      // each suite asserts the compiled set against `declaration.members` exactly, and the live
      // compile agrees with the declaration here as well — so a member arriving or leaving is
      // judged in full without a second signature in a test. The one declared bound that
      // remains is frozen-set/00's member FLOOR, which a withdrawal ceremony lowers.
      const declaration = bundledFrozenSet();
      const compiled = compileFrozenSet(declaration);
      const compiledSource = await readFile(path.join(repoRoot, "test", "bundle", "frozen-set-compiled.test.mjs"), "utf8");
      const withdrawalSource = await readFile(path.join(repoRoot, "test", "work", "framework-stops-shipping-guard.test.mjs"), "utf8");

      assert.ok(declaration.members.length > 0, "the declaration was read: it carries members");
      assert.deepEqual(compiled.installed, declaration.members.map((member) => member.id), "the live compile installs every declared member, in order");
      assert.deepEqual(
        compiled.permissions.map((entry) => [entry.id, entry.rule]),
        declaration.members
          .filter((member) => member.enforcementPoint === "permission denials")
          .flatMap((member) => (member.rule?.deny ?? []).map((rule) => [member.id, rule])),
        "the live compile's denials are the declared ones, member by member",
      );

      const retyped = [
        ["the member-id census", compiledSource, "declaration.members.map((member) => member.id),"],
        ["the installed-id census", compiledSource, "compiled.installed,"],
        ["the id/enforcement-point census", withdrawalSource, "const REMAINING ="],
        ["the compiled-permission census", withdrawalSource, "compiled.permissions.map((entry) => [entry.id, entry.rule]),"],
        ["the withdrawal suite's own installed-id census", withdrawalSource, "assert.deepEqual(compiled.installed,"],
      ].filter(([, source, anchor]) => literalAfter(source, anchor) != null).map(([site]) => site);
      assert.deepEqual(retyped, [], `a census retyped as a string-array literal is a second home for the declaration, billed to a stranger (119/ADR-003 §2):\n  - ${retyped.join("\n  - ")}`);

      // …and each suite asserts against the declaration itself, EXACTLY — a derivation, never a
      // bound wearing an equality, and never a subset check.
      assert.match(compiledSource, /assert\.deepEqual\(compiled\.installed,\s*declared,/u, "frozen-set-compiled derives the installed set from the declaration");
      assert.match(withdrawalSource, /assert\.deepEqual\(compiled\.installed,\s*declaration\.members\.map\(\(member\) => member\.id\)/u, "the withdrawal suite derives the installed set from the declaration");
      assert.match(withdrawalSource, /assert\.deepEqual\(compiled\.permissions\.map\(\(entry\) => \[entry\.id, entry\.rule\]\),\s*expected,/u, "…and its denials from the declared deny rules");
      for (const source of [compiledSource, withdrawalSource]) {
        assert.equal(/installed\.length\s*>=/u.test(source), false, "the installed set is asserted exactly against the declaration, never relaxed to a lower bound");
      }
    },
  },

  {
    name: "arch/61 FF-6105: a knob whose value changed under an accruing ledger is reported BY NAME, and is not mistaken for a criterion move",
    run: () => {
      const knob = "a.declared.knob";
      const rulings = [ruling(IN_FORCE, { key: knob, from: 3, to: 2 }), ruling(IN_FORCE, { key: knob, from: 3, to: 2 })];

      const moved = accrualReport({ rulings, criterion: IN_FORCE, knobValues: { [knob]: 1 } });
      assert.deepEqual(moved.knobChanges, [{ knob, from: 3, to: 1 }], "the knob is named, with the value it was accruing on and the one it now has");
      assert.equal(moved.criterionMoved, false, "a knob move is not a criterion move — a knob move is what a commit IS");
      assert.equal(moved.counted, 2, "…so it is reported rather than absorbed into the accrual");

      const still = accrualReport({ rulings, criterion: IN_FORCE, knobValues: { [knob]: 3 } });
      assert.deepEqual(still.knobChanges, [], "a knob standing still is not reported as having moved");

      // And the two questions a report must answer either way, on every shape.
      for (const report of [moved, still, accrualReport({ rulings: [], criterion: IN_FORCE })]) {
        assert.equal(typeof report.criterionMoved, "boolean");
        assert.ok(["reset", "carried-forward", "never-started"].includes(report.state));
      }
    },
  },

  {
    name: "arch/61 FF-6105: RED PROBE — every way this control can be walked past is named and driven",
    run: async () => {
      // Row 1 — the selector re-implemented as a FILTER. Caught by the there-and-back
      // ledger, which is the only shape the two disagree on.
      const digest = criterionDigest(IN_FORCE);
      const thereAndBack = [ruling(IN_FORCE), ruling(OTHER), ruling(IN_FORCE)];
      assert.notEqual(asAFilter(thereAndBack, digest).length, rulingsUnderCurrentCriterion(thereAndBack, digest).length);

      // Row 2 — a SECOND module in src/ selecting rulings by digest. The classifier is
      // driven over a planted source rather than over the tree, so the probe is repeatable.
      assert.deepEqual(
        digestSelectors([
          { file: "src/pretend-ledger.mjs", body: "export function totals(rulings, digest) { return rulings.filter((r) => r.digest === digest); }" },
        ]),
        ["src/pretend-ledger.mjs"],
        "a second home for the selection is visible",
      );
      assert.deepEqual(
        digestSelectors([{ file: "src/pretend-arithmetic.mjs", body: "export function totals(rulings) { return rulings.length; }" }]),
        [],
        "…and a module that merely sums a list it is handed is not — that leaf is ADR-006 §4a's, and it must not be dragged in here",
      );

      // Row 3 — a census relaxed to a subset. The parser reads the literal, so a census
      // that stopped being exact is read as disagreeing rather than as absent.
      assert.deepEqual(flatStrings(literalAfter('assert.deepEqual(compiled.installed, ["a", "b"]);', "compiled.installed,")), ["a", "b"]);
      assert.equal(literalAfter("nothing here", "compiled.installed,"), null, "an unreadable census is null, never a silent pass");
      assert.deepEqual(stringPairs('const REMAINING = [["a", "x"], ["b", "y"]];'.slice("const REMAINING = ".length)), [["a", "x"], ["b", "y"]]);

      // Row 4 — the bracket cut is structural. A nested array does not truncate the literal,
      // which a `[^\]]*` regex would.
      assert.deepEqual(
        stringPairs(literalAfter('const REMAINING = [["a", "x"], ["b", "y"]];', "const REMAINING =")),
        [["a", "x"], ["b", "y"]],
        "the literal is cut on matched brackets, so a nested array is read whole",
      );

      // Row 5 — the writer refusal weakened to a warning. The seam THROWS, so there is no
      // return value a caller could mistake for a completed revision.
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-ff6105-probe-"));
      try {
        const open = criterionRevisionWindow({
          lastClose: { epochId: "61", at: "2026-08-30T00:00:00.000Z" },
          rulings: [{ at: "2026-08-30T06:00:00.000Z" }],
        });
        let returned = "not-reached";
        try {
          returned = await writeCriterion(dir, { B: 22 }, { window: open });
        } catch (error) {
          assert.equal(error.code, CRITERION_FROZEN_IN_EPOCH);
          assert.equal(/warn|advisory/i.test(error.message), false, "the refusal is not worded as advice");
        }
        assert.equal(returned, "not-reached", "the seam returns nothing on a refusal");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }

      // Row 6 — the seam's body really is where the refusal lives, so a caller cannot reach
      // a write that skipped it.
      const home = stripComments(await readFile(path.join(srcDir, "work-acceptor", "criterion.mjs"), "utf8"));
      const seam = functionBody(home, "export async function writeCriterion");
      assert.ok(seam != null, "the seam's body was found");
      assert.match(seam, /reviseCriterion\(/, "every write goes through the refusal");
      assert.ok(seam.indexOf("reviseCriterion(") < seam.indexOf("writeFile("), "…and the refusal is raised before any bytes move");
    },
  },
];
