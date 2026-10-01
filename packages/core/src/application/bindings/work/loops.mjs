// Core assembly: construct once per application; collaborators are supplied explicitly.
import { loadLoops as load } from "@aof/work-graph/registry";
import { assetBase } from "../../../asset-base.mjs";
import * as api0 from "@aof/work-graph/registry";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Installed framework records retain module:src/... identifiers. Follow their
// actual composition binding to its declared public factory without executing it.
// This is derived from current source, rather than a table of retired modules.
async function resolveFrameworkModule(operand, root) {
  if (!/^src\/(?:[\w-]+\/)*[\w-]+\.mjs$/u.test(operand)) return null;
  const direct = path.resolve(root, operand);
  if (existsSync(direct)) return direct;
  const binding = path.join(root, "src/application/bindings", operand.slice(4));
  let source;
  try { source = await readFile(binding, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
  const imports = [...source.matchAll(/import\s*\{\s*(create\w+)\s*\}\s*from\s*["'](@aof\/[\w-]+\/[\w/-]+)["']/gu)];
  const factories = imports.filter(([, factory]) => new RegExp(`\\b${factory}\\s*\\(`, "u").test(source));
  if (factories.length !== 1) return null;
  return createRequire(path.join(root, "package.json")).resolve(factories[0][2]);
}

export function assembleWorkLoops({  } = {}) {
  // Core selects the work-graph implementation.

  function loadLoops(workspace) {
    return load(workspace, { getFrameworkRoot: () => assetBase("version"), resolveFrameworkModule });
  }

  return { "ADMITTED_KEYS": api0.ADMITTED_KEYS, "CADENCE_KINDS": api0.CADENCE_KINDS, "EDGE_KEYS": api0.EDGE_KEYS, "ENDPOINT_SCHEMES": api0.ENDPOINT_SCHEMES, "EVENT_TRIGGERS": api0.EVENT_TRIGGERS, "FIELD_KINDS": api0.FIELD_KINDS, "GROUND_VALUES": api0.GROUND_VALUES, "LOADER_FINDING_CODES": api0.LOADER_FINDING_CODES, "NODE_KINDS": api0.NODE_KINDS, "PERIODIC_UNITS": api0.PERIODIC_UNITS, "POINTER_SCHEMES": api0.POINTER_SCHEMES, "SENTINEL_TOKENS": api0.SENTINEL_TOKENS, "loopPointersIn": api0.loopPointersIn, "parseCadence": api0.parseCadence, loadLoops, resolveFrameworkModule };
}
