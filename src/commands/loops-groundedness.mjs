// Compatibility composition for core asset policy and the graph loader.
import { createLoopsGroundednessCommand as create, resolveAnchorAuthorities as resolve } from "@aof/work-graph/commands/loops-groundedness";
import { loadLoops } from "../work/loops.mjs";
import { assetBase } from "../asset-base.mjs";
const getFrameworkRoot = () => assetBase("version");
export function createLoopsGroundednessCommand(options = {}) {
  return create({ loadModel: loadLoops, getFrameworkRoot, ...options });
}
export function resolveAnchorAuthorities(model, workspace, options = {}) {
  return resolve(model, workspace, { getFrameworkRoot, ...options });
}
