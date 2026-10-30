import { readFile } from "node:fs/promises";
import { readRefHistory, remapHistoricalRef } from './ref-history.mjs';
import path from "node:path";
import { listItems } from "./discovery.mjs";
import { FEEDBACK_RECORD_FILE, FEEDBACK_RECORD_KINDS, RECALL_VERDICTS, compileRecallObservation } from "./feedback-records.mjs";
import { canonicalRecurrence, lessonSections, readLessonMeta, readPromotion } from "./memory-vocabulary.mjs";

// THE MEMORY ACCOUNTING READ MODEL — milestone 153 / story 03 / ADR-003.
//
// One work-owned reader answers "how often was each lesson surfaced, honoured, departed from,
// found irrelevant, and repeated". Memory `status` composes it into `effectiveness`; doctor's
// memory lane reads the SAME lesson facts (`retrospectiveLessons`) from its snapshot, so the two
// can never disagree about what a lesson says.
//
// Two separate evidences, never merged:
//   - OBSERVATION — a completed `recall` row on an item's FEEDBACK ledger: one `surfaced` per
//     returned identity, and one verdict counter. This is what an agent decided, not proof the
//     lesson prevented anything.
//   - RECURRENCE — a DISTINCT new lesson whose `Recurs` names an earlier one. Counted once per
//     canonical new-lesson identity, never transitively, and never from recall.
//
// A lesson is identified by its COMPOSITE `<item>/R<n>`; a bare `R13` joins nothing. The index only
// decides provenance (`indexed` or `unresolved`) and supplies the zero-count rows — a target that
// has left the index keeps its history. Corrupt evidence is DIAGNOSED, never read as a zero.
//
// The pure half (`buildAccounting`, `retrospectiveLessons`) touches no disk; `readAccountingSources`
// is the one edge, and it writes nothing.

// The counters: one per recall verdict (named from the ledger's own vocabulary, never respelled here), plus the
// two this reader adds — how often a lesson was returned, and how often a distinct new lesson repeated it.
export const ACCOUNTING_COUNTERS = Object.freeze(["surfaced", ...RECALL_VERDICTS, "recurred"]);
export const ACCOUNTING_BASIS = "observed decisions and repeats; a verdict is not proof that a lesson prevented a mistake";
export const RETROSPECTIVE_FILE = "RETROSPECTIVE.md";

const LEDGER_KINDS = new Set(FEEDBACK_RECORD_KINDS);

export function lessonIdentity(item, id) {
  return `${item}/${id}`;
}

function emptyCounts() {
  return Object.fromEntries(ACCOUNTING_COUNTERS.map((counter) => [counter, 0]));
}

// ------------------------------------------------------------- retrospectives ----

// A retrospective's lessons as the facts both consumers read: `{ identity, id, line, recurs,
// promotion }`. `recurs` is the canonical `<item>/R<n>` or null; `promotion.state` is `missing`
// (no field — a legacy lesson, never back-filled), `none` (an explicit answer of nothing yet) or
// `recorded` (a valid control/rule/prompt), with `valid` false for a value outside the forms.
export function retrospectiveLessons(ownerRef, text) {
  return lessonSections(text).map((section) => {
    const meta = readLessonMeta(section.body);
    const promotion = readPromotion(meta["promoted to"]);
    const state = promotion.value === "" ? "missing" : /^none$/i.test(promotion.value) ? "none" : "recorded";
    return {
      identity: lessonIdentity(ownerRef, section.id),
      id: section.id,
      line: section.line,
      recurs: canonicalRecurrence(meta.recurs),
      promotion: { state, value: promotion.value, valid: state === "missing" ? false : promotion.conforms },
    };
  });
}

// ------------------------------------------------------------------- ledgers ----

// One ledger's text → its recall observations and the defects found while reading it. A blank line
// is skipped; a line that is not JSON, names a kind the ledger does not know, or is not a valid
// recall is a defect and contributes nothing. An empty `records` array is a valid observation.
export function readLedgerText(text) {
  const observations = [];
  const lines = []; // the 1-based ledger line each observation came from, parallel to `observations`
  const defects = [];
  String(text ?? "").split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === "") return;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      defects.push({ defect: "malformed ledger JSON", line: index + 1 });
      return;
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed) || !LEDGER_KINDS.has(parsed.kind)) {
      defects.push({ defect: "unknown ledger kind", line: index + 1 });
      return;
    }
    if (parsed.kind !== "recall") return;
    try {
      observations.push(compileRecallObservation(parsed));
      lines.push(index + 1);
    } catch (error) {
      defects.push({ defect: `invalid recall observation: ${error.message}`, line: index + 1 });
    }
  });
  return { observations, defects, lines };
}

// ---------------------------------------------------------------- the model ----

// buildAccounting — sources in, effectiveness out.
//   ledgers          [{ owner, source, text?, error? }]   one per item ledger that exists
//   retrospectives   [{ owner, source, text?, error? }]   one per item retrospective that exists
//   indexed          [{ item, id, title? }] | null        the current index's lessons, when known
//   lessons          boolean                              also return the per-lesson table
//   evidence         boolean                              with `lessons`, each lesson also names the ledger rows
//                                                         and the distinct new lessons its counts came from
// An `error` is an unreadable file: it is a diagnostic, and the report is then `complete: false`.
export function buildAccounting({ refHistory = [], ledgers = [], retrospectives = [], indexed = null, lessons = false, evidence = false } = {}) {
  const diagnostics = [];
  const diagnose = (source, defect, line = null) => diagnostics.push(line == null ? { source, defect } : { source, defect, line });

  const seenObservations = new Map();
  const types = {};
  const byLesson = new Map();
  const cited = new Map(); // identity → { observations: [{source, line}], recurrences: [{source, line, identity}] }
  const citedFor = (identity) => {
    if (!cited.has(identity)) cited.set(identity, { observations: [], recurrences: [] });
    return cited.get(identity);
  };
  const countsFor = (map, key) => {
    if (!map.has(key)) map.set(key, emptyCounts());
    return map.get(key);
  };

  for (const ledger of ledgers) {
    if (ledger.error != null) {
      diagnose(ledger.source, "unreadable ledger file");
      continue;
    }
    const { observations, defects, lines } = readLedgerText(ledger.text);
    for (const { defect, line } of defects) diagnose(ledger.source, defect, line);
    for (const [at, observation] of observations.entries()) {
      const key = `${ledger.owner}\0${observation.id}`;
      const payload = JSON.stringify(observation);
      if (seenObservations.has(key)) {
        // Identical replay is a no-op; a changed payload under one id has no honest count.
        if (seenObservations.get(key) !== payload) diagnose(ledger.source, "conflicting payloads for one recall id");
        continue;
      }
      seenObservations.set(key, payload);
      for (const record of observation.records) {
        const counter = record.verdict;
        const apply = (counts) => {
          counts.surfaced += 1;
          counts[counter] += 1;
        };
        apply(types[record.recordType] ??= emptyCounts());
        if (record.recordType === "lesson") {
          const identity = lessonIdentity(remapHistoricalRef(record.item, observation.at, refHistory), record.id);
          apply(countsFor(byLesson, identity));
          const rows = citedFor(identity).observations;
          if (!rows.some((row) => row.source === ledger.source && row.line === lines[at])) rows.push({ source: ledger.source, line: lines[at] });
        }
      }
    }
  }

  // Recurrence: one count per DISTINCT new lesson naming the target, never transitive.
  const seenNewLessons = new Set();
  for (const retrospective of retrospectives) {
    if (retrospective.error != null) {
      diagnose(retrospective.source, "unreadable retrospective file");
      continue;
    }
    for (const lesson of retrospectiveLessons(retrospective.owner, retrospective.text)) {
      if (lesson.recurs == null || lesson.recurs === lesson.identity || seenNewLessons.has(lesson.identity)) continue;
      seenNewLessons.add(lesson.identity);
      countsFor(byLesson, lesson.recurs).recurred += 1;
      citedFor(lesson.recurs).recurrences.push({ source: retrospective.source, line: lesson.line, identity: lesson.identity });
    }
  }

  // The lesson type's recurred total is the sum of its targets' recurrences.
  types.lesson ??= emptyCounts();
  types.lesson.recurred = [...byLesson.values()].reduce((sum, counts) => sum + counts.recurred, 0);

  const indexedById = new Map((indexed ?? []).map((record) => [lessonIdentity(record.item, record.id), record]));
  const effectiveness = {
    basis: ACCOUNTING_BASIS,
    complete: diagnostics.length === 0,
    diagnostics,
    types: Object.fromEntries(Object.keys(types).sort().map((type) => [type, types[type]])),
  };

  if (lessons) {
    const identities = [...new Set([...indexedById.keys(), ...byLesson.keys()])].sort();
    effectiveness.lessons = Object.fromEntries(identities.map((identity) => {
      const record = indexedById.get(identity);
      return [identity, {
        ...(byLesson.get(identity) ?? emptyCounts()),
        provenance: record == null ? "unresolved" : "indexed",
        ...(record?.title ? { title: record.title } : {}),
        ...(evidence ? { evidence: cited.get(identity) ?? { observations: [], recurrences: [] } } : {}),
      }];
    }));
  }
  return effectiveness;
}

// -------------------------------------------------------------------- the edge ----

async function readSource(file, owner, workDir) {
  const source = path.relative(workDir, file).split(path.sep).join("/");
  try {
    return { owner, source, text: await readFile(file, "utf8") };
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    return { owner, source, error };
  }
}

// Every item the stream enumerates — live, story and archived — with its ledger and retrospective
// when it has them. A missing file is no evidence, not a defect. `items` narrows the read to the
// ones a caller already selected (tune's scope): an unselected item's files are never opened.
export async function readAccountingSources(workDir, { items = null } = {}) {
  const ledgers = [];
  const retrospectives = [];
  const seen = new Set();
  for (const item of items ?? await listItems(workDir)) {
    if (item.number == null || item.dir == null || seen.has(item.dir)) continue;
    seen.add(item.dir);
    const ledger = await readSource(path.join(item.dir, FEEDBACK_RECORD_FILE), item.ref, workDir);
    if (ledger != null) ledgers.push(ledger);
    const retrospective = await readSource(path.join(item.dir, RETROSPECTIVE_FILE), item.ref, workDir);
    if (retrospective != null) retrospectives.push(retrospective);
  }
  return { ledgers, retrospectives, refHistory: await readRefHistory(workDir) };
}

// accountMemory — read the stream and build the report. `indexed` is the current index's records
// (lesson rows are picked from them); `null` when the backend has none to offer.
export async function accountMemory(workDir, { indexed = null, lessons = false, items = null } = {}) {
  const sources = await readAccountingSources(workDir, { items });
  const lessonRecords = Array.isArray(indexed) ? indexed.filter((record) => record?.recordType === "lesson") : null;
  return buildAccounting({ ...sources, indexed: lessonRecords, lessons });
}
