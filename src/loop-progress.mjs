import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { reportDegrade } from "./degrade.mjs";
import {
  buildNoProgressRoundsFromConfig,
  progressMaxResetsFromConfig,
  resolveBuildNoProgressRounds,
  resolveProgressMaxResets,
} from "./loop-bounds.mjs";
import { laneChanges } from "./work/dispatch.mjs";

const execFileAsync = promisify(execFile);

const SAMPLE_KEYS = Object.freeze([
  "at",
  "runId",
  "filesTouched",
  "linesChanged",
  "commitsMade",
  "failingScenarios",
]);

function nonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative safe integer`);
  return value;
}

function safeLeaf(value, name) {
  if (typeof value !== "string" || value.length === 0 || path.basename(value) !== value) {
    throw new TypeError(`${name} must be a path-safe non-empty string`);
  }
  return value;
}

function reportFault(error, options) {
  if (typeof options?.onFault === "function") {
    try {
      options.onFault(error);
      return;
    } catch (reportError) {
      reportDegrade("loop-progress", reportError);
    }
  }
  reportDegrade("loop-progress", error);
}

export function progressSample(input = {}) {
  const at = typeof input.at === "string" && Number.isFinite(Date.parse(input.at)) ? input.at : null;
  if (at == null) throw new TypeError("at must be a parseable timestamp");
  const runId = safeLeaf(input.runId, "runId");
  const filesTouched = [...new Set((input.filesTouched ?? []).map((file) => String(file)).filter(Boolean))].sort();
  return Object.freeze({
    at,
    runId,
    filesTouched: Object.freeze(filesTouched),
    linesChanged: nonNegativeInteger(input.linesChanged, "linesChanged"),
    commitsMade: nonNegativeInteger(input.commitsMade, "commitsMade"),
    failingScenarios: nonNegativeInteger(input.failingScenarios, "failingScenarios"),
  });
}

async function gitOutput(worktreePath, args, options) {
  if (typeof options?.exec === "function") {
    const result = await options.exec(args, { cwd: worktreePath });
    if (result?.status !== 0) throw new Error(`git ${args[0]} failed with status ${result?.status}`);
    return String(result.stdout ?? "");
  }
  const result = await execFileAsync("git", args, { cwd: worktreePath, windowsHide: true, encoding: "utf8" });
  return String(result.stdout ?? "");
}

export async function sampleWorktreeProgress(input, options = {}) {
  const filesTouched = await laneChanges(input.worktreePath, { exec: options.exec });
  const numstat = await gitOutput(input.worktreePath, ["diff", "--numstat", "HEAD", "--"], options);
  const linesChanged = numstat.split(/\r?\n/u).reduce((total, line) => {
    const [added, removed] = line.split("\t");
    return total + (Number.parseInt(added, 10) || 0) + (Number.parseInt(removed, 10) || 0);
  }, 0);
  const commitsMade = input.baseCommit == null
    ? 0
    : Number.parseInt((await gitOutput(input.worktreePath, ["rev-list", "--count", `${input.baseCommit}..HEAD`], options)).trim(), 10);
  return progressSample({
    at: input.at,
    runId: input.runId,
    filesTouched,
    linesChanged,
    commitsMade: Number.isSafeInteger(commitsMade) ? commitsMade : 0,
    failingScenarios: input.failingScenarios,
  });
}

export function progressLedgerPath(item, run) {
  if (typeof item?.dir !== "string" || item.dir.length === 0) throw new TypeError("item.dir is required");
  const runId = safeLeaf(run?.runId, "runId");
  const partition = run?.node == null ? [] : [safeLeaf(run.node, "node")];
  return path.join(item.dir, "runs", ...partition, `${runId}.progress.ndjson`);
}

export async function appendProgressSample(item, run, sample) {
  const normalized = progressSample({ ...sample, runId: run.runId });
  const ledgerPath = progressLedgerPath(item, run);
  await mkdir(path.dirname(ledgerPath), { recursive: true });
  await appendFile(ledgerPath, `${JSON.stringify(normalized)}\n`, "utf8");
  return normalized;
}

export async function readProgressSamples(item, run, options = {}) {
  let source;
  try {
    source = await readFile(progressLedgerPath(item, run), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    reportFault(error, options);
    return [];
  }

  const samples = [];
  for (const line of source.split(/\r?\n/u)) {
    if (line.length === 0) continue;
    try {
      const raw = JSON.parse(line);
      if (Object.keys(raw).sort().join("\0") !== [...SAMPLE_KEYS].sort().join("\0")) {
        throw new TypeError("progress sample has an invalid key set");
      }
      samples.push(progressSample(raw));
    } catch (error) {
      reportFault(error, options);
    }
  }
  return samples;
}

export function madeProgress(previous, current) {
  if (previous == null || current == null) return false;
  return previous.linesChanged !== current.linesChanged
    || previous.commitsMade !== current.commitsMade
    || previous.failingScenarios !== current.failingScenarios
    || previous.filesTouched.length !== current.filesTouched.length
    || previous.filesTouched.some((file, index) => file !== current.filesTouched[index]);
}

function consecutiveStalls(samples) {
  let stalls = 0;
  for (let index = samples.length - 1; index > 0; index -= 1) {
    if (madeProgress(samples[index - 1], samples[index])) break;
    stalls += 1;
  }
  return stalls;
}

function summarize(samples) {
  const last = samples.at(-1) ?? null;
  return Object.freeze({
    sampleCount: samples.length,
    filesTouched: Object.freeze([...new Set(samples.flatMap((sample) => sample.filesTouched))].sort()),
    linesChanged: last?.linesChanged ?? 0,
    commitsMade: last?.commitsMade ?? 0,
    failingScenarios: last?.failingScenarios ?? 0,
  });
}

export function progressPolicyFromConfig(workspace) {
  return Object.freeze({
    maxStalls: buildNoProgressRoundsFromConfig(workspace),
    maxResets: progressMaxResetsFromConfig(workspace),
  });
}

export function evaluateProgressPolicy(samples, options = {}) {
  const maxStalls = resolveBuildNoProgressRounds(options.maxStalls);
  const maxResets = resolveProgressMaxResets(options.maxResets);
  const resets = Number.isSafeInteger(options.resets) && options.resets >= 0 ? options.resets : 0;
  const stalls = consecutiveStalls(samples);
  if (stalls < maxStalls) return Object.freeze({ action: "continue", stalls, resets });
  const summary = summarize(samples);
  return resets >= maxResets
    ? Object.freeze({ action: "escalate", stalls, resets, summary, disposition: "preserved-for-triage" })
    : Object.freeze({ action: "reset", stalls, resets: resets + 1, summary });
}

export function decideBuildProgress(failingCounts, options = {}) {
  const counts = (failingCounts ?? []).map((count) => nonNegativeInteger(count, "failing count"));
  const failingCount = counts.at(-1) ?? null;
  if (failingCount === 0) return Object.freeze({ action: "done", failingCount, progressBoundConsulted: false });

  const maxStalls = resolveBuildNoProgressRounds(options.maxStalls);
  let stalls = 0;
  for (let index = counts.length - 1; index > 0; index -= 1) {
    if (counts[index] < counts[index - 1]) break;
    stalls += 1;
  }
  return stalls >= maxStalls
    ? Object.freeze({ action: "halt", stop: "no-progress", failingCount, noProgressRounds: stalls })
    : Object.freeze({ action: "continue", failingCount, noProgressRounds: stalls });
}
