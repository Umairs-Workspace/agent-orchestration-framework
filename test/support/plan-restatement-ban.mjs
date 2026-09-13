// THE PLAN'S RESTATEMENT BAN — ONE HOME (milestone 96 / ADR-005).
//
// The decision is that the file table has exactly ONE home and it is the story record's
// frontmatter: `ready-wave.mjs` consumes `files:`, `validate.mjs` checks it, and 96/01 derives it.
// A `PLAN.md` carrying the table would be the second list, and the third would be whichever agent
// transcribed it — 15/R1's measured species, "a sanctioned count generalised in two places usually
// lives in a third", arriving on schedule.
//
// So the rule is asserted over the SHIPPED TEMPLATE and over EVERY `PLAN.md` in the stream, which
// makes it a property of the tree rather than of one file. Two callers need it — FF-9603's control
// and 96/02's behavioural suite, which drives the Scenario-Outline table of shapes — and a detector
// written twice is the very defect the rule it encodes exists to refuse. Hence this module.
//
// WHAT IS BANNED IS ENUMERATION, NOT REFERENCE. The contract's own Examples table draws the line
// and this implementation follows it exactly: a `files:`/`reads:` key, a table whose header names a
// file column, and a bullet list of paths are all refused; **a single inline reference to one
// module inside a sentence about the seam is admitted**, and so is naming the story's frontmatter
// as the place the file table lives. A mechanism paragraph has to be able to say what the change
// hangs off, or the document has nothing left to carry.

// The repository roots a declared path is declared UNDER. A token is path-shaped only when it
// starts at one of these — so `STORY.md`, `PLAN.md` and a bare identifier are not paths, and
// nothing in a plan's prose becomes a violation just for carrying a dot.
const SOURCE_ROOTS = ["src", "test", "tests", "scripts", "ui", "app", "lib", "wiki", "docs"];

// A path-shaped literal: a source root, a separator, and at least one more segment character. The
// leading guard stops `my/src/x` and `…-src/x` matching, so a violation names a real declared path.
const PATH_RE = new RegExp(String.raw`(?<![\w./-])(?:${SOURCE_ROOTS.join("|")})/[A-Za-z0-9_.@-]+(?:/[A-Za-z0-9_.@-]+)*`, "g");

// A `files:`/`reads:` key — the declaration itself, wherever it is spelled: at the head of a line,
// inside a frontmatter block, or as a list entry. Matched line-anchored so a PROSE mention ("the
// file table is the story's own frontmatter") is not caught, which is the admitted case.
const KEY_RE = /^\s{0,3}(?:[-*+]\s*)?(files|reads)\s*:/;

// The cell names that make a markdown table a FILE TABLE. Checked against a header row's cells
// after formatting is stripped, so `**File**` and `` `Path` `` are the same word.
const FILE_COLUMN = new Set(["file", "files", "path", "paths", "module", "modules", "artifact", "artifacts"]);

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line.trimEnd());
const isDividerRow = (line) => /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(line.trimEnd());
const cellsOf = (line) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|")
    .map((cell) => cell.replace(/[`*_]/g, "").trim().toLowerCase());

const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;

// `restatementViolations(text)` → the violations, each `{ rule, line, evidence }` with `line`
// 1-based. Empty ⇒ ADMITTED. Four rules, each failing for its own reason:
//
//   declared-set-key   — the declaration restated verbatim, in any of its spellings.
//   file-column-table  — the table, which is the shape ADR-005 names first.
//   path-list          — a list ITEM headed by a path: an enumeration however short.
//   path-enumeration   — more than one distinct declared path anywhere in the document. One is the
//                        admitted inline reference; two is an inventory wearing prose, which is the
//                        shape that would otherwise walk straight through the three rules above.
export function restatementViolations(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const violations = [];
  const paths = new Map();

  lines.forEach((line, index) => {
    const at = index + 1;

    const key = line.match(KEY_RE);
    if (key) violations.push({ rule: "declared-set-key", line: at, evidence: key[1] + ":" });

    // A header row is a table row whose NEXT row is the divider — which is what distinguishes a
    // header from a body row that happens to sit first.
    if (isTableRow(line) && isDividerRow(lines[index + 1] ?? "")) {
      const named = cellsOf(line).filter((cell) => FILE_COLUMN.has(cell));
      if (named.length > 0) violations.push({ rule: "file-column-table", line: at, evidence: named.join(", ") });
    }

    const item = line.match(LIST_ITEM_RE);
    if (item) {
      const head = item[1].replace(/^[`"'(\[]+/, "");
      const match = head.match(PATH_RE);
      if (match && head.startsWith(match[0])) {
        violations.push({ rule: "path-list", line: at, evidence: match[0] });
      }
    }

    for (const found of line.match(PATH_RE) ?? []) {
      if (!paths.has(found)) paths.set(found, at);
    }
  });

  if (paths.size > 1) {
    for (const [found, at] of [...paths.entries()].slice(1)) {
      violations.push({ rule: "path-enumeration", line: at, evidence: found });
    }
  }

  return violations;
}
