// milestone 62 / story 00 — the three corpus lanes and the absence floor.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";

import {
  CORPUS_LANES,
  assembleCorpus,
  corpusFinding,
  renderCorpusReport,
} from "../../src/work-tune/corpus.mjs";
import { loopPointersIn } from "../../src/work/loops.mjs";

async function put(file, body) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}

async function fixture(run) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "aof-tune-corpus-"));
  try {
    return await run({ cwd, workDir: path.join(cwd, "wiki", "work") });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

const lowFloors = () => CORPUS_LANES.map((entry) => Object.freeze({ ...entry, floor: 1 }));

async function addItem(workDir, number, slug = `item-${number}`) {
  const dir = path.join(workDir, `${number}_milestone_${slug}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function addLesson(itemDir, id = 1) {
  await put(path.join(itemDir, "RETROSPECTIVE.md"), [
    `## R${id} — A lesson`,
    "- **Kind:** near-miss · **Area:** delivery · **Stage:** build · **Owner:** developer",
    "",
    "**What happened.** A fixture was read.",
    "",
    "**Why.** The corpus needs a real parser input.",
    "",
    "**Lesson.** Read through the source's home.",
    "",
  ].join("\n"));
}

async function addRun(itemDir, itemRef, runId = "2026-08-31T00-00-00-000Z-000") {
  await put(path.join(itemDir, "runs", `${runId}.json`), JSON.stringify({
    runId, itemRef, state: "done", attempt: 1, outcome: "done",
    createdAt: "2026-08-31T00:00:00.000Z", updatedAt: "2026-08-31T00:01:00.000Z",
  }));
}

async function addSnapshot(itemDir, json, stamp = "2026-08-31T00-00-00-000Z") {
  const dir = path.join(itemDir, "observability", "snapshots", stamp);
  await put(path.join(dir, "report.md"), "# observed\n");
  if (json !== undefined) await put(path.join(dir, "agents.json"), typeof json === "string" ? json : JSON.stringify(json));
}

export const tuneCorpusTests = [
  {
    name: "work tune corpus: all three lanes state root, count and floor on object and report faces",
    run: () => fixture(async ({ cwd, workDir }) => {
      const item = await addItem(workDir, "01", "alpha");
      await addLesson(item);
      await addRun(item, "01");
      await addSnapshot(item, { sessions: [], agents: [], runs: { count: 0, unattributedCount: 0 } });

      const corpus = await assembleCorpus({ cwd, lanes: lowFloors() });
      assert.equal(corpus.matched, true);
      assert.deepEqual(corpus.lanes.map((entry) => entry.lane), ["lessons", "lineage", "observations"]);
      for (const result of corpus.lanes) {
        assert.deepEqual(Object.keys(result.read), ["sweep", "root", "what", "basis", "count", "floor"]);
        assert.equal(result.read.count, 1, `${result.lane}: counted its fixture population`);
        assert.equal(result.read.floor, 1, `${result.lane}: reports the declared floor beside it`);
        assert.ok(result.read.root.includes(workDir), `${result.lane}: names the root walked`);
        assert.notEqual(result.contribution, null, `${result.lane}: contributes what it read at the floor`);
      }
      const rendered = renderCorpusReport(corpus);
      for (const lane of ["lessons", "lineage", "observations"]) {
        assert.match(rendered, new RegExp(`${lane}: 1 / floor 1`, "u"));
      }
      assert.match(rendered, /series 1; readings 1; attributed 0/u);
      assert.doesNotMatch(rendered, /healthy|unhealthy/iu, "the report shows arithmetic, not a hidden verdict");
    }),
  },
  {
    name: "work tune corpus: a lesson's exact loop config pointer becomes its target through the registry grammar",
    run: () => fixture(async ({ cwd, workDir }) => {
      const item = await addItem(workDir, "83", "agent-layer-bounds");
      await put(path.join(item, "RETROSPECTIVE.md"), [
        "## R1 — Trace the structured pointer",
        "- **Kind:** near-miss · **Area:** delivery · **Stage:** review · **Owner:** architect",
        "",
        "**What happened.** `src/bundle/loops/review-fix-rereview.md` declares `ceiling: [config:work.loop.reviewRounds]`.",
        "",
        "**Lesson.** Structured pointers are source facts.",
        "",
        "## R2 — Embedded pointer-like text is not a declaration",
        "- **Kind:** near-miss · **Area:** delivery · **Stage:** review · **Owner:** architect",
        "",
        "**What happened.** A URL contained https://example.invalid/config:work.loop.reviewRounds and a word contained xconfig:work.loop.reviewRounds.",
        "",
        "**Lesson.** Larger-token substrings are prose, not structured pointers.",
        "",
      ].join("\n"));
      await put(path.join(cwd, "src", "bundle", "loops", "review-fix-rereview.md"), "# loop\n");

      const corpus = await assembleCorpus({ cwd, lanes: lowFloors() });
      const lessons = corpus.lanes.find((entry) => entry.lane === "lessons").contribution;
      assert.equal(lessons[0].target, "config:work.loop.reviewRounds");
      assert.ok(lessons[0].citations.includes("src/bundle/loops/review-fix-rereview.md"));
      assert.ok(lessons[0].citations.some((citation) => citation.startsWith("wiki/work/83_")));
      assert.equal(lessons[1].target, null, "embedded URL and larger-token text cannot promote a lesson target");

      assert.deepEqual(loopPointersIn([
        "config:work.loop.plain",
        "`config:work.loop.backticked`",
        "[config:work.loop.bracketed]",
        "xconfig:work.loop.embedded",
        "https://example.invalid/config:work.loop.url",
        "/config:work.loop.path",
        "[config:work..invalid]",
      ].join(" ")).map((pointer) => pointer.raw), [
        "config:work.loop.plain",
        "config:work.loop.backticked",
        "config:work.loop.bracketed",
      ]);
    }),
  },
  {
    name: "work tune corpus: below-floor lanes are all findings and contribute nothing",
    run: () => fixture(async ({ cwd, workDir }) => {
      await addItem(workDir, "01", "empty");
      const corpus = await assembleCorpus({ cwd, scope: "01" });
      assert.equal(corpus.findings.length, 3, "every starved lane is named, not only the first");
      for (const result of corpus.lanes) {
        assert.equal(result.contribution, null, `${result.lane}: a starved lane contributes nothing`);
        assert.equal(result.findings[0].code, "tune-ran-on-nothing");
        assert.ok(result.findings[0].message.includes(result.lane));
        assert.ok(result.findings[0].message.includes(`required ${result.read.floor}`));
        assert.ok(result.findings[0].message.includes("scope: 01"), "the fixed floor finding names its scope");
      }
      assert.match(renderCorpusReport(corpus), /tune-ran-on-nothing/u, "the finding survives the human face");

      const at = { sweep: "probe", root: "/r", what: "records", basis: "disk", count: 2, floor: 2 };
      const short = { ...at, count: 1 };
      assert.equal(corpusFinding(at), null, "at the floor is a read");
      assert.equal(corpusFinding({ ...at, count: 3 }), null, "above the floor is a read");
      assert.equal(corpusFinding(short)?.code, "tune-ran-on-nothing", "one short is a finding");
    }),
  },
  {
    name: "work tune corpus: observation series, readings and attributed readings stay distinct",
    run: () => fixture(async ({ cwd, workDir }) => {
      const absent = await addItem(workDir, "01", "absent");
      await mkdir(path.join(absent, "observability", "snapshots"), { recursive: true });
      const unreadable = await addItem(workDir, "02", "unreadable");
      await addSnapshot(unreadable, undefined);
      const torn = await addItem(workDir, "03", "torn");
      await addSnapshot(torn, "{not-json");
      const empty = await addItem(workDir, "04", "empty-reading");
      await addSnapshot(empty, {
        sessions: [],
        agents: [],
        // Favorable run arithmetic is not an agent attribution. Only the
        // snapshot's attribution-bearing agent/session join moves that count.
        runs: { count: 5, unattributedCount: 0 },
      });
      const attributed = await addItem(workDir, "05", "attributed");
      await addSnapshot(attributed, {
        sessions: ["session-1"],
        agents: [{ sessionId: "session-1", attributedTo: "05" }],
        runs: { count: 1, unattributedCount: 0 },
      });

      const corpus = await assembleCorpus({ cwd, lanes: lowFloors() });
      const observations = corpus.lanes.find((entry) => entry.lane === "observations");
      assert.deepEqual(
        observations.raw.entries.map((entry) => entry.state),
        ["no-series", "unreadable", "unreadable", "read-empty", "read-attributed"],
      );
      assert.deepEqual(
        { series: observations.raw.series, readings: observations.raw.readings, attributed: observations.raw.attributed },
        { series: 4, readings: 2, attributed: 1 },
      );
      assert.equal(observations.read.count, 2, "the floor is over readings, not series or attribution content");
      assert.deepEqual(observations.findings, [], "readings that name nothing still mean the lane read");
    }),
  },
  {
    name: "work tune corpus: scope is the shared stream scope, and an unresolved scope runs no lane",
    run: () => fixture(async ({ cwd, workDir }) => {
      const alpha = await addItem(workDir, "01", "alpha");
      await addLesson(alpha);
      const stories = path.join(alpha, "stories", "00_story_child");
      await mkdir(stories, { recursive: true });
      await addLesson(stories, 2);
      const beta = await addItem(workDir, "02", "beta");
      await addLesson(beta, 3);

      const all = await assembleCorpus({ cwd, lanes: lowFloors() });
      assert.deepEqual(all.items, ["01", "01/00", "02"]);
      assert.deepEqual((await assembleCorpus({ cwd, scope: "01", lanes: lowFloors() })).items, ["01", "01/00"]);
      assert.deepEqual((await assembleCorpus({ cwd, scope: "01/00", lanes: lowFloors() })).items, ["01/00"]);
      assert.deepEqual((await assembleCorpus({ cwd, scope: "alpha", lanes: lowFloors() })).items, ["01"]);
      assert.deepEqual((await assembleCorpus({ cwd, scope: "child", lanes: lowFloors() })).items, ["01/00"]);
      assert.deepEqual((await assembleCorpus({ cwd, scope: " 01 ", lanes: lowFloors() })).items, ["01", "01/00"]);

      for (const scope of ["01-02", "99", "does-not-exist", "01/99", "01_milestone_alpha"]) {
        const none = await assembleCorpus({ cwd, scope, lanes: lowFloors() });
        assert.equal(none.matched, false, `${scope}: matches nothing`);
        assert.deepEqual(none.lanes, [], `${scope}: no lane ran`);
        assert.deepEqual(none.findings, [], `${scope}: no lane is falsely called starved`);
        assert.match(renderCorpusReport(none), /matched no work items/u);
      }

      const alternate = path.join(cwd, "alternate-work");
      await mkdir(alternate, { recursive: true });
      await assert.rejects(
        () => assembleCorpus({ cwd, workDir: alternate, lanes: lowFloors() }),
        (error) => error?.code === "work-tune-workdir-unsupported" && /cwd\/wiki\/work/u.test(error.message),
        "an alternate work root is explicitly refused before readers can mix trees",
      );
    }),
  },
];
