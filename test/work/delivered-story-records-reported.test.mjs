// Traceability wiring for story 85 /
// tasks/01_a-delivered-story-without-its-records-is-reported.feature — every @executable
// scenario it declares.
//
// A RULE THAT LIVES ONLY IN A PROMPT IS NOT ENFORCED, AND THIS ONE PROVED IT. `aof:verify`
// has instructed outcome authoring since story 80 and `aof:assimilate-code` authors a
// retrospective, yet story 84 reached `done` through a govern command carrying neither, and
// nothing said so — not `validate`, not `doctor`, not the accept verb. The gap was found by a
// person reading a folder.
//
// WHERE IT LANDED, AND THE MEASUREMENT THAT DECIDED IT. `doctor`, advisory, at `warn`, inside
// `lifecycleCompletenessGroup` — the group that has asked a milestone "you are done; where are
// your deliverables?" since story 01. Measured at this story's build: **199 of 283** done
// stories carry no `OUTCOME.md` and **275** carry no `RETROSPECTIVE.md`. A `validate` finding
// is STRUCTURAL and would have reddened the whole stream at once — taking every gate that runs
// validate down with it, including the loop's first rung — and the feature's own text requires
// a `validate` answer to arrive with a backfill plan rather than without one. There is no
// backfill plan and filling the backlog is explicitly not this story's job, so the check lands
// where it can land today and reports the backlog instead of blocking on it.
//
// The group is a pure `(snapshot, ctx) => Finding[]` function, so most of this suite is a
// literal snapshot with no filesystem at all. The last two scenarios go through `doctorWork`
// over a real temp fixture, because "the stream is checked" is a claim about the REGISTERED
// group, not about a function nobody calls.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { doctorWork, CHECK_GROUPS } from "../../src/work/doctor.mjs";
import { lifecycleCompletenessGroup, DELIVERED_STORY_RECORDS } from "../../src/work/doctor-coherence.mjs";
import { CONTROL_FINDING_CODES } from "../../src/work/doctor-controls.mjs";

const RECORDS = ["OUTCOME.md", "RETROSPECTIVE.md"];
const CODE = "story-record-missing";

// A literal snapshot row. `carries` is the set of records the item's OWN folder holds — the
// engine's per-item-dir probe, which is the only thing the check reads. `hasTasks` is true so
// the sibling `started-story-no-tasks` finding never confuses a count below.
function row({ ref = "85", type = "story", status = "done", dir = null, carries = RECORDS, ...rest }) {
  const docs = {};
  for (const name of RECORDS) docs[name] = { present: carries.includes(name), nonEmpty: carries.includes(name) };
  return { ref, type, dir: dir ?? `/work/${ref.replace("/", "_")}`, meta: { status }, docs, hasTasks: true, ...rest };
}

const snapshotOf = (...items) => ({ items, workDir: "/work", selfNode: "this-node" });

// The check's own findings, separated from the group's other codes — this suite is about one
// branch of a group that has answered four other questions since story 01.
const recordFindings = (snapshot) => lifecycleCompletenessGroup(snapshot).filter((finding) => finding.code === CODE);

function frontmatter(fields) {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`)
    .join("\n");
  return `---\n${body}\n---\n`;
}

// A real work stream on disk, so the assertions below are about the check as REGISTERED in
// `CHECK_GROUPS` — not about a function this test imported and called itself.
async function fixture(build) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-85-records-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  await mkdir(path.join(projectRoot, ".aof"), { recursive: true });
  const item = async (dir, record, fields, records = []) => {
    await mkdir(path.join(dir, "tasks"), { recursive: true });
    await writeFile(path.join(dir, record), frontmatter(fields) + `# ${fields.number} · Sample\n`, "utf8");
    await writeFile(path.join(dir, "tasks", "00_sample.feature"), "@cli\nFeature: sample\n", "utf8");
    for (const name of records) await writeFile(path.join(dir, name), `# sample ${name}\n`, "utf8");
  };
  await build({ projectRoot, workDir, item });
  return { projectRoot, workDir };
}

export const deliveredStoryRecordsTests = [
  // ==================================================================
  // Scenario: a done story carrying both records is clean
  // ==================================================================
  {
    name: "85/01 delivered-records: a done story whose folder carries an OUTCOME.md and a RETROSPECTIVE.md raises no finding",
    run: () => {
      assert.deepEqual(recordFindings(snapshotOf(row({ carries: RECORDS }))), []);
    },
  },

  // ==================================================================
  // Scenario Outline: a done story missing a record is named, and the
  // missing one is named with it
  // ==================================================================
  ...[
    { record: "OUTCOME.md", carries: ["RETROSPECTIVE.md"], named: ["OUTCOME.md"], absent: ["RETROSPECTIVE.md"] },
    { record: "RETROSPECTIVE.md", carries: ["OUTCOME.md"], named: ["RETROSPECTIVE.md"], absent: ["OUTCOME.md"] },
    { record: "both", carries: [], named: ["OUTCOME.md", "RETROSPECTIVE.md"], absent: [] },
  ].map(({ record, carries, named, absent }) => ({
    name: `85/01 delivered-records: a done story missing ${record} is reported once, and the finding names ${record}`,
    run: () => {
      const findings = recordFindings(snapshotOf(row({ ref: "85", carries })));
      // ONE finding against that story — a story carrying neither record has one problem,
      // not two, and two findings would double-count one backlog item everywhere it is read.
      assert.equal(findings.length, 1, `one finding; got ${JSON.stringify(findings)}`);
      assert.equal(findings[0].path, "/work/85", "the finding is anchored at the story's folder");
      assert.match(findings[0].message, /^story 85 /, "the finding names the story it is about");
      for (const name of named) assert.ok(findings[0].message.includes(name), `the finding names ${name}`);
      for (const name of absent) {
        assert.ok(!findings[0].message.includes(name), `the finding does not name ${name}, which the story carries`);
      }
    },
  })),

  // ==================================================================
  // Scenario Outline: an undelivered story owes nothing yet
  // ==================================================================
  ...["not-started", "in-progress", "in-review", "blocked"].map((status) => ({
    name: `85/01 delivered-records: a "${status}" story carrying neither record raises no finding for a missing record`,
    run: () => {
      assert.deepEqual(recordFindings(snapshotOf(row({ status, carries: [] }))), []);
    },
  })),

  // ==================================================================
  // Scenario: the check judges stories only
  // ==================================================================
  {
    name: "85/01 delivered-records: no finding is raised against any item that is not a story",
    run: () => {
      const others = ["milestone", "chore", "spike", "uat", "task"].map((type, index) =>
        row({ ref: `9${index}`, type, status: "done", carries: [] }));
      assert.deepEqual(recordFindings(snapshotOf(...others)), []);
    },
  },

  // ==================================================================
  // The finding's envelope: advisory, and structurally out of every gate.
  // ==================================================================
  {
    name: "85/01 delivered-records: every finding is `warn` — the check reports the backlog and gates on nothing",
    run: () => {
      const findings = recordFindings(snapshotOf(row({ carries: [] }), row({ ref: "86", carries: ["OUTCOME.md"] })));
      assert.equal(findings.length, 2);
      for (const finding of findings) assert.equal(finding.severity, "warn", `${finding.code} is advisory`);
    },
  },
  {
    name: "85/01 delivered-records: the code is disjoint from CONTROL_FINDING_CODES, so no severity change here can reach the loop's doctor gate",
    run: () => {
      assert.ok(!CONTROL_FINDING_CODES.includes(CODE), `${CODE} is not a control code`);
      assert.deepEqual(DELIVERED_STORY_RECORDS, ["OUTCOME.md", "RETROSPECTIVE.md"]);
    },
  },
  {
    name: "85/01 delivered-records: the check is PURE — the same literal snapshot yields byte-identical findings, with no filesystem at all",
    run: () => {
      const literal = snapshotOf(row({ carries: [] }), row({ ref: "86", status: "in-progress", carries: [] }));
      assert.equal(JSON.stringify(recordFindings(literal)), JSON.stringify(recordFindings(literal)));
    },
  },
  {
    name: "85/01 delivered-records: a done story another node reported is judged on THIS disk like any other — the fact is one the cache cannot have, so waiting for it would report nothing",
    run: () => {
      // NOT IN 43/06's R6.1 SUPPRESSED SET, for `missing-architecture`'s stated reason and on a
      // measurement: the cache answers for a story's OUTCOME.md 0 times out of 277 over this
      // stream (it is not in `WORK_ITEM_ARTIFACTS` at all) and for its RETROSPECTIVE.md 0 times
      // out of 277 (a worker streams only its ACTIVE worktree). Suppressing on `degraded()`
      // silenced 256 of those 277 rows — 92% of the backlog this check exists to report —
      // permanently rather than until the cache caught up.
      const remote = row({ carries: [], statusFrom: "cache", reportedBy: "worker-node", docsFrom: {} });
      assert.equal(recordFindings(snapshotOf(remote)).length, 1, "a remote-reported row is judged on this disk");
      const mine = row({ carries: [], statusFrom: "cache", reportedBy: "this-node", docsFrom: {} });
      assert.equal(recordFindings(snapshotOf(mine)).length, 1);
      // …and a remote row that DOES carry both records on this disk is still silent, which is
      // what keeps the departure a report about the disk rather than a report about the mesh.
      const complete = row({ ref: "86", carries: RECORDS, statusFrom: "cache", reportedBy: "worker-node", docsFrom: {} });
      assert.deepEqual(recordFindings(snapshotOf(complete)), []);
    },
  },

  // ==================================================================
  // Scenario: a story is judged on its own folder, and nesting grants no
  // exemption — through the REGISTERED group, over a real stream.
  // ==================================================================
  {
    name: "85/01 delivered-records: a nested done story whose own folder carries neither record is reported, and the milestone's own records above it satisfy nothing",
    run: async () => {
      const { projectRoot, workDir } = await fixture(async ({ workDir: root, item }) => {
        const milestone = path.join(root, "70_milestone_sample");
        // The milestone above it carries BOTH records — and satisfies neither of the story's.
        await item(milestone, "SPEC.md", {
          type: "milestone", number: "70", slug: "sample", title: '"Sample"', status: "done",
          created: "2026-08-20", updated: "2026-08-20", depends: [], schema: 1,
        }, ["OUTCOME.md", "RETROSPECTIVE.md", "VERIFICATION.md"]);
        await item(path.join(milestone, "stories", "00_story_nested"), "STORY.md", {
          type: "story", number: "00", slug: "nested", title: '"Nested"', status: "done", parent: "70",
          created: "2026-08-20", updated: "2026-08-20", depends: [], schema: 1,
        });
      });
      try {
        const findings = (await doctorWork(workDir, {}, null, { projectRoot }))
          .filter((finding) => finding.code === CODE);
        assert.equal(findings.length, 1, `exactly the nested story is reported; got ${JSON.stringify(findings)}`);
        assert.ok(findings[0].path.endsWith(path.join("stories", "00_story_nested")), `anchored at the story's own folder; got ${findings[0].path}`);
        assert.ok(findings[0].message.includes("OUTCOME.md") && findings[0].message.includes("RETROSPECTIVE.md"));
        // No finding of this code is raised against the milestone, whatever else doctor says.
        assert.equal(findings.filter((finding) => finding.path.endsWith("70_milestone_sample")).length, 0);
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },
  {
    name: "85/01 delivered-records: the check is REGISTERED — `aof work doctor` over a stream reports a standalone done story missing both records, and none against the one carrying them",
    run: async () => {
      assert.ok(CHECK_GROUPS.includes(lifecycleCompletenessGroup), "the group carrying the check is in the engine's registry");
      const { projectRoot, workDir } = await fixture(async ({ workDir: root, item }) => {
        await item(path.join(root, "84_story_bare"), "STORY.md", {
          type: "story", number: "84", slug: "bare", title: '"Bare"', status: "done",
          created: "2026-08-20", updated: "2026-08-20", depends: [], schema: 1,
        });
        await item(path.join(root, "85_story_complete"), "STORY.md", {
          type: "story", number: "85", slug: "complete", title: '"Complete"', status: "done",
          created: "2026-08-20", updated: "2026-08-20", depends: [], schema: 1,
        }, ["OUTCOME.md", "RETROSPECTIVE.md"]);
      });
      try {
        const findings = (await doctorWork(workDir, {}, null, { projectRoot }))
          .filter((finding) => finding.code === CODE);
        assert.equal(findings.length, 1, `only the bare story is reported; got ${JSON.stringify(findings)}`);
        assert.ok(findings[0].path.endsWith("84_story_bare"));
        assert.equal(findings[0].severity, "warn");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },
];
