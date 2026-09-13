import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invoke } from "../../src/command-core.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import {
  FEEDBACK_CLASSIFICATION_KEYS,
  RAW_FEEDBACK_KEYS,
  feedbackRecordPath,
  readFeedbackRecords,
  recordFeedbackClassification,
} from "../../src/feedback-records.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";

const AT = "2026-08-26T16:00:00.000Z";
const LATER = "2026-08-26T17:00:00.000Z";
const cliPath = fileURLToPath(new URL("../../bin/aof.mjs", import.meta.url));

function recordDoc(fields, title) {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n# ${title}\n`;
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-raw-feedback-"));
  const workDir = path.join(root, "wiki", "work");
  const milestoneDir = path.join(workDir, "55_milestone_anchors");
  const storyDir = path.join(milestoneDir, "stories", "03_story_raw-capture");
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await mkdir(storyDir, { recursive: true });
  await writeFile(path.join(root, ".aof", "aof.config.json"), JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }), "utf8");
  await writeFile(path.join(milestoneDir, "SPEC.md"), recordDoc({ type: "milestone", number: "55", slug: "anchors", status: "in-progress", title: '"Anchors"', created: "2026-08-26", updated: "2026-08-26", schema: 1 }, "55 Anchors"), "utf8");
  await writeFile(path.join(milestoneDir, "STATE.md"), "# State\n\n## Feedback (for retro)\n\n", "utf8");
  await writeFile(path.join(storyDir, "STORY.md"), recordDoc({ type: "story", number: "03", slug: "raw-capture", status: "in-progress", title: '"Raw capture"', parent: 55, created: "2026-08-26", updated: "2026-08-26", schema: 1 }, "03 Raw capture"), "utf8");
  await writeFile(path.join(storyDir, "STATE.md"), "# State\n\n## Feedback (for retro)\n\n", "utf8");
  const workspace = await loadWorkspace(root);
  return {
    root,
    milestone: { ref: "55", type: "milestone", dir: milestoneDir },
    story: { ref: "55/03", type: "story", dir: storyDir },
    ctx: { workspace, now: () => AT, feedbackId: () => "feedback:raw-1" },
  };
}

async function absent(file) {
  try {
    await stat(file);
    return false;
  } catch (error) {
    if (error.code === "ENOENT") return true;
    throw error;
  }
}

export const rawCaptureBeforeClassificationTests = [
  {
    name: "55/03 raw capture: exact text, actor, and moment are durable before classification",
    async run() {
      const fx = await fixture();
      const text = "  Keep THIS punctuation!\r\nAnd this line exactly.  ";
      try {
        const result = await invoke("work:feedback", { ref: "55/03", note: text, actor: "qa" }, fx.ctx);
        assert.equal(result.ok, true);
        assert.equal(result.rawId, "feedback:raw-1");
        assert.equal(result.recordedAt, AT);
        const records = await readFeedbackRecords(fx.story);
        assert.equal(records.length, 1);
        assert.deepEqual(Object.keys(records[0]), [...RAW_FEEDBACK_KEYS]);
        assert.equal(records[0].kind, "raw");
        assert.equal(records[0].text, text, "the raw ledger preserves every input byte represented by the string");
        assert.equal(records[0].actor, "qa");
        assert.equal(records[0].at, AT);
        assert.ok(!("classification" in records[0]), "capture carries no nullable classification field");
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/03 ordering: raw evidence survives even when the later STATE projection cannot be written",
    async run() {
      const fx = await fixture();
      try {
        await rm(path.join(fx.story.dir, "STATE.md"));
        await mkdir(path.join(fx.story.dir, "STATE.md"));
        await assert.rejects(invoke("work:feedback", { ref: "55/03", note: "capture me first", actor: "qa" }, fx.ctx));
        const records = await readFeedbackRecords(fx.story);
        assert.equal(records.length, 1);
        assert.equal(records[0].text, "capture me first");
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/03 no menu: classification-shaped command inputs are refused before any write",
    async run() {
      const fx = await fixture();
      try {
        for (const key of ["severity", "type", "category", "routing", "destination"]) {
          await assert.rejects(
            invoke("work:feedback", { ref: "55/03", note: "raw", actor: "qa", [key]: "chosen" }, fx.ctx),
            (error) => error.code === "feedback-classification-deferred" && /later triage/i.test(error.message),
          );
        }
        assert.equal(await absent(feedbackRecordPath(fx.story)), true);
        assert.equal((await readFile(path.join(fx.story.dir, "STATE.md"), "utf8")).includes("- raw"), false);
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/03 CLI: a severity flag is refused by name, points to later triage, and records nothing",
    async run() {
      const fx = await fixture();
      try {
        const result = spawnCliSync(process.execPath, [cliPath, "work", "feedback", "55/03", "--note", "raw", "--severity", "critical"], {
          cwd: fx.root,
          encoding: "utf8",
          env: { ...process.env, NODE_NO_WARNINGS: "1" },
        });
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /classification belongs to later triage/i);
        assert.equal(await absent(feedbackRecordPath(fx.story)), true);
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/03 routing: milestone and story targets choose their own committed ledger without prompting",
    async run() {
      const fx = await fixture();
      try {
        await invoke("work:feedback", { ref: "55", note: "milestone note", actor: "po" }, { ...fx.ctx, feedbackId: () => "feedback:m" });
        await invoke("work:feedback", { ref: "55/03", note: "story note", actor: "qa" }, { ...fx.ctx, feedbackId: () => "feedback:s" });
        assert.deepEqual((await readFeedbackRecords(fx.milestone)).map((record) => record.text), ["milestone note"]);
        assert.deepEqual((await readFeedbackRecords(fx.story)).map((record) => record.text), ["story note"]);
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/03 triage: classifications append as references and re-triage never disturbs the raw line",
    async run() {
      const fx = await fixture();
      try {
        await invoke("work:feedback", { ref: "55/03", note: "the original words", actor: "qa" }, fx.ctx);
        const rawBytes = await readFile(feedbackRecordPath(fx.story), "utf8");
        await recordFeedbackClassification(fx.story, {
          id: "feedback:triage-1",
          raw: "feedback:raw-1",
          at: LATER,
          classification: { severity: "high", routing: "55/04" },
        });
        await recordFeedbackClassification(fx.story, {
          id: "feedback:triage-2",
          raw: "feedback:raw-1",
          at: "2026-08-26T18:00:00.000Z",
          classification: { severity: "medium", routing: "55/05" },
        });
        const after = await readFile(feedbackRecordPath(fx.story), "utf8");
        assert.ok(after.startsWith(rawBytes), "triage only appends after the byte-identical raw line");
        const records = await readFeedbackRecords(fx.story);
        assert.equal(records[0].text, "the original words");
        assert.deepEqual(records.slice(1).map((record) => Object.keys(record)), [
          [...FEEDBACK_CLASSIFICATION_KEYS],
          [...FEEDBACK_CLASSIFICATION_KEYS],
        ]);
        assert.deepEqual(records.slice(1).map((record) => record.raw), ["feedback:raw-1", "feedback:raw-1"]);
        assert.deepEqual(records.slice(1).map((record) => record.classification.severity), ["high", "medium"]);
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "55/03 triage refusal: a classification cannot exist without its raw record",
    async run() {
      const fx = await fixture();
      try {
        await assert.rejects(
          recordFeedbackClassification(fx.story, {
            id: "feedback:triage-orphan",
            raw: "feedback:missing",
            at: LATER,
            classification: { severity: "high" },
          }),
          (error) => error.code === "feedback-raw-not-found",
        );
        assert.equal(await absent(feedbackRecordPath(fx.story)), true, "the refused classification creates no ledger");
      } finally {
        await rm(fx.root, { recursive: true, force: true });
      }
    },
  },
];
