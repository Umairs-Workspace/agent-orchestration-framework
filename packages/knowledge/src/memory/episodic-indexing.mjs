import path from "node:path";
import { readFile } from "node:fs/promises";
import { headingCaptureRe, idForm, registerDeclarations } from "@aof/work/declared-id";

// 157/ADR-001 — THE EPISODIC LEAF. What already happened on an item becomes memory records:
// its declared findings, its raw feedback and its terminal runs. Every record is compiled from a
// source that already exists and is owned by another writer, so this module reads and never
// writes, and every record cites the exact line or JSON value it came from (157/ADR-002).
//
// IT IS A SIBLING OF `local-indexing.mjs`, NOT A SECTION OF IT. The lesson/ADR grammar there is
// whole-document (66/ADR-008 ruling 2) and must import none of the register-scoped half of
// `declared-id`; a finding is declared ONLY inside a Findings register, so this leaf is the one
// memory module that reads it. 157/ADR-001 revisits that prohibition for this leaf alone.
//
// THE READERS ARE INJECTED. knowledge must not import execution or core: the run store's
// `readRuns` and its two path builders, observe's `readLatestSnapshot` and the feedback ledger's
// reader arrive as collaborators, wired once in the core assembly.

export const EPISODIC_RECORD_TYPES = Object.freeze(["finding", "feedback", "run"]);

// The run states that end an attempt (19/ADR-001: done/failed/cancelled are terminal). Only a
// terminal run is something that HAPPENED; a queued, running or parked one is still happening.
const TERMINAL_RUN_STATES = new Set(["done", "failed", "cancelled"]);

// The loop phase a run (or a finding's declared Stage) names, mapped onto the stage vocabulary:
// `continue` is the build; refine and verify keep their names. An absent phase stays empty.
const PHASE_STAGES = Object.freeze({ continue: "build" });

const FINDING_ID_RE = new RegExp(`^(?:${idForm("F").id})$`);
// A heading's (id)(title) split, separator included, from the grammar's one home (FF-6604).
const FINDING_HEADING_RE = headingCaptureRe("F");
const FINDING_SOURCES = Object.freeze(["VERIFICATION.md", "SESSION.md"]);
// A finding with no declared Stage was raised where it is written: a verification register.
const FINDING_SOURCE_STAGE = "verify";

const TITLE_MAX = 120;
const SUMMARY_MAX = 200;

// ------------------------------------------------------------ JSON pointers ----

// RFC 6901 escaping of one reference token: `~` → `~0`, then `/` → `~1`.
export function escapePointerSegment(segment) {
  return String(segment).replace(/~/g, "~0").replace(/\//g, "~1");
}

export function pointerOf(...segments) {
  return segments.map((segment) => `/${escapePointerSegment(segment)}`).join("");
}

// The value a pointer selects, or `undefined` when it selects nothing. "" is the whole value.
export function jsonPointerGet(value, pointer) {
  if (pointer === "") return value;
  if (!String(pointer).startsWith("/")) return undefined;
  let current = value;
  for (const raw of String(pointer).slice(1).split("/")) {
    const token = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (current == null || typeof current !== "object") return undefined;
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9]\d*)$/.test(token)) return undefined;
      current = current[Number(token)];
    } else {
      if (!Object.hasOwn(current, token)) return undefined;
      current = current[token];
    }
  }
  return current;
}

// ------------------------------------------------------------------ helpers ----

function toWorkRel(workDir, absPath) {
  return path.relative(workDir, absPath).split(path.sep).join("/");
}

// Markdown emphasis off, whitespace collapsed: the readable form of a cell or a heading.
function plain(text) {
  return String(text ?? "").replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim();
}

function clip(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// A snapshot writes a stall's `at` as epoch milliseconds; text carries the readable instant.
function instant(at) {
  if (Number.isFinite(at)) return new Date(at).toISOString();
  return at == null ? "?" : String(at);
}

function stageOf(phase) {
  const value = plain(phase).toLowerCase();
  return PHASE_STAGES[value] ?? value;
}

async function readText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

// ----------------------------------------------------------------- findings ----

const TABLE_ROW_RE = /^\s*\|/;
const TABLE_SEPARATOR_RE = /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/;
const HEADING_RE = /^(#{1,6})\s/;
const HORIZONTAL_RULE_RE = /^---+\s*$/;

function tableCells(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

// The header labels of the table a row sits in — the block's first line, when the second is
// its separator. A headerless block (the corpus has some) answers null, and the row is read
// positionally rather than mislabelled.
function tableHeader(lines, index) {
  let top = index;
  while (top > 0 && TABLE_ROW_RE.test(lines[top - 1])) top -= 1;
  if (top + 1 > index || !TABLE_SEPARATOR_RE.test(lines[top + 1] ?? "")) return null;
  return tableCells(lines[top]).map((label) => plain(label).toLowerCase());
}

// Header labels are mapped by name, never by column position (157/ADR-001).
const LABELS = Object.freeze({
  severity: ["severity"],
  status: ["status", "disposition"],
  stage: ["stage"],
  owner: ["owner"],
  title: ["finding", "observed", "title", "summary", "description"],
});

function labelled(fields, key) {
  for (const label of LABELS[key]) {
    const hit = fields.find((field) => field.label === label && field.value);
    if (hit) return hit.value;
  }
  return "";
}

function rowDeclaration(lines, index, id) {
  const cells = tableCells(lines[index]);
  const header = tableHeader(lines, index);
  const fields = cells.map((value, column) => ({ label: header?.[column] ?? "", value: plain(value) }));
  const rest = fields.filter((field) => field.value && field.value !== id);
  const longest = rest.reduce((best, field) => (field.value.length > best.length ? field.value : best), "");
  return {
    severity: labelled(fields, "severity"),
    status: labelled(fields, "status"),
    stage: labelled(fields, "stage"),
    owner: labelled(fields, "owner"),
    title: labelled(fields, "title") || longest,
    text: header
      ? fields.filter((field) => field.value).map((field) => (field.label ? `${field.label}: ${field.value}` : field.value)).join(" \n ")
      : rest.map((field) => field.value).join(" \n "),
  };
}

// `- **Label:** value` / `**Label.** value` inside a heading section.
function sectionField(body, label) {
  const re = new RegExp(`\\*\\*${label}[:.]\\*\\*\\s*(.+)`, "i");
  for (const line of body) {
    const match = line.match(re);
    if (match) return plain(match[1]);
  }
  return "";
}

// A heading declaration reads its complete section: to the next heading at its own level or
// above, a horizontal rule, or another declaration (a row of the next finding) — the peer
// boundary — never into the next finding.
function headingDeclaration(lines, index, declared) {
  const level = lines[index].match(HEADING_RE)[1].length;
  const body = [];
  for (let at = index + 1; at < lines.length; at += 1) {
    const heading = lines[at].match(HEADING_RE);
    if ((heading && heading[1].length <= level) || HORIZONTAL_RULE_RE.test(lines[at]) || declared.has(at)) break;
    body.push(lines[at]);
  }
  const head = plain(lines[index].replace(HEADING_RE, ""));
  const [, , title = ""] = plain(lines[index]).match(FINDING_HEADING_RE) ?? [];
  return {
    severity: sectionField(body, "Severity"),
    status: sectionField(body, "Status"),
    stage: sectionField(body, "Stage"),
    owner: sectionField(body, "Owner"),
    title: title.trim(),
    text: [head, ...body.map((line) => line.trim()).filter(Boolean)].join(" \n "),
  };
}

// Every finding declared in an item's VERIFICATION.md and SESSION.md Findings registers. One id
// declared twice (a summary row AND a detailed heading) is ONE record: its first declaration is
// the primary source, distinct texts merge in document order, and the other locations are named.
async function findingRecords(item, meta, workDir) {
  const byId = new Map();
  for (const file of FINDING_SOURCES) {
    const abs = path.join(item.dir, file);
    const text = await readText(abs);
    if (text == null) continue;
    const lines = text.split(/\r?\n/);
    const rel = toWorkRel(workDir, abs);
    const declarations = registerDeclarations(text, file);
    const declared = new Set(declarations.map((declaration) => declaration.line - 1));
    for (const declaration of declarations) {
      if (!FINDING_ID_RE.test(declaration.id)) continue;
      const index = declaration.line - 1;
      const parsed = TABLE_ROW_RE.test(lines[index])
        ? rowDeclaration(lines, index, declaration.id)
        : headingDeclaration(lines, index, declared);
      const at = `${rel}:${declaration.line}`;
      const entry = byId.get(declaration.id);
      if (entry == null) byId.set(declaration.id, { at, parts: [parsed], also: [] });
      else {
        entry.parts.push(parsed);
        entry.also.push(at);
      }
    }
  }
  return [...byId.entries()].map(([id, { at, parts, also }]) => {
    const first = (key) => parts.map((part) => part[key]).find(Boolean) ?? "";
    const severity = first("severity");
    const status = first("status");
    const declaredStage = first("stage");
    const title = clip(first("title"), TITLE_MAX);
    const texts = [...new Set(parts.map((part) => part.text).filter(Boolean))];
    const qualifier = [severity, status].filter(Boolean).join(" · ");
    return {
      recordType: "finding",
      id,
      ...meta,
      title,
      area: "delivery",
      stage: declaredStage ? stageOf(declaredStage) : FINDING_SOURCE_STAGE,
      kind: "finding",
      owner: first("owner"),
      status,
      tags: [],
      summary: clip(qualifier ? `${qualifier} — ${title}` : title, SUMMARY_MAX),
      text: [id, ...texts, ...also.map((location) => `also declared at ${location}`)].join(" \n "),
      source: at,
    };
  });
}

// ------------------------------------------------------------- the factory ----

// Configured application services are supplied by core; construction performs no I/O.
export function createEpisodicIndexing({ readRuns, runRecordPath, runNodeRecordPath, readLatestSnapshot, readFeedbackRecords, feedbackRecordPath, reportDegrade }) {
  // ------------------------------------------------------------ raw feedback ----

  // Only `kind: "raw"` rows are feedback (classification and recall rows are evidence about
  // feedback, 153/ADR-001). The ledger reader validates; this resolves each record it returned
  // to its PHYSICAL line, since the reader yields one record per non-blank line, in order.
  // A ledger the reader refuses is reported through its own diagnostic and yields nothing —
  // never a partial set that reads as clean.
  async function feedbackRecords(item, meta, workDir) {
    const ledger = feedbackRecordPath(item);
    const body = await readText(ledger);
    if (body == null) return [];
    let rows;
    try {
      rows = await readFeedbackRecords(item);
    } catch (error) {
      reportDegrade("memory-episodic-feedback", error, { path: ledger, key: ledger });
      return [];
    }
    const physical = body.split(/\r?\n/).flatMap((line, index) => (line.trim() === "" ? [] : [index + 1]));
    const rel = toWorkRel(workDir, ledger);
    return rows.flatMap((row, index) => {
      if (row.kind !== "raw") return [];
      const gist = plain(row.text.split(/\r?\n/).find((line) => line.trim()) ?? "");
      return [{
        recordType: "feedback",
        id: row.id,
        ...meta,
        title: clip(gist, TITLE_MAX),
        area: "delivery",
        stage: "", // raw feedback carries no phase
        kind: "feedback",
        owner: row.actor,
        status: "", // nor an outcome
        tags: [],
        summary: clip(gist, SUMMARY_MAX),
        text: [row.text, row.refs ? `refs: ${row.refs}` : ""].filter(Boolean).join(" \n "),
        source: `${rel}:${physical[index]}#`,
      }];
    });
  }

  // -------------------------------------------------------------------- runs ----

  // A milestone's snapshot answers for its stories: the reader owns milestone snapshots, so a
  // story's runs are matched against its PARENT milestone's newest snapshot.
  function snapshotRefOf(item) {
    return String(item.ref).split("/")[0];
  }

  // The stalls a run's own session recorded, or why they are unavailable. An agent matches only
  // on BOTH its sessionId and its attribution to the run's full item ref, so another item's agent
  // in the same session lends nothing. A matched agent with an empty stalls array is a KNOWN zero.
  async function stallsOf(run, item, build) {
    const { workDir, projectRoot } = build;
    if (!run.sessionId) return { available: false, reason: "the run recorded no session" };
    // `readLatestSnapshot` reads <cwd>/wiki/work and takes no other root: a stream configured
    // elsewhere is reported unavailable rather than answered from a different tree.
    if (!projectRoot || path.resolve(workDir) !== path.resolve(projectRoot, "wiki", "work")) {
      return { available: false, reason: "the snapshot reader reads only <project>/wiki/work" };
    }
    const ref = snapshotRefOf(item);
    if (!build.snapshots.has(ref)) build.snapshots.set(ref, await readLatestSnapshot({ cwd: projectRoot, ref }));
    const snapshot = build.snapshots.get(ref);
    if (snapshot?.json == null) return { available: false, reason: snapshot == null ? "no observability snapshot" : "the snapshot is unreadable" };
    const owner = run.itemRef || item.ref;
    const agents = Array.isArray(snapshot.json.agents) ? snapshot.json.agents : [];
    const matched = agents
      .map((agent, index) => ({ agent, index }))
      .filter(({ agent }) => agent?.sessionId === run.sessionId && agent?.attributedTo === owner);
    if (matched.length === 0) return { available: false, reason: `no snapshot agent for session ${run.sessionId} attributed to ${owner}` };
    if (matched.some(({ agent }) => !Array.isArray(agent.stalls))) return { available: false, reason: "the matched agent carries no stall telemetry" };
    const snapshotRel = toWorkRel(workDir, snapshot.jsonPath);
    return {
      available: true,
      locators: matched.map(({ index }) => `${snapshotRel}#${pointerOf("agents", index)}`),
      stalls: matched.flatMap(({ agent }) => agent.stalls),
    };
  }

  function stallLines(stalls) {
    if (!stalls.available) return [`stalls: unavailable (${stalls.reason})`];
    return [
      `stalls: ${stalls.stalls.length}`,
      ...stalls.locators.map((locator) => `stall source: ${locator}`),
      ...stalls.stalls.map((stall) => `stall ${Math.round((stall?.gapMs ?? 0) / 1000)}s at ${instant(stall?.at)}${stall?.before || stall?.after ? ` (${stall?.before ?? "?"} → ${stall?.after ?? "?"})` : ""}`),
    ];
  }

  // The file a run record was read from: the store owns both conventions, so ask it.
  function runFileOf(item, run) {
    return run.node == null ? runRecordPath(item, run.runId) : runNodeRecordPath(item, run.node, run.runId);
  }

  async function runRecords(item, meta, build) {
    const records = [];
    for (const run of await readRuns(item)) {
      if (!TERMINAL_RUN_STATES.has(run.state)) continue;
      const phase = run.brief?.loop?.phase ?? "";
      const stage = phase ? stageOf(phase) : "";
      const stalls = await stallsOf(run, item, build);
      const summary = [run.state, run.failureReason].filter(Boolean).join(": ");
      records.push({
        recordType: "run",
        id: run.runId,
        ...meta,
        title: `Run ${run.runId}: ${[phase, run.state].filter(Boolean).join(" ")}, attempt ${run.attempt ?? "?"}`,
        area: "delivery",
        stage,
        kind: "run",
        owner: "",
        status: run.outcome ?? "",
        tags: [],
        summary,
        text: [
          `run ${run.runId} on ${run.itemRef ?? item.ref}`,
          `state: ${run.state}`,
          `outcome: ${run.outcome ?? "none"}`,
          `attempt: ${run.attempt ?? "?"}`,
          `retryOf: ${run.retryOf ?? "none"}`,
          run.failureReason ? `failureReason: ${run.failureReason}` : "",
          phase ? `phase: ${phase}` : "",
          run.sessionId ? `session: ${run.sessionId}` : "",
          ...stallLines(stalls),
        ].filter(Boolean).join(" \n "),
        source: `${toWorkRel(build.workDir, runFileOf(item, run))}#`,
      });
    }
    return records;
  }

  // One item's episodic records, in a fixed order (findings, feedback, runs) so the walk's
  // record order — a documented ranking tie-break — is deterministic.
  async function episodicRecordsFor(item, meta, build) {
    return [
      ...(await findingRecords(item, meta, build.workDir)),
      ...(await feedbackRecords(item, meta, build.workDir)),
      ...(await runRecords(item, meta, build)),
    ];
  }

  // One build's shared state: a snapshot is read once per milestone, however many runs ask.
  function episodicBuild({ workDir, projectRoot }) {
    return { workDir, projectRoot, snapshots: new Map() };
  }

  return { episodicRecordsFor, episodicBuild };
}
