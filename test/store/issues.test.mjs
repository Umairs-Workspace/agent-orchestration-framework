import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnCliSync } from "../support/cli-spawn.mjs";

// 183/tasks/00_log-list.feature and 183/tasks/01_remove.feature.
const cliPath = fileURLToPath(new URL("../../packages/core/bin/aof.mjs", import.meta.url));
const store = () => import("../../packages/core/src/issues.mjs");
async function fixture(run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-issues-"));
  const home = path.join(dir, "home");
  const cwd = path.join(dir, "first");
  const other = path.join(dir, "second");
  await mkdir(cwd); await mkdir(other);
  const env = { ...process.env, AOF_GLOBAL_HOME: home, NODE_NO_WARNINGS: "1" };
  const cli = (args, location = cwd) => spawnCliSync(process.execPath, [cliPath, "issues", ...args], { cwd: location, env, encoding: "utf8" });
  try { await run({ home, cwd, other, env, cli }); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
function json(result, status = 0) {
  assert.equal(result.status, status, result.stdout + result.stderr);
  return JSON.parse(result.stdout);
}
export const issuesTests = [
  { name: "183/00 · real CLI logs and lists outside a workspace across directories", run: () => fixture(async ({ cli, cwd, other, home }) => {
    const issue = json(cli(["log", "First problem", "--details", "Steps\nExpected result", "--json"]));
    assert.match(issue.id, /^iss-[a-f0-9]{12}$/);
    assert.equal(issue.summary, "First problem"); assert.equal(issue.details, "Steps\nExpected result");
    assert.equal(issue.cwd.toLowerCase(), cwd.toLowerCase()); assert.ok(Number.isFinite(Date.parse(issue.createdAt)));
    assert.deepEqual(json(cli(["list", "--json"], other)), [issue]);
    assert.deepEqual(JSON.parse(await readFile(path.join(home, "issues", issue.id + ".json"), "utf8")), issue);
    const human = cli(["list"]); assert.equal(human.status, 0); assert.ok(human.stdout.includes(issue.id)); assert.ok(human.stdout.includes(issue.summary));
  }) },
  { name: "183/00 · empty list and invalid input do not create a store", run: () => fixture(async ({ cli, home }) => {
    assert.deepEqual(json(cli(["list", "--json"])), []);
    assert.match(cli(["list"]).stdout, /No issues/);
    for (const args of [["log"], ["log", "   "], ["log", "one", "two"], ["list", "extra"]]) {
      assert.equal(json(cli([...args, "--json"]), 1).code, "issues-invalid-input");
    }
    await assert.rejects(access(path.join(home, "issues")), { code: "ENOENT" });
  }) },
  { name: "183/00 · concurrent logs preserve all records and readers see complete JSON", run: () => fixture(async ({ env, cwd, home }) => {
    const { logIssue, listIssues } = await store();
    const ctx = { env, cwd };
    const writes = Array.from({ length: 40 }, (_, i) => logIssue({ summary: "Issue " + i }, ctx));
    await Promise.all(Array.from({ length: 10 }, () => listIssues(ctx)));
    const written = await Promise.all(writes);
    const listed = await listIssues(ctx);
    assert.equal(new Set(written.map(i => i.id)).size, 40);
    assert.equal(listed.length, 40);
    assert.deepEqual(new Set(listed.map(i => i.id)), new Set(written.map(i => i.id)));
    assert.deepEqual(listed, [...listed].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)));
    await writeFile(path.join(home, "issues", ".interrupted.pending"), "{");
    assert.deepEqual(await listIssues(ctx), listed);
    assert.equal((await readdir(path.join(home, "issues"))).filter(n => n.endsWith(".json")).length, 40);
  }) },
  { name: "183/00 · corrupt saved issue is reported without overwriting evidence", run: () => fixture(async ({ env, cwd, cli, home }) => {
    const { logIssue } = await store();
    const issue = await logIssue({ summary: "Corrupt me" }, { env, cwd });
    const file = path.join(home, "issues", issue.id + ".json");
    await writeFile(file, "{");
    const error = json(cli(["list", "--json"]), 1);
    assert.equal(error.code, "issues-corrupt-record"); assert.ok(error.error.includes(issue.id));
    assert.equal(await readFile(file, "utf8"), "{");
    json(cli(["remove", issue.id, "--json"]));
    assert.deepEqual(json(cli(["list", "--json"])), []);
  }) },
  { name: "183/01 · CLI removes exactly one known issue", run: () => fixture(async ({ cli }) => {
    const first = json(cli(["log", "First", "--json"]));
    const second = json(cli(["log", "Second", "--json"]));
    assert.deepEqual(json(cli(["remove", first.id, "--json"])), { id: first.id, removed: true });
    assert.deepEqual(json(cli(["list", "--json"])), [second]);
    assert.equal(json(cli(["remove", first.id, "--json"]), 1).code, "issues-not-found");
  }) },
  { name: "183/01 · malformed and path-like IDs refuse without deleting unrelated files", run: () => fixture(async ({ env, cwd, home, cli }) => {
    const { logIssue, removeIssue } = await store();
    const issue = await logIssue({ summary: "Keep" }, { env, cwd });
    const unrelated = path.join(home, "keep.json"); await writeFile(unrelated, "keep");
    for (const id of ["../keep", "../keep.json", unrelated, "", "iss-123456789abc/other"]) {
      await assert.rejects(removeIssue(id, { env }), { code: "issues-invalid-input" });
    }
    assert.equal(json(cli(["remove", "--json"]), 1).code, "issues-invalid-input");
    assert.deepEqual(json(cli(["list", "--json"])), [issue]);
    assert.equal(await readFile(unrelated, "utf8"), "keep");
  }) },
];
