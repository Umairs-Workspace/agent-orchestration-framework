import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripComments } from "../support/source-slice.mjs";
import {
  LOOP_REFUSALS,
  buildLoopDeclaration,
  readLoopDeclaration,
  resolveLoopResume,
} from "../../src/work/loop.mjs";
import { workLoopStoryFixturesFor } from "../support/work-loop-story-fixtures.mjs";

const loop = (overrides = {}) => ({
  loopRunId: "lr-7",
  scope: "53",
  level: "L2",
  cap: 3,
  phase: "continue",
  cycle: 2,
  startedAt: "2026-08-15T00:52:42.569Z",
  // 102/00 - the eighth key, appended last. The seven above keep their names, values and
  // order, which is what makes this a supersession by APPEND rather than a reshape.
  id: "loop:autonomous-cascade",
  ...overrides,
});
const run = (runId, createdAt, declaration = loop()) => ({ runId, createdAt, brief: { loop: declaration } });
const l3Gate = {
  loopReady: { score: 100, clears: "L3" },
  groundedness: { present: true, state: "reported", components: [] },
};

export const workLoopDeclarationTests = [
  {
    name: "loop declaration — the shared story fixtures stay executable",
    run() {
      const functions = { buildLoopDeclaration, resolveLoopResume };
      for (const { name, fn, args, expected } of workLoopStoryFixturesFor("declaration")) {
        assert.deepEqual(functions[fn](...args), expected, name);
      }
    },
  },
  {
    // 102/00 - Scenario: the envelope carries eight keys and the original seven are where they were
    // SUPERSEDED IN ITS COUNT by 126/02 (ADR-004 §5): the ninth key, `supervised`, is appended
    // last by the same additive-supersession discipline 102/00 used for the eighth. The eight
    // before it keep their names, order and values, which is what the slice below still asserts.
    name: "loop declaration — envelope has exactly nine ordered input-owned keys, supervision last",
    run() {
      const input = { ...loop(), ref: "53/01", path: "x", cursor: 2, index: 4, lastRef: "52" };
      const result = buildLoopDeclaration(input);
      assert.deepEqual(Object.keys(result), ["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id", "supervised"]);
      // The original seven, in their original order and holding their original values - read off
      // THIS result rather than restated, so a reorder or a value change is what fails.
      assert.deepEqual(Object.keys(result).slice(0, 7), ["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt"]);
      assert.deepEqual(result, { ...loop(), supervised: false });
      assert.deepEqual(Object.keys(result).slice(0, 8), ["loopRunId", "scope", "level", "cap", "phase", "cycle", "startedAt", "id"]);
      assert.equal(Object.keys(result).at(-1), "supervised");
      // No TENTH key for any input, including inputs the engine is handed and must ignore.
      assert.equal(Object.keys(result).length, 9);
      for (const key of ["ref", "path", "cursor", "index", "lastRef"]) assert.equal(key in result, false);
      assert.equal(buildLoopDeclaration({ ...input, scope: "53/02" }).code, "loop-scope-unsupported");
      assert.equal(buildLoopDeclaration({ ...input, level: "L3" }).code, "loop-level-gate");
      assert.equal(buildLoopDeclaration({ ...input, level: "L3", l3Gate }).level, "L3");
      assert.equal(buildLoopDeclaration({ ...input, cap: undefined }).code, "loop-bound-unresolved");
    },
  },
  {
    // 102/00 - Scenario: the eighth key serialises last, in every process. The cross-PROCESS half
    // is `work-loop-determinism`, which runs this same fixture in a child process; what is pinned
    // here is that the serialised order is the insertion order and that it ends with the new key.
    name: "loop declaration — the loop id serialises last and two builds are byte-identical",
    run() {
      const first = JSON.stringify(buildLoopDeclaration(loop()));
      const second = JSON.stringify(buildLoopDeclaration(loop()));
      assert.equal(first, second);
      assert.equal(first.endsWith('"id":"loop:autonomous-cascade","supervised":false}'), true, first);
    },
  },
  {
    // 102/00 - Scenario: the loop id is an input, carried through verbatim
    //          Scenario: the id is checked for SHAPE, never for registry membership
    name: "loop declaration — the loop id is carried verbatim and never checked against a registry",
    run() {
      for (const id of ["loop:autonomous-cascade", "loop:no-such-loop", "not-even-a-scheme"]) {
        assert.equal(buildLoopDeclaration(loop({ id })).id, id, `carried verbatim: ${id}`);
      }
      // The engine minted no id of its own: an id it was not given is a refusal, never a default.
      assert.equal(buildLoopDeclaration(loop({ id: undefined })).code, "loop-id-missing");

      // 102/01 - Scenario: the id is not derived from the invocation. Asserted HERE as well as over
      // two driven loops (`test/loop/loop-command-board-state.test.mjs`), because the engine is where
      // `level` can actually be varied across all three values: L1 mints no run at all and L3 needs
      // a gate, so a driven-loop comparison cannot vary it. Neither `scope` nor `level` moves the id.
      const invariant = [
        { scope: "53", level: "L1" },
        { scope: "53", level: "L2" },
        { scope: "53", level: "L3", l3Gate },
        { scope: "50-53", level: "L1" },
        { scope: "50-53", level: "L3", l3Gate },
      ].map((invocation) => buildLoopDeclaration(loop(invocation)));
      assert.deepEqual([...new Set(invariant.map((entry) => entry.id))], ["loop:autonomous-cascade"]);
      for (const entry of invariant) {
        assert.equal(entry.id.includes(entry.scope), false, "the scope does not appear in the id");
        assert.equal(entry.id.includes(entry.level), false, "the level does not appear in the id");
      }
      // And it consulted no registry to decide any of the above - the module reaches no import and
      // names no registry path at all, so "membership is not the engine's question" holds
      // structurally rather than by inspection of one code path.
      // COMMENTS STRIPPED FIRST. The claim is about what the engine DOES, and the comment above
      // `resolveLoopId` names `.aof/loops/` while explaining why the engine never opens it - a
      // check that read the prose would fail on its own explanation.
      const source = stripComments(readFileSync(new URL("../../src/work/loop.mjs", import.meta.url), "utf8"));
      assert.equal(/^\s*import\s/mu.test(source), false, "the engine imports nothing");
      assert.equal(source.includes(".aof/loops"), false, "the engine names no registry path");
      assert.equal(/node:fs|readFile|loadLoops/u.test(source), false, "the engine opens no file");
    },
  },
  {
    // 102/00 - Scenario: a declaration cannot be built without a loop id
    name: "loop declaration — an absent, empty or non-string loop id is refused, naming the missing id",
    run() {
      for (const id of [undefined, null, "", 42, {}, ["loop:autonomous-cascade"]]) {
        const result = buildLoopDeclaration(loop({ id }));
        assert.equal(result.code, "loop-id-missing", `refused: ${JSON.stringify(id)}`);
        assert.equal(result.field, "id");
        assert.equal("loopRunId" in result, false, "no envelope is built");
        assert.equal(LOOP_REFUSALS.includes(result.code), true, "the refusal is a declared member");
      }
    },
  },
  {
    // 102/00 - Scenario: an earlier guard still decides first
    name: "loop declaration — the missing-id refusal never masks a guard that was already deciding",
    run() {
      const noId = { ...loop() };
      delete noId.id;
      assert.equal(buildLoopDeclaration({ ...noId, scope: "53/02" }).code, "loop-scope-unsupported");
      assert.equal(buildLoopDeclaration({ ...noId, level: "L4" }).code, "loop-level-unknown");
      assert.equal(buildLoopDeclaration({ ...noId, level: "L3" }).code, "loop-level-gate");
      assert.equal(buildLoopDeclaration({ ...noId, cap: undefined }).code, "loop-bound-unresolved");
      assert.equal(buildLoopDeclaration({ ...noId, cycle: 0 }).code, "loop-bound-unresolved");
      // ...and with every earlier guard satisfied, the id guard is the one that answers.
      assert.equal(buildLoopDeclaration(noId).code, "loop-id-missing");
    },
  },
  {
    // 102/00 - Scenario: the resume reader still recovers exactly five keys
    //          Scenario: a run minted before this change still resumes
    // 126/02 (ADR-004 §5): the projection gains a SIXTH key. The usability requirement stays at
    // FIVE, which is what keeps every record already on disk readable — and each of them
    // recovers with `supervised` false, the opt-in failing closed.
    name: "loop declaration — resume recovers the same six keys from a nine-key and a legacy seven-key record",
    run() {
      const eight = readLoopDeclaration([run("run-a", "2026-08-15T01:00:00.000Z", loop())]);
      assert.deepEqual(Object.keys(eight), ["loopRunId", "scope", "level", "cap", "startedAt", "supervised"]);
      assert.equal(eight.supervised, false, "a record that names no supervision recovers as unsupervised");
      assert.equal("id" in eight, false, "the recovered declaration carries no id");
      assert.equal("phase" in eight, false);
      assert.equal("cycle" in eight, false);

      // A run minted BEFORE the eighth key existed - the ordinary case for every one of this
      // repository's pre-102 run records. Its absent id makes no difference to what resume gets.
      const legacy = { ...loop() };
      delete legacy.id;
      const recovered = readLoopDeclaration([run("run-legacy", "2026-08-15T01:00:00.000Z", legacy)]);
      assert.deepEqual(recovered, eight, "a legacy seven-key declaration recovers identically");
      const resumed = resolveLoopResume({ scope: "53", declaration: recovered });
      assert.equal(resumed.resumed, true);
      assert.equal(resumed.level, "L2");
      assert.equal(resumed.cap, 3);
      assert.equal(resumed.loopRunId, "lr-7");
      assert.equal(resumed.startedAt, "2026-08-15T00:52:42.569Z");
    },
  },
  {
    name: "loop declaration — reader chooses the latest complete declaration with code-unit tie break",
    run() {
      const runs = [
        run("run-c", "2026-08-15T02:00:00.000Z", loop({ loopRunId: "lr-2" })),
        run("run-a", "2026-08-15T03:00:00.000Z", loop({ loopRunId: "lr-a" })),
        run("run-b", "2026-08-15T03:00:00.000Z", loop({ loopRunId: "lr-b" })),
      ];
      assert.deepEqual(readLoopDeclaration(runs), {
        loopRunId: "lr-b", scope: "53", level: "L2", cap: 3, startedAt: "2026-08-15T00:52:42.569Z", supervised: false,
      });
      assert.deepEqual(readLoopDeclaration([...runs].reverse()), readLoopDeclaration(runs));
    },
  },
  {
    name: "loop declaration — malformed and partial records are skipped rather than merged",
    run() {
      const complete = run("run-a", "2026-08-15T01:00:00.000Z");
      const partial = run("run-b", "2026-08-15T02:00:00.000Z", loop({ cap: undefined }));
      const malformed = { runId: "run-c", createdAt: "2026-08-15T03:00:00.000Z", brief: {} };
      assert.equal(readLoopDeclaration([]), null);
      assert.equal(readLoopDeclaration([malformed, partial]), null);
      const fragments = [
        run("fragment-a", "2026-08-15T01:00:00.000Z", loop({ loopRunId: undefined })),
        run("fragment-b", "2026-08-15T02:00:00.000Z", loop({ level: undefined })),
        run("fragment-c", "2026-08-15T03:00:00.000Z", loop({ cap: undefined })),
      ];
      assert.equal(readLoopDeclaration(fragments), null);
      assert.deepEqual(readLoopDeclaration([complete, partial, malformed]), {
        loopRunId: "lr-7", scope: "53", level: "L2", cap: 3, startedAt: "2026-08-15T00:52:42.569Z", supervised: false,
      });
    },
  },
  {
    name: "loop declaration — resume inherits only declaration fields and explicit values win",
    run() {
      const declaration = readLoopDeclaration([run("run-a", "2026-08-15T01:00:00.000Z", loop({ level: "L1", scope: "50-53" }))]);
      const inherited = resolveLoopResume({ scope: "53", declaration });
      assert.equal(inherited.level, "L1");
      assert.equal(inherited.cap, 3);
      assert.equal(inherited.loopRunId, "lr-7");
      assert.equal(inherited.startedAt, "2026-08-15T00:52:42.569Z");
      assert.equal(inherited.priorScope, "50-53");
      assert.deepEqual(inherited.source, { level: "inherited", cap: "inherited" });
      assert.equal("phase" in inherited, false);
      assert.equal("cycle" in inherited, false);
      const overridden = resolveLoopResume({ scope: "53", declaration, level: "L2", cap: 5 });
      assert.equal(overridden.level, "L2");
      assert.equal(overridden.cap, 5);
      assert.deepEqual(overridden.source, { level: "overridden", cap: "overridden" });
      assert.equal(resolveLoopResume({ scope: "53", declaration, level: "L3" }).level, "L3");
    },
  },
  {
    name: "loop declaration — no prior declaration is null and ordinary cap resolution still fails closed",
    run() {
      assert.equal(readLoopDeclaration([{ runId: "x", brief: {} }]), null);
      assert.deepEqual(resolveLoopResume({ scope: "53", runs: [], cap: 3 }), {
        resumed: false,
        // 126/02: supervision resolves like level and cap — explicit wins, absent inherits — and
        // with nothing to inherit from it is the default, which is off.
        supervised: false,
        loopRunId: null,
        scope: "53",
        priorScope: null,
        level: "L2",
        cap: 3,
        startedAt: null,
        source: { level: "default", cap: "overridden" },
        lastDeclaration: null,
        message: "No prior loop declaration exists for scope 53.",
      });
      const result = resolveLoopResume({ scope: "53", runs: [] });
      assert.equal(result.code, "loop-bound-unresolved");
      assert.equal(result.field, "cap");
    },
  },
  {
    name: "loop declaration — reader and resume return independent defensive copies with no position",
    run() {
      const declaration = loop({
        loopRunId: { id: ["lr-7"] },
        startedAt: { iso: ["supplied"] },
      });
      const sourceRun = run("run-a", "2026-08-15T01:00:00.000Z", declaration);
      const firstRead = readLoopDeclaration([sourceRun]);
      const secondRead = readLoopDeclaration([sourceRun]);
      firstRead.loopRunId.id.push("changed");
      assert.deepEqual(declaration.loopRunId, { id: ["lr-7"] });
      assert.deepEqual(secondRead.loopRunId, { id: ["lr-7"] });

      const first = resolveLoopResume({ scope: "53", declaration });
      const second = resolveLoopResume({ scope: "53", declaration });
      first.lastDeclaration.loopRunId.id.push("changed");
      first.lastDeclaration.startedAt.iso.push("changed");
      assert.deepEqual(declaration.loopRunId, { id: ["lr-7"] });
      assert.deepEqual(declaration.startedAt, { iso: ["supplied"] });
      assert.deepEqual(first.loopRunId, { id: ["lr-7"] });
      assert.deepEqual(first.startedAt, { iso: ["supplied"] });
      assert.deepEqual(second.lastDeclaration.loopRunId, { id: ["lr-7"] });
      assert.equal("phase" in first.lastDeclaration, false);
      assert.equal("cycle" in first.lastDeclaration, false);
    },
  },
];
