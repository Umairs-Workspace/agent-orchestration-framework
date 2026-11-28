// 210/01 tasks 00–01: fresh, headless scans of real temporary trees; no project code executes.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { scanImporters } from "@aof/work/testing/importers";

async function withTree(files, run) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-importers-"));
  const put = async (file, text) => {
    await mkdir(path.dirname(path.join(projectRoot, file)), { recursive: true });
    await writeFile(path.join(projectRoot, file), text);
  };
  try {
    for (const [file, text] of Object.entries(files)) await put(file, text);
    const scan = (changed = ["src/record.mjs"], options = {}) => scanImporters({ projectRoot, roots: ["test"], changed, ...options });
    await run({ projectRoot, put, scan });
  } finally { await rm(projectRoot, { recursive: true, force: true }); }
}
const reaching = (answer, suite) => answer.suites.find(row => row.file === suite)?.reachedBy;
const imported = "import '../../src/record.mjs';\nthrow Error('never execute a suite');";

export const testImporterScanTests = [
  {
    name: "210/01 E1 · relative import selects the suite as imports without executing it",
    run: () => withTree({ "src/record.mjs": "", "test/testing/record.test.mjs": imported }, async ({ scan }) => {
      const answer = await scan();
      assert.deepEqual(answer.selected, ["test/testing/record.test.mjs"]);
      assert.deepEqual(reaching(answer, answer.selected[0]), [{ file: "src/record.mjs", how: "imports" }]);
      assert.deepEqual(answer.unresolved, []);
    }),
  },
  {
    name: "210/01 E2 · workspace specifiers use the supplied census export map",
    run: () => withTree({ "packages/work/src/record.mjs": "", "test/work/record.test.mjs": "import '@acme/work/record';" }, async ({ scan }) => {
      const exportMap = new Map([["@acme/work/record", "packages/work/src/record.mjs"]]);
      const answer = await scan(["packages/work/src/record.mjs"], { exportMap });
      assert.deepEqual(reaching(answer, "test/work/record.test.mjs"), [{ file: "packages/work/src/record.mjs", how: "imports" }]);
      assert.equal(exportMap.size, 1);
    }),
  },
  ...[
    ["E3 helper", { "test/support/a.mjs": "import '../../src/record.mjs';" }, "via test/support/a.mjs"],
    ["helper chain", { "test/support/a.mjs": "export * from './b.mjs';", "test/support/b.mjs": "import '../../src/record.mjs';" }, "via test/support/a.mjs"],
    ["helper then source", { "test/support/a.mjs": "import '../../src/util.mjs';", "src/util.mjs": "import './record.mjs';" }, null],
    ["self cycle", { "test/support/a.mjs": "import './a.mjs';" }, null],
    ["cycle with an exit", { "test/support/a.mjs": "import './b.mjs';", "test/support/b.mjs": "import './a.mjs'; import '../../src/record.mjs';" }, "via test/support/a.mjs"],
  ].map(([label, helpers, how]) => ({
    name: `210/01 · ${label} follows only test helpers and terminates`,
    run: () => withTree({ "src/record.mjs": "", "test/s.test.mjs": "import './support/a.mjs';", ...helpers }, async ({ scan }) => {
      const answer = await scan();
      assert.deepEqual(answer.selected, how == null ? [] : ["test/s.test.mjs"]);
      if (how) assert.deepEqual(reaching(answer, "test/s.test.mjs"), [{ file: "src/record.mjs", how }]);
      assert.ok(!answer.selected.some(file => file.includes("support/")));
    }),
  })),
  {
    name: "210/01 E4 · source-to-source imports never select the assembly's suite",
    run: () => withTree({ "src/record.mjs": "", "src/assemble.mjs": "import './record.mjs';", "test/app.test.mjs": "import '../src/assemble.mjs';" }, async ({ scan }) => {
      assert.deepEqual((await scan()).selected, []);
    }),
  },
  {
    name: "210/01 · fresh calls see additions, edits and removals and retain no shared state",
    run: () => withTree({ "src/record.mjs": "" }, async ({ scan, put, projectRoot }) => {
      const changed = Object.freeze(["src/record.mjs"]);
      assert.deepEqual((await scan(changed)).selected, []);
      await put("test/new.test.mjs", "import '../src/record.mjs';");
      assert.deepEqual((await scan(changed)).selected, ["test/new.test.mjs"]);
      await put("test/new.test.mjs", "// now unrelated");
      assert.deepEqual((await scan(changed)).selected, []);
      await rm(path.join(projectRoot, "test/new.test.mjs"));
      assert.deepEqual((await scan(changed)).selected, []);
      assert.deepEqual(changed, ["src/record.mjs"]);
    }),
  },
  {
    name: "210/01 E5 · a suite naming a path selects it without an import",
    run: () => withTree({ "test/loop/size.test.mjs": "const filename = 'packages/loop/src/loop.mjs';" }, async ({ scan }) => {
      const answer = await scan(["packages/loop/src/loop.mjs"]);
      assert.deepEqual(reaching(answer, "test/loop/size.test.mjs"), [{ file: "packages/loop/src/loop.mjs", how: "names" }]);
    }),
  },
  {
    name: "210/01 E6 · an unreferenced record reaches no suite without widening",
    run: () => withTree({ "test/s.test.mjs": "// unrelated" }, async ({ scan }) => {
      const file = "wiki/work/210_milestone_x/STATE.md";
      const answer = await scan([file]);
      assert.deepEqual(answer.selected, []);
      assert.deepEqual(answer.unreached, [file]);
    }),
  },
  {
    name: "210/01 E7 · unresolved imports name each specifier and importer once",
    run: () => withTree({ "test/support/h.mjs": "import '@acme/missing/thing'; import '@acme/missing/thing'; import 'node:fs';" }, async ({ scan }) => {
      const answer = await scan();
      assert.equal(answer.unresolvedCount, 1);
      assert.deepEqual(answer.unresolved, [{ file: "test/support/h.mjs", specifier: "@acme/missing/thing" }]);
    }),
  },
  {
    name: "210/01 · each reached changed file is reported once in deterministic order",
    run: () => withTree({ "src/one.mjs": "", "test/a.test.mjs": "import '../src/one.mjs'; const other = 'src/two.mjs';" }, async ({ scan }) => {
      const answer = await scan(["src/two.mjs", "src/one.mjs", "src/two.mjs"]);
      assert.deepEqual(answer.selected, ["test/a.test.mjs"]);
      assert.deepEqual(reaching(answer, "test/a.test.mjs"), [{ file: "src/one.mjs", how: "imports" }, { file: "src/two.mjs", how: "names" }]);
      assert.deepEqual(answer.unreached, []);
      assert.ok(Object.isFrozen(answer.suites[0].reachedBy));
    }),
  },
  ...[["src/two.mjs", true], ["src/two.mjs.bak", false], ["two.mjs", false], ["other/src/two.mjs", false]].map(([text, selected]) => ({
    name: `210/01 · whole project-relative path match: ${text}`,
    run: () => withTree({ "test/a.test.mjs": `const file = '${text}';` }, async ({ scan }) => {
      const answer = await scan(["src/two.mjs"]);
      assert.deepEqual(answer.selected, selected ? ["test/a.test.mjs"] : []);
      if (selected) assert.equal(reaching(answer, "test/a.test.mjs")[0].how, "names");
    }),
  })),
  {
    name: "210/01 · declared roots, suffixes and exclusions decide suite membership",
    run: () => withTree({ "test/a.spec.ts": "import '../src/record.mjs';", "test/excluded.spec.ts": "import '../src/record.mjs';", "outside/b.spec.ts": "import '../src/record.mjs';", "test/node_modules/b.spec.ts": "import '../../src/record.mjs';" }, async ({ scan }) => {
      assert.deepEqual((await scan(undefined, { roots: ["./test/", "test"], suffixes: [".spec.ts"], exclude: [{ paths: ["test/excluded.spec.ts"], why: "native" }] })).selected, ["test/a.spec.ts"]);
    }),
  },
  {
    name: "210/01 · no graph is read even when a graph path would fail to open",
    run: () => withTree({ "src/record.mjs": "", "test/testing/a.test.mjs": imported }, async ({ projectRoot, scan }) => {
      await symlink(path.join(projectRoot, "graphify-out"), path.join(projectRoot, "graphify-out"));
      assert.deepEqual((await scan()).selected, ["test/testing/a.test.mjs"]);
    }),
  },
  {
    name: "210/01 · comments and strings are not imports; literal dynamic imports and reexports are",
    run: () => withTree({ "src/record.mjs": "", "test/comment.test.mjs": "// import '../src/record.mjs';\nconst text = \"import '../src/record.mjs'\";", "test/dynamic.test.mjs": "await import('../src/record.mjs');", "test/reexport.test.mjs": "export { a } from '../src/record.mjs';" }, async ({ scan }) => {
      assert.deepEqual((await scan()).selected, ["test/dynamic.test.mjs", "test/reexport.test.mjs"]);
    }),
  },
];
