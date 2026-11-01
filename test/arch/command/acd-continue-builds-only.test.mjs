// Fitness function FF-17901 for milestone 179 / ADR-001 §1:
// "`continue` builds only."
//
// `continue.md` carried 149's `<manual_mode>` — about forty lines no build reads — and every build
// paid for them in its prompt. 179/00 moved the guide to a command of its own, `aof:manual <ref>`,
// and an operator-led mode now enters as its own command rather than a region inside the build
// prompt. This control is what stops one creeping back: neither `continue.md` nor the Codex
// `continue` sections (`continue` and `procedure-continue` in `variants/codex/workflow.md`) may hold
// a `<manual_mode>` region or a `guided:` outcome.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PROMPT = "packages/core/assets/commands/continue.md";
const CODEX = "packages/core/assets/variants/codex/workflow.md";
const CODEX_SECTIONS = Object.freeze(["continue", "procedure-continue"]);

// One Codex variant section, cut exactly as the bundle loader cuts it (`packages/core/src/work/bundle.mjs`):
// from its marker to the next marker. Null when the marker is absent, so a renamed section fails as
// NOT FOUND rather than passing over an empty string.
export function codexSection(text, section) {
  const pieces = text.split(`<!-- variant:${section} -->`);
  if (pieces.length !== 2) return null;
  return pieces[1].split(/<!-- variant:[^>]+ -->/u)[0];
}

// What an operator-led mode left behind in a build prompt, by name. Empty means the prompt builds only.
export function operatorModeResidue(text) {
  const found = [];
  if (text.includes("<manual_mode>") || text.includes("</manual_mode>")) found.push("<manual_mode>");
  if (/\bguided:/u.test(text)) found.push("guided: outcome");
  return found;
}

async function buildPrompts() {
  const prompt = await readFile(path.join(root, PROMPT), "utf8");
  const codex = await readFile(path.join(root, CODEX), "utf8");
  const prompts = [[PROMPT, prompt]];
  for (const section of CODEX_SECTIONS) {
    const body = codexSection(codex, section);
    assert.ok(body != null, `${CODEX}: NOT FOUND — the \`${section}\` section could not be cut`);
    prompts.push([`${CODEX}#${section}`, body]);
  }
  return prompts;
}

export const archTests = [
  {
    name: "arch/179 FF-17901: continue builds only — no <manual_mode> region and no guided: outcome in continue.md or its Codex sections",
    run: async () => {
      for (const [where, text] of await buildPrompts()) {
        assert.deepEqual(operatorModeResidue(text), [], `${where} carries an operator-led mode; it belongs in its own command`);
      }
    },
  },
  {
    name: "arch/179 FF-17901: the control is red on a reinjected region or outcome, and a missing section fails as NOT FOUND",
    run: async () => {
      const [[, prompt]] = await buildPrompts();
      assert.deepEqual(operatorModeResidue(`${prompt}\n<manual_mode>\nguide\n</manual_mode>\n`), ["<manual_mode>"]);
      assert.deepEqual(operatorModeResidue(`${prompt}\n- **guided: \`<ref>\` is yours to build**\n`), ["guided: outcome"]);
      assert.equal(codexSection("<!-- variant:other -->\nbody\n", "continue"), null);
      assert.equal(codexSection("<!-- variant:continue -->\nbody\n<!-- variant:next -->\nrest", "continue"), "\nbody\n");
    },
  },
];
