import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
// 119/ADR-002 — the checks leaf's purity is a claim about its EXTERNAL dependencies, resolved over
// the family `src/work-loops-checks/` when that directory exists and `src/work/loops-checks.mjs`
// when it does not. The old token ban is what made this leaf's decomposition illegal (1,284 lines,
// 380 when 52/ADR-007 was written) and what forced it to hold a BYTE-COPY of `src/work-audit/`'s
// sweep declarers rather than importing them: a guard whose enforcement produces a duplicated home
// has stopped protecting the property it names.
import { assertFamilyPurity } from "../../support/module-family.mjs";
import {
  CHECK_IDS, UNMOVED_CYCLES, assessAnchorFreshness, assessInstrumentSilence, assessLoopConsultation,
  assessMetricMovement, buildGroundednessReport, checkActuatorArbitration, checkAnchorGrounding,
  checkGrounding, checkPairing, checkReferenceOwnership, checkTimescale,
} from "../../../src/work/loops-checks.mjs";
import * as checksModule from "../../../src/work/loops-checks.mjs";
import { ADMITTED_KEYS, NODE_KINDS, loadLoops } from "../../../src/work/loops.mjs";
import { makeLoopRegistry } from "../../support/loop-registry-fixture.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const runFile = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const checksPath = path.join(root, "src/work/loops-checks.mjs");
const loaderPath = path.join(root, "src/work/loops.mjs");
const commandPath = path.join(root, "src/commands/loops-groundedness.mjs");
const CHECK_NAMES = Object.freeze({
  grounding: "checkGrounding",
  "anchor-grounding": "checkAnchorGrounding",
  pairing: "checkPairing",
  "reference-ownership": "checkReferenceOwnership",
  "actuator-arbitration": "checkActuatorArbitration",
  timescale: "checkTimescale",
});
const checks = { checkGrounding, checkAnchorGrounding, checkPairing, checkReferenceOwnership, checkActuatorArbitration, checkTimescale };

function node(id, kind, cadence, edges = {}, optimizing = false) {
  return { id, kind, title: id, path: path.join(root, `${id.replace(":", "-")}.md`), fields: {
    cadence, optimizing: { kind: "flag", value: optimizing }, actuator: [{ kind: "pointer", raw: "command:x" }],
  }, edges };
}
const endpoint = (raw) => ({ raw, scheme: raw.split(":")[0], operand: raw.split(":")[1], resolved: true });
const model = { source: path.join(root, "loops"), present: true, findings: [], nodes: [
  { ...node("actor:root", "actor", undefined, { "target-setting": [endpoint("loop:a")] }), fields: { ground: { kind: "enum", value: "exogenous" } } },
  node("loop:a", "loop", { kind: "periodic", ms: 10_000 }, { "target-setting": [endpoint("loop:b")] }, true),
  node("loop:b", "loop", { kind: "periodic", ms: 5_000 }),
] };

async function importGraph(entry) {
  const seen = new Set();
  async function walk(file) {
    const resolved = path.resolve(file); if (seen.has(resolved)) return; seen.add(resolved);
    const source = stripComments(await readFile(resolved, "utf8"));
    const specifiers = importSpecifiers(source).map((entry) => entry.specifier);
    for (const specifier of specifiers) {
      if (!specifier.startsWith(".")) continue;
      await walk(path.resolve(path.dirname(resolved), specifier));
    }
  }
  await walk(entry); return seen;
}

export const archTests = [
  {
    name: "arch/52 FF-5205: checks are source-pure, parse no declared values, and the two lanes are transitively separate",
    run: async () => {
      const source = stripComments(await readFile(checksPath, "utf8"));
      assert.doesNotMatch(source, /(?:from\s+|require\s*\()["']node:(?:fs(?:\/promises)?|child_process|process|os)["']/);
      assert.doesNotMatch(source, /Date\.now\s*\(|new\s+Date\s*\(\s*\)|\bimport\s*\(/);
      assert.doesNotMatch(source, /["'`](?:periodic:|event:|module:|command:|config:|prose:)/);
      assert.doesNotMatch(source, /\.split\s*\(\s*["']:["']\s*\)/);
      assert.doesNotMatch(source, /localeCompare|Intl\.Collator/);
      const fromChecks = await importGraph(checksPath);
      const fromLoader = await importGraph(loaderPath);
      assert.ok(fromChecks.has(checksPath) && fromLoader.has(loaderPath), "both transitive walks visited their roots");
      assert.equal(fromChecks.has(loaderPath), false);
      assert.equal(fromLoader.has(checksPath), false);

      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-import-walk-"));
      try {
        const loaderLane = path.join(temp, "loader-lane");
        const checksLane = path.join(temp, "checks-lane");
        await mkdir(loaderLane); await mkdir(checksLane);
        await writeFile(path.join(loaderLane, "loader.mjs"), 'export const leak = import("./checks.mjs");\n');
        await writeFile(path.join(loaderLane, "checks.mjs"), "export const planted = true;\n");
        await writeFile(path.join(checksLane, "checks.mjs"), 'export const leak = import("./loader.mjs");\n');
        await writeFile(path.join(checksLane, "loader.mjs"), "export const planted = true;\n");
        assert.ok((await importGraph(path.join(loaderLane, "loader.mjs"))).has(path.join(loaderLane, "checks.mjs")), "loader-root dynamic laundering is detected");
        assert.ok((await importGraph(path.join(checksLane, "checks.mjs"))).has(path.join(checksLane, "loader.mjs")), "checks-root dynamic laundering is detected");
      } finally { await rm(temp, { recursive: true, force: true }); }
    },
  },
  {
    name: "arch/52 FF-5205: every check is model-in/findings-out and deterministic in-process and in a fresh process",
    run: async () => {
      assert.deepEqual(CHECK_IDS, Object.keys(CHECK_NAMES), "CHECK_IDS fixes check execution order and name mapping");
      const exportedChecks = Object.entries(checksModule)
        .filter(([name, value]) => name.startsWith("check") && typeof value === "function")
        .map(([name]) => name)
        .sort();
      assert.deepEqual(exportedChecks, Object.values(CHECK_NAMES).sort(), "no exported check function escapes the frozen CHECK_IDS mapping");
      const first = {};
      for (const id of CHECK_IDS) {
        const name = CHECK_NAMES[id];
        const check = checksModule[name];
        assert.equal(check.length, 1, `${name}: one model parameter`);
        first[name] = check(model);
        assert.ok(Array.isArray(first[name]));
        assert.ok(first[name].every((item) => item && typeof item === "object" && !Array.isArray(item)));
        assert.equal(JSON.stringify(check(model)), JSON.stringify(first[name]));
      }
      const moduleUrl = pathToFileURL(checksPath).href;
      const script = `import * as m from ${JSON.stringify(moduleUrl)}; const model=${JSON.stringify(model)}; const names=${JSON.stringify(Object.values(CHECK_NAMES))}; console.log(JSON.stringify(Object.fromEntries(names.map(n=>[n,m[n](model)]))));`;
      const { stdout } = await runFile(process.execPath, ["--input-type=module", "--eval", script]);
      assert.equal(stdout.trim(), JSON.stringify(first));
    },
  },
  {
    name: "arch/55 FF-5503: authority I/O stays at the command boundary and the pure result depends only on model plus injected resolution",
    run: async () => {
      const checksSource = stripComments(await readFile(checksPath, "utf8"));
      const commandSource = stripComments(await readFile(commandPath, "utf8"));
      assert.doesNotMatch(checksSource, /node:fs|readFile|readdir|access\s*\(|stat\s*\(|process\.cwd|Date\.now|\bfetch\s*\(/);
      assert.match(commandSource, /node:fs\/promises/);
      assert.match(commandSource, /resolveAnchorAuthorities/);

      const authorityModel = {
        source: path.join(root, "loops"), present: true, findings: [], nodes: [
          {
            id: "anchor:gate", kind: "anchor", path: path.join(root, "gate.md"),
            fields: {
              ground: { kind: "enum", value: "frozen-rule" },
              observes: { kind: "pointer", raw: "config:gate.active", pointer: { scheme: "config", operand: "gate.active" } },
            },
            edges: { "data-feed": [endpoint("loop:guarded")] },
          },
          node("loop:guarded", "loop", { kind: "event", trigger: "per-item" }),
        ],
      };
      const sound = buildGroundednessReport(authorityModel, { "anchor:gate": true });
      const stale = buildGroundednessReport(authorityModel, { "anchor:gate": false });
      assert.equal(sound.components.find((entry) => entry.members.includes("loop:guarded")).verdict, "anchored");
      assert.equal(stale.components.find((entry) => entry.members.includes("loop:guarded")).verdict, "stale");
      assert.equal(JSON.stringify(buildGroundednessReport(authorityModel, { "anchor:gate": false })), JSON.stringify(stale));
    },
  },
  {
    name: "arch/57 FF-5702: watcher independence is model-only and no node may declare independence or its own watcher",
    run: async () => {
      const checksSource = stripComments(await readFile(checksPath, "utf8"));
      await assertFamilyPurity(assert, root, "src/work/loops-checks");
      assert.doesNotMatch(checksSource, /node:fs|readFile|readdir|access\s*\(|stat\s*\(|process\.cwd|Date\.now|\bfetch\s*\(|\bimport\s*\(/);
      assert.equal(ADMITTED_KEYS.watcher.has("independence"), false, "a watcher cannot assert its own independence");
      assert.equal(ADMITTED_KEYS.loop.has("independence"), false, "a loop cannot assert watcher independence");
      assert.equal(ADMITTED_KEYS.loop.has("watcher"), false, "the watched loop cannot claim a watcher");

      const absent = path.join(root, "never-created", "loops");
      const loop = {
        id: "loop:build", kind: "loop", title: "build", path: path.join(absent, "build.md"),
        fields: {
          controlled: { kind: "phrase", raw: "scenarios green" },
          measurement: [{ kind: "pointer", raw: "module:missing.mjs#metric", pointer: { scheme: "module", operand: "missing.mjs", symbol: "metric" } }],
          actuator: [{ kind: "prose", raw: "prose:missing-agent.md", path: "missing-agent.md" }],
          optimizing: { kind: "flag", value: true },
        }, edges: {},
      };
      const watcher = {
        id: "watcher:build", kind: "watcher", title: "watcher", path: path.join(absent, "watcher.md"),
        fields: {
          counter: { kind: "phrase", raw: "scenarios green" },
          determinism: { kind: "enum", value: "judge" },
          measurement: [
            { kind: "pointer", raw: "module:missing.mjs#metric", pointer: { scheme: "module", operand: "missing.mjs", symbol: "metric" } },
            { kind: "prose", raw: "prose:missing-agent.md", path: "missing-agent.md" },
          ],
        },
        edges: { monitoring: [endpoint("loop:build")] },
      };
      const watcherModel = { source: absent, present: true, findings: [], nodes: [loop, watcher] };
      const first = checkPairing(watcherModel);
      assert.deepEqual(first.map((finding) => finding.code), [
        "loop-counter-equals-controlled",
        "loop-watcher-is-judge",
        "loop-watcher-shares-actuator",
        "loop-watcher-shares-measurement",
      ], "all four watcher independence/reporting legs are reachable over literal parsed records");
      assert.equal(JSON.stringify(checkPairing(watcherModel)), JSON.stringify(first), "the watcher result is deterministic and model-only");
    },
  },
  {
    // 58/FF-5804 — EXTENDING 52's purity guard. Supervision is COMPUTED, never self-declared: no
    // kind carries a key by which a node asserts who supervises it, what authority its layer has,
    // or that its conflicts are arbitrated. The three requirements 58 adds are therefore FINDINGS
    // over a model, not keys a record can fill in to clear them — which is what keeps them
    // checkable at all, and is 55/ADR-002 §2's ruling applied to a third requirement.
    name: "arch/58 FF-5804: supervision is computed rather than self-declared, and the checks leaf still imports nothing",
    run: async () => {
      const checksSource = stripComments(await readFile(checksPath, "utf8"));
      await assertFamilyPurity(assert, root, "src/work/loops-checks");
      assert.doesNotMatch(checksSource, /node:fs|readFile|readdir|access\s*\(|stat\s*\(|process\.cwd|Date\.now|\bfetch\s*\(|\bimport\s*\(/u);

      for (const key of ["supervised-by", "arbitrated-by", "dead-band", "independence", "layer-authority"]) {
        assert.equal(ADMITTED_KEYS.all.has(key), false, `${key}: no kind admits a key by which a node asserts its own supervision`);
        for (const kind of NODE_KINDS) assert.equal(ADMITTED_KEYS[kind].has(key), false, `${kind} does not admit ${key}`);
      }
      assert.equal(ADMITTED_KEYS.loop.has("owner"), true, "`owner` is admitted on kind: loop…");
      for (const kind of NODE_KINDS) {
        if (kind === "loop") continue;
        assert.equal(ADMITTED_KEYS[kind].has("owner"), false, `…and on ${kind} it is not — accountability has one home`);
        assert.equal(ADMITTED_KEYS[kind].has("layer"), false, `${kind} has no cadence and therefore no place on the layer axis`);
      }
      assert.equal(ADMITTED_KEYS.loop.has("layer"), true, "the layer is declarable on a loop…");

      // …AND IT IS NOT REQUIRED. The loader accepts a record that declares neither a layer nor an
      // owner and reports NOTHING about either; the requirement is computed downstream, as a
      // finding, by the check that already asks whether a loop has declared its place.
      const fixture = await makeLoopRegistry({
        "solo.md": [
          "---", "id: loop:solo", "kind: loop", "title: solo", "controlled: attempt count",
          "reference: [module:src/run-store.mjs#isRetryable]", "measurement: [module:src/run-store.mjs#attempts]",
          "actuator: [command:work:next]", "cadence: event:per-item", "ceiling: none",
          "owner: actor:product-owner", "optimizing: false", "---", "# solo", "",
        ].join("\n"),
      });
      try {
        const registry = await loadLoops(fixture.workDir);
        assert.deepEqual(registry.findings, [], "a loop declaring no layer and no inbound edge is a clean LOAD — the schema requires neither");
        const reported = checkReferenceOwnership(registry).map((finding) => finding.code).sort();
        assert.deepEqual(reported, ["loop-layer-undeclared", "loop-unowned-reference"], "…and both requirements arrive as findings over the model instead");
        assert.deepEqual(checkActuatorArbitration(registry), [], "arbitration is required of nothing until two loops actually contend");
      } finally {
        await fixture.cleanup();
      }
    },
  },
  {
    // 59/FF-5907 — EXTENDING 52's purity guard for the fourth time, and this is the story that could
    // most easily have broken it: four judgments about TIME, in a module that may not read a clock.
    //
    // The extension has four legs, and none of them restates the three above:
    //   (a) NO DATE LITERAL AND NO DURATION LITERAL. Not "no `Date.now()`" — that is the leg 52
    //       already holds — but that the module contains no ISO date, no `Date` reference of any
    //       kind, and no numeric literal large enough to BE a duration. A window is handed in on the
    //       call; converting `work.audit.anchorStaleDays` into one is the impure command edge's
    //       arithmetic (ADR-005 §2/§4).
    //   (b) EVERY FRESHNESS AND SILENCE COMPARISON RIDES ON THE CALL, decided behaviourally rather
    //       than by grep: the same model at two handed-in instants answers differently, and a call
    //       with no instant or no window is REFUSED rather than defaulted to a guessed one.
    //   (c) ABSENCE IS COMPUTED, NEVER SELF-DECLARED — no kind admits a key by which a node asserts
    //       its own liveness, freshness, consultation or audit status. This is 55/ADR-002 §2's rule
    //       applied to four more requirements: a key a record could fill in to clear a finding is a
    //       finding that is satisfiable by fabrication.
    //   (d) SEVERITY RESOLVES THROUGH A TABLE, with no literal at a construction site.
    name: "arch/59 FF-5907: the checks leaf holds no clock, no date and no duration, and absence is computed rather than self-declared",
    run: async () => {
      const source = await readFile(checksPath, "utf8");
      const checksSource = stripComments(source);
      await assertFamilyPurity(assert, root, "src/work/loops-checks");
      assert.doesNotMatch(checksSource, /node:fs|readFile|readdir|access\s*\(|stat\s*\(|process\.cwd|\bfetch\s*\(|\bimport\s*\(/u);

      // (a) NO DATE AND NO CLOCK, IN ANY SPELLING. `performance.now()` is the one that matters here:
      // 52's leg matches `Date.now(` and `new Date()`, and a `\bDate\b` sweep adds nothing against a
      // monotonic clock. A lane that read one would be non-deterministic in exactly the way this
      // whole file exists to prevent, and every other assertion would stay green.
      assert.doesNotMatch(checksSource, /\bDate\b/u, "the module names `Date` nowhere — not `now`, not `parse`, not `UTC`");
      assert.doesNotMatch(checksSource, /\bperformance\b|\bhrtime\b|process\.uptime/u, "…and reaches no monotonic clock either");
      assert.doesNotMatch(checksSource, /\b\d{4}-\d{2}-\d{2}\b/u, "…and holds no date literal");
      assert.doesNotMatch(checksSource, /\b(?:hours?|minutes?|seconds?|millis(?:econds?)?|days?|weeks?)\s*[:=]/iu, "…and no unit table by another name");

      // NO DURATION LITERAL. The decimal-magnitude rule is the braces: every duration in this system
      // is milliseconds, so a numeric literal at or above a thousand IS one, and the two the module
      // is allowed — a separation ratio and a cycle count — are ordinals far below it.
      //
      // THESE FOUR ARE THE BELT, and each was measured walking past the magnitude rule alone: the
      // lookbehind stops at the `e` of `36e5` (an hour) and `864e5` (a day) so only the mantissa is
      // ever read; `0x5265c00` is read as the digit `0`; `86_400_000n` is a BigInt; and
      // `24 * 60 * 60 * 10 * 100` is a day spelled in five numbers none of which reaches the floor.
      // Every detector is driven against its own planted sample first, so none of them is a dead
      // pattern that would pass over anything (m45/R5 — a fitness function must check what it claims).
      const NOTATIONS = [
        { what: "exponential notation", pattern: /(?<![\w.$])\d[\d_]*(?:\.\d+)?[eE][+-]?\d+/u, planted: "const HOUR_MS = 36e5;" },
        { what: "hex, octal or binary notation", pattern: /(?<![\w.$])0[xXoObB][0-9a-fA-F_]+/u, planted: "const DAY_MS = 0x5265c00;" },
        { what: "a BigInt literal", pattern: /(?<![\w.$])\d[\d_]*n\b/u, planted: "const DAY_MS = 86_400_000n;" },
        { what: "a product of numeric literals", pattern: /(?<![\w.$])\d[\d_]*\s*\*\s*\d/u, planted: "const DAY_MS = 24 * 60 * 60 * 10 * 100;" },
      ];
      for (const notation of NOTATIONS) {
        assert.match(notation.planted, notation.pattern, `${notation.what}: the detector matches its own planted sample`);
        assert.doesNotMatch(checksSource, notation.pattern, `…and the module contains no ${notation.what}`);
      }

      const literals = [...checksSource.matchAll(/(?<![\w.$])(\d[\d_]*(?:\.\d+)?)/gu)].map((match) => Number(match[1].replaceAll("_", "")));
      assert.ok(literals.length > 0, "non-vacuous: the module does contain numeric literals");
      assert.deepEqual(literals.filter((value) => value >= 1_000), [], "no numeric literal is large enough to be a duration in milliseconds");

      // THE THRESHOLD HAS ONE HOME (`02_a-metric-that-has-not-moved.feature`: "no check states it as
      // a literal of its own"). The number appears exactly once in the whole module — at its
      // declaration — so a second check spelling it would fail here.
      assert.equal(
        literals.filter((value) => value === UNMOVED_CYCLES).length, 1,
        `the unmoved-cycles threshold (${UNMOVED_CYCLES}) is spelled exactly once, at its declaration`,
      );
      assert.match(checksSource, new RegExp(`export const UNMOVED_CYCLES = ${UNMOVED_CYCLES}\\b`, "u"), "…and that one place is an exported declaration");

      // (b) THE CLOCK AND THE WINDOW ARRIVE ON THE CALL, decided over behaviour.
      const anchorAt = (ms) => ({
        id: "anchor:soak", kind: "anchor", title: "soak", path: path.join(root, "soak.md"),
        fields: {
          ground: { kind: "enum", value: "process-exit" },
          observes: { kind: "pointer", raw: "module:src/run-store.mjs#attempts" },
          checked: { kind: "date", raw: "2026-01-01", ms },
        },
        edges: {},
      });
      const WINDOW = 90 * 86_400_000;
      const NOW = Date.UTC(2026, 7, 30);
      const subject = { source: path.join(root, "loops"), present: true, findings: [], nodes: [anchorAt(NOW - WINDOW - 1)] };
      assert.equal(assessAnchorFreshness(subject, { now: NOW, window: WINDOW }).anchors[0].verdict, "stale");
      assert.equal(assessAnchorFreshness(subject, { now: NOW - WINDOW, window: WINDOW }).anchors[0].verdict, "fresh",
        "the SAME model at an earlier handed-in instant is fresh — the answer is a function of the argument and of nothing ambient");
      assert.equal(assessAnchorFreshness(subject, { now: NOW, window: WINDOW * 2 }).anchors[0].verdict, "fresh",
        "…and of the handed-in window, which is why widening it changes the verdict");
      for (const incomplete of [{}, { now: NOW }, { window: WINDOW }, { now: "yesterday", window: WINDOW }]) {
        assert.throws(() => assessAnchorFreshness(subject, incomplete), TypeError,
          `an incomplete freshness argument is REFUSED rather than defaulted to a guessed window: ${JSON.stringify(incomplete)}`);
      }
      const instrument = (reading) => [{
        id: "watcher:rate", path: path.join(root, "rate.md"),
        cadence: { kind: "periodic", ms: 86_400_000, raw: "periodic:1d" }, reading,
      }];
      assert.equal(assessInstrumentSilence(instrument({ at: NOW - 86_400_000 * 3 }), { now: NOW, root: "r" }).instruments[0].verdict, "silent");
      assert.equal(assessInstrumentSilence(instrument({ at: NOW - 86_400_000 * 3 }), { now: NOW - 86_400_000 * 3, root: "r" }).instruments[0].verdict, "heard",
        "silence rides on the handed-in instant exactly as freshness does");
      assert.throws(() => assessInstrumentSilence(instrument({ at: NOW }), { root: "r" }), TypeError, "…and a silence sweep with no instant is refused");

      // (c) NO KIND ADMITS A KEY BY WHICH A NODE ASSERTS ITS OWN LIVENESS.
      for (const key of ["fresh", "live", "consulted", "audited-by", "last-run", "stale", "silent", "unmoved"]) {
        assert.equal(ADMITTED_KEYS.all.has(key), false, `${key}: no kind admits a key by which a node asserts its own freshness or use`);
        for (const kind of NODE_KINDS) assert.equal(ADMITTED_KEYS[kind].has(key), false, `${kind} does not admit ${key}`);
      }
      // …AND THE ONE KEY THAT IS ADMITTED IS A DATE, NOT A VERDICT. `checked:` says WHEN, and the
      // window decides what that means; an anchor cannot declare itself fresh.
      assert.equal(ADMITTED_KEYS.anchor.has("checked"), true, "an anchor declares WHEN it was checked…");
      const undated = { ...subject, nodes: [{ ...anchorAt(0), fields: { ...anchorAt(0).fields, checked: undefined } }] };
      assert.equal(assessAnchorFreshness(undated, { now: NOW, window: WINDOW }).anchors[0].verdict, "undated",
        "…and an anchor that declared no date is UNDATED — a third state, not a silent pass and not inherited red");

      // (d) SEVERITY IS A PROPERTY OF THE CODE, IN A TABLE.
      assert.doesNotMatch(checksSource, /severity:\s*["'`]/u, "no construction site in the module spells a severity literal");
      const consulted = assessLoopConsultation(
        { source: path.join(root, "loops"), present: true, findings: [], nodes: [] }, { executions: [] },
      );
      const silent = assessInstrumentSilence([], { now: NOW, root: path.join(root, "loops") });
      const byCode = new Map();
      for (const entry of [...consulted.findings, ...silent.findings, ...assessAnchorFreshness(subject, { now: NOW, window: WINDOW }).findings]) {
        const seen = byCode.get(entry.code);
        assert.ok(seen === undefined || seen === entry.severity, `${entry.code}: one severity, whatever the lane that constructed it`);
        byCode.set(entry.code, entry.severity);
      }
      assert.equal(byCode.get("audit-ran-on-nothing"), "error", "a sweep that looked at nothing gates…");
      assert.equal(byCode.get("anchor-stale"), "warn", "…and a stale anchor degrades a verdict rather than failing a build");
      assert.ok(byCode.size >= 2, "non-vacuous: the table was consulted for more than one code");

      // (e) THE THRESHOLD'S HOME SURVIVES ITS OWN ESCAPE HATCH. `assessMetricMovement` takes an
      // optional `cycles` so the number can be argued with — that is what makes `UNMOVED_CYCLES` a
      // knob rather than a coincidence, and the behavioural suite drives a lower one. But an argument
      // nothing gates is a second home reached by another route, so: no module under `src/` supplies
      // one, and the detector is driven against a planted call first.
      assert.match(
        "assessMetricMovement(counters, { root, cycles: 5 })", /assessMetricMovement\s*\([^;]*\bcycles\b/u,
        "the caller detector matches a planted call that supplies its own threshold",
      );
      const supplying = [];
      for (const file of await sourceFiles(path.join(root, "src"))) {
        if (file === checksPath) continue;
        const text = stripComments(await readFile(file, "utf8"));
        if (/assessMetricMovement\s*\([^;]*\bcycles\b/u.test(text)) supplying.push(path.relative(root, file));
      }
      assert.deepEqual(supplying, [], "…and no module under src/ supplies its own unmoved-cycles threshold");
    },
  },
  {
    // 59/FF-5907 — THE FOUR AUDIT LANES ARE ARGUMENTS-IN / RESULT-OUT AND DETERMINISTIC, in process
    // and in a fresh one. FF-5205 drives the six `check*` functions exactly this way and stops there,
    // so the four `assess*` lanes shipped outside the only leg that can catch ambient state: a cached
    // clock, a module-level accumulator or a locale-dependent comparison would all be invisible to a
    // source sweep and to a single in-process call.
    name: "arch/59 FF-5907: every audit lane is arguments-in/result-out and byte-stable in-process and in a fresh process",
    run: async () => {
      const SOURCE = path.join(root, "audit-determinism-fixture-not-on-disk", "loops");
      const anchorNode = {
        id: "anchor:soak", kind: "anchor", title: "soak", path: path.join(SOURCE, "soak.md"),
        fields: {
          ground: { kind: "enum", value: "process-exit" },
          observes: { kind: "pointer", raw: "module:src/run-store.mjs#attempts" },
          checked: { kind: "date", raw: "2026-01-01", ms: 1_767_225_600_000 },
        },
        edges: { "data-feed": [{ raw: "loop:guarded", scheme: "loop", operand: "guarded", resolved: true }] },
      };
      const loopNode = {
        id: "loop:guarded", kind: "loop", title: "guarded", path: path.join(SOURCE, "guarded.md"),
        fields: { optimizing: { kind: "flag", value: false } }, edges: {},
      };
      // `loop:forgotten` is here so the CONSULTATION lane reports something too — the non-vacuity
      // assertion below is what stops this whole case being byte-stability over four empty results.
      const forgottenNode = {
        id: "loop:forgotten", kind: "loop", title: "forgotten", path: path.join(SOURCE, "forgotten.md"),
        fields: { optimizing: { kind: "flag", value: false } }, edges: {},
      };
      const registry = { source: SOURCE, present: true, findings: [], nodes: [anchorNode, loopNode, forgottenNode] };
      const NOW = 1_782_777_600_000;
      const WINDOW = 7_776_000_000;

      const DRIVES = [
        { name: "assessAnchorFreshness", args: [registry, { now: NOW, window: WINDOW }] },
        {
          name: "assessInstrumentSilence",
          args: [[
            { id: "watcher:rate", path: path.join(SOURCE, "rate.md"), cadence: { kind: "periodic", ms: 3_600_000, raw: "periodic:1h" }, reading: { at: NOW - 90_000_000 } },
            { id: "loop:build", path: path.join(SOURCE, "build.md"), cadence: { kind: "event", trigger: "per-item", raw: "event:per-item" }, reading: { occurrences: 2 } },
            { id: "channel:feedback", path: path.join(SOURCE, "feedback.md"), cadence: { kind: "unknown", raw: "unknown" }, reading: null },
          ], { now: NOW, root: SOURCE }],
        },
        {
          name: "assessMetricMovement",
          args: [[
            { id: "watcher:rate", path: path.join(SOURCE, "rate.md"), counter: "interventions", readings: Array.from({ length: UNMOVED_CYCLES }, () => 7) },
            { id: "watcher:moving", path: path.join(SOURCE, "moving.md"), counter: "runs", readings: [1, 2, 3] },
          ], { root: SOURCE }],
        },
        { name: "assessLoopConsultation", args: [registry, { executions: [] }] },
      ];

      const lanes = { assessAnchorFreshness, assessInstrumentSilence, assessMetricMovement, assessLoopConsultation };
      const inProcess = {};
      for (const drive of DRIVES) {
        const lane = lanes[drive.name];
        assert.equal(lane.length, 2, `${drive.name}: exactly two parameters — the population and the observation, both handed in`);
        const before = JSON.stringify(drive.args);
        inProcess[drive.name] = lane(...drive.args);
        assert.equal(JSON.stringify(drive.args), before, `${drive.name}: the arguments it was handed are not mutated`);
        assert.equal(JSON.stringify(lane(...drive.args)), JSON.stringify(inProcess[drive.name]), `${drive.name}: repeated invocation is byte-identical`);
        assert.ok(Array.isArray(inProcess[drive.name].findings), `${drive.name}: returns findings…`);
        assert.ok(inProcess[drive.name].read != null, `${drive.name}: …and a read record`);
      }
      // NON-VACUITY: the fixtures above actually make every lane say something.
      assert.ok(
        DRIVES.every((drive) => inProcess[drive.name].findings.length > 0),
        "every lane reports at least one finding over these fixtures, so byte-stability is a claim about real output",
      );

      // THE FRESH PROCESS. A cached clock or a warm module-level accumulator survives a repeat call
      // in one process; it cannot survive a new one.
      const moduleUrl = pathToFileURL(checksPath).href;
      const script = `import * as m from ${JSON.stringify(moduleUrl)};`
        + `const drives=${JSON.stringify(DRIVES)};`
        + "console.log(JSON.stringify(Object.fromEntries(drives.map((d)=>[d.name,m[d.name](...d.args)]))));";
      const { stdout } = await runFile(process.execPath, ["--input-type=module", "--eval", script]);
      assert.equal(stdout.trim(), JSON.stringify(inProcess), "…and a newly started process produces the same bytes");
    },
  },
];

/** Every `.mjs` under a root, sorted — the caller sweep's population. */
async function sourceFiles(root_) {
  const found = [];
  for (const entry of await readdir(root_, { withFileTypes: true })) {
    const full = path.join(root_, entry.name);
    if (entry.isDirectory()) found.push(...await sourceFiles(full));
    else if (entry.name.endsWith(".mjs")) found.push(full);
  }
  return found.sort();
}
