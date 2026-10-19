import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// milestone 62 / story 00 — the three corpus lanes and the absence floor.
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolveCitationAtEmit } from "@aof/work/tune/provenance";

const CORPUS_LANES = _aofApplication.work.tune.corpus.CORPUS_LANES;
const assembleCorpus = _aofApplication.work.tune.corpus.assembleCorpus;
const corpusFinding = _aofApplication.work.tune.corpus.corpusFinding;
const renderCorpusReport = _aofApplication.work.tune.corpus.renderCorpusReport;
const loopPointersIn = _aofApplication.graph.work.loops.loopPointersIn;

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

// 153/05 — promoted lessons, recall ledgers and recurrence stamps in the corpus.
const META = "- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer";
const promotedLesson = (id, ...extra) => [`## ${id} — a lesson`, META, ...extra, "", "- **Lesson:** Keep it.", ""].join("\n");
const recall = (id, item, lessonId, verdict) => JSON.stringify({
  kind: "recall", id, at: "2026-10-10T10:00:00.000Z", edge: "refine.architect", actor: "architect", query: "junction", scope: {},
  records: [{ item, id: lessonId, recordType: "lesson", verdict }],
});
const ledgerOf = (...rows) => `${rows.join("\n")}\n`;
async function addMilestone(workDir, number, { retro = null, ledger = null } = {}) {
  const dir = await addItem(workDir, number);
  if (retro != null) await put(path.join(dir, "RETROSPECTIVE.md"), `# Retrospective\n\n${retro}`);
  if (ledger != null) await put(path.join(dir, "FEEDBACK.ndjson"), ledger);
  return dir;
}
const lessonsOf = (corpus) => corpus.lanes.find((entry) => entry.lane === "lessons").contribution;

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

// 157/02 — tune is a classified non-consumer of the memory index (157/ADR-003): its lanes read
// their own sources, so an ingested index holding episodic copies of the same findings, feedback
// and runs changes none of its populations.
const reindex = _aofApplication.knowledge.memory.localIndexing.reindex;
// The whole assembled corpus — every lane's population, lineage and the recall accounting.
const populations = (corpus) => JSON.stringify(corpus);

export const tuneCorpusTests = [
  {
    name: "work tune corpus 157/02 E6: an ingested memory index with episodic records changes no lane's population",
    run: () => fixture(async ({ cwd, workDir }) => {
      const item = await addMilestone(workDir, "39", {
        retro: promotedLesson("R1"),
        ledger: ledgerOf(
          JSON.stringify({ kind: "raw", id: "r1", text: "a note", actor: "qa", refs: "", at: "2026-10-10T09:00:00.000Z" }),
          JSON.stringify({ kind: "raw", id: "r2", text: "a second note", actor: "qa", refs: "", at: "2026-10-10T09:01:00.000Z" }),
          recall("k1", "39", "R1", "honoured"),
        ),
      });
      await put(path.join(item, "VERIFICATION.md"), "## Findings\n\n| id | severity | finding |\n|---|---|---|\n| F-01 | major | a |\n| F-02 | minor | b |\n| F-03 | nit | c |\n");
      for (const n of [0, 1, 2]) await addRun(item, "39", `2026-08-31T00-00-00-000Z-00${n}`);
      const before = await assembleCorpus({ cwd, lanes: lowFloors() });
      const { records } = await reindex(null, { workDir, projectRoot: cwd });
      const counts = Object.fromEntries(["finding", "feedback", "run"].map((type) => [type, records.filter((r) => r.recordType === type).length]));
      assert.deepEqual(counts, { finding: 3, feedback: 2, run: 3 }, "non-vacuity: the index holds the episodic copies");
      const after = await assembleCorpus({ cwd, lanes: lowFloors() });
      assert.equal(populations(after), populations(before));
    }),
  },
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
        "**What happened.** `packages/core/assets/loops/review-fix-rereview.md` declares `ceiling: [config:work.loop.reviewRounds]`.",
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
      await put(path.join(cwd, "packages", "core", "assets", "loops", "review-fix-rereview.md"), "# loop\n");

      const corpus = await assembleCorpus({ cwd, lanes: lowFloors() });
      const lessons = corpus.lanes.find((entry) => entry.lane === "lessons").contribution;
      assert.equal(lessons[0].target, "config:work.loop.reviewRounds");
      assert.ok(lessons[0].citations.includes("packages/core/assets/loops/review-fix-rereview.md"));
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
  {
    name: "work tune corpus 153/05: a lesson's own promotion is its target — one prompt outranks prose, several choose nothing",
    run: () => fixture(async ({ cwd, workDir }) => {
      await addMilestone(workDir, "10", {
        retro: [
          promotedLesson("R1", "- **Promoted to:** prompt:packages/core/assets/commands/refine.md"),
          promotedLesson("R2", "- **Promoted to:** prompt:a.md prompt:b.md"),
          promotedLesson("R3", "- **Promoted to:** rule:.aof/rules/x.md"),
          promotedLesson("R4", "- **Promoted to:** none"),
          promotedLesson("R5", "- **Promoted to:** prompt:a.md", "- **What happened:** it declares `config:work.loop.reviewRounds` in prose."),
          promotedLesson("R6", "- **Promoted to:** none", "- **What happened:** it declares `config:work.loop.reviewRounds` in prose."),
          promotedLesson("R7", "- **Promoted to:** rule:.aof/rules/x.md", "- **What happened:** it declares `config:work.loop.reviewRounds` in prose."),
          promotedLesson("R8"),
        ].join("\n"),
      });
      const byId = Object.fromEntries(lessonsOf(await assembleCorpus({ cwd, lanes: lowFloors() })).map((lesson) => [lesson.id, lesson]));
      assert.equal(byId.R1.target, "prompt:packages/core/assets/commands/refine.md");
      assert.equal(byId.R2.target, null, "two destinations are ambiguous, not a pick");
      assert.equal(byId.R3.target, "rule:.aof/rules/x.md", "a rule destination is carried so it can be named, not mistaken for a prompt");
      assert.equal(byId.R4.target, null);
      assert.equal(byId.R5.target, "prompt:a.md", "an explicit prompt destination outranks a pointer the prose mentions");
      assert.equal(byId.R6.target, "config:work.loop.reviewRounds", "an unpromoted lesson keeps its prose-derived target");
      assert.equal(byId.R7.target, "config:work.loop.reviewRounds", "a non-prompt destination does not displace a config pointer");
      assert.equal(byId.R8.target, null, "a legacy lesson is untouched");
      assert.equal(byId.R8.status, "", "and still carries the empty promotion it always had");
    }),
  },
  {
    name: "work tune corpus 153/05: an explicit Recurs is cited as a second document, and resolves through the retrospective's own id",
    run: () => fixture(async ({ cwd, workDir }) => {
      await addMilestone(workDir, "45", { retro: promotedLesson("R13", "- **Promoted to:** none") });
      await addMilestone(workDir, "68", { retro: promotedLesson("R10", "- **Promoted to:** none", "- **Recurs:** 45/R13") });
      const lesson = lessonsOf(await assembleCorpus({ cwd, scope: "68", lanes: lowFloors() }))[0];
      assert.ok(lesson.citations.includes("45/R13"), "the earlier lesson is cited by its qualified reference");
      assert.ok(lesson.citations.some((citation) => citation.startsWith("wiki/work/68_")));
      const resolved = resolveCitationAtEmit("45/R13", { rootDir: cwd });
      assert.equal(resolved.ok, true, "a retrospective lesson id is declared by its heading");
      assert.match(resolved.resolved.document, /^wiki\/work\/45_milestone_item-45\/RETROSPECTIVE\.md$/u);
    }),
  },
  {
    name: "work tune corpus 153/05: memory evidence reads only the selected items, and names the lane it read",
    run: () => fixture(async ({ cwd, workDir }) => {
      await addMilestone(workDir, "45", {
        retro: promotedLesson("R13", "- **Promoted to:** none"),
        ledger: ledgerOf(recall("a", "45", "R13", "honoured"), recall("b", "45", "R13", "departed")),
      });
      await addMilestone(workDir, "68", {
        retro: promotedLesson("R10", "- **Promoted to:** none", "- **Recurs:** 45/R13"),
        ledger: ledgerOf(recall("c", "45", "R13", "honoured")),
      });
      const all = await assembleCorpus({ cwd, lanes: lowFloors() });
      assert.equal(all.memory.lessons["45/R13"].surfaced, 3);
      assert.equal(all.memory.lessons["45/R13"].recurred, 1);
      assert.deepEqual(all.memory.items, ["45", "68"]);

      const scoped = await assembleCorpus({ cwd, scope: "68", lanes: lowFloors() });
      assert.deepEqual(scoped.memory.items, ["68"]);
      assert.deepEqual(scoped.memory.ledgers, ["wiki/work/68_milestone_item-68/FEEDBACK.ndjson"], "the unselected item's ledger is not opened");
      assert.equal(scoped.memory.lessons["45/R13"].surfaced, 1, "only the selected item's observation counts");
      assert.equal(scoped.memory.lessons["45/R13"].honoured, 1);
      assert.equal(scoped.memory.lessons["45/R13"].departed, 0, "the unrelated incident does not leak in");
      assert.equal(scoped.memory.lessons["45/R13"].recurred, 1, "the selected retrospective's explicit recurrence counts");
      assert.deepEqual(scoped.memory.lessons["45/R13"].evidence.observations, [{ source: "wiki/work/68_milestone_item-68/FEEDBACK.ndjson", line: 1 }]);
      assert.equal(scoped.memory.lane, "recall-ledger");
      assert.equal(scoped.lanes.length, 3, "memory is evidence beside the three declared lanes, not a fourth lane");
      assert.match(renderCorpusReport(scoped), /memory: read 1 ledger\(s\) and 1 retrospective\(s\) of 1 selected item\(s\) \(recall-ledger\)/u);
    }),
  },
  {
    name: "work tune corpus 153/05: a missing ledger is zero, a corrupt row is diagnosed with its source, and valid evidence is not called corrupt",
    run: () => fixture(async ({ cwd, workDir }) => {
      await addMilestone(workDir, "45", { retro: promotedLesson("R13", "- **Promoted to:** none") });
      await addMilestone(workDir, "46", {
        retro: promotedLesson("R1", "- **Promoted to:** none"),
        ledger: ledgerOf(recall("ok", "46", "R1", "honoured"), JSON.stringify({ kind: "recall", id: "bad" })),
      });
      await addMilestone(workDir, "47", { ledger: ledgerOf(recall("fine", "47", "R7", "departed")) });
      const corpus = await assembleCorpus({ cwd, lanes: lowFloors() });
      assert.deepEqual(corpus.memory.ledgers, ["wiki/work/46_milestone_item-46/FEEDBACK.ndjson", "wiki/work/47_milestone_item-47/FEEDBACK.ndjson"], "the item with no ledger contributes none");
      assert.equal(corpus.memory.diagnostics.length, 1);
      assert.equal(corpus.memory.diagnostics[0].source, "wiki/work/46_milestone_item-46/FEEDBACK.ndjson");
      assert.equal(corpus.memory.diagnostics[0].line, 2);
      assert.match(corpus.memory.diagnostics[0].defect, /invalid recall observation/u);
      assert.equal(corpus.memory.complete, false);
      assert.equal(corpus.memory.lessons["46/R1"].honoured, 1, "the valid row beside the corrupt one still counts");
      assert.equal(corpus.memory.lessons["47/R7"].departed, 1, "an unrelated valid ledger is intact");
      assert.equal(corpus.memory.diagnostics.some((entry) => entry.source.includes("47_")), false);
      assert.equal(corpus.memory.lessons["45/R13"], undefined, "no ledger, no observation — and no invented zero row");
    }),
  },
  {
    name: "work tune corpus 153/05: the promotion destination is where a fix goes, not what happened — it is not cited as evidence",
    run: () => fixture(async ({ cwd, workDir }) => {
      await put(path.join(cwd, "docs", "incident.md"), "# an incident\n");
      await addMilestone(workDir, "10", {
        retro: [
          promotedLesson("R1", "- **Promoted to:** prompt:packages/core/assets/commands/refine.md", "- **What happened:** see docs/incident.md and packages/core/assets/commands/refine.md"),
          promotedLesson("R2", "- **Promoted to:** prompt:/etc/aof-refine.md"),
          promotedLesson("R3", "- **Promoted to:** none", "- **What happened:** see docs/incident.md and packages/core/assets/commands/refine.md"),
        ].join("\n"),
      });
      const byId = Object.fromEntries(lessonsOf(await assembleCorpus({ cwd, lanes: lowFloors() })).map((lesson) => [lesson.id, lesson]));
      assert.ok(byId.R1.citations.includes("docs/incident.md"), "what happened is still cited");
      assert.equal(byId.R1.citations.some((citation) => citation.includes("refine.md")), false, "the file the patch edits is not evidence for the patch");
      assert.equal(byId.R2.citations.some((citation) => citation.includes("aof-refine")), false, "an absolute destination is matched by its tail");
      assert.ok(byId.R3.citations.some((citation) => citation.includes("refine.md")), "a lesson that promoted nowhere keeps every path it mentions");
    }),
  },

  // ── 160/10 (ADR-011 §2) · a snapshot is read by ref or by the row the caller already holds ──
  {
    name: "160/10 [outline] A snapshot is read by ref or by folder with the same answer (3 rows)",
    run: () => fixture(async ({ cwd, workDir }) => {
      const milestone = await addItem(workDir, "53");
      const story = path.join(milestone, "stories", "01_story_s01");
      await put(path.join(story, "STORY.md"), "---\ntype: story\nnumber: 01\nslug: s01\nparent: 53\nstatus: not-started\ntitle: S01\n---\n");
      const archived = path.join(workDir, "archive", "41_milestone_old");
      await mkdir(archived, { recursive: true });
      for (const [dir, who] of [[milestone, "53"], [story, "53/01"], [archived, "41"]]) await addSnapshot(dir, { agents: [{ sessionId: `s-${who}`, attributedTo: who }] });
      const rows = await listStream(workDir);
      for (const [label, ref] of [["milestone 53", "53"], ["story 53/01", "53/01"], ["an archived milestone", "41"]]) {
        const row = rows.find((candidate) => candidate.ref === ref);
        assert.ok(row != null, `${label} is a row of the stream`);
        const byRef = await readLatestSnapshot({ cwd, ref });
        const byFolder = await readLatestSnapshot({ cwd, ref, item: row });
        assert.ok(byRef != null && byRef.json.agents[0].attributedTo === ref, `${label}: the read by ref found its snapshot`);
        assert.deepEqual(byFolder, byRef, `${label}: both reads return the same snapshot`);
      }
    }),
  },
  {
    name: "160/10 A ref that resolves to nothing is still refused by name",
    run: () => fixture(async ({ cwd, workDir }) => {
      await addSnapshot(await addItem(workDir, "53"), { agents: [] });
      assert.equal(await readLatestSnapshot({ cwd, ref: "99" }), null, "the snapshot read of 99 finds nothing, as before");
      await assert.rejects(_aofApplication.work.observe.observeMilestone({ cwd, ref: "99" }), (error) => {
        assert.equal(error.code, "milestone-not-found");
        assert.ok(error.message.includes('"99"'), `the refusal names "99": ${error.message}`);
        return true;
      });
    }),
  },
];

const readLatestSnapshot = _aofApplication.work.observe.readLatestSnapshot;
const listStream = _aofWorkspace.work.listItems;
