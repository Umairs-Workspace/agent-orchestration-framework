import { defaultApplication as _aofApplication } from "aof/default-application";
// Fitness function for milestone 05 / ADR-001 + ADR-005 + ADR-007:
// "A fresh `reindex` from the .md files reproduces the index, and EVERY record's
//  `source` (path:line) resolves to live text at/after the recorded line in the
//  named file — memory holds no fact absent from its source."
//
// Behavioural proof (not a source grep): build the local index into a temp store
// from a small real/fixture stream; for each record split `source` into path:line,
// read that file, assert a line exists at/after the recorded line and the record's
// summary/title traces to text there; assert a SECOND reindex yields the identical
// record set (idempotent / no accretion).
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const reindex = _aofApplication.knowledge.memory.localIndexing.reindex;
const memoryIndexPath = _aofApplication.knowledge.memory.localIndexing.memoryIndexPath;
const readRecordSourceValue = _aofApplication.knowledge.memory.localIndexing.readRecordSourceValue;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const REAL_WORK_DIR = path.join(REPO_ROOT, "wiki", "work");
const M01_DIR = path.join(REAL_WORK_DIR, "archive", "01_milestone_acd-asset-bundle");

// Build a temp stream from the real milestone-01 corpus (RETROSPECTIVE + ARCHITECTURE)
// plus a tiny synthesized second milestone, so the proof covers both source kinds.
const TINY_RETRO = `# 09 · Tiny — Retrospective

## R1 — A tiny lesson about derived indexes

- **Kind:** near-miss · **Area:** tooling · **Stage:** build · **Owner:** developer · **Raised by:** developer
- **What happened:** the index was built.
- **Why:** because it is derived.
- **Lesson:** keep the index rebuildable and source-traced.
`;

const TINY_ARCH = `# 09 · Tiny — Architecture Decisions

## ADR-001: A tiny derived-index decision

**Status:** Accepted
**Date:** 2026-06-19

**Decision.** the index is a derived store, never a second source of truth.

**Invariant.** every record's source resolves to live text.
`;

// 157/ADR-002 — the episodic sources, so the control also resolves the JSON locator forms: a
// Findings register row (Markdown), a raw feedback row (NDJSON) and a run record (JSON).
const TINY_VERIFICATION = `# 09 · Tiny — Verification

## Findings

| id | severity | status | finding |
|----|----------|--------|---------|
| F-01 | major | open | the derived index cited a stale line |
`;
const TINY_FEEDBACK = `${JSON.stringify({ kind: "raw", id: "r1", text: "the index cited a stale line", actor: "qa", refs: "", at: "2026-10-11T10:00:00Z" })}
`;
const TINY_RUN = { runId: "20261011T100000000Z-0000", itemRef: "09", state: "done", attempt: 1, outcome: "done", sessionId: null, brief: {}, createdAt: "2026-10-11T10:00:00.000Z", updatedAt: "2026-10-11T10:30:00.000Z", failureReason: null, heartbeatAt: null, retryOf: null, reclaimedAt: null, node: "node-7297", resumeAfter: null, spend: null, asks: [] };

async function buildTempStream() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-arch-derived-"));
  const workDir = path.join(projectRoot, "wiki", "work");
  // m01: the real corpus (verbatim copy, so source lines match the real headings).
  const m01 = path.join(workDir, "01_milestone_acd-asset-bundle");
  await mkdir(m01, { recursive: true });
  await writeFile(path.join(m01, "RETROSPECTIVE.md"), await readFile(path.join(M01_DIR, "RETROSPECTIVE.md"), "utf8"), "utf8");
  await writeFile(path.join(m01, "ARCHITECTURE.md"), await readFile(path.join(M01_DIR, "ARCHITECTURE.md"), "utf8"), "utf8");
  // m09: tiny fixture exercising both parsers.
  const m09 = path.join(workDir, "09_milestone_tiny");
  await mkdir(m09, { recursive: true });
  await writeFile(path.join(m09, "RETROSPECTIVE.md"), TINY_RETRO, "utf8");
  await writeFile(path.join(m09, "ARCHITECTURE.md"), TINY_ARCH, "utf8");
  await writeFile(path.join(m09, "VERIFICATION.md"), TINY_VERIFICATION, "utf8");
  await writeFile(path.join(m09, "FEEDBACK.ndjson"), TINY_FEEDBACK, "utf8");
  await mkdir(path.join(m09, "runs", "node-7297"), { recursive: true });
  await writeFile(path.join(m09, "runs", "node-7297", `${TINY_RUN.runId}.json`), `${JSON.stringify(TINY_RUN, null, 2)}
`, "utf8");
  return { projectRoot, workDir, ctx: { workDir, projectRoot, configMemory: {} } };
}

// The leading content words a record's summary/title is built from — used to
// assert the record traces to text at/after its source line (the summary is a
// projection of the source body, not a restated second copy).
function contentTokens(value) {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 3);
}

export const archTests = [
  {
    name: "arch/ADR-001+005: every record's source resolves to live text at/after the recorded line",
    run: async () => {
      const { projectRoot, workDir, ctx } = await buildTempStream();
      try {
        const result = await reindex(null, ctx);
        assert.ok(result.recordCount > 0, "the build produced records");
        assert.ok(existsSync(memoryIndexPath(projectRoot)), "the index was written to the fixed path");

        const jsonTypes = new Set();
        for (const record of result.records) {
          // 157/ADR-002 — a JSON locator (`<path>#<pointer>`, `<path>:<line>#<pointer>`) names a
          // VALUE, never a line of pretty-printed JSON: it resolves to the record it was compiled from.
          if (record.source.includes("#")) {
            const value = await readRecordSourceValue(record, ctx);
            assert.equal(value?.[record.recordType === "run" ? "runId" : "id"], record.id, `record ${record.id}'s JSON source names it (${record.source})`);
            jsonTypes.add(record.recordType);
            continue;
          }
          // split source into path:line (path may contain no colon on posix; the
          // line is the trailing :N).
          const lastColon = record.source.lastIndexOf(":");
          assert.ok(lastColon > 0, `record ${record.id} source has a :line suffix (${record.source})`);
          const relPath = record.source.slice(0, lastColon);
          const lineNo = Number.parseInt(record.source.slice(lastColon + 1), 10);
          assert.ok(Number.isInteger(lineNo) && lineNo >= 1, `record ${record.id} line is a positive int`);

          const absPath = path.join(workDir, relPath);
          assert.ok(existsSync(absPath), `record ${record.id} source file exists: ${relPath}`);
          const lines = (await readFile(absPath, "utf8")).split(/\r?\n/);
          assert.ok(lineNo <= lines.length, `record ${record.id} line ${lineNo} within file`);

          // the recorded line is the record's own heading (R<n> or ADR-NNN), or a finding's register row.
          const headingLine = lines[lineNo - 1];
          assert.ok(
            headingLine.includes(record.id),
            `record ${record.id}'s source line is its heading: "${headingLine}"`,
          );

          // the record's title traces to text at/after that line (the heading carries the title).
          const region = lines.slice(lineNo - 1).join("\n").toLowerCase();
          const titleTokens = contentTokens(record.title);
          assert.ok(titleTokens.length > 0, `record ${record.id} has title tokens`);
          assert.ok(
            titleTokens.every((tok) => region.includes(tok)),
            `record ${record.id}'s title traces to source text at/after line ${lineNo}`,
          );

          // the summary's leading content words appear at/after the source line too
          // (the summary is a projection of the block body, not an invented fact).
          const summaryTokens = contentTokens(record.summary).slice(0, 6);
          assert.ok(
            summaryTokens.every((tok) => region.includes(tok)),
            `record ${record.id}'s summary traces to source text at/after line ${lineNo}`,
          );
        }
        assert.deepEqual([...jsonTypes].sort(), ["feedback", "run"], "non-vacuity: both JSON locator forms were resolved");
        assert.ok(result.records.some((record) => record.recordType === "finding"), "non-vacuity: a Markdown finding row was resolved");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/ADR-001: a second reindex yields the identical record set (idempotent / no accretion)",
    run: async () => {
      const { projectRoot, ctx } = await buildTempStream();
      try {
        const first = await reindex(null, ctx);
        const second = await reindex(null, ctx);

        assert.equal(second.recordCount, first.recordCount, "recordCount is stable across reindexes");

        // compare the full record set ignoring only the index-document's generatedAt
        // (which is intentionally a timestamp, not part of a record).
        const normalize = (records) =>
          records
            .map((r) => JSON.stringify(r))
            .sort();
        assert.deepEqual(normalize(second.records), normalize(first.records), "the record set is byte-identical across reindexes");
      } finally {
        await rm(projectRoot, { recursive: true, force: true });
      }
    },
  },
];
