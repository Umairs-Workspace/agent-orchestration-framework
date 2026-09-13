// test/support/phase-brief-view.mjs — READING A COMPILED BRIEF, in one home (milestone 70 /
// story 05).
//
// Two suites assert against `compilePhaseBrief`'s output — the pure lane
// (brief-carries-the-contract) and the real-stream lane (brief-pinned-to-the-stream) — and
// both need the same two lookups: "which section is this" and "what disposition was
// recorded for it". They were written twice, identically, which is how the divergence
// F-52-05-D documents begins.
//
// NOT folded into test/support/feature-parse.mjs, deliberately: that module's subject is
// PARSING A `.feature` FILE, and its header is a record of what a second parser of that one
// grammar cost. A compiled brief is a different artefact with a different shape; filing
// these there would put two concepts in one home to avoid adding a file, which is the
// mirror image of the mistake. The `.feature` parse these suites need IS imported from
// there.

/** The retained section with this id, or null — the brief carries each id at most once. */
export function sectionOf(context, id) {
  return context.sections.find((section) => section.id === id) ?? null;
}

/** The disposition recorded for this id, or null when the section was neither reduced nor lost. */
export function dispositionOf(context, id) {
  return context.dispositions.find((entry) => entry.id === id) ?? null;
}
