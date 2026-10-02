import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";

export function mintEventId(nowIso) {
  const stamp = nowIso.replace(/[-:.]/g, "");
  return `${stamp}-${randomBytes(4).toString("hex")}`;
}


export function createJournalOpener({ effectsJournalPath, importSqliteRuntime, storage }) {
function journalError(message, code, status = 500) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
async function resolveSqlite(options = {}) {
  if (options.sqlite) return options.sqlite;
  try {
    const sqlite = await importSqliteRuntime(options);
    if (typeof sqlite.DatabaseSync !== "function") throw new Error("DatabaseSync unavailable");
    return sqlite;
  } catch {
    throw journalError("The effects journal requires a supported SQLite runtime.", "sqlite-unavailable", 501);
  }
}
async function openEffectsJournal(options = {}) {
  const databasePath = effectsJournalPath(options);
  const sqlite = await resolveSqlite(options);
  await mkdir(path.dirname(databasePath), { recursive: true });
  return storage.initializeJournal({ db: new sqlite.DatabaseSync(databasePath), databasePath });
}


return { openEffectsJournal };
}
