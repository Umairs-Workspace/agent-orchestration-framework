import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

import { buildTuneReport, tuneCommand } from "../../src/commands/tune.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const key = "fixture.reviewRounds";
const otherKey = "fixture.otherRounds";
const modelFor = (...keys) => Object.freeze({
  nodes: Object.freeze([Object.freeze({
    id: "arbiter:fixture",
    path: ".aof/loops/fixture.md",
    edges: Object.freeze({
      "parameter-tuning": Object.freeze(keys.map((operand) => Object.freeze({ scheme: "config", operand }))),
    }),
  })]),
});
const model = modelFor(key);

const record = (source, overrides = {}) => ({
  source,
  title: "an explicitly described candidate",
  text: "prose is evidence, never a target or a step",
  kind: "mistake",
  area: "process",
  stage: "review",
  owner: "developer",
  ...overrides,
});

const tunable = (source, overrides = {}) => record(source, {
  target: key,
  class: "cap-adjustment",
  from: 1,
  to: 2,
  ...overrides,
});

const advisory = (source, overrides = {}) => record(source, {
  target: "prompt:review-handoff",
  class: "prompt-or-brief-revision",
  stage: "build",
  ...overrides,
});

function corpus({ matched = true, records = null } = {}) {
  const rows = records ?? [
    tunable("src/commands/audit.mjs:1"),
    tunable("src/commands/observe.mjs:1"),
    advisory("src/work.mjs:1"),
    advisory("src/work/read.mjs:1"),
  ];
  return Object.freeze({
    scope: matched ? null : "missing",
    matched,
    items: Object.freeze(matched ? ["62"] : []),
    reads: Object.freeze(matched ? [{ sweep: "lessons", count: rows.length, floor: 1, what: "fixture lessons", root }] : []),
    findings: Object.freeze([]),
    lanes: Object.freeze(matched ? [{ lane: "lessons", contribution: Object.freeze(rows) }] : []),
  });
}

const acceptorEvidence = Object.freeze({ count: 4, threshold: 8, record: "4-0" });
const acceptorRefusals = Object.freeze([Object.freeze({
  code: "acceptor-owned-reason",
  removal: "the acceptor's own removal text",
})]);
const acceptorDistance = Object.freeze({ unit: "rulings", value: 4, reachable: true });

function acceptorRow(overrides = {}) {
  return Object.freeze({
    key,
    proposal: Object.freeze({ from: 1, to: 2 }),
    verdict: "report-only",
    eligible: false,
    evidence: acceptorEvidence,
    refusals: acceptorRefusals,
    constructionRefusals: Object.freeze([]),
    distance: acceptorDistance,
    admissibility: Object.freeze({ considered: true, refusals: Object.freeze([]) }),
    ...overrides,
  });
}

function acceptorReport(rows = [acceptorRow()]) {
  return Object.freeze({
    census: Object.freeze({ populations: Object.freeze([]) }),
    proposals: Object.freeze(rows),
  });
}

function context(tune = {}) {
  return {
    workspace: { projectRoot: root, workDir: `${root}/wiki/work`, config: {}, configPath: `${root}/.aof/aof.config.json` },
    tune: { model, corpus: corpus(), ...tune },
  };
}

const registry = { getCommand: (id) => (id === "work:acceptor" ? { id } : undefined) };

export const tuneCommandTests = [
  {
    name: "tune/00 the registered face shapes explicit source facts before one acceptor invocation",
    async run() {
      const calls = [];
      const inputCorpus = corpus();
      const report = await buildTuneReport({}, context({
        corpus: inputCorpus,
        registry,
        invoke: async (id, input) => {
          calls.push({ id, input });
          return acceptorReport();
        },
      }));
      assert.equal(tuneCommand.id, "work:tune");
      assert.deepEqual(tuneCommand.cli.route, ["work", "tune"]);
      assert.equal(tuneCommand.cli.spec.usage, "aof work tune [scope] [--json]");
      assert.deepEqual(tuneCommand.cli.spec.flags, {});
      assert.deepEqual(calls, [{
        id: "work:acceptor",
        input: {
          proposals: [{
            key,
            to: 2,
            provenance: ["src/commands/audit.mjs:1", "src/commands/observe.mjs:1"],
          }],
        },
      }]);
      assert.equal(Object.prototype.hasOwnProperty.call(calls[0].input.proposals[0], "proposed"), false);
      assert.ok(report.proposals.some((proposal) => proposal.lane === "tunable" && proposal.patch?.to === 2 && proposal.sourceFacts.target === key));
      assert.ok(report.proposals.some((proposal) => proposal.lane === "advisory" && proposal.reason?.code === "replacement-prose-not-computable"));
      assert.strictEqual(report.corpus, inputCorpus);
      assert.strictEqual(tuneCommand.cli.json(report), report);
      assert.match(tuneCommand.cli.render(report).split("\n")[0], /^Distance:/u);
      assert.equal(tuneCommand.cli.exit(report), 0);
    },
  },
  {
    name: "tune/01 acceptor verdict evidence refusals and distance travel verbatim; advisory rows carry none",
    async run() {
      const report = await buildTuneReport({}, context({ registry, invoke: async () => acceptorReport() }));
      const tunableProposal = report.proposals.find((proposal) => proposal.lane === "tunable");
      const advisoryProposal = report.proposals.find((proposal) => proposal.lane === "advisory");
      assert.equal(tunableProposal.verdict, "report-only");
      assert.equal(tunableProposal.eligible, false);
      assert.strictEqual(tunableProposal.acceptorEvidence, acceptorEvidence);
      assert.strictEqual(tunableProposal.refusals, acceptorRefusals);
      assert.strictEqual(tunableProposal.acceptorDistance, acceptorDistance);
      for (const field of ["verdict", "eligible", "acceptorEvidence", "refusals", "acceptorDistance"]) {
        assert.equal(Object.prototype.hasOwnProperty.call(advisoryProposal, field), false, field);
      }
      assert.ok(report.proposals.every((proposal) => proposal.distance != null));
      const human = tuneCommand.cli.render(report);
      for (const fact of ["patch:", "reason:", "standing distance:", "evidence:", "acceptor refusal:"]) {
        assert.match(human, new RegExp(fact, "u"));
      }
      assert.doesNotMatch(human, /undefined/u);
    },
  },
  {
    name: "tune/00 moves and experiment facts cross the injected acceptor seam exactly",
    async run() {
      const moves = Object.freeze([Object.freeze({ from: 1, to: 2 }), Object.freeze({ from: 2, to: 3 })]);
      const arms = Object.freeze([Object.freeze({ id: "control" }), Object.freeze({ id: "trial" })]);
      const records = [
        tunable("src/commands/audit.mjs:1", { to: undefined, moves, arms, epochId: "epoch-7", observedYield: 0.5 }),
        tunable("src/commands/observe.mjs:1", { to: undefined, moves, arms, epochId: "epoch-7", observedYield: 0.5 }),
      ];
      let offered = null;
      await buildTuneReport({}, context({
        corpus: corpus({ records }),
        registry,
        invoke: async (_id, input) => { offered = input.proposals; return acceptorReport(); },
      }));
      assert.deepEqual(offered, [{
        key,
        moves,
        arms,
        epochId: "epoch-7",
        observedYield: 0.5,
        provenance: ["src/commands/audit.mjs:1", "src/commands/observe.mjs:1"],
      }]);
      assert.equal(Object.prototype.hasOwnProperty.call(offered[0], "proposed"), false);
      assert.equal(Object.prototype.hasOwnProperty.call(offered[0], "from"), false);
    },
  },
  {
    name: "tune/01 the acceptor's current value owns rebasing and source from is assumption only",
    async run() {
      const moved = await buildTuneReport({}, context({
        registry,
        invoke: async () => acceptorReport([acceptorRow({ proposal: Object.freeze({ from: 5, to: 2 }) })]),
      }));
      const movedProposal = moved.proposals.find((proposal) => proposal.lane === "tunable");
      assert.equal(movedProposal.patch, null);
      assert.equal(movedProposal.reason.code, "premise-moved");
      assert.equal(movedProposal.reason.assumed, 1);
      assert.equal(movedProposal.reason.inForce, 5);

      const noSourceFrom = [
        tunable("src/commands/audit.mjs:1", { from: undefined }),
        tunable("src/commands/observe.mjs:1", { from: undefined }),
      ];
      let offered = null;
      const rebased = await buildTuneReport({}, context({
        corpus: corpus({ records: noSourceFrom }),
        registry,
        invoke: async (_id, input) => { offered = input.proposals; return acceptorReport(); },
      }));
      assert.equal(Object.prototype.hasOwnProperty.call(offered[0], "from"), false);
      const proposal = rebased.proposals.find((entry) => entry.lane === "tunable");
      assert.deepEqual(proposal.patch, { target: proposal.target, from: 1, to: 2, fromSource: "acceptor-report" });
    },
  },
  {
    name: "tune/01 a structured config target without a step is still offered and carries the acceptor construction refusal",
    async run() {
      const records = [
        tunable("src/commands/audit.mjs:1", { from: undefined, to: undefined }),
        tunable("src/commands/observe.mjs:1", { from: undefined, to: undefined }),
      ];
      const constructionRefusals = Object.freeze([Object.freeze({
        code: "no-step-proposed",
        message: "The proposal names no step, so no ruling can be constructed.",
      })]);
      let offered = null;
      const report = await buildTuneReport({}, context({
        corpus: corpus({ records }),
        registry,
        invoke: async (_id, input) => {
          offered = input.proposals;
          return acceptorReport([acceptorRow({
            proposal: Object.freeze({ from: 1, to: null }),
            verdict: "construction-refused",
            evidence: null,
            refusals: Object.freeze([]),
            constructionRefusals,
            distance: null,
          })]);
        },
      }));
      assert.deepEqual(offered, [{
        key,
        provenance: ["src/commands/audit.mjs:1", "src/commands/observe.mjs:1"],
      }]);
      const proposal = report.proposals.find((entry) => entry.lane === "tunable");
      assert.equal(proposal.reason.code, "patch-part-missing");
      assert.strictEqual(proposal.constructionRefusals, constructionRefusals);
      assert.equal(proposal.verdict, "construction-refused");
      assert.equal(tuneCommand.cli.exit(report), 0);
    },
  },
  {
    name: "tune/02 unreachable acceptor is a non-zero construction failure and no local verdict appears",
    async run() {
      const report = await buildTuneReport({}, context({
        registry: { getCommand: () => undefined, invoke: async () => { throw new Error("must not invoke"); } },
      }));
      assert.equal(report.failure.code, "acceptor-unreachable");
      assert.equal(report.failure.command, "work:acceptor");
      assert.equal(tuneCommand.cli.exit(report), 1);
      assert.match(tuneCommand.cli.render(report).split("\n")[0], /^acceptor-unreachable:/u);
      for (const proposal of report.proposals.filter((entry) => entry.lane === "tunable")) {
        assert.equal(proposal.verdictFailure.code, "acceptor-unreachable");
        assert.equal(Object.prototype.hasOwnProperty.call(proposal, "verdict"), false);
        assert.equal(Object.prototype.hasOwnProperty.call(proposal, "eligible"), false);
      }
    },
  },
  {
    name: "tune/02 malformed incomplete missing and duplicate reached rows are per-proposal no-verdict facts at exit zero",
    async run() {
      const malformed = [
        { nope: true },
        { proposals: [] },
        acceptorReport([acceptorRow({ verdict: undefined })]),
        acceptorReport([acceptorRow(), acceptorRow({ verdict: "eligible", eligible: true })]),
      ];
      for (const answer of malformed) {
        const report = await buildTuneReport({}, context({ registry, invoke: async () => answer }));
        assert.equal(report.failure, undefined);
        assert.equal(tuneCommand.cli.exit(report), 0);
        const row = report.proposals.find((proposal) => proposal.lane === "tunable");
        assert.match(row.verdictFailure.code, /^acceptor-(?:answer-unreadable|row-absent)$/u);
        assert.equal(Object.prototype.hasOwnProperty.call(row, "verdict"), false);
        assert.doesNotMatch(tuneCommand.cli.render(report), /undefined/u);
        assert.match(tuneCommand.cli.render(report).split("\n")[0], /^Distance:/u);
      }
    },
  },
  {
    name: "tune/02 an invoked acceptor that throws is command machinery failure",
    async run() {
      const raised = new Error("acceptor exploded");
      raised.code = "acceptor-exploded";
      const report = await buildTuneReport({}, context({ registry, invoke: async () => { throw raised; } }));
      assert.equal(report.failure.code, "acceptor-exploded");
      assert.equal(tuneCommand.cli.exit(report), 1);
      assert.match(tuneCommand.cli.render(report).split("\n")[0], /^acceptor-exploded:/u);
      assert.ok(report.proposals.filter((entry) => entry.lane === "tunable").every((entry) => entry.verdictFailure.code === "acceptor-exploded"));
    },
  },
  {
    name: "tune/02 one missing acceptor row does not cost another key its verdict",
    async run() {
      const records = [
        tunable("src/commands/audit.mjs:1"),
        tunable("src/commands/observe.mjs:1"),
        tunable("src/work.mjs:1", { target: otherKey }),
        tunable("src/work/read.mjs:1", { target: otherKey }),
      ];
      const report = await buildTuneReport({}, context({
        model: modelFor(key, otherKey),
        corpus: corpus({ records }),
        registry,
        invoke: async () => acceptorReport([acceptorRow()]),
      }));
      const answered = report.proposals.find((entry) => entry.target?.id === key);
      const unanswered = report.proposals.find((entry) => entry.target?.id === otherKey);
      assert.equal(answered.verdict, "report-only");
      assert.equal(answered.verdictFailure, undefined);
      assert.equal(unanswered.verdictFailure.code, "acceptor-row-absent");
      assert.equal(Object.prototype.hasOwnProperty.call(unanswered, "verdict"), false);
      assert.equal(report.failure, undefined);
      assert.equal(tuneCommand.cli.exit(report), 0);
    },
  },
  {
    name: "tune/01 same-key candidates consolidate without loss and duplicate returned verdicts cannot bleed",
    async run() {
      const records = [
        tunable("src/commands/audit.mjs:1"),
        tunable("src/commands/observe.mjs:1"),
        tunable("src/work.mjs:1", { kind: "observation", area: "code", stage: "build", owner: "architect" }),
        tunable("src/work/read.mjs:1", { kind: "observation", area: "code", stage: "build", owner: "architect" }),
      ];
      let offered = null;
      const report = await buildTuneReport({}, context({
        corpus: corpus({ records }),
        registry,
        invoke: async (_id, input) => {
          offered = input.proposals;
          return acceptorReport([acceptorRow(), acceptorRow({ verdict: "eligible", eligible: true })]);
        },
      }));
      assert.equal(offered.length, 1);
      assert.equal(offered[0].provenance.length, 4);
      assert.equal(report.failure, undefined);
      assert.equal(tuneCommand.cli.exit(report), 0);
      assert.equal(report.proposals.find((entry) => entry.lane === "tunable").verdictFailure.code, "acceptor-answer-unreadable");
      assert.equal(Object.prototype.hasOwnProperty.call(report.proposals[0], "verdict"), false);
    },
  },
  {
    name: "tune/01 incompatible same-key steps and source-field conflicts become construction findings",
    async run() {
      const incompatible = [
        tunable("src/commands/audit.mjs:1", { to: 2 }),
        tunable("src/commands/observe.mjs:1", { to: 2 }),
        tunable("src/work.mjs:1", { to: 3, kind: "observation", area: "code", stage: "build", owner: "architect" }),
        tunable("src/work/read.mjs:1", { to: 3, kind: "observation", area: "code", stage: "build", owner: "architect" }),
      ];
      let calls = 0;
      const report = await buildTuneReport({}, context({
        corpus: corpus({ records: incompatible }),
        registry,
        invoke: async () => { calls += 1; return acceptorReport(); },
      }));
      assert.equal(calls, 0);
      assert.ok(report.findings.some((finding) => finding.code === "tunable-step-conflict"));

      const conflictingSources = [
        tunable("src/commands/audit.mjs:1", { to: 2 }),
        tunable("src/commands/observe.mjs:1", { to: 3 }),
      ];
      const conflict = await buildTuneReport({}, context({ corpus: corpus({ records: conflictingSources }), registry }));
      assert.ok(conflict.findings.some((finding) => finding.code === "candidate-fact-conflict"));
    },
  },
  {
    name: "tune/00 emitProposal findings are retained and null proposals never enter distance",
    async run() {
      let invoked = 0;
      const already = [
        tunable("src/commands/audit.mjs:1", { from: 2, to: 2 }),
        tunable("src/commands/observe.mjs:1", { from: 2, to: 2 }),
      ];
      const report = await buildTuneReport({}, context({
        corpus: corpus({ records: already }),
        registry,
        invoke: async () => {
          invoked += 1;
          return acceptorReport([acceptorRow({ proposal: Object.freeze({ from: 2, to: 2 }) })]);
        },
      }));
      assert.equal(invoked, 1);
      assert.equal(report.proposals.length, 0);
      assert.ok(report.findings.some((finding) => finding.code === "already-in-force"));
    },
  },
  {
    name: "tune/03 explicit advisory source facts seek no verdict and still report",
    async run() {
      let invoked = 0;
      const advisoryOnly = corpus({ records: [
        advisory("src/work.mjs:1"),
        advisory("src/work/read.mjs:1"),
      ] });
      const report = await buildTuneReport({}, context({
        corpus: advisoryOnly,
        registry,
        invoke: async () => { invoked += 1; return acceptorReport(); },
      }));
      assert.equal(invoked, 0);
      assert.ok(report.proposals.length > 0);
      assert.ok(report.proposals.every((proposal) => proposal.lane === "advisory"));
      assert.equal(tuneCommand.cli.exit(report), 0);
    },
  },
  {
    name: "tune/03 prompt model and observation-lane facts survive composition without reclassification",
    async run() {
      const observationAnswer = Object.freeze({
        entries: Object.freeze([]),
        series: Object.freeze([Object.freeze({ key: "series-1", values: Object.freeze([1, 2]) })]),
        readings: Object.freeze([Object.freeze({ value: 2, source: "counter" })]),
        attributed: Object.freeze({ item: "62", figures: Object.freeze({ accepted: 2 }) }),
      });
      const inputCorpus = Object.freeze({
        ...corpus({ records: [
          advisory("src/work.mjs:1"),
          advisory("src/work/read.mjs:1"),
          record("src/work-tune/proposal.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
          record("src/work-tune/distance.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
        ] }),
        lanes: Object.freeze([
          ...corpus({ records: [
            advisory("src/work.mjs:1"),
            advisory("src/work/read.mjs:1"),
            record("src/work-tune/proposal.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
            record("src/work-tune/distance.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
          ] }).lanes,
          Object.freeze({
            lane: "observations",
            read: Object.freeze({ sweep: "observations", count: 2, floor: 1, what: "fixture observations", root }),
            contribution: observationAnswer,
            raw: observationAnswer,
            findings: Object.freeze([]),
          }),
        ]),
      });
      const report = await buildTuneReport({}, context({ corpus: inputCorpus, registry }));
      assert.strictEqual(report.corpus, inputCorpus);
      assert.strictEqual(report.corpus.lanes[1].contribution, observationAnswer);
      assert.ok(report.proposals.some((proposal) => proposal.class === "prompt-or-brief-revision" && proposal.target.id === "review-handoff"));
      assert.ok(report.proposals.some((proposal) => proposal.class === "model-reallocation" && proposal.target.id === "reviewer"));
      assert.match(tuneCommand.cli.render(report), new RegExp(JSON.stringify(observationAnswer).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    },
  },
  {
    name: "tune/04 starved production lanes render raw observation figures when contribution is null",
    async run() {
      const raw = Object.freeze({
        entries: Object.freeze([Object.freeze({ item: "62", state: "read-empty", reading: null })]),
        series: 1,
        readings: 0,
        attributed: 0,
      });
      const finding = Object.freeze({ code: "tune-ran-on-nothing", message: "observations were starved" });
      const inputCorpus = Object.freeze({
        scope: null,
        matched: true,
        items: Object.freeze(["62"]),
        reads: Object.freeze([Object.freeze({ sweep: "observations", count: 0, floor: 3, what: "fixture observations", root })]),
        findings: Object.freeze([finding]),
        lanes: Object.freeze([Object.freeze({
          lane: "observations",
          read: Object.freeze({ sweep: "observations", count: 0, floor: 3, what: "fixture observations", root }),
          contribution: null,
          raw,
          findings: Object.freeze([finding]),
        })]),
      });
      const report = await buildTuneReport({}, context({ corpus: inputCorpus, registry }));
      const human = tuneCommand.cli.render(report);
      assert.match(human, new RegExp(JSON.stringify(raw).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
      assert.match(human, /series 1; readings 0; attributed 0/u);
      assert.doesNotMatch(human, /Corpus lane observations: null/u);
    },
  },
  {
    name: "tune/00 unresolved scope is an empty successful answer",
    async run() {
      const report = await buildTuneReport({ scope: "missing" }, context({ corpus: corpus({ matched: false }) }));
      assert.deepEqual(report.scope, { requested: "missing", matched: false, items: [] });
      assert.deepEqual(report.proposals, []);
      assert.match(report.headline.summary, /matched no work items/u);
      assert.equal(tuneCommand.cli.exit(report), 0);
    },
  },
];
