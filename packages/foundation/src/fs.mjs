import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// chore 94 — the PARSE leg carries a machine code, so a caller can tell a file that is
// PRESENT but unparseable from one that is absent (whose error keeps node's own ENOENT
// from the read leg above, untouched). The word is the one config-inspect and the board
// face already speak — one vocabulary for the fact, not a third spelling of it.
export async function readJson(filePath) {
  const text = await readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    wrapped.code = "malformed-json";
    throw wrapped;
  }
}

export async function writeText(filePath, content, { dryRun = false } = {}) {
  if (dryRun) {
    return { path: filePath, action: "write" };
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  // Bound the diagnostic echo so any legal target component remains writable.
  const tempPath = path.join(path.dirname(filePath), `.tmp-${path.basename(filePath).slice(0, 20)}-${process.pid}-${Date.now()}-${randomUUID()}`);
  await writeFile(tempPath, content, "utf8");
  try {
    await renameWithRetry(tempPath, filePath);
  } catch (error) {
    // m42 wave (a) / m38-F26: a lost rename (two publishers racing, a reader
    // holding the target on Windows) used to strand the temp file forever —
    // measured live: dozens of .tmp-* orphans in presence/ + nodes/ that nothing
    // swept. The temp is reclaimed HERE, on the failure path that created it; the
    // original error still propagates (the write genuinely failed).
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
  return { path: filePath, action: "write" };
}

// writeJson(filePath, value, { dryRun }) — write a JSON document a person also edits (a project or
// global `aof.config.json`) without reformatting it. Every value that did not change is written back
// as the file's own text, byte for byte: an inline `["a", "b"]` stays inline, a block indented by
// four stays at four. Only what changed is laid out, in the file's indent unit and line ending. A
// file that is absent or not JSON is written as `JSON.stringify(value, null, 2)` plus a newline,
// which is what every config writer did before this.
export async function writeJson(filePath, value, options = {}) {
  const previous = await readFile(filePath, "utf8").catch(() => null);
  return writeText(filePath, formatJson(value, previous), options);
}

// formatJson(value, previousText) — the pure half of writeJson. The result always parses to exactly
// `value`: when the minimal edit would not (it cannot, but the check costs one parse), it falls back
// to the plain layout rather than write a document that says something else.
export function formatJson(value, previousText = null) {
  const plain = JSON.parse(JSON.stringify(value) ?? "null");
  const fresh = `${JSON.stringify(plain, null, 2)}\n`;
  if (typeof previousText !== "string") return fresh;
  let root;
  try {
    root = scanJson(previousText);
  } catch {
    return fresh;
  }
  const eol = previousText.includes("\r\n") ? "\r\n" : "\n";
  const unit = /^([ \t]+)\S/m.exec(previousText)?.[1] ?? "  ";
  const tail = /\n$/.test(previousText) ? eol : "";
  const text = layoutJson(plain, root, "", { unit, eol }) + tail;
  try {
    if (JSON.stringify(JSON.parse(text)) === JSON.stringify(plain)) return text;
  } catch {
    // A layout that does not parse is never written; the plain one is.
    return fresh;
  }
  return fresh;
}

function layoutJson(value, node, indent, style) {
  if (node != null && JSON.stringify(JSON.parse(node.text)) === JSON.stringify(value)) return node.text;
  const inner = indent + style.unit;
  if (value !== null && typeof value === "object" && !Array.isArray(value) && node?.kind === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) return "{}";
    const members = keys.map((key) => `${inner}${JSON.stringify(key)}: ${layoutJson(value[key], node.members.get(key), inner, style)}`);
    return `{${style.eol}${members.join(`,${style.eol}`)}${style.eol}${indent}}`;
  }
  if (Array.isArray(value) && node?.kind === "array") {
    if (value.length === 0) return "[]";
    // An array the file wrote on one line stays on one line while it holds only scalars.
    if (!node.text.includes("\n") && value.every((item) => item === null || typeof item !== "object")) {
      return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
    }
    const items = value.map((item, index) => `${inner}${layoutJson(item, node.items[index], inner, style)}`);
    return `[${style.eol}${items.join(`,${style.eol}`)}${style.eol}${indent}]`;
  }
  return JSON.stringify(value, null, style.unit).split("\n").join(style.eol + indent);
}

// A JSON scanner that keeps each value's source text: objects by key, arrays by index. It accepts only
// what JSON.parse accepts in structure; a scalar's own text is checked by the parse in layoutJson.
const JSON_SCALAR = /true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

function scanJson(text) {
  let at = 0;
  const space = () => { while (at < text.length && " \t\r\n".includes(text[at])) at += 1; };
  const fail = () => { throw new SyntaxError(`unexpected JSON at ${at}`); };
  const string = () => {
    const start = at;
    at += 1;
    while (at < text.length && text[at] !== "\"") at += text[at] === "\\" ? 2 : 1;
    if (at >= text.length) fail();
    at += 1;
    return JSON.parse(text.slice(start, at));
  };
  const value = () => {
    space();
    const start = at;
    if (text[at] === "{" || text[at] === "[") {
      const object = text[at] === "{";
      const close = object ? "}" : "]";
      const members = new Map();
      const items = [];
      at += 1;
      space();
      if (text[at] === close) {
        at += 1;
      } else {
        for (;;) {
          space();
          if (object) {
            if (text[at] !== "\"") fail();
            const key = string();
            space();
            if (text[at] !== ":") fail();
            at += 1;
            members.set(key, value());
          } else {
            items.push(value());
          }
          space();
          if (text[at] === ",") { at += 1; continue; }
          if (text[at] === close) { at += 1; break; }
          fail();
        }
      }
      return object ? { kind: "object", text: text.slice(start, at), members } : { kind: "array", text: text.slice(start, at), items };
    }
    if (text[at] === "\"") {
      string();
      return { kind: "scalar", text: text.slice(start, at) };
    }
    JSON_SCALAR.lastIndex = at;
    if (!JSON_SCALAR.test(text)) fail();
    at = JSON_SCALAR.lastIndex;
    return { kind: "scalar", text: text.slice(start, at) };
  };
  const root = value();
  space();
  if (at !== text.length) fail();
  return root;
}

// The caller supplies diagnostic policy; file utilities never import application logging.
export function createTempFileSweeper({ reportDegrade }) {
  // sweepStaleTempFiles(dir, { olderThanMs, now }) — m42 wave (a) / m38-F26: reclaim
  // `.tmp-*` orphans a crashed/killed process left behind (the unlink above only
  // covers a LIVE process's own failure). Age-gated so a concurrent writer's
  // in-flight temp is never swept. Absent dir → { removed: [] }, never a throw.
  async function sweepStaleTempFiles(dir, { olderThanMs = 60 * 60 * 1000, now = Date.now() } = {}) {
    const removed = [];
    let names = [];
    try {
      names = await readdir(dir);
    } catch {
      return { removed }; // absent dir: nothing to sweep
    }
    for (const name of names) {
      if (!name.startsWith(".tmp-")) continue;
      const filePath = path.join(dir, name);
      try {
        const info = await stat(filePath);
        if (now - info.mtimeMs < olderThanMs) continue;
        await unlink(filePath);
        removed.push(name);
      } catch (error) {
        // A vanished/locked entry is skipped — the next sweep retries; the sweep
        // itself must never throw out of a daemon's startup.
        reportDegrade("fs", error);
      }
    }
    return { removed };
  }
  return sweepStaleTempFiles;
}

async function renameWithRetry(source, target) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rename(source, target);
      return;
    } catch (error) {
      if (!["EACCES", "EPERM"].includes(error.code) || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}

export function normalizeId(id) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-_.]*$/i.test(id)) {
    throw new Error(`Invalid id "${id}". Use letters, numbers, dots, underscores, or hyphens.`);
  }

  return id;
}
