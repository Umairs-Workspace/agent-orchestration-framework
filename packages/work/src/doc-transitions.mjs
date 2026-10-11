import path from "node:path";
import { readFile, writeFile, appendFile } from "node:fs/promises";
import { appendRawFeedback, appendRecallObservation } from "./feedback-records.mjs";
export const FEEDBACK_HEADING = "## Feedback (for retro)";

// Domain transitions receive the configured effect runtime from core. Construction performs no I/O.
export function createDocumentTransitions({ applicableReactors, openEffectsJournal, appendEvent, drainEffects, runEffectsEphemeral, reportDegrade }) {
// src/effects/doc-transitions.mjs — the RECORD-DOC store's transition seam (m42
// wave (d) leg d4, port 1). The third seam, beside run-transitions.mjs (the run
// store) and assignment-transitions.mjs (the assignment store): a mutation of an
// item's own markdown in the checkout writes its fact HERE and raises its event
// HERE, so no caller can reach the write without the consequence.
//
// WHY THE WRITER MOVED. `appendFeedbackBullet` lived in commands/feedback.mjs,
// and so did the decision to publish the workspace snapshot afterwards — a
// `withGlobalWorkPropagation` import the next writer of a record doc would have
// had to remember. That is the wave-(d) disease at the cascade layer, so the
// write and its event now live in one place and the ledger owns the rest. The
// write-isolation guarantee is UNCHANGED and has only moved with the code
// (acd-board-write-isolation follows it here): exactly one fs-writing helper,
// targeting STATE.md, under the verbatim heading, disturbing no prior content.
//
// File-store discipline is run-transitions.mjs's: write-then-append, with the d5
// reconciler scan closing the window between them.

// The verbatim feedback heading — must match templates/uat/STATE.md and
// src/bundle/commands/feedback.md byte-for-byte (ADR-003 / 02_add-feedback.feature).

// transitionFeedbackAppended(item, edge, opts) — append immutable raw feedback,
// project one attributed bullet to STATE.md, and raise `feedback.recorded`.
//
//   item — { ref, dir, type } (resolveItemExact's shape)
//   edge — { bullet, raw, now }
//   opts — { workspace, publisherOptions, journalOptions, drain = true }
//
// Returns { bullet, eventId, effects } — the caller keeps its own result shape
// and threads the publish reactor's warning back with
// threadPropagationWarnings.
async function transitionFeedbackAppended(item, { bullet, raw, now } = {}, opts = {}) {
  // (1) The FACT — raw evidence first, then the record-doc projection. A throw
  // before both writes complete means no event.
  // The immutable evidence is appended first. STATE.md remains its human-readable
  // projection; a later classification references the raw id and never edits this line.
  await appendRawFeedback(item, raw);
  const statePath = path.join(item.dir, "STATE.md");
  await appendFeedbackBullet(statePath, bullet);

  // (2) The EVENT — past tense, carrying its own evidence.
  const { eventId, effects } = await raiseFeedbackRecorded(item, {
    doc: "STATE.md",
    bullet,
    rawId: raw.id,
  }, now, opts);
  return { bullet, eventId, effects };
}

// transitionRecallRecorded(item, edge, opts) — append one completed decision recall to the
// ledger and raise `feedback.recorded` so the item publishes through the existing cascade
// (153/ADR-001). Unlike raw feedback it projects NO STATE bullet — a recall is evidence of a
// decision, not a note — and its payload names `recallId` where a raw capture names `rawId`.
//
//   edge — { recall, now }  (recall: the observation; its `at` is the caller's retained instant)
//
// An identical replay is a no-op: the row is already there, so no second event is raised and
// the caller is told it was a replay. A conflicting replay throws before anything is written.
async function transitionRecallRecorded(item, { recall, now } = {}, opts = {}) {
  const { record, replayed } = await appendRecallObservation(item, recall);
  if (replayed) return { record, replayed: true, eventId: null, effects: [] };
  const raised = await raiseFeedbackRecorded(item, {
    doc: "FEEDBACK.ndjson",
    bullet: null,
    rawId: null,
    recallId: record.id,
  }, now, opts);
  return { record, replayed: false, eventId: raised.eventId, effects: raised.effects };
}

// The event half both transitions share: build the payload, ask what applies, journal and drain.
// Returns { eventId, effects }.
async function raiseFeedbackRecorded(item, evidence, now, opts) {
  const { workspace = null, publisherOptions = null, journalOptions = {}, drain = true } = opts;
  const payload = {
    ref: item.ref,
    itemDir: item.dir,
    itemType: item.type ?? null,
    ...evidence,
    workspaceRoot: workspace?.projectRoot ?? null,
  };
  const name = "feedback.recorded";
  // Append-time applicability (m42 wave (d) leg d4, port 4): the seam owes only
  // what can ever apply to this workspace — the uniform rule for every seam,
  // even while this event's reactors declare no predicate.
  const reactorCtx = publisherOptions ? { publisherOptions } : {};
  const reactors = await applicableReactors(name, payload, reactorCtx);

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    // The ledger's own health never gates the cascade (the d2 rule).
    reportDegrade("effects-journal-open", error);
  }

  if (!journal) {
    const effects = drain ? await runEffectsEphemeral(name, payload, { reactors, ctx: reactorCtx }) : [];
    return { eventId: null, effects };
  }

  try {
    const { eventId } = appendEvent(journal, { name, payload, source: "doc-transition", now }, reactors);
    const effects = drain ? await drainEffects({ journal, eventId, now, ctx: reactorCtx }) : [];
    return { eventId, effects };
  } finally {
    journal.close();
  }
}

// The seam's ONLY filesystem write (moved verbatim from commands/feedback.mjs):
// ensure the verbatim heading exists (creating it if absent), then append exactly
// one bullet beneath the existing entries — never disturbing prior content
// (ADR-003).
async function appendFeedbackBullet(statePath, bullet) {
  let original;
  try {
    original = await readFile(statePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    original = null;
  }

  if (original === null) {
    // No STATE.md at all: create it with the heading and the one bullet.
    await writeFile(statePath, `${FEEDBACK_HEADING}\n\n${bullet}\n`, "utf8");
    return;
  }

  if (!original.includes(FEEDBACK_HEADING)) {
    // Heading absent: append it verbatim, then the bullet, beneath existing body.
    const prefix = original.length === 0 || original.endsWith("\n") ? "" : "\n";
    const gap = original.length === 0 ? "" : "\n";
    await appendFile(statePath, `${prefix}${gap}${FEEDBACK_HEADING}\n\n${bullet}\n`, "utf8");
    return;
  }

  // Heading present: insert the bullet at the end of the heading's section,
  // beneath any existing bullets, without rewriting them.
  const lines = original.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === FEEDBACK_HEADING);
  // Find where this section ends (the next heading, or end of file).
  let sectionEnd = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    if (/^#{1,6}\s/.test(lines[i])) {
      sectionEnd = i;
      break;
    }
  }
  // Walk back over trailing blank lines so the new bullet sits with the others.
  let insertAt = sectionEnd;
  while (insertAt > headingIndex + 1 && lines[insertAt - 1].trim() === "") {
    insertAt -= 1;
  }
  // If the section has no bullet yet, leave a blank line after the heading.
  if (insertAt === headingIndex + 1) {
    lines.splice(insertAt, 0, "", bullet);
  } else {
    lines.splice(insertAt, 0, bullet);
  }
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  await writeFile(statePath, lines.join(newline), "utf8");
}

return { FEEDBACK_HEADING, transitionFeedbackAppended, transitionRecallRecorded };
}
