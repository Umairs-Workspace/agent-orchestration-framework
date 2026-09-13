// Traceability wiring for milestone 59 / story 01 — the instrument census.
//
// Covers every @executable scenario in three task features:
//   · tasks/00_registration-is-membership-not-text.feature
//   · tasks/01_the-de-armed-suites-are-re-armed.feature
//   · tasks/02_the-census-reports-what-it-read.feature
//
// TWO KINDS OF LANE, deliberately, and the difference is the story's own thesis.
//
// The RULE lanes drive `registrationDecision()` — the pure decider in
// `src/work-audit/census.mjs` — over SYNTHETIC populations, because the rule has to be
// demonstrable on a tree where the answer is known in advance. That is where the retired
// source-text rule is reconstructed and the two are made to disagree on the same suite.
//
// The MEASUREMENT lanes drive the REAL tree and the REAL assembled array, because a rule
// nobody applied is the same species of nothing as a gate nobody ran. They resolve
// `scripts/test.mjs` by a LAZY dynamic import inside `run()`: the runner imports this file, so
// an eager import would read `tests` before the array literal finishes evaluating — the same
// cycle `acd-roundtrip-registration` documents at its head.
//
// The census's own child process is exercised for real ONCE (in
// `test/audit/audit-spawn-bounded.test.mjs`, where the seam is the subject). Everywhere else the
// spawn is INJECTED, because the property under test is what the census does with an answer,
// not how it got one — and a lane that re-imports 880 modules to re-prove the seam is a lane
// that will be deleted for being slow.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  AUDIT_FINDING_CODES,
  CENSUS_SWEEPS,
  SWEEP_BASES,
  TEST_ROOTS,
  UNREGISTERED_BASELINE,
  assertSweepsDeclared,
  baselineProblems,
  readFinding,
  readRecord,
  registrationDecision,
  registrationSources,
  runCensus,
  runnerBindings,
  runnerImportedSuites,
  runnerSpreadNames,
  sweepDeclarationProblems,
  sweepLimits,
  walkSuiteFiles,
} from "../../src/work-audit/census.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const runnerUrl = new URL("../../scripts/test.mjs", import.meta.url).href;

// ── THE RETIRED RULE, RECONSTRUCTED ──────────────────────────────────────────────────────
//
// `acd-test-suite-registration:151` decided registration with
// `!runners.includes(path.basename(rel))` — a substring search over the runner's source text.
// It is reconstructed HERE, and only here, so the third scenario of task 00 can apply both
// rules to the same suite and watch them disagree. It is evidence, never an instrument this
// suite reasons with; nothing else in this file calls it, and the shipped decider takes no
// runner text at all — it cannot fall back to this even by accident.
function retiredSourceTextRule(runnerText, suiteRel) {
  return String(runnerText).includes(path.posix.basename(suiteRel));
}

// A spawn stub in the seam's own result shape. The census reads `outcome`, `exitCode` and
// `stdout`; giving it the whole envelope keeps the stub honest about what a real result
// carries, so a lane cannot pass against a shape the seam never produces.
function spawnAnswering(names, override = {}) {
  return async ({ deadlineMs = 1000 } = {}) => Object.freeze({
    outcome: "exited",
    command: "node",
    args: ["src/work/audit-probe.mjs", "scripts/test.mjs"],
    attempted: "node src/work/audit-probe.mjs scripts/test.mjs",
    deadlineMs,
    exitCode: 0,
    signal: null,
    stdout: `${JSON.stringify({ ok: true, runner: "synthetic", names, count: names.length })}\n`,
    stderr: "",
    error: null,
    ...override,
  });
}

// A whole fixture repository: suites on disk, and a runner that imports and spreads exactly
// what it is told to. Everything the census reads statically is real; only the child is stubbed.
async function fixtureRepo({ suites = [], imports = [], spreads = [], commentedSpreads = [] } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-census-"));
  for (const [rel, names] of suites) {
    await mkdir(path.join(root, path.dirname(rel)), { recursive: true });
    await writeFile(
      path.join(root, rel),
      `export const suiteTests = ${JSON.stringify(names.map((name) => ({ name })))}.map((e) => ({ name: e.name, run: () => {} }));\n`,
      "utf8",
    );
  }
  await mkdir(path.join(root, "scripts"), { recursive: true });
  const lines = [
    ...imports.map(([binding, rel]) => `import { suiteTests as ${binding} } from "../${rel}";`),
    "",
    "export const tests = [",
    ...spreads.map((binding) => `  ...${binding},`),
    ...commentedSpreads.map((binding) => `  // ...${binding},`),
    "];",
    "",
  ];
  await writeFile(path.join(root, "scripts", "test.mjs"), lines.join("\n"), "utf8");
  return root;
}

const LOW_FLOORS = Object.freeze([
  Object.freeze({ id: "suite-population", what: "the fixture's suites", root: "test", floor: 1, basis: "disk" }),
  Object.freeze({ id: "runner-bindings", what: "the fixture runner's imports", root: "scripts/test.mjs", floor: 1, basis: "text" }),
  Object.freeze({ id: "assembled-suite", what: "the fixture runner's assembled names", root: "scripts/test.mjs", floor: 1, basis: "runtime" }),
]);

// ── THE TWENTY-SIX ───────────────────────────────────────────────────────────────────────
//
// Every suite `scripts/test.mjs` imported and never spread, measured at HEAD on 2026-08-29
// and unchanged from 56's own two independent counts. Named rather than counted, because a
// count is what let this survive for a month: the number 26 says nothing about WHICH, and the
// re-arming has to be checkable suite by suite.
const THE_TWENTY_SIX = Object.freeze([
  "test/mesh/identity/mesh-node-identity.test.mjs",
  "test/mesh/identity/mesh-identity-status-commands.test.mjs",
  "test/mesh/identity/mesh-identity-cli-face.test.mjs",
  "test/mesh/presence/mesh-presence-record.test.mjs",
  "test/mesh/identity/mesh-node-staleness-status.test.mjs",
  "test/arch/mesh/acd-presence-write-scope.test.mjs",
  "test/arch/mesh/acd-mesh-eol-pinned.test.mjs",
  "test/mesh/relay/mesh-relay-broker-fanout.test.mjs",
  "test/mesh/relay/mesh-relay-envelope-resilience.test.mjs",
  "test/mesh/relay/mesh-relay-control-node.test.mjs",
  "test/mesh/presence/mesh-presence-degradation-loop.test.mjs",
  "test/arch/mesh/acd-enrollment-code-hashed-at-rest.test.mjs",
  "test/arch/mesh/acd-enrollment-code-single-use-constant-time.test.mjs",
  "test/arch/command/acd-registry-write-scope.test.mjs",
  "test/arch/mesh/acd-enroll-endpoint-http-not-ws.test.mjs",
  "test/arch/mesh/acd-enroll-git-argv-no-shell.test.mjs",
  "test/mesh/registry/mesh-registry-store-seam.test.mjs",
  "test/mesh/registry/mesh-registry-aggregate-mutations.test.mjs",
  "test/mesh/registry/mesh-registry-pending-lifecycle.test.mjs",
  "test/mesh/relay/mesh-relay-auth-gate.test.mjs",
  "test/mesh/enrollment/mesh-revoke.test.mjs",
  "test/run/run-node-partition.test.mjs",
  "test/arch/run/acd-run-node-path-single-builder.test.mjs",
  "test/arch/bundle/acd-runs-eol-pinned.test.mjs",
  "test/arch/ui/acd-fleet-reclaim-guarded.test.mjs",
  "test/mesh/identity/mesh-candidacy-every-return.test.mjs",
]);

// The second population the new instrument found on its first run: suites registered in
// `scripts/test-unit.mjs` alone, so `npm test` — what CI executes — never assembled them.
// 66/ADR-004 §(c) measured ONE of these as a curiosity; there are six.
const THE_FAST_LANE_SIX = Object.freeze([
  "test/work/work.test.mjs",
  "test/work/lifecycle/work-resolve.test.mjs",
  "test/work/gate/work-validate.test.mjs",
  "test/work/lifecycle/work-next.test.mjs",
  "test/bundle/opencode-hooks.test.mjs",
  "test/arch/work/work-content-free-discovery.test.mjs",
]);

// The assembled suite's size at HEAD BEFORE this story, measured 2026-08-29 by importing the
// runner and counting `tests`. The "before" half of "the re-arming is visible in what CI
// executes": the later suite may not be smaller, and it must additionally contain the entries
// the de-armed suites export.
const ASSEMBLED_BEFORE_THIS_STORY = 7077;

async function exportedNames(rel) {
  const module = await import(pathToFileURL(path.join(repoRoot, rel)).href);
  const arrays = Object.values(module).filter((value) => Array.isArray(value) && value.every((entry) => entry != null && typeof entry.name === "string" && typeof entry.run === "function"));
  return arrays.flat().map((entry) => entry.name);
}

export const instrumentCensusTests = [
  // ══ 00 · Scenario: a suite whose tests are in the assembled suite is registered ═══════
  // ══ 00 · Scenario: a suite that is imported and never spread is not registered ═══════
  // ══ 00 · Scenario: a suite no runner mentions at all is unregistered ═════════════════
  {
    name: "instrument-census/00 registration is membership of the assembled suite: a spread suite is registered, an imported-never-spread suite is not and is NAMED, and a suite no runner mentions is not",
    async run() {
      const files = ["test/spread.test.mjs", "test/imported-only.test.mjs", "test/orphan.test.mjs"];
      const suiteNames = new Map([
        ["test/spread.test.mjs", ["spread/one", "spread/two"]],
        ["test/imported-only.test.mjs", ["dark/one", "dark/two"]],
        ["test/orphan.test.mjs", ["orphan/one"]],
      ]);
      const assembled = new Set(["spread/one", "spread/two", "unrelated/x"]);
      const importedBy = new Set(["test/spread.test.mjs", "test/imported-only.test.mjs"]);

      const decided = registrationDecision({ files, suiteNames, assembled, baseline: [], importedBy });

      assert.deepEqual(decided.registered, ["test/spread.test.mjs"], "the suite whose tests the runner assembles is REGISTERED");
      assert.deepEqual(
        decided.unregistered.map((entry) => entry.file).sort(),
        ["test/imported-only.test.mjs", "test/orphan.test.mjs"],
        "and the other two are not",
      );

      const dark = decided.findings.find((finding) => finding.path === "test/imported-only.test.mjs");
      assert.ok(dark != null, "the imported-never-spread suite produced a finding");
      assert.equal(dark.code, "audit-suite-imported-never-spread", "with the code that says what happened to it");
      assert.ok(dark.message.includes("test/imported-only.test.mjs"), "IT IS NAMED — the report says which one");
      assert.ok(dark.message.includes("dark/one"), "and names a test that never reaches CI, so the claim is checkable");

      const orphan = decided.findings.find((finding) => finding.path === "test/orphan.test.mjs");
      assert.equal(orphan.code, "audit-suite-unregistered", "a suite no runner mentions gets the OTHER code");
      assert.notEqual(orphan.code, dark.code, "and the report therefore distinguishes the two — a suite that went dark is not the same finding as one that was never wired in");
      for (const finding of decided.findings) assert.ok(AUDIT_FINDING_CODES.includes(finding.code), `${finding.code} is in the frozen code set`);
    },
  },

  // ══ 00 · Scenario: the same suite is registered by the source-text rule and unregistered by this one ══
  {
    name: "instrument-census/00 the retired source-text rule and the assembled-suite rule DISAGREE on the same suite, and the assembled-suite rule is the one that decides",
    async run() {
      const suite = "test/imported-only.test.mjs";
      // A runner that imports the suite and never spreads it — the exact shape that hid
      // twenty-six suites for a month.
      const runnerText = [
        'import { suiteTests as darkTests } from "../test/imported-only.test.mjs";',
        "export const tests = [",
        "  ...otherTests,",
        "];",
      ].join("\n");

      assert.equal(retiredSourceTextRule(runnerText, suite), true, "THE RETIRED RULE: the basename appears in the runner's text, so it reports the suite as REGISTERED");

      const decided = registrationDecision({
        files: [suite],
        suiteNames: new Map([[suite, ["dark/one"]]]),
        assembled: new Set(["other/one"]),
        baseline: [],
        importedBy: new Set([suite]),
      });
      assert.deepEqual(decided.registered, [], "THE ASSEMBLED-SUITE RULE: it is UNREGISTERED");
      assert.equal(decided.findings[0].code, "audit-suite-imported-never-spread", "and it says so with a finding");

      // And the deciding rule cannot be satisfied by text at all: it is never handed any.
      // A rule that took the runner's source could be blinded by a comment; this one has no
      // source to be blinded in.
      assert.throws(
        () => registrationDecision({ files: [suite], suiteNames: new Map([[suite, ["dark/one"]]]), assembled: undefined, baseline: [], importedBy: new Set() }),
        "the decider requires the assembled name set — there is no code path that reaches a verdict without it",
      );
    },
  },

  // ══ 00 · Scenario: a spread that exists only inside a comment does not register anything ══
  {
    name: "instrument-census/00 a spread that exists only inside a comment registers nothing — the census reads the assembled array, and a commented spread contributes no member to it",
    async run() {
      const root = await fixtureRepo({
        suites: [["test/dark.test.mjs", ["dark/one"]], ["test/live.test.mjs", ["live/one"]]],
        imports: [["darkTests", "test/dark.test.mjs"], ["liveTests", "test/live.test.mjs"]],
        spreads: ["liveTests"],
        commentedSpreads: ["darkTests"],
      });
      try {
        // The runner's TEXT contains `...darkTests,` — inside a comment. The assembled array
        // contains only what the live spread contributed.
        const source = await import("node:fs/promises").then((fs) => fs.readFile(path.join(root, "scripts", "test.mjs"), "utf8"));
        assert.ok(source.includes("...darkTests,"), "the runner's source text really does contain the spread (inside a comment) — otherwise this lane proves nothing");
        assert.equal(retiredSourceTextRule(source, "test/dark.test.mjs"), true, "and the retired rule is satisfied by it");
        assert.ok(!runnerSpreadNames(source).has("darkTests"), "the line-anchored spread read does not count a commented spread");

        const result = await runCensus({
          repoRoot: root,
          sweeps: LOW_FLOORS,
          baseline: [],
          spawn: spawnAnswering(["live/one"]),
        });
        assert.ok(result.unregistered.some((row) => row.file === "test/dark.test.mjs"), "the suite whose only spread is a comment is UNREGISTERED");
        assert.ok(result.registered.includes("test/live.test.mjs"), "and the one genuinely spread is registered");
        const finding = result.findings.find((entry) => entry.path === "test/dark.test.mjs");
        assert.equal(finding.code, "audit-suite-imported-never-spread", "reported by name, with the code for a binding that never reached the array");
        assert.match(finding.message, /TEXT-LEVEL claim/u, "and the census states the limit of its own static claim rather than overstating it (ADR-003 §4)");
        assert.match(finding.message, /acd-test-suite-registration/u, "naming the gate that is the authority where the two could disagree");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ 00 · Scenario Outline: every directory a runner may draw from is walked ══════════
  {
    name: "instrument-census/00 the census walks every directory a runner may draw from — the test root, the arch tree and the integration tree are each part of the population it considered",
    async run() {
      const files = await walkSuiteFiles(repoRoot, "test");
      assert.ok(files.length > 300, `the walk is non-vacuous: ${files.length} suites`);

      const rows = [
        // 119/03 — the test root is FULLY PARTITIONED: it holds 0 direct suites, because every
        // one of them moved into a subject directory beneath it. The population this row is about
        // is unchanged (those same suites), so the predicate names them where they now live —
        // the test tree outside the two roots the other rows already cover. Keeping `depth === 2`
        // would have made this row measure an empty set and call it a walk.
        ["the test root", (rel) => rel.startsWith("test/") && !rel.startsWith("test/arch/") && !rel.startsWith("test/integration/")],
        ["the arch tree", (rel) => rel.startsWith("test/arch/")],
        ["the integration tree", (rel) => rel.startsWith("test/integration/")],
      ];
      for (const [label, matches] of rows) {
        const found = files.filter(matches);
        assert.ok(found.length > 0, `${label}: at least one suite on disk there is part of the population the census considered`);
      }
      // The integration tree is the one the retired gate never saw: its TEST_DIRS was flat, so
      // `test/integration/**` sat outside registration entirely (56; ADR-003 §2).
      assert.ok(files.some((rel) => rel.startsWith("test/integration/")), "the integration tree in particular — the root the retired flat walk could not reach");
      assert.deepEqual([...TEST_ROOTS], ["test", "test/arch", "test/integration"], "and the roots a runner may draw from are declared in one place rather than implied by a walk");
    },
  },

  // ══ 00 · Scenario: a suite that is deliberately unregistered is carried with its reason ══
  // ══ 01 · Scenario: a re-armed suite that cannot be repaired is carried with its reason ══
  {
    name: "instrument-census/00 a suite carried in the shrink-only baseline is not a NEW failure and is still reported unregistered, its entry names why, and an entry with no reason is refused",
    async run() {
      const suite = "test/carried.test.mjs";
      const baseline = [{ suite, reason: "a node:test file — registering it is a conversion", origin: "m43/04" }];
      const decided = registrationDecision({
        files: [suite],
        suiteNames: new Map([[suite, ["carried/one"]]]),
        assembled: new Set(),
        baseline,
        importedBy: new Set(),
      });
      assert.deepEqual(decided.findings, [], "it is NOT reported as a new failure");
      assert.deepEqual(decided.registered, [], "and it is still not registered");
      const entry = decided.unregistered.find((row) => row.file === suite);
      assert.equal(entry.carried, true, "it is still REPORTED as unregistered, carried");
      assert.equal(entry.reason, baseline[0].reason, "and the entry names WHY it is carried");
      assert.equal(entry.origin, "m43/04", "and where it came from");

      // An entry without a reason is refused — recording a suite here is a visible edit
      // somebody has to justify, not a number quietly ticking.
      const unreasoned = baselineProblems([{ suite, origin: "somewhere" }], [suite]);
      assert.equal(unreasoned.length, 1, "an entry with no reason produces exactly one problem");
      assert.equal(unreasoned[0].code, "audit-baseline-unreasoned");
      assert.match(unreasoned[0].message, /no reason/u, "and the refusal says what is missing");
      assert.equal(baselineProblems([{ suite, reason: "r" }], [suite])[0].code, "audit-baseline-unreasoned", "an entry with no origin is refused too");
      assert.deepEqual(baselineProblems([{ suite, reason: "r", origin: "o" }], [suite]), [], "a complete entry is accepted");

      // The shipped baseline itself obeys its own rule.
      for (const shipped of UNREGISTERED_BASELINE) {
        assert.ok(shipped.reason.length > 20, `${shipped.suite} carries a real reason, not a placeholder`);
        assert.ok(shipped.origin.length > 5, `${shipped.suite} names its origin`);
      }
    },
  },

  // ══ 00 · Scenario: the baseline may only shrink ═════════════════════════════════════
  {
    name: "instrument-census/00 an unregistered suite that is not in the shrink-only baseline FAILS the census rather than being absorbed, and the message says the list is shrink-only and what would have to change",
    async run() {
      const suite = "test/newly-dark.test.mjs";
      const decided = registrationDecision({
        files: [suite],
        suiteNames: new Map([[suite, ["dark/one"]]]),
        assembled: new Set(["something/else"]),
        baseline: UNREGISTERED_BASELINE,
        importedBy: new Set([suite]),
      });
      assert.equal(decided.findings.length, 1, "the census FAILS rather than absorbing it — the count does not quietly tick up");
      const finding = decided.findings[0];
      assert.equal(finding.severity, "error", "and it fails as an error, not a note");
      assert.match(finding.message, /shrink-only baseline/u, "the message says the list is SHRINK-ONLY");
      assert.match(finding.message, /with its reason and its origin/u, "and says what would have to change for the suite to be carried");
      assert.match(finding.message, /Spread it into the exported `tests` array/u, "…or what would have to change for it to be registered instead");
    },
  },

  // ══ 00 · Scenario: a baseline entry naming a suite that no longer exists is itself a failure ══
  {
    name: "instrument-census/00 a baseline entry naming a suite that is not on disk is reported by name — a permission with no subject is refused rather than kept",
    async run() {
      const ghost = { suite: "test/deleted-long-ago.test.mjs", reason: "was a node:test file", origin: "m43/04" };
      const problems = baselineProblems([ghost], ["test/still-here.test.mjs"]);
      assert.equal(problems.length, 1, "exactly one problem for one stale entry");
      assert.equal(problems[0].code, "audit-baseline-stale");
      assert.ok(problems[0].message.includes(ghost.suite), "THE STALE ENTRY IS REPORTED BY NAME");
      assert.match(problems[0].message, /permission with no subject is refused rather than kept/u, "and the refusal says why keeping it is worse than removing it");

      // The shipped baseline is not stale: every entry it carries is a file on disk.
      const files = await walkSuiteFiles(repoRoot, "test");
      assert.ok(files.length > 300, `the tree was actually walked before this claim (${files.length} suites)`);
      assert.deepEqual(baselineProblems(UNREGISTERED_BASELINE, files), [], "the shipped shrink-only baseline names only suites that exist and carries a reason and an origin for each");
    },
  },

  // ══ 01 · Scenario: every previously de-armed suite is part of what the runner assembles ══
  // ══ 01 · Scenario: the re-arming is visible in what CI executes ═════════════════════
  {
    name: "instrument-census/01 every one of the twenty-six de-armed suites now contributes its tests to what CI will execute, and the assembled suite grew rather than shrank",
    async run() {
      const { tests: assembledTests } = await import(runnerUrl);
      const assembled = new Set(assembledTests.map((entry) => entry.name));
      assert.ok(assembled.size >= ASSEMBLED_BEFORE_THIS_STORY, `the later assembled suite contains at least everything the earlier one did (${assembled.size} ≥ ${ASSEMBLED_BEFORE_THIS_STORY})`);
      assert.equal(THE_TWENTY_SIX.length, 26, "the population this story re-arms is 26, named rather than counted");

      let entries = 0;
      const stillDark = [];
      for (const rel of THE_TWENTY_SIX) {
        const names = await exportedNames(rel);
        assert.ok(names.length > 0, `${rel} exports a runner-shaped array`);
        entries += names.length;
        const missing = names.filter((name) => !assembled.has(name));
        if (missing.length > 0) stillDark.push(`${rel} → ${missing.length}/${names.length} still absent, e.g. "${missing[0]}"`);
      }
      assert.deepEqual(stillDark, [], `every de-armed suite contributes its tests to the assembled suite:\n  ${stillDark.join("\n  ")}`);
      // A FLOOR, NOT AN EQUALITY — corrected at review, and the doctrine is three files away in
      // this same story: "a floor with headroom, never an equality … a gate that reds for an
      // unrelated reason is a gate that gets muted", and muting is what produced the twenty-six.
      // An equality on a LIVE population reds the moment somebody adds a case to any of the 26,
      // with a message about spike 56's measurement, for a change that has nothing to do with
      // registration. 117 was the measurement; it is the floor, and `stillDark` above already
      // carries the claim that matters — every one of them is assembled, by name.
      assert.ok(entries >= 117, `the 26 carry at least the 117 entries spike 56 measured (got ${entries}) — a floor, so adding a case to any of them is not a registration failure`);

      // …and additionally the six the new instrument found on its first run: suites the FAST
      // lane registered and `npm test` never assembled.
      const fastLaneDark = [];
      let fastLaneEntries = 0;
      for (const rel of THE_FAST_LANE_SIX) {
        const names = await exportedNames(rel);
        fastLaneEntries += names.length;
        const missing = names.filter((name) => !assembled.has(name));
        if (missing.length > 0) fastLaneDark.push(`${rel} → ${missing.length}/${names.length} absent`);
      }
      assert.deepEqual(fastLaneDark, [], `the fast-lane-only six are in what CI executes too:\n  ${fastLaneDark.join("\n  ")}`);
      assert.ok(fastLaneEntries > 100, `and they carry ${fastLaneEntries} entries that CI had never run`);
      assert.ok(assembled.size >= ASSEMBLED_BEFORE_THIS_STORY + entries + fastLaneEntries, `the assembled suite additionally contains the de-armed tests (${assembled.size} ≥ ${ASSEMBLED_BEFORE_THIS_STORY} + ${entries} + ${fastLaneEntries})`);
    },
  },

  // ══ 01 · Scenario: the count of imported-but-never-spread bindings is zero ═══════════
  {
    name: "instrument-census/01 no suite binding the runner imports is absent from what it assembles — the imported-but-never-spread count is zero",
    async run() {
      // 119/03 — the registry names DIRECTORIES, so the bindings and the spreads that decide
      // this live across the whole registration surface: the runner, and every directory index
      // it spreads. Read from the runner alone the two floors below measure zero, and a lane
      // that read nothing would report a clean "never-spread count of 0".
      const surfaces = await registrationSources(repoRoot);
      const bindings = surfaces.flatMap((surface) => runnerBindings(surface.source, surface.rel));
      assert.ok(bindings.length > 500, `the surface's bindings were actually read (${bindings.length}) — a floor before the claim, so a failed read cannot pass as a clean one`);

      const spread = new Set(surfaces.flatMap((surface) => [...runnerSpreadNames(surface.source)]));
      assert.ok(spread.size > 500, `and its spreads were read too (${spread.size})`);
      const neverSpread = bindings.filter((entry) => !spread.has(entry.binding));
      assert.deepEqual(
        neverSpread.map((entry) => `${entry.binding} <- ${entry.suite}`),
        [],
        "every suite binding scripts/test.mjs imports is spread into what it assembles. 56 measured 26 here (27 including a node builtin), and the imports were left behind so the files still looked registered.",
      );

      // The measurement above is text-level. THE AUTHORITY is membership, so it is re-asked of
      // the assembled array: every binding's suite contributes at least one assembled name.
      const { tests: assembledTests } = await import(runnerUrl);
      const assembled = new Set(assembledTests.map((entry) => entry.name));
      const suites = [...new Set(bindings.map((entry) => entry.suite))];
      const ledger = new Set(UNREGISTERED_BASELINE.map((entry) => entry.suite));
      const dark = [];
      for (const rel of suites) {
        if (ledger.has(rel)) continue;
        const names = await exportedNames(rel);
        if (names.length > 0 && names.every((name) => !assembled.has(name))) dark.push(rel);
      }
      assert.deepEqual(dark, [], "and by runtime membership — the rule that cannot be blinded by a comment — no imported suite is absent from the assembled suite");
    },
  },

  // ══ 01 · Scenario: a re-armed suite that fails is reported as failing, not as absent ══
  {
    name: "instrument-census/01 a re-armed suite whose tests do not pass is a FAILING gate, not an absent one — the census reports it as registered and the runner reports the failure",
    async run() {
      const suite = "test/re-armed-and-red.test.mjs";
      const failing = [{ name: "re-armed/one", run: () => { throw new Error("the subject moved while the suite was dark"); } }];
      const assembled = new Set(failing.map((entry) => entry.name));

      const decided = registrationDecision({
        files: [suite],
        suiteNames: new Map([[suite, failing.map((entry) => entry.name)]]),
        assembled,
        baseline: [],
        importedBy: new Set([suite]),
      });
      assert.deepEqual(decided.registered, [suite], "a red suite that IS assembled is REGISTERED — redness is not absence");
      assert.deepEqual(decided.findings, [], "and the census raises no registration finding against it");
      assert.ok(!decided.unregistered.some((row) => row.file === suite), "it is NOT reported as unregistered");

      // …and the failure is a real one that the runner will surface, which is the whole point
      // of turning it back on: two of the twenty-six were red while dead.
      await assert.rejects(async () => { await failing[0].run(); }, /subject moved/u, "the gate fails loudly when run — reported as a failing gate rather than silently absent");
    },
  },

  // ══ 01 · Scenario: turning a suite back off is refused ══════════════════════════════
  {
    name: "instrument-census/01 removing a suite from what the runner assembles without recording a reason is reported BY NAME, and distinguished from a suite that was never registered",
    async run() {
      const armed = "test/was-armed.test.mjs";
      const never = "test/never-armed.test.mjs";
      const files = [armed, never];
      const suiteNames = new Map([[armed, ["armed/one"]], [never, ["never/one"]]]);

      const before = registrationDecision({ files, suiteNames, assembled: new Set(["armed/one"]), baseline: [], importedBy: new Set([armed]) });
      assert.deepEqual(before.registered, [armed], "before: the suite is part of what the runner assembles");

      // The change: its spread is removed. The import stays, which is exactly the shape that
      // made this invisible for a month.
      const after = registrationDecision({ files, suiteNames, assembled: new Set(), baseline: [], importedBy: new Set([armed]) });
      assert.deepEqual(after.registered, [], "after: it is no longer registered");

      const turnedOff = after.findings.find((finding) => finding.path === armed);
      const neverOn = after.findings.find((finding) => finding.path === never);
      assert.ok(turnedOff.message.includes(armed), "THE CENSUS REPORTS IT BY NAME");
      assert.equal(turnedOff.code, "audit-suite-imported-never-spread", "with the code for a suite whose binding survived its spread");
      assert.equal(neverOn.code, "audit-suite-unregistered", "and a suite that was never registered gets a different code");
      assert.notEqual(turnedOff.code, neverOn.code, "so the report distinguishes the two — which one is a regression and which one never ran is not left to the reader");
      assert.match(turnedOff.message, /looks registered and executes nothing/u, "and the message says what the state actually is");
    },
  },

  // ══ 02 · Scenario: a clean sweep still says how much it read ════════════════════════
  // ══ 02 · Scenario: the read count survives the finding list being empty ═════════════
  {
    name: "instrument-census/02 a clean census still reports the size of the population it considered and the floor that number had to clear, and both survive an empty finding list",
    async run() {
      const root = await fixtureRepo({
        suites: [["test/a.test.mjs", ["a/one"]], ["test/arch/b.test.mjs", ["b/one"]], ["test/integration/c.test.mjs", ["c/one"]]],
        imports: [["aTests", "test/a.test.mjs"], ["bTests", "test/arch/b.test.mjs"], ["cTests", "test/integration/c.test.mjs"]],
        spreads: ["aTests", "bTests", "cTests"],
      });
      try {
        const result = await runCensus({ repoRoot: root, sweeps: LOW_FLOORS, baseline: [], spawn: spawnAnswering(["a/one", "b/one", "c/one"]) });
        assert.deepEqual([...result.findings], [], "a tree in which every suite is registered reports NO registration failures");
        assert.equal(result.reads.length, LOW_FLOORS.length, "and the read count survives the finding list being empty — every registered sweep reported");
        const population = result.reads.find((read) => read.sweep === "suite-population");
        assert.equal(population.count, 3, "it reports the number of suites it considered");
        assert.equal(population.floor, 1, "and the floor that number had to clear");
        for (const read of result.reads) {
          assert.equal(typeof read.count, "number", `${read.sweep}: the count is readable from the result`);
          assert.equal(typeof read.floor, "number", `${read.sweep}: so is its floor`);
          assert.ok(read.root.length > 0, `${read.sweep}: and the root it walked`);
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ 02 · Scenario: a sweep whose root has moved reports that it ran on nothing ══════
  // ══ 02 · Scenario: a population below the floor is a finding even when it is not zero ══
  {
    name: "instrument-census/02 a sweep pointed at a root that holds no suites reports that it ran on NOTHING — naming the sweep, the root it walked and the floor it missed — and a non-zero population below its floor is the same finding",
    async run() {
      const root = await fixtureRepo({
        suites: [["test/a.test.mjs", ["a/one"]]],
        imports: [["aTests", "test/a.test.mjs"]],
        spreads: ["aTests"],
      });
      try {
        const moved = [{ id: "suite-population", what: "the fixture's suites", root: "test-RENAMED", floor: 1, basis: "disk" }, ...LOW_FLOORS.slice(1)];
        const result = await runCensus({ repoRoot: root, sweeps: moved, baseline: [], spawn: spawnAnswering(["a/one"]) });
        const ranOnNothing = result.findings.filter((finding) => finding.code === "audit-ran-on-nothing");
        assert.equal(ranOnNothing.length, 1, "the moved root produced exactly one ran-on-nothing finding");
        assert.match(ranOnNothing[0].message, /"suite-population" sweep/u, "the finding NAMES THE SWEEP");
        assert.match(ranOnNothing[0].message, /test-RENAMED/u, "and the ROOT it walked");
        assert.match(ranOnNothing[0].message, /required 1/u, "and the FLOOR it missed");
        assert.equal(ranOnNothing[0].path, "test-RENAMED", "and addresses the finding to that root");
        assert.ok(result.findings.length > 0, "it does NOT report the sweep as clean");

        // Below the floor is the finding, not zero: a population that shrank by 90% is the same
        // failure one step earlier.
        const notZero = readFinding(readRecord({ id: "arch-tree", what: "the arch gates", root: "test/arch", floor: 200, basis: "disk" }, 3));
        assert.equal(notZero.code, "audit-ran-on-nothing", "3 of a required 200 is a finding even though it is not zero");
        assert.match(notZero.message, /read 3 of a required 200/u, "and the finding QUOTES BOTH the count and the floor");
        assert.equal(readFinding(readRecord({ id: "arch-tree", what: "the arch gates", root: "test/arch", floor: 200, basis: "disk" }, 200)), null, "a population at its floor is not a finding");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ 02 · Scenario: a truncated read is caught by the same rule ═════════════════════
  {
    name: "instrument-census/02 a runner whose assembled suite could not be obtained in full reports what it WAS able to read, and does not report registration as clean over the part it could not see",
    async run() {
      const root = await fixtureRepo({
        suites: [["test/a.test.mjs", ["a/one"]], ["test/b.test.mjs", ["b/one"]]],
        imports: [["aTests", "test/a.test.mjs"], ["bTests", "test/b.test.mjs"]],
        spreads: ["aTests", "bTests"],
      });
      try {
        // The child died on its deadline: the assembled suite is not knowable, in full or at all.
        const truncated = spawnAnswering([], { outcome: "deadline-expired", exitCode: null, stdout: "", error: "the child was killed" });
        const result = await runCensus({ repoRoot: root, sweeps: LOW_FLOORS, baseline: [], spawn: truncated });

        const unavailable = result.findings.filter((finding) => finding.code === "audit-runtime-membership-unavailable");
        assert.equal(unavailable.length, 1, "the truncated read is itself a finding");
        assert.match(unavailable[0].message, /not reported clean over a suite this sweep could not see/u, "and it says registration was NOT reported clean over what it could not see");
        assert.match(unavailable[0].message, /deadline/u, "naming what went wrong");
        assert.deepEqual([...result.registered], [], "no suite is reported registered on a read that did not happen");

        // …and it still reports what it WAS able to read.
        const population = result.reads.find((read) => read.sweep === "suite-population");
        assert.equal(population.count, 2, "the population it did read is still reported");
        assert.ok(result.reads.some((read) => read.sweep === "assembled-suite" && read.count === 0), "and the sweep that failed reports 0 rather than being omitted");
        assert.ok(result.findings.some((finding) => finding.code === "audit-ran-on-nothing" && finding.message.includes("assembled-suite")), "so the failed sweep also trips the ran-on-nothing rule — the SAME rule catches it");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  },

  // ══ 02 · Scenario: every sweep the census registers carries a floor ════════════════
  {
    name: "instrument-census/02 every sweep the census registers declares a floor, and a sweep that declares none is REFUSED rather than defaulted",
    async run() {
      assert.ok(CENSUS_SWEEPS.length >= 3, "the census registers sweeps at all");
      for (const sweep of CENSUS_SWEEPS) {
        assert.equal(typeof sweep.floor, "number", `${sweep.id} declares a floor`);
        assert.ok(sweep.floor > 0, `${sweep.id}: and it is a real one`);
        assert.ok(sweep.root.length > 0, `${sweep.id} declares the root it walks`);
        assert.ok(sweep.what.length > 0, `${sweep.id} declares what its population is`);
      }
      assert.deepEqual(sweepDeclarationProblems(CENSUS_SWEEPS), [], "the shipped registry is fully declared");
      assert.equal(assertSweepsDeclared(CENSUS_SWEEPS), CENSUS_SWEEPS, "…and is accepted");

      // A floorless sweep is refused. NOT defaulted: a default floor would make "found nothing"
      // and "looked at nothing" indistinguishable everywhere at once.
      const floorless = [{ id: "no-floor", what: "something", root: "test", basis: "disk" }];
      const problems = sweepDeclarationProblems(floorless);
      assert.equal(problems.length, 1, "a sweep with no floor produces exactly one problem");
      assert.match(problems[0], /no-floor declares no floor/u, "naming the sweep");
      assert.match(problems[0], /a default floor would make that indistinguishable/u, "and saying why a default is refused rather than convenient");
      assert.throws(() => assertSweepsDeclared(floorless), /not declared/u, "and the census REFUSES to run on it");
      assert.throws(() => assertSweepsDeclared([]), /no sweeps/u, "a census with no sweeps at all is refused too");
      for (const bad of [{ id: "x", what: "w", root: "test", floor: 0, basis: "disk" }, { id: "x", what: "w", root: "test", floor: -1, basis: "disk" }, { id: "x", what: "w", root: "test", floor: "many", basis: "disk" }]) {
        assert.ok(sweepDeclarationProblems([bad]).some((problem) => problem.includes("declares no floor")), `floor=${String(bad.floor)} is not a floor`);
      }
    },
  },

  // ══ 02 · The census states the limit of its own claim on a CLEAN result too ═════════
  {
    // RAISED AT REVIEW. `spreadClaimLimit()` was quoted only INTO findings, so in exactly the
    // case where this lane is blind — a de-armed suite it cannot see — it produced `findings: []`
    // and said nothing about what it could not see. QA measured two shapes on the real
    // repository, through the real child, each de-arming seven entries while the census reported
    // the suite `registered`. The arch gate catches both (it decides by membership inside the
    // runner's own process, so a comment is not a hiding place); the defect that is THIS lane's
    // is the silence, and ADR-004 §1's own doctrine settles it: if a clean result is not
    // representable without a read count, it is not representable without its limits either.
    name: "instrument-census/02 a clean census still states the LIMIT of every text-level sweep and names the authority — the two shapes it is blind to are reported clean, but never silently",
    async run() {
      const shapes = [
        {
          // The MULTI-LINE block form, which is the one that is actually blind. A one-line
          // `/* ...darkTests, */` is caught, because the line-anchored read requires the spread
          // to BE the statement and that line opens with `/*` — so the shape is stated precisely
          // rather than as "a block comment", which would overstate the hole in both directions.
          label: "a spread inside a multi-line BLOCK comment",
          runner: [
            'import { suiteTests as darkTests } from "../test/dark.test.mjs";',
            'import { suiteTests as liveTests } from "../test/live.test.mjs";',
            "",
            "export const tests = [",
            "  ...liveTests,",
            "  /*",
            "  ...darkTests,",
            "  */",
            "];",
          ],
        },
        {
          label: "a spread into a SECOND, unexported array",
          runner: [
            'import { suiteTests as darkTests } from "../test/dark.test.mjs";',
            'import { suiteTests as liveTests } from "../test/live.test.mjs";',
            "",
            "const parked = [",
            "  ...darkTests,",
            "];",
            "",
            "export const tests = [",
            "  ...liveTests,",
            "];",
          ],
        },
      ];

      for (const shape of shapes) {
        const root = await fixtureRepo({ suites: [["test/dark.test.mjs", ["dark/one"]], ["test/live.test.mjs", ["live/one"]]] });
        try {
          const fs = await import("node:fs/promises");
          await fs.writeFile(path.join(root, "scripts", "test.mjs"), shape.runner.join("\n") + "\n", "utf8");
          // The runner ASSEMBLES only the live suite — `dark/one` never reaches CI.
          const result = await runCensus({ repoRoot: root, sweeps: LOW_FLOORS, baseline: [], spawn: spawnAnswering(["live/one"]) });

          // THE MEASUREMENT, stated rather than wished away: this lane is blind to both shapes.
          assert.deepEqual([...result.findings], [], `${shape.label}: the census reports clean — this is the blind spot, measured, not assumed`);
          assert.ok(result.registered.includes("test/dark.test.mjs"), `${shape.label}: and even reports the de-armed suite as registered`);

          // …AND IT SAYS SO. A clean result carries the limits of every non-runtime sweep.
          assert.ok(Array.isArray(result.limits) && result.limits.length > 0, `${shape.label}: the clean result still carries its limits`);
          const textLimit = result.limits.find((entry) => entry.basis === "text");
          assert.ok(textLimit != null, `${shape.label}: including the text-level sweep's`);
          // D-59-3: the caveat is `consequence` and the question is `question`, the same two keys
          // every lane's limit carries — this cell used to be `limit` beside a `claim`, a second
          // vocabulary the face could not render.
          assert.match(textLimit.consequence, /TEXT-LEVEL claim/u, `${shape.label}: which states that the claim is text-level`);
          assert.match(textLimit.consequence, /comment/u, `${shape.label}: and that a mention inside a comment satisfies it`);
          assert.match(textLimit.question, /reach the assembled suite/u, `${shape.label}: and it says what it could not answer, as a question`);
          assert.equal(textLimit.authority, "test/arch/testing/acd-test-suite-registration.test.mjs", `${shape.label}: and names the gate that decides where the two disagree`);
          assert.equal(textLimit.sweep, "runner-bindings", `${shape.label}: attributed to the sweep it limits`);

          // AND THE AUTHORITY IS NOT BLIND. The same tree, decided by membership, is unambiguous —
          // which is why the milestone's instrument is intact even where this lane is not.
          const decided = registrationDecision({
            files: ["test/dark.test.mjs", "test/live.test.mjs"],
            suiteNames: new Map([["test/dark.test.mjs", ["dark/one"]], ["test/live.test.mjs", ["live/one"]]]),
            assembled: new Set(["live/one"]),
            baseline: [],
            importedBy: new Set(["test/dark.test.mjs", "test/live.test.mjs"]),
          });
          assert.deepEqual(decided.registered, ["test/live.test.mjs"], `${shape.label}: the AUTHORITY sees it — a comment is not a hiding place from a membership check`);
          assert.equal(decided.findings[0].code, "audit-suite-imported-never-spread", `${shape.label}: and classifies it as a binding whose spread went missing`);
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      }
    },
  },

  // ══ 02 · A sweep that declares no basis cannot state its limit, and is refused ═══════
  {
    name: "instrument-census/02 every registered sweep declares its BASIS — disk, text or runtime — and a sweep that declares none is refused, because a sweep that cannot say what it read on cannot state the limit of its claim",
    async run() {
      for (const sweep of CENSUS_SWEEPS) {
        assert.ok(SWEEP_BASES.includes(sweep.basis), `${sweep.id} declares one of the frozen bases (got ${String(sweep.basis)})`);
      }
      assert.deepEqual(sweepDeclarationProblems(CENSUS_SWEEPS), [], "the shipped registry declares a basis for every sweep");

      const basisless = [{ id: "no-basis", what: "something", root: "test", floor: 1 }];
      const problems = sweepDeclarationProblems(basisless);
      assert.equal(problems.length, 1, "a sweep with no basis produces exactly one problem");
      assert.match(problems[0], /declares no basis/u, "naming the sweep");
      assert.match(problems[0], /reports clean in exactly the case where it is blind/u, "and saying what the omission costs");
      assert.throws(() => assertSweepsDeclared(basisless), /not declared/u, "and the census refuses to run on it");

      // The limits are DERIVED from the registry, so a fourth sweep cannot arrive with a
      // text-level claim and no stated limit — it either declares a basis or fails above.
      const limits = sweepLimits(CENSUS_SWEEPS);
      assert.equal(limits.length, CENSUS_SWEEPS.filter((sweep) => sweep.basis !== "runtime").length, "one limit per non-runtime sweep, derived rather than hand-maintained");
      assert.ok(limits.every((entry) => entry.consequence.length > 40), "and each states a real limit rather than a placeholder");
      assert.ok(limits.every((entry) => entry.question.length > 0), "and each says, as a question, what it could not answer");
      assert.deepEqual(sweepLimits([{ id: "x", what: "w", root: "r", floor: 1, basis: "runtime" }]), [], "a runtime answer needs no text-level caveat, so it contributes none");
    },
  },

  // ══ The census over the REAL tree ═════════════════════════════════════════════════
  {
    name: "instrument-census/02 self-check — the census runs over this repository's real tree, clears every declared floor, and reports no registration failure outside its shrink-only baseline",
    async run() {
      const source = await import("node:fs/promises").then((fs) => fs.readFile(path.join(repoRoot, "scripts", "test.mjs"), "utf8"));
      const assembled = (await import(runnerUrl)).tests.map((entry) => entry.name);
      const result = await runCensus({ repoRoot, spawn: spawnAnswering(assembled) });

      for (const read of result.reads) {
        assert.ok(read.count >= read.floor, `${read.sweep} read ${read.count} over ${read.root}, clearing its floor of ${read.floor}`);
      }
      assert.ok(result.reads.length === CENSUS_SWEEPS.length, "every registered sweep reported a read");
      assert.deepEqual(
        result.findings.map((finding) => `${finding.code} ${finding.path}`),
        [],
        "the real tree produces no census finding: every suite on disk is either assembled by the runner or carried in the shrink-only baseline with its reason and its origin",
      );
      const importedAcrossSurface = new Set((await registrationSources(repoRoot)).flatMap((surface) => [...runnerImportedSuites(surface.source, surface.rel)]));
      assert.ok(importedAcrossSurface.size > 500, "and the registration surface's imported-suite set was genuinely read");
      assert.ok(result.registered.length > 500, `${result.registered.length} suites are registered`);
      assert.deepEqual(result.unregistered.map((row) => row.file).sort(), UNREGISTERED_BASELINE.map((entry) => entry.suite).sort(), "and the unregistered set is exactly the shrink-only baseline");
      // ONE SHAPE FOR ONE KEY (raised at review): a census row and a decider row are both objects
      // carrying `.file`, so 59/04 reading `row.file` off either gets a path rather than undefined.
      for (const row of result.unregistered) {
        assert.equal(typeof row.file, "string", "every unregistered row names its suite under .file, exactly as registrationDecision() does");
        assert.equal(row.carried, true, `${row.file} is carried`);
        assert.ok(row.reason.length > 20 && row.origin.length > 5, `${row.file} carries its reason and its origin into the CLI result, not just into the ledger`);
      }
    },
  },
];
