// FF-12604 — "One pure decider says which declarations should be running now: it composes the
// store's verdicts, names none of them, and supervision is a ninth declaration key off by default."
//
// milestone 126 / story 02, ADR-004. The STRUCTURAL half; the driven half is
// `test/loop/work-loop-declarations.test.mjs`.
//
// WHAT THIS CONTROL EXISTS TO CATCH, in the contract's own words: `failureReason ===
// "runtime_offline"` tested inside the decider (a fourth derivation of a classification the store
// owns); a `state === "running"` shortcut that bypasses `isStale`, which collapses the fresh and
// stale branches and lets a died loop outlive its budget; the clock leg dropped for tidiness; the
// store's verdicts IMPORTED rather than handed in, which makes the module unloadable alone; a
// `work:next` import to ask whether the scope is complete; the ninth key added to the envelope but
// not to the recovery projection; and `usableDeclaration` widened to six so every declaration
// already on disk becomes unusable.
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { decideSupervisedDeclarations, readLoopDeclaration } from "../../../src/work/loop.mjs";
import { isRunning, isStale, retryReadiness } from "../../../src/run-store.mjs";
import { functionBody, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ENGINE = "src/work/loop.mjs";
const read = async (rel) => await readFile(path.join(root, rel), "utf8");
const source = async (rel) => stripComments(await read(rel));

/** Every `brief.loop` this repository's own run records carry. */
async function declarationsOnDisk() {
  const dir = path.join(root, "wiki", "work");
  const found = [];
  for (const entry of await readdir(dir, { recursive: true })) {
    const rel = String(entry).replaceAll("\\", "/");
    if (!rel.endsWith(".json") || !rel.includes("/runs/")) continue;
    try {
      const record = JSON.parse(await readFile(path.join(dir, entry), "utf8"));
      if (record?.brief?.loop != null) found.push({ rel, loop: record.brief.loop, record });
    } catch { /* a torn record is not this control's subject */ }
  }
  return found;
}

export const archTests = [
  {
    name: "arch/126/02 FF-12604 leg 1: the decider names no verdict the store owns",
    run: async () => {
      const engine = await source(ENGINE);
      const body = functionBody(engine, "export function decideSupervisedDeclarations(");
      assert.ok(body != null, "the decider's body is locatable — a failed cut is reported, never asserted over");

      // Every failure reason and run state the store classifies. Naming ONE of them here would be
      // a fourth derivation of a classification with a single home.
      for (const token of ["runtime_offline", "timeout", "session_limit", "agent_error", "needs-input"]) {
        assert.ok(!body.includes(token), `the decider does not spell the failure reason \`${token}\``);
      }
      for (const token of ["running", "queued", "cancelled", "failed", "done"]) {
        assert.doesNotMatch(body, new RegExp(`["'\`]${token}["'\`]`, "u"), `the decider does not spell the run state \`${token}\``);
      }
      // …nor `retryReadiness`'s own state names: only the `ready` boolean is read off that answer.
      for (const token of ["parked", "not-retryable", "attempts-exhausted", "no-run"]) {
        assert.ok(!body.includes(token), `the decider does not spell the readiness state \`${token}\``);
      }
      assert.match(body, /\.ready === true/u, "it reads the `ready` boolean and nothing else");

      // The verdicts arrive on the BAG; `readLoopDeclaration` is a call, being in this module.
      assert.match(body, /isRunning\(/u);
      assert.match(body, /isStale\(/u);
      assert.match(body, /retryReadiness\(/u);
      assert.match(body, /readLoopDeclaration\(runs\)/u);
      assert.match(body, /const \{[^}]*isRunning[^}]*isStale[^}]*retryReadiness[^}]*\} = input;/u, "all three are destructured from the input bag");
      assert.doesNotMatch(body, /work:next/u, "no registered command is consulted");
    },
  },
  {
    name: "arch/126/02 FF-12604 leg 2: the engine still imports NOTHING, so the module decides alone",
    run: async () => {
      const raw = await read(ENGINE);
      assert.equal(
        raw.split("\n").filter((line) => /^import\b/u.test(line.trim())).length,
        0,
        "src/work/loop.mjs carries no `import` statement of any kind",
      );
      const engine = stripComments(raw);
      assert.doesNotMatch(engine, /\bimport\s*\(/u, "and no dynamic import either");
      assert.doesNotMatch(engine, /node:(?:fs|fs\/promises|child_process|process|os)/u);
      assert.doesNotMatch(engine, /Date\.now\s*\(|new\s+Date\s*\(/u, "it reads no clock — `now` arrives as data");
    },
  },
  {
    name: "arch/126/02 FF-12604 leg 3: the fresh and stale branches are distinct, and the clock gates the relaunch",
    run: async () => {
      const engine = await source(ENGINE);
      const body = functionBody(engine, "export function decideSupervisedDeclarations(");

      // A `state === "running"` shortcut that bypassed `isStale` would collapse the two branches
      // and let a died loop outlive its budget. Both must be consulted, and the clock leg must
      // exist: nothing persists a `deadline-exhausted` halt, so an exhausted lineage still looks
      // ready to the store and a reconciler fed that row would relaunch it every tick.
      assert.match(body, /decideScheduleToClose\(\{ elapsedMs, ceilingMs \}\)/u, "the ceiling comparison routes through the ONE home");
      assert.match(body, /lineageElapsedMs\(/u, "over 126/00's attempt summer");
      assert.match(body, /retryLineage\(/u, "over the one lineage walk");
      assert.match(body, /stalenessMs,/u, "and the summer is handed the threshold, so a stale attempt ends at its liveness");

      // Driven proof that the two branches are genuinely distinct: one pair of fixtures on which
      // `isStale` ALONE flips the verdict, over a lineage the clock refuses.
      const loop = { loopRunId: "lr", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-08T00:00:00.000Z", id: "i", supervised: true };
      const spent = {
        runId: "a", retryOf: null, state: "failed", failureReason: "timeout", attempt: 1,
        createdAt: "2026-09-08T00:00:00.000Z", updatedAt: "2026-09-08T04:00:00.000Z",
        heartbeatAt: null, reclaimedAt: null, resumeAfter: null, brief: { loop },
      };
      const inFlight = (heartbeatAt) => ({
        runId: "b", retryOf: "a", state: "running", failureReason: null, attempt: 2,
        createdAt: "2026-09-08T11:00:00.000Z", updatedAt: heartbeatAt,
        heartbeatAt, reclaimedAt: null, resumeAfter: null, brief: { loop },
      });
      const ask = (runs) => decideSupervisedDeclarations({
        workspaces: [{ workspaceId: "w", projectRoot: "p", items: [{ ref: "53", runs }] }],
        maxAttempts: 3, ceilingMs: 7_200_000, stalenessMs: 900_000, now: "2026-09-08T12:00:00.000Z",
        isRunning, isStale, retryReadiness,
      }).rows.length;
      assert.equal(ask([spent, inFlight("2026-09-08T11:59:00.000Z")]), 1, "running and FRESH is listed on its own liveness");
      assert.equal(ask([spent, inFlight("2026-09-08T11:00:00.000Z")]), 0, "running and STALE is a relaunch, and the clock refuses it");
    },
  },
  {
    name: "arch/126/02 FF-12604 leg 4: a row is six keys and carries no verdict",
    run: async () => {
      const loop = { loopRunId: "lr", scope: "53", level: "L2", cap: 3, phase: "continue", cycle: 1, startedAt: "2026-09-08T10:00:00.000Z", id: "i", supervised: true };
      const { rows } = decideSupervisedDeclarations({
        workspaces: [{
          workspaceId: "w", projectRoot: "p",
          items: [{ ref: "53", runs: [{
            runId: "a", retryOf: null, state: "running", attempt: 1, failureReason: null,
            createdAt: "2026-09-08T11:00:00.000Z", updatedAt: "2026-09-08T11:59:00.000Z",
            heartbeatAt: "2026-09-08T11:59:00.000Z", reclaimedAt: null, resumeAfter: null, brief: { loop },
          }] }],
        }],
        maxAttempts: 3, ceilingMs: 7_200_000, stalenessMs: 900_000, now: "2026-09-08T12:00:00.000Z",
        isRunning, isStale, retryReadiness,
      });
      assert.equal(rows.length, 1);
      assert.deepEqual(Object.keys(rows[0]), ["workspaceId", "projectRoot", "loopRunId", "scope", "level", "cap"]);
      assert.ok(Object.isFrozen(rows[0]));
      // The label, the argv and the `cwd` are the PRODUCER's: composing an argv here would mean
      // importing the leaf that owns it, and this module imports nothing.
      for (const forbidden of ["argv", "cwd", "label", "id", "state", "failureReason", "ready", "attempt"]) {
        assert.ok(!(forbidden in rows[0]), `a row carries no \`${forbidden}\``);
      }
      const body = functionBody(await source(ENGINE), "export function decideSupervisedDeclarations(");
      assert.doesNotMatch(body, /--level|--resume|argvFor|"work"/u, "the decider composes no argv");
    },
  },
  {
    name: "arch/126/02 FF-12604 leg 5: every declaration already on disk stays readable, and recovers unsupervised",
    run: async () => {
      const found = await declarationsOnDisk();
      assert.ok(found.length >= 8, `this leg has a subject: ${found.length} records carry a brief.loop`);
      for (const { rel, loop, record } of found) {
        const recovered = readLoopDeclaration([record]);
        assert.ok(recovered != null, `${rel}: still usable — the five-key requirement was not widened`);
        assert.deepEqual(
          Object.keys(recovered),
          ["loopRunId", "scope", "level", "cap", "startedAt", "supervised"],
          `${rel}: six projected keys`,
        );
        if (loop.supervised !== true) {
          assert.equal(recovered.supervised, false, `${rel}: a record naming no supervision recovers unsupervised`);
        }
      }
      // The requirement itself is still five keys, asserted by driving it rather than reading it:
      // a record carrying exactly those five recovers, and one missing any of them does not.
      const five = { loopRunId: "lr", scope: "53", level: "L2", cap: 3, startedAt: "2026-09-08T10:00:00.000Z" };
      const rec = (loop) => readLoopDeclaration([{ runId: "r", createdAt: "2026-09-08T11:00:00.000Z", brief: { loop } }]);
      assert.ok(rec(five) != null, "exactly the five required keys is usable");
      for (const key of Object.keys(five)) {
        const missing = { ...five };
        delete missing[key];
        assert.equal(rec(missing), null, `a record missing \`${key}\` is not usable`);
      }
    },
  },
  {
    name: "arch/126/02 FF-12604 leg 6: the fresh-mint retry test is not collapsed into the predicate",
    run: async () => {
      const runStart = await source("src/commands/run-start.mjs");
      const engine = await source(ENGINE);
      const body = functionBody(engine, "export function decideSupervisedDeclarations(");
      // Both route their retry classification through the store rather than restating it…
      assert.match(runStart, /shouldRetry\(/u, "run-start asks the store");
      assert.match(body, /retryReadiness\(/u, "the predicate asks the store");
      // …and run-start keeps its own `reclaimedAt` clause, which the predicate does NOT, because
      // it answers a different question: "may this be retried on a fresh mint" versus "should
      // this be running now".
      assert.match(runStart, /reclaimedAt\s*!=\s*null/u, "run-start's own clause is intact");
      assert.doesNotMatch(body, /reclaimedAt/u, "the predicate carries no reclaim clause of its own");
    },
  },
];
