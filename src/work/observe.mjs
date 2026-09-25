// Milestone observability — reconstruct per-agent time/token spend for a work item
// from Claude Code's on-disk session transcripts, and write an opt-in
// `observability/` folder into the milestone.
//
// WHY this exists: an aof milestone is delivered by a fan-out of subagents
// (researcher / architect / qa / developer / …). Claude Code records every one of
// those as a JSONL transcript under `~/.claude/projects/<slug>/<session>/subagents/`,
// each with a `.meta.json` (agentType + task description) and per-turn `usage`
// (token counts) + timestamps. Nothing surfaces that back to the milestone, so a
// slow run is a black box — you cannot see which agent took longest, burned the
// most tokens, or (critically) STALLED. This module mines those transcripts and
// renders the answer.
//
// STALL DETECTION is the load-bearing feature: a subagent that dropped its API
// connection or was interrupted looks identical to a busy one. We flag any
// inter-event gap over a threshold, and report `activeMs` (wall-clock MINUS stall
// gaps) alongside raw duration — so an 8-hour "duration" that was really a 6-minute
// task frozen overnight reads as exactly that.

import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { reportDegrade } from "../degrade.mjs";
// milestone 127 / ADR-001 §5 — THE STREAM IS ENUMERATED THROUGH THE ONE ENUMERATOR. This
// module used to be an eighth work-root scanner (`readdir(<cwd>/wiki/work)` + `/^(\d+)_/` in
// three functions, plus each milestone's `stories/`): its own grammar, which admitted any
// numbered folder and could see neither the backlog nor the archive. The three take
// `listItems`'s rows now, and the one raw listing that remains (`countUnattributedRuns`)
// carries no item-name match at all — it asks the rows which folders are items and the
// two exported root names which are roots, and counts what is left.
import { listItems, BACKLOG_ROOT, ARCHIVE_ROOT } from "../work.mjs";

export const DEFAULT_STALL_MS = 10 * 60 * 1000; // 10 min idle => flagged as a stall

// The work root this module observes: `<cwd>/wiki/work`, as every caller passes it.
const workDirOf = (cwd) => path.join(cwd, "wiki", "work");

// THE OBSERVE REF — the id vocabulary this module has always used, kept verbatim so run
// records written under it still join: a NUMBERED row's id is its number with the leading
// zeros dropped (`"05"` → `"5"`, a story `"05/00"` → `"5/0"`), exactly what the retired
// `String(Number(m[1]))` produced. A backlog row has no number, so its id is its ref (the
// slug) — the only ref it has. The strip is a STRING transform, not a numeric coercion: the id
// is a spelling of the folder's digits, and a `.number` consumer that coerces is FF-12702's
// subject (round-one review, 2026-09-11 — a `Number(row.number)` here was a coercion the
// control's grammar could not see, and this module is not one of its ten files by contract).
const dropLeadingZeros = (digits) => digits.replace(/^0+(?=\d)/, "");
const observeIdOf = (row) => (row.number == null ? row.ref : dropLeadingZeros(row.number));
const observeRefOf = (row) => (row.parent == null ? observeIdOf(row) : `${dropLeadingZeros(row.parent)}/${observeIdOf(row)}`);

// A row's folder relative to the work root, forward-slashed — `"NN_slug"`,
// `"NN_slug/stories/SS_story_slug"`, or under the archive `"archive/NN_slug"` — the
// `folder` every caller joins back under `<cwd>/wiki/work`.
const relativeFolderOf = (workDir, row) => path.relative(workDir, row.dir).split(path.sep).join("/");

// Claude Code slugifies the project cwd by replacing every non-[A-Za-z0-9]
// character with "-" (so `C:\Source\vista-app\vista-app-web` ->
// `C--Source-vista-app-vista-app-web`; existing hyphens are preserved).
export function projectSlug(cwd) {
  return String(cwd).replace(/[^A-Za-z0-9]/g, "-");
}

// The `<slug>` directory under Claude Code's projects store. Honours
// CLAUDE_CONFIG_DIR (Claude Code's own override) before falling back to ~/.claude.
export function claudeProjectsDir({ cwd = process.cwd(), home = os.homedir(), env = process.env } = {}) {
  const base = env.CLAUDE_CONFIG_DIR ? env.CLAUDE_CONFIG_DIR : path.join(home, ".claude");
  return path.join(base, "projects", projectSlug(cwd));
}

// milestone 131 / ADR-002 — THE LAST ASSISTANT TURN IS READ HERE, ONCE. The driver used to
// walk a transcript privately for its settled outcome and throw the turn's words away; the
// question a session asks lives in those words, so the scan moved into the transcript family
// and the driver's outcome is a mapping over it. The two literals the reader and the detectors
// share live beside it, because this module may not import the driver that imports it (the
// driver re-exports both, so its frozen seventeen do not move).
export const NEEDS_INPUT_SENTINEL = "NEEDS_INPUT";
// The closed set of tools whose PENDING call means the session is waiting on a human (measured
// live 2026-07-27, `/aof:autonomous 18`: a scope question asked through the widget read as a
// healthy `running` for 28+ minutes). An ordinary pending tool is still working and never matches.
export const HUMAN_INPUT_TOOL_NAMES = ["AskUserQuestion"];

// readLastAssistantTurn(file, sinceOffset = 0) → null | { stopReason, text, humanInputTool,
// answered } — the transcript's LAST assistant record, read from the end. Records at or before
// `sinceOffset` (a resumed session's size at spawn) are pre-resume history and are not read; a
// baseline that cuts a line drops that partial line, and one that lands on a record boundary
// keeps the next record. `text` joins the turn's text blocks, each followed by one `\n` (a string
// `content` is taken as it is); `humanInputTool` is its `{ name, input }` human-input `tool_use`
// block, or `null`; `answered` is true once a `user` record follows the turn. NEVER throws: an
// absent, unreadable or turn-less transcript is `null`.
export async function readLastAssistantTurn(file, sinceOffset = 0) {
  let bytes;
  try {
    bytes = await fsp.readFile(file);
  } catch {
    return null;
  }
  let text;
  if (sinceOffset > 0) {
    const cutMidLine = sinceOffset <= bytes.length && bytes[sinceOffset - 1] !== 0x0a;
    text = bytes.subarray(sinceOffset).toString("utf8");
    if (cutMidLine) {
      const firstNewline = text.indexOf("\n");
      text = firstNewline === -1 ? "" : text.slice(firstNewline + 1);
    }
  } else {
    text = bytes.toString("utf8");
  }
  const lines = text.split("\n");
  let answered = false;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    const record = safeParse(line);
    if (record == null) continue;
    if (record.type === "user") {
      answered = true;
      continue;
    }
    const message = record.message;
    if (record.type !== "assistant" || message == null || typeof message !== "object") continue;
    const content = message.content;
    let body = "";
    let humanInputTool = null;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === "text" && typeof block.text === "string") body += `${block.text}\n`;
        if (humanInputTool == null && block?.type === "tool_use" && HUMAN_INPUT_TOOL_NAMES.includes(block?.name)) {
          humanInputTool = { name: block.name, input: block.input };
        }
      }
    } else if (typeof content === "string") {
      body = content;
    }
    return { stopReason: message.stop_reason ?? null, text: body, humanInputTool, answered };
  }
  return null;
}

// askQuestionFromTurn(turn) → string | null — PURE. The question is the turn's own words: an
// ended turn's text with every sentinel line (a line whose trim() is the sentinel) removed and
// the whole trimmed; an unanswered human-input tool's questions, each followed by its option
// labels as `- <label>` lines, one blank line between questions. Anything else, and an empty
// result, is `null`. Never throws.
export function askQuestionFromTurn(turn) {
  if (turn == null || typeof turn !== "object") return null;
  if (turn.stopReason === "end_turn") {
    const kept = String(turn.text ?? "").split("\n").filter((line) => line.trim() !== NEEDS_INPUT_SENTINEL);
    const question = kept.join("\n").trim();
    return question.length > 0 ? question : null;
  }
  if (turn.stopReason === "tool_use" && turn.answered !== true && turn.humanInputTool != null) {
    const questions = turn.humanInputTool.input?.questions;
    if (!Array.isArray(questions)) return null;
    const blocks = [];
    for (const entry of questions) {
      if (typeof entry?.question !== "string") continue;
      const labels = Array.isArray(entry.options)
        ? entry.options.filter((option) => typeof option?.label === "string").map((option) => `- ${option.label}`)
        : [];
      blocks.push([entry.question, ...labels].join("\n"));
    }
    const question = blocks.join("\n\n").trim();
    return question.length > 0 ? question : null;
  }
  return null;
}

// readAskQuestion({ cwd, env, sessionId, sinceOffset }) → Promise<string | null> — the owner's
// one read of the question (ADR-004), composed from the projects dir and the two above. NEVER
// throws. A transcript that cannot be read, or holds no assistant turn after the baseline, is a
// fault: `null` after ONE `reportDegrade("ask-question-unreadable")`. A readable turn with
// nothing to ask is `null` quietly — the session asked nothing in words.
export async function readAskQuestion({ cwd, env = process.env, sessionId, sinceOffset = 0 } = {}) {
  try {
    if (typeof sessionId !== "string" || sessionId.length === 0) throw new Error("no session id to read a question from");
    const file = path.join(claudeProjectsDir({ cwd, env }), `${sessionId}.jsonl`);
    const turn = await readLastAssistantTurn(file, sinceOffset);
    if (turn == null) throw new Error(`no assistant turn to read in ${file}`);
    return askQuestionFromTurn(turn);
  } catch (error) {
    reportDegrade("ask-question-unreadable", error, { sessionId: sessionId ?? null });
    return null;
  }
}

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function shortLabel(obj) {
  const c = obj?.message?.content;
  if (Array.isArray(c)) {
    const tools = c.filter((b) => b.type === "tool_use").map((b) => b.name);
    if (tools.length) return `${obj.type} tool:${tools.join(",")}`;
    const text = c.find((b) => b.type === "text" && b.text)?.text;
    if (text) return `${obj.type} “${text.slice(0, 70).replace(/\s+/g, " ")}”`;
    const res = c.find((b) => b.type === "tool_result");
    if (res) return "tool_result";
  } else if (typeof c === "string" && c) {
    return `${obj.type} “${c.slice(0, 70).replace(/\s+/g, " ")}”`;
  }
  return obj?.type ?? "event";
}

// A Bash tool call is classified as a TEST RUN by what its RESULT says, not by the
// command string. The retired TOOLCHAIN_RE (a command-name pattern matching
// `npm test` / `vitest` / `jest`) reported ZERO toolchain runs on this repo, where
// every real test invocation is the isolated `AOF_GLOBAL_HOME=$(mktemp -d) node …`
// form the pattern never matched — a confident wrong answer that sent a planning
// lever to the wrong place (68/ADR-006). A pattern that must enumerate every way a
// project runs its tests will be wrong again in the next repo, silently, in the same
// direction, so classification reads the tool result instead: a test run's output is
// recognisable on its own, whatever command produced it.
//
// Markers that distinguish test-run output from an arbitrary command's output:
// COUNT-BEARING or STRUCTURAL report lines only — TAP-ish assertion lines (`ok - name`,
// `not ok 12 …`; this repo's own runner prints `ok - <test>` per test) and `# tests` /
// `# pass` / `# fail` summaries, jest/vitest summary keys (`Test Files 2 passed`), and
// count-bearing verdicts (`3 tests passed`, `2 failed`, `all pass`), plus AssertionError
// stack traces. Deliberately free of command/runner NAMES (no `vitest` / `jest` /
// `npm test`) AND of bare words (`test`, `spec`, `pass`, `fail`, ✓/✗): a `git status`
// listing `*.test.mjs` files, an `ls test/`, a grep hit containing "spec", a diff hunk
// saying "failing", or "Failed to connect" is NOT a test run, and ADR-006 prefers an
// honest absence over a confident wrong classification (F-07).
const TOOLCHAIN_RESULT_RE =
  /^\s*(?:not\s+ok|ok)\s*[-\d]|^#\s+(?:tests?|pass|fail|Subtest)\b|(?:Test Files|Tests?|Test Suites):?\s*\d+|\b\d+\s+(?:tests?|specs?|assertions?)\s+(?:passed|failed)\b|\b\d+\s+(?:passed|failed|passing)\b|\ball\s+pass(?:ed)?\b|\bAssertionError\b/im;

// Classify a Bash tool RESULT as a test run or not. Pure over the result content —
// never the command string (the classifier's whole point is that the command was the
// unreliable signal). Returns "test" | "other".
export function classifyToolCallResult(content) {
  return TOOLCHAIN_RESULT_RE.test(String(content || "")) ? "test" : "other";
}

// A stable signature for counting command repetition: strip the leading `cd "…" &&`,
// collapse whitespace, and keep the first ~90 chars — so the SAME suite re-run reads
// as one bucket even when the working-dir prefix differs.
function cmdSignature(cmd) {
  return String(cmd || "")
    .replace(/^cd\s+"[^"]*"\s*&&\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

function lastSegments(p, n = 3) {
  return String(p || "?")
    .split(/[\\/]/)
    .filter(Boolean)
    .slice(-n)
    .join("/");
}

// Parse one transcript (main session or subagent) into a stats record + a rich
// `diagnostics` block that explains WHY an agent was slow (toolchain-wait, loop /
// thrash, edit↔test interleaving, model-vs-tool time). Pure over `text`, so it is
// trivially unit-testable with a fixture string.
export function analyzeTranscript(text, { stallMs = DEFAULT_STALL_MS } = {}) {
  const lines = text.split("\n").filter(Boolean);
  const events = [];
  let firstTs = null;
  let lastTs = null;
  let turns = 0;
  let out = 0;
  let inp = 0;
  let cacheRead = 0;
  let cacheCreate = 0;
  let model = null;
  const tools = {};

  // Diagnostic collectors.
  const uses = []; // ordered { id, name, ts, kind, cmd, file }
  const results = new Map(); // tool_use_id -> { ts, isError, content }
  const editCounts = {};
  const readCounts = {};
  const cmdCounts = {}; // signature -> { count, ids: [] }

  for (const line of lines) {
    const o = safeParse(line);
    if (!o) continue;
    const ts = o.timestamp ? Date.parse(o.timestamp) : null;
    if (ts != null && !Number.isNaN(ts)) {
      if (firstTs == null || ts < firstTs) firstTs = ts;
      if (lastTs == null || ts > lastTs) lastTs = ts;
      events.push({ ts, label: shortLabel(o) });
    }
    if (o.type === "assistant" && o.message) {
      const u = o.message.usage;
      if (u) {
        turns += 1;
        out += u.output_tokens || 0;
        inp += u.input_tokens || 0;
        cacheRead += u.cache_read_input_tokens || 0;
        cacheCreate += u.cache_creation_input_tokens || 0;
      }
      if (o.message.model) model = o.message.model;
      const content = o.message.content;
      if (Array.isArray(content)) {
        for (const b of content) {
          if (b.type !== "tool_use") continue;
          tools[b.name] = (tools[b.name] || 0) + 1;
          let kind = "other";
          let cmd = null;
          let file = null;
          if (b.name === "Bash") {
            cmd = b.input?.command || "";
            // Classified as "bash" here; the RESULT (not the command) decides whether
            // it was a test run, in the reclassification pass after the loop.
            kind = "bash";
            const sig = cmdSignature(cmd);
            (cmdCounts[sig] ||= { count: 0, kind }).count += 1;
          } else if (b.name === "Edit" || b.name === "Write" || b.name === "NotebookEdit") {
            kind = "edit";
            file = b.input?.file_path || "?";
            editCounts[file] = (editCounts[file] || 0) + 1;
          } else if (b.name === "Read") {
            kind = "read";
            file = b.input?.file_path || "?";
            readCounts[file] = (readCounts[file] || 0) + 1;
          }
          uses.push({ id: b.id, name: b.name, ts, kind, cmd, file });
        }
      }
    }
    if (o.type === "user" && Array.isArray(o.message?.content)) {
      for (const b of o.message.content) {
        if (b.type !== "tool_result") continue;
        const content = typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? "");
        // Claude Code transcripts carry `is_error` on tool_result blocks; accept the
        // wrong-vocabulary spelling too, and keep the content regex as the fallback for
        // results that carry neither the field nor a quiet failure.
        const isError = Boolean(b.is_error ?? b.isError) || /(^|\W)(error|fail(ed|ure)?|✕|✗|not ok|Exception|Traceback)(\W|$)/i.test(content.slice(0, 400));
        if (ts != null) results.set(b.tool_use_id, { ts, isError, content });
      }
    }
  }

  events.sort((a, b) => a.ts - b.ts);
  const stalls = [];
  let stalledMs = 0;
  // Split the agent's lifetime into ACTIVE intervals — maximal runs of events whose
  // consecutive gap stays under the stall threshold. A gap >= threshold both closes
  // the current active interval and is recorded as a stall.
  const activeIntervals = [];
  let runStart = events.length ? events[0].ts : null;
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].ts - events[i - 1].ts;
    if (gap >= stallMs) {
      stalledMs += gap;
      stalls.push({ gapMs: gap, at: events[i - 1].ts, before: events[i - 1].label, after: events[i].label });
      activeIntervals.push([runStart, events[i - 1].ts]);
      runStart = events[i].ts;
    }
  }
  if (runStart != null) activeIntervals.push([runStart, events.length ? events[events.length - 1].ts : runStart]);
  stalls.sort((a, b) => b.gapMs - a.gapMs);

  // Reclassify Bash calls by their RESULT content (68/ADR-006): a Bash tool call is a
  // test run when its output reads like one, whatever command produced it. This runs
  // after the loop because the result arrives in a later turn.
  for (const u of uses) {
    if (u.name !== "Bash") continue;
    const res = results.get(u.id);
    if (res && classifyToolCallResult(res.content) === "test") {
      u.kind = "test";
      const sig = cmdSignature(u.cmd);
      if (cmdCounts[sig]) cmdCounts[sig].kind = "test";
    }
  }

  const durationMs = firstTs != null && lastTs != null ? lastTs - firstTs : 0;
  const activeMs = durationMs - stalledMs;
  const diagnostics = computeDiagnostics({ uses, results, editCounts, readCounts, cmdCounts, activeMs, stallMs });

  return {
    firstTs,
    lastTs,
    durationMs,
    activeMs,
    stalledMs,
    activeIntervals,
    turns,
    tokens: { out, inp, cacheRead, cacheCreate },
    tools,
    model,
    stalls,
    diagnostics,
  };
}

// Turn the raw tool timeline into the "why slow" story: how much wall-clock went to
// toolchain waits vs model generation, which files thrashed, which commands repeated,
// and whether the edit↔test rhythm was a tight fix-test loop or batched. Pure.
function computeDiagnostics({ uses, results, editCounts, readCounts, cmdCounts, activeMs, stallMs }) {
  // Pair each tool_use with its result to get execution wall-time.
  let toolMs = 0;
  let toolchainMs = 0;
  let toolchainRuns = 0;
  let toolchainMax = 0;
  const timed = [];
  for (const u of uses) {
    const r = results.get(u.id);
    const ms = r && r.ts >= u.ts ? Math.min(r.ts - u.ts, stallMs) : 0; // clamp: a stall between use+result isn't tool time
    toolMs += ms;
    if (u.kind === "test") {
      toolchainRuns += 1;
      toolchainMs += ms;
      if (ms > toolchainMax) toolchainMax = ms;
    }
    timed.push({ name: u.name, kind: u.kind, ms, label: u.kind === "test" || u.kind === "bash" ? cmdSignature(u.cmd) : lastSegments(u.file) });
  }
  const modelMs = Math.max(0, activeMs - toolMs);

  const hotEdited = Object.entries(editCounts).map(([file, count]) => ({ file: lastSegments(file), count })).sort((a, b) => b.count - a.count);
  const hotRead = Object.entries(readCounts).map(([file, count]) => ({ file: lastSegments(file), count })).sort((a, b) => b.count - a.count);
  const repeated = Object.entries(cmdCounts)
    .filter(([, v]) => v.count >= 2)
    .map(([cmd, v]) => ({ cmd, count: v.count, kind: v.kind }))
    .sort((a, b) => b.count - a.count);

  // Edit↔test interleaving — the TDD-vs-write-first signal. editsPerTest ~1 with many
  // test runs = "re-verify after nearly every change" (the grind); few test runs =
  // write-first; many edits per test = batched.
  const editActions = Object.values(editCounts).reduce((a, c) => a + c, 0);
  const editsPerTest = toolchainRuns ? +(editActions / toolchainRuns).toFixed(1) : null;
  let pattern = "n/a";
  if (toolchainRuns >= 5 && editsPerTest != null && editsPerTest <= 2) pattern = "tight fix-test loop (re-verifies after ~every edit)";
  else if (toolchainRuns <= 2) pattern = "write-first (verifies rarely)";
  else if (toolchainRuns > 0) pattern = "batched (several edits per verify)";

  const toolErrors = [...results.values()].filter((r) => r.isError).length;
  const toolchainPct = activeMs > 0 ? Math.round((toolchainMs / activeMs) * 100) : 0;
  const topEdit = hotEdited[0];
  const topCmd = repeated[0];

  // Grind flag: an agent stuck fix-test-rerunning rather than making progress.
  const reasons = [];
  if (toolchainPct >= 30) reasons.push(`${toolchainPct}% of active time waiting on toolchain (${toolchainRuns} runs, worst ${Math.round(toolchainMax / 1000)}s)`);
  if (topEdit && topEdit.count >= 8) reasons.push(`${topEdit.file} edited ${topEdit.count}× (thrash)`);
  if (topCmd && topCmd.count >= 8) reasons.push(`re-ran \`${topCmd.cmd}\` ${topCmd.count}×`);
  if (toolchainRuns >= 15) reasons.push(`${toolchainRuns} toolchain runs`);

  return {
    toolMs,
    modelMs,
    toolchain: { runs: toolchainRuns, totalMs: toolchainMs, avgMs: toolchainRuns ? Math.round(toolchainMs / toolchainRuns) : 0, maxMs: toolchainMax, pctOfActive: toolchainPct },
    interleave: { testRuns: toolchainRuns, editActions, editsPerTest, pattern },
    hotFiles: { edited: hotEdited.slice(0, 6), read: hotRead.slice(0, 6) },
    repeatedCommands: repeated.slice(0, 8),
    slowestTools: timed.filter((t) => t.ms > 0).sort((a, b) => b.ms - a.ms).slice(0, 6).map((t) => ({ name: t.name, seconds: Math.round(t.ms / 1000), label: t.label })),
    errors: { toolErrors },
    grind: { flagged: reasons.length > 0, reasons },
  };
}

// Total length of the union of a set of [start,end] intervals — concurrency-aware
// (overlapping intervals counted once). Used to turn per-agent active/idle sums
// (which overstate reality when agents run in parallel) into real wall-clock.
export function mergeIntervals(intervals) {
  const valid = intervals
    .filter((iv) => iv && iv[0] != null && iv[1] != null && iv[1] >= iv[0])
    .map((iv) => [iv[0], iv[1]])
    .sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of valid) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) {
      if (e > last[1]) last[1] = e;
    } else {
      out.push([s, e]);
    }
  }
  return out;
}

export function unionMs(intervals) {
  return mergeIntervals(intervals).reduce((a, [s, e]) => a + (e - s), 0);
}

// How much of [start,end] is covered by an ALREADY-MERGED interval set. Used to
// discount a quiet main thread by the agent work happening underneath it — an
// orchestrator silent while a developer builds is idle BY DESIGN, not lost time.
export function overlapMs([start, end], merged) {
  let total = 0;
  for (const [s, e] of merged) {
    const lo = Math.max(start, s);
    const hi = Math.min(end, e);
    if (hi > lo) total += hi - lo;
  }
  return total;
}

// ---- lost time: infra kills + human waits ----------------------------------
//
// WHY: `collectMilestoneAgents` only reads `subagents/**`, so it can see an agent
// stall but never WHY the milestone stopped. The two causes that dominate a slow
// run both live in the PARENT session thread, which nothing was reading:
//
//   1. an infra kill (API session/usage limit, overload) that terminates the
//      orchestrator and every agent under it, and
//   2. the wait that follows, because nothing restarts a dead orchestrator — a
//      human has to notice and type a word.
//
// Measured on vista-app 348: 3 kills, and the waits behind them were 13 of the
// milestone's 28 calendar hours. An observe report that cannot name that is
// reporting the symptom (idle agents) and hiding the cause.

export const DEFAULT_HUMAN_WAIT_MS = 10 * 60 * 1000; // main thread quiet this long before a human turn => a wait

// The infra failures that kill a run through no fault of the work. Deliberately
// narrow: these are *terminations*, not any mention of an error.
const INFRA_KILL_RE =
  /(?:hit your (?:session|usage) limit|terminated early due to an API error|\brate.?limit(?:ed|s)?\b|overloaded_error|Claude Code is unable to respond)/i;
// "…session limit · resets 8:10pm (Europe/London)" -> "8:10pm (Europe/London)"
const RESETS_RE = /resets\s+(\d{1,2}:\d{2}\s*[ap]?m?(?:\s*\([^)\n]{1,32}\))?)/i;
// A slash-command invocation is a human turn even though it arrives XML-wrapped.
const COMMAND_NAME_RE = /<command-name>([^<]+)<\/command-name>/;
const COMMAND_ARGS_RE = /<command-args>([^<]*)<\/command-args>/;

// Flatten an event's content to searchable text (assistant prose AND tool_result
// bodies — an agent's death arrives as a tool_result on the parent thread).
function eventText(obj) {
  const c = obj?.message?.content;
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  const parts = [];
  for (const b of c) {
    if (b.type === "text" && b.text) parts.push(b.text);
    else if (b.type === "tool_result") parts.push(typeof b.content === "string" ? b.content : JSON.stringify(b.content ?? ""));
  }
  return parts.join("\n");
}

// The text of a genuine HUMAN turn, or null. Tool results, system reminders and
// task notifications are plumbing wearing a `user` type — only real operator
// input counts, plus slash-command invocations (XML-wrapped, but human-typed).
export function humanTurnText(obj) {
  if (obj?.type !== "user") return null;
  const c = obj.message?.content;
  let text = null;
  if (typeof c === "string") text = c;
  else if (Array.isArray(c)) {
    if (c.some((b) => b.type === "tool_result")) return null;
    text = c.filter((b) => b.type === "text" && b.text).map((b) => b.text).join(" ");
  }
  if (!text) return null;
  const cmd = COMMAND_NAME_RE.exec(text);
  if (cmd) {
    const args = COMMAND_ARGS_RE.exec(text);
    return `${cmd[1].trim()}${args && args[1].trim() ? ` ${args[1].trim()}` : ""}`;
  }
  text = text.trim();
  if (!text || text.startsWith("<")) return null; // system-reminder / task-notification wrapper
  return text;
}

// Parse ONE parent-session transcript for infra kills and human waits, bounded to
// a time window (a session file spans many milestones). Pure over `text`.
export function analyzeSessionThread(text, { windowStart = null, windowEnd = null, humanWaitMs = DEFAULT_HUMAN_WAIT_MS } = {}) {
  const events = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    const o = safeParse(line);
    if (!o || o.isSidechain) continue; // MAIN thread only — subagents are collected separately
    // ONLY assistant turns and user rows count as run activity. The bookkeeping
    // rows Claude Code interleaves (`queue-operation`, `attachment`,
    // `file-history-delta`) carry no work — and `queue-operation` is stamped with
    // the SAME second as the human turn it queues, so counting it as activity
    // collapses every wait to zero. That bug hid all 13h of 348's blocked time.
    if (o.type !== "assistant" && o.type !== "user") continue;
    const ts = o.timestamp ? Date.parse(o.timestamp) : null;
    if (ts == null || Number.isNaN(ts)) continue;
    if (windowStart != null && ts < windowStart) continue;
    if (windowEnd != null && ts > windowEnd) continue;
    events.push({ ts, o });
  }
  events.sort((a, b) => a.ts - b.ts);

  const infraKills = [];
  const quietGaps = [];
  const humanTurns = [];
  let prevTs = null;
  for (const { ts, o } of events) {
    const body = eventText(o);
    if (body) {
      const hit = INFRA_KILL_RE.exec(body);
      if (hit) {
        const resets = RESETS_RE.exec(body);
        infraKills.push({
          at: ts,
          phrase: hit[0],
          resets: resets ? resets[1].replace(/\s+/g, " ").trim() : null,
          killedAgent: /terminated early due to an API error/i.test(body),
        });
      }
    }
    const human = humanTurnText(o);
    const trimmed = human ? human.replace(/\s+/g, " ").slice(0, 140) : null;
    if (trimmed) humanTurns.push({ at: ts, text: trimmed });
    // Every quiet stretch on the main thread is lost time — but HOW it ends says
    // what went wrong. Ending in a human turn means the run was waiting to be
    // restarted by hand; ending in the run itself means nobody was driving and
    // nothing noticed (a silent stall — the case a watchdog would close).
    if (prevTs != null && ts - prevTs >= humanWaitMs) {
      quietGaps.push({
        fromTs: prevTs,
        toTs: ts,
        ms: ts - prevTs,
        endedBy: trimmed ? "human" : "run",
        resumedWith: trimmed || shortLabel(o),
      });
    }
    prevTs = ts;
  }
  return { infraKills, quietGaps, humanTurns };
}

// Collapse the burst of near-simultaneous kill lines one limit produces (the
// orchestrator's own message plus one `terminated early` per dying agent) into a
// single event carrying how many agents it took down.
export function clusterInfraKills(kills, { windowMs = 2 * 60 * 1000 } = {}) {
  const sorted = [...kills].sort((a, b) => a.at - b.at);
  const out = [];
  for (const k of sorted) {
    const last = out[out.length - 1];
    if (last && k.at - last.at <= windowMs) {
      last.agentsKilled += k.killedAgent ? 1 : 0;
      last.resets ||= k.resets;
      last.lastAt = k.at;
      continue;
    }
    out.push({ at: k.at, lastAt: k.at, phrase: k.phrase, resets: k.resets, agentsKilled: k.killedAgent ? 1 : 0 });
  }
  return out;
}

// Read every parent session behind a milestone and derive the lost-time picture:
// what killed the run, how long it then sat waiting for a human, and how much of
// that wait is attributable to a kill rather than to ordinary think-time.
export async function collectSessionSignals({ projectsDir, sessions = [], windowStart = null, windowEnd = null, humanWaitMs = DEFAULT_HUMAN_WAIT_MS, agentActive = [] } = {}) {
  const rawKills = [];
  const quietGaps = [];
  const humanTurns = [];
  for (const sessionId of sessions) {
    let text;
    try {
      text = await fsp.readFile(path.join(projectsDir, `${sessionId}.jsonl`), "utf8");
    } catch {
      continue;
    }
    const r = analyzeSessionThread(text, { windowStart, windowEnd, humanWaitMs });
    rawKills.push(...r.infraKills);
    quietGaps.push(...r.quietGaps.map((g) => ({ ...g, sessionId })));
    humanTurns.push(...r.humanTurns.map((t) => ({ ...t, sessionId })));
  }
  const infraKills = clusterInfraKills(rawKills);
  humanTurns.sort((a, b) => a.at - b.at);

  // Discount every gap by the agent work happening underneath it. A quiet main
  // thread while a developer builds for two hours is idle BY DESIGN — counting it
  // as lost time would drown the real signal. What remains (`unattendedMs`) is
  // wall-clock where NOTHING at all was running.
  const merged = mergeIntervals(agentActive);
  for (const g of quietGaps) {
    g.agentActiveMs = overlapMs([g.fromTs, g.toTs], merged);
    g.unattendedMs = Math.max(0, g.ms - g.agentActiveMs);
    // A gap is attributed to a kill when the kill lands inside it (or just before
    // it opens) — the run stopped because of the kill and stayed stopped.
    const cause = infraKills.find((k) => k.at >= g.fromTs - 5 * 60 * 1000 && k.at <= g.toTs);
    if (cause) {
      g.afterInfraKill = true;
      g.resets = cause.resets || null;
    }
  }
  // Only gaps that were genuinely unattended for the threshold survive.
  const real = quietGaps.filter((g) => g.unattendedMs >= humanWaitMs).sort((a, b) => b.unattendedMs - a.unattendedMs);
  const humanWaits = real.filter((g) => g.endedBy === "human");
  const deadAir = real.filter((g) => g.endedBy === "run");
  const blockedOnHumanMs = humanWaits.reduce((a, g) => a + g.unattendedMs, 0);
  const deadAirMs = deadAir.reduce((a, g) => a + g.unattendedMs, 0);
  const blockedAfterInfraKillMs = real.filter((g) => g.afterInfraKill).reduce((a, g) => a + g.unattendedMs, 0);
  return { infraKills, quietGaps: real, humanWaits, deadAir, humanTurns, blockedOnHumanMs, deadAirMs, blockedAfterInfraKillMs };
}

// ---- concurrency: waves and serial chains ----------------------------------
//
// WHY: `activeUnionMs` already prices parallelism in aggregate, but it cannot say
// WHICH work was needlessly serialized. Stories forced through one at a time (a
// shared working tree, a `depends` edge added for build order) read as a role
// whose agents never overlap — and the wall-clock that ordering cost is
// sum(durations) - longest, recoverable in full if they could have run together.

// Group agents into waves and measure, per role, how much of that role's work was
// needlessly serialized. Pure over the agent records.
//
// Everything here runs on ACTIVE intervals, never lifetimes. A stalled agent's
// lifetime can span half a day, so lifetime-overlap would report a role as
// "concurrent" purely because one of its members sat frozen across the others.
export function analyzeWaves(agents = []) {
  const runs = agents
    .filter((a) => (a.activeIntervals || []).length)
    .map((a) => {
      const merged = mergeIntervals(a.activeIntervals);
      return {
        id: a.id,
        role: a.agentType,
        desc: a.description,
        merged,
        start: merged[0][0],
        end: merged[merged.length - 1][1],
        activeMs: a.activeMs,
      };
    })
    .sort((a, b) => a.start - b.start);

  const waves = mergeIntervals(runs.flatMap((r) => r.merged)).map((iv, i) => ({
    index: i + 1,
    startTs: iv[0],
    endTs: iv[1],
    spanMs: iv[1] - iv[0],
    agentCount: runs.filter((r) => overlapMs(iv, r.merged) > 0).length,
  }));

  const byRole = {};
  for (const r of runs) (byRole[r.role] ||= []).push(r);
  const roles = [];
  for (const [role, list] of Object.entries(byRole)) {
    if (list.length < 2) continue;
    const sumActiveMs = list.reduce((a, r) => a + r.activeMs, 0);
    const unionActiveMs = unionMs(list.flatMap((r) => r.merged));
    const longestActiveMs = Math.max(...list.map((r) => r.activeMs));

    // The longest set of runs that never once overlapped each other — greedy by
    // earliest finish (activity selection), which is optimal for intervals and
    // good enough for the fragmented sets a stall produces.
    const chain = [];
    for (const r of [...list].sort((a, b) => a.end - b.end)) {
      if (chain.every((c) => overlapMs([r.start, r.end], c.merged) === 0)) chain.push(r);
    }
    // Link duration is ACTIVE work, not the span. A link that stalled for twelve
    // hours did not cost twelve hours of serialization — that is the stall's bill,
    // reported separately, and charging it here too would double-count it.
    const chainSumMs = chain.reduce((a, r) => a + r.activeMs, 0);
    const chainLongestMs = chain.length ? Math.max(...chain.map((r) => r.activeMs)) : 0;

    roles.push({
      role,
      count: list.length,
      sumActiveMs,
      unionActiveMs,
      // 1.0 = strictly one-at-a-time; 3.0 = three agents working at once on average.
      concurrency: unionActiveMs ? +(sumActiveMs / unionActiveMs).toFixed(2) : 0,
      serialChain: {
        count: chain.length,
        sumMs: chainSumMs,
        longestMs: chainLongestMs,
        // Wall-clock a parallel run of that chain would have returned.
        costMs: Math.max(0, chainSumMs - chainLongestMs),
        members: chain
          .slice()
          .sort((a, b) => a.start - b.start)
          .map((r) => ({ id: r.id, desc: r.desc, ms: r.activeMs })),
      },
      longestActiveMs,
    });
  }
  roles.sort((a, b) => b.serialChain.costMs - a.serialChain.costMs);

  return {
    waves,
    roles,
    // Roles worth calling out: three or more runs that never overlapped.
    serialChains: roles.filter((r) => r.serialChain.count >= 3).map((r) => ({ role: r.role, ...r.serialChain })),
  };
}

// ---- token split: build vs governance --------------------------------------
//
// WHY: a milestone that spends most of its generation on contract authoring and
// review is making a depth trade the operator never got to price. Splitting the
// output tokens by role turns "it took all day" into "40% of it was governance".

// The roles that WRITE the product. Everything else (contract authoring, review,
// design, research, compliance) is governance around that build.
export const BUILD_ROLES = new Set(["aof-developer"]);

export function tokenSplit(agents = []) {
  let buildOut = 0;
  let governanceOut = 0;
  const byRole = {};
  for (const a of agents) {
    const out = a.tokens?.out || 0;
    const role = a.agentType || "unknown";
    byRole[role] = (byRole[role] || 0) + out;
    if (BUILD_ROLES.has(role)) buildOut += out;
    else governanceOut += out;
  }
  const totalOut = buildOut + governanceOut;
  return {
    buildOut,
    governanceOut,
    totalOut,
    governancePct: totalOut ? Math.round((governanceOut / totalOut) * 100) : 0,
    byRole: Object.entries(byRole)
      .map(([role, out]) => ({ role, out, pct: totalOut ? Math.round((out / totalOut) * 100) : 0 }))
      .sort((a, b) => b.out - a.out),
  };
}

// ---- attribution: a JOIN on sessionId, never a text match ------------------
//
// ADR-005: an agent run belongs to exactly one item because it belongs to exactly
// one session, which belongs to exactly one run — whose record carries that session
// id, persisted by story 68/01. The miner therefore resolves attribution from the
// run record, never from the text of an agent's prompt. The regex path
// (`agentMatchesMilestone`, which once pulled an unrelated milestone-38 agent into
// m45's snapshot on a hex substring) is RETIRED (FF-6805). And because one session
// maps to exactly one run record on exactly one item, no agent run can land in two
// items' attributed sets (FF-6806). Absence is reported, never inferred (ADR-006): a
// session that resolves to no run record is counted unattributed — not assigned, not
// dropped.

// Build the stream-wide sessionId → itemRef index by reading every item's run records
// (milestones and their stories). itemRef is "NN" for a milestone, "NN/SS" for a
// story. A run whose own sessionId is null/absent contributes nothing (its session is
// unknown). ENOENT/torn-file tolerant, the same "absence is benign" discipline as
// readItemRuns.
export async function buildSessionItemIndex({ cwd = process.cwd() } = {}) {
  const index = new Map();
  // Every item the enumerator knows — the live root, the backlog and the archive alike — so
  // a run recorded under an item that has since been archived still resolves its session.
  for (const row of await listItems(workDirOf(cwd))) {
    const ref = observeRefOf(row);
    for (const run of await readItemRuns(row)) {
      if (typeof run?.sessionId === "string" && run.sessionId.length > 0) {
        index.set(run.sessionId, ref);
      }
    }
  }
  return index;
}

// Walk every session in the projects dir and attribute each subagent to the item
// whose run record owns its session (the join). `sessionToItem` is the stream-wide
// index built by buildSessionItemIndex; `targetItemRefs` is the set of item refs this
// observe covers (a milestone plus its stories, or a single story). A subagent whose
// session resolves to an item OUTSIDE the target set is skipped (it belongs to another
// item's report, and one session ⇒ one item keeps it out of this one). A subagent
// whose session resolves to NO item is counted as unattributed. Returns agents
// (sorted by activeMs desc, each carrying `attributedTo`), the sessions involved, and
// the unattributed agent-run count.
export async function collectMilestoneAgents({ projectsDir, sessionToItem, targetItemRefs, stallMs = DEFAULT_STALL_MS } = {}) {
  const agents = [];
  const sessions = new Set();
  // 96/ADR-003 — the unattributed runs' BODY. The count is unchanged in meaning; it is
  // now derived from this list (`unattributed.length`), so the count and the body
  // cannot disagree. A row is pushed for EVERY unattributed agent run, including one
  // whose transcript will not read — dropping such a row once the list exists is the
  // precise failure this shape exists to prevent.
  const unattributed = [];
  let entries;
  try {
    entries = await fsp.readdir(projectsDir, { withFileTypes: true });
  } catch {
    return { agents, sessions: [], projectsDir, found: false, unattributed, unattributedCount: 0 };
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sessionId = entry.name;
    const subDir = path.join(projectsDir, sessionId, "subagents");
    let metas;
    try {
      metas = (await fsp.readdir(subDir)).filter((f) => f.endsWith(".meta.json"));
    } catch {
      continue;
    }
    const itemRef = sessionToItem ? sessionToItem.get(sessionId) : undefined;
    if (itemRef == null) {
      // The session resolves to no run record — every subagent under it is an
      // unattributed agent run. Never dropped, never guessed into an item (ADR-003:
      // the detail grows, the JOIN does not) — and now reported with the two facts a
      // bare count withheld: WHEN it ran and WHAT it cost. `attributedTo: null` is
      // present-and-null rather than absent, so a reader can tell "this run belongs to
      // no item" from "this build does not state attribution".
      for (const mf of metas) {
        const agentId = mf.replace(/\.meta\.json$/, "");
        let meta = null;
        try {
          meta = JSON.parse(await fsp.readFile(path.join(subDir, mf), "utf8"));
        } catch {
          meta = null;
        }
        let stats = null;
        try {
          stats = analyzeTranscript(await fsp.readFile(path.join(subDir, `${agentId}.jsonl`), "utf8"), { stallMs });
        } catch {
          stats = null;
        }
        unattributed.push({
          id: agentId.replace(/^agent-/, "").slice(0, 8),
          agentType: meta?.agentType || "unknown",
          description: meta?.description || "",
          sessionId,
          attributedTo: null,
          firstTs: stats?.firstTs ?? null,
          lastTs: stats?.lastTs ?? null,
          activeMs: stats?.activeMs ?? null,
          outputTokens: stats?.tokens?.out ?? null,
        });
      }
      continue;
    }
    if (targetItemRefs && !targetItemRefs.has(itemRef)) continue; // another item's report
    for (const mf of metas) {
      let meta;
      try {
        meta = JSON.parse(await fsp.readFile(path.join(subDir, mf), "utf8"));
      } catch {
        continue;
      }
      const agentId = mf.replace(/\.meta\.json$/, "");
      const jsonl = path.join(subDir, `${agentId}.jsonl`);
      let text;
      try {
        text = await fsp.readFile(jsonl, "utf8");
      } catch {
        continue;
      }
      const stats = analyzeTranscript(text, { stallMs });
      agents.push({
        id: agentId.replace(/^agent-/, "").slice(0, 8),
        agentType: meta.agentType || "unknown",
        description: meta.description || "",
        sessionId,
        attributedTo: itemRef,
        ...stats,
      });
      sessions.add(sessionId);
    }
  }
  agents.sort((a, b) => b.activeMs - a.activeMs);
  // Same ordering rule as the attributed list — costliest first — with an unreadable
  // transcript's null spend sorting last rather than throwing the comparator.
  unattributed.sort((a, b) => (b.activeMs ?? -1) - (a.activeMs ?? -1));
  return { agents, sessions: [...sessions], projectsDir, found: true, unattributed, unattributedCount: unattributed.length };
}

// ---- rendering -------------------------------------------------------------

export function fmtDur(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h${String(m).padStart(2, "0")}m`;
  if (m) return `${m}m${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}
function fmtK(n) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
function fmtClock(ms) {
  if (ms == null) return "—";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16) + "Z";
}
function shortModel(m) {
  if (!m) return "—";
  const match = /(opus|sonnet|haiku|fable)/i.exec(m);
  return match ? match[1].toLowerCase() : m.replace(/^claude-/, "").slice(0, 8);
}

export function renderReportMarkdown({ id, folder, story = null, kind = "milestone", agents, sessions, generatedAt, stallMs, lostTime = null, concurrency = null, split = null, phaseRollup = null, unattributedAgentRuns = 0, unattributedAgents = [] }) {
  const totalOut = agents.reduce((a, x) => a + x.tokens.out, 0);
  const sumActive = agents.reduce((a, x) => a + x.activeMs, 0);
  const stalled = agents.filter((a) => a.stalls.length);
  const gen = generatedAt ? fmtClock(generatedAt) : "(unstamped)";
  // Concurrency-aware wall-clock: the calendar span the milestone occupied, the
  // union of all agents' ACTIVE intervals (parallel work counted once), and the
  // real idle inside that span (span minus active union). These correct the naive
  // per-agent sums, which overstate reality whenever agents overlap.
  const firsts = agents.map((a) => a.firstTs).filter((t) => t != null);
  const lasts = agents.map((a) => a.lastTs).filter((t) => t != null);
  const spanMs = firsts.length ? Math.max(...lasts) - Math.min(...firsts) : 0;
  const activeUnion = unionMs(agents.flatMap((a) => a.activeIntervals || []));
  const realIdle = Math.max(0, spanMs - activeUnion);
  const L = [];
  L.push(`# Observability — ${kind === "story" ? `story ${story} of milestone ${id}` : `milestone ${id}`}`);
  L.push("");
  L.push(`_Generated ${gen} · stall threshold ${fmtDur(stallMs)} · ${agents.length} agent run(s) across ${sessions.length} session(s)._`);
  L.push("");
  L.push("This folder is auto-derived from Claude Code session transcripts. It is a");
  L.push("diagnostic, not a work record — safe to delete or `.gitignore`.");
  L.push("");
  L.push("## Summary");
  L.push("");
  L.push(`- **Calendar span** (first agent start → last agent end): **${fmtDur(spanMs)}**`);
  L.push(`- **Real active time** (concurrency-aware, excl. stalls): **${fmtDur(activeUnion)}**`);
  L.push(`- **Real idle time** inside the span: **${fmtDur(realIdle)}** ${realIdle >= stallMs ? "⚠️" : ""}`);
  L.push(`- **Sum of per-agent active time** (if run serially): ${fmtDur(sumActive)}`);
  L.push(`- **Total output tokens** (generation): **${fmtK(totalOut)}**`);
  // Attribution was resolved from the run record, never from prompt text (ADR-005).
  // A count is stated for sessions that matched no run record — reported, not dropped
  // and not guessed into an item (ADR-006). A 0 here is a true zero.
  L.push(`- **Unattributed agent runs** (session matched no run record): **${unattributedAgentRuns}**`);
  // The per-phase breakdown over the item's run records (68/04, ADR-002).
  if (phaseRollup) {
    const t = phaseRollup.total;
    L.push("");
    L.push(`- **Run records:** **${t.runCount}** across **${phaseRollup.phases.length}** declared phase(s)`);
    L.push(`- **Run active time** (created→updated, summed): **${fmtDur(t.activeMs)}**`);
    L.push(`- **Run tokens** (spend): **${fmtK(t.tokens)}** · **cost:** ${t.costUsd != null ? `$${t.costUsd.toFixed(4)}` : "—"} · **unmeasured spend:** ${t.unmeasuredSpend}`);
  }
  if (lostTime?.blockedOnHumanMs) {
    const pct = spanMs ? Math.round((lostTime.blockedOnHumanMs / spanMs) * 100) : 0;
    L.push(`- **Blocked waiting for a human**: **${fmtDur(lostTime.blockedOnHumanMs)}** (${pct}% of the span)`);
  }
  if (lostTime?.deadAirMs) {
    const pct = spanMs ? Math.round((lostTime.deadAirMs / spanMs) * 100) : 0;
    L.push(`- **Dead air** (main thread quiet, nothing driving, no human asked): **${fmtDur(lostTime.deadAirMs)}** (${pct}% of the span)`);
  }
  if (lostTime?.infraKills?.length) {
    L.push(`- **Infra kills** (API session/usage limit, overload): **${lostTime.infraKills.length}**, costing **${fmtDur(lostTime.blockedAfterInfraKillMs)}** of the wait above`);
  }
  if (stalled.length) {
    L.push("");
    L.push(`> ⚠️ **${stalled.length} agent(s) stalled.** The wall-clock below is dominated by idle gaps, not compute — see "Stalls".`);
  }
  if (lostTime?.blockedAfterInfraKillMs && spanMs && lostTime.blockedAfterInfraKillMs / spanMs >= 0.2) {
    L.push("");
    L.push(
      `> ⛔ **${Math.round((lostTime.blockedAfterInfraKillMs / spanMs) * 100)}% of this milestone's calendar time was a dead run waiting to be restarted by hand.** ` +
        "That is mechanism, not work — see \"Lost time\".",
    );
  }
  L.push("");
  const grinders = agents.filter((a) => a.diagnostics?.grind?.flagged);
  if (grinders.length) {
    L.push("");
    L.push(`> ⚙️ **${grinders.length} agent(s) grinding** — active time dominated by a fix-test-rerun loop, not the stall/idle. See "Why slow".`);
  }
  L.push("");

  // Lost time first — an idle agent is a symptom; the kill and the wait behind it
  // are the cause, and they are usually the largest single line in the report.
  if (lostTime && (lostTime.infraKills.length || lostTime.quietGaps.length)) {
    L.push("## Lost time — why the run stopped");
    L.push("");
    if (lostTime.infraKills.length) {
      L.push("**Infra kills.** The run was terminated by the platform, not by the work. Nothing restarts a");
      L.push("dead orchestrator, so each of these costs whatever it took a human to notice.");
      L.push("");
      L.push("| at | agents killed | resets | gap that followed |");
      L.push("|----|---------------|--------|-------------------|");
      for (const k of lostTime.infraKills) {
        const gap = lostTime.quietGaps.find((g) => g.afterInfraKill && k.at >= g.fromTs - 5 * 60 * 1000 && k.at <= g.toTs);
        L.push(`| ${fmtClock(k.at)} | ${k.agentsKilled || "—"} | ${k.resets || "—"} | ${gap ? `**${fmtDur(gap.unattendedMs)}** (${gap.endedBy === "human" ? "restarted by hand" : "run resumed itself"})` : "resumed promptly"} |`);
      }
      L.push("");
    }
    if (lostTime.humanWaits.length) {
      L.push("**Waits for a human.** The run stopped and stayed stopped until the operator typed. Nothing");
      L.push("here is work — it is the cost of having no way back in without a person.");
      L.push("");
      L.push("| from | nothing running for | after an infra kill? | restarted with |");
      L.push("|------|---------------------|----------------------|----------------|");
      for (const w of lostTime.humanWaits.slice(0, 10)) {
        L.push(`| ${fmtClock(w.fromTs)} | **${fmtDur(w.unattendedMs)}** | ${w.afterInfraKill ? `yes — resets ${w.resets || "?"}` : "no"} | ${w.resumedWith} |`);
      }
      L.push("");
    }
    if (lostTime.deadAir.length) {
      L.push("**Dead air.** The main thread went quiet with no human asked and nothing driving, then the run");
      L.push("woke on its own. Each of these is a window a stall watchdog would have closed.");
      L.push("");
      L.push("| from | nothing running for | woke on |");
      L.push("|------|---------------------|---------|");
      for (const g of lostTime.deadAir.slice(0, 10)) {
        L.push(`| ${fmtClock(g.fromTs)} | **${fmtDur(g.unattendedMs)}** | ${g.resumedWith.replace(/\s+/g, " ").slice(0, 70)} |`);
      }
      L.push("");
    }
  }

  // The unattributed runs' BODY (96/ADR-003). Every row the count counts is listed —
  // never a truncated head, because a list that disagreed with the count beside it is
  // worse than the bare count it replaced. Nothing here widens the JOIN: each row is
  // reported AS unattributed, and the only thing that could attribute it is a run
  // record carrying its session id.
  if (unattributedAgents.length) {
    L.push("## Unattributed agent runs");
    L.push("");
    L.push("Each of these sessions matched no run record, so no item owns its spend. They are");
    L.push("listed rather than merely counted — attribution is still the `sessionId` join and");
    L.push("nothing else, so a run that cannot be placed says what it cost instead of being guessed.");
    L.push("");
    L.push("| agent | role | session | from | to | active | out |");
    L.push("|-------|------|---------|------|----|--------|-----|");
    for (const a of unattributedAgents) {
      L.push(
        `| ${a.id} | ${a.agentType} | ${String(a.sessionId).slice(0, 8)} | ${a.firstTs ? fmtClock(a.firstTs) : "—"} | ${a.lastTs ? fmtClock(a.lastTs) : "—"} | ${fmtDur(a.activeMs)} | ${a.outputTokens == null ? "—" : fmtK(a.outputTokens)} |`,
      );
    }
    L.push("");
  }

  // Concurrency second — what was serialized, and what that ordering cost.
  if (concurrency && (concurrency.serialChains.length || concurrency.waves.length > 1)) {
    L.push("## Concurrency — waves and serial chains");
    L.push("");
    L.push(`- **${concurrency.waves.length} wave(s)** of agent activity across the span.`);
    if (sumActive && activeUnion) {
      L.push(`- **Parallelism factor:** ${(sumActive / activeUnion).toFixed(2)}× (sum of active ÷ wall-clock active). 1.00× means strictly one-at-a-time.`);
    }
    L.push("");
    if (concurrency.roles.length) {
      L.push("**Per role.** `concurrency` is how many of that role's agents worked at once on average.");
      L.push("");
      L.push("| role | runs | active (sum) | active (wall-clock) | concurrency |");
      L.push("|------|------|--------------|---------------------|-------------|");
      for (const r of concurrency.roles) {
        L.push(`| ${r.role} | ${r.count} | ${fmtDur(r.sumActiveMs)} | ${fmtDur(r.unionActiveMs)} | ${r.concurrency.toFixed(2)}× |`);
      }
      L.push("");
    }
    if (concurrency.serialChains.length) {
      L.push("**Serial chains** — runs of one role that never once overlapped, so they went one at a time.");
      L.push("`cost` is the wall-clock a parallel run would have returned (chain total minus its longest link).");
      L.push("");
      L.push("| role | links | chain total | longest link | **cost of serializing** |");
      L.push("|------|-------|-------------|--------------|-------------------------|");
      for (const c of concurrency.serialChains) {
        L.push(`| ${c.role} | ${c.count} | ${fmtDur(c.sumMs)} | ${fmtDur(c.longestMs)} | **${fmtDur(c.costMs)}** |`);
      }
      L.push("");
      for (const c of concurrency.serialChains) {
        L.push(`- **${c.role}:** ${c.members.map((m) => `${m.desc || m.id} (${fmtDur(m.ms)})`).join(" → ")}`);
      }
      L.push("");
    }
  }

  // Per phase — where the item's active time, tokens and cost actually went (68/04),
  // plus the cache ratio `cacheRead ÷ cacheCreate` (70/02, ADR-008). Phase is read
  // from the loop's own declaration (ADR-002); runs with none are reported under an
  // explicit "no declared phase" grouping, never folded into a phase.
  if (phaseRollup && (phaseRollup.phases.length || phaseRollup.noPhase.runCount)) {
    L.push("## Per phase");
    L.push("");
    L.push("Each row draws its figures ONLY from the runs that declared that phase (`brief.loop.phase`).");
    L.push("Phase is read, never minted — a run not minted by the loop shell reports as having no declared phase.");
    if (phaseRollup.cacheTargetStatus === "valid") {
      L.push(`The cache-ratio target is **${phaseRollup.cacheTarget}** — a phase is \`met\` when its ratio is at or above it (at the target is met).`);
    } else if (phaseRollup.cacheTargetStatus === "invalid") {
      L.push("A cache-ratio target is configured but invalid (expected a finite, non-negative number), so no met/missed verdict is stated — the ratio is still reported.");
    } else {
      L.push("No cache-ratio target is configured, so no met/missed verdict is stated — only the ratio.");
    }
    L.push("");
    L.push("`cache ratio` = `cacheRead ÷ cacheCreate`, derived from the recorded spend buckets. A phase that read cache but created none is `unbounded` (warm) rather than divided by zero; a phase with no measured cache signal is `unmeasured` and is excluded from the ratio, never counted as a cache miss.");
    L.push("");
    L.push("| phase | runs | active time | tokens | cost | unmeasured spend | cache read | cache create | cache ratio | verdict |");
    L.push("|-------|------|-------------|--------|------|------------------|------------|--------------|-------------|---------|");
    const fmtCost = (p) => (p.costUsd != null ? `$${p.costUsd.toFixed(4)}` : "—");
    const fmtRatio = (p) => (p.cacheState === "unbounded" ? "∞ (warm, unbounded)" : p.cacheState === "unmeasured" ? "unmeasured" : p.cacheRatio.toFixed(3));
    const fmtVerdict = (p) => (p.cacheVerdict == null ? "—" : p.cacheVerdict === "met" ? "met" : "**missed**");
    for (const p of phaseRollup.phases) {
      L.push(`| ${p.phase} | ${p.runCount} | ${fmtDur(p.activeMs)} | ${fmtK(p.tokens)} | ${fmtCost(p)} | ${p.unmeasuredSpend} | ${fmtK(p.cacheRead)} | ${fmtK(p.cacheCreate)} | ${fmtRatio(p)} | ${fmtVerdict(p)} |`);
    }
    if (phaseRollup.noPhase.runCount) {
      L.push(`| **no declared phase** | **${phaseRollup.noPhase.runCount}** | ${fmtDur(phaseRollup.noPhase.activeMs)} | ${fmtK(phaseRollup.noPhase.tokens)} | ${fmtCost(phaseRollup.noPhase)} | ${phaseRollup.noPhase.unmeasuredSpend} | ${fmtK(phaseRollup.noPhase.cacheRead)} | ${fmtK(phaseRollup.noPhase.cacheCreate)} | ${fmtRatio(phaseRollup.noPhase)} | ${fmtVerdict(phaseRollup.noPhase)} |`);
    }
    L.push("");
  }

  L.push("## Agents (ranked by active work time)");
  L.push("");
  L.push("| active | wall-clock | tool-wait | out tok | turns | model | agent | task |");
  L.push("|--------|-----------|-----------|---------|-------|-------|-------|------|");
  for (const a of agents) {
    const d = a.diagnostics || {};
    const flag = `${a.stalls.length ? " ⚠️" : ""}${d.grind?.flagged ? " ⚙️" : ""}`;
    const tc = d.toolchain || { pctOfActive: 0, runs: 0 };
    const toolWait = tc.runs ? `${tc.pctOfActive}% ${tc.runs}r` : "—";
    L.push(
      `| ${fmtDur(a.activeMs)} | ${fmtDur(a.durationMs)}${flag} | ${toolWait} | ${fmtK(a.tokens.out)} | ${a.turns} | ${shortModel(a.model)} | ${a.agentType} | ${a.description || "—"} |`,
    );
  }
  L.push("");
  // Why-slow diagnostics for agents that did real compute (skip trivial / stalled-only).
  const notable = agents.filter((a) => (a.diagnostics?.toolchain?.runs || 0) >= 3 || a.diagnostics?.grind?.flagged || a.turns >= 40);
  if (notable.length) {
    L.push("## Why slow — per-agent diagnostics");
    L.push("");
    L.push("Where each agent's active time went (model generation vs waiting on the toolchain), and the loop signals behind it.");
    L.push("");
    for (const a of notable) {
      const d = a.diagnostics;
      L.push(`### ${a.agentType} — ${a.description || a.id} ${d.grind?.flagged ? "⚙️" : ""}`);
      L.push(`- **Time split:** model generation ${fmtDur(d.modelMs)} · toolchain wait ${fmtDur(d.toolchain.totalMs)} (${d.toolchain.pctOfActive}% of active)`);
      if (d.toolchain.runs) {
        L.push(`- **Toolchain:** ${d.toolchain.runs} runs · avg ${Math.round(d.toolchain.avgMs / 1000)}s · worst ${Math.round(d.toolchain.maxMs / 1000)}s`);
        L.push(`- **Edit↔test rhythm:** ${d.interleave.pattern} — ${d.interleave.testRuns} test runs, ${d.interleave.editActions} edits (${d.interleave.editsPerTest ?? "—"} edits/run)`);
      }
      if (d.hotFiles.edited.length) {
        L.push(`- **Hot files (edited):** ${d.hotFiles.edited.slice(0, 4).map((f) => `${f.file} ×${f.count}`).join(", ")}`);
      }
      if (d.repeatedCommands.length) {
        L.push(`- **Repeated commands:** ${d.repeatedCommands.slice(0, 3).map((c) => `\`${c.cmd}\` ×${c.count}`).join(" · ")}`);
      }
      if (d.errors.toolErrors) L.push(`- **Error-ish tool results:** ${d.errors.toolErrors}`);
      if (d.grind?.flagged) L.push(`- **⚙️ Grind:** ${d.grind.reasons.join("; ")}`);
      L.push("");
    }
  }
  if (stalled.length) {
    L.push("## Stalls (idle gaps — likely dropped connection / interrupt / machine off)");
    L.push("");
    for (const a of stalled) {
      const top = a.stalls[0];
      L.push(`- **${a.agentType}** (${a.description || a.id}) — idle **${fmtDur(top.gapMs)}** at ${fmtClock(top.at)}`);
      L.push(`  - froze after: \`${top.before}\``);
      L.push(`  - resumed at: \`${top.after}\``);
    }
    L.push("");
  }
  // Build vs governance — the depth trade, priced. A milestone spending most of its
  // generation on contract authoring and review made a choice the operator never saw.
  if (split && split.totalOut) {
    L.push("## Where the generation went — build vs governance");
    L.push("");
    L.push(`- **Build** (${[...BUILD_ROLES].join(", ")}): **${fmtK(split.buildOut)}** (${100 - split.governancePct}%)`);
    L.push(`- **Governance** (contract authoring, review, design, research): **${fmtK(split.governanceOut)}** (**${split.governancePct}%**)`);
    L.push("");
    L.push("| role | out tok | share |");
    L.push("|------|---------|-------|");
    for (const r of split.byRole) L.push(`| ${r.role} | ${fmtK(r.out)} | ${r.pct}% |`);
    L.push("");
    if (split.governancePct >= 40) {
      L.push(`> ⚖️ **Governance took ${split.governancePct}% of the generation.** Worth checking that depth was priced with the operator before the run, not discovered after it.`);
      L.push("");
    }
  }
  L.push("## Token detail");
  L.push("");
  L.push("| agent | out | input | cache-create | cache-read | model |");
  L.push("|-------|-----|-------|--------------|------------|-------|");
  for (const a of agents) {
    L.push(
      `| ${a.agentType} | ${fmtK(a.tokens.out)} | ${fmtK(a.tokens.inp)} | ${fmtK(a.tokens.cacheCreate)} | ${fmtK(a.tokens.cacheRead)} | ${a.model || "—"} |`,
    );
  }
  L.push("");
  L.push(`_Sessions: ${sessions.join(", ") || "none"}_`);
  L.push("");
  return L.join("\n");
}

// Resolve an item folder under wiki/work by ref. Understands the ref forms the rest
// of the work stream already resolves (NN, NN/SS, exact folder names, slug forms) —
// and reads ONE LEVEL DEEPER than the top level, so a story ref NN/SS resolves to the
// story's OWN folder (<milestone>/stories/<SS>_story_<slug>), never to its parent
// milestone (68/04).
//
// The substring branch is GONE for numeric refs. A bare numeric ref resolves by
// milestone id ONLY — it never falls through to a substring match, so a bare story-like
// ref such as "00" is REFUSED (returns null → milestone-not-found) rather than silently
// resolving to the wrong item (the :1003 defect). Story folders are matched by id or by
// EXACT folder name, never by substring, so a ref can never resolve to a story of a
// different milestone by substring.
//
// Returns { folder, id, story, kind }:
//   milestone → { folder: "NN_slug", id: "NN", story: null, kind: "milestone" }
//   story     → { folder: "NN_slug/stories/SS_story_slug", id: "NN", story: "SS", kind: "story" }
//   nothing   → null (the caller throws milestone-not-found naming the ref).
export async function resolveMilestoneFolder({ cwd = process.cwd(), ref } = {}) {
  const workDir = workDirOf(cwd);
  // milestone 127 / ADR-001 §5 — the rows, not a listing of our own. A top-level row is the
  // "milestone" kind this function has always answered with (it never asked the type — a
  // chore at the root resolved as `kind: "milestone"` before and still does); a nested row is
  // the "story" kind. An archived item resolves under `archive/…`, and a backlog leaf by its
  // exact folder name or slug — nothing here spells a root or a grammar.
  const rows = await listItems(workDir);
  const top = rows.filter((row) => row.parent == null);
  const asMilestone = (row) => ({ folder: relativeFolderOf(workDir, row), id: observeIdOf(row), story: null, kind: "milestone" });
  const asStory = (row) => ({ folder: relativeFolderOf(workDir, row), id: dropLeadingZeros(row.parent), story: observeIdOf(row), kind: "story" });
  // A story's OWNER is the milestone whose folder contains it (never the parent number
  // alone — a duplicated driver number must not cross-attribute one milestone's stories).
  const storiesOf = (milestone) => rows.filter((row) => row.parent != null && row.dir.startsWith(milestone.dir + path.sep));

  const refStr = String(ref);

  // 1. An exact top-level folder name → that item.
  const byName = top.find((row) => row.name === refStr);
  if (byName) return asMilestone(byName);

  // 2. A story ref NN/SS → the story's own folder.
  const slash = refStr.indexOf("/");
  if (slash !== -1) {
    // The leading-zero strip is the module's own, kept verbatim: an all-zero ref strips to `""`
    // and matches no id, which is what makes a bare `00` ambiguous and refused (the scope
    // suite pins it) rather than the milestone at slot zero.
    const msNum = String(refStr.slice(0, slash)).replace(/^0+/, "");
    const ss = refStr.slice(slash + 1);
    const ms = top.find((row) => row.number != null && observeIdOf(row) === msNum);
    if (!ms) return null;
    const story = storiesOf(ms).find((row) => observeIdOf(row) === String(Number(ss)));
    return story ? asStory(story) : null;
  }

  // 3. A bare milestone number (leading zeros tolerated) → that milestone BY ID ONLY.
  //    Never falls through to substring (the :1003 fix), so a bare story-like ref such
  //    as "00" is refused rather than silently resolved to the wrong item.
  if (/^\d+$/.test(refStr)) {
    const num = refStr.replace(/^0+/, ""); // the same strip as above — `00` refuses
    const byId = top.find((row) => row.number != null && observeIdOf(row) === num);
    return byId ? asMilestone(byId) : null;
  }

  // 4. An exact STORY folder name → that story (EXACT only, never by substring).
  const storyByName = rows.find((row) => row.parent != null && row.name === refStr);
  if (storyByName) return asStory(storyByName);

  // 5. A slug/substring over TOP-LEVEL folder names only (a bare milestone ref keeps
  //    working as today) — never descends into stories.
  const bySub = top.find((row) => row.name.includes(refStr));
  return bySub ? asMilestone(bySub) : null;
}


// ---- per-phase rollup (68/04) + cache economics (70/02) --------------------
//
// Phase is READ from the run record's `brief.loop.phase` (ADR-002) — never minted
// here, never derived from prompt text, agent type or timing. A run not minted by the
// loop shell has no phase and is reported under an explicit "no declared phase"
// grouping (ADR-006's posture on absence: reported, not guessed into a phase). Each
// bucket's measures come from what the run record actually carries: its runCount, its
// created→updated span as its active time, and its spend tokens/cost when measured.
// Spend that was never measured is counted (unmeasuredSpend) and is DISTINCT from a
// genuinely free run (costUsd 0) — it is never folded in as zero.
//
// CACHE ECONOMICS (70/02, ADR-008 — records, does not enforce): each bucket also
// reports the cache ratio `cacheRead ÷ cacheCreate`, DERIVED from the recorded
// spend.tokens buckets, never re-counted from a transcript. Absence stays honest:
//   - a run with no spend is unmeasured and is EXCLUDED from the ratio — it is never
//     counted as a cache miss (that would make an un-instrumented run look like a
//     cache failure and corrupt the very before/after this milestone is judged by);
//   - a phase with cache reads but no creations is a WARM phase, flagged `unbounded`
//     rather than divided by zero (reads ÷ 0 is not a real number, and its absence of
//     creation is the point, not an error);
//   - a phase with creations but no reads reports a ratio of ZERO (measured, and
//     distinguishable from an unmeasured phase);
//   - a phase whose runs carry spend but populate neither cache bucket is unmeasured
//     for cache purposes (there is no cache signal to divide).

const EMPTY_PHASE_BUCKET = () => ({
  runCount: 0,
  activeMs: 0,
  tokens: 0,
  costUsd: 0,
  unmeasuredSpend: 0,
  measuredRuns: 0,
  cacheRead: 0,
  cacheCreate: 0,
  cacheRatio: null,
  cacheState: "unmeasured",
});

function runDurationMs(run) {
  if (!run?.createdAt || !run?.updatedAt) return 0;
  const d = Date.parse(run.updatedAt) - Date.parse(run.createdAt);
  return Number.isNaN(d) || d < 0 ? 0 : d;
}

function runTokenTotal(run) {
  const t = run?.spend?.tokens;
  if (!t) return null; // spend (or its tokens) not measured
  return (t.input || 0) + (t.output || 0) + (t.cacheRead || 0) + (t.cacheCreate || 0);
}

function addRunToBucket(bucket, run) {
  bucket.runCount += 1;
  bucket.activeMs += runDurationMs(run);
  const tokens = runTokenTotal(run);
  const measured = run?.spend != null;
  if (measured) {
    bucket.measuredRuns += 1;
    bucket.tokens += tokens;
    bucket.cacheRead += run.spend.tokens?.cacheRead || 0;
    bucket.cacheCreate += run.spend.tokens?.cacheCreate || 0;
    if (run?.spend?.costUsd != null) bucket.costUsd += run.spend.costUsd;
  } else {
    bucket.unmeasuredSpend += 1;
  }
}

// Finalise a bucket's cache signal once all its runs are tallied. `cacheState` is one
// of "measured" | "unbounded" | "unmeasured"; `cacheRatio` is a number, Infinity
// (warm, reads-only) or null (unmeasured). Pure.
function finaliseCacheBucket(bucket) {
  if (bucket.measuredRuns === 0) {
    // no run carried a spend envelope at all → nothing measured
    bucket.cacheState = "unmeasured";
    bucket.cacheRatio = null;
    return bucket;
  }
  if (bucket.cacheCreate === 0 && bucket.cacheRead === 0) {
    // runs measured, but neither cache bucket populated → no cache signal to divide
    bucket.cacheState = "unmeasured";
    bucket.cacheRatio = null;
    return bucket;
  }
  if (bucket.cacheCreate === 0) {
    // warm phase: read cache but created none → unbounded, not a divide-by-zero error
    bucket.cacheState = "unbounded";
    bucket.cacheRatio = Infinity;
    return bucket;
  }
  bucket.cacheState = "measured";
  bucket.cacheRatio = bucket.cacheRead / bucket.cacheCreate;
  return bucket;
}

// Pure over an array of run records. Returns { total, phases, noPhase }, each bucket
// carrying the cache fields above.
export function rollupRunsByPhase(runs = []) {
  const total = EMPTY_PHASE_BUCKET();
  const noPhase = EMPTY_PHASE_BUCKET();
  const map = new Map();
  for (const run of runs) {
    const phase = run?.brief?.loop?.phase ?? null;
    if (phase == null) {
      addRunToBucket(noPhase, run);
    } else {
      if (!map.has(phase)) map.set(phase, EMPTY_PHASE_BUCKET());
      addRunToBucket(map.get(phase), run);
    }
    addRunToBucket(total, run);
  }
  finaliseCacheBucket(total);
  finaliseCacheBucket(noPhase);
  const phases = [...map.entries()]
    .map(([phase, b]) => ({ phase, ...finaliseCacheBucket(b) }))
    .sort((a, b) => (a.phase < b.phase ? -1 : a.phase > b.phase ? 1 : 0));
  return { total, phases, noPhase: { ...noPhase, phase: null } };
}

// ---- cache target → verdict (70/02, ADR-008: reports, never enforces) --------
//
// A stated target turns the ratio into a met-or-missed verdict per phase. The verdict
// REPORTS; it never fails, retries, caps or kills a run (milestone 69 owns bounds,
// milestone 71 owns round discipline). An absent target stays first-class; a configured
// but unhonourable target is named as invalid. In both cases the ratio is still reported
// and no verdict is stated.

// A target that can be honoured: a finite, non-negative number. `not a number`,
// `negative` and `absent entirely` are all unhonourable and produce no verdict.
export function cacheTargetIsHonourable(target) {
  return typeof target === "number" && Number.isFinite(target) && target >= 0;
}

// The met/missed verdict for ONE bucket against a stated target, or null when no
// verdict applies (no honourable target, or an unmeasured bucket — never judged missed).
// "At the target is met" — the same strictly-worse convention the doc budgets use.
export function verdictForCacheBucket(bucket, target) {
  if (!cacheTargetIsHonourable(target)) return null;
  if (bucket.cacheState === "unmeasured") return null;
  return bucket.cacheRatio >= target ? "met" : "missed";
}

// Return a NEW rollup carrying `cacheTarget` (the honourable target, or null), the
// report-only target status, and a `cacheVerdict` on every bucket. `configured` is
// supplied by the config boundary so an absent key remains distinguishable from a
// present-but-invalid value. Direct pure callers keep the historical null/undefined
// convention for absence. The input rollup is never mutated. Pure.
export function applyCacheTarget(rollup, target, { configured = target != null } = {}) {
  const honourable = cacheTargetIsHonourable(target);
  const cacheTargetStatus = !configured ? "absent" : honourable ? "valid" : "invalid";
  const copy = {
    total: { ...rollup.total },
    phases: rollup.phases.map((p) => ({ ...p })),
    noPhase: { ...rollup.noPhase },
    cacheTarget: honourable ? target : null,
    cacheTargetStatus,
  };
  copy.total.cacheVerdict = verdictForCacheBucket(copy.total, target);
  copy.noPhase.cacheVerdict = verdictForCacheBucket(copy.noPhase, target);
  for (const p of copy.phases) p.cacheVerdict = verdictForCacheBucket(p, target);
  return copy;
}

// Read the run records under an item's runs/ folder (the union of flat entries + one
// level of node subdirs, mirroring run-store's reader) — ENOENT-tolerant and
// torn-file tolerant, the same "absence is benign" discipline the store uses.
async function readItemRuns(item) {
  const runsDir = path.join(item.dir, "runs");
  let entries;
  try {
    entries = await fsp.readdir(runsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const records = [];
  const readInto = async (p) => {
    try {
      records.push(JSON.parse(await fsp.readFile(p, "utf8")));
    } catch (error) {
      // The directory listing said this run record EXISTS, so absence is not the
      // benign case the old comment claimed — a record that is listed and will not
      // parse is one run silently missing from every observability answer computed
      // over this item. ENOENT alone stays benign: the file went between the readdir
      // and the read, which is the mid-write window, not a torn record.
      if (error?.code !== "ENOENT") reportDegrade("work-observe-run-record", error, { path: p });
    }
  };
  for (const entry of entries) {
    if (entry.isDirectory()) {
      let nested;
      try {
        nested = await fsp.readdir(path.join(runsDir, entry.name));
      } catch {
        continue;
      }
      for (const name of nested) {
        if (name.endsWith(".json")) await readInto(path.join(runsDir, entry.name, name));
      }
    } else if (entry.name.endsWith(".json")) {
      await readInto(path.join(runsDir, entry.name));
    }
  }
  return records;
}

// Count run records that resolve to NO item — run .json files sitting under a
// `runs/` dir whose parent is not a resolvable milestone or story folder. Absence is
// reported (ADR-006), never silently dropped; a count of 0 is a true zero.
//
// milestone 127 / ADR-001 §5 — WHICH FOLDERS ARE ITEMS is the enumerator's answer, and which
// are roots is `work.mjs`'s: this function keeps a raw listing of the work root because its
// whole job is to see what the enumerator DROPS (doctor's orphan lane is the same shape, for
// the same reason), but it matches no item name of its own — a folder is an item iff a row's
// `dir` is that folder, and the two roots are stepped over by their exported names. It used to
// test `/^\d+_/`, which called any numbered folder "attributed" and could not tell a root
// from a stray.
async function countUnattributedRuns({ cwd }) {
  const workDir = workDirOf(cwd);
  let top;
  try {
    top = await fsp.readdir(workDir, { withFileTypes: true });
  } catch {
    return 0;
  }
  const itemDirs = new Set((await listItems(workDir)).map((row) => row.dir));
  let count = 0;
  const countJson = async (dir) => {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) if (e.isFile() && e.name.endsWith(".json")) count += 1;
  };
  for (const entry of top) {
    if (!entry.isDirectory()) continue;
    if (entry.name === BACKLOG_ROOT || entry.name === ARCHIVE_ROOT) continue; // a root, not a stray
    if (itemDirs.has(path.join(workDir, entry.name))) continue; // a real item → attributed
    await countJson(path.join(workDir, entry.name, "runs"));
  }
  return count;

}
// ── append-only snapshots (68/05, ADR-007) ───────────────────────────────────
//
// An observe run NEVER truncates or rewrites an existing snapshot — the pre-68 miner
// wrote `observability/report.md` + `observability/agents.json` IN PLACE, and that is
// the defect this region exists to remove (a retrospective's citation became
// unfalsifiable because the report was regenerated over the evidence it was written
// from). Each observe run now writes a NEW timestamped snapshot under
// `observability/snapshots/<ts>/`; the read path resolves the newest.
//
// The legacy pre-68 in-place files, when present, are MARKED, never migrated
// (ADR-007): a derivation header is prepended naming the miner that produced them and
// the defects it carries, and their figures are left EXACTLY as they were. Rewriting
// the very files whose rewriting is the defect would destroy a second copy of the
// evidence in the act of labelling the first.

// The name every derivation header uses for the miner this milestone repairs.
export const PRE68_MINER = "pre-68 miner";

// The sentinel an already-marked snapshot carries, so marking is idempotent (a
// snapshot is never given a second header).
export const PRE68_DERIVATION_MARKER = "aof:pre68-derived";

// The JSON key a marked legacy agents.json carries its provenance under. A separate
// key (not a comment — JSON has none) is how a marked JSON snapshot states its
// provenance without touching a single figure.
export const PRE68_JSON_KEY = "_derivedBy";

// A filesystem-safe, lexicographically-sortable timestamp for a snapshot folder name:
// `2026-08-21T12-00-00-000Z`. Sortable ⇒ "which snapshot is newest" is determinable
// WITHOUT reading any content, and each snapshot is identifiable by when it was taken.
export function snapshotTimestamp(ts) {
  const d = ts != null ? new Date(ts) : new Date();
  return d.toISOString().replace(/[:.]/g, "-");
}

// The derivation header prepended to a legacy markdown snapshot. States what produced
// the snapshot AND names the defects that producer is subject to (the four facts the
// feature's Scenario Outline enumerates).
export function pre68DerivationHeader() {
  return [
    `<!-- ${PRE68_DERIVATION_MARKER} -->`,
    "",
    `> **⚠️ Derived by the ${PRE68_MINER}.** This snapshot was produced by the transcript miner in use before this milestone, and is subject to the defects that miner carried:`,
    `>`,
    `> - its attribution may **count one agent run against two items** (double-counting);`,
    `> - its toolchain figures may read **zero where the true figure is not zero** (the blind toolchain classifier);`,
    `> - it may itself have been **written over an earlier snapshot** (the in-place write).`,
    `>`,
    `> Its figures are left **exactly as they were produced** — not recomputed, not corrected,`,
    `> not migrated (68/ADR-007).`,
    "",
  ].join("\n");
}

// The provenance envelope added under PRE68_JSON_KEY on a legacy agents.json.
export function pre68JsonHeader() {
  return {
    miner: PRE68_MINER,
    migrated: false,
    note:
      "Produced by the transcript miner in use before this milestone. Subject to the defects that miner carried: "
      + "attribution may count one agent run against two items; toolchain figures may read zero where the true "
      + "figure is not zero; the snapshot may itself have been written over an earlier snapshot. Figures left "
      + "exactly as produced, not recomputed, not corrected, not migrated (68/ADR-007).",
  };
}

// Mark ONE legacy snapshot file with its derivation header. IDEMPOTENT — a snapshot
// already carrying the marker is returned `alreadyMarked` and left byte-identical, so
// a second marking never produces a second header. Figures are never recomputed,
// corrected or removed: markdown gets a header prepended, JSON gets a provenance key
// added, and neither rewrites any reported figure.
export async function markLegacySnapshot({ filePath }) {
  let read;
  try {
    read = await fsp.readFile(filePath, "utf8");
  } catch {
    return { filePath, marked: false, alreadyMarked: false };
  }
  if (path.extname(filePath).toLowerCase() === ".json") {
    let obj;
    try {
      obj = JSON.parse(read);
    } catch {
      return { filePath, marked: false, alreadyMarked: false };
    }
    if (obj && obj[PRE68_JSON_KEY]) return { filePath, marked: false, alreadyMarked: true };
    const out = { ...obj, [PRE68_JSON_KEY]: pre68JsonHeader() };
    await fsp.writeFile(filePath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
    return { filePath, marked: true, alreadyMarked: false };
  }
  if (read.includes(PRE68_DERIVATION_MARKER)) return { filePath, marked: false, alreadyMarked: true };
  await fsp.writeFile(filePath, pre68DerivationHeader() + read, "utf8");
  return { filePath, marked: true, alreadyMarked: false };
}

// Mark the legacy pre-68 snapshots sitting at the ROOT of an observability folder
// (`report.md`, `agents.json`) — the in-place files the old miner wrote. New
// timestamped snapshots under `snapshots/` are never touched. Returns the per-file
// results so a caller can see which were newly marked.
export async function markLegacySnapshots({ obsDir }) {
  const results = [];
  for (const name of ["report.md", "agents.json"]) {
    const p = path.join(obsDir, name);
    try {
      const st = await fsp.stat(p);
      if (!st.isFile()) continue;
    } catch {
      continue; // no legacy file at this name — nothing to mark
    }
    results.push(await markLegacySnapshot({ filePath: p }));
  }
  return results;
}

async function dirExists(p) {
  try {
    return (await fsp.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

// Read the NEWEST snapshot of an item's observability, resolving it from the
// `observability/snapshots/` folder (sortable timestamp names ⇒ newest is the last in
// lexicographic order, determinable without reading content). Returns null when no
// snapshot exists. The legacy root-level pre-68 files are NOT candidates — the newest
// snapshot is always one written by the append-only writer.
export async function readLatestSnapshot({ cwd, ref }) {
  const resolved = await resolveMilestoneFolder({ cwd, ref });
  if (!resolved) return null;
  const obsDir = path.join(cwd, "wiki", "work", resolved.folder, "observability");
  const snapshotsDir = path.join(obsDir, "snapshots");
  let names;
  try {
    names = (await fsp.readdir(snapshotsDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return null;
  }
  if (!names.length) return null;
  const ts = names[names.length - 1];
  const snapshotDir = path.join(snapshotsDir, ts);
  const reportPath = path.join(snapshotDir, "report.md");
  const jsonPath = path.join(snapshotDir, "agents.json");
  let report = null;
  let json = null;
  // MISSING and TORN are not the same fault, and only one of them is routine. A
  // snapshot that is absent is the expected state (nothing has been written yet, or the
  // pair is mid-write) and the caller branches on the null. A snapshot that EXISTS and
  // will not read or parse is a real degrade — the observability record it stands for is
  // gone — so it is reported rather than left as a comment. Both paths still return null
  // and the caller still decides.
  try {
    report = await fsp.readFile(reportPath, "utf8");
  } catch (error) {
    report = null;
    if (error?.code !== "ENOENT") reportDegrade("work-observe-snapshot-report", error, { path: reportPath });
  }
  try {
    json = JSON.parse(await fsp.readFile(jsonPath, "utf8"));
  } catch (error) {
    json = null;
    if (error?.code !== "ENOENT") reportDegrade("work-observe-snapshot-agents", error, { path: jsonPath });
  }
  return { dir: snapshotDir, reportPath, jsonPath, timestamp: ts, report, json };
}

// Top-level: analyze a milestone and (optionally) write its observability folder.
export async function observeMilestone({
  cwd = process.cwd(),
  ref,
  home = os.homedir(),
  env = process.env,
  stallMs = DEFAULT_STALL_MS,
  humanWaitMs = DEFAULT_HUMAN_WAIT_MS,
  generatedAt = null,
  write = false,
  cacheRatioTarget = null,
  cacheRatioTargetConfigured = cacheRatioTarget != null,
} = {}) {
  const resolved = await resolveMilestoneFolder({ cwd, ref });
  if (!resolved) {
    const err = new Error(`No milestone or story folder under wiki/work matching "${ref}".`);
    err.code = "milestone-not-found";
    throw err;
  }
  const { folder, id, story, kind } = resolved;
  const projectsDir = claudeProjectsDir({ cwd, home, env });
  // Attribution resolves through the run record's sessionId (ADR-005): build the
  // stream-wide session → item index once, then join each session to its item.
  const sessionToItem = await buildSessionItemIndex({ cwd });
  // The set of item refs this observe covers. A milestone observes itself PLUS its
  // stories — an agent run on story 68/03 appears in 68's report, attributed to that
  // story. A story observes only itself.
  const targetItemRefs = new Set();
  if (kind === "story") {
    targetItemRefs.add(`${id}/${story}`);
  } else {
    targetItemRefs.add(id);
    // The milestone's stories are the enumerator's rows under its folder (127/ADR-001 §5) —
    // by containment, never by a listing of `stories/` with a grammar of this module's own.
    const milestoneDir = path.join(workDirOf(cwd), ...folder.split("/"));
    for (const row of await listItems(workDirOf(cwd))) {
      if (row.parent != null && row.dir.startsWith(milestoneDir + path.sep)) targetItemRefs.add(observeRefOf(row));
    }
  }
  const { agents, sessions, found, unattributed: unattributedAgents, unattributedCount: unattributedAgentRuns } =
    await collectMilestoneAgents({ projectsDir, sessionToItem, targetItemRefs, stallMs });

  // The item's run records, rolled up by phase (68/04, ADR-002). Runs live under the
  // item's OWN folder — a story's runs under the story, never pooled at the milestone.
  const item = { ref: kind === "story" ? `${id}/${story}` : id, dir: path.join(cwd, "wiki", "work", folder) };
  const runs = await readItemRuns(item);
  const phaseRollup = applyCacheTarget(rollupRunsByPhase(runs), cacheRatioTarget, { configured: cacheRatioTargetConfigured });
  const unattributedCount = await countUnattributedRuns({ cwd });
  const firsts = agents.map((a) => a.firstTs).filter((t) => t != null);
  const lasts = agents.map((a) => a.lastTs).filter((t) => t != null);
  const spanMs = firsts.length ? Math.max(...lasts) - Math.min(...firsts) : 0;
  const activeUnionMs = unionMs(agents.flatMap((a) => a.activeIntervals || []));

  // The parent-thread pass. Bounded to the milestone's span (± an hour of slack, so
  // the invoking slash command and the closing report are inside the window) —
  // a session file spans many milestones and must not leak another one's waits in.
  const slackMs = 60 * 60 * 1000;
  const lostTime = firsts.length
    ? await collectSessionSignals({
        projectsDir,
        sessions,
        windowStart: Math.min(...firsts) - slackMs,
        windowEnd: Math.max(...lasts) + slackMs,
        humanWaitMs,
        agentActive: agents.flatMap((a) => a.activeIntervals || []),
      })
    : { infraKills: [], quietGaps: [], humanWaits: [], deadAir: [], humanTurns: [], blockedOnHumanMs: 0, deadAirMs: 0, blockedAfterInfraKillMs: 0 };
  const concurrency = analyzeWaves(agents);
  const split = tokenSplit(agents);
  const report = renderReportMarkdown({ id, folder, story, kind, agents, sessions, generatedAt, stallMs, lostTime, concurrency, split, phaseRollup, unattributedAgentRuns, unattributedAgents });
  const json = {
    milestone: id,
    story,
    kind,
    folder,
    ref: String(ref),
    generatedAt: generatedAt ? new Date(generatedAt).toISOString() : null,
    stallMs,
    transcriptsFound: found,
    projectsDir,
    sessions,
    // 96/ADR-003 — the body behind `summary.unattributedAgentRuns`. The count is
    // `unattributedAgents.length` by construction, so the two can never drift.
    unattributedAgents,
    runs: {
      count: runs.length,
      unattributedCount,
      cacheTarget: phaseRollup.cacheTarget,
      total: phaseRollup.total,
      phases: phaseRollup.phases,
      noPhase: phaseRollup.noPhase,
    },
    summary: {
      calendarSpanMs: spanMs,
      activeUnionMs,
      realIdleMs: Math.max(0, spanMs - activeUnionMs),
      sumActiveMs: agents.reduce((a, x) => a + x.activeMs, 0),
      totalOutputTokens: agents.reduce((a, x) => a + x.tokens.out, 0),
      stalledAgents: agents.filter((a) => a.stalls.length).length,
      grindingAgents: agents.filter((a) => a.diagnostics?.grind?.flagged).length,
      agentCount: agents.length,
      unattributedAgentRuns,
      blockedOnHumanMs: lostTime.blockedOnHumanMs,
      deadAirMs: lostTime.deadAirMs,
      blockedAfterInfraKillMs: lostTime.blockedAfterInfraKillMs,
      infraKills: lostTime.infraKills.length,
      serializationCostMs: concurrency.serialChains.reduce((a, c) => a + c.costMs, 0),
      governancePct: split.governancePct,
    },
    lostTime: {
      infraKills: lostTime.infraKills.map((k) => ({ at: new Date(k.at).toISOString(), agentsKilled: k.agentsKilled, resets: k.resets, phrase: k.phrase })),
      quietGaps: lostTime.quietGaps.map((g) => ({
        fromTs: new Date(g.fromTs).toISOString(),
        toTs: new Date(g.toTs).toISOString(),
        ms: g.ms,
        unattendedMs: g.unattendedMs,
        agentActiveMs: g.agentActiveMs,
        endedBy: g.endedBy,
        afterInfraKill: Boolean(g.afterInfraKill),
        resets: g.resets || null,
        resumedWith: g.resumedWith,
        sessionId: g.sessionId,
      })),
      blockedOnHumanMs: lostTime.blockedOnHumanMs,
      deadAirMs: lostTime.deadAirMs,
      blockedAfterInfraKillMs: lostTime.blockedAfterInfraKillMs,
    },
    concurrency,
    tokenSplit: split,
    agents: agents.map((a) => ({
      id: a.id,
      agentType: a.agentType,
      description: a.description,
      sessionId: a.sessionId,
      attributedTo: a.attributedTo ?? null,
      firstTs: a.firstTs ? new Date(a.firstTs).toISOString() : null,
      lastTs: a.lastTs ? new Date(a.lastTs).toISOString() : null,
      durationMs: a.durationMs,
      activeMs: a.activeMs,
      stalledMs: a.stalledMs,
      turns: a.turns,
      tokens: a.tokens,
      tools: a.tools,
      model: a.model,
      stalls: a.stalls,
      diagnostics: a.diagnostics,
    })),
  };
  let written = null;
  if (write) {
    // Append-only (68/05, ADR-007): this run writes a NEW timestamped snapshot under
    // `observability/snapshots/<ts>/` — it NEVER truncates or rewrites an existing
    // snapshot, so a retrospective's citation stays stable across later runs.
    const obsDir = path.join(cwd, "wiki", "work", folder, "observability");
    await fsp.mkdir(obsDir, { recursive: true });
    let ts = snapshotTimestamp(generatedAt);
    let snapshotDir = path.join(obsDir, "snapshots", ts);
    let disambig = 2;
    while (await dirExists(snapshotDir)) {
      snapshotDir = path.join(obsDir, "snapshots", `${ts}-${disambig}`);
      disambig += 1;
    }
    await fsp.mkdir(snapshotDir, { recursive: true });
    const reportPath = path.join(snapshotDir, "report.md");
    const jsonPath = path.join(snapshotDir, "agents.json");
    await fsp.writeFile(reportPath, report, "utf8");
    await fsp.writeFile(jsonPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
    // Marking the legacy pre-68 in-place snapshots, if any: a derivation header is
    // prepended (figures untouched), never a rewrite of their content (ADR-007).
    const marked = await markLegacySnapshots({ obsDir });
    written = { dir: obsDir, snapshotDir, reportPath, jsonPath, timestamp: ts, marked };
  }
  return { id, story, kind, folder, projectsDir, found, agents, sessions, runs, report, json, written, unattributedAgentRuns };
}

// Read the observability flag from a loaded aof config object.
//
// DEFAULT ON (operator, 2026-08-07). It shipped opt-in and therefore never ran: the
// 348 post-mortem had to be done by hand because no milestone in the repo had ever
// written an `observability/` snapshot. A diagnostic that is off by default is a
// diagnostic you only enable AFTER the day you needed it — so the default inverts,
// and `enabled: false` is now the explicit opt-OUT.
//
// The cost is bounded and local: a read of this workspace's own Claude Code session
// transcripts plus two files written into the milestone folder, on lifecycle calls
// that already run. Explicit `aof work observe` bypasses this gate either way (an
// operator asking directly is not a default).
export function observabilityEnabled(config) {
  return config?.work?.observability?.enabled !== false;
}
