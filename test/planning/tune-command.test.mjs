import { defaultApplication as _aofApplication } from "aof/default-application";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const buildTuneReport = _aofApplication.work.commandTools.tune.buildTuneReport;
const tuneCommand = _aofApplication.getCommand("work:tune");

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
    tunable("packages/work/src/commands/audit.mjs:1"),
    tunable("packages/work/src/commands/observe.mjs:1"),
    advisory("packages/work/src/content-read.mjs:1"),
    advisory("packages/work/src/read.mjs:1"),
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

// 153/05 — promoted prompt lessons through the registered face.
const PROMPT_TARGET = "prompt:packages/core/assets/commands/refine.md";
const LESSON_TEXT = "Declare the existing counter's owning suite before drawing the write set.";
const TARGET_BYTES = "# refine\nstep one\n";
const lessonRecord = (item, id, source, overrides = {}) => record(source, {
  recordType: "lesson",
  item,
  id,
  summary: LESSON_TEXT,
  status: PROMPT_TARGET,
  target: PROMPT_TARGET,
  ...overrides,
});
const READ = "packages/work/src/content-read.mjs:1";
const READ_TWO = "packages/work/src/read.mjs:1";
const ledgerFile = (item) => `wiki/work/${item}_milestone_m${item}/FEEDBACK.ndjson`;
const counts = (surfaced, honoured, departed, irrelevant, recurred) => ({ surfaced, honoured, departed, irrelevant, recurred });
const memoryEvidence = (lessons = {}, extra = {}) => Object.freeze({
  lane: "recall-ledger",
  basis: "observed decisions and repeats; a verdict is not proof that a lesson prevented a mistake",
  complete: true,
  diagnostics: Object.freeze([]),
  lessons: Object.freeze(lessons),
  ...extra,
});
const e1Memory = () => memoryEvidence({
  "45/R13": {
    ...counts(3, 1, 2, 0, 1),
    provenance: "indexed",
    evidence: {
      observations: [1, 2, 3].map((line) => ({ source: ledgerFile("45"), line })),
      recurrences: [{ source: "wiki/work/68_milestone_m68/RETROSPECTIVE.md", line: 3, identity: "68/R10" }],
    },
  },
});

async function promptReport({ records, memory = null, tune = {}, invoke = async () => acceptorReport() } = {}) {
  const base = corpus({ records });
  const reads = [];
  const report = await buildTuneReport({}, context({
    corpus: memory == null ? base : Object.freeze({ ...base, memory }),
    registry,
    invoke,
    realpath: (file) => file,
    readContent: (file) => {
      reads.push(file);
      return TARGET_BYTES;
    },
    ...tune,
  }));
  return { report, reads, prompt: report.proposals.find((proposal) => proposal.class === "prompt-or-brief-revision") };
}

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
            provenance: ["packages/work/src/commands/audit.mjs:1", "packages/work/src/commands/observe.mjs:1"],
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
        tunable("packages/work/src/commands/audit.mjs:1", { to: undefined, moves, arms, epochId: "epoch-7", observedYield: 0.5 }),
        tunable("packages/work/src/commands/observe.mjs:1", { to: undefined, moves, arms, epochId: "epoch-7", observedYield: 0.5 }),
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
        provenance: ["packages/work/src/commands/audit.mjs:1", "packages/work/src/commands/observe.mjs:1"],
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
        tunable("packages/work/src/commands/audit.mjs:1", { from: undefined }),
        tunable("packages/work/src/commands/observe.mjs:1", { from: undefined }),
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
        tunable("packages/work/src/commands/audit.mjs:1", { from: undefined, to: undefined }),
        tunable("packages/work/src/commands/observe.mjs:1", { from: undefined, to: undefined }),
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
        provenance: ["packages/work/src/commands/audit.mjs:1", "packages/work/src/commands/observe.mjs:1"],
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
        tunable("packages/work/src/commands/audit.mjs:1"),
        tunable("packages/work/src/commands/observe.mjs:1"),
        tunable("packages/work/src/content-read.mjs:1", { target: otherKey }),
        tunable("packages/work/src/read.mjs:1", { target: otherKey }),
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
        tunable("packages/work/src/commands/audit.mjs:1"),
        tunable("packages/work/src/commands/observe.mjs:1"),
        tunable("packages/work/src/content-read.mjs:1", { kind: "observation", area: "code", stage: "build", owner: "architect" }),
        tunable("packages/work/src/read.mjs:1", { kind: "observation", area: "code", stage: "build", owner: "architect" }),
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
        tunable("packages/work/src/commands/audit.mjs:1", { to: 2 }),
        tunable("packages/work/src/commands/observe.mjs:1", { to: 2 }),
        tunable("packages/work/src/content-read.mjs:1", { to: 3, kind: "observation", area: "code", stage: "build", owner: "architect" }),
        tunable("packages/work/src/read.mjs:1", { to: 3, kind: "observation", area: "code", stage: "build", owner: "architect" }),
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
        tunable("packages/work/src/commands/audit.mjs:1", { to: 2 }),
        tunable("packages/work/src/commands/observe.mjs:1", { to: 3 }),
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
        tunable("packages/work/src/commands/audit.mjs:1", { from: 2, to: 2 }),
        tunable("packages/work/src/commands/observe.mjs:1", { from: 2, to: 2 }),
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
        advisory("packages/work/src/content-read.mjs:1"),
        advisory("packages/work/src/read.mjs:1"),
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
          advisory("packages/work/src/content-read.mjs:1"),
          advisory("packages/work/src/read.mjs:1"),
          record("packages/work/src/tune/proposal.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
          record("packages/work/src/tune/distance.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
        ] }),
        lanes: Object.freeze([
          ...corpus({ records: [
            advisory("packages/work/src/content-read.mjs:1"),
            advisory("packages/work/src/read.mjs:1"),
            record("packages/work/src/tune/proposal.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
            record("packages/work/src/tune/distance.mjs:1", { target: "model:reviewer", class: "model-reallocation", to: "gpt-5", kind: "observation", area: "code", stage: "design", owner: "architect" }),
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
  // ---------------------------------------------------------------------------------------------
  // 153/05 — the report joins observed verdicts and explicit recurrence, and computes the prompt patch.
  // ---------------------------------------------------------------------------------------------
  {
    name: "tune/153-05 E1: the candidate exposes surfaced, honoured, departed and recurred, citing the ledger rows and both lessons",
    async run() {
      const { prompt } = await promptReport({
        records: [lessonRecord("45", "R13", READ), lessonRecord("68", "R10", READ_TWO, { summary: "A later wording that is not quoted." })],
        memory: e1Memory(),
      });
      const memory = prompt.evidence.memory;
      assert.deepEqual(memory.totals, counts(3, 1, 2, 0, 1));
      assert.deepEqual(memory.lessons["45/R13"], counts(3, 1, 2, 0, 1));
      assert.deepEqual(memory.lessons["68/R10"], counts(0, 0, 0, 0, 0), "a lesson the accounting never saw is zero, not borrowed");
      assert.deepEqual(memory.ledgerRows, [1, 2, 3].map((line) => `${ledgerFile("45")}:${line}`));
      assert.deepEqual(memory.recurrences, ["wiki/work/68_milestone_m68/RETROSPECTIVE.md:3"]);
      assert.deepEqual(memory.sourceLessons, ["45/R13", "68/R10"]);
      assert.equal(memory.lane, "recall-ledger");
      assert.match(memory.basis, /not proof/u);
      assert.equal(prompt.patch.lesson, "45/R13", "the lesson the most later lessons repeat is the one quoted");
      assert.ok(prompt.patch.to.includes(LESSON_TEXT));
      assert.equal(prompt.patch.to.includes("A later wording"), false, "only the canonical lesson's text is quoted");
    },
  },
  {
    name: "tune/153-05 E1: no count is inferred from repeated wording in prose",
    async run() {
      const { prompt } = await promptReport({
        records: [
          lessonRecord("45", "R13", READ, { text: "this recurs from 45/R13 again, and again, honoured, honoured" }),
          lessonRecord("68", "R10", READ_TWO, { text: "recurs recurs recurs: surfaced surfaced surfaced" }),
        ],
        memory: memoryEvidence({}),
      });
      assert.deepEqual(prompt.evidence.memory.totals, counts(0, 0, 0, 0, 0));
      assert.deepEqual(prompt.evidence.memory.ledgerRows, []);
      assert.deepEqual(prompt.evidence.memory.recurrences, []);
    },
  },
  {
    name: "tune/153-05 E2: extra observations do not counterfeit a second source document",
    async run() {
      const { report, prompt } = await promptReport({
        records: [
          lessonRecord("45", "R13", "packages/work/src/read.mjs:1"),
          lessonRecord("45", "R14", "packages/work/src/read.mjs:2"),
        ],
        memory: e1Memory(),
      });
      assert.equal(prompt, undefined, "one source document is below the floor of two, however many rows were observed");
      const finding = report.findings.find((entry) => entry.code === "below-evidence-floor");
      assert.ok(finding, "the insufficient-evidence finding is retained");
      assert.equal(finding.distinctSourceDocumentCount, 1);
    },
  },
  {
    name: "tune/153-05: two conflicting prompt destinations are a candidate fact conflict, with no patch and no read",
    async run() {
      const { report, reads, prompt } = await promptReport({
        records: [
          lessonRecord("45", "R13", READ, { status: "prompt:a.md prompt:b.md", target: null }),
          lessonRecord("68", "R10", READ_TWO, { status: "none", target: null }),
        ],
      });
      assert.equal(prompt, undefined);
      const finding = report.findings.find((entry) => entry.code === "candidate-fact-conflict");
      assert.ok(finding);
      assert.deepEqual(finding.conflicts.map((entry) => entry.field), ["promotion-target"]);
      assert.deepEqual(finding.conflicts[0].values, ["prompt:a.md", "prompt:b.md"]);
      assert.deepEqual(reads, []);
    },
  },
  {
    name: "tune/153-05 E5: a target that resolves outside the repository is refused before a byte is read",
    async run() {
      const outside = path.join(os.tmpdir(), "aof-outside-the-repository", "refine.md");
      const { report, reads, prompt } = await promptReport({
        records: [lessonRecord("45", "R13", READ), lessonRecord("68", "R10", READ_TWO)],
        tune: { realpath: (file) => (path.resolve(file) === path.resolve(root) ? file : outside) },
      });
      assert.equal(prompt.patch, null);
      assert.equal(prompt.reason.code, "target-boundary");
      assert.deepEqual(reads, [], "the instrumented content reader was never called");
      assert.equal(JSON.stringify(report).includes(outside), false, "the outside location is not echoed");
    },
  },
  {
    name: "tune/153-05: a target that cannot be found is unreadable, and a reader that throws is unreadable too",
    async run() {
      const missing = await promptReport({
        records: [lessonRecord("45", "R13", READ), lessonRecord("68", "R10", READ_TWO)],
        tune: { realpath: () => { throw Object.assign(new Error("gone"), { code: "ENOENT" }); } },
      });
      assert.equal(missing.prompt.reason.code, "target-unreadable");
      assert.match(missing.prompt.reason.error, /no such file/u);
      const failing = await promptReport({
        records: [lessonRecord("45", "R13", READ), lessonRecord("68", "R10", READ_TWO)],
        tune: { readContent: () => { throw new Error("EISDIR: illegal operation on a directory"); } },
      });
      assert.equal(failing.prompt.reason.code, "target-unreadable");
      assert.match(failing.prompt.reason.error, /EISDIR/u);
    },
  },
  {
    name: "tune/153-05: an already-present lesson block is already-in-force, with no duplicate patch, every time",
    async run() {
      const block = `<!-- aof:lesson 45/R13 -->\n${LESSON_TEXT}\n<!-- /aof:lesson 45/R13 -->\n`;
      const options = {
        records: [lessonRecord("45", "R13", READ), lessonRecord("68", "R10", READ_TWO)],
        memory: e1Memory(),
        tune: { readContent: () => `${TARGET_BYTES}\n${block}` },
      };
      const first = await promptReport(options);
      const second = await promptReport(options);
      assert.equal(first.prompt, undefined);
      const found = first.report.findings.filter((entry) => entry.code === "already-in-force");
      assert.equal(found.length, 1);
      assert.equal(found[0].lesson, "45/R13");
      assert.deepEqual(second.report.findings, first.report.findings, "repeated reports are deterministic");
    },
  },
  {
    name: "tune/153-05: a cap adjustment and a recurring prompt candidate in one run keep their separate paths",
    async run() {
      const calls = [];
      const { report } = await promptReport({
        records: [
          tunable("packages/work/src/commands/audit.mjs:1"),
          tunable("packages/work/src/commands/observe.mjs:1"),
          lessonRecord("45", "R13", READ),
          lessonRecord("68", "R10", READ_TWO),
        ],
        invoke: async (id, input) => {
          calls.push({ id, input });
          return acceptorReport();
        },
      });
      assert.equal(calls.length, 1, "the acceptor is consulted once");
      assert.deepEqual(calls[0].input.proposals.map((entry) => entry.key), [key], "and only about the ordinal key");
      const cap = report.proposals.find((proposal) => proposal.lane === "tunable");
      assert.equal(cap.verdict, "report-only", "the cap adjustment keeps its acceptor assessment");
      const prompt = report.proposals.find((proposal) => proposal.class === "prompt-or-brief-revision");
      assert.equal(prompt.lane, "advisory");
      assert.equal(Object.prototype.hasOwnProperty.call(prompt, "verdict"), false, "the prompt candidate is never assessed");
      assert.equal(prompt.applier, null);
      assert.ok(prompt.patch, "and it still carries its computed patch");
      assert.match(tuneCommand.cli.render(report), /^advisory packages\/core\/assets\/commands\/refine\.md: /mu);
    },
  },
  {
    name: "tune/153-05: memory diagnostics are findings naming their source, beside valid counts",
    async run() {
      const diagnostics = Object.freeze([Object.freeze({ source: ledgerFile("46"), defect: "malformed ledger JSON", line: 2 })]);
      const { report } = await promptReport({
        records: [lessonRecord("45", "R13", READ), lessonRecord("68", "R10", READ_TWO)],
        memory: memoryEvidence({ "45/R13": { ...counts(1, 1, 0, 0, 0), evidence: { observations: [{ source: ledgerFile("45"), line: 1 }], recurrences: [] } } }, { complete: false, diagnostics, ledgers: [], retrospectives: [], items: [] }),
      });
      const finding = report.findings.find((entry) => entry.code === "memory-evidence-defect");
      assert.equal(finding.source, ledgerFile("46"));
      assert.equal(finding.line, 2);
      assert.equal(report.findings.filter((entry) => entry.code === "memory-evidence-defect").length, 1, "only the defective source is described as corrupt");
      assert.match(tuneCommand.cli.render(report), /Corpus memory \(recall-ledger\)/u);
    },
  },
];
