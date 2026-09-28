// THE READ RECORD — ONE SHAPE ACROSS EVERY LANE THE AUDIT ASSEMBLES.
// Milestone 59 / story 04. ADR-004 §1 and §1a.
//
// ── WHY THIS FILE EXISTS, MEASURED ───────────────────────────────────────────────────────
//
// ADR-004 §1 says EVERY audit lane returns the size of the population it read together with a
// floor, and that a lane below its floor emits `audit-ran-on-nothing`. At the head of 59/03 that
// rule had THREE spellings and the third did not obey it:
//
//   · the census (`census.mjs`)          `{sweep, root, what, basis, count, floor}` — emits
//   · the checks leaf (`work-loops-checks.mjs`)  the same six keys, hand-restated — emits
//   · the evidence lane (`evidence.mjs`) `{id, what, floor, basis, root, count}`, keyed `id`,
//                                        and NO floor comparison at all — emitted nothing
//
// The divergence was not cosmetic, because the three looked substitutable and two were not.
// Measured 2026-08-30: the census's own `readFinding()`, handed the evidence lane's read record,
// rendered `the "undefined" sweep read 0 of a required 1 while walking /r`. A report that names
// its own sweep `undefined` is §1 failing while wearing the clothes of compliance.
//
// So the definition lives HERE, once, and both `src/work-audit/` lanes import it. The checks leaf
// keeps its own hand-restated copy — not as an exception to the rule but as the only form the rule
// can take there, because 52/ADR-007 (FF-5907) forbids that module from importing anything at all.
// Its parity is ASSERTED byte-identical by FF-5908 rather than derived, which is 58/FF-5807's move.
//
// ── WHY A FLOOR IS REQUIRED AND NEVER DEFAULTED ──────────────────────────────────────────
//
// A lane that found nothing and a lane that LOOKED AT NOTHING are indistinguishable in a finding
// list, and the second is the failure this milestone exists to catch — it has already happened
// here, where a renamed fixture root turned a probe into a comparison of nothing with nothing and
// it passed. A DEFAULT floor would make that indistinguishable everywhere at once, so a sweep
// declaring none is refused rather than defaulted.

// The three bases a sweep may claim, and the vocabulary is shared rather than private: a lane over
// a parsed registry makes a DISK-level claim, a lane over a runner's source text a TEXT-level one
// (which must state its own limit), and a lane over an answer obtained by running something a
// RUNTIME one. One vocabulary is what lets ONE validator decide whether any lane is declared.
export const SWEEP_BASES = Object.freeze(["disk", "text", "runtime"]);

// PURE. The problems with a sweep registry — one per sweep that fails to declare what it reads.
// Driven over EVERY lane the audit assembles (the census's `CENSUS_SWEEPS`, the evidence lane's
// `EVIDENCE_SWEEP`, the checks leaf's `AUDIT_LANES`), so "declared" has one definition and not
// three. A sweep whose root is supplied per call passes a placeholder here and is checked against
// its real root on the read record itself.
export function sweepDeclarationProblems(sweeps) {
  const problems = [];
  if (!Array.isArray(sweeps) || sweeps.length === 0) {
    return ["the census registers no sweeps at all — a census with no sweeps reports clean over nothing"];
  }
  for (const sweep of sweeps) {
    const id = sweep?.id ?? "<unnamed>";
    if (typeof sweep?.id !== "string" || sweep.id.length === 0) problems.push("a registered sweep declares no id, so a finding could not name it");
    if (typeof sweep?.root !== "string" || sweep.root.length === 0) problems.push(`sweep ${id} declares no root, so a finding could not say what it walked`);
    if (typeof sweep?.floor !== "number" || !Number.isFinite(sweep.floor) || sweep.floor <= 0) {
      problems.push(`sweep ${id} declares no floor — a sweep without a floor cannot tell "found nothing" from "looked at nothing", and a default floor would make that indistinguishable everywhere at once (ADR-004 §1)`);
    }
    if (typeof sweep?.what !== "string" || sweep.what.length === 0) problems.push(`sweep ${id} declares no description of its population`);
    if (!SWEEP_BASES.includes(sweep?.basis)) {
      problems.push(`sweep ${id} declares no basis (one of ${SWEEP_BASES.join(", ")}) — a sweep that does not say whether it read DISK, TEXT or a RUNTIME answer cannot state the limit of its own claim, and a text-level sweep that states no limit reports clean in exactly the case where it is blind`);
    }
  }
  return problems;
}

// THE REFUSAL IS NOT HERE, DELIBERATELY. `assertSweepsDeclared` lives in `./census.mjs`, where it
// can default to that lane's own registry; a second same-named export here — uncalled, with a
// different signature and a message naming the census while sitting in the lane-neutral module —
// is the very duplication this file was created to remove. Raised at 59/04's review: the commit
// that closed the three-spelling divergence re-created a two-validator state one indirection along.
// Every lane reaches the ONE rule through `sweepDeclarationProblems` above.

// A read record. Complete by construction — there is no partial form and no default count, so a
// clean result cannot be expressed without saying how much was read.
//
// `root` defaults to the sweep's own declared root and is supplied explicitly by a lane that walks
// whichever registry it is HANDED rather than a fixed directory (the evidence lane's register set,
// the checks leaf's model source). The key is `sweep` in every lane — that single letter of
// agreement is what ADR-004 §1a exists to buy.
export function readRecord(sweep, count, root = sweep?.root) {
  return Object.freeze({ sweep: sweep.id, root, what: sweep.what, basis: sweep.basis, count, floor: sweep.floor });
}

// ── THE LIMIT RECORD — THE SAME RULE, ONE FIELD OVER ─────────────────────────────────────
//
// Milestone 59 / D-59-3, found at `aof:verify 59` on the shipped command rather than on a fixture.
//
// A lane's LIMIT is the sentence that says what this run could NOT see. 59/01's review promoted it
// from "quoted into findings" to "declared on every result", on the reasoning that a limit quoted
// only into findings says nothing in exactly the case a reader most needs it — a CLEAN lane.
//
// It then diverged exactly as the read record had, and for the same reason: two lanes wrote it and
// neither wrote the other's. `sweepLimits()` emitted `{sweep, basis, claim, limit, authority}` and
// the evidence lane `{question, answeredBy, consequence}`; the face read the second shape, so a
// bare `aof work audit` printed, twice:
//
//   limit (instrument-census): undefined — undefined
//
// The information was in `--json` the whole time, which is what makes this the read record's own
// lesson rather than a rendering nit: no lane's record may be SUBSTITUTABLE-LOOKING AND
// UNSUBSTITUTABLE. A shape a renderer must ask "which lane wrote this?" about is two shapes.
//
// So the limit is declared here, once, complete by construction, and validated the moment it is
// built — a limit that cannot be rendered is refused at its construction site rather than rendered
// blank at the face, because a blank rendering is an audit silencing its own statement of its blind
// spot, which is the exact failure this milestone was commissioned to end.
export const LIMIT_KEYS = Object.freeze(["sweep", "basis", "question", "answeredBy", "consequence", "authority"]);

// PURE. The problems with a set of limits — one per limit that cannot be rendered. `question` and
// `consequence` are the two the face reads and are therefore REQUIRED; the other four qualify a
// limit and are explicitly nullable, but never ABSENT, so there is no partial form to tell from a
// complete one.
export function limitDeclarationProblems(limits) {
  if (!Array.isArray(limits)) return ["the limits are not a list — a lane that states none returns an empty one, never nothing"];
  const problems = [];
  for (const limit of limits) {
    const named = typeof limit?.question === "string" && limit.question.length > 0 ? `"${limit.question}"` : "<unnamed>";
    const keys = limit == null || typeof limit !== "object" ? [] : Object.keys(limit).filter((key) => key !== "lane");
    const missing = LIMIT_KEYS.filter((key) => !keys.includes(key));
    if (missing.length > 0) {
      problems.push(`limit ${named} is missing ${missing.map((key) => `\`${key}\``).join(", ")} — the face renders \`question\` and \`consequence\`, and a limit that omits one renders as an absent value instead of saying what the run could not see (D-59-3)`);
      continue;
    }
    const extra = keys.filter((key) => !LIMIT_KEYS.includes(key));
    if (extra.length > 0) problems.push(`limit ${named} carries ${extra.map((key) => `\`${key}\``).join(", ")}, which no face renders — a second vocabulary is how the first one stopped being read`);
    for (const key of ["question", "consequence"]) {
      if (typeof limit[key] !== "string" || limit[key].length === 0) problems.push(`limit ${named} declares no ${key}`);
    }
    for (const key of ["sweep", "basis", "answeredBy", "authority"]) {
      if (limit[key] !== null && (typeof limit[key] !== "string" || limit[key].length === 0)) {
        problems.push(`limit ${named}'s \`${key}\` is neither a non-empty string nor an explicit null`);
      }
    }
    if (limit.basis !== null && !SWEEP_BASES.includes(limit.basis)) {
      problems.push(`limit ${named} claims basis "${String(limit.basis)}", which is not one of ${SWEEP_BASES.join(", ")}`);
    }
  }
  return problems;
}

// A limit record. Complete by construction and refused at construction — the four qualifiers
// default to an explicit null rather than being omitted, so every limit that exists is renderable.
export function limitRecord({ sweep = null, basis = null, question, answeredBy = null, consequence, authority = null }) {
  const record = Object.freeze({ sweep, basis, question, answeredBy, consequence, authority });
  const problems = limitDeclarationProblems([record]);
  if (problems.length > 0) throw new TypeError(`work-audit: an unrenderable limit was constructed: ${problems.join("; ")}`);
  return record;
}

// PURE. `audit-ran-on-nothing` when a read falls below its floor, naming the sweep, the root it
// walked, the count it got and the floor it missed. Below-floor is deliberately not the same as
// zero: a population that shrank by 90% is the same failure a step earlier, and 56 measured
// exactly that shape when a renamed fixture root left a probe comparing nothing with nothing.
export function readFinding(read) {
  if (read.count >= read.floor) return null;
  return Object.freeze({
    code: "audit-ran-on-nothing",
    severity: "error",
    path: read.root,
    message: `the "${read.sweep}" sweep read ${read.count} of a required ${read.floor} while walking ${read.root} — it ran on nothing, or on so little that a clean result would mean nothing. ${read.what}`,
  });
}
