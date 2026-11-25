import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { commandError } from "@aof/contracts/error";
import { readJson, writeText } from "@aof/foundation/fs";
import { importSqliteRuntime } from "@aof/foundation/sqlite-runtime";
import { isLiveStreamRow } from "../discovery.mjs";

export function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

function canonical(data) {
  return Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
}

export function createBoardLinks(workspace, manifestPath, coordinates) {
  const key = createHash("sha256").update(JSON.stringify([manifestPath, canonical(coordinates)])).digest("hex");
  const root = path.join(workspace.projectRoot, ".aof", "board-state");
  const file = path.join(root, `${key}.json`);

  async function read() {
    let state;
    try {
      state = await readJson(file);
    } catch (error) {
      if (error.code === "ENOENT") return { version: 1, links: {} };
      throw error;
    }
    if (state?.version !== 1 || !state.links || Array.isArray(state.links) || typeof state.links !== "object") {
      throw commandError("The workspace board journal has an unsupported format.", "work-board-journal-invalid", 409);
    }
    return state;
  }

  async function claim(operation) {
    await mkdir(root, { recursive: true });
    const { DatabaseSync } = await importSqliteRuntime();
    // SQLite releases the exclusive claim on process death. Keep the journal
    // separate so each acknowledged member can reach disk during the claim.
    const db = new DatabaseSync(path.join(root, `${key}.lock.sqlite`));
    try {
      try {
        db.exec("BEGIN IMMEDIATE");
      } catch (error) {
        if (error.errcode === 5 || /database is locked/i.test(error.message)) {
          throw commandError("Another process holds this board's write claim. Retry when it finishes.", "work-board-busy", 409);
        }
        throw error;
      }
      const state = await read();
      const save = () => writeText(file, JSON.stringify(state, null, 2) + "\n");
      return await operation(state, save);
    } finally {
      db.close();
    }
  }

  return { read, claim };
}

export async function itemBoardKey(workDir, documentHome, { create = false } = {}) {
  if (!documentHome) return null;
  const candidate = path.resolve(workDir, documentHome);
  if (!inside(workDir, candidate)) throw commandError("Invalid board document home.", "work-board-home-invalid", 409);
  const file = path.join(candidate, ".aof-board-key");
  async function read() {
    const key = (await readFile(file, "utf8")).trim();
    if (!/^[0-9a-f-]{36}$/.test(key)) throw commandError("Invalid board key for " + documentHome, "work-board-key-invalid", 409);
    return key;
  }
  try {
    return await read();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (!create) return null;
    if (!inside(await realpath(workDir), await realpath(candidate))) {
      throw commandError("The document home resolves outside the work directory.", "work-board-home-invalid", 409);
    }
    const key = randomUUID();
    await writeFile(file, key + "\n", { encoding: "utf8", flag: "wx" }).catch(error => {
      if (error.code !== "EEXIST") throw error;
    });
    return read();
  }
}

export async function localBoardItems(workDir, snapshot, links) {
  const selected = new Map();
  if (Object.keys(links).length === 0) return selected;
  for (const item of snapshot.items) {
    if (item.number != null && !isLiveStreamRow(item)) continue;
    const key = await itemBoardKey(workDir, item.documentHome);
    if (key == null || !Object.hasOwn(links, key)) continue;
    if (selected.has(key)) throw commandError("The same board key occurs in multiple document homes.", "work-board-key-duplicate", 409);
    selected.set(key, item);
  }
  return selected;
}
