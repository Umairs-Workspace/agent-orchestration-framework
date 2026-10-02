import { readRuntimeFiles } from "../../support/read-src-files.mjs";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const expectedLoopModules = [
  "packages/work-graph/src/registry.mjs", "packages/work-graph/src/checks.mjs", "packages/work-graph/src/commands/loops-show.mjs",
  "packages/work-graph/src/commands/loops-graph.mjs", "packages/work-graph/src/commands/loops-groundedness.mjs", "packages/work-graph/src/commands/loops-validate.mjs",
];
// THE LOOP FAMILY, AS RESOLVED PATHS. The six modules `expectedLoopModules` names are the same
// six this set holds; it is spelled separately because THIS one is compared against a resolved
// specifier and that one against a discovered listing, and collapsing them would make one
// control's answer depend on the other's.
const LOOP_FAMILY = Object.freeze(new Set([...expectedLoopModules, "packages/core/src/application/bindings/work/loops.mjs", "packages/core/src/work/loops.mjs", ...["loops-show", "loops-graph", "loops-validate", "loops-groundedness"].flatMap(name => [`packages/core/src/commands/${name}.mjs`, `packages/core/src/application/bindings/commands/${name}.mjs`])]));

// What TEXT carries and no resolver can reach: a `work:loops-*` command id, a bare `"loops-show"`
// route or id string, a prose citation, and an EXTENSIONLESS `ui/` import (Vite's default
// `resolve.extensions` includes `.mjs`, so `"../../../../packages/core/src/commands/loops-graph"` is a live
// bundler edge that resolves to no file on disk).
//
// This token is no longer the import rule — `reachesLoopFamily` is, by resolution — and that is
// the 119/01 correction: doing both jobs by spelling is what let `./loops.mjs` through once the
// doctor family became siblings of the loader. The alternatives are kept anyway because they
// cost nothing: measured over the live target set, no alternative fires anywhere, so narrowing
// bought no green and only gave back two refusals.
const forbidden = /work[-/]loops|loops-show|loops-graph|loops-groundedness|loops-validate|work:loops-/;

/**
 * Every relative specifier in `code`, resolved against the module that spells it, that lands in
 * the loop family. Returns the offending edges so a refusal names the import rather than a
 * pattern that happened to match.
 */
function reachesLoopFamily(rel, code) {
  const found = [];
  // EVERY form that loads, not the two that are conventional: a bare `import "./x.mjs"` has no
  // `from` and no paren; a dynamic `import(...)` may be spelled with a template literal. All
  // four were measured loading under Node while leaving this control green — and the one home
  // carries all four (121), the backtick form included, so this file no longer spells its own.
  for (const entry of importSpecifiers(code)) {
    // A query or fragment suffix is not part of the path Node resolves, and a `//` is not an
    // empty directory — both were spellings the walk carried through and then failed to match.
    const specifier = entry.specifier.replace(/[?#].*$/u, "");
    if (/^@aof\/work-graph\/(?:registry|checks|commands\/loops-)/.test(specifier)) {
      found.push(rel + " imports the graph package at " + specifier);
      continue;
    }
    if (!specifier.startsWith(".")) continue;
    const from = rel.split("/").slice(0, -1);
    for (const segment of specifier.split("/")) {
      if (segment === "." || segment === "") continue;
      if (segment === "..") from.pop();
      else from.push(segment);
    }
    const resolved = from.join("/");
    // An EXTENSIONLESS specifier is a live edge under a bundler (Vite resolves `.mjs`), so it is
    // resolved the way the bundler would rather than dismissed for having no extension.
    if (LOOP_FAMILY.has(resolved) || LOOP_FAMILY.has(`${resolved}.mjs`)) {
      found.push(`${rel} imports the loop family at ${resolved} (spelled "${specifier}")`);
    }
  }
  return found;
}

// DISCOVERED FROM DISK, then compared with the expected set — see the same helper in
// `acd-loop-registry-not-an-item-type.test.mjs`. `assert.equal(literal.length, 5)` asserts a
// literal against itself and reads as a non-vacuity guard while being incapable of failing; a
// sixth loop module would then be exempt from the `parseFrontmatter`-only seam below, which is
// the one seam ADR-011 §1 leaves open between the god-node and this family.
async function discoverLoopModules() {
  return (await readRuntimeFiles(root)).map(file => file.rel).filter(rel => /^packages\/work-graph\/src\/(?:registry|checks)\.mjs$/.test(rel) || /^packages\/work-graph\/src\/commands\/loops-.*\.mjs$/.test(rel)).sort();
}

// FF-5208 means `ui/` SOURCE. `ui/dist/assets/*.js` is minified onto single lines — a false-
// positive surface for the proximity regex below, where any `route`/`argv` token lands within
// 100 characters of an unrelated `"loops"` string — and `apps/ui/node_modules` is a dependency tree
// this repository does not author (empty here only because deps hoist to the root, which is an
// accident of install layout rather than a property this gate should rest on).
const UNAUTHORED = new Set(["node_modules", "dist"]);

async function filesBelow(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && UNAUTHORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await filesBelow(full));
    else if (/\.(?:mjs|js|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

export const archTests = [
  {
    name: "arch/52 FF-5202: loop modules take only parseFrontmatter from work.mjs",
    run: async () => {
      const loopModules = await discoverLoopModules();
      assert.deepEqual(loopModules, [...expectedLoopModules].sort(), "the loop modules on disk are exactly those whose work.mjs seam this gate reads");
      const discovered = [];
      for (const rel of loopModules) {
        const source = stripComments(await readFile(path.join(root, rel), "utf8"));
        for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'](@aof\/work\/records)["']/g)) {
          discovered.push({ rel, source: match[2], bindings: match[1].split(",").map((value) => value.trim()).filter(Boolean) });
        }
        assert.doesNotMatch(source, /import\s+(?:\*\s+as|[A-Za-z_$])[^;]*from\s+["'][^"']*work\.mjs["']/);
      }
      assert.deepEqual(discovered, [
        { rel: "packages/work-graph/src/registry.mjs", source: "@aof/work/records", bindings: ["parseFrontmatter"] },
      ], "the loader has exactly one work.mjs import and the other loop modules cannot widen or erase that seam");
    },
  },
  {
    name: "arch/52 FF-5202: god-node, doctor, CLI and UI do not reference the loop family",
    run: async () => {
      const targets = [path.join(root, "packages/core/src/application/bindings/work.mjs"), path.join(root, "packages/core/src/cli.mjs")];
      // Inspect implementations and transitional composition together. Counting adapters
      // alone would leave the package free to acquire a forbidden dependency unnoticed.
      const doctorFiles = (await readRuntimeFiles(root)).filter(file =>
        /^packages\/work\/src\/doctor\//u.test(file.rel) || /^src\/work\/doctor.*\.mjs$/u.test(file.rel));
      const implementations = doctorFiles.filter(file => file.rel.startsWith("packages/"));
      assert.ok(implementations.length >= 10, "all ten doctor implementation modules are inspected");
      const doctorModules = doctorFiles.map(file => file.path);
      // The floor is the DELIVERED count, not a round number below it: at `>= 7` two doctor modules
      // could leave the sweep with `ui/` keeping the target leg satisfied, which is the shape this
      // control was just repaired for. It may be lowered by a story that removes a lane, which is
      // a table edit somebody reads.
      assert.ok(doctorModules.length >= 9, `the doctor family was actually swept: ${doctorModules.length} modules under src/work/ — a sweep that finds fewer than the nine delivered must RED, never pass on the UI tree alone (ADR-003 §4)`);
      targets.push(...doctorModules);
      targets.push(...await filesBelow(path.join(root, "apps", "ui")));
      assert.ok(targets.length > 10, "reverse boundary sweep is non-vacuous");
      // TWO CHECKS, because the claim has two halves and only one of them is a spelling. The EDGE is
      // resolved (an import of the loop family from anywhere in the tree, however deep the importer
      // sits); the TEXT token catches what has no edge to resolve — a command id, a prose citation.
      const edges = [];
      for (const file of targets) {
        const rel = path.relative(root, file).split(path.sep).join("/");
        const body = stripComments(await readFile(file, "utf8"));
        edges.push(...reachesLoopFamily(rel, body));
        assert.doesNotMatch(body, forbidden, rel);
      }
      assert.deepEqual(edges, [], "the god-node, the doctor family, the CLI and the UI reach the loop family through no import (ADR-011 §1)");

      // NON-VACUITY on the resolver itself: it must catch the sibling spelling a doctor module
      // would actually use, and it must not fire on a neighbour that merely looks like one.
      assert.deepEqual(
        reachesLoopFamily("packages/work/src/doctor/loop-ready.mjs", 'import { loadLoops } from "../../../../packages/core/src/work/loops.mjs";').length,
        1,
        "self-check: a package import of the core loader is caught",
      );
      assert.deepEqual(reachesLoopFamily("packages/work/src/doctor/index.mjs", 'import { x } from "./budget.mjs";'), [], "self-check: a lane import inside the doctor family is not a loop-family edge");
      assert.equal(reachesLoopFamily("packages/work/src/doctor/index.mjs", 'import { loadLoops } from "@aof/work-graph/registry";').length, 1,
        "self-check: the public package route into the registry is also forbidden");
      assert.deepEqual(reachesLoopFamily("packages/core/src/cli.mjs", 'import { x } from "./work/loops.mjs";').length, 1, "self-check: the CLI reaching the loader is caught at its own depth");
      // The four spellings the review measured loading under Node while this control read green.
      for (const [what, source] of [
        ["a side-effect import", 'import "../../../../packages/core/src/work/loops.mjs";'],
        ["a template-literal dynamic import", "const m = await import(`../../../../packages/core/src/work/loops.mjs`);"],
        ["a query-suffixed specifier", 'import { loadLoops } from "../../../../packages/core/src/work/loops.mjs?v=1";'],
        ["a doubled slash", 'import { loadLoops } from "../../../../packages/core/src/work//loops.mjs";'],
      ]) {
        assert.equal(reachesLoopFamily("packages/work/src/doctor/loop-ready.mjs", source).length, 1, `self-check: ${what} is an edge and is caught`);
      }
      assert.deepEqual(reachesLoopFamily("apps/ui/src/pages/Page.tsx", 'import { x } from "../../../../packages/core/src/commands/loops-graph";').length, 1, "self-check: an EXTENSIONLESS ui/ import is the bundler edge it would be at build time");
    },
  },
];
