// src/work/doctor/daemon-cost.mjs — THE DAEMON-COST LANE (milestone 167 / story 00, ADR-001 and
// ADR-002). `mesh serve` held more than a core for 17 hours and nothing in doctor said so. This lane
// reads each daemon's cost snapshot and says when one is over its budget — naming what it spends its
// time on and for which workspace — or has stopped reporting.
//
// A distinct subject from `sync.mjs`, which reports what the global store is OWED; this lane reports
// what the daemon COSTS. PURE, like every lane: the snapshots arrive on `ctx.daemonCost` as plain
// data, read at the command edge (`commands/doctor.mjs`) through the one writer's reader. The
// judgement, the staleness rule and the budget are the meter's (`@aof/foundation/cost-meter`), so
// this lane and `aof mesh status` cannot disagree about either.
//
// Both findings are WARN: an expensive daemon costs the operator a core, it never loses work, and a
// lane that could fail `validate` would turn a busy machine into a red build.
import { causeLabel, describeCost } from "@aof/foundation/cost-meter";

export const DAEMON_OVER_BUDGET = "daemon-over-budget";
export const DAEMON_NOT_REPORTING = "daemon-not-reporting";

// ageLabel(seconds) — "50 seconds", "2 minutes", "3 hours": how long ago a daemon last reported.
export function ageLabel(seconds) {
  if (!Number.isFinite(seconds)) return "an unknown time";
  if (seconds < 120) return `${Math.round(seconds)} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 120) return `${minutes} minutes`;
  return `${Math.floor(minutes / 60)} hours`;
}

// daemonCostGroup(snapshot, ctx) — the lane's findings, anchored on the work dir doctor runs over
// (a node-level fact, so a scoped run keeps it).
export function daemonCostGroup(snapshot, ctx = {}) {
  const facts = ctx.daemonCost;
  if (facts == null || !Number.isFinite(ctx.now)) return [];
  const findings = [];
  for (const entry of describeCost(facts.snapshots, ctx.now).daemons) {
    if (entry.status === "not-reporting") {
      findings.push({
        code: DAEMON_NOT_REPORTING,
        severity: "warn",
        path: snapshot.workDir,
        message: `${entry.daemon}: the daemon has not reported its cost for ${ageLabel(entry.ageSeconds)} (last at ${entry.at ?? "unknown"}) — is it running?`,
      });
      continue;
    }
    if (!entry.over) continue;
    const top = entry.topCauses[0];
    const spending = top == null ? "no counted cause" : `${causeLabel(top)} (×${top.count} in the window)`;
    findings.push({
      code: DAEMON_OVER_BUDGET,
      severity: "warn",
      path: snapshot.workDir,
      message: `${entry.daemon}: ${entry.state} at ${entry.cpuPercent}% of a core against its ${entry.budgetPercent}% ${entry.state} budget; its top cause is ${spending}`,
    });
  }
  return findings;
}
