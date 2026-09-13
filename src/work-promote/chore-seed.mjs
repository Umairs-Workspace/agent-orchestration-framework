// The chore CONTENT seed — milestone 71 / story 01, ADR-004.
//
// The one home for the two promotion-specific facts the generic scaffold cannot know: the
// `## Definition of Done` a promotion seeds from its own close criterion, and the `## Notes`
// back-reference that says where the scheduled work came from. Extracted VERBATIM from
// `promote-gap-to-chore.mjs` (milestone 39 / story 03), which now reaches it by import.
//
// Pure over text: no filesystem, no workspace, no command context. Both faces hand it a rendered
// `CHORE.md` and the facts to write into it, and neither carries a copy — FF-7104 is the control
// that keeps it that way.
//
// THE FAMILY IS A LEAF (ADR-009). `src/work-promote/` imports nothing from `../commands/`, exactly
// as `src/work-tune/`, `src/work-audit/` and `src/work-acceptor/` do not.

const DOD_HEADING_RE = /^##\s+Definition of Done\s*$/;
const NOTES_HEADING_RE = /^##\s+Notes\s*$/;

// The line every promoted chore's DoD carries beside its own close criterion: the promotion is not
// finished until the stream it was appended to is still well-formed.
export const NO_REGRESSION_ITEM = "`aof work validate` is green (no regression)";

// Locate a `## <heading>` section's line range: `[headingIdx+1, end)` is the section BODY, `end` the
// index of the next heading (or EOF). A LOCAL copy of insert-shared.mjs's own idiom — deliberately
// not imported, so this module never reaches into that file's Tier-2 checklist internals.
function findSection(lines, headingRe) {
  const headingIdx = lines.findIndex((line) => headingRe.test(line.trim()));
  if (headingIdx === -1) return null;
  let end = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i += 1) {
    if (/^#{1,6}\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return { headingIdx, end };
}

// Seed a freshly-scaffolded chore with its close criterion and its provenance.
//
//   `definitionOfDone` — the checklist ITEMS (text, never `- [ ]` prefixes). Each is written
//     UNTICKED: a promoted chore is born `not-started` and is closed later by `aof:verify`, never
//     hand-ticked at creation. The template's own placeholder checklist is replaced, not appended to.
//   `backReference`   — the `## Notes` bullet lines naming where this work came from.
//
// Returns the seeded text; the caller writes it.
export function seedChoreContent(text, { definitionOfDone = [], backReference = [] } = {}) {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  let lines = text.split(/\r?\n/);

  const items = definitionOfDone.filter((item) => typeof item === "string" && item.trim() !== "");
  const dod = findSection(lines, DOD_HEADING_RE);
  if (dod && items.length > 0) {
    const before = lines.slice(0, dod.headingIdx + 1);
    const after = lines.slice(dod.end);
    lines = [...before, "", ...items.map((item) => `- [ ] ${item}`), "", ...after];
  }

  const backref = backReference.filter((line) => typeof line === "string" && line.trim() !== "");
  if (backref.length > 0) {
    const notes = findSection(lines, NOTES_HEADING_RE);
    if (notes) {
      lines = [...lines.slice(0, notes.headingIdx + 1), "", ...backref, ...lines.slice(notes.headingIdx + 1)];
    } else {
      lines = [...lines, "", "## Notes", "", ...backref, ""];
    }
  }

  return lines.join(newline);
}

// ── the two faces' provenance, authored HERE so neither face writes the other's ──────────────
// A back-reference that said "gap" on a chore raised by a review finding would be a provenance lie
// in a record whose whole purpose is traceability (ADR-004 §Context). The two shapes are therefore
// disjoint by construction and each face passes only its own facts.

// 39/ADR-001's shipped idiom, byte-identical: `work:promote-gap`'s observable output is unchanged
// by the extraction, and its own suite is the control on that.
export function gapBackReference({ title }) {
  return [`- **Promoted from gap:** "${title}"`];
}

// The finding face's provenance: the reviewed item's ref, the review round, and the finding's own
// one-line title and `file:line`. It allocates NO finding id — `66/ADR-006` gives allocation to the
// register's single writer, and at review-close time no register exists (ADR-003 §Context).
export function findingBackReference({ ref, round, title, location, key }) {
  const where = typeof location === "string" && location.trim() !== "" ? ` (\`${location.trim()}\`)` : "";
  const when = Number.isSafeInteger(round) && round > 0 ? `, review round ${round}` : "";
  return [
    `- **Promoted from review finding:** "${title}"${where}`,
    `- **Raised reviewing:** \`${ref}\`${when}`,
    // The idempotence key, written VISIBLY rather than hidden: the scan that refuses a second
    // promotion of the same finding reads this line, and a reader can see what makes two
    // promotions "the same" without knowing the scanner exists.
    `- **Promotion key:** \`${key}\``,
  ];
}
