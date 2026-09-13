// THE INSTRUMENT CENSUS — milestone 59 / story 01. ADR-003 §2 and §4, ADR-004 §1.
//
// "Is this fitness function actually wired into CI?" has had a WRONG ANSWER in this
// repository for a month. The gate that asked it searched the runner's source text for the
// suite's filename, so an import with no spread satisfied it perfectly — and twenty-six
// suites carrying a hundred and seventeen test entries went dark in one commit
// (`15e0a92`, 2026-07-26) while still looking registered. Spike 56 measured it twice, and
// re-measured unchanged at HEAD: twenty-seven imported bindings in `scripts/test.mjs` are
// never spread.
//
// ── THE RULE, AND WHY IT IS NOT "ALSO CHECK FOR A SPREAD" ────────────────────────────────
//
// A spread check is one more claim about TEXT, and a commented-out `// ...someTests,` would
// satisfy it exactly as a commented-out import satisfied the lane it replaces. 56 is explicit
// about this, and it has the receipts: four of the twenty-six were missed by the spike's own
// first census because each appears twice in the runner — once as an import and once inside a
// COMMENT — and the comments doing the shadowing assert liveness in prose that had been false
// for a month.
//
// So the authority is `registrationDecision()` below: a suite is registered when the tests it
// exports are MEMBERS OF THE ARRAY CI WILL EXECUTE, and unregistered otherwise, regardless of
// what the runner's source text happens to contain. It is a pure function of
// (files, per-file exported names, the assembled name set, the baseline), which is what lets
// ONE home serve both consumers:
//
//   · `test/arch/testing/acd-test-suite-registration.test.mjs` (FF-5903) runs INSIDE the runner's own
//     process, where every registered module is already loaded, so it can supply real per-file
//     names for the whole tree. It is the AUTHORITY.
//   · this module's `runCensus()` is the CLI lane. It is static, it obtains the assembled name
//     set through the bounded child seam (never by importing project code, 66/ADR-004 §2), and
//     where it can only make a text-level claim it SAYS SO IN THE FINDING and names the gate
//     that decides. ADR-003 §4.
//
// It deliberately does NOT add a hundred-and-twenty-fourth hand-rolled comment stripper
// (TECH_DEBT item 57; item 24 is the defect the clones carry). The one honest consequence is
// stated in `spreadClaimLimit()` and repeated in every text-level finding this lane emits.
//
// ── EVERY SWEEP SAYS WHAT IT READ (ADR-004 §1, FF-5908) ──────────────────────────────────
//
// A lane that found nothing and a lane that LOOKED AT NOTHING are indistinguishable in a
// finding list, and the second is the failure this milestone exists to catch — it has already
// happened here, where a renamed fixture root turned a probe into a comparison of nothing with
// nothing and it passed. So a clean result is not representable in this module: `runCensus()`
// returns `{ findings, reads }`, every sweep in `CENSUS_SWEEPS` declares a `floor`, a sweep
// that declares none is REFUSED rather than defaulted, and a sweep below its floor emits
// `audit-ran-on-nothing` naming the sweep, the root it walked and the floor it missed.
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { runBounded, DEFAULT_DEADLINE_MS } from "./spawn.mjs";
import { isToolkitRoot, toolkitProgram } from "./toolkit.mjs";
// ONE DEFINITION OF THE READ RECORD, AND IT IS NOT HERE ANY MORE (59/ADR-004 §1a, closed by
// 59/04). `sweepDeclarationProblems`, `readRecord` and `readFinding` moved to `./reads.mjs` so the
// evidence lane emits the SAME shape through the SAME floor comparison instead of a third,
// `id`-keyed spelling that compared nothing. They are re-exported from here unchanged, because
// this module is where both consumers (FF-5903 and FF-5908) already reach for them.
// The LIMIT record joined them there at `aof:verify 59` (D-59-3), for the same reason one field
// over: this lane's limits and the evidence lane's were two shapes, the face read one of them, and
// the census's rendered as `undefined — undefined` on every run.
import {
  LIMIT_KEYS,
  SWEEP_BASES,
  limitDeclarationProblems,
  limitRecord,
  readFinding,
  readRecord,
  sweepDeclarationProblems,
} from "./reads.mjs";

export { LIMIT_KEYS, SWEEP_BASES, limitDeclarationProblems, limitRecord, readFinding, readRecord, sweepDeclarationProblems };

// ── THE FROZEN FINDING CODES ─────────────────────────────────────────────────────────────
//
// Disjoint from `CONTROL_FINDING_CODES` in `src/work/doctor-controls.mjs` by construction:
// doctor asks whether the documents are coherent, the audit asks whether the instruments that
// produce them still work, and a shared code would let one command's severity table decide the
// other's meaning (FF-5905).
export const AUDIT_FINDING_CODES = Object.freeze([
  "audit-ran-on-nothing",
  "audit-suite-unregistered",
  "audit-suite-imported-never-spread",
  "audit-baseline-stale",
  "audit-baseline-unreasoned",
  "audit-runtime-membership-unavailable",
]);

// ── THE SHRINK-ONLY BASELINE — ONE HOME, NAMED RATHER THAN COUNTED ───────────────────────
//
// A suite that cannot be registered is carried HERE, with its reason AND its origin, so that
// (a) the next one fails CI, and (b) paying one down is a visible edit somebody has to justify
// rather than a number quietly ticking. It may only ever SHRINK. An entry without a reason is
// refused, and an entry naming a suite that is not on disk is itself a failure — a permission
// with no subject is how a converted suite quietly regains its exemption.
//
// This list is the one home for BOTH consumers: the arch gate (FF-5903) imports it from here
// rather than keeping a second copy, because two copies of a shrink-only ledger is one ledger
// and one loophole.
//
// ── AND IT IS AOF'S OWN LEDGER, ABOUT AOF'S OWN SUITES (chore 99) ─────────────────────────
//
// Every entry here names a file in AOF'S tree. In this repository the workspace under audit IS the
// aof checkout, so the ledger's subjects are on the subject's disk and the existence check above
// passes — and that green is not evidence, it is the single arrangement in which the defect cannot
// appear. In a governed project neither suite was ever going to be there, so aof's own ledger
// reported two `audit-baseline-stale` errors at every audit, about aof's files, in somebody else's
// project: TECH_DEBT 72's species one lane over, and measured as 2 of 6 error findings over a
// fixture workspace.
//
// Re-rooting the EXISTENCE check at the toolkit root would have silenced those two and left the
// worse half standing — the ledger would still be APPLIED to the subject's suites, so a governed
// project that happened to file a `test/work/lifecycle/work-observe.test.mjs` would silently inherit aof's
// exemption for it. A permission with no subject is refused two paragraphs up; a permission
// helping itself to somebody else's subject is the same rot facing the other way.
//
// So `runCensus` applies this ledger only where it means something: when the subject IS the project
// it describes, which `ledgerApplies()` below answers. A caller that NAMES a ledger is naming its
// own and is honoured as given — being handed an argument and silently ignoring it is this module's
// own subject (a lane that looked at nothing is indistinguishable from a lane that found nothing).
export const UNREGISTERED_BASELINE = Object.freeze([
  Object.freeze({
    suite: "test/work/lifecycle/work-observe.test.mjs",
    reason: "exports no runner-shaped array — it is a `node:test` file (`import test from \"node:test\"`), so registering it is a CONVERSION rather than a one-line import, and importing it to decide its registration would EXECUTE its cases inside the deciding gate",
    origin: "m43/04 (ADR-014/E7), carried forward unchanged into 59/01",
  }),
  Object.freeze({
    suite: "test/integration/cli-child-process.test.mjs",
    reason: "a top-level-executing smoke script, not a suite module: it spawns the real CLI at MODULE SCOPE, so importing it to decide its registration would run a full CLI smoke inside the deciding gate. It is genuinely executed — `npm run test:smoke:cli` and `scripts/check.mjs` both drive it as a program — just not through the assembled array",
    origin: "59/01, the first sweep that recursed into test/integration/** (ADR-003 §2); previously outside the gate's TEST_DIRS entirely",
  }),
]);

// ── WHOSE SUITES THESE ARE, ASKED AS A QUESTION ABOUT THE SUBJECT (chore 99) ──────────────
//
// "Is the subject the aof project?" is NOT the same question as "is the subject the directory aof
// was installed into", and the difference is measurable: under a payload install the toolkit root is
// `~/.aof/bin`, which carries a copy of `src/` and no `test/` at all. So a bare subject↔toolkit
// DIRECTORY comparison drops these exemptions in exactly the case where they are legitimate — a
// deployed binary auditing aof's own repository — and reds aof's own audit for two suites that are
// on the subject's disk with their reasons intact. That is the two-roots confusion one turn further
// out, and answering the directory question instead of the project one is how it gets in.
//
// So the subject is this project when it IS the install (a checkout auditing itself, where the two
// roots are one directory) or when the subject's own manifest says so. The name is a literal because
// the ledger is a literal: it lists AOF's files, and a list of one project's files has to be able to
// say whose they are. It is read from the SUBJECT, never from the toolkit — the payload's manifest
// carries a version and no name, so the toolkit cannot identify its own source project.
export const LEDGER_PROJECT = "aof";

// The ledger's applicability, as its own named question so both answers are drivable. A subject that
// has no readable manifest and is not the install is NOT this project: an exemption is withheld on a
// doubtful answer rather than granted on one, because a wrongly-granted exemption is silent and a
// wrongly-withheld one is a finding somebody reads.
export async function ledgerApplies(repoRoot) {
  if (isToolkitRoot(repoRoot)) return true;
  try {
    const manifest = JSON.parse(await readFile(path.resolve(repoRoot, "package.json"), "utf8"));
    return manifest?.name === LEDGER_PROJECT;
  } catch {
    return false;
  }
}

// ── THE SWEEP REGISTRY — EVERY SWEEP DECLARES A FLOOR ────────────────────────────────────
//
// The floor is what makes "no findings" mean something. Each is set BELOW the measured
// population at authoring time (2026-08-29: 888 suites walked, 880 runner bindings, 7,077
// assembled entries) with headroom, because a floor that tracks the exact count fails on every
// legitimate addition and a gate that reds for an unrelated reason is a gate that gets muted.
export const CENSUS_SWEEPS = Object.freeze([
  Object.freeze({
    id: "suite-population",
    what: "every *.test.mjs on disk under the test tree, recursively — the test root, the arch tree and the integration tree",
    root: "test",
    floor: 300,
    basis: "disk",
  }),
  Object.freeze({
    id: "runner-bindings",
    // 119/03 — WHAT THIS SWEEP READS CHANGED, so what it SAYS it reads changed with it. It read
    // the runner's source; since the registry names directories it reads the whole REGISTRATION
    // SURFACE, the runner plus every directory index it spreads. A sweep whose whole job is to
    // report how much it read must not describe a narrower read than it performs — that is this
    // control's own subject, one level up. `root` stays the runner because the runner is the
    // surface's entry point: it is the file the runtime sweep below spawns, and the file from
    // which every index is reached.
    what: "the suite modules the registration surface IMPORTS and the identifiers it SPREADS, read from the runner's source and from every directory index the runner spreads",
    root: "scripts/test.mjs",
    floor: 100,
    basis: "text",
  }),
  Object.freeze({
    id: "assembled-suite",
    what: "the test names the runner ASSEMBLES, obtained from a bounded child process rather than by importing the runner into this one",
    root: "scripts/test.mjs",
    floor: 500,
    basis: "runtime",
  }),
]);

// ── EVERY SWEEP DECLARES ITS BASIS, AND A TEXT-LEVEL BASIS CARRIES ITS LIMIT ─────────────
//
// CORRECTED AT REVIEW (2026-08-29). `spreadClaimLimit()` was quoted only INTO findings, so in
// exactly the case where this lane is blind it said nothing at all. QA measured two shapes on
// the real repository, through the real child: a spread inside a BLOCK comment
// (`/* ...meshRevokeTests, */`) and a spread into a second, unexported array. Each de-armed
// seven test entries, and each produced `findings: []` with the suite listed as `registered`.
// The arch gate — the authority — catches both, so the milestone's instrument is intact; but a
// reader of the CLI's clean result was told nothing, which is this milestone's own subject
// (a lane that found nothing and a lane that could not see are indistinguishable in silence).
//
// So a clean result is not representable without its LIMITS either. `runCensus` returns them
// on every run, derived from the registry — a sweep declaring `basis: "text"` contributes one —
// so a fourth sweep cannot arrive without either declaring a basis or failing the registry check.
// `SWEEP_BASES` itself lives in `./reads.mjs` with the rest of the read-record contract and is
// re-exported above.

// The roots a runner may draw from. Named so the outline in
// `00_registration-is-membership-not-text.feature` has something to assert against, and so a
// fourth root is an edit here rather than a silent omission everywhere.
export const TEST_ROOTS = Object.freeze(["test", "test/arch", "test/integration"]);

// ── SWEEP DECLARATION: A FLOOR IS REQUIRED, NEVER DEFAULTED ──────────────────────────────

// The census's own registry, put through the ONE validator (`./reads.mjs`). The default is what
// makes this the census's refusal rather than a general one; the RULE it applies is shared with
// every other lane the audit assembles, so "declared" cannot come to mean two things.
export function assertSweepsDeclared(sweeps = CENSUS_SWEEPS) {
  const problems = sweepDeclarationProblems(sweeps);
  if (problems.length > 0) {
    throw new Error(`the census sweep registry is not declared: ${problems.join("; ")}`);
  }
  return sweeps;
}

// PURE. The limits a result carries WHATEVER it found, derived from the registry rather than
// hand-maintained: one entry per sweep whose declared `basis` is not a runtime answer. This is
// the half `spreadClaimLimit()` was missing — it was quoted only into findings, so on a CLEAN
// result, which is exactly when the reader most needs to know what the lane could not see, the
// census said nothing at all. Two shapes were measured on the real repository at review: a spread
// inside a BLOCK comment, and a spread into a second unexported array. Both de-arm a suite; both
// leave this lane's text read satisfied; both are caught by the arch gate named below.
export function sweepLimits(sweeps = CENSUS_SWEEPS) {
  return Object.freeze(sweeps
    .filter((sweep) => sweep.basis !== "runtime")
    .map((sweep) => limitRecord({
      sweep: sweep.id,
      basis: sweep.basis,
      // THE QUESTION THIS SWEEP CANNOT ANSWER, phrased as a question rather than as a claim, so the
      // face can render every lane's limits through one sentence shape (D-59-3). The claim itself
      // is already on the read record as `what` — repeating it here was the second vocabulary.
      question: sweep.basis === "text"
        ? `does a spread this sweep READ in ${sweep.root} actually reach the assembled suite?`
        : `does a file this sweep found under ${sweep.root} reach any runner?`,
      answeredBy: null,
      consequence: sweep.basis === "text"
        ? spreadClaimLimit()
        : `A DISK-level claim: it says what is present under ${sweep.root}, not what any runner does with it.`,
      authority: sweep.basis === "text" ? "test/arch/testing/acd-test-suite-registration.test.mjs" : null,
    })));
}

// ── THE REGISTRATION AUTHORITY: RUNTIME MEMBERSHIP ───────────────────────────────────────

// The limit every TEXT-LEVEL claim in this lane carries, stated once and quoted verbatim into
// each finding that rests on one (ADR-003 §4, ADR-008 §4 / TECH_DEBT items 24 and 57).
export function spreadClaimLimit() {
  return "This is a TEXT-LEVEL claim over the runner's source, not comment-stripped, and it reads a spread line-anchored. TWO SHAPES SATISFY IT WHILE DE-ARMING A SUITE, both measured on this repository at review: a spread on its own line inside a MULTI-LINE block comment, and a spread into a second array the runner never exports. The authority is `test/arch/testing/acd-test-suite-registration.test.mjs`, which decides by runtime membership inside the runner's own process and sees through both; where the two disagree, believe the gate.";
}

// PURE, and THE decider. Registration is membership of the assembled array — nothing else.
//
//   files        — every suite path on disk (repo-relative, forward slashes)
//   suiteNames   — Map<file, string[]>: the test names each file EXPORTS. Supplied by whoever
//                  can obtain them honestly; a file absent from the map was not read, and is
//                  reported as such rather than assumed clean.
//   assembled    — Set<string>: the names the runner assembled (what CI will execute)
//   baseline     — the shrink-only ledger; a listed suite is still reported UNREGISTERED, it is
//                  just not reported as a NEW failure
//   importedBy   — Set<string>: the suite paths a runner's source names at all. Used ONLY to
//                  distinguish "imported and never spread" from "no runner mentions it", which
//                  is a distinction the report owes its reader — never to decide registration.
//
// Returns `{ registered, unregistered, findings }`.
export function registrationDecision({ files, suiteNames, assembled, baseline = UNREGISTERED_BASELINE, importedBy = new Set() }) {
  const ledger = new Map(baseline.map((entry) => [entry.suite, entry]));
  const registered = [];
  const unregistered = [];
  const findings = [];

  for (const file of files) {
    const carried = ledger.get(file);
    const names = suiteNames instanceof Map ? suiteNames.get(file) : suiteNames?.[file];

    if (carried != null) {
      // Carried with its reason: still UNREGISTERED (the census never pretends otherwise),
      // just not a NEW failure. The entry's own reason is what a reader is owed.
      unregistered.push({ file, carried: true, reason: carried.reason, origin: carried.origin, missing: [] });
      continue;
    }

    if (!Array.isArray(names)) {
      unregistered.push({ file, carried: false, missing: [], unread: true });
      findings.push(Object.freeze({
        code: "audit-runtime-membership-unavailable",
        severity: "error",
        path: file,
        message: `${file}: the names this suite exports could not be read, so its registration was not decided — it is NOT reported as registered. A suite that cannot be read is either converted, or carried in the shrink-only baseline with its reason and its origin.`,
      }));
      continue;
    }

    if (names.length === 0) {
      unregistered.push({ file, carried: false, missing: [], empty: true });
      findings.push(Object.freeze({
        code: "audit-suite-unregistered",
        severity: "error",
        path: file,
        message: `${file} exports no runner-shaped test entries, so there is nothing for the assembled suite to contain — it is green, red or deleted with identical effect on CI. Convert it, or carry it in the shrink-only baseline with its reason and its origin.`,
      }));
      continue;
    }

    const missing = names.filter((name) => !assembled.has(name));
    if (missing.length === 0) {
      registered.push(file);
      continue;
    }

    unregistered.push({ file, carried: false, missing });
    const mentioned = importedBy.has(file);
    findings.push(Object.freeze({
      code: mentioned ? "audit-suite-imported-never-spread" : "audit-suite-unregistered",
      severity: "error",
      path: file,
      message: mentioned
        ? `${file} is IMPORTED by a runner and ${missing.length === names.length ? "none" : `${missing.length} of ${names.length}`} of the tests it exports reach the assembled suite — the binding is imported and never spread, so the file looks registered and executes nothing. First missing: "${missing[0]}". Spread it into the exported \`tests\` array, or carry it in the shrink-only baseline with its reason and its origin.`
        : `${file} is registered by no runner — ${missing.length} of the ${names.length} tests it exports are absent from the assembled suite, so it is green, red or deleted with identical effect on CI. First missing: "${missing[0]}". Register it, or carry it in the shrink-only baseline with its reason and its origin.`,
    }));
  }

  return { registered, unregistered, findings };
}

// PURE. The ledger's own self-check: an entry naming a suite that is not on disk, and an entry
// carried without a reason or without an origin. Both are refusals, not warnings — a permission
// with no subject and a permission with no justification are the two ways a shrink-only list
// rots into a licence.
export function baselineProblems(baseline, files) {
  const onDisk = new Set(files);
  const findings = [];
  for (const entry of baseline) {
    if (typeof entry?.suite !== "string" || entry.suite.length === 0) {
      findings.push(Object.freeze({
        code: "audit-baseline-unreasoned",
        severity: "error",
        path: "src/work-audit/census.mjs",
        message: "a baseline entry names no suite — an exemption that names no subject exempts everything",
      }));
      continue;
    }
    const missing = ["reason", "origin"].filter((key) => typeof entry[key] !== "string" || entry[key].trim().length === 0);
    if (missing.length > 0) {
      findings.push(Object.freeze({
        code: "audit-baseline-unreasoned",
        severity: "error",
        path: entry.suite,
        message: `${entry.suite} is carried in the shrink-only baseline with no ${missing.join(" and no ")} — recording a suite here is a visible edit somebody has to justify, not a number quietly ticking. Every entry names WHY it is carried and WHERE it came from.`,
      }));
    }
    if (!onDisk.has(entry.suite)) {
      findings.push(Object.freeze({
        code: "audit-baseline-stale",
        severity: "error",
        path: entry.suite,
        message: `the shrink-only baseline names ${entry.suite}, which is not on disk — the ratchet would be guarding a number that is not true. Remove the entry: a permission with no subject is refused rather than kept.`,
      }));
    }
  }
  return findings;
}

// ── THE STATIC READS ─────────────────────────────────────────────────────────────────────

// Walk a directory for `*.test.mjs`, recursively, returning repo-relative forward-slash paths.
// Recursive is the point: the retired gate's `TEST_DIRS` was flat, which put `test/integration/**`
// outside registration entirely (56, and ADR-003 §2's third clause).
export async function walkSuiteFiles(repoRoot, root = "test") {
  const out = [];
  async function walk(rel) {
    let entries;
    try {
      entries = await readdir(path.join(repoRoot, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) await walk(child);
      else if (entry.name.endsWith(".test.mjs")) out.push(child);
    }
  }
  await walk(root.replaceAll("\\", "/"));
  return out.sort();
}

// PURE. The suite modules a runner's source NAMES, as repo-relative paths. A text-level read,
// and it is used for exactly one thing: telling "imported and never spread" apart from "no
// runner mentions it" in the REPORT. It never decides registration.
export function runnerImportedSuites(source, runnerRel = "scripts/test.mjs") {
  const base = path.posix.dirname(runnerRel.replaceAll("\\", "/"));
  const out = new Set();
  for (const match of String(source).matchAll(/from\s+"([^"]+\.test\.mjs)"/gu)) {
    out.add(path.posix.normalize(path.posix.join(base, match[1])));
  }
  return out;
}

// ── THE REGISTRATION SURFACE — every file that can register a suite ──────────────────────
//
// Until 119/03 that was one file: `scripts/test.mjs` imported and spread every suite, so the
// text-level lane below read the runner and was complete. The registry names DIRECTORIES now,
// and each directory's `index.mjs` names its own members, so registration is TRANSITIVE — the
// runner spreads the index, the index spreads the suite. A lane still reading only the runner
// reads a file that names no suite at all, and reports a population of zero as a clean sweep.
//
// IT IS AN INPUT, NOT A SECOND DECIDER (ADR-010 §3). `registrationDecision` below remains the
// single answer to "which file contributed which entries"; this reader produces the text that
// answer is derived from, exactly as reading the runner did.

// THIS FILE CARRIES NO BLOCK COMMENT, AND THAT IS LOAD-BEARING (TECH_DEBT items 24 and 57).
// `CENSUS_SWEEPS`'s `what:` string above contains the literal `test/integration/**`, and the
// hand-rolled comment strippers that 154 controls each carry a copy of are string-blind: to them
// that `/**` OPENS a block comment. Today it never closes, so those strippers delete nothing and
// every `src/` sweep reads this file whole. Add one `*/` anywhere below it — a JSDoc, a licence
// banner — and the phantom block closes there instead, silently deleting every line between,
// `registrationDecision` among them. Measured: a two-line JSDoc here blinded four milestone-48
// whole-`src/` absence sweeps at once, and each reported the blinding rather than a false pass,
// which is the only reason it was caught. Use `//` here until the stripper has one string-aware
// home.
//
// Every index.mjs beneath `root`, as `{ rel, dir, source }` — repo-relative, POSIX-spelled.
export async function readRegistrationIndexes(repoRoot, root = "test") {
  const found = [];
  const walk = async (rel) => {
    let entries;
    try {
      entries = await readdir(path.resolve(repoRoot, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) { await walk(`${rel}/${entry.name}`); continue; }
      if (entry.name !== "index.mjs") continue;
      found.push({ rel: `${rel}/index.mjs`, dir: rel, source: await readFile(path.resolve(repoRoot, rel, "index.mjs"), "utf8") });
    }
  };
  await walk(root.replaceAll("\\", "/"));
  return found;
}

// The runner plus every index, each as `{ rel, source }`. `rel` is what a specifier in that source
// resolves against — which is why this is a LIST and not one joined string: the runner spells
// `../test/x/index.mjs` from `scripts/`, and an index spells `./x.test.mjs` from its own directory.
// Joining them would make every index's specifier resolve from the wrong place.
export async function registrationSources(repoRoot, { runner = "scripts/test.mjs", root = "test" } = {}) {
  let runnerSource = "";
  try {
    runnerSource = await readFile(path.resolve(repoRoot, runner), "utf8");
  } catch {
    runnerSource = "";
  }
  const indexes = await readRegistrationIndexes(repoRoot, root);
  return [{ rel: runner.replaceAll("\\", "/"), source: runnerSource }, ...indexes.map(({ rel, source }) => ({ rel, source }))];
}

// PURE. Every binding a runner imports from a suite module, paired with the suite it names.
// `import { archTests as acdFooTests } from "../test/arch/acd-foo.test.mjs";` → the binding is
// what a spread would have to name, and the suite is what the finding has to report.
export function runnerBindings(source, runnerRel = "scripts/test.mjs") {
  const base = path.posix.dirname(runnerRel.replaceAll("\\", "/"));
  const out = [];
  for (const match of String(source).matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+\.test\.mjs)";/gu)) {
    const suite = path.posix.normalize(path.posix.join(base, match[2]));
    for (const clause of match[1].split(",")) {
      const text = clause.trim();
      if (text.length === 0) continue;
      const binding = text.includes(" as ") ? text.split(" as ")[1].trim() : text;
      if (binding.length > 0) out.push({ binding, suite });
    }
  }
  return out;
}

// PURE. The identifiers a runner SPREADS, read line-anchored so a spread must be the whole
// statement — which is exactly why this is a text-level claim and not the authority: the
// anchor survives a `// ...someTests,` line comment and does NOT survive a block comment, and
// this lane does not add a hundred-and-twenty-fourth hand-rolled stripper to close that gap
// (TECH_DEBT 24 and 57). `spreadClaimLimit()` is quoted into every finding that rests on it.
export function runnerSpreadNames(source) {
  const out = new Set();
  for (const match of String(source).matchAll(/^[ \t]*\.\.\.([A-Za-z_$][\w$]*)[ \t]*,?[ \t]*$/gmu)) {
    out.add(match[1]);
  }
  return out;
}

// ── THE RUNTIME READ, THROUGH THE ONE SEAM ───────────────────────────────────────────────

// THE PROGRAM THIS LANE SPAWNS, named once. It is one of aof's own — it travels with the payload
// and is resolved against the toolkit root, never against the workspace under audit.
export const PROBE_PROGRAM = "src/work/audit-probe.mjs";

// Ask a child process what the runner assembled. NEVER `import(runner)` from here: that
// evaluates 880 test modules inside the aof process, which is 66/ADR-004 §2's refusal exactly.
//
// `spawn` is injected so the truncated-read path is drivable without breaking a real runner.
export async function assembledSuite({ repoRoot, runner = "scripts/test.mjs", deadlineMs = DEFAULT_DEADLINE_MS, spawn = runBounded, execPath = process.execPath } = {}) {
  // TWO ROOTS, NAMED APART (77/ADR-002 §1). The PROBE is one of aof's own programs and comes from
  // the toolkit root — where aof was installed. The RUNNER is the subject and stays resolved
  // against `repoRoot`, as does the child's working directory. Until 77/04 the probe was joined
  // onto `repoRoot` too, which resolves only in this repository, where the audited workspace IS the
  // aof checkout; anywhere else it named a file that was never going to be there (TECH_DEBT 72).
  const probe = toolkitProgram(PROBE_PROGRAM);
  const target = path.resolve(repoRoot, runner);
  const result = await spawn({ command: execPath, args: [probe, target], cwd: repoRoot, deadlineMs });

  if (result.outcome !== "exited" || result.exitCode !== 0) {
    return Object.freeze({
      ok: false,
      names: [],
      result,
      error: result.outcome === "deadline-expired"
        ? `the runner's assembled suite was not obtained: ${result.attempted} did not finish within its ${result.deadlineMs}ms deadline and was killed`
        : result.outcome === "not-started"
          ? `the runner's assembled suite was not obtained: ${result.error}`
          : `the runner's assembled suite was not obtained: ${result.attempted} exited ${result.exitCode}${result.stderr ? ` — ${result.stderr.trim().split("\n").slice(-3).join(" | ")}` : ""}`,
    });
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout.trim().split("\n").filter(Boolean).at(-1) ?? "");
  } catch (error) {
    return Object.freeze({
      ok: false,
      names: [],
      result,
      error: `the runner's assembled suite was not obtained: the child's answer did not parse (${error?.message ?? String(error)}) — a partial read is reported, never treated as an empty suite`,
    });
  }
  if (payload?.ok !== true || !Array.isArray(payload.names)) {
    return Object.freeze({ ok: false, names: [], result, error: `the runner's assembled suite was not obtained: ${payload?.error ?? "the child reported no names"}` });
  }
  return Object.freeze({ ok: true, names: payload.names, result, error: null });
}

// ── THE LANE ─────────────────────────────────────────────────────────────────────────────

// Run the census. Returns `{ findings, reads }` — and `reads` is present and complete whether
// or not `findings` is empty, because "a clean sweep still says how much it read".
export async function runCensus({
  repoRoot,
  runner = "scripts/test.mjs",
  sweeps = CENSUS_SWEEPS,
  baseline = null,
  deadlineMs = DEFAULT_DEADLINE_MS,
  spawn = runBounded,
  execPath = process.execPath,
} = {}) {
  assertSweepsDeclared(sweeps);
  // THE LEDGER THAT APPLIES HERE (chore 99). A caller that NAMED one is naming its own and gets
  // it back unchanged. Where none was named, aof's own applies to aof's own workspace and to no
  // other: `UNREGISTERED_BASELINE` exempts suites of THIS PROJECT, and asserting them against a
  // governed project's disk reds that project's audit for aof's reasons (TECH_DEBT 72's species).
  const carriedLedger = baseline ?? ((await ledgerApplies(repoRoot)) ? UNREGISTERED_BASELINE : []);
  const bySweep = new Map(sweeps.map((sweep) => [sweep.id, sweep]));
  const findings = [];
  const reads = [];

  const record = (id, count) => {
    const sweep = bySweep.get(id);
    if (sweep == null) return null;
    const read = readRecord(sweep, count);
    reads.push(read);
    const finding = readFinding(read);
    if (finding != null) findings.push(finding);
    return read;
  };

  // Sweep 1 — the population on disk.
  const files = await walkSuiteFiles(repoRoot, bySweep.get("suite-population")?.root ?? "test");
  const populationRead = record("suite-population", files.length);

  // Sweep 2 — the text-level bindings of the whole REGISTRATION SURFACE (119/ADR-010): the
  // runner, plus every directory index it spreads. Each source's specifiers are resolved
  // against that source's own directory, which is the whole reason this is a list.
  const surfaces = await registrationSources(repoRoot, { runner, root: bySweep.get("suite-population")?.root ?? "test" });
  const imported = new Set();
  for (const surface of surfaces) {
    for (const suite of runnerImportedSuites(surface.source, surface.rel)) imported.add(suite);
  }
  record("runner-bindings", imported.size);

  // Sweep 3 — what the runner ASSEMBLED, from a child process.
  const assembled = await assembledSuite({ repoRoot, runner, deadlineMs, spawn, execPath });
  record("assembled-suite", assembled.names.length);

  findings.push(...baselineProblems(carriedLedger, files));

  if (!assembled.ok) {
    // The truncated read. Registration is NOT reported clean over what could not be seen —
    // this is the one finding that must exist for silence to stop being ambiguous.
    findings.push(Object.freeze({
      code: "audit-runtime-membership-unavailable",
      severity: "error",
      path: runner,
      message: `${assembled.error} — ${populationRead?.count ?? 0} suites were walked and registration was decided for NONE of them. Registration is not reported clean over a suite this sweep could not see.`,
    }));
    return Object.freeze({ findings: Object.freeze(findings), reads: Object.freeze(reads), limits: sweepLimits(sweeps), registered: Object.freeze([]), unregistered: Object.freeze([]), assembledNames: Object.freeze([]) });
  }

  // The text-level half, stated as such (ADR-003 §4). The census does not import a suite
  // module to learn the names it exports — that is the arch gate's job, running inside the
  // runner's own process where every module is already loaded.
  const assembledNames = new Set(assembled.names);
  const ledger = new Set(carriedLedger.map((entry) => entry.suite));

  // (a) a suite on disk that no runner names at all
  const unmentioned = files.filter((file) => !imported.has(file) && !ledger.has(file));
  for (const file of unmentioned) {
    findings.push(Object.freeze({
      code: "audit-suite-unregistered",
      severity: "error",
      path: file,
      message: `${file} is named by no runner at all, so nothing can import it and nothing can assemble it — it is green, red or deleted with identical effect on CI. ${spreadClaimLimit()}`,
    }));
  }

  // (b) a binding named and never spread — the shape that hid twenty-six suites for a month.
  // Asked of EVERY registering source, not just the runner (119/ADR-010): since the registry
  // names directories, an import-with-no-spread now hides inside a directory's own index, which
  // is precisely where this lane would stop looking if it kept reading one file.
  const neverSpread = [];
  for (const surface of surfaces) {
    const spread = runnerSpreadNames(surface.source);
    for (const entry of runnerBindings(surface.source, surface.rel)) {
      if (spread.has(entry.binding) || ledger.has(entry.suite)) continue;
      neverSpread.push(entry);
      findings.push(Object.freeze({
        code: "audit-suite-imported-never-spread",
        severity: "error",
        path: entry.suite,
        message: `${surface.rel} imports \`${entry.binding}\` from ${entry.suite} and never spreads it into what it assembles — the file looks registered and executes nothing. ${spreadClaimLimit()}`,
      }));
    }
  }

  const notRegistered = new Set([...unmentioned, ...neverSpread.map((entry) => entry.suite), ...ledger]);
  const carried = new Map(carriedLedger.map((entry) => [entry.suite, entry]));
  // ONE SHAPE FOR ONE KEY. `registrationDecision` returns `unregistered` as rows carrying
  // `.file`; this returned strings under the same key in the same module, so a consumer reading
  // `row.file` off a census result got `undefined` (raised at review — 59/04 is that consumer).
  const unregistered = [...notRegistered].sort().map((file) => Object.freeze({
    file,
    carried: carried.has(file),
    reason: carried.get(file)?.reason ?? null,
    origin: carried.get(file)?.origin ?? null,
  }));
  return Object.freeze({
    findings: Object.freeze(findings),
    reads: Object.freeze(reads),
    limits: sweepLimits(sweeps),
    registered: Object.freeze(files.filter((file) => !notRegistered.has(file))),
    unregistered: Object.freeze(unregistered),
    assembledNames: Object.freeze([...assembledNames]),
  });
}