// Fitness function: acd-loop-concurrency-single-home (milestone 129 / story 05; FF-12901;
// ADR-001, ADR-006) —
//
//   "The mode has one home and no concurrency number exists."
//
// LEG 1 — THE MAPS. `work.loop.concurrency` is a key of BOTH resolver maps in
// `src/loop-bounds.mjs`, mapping to the leaf's own `resolveLoopConcurrency` /
// `loopConcurrencyFromConfig` by identity, and the key SET of each map is pinned: the eight
// FF-6901 numeric keys plus this one, and nothing else. A tenth key — a `work.loop.lanes`, a
// second number for "lanes at once" — is the twin ADR-006 refuses (the bound on concurrent lanes
// is `work:dispatch`'s own), and the pin is what makes that refusal a red build. `rangeProbe`
// admits exactly the two modes and `stepProbe` refuses a notch on a string.
//
// LEG 2 — THE SWEEP. Over a comment-stripped read of `src/**`: the literals `"refine_first"` /
// `"sequential"` live in exactly two modules — the bounds home and the engine (`src/work/loop.mjs`,
// whose `decideLoopPhase` branches on the mode it is HANDED, ADR-001 §4) — so a third spelling
// (a `"refine_first"` in `src/loop/wave.mjs`) is a second home wearing a branch's shape; the
// dispatch bound `dispatch.concurrency` is read by `src/work/dispatch.mjs` and by nothing else;
// and the loop family (`src/loop/**`, `src/commands/loop.mjs`) reads no dispatch bound and names
// no `work.loop.<x>` key the maps do not carry. NON-VACUOUS: the sweep must FIND the engine's
// branch and the one dispatch read before it asserts anything about them — an emptied sweep is a
// red naming the file it could not find, never a silent green.
//
// Red probes (VERIFICATION.md's register): add `"work.loop.lanes": resolveLanes` to the value map
// (leg 1, and FF-6111's two-way equality goes red beside it as collateral); spell `"refine_first"`
// in a branch of `src/loop/wave.mjs` (leg 2).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { functionBody, matchedBraceBody, stripComments } from "../../support/source-slice.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const BOUNDS_HOME = "src/loop-bounds.mjs";
const ENGINE = "src/work/loop.mjs";
const DISPATCH_HOME = "src/work/dispatch.mjs";
const KEY = "work.loop.concurrency";

// THE EIGHT FF-6901 KEYS, spelled here so the pin is a pin: a ninth number appended to the leaf
// would otherwise be admitted by a set derived from the leaf itself.
export const NUMERIC_LOOP_KEYS = Object.freeze([
  "work.loop.startToCloseMs",
  "work.loop.heartbeatMs",
  "work.loop.scheduleToStartMs",
  "work.loop.scheduleToCloseMs",
  "work.loop.startupGraceMs",
  "work.loop.reviewRounds",
  "work.loop.buildNoProgressRounds",
  "work.loop.progressMaxResets",
]);
export const PINNED_LOOP_KEYS = Object.freeze([...NUMERIC_LOOP_KEYS, KEY].sort());

// The two modules that may spell a mode literal, by path (ADR-001 §1 and §4).
export const MODE_LITERAL_HOMES = Object.freeze([BOUNDS_HOME, ENGINE]);
const MODE_LITERAL_RE = /["'](?:refine_first|sequential)["']/gu;
const DISPATCH_BOUND_READ_RE = /\bdispatch\??\.concurrency\b/gu;
const WORK_LOOP_KEY_RE = /\bwork\.loop\.([A-Za-z][A-Za-z0-9]*)/gu;

const toPosix = (value) => String(value).split(path.sep).join("/");

// PURE — the sweep over `[{ rel, code }]` (comment-stripped), so a plant is drivable without a
// checkout. Answers `{ problems, found }`: `found` is what the non-vacuity guard needs.
export function sweepModeLiterals(units) {
  const problems = [];
  const homes = new Set(MODE_LITERAL_HOMES);
  const found = { bounds: false, engine: false, engineBranch: false };
  for (const { rel, code } of units) {
    const literals = [...code.matchAll(MODE_LITERAL_RE)].map((match) => match[0]);
    if (literals.length === 0) continue;
    if (!homes.has(rel)) {
      problems.push(`${rel} spells the mode literal ${[...new Set(literals)].join(" / ")} — the mode has one home (${BOUNDS_HOME}) and one branch (${ENGINE}'s decideLoopPhase); a third spelling is a second home (129/ADR-001 §1)`);
      continue;
    }
    if (rel === BOUNDS_HOME) found.bounds = true;
    if (rel === ENGINE) {
      found.engine = true;
      // The engine's branch: `decideLoopPhase` reaches the literal — directly, or through the
      // module-scope binding that holds it (`const REFINE_FIRST = "refine_first"`) and the helper
      // that reads it.
      const body = functionBody(code, "function decideLoopPhase(");
      const binding = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*["']refine_first["']/u.exec(code)?.[1] ?? null;
      const reaches = (text) => text != null && (/["']refine_first["']/u.test(text) || (binding != null && new RegExp(`\\b${binding}\\b`, "u").test(text)));
      let branch = body != null && reaches(body);
      if (!branch && body != null) {
        for (const call of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/gu)) {
          const helper = functionBody(code, `function ${call[1]}(`);
          if (reaches(helper)) { branch = true; break; }
        }
      }
      found.engineBranch = branch;
    }
  }
  return { problems, found };
}

export function sweepDispatchBoundReads(units) {
  const problems = [];
  let found = 0;
  for (const { rel, code } of units) {
    const reads = [...code.matchAll(DISPATCH_BOUND_READ_RE)].length;
    if (reads === 0) continue;
    if (rel === DISPATCH_HOME) found = reads;
    else problems.push(`${rel} reads \`dispatch.concurrency\` — ${DISPATCH_HOME} is the bound's only reader (129/ADR-006), and the loop family asks the bound through work:dispatch's admission`);
  }
  return { problems, found };
}

// The loop family names no `work.loop.<x>` key outside the pinned set — a key whose resolver
// would answer a NUMBER the eight FF-6901 names do not carry is a concurrency number in a coat.
export function sweepFamilyKeys(units) {
  const problems = [];
  const pinned = new Set(PINNED_LOOP_KEYS);
  for (const { rel, code } of units) {
    if (!(rel.startsWith("src/loop/") || rel === "src/commands/loop.mjs")) continue;
    for (const match of code.matchAll(WORK_LOOP_KEY_RE)) {
      const key = match[0];
      if (!pinned.has(key)) problems.push(`${rel} names \`${key}\`, which neither resolver map carries — the family reads its bounds through src/loop-bounds.mjs's nine keys and holds no number of its own`);
    }
    if ([...code.matchAll(DISPATCH_BOUND_READ_RE)].length > 0) {
      problems.push(`${rel} reads \`dispatch.concurrency\` — the family never reads the dispatch bound (129/ADR-006)`);
    }
  }
  return problems;
}

async function srcUnits() {
  const units = [];
  for (const file of await readSrcFiles(repoRoot)) {
    units.push({ rel: `src/${toPosix(file.rel)}`, code: stripComments(await readFile(file.path, "utf8")) });
  }
  return units;
}

export const archTests = [
  {
    name: "arch/129/05 FF-12901: leg 1 (the maps) — work.loop.concurrency resolves in src/loop-bounds.mjs as a mode, both maps carry exactly the nine keys, and the range probe admits the two modes and nothing else",
    run: async () => {
      // Lazily — the harness's entry-key sweep (FF-5311) imports every arch file, and a leaf
      // imported at module scope is a leaf whose absence takes the whole index down.
      const loopBounds = await import("../../../src/loop-bounds.mjs");
      assert.equal(typeof loopBounds.resolveLoopConcurrency, "function", `${BOUNDS_HOME}: NOT FOUND — resolveLoopConcurrency is not exported`);
      assert.equal(typeof loopBounds.loopConcurrencyFromConfig, "function", `${BOUNDS_HOME}: NOT FOUND — loopConcurrencyFromConfig is not exported`);
      assert.equal(loopBounds.LOOP_BOUND_VALUE_RESOLVERS[KEY], loopBounds.resolveLoopConcurrency, `LOOP_BOUND_VALUE_RESOLVERS["${KEY}"] is resolveLoopConcurrency by identity`);
      assert.equal(loopBounds.LOOP_BOUND_CONFIG_RESOLVERS[KEY], loopBounds.loopConcurrencyFromConfig, `LOOP_BOUND_CONFIG_RESOLVERS["${KEY}"] is loopConcurrencyFromConfig by identity`);

      // THE PIN. Both key sets equal the eight FF-6901 keys plus this one — a tenth key is named
      // by the map it appeared in.
      for (const [mapName, map] of [["LOOP_BOUND_VALUE_RESOLVERS", loopBounds.LOOP_BOUND_VALUE_RESOLVERS], ["LOOP_BOUND_CONFIG_RESOLVERS", loopBounds.LOOP_BOUND_CONFIG_RESOLVERS]]) {
        const keys = Object.keys(map).sort();
        const extra = keys.filter((key) => !PINNED_LOOP_KEYS.includes(key));
        const missing = PINNED_LOOP_KEYS.filter((key) => !keys.includes(key));
        assert.deepEqual(
          keys,
          [...PINNED_LOOP_KEYS],
          `${mapName} carries exactly the eight FF-6901 keys plus ${KEY}${extra.length > 0 ? ` — a key outside the nine: ${extra.join(", ")} (a second concurrency number is the twin 129/ADR-006 refuses)` : ""}${missing.length > 0 ? ` — missing: ${missing.join(", ")}` : ""}`,
        );
      }

      // In the source the map's entry for the key is a BARE identifier — never a quoted name.
      const home = stripComments(await readFile(path.join(repoRoot, BOUNDS_HOME), "utf8"));
      for (const mapName of ["LOOP_BOUND_VALUE_RESOLVERS", "LOOP_BOUND_CONFIG_RESOLVERS"]) {
        const declaredAt = home.indexOf(`${mapName} = Object.freeze(`);
        assert.ok(declaredAt >= 0, `${BOUNDS_HOME}: NOT FOUND — ${mapName} is not declared`);
        const literal = matchedBraceBody(home, declaredAt);
        assert.ok(literal != null, `${BOUNDS_HOME}: NOT FOUND — ${mapName}'s object literal could not be cut`);
        const entry = new RegExp(`"${KEY.replace(/\./gu, "\\.")}"\\s*:\\s*([^,\\n]+)`, "u").exec(literal);
        assert.ok(entry != null, `${BOUNDS_HOME}: NOT FOUND — ${mapName} has no entry for ${KEY}`);
        assert.match(entry[1].trim(), /^[A-Za-z_$][\w$]*$/u, `${mapName}'s ${KEY} entry is a bare identifier`);
      }

      // THE RANGE: a mode, not a number. `resolve(p) === p` iff `p` is a mode (61/ADR-009 §2).
      for (const mode of ["sequential", "refine_first"]) {
        assert.equal(loopBounds.rangeProbe(KEY, mode).admissible, true, `${mode} is admissible`);
      }
      for (const proposed of [0, 1, 3, "parallel", "Sequential", " refine_first"]) {
        assert.equal(loopBounds.rangeProbe(KEY, proposed).admissible, false, `${JSON.stringify(proposed)} is not admissible`);
      }
      assert.equal(loopBounds.stepProbe(KEY, "sequential", 1).admissible, false, "a one-notch step on a mode is refused");
      assert.deepEqual([...loopBounds.LOOP_CONCURRENCY_MODES], ["sequential", "refine_first"], "the vocabulary is the two modes, in order");
      assert.equal(loopBounds.resolveLoopConcurrency(undefined), "sequential", "unset is sequential");
    },
  },
  {
    name: "arch/129/05 FF-12901: leg 2 (the sweep) — the mode literals live in the bounds home and the engine's branch only, dispatch.concurrency is read by src/work/dispatch.mjs alone, and the loop family holds no bound of its own",
    run: async () => {
      const units = await srcUnits();
      assert.ok(units.length > 100, `src/** was actually read: ${units.length} modules`);

      const literals = sweepModeLiterals(units);
      // NON-VACUOUS — the sweep found what it sweeps for before anything is asserted about it.
      assert.ok(literals.found.bounds, `${BOUNDS_HOME}: NOT FOUND — the bounds home spells no mode literal; the sweep is reading the wrong tree`);
      assert.ok(literals.found.engine, `${ENGINE}: NOT FOUND — the engine spells no mode literal; the sweep is reading the wrong tree`);
      assert.ok(literals.found.engineBranch, `${ENGINE}: NOT FOUND — decideLoopPhase does not reach the "refine_first" branch (129/ADR-001 §4: the engine routes on the mode it is handed)`);
      assert.deepEqual(literals.problems, [], `the mode literals have two homes and no third:\n${literals.problems.join("\n")}`);

      const reads = sweepDispatchBoundReads(units);
      assert.ok(reads.found > 0, `${DISPATCH_HOME}: NOT FOUND — the one dispatch.concurrency read is absent; the sweep is reading the wrong tree`);
      assert.equal(reads.found, 1, `${DISPATCH_HOME} reads dispatch.concurrency exactly once (${reads.found} found)`);
      assert.deepEqual(reads.problems, [], `dispatch.concurrency has one reader:\n${reads.problems.join("\n")}`);

      const family = sweepFamilyKeys(units);
      assert.ok(units.some((unit) => unit.rel.startsWith("src/loop/")) && units.some((unit) => unit.rel === "src/commands/loop.mjs"), "the family was read");
      assert.deepEqual(family, [], `the loop family names no key the maps do not carry and no dispatch bound:\n${family.join("\n")}`);
    },
  },
  {
    name: "arch/129/05 FF-12901: self-check — each planted defect is caught by the sweep the real tree is measured by, and a literal in a comment is not a spelling",
    run: async () => {
      const units = await srcUnits();
      const planted = (rel, mutate) => units.map((unit) => (unit.rel === rel ? { ...unit, code: mutate(unit.code) } : unit));

      // A third spelling, in code.
      const wave = sweepModeLiterals(planted("src/loop/wave.mjs", (code) => `${code}\nexport function plant(mode) { return mode === "refine_first"; }\n`));
      assert.ok(wave.problems.some((problem) => problem.includes("src/loop/wave.mjs") && problem.includes("refine_first")), `a spelling in wave.mjs is named:\n${wave.problems.join("\n")}`);
      // …and the same spelling inside a comment is not a spelling: the sweep reads through the
      // one stripper, so the plant is applied to the RAW source and stripped as the real read is.
      const commented = sweepModeLiterals(units.map((unit) => (unit.rel === "src/loop/wave.mjs" ? { ...unit, code: stripComments(`${unit.code}\n// the mode is "refine_first" here\n`) } : unit)));
      assert.deepEqual(commented.problems, [], "a literal inside a // comment leaves the sweep green");

      // The engine's branch removed: NOT FOUND, never a green.
      const noBranch = sweepModeLiterals(planted(ENGINE, (code) => code.replace(/["']refine_first["']/gu, '"refine-first"')));
      assert.equal(noBranch.found.engine, false, "with the engine's literal respelled the sweep no longer finds the engine");
      const blindBranch = sweepModeLiterals(planted(ENGINE, (code) => code.replace(/function decideLoopPhase\(/u, "function decideLoopPhaseRenamed(")));
      assert.equal(blindBranch.found.engineBranch, false, "with decideLoopPhase renamed the branch is NOT FOUND");

      // The one dispatch read removed: NOT FOUND; a second reader: named.
      const noRead = sweepDispatchBoundReads(planted(DISPATCH_HOME, (code) => code.replace(DISPATCH_BOUND_READ_RE, "dispatch?.lanes")));
      assert.equal(noRead.found, 0, "with the read removed the sweep finds nothing");
      const secondReader = sweepDispatchBoundReads(planted("src/loop/wave.mjs", (code) => `${code}\nexport const plant = (w) => w.config.work.dispatch.concurrency;\n`));
      assert.ok(secondReader.problems.some((problem) => problem.includes("src/loop/wave.mjs")), "a second reader is named");

      // A tenth key named by the family.
      const tenth = sweepFamilyKeys(planted("src/commands/loop.mjs", (code) => `${code}\nexport const plant = "work.loop.lanes";\n`));
      assert.ok(tenth.some((problem) => problem.includes("work.loop.lanes") && problem.includes("src/commands/loop.mjs")), "a key outside the nine, named by the family, is reported");
    },
  },
];
