#!/usr/bin/env node
// THE HAND-RUN REFRESH — THE ONLY THING IN MILESTONE 77 THAT TOUCHES THE NETWORK.
// ADR-007 §2b, §3. Milestone 77 / story 03, task 02.
//
// ── WHY THIS IS A PROGRAM AND NOT A FLAG ─────────────────────────────────────────────────────
//
// "A rule that silently fetches is a rule whose result depends on the day it ran." That sentence is
// what the whole design answers to, and it is why the corpus is checked into the tree rather than
// looked up per diagnosis: the audit is a join over data that is already there, and the same audit
// over the same corpus and the same project answers the same thing tomorrow.
//
// A `--refresh` flag on `aof work audit` would leave that as a PROMISE — a thing the audit does not
// do today, that anybody can make it do next week with one option and a good reason. A separate
// program is a different kind of guarantee: no registered command names it, the audit family's
// import closure cannot reach it, and neither of those facts is an intention. They are absences a
// control plants against (FF-7705).
//
// It lives under `scripts/` deliberately, which is the third half of the same argument: the
// installed payload carries `src/` and no `scripts/`, so this program cannot travel and cannot be
// invoked in a governed project even by accident. The corpus travels; the thing that rewrites it
// does not.
//
// ── WHAT IT DECIDES, AND WHAT IT HANDS BACK ──────────────────────────────────────────────────
//
// A six-field row declares no extraction rule, so a value is CONFIRMED and never scraped. The
// program re-reaches each row's source and stamps the date it did so; a NEW VALUE is supplied by
// the operator on the command line, and a supplied value that differs from the row's is REPORTED
// rather than quietly moved under a reviewer. A source that does not answer leaves its row's date
// exactly where it was — a date that moved without a check is the lie this whole file exists to
// avoid.
//
// Usage:
//   node scripts/refresh-harness-reference.mjs                       # confirm every row, stamp today
//   node scripts/refresh-harness-reference.mjs --set <id>=<value>    # …and record a new value for one row
//   node scripts/refresh-harness-reference.mjs --dry-run             # report only; write nothing
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const CORPUS_REL = "src/harness-reference.mjs";
// The generated view. The word in its name is the SPEC's and the story's declared write path; it is
// a rendering, never a declaration, and no module reads it.
export const VIEW_REL = "wiki/reference/harness-baselines.md";
export const PROGRAM_REL = "scripts/refresh-harness-reference.mjs";

// The rows block is spliced BETWEEN MARKERS so the module's prose — the reasoning for the corpus
// existing at all — survives every refresh. A generator that owned the whole file would delete the
// argument along with the data.
export const ROWS_OPEN = "// <<< reference rows";
export const ROWS_CLOSE = "// >>> reference rows";

const today = (now) => new Date(now).toISOString().slice(0, 10);

// ── THE CORE, PURE OVER AN INJECTED PROBE ────────────────────────────────────────────────────

/**
 * Re-confirm every row. `probe(row) -> { reachable }` is injected so the decision logic is drivable
 * without a network; `values` is `{ [id]: number }`, the operator's supplied values.
 *
 * Returns `{ rows, report }`. A row whose source did not answer keeps its old `checked` date.
 */
export async function refreshRows({ rows, probe, values = {}, now }) {
  const next = [];
  const drifted = [];
  const unreachable = [];
  const stamp = today(now);
  for (const row of rows) {
    const { reachable } = await probe(row);
    if (!reachable) {
      unreachable.push({ id: row.id, source: row.source, checked: row.checked });
      next.push({ ...row });
      continue;
    }
    const supplied = values[row.id];
    const moved = typeof supplied === "number" && Number.isFinite(supplied) && supplied !== row.value;
    if (moved) drifted.push({ id: row.id, carried: row.value, recorded: supplied });
    next.push({ ...row, value: moved ? supplied : row.value, checked: stamp });
  }
  return {
    rows: next,
    report: Object.freeze({
      checked: rows.length,
      stamp,
      drifted: Object.freeze(drifted),
      unreachable: Object.freeze(unreachable),
      confirmed: rows.length - unreachable.length,
    }),
  };
}

/** A source is reached, or it is not. A URL that does not parse is not reached and is not fetched. */
export async function reachSource(row, { fetchImpl = globalThis.fetch } = {}) {
  let url;
  try {
    url = new URL(row.source);
  } catch {
    return { reachable: false, why: "the source names no resolvable address" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { reachable: false, why: `the source names the unsupported scheme ${url.protocol}` };
  }
  try {
    const response = await fetchImpl(url, { method: "GET", redirect: "follow" });
    return response.ok
      ? { reachable: true, why: null }
      : { reachable: false, why: `the source answered ${response.status}` };
  } catch (error) {
    return { reachable: false, why: `the source could not be reached: ${error?.message ?? error}` };
  }
}

// ── THE RENDERINGS — THE MODULE IS THE ONLY HOME, AND BOTH ARE DERIVED FROM IT ───────────────

const literal = (value) => JSON.stringify(value);

export function renderRowsBlock(rows) {
  const lines = ["export const HARNESS_REFERENCE_ROWS = Object.freeze(["];
  for (const row of rows) {
    lines.push("  Object.freeze({");
    lines.push(`    id: ${literal(row.id)},`);
    lines.push(`    bound: ${literal(row.bound)},`);
    lines.push(`    value: ${literal(row.value)},`);
    lines.push(`    system: ${literal(row.system)},`);
    lines.push(`    source: ${literal(row.source)},`);
    lines.push(`    checked: ${literal(row.checked)},`);
    lines.push("  }),");
  }
  lines.push("]);");
  return lines.join("\n");
}

/** Replace the rows block between the markers, leaving every other byte of the module alone. */
export function spliceCorpusModule(source, rows) {
  const open = source.indexOf(ROWS_OPEN);
  const close = source.indexOf(ROWS_CLOSE);
  if (open < 0 || close < 0 || close < open) {
    throw new Error(`${CORPUS_REL} does not carry the row markers ${ROWS_OPEN} … ${ROWS_CLOSE}; the refresh will not guess where the rows live`);
  }
  const openEnd = source.indexOf("\n", open);
  return `${source.slice(0, openEnd + 1)}${renderRowsBlock(rows)}\n${source.slice(close)}`;
}

/**
 * The markdown view. A RENDERING, never a second declaration: it carries a generated stamp, it is
 * written only here, nothing parses it, and a hand edit does not survive the next render.
 */
export function renderView(rows, { now, program = PROGRAM_REL } = {}) {
  const lines = [
    "# Harness baselines — what other systems ship",
    "",
    `<!-- GENERATED by \`${program}\` at ${new Date(now).toISOString()}. Do not hand-edit: the next render overwrites this file. -->`,
    "",
    `> **Generated file — do not hand-edit.** Written by \`${program}\` at ${new Date(now).toISOString()}.`,
    `> The one home for these rows is \`${CORPUS_REL}\`; this page is a rendering of it and nothing reads this page.`,
    "",
    "| id | bound | value | system | source | checked |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(`| \`${row.id}\` | ${row.bound} | ${row.value} | ${row.system} | <${row.source}> | ${row.checked} |`);
  }
  lines.push("");
  lines.push(`${rows.length} row(s).`);
  lines.push("");
  return lines.join("\n");
}

// ── THE PROGRAM ──────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const values = {};
  let dryRun = false;
  for (let at = 0; at < argv.length; at += 1) {
    const arg = argv[at];
    if (arg === "--dry-run") { dryRun = true; continue; }
    if (arg === "--set") {
      const pair = argv[at + 1] ?? "";
      const split = pair.indexOf("=");
      if (split < 0) throw new Error(`--set expects <id>=<value>, got "${pair}"`);
      const id = pair.slice(0, split);
      const value = Number(pair.slice(split + 1));
      if (!Number.isFinite(value)) throw new Error(`--set ${id} expects a number, got "${pair.slice(split + 1)}"`);
      values[id] = value;
      at += 1;
      continue;
    }
    throw new Error(`unknown argument "${arg}"`);
  }
  return { values, dryRun };
}

export function renderReport(report) {
  const lines = [`checked ${report.checked} row(s): ${report.confirmed} confirmed, ${report.drifted.length} drifted, ${report.unreachable.length} unreachable.`];
  for (const row of report.drifted) {
    lines.push(`  DRIFTED    ${row.id}: carried ${row.carried}, now recorded ${row.recorded}`);
  }
  for (const row of report.unreachable) {
    lines.push(`  UNREACHABLE ${row.id}: ${row.source} did not answer; its checked date stays ${row.checked}`);
  }
  return lines.join("\n");
}

// A row it could not confirm is a row the corpus is now older than it looks about, so the program
// EXITS saying so rather than reporting it in prose a scheduler cannot read.
export const exitCodeFor = (report) => (report.unreachable.length > 0 ? 1 : 0);

async function main(argv) {
  const { values, dryRun } = parseArgs(argv);
  const corpusPath = path.join(repoRoot, CORPUS_REL);
  const source = await readFile(corpusPath, "utf8");
  const { HARNESS_REFERENCE_ROWS } = await import(pathToFileURL(corpusPath).href);
  const now = Date.now();
  const { rows, report } = await refreshRows({
    rows: HARNESS_REFERENCE_ROWS,
    probe: (row) => reachSource(row),
    values,
    now,
  });
  process.stdout.write(`${renderReport(report)}\n`);
  if (!dryRun) {
    await writeFile(corpusPath, spliceCorpusModule(source, rows));
    await writeFile(path.join(repoRoot, VIEW_REL), renderView(rows, { now }));
  }
  return exitCodeFor(report);
}

if (process.argv[1] != null && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => {
    process.stderr.write(`${error?.message ?? error}\n`);
    process.exitCode = 1;
  });
}
