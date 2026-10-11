// Traceability wiring for milestone 148 / story 03 (story-retrospectives-are-indexed), task
//   00_a-storys-retrospective-is-recalled-under-its-ref.feature
//
// ADR-006: RETROSPECTIVE.md rides the any-item, subtree-scoped leg OUTCOME.md already rides. Built
// from the knowledge factories over a temp stream laid out as the feature's fixture; the walk order
// is the `items` order handed in, exactly as `listItemsCacheFirst` would answer it. E8 (the live
// corpus still holds every eval pair) is FF-14801's own file,
// `test/arch/memory/acd-memory-retrieval-eval.test.mjs`.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalIndexing } from "@aof/knowledge/memory/local-indexing";
import { recall } from "@aof/knowledge/memory/local-retrieval";

function retro(item, lessons) {
  return [
    `# ${item} · Retrospective`,
    "",
    ...lessons.flatMap(([id, title]) => [
      `## ${id} — ${title}`,
      "",
      "- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer",
      `- **What happened:** ${title}.`,
      "- **Why:** y",
      "- **Lesson:** z",
      "",
    ]),
  ].join("\n");
}

const MILESTONE = "134_milestone_discovery";
const STORY_01 = `${MILESTONE}/stories/01_story_the-baseline-is-counted`;
const STORY_02 = `${MILESTONE}/stories/02_story_the-map`;

async function fixtureStream({ withArchAndOutcome = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-148-03-"));
  const workDir = path.join(root, "wiki", "work");
  const write = async (rel, text) => {
    await mkdir(path.dirname(path.join(workDir, rel)), { recursive: true });
    await writeFile(path.join(workDir, rel), text);
  };
  await write(`${MILESTONE}/RETROSPECTIVE.md`, retro("134", [["R1", "A milestone lesson one"], ["R2", "A milestone lesson two"], ["R3", "A milestone lesson three"]]));
  await write(`${STORY_01}/RETROSPECTIVE.md`, retro("134/01", [["R1", "a contract cited a file no branch carried"], ["R2", "A second story lesson"]]));
  await write(`${STORY_02}/RETROSPECTIVE.md`, retro("134/02", [["R1", "the map is a document"]]));
  await write("145_story_loop-diagram/RETROSPECTIVE.md", retro("145", [["R1", "Loop one"], ["R2", "Loop two"], ["R3", "Loop three"]]));
  await mkdir(path.join(workDir, "150_uat_gate"), { recursive: true });
  if (withArchAndOutcome) {
    await write(`${MILESTONE}/ARCHITECTURE.md`, "# 134 · Architecture\n\n## ADR-001: One decision\n\n**Status:** Accepted\n\n**Decision.** one.\n");
    await write(`${MILESTONE}/OUTCOME.md`, "# 134 · Outcome\n\n## Delivered\n\n### The map is counted\nA delivered capability.\n");
  }
  const at = (rel) => path.join(workDir, rel);
  const items = [
    { type: "milestone", parent: null, ref: "134", number: "134", slug: "discovery", dir: at(MILESTONE) },
    { type: "story", parent: "134", ref: "134/01", number: "01", slug: "the-baseline-is-counted", dir: at(STORY_01) },
    { type: "story", parent: "134", ref: "134/02", number: "02", slug: "the-map", dir: at(STORY_02) },
    { type: "story", parent: null, ref: "145", number: "145", slug: "loop-diagram", dir: at("145_story_loop-diagram") },
    { type: "uat", parent: null, ref: "150", number: "150", slug: "gate", dir: at("150_uat_gate") },
  ];
  const { buildRecords } = createLocalIndexing({
    listItemsCacheFirst: async () => items,
    localItemsOnly: (rows) => ({ items: rows, skipped: [] }),
    reportReachThroughSkips: () => {},
    ensureAofGitignore: async () => {},
    importStoreRoot: () => path.join(root, ".aof", "imports"),
    ARCHITECTURE_FILE: "ARCHITECTURE.md",
    RETROSPECTIVE_FILE: "RETROSPECTIVE.md",
    AOF_FILE: "AOF.md",
  });
  const ctx = { workDir, projectRoot: root, configMemory: {} };
  return { root, build: (only = null) => buildRecords(only, ctx) };
}

async function withRecords(opts, run) {
  const stream = await fixtureStream(opts);
  try {
    await run(stream);
  } finally {
    await rm(stream.root, { recursive: true, force: true });
  }
}

const lessonsOf = (records, item) => records.filter((r) => r.recordType === "lesson" && r.item === item);
const lineOf = (source) => Number(source.slice(source.lastIndexOf(":") + 1));

export const storyRetrospectivesIndexedTests = [
  {
    name: "148/03/00 E1: a nested story's lessons carry the story's ref",
    run: () => withRecords({}, async ({ build }) => {
      const lessons = lessonsOf(await build(), "134/01");
      assert.deepEqual(lessons.map((r) => r.id), ["R1", "R2"]);
      const r1 = lessons[0];
      assert.equal(r1.source.slice(0, r1.source.lastIndexOf(":")), `${STORY_01}/RETROSPECTIVE.md`);
      assert.equal(lineOf(r1.source), 3, "the source line is the R1 heading's");
    }),
  },
  {
    name: "148/03/00 E2: a parentless story's lessons carry its number",
    run: () => withRecords({}, async ({ build }) => {
      assert.deepEqual(lessonsOf(await build(), "145").map((r) => r.id), ["R1", "R2", "R3"]);
    }),
  },
  {
    name: "148/03/00 E3: a milestone's own retrospective yields exactly its own lessons",
    run: () => withRecords({}, async ({ build }) => {
      const lessons = lessonsOf(await build(), "134");
      assert.deepEqual(lessons.map((r) => r.id), ["R1", "R2", "R3"]);
      for (const r of lessons) assert.equal(r.source.slice(0, r.source.lastIndexOf(":")), `${MILESTONE}/RETROSPECTIVE.md`);
    }),
  },
  {
    name: "148/03/00 E4: an item carrying no retrospective yields no lesson",
    run: () => withRecords({}, async ({ build }) => {
      assert.deepEqual(lessonsOf(await build(), "150"), []);
    }),
  },
  {
    name: "148/03/00: within one milestone, records keep their order: lessons, then ADRs, then deliveries",
    run: () => withRecords({ withArchAndOutcome: true }, async ({ build }) => {
      const types = (await build()).filter((r) => r.item === "134").map((r) => r.recordType);
      assert.deepEqual(types, ["lesson", "lesson", "lesson", "adr", "capability"]);
    }),
  },
  {
    name: "148/03/00 E5: a milestone-scoped recall returns a story's lesson",
    run: () => withRecords({}, async ({ build }) => {
      const result = await recall("contract cited a file no branch carried", { item: "134" }, { limit: 50 }, { records: await build() });
      assert.ok(result.records.some((r) => r.id === "R1" && r.item === "134/01"), "R1 of 134/01 is returned");
    }),
  },
  {
    name: "148/03/00 E6: a story-scoped recall returns none of its sibling's lessons",
    run: () => withRecords({}, async ({ build }) => {
      const result = await recall("contract cited a file no branch carried", { item: "134/02" }, { limit: 50 }, { records: await build() });
      assert.ok(result.records.length > 0, "the scope still answers its own lesson");
      assert.ok(!result.records.some((r) => r.item === "134/01"), "no record of 134/01");
    }),
  },
  {
    name: "148/03/00 E7: a milestone-scoped rebuild reaches its stories' retrospectives",
    run: () => withRecords({}, async ({ build }) => {
      const items = new Set((await build("134")).filter((r) => r.recordType === "lesson").map((r) => r.item));
      assert.deepEqual([...items], ["134", "134/01", "134/02"]);
    }),
  },
];
