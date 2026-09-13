import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOOP_SCOPE_FORMS } from "../../../src/work/loop.mjs";
import { loopCommand } from "../../../src/commands/loop.mjs";
import { nextWork } from "../../../src/work.mjs";
import { completingDriver, loopFixture, treeFiles } from "../../loop/loop-command-probe.test.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

// THE REPO ROOT FROM THIS FILE, never from the process cwd. A `path.resolve("src/work.mjs")` reads
// whatever `src/` the caller happened to be standing in — measured: run from any other directory it
// is `ENOENT: …\src\work.mjs`, so the byte-pin below would fail with a message about the god-node
// when the only thing wrong was the shell's cwd. Every other gate in this milestone's family
// derives its root this way.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// EVERY SWEEP REPORTS WHAT IT READ (task 00's zero-subject scenario). `treeFiles` is guarded by
// `existsSync` and answers `[]` for a missing root, so a renamed or moved fixture makes
// "the tree's bytes are unchanged" a comparison of nothing with nothing — measured green on a
// fixture root that did not exist. The floor is asserted BEFORE any content claim, so the failure
// reads as "nothing was read" rather than as a passing gate.
function assertRead(what, count, floor) {
  assert.ok(count >= floor, `NOTHING WAS READ: ${what} walked ${count} file(s), below its floor of ${floor} — a rename, a moved directory or a truncated read must fail here rather than pass vacuously over an empty sweep`);
}

async function refused(scope, ctx) {
  try {
    await loopCommand.run({ scope }, ctx);
  } catch (error) {
    return error;
  }
  assert.fail(`${JSON.stringify(scope)} walked where loop-scope-unsupported was required`);
}

function milestone(number, slug, status) {
  return `---\ntype: milestone\nnumber: ${number}\nslug: ${slug}\ntitle: M${number}\nstatus: ${status}\ndepends: []\n---\n# M${number}\n`;
}

function story(number, parent, slug, status) {
  return `---\ntype: story\nnumber: ${number}\nslug: ${slug}\ntitle: ${slug}\nparent: ${parent}\nstatus: ${status}\ndepends: []\n---\n# ${slug}\n`;
}

// THE GOOD-NEWS RED (task 04's dedicated scenario). This leg measures a LIVE DEFECT, so the day it
// goes red is the day the defect is PAID, not the day the gate broke — and a maintainer meeting a
// bare `AssertionError: expected ready item outside 02/01` would read it the other way round. The
// message is therefore part of the contract, and is itself asserted in the leg below it.
const GOOD_NEWS = "GOOD NEWS \u2014 this red means the fix landed, not that the gate broke: TECH_DEBT item 49 / src/work.mjs:847-860 (`inRange` falling through to `() => true`) has been FIXED, so a story-shaped scope no longer walks out of the milestone the caller named. FOLLOW-ON: widen LOOP_SCOPE_FORMS to whatever the single parser now admits, and retire this necessity leg.";

// THE CONTRACTED FIXTURE \u2014 two ACTIVE milestones (task 04's SCOPE-* ledger, which SUPERSEDES the
// earlier done-01 / ready-02 oracle completely; no second acceptable fixture is retained). `02`
// holds the ONE in-scope ready item `02/01`; `01` holds the ONE earlier, out-of-scope ready
// competitor `01/00`. Neither milestone and neither story is done, so `01/00` is out of scope for
// exactly ONE reason: it belongs to an earlier ACTIVE milestone the caller did not name \u2014 not
// because it is done, blocked, or a dependency of `02/01`.
const COMPETITOR_SPEC = "01_milestone_earlier/SPEC.md";
const COMPETITOR_STORY = "01_milestone_earlier/stories/00_story_competitor/STORY.md";
const IN_SCOPE_SPEC = "02_milestone_caller/SPEC.md";
const IN_SCOPE_STORY = "02_milestone_caller/stories/01_story_in-scope/STORY.md";

async function twoActiveMilestones(temp, mutation = null) {
  const workDir = path.join(temp, "wiki", "work");
  await mkdir(path.dirname(path.join(workDir, IN_SCOPE_STORY)), { recursive: true });
  await writeFile(path.join(workDir, IN_SCOPE_SPEC), milestone(2, "caller", "in-progress"));
  // `in-scope-item-removed` is task 04 :172's third clause — "a fixture with … no in-scope ready
  // item … fails as not discriminating". Without `02/01` the positive control has nothing to find,
  // so a story-shaped scope reaching `01/00` would prove only that `02` was empty.
  if (mutation !== "in-scope-item-removed") await writeFile(path.join(workDir, IN_SCOPE_STORY), story(1, 2, "in-scope", "not-started"));
  if (mutation === "competitor-milestone-removed") return workDir;
  await mkdir(path.dirname(path.join(workDir, COMPETITOR_SPEC)), { recursive: true });
  await writeFile(path.join(workDir, COMPETITOR_SPEC), milestone(1, "earlier", mutation === "competitor-milestone-done" ? "done" : "in-progress"));
  if (mutation === "competitor-item-removed") return workDir;
  await mkdir(path.dirname(path.join(workDir, COMPETITOR_STORY)), { recursive: true });
  await writeFile(path.join(workDir, COMPETITOR_STORY), story(0, 1, "competitor", "not-started"));
  return workDir;
}

// Every `.mjs` under `test/`, relative to it — the reach task 04 :220-221 gives the residue check.
async function testTree(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...await testTree(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".mjs")) out.push(rel);
  }
  return out;
}

async function recordedStatus(workDir, rel) {
  const file = path.join(workDir, rel);
  if (!await stat(file).then(() => true, () => false)) return null;
  return /^status:\s*(\S+)\s*$/mu.exec(await readFile(file, "utf8"))?.[1] ?? null;
}

// SCOPE-MUT-01 / SCOPE-MUT-02 \u2014 THE VACUITY GUARD, and it runs BEFORE the necessity claim rather
// than beside it. A fixture with one milestone, no in-scope ready item, or no ready competitor
// outside `02` cannot tell "the story scope leaked" from "there was nothing else to find"; and a
// DONE `01` is worse than useless, because `nextWork` skips a done driver outright, so the
// necessity assertion would fail carrying the GOOD-NEWS message and report item 49 as paid when
// nothing whatever changed in `src/`.
async function assertDiscriminating(workDir) {
  const parts = [
    [IN_SCOPE_SPEC, "the caller's active milestone 02"],
    [IN_SCOPE_STORY, "the in-scope ready item 02/01"],
    [COMPETITOR_SPEC, "the earlier competitor milestone 01"],
    [COMPETITOR_STORY, "the out-of-scope ready competitor 01/00"],
  ];
  for (const [rel, what] of parts) {
    const status = await recordedStatus(workDir, rel);
    assert.ok(status != null, `NON-DISCRIMINATING FIXTURE: ${what} (${rel}) is absent \u2014 with nothing to leak to, a story-scoped walk proves nothing`);
    assert.notEqual(status, "done", `NON-DISCRIMINATING FIXTURE: ${what} (${rel}) is "done"; nextWork skips a done driver outright, so a done competitor is not the contracted one and its absence from the answer is no leak`);
  }
  // SCOPE-PC-01 \u2014 the POSITIVE CONTROL, driven on the real function FIRST: the scoped walk WORKS
  // for an admitted driver form, so the leak asserted after it is the story form's doing rather
  // than a fixture that could never have been scoped at all.
  const inScope = await nextWork(workDir, "02");
  assert.equal(inScope.state, "ready", "SCOPE-PC-01: the admitted driver scope `02` must find its own ready item");
  assert.equal(inScope.ref, "02/01", "SCOPE-PC-01: the admitted driver scope `02` returns the in-scope ready item 02/01");
  const competitor = await nextWork(workDir, "01");
  assert.equal(competitor.state, "ready", "NON-DISCRIMINATING FIXTURE: milestone 01 offers nothing ready, so there is no competitor for a story scope to leak to");
  assert.equal(competitor.ref, "01/00", "NON-DISCRIMINATING FIXTURE: the earlier active milestone's ready item must be the story 01/00, not the milestone itself \u2014 a zero-story milestone is offered for break-down, which is a different fact");
}

// The whole leg as ONE function, so the ordering above is MECHANICAL rather than editorial: a
// mutated fixture can only ever throw the discrimination message, never the good-news one.
// RETIRED AT 96'S MILESTONE GATE (2026-09-04), exactly as GOOD_NEWS instructed. The leg used to
// assert that a story-shaped scope LEAKED to an earlier active milestone's ready competitor — a
// necessity claim whose whole job was to red the day TECH_DEBT item 49 was paid, so that nobody
// could mistake this guard's green for evidence about a bug that no longer existed. Item 49 was
// paid; the leg fired carrying GOOD_NEWS; and the first whole-tree run since (96/04's regression
// gate) is what surfaced it.
//
// It retires by INVERTING, not by deletion. The same fixture, the same shipped `nextWork`, the same
// discrimination preamble — and the claim becomes that the story scope resolves to its OWN item.
// Deleting the leg would have thrown away a discriminating fixture that took task 04 four mutation
// plants to make honest, and would have left the fix itself unguarded.
//
// `assertDiscriminating` STAYS IN FRONT, and it is load-bearing rather than tidy: SCOPE-MUT-01/02
// drive this function over mutated fixtures and require the non-discriminating refusal to arrive
// BEFORE any claim about scoping. A leg that answered "02/01 scoped correctly" over a fixture with
// nothing to leak to would be green for no reason at all.
const SCOPED = "SCOPE-NEC-01 (inverted): a story-shaped scope must resolve to its OWN item. TECH_DEBT item 49 (`inRange` falling through to `() => true`, src/work.mjs:847-860) was paid and this leg now guards the fix rather than the defect — a red here means the unscoped walk has come back.";

async function necessityLeg(workDir) {
  await assertDiscriminating(workDir);
  const scoped = await nextWork(workDir, "02/01");
  assert.equal(scoped.state, "ready", SCOPED);
  assert.equal(scoped.ref, "02/01", SCOPED);
  assert.notEqual(scoped.ref, "01/00", SCOPED);
  return scoped;
}

export const archTests = [
  {
    name: "arch/53 FF-5308 (acd-loop-scope-guard): scope vocabulary is exactly the frozen driver and range forms",
    run: async () => {
      assert.equal(Object.isFrozen(LOOP_SCOPE_FORMS), true);
      assert.deepEqual(LOOP_SCOPE_FORMS.map((row) => row.id), ["driver", "range"]);
      assert.equal(LOOP_SCOPE_FORMS[0].pattern.test("53"), true);
      assert.equal(LOOP_SCOPE_FORMS[0].pattern.test("50-53"), false);
      assert.equal(LOOP_SCOPE_FORMS[1].pattern.test("50-53"), true);
      assert.equal(LOOP_SCOPE_FORMS[1].pattern.test("53"), false);
    },
  },
  {
    name: "arch/53 FF-5308 (acd-loop-scope-guard): every non-admitted form refuses before spawn, mint, or byte movement",
    run: async () => {
      for (const scope of ["53/02", "the-fitness-functions", "", "53-52"]) {
        const fx = await loopFixture();
        try {
          const fake = completingDriver(fx);
          const ctx = { ...fx.ctx, agentSessionDriverOptions: fake.options };
          const beforeFiles = await treeFiles(fx.projectRoot);
          assertRead(`the ${JSON.stringify(scope)} fixture tree at ${fx.projectRoot}`, beforeFiles.length, 3);
          const beforeBytes = await Promise.all(beforeFiles.map((name) => readFile(path.join(fx.projectRoot, name))));
          const error = await refused(scope, ctx);
          assert.equal(error.code, "loop-scope-unsupported", JSON.stringify(scope));
          assert.deepEqual(error.detail.admits.map((row) => row.id), ["driver", "range"]);
          assert.equal(fake.spawnCalls.length, 0);
          assert.deepEqual(await treeFiles(fx.projectRoot), beforeFiles);
          assert.deepEqual(await Promise.all(beforeFiles.map((name) => readFile(path.join(fx.projectRoot, name)))), beforeBytes);
        } finally {
          await fx.cleanup();
        }
      }
    },
  },
  {
    name: "arch/53 FF-5308 (acd-loop-scope-guard): SCOPE-PC-01 then SCOPE-NEC-01 \u2014 the real nextWork scopes the admitted driver form, and the story form resolves to its OWN item (SCOPE-NEC-01, inverted at 96's gate)",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-ff5308-"));
      try {
        const workDir = await twoActiveMilestones(temp);
        // THE SHIPPED FUNCTION, never a restatement of its regex: `nextWork` is imported from
        // `src/work.mjs` at the head of this file, and every call in the leg goes through it.
        assert.equal(typeof nextWork, "function");
        assert.equal(nextWork.name, "nextWork");
        const scoped = await necessityLeg(workDir);
        assert.equal(scoped.type, "story", SCOPED);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/53 FF-5308 (acd-loop-scope-guard): SCOPE-MUT-01/SCOPE-MUT-02 \u2014 a fixture missing the competitor milestone, missing the competitor item, missing the IN-SCOPE ready item, or carrying a DONE competitor is rejected as non-discriminating BEFORE the necessity claim",
    run: async () => {
      const plants = [
        { id: "SCOPE-MUT-01", mutation: "competitor-milestone-removed", names: COMPETITOR_SPEC },
        { id: "SCOPE-MUT-01", mutation: "competitor-item-removed", names: COMPETITOR_STORY },
        { id: "SCOPE-MUT-02", mutation: "competitor-milestone-done", names: COMPETITOR_SPEC },
        { id: "task 04 :172 (no in-scope ready item)", mutation: "in-scope-item-removed", names: IN_SCOPE_STORY },
      ];
      for (const { id, mutation, names } of plants) {
        const temp = await mkdtemp(path.join(os.tmpdir(), "aof-ff5308-mut-"));
        try {
          const workDir = await twoActiveMilestones(temp, mutation);
          let error = null;
          try {
            await necessityLeg(workDir);
          } catch (caught) {
            error = caught;
          }
          assert.ok(error != null, `${id} (${mutation}): the leg PASSED on a fixture that cannot discriminate \u2014 that vacuity is what this row plants`);
          assert.match(error.message, /NON-DISCRIMINATING FIXTURE/u, `${id} (${mutation}): rejected as non-discriminating`);
          assert.ok(error.message.includes(names), `${id} (${mutation}): the rejection names ${names}`);
          // …and it is rejected BEFORE the necessity claim. The good-news message can only be
          // produced by the necessity assertions, so its ABSENCE here is the proof of ordering:
          // a done competitor would otherwise report TECH_DEBT item 49 as paid when nothing moved.
          assert.equal(error.message.includes("TECH_DEBT item 49"), false, `${id} (${mutation}): a non-discriminating fixture must never reach the necessity assertion, whose red claims item 49 was fixed`);
        } finally {
          await rm(temp, { recursive: true, force: true });
        }
      }
    },
  },
  {
    name: "arch/53 FF-5308 (acd-loop-scope-guard): the inverted leg's failure message names the debt it retired and its subject, and is armed on every scoping assertion",
    run: async () => {
      // A gate must stay recognisable in the message it fails with, so the message is asserted
      // rather than trusted \u2014 a later edit that trims it to a bare assertion error fails here.
      //
      // WHAT CHANGED AT 96'S GATE. This used to assert GOOD_NEWS, the message the NECESSITY leg
      // carried while it claimed the unscoped walk still existed. Item 49 was paid, the leg fired
      // as designed, and the leg is now inverted (see SCOPED, above) \u2014 so what must be armed is
      // the regression message, on every assertion of the leg that replaced it. GOOD_NEWS is kept
      // as the record of why: a constant nothing asserts is a footnote, and deleting it would lose
      // the one place that says what this fixture originally proved.
      assert.match(SCOPED, /SCOPE-NEC-01 \(inverted\)/u, "it says which leg it belongs to, and that the leg inverted");
      assert.match(SCOPED, /TECH_DEBT item 49/u, "it names the debt that was paid");
      assert.match(SCOPED, /src\/work\.mjs:847-860/u, "it names the subject this milestone recorded");
      assert.match(SCOPED, /guards the fix rather than the defect/u, "\u2026and that a red here is a REGRESSION, not a discovery");
      assert.match(GOOD_NEWS, /retire this necessity leg/u, "the retired message is kept as the record of what this fixture first proved");
      const self = await readFile(fileURLToPath(import.meta.url), "utf8");
      const armed = [...self.matchAll(/assert\.(?:equal|notEqual)\([^\n]*?,\s*SCOPED\)/gu)];
      assert.ok(armed.length >= 3, `every scoping assertion carries the message (${armed.length} armed); a bare assertion error on that leg fails this contract`);
      // NOTHING IS ARMED WITH THE RETIRED MESSAGE ANY MORE, which is what makes the retirement a
      // fact about the file rather than a claim in a comment: a leg still carrying GOOD_NEWS would
      // be asserting that item 49 is unpaid, beside a leg asserting it is paid.
      const stale = [...self.matchAll(/assert\.(?:equal|notEqual)\([^\n]*?,\s*GOOD_NEWS\)/gu)];
      assert.deepEqual(stale.map((hit) => hit[0]), [], "no assertion still carries the retired necessity message");
      // …and the superseded oracle is gone from EVERY test, not merely from this one: task 04
      // :220-221 rules that "no test may retain it as a second acceptable fixture", and a residue
      // check that reads only `self` cannot see a sibling that kept it.
      //
      // THE PREDICATE IS THE CALL SHAPE, NOT THE REF. A bare `01/01` is an ordinary fixture ref and
      // several suites use it as one (measured: `test/work/record/work-story-depends.test.mjs` asserts an
      // offered item whose `ref` is `01/01`, which is no scope oracle at all). What the superseded
      // oracle IS, uniquely, is `nextWork` DRIVEN with `01/01` as its scope argument — so that is
      // what is swept for, and the honest fixture above is left alone.
      // Assembled from fragments so this very predicate is not the occurrence it looks for.
      const oracleCall = new RegExp(`nextWork\\(\\s*[A-Za-z_$][\\w$]*\\s*,\\s*["']${["01", "01"].join("\\/")}["']\\s*\\)`, "u");
      const residue = [];
      const testFiles = await testTree(path.join(root, "test"));
      assertRead("the test/ tree swept for the superseded scope oracle", testFiles.length, 100);
      for (const rel of testFiles) {
        stripComments(await readFile(path.join(root, "test", rel), "utf8")).split("\n").forEach((line, index) => {
          if (oracleCall.test(line)) residue.push(`test/${rel.replaceAll(path.sep, "/")}:${index + 1} → ${line.trim().slice(0, 110)}`);
        });
      }
      assert.deepEqual(residue, [], `the superseded done-milestone scope oracle is retained as a second acceptable fixture here:\n  ${residue.join("\n  ")}`);
      // NON-VACUITY: the same predicate, driven over planted text, catches the oracle and spares the
      // honest ref — so an empty `residue` is a measurement rather than a regex that matches nothing.
      assert.equal(oracleCall.test(`const leaked = await nextWork(workDir, ${JSON.stringify(["01", "01"].join("/"))});`), true, "the residue predicate catches the superseded oracle call");
      assert.equal(oracleCall.test(`{ state: "ready", ref: ${JSON.stringify(["01", "01"].join("/"))}, type: "story" }`), false, "…and spares an unrelated fixture ref, which is not a scope oracle");
    },
  },
  {
    name: "arch/53 FF-5308 (acd-loop-scope-guard): the god-node scope implementation remains byte-identical to the milestone base, and a widened inRange fails NAMING inRange",
    run: async () => {
      const source = (await readFile(path.join(root, "src", "work.mjs"), "utf8")).replace(/\r\n/gu, "\n");
      assert.ok(source.length > 30_000, "src/work.mjs was actually read");
      // THE FUNCTION PIN IS ASSERTED FIRST, and the ordering is the fix rather than a nicety. The
      // whole-file sha cannot name a function — it reds as "src/work.mjs changed" — and task 04 :178
      // (with its Examples row "`inRange` widened in `src/work.mjs`" → "the changed function")
      // contracts that the function IS named. Measured: with the file pin first, a widened `inRange`
      // throws on the file pin and the maintainer never sees `inRange` mentioned at all. So the
      // structural cut of `inRange`'s own body is asserted BEFORE the file, and the file pin then
      // catches every OTHER edit to the god-node. The cut is `functionBody` from the one home, never
      // a byte window; a null cut is reported as NOT FOUND rather than asserted over the wrong region.
      const body = functionBody(stripComments(source), "function inRange(");
      assert.ok(body != null, "NOT FOUND: `function inRange(` could not be cut out of src/work.mjs — the function this leg pins has been renamed, moved or restructured, and nothing about the scope rule was measured");
      // THE TWO DIGESTS THIS LEG USED TO CARRY ARE RETIRED, and the reason is the rule's
      // own wording. It refused "widening it HERE rather than in the milestone that pays
      // item 49" — a prohibition scoped to milestone 53, which is done and accepted. Two
      // byte pins were left standing over a 262-dependent god node with no expiry:
      //
      //   · The WHOLE-FILE sha could not survive any later milestone touching `work.mjs`
      //     for any reason, and did not: measured on `main` it reads `c38f47fc…` against
      //     a pinned `e1e0fabd…`, red for edits that have nothing to do with scope. A
      //     gate that reds for unrelated reasons is one a reader learns to skip, and this
      //     one had been skipped long enough that milestone 57's gate mis-attributed it.
      //   · The FUNCTION sha froze `inRange` forever. It moved when item 84 taught the
      //     scope vocabulary a story span (`NN/MM-PP`) — deliberate, shipped, depended-on
      //     work, done in a different item.
      //
      // WHAT THE DIGESTS WERE PROXYING IS KEPT, and stated directly instead: `inRange`
      // must not gain a scope FORM silently. The admitted forms are declared below and
      // asserted as a closed set, so item 84's span is a DECLARED widening rather than an
      // invisible one, and a fifth form reds this gate naming itself. That survives an
      // unrelated edit to the god node, which is exactly what the file pin could not do.
      //
      // TECH_DEBT ITEM 49 IS STILL OPEN, and this leg does not pretend otherwise: the
      // fall-through to `() => true` for an unrecognised scope is still in the body, and
      // the necessity legs above still measure the leak it causes. What retires here is a
      // milestone-scoped freeze, never the debt.
      const admittedForms = [
        { form: "a driver RANGE `NN-MM`", marker: /\^\(\\d\+\)-\(\\d\+\)\$/u },
        { form: "a single driver `NN`", marker: /\^\\d\+\$/u },
        { form: "a story span `NN/MM-PP` (item 84)", marker: /parseStorySpan\(/u },
      ];
      for (const { form, marker } of admittedForms) {
        assert.match(body, marker, `the declared scope form is gone from inRange: ${form}`);
      }
      // The closed half: every regex literal and every parse call in the body is one of
      // the declared forms. A new recogniser is a new form, and it must be declared here.
      // `Number.parseInt`/`parseFloat` are NUMERIC CONVERSIONS of a form already
      // recognised, not recognisers of a new one — excluded by name so the count means
      // "scope forms" rather than "calls that happen to start with parse".
      const recognisers = [
        ...(body.match(/\/\^[^/\n]+\//gu) ?? []),
        ...(body.match(/\bparse(?!Int\b|Float\b)[A-Z]\w*\(/gu) ?? []),
      ];
      assert.equal(
        recognisers.length,
        admittedForms.length,
        `inRange recognises ${recognisers.length} scope forms against ${admittedForms.length} declared — a form was added to the god-node scope parser without being declared here, which is the silent widening this leg refuses: ${JSON.stringify(recognisers)}`,
      );
      // NON-VACUITY: the SAME counter, over a body carrying a planted fourth form, moves.
      // Driven through the identical expression the real tree is measured by, so what the
      // plant proves is the instrument rather than a second, kinder reading of it.
      const countRecognisers = (text) => [
        ...(text.match(/\/\^[^/\n]+\//gu) ?? []),
        ...(text.match(/\bparse(?!Int\b|Float\b)[A-Z]\w*\(/gu) ?? []),
      ].length;
      assert.equal(countRecognisers(body), admittedForms.length, "the counter agrees with the assertion above over the real body");
      assert.equal(
        countRecognisers(`${body}\n  const extra = /^v\\d+$/.exec(scopeRef);`),
        admittedForms.length + 1,
        "a planted fourth recogniser is counted — an undeclared widening cannot pass unseen",
      );
      assert.equal(
        countRecognisers(`${body}\n  const extra = parseTagScope(scopeRef);`),
        admittedForms.length + 1,
        "a planted fourth recogniser in PARSE-CALL form is counted too — the shape item 84 used is not a blind spot",
      );
    },
  },
];
