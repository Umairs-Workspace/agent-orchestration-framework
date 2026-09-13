// src/commands/loop-record.mjs — `work:loop-record`, the loop execution record's ONE command
// (78/02). It resolves the item, loads the registry, reads the item's own run records, projects the
// execution model (78/00), renders the document (78/01) and emits it. `--write` is the only door to
// disk.
//
// THE BARE FACE IS A READ (ADR-002), and that is the `work:grade` idiom — `--run` as the only door
// to execution, 54/ADR-003 §2 — chosen for the same reason: a face that writes by default cannot be
// composed by anything that only wants to look, and `acd-work-command-cli-bijection` spawns every
// registered verb as a REAL subprocess from inside this repository's own suite, so a writing bare
// face would make the suite write a tracked file into its own tree.
//
// THE WRITER IS A READ-MODIFY-WRITE, not a truncate-and-emit, and that is the one place it is
// HARDER than story 79's (which has no signature and therefore truncates). Two obligations meet
// here and neither may be dropped:
//
//   BYTE-IDENTITY on unchanged inputs (FF-7803) — what makes a non-empty diff mean "an input
//   changed" rather than "somebody ran the command". Nothing here reads a clock, a cwd or a host
//   name; the document's own bytes come from a pure renderer, and the only bytes this module adds
//   are the sign-off block, composed from the model and from rows read back off the previous file.
//
//   SIGNATURE PRESERVATION across a change (FF-7804) — a human signature is by construction not
//   derivable from any input, so a naive regeneration would destroy the only part of the document
//   that is not machine-made. A writer that did that is a writer nobody runs twice, which is the
//   same as not having one.
//
// THE NAME IS FORCED (ADR-009). `src/commands/loop-record.mjs`, never `src/commands/loops-record.mjs`:
// 52/FF-5201 DISCOVERS `src/work-loops*.mjs` and `src/commands/loops-*.mjs` from disk and holds
// every discovered module free of write calls — its own comment names "a future writer
// `src/commands/loops-init.mjs`" as the case it exists to catch. The registry is framework data and
// read-only by law; an execution is a per-item fact. This module belongs to the EXECUTION family
// (`work-loop.mjs`, `loop-bounds.mjs`, `loop-progress.mjs`, `loop-record.mjs`) and takes its name.
//
// THE ROUTE IS `aof work loop-record <ref>`, and it does NOT join `aof work loops …` the way story
// 79's writer does. That family's four verbs and 79's document all answer for the framework-wide
// REGISTRY and take no ref; this one answers for ONE ITEM and its first positional is that item.
// Filing a ref-taking per-item verb under the registry's noun would put two different scopes behind
// one word.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
// From the comment above this module's registry import:
//   milestone 78 / story 02 — work:loop-record, the PER-ITEM execution record. The same shape as the
//   writer above and for the same reasons (a READ bare face, `--write` the only door to disk, the
//   execution family's name because 52/FF-5201 holds the registry family read-only), with one
//   difference that decides its route: this one answers for ONE ITEM and takes its ref, so it sits at
//   `aof work loop-record <ref>` rather than under the registry-scoped `aof work loops …` noun.
//   BOARD-DEFERRED on the same recorded decision (78/ADR-008): 52/FF-5202 bans the loop family from
//   `ui/`, and the record's surface is a committed markdown file the operator already has open.
//
// From the comment on `loopRecordCommand`'s COMMANDS entry:
//   milestone 78 / story 02 — the per-item execution record (see the import note). Registered here
//   beside the registry's writer rather than in the `loops-` family, for the same reason it is:
//   the gate that discovers that family forbids a writer in it.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { commandError } from "../command-error.mjs";
import { writeText } from "../fs.mjs";
import { projectExecution } from "../loop-record.mjs";
import { regenerateCommand, renderExecutionDocument } from "../loop-record-render.mjs";
import { readRuns } from "../run-store.mjs";
import { loadLoops } from "../work/loops.mjs";
import { requireLocalCheckout, resolveItemExact } from "./resolve.mjs";

// ---------------------------------------------------------- the frozen block ----

// THE RECORD'S ONE BASENAME (ADR-001): a new document in the item's own folder, a peer of
// ARCHITECTURE.md and VERIFICATION.md — never a section of VERIFICATION.md (whose single writer is
// the product owner) and never under `runs/` or `observability/`, both of which are declared
// rebuildable or deletable by their own headers.
export const EXECUTION_RECORD_BASENAME = "EXECUTION.md";

// The regeneration spelling is the RENDERER's (`src/loop-record-render.mjs`), because the marker it
// stamps into the document is the other half of this prose. One home, one spelling: the marker and
// the sign-off's instruction cannot disagree about how the verb is invoked.

// MILESTONE 66'S LAW, APPLIED (ADR-001, m66/ADR-001): a frozen `h2`, a frozen table header row, and
// the id ALONE in the first cell. The positional rule is what separates a DECLARATION from a
// mention — an id sharing its cell with prose declares nothing — and it is why a signature written
// as prose in a paragraph is not checkable and drifts.
//
// The first cell holds a LOOP ID (`loop:<name>`), the endpoint grammar the registry already uses.
// No new id form is introduced: `src/declared-id.mjs`'s set is closed and extended by ADR alone
// (66/ADR-008).
//
// Exported because story 03's shape check and doctor lane read the same literals. One home, so a
// gate that froze a second copy would be freezing a belief about this writer rather than the writer.
export const SIGNOFF_HEADING = "## Sign-off";
export const SIGNOFF_HEADER = "| loop | signer | date | verdict |";
export const SIGNOFF_DIVIDER = "|---|---|---|---|";

// The untouched cell. It must be a value a reader cannot mistake for a name, a date or a verdict,
// and the parse below treats it as empty — an untouched placeholder row is UNSIGNED, never a
// recorded signature.
export const SIGNOFF_PLACEHOLDER = "—";

// The two verdicts. A rejected verdict is a SIGNATURE, not an absence: a human who read the record
// and refused it has said something, and a regeneration that dropped that row would lose the more
// interesting half of the human's answer.
export const SIGNOFF_VERDICTS = Object.freeze(["accepted", "rejected"]);

// THE PROSE IS A FUNCTION OF THE REF, for the reason the marker is (chore 117): it names the
// regeneration command, and a command naming `<ref>` is one the reader must edit before it runs.
// The line is composed per item rather than frozen at module load — deterministic per item, which
// is what the drift check asks of it.
const signoffProse = (ref) => [
  `One row per engagement above. To sign a row, replace its \`${SIGNOFF_PLACEHOLDER}\` cells with a`,
  `signer, a date and a verdict (\`${SIGNOFF_VERDICTS.join("` or `")}\`); a row with any cell left as`,
  `\`${SIGNOFF_PLACEHOLDER}\` is unsigned. \`${regenerateCommand(ref)}\` re-derives every other line in this`,
  "document and carries each signed row forward verbatim.",
];

const cells = (line) => line.slice(1, -1).split("|").map((cell) => cell.trim());

const isFilled = (cell) => typeof cell === "string" && cell !== "" && cell !== SIGNOFF_PLACEHOLDER;

// A ROW IS SIGNED ONLY WHEN IT IS COMPLETE — an id, a signer, a date and a verdict. A row with a
// name and no verdict is half a claim, and the writer needs an unambiguous answer to "is this row
// signed" before it can decide what to preserve.
const isSignedRow = (row) => isFilled(row.signer) && isFilled(row.date) && isFilled(row.verdict);

// ------------------------------------------------------------- the parse ----

function malformed(target, detail) {
  const error = commandError(
    `The sign-off block in ${target} could not be parsed: ${detail}. `
      + "Repair it by hand — regenerating would discard a signature, which is the one thing in this "
      + "document that no input can re-derive.",
    "loop-record-malformed",
    409,
  );
  error.detail = { path: target, reason: detail };
  throw error;
}

/**
 * The sign-off rows of an existing record, in the order the document carries them.
 *
 * PARSED, NEVER GUESSED AT. The heading and the header row are frozen literals and a document whose
 * heading or header differs is reported as MALFORMED rather than read loosely — a loose read is how
 * a signature gets silently dropped, which is exactly the failure the refusal exists to prevent.
 *
 * This is the ONLY thing any code path reads out of the document (FF-7805). Not one execution fact
 * is recovered from these bytes: the model comes from the run records every time, and the record
 * stays a face rather than becoming a second truth.
 */
export function parseSignoffRows(text, target = EXECUTION_RECORD_BASENAME) {
  const lines = text.split("\n");
  const at = lines.findIndex((line) => line === SIGNOFF_HEADING);
  if (at === -1) malformed(target, `no \`${SIGNOFF_HEADING}\` heading`);

  const tableAt = lines.findIndex((line, index) => index > at && line.startsWith("|"));
  if (tableAt === -1) malformed(target, `the \`${SIGNOFF_HEADING}\` block carries no table`);
  if (lines[tableAt] !== SIGNOFF_HEADER) {
    malformed(target, `the table header row is \`${lines[tableAt]}\`, not the frozen \`${SIGNOFF_HEADER}\``);
  }
  if (lines[tableAt + 1] !== SIGNOFF_DIVIDER) {
    malformed(target, `the header separator is \`${lines[tableAt + 1] ?? ""}\`, not the frozen \`${SIGNOFF_DIVIDER}\``);
  }

  const rows = [];
  for (let index = tableAt + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("|")) break;
    const parts = cells(line);
    if (parts.length !== 4) {
      malformed(target, `row ${rows.length + 1} carries ${parts.length} cells, not the frozen 4 (\`${line}\`)`);
    }
    const [loop, signer, date, verdict] = parts;
    // THE ID STANDS ALONE IN THE FIRST CELL (m66's positional rule). A first cell carrying the id
    // followed by prose declares nothing, so it is refused here rather than half-read: a row whose
    // subject is ambiguous cannot be matched to an engagement, and a signature that cannot be
    // matched is a signature about to be lost.
    if (isFilled(loop) && /\s/.test(loop)) {
      malformed(target, `row ${rows.length + 1}'s first cell carries more than the loop id (\`${loop}\`)`);
    }
    rows.push({ loop, signer, date, verdict, line });
  }
  return rows;
}

// ------------------------------------------------------------ the compose ----

const placeholderRow = (loop) =>
  `| ${loop} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} |`;

/**
 * The sign-off block for one model, with every signed row of the previous document carried forward.
 *
 * THE MATCH IS BY LOOP ID AND ORDINAL, not by row position. One row per engagement, in the model's
 * own engagement order — so the nth engagement of `loop:x` inherits the nth previous SIGNED row
 * whose first cell is `loop:x`. Position alone would re-attach a signature to a different
 * engagement the moment one appeared earlier in the order; the loop id alone cannot tell two
 * engagements of the same loop apart, and the first cell may hold nothing but the id.
 *
 * AN ORPHANED SIGNED ROW IS KEPT (ADR-002). An UNSIGNED row for an engagement that no longer exists
 * is re-derived away — it carried no human judgement. A SIGNED one is a human's recorded answer
 * about work that was really done, and a run record can genuinely leave the item (`pruneRun`), so
 * dropping it would be this writer destroying the one thing it exists to protect. Orphans are
 * appended after the derived rows in a code-unit sort, which keeps the bytes deterministic.
 */
export function composeSignoffBlock({ model, previous = [], ref } = {}) {
  const available = new Map();
  for (const row of previous) {
    if (!available.has(row.loop)) available.set(row.loop, []);
    available.get(row.loop).push(row);
  }
  const taken = new Set();
  const rows = [];

  for (const engagement of model.engagements) {
    // THE FIRST CELL IS THE LOOP ID, AND THERE IS NO FALLBACK TEXT — refused, not invented. The
    // projection cannot produce an engagement without one (`declarationOf` admits a declaration only
    // when both `loopRunId` and `id` are non-empty), so this is an invariant guard rather than a
    // branch. It is a LOUD refusal because the tempting fallback — a parenthetical like
    // "(no loop declared)" — carries spaces, and m66's positional rule means a first cell with
    // anything but the id declares nothing: the writer would emit a document its own parser then
    // refuses, so the NEXT regeneration would fail on a file this one wrote.
    const loop = engagement.loop;
    if (typeof loop !== "string" || loop === "" || /\s/.test(loop)) {
      const error = commandError(
        `The execution model produced an engagement (\`${engagement.loopRunId}\`) with no usable loop id, `
          + "so no sign-off row can name it. This is a projection invariant, not an input error.",
        "loop-record-engagement-unnamed",
        500,
      );
      error.detail = { loopRunId: engagement.loopRunId ?? null, loop: loop ?? null };
      throw error;
    }
    const candidates = available.get(loop) ?? [];
    const inherited = candidates.find((row) => !taken.has(row) && isSignedRow(row)) ?? null;
    if (inherited) taken.add(inherited);
    // A carried row goes back VERBATIM — its own line, cell for cell, name, date and verdict
    // included. Re-rendering it from parsed cells would normalise a human's spacing, which is a
    // byte change to a line this writer promised not to touch.
    rows.push(inherited ? inherited.line : placeholderRow(loop));
  }

  const orphans = previous
    .filter((row) => isSignedRow(row) && !taken.has(row))
    .map((row) => row.line)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

  return {
    text: [
      SIGNOFF_HEADING,
      "",
      ...signoffProse(ref),
      "",
      SIGNOFF_HEADER,
      SIGNOFF_DIVIDER,
      ...rows,
      ...orphans,
      "",
    ].join("\n"),
    carried: taken.size + orphans.length,
  };
}

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

export const loopRecordCommand = {
  id: "work:loop-record",

  // NO CALLER-SUPPLIED OUTPUT PATH, and `additionalProperties: false` makes that a refusal rather
  // than a convention: the record's home is the item's own folder and there is exactly one of it
  // (ADR-001), which is what lets the write scope be asserted at all.
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      write: { type: "boolean" },
    },
    required: ["ref"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    if (ref === "") throw commandError("A work ref is required.", "missing-ref", 400);

    // EXACT-REF RESOLUTION ON BOTH FACES, not just the writer. The read is not the usual
    // slug-tolerant kind: it answers from the item's own `runs/` directory, so a row this checkout
    // does not hold has nothing to project, and the local-checkout refusal is the honest answer
    // rather than an empty model that would read as "no loop ran here".
    const item = await resolveItemExact(ctx, ref);
    if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);
    requireLocalCheckout(item, ref);

    const registry = await loadLoops(ctx.workspace);
    const runs = await readRuns(item);
    const model = projectExecution({ registry, runs, config: ctx.workspace.config });

    const target = path.join(item.dir, EXECUTION_RECORD_BASENAME);
    let existing = null;
    try {
      existing = await readFile(target, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    // THE READ-BACK HAPPENS ON BOTH FACES, so the emitted `text` is byte-for-byte what `--write`
    // would put on disk — a read face that composed different bytes from the writer would make the
    // bare verb useless for reviewing a regeneration before taking it.
    const previous = existing === null ? [] : parseSignoffRows(existing, displayPath(target));
    const signoff = composeSignoffBlock({ model, previous, ref: item.ref });
    const text = `${renderExecutionDocument({ model, registry, ref: item.ref })}${signoff.text}`;

    const write = input?.write === true;
    // `writeText` is the ONE door, and it is atomic by construction (temp + rename, the temp
    // reclaimed on the failure path — m42/F26). A write that cannot complete leaves the previous
    // document with its previous bytes, which for a document holding a signature is the difference
    // between a failed regeneration and a lost one.
    if (write) await writeText(target, text);

    return {
      ref: item.ref,
      path: target,
      written: write,
      existed: existing !== null,
      changed: existing !== text,
      signedCarried: signoff.carried,
      coverage: model.coverage,
      engagements: model.engagements,
      gaps: model.gaps,
      text,
    };
  },

  cli: {
    route: ["work", "loop-record"],
    spec: {
      usage: "aof work loop-record <ref> [--write] [--json]",
      flags: {
        write: {
          type: "boolean",
          description:
            "write EXECUTION.md into the item's own folder (the bare verb emits it and touches no disk)",
        },
      },
    },

    argv: (positionals, options = {}) => ({
      ref: positionals[0],
      ...(options.write === true ? { write: true } : {}),
    }),

    render(result) {
      if (!result.written) return result.text;
      const state = result.changed ? (result.existed ? "Updated" : "Wrote") : "Unchanged";
      const { runsFound, runsCarryingDeclaration } = result.coverage;
      return `${state} ${displayPath(result.path)} — ${result.engagements.length} engagement(s) from `
        + `${runsCarryingDeclaration}/${runsFound} run(s) carrying a loop declaration, `
        + `${result.signedCarried} signed row(s) carried forward.`;
    },

    json: (result) => ({ ...result, path: displayPath(result.path), regenerate: regenerateCommand(result.ref) }),
  },
};
