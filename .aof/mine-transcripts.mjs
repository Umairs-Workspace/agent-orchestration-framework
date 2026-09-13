#!/usr/bin/env node
// Standalone transcript miner — no aof imports, no run records, no attribution JOIN.
//
// v2: reads the REAL layout, the one work-observe.mjs:750 uses —
//   <projects>/<project-slug>/<sessionId>.jsonl              the orchestrator thread
//   <projects>/<project-slug>/<sessionId>/subagents/agent-*.jsonl   one file per agent run
//   <projects>/<project-slug>/<sessionId>/subagents/agent-*.meta.json  agentType + description
// v1 read only the top-level session files, which is why it reported 0 spawns.
//
// `aof work observe` resolves an agent run to a work item by joining on the run
// record's sessionId. Milestones 63 and 361 have no `runs/` directory at all, so the
// index is empty and every session lands in `unattributedAgentRuns`. This reports the
// spend by time window instead, which needs no run record to exist.
//
// Usage:
//   node .aof/mine-transcripts.mjs --match aof --from 2026-09-01 --to 2026-09-03 --out .aof/mine-63.json
//
// --from / --to are inclusive local dates. --match filters project dirs by substring.
// Read-only.

import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] != null ? argv[i + 1] : fallback;
};

const projectsDir = arg("projects", path.join(os.homedir(), ".claude", "projects"));
const match = arg("match", "");
const from = arg("from") ? new Date(`${arg("from")}T00:00:00`) : new Date(0);
const to = arg("to") ? new Date(`${arg("to")}T23:59:59.999`) : new Date(8.64e15);
const outPath = arg("out", ".aof/transcript-mine.json");
const gapMs = Number(arg("gap", "5")) * 60 * 1000;

const zero = () => ({ runs: 0, entries: 0, output: 0, input: 0, cacheCreate: 0, cacheRead: 0 });
const add = (a, b) => { for (const k of Object.keys(a)) a[k] += b[k] ?? 0; return a; };
const ratio = (b) => (b.output > 0 ? Number(((b.input + b.cacheCreate + b.cacheRead) / b.output).toFixed(1)) : null);

const main = zero();
const sub = zero();
const byRole = new Map();
const byModel = new Map();
const runs = [];
const stamps = [];
let sessionCount = 0;

async function scan(file) {
  const seen = zero();
  const models = new Set();
  const times = [];
  let stream;
  try {
    stream = readline.createInterface({
      input: fs.createReadStream(file, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
  } catch { return null; }
  for await (const line of stream) {
    if (line.trim() === "") continue;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    const when = row?.timestamp ? new Date(row.timestamp) : null;
    if (when == null || Number.isNaN(when.getTime()) || when < from || when > to) continue;
    times.push(when.getTime());
    const usage = row?.message?.usage;
    if (usage == null) continue;
    if (row?.message?.model) models.add(row.message.model);
    const one = {
      runs: 0,
      entries: 1,
      output: usage.output_tokens ?? 0,
      input: usage.input_tokens ?? 0,
      cacheCreate: usage.cache_creation_input_tokens ?? 0,
      cacheRead: usage.cache_read_input_tokens ?? 0,
    };
    add(seen, one);
    stamps.push(when.getTime());
    const model = row.message.model ?? "unknown";
    if (!byModel.has(model)) byModel.set(model, zero());
    add(byModel.get(model), one);
  }
  if (times.length === 0) return null;
  times.sort((a, b) => a - b);
  return { ...seen, models: [...models], firstMs: times[0], lastMs: times.at(-1) };
}

const slugs = await fsp.readdir(projectsDir, { withFileTypes: true }).catch(() => []);
if (slugs.length === 0) { console.error(`No project directories under ${projectsDir}`); process.exit(1); }

for (const slug of slugs) {
  if (!slug.isDirectory()) continue;
  if (match !== "" && !slug.name.includes(match)) continue;
  const slugDir = path.join(projectsDir, slug.name);

  for (const entry of await fsp.readdir(slugDir, { withFileTypes: true }).catch(() => [])) {
    // the orchestrator thread
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      const seen = await scan(path.join(slugDir, entry.name));
      if (seen != null) { add(main, seen); sessionCount += 1; }
      continue;
    }
    if (!entry.isDirectory()) continue;

    // one file per agent run
    const subDir = path.join(slugDir, entry.name, "subagents");
    const files = await fsp.readdir(subDir).catch(() => []);
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      const seen = await scan(path.join(subDir, f));
      if (seen == null) continue;
      let meta = {};
      try { meta = JSON.parse(await fsp.readFile(path.join(subDir, f.replace(/\.jsonl$/, ".meta.json")), "utf8")); } catch {}
      const role = meta.agentType || "unknown";
      seen.runs = 1;
      add(sub, seen);
      if (!byRole.has(role)) byRole.set(role, zero());
      add(byRole.get(role), seen);
      runs.push({
        role,
        session: entry.name,
        id: f.replace(/^agent-/, "").replace(/\.jsonl$/, "").slice(0, 8),
        description: String(meta.description || "").slice(0, 90),
        model: seen.models.join(","),
        output: seen.output,
        cacheCreate: seen.cacheCreate,
        cacheRead: seen.cacheRead,
        entries: seen.entries,
        wallMs: seen.lastMs - seen.firstMs,
      });
    }
  }
}

stamps.sort((a, b) => a - b);
const spanMs = stamps.length > 1 ? stamps.at(-1) - stamps[0] : 0;
let activeMs = 0;
for (let i = 1; i < stamps.length; i += 1) {
  const gap = stamps[i] - stamps[i - 1];
  if (gap <= gapMs) activeMs += gap;
}

const perSpawn = (b) => (b.runs > 0 ? Math.round(b.cacheCreate / b.runs) : null);
const result = {
  projectsDir, match,
  window: { from: from.toISOString(), to: to.toISOString() },
  sessionCount,
  agentRuns: sub.runs,
  spanMs, activeMs, idleMs: spanMs - activeMs,
  orchestrator: { ...main, inToOut: ratio(main) },
  subagents: { ...sub, inToOut: ratio(sub), cacheCreatePerRun: perSpawn(sub), outputPerRun: sub.runs ? Math.round(sub.output / sub.runs) : null },
  byRole: Object.fromEntries([...byRole].sort((a, b) => b[1].cacheCreate - a[1].cacheCreate)
    .map(([r, b]) => [r, { ...b, inToOut: ratio(b), cacheCreatePerRun: perSpawn(b) }])),
  byModel: Object.fromEntries([...byModel].map(([m, b]) => [m, { ...b, inToOut: ratio(b) }])),
  runs: runs.sort((a, b) => b.cacheCreate - a.cacheCreate),
};

await fsp.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
await fsp.writeFile(path.resolve(outPath), `${JSON.stringify(result, null, 2)}\n`, "utf8");

const n = (v) => Number(v).toLocaleString("en-US");
const hms = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`; };
console.log(`window        ${arg("from") ?? "(all)"} .. ${arg("to") ?? "(all)"}   projects match "${match || "*"}"`);
console.log(`sessions      ${sessionCount}   agent runs ${sub.runs}`);
console.log(`span          ${hms(spanMs)}   active ${hms(activeMs)}   idle ${hms(spanMs - activeMs)}`);
console.log(`orchestrator  out ${n(main.output)}  cache-create ${n(main.cacheCreate)}  cache-read ${n(main.cacheRead)}  in:out ${ratio(main) ?? "-"}`);
console.log(`subagents     out ${n(sub.output)}  cache-create ${n(sub.cacheCreate)}  cache-read ${n(sub.cacheRead)}  in:out ${ratio(sub) ?? "-"}`);
if (sub.runs > 0) console.log(`              per run: cache-create ${n(perSpawn(sub))}  output ${n(Math.round(sub.output / sub.runs))}`);
for (const [role, b] of [...byRole].sort((a, b) => b[1].cacheCreate - a[1].cacheCreate)) {
  console.log(`  role ${role.padEnd(20)} runs ${String(b.runs).padStart(3)}  out ${n(b.output).padStart(10)}  cache-create ${n(b.cacheCreate).padStart(12)}  per-run ${n(perSpawn(b))}`);
}
console.log(`\nwrote ${outPath}`);
