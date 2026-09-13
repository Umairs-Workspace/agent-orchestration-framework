#!/usr/bin/env node
// Where does the wall-clock actually go? Pairs every tool_use with its tool_result
// and reports the wait, classified. Read-only, no aof imports.
//
//   node .aof/mine-toolwait.mjs --match aof --from 2026-09-01 --to 2026-09-03 --out .aof/tools-63.json
//
// Reads the same layout as mine-transcripts.mjs:
//   <projects>/<slug>/<sessionId>.jsonl                            orchestrator
//   <projects>/<slug>/<sessionId>/subagents/agent-*.jsonl          one per agent run

import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : d; };
const projectsDir = arg("projects", path.join(os.homedir(), ".claude", "projects"));
const match = arg("match", "");
const from = arg("from") ? new Date(`${arg("from")}T00:00:00`) : new Date(0);
const to = arg("to") ? new Date(`${arg("to")}T23:59:59.999`) : new Date(8.64e15);
const outPath = arg("out", ".aof/toolwait.json");
const topN = Number(arg("top", "25"));

// Classification is deliberately coarse and ordered: the first match wins.
const CLASSES = [
  ["test", /\b(vitest|jest|playwright|pytest|node\s+--test|npm\s+(run\s+)?test|pnpm\s+(run\s+)?test|yarn\s+test|scripts\/test\.mjs|test\.mjs|--test-name-pattern|cucumber)\b/i],
  ["typecheck-lint", /\b(tsc|eslint|biome|prettier|typecheck|type-check|lint)\b/i],
  ["build", /\b(npm\s+run\s+build|pnpm\s+build|vite\s+build|webpack|install-local|npm\s+(ci|install)|cargo\s+build)\b/i],
  ["git", /^\s*git\b|\bgh\s+(pr|api|run)\b/i],
  ["aof", /\baof\b|\bwork\s+(next|dispatch|status|validate|doctor)\b/i],
  ["search-read", /\b(rg|grep|find|ls|cat|sed|head|tail|wc)\b/i],
];
const classify = (cmd) => {
  for (const [name, re] of CLASSES) if (re.test(cmd)) return name;
  return "other";
};

const bucket = () => ({ calls: 0, ms: 0, max: 0, samples: [] });
const totals = new Map();
const byCommand = new Map();
const perFile = [];
let pairedCalls = 0, unpaired = 0, spanFirst = null, spanLast = null;

const contentOf = (row) => {
  const c = row?.message?.content;
  return Array.isArray(c) ? c : [];
};

async function scan(file, kind, label) {
  const pending = new Map();
  const local = { calls: 0, ms: 0, test: 0, testCalls: 0, first: null, last: null };
  let stream;
  try {
    stream = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  } catch { return; }
  for await (const line of stream) {
    if (line.trim() === "") continue;
    let row; try { row = JSON.parse(line); } catch { continue; }
    const when = row?.timestamp ? new Date(row.timestamp) : null;
    if (when == null || Number.isNaN(when.getTime()) || when < from || when > to) continue;
    const ts = when.getTime();
    if (local.first == null || ts < local.first) local.first = ts;
    if (local.last == null || ts > local.last) local.last = ts;
    if (spanFirst == null || ts < spanFirst) spanFirst = ts;
    if (spanLast == null || ts > spanLast) spanLast = ts;

    for (const part of contentOf(row)) {
      if (part?.type === "tool_use" && part?.id) {
        const cmd = typeof part?.input?.command === "string"
          ? part.input.command
          : `${part.name ?? "tool"}${part?.input?.file_path ? ` ${part.input.file_path}` : ""}`;
        pending.set(part.id, { ts, name: part.name ?? "tool", cmd });
      } else if (part?.type === "tool_result" && part?.tool_use_id) {
        const open = pending.get(part.tool_use_id);
        if (open == null) { unpaired += 1; continue; }
        pending.delete(part.tool_use_id);
        const ms = Math.max(0, ts - open.ts);
        pairedCalls += 1;
        local.calls += 1; local.ms += ms;

        const cls = open.name === "Bash" ? classify(open.cmd) : `tool:${open.name}`;
        if (!totals.has(cls)) totals.set(cls, bucket());
        const b = totals.get(cls);
        b.calls += 1; b.ms += ms; b.max = Math.max(b.max, ms);
        if (b.samples.length < 5 && ms > 30000) b.samples.push({ ms, cmd: open.cmd.slice(0, 120) });

        if (cls === "test") {
          local.test += ms; local.testCalls += 1;
          const key = open.cmd.replace(/\s+/g, " ").trim().slice(0, 110);
          if (!byCommand.has(key)) byCommand.set(key, bucket());
          const c = byCommand.get(key);
          c.calls += 1; c.ms += ms; c.max = Math.max(c.max, ms);
        }
      }
    }
  }
  unpaired += pending.size;
  if (local.calls > 0) {
    perFile.push({
      kind, label,
      wallMs: (local.last ?? 0) - (local.first ?? 0),
      toolMs: local.ms, testMs: local.test, calls: local.calls, testCalls: local.testCalls,
    });
  }
}

const slugs = await fsp.readdir(projectsDir, { withFileTypes: true }).catch(() => []);
if (slugs.length === 0) { console.error(`No project directories under ${projectsDir}`); process.exit(1); }
for (const slug of slugs) {
  if (!slug.isDirectory() || (match !== "" && !slug.name.includes(match))) continue;
  const slugDir = path.join(projectsDir, slug.name);
  for (const entry of await fsp.readdir(slugDir, { withFileTypes: true }).catch(() => [])) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      await scan(path.join(slugDir, entry.name), "orchestrator", entry.name.slice(0, 8));
      continue;
    }
    if (!entry.isDirectory()) continue;
    const subDir = path.join(slugDir, entry.name, "subagents");
    for (const f of await fsp.readdir(subDir).catch(() => [])) {
      if (!f.endsWith(".jsonl")) continue;
      let meta = {};
      try { meta = JSON.parse(await fsp.readFile(path.join(subDir, f.replace(/\.jsonl$/, ".meta.json")), "utf8")); } catch {}
      await scan(path.join(subDir, f), "agent", `${meta.agentType ?? "unknown"} · ${String(meta.description ?? "").slice(0, 50)}`);
    }
  }
}

const hms = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`; };
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
const sortedTotals = [...totals].sort((a, b) => b[1].ms - a[1].ms);
const totalToolMs = sortedTotals.reduce((s, [, b]) => s + b.ms, 0);
const test = totals.get("test") ?? bucket();
const spanMs = (spanLast ?? 0) - (spanFirst ?? 0);

const result = {
  projectsDir, match, window: { from: from.toISOString(), to: to.toISOString() },
  spanMs, pairedCalls, unpaired, totalToolMs,
  byClass: Object.fromEntries(sortedTotals.map(([k, b]) => [k, {
    calls: b.calls, ms: b.ms, meanMs: Math.round(b.ms / b.calls), maxMs: b.max, samples: b.samples,
  }])),
  testCommands: Object.fromEntries([...byCommand].sort((a, b) => b[1].ms - a[1].ms).slice(0, topN)
    .map(([k, b]) => [k, { calls: b.calls, ms: b.ms, meanMs: Math.round(b.ms / b.calls), maxMs: b.max }])),
  heaviestRuns: perFile.sort((a, b) => b.testMs - a.testMs).slice(0, 20),
};
await fsp.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
await fsp.writeFile(path.resolve(outPath), `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`window       ${arg("from") ?? "(all)"} .. ${arg("to") ?? "(all)"}   match "${match || "*"}"`);
console.log(`tool calls   ${pairedCalls} paired (${unpaired} unpaired)   total tool wait ${hms(totalToolMs)}`);
console.log(`span         ${hms(spanMs)}`);
console.log(`\nclass                 calls        wait     mean      max`);
for (const [k, b] of sortedTotals.slice(0, 12)) {
  console.log(`  ${k.padEnd(18)} ${String(b.calls).padStart(6)}  ${hms(b.ms).padStart(8)}  ${secs(b.ms / b.calls).padStart(8)}  ${secs(b.max).padStart(8)}`);
}
console.log(`\ntest share of tool wait: ${totalToolMs > 0 ? ((test.ms / totalToolMs) * 100).toFixed(1) : "0"}%   of span: ${spanMs > 0 ? ((test.ms / spanMs) * 100).toFixed(1) : "0"}%`);
console.log(`\nheaviest test commands:`);
for (const [cmd, b] of [...byCommand].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12)) {
  console.log(`  ${hms(b.ms).padStart(7)}  x${String(b.calls).padStart(3)}  mean ${secs(b.ms / b.calls).padStart(8)}  ${cmd}`);
}
console.log(`\nwrote ${outPath}`);
