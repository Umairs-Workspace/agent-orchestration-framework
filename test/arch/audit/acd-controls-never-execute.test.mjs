// FF-6605 (milestone 66 / ADR-003, ADR-004 §2, ADR-009 ROUND 3/3 + 3/4) — THE
// CONTROLS LANE READS, NEVER RUNS, AND IS PURE.
//
// "No `node:child_process`/`node:fs`/`node:process` import, no dynamic `import()`, no
//  clock; every export is `(snapshot, ctx) => Finding[]`; the same snapshot yields
//  byte-identical findings in-process and in a fresh process. Purity is over DIRECT
//  imports plus a named leaf allowlist (ROUND 3/4), and the controls lane is a TRUE
//  LEAF that takes item identity from the snapshot ROWS rather than importing
//  `ITEM_RE`/`isDriver` — so the dependency direction INVERTS: the spine imports the
//  leaf to learn which paths to probe (ROUND 3/3)."
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE RULE IS DIRECT-PLUS-ALLOWLIST AND NOT TRANSITIVE, MEASURED AT HEAD.
// ROUND 3/4 ruled the transitive wording UNSATISFIABLE alongside the house idiom, and
// this file re-measures that rather than repeating it: both existing doctor lanes
// import the spine (`work-doctor-coherence.mjs`, `work-doctor-freshness.mjs`) and the
// spine imports `node:fs/promises`, so every lane in the family reaches `node:fs` in
// ONE hop. A transitive rule would therefore have been RED ON ARRIVAL — a control
// whose first run fails for a reason that has nothing to do with the thing it guards.
// The lane below is held to the strictly stronger practical rule instead: its DIRECT
// imports are exactly `node:path` plus TWO named leaves, and each leaf's own zero-import
// property is asserted HERE, so the allowlist is closed rather than assumed.
//
// AND THE INVERSION IS ASSERTED IN BOTH DIRECTIONS. "The lane does not import the
// spine" is only half the claim; the other half — "the spine imports the lane" — is
// what makes the leaf reachable at all, and asserting only the first would pass on a
// lane nothing calls.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTROL_GROUPS,
  controlsLane,
  citedControlPathsIn,
  isControlFileName,
} from "../../../src/work/doctor-controls.mjs";
// THE ONE HOME for cutting source (milestone 47 / F-47-04-ARCH-2). Its `stripComments`
// strips LINE COMMENTS FIRST — TECH_DEBT item 24's trap order, which 66/00's review
// found as this repo's first LIVE false green (F-01). A second stripper written beside
// it is copy 35, and this file does not write one.
import { stripComments } from "../../support/source-slice.mjs";
// THE ONE HOME for "what does this module import?" (119/ADR-002; chore 121). The extractor this
// file used to spell was line-bounded (`[^;\n]*?`) and so blind to a multi-line import clause —
// the defect the home documents and fixed once, for every caller.
import { importSpecifiers } from "../../support/module-family.mjs";
// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED BY MILESTONE 59 / STORY 02 (FF-5905, 59/ADR-002 §1 + §2).
//
// 59 is the milestone that gives ACD AN EXECUTOR. `aof work audit` re-runs a recorded control in
// a bounded child process, which is the exact act 66 froze one milestone ago — and both rules are
// right: **`aof work doctor` asks whether the documents are coherent; `aof work audit` asks
// whether the instruments that produce them still work.** They cannot live in one command, so the
// boundary between them is a COMMAND rather than a convention, and a convention is what this file
// exists to stop it becoming.
//
// The refusal is therefore re-asserted from THIS side, by the milestone that had a motive to
// weaken it, and four further clauses are added:
//
//   (1) `src/work/doctor-controls.mjs` still reaches no `node:child_process`, no dynamic
//       `import()`, no `node:fs/promises` and no wall-clock — 66/FF-6605 unweakened.
//   (2) NO module under `src/work-audit/` is reachable from `src/work/doctor.mjs` or from any
//       module in its `CHECK_GROUPS` registry. Asserted over the whole IMPORT CLOSURE rather than
//       over direct imports, because the edge that would matter is the one somebody adds two hops
//       away, in a shared helper, without ever touching a doctor file.
//   (3) The only edge the OTHER way is to the pure register extractors ADR-002 §2 names. The audit
//       reads the register through one home and re-implements no grammar; importing anything else
//       out of the doctor family would be the audit taking a dependency on doctor's behaviour.
//   (4) Doctor's lane MODULES are unchanged — the audit adds none — and the audit's frozen
//       finding-code set is DISJOINT from `CONTROL_FINDING_CODES`, so neither command's severity
//       table can decide the other's meaning.
//
// A NOTE ON "THE LANE COUNT IS STILL 5", which FF-5905 states and which this file measures by
// NAME rather than by number (m47/R9). The five 66 counted are `coherence`, `freshness`, `budget`,
// `identity` and `controls`; `src/work/doctor-rubric.mjs` is 54/04's traceability lane and
// pre-dates this milestone, which is why the set below has six members and none of them is 59's.
// The load-bearing half is the last clause: **59 adds no doctor lane at all.**
import { AUDIT_FINDING_CODES } from "../../../src/work-audit/census.mjs";
import { EVIDENCE_FINDING_CODES } from "../../../src/work-audit/evidence.mjs";
import { CONTROL_FINDING_CODES } from "../../../src/work/doctor-controls.mjs";
import { CHECK_GROUPS } from "../../../src/work/doctor.mjs";
// EXTENDED BY 77/05 (FF-7707). The checked code space is `AUDITABLE_CODES` — a fold over the
// REGISTERED lanes — rather than two constants named here. The two imports above stay: they are the
// NON-VACUITY floors for the sides they measure, and a floor read from the thing under test would
// be a floor that moves with it.
import { AUDITABLE_CODES, LANE_NEUTRAL_CODES, REPORT_LANES, auditableCodesFor, laneVocabularyCollisions } from "../../../src/work-audit/report.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcDir = path.join(repoRoot, "src");

// ── FF-5905's OWN CONSTANTS ──────────────────────────────────────────────────────────────────

const AUDIT_FAMILY = "src/work-audit/";
// The doctor family, as a PATH PREFIX rather than a filename prefix (119/01). It was
// `leaf.startsWith("work-doctor")` — a filename-shaped rule that went vacuous the moment the
// family moved into `src/work/`, and the `edges >= 1` leg below is what turned that into a RED
// rather than a silent pass. `src/work/doctor` covers the spine and its eight lanes exactly as
// `work-doctor` did, and it is a prefix of the path the resolver already returns.
const DOCTOR_FAMILY = "src/work/doctor";

// The doctor lane modules, NAMED. A ninth arriving is an edit here; a member from
// `src/work-audit/` arriving is the failure this clause exists for.
const DOCTOR_LANE_MODULES = Object.freeze([
  "./doctor-coherence.mjs",
  "./doctor-freshness.mjs",
  "./doctor-budget.mjs",
  "./doctor-identity.mjs",
  "./doctor-controls.mjs",
  "./doctor-rubric.mjs",
  // THE SEVENTH, and it arrived exactly as this comment says one would — as an edit here. Milestone
  // 78 landed `loopRecordLane` in the spine and nothing updated the roster, so this control read RED
  // from that day until 96's milestone gate ran the whole tree and named it (chore 114). It is a
  // doctor lane and not an audit one: it READS a record and reports findings, which is the side of
  // ADR-002's boundary this clause exists to keep it on.
  "./doctor-loop-record.mjs",
  // THE EIGHTH — milestone 124 / story 00's depends census, arriving as the edit this comment says
  // one arrives as, in the same change that lands it rather than in the audit that finds it later.
  // It is a doctor lane on the same reading as the seventh: it reports findings about the work
  // stream and executes nothing, which is the side of ADR-002's boundary it belongs on.
  "./doctor-depends.mjs",
  // THE NINTH — milestone 133 / story 03's diagrams lane, named in the change that lands it. A
  // doctor lane on the same reading as the eighth: it reports on the work stream's own records
  // (an ADR's diagram links against the item's `diagrams/` listing) and executes nothing.
  "./doctor-diagrams.mjs",
]);

// ADR-002 §2's named extractors — the ONE edge from the audit into the doctor family. They are
// pure functions of text, which is what makes the edge safe in the direction it runs.
const ADMITTED_EXTRACTORS = Object.freeze(["fitnessDeclarations", "citedControlPathsIn", "redProbeRows"]);

// A relative specifier resolved against the importing module's repo-relative path. `node:` and
// bare package specifiers are not files of ours to walk.
function resolveRelative(rel, specifier) {
  if (specifier.startsWith("node:") || !specifier.startsWith(".")) return null;
  const joined = path.posix.normalize(path.posix.join(path.posix.dirname(rel), specifier));
  return joined.endsWith(".mjs") ? joined : `${joined}.mjs`;
}

// The IMPORT CLOSURE from a set of roots, over comment-stripped source. Breadth-first, following
// every relative static import, so a module three hops away is swept exactly as a direct one is.
async function importClosureFrom(roots) {
  const seen = new Map();
  const queue = [...roots];
  while (queue.length > 0) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    let code;
    try {
      code = stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
    } catch {
      continue;
    }
    seen.set(rel, code);
    for (const specifier of directImports(code)) {
      const resolved = resolveRelative(rel, specifier);
      if (resolved != null) queue.push(resolved);
    }
  }
  return seen;
}

// The named bindings a module imports from one specifier, e.g. `{ a, b as c }` -> ["a", "b"].
function namedBindingsFrom(code, specifier) {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(String.raw`import\s*\{([^}]*)\}\s*from\s*"${escaped}"`, "gu");
  const names = [];
  for (const match of code.matchAll(pattern)) {
    for (const clause of match[1].split(",")) {
      const text = clause.trim();
      if (text.length === 0) continue;
      names.push(text.includes(" as ") ? text.split(" as ")[0].trim() : text);
    }
  }
  return names;
}

// Every `.mjs` under a directory, repo-relative, recursively.
async function walkModules(relDir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(path.join(repoRoot, relDir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const child = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await walkModules(child)));
    else if (entry.name.endsWith(".mjs")) out.push(child);
  }
  return out;
}

const THE_LANE = "src/work/doctor-controls.mjs";
const THE_SPINE = "src/work/doctor.mjs";
// The two zero-import leaves this lane is allowed to reach, NAMED (never a count —
// m47/R9). Each one's zero-import property is asserted below, which is what makes the
// direct rule as strong as the transitive one would have been for this subgraph.
const LEAF_ALLOWLIST = ["../acceptance-horizon.mjs", "../declared-id.mjs"];
// `node:path` is admitted and the three named modules are not: `path.join` is a string
// operation, and the lane's own header forbids `path.resolve`, which reads
// `process.cwd()` and would be a hidden clock-equivalent impurity.
const BUILTIN_ALLOWLIST = ["node:path"];
const FORBIDDEN_BUILTINS = ["node:child_process", "node:fs", "node:fs/promises", "node:process", "node:worker_threads", "node:vm", "node:module"];

// EXTENDED BY MILESTONE 54 / STORY 01 (FF-5407, 54/ADR-001 + 54/ADR-006). 54 gives aof a
// runner — one, behind one command, at one impure edge — and the moment such a thing exists
// in the tree, this lane acquires a way to become an executor by ACCIDENT: one import, added
// by someone joining "the doctor knows which controls are unresolved" to "the grader knows
// which cases failed". They are two facts with two homes and no join (`m48/ADR-003`), and
// `66/FF-6605`'s whole claim — ACD NEVER EXECUTES ANYTHING — would be silently false the
// moment that edge existed, because the lane would reach a spawn one hop away.
//
// The SHAPE of 54's grade record is copied into the doctor's own idiom deliberately; the
// FILES are not imported. Naming them here is what keeps that distinction structural.
// 119/01 — these were SPECIFIER SPELLINGS, and a specifier is a fact about where the IMPORTER
// sits. `./work-grade.mjs` was the pure leaf as spelled from `src/work-doctor-controls.mjs`;
// from `src/work/doctor-controls.mjs` that same file is `./grade.mjs` — a spelling this list
// already carried meaning a DIFFERENT module, so the rule would have been vacuous and wrong at
// once. The forbidden set is now the RESOLVED module each spelling was reaching for, which is
// ADR-003 exactly: the decision is WHICH modules are forbidden; where they sit is derived.
const FORBIDDEN_MODULES = ["src/work/grade.mjs", "src/commands/grade.mjs"];

// THE FAMILY'S set is NARROWER than the lane's, and the difference is deliberate — corrected
// at 54/04's build, where the first reading of FF-5407 would have forced a SECOND report
// normaliser into existence. FF-5407 extends the forbidden-import set of THE CONTROLS LANE to
// both names; of the wider family it asks only that no engine "acquire a runner". The runner
// is `src/commands/grade.mjs` — the one impure edge, the one spawn. `src/work/grade.mjs` is a
// PURE LEAF that imports nothing, spawns nothing and reads no clock (FF-5406 pins exactly
// that), so importing it executes precisely as much as importing a frozen array does.
// Forbidding it to the whole family would have made 54/04's traceability lane write its own
// copy of the TAP normaliser — a second parser, which is the defect `66/ADR-003` and this
// milestone both refuse by name.
const FORBIDDEN_RUNNER_MODULES = ["src/commands/grade.mjs"];

// The deterministic engines FF-5407 covers beyond the lane itself: `work.mjs`'s
// `validateWork` and the whole `work-doctor*` family. A guard that read only the one lane
// would pass on the day the runner was imported into a SIBLING (`m15/R3`: a fitness grep
// must scan the whole module family it governs).
const DETERMINISTIC_ENGINES = [
  "src/work.mjs",
  "src/work/doctor.mjs",
  "src/work/doctor-controls.mjs",
  "src/work/doctor-coherence.mjs",
  "src/work/doctor-freshness.mjs",
  "src/work/doctor-identity.mjs",
  "src/work/doctor-budget.mjs",
  "src/work/doctor-loop-ready.mjs",
  // milestone 54 / story 04 — the traceability lane joins the family the day it is written,
  // because a guard that scans the family as it was is a guard that stops covering it.
  "src/work/doctor-rubric.mjs",
];

// Every DIRECT import specifier in a module — the static forms plus `export … from`. A dynamic
// `import()` is not a direct import and is left out, exactly as before; the extraction itself is
// the one home's.
function directImports(code) {
  return importSpecifiers(code).filter((entry) => !entry.dynamic).map((entry) => entry.specifier);
}

// A DYNAMIC import — the door that would let the lane execute a cited module's scope,
// which is ACD running a project's test code (ADR-004 §2). `import(` with anything
// inside it, and never `import {` or `import x from`.
const DYNAMIC_IMPORT = /\bimport\s*\(/;

// Wall-clock doors. `now` and `staleWindow` arrive through `ctx`; a lane that reads a
// clock cannot be replayed from a snapshot, which is the whole determinism contract.
const CLOCK = /\b(?:Date\.now|new\s+Date|performance\.now|process\.hrtime|Date\.parse)\b/;

// The non-vacuity witness for the stripper, MEASURED (66/00 F-01/F-06, and its four
// candidates): the non-blank code-line count against the ONE HOME's own output, which
// caught 4 of 4 genuinely-blinded modules with 0 false positives, where an export count
// caught 2 of 4 and a surviving-tail check caught 0 of 4.
function strippedBody(file, text, strip = stripComments) {
  const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  const body = strip(text);
  const hidden = codeLines(stripComments(text)) - codeLines(body);
  assert.ok(
    hidden <= 0,
    `the comment stripper hid ${hidden} line(s) of code in ${file} that the one home (test/support/source-slice.mjs) keeps — TECH_DEBT item 24: every sweep below is blind to that region and would report green over it`,
  );
  return body;
}

const read = async (relative) => ({ file: relative, text: await readFile(path.join(repoRoot, relative), "utf8") });

// A literal snapshot whose paths name a directory that DOES NOT EXIST — so a group
// that reached the filesystem would answer differently or throw, rather than pass.
const NOWHERE = path.join(path.sep === "\\" ? "C:\\no-such-root-ff6605" : "/no-such-root-ff6605", "wiki", "work");
const LITERAL_SNAPSHOT = {
  workDir: NOWHERE,
  projectRoot: path.dirname(path.dirname(NOWHERE)),
  topEntries: ["66_milestone_fixture"],
  storyEntries: {},
  selfNode: null,
  controlProbes: { "test/arch/landed.test.mjs": true, "test/arch/absent.test.mjs": false },
  runnerTexts: null,
  items: [
    {
      number: "66",
      type: "milestone",
      slug: "fixture",
      name: "66_milestone_fixture",
      ref: "66",
      parent: null,
      dir: path.join(NOWHERE, "66_milestone_fixture"),
      meta: { status: "in-progress" },
      stagedControls: [path.join(NOWHERE, "66_milestone_fixture", "tasks", "planted.test.mjs")],
      docTexts: {
        "ARCHITECTURE.md": [
          "# m66",
          "",
          "## Fitness functions",
          "",
          "| id | invariant | enforced by (arch-test) | from |",
          "|---|---|---|---|",
          "| **FF-01** | a landed control | `test/arch/landed.test.mjs` | ADR-004 |",
          "| **FF-02** | an unlanded one | `test/arch/absent.test.mjs` | ADR-004 |",
          "",
        ].join("\n"),
      },
      docs: {},
      docSizes: {},
      hasTasks: false,
    },
  ],
};

export const archTests = [
  {
    name: "arch/FF-6605: the lane's DIRECT imports are `node:path` plus two NAMED leaves, and each leaf's zero-import property is asserted here",
    run: async () => {
      const lane = await read(THE_LANE);
      const body = strippedBody(lane.file, lane.text);
      assert.ok(body.split(/\r?\n/).filter((line) => line.trim() !== "").length > 150, "non-vacuity: the lane's body was actually read");

      const specifiers = directImports(body);
      assert.ok(specifiers.length > 0, "non-vacuity: the import scan found the lane's imports");
      const admitted = [...BUILTIN_ALLOWLIST, ...LEAF_ALLOWLIST];
      assert.deepEqual(
        specifiers.filter((specifier) => !admitted.includes(specifier)),
        [],
        `the lane imports only ${admitted.join(", ")} — widening the allowlist is an ADR act, and every name on it is asserted zero-import below`,
      );
      // …and every FORBIDDEN builtin is absent by name, so the assertion fails with the
      // door that was opened rather than with a set difference.
      for (const forbidden of FORBIDDEN_BUILTINS) {
        assert.equal(specifiers.includes(forbidden), false, `the lane must not import ${forbidden} — leg A is a stat and leg B a text read, both taken at the snapshot boundary`);
      }
      // FF-5407 (milestone 54 / story 01) — …and not the GRADE modules either. 54's runner
      // is the first thing in this tree that legitimately executes a project's suite; the
      // lane must not be able to reach it, now or by a later accident.
      const laneTargets = specifiers.map((specifier) => resolveRelative(THE_LANE, specifier)).filter((rel) => rel != null);
      for (const forbidden of FORBIDDEN_MODULES) {
        assert.equal(laneTargets.includes(forbidden), false, `the lane must not import ${forbidden} — the grade's SHAPE is copied into this lane's idiom; the FILE is not (FF-5407)`);
      }

      // THE ALLOWLIST IS CLOSED: each named leaf has ZERO imports of its own, so the
      // direct rule reaches as far as a transitive one would over this subgraph.
      for (const leaf of LEAF_ALLOWLIST) {
        const relative = resolveRelative(THE_LANE, leaf);
        const source = await read(relative);
        const leafBody = strippedBody(source.file, source.text);
        assert.deepEqual(directImports(leafBody), [], `${relative} is a zero-import leaf — that is the property the allowlist rests on`);
      }
    },
  },
  {
    name: "arch/FF-6605: no dynamic `import()`, no clock, no `path.resolve` — the three doors a pure lane must not have",
    run: async () => {
      const lane = await read(THE_LANE);
      const body = strippedBody(lane.file, lane.text);
      assert.equal(DYNAMIC_IMPORT.test(body), false, "a dynamic import() of a cited module EXECUTES its module scope, which is ACD running a project's test code (ADR-004 §2)");
      assert.equal(CLOCK.test(body), false, "the lane reads no wall-clock — `now` arrives through ctx, so the same snapshot always yields the same findings");
      assert.equal(/\bpath\.resolve\s*\(/.test(body), false, "`path.resolve` on a bare relative reads process.cwd() — the rider measured at refine, and the reason `projectRoot` rides on the snapshot");
      assert.equal(/\bprocess\.(?:cwd|env|argv)\b/.test(body), false, "the lane reads no process state");
      // The spawn doors, by name rather than by import, so a lane reaching one through
      // a global would still be caught.
      for (const door of ["execSync", "execFileSync", "spawnSync", "spawn(", "exec(", "fork("]) {
        assert.equal(body.includes(door), false, `the lane must not name ${door}`);
      }
    },
  },
  {
    name: "arch/FF-6605: the DEPENDENCY DIRECTION IS INVERTED — the lane does not import the spine, and the spine imports the lane",
    run: async () => {
      const lane = await read(THE_LANE);
      const spine = await read(THE_SPINE);
      const laneBody = strippedBody(lane.file, lane.text);
      const spineBody = strippedBody(spine.file, spine.text);

      // (a) the lane is a TRUE LEAF: no edge to the spine, and no copy of the identity
      //     grammar it would otherwise have imported.
      assert.equal(directImports(laneBody).some((specifier) => resolveRelative(THE_LANE, specifier) === THE_SPINE), false, "the lane does not import the spine — that edge is what puts `node:fs` one hop away");
      assert.equal(/\bITEM_RE\b|\bisDriver\b/.test(laneBody), false, "identity comes from the snapshot ROWS, and the lane holds no second copy of the item grammar");

      // (b) …and the spine imports the LANE, which is the half that makes the leaf
      //     reachable. Asserting only (a) would pass on a lane nothing calls.
      assert.match(spineBody, /import\s*\{[^}]*\bcontrolsLane\b[^}]*\}\s*from\s*"\.\/doctor-controls\.mjs"/, "the spine imports the lane's registry entry");
      assert.match(spineBody, /import\s*\{[^}]*\bcitedControlPathsIn\b[^}]*\}\s*from\s*"\.\/doctor-controls\.mjs"/, "…and its pure extractor, to learn which paths to probe (ROUND 3/3)");
      assert.match(spineBody, /import\s*\{[^}]*\bisControlFileName\b[^}]*\}\s*from\s*"\.\/doctor-controls\.mjs"/, "…and the one spelling of a control-shaped filename");
      assert.equal(spineBody.includes("controlsLane,"), true, "and the lane is in CHECK_GROUPS");

      // (c) THE MEASUREMENT ROUND 3/4 RESTS ON, re-run rather than narrated: a
      //     TRANSITIVE rule would be red on arrival, because BOTH existing lanes reach
      //     `node:fs` in one hop through the spine.
      const spineImports = directImports(spineBody);
      assert.ok(spineImports.some((specifier) => specifier.startsWith("node:fs")), "the spine imports node:fs — the fact that makes a transitive rule unsatisfiable");
      for (const sibling of ["src/work/doctor-coherence.mjs", "src/work/doctor-freshness.mjs"]) {
        const source = await read(sibling);
        assert.ok(
          directImports(strippedBody(source.file, source.text)).some((specifier) => resolveRelative(sibling, specifier) === THE_SPINE),
          `${sibling} imports the spine, so under a transitive rule it reaches node:fs in one hop — the house idiom this lane deliberately departs from`,
        );
      }
    },
  },
  {
    name: "arch/FF-6605: every exported GROUP is `(snapshot, ctx) => Finding[]`, answering over a literal snapshot with no filesystem",
    run: () => {
      assert.equal(CONTROL_GROUPS.length, 3);
      for (const group of CONTROL_GROUPS) {
        assert.equal(typeof group, "function", group?.name);
        assert.equal(group.length, 1, `${group.name} takes (snapshot) and reads ctx only if it needs it — never more than (snapshot, ctx)`);
        const produced = group(LITERAL_SNAPSHOT, {});
        assert.ok(Array.isArray(produced), `${group.name} returns an array`);
        for (const finding of produced) {
          assert.deepEqual(Object.keys(finding).sort(), ["code", "message", "path", "severity"], `${group.name}: ${JSON.stringify(finding)}`);
        }
      }
      assert.equal(controlsLane.length, 2, "the registry entry is a (snapshot, ctx) function");
      const findings = controlsLane(LITERAL_SNAPSHOT, {});
      assert.ok(findings.length > 0, "non-vacuity: the literal snapshot really does produce findings, so `no filesystem` is not `no answers`");
      // The snapshot's paths name a root that does not exist. A group that reached disk
      // would have thrown or answered differently.
      for (const finding of findings) assert.ok(finding.path.includes("no-such-root-ff6605"), finding.path);
    },
  },
  {
    name: "arch/FF-6605: DETERMINISM — the same snapshot yields byte-identical findings twice in-process, and again in a FRESH PROCESS",
    run: async () => {
      const once = JSON.stringify(controlsLane(LITERAL_SNAPSHOT, {}));
      const twice = JSON.stringify(controlsLane(LITERAL_SNAPSHOT, {}));
      assert.equal(twice, once, "no state accumulates between runs");

      // The subprocess half. The child is a FILE rather than a `-e` string: a shell
      // plus JS quoting layer silently drops a backslash level, and this milestone has
      // three measured instances of that producing a false result (ADR-010/E).
      const dir = await mkdtemp(path.join(os.tmpdir(), "aof-ff6605-"));
      try {
        const child = path.join(dir, "child.mjs");
        const laneUrl = new URL("../../../src/work/doctor-controls.mjs", import.meta.url).href;
        await writeFile(
          child,
          [
            `import { controlsLane } from ${JSON.stringify(laneUrl)};`,
            `const snapshot = JSON.parse(process.argv[2]);`,
            `process.stdout.write(JSON.stringify(controlsLane(snapshot, {})));`,
            "",
          ].join("\n"),
          "utf8",
        );
        const out = execFileSync(process.execPath, [child, JSON.stringify(LITERAL_SNAPSHOT)], { encoding: "utf8" });
        assert.equal(out, once, "a fresh process, with no module state and no warm cache, produces the identical finding list");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/FF-6605: the SPINE performs the lane's I/O, and `commands/doctor.mjs` hands it the project root",
    run: async () => {
      const spine = await read(THE_SPINE);
      const spineBody = strippedBody(spine.file, spine.text);
      // Leg A is a `stat` and leg B a `readFile`, both in the spine, and NEITHER is an
      // execution: the spine names no spawn door and no dynamic import of a cited path.
      assert.match(spineBody, /controlProbes\[control\]\s*=\s*\(await stat\(/, "leg A is a stat taken at the snapshot boundary");
      assert.match(spineBody, /runnerTexts\[relative\]\s*=\s*await readFile\(/, "leg B is a text read taken at the snapshot boundary");
      for (const door of ["child_process", "execFileSync", "spawnSync", "execSync"]) {
        assert.equal(spineBody.includes(door), false, `the engine must not name ${door} either — nothing between the register and the finding executes anything`);
      }
      // A dynamic import of a CITED path would execute the module scope. The spine has
      // one legitimate `import(` nowhere near this, so the assertion is scoped to the
      // probe loop: the cited path reaches `stat` and never a specifier position.
      assert.equal(/import\s*\(\s*(?:path\.join\(projectRoot|control)/.test(spineBody), false, "no cited path ever reaches an import() specifier");

      const face = await read("src/commands/doctor.mjs");
      assert.match(strippedBody(face.file, face.text), /projectRoot:\s*ctx\.workspace\.projectRoot/, "the impure edge hands the engine the project root — without it no cited path can be resolved");
    },
  },
  {
    name: "arch/FF-5407: the deterministic engines stay pure and gain no runner — no spawn, no dynamic import(), and no edge to the grade modules",
    run: async () => {
      // 54 GIVES AOF A RUNNER, AND THE ENGINES MUST NOT ACQUIRE ONE. `validateWork` runs
      // over `done` items, on other machines, with no build; the `work-doctor*` family
      // answers from a snapshot. Neither may execute anything — that line is 54/ADR-001's
      // ("aof EXECUTES the rubric" is scoped to the ONE registered command) and it is what
      // `66/FF-6605` has been asserting for the lane alone. Extended here to the family.
      const offenders = [];
      for (const module of DETERMINISTIC_ENGINES) {
        const source = await read(module);
        const body = strippedBody(source.file, source.text);
        const specifiers = directImports(body);
        const targets = specifiers.map((specifier) => resolveRelative(module, specifier)).filter((rel) => rel != null);
        for (const forbidden of FORBIDDEN_RUNNER_MODULES) {
          if (targets.includes(forbidden)) offenders.push(`${module} imports the RUNNER ${forbidden}`);
        }
        if (/\bcommands\/grade\.mjs/.test(body)) offenders.push(`${module} names the runner module in code`);
        for (const door of ["execSync", "execFileSync", "spawnSync", "spawn(", "fork("]) {
          if (body.includes(door)) offenders.push(`${module} names the spawn door ${door}`);
        }
        if (DYNAMIC_IMPORT.test(body)) offenders.push(`${module} performs a dynamic import()`);
      }
      assert.deepEqual(offenders, [], `a deterministic engine acquired a runner: ${offenders.join("; ")}`);

      // NON-VACUITY: the family really was read, and `validateWork` really is in it —
      // otherwise the empty offender list above is a statement about nothing.
      const spine = await read("src/work.mjs");
      assert.match(strippedBody(spine.file, spine.text), /export (?:async )?function validateWork/, "validateWork really is in the scanned family");
      assert.ok(DETERMINISTIC_ENGINES.length >= 8, "…and the family is the whole work-doctor* set, not one module");

      // THE NARROWER FAMILY RULE HAS TEETH, and the lane's stricter one still binds. A
      // planted RUNNER import is caught for any engine; the pure leaf is admitted for the
      // family and refused for the lane — which is the distinction the two sets exist to draw.
      const resolvedFrom = (module, source) => directImports(source).map((specifier) => resolveRelative(module, specifier)).filter((rel) => rel != null);
      const plantedRunner = 'import { gradeCommand } from "../commands/grade.mjs";';
      assert.ok(resolvedFrom(THE_LANE, plantedRunner).some((rel) => FORBIDDEN_RUNNER_MODULES.includes(rel)), "a planted runner import is detected");
      const plantedLeaf = 'import { normaliseReport } from "./grade.mjs";';
      assert.ok(!resolvedFrom(THE_LANE, plantedLeaf).some((rel) => FORBIDDEN_RUNNER_MODULES.includes(rel)), "the pure leaf is admitted to the family…");
      assert.ok(resolvedFrom(THE_LANE, plantedLeaf).some((rel) => FORBIDDEN_MODULES.includes(rel)), "…and still refused to the controls lane");
    },
  },
  {
    name: "arch/FF-6605: NON-VACUITY — a planted forbidden import, a planted dynamic import and a planted clock are each detected",
    run: () => {
      const planted = (source) => {
        const body = stripComments(source);
        return {
          imports: directImports(body).filter((specifier) => FORBIDDEN_BUILTINS.includes(specifier)),
          dynamic: DYNAMIC_IMPORT.test(body),
          clock: CLOCK.test(body),
        };
      };
      assert.deepEqual(planted('import { readFile } from "node:fs/promises";\nexport const g = () => [];\n').imports, ["node:fs/promises"], "a planted fs import is seen");
      assert.deepEqual(planted('import cp from "node:child_process";\n').imports, ["node:child_process"], "…and a planted spawn door");
      assert.equal(planted('const mod = await import(cited);\n').dynamic, true, "a planted dynamic import of the cited module is seen");
      assert.equal(planted("const at = Date.now();\n").clock, true, "a planted clock is seen");
      // …and the SHIPPED shapes are not false positives, so the scan is not simply
      // refusing everything.
      assert.deepEqual(planted('import path from "node:path";\nimport { isOpen } from "./acceptance-horizon.mjs";\n').imports, []);
      assert.equal(planted('import { x } from "./declared-id.mjs";\n').dynamic, false, "a static named import is not a dynamic one");
      assert.equal(planted("// Date.now() would be a clock\nexport const g = () => [];\n").clock, false, "a mention in a COMMENT is not a clock — the stripper is why");
    },
  },
  {
    name: "arch/FF-6605: NON-VACUITY — the item-24 stripper guard has teeth, driven with a TRAP-ORDER stripper rather than by editing a file",
    run: async () => {
      const trapOrder = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
      const sources = [];
      const walk = async (dir) => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) await walk(full);
          else if (entry.isFile() && entry.name.endsWith(".mjs")) sources.push({ file: path.relative(repoRoot, full).replaceAll("\\", "/"), text: await readFile(full, "utf8") });
        }
      };
      await walk(srcDir);
      const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
      const blinded = sources.filter((entry) => codeLines(trapOrder(entry.text)) < codeLines(stripComments(entry.text)));
      assert.ok(blinded.length > 0, "non-vacuity: the trap order really does blind this tree");
      for (const entry of blinded) {
        assert.throws(() => strippedBody(entry.file, entry.text, trapOrder), /TECH_DEBT item 24/, `${entry.file} is blinded and must be refused at the door`);
      }
      // …and the shipped stripper is 0 false positives over the same tree.
      for (const entry of sources) strippedBody(entry.file, entry.text);
    },
  },
  {
    name: "arch/FF-6605: the two pure extractors the spine calls are functions of TEXT, so the inverted edge carries no I/O either way",
    run: () => {
      assert.equal(typeof citedControlPathsIn, "function");
      assert.equal(typeof isControlFileName, "function");
      assert.deepEqual(citedControlPathsIn("no register here"), []);
      assert.deepEqual(
        citedControlPathsIn(["## Fitness functions", "", "| id | invariant | enforced by | from |", "|---|---|---|---|", "| **FF-01** | x | `test/arch/a.test.mjs` | ADR |"].join("\n")),
        ["test/arch/a.test.mjs"],
      );
      assert.equal(isControlFileName("a.test.mjs"), true);
      assert.equal(isControlFileName("a.mjs"), false);
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // MILESTONE 59 / STORY 02 — FF-5905. The audit EXECUTES; doctor READS. See the header.
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  {
    name: "arch/59 FF-5905: 66's refusal, RE-ASSERTED from the milestone that built an executor — the controls lane still reaches no child process, no dynamic import(), no node:fs and no clock",
    run: async () => {
      const lane = await read(THE_LANE);
      const body = strippedBody(lane.file, lane.text);
      // Named one at a time, so the failure says which door was opened rather than showing a set
      // difference. These are FF-5905's own four, in its own order.
      const specifiers = directImports(body);
      assert.equal(specifiers.includes("node:child_process"), false, "the controls lane must reach no child process — 59 adds an executor and it is NOT this one (ADR-002 §1)");
      assert.equal(DYNAMIC_IMPORT.test(body), false, "…no dynamic import() of a cited module, which would execute its module scope inside the aof process (66/ADR-004 §2)");
      assert.equal(specifiers.some((specifier) => specifier.startsWith("node:fs")), false, "…no node:fs/promises — all I/O stays at the snapshot boundary");
      assert.equal(CLOCK.test(body), false, "…and no wall-clock, so the same snapshot always yields the same findings");
      // The audit's own seam is refused BY NAME, because it is the specific import that would make
      // this lane an executor in one line.
      assert.equal(body.includes("work-audit"), false, "the controls lane names nothing in the audit family");
      assert.ok(body.split(/\r?\n/).filter((line) => line.trim() !== "").length > 150, "non-vacuity: the lane's body was actually read");
    },
  },

  {
    name: "arch/59 FF-5905: no module under src/work-audit/ is reachable from the doctor spine or from any module in its CHECK_GROUPS registry — asserted over the whole import CLOSURE, not over direct imports",
    run: async () => {
      // (a) THE REGISTRY IS DISCOVERED, not assumed: the entries of `CHECK_GROUPS` are read from
      //     the spine's source and mapped back to the modules they were imported from.
      const spine = await read(THE_SPINE);
      const spineBody = strippedBody(spine.file, spine.text);
      const opened = spineBody.indexOf("export const CHECK_GROUPS = [");
      assert.ok(opened >= 0, "the registry array was located in the spine");
      const closed = spineBody.indexOf("\n];", opened);
      assert.ok(closed > opened, "…and its end");
      const entries = spineBody
        .slice(spineBody.indexOf("[", opened) + 1, closed)
        .split(",")
        .map((part) => part.trim())
        .filter((part) => /^[A-Za-z_$][\w$]*$/u.test(part));
      assert.ok(entries.length >= 10, `non-vacuity: ${entries.length} registry entries were read before any claim about them`);

      const laneModuleFor = new Map();
      for (const specifier of directImports(spineBody)) {
        if (!specifier.startsWith("./")) continue;
        for (const binding of namedBindingsFrom(spineBody, specifier)) laneModuleFor.set(binding, specifier);
      }
      const registryModules = [...new Set(entries.map((entry) => laneModuleFor.get(entry)).filter((specifier) => specifier != null))];
      assert.ok(registryModules.length >= 5, `the registry's entries resolve to their modules: ${registryModules.join(", ")}`);
      assert.equal(laneModuleFor.get("controlsLane"), "./doctor-controls.mjs", "…and the controls lane is one of them, so the mapping is real");

      // (b) THE CLOSURE. Every module reachable from the spine and from each registry module, by
      //     any depth of relative import. A one-hop rule would pass on the day the edge is added
      //     to a shared helper instead of to a doctor file.
      const roots = [THE_SPINE, ...registryModules.map((specifier) => resolveRelative(THE_SPINE, specifier))].filter((rel) => rel != null);
      const closure = await importClosureFrom(roots);
      assert.ok(closure.size >= 15, `non-vacuity: the closure walked ${closure.size} modules — a walk that read nothing would make the claim below vacuously true`);
      assert.ok(closure.has("src/work/doctor-controls.mjs"), "…and it really does contain the controls lane");

      const offenders = [...closure.keys()].filter((rel) => rel.startsWith(AUDIT_FAMILY));
      assert.deepEqual(offenders, [], `doctor reaches the audit family: ${offenders.join(", ")}. The boundary between reading and executing is the COMMAND (ADR-002 §2); an import makes it a convention.`);
      for (const [rel, code] of closure) {
        assert.equal(code.includes(AUDIT_FAMILY), false, `${rel} names ${AUDIT_FAMILY} — even as a path handed to something else, that is doctor acquiring a route to an executor`);
      }

      // (c) NON-VACUITY: the closure's detector fires on a planted edge.
      assert.equal(resolveRelative(THE_SPINE, "../work-audit/evidence.mjs"), "src/work-audit/evidence.mjs");
      assert.ok(resolveRelative(THE_SPINE, "../work-audit/evidence.mjs").startsWith(AUDIT_FAMILY), "a planted edge would resolve into the family and be caught");
    },
  },

  {
    name: "arch/59 FF-5905: the ONE edge the other way is to ADR-002 §2's pure register extractors — the audit reads the register through one home and imports nothing else out of the doctor family",
    run: async () => {
      const family = await walkModules("src/work-audit");
      assert.ok(family.length >= 2, `non-vacuity: ${family.length} modules under src/work-audit/ were walked`);

      let edges = 0;
      for (const rel of family) {
        const code = stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
        for (const specifier of directImports(code)) {
          const resolved = resolveRelative(rel, specifier);
          if (resolved == null) continue;
          if (!resolved.startsWith(DOCTOR_FAMILY)) continue;
          edges += 1;
          assert.equal(resolved, "src/work/doctor-controls.mjs", `${rel} imports ${resolved} — the only admitted edge from the audit into the doctor family is the pure register extractors (ADR-002 §2)`);
          const bindings = namedBindingsFrom(code, specifier);
          assert.ok(bindings.length > 0, `${rel} imports named bindings from the extractors, never the whole module`);
          assert.deepEqual(
            bindings.filter((binding) => !ADMITTED_EXTRACTORS.includes(binding)),
            [],
            `${rel} imports ${bindings.join(", ")} from the controls lane — only ${ADMITTED_EXTRACTORS.join(", ")} are admitted, because they are PURE FUNCTIONS OF TEXT. Anything else is the audit depending on doctor's behaviour rather than on its grammar.`,
          );
        }
      }
      assert.ok(edges >= 1, "the edge EXISTS — the evidence lane reads the register through the one home rather than re-implementing the grammar (ADR-002 §2). A rule about an edge nobody has is a rule about nothing.");

      // …and the extractors really are functions of text, so the admitted edge carries no I/O.
      for (const name of ADMITTED_EXTRACTORS) {
        assert.equal(typeof (await import("../../../src/work/doctor-controls.mjs"))[name], "function", `${name} is exported and is a function`);
      }
    },
  },

  {
    name: "arch/59 FF-5905: doctor's lane MODULES are unchanged and the audit adds none — the boundary is a command, and 59 does not trip 66's fold-the-family ratchet",
    run: async () => {
      const spine = await read(THE_SPINE);
      const spineBody = strippedBody(spine.file, spine.text);
      const laneModules = directImports(spineBody).filter((specifier) => /^\.\/doctor-[a-z-]+\.mjs$/u.test(specifier));
      assert.equal(laneModules.length, DOCTOR_LANE_MODULES.length, `non-vacuity: the spine's body yielded ${laneModules.length} lane specifiers against a roster of ${DOCTOR_LANE_MODULES.length} — a rename must RED this row, never empty it (119/01, ADR-003 §4)`);
      assert.deepEqual([...new Set(laneModules)].sort(), [...DOCTOR_LANE_MODULES].sort(), "the doctor lane modules are named, not counted (m47/R9) — a ninth is an edit here and an ADR act there");
      // THE LOAD-BEARING HALF: none of them is 59's, and the registry holds no audit lane.
      assert.deepEqual(laneModules.filter((specifier) => specifier.includes("work-audit")), [], "59 adds no doctor lane — `aof work audit` is a SIBLING command, not a sixth check group");
      assert.ok(Array.isArray(CHECK_GROUPS) && CHECK_GROUPS.length >= 10, `the registry loaded (${CHECK_GROUPS?.length} entries)`);
      for (const group of CHECK_GROUPS) {
        assert.equal(typeof group, "function", "every registry entry is a (snapshot, ctx) => Finding[] group");
        assert.equal(/audit|evidence|census/u.test(group.name ?? ""), false, `${group.name} looks like an audit lane in doctor's registry`);
      }
    },
  },

  {
    name: "arch/59 FF-5905 + 77 FF-7707: the audit's code space is DERIVED FROM THE REGISTRY and is disjoint from CONTROL_FINDING_CODES — neither command's severity table can decide the other's meaning",
    run: () => {
      // THE CHECKED SET ANSWERS THE REGISTRY, not a list written here. Enumerating two constants by
      // name is a stored fact about the tree: it was true the day it was written, and nothing tells
      // it when it stops being true. Measured at 77/05, the by-name version would have run green
      // over all seven of that milestone's codes without ever having looked at one.
      const auditCodes = AUDITABLE_CODES;

      // FLOORS FIRST. Two empty sets are trivially disjoint, and that would be a statement about
      // nothing at all. Each side is measured before any claim is made about it.
      assert.ok(CONTROL_FINDING_CODES.length >= 8, `doctor's codes were read: ${CONTROL_FINDING_CODES.length}`);
      assert.ok(auditCodes.length >= 20, `the audit's derived code space was read: ${auditCodes.length}`);
      assert.ok(REPORT_LANES.length >= 7, `the registry it was derived from was read: ${REPORT_LANES.length} lanes`);
      for (const lane of REPORT_LANES) {
        assert.ok(Array.isArray([...(lane.codes ?? [])]) && [...(lane.codes ?? [])].length >= 1, `the "${lane.id}" lane declares its own vocabulary — a lane that declares none is outside every check`);
      }

      const shared = auditCodes.filter((code) => CONTROL_FINDING_CODES.includes(code));
      assert.deepEqual(shared, [], `the audit and doctor share the code(s) ${shared.join(", ")} — one command's severity table would then decide the other's meaning (FF-5905)`);

      // PAIRWISE, INSIDE THE AUDIT — a claim 59/FF-5905 never made. A code two lanes both emit is a
      // code whose fix is ambiguous: the finding says what is wrong and the reader cannot tell which
      // of two rules to satisfy.
      assert.deepEqual(laneVocabularyCollisions(), [], "no code is declared by two of the audit's own lanes");
      for (const code of auditCodes) {
        assert.match(code, /^(?:audit|evidence|anchor|loop|instrument|metric)-/u, `${code} is namespaced to the command or the leaf that emits it`);
      }

      // THE LANE-NEUTRAL CARVE-OUT, and it has teeth: `audit-ran-on-nothing` is the READ CONTRACT's,
      // raised structurally on behalf of whichever lane read short, and it genuinely sits in two
      // lane vocabularies. With the carve-out removed the check REFUSES and names them.
      assert.deepEqual([...LANE_NEUTRAL_CODES], ["audit-ran-on-nothing"], "the lane-neutral set is exactly the read contract's code");
      const withoutCarveOut = laneVocabularyCollisions(REPORT_LANES, []);
      assert.equal(withoutCarveOut.length, 1, `without the carve-out the check refuses: ${JSON.stringify(withoutCarveOut)}`);
      assert.equal(withoutCarveOut[0].code, "audit-ran-on-nothing", "…naming that code");
      assert.ok(withoutCarveOut[0].lanes.length >= 2, `…and the lanes that share it: ${withoutCarveOut[0].lanes.join(", ")}`);

      // AND THE DERIVATION IS DRIVEN, over synthetic registries, so "it answers the registry" is a
      // measurement rather than a description of the code.
      const before = [{ id: "a", codes: AUDIT_FINDING_CODES }, { id: "b", codes: EVIDENCE_FINDING_CODES }];
      const after = [...before, { id: "c", codes: ["audit-bound-undeclared"] }];
      assert.equal(auditableCodesFor(before).includes("audit-bound-undeclared"), false, "a lane that is not registered puts no code in the checked space");
      assert.equal(auditableCodesFor(after).includes("audit-bound-undeclared"), true, "…and registering it puts its code inside the check");
      assert.equal(auditableCodesFor([...before, { id: "d", codes: ["audit-invented-here"] }]).includes("audit-invented-here"), true, "a further lane's own code is carried too");
      assert.equal(
        auditableCodesFor(REPORT_LANES.filter((lane) => lane.id !== "declared-bounds")).includes("audit-reference-stale"),
        false,
        "…and an absent lane's codes are absent with it",
      );

      // A COLLISION IS REFUSED FROM BOTH SIDES, planted.
      const withDoctorCollision = auditableCodesFor([...before, { id: "e", codes: [CONTROL_FINDING_CODES[0]] }]);
      assert.equal(withDoctorCollision.includes(CONTROL_FINDING_CODES[0]), true, `a lane carrying one of doctor's codes puts it in the audit's space, where the disjointness check names it: ${CONTROL_FINDING_CODES[0]}`);
      const planted = laneVocabularyCollisions([{ id: "f", codes: ["audit-shared"] }, { id: "g", codes: ["audit-shared"] }]);
      assert.deepEqual(planted, [{ code: "audit-shared", lanes: ["f", "g"] }], "one code declared by two lanes is refused, naming the code and both lanes");
    },
  },
  {
    name: "arch/77 FF-7707: a check that would pass over an empty set is itself refused, one floor per side",
    run: () => {
      // The floors above are the claim; here they are shown to have teeth, driven from each side.
      const sides = [
        ["the doctor's control codes", CONTROL_FINDING_CODES],
        ["the audit's derived code space", AUDITABLE_CODES],
        ["a registered lane's own vocabulary", [...(REPORT_LANES[0].codes ?? [])]],
      ];
      for (const [what, side] of sides) {
        assert.ok(side.length > 0, `${what} is non-empty, so a disjointness claim over it says something`);
      }
      // An emptied registry derives a code space of the face's own codes only — which is what a
      // floor above zero exists to refuse before any claim of disjointness is made.
      assert.ok(auditableCodesFor([]).length < 20, "an emptied registry cannot reach the floor the check requires");
    },
  },
];
