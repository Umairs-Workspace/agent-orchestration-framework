import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, realpath, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readRuntimeSourceUnits } from "@aof/work/acceptor/source-units";
import { createAcceptorCommand } from "@aof/work/commands/acceptor";
import { createAcceptorCriterion } from "@aof/work/acceptor/criterion";

async function fixture(run) {
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, "aof-source-units-"));
  const put = async (rel, value) => {
    const file = path.join(root, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, typeof value === "string" ? value : JSON.stringify(value));
  };
  try { await run(root, put); }
  finally { assert.equal(path.dirname(await realpath(root)), parent); await rm(root, { recursive: true, force: true }); }
}

test("source discovery includes declared nested workspaces once and excludes dependencies, outputs and undeclared fixtures", () => fixture(async (root, put) => {
  await put("package.json", { workspaces: ["packages/*", "packages/core", "apps/{desktop,ui}", "modules/**", "!modules/ignored"] });
  const included = ["src/root.mjs", "packages/core/src/core.mjs", "apps/desktop/src/main.mjs", "apps/ui/src/client.mjs", "modules/deep/feature/src/service.mjs"];
  for (const file of included) {
    const beforeSrc = file.split("/src/")[0];
    if (beforeSrc !== file) await put(`${beforeSrc}/package.json`, { name: beforeSrc });
    await put(file, `export const value = ${JSON.stringify(file)};`);
  }
  for (const prefix of ["node_modules/vendor", "packages/core/node_modules/vendor", "packages/core/dist", "modules/ignored", "fixtures/example"]) {
    await put(`${prefix}/package.json`, { name: "excluded" });
    await put(`${prefix}/src/excluded.mjs`, "throw new Error('must never execute or count');");
  }
  await put("packages/no-manifest/src/unused.mjs", "not a workspace");
  await put("packages/core/test/test.mjs", "test-only");
  await put("packages/core/src/generated.js", "unchanged mjs scope");
  await put("src/node_modules/vendor/embedded.mjs", "dependency");
  const units = await readRuntimeSourceUnits(root);
  assert.deepEqual(units.map(unit => unit.rel), included.sort());
  for (const unit of units) assert.ok(unit.code.includes(unit.rel));
}));

test("source discovery retains monolith behavior and supports the workspace packages object", () => fixture(async (root, put) => {
  assert.deepEqual(await readRuntimeSourceUnits(root), []);
  await put("src/only.mjs", "export const only = true;");
  assert.deepEqual((await readRuntimeSourceUnits(root)).map(unit => unit.rel), ["src/only.mjs"]);
  await put("package.json", { workspaces: { packages: ["ui"] } });
  await put("ui/package.json", { name: "ui" });
  await put("ui/src/view.mjs", "export const view = true;");
  assert.deepEqual((await readRuntimeSourceUnits(root)).map(unit => unit.rel), ["src/only.mjs", "ui/src/view.mjs"]);
}));

test("source discovery refuses malformed declarations and never follows workspace or source links", () => fixture(async (root, put) => {
  await put("package.json", "{bad json");
  await assert.rejects(readRuntimeSourceUnits(root), SyntaxError);
  await put("package.json", { workspaces: "packages/*" });
  await assert.rejects(readRuntimeSourceUnits(root), /array of path patterns/);
  await put("package.json", { workspaces: ["../outside"] });
  await assert.rejects(readRuntimeSourceUnits(root), /within the project/);
  await put("foreign/pkg/package.json", { name: "foreign" });
  await put("foreign/pkg/src/linked.mjs", "foreign source");
  await mkdir(path.join(root, "packages"));
  await mkdir(path.join(root, "src"));
  await symlink(path.join(root, "foreign"), path.join(root, "packages", "link"), process.platform === "win32" ? "junction" : "dir");
  await symlink(path.join(root, "foreign", "pkg", "src"), path.join(root, "src", "link"), process.platform === "win32" ? "junction" : "dir");
  await put("package.json", { workspaces: ["packages/link/pkg"] });
  assert.deepEqual(await readRuntimeSourceUnits(root), []);
}));

test("acceptor command sees a moved consumer and refuses again when only dependency and fixture copies remain", () => fixture(async (root, put) => {
  const key = "work.loop.reviewRounds";
  const code = "function decide(workspace) { const value = reviewRoundsFromConfig(workspace); if (value > 0) return true; return false; }";
  await put("package.json", { workspaces: ["packages/*"] });
  await put("packages/runner/package.json", { name: "runner" });
  await put("packages/runner/src/decision.mjs", code);
  await put("node_modules/vendor/src/decision.mjs", code);
  await put("test/fixture/src/decision.mjs", code);
  const criterion = createAcceptorCriterion({ bundledFrozenSet: () => ({ members: [] }), readFrozenSet: assert.fail }).defaultCriterion();
  const model = { nodes: [{ id: "arbiter:fixture", edges: { "parameter-tuning": [{ scheme: "config", operand: key }] } }] };
  const { acceptorCommand } = createAcceptorCommand({ readCriterion: async () => criterion, loadLoops: async () => model });
  const ctx = { workspace: { projectRoot: root, config: {} }, acceptor: { harness: { text: key }, ledger: [], census: { findings: [] } } };
  const read = async () => (await acceptorCommand.run({}, ctx)).proposals[0].admissibility;
  assert.equal((await read()).refusals.some(refusal => refusal.code === "not-admissible"), false);
  await put("packages/runner/src/decision.mjs", "export const noConsumer = true;");
  const missing = (await read()).refusals.find(refusal => refusal.code === "not-admissible");
  assert.ok(missing);
  assert.deepEqual(missing.consumers, []);
}));
