// Registration meta-fitness for milestone 04 / story 00 / task 03.
//
// The three round-trip fitness functions (acd-roundtrip-isolation,
// acd-roundtrip-reuses-shipped-code, acd-roundtrip-harness-contract) are only
// load-bearing if the runner actually EXECUTES them. A fitness function that is
// authored but never wired into scripts/test.mjs is dead weight — it can rot RED
// (or worse, stay GREEN by never running) without anyone noticing.
//
// This no-drift guard closes that gap structurally: for EVERY
// `acd-roundtrip-*.test.mjs` file on disk under test/arch/, every arch-test it
// exports must be part of the runner's assembled suite — AND no such file may be
// absent from the suite. The runner names tests by their exported `name`, so the
// guard keys registration by name-set membership.
//
// It imports the assembled `tests` array EXPORTED from scripts/test.mjs (the
// runner only runs the suite when invoked directly, so importing it here is a
// pure, side-effect-free read of the registration).
//
// ── 2026-08-29 (m59/01, ADR-003 §2): THIS MECHANISM IS NOW THE WHOLE TREE'S ────────────
//
// The argument above was never specific to round-trip tests, and milestone 56 measured what
// it cost to leave it specific: `acd-test-suite-registration` policed the general case with a
// substring search over the runner's SOURCE, so 26 suites carrying 117 test entries were
// imported and never spread — invisible for a month while this file's own family stayed
// honest, because this file asked the runner what it ASSEMBLED. 59/01 widened exactly this
// mechanism to every `*.test.mjs` under `test/`, `test/arch/` and `test/integration/` and
// retired the substring lane there.
//
// SO WHY IS THIS FILE STILL HERE, rather than deleted as subsumed? Two reasons, and the
// second is the load-bearing one:
//   · it is registered in BOTH runners, so it also guards `scripts/test-unit.mjs`'s fast lane,
//     which exports no assembled array and cannot be membership-checked from outside; and
//   · the general gate is itself a suite, and a suite can be de-armed. The third lane below
//     is the reciprocal guard: it asserts that the gate which decides registration for
//     everything else is ITSELF in what CI assembles. Without it, the one edit that disables
//     the whole census is a spread nobody notices — which is precisely the move this
//     milestone exists to make impossible, and it would be a poor joke to leave it open here.
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// 119/03 — `test/arch/` has an interior, so the round-trip files are no longer this file's
// siblings: they are spread across the subject directories. `archDir` is the ROOT of that tree and
// the walk below is recursive, because a listing of one subject directory would have found the two
// round-trip files that happen to live beside this one and reported "found 2" — under the floor, so
// loud, which is the only reason this was not a silent narrowing (119/ADR-003 §4).
const archDir = path.resolve(here, "..");
// scripts/test.mjs imports this meta-test, so resolve the assembled suite LAZILY
// inside run() (a deferred dynamic import) to avoid an eager import cycle that
// would read `tests` before the array literal has finished evaluating.
const runnerUrl = new URL("../../../scripts/test.mjs", import.meta.url).href;

const ROUNDTRIP_FILE_RE = /^acd-roundtrip-[A-Za-z0-9-]+\.test\.mjs$/;

// Every `*.test.mjs` beneath `test/arch/`, at any depth, as a path relative to it.
async function archSuiteFiles(dir, prefix = "") {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await archSuiteFiles(path.join(dir, entry.name), rel)));
    else if (entry.name.endsWith(".test.mjs")) found.push(rel);
  }
  return found;
}

export const archTests = [
  {
    name: "arch/registration: every acd-roundtrip-* arch-test on disk is wired into the assembled runner suite (no drift)",
    run: async () => {
      // The names the runner will actually execute (lazy import — see above).
      const { tests: assembledTests } = await import(runnerUrl);
      const assembledNames = new Set(assembledTests.map((test) => test.name));

      // Discover every round-trip fitness file on disk.
      const entries = await archSuiteFiles(archDir);
      const roundtripFiles = entries.filter((rel) => ROUNDTRIP_FILE_RE.test(path.basename(rel))).sort();
      assert.ok(roundtripFiles.length >= 3, `found the round-trip fitness files on disk (got ${roundtripFiles.length}): ${roundtripFiles.join(", ")}`);

      for (const file of roundtripFiles) {
        const mod = await import(pathToFileURL(path.join(archDir, file)).href);
        assert.ok(Array.isArray(mod.archTests), `${file} exports an archTests array`);
        assert.ok(mod.archTests.length > 0, `${file} exports at least one arch-test`);
        for (const test of mod.archTests) {
          assert.ok(
            assembledNames.has(test.name),
            `arch-test "${test.name}" from ${file} is registered in the assembled runner suite`
          );
        }
      }
    }
  },
  {
    // THE RECIPROCAL GUARD (m59/01). `acd-test-suite-registration` decides registration for
    // every other suite in the tree; nothing decided it for itself, and "the gate that would
    // have noticed is the one nobody noticed had stopped running" is this milestone's entire
    // subject. Keyed on the gate's own exported names rather than on its filename, because a
    // filename in the runner's text is exactly the claim 56 measured as worthless.
    name: "arch/registration: the gate that decides registration for the whole tree is itself in the assembled runner suite (the reciprocal guard)",
    run: async () => {
      const { tests: assembledTests } = await import(runnerUrl);
      const assembledNames = new Set(assembledTests.map((test) => test.name));
      assert.ok(assembledNames.size > 500, `the assembled suite was obtained and is non-vacuous (${assembledNames.size} entries) before any membership claim`);

      // 119/03 — named at their paths under the arch tree's interior. These two are STORED rather
      // than derived on purpose (they are the deciders, not a swept set), so the move has to
      // re-point them, and it fails loudly at the import when it does not.
      const deciders = ["testing/acd-test-suite-registration.test.mjs", "audit/acd-audit-never-imports-project-code.test.mjs"];
      for (const file of deciders) {
        const mod = await import(pathToFileURL(path.join(archDir, file)).href);
        assert.ok(Array.isArray(mod.archTests) && mod.archTests.length > 0, `${file} exports a non-empty archTests array`);
        for (const test of mod.archTests) {
          assert.ok(
            assembledNames.has(test.name),
            `"${test.name}" from ${file} is in the assembled runner suite — the instrument that polices registration must not be de-armed by the one edit it exists to catch`
          );
        }
      }
    }
  }
];
