// Traceability wiring for milestone 167 / story 04 (the budget is proven by a soak test):
//   .../04_story_the-budget-is-proven-by-a-soak-test/tasks/00_the-daemons-hold-the-budget-under-soak.feature (@executable)
//   .../04_story_the-budget-is-proven-by-a-soak-test/tasks/01_the-soak-runs-in-the-gate.feature (@executable)
//
// ONE soak per run of this suite (`soakOnce`): the real `mesh serve --serve` and `mesh ui` over a
// generated 1,800-doc project with the three motivating faults planted, a 15 s warm-up, 30 s idle
// and 30 s with a viewer polling — about 90 s. Every case below reads that one run; E3 alone is
// judged over a recorded phase, so its red is proven without making production code slow.
//
// The threshold has ONE home (FF-16702): each phase is judged with the meter's own `judge` against
// `DAEMON_BUDGET`. The measure is CPU-seconds per phase, off each daemon's own snapshots, so a
// machine loaded by the gate's other workers stretches the wall clock but not the work.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DAEMON_BUDGET, causeLabel, judge } from "@aof/foundation/cost-meter";
import { LIVE_PORTS, SOAK_WORKSPACE, processAlive, runSoak } from "./soak-harness.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// judgePhase — one daemon's phase against the budget the phase is held to. A failure names the
// daemon, the phase, the share, the budget and what it spent its time on.
export function judgePhase(daemon, phase, measured, budgetState) {
  const share = measured.wallSeconds > 0 ? (measured.cpuSeconds / measured.wallSeconds) * 100 : 0;
  const verdict = judge({ state: budgetState, cpuPercent: share });
  const top = measured.topCauses?.[0];
  const message = `${daemon} spent ${measured.cpuSeconds.toFixed(2)} CPU-seconds in ${Math.round(measured.wallSeconds)}s of the ${phase} phase: ${Math.round(share)}% of a core against the ${verdict.state} budget of ${verdict.budgetPercent}%${top ? ` — mostly ${causeLabel(top)}` : ""}`;
  return { ok: !verdict.over, share, message };
}

// The global home this suite was handed (the runner's isolated one): every file and its content.
function snapshotTree(root) {
  const out = {};
  if (!root || !existsSync(root)) return out;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out[path.relative(root, full)] = createHash("sha256").update(readFileSync(full)).digest("hex");
    }
  };
  if (statSync(root).isDirectory()) walk(root);
  return out;
}

// Hold the live ports for the run when nothing else does, so the soak always runs beside them taken.
async function holdPort(port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve({ held: "elsewhere", release: () => {} }));
    server.listen(port, "127.0.0.1", () => resolve({ held: "here", release: () => new Promise((done) => server.close(done)) }));
  });
}

let soak = null;
function soakOnce() {
  soak ??= (async () => {
    const handedHome = process.env.AOF_GLOBAL_HOME;
    const before = snapshotTree(handedHome);
    const holds = await Promise.all(LIVE_PORTS.map(holdPort));
    let result = null;
    let error = null;
    try {
      result = await runSoak();
    } catch (caught) {
      error = caught;
    } finally {
      for (const hold of holds) await hold.release();
    }
    return { result, error, holds, homeUnchanged: JSON.stringify(snapshotTree(handedHome)) === JSON.stringify(before) };
  })();
  return soak;
}
async function measured() {
  const { result, error } = await soakOnce();
  if (error) throw error;
  return result;
}

const daemonCost = (result, daemon) => result.status?.cost?.daemons?.find((entry) => entry.daemon === daemon) ?? null;
const faultsNamed = (result) => ["serve", "ui"].flatMap((daemon) => daemonCost(result, daemon)?.faults ?? []);

export const daemonBudgetSoakTests = [
  // ================================ task 00 · R1 — the real daemons hold the budget
  {
    name: "167/04 E1 · with no viewer, each daemon is under the idle budget",
    async run() {
      const result = await measured();
      assert.ok(result.docs >= 1800, `a tree as large as aof's (${result.docs} docs)`);
      for (const daemon of ["serve", "ui"]) {
        const verdict = judgePhase(daemon, "idle", result.phases.idle[daemon], "idle");
        assert.ok(verdict.ok, verdict.message);
      }
    },
  },
  {
    name: "167/04 E2 · with a viewer polling, each daemon is under the viewer-open budget",
    async run() {
      const result = await measured();
      assert.ok(result.viewer.requests.fleet > 0, `the viewer polled the fleet: ${JSON.stringify(result.viewer)}`);
      // The board opens through the fleet's drill-in, which refuses a workspace the mesh projection
      // does not hold — and the planted empty cache is exactly that (handed back in STATE).
      assert.ok(result.viewer.requests.board > 0 || result.viewer.boardError?.code === "workspace-not-found", `the viewer polled the board, or the drill-in refused it for the empty cache: ${JSON.stringify(result.viewer)}`);
      for (const daemon of ["serve", "ui"]) {
        const verdict = judgePhase(daemon, "viewer", result.phases.viewer[daemon], "viewer-open");
        assert.ok(verdict.ok, verdict.message);
      }
      // The daemon that serves the viewer states it. `mesh serve` serves no fleet or board route, so
      // by ADR-002 it stays `idle` — held to the stricter number (handed back in STATE as a
      // contract finding on this step's "both").
      assert.equal(result.phases.viewer.ui.state, "viewer-open", "the ui daemon's snapshot states viewer-open for the phase");
    },
  },
  {
    name: "167/04 E3 · a phase over budget fails the soak and says why",
    run() {
      const recorded = { cpuSeconds: 9, wallSeconds: 30, topCauses: [{ cause: "full-disk-read", labels: { workspaceId: SOAK_WORKSPACE }, count: 400 }] };
      const verdict = judgePhase("serve", "idle", recorded, "idle");
      assert.equal(verdict.ok, false, "the judgement fails");
      for (const part of ["serve", "idle", "30%", `${DAEMON_BUDGET.idlePercent}%`, "full-disk-read", SOAK_WORKSPACE]) {
        assert.ok(verdict.message.includes(part), `names ${part}: ${verdict.message}`);
      }
    },
  },

  // ================================ task 00 · R2 — the planted faults are named
  {
    name: "167/04 E4 · mesh status names each planted fault with its workspace",
    async run() {
      const result = await measured();
      assert.ok(result.status?.cost, `mesh status --json answered with a cost block: ${JSON.stringify(result.status).slice(0, 400)}`);
      const faults = faultsNamed(result);
      const has = (cause, code, workspaceId) => faults.some((entry) => entry.cause === cause && entry.labels?.code === code && entry.labels?.workspaceId === workspaceId && entry.count > 0);
      assert.ok(has("degrade", "work-read-cache-unavailable", SOAK_WORKSPACE), `the empty cache is counted for ${SOAK_WORKSPACE}: ${JSON.stringify(faults)}`);
      assert.ok(has("sync-failure", "event-id-conflict", SOAK_WORKSPACE), `the conflicting sync is counted for ${SOAK_WORKSPACE}: ${JSON.stringify(faults)}`);
      for (const workspaceId of result.goneIds) assert.ok(has("sync-failure", "workdir-missing", workspaceId), `the gone registration ${workspaceId} is counted: ${JSON.stringify(faults)}`);
    },
  },
  {
    name: "167/04 E5 · each sync fault is logged once, not once per tick",
    async run() {
      const result = await measured();
      const lines = (predicate) => result.logLines.filter(predicate).length;
      assert.equal(lines((line) => String(line.message).includes(SOAK_WORKSPACE) && String(line.message).includes("event-id-conflict")), 1, "1 event-id-conflict line for the soak workspace");
      for (const workspaceId of result.goneIds) {
        assert.equal(lines((line) => line.code === "workdir-missing" && String(line.message).includes(workspaceId)), 1, `1 workdir-missing line for ${workspaceId}`);
      }
    },
  },

  // ================================ task 01 · R3 — in the gate, without touching the live node
  {
    name: "167/04 E6 · the soak passes while the live daemons hold the fleet and control ports",
    async run() {
      const { holds } = await soakOnce();
      const result = await measured();
      assert.ok(holds.every((hold) => hold.held === "here" || hold.held === "elsewhere"), "4181 and 4182 were taken for the whole run");
      for (const port of Object.values(result.ports)) assert.ok(!LIVE_PORTS.includes(port), `the soak's daemons bound ${port}, never 4181 or 4182`);
      assert.deepEqual(result.listening, { control: true, ui: true }, "and each answered on its own port");
    },
  },
  {
    name: "167/04 E7 · the soak leaves the global home it was handed and the process table as it found them",
    async run() {
      const { result, homeUnchanged } = await soakOnce();
      assert.equal(homeUnchanged, true, "the handed global home is byte-unchanged");
      for (const [name, pid] of Object.entries(result?.pids ?? {})) assert.equal(processAlive(pid), false, `${name} (pid ${pid}) is no longer running`);
      assert.ok(result == null || !existsSync(result.home), "the soak's own home is removed");
    },
  },
  {
    name: "167/04 the gate's plan carries the soak as one registered unit",
    async run() {
      const imports = (file) => [...readFileSync(file, "utf8").matchAll(/^\s*import\s+\{[^}]*\}\s+from\s+"([^"]+)";/gm)].map((match) => path.resolve(path.dirname(file), match[1]));
      const index = path.join(REPO_ROOT, "test", "mesh", "budget", "index.mjs");
      const suite = path.join(REPO_ROOT, "test", "mesh", "budget", "daemon-budget-soak.test.mjs");
      assert.ok(imports(path.join(REPO_ROOT, "scripts", "test.mjs")).includes(index), "the registry names test/mesh/budget/index.mjs");
      assert.ok(imports(index).includes(suite), "which names test/mesh/budget/daemon-budget-soak.test.mjs");
      const { tests } = await import("./index.mjs");
      assert.ok(tests.length > 0 && tests.every((entry) => daemonBudgetSoakTests.includes(entry)), "every registered case maps to that file");
    },
  },
];
