// Fitness function for story 79 — THE WRITE SCOPE, THE NAME THE GATE FORCES, AND THE PURE LEAF.
//
// Three claims, and they are one claim seen from three sides: this story adds a WRITER to a family
// whose defining law is that it does not write, and it must be provably outside that family
// without weakening it.
//
//   1. WRITE SCOPE — the writer creates or modifies exactly one file, at one derived path. No file
//      under the loop registry directory is written (52/FF-5201 forbids it outright, and since
//      53/07 the registry ships in the bundle, so a generated document there would be overwritten
//      by the next `aof work update`), and no file inside any work item folder is written.
//   2. THE NAME IS FORCED — 52/FF-5201 DISCOVERS loop modules from disk by two patterns
//      (`src/work-loops*.mjs`, `src/commands/loops-*.mjs`), asserts the discovered set equals its
//      expected six, and holds every discovered module free of write call forms; its own comment
//      names "a writer `src/commands/loops-init.mjs`" as the case it exists to catch. So this
//      story's modules take the EXECUTION family name (78/ADR-009), FF-5201's expected list is
//      unchanged, and its sweep is neither widened nor weakened. Asserted here INDEPENDENTLY of
//      FF-5201 itself — a gate that only re-ran the other gate would prove nothing about this
//      story.
//   3. THE COMPOSER IS PURE — `src/loop-document.mjs` reaches no filesystem, no clock and no
//      environment through its direct imports, which is what lets byte-identity be asserted
//      without standing up a workspace.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkspace } from "../../../src/command-core.mjs";
import { loopDocumentCommand } from "../../../src/commands/loop-document.mjs";
import { loopsGraphCommand } from "../../../src/commands/loops-graph.mjs";
import { snapshot, withRepo } from "../../support/loop-document-fixture.mjs";
import { stripComments } from "../../support/source-slice.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The modules story 79 adds. Named here so claim 2 below is about THIS STORY's files rather than
// about whatever happens to be on disk.
const ADDED_MODULES = ["src/loop-document.mjs", "src/commands/loop-document.mjs"];

// FF-5201's two discovery patterns, restated here ON PURPOSE. Reading them out of that gate's
// source would make this gate green whenever that one was edited, which is the opposite of an
// independent assertion.
// 119/01 — the first pattern was `^src/work-loops.*\.mjs$` and the family now lives in
// `src/work/`. Restated here on purpose, as the comment above says, so the re-point is an
// independent edit rather than one this gate inherits from the gate it is checking.
const REGISTRY_FAMILY_PATTERNS = [/^src\/work\/loops.*\.mjs$/, /^src\/commands\/loops-.*\.mjs$/];
const FF_5201_EXPECTED = [
  "src/work/loops.mjs", "src/work/loops-checks.mjs", "src/commands/loops-show.mjs",
  "src/commands/loops-graph.mjs", "src/commands/loops-groundedness.mjs", "src/commands/loops-validate.mjs",
];

const WRITE_CALL_FORM = /\b(?:writeFile|appendFile|mkdir|rm|rename)\s*\(|\bopen\s*\([^,\n]+,\s*["']w/;

async function discoverRegistryFamily() {
  const found = [];
  for (const name of await readdir(path.join(repoRoot, "src/work"))) {
    if (REGISTRY_FAMILY_PATTERNS[0].test(`src/work/${name}`)) found.push(`src/work/${name}`);
  }
  for (const name of await readdir(path.join(repoRoot, "src/commands"))) {
    if (REGISTRY_FAMILY_PATTERNS[1].test(`src/commands/${name}`)) found.push(`src/commands/${name}`);
  }
  return found.sort();
}

export const archTests = [
  {
    name: "arch/79/01 the writer creates or modifies exactly one file, at the one derived path",
    run: async () => {
      await withRepo({}, async (repo) => {
        const workspace = await loadWorkspace(repo.root);
        const before = await snapshot(repo.root);
        await loopDocumentCommand.run({ write: true }, { workspace });
        const after = await snapshot(repo.root);

        const moved = Object.keys(after).filter((key) => after[key] !== before[key]).sort();
        const removed = Object.keys(before).filter((key) => !(key in after));
        assert.deepEqual(moved, ["wiki/work/loops.md"], "exactly one file is created or modified");
        assert.deepEqual(removed, [], "and none is removed");
        assert.ok(!moved.some((key) => key.startsWith(".aof/loops/")), "no file under the loop registry directory is written");
        assert.ok(!moved.some((key) => /^wiki\/work\/\d+_/.test(key)), "no file inside any work item folder is written");

        // A SECOND run, over a tree that now HAS the document — the case where a writer with an
        // append bug or a stray backup would show itself.
        const second = await snapshot(repo.root);
        await loopDocumentCommand.run({ write: true }, { workspace });
        assert.deepEqual(await snapshot(repo.root), second, "and a regeneration over an unchanged registry moves nothing at all");
      });
    },
  },
  {
    name: "arch/79/01 no module this story adds matches FF-5201's discovery patterns, and its expected list is unchanged",
    run: async () => {
      for (const rel of ADDED_MODULES) {
        for (const pattern of REGISTRY_FAMILY_PATTERNS) {
          assert.doesNotMatch(rel, pattern, `${rel} sits outside the registry family's discovery patterns`);
        }
        assert.ok(!FF_5201_EXPECTED.includes(rel), `${rel} is not a member of FF-5201's expected module list`);
      }
      assert.deepEqual(
        await discoverRegistryFamily(),
        [...FF_5201_EXPECTED].sort(),
        "the registry family on disk is still exactly FF-5201's six — this story neither joined it nor grew it"
      );
    },
  },
  {
    name: "arch/79/01 FF-5201's read-only sweep over the registry family is neither widened nor weakened",
    run: async () => {
      // Every discovered member is STILL free of a write call form — measured here rather than
      // assumed, because the whole risk this story carries is that a writer ends up inside the
      // family the sweep covers.
      for (const rel of await discoverRegistryFamily()) {
        const source = stripComments(await readFile(path.join(repoRoot, rel), "utf8"));
        assert.doesNotMatch(source, WRITE_CALL_FORM, `${rel}: no write call form`);
      }
      // And the frozen renderer in particular: no write form, and no output-path input. `--out` on
      // `work:loops-graph` would have been red twice over — once for writing, once for changing
      // the shape of a frozen command — which is exactly why the writer is a separate module.
      const graph = stripComments(await readFile(path.join(repoRoot, "src/commands/loops-graph.mjs"), "utf8"));
      assert.doesNotMatch(graph, WRITE_CALL_FORM, "src/commands/loops-graph.mjs: no write call form");
      assert.deepEqual(Object.keys(loopsGraphCommand.input.properties), ["format"], "and it declares no output-path input");
      assert.equal(loopsGraphCommand.input.additionalProperties, false);
    },
  },
  {
    name: "arch/79/01 the composer is a pure leaf — no filesystem, no clock, no environment through its direct imports",
    run: async () => {
      const source = stripComments(await readFile(path.join(repoRoot, "src/loop-document.mjs"), "utf8"));
      const imports = importSpecifiers(source).map((entry) => entry.specifier);
      assert.deepEqual(imports, ["node:path"], "its direct imports are exactly node:path");
      for (const forbidden of [/\bnode:fs\b/, /\bnode:os\b/, /\bnode:child_process\b/, /\bDate\b/, /\bprocess\.env\b/, /\bprocess\.cwd\b/]) {
        assert.doesNotMatch(source, forbidden, `the composer reaches no ${forbidden}`);
      }
      assert.doesNotMatch(source, WRITE_CALL_FORM, "and it holds no write call form — the WRITER is the command, and only the command");

      // The command is where the filesystem lives, and it reaches it through ONE door: the shared
      // atomic `writeText`. A second spelling of a write here would be a second atomicity story.
      const command = stripComments(await readFile(path.join(repoRoot, "src/commands/loop-document.mjs"), "utf8"));
      assert.match(command, /import\s*\{\s*writeText\s*\}\s*from\s*["']\.\.\/fs\.mjs["']/, "the command writes through the shared atomic writer");
      assert.doesNotMatch(command, /\b(?:appendFile|rm|rename)\s*\(/, "and reaches no other write form of its own");
      assert.equal((command.match(/\bwriteFile\s*\(/g) ?? []).length, 0, "it never calls writeFile directly");
    },
  },
];
