import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { blockOrStatementAfter, functionBody, matchedParenSpan, stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
// 119/03 — the eleven gates, at their paths under `test/arch/`'s interior. They span THREE subject
// directories (session, work, loop), which is the whole of this row's amendment: see the note above
// `registrationProblems`.
const ownFiles = Object.freeze([
  "session/acd-session-driver-mesh-blind.test.mjs",
  "session/acd-session-driver-single-home.test.mjs",
  "work/acd-phase-door-not-a-driver.test.mjs",
  "loop/acd-loop-probe-contract.test.mjs",
  "loop/acd-loop-level-l3-gated.test.mjs",
  "loop/acd-loop-l1-read-only.test.mjs",
  "loop/acd-loop-state-rides-the-run-record.test.mjs",
  "loop/acd-loop-scope-guard.test.mjs",
  "loop/acd-loop-ready-registry-optional.test.mjs",
  "loop/acd-loop-cap-single-home.test.mjs",
  "loop/acd-loop-suite-registration.test.mjs",
]);
const leafOf = (rel) => rel.slice(rel.lastIndexOf("/") + 1);
const families = Object.freeze([
  { story: "53/00", pattern: /^agent-session-driver-.*\.test\.mjs$/u },
  { story: "53/01", pattern: /^work-loop-.*\.test\.mjs$/u },
  { story: "53/02", pattern: /^(?:loop|drive)-command-.*\.test\.mjs$/u },
  { story: "53/03", pattern: /^loop-ready-.*\.test\.mjs$/u },
  { story: "53/04", pattern: /^autonomous-shell-out-.*\.test\.mjs$/u },
]);

// The stand-in a PERMITTED line is replaced BY — never removed, so its POSITION enters the digest.
const MASK = "<<< permitted region line, masked in place >>>";
const normalize = (text) => text.replace(/\r\n/gu, "\n");
const digest = (text) => createHash("sha256").update(text).digest("hex");

async function importArch(name) {
  return await import(pathToFileURL(path.join(root, "test", "arch", name)).href);
}

const NEWLINE = String.fromCharCode(10);

// THE REGISTRATION SURFACE (119/03). Every place a suite may be imported and spread: the runner,
// which now names directories, and each directory's own index, which names its suites. Read as ONE
// text so the per-alias census below counts across the whole of it — an alias imported in two
// indexes is exactly as wrong as one imported twice in the runner used to be.
async function registrationSurface() {
  const parts = [await readFile(path.join(root, "scripts", "test.mjs"), "utf8")];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { await walk(path.join(dir, entry.name)); continue; }
      if (entry.name === "index.mjs") parts.push(await readFile(path.join(dir, entry.name), "utf8"));
    }
  };
  await walk(path.join(root, "test"));
  return parts.join(NEWLINE);
}

// ── REG-MUT-04 … REG-MUT-08, REG-MUT-10, REG-MUT-14: THE BLOCK VALIDATOR ───────────────
//
// The plants below are driven against THIS function over synthetic runner text — never by mutating
// `scripts/test.mjs`, which 53/05 may not touch outside its own two labelled blocks (ADR-011 §1).
// The same function is then run over the REAL runner, so what the plants prove is the instrument
// the real tree is measured by, rather than a second reading of the same rule.
//
// WHY CONTIGUITY IS A LEG AND NOT A TIDINESS PREFERENCE: `acd-test-suite-registration:151` keys
// registration on `runners.includes(basename)`, which a split block still satisfies, and milestone
// 52's own story-05 gate found the sibling shape worth pinning positionally
// (`work-loops-coverage-ledger.test.mjs:687-700`) for the same reason — an import interleaved into
// another story's run is how one story's diff silently takes ownership of another's registration.
const ALIASES = Object.freeze([
  "acdSessionDriverMeshBlindTests", "acdSessionDriverSingleHomeTests", "acdPhaseDoorNotADriverTests",
  "acdLoopProbeContractTests", "acdLoopLevelL3GatedTests", "acdLoopL1ReadOnlyTests",
  "acdLoopStateRidesTheRunRecordTests", "acdLoopScopeGuardTests", "acdLoopReadyRegistryOptionalTests",
  "acdLoopCapSingleHomeTests", "acdLoopSuiteRegistrationTests",
]);
const IMPORT_LABEL = "// milestone 53 / story 05 — architectural fitness functions (FF-5301…FF-5311).";
const SPREAD_LABEL = "  // milestone 53 / story 05 — architectural fitness functions (FF-5301…FF-5311)";
const importRow = (index) => `import { archTests as ${ALIASES[index]} } from "./${leafOf(ownFiles[index])}";`;
const spreadRow = (index) => `  ...${ALIASES[index]},`;
// `FF-\d{4}` (any milestone-series id) rather than only `FF-53\d{2}`: milestone 70/00's
// FF-7002 EXTENDS this story's own acd-session-driver-single-home gate (ADR-002), so a
// later-series fitness function now legitimately lives in one of the eleven 53-gate files.
// The invariant's intent is unchanged — every gate entry must carry a traceable FF id.
// 119/04 widens the id to `FF-\d{4,5}` for the same reason 70/00 widened the series: milestone 119
// numbers its fitness functions FF-119NN — five digits — and FF-11907 EXTENDS this story's own
// acd-session-driver-single-home gate, exactly as ADR-007 §4 scheduled it to. The invariant's intent
// is unchanged and the shape is no looser where it matters: a name must still carry a milestone, an
// FF id and a parenthesised subject before its colon, so a failing run still names its invariant.
const NAME_SHAPE = /^arch\/\d+ FF-\d{4,5} (?:extension )?\([^)]+\):/u;

// PURE — runner TEXT (plus, for REG-MUT-06's contracted report, each file's exported test names)
// in, a list of problems out. `[]` is green.
//
// ORDER MATTERS AND IS THE FIX: the per-alias CENSUS runs FIRST and short-circuits the positional
// row loop. Measured before this change, deleting one spread emitted NINE problems — eight
// `REG-MUT-05: spread row N … split or re-ordered` index-shift lines ahead of the one naming the
// real defect — and REG-MUT-07 emitted a spurious `REG-MUT-05` too. An alias that is absent or
// duplicated makes EVERY later positional row wrong for a reason that is not a positional defect,
// so the positional loop has nothing true to say until the census is clean.
function registrationProblems(source, testNames = {}) {
  const problems = [];
  const lines = normalize(source).split("\n");
  if (lines.length < ownFiles.length * 2) {
    problems.push(`REG-MUT-14: only ${lines.length} runner lines were read — the floor is not met, so every claim below would pass vacuously`);
    return problems;
  }
  // ── 119/03 AMENDMENT: the SURFACE is the registration tree, not one labelled block ──────
  // WHAT CHANGED AND WHY. Until 119/03 the eleven gates were registered by eleven contiguous rows
  // inside one labelled milestone-53 block in `scripts/test.mjs`, and REG-MUT-04/05 asserted that
  // contiguity POSITIONALLY. 119/03 gives `test/arch/` an interior and registers every suite in the
  // index of the directory that owns it — and the eleven span THREE subjects (session 2, work 1,
  // loop 8). One labelled block is not a shape this tree can hold any more: the partition is by
  // SUBJECT, and milestone 53's gates are not one subject.
  //
  // WHAT DID NOT CHANGE — and this is the whole of the amendment's honesty. The census below is
  // UNTOUCHED: exactly one import and exactly one spread per alias, across the whole registration
  // surface; REG-MUT-06 (imported and never spread) still names the file and its unreachable test
  // names; REG-MUT-07 (spread twice) and REG-MUT-08 (bound to another module) are unchanged in
  // claim. Contiguity was the INSTRUMENT; "every gate reachable exactly once" is the invariant, and
  // an amendment that dropped the census with the positions would be the weakening this file's own
  // header warns about rather than a re-aim.
  //
  // ADDED IN ITS PLACE: ownership. A gate must be imported by the index of the directory that HOLDS
  // it (`./<leaf>`) and spread there — which is what stops one directory's index registering
  // another's suites, the failure contiguity used to make impossible by construction and the one
  // FF-11906 asserts as a class over every index.
  let misregistered = false;
  for (const [index, alias] of ALIASES.entries()) {
    const imports = lines.filter((line) => line.trimStart().startsWith("import ") && line.includes(` as ${alias} `)).length;
    const spreads = lines.filter((line) => line.trim() === `...${alias},`).length;
    if (imports !== 1 || spreads !== 1) misregistered = true;
    if (imports === 1 && spreads === 0) {
      const unreachable = testNames[ownFiles[index]] ?? [];
      problems.push(
        `REG-MUT-06: ${ownFiles[index]} is imported as ${alias} and NEVER spread — the index names the file, so the filename ratchet reads it as registered while no test in it is ever invoked. `
          + (unreachable.length === 0
            ? "Its exported test names could not be resolved to be listed here."
            : `These ${unreachable.length} test name(s) no runner will invoke:` + NEWLINE + "      " + unreachable.join(NEWLINE + "      ")),
      );
    }
    if (spreads > 1) problems.push(`REG-MUT-07: ${alias} is spread ${spreads} times — ${ownFiles[index]}'s tests would be run and reported twice`);
    if (imports !== 1) problems.push(`REG-MUT-08: ${alias} is bound by ${imports} imports — exactly one is required`);
    for (const line of lines.filter((candidate) => candidate.includes(` as ${alias} `))) {
      const from = importSpecifiers(line)[0]?.specifier ?? null;
      if (from !== `./${leafOf(ownFiles[index])}`) problems.push(`REG-MUT-08: ${alias} binds ${from} — it must bind ./${leafOf(ownFiles[index])}, the gate in its OWN directory`);
    }
  }
  if (misregistered) return problems;

  // ── OWNERSHIP, in place of the positional rows ─────────────────────────────────────
  for (const [index, alias] of ALIASES.entries()) {
    const expected = importRow(index);
    if (!lines.includes(expected)) {
      problems.push(`REG-MUT-04/08: ${ownFiles[index]} is not registered by its OWN directory's index — expected the row ${expected}`);
    }
    if (!lines.includes(spreadRow(index))) {
      problems.push(`REG-MUT-05: ${alias} is not spread by its own directory's index — expected the row ${spreadRow(index).trim()}`);
    }
  }
  return problems;
}

// REG-MUT-03 / REG-MUT-10 — PURE, over a file's exported names.
function nameProblems(file, names) {
  const problems = [];
  if (names.length === 0) problems.push(`REG-MUT-03: ${file} exports an EMPTY archTests array — an empty gate is no gate`);
  for (const name of names) {
    if (!NAME_SHAPE.test(name)) problems.push(`REG-MUT-10: ${file} exports "${name}", which carries no traceable FF id — a failing run would name no invariant`);
  }
  return problems;
}

// REG-MUT-14 — PURE. Asserted BEFORE any content claim, so "nothing was read" can never read as
// "nothing was wrong".
// 119/03 — `test/` and `test/arch/` have subject directories now, so every sweep below walks them
// RECURSIVELY. A flat `readdir` here returned 0 and 22 respectively, and REG-MUT-14's floors are
// exactly what turned that into a red rather than a claim asserted over nothing (119/ADR-003 §4).
async function suiteFilesBelow(dir, prefix = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await suiteFilesBelow(path.join(dir, entry.name), rel)));
    else if (entry.name.endsWith(".test.mjs")) found.push(rel);
  }
  return found;
}

function floorProblem(what, count, floor) {
  return count >= floor ? null : `REG-MUT-14: ${what} read ${count}, below its floor of ${floor} — a rename, a moved directory or a truncated read must fail as "nothing was read", never pass vacuously`;
}

// ── REG-MUT-01 / REG-MUT-02: THE ENTRY-KEY SWEEP, IN TEST-OBJECT POSITION ──────────────
//
// Task 00:63-68 asks for the sweep to be in TEST-OBJECT POSITION and to cover the whole of
// `test/arch/*.test.mjs`. A BARE `fn:` GREP IS RED FOR A TREE REASON RATHER THAN A RULE REASON —
// the exact class ADR-015 ruled three times. Measured 2026-08-20 over all 309
// `test/arch/*.test.mjs` with comments stripped: EIGHTEEN `fn:` occurrences survive —
// `acd-changelog-generated.test.mjs:23` (`{ name, fn: mod[name] }`, a helper's return value) and
// `acd-memory-index-never-on-mesh.test.mjs:123-144` (seventeen `{ file, fn: "buildX" }` DATA
// records). None is in a test-object position, so the rule holds and the grep would be wrong about
// the tree. This file itself now plants `{ name, fn }` deliberately, which a grep would also
// misread.
//
// SO THE POSITION IS RESOLVED AT RUNTIME, over `Object.keys(entry)` of each member of each exported
// runner-shaped array. That is not a weakened grep — it is the EXACT reading of "entry key", and it
// is STRICTLY STRONGER than a source cut: an `fn:` in a member literal's own top level is by
// definition an own property of that member, and a member assembled by a spread (which no source
// cut sees at all) is caught too.
//
// A SOURCE CUT WAS BUILT FIRST AND WITHDRAWN, and the reason is recorded rather than hidden,
// because it is the same lesson twice over. Cutting the member literals with `matchedBraceBody`
// from the one home succeeded on 278 of 309 files and returned NOT FOUND on 31 — every one of them
// for a TREE fact, not a rule fact: (a) an unbalanced `{` inside a STRING literal, e.g.
// `acd-lock-read-merged.test.mjs` writes `"{ not json at all"` to plant a torn lock, and
// `matchedBraceBody`'s own header states it is deliberately brace-only over comment-stripped
// source; and (b) `stripComments` eats a `//` that appears INSIDE a string literal, measured on
// the former L3-lock proxy, whose planted module text embedded a comment token
// and loses its closing brace to the stripper. Shipping that cut would have made this gate red on
// other stories' files for a reason that has nothing to do with entry keys — which is precisely
// what this milestone keeps ruling against. The runtime read has no such failure mode.
//
// PURE — a file name and its imported members in, problems out.
function entryKeyProblems(file, members) {
  const problems = [];
  for (const entry of members) {
    const keys = Object.keys(entry).sort();
    if (keys.join(",") !== "name,run") {
      problems.push(`REG-MUT-01: ${file} exports "${entry.name}" with entry keys [${keys.join(", ")}] — the runner destructures \`{ name, run }\`, so a member under any other key has \`run === undefined\` and its body NEVER RUNS while the suite reports nothing`);
    } else if (typeof entry.run !== "function") {
      problems.push(`REG-MUT-02: ${file} exports "${entry.name}" with \`run\` bound to ${typeof entry.run}, not a function — the runner would throw \`run is not a function\` instead of invoking the gate`);
    }
  }
  return problems;
}

// ── REG-MUT-09: THE ORPHAN LIST, MIRRORED PURELY ──────────────────────────────────────
//
// `acd-test-suite-registration:151` computes `files.filter((rel) => !runners.includes(basename))`.
// This is that predicate as a pure function, so a TWELFTH arch file registered by neither runner is
// driven against a SYNTHETIC tree — never by writing a real file into `test/arch/`, which would
// leave the repo dirty and make the plant indistinguishable from a real orphan.
const UNREGISTERED_BASELINE = Object.freeze(["test/work/lifecycle/work-observe.test.mjs"]);
function orphanProblems(files, runnerText, baseline) {
  const unregistered = files.filter((rel) => !runnerText.includes(rel.split("/").pop()));
  const grown = unregistered.filter((rel) => !baseline.includes(rel));
  const ghosts = baseline.filter((rel) => !files.includes(rel));
  return [
    ...grown.map((rel) => `REG-MUT-09: ${rel} is imported by NEITHER runner and is not in the shrink-only baseline — it is green, red or deleted with identical effect on CI`),
    ...ghosts.map((rel) => `REG-MUT-09: baseline entry ${rel} names a suite that is no longer on disk — the ratchet would guard a number that is not true`),
  ];
}

// ── REG-MUT-11: WHAT FREEZES `scripts/test.mjs` OUTSIDE THE TWO LABELLED m53 BLOCKS ────
//
// Nothing did, and it was measured: rewriting another story's import to `../test/HIJACKED.test.mjs`
// AND rewriting the suite loop to `for (const { name, fn } of tests)` yielded ZERO problems, while
// the contract says the suite loop, the per-test global-home handling and the integration lane are
// byte-unchanged and no other story's block is touched.
//
// AN ABSOLUTE DIGEST IS THE WRONG INSTRUMENT. `scripts/test.mjs` is a declared APPEND-ONLY
// REGISTRATION HUB (ADR-011 §2) — milestone 54 will legitimately append its own labelled block, and
// a whole-file digest would fail that with a message about milestone 53. So the instrument is
// BASE-ANCHORED in three legs, each of which a later block leaves untouched:
//
//   (11a) the three named regions, CUT STRUCTURALLY from the one home — `functionBody` for
//         `runSuite`, `blockOrStatementAfter` for the suite loop's body, the loop's `finally`
//         block, the `ghRoot` statement and the integration lane's restore block — each pinned by
//         digest, each reporting NOT FOUND when the cut cannot be made.
//   (11b) the residue digest of every runner line that is NOT a registration row: a `../test/`
//         import, a `...alias` spread (with an optional trailing comma) INSIDE the exported
//         `tests` registration array, a comment or a blank line is dropped, everything else is
//         hashed. Measured: 3,705 runner lines reduce to 71 lines of runner LOGIC. Appending a
//         labelled block changes none of them; editing the loop, the global-home handling, the
//         integration lane or the cargo lane changes the digest.
//   (11c) every `../test/…` specifier the runner imports RESOLVES ON DISK. A registration row is
//         dropped from (11b) by construction, so this is the leg that catches another story's
//         import rewritten to a module that is not there.
const RUNNER_LOOP_HEADER = "for (const { name, run } of tests)";
const RUNNER_INTEGRATION_IMPORT = '  await import("../test/integration/cli.mjs");';
const RUNNER_REGIONS = Object.freeze([
  { id: "the suite loop's body", from: (suite) => ({ code: suite, at: suite.indexOf(RUNNER_LOOP_HEADER) + RUNNER_LOOP_HEADER.length }), pin: "87795a7916611aa1147d223c93c62c8983cbec9f96d4ff742404d28e4e34d088" },
  { id: "the per-test global-home root", from: (suite) => ({ code: suite, at: suite.indexOf("const ghRoot") + "const ghRoot".length }), pin: "e000259f12388892da852afbb326454f66e0d495a0ed47a446e2985823317db4" },
  { id: "the per-test global-home restore (the loop's finally)", from: (suite, loop) => ({ code: loop, at: loop.indexOf("} finally") + "} finally".length }), pin: "0de5a2941999272297fc2f5ef6f776d2f55f4917e67c66bb215d09638c9a1540" },
  { id: "the integration lane's environment restore", from: (suite) => ({ code: suite, at: suite.indexOf("if (previousInProcess === undefined)") + "if (previousInProcess === undefined)".length }), pin: "4726fd6d84c3867494fce10e78674196f83921d2ccb29665da7ddd252c9b3e6d" },
]);
const RUNNER_RESIDUE = "d7c50c16e14ea92e6797dfd491afee7a91755f0d38c6ec2906792878c924b81a";
const REGISTRATION_IMPORT = /^import\s+\{[^}]*\}\s+from\s+"\.\.\/test\/[^"]+";$/u;
const REGISTRATION_SPREAD = /^\s*\.\.\.[A-Za-z_$][\w$]*,?$/u;
const COMMENT_OR_BLANK = /^\s*(?:\/\/.*)?$/u;

function testsRegistrationBounds(lines) {
  const starts = lines.flatMap((line, index) => (line.trim() === "export const tests = [" ? [index] : []));
  if (starts.length !== 1) return { error: `NOT FOUND — scripts/test.mjs has ${starts.length} exact \`export const tests = [\` declarations; one exported registration array is required` };
  const start = starts[0];
  const end = lines.findIndex((line, index) => index > start && line.trim() === "];");
  if (end < 0) return { error: "NOT FOUND — the exported `tests` registration array has no closing `];`" };
  return { start, end };
}

// PURE — runner TEXT in, `{ regions: { id: digest }, residue }` out, or an Error naming the region
// that could not be cut. This is how the plants below get a CONTROL: the pins for synthetic runner
// text are computed from the unmutated synthetic text, so the same validator measures both.
function runnerPins(source) {
  const text = normalize(source);
  const lines = text.split("\n");
  const registration = testsRegistrationBounds(lines);
  if (registration.error != null) return { error: registration.error };
  const suite = functionBody(text, "async function runSuite(");
  if (suite == null) return { error: "NOT FOUND — `async function runSuite(` has no cuttable body, so none of the runner's logic regions can be located" };
  const loop = blockOrStatementAfter(suite, suite.indexOf(RUNNER_LOOP_HEADER) + RUNNER_LOOP_HEADER.length);
  if (loop == null || !loop.braced) return { error: `NOT FOUND — the suite loop \`${RUNNER_LOOP_HEADER}\` owns no braced body. A runner whose loop destructures anything but \`{ name, run }\` cannot be cut here, and a proof against a stale runner is no proof.` };
  const regions = {};
  for (const region of RUNNER_REGIONS) {
    const { code, at } = region.from(suite, loop.body);
    const cut = blockOrStatementAfter(code, at);
    if (cut == null) return { error: `NOT FOUND — ${region.id} could not be cut from scripts/test.mjs` };
    regions[region.id] = digest(cut.body);
  }
  const residue = lines.filter((line, index) =>
    !REGISTRATION_IMPORT.test(line)
      && !(index > registration.start && index < registration.end && REGISTRATION_SPREAD.test(line))
      && !COMMENT_OR_BLANK.test(line));
  return { regions, residue: digest(residue.join("\n")), residueLines: residue.length };
}

function runnerLogicProblems(source, pins, exists, residueFloor = 40) {
  const measured = runnerPins(source);
  if (measured.error != null) return [`REG-MUT-11: ${measured.error}`];
  const problems = [];
  const floor = floorProblem("the runner's non-registration residue", measured.residueLines, residueFloor);
  if (floor != null) problems.push(floor);
  for (const region of RUNNER_REGIONS) {
    if (measured.regions[region.id] !== pins.regions[region.id]) {
      problems.push(`REG-MUT-11: ${region.id} CHANGED in scripts/test.mjs — ${measured.regions[region.id]} ≠ ${pins.regions[region.id]}. 53/05 owns the m53 ARCH block only (ADR-011 §1); the suite loop, the per-test global-home handling and the integration lane are byte-unchanged.`);
    }
  }
  const lanes = normalize(source).split("\n").filter((line) => line === RUNNER_INTEGRATION_IMPORT).length;
  if (lanes !== 1) {
    problems.push(`REG-MUT-11: the integration lane is entered ${lanes} times in scripts/test.mjs, not once — \`${RUNNER_INTEGRATION_IMPORT.trim()}\` is the lane, and it is byte-unchanged`);
  }
  if (measured.residue !== pins.residue) {
    problems.push(`REG-MUT-11: a line of runner LOGIC outside every labelled registration block changed — residue ${measured.residue} ≠ ${pins.residue}. Appending a labelled block of imports and spreads leaves this digest alone by construction; editing the runner's behaviour does not.`);
  }
  for (const specifier of [...new Set([...normalize(source).matchAll(/from\s+"(\.\.\/test\/[^"]+)"/gu)].map((match) => match[1]))]) {
    if (!exists(specifier)) {
      problems.push(`REG-MUT-11: scripts/test.mjs imports "${specifier}", which does not resolve on disk — a registration row rewritten to name another module is how one story's diff hijacks another story's block`);
    }
  }
  return problems;
}

// ── REG-MUT-12 / REG-MUT-13: THE HARNESS PROPERTIES, SWEPT OVER THE ELEVEN ─────────────
//
// Isolation is a property of the harness, not of any one invariant, and before this leg existed
// the eleven carried ZERO `mkdtemp` / `os.tmpdir` / `homedir` assertions and ZERO spawn-site
// assertions — while `acd-loop-state-rides-the-run-record.test.mjs:2,:31` really does
// `execFileSync("git", …)`.
//
// THE CAPABILITY IS READ FROM THE IMPORT LIST, NOT FROM THE BODY TEXT, and that is load-bearing in
// both directions. A module cannot `mkdtemp` a directory, resolve a home or spawn a child without
// importing the capability, so the import line is the exact, checkable answer to "does this gate
// write a fixture tree at all". And a body-text sweep would be WRONG ABOUT THIS VERY FILE: to prove
// REG-MUT-12/13 fire, this gate must carry `mkdtemp(path.join(os.tmpdir(), …))`, `} finally` and a
// scrubbed-environment `execFileSync(` as PLANT STRINGS. A grep reads those as subjects; the import
// list does not, and this file imports none of the three capabilities. That is a mechanical
// exclusion with a self-check (the capability floors below), not a name on an allowlist.
const ENV_HOME_KEYS = Object.freeze(["HOME", "USERPROFILE"]);
const SPAWNERS = Object.freeze(["execFileSync", "execSync", "spawnSync", "execFile", "exec", "spawn", "fork"]);
// ADMITTED DELEGATE, by name and with a self-check. Eight of the eleven build no fixture root
// themselves: they call `loopFixture` from this shared helper, so the contracted property is real
// but lives one import away. The admission's self-check is that the delegate is actually imported
// by several of the eleven AND that the helper itself satisfies the same fixture rule — an
// admission with no subject is a permission nobody can audit.
// 119/03 — `loop-command-probe.test.mjs` moved into `test/loop/`, and the eleven gates that
// delegate their fixture to it sit under `test/arch/<subject>/`, so the specifier is one level
// deeper than it was. The floor on the delegating set is what made the move red rather than
// quietly reporting that no gate delegates.
const FIXTURE_DELEGATE = "../../loop/loop-command-probe.test.mjs";

function importsOf(code) {
  return [...code.matchAll(/^import\s+(?:([A-Za-z_$][\w$]*)\s*,\s*)?(?:([A-Za-z_$][\w$]*)|\{([^}]*)\})\s+from\s+"([^"]+)"/gmu)].map((match) => ({
    namespace: match[1] ?? (match[2] ?? null),
    named: (match[3] ?? "").split(",").map((entry) => entry.trim().split(" as ")[0]).filter(Boolean),
    from: match[4],
  }));
}

function capabilities(code) {
  const imports = importsOf(normalize(code));
  return {
    mkdtemp: imports.some((entry) => entry.named.includes("mkdtemp")),
    homedir: imports.some((entry) => entry.named.includes("homedir")),
    osNamespaces: imports.filter((entry) => entry.from === "node:os" && entry.namespace != null).map((entry) => entry.namespace),
    child: imports.some((entry) => entry.from === "node:child_process"),
    delegates: imports.some((entry) => entry.from === FIXTURE_DELEGATE && entry.named.includes("loopFixture")),
  };
}

function fixtureProblems(file, code, caps) {
  const problems = [];
  if (caps.homedir) {
    problems.push(`REG-MUT-12: ${file} imports \`homedir\` — a fixture path derived from the operator's home writes outside the per-test AOF_GLOBAL_HOME the runner set, and a FAILING gate then leaves it behind`);
  }
  for (const namespace of caps.osNamespaces) {
    const at = code.indexOf(`${namespace}.homedir`);
    if (at >= 0) problems.push(`REG-MUT-12: ${file} constructs a path from \`${namespace}.homedir\` at line ${code.slice(0, at).split("\n").length} — the fixture root is the OS temp directory, never the operator's home`);
  }
  for (const key of ENV_HOME_KEYS) {
    const needle = `process.env.${key}`;
    const at = code.indexOf(needle);
    if (at >= 0) problems.push(`REG-MUT-12: ${file} constructs a path from \`${needle}\` at line ${code.slice(0, at).split("\n").length} — the fixture root is the OS temp directory, never the operator's home`);
  }
  if (!caps.mkdtemp) return problems;
  const roots = [...code.matchAll(/\bmkdtemp\s*\(/gu)];
  for (const match of roots) {
    const args = matchedParenSpan(code, match.index);
    if (args == null) {
      problems.push(`REG-MUT-12: ${file}: NOT FOUND — the \`mkdtemp(\` call at line ${code.slice(0, match.index).split("\n").length} has no balanced argument list, so its root cannot be read`);
    } else if (!/^\s*path\.join\(\s*(?:[A-Za-z_$][\w$]*\.)?tmpdir\(\)/u.test(args.body)) {
      problems.push(`REG-MUT-12: ${file}:${code.slice(0, match.index).split("\n").length} roots a fixture at \`${args.body.trim()}\` — it must be created by \`mkdtemp(path.join(os.tmpdir(), …))\``);
    }
  }
  // …and removed in a `finally`, so a FAILING gate leaves nothing behind. Counted rather than
  // inspected once: a file with two fixture roots and one cleanup leaks the other on failure.
  let removals = 0;
  let at = code.indexOf("} finally");
  while (at >= 0) {
    const cut = blockOrStatementAfter(code, at + "} finally".length);
    if (cut == null) {
      problems.push(`REG-MUT-12: ${file}: NOT FOUND — a \`finally\` at line ${code.slice(0, at).split("\n").length} owns no cuttable block`);
    } else if (/\brm(?:Sync)?\s*\(/u.test(cut.body) || /\.cleanup\s*\(/u.test(cut.body)) {
      removals += 1;
    }
    at = code.indexOf("} finally", at + 1);
  }
  if (removals < roots.length) {
    problems.push(`REG-MUT-12: ${file} creates ${roots.length} fixture root(s) with mkdtemp but only ${removals} \`finally\` block(s) remove one — a fixture is removed in a \`finally\`, so a FAILING gate leaves nothing behind`);
  }
  return problems;
}

function spawnProblems(file, code, caps) {
  const problems = [];
  if (!caps.child) return problems;
  for (const token of SPAWNERS) {
    for (const match of code.matchAll(new RegExp(`\\b${token}\\s*\\(`, "gu"))) {
      const line = code.slice(0, match.index).split("\n").length;
      const args = matchedParenSpan(code, match.index);
      if (args == null) {
        problems.push(`REG-MUT-13: ${file}:${line}: NOT FOUND — the \`${token}\` call site could not be cut, so nothing can be claimed about the environment it hands the child`);
        continue;
      }
      // NO `env:` KEY AT ALL is the passing form: the child INHERITS `process.env`, which carries
      // the AOF_GLOBAL_HOME the runner set for this test. A DECLARED `env` replaces it wholesale,
      // so it must either spread `process.env` or name AOF_GLOBAL_HOME itself.
      if (/\benv\s*:/u.test(args.body) && !/\.\.\.process\.env/u.test(args.body) && !args.body.includes("AOF_GLOBAL_HOME")) {
        problems.push(`REG-MUT-13: ${file}:${line} spawns a child through \`${token}\` with a SCRUBBED environment — it declares \`env:\` without \`...process.env\` or AOF_GLOBAL_HOME, so the child reads the operator's real ~/.aof instead of this test's global home`);
      }
    }
  }
  return problems;
}

// A minimal runner text carrying the real block rows, so a plant mutates a faithful shape rather
// than a strawman. The unmutated form is itself a control: it must be clean.
function syntheticRunner(mutate = (rows) => rows) {
  const { imports, spreads, otherStory } = mutate({
    imports: ownFiles.map((file, index) => importRow(index)),
    spreads: ALIASES.map((alias, index) => spreadRow(index)),
    otherStory: 'import { somethingElse } from "../test/other.test.mjs";',
  });
  return [
    'import assert from "node:assert/strict";',
    otherStory,
    "",
    IMPORT_LABEL,
    ...imports,
    "",
    "export const tests = [",
    "  ...somethingElse,",
    SPREAD_LABEL,
    ...spreads,
    "];",
    "",
  ].join("\n");
}

// A minimal but FAITHFUL runner whose `runSuite` carries the three regions REG-MUT-11 pins, so its
// plants mutate the real shapes rather than a strawman.
function syntheticSuite() {
  return [
    ...syntheticRunner().split("\n"),
    "async function runSuite() {",
    "  let failures = 0;",
    '  const ghRoot = join(homedir(), ".aof-test", `gh-${process.pid}`);',
    "  let ghIndex = 0;",
    ...[
      `  ${RUNNER_LOOP_HEADER} {`,
      "    const prevHome = process.env.AOF_GLOBAL_HOME;",
      "    process.env.AOF_GLOBAL_HOME = join(ghRoot, `t-${ghIndex++}`);",
      "    try {",
      "      await run();",
      "    } catch (error) {",
      "      failures += 1;",
      "    } finally {",
      "      if (prevHome === undefined) delete process.env.AOF_GLOBAL_HOME;",
      "      else process.env.AOF_GLOBAL_HOME = prevHome;",
      "    }",
      "  }",
    ],
    '  const previousInProcess = process.env.AOF_IN_PROCESS_INTEGRATION;',
    '  process.env.AOF_IN_PROCESS_INTEGRATION = "1";',
    RUNNER_INTEGRATION_IMPORT,
    "  if (previousInProcess === undefined) {",
    "    delete process.env.AOF_IN_PROCESS_INTEGRATION;",
    "  } else {",
    "    process.env.AOF_IN_PROCESS_INTEGRATION = previousInProcess;",
    "  }",
    "  return failures;",
    "}",
    "",
  ].join("\n");
}

// ── ACCEPT-02 / ACCEPT-03: THE ACCEPTED-TEST DIFF CEILING ────────────────────────────
//
// ADR-015 §§8/10 grant this story TWO pre-existing accepted milestone-52 test files, and inside them
// only the named roster-assertion regions plus the directly adjacent explanatory prose needed to
// state the amended claim truthfully. Nothing else in either file may move — no other assertion,
// fixture, setup, helper or executable path.
//
// THE CONTRACT IS A DIFF CEILING — "the tree before and after this story" — SO THE INSTRUMENT IS
// TOO. Every region carries an explicit `grantedBy` naming the ADR § or the story that admits it,
// and a region with `grantedBy: null` is reported as UNDECLARED, naming the story whose diff
// carries it. That is what turns "a reviewer noticed this" into a mechanical gate: an absolute
// digest taken at HEAD certifies whatever is already there, including a breach it was written to
// catch.
//
// MEASURED, base `9e0f910` → HEAD, and this is exactly why the field exists:
// `test/arch/loop/acd-loop-finding-envelope.test.mjs` differs in TWO regions, not one. `:358-359` is
// granted by ADR-015 §8. `:271` — `{ workspace: { workDir: temp } }` → `{ …, aofDir: temp }` — is
// granted by nothing in §8's enumeration; it arrived in commit `1655251`, i.e. in 53/07's diff,
// following ADR-012's move of the registry home. It is DECLARED here, with its owning story named,
// rather than buried inside the residue where the accepting review would inherit it unseen.
//
// THE INSTRUMENT IS AN EOL-NORMALISED, POSITION-PRESERVING RESIDUE DIGEST: each pinned line is
// MASKED IN PLACE, never removed. Removing them was the second hole: measured, moving
// `acd-loop-finding-envelope.test.mjs:359` to LINE 1 — outside its test body entirely, where it can
// never run — yielded `0 problem(s)`, because a deleted line's POSITION is never hashed. An
// assertion that no longer runs is not "narrowed"; it is deleted, which ADR-015 §10.3 refuses.
// Masking keeps the line's position in the hash while leaving its content to the exact-count pin,
// so the ceiling now fails in THREE directions: content drift, relocation, and any other byte.
//
// Milestone 55/01 deliberately extends this accepted census under 55/ADR-002: CHECK_IDS gains the
// anchor-grounding row and the table must reach its two new codes. The residue below advances to
// those reviewed bytes; the two historically movable regions remain the only masked lines, so a
// further change anywhere in the widened census still fails this ceiling.
//
// Milestone 57/01 deliberately extends the same census under 57/ADR-003 and FF-5703: five watcher
// codes join the table, the one inherited gating code changes severity, and the face-only exit is
// pinned in the existing envelope suite. The residue advances to those reviewed bytes for the same
// reason; the two historical masked regions remain the only generally movable lines.
//
// Milestone 58/02 deliberately extends the same census under 58/ADR-005 §1 and FF-5803: EIGHT codes
// join `GATING_CODES` and it reaches thirteen, six new check codes join the table and it reaches
// 38, and three inherited-from-52 codes move `warn` -> `error` because they are this milestone's own
// subject. 58/ADR-007 §3 assigns `acd-loop-finding-envelope.test.mjs` to 58/02 by name, and this
// ceiling is the third consecutive milestone to be reddened by that assignment — so the residue
// advances to the reviewed bytes exactly as 55/01 and 57/01 advanced it, and for the same reason.
// THE MASK SET IS UNCHANGED: the two historically movable regions remain the only permitted lines,
// so every byte of the widened census is frozen again at its new value rather than exempted.
const ACCEPTED_CEILINGS = Object.freeze([
  {
    row: "ACCEPT-02",
    // 119/03 — the suite moved into its subject directory; the row names it there.
    file: "test/arch/loop/acd-loop-finding-envelope.test.mjs",
    floor: 300,
    // RE-PINNED by 119/01: import specifiers and read-subject paths only (see the file header).
    // RE-PINNED AGAIN by 119/03, and this is the reason: the suite MOVED into `test/arch/loop/`,
    // which re-depthed its `../../src/` and `../../support/` specifiers by one segment. Those lines
    // are outside the permitted regions, so the residue moved — which is the ceiling working, not
    // failing. The three permitted lines were each verified present EXACTLY ONCE before the
    // re-stamp, so the mask set is unchanged and nothing new is exempted; the next unattributed
    // byte still fails.
    // RE-STAMPED at 119/03's close. Two bytes moved outside the permitted regions, both of them
    // this milestone's own: the suite's `../../support/registration-surface.mjs` specifier became
    // `../../support/registration/registration-surface.mjs` when the two suite-location helpers
    // were given a subject directory (FF-11904's `test/support` row asked for exactly that), and
    // the roster amendment above added a `leaves` set, a `pathOf` lookup and its explanatory
    // comment. NONE of them is exempted — the mask set still holds three lines and only three —
    // so the widened census is frozen again at its new value, which is this ceiling's own rule
    // and the reason the next unattributed byte still fails. Verified by planting one: a trailing
    // comment appended to the accepted suite reds REG-MUT-15 against this pin.
    residue: "0afed223e0386b9174bffa734ab7811ec195a72d13794da638057a599579525f",
    regions: [
      {
        id: "FF-5209 roster",
        story: "53/05",
        grantedBy: "ADR-015 §8",
        cite: "ADR-015 §8",
        lines: [
          "      assert.ok(files.length >= expectedFiles.length, `the acd-loop-* sweep was non-vacuous: ${files.length} files`);",
          // 119/03 — the roster assertion's PREDICATE moved from `files.includes(file)` to
          // `leaves.has(file)`, and nothing else about it did. `test/arch/` has subject
          // directories now, so the sweep yields subject-RELATIVE paths (`loop/acd-loop-x.test.mjs`)
          // while `expectedFiles` names the nine gates by leaf; an `includes` over the full paths
          // matched none of them. The roster, the citation and the message are byte-identical —
          // this is the same claim, read against the shape the tree now has.
          //
          // THE MASK SET IS NOT WIDENED BY IT. The amendment also added a `leaves` set, a `pathOf`
          // lookup and a comment; those are NOT permitted lines and go into the residue below,
          // re-stamped at their new value. That is this ceiling's own rule — freeze the widened
          // census again rather than exempt it — and it is why the next unattributed byte still
          // fails.
          "      for (const file of expectedFiles) assert.ok(leaves.has(file), `${file}: milestone 52's own gate remains present; later milestones may share the namespace (53/ADR-015 §8)`);",
        ],
      },
      {
        id: "loops-validate fixture workspace gains aofDir",
        story: "53/07",
        grantedBy: "53/07 / ADR-012 (registry home moved; fixture follows) — landed in commit 1655251, outside ADR-015 §8's enumeration",
        cite: null,
        lines: [
          "        const commandResult = await loopsValidateCommand.run({}, { workspace: { workDir: temp, aofDir: temp } });",
        ],
      },
    ],
  },
  {
    row: "ACCEPT-03",
    // 119/03 — the suite moved into its subject directory; the row names it there.
    file: "test/loop/work-loops-coverage-ledger.test.mjs",
    floor: 700,
    // RE-STAMPED 2026-09-06 (was 5e71e78f7116…), by the operator's ruling at `aof:pay-debt`:
    // "TECH_DEBT is not a ledger of closed things — remove what is no longer debt."
    //
    // WHAT MOVED AND WHY IT HAD TO. Leg 9 read `wiki/work/TECH_DEBT.md`, cut item 48 out of it,
    // and asserted the entry's PROSE still said `**Status:** **CLOSED`. That froze a BACKLOG:
    // recording that item 48's milestone-52 half was discharged — the one thing a debt ledger
    // exists to do — reddened this ceiling, and on 2026-09-05 it did. A control may not pin an
    // entry whose whole purpose is to be deleted. The clause is removed; nothing else in that
    // file moved, and the legs that carry 52/05's real evidence (every `verifies →` bullet names
    // a feature on disk and a suite path assembled by the runner, and no bullet rests on a
    // "fixture … green" claim) are untouched. TECH_DEBT item 52 named this same clause its
    // sharpest positional-slice instance; both faults leave together.
    //
    // A RE-STAMP IS NOT A RELAXATION: the ceiling still holds every other byte of the file, and
    // the next unattributed edit fails exactly as before.
    // RE-PINNED by 119/03 for the same reason as ACCEPT-02 above: the suite moved into
    // `test/loop/` and its relative specifiers gained a segment. Five permitted lines, each
    // verified present exactly once before the re-stamp; the mask set is unchanged.
    //
    // RE-STAMPED AGAIN at 119/03's close, for the bytes the roster amendments left outside the
    // mask: the two `gateLeaves` / `archLeaves` sets the amended predicates look up in, their
    // comments, and the suite's `../support/registration/{registration-surface,cited-suite-path}`
    // specifiers, which gained a segment when the two suite-location helpers were given a subject
    // directory. The mask set is STILL five lines and only five — every one of those bytes is
    // frozen at its new value rather than exempted, which is the rule this ceiling states of
    // itself and the reason the next unattributed edit still fails.
    residue: "c658a0d7b60ebd91338da060e45adcf4ac872e2f01ce8db843115cd990f25072",
    regions: [
      {
        id: "leg 5 exclusion-pointer roster (beyond §8's enumeration — see above)",
        story: "53/05",
        grantedBy: "ADR-015 §8 (class rule §10) — leg 5's archTestNames() sweep reddens on 53/05's gates for the same reason as the three §8 enumerates",
        cite: "ADR-015 §8",
        lines: [
          "      assert.ok(files.length >= NINE_GATES.length, `the acd-loop-* sweep was non-vacuous: ${files.length} files`);",
          // 119/03 — the predicate moved from `files.includes(file)` to `gateLeaves.has(file)`, for
          // the same reason ACCEPT-02's did one row up: `test/arch/` has subject directories now, so
          // the sweep yields subject-relative paths while NINE_GATES names the gates by leaf. The
          // roster, the citation and the message are byte-identical; the set it is looked up in is
          // the one the tree now produces. The `gateLeaves` set that makes it possible is NOT a
          // permitted line — it goes into the residue below.
          "      for (const file of NINE_GATES) assert.ok(gateLeaves.has(file), `${file}: milestone 52's own gate remains present for exclusion-pointer resolution; later milestones may share the namespace (53/ADR-015 §8)`);",
        ],
      },
      {
        id: "leg 8 namespace-collision clause",
        story: "53/05",
        grantedBy: "ADR-015 §8",
        cite: "ADR-015 §8",
        lines: [
          "        assert.equal(NINE_GATES.includes(path.basename(file)), false, `${file}: must not collide with milestone 52's own frozen nine; ADR-015 §8 permits later gates in the acd-loop-* namespace`);",
        ],
      },
      {
        id: "leg 8 roster",
        story: "53/05",
        grantedBy: "ADR-015 §8",
        cite: "ADR-015 §8",
        lines: [
          "      assert.ok(archFiles.length >= NINE_GATES.length, `the acd-loop-* sweep was non-vacuous: ${archFiles.length} files`);",
          // 119/03 — `archFiles.includes` -> `archLeaves.has`, the third and last of this milestone's
          // roster amendments, all three for the one reason: the sweep yields subject-relative paths
          // now and the roster names leaves. Message, citation and roster byte-identical.
          "      for (const file of NINE_GATES) assert.ok(archLeaves.has(file), `${file}: milestone 52's own gate remains present; later milestones may share the namespace (53/ADR-015 §8)`);",
        ],
      },
    ],
  },
]);

// PURE — accepted-suite TEXT in, problems out, so REG-MUT-15 can be planted without editing an
// accepted milestone-52 suite in order to prove the ceiling holds.
function ceilingProblems(text, ceiling) {
  const problems = [];
  const lines = normalize(text).split("\n");
  const floor = floorProblem(`${ceiling.row} ${ceiling.file}`, lines.length, ceiling.floor);
  if (floor != null) return [floor];
  const permitted = ceiling.regions.flatMap((region) => region.lines);
  for (const region of ceiling.regions) {
    for (const line of region.lines) {
      const count = lines.filter((candidate) => candidate === line).length;
      if (count !== 1) problems.push(`${ceiling.row} (${region.id}): the amended assertion appears ${count} times in ${ceiling.file}, not once:\n      ${line}`);
    }
    if (region.grantedBy == null) {
      problems.push(`${ceiling.row} (${region.id}): UNDECLARED REGION — ${ceiling.file} differs from the milestone base here and the diff is carried by ${region.story ?? "an unattributed story"}, but no ADR § or story is named as granting it. Name the grant, or revert the region: an accepted milestone-52 suite is not amendable by accident.`);
    } else if (region.cite != null && !region.lines.some((line) => line.includes(region.cite))) {
      problems.push(`${ceiling.row} (${region.id}): the amended region no longer names ${region.cite} — the adjacent-prose allowance exists only to keep the narrowed claim truthful`);
    }
  }
  const residue = lines.map((line) => (permitted.includes(line) ? MASK : line)).join("\n");
  const measured = digest(residue);
  if (measured !== ceiling.residue) {
    problems.push(`${ceiling.row} (REG-MUT-15): a byte of ${ceiling.file} moved OUTSIDE the permitted assertion/prose regions, or a permitted line MOVED — residue ${measured} ≠ ${ceiling.residue}. ADR-015 §§8/10 grant this story the named roster-assertion regions and their directly adjacent explanatory prose ONLY; no other assertion, fixture, setup, helper or executable path may move, no permitted assertion may be relocated out of the test body it belongs to, and no milestone-52 .feature may be touched at all.`);
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): all eleven gates export non-empty exact name/run arrays with traceable names",
    run: async () => {
      assert.equal(ownFiles.length, 11);
      for (const name of ownFiles) {
        const module = await importArch(name);
        assert.ok(Array.isArray(module.archTests) && module.archTests.length > 0, `${name}: archTests is a non-empty array`);
        // REG-MUT-01 / REG-MUT-02, through the same pure checker the plants drive below — the
        // members' own entry keys, in test-object position, never a bare `fn:` grep.
        assert.deepEqual(entryKeyProblems(name, module.archTests), []);
        for (const entry of module.archTests) assert.equal(typeof entry.name, "string");
        // REG-MUT-03 / REG-MUT-10, through the same pure checker the plants drive below.
        assert.deepEqual(nameProblems(name, module.archTests.map((entry) => entry.name)), []);
      }
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): the runner's real destructuring makes a planted wrong-key member unreachable",
    run: async () => {
      const runner = stripComments(await readFile(path.join(root, "scripts", "test.mjs"), "utf8"));
      assert.match(runner, /for\s*\(\s*const\s*\{\s*name\s*,\s*run\s*\}\s*of\s*tests\s*\)/u);
      const calls = [];
      const members = [{ name: "a", run: async () => calls.push("a") }, { name: "b", wrong: async () => calls.push("b") }];
      let error = null;
      try {
        for (const { run } of members) await run();
      } catch (caught) {
        error = caught;
      }
      assert.deepEqual(calls, ["a"]);
      assert.match(String(error), /not a function/iu);
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): REG-MUT-01/02 — a planted `fn:` member and a non-function `run` are each reported with the file and the test's name",
    run: async () => {
      // REG-MUT-01 — an ACTUAL `{ name, fn }` member, not a `wrong:` stand-in, driven through the
      // checker the eleven are measured by. The report must name the FILE and the test's `name`.
      const planted = { name: "arch/53 FF-5399 (planted.test.mjs): a gate whose body never runs", fn: async () => { throw new Error("unreachable"); } };
      const one = entryKeyProblems("planted.test.mjs", [planted]);
      assert.equal(one.length, 1, `REG-MUT-01: exactly the planted member is reported\n${one.join("\n")}`);
      assert.ok(one[0].includes("REG-MUT-01") && one[0].includes("planted.test.mjs") && one[0].includes(planted.name), one[0]);
      // …and the body is PROVEN never to run, through the runner's own destructuring form.
      const calls = [];
      let error = null;
      try {
        for (const { run } of [{ name: "ok", run: () => calls.push("ok") }, planted]) await run();
      } catch (caught) {
        error = caught;
      }
      assert.deepEqual(calls, ["ok"], "REG-MUT-01: the fn: member's body never ran");
      assert.match(String(error), /not a function/iu);

      // REG-MUT-02 — `run` bound to a NON-FUNCTION. Previously asserted only over the real tree.
      const bound = { name: "arch/53 FF-5399 (planted.test.mjs): run is a string", run: "definitely not a function" };
      const two = entryKeyProblems("planted.test.mjs", [bound]);
      assert.equal(two.length, 1, `REG-MUT-02: exactly the planted member is reported\n${two.join("\n")}`);
      assert.ok(two[0].includes("REG-MUT-02") && two[0].includes("planted.test.mjs") && two[0].includes(bound.name), two[0]);

      // …and a THIRD key beside the two is the same defect: the runner destructures, so an extra
      // key is dead weight the suite reports nothing about.
      const extra = entryKeyProblems("planted.test.mjs", [{ name: "arch/53 FF-5399 (planted.test.mjs): three keys", run: async () => {}, fn: async () => {} }]);
      assert.equal(extra.length, 1, `REG-MUT-01: a member carrying BOTH run and fn is reported\n${extra.join("\n")}`);
      assert.ok(extra[0].includes("fn, name, run"), extra[0]);

      // …and the CONTROL: a well-formed member raises nothing, so a checker that always complains
      // cannot be mistaken for one that detects the plants.
      assert.deepEqual(entryKeyProblems("planted.test.mjs", [{ name: "arch/53 FF-5399 (planted.test.mjs): fine", run: async () => {} }]), []);
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): the whole of test/arch carries zero `fn:` entry keys, read from the members themselves",
    run: async () => {
      const dir = path.join(root, "test", "arch");
      const files = (await suiteFilesBelow(dir)).sort();
      assert.equal(floorProblem("the test/arch sweep", files.length, 250), null);
      const problems = [];
      let members = 0;
      for (const file of files) {
        const module = await import(pathToFileURL(path.join(dir, file)).href);
        const arrays = Object.entries(module).filter(([, value]) => Array.isArray(value) && value.length > 0 && value.every((entry) => entry != null && typeof entry === "object" && typeof entry.name === "string"));
        assert.ok(arrays.length > 0, `${file}: exports no runner-shaped array`);
        for (const [, entries] of arrays) {
          members += entries.length;
          problems.push(...entryKeyProblems(file, entries));
        }
      }
      assert.equal(floorProblem("the test/arch member sweep", members, 900), null);
      assert.deepEqual(problems, [], "task 00:68 — the same entry-key sweep over the WHOLE of test/arch/*.test.mjs finds zero `fn:` entry keys");
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): eleven CONTIGUOUS imports and spreads in one labelled milestone-53 block make every gate name reachable exactly once",
    run: async () => {
      const runnerPath = path.join(root, "scripts", "test.mjs");
      // 119/03 — the subject is the whole registration SURFACE now (the runner plus every
      // directory index), and the floor moved with it. `scripts/test.mjs` itself fell from 5,193
      // lines to 333 BY DESIGN: it stopped growing a line per suite, which is the point of the
      // restructure. A floor of 1,000 over that file would refuse the delivered tree; the same
      // floor over the surface still refuses a truncated or mis-rooted read, which is all
      // REG-MUT-14 was ever for.
      const source = await registrationSurface();
      const runnerLines = normalize(source).split("\n");
      assert.equal(floorProblem("the registration surface", runnerLines.length, 1000), null);
      const testNames = {};
      for (const file of ownFiles) testNames[file] = (await importArch(file)).archTests.map((entry) => entry.name);
      // The real tree, measured by the SAME instrument the plants below drive.
      assert.deepEqual(registrationProblems(source, testNames), []);
      const { tests } = await import(pathToFileURL(runnerPath).href);
      const names = tests.map((entry) => entry.name);
      assert.equal(floorProblem("the assembled runner suite", names.length, 500), null);
      assert.equal(new Set(names).size, names.length, "assembled suite names are unique");
      for (const file of ownFiles) {
        for (const name of testNames[file]) assert.ok(names.includes(name), `${file}: ${name} is imported but not spread`);
      }
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): REG-MUT-04/05/06/07/08/10/14 — each planted registration defect is caught by the same validator the real runner is measured by",
    run: async () => {
      // THE CONTROL FIRST: an unmutated synthetic block is clean, so a validator that simply
      // always complains cannot be mistaken for one that detects the plants.
      assert.deepEqual(registrationProblems(syntheticRunner()), [], "control: the unmutated eleven-row block is clean");
      const unreachable = ["arch/53 FF-5304 (acd-loop-probe-contract): the probe spawns nothing", "arch/53 FF-5304 (acd-loop-probe-contract): the probe mints nothing"];

      const plants = [
        {
          id: "REG-MUT-04",
          mutate: ({ imports, spreads, otherStory }) => ({ imports: imports.filter((row) => !row.includes(ALIASES[3])), spreads, otherStory }),
          // A dropped import is reported by the CENSUS (bound by 0 imports), which
          // short-circuits ahead of the ownership leg — the order this file has always
          // kept, so the line naming the real defect is not buried behind shifted rows.
          reports: ["REG-MUT-08", ALIASES[3]],
          absent: ["REG-MUT-05"],
        },
        {
          id: "REG-MUT-05",
          // 119/03 — REG-MUT-05 WAS "an unrelated spread interleaved splits the contiguous run".
          // A subject partition has no contiguous run to split, so that defect no longer exists to
          // plant: the eleven are spread by three different indexes and adjacency means nothing.
          // What the row was FOR — a gate whose spread is gone — is still a defect, and the census
          // catches it as REG-MUT-06 with the file and its unreachable names. The plant therefore
          // asserts the surviving detection rather than a shape this tree cannot take, which is
          // more honest than inventing a synthetic defect to keep a row number alive.
          mutate: ({ imports, spreads, otherStory }) => ({ imports, spreads: spreads.filter((row) => !row.includes(ALIASES[5])), otherStory }),
          reports: ["REG-MUT-06", ALIASES[5]],
        },
        {
          id: "REG-MUT-06",
          mutate: ({ imports, spreads, otherStory }) => ({ imports, spreads: spreads.filter((row) => !row.includes(ALIASES[3])), otherStory }),
          // 119/03 — a dropped spread is reported twice now, and correctly: REG-MUT-06 names the
          // file and its unreachable test names, and the ownership leg names the row its own
          // directory's index no longer carries. Both are true, so `absent` no longer excludes
          // REG-MUT-05 and the report is no longer expected to be a single line.
          reports: ["REG-MUT-06", ownFiles[3], ALIASES[3], ...unreachable],
        },
        {
          id: "REG-MUT-07",
          mutate: ({ imports, spreads, otherStory }) => ({ imports, spreads: [...spreads, spreadRow(3)], otherStory }),
          reports: ["REG-MUT-07", ALIASES[3]],
          absent: ["REG-MUT-05"],
          exactly: 1,
        },
        {
          id: "REG-MUT-08",
          mutate: ({ imports, spreads, otherStory }) => ({ imports: imports.map((row, index) => (index === 3 ? `import { archTests as ${ALIASES[3]} } from "./${leafOf(ownFiles[9])}";` : row)), spreads, otherStory }),
          reports: ["REG-MUT-08", ALIASES[3], leafOf(ownFiles[9])],
        },
        {
          id: "REG-MUT-14",
          mutate: () => ({ imports: [], spreads: [] }),
          reports: ["REG-MUT-14"],
        },
      ];
      for (const plant of plants) {
        const problems = plant.id === "REG-MUT-14"
          ? registrationProblems("")
          : registrationProblems(syntheticRunner(plant.mutate), { [ownFiles[3]]: unreachable });
        assert.ok(problems.length > 0, `${plant.id}: the plant was NOT caught — this validator is what the real runner is measured by`);
        const report = problems.join("\n");
        for (const needle of plant.reports) {
          assert.ok(report.includes(needle), `${plant.id}: the report must name ${needle}\n${report}`);
        }
        // THE CAUSE IS NOT BURIED. A missing or duplicated spread makes every later positional row
        // wrong for a reason that is not a positional defect; reporting those too pushes the line
        // that names the real defect below eight lines of index-shift noise.
        for (const needle of plant.absent ?? []) {
          assert.equal(report.includes(needle), false, `${plant.id}: ${needle} is index-shift noise here, not the cause\n${report}`);
        }
        if (plant.exactly != null) assert.equal(problems.length, plant.exactly, `${plant.id}: the cause is reported once, not buried\n${report}`);
      }

      // REG-MUT-10 / REG-MUT-03 — the same shape, over exported names.
      assert.deepEqual(nameProblems("x.test.mjs", ["arch/53 FF-5311 (x): a name that identifies its milestone, FF and file"]), []);
      const noId = nameProblems("x.test.mjs", ["the loop is registered"]);
      assert.equal(noId.length, 1, "REG-MUT-10: a name carrying no FF-53NN id is caught");
      assert.ok(noId[0].includes("REG-MUT-10") && noId[0].includes("x.test.mjs") && noId[0].includes("the loop is registered"), noId[0]);
      const empty = nameProblems("x.test.mjs", []);
      assert.equal(empty.length, 1, "REG-MUT-03: an empty exported array is caught");
      assert.ok(empty[0].includes("REG-MUT-03") && empty[0].includes("x.test.mjs"), empty[0]);

      // REG-MUT-14 — the floor itself, planted at zero.
      assert.equal(floorProblem("a sweep", 11, 11), null);
      assert.ok(String(floorProblem("a sweep", 0, 1)).includes("read 0, below its floor of 1"));
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): REG-MUT-11 — the suite loop, the global-home handling, the integration lane and every runner line outside the labelled blocks are frozen",
    run: async () => {
      const source = await readFile(path.join(root, "scripts", "test.mjs"), "utf8");
      const exists = (specifier) => existsSync(path.join(root, "scripts", specifier));
      const pins = { regions: Object.fromEntries(RUNNER_REGIONS.map((region) => [region.id, region.pin])), residue: RUNNER_RESIDUE };
      assert.deepEqual(runnerLogicProblems(source, pins, exists), []);

      // THE PLANTS, over SYNTHETIC runner text carrying the same three regions, so the ceiling is
      // proven without editing `scripts/test.mjs` — which 53/05 may not touch outside its own two
      // labelled blocks (ADR-011 §1).
      const control = syntheticSuite();
      const controlPins = runnerPins(control);
      assert.equal(controlPins.error, undefined, `control: the synthetic runner's regions are all cuttable — ${controlPins.error}`);
      const always = () => true;
      assert.deepEqual(runnerLogicProblems(control, controlPins, always, 20), [], "control: the unmutated synthetic runner is clean");

      // (i) THE HIJACKED IMPORT, in ANOTHER story's block. A registration row is dropped from the
      // residue by construction — a later milestone appends its own — so this is the leg that
      // catches it. Measured before this leg existed: zero problems.
      const hijacked = control.replace('"../test/other.test.mjs"', '"../test/HIJACKED.test.mjs"');
      const hijackProblems = runnerLogicProblems(hijacked, controlPins, (specifier) => specifier !== "../test/HIJACKED.test.mjs", 20);
      assert.ok(hijackProblems.some((problem) => problem.includes("REG-MUT-11") && problem.includes("HIJACKED")), `a hijacked import in another story's block must be named\n${hijackProblems.join("\n")}`);

      // (ii) THE MUTATED LOOP FORM. `for (const { name, fn } of tests)` — the member key the whole
      // gate exists for. The loop header can no longer be located, so the cut fails as NOT FOUND.
      const mutated = control.replace(RUNNER_LOOP_HEADER, "for (const { name, fn } of tests)");
      const mutatedProblems = runnerLogicProblems(mutated, controlPins, always, 20);
      assert.ok(mutatedProblems.some((problem) => problem.includes("REG-MUT-11") && problem.includes("NOT FOUND")), `a rewritten suite loop must fail as NOT FOUND\n${mutatedProblems.join("\n")}`);

      // (iii) A LOGIC EDIT INSIDE one of the pinned regions.
      const scrubbed = control.replace("      if (prevHome === undefined) delete process.env.AOF_GLOBAL_HOME;", "      // the restore was removed");
      const scrubbedProblems = runnerLogicProblems(scrubbed, controlPins, always, 20);
      assert.ok(scrubbedProblems.some((problem) => problem.includes("the per-test global-home restore")), `an edit to the global-home handling must be named by region\n${scrubbedProblems.join("\n")}`);

      // (iv) A LOGIC EDIT OUTSIDE every pinned region and outside every labelled block.
      const extra = control.replace("  return failures;", "  process.env.AOF_GLOBAL_HOME = undefined;\n  return failures;");
      const extraProblems = runnerLogicProblems(extra, controlPins, always, 20);
      assert.ok(extraProblems.some((problem) => problem.includes("outside every labelled registration block")), `a logic line added outside the blocks must fail the residue\n${extraProblems.join("\n")}`);

      // (v) AN OPTIONAL-COMMA SPREAD OUTSIDE `export const tests = […]` IS LOGIC, not a
      // registration row. Pin the otherwise-identical object first so the spread token is the
      // only changed byte; the old global spread filter dropped that changed line and stayed green.
      const objectControl = control.replace("async function runSuite()", "const unrelatedOptions = {\n  featureFlags,\n};\n\nasync function runSuite()");
      const objectPins = runnerPins(objectControl);
      const unrelatedSpread = objectControl.replace("  featureFlags,", "  ...featureFlags,");
      const unrelatedSpreadProblems = runnerLogicProblems(unrelatedSpread, objectPins, always, 20);
      assert.ok(unrelatedSpreadProblems.some((problem) => problem.includes("REG-MUT-11") && problem.includes("outside every labelled registration block")), `an unrelated object spread outside the tests array must fail REG-MUT-11\n${unrelatedSpreadProblems.join("\n")}`);

      // (vi) THE CONTROL THAT MAKES THE INSTRUMENT USABLE: a later milestone appending its OWN
      // labelled block of imports and spreads changes NOTHING. An absolute digest would fail here
      // with a message about milestone 53, which is why it is the wrong instrument.
      const terminalControl = control.replace("  ...acdLoopSuiteRegistrationTests,", "  ...acdLoopSuiteRegistrationTests");
      const terminalPins = runnerPins(terminalControl);
      const appended = terminalControl
        .replace('import assert from "node:assert/strict";', 'import assert from "node:assert/strict";\n// milestone 54 / story 00 — a later milestone\'s own block\nimport { archTests as m54Tests } from "../test/arch/acd-m54.test.mjs";')
        .replace("  ...acdLoopSuiteRegistrationTests", "  ...acdLoopSuiteRegistrationTests,\n  // milestone 54 / story 00\n  ...m54Tests");
      assert.deepEqual(runnerLogicProblems(appended, terminalPins, always, 20), [], "a later milestone's appended block leaves every leg green — scripts/test.mjs is an append-only registration hub (ADR-011 §2)");
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): REG-MUT-12/13 — every fixture the eleven build is temp-rooted and removed, and every child they spawn inherits AOF_GLOBAL_HOME",
    run: async () => {
      let fixtures = 0;
      let spawns = 0;
      let delegated = 0;
      for (const file of ownFiles) {
        const code = stripComments(await readFile(path.join(root, "test", "arch", file), "utf8"));
        const caps = capabilities(code);
        if (caps.mkdtemp) fixtures += 1;
        if (caps.child) spawns += 1;
        if (caps.delegates) delegated += 1;
        assert.deepEqual(fixtureProblems(file, code, caps), []);
        assert.deepEqual(spawnProblems(file, code, caps), []);
      }
      // NON-VACUOUS: the sweep must have real subjects, or it proves nothing about the eleven, and
      // a capability parser that silently stopped seeing imports would read as "nothing to check".
      assert.equal(floorProblem("gates building their own fixture tree", fixtures, 2), null);
      assert.equal(floorProblem("gates spawning a child process", spawns, 1), null);

      // THE ADMITTED DELEGATE'S SELF-CHECK: the other gates build their fixture through
      // `loopFixture`, so the admission has a subject only if they really import it AND the helper
      // itself satisfies the same rule.
      assert.equal(floorProblem(`gates delegating their fixture to ${FIXTURE_DELEGATE}`, delegated, 4), null);
      const helper = stripComments(await readFile(path.join(root, "test", "loop", "loop-command-probe.test.mjs"), "utf8"));
      const helperCaps = capabilities(helper);
      assert.equal(helperCaps.mkdtemp, true, `${FIXTURE_DELEGATE}: the admitted delegate really is the module that creates the fixture root`);
      assert.deepEqual(fixtureProblems(FIXTURE_DELEGATE, helper, helperCaps), []);

      // REG-MUT-12 — a fixture rooted at the operator's home, in each of the three spellings.
      const imported = 'import { homedir } from "node:os";\nconst dir = path.join(homedir(), "x");\n';
      assert.ok(fixtureProblems("planted.test.mjs", imported, capabilities(imported)).some((problem) => problem.includes("REG-MUT-12") && problem.includes("imports `homedir`")), "REG-MUT-12: a home-rooted fixture path is named at its import");
      const viaNamespace = 'import os from "node:os";\nconst dir = path.join(os.homedir(), "x");\n';
      assert.ok(fixtureProblems("planted.test.mjs", viaNamespace, capabilities(viaNamespace)).some((problem) => problem.includes("os.homedir") && problem.includes("line 2")), "REG-MUT-12: the namespace spelling is named with its line");
      const viaEnv = `const dir = path.join(process.env.${ENV_HOME_KEYS[1]}, "x");\n`;
      assert.ok(fixtureProblems("planted.test.mjs", viaEnv, capabilities(viaEnv)).some((problem) => problem.includes(ENV_HOME_KEYS[1]) && problem.includes("line 1")), "REG-MUT-12: the environment spelling is named with its line");

      // …a root that is not under the OS temp dir, and one that is never removed.
      const head = 'import { mkdtemp, rm } from "node:fs/promises";\n';
      const offRoot = `${head}const dir = await mkdtemp(path.join(root, "fixtures", "aof-"));\ntry {\n  go();\n} finally {\n  await rm(dir, { recursive: true });\n}\n`;
      assert.ok(fixtureProblems("planted.test.mjs", offRoot, capabilities(offRoot)).some((problem) => problem.includes("roots a fixture at")), "REG-MUT-12: a root outside the OS temp dir is named");
      const unswept = `${head}const dir = await mkdtemp(path.join(os.tmpdir(), "aof-"));\ntry {\n  go();\n} finally {\n  report(dir);\n}\n`;
      assert.ok(fixtureProblems("planted.test.mjs", unswept, capabilities(unswept)).some((problem) => problem.includes("only 0 `finally` block(s) remove one")), "REG-MUT-12: a finally that removes nothing is named");
      const clean = `${head}const dir = await mkdtemp(path.join(os.tmpdir(), "aof-"));\ntry {\n  go();\n} finally {\n  await rm(dir, { recursive: true, force: true });\n}\n`;
      assert.deepEqual(fixtureProblems("planted.test.mjs", clean, capabilities(clean)), [], "control: mkdtemp under the OS temp dir, removed in a finally");
      // …and a file holding no capability is not a subject at all, however its body text reads —
      // which is what keeps THIS gate, whose plants are these very strings, out of its own sweep.
      assert.deepEqual(fixtureProblems("planted.test.mjs", clean, capabilities("")), [], "control: without the import there is no fixture root, so the body text is not a subject");

      // REG-MUT-13 — a child spawned with a SCRUBBED environment, and the inheriting controls.
      const spawnHead = 'import { execFileSync } from "node:child_process";\n';
      const scrubbedCode = `${spawnHead}execFileSync("git", ["status"], { cwd: root, env: { PATH: "/usr/bin" } });\n`;
      const scrubbed = spawnProblems("planted.test.mjs", scrubbedCode, capabilities(scrubbedCode));
      assert.ok(scrubbed.some((problem) => problem.includes("REG-MUT-13") && problem.includes("SCRUBBED") && problem.includes("planted.test.mjs:2")), `REG-MUT-13: a scrubbed spawn is named at its site\n${scrubbed.join("\n")}`);
      const inherit = `${spawnHead}execFileSync("git", ["status"], { cwd: root, encoding: "utf8" });\n`;
      assert.deepEqual(spawnProblems("planted.test.mjs", inherit, capabilities(inherit)), [], "control: no `env:` key at all means the child INHERITS process.env, which carries this test's AOF_GLOBAL_HOME");
      const spread = `${spawnHead}execFileSync("git", ["status"], { env: { ...process.env, TZ: "UTC" } });\n`;
      assert.deepEqual(spawnProblems("planted.test.mjs", spread, capabilities(spread)), [], "control: a declared env that spreads process.env still carries it");
      const explicit = `${spawnHead}execFileSync("aof", ["work"], { env: { AOF_GLOBAL_HOME: home } });\n`;
      assert.deepEqual(spawnProblems("planted.test.mjs", explicit, capabilities(explicit)), [], "control: a declared env that names AOF_GLOBAL_HOME itself is explicit rather than inherited");
      assert.deepEqual(spawnProblems("planted.test.mjs", scrubbedCode, capabilities("")), [], "control: without the node:child_process import there is no spawn site, so the body text is not a subject");
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): ACCEPT-02/ACCEPT-03 — the two accepted milestone-52 suites carry ONLY their pinned narrowed assertions; every other byte is digest-frozen",
    run: async () => {
      for (const ceiling of ACCEPTED_CEILINGS) {
        const text = await readFile(path.join(root, ceiling.file), "utf8");
        assert.deepEqual(ceilingProblems(text, ceiling), []);

        // REG-MUT-15 — the plants, driven against the same pure checker over MUTATED TEXT, so the
        // ceiling is proven without editing an accepted suite in order to prove it.
        const lines = normalize(text).split("\n");
        const permitted = ceiling.regions.flatMap((region) => region.lines);
        const outside = lines.findIndex((line) => line.trim().startsWith("import ") && !permitted.includes(line));
        assert.ok(outside >= 0, `${ceiling.file}: a line outside the permitted regions was located for the plant`);
        const edited = [...lines];
        edited[outside] = `${edited[outside]} // an edit outside the ceiling`;
        const outsideProblems = ceilingProblems(edited.join("\n"), ceiling);
        assert.equal(outsideProblems.length, 1, `${ceiling.row}: an edit outside the permitted regions must be caught`);
        assert.ok(outsideProblems[0].includes("REG-MUT-15") && outsideProblems[0].includes(ceiling.file), outsideProblems[0]);

        // …and a PERMITTED LINE RELOCATED out of the test body it belongs to is caught too. This is
        // the hole the removal-based residue had: measured, moving the amended assertion to line 1
        // — where it can never run — used to yield 0 problems, because a deleted line's position is
        // never hashed. An assertion that no longer runs is deleted, not narrowed (ADR-015 §10.3).
        const moved = [permitted[0], ...lines.filter((line) => line !== permitted[0])];
        const movedProblems = ceilingProblems(moved.join("\n"), ceiling);
        assert.ok(movedProblems.some((problem) => problem.includes("REG-MUT-15")), `${ceiling.row}: a permitted assertion RELOCATED must fail the residue\n${movedProblems.join("\n")}`);

        // …and a permitted region that drifts fails its EXACT pin rather than the digest.
        const region = ceiling.regions[0];
        const drifted = lines.map((line) => (line === region.lines[0] ? line.replace("assert.ok", "assert.equal") : line));
        assert.ok(
          ceilingProblems(drifted.join("\n"), ceiling).some((problem) => problem.includes("not once")),
          `${ceiling.row}: a drifted amended assertion is caught by its exact pin`,
        );

        // …and a ceiling whose granted region stops naming the ADR that granted it is rejected:
        // the adjacent-prose allowance exists only to keep the narrowed claim truthful, so an
        // amended assertion that no longer says WHY it narrowed is outside the grant.
        const unreferenced = { ...ceiling, regions: ceiling.regions.map((entry) => ({ ...entry, lines: entry.lines.map((line) => line.replace("ADR-015 §8", "the roster rule")) })) };
        assert.ok(
          ceilingProblems(text, unreferenced).some((problem) => problem.includes("no longer names ADR-015 §8")),
          `${ceiling.row}: every granted region must name the ADR that granted the narrowing`,
        );

        // …and a region with NO GRANT AT ALL is reported as UNDECLARED, naming its owning story.
        // This is the leg that would have caught `acd-loop-finding-envelope.test.mjs:271` — a real
        // base→HEAD difference that ADR-015 §8 does not enumerate — instead of certifying it.
        const ungranted = { ...ceiling, regions: ceiling.regions.map((entry, index) => (index === ceiling.regions.length - 1 ? { ...entry, grantedBy: null, story: "53/99" } : entry)) };
        const undeclared = ceilingProblems(text, ungranted);
        assert.ok(
          undeclared.some((problem) => problem.includes("UNDECLARED REGION") && problem.includes("53/99")),
          `${ceiling.row}: a pinned region carrying no grant must be reported as undeclared, naming its owning story\n${undeclared.join("\n")}`,
        );
      }
      // Every declared grant is a non-empty string, so `grantedBy` cannot be satisfied by an
      // empty-string placeholder that reads as "declared" while naming nothing.
      for (const ceiling of ACCEPTED_CEILINGS) {
        for (const region of ceiling.regions) {
          assert.equal(typeof region.grantedBy, "string", `${ceiling.row} (${region.id}): grantedBy names the ADR § or story that admits the region`);
          assert.ok(region.grantedBy.length > 8, `${ceiling.row} (${region.id}): ${region.grantedBy}`);
          assert.ok(typeof region.story === "string" && region.story.length > 0, `${ceiling.row} (${region.id}): the owning story is named`);
        }
      }
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): every milestone-53 behavioural family exists and every authored name is assembled in its own runner block",
    run: async () => {
      const testDir = path.join(root, "test");
      // 119/03 — recursive, for the same reason the arch sweep above is. `names` is what the
      // family lookup below reads, so a flat listing would have found 22 directory entries and
      // then failed to find families that are on disk.
      const names = await suiteFilesBelow(testDir);
      const { tests } = await import(pathToFileURL(path.join(root, "scripts", "test.mjs")).href);
      const assembled = new Set(tests.map((entry) => entry.name));
      // REG-MUT-14 — both floors asserted BEFORE any content claim below them.
      assert.equal(floorProblem("the test/ directory", names.length, 100), null);
      assert.equal(floorProblem("the assembled runner suite", assembled.size, 500), null);
      for (const family of families) {
        // 119/03 — the recursive sweep returns SUBJECT-RELATIVE paths and every family pattern
        // is anchored on a basename, so the match reads the leaf while the import below keeps
        // the full path. Matching the whole path would have found no family at all — and the
        // floor above is what turned that into a red rather than a silently empty family.
        const files = names.filter((name) => family.pattern.test(name.slice(name.lastIndexOf("/") + 1))).sort();
        assert.ok(files.length > 0, `${family.story}: behavioural suite family is absent; the dependent story has not landed its evidence`);
        for (const file of files) {
          const module = await import(pathToFileURL(path.join(testDir, file)).href);
          const arrays = Object.values(module).filter((value) => Array.isArray(value));
          assert.ok(arrays.length > 0, `${family.story} ${file}: no runner-shaped array exported`);
          for (const entry of arrays.flat()) assert.ok(assembled.has(entry.name), `${family.story} ${file}: ${entry.name} is not in the assembled runner name set`);
        }
      }
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): registration baseline and positional-slice ledger remain untouched by the eleven",
    run: async () => {
      const gate = await readFile(path.join(root, "test", "arch", "testing", "acd-test-suite-registration.test.mjs"), "utf8");
      // 119/03 — the baseline entry names the suite at its subject path.
      assert.match(gate, /"test\/work\/lifecycle\/work-observe\.test\.mjs"/u);
      for (const file of ownFiles) assert.doesNotMatch(gate, new RegExp(`POSITIONAL_SLICE_LEDGER[\\s\\S]*${file.replaceAll(".", "\\\\.")}`, "u"), `${file} must use structural cuts rather than gain a ledger entry`);
      const unitRunner = await readFile(path.join(root, "scripts", "test-unit.mjs"), "utf8");
      assert.ok(unitRunner.length > 1000, "scripts/test-unit.mjs was actually read and is not a registration target for these gates");

      // REG-MUT-09 — a TWELFTH arch file registered by neither runner. Driven against a SYNTHETIC
      // tree through the same predicate `acd-test-suite-registration:151` uses, because writing a
      // real file into test/arch/ to prove the ratchet would leave the repo dirty and be
      // indistinguishable from the orphan it is meant to simulate.
      // 119/03 — the registration SURFACE, not the two runner files. A suite is registered by
      // its own directory's index now, and the index is spread by the runner, so "imported by a
      // runner" would report every suite in the tree as an orphan. The transitive reading is the
      // one `registrationDecision` has always taken; only the text this leg reads has changed.
      const runners = (await registrationSurface()) + NEWLINE + unitRunner;
      // 119/03 — recursive: the suites live in subject directories now, and a flat listing of the
      // two roots returned NOTHING. REG-MUT-14's floor below is what made that a red.
      // 119/03 — recursive: the suites live in subject directories now, and a flat listing of the
      // two roots returned NOTHING. REG-MUT-14's floor below is what made that a red.
      //
      // `test/integration/` IS EXCLUDED, and deliberately: it is a separate lane with its own
      // entry point (`npm run test:smoke:cli`), not suites `scripts/test.mjs` assembles, so it
      // was never this claim's subject — the previous flat walk over `test` and `test/arch`
      // could not reach it either. Widening the walk DID surface a real orphan there:
      // `test/integration/cli-child-process.test.mjs` is imported by neither runner and by no
      // index. That is a finding for 119/03's review, recorded in the milestone STATE — not a
      // thing to bury by adding it to a shrink-only baseline, which may only ever shrink.
      const suites = (await suiteFilesBelow(path.join(root, "test")))
        .filter((rel) => !rel.startsWith("integration/"))
        .map((rel) => `test/${rel}`);
      assert.equal(floorProblem("the suite tree", suites.length, 300), null);
      assert.deepEqual(orphanProblems(suites.sort(), runners, UNREGISTERED_BASELINE), [], "control: the real tree's orphan list is exactly the shrink-only baseline, and the eleven are not in it");
      const twelfth = "test/arch/acd-loop-twelfth-gate.test.mjs";
      const grown = orphanProblems([...suites, twelfth].sort(), runners, UNREGISTERED_BASELINE);
      assert.equal(grown.length, 1, `REG-MUT-09: the orphan list grows by exactly the planted file\n${grown.join("\n")}`);
      assert.ok(grown[0].includes("REG-MUT-09") && grown[0].includes(twelfth), grown[0]);
      // …and the ratchet's own self-check: a baseline entry with no file on disk is a failure too.
      const ghost = orphanProblems(suites, runners, [...UNREGISTERED_BASELINE, "test/gone.test.mjs"]);
      assert.ok(ghost.some((problem) => problem.includes("test/gone.test.mjs")), `REG-MUT-09: a ghost baseline entry is named\n${ghost.join("\n")}`);
    },
  },
  {
    name: "arch/53 FF-5311 (acd-loop-suite-registration): doctor legacy envelope carries exactly the one-line ADR-014 ceiling and unchanged residue/name set",
    run: async () => {
      const file = path.join(root, "test", "work", "doctor-command-core.test.mjs");
      const normalized = normalize(await readFile(file, "utf8"));
      const lines = normalized.split("\n");
      const keyLines = lines.filter((line) => line.includes("Object.keys("));
      assert.equal(lines.length - 1, 683, "doctor-command-core remains 683 newline-terminated lines");
      assert.equal(keyLines.length, 1, "exactly one Object.keys( occurrence is the envelope ceiling");
      assert.equal(
        keyLines[0],
        '        assert.deepEqual(Object.keys(result).sort(), ["findings", "loopReady"], "the result carries no third top-level field (53/ADR-014)");',
        "the sole permitted line is byte-equal to ADR-014's sorted key-set replacement",
      );
      // MASKED IN PLACE, never removed — the same hole ACCEPT-02/03 had. Removing the permitted
      // line leaves its POSITION unhashed, so ADR-014's one-line ceiling could be relocated out of
      // the `doctor/00` envelope test entirely for zero problems.
      const residue = lines.map((line) => (line.includes("Object.keys(") ? MASK : line)).join("\n");
      // RE-PINNED by 119/01: one import specifier and one comment citation; 683 lines, unchanged.
      // RE-PINNED AGAIN by 119/03: the suite moved into `test/work/` and its `../src/` specifiers
      // gained a segment. The file is STILL 683 lines and still carries exactly ONE `Object.keys(`,
      // both asserted above before the residue is taken, so the ceiling's own claim is untouched —
      // only the bytes around it moved, which is what the residue exists to notice.
      assert.equal(digest(residue), "cca976b5f9e8f454c25b19e7422e60f57e24eff01c8a7985cf53319531f0a2df");
      const moved = [keyLines[0], ...lines.filter((line) => !line.includes("Object.keys("))].map((line) => (line.includes("Object.keys(") ? MASK : line)).join("\n");
      assert.notEqual(digest(moved), digest(residue), "relocating the one permitted line changes the residue — position is hashed, not just content");
      const { doctorCommandCoreTests } = await import(pathToFileURL(file).href);
      const nameDigest = digest(JSON.stringify(doctorCommandCoreTests.map((entry) => entry.name).sort()));
      assert.equal(doctorCommandCoreTests.length, 24);
      assert.equal(nameDigest, "70356b60ec7cccb266714e278ee8296af056d425bfbbe4a109e4deb26f174d4a", "legacy test-name set is unchanged");
    },
  },
];
