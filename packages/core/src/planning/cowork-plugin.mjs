// The aof-planning Cowork plugin (165/ADR-002): shatter and explain rendered as
// skills from their own command sources, through the one command-to-skill mapping
// codex also uses (`commandAsSkill` with the cowork entry). Each skill's body is the
// cowork preamble followed by the command's body unchanged (FF-16502); refine is
// never shipped. This module returns a file map only — writing it under
// `.aof/cowork/` is planning init's (165/03).
import { packageVersionString } from "../asset-base.mjs";
import { loadBundle } from "../work/bundle.mjs";
import { commandAsSkill, commandSkillMapping } from "../work/bundle-runtime.mjs";
import { zipStored } from "./stored-zip.mjs";

export const PLANNING_PLUGIN_NAME = "aof-planning";
export const PLANNING_PLUGIN_SKILLS = Object.freeze(["shatter", "explain"]);
export const PLANNING_PLUGIN_MANIFEST = ".claude-plugin/plugin.json";
export const COWORK_STAMP = "<!-- aof-generated: true; aof-runtime: cowork -->";

const PLUGIN_DESCRIPTION =
  "AOF planning in Cowork: shatter a PRD into framed milestone SPECs and spikes, and explain what work items are for.";

// The skill's description opens with its explicit invocation, because the plugin
// syncs to every Claude Code session on the account (RESEARCH R2).
function skillDescription(id, commandDescription) {
  return `Use only when the user invokes \`/${PLANNING_PLUGIN_NAME}:${id}\`. ${commandDescription ?? ""}`.trim();
}

function renderSkill(resource) {
  const body = commandAsSkill(resource, commandSkillMapping("cowork"));
  return [
    "---",
    `name: ${resource.id}`,
    `description: ${JSON.stringify(skillDescription(resource.id, resource.description))}`,
    "---",
    "",
    COWORK_STAMP,
    "",
    body.trim(),
    ""
  ].join("\n");
}

// `relative path → text` for the plugin: its manifest and one SKILL.md per skill,
// each rendered from the base (non-variant) command in the bundle.
export function renderPlanningPlugin({ version = packageVersionString(), bundle = loadBundle() } = {}) {
  const files = {
    [PLANNING_PLUGIN_MANIFEST]: `${JSON.stringify({ name: PLANNING_PLUGIN_NAME, version, description: PLUGIN_DESCRIPTION }, null, 2)}\n`
  };
  for (const id of PLANNING_PLUGIN_SKILLS) {
    const resource = bundle.resources.find((candidate) => candidate.kind === "command" && candidate.id === id);
    if (!resource) throw new Error(`The bundle has no "${id}" command to render as a planning skill.`);
    files[`skills/${id}/SKILL.md`] = renderSkill(resource);
  }
  return files;
}

// The uploadable `.plugin` bytes for the rendered plugin.
export function packagePlanningPlugin(options = {}) {
  return zipStored(renderPlanningPlugin(options));
}
