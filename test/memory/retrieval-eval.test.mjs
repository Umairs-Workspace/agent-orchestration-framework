// Traceability wiring for milestone 148 / story 01 (the-ranking-is-held-by-an-eval).
//
//   00_the-eval-holds-each-pair-in-the-block-and-names-the-one-it-loses.feature — the runner
//     (`evalPair`/`runEval`, exported by FF-14801's own file) over small frozen record sets:
//     held / lost / gone, the fifth-rank pass line, scope, a reversed ranker, no index written.
//   01_the-live-corpus-holds-every-cited-pair.feature — the pair table's shape and provenance,
//     every pair held over the live corpus, and the suite's registration in the arch index.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rankRecords } from "@aof/knowledge/memory/local-retrieval";
import {
  EVAL_PAIRS,
  HOOK_LIMIT,
  assertEvalPasses,
  buildLiveRecords,
  evalPair,
  resolveProvenance,
  runEval,
} from "../arch/memory/acd-memory-retrieval-eval.test.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const M01_DIR = path.join(REPO_ROOT, "wiki", "work", "archive", "01_milestone_acd-asset-bundle");

const QUERY = "pin line endings";
const PAIR = Object.freeze({ query: QUERY, scope: {}, expect: "01/R2", from: "05:spike/FINDINGS.md" });

function record(partial) {
  return {
    recordType: partial.recordType ?? "adr",
    id: partial.id,
    item: partial.item,
    itemSlug: `m${partial.item}`,
    title: partial.title ?? "",
    area: partial.area ?? "",
    stage: "",
    kind: "",
    owner: "",
    status: "",
    summary: "",
    text: partial.text ?? "",
    source: `m${partial.item}/FILE.md:1`,
  };
}

const PADDING = "the remaining prose of this record discusses manifests bundles and installers at length ".repeat(6);

// A record set in which `QUERY` ranks the expected record at `rank`: `rank - 1` decoys match
// the query in title AND text (each outscores it), the target matches in a padded text only,
// and fillers that share no term trail behind it.
function setRankingTargetAt(rank, { fillers = 3 } = {}) {
  const records = [];
  for (let i = 1; i < rank; i += 1) {
    records.push(record({ item: String(20 + i), id: `ADR-00${i}`, title: "pin line endings", text: "pin line endings pin line endings" }));
  }
  records.push(record({ item: "01", id: "R2", recordType: "adr", text: `pin line endings ${PADDING}` }));
  for (let i = 0; i < fillers; i += 1) {
    records.push(record({ item: String(60 + i), id: "ADR-001", title: "unrelated", text: "nothing here shares a term" }));
  }
  // Shuffle the source order so position never decides the rank by itself.
  return records.reverse();
}

function rankOf(records, pair, scope = pair.scope) {
  const ranked = rankRecords(records, pair.query, scope, { limit: records.length });
  return ranked.findIndex((r) => `${r.item}/${r.id}` === pair.expect) + 1;
}

export const retrievalEvalTests = [
  // ── 00 · the runner ────────────────────────────────────────────────────────
  {
    name: "148/01/00: a pair whose record ranks within the first five is held",
    run: () => {
      const records = setRankingTargetAt(3);
      assert.equal(rankOf(records, PAIR), 3, "fixture: 01/R2 ranks third");
      const result = evalPair(records, PAIR);
      assert.equal(result.verdict, "held");
      assert.equal(result.rank, 3);
      assert.equal(runEval(records, [PAIR]).pass, true, "the eval passes");
    },
  },
  ...[
    { rank: 1, verdict: "held" },
    { rank: 5, verdict: "held" },
    { rank: 6, verdict: "lost" },
  ].map((row) => ({
    name: `148/01/00 outline: the pass line is the fifth rank — rank ${row.rank} is ${row.verdict}`,
    run: () => {
      const records = setRankingTargetAt(row.rank);
      assert.equal(rankOf(records, PAIR), row.rank, `fixture: 01/R2 ranks at ${row.rank}`);
      assert.equal(evalPair(records, PAIR).verdict, row.verdict);
      assert.equal(HOOK_LIMIT, 5, "the block is five lines");
    },
  })),
  {
    name: "148/01/00: a lost pair is named with its query and the rank it was found at",
    run: () => {
      const records = setRankingTargetAt(7);
      assert.equal(rankOf(records, PAIR), 7, "fixture: 01/R2 ranks seventh");
      const outcome = runEval(records, [PAIR]);
      assert.equal(outcome.pass, false, "the eval fails");
      assert.equal(outcome.failures.length, 1);
      const [message] = outcome.failures;
      assert.match(message, /01\/R2/);
      assert.ok(message.includes(`"${QUERY}"`), `names the query: ${message}`);
      assert.match(message, /rank 7\b/);
      assert.throws(() => assertEvalPasses(outcome), /01\/R2[\s\S]*rank 7/);
    },
  },
  {
    name: "148/01/00: a record the ranking never returns is lost, not held",
    run: () => {
      const records = [record({ item: "01", id: "R2", text: "an unrelated subject entirely" })];
      for (let i = 1; i <= 6; i += 1) {
        records.push(record({ item: String(30 + i), id: "ADR-001", text: `pin line endings variant ${i}` }));
      }
      const result = evalPair(records, PAIR);
      assert.equal(result.verdict, "lost");
    },
  },
  {
    name: "148/01/00: a pair whose record is gone fails as gone, not as lost",
    run: () => {
      const records = setRankingTargetAt(2).filter((r) => !(r.item === "01" && r.id === "R2"));
      const result = evalPair(records, PAIR);
      assert.equal(result.verdict, "gone");
      const outcome = runEval(records, [PAIR]);
      assert.equal(outcome.pass, false);
      assert.match(outcome.failures[0], /01\/R2 is not in the corpus/);
    },
  },
  {
    name: "148/01/00: an id that recurs in another item does not hold the pair",
    run: () => {
      const records = [
        record({ item: "07", id: "R2", recordType: "lesson", title: "pin line endings", text: "pin line endings" }),
        record({ item: "08", id: "ADR-001", text: "nothing in common" }),
      ];
      assert.equal(rankRecords(records, QUERY, {}, { limit: 2 })[0].item, "07", "fixture: 07/R2 ranks first");
      assert.equal(evalPair(records, PAIR).verdict, "gone");
    },
  },
  {
    name: "148/01/00: a pair is ranked under the scope it was recorded with",
    run: () => {
      const pair = { query: "requiring grep fitness function smell", scope: { area: "architecture" }, expect: "01/R1", from: "05:spike/FINDINGS.md" };
      const records = [
        record({ item: "02", id: "R9", recordType: "lesson", area: "process", title: "requiring grep fitness function smell", text: "requiring grep fitness function smell" }),
        record({ item: "01", id: "R1", recordType: "lesson", area: "architecture", title: "Requiring-grep fitness tests", text: `a requiring grep fitness function is a smell ${PADDING}` }),
        record({ item: "03", id: "ADR-001", area: "architecture", text: "an unrelated architecture decision" }),
      ];
      assert.equal(rankRecords(records, pair.query, {}, { limit: 3 })[0].item, "02", "fixture: 02/R9 ranks first with no scope");
      const scoped = rankRecords(records, pair.query, pair.scope, { limit: records.length });
      assert.ok(!scoped.some((r) => r.item === "02" && r.id === "R9"), "02/R9 is not among the ranked records");
      const result = evalPair(records, pair);
      assert.equal(result.verdict, "held");
      assert.equal(result.rank, 1);
    },
  },
  {
    name: "148/01/00: the eval fails under a ranker that reverses the base ranking",
    run: () => {
      const records = [record({ item: "01", id: "R2", title: "pin line endings", text: "pin line endings" })];
      for (let i = 1; i <= 11; i += 1) {
        records.push(record({ item: String(40 + i), id: "ADR-001", text: i % 2 ? `endings ${PADDING}` : "a record with no shared term" }));
      }
      assert.equal(rankOf(records, PAIR), 1, "fixture: the expected record ranks first under the base ranking");
      const reversed = (...args) => rankRecords(...args).reverse();
      assert.equal(evalPair(records, PAIR, { rank: reversed }).verdict, "lost");
      assert.equal(runEval(records, [PAIR], { rank: reversed }).pass, false);
    },
  },
  {
    name: "148/01/00: building the live record set writes no memory index",
    run: async () => {
      const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-eval-project-"));
      try {
        const aofDir = path.join(projectRoot, ".aof");
        await mkdir(aofDir, { recursive: true });
        const m01 = path.join(projectRoot, "wiki", "work", "01_milestone_acd-asset-bundle");
        await mkdir(m01, { recursive: true });
        for (const doc of ["RETROSPECTIVE.md", "ARCHITECTURE.md"]) {
          await writeFile(path.join(m01, doc), await readFile(path.join(M01_DIR, doc), "utf8"), "utf8");
        }
        const records = await buildLiveRecords({ projectRoot });
        assert.ok(records.some((r) => r.item === "01" && r.id === "R2"), "the copy's corpus was built");
        runEval(records, EVAL_PAIRS.slice(0, 2));
        assert.equal(existsSync(path.join(aofDir, "aof.memory.index.json")), false, "no local index was written");
        assert.equal(existsSync(path.join(aofDir, "aof.memory.graphify.index.json")), false, "no graphify index was written");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },

  // ── 01 · the live corpus ───────────────────────────────────────────────────
  {
    name: "148/01/01: the table holds at least twenty pairs, the two from the origin first",
    run: () => {
      assert.equal(EVAL_PAIRS[0].query, "content addressed hash cross platform");
      assert.equal(EVAL_PAIRS[0].expect, "01/R2");
      assert.equal(EVAL_PAIRS[1].query, "fitness function asserts a symbol appears in a file");
      assert.equal(EVAL_PAIRS[1].expect, "01/R1");
      assert.ok(EVAL_PAIRS.length >= 20, `the table holds ${EVAL_PAIRS.length} pairs`);
      const keys = EVAL_PAIRS.map((p) => `${p.query}\u0000${JSON.stringify(Object.entries(p.scope).sort())}`);
      assert.equal(new Set(keys).size, keys.length, "no two pairs share the same query and scope");
    },
  },
  {
    name: "148/01/01: every pair cites the recall it was drawn from, by item ref",
    run: async () => {
      const broken = [];
      for (const pair of EVAL_PAIRS) {
        assert.match(pair.from, /^\d+(\/\d+)?:[^:/\\][^:]*\.md$/, `"${pair.from}" names an item ref, never a path`);
        const provenance = await resolveProvenance(pair);
        if (!provenance.ok) broken.push(`${pair.expect} ← ${pair.from}: ${provenance.reason}`);
      }
      assert.deepEqual(broken, [], `every pair's provenance resolves:\n  ${broken.join("\n  ")}`);
    },
  },
  {
    name: "148/01/01: every pair is held over the live corpus",
    run: async () => {
      const records = await buildLiveRecords();
      const outcome = runEval(records);
      assertEvalPasses(outcome);
      assert.ok(outcome.results.every((r) => r.verdict === "held"));
    },
  },
  {
    name: "148/01/01: the eval is registered where the arch runner finds it",
    run: async () => {
      const index = await readFile(path.join(REPO_ROOT, "test", "arch", "memory", "index.mjs"), "utf8");
      const imported = index.match(/import\s*\{\s*archTests\s+as\s+(\w+)\s*\}\s*from\s*"\.\/acd-memory-retrieval-eval\.test\.mjs"/);
      assert.ok(imported, "the arch/memory index imports the suite");
      assert.ok(new RegExp(`\\.\\.\\.${imported[1]}\\b`).test(index), "and spreads it into the index's tests");
    },
  },
];
