// FF-12401 (124/ADR-001) — THE CENSUS REPORTS ITS DENOMINATOR, AND RENDERS NO VERDICT IT CANNOT
// REACH.
//
// A report that names ten suspect edges and stays silent about the 182 it could not read describes
// 21% of the graph in a voice that sounds like all of it. That is this milestone's own thesis
// pointed at its own first outcome, so the denominator is asserted here as an IDENTITY over the
// edge set rather than checked as a summary line: `witnessed + unwitnessed + unchecked(type) +
// unchecked(undeclared) = considered`, on every input including the degenerate ones. A census whose
// parts do not sum to its whole can drop an edge class in silence — and the identity has already
// caught one, ADR-001's own table having left `78 → 79` out and closed at 229 of 230.
//
// AND IT RENDERS NO VERDICT. The check cannot separate a false edge from legitimate capability
// ordering — `96/03 → 96/01` is exactly that shape: a real, deliberate edge whose two sets are
// genuinely disjoint — so the code says `depends-edge-unwitnessed` and the word `phantom` appears
// in none of the lane's codes, messages or exports. THE SWEEP IS SCOPED TO THE LANE MODULE, and
// deliberately: the word already stands as prose in two comments in files this story edits
// (`src/story-contract.mjs`, `src/work/doctor.mjs`), so a tree-wide sweep would red on arrival and
// invite deleting honest prose to make a control pass. A control that teaches the next author to
// launder their comments is worse than no control.
//
// THIS IS THE ONE PLACE THIS REPOSITORY'S OWN STREAM IS MEASURED for the census. Two scenarios were
// deliberately left out of `test/work/doctor-depends-lane.test.mjs` and live here — task 02's "how a
// real edge in this stream is classified" and task 03's "the census over this stream closes, and is
// not vacuous" — so the two suites cannot come to measure the stream two ways.
//
// RED PROBE (recorded in VERIFICATION.md): make the unchecked finding conditional on there being at
// least one unwitnessed edge, and the denominator leg fails on a stream with zero unwitnessed edges
// and 182 unreadable ones — the exact inversion that would let a blind run read as a covered one.
// Driven below rather than described.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSnapshot, doctorWork, isDriver } from "../../../src/work/doctor.mjs";
import {
  DEPENDS_FINDING_CODES,
  classifyDependsEdges,
  dependsLane,
  resolvedDependsEdges,
} from "../../../src/work/doctor-depends.mjs";
import { resolveDeclaredSet } from "../../../src/story-contract.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { validateWork } from "../../../src/commands/validate.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const workDir = path.join(repoRoot, "wiki", "work");
const LANE = "src/work/doctor-depends.mjs";

// THE STREAM, READ ONCE. Four of the five cases below are claims about this repository's own work
// stream, and building the snapshot five times would pay for the same traversal five times over.
let streamSnapshot = null;
const stream = async () => {
  streamSnapshot ??= await buildSnapshot(workDir, { projectRoot: repoRoot });
  return streamSnapshot;
};

const asList = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);
const byCode = (findings, code) => findings.filter((entry) => entry.code === code);

// ── the literal fixtures ──────────────────────────────────────────────────────────────────────
//
// Item paths naming a directory that is on no disk, so a lane that had reached the filesystem
// would fault rather than quietly pass.
const NOWHERE_ROOT = path.join(repoRoot, "no-such-root-ff12401");
const NOWHERE_STORY = path.join(NOWHERE_ROOT, "wiki", "work", "00_milestone_m", "stories", "00_story_s");

// A resolved declared set, built through the ONE HOME (124/ADR-003 §1) rather than hand-rolled:
// a fixture spelling `{ path, directory }` itself would keep passing on the day the resolver moved.
const setOf = (...values) => resolveDeclaredSet(
  `---\nreads: [${values.join(", ")}]\nfiles: [placeholder.mjs]\n---\n`,
  "reads",
  { storyDir: NOWHERE_STORY, projectRoot: NOWHERE_ROOT },
).entries;

const story = ({ number, parent = "00", depends = [], reads = null, files = null }) => ({
  ref: `${parent}/${number}`,
  dir: path.join(NOWHERE_STORY, number),
  type: "story",
  number,
  parent,
  meta: { depends },
  contract: {
    reads, files,
    present: { reads: reads != null, files: files != null },
    malformed: { reads: false, files: false },
  },
});

const driver = ({ number, depends = [] }) => ({
  ref: number,
  dir: path.join(NOWHERE_ROOT, "wiki", "work", `${number}_milestone_d`),
  type: "milestone",
  number,
  parent: null,
  meta: { depends },
  contract: null,
});

const snapshotOf = (...items) => ({ items, workDir: path.join(NOWHERE_ROOT, "wiki", "work") });

// Every shape the walk can reach, including both degenerate ends. `excluded` records whether the
// run had anything to report a denominator ABOUT, which is what the coverage finding is conditional
// on — and the only thing it is conditional on.
const FIXTURES = Object.freeze([
  {
    name: "all four classes present",
    snapshot: snapshotOf(
      driver({ number: "00", depends: ["01"] }),
      driver({ number: "01" }),
      story({ number: "00", files: setOf("src/b.mjs") }),
      story({ number: "01", depends: ["00"], reads: setOf("src/b.mjs") }),
      story({ number: "02", depends: ["00"], reads: setOf("src/z.mjs") }),
      story({ number: "03", depends: ["00"], reads: null }),
    ),
    considered: 4, witnessed: 1, unwitnessed: 1, type: 1, undeclared: 1,
  },
  {
    name: "every edge evaluable",
    snapshot: snapshotOf(
      story({ number: "00", files: setOf("src/b.mjs") }),
      story({ number: "01", depends: ["00"], reads: setOf("src/b.mjs") }),
      story({ number: "02", depends: ["00"], reads: setOf("src/z.mjs") }),
    ),
    considered: 2, witnessed: 1, unwitnessed: 1, type: 0, undeclared: 0,
  },
  {
    // THE RED PROBE'S OWN FIXTURE: everything excluded, NOTHING unwitnessed. A lane that made its
    // coverage finding conditional on an unwitnessed edge reports nothing at all here, and a run
    // that could read none of its edges reads as a clean one.
    name: "no edge evaluable at all",
    snapshot: snapshotOf(
      driver({ number: "00", depends: ["01", "02"] }),
      driver({ number: "01" }),
      driver({ number: "02" }),
      story({ number: "00", parent: "01", files: null }),
      story({ number: "01", parent: "01", depends: ["00"], reads: setOf("src/z.mjs") }),
    ),
    considered: 3, witnessed: 0, unwitnessed: 0, type: 2, undeclared: 1,
  },
  {
    name: "every edge witnessed",
    snapshot: snapshotOf(
      story({ number: "00", files: setOf("src/b.mjs") }),
      story({ number: "01", depends: ["00"], reads: setOf("src/b.mjs"), files: setOf("src/c.mjs") }),
      story({ number: "02", depends: ["01"], reads: setOf("src/c.mjs") }),
    ),
    considered: 2, witnessed: 2, unwitnessed: 0, type: 0, undeclared: 0,
  },
  {
    name: "no `depends:` edge in the stream",
    snapshot: snapshotOf(driver({ number: "00" }), story({ number: "00", reads: setOf("src/a.mjs"), files: setOf("src/b.mjs") })),
    considered: 0, witnessed: 0, unwitnessed: 0, type: 0, undeclared: 0,
  },
]);

// THE DENOMINATOR CHECK, AS A PREDICATE OVER SOME LANE — the real one on the green path, the
// planted one on the red. Returns the fixtures whose coverage reporting is wrong.
function denominatorFaults(lane) {
  const faults = [];
  for (const fixture of FIXTURES) {
    const excluded = fixture.type + fixture.undeclared;
    const emitted = byCode(lane(fixture.snapshot), "depends-edges-unchecked").length;
    const expected = excluded > 0 ? 1 : 0;
    if (emitted !== expected) {
      faults.push(`${fixture.name}: ${excluded} excluded edge(s) → expected ${expected} depends-edges-unchecked finding(s), got ${emitted}`);
    }
  }
  return faults;
}

// THE RED PROBE: the coverage finding made conditional on there being at least one unwitnessed
// edge. It is the most plausible wrong version of this lane — "don't nag when there's nothing to
// report" — and it is exactly the inversion that lets a stream nobody could read look covered.
const conditionalOnUnwitnessed = (snapshot) => {
  const findings = dependsLane(snapshot);
  return classifyDependsEdges(snapshot).unwitnessed.length > 0
    ? findings
    : findings.filter((entry) => entry.code !== "depends-edges-unchecked");
};

// ── the verdict the lane may not render ───────────────────────────────────────────────────────
//
// `phantom` first, because it is the word ADR-001 refuses by name; the rest are the same verdict
// wearing other clothes. A reader who acts on any of them deletes a real edge.
const FORBIDDEN_VERDICT = Object.freeze(["phantom", "false edge", "unnecessary", "redundant", "spurious", "bogus", "should be removed", "can be deleted"]);

const verdictFaultsIn = (text, where) =>
  FORBIDDEN_VERDICT.filter((token) => text.toLowerCase().includes(token)).map((token) => `${where} names "${token}"`);

// ── task 02's outline: one real edge per class the walk can reach ─────────────────────────────
const REAL_EDGES = Object.freeze([
  { from: "119/03", to: "119/00", cls: "witnessed", why: "an entry appears verbatim in both sets" },
  { from: "119/03", to: "119/02", cls: "witnessed", why: "`src/commands/test.mjs` sits beneath 119/02's authored `src/commands/`" },
  { from: "96/03", to: "96/01", cls: "unwitnessed", why: "both sets present, nothing covered — and a deliberate edge nonetheless" },
  { from: "61/05", to: "61/04", cls: "unwitnessed", why: "both sets present, nothing covered" },
  { from: "01", to: "00", cls: "type", why: "both endpoints are milestones, which carry no contract fields" },
  { from: "32", to: "18", cls: "type", why: "a uat gate depending on a milestone" },
  { from: "78", to: "79", cls: "type", why: "the dependent is a milestone, so `reads:` can never exist for it" },
  { from: "40/02", to: "40/01", cls: "undeclared", why: "both are stories and at least one declares no contract" },
]);

const classOf = (census, from, to) => {
  const lanes = [["witnessed", census.witnessed], ["unwitnessed", census.unwitnessed], ["type", census.uncheckedType], ["undeclared", census.uncheckedUndeclared]];
  for (const [name, rows] of lanes) {
    if (rows.some((edge) => edge.from.ref === from && edge.to.ref === to)) return name;
  }
  return "absent from the walk";
};

// ── the authored fields, and the templates that ship them ─────────────────────────────────────
//
// ADR-001 §4: the lane reads `depends:`, `reads:` and `files:` and nothing else, and NO TEMPLATE
// GAINS A KEY. The story template's roster is frozen here because `reads:`/`files:` live on
// `STORY.md` and that is the record a new authored field would arrive on. Adding one is an
// ADR-level act — update this roster in the same change that makes it.
const STORY_TEMPLATE_KEYS = Object.freeze([
  "aofVersion", "created", "files", "number", "owner", "parent", "reads", "schema", "slug", "status", "title", "type", "updated",
]);

// The names a census like this one would invent if it were allowed to. None of them may appear as a
// frontmatter key in any shipped template.
const INVENTABLE_KEYS = Object.freeze(["witnesses", "witnessedBy", "unwitnessed", "dependsWitness", "contract", "edges", "provides", "consumes"]);

const frontmatterKeys = (text) => {
  const block = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (block == null) return [];
  return block[1].split(/\r?\n/).map((line) => line.match(/^([A-Za-z0-9_-]+):/)).filter(Boolean).map((match) => match[1]);
};

async function templateFiles() {
  const base = path.join(repoRoot, "src", "bundle", "templates");
  const found = [];
  for (const entry of await readdir(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const leaf of await readdir(path.join(base, entry.name))) {
      found.push(path.join("src", "bundle", "templates", entry.name, leaf));
    }
  }
  return found;
}

export const archTests = [
  {
    name: "arch/124/00 FF-12401: the lane's codes are exactly two, and no code, message or export renders the verdict `phantom`",
    run: async () => {
      assert.deepEqual([...DEPENDS_FINDING_CODES], ["depends-edge-unwitnessed", "depends-edges-unchecked"]);
      assert.ok(Object.isFrozen(DEPENDS_FINDING_CODES), "a third code is an ADR-level act, not an edit to a call site");

      // THE CODES, THE MESSAGES AND THE EXPORTS. The messages are read off findings the lane
      // actually produced, over a fixture that reaches BOTH codes — a sweep of message templates
      // it never renders would be a sweep of the wrong thing.
      const findings = dependsLane(FIXTURES[0].snapshot);
      const reached = new Set(findings.map((entry) => entry.code));
      assert.deepEqual([...reached].sort(), [...DEPENDS_FINDING_CODES].sort(), "non-vacuity: both codes were reached");
      for (const entry of findings) {
        assert.deepEqual(verdictFaultsIn(entry.code, `code ${entry.code}`), []);
        assert.deepEqual(verdictFaultsIn(entry.message, `the ${entry.code} message`), [], entry.message);
      }
      const module = await import("../../../src/work/doctor-depends.mjs");
      for (const name of Object.keys(module)) assert.deepEqual(verdictFaultsIn(name, `export ${name}`), []);

      // …AND THE LANE MODULE ITSELF, comment-stripped and SCOPED TO THIS ONE FILE. Tree-wide the
      // token stands as honest prose in two comments this story's diff passes over; a control that
      // reached them would be a control that teaches the next author to launder their comments.
      const source = stripComments(await readFile(path.join(repoRoot, LANE), "utf8"));
      assert.equal(/phantom/iu.test(source), false, "the lane's code spells no `phantom` anywhere outside its comments");

      // The sweep instrument is non-vacuous: it reports the word when the word is there.
      assert.ok(/phantom/iu.test(`${source}\nconst verdict = "phantom";\n`), "the sweep would report a planted verdict");
      assert.deepEqual(verdictFaultsIn("this edge is unnecessary", "a planted message"), ['a planted message names "unnecessary"']);
    },
  },
  {
    name: "arch/124/00 FF-12401: the four counts are an identity, and the coverage finding is ONE per run — never one per edge",
    run: () => {
      for (const fixture of FIXTURES) {
        const census = classifyDependsEdges(fixture.snapshot);
        assert.deepEqual(
          {
            considered: census.considered,
            witnessed: census.witnessed.length,
            unwitnessed: census.unwitnessed.length,
            type: census.uncheckedType.length,
            undeclared: census.uncheckedUndeclared.length,
          },
          {
            considered: fixture.considered, witnessed: fixture.witnessed,
            unwitnessed: fixture.unwitnessed, type: fixture.type, undeclared: fixture.undeclared,
          },
          `${fixture.name}: the four counts`,
        );
        // THE IDENTITY, on every fixture including both degenerate ends.
        assert.equal(
          census.witnessed.length + census.unwitnessed.length + census.uncheckedType.length + census.uncheckedUndeclared.length,
          census.considered,
          `${fixture.name}: witnessed + unwitnessed + unchecked(type) + unchecked(undeclared) = considered`,
        );
      }

      // ONE FINDING FOR THE RUN, NEVER ONE PER EDGE — and emitted whenever ANY edge went
      // unevaluated, whatever the unwitnessed count is.
      assert.deepEqual(denominatorFaults(dependsLane), []);

      // …and the exclusions are reported APART. Their sum is computed nowhere in the module: a
      // permanent design boundary and a shrinking authoring debt are not one problem.
      const [only] = byCode(dependsLane(FIXTURES[0].snapshot), "depends-edges-unchecked");
      assert.match(only.message, /1 unchecked because an endpoint is not a story/u);
      assert.match(only.message, /1 unchecked because a story has declared no contract/u);
      assert.match(only.message, /can NEVER be evaluated/u, "one is permanent by construction…");
      assert.match(only.message, /CAN be evaluated/u, "…and the other is a debt time clears");

      // RED PROBE — the coverage finding made conditional on an unwitnessed edge. The leg fails,
      // and it fails on the fixture that matters: everything excluded, nothing unwitnessed.
      const faults = denominatorFaults(conditionalOnUnwitnessed);
      assert.ok(faults.length > 0, "a conditional coverage finding does not pass this leg");
      assert.ok(
        faults.some((fault) => fault.startsWith("no edge evaluable at all")),
        `the blind-stream fixture is the one that reds; got ${JSON.stringify(faults)}`,
      );
      assert.ok(
        faults.every((fault) => !fault.startsWith("every edge witnessed")),
        "…and a stream with genuinely nothing to exclude is still silent about exclusions, under both lanes",
      );
    },
  },
  {
    name: "arch/124/00 FF-12401 (task 02): how a real edge in this stream is classified — one edge per class the walk can reach",
    run: async () => {
      const census = classifyDependsEdges(await stream());
      for (const row of REAL_EDGES) {
        assert.equal(
          classOf(census, row.from, row.to),
          row.cls,
          `${row.from} → ${row.to} is counted as ${row.cls} — ${row.why}`,
        );
      }
      // NON-VACUITY: the four classes the table names are the four classes the walk has, and each
      // one really was reached by more than the single row that names it.
      assert.deepEqual([...new Set(REAL_EDGES.map((row) => row.cls))].sort(), ["type", "undeclared", "unwitnessed", "witnessed"]);
      for (const rows of [census.witnessed, census.unwitnessed, census.uncheckedType, census.uncheckedUndeclared]) {
        assert.ok(rows.length > 0, "every class is populated on this stream");
      }
    },
  },
  {
    name: "arch/124/00 FF-12401 (task 03): the census over this stream closes against the edge set `validateWork` resolves, and is not vacuous",
    run: async () => {
      const snapshot = await stream();
      const census = classifyDependsEdges(snapshot);

      // THE IDENTITY, over the real stream.
      const sum = census.witnessed.length + census.unwitnessed.length + census.uncheckedType.length + census.uncheckedUndeclared.length;
      assert.equal(sum, census.considered, "the four counts sum to the number of edges considered");

      // …AND THE DOMAIN IS `validateWork`'S OWN, cross-checked rather than re-derived. Counting the
      // authored `depends:` entries needs no resolution rule at all, and `validateWork` supplies
      // the unresolvable count as its own findings — so the two sides of this equation are
      // independent of the lane and of each other.
      const config = (await loadWorkspace(repoRoot)).config;
      const unresolved = (await validateWork(workDir, config, undefined, { projectRoot: repoRoot }))
        .filter((finding) => /depends "[^"]*" does not resolve/u.test(finding.problem ?? ""));
      assert.deepEqual(unresolved.map((finding) => finding.problem), [], "every authored `depends:` entry in this stream resolves today");

      // A `depends:` SOURCE is a driver or a child story — `validateWork` resolves the edge for
      // exactly those two, and for nothing else (its 3a and 3a-bis). A PARENTLESS STORY IS A
      // TARGET AND NEVER A SOURCE: validate reports nothing about its `depends:`, and neither does
      // this lane, which is behaviour rather than an omission.
      const isSource = (item) => isDriver(item) || (item.type === "story" && item.parent != null && item.parent !== "");
      const authored = snapshot.items.filter(isSource).reduce((total, item) => total + asList(item.meta?.depends).length, 0);
      assert.equal(census.considered, authored - unresolved.length, "the lane's domain IS the edge set validateWork resolves");

      const parentless = snapshot.items.filter((item) => item.type === "story" && (item.parent == null || item.parent === ""));
      const strayed = parentless.reduce((total, item) => total + asList(item.meta?.depends).length, 0);
      assert.ok(strayed > 0, `non-vacuity: this stream really has parentless stories carrying \`depends:\` (${strayed} entries)`);
      assert.deepEqual(
        resolvedDependsEdges(snapshot.items).filter((edge) => parentless.includes(edge.from)).map((edge) => `${edge.from.ref} → ${edge.to.ref}`),
        [],
        "a parentless story is a depends TARGET and never a source, exactly as validateWork reads it",
      );

      // THE UNCHECKED COUNT IS GREATER THAN ZERO, AND AT LEAST ONE EDGE LANDED IN EACH OF THE FOUR
      // COUNTS. A census that closed at 0 = 0 would satisfy the identity and measure nothing.
      const excluded = census.uncheckedType.length + census.uncheckedUndeclared.length;
      assert.ok(excluded > 0, `the unchecked count is greater than zero (${excluded})`);
      assert.ok(census.witnessed.length > 0 && census.unwitnessed.length > 0, "…and both evaluable classes were reached");
      assert.ok(census.uncheckedType.length > 0 && census.uncheckedUndeclared.length > 0, "…and both exclusion reasons were reached");

      // …and the ENGINE carries it: run through `doctorWork` over this stream, the lane emits
      // exactly one coverage finding, anchored at the work-stream root the scope filter always
      // passes through, at `warn`, with one per-edge finding for each unwitnessed edge.
      const findings = await doctorWork(workDir, config, undefined, { groups: [dependsLane], projectRoot: repoRoot });
      const [coverage] = byCode(findings, "depends-edges-unchecked");
      assert.ok(coverage != null, "the coverage finding reaches the doctor's output");
      assert.equal(byCode(findings, "depends-edges-unchecked").length, 1, "exactly one, over the whole run");
      assert.equal(coverage.severity, "warn");
      assert.equal(coverage.path, workDir, "anchored at the work-stream root");
      assert.equal(byCode(findings, "depends-edge-unwitnessed").length, census.unwitnessed.length, "one finding per unwitnessed edge");
      for (const entry of findings) assert.equal(entry.severity, "warn", `${entry.code} is a warning`);
    },
  },
  {
    name: "arch/124/00 FF-12401: the lane reads only `depends:`/`reads:`/`files:`, and no work template gained a key",
    run: async () => {
      // THE LANE'S OWN FRONTMATTER VOCABULARY, swept off its source: every `meta` access it makes.
      // `reads:`/`files:` never arrive through `meta` at all — they are resolved at the engine's
      // one impure edge and handed over as `contract`, which is what keeps this lane pure.
      const source = stripComments(await readFile(path.join(repoRoot, LANE), "utf8"));
      const metaKeys = [...source.matchAll(/\bmeta\??\.(\w+)/gu)].map((match) => match[1]);
      assert.deepEqual([...new Set(metaKeys)].sort(), ["depends"], `the lane reads one frontmatter key; got ${JSON.stringify(metaKeys)}`);
      assert.ok(metaKeys.length > 0, "non-vacuity: it really does read one");
      // The lookbehind keeps `story-contract.mjs` — the import specifier of the shared home — out
      // of a sweep that is about property ACCESS, not about the word.
      const contractKeys = [...source.matchAll(/(?<![\w-])contract\??\.(\w+)/gu)].map((match) => match[1]);
      assert.deepEqual([...new Set(contractKeys)].sort(), ["files", "reads"], `and two resolved contract sets; got ${JSON.stringify(contractKeys)}`);

      // NO TEMPLATE GAINED A KEY (ADR-001 §4). The story template is the record `reads:`/`files:`
      // live on, so its roster is frozen: a new authored field would arrive here first.
      const templates = await templateFiles();
      assert.ok(templates.length >= 10, `the template sweep is non-vacuous (${templates.length} files)`);
      const storyTemplate = path.join("src", "bundle", "templates", "story", "STORY.md");
      assert.ok(templates.includes(storyTemplate), "the story template is in the sweep");
      assert.deepEqual(
        frontmatterKeys(await readFile(path.join(repoRoot, storyTemplate), "utf8")).sort(),
        [...STORY_TEMPLATE_KEYS],
        "124/ADR-001 §4 froze this roster — adding a story frontmatter key is an ADR-level act, and this roster moves in the same change",
      );

      // …and no template anywhere carries a key this census could have invented for itself.
      for (const relative of templates) {
        const keys = frontmatterKeys(await readFile(path.join(repoRoot, relative), "utf8"));
        for (const invented of INVENTABLE_KEYS) {
          assert.equal(keys.includes(invented), false, `${relative} carries no \`${invented}:\` — the census reads what is already authored`);
        }
      }
    },
  },
];
