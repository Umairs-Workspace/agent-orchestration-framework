import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcRoot = path.join(root, "src");
const driver = path.join(root, "src", "agent-session-driver.mjs");
const sink = path.join(root, "src", "mesh", "worker-execution.mjs");
const EXPECTED_DIRECT = Object.freeze([
  "claude-trust.mjs", "degrade.mjs", "terminal-providers.mjs", "terminal-ws.mjs", "work/observe.mjs",
  // milestone 68/01 added the pure OTel builder (ADR-005 §2); milestone 70/00 adds the pure
  // phase-brief compiler (ADR-002). Both are pure leaves imported WITHOUT re-export — the
  // driver's frozen EXPORT set (FF-5302) is untouched. `otel-attribution.mjs` was landed by
  // 68 but never added here — a pre-existing red this file now records, not causes.
  "otel-attribution.mjs", "phase-brief.mjs",
  // milestone 69/01–69/02 add the declared-bound resolver (69/ADR-001, ADR-002): the driver's
  // liveness idle window and its per-attempt deadline both resolve through the ONE bound home
  // rather than a literal of their own, which is what FF-6901 pins. `loop-bounds.mjs` is a
  // ZERO-IMPORT leaf — it appears in no DENIED_TRANSITIVE subtree and adds exactly one node to
  // the reach — and it is imported WITHOUT re-export, so FF-5302's frozen export set is
  // untouched. Recorded here at `aof:verify 69` (VERIFICATION F-69-V10); the import had been
  // live since 69/01–02 merged with this census unmoved.
  "loop-bounds.mjs",
]);
const DENIED_TRANSITIVE = Object.freeze([
  "run-store.mjs", "global-work-store.mjs", "workspace-identity.mjs", "item-lock.mjs",
  "effects/", "board-*.mjs", "commands/",
  "mesh/worker-execution.mjs", "mesh/worktree.mjs", "mesh/presence.mjs", "mesh/repo-marker.mjs",
  "mesh/launcher.mjs", "mesh/session-spawn-handler.mjs", "mesh/clone-credential-provider.mjs",
  "mesh/assignment-reclaim.mjs",
]);
const TOKENS = Object.freeze(["assignmentId", "workspaceId", "leaseId", "assignment"]);

// The STATIC closure — the reach ceilings below are counts of what module init loads, so a deferred
// `import()` is a door this walk deliberately does not open.
function specifiers(source) {
  return importSpecifiers(source).filter((entry) => !entry.dynamic).map((entry) => entry.specifier);
}

async function walkImports(entry) {
  const seen = new Set();
  const paths = new Map([[path.resolve(entry), [path.resolve(entry)]]]);
  const edges = [];
  async function visit(file) {
    const resolved = path.resolve(file);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    const source = await readFile(resolved, "utf8");
    for (const specifier of specifiers(source)) {
      if (!specifier.startsWith(".")) continue;
      const target = path.resolve(path.dirname(resolved), specifier);
      edges.push([resolved, target]);
      if (!paths.has(target)) paths.set(target, [...paths.get(resolved), target]);
      await visit(target);
    }
  }
  await visit(entry);
  return { root: path.resolve(entry), seen, paths, edges };
}

function directSourceImports(source) {
  return specifiers(source)
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => path.relative(srcRoot, path.resolve(path.dirname(driver), specifier)).replaceAll("\\", "/"))
    .sort();
}

function isDeniedTransitive(rel) {
  if (DENIED_TRANSITIVE.includes(rel)) return true;
  if (rel.startsWith("effects/") || rel.startsWith("commands/")) return true;
  return /^board-.*\.mjs$/u.test(rel);
}

function deniedPaths(graph, graphRoot = srcRoot) {
  return [...graph.paths.entries()].filter(([file]) => {
    if (file === graph.root) return false;
    const rel = path.relative(graphRoot, file).replaceAll("\\", "/");
    return isDeniedTransitive(rel);
  });
}

function incoming(graph, target) {
  return graph.edges
    .filter(([, to]) => to === target)
    .map(([from]) => path.relative(srcRoot, from).replaceAll("\\", "/"))
    .sort();
}

export const archTests = [
  {
    name: "arch/53 FF-5301 (acd-session-driver-mesh-blind): frozen direct imports, lifecycle denylist, named admissions, and reach ceilings stay exact",
    run: async () => {
      const source = await readFile(driver, "utf8");
      assert.deepEqual(directSourceImports(source), [...EXPECTED_DIRECT].sort(), "the driver's direct source-import set is the frozen set, including export-from");
      const graph = await walkImports(driver);
      assert.ok(graph.seen.has(driver), "the import walk visited its root");
      assert.ok(graph.seen.size > 1, `the root-inclusive import walk was non-vacuous: ${graph.seen.size} modules`);
      assert.ok(graph.seen.size <= 24, `root-inclusive driver reach ${graph.seen.size} exceeds the ADR-015 §5 ceiling 24; raising it requires an ADR (reach 22 = 68/01's otel-attribution, 23 = 70/00's phase-brief, 24 = 69/01-02's loop-bounds — see 69/ARCHITECTURE.md ADR-002 and VERIFICATION F-69-V10)`);
      assert.deepEqual(deniedPaths(graph), [], "mesh lifecycle import chains are forbidden from the local session driver");

      const terminalWs = path.join(srcRoot, "terminal-ws.mjs");
      const work = path.join(srcRoot, "work.mjs");
      const degrade = path.join(srcRoot, "degrade.mjs");
      const meshLog = path.join(srcRoot, "mesh/log.mjs");
      const workspace = path.join(srcRoot, "workspace.mjs");
      // milestone 127/01 (127/ADR-001 §5) adds a SECOND route into work.mjs: `work/observe.mjs`
      // was an eighth work-root scanner (three functions `readdir`-ing `<cwd>/wiki/work` with a
      // `/^(\d+)_/` of their own) and now takes its items from the ONE enumerator, `listItems`.
      // The driver reaches observe.mjs only for `claudeProjectsDir` (a pure path helper), and
      // work.mjs was ALREADY in its closure through terminal-ws.mjs — so the reach count above
      // is unchanged and no denied subtree is entered; only the set of edges into an admitted
      // module grows by one. Recorded here at 127/01's build (FF-12701 is the control that
      // holds observe.mjs to the enumerator), for `aof:verify 127` to ratify.
      assert.deepEqual(incoming(graph, work), ["terminal-ws.mjs", "work/observe.mjs"], "the admitted work.mjs routes are exactly terminal-ws.mjs -> work.mjs and work/observe.mjs -> work.mjs (127/01)");
      assert.deepEqual(incoming(graph, meshLog), ["degrade.mjs"], "the admitted mesh-log.mjs route is exactly degrade.mjs -> mesh-log.mjs");
      assert.deepEqual(incoming(graph, workspace), ["mesh/log.mjs", "work.mjs"], "workspace.mjs is reached only through the two named admitted subtrees");
      assert.ok(graph.edges.some(([from, to]) => from === terminalWs && to === work), "the terminal-ws admission still has a subject");
      assert.ok(graph.edges.some(([from, to]) => from === degrade && to === meshLog), "the degrade admission still has a subject");

      const sinkGraph = await walkImports(sink);
      // Architect-approved milestone-70 integration extension: m68's run-session-capture
      // contribution and m70's phase-brief-read + phase-brief path made the exact reach 59.
      // Milestone 69 adds THREE more, all zero- or shallow-dependency leaves reached only
      // from this sink: 69/01's `run-heartbeat-consumption.mjs`, 69/02's `loop-bounds.mjs`
      // and 69/05's `mesh-park-resume.mjs` (69/ADR-002, ADR-003, ADR-007). No driver ceiling,
      // denylist, or other sink admission moves with this count — recorded at `aof:verify 69`,
      // VERIFICATION F-69-V10.
      //
      // MILESTONE 61/05 ADDS FOUR, and they arrive through ONE declared edge: the effects
      // table's ninth consequence (`harness.ruled` / stamp-evidence, 61/ADR-007 §2) appends
      // the acceptor's ruling record, and ADR-006 §4 puts BOTH of a ruling's writes behind
      // one I/O home — so `effects/table.mjs`, which this sink already reached, now imports
      // `work-acceptor/store.mjs`. The four are `work-acceptor/{store,criterion,ledger}.mjs`
      // and `frozen-set.mjs`; `acceptance-horizon.mjs` and `asset-base.mjs` were in the
      // closure already and are unchanged. MEASURED, not estimated: 63 before the edge, 67
      // after. `ledger.mjs` is a ZERO-IMPORT leaf, `criterion.mjs` reaches only those two
      // already-present modules plus `frozen-set.mjs`, and no DENIED_TRANSITIVE subtree is
      // entered — the driver's own ceiling above is untouched, which is what the two
      // assertions on either side of this one keep saying.
      //
      // MILESTONE 63/03 ADDS ONE, and it arrives through the CONTROL side rather than
      // through anything this sink imports directly. ADR-010 §3 refuses a story-shaped ref
      // at the dispatch, and the refusal must use 53's OWN scope grammar rather than a
      // second copy of it — so `mesh-assignment-directive.mjs`, which this sink already
      // reaches through `mesh-assignment.mjs`, now imports `decideLoopScope` from
      // `work-loop.mjs`. `work-loop.mjs` imports NOTHING AT ALL (53/ADR
      // `work-loop-determinism`: "the module copied alone decides with every source
      // dependency absent"), so it adds exactly one node, enters no DENIED_TRANSITIVE
      // subtree and moves no driver ceiling. MEASURED, not estimated: 67 before the edge,
      // 68 after. The sink's own new edge — `frozen-set.mjs`, 63/ADR-012 §3's caller-side
      // obligation — adds NO node: 61/05's ledger-append edge already reached it.
      //
      // MILESTONE 119/04 ADDS TWO, and they are the sink's OWN body rather than anything new it
      // reaches: item 83's seams 2 and 1 became `mesh/worker-launch.mjs` and
      // `mesh/worker-repo-admission.mjs`, so two modules now stand where inline code stood. Every
      // module either of them imports — `frozen-set.mjs`, `mesh/repo-marker.mjs`, `work.mjs`,
      // `workspace.mjs`, `global-work-store.mjs`, `workspace-identity.mjs`, `fs.mjs` — was already
      // in this closure, because the sink imported all of them itself before the split. So the
      // reach grows by exactly the two new NODES and by nothing behind them: no DENIED_TRANSITIVE
      // subtree is entered, no lifecycle denylist is relaxed, and the driver's own ceiling above is
      // untouched. MEASURED, not estimated: 68 before the split, 70 after. A number that moved
      // because a file was cut in three is the cheapest kind of movement this ratchet can see, and
      // it is still written down rather than absorbed.
      //
      // MILESTONE 126/05 ADDS ONE, and it is a LEAF the closure already reached the work of:
      // `global-work-store.mjs` and `effects/journal.mjs` each held their own
      // `await import("node:sqlite")`, and both collapsed onto `sqlite-runtime.mjs` so the
      // ExperimentalWarning could be filtered at one home rather than suppressed by a blanket
      // flag. The new node imports NOTHING — not a project module and not a `node:` builtin
      // beyond the dynamic `node:sqlite` it exists to load — so the reach grows by exactly one
      // node and by nothing behind it: no DENIED_TRANSITIVE subtree is entered and no
      // lifecycle denylist is relaxed. MEASURED: 70 before, 71 after. It is the same species
      // of movement as 119/04's split — a number that moved because one act stopped being
      // written twice — and it is written down rather than absorbed.
      //
      // MILESTONE 129/03 ADDS TWO, and both arrive through a RE-EXPORT clause rather than through
      // anything the sink calls anew: `resolveRefInWorktree` (with its `worktreeWorkDir` helper)
      // moved OUT of the sink INTO `work/dispatch.mjs` — the lane's home — so the loop's wave can
      // resolve an item as it lives in a lane without importing the module that imports the PTY
      // driver (129/ADR-008 §4, ADR-005 §5). The sink re-exports the name so every importer keeps
      // its line, and `export … from` counts as a static edge (`importSpecifiers` reads re-export
      // clauses), so the closure gains `work/dispatch.mjs` and its one leaf not already reached,
      // `mesh/launcher-lock.mjs` (which imports only `workspace.mjs` and `degrade.mjs`, both long
      // in this closure). `commitWorktreeChanges` moved the same way into `mesh/worktree.mjs` and
      // adds NOTHING: that module was already here. No DENIED_TRANSITIVE subtree is entered, no
      // lifecycle denylist is relaxed, and the DRIVER's legs above are untouched — the driver never
      // imports the sink, so its reach is the same 24 it was. MEASURED with this file's own walker:
      // 71 before the move, 73 after. Recorded here at 129/03's build, for `aof:verify 129` to
      // ratify; the story's feasibility note that this control would be "green unchanged" conflated
      // the driver's reach (unchanged) with the sink's (this line), and the number is written down
      // rather than absorbed.
      //
      // MILESTONE 127/04 ADDS ONE: `src/work/item-row.mjs`, the cache ROW's screen at the store
      // boundary (127/ADR-006 §1). `global-work-store.mjs` sits at its 1,280-line ratchet (43/ADR-012/B4,
      // whose escape hatch is "the next block in its own module"), so the row screen — the two new
      // location shapes, `backlog` and `archived`, and the `true → 1` bind mapping — moved into a leaf
      // the store imports and re-exports from. The chain is `global-work-publisher.mjs →
      // global-work-store.mjs → work/item-row.mjs`; the leaf imports nothing of its own, so it reaches
      // nothing behind it, enters no DENIED_TRANSITIVE subtree and relaxes no lifecycle denylist. The
      // DRIVER's reach is untouched (24). MEASURED with this file's own walker at aof:verify 127: 74.
      assert.equal(sinkGraph.seen.size, 74, "the assignment sink reach is exactly 74: 119/04's split adds its two extracted siblings, 126/05 adds the one zero-import runtime home both stores now share, 129/03's re-export of the moved ref resolver adds work/dispatch.mjs and its launcher-lock leaf, 127/04 adds the store's row-screen leaf work/item-row.mjs, and none reaches anything new behind it");
      assert.ok(sinkGraph.seen.size > graph.seen.size, `the session driver reaches ${graph.seen.size} modules versus the sink's ${sinkGraph.seen.size}`);
    },
  },
  {
    name: "arch/53 FF-5301 (acd-session-driver-mesh-blind): a two-hop laundering module is detected with its complete chain",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-ff5301-"));
      try {
        await mkdir(path.join(temp, "effects"));
        await writeFile(path.join(temp, "driver.mjs"), 'import "./launder.mjs";\n');
        await writeFile(path.join(temp, "launder.mjs"), 'import "./effects/run-transitions.mjs";\n');
        await writeFile(path.join(temp, "effects", "run-transitions.mjs"), "export const planted = true;\n");
        const graph = await walkImports(path.join(temp, "driver.mjs"));
        const target = path.join(temp, "effects", "run-transitions.mjs");
        assert.equal(graph.paths.get(target).length, 3, `full laundering chain: ${graph.paths.get(target).join(" -> ")}`);
        const violations = deniedPaths(graph, temp);
        assert.equal(violations.length, 1, "the two-hop lifecycle import is denied rather than merely visited");
        assert.equal(violations[0][0], target);
        assert.deepEqual(violations[0][1], [path.join(temp, "driver.mjs"), path.join(temp, "launder.mjs"), target]);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/53 FF-5301 (acd-session-driver-mesh-blind): the comment-stripped identity-token proxy is explicit about both its catches and its jobId false negative",
    run: async () => {
      const source = stripComments(await readFile(driver, "utf8"));
      for (const token of TOKENS) assert.doesNotMatch(source, new RegExp(`\\b${token}\\b`, "u"), `${token} is mesh identity, not session driving`);
      const proxy = (text) => TOKENS.filter((token) => new RegExp(`\\b${token}\\b`, "u").test(stripComments(text)));
      assert.deepEqual(proxy("const assignmentId = 1; const workspaceId = 2; const leaseId = 3; const assignment = 4;"), TOKENS);
      assert.deepEqual(proxy("const jobId = 1; // assignmentId is deliberately absent from code"), [], "jobId is the proxy's declared false negative; the transitive graph carries the real guarantee");
    },
  },
];
