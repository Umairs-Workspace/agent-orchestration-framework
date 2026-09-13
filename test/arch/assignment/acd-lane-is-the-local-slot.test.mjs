// FF-6910 / ADR-006 (2026-08-22 amendment) — local occupancy is git's
// dispatch-lane set, read before the pool/opener, with per-member coded refusal.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedParenSpan, stripComments } from "../../support/source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const sourceRoot = path.join(root, "src");
const commandPath = path.join(root, "src", "commands", "dispatch.mjs");
const policyPath = path.join(root, "src", "work", "dispatch.mjs");

async function listSourceFiles(dir = sourceRoot) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listSourceFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) files.push(full);
  }
  return files;
}

function namesPersistedLaneFact(text) {
  const words = text
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
  const namesLane = words.includes("dispatch") || words.includes("lane") || words.includes("lanes");
  const namesPersistedFact = words.some((word) => [
    "occupancy", "occupied", "holder", "holders", "slot", "slots", "counter", "count",
    "registry", "registries", "cache", "caches",
  ].includes(word));
  return namesLane && namesPersistedFact;
}

const DISK_WRITE_CALL = /\b(?:writeFile|writeFileSync|appendFile|appendFileSync|writeText|persist[A-Z][\w$]*|save[A-Z][\w$]*)\s*\(/gu;
const SQL_WRITE = /\b(?:CREATE\s+TABLE|INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|UPDATE)\b/giu;

export function persistedLaneOccupancyProblems(sources) {
  const problems = [];
  for (const { file, source } of sources) {
    const code = stripComments(source);
    const reported = new Set();
    for (const match of code.matchAll(SQL_WRITE)) {
      // Keep the semantic test attached to this SQL statement rather than combining a generic
      // UPDATE in one function with lane vocabulary elsewhere in a large module.
      const tail = code.slice(match.index);
      const statementEnd = tail.indexOf(";");
      const statement = tail.slice(0, statementEnd < 0 ? 500 : Math.min(statementEnd + 1, 500));
      if (!namesPersistedLaneFact(statement)) continue;
      const line = code.slice(0, match.index).split("\n").length;
      const key = `sql:${line}`;
      if (!reported.has(key)) problems.push(`${file}:${line}: local lane occupancy is persisted in a SQL registry/cache/counter instead of being derived from git's dispatch-lane set`);
      reported.add(key);
    }
    for (const match of code.matchAll(DISK_WRITE_CALL)) {
      const args = matchedParenSpan(code, match.index);
      if (args == null || !namesPersistedLaneFact(`${match[0]} ${args.body}`)) continue;
      const line = code.slice(0, match.index).split("\n").length;
      const key = `disk:${line}`;
      if (!reported.has(key)) problems.push(`${file}:${line}: local lane occupancy is persisted through a file-backed registry/cache/counter instead of being derived from git's dispatch-lane set`);
      reported.add(key);
    }
  }
  return problems;
}

export function laneSlotProblems(commandSource, policySource, sourceFiles = []) {
  const command = stripComments(commandSource);
  const policy = stripComments(policySource);
  const problems = [];
  const counted = command.indexOf("const admission = await inspectAdmission(");
  const pooled = command.indexOf("dispatchReadySet(");
  const opened = command.indexOf("resolveDispatchLane(");
  if (counted < 0) problems.push("the dispatch door does not inspect durable lane occupancy");
  if (pooled < 0 || counted > pooled) problems.push("the lane counted-set read does not precede the materialisation pool");
  if (opened < 0 || counted > opened) problems.push("the lane counted-set read does not precede the lane opener");
  if (!/const\s+holders\s*=\s*lanes\.filter\(dispatchLaneOccupiesSlot\)/.test(policy)) {
    problems.push("the counted set is not derived from inspectDispatchLanes through the one occupancy predicate");
  }
  if (!/state\s*===\s*["']working["']\s*\|\|\s*lane\?\.state\s*===\s*["']quiet["']/.test(policy)) {
    problems.push("working and quiet lanes are not the complete local occupied set");
  }
  if (!/code:\s*["']dispatch-capacity-full["']/.test(policy)) {
    problems.push("over-bound local members have no stable refusal code");
  }
  if (!/outcome:\s*["']refused["']/.test(command) || !/code:\s*entry\.code/.test(command)) {
    problems.push("the command does not report a refusal and its code per member");
  }
  for (const [pattern, label] of [[/openGlobalWorkProjectionStore|run-store\.mjs/, "a projection/run-store dependency"]]) {
    if (pattern.test(command) || pattern.test(policy)) problems.push(`local admission introduces ${label}`);
  }
  problems.push(...persistedLaneOccupancyProblems(sourceFiles));
  return problems;
}

export const archTests = [
  {
    name: "arch/69 FF-6910 (acd-lane-is-the-local-slot): git-reported working and quiet lanes are the only source-wide local slot registry and are counted before pool and opener",
    run: async () => {
      const files = await listSourceFiles();
      assert.ok(files.length >= 100, `the source-wide persisted-occupancy sweep is non-vacuous (${files.length} src/**/*.mjs files)`);
      assert.ok(files.includes(commandPath) && files.includes(policyPath), "the source-wide sweep includes both local dispatch homes");
      const sources = await Promise.all(files.map(async (file) => ({
        file: path.relative(root, file).replaceAll("\\", "/"),
        source: await readFile(file, "utf8"),
      })));
      const problems = laneSlotProblems(
        await readFile(commandPath, "utf8"),
        await readFile(policyPath, "utf8"),
        sources,
      );
      assert.deepEqual(problems, [], `lane-slot violations:\n  ${problems.join("\n  ")}`);
    },
  },
  {
    name: "arch/69 FF-6910 self-check: ordering, occupied-set, refusal-code and planted source-wide persistence defects each trip the guard",
    run: () => {
      const goodCommand = `const admission = await inspectAdmission(root, refs); const report = await dispatchReadySet(rows, () => resolveDispatchLane(root, ref)); return { outcome: "refused", code: entry.code };`;
      const goodPolicy = `function dispatchLaneOccupiesSlot(lane) { return lane?.state === "working" || lane?.state === "quiet"; } async function inspectDispatchLaneAdmission() { const lanes = await inspectDispatchLanes(); const holders = lanes.filter(dispatchLaneOccupiesSlot); } function plan() { return { code: "dispatch-capacity-full" }; }`;
      assert.deepEqual(laneSlotProblems(goodCommand, goodPolicy), []);
      assert.ok(laneSlotProblems("resolveDispatchLane(); const admission = await inspectAdmission(); dispatchReadySet();", goodPolicy).some((p) => p.includes("precede")));
      assert.ok(laneSlotProblems(goodCommand, goodPolicy.replace(' || lane?.state === "quiet"', "")).some((p) => p.includes("working and quiet")));
      assert.ok(laneSlotProblems(goodCommand, goodPolicy.replace("dispatch-capacity-full", "full")).some((p) => p.includes("refusal code")));
      assert.ok(laneSlotProblems(`${goodCommand} openGlobalWorkProjectionStore();`, goodPolicy).some((p) => p.includes("store dependency")));

      // The persistence leg is contextual, not a keyword grep: persistence without lane-registry
      // semantics, or lane/cache vocabulary without a persistence sink, remains clean.
      assert.deepEqual(persistedLaneOccupancyProblems([
        { file: "src/in-memory.mjs", source: "const occupiedLaneCount = lanes.filter(Boolean).length;" },
        { file: "src/settings.mjs", source: 'await writeFile(configPath, JSON.stringify({ theme: "dark" }));' },
        { file: "src/users.mjs", source: "await writeFile(userRegistryPath, JSON.stringify(users));" },
        { file: "src/report.mjs", source: "await writeFile(dispatchLaneReportPath, JSON.stringify(lanes));" },
        { file: "src/ephemeral.mjs", source: "const dispatchLaneCache = new Map();" },
      ]), []);
      const planted = persistedLaneOccupancyProblems([
        { file: "src/planted-lane-registry.mjs", source: "await writeFile(dispatchLaneRegistryPath, JSON.stringify(lanes));" },
        { file: "src/planted-lane-cache.mjs", source: "await writeText(dispatchLaneCachePath, JSON.stringify(lanes));" },
      ]);
      assert.equal(planted.length, 2, `the planted persisted lane registry and cache are each reported once\n${planted.join("\n")}`);
      assert.ok(planted.some((problem) => problem.includes("src/planted-lane-registry.mjs:1") && problem.includes("file-backed registry/cache/counter")), planted.join("\n"));
      assert.ok(planted.some((problem) => problem.includes("src/planted-lane-cache.mjs:1") && problem.includes("file-backed registry/cache/counter")), planted.join("\n"));
    },
  },
];
