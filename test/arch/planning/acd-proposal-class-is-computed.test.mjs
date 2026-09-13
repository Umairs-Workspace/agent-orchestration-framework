// FF-6202 — lane membership is the registry's answer, never a class table in 62.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PROPOSAL_CLASSES,
  computeProposalLane,
  laneProposals,
} from "../../../src/work-tune/proposal.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const key = "work.fixture.roundsAllowed";
const candidate = { class: PROPOSAL_CLASSES.CAP_ADJUSTMENT, target: { kind: "config", key } };
const declared = (keys) => ({
  nodes: [{
    id: "arbiter:fixture",
    path: "fixture.md",
    edges: { "parameter-tuning": keys.map((operand) => ({ scheme: "config", operand })) },
  }],
});

export const archTests = [
  {
    name: "arch/62 FF-6202 adding and dropping a registry key moves the lane with no proposer edit",
    run: () => {
      assert.equal(computeProposalLane(candidate, declared([])).lane, "advisory");
      assert.equal(computeProposalLane(candidate, declared([key])).lane, "tunable");
      assert.equal(computeProposalLane(candidate, declared([])).lane, "advisory");
    },
  },
  {
    name: "arch/62 FF-6202 an empty declaration routes nothing to the acceptor",
    run: () => {
      let calls = 0;
      const result = laneProposals([
        candidate,
        { class: PROPOSAL_CLASSES.MODEL_REALLOCATION, target: { kind: "model", role: "developer" } },
        { class: PROPOSAL_CLASSES.PROMPT_REVISION, target: { kind: "prompt", path: "p.md" } },
        { class: PROPOSAL_CLASSES.STORY_SIZING },
      ], {
        model: declared([]),
        assessTunable: () => { calls += 1; },
      });
      assert.equal(calls, 0);
      assert.equal(result.tunable.length, 0);
      assert.equal(result.advisory.length, 4);
    },
  },
  {
    name: "arch/62 FF-6202 the proposer contains no shipped tunable-key literal or command-core import",
    run: async () => {
      const source = await readFile(path.join(root, "src", "work-tune", "proposal.mjs"), "utf8");
      for (const forbidden of [
        "work.loop.reviewRounds",
        "work.loop.buildNoProgressRounds",
        "work.autonomous.maxAttempts",
        "../command-core.mjs",
      ]) assert.equal(source.includes(forbidden), false, `proposal leaf must not spell ${forbidden}`);
      assert.match(source, /tunableSet\(model\)/u);
    },
  },
];
