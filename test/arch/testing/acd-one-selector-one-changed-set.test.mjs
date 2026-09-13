// FF-9604 (96/ADR-007) — ONE SELECTOR, AND A DECLARED PATH THE GRAPH DOES NOT KNOW WIDENS.
//
// Milestone 72's module exists to prevent one failure, and this story is the shape that failure
// arrives in: a second selection authority, built beside the first because the new input felt like
// a new problem. Two authorities agree until the day the assembly changes and only one notices,
// and the agent holding the wrong subset has been told a falsehood in the shape of an answer and
// will not find out. So "it added an input, not a selector" is asserted structurally rather than
// promised in a header.
//
// FIVE CLAIMS, each failing for its own reason:
//
//   1. ONE SELECTION AUTHORITY. `selectSuites` is the only suite-selection function exported
//      anywhere in `src/`, and no module 96 adds exports one. Stated as a census over the module
//      set rather than a review note, because the second one always looks reasonable in its own
//      file.
//   2. THE DECLARATION IS READ THROUGH THE SHIPPED PARSER. The producer reaches a story's `files:`
//      through `storyContractList`/`resolveStoryContractPath` and holds no second parse of
//      frontmatter. There are three homes for that declaration and a fourth READER is how they
//      start to disagree about a trailing comment or a backslash.
//   3. A DECLARED PATH THE GRAPH DOES NOT KNOW WIDENS, under an existing reason, and is never
//      dropped — driven over a real planted graph rather than argued about, because this is the
//      case the SPEC flagged as the design's hard problem and the invariant solves for free.
//      `WIDENING_REASONS` is still four.
//   4. NO NARROWING PATH ENTERS WITH THE NEW INPUT. No flag, option or config key suppresses a
//      widening, and no module drops a declared path because it does not exist on disk.
//      `--no-widen` would be asked for within a week by someone who knows their change is local,
//      and used by an agent that does not.
//   5. THE INVOCATION REFUSALS HOLD. `--story` with `--since` is refused, and a `--story` naming an
//      unresolvable ref is a refusal rather than an empty changed set — an empty set renders as
//      "nothing affected" and selects nothing, which is the maximal silent narrowing.
//      `TEST_SCOPES` is still three.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stripComments } from "../../support/source-slice.mjs";
import { graphJsonPath } from "../../../src/graph-normalize.mjs";
import { WIDENING_REASONS, selectSuites } from "../../../src/work/test-select.mjs";
import { declaredChangedFiles } from "../../../src/work/test-declared.mjs";
import { STORY_AND_SINCE, TEST_SCOPES, runTest } from "../../../src/commands/test.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// The modules milestone 96 adds or edits in the selection family — the subject of claims 1, 2, 4.
const PRODUCER = "src/work/test-declared.mjs";
const SELECTOR = "src/work/test-select.mjs";
const FACE = "src/commands/test.mjs";

const source = async (rel) => stripComments(await readFile(path.join(repoRoot, rel), "utf8"));

async function srcModules(dir = path.join(repoRoot, "src"), found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await srcModules(full, found);
    else if (entry.name.endsWith(".mjs")) found.push(path.relative(repoRoot, full).split(path.sep).join("/"));
  }
  return found;
}

// A selection function is one whose NAME says it selects suites. The census is over exported
// declarations, which is where a second authority would have to appear to be callable.
const SELECTION_NAME = /^(?:select|choose|pick|resolve|derive|compute)(?:Test)?Suites?$/;

const exportedFunctionNames = (text) =>
  [...text.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1])
    .concat([...text.matchAll(/^export\s+const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/gm)].map((m) => m[1]));

const TOOLCHAIN = Object.freeze({
  ok: true,
  toolchain: Object.freeze({
    command: "node",
    program: "/usr/bin/node",
    args: Object.freeze(["scripts/test.mjs"]),
    selectArgs: Object.freeze(["--only", "{file}"]),
    roots: Object.freeze(["test"]),
    deadlineMs: 900_000,
    report: Object.freeze({ format: "tap" }),
  }),
});

const observed = () => ({
  outcome: "exited", command: "/usr/bin/node", args: [], attempted: "node", deadlineMs: 900_000,
  exitCode: 0, stdout: "# unit\nok - a\n", stderr: "", verdict: "passed", status: 0, message: "ok",
});

async function plantStory(root, declaration) {
  const dir = path.join(root, "wiki", "work", "96_milestone_m", "stories", "03_story_s");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "STORY.md"), `---\ntype: story\nnumber: 03\n${declaration}\n---\n`, "utf8");
  return { ref: "96/03", type: "story", dir };
}

async function plantGraph(root, nodes) {
  await mkdir(path.join(root, "graphify-out"), { recursive: true });
  await writeFile(
    graphJsonPath(root),
    JSON.stringify({ directed: true, multigraph: false, graph: {}, nodes: nodes.map((file, i) => ({ id: `n${i}`, label: file, source_file: file })), links: [] }),
    "utf8",
  );
}

const withRoot = (body) => async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff9604-"));
  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

export const archTests = [
  {
    name: "arch/96/03 FF-9604 (1) ONE SELECTION AUTHORITY — selectSuites is the only suite-selection function exported in src/, and no module 96 adds exports one",
    async run() {
      const owners = [];
      for (const module of await srcModules()) {
        const names = exportedFunctionNames(await source(module));
        if (names.some((name) => SELECTION_NAME.test(name))) owners.push(module);
      }
      assert.deepEqual(
        owners,
        [SELECTOR],
        `suite selection must have exactly one home — found ${owners.join(", ") || "none at all"}`,
      );

      // …and the producer this story adds selects nothing: it produces a changed SET and hands it on.
      const producer = await source(PRODUCER);
      assert.doesNotMatch(producer, /selectSuites/, "the declared-set producer must not call the selector — it is an input to it");
      assert.doesNotMatch(producer, /allSuites|isSuiteFile|WIDENING_REASONS/, "the producer holds no selection vocabulary of its own");

      // The face calls the ONE selector, and calls it once.
      const face = await source(FACE);
      assert.equal((face.match(/\bselect\(\{/g) ?? []).length, 1, "the face invokes the selector exactly once, on one path");
    },
  },
  {
    name: "arch/96/03 FF-9604 (2) THE DECLARATION IS READ THROUGH THE SHIPPED PARSER — storyContractList/resolveStoryContractPath, and no second parse of frontmatter",
    async run() {
      const producer = await source(PRODUCER);

      assert.match(producer, /import\s*\{[^}]*storyContractList[^}]*\}\s*from\s*"(?:\.\.?\/)+story-contract\.mjs"/s);
      assert.match(producer, /resolveStoryContractPath/);
      assert.match(producer, /namesBackslashPath/);

      // NO SECOND PARSE. A `---` fence regex, a frontmatter reader, or a hand-rolled `files:` match
      // is a fourth reader of a declaration that already has three.
      assert.doesNotMatch(producer, /---\\r\?\\n|\^---/, "the producer must not fence frontmatter itself");
      assert.doesNotMatch(producer, /parseFrontmatter/, "the producer must not reach a second frontmatter reader");
      assert.doesNotMatch(producer, /\/\^?\s*files\s*:/, "the producer must not match the declaration key with a regex of its own");

      // …and the resolver is INJECTED, never imported downward from the command layer.
      assert.doesNotMatch(producer, /from\s*"\.\/commands\//, "the producer must not import the command layer");
      // The resolver ARRIVES rather than being reached for: destructured from the call's options
      // and invoked, with no import of a resolver anywhere in the module.
      assert.match(producer, /declaredChangedFiles\(\{[^}]*resolve[,\s}]/s, "the resolver is a parameter of the producer");
      assert.match(producer, /await resolve\(/, "…and it is the only way a ref becomes an item here");
      assert.doesNotMatch(producer, /resolveItem(?:Exact)?/, "the producer imports no resolver of its own");
    },
  },
  {
    name: "arch/96/03 FF-9604 (3) A DECLARED PATH THE GRAPH DOES NOT KNOW WIDENS under an existing reason and is never dropped — driven over a planted graph",
    run: withRoot(async (root) => {
      const story = await plantStory(root, "files:\n  - src/known.mjs\n  - test/not-written-yet.test.mjs");
      await plantGraph(root, ["src/known.mjs"]);

      const set = await declaredChangedFiles({ projectRoot: root, ref: "96/03", resolve: async () => story });
      assert.equal(set.ok, true);
      assert.ok(set.changed.includes("test/not-written-yet.test.mjs"), "a declared path absent from the graph is never dropped from the changed set");

      const selection = selectSuites({
        projectRoot: root,
        changed: [...set.changed],
        allSuites: ["test/a.test.mjs", "test/not-written-yet.test.mjs"],
        roots: ["test"],
      });

      assert.equal(selection.scope, "all", "unknown coupling widens");
      const widened = selection.widened.find((entry) => entry.file === "test/not-written-yet.test.mjs");
      assert.ok(widened, "the widening names the file that caused it");
      assert.ok(WIDENING_REASONS.includes(widened.reason), `${widened.reason} is not one of the four`);

      // The frozen set did not grow to carry "declared but absent".
      assert.deepEqual([...WIDENING_REASONS], ["no-graph", "not-in-graph", "no-registered-dependent", "graph-unreadable"]);
    }),
  },
  {
    name: "arch/96/03 FF-9604 (4) NO NARROWING PATH ENTERS WITH THE NEW INPUT — no widening-suppressing option, and no module drops a declared path for not existing on disk",
    async run() {
      for (const module of [PRODUCER, SELECTOR, FACE]) {
        const text = await source(module);
        for (const suppressor of ["no-widen", "noWiden", "strict-scope", "strictScope", "skipWidening", "suppressWidening"]) {
          assert.ok(!text.includes(suppressor), `${module} names ${suppressor} — there is no flag that suppresses a widening`);
        }
      }

      // A declared path is never checked against the disk before it is handed on: "the file does
      // not exist yet" is the ordinary case this story exists for, and dropping it would be the
      // silent narrowing the invariant forbids.
      const producer = await source(PRODUCER);
      assert.doesNotMatch(producer, /existsSync|\bstat\b|access\(/, "the producer must not probe the disk for a declared path");
    },
  },
  {
    name: "arch/96/03 FF-9604 (5) THE INVOCATION REFUSALS HOLD — --story with --since is refused, an unresolvable ref is a refusal not an empty set, and TEST_SCOPES is still three",
    run: withRoot(async (root) => {
      assert.deepEqual([...TEST_SCOPES], ["impacted", "file", "all"]);

      const story = await plantStory(root, "files:\n  - src/known.mjs");
      const deps = {
        projectRoot: root,
        config: {},
        resolveToolchain: () => TOOLCHAIN,
        readChanged: async () => Object.freeze({ ok: true, changed: Object.freeze(["src/known.mjs"]), base: "HEAD~1" }),
        resolveStory: async (ref) => (ref === "96/03" ? story : null),
        walk: async () => ["test/a.test.mjs"],
        run: async () => observed(),
      };

      const both = await runTest({ scope: "impacted", story: "96/03", since: "HEAD~1" }, deps);
      assert.equal(both.refusal.code, STORY_AND_SINCE);
      assert.equal(both.launched, false);

      const unknown = await runTest({ scope: "impacted", story: "96/44" }, deps);
      assert.equal(unknown.launched, false);
      assert.notEqual(unknown.refusal, null, "an unresolvable ref is a refusal");
      assert.deepEqual([...unknown.changed], [], "…and it is not an empty changed set handed to the selector");
      assert.match(unknown.refusal.message, /96\/44/, "the refusal names the ref");
      assert.notEqual(unknown.refusal.code, "changed-set-empty", "a ref that does not resolve is not a tree with nothing in it");
    }),
  },
];
