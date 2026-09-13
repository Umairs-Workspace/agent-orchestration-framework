// Traceability wiring for milestone 124 / story 00, tasks `02_the-lane-names-each-unwitnessed-edge`
// and `03_the-lane-reports-its-denominator`.
//
// Covers the @executable scenarios of
//   wiki/work/124_milestone_the-edges-aof-does-not-draw/stories/00_story_the-census-reports-its-denominator/
//     tasks/02_the-lane-names-each-unwitnessed-edge.feature
//     tasks/03_the-lane-reports-its-denominator.feature
// except the two that are claims about THIS REPOSITORY'S OWN STREAM rather than about the lane
// (02's "how a real edge in this stream is classified" and 03's "the census over this stream
// closes, and is not vacuous"), which live with FF-12401 in
// `test/arch/work/acd-census-reports-its-denominator.test.mjs` — the one place the real stream is
// read, so the two suites cannot come to measure it two ways.
//
// ONE LANE, APPENDED, AND PURE. `CHECK_GROUPS` is an append-only array of pure
// `(snapshot, ctx) => Finding[]` functions; 124 appends one entry, the shape 66/02, 54/04 and
// 78/03 each used. Most of what follows is therefore asserted against LITERAL snapshots whose
// item paths name a directory that does not exist — not for convenience: a lane tested only
// through a real tree can hide a filesystem read behind a passing assertion.
//
// The two scenarios that need a real stream are the ones about the ENGINE rather than the lane:
// that `aof work doctor --json` carries the finding at all, and that a SCOPED run still reports
// the whole denominator while filtering the per-edge findings.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { classifyDependsEdges, dependsLane, DEPENDS_FINDING_CODES } from "../../src/work/doctor-depends.mjs";
import { resolveDeclaredSet } from "../../src/story-contract.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// A root and a story directory that do not exist, so a lane that reached the filesystem would
// fault rather than quietly pass.
const NOWHERE_ROOT = path.join("no-such-root-ff12401");
const NOWHERE_STORY = path.join(NOWHERE_ROOT, "wiki", "work", "00_milestone_m", "stories", "00_story_s");

// A resolved declared set, built through the ONE HOME (124/ADR-003 §1) rather than by
// hand-rolling `{ path, directory }` here — a fixture that spelled the shape itself would keep
// passing on the day the resolver's answer moved.
const setOf = (...values) => resolveDeclaredSet(
  `---\nreads: [${values.join(", ")}]\nfiles: [placeholder.mjs]\n---\n`,
  "reads",
  { storyDir: NOWHERE_STORY, projectRoot: NOWHERE_ROOT },
).entries;

const contractOf = (reads, files) => ({
  reads,
  files,
  present: { reads: reads != null, files: files != null },
  malformed: { reads: false, files: false },
});

// A literal snapshot STORY row carrying exactly the facts the lane reads: identity, `depends:`
// off the frontmatter, and the two resolved contract sets. Everything else a lane might want is
// deliberately absent, which is what proves this lane needs nothing else.
const story = ({ number, parent = "00", depends = [], reads = null, files = null, dir = null }) => ({
  ref: `${parent}/${number}`,
  dir: dir ?? path.join(NOWHERE_STORY, number),
  type: "story",
  number,
  parent,
  meta: { depends },
  contract: contractOf(reads, files),
});

const driver = ({ number, type = "milestone", depends = [] }) => ({
  ref: number,
  dir: path.join(NOWHERE_ROOT, "wiki", "work", `${number}_${type}_d`),
  type,
  number,
  parent: null,
  meta: { depends },
  contract: null,
});

const snapshotOf = (...items) => ({ items, workDir: path.join(NOWHERE_ROOT, "wiki", "work") });
const codesOf = (findings) => findings.map((entry) => entry.code);
const byCode = (findings, code) => findings.filter((entry) => entry.code === code);

// ── the six literal fixtures of task 03's counting outline ───────────────────────────────────
//
// Each is named by its Examples row, and each is built from the smallest stream that can reach
// the classes it claims — including both degenerate ends, because an identity that only closes
// on convenient inputs is a summary wearing an identity's clothes.
const COUNT_FIXTURES = {
  "all four classes present": snapshotOf(
    driver({ number: "00", depends: ["01"] }),           // type
    driver({ number: "01" }),
    story({ number: "00", files: setOf("src/b.mjs") }),
    story({ number: "01", depends: ["00"], reads: setOf("src/b.mjs") }),  // witnessed
    story({ number: "02", depends: ["00"], reads: setOf("src/z.mjs") }),  // unwitnessed
    story({ number: "03", depends: ["00"], reads: null }),                // undeclared
  ),
  "every edge evaluable": snapshotOf(
    story({ number: "00", files: setOf("src/b.mjs") }),
    story({ number: "01", depends: ["00"], reads: setOf("src/b.mjs") }),
    story({ number: "02", depends: ["00"], reads: setOf("src/z.mjs") }),
  ),
  "no edge evaluable at all": snapshotOf(
    driver({ number: "00", depends: ["01", "02"] }),     // two type edges
    driver({ number: "01" }),
    driver({ number: "02" }),
    story({ number: "00", parent: "01", files: null }),
    story({ number: "01", parent: "01", depends: ["00"], reads: setOf("src/z.mjs") }), // undeclared
  ),
  "every edge witnessed": snapshotOf(
    story({ number: "00", files: setOf("src/b.mjs") }),
    story({ number: "01", depends: ["00"], reads: setOf("src/b.mjs"), files: setOf("src/c.mjs") }),
    story({ number: "02", depends: ["01"], reads: setOf("src/c.mjs") }),
  ),
  "nothing witnessed, nothing excluded": snapshotOf(
    story({ number: "00", files: setOf("src/b.mjs") }),
    story({ number: "01", depends: ["00"], reads: setOf("src/y.mjs"), files: setOf("src/c.mjs") }),
    story({ number: "02", depends: ["01"], reads: setOf("src/z.mjs") }),
  ),
  "no `depends:` edge in the stream": snapshotOf(
    driver({ number: "00" }),
    story({ number: "00", reads: setOf("src/a.mjs"), files: setOf("src/b.mjs") }),
  ),
};

const COUNT_EXPECTATIONS = [
  { fixture: "all four classes present", considered: 4, witnessed: 1, unwitnessed: 1, type: 1, undeclared: 1, findings: 1 },
  { fixture: "every edge evaluable", considered: 2, witnessed: 1, unwitnessed: 1, type: 0, undeclared: 0, findings: 0 },
  { fixture: "no edge evaluable at all", considered: 3, witnessed: 0, unwitnessed: 0, type: 2, undeclared: 1, findings: 1 },
  { fixture: "every edge witnessed", considered: 2, witnessed: 2, unwitnessed: 0, type: 0, undeclared: 0, findings: 0 },
  { fixture: "nothing witnessed, nothing excluded", considered: 2, witnessed: 0, unwitnessed: 2, type: 0, undeclared: 0, findings: 0 },
  { fixture: "no `depends:` edge in the stream", considered: 0, witnessed: 0, unwitnessed: 0, type: 0, undeclared: 0, findings: 0 },
];

// ── a real fixture stream, for the two claims about the ENGINE ───────────────────────────────

const FIXTURE_DATE = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const frontmatter = (fields) => `---\n${Object.entries(fields)
  .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`)
  .join("\n")}\n---\n`;

async function withStream(milestones, body) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-depends-lane-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }),
    "utf8",
  );
  try {
    for (const milestone of milestones) {
      const dir = path.join(workDir, `${milestone.number}_milestone_${milestone.slug ?? "stage"}`);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "SPEC.md"), frontmatter({
        type: "milestone", number: milestone.number, slug: milestone.slug ?? "stage", title: "M",
        status: "in-progress", owner: "product-owner", created: FIXTURE_DATE, updated: FIXTURE_DATE,
        schema: 1, aofVersion: "0.1.0", ...(milestone.depends ? { depends: milestone.depends } : {}),
      }), "utf8");
      for (const item of milestone.stories ?? []) {
        const storyDir = path.join(dir, "stories", `${item.number}_story_${item.slug ?? "slice"}`);
        await mkdir(storyDir, { recursive: true });
        await writeFile(path.join(storyDir, "STORY.md"), frontmatter({
          type: "story", number: item.number, slug: item.slug ?? "slice", title: "S",
          parent: milestone.number, status: "in-progress", owner: "product-owner",
          created: FIXTURE_DATE, updated: FIXTURE_DATE, schema: 1, aofVersion: "0.1.0",
          ...(item.depends ? { depends: item.depends } : {}),
          ...(item.reads ? { reads: item.reads } : {}),
          ...(item.files ? { files: item.files } : {}),
        }), "utf8");
      }
    }
    return await body({ repo, workDir, ctx: { workspace: await loadWorkspace(repo) } });
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
}

export const doctorDependsLaneTests = [
  {
    name: "124/00 task 02 an unwitnessed edge is named with both its endpoints and both its sets",
    async run() {
      await withStream([{
        number: "00",
        stories: [
          { number: "01", files: ["src/b.mjs"], reads: ["src/seed.mjs"] },
          { number: "02", depends: ["01"], reads: ["src/a.mjs"], files: ["src/c.mjs"] },
        ],
      }], async ({ ctx }) => {
        const { findings } = await invoke("work:doctor", {}, ctx);
        const named = byCode(findings, "depends-edge-unwitnessed");
        assert.equal(named.length, 1, "exactly one finding names that edge");

        const [only] = named;
        assert.match(only.message, /\b00\/02\b/, "the message names the dependent ref");
        assert.match(only.message, /\b00\/01\b/, "…and the dependency ref");
        assert.match(only.message, /src\/a\.mjs/, "…and the dependent's declared reads:");
        assert.match(only.message, /src\/b\.mjs/, "…and the dependency's declared files:");
        assert.equal(only.severity, "warn", "its severity is warn");

        // ANCHORED INSIDE THE DEPENDENT'S OWN FOLDER, which is what makes a run scoped to the
        // dependent's milestone still report it: the engine's scope filter admits a finding whose
        // path sits under an in-scope item's directory.
        assert.ok(
          only.path.includes(path.join("stories", "02_story_slice")),
          `the finding anchors inside the dependent story's folder (${only.path})`,
        );
        assert.ok(only.path.endsWith("STORY.md"), "…at the record that declares both keys");

        const scoped = await invoke("work:doctor", { scope: "00" }, ctx);
        assert.equal(byCode(scoped.findings, "depends-edge-unwitnessed").length, 1, "…so a scoped run still reports it");
      });
    },
  },
  {
    name: "124/00 task 02 a witnessed edge produces nothing at all",
    run() {
      const witnessed = snapshotOf(
        story({ number: "01", files: setOf("src/b.mjs") }),
        story({ number: "02", depends: ["01"], reads: setOf("src/b.mjs") }),
      );
      assert.deepEqual(dependsLane(witnessed), [], "no finding for a witnessed edge, and no coverage notice either");

      // A SINGLE SHARED ENTRY IS ENOUGH — the lane asks whether a reason exists, never how much
      // of a set intersects. Nine reads against one written file is still a witnessed edge.
      const barely = snapshotOf(
        story({ number: "01", files: setOf("src/b.mjs", "src/other.mjs") }),
        story({
          number: "02",
          depends: ["01"],
          reads: setOf("src/p.mjs", "src/q.mjs", "src/r.mjs", "src/s.mjs", "src/t.mjs", "src/u.mjs", "src/v.mjs", "src/w.mjs", "src/b.mjs"),
        }),
      );
      assert.deepEqual(dependsLane(barely), [], "one shared entry out of nine is a witness");
      assert.equal(classifyDependsEdges(barely).witnessed.length, 1);
    },
  },
  {
    name: "124/00 task 02 the lane is a function of the snapshot it is handed",
    run() {
      // TWO WORKING DIRECTORIES, byte-identical findings. The lane is handed a LITERAL snapshot
      // as JSON, so the only way the two runs could differ is if it read something outside it.
      const fixture = snapshotOf(
        story({ number: "01", files: setOf("src/b.mjs") }),
        story({ number: "02", depends: ["01"], reads: setOf("src/a.mjs") }),
        driver({ number: "07", depends: ["08"] }),
        driver({ number: "08" }),
      );
      const script = [
        "const [json] = process.argv.slice(1);",
        `const lane = await import(${JSON.stringify(new URL("../../src/work/doctor-depends.mjs", import.meta.url).href)});`,
        "process.stdout.write(JSON.stringify(lane.dependsLane(JSON.parse(json))));",
      ].join("\n");
      const runFrom = (cwd) => execFileSync(
        process.execPath,
        ["--input-type=module", "-e", script, "--", JSON.stringify(fixture)],
        { cwd, encoding: "utf8", env: { ...process.env, NODE_NO_WARNINGS: "1" } },
      );

      const here = runFrom(repoRoot);
      const elsewhere = runFrom(os.tmpdir());
      assert.equal(here, elsewhere, "two working directories, byte-identical findings");
      assert.deepEqual(
        codesOf(JSON.parse(here)).sort(),
        ["depends-edge-unwitnessed", "depends-edges-unchecked"],
        "…and the run was non-vacuous: both codes were reached",
      );
      // In-process, over the same literal object, the same answer again — so the child runs are
      // measuring the lane and not the harness.
      assert.deepEqual(JSON.parse(here), dependsLane(fixture));
    },
  },
  {
    name: "124/00 task 03 however many edges are excluded, it is one finding",
    async run() {
      // A stream whose every edge is excluded, several times over: two milestone→milestone edges
      // (type) and two story edges where a story declared nothing (undeclared).
      await withStream([
        { number: "00", depends: ["01", "02"], stories: [
          { number: "00" },
          { number: "01", depends: ["00"], reads: ["src/a.mjs"], files: ["src/b.mjs"] },
          { number: "02", depends: ["00"], reads: ["src/c.mjs"], files: ["src/d.mjs"] },
        ] },
        { number: "01" },
        { number: "02" },
      ], async ({ ctx, workDir }) => {
        const { findings } = await invoke("work:doctor", {}, ctx);
        const unchecked = byCode(findings, "depends-edges-unchecked");
        assert.equal(unchecked.length, 1, "exactly one finding carries the code, over four excluded edges");
        assert.equal(unchecked[0].severity, "warn");
        assert.equal(unchecked[0].path, workDir, "its path is the work-stream root");
        // NO FINDING OF THAT CODE NAMES A SINGLE EDGE — the message states counts, never a pair.
        assert.doesNotMatch(unchecked[0].message, /→/u, "the coverage finding names no edge");
        assert.doesNotMatch(unchecked[0].message, /\b0[012]\/0[012]\b/u, "…and no ref pair either");
      });
    },
  },
  {
    name: "124/00 task 03 the four counts close over the whole edge set",
    run() {
      for (const row of COUNT_EXPECTATIONS) {
        const snapshot = COUNT_FIXTURES[row.fixture];
        const census = classifyDependsEdges(snapshot);
        const measured = {
          considered: census.considered,
          witnessed: census.witnessed.length,
          unwitnessed: census.unwitnessed.length,
          type: census.uncheckedType.length,
          undeclared: census.uncheckedUndeclared.length,
        };
        assert.deepEqual(measured, {
          considered: row.considered,
          witnessed: row.witnessed,
          unwitnessed: row.unwitnessed,
          type: row.type,
          undeclared: row.undeclared,
        }, `${row.fixture}: the four counts`);

        // THE IDENTITY, on every row including the two degenerate ends. A census whose parts do
        // not sum to its whole can drop an edge class in silence.
        assert.equal(
          measured.witnessed + measured.unwitnessed + measured.type + measured.undeclared,
          row.considered,
          `${row.fixture}: witnessed + unwitnessed + unchecked(type) + unchecked(undeclared) = considered`,
        );

        assert.equal(
          byCode(dependsLane(snapshot), "depends-edges-unchecked").length,
          row.findings,
          `${row.fixture}: ${row.findings} depends-edges-unchecked finding for the run`,
        );
      }
    },
  },
  {
    name: "124/00 task 03 the two exclusions are reported apart and are never summed",
    run() {
      // 125 by type and 57 by undeclared contract — this stream's own measured pair, built as a
      // literal snapshot so the message is read over the exact numbers ADR-001 records.
      const items = [];
      for (let index = 0; index < 126; index += 1) items.push(driver({ number: String(100 + index) }));
      items[0] = driver({ number: "100", depends: items.slice(1).map((item) => item.number) });
      items.push(story({ number: "00", parent: "50", files: null }));
      for (let index = 0; index < 57; index += 1) {
        items.push(story({ number: String(index + 1).padStart(2, "0"), parent: "50", depends: ["00"], reads: setOf("src/a.mjs") }));
      }
      // TWO EVALUABLE EDGES BESIDE THEM, AND THEY ARE LOAD-BEARING RATHER THAN DECORATION. With
      // only the exclusions in the stream, `considered` would ITSELF be 182 — the sum — and the
      // last assertion below could not tell an honest denominator from the merged number it
      // exists to refuse. One witnessed edge and one unwitnessed edge put `considered` at 184, so
      // 182 can only appear in this message if the two reasons were added together.
      items.push(story({ number: "00", parent: "51", files: setOf("src/b.mjs") }));
      items.push(story({ number: "01", parent: "51", depends: ["00"], reads: setOf("src/b.mjs") }));
      items.push(story({ number: "02", parent: "51", depends: ["00"], reads: setOf("src/z.mjs") }));

      const census = classifyDependsEdges(snapshotOf(...items));
      assert.equal(census.uncheckedType.length, 125);
      assert.equal(census.uncheckedUndeclared.length, 57);
      assert.equal(census.considered, 184, "…and the run's denominator is not their sum, so the refusal below has teeth");

      const [only] = byCode(dependsLane(snapshotOf(...items)), "depends-edges-unchecked");
      assert.ok(only != null, "the coverage finding is emitted");
      // THE TWO NUMBERS, EACH NAMED BY ITS REASON…
      assert.match(only.message, /125 unchecked because an endpoint is not a story/u);
      assert.match(only.message, /57 unchecked because a story has declared no contract/u);
      // …the two remedies, said apart: one is permanent, the other is a debt…
      assert.match(only.message, /can NEVER be evaluated/u, "a non-story endpoint can never be evaluated");
      assert.match(only.message, /CAN be evaluated/u, "…and an undeclared contract can be");
      // …and NO SINGLE NUMBER EQUAL TO THEIR SUM anywhere in the message.
      assert.ok(!only.message.includes("182"), "their sum never stands in place of the pair");
    },
  },
  {
    name: "124/00 task 03 a stream with nothing to exclude says nothing about exclusions",
    run() {
      const snapshot = COUNT_FIXTURES["nothing witnessed, nothing excluded"];
      const findings = dependsLane(snapshot);
      assert.deepEqual(byCode(findings, "depends-edges-unchecked"), [], "no coverage finding when every edge was read");
      assert.equal(byCode(findings, "depends-edge-unwitnessed").length, 2, "and the per-edge findings are still emitted");
      // The inversion FF-12401 names as its red probe, stated as an assertion rather than as a
      // comment: a stream with everything excluded and NOTHING unwitnessed still reports.
      const blind = COUNT_FIXTURES["no edge evaluable at all"];
      assert.deepEqual(codesOf(dependsLane(blind)), ["depends-edges-unchecked"]);
    },
  },
  {
    name: "124/00 task 03 the denominator survives a scoped run",
    async run() {
      await withStream([
        { number: "00", slug: "alpha", stories: [
          { number: "00", files: ["src/a.mjs"], reads: ["src/seed.mjs"] },
          { number: "01", depends: ["00"], reads: ["src/nowhere.mjs"], files: ["src/b.mjs"] },
        ] },
        { number: "01", slug: "beta", depends: ["00"], stories: [
          { number: "00", files: ["src/c.mjs"], reads: ["src/seed.mjs"] },
          { number: "01", depends: ["00"], reads: ["src/elsewhere.mjs"], files: ["src/d.mjs"] },
        ] },
      ], async ({ ctx, workDir }) => {
        const whole = await invoke("work:doctor", {}, ctx);
        assert.equal(byCode(whole.findings, "depends-edge-unwitnessed").length, 2, "two unwitnessed edges stream-wide");
        const [wide] = byCode(whole.findings, "depends-edges-unchecked");
        assert.ok(wide != null, "…and one coverage finding, because the 01 → 00 driver edge is excluded by type");

        const scoped = await invoke("work:doctor", { scope: "01" }, ctx);
        const [narrow] = byCode(scoped.findings, "depends-edges-unchecked");
        assert.ok(narrow != null, "the coverage finding is still reported under a scoped run");
        assert.equal(narrow.path, workDir, "…because it anchors at the work-stream root the scope filter passes through");
        assert.equal(narrow.message, wide.message, "…and its four counts are the whole stream's, not the scope's");

        // …while the per-edge findings are filtered to the scope, as every item-anchored finding is.
        const scopedEdges = byCode(scoped.findings, "depends-edge-unwitnessed");
        assert.equal(scopedEdges.length, 1, "one of the two per-edge findings survives the scope");
        assert.ok(scopedEdges[0].path.includes("01_milestone_beta"), "…the one under the scoped milestone");
      });
    },
  },
  {
    name: "124/00 task 02/03 the lane's codes are the two its contract names, and both are reachable",
    run() {
      assert.deepEqual([...DEPENDS_FINDING_CODES], ["depends-edge-unwitnessed", "depends-edges-unchecked"]);
      assert.ok(Object.isFrozen(DEPENDS_FINDING_CODES), "the array is frozen — a third code is an ADR-level act");
      // NON-VACUITY: every declared code is reachable from a fixture. An unreachable code is as
      // much a defect as an unfrozen one (66/ADR-003 §5's rule, applied to this lane's pair).
      const reached = new Set(codesOf(dependsLane(COUNT_FIXTURES["all four classes present"])));
      assert.deepEqual([...reached].sort(), [...DEPENDS_FINDING_CODES].sort());
    },
  },
];
