import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import * as loopEngine from "../../src/work/loop.mjs";
import {
  WORK_LOOP_STORY_FIXTURE_FAMILIES,
  WORK_LOOP_STORY_FIXTURES,
} from "../support/work-loop-story-fixtures.mjs";

const { LOOP_STOPS, decideLoop } = loopEngine;

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const modulePath = path.join(here, "..", "..", "src", "work", "loop.mjs");
const fixture = {
  scope: "53",
  level: "L2",
  cap: 3,
  next: { state: "ready", ref: "53/01", type: "story", status: "in-progress" },
  tasks: { tasks: [{ counts: { uat: 0, executable: 4 }, file: "00.feature" }] },
  gate: { findings: [{ z: 1, a: "red" }] },
  cycle: 1,
};

const supplementalFixtures = [
  { name: "composite", fn: "decideLoop", args: [fixture] },
  { name: "scope-refusal", fn: "decideLoopScope", args: [{ z: [2, 1], a: "bad" }] },
  { name: "leading-zero-scope", fn: "decideLoopScope", args: ["007"] },
  { name: "leading-zero-inclusion", fn: "loopScopeIncludes", args: ["007", "7/01"] },
  { name: "level-refusal", fn: "resolveLoopLevel", args: [["L4"]] },
  { name: "bound", fn: "resolveLoopBound", args: [5] },
  { name: "stop", fn: "decideLoopAction", args: [{ signal: "SIGTERM", next: { ref: "53/01" } }] },
  { name: "store-refusal", fn: "mapStoreRefusal", args: [{ code: "retry-parked", readyAt: { iso: "later" } }] },
  { name: "declaration", fn: "buildLoopDeclaration", args: [{ loopRunId: "lr-7", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 2, startedAt: "supplied", id: "loop:autonomous-cascade" }] },
  { name: "declaration-read", fn: "readLoopDeclaration", args: [[{ runId: "r", createdAt: "supplied", brief: { loop: { loopRunId: "lr-7", scope: "53", level: "L2", cap: 3, startedAt: "supplied" } } }]] },
  { name: "resume", fn: "resolveLoopResume", args: [{ scope: "53", declaration: { loopRunId: "lr-7", scope: "50-53", level: "L1", cap: 3, startedAt: "supplied", phase: "continue", cycle: 2 } }] },
];

const fixtureMatrix = [
  ...WORK_LOOP_STORY_FIXTURES.map(({ family, name, fn, args }) => ({ family, name, fn, args })),
  ...supplementalFixtures.map((entry) => ({ family: "determinism", ...entry })),
];

function matrixDecision(fixtures = fixtureMatrix) {
  return {
    decisions: fixtures.map(({ family, name, fn, args }) => ({ family, name, result: loopEngine[fn](...args) })),
    vocabularies: {
      stops: loopEngine.LOOP_STOPS,
      scopeForms: loopEngine.LOOP_SCOPE_FORMS.map(({ id }) => id),
      levels: loopEngine.LOOP_LEVELS,
    },
  };
}

async function freshDecisions(target, fixtures, options = {}) {
  const source = `const NativeDate=Date;\nconst fixed=Number(process.env.AOF_LOOP_TEST_NOW);\nif(Number.isFinite(fixed)){globalThis.Date=class FixedDate extends NativeDate{constructor(...args){super(...(args.length===0?[fixed]:args));}static now(){return fixed;}};}\nconst subject=await import(${JSON.stringify(pathToFileURL(target).href)});\nconst fixtures=JSON.parse(process.argv[1]);\nconst evidence={decisions:fixtures.map(({family,name,fn,args})=>({family,name,result:subject[fn](...args)})),vocabularies:{stops:subject.LOOP_STOPS,scopeForms:subject.LOOP_SCOPE_FORMS.map(({id})=>id),levels:subject.LOOP_LEVELS}};\nprocess.stdout.write(JSON.stringify(evidence));`;
  const { stdout } = await execFileAsync(process.execPath, ["--input-type=module", "--eval", source, JSON.stringify(fixtures)], options);
  return stdout;
}

export const workLoopDeterminismTests = [
  {
    name: "loop determinism — the shared corpus covers and replays every behavioral fixture family",
    run() {
      assert.deepEqual(
        [...new Set(WORK_LOOP_STORY_FIXTURES.map(({ family }) => family))],
        WORK_LOOP_STORY_FIXTURE_FAMILIES,
      );
      for (const { name, fn, args, expected } of WORK_LOOP_STORY_FIXTURES) {
        assert.deepEqual(loopEngine[fn](...args), expected, name);
      }
    },
  },
  {
    name: "loop determinism — repeated calls are byte-identical and never mutate input",
    run() {
      const before = JSON.stringify(fixture);
      const first = decideLoop(fixture);
      const second = decideLoop(fixture);
      assert.equal(JSON.stringify(first), JSON.stringify(second));
      assert.equal(JSON.stringify(fixture), before);
      first.stops.pop();
      first.act.findings.push({ planted: true });
      assert.deepEqual(second.stops, LOOP_STOPS);
      assert.deepEqual(second.act.findings, [{ a: "red", z: 1 }]);
    },
  },
  {
    name: "loop determinism — ten fresh processes with varied locales and minute-spaced clocks decide identically",
    async run() {
      const temp = await mkdtemp(path.join(tmpdir(), "aof-loop-determinism-"));
      try {
        const expected = JSON.stringify(matrixDecision());
        const environments = Array.from({ length: 10 }, (_, index) => ({
          ...process.env,
          TZ: ["UTC", "Asia/Tokyo", "Europe/London"][index % 3],
          LANG: ["C", "ja_JP.UTF-8", "fr_FR.UTF-8"][index % 3],
          AOF_LOOP_TEST_NOW: String(Date.UTC(2026, 7, 15, 1, index, 0)),
        }));
        // Real sleeping would make this suite slow and probabilistic. Each isolated process
        // instead observes a fixed wall clock exactly one minute after the process before it.
        const observedClocks = environments.map(({ AOF_LOOP_TEST_NOW }) => Number(AOF_LOOP_TEST_NOW));
        assert.equal(new Set(observedClocks).size, 10);
        for (let index = 1; index < observedClocks.length; index += 1) {
          assert.equal(observedClocks[index] - observedClocks[index - 1], 60_000);
        }
        const outputs = await Promise.all(environments.map((env) => (
          freshDecisions(modulePath, fixtureMatrix, { cwd: temp, env })
        )));
        assert.equal(outputs.length, 10);
        for (const output of outputs) assert.equal(output, expected);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "loop determinism — the module copied alone decides with every source dependency absent",
    async run() {
      const temp = await mkdtemp(path.join(tmpdir(), "aof-loop-alone-"));
      try {
        const src = path.join(temp, "src");
        // 119/01 — the module lives at `src/work/loop.mjs`, so the lone copy needs its family
        // directory. The point of the fixture is unchanged: one module, no source dependency.
        await mkdir(path.join(src, "work"), { recursive: true });
        const copied = path.join(src, "work/loop.mjs");
        await copyFile(modulePath, copied);
        assert.equal(await freshDecisions(copied, fixtureMatrix, { cwd: temp }), JSON.stringify(matrixDecision()));
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "loop determinism — input key order cannot change output key order",
    run() {
      const reversed = Object.fromEntries(Object.entries(fixture).reverse());
      reversed.next = Object.fromEntries(Object.entries(fixture.next).reverse());
      reversed.gate = { findings: [{ a: "red", z: 1 }] };
      assert.equal(JSON.stringify(decideLoop(reversed)), JSON.stringify(decideLoop(fixture)));
    },
  },
  {
    name: "loop determinism — outputs contain no generated id, timestamp, or path",
    run() {
      const text = JSON.stringify(decideLoop(fixture));
      assert.doesNotMatch(text, /[A-Z]:\\|\/tmp\/|T\d\d:\d\d:\d\d|random|uuid/i);
      assert.deepEqual(decideLoop(fixture).stops, LOOP_STOPS);
    },
  },
];
