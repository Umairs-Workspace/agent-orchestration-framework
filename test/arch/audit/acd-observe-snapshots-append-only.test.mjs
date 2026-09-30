import { defaultSessionDriver as _aofSessions } from "aof/session-services";
// Fitness function: acd-observe-snapshots-append-only (milestone 68 / story 05 /
// 68/ADR-007 / FF-6807) — "Snapshots are append-only."
//
//   "No write path under packages/core/src/work/observe.mjs opens an existing snapshot for
//    truncation or rewrite; each run writes a new timestamped artefact."
//
// The pre-68 miner wrote `observability/report.md` + `observability/agents.json` IN
// PLACE, and a retrospective's citation to that mutable path became unfalsifiable
// (the report was regenerated over the evidence it was written from). Each observe run
// now writes a NEW timestamped snapshot under `observability/snapshots/<ts>/`, and the
// legacy in-place files are MARKED, never rewritten (their figures untouched).
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
import { readRuntimeFiles } from "../../support/read-src-files.mjs";
const WORK_OBSERVE = path.join(root, "packages/work/src/observe.mjs");


export const archTests = [
  {
    name: "arch/68 FF-6807 (acd-observe-snapshots-append-only): no write path targets a legacy in-place snapshot for truncation or rewrite, and the observe writer writes a timestamped snapshot",
    run: async () => {
      const code = await readFile(WORK_OBSERVE, "utf8");
      // The regression shape is a writeFile whose target is literally the legacy
      // root-level path (`path.join(obsDir, "report.md")` / `agents.json`) — the
      // in-place truncate-and-rewrite that destroyed a retrospective's evidence.
      assert.doesNotMatch(
        code,
        /writeFile\([^)]*path\.join\(\s*obsDir\s*,\s*["'](?:report\.md|agents\.json)["']\s*\)/,
        "no write path opens the legacy root-level report.md/agents.json for truncation or rewrite",
      );
      // The observe writer must write under a timestamped snapshot directory.
      assert.match(code, /snapshotDir\s*=\s*path\.join\(\s*obsDir\s*,\s*["']snapshots["']/, "the write block targets observability/snapshots/");
      assert.match(code, /snapshotTimestamp\(/, "each snapshot is written under a timestamp-derived folder (identifiable by when it was taken)");
    },
  },
  {
    name: "arch/68 FF-6807 (acd-observe-snapshots-append-only): behaviour over the real seam — two observe runs produce two distinct timestamped snapshots, the first byte-identical, and legacy files are marked not rewritten",
    run: async () => {
      const { observeMilestone, readLatestSnapshot, projectSlug, PRE68_JSON_KEY } = await Promise.resolve(Object.freeze({
  BUILD_ROLES: _aofSessions.workObserve.BUILD_ROLES,
  DEFAULT_HUMAN_WAIT_MS: _aofSessions.workObserve.DEFAULT_HUMAN_WAIT_MS,
  DEFAULT_STALL_MS: _aofSessions.workObserve.DEFAULT_STALL_MS,
  HUMAN_INPUT_TOOL_NAMES: _aofSessions.workObserve.HUMAN_INPUT_TOOL_NAMES,
  NEEDS_INPUT_SENTINEL: _aofSessions.workObserve.NEEDS_INPUT_SENTINEL,
  PRE68_DERIVATION_MARKER: _aofSessions.workObserve.PRE68_DERIVATION_MARKER,
  PRE68_JSON_KEY: _aofSessions.workObserve.PRE68_JSON_KEY,
  PRE68_MINER: _aofSessions.workObserve.PRE68_MINER,
  analyzeSessionThread: _aofSessions.workObserve.analyzeSessionThread,
  analyzeTranscript: _aofSessions.workObserve.analyzeTranscript,
  analyzeWaves: _aofSessions.workObserve.analyzeWaves,
  applyCacheTarget: _aofSessions.workObserve.applyCacheTarget,
  askQuestionFromTurn: _aofSessions.workObserve.askQuestionFromTurn,
  buildSessionItemIndex: _aofSessions.workObserve.buildSessionItemIndex,
  cacheTargetIsHonourable: _aofSessions.workObserve.cacheTargetIsHonourable,
  classifyToolCallResult: _aofSessions.workObserve.classifyToolCallResult,
  claudeProjectsDir: _aofSessions.workObserve.claudeProjectsDir,
  clusterInfraKills: _aofSessions.workObserve.clusterInfraKills,
  collectMilestoneAgents: _aofSessions.workObserve.collectMilestoneAgents,
  collectSessionSignals: _aofSessions.workObserve.collectSessionSignals,
  fmtDur: _aofSessions.workObserve.fmtDur,
  humanTurnText: _aofSessions.workObserve.humanTurnText,
  markLegacySnapshot: _aofSessions.workObserve.markLegacySnapshot,
  markLegacySnapshots: _aofSessions.workObserve.markLegacySnapshots,
  mergeIntervals: _aofSessions.workObserve.mergeIntervals,
  observabilityEnabled: _aofSessions.workObserve.observabilityEnabled,
  observeMilestone: _aofSessions.workObserve.observeMilestone,
  overlapMs: _aofSessions.workObserve.overlapMs,
  pre68DerivationHeader: _aofSessions.workObserve.pre68DerivationHeader,
  pre68JsonHeader: _aofSessions.workObserve.pre68JsonHeader,
  projectSlug: _aofSessions.workObserve.projectSlug,
  readAskQuestion: _aofSessions.workObserve.readAskQuestion,
  readLastAssistantTurn: _aofSessions.workObserve.readLastAssistantTurn,
  readLatestSnapshot: _aofSessions.workObserve.readLatestSnapshot,
  renderReportMarkdown: _aofSessions.workObserve.renderReportMarkdown,
  resolveMilestoneFolder: _aofSessions.workObserve.resolveMilestoneFolder,
  rollupRunsByPhase: _aofSessions.workObserve.rollupRunsByPhase,
  snapshotTimestamp: _aofSessions.workObserve.snapshotTimestamp,
  tokenSplit: _aofSessions.workObserve.tokenSplit,
  unionMs: _aofSessions.workObserve.unionMs,
  verdictForCacheBucket: _aofSessions.workObserve.verdictForCacheBucket,
}));
      const repo = await mkdtemp(path.join(os.tmpdir(), "aof-snap-arch-"));
      const home = await mkdtemp(path.join(os.tmpdir(), "aof-snap-arch-home-"));
      try {
        const folder = "68_milestone_loop-telemetry";
        const milestoneDir = path.join(repo, "wiki", "work", folder);
        const obsDir = path.join(milestoneDir, "observability");
        await mkdir(obsDir, { recursive: true });
        const slug = projectSlug(repo);
        const subDir = path.join(home, ".claude", "projects", slug, "sess-1", "subagents");
        await mkdir(subDir, { recursive: true });
        await writeFile(path.join(subDir, "a.meta.json"), JSON.stringify({ agentType: "aof-developer", description: "x" }));
        await writeFile(
          path.join(subDir, "a.jsonl"),
          [
            JSON.stringify({ type: "user", timestamp: "2026-08-20T10:00:00.000Z", message: { role: "user", content: "for 68" } }),
            JSON.stringify({ type: "assistant", timestamp: "2026-08-20T10:01:00.000Z", message: { model: "m", content: [{ type: "text", text: "x" }], usage: { output_tokens: 10 } } }),
          ].join("\n") + "\n",
        );
        // A legacy pre-68 in-place snapshot with figures, including a wrong figure.
        await writeFile(path.join(obsDir, "agents.json"), JSON.stringify({ milestone: "45", agents: [{ id: "a", tokens: { out: 999 } }] }), "utf8");

        const t = (h) => new Date(Date.parse("2026-08-20T10:00:00.000Z") + h * 3600 * 1000).toISOString();
        const first = await observeMilestone({ cwd: repo, ref: "68", home, env: {}, generatedAt: t(1), write: true });
        const firstBytes = await readFile(first.written.reportPath, "utf8");
        const second = await observeMilestone({ cwd: repo, ref: "68", home, env: {}, generatedAt: t(2), write: true });

        assert.notEqual(first.written.reportPath, second.written.reportPath, "the two runs write DIFFERENT snapshot files");
        assert.equal(await readFile(first.written.reportPath, "utf8"), firstBytes, "the first snapshot's bytes are unchanged");
        const latest = await readLatestSnapshot({ cwd: repo, ref: "68" });
        assert.equal(latest.reportPath, second.written.reportPath, "the read path resolves the newest snapshot");

        // The legacy agents.json was MARKED (provenance key added) with its figures
        // left exactly as produced — 999, never recomputed.
        const legacy = JSON.parse(await readFile(path.join(obsDir, "agents.json"), "utf8"));
        assert.ok(legacy[PRE68_JSON_KEY], "the legacy snapshot carries a provenance marker");
        assert.equal(legacy.agents[0].tokens.out, 999, "the legacy figure is left untouched (marking, not migrating)");
      } finally {
        await rm(repo, { recursive: true, force: true });
        await rm(home, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/68 FF-6807 (acd-observe-snapshots-append-only): no module in src/** truncates an observability snapshot",
    run: async () => {
      const modules = (await readRuntimeFiles(root)).map(file => file.path);
      assert.ok(modules.length > 150, `src was actually walked: ${modules.length} modules`);
      const offenders = [];
      for (const file of modules) {
        // COMMENTS ARE STRIPPED FIRST, and that is the difference between a claim about what a
        // module DOES and a claim about what its prose says. Measured at 96's milestone gate: this
        // census named `packages/core/src/commands/loop-record.mjs`, whose only offence was a comment explaining
        // that the writer is "a read-modify-write, not a truncate-and-emit" — a module documenting
        // that it does NOT truncate was reported as truncating. A control that reds on its own
        // subject's correct documentation teaches people to stop writing it.
        const code = stripComments((await readFile(file, "utf8")).replace(/\r\n/gu, "\n"));
        // A `truncate` on a snapshot path, or a write that forces truncation of an
        // existing observability file, is the append-only violation.
        if (/\btruncate\b/.test(code) && /observability/.test(code)) {
          offenders.push(path.relative(root, file));
        }
      }
      assert.deepEqual(offenders, [], `no module truncates an observability snapshot (offenders: ${offenders.join("; ")})`);
    },
  },
];
