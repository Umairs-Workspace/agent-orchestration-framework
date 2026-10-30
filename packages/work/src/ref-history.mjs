import path from 'node:path';
import { readFile } from 'node:fs/promises';

export const REF_HISTORY_FILE = '.renumber-history.json';
const REF = /^\d+(?:\/\d+)?$/u;

export async function readRefHistory(workDir) {
  let text;
  try { text = await readFile(path.join(workDir, REF_HISTORY_FILE), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const rows = JSON.parse(text);
  if (!Array.isArray(rows) || rows.some(row => !Number.isFinite(Date.parse(row.at)) || !Array.isArray(row.remap)
    || row.remap.some(pair => !REF.test(pair.from) || !REF.test(pair.to)))) {
    throw Object.assign(new Error('Invalid renumber history; repair it before changing item identities.'), {code:'renumber-history-invalid',status:409});
  }
  return rows;
}

// Observations keep their original bytes. Follow only migrations AFTER their capture,
// so a newly created item reusing the old number does not inherit another item's recalls.
export function remapHistoricalRef(ref, at, history = []) {
  const captured = Date.parse(at);
  if (!Number.isFinite(captured)) return ref;
  let current = ref;
  for (const row of [...history].sort((a,b) => Date.parse(a.at)-Date.parse(b.at))) {
    if (Date.parse(row.at) <= captured) continue;
    current = row.remap.find(pair => pair.from === current)?.to ?? current;
  }
  return current;
}
