// src/effects/harness-transitions.mjs — THE HARNESS STORE'S TRANSITION SEAM (milestone 61
// / ADR-007 §3), the sixth seam, alongside the five that own the run, the assignment, the
// record doc's body, the record doc's frontmatter and the work stream.
//
// What it owns is one fact: THE ACCEPTOR RENDERED A RULING. Not "the harness changed" — a
// committing ruling is the subset where anything moved, and under report-only-permanent
// that subset is nearly empty. The fact worth recording is the ruling, whichever way it
// went, and the record's own `verdict` says which.
//
// ── FACTS PRECEDE ANNOUNCEMENTS, AS EVERYWHERE IN THIS FAMILY ─────────────────────────
//
// A committing ruling writes the harness value FIRST, then raises the event, then drains.
// A write that is refused announces nothing: the refusal propagates untouched, no event is
// appended, and no consequence is left owed to anybody. That ordering is not a style — an
// event announcing a change that did not happen is a lie the ledger would then carry as
// evidence, and this ledger is the evidence the acceptor weighs.
//
// ── WHAT THIS SEAM MAY NOT DO ────────────────────────────────────────────────────────
//
// Return success with a harness value written and no ledger line. The drain is NOT
// optional on this path (ADR-007 §3): the line is the reactor's step, so a window opens
// between the fact and the record, and closing it is what this machinery is for. If the
// drain does not discharge the record, the seam REFUSES rather than reporting success —
// and the journaled step survives that refusal, so the next drain, in this process or
// another, completes it to a byte-identical line. Exactly once, because the append is
// idempotent by the ruling's identity.
//
// THAT SENTENCE WAS PROSE, AND THREE ROUTES WALKED THROUGH IT. All three are closed below
// by the same three moves, because the class is one class: a DECLINE was indistinguishable
// from a DISCHARGE, and a tree nobody named silently became a relative path.
//
//   (a) THE TREE IS REFUSED AT THE DOOR. `projectDir` has no default worth having:
//       coerced to `""` it made the knob write land in `process.cwd()`'s configuration,
//       while the payload's null root made the reactor decline — and the seam returned
//       success. It is now a coded refusal (`project-dir-unset`) before anything happens.
//   (b) THE LINE IS THE AUTHORITY, NOT THE STEP'S STATUS. A reactor that RETURNS is marked
//       `done` by the dispatcher whatever it returned, so `{ skipped: true }` read exactly
//       like a discharge — and worse than an unpaid step, because a settled step is never
//       drained again. The guard now asks the LEDGER whether this ruling's line is there.
//       The reactor has also lost its ability to decline; both, deliberately, because one
//       makes the hole unreachable and the other makes it detectable however it is reached.
//   (c) `drain: false` MAY NOT STRAND A RULING. A committing ruling refuses it outright:
//       the window between the value moving and the record landing is the whole subject,
//       and a caller may not ask for it to be left open. A report-only ruling may still
//       defer — it wrote nothing, and its step is durable — but not when the journal could
//       not be opened, because then the deferral is owed to nobody at all.
//
// ── THE RULING'S IDENTITY IS MINTED HERE ─────────────────────────────────────────────
//
// It is the event's id AND it rides the payload, which are the same string on purpose. On
// the payload it survives the journal-less fallback (where a reactor sees `eventId: null`)
// and every redelivery shape, so "the same ruling delivered twice leaves one record" holds
// on every path rather than only the durable one.
import { randomBytes } from "node:crypto";
import { applicableReactors } from "./table.mjs";
import { openEffectsJournal, appendEvent, readEventSteps } from "./journal.mjs";
import { drainEffects, runEffectsEphemeral, reachableLoci } from "./dispatch.mjs";
import { reportDegrade } from "../degrade.mjs";
// The RECORD's shape and its completeness rule have one home (ADR-006 §3) — imported, not
// restated, so a record refused at construction is refused by the same rule that refuses
// it at the ledger.
import { VERDICTS, makeRuling } from "../work-acceptor/ledger.mjs";
// The acceptor's one I/O home (ADR-007 §2a). The seam reaches the KNOB write; the reactor
// reaches the ledger append. Both live behind that module, which is what makes the change
// and its record one working-tree change rather than two writers' good intentions.
// `readLedger` and `LEDGER_LINE_KEY` are here for the guard at the end: the seam confirms
// its own consequence by reading the evidence, never by trusting a step's status.
import { LEDGER_LINE_KEY, readLedger, requireProjectDir, writeKnobValue } from "../work-acceptor/store.mjs";

export const HARNESS_RULED = "harness.ruled";
export const STAMP_EVIDENCE = "stamp-evidence";

// A CONSTRUCTION refusal (thrown), disjoint from the ruling refusals that reach a
// `refusals` array: it means the ruling was rendered and its record did not land, which is
// not a ground a ruling could ever report about itself.
export const HARNESS_RECORD_NOT_STAMPED = "harness-record-not-stamped";

// The second construction refusal, and the same family: the caller asked for the record to
// be paid by a later drain, on a path where "later" is not guaranteed to arrive. Its
// `reason` says which — a ruling that MOVES a value (the window may not be left open by
// request) or a journal that would not open (nothing durable to owe the record to).
export const HARNESS_DRAIN_NOT_OPTIONAL = "harness-drain-not-optional";

// The reporting face must read the ruling history without learning the store module.
// Keep that access behind the same seam that already verifies landed records, preserving
// ADR-007's rule that no command or face reaches the store directly.
export async function readHarnessRulings(projectDir) {
  return readLedger(projectDir);
}

export class HarnessTransitionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HarnessTransitionError";
    this.code = code;
    this.status = 500;
    Object.assign(this, details);
  }
}

// The journal's own id shape, so a ruling's identity reads the same as every other event's
// in the store they share.
function mintRulingId(nowIso) {
  return `${nowIso.replace(/[-:.]/gu, "")}-${randomBytes(4).toString("hex")}`;
}

// Is THIS ruling's line in the ledger? The seam's own consequence, confirmed against the
// file it was supposed to land in rather than against a report about it. A ledger that
// cannot be read is not a ledger the line is in — it is refused with the reason attached,
// because "I could not check" and "it is there" are not the same answer.
async function recordLanded(projectDir, rulingId) {
  try {
    const ledger = await readLedger(projectDir);
    if (ledger.records.some((record) => record?.[LEDGER_LINE_KEY] === rulingId)) return { ok: true };
    return { ok: false, reason: ledger.exists ? "no line for this ruling in the ledger" : "no ledger was written" };
  } catch (error) {
    return { ok: false, reason: `the ledger could not be read (${error?.code ?? error?.message ?? "unknown"})` };
  }
}

// transitionHarnessRuled(ruling, opts) — render the ruling into the world.
//
//   ruling — the ADR-006 §3 record, complete. Refused at construction here and AGAIN at
//            the ledger, because a record complete when it was rendered can still lose a
//            field on the way in, and a blank in this record is read six months later as a
//            measurement rather than as an absence.
//   opts   — { workspace, projectDir, rulingId, journalOptions, drain = true, now }
//            `projectDir` is the tracked tree BOTH writes land in — the configuration and
//            the record beside it — and it is REQUIRED. It falls back to the workspace's
//            root; an ABSENT one is refused, never resolved against the cwd.
//
// Returns { record, rulingId, eventId, effects, write } where `write` is the knob write's
// own result (its `from` is what a revert restores) or null for a ruling that moved
// nothing.
export async function transitionHarnessRuled(ruling, opts = {}) {
  const {
    workspace = null,
    projectDir = workspace?.projectRoot ?? null,
    rulingId: suppliedId = null,
    journalOptions = {},
    drain = true,
    now,
  } = opts;

  // (0) THE RECORD, refused at construction. Nothing has happened yet, so an incomplete
  // ruling costs nothing to refuse and would cost a permanent blank to accept.
  const record = makeRuling(ruling);

  // (0a) AND THE TREE BOTH WRITES LAND IN, refused the same way and for a sharper reason.
  // The knob write and the record are ONE working-tree change (ADR-006 §2) — they are the
  // same tree by construction or they are not that change at all — so a seam that cannot
  // say which tree it means has nothing coherent to do. The refusal is the store's own
  // (`project-dir-unset`), raised here so it lands BEFORE the write rather than after it.
  requireProjectDir(projectDir);

  // (0b) A COMMITTING RULING MAY NOT DEFER ITS RECORD. `drain: false` is a legitimate shape
  // — a caller that will drain elsewhere, and the way a process stopping between recording
  // and acting is reproduced — but not over a value that is about to move. Refused before
  // the write, so a caller who asks for the impossible gets a tree that never changed
  // rather than a change whose justification was left owed.
  if (!drain && record.verdict === VERDICTS.COMMIT) {
    throw new HarnessTransitionError(
      HARNESS_DRAIN_NOT_OPTIONAL,
      "Refusing the ruling: it commits a change to a harness value, and its record may not be deferred. "
      + "The window between the value moving and the reason for it landing is what this seam exists to close, so the drain is not optional here (ADR-007 §3).",
      { reason: "verdict-commits", key: record.key, verdict: record.verdict },
    );
  }

  const at = now ?? new Date().toISOString();
  const rulingId = typeof suppliedId === "string" && suppliedId.length > 0 ? suppliedId : mintRulingId(at);

  // (1) THE FACT — and only a COMMITTING ruling has one. Report-only is the permanent
  // steady state, so the overwhelmingly common path writes no harness value at all and the
  // appended record is the only change to the tree. A refusal here means no event.
  const write = record.verdict === VERDICTS.COMMIT
    ? await writeKnobValue(projectDir, record.key, record.to)
    : null;

  // (2) THE EVENT — past tense, carrying its own evidence: the WHOLE ruling, so the
  // reactor never re-derives a verdict and a drain on another process reproduces the
  // identical line.
  const payload = {
    workspaceRoot: projectDir,
    rulingId,
    ruling: record,
    key: record.key,
    verdict: record.verdict,
    epochId: record.epochId,
    ...(write ? { configPath: write.path, from: write.from } : {}),
  };
  const reactorCtx = { ...(workspace ? { workspace } : {}) };
  const reactors = await applicableReactors(HARNESS_RULED, payload, reactorCtx);
  const loci = reachableLoci(workspace);

  let journal = null;
  try {
    journal = await openEffectsJournal(journalOptions);
  } catch (error) {
    // The ledger's own health never gates the cascade (the d2 rule) — the consequence
    // still runs, it is just not durable, and it says so loudly rather than silently.
    reportDegrade("effects-journal-open", error);
  }

  // (2a) A DEFERRAL NEEDS SOMEWHERE TO BE OWED. With no journal there is no step, so
  // `drain: false` here would drop the ruling entirely — no record, no row, nothing any
  // later drain could find. A committing ruling never reaches this (refused at 0b, so
  // nothing has been written); a report-only one is refused now, before its event is
  // announced, which is why the refusal sits above the append rather than after it.
  if (!drain && !journal) {
    throw new HarnessTransitionError(
      HARNESS_DRAIN_NOT_OPTIONAL,
      `Refusing the ruling ${rulingId}: its record was to be paid by a later drain, and the journal that would owe it could not be opened. `
      + "A consequence owed to nobody is not a deferral, it is a loss, so nothing is announced.",
      { reason: "no-durable-journal", rulingId },
    );
  }

  let eventId = null;
  let effects = [];
  // The step's own status, kept for the DIAGNOSTIC below and for nothing else. It is not
  // the authority and must never be again: `markStep` writes `done` for any reactor that
  // RETURNS, so a reactor which declined its work read exactly like one that did it. The
  // outcome list is no better on its own — a REDELIVERY of a ruling already discharged
  // legitimately runs nothing, so an empty list means "already paid" as often as "not
  // paid". Neither answers the question the caller actually has, which is whether the line
  // is in the ledger; (3) asks the ledger.
  let discharged = null;
  if (!journal) {
    effects = drain ? await runEffectsEphemeral(HARNESS_RULED, payload, { reactors, loci, ctx: reactorCtx }) : [];
    discharged = effects.find((outcome) => outcome.key === STAMP_EVIDENCE)?.status ?? null;
  } else {
    try {
      ({ eventId } = appendEvent(journal, { eventId: rulingId, name: HARNESS_RULED, payload, source: "harness-transition", now: at }, reactors));
      effects = drain ? await drainEffects({ journal, eventId, loci, now: at, ctx: reactorCtx }) : [];
      if (drain) {
        discharged = readEventSteps(journal, eventId).find((step) => step.key === STAMP_EVIDENCE)?.status
          ?? effects.find((outcome) => outcome.key === STAMP_EVIDENCE)?.status
          ?? null;
      }
    } finally {
      journal.close();
    }
  }

  // (3) THE RECORD IS NOT OPTIONAL, AND THE LEDGER IS ASKED — NOT THE STEP. A caller that
  // asked for a ruling and got back success is entitled to read that ruling in the ledger;
  // anything else hands back a harness the operator cannot account for. So the evidence
  // itself answers: the line under THIS ruling's identity is there, or it is not. That is
  // the one reading a decline, the dispatcher's bookkeeping and a redelivery cannot spoof
  // between them. The journaled step survives this throw, so the next drain pays it —
  // once, because the append is idempotent by that same identity.
  if (drain) {
    const landed = await recordLanded(projectDir, rulingId);
    if (!landed.ok) {
      const stamped = effects.find((outcome) => outcome.key === STAMP_EVIDENCE);
      throw new HarnessTransitionError(
        HARNESS_RECORD_NOT_STAMPED,
        `The ruling ${rulingId} was raised and its record did not land (${landed.reason}; step: ${discharged ?? "none ran"}${stamped?.error ? `: ${stamped.error}` : ""}). `
        + "The record is what makes the harness accountable, so this is reported rather than swallowed; the consequence stays owed and the next drain completes it.",
        { rulingId, eventId, effects, write, step: stamped ?? null, reason: landed.reason },
      );
    }
  }

  return { record, rulingId, eventId, effects, write };
}
