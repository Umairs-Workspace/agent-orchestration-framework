// THE REGRESSION RECORD — milestone 96 / story 04, ADR-008 §1, §2. FF-9606 is its control.
//
// `aof test --scope all` already computes the gate boolean — `scope === "all" && widened.length
// === 0` (`src/commands/test.mjs`) — and then discards it. So this module is not a new test run.
// It is DURABILITY over a result the command already produces, and the door in
// `src/commands/item-status.mjs` is the other half.
//
// A BOOLEAN IS NOT EVIDENCE. It cannot be read at accept, diffed against the last milestone, or
// used to tell a gate that ran from a gate that ran on a tree somebody was editing. The row carries
// the commit, the instant, the scope and the result, and a rerun APPENDS — so the door reads the
// newest row and the history stays readable. An overwrite would make the record the same shape as
// the boolean it replaced.
//
// WHERE IT LIVES FOLLOWS 78/ADR-001 VERBATIM, because that ADR's reasoning transfers without
// change: a peer document in the item's own folder, never a section of `VERIFICATION.md` (whose
// single writer is the product owner), and never under `runs/` or `observability/`, both of which
// their own headers declare rebuildable or deletable. Evidence that survives to accept cannot live
// in a directory the system is entitled to delete.
//
// A HALF-WRITTEN ROW IS THE FAILURE THIS DOCUMENT CANNOT HAVE. A row missing its commit, its
// instant, its scope or its result is UNREADABLE — a coded refusal naming the row — rather than
// skipped, because a skipped row and a green gate render identically to the door. That is the
// observability report's failure mode with worse consequences: the door would permit an accept on
// the absence of a row it could not read.
//
// AND THE SHAPE IS FROZEN IN ONE HOME. The `h2`, the header row and the divider are exported
// constants (m66's law, as 78/02 applies it), so the writer, the reader and the door all spell them
// once. A second copy at a comparison site freezes a BELIEF about this module rather than the
// module.
//
// ZERO PROJECT IMPORTS, deliberately: `node:path` for the one path join and nothing else. Both the
// gate command and the accept door import this, and the door's own control (FF-9605) asserts the
// acceptance horizon stays a leaf — a record module that reached for the workspace, the config or
// a git seam would put the door's dependencies on the horizon's doorstep the next time somebody
// moved a predicate "closer to the lifecycle".
import path from "node:path";

// ── THE DOCUMENT ─────────────────────────────────────────────────────────────────────────────

// THE RECORD'S ONE BASENAME (ADR-008 §1) — a peer of `ARCHITECTURE.md` and `VERIFICATION.md` in
// the item's own folder. There is no caller-supplied output path anywhere in this family, which is
// what lets the write scope be asserted at all (78/ADR-001's rule, applied to a second record).
export const REGRESSION_RECORD_BASENAME = "REGRESSION.md";

export const GATE_COMMAND = "aof work regression-gate <ref>";

// M66'S LAW, APPLIED: a frozen `h2`, a frozen table header row and a frozen divider. The three are
// exported because the writer, the parser and the door all compare against them; freezing a second
// copy beside any one of those sites would freeze that site's belief instead.
export const REGRESSION_HEADING = "## Gate runs";
export const REGRESSION_HEADER = "| commit | instant | scope | result | detail |";
export const REGRESSION_DIVIDER = "|---|---|---|---|---|";

// The cell a row carries when it has nothing to say. It must be a value a reader cannot mistake for
// a commit, an instant, a scope or a result — and for the four REQUIRED cells the parser treats it
// as MISSING, which is what makes a half-written row unreadable rather than green.
export const EMPTY_CELL = "—";

// The three things a row can record. `green` and `red` are gate RUNS; `override` is a recorded
// reason (ADR-008 §4) and is not a run — a milestone accepted through one reports no green gate.
//
// THE WORDS ARE SPELLED HERE AND COMPARED THROUGH THE PREDICATES BELOW. A door that wrote
// `row.result === "red"` would be a second copy of this vocabulary at a comparison site, which is
// the species the frozen-shape rule above already refuses for the heading and the header row —
// and the one that has actually bitten this stream (`ITEM_RE` in four places, the lifecycle's five
// words beside their own predicate).
const GREEN = "green";
const RED = "red";
const OVERRIDE = "override";
export const GATE_RESULTS = Object.freeze([GREEN, RED, OVERRIDE]);

// The result and scope an OVERRIDE row carries. It is not a run, so it names no run's scope; the
// word in both cells is what makes the row distinguishable from a gate result at a glance, and what
// makes `satisfiesDoor` refuse it.
export const OVERRIDE_RESULT = OVERRIDE;

// isRedRow(row) — did a gate actually run here and fail? Distinct from "does not satisfy the door":
// a red row earns its own refusal code, because "the suite is failing" and "no whole-tree run has
// happened" are two different repairs.
export function isRedRow(row) {
  return row?.result === RED;
}

// THE ONLY SCOPE THAT SATISFIES THE DOOR. It is the same word `aof test`'s own gate rule closes on
// (`scope === "all" && widened.length === 0`), and the widening half is carried in the cell by the
// suffix below rather than by a sixth column — so "this run was not a whole-tree run" is visible in
// the document a human reads, not only in a predicate.
export const GATE_SCOPE = "all";
export const WIDENED_SUFFIX = "+widened";

const HEADING_PROSE = Object.freeze([
  `One row per gate run, appended by \`${GATE_COMMAND}\`. A rerun APPENDS: the newest row is the one`,
  "the accept door reads, and the earlier rows are the milestone's history. A row whose commit,",
  "instant, scope or result is missing makes this document UNREADABLE rather than green — repair it",
  "by hand rather than deleting the row, because a row nobody can read and a gate nobody ran are the",
  `same fact. A \`${GATE_RESULTS[2]}\` row is a recorded reason for accepting WITHOUT a green gate`,
  "(ADR-008 §4), never a gate result.",
]);

// regressionRecordPath(itemDir) — the record's home, and there is exactly one of it.
export function regressionRecordPath(itemDir) {
  return path.join(itemDir, REGRESSION_RECORD_BASENAME);
}

// ── THE CELLS ────────────────────────────────────────────────────────────────────────────────

// A commit is a hash and nothing else. A cell that is not one is a row that cannot name the tree it
// ran against, which is one of the four facts — so it is malformed, not merely odd.
const COMMIT_RE = /^[0-9a-f]{7,64}$/i;
// The instant is a full ISO-8601 UTC timestamp, never the DATE the record docs stamp: two gate runs
// on one day are two rows, and a date could not order them.
const INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
// A scope word, optionally carrying the widening suffix. No spaces: the cell is compared, not read.
const SCOPE_RE = new RegExp(`^[a-z]+(?:\\${WIDENED_SUFFIX})?$`);

// scopeCell({ scope, widened }) — the scope cell for a run, carrying the widening fact.
//
// A WIDENED `all` IS NOT A WHOLE-TREE RUN FOR THIS DOCUMENT'S PURPOSES. It ran over everything, but
// it got there because something was UNKNOWN, and `aof test`'s own gate rule already refuses to let
// a verdict rest on that. The suffix is how the row says so to a human as well as to the door.
export function scopeCell({ scope, widened = [] } = {}) {
  const word = typeof scope === "string" && scope.trim() !== "" ? scope.trim() : "none";
  return widened.length > 0 ? `${word}${WIDENED_SUFFIX}` : word;
}

// A detail cell is PROSE — failing case names, or the operator's override reason. It is the one
// cell that may be absent, and the one cell whose content this module normalises: a `|` or a
// newline inside it would end the row early, and a table that cannot be re-read is exactly the
// failure this document cannot have. Losing a pipe from a sentence is the cheaper loss, and it is
// taken here rather than left to each caller.
export function detailCell(text) {
  const flat = String(text ?? "").replace(/[\r\n]+/g, " ").replaceAll("|", "/").trim();
  return flat === "" ? EMPTY_CELL : flat;
}

// gateInstant(now) — the row's instant, and the ONE home of its format.
//
// A row stamps an INSTANT, never the DATE the record docs carry (`updated: 2026-09-04`): two gate
// runs on one day are two rows, and a date could not order them — which would break the whole
// "newest row" reading the door depends on. An injected clock (the established ISO-8601 test input)
// is passed through verbatim when it is already UTC-Z, so a test drives the exact bytes it asserts.
// Both writers — the gate run and the override row — take their instant from here.
export function gateInstant(now) {
  const iso = typeof now === "string" && now.length > 0 ? now : new Date().toISOString();
  return INSTANT_RE.test(iso) ? iso : new Date(iso).toISOString();
}

// ── THE PARSE ────────────────────────────────────────────────────────────────────────────────

export const RECORD_MALFORMED = "regression-record-malformed";

// THE ROW CANNOT BE COMPOSED WITHOUT A COMMIT, and the code for that lives here rather than in
// either writer. Both the gate run and the override row are written against a tree, and a checkout
// that cannot name its own HEAD cannot produce a readable row — the same fact from two callers, so
// it gets one code rather than one each.
export const COMMIT_UNKNOWN = "regression-gate-commit-unknown";

const cells = (line) => line.slice(1, -1).split("|").map((cell) => cell.trim());

const isFilled = (cell) => typeof cell === "string" && cell !== "" && cell !== EMPTY_CELL;

function malformed(target, detail) {
  const error = new Error(
    `The regression record in ${target} could not be read: ${detail}. `
      + "Repair it by hand. A row this parser cannot read is NOT skipped: a skipped row and a green "
      + "gate look identical to the accept door, which is the one confusion this document exists to "
      + "prevent.",
  );
  error.code = RECORD_MALFORMED;
  error.status = 409;
  error.detail = { path: target, reason: detail };
  throw error;
}

/**
 * The gate rows of an existing record, in the order the document carries them.
 *
 * PARSED, NEVER GUESSED AT. The heading, the header row and the divider are the frozen literals
 * above, and a document whose shape differs is reported MALFORMED rather than read loosely. Every
 * row must carry all five cells and all four required facts; the first row that does not stops the
 * read. Nothing is skipped, and nothing is inferred from a partial row.
 */
export function parseRegressionRows(text, target = REGRESSION_RECORD_BASENAME) {
  const lines = String(text ?? "").split("\n");
  const at = lines.findIndex((line) => line.trimEnd() === REGRESSION_HEADING);
  if (at === -1) malformed(target, `no \`${REGRESSION_HEADING}\` heading`);

  const tableAt = lines.findIndex((line, index) => index > at && line.startsWith("|"));
  if (tableAt === -1) malformed(target, `the \`${REGRESSION_HEADING}\` block carries no table`);
  if (lines[tableAt].trimEnd() !== REGRESSION_HEADER) {
    malformed(target, `the table header row is \`${lines[tableAt]}\`, not the frozen \`${REGRESSION_HEADER}\``);
  }
  if ((lines[tableAt + 1] ?? "").trimEnd() !== REGRESSION_DIVIDER) {
    malformed(target, `the header separator is \`${lines[tableAt + 1] ?? ""}\`, not the frozen \`${REGRESSION_DIVIDER}\``);
  }

  const rows = [];
  for (let index = tableAt + 2; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    if (!line.startsWith("|")) break;
    const parts = cells(line);
    const at1 = rows.length + 1;
    if (parts.length !== 5) {
      malformed(target, `row ${at1} carries ${parts.length} cells, not the frozen 5 (\`${line}\`)`);
    }
    const [commit, instant, scope, result, detail] = parts;
    // THE FOUR FACTS, EACH REFUSED BY NAME. The message names the row AND the missing fact, because
    // the repair differs: a missing commit means the run cannot be tied to a tree, and a missing
    // result means nobody can say what it proved.
    if (!isFilled(commit)) malformed(target, `row ${at1} is missing its commit (\`${line}\`)`);
    if (!COMMIT_RE.test(commit)) malformed(target, `row ${at1}'s commit \`${commit}\` is not a commit hash`);
    if (!isFilled(instant)) malformed(target, `row ${at1} is missing its instant (\`${line}\`)`);
    if (!INSTANT_RE.test(instant)) malformed(target, `row ${at1}'s instant \`${instant}\` is not an ISO-8601 UTC timestamp`);
    if (!isFilled(scope)) malformed(target, `row ${at1} is missing its scope (\`${line}\`)`);
    if (!SCOPE_RE.test(scope)) malformed(target, `row ${at1}'s scope \`${scope}\` is not a scope word`);
    if (!isFilled(result)) malformed(target, `row ${at1} is missing its result (\`${line}\`)`);
    if (!GATE_RESULTS.includes(result)) {
      malformed(target, `row ${at1}'s result \`${result}\` is not one of ${GATE_RESULTS.join(", ")}`);
    }
    rows.push(Object.freeze({ commit, instant, scope, result, detail: isFilled(detail) ? detail : null, line }));
  }
  return rows;
}

// newestRegressionRow(rows) — the row the door reads. The document is append-only, so the newest
// row is the last one; an older green row therefore never rescues a newer red one, and that is a
// property of the ORDER rather than of a comparison somebody has to remember to write.
export function newestRegressionRow(rows) {
  return rows.length === 0 ? null : rows[rows.length - 1];
}

// satisfiesDoor(row) — may this row stand as the milestone's regression evidence?
//
// THE PREDICATE HAS ONE HOME and it is here, beside the vocabulary it closes on — the same reason
// `isOpen` lives beside `VALID_STATUS`. `green` alone is not enough: a run whose scope was not
// `all`, or whose selection widened, is RECORDED (so the history is honest) and does not satisfy
// the door (so a partial run cannot wear a gate's name). An `override` row is a recorded reason,
// never a run, so it satisfies nothing.
export function satisfiesDoor(row) {
  return row != null && row.result === GREEN && row.scope === GATE_SCOPE;
}

// ── THE COMPOSE ──────────────────────────────────────────────────────────────────────────────

// The row RENDERER is module-local: `appendRegressionRow` is the only writer, and a second exported
// way to make a row is a second way to make a malformed one.
function renderRegressionRow({ commit, instant, scope, result, detail }) {
  return `| ${commit} | ${instant} | ${scope} | ${result} | ${detailCell(detail)} |`;
}

/**
 * The record's whole text with one row APPENDED — the read-modify-write ADR-008 §1 requires.
 *
 * A RERUN APPENDS AND THE EARLIER ROWS GO BACK VERBATIM, each as its own original line. Re-rendering
 * a carried row from its parsed cells would normalise somebody's spacing, which is a byte change to
 * a line this writer has no business touching; and truncating would make the document the same shape
 * as the boolean it replaces.
 *
 * EVERYTHING ABOVE THE HEADING IS PRESERVED. A milestone's record may grow a note over its life, and
 * a writer that ate it is a writer nobody runs twice. Only the block from the heading down is
 * recomposed, from the frozen literals plus the rows.
 */
export function appendRegressionRow(existing, row, target = REGRESSION_RECORD_BASENAME) {
  const rows = existing == null ? [] : parseRegressionRows(existing, target);
  // The preamble is taken BY LINE, exactly as the parse finds the heading — an index into the raw
  // text would slice at a `## Gate runs` that happened to appear inside a sentence, and the two
  // halves of one module must not disagree about where the block starts. Trailing blank lines are
  // dropped and re-added below, so appending N rows does not grow N blank lines: the document's
  // bytes have to be stable under a rerun for a diff to mean "a gate ran".
  const preamble = existing == null
    ? DEFAULT_PREAMBLE
    : existing.split("\n").slice(0, existing.split("\n").findIndex((line) => line.trimEnd() === REGRESSION_HEADING))
      .join("\n").replace(/\s+$/, "");
  return [
    ...(preamble === "" ? [] : [preamble, ""]),
    REGRESSION_HEADING,
    "",
    ...HEADING_PROSE,
    "",
    REGRESSION_HEADER,
    REGRESSION_DIVIDER,
    ...rows.map((carried) => carried.line),
    renderRegressionRow(row),
    "",
  ].join("\n");
}

const DEFAULT_PREAMBLE = [
  "<!-- The regression gate's evidence (96/ADR-008). Appended by the gate command; never hand-written. -->",
  "# Regression gate",
].join("\n");
