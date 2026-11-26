// One golden step. Keep operational files in private directories created by this invocation.
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../../support/cli-spawn.mjs";
import { workStreamLanes } from "../../work-stream.lane.mjs";
import { exportStream, isBoardStore, publishSeed, saveExport, seedProject } from "./file-adapter.mjs";

const [family, id] = process.argv.slice(2);
const scenario = workStreamLanes.find(lane => lane.id === family)?.scenarios.find(candidate => candidate.id === id);
if (!scenario) throw Error(`unknown work-stream case ${family}/${id}`);
const { entry, format } = scenario;
// 209/05 — archiving is a local file mode operation: over a board every archive case is refused
// as local-only and leaves the stream as it found it.
const boardArchive = isBoardStore(process.env.AOF_WORK_STREAM_STORE) && entry.argv[0] === "archive";
const mode = boardArchive ? "refuse" : entry.mode;
const project = process.cwd();
const subject = path.join(project, "subject");
const home = path.join(process.env.AOF_GLOBAL_HOME, "subject");
const cli = fileURLToPath(new URL("../../../../packages/core/bin/aof.mjs", import.meta.url));
function runCli(argv) {
  return spawnCliSync(process.execPath, ["--import", new URL("./clock.mjs", import.meta.url).href, cli, ...argv], {
    cwd: subject, windowsHide: true, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1", TZ: "UTC" },
  });
}
mkdirSync(subject);
try {
  mkdirSync(home);
  try {
    const root = seedProject(subject, { ...entry, store: process.env.AOF_WORK_STREAM_STORE });
    // 209/05 — a board-backed case starts from the seed published to its board, through the
    // public publication verb, exactly as a completed refinement would leave it.
    if (isBoardStore(process.env.AOF_WORK_STREAM_STORE)) await publishSeed(subject, home);
    const before = exportStream(root);
    saveExport(project, "before", before);
    const argv = ["work", ...entry.argv, ...(format === "json" ? ["--json"] : [])];
    let exit = null;
    if (mode !== "seed") {
      const result = runCli(argv);
      exit = result.status;
      const expected = boardArchive ? 1 : entry.exit?.[format] ?? (mode === "refuse" ? 1 : 0);
      assert.equal(exit, expected, `${family}/${id} ${argv.join(" ")}: ${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
      if (mode !== "write") {
        writeFileSync(path.join(project, "stdout"), result.stdout);
        writeFileSync(path.join(project, "stderr"), result.stderr);
      }
      if (format === "json") {
        const json = JSON.parse(result.stdout);
        if (boardArchive) assert.equal(json.code, "work-board-archive-local-only", id);
        else if (entry.code) assert.equal(json.code, entry.code, id);
        for (const phrase of boardArchive ? [] : entry.contains ?? []) assert.ok(JSON.stringify(json).includes(phrase), `${id} missing ${phrase}: ${result.stdout}`);
      }
    }
    const after = exportStream(root);
    if (mode !== "write") assert.deepEqual(after, before, `${id} changed the stream`);
    else assert.notDeepEqual(after, before, `${id} wrote nothing`);
    saveExport(project, "stream", after);
    for (const [index, query] of (boardArchive ? [] : entry.observe ?? []).entries()) {
      const argv = ["work", ...query.split(" "), "--json"];
      const reply = runCli(argv);
      assert.equal(reply.status, 0, `${query}: ${reply.stderr}`);
      const rows = JSON.parse(reply.stdout);
      assert.ok(Array.isArray(rows) && rows.length > 0, `${query} returned no rows`);
      const dir = path.join(project, `observation-${index + 1}`);
      mkdirSync(dir);
      writeFileSync(path.join(dir, "command.json"), JSON.stringify({ argv, exit: reply.status }, null, 2) + "\n");
      writeFileSync(path.join(dir, "stdout"), reply.stdout);
      writeFileSync(path.join(dir, "stderr"), reply.stderr);
      assert.deepEqual(exportStream(root), after, `${query} changed the stream`);
    }
    console.log(JSON.stringify({ argv: mode === "seed" ? [] : argv, exit }));
  } finally { rmSync(home, { recursive: true, force: true }); }
} finally { rmSync(subject, { recursive: true, force: true }); }
