// THE TUNING CORPUS — three declared lanes, each saying what it read.
// Milestone 62 / story 00. ADR-007, ADR-008, ADR-012, ADR-013.
//
// This module owns joins, not source grammars. Retrospectives are parsed by the
// memory parser, run records by their store, observations by their append-only
// snapshot reader, and scope by the stream's shared scope rule.
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { SWEEP_BASES, readRecord, sweepDeclarationProblems } from "../work-audit/reads.mjs";
import { parseRetrospective } from "../memory/local-indexing.mjs";
import { readRuns, runNodeRecordPath, runRecordPath } from "../run-store.mjs";
import { readLatestSnapshot } from "../work/observe.mjs";
import { itemInScope } from "../work/ref-scope.mjs";
import { listItems } from "../work.mjs";
import { loopPointersIn } from "../work/loops.mjs";
import { pathCitationsIn } from "../work/doctor-controls.mjs";

export const CORPUS_FINDING_CODES = Object.freeze(["tune-ran-on-nothing"]);

const lane = (id, what, measured) => Object.freeze({
  id,
  root: "<the work stream>",
  what,
  basis: SWEEP_BASES[0],
  // The refine-time census is the declared baseline. Half is high enough to
  // expose a collapsed reader without making ordinary corpus growth the floor.
  floor: Math.max(1, Math.floor(measured / 2)),
});

export const CORPUS_LANES = Object.freeze([
  lane("lessons", "retrospective lesson sections in the selected work items", 392),
  lane("lineage", "run records in the selected work items", 61),
  lane("observations", "readings taken from the selected items' observation series", 6),
]);

export function assertCorpusLanesDeclared(lanes = CORPUS_LANES) {
  const problems = sweepDeclarationProblems(lanes);
  const required = CORPUS_LANES.map((entry) => entry.id);
  const declared = Array.isArray(lanes) ? lanes.map((entry) => entry?.id) : [];
  const missing = required.filter((id) => !declared.includes(id));
  const extra = declared.filter((id) => !required.includes(id));
  if (missing.length > 0) problems.push(`the corpus omits its declared lane(s): ${missing.join(", ")}`);
  if (extra.length > 0) problems.push(`the corpus has no reader for lane(s): ${extra.join(", ")}`);
  if (new Set(declared).size !== declared.length) problems.push("the corpus declares a lane more than once");
  if (problems.length > 0) {
    throw new TypeError(`work-tune: the corpus refuses to run — ${problems.join("; ")}`);
  }
  return lanes;
}

// Re-authored because the audit constructor owns the audit's code. The other
// keys and the message deliberately remain byte-identical for one read record.
export function corpusFinding(read) {
  if (read.count >= read.floor) return null;
  return Object.freeze({
    code: CORPUS_FINDING_CODES[0],
    severity: "error",
    path: read.root,
    message: `the "${read.sweep}" sweep read ${read.count} of a required ${read.floor} while walking ${read.root} — it ran on nothing, or on so little that a clean result would mean nothing. ${read.what}`,
  });
}

function scopedRoot(workDir, scope) {
  return scope == null || String(scope).trim() === ""
    ? path.resolve(workDir)
    : `${path.resolve(workDir)} (scope: ${String(scope).trim()})`;
}

function workRelative(workDir, file) {
  return path.relative(workDir, file).split(path.sep).join("/");
}

async function readLessons(items, cwd) {
  const records = [];
  for (const item of items) {
    const file = path.join(item.dir, "RETROSPECTIVE.md");
    if (!existsSync(file)) continue;
    const text = await readFile(file, "utf8");
    const lessons = parseRetrospective(text, {
      item: item.ref,
      itemSlug: item.slug,
      // Formation/provenance consume citations from the repository root. The
      // retrospective parser owns the source field; this adapter supplies its
      // repo-relative base instead of dropping the `wiki/work` prefix.
      workRelPath: workRelative(cwd, file),
    });
    const lines = text.split(/\r?\n/u);
    for (const [index, lesson] of lessons.entries()) {
      const start = Number.parseInt(lesson.source.slice(lesson.source.lastIndexOf(":") + 1), 10) - 1;
      const next = lessons[index + 1]?.source;
      const end = next == null
        ? lines.length
        : Number.parseInt(next.slice(next.lastIndexOf(":") + 1), 10) - 1;
      const section = lines.slice(start, end).join("\n");
      const targets = [...new Set(loopPointersIn(section)
        .filter((pointer) => pointer.scheme === "config")
        .map((pointer) => pointer.raw))];
      records.push(Object.freeze({
        ...lesson,
        citations: Object.freeze([...new Set([lesson.source, ...pathCitationsIn(section)])]),
        // The loop grammar owns pointer validity. The corpus only joins the
        // one unambiguous structured config pointer to its owning lesson.
        target: targets.length === 1 ? targets[0] : null,
      }));
    }
  }
  return records;
}

async function readLineage(items, cwd) {
  const records = [];
  for (const item of items) {
    for (const run of await readRuns(item)) {
      const file = run.node == null
        ? runRecordPath(item, run.runId)
        : runNodeRecordPath(item, run.node, run.runId);
      records.push(Object.freeze({
        item: item.ref,
        ...run,
        // The run store owns both flat and node-partitioned path builders. Carry
        // that answer; formation must not learn either storage convention.
        source: workRelative(cwd, file),
      }));
    }
  }
  return records;
}

function readingHasAttribution(json) {
  if (!json || typeof json !== "object") return false;
  return Array.isArray(json.agents) && json.agents.some((agent) =>
    typeof agent?.sessionId === "string" && agent.sessionId.length > 0
      && typeof agent?.attributedTo === "string" && agent.attributedTo.length > 0);
}

async function readObservations(items, cwd) {
  const entries = [];
  let series = 0;
  let readings = 0;
  let attributed = 0;
  for (const item of items) {
    const snapshot = await readLatestSnapshot({ cwd, ref: item.ref });
    if (snapshot == null) {
      entries.push(Object.freeze({ item: item.ref, state: "no-series", reading: null }));
      continue;
    }
    series += 1;
    if (snapshot.json == null) {
      entries.push(Object.freeze({
        item: item.ref,
        state: "unreadable",
        reading: null,
        source: workRelative(cwd, snapshot.jsonPath),
      }));
      continue;
    }
    readings += 1;
    const hasAttribution = readingHasAttribution(snapshot.json);
    if (hasAttribution) attributed += 1;
    entries.push(Object.freeze({
      item: item.ref,
      state: hasAttribution ? "read-attributed" : "read-empty",
      reading: snapshot.json,
      // readLatestSnapshot owns newest-snapshot resolution and returns jsonPath.
      // Preserve that exact source-owned locator for formation/provenance.
      source: workRelative(cwd, snapshot.jsonPath),
    }));
  }
  return Object.freeze({ entries: Object.freeze(entries), series, readings, attributed });
}

function laneResult(declaration, count, root, raw) {
  const read = readRecord(declaration, count, root);
  const finding = corpusFinding(read);
  return Object.freeze({
    lane: declaration.id,
    read,
    // A starved lane contributes nothing. `raw` remains visible as the evidence
    // behind its read record and finding, never as an empty successful result.
    contribution: finding == null ? raw : null,
    raw,
    findings: Object.freeze(finding == null ? [] : [finding]),
  });
}

// Assemble the three evidence lanes for the selected stream items. An unresolved
// scope is a successful no-match report: no lane ran, so no lane can claim it read
// nothing. Floors come only from the registry and never vary with scope.
export async function assembleCorpus(options = {}) {
  // Every source reader must walk the SAME tree. `readLatestSnapshot` owns the
  // canonical cwd/wiki/work join and accepts no alternate work root, so accepting
  // one here would make lessons/lineage describe one tree while observations read
  // another. Refuse the unsupported injection before any reader runs.
  if (Object.hasOwn(options, "workDir")) {
    const error = new TypeError("work-tune: `workDir` is not an injectable corpus root; pass `cwd` and the corpus will read cwd/wiki/work through every source home");
    error.code = "work-tune-workdir-unsupported";
    throw error;
  }
  const { cwd = process.cwd(), scope = null, lanes = CORPUS_LANES } = options;
  const workDir = path.join(cwd, "wiki", "work");
  assertCorpusLanesDeclared(lanes);
  const allItems = await listItems(workDir);
  const items = allItems.filter((item) => itemInScope(item, scope));
  const scopeLabel = scope == null || String(scope).trim() === "" ? null : String(scope).trim();
  if (items.length === 0) {
    return Object.freeze({
      scope: scopeLabel,
      matched: false,
      items: Object.freeze([]),
      lanes: Object.freeze([]),
      reads: Object.freeze([]),
      findings: Object.freeze([]),
    });
  }

  const byId = new Map(lanes.map((entry) => [entry.id, entry]));
  const root = scopedRoot(workDir, scopeLabel);
  const [lessons, lineage, observations] = await Promise.all([
    readLessons(items, cwd),
    readLineage(items, cwd),
    readObservations(items, cwd),
  ]);
  const results = Object.freeze([
    laneResult(byId.get("lessons"), lessons.length, root, Object.freeze(lessons)),
    laneResult(byId.get("lineage"), lineage.length, root, Object.freeze(lineage)),
    laneResult(byId.get("observations"), observations.readings, root, observations),
  ]);
  return Object.freeze({
    scope: scopeLabel,
    matched: true,
    items: Object.freeze(items.map((item) => item.ref)),
    lanes: results,
    reads: Object.freeze(results.map((result) => result.read)),
    findings: Object.freeze(results.flatMap((result) => result.findings)),
  });
}

// The corpus's small human face. The command may place this block inside a wider
// report, but it never has to know which lane produced a read record.
export function renderCorpusReport(corpus) {
  if (!corpus?.matched) return `scope ${corpus?.scope ?? "<all>"}: matched no work items`;
  const lines = [`corpus (${corpus.scope ?? "all work"})`];
  for (const result of corpus.lanes) {
    const { read } = result;
    lines.push(`- ${read.sweep}: ${read.count} / floor ${read.floor}; ${read.what}; root ${read.root}`);
    if (result.lane === "observations") {
      lines.push(`  series ${result.raw.series}; readings ${result.raw.readings}; attributed ${result.raw.attributed}`);
    }
    for (const finding of result.findings) lines.push(`  ${finding.code}: ${finding.message}`);
  }
  return lines.join("\n");
}
