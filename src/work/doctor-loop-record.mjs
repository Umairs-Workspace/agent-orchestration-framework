// work:doctor — milestone 78 / story 03: THE LOOP-RECORD LANE. One pure
// `(snapshot) => Finding[]` group APPENDED to the engine's `CHECK_GROUPS` registry, in the
// shape 66/02 and 54/04 each used. It edits no existing group and no spine control flow.
//
// IT REPORTS AND NEVER GATES (ADR-007). Every finding is `warn`, and a warn-only doctor result
// does not fail `aof:validate` — the intended strength, not a weakness. Three arguments stand
// behind it: 66 declined the same move for the observability report (*"the measure→decide path
// already works through a human"*); 59's thesis that an agent-generated record a human
// rubber-stamps *"may be worse than none, because it launders a machine claim as human
// judgement"*; and the measurement taken at 78's refine — 0 of 61 run records carry `brief.loop`,
// so a gate's first act would be to refuse every accept in the stream over a fact no operator can
// currently supply. A gate whose first act is to block the whole stream is not a gate, it is an
// outage. Recorded for the future: if this ever DOES gate, the gate belongs on
// `aof work status <ref> done` — story 73's door — and never on a prompt.
//
// THE RECORD IS READ WHEN PRESENT AND NEVER DEMANDED (ADR-001). `EXECUTION.md` is deliberately
// NOT a member of `CONVENTION_DOCS`: an item that ran no loops owes no record, and a lane that
// demanded one from every item would report on the whole stream on day one — which is exactly the
// noise that made `observability/report.md` unread.
//
// ───────────────────────────────────────────────────────────────────────────────────────────
// WHY THE FROZEN SHAPE IS RESTATED HERE RATHER THAN IMPORTED FROM THE WRITER, and it is not
// laziness in either direction.
//
// The literals also live in `src/commands/loop-record.mjs` (78/02), which is where the writer
// needs them. Importing them from there would put the WRITER'S OWN OPINION of the shape into the
// instrument that checks it: a writer that changed its heading would change the checker in the
// same commit, and `loop-record-malformed` could never fire for the one cause most likely to
// produce it. An independent checker must hold its own copy — the same reasoning
// `acd-loop-record-write-scope` gives for restating 52/FF-5201's patterns instead of reading them
// out of that gate.
//
// The second reason is structural and decides it even if the first did not. This module is swept
// by 52/FF-5202, which forbids every `src/work-doctor*.mjs` from naming the loop registry family;
// and `src/commands/loop-record.mjs` imports `work-loops.mjs`, `run-store.mjs` and `fs.mjs`, so
// importing it would drag the filesystem and the registry loader into the import closure of a lane
// whose whole contract is that it is a pure function of a snapshot.
//
// TWO COPIES IS THEREFORE THE DESIGN, AND FF-7809 IS WHAT MAKES IT SAFE: that gate holds this
// module's literals, the writer's exported literals and its own third copy byte-equal. Three
// independent readers agreeing is a frozen shape; one reader importing another is a shape with no
// freeze at all.
// ───────────────────────────────────────────────────────────────────────────────────────────
//
// ACD NEVER EXECUTES ANYTHING, AND THIS LANE READS NO DISK. The record's text and the item's
// projected engagement list both arrive as SNAPSHOT DATA at the engine's one impure edge, exactly
// as the controls lane's leg B receives its runner texts and 54/04's lane receives its report — so
// every answer below is reproducible from a literal snapshot on any machine, with no filesystem at
// all. No clock, no `path.resolve`, no child process, no dynamic `import()`.
import path from "node:path";

// THE FROZEN CODES OF THIS LANE. A DIFFERENT array from `CONTROL_FINDING_CODES`, which is what
// makes them structurally incapable of reaching 54/02's doctor gate or the loop's own
// `DOCTOR_GATE_CODES` (derived from that array) — the mechanism 54/04 used for the same purpose,
// and the reason FF-7808 can assert "never gates" as a property rather than as a promise.
export const LOOP_RECORD_FINDING_CODES = Object.freeze([
  "loop-record-unsigned",
  "loop-record-part-signed",
  "loop-record-stale",
  "loop-record-malformed",
]);

// EVERY FINDING IS A WARNING (ADR-007), and the severity is a module constant rather than a
// per-call argument so no future caller can harden one code. It does NOT consult the acceptance
// horizon: `severityFor` answers `error` inside it, which is precisely the hardening this lane
// must not do — a record on a `done` item reports the same warning it reported while the item was
// open (54/04's lane takes the same deliberate departure, for the same kind of reason).
const ADVISORY_SEVERITY = "warn";

// `node:path` for `join` ONLY — never `path.resolve`, which reads `process.cwd()` and would be a
// hidden impurity in a lane whose whole contract is that it is a function of the snapshot. The
// finding's path must be OS-NATIVE, because the engine filters findings to scope by path and a
// forward-slash join silently drops every finding it anchors on Windows (measured at 54/04's
// build — a correctly produced finding was filtered away unseen).
const finding = (code, target, message) => ({ code, severity: ADVISORY_SEVERITY, path: target, message });

// ---------------------------------------------------------------- the frozen shape ----

// The record's basename. See the header for why this module names it rather than importing it.
export const EXECUTION_RECORD_BASENAME = "EXECUTION.md";

// MILESTONE 66'S LAW (m66/ADR-001, 78/ADR-001): a frozen `h2`, a frozen table header row, and the
// id ALONE in the first cell. The positional rule is what separates a DECLARATION from a mention —
// an id sharing its cell with prose declares nothing — which is why a signature written as prose in
// a paragraph is not checkable and drifts.
export const SIGNOFF_HEADING = "## Sign-off";
export const SIGNOFF_HEADER = "| loop | signer | date | verdict |";
export const SIGNOFF_DIVIDER = "|---|---|---|---|";
export const SIGNOFF_PLACEHOLDER = "—";

const cellsOf = (line) => line.slice(1, -1).split("|").map((cell) => cell.trim());

const isFilled = (cell) => typeof cell === "string" && cell !== "" && cell !== SIGNOFF_PLACEHOLDER;

/**
 * WHAT COUNTS AS SIGNED is a whole row — an id, a signer, a date and a verdict. A row with a name
 * and no verdict is half a claim, and an untouched placeholder row is UNSIGNED, never a recorded
 * signature: every freshly written record is full of them, so a lane that read a placeholder as a
 * signature would report the whole stream signed on the day the writer shipped.
 *
 * A REJECTED VERDICT IS A SIGNATURE, not an absence. A human who read the record and refused it has
 * said something, and it is the more interesting half of the answer — which is why the verdict cell
 * is kept rather than reduced to a boolean.
 */
export const isSignedRow = (row) => isFilled(row?.signer) && isFilled(row?.date) && isFilled(row?.verdict);

/**
 * The sign-off rows of a record, or the reason it could not be read.
 *
 * `{ ok: true, rows }` — the rows in document order. `{ ok: false, reason }` — the heading or the
 * header row is not the frozen literal, or a row is not the frozen four cells, or a first cell
 * carries more than the id. A document whose shape differs is reported as MALFORMED rather than
 * read loosely: a loose read is how a signature becomes invisible to the very check that exists to
 * notice it, and "we could not read it" and "nobody has signed it" are two different facts about an
 * item.
 */
export function readSignoff(text) {
  if (typeof text !== "string") return { ok: false, reason: "the record could not be read as text" };
  const lines = text.split("\n");

  const at = lines.indexOf(SIGNOFF_HEADING);
  if (at === -1) return { ok: false, reason: `there is no \`${SIGNOFF_HEADING}\` heading` };

  const tableAt = lines.findIndex((line, index) => index > at && line.startsWith("|"));
  if (tableAt === -1) return { ok: false, reason: `the \`${SIGNOFF_HEADING}\` block carries no table` };
  if (lines[tableAt] !== SIGNOFF_HEADER) {
    return { ok: false, reason: `the table header row is \`${lines[tableAt]}\`, not the frozen \`${SIGNOFF_HEADER}\`` };
  }
  if (lines[tableAt + 1] !== SIGNOFF_DIVIDER) {
    return { ok: false, reason: `the header separator is \`${lines[tableAt + 1] ?? ""}\`, not the frozen \`${SIGNOFF_DIVIDER}\`` };
  }

  const rows = [];
  for (let index = tableAt + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("|")) break;
    const parts = cellsOf(line);
    if (parts.length !== 4) {
      return { ok: false, reason: `sign-off row ${rows.length + 1} carries ${parts.length} cells, not the frozen 4` };
    }
    const [loop, signer, date, verdict] = parts;
    // THE ID STANDS ALONE IN THE FIRST CELL. A first cell carrying the id followed by prose
    // declares nothing (m66/ADR-001 §2), so it is refused rather than half-read — a row whose
    // subject is ambiguous cannot be matched to an engagement, and an unmatched row is a signature
    // nobody can find.
    if (isFilled(loop) && /\s/.test(loop)) {
      return { ok: false, reason: `sign-off row ${rows.length + 1}'s first cell carries more than the loop id (\`${loop}\`)` };
    }
    rows.push({ loop, signer, date, verdict });
  }
  return { ok: true, rows };
}

/**
 * Match the engagements the item's runs now project against the rows the record carries.
 *
 * WHY A MATCH AND NOT A SET COMPARISON, and this is the whole subtlety of the lane. The writer
 * (78/02) preserves an ORPHANED SIGNED ROW — a signed row whose engagement no longer exists — because
 * ADR-002 makes the human signature the one thing a regeneration never destroys, and a run record can
 * genuinely leave an item (`pruneRun`). A plain multiset comparison would therefore report such a
 * record `loop-record-stale`, and REGENERATING WOULD NOT CLEAR IT: the writer carries the orphan
 * forward every time. A permanent warning nobody can act on is the "wall of inherited red" pathology
 * that 54/04 and 70/ADR-007 each refuse by name.
 *
 * So the comparison is asymmetric, exactly as the writer's own contract is:
 *   · every projected engagement MUST have a row — one missing means the record is behind its runs;
 *   · a leftover UNSIGNED row means the record is behind too, because the writer re-derives unsigned
 *     rows away and would not have left one for an engagement that no longer exists;
 *   · a leftover SIGNED row is a sanctioned orphan, and is not staleness.
 *
 * Rows are consumed UNSIGNED-FIRST, so a hand-edited record holding both a signed and an unsigned row
 * for one loop leaves the signed one as the orphan. The bias is deliberate: report stale only when
 * some reading of the record cannot be reconciled with the runs.
 */
function matchEngagements(rows, projected) {
  const pool = new Map();
  for (const row of rows) {
    if (!pool.has(row.loop)) pool.set(row.loop, []);
    pool.get(row.loop).push(row);
  }
  for (const candidates of pool.values()) {
    candidates.sort((left, right) => Number(isSignedRow(left)) - Number(isSignedRow(right)));
  }

  const current = [];
  const missing = [];
  for (const id of projected) {
    const candidates = pool.get(String(id)) ?? [];
    if (candidates.length === 0) missing.push(String(id));
    else current.push(candidates.shift());
  }
  const leftover = [...pool.values()].flat();
  return { current, missing, orphans: leftover.filter((row) => isSignedRow(row)), stray: leftover.filter((row) => !isSignedRow(row)) };
}

// ------------------------------------------------------------------- the lane ----

/**
 * loopRecordLane(snapshot) → Finding[]
 *
 * PURE over the snapshot it is handed. The engine filters findings to scope and each finding
 * anchors at the item's own `EXECUTION.md`, so horizon-scoping is the spine's — exactly as it is for
 * every other lane.
 *
 * Per item, at most ONE finding: a record that cannot be parsed cannot also be judged unsigned or
 * stale, and reporting three findings about one unreadable file would be three sentences about one
 * fact. `loop-record-malformed` therefore short-circuits, and the unsigned/part-signed pair are
 * mutually exclusive by construction.
 */
export function loopRecordLane(snapshot) {
  const findings = [];
  for (const item of snapshot?.items ?? []) {
    const record = item?.executionRecord ?? null;
    // AN ITEM WITH NO RECORD PRODUCES NO FINDING, and the record is never reported as missing.
    if (record == null || record.present !== true) continue;
    const target = path.join(item.dir, EXECUTION_RECORD_BASENAME);

    const read = readSignoff(record.text);
    if (read.ok !== true) {
      findings.push(finding(
        "loop-record-malformed",
        target,
        `${item.ref}: the loop execution record's sign-off block is not the frozen shape — ${read.reason}. `
          + "Repair it by hand; regenerating would discard a signature.",
      ));
      continue;
    }

    // STALENESS IS AN ENGAGEMENT MATCH, and the sign-off table is where the record states its
    // engagements — one row per engagement, the loop id alone in the first cell. Matching THOSE ids
    // against the ids the item's run records now project needs no knowledge of the renderer's prose,
    // which is what keeps this lane free of a second copy of 78/01's byte format. `matchEngagements`
    // above owns the asymmetry an orphaned signature forces.
    //
    // WHAT IT DELIBERATELY DOES NOT CATCH, said here rather than discovered later: a record whose
    // engagements are the same but whose CYCLE COUNTS have moved on. Reading a cycle count means
    // parsing the `## What ran` bullets, i.e. holding a second copy of the renderer's grammar in the
    // instrument that checks it — the coupling this whole module is arranged to avoid. A regeneration
    // re-derives those numbers anyway; what an operator cannot see without help is that the record is
    // about a DIFFERENT SET of engagements than the ones that ran.
    //
    // `loopEngagements: null` means the engine never looked (there was no record to look for), so
    // there is no staleness claim to make and every row is judged as current. It is NOT read as
    // "nothing ran" — that would report a fully signed record stale on a snapshot built without the
    // field.
    const projected = item?.loopEngagements ?? null;
    const matched = Array.isArray(projected)
      ? matchEngagements(read.rows, projected)
      : { current: read.rows, missing: [], orphans: [], stray: [] };

    if (matched.missing.length > 0 || matched.stray.length > 0) {
      const why = [
        ...(matched.missing.length > 0 ? [`${matched.missing.length} engagement(s) it does not name (${matched.missing.join(", ")})`] : []),
        ...(matched.stray.length > 0 ? [`${matched.stray.length} unsigned row(s) for engagement(s) that no longer exist (${matched.stray.map((row) => row.loop).join(", ")})`] : []),
      ];
      findings.push(finding(
        "loop-record-stale",
        target,
        `${item.ref}: the record no longer matches what the item's run records project — ${why.join(", and ")}. `
          + `Regenerate it with \`aof work loop-record ${item.ref} --write\`.`,
      ));
      continue;
    }

    // AN EMPTY BLOCK IS NOT UNSIGNED. A record for an item where no loop ran carries the frozen
    // heading and header and no rows, and there is nothing for a human to sign — reporting it
    // unsigned would put a warning on every item in this repository the day the writer shipped,
    // which is the noise ADR-001 keeps `EXECUTION.md` out of `CONVENTION_DOCS` to avoid.
    //
    // SIGNEDNESS IS JUDGED OVER THE CURRENT ROWS ONLY, never over the orphans. An orphaned signature
    // is about work that has left the item, so counting it would let one old signature report a
    // record with two unsigned engagements as merely PART-signed — and, the other way round, an item
    // whose every current row is signed would read as part-signed the moment it also carried an
    // orphan.
    if (matched.current.length === 0) continue;

    const signed = matched.current.filter((row) => isSignedRow(row));
    if (signed.length === 0) {
      findings.push(finding(
        "loop-record-unsigned",
        target,
        `${item.ref}: the loop execution record carries ${matched.current.length} engagement(s) and no signed sign-off row `
          + "— nobody has recorded that the execution was acceptable.",
      ));
      continue;
    }
    if (signed.length < matched.current.length) {
      findings.push(finding(
        "loop-record-part-signed",
        target,
        `${item.ref}: ${signed.length} of ${matched.current.length} sign-off rows are signed `
          + `(unsigned: ${matched.current.filter((row) => !isSignedRow(row)).map((row) => row.loop).join(", ")}) `
          + "— a signature on one loop says nothing about another.",
      ));
    }
  }
  return findings;
}
