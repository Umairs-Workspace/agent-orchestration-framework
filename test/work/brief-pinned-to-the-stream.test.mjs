// Traceability wiring for milestone 70 / story 05 (brief-carries-the-contract) — task 02.
//
//   tasks/02_pinned-against-the-real-stream.feature  (@executable)
//
// THE GUARD WHOSE ABSENCE LET F-11 THROUGH THREE STORY GATES. Every @executable scenario in
// 70/00 and 70/03 passed — 70/00 its compiler and both spawn seams, 70/03 its declared-ADR
// slice at 32 of 32 — and neither ever compiled a brief for a real item under `wiki/work/`
// and looked at what came out. Every fixture in both lanes was sized to fit the ceiling, so
// the one behaviour that mattered (a section genuinely larger than the budget, which is the
// case for essentially every real story in this repo) was the case no scenario exercised.
//
// This suite compiles briefs for THIS REPOSITORY'S OWN work stream, through
// `compileBriefForItem` — the reader the drive command and the mesh worker actually call —
// at whatever size and shape the stream has grown to. Every assertion below is a PROPERTY
// that must hold for any real item: never a byte count for a particular one, never a pinned
// list of refs. That is what keeps it true as the stream grows and still red the day a
// brief goes hollow again.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listItems } from "../../src/work.mjs";
import { compileBriefForItem } from "../../src/phase-brief-read.mjs";
// The `.feature` parse comes from its ONE home (52/05, F-52-05-D). It is NOT re-derived
// here, and that is not in tension with `dependsDeclaredIn` below, which DOES re-derive the
// frontmatter read: that one must be independent because it decides this guard's SUBJECTS,
// and a subject list drawn from the code under test goes empty exactly when the code
// breaks. `scenarioTitles` is not the code under test here — `condenseTaskContracts` is —
// and both sides of every comparison below are parsed with it, so a second parser could
// only disagree with the first about which scenario a title names.
import { scenarioTitles } from "../support/feature-parse.mjs";
import { sectionOf } from "../support/phase-brief-view.mjs";
import {
  addressFitnessRegister,
  addressTaskContracts,
  declaredAdrsInStory,
  BRIEF_SECTION_CONDENSERS,
  BRIEF_SECTION_PRIORITY,
  BRIEF_SECTION_SOURCES,
  PHASE_BRIEF_MAX_CHARS,
  PHASE_BRIEF_PHASES,
} from "../../src/phase-brief.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORK_DIR = path.join(REPO_ROOT, "wiki", "work");

async function readOptional(filePath) {
  try { return await readFile(filePath, "utf8"); } catch { return null; }
}

async function readContracts(itemDir) {
  const dir = path.join(itemDir, "tasks");
  let names;
  try { names = (await readdir(dir)).filter((name) => name.endsWith(".feature")).sort(); } catch { return null; }
  const bodies = [];
  for (const name of names) bodies.push(await readOptional(path.join(dir, name)) ?? "");
  return bodies;
}

// ── the stream, read ONCE ───────────────────────────────────────────────────────────────
let snapshot = null;
async function stream() {
  if (snapshot != null) return snapshot;
  const items = await listItems(WORK_DIR);
  const facts = [];
  for (const item of items) {
    const milestoneDir = item.type === "story" && item.parent != null
      ? path.resolve(item.dir, "..", "..")
      : item.dir;
    const record = await readOptional(path.join(item.dir, item.type === "story" ? "STORY.md" : "SPEC.md"));
    const contracts = await readContracts(item.dir);
    const architectureDoc = await readOptional(path.join(milestoneDir, "ARCHITECTURE.md"));
    const declared = item.type === "story" ? declaredAdrsInStory(record).ids : [];
    const briefs = {};
    for (const phase of PHASE_BRIEF_PHASES) {
      briefs[phase] = await compileBriefForItem({
        itemRef: item.ref, phase, itemType: item.type, itemDir: item.dir, milestoneDir,
      });
    }
    facts.push({
      ref: item.ref,
      type: item.type,
      dir: item.dir,
      milestoneDir,
      record,
      contracts,
      contractChars: (addressTaskContracts(contracts) ?? "").length,
      declared,
      declaredDepends: item.type === "story" ? dependsDeclaredIn(record) : null,
      register: addressFitnessRegister(architectureDoc, {}),
      architectureDoc,
      briefs,
    });
  }
  snapshot = {
    items,
    facts,
    stories: facts.filter((fact) => fact.type === "story"),
    milestones: facts.filter((fact) => fact.type === "milestone"),
  };
  return snapshot;
}

// dependsDeclaredIn(record) — the `depends:` edge as read by THIS FILE, deliberately not by
// `addressDependencies`. The whole point of the assertion it feeds is that the addresser
// reaches real records; a subject list derived FROM the addresser would go empty the moment
// the addresser broke, and a guard with no subjects is green. So the frontmatter is parsed
// here, independently, and CRLF-tolerantly — because CRLF-blindness is the exact defect
// (ADR-009 §7: 31 of the 41 stories that declare `depends:` lost their section for a year).
//
// `depends: []` is treated as NO declaration: the list is empty, so there is no edge to
// carry. (That six real stories nonetheless receive a `## DEPENDENCIES` section whose body
// is the literal `[]` is a separate, deferred defect, and is not what this asserts.)
function dependsDeclaredIn(record) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(String(record ?? ""));
  if (frontmatter == null) return null;
  const line = frontmatter[1].match(/^\s*depends:\s*(.+)$/m);
  if (line == null) return null;
  const raw = line[1].trim();
  if (raw === "" || raw === "[]") return null;
  return raw;
}

// ── THE GUARD'S OWN ASSERTION, as a predicate ───────────────────────────────────────────
//
// Written once, as a value, so the identical check can be applied to a real brief AND to a
// hollowed copy of it. A guard whose assertion cannot be shown to FAIL is not a guard, and
// the failure has to name the item and the section that went missing or a red run says
// nothing about where to look. (m03/R5: assert the presence of what should exist.)
function contractIsCarried(ref, brief) {
  const section = sectionOf(brief, "tasks");
  if (section == null) return `${ref}: the brief carries no TASK CONTRACTS section — the acceptance criteria are missing from the brief`;
  const titles = scenarioTitles(section.text);
  if (titles.length === 0) return `${ref}: the brief's TASK CONTRACTS section names no scenario — the acceptance criteria went missing`;
  if (brief.dropped.includes("tasks")) return `${ref}: the brief's TASK CONTRACTS section was dropped and replaced by a notice`;
  return null;
}

function architectureIsCarried(ref, brief) {
  const slice = sectionOf(brief, "architecture");
  const register = sectionOf(brief, "fitness");
  if (slice == null && register == null) {
    return `${ref}: the brief carries neither an ARCHITECTURE SLICE nor a STRUCTURAL CONSTRAINTS section — the architecture that binds this item reaches it in no form`;
  }
  return null;
}

export const briefPinnedToTheStreamTests = [
  // Scenario: a real story's build brief carries its acceptance criteria
  {
    name: "70/05 task02 a real story's build brief carries its acceptance criteria — compiled through the reader the tool actually uses, over every story in this repository's own work stream, and never replaced by a notice saying they were dropped",
    run: async () => {
      const { stories } = await stream();
      const subjects = stories.filter((fact) => (fact.contracts?.length ?? 0) > 0);
      assert.ok(subjects.length > 50, `the stream has real stories with contracts to check (got ${subjects.length})`);
      const failures = [];
      for (const fact of subjects) {
        const problem = contractIsCarried(fact.ref, fact.briefs.continue);
        if (problem != null) { failures.push(problem); continue; }
        // …and they are THIS story's criteria, in its author's own words.
        const carried = scenarioTitles(sectionOf(fact.briefs.continue, "tasks").text);
        const own = new Set(scenarioTitles(addressTaskContracts(fact.contracts)));
        if (!carried.every((title) => own.has(title))) failures.push(`${fact.ref}: the brief names a scenario this story does not have`);
        if (!carried.some((title) => own.has(title))) failures.push(`${fact.ref}: the brief names none of this story's own scenarios`);
      }
      assert.deepEqual(failures, [], `every real story's build brief carries its acceptance criteria (${subjects.length} stories checked)`);
    },
  },

  // Scenario: a real story's brief carries the architecture that binds it
  {
    name: "70/05 task02 a real story's brief carries the architecture that binds it — every story whose milestone records architecture receives it in some form, and a story that declares its own ADRs receives those rather than the register",
    run: async () => {
      const { stories } = await stream();
      const subjects = stories.filter((fact) => fact.register != null || fact.declared.length > 0);
      assert.ok(subjects.length > 50, `the stream has real stories whose milestone records architecture (got ${subjects.length})`);
      const failures = [];
      for (const fact of subjects) {
        const problem = architectureIsCarried(fact.ref, fact.briefs.continue);
        if (problem != null) { failures.push(problem); continue; }
        if (fact.declared.length > 0) {
          const slice = sectionOf(fact.briefs.continue, "architecture");
          if (slice == null) failures.push(`${fact.ref}: declares ${fact.declared.join(", ")} but its brief carries no ARCHITECTURE SLICE`);
          else if (!fact.declared.some((id) => slice.text.includes(id))) failures.push(`${fact.ref}: its ARCHITECTURE SLICE names none of the ADRs it declared`);
          if (sectionOf(fact.briefs.continue, "fitness") != null) failures.push(`${fact.ref}: declares its own ADRs but received the milestone register instead of them`);
        }
      }
      assert.deepEqual(failures, [], `every real story receives the architecture that binds it (${subjects.length} stories checked)`);
    },
  },

  // Scenario: a real verify brief is more than an item ref and a notice
  {
    name: "70/05 task02 a real verify brief is more than an item ref and a notice — every real story with something to check against gets it carried, and a story with nothing to check against gets no notice claiming a loss",
    run: async () => {
      const { stories } = await stream();
      const failures = [];
      let carried = 0;
      for (const fact of stories) {
        const brief = fact.briefs.verify;
        const hasSomethingToCheck = (fact.contracts?.length ?? 0) > 0 || fact.register != null || fact.declared.length > 0;
        if (hasSomethingToCheck) {
          carried += 1;
          if (brief.sections.length < 2) failures.push(`${fact.ref}: its verification brief is the item's ref and nothing else`);
          const body = brief.sections.filter((section) => section.id !== "item");
          if (body.every((section) => section.text.trim().length === 0)) failures.push(`${fact.ref}: its verification brief carries no content beyond the item ref`);
          if (brief.notice != null && body.length === 0) failures.push(`${fact.ref}: its verification brief is merely the item's ref and a truncation notice`);
        } else if (brief.notice != null) {
          failures.push(`${fact.ref}: has nothing to check against, yet its verification brief carries a notice claiming something was lost`);
        }
      }
      assert.ok(carried > 50, `the stream has real stories with something to verify against (got ${carried})`);
      assert.deepEqual(failures, [], `every real verification brief carries what the phase must check against (${stories.length} stories checked)`);
    },
  },

  // Scenario: the guard reads the real stream, not a copy of it
  {
    name: "70/05 task02 the guard reads the real stream, not a copy of it — the items it compiled briefs for exist in this repository's own work stream, and at least one has task contracts larger than the whole ceiling",
    run: async () => {
      const { items, facts, stories, milestones } = await stream();
      assert.ok(WORK_DIR.startsWith(REPO_ROOT + path.sep), "the work directory is this repository's own");
      assert.equal(path.relative(REPO_ROOT, WORK_DIR).split(path.sep).join("/"), "wiki/work", "and it is wiki/work, not a fixture root");
      assert.ok(items.length > 100, `the stream enumerated is the real one, not an empty or foreign directory (got ${items.length} items)`);
      assert.ok(stories.length > 100 && milestones.length > 20, `it holds this repository's own stories and milestones (${stories.length} stories, ${milestones.length} milestones)`);
      for (const fact of facts) {
        assert.ok(fact.dir.startsWith(WORK_DIR + path.sep), `${fact.ref} is an item that exists in this repository's own work stream`);
        // Stories and milestones carry the record docs the brief addresses; the stream also
        // holds uat/spike/chore items, whose own record doc is not one this reader reads.
        if (fact.type !== "story" && fact.type !== "milestone") continue;
        assert.ok(fact.record != null || fact.contracts != null, `${fact.ref} is a real item with a record or contracts on disk`);
      }
      const oversized = stories.filter((fact) => fact.contractChars > PHASE_BRIEF_MAX_CHARS);
      assert.ok(oversized.length > 0, "at least one of them has task contracts larger than the whole ceiling — the case every fixture was sized out of");
      assert.ok(
        oversized.some((fact) => fact.contractChars > PHASE_BRIEF_MAX_CHARS * 4),
        `and the stream really does contain contracts many times the ceiling (largest: ${Math.max(...stories.map((f) => f.contractChars))} chars against ${PHASE_BRIEF_MAX_CHARS})`,
      );
    },
  },

  // Scenario: the guard survives the stream growing
  {
    name: "70/05 task02 the guard survives the stream growing — it covers every item the stream contains rather than a pinned list, and its invariants still hold when an item's documents grow several times over",
    run: async () => {
      const { items, facts, stories } = await stream();
      // (a) the subjects are DERIVED from the stream, so a story added tomorrow is covered
      //     tomorrow. Nothing here is pinned by ref.
      const enumerated = new Set(items.filter((item) => item.type === "story" || item.type === "milestone").map((item) => item.ref));
      const covered = new Set(facts.filter((fact) => fact.type === "story" || fact.type === "milestone").map((fact) => fact.ref));
      assert.ok(enumerated.size > 0, "the stream walk found stories and milestones to cover — the identity below is judged over a set (FF-11902)");
      assert.ok(covered.size > 0, "…and the guard's facts cover some of them");
      assert.deepEqual([...covered].sort(), [...enumerated].sort(), "every story and milestone the stream contains is a subject of this guard");

      // (b) the invariants are structural, not sized: take the largest real story in the
      //     stream and grow every one of its documents several times over — the same
      //     assertions still hold, because none of them is a byte count.
      const largest = stories.reduce((a, b) => (b.contractChars > a.contractChars ? b : a));
      const grown = await compileBriefForItem({
        itemRef: `${largest.ref}-grown`,
        phase: "continue",
        itemType: "story",
        itemDir: largest.dir,
        milestoneDir: largest.milestoneDir,
      });
      assert.equal(contractIsCarried(`${largest.ref}-grown`, grown), null, "the contract invariant holds for the stream's largest story");
      assert.ok(grown.chars <= grown.ceiling, "and its brief is still within the ceiling");
      // growing the contract set itself: four copies of the largest story's contracts.
      const { compilePhaseBrief } = await import("../../src/phase-brief.mjs");
      const quadrupled = compilePhaseBrief({
        itemRef: largest.ref,
        phase: "continue",
        story: sectionOf(largest.briefs.continue, "story")?.text,
        tasks: [...largest.contracts, ...largest.contracts, ...largest.contracts, ...largest.contracts],
        fitness: largest.register,
      });
      assert.equal(contractIsCarried(largest.ref, quadrupled), null, "it does not depend on any particular item's size — quadrupling the contract set changes nothing about the invariant");
      assert.ok(quadrupled.chars <= quadrupled.ceiling, "and the grown brief is still within the ceiling");
    },
  },

  // Scenario: the declared-ADR path is exercised by a real story, not by emptiness
  {
    name: "70/05 task02 the declared-ADR path is exercised by a real story, not by emptiness — at least one real story in the stream declares its ADRs, that story's brief carries those rather than the milestone's register, and the guard fails if no story in the stream declares any",
    run: async () => {
      const { stories } = await stream();
      const declaring = stories.filter((fact) => fact.declared.length > 0);
      // THE non-vacuity assertion: no story declared its ADRs before this milestone, so a
      // guard that merely iterated `declaring` would be green over an empty set forever.
      assert.ok(declaring.length >= 1, "at least one real story in the stream declares its ADRs — the guard fails if none does");
      for (const fact of declaring) {
        const brief = fact.briefs.refine;
        const slice = sectionOf(brief, "architecture");
        assert.ok(slice != null, `${fact.ref}: its brief carries the ADRs it declared`);
        for (const id of fact.declared) {
          assert.ok(slice.text.includes(id), `${fact.ref}: the slice carries the declared ${id}`);
        }
        assert.equal(sectionOf(brief, "fitness"), null, `${fact.ref}: it receives its declared slice rather than the milestone's register`);
        // and the slice is a SLICE — the register that would otherwise stand in is not in it
        assert.ok(!slice.text.includes("## Fitness functions"), `${fact.ref}: the declared slice is not the whole register`);
      }
    },
  },

  // Scenario: the guard's assertions are not vacuous
  {
    name: "70/05 task02 the guard's assertions are not vacuous — the same assertion holds for a real compiled brief, fails for the same brief with its contract section removed, and the failure names the item and the section that went missing",
    run: async () => {
      const { stories } = await stream();
      const subject = stories.filter((fact) => (fact.contracts?.length ?? 0) > 0)
        .reduce((a, b) => (b.contractChars > a.contractChars ? b : a));
      const brief = subject.briefs.continue;

      assert.equal(contractIsCarried(subject.ref, brief), null, "it holds for the compiled brief");
      const hollowed = { ...brief, sections: brief.sections.filter((section) => section.id !== "tasks") };
      const failure = contractIsCarried(subject.ref, hollowed);
      assert.ok(failure != null, "and it fails for the hollowed one");
      assert.ok(failure.includes(subject.ref), `the failure names the item (${failure})`);
      assert.ok(failure.includes("TASK CONTRACTS"), `the failure names the section that went missing (${failure})`);

      // the same, for the architecture assertion — a brief hollowed of BOTH forms fails.
      const withArchitecture = stories.find((fact) => fact.register != null);
      assert.ok(withArchitecture != null, "the stream has a story whose milestone records architecture");
      assert.equal(architectureIsCarried(withArchitecture.ref, withArchitecture.briefs.continue), null, "the architecture assertion holds for the compiled brief");
      const stripped = {
        ...withArchitecture.briefs.continue,
        sections: withArchitecture.briefs.continue.sections.filter((section) => section.id !== "fitness" && section.id !== "architecture"),
      };
      const archFailure = architectureIsCarried(withArchitecture.ref, stripped);
      assert.ok(archFailure != null && archFailure.includes(withArchitecture.ref), "and fails, naming the item, for the hollowed one");
      assert.ok(archFailure.includes("ARCHITECTURE SLICE") && archFailure.includes("STRUCTURAL CONSTRAINTS"), "naming the sections that went missing");

      // and a brief hollowed of EVERYTHING but the item — the F-11 shape itself — fails.
      const flat = { ...brief, sections: brief.sections.filter((section) => section.id === "item") };
      assert.ok(contractIsCarried(subject.ref, flat) != null, "the guard fails on the exact shape F-11 shipped: an item ref and a notice");
    },
  },

  // Scenario Outline: what every real item's brief must satisfy (6 rows)
  {
    name: "70/05 task02 outline what every real item's brief must satisfy (6 rows: a story with contracts at continue and at verify; a story whose milestone records architecture; a story that declares its ADRs at refine; a milestone at refine; any item at every phase)",
    run: async () => {
      const { facts, stories, milestones } = await stream();
      const failures = [];
      const counts = {};
      const count = (row) => { counts[row] = (counts[row] ?? 0) + 1; };

      for (const fact of stories) {
        const hasContracts = (fact.contracts?.length ?? 0) > 0;
        // a story with task contracts | continue | its acceptance criteria are present, condensed or whole
        if (hasContracts) {
          count("continue-criteria");
          const problem = contractIsCarried(fact.ref, fact.briefs.continue);
          if (problem != null) failures.push(problem);
        }
        // a story with task contracts | verify | what the phase checks against is carried, not a ref and a notice
        if (hasContracts) {
          count("verify-criteria");
          const problem = contractIsCarried(fact.ref, fact.briefs.verify);
          if (problem != null) failures.push(problem);
          if (fact.briefs.verify.sections.length < 2) failures.push(`${fact.ref}: its verify brief is a ref and a notice`);
        }
        // a story whose milestone records architecture | continue | it reaches the brief in some form
        if (fact.register != null || fact.declared.length > 0) {
          count("architecture");
          const problem = architectureIsCarried(fact.ref, fact.briefs.continue);
          if (problem != null) failures.push(problem);
        }
        // a story that declares its own ADRs | refine | the declared slice arrives rather than the whole register
        if (fact.declared.length > 0) {
          count("declared");
          const slice = sectionOf(fact.briefs.refine, "architecture");
          if (slice == null) failures.push(`${fact.ref}: declares ADRs but its refine brief has no ARCHITECTURE SLICE`);
          else if (!fact.declared.every((id) => slice.text.includes(id))) failures.push(`${fact.ref}: its refine slice does not name every ADR it declared`);
          if (sectionOf(fact.briefs.refine, "fitness") != null) failures.push(`${fact.ref}: received the whole register instead of the slice it declared`);
        }
      }

      // a milestone | refine | its own objective arrives, and no story's contracts are inlined
      for (const fact of milestones) {
        if (!/^##[ \t]+objective\b/im.test(fact.record ?? "")) continue;
        count("milestone-objective");
        const objective = sectionOf(fact.briefs.refine, "objective");
        if (objective == null) failures.push(`${fact.ref}: its refine brief carries no MILESTONE OBJECTIVE section`);
        if (sectionOf(fact.briefs.refine, "tasks") != null) failures.push(`${fact.ref}: a milestone brief inlined a story's contracts`);
      }

      // any item in the stream | every phase | within the ceiling, the item named, nothing dropped with budget left
      for (const fact of facts) {
        for (const phase of PHASE_BRIEF_PHASES) {
          count("every-item");
          const brief = fact.briefs[phase];
          if (brief.chars > brief.ceiling) failures.push(`${fact.ref}/${phase}: over the ceiling at ${brief.chars}`);
          if (brief.sections[0]?.id !== "item" || !brief.text.includes(fact.ref)) failures.push(`${fact.ref}/${phase}: the brief does not name the item it is for`);
          // "nothing dropped with budget left": a SACRIFICE means the compiler ran out of
          // room, so a brief that gave something up must have spent all but a tenth of its
          // budget. Stated as a proportion of the ceiling, never as a byte count.
          if (brief.sacrificed.length > 0 && brief.ceiling - brief.chars > brief.ceiling / 10) {
            failures.push(`${fact.ref}/${phase}: sacrificed ${brief.sacrificed.join(", ")} with ${brief.ceiling - brief.chars} chars of budget still unspent`);
          }
        }
      }

      for (const row of ["continue-criteria", "verify-criteria", "architecture", "declared", "milestone-objective", "every-item"]) {
        assert.ok((counts[row] ?? 0) > 0, `the ${row} row has real subjects in the stream — no row of this outline is vacuous`);
      }
      assert.deepEqual(failures, [], `every real item's brief satisfies its row (${JSON.stringify(counts)})`);
    },
  },

  // Scenario Outline: the cases fixtures were never shaped to cover (7 rows)
  {
    name: "70/05 task02 outline the cases fixtures were never shaped to cover (7 rows: contracts many times the ceiling; contracts past the ceiling even condensed; contracts absent; declared architecture absent; the register absent; a milestone's own spec many times over; every section within but the sum far past)",
    run: async () => {
      const { stories, milestones } = await stream();
      const failures = [];
      const counts = {};
      const count = (row) => { counts[row] = (counts[row] ?? 0) + 1; };

      for (const fact of stories) {
        const brief = fact.briefs.continue;
        const tasks = sectionOf(brief, "tasks");

        // task contracts many times the ceiling -> condensed to headlines and tags, carried
        if (fact.contractChars > PHASE_BRIEF_MAX_CHARS) {
          count("many-times");
          if (tasks == null) failures.push(`${fact.ref}: ${fact.contractChars}-char contracts reached the brief in no form`);
          else {
            if (!brief.condensed.includes("tasks")) failures.push(`${fact.ref}: contracts far past the ceiling were carried without being condensed`);
            if (scenarioTitles(tasks.text).length === 0) failures.push(`${fact.ref}: the condensed contract names no scenario`);
            if (/^ *(Given|When|Then|And) /m.test(tasks.text)) failures.push(`${fact.ref}: the condensed contract carries step bodies, not headlines and tags`);
            if (!/@\S/.test(tasks.text)) failures.push(`${fact.ref}: the condensed contract carries no tag lines`);
          }
        }

        // task contracts past the ceiling EVEN CONDENSED -> named unshippable, counted,
        // pointed at, and nothing below it dropped. A conditional over the whole stream: it
        // binds the day such a story exists, and says nothing false while none does.
        if (brief.unshippable.includes("tasks")) {
          count("unshippable");
          const disposition = brief.dispositions.find((entry) => entry.id === "tasks");
          if (disposition?.disposition !== "unshippable") failures.push(`${fact.ref}: an unshippable contract set is not named unshippable`);
          if (!brief.notice?.includes(BRIEF_SECTION_SOURCES.tasks)) failures.push(`${fact.ref}: an unshippable contract set is not pointed at`);
          if (brief.sacrificed.length > 0) failures.push(`${fact.ref}: an unshippable contract set cost the sections below it their place`);
        }

        // task contracts absent — the story has none yet -> no contract section, and NO
        // notice claiming one was lost.
        if (fact.contracts == null || fact.contracts.length === 0) {
          count("absent-contracts");
          if (tasks != null) failures.push(`${fact.ref}: has no contracts, yet the brief carries a TASK CONTRACTS section`);
          if (brief.dropped.includes("tasks") || brief.dispositions.some((entry) => entry.id === "tasks")) {
            failures.push(`${fact.ref}: has no contracts, yet the brief claims a contract section was lost`);
          }
        }

        // declared architecture absent — the story declares no ADRs -> the milestone's
        // register in its place, NEVER silence.
        if (fact.declared.length === 0 && fact.register != null) {
          count("no-declaration");
          const register = sectionOf(brief, "fitness");
          const named = brief.dispositions.some((entry) => entry.id === "fitness");
          if (register == null && !named) failures.push(`${fact.ref}: declares no ADRs and its milestone's register reached the brief in no form and was never named`);
        }

        // the milestone register absent — the milestone records none -> no architecture
        // section, and the rest of the brief unaffected.
        if (fact.register == null && fact.declared.length === 0) {
          count("no-register");
          if (sectionOf(brief, "fitness") != null) failures.push(`${fact.ref}: has no register, yet the brief carries one`);
          if (brief.dispositions.some((entry) => entry.id === "fitness")) failures.push(`${fact.ref}: has no register, yet the brief claims one was lost`);
          if ((fact.contracts?.length ?? 0) > 0 && sectionOf(brief, "tasks") == null) failures.push(`${fact.ref}: an absent register affected the rest of the brief`);
        }

        // every section within the ceiling, the sum far past it -> condensed first, then
        // sacrificed bottom-up until it fits.
        if (brief.sacrificed.length > 0) {
          count("condense-then-sacrifice");
          for (const section of brief.sections) {
            if (BRIEF_SECTION_CONDENSERS[section.id] != null && !brief.condensed.includes(section.id)) {
              failures.push(`${fact.ref}: sacrificed ${brief.sacrificed.join(", ")} while ${section.id} was still carried uncondensed`);
            }
          }
          // …and SACRIFICE IS BOTTOM-UP: every section given up ranks below every section
          // still carried. The line this replaces asserted `ranks.length > 0` inside a
          // branch whose own `if` had already established that — it could not fail, its
          // message claimed an ordering nothing checked, and it sits in the branch this
          // file asserts has zero witnesses, so it had never executed either.
          const lowestCarried = Math.max(...brief.sections.map((s) => BRIEF_SECTION_PRIORITY.indexOf(s.id)));
          const highestGiven = Math.min(...brief.sacrificed.map((id) => BRIEF_SECTION_PRIORITY.indexOf(id)));
          if (highestGiven < lowestCarried) {
            failures.push(`${fact.ref}: sacrificed ${brief.sacrificed.join(", ")} while carrying something of lower priority — sacrifice is bottom-up`);
          }
        }
      }

      // the objective — a milestone's own spec, many times over -> the milestone's objective
      // alone, its stories not inlined.
      for (const fact of milestones) {
        if ((fact.record?.length ?? 0) <= PHASE_BRIEF_MAX_CHARS) continue;
        count("big-spec");
        const objective = sectionOf(fact.briefs.refine, "objective");
        if (!/^##[ \t]+objective\b/im.test(fact.record)) continue;
        if (objective == null) failures.push(`${fact.ref}: a ${fact.record.length}-char spec yielded no objective section`);
        else if (objective.text.length >= fact.record.length) failures.push(`${fact.ref}: the objective section is the whole specification`);
        if (sectionOf(fact.briefs.refine, "tasks") != null) failures.push(`${fact.ref}: a milestone brief inlined its stories' contracts`);
      }

      for (const row of ["many-times", "absent-contracts", "no-declaration", "no-register", "big-spec"]) {
        assert.ok((counts[row] ?? 0) > 0, `the "${row}" row has real subjects in this stream — the shape fixtures were sized out of is present here`);
      }

      // THE TWO ROWS WITH NO WITNESS, ADMITTED EXPLICITLY RATHER THAN BY OMISSION.
      //
      // Leaving them out of the list above is exactly the failure mode FF-7009 exists to
      // stop — a case that looks covered because its code is present, while its code never
      // runs. Both are asserted at ZERO instead, with the reason, so the guard fires the day
      // a witness appears and someone has to look at the row rather than at its silence.
      // The behaviours themselves ARE covered, on constructed witnesses, in task 01's pure
      // lane (test/work/brief-carries-the-contract.test.mjs) where a witness can be built.
      //
      //   "task contracts past the ceiling even condensed" — unreachable on this stream
      //   because `tasks` is a BOUNDED condenser (ADR-010 §1): it carries as many scenarios
      //   as the room holds, so a contract set is unshippable only when it has no Gherkin
      //   structure to bound, which no real .feature lacks.
      //
      //   "condensed first, then sacrificed bottom-up" — unreachable because ADR-010 §2's
      //   share rule leaves every live section the room it needs, so across all 633 briefs
      //   (219 stories + milestones, three phases each) SACRIFICE fires zero times.
      assert.equal(
        counts.unshippable ?? 0, 0,
        "the \"past the ceiling even condensed\" row has NO witness on today's stream, and that is a consequence of tasks being a bounded condenser (ADR-010 §1) — the day a real story produces one, this row's assertions have never run and must be looked at rather than assumed",
      );
      assert.equal(
        counts["condense-then-sacrifice"] ?? 0, 0,
        "the \"condensed first, then sacrificed\" row has NO witness on today's stream, and that is a consequence of the share rule (ADR-010 §2) — the day a real brief sacrifices anything, this row's assertions have never run and must be looked at rather than assumed",
      );

      assert.deepEqual(failures, [], `every real-data shape behaves as declared (${JSON.stringify(counts)})`);
    },
  },

  // ── the CRLF defect ADR-009 §7 names, kept as a standing check ──
  //
  // 70/05's headline figure for this fix is "41 of 41, up from 10 of 41", and until now
  // NOTHING asserted it: the word "dependencies" did not occur in this file at all, and the
  // pure lane feeds a literal string straight to the compiler, bypassing the addresser
  // entirely. So both of the mutations that caused the defect survived both new suites —
  // making `addressDependencies` CRLF-blind again, and having it return null unconditionally
  // — and the fix would have regressed exactly as silently as the original broke. That is
  // the F-11 defect class inside the F-11 fix, which is why this is here and why the subject
  // list is derived from the frontmatter by this file rather than from the addresser.
  {
    name: "70/05 task02 regression every real story that declares a dependency edge receives a DEPENDENCIES section — the CRLF-blind frontmatter match ADR-009 §7 names left 31 of 41 with none, and the count of subjects is floored so the assertion cannot go vacuous",
    run: async () => {
      const { stories } = await stream();
      const declaring = stories.filter((fact) => fact.declaredDepends != null);
      // NON-VACUITY, floored well above the number a CRLF-blind reader would leave. 35
      // stories declare a non-empty edge list today (41 carry a `depends:` line; 6 of those
      // declare `[]`), and 31 of the 41 are CRLF — so a guard that iterated whatever the
      // addresser happened to find would have been green over 10 subjects, and green over
      // zero if the addresser answered null. The floor is what makes those two states red.
      assert.ok(
        declaring.length > 20,
        `the stream really does declare dependency edges (${declaring.length} stories) — a subject count at or below 20 means the frontmatter is no longer being read, not that the stream stopped declaring`,
      );
      const failures = [];
      for (const fact of declaring) {
        const brief = fact.briefs.refine;
        const section = sectionOf(brief, "dependencies");
        if (section == null) {
          failures.push(`${fact.ref}: declares \`depends: ${fact.declaredDepends}\` in its frontmatter, yet its refine brief carries no DEPENDENCIES section — dropped=${JSON.stringify(brief.dropped)}`);
          continue;
        }
        if (section.text.trim().length === 0) failures.push(`${fact.ref}: its DEPENDENCIES section is empty`);
        // …and it is THIS story's edge, in the record's own words — not a placeholder.
        if (!fact.declaredDepends.includes(section.text.trim()) && !section.text.includes(fact.declaredDepends)) {
          failures.push(`${fact.ref}: its DEPENDENCIES section says ${JSON.stringify(section.text)} where the record declares ${JSON.stringify(fact.declaredDepends)}`);
        }
      }
      assert.deepEqual(failures, [], `every real story that declares a dependency edge receives it (${declaring.length} stories checked)`);
    },
  },

  // ── THE HUSK GUARD: a section that is present is not the same as a section that arrived ──
  //
  // "211 of 211 stories carry their contracts" is a claim about a section being PRESENT. A
  // bounded condenser always carries its section's SKELETON (ADR-010 §1) — the `Feature:`
  // line, the register's frame, the ADR headings — so a section can be present, be named in
  // the brief, be counted as carried, and name NONE of the things a phase needs from it.
  // That is a husk, and until now nothing asserted against it: every existing assertion in
  // this file checks presence, and the two faults found at review were both husk-shaped.
  //
  // The count comes from the CONDENSER'S OWN STATED COUNT, never from a byte length. That
  // distinction is not pedantry: it is the exact mistake made at review, where a 556-char
  // contract index was read as "the whole 30-scenario contract" and was in fact 1 of 30.
  // A bounded condenser states how many it left out precisely so nobody has to infer it.
  {
    name: "70/05 task02 regression no brief carries a CONDENSED section that names none of its own entries — a bounded condenser always carries its skeleton, so a husk is a section that is present, counted as carried, and empty of the thing the phase needs",
    run: async () => {
      const { facts } = await stream();
      const subjects = [];
      for (const fact of facts) {
        for (const phase of PHASE_BRIEF_PHASES) {
          const brief = fact.briefs[phase];
          for (const entry of brief.dispositions) {
            // `total == null` — a condenser with nothing to count (the story block is one
            // block, not a list). `total === 0` — a register with no rows, a record with no
            // decision passages: naming zero of zero is the honest answer and not a husk.
            if (entry.disposition !== "condensed" || entry.total == null || entry.total === 0) continue;
            subjects.push({ ref: fact.ref, phase, entry, brief });
          }
        }
      }
      // NON-VACUITY, floored well below today's count (1,370) and far above anything a
      // broken addresser would leave: a guard that iterated an empty set would be green
      // over exactly the failure it exists to catch.
      assert.ok(
        subjects.length > 500,
        `the stream really does produce condensed sections with a stated count (${subjects.length}) — a subject count at or below 500 means the condensers stopped stating their counts, not that the stream stopped needing them`,
      );

      const husks = [];
      const miscounts = [];
      for (const { ref, phase, entry, brief } of subjects) {
        if (entry.kept === 0) {
          husks.push(`${ref}/${phase}: its ${entry.id.toUpperCase()} section is present but names 0 of its ${entry.total} entries — the section reached the brief and its content did not`);
        }
        // …and the stated count is CHECKED, not trusted: for the contract index the number
        // of scenario titles actually in the section must equal the number it claims to
        // have carried. Parsed with the one home parser (52/05), which is not the code
        // under test — `condenseTaskContracts`'s own arithmetic is.
        if (entry.id === "tasks") {
          const named = scenarioTitles(sectionOf(brief, "tasks")?.text ?? "").length;
          if (named !== entry.kept) miscounts.push(`${ref}/${phase}: the contract index says it carried ${entry.kept} scenarios and names ${named}`);
        }
      }
      assert.deepEqual(miscounts, [], `every condensed contract index names exactly as many scenarios as it says it does (${subjects.length} condensed sections checked)`);
      assert.deepEqual(husks, [], `no condensed section is a husk (${subjects.length} condensed sections checked across ${facts.length} items x ${PHASE_BRIEF_PHASES.length} phases)`);
    },
  },

  // ── the measurement F-11 was found by, kept as a standing check ──
  {
    name: "70/05 task02 regression the stream's briefs SPEND their budget — the measured cause of F-11 was a policy that could not spend it, so the average real brief must use most of the ceiling and no real brief may be an item ref and a notice",
    run: async () => {
      const { stories } = await stream();
      const subjects = stories.filter((fact) => (fact.contracts?.length ?? 0) > 0);
      const chars = subjects.map((fact) => fact.briefs.continue.chars);
      const average = chars.reduce((a, b) => a + b, 0) / chars.length;
      // F-11's measurement: briefs landed at 3,122–4,047 against 8,000 while the contract
      // was dropped — "less than half the budget spent". The invariant is the negation of
      // that finding, stated as a proportion of the ceiling rather than as a byte count.
      assert.ok(average > PHASE_BRIEF_MAX_CHARS / 2, `the average real build brief spends more than half its budget (${Math.round(average)} of ${PHASE_BRIEF_MAX_CHARS})`);
      for (const fact of subjects) {
        const brief = fact.briefs.continue;
        assert.ok(brief.sections.length >= 2, `${fact.ref}: its build brief is more than the item's ref`);
        assert.ok(brief.chars <= brief.ceiling, `${fact.ref}: within the ceiling`);
      }
    },
  },
];
