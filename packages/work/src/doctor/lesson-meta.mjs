import path from "node:path";
import { isLiveStreamRow } from "../discovery.mjs";
import { lessonMetaProblems } from "../memory-vocabulary.mjs";

// work:doctor — milestone 148 / story 04 (ADR-007 §3): THE ARCHIVED LESSON-META LANE, one pure
// `(snapshot, ctx) => Finding[]` group appended to the engine's registry in the shape the
// rubric, loop-record and depends lanes each used before it.
//
// A live item's lesson is held by validate, as an error. An ARCHIVED item's retrospective is never
// back-filled (148/SPEC; origin §7), so an error on one would be a red no legal act can clear. This
// lane makes that case visible instead: ONE `lesson-meta-archived` warning per archived
// retrospective holding a non-conforming lesson, naming how many lessons and which ids. A live row
// is never read here — validate owns it, and a second report of one fact is noise.
//
// THE LANE READS NO DISK and writes none. The retrospective text arrives as snapshot data
// (`docTexts["RETROSPECTIVE.md"]`, a convention doc the engine already reads for every item), and
// the rule is the vocabulary module's, so validate and this lane cannot disagree about a lesson.

// THE FROZEN CODES OF THIS LANE — a DIFFERENT array from `CONTROL_FINDING_CODES`, which is what
// makes them structurally unable to reach the doctor gate or the loop's `DOCTOR_GATE_CODES`
// (124/FF-12402 holds it of every lane that exports such an array).
export const LESSON_META_FINDING_CODES = Object.freeze(["lesson-meta-archived"]);

// Every finding is a warning: the acceptance horizon is not consulted, because an archived item is
// `done` and a horizon-aware severity is exactly the permanent red this lane exists to avoid.
const ADVISORY_SEVERITY = "warn";

const RETROSPECTIVE = "RETROSPECTIVE.md";

export function lessonMetaLane(snapshot) {
  const findings = [];
  for (const item of snapshot?.items ?? []) {
    // An archived row is a NUMBERED row the live predicate refuses — read that way round, as
    // `listStream` reads it, so the archive flag keeps its one reader (127/FF-12706).
    if (item.number == null || isLiveStreamRow(item) || item.dir == null) continue;
    const text = item.docTexts?.[RETROSPECTIVE];
    if (typeof text !== "string") continue;
    const ids = [...new Set(lessonMetaProblems(text).map((problem) => problem.id))];
    if (ids.length === 0) continue;
    findings.push({
      code: LESSON_META_FINDING_CODES[0],
      severity: ADVISORY_SEVERITY,
      path: path.join(item.dir, RETROSPECTIVE),
      message: `${ids.length} lesson(s) carry a meta line outside the vocabulary: ${ids.join(", ")} — archived, so advisory and never back-filled`,
    });
  }
  return findings;
}
