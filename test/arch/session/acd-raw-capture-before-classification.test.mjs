import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand, listCommands } from "../../../src/command-core.mjs";
import { RAW_FEEDBACK_KEYS } from "../../../src/feedback-records.mjs";
import { readSrcFiles } from "../../support/read-src-files.mjs";
import { markedRegion, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const bannedCaptureFields = ["severity", "type", "category", "routing", "destination", "classification"];

export const archTests = [
  {
    name: "arch/FF-5507 capture exposes raw text and attribution, never a classification menu",
    async run() {
      const captureCommands = listCommands().filter((command) => String(command.run).includes("transitionFeedbackAppended"));
      assert.equal(captureCommands.length, 1, "there is one registered feedback capture command");
      assert.equal(captureCommands[0].id, "work:feedback");
      const command = getCommand("work:feedback");
      assert.deepEqual(Object.keys(command.input.properties), ["ref", "note", "actor", "refs"]);
      assert.deepEqual(Object.keys(command.cli.spec.flags), ["note", "actor", "refs"]);
      for (const field of bannedCaptureFields) {
        assert.ok(!(field in command.input.properties), `the capture input does not accept ${field}`);
        assert.ok(!(field in command.cli.spec.flags), `the CLI does not offer --${field}`);
      }
      assert.match(command.cli.spec.unknownFlagMessage, /classification belongs to later triage/i);

      const bundle = await readFile(path.join(root, "src", "bundle", "commands", "feedback.md"), "utf8");
      // The YAML frontmatter block, cut through the ONE home (milestone 47's ledger, and
      // VERIFICATION F-55-M-4 which caught this file adding a new instance). The tempting cut
      // — `bundle.slice(0, bundle.indexOf("---", 4) + 3)` — is the SENTINEL_END shape: with the
      // closing fence renamed or absent, `indexOf` returns -1 and the "header" silently becomes
      // two characters, so the ban below would be asserted over a region that is not the
      // frontmatter and would pass on a file that violates it. `markedRegion` returns null
      // instead, and the guard on the next line is then the only outcome.
      const header = markedRegion(bundle, "---", "---");
      assert.ok(header != null, "the bundled capture command carries a --- delimited YAML frontmatter block");
      for (const field of bannedCaptureFields) {
        assert.doesNotMatch(header, new RegExp(`(?:argument-hint|allowed-tools)[^\\n]*--?${field}`, "i"));
      }
      assert.doesNotMatch(bundle, /AskUserQuestion/, "the bundled capture path offers no prompt menu");
    },
  },
  {
    name: "arch/FF-5507 raw capture is append-only and precedes its STATE projection",
    async run() {
      assert.ok(Object.isFrozen(RAW_FEEDBACK_KEYS));
      assert.deepEqual([...RAW_FEEDBACK_KEYS], ["kind", "id", "text", "actor", "refs", "at"]);
      const store = stripComments(await readFile(path.join(root, "src", "feedback-records.mjs"), "utf8"));
      assert.match(store, /appendFile\(feedbackRecordPath\(item\)/, "records use the append-only filesystem primitive");
      assert.doesNotMatch(store, /\bwriteFile\b|\brename\b|\btruncate\b/, "the raw ledger has no rewrite primitive");

      const transition = stripComments(await readFile(path.join(root, "src", "effects", "doc-transitions.mjs"), "utf8"));
      const rawAt = transition.indexOf("await appendRawFeedback(item, raw)");
      const projectionAt = transition.indexOf("await appendFeedbackBullet(statePath, bullet)");
      assert.ok(rawAt >= 0 && projectionAt > rawAt, "the raw append is structurally before the human projection");
    },
  },
  {
    name: "arch/FF-5507 every production raw writer goes through the one capture transition",
    async run() {
      const callers = [];
      for (const file of await readSrcFiles(root)) {
        const source = stripComments(await readFile(file.path, "utf8"));
        if (/\bappendRawFeedback\s*\(/.test(source)) callers.push(file.rel.replaceAll("\\", "/"));
      }
      assert.deepEqual(callers.sort(), ["effects/doc-transitions.mjs", "feedback-records.mjs"]);

      const command = stripComments(await readFile(path.join(root, "src", "commands", "feedback.mjs"), "utf8"));
      const refusalAt = command.indexOf("feedback-classification-deferred");
      const resolveAt = command.indexOf("await resolveItemExact");
      const writeAt = command.indexOf("await transitionFeedbackAppended");
      assert.ok(refusalAt >= 0 && resolveAt > refusalAt && writeAt > resolveAt, "unknown capture fields are refused before resolution or write");
    },
  },
];
