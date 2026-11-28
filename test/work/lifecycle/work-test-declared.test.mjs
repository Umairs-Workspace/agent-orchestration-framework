// Traceability wiring for the test step's prose: 210/00 (the build and review lanes read the
// project's testing instructions and name their suites) and 190/03 (the doors ask once and stop
// prescribing repeat runs).
//
// Milestone 96 / story 03's cases lived here too: a story's declared write set as a changed-set
// source for `--scope impacted --story`. That source, the selector it fed and both flags were
// removed by 210/ADR-008, and their cases with them.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { generateBundleManifest, manifestPath, serializeBundleManifest } from "aof/bundle-manifest";

export const workTestDeclaredTests = [
  {
    name: "210/00 the build lane reads project instructions and names chosen suites",
    async run() {
      const doc = await readFile(new URL("../../../packages/acd/assets/commands/continue.md", import.meta.url), "utf8");
      const build = doc.slice(doc.indexOf("<build_terminator>"), doc.indexOf("</build_terminator>"));

      assert.ok(build.length > 0, "the continue document carries a build terminator");
      assert.match(build, /aof test <suite>… --reason/);
      assert.match(build, /work\.test\.instructions/);
    },
  },
  {
    name: "210/00 the review lane checks suite choices and leaves acceptance to the gate",
    async run() {
      const doc = await readFile(new URL("../../../packages/acd/assets/commands/continue.md", import.meta.url), "utf8");
      const review = doc.slice(doc.indexOf("<review_lanes>"), doc.indexOf("</review_lanes>"));

      assert.ok(review.length > 0, "the continue document carries the review lanes");
      assert.match(review, /aof test <suite>… --reason/);
      assert.match(review, /does not accept a milestone/);
      assert.match(review, /structural lane checks the choice of suites/i);
    },
  },
  // ═════ 190/03 — the doors' prose asks once and stops prescribing repeat runs (ADR-006) ═════
  {
    name: "190/03 E1 · the review lanes share one run",
    async run() {
      const review = region(await asset("commands/continue.md"), "<review_lanes>", "</review_lanes>");
      assert.match(review, /aof test <suite>… --reason/);
      assert.match(review, /unchanged covering run/);
      assert.match(review, /answered from its record/);
      for (const figure of ["58.6%", "54.3%", "45.6%"]) assert.equal(review.includes(figure), false, `it no longer cites ${figure}`);
    },
  },
  {
    name: "190/03 E2 · the build terminator names the answer as evidence",
    async run() {
      const build = region(await asset("commands/continue.md"), "<build_terminator>", "</build_terminator>");
      assert.match(build, /a repeat on unchanged content is answered from it/);
      assert.match(build, /that answer is the evidence — written by the command/);
    },
  },
  {
    name: "190/03 E3 · the operator's review runs the story's tests once",
    async run() {
      const doc = await asset("commands/review.md");
      const step = doc.slice(doc.indexOf("2. **Run the story's tests first.**"), doc.indexOf("\n3. "));
      assert.ok(step.length > 0, "step 2 is found");
      assert.equal(step.split("aof test <suite>… --reason").length - 1, 1, "it names the story's run once");
      assert.equal(step.includes("--fresh"), false, "and does not name --fresh");
    },
  },
  {
    name: "190/03 E4 · --fresh appears only beside a suspected flake",
    async run() {
      const dir = new URL("../../../packages/acd/assets/commands/", import.meta.url);
      const hits = [];
      for (const name of await readdir(dir)) {
        if (!name.endsWith(".md")) continue;
        const text = await readFile(new URL(name, dir), "utf8");
        for (const sentence of text.replace(/\s+/g, " ").split(/(?<=[.!?])\s/u)) if (sentence.includes("--fresh")) hits.push({ name, sentence });
      }
      assert.ok(hits.length > 0, "the flag is named somewhere, so the census is not vacuous");
      for (const { name, sentence } of hits) {
        assert.match(sentence, /suspected flake/u, `${name}: "${sentence}" names a suspected flake`);
        assert.match(sentence, /deliberate repeat/u, `${name}: …and asks the result to say the run was a deliberate repeat`);
      }
    },
  },
  {
    name: "190/03 the Codex variants say the same",
    async run() {
      const variant = await asset("variants/codex/workflow.md");
      const continueDoc = await asset("commands/continue.md");
      for (const [open, close] of [["<review_lanes>", "</review_lanes>"], ["<build_terminator>", "</build_terminator>"]]) {
        assert.ok(variant.includes(region(continueDoc, open, close)), `the variant carries the source's ${open} region verbatim`);
      }
      for (const [file, marker] of [["commands/verify.md", "aof work regression-gate <NN> --resume"], ["commands/verify.md", "a single `aof test --all` for the whole session"], ["commands/review.md", "answered from that run's record"]]) {
        assert.ok((await asset(file)).includes(marker) && variant.includes(marker), `${file} and its variant both carry "${marker}"`);
      }
    },
  },
  {
    name: "190/03 E5 · verify tells a UAT session to sweep once",
    async run() {
      const doc = await asset("commands/verify.md");
      const uat = doc.slice(doc.indexOf("The ref may be a **milestone**"), doc.indexOf("**Spike/chore dispatch"));
      assert.match(uat, /a single `aof test --all` for the whole session/);
      assert.match(uat, /answered\s+from the gate run's record/);
      assert.doesNotMatch(uat, /Run those milestones' `@executable` suite/, "it does not say to run each accepted milestone's suite");
    },
  },
  {
    name: "190/03 E6 · a not-finished gate is resumed",
    async run() {
      const doc = (await asset("commands/verify.md")).replace(/\s+/g, " ");
      const bullet = doc.slice(doc.indexOf("A `not-finished` row is no verdict on the code"), doc.indexOf("The escape is `--gate-override"));
      assert.match(bullet, /Its repair is `aof work regression-gate <NN> --resume`/);
      assert.match(bullet, /A resume refuses when the content has changed/);
      assert.match(bullet, /then the repair is to re-run the gate/);
    },
  },
  {
    name: "190/03 [outline] E7 · the UAT templates and command say one sweep (3 rows)",
    async run() {
      for (const file of ["templates/uat/SESSION.md", "templates/uat/STATE.md", "commands/add-uat.md"]) {
        const text = (await asset(file)).replace(/\s+/g, " ");
        assert.equal(/sweep[^.]*across the accepted milestones/u.test(text), false, `${file}: the sweep is not "across the accepted milestones"`);
        assert.match(text, /one `aof test --all` for the session/u, `${file}: its sweep line names one whole-tree run for the session`);
      }
    },
  },
  {
    name: "190/03 the renders match their sources",
    async run() {
      const root = new URL("../../../", import.meta.url);
      const rendered = async (rel) => readFile(new URL(rel, root), "utf8");
      assert.ok((await rendered(".claude/commands/aof/verify.md")).includes("aof work regression-gate <NN> --resume"));
      assert.ok((await rendered(".claude/commands/aof/add-uat.md")).includes("one `aof test --all` for the session"));
      assert.ok((await rendered(".aof/templates/work/uat/SESSION.md")).includes("one `aof test --all` for the session"));
      const shipped = await readFile(manifestPath(), "utf8");
      assert.equal(shipped, serializeBundleManifest(generateBundleManifest()), "the shipped manifest is the rendered bundle's, so `aof work update` finds no drift");
    },
  },
];

// ── 190/03 fixtures ─────────────────────────────────────────────────────────────────────────────
const asset = (rel) => readFile(new URL(`../../../packages/acd/assets/${rel}`, import.meta.url), "utf8");
const region = (doc, open, close) => doc.slice(doc.indexOf(open), doc.indexOf(close));
