// src/run-spend-ingest.mjs — the AUTHORITATIVE spend ingest for milestone 68,
// story 02 ("spend-ingest-at-settle"). This is the producer that turns a session's
// own transcript into the run record's `spend` envelope, stamped once as the run
// settles.
//
// WHY A NEW MODULE (ADR-006 + the story partition): `work-observe.mjs` already
// parses transcript `usage`, but ADR-006 demotes that module to a diagnostic
// companion, explicitly not the primary source of spend. Putting the authoritative
// ingest inside the module whose authority was just narrowed would re-merge the two
// roles the architecture separates. This module has no inbound edges to disturb and
// reads only the record contract (run-store.mjs), which is what makes this story
// parallel-eligible with 68/01 (01 populates `sessionId`; 02 consumes a record that
// already has one).
//
// THE SOURCE IS THE TRANSCRIPT (story 02 STORY.md): Claude Code's per-turn `usage`
// carries exactly the four buckets ADR-003 adopts — `input_tokens`,
// `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens` —
// already mutually exclusive, so ingestion is a STRAIGHT COPY with no arithmetic.
// It carries `model` and `effort` per turn too, and NO cost of any kind.
//
// THE WRITER OWNS THE CONVENTION (ADR-003/004; FF-6803/FF-6804): this producer
// reads the transcript and hands the raw per-turn vendor counts to the writer
// (run-store.mjs), which maps them to the four mutually-exclusive buckets, prices
// them at settle, validates and stamps the envelope. The producer never re-derives
// the bucket convention and never recomputes a cost — both live in the writer alone.
//
// A SESSION IS ITS WHOLE TRANSCRIPT TREE: subagent transcripts live under
// `<projectsDir>/<sessionId>/` and are walked recursively — the same shape
// `latestSessionActivityMtimeMs` (agent-session-driver.mjs:431-466) uses to watch
// the session, so the two can never disagree about a session's boundaries.
//
// ABSENCE STAYS DISTINGUISHABLE FROM ZERO (ADR-001): a session whose transcript is
// missing, unreadable, unparseable, or reports no usage leaves `spend` UNWRITTEN
// (null — not measured). A genuinely free run records a measured zero. Ingest never
// blocks or changes a settle: a failure to read the numbers is reported, never
// swallowed silently, and never fabricates a zero.
//
// ADR-008: this module READS what already happened. It introduces no bound, kills
// nothing, and branches on no `exitReason`.
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readRuns, settleRunFromVendor } from "./run-store.mjs";

// The vendor's per-turn usage keys, as the transcript reports them. Summed exactly
// as reported (no arithmetic between buckets); the WRITER maps these to the four
// mutually-exclusive buckets (ADR-003).
const VENDOR_USAGE_KEYS = Object.freeze([
  "input_tokens",
  "output_tokens",
  "cache_read_input_tokens",
  "cache_creation_input_tokens",
]);

// A run's terminal `outcome` → the closed `exitReason` vocabulary (ADR-008). The
// reason is RECORDED from what already happened; nothing branches on it.
const OUTCOME_TO_EXIT_REASON = Object.freeze({
  done: "final_output",
  failed: "error",
  cancelled: "abort",
});

function joinDistinct(values) {
  const sorted = [...values].sort();
  return sorted.join("|");
}

// parseTranscriptText(text) — the pure core: parse a JSONL transcript body and
// return the session's own reported numbers, copied with no arithmetic.
//
// Returns:
//   { vendorTokens, models:Set<string>, efforts:Set<string>, turns, toolCalls }
//   `vendorTokens` holds the per-turn vendor usage counts summed exactly as
//   reported; `turns` counts assistant messages that carry a `usage` block;
//   `toolCalls` counts tool_use content blocks; `models`/`efforts` are the distinct
//   per-turn values (a session that changed model partway through records both,
//   never silently the last one).
function parseTranscriptText(text) {
  const vendorTokens = Object.fromEntries(VENDOR_USAGE_KEYS.map((key) => [key, 0]));
  const models = new Set();
  const efforts = new Set();
  let turns = 0;
  let toolCalls = 0;
  for (const line of String(text ?? "").split("\n")) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue; // a malformed line is skipped; the rest of the transcript is still read
    }
    if (!o || o.type !== "assistant" || !o.message) continue;
    const usage = o.message.usage;
    if (usage) {
      turns += 1;
      for (const key of VENDOR_USAGE_KEYS) {
        const value = usage[key];
        if (Number.isFinite(value) && value > 0) vendorTokens[key] += value;
      }
    }
    if (typeof o.message.model === "string" && o.message.model.length > 0) models.add(o.message.model);
    if (typeof o.message.effort === "string" && o.message.effort.length > 0) efforts.add(o.message.effort);
    const content = o.message.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block && block.type === "tool_use") toolCalls += 1;
      }
    }
  }
  return { vendorTokens, models, efforts, turns, toolCalls };
}

// readTranscriptTree(projectsDir, sessionId) — the session's WHOLE transcript tree
// as one JSONL body, or `null` when the session has no readable transcript. Follows
// the driver's own shape (`latestSessionActivityMtimeMs`): the parent
// `<projectsDir>/<sessionId>.jsonl` plus every file under
// `<projectsDir>/<sessionId>/`, recursively. NEVER throws for an absent/missing
// path — absence is "no transcript there".
function transcriptKey(projectsDir, file) {
  return path.relative(projectsDir, file).split(path.sep).join("/");
}

async function transcriptFiles(projectsDir, sessionId) {
  const files = [];
  const parent = path.join(projectsDir, `${sessionId}.jsonl`);
  const parentStat = await stat(parent).catch(() => null);
  if (parentStat?.isFile()) files.push(parent);
  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else files.push(target);
    }
  };
  await walk(path.join(projectsDir, sessionId));
  return files;
}

// Snapshot byte offsets for a known conversation immediately before a resumed run.
// This is transient launch bookkeeping, never a run-record key. A file first created
// after the snapshot has offset zero and is therefore wholly attributed to this run.
export async function snapshotTranscriptTree(projectsDir, sessionId) {
  if (typeof sessionId !== "string" || sessionId.length === 0) return null;
  const offsets = {};
  for (const file of await transcriptFiles(projectsDir, sessionId)) {
    try {
      offsets[transcriptKey(projectsDir, file)] = (await stat(file)).size;
    } catch {
      // A file removed during the snapshot contributes nothing to the baseline.
      continue;
    }
  }
  return offsets;
}

export async function readTranscriptTree(projectsDir, sessionId, { baseline = null } = {}) {
  if (typeof sessionId !== "string" || sessionId.length === 0) return null;
  const chunks = [];
  for (const file of await transcriptFiles(projectsDir, sessionId)) {
    try {
      const body = await readFile(file);
      const key = transcriptKey(projectsDir, file);
      const recorded = baseline && Number.isSafeInteger(baseline[key]) && baseline[key] >= 0
        ? baseline[key]
        : 0;
      const offset = recorded <= body.length ? recorded : 0;
      let delta = body.subarray(offset);
      // If a snapshot caught a concurrently-written partial JSONL record, that record
      // began before this run. Drop its remainder rather than charging half a turn.
      if (offset > 0 && offset <= body.length && body[offset - 1] !== 0x0a) {
        const newline = delta.indexOf(0x0a);
        delta = newline === -1 ? Buffer.alloc(0) : delta.subarray(newline + 1);
      }
      if (delta.length > 0) chunks.push(delta.toString("utf8"));
    } catch {
      // One racing/unreadable file does not erase the readable remainder.
      continue;
    }
  }
  if (chunks.length === 0) return null;
  return chunks.join("\n");
}

// resolveRunRecord(item, runId) — the settle target, mirroring settleRun's own
// resolution: a supplied runId wins, else the item's single in-flight `running` run.
async function resolveRunRecord(item, runId) {
  if (runId) {
    const runs = await readRuns(item);
    return runs.find((run) => run.runId === runId) ?? null;
  }
  const running = (await readRuns(item)).filter((run) => run.state === "running");
  if (running.length !== 1) return null;
  return running[0];
}

// settleSpendFromTranscript(item, { runId, projectsDir, baseline, now, exitReason }) — stamp
// the run's spend ONCE, as it settles, from the session's own transcript (ADR-004:
// cost is stamped at settle and never recomputed on read). The WRITER maps the
// buckets, prices the cost, validates and stamps (run-store.settleRunFromVendor).
//
// Returns { stamped, reason?, envelope? }:
//   - { stamped: true, envelope } when the transcript was read and the envelope was
//     written through the writer — which VALIDATES it, so a convention violation
//     refuses the write and persists nothing (ADR-003).
//   - { stamped: false, reason } when the numbers cannot be measured (no session id,
//     no matching transcript, an unreadable transcript, no usage reported, or the
//     run is already stamped). In that case NOTHING is written: the record's `spend`
//     stays null (not measured), the run's own state/outcome/lineage are untouched,
//     and no zero is fabricated.
//
// `exitReason` is passed in when the caller knows how the run ended; otherwise it is
// derived from the run's terminal outcome (ADR-008 records what happened — it never
// decides anything). The failure to ingest is RETURNED (and may be reported by the
// caller) rather than swallowed silently; it never blocks or changes the settle.
export async function settleSpendFromTranscript(item, { runId, projectsDir, baseline = null, now, exitReason } = {}) {
  const record = await resolveRunRecord(item, runId);
  if (!record) {
    return { stamped: false, reason: "no-running-run" };
  }
  // STAMPED ONCE (ADR-004 / task 01 "settling a second time does not re-stamp"): a
  // run whose spend has already been stamped is NEVER overwritten — a price-table
  // correction changes future stamps only. `spend: null` (not measured) is NOT a
  // stamp, so an earlier failed ingest may be retried when the transcript appears.
  if (record.spend != null) {
    return { stamped: false, reason: "already-settled" };
  }
  const sessionId = record.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return { stamped: false, reason: "no-session-id" };
  }
  let parsed;
  try {
    const body = await readTranscriptTree(projectsDir, sessionId, { baseline });
    if (body == null) {
      return { stamped: false, reason: "transcript-unavailable-or-no-usage" };
    }
    parsed = parseTranscriptText(body);
  } catch (error) {
    return { stamped: false, reason: `transcript-unreadable:${error?.code ?? "error"}` };
  }
  if (parsed.turns === 0) {
    return { stamped: false, reason: "transcript-unavailable-or-no-usage" };
  }
  const full = await settleRunFromVendor(item, {
    runId: record.runId,
    vendorTokens: parsed.vendorTokens,
    model: joinDistinct(parsed.models) || "unknown",
    effort: joinDistinct(parsed.efforts) || "unknown",
    turns: parsed.turns,
    toolCalls: parsed.toolCalls,
    exitReason: exitReason ?? OUTCOME_TO_EXIT_REASON[record.outcome] ?? "final_output",
    now,
  });
  return { stamped: true, envelope: full.spend };
}
