import path from "node:path";
import { retrospectiveLessons, RETROSPECTIVE_FILE } from "../memory-accounting.mjs";

// work:doctor — milestone 153 / story 03 (ADR-003): THE MEMORY-EFFECTIVENESS LANE, one pure
// `(snapshot, ctx) => Finding[]` group appended to the engine's registry in the shape the lesson-meta,
// loop-record and depends lanes each used before it.
//
// Two advisory facts about lessons, both read from the retrospectives the snapshot already holds:
//   - RECURRENCE — a distinct new lesson names an earlier one in `Recurs`. Reported at the PREDECESSOR's
//     retrospective (the lesson that repeated), once per pair; a promotion does not suppress it, and
//     nothing is ever written to the retrospective.
//   - AGE — a lesson with no recorded promotion (a missing legacy field, or an explicit `none`) that has
//     seen at least `threshold` later ACCEPTED top-level milestones. The operator chose 5 (153/03 Q1).
//
// AGE IS COUNTED FROM ACCEPTANCE FACTS, never from numeric ref gaps, wall-clock days or story
// completions. The boundary is the lesson's owner's acceptance — the parent milestone's for a nested
// story, the item's own otherwise — and a milestone counts only when it is distinct, top-level, `done`
// and accepted STRICTLY after that boundary (an equal instant establishes no order). A lesson whose
// owner is `done` with no readable acceptance instant has UNKNOWN age and gets its own finding rather
// than an invented one; a lesson of an owner not yet accepted has not started aging and is quiet.
//
// Acceptance cannot be gated here: every finding is `warn`, the codes are a DIFFERENT frozen array from
// `CONTROL_FINDING_CODES`, and the engine's scope filter reports by path AFTER the lane has computed over
// the whole snapshot — so a scoped run never forgets the milestones accepted outside its scope.

export const MEMORY_EFFECTIVENESS_FINDING_CODES = Object.freeze([
  "memory-lesson-recurs",
  "memory-lesson-unpromoted-aged",
  "memory-lesson-age-unknown",
]);
const [RECURS_CODE, AGED_CODE, UNKNOWN_CODE] = MEMORY_EFFECTIVENESS_FINDING_CODES;

export const DEFAULT_UNPROMOTED_AGE_THRESHOLD = 5;
const ADVISORY_SEVERITY = "warn";

// `work.doctor.memory.unpromotedAfterMilestones`, a positive integer, else the default. Read where the
// context is built so the lane stays a function of its arguments.
export function unpromotedThresholdFromConfig(config) {
  const parsed = Number(config?.work?.doctor?.memory?.unpromotedAfterMilestones);
  return Number.isInteger(parsed) && parsed > 0 ? { threshold: parsed, source: "configured" } : { threshold: DEFAULT_UNPROMOTED_AGE_THRESHOLD, source: "default" };
}

function statusOf(item) {
  return item?.meta?.status ?? item?.status ?? null;
}

// The acceptance instant of a `done` item, or null when it is not done or states none readable.
function acceptedAt(item) {
  if (statusOf(item) !== "done") return null;
  const parsed = Date.parse(String(item?.meta?.updated ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

const isTopLevelMilestone = (item) => item?.type === "milestone" && item.parent == null && item.number != null;

export function lessonAgeContext(snapshot) {
  const items = (snapshot?.items ?? []).filter((item) => item?.number != null && item.dir != null);
  const byRef = new Map();
  for (const item of items) if (!byRef.has(item.ref)) byRef.set(item.ref, item);

  // Distinct accepted top-level milestones, by ref: an archived row and a live row for one ref are one.
  const accepted = new Map();
  for (const item of items) {
    if (!isTopLevelMilestone(item)) continue;
    const instant = acceptedAt(item);
    if (instant != null && !accepted.has(item.ref)) accepted.set(item.ref, instant);
  }
  const instants = [...accepted.values()];

  return {
    items,
    byRef,
    // `{ known, owner, boundary, age }` — age is null while the boundary is unknown.
    ageOf(item) {
      const owner = item.parent != null ? byRef.get(item.parent) ?? null : item;
      const boundary = owner == null ? null : acceptedAt(owner);
      const open = owner == null || statusOf(owner) !== "done";
      if (boundary == null) return { known: false, open, owner, boundary: null, age: null };
      return { known: true, open: false, owner, boundary, age: instants.filter((instant) => instant > boundary).length };
    },
  };
}

export function memoryEffectivenessLane(snapshot, ctx = {}) {
  const findings = [];
  const { threshold, source } = ctx.memoryThreshold ?? unpromotedThresholdFromConfig(ctx.config);
  const thresholdLabel = source === "default" ? `default threshold ${threshold}` : `threshold ${threshold}`;
  const age = lessonAgeContext(snapshot);
  const seenRecurrences = new Set();

  for (const item of age.items) {
    const text = item.docTexts?.[RETROSPECTIVE_FILE];
    if (typeof text !== "string") continue;
    const retrospective = path.join(item.dir, RETROSPECTIVE_FILE);
    const lessons = retrospectiveLessons(item.ref, text);

    for (const lesson of lessons) {
      if (lesson.recurs != null && lesson.recurs !== lesson.identity) {
        const pair = `${lesson.recurs}\0${lesson.identity}`;
        if (!seenRecurrences.has(pair)) {
          seenRecurrences.add(pair);
          const predecessor = age.byRef.get(lesson.recurs.slice(0, lesson.recurs.lastIndexOf("/")));
          const predecessorText = predecessor?.docTexts?.[RETROSPECTIVE_FILE];
          findings.push({
            code: RECURS_CODE,
            severity: ADVISORY_SEVERITY,
            path: typeof predecessorText === "string" ? path.join(predecessor.dir, RETROSPECTIVE_FILE) : retrospective,
            message: `lesson ${lesson.recurs} recurred: ${lesson.identity} names it in Recurs — advisory, the retrospectives are never edited`,
          });
        }
      }

      const promoted = lesson.promotion.state === "recorded" && lesson.promotion.valid;
      if (promoted) continue;
      const promotion = lesson.promotion.state === "missing" ? "missing legacy Promoted to field" : lesson.promotion.state === "none" ? "explicit none" : "invalid Promoted to value";
      const { known, open, age: later } = age.ageOf(item);
      if (!known) {
        // A lesson of an item not yet accepted has not begun to age; an accepted one with no readable
        // acceptance instant is unknown, and says so.
        if (!open) {
          findings.push({
            code: UNKNOWN_CODE,
            severity: ADVISORY_SEVERITY,
            path: retrospective,
            message: `lesson ${lesson.identity} is unpromoted (${promotion}) with unknown age — no acceptance evidence for its item, so no aged-unpromoted warning is issued`,
          });
        }
        continue;
      }
      if (later >= threshold) {
        findings.push({
          code: AGED_CODE,
          severity: ADVISORY_SEVERITY,
          path: retrospective,
          message: `lesson ${lesson.identity} is unpromoted (${promotion}) at age ${later} accepted milestones, ${thresholdLabel}`,
        });
      }
    }
  }
  return findings;
}
