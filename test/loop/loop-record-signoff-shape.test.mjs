// Traceability wiring for milestone 78 / story 03, task `00_the-frozen-signoff-block`.
//
// Covers EVERY @executable scenario in
//   wiki/work/78_milestone_loop-execution-record/stories/03_story_signature-and-the-doctor-lane/tasks/00_the-frozen-signoff-block.feature
//
// MILESTONE 66'S LAW, APPLIED. A frozen `h2`, a frozen table header row, and the id ALONE in the
// first cell — the positional rule that separates a DECLARATION from a mention. A signature written
// as prose in a paragraph is not checkable and will drift, which is why `SPEC.md` asks for this
// shape by name.
//
// TWO SIDES OF ONE SHAPE, AND BOTH ARE EXERCISED HERE. `readSignoff`
// (`src/work/doctor-loop-record.mjs`) is the CHECKER's reader; the WRITER
// (`src/commands/loop-record.mjs`, 78/02) is what produces the rows in the first place. A test that
// only exercised the reader would freeze a shape nothing writes; one that only exercised the writer
// would freeze a shape nothing checks. So the rows the reader judges are, wherever the scenario is
// about a real record, the ones the writer actually wrote — through 78/02's own fixture, rather than
// a hand-typed table that could differ from the bytes that ship.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import {
  SIGNOFF_DIVIDER,
  SIGNOFF_HEADER,
  SIGNOFF_HEADING,
  SIGNOFF_PLACEHOLDER,
  isSignedRow,
  readSignoff,
} from "../../src/work/doctor-loop-record.mjs";
import { loopRecordCommand } from "../../src/commands/loop-record.mjs";
import { BARE_RUNS, ITEM_REF, ctxFor, signInPlace, signedRow, withRepo } from "./loop-record-command.test.mjs";

const write = async (repo) => await loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo));

// A document carrying only the sign-off block, built from the frozen literals themselves — so a
// change to the shape reaches these entries instead of leaving them asserting against a stale copy.
const documentWith = (...rows) =>
  ["# fixture", "", SIGNOFF_HEADING, "", SIGNOFF_HEADER, SIGNOFF_DIVIDER, ...rows, ""].join("\n");

const cell = (value) => (value === "" ? "" : value);

export const loopRecordSignoffShapeTests = [
  {
    name: "loop-record-signoff/00 the block's heading and header row are frozen",
    async run() {
      await withRepo({}, async (repo) => {
        // A REAL rendered record — the shape is asserted against what the writer emits, not against
        // a table typed here that could differ from the bytes that ship.
        const rendered = (await write(repo)).text;
        const lines = rendered.split("\n");
        const at = lines.indexOf(SIGNOFF_HEADING);
        assert.notEqual(at, -1, "it carries the sign-off block under its frozen h2");
        const tableAt = lines.findIndex((line, index) => index > at && line.startsWith("|"));
        assert.equal(lines[tableAt], SIGNOFF_HEADER, "the block's table header row is the frozen literal");
        assert.equal(lines[tableAt + 1], SIGNOFF_DIVIDER, "and so is its separator");
        assert.equal(readSignoff(rendered).ok, true, "so the checker reads it");
      });

      // AND A DOCUMENT WHOSE HEADING OR HEADER ROW DIFFERS IS REPORTED AS MALFORMED RATHER THAN READ
      // LOOSELY. Each row is a real hand-edit shape; each must be refused with a reason, because
      // "we could not read it" and "nobody has signed it" are two different facts about an item.
      const rows = [
        ["a different heading", documentWith(signedRow("loop:a")).replace(SIGNOFF_HEADING, "## Signoff"), /no `## Sign-off` heading/],
        ["a different header row", documentWith(signedRow("loop:a")).replace(SIGNOFF_HEADER, "| loop | who | when | verdict |"), /table header row/],
        ["a different separator", documentWith(signedRow("loop:a")).replace(SIGNOFF_DIVIDER, "| --- | --- | --- | --- |"), /header separator/],
        ["no table at all", ["# fixture", "", SIGNOFF_HEADING, "", "Signed by me.", ""].join("\n"), /carries no table/],
        ["a three-cell row", documentWith("| loop:a | Umami | accepted |"), /carries 3 cells/],
      ];
      for (const [what, text, reason] of rows) {
        const read = readSignoff(text);
        assert.equal(read.ok, false, `${what}: reported as malformed`);
        assert.match(read.reason, reason, `${what}: and the reason names what could not be read`);
      }
    },
  },
  {
    name: "loop-record-signoff/00 the id stands alone in the first cell",
    async run() {
      const read = readSignoff(documentWith(signedRow("loop:build-to-green")));
      assert.equal(read.ok, true);
      assert.equal(read.rows[0].loop, "loop:build-to-green", "its first cell carries the loop id and nothing else");

      // A FIRST CELL CARRYING THE ID FOLLOWED BY PROSE DECLARES NOTHING (m66/ADR-001 §2), so it is
      // refused rather than half-read — a row whose subject is ambiguous cannot be matched to an
      // engagement, and an unmatched row is a signature nobody can find.
      for (const first of ["loop:build-to-green (the build loop)", "**loop:build-to-green**  x", "the loop:build-to-green loop"]) {
        const loose = readSignoff(documentWith(`| ${first} | Umami | 2026-09-03 | accepted |`));
        assert.equal(loose.ok, false, `\`${first}\` declares nothing`);
        assert.match(loose.reason, /first cell carries more than the loop id/);
      }

      // THE ID IS A LOOP ID in the registry's own endpoint grammar — this milestone introduces no
      // new id form (`src/declared-id.mjs`'s set is closed and extended by ADR alone, m66/ADR-008).
      await withRepo({}, async (repo) => {
        for (const row of readSignoff((await write(repo)).text).rows) {
          assert.match(row.loop, /^loop:[A-Za-z0-9-]+$/, `${row.loop} is a loop: endpoint, not a new id form`);
        }
      });
    },
  },
  {
    name: "loop-record-signoff/00 a row is signed only when it is complete",
    run() {
      // The signed/unsigned boundary, row by row — the outline's own six rows. The writer's decision
      // about what to preserve rests entirely on this answer, so it is asserted per row rather than
      // in aggregate.
      const rows = [
        { signer: "Umami", date: "2026-09-03", verdict: "accepted", state: "signed" },
        { signer: "Umami", date: "2026-09-03", verdict: "rejected", state: "signed" },
        { signer: "Umami", date: "2026-09-03", verdict: "", state: "unsigned" },
        { signer: "Umami", date: "", verdict: "accepted", state: "unsigned" },
        { signer: "", date: "", verdict: "", state: "unsigned" },
        { signer: SIGNOFF_PLACEHOLDER, date: SIGNOFF_PLACEHOLDER, verdict: SIGNOFF_PLACEHOLDER, state: "unsigned" },
      ];
      for (const row of rows) {
        const line = `| loop:one | ${cell(row.signer)} | ${cell(row.date)} | ${cell(row.verdict)} |`;
        const read = readSignoff(documentWith(line));
        assert.equal(read.ok, true, `${line} is a well-shaped row`);
        assert.equal(
          isSignedRow(read.rows[0]) ? "signed" : "unsigned",
          row.state,
          `${line} is treated as ${row.state}`,
        );
      }
    },
  },
  {
    name: "loop-record-signoff/00 an untouched placeholder row is unsigned, not signed",
    async run() {
      await withRepo({}, async (repo) => {
        // A FRESHLY WRITTEN RECORD, whose rows are the writer's own placeholders. This is the case
        // every record starts in, so a reader that mistook a placeholder for a signature would report
        // the whole stream signed on the day the writer shipped.
        const read = readSignoff((await write(repo)).text);
        assert.equal(read.ok, true);
        assert.equal(read.rows.length, 2, "the fresh record's rows are non-vacuous");
        for (const row of read.rows) {
          assert.equal(row.signer, SIGNOFF_PLACEHOLDER, "the row is a placeholder");
          assert.equal(isSignedRow(row), false, "and it is unsigned");
        }
      });
    },
  },
  {
    name: "loop-record-signoff/00 one row per engagement, each naming its own loop",
    async run() {
      await withRepo({}, async (repo) => {
        // The fixture's runs project TWO engagements, of two different loops.
        const result = await write(repo);
        assert.equal(result.engagements.length, 2, "the model reports two engagements");
        const read = readSignoff(result.text);
        assert.equal(read.rows.length, 2, "the sign-off block carries one row for each");
        assert.deepEqual(
          read.rows.map((row) => row.loop),
          result.engagements.map((engagement) => engagement.loop),
          "and each row's first cell names the loop of its engagement, in the model's own order",
        );
      });
    },
  },
  {
    name: "loop-record-signoff/00 a rejected verdict is a signature, not an absence",
    async run() {
      await withRepo({}, async (repo) => {
        const rendered = (await write(repo)).text;
        const rejected = signedRow("loop:review-fix", "Umami", "2026-09-03", "rejected");
        await writeFile(repo.recordPath, signInPlace(rendered, "loop:review-fix", rejected), "utf8");

        const read = readSignoff(await readFile(repo.recordPath, "utf8"));
        const row = read.rows.find((entry) => entry.loop === "loop:review-fix");
        assert.equal(isSignedRow(row), true, "the row is signed");
        assert.equal(row.verdict, "rejected", "and it is distinguishable from an accepted row");

        // …and the writer keeps it, because a refusal is the more interesting half of a human's
        // answer and a regeneration that dropped it would lose exactly that.
        const regenerated = await write(repo);
        assert.equal(regenerated.signedCarried, 1);
        assert.ok(regenerated.text.includes(rejected), "carried forward verbatim");
      });
    },
  },
  {
    name: "loop-record-signoff/00 the block survives a document with no engagements",
    async run() {
      await withRepo({ runs: BARE_RUNS }, async (repo) => {
        // Runs that carry no loop declaration ⇒ no engagements. The block is still present with its
        // frozen heading and header, and carries no rows: an absent block would leave a human nowhere
        // to sign once a loop does run, and a fabricated row would name an engagement that never was.
        const result = await write(repo);
        assert.deepEqual(result.engagements, [], "the model reports no engagements");
        const read = readSignoff(result.text);
        assert.equal(read.ok, true, "the sign-off block is present with its frozen heading and header");
        assert.deepEqual(read.rows, [], "and it carries no rows");
        assert.ok(result.text.includes(`${SIGNOFF_HEADER}\n${SIGNOFF_DIVIDER}`), "header and separator, adjacent and frozen");
      });
    },
  },
];
