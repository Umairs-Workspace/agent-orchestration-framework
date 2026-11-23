// One golden step. Keep operational files in private directories created by this invocation.
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../../../support/cli-spawn.mjs";
import { workStreamLanes } from "../../work-stream.lane.mjs";
import { exportStream, saveExport, seedProject } from "./file-adapter.mjs";

const [family, id] = process.argv.slice(2);
const scenario = workStreamLanes.find(lane => lane.id === family)?.scenarios.find(candidate => candidate.id === id);
if (!scenario) throw Error(`unknown work-stream case ${family}/${id}`);
const { entry, format } = scenario;
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
    const root = seedProject(subject, entry);
    const before = exportStream(root);
    saveExport(project, "before", before);
    const argv = ["work", ...entry.argv, ...(format === "json" ? ["--json"] : [])];
    let exit = null;
    if (entry.mode !== "seed") {
      const result = runCli(argv);
      exit = result.status;
      const expected = entry.exit?.[format] ?? (entry.mode === "refuse" ? 1 : 0);
      assert.equal(exit, expected, `${family}/${id} ${argv.join(" ")}: ${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
      if (entry.mode !== "write") {
        writeFileSync(path.join(project, "stdout"), result.stdout);
        writeFileSync(path.join(project, "stderr"), result.stderr);
      }
      if (format === "json") {
        const json = JSON.parse(result.stdout);
        if (entry.code) assert.equal(json.code, entry.code, id);
        for (const phrase of entry.contains ?? []) assert.ok(JSON.stringify(json).includes(phrase), `${id} missing ${phrase}: ${result.stdout}`);
      }
    }
    const after = exportStream(root);
    if (entry.mode !== "write") assert.deepEqual(after, before, `${id} changed the stream`);
    else assert.notDeepEqual(after, before, `${id} wrote nothing`);
    saveExport(project, "stream", after);
    for (const [index, query] of (entry.observe ?? []).entries()) {
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
    console.log(JSON.stringify({ argv: entry.mode === "seed" ? [] : argv, exit }));
  } finally { rmSync(home, { recursive: true, force: true }); }
} finally { rmSync(subject, { recursive: true, force: true }); }
