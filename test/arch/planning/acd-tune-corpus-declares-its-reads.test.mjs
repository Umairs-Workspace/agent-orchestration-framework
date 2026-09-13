// milestone 62 / story 00 — FF-6205.
// The corpus declares every read against a floor and reaches each source through
// the reader which already owns it. Scope likewise has one home.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import * as reads from "../../../src/work-audit/reads.mjs";
import {
  CORPUS_LANES,
  assembleCorpus,
  assertCorpusLanesDeclared,
  corpusFinding,
} from "../../../src/work-tune/corpus.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const modulePath = path.join(root, "src", "work-tune", "corpus.mjs");

const codeLines = (source) => source.split(/\r?\n/u)
  .filter((line) => {
    const text = line.trim();
    return text.length > 0 && !text.startsWith("//") && !text.startsWith("*") && !text.startsWith("/*");
  })
  .join("\n");

export const archTests = [
  {
    name: "arch/62 FF-6205: the three corpus lanes are complete declarations with fixed positive floors",
    run: () => {
      assert.deepEqual(CORPUS_LANES.map((lane) => lane.id), ["lessons", "lineage", "observations"]);
      assert.deepEqual(reads.sweepDeclarationProblems(CORPUS_LANES), []);
      assert.equal(Object.isFrozen(CORPUS_LANES), true);
      for (const lane of CORPUS_LANES) {
        assert.equal(Object.isFrozen(lane), true, `${lane.id}: declaration is immutable`);
        assert.ok(lane.floor > 0, `${lane.id}: floor can be missed`);
        assert.ok(reads.SWEEP_BASES.includes(lane.basis), `${lane.id}: basis uses the shared vocabulary`);
      }
      assert.deepEqual(
        Object.fromEntries(CORPUS_LANES.map((lane) => [lane.id, lane.floor])),
        { lessons: 196, lineage: 30, observations: 3 },
        "floors are the refine-time corpus baseline halved, not recalculated from scope",
      );
    },
  },
  {
    name: "arch/62 FF-6205: an incomplete lane is refused before a count or report can exist",
    run: () => {
      const base = { ...CORPUS_LANES[0] };
      const omissions = [
        ["floor", undefined],
        ["floor", 0],
        ["floor", -1],
        ["root", undefined],
        ["what", undefined],
        ["basis", undefined],
      ];
      for (const [key, value] of omissions) {
        const altered = { ...base, [key]: value };
        assert.throws(() => assertCorpusLanesDeclared([altered]), /refuses to run/u, `${key}=${String(value)} is refused`);
      }
      const fourth = { id: "fourth", root: "/r", what: "new evidence", basis: "disk" };
      assert.throws(() => assertCorpusLanesDeclared([...CORPUS_LANES, fourth]), /fourth[\s\S]*floor/u);
    },
  },
  {
    name: "arch/62 FF-6205: read shape and declaration validator are imported, and the finding differs from audit in code alone",
    run: async () => {
      const source = codeLines(await readFile(modulePath, "utf8"));
      assert.match(
        source,
        /import \{ SWEEP_BASES, readRecord, sweepDeclarationProblems \} from "\.\.\/work-audit\/reads\.mjs"/u,
      );
      for (const symbol of ["readRecord", "sweepDeclarationProblems", "SWEEP_BASES"]) {
        assert.equal(new RegExp(`(?:function|const|let|class)\\s+${symbol}\\b`, "u").test(source), false, `${symbol}: no local copy`);
      }
      assert.equal(/\breadFinding\b/u.test(source), false, "the audit's code-owning finding constructor is not imported");

      const read = reads.readRecord(CORPUS_LANES[0], 0, "/walked (scope: 62/00)");
      const mine = corpusFinding(read);
      const audit = reads.readFinding(read);
      assert.deepEqual(Object.keys(mine), Object.keys(audit));
      for (const key of Object.keys(audit)) {
        if (key !== "code") assert.deepEqual(mine[key], audit[key], `${key}: identical to the family's record shape`);
      }
      assert.equal(mine.code, "tune-ran-on-nothing");
      assert.equal(audit.code, "audit-ran-on-nothing");
      assert.match(mine.message, /scope: 62\/00/u, "scope is named through the root in the shared message shape");
    },
  },
  {
    name: "arch/62 FF-6205: each source reader and the stream scope rule are imported, with no raw run or snapshot path grammar",
    run: async () => {
      const source = codeLines(await readFile(modulePath, "utf8"));
      assert.match(source, /import \{ parseRetrospective \} from "\.\.\/memory\/local-indexing\.mjs"/u);
      assert.match(source, /import \{ readRuns, runNodeRecordPath, runRecordPath \} from "\.\.\/run-store\.mjs"/u);
      assert.match(source, /run\.node == null\s*\? runRecordPath\(item, run\.runId\)\s*: runNodeRecordPath\(item, run\.node, run\.runId\)/u);
      assert.match(source, /import \{ readLatestSnapshot \} from "\.\.\/work\/observe\.mjs"/u);
      assert.match(source, /import \{ itemInScope \} from "\.\.\/work\/ref-scope\.mjs"/u);
      assert.doesNotMatch(source, /agents\.json|snapshots[\\/]|runs[\\/].*\.json/iu);
      assert.doesNotMatch(source, /new RegExp|\/\^\\d/u, "the tune family authors no scope grammar");
      assert.doesNotMatch(source, /##\\s+R|R\\d/u, "the retrospective heading grammar is not restated");
    },
  },
  {
    name: "arch/62 FF-6205: widening the copied shared scope rule is inherited without editing the tree under test",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-tune-scope-copy-"));
      try {
        await cp(path.join(root, "src"), path.join(temp, "src"), { recursive: true });
        const workDir = path.join(temp, "wiki", "work");
        await mkdir(path.join(workDir, "01_milestone_one"), { recursive: true });
        await mkdir(path.join(workDir, "02_milestone_two"), { recursive: true });

        const copiedScope = path.join(temp, "src", "work", "ref-scope.mjs");
        const before = await readFile(copiedScope, "utf8");
        const needle = "  const byRef = refInScope(item.ref, scope);";
        assert.ok(before.includes(needle), "the copied scope seam has the expected insertion anchor");
        const widened = before.replace(needle, [
          "  const range = scope.match(/^(\\d+)-(\\d+)$/);",
          "  if (range) {",
          "    const number = Number.parseInt(item.parent ?? item.number, 10);",
          "    return number >= Number(range[1]) && number <= Number(range[2]);",
          "  }",
          needle,
        ].join("\n"));
        await writeFile(copiedScope, widened, "utf8");

        const copied = await import(`${pathToFileURL(path.join(temp, "src", "work-tune", "corpus.mjs")).href}?copy=${Date.now()}`);
        const result = await copied.assembleCorpus({ cwd: temp, scope: "01-02" });
        assert.equal(result.matched, true);
        assert.deepEqual(result.items, ["01", "02"], "the copied corpus inherits whatever the copied shared rule admits");
        assert.equal(await readFile(path.join(root, "src", "work", "ref-scope.mjs"), "utf8") === before, true, "the working tree's rule was not edited");
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/62 FF-6205: an unmatched scope exits as no match without manufacturing lane findings",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-tune-no-match-"));
      try {
        const workDir = path.join(temp, "wiki", "work");
        await mkdir(path.join(workDir, "01_milestone_alpha"), { recursive: true });
        const result = await assembleCorpus({ cwd: temp, scope: "99" });
        assert.equal(result.matched, false);
        assert.deepEqual(result.reads, []);
        assert.deepEqual(result.findings, []);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
];
