// FF-9606 (96/ADR-008 §1, §2) — THE GATE'S RESULT IS EVIDENCE: a record with a frozen shape, in the
// item's own folder, that a rerun APPENDS to rather than overwrites.
//
// `aof test --scope all` already computed the gate boolean and threw it away. Replacing that with a
// record is only worth doing if the record stays a record: a document that gets overwritten, or one
// whose half-written row renders as an absence, is the same boolean with more ceremony. Each claim
// below is one of the ways that regression happens.
//
// FIVE CLAIMS, each failing for its own reason:
//
//   1. THE WRITE PATH IS THE ITEM'S OWN FOLDER, never `runs/` and never `observability/` — 78/ADR-001's
//      rule applied to a second record, asserted by the RESOLVED path rather than by a header
//      comment, because both of those directories declare themselves rebuildable or deletable and
//      evidence that survives to accept cannot live in one.
//   2. THE FROZEN SHAPE HAS ONE HOME. The `h2`, the header row and the divider are exported
//      constants, and no comparison site in `src/` holds a second copy of any of them. A frozen
//      literal beside a comparison freezes that site's BELIEF about the document rather than the
//      document.
//   3. EVERY ROW CARRIES FOUR FACTS, and a row missing any of them is UNREADABLE rather than
//      silently ignored. This is the one failure the document cannot have: a skipped row and a
//      green gate look identical to the door.
//   4. A SECOND RUN APPENDS. The earlier row survives verbatim, so the door reads the newest and the
//      milestone can be diffed against the last one.
//   5. A RUN THAT WAS NOT A WHOLE-TREE RUN IS RECORDED AND DOES NOT SATISFY THE DOOR. Recorded,
//      because "no gate ran" and "a gate ran narrowly" must not be the same absence; refused,
//      because a partial run wearing a gate's name is what story 03's narrowing would otherwise buy.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import {
  EMPTY_CELL,
  GATE_RESULTS,
  RECORD_MALFORMED,
  REGRESSION_DIVIDER,
  REGRESSION_HEADER,
  REGRESSION_HEADING,
  REGRESSION_RECORD_BASENAME,
  appendRegressionRow,
  newestRegressionRow,
  parseRegressionRows,
  regressionRecordPath,
  satisfiesDoor,
} from "../../../src/regression-record.mjs";
import { runRegressionGate } from "../../../src/commands/regression-gate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const RECORD_MODULE = "src/regression-record.mjs";

const source = async (rel) => stripComments(await readFile(path.join(repoRoot, rel), "utf8"));

async function srcModules(dir = path.join(repoRoot, "src"), found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await srcModules(full, found);
    else if (entry.name.endsWith(".mjs")) found.push(path.relative(repoRoot, full).split(path.sep).join("/"));
  }
  return found;
}

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const NEXT_COMMIT = "fedcba9876543210fedcba9876543210fedcba98";
const INSTANT = "2026-09-04T10:00:00Z";
const NEXT_INSTANT = "2026-09-06T10:00:00Z";

const suiteResult = ({ scope = "all", widened = [], failures = [] } = {}) => Object.freeze({
  askedScope: "all",
  scope,
  widened: Object.freeze(widened),
  refusal: null,
  runner: Object.freeze({ outcome: "exited", exitCode: failures.length > 0 ? 1 : 0 }),
  report: Object.freeze({ ok: true, failures: Object.freeze(failures) }),
  exit: failures.length > 0 ? 1 : 0,
});

const cleanGit = (commit) => async (args) => (args[0] === "status"
  ? { stdout: "", stderr: "", status: 0 }
  : { stdout: `${commit}\n`, stderr: "", status: 0 });

async function withItem(body) {
  const tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "aof-ff9606-")));
  const itemDir = path.join(tmp, "wiki", "work", "70_milestone_gate");
  await mkdir(path.join(itemDir, "runs"), { recursive: true });
  await mkdir(path.join(itemDir, "observability"), { recursive: true });
  const item = { ref: "70", dir: itemDir, type: "milestone" };
  const run = ({ commit = COMMIT, now = INSTANT, suite = suiteResult() } = {}) =>
    runRegressionGate({ ref: "70", now }, {
      projectRoot: tmp,
      config: {},
      resolve: async () => item,
      git: cleanGit(commit),
      runSuite: async () => suite,
    });
  try {
    await body({ root: tmp, itemDir, item, run, recordPath: regressionRecordPath(itemDir) });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

export const archTests = [
  {
    name: "arch/96/04 FF-9606 (1) THE WRITE PATH IS THE ITEM'S OWN FOLDER — never runs/, never observability/",
    run: () => withItem(async ({ itemDir, run }) => {
      const out = await run();
      const written = out.path.split(path.sep).join("/");

      assert.equal(path.dirname(out.path), itemDir, "the record is a peer of the item's other records");
      assert.equal(written.endsWith(`/${REGRESSION_RECORD_BASENAME}`), true);
      assert.doesNotMatch(written, /\/runs\//, "runs/ declares itself rebuildable — evidence cannot live there");
      assert.doesNotMatch(written, /\/observability\//, "…and observability/ declares itself deletable");

      // AND THE PATH IS NOT SOMETHING A CALLER CAN CHOOSE. There is exactly one of it, which is what
      // makes this claim assertable at all rather than a property of how it happened to be called.
      const resolver = await source(RECORD_MODULE);
      assert.match(resolver, /export function regressionRecordPath/, "the one resolver is exported from the record module");
      const gate = await source("src/commands/regression-gate.mjs");
      assert.equal(
        /path\.join\([^)]*REGRESSION/.test(gate),
        false,
        "the gate command must resolve the path through regressionRecordPath, never build one of its own",
      );
    }),
  },
  {
    name: "arch/96/04 FF-9606 (2) THE FROZEN SHAPE HAS ONE HOME — no comparison site in src/ holds a second copy",
    run: async () => {
      const frozen = [REGRESSION_HEADING, REGRESSION_HEADER, REGRESSION_DIVIDER];
      const offenders = [];
      for (const rel of await srcModules()) {
        if (rel === RECORD_MODULE) continue;
        const text = await source(rel);
        for (const literal of frozen) {
          // The divider is a generic five-column markdown separator, so it is only a SECOND COPY
          // when it appears beside this document's own vocabulary — otherwise every table renderer
          // in the tree would read as an offender.
          const looksLikeThisDocument = text.includes(REGRESSION_RECORD_BASENAME)
            || text.includes("regression-gate")
            || text.includes("REGRESSION_H");
          if (text.includes(literal) && looksLikeThisDocument && !text.includes(`from "../regression-record.mjs"`) && !text.includes(`from "./regression-record.mjs"`)) {
            offenders.push(`${rel}: ${literal}`);
          }
        }
      }
      assert.deepEqual(offenders, [], "a frozen literal beside a comparison freezes that site's belief, not the document");

      // …and the three really are the exported constants, not values a test invented.
      assert.equal(REGRESSION_HEADING.startsWith("## "), true, "an h2, per m66's law");
      assert.equal(REGRESSION_HEADER.split("|").length - 2, 5, "five columns: commit, instant, scope, result, detail");
      assert.equal(REGRESSION_DIVIDER.split("|").length, REGRESSION_HEADER.split("|").length, "and a divider that matches it");
      assert.deepEqual([...GATE_RESULTS], ["green", "red", "override"], "the result vocabulary is closed at three");
    },
  },
  {
    name: "arch/96/04 FF-9606 (3) EVERY ROW CARRIES FOUR FACTS — a row missing any of them is unreadable, never skipped",
    run: () => withItem(async ({ recordPath, run }) => {
      await run();
      const good = await readFile(recordPath, "utf8");
      const [row] = parseRegressionRows(good, recordPath);
      for (const fact of ["commit", "instant", "scope", "result"]) {
        assert.notEqual(row[fact], null, `a written row carries its ${fact}`);
      }

      for (const fact of ["commit", "instant", "scope", "result"]) {
        const broken = good.replace(row.line, row.line.replace(row[fact], EMPTY_CELL));
        assert.notEqual(broken, good, `the ${fact} cell was actually blanked`);
        let caught = null;
        try {
          parseRegressionRows(broken, recordPath);
        } catch (error) {
          caught = error;
        }
        assert.equal(caught?.code, RECORD_MALFORMED, `a row missing its ${fact} makes the record unreadable`);
        assert.match(caught.message, /row 1/, "…naming the malformed row rather than skipping it");
      }
    }),
  },
  {
    name: "arch/96/04 FF-9606 (4) A SECOND GATE RUN APPENDS — the earlier row survives and the newest is what the door reads",
    run: () => withItem(async ({ recordPath, run }) => {
      await run();
      const firstLine = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath)[0].line;

      await run({ commit: NEXT_COMMIT, now: NEXT_INSTANT });
      const rows = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);

      assert.equal(rows.length, 2, "a rerun appends rather than overwrites");
      assert.equal(rows[0].line, firstLine, "the earlier row survives byte-for-byte");
      assert.equal(newestRegressionRow(rows).commit, NEXT_COMMIT, "and the newest row is the one the door reads");

      // THE APPEND IS BYTE-STABLE around the rows: appending must not grow the document's fixed
      // furniture, or a diff would stop meaning "a gate ran".
      const twice = appendRegressionRow(appendRegressionRow(null, rows[0]), rows[1]);
      assert.equal(twice.split(REGRESSION_HEADING).length - 1, 1, "one heading, however many rows");
      assert.equal(twice.split(REGRESSION_HEADER).length - 1, 1, "one header row");
    }),
  },
  {
    name: "arch/96/04 FF-9606 (5) A RUN THAT WAS NOT A WHOLE-TREE RUN IS RECORDED AND DOES NOT SATISFY THE DOOR",
    run: () => withItem(async ({ recordPath, run }) => {
      for (const [label, suite, cell] of [
        ["scope was not `all`", suiteResult({ scope: "impacted" }), "impacted"],
        ["selection widened", suiteResult({ widened: [{ file: "src/x.mjs", reason: "graph-unknown" }] }), "all+widened"],
      ]) {
        await rm(recordPath, { force: true });
        const out = await run({ suite });
        const [row] = parseRegressionRows(await readFile(recordPath, "utf8"), recordPath);
        assert.equal(row.scope, cell, `a run whose ${label} is recorded, not discarded`);
        assert.equal(row.result, "green", "…and its own pass/fail is recorded honestly");
        assert.equal(satisfiesDoor(row), false, "…but it does not satisfy the door");
        assert.equal(out.satisfiesDoor, false, "and the command says so in its own result");
      }

      // An override row is not a run either, so it satisfies nothing — the property that makes
      // "the milestone reports no green gate run" true after an override.
      assert.equal(satisfiesDoor({ result: "override", scope: "override" }), false);
      assert.equal(satisfiesDoor({ result: "green", scope: "all" }), true, "…and a whole-tree green run does");
      assert.equal(satisfiesDoor(null), false, "an absent row satisfies nothing");
    }),
  },
];
