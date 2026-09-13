// src/work-acceptor/store.mjs — THE ACCEPTOR'S ONE I/O HOME (milestone 61 / ADR-006 §4,
// ADR-007 §2a).
//
// Everything else in `src/work-acceptor/` computes. This module is the only one that
// touches a disk, and it holds BOTH writes a ruling can produce: the surgical knob write
// into `.aof/aof.config.json`, and the append of the ruling record into
// `.aof/acceptor-ledger.jsonl`. One writer for both files is what makes "the change and
// the record that justifies it are one working-tree change" a PROPERTY rather than a
// convention two modules would have to keep agreeing about.
//
// ── HALF OF REVERSIBILITY WAS ALREADY FREE; THIS IS THE OTHER HALF ───────────────────
//
// The configuration, the frozen set and every loop record are git-tracked, so undoing a
// harness change is one command. What was missing is the WHY, attached to it — the spike
// found no event in the whole vocabulary that could carry one, and the one writer seam
// that touches editable resources records no prior value, no evidence and no provenance
// at all. The ledger below is that attachment: the key, both values, the epoch, the
// criterion, the evidence in the order it arrived, what it attained, the counter-metric
// reading, the dwell declaration, who rendered it, the verdict and the refusals — beside
// the configuration it changed, in one revertible unit.
//
// ── THE PATH IS IMPORTED, NEVER RESTATED ─────────────────────────────────────────────
//
// `LEDGER_RELPATH` is declared once, in `criterion.mjs`, beside the criterion record it
// is the evidence for. Restating it here would be a second home for a fact, and the
// second home is always the one that goes stale. The same applies one level up: the
// record's frozen key set and its completeness rule are `ledger.mjs`'s, so this module
// imports `RULING_KEYS` and `makeRuling` rather than re-deciding what a complete record
// is. What is decided HERE is only where the bytes go.
//
// ── THE KNOB WRITE IS A TEXT SPLICE, NOT A RE-RENDER ─────────────────────────────────
//
// `.aof/aof.config.json` is CO-AUTHORED: an operator's key order and formatting are
// theirs, and a read-parse-restringify round trip silently rewrites the whole file — the
// named defect of m43/ADR-002 and the measured blast radius of 55/ADR-004. So the write
// below locates the span of ONE value in the raw text and replaces exactly that span.
// Every other key, its order, the indentation, the trailing newline and any hand
// formatting survive byte-intact, because they are never re-generated.
//
// AND IT SPELLS NO KNOB KEY. The tunable set is the registry's `parameter-tuning:` edge
// (ADR-008 §4, ADR-009 §5); the key arrives here as data, carried on a ruling. No literal
// below names a knob, which is what stops this module becoming a second home for the set
// of things that may be tuned.
import path from "node:path";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { LEDGER_RELPATH } from "./criterion.mjs";
import { RULING_KEYS, makeRuling } from "./ledger.mjs";

// The workspace-relative home of the configuration a ruling can move. Spelled here
// because this is the module that writes it, and a writer that resolved its own target
// through a general path helper would be one indirection away from writing somewhere else.
export const CONFIG_RELPATH = ".aof/aof.config.json";

// The line's identity field. A record is deduplicated by the IDENTITY of the ruling that
// raised it, never by resemblance — ADR-007 §2. Getting that backwards in either
// direction is a defect: keying on contents loses two genuinely separate rulings that
// happen to read identically, and keying on nothing manufactures evidence out of a
// redelivery.
export const LEDGER_LINE_KEY = "rulingId";

// ── CONSTRUCTION REFUSALS ────────────────────────────────────────────────────────────
//
// Every code below is a CONSTRUCTION refusal, thrown, and they are a different vocabulary
// from the ruling refusals that reach a `refusals` array (ADR-010 §2). The distinction is
// not cosmetic: a thrown refusal means NO RULING WAS PRODUCED AT ALL, so it can never be
// a ground a ruling reports. The two sets are disjoint and stay disjoint.
export const LEDGER_LINE_CONFLICT = "ledger-line-conflict";
export const LEDGER_LINE_UNREADABLE = "ledger-line-unreadable";
export const RULING_UNIDENTIFIED = "ruling-unidentified";
export const KNOB_PATH_NOT_A_SECTION = "knob-path-not-a-section";
export const KNOB_VALUE_NOT_SCALAR = "knob-value-not-scalar";
export const KNOB_KEY_UNREADABLE = "knob-key-unreadable";
export const CONFIG_NOT_AN_OBJECT = "config-not-an-object";
export const PROJECT_DIR_UNSET = "project-dir-unset";

export const STORE_REFUSALS = Object.freeze([
  LEDGER_LINE_CONFLICT,
  LEDGER_LINE_UNREADABLE,
  RULING_UNIDENTIFIED,
  KNOB_PATH_NOT_A_SECTION,
  KNOB_VALUE_NOT_SCALAR,
  KNOB_KEY_UNREADABLE,
  CONFIG_NOT_AN_OBJECT,
  PROJECT_DIR_UNSET,
]);

export class StoreError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "StoreError";
    this.code = code;
    this.status = 400;
    Object.assign(this, details);
  }
}

function refuse(code, message, details = {}) {
  throw new StoreError(code, message, details);
}

// ── THE TREE IS NAMED, NEVER DEFAULTED ───────────────────────────────────────────────
//
// Both of this module's paths hang off a project directory, and an ABSENT one used to be
// coerced to `""` — which makes `path.join` return a RELATIVE path, resolved by the
// filesystem against whatever `process.cwd()` happened to be. Measured, that is the worst
// failure this file can have: the knob write lands in a config the caller never named
// (some other workspace's, or the tool's own checkout), while the record — which travels
// by the same root on the event's payload — lands nowhere at all, and the seam returns
// success. A write this module cannot place beside its record is one it must not perform,
// so the absence is refused at the door with a code of its own, rather than silently
// becoming a path or surfacing later as an uncoded ENOENT from somewhere else entirely.
export function requireProjectDir(projectDir) {
  if (typeof projectDir !== "string" || projectDir.trim().length === 0) {
    refuse(
      PROJECT_DIR_UNSET,
      "Refusing to reach the acceptor's files: no project directory was named, so the configuration and the ledger beside it would both be resolved against the current working directory — a harness value moved in a tree nobody chose, with its record owed to nobody.",
      { projectDir: typeof projectDir === "string" ? projectDir : projectDir === undefined ? null : projectDir },
    );
  }
  return projectDir;
}

const under = (projectDir, relpath) => path.join(requireProjectDir(projectDir), ...relpath.split("/"));

export const ledgerPath = (projectDir) => under(projectDir, LEDGER_RELPATH);
export const configPathFor = (projectDir) => under(projectDir, CONFIG_RELPATH);

// ── THE LEDGER LINE ──────────────────────────────────────────────────────────────────

// The canonical projection of a record onto one line: the ruling's identity first, then
// the frozen key set IN ITS FROZEN ORDER. Canonical because a second process working
// through the same fact must reproduce the line BYTE FOR BYTE rather than append a
// variant of it — which is what lets redelivery be settled by identity without anyone
// ever having to decide whether two spellings of one record are "the same".
//
// Nothing here is minted at write time. No clock, no host, no sequence number: a line is
// a pure function of the ruling and its identity, and anything else on it would make the
// second machine's copy differ from the first machine's for no reason a reader could use.
function orderedLine(rulingId, record) {
  const line = { [LEDGER_LINE_KEY]: rulingId };
  for (const part of RULING_KEYS) line[part] = record?.[part] ?? null;
  return JSON.stringify(line);
}

// ledgerLine(rulingId, ruling) — the line, REFUSING an incomplete record.
//
// This is ADR-006 §3's second refusal, at the point the record would land. A record that
// was complete when it was rendered can still lose a field on the way here — over a
// transport, through a serialisation, out of a payload assembled by hand — and a blank in
// the record justifying a configuration change is read six months later as a MEASUREMENT,
// not as an absence. A missing counter-metric reading rendered blank says nothing got
// worse. That is the single most expensive lie this file could tell, so a zero that was
// measured lands and an absence is refused.
export function ledgerLine(rulingId, ruling) {
  if (typeof rulingId !== "string" || rulingId.trim().length === 0) {
    refuse(
      RULING_UNIDENTIFIED,
      "Refusing the ledger line: the ruling that raised it has no identity. A record is deduplicated by the identity of its ruling, so an unidentified record cannot be told apart from a redelivery of itself.",
      { rulingId: rulingId ?? null },
    );
  }
  return orderedLine(rulingId, makeRuling(ruling));
}

function parseLine(text, at) {
  let value = null;
  try {
    value = JSON.parse(text);
  } catch {
    value = null;
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    refuse(
      LEDGER_LINE_UNREADABLE,
      `Refusing to read the ledger: line ${at + 1} is not a JSON record. The ledger is the evidence the acceptor weighs, and a line it cannot read is not a line it may skip.`,
      { at },
    );
  }
  return value;
}

// readLedger(projectDir) — every record, oldest first, with the raw lines beside them.
//
// An absent file is a workspace that has never had a ruling, not a fault — the same
// ENOENT reading `readCriterion` takes. `read: true` rides the result deliberately: an
// empty ledger and a ledger nobody could read are the same zero with opposite meanings,
// and they must never render the same.
export async function readLedger(projectDir) {
  const ledgerFile = ledgerPath(projectDir);
  let text = null;
  try {
    text = await readFile(ledgerFile, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return Object.freeze({ path: ledgerFile, read: true, exists: false, text: "", lines: Object.freeze([]), records: Object.freeze([]), total: 0 });
  }
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const records = lines.map((line, at) => parseLine(line, at));
  return Object.freeze({
    path: ledgerFile,
    read: true,
    exists: true,
    text,
    lines: Object.freeze(lines),
    records: Object.freeze(records),
    total: records.length,
  });
}

// appendRuling(projectDir, { rulingId, ruling }) — THE append, idempotent by identity.
//
// Delivery in this family is at-least-once BY DESIGN: a process can stop between
// recording a fact and acting on it, and a fact can reach a second machine that has not
// yet acted on it. Here that matters more than usual, because the ledger IS the evidence
// the acceptor weighs — a duplicated record is a ruling that never happened, and enough
// of them carry a proposal over a threshold set precisely so that noise could not. That
// is the same p-hack this milestone exists to prevent, arriving through the transport
// layer, where nobody would look for it because the arithmetic upstream is impeccable.
//
// So: a second delivery of one ruling changes nothing (no line, no byte), while two
// genuinely separate rulings that happen to read identically are two rulings and both are
// kept. And the same identity carrying DIFFERENT contents is neither — it is a conflict,
// refused, with the record already on disk left exactly as it was. Letting one silently
// replace the other would make the ledger a thing a redelivery can rewrite.
export async function appendRuling(projectDir, { rulingId, ruling } = {}) {
  const line = ledgerLine(rulingId, ruling);
  const ledgerFile = ledgerPath(projectDir);
  const existing = await readLedger(projectDir);

  const at = existing.records.findIndex((record) => record?.[LEDGER_LINE_KEY] === rulingId);
  if (at >= 0) {
    const already = orderedLine(rulingId, existing.records[at]);
    if (already !== line) {
      refuse(
        LEDGER_LINE_CONFLICT,
        `Refusing the ruling: ${rulingId} is already recorded in ${ledgerFile} with different contents. A redelivery reproduces its line; a different record under the same identity is two rulings wearing one name, and neither may silently replace the other.`,
        { rulingId, at, recorded: existing.lines[at], offered: line },
      );
    }
    return Object.freeze({ path: ledgerFile, rulingId, line, appended: false, reason: "already-recorded", at, total: existing.total });
  }

  await mkdir(path.dirname(ledgerFile), { recursive: true });
  await appendFile(ledgerFile, `${line}\n`, "utf8");
  return Object.freeze({ path: ledgerFile, rulingId, line, appended: true, at: existing.total, total: existing.total + 1 });
}

// ── THE SURGICAL KNOB WRITE ──────────────────────────────────────────────────────────
//
// A hand-rolled scan rather than a parse-and-restringify, for the reason in this file's
// header: the span of ONE value is replaced and nothing else in the file is regenerated.
// It reads JSON only — the configuration carries no comments — and it refuses rather than
// guesses whenever the shape is not the one it expected.

const WHITESPACE = new Set([" ", "\t", "\r", "\n"]);

function skipSpace(text, at) {
  let index = at;
  while (index < text.length && WHITESPACE.has(text[index])) index += 1;
  return index;
}

function scanString(text, at) {
  let index = at + 1;
  while (index < text.length) {
    if (text[index] === "\\") {
      index += 2;
      continue;
    }
    if (text[index] === '"') return index + 1;
    index += 1;
  }
  return -1;
}

// The end offset (exclusive) of the JSON value starting at `at`. Strings are skipped as
// units so a brace inside one never moves the depth counter.
function scanValue(text, at) {
  const start = skipSpace(text, at);
  const opener = text[start];
  if (opener === '"') return scanString(text, start);
  if (opener === "{" || opener === "[") {
    let depth = 0;
    let index = start;
    while (index < text.length) {
      const char = text[index];
      if (char === '"') {
        const end = scanString(text, index);
        if (end < 0) return -1;
        index = end;
        continue;
      }
      if (char === "{" || char === "[") depth += 1;
      else if (char === "}" || char === "]") {
        depth -= 1;
        if (depth === 0) return index + 1;
      }
      index += 1;
    }
    return -1;
  }
  let index = start;
  while (index < text.length && !WHITESPACE.has(text[index]) && text[index] !== "," && text[index] !== "}" && text[index] !== "]") index += 1;
  return index;
}

// Every member of the object opening at `objectAt`, in FILE ORDER, each with the spans a
// splice needs. File order is the point: it is the operator's order, and the write below
// preserves it by never rebuilding the list.
function objectMembers(text, objectAt) {
  const members = [];
  let index = objectAt + 1;
  while (index < text.length) {
    index = skipSpace(text, index);
    if (text[index] === "}") return { members, closeAt: index };
    if (text[index] === ",") {
      index += 1;
      continue;
    }
    if (text[index] !== '"') return null;
    const keyStart = index;
    const keyEnd = scanString(text, keyStart);
    if (keyEnd < 0) return null;
    let key = null;
    try {
      key = JSON.parse(text.slice(keyStart, keyEnd));
    } catch {
      return null;
    }
    const colon = skipSpace(text, keyEnd);
    if (text[colon] !== ":") return null;
    const valueStart = skipSpace(text, colon + 1);
    const valueEnd = scanValue(text, valueStart);
    if (valueEnd < 0) return null;
    members.push({ key, keyStart, valueStart, valueEnd });
    index = valueEnd;
  }
  return null;
}

// The indentation of the line the offset sits on — the file's OWN formatting, read back
// out of it rather than assumed. A file indented with tabs keeps its tabs.
function indentAt(text, offset) {
  const lineStart = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const run = /^[ \t]*/u.exec(text.slice(lineStart, offset));
  return run ? run[0] : "";
}

// One step of indentation, MEASURED from the document's own first member rather than
// declared. Two spaces only when the file gives nothing to measure.
function indentUnit(text, rootMembers) {
  const first = rootMembers[0];
  const measured = first ? indentAt(text, first.keyStart) : "";
  return measured.length > 0 ? measured : "  ";
}

function renderScalar(value) {
  const scalar = typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null;
  if (!scalar) {
    refuse(
      KNOB_VALUE_NOT_SCALAR,
      "Refusing the harness write: a knob holds a single ordered value (ADR-009), and a structure written into one is a change no single-notch step could have proposed.",
      { offered: value === undefined ? null : Array.isArray(value) ? "array" : typeof value },
    );
  }
  return JSON.stringify(value);
}

// The tail of a path whose intermediate sections do not exist yet, rendered in the file's
// own indentation. Refusing instead would leave a declared knob unwritable in a
// configuration that has simply never declared it — a hole rather than a discipline.
function renderTail(segments, value, indent, unit) {
  if (segments.length === 0) return renderScalar(value);
  const [head, ...rest] = segments;
  const inner = indent + unit;
  return `{\n${inner}${JSON.stringify(head)}: ${renderTail(rest, value, inner, unit)}\n${indent}}`;
}

// Where in the raw text the value lives, or where it would be inserted. Never a regex
// over the whole file: a key name can appear inside a string value, and a match there
// would splice a harness value into somebody's prose.
function locateKnob(text, segments) {
  const rootAt = skipSpace(text, 0);
  if (text[rootAt] !== "{") {
    refuse(CONFIG_NOT_AN_OBJECT, "Refusing the harness write: the configuration is not a JSON object.", { at: rootAt });
  }
  const root = objectMembers(text, rootAt);
  if (root == null) {
    refuse(CONFIG_NOT_AN_OBJECT, "Refusing the harness write: the configuration could not be read as JSON members.", { at: rootAt });
  }

  let objectAt = rootAt;
  let object = root;
  for (let depth = 0; depth < segments.length; depth += 1) {
    const found = object.members.find((member) => member.key === segments[depth]);
    if (found == null) {
      return { kind: "absent", object, objectAt, missing: segments.slice(depth), unit: indentUnit(text, root.members) };
    }
    if (depth === segments.length - 1) {
      return { kind: "present", valueStart: found.valueStart, valueEnd: found.valueEnd, unit: indentUnit(text, root.members) };
    }
    const nextAt = skipSpace(text, found.valueStart);
    if (text[nextAt] !== "{") {
      refuse(
        KNOB_PATH_NOT_A_SECTION,
        `Refusing the harness write: ${segments.slice(0, depth + 1).join(".")} holds a value rather than a section, so ${segments.join(".")} names nothing this file can hold.`,
        { at: segments.slice(0, depth + 1).join(".") },
      );
    }
    const next = objectMembers(text, nextAt);
    if (next == null) {
      refuse(
        KNOB_PATH_NOT_A_SECTION,
        `Refusing the harness write: ${segments.slice(0, depth + 1).join(".")} could not be read as JSON members.`,
        { at: segments.slice(0, depth + 1).join(".") },
      );
    }
    objectAt = nextAt;
    object = next;
  }
  return { kind: "absent", object, objectAt, missing: segments, unit: indentUnit(text, root.members) };
}

// setKnobValue(text, key, value) — PURE. Raw configuration text in, raw configuration
// text out, with exactly one value replaced or exactly one member inserted.
//
// Pure on purpose: the surgical claim ("every other key, its order and the file's
// formatting survive") is a property of a STRING TRANSFORM, and a property of a string
// transform can be planted and asserted without a filesystem anywhere near it.
export function setKnobValue(text, key, value) {
  const segments = typeof key === "string" ? key.split(".").filter((part) => part.length > 0) : [];
  if (segments.length === 0) {
    refuse(KNOB_KEY_UNREADABLE, "Refusing the harness write: the ruling names no configuration key.", { key: key ?? null });
  }
  const target = locateKnob(text, segments);
  if (target.kind === "present") {
    return `${text.slice(0, target.valueStart)}${renderScalar(value)}${text.slice(target.valueEnd)}`;
  }

  const { object, objectAt, missing, unit } = target;
  const memberIndent = object.members.length > 0 ? indentAt(text, object.members[0].keyStart) : indentAt(text, objectAt) + unit;
  const member = `${JSON.stringify(missing[0])}: ${renderTail(missing.slice(1), value, memberIndent, unit)}`;
  if (object.members.length > 0) {
    const last = object.members[object.members.length - 1];
    return `${text.slice(0, last.valueEnd)},\n${memberIndent}${member}${text.slice(last.valueEnd)}`;
  }
  return `${text.slice(0, objectAt + 1)}\n${memberIndent}${member}\n${indentAt(text, objectAt)}${text.slice(object.closeAt)}`;
}

// The value a path currently holds, read off the parsed document. This is the "value held
// before" a ruling records — read at the moment of the write rather than trusted from the
// proposal, because what a revert restores is what was actually there.
export function readKnobValue(config, key) {
  const segments = typeof key === "string" ? key.split(".").filter((part) => part.length > 0) : [];
  let cursor = config;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== "object") return null;
    cursor = cursor[segment];
  }
  return cursor === undefined ? null : cursor;
}

// writeKnobValue(projectDir, key, value) — the one door to a harness value.
//
// Reached only from the seam, never from a command or a face (ADR-007 §2a): a knob that
// can be moved from a surface is a knob that can be moved without a ruling, and a ruling
// nobody had to render is the whole discipline gone.
export async function writeKnobValue(projectDir, key, value) {
  const configFile = configPathFor(projectDir);
  const text = await readFile(configFile, "utf8");
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    refuse(CONFIG_NOT_AN_OBJECT, `Refusing the harness write: ${configFile} is not parseable JSON.`, { path: configFile });
  }
  const before = readKnobValue(parsed, key);
  const next = setKnobValue(text, key, value);
  await writeFile(configFile, next, "utf8");
  return Object.freeze({ path: configFile, key, from: before, to: value, changed: next !== text });
}
