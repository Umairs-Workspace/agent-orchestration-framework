// Traceability wiring for milestone 66 / story 00, task
// `02_a-contract-that-does-not-parse-is-refused`.
//
// Every @executable scenario (and every Examples row) of
//   wiki/work/66_milestone_controls-that-run/stories/00_story_contract-parses/tasks/02_a-contract-that-does-not-parse-is-refused.feature
// against the LOCKED engine `validateWork(workDir, config, scopeRef)` and the CLI
// exit adapter `validateCommand.cli.exit`.
//
// The per-milestone table is driven against the REAL `wiki/work` tree, because that
// table IS the argument for landability: "re-running the gate falsifies it". A row
// that stops holding is a re-measurement to record, never a test to relax — this
// contract enumerates by re-measurement rather than by recall.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFeature } from "../../../src/feature-parse.mjs";
import { validateWork, parseFrontmatter } from "../../../src/work.mjs";
import { validateCommand } from "../../../src/commands/validate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const realWorkDir = path.join(repoRoot, "wiki", "work");

const CONFIG = { name: "fixture", work: { dir: "./wiki/work", tags: { domains: ["@validate"] } } };

const frontmatter = (fields) =>
  `---\n${Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n`;

// The live shape this gate exists to bite: an `in-progress` milestone (53
// `loop-artifact`) holding a `not-started` story (01 `loop-engine`) whose task
// feature carries free text in step position, beside a clean sibling (02
// `command-surface`) that holds no such file.
const UNPARSEABLE_FEATURE =
  "@executable @cli @work\n" +
  "Feature: The gate order and the bound\n" +
  "\n" +
  "  `GATE_ORDER` is frozen at ADR-005 §6 and 54 depends on it.\n" +
  "  And the engine READS the cap: ADR-009 §1 rules that this milestone adds no new cap,\n" +
  "  no new key, no new default and no new resolution site.\n" +
  "\n" +
  "  Scenario: `GATE_ORDER` is exported frozen and the decisions follow it\n" +
  "    Given the exported `GATE_ORDER`\n" +
  "    Then it is the frozen sequence\n";
const UNPARSEABLE_LINE = 5;

async function liveFixture() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-contract-parses-"));
  const workDir = path.join(repo, "wiki", "work");
  const milestoneDir = path.join(workDir, "53_milestone_loop-artifact");
  await mkdir(milestoneDir, { recursive: true });
  await writeFile(
    path.join(milestoneDir, "SPEC.md"),
    frontmatter({ type: "milestone", number: "53", slug: "loop-artifact", status: "in-progress", created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
    "utf8",
  );
  const stories = {};
  for (const [number, slug, feature] of [
    ["01", "loop-engine", UNPARSEABLE_FEATURE],
    ["02", "command-surface", null],
  ]) {
    const dir = path.join(milestoneDir, "stories", `${number}_story_${slug}`);
    await mkdir(path.join(dir, "tasks"), { recursive: true });
    await writeFile(
      path.join(dir, "STORY.md"),
      frontmatter({ type: "story", number, slug, status: "not-started", parent: "53", created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
      "utf8",
    );
    if (feature != null) await writeFile(path.join(dir, "tasks", "04_gate-order-and-cap.feature"), feature, "utf8");
    stories[number] = dir;
  }
  return { repo, workDir, stories, featurePath: path.join(stories["01"], "tasks", "04_gate-order-and-cap.feature") };
}

async function withLiveFixture(body) {
  const built = await liveFixture();
  try {
    return await body(built);
  } finally {
    await rm(built.repo, { recursive: true, force: true });
  }
}

async function everyFeatureFile(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await everyFeatureFile(full, out);
    else if (entry.isFile() && entry.name.endsWith(".feature")) out.push(full);
  }
  return out;
}

let realRun = null;
async function realStream() {
  if (realRun == null) {
    const config = JSON.parse(await readFile(path.join(repoRoot, ".aof", "aof.config.json"), "utf8"));
    const files = await everyFeatureFile(realWorkDir);
    const unparseable = [];
    for (const file of files) {
      if (parseFeature(await readFile(file, "utf8")).structural.length > 0) unparseable.push(file);
    }
    realRun = { findings: await validateWork(realWorkDir, config, undefined), files, unparseable };
  }
  return realRun;
}

const rel = (file) => path.relative(realWorkDir, file).replaceAll("\\", "/");
const isStructural = (finding) => finding.problem.includes("structural parse failure");

// Examples: the settled picture — 14 files over 9 milestones, re-run 2026-08-15.
// Each row used to pin a per-milestone COUNT of unparseable files — a retyped fact about the
// tree (FF-11902) that every repair or arrival had to re-measure here. The count is gone: the
// population is judged file by file in the whole-stream scenario below, and a row's claim is
// what is REPORTED for that milestone under the horizon.
const MILESTONE_ROWS = [
  { milestone: "00", folder: "archive/00_milestone_work-cli", status: "done", reported: "nothing" },
  { milestone: "04", folder: "archive/04_milestone_round-trip-proof", status: "done", reported: "nothing" },
  { milestone: "27", folder: "archive/27_milestone_work-issuance-routing", status: "done", reported: "nothing" },
  { milestone: "37", folder: "archive/37_milestone_spike-chore-item-types", status: "done", reported: "nothing" },
  { milestone: "38", folder: "archive/38_milestone_cross-machine-worker-execution", status: "done", reported: "nothing" },
  { milestone: "43", folder: "archive/43_milestone_mesh-artifact-authority", status: "done", reported: "nothing" },
  { milestone: "49", folder: "archive/49_milestone_terminals-home", status: "done", reported: "nothing" },
  { milestone: "52", folder: "archive/52_milestone_loop-registry-and-graph", status: "done", reported: "nothing" },
  // RE-MEASURED 2026-08-28, which is this row's whole purpose. 53 was the LIVE row —
  // the one unparseable file under an open item, the one this gate existed to make
  // somebody fix. It was fixed: `04_gate-order-and-cap.feature` now parses with
  // `structural: []`, and milestone 53 has since been accepted. The row stays because
  // deleting it would erase the record that the gate worked.
  { milestone: "53", folder: "archive/53_milestone_loop-artifact", status: "done", reported: "nothing" },
];

// Examples: scope semantics measured against `validateWork` on a fixture.
const SCOPE_ROWS = [
  { scope: undefined, label: "(none)", reported: true, exit: 1, why: "the whole stream" },
  { scope: "53", label: "53", reported: true, exit: 1, why: "a numeric scope matches the story through its parent" },
  { scope: "53/01", label: "53/01", reported: true, exit: 1, why: "the owning story named exactly" },
  { scope: "53/02", label: "53/02", reported: false, exit: 0, why: "a sibling that holds no such file" },
  { scope: "loop-engine", label: "loop-engine", reported: true, exit: 1, why: "the story's own slug" },
  {
    scope: "loop-artifact",
    label: "loop-artifact",
    reported: false,
    exit: 0,
    why: "the MILESTONE's slug matches no story, and the feature check runs per story — pre-existing scope behaviour",
  },
  { scope: "99", label: "99", reported: false, exit: 0, why: "an unresolved scope is a filter matching nothing, never an error" },
];

export const contractParsesTests = [
  // =====================================================================
  // Scenario: an unparseable contract is refused inside the horizon
  // =====================================================================
  {
    name: "66/00 refuse: an unparseable contract under an open item is reported by file AND line, and exits non-zero",
    run: () =>
      withLiveFixture(async ({ workDir, featurePath }) => {
        const findings = await validateWork(workDir, CONFIG, undefined);
        const structural = findings.filter(isStructural);
        assert.equal(structural.length, 1, `exactly one structural finding: ${JSON.stringify(findings)}`);
        assert.equal(structural[0].path, featurePath, "naming that file");
        assert.match(structural[0].problem, new RegExp(`\\bline ${UNPARSEABLE_LINE}\\b`), "and that line");
        assert.equal(validateCommand.cli.exit({ findings }), 1, "the command exits non-zero");
      }),
  },

  // =====================================================================
  // Scenario: the finding says what is wrong, not merely that something is
  // =====================================================================
  {
    name: "66/00 refuse: the finding distinguishes a structural parse failure from a tag-vocabulary failure, and names the editable line",
    run: () =>
      withLiveFixture(async ({ workDir, featurePath, stories }) => {
        const [finding] = (await validateWork(workDir, CONFIG, undefined)).filter(isStructural);
        assert.ok(finding.problem.startsWith("structural parse failure:"), `problem: ${finding.problem}`);
        for (const tagWording of ["unknown tag", "milestone membership is structural", "verification tags"]) {
          assert.equal(finding.problem.includes(tagWording), false, `never reads as a tag finding (${tagWording})`);
        }
        assert.equal(finding.path, featurePath, "its path is the feature file itself…");
        assert.notEqual(finding.path, path.join(stories["01"], "STORY.md"), "…never the story's record document");
        // The line it names is the line an author edits to clear it: remove that one
        // line and the finding is gone.
        const text = await readFile(featurePath, "utf8");
        const lines = text.split("\n");
        lines.splice(UNPARSEABLE_LINE - 1, 2); // the wrapped sentence and its continuation
        assert.deepEqual(parseFeature(lines.join("\n")).structural, [], "editing the named line clears it");
      }),
  },

  // =====================================================================
  // Scenario Outline: the gate reports the live file and grandfathers every
  // delivered one — driven over the REAL stream, one test per Examples row.
  // =====================================================================
  ...MILESTONE_ROWS.map((row) => ({
    name: `66/00 refuse: milestone ${row.milestone} (${row.status}) → ${row.reported}`,
    run: async () => {
      const { findings, files } = await realStream();
      assert.ok(files.length > 0, "the real corpus was walked — the absence claim below is judged over a read that found something (FF-11902)");
      const spec = await readFile(path.join(realWorkDir, row.folder, "SPEC.md"), "utf8");
      assert.equal(
        parseFrontmatter(spec).status,
        row.status,
        `milestone ${row.milestone}'s status moved — re-measure the table and record it (this contract enumerates by re-measurement, never by recall)`,
      );
      const reported = findings.filter(isStructural).filter((f) => rel(f.path).startsWith(`${row.folder}/`));
      if (row.reportedPath == null) {
        assert.deepEqual(reported.map((f) => rel(f.path)), [], `milestone ${row.milestone} is grandfathered by the horizon, not by a list`);
      } else {
        assert.deepEqual(reported.map((f) => rel(f.path)), [row.reportedPath], "the live file is the one that bites");
      }
    },
  })),

  // =====================================================================
  // Scenario: a failed parse never manufactures a tag verdict it could not have
  // reached
  // =====================================================================
  {
    name: "66/00 refuse: a failed parse still yields tag-LINE verdicts, and never a verification-COUNT verdict",
    run: () =>
      withLiveFixture(async ({ workDir, stories }) => {
        // The same unparseable file, decorated with an unknown tag, a milestone
        // membership tag, and a scenario that would carry 2 verification lanes.
        const featurePath = path.join(stories["01"], "tasks", "04_gate-order-and-cap.feature");
        await writeFile(
          featurePath,
          "@executable @bogus @milestone-03\n" + UNPARSEABLE_FEATURE.split("\n").slice(1).join("\n").replace("  Scenario:", "  @manual\n  Scenario:"),
          "utf8",
        );
        const problems = (await validateWork(workDir, CONFIG, undefined))
          .filter((f) => f.path === featurePath)
          .map((f) => f.problem);
        assert.ok(problems.some((p) => p.includes("structural parse failure")), "the structural finding is reported");
        assert.ok(problems.some((p) => p.includes('unknown tag "@bogus"')), "an unknown-tag finding is still reported");
        assert.ok(
          problems.some((p) => p.includes('tag "@milestone-03" — milestone membership is structural')),
          "and a milestone-membership finding, because each is decided on a tag line by itself",
        );
        assert.equal(
          problems.some((p) => p.includes("verification tags")),
          false,
          "no verification-tag-count finding — that count rests on scenario boundaries the parse could not establish",
        );
      }),
  },

  // =====================================================================
  // Scenario: a healthy corpus stays green
  // =====================================================================
  {
    name: "66/00 refuse: over the whole real stream the ONLY new finding is the one live file, and no file that parses gains one",
    run: async () => {
      const { findings, files, unparseable } = await realStream();
      assert.ok(files.length > 600, `non-vacuity: the real corpus was walked (${files.length} .feature files)`);
      // RE-MEASURED 2026-08-28. The one live file was REPAIRED, which is the outcome
      // this gate was built to produce, so the stream now reports NOTHING: every
      // remaining unparseable file sits under a `done` milestone and is grandfathered.
      // An empty expectation is the strongest form this assertion has ever taken — any
      // new finding anywhere in the stream now fails it by name.
      assert.deepEqual(
        findings.map((f) => `${rel(f.path)} — ${f.problem}`),
        [],
        "validate over `wiki/work` reports no structural finding: the one live file was repaired and every remaining " +
          "unparseable file is grandfathered under a done milestone. A finding here names a NEW one — record it or fix it, " +
          "and note the contract enumerates by re-measurement rather than by recall.",
      );
      // THE PROPERTY, NOT THE COUNT (FF-11902). The population was retyped here as `13` — a fact
      // about the tree stored in a control, so every story that repaired or added a contract had to
      // edit this line. What the number stood in for is asserted instead, over EVERY member: each
      // unparseable file sits under a milestone that is `done`, which is what grandfathers it. The
      // floor keeps that leg non-vacuous — a population that reached zero is a re-measurement to
      // record, never a green pass over nothing.
      assert.ok(unparseable.length > 0, "the walk of wiki/work found no unparseable contract — the grandfathering leg below would be asserted over nothing; re-measure and record");
      for (const file of unparseable) {
        // The item folder is the first ITEM-shaped segment: under `archive/` (127/05) it is the second.
        const segments = rel(file).split("/");
        const folder = segments[0] === "archive" ? `${segments[0]}/${segments[1]}` : segments[0];
        const spec = await readFile(path.join(realWorkDir, folder, "SPEC.md"), "utf8");
        assert.equal(parseFrontmatter(spec).status, "done", `${rel(file)} is unparseable and its milestone ${folder} is not done — a LIVE finding, which is what this gate exists to make somebody fix`);
      }
      const parseable = new Set(files.filter((file) => !unparseable.includes(file)).map((f) => f));
      assert.ok(parseable.size > 0, "the parseable population is non-empty — the leg below is judged over a set (FF-11902)");
      for (const finding of findings) {
        assert.equal(parseable.has(finding.path), false, `a file that parses gained a finding: ${rel(finding.path)}`);
      }
    },
  },

  // =====================================================================
  // Scenario Outline: the gate is scope-honest, and a scope that reaches no story
  // is honest about that too — one test per Examples row.
  // =====================================================================
  ...SCOPE_ROWS.map((row) => ({
    name: `66/00 refuse: scope ${row.label} → ${row.reported ? "reported" : "not reported"}, exit ${row.exit} (${row.why})`,
    run: () =>
      withLiveFixture(async ({ workDir, featurePath }) => {
        const findings = await validateWork(workDir, CONFIG, row.scope);
        const mine = findings.filter((f) => f.path === featurePath);
        assert.equal(mine.length > 0, row.reported, `scope ${row.label}: ${row.why} — got ${JSON.stringify(findings)}`);
        assert.equal(validateCommand.cli.exit({ findings }), row.exit, `scope ${row.label} exit`);
      }),
  })),
];
