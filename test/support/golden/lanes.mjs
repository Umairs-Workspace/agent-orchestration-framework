// test/support/golden/lanes.mjs — the registered golden lanes (203/ADR-001, ADR-007). A lane is
// a frozen declaration: an `id`, the `command` its steps run (the checkout's aof CLI unless a
// lane names another script) and its `scenarios`. A scenario is an `id`, an optional `base`
// (a scenario of this lane by id, or another lane's as `<lane>/<scenario>`), the `files` it
// starts with and its `steps`, each `{ argv, exit }` with `exit` defaulting to 0.
//
// 203/00 proved the harness on a fixture lane its self-test declares in-test. 203/01 registered
// the init lane, and 203/02 the update lane.
import path from "node:path";
import { pathToFileURL } from "node:url";
import workInit from "../../golden/work-init.lane.mjs";
import workUpdate from "../../golden/work-update.lane.mjs";

export const LANES = Object.freeze([workInit, workUpdate]);

// A lane outside the registry, by file — the self-test's door through `scripts/golden.mjs
// --lane-module`. The module's default export is the lane.
export async function loadLaneModule(file) {
  const module = await import(pathToFileURL(path.resolve(file)).href);
  const lane = module.default;
  if (!lane || typeof lane.id !== "string" || !Array.isArray(lane.scenarios)) {
    throw new Error(`golden: ${file} does not default-export a lane ({ id, scenarios })`);
  }
  return lane;
}

// A scenario reference, resolved: `{ laneId, scenarioId }` for `base` as written in `laneId`.
export function resolveBase(laneId, base) {
  const slash = base.indexOf("/");
  return slash === -1 ? { laneId, scenarioId: base } : { laneId: base.slice(0, slash), scenarioId: base.slice(slash + 1) };
}

export function findScenario(lanes, laneId, scenarioId) {
  const lane = lanes.find((candidate) => candidate.id === laneId);
  const scenario = lane?.scenarios.find((candidate) => candidate.id === scenarioId);
  return lane && scenario ? { lane, scenario } : null;
}

export const refName = ({ laneId, scenarioId }) => `${laneId}/${scenarioId}`;

// The chain from a scenario to its root base, the scenario first. A missing base and a cycle
// each fail naming the chain (ADR-003 §2): a cycle prints as `x → y → x`.
export function baseChain(lanes, laneId, scenarioId) {
  const chain = [];
  let ref = { laneId, scenarioId };
  for (;;) {
    const seen = chain.findIndex((entry) => entry.laneId === ref.laneId && entry.scenarioId === ref.scenarioId);
    if (seen !== -1) {
      const loop = [...chain.slice(seen), ref].map((entry) => (entry.laneId === laneId ? entry.scenarioId : refName(entry)));
      throw new Error(`golden: scenario "${scenarioId}" has a cycle of bases: ${loop.join(" → ")}`);
    }
    const found = findScenario(lanes, ref.laneId, ref.scenarioId);
    if (!found) {
      const named = chain.at(-1);
      throw named
        ? new Error(`golden: scenario "${named.scenarioId}" names base "${ref.laneId === named.laneId ? ref.scenarioId : refName(ref)}", which does not exist`)
        : new Error(`golden: lane "${laneId}" has no scenario "${scenarioId}"`);
    }
    chain.push(ref);
    if (!found.scenario.base) return chain;
    ref = resolveBase(ref.laneId, found.scenario.base);
  }
}
