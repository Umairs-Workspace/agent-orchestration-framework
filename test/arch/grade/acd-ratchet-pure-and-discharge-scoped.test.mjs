import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getCommand } from "../../../src/command-core.mjs";
import { evaluateRatchet } from "../../../src/work/ratchet.mjs";
import { importSpecifiers } from "../../support/module-family.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const archTests = [
  {
    name: "arch/57 FF-5705: the ratchet engine is pure and repository observation stays at the command boundary",
    run: async () => {
      const engine = await readFile(path.join(root, "src", "work", "ratchet.mjs"), "utf8");
      const boundary = await readFile(path.join(root, "src", "commands", "ratchet.mjs"), "utf8");

      const imports = importSpecifiers(engine).map((entry) => entry.specifier);
      const executableEngine = engine.replace(/\/\/[^\n]*/gu, "").replace(/\/\*[\s\S]*?\*\//gu, "");
      // `./declared-id.mjs` was ADMITTED at the milestone gate (`F-57-M-4`): the engine
      // spelled the `ADR-\d+` fragment itself and was a second copy of 66's one-home id
      // grammar. The set is still CLOSED — three members, exact equality, both directions.
      assert.deepEqual(imports, ["../feature-parse.mjs", "./doctor-rubric.mjs", "../declared-id.mjs"]);
      assert.doesNotMatch(executableEngine, /node:(?:fs|child_process)|\bprocess\b|\bexecFile\b|\bspawn\b/iu);
      assert.match(boundary, /node:child_process/u);
      assert.match(boundary, /resolveRatchetBase/u);
      assert.match(boundary, /evaluateRatchet\(observation\)/u);

      // THE ADMISSION IS CHECKED, NOT TRUSTED. A frozen import set defends purity only
      // while every member is itself pure — otherwise admitting one leaf launders an
      // arbitrary dependency tree in behind it. `./declared-id.mjs` is admitted because
      // it imports NOTHING and reaches no I/O; this leg is what keeps that true, so a
      // later edit to the leaf reddens the ratchet's purity claim at its own gate.
      const leaf = await readFile(path.join(root, "src", "declared-id.mjs"), "utf8");
      const executableLeaf = leaf.replace(/\/\/[^\n]*/gu, "").replace(/\/\*[\s\S]*?\*\//gu, "");
      assert.deepEqual(
        importSpecifiers(leaf).map((entry) => entry.specifier),
        [],
        "the admitted import is a zero-import leaf — the engine's purity cannot be laundered through it",
      );
      assert.doesNotMatch(executableLeaf, /node:(?:fs|child_process)|\bprocess\b|\bexecFile\b|\bspawn\b|\bDate\.now\b/iu);
      // And the engine takes only the FRAGMENT from it. Re-exporting the leaf's whole
      // heading recogniser would change `authorityIds`' behaviour (the shipped ADR form
      // carries no `\b`, deliberately), so the narrowness of the borrow is the invariant.
      assert.match(executableEngine, /idForm\("ADR"\)\.id/u);
      assert.doesNotMatch(executableEngine, /headingCaptureRe|headingSplitRe|qualifiedRefsIn|QUALIFIED_REF/u);
    },
  },
  {
    name: "arch/57 FF-5705: work:ratchet is one registered CLI command with a coded no-base refusal",
    run: () => {
      const command = getCommand("work:ratchet");
      assert.equal(command?.id, "work:ratchet");
      assert.deepEqual(command.cli.route, ["work", "ratchet"]);
      assert.deepEqual(command.cli.argv(["57/03"], { base: "abc" }), { ref: "57/03", base: "abc" });
      const refusal = { ok: false, code: "ratchet-base-unresolved", base: null, legs: [] };
      assert.equal(command.cli.exit(refusal), 1);
      assert.match(command.cli.render(refusal), /no ratchet leg was computed/u);
    },
  },
  {
    // ADR-004 section 5's THIRD leg, which this control declared and did not reach
    // until F-57-03-1/F-57-03-2. Both halves are asserted here because either one
    // alone re-opens the discharge: reading head text consults the comment written
    // WITH the weakening, and accepting a bare id makes the owning-item qualifier
    // do no work (every milestone numbers its register from 001).
    name: "arch/57 FF-5705: discharge reads the base text and only a citation naming the owning item clears",
    run: async () => {
      const boundary = await readFile(path.join(root, "src", "commands", "ratchet.mjs"), "utf8");
      assert.match(boundary, /citationsByPath\[file\] = adrIdsOnly\(before\)/u);
      assert.doesNotMatch(boundary, /adrIdsOnly\(after\)/u);
      assert.doesNotMatch(boundary, /Object\.entries\(headFeatures\)\) citationsByPath/u);

      const fired = (citations, owningItemRef = "57") => evaluateRatchet({
        baseCommit: "a".repeat(40),
        base: { featureTexts: {}, files: { "test/a.test.mjs": "assert.deepEqual(actual, [\"a\"]);" } },
        head: { featureTexts: {}, files: { "test/a.test.mjs": "assert.ok(actual.includes(\"a\"));" } },
        baseArchitectureText: "## ADR-007: pre-existing authority\n",
        citationsByPath: { "test/a.test.mjs": citations },
        owningItemRef,
      }).legs.find((leg) => leg.id === "closed-set").disposition;

      assert.equal(fired(["57/ADR-007"]), "discharged");
      assert.equal(fired(["ADR-007"]), "fired");
      assert.equal(fired(["35/ADR-007"]), "fired");
      assert.equal(fired(["57/ADR-007"], null), "fired");
    },
  },
];
