// FF-12402 (124/ADR-002) — AN ADVISORY DOCTOR LANE CANNOT GATE, AS A CLASS.
//
// The mechanism already existed three times before this milestone: a lane is a pure
// `(snapshot, ctx) => Finding[]` appended as ONE entry to `CHECK_GROUPS`, carrying **its own frozen
// finding-code array — a DIFFERENT array from `CONTROL_FINDING_CODES`** — and that difference is
// what makes its codes structurally incapable of reaching the loop's `DOCTOR_GATE_CODES`, which is
// derived from the controls' array BY FILTER. `78/FF-7808` asserts the property four ways for one
// lane. This control does not copy it a fourth time; it raises the claim to the CLASS, which is
// what the third instance of a pattern earns and what `119/FF-11906` refused a lane-specific
// control for:
//
//   *every module registered in `CHECK_GROUPS` that exports its own frozen `*_FINDING_CODES` array
//   is disjoint from `CONTROL_FINDING_CODES`, names no `"error"` severity literal anywhere in its
//   source, carries its severity as one module constant, and consults no acceptance horizon.*
//
// `src/work/doctor-controls.mjs` is the ONE exemption, because its array IS the gate's source — and
// it is asserted AS A NAMED EXEMPTION rather than as an absence, so a second one cannot arrive
// silently. The point of the class is not the fourth lane; it is the FIFTH, which cannot
// re-introduce a gateable code without reding CI.
//
// THE ACCEPTANCE HORIZON IS THE SUBTLE HALF. `66/ADR-002`'s `severityFor` answers `error` INSIDE
// the horizon — the item is open, which is exactly what a loop drives — so a horizon-aware advisory
// lane would turn every warning into a blocker at precisely the moment nobody can clear it. An
// unwitnessed edge on a `done` story is a permanent red no legal act can remove.
//
// This file is also the home of task 04's five scenarios, which are the behavioural half of the
// same claim: the loop's doctor rung admits nothing of this lane's, the accepting door runs one
// named group and this is not it, and every finding the lane can emit is a warning at every item
// status.
//
// RED PROBES (recorded in VERIFICATION.md): give the census lane one `"error"` finding, and
// separately add one of its codes to `CONTROL_FINDING_CODES`. Both are DRIVEN below.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { invoke } from "../../../src/command-core.mjs";
import { CHECK_GROUPS } from "../../../src/work/doctor.mjs";
import { CONTROL_FINDING_CODES } from "../../../src/work/doctor-controls.mjs";
import { DEPENDS_FINDING_CODES, dependsLane } from "../../../src/work/doctor-depends.mjs";
import { DOCTOR_GATE_CODES, admittedDoctorFindings } from "../../../src/commands/loop.mjs";
import { ITEM_STATUS_EDGES } from "../../../src/acceptance-horizon.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { resolveDeclaredSet } from "../../../src/story-contract.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const laneDir = path.join(repoRoot, "src", "work");

// THE ONE NAMED EXEMPTION. Named as a constant rather than skipped inline, because "the module we
// happen not to check" and "the module we have decided not to check, and why" are different
// documents to the next reader — and only the second one makes a SECOND exemption visible.
const GATE_SOURCE_MODULE = "doctor-controls.mjs";

const sourceOf = async (leaf) => stripComments(await readFile(path.join(laneDir, leaf), "utf8"));
const byCode = (findings, code) => findings.filter((entry) => entry.code === code);

// Every `src/work/doctor-*.mjs`, resolved to { leaf, module, registered, codes }. A lane is matched
// to its module by FUNCTION IDENTITY against the registry — not by name, which would let a rename
// quietly empty this control instead of reding it.
async function laneModules() {
  const leaves = (await readdir(laneDir)).filter((name) => /^doctor-.*\.mjs$/u.test(name));
  const rows = [];
  for (const leaf of leaves) {
    const module = await import(pathToFileURL(path.join(laneDir, leaf)).href);
    const registered = Object.entries(module)
      .filter(([, value]) => typeof value === "function" && CHECK_GROUPS.includes(value))
      .map(([name]) => name);
    const codeArrays = Object.entries(module).filter(([name, value]) => /_FINDING_CODES$/u.test(name) && Array.isArray(value));
    rows.push({ leaf, module, registered, codeArrays });
  }
  return rows;
}

// THE CLASS CHECK, as a predicate over (a lane's source, its codes, the controls' codes) so both
// red probes below can be driven through the same instrument the green path uses.
function advisoryFaults({ leaf, source, codes, controlCodes }) {
  const faults = [];
  for (const code of codes) {
    if (controlCodes.includes(code)) faults.push(`${leaf}: ${code} is in CONTROL_FINDING_CODES, which is the gate's source`);
  }
  if (source.includes('"error"')) faults.push(`${leaf}: names an "error" severity literal`);
  const constants = source.match(/[A-Z_]*SEVERITY\s*=\s*"[a-z-]+"/gu) ?? [];
  if (constants.length !== 1) faults.push(`${leaf}: severity is ${constants.length} module constant(s), not one`);
  else if (!constants[0].endsWith('"warn"')) faults.push(`${leaf}: its severity constant is ${constants[0]}`);
  if (/severityFor|acceptance-horizon|acceptanceHorizon/u.test(source)) faults.push(`${leaf}: consults the acceptance horizon`);
  return faults;
}

// ── task 04's admission outline ───────────────────────────────────────────────────────────────
const ADMISSION_ROWS = Object.freeze([
  { code: "depends-edge-unwitnessed", severity: "warn", admitted: false, why: "not in the admitted set, and not an error either" },
  { code: "depends-edges-unchecked", severity: "warn", admitted: false, why: "same, and it reports a leg that did not run" },
  { code: "depends-edges-unchecked", severity: "error", admitted: false, why: "the code is not admitted, so severity is not what protects it" },
  { code: "scenario-unjoined", severity: "warn", admitted: false, why: "the rubric lane's own array, disjoint from the controls'" },
  { code: "loop-record-unsigned", severity: "warn", admitted: false, why: "the loop-record lane's own array, disjoint likewise" },
  { code: "control-unregistered", severity: "error", admitted: true, why: "a controls code at error — the gate still gates" },
  { code: "control-unregistered", severity: "warn", admitted: false, why: "an admitted code below error is not admitted" },
  { code: "verification-register-missing", severity: "error", admitted: false, why: "filtered out of the admitted set by its `verification-` prefix" },
  { code: "control-runner-unchecked", severity: "error", admitted: false, why: "filtered out by name, being a leg that did not run" },
  { code: "staged-control", severity: "error", admitted: true, why: "a controls code at error" },
]);

// ── a real fixture stream, for the three behavioural scenarios ────────────────────────────────
const FIXTURE_DATE = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const frontmatter = (fields) => `---\n${Object.entries(fields)
  .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`)
  .join("\n")}\n---\n`;

async function withStream(milestones, body) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-advisory-lane-"));
  const workDir = path.join(repo, "wiki", "work");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(workDir, { recursive: true });
  await writeFile(path.join(repo, ".aof", "aof.config.json"), JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }), "utf8");
  try {
    for (const milestone of milestones) {
      const milestoneDir = path.join(workDir, `${milestone.number}_milestone_stage`);
      await mkdir(milestoneDir, { recursive: true });
      await writeFile(path.join(milestoneDir, "SPEC.md"), frontmatter({
        type: "milestone", number: milestone.number, slug: "stage", title: "M", status: "in-progress",
        owner: "product-owner", created: FIXTURE_DATE, updated: FIXTURE_DATE, schema: 1, aofVersion: "0.1.0",
        ...(milestone.depends ? { depends: milestone.depends } : {}),
      }), "utf8");
      for (const item of milestone.stories ?? []) {
        const storyDir = path.join(milestoneDir, "stories", `${item.number}_story_slice`);
        await mkdir(storyDir, { recursive: true });
        await writeFile(path.join(storyDir, "STORY.md"), frontmatter({
          type: "story", number: item.number, slug: "slice", title: "S", parent: milestone.number,
          status: "in-progress", owner: "product-owner", created: FIXTURE_DATE, updated: FIXTURE_DATE,
          schema: 1, aofVersion: "0.1.0",
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

// A stream over which the depends lane reports TEN unwitnessed edges AND its coverage finding: one
// dependency writing a path nobody reads, ten dependents each reading somewhere else, and one
// milestone→milestone edge that can never be evaluated because neither endpoint is a story. The
// second milestone is what makes the coverage finding fire — a stream whose every edge IS readable
// has nothing to report a denominator about, which is the honest-no-op the lane already keeps.
// EVERY READ IS A PATH SOME SIBLING DECLARES IT WRITES, and that is load-bearing rather than
// tidy: `work:validate` is the rung BEFORE the doctor on the gate ladder and short-circuits it, so
// a fixture with an unclaimed read would stop the loop for a reason that has nothing to do with
// this lane, and the case below would pass while measuring the wrong rung. Each dependent reads
// what its NEIGHBOUR writes — never what its DEPENDENCY writes — so every edge stays unwitnessed.
const TEN_UNWITNESSED = [
  {
    number: "00",
    stories: [
      { number: "00", files: ["src/written.mjs"], reads: ["src/out-01.mjs"] },
      ...Array.from({ length: 10 }, (unused, index) => {
        const mine = String(index + 1).padStart(2, "0");
        const neighbour = String(((index + 1) % 10) + 1).padStart(2, "0");
        return { number: mine, depends: ["00"], reads: [`src/out-${neighbour}.mjs`], files: [`src/out-${mine}.mjs`] };
      }),
    ],
  },
  { number: "01", depends: ["00"] },
];

const NO_DEPENDS = [{
  number: "00",
  stories: [
    { number: "00", files: ["src/written.mjs"], reads: ["src/other.mjs"] },
    { number: "01", reads: ["src/written.mjs"], files: ["src/other.mjs"] },
  ],
}];

// ── the lane's own findings, at every item status ─────────────────────────────────────────────
const NOWHERE_ROOT = path.join(repoRoot, "no-such-root-ff12402");
const NOWHERE_STORY = path.join(NOWHERE_ROOT, "wiki", "work", "00_milestone_m", "stories", "00_story_s");
const setOf = (...values) => resolveDeclaredSet(
  `---\nreads: [${values.join(", ")}]\nfiles: [placeholder.mjs]\n---\n`,
  "reads",
  { storyDir: NOWHERE_STORY, projectRoot: NOWHERE_ROOT },
).entries;

// A fixture reaching BOTH of the lane's codes, with every item carrying the given status — so
// "inside the acceptance horizon" and "outside it" are the same fixture with one word changed.
const everyCodeAt = (status) => ({
  workDir: path.join(NOWHERE_ROOT, "wiki", "work"),
  items: [
    { ref: "07", dir: path.join(NOWHERE_ROOT, "d07"), type: "milestone", number: "07", parent: null, status, meta: { status, depends: ["08"] }, contract: null },
    { ref: "08", dir: path.join(NOWHERE_ROOT, "d08"), type: "milestone", number: "08", parent: null, status, meta: { status }, contract: null },
    {
      ref: "00/00", dir: path.join(NOWHERE_STORY, "00"), type: "story", number: "00", parent: "00", status,
      meta: { status }, contract: { reads: null, files: setOf("src/b.mjs"), present: { reads: false, files: true }, malformed: { reads: false, files: false } },
    },
    {
      ref: "00/01", dir: path.join(NOWHERE_STORY, "01"), type: "story", number: "01", parent: "00", status,
      meta: { status, depends: ["00"] }, contract: { reads: setOf("src/a.mjs"), files: null, present: { reads: true, files: false }, malformed: { reads: false, files: false } },
    },
  ],
});

export const archTests = [
  {
    name: "arch/124/00 FF-12402: the CLASS — every registered lane with its own frozen code array is disjoint from the gate's source, names no `error`, and consults no horizon",
    run: async () => {
      const rows = await laneModules();
      assert.ok(rows.length >= 7, `the doctor lane family resolved (${rows.length} modules)`);

      const advisory = [];
      let exemptions = 0;
      for (const row of rows) {
        if (row.registered.length === 0 || row.codeArrays.length === 0) continue;
        for (const [name, codes] of row.codeArrays) {
          assert.ok(Object.isFrozen(codes), `${row.leaf}: ${name} is frozen — a new code is an ADR-level act`);
          assert.ok(codes.length > 0, `${row.leaf}: ${name} is non-empty`);
        }
        if (row.leaf === GATE_SOURCE_MODULE) {
          // THE ONE NAMED EXEMPTION, asserted as an exemption rather than skipped: its array IS
          // the gate's source, which is the whole reason the other lanes' arrays cannot gate.
          exemptions += 1;
          assert.deepEqual(
            row.codeArrays.map(([, codes]) => [...codes]),
            [[...CONTROL_FINDING_CODES]],
            `${GATE_SOURCE_MODULE} is exempt because its array IS CONTROL_FINDING_CODES — that identity is the exemption's reason, and it is asserted`,
          );
          continue;
        }
        advisory.push(row);
        const source = await sourceOf(row.leaf);
        for (const [, codes] of row.codeArrays) {
          assert.deepEqual(
            advisoryFaults({ leaf: row.leaf, source, codes, controlCodes: CONTROL_FINDING_CODES }),
            [],
            `${row.leaf} is an advisory lane and must be structurally unable to gate`,
          );
          // …and therefore unable to reach the ladder's admitted set, which is DERIVED from the
          // controls' array by filter.
          for (const code of codes) assert.equal(DOCTOR_GATE_CODES.includes(code), false, `${code} is not admitted by the loop's gate ladder`);
        }
      }

      // NON-VACUITY, three ways. The class has at least three members; the exemption is exactly
      // one; and the gate really does admit something, so "disjoint from the admitted set" is a
      // claim about a live gate rather than about an empty one.
      assert.ok(advisory.length >= 3, `the class has at least three members (${advisory.map((row) => row.leaf).join(", ")})`);
      assert.equal(exemptions, 1, "exactly one exemption, and it is the named one");
      assert.ok(advisory.some((row) => row.leaf === "doctor-depends.mjs"), "…and this milestone's lane is one of them");
      assert.ok(DOCTOR_GATE_CODES.length > 0 && CONTROL_FINDING_CODES.length > 0, "the gate ladder admits something");
      assert.ok(DOCTOR_GATE_CODES.every((code) => CONTROL_FINDING_CODES.includes(code)), "and its set is derived from the controls' by filter");

      // RED PROBE (a) — the census lane given one `"error"` finding.
      const laneSource = await sourceOf("doctor-depends.mjs");
      const withError = laneSource.replace('const ADVISORY_SEVERITY = "warn"', 'const ADVISORY_SEVERITY = "warn";\nconst HARD = "error"');
      assert.notEqual(withError, laneSource, "the probe really did change the source it plants into");
      assert.ok(
        advisoryFaults({ leaf: "doctor-depends.mjs", source: withError, codes: DEPENDS_FINDING_CODES, controlCodes: CONTROL_FINDING_CODES })
          .some((fault) => fault.includes('names an "error" severity literal')),
        "the class check reds on a planted error severity",
      );

      // RED PROBE (b) — one of the lane's codes added to `CONTROL_FINDING_CODES`, which is where a
      // derived-by-filter set silently gains a member.
      assert.ok(
        advisoryFaults({
          leaf: "doctor-depends.mjs",
          source: laneSource,
          codes: DEPENDS_FINDING_CODES,
          controlCodes: [...CONTROL_FINDING_CODES, "depends-edge-unwitnessed"],
        }).some((fault) => fault.includes("is in CONTROL_FINDING_CODES")),
        "the class check reds on a code smuggled into the gate's source",
      );
    },
  },
  {
    name: "arch/124/00 FF-12402 (task 04): what the doctor rung admits — the code set does the work, and severity alone never opens it",
    run: () => {
      for (const row of ADMISSION_ROWS) {
        const finding = { code: row.code, severity: row.severity, path: "x", message: "m" };
        assert.equal(
          admittedDoctorFindings([finding]).length === 1,
          row.admitted,
          `${row.code} at ${row.severity} is ${row.admitted ? "" : "not "}admitted — ${row.why}`,
        );
      }
      // NON-VACUITY: the table reaches both answers, and the rung really does admit the rows that
      // say `yes` when they are handed together with the rows that say `no`.
      const admittedRows = ADMISSION_ROWS.filter((row) => row.admitted);
      assert.ok(admittedRows.length >= 2 && admittedRows.length < ADMISSION_ROWS.length, "the table has teeth on both sides");
      const together = admittedDoctorFindings(ADMISSION_ROWS.map((row) => ({ code: row.code, severity: row.severity, path: "x", message: "m" })));
      assert.deepEqual(together.map((finding) => `${finding.code}@${finding.severity}`), admittedRows.map((row) => `${row.code}@${row.severity}`));
    },
  },
  {
    name: "arch/124/00 FF-12402 (task 04): a stream full of census findings stops no loop",
    run: async () => {
      // THE RUNG, NOT A RE-IMPLEMENTATION OF IT. `invokeGateLadder` is module-private, and its
      // doctor rung is exactly `admittedDoctorFindings(doctor?.findings)` — pinned below — so the
      // honest drive is the real doctor run through the real filter.
      const shell = stripComments(await readFile(path.join(repoRoot, "src", "commands", "loop.mjs"), "utf8"));
      assert.match(shell, /const admitted = admittedDoctorFindings\(doctor\?\.findings\);/u, "the doctor rung filters through the exported predicate");

      const measure = async (stories) => withStream(stories, async ({ ctx }) => {
        const doctor = await invoke("work:doctor", { scope: "00" }, ctx);
        const validate = await invoke("work:validate", { scope: "00" }, ctx);
        return {
          depends: doctor.findings.filter((finding) => DEPENDS_FINDING_CODES.includes(finding.code)),
          admitted: admittedDoctorFindings(doctor.findings),
          validateFindings: validate.findings,
        };
      });

      const loud = await measure(TEN_UNWITNESSED);
      assert.equal(byCode(loud.depends, "depends-edge-unwitnessed").length, 10, "the lane reports ten unwitnessed edges…");
      assert.equal(byCode(loud.depends, "depends-edges-unchecked").length, 1, "…and its unchecked finding");
      assert.deepEqual(loud.admitted, [], "the `work:doctor` rung reports zero admitted findings");

      // …AND THE LADDER CROSSES EXACTLY AS IT DOES ON A STREAM WITH NO DEPENDS FINDINGS. Both
      // rungs are compared, because the ladder short-circuits on `work:validate` first and a
      // difference there would be the real reason a loop stopped.
      const quiet = await measure(NO_DEPENDS);
      assert.deepEqual(quiet.depends, [], "the control stream has no depends findings at all");
      assert.deepEqual(loud.admitted, quiet.admitted, "the doctor rung answers identically on both streams");
      assert.deepEqual(loud.validateFindings, quiet.validateFindings, "…and so does the rung before it");
      assert.deepEqual(loud.validateFindings, [], "…both green, so the ladder crosses to the next step");

      // AND NO HALT NAMES A DEPENDS CODE. The shell mints the halts; the decider names the stops.
      const decider = stripComments(await readFile(path.join(repoRoot, "src", "work", "loop.mjs"), "utf8"));
      for (const code of DEPENDS_FINDING_CODES) {
        assert.equal(shell.includes(code), false, `the loop shell names no ${code}`);
        assert.equal(decider.includes(code), false, `and neither does the decider`);
      }
    },
  },
  {
    name: "arch/124/00 FF-12402 (task 04): acceptance runs one named group, and this is not it",
    run: async () => {
      // THE PREFLIGHT, PINNED AT ITS SOURCE: one named group, one refusing code, one severity.
      const door = stripComments(await readFile(path.join(repoRoot, "src", "commands", "item-status.mjs"), "utf8"));
      assert.match(door, /groups: \[budgetGroup\]/u, "the acceptance preflight runs the budget group and no other");
      assert.match(door, /finding\.code === "doc-over-budget" && finding\.severity === "error"/u, "…and only `doc-over-budget` at `error` can refuse the transition");
      const groupsPassed = door.match(/groups: \[[^\]]*\]/gu) ?? [];
      assert.deepEqual(groupsPassed, ["groups: [budgetGroup]"], "one named group is passed at this door, once");
      for (const code of DEPENDS_FINDING_CODES) assert.equal(door.includes(code), false, `the accepting door names no ${code}`);

      // …AND THE TRANSITION SUCCEEDS WITH THE DEPENDS FINDINGS STILL OUTSTANDING.
      await withStream(TEN_UNWITNESSED, async ({ ctx }) => {
        const before = await invoke("work:doctor", { scope: "00" }, ctx);
        const outstanding = before.findings.filter((finding) => DEPENDS_FINDING_CODES.includes(finding.code));
        assert.ok(outstanding.length > 1, `the stream carries outstanding depends findings (${outstanding.length})`);
        assert.ok(ITEM_STATUS_EDGES["in-progress"].includes("done"), "…and `in-progress → done` is a legal edge, so this drives the real gate");

        const moved = await invoke("work:status", { ref: "00/01", status: "done" }, ctx);
        assert.equal(moved.moved, true, "the story is accepted while its unwitnessed edge is still reported");

        const after = await invoke("work:doctor", { scope: "00" }, ctx);
        assert.ok(
          after.findings.some((finding) => DEPENDS_FINDING_CODES.includes(finding.code)),
          "…and the findings are still outstanding after it, because acceptance never cleared them",
        );
      });
    },
  },
  {
    name: "arch/124/00 FF-12402 (task 04): every finding the lane can make is a warning — at every item status, inside the horizon and out",
    run: async () => {
      // EVERY STATUS THE LIFECYCLE HAS, including `done`, where `severityFor` would answer `error`
      // if this lane consulted the acceptance horizon. It does not, and that opting-out is the
      // deliberate choice ADR-002 §1 makes.
      const statuses = Object.keys(ITEM_STATUS_EDGES);
      assert.ok(statuses.includes("done") && statuses.length === 5, "the frozen five, from their one home");
      let produced = 0;
      const rendered = new Map();
      for (const status of statuses) {
        const findings = dependsLane(everyCodeAt(status));
        assert.deepEqual(
          [...new Set(findings.map((entry) => entry.code))].sort(),
          [...DEPENDS_FINDING_CODES].sort(),
          `every code the lane has fires while the items are ${status}`,
        );
        for (const entry of findings) assert.equal(entry.severity, "warn", `${entry.code} is warn on a ${status} item`);
        produced += findings.length;
        rendered.set(status, JSON.stringify(findings));
      }
      assert.equal(produced, statuses.length * DEPENDS_FINDING_CODES.length, "the sweep is non-vacuous");
      // AN ITEM INSIDE THE ACCEPTANCE HORIZON GETS THE SAME ANSWER AS ONE OUTSIDE IT — byte for
      // byte, not merely the same severity.
      assert.equal(new Set(rendered.values()).size, 1, "the lane's answer does not move with the item's status");

      // …and structurally: ONE severity constant, no `error` literal, no horizon.
      const source = await sourceOf("doctor-depends.mjs");
      assert.deepEqual(
        advisoryFaults({ leaf: "doctor-depends.mjs", source, codes: DEPENDS_FINDING_CODES, controlCodes: CONTROL_FINDING_CODES }),
        [],
      );
      assert.equal((source.match(/ADVISORY_SEVERITY/gu) ?? []).length >= 2, true, "the constant is declared once and used, never passed in");
      assert.doesNotMatch(source, /severity[,)]|severity\s*=\s*\w+\s*\)/u, "severity is never a per-call argument");
    },
  },
  {
    name: "arch/124/00 FF-12402 (task 04): the exemption is named, and the gate is still capable of gating",
    run: async () => {
      const rows = (await laneModules()).filter((row) => row.registered.length > 0 && row.codeArrays.length > 0);
      const named = rows.filter((row) => row.leaf === GATE_SOURCE_MODULE);
      // ONE LANE, spelled as the floor plus a declared ceiling, never as a retyped count (FF-11902).
      assert.ok(named.length >= 1, `${GATE_SOURCE_MODULE} was found among the lanes whose arrays feed the gate`);
      assert.ok(named.length <= 1, `${GATE_SOURCE_MODULE} is the one lane whose array is the gate's source — found ${named.length}`);
      assert.deepEqual(
        named[0].codeArrays.map(([, codes]) => [...codes]),
        [[...CONTROL_FINDING_CODES]],
        "…and it is exempt because of that identity, which is asserted rather than assumed",
      );

      // EVERY OTHER SUCH LANE'S CODES ARE ABSENT FROM THE LOOP'S ADMITTED SET.
      const others = rows.filter((row) => row.leaf !== GATE_SOURCE_MODULE);
      assert.ok(others.length >= 3, `the class has at least three other members (${others.map((row) => row.leaf).join(", ")})`);
      for (const row of others) {
        for (const [, codes] of row.codeArrays) {
          for (const code of codes) {
            assert.equal(DOCTOR_GATE_CODES.includes(code), false, `${row.leaf}'s ${code} is not admitted`);
            assert.equal(CONTROL_FINDING_CODES.includes(code), false, `…and not in the gate's source array either`);
          }
        }
      }

      // AND THE ADMITTED SET IS NON-EMPTY, so the walk above is a PASSING GATE rather than a
      // disabled one — the difference between "nothing of ours gets through" and "nothing does".
      assert.ok(DOCTOR_GATE_CODES.length > 0, `the admitted set is non-empty (${DOCTOR_GATE_CODES.length} codes)`);
      assert.equal(
        admittedDoctorFindings([{ code: DOCTOR_GATE_CODES[0], severity: "error", path: "x", message: "m" }]).length,
        1,
        "…and it really admits one",
      );
    },
  },
];
