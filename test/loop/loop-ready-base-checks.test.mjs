import assert from "node:assert/strict";

import { computeLoopReady } from "../../src/work/doctor-loop-ready.mjs";
import { invokeDoctor, row, withLoopReadyRepo } from "../support/loop-ready-fixture.mjs";

function ready({ findings = [], config = {}, items = [], scope } = {}) {
  return computeLoopReady({ findings, config, snapshot: { items }, scope, loops: { present: false, summary: { checks: {}, error: 0, warn: 0 } } });
}

function story(ref, hasTasks, slug = "story") {
  const [parent, number] = ref.split("/");
  return { type: "story", ref, parent, number, slug, path: `/fixture/${ref}`, hasTasks };
}

export const loopReadyBaseChecksTests = [
  {
    name: "loop-ready/03 stream-coherent reads error severity only and names its count",
    run() {
      for (const [findings, state, count] of [
        [[], "pass", 0],
        [[{ severity: "warn" }, { severity: "warn" }], "pass", 0],
        [[{ severity: "error" }], "fail", 1],
      ]) {
        const result = ready({ findings });
        assert.equal(row(result, "stream-coherent").state, state);
        assert.match(row(result, "stream-coherent").evidence, new RegExp(`\\b${count}\\b`));
      }
    },
  },
  {
    name: "loop-ready/03 cap-declared exhaustively accepts only declared non-negative integers",
    run() {
      const cases = [
        [3, true], [1, true], [0, true], [99, true],
        [undefined, false], [null, false], ["3", false], [2.5, false], [-1, false], [true, false], [[], false],
      ];
      for (const [value, passes] of cases) {
        const config = value === undefined ? { work: { autonomous: {} } } : { work: { autonomous: { maxAttempts: value } } };
        const result = ready({ config });
        const check = row(result, "cap-declared");
        assert.equal(check.state, passes ? "pass" : "fail", String(value));
        assert.match(check.evidence, passes ? new RegExp(`\\b${value}\\b`) : /work\.autonomous\.maxAttempts/);
        if (!passes) assert.match(check.evidence, /fallback: 3/);
      }
    },
  },
  {
    name: "loop-ready/03 memory-on exhaustively follows the declared backend without adjudicating names",
    run() {
      const cases = [
        [{ backend: "local" }, true, "local"],
        [{ backend: "graphify" }, true, "graphify"],
        [{ backend: "unregistered" }, true, "unregistered"],
        [{ backend: "none" }, false, "none"],
        [{ backend: "" }, false, ""],
        [{ backend: null }, false, "none"],
        [{}, false, "none"],
        [undefined, false, "none"],
        ["local", false, "none"],
      ];
      for (const [memory, passes, evidence] of cases) {
        const result = ready({ config: memory === undefined ? {} : { memory } });
        const check = row(result, "memory-on");
        assert.equal(check.state, passes ? "pass" : "fail", JSON.stringify(memory));
        assert.ok(check.evidence.includes(JSON.stringify(evidence)) || check.evidence.includes(evidence));
      }
    },
  },
  {
    name: "loop-ready/03 tasks-authored counts in-scope stories only and reports missing refs",
    run() {
      const items = [story("07/00", true, "one"), story("07/01", false, "two"), { type: "uat", ref: "07U", hasTasks: false }];
      const all = ready({ items });
      assert.equal(row(all, "tasks-authored").state, "fail");
      assert.match(row(all, "tasks-authored").evidence, /1 of 2/);
      assert.match(row(all, "tasks-authored").evidence, /07\/01/);
      assert.equal(row(ready({ items, scope: "07/00" }), "tasks-authored").state, "pass");
      assert.equal(row(ready({ items, scope: "07/01" }), "tasks-authored").state, "fail");
      assert.match(row(ready({ items, scope: "99" }), "tasks-authored").evidence, /0 of 0/);
    },
  },
  {
    // AMENDED (TECH_DEBT item 51, `c1c5e4bd`). This leg asserted that the doctor snapshot
    // "deliberately" counted ANY regular file in `tasks/` — so a story whose tasks directory held
    // only `notes.md` read as authored. That was not a deliberate leniency, it was a second answer:
    // `work:tasks` and the loop both counted `.feature` files, so one story could be authored to
    // the doctor and unauthored to the loop that reads it. The tightening measured 286/286 task
    // directories on this repo already carrying a `.feature`, so nothing real changed — and the
    // question now has one answer, which is the whole point of the ledger entry.
    //
    // Both directions, so the leg cannot pass by counting nothing: a `.md` payload is NOT authored,
    // and a `.feature` beside it is.
    name: "loop-ready/03 doctor snapshot counts a `.feature` and nothing else — one answer, shared with work:tasks and the loop",
    async run() {
      await withLoopReadyRepo({
        milestones: [{ number: "07", slug: "alpha", stories: [{ number: "00", slug: "notes", tasks: ["notes.md"] }] }],
      }, async (fx) => {
        const result = await invokeDoctor(fx);
        assert.equal(row(result.loopReady, "tasks-authored").state, "fail");
        assert.match(row(result.loopReady, "tasks-authored").evidence, /0 of 1/);
      });
      await withLoopReadyRepo({
        milestones: [{ number: "07", slug: "alpha", stories: [{ number: "00", slug: "notes", tasks: ["00_a.feature"] }] }],
      }, async (fx) => {
        const result = await invokeDoctor(fx);
        assert.equal(row(result.loopReady, "tasks-authored").state, "pass", "non-vacuity: the same shape with a .feature IS authored");
        assert.match(row(result.loopReady, "tasks-authored").evidence, /1 of 1/);
      });
    },
  },
  {
    name: "loop-ready/03 real doctor scope honours NN, NN/SS, and unresolved story sets",
    async run() {
      await withLoopReadyRepo({
        milestones: [{
          number: "07",
          slug: "alpha",
          stories: [
            { number: "00", slug: "authored", tasks: ["00.feature"] },
            { number: "01", slug: "missing", tasks: null, status: "not-started" },
          ],
        }],
      }, async (fx) => {
        assert.equal(row((await invokeDoctor(fx, "07/00")).loopReady, "tasks-authored").state, "pass");
        assert.equal(row((await invokeDoctor(fx, "07/01")).loopReady, "tasks-authored").state, "fail");
        assert.equal(row((await invokeDoctor(fx, "07")).loopReady, "tasks-authored").state, "fail");
        assert.match(row((await invokeDoctor(fx, "99")).loopReady, "tasks-authored").evidence, /0 of 0/);
      });
    },
  },
  {
    name: "loop-ready/03 config checks are scope-invariant and every base row carries measured evidence",
    async run() {
      await withLoopReadyRepo({}, async (fx) => {
        for (const scope of [undefined, "07", "07/00", "99"]) {
          const result = (await invokeDoctor(fx, scope)).loopReady;
          assert.equal(row(result, "cap-declared").state, "fail");
          assert.equal(row(result, "memory-on").state, "fail");
          for (const check of result.checks.slice(0, 4)) assert.ok(check.evidence.length > 0 && check.evidence !== "ok");
        }
      });
    },
  },
];
