// Fitness function: acd-debt-ledger-budget —
//
//   "The tech-debt ledger may FALL and may never RISE. A debt entry is a decision an operator
//    schedules from, not a place to write the investigation down."
//
// WHY, MEASURED RATHER THAN FELT. `wiki/work/TECH_DEBT.md` over six weeks:
//
//   date          lines    entries   avg/entry
//   2026-07-26      289          7          41
//   2026-08-13    1,805         ~35          51
//   2026-09-05    4,836         91          53
//
// A 16x growth, ~110 lines/day, of which only 9 entries carried any closure status at all and 34
// carried no status line whatsoever. This tree ratchets file size, flat-sibling counts and silent
// catches; the one file that INDICTS unbounded growth — items 63, 66, 78, 79, 83, 84 and 86 are
// all "X grows by a block per milestone with nothing bounding it" — was itself governed by
// nothing. This gate is that omission closed, and it deliberately holds the ledger to the rule the
// ledger holds everything else to.
//
// THE GATE IS SHRINK-ONLY, WHICH IS THE ONLY HONEST SHAPE HERE. An absolute per-entry cap would be
// red on 91 grandfathered entries from the day it landed, and item 27 is this tree's own measured
// account of what a gate that is red on a clean tree is worth: ten suites were RED at HEAD with
// nothing anywhere saying so. So the budget RECORDS where the ledger is and forbids growth. Both
// numbers may be re-stamped DOWNWARD freely as compaction lands — that is the gate working, and it
// is the only edit to `DEBT_BUDGET` that does not need an ADR.
//
// WHAT MAKES A NEW ENTRY BIND. Every one of the 91 grandfathered entries is already over the
// 12-line budget, so `maxOversizeEntries` sits at the entry count. That is not a slack gate: a
// NEW entry written over budget takes the count past its ceiling and reds, while a new entry
// written WITHIN budget does not. The cap therefore binds on new writing without demanding a
// rewrite of the old — and every compaction of an existing entry buys headroom back.
//
// AND UNLIKE `acd-ui-surface-file-budget`, DELETING EXPLANATION IS THE FIX HERE. ADR-014/E3's
// warning — "a line ceiling is a proxy for structural cost, and deleting rationale to fit under it
// RAISES the real cost" — is about rationale at its load-bearing site. A debt entry's forensics
// are not at their site: they belong in the reviewing item's own ARCHITECTURE.md / VERIFICATION.md
// register, which is immutable, dated and already written. Moving prose there is the outcome this
// gate exists to produce, not an evasion of it.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEBT_BUDGET, DEBT_LEDGER_BASENAME, evaluateDebtLedger, parseDebtLedger } from "../../../src/work/debt.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LEDGER = path.join(repoRoot, "wiki", "work", DEBT_LEDGER_BASENAME);

// The gate measures with the SAME module the CLI face does. A gate that re-implements the
// measurement is a second home for the number, which is the species this whole ledger is full of.
async function measure() {
  let text = null;
  try {
    text = await readFile(LEDGER, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  // A repository that has never accrued a ledger is the healthy state, not a failure.
  if (text === null) return null;
  const parsed = parseDebtLedger(text);
  return { parsed, ...evaluateDebtLedger(parsed, DEBT_BUDGET) };
}

export const archTests = [
  {
    name: "arch/debt-budget: the tech-debt ledger is at or below its recorded line ceiling",
    run: async () => {
      const measured = await measure();
      if (measured === null) return;
      assert.ok(
        measured.parsed.totalLines <= DEBT_BUDGET.maxTotalLines,
        `${DEBT_LEDGER_BASENAME} is ${measured.parsed.totalLines} lines against a recorded ceiling of ` +
          `${DEBT_BUDGET.maxTotalLines}. The ledger may fall and may never rise. Either compact the entry you ` +
          `grew (its forensics belong in the reviewing item's own ARCHITECTURE/VERIFICATION register), or ` +
          `discharge what is already paid with \`aof work debt --prune --write\`. Raising the ceiling in ` +
          `DEBT_BUDGET needs an ADR, not a diff.`
      );
    },
  },

  {
    name: "arch/debt-budget: no MORE entries exceed the per-entry budget than the recorded ceiling",
    run: async () => {
      const measured = await measure();
      if (measured === null) return;
      const oversize = measured.summary.oversize;
      assert.ok(
        oversize <= DEBT_BUDGET.maxOversizeEntries,
        `${oversize} entries exceed the ${DEBT_BUDGET.entryLines}-line entry budget, against a recorded ceiling ` +
          `of ${DEBT_BUDGET.maxOversizeEntries}. A NEW debt entry states four things and nothing else: what's ` +
          `wrong, how it bites, the shape of the fix, and one \`file:line\`. Run \`aof work debt\` for the ` +
          `worst-first list.`
      );
    },
  },

  {
    name: "arch/debt-budget: the CLI face and this gate read one budget from one module",
    run: async () => {
      // The gate that keeps the gate honest. Two homes for the ceiling is exactly the species the
      // ledger's own items 25, 44, 57, 59, 81 and 89 record, and shipping a seventh instance
      // inside the instrument built to bound them would be its own entry within the week.
      const { debtCommand } = await import("../../../src/commands/debt.mjs");
      const face = await debtCommand.run({}, { workspace: { workDir: path.join(repoRoot, "wiki", "work") } });
      assert.equal(face.budget, DEBT_BUDGET, "the command reports the same frozen budget object this gate asserts on");

      const measured = await measure();
      if (measured === null) return;
      assert.equal(face.summary.totalLines, measured.parsed.totalLines, "one measurement, two readers");
      assert.equal(face.summary.oversize, measured.summary.oversize);
    },
  },

  {
    name: "arch/debt-budget: the ledger's ceilings are not slack — a re-stamp downward is always available",
    run: async () => {
      // The ratchet's own ratchet. If the recorded ceilings drift far above the measured state,
      // the gate stops binding without anyone noticing — a ceiling nobody re-stamps is a ceiling
      // that silently grants back every line compaction just bought. 10% is the slack allowance.
      const measured = await measure();
      if (measured === null) return;
      const slack = DEBT_BUDGET.maxTotalLines - measured.parsed.totalLines;
      assert.ok(
        slack <= Math.ceil(DEBT_BUDGET.maxTotalLines * 0.1),
        `the recorded line ceiling (${DEBT_BUDGET.maxTotalLines}) sits ${slack} lines above the measured ledger ` +
          `(${measured.parsed.totalLines}) — more than 10% slack. Re-stamp DEBT_BUDGET.maxTotalLines down to ` +
          `${measured.parsed.totalLines} so the next accretion has nowhere to go; \`aof work debt --json\` reports ` +
          `both numbers.`
      );
    },
  },
];
