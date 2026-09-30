// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createLoopsGroundednessCommand as create, resolveAnchorAuthorities as resolve } from "@aof/work-graph/commands/loops-groundedness";
import { assetBase } from "../../../asset-base.mjs";

export function assembleCommandsLoopsGroundedness({ workLoopsServices }) {
  // Core composition for core asset policy and the graph loader.

  const { loadLoops } = workLoopsServices;

  const getFrameworkRoot = () => assetBase("version");
  function createLoopsGroundednessCommand(options = {}) {
    return create({ loadModel: loadLoops, getFrameworkRoot, ...options });
  }
  function resolveAnchorAuthorities(model, workspace, options = {}) {
    return resolve(model, workspace, { getFrameworkRoot, ...options });
  }

  return { createLoopsGroundednessCommand, resolveAnchorAuthorities };
}
