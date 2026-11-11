// Traceability wiring for milestone 190 / story 04 task 03 — `/aof:map-tests` says what it does,
// what it writes and what it will not claim (190/ADR-008 §3, §4; 190/04 Q2).
//
// Covers every @executable scenario in
//   tasks/03_map-tests-says-what-it-does.feature
//
// A skill's behaviour is its prose, and an agent follows it to the letter, so these cases read the
// bundle source, its registration and its renders, the way `work-test-declared.test.mjs` reads
// `continue.md`. Each clause is pinned in the region the feature names, so a sentence moved out of
// `<process>` or `<output>` fails here rather than drifting silently.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { generateBundleManifest, manifestPath, serializeBundleManifest } from "aof/bundle-manifest";

const repo = (file) => new URL(`../../../${file}`, import.meta.url);
const read = (file) => readFile(repo(file), "utf8");
const SOURCE = "packages/core/assets/commands/map-tests.md";

function region(doc, open, close) {
  const start = doc.indexOf(open);
  const end = doc.indexOf(close, start);
  assert.ok(start >= 0 && end > start, `${open} region present`);
  return doc.slice(start, end);
}

// One spelling for a run of whitespace, so a clause that wraps differently still reads as itself.
const flat = (text) => text.replace(/\s+/gu, " ");

// A Codex variant section: from its marker to the next one.
function codexSection(doc, id) {
  const start = doc.indexOf(`<!-- variant:${id} -->`);
  assert.ok(start >= 0, `the Codex variant ${id} is present`);
  const next = doc.indexOf("<!-- variant:", start + 1);
  return doc.slice(start, next < 0 ? undefined : next);
}

const REPLAY = "aof test --scope impacted --commit <sha> --plan --json";

export const mapTestsCommandTests = [
  {
    name: "190/04-03 the command ships in the bundle and renders for every runtime",
    async run() {
      const bundle = JSON.parse(await read("packages/core/assets/bundle.json"));
      const entry = bundle.members.find((item) => item.id === "map-tests");
      assert.equal(entry?.kind, "command");
      assert.equal(`packages/core/assets/${entry.file}`, SOURCE);
      const manifest = JSON.parse(await readFile(manifestPath(), "utf8"));
      assert.ok(manifest.entries.some((item) => item.resource.kind === "command" && item.resource.id === "map-tests"), "the manifest lists map-tests as a command");
      assert.equal(await readFile(manifestPath(), "utf8"), serializeBundleManifest(generateBundleManifest()), "the shipped manifest is the rendered bundle's");
      for (const render of [".claude/commands/aof/map-tests.md", ".agents/skills/aof-map-tests/SKILL.md", ".opencode/commands/aof/map-tests.md"]) {
        assert.ok(existsSync(repo(render)), `${render} is rendered`);
      }
    },
  },
  {
    name: "190/04-03 it replays before it declares, and again after",
    async run() {
      const process = flat(region(await read(SOURCE), "<process>", "</process>"));
      const steps = process.split(/ (?=\d+\. \*\*)/u).slice(1);
      assert.match(steps[0], /before replay/u, "the first step is the before replay");
      assert.ok(steps[0].includes(REPLAY), "it runs the plan replay");
      assert.match(steps[0], /last 30 non-merge commits that touch a file outside the work dir/u);
      assert.match(steps[0], /git log --no-merges -n 30/u);
      const after = steps.findIndex((step) => /after replay/u.test(step));
      const write = steps.findIndex((step) => /Write `work\.test\.\*`/u.test(step));
      assert.ok(write > 0 && after > write, "the after replay follows the write");
      assert.ok(steps[after].includes(REPLAY), "the same replay");
      assert.match(steps.at(-1), /aof project doctor/u, "the last step runs the project doctor");
    },
  },
  {
    name: "190/04-03 E17 · it writes `work.test.*` and nothing else",
    async run() {
      const doc = flat(await read(SOURCE));
      assert.ok(doc.includes("Its only write is `.aof/aof.config.json` `work.test.*`."));
      assert.ok(doc.includes("It edits no test, no runner config and no source"));
    },
  },
  {
    name: "190/04-03 E18 · with no flag it writes, then shows the diff and both replays",
    async run() {
      const output = flat(region(await read(SOURCE), "<output>", "</output>"));
      assert.ok(output.includes("the `work.test.*` diff"));
      assert.ok(output.includes("the before and after replays"));
      assert.ok(output.includes("the doctor's `test-layout-*` checks"));
      assert.ok(flat(region(await read(SOURCE), "<config>", "</config>")).includes("With no flag the command writes the declaration, then shows the diff and both replays."));
    },
  },
  {
    name: "190/04-03 E19 · `--dry-run` previews and writes nothing",
    async run() {
      const doc = flat(await read(SOURCE));
      assert.ok(doc.includes("`--dry-run` stops after the before replay and the proposed `work.test.*` change"));
      assert.match(doc, /byte-identical/u);
      assert.ok(flat(region(await read(SOURCE), "<process>", "</process>")).includes("Under `--dry-run`, stop here"));
    },
  },
  {
    name: "190/04-03 E15 · resume templates only for a program that honours the contract",
    async run() {
      const doc = flat(await read(SOURCE));
      assert.ok(doc.includes("a newline-separated file list at `{files}`"));
      assert.ok(doc.includes("a JSON report at `{report}`"));
      for (const key of ["units", "lanes", "notFinished", "notStarted"]) assert.ok(doc.includes(`"${key}"`), `the report names ${key}`);
      assert.ok(doc.includes("only when the gate program is shown to honour that contract"));
      assert.ok(doc.includes("say that resume is unavailable for this runner"));
      assert.ok(doc.includes("name the resume contract") || doc.includes("resume contract named"), "it names the contract");
      assert.ok(doc.includes("leave the gate unchanged"));
    },
  },
  {
    name: "190/04-03 E16 · the report is the replay, never a promise",
    async run() {
      const output = flat(region(await read(SOURCE), "<output>", "</output>"));
      assert.match(output, /how many widened/u);
      assert.ok(output.includes("median and 75th-percentile selected count"));
      assert.match(output, /and the total/u);
      assert.ok(output.includes("every reason that still widens"));
      assert.ok(output.includes("when the narrowed median is within 10% of the total, say the narrowed runs are near-total"));
      assert.ok(output.includes("Give no estimate of time saved"));
      assert.doesNotMatch(output.replace("Give no estimate of time saved", ""), /time saved|faster|minutes saved/u, "no promise anywhere else");
    },
  },
  {
    name: "190/04-03 couplings are judged, each with its reason",
    async run() {
      const process = flat(region(await read(SOURCE), "<process>", "</process>"));
      assert.ok(process.includes("search of the suites for the coupled paths"));
      assert.ok(process.includes("`path.join` segments"));
      assert.match(process, /write the `why` from what the search found/u);
      assert.ok(process.includes("Write `couplings: []` when no suite reads a document"));
    },
  },
  {
    name: "190/04-03 the Codex variant says the same",
    async run() {
      const source = flat(await read(SOURCE));
      const codex = flat(codexSection(await read("packages/core/assets/variants/codex/workflow.md"), "map-tests"));
      for (const clause of [
        REPLAY,
        "a newline-separated file list at `{files}`",
        "a JSON report at `{report}`",
        "`--dry-run` stops after the before replay and the proposed `work.test.*` change",
        "byte-identical",
      ]) {
        assert.ok(source.includes(clause), `source: ${clause}`);
        assert.ok(codex.includes(clause), `codex: ${clause}`);
      }
      const rendered = flat(await read(".agents/skills/aof-map-tests/SKILL.md"));
      assert.ok(rendered.includes(REPLAY), "the Codex render carries the replay");
    },
  },
  {
    // 190/ADR-009 and the consumer-monorepo findings (operator, 2026-11-11): a stale graph stops the
    // replay, the work dir and doc trees are always coupling candidates, code read from disk and a
    // helper's suites are coupled, and a runner that rewrites a selected path is reported.
    name: "190/ADR-009 · map-tests checks the graph, couples work dir, code reads and helpers, and reports runner fidelity",
    async run() {
      const source = flat(region(await read(SOURCE), "<process>", "</process>"));
      const codex = flat(codexSection(await read("packages/core/assets/variants/codex/workflow.md"), "map-tests"));
      const output = flat(region(await read(SOURCE), "<output>", "</output>"));
      for (const clause of [
        "say the graph is stale and stop",
        "`aof graph build . --offline`",
        "count apart the widened files under `<work.dir>`",
        "deleted since",
        "**the work dir and the doc trees, always**",
        "**code a suite reads from disk instead of importing**",
        "**Never write `suites: []` for code**",
        "name it in `via` instead of listing its importers",
        "**Check the selection's fidelity too**",
        "Overlapping couplings combine",
        "**Escape glob syntax in folder names**",
        "`[(]crm[)]`",
        "`test-layout-couplings-match`",
      ]) {
        assert.ok(source.includes(clause), `source: ${clause}`);
        assert.ok(codex.includes(clause), `codex: ${clause}`);
      }
      assert.ok(output.includes("**runner fidelity**"), "the output reports runner fidelity");
      assert.ok(output.includes("never-in-the-graph"), "the output splits not-in-graph");
    },
  },
  {
    // 190/04 task 05 (`@bug` F-07, F-05): a mapped resume skips the lanes that finished, and a
    // test-shaped file the runner does not run is excluded with a reason, never declared a suite.
    name: "190/04-05 E3 · the skill declares noLanesArgs beside the resume templates, and excludes what the runner does not run",
    async run() {
      const source = flat(region(await read(SOURCE), "<process>", "</process>"));
      const codex = flat(codexSection(await read("packages/core/assets/variants/codex/workflow.md"), "map-tests"));
      for (const doc of [source, codex]) {
        assert.ok(doc.includes("When the gate program also takes a flag that skips its lanes"), "noLanesArgs is conditional on the program");
        assert.ok(doc.includes("declare that flag as `work.test.gate.noLanesArgs` too"));
        assert.ok(doc.includes("author `work.test.exclude` as `[{ paths, why }]`"), "the exclusion carries its reason");
      }
      assert.ok(flat(await read(".claude/commands/aof/map-tests.md")).includes("`work.test.gate.noLanesArgs`"), "the Claude render carries it");
    },
  },
];
