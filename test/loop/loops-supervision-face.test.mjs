// test/loop/loops-supervision-face.test.mjs — milestone 58 / story 03: THE SUPERVISION FACE.
//
// The subjects are the two REGISTERED read commands — `work:loops-show` and `work:loops-graph` —
// obtained from the registry (`getCommand`), never imported from their modules, because the
// registry is the only admitted door (08/ADR-004 inv. 3) and reaching past it would make this
// suite unable to notice a command that stopped being registered.
//
// TWO SUBJECTS, the split 52/05 established and this story keeps:
//
//   · a claim about the RESULT or the FACE — a rendered line, the `--json` node shape, the
//     computed reference-setter, a glyph — is decided by `command.run(input, {workspace})` and the
//     `cli.render`/`cli.json` adapters IN PROCESS. A render is a pure projection of a result, and
//     a spawn spent here buys a value a function call already returns.
//   · a claim about the PROCESS — the exit code, exactly one JSON document on stdout, byte
//     identity across two separate processes — is decided by a REAL SPAWN through the single
//     hardened door in `test/support/cli-spawn.mjs`. Driving one of those in process proves
//     nothing at all.
//
// WHAT THE LOADER IS USED FOR HERE, and it is one thing only. `loadLoops` is this story's ORACLE
// for "the six node keys shipped before this story carry exactly what they carried before it":
// the loader is not in 58/03's write set, so what it produces IS the before-picture. It is never
// the subject.
//
// WHAT IS ALREADY DECIDED ELSEWHERE, and is deliberately not re-asserted here. 52/FF-5208 owns the
// frozen Mermaid literal over a hand-built model, the total key mangling, the collision suffix and
// shuffle-invariance of the pure renderer. 58/FF-5808 owns the DURABLE glyph property — that the
// count of distinct shapes the renderer emits equals the count of declared kinds, in both
// directions, and that none of them is the fallback. This suite drives the same subjects from the
// other end: records a human authored on disk, through the registered command, to the line a
// reader sees.
//
// Features driven, in full:
//   wiki/work/58_milestone_supervising-loops/stories/03_story_the-supervision-face/tasks/
//     00_the-face-names-the-supervisor.feature   (13 scenarios + 1 Examples table, 11 rows)
//     01_every-kind-has-its-own-shape.feature    (9 scenarios + 2 Examples tables, 5 + 4 rows)
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand } from "../../src/command-core.mjs";
import { loadLoops } from "../../src/work/loops.mjs";
import { spawnCliSync } from "../support/cli-spawn.mjs";
import {
  actorRecord,
  identityRecord,
  loopRecord,
  reversedFiles,
  withLoopRegistry,
  withoutLoopRegistry,
} from "../support/loop-registry-fixture.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
const CLI_ENTRY = path.join(ROOT, "bin", "aof.mjs");

const SHOW = "work:loops-show";
const GRAPH = "work:loops-graph";
const VALIDATE = "work:loops-validate";
const CONFIG_TEXT = `${JSON.stringify({ name: "loop-supervision-face-fixture", work: { dir: "./work" } }, null, 2)}\n`;

// ---------------------------------------------------------------------------------------------
// Fixtures and doors.
// ---------------------------------------------------------------------------------------------

/** A temp workspace holding an `.aof/loops/` registry AND the `.aof/aof.config.json` a spawn needs. */
async function withWorkspace(files, run) {
  return withLoopRegistry(files, async (fixture) => {
    const aofDir = path.join(fixture.temp, ".aof");
    await mkdir(aofDir, { recursive: true });
    await writeFile(path.join(aofDir, "aof.config.json"), CONFIG_TEXT, "utf8");
    return run({ ...fixture, aofDir, projectRoot: fixture.temp });
  }, { parent: ".aof" });
}

/** The same, with NO `loops/` directory at all — a different fact from an empty one. */
async function withoutRegistry(run) {
  return withoutLoopRegistry(async (fixture) => {
    const aofDir = path.join(fixture.temp, ".aof");
    await mkdir(aofDir, { recursive: true });
    await writeFile(path.join(aofDir, "aof.config.json"), CONFIG_TEXT, "utf8");
    return run({ ...fixture, aofDir, projectRoot: fixture.temp });
  }, { parent: ".aof" });
}

/** The in-process seam: the registry lookup, never a module import. */
const runCommand = (id, input, fixture) =>
  getCommand(id).run(input, { workspace: { workDir: fixture.workDir, aofDir: fixture.aofDir } });
const renderOf = (id, result) => getCommand(id).cli.render(result);
const jsonOf = (id, result) => getCommand(id).cli.json(result);

/** The ONE spawn door — the shared hardened helper, never a raw child_process call. */
function runCli(args, cwd) {
  const result = spawnCliSync(process.execPath, [CLI_ENTRY, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  return { argv: args.join(" "), status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/**
 * EXACTLY ONE JSON document on stdout. Two concatenated documents do not parse, and a top-level
 * closer at column 0 appears exactly once in `JSON.stringify(value, null, 2)` output — so the two
 * assertions together decide "one document", not merely "parseable".
 */
function oneJsonDocument(result, label) {
  const closers = result.stdout.split(/\r?\n/).filter((line) => line === "}" || line === "]").length;
  assert.equal(closers, 1, `${label}: exactly one top-level JSON document on stdout (got ${closers})`);
  let parsed;
  assert.doesNotThrow(() => { parsed = JSON.parse(result.stdout); }, `${label}: stdout parses — ${result.stdout.slice(0, 200)}`);
  return parsed;
}

// The keys each non-loop/actor kind must declare for its record to be otherwise well-formed, so a
// case authors ONE fact and asserts the face over it rather than over a background of findings.
const REQUIRED_FIELDS = Object.freeze({
  anchor: { ground: "frozen-rule", observes: "module:src/run-store.mjs#isStale" },
  watcher: { counter: "interventions", determinism: "counter", measurement: "[module:src/run-store.mjs#attempts]" },
  arbiter: { resolves: "whose demand wins", priority: "[loop:build]", dwell: "cycles:2" },
});

/**
 * One record spec of any declared kind. Every value is an authored LINE, exactly as the feature
 * writes it; the loader's own parser decides what it means.
 */
function record(kind, { id, title, fields = {} } = {}) {
  const spec = { fields: { ...(REQUIRED_FIELDS[kind] ?? {}), ...fields } };
  if (id !== undefined) spec.id = id;
  if (title !== undefined) spec.title = title;
  if (kind === "loop") return loopRecord(spec);
  if (kind === "actor") return actorRecord(spec);
  return identityRecord({ ...spec, kind });
}

const lineFor = (rendered, id) => rendered.split("\n").find((line) => line.startsWith(`${id} ·`)) ?? null;
const nodeFor = (document, id) => document.nodes.find((node) => node.id === id) ?? null;
const nodeLines = (text) => text.split("\n").slice(1).filter((line) => !line.includes(" -->|"));
const edgeLines = (text) => text.split("\n").filter((line) => line.includes(" -->|"));
const graphLine = (text, key) => nodeLines(text).find((line) => line.trim().startsWith(`${key}[`)
  || line.trim().startsWith(`${key}(`) || line.trim().startsWith(`${key}{`)) ?? null;
const shapeOf = (line) => line.trim().replace(/^[A-Za-z0-9_]+/u, "").replace(/"[^"]*"/u, String.raw`"…"`);
const FALLBACK_SHAPE = String.raw`[/"…"/]`;

// The five kinds, one record each, in the id scheme each kind owns. The stem of every filename
// equals the operand of its id, so no record trips the loader's own id rule.
const everyKind = (overrides = {}) => ({
  "build.md": record("loop", { title: "Build", fields: { layer: "operational" }, ...(overrides.loop ?? {}) }),
  "operator.md": record("actor", { title: "Operator", ...(overrides.actor ?? {}) }),
  "policy.md": record("anchor", { id: "anchor:policy", title: "Policy", ...(overrides.anchor ?? {}) }),
  "eye.md": record("watcher", { id: "watcher:eye", title: "Eye", ...(overrides.watcher ?? {}) }),
  "trade-off.md": record("arbiter", { id: "arbiter:trade-off", title: "Trade-off", ...(overrides.arbiter ?? {}) }),
});

// ---------------------------------------------------------------------------------------------
// `00_the-face-names-the-supervisor.feature` — Examples: the eleven declared/absent combinations.
// ---------------------------------------------------------------------------------------------
const FACE_ROWS = Object.freeze([
  { kind: "loop", layer: "operational", sets: ["loop:mgr"], segments: " · layer operational · reference set by loop:mgr", setters: ["loop:mgr"] },
  { kind: "loop", layer: "governance", sets: [], segments: " · layer governance · no declared reference-setter", setters: [] },
  { kind: "loop", layer: null, sets: ["actor:root"], segments: " · reference set by actor:root", setters: ["actor:root"] },
  { kind: "loop", layer: null, sets: [], segments: " · no declared reference-setter", setters: [] },
  { kind: "loop", layer: "management", sets: ["actor:root", "loop:mgr"], segments: " · layer management · reference set by actor:root, loop:mgr", setters: ["actor:root", "loop:mgr"] },
  { kind: "loop", layer: "operational", sets: ["self"], segments: " · layer operational · no declared reference-setter", setters: [] },
  { kind: "arbiter", layer: null, sets: ["actor:operator"], segments: " · reference set by actor:operator", setters: ["actor:operator"] },
  { kind: "arbiter", layer: null, sets: [], segments: "", setters: [] },
  { kind: "actor", layer: null, sets: [], segments: "", setters: [] },
  { kind: "anchor", layer: null, sets: [], segments: "", setters: [] },
  { kind: "watcher", layer: null, sets: [], segments: "", setters: [] },
]);

// ---------------------------------------------------------------------------------------------
// `01_every-kind-has-its-own-shape.feature` — Examples 1: one shape per declared kind.
// ---------------------------------------------------------------------------------------------
const GLYPH_ROWS = Object.freeze([
  { kind: "loop", shape: "rectangle", reads: "a cycle", line: 'loop_x["loop:x · T"]' },
  { kind: "actor", shape: "stadium", reads: "somebody", line: 'actor_x(["actor:x · T"])' },
  { kind: "anchor", shape: "circle", reads: "a fixed point", line: 'anchor_x(("anchor:x · T"))' },
  { kind: "watcher", shape: "hexagon", reads: "an instrument", line: 'watcher_x{{"watcher:x · T"}}' },
  { kind: "arbiter", shape: "rhombus", reads: "a decision", line: 'arbiter_x{"arbiter:x · T"}' },
]);

// Examples 2: the four undeclared-endpoint forms `acd-loop-render-deterministic` already pins.
const FALLBACK_ROWS = Object.freeze([
  { endpoint: "command:work:next", line: 'command_work_next[/"command:work:next"/]' },
  { endpoint: "config:work.loop.reviewRounds", line: 'config_work_loop_reviewRounds[/"config:work.loop.reviewRounds"/]' },
  { endpoint: "module:src/run-store.mjs#isStale", line: 'module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/]' },
  { endpoint: "loop:nowhere", line: 'loop_nowhere[/"loop:nowhere"/]' },
]);

export const loopsSupervisionFaceTests = [
  // -------------------------------------------------------------------------------------------
  // 00_the-face-names-the-supervisor
  // -------------------------------------------------------------------------------------------
  {
    name: "loops-face/00 reading a loop names the layer it declares and the node that sets its reference",
    run: async () => {
      await withWorkspace({
        "mgr.md": record("loop", { title: "Mgr", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        const rendered = renderOf(SHOW, result);

        assert.equal(
          lineFor(rendered, "loop:build"),
          "loop:build · loop · Build · layer operational · reference set by loop:mgr",
          "the line is exactly id, kind, title, the declared layer and the computed setter",
        );
        // THE FIRST THREE SEGMENTS ARE UNCHANGED BY THIS STORY — decided on the segments
        // themselves, so a story that reordered or re-worded them could not pass by appending.
        assert.deepEqual(
          lineFor(rendered, "loop:build").split(" · ").slice(0, 3), ["loop:build", "loop", "Build"],
          "the first three segments are the id, the kind and the title",
        );
        assert.equal(rendered.split("\n")[0], `Loop registry: 2 node(s) in ${path.relative(process.cwd(), fixture.loopsDir)}.`,
          "the header still states how many nodes were found, in which directory");

        const spawned = runCli(["work", "loops", "show"], fixture.projectRoot);
        assert.equal(spawned.status, 0, `aof work loops show exits 0 (stderr: ${spawned.stderr})`);
        assert.ok(spawned.stdout.includes("· layer operational · reference set by loop:mgr"), "…and the spawned face carries the same two segments");
      });
    },
  },
  {
    name: "loops-face/00 an absence is stated in words where a missing setter is a defect, and nowhere else",
    run: async () => {
      // A LOOP WHOSE REFERENCE NOBODY SETS SAYS SO IN WORDS.
      await withWorkspace({
        "orphan.md": record("loop", { title: "Orphan", fields: { layer: "governance" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        const line = lineFor(renderOf(SHOW, result), "loop:orphan");
        assert.equal(line, "loop:orphan · loop · Orphan · layer governance · no declared reference-setter");
        assert.equal(line.includes(" ·  · "), false, "the line carries no empty segment");
        assert.equal(/·\s*$/u.test(line), false, "…and does not trail off into one");
        assert.deepEqual(
          line.split(" · ").filter((segment) => segment.trim() === ""), [],
          "no segment is blank and no placeholder id stands in for the absence",
        );
        const document = jsonOf(SHOW, result);
        assert.deepEqual(nodeFor(document, "loop:orphan").referenceSetters, [], "the machine face says [] — an empty list");
        assert.equal(Array.isArray(nodeFor(document, "loop:orphan").referenceSetters), true, "never null, never absent, never a fabricated id");
        assert.equal(Object.hasOwn(nodeFor(document, "loop:orphan"), "referenceSetters"), true, "the key is present even when nobody sets the reference");
      });

      // …AND NOWHERE ELSE. The three kinds ADR-001 requires no inbound reference-setting edge of
      // end their lines at their titles, while the machine face states the absence uniformly.
      await withWorkspace({
        "orphan.md": record("loop", { title: "Orphan", fields: { layer: "operational" } }),
        "policy.md": record("anchor", { id: "anchor:policy", title: "Policy" }),
        "eye.md": record("watcher", { id: "watcher:eye", title: "Eye" }),
        "trade-off.md": record("arbiter", { id: "arbiter:trade-off", title: "Trade-off" }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        const rendered = renderOf(SHOW, result);
        const carrying = rendered.split("\n").filter((line) => line.includes("no declared reference-setter"));
        assert.deepEqual(
          carrying, ["loop:orphan · loop · Orphan · layer operational · no declared reference-setter"],
          "only the loop's line carries the words — a missing setter means something there and nothing on the other three",
        );
        for (const [id, title] of [["anchor:policy", "Policy"], ["watcher:eye", "Eye"], ["arbiter:trade-off", "Trade-off"]]) {
          assert.equal(lineFor(rendered, id), `${id} · ${id.split(":")[0]} · ${title}`, `${id}: the line ends at its title`);
        }
        const document = jsonOf(SHOW, result);
        for (const id of ["loop:orphan", "anchor:policy", "watcher:eye", "arbiter:trade-off"]) {
          assert.deepEqual(nodeFor(document, id).referenceSetters, [], `${id}: the machine face states the absence uniformly`);
        }
      });
    },
  },
  {
    name: "loops-face/00 an undeclared layer is given none, and a kind with no layer axis carries none",
    run: async () => {
      // A LOOP THAT DECLARES NO LAYER IS GIVEN NONE — no value is supplied as a default.
      await withWorkspace({
        "build.md": record("loop", { title: "Build", fields: { layer: null } }),
        "mgr.md": record("loop", { title: "Mgr", fields: { layer: "management", "target-setting": "[loop:build]" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        assert.equal(lineFor(renderOf(SHOW, result), "loop:build"), "loop:build · loop · Build · reference set by loop:mgr");
        assert.equal(lineFor(renderOf(SHOW, result), "loop:build").includes("layer"), false, "no layer word appears on that line");
        const build = nodeFor(jsonOf(SHOW, result), "loop:build");
        assert.equal(Object.hasOwn(build.fields, "layer"), false, "`fields` carries no `layer` key at all");
        assert.deepEqual(build.referenceSetters, ["loop:mgr"]);
      });

      // A KIND THAT HAS NO LAYER AXIS renders no layer, and is named only when something sets it.
      await withWorkspace({
        "arb.md": record("arbiter", { id: "arbiter:trade-off", title: "Trade-off" }),
        "operator.md": record("actor", { title: "Operator", fields: { "target-setting": "[arbiter:trade-off]" } }),
      }, async (fixture) => {
        const rendered = renderOf(SHOW, await runCommand(SHOW, {}, fixture));
        assert.equal(lineFor(rendered, "arbiter:trade-off"), "arbiter:trade-off · arbiter · Trade-off · reference set by actor:operator");
        assert.equal(lineFor(rendered, "actor:operator"), "actor:operator · actor · Operator", "the setter's own line ends at its title");
        for (const line of rendered.split("\n").slice(1)) {
          if (line.split(" · ")[1] === "loop") continue;
          assert.equal(line.includes(" · layer "), false, `no line for a kind other than loop carries a layer word: ${line}`);
        }
      });
    },
  },
  {
    name: "loops-face/00 the machine face is a shape a caller can depend on",
    run: async () => {
      // ONE NODE OF EACH DECLARED KIND, with a single target-setting edge so the sweep below is
      // decided over a registry where a setter genuinely exists — a fixture where nobody sets
      // anybody would satisfy every referenceSetters claim vacuously.
      await withWorkspace(everyKind({ actor: { fields: { "target-setting": "[arbiter:trade-off]" } } }), async (fixture) => {
        const spawned = runCli(["work", "loops", "show", "--json"], fixture.projectRoot);
        assert.equal(spawned.status, 0, `show --json exits 0 (stderr: ${spawned.stderr})`);
        const document = oneJsonDocument(spawned, "show --json");
        assert.deepEqual(Object.keys(document), ["source", "present", "nodes"], "the document carries source, present and nodes");
        assert.equal(document.nodes.length, 5, "one node per declared kind");

        // THE SEVEN KEYS: the six shipped before this story, plus exactly one.
        for (const node of document.nodes) {
          assert.deepEqual(
            Object.keys(node).sort(), ["edges", "fields", "id", "kind", "path", "referenceSetters", "title"],
            `${node.id}: the six contract keys plus referenceSetters, and nothing else`,
          );
          assert.equal(Array.isArray(node.referenceSetters), true, `${node.id}: referenceSetters is an array`);
          for (const setter of node.referenceSetters) {
            assert.equal(typeof setter, "string", `${node.id}: every entry is a declared node id STRING — never an endpoint object, never a title`);
            assert.match(setter, /^[a-z]+:[A-Za-z0-9-]+$/u, `${node.id}: …in the id form a record declares`);
          }
          assert.equal(node.referenceSetters.includes(node.id), false, `${node.id}: a node is never its own reference-setter`);
        }
        assert.ok(document.nodes.some((node) => node.referenceSetters.length > 0), "non-vacuity: at least one node HAS a setter in this registry");

        // THE SIX PRE-EXISTING KEYS CARRY EXACTLY WHAT THEY CARRIED BEFORE — decided against the
        // LOADER, which this story does not touch, so the before-picture is measured and not
        // recalled.
        const before = await loadLoops(fixture.aofDir);
        assert.equal(before.nodes.length, document.nodes.length, "oracle non-vacuity: the loader read the same registry");
        for (const node of document.nodes) {
          const loaded = before.nodes.find((entry) => entry.id === node.id);
          assert.ok(loaded, `${node.id}: the loader read this record`);
          const { referenceSetters: _added, path: printed, ...six } = node;
          assert.deepEqual(six, { id: loaded.id, kind: loaded.kind, title: loaded.title, fields: loaded.fields, edges: loaded.edges },
            `${node.id}: id, kind, title, fields and edges are byte-for-byte what the loader produces`);
          assert.equal(path.resolve(fixture.projectRoot, printed), loaded.path, `${node.id}: path still names the record it was read from`);
        }
      });
    },
  },
  {
    name: "loops-face/00 the human and machine faces carry the same answer, node by node",
    run: async () => {
      // SIX RECORDS: three nodes with a declared setter (loop:build, loop:mid, arbiter:judge) and
      // three with none (loop:mgr, actor:root, watcher:eye).
      await withWorkspace({
        "mgr.md": record("loop", { title: "Mgr", fields: { layer: "governance", "target-setting": "[loop:mid]" } }),
        "mid.md": record("loop", { title: "Mid", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
        "root.md": record("actor", { title: "Root", fields: { "target-setting": "[arbiter:judge]" } }),
        "judge.md": record("arbiter", { id: "arbiter:judge", title: "Judge" }),
        "eye.md": record("watcher", { id: "watcher:eye", title: "Eye" }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        const rendered = renderOf(SHOW, result);
        const document = jsonOf(SHOW, result);
        assert.equal(document.nodes.length, 6, "six records");

        const withSetter = document.nodes.filter((node) => node.referenceSetters.length > 0).map((node) => node.id);
        assert.deepEqual(withSetter, ["arbiter:judge", "loop:build", "loop:mid"], "three nodes have a declared setter");
        assert.equal(document.nodes.length - withSetter.length, 3, "…and three have none");

        for (const node of document.nodes) {
          const line = lineFor(rendered, node.id);
          assert.ok(line, `${node.id}: the human face carries a line`);
          const named = line.includes(" · reference set by ")
            ? line.split(" · reference set by ")[1].split(", ")
            : [];
          assert.deepEqual(named, node.referenceSetters, `${node.id}: the ids named after \`reference set by\` are exactly referenceSetters, in the same order`);
          if (node.referenceSetters.length === 0 && node.kind === "loop") {
            assert.ok(line.includes("no declared reference-setter"), `${node.id}: a loop with no setter says so`);
          }
          const layerSegment = line.split(" · ").find((segment) => segment.startsWith("layer "));
          assert.equal(
            layerSegment ?? null, node.fields.layer == null ? null : `layer ${node.fields.layer.raw}`,
            `${node.id}: every layer word printed is the RAW value of fields.layer`,
          );
        }
      });
    },
  },
  {
    name: "loops-face/00 --id narrows what is printed, never what is computed",
    run: async () => {
      await withWorkspace({
        "mgr.md": record("loop", { title: "Mgr", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
      }, async (fixture) => {
        const narrowed = jsonOf(SHOW, await runCommand(SHOW, { id: "loop:build" }, fixture));
        const unfiltered = jsonOf(SHOW, await runCommand(SHOW, {}, fixture));

        assert.equal(narrowed.nodes.length, 1, "nodes has exactly 1 entry");
        assert.deepEqual(
          narrowed.nodes[0].referenceSetters, ["loop:mgr"],
          "the setter is named although loop:mgr's own record is not in the output — the answer is computed over the WHOLE registry",
        );
        assert.equal(narrowed.nodes.some((node) => node.id === "loop:mgr"), false, "…and loop:mgr is genuinely absent from the printed list");
        assert.deepEqual(narrowed.nodes[0], nodeFor(unfiltered, "loop:build"), "that entry is identical to loop:build's entry in the unfiltered document");
        assert.equal(unfiltered.nodes.length, 2, "non-vacuity: the unfiltered document really is wider");
        assert.equal(narrowed.present, unfiltered.present, "the filter does not change the registry's own answer");
      });
    },
  },
  {
    name: "loops-face/00 two nodes setting one reference are both named, in id order",
    run: async () => {
      const files = {
        "mgr.md": record("loop", { title: "Mgr", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "operator.md": record("actor", { title: "Operator", fields: { "target-setting": "[loop:build]" } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
      };
      const readBoth = async (map) => withWorkspace(map, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        return { document: jsonOf(SHOW, result), line: lineFor(renderOf(SHOW, result), "loop:build") };
      });

      const forward = await readBoth(files);
      assert.deepEqual(
        nodeFor(forward.document, "loop:build").referenceSetters, ["actor:operator", "loop:mgr"],
        "both, in id order — neither is silently dropped in favour of the other",
      );
      assert.equal(
        forward.line, "loop:build · loop · Build · layer operational · reference set by actor:operator, loop:mgr",
        "the human line names both, separated by \", \", in that same order",
      );

      const reversed = await readBoth(reversedFiles(files));
      assert.deepEqual(
        nodeFor(reversed.document, "loop:build").referenceSetters, ["actor:operator", "loop:mgr"],
        "…and that order is unchanged when the two records are authored in the opposite order",
      );
      assert.equal(reversed.line, forward.line, "the human line is unchanged too");
    },
  },
  {
    name: "loops-face/00 a record that declares no id is not a reference-setter, and never reaches the list as one",
    run: async () => {
      // A record whose frontmatter PARSES but declares no `id:` is reachable — the loader reports
      // `loop-missing-field` and keeps the node, edges and all. Its edges therefore reach the
      // setter computation with `node.id === null`, and without the guard at
      // `src/commands/loops-show.mjs`'s edge sweep the null is carried straight onto the wire:
      // `referenceSetters` becomes `[null, "loop:mgr"]` and the human line reads
      // `… · reference set by , loop:mgr`. Feature 00 forbids both — "never as a blank segment"
      // and "an array of declared node id STRINGS — never null".
      await withWorkspace({
        "nameless.md": record("loop", { id: null, title: "Nameless", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "mgr.md": record("loop", { title: "Mgr", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);

        // NON-VACUITY FIRST: the idless record really did load, and its edge really did reach the
        // model — otherwise the guard below is never exercised and this case decides nothing.
        const nameless = result.nodes.find((entry) => entry.id === null);
        assert.ok(nameless, "the record with no `id:` is a node the loader kept");
        assert.deepEqual(
          nameless.edges["target-setting"].map((entry) => entry.raw), ["loop:build"],
          "…and it genuinely declares the target-setting edge whose source has no id",
        );

        const document = jsonOf(SHOW, result);
        assert.deepEqual(
          nodeFor(document, "loop:build").referenceSetters, ["loop:mgr"],
          "only the record that declared an id is named — a nameless source is no setter",
        );
        for (const node of document.nodes) {
          for (const setter of node.referenceSetters) {
            assert.equal(typeof setter, "string", `${node.id}: every entry is a STRING, never null`);
            assert.notEqual(setter, "", `${node.id}: …and never the empty string`);
          }
        }
        const line = lineFor(renderOf(SHOW, result), "loop:build");
        assert.equal(line, "loop:build · loop · Build · layer operational · reference set by loop:mgr");
        assert.equal(line.includes("by , "), false, "the human line carries no blank setter");
        assert.deepEqual(line.split(" · ").filter((segment) => segment.trim() === ""), [], "…and no empty segment anywhere");
      });
    },
  },
  {
    name: "loops-face/00 two records declaring the same id are one setter, named once",
    run: async () => {
      // Two records may legally carry the SAME `id:` — the loader reports `loop-id-mismatch` on
      // the one whose stem disagrees and keeps both nodes. Both then declare the same inbound
      // edge, and the dedup in the setter computation is what stops the face from reading
      // `… · reference set by loop:mgr, loop:mgr` and the machine face from carrying the id twice.
      await withWorkspace({
        "mgr.md": record("loop", { id: "loop:mgr", title: "Mgr", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "duplicate.md": record("loop", { id: "loop:mgr", title: "Mgr again", fields: { layer: "management", "target-setting": "[loop:build]" } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);

        // NON-VACUITY: two distinct records, one id, and BOTH declaring the edge.
        const sharing = result.nodes.filter((entry) => entry.id === "loop:mgr");
        assert.equal(sharing.length, 2, "two records share the id");
        assert.equal(new Set(sharing.map((entry) => entry.path)).size, 2, "…and they are two different files");
        for (const entry of sharing) {
          assert.deepEqual(entry.edges["target-setting"].map((edge) => edge.raw), ["loop:build"], "…each declaring the same inbound edge");
        }

        assert.deepEqual(
          nodeFor(jsonOf(SHOW, result), "loop:build").referenceSetters, ["loop:mgr"],
          "the id appears once — the setters are a set of ids, not a tally of declarations",
        );
        const line = lineFor(renderOf(SHOW, result), "loop:build");
        assert.equal(line, "loop:build · loop · Build · layer operational · reference set by loop:mgr");
        assert.equal(line.includes("loop:mgr, loop:mgr"), false, "the human line names it once");
      });
    },
  },
  {
    name: "loops-face/00 a loop pointing a target-setting edge at itself is not its own supervisor",
    run: async () => {
      await withWorkspace({
        "solo.md": record("loop", { title: "Solo", fields: { layer: "operational", "target-setting": "[loop:solo]" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        assert.deepEqual(nodeFor(jsonOf(SHOW, result), "loop:solo").referenceSetters, []);
        assert.ok(lineFor(renderOf(SHOW, result), "loop:solo").endsWith("· no declared reference-setter"), "its human line says so in words");
        // Non-vacuity: the self-edge really was declared and really did reach the model.
        assert.deepEqual(
          result.nodes[0].edges["target-setting"].map((entry) => entry.raw), ["loop:solo"],
          "the record genuinely declares the self-edge",
        );

        // THE FACE AND THE CHECK AGREE ON WHAT A SELF-EDGE IS WORTH.
        const validated = await runCommand(VALIDATE, {}, fixture);
        const codes = validated.findings.filter((finding) => finding.path === fixture.pathOf("solo.md")).map((finding) => finding.code);
        assert.ok(codes.includes("loop-unowned-reference"), `validate reports loop:solo as unowned — got ${JSON.stringify(codes)}`);
        assert.ok(codes.includes("loop-self-referential-edge"), "…and names the self-edge for what it is");
      });
    },
  },
  {
    name: "loops-face/00 `owner:` is a different fact and the face never conflates the two",
    run: async () => {
      await withWorkspace({
        "orphan.md": record("loop", { title: "Orphan", fields: { layer: "operational", owner: "actor:root" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        const orphan = nodeFor(jsonOf(SHOW, result), "loop:orphan");
        assert.deepEqual(orphan.referenceSetters, [], "no record declares a target-setting edge naming it");
        assert.equal(orphan.fields.owner.raw, "actor:root", "fields.owner is unchanged, still carrying actor:root");
        assert.equal(orphan.fields.owner.kind, "ref", "…in the shape the loader gave it");
        assert.ok(
          lineFor(renderOf(SHOW, result), "loop:orphan").endsWith("· no declared reference-setter"),
          "its human line says so although an owner is declared — two adjacent facts, reported apart",
        );
        assert.equal(lineFor(renderOf(SHOW, result), "loop:orphan").includes("actor:root"), false, "the owner is never printed as the setter");
      });
    },
  },
  {
    name: "loops-face/00 a setter declared by a kind that may not set one is still named",
    run: async () => {
      await withWorkspace({
        "eye.md": record("watcher", { id: "watcher:eye", title: "Eye", fields: { "target-setting": "[loop:build]" } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
      }, async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        assert.deepEqual(
          nodeFor(jsonOf(SHOW, result), "loop:build").referenceSetters, ["watcher:eye"],
          "the declaration is reported as it stands",
        );
        const line = lineFor(renderOf(SHOW, result), "loop:build");
        assert.equal(line, "loop:build · loop · Build · layer operational · reference set by watcher:eye");
        for (const verdict of ["not admitted", "inadmissible", "invalid", "warning", "error", "!"]) {
          assert.equal(line.includes(verdict), false, `nothing on the face marks the declaration good or bad (${verdict})`);
        }
        // …AND THE JUDGEMENT LIVES WHERE IT BELONGS, which is what makes the silence above a
        // division of labour rather than a gap.
        const validated = await runCommand(VALIDATE, {}, fixture);
        assert.ok(
          validated.findings.some((finding) => finding.code === "loop-target-setting-not-admitted"),
          "`aof work loops validate` is where such a declaration is judged",
        );

        const spawned = runCli(["work", "loops", "show"], fixture.projectRoot);
        assert.equal(spawned.status, 0, `the process exits 0 (stderr: ${spawned.stderr})`);
      });
    },
  },
  {
    name: "loops-face/00 an absent registry is untouched by this story",
    run: async () => {
      await withoutRegistry(async (fixture) => {
        const result = await runCommand(SHOW, {}, fixture);
        const rendered = renderOf(SHOW, result);
        const match = rendered.match(/^No loop registry is declared at (.+)\.$/u);
        assert.ok(match, `the output states that no loop registry is declared — got ${JSON.stringify(rendered)}`);
        // COMPARED WITH `path.relative`, NOT WITH `===`. `path.resolve` inherits the DRIVE-LETTER
        // CASE of the cwd it resolves against, and the runner's cwd is whatever launched it —
        // measured: with cwd `c:\Source\umami\aof` the same registry resolves to
        // `c:\Users\…` while `mkdtemp` returned `C:\Users\…`, and a strict `===` reds on the
        // drive letter alone. `path.relative(a, b) === ""` is the platform's own case rule and is
        // stable under both. (The sibling suite escapes this only because it resolves against a
        // fixture path, never against the real cwd.)
        assert.equal(
          path.relative(path.resolve(process.cwd(), match[1]), fixture.loopsDir), "",
          "…naming the directory it looked in",
        );
        assert.equal(match[1], path.relative(process.cwd(), fixture.loopsDir) || ".", "…relativised against the invocation cwd");
        assert.equal(rendered.includes("layer"), false, "no layer text is printed");
        assert.equal(rendered.includes("reference set by"), false, "no reference-setter text is printed");
        assert.equal(rendered.includes("no declared reference-setter"), false, "…and no absence is announced either");

        const spawned = runCli(["work", "loops", "show"], fixture.projectRoot);
        assert.equal(spawned.status, 0, `the process exits 0 (stderr: ${spawned.stderr})`);
        assert.match(spawned.stdout, /No loop registry is declared at /u, "the spawned face says the same thing");
      });
    },
  },
  {
    name: "loops-face/00 what the registry declares is what the face reports (table)",
    run: async () => {
      for (const [index, row] of FACE_ROWS.entries()) {
        const label = `row ${index}: kind ${row.kind}, layer ${row.layer ?? "(undeclared)"}, set by ${row.sets.length === 0 ? "(nobody)" : row.sets.join(" and ")}`;
        const subjectId = `${row.kind}:subject`;
        const files = { "subject.md": record(row.kind, { id: subjectId, title: "Subject", fields: row.layer == null ? {} : { layer: row.layer } }) };
        if (row.sets.includes("self")) {
          files["subject.md"] = record(row.kind, {
            id: subjectId, title: "Subject",
            fields: { ...(row.layer == null ? {} : { layer: row.layer }), "target-setting": `[${subjectId}]` },
          });
        }
        if (row.sets.includes("loop:mgr")) files["mgr.md"] = record("loop", { title: "Mgr", fields: { layer: "governance", "target-setting": `[${subjectId}]` } });
        if (row.sets.includes("actor:root")) files["root.md"] = record("actor", { title: "Root", fields: { "target-setting": `[${subjectId}]` } });
        if (row.sets.includes("actor:operator")) files["operator.md"] = record("actor", { title: "Operator", fields: { "target-setting": `[${subjectId}]` } });

        await withWorkspace(files, async (fixture) => {
          const result = await runCommand(SHOW, {}, fixture);
          const line = lineFor(renderOf(SHOW, result), subjectId);
          assert.equal(
            line, `${subjectId} · ${row.kind} · Subject${row.segments}`,
            `${label}: the line carries exactly \`${row.segments || "(nothing)"}\` after its title`,
          );
          assert.deepEqual(nodeFor(jsonOf(SHOW, result), subjectId).referenceSetters, row.setters, `${label}: referenceSetters`);
        });
      }
      assert.equal(FACE_ROWS.length, 11, "every Examples row of `00_the-face-names-the-supervisor` is driven");
      assert.deepEqual(
        [...new Set(FACE_ROWS.map((row) => row.kind))].sort(), ["actor", "anchor", "arbiter", "loop", "watcher"],
        "…and the table reaches every declared kind",
      );
    },
  },

  // -------------------------------------------------------------------------------------------
  // 01_every-kind-has-its-own-shape
  // -------------------------------------------------------------------------------------------
  {
    name: "loops-face/01 the five declared kinds are five different pictures",
    run: async () => {
      await withWorkspace(everyKind(), async (fixture) => {
        const result = await runCommand(GRAPH, {}, fixture);
        assert.equal(result.text.split("\n")[0].startsWith("flowchart"), true, "the diagram's first line begins with flowchart");
        const lines = nodeLines(result.text);
        assert.equal(lines.length, 5, "each of the 5 nodes has its own node line");
        const shapes = lines.map(shapeOf);
        assert.equal(new Set(shapes).size, 5, `the 5 lines use 5 different shape delimiters — no two kinds collide: ${JSON.stringify(shapes)}`);

        // THE THREE THAT RENDERED IDENTICALLY BEFORE THIS STORY, told apart — and told apart from
        // the shape an endpoint nobody declared is given.
        const three = ["anchor:policy", "watcher:eye", "arbiter:trade-off"].map((id) => {
          const key = id.replace(/[^A-Za-z0-9_]/gu, "_");
          const line = graphLine(result.text, key);
          assert.ok(line, `${id}: a node line was emitted`);
          return { id, line };
        });
        assert.equal(new Set(three.map((entry) => shapeOf(entry.line))).size, 3, "the anchor, the watcher and the arbiter each use different delimiters from the other two");
        for (const entry of three) {
          assert.notEqual(shapeOf(entry.line), FALLBACK_SHAPE, `${entry.id}: none of the three uses the delimiters an endpoint nobody declared is given`);
          const title = { "anchor:policy": "Policy", "watcher:eye": "Eye", "arbiter:trade-off": "Trade-off" }[entry.id];
          assert.ok(entry.line.includes(`"${entry.id} · ${title}"`), `${entry.id}: carries the label \`<id> · <title>\`, not the bare id an undeclared endpoint carries`);
        }

        const spawned = runCli(["work", "loops", "graph"], fixture.projectRoot);
        assert.equal(spawned.status, 0, `aof work loops graph exits 0 (stderr: ${spawned.stderr})`);
        assert.equal(spawned.stdout, `${result.text}\n`, "…and prints the same diagram");
      });
    },
  },
  {
    name: "loops-face/01 the fallback for an endpoint nobody declared is unchanged",
    run: async () => {
      await withWorkspace({
        "build.md": record("loop", {
          title: "Build",
          fields: {
            layer: "operational",
            monitoring: "[command:work:next]",
            "parameter-tuning": "[config:work.foo]",
            "data-feed": "[module:src/run-store.mjs#isStale]",
            veto: "[loop:nowhere]",
          },
        }),
      }, async (fixture) => {
        const result = await runCommand(GRAPH, {}, fixture);
        const lines = nodeLines(result.text).map((line) => line.trim());
        // BYTE-IDENTICAL TO THE LINES THE SAME REGISTRY EMITTED BEFORE THIS STORY — the four
        // literals `test/arch/loop/acd-loop-render-deterministic.test.mjs` pins, restated here over
        // records on disk rather than over a hand-built model.
        for (const line of [
          'command_work_next[/"command:work:next"/]',
          'config_work_foo[/"config:work.foo"/]',
          'module_src_run_store_mjs_isStale[/"module:src/run-store.mjs#isStale"/]',
          'loop_nowhere[/"loop:nowhere"/]',
        ]) {
          assert.ok(lines.includes(line), `the parallelogram is emitted verbatim: ${line}`);
          assert.equal(shapeOf(line), FALLBACK_SHAPE, "…carrying its raw text and no title");
          assert.equal(line.includes(" · "), false, "…and no separator");
        }
        assert.equal(lines.length, 5, "four undeclared endpoints and the one declared record");
        assert.equal(
          shapeOf(graphLine(result.text, "loop_build")), String.raw`["…"]`,
          "no declared kind is rendered in that shape",
        );
      });
    },
  },
  {
    name: "loops-face/01 a record whose kind the vocabulary does not admit borrows no kind's glyph",
    run: async () => {
      await withWorkspace({
        "odd.md": identityRecord({ id: "gizmo:odd", kind: "gizmo", title: "Odd" }),
      }, async (fixture) => {
        const spawned = runCli(["work", "loops", "graph", "--json"], fixture.projectRoot);
        assert.equal(spawned.status, 0, `the process exits 0 (stderr: ${spawned.stderr})`);
        const document = oneJsonDocument(spawned, "graph --json");
        assert.equal(document.text.split("\n")[0], "flowchart LR", "the diagram is emitted");

        const line = graphLine(document.text, "gizmo_odd");
        assert.equal(line.trim(), 'gizmo_odd[/"gizmo:odd"/]', "that node renders in the undeclared-endpoint shape");
        assert.equal(shapeOf(line), FALLBACK_SHAPE);
        for (const row of GLYPH_ROWS) {
          assert.notEqual(shapeOf(line), shapeOf(`  ${row.line}`), `it is drawn as no ${row.kind}`);
        }
        // NON-VACUITY: the record really did load, and the kind really is the one that is not admitted.
        const before = await loadLoops(fixture.aofDir);
        assert.equal(before.nodes.length, 1, "the record loaded");
        assert.equal(before.nodes[0].kind, null, "…with its kind suspended, because the vocabulary does not admit it");
        assert.ok(before.findings.some((finding) => finding.code === "loop-bad-value"), "…and the loader said so");
      });
    },
  },
  {
    name: "loops-face/01 the same registry renders byte-identically, twice over and in a second process",
    run: async () => {
      // Five kinds and five edges between them.
      await withWorkspace(everyKind({
        actor: { fields: { "target-setting": "[arbiter:trade-off]" } },
        arbiter: { fields: { veto: "[loop:build]", "parameter-tuning": "[config:work.loop.reviewRounds]" } },
        anchor: { fields: { "data-feed": "[loop:build]" } },
        watcher: { fields: { monitoring: "[loop:build]" } },
      }), async (fixture) => {
        const first = await runCommand(GRAPH, {}, fixture);
        const second = await runCommand(GRAPH, {}, fixture);
        assert.equal(second.text, first.text, "twice in one process");
        assert.equal(first.edgeCount, 5, "non-vacuity: the registry really carries five edges");

        const third = runCli(["work", "loops", "graph"], fixture.projectRoot);
        const fourth = runCli(["work", "loops", "graph"], fixture.projectRoot);
        assert.equal(third.status, 0, `graph exits 0 (stderr: ${third.stderr})`);
        assert.equal(fourth.status, 0, `graph exits 0 (stderr: ${fourth.stderr})`);
        assert.equal(third.stdout, `${first.text}\n`, "…and once more in a separate process — the three texts are byte-identical");
        assert.equal(fourth.stdout, third.stdout, "two separate processes emit byte-identical diagrams");
      });
    },
  },
  {
    name: "loops-face/01 the picture does not depend on the order the records were discovered",
    run: async () => {
      const authored = {
        "policy.md": record("anchor", { id: "anchor:policy", title: "Policy" }),
        "operator.md": record("actor", { title: "Operator" }),
        "trade-off.md": record("arbiter", { id: "arbiter:trade-off", title: "Trade-off" }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational" } }),
        "eye.md": record("watcher", { id: "watcher:eye", title: "Eye" }),
      };
      const textFor = (files) => withWorkspace(files, async (fixture) => (await runCommand(GRAPH, {}, fixture)).text);

      const forward = await textFor(authored);
      const backward = await textFor(reversedFiles(authored));
      assert.equal(backward, forward, "the two texts are byte-identical");
      assert.deepEqual(
        nodeLines(forward).map((line) => line.trim().split(/[[({]/u, 1)[0]),
        ["actor_operator", "anchor_policy", "arbiter_trade_off", "loop_build", "watcher_eye"],
        "the node lines appear in lexicographic id order — the shapes do not group the picture by kind",
      );

      // …AND THE ORDER IS UNCHANGED WHEN THE FILES ARE RENAMED TO CHANGE DIRECTORY READ ORDER.
      const renamed = {
        "1-eye.md": record("watcher", { id: "watcher:eye", title: "Eye" }),
        "2-build.md": record("loop", { id: "loop:build", title: "Build", fields: { layer: "operational" } }),
        "3-trade-off.md": record("arbiter", { id: "arbiter:trade-off", title: "Trade-off" }),
        "4-operator.md": record("actor", { id: "actor:operator", title: "Operator" }),
        "5-policy.md": record("anchor", { id: "anchor:policy", title: "Policy" }),
      };
      const renamedText = await textFor(renamed);
      assert.deepEqual(nodeLines(renamedText), nodeLines(forward), "renaming the record files changes neither the order nor the lines");
    },
  },
  {
    name: "loops-face/01 a registry holding every declared kind draws every one of them, and the edges between them",
    run: async () => {
      await withWorkspace(everyKind({
        actor: { fields: { "target-setting": "[arbiter:trade-off]" } },
        arbiter: { fields: { veto: "[loop:build]", "parameter-tuning": "[config:work.loop.reviewRounds]" } },
        anchor: { fields: { "data-feed": "[loop:build]" } },
        watcher: { fields: { monitoring: "[loop:build]" } },
      }), async (fixture) => {
        const result = await runCommand(GRAPH, {}, fixture);
        const lines = nodeLines(result.text);
        assert.equal(lines.length, 6, "a node line for each of the 5 declared nodes and one for the config: endpoint");
        for (const key of ["actor_operator", "anchor_policy", "arbiter_trade_off", "loop_build", "watcher_eye", "config_work_loop_reviewRounds"]) {
          assert.ok(graphLine(result.text, key), `${key}: has its own node line`);
        }

        assert.deepEqual(edgeLines(result.text), [
          "  actor_operator -->|target-setting| arbiter_trade_off",
          "  anchor_policy -->|data-feed| loop_build",
          "  arbiter_trade_off -->|parameter-tuning| config_work_loop_reviewRounds",
          "  arbiter_trade_off -->|veto| loop_build",
          "  watcher_eye -->|monitoring| loop_build",
        ], "5 edge lines, each labelled with its own edge type");
        assert.equal(new Set(edgeLines(result.text).map((line) => line.split("|")[1])).size, 5, "…and no two share an edge type");

        // EVERY KEY NAMED ON AN EDGE LINE IS THE KEY OF A NODE LINE IN THE SAME TEXT.
        const nodeKeys = new Set(lines.map((line) => line.trim().split(/[[({]/u, 1)[0]));
        for (const line of edgeLines(result.text)) {
          const [source, target] = [line.trim().split(" -->|")[0], line.trim().split("| ")[1]];
          assert.ok(nodeKeys.has(source), `${line}: the source key names a node line`);
          assert.ok(nodeKeys.has(target), `${line}: the target key names a node line`);
        }

        assert.equal(result.nodeCount, 5, "nodeCount is 5 — the declared records");
        assert.equal(result.edgeCount, 5, "edgeCount is 5 — every authored edge");
        const show = await runCommand(SHOW, {}, fixture);
        assert.equal(result.nodeCount, show.nodes.length, "…both meaning exactly what they meant before the new kinds existed");
        assert.ok(result.nodeCount < lines.length, "nodeCount is still smaller than the number of node lines — the contract, not a defect");
      });
    },
  },
  {
    name: "loops-face/01 every declared node carries its id and its title, whatever its kind",
    run: async () => {
      await withWorkspace({
        ...everyKind({ anchor: { title: null } }),
        "build.md": record("loop", { title: "Build", fields: { layer: "operational", monitoring: "[command:work:next]" } }),
      }, async (fixture) => {
        const result = await runCommand(GRAPH, {}, fixture);
        const expected = {
          "loop:build": 'loop_build["loop:build · Build"]',
          "actor:operator": 'actor_operator(["actor:operator · Operator"])',
          "anchor:policy": 'anchor_policy(("anchor:policy · -"))',
          "watcher:eye": 'watcher_eye{{"watcher:eye · Eye"}}',
          "arbiter:trade-off": 'arbiter_trade_off{"arbiter:trade-off · Trade-off"}',
        };
        for (const [id, line] of Object.entries(expected)) {
          assert.equal(graphLine(result.text, line.split(/[[({]/u, 1)[0]).trim(), line, `${id}: \`<id> · <title>\`, in the shape its own kind is given`);
        }
        assert.equal(
          graphLine(result.text, "anchor_policy").trim(), 'anchor_policy(("anchor:policy · -"))',
          "the one with no title reads `<id> · -`, in its own kind's shape rather than a different one",
        );
        assert.notEqual(shapeOf(graphLine(result.text, "anchor_policy")), FALLBACK_SHAPE, "…and not in the fallback");
        assert.equal(
          graphLine(result.text, "command_work_next").trim(), 'command_work_next[/"command:work:next"/]',
          "an undeclared endpoint still carries its raw text alone, with no separator and no title",
        );
      });
    },
  },
  {
    name: "loops-face/01 node keys and edge lines are untouched by the new shapes",
    run: async () => {
      await withWorkspace({
        "run-lifecycle-policy.md": record("anchor", { id: "anchor:run-lifecycle-policy", title: "Run lifecycle policy" }),
        "speed-thoroughness-autonomy.md": record("arbiter", {
          id: "arbiter:speed-thoroughness-autonomy", title: "Speed versus thoroughness versus autonomy",
          fields: { "parameter-tuning": "[config:work.loop.reviewRounds]" },
        }),
      }, async (fixture) => {
        const result = await runCommand(GRAPH, {}, fixture);
        const lines = nodeLines(result.text);
        const keys = lines.map((line) => line.trim().split(/[[({]/u, 1)[0]);
        assert.ok(keys.includes("anchor_run_lifecycle_policy"), "the anchor's node key is the same total mangling every id gets");
        assert.ok(keys.includes("arbiter_speed_thoroughness_autonomy"), "…and so is the arbiter's");
        for (const key of keys) {
          assert.equal(key.includes(":"), false, `${key}: no node key contains a ":"`);
          assert.equal(key.includes("-"), false, `${key}: no node key contains a "-"`);
          assert.match(key, /^[A-Za-z0-9_]+$/u, `${key}: the mangling is total`);
        }
        assert.equal(new Set(keys).size, keys.length, "no two node lines share a node key");
        assert.deepEqual(edgeLines(result.text), [
          "  arbiter_speed_thoroughness_autonomy -->|parameter-tuning| config_work_loop_reviewRounds",
        ], "an edge line is still `<source key> -->|<edge type>| <target key>`");
      });
    },
  },
  {
    name: "loops-face/01 a declared kind, and the shape it renders as (table)",
    run: async () => {
      const emitted = new Map();
      for (const row of GLYPH_ROWS) {
        await withWorkspace({ "x.md": record(row.kind, { id: `${row.kind}:x`, title: "T" }) }, async (fixture) => {
          const result = await runCommand(GRAPH, {}, fixture);
          const lines = nodeLines(result.text);
          assert.equal(lines.length, 1, `${row.kind}: the single record is the whole picture`);
          assert.equal(lines[0].trim(), row.line, `${row.kind} (${row.shape}, reads as ${row.reads}): the emitted line is exactly \`${row.line}\``);
          assert.notEqual(shapeOf(lines[0]), FALLBACK_SHAPE, `${row.kind}: that shape is not the one an endpoint nobody declared is given`);
          emitted.set(row.kind, shapeOf(lines[0]));
        });
      }
      assert.equal(GLYPH_ROWS.length, 5, "every Examples row of `01_every-kind-has-its-own-shape` table 1 is driven");
      assert.equal(new Set(emitted.values()).size, 5, `no other declared kind emits any of these shapes: ${JSON.stringify([...emitted])}`);
    },
  },
  {
    name: "loops-face/01 an endpoint nobody declared keeps the shape it already has (table)",
    run: async () => {
      for (const row of FALLBACK_ROWS) {
        await withWorkspace({
          "build.md": record("loop", { title: "Build", fields: { layer: "operational", monitoring: `[${row.endpoint}]` } }),
        }, async (fixture) => {
          const result = await runCommand(GRAPH, {}, fixture);
          const key = row.line.split("[", 1)[0];
          assert.equal(graphLine(result.text, key).trim(), row.line, `${row.endpoint}: the line is exactly \`${row.line}\``);
          assert.equal(graphLine(result.text, key).includes(` · `), false, `${row.endpoint}: its label is the raw endpoint text, carrying no title`);
          assert.equal(shapeOf(graphLine(result.text, key)), FALLBACK_SHAPE, `${row.endpoint}: the shape it already has`);
          assert.notEqual(shapeOf(graphLine(result.text, "loop_build")), FALLBACK_SHAPE, `${row.endpoint}: no declared kind emits that shape`);
        });
      }
      assert.equal(FALLBACK_ROWS.length, 4, "every Examples row of `01_every-kind-has-its-own-shape` table 2 is driven");
    },
  },
];
