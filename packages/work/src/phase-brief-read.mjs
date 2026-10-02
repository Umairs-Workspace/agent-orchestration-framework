// src/phase-brief-read.mjs — the CALLER-SIDE reader for the phase brief (milestone 70 /
// story 00, widened by story 05 / ADR-009 §4). The pure compiler in `./phase-brief.mjs`
// performs NO filesystem read and NO wall-clock read (ADR-002) — it is handed text. THIS
// module is where the reading happens: the two callers (the local drive command and the
// mesh worker execution handler) both import `compileBriefForItem`, which reads the item's
// already-authored documents and hands their text to the shared pure compiler. One reader,
// one compiler — never two implementations of the same bound (ADR-003's failure mode).
//
// THE COMPILER IS HANDED EXTRACTS, NEVER DOCUMENTS (ADR-009 §4, FF-7010). This module
// performs I/O and nothing else. Every section value at the `compilePhaseBrief` call site
// is bound to a named `const …Section = <addressing helper>(…)`, and every one of those
// helpers is imported from `./phase-brief.mjs`, where addressing lives because it is pure.
// Before 70/05 this module passed `objective: spec` — the entire SPEC.md, 9,514 chars — and
// `story`, the entire STORY.md including its frontmatter and scaffold comments; a
// 9,514-char section at priority three could never fit, and under the old prefix cut it
// took `tasks`, `fitness` and `dependencies` down with it. That is why every refine brief
// in this stream retained `[item, story]` and nothing else.
//
// All reads are BEST-EFFORT: an absent document contributes no section (the compiler omits
// it, exactly as if absent, and raises no notice — §4's ABSENT case) and never throws a
// spawn. The compiler's ceiling governs the result.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  addressArchitecture,
  addressDependencies,
  addressFitnessRegister,
  addressItemRef,
  addressObjective,
  addressStory,
  addressTaskContracts,
  compilePhaseBrief,
  declaredAdrsInStory,
} from "./phase-brief.mjs";

async function readOptional(filePath) {
  try {
    // LINE ENDINGS ARE NORMALISED AT THE READ, because the ceiling counts CHARACTERS and a CRLF
    // checkout would otherwise pay one budget byte per line for nothing — measured at aof:verify 127:
    // the same tree packed a story's architecture slice past every declared id on an LF checkout and
    // short of one on a CRLF checkout (127/VERIFICATION F-22). The brief is typed into a session;
    // the CR is noise there, exactly as 70/ADR-009 §7 read it out of the frontmatter parse.
    return (await readFile(filePath, "utf8")).replace(/\r\n/gu, "\n");
  } catch {
    // best-effort — a read fault of ANY kind is an absent section, never a failed spawn.
    // Both arms of the old `ENOENT`/`ENOTDIR` test returned null, so the test decided
    // nothing while reading as though a permission error were handled differently.
    return null;
  }
}

async function readTaskContracts(itemDir) {
  const dir = path.join(itemDir, "tasks");
  let names = [];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith(".feature")).sort();
  } catch {
    // No tasks/ directory at all — ABSENT, not "supplied but empty". null is what makes
    // the compiler omit the section rather than declare an empty contract set (§4).
    return null;
  }
  const bodies = [];
  for (const name of names) {
    const body = await readOptional(path.join(dir, name));
    if (body != null) bodies.push(body);
  }
  return bodies;
}

// compileBriefForItem({ itemRef, phase, itemType, itemDir, milestoneDir }) -> brief.context — reads
// the item's STORY.md + task contracts, and the milestone's SPEC.md + ARCHITECTURE.md
// (the fitness register), plus the item's dependency edges, and compiles ONE brief through
// the shared pure compiler. `itemDir` is where the item's own docs live; `milestoneDir` is
// where the milestone's SPEC/ARCHITECTURE live (for a story that is the parent directory;
// for a milestone item, the item's own directory).
export async function compileBriefForItem({ itemRef, phase, itemType, itemDir, milestoneDir }) {
  // ── I/O: every identifier below this line and above the addressing block is a DOCUMENT,
  //    and no document reaches the compiler (FF-7010).
  // The four reads are INDEPENDENT — different files, no ordering between them — so they
  // are issued together rather than one after another (measured ~2.3 ms of the 5.6 ms a
  // `compileBriefForItem` costs). Determinism is unaffected: the compiler is pure over the
  // texts, and which order they arrived in is not one of its inputs.
  const [storyDoc, contractDocs, specDoc, architectureDoc] = await Promise.all([
    readOptional(path.join(itemDir, "STORY.md")),
    readTaskContracts(itemDir),
    readOptional(path.join(milestoneDir, "SPEC.md")),
    readOptional(path.join(milestoneDir, "ARCHITECTURE.md")),
  ]);
  const isStory = itemType === "story" || (itemType == null && storyDoc != null);
  const declared = isStory ? declaredAdrsInStory(storyDoc).ids : [];

  // ── ADDRESSING: unconditional, never announced, and every helper pure and imported.
  const itemSection = addressItemRef(itemRef);
  const storySection = addressStory(storyDoc);
  const objectiveSection = addressObjective(specDoc);
  const tasksSection = addressTaskContracts(contractDocs);
  const architectureSection = addressArchitecture(architectureDoc, { declared, full: !isStory });
  const fitnessSection = addressFitnessRegister(architectureDoc, { declared, full: !isStory });
  const dependenciesSection = addressDependencies(storyDoc) ?? addressDependencies(specDoc);

  return compilePhaseBrief({
    itemRef: itemSection,
    phase,
    story: storySection,
    objective: objectiveSection,
    tasks: tasksSection,
    architecture: architectureSection,
    fitness: fitnessSection,
    dependencies: dependenciesSection,
  });
}
