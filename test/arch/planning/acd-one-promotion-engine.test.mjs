// Fitness function FF-7104 for milestone 71 / ADR-004 (amended by ADR-009 §2):
// "One promotion engine, two faces — no second chore-seeding, back-reference or idempotence writer,
//  and the engine does not import upward."
//
// `work:promote-gap` already did 90% of a promotion: reuse the chore insert seam, seed the DoD from
// a close criterion, append a `## Notes` back-reference. Copying that into a finding promoter would
// have been two chore-seeding writers — the duplication this whole register exists to refuse. So the
// mechanics moved into `src/work-promote/` and both faces reach them by import.
//
// FOUR LEGS:
//   1. each mechanic — the DoD seed, the back-reference author, the append-position resolver, the
//      idempotence scan — has EXACTLY ONE definition site anywhere in `src/`;
//   2. both faces reach them BY IMPORT and contain no copy of any of them;
//   3. a tree-wide sweep for a RIVAL promoter, matched by a PROMOTION SIGNATURE rather than a bare
//      shape (ADR-009 §2), reports nothing outside the family;
//   4. the family is a LEAF: no file under `src/work-promote/` imports from `../commands/`.
//
// WHY THE SIGNATURE IS A CONJUNCTION, and this is the measured part. The tempting sweep — "a
// `## Notes` heading matcher" or "a section-range walk" — reds on two live, unrelated homes:
// `src/phase-brief.mjs` (`extractH2Block(text, (title) => /^notes$/i.test(title))`) and
// `src/memory/local-indexing.mjs`'s `splitSections`. Neither has anything to do with promotion. A
// module qualifies as a rival only if it BOTH seeds a Definition of Done AND writes a chore record
// doc, and leg 3 asserts those two files are NOT reported — which is the assertion that proves the
// signature is doing the narrowing rather than the luck.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FAMILY = "src/work-promote";
const SEED = "src/work-promote/chore-seed.mjs";
const ENGINE = "src/work-promote/promotion.mjs";
const FACES = Object.freeze(["src/commands/promote-gap-to-chore.mjs", "src/commands/promote-finding-to-chore.mjs"]);
// The two live homes the bare-shape sweep reported, kept as named non-subjects (ADR-009 §2).
const NOT_PROMOTERS = Object.freeze(["src/phase-brief.mjs", "src/memory/local-indexing.mjs"]);

// The four mechanics, each as the source signature that identifies its DEFINITION — never a name a
// caller could also mention, so an importing face does not read as a second home.
const MECHANICS = Object.freeze([
  // The heading MATCHER, not the phrase: a face may legitimately NAME the Definition of Done in a
  // refusal message ("A remedy is required to seed the chore's Definition of Done") without holding
  // a second copy of the seeding routine, and a control that reddened on that sentence would be the
  // requiring-grep species m01/R1 indicts.
  { name: "the Definition-of-Done seed", home: SEED, signature: /Definition of Done\\s\*\$/u },
  { name: "the back-reference author", home: SEED, signature: /Promoted from/u },
  { name: "the append-position resolver", home: ENGINE, signature: /function appendPosition\s*\(/u },
  { name: "the idempotence scan", home: ENGINE, signature: /function findPromotedChore\s*\(/u },
]);

async function sourceUnits(dir = path.join(root, "src"), prefix = "src") {
  const units = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) units.push(...await sourceUnits(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".mjs")) {
      units.push({ rel, code: stripComments(await readFile(path.join(dir, entry.name), "utf8")) });
    }
  }
  return units;
}

// Leg 1 + 2 — one home each, and the faces hold no copy.
export function singleHomeProblems(units) {
  const problems = [];
  for (const mechanic of MECHANICS) {
    const homes = units.filter((unit) => mechanic.signature.test(unit.code)).map((unit) => unit.rel).sort();
    if (homes.length !== 1 || homes[0] !== mechanic.home) {
      problems.push(`${mechanic.name}: expected exactly one home at ${mechanic.home}, found ${homes.length === 0 ? "none" : homes.join(", ")}`);
    }
  }
  for (const rel of FACES) {
    const face = units.find((unit) => unit.rel === rel);
    if (!face) {
      problems.push(`${rel}: NOT FOUND — a promotion face is missing`);
      continue;
    }
    if (!new RegExp(`from "\\.\\./work-promote/`, "u").test(face.code)) {
      problems.push(`${rel}: reaches no ${FAMILY} module by import — a face that imports nothing is carrying its own copy`);
    }
  }
  return problems;
}

// Leg 3 — the rival sweep. A module is a promoter only if it BOTH seeds a Definition of Done AND
// writes a chore record doc; anything outside the family matching both is a second promoter.
export function rivalPromoterProblems(units) {
  return units
    .filter((unit) => !unit.rel.startsWith(`${FAMILY}/`))
    .filter((unit) => /Definition of Done/u.test(unit.code) && /CHORE\.md/u.test(unit.code))
    .map((unit) => `${unit.rel}: matches the promotion signature (seeds a Definition of Done AND writes a chore record doc) outside ${FAMILY}`);
}

// Leg 4 — the family is a leaf, exactly as `src/work-tune/`, `src/work-audit/` and
// `src/work-acceptor/` are. The FACES call `runInsertTopLevel`; the engine never reaches up to them.
export function layeringProblems(units) {
  return units
    .filter((unit) => unit.rel.startsWith(`${FAMILY}/`))
    .filter((unit) => /from\s+"\.\.\/commands\//u.test(unit.code))
    .map((unit) => `${unit.rel}: imports from ../commands/ — the promotion engine must stay a leaf`);
}

const planted = (units, rel, mutate) => units.map((unit) => (unit.rel === rel ? { ...unit, code: mutate(unit.code) } : unit));

export const archTests = [
  {
    name: "arch/71 FF-7104 (acd-one-promotion-engine): each mechanic has one home, both faces import it, no rival promoter exists, and the engine is a leaf",
    run: async () => {
      const units = await sourceUnits();
      assert.ok(units.length > 100, `the source tree was actually read: ${units.length} modules`);
      for (const rel of [SEED, ENGINE, ...FACES]) {
        assert.ok(units.some((unit) => unit.rel === rel), `${rel} is in the swept set`);
      }

      assert.deepEqual(singleHomeProblems(units), [], "legs 1 + 2 — one home each, reached by import");
      assert.deepEqual(rivalPromoterProblems(units), [], "leg 3 — no rival promoter outside the family");
      assert.deepEqual(layeringProblems(units), [], "leg 4 — the family imports nothing from ../commands/");

      // The three in-tree siblings this family is modelled on carry the same layering property, so
      // the leg is a house rule rather than a rule invented for one directory.
      for (const family of ["src/work-tune/", "src/work-audit/", "src/work-acceptor/"]) {
        const siblings = units.filter((unit) => unit.rel.startsWith(family));
        assert.ok(siblings.length > 0, `${family} exists`);
        for (const sibling of siblings) {
          assert.equal(/from\s+"\.\.\/commands\//u.test(sibling.code), false, `${sibling.rel}: the precedent family imports no command either`);
        }
      }
    },
  },
  {
    name: "arch/71 FF-7104: a copied mechanic in either face — or in a third module — is reported naming the file",
    run: async () => {
      const units = await sourceUnits();
      for (const face of FACES) {
        const copied = planted(units, face, (code) => `${code}\nconst DOD = /^##\\s+Definition of Done\\s*$/;\n`);
        const problems = singleHomeProblems(copied);
        assert.ok(
          problems.some((problem) => problem.includes("Definition-of-Done seed") && problem.includes(face)),
          `${face}: a copied seeding routine is reported naming the file\n${problems.join("\n")}`,
        );
      }

      // A THIRD module anywhere in `src/` that both seeds a DoD and writes a chore doc is a second
      // promoter, and the sweep runs over all of `src/` so it is caught wherever it lands.
      const rival = [...units, { rel: "src/some-new-thing.mjs", code: 'const h = "## Definition of Done"; await write("CHORE.md", h);' }];
      assert.ok(
        rivalPromoterProblems(rival).some((problem) => problem.includes("src/some-new-thing.mjs")),
        "a third promoter landing anywhere in src/ is reported",
      );

      // …and an upward import inside the engine fails the layering leg.
      const upward = planted(units, ENGINE, (code) => `import { runInsertTopLevel } from "../commands/insert-shared.mjs";\n${code}`);
      assert.ok(
        layeringProblems(upward).some((problem) => problem.includes(ENGINE)),
        "an ../commands/ import inside the engine is reported",
      );
    },
  },
  {
    name: "arch/71 FF-7104: the signature is what narrows — the two live non-promoters a bare shape reported are NOT reported",
    run: async () => {
      const units = await sourceUnits();
      // Both really are in the swept set (so their absence is not what keeps the sweep green) and
      // both really do carry the bare shape the rejected sweep matched.
      const shapes = {
        // `extractH2Block(text, (title) => /^notes$/i.test(title))` — the `## Notes` heading matcher.
        "src/phase-brief.mjs": /\^notes\$/iu,
        // `splitSections` — the section-range walk.
        "src/memory/local-indexing.mjs": /splitSections/u,
      };
      for (const rel of NOT_PROMOTERS) {
        const unit = units.find((row) => row.rel === rel);
        assert.ok(unit, `${rel} is in the swept set`);
        assert.match(unit.code, shapes[rel], `${rel} really does carry the bare shape the rejected sweep matched`);
      }
      const reported = rivalPromoterProblems(units);
      for (const rel of NOT_PROMOTERS) {
        assert.equal(reported.some((problem) => problem.includes(rel)), false, `${rel} is not reported as a promoter`);
      }
    },
  },
];
