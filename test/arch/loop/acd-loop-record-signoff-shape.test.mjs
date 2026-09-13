// FF-7809 (78/ADR-001, m66/ADR-001) — THE SIGN-OFF BLOCK IS FROZEN: the `h2`, the table header row,
// and the id ALONE in the first cell.
//
// WHY A FREEZE IS THE RIGHT INSTRUMENT HERE. Milestone 66 measured what happens without one: across
// this repository's own registers, `F-NN` ids are written four different ways and 40 of 47
// `ARCHITECTURE.md` fitness registers carry no id at all. A shape that is merely conventional drifts,
// and a drifted sign-off row is a human signature that no check can find.
//
// THE THREE COPIES, AND WHY THEY ARE THREE. The literals live in the WRITER
// (`src/commands/loop-record.mjs`, 78/02) because that is what emits them; in the CHECKER
// (`src/work/doctor-loop-record.mjs`, 78/03) because an instrument that imported the writer's opinion
// of the shape could never report the writer changing it — and because 52/FF-5202 forbids a
// `work-doctor*` module from dragging the registry loader and the filesystem into its import closure,
// which importing the writer would do. This gate holds a THIRD, independent copy and asserts all
// three byte-equal. Three readers agreeing is a frozen shape; one reader importing another is a shape
// with no freeze at all.
//
// AND THE FREEZE IS ROUND-TRIPPED, not merely compared: the shape the writer emits is read back by
// the checker's own parser, so the two agree about a real document and not only about four strings.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";

import * as writer from "../../../src/commands/loop-record.mjs";
import * as checker from "../../../src/work/doctor-loop-record.mjs";
import { ITEM_REF, ctxFor, signInPlace, signedRow, withRepo } from "../../loop/loop-record-command.test.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// THE THIRD COPY — authored here, deliberately, and never derived from either module. A gate that
// read its expectation out of one of its subjects would be green whenever that subject was edited.
const FROZEN = Object.freeze({
  basename: "EXECUTION.md",
  heading: "## Sign-off",
  header: "| loop | signer | date | verdict |",
  divider: "|---|---|---|---|",
  placeholder: "—",
});

// The declaration grammar m66/ADR-001 §2 froze, restated for the one anchor this block uses: a table
// row whose FIRST cell is the id, with nothing before it but the structural prefix.
const DECLARATION = /^\|[ \t]*\*{0,2}(loop:[A-Za-z0-9._-]+)\*{0,2}[ \t]*\|/;

export const archTests = [
  {
    name: "arch/78/02+03 FF-7809 the writer, the checker and this gate agree on the frozen shape, byte for byte",
    run: () => {
      const pairs = [
        ["heading", writer.SIGNOFF_HEADING, checker.SIGNOFF_HEADING, FROZEN.heading],
        ["header", writer.SIGNOFF_HEADER, checker.SIGNOFF_HEADER, FROZEN.header],
        ["divider", writer.SIGNOFF_DIVIDER, checker.SIGNOFF_DIVIDER, FROZEN.divider],
        ["placeholder", writer.SIGNOFF_PLACEHOLDER, checker.SIGNOFF_PLACEHOLDER, FROZEN.placeholder],
        ["basename", writer.EXECUTION_RECORD_BASENAME, checker.EXECUTION_RECORD_BASENAME, FROZEN.basename],
      ];
      for (const [what, fromWriter, fromChecker, frozen] of pairs) {
        assert.equal(fromWriter, frozen, `the writer's ${what} is the frozen literal`);
        assert.equal(fromChecker, frozen, `the checker's ${what} is the frozen literal`);
      }
      // The header is FOUR columns and the divider matches it. A five-column header with a
      // four-column divider is a table markdown renders wrong and a parser reads loosely.
      assert.equal(FROZEN.header.split("|").length, FROZEN.divider.split("|").length, "the header and its separator have the same column count");
      assert.deepEqual(
        FROZEN.header.slice(1, -1).split("|").map((cell) => cell.trim()),
        ["loop", "signer", "date", "verdict"],
        "the columns are the id, the signer, the date and the verdict — the four cells a whole signature needs",
      );
    },
  },
  {
    name: "arch/78/02+03 FF-7809 the block the writer emits is read back by the checker's own parser",
    run: async () => {
      await withRepo({}, async (repo) => {
        const rendered = (await writer.loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo))).text;

        // ROUND TRIP: the checker parses what the writer wrote, and finds the rows the writer put
        // there. A shape agreement over four strings that failed here would mean the two modules
        // agree about the literals and disagree about the document.
        const read = checker.readSignoff(rendered);
        assert.equal(read.ok, true, `the checker reads the writer's block: ${read.reason ?? ""}`);
        assert.deepEqual(read.rows.map((row) => row.loop), ["loop:build-to-green", "loop:review-fix"]);
        for (const row of read.rows) assert.equal(checker.isSignedRow(row), false, "a freshly written row is unsigned");

        // …and the two modules agree about SIGNEDNESS, not only about parsing: the writer carries
        // forward exactly the rows the checker calls signed.
        await writeFile(repo.recordPath, signInPlace(rendered, "loop:build-to-green"), "utf8");
        const regenerated = await writer.loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo));
        const after = checker.readSignoff(regenerated.text);
        assert.equal(after.rows.filter((row) => checker.isSignedRow(row)).length, regenerated.signedCarried,
          "the checker's signed count is the writer's carried count — one rule, two readers");
      });
    },
  },
  {
    name: "arch/78/02+03 FF-7809 the id stands ALONE in the first cell, and a cell carrying prose declares nothing",
    run: async () => {
      await withRepo({}, async (repo) => {
        const rendered = (await writer.loopRecordCommand.run({ ref: ITEM_REF }, await ctxFor(repo))).text;
        const lines = rendered.split("\n");
        const rows = lines.slice(lines.indexOf(FROZEN.divider) + 1).filter((line) => line.startsWith("|"));
        assert.ok(rows.length > 0, "the block is non-vacuous");
        for (const row of rows) {
          // The POSITIONAL rule, asserted against the declaration grammar rather than against the
          // writer's formatting: the first cell matches an id and nothing else.
          const match = DECLARATION.exec(row);
          assert.ok(match, `the row's first cell is a declaration: ${row}`);
          // The cell is taken by SPLITTING on the table's own delimiter, never by cutting to the next
          // `|` — the id must be the whole cell, and `split` is what says so without measuring an
          // offset (F-47-04-ARCH-2's species, which the fitness-function sweep flags on sight).
          const [first] = row.split("|").slice(1).map((cell) => cell.trim());
          assert.equal(match[1], first, `and the id is the WHOLE first cell: ${row}`);
        }
      });

      // BOTH readers refuse a first cell carrying more than the id — the writer so it never emits
      // one, the checker so it never reads one loosely. A rule enforced on one side only is a rule
      // the other side breaks.
      const loose = `| loop:a (the build loop) | Umami | 2026-09-03 | accepted |`;
      const document = ["# f", "", FROZEN.heading, "", FROZEN.header, FROZEN.divider, loose, ""].join("\n");
      assert.equal(checker.readSignoff(document).ok, false, "the checker refuses it");
      assert.throws(() => writer.parseSignoffRows(document), (error) => {
        assert.equal(error.code, "loop-record-malformed", "and so does the writer");
        return true;
      });
    },
  },
  {
    name: "arch/78/02+03 FF-7809 the block is not a register block, and this milestone declares no new id form",
    run: async () => {
      // `REGISTER_BLOCKS` (`src/declared-id.mjs`) is a four-entry list over three files, and
      // 78/ADR-001 answered the "invisible to every register check" objection BY SCOPE rather than by
      // widening it: adding `EXECUTION.md` would make every item owe the document, and only items that
      // ran loops owe one. So the frozen set must be untouched, and this gate is where that is held.
      const { REGISTER_BLOCKS, ID_FORMS } = await import("../../../src/declared-id.mjs");
      assert.ok(!REGISTER_BLOCKS.some((entry) => entry.file === FROZEN.basename), "EXECUTION.md is not a register file");
      assert.ok(!REGISTER_BLOCKS.some((entry) => entry.heading === "sign-off"), "and `## Sign-off` is not a register block");
      assert.equal(REGISTER_BLOCKS.length, 4, "the frozen set is still the four entries m66 froze");

      // AND NO NEW ID FORM. The first cell holds a `loop:` endpoint — the grammar the registry
      // already uses — precisely so `ID_FORMS` stays closed (m66/ADR-008 extends it by ADR alone).
      const forms = Array.isArray(ID_FORMS) ? ID_FORMS : [...ID_FORMS];
      assert.ok(!forms.some((form) => String(form).toLowerCase().includes("loop")), "no `loop` id form was added to the closed set");
      assert.equal(forms.length, 5, "ID_FORMS is still the five members m66 pinned");
    },
  },
  {
    name: "arch/78/02+03 FF-7809 the checker holds its own copy and imports neither the writer nor the registry family",
    run: async () => {
      const source = stripComments(await readFile(path.join(repoRoot, "src/work/doctor-loop-record.mjs"), "utf8"));

      // THE INDEPENDENCE IS STRUCTURAL, not a comment: the checker imports `node:path` and nothing
      // else. An import of the writer would put the writer's opinion of the shape into the instrument
      // that checks it, AND drag `run-store`, `work-loops` and `fs` into the import closure of a lane
      // whose contract is that it is a pure function of a snapshot.
      const imports = importSpecifiers(source).map((entry) => entry.specifier);
      assert.deepEqual(imports, ["node:path"], "the checker's direct imports are exactly node:path");
      for (const forbidden of [/\bnode:fs\b/, /\bnode:os\b/, /\bnode:child_process\b/, /\bnew Date\b/, /\bDate\.now\b/, /\bprocess\.env\b/, /\bpath\.resolve\b/]) {
        assert.doesNotMatch(source, forbidden, `the checker reaches no ${forbidden}`);
      }
      // 52/FF-5202's own sweep covers this file too (it matches `^work-doctor.*\.mjs$`); asserted here
      // for THIS story, so a registry reference added by this milestone reds against this milestone.
      assert.doesNotMatch(source, /work-loops|loops-show|loops-graph|loops-groundedness|loops-validate|work:loops-/, "and it names the loop registry family nowhere");
    },
  },
];
