// FF-5506 / ADR-004: frozen drift is a coded tamper carrying its member id,
// while removal of only the ownership marker remains the human escape hatch.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SETTINGS_SOURCE = path.join(repoRoot, "src", "claude-settings.mjs");

function tamperProblems(source) {
  const problems = [];
  if (!/code:\s*"frozen-set-tamper"/.test(source)) problems.push("the coded tamper event is absent");
  if (!/memberId:\s*mine\[FROZEN_MEMBER_MARKER\]/.test(source)) problems.push("tamper does not carry the frozen member id");
  if (!/typeof\s+entry\?\.\[FROZEN_MEMBER_MARKER\]\s*===\s*"string"/.test(source)) problems.push("an unowned frozen entry is not recognised as claimed");
  if (!/remove the \"\$\{AOF_HOOK_MARKER\}\" key/.test(source)) problems.push("the human escape hatch is absent from the report");
  return problems;
}

export const archTests = [
  {
    name: "arch/55 ADR-004 (acd-frozen-set-tamper-coded): tamper has a code and member id, and the ownership-marker escape hatch is armed",
    run: async () => {
      const source = await readFile(SETTINGS_SOURCE, "utf8");
      assert.deepEqual(tamperProblems(source), [], "the coded tamper or human escape-hatch contract regressed");
    },
  },
  {
    name: "arch/55 ADR-004 (acd-frozen-set-tamper-coded): red probe - deleting the coded event is detected",
    run: async () => {
      const source = await readFile(SETTINGS_SOURCE, "utf8");
      const mutated = source.replace('code: "frozen-set-tamper"', 'code: "drift-warning"');
      assert.notEqual(mutated, source, "the red probe changed the real tamper code");
      assert.ok(tamperProblems(mutated).some((problem) => problem.includes("coded tamper")), "FF-5506 reports the planted downgrade to ordinary drift");
    },
  },
];
