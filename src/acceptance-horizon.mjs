// THE ACCEPTANCE HORIZON (milestone 66 / ADR-002, ADR-009/F) — one predicate, one
// home, imported by every check that may gate on a record document.
//
// ACD holds a delivered record IMMUTABLE: an accepted `.feature` gets no edit, no
// annotation, no `@superseded` tag. A gate that fires on one is a permanent red no
// legal act can clear — and a gate nobody can clear is a gate that gets silenced. So
// a check may produce a GATING finding only while the item that OWNS the record is
// still open.
//
// ZERO IMPORTS, DELIBERATELY (66/ARCHITECTURE ROUND 3/3). `src/work.mjs` imports
// `node:path`/`node:os`/`node:fs/promises`/`node:fs`, and story 66/02's FF-6605
// forbids the controls lane reaching any of those — so homing the predicate in the
// god node would fail 66/02 on arrival. Keeping this a leaf makes ADR-002 §5's
// "exactly one implementation" a fact of the module graph rather than of discipline.
// Nothing here reads the filesystem, spawns, or reads a clock.

// The frozen lifecycle vocabulary — five values, moved here from `src/work.mjs`
// (was a private const at `:49`) so the five words have ONE home rather than a copy
// beside the predicate that closes on one of them (ADR-009/F).
export const VALID_STATUS = new Set(["not-started", "in-progress", "blocked", "in-review", "done"]);

// THE ITEM LIFECYCLE — which moves between those five words are legal (2026-08-16).
//
// It is HOMED HERE, beside the vocabulary, for the reason this leaf exists: the table's
// keys ARE the frozen five, so declaring it anywhere else would be a second copy of the
// vocabulary (exactly what ADR-009/F closed when `src/import/recovery.mjs` spelled the five
// words as literals). The WRITER stays in `src/work.mjs` — the item-frontmatter authority —
// which imports this and can therefore never permit a move the table does not declare.
//
// WHY IT EXISTS. Until it did, the stream had a write-BACK on failure
// (work.mjs:rollbackItemStatus) and no write-FORWARD at all: nothing in the codebase could
// set `in-progress`, so every forward move was prose in the command bundles ("set `status`:
// in-progress when build starts") that an agent reconciled on the way out, or forgot. Two
// measured consequences: an item was `not-started` for the whole time it was being built —
// a lie the board, the fleet and `aof work next` all consumed — and the failure rollback was
// a permanent no-op, because it refuses any from-state that is not `in-progress` and nothing
// ever put an item there.
//
// The edges are the ACD phases:
//   not-started → in-progress   work started (a run minted, a lane cut, a local act)
//   in-progress → in-review     built and under review (aof:continue's Review gate)
//   in-review   → done          accepted after review (a story's path)
//   in-progress → done          accepted without a review phase — the path a MILESTONE,
//                               `uat` session, `spike` and `chore` actually take: a milestone
//                               is accepted when all its stories are, a spike on its recorded
//                               finding, a chore on its ticked checklist, and none of them is
//                               ever authored `in-review`. Requiring that hop would have
//                               refused acceptance for every driver type except a story — a
//                               lifecycle that describes one type is one that gets worked
//                               around.
//   * → blocked                 a genuine blocker, from either working state
//   blocked/in-review → in-progress   unblocked, or review sent it back to the bench
//   in-progress → not-started   the transient reclaim (work.mjs's ROLLBACK_TARGETS)
//
// What it REFUSES is the whole guard, so it is worth naming: `done` is unreachable from
// `not-started` and from `blocked` — an item nobody ever started cannot be accepted, and a
// blocked one must be unblocked first. Whether a STORY should additionally have passed its
// Review gate is a per-type policy, enforced where the type is known (aof:verify's gates,
// doctor's coherence checks), not by narrowing this table until three of the four driver
// types cannot be accepted at all.
//
// `done` is TERMINAL: re-opening an accepted item is a deliberate hand edit, never a
// lifecycle move a command makes on its own — the same reading of `done` as the horizon
// below. There is no self-edge, either: a repeat delivery of an at-least-once effect asks for
// one and is refused, which is how idempotence is expressed at the writer.
export const ITEM_STATUS_EDGES = Object.freeze({
  "not-started": Object.freeze(["in-progress", "blocked"]),
  "in-progress": Object.freeze(["in-review", "done", "blocked", "not-started"]),
  blocked: Object.freeze(["in-progress", "not-started"]),
  "in-review": Object.freeze(["done", "in-progress", "blocked"]),
  done: Object.freeze([]),
});

// itemStatusEdges(from) — the legal next moves from a status, so a face can report what an
// item may do without re-deriving the lifecycle. An unknown or missing status (a record doc
// carrying no `status:` line) has NO legal move, which is what makes the writer refuse it
// rather than rewrite a line that isn't there.
export function itemStatusEdges(from) {
  return ITEM_STATUS_EDGES[from] ?? [];
}

// The one status that closes the horizon. `done` means delivered, immutable and
// therefore un-actionable.
const CLOSED_STATUS = "done";

// isOpen(status) — is the item that owns this record still EDITABLE?
//
// The horizon closes on the word itself and on nothing else:
//   • `not-started` / `in-progress` / `blocked` / `in-review` → OPEN
//   • `done`                                                  → CLOSED
//   • absent (null/undefined/"")                              → OPEN — a missing status never grandfathers
//   • `Done`                                                  → OPEN — the match is CASE-SENSITIVE, so one
//                                                               capital letter can never silence a live record
//   • anything outside the frozen five (`complete`, …)        → OPEN — validate reports the invalid value
//                                                               separately, as it does today
//
// The horizon follows the OWNING item's own status (ADR-009/F): a task feature's is
// its STORY, a milestone record document's is the milestone.
export function isOpen(status) {
  return status !== CLOSED_STATUS;
}

// severityFor(status) — the horizon's RENDERING, in the one vocabulary a doctor
// finding has (ADR-002 §2/§3): inside the horizon a violation is an `error` and
// gates; outside it the same fact is reported at `warn` — advisory by default,
// visible under `--strict`, never gating on a record nobody may edit.
//
// HOMED HERE BY 66/02 (finding F-09, raised at 66/00's accept). Until the doctor
// rendering landed, this mapping existed ONLY in two test copies
// (`test/grade/acceptance-horizon.test.mjs`, `test/arch/grade/acd-acceptance-horizon-single-predicate.test.mjs`)
// because 66/00 shipped no code that emitted a severity — so three rows of
// `01_the-acceptance-horizon.feature` were asserted over a fabricated finding. Both
// copies now import this. Two copies of a decision is how `ITEM_RE` came to exist in
// four places, and one of those copies being in a TEST does not make it less of a copy.
//
// THE FACE STILL OWNS THE EXIT CODE (ADR-009/G). This decides the severity and
// nothing else: a `warn` under `--strict` exits non-zero, which is doctor's policy.
export function severityFor(status) {
  return isOpen(status) ? "error" : "warn";
}

// closesEpoch(status) — THE EPOCH BOUNDARY (milestone 61 / ADR-004 §1, §2).
//
// An acceptor epoch is one milestone, and its boundary is any transition whose
// DESTINATION is the closed status. The whole of the decision is that word, and the
// reason it is homed here is the reason `isOpen` is: this leaf already owns what the
// closed status MEANS, so the acceptor spells no lifecycle literal of its own and no
// second copy of the vocabulary appears beside a second predicate over it.
//
// THE ARGUMENT IS THE PAYLOAD'S OWN FIELD NAME. `item-status.changed` spells the
// destination `status` and the origin `from` (`src/effects/item-transitions.mjs:46-52`),
// so the parameter is `status` — not `to`, which is the name the LIFECYCLE TABLE uses and
// which no payload carries. A predicate written against `to` reads a field that is always
// `undefined` on the record it is handed, and therefore never closes an epoch at all.
//
// AND IT KEYS ON WHERE THE ITEM LANDS, NEVER ON WHERE IT CAME FROM. SPIKE §8 corrects its
// own first pass here, and the correction is load-bearing: all 11 milestones that have
// reached the closed status took `in-progress` → closed, so a predicate keyed on `from`
// happens to work on every case in the tree today — and would silently never close an
// epoch for a milestone parked in review before acceptance, which `ITEM_STATUS_EDGES`
// admits and which 3 of 4 spikes have already done. `from` is recorded on the ruling for
// provenance and is never consulted here; this function takes no second argument, so
// consulting it is not a thing a caller can make it do.
export function closesEpoch(status) {
  return status === CLOSED_STATUS;
}
