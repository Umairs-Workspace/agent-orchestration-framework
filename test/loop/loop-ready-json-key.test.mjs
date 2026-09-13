import assert from "node:assert/strict";

import { getCommand, invoke } from "../../src/command-core.mjs";
import {
  invokeDoctor,
  parseJson,
  runDoctorCli,
  withLoopReadyRepo,
} from "../support/loop-ready-fixture.mjs";

const TOP_KEYS = ["errors", "findings", "healthy", "loopReady", "strict", "warnings"];
const READY_KEYS = ["applicable", "blocking", "checks", "clears", "passed", "registry", "score"];
const CHECK_IDS = [
  "stream-coherent", "cap-declared", "memory-on", "tasks-authored",
  "grounding", "anchor-grounding", "pairing", "reference-ownership", "actuator-arbitration", "timescale",
];

function assertReadyShape(ready) {
  assert.deepEqual(Object.keys(ready).sort(), READY_KEYS);
  assert.deepEqual(Object.keys(ready.registry).sort(), ["composed", "error", "present", "warn"]);
  assert.deepEqual(ready.checks.map((row) => row.id), CHECK_IDS);
  assert.equal(ready.checks.length, 10);
  for (const row of ready.checks) {
    assert.deepEqual(Object.keys(row).sort(), ["evidence", "id", "state"]);
    assert.ok(["pass", "fail", "not-applicable"].includes(row.state));
    assert.ok(typeof row.evidence === "string" && row.evidence.length > 0);
  }
  assert.ok(Number.isInteger(ready.score) && ready.score >= 0 && ready.score <= 100);
  assert.ok(Number.isInteger(ready.passed) && Number.isInteger(ready.applicable));
  assert.ok(ready.passed >= 0 && ready.passed <= ready.applicable);
  assert.ok(["none", "L1", "L2", "L3"].includes(ready.clears));
  assert.equal(new Set(ready.blocking).size, ready.blocking.length);
  assert.ok(ready.blocking.every((id) => ready.checks.some((row) => row.id === id && row.state === "fail")));
}

export const loopReadyJsonKeyTests = [
  {
    name: "loop-ready/00 json and run envelopes are closed at one additive key",
    async run() {
      await withLoopReadyRepo({ config: { work: { autonomous: { maxAttempts: 3 } }, memory: { backend: "local" } } }, async (fx) => {
        const result = await invokeDoctor(fx);
        assert.deepEqual(Object.keys(result).sort(), ["findings", "loopReady"]);
        assert.ok(result.loopReady && typeof result.loopReady === "object");
        assert.ok(result.findings.every((finding) => Object.keys(finding).sort().join() === "code,message,path,severity"));
        assertReadyShape(result.loopReady);

        const parsed = parseJson(runDoctorCli(fx));
        assert.deepEqual(Object.keys(parsed).sort(), TOP_KEYS);
        assert.deepEqual(parsed.findings.map(({ path: _path, ...finding }) => finding), result.findings.map(({ path: _path, ...finding }) => finding));
        assert.deepEqual(parsed.loopReady, result.loopReady);
      });
    },
  },
  {
    name: "loop-ready/00 frozen nested shapes, vocabularies, order, and blocking order",
    async run() {
      await withLoopReadyRepo({}, async (fx) => {
        const { loopReady } = await invokeDoctor(fx);
        assertReadyShape(loopReady);
        assert.deepEqual(loopReady.blocking, loopReady.checks.filter((row) => row.state === "fail").map((row) => row.id));
        assert.ok(loopReady.checks.slice(4).every((row) => row.state === "not-applicable"));
      });
    },
  },
  {
    name: "loop-ready/00 human face appends exactly one diagnostic line without moving the health line",
    async run() {
      await withLoopReadyRepo({ config: { work: { autonomous: { maxAttempts: 3 } }, memory: { backend: "local" } } }, async (fx) => {
        const cli = runDoctorCli(fx, { json: false });
        assert.equal(cli.status, 0, cli.stderr);
        const lines = cli.stdout.trimEnd().split(/\r?\n/);
        assert.equal(lines[0], "healthy — work stream is coherent.");
        assert.equal(lines.length, 2);
        assert.match(lines[1], /^Loop-Ready: 100% \(4\/4\) — clears L2; nothing is holding the rung down\.$/);
      });
    },
  },
  {
    name: "loop-ready/00 denominator and blockers remain visible on the human face",
    async run() {
      await withLoopReadyRepo({}, async (fx) => {
        const cli = runDoctorCli(fx, { json: false });
        assert.equal(cli.status, 0, cli.stderr);
        const line = cli.stdout.trimEnd().split(/\r?\n/).at(-1);
        assert.match(line, /\([0-4]\/4\)/);
        assert.match(line, /blocking: cap-declared, memory-on/);
      });
      await withLoopReadyRepo({ loops: {} }, async (fx) => {
        const line = runDoctorCli(fx, { json: false }).stdout.trimEnd().split(/\r?\n/).at(-1);
        assert.match(line, /\([0-9]+\/10\)/);
      });
    },
  },
  {
    name: "loop-ready/00 explain and converge documents do not compose or render loop readiness",
    async run() {
      await withLoopReadyRepo({ loops: {} }, async (fx) => {
        const explain = await invoke("work:doctor", { explain: "run.started" }, { ...fx.ctx, effectsJournalOptions: { env: fx.env } });
        assert.deepEqual(Object.keys(explain), ["explain"]);
        assert.equal("loopReady" in explain, false);
        const command = getCommand("work:doctor");
        assert.deepEqual(command.cli.json(explain), explain);
        assert.equal(command.cli.render(explain).includes("Loop-Ready"), false);

        const converge = await invoke("work:doctor", { converge: true }, { ...fx.ctx, effectsJournalOptions: { env: fx.env } });
        assert.deepEqual(Object.keys(converge), ["converge"]);
        assert.equal("loopReady" in converge, false);
        assert.deepEqual(command.cli.json(converge), converge);
        assert.equal(command.cli.render(converge).includes("Loop-Ready"), false);
      });
    },
  },
  {
    name: "loop-ready/00 the advisory score never participates in the finding exit gate",
    run() {
      const command = getCommand("work:doctor");
      for (const score of [0, 11, 25, 50, 75, 100]) {
        const loopReady = { score };
        assert.equal(command.cli.exit({ findings: [], loopReady }, { options: {} }), 0);
        assert.equal(command.cli.exit({ findings: [{ severity: "warn" }], loopReady }, { options: {} }), 0);
        assert.equal(command.cli.exit({ findings: [{ severity: "warn" }], loopReady }, { options: { strict: true } }), 1);
        assert.equal(command.cli.exit({ findings: [{ severity: "error" }], loopReady }, { options: {} }), 1);
      }
    },
  },
  {
    name: "loop-ready/00 different readiness scores leave the health summary byte-equivalent",
    async run() {
      const states = [];
      for (const config of [
        { work: { autonomous: { maxAttempts: 3 } }, memory: { backend: "local" } },
        {},
      ]) {
        await withLoopReadyRepo({ config }, async (fx) => {
          const parsed = parseJson(runDoctorCli(fx));
          states.push(parsed);
        });
      }
      assert.notEqual(states[0].loopReady.score, states[1].loopReady.score);
      for (const state of states) delete state.loopReady;
      assert.deepEqual(states[0], states[1]);
    },
  },
];
