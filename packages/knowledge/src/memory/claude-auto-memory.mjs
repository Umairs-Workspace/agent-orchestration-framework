import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { commandError } from "@aof/contracts/error";

// 159/ADR-001..003 — THE OPERATOR AUTO-MEMORY LEAF. An opt-in source of `lesson` records read
// from the selected project's Claude Code auto-memory folder (`<claude projects>/<slug>/memory/*.md`).
// The folder stays authoritative: this module reads and never writes, copies nothing into the work
// stream, and every record cites the entry's own absolute path (`<path>:1`).
//
// IT IS A SIBLING OF `local-indexing.mjs`, NOT A SECTION OF IT, and its collaborators are injected:
// core supplies the existing project-directory resolver and the degrade reporter, so knowledge
// imports neither. Construction performs no I/O; a disabled source is never read at all.

export const AUTO_MEMORY_SOURCE = "claude-auto-memory";
export const AUTO_MEMORY_SOURCES = Object.freeze([AUTO_MEMORY_SOURCE]);
// The namespaced item every adapter record carries (ADR-002): it is non-numeric, so a work item's
// `--item NN` filter never matches it, and it is what the resolver's adapter branch keys off.
export const AUTO_MEMORY_ITEM = `operator:${AUTO_MEMORY_SOURCE}`;
export const AUTO_MEMORY_OWNER = "operator";
// ADR-002: the operator-approved fixed mapping — both admitted types are `near-miss`.
const AUTO_MEMORY_KIND = "near-miss";
export const AUTO_MEMORY_TYPES = Object.freeze(["feedback", "project"]);
export const SOURCES_CONFIG_PATH = ["memory", "sources"].join(".");

const INDEX_FILE = "MEMORY.md";
// Bounds: an entry larger than this is diagnosed and skipped, and a build reports at most this many
// diagnostics (then one summary), so a hostile or enormous folder cannot flood the degrade channel.
const MAX_ENTRY_BYTES = 256 * 1024;
const MAX_DIAGNOSTICS = 20;

// ------------------------------------------------------------ configuration ----

// memory.sources → the validated list of enabled sources. Absent is [] (today's behaviour); anything
// else that is not a duplicate-free array of admitted names is a configuration error.
export function resolveMemorySources(memory = {}) {
  const declared = memory?.sources;
  if (declared === undefined) return [];
  const refuse = (message, at = SOURCES_CONFIG_PATH) => {
    const error = commandError(message, "invalid-memory-sources", 400);
    error.path = at;
    throw error;
  };
  if (!Array.isArray(declared)) refuse(`memory.sources must be an array of source names. Supported: ${AUTO_MEMORY_SOURCES.join(", ")}.`);
  declared.forEach((entry, index) => {
    if (typeof entry !== "string" || !AUTO_MEMORY_SOURCES.includes(entry)) refuse(`Unsupported memory source ${JSON.stringify(entry)}. Supported: ${AUTO_MEMORY_SOURCES.join(", ")}.`, `${SOURCES_CONFIG_PATH}.${index}`);
  });
  if (new Set(declared).size !== declared.length) refuse("memory.sources must not repeat a source.");
  return [...declared];
}

export function autoMemoryEnabled(memory) {
  return resolveMemorySources(memory).includes(AUTO_MEMORY_SOURCE);
}

// --------------------------------------------------------------- the parser ----

class EntryProblem extends Error {
  constructor(category) {
    super(category);
    this.category = category;
  }
}

const KEY_RE = /^([A-Za-z_][A-Za-z0-9_-]*):(?:[ \t]+(.*))?$/;

// One YAML scalar of the measured subset: plain, 'single-quoted' or "double-quoted". A flow or block
// collection, an anchor, a tag or an unterminated quote is a malformed value — diagnosed, never guessed.
function parseScalar(raw, { stringOnly = false } = {}) {
  const value = (raw ?? "").trim();
  if (value === "") return "";
  const first = value[0];
  if (first === '"') {
    let out = "";
    for (let i = 1; i < value.length; i += 1) {
      const ch = value[i];
      if (ch === "\\") {
        const next = value[i + 1];
        if (next === undefined) throw new EntryProblem("malformed-value");
        out += { n: "\n", t: "\t", r: "\r", '"': '"', "\\": "\\", "/": "/", 0: "\0" }[next] ?? next;
        i += 1;
      } else if (ch === '"') {
        if (value.slice(i + 1).replace(/^\s*(#.*)?$/, "") !== "") throw new EntryProblem("malformed-value");
        return out;
      } else out += ch;
    }
    throw new EntryProblem("malformed-value");
  }
  if (first === "'") {
    let out = "";
    for (let i = 1; i < value.length; i += 1) {
      const ch = value[i];
      if (ch === "'") {
        if (value[i + 1] === "'") {
          out += "'";
          i += 1;
        } else {
          if (value.slice(i + 1).replace(/^\s*(#.*)?$/, "") !== "") throw new EntryProblem("malformed-value");
          return out;
        }
      } else out += ch;
    }
    throw new EntryProblem("malformed-value");
  }
  if (/^[[{|>&*!%@`]/.test(value)) throw new EntryProblem("malformed-value");
  const plain = value.replace(/\s+#.*$/, "").trim();
  if (stringOnly && /^(?:~|null|true|false|[-+]?(?:\d[\d_]*)(?:\.\d+)?(?:e[-+]?\d+)?|0x[0-9a-f]+)$/i.test(plain)) throw new EntryProblem("malformed-value");
  return plain;
}

// Read the leading frontmatter block of one entry. `null` when the file does not open one (such a file
// — MEMORY.md, a note — is simply not an entry); throws EntryProblem when it opens one it never closes.
function readFrontmatter(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0].trimEnd() !== "---") return null;
  const close = lines.findIndex((line, index) => index > 0 && /^(?:---|\.\.\.)\s*$/.test(line));
  if (close < 0) throw new EntryProblem("unterminated-frontmatter");
  return { front: lines.slice(1, close), body: lines.slice(close + 1) };
}

// parseAutoMemoryEntry(text, filename) → null (not an admitted entry) | the lesson fields. Throws an
// EntryProblem for an entry that is admitted-shaped but unusable. Pure: no I/O, no clock.
export function parseAutoMemoryEntry(text, filename) {
  const block = readFrontmatter(String(text));
  if (block === null) return null;
  const seen = new Set();
  const once = (key) => {
    if (seen.has(key)) throw new EntryProblem("duplicate-key");
    seen.add(key);
  };
  let name = "";
  let description = "";
  let type = null;
  let inMetadata = false;
  let nestedIndent = null;
  for (const line of block.front) {
    if (/^\s*(?:#.*)?$/.test(line)) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      inMetadata = false;
      nestedIndent = null;
      const match = line.match(KEY_RE);
      if (!match) continue;
      const [, key, value] = match;
      if (key === "name") {
        once("name");
        name = parseScalar(value);
      } else if (key === "description") {
        once("description");
        description = parseScalar(value);
      } else if (key === "metadata") {
        once("metadata");
        if ((value ?? "").trim() !== "" && !/^#/.test(value.trim())) throw new EntryProblem("malformed-value");
        inMetadata = true;
      }
      continue;
    }
    if (!inMetadata) continue;
    nestedIndent ??= indent;
    if (indent !== nestedIndent) continue;
    const match = line.trim().match(KEY_RE);
    if (match && match[1] === "type") {
      once("metadata.type");
      type = parseScalar(match[2], { stringOnly: true });
    }
  }
  if (type === null || !AUTO_MEMORY_TYPES.includes(type)) return null;
  const body = block.body.join("\n").trim();
  const firstBodyLine = block.body.map((line) => line.trim()).find((line) => line.length > 0) ?? "";
  if (name === "" && description === "" && body === "") throw new EntryProblem("unusable-entry");
  const title = name || filename;
  const summary = description || firstBodyLine;
  return {
    type,
    title,
    summary,
    text: [title, description, body].filter(Boolean).join(" \n "),
  };
}

// ------------------------------------------------------------- the locators ----

// `<absolute path>.md:1` — the ONLY adapter locator form (ADR-003). The terminal `:1` is parsed from
// the right, so a Windows drive colon is never mistaken for it, and a `#` in a file name is literal.
export function parseAutoMemoryLocator(source) {
  const match = /^(.+\.md):1$/i.exec(String(source ?? ""));
  if (!match || !path.isAbsolute(match[1])) return null;
  return match[1];
}

export function isAutoMemoryRecord(record) {
  return record?.item === AUTO_MEMORY_ITEM;
}

// ----------------------------------------------------------------- the leaf ----

// Configured application services are supplied by core; construction performs no I/O.
//   memoryDirFor({ projectRoot, env }) → the selected project's auto-memory directory (core wires the
//     existing `claudeProjectsDir`, so slugging and CLAUDE_CONFIG_DIR have their one home);
//   reportDegrade(code, error, extra) → the existing degrade channel;
//   fs → the three reads, injectable so a permission failure is testable on every platform.
export function createClaudeAutoMemory({ memoryDirFor, reportDegrade, fs = { readdir, readFile } }) {
  function memoryRootFor({ projectRoot, env = process.env }) {
    return path.resolve(memoryDirFor({ projectRoot, env }));
  }

  async function autoMemoryRecords({ projectRoot, env = process.env }) {
    if (!projectRoot) return [];
    const root = memoryRootFor({ projectRoot, env });
    let dirents;
    try {
      dirents = await fs.readdir(root, { withFileTypes: true });
    } catch (error) {
      // An absent folder is the ordinary "no auto-memory on this node"; anything else is visible.
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") reportDegrade("memory-auto-memory-unreadable", new Error(`claude-auto-memory source is unreadable (${error?.code ?? "error"}); its entries were not indexed`), { path: root, key: root, category: "unreadable-directory" });
      return [];
    }
    const names = dirents
      .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name) && entry.name !== INDEX_FILE)
      .map((entry) => entry.name)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const records = [];
    let reported = 0;
    let suppressed = 0;
    const diagnose = (file, category) => {
      if (reported >= MAX_DIAGNOSTICS) {
        suppressed += 1;
        return;
      }
      reported += 1;
      // The file name and the failure category only — never the entry's body or the underlying error text.
      reportDegrade("memory-auto-memory-entry", new Error(`claude-auto-memory entry "${file}" was skipped: ${category}`), { path: path.join(root, file), key: `${root}:${file}`, file, category });
    };
    for (const file of names) {
      let text;
      try {
        text = await fs.readFile(path.join(root, file), "utf8");
      } catch {
        diagnose(file, "unreadable-entry");
        continue;
      }
      if (Buffer.byteLength(text) > MAX_ENTRY_BYTES) {
        diagnose(file, "entry-too-large");
        continue;
      }
      let parsed;
      try {
        parsed = parseAutoMemoryEntry(text, file);
      } catch (error) {
        if (!(error instanceof EntryProblem)) throw error;
        diagnose(file, error.category);
        continue;
      }
      if (parsed === null) continue;
      records.push({
        recordType: "lesson",
        id: file,
        item: AUTO_MEMORY_ITEM,
        itemSlug: AUTO_MEMORY_ITEM,
        title: parsed.title,
        area: "",
        stage: "",
        kind: AUTO_MEMORY_KIND,
        owner: AUTO_MEMORY_OWNER,
        status: "",
        tags: [parsed.type],
        summary: parsed.summary,
        text: parsed.text,
        source: `${path.join(root, file)}:1`,
      });
    }
    if (suppressed > 0) reportDegrade("memory-auto-memory-entry", new Error(`claude-auto-memory: ${suppressed} further entry diagnostics were suppressed`), { path: root, key: `${root}:suppressed`, category: "diagnostics-suppressed", suppressed });
    return records;
  }

  return { memoryRootFor, autoMemoryRecords };
}
