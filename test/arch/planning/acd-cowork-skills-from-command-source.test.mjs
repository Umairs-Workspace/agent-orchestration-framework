// Fitness function FF-16502 for milestone 165 / ADR-002:
// "Each cowork SKILL.md body contains its source command's body
//  (packages/core/assets/commands/<id>.md) unchanged after the one cowork preamble;
//  codex's mapped skills render byte-identically to before the mapping was generalised."
//
// Proofs:
//  1. For every planning skill, the rendered SKILL.md ends with the command's body
//     exactly as `loadBundle()` gives it, and what precedes it is the cowork mapping's
//     preamble — no re-wrapping, no trimming inside the body, no second copy.
//  2. Codex's preamble path, run over every bundle command, renders the pre-165 wording
//     byte for byte (the frozen oracle below), so sharing the mapping moved no codex byte.
import assert from "node:assert/strict";
import { loadBundle } from "../../../packages/core/src/work/bundle.mjs";
import {
  commandAsSkill,
  commandSkillMapping,
  normalizeArgumentHint,
  partitionByCapability
} from "../../../packages/core/src/work/bundle-runtime.mjs";
import { renderPlanningPlugin } from "../../../packages/core/src/planning/cowork-plugin.mjs";
import { PLANNING_PLUGIN_SKILLS } from "../../../packages/core/src/planning-init.mjs";

function codexPre165Body(resource) {
  const hint = normalizeArgumentHint(resource.argumentHint);
  const source = resource.commandNamespace ? `${resource.commandNamespace}:${resource.id}` : resource.id;
  return [
    `Use this skill when the user asks for \`$aof-${resource.id}${hint ? ` ${hint}` : ""}\`, or asks to run the AOF \`${source}\` procedure in Codex.`,
    "",
    "Where this procedure mentions `$ARGUMENTS`, use the text the user supplied after the skill name.",
    `Where it mentions Claude slash command \`/${source}\`, treat that as this Codex skill invocation.`,
    "",
    resource.body?.trim() ?? "",
    ""
  ].join("\n");
}

export const archTests = [
  {
    name: "arch/FF-16502: each cowork SKILL.md is the cowork preamble followed by its command's body, unchanged",
    run: () => {
      const bundle = loadBundle();
      const files = renderPlanningPlugin({ bundle });
      for (const id of PLANNING_PLUGIN_SKILLS) {
        const source = bundle.resources.find((resource) => resource.kind === "command" && resource.id === id);
        const skill = files[`skills/${id}/SKILL.md`];
        const command = source.body.trim();
        assert.ok(skill.endsWith(`\n${command}\n`), `${id}: the skill ends with the command body unchanged`);
        assert.equal(skill.split(command).length, 2, `${id}: the command body appears exactly once`);
        const mapped = commandAsSkill(source, commandSkillMapping("cowork"));
        assert.ok(skill.endsWith(mapped), `${id}: the body is the one mapping's output`);
      }
    }
  },
  {
    name: "arch/FF-16502: codex's mapped skills render byte-identically to the pre-165 wording",
    run: () => {
      const commands = loadBundle().resources
        .filter((resource) => resource.kind === "command")
        .map(({ runtimeVariants, ...resource }) => resource);
      const { installable } = partitionByCapability(commands, ["codex"]);
      assert.equal(installable.length, commands.length, "every command maps to a codex skill");
      for (const resource of commands) {
        const mapped = installable.find((entry) => entry._aofMappedFrom?.id === resource.id);
        assert.equal(mapped.body, codexPre165Body(resource), `$aof-${resource.id}`);
      }
    }
  }
];
