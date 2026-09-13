// FF-6208 — the integrated face says something real over AOF's tracked corpus.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildTuneReport } from "../../../src/commands/tune.mjs";
import { getCommand, invoke } from "../../../src/command-core.mjs";
import { loadWorkspace } from "../../../src/work.mjs";
import { PROPOSAL_CLASSES } from "../../../src/work-tune/proposal.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));

export const archTests = [
  {
    name: "architecture: FF-6208 this repository emits both lanes with resolved evidence and distance",
    async run() {
      const workspace = await loadWorkspace(root);
      const report = await buildTuneReport({}, {
        workspace,
        tune: { registry: { getCommand, invoke } },
      });
      assert.ok(report.proposals.length > 0, "the real corpus emits proposals");
      assert.ok(report.proposals.some((proposal) => proposal.lane === "tunable"), "the real corpus fills the tunable lane");
      assert.ok(report.proposals.some((proposal) => proposal.lane === "advisory"), "the real corpus fills the advisory lane");
      assert.ok(report.proposals.every((proposal) => Object.values(PROPOSAL_CLASSES).includes(proposal.class)), "every real proposal has a declared class");
      for (const proposal of report.proposals.filter((entry) => entry.lane === "tunable")) {
        assert.equal(proposal.target.kind, "config");
        assert.equal(proposal.target.id, "work.loop.reviewRounds");
        assert.equal(proposal.target.raw, "config:work.loop.reviewRounds");
      }
      for (const proposal of report.proposals) {
        assert.ok(proposal.evidence.distinctSourceDocumentCount >= 2);
        assert.ok(proposal.provenanceResolution.resolved.length >= 2);
        assert.equal(proposal.provenanceResolution.failures.length, 0);
        assert.ok(proposal.distance != null);
        assert.ok(proposal.distance.standing.length + proposal.distance.unknown.length > 0);
      }
      const source = await readFile(new URL("../../../src/commands/tune.mjs", import.meta.url), "utf8");
      assert.doesNotMatch(source, /recordTarget|keyTerms|keyWords/u);
      assert.ok(report.headline.obstacles.length > 0);
    },
  },
];
