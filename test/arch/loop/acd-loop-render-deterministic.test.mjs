import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loopsGraphCommand, renderLoopGraph } from "../../../src/commands/loops-graph.mjs";
import { stripComments } from "../../support/source-slice.mjs";

const runFile = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const endpoint = (raw, scheme = raw.split(":")[0], resolved = null) => ({ raw, scheme, operand: raw.slice(raw.indexOf(":") + 1), resolved });
const nodes = [
  { id: "loop:a-b", kind: "loop", title: "Loop", fields: {}, edges: {
    veto: [endpoint("command:work:next")],
    "target-setting": [endpoint("loop:a_b", "loop", true), endpoint("actor:z", "actor", true)],
    "parameter-tuning": [endpoint("config:work.foo")],
    "data-feed": [endpoint("module:src/run-store.mjs#isStale")],
    monitoring: [endpoint("loop:missing", "loop", false)],
  } },
  { id: "loop:a_b", kind: "loop", title: "Collision", fields: {}, edges: {} },
  { id: "actor:z", kind: "actor", title: "Actor", fields: {}, edges: {} },
];
const model = { source: path.join(root, "loops"), present: true, findings: [], nodes };
const expectedText = [
  "flowchart LR",
  '  actor_z(["actor:z \u00b7 Actor"])',
  '  command_work_next[/"command:work:next"/]',
  '  config_work_foo[/"config:work.foo"/]',
  '  loop_a_b["loop:a-b \u00b7 Loop"]',
  '  loop_a_b_2["loop:a_b \u00b7 Collision"]',
  '  loop_missing[/"loop:missing"/]',
  '  module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/]',
  "  loop_a_b -->|data-feed| module_src_run_store_mjs_isStale",
  "  loop_a_b -->|monitoring| loop_missing",
  "  loop_a_b -->|parameter-tuning| config_work_foo",
  "  loop_a_b -->|target-setting| actor_z",
  "  loop_a_b -->|target-setting| loop_a_b_2",
  "  loop_a_b -->|veto| command_work_next",
].join("\n");

function shuffledModel(value) {
  return {
    ...value,
    nodes: [...value.nodes].reverse().map((node) => ({
      ...node,
      edges: Object.fromEntries(Object.entries(node.edges ?? {}).reverse().map(([key, entries]) => [key, [...entries].reverse()])),
    })),
  };
}

const loopRecord = (id, title, extra = "") => `---\nid: loop:${id}\nkind: loop\ntitle: ${title}\ncontrolled: state\nreference: [prose:a.md]\nmeasurement: [prose:a.md]\nactuator: [command:work:next]\ncadence: periodic:10s\nceiling: none\nowner: actor:operator\noptimizing: false\n${extra}---\n# ${title}\n`;

// FF-5208 means `ui/` SOURCE — the files this repository authors. `ui/dist/assets/*.js` is a
// minified single-line bundle, on which the `(?:route|argv)…["']loops["']` proximity regex below
// is a false-positive surface rather than a measurement (every token is within 100 characters of
// every other one); `ui/node_modules` is a dependency tree, empty here only because deps hoist to
// the repository root, which is an install-layout accident this gate should not rest on.
const UNAUTHORED = new Set(["node_modules", "dist"]);

async function filesBelow(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && UNAUTHORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesBelow(full));
    else if (/\.(?:js|mjs|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/52 FF-5208: Mermaid bytes, canonical order, glyphs and total collision-safe keys are frozen",
    run: async () => {
      const first = renderLoopGraph(model);
      assert.deepEqual(renderLoopGraph(model), first);
      assert.deepEqual(renderLoopGraph(shuffledModel(model)), first);
      assert.equal(first.text, expectedText, "all five labels, three glyphs, collision keys and edge sequence are literal");
      assert.equal(first.text.endsWith("\n"), false, "the frozen Mermaid bytes have no trailing newline");
      assert.equal(first.edgeCount, 6);
      const expectedEdges = expectedText.split("\n").filter((line) => line.includes(" -->|"));
      assert.deepEqual(first.text.split("\n").filter((line) => line.includes(" -->|")), expectedEdges, "full edge lines are canonical");
      const keys = first.text.split("\n").slice(1).filter((line) => !line.includes(" -->|")).map((line) => line.trim().split(/[\[(]/, 1)[0]);
      assert.ok(keys.every((key) => /^[A-Za-z0-9_]+$/.test(key)));
      assert.equal(new Set(keys).size, keys.length);
      assert.equal(keys.length, 7, "visual nodes include four external/dangling endpoints");

      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-loop-render-counts-"));
      try {
        const dir = path.join(temp, "loops"); await mkdir(dir);
        await writeFile(path.join(dir, "one.md"), loopRecord("one", "One", "veto: [command:work:next]\ntarget-setting: [loop:two, actor:operator]\nparameter-tuning: [config:work.foo]\ndata-feed: [module:src/run-store.mjs#isStale]\nmonitoring: [loop:missing]\n"));
        await writeFile(path.join(dir, "two.md"), loopRecord("two", "Two"));
        await writeFile(path.join(dir, "operator.md"), "---\nid: actor:operator\nkind: actor\ntitle: Operator\nground: exogenous\n---\n# Operator\n");
        const commandResult = await loopsGraphCommand.run({}, { workspace: { workDir: temp, aofDir: temp } });
        assert.equal(commandResult.nodeCount, 3, "nodeCount counts declarations, not visual endpoint nodes");
        assert.equal(commandResult.edgeCount, 6, "edgeCount counts every authored edge");
        assert.equal(commandResult.text.split("\n").filter((line) => line && line !== "flowchart LR" && !line.includes(" -->|")).length, 7);
      } finally { await rm(temp, { recursive: true, force: true }); }

      const url = pathToFileURL(path.join(root, "src/commands/loops-graph.mjs")).href;
      const script = `import {renderLoopGraph} from ${JSON.stringify(url)}; console.log(JSON.stringify(renderLoopGraph(${JSON.stringify(shuffledModel(model))})));`;
      const { stdout } = await runFile(process.execPath, ["--input-type=module", "--eval", script]);
      assert.equal(stdout.trim(), JSON.stringify({ text: expectedText, edgeCount: 6 }));
    },
  },
  {
    name: "arch/52 FF-5208: UI carries no loop-registry token or loops route literal",
    run: async () => {
      const files = await filesBelow(path.join(root, "ui"));
      assert.ok(files.length > 10);
      for (const file of files) {
        const source = stripComments(await readFile(file, "utf8"));
        assert.doesNotMatch(source, /work-loops|loops-show|loops-graph|loops-validate|work:loops-/);
        assert.doesNotMatch(source, /(?:route|argv)[^\n]{0,100}["']loops["']/);
      }
    },
  },
];
