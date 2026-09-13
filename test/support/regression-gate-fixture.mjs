// THE REGRESSION GATE'S ROW, FOR SUITES THAT ARE NOT ABOUT IT (96/04, ADR-008).
//
// 96/ADR-008 put a HARD gate on the MILESTONE accept door: without a green whole-tree row in the
// item's own `REGRESSION.md`, `work:status <NN> done` is refused before any predicate the calling
// suite is about ever runs. Several existing suites move a milestone to `done` to assert something
// else entirely — that an unsigned execution record blocks nothing, that an in-budget item passes
// the budget door — and without a seeded row each of them would start failing for a reason it has
// nothing to say about.
//
// ONE HOME, so the seeded document cannot drift from the one the gate writes. It is assembled from
// the record module's own FROZEN literals rather than typed out: a change to the document's shape
// breaks this fixture loudly instead of leaving every caller seeding a document nobody writes.
//
// This is deliberately NOT a way past the gate for the suites that ARE about it —
// `test/run/regression-gate.test.mjs` and the two 96/04 controls drive the real writer.
import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  EMPTY_CELL,
  REGRESSION_DIVIDER,
  REGRESSION_HEADER,
  REGRESSION_HEADING,
  REGRESSION_RECORD_BASENAME,
} from "../../src/regression-record.mjs";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const INSTANT = "2026-09-04T10:00:00Z";

export async function seedGreenRegressionGate(itemDir) {
  await writeFile(
    path.join(itemDir, REGRESSION_RECORD_BASENAME),
    [
      REGRESSION_HEADING,
      "",
      REGRESSION_HEADER,
      REGRESSION_DIVIDER,
      `| ${COMMIT} | ${INSTANT} | all | green | ${EMPTY_CELL} |`,
      "",
    ].join("\n"),
    "utf8",
  );
}
