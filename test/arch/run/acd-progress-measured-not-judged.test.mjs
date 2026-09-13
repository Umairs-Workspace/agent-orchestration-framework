// FF-6906 / ADR-005: the progress ledger consumes deterministic measurements and
// appends samples; no agent or model surface may decide whether work is progressing.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sourcePath = path.join(root, "src", "loop-progress.mjs");

function stripComments(source) {
  return source.replace(/^\s*\/\/.*$/gmu, "").replace(/\/\*[\s\S]*?\*\//gu, "");
}

function forbiddenSurface(source) {
  return /from\s+["'][^"']*(?:agent|model|prompt|provider)|\b(?:invokeRegistered|spawnRuntime|driveInteractiveClaudeSession)\b/iu.test(source);
}

export const archTests = [
  {
    name: "arch/69 FF-6906 progress is measured without a model and the ledger writer is append-only",
    run: async () => {
      const raw = await readFile(sourcePath, "utf8");
      const source = stripComments(raw);
      assert.equal(forbiddenSurface(source), false, "the progress authority reaches no agent, model, prompt, provider, or runtime driver");
      assert.match(source, /appendFile\(ledgerPath,/u, "the sample writer uses the append-only filesystem verb");
      assert.doesNotMatch(source, /\b(?:writeFile|truncate)\s*\(/u, "no existing ledger is opened for replacement or truncation");
      assert.match(source, /filesTouched[\s\S]*linesChanged[\s\S]*commitsMade[\s\S]*failingScenarios/u);

      const plantedJudge = `${source}\nimport { judgeProgress } from "./agent-model.mjs";`;
      assert.equal(forbiddenSurface(plantedJudge), true, "a planted model judge trips the surface detector");
      const plantedRewrite = source.replace("appendFile(ledgerPath,", "writeFile(ledgerPath,");
      assert.notEqual(plantedRewrite, source, "the writer plant changed the source");
      assert.match(plantedRewrite, /\bwriteFile\s*\(/u, "a planted rewrite trips the append-only detector");
    },
  },
];
