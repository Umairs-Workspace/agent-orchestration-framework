import { appendFileSync, mkdirSync, renameSync, statSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const DEFAULT_LOG_MAX_BYTES = 5 * 1024 * 1024;

// createJsonlLogSink(filePath, { proc, ...options }) → { path, write(entry) }. `write` appends one
// JSONL line ({ at, proc, level, code, message, … }) and rotates the file to
// `<file>.1` when it would exceed maxBytes (one previous generation is kept —
// bounded disk, no unbounded growth, no reclaim job needed).
export function createJsonlLogSink(filePath, { proc, ...options } = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_LOG_MAX_BYTES;
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  mkdirSync(path.dirname(filePath), { recursive: true });
  let size = 0;
  try {
    size = statSync(filePath).size;
  } catch {
    size = 0; // absent file — first write creates it
  }
  const write = (entry) => {
    try {
      const line = `${JSON.stringify({ at: now(), proc, ...entry })}\n`;
      if (size + line.length > maxBytes) {
        try {
          renameSync(filePath, `${filePath}.1`);
        } catch (error) {
          // Rotation losing a race (two processes, or a reader holding the file on
          // Windows) is tolerable — the append below still lands in SOME generation.
          void error;
        }
        size = 0;
      }
      appendFileSync(filePath, line, "utf8");
      size += line.length;
    } catch {
      // The sink must never crash or block the daemon (the console tee still
      // carries the event) — but this is bounded silence: one lost line, not a
      // disabled sink; the next write tries again.
    }
  };
  return { path: filePath, write };
}

// readJsonlLog(filePath, { tail, includeRotated }) → { path, entries } — the
// reader half (`aof mesh logs`). Parse-tolerant: a torn/garbage line is returned as
// { raw } rather than thrown away silently or crashing the read.
export function readJsonlLog(filePath, { tail = 200, includeRotated = true } = {}) {
  const sources = [];
  if (includeRotated && existsSync(`${filePath}.1`)) sources.push(`${filePath}.1`);
  if (existsSync(filePath)) sources.push(filePath);
  const lines = [];
  for (const source of sources) {
    lines.push(...readFileSync(source, "utf8").split("\n").filter((line) => line.length > 0));
  }
  const entries = lines.slice(-tail).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line }; // torn line: surfaced, never dropped
    }
  });
  return { path: filePath, entries };
}
