// FF-7804 (78/ADR-002) — A SIGNED SIGN-OFF ROW SURVIVES REGENERATION VERBATIM; EVERY OTHER LINE IS
// RE-DERIVED.
//
// The one part of this document that no input can regenerate is the human signature, so the writer
// is a READ-MODIFY-WRITE rather than a truncate-and-emit. The obligation cuts both ways and both
// halves are load-bearing:
//
//   PRESERVED — a regeneration that destroyed a signature would be a regeneration nobody runs
//   twice, which is the same as not having a writer at all. And it must survive the interesting
//   case, not merely the trivial one: a signature over facts that have SINCE CHANGED is exactly the
//   case a naive implementation loses, because that is the run where the derived half genuinely has
//   to be rebuilt.
//
//   RE-DERIVED — everything else. A writer that "preserved the signature" by leaving the whole file
//   alone would satisfy the first half perfectly and be useless, so every entry below asserts the
//   complement in the same breath.
//
// WHAT COUNTS AS SIGNED is a whole row — an id, a signer, a date and a verdict — and the boundary is
// asserted row by row, because the writer's decision about what to preserve rests entirely on it. A
// freshly written record's placeholder rows are the case that must NOT be mistaken for signatures:
// every record starts out full of them.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

import {
  SIGNOFF_DIVIDER,
  SIGNOFF_HEADER,
  SIGNOFF_HEADING,
  SIGNOFF_PLACEHOLDER,
  composeSignoffBlock,
  loopRecordCommand,
  parseSignoffRows,
} from "../../../src/commands/loop-record.mjs";
import {
  ENGAGED_RUNS,
  ITEM_REF,
  ctxFor,
  declaration,
  runRecord,
  seedRuns,
  signInPlace,
  signedRow,
  signoffRowsOf as rowsOf,
  withRepo,
} from "../../loop/loop-record-command.test.mjs";

const write = async (repo) => await loopRecordCommand.run({ ref: ITEM_REF, write: true }, await ctxFor(repo));

// A model shaped by hand, so the signed/unsigned boundary can be asserted without standing up a
// workspace for each row of the table.
const modelOf = (...loops) => ({ engagements: loops.map((loop, index) => ({ loop, loopRunId: `lr-${index}` })) });

export const archTests = [
  {
    name: "arch/78/02 FF-7804 a signed row survives regeneration verbatim, and every other line is re-derived",
    run: async () => {
      await withRepo({}, async (repo) => {
        const derived = (await write(repo)).text;
        // The operator's own hand-edit, with their own spacing and their own date format. A writer
        // that re-rendered from parsed cells would normalise this — a byte change to the one line it
        // promised not to touch.
        const row = "|  loop:review-fix  |  U. Butt  |  3 Sep 2026  |  rejected  |";
        await writeFile(repo.recordPath, signInPlace(derived, "loop:review-fix", row), "utf8");

        const regenerated = (await write(repo)).text;
        assert.ok(rowsOf(regenerated).includes(row), `carried forward byte-identically: ${JSON.stringify(rowsOf(regenerated))}`);

        // THE COMPLEMENT: the whole document differs from the derived one in exactly that one line.
        // A writer that left the file alone would fail this; so would one that carried the row and
        // stopped re-deriving the facts.
        const from = derived.split("\n");
        const to = regenerated.split("\n");
        assert.equal(to.length, from.length);
        assert.deepEqual(to.filter((line, index) => line !== from[index]), [row], "every other line is re-derived");
      });
    },
  },
  {
    name: "arch/78/02 FF-7804 a signature survives even when the facts it signed have changed",
    run: async () => {
      await withRepo({}, async (repo) => {
        await writeFile(repo.recordPath, signInPlace((await write(repo)).text, "loop:build-to-green"), "utf8");

        // The engagement gains a cycle AFTER it was signed — the case a naive writer loses, because
        // this is the run where the derived half genuinely has to be rebuilt.
        await seedRuns(repo, [
          ...ENGAGED_RUNS,
          runRecord({ runId: "lr-a-0003", createdAt: "2026-09-01T00:03:00.000Z", loop: declaration({ id: "loop:build-to-green", loopRunId: "lr-a", cycle: 4 }) }),
        ]);
        const regenerated = await write(repo);

        assert.ok(rowsOf(regenerated.text).includes(signedRow("loop:build-to-green")), "the signed row is still carried forward verbatim");
        assert.match(regenerated.text, /^- \*\*loop:build-to-green\*\* \(`lr-a`\) — 4 cycles/m, "and the facts above it show the new cycle count");
        assert.equal(regenerated.signedCarried, 1, "and the writer reports what it carried");
      });
    },
  },
  {
    name: "arch/78/02 FF-7804 a row is signed only when it is complete, and a placeholder is never a signature",
    run: async () => {
      const model = modelOf("loop:one");
      // The signed/unsigned boundary, row by row. The last row is the one every freshly written
      // record is full of: an untouched placeholder must be UNSIGNED, or the first regeneration
      // after a write would treat the machine's own placeholders as human judgements.
      const rows = [
        { signer: "Umami", date: "2026-09-03", verdict: "accepted", signed: true },
        { signer: "Umami", date: "2026-09-03", verdict: "rejected", signed: true },
        { signer: "Umami", date: "2026-09-03", verdict: "", signed: false },
        { signer: "Umami", date: "", verdict: "accepted", signed: false },
        { signer: "", date: "", verdict: "", signed: false },
        { signer: SIGNOFF_PLACEHOLDER, date: SIGNOFF_PLACEHOLDER, verdict: SIGNOFF_PLACEHOLDER, signed: false },
      ];
      for (const row of rows) {
        const line = `| loop:one | ${row.signer} | ${row.date} | ${row.verdict} |`;
        const previous = [{ loop: "loop:one", signer: row.signer, date: row.date, verdict: row.verdict, line }];
        const block = composeSignoffBlock({ model, previous });
        assert.equal(block.carried, row.signed ? 1 : 0, `${line} is ${row.signed ? "signed" : "unsigned"}`);
        assert.equal(
          rowsOf(block.text)[0],
          row.signed ? line : `| loop:one | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} |`,
          `${line}: ${row.signed ? "carried forward" : "re-derived"}`,
        );
      }

      // A rejected verdict is a SIGNATURE and stays DISTINGUISHABLE from an accepted one — the
      // reason the parse keeps the verdict cell rather than reducing the row to a boolean.
      const accepted = rowsOf(composeSignoffBlock({ model, previous: parseSignoffRows(blockWith(signedRow("loop:one"))) }).text)[0];
      const rejected = rowsOf(composeSignoffBlock({ model, previous: parseSignoffRows(blockWith(signedRow("loop:one", "Umami", "2026-09-03", "rejected"))) }).text)[0];
      assert.notEqual(rejected, accepted, "a rejected row is not an accepted row");
      assert.match(rejected, /rejected/);
    },
  },
  {
    name: "arch/78/02 FF-7804 an unsigned row for a vanished engagement is re-derived away; a SIGNED one is kept",
    run: async () => {
      await withRepo({}, async (repo) => {
        const derived = (await write(repo)).text;
        await writeFile(repo.recordPath, signInPlace(derived, "loop:build-to-green"), "utf8");

        // Both engagements leave the item (a run record genuinely can — `pruneRun`), so the derived
        // rows are gone and both previous rows are orphans: one signed, one a placeholder.
        await seedRuns(repo, []);
        const regenerated = await write(repo);
        const rows = rowsOf(regenerated.text);

        assert.deepEqual(rows, [signedRow("loop:build-to-green")], "the human's recorded answer is kept; the machine's placeholder is not");
        assert.equal(regenerated.signedCarried, 1);
        assert.match(regenerated.text, /^No loop ran for this item\.$/m, "and the facts honestly report that nothing ran");
      });
    },
  },
  {
    name: "arch/78/02 FF-7804 two engagements of ONE loop get one row each, and a signature stays with its own",
    run: async () => {
      // The case the loop id alone cannot resolve: the first cell may hold nothing but the id
      // (m66's positional rule), so two engagements of one loop produce two rows whose first cells
      // are identical. The match is by id AND ordinal, and a signature on the first must not
      // migrate to the second.
      const model = modelOf("loop:one", "loop:one");
      const signed = signedRow("loop:one");
      const placeholder = `| loop:one | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} | ${SIGNOFF_PLACEHOLDER} |`;
      const block = composeSignoffBlock({ model, previous: parseSignoffRows(blockWith(signed, placeholder)) });
      assert.deepEqual(rowsOf(block.text), [signed, placeholder], "one row per engagement; the signature lands on exactly one of them");
      assert.equal(block.carried, 1, "and it is counted once, not twice");
    },
  },
  {
    name: "arch/78/02 FF-7804 every document the writer produces round-trips through its own parser",
    run: async () => {
      // THE PROPERTY THAT MAKES PRESERVATION POSSIBLE AT ALL, and it is not implied by the entries
      // above: the writer must never emit a document its OWN parser refuses, or the regeneration
      // AFTER this one fails on a file this one wrote — and it fails in the one way that loses a
      // signature. The tempting way to break it is a fallback text in the first cell: m66's
      // positional rule admits the id ALONE, so a parenthetical like "(no loop declared)" would
      // write a row the parser then rejects.
      await withRepo({}, async (repo) => {
        const fresh = (await write(repo)).text;
        assert.doesNotThrow(() => parseSignoffRows(fresh), "a freshly written record parses");
        assert.equal(parseSignoffRows(fresh).length, 2, "and yields one row per engagement");
        for (const row of parseSignoffRows(fresh)) {
          assert.doesNotMatch(row.loop, /\s/, `the first cell is the id ALONE (${row.loop})`);
          assert.match(row.loop, /^loop:/, "and it is a loop id in the registry's own endpoint grammar");
        }

        // …and after a signature, and after the regeneration that carries it.
        await writeFile(repo.recordPath, signInPlace(fresh, "loop:review-fix"), "utf8");
        const carried = (await write(repo)).text;
        assert.equal(parseSignoffRows(carried).filter((row) => row.verdict === "accepted").length, 1, "the carried document parses, signature and all");
      });

      // AND THE GUARD IS LOUD, never a fabricated cell: an engagement the projection could not name
      // is a projection invariant violation, so it refuses rather than writing an unparseable row.
      assert.throws(
        () => composeSignoffBlock({ model: { engagements: [{ loop: null, loopRunId: "lr-x" }] } }),
        (error) => {
          assert.equal(error.code, "loop-record-engagement-unnamed");
          assert.equal(error.detail.loopRunId, "lr-x", "naming the engagement it could not name");
          return true;
        },
      );
    },
  },
  {
    name: "arch/78/02 FF-7804 the writer refuses a document it cannot parse rather than discarding a signature",
    run: async () => {
      await withRepo({}, async (repo) => {
        // The whole preservation guarantee rests on the parse, so the parse's failure mode is part of
        // the fitness function: a loose read is precisely how a signature gets silently dropped.
        // Each row is a real hand-edit shape, and each must REFUSE and leave the file alone.
        const derived = (await write(repo)).text;
        const signed = signInPlace(derived, "loop:build-to-green");
        const broken = [
          ["the frozen heading",     signed.replace(SIGNOFF_HEADING, "## Signoff")],
          ["the frozen header row",  signed.replace(SIGNOFF_HEADER, "| loop | signer | verdict |")],
          ["the header separator",   signed.replace(SIGNOFF_DIVIDER, "| --- | --- | --- | --- |")],
          ["the four-cell row",      signed.replace(signedRow("loop:build-to-green"), "| loop:build-to-green | Umami | accepted |")],
          ["the id alone",           signed.replace(signedRow("loop:build-to-green"), "| loop:build-to-green (the build loop) | Umami | 2026-09-03 | accepted |")],
        ];

        for (const [what, text] of broken) {
          await writeFile(repo.recordPath, text, "utf8");
          await assert.rejects(write(repo), (error) => {
            assert.equal(error.code, "loop-record-malformed", `${what}: a typed refusal`);
            assert.equal(typeof error.detail?.reason, "string", `${what}: naming what could not be parsed`);
            return true;
          }, what);
          assert.equal(await readFile(repo.recordPath, "utf8"), text, `${what}: the existing file is left untouched`);
        }
      });
    },
  },
];

// A minimal document carrying only the sign-off block, for the parse-level entries above. Built from
// the exported literals rather than a string of its own, so a change to the frozen shape reaches
// these entries instead of leaving them asserting against a stale copy of it.
function blockWith(...rows) {
  return ["# fixture", "", SIGNOFF_HEADING, "", SIGNOFF_HEADER, SIGNOFF_DIVIDER, ...rows, ""].join("\n");
}
