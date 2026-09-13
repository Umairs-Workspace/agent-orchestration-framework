// Milestone 62 / story 01 — executable traceability for all five task features.
import assert from "node:assert/strict";

import {
  ABSENT,
  ABSENT_READING,
  PROPOSAL_CLASSES,
  PROPOSAL_LANES,
  PROPOSAL_REASONS,
  computeProposalLane,
  emitProposal,
  emitProposals,
  laneProposals,
  proposalClassForTarget,
} from "../../src/work-tune/proposal.mjs";

const KEY = "work.fixture.rounds";
const OTHER = "work.fixture.other";
const command = Object.freeze({ id: "work:fixture-apply" });

function model(keys = [KEY], second = false) {
  const declaration = (id, values) => ({
    id,
    path: `${id}.md`,
    edges: {
      "parameter-tuning": values.map((key) => ({ scheme: "config", operand: key })),
    },
  });
  return {
    nodes: [declaration("arbiter:first", keys), ...(second ? [declaration("arbiter:second", keys)] : [])],
  };
}

const cap = (overrides = {}) => ({
  class: PROPOSAL_CLASSES.CAP_ADJUSTMENT,
  target: { kind: "config", key: KEY },
  assumedFrom: 2,
  to: 3,
  applierId: command.id,
  evidence: [{ source: "one.md" }, { source: "two.md" }],
  ...overrides,
});

const role = (overrides = {}) => ({
  class: PROPOSAL_CLASSES.MODEL_REALLOCATION,
  target: { kind: "model", role: "developer" },
  assumedFrom: "model-a",
  to: "model-b",
  applierId: command.id,
  evidence: [{ source: "one.md" }, { source: "two.md" }],
  ...overrides,
});

const context = (overrides = {}) => ({
  model: model(),
  acceptorReport: { valueAt: 2 },
  projectConfig: { work: { agents: { models: { developer: "model-a" } } } },
  resolveCommand: (id) => (id === command.id ? command : undefined),
  ...overrides,
});

const emitted = (candidate, options = {}) => emitProposal(candidate, context(options)).proposal;

export const tuneProposalTests = [
  {
    name: "tune proposal 62/01 target schemes have one deterministic class map",
    run: () => {
      assert.equal(proposalClassForTarget(null), PROPOSAL_CLASSES.STORY_SIZING);
      assert.equal(proposalClassForTarget("config:work.fixture.rounds"), PROPOSAL_CLASSES.CAP_ADJUSTMENT);
      assert.equal(proposalClassForTarget("model:developer"), PROPOSAL_CLASSES.MODEL_REALLOCATION);
      assert.equal(proposalClassForTarget("prompt:review"), PROPOSAL_CLASSES.PROMPT_REVISION);
      assert.equal(proposalClassForTarget("brief:handoff"), PROPOSAL_CLASSES.PROMPT_REVISION);
      assert.equal(proposalClassForTarget("module:src/example.mjs#run"), null);
    },
  },
  {
    name: "tune proposal 62/01 task 00 — the registry declaration decides both lane movements",
    run: () => {
      assert.equal(computeProposalLane(cap(), model()).lane, PROPOSAL_LANES.TUNABLE);
      assert.equal(computeProposalLane(cap(), model([OTHER])).lane, PROPOSAL_LANES.ADVISORY);
      assert.equal(computeProposalLane(cap(), model([])).lane, PROPOSAL_LANES.ADVISORY);
      assert.equal(computeProposalLane(cap(), model([KEY], true)).lane, PROPOSAL_LANES.TUNABLE);
    },
  },
  {
    name: "tune proposal 62/01 task 00 — membership is exact and does not trim or fold case",
    run: () => {
      assert.equal(computeProposalLane(cap({ target: { kind: "config", key: KEY.toUpperCase() } }), model()).lane, "advisory");
      assert.equal(computeProposalLane(cap({ target: { kind: "config", key: ` ${KEY} ` } }), model()).lane, "advisory");
    },
  },
  {
    name: "tune proposal 62/01 task 00 — non-config targets are advisory regardless of class",
    run: () => {
      for (const candidate of [
        role(),
        { class: PROPOSAL_CLASSES.PROMPT_REVISION, target: { kind: "prompt", path: "prompt.md" } },
        { class: PROPOSAL_CLASSES.STORY_SIZING },
      ]) assert.equal(computeProposalLane(candidate, model()).lane, "advisory");
    },
  },
  {
    name: "tune proposal 62/01 task 00 — two candidates of one class can take different lanes",
    run: () => {
      const results = [cap(), cap({ target: { kind: "config", key: OTHER } })]
        .map((candidate) => computeProposalLane(candidate, model()).lane);
      assert.deepEqual(results, ["tunable", "advisory"]);
    },
  },
  {
    name: "tune proposal 62/01 task 00 — advisory basis names edge declaration and absence",
    run: () => {
      const result = computeProposalLane(cap(), model([OTHER]));
      assert.equal(result.edge, "parameter-tuning");
      assert.deepEqual(result.declaredBy, ["arbiter:first"]);
      assert.equal(result.presence, "absent");
      assert.equal(result.ground.code, PROPOSAL_REASONS.TARGET_ABSENT_FROM_EDGE);
    },
  },
  {
    name: "tune proposal 62/01 task 01 — an empty tunable set never consults the acceptor",
    run: () => {
      let calls = 0;
      const result = laneProposals([cap(), role()], {
        model: model([]),
        assessTunable: () => { calls += 1; return { verdict: "commit" }; },
      });
      assert.equal(calls, 0);
      assert.equal(result.acceptorConsulted, 0);
      assert.deepEqual(result.tunable, []);
      assert.equal(result.advisory.length, 2);
      assert.equal("assessment" in result.advisory[0], false);
    },
  },
  {
    name: "tune proposal 62/01 task 01 — only tunable candidates are assessed in a mixed set",
    run: () => {
      const seen = [];
      const result = laneProposals([cap(), role(), cap({ target: { kind: "config", key: OTHER } })], {
        model: model(),
        assessTunable: (candidate) => { seen.push(candidate); return { verdict: "continue" }; },
      });
      assert.equal(seen.length, 1);
      assert.equal(result.tunable.length, 1);
      assert.equal(result.advisory.length, 2);
      assert.deepEqual(result.tunable[0].assessment, { verdict: "continue" });
    },
  },
  {
    name: "tune proposal 62/01 task 01 — acceptorConsulted counts calls rather than tunable entries",
    run: () => {
      const withoutAcceptor = laneProposals([cap(), cap()], { model: model() });
      assert.equal(withoutAcceptor.tunable.length, 2);
      assert.equal(withoutAcceptor.acceptorConsulted, 0);
      const withAcceptor = laneProposals([cap(), cap()], { model: model(), assessTunable: () => null });
      assert.equal(withAcceptor.acceptorConsulted, 2);
    },
  },
  {
    name: "tune proposal 62/01 task 01 — permanent advisory grounds are class-specific",
    run: () => {
      const candidates = [
        role(),
        { class: PROPOSAL_CLASSES.PROMPT_REVISION, target: { kind: "prompt", path: "prompt.md" } },
        { class: PROPOSAL_CLASSES.STORY_SIZING },
      ];
      const grounds = candidates.map((candidate) => computeProposalLane(candidate, model()).ground);
      assert.deepEqual(grounds.map((ground) => ground.permanent), [true, true, true]);
      assert.equal(new Set(grounds.map((ground) => ground.code)).size, 3);
    },
  },
  {
    name: "tune proposal 62/01 task 02 — cap and model classes carry complete patches",
    run: () => {
      for (const proposal of [emitted(cap()), emitted(role())]) {
        assert.ok(proposal.patch);
        assert.ok(proposal.patch.target);
        assert.notEqual(proposal.patch.from, undefined);
        assert.notEqual(proposal.patch.to, undefined);
        assert.equal(proposal.applier, command.id);
      }
    },
  },
  {
    name: "tune proposal 62/01 task 02 — prompt and brief revisions carry no patch or applier",
    run: () => {
      for (const kind of ["prompt", "brief"]) {
        const proposal = emitted({
          class: PROPOSAL_CLASSES.PROMPT_REVISION,
          target: { kind, path: `${kind}.md` },
          to: "replacement prose",
          applierId: command.id,
          evidence: [1, 2],
        });
        assert.equal(proposal.patch, null);
        assert.equal(proposal.applier, null);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.REPLACEMENT_PROSE_NOT_COMPUTABLE);
        assert.deepEqual(proposal.evidence, [1, 2]);
      }
    },
  },
  {
    name: "tune proposal 62/01 task 02 — story sizing has no target and its own coded reason",
    run: () => {
      const proposal = emitted({ class: PROPOSAL_CLASSES.STORY_SIZING, applierId: command.id, evidence: [1, 2] });
      assert.equal(proposal.patch, null);
      assert.equal(proposal.applier, null);
      assert.equal(proposal.reason.code, PROPOSAL_REASONS.NO_TARGET_TO_CHANGE);
    },
  },
  {
    name: "tune proposal 62/01 task 02 — an incomplete computable candidate never renders a partial patch",
    run: () => {
      for (const candidate of [
        cap({ target: null }),
        cap({ to: undefined, proposedValue: undefined }),
      ]) {
        const proposal = emitted(candidate);
        assert.equal(proposal.patch, null);
        assert.equal(proposal.applier, null);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.PATCH_PART_MISSING);
      }
    },
  },
  {
    name: "tune proposal 62/01 task 02 — an empty target id is missing rather than a declared target",
    run: () => {
      for (const candidate of [
        cap({ target: { kind: "config", key: "" } }),
        role({ target: { kind: "model", role: "" } }),
      ]) {
        const proposal = emitted(candidate);
        assert.equal(proposal.patch, null);
        assert.equal(proposal.applier, null);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.PATCH_PART_MISSING);
        assert.deepEqual(proposal.reason.missing, ["target"]);
      }
    },
  },
  {
    name: "tune proposal 62/01 task 02 — patch computability is independent of advisory lane",
    run: () => {
      const proposal = emitted(role());
      assert.equal(proposal.lane, "advisory");
      assert.deepEqual(
        { from: proposal.patch.from, to: proposal.patch.to },
        { from: "model-a", to: "model-b" },
      );
    },
  },
  {
    name: "tune proposal 62/01 task 02 — model reallocations require a non-empty non-descriptive model id",
    run: () => {
      for (const to of [{ model: "model-b" }, [], 42, "", "model b", "switch to the faster model"]) {
        const proposal = emitted(role({ to }));
        assert.equal(proposal.patch, null);
        assert.equal(proposal.applier, null);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.PROPOSED_MODEL_UNEXPECTED_SHAPE);
        assert.equal(proposal.reason.expected, "non-empty-model-id-without-whitespace");
      }
    },
  },
  {
    name: "tune proposal 62/01 task 03 — exact registered command ids resolve without running",
    run: () => {
      let resolved = 0;
      let ran = 0;
      const proposal = emitted(cap(), {
        resolveCommand: (id) => { resolved += 1; return id === command.id ? { id, run: () => { ran += 1; } } : undefined; },
      });
      assert.equal(proposal.applier, command.id);
      assert.equal(resolved, 1);
      assert.equal(ran, 0);
    },
  },
  {
    name: "tune proposal 62/01 task 03 — unknown malformed or approximate appliers are refused",
    run: () => {
      for (const asked of ["missing", command.id.toUpperCase(), `${command.id} `, "npm run apply", "config.json", "edit it", ""]) {
        const proposal = emitted(cap({ applierId: asked }));
        assert.ok(proposal.patch, asked);
        assert.equal(proposal.applier, null, asked);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.APPLIER_NOT_REGISTERED, asked);
        assert.equal(proposal.reason.asked, asked);
        assert.equal(proposal.reason.handEdit, true);
      }
    },
  },
  {
    name: "tune proposal 62/01 task 03 — registering an exact command changes only applier resolution",
    run: () => {
      const refused = emitted(cap(), { resolveCommand: () => undefined });
      const accepted = emitted(cap());
      assert.deepEqual(refused.patch, accepted.patch);
      assert.equal(refused.applier, null);
      assert.equal(accepted.applier, command.id);
    },
  },
  {
    name: "tune proposal 62/01 task 04 — the tunable from is taken from the acceptor report once",
    run: () => {
      let genericReads = 0;
      const proposal = emitted(cap(), {
        acceptorReport: { valueAt: 2 },
        readTarget: () => { genericReads += 1; return 99; },
      });
      assert.equal(proposal.patch.from, 2);
      assert.equal(proposal.patch.fromSource, "acceptor-report");
      assert.equal(genericReads, 0, "a generic target accessor is never a second tunable reader");
    },
  },
  {
    name: "tune proposal 62/01 task 04 — missing and malformed acceptor reports are unreadable, never absent",
    run: () => {
      for (const acceptorReport of [null, {}, { valueAt: undefined }, { valueAt: { present: true } }]) {
        const proposal = emitted(cap({ assumedFrom: undefined }), { acceptorReport });
        assert.equal(proposal.patch, null);
        assert.equal(proposal.applier, null);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.TARGET_UNREADABLE);
        assert.notEqual(proposal.reason.code, PROPOSAL_REASONS.PREMISE_MOVED);
      }
    },
  },
  {
    name: "tune proposal 62/01 task 04 — an advisory cap with no accessor fails closed for absent and present assumptions",
    run: () => {
      for (const assumedFrom of [ABSENT_READING, 2]) {
        const proposal = emitted(cap({
          target: { kind: "config", key: "work.x" },
          assumedFrom,
          to: 3,
        }));
        assert.equal(proposal.lane, PROPOSAL_LANES.ADVISORY);
        assert.equal(proposal.patch, null);
        assert.equal(proposal.applier, null);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.TARGET_UNREADABLE);
        assert.equal(proposal.reason.error, "target-accessor-missing");
      }
    },
  },
  {
    name: "tune proposal 62/01 task 04 — advisory model from uses the model-map accessor layer",
    run: () => {
      const proposal = emitted(role());
      assert.equal(proposal.patch.from, "model-a");
      assert.equal(proposal.patch.fromSource, "work.agents.models");
    },
  },
  {
    name: "tune proposal 62/01 task 04 — absent at the written layer is a complete additive patch",
    run: () => {
      const proposal = emitted(role({ assumedFrom: ABSENT_READING }), { projectConfig: {} });
      assert.equal(proposal.patch.from, ABSENT);
      assert.equal(proposal.patch.fromSource, ABSENT);
      assert.equal(proposal.patch.to, "model-b");
    },
  },
  {
    name: "tune proposal 62/01 task 04 — configured scalar absent is a value, not the private absence sentinel",
    run: () => {
      const proposal = emitted(role({ assumedFrom: ABSENT }), {
        projectConfig: { work: { agents: { models: { developer: ABSENT } } } },
      });
      assert.ok(proposal.patch);
      assert.equal(proposal.patch.from, ABSENT);
      assert.equal(proposal.patch.fromSource, "work.agents.models");
    },
  },
  {
    name: "tune proposal 62/01 task 04 — every moved-premise quadrant is refused with both readings",
    run: () => {
      for (const [assumedFrom, valueAt] of [[2, 4], [2, ABSENT_READING], [ABSENT_READING, 2]]) {
        const proposal = emitted(cap({ assumedFrom }), { acceptorReport: { valueAt } });
        assert.equal(proposal.patch, null);
        assert.equal(proposal.applier, null);
        assert.equal(proposal.reason.code, PROPOSAL_REASONS.PREMISE_MOVED);
        assert.deepEqual(proposal.reason.assumed, assumedFrom === ABSENT_READING ? ABSENT_READING : assumedFrom);
        assert.deepEqual(proposal.reason.inForce, valueAt === ABSENT_READING ? ABSENT_READING : valueAt);
      }
    },
  },
  {
    name: "tune proposal 62/01 task 04 — moved-premise refusal distinguishes structural absence from scalar absent",
    run: () => {
      const structurallyAbsent = emitted(role({ assumedFrom: "model-a" }), { projectConfig: {} });
      const scalarAbsent = emitted(role({ assumedFrom: "model-a" }), {
        projectConfig: { work: { agents: { models: { developer: ABSENT } } } },
      });
      assert.equal(structurallyAbsent.reason.code, PROPOSAL_REASONS.PREMISE_MOVED);
      assert.equal(scalarAbsent.reason.code, PROPOSAL_REASONS.PREMISE_MOVED);
      assert.deepEqual(structurallyAbsent.reason.inForce, ABSENT_READING);
      assert.equal(scalarAbsent.reason.inForce, ABSENT);
      assert.notDeepEqual(structurallyAbsent.reason.inForce, scalarAbsent.reason.inForce);
      assert.notEqual(JSON.stringify(structurallyAbsent.reason), JSON.stringify(scalarAbsent.reason));
      assert.match(JSON.stringify(structurallyAbsent.reason.inForce), /"present":false/u);
    },
  },
  {
    name: "tune proposal 62/01 task 04 — unreadable and unexpected-shape targets are distinct refusals",
    run: () => {
      const unreadable = emitted(cap({ target: { kind: "config", key: OTHER } }), {
        readTarget: () => { throw new Error("boom"); },
      });
      const wrongShape = emitted(cap({ assumedFrom: "two" }), { acceptorReport: { valueAt: "two" } });
      assert.equal(unreadable.reason.code, PROPOSAL_REASONS.TARGET_UNREADABLE);
      assert.equal(wrongShape.reason.code, PROPOSAL_REASONS.UNEXPECTED_VALUE_SHAPE);
      assert.equal(unreadable.patch, null);
      assert.equal(wrongShape.patch, null);
    },
  },
  {
    name: "tune proposal 62/01 task 04 — already-in-force is a finding and not an emitted proposal",
    run: () => {
      const result = emitProposals([cap({ assumedFrom: 3, to: 3 })], context({ acceptorReport: { valueAt: 3 } }));
      assert.deepEqual(result.proposals, []);
      assert.equal(result.findings.length, 1);
      assert.equal(result.findings[0].code, PROPOSAL_REASONS.ALREADY_IN_FORCE);
    },
  },
  {
    name: "tune proposal 62/01 task 04 — already-in-force wins even when evidence assumed an older base",
    run: () => {
      const result = emitProposals([cap({ assumedFrom: 2, to: 3 })], context({ acceptorReport: { valueAt: 3 } }));
      assert.deepEqual(result.proposals, []);
      assert.equal(result.findings.length, 1);
      assert.equal(result.findings[0].code, PROPOSAL_REASONS.ALREADY_IN_FORCE);
      assert.equal(result.findings[0].value, 3);
    },
  },
  {
    name: "tune proposal 62/01 task 04 — a cap proposed as prose is a coded shape refusal",
    run: () => {
      const proposal = emitted(cap({ to: "raise the cap" }));
      assert.equal(proposal.patch, null);
      assert.equal(proposal.applier, null);
      assert.equal(proposal.reason.code, PROPOSAL_REASONS.PROPOSED_VALUE_UNEXPECTED_SHAPE);
      assert.equal(proposal.reason.found, "string");
    },
  },
  {
    name: "tune proposal 62/01 task 04 — a moved premise and an intrinsically uncomputable class stay distinct",
    run: () => {
      const moved = emitted(cap(), { acceptorReport: { valueAt: 4 } });
      const prompt = emitted({ class: PROPOSAL_CLASSES.PROMPT_REVISION, target: { kind: "prompt", path: "p.md" } });
      assert.notEqual(moved.reason.code, prompt.reason.code);
    },
  },
];
