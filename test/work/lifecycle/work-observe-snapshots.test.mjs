// Traceability wiring for milestone 68 / story 05 — append-only snapshots.
//
// Covers EVERY @executable scenario in the two task features:
//   tasks/00_never-overwrite.feature
//   tasks/01_legacy-snapshots-marked.feature
// exercising the REAL src/work/observe.mjs in-process against a temp fixture repo
// (mkdtemp → fake Claude transcript store → observeMilestone / markLegacySnapshot /
// readLatestSnapshot → rm in finally). One test object per @executable scenario
// (the Scenario-Outline rows folded into one entry iterating the rows), each name
// tracing to feature + scenario. node:assert/strict.
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const {
  observeMilestone,
  markLegacySnapshot,
  readLatestSnapshot,
  projectSlug,
  PRE68_MINER,
  PRE68_DERIVATION_MARKER,
  PRE68_JSON_KEY,
} = await import("../../../src/work/observe.mjs");

// A minimal, valid transcript so observeMilestone finds one agent and renders a report.
function fixtureTranscript() {
  const lines = [
    { type: "user", timestamp: "2026-08-20T10:00:00.000Z", message: { role: "user", content: "You are the developer for milestone 68 ..." } },
    { type: "assistant", timestamp: "2026-08-20T10:01:00.000Z", message: { model: "claude-opus-4-8", content: [{ type: "text", text: "working" }], usage: { output_tokens: 100, input_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 200 } } },
    { type: "assistant", timestamp: "2026-08-20T10:02:00.000Z", message: { model: "claude-opus-4-8", content: [{ type: "text", text: "done" }], usage: { output_tokens: 30, input_tokens: 1, cache_read_input_tokens: 50, cache_creation_input_tokens: 0 } } },
  ];
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

const T0 = Date.parse("2026-08-20T10:00:00.000Z");
const later = (hours) => new Date(T0 + hours * 3600 * 1000).toISOString();

async function makeItem() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-snap-"));
  const home = await mkdtemp(path.join(os.tmpdir(), "aof-snap-home-"));
  const folder = "68_milestone_loop-telemetry";
  const milestoneDir = path.join(repo, "wiki", "work", folder);
  await mkdir(milestoneDir, { recursive: true });
  const slug = projectSlug(repo);
  const subDir = path.join(home, ".claude", "projects", slug, "sess-1", "subagents");
  await mkdir(subDir, { recursive: true });
  await writeFile(path.join(subDir, "agent-abc.meta.json"), JSON.stringify({ agentType: "aof-developer", description: "Build story 68/05" }));
  await writeFile(path.join(subDir, "agent-abc.jsonl"), fixtureTranscript());
  return { repo, home, folder, item: { ref: "68", dir: milestoneDir }, obsDir: path.join(milestoneDir, "observability") };
}

async function snapshotNames(obsDir) {
  try {
    const e = await readdir(path.join(obsDir, "snapshots"), { withFileTypes: true });
    return e.filter((d) => d.isDirectory()).map((d) => d.name).sort();
  } catch {
    return [];
  }
}

export const workObserveSnapshotsTests = [
  // ══ 00_never-overwrite.feature ══
  // Scenario: observing twice leaves the first snapshot byte-identical
  {
    name: "work-observe-snapshots/00 observing twice leaves the first snapshot byte-identical and writes a new one alongside it",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        const first = await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });
        const firstReport = await readFile(first.written.reportPath, "utf8");
        const firstJson = await readFile(first.written.jsonPath, "utf8");

        const second = await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(2), write: true });

        // The first snapshot's bytes are unchanged.
        assert.equal(await readFile(first.written.reportPath, "utf8"), firstReport, "the first report's bytes are unchanged");
        assert.equal(await readFile(first.written.jsonPath, "utf8"), firstJson, "the first agents.json's bytes are unchanged");
        // A new snapshot has been written alongside it.
        const names = await snapshotNames(obsDir);
        assert.equal(names.length, 2, "two snapshots coexist on disk");
        assert.notEqual(first.written.timestamp, second.written.timestamp, "the two snapshots are distinct by their timestamp");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario: each snapshot is identifiable by when it was taken
  {
    name: "work-observe-snapshots/00 each snapshot is identifiable by when it was taken, and their order is determinable without reading content",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(3), write: true });
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(2), write: true });

        const names = await snapshotNames(obsDir);
        assert.equal(names.length, 3, "three snapshots coexist");
        // Folder names are sortable timestamps — the order is determinable from the
        // names alone, never by opening a file.
        const sorted = [...names].sort();
        assert.deepEqual(names, sorted, "the snapshot folder names are already in determinable (timestamp) order");
        // Each name is identifiable as a moment in time, and no two are equal.
        assert.equal(new Set(names).size, 3, "each snapshot is distinguishable by the moment it was taken");
        assert.match(names[0], /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/, "a snapshot name carries its timestamp");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario: the read path resolves the newest snapshot
  {
    name: "work-observe-snapshots/00 the read path resolves the newest snapshot and leaves the older ones unchanged",
    async run() {
      const { repo, home, item } = await makeItem();
      try {
        const old = await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });
        const oldReportBytes = await readFile(old.written.reportPath, "utf8");
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(4), write: true });

        const latest = await readLatestSnapshot({ cwd: repo, ref: item.ref });
        assert.ok(latest, "the read path resolves a snapshot");
        // The newest is the last timestamped snapshot folder in sort order — the read
        // path returns exactly that one (the 4h-later run, not the 1h one).
        assert.equal(latest.timestamp, (await snapshotNames(path.join(repo, "wiki", "work", "68_milestone_loop-telemetry", "observability"))).at(-1), "the read path resolves the newest snapshot");
        assert.notEqual(latest.timestamp, old.written.timestamp, "the resolved snapshot is not the older one");
        assert.match(latest.report, /Observability — milestone 68/);
        // The older snapshots remain on disk, byte-identical.
        assert.equal(await readFile(old.written.reportPath, "utf8"), oldReportBytes, "the older snapshot remains unchanged on disk");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a citation stays valid after later runs
  {
    name: "work-observe-snapshots/00 a cited snapshot still holds the cited figures and remains resolvable by the recorded reference after later runs",
    async run() {
      const { repo, home, item } = await makeItem();
      try {
        // A retrospective cites the first snapshot's figures and records its reference
        // (its path on disk).
        const cited = await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });
        const citedPath = cited.written.reportPath;
        const citedBytes = await readFile(citedPath, "utf8");
        const citedFigures = /[\s\S]*/.exec(citedBytes)[0].slice(0, 400);

        // The item is observed several more times.
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(2), write: true });
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(3), write: true });
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(4), write: true });

        // The cited snapshot still holds the cited figures...
        const stillCited = await readFile(citedPath, "utf8");
        assert.equal(stillCited, citedBytes, "the cited snapshot's bytes are unchanged by later runs");
        assert.equal(stillCited.slice(0, 400), citedFigures, "the cited figures still read exactly what was cited");
        // ...and it is still resolvable by the reference the retrospective recorded.
        assert.equal(citedPath, cited.written.reportPath, "the recorded reference resolves the same file");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a read-only observe writes nothing at all
  {
    name: "work-observe-snapshots/00 a read-only observe writes nothing and leaves the existing snapshot's bytes unchanged",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });
        const existing = await readLatestSnapshot({ cwd: repo, ref: item.ref });
        const existingBytes = await readFile(existing.reportPath, "utf8");
        const beforeNames = await snapshotNames(obsDir);

        const res = await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(2), write: false });

        assert.equal(res.written, null, "no snapshot is written on a read-only observe");
        assert.deepEqual(await snapshotNames(obsDir), beforeNames, "no new snapshot appears");
        assert.equal(await readFile(existing.reportPath, "utf8"), existingBytes, "the existing snapshot's bytes are unchanged");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },

  // ══ 01_legacy-snapshots-marked.feature ══
  // Scenario: an existing snapshot gains a header naming what produced it
  {
    name: "work-observe-snapshots/01 an existing pre-68 snapshot gains a header naming the pre-68 miner and the defects it is subject to",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        await mkdir(obsDir, { recursive: true });
        const reportPath = path.join(obsDir, "report.md");
        const body = "# Observability — milestone 45\n\nsome cited figures\n";
        await writeFile(reportPath, body, "utf8");
        const jsonPath = path.join(obsDir, "agents.json");
        await writeFile(jsonPath, JSON.stringify({ milestone: "45", agents: [{ id: "a", tokens: { out: 180 } }] }), "utf8");

        // Marking runs as part of an observe write (and is directly callable too).
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });

        const header = await readFile(reportPath, "utf8");
        assert.match(header, new RegExp(PRE68_DERIVATION_MARKER), "the report carries the derivation marker");
        assert.match(header, new RegExp(PRE68_MINER), "the header names the pre-68 miner");
        assert.match(header, /before this milestone/, "the header states it was produced by the miner in use before this milestone");
        // The header names the defects that miner is subject to.
        assert.match(header, /count one agent run against two items/, "the header names the double-count defect");
        assert.match(header, /zero where the true figure is not zero/, "the header names the blind toolchain classifier defect");
        assert.match(header, /written over an earlier snapshot/, "the header names the in-place overwrite defect");

        const j = JSON.parse(await readFile(jsonPath, "utf8"));
        assert.ok(j[PRE68_JSON_KEY], "the agents.json carries a provenance key");
        assert.equal(j[PRE68_JSON_KEY].miner, PRE68_MINER, "the JSON header names the pre-68 miner");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario: the marked snapshot's figures are untouched
  {
    name: "work-observe-snapshots/01 a marked snapshot's figures are unchanged — none recomputed, corrected or removed",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        await mkdir(obsDir, { recursive: true });
        // A legacy agents.json carrying known figures, including a WRONG figure (the
        // whole point of marking-not-migrating: the wrong number with provenance
        // stated is evidence; a silently-replaced number is not).
        const figures = { milestone: "45", agents: [{ id: "a", tokens: { out: 180 }, stalls: 1 }], summary: { spanMs: 300000 } };
        const jsonPath = path.join(obsDir, "agents.json");
        await writeFile(jsonPath, JSON.stringify(figures), "utf8");

        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });

        const marked = JSON.parse(await readFile(jsonPath, "utf8"));
        assert.ok(marked[PRE68_JSON_KEY], "the snapshot is marked");
        assert.equal(marked.milestone, "45", "milestone figure unchanged");
        assert.equal(marked.agents[0].tokens.out, 180, "the wrong-but-real token figure is left exactly as it was");
        assert.equal(marked.agents[0].stalls, 1, "the stall count is unchanged");
        assert.equal(marked.summary.spanMs, 300000, "the span figure is unchanged");
        // No figure was recomputed, corrected or removed — the provenance key is the
        // ONLY addition.
        assert.equal(Object.keys(marked).length, Object.keys(figures).length + 1, "exactly one key was added (the provenance) and nothing else");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario: a snapshot written after this milestone carries no such header
  {
    name: "work-observe-snapshots/01 a post-this-milestone snapshot carries no pre-68 header and is distinguishable from a marked one without reading figures",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        // A legacy snapshot exists (will be marked)…
        await mkdir(obsDir, { recursive: true });
        const reportPath = path.join(obsDir, "report.md");
        await writeFile(reportPath, "# Observability — milestone 45\n\nold\n", "utf8");

        // …and a NEW snapshot is written after this milestone.
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });

        const latest = await readLatestSnapshot({ cwd: repo, ref: item.ref });
        assert.ok(latest, "a new snapshot exists");
        // Its markdown carries no pre-68 derivation header.
        assert.doesNotMatch(latest.report, new RegExp(PRE68_DERIVATION_MARKER), "the new report carries no pre-68 header");
        assert.doesNotMatch(latest.report, new RegExp(PRE68_MINER), "the new report never names the pre-68 miner");
        assert.equal(latest.json[PRE68_JSON_KEY], undefined, "the new agents.json carries no provenance key");
        // It is distinguishable from the marked legacy snapshot WITHOUT reading its
        // figures — by location: it lives under snapshots/<ts>/, the legacy at the root.
        assert.ok(latest.dir.includes(path.join("snapshots", latest.timestamp)), "the new snapshot lives under observability/snapshots/");
        assert.match(await readFile(reportPath, "utf8"), new RegExp(PRE68_DERIVATION_MARKER), "the root legacy report is marked");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario: marking is not repeated on a snapshot already marked
  {
    name: "work-observe-snapshots/01 marking is not repeated — an already-marked snapshot carries exactly one derivation header and unchanged figures",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        await mkdir(obsDir, { recursive: true });
        const reportPath = path.join(obsDir, "report.md");
        await writeFile(reportPath, "# Observability — milestone 45\n\nold figures\n", "utf8");

        const first = await markLegacySnapshot({ filePath: reportPath });
        assert.equal(first.marked, true, "first marking marks the snapshot");
        const once = await readFile(reportPath, "utf8");
        assert.equal((once.match(new RegExp(PRE68_DERIVATION_MARKER, "g")) || []).length, 1, "exactly one marker after the first marking");

        const second = await markLegacySnapshot({ filePath: reportPath });
        assert.equal(second.marked, false, "second marking marks nothing");
        assert.equal(second.alreadyMarked, true, "the snapshot reports as already marked");
        const twice = await readFile(reportPath, "utf8");
        assert.equal((twice.match(new RegExp(PRE68_DERIVATION_MARKER, "g")) || []).length, 1, "still exactly one derivation header");
        assert.equal(twice, once, "an already-marked snapshot is left byte-identical (figures unchanged)");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  // Scenario Outline: what the header tells a reader
  {
    name: "work-observe-snapshots/01 the header tells a reader the four provenance facts — pre-68 producer, possible double-count, blind toolchain figures, possible overwrite",
    async run() {
      const { repo, home, item, obsDir } = await makeItem();
      try {
        await mkdir(obsDir, { recursive: true });
        const reportPath = path.join(obsDir, "report.md");
        await writeFile(reportPath, "# Observability\n", "utf8");
        await observeMilestone({ cwd: repo, ref: item.ref, home, env: {}, generatedAt: later(1), write: true });
        const header = await readFile(reportPath, "utf8");

        const facts = [
          ["that the snapshot was produced by the miner in use before this milestone", /produced by the transcript miner in use before this milestone/],
          ["that its attribution may count one agent run against two items", /count one agent run against two items/],
          ["that its toolchain figures may read zero where the true figure is not", /zero where the true figure is not zero/],
          ["that it may itself have been written over an earlier snapshot", /written over an earlier snapshot/],
        ];
        for (const [fact, pattern] of facts) {
          assert.match(header, pattern, `the header states: ${fact}`);
        }
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
];
