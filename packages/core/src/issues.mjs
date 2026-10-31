// Local issue records, independent of project work and mesh stores (183/ADR-001).
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, link, unlink, readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { defaultGlobalWorkspaceDir } from "./paths.mjs";

const ID = /^iss-[a-f0-9]{12}$/u;
const directory = (ctx) => path.join(defaultGlobalWorkspaceDir(ctx.env ?? process.env), "issues");
export function issueError(message, code = "issues-invalid-input") {
  return Object.assign(new Error(message), { code });
}
function assertId(id) {
  if (typeof id !== "string" || !ID.test(id)) throw issueError("Supply an issue ID from aof issues list (iss- followed by 12 lowercase hex digits).");
}
export async function logIssue(input, ctx = {}) {
  if (typeof input?.summary !== "string" || !input.summary.trim()) throw issueError("Supply a non-empty summary: aof issues log <summary> [--details <text>].");
  if (input.details !== undefined && typeof input.details !== "string") throw issueError("Issue details must be text.");
  const dir = directory(ctx);
  const record = { version: 1, id: "iss-" + randomUUID().replaceAll("-", "").slice(0, 12), summary: input.summary.trim(), createdAt: new Date().toISOString(), cwd: path.resolve(ctx.cwd ?? process.cwd()) };
  if (input.details !== undefined) record.details = input.details;
  await mkdir(dir, { recursive: true });
  const pending = path.join(dir, "." + randomUUID() + ".pending");
  let ownsPending = false;
  try {
    // Create exclusively before writing so cleanup never removes another writer's file.
    await writeFile(pending, "", { flag: "wx", mode: 0o600 });
    ownsPending = true;
    await writeFile(pending, JSON.stringify(record, null, 2) + "\n", { flag: "w", mode: 0o600 });
    // link publishes a fully written record atomically, and refuses an existing ID.
    // A UUID collision is a reported error; no existing issue is ever overwritten.
    await link(pending, path.join(dir, record.id + ".json"));
  } finally {
    if (ownsPending) await unlink(pending).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
  return record;
}
export async function listIssues(ctx = {}) {
  const dir = directory(ctx);
  let names;
  try { names = await readdir(dir); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const records = [];
  for (const name of names) {
    if (!name.endsWith(".json") || !ID.test(name.slice(0, -5))) continue;
    const file = path.join(dir, name);
    try {
      if (!(await lstat(file)).isFile()) throw new Error("expected a regular file");
      const record = JSON.parse(await readFile(file, "utf8"));
      if (record?.version !== 1 || record.id !== name.slice(0, -5) || typeof record.summary !== "string" || !record.summary.trim() || typeof record.createdAt !== "string" || !Number.isFinite(Date.parse(record.createdAt)) || typeof record.cwd !== "string" || (record.details !== undefined && typeof record.details !== "string")) {
        throw new Error("invalid issue record");
      }
      records.push(record);
    } catch (error) {
      if (error.code === "ENOENT") continue; // a concurrent remove won the race
      throw issueError("Cannot read issue " + file + ": " + error.message, "issues-corrupt-record");
    }
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
export async function removeIssue(id, ctx = {}) {
  assertId(id);
  try { await unlink(path.join(directory(ctx), id + ".json")); }
  catch (error) {
    if (error.code === "ENOENT") throw issueError("Issue " + id + " was not found.", "issues-not-found");
    throw error;
  }
  return { id, removed: true };
}
