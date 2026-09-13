// arch/70 FF-7003 (ADR-003) — THE BOUND IS IN THE WRITER.
//
// The brief's size ceiling is enforced INSIDE `compilePhaseBrief` (in the writer), not in a
// caller, not in a lint, not in a comment; the ceiling is ONE literal/derivation in ONE
// module; and the truncation path NAMES what it dropped. The @executable behaviour lives in
// test/work/phase-brief-compile.test.mjs; this is the STRUCTURAL half.
//
// EXTENDED by milestone 70 / story 05 with arch/70 FF-7009 (ADR-009 §2/§3) — NO SECTION
// WITHOUT A DECLARED REDUCTION. The bound and the policy that spends it are the same
// subject, so the guard on one is the guard on the other; a sibling file here would be a
// second home for one rule (and, by acd-test-suite-registration's own invariant, a file no
// runner imports is no gate at all).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { srcFilesContaining } from "../../support/read-src-files.mjs";
import {
  BRIEF_BOUNDED_CONDENSERS,
  BRIEF_NON_CONDENSABLE_SECTIONS,
  BRIEF_SECTION_CONDENSERS,
  BRIEF_SECTION_PRIORITY,
  BRIEF_SECTION_SOURCES,
  compilePhaseBrief,
} from "../../../src/phase-brief.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcRoot = path.join(root, "src");

// FF-7009's rival-policy detector: a module OTHER than the compiler that declares a
// condenser map or a non-condensable set of its own. Keyed on the named constant being
// ASSIGNED, so consuming the one declaration — importing it, re-exporting it, indexing it,
// aliasing it — is not a rival. `rivals === 0` is trivially satisfiable by a detector that
// never fires, so this one has a self-check below, as every other detector in this file's
// sibling guards does.
function declaresRivalPolicy(text) {
  return /BRIEF_SECTION_CONDENSERS\s*=|BRIEF_NON_CONDENSABLE_SECTIONS\s*=/u.test(text);
}

// The artefact each declared section is addressed OUT OF, written down here as a literal
// per section. `BRIEF_SECTION_SOURCES` is the compiler's answer to "where is the full text
// read"; this is the independent statement of what that answer has to name. Kept in the
// DECLARATION guard rather than in a behavioural test because it is a property of the
// declaration: an eighth section arrives with an entry here, or it fails on its first
// commit exactly as it does for its missing condenser.
const SECTION_SOURCE_NAMES = Object.freeze({
  item: /\bref\b/u,
  story: /\bSTORY\.md\b/u,
  objective: /\bSPEC\.md\b/u,
  tasks: /\btasks\//u,
  architecture: /\bARCHITECTURE\.md\b/u,
  fitness: /\bARCHITECTURE\.md\b/u,
  dependencies: /\bdepends:/u,
});

export const archTests = [
  {
    name: "arch/70 FF-7003 (acd-phase-brief-bounded-in-writer): the ceiling enforcement lives inside the compiler's write path, and no caller applies a size limit or truncation of its own",
    run: async () => {
      const pb = await readFile(path.join(srcRoot, "phase-brief.mjs"), "utf8");
      // A word boundary rather than a closing paren, so the guard is keyed on WHERE the
      // enforcement lives and not on the arity of the function it lives in: ADR-010 §4 gave
      // `assemble` a second parameter (the reductions performed outside the plan, whose
      // notice lines the plan must still price) and the invariant — the ceiling is enforced
      // in the writer — did not move an inch.
      assert.match(pb, /function assemble\(sections\b/u, "the ceiling enforcement is IN the compiler's write path (assemble), not a lint/comment/caller");
      assert.match(pb, /PHASE_BRIEF_CEILING_CHARS/u, "the one ceiling constant is applied inside the writer");
      assert.match(pb, /renderCompleteContext\(text, notice\)/u, "the writer bounds the rendered sections together with the truncation notice actually sent");
      for (const file of ["commands/drive.mjs", "mesh/worker-execution.mjs"]) {
        const src = await readFile(path.join(srcRoot, file), "utf8");
        assert.doesNotMatch(src, /\.slice\(0,\s*\d+|\.substring\(0,\s*\d+|\.truncate\(|truncation/u, `${file} applies no size limit or truncation of its own`);
      }
    },
  },
  {
    name: "arch/70 FF-7003 (acd-phase-brief-bounded-in-writer): the truncation path names what it dropped",
    run: async () => {
      const pb = await readFile(path.join(srcRoot, "phase-brief.mjs"), "utf8");
      assert.match(pb, /buildNotice/u, "the truncation path builds a notice");
      assert.match(pb, /Dropped or shortened/u, "the notice names which sections were dropped or shortened");
    },
  },
  {
    name: "arch/70 FF-7003 (acd-phase-brief-bounded-in-writer): the ceiling is one number in one module — no second ceiling literal exists outside the compiler",
    run: async () => {
      // The walk comes from its one home (test/support/read-src-files.mjs): the same scan
      // was written out three times across three suites for this one fact.
      const second = await srcFilesContaining(root, String(8000), { except: ["phase-brief.mjs"] });
      assert.deepEqual(second, [], "no second ceiling literal exists outside the compiler");
    },
  },

  // ── FF-7009 (ADR-009 §2) — NO SECTION WITHOUT A DECLARED REDUCTION ─────────────────────
  {
    name: "arch/70 FF-7009 (acd-phase-brief-bounded-in-writer): the compiler exports two frozen declarations — the condenser map and the non-condensable set — whose union is exactly BRIEF_SECTION_PRIORITY and whose intersection is empty",
    run: () => {
      assert.ok(Object.isFrozen(BRIEF_SECTION_CONDENSERS), "the condenser map is a FROZEN declaration, not a mutable lookup");
      assert.ok(Object.isFrozen(BRIEF_NON_CONDENSABLE_SECTIONS), "the non-condensable set is a FROZEN declaration");
      assert.ok(Object.isFrozen(BRIEF_SECTION_PRIORITY), "and the section list they must cover is frozen too");

      const condensable = Object.keys(BRIEF_SECTION_CONDENSERS);
      const nonCondensable = [...BRIEF_NON_CONDENSABLE_SECTIONS];
      const union = [...new Set([...condensable, ...nonCondensable])].sort();
      const intersection = condensable.filter((id) => nonCondensable.includes(id));

      assert.deepEqual(union, [...BRIEF_SECTION_PRIORITY].sort(), "the union of the two declarations is EXACTLY the declared section list — every section, and no section that does not exist");
      assert.deepEqual(intersection, [], "their intersection is empty — no section is declared both condensable and not");
      assert.equal(condensable.length + nonCondensable.length, BRIEF_SECTION_PRIORITY.length, "and each section is declared exactly once, in exactly one of them");

      // Every one of the seven, named — an ADR that enumerates N paths is covered on all N
      // (m02/R6), so a section can never be reached by this guard only by accident.
      for (const id of BRIEF_SECTION_PRIORITY) {
        const declaredCondenser = BRIEF_SECTION_CONDENSERS[id];
        const declaredNonCondensable = BRIEF_NON_CONDENSABLE_SECTIONS.includes(id);
        assert.ok(
          (typeof declaredCondenser === "function") !== declaredNonCondensable,
          `${id} declares its reduction exactly once: a condenser function, or membership of the non-condensable set — never both and never neither`,
        );
        assert.ok(typeof BRIEF_SECTION_SOURCES[id] === "string" && BRIEF_SECTION_SOURCES[id].length > 0, `${id} declares where its full text is read, so any disposition can point at it (ADR-009 §6)`);
        // …and it names a REAL ARTEFACT, pinned by literal here rather than compared back
        // against the constant that produced it. "Non-empty string" is satisfied by
        // "elsewhere", which would point every phase at nowhere while every assertion in
        // the behavioural suites — each of which reads the pointer out of this same
        // constant — stayed green. A pointer is only a pointer if something names its
        // target independently.
        assert.match(BRIEF_SECTION_SOURCES[id], SECTION_SOURCE_NAMES[id], `${id} points at the artefact its text is actually read from`);
      }

      // THE NEGATIVE ASSERTION. A guard of the form "X exists nowhere outside Y" is only a
      // guard if it can be shown to FAIL: an EIGHTH section added to the priority list with
      // no declared reduction must be caught, and it is caught by this exact predicate.
      const withEighth = [...BRIEF_SECTION_PRIORITY, "provenance"];
      const stillCovered = withEighth.every((id) => BRIEF_SECTION_CONDENSERS[id] != null || BRIEF_NON_CONDENSABLE_SECTIONS.includes(id));
      assert.equal(stillCovered, false, "an eighth section with no declared reduction fails this predicate — droppable-for-size-alone BY OMISSION cannot slip through");
    },
  },
  {
    name: "arch/70 FF-7009 (acd-phase-brief-bounded-in-writer): the two declarations are exported from the ONE compiler module, the deleted prefix cut is gone, and the notice names all three dispositions distinguishably beside the retained roll-call",
    run: async () => {
      const pb = await readFile(path.join(srcRoot, "phase-brief.mjs"), "utf8");
      for (const name of ["BRIEF_SECTION_CONDENSERS", "BRIEF_NON_CONDENSABLE_SECTIONS", "BRIEF_BOUNDED_CONDENSERS"]) {
        assert.match(pb, new RegExp(`export const ${name} = Object\\.freeze\\(`, "u"), `${name} is declared and frozen in the pure compiler`);
      }
      // One home for the policy (ADR-009 §5): no other src module declares a condenser map
      // or a non-condensable set of its own.
      const { glob } = await import("node:fs/promises");
      let rivals = 0;
      for await (const file of glob(path.join(srcRoot, "**", "*.mjs"))) {
        if (file.endsWith("phase-brief.mjs")) continue;
        const text = await readFile(file, "utf8");
        if (declaresRivalPolicy(text)) rivals += 1;
      }
      assert.equal(rivals, 0, "one bound, one policy, one home — no rival declaration exists outside the compiler");

      // ADR-009 §3 DELETES the prefix cut. Its absence from the CODE is the invariant; the
      // module's own comment still names it, because recording what was removed and why is
      // the point of the comment.
      assert.doesNotMatch(stripComments(pb), /lowerPriorityDropped/u, "`lowerPriorityDropped` — the cut that turned one miss into every miss — is deleted from the code");

      // ADR-009 §6: the delivered roll-call phrase is RETAINED, and the three dispositions
      // are ADDED beside it rather than substituted for it.
      assert.match(pb, /Dropped or shortened/u, "the delivered roll-call phrase is retained");
      for (const disposition of ["condensed", "sacrificed", "unshippable"]) {
        assert.ok(
          new RegExp(`\\b${disposition}\\b`, "iu").test(pb),
          `the notice can name a section ${disposition}`,
        );
        assert.match(pb, new RegExp(`${disposition}:\\s*"${disposition.toUpperCase()}`, "iu"), `${disposition} has its own distinguishable label in the notice`);
      }
      // A bounded condenser is declared as such, and every bounded section has a condenser
      // to be bounded (an id in the bounded set with no condenser declares nothing).
      for (const id of BRIEF_BOUNDED_CONDENSERS) {
        assert.ok(typeof BRIEF_SECTION_CONDENSERS[id] === "function", `${id} is declared bounded, so it declares the condenser that states its own count`);
      }
    },
  },
  {
    name: "arch/70 FF-7009 (acd-phase-brief-bounded-in-writer): every declared section REACHES a phase — a refine brief offers exactly BRIEF_SECTION_PRIORITY, so an eighth section cannot be declared, given a reduction, and then be absent from every brief",
    run: () => {
      // The hole this closes: FF-7009 guarded the condenser/non-condensable union against an
      // eighth section, and said nothing about the per-phase selection. `PHASE_SECTIONS.refine`
      // was an element-for-element second copy of the priority list, so a section could be
      // added to the declaration, given a declared reduction, pass every assertion above —
      // and reach no brief at all. Asserted BEHAVIOURALLY rather than by reading the constant,
      // because this test cannot know a future section's input key: it supplies the seven it
      // knows, and an eighth that never arrives makes the offered set shorter than the
      // declared one, which is the failure.
      const ctx = compilePhaseBrief({
        itemRef: "70/05",
        phase: "refine",
        story: "## User story\nAs a phase, I want my context.",
        objective: "## Objective\nThe objective.",
        tasks: ["@executable\nFeature: F\n  Scenario: s\n    Given a"],
        architecture: { declared: ["ADR-001"], text: "## ADR-001 — a decision\n**Decision.** It was decided." },
        fitness: "## Fitness functions\n| id | invariant |\n|---|---|\n| FF-1 | it holds |",
        dependencies: "70/00",
      });
      assert.deepEqual(
        ctx.sections.map((section) => section.id),
        [...BRIEF_SECTION_PRIORITY],
        "a refine brief offers every declared section, in the declared order — the phase selection and the priority list are one list, not two",
      );
      assert.deepEqual(ctx.dropped, [], "and none of them was lost on the way, so the comparison above is about the SELECTION and not about the packing");
    },
  },
  {
    name: "arch/70 FF-7009 (acd-phase-brief-bounded-in-writer): self-check — a planted rival condenser map or non-condensable set trips the detector; importing, re-exporting, aliasing or indexing the one declaration does not",
    run: () => {
      for (const planted of [
        'export const BRIEF_SECTION_CONDENSERS = Object.freeze({ story: condenseStory });',
        "const BRIEF_SECTION_CONDENSERS = { tasks: shorten };",
        'export const BRIEF_NON_CONDENSABLE_SECTIONS = Object.freeze(["item"]);',
        "let BRIEF_NON_CONDENSABLE_SECTIONS  =  [];",
      ]) {
        assert.ok(declaresRivalPolicy(planted), `a planted second declaration trips the detector (${planted})`);
      }
      for (const legitimate of [
        'import { BRIEF_SECTION_CONDENSERS } from "./phase-brief.mjs";',
        'export { BRIEF_NON_CONDENSABLE_SECTIONS } from "./phase-brief.mjs";',
        "const map = BRIEF_SECTION_CONDENSERS;",
        "if (BRIEF_SECTION_CONDENSERS[section.id] == null) return null;",
        "const isDeclared = BRIEF_NON_CONDENSABLE_SECTIONS.includes(id);",
      ]) {
        assert.ok(!declaresRivalPolicy(legitimate), `the detector does NOT flag consumption of the one declaration (${legitimate})`);
      }
      // …and the detector really is the one the guard above ran: the compiler itself, the
      // ONE legitimate home, trips it. If it did not, `rivals === 0` would prove nothing.
      assert.ok(
        declaresRivalPolicy("export const BRIEF_SECTION_CONDENSERS = Object.freeze({\n  story: condenseStory,\n});"),
        "the declaration shape the compiler actually uses is what the detector is looking for",
      );
    },
  },
];
