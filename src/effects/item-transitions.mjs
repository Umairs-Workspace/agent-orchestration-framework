// src/effects/item-transitions.mjs — the RECORD-DOC FRONTMATTER store's transition
// seam: an item's lifecycle status is written HERE and `item-status.changed` is raised
// HERE, so no caller can move an item through its lifecycle without the consequence.
//
// WHY THIS IS A SEPARATE SEAM FROM doc-transitions.mjs. That one owns the record doc's
// BODY (the STATE.md feedback bullet), and a fitness function draws a hard line through
// it: acd-board-write-isolation asserts doc-transitions.mjs writes no SPEC/STORY/SESSION
// and carries no literal status value, because the board face may append feedback and may
// NEVER write status. That line is worth keeping, so the frontmatter store gets its own
// door rather than blunting the guard on the body's.
//
// The FACT is not reimplemented here: work.mjs is the item-frontmatter authority (the
// lifecycle table and the one surgical status write live there, guarded by
// ITEM_STATUS_EDGES). This seam adds exactly what a seam adds — the event, and the
// cascade nobody may forget: the workspace projection the board/fleet read, and the
// Notion status sync for a workspace configured for it.
//
// File-store discipline is run-transitions.mjs's: write-then-append, with the d5
// reconciler scan closing the window between them.
import { setItemStatus } from "../work.mjs";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral, reachableLoci } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";

// transitionItemStatus(item, edge, opts) — move an item to `toStatus` and raise
// `item-status.changed`.
//
//   item — { ref, dir, type } (resolveItemExact's shape)
//   edge — { toStatus, expectFrom, now } (setItemStatus's own contract; its coded
//          refusals — invalid-status / status-edge-not-applicable — propagate
//          untouched, and NOTHING is appended: facts precede announcements)
//   opts — { workspace, publisherOptions, journalOptions, drain = true }
//
// Returns { record, eventId, effects } where `record` is { ref, status, from } — the
// caller keeps its own result shape and threads the publish reactor's warning back with
// threadPropagationWarnings.
export async function transitionItemStatus(item, { toStatus, expectFrom = null, now } = {}, opts = {}) {
  const { workspace = null, publisherOptions = null, journalOptions = {}, drain = true } = opts;

  // (1) The FACT — work.mjs's lifecycle-guarded write. A refusal here means no event.
  const record = await setItemStatus(item, toStatus, { expectFrom, now });

  // (2) The EVENT — past tense, carrying its own evidence (the from-state included, so a
  // reactor never has to re-read a doc that has already moved on).
  const payload = {
    ref: record.ref,
    status: record.status,
    from: record.from,
    itemDir: item.dir,
    itemType: item.type ?? null,
    workspaceRoot: workspace?.projectRoot ?? null,
  };
  const name = "item-status.changed";
  const reactorCtx = {
    ...(publisherOptions ? { publisherOptions } : {}),
    ...(workspace ? { workspace } : {}),
  };
  const reactors = await applicableReactors(name, payload, reactorCtx);
  const loci = reachableLoci(workspace);

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    // The ledger's own health never gates the cascade (the d2 rule).
    reportDegrade("effects-journal-open", error);
  }

  if (!journal) {
    const effects = drain ? await runEffectsEphemeral(name, payload, { reactors, loci, ctx: reactorCtx }) : [];
    return { record, eventId: null, effects };
  }

  try {
    const { eventId } = appendEvent(journal, { name, payload, source: "item-transition", now }, reactors);
    const effects = drain ? await drainEffects({ journal, eventId, loci, now, ctx: reactorCtx }) : [];
    return { record, eventId, effects };
  } finally {
    journal.close();
  }
}
