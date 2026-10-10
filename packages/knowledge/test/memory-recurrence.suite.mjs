// Traceability wiring for milestone 153 / story 02, task 02 (match-recurrences-from-labelled-evidence) —
// the recurrence decision through the REAL seam: `memory recurrence <lesson text> [--exclude <ref>]`
// over both backends, memory off, and a stream with and without lessons.
//
//   E4 · the named junction recurrence crosses item and Kind boundaries
//   E5 · similar vocabulary is not sufficient evidence
//   E6 · equality and self identity do not qualify
//   outline · empty and competing candidates are decided deterministically
//   both backends reach the same decision over the same records
//
// The lesson texts are the labelled fixture's (`test/arch/memory/fixtures/recurrence-pairs.json`), so
// the suite and FF-15302 measure the same incidents. The stream is a temp folder; nothing here
// touches the real index or the real global home.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { createLocalBackend } from "@aof/knowledge/memory/local-backend";
import { createGraphifyBackend } from "@aof/knowledge/memory/graphify-backend";
import { createMemory } from "@aof/knowledge/memory";
import { RECURRENCE_CALIBRATION, evaluateRecurrence, recurrenceScore } from "../src/memory/recurrence.mjs";

const FIXTURE = JSON.parse(await readFile(fileURLToPath(new URL("../../../test/arch/memory/fixtures/recurrence-pairs.json", import.meta.url)), "utf8"));
const refuse = (what) => () => { throw new Error(`this suite must not reach ${what}`); };

// A lesson as a RETROSPECTIVE section. The fixture's text is the indexed blob (title first), so the
// title is split off and the rest becomes the section's `What happened`, which indexes back to the
// same words.
function lessonSection(id, kind, text) {
  const [title, ...rest] = text.split(" \n ");
  return [`## ${id} — ${title}`, "", `- **Kind:** ${kind || "mistake"} · **Area:** process · **Stage:** verify · **Owner:** verifier`, `- **What happened:** ${rest.join(" ")}`, ""].join("\n");
}

const lessonOf = (ref) => FIXTURE.lessons[ref];

// A temp project: `milestones` is [{ number, lessons: [{ id, kind, text }], adr?: text }].
async function streamOf(milestones) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-153-02-"));
  const workDir = path.join(root, "wiki", "work");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  const items = [];
  for (const { number, lessons = [], adr } of milestones) {
    const dir = path.join(workDir, `${number}_milestone_m${number}`);
    await mkdir(dir, { recursive: true });
    if (lessons.length > 0) {
      await writeFile(path.join(dir, "RETROSPECTIVE.md"), [`# ${number} · Retrospective`, "", ...lessons.map((l) => lessonSection(l.id, l.kind, l.text))].join("\n"));
    }
    if (adr) {
      await writeFile(path.join(dir, "ARCHITECTURE.md"), [`# ${number} · Architecture`, "", "## ADR-001: Junctions", "", "**Status:** Accepted", "", `**Decision.** ${adr}`, ""].join("\n"));
    }
    items.push({ type: "milestone", parent: null, ref: String(number), number: String(number), slug: `m${number}`, dir });
  }
  const indexing = createLocalIndexing({
    listItemsCacheFirst: async () => items,
    localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: () => path.join(root, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
  });
  const ctx = {
    workDir,
    projectRoot: root,
    configMemory: {},
    loadWorkspace: async () => ({ projectRoot: root, config: {}, configPath: null }),
    invoke: async () => { throw Object.assign(new Error("graphify absent"), { code: "graphify-missing" }); },
  };
  const graphify = createGraphifyBackend({
    coreInvoke: refuse("coreInvoke"),
    loadWorkspace: refuse("loadWorkspace"),
    buildRecords: indexing.buildRecords,
    ensureAofGitignore: async () => {},
    ensureGraphifyOutGitignore: async () => {},
  });
  const backends = { local: createLocalBackend(indexing).default, graphify: graphify.default };
  await backends.local.reindex(null, ctx);
  await backends.graphify.reindex(null, ctx);
  return { root, ctx, backends, workDir };
}

async function withStream(milestones, run) {
  const s = await streamOf(milestones);
  try {
    await run(s);
  } finally {
    await rm(s.root, { recursive: true, force: true });
  }
}

const { runMemory, renderMemory, memoryJson } = createMemory({ loadLocalBackend: refuse("a configured local backend"), loadGraphifyBackend: refuse("a configured graphify backend") });

const recurrence = async (s, backend, text, ...flags) => {
  const { result } = await runMemory(["recurrence", text, ...flags, "--json"], { resolveBackend: async () => s.backends[backend], ctx: s.ctx });
  return result;
};

// Every file under a folder → bytes, so "writes no source document or index" is a comparison.
async function snapshot(root) {
  const files = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.set(path.relative(root, full), `${(await stat(full)).size}:${await readFile(full, "utf8")}`);
    }
  }
  await walk(root);
  return files;
}

const junction = () => [
  { number: 45, lessons: [{ id: "R13", kind: lessonOf("45/R13").kind, text: lessonOf("45/R13").text }] },
  { number: 68, lessons: [{ id: "R10", kind: lessonOf("68/R10").kind, text: lessonOf("68/R10").text }] },
];

const BACKENDS = ["local", "graphify"];

export const memoryRecurrenceTests = [
  ...BACKENDS.map((backend) => ({
    name: `153/02/02 E4: the junction incident in 68/R10 (near-miss) matches 45/R13 (mistake) across item and Kind, and edits nothing — ${backend}`,
    run: () => withStream(junction(), async (s) => {
      const before = await snapshot(s.root);
      const result = await recurrence(s, backend, lessonOf("68/R10").text, "--exclude", "68/R10");
      assert.equal(result.qualifying, "45/R13");
      assert.equal(lessonOf("45/R13").kind, "mistake");
      assert.equal(lessonOf("68/R10").kind, "near-miss");
      assert.equal(result.threshold, RECURRENCE_CALIBRATION.threshold);
      assert.equal(result.calibration, RECURRENCE_CALIBRATION.version);
      assert.ok(result.score > result.threshold, `${result.score} > ${result.threshold}`);
      assert.deepEqual(result.candidates.map((c) => c.ref), ["45/R13"], "the excluded identity is not a candidate");
      assert.deepEqual(await snapshot(s.root), before, "no source document or index changed");
    }),
  })),
  {
    name: "153/02/02 E4: the identity may also be written with the m prefix, and a malformed --exclude is refused before any backend is reached",
    run: () => withStream(junction(), async (s) => {
      const result = await recurrence(s, "local", lessonOf("68/R10").text, "--exclude", "m68/R10");
      assert.equal(result.qualifying, "45/R13");
      await assert.rejects(
        () => runMemory(["recurrence", "x lesson", "--exclude", "R10"], { resolveBackend: refuse("a backend"), ctx: s.ctx }),
        (error) => error.code === "invalid-exclude",
      );
      await assert.rejects(
        () => runMemory(["recurrence", "   "], { resolveBackend: refuse("a backend"), ctx: s.ctx }),
        (error) => error.code === "missing-lesson-text",
      );
    }),
  },
  ...BACKENDS.map((backend) => ({
    name: `153/02/02 E5: a held-out same-topic pair labelled as different mistakes yields no qualifying reference, and still reports its score and threshold — ${backend}`,
    run: () => {
      const negatives = FIXTURE.pairs.filter((p) => p.label === "distinct" && p.split === "held-out");
      assert.ok(negatives.length >= 5, "the fixture holds out negatives");
      return Promise.all(negatives.map(async ({ a, b }) => {
        await withStream([
          { number: 1, lessons: [{ id: "R1", kind: lessonOf(a).kind, text: lessonOf(a).text }] },
          { number: 2, lessons: [{ id: "R2", kind: lessonOf(b).kind, text: lessonOf(b).text }] },
        ], async (s) => {
          const result = await recurrence(s, backend, lessonOf(b).text, "--exclude", "2/R2");
          assert.equal(result.qualifying, null, `${a} vs ${b}`);
          assert.equal(typeof result.score, "number", "the candidate score is still reported");
          assert.equal(result.threshold, RECURRENCE_CALIBRATION.threshold);
          assert.ok(result.score <= result.threshold);
        });
      }));
    },
  })),
  {
    name: "153/02/02 E6: an excluded candidate above the threshold and a candidate exactly at it are neither qualifying references",
    run: () => {
      const self = { recordType: "lesson", item: "68", id: "R10", text: lessonOf("68/R10").text, kind: "near-miss", title: "self" };
      const other = { recordType: "lesson", item: "45", id: "R13", text: lessonOf("45/R13").text, kind: "mistake", title: "other" };
      const text = lessonOf("68/R10").text;
      assert.ok(recurrenceScore(text, self.text) > RECURRENCE_CALIBRATION.threshold, "fixture: the self identity would score above the threshold");
      // Only the self identity: excluded, so nothing qualifies and nothing is reported.
      const alone = evaluateRecurrence({ text, records: [self], exclude: "68/R10" });
      assert.deepEqual([alone.qualifying, alone.score, alone.candidates], [null, null, []]);
      // The other candidate, with the threshold set to exactly its own score: equality is not evidence.
      const exact = recurrenceScore(text, other.text);
      const at = evaluateRecurrence({ text, records: [self, other], exclude: "68/R10", calibration: { ...RECURRENCE_CALIBRATION, threshold: exact } });
      assert.equal(at.qualifying, null, "a score exactly at the threshold does not recur");
      assert.equal(at.score, exact);
      const below = evaluateRecurrence({ text, records: [other], calibration: { ...RECURRENCE_CALIBRATION, threshold: exact - 0.000001 } });
      assert.equal(below.qualifying, "45/R13", "strictly above does");
    },
  },
  {
    name: "153/02/02 outline: memory off — no candidates and a null qualifying reference, with nothing written",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-153-02-off-"));
      try {
        const { result } = await runMemory(["recurrence", lessonOf("68/R10").text, "--json"], { config: {}, ctx: { projectRoot: root, workDir: path.join(root, "wiki", "work"), configMemory: {} } });
        assert.deepEqual([result.qualifying, result.score, result.candidates], [null, null, []]);
        assert.equal(result.threshold, RECURRENCE_CALIBRATION.threshold);
        assert.deepEqual([...(await snapshot(root)).keys()], [], "no index or source was created");
        assert.match(renderMemory("recurrence", result), /^recurrence: none \(no lesson candidates; threshold /);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "153/02/02 outline: no lessons but a high-scoring ADR — no candidates and a null qualifying reference; an ADR never matches",
    run: () => withStream([{ number: 45, adr: lessonOf("45/R13").text }], async (s) => {
      for (const backend of BACKENDS) {
        const result = await recurrence(s, backend, lessonOf("45/R13").text);
        assert.deepEqual([result.qualifying, result.score, result.candidates], [null, null, []], backend);
      }
    }),
  },
  {
    name: "153/02/02 outline: two lessons tied above the threshold — the lexically first canonical reference qualifies",
    run: () => withStream([
      { number: 45, lessons: [{ id: "R1", kind: "mistake", text: lessonOf("45/R13").text }] },
      { number: 12, lessons: [{ id: "R1", kind: "mistake", text: lessonOf("45/R13").text }] },
    ], async (s) => {
      for (const backend of BACKENDS) {
        const result = await recurrence(s, backend, lessonOf("55/R5").text);
        assert.equal(result.candidates.length, 2, backend);
        assert.equal(result.candidates[0].score, result.candidates[1].score, "a genuine tie");
        assert.ok(result.score > result.threshold, "tied above the threshold");
        assert.equal(result.qualifying, "12/R1", `${backend}: 12/R1 sorts before 45/R1`);
      }
    }),
  },
  {
    name: "153/02/02 outline: four eligible lessons with distinct scores — only the three highest are reported, in order",
    run: () => withStream([
      { number: 45, lessons: [{ id: "R13", kind: "mistake", text: lessonOf("45/R13").text }] },
      { number: 55, lessons: [{ id: "R5", kind: "near-miss", text: lessonOf("55/R5").text }] },
      { number: 43, lessons: [{ id: "R10", kind: "blocker", text: lessonOf("43/R10").text }] },
      { number: 71, lessons: [{ id: "R1", kind: "mistake", text: lessonOf("71/R1").text }] },
    ], async (s) => {
      for (const backend of BACKENDS) {
        const result = await recurrence(s, backend, lessonOf("68/R10").text);
        assert.equal(result.candidates.length, 3, backend);
        const scores = result.candidates.map((c) => c.score);
        assert.deepEqual(scores, [...scores].sort((x, y) => y - x), "highest first");
        assert.equal(new Set(scores).size, 3, "distinct scores");
        assert.ok(!result.candidates.some((c) => c.ref === "71/R1"), "the lowest is dropped");
      }
    }),
  },
  {
    name: "153/02/02: both backends reach the same decision from the same records in different retrieval orders, and recall is unchanged",
    run: () => withStream(junction(), async (s) => {
      const text = lessonOf("68/R10").text;
      const [local, graphify] = await Promise.all(BACKENDS.map((backend) => recurrence(s, backend, text, "--exclude", "68/R10")));
      assert.deepEqual(graphify, local, "identical scores, order and qualifying reference");

      // Retrieval order is the backend's: hand the SAME records back reversed and the decision is the same.
      const recalled = await s.backends.local.recall(text, {}, { limit: Infinity }, s.ctx);
      const orders = [recalled.records, [...recalled.records].reverse()];
      const decisions = await Promise.all(orders.map(async (records) => {
        const { result } = await runMemory(["recurrence", text, "--exclude", "68/R10", "--json"], { resolveBackend: async () => ({ ...s.backends.local, recall: async () => ({ records }) }), ctx: s.ctx });
        return result;
      }));
      assert.deepEqual(decisions[1], decisions[0]);

      // Ordinary recall is untouched: the kind filter still narrows, and recurrence did not change it.
      const nearMiss = await s.backends.local.recall("junction", { kind: "near-miss" }, { limit: Infinity }, s.ctx);
      assert.ok(nearMiss.records.length > 0 && nearMiss.records.every((r) => r.kind === "near-miss"), "kind filtering is unchanged");
      assert.equal(memoryJson("recall", nearMiss), nearMiss.records, "recall still projects its records array");
    }),
  },
  {
    name: "153/02/02: the decision is a pure function of its inputs — repeated runs print byte-identical results",
    run: () => withStream(junction(), async (s) => {
      const text = lessonOf("68/R10").text;
      const runs = await Promise.all([1, 2, 3].map(() => recurrence(s, "local", text, "--exclude", "68/R10")));
      assert.deepEqual(runs[1], runs[0]);
      assert.deepEqual(runs[2], runs[0]);
      assert.equal(JSON.stringify(runs[1]), JSON.stringify(runs[0]));
    }),
  },
];
