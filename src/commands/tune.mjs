// work:tune — milestone 62's read-only convergence face.
//
// The leaves below own corpus assembly, candidate formation, proposal shaping,
// provenance and distance respectively. This module composes those answers and
// defers its registry import: command-core imports this file to register the
// command, so a module-scope import back into the registry would close the TDZ
// ring. The acceptor remains the only source of a tunable proposal's verdict.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 62 / story 04 — the read-only self-improvement face. Like audit and
//   acceptor it is board-deferred; the command itself composes the stage-1 leaves
//   and reaches the acceptor only through this registry at run time.
import { assembleCorpus } from "../work-tune/corpus.mjs";
import { formCandidates } from "../work-tune/formation.mjs";
import {
  PROPOSAL_LANES,
  computeProposalLane,
  emitProposal,
  proposalClassForTarget,
} from "../work-tune/proposal.mjs";
import { emitProposals as resolveProvenance } from "../work-tune/provenance.mjs";
import { attachProposalDistances } from "../work-tune/distance.mjs";
import { tunableSet } from "../work-acceptor/admissibility.mjs";
import { loadLoops } from "../work/loops.mjs";
import { commandError } from "../command-error.mjs";

const ACCEPTOR_COMMAND_ID = "work:acceptor";

const freeze = (value) => Object.freeze(value);
const list = (value) => freeze(Array.isArray(value) ? value : []);
const own = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key);
const SOURCE_FACT_FIELDS = freeze([
  freeze({ name: "target", keys: freeze(["target"]) }),
  freeze({ name: "class", keys: freeze(["class", "proposalClass"]) }),
  freeze({ name: "from", keys: freeze(["from"]) }),
  freeze({ name: "to", keys: freeze(["to", "proposedValue", "proposed"]) }),
  freeze({ name: "moves", keys: freeze(["moves"]) }),
  freeze({ name: "arms", keys: freeze(["arms"]) }),
  freeze({ name: "epochId", keys: freeze(["epochId"]) }),
  freeze({ name: "observedYield", keys: freeze(["observedYield"]) }),
  freeze({ name: "now", keys: freeze(["now"]) }),
]);

async function deferredRegistry() {
  return await import("../command-core.mjs");
}

function corpusRecords(corpus) {
  const records = [];
  for (const lane of corpus?.lanes ?? []) {
    const contribution = lane?.contribution;
    const rows = Array.isArray(contribution)
      ? contribution
      : Array.isArray(contribution?.entries)
        ? contribution.entries
        : [];
    for (const row of rows) records.push({ ...row, lane: lane.lane });
  }
  return records;
}

function stableValue(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (seen.has(value)) return '"<cycle>"';
  seen.add(value);
  const answer = Array.isArray(value)
    ? `[${value.map((entry) => stableValue(entry, seen)).join(",")}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key], seen)}`).join(",")}}`;
  seen.delete(value);
  return answer;
}

function unique(values) {
  const byValue = new Map();
  for (const value of values) byValue.set(stableValue(value), value);
  return [...byValue.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value);
}

function sourceFact(source, field) {
  for (const key of field.keys) if (own(source, key) && source[key] !== undefined) return source[key];
  return undefined;
}

function evidenceOn(candidate) {
  return freeze({
    count: candidate.provenanceResolution.distinctSourceDocumentCount,
    distinctSourceDocumentCount: candidate.provenanceResolution.distinctSourceDocumentCount,
    sourceDocuments: list(candidate.provenanceResolution.sourceDocuments),
    citations: list(candidate.provenanceResolution.resolved),
  });
}

function factsOn(candidate, tunableKeys) {
  const facts = {};
  const conflicts = [];
  for (const field of SOURCE_FACT_FIELDS) {
    const values = unique((candidate.sources ?? [])
      .map((source) => sourceFact(source, field))
      .filter((value) => value !== undefined));
    if (values.length > 1) conflicts.push(freeze({ field: field.name, values: list(values) }));
    else if (values.length === 1) facts[field.name] = values[0];
  }
  if (!own(facts, "target")) facts.target = candidate.target;
  const sourceTarget = facts.target;
  const declaredClass = proposalClassForTarget(sourceTarget);
  if (!own(facts, "class") && declaredClass != null) facts.class = declaredClass;
  else if (declaredClass != null && facts.class !== declaredClass) {
    conflicts.push(freeze({ field: "class-for-target", values: list([facts.class, declaredClass]) }));
  }
  const sourceFacts = freeze({ ...facts });
  const leafFacts = { ...facts };
  if (typeof sourceTarget === "string" && tunableKeys.includes(sourceTarget)) {
    leafFacts.target = freeze({ kind: "config", id: sourceTarget, key: sourceTarget, raw: `config:${sourceTarget}` });
  }
  return freeze({
    facts: sourceFacts,
    leafFacts: freeze(leafFacts),
    sourceTarget,
    conflicts: list(conflicts),
  });
}

function conflictFinding(candidate, answer) {
  return freeze({
    code: "candidate-fact-conflict",
    kind: "candidate-fact-conflict",
    message: `The candidate's sources disagree on explicit ${answer.conflicts.map((entry) => entry.field).join(", ")} facts.`,
    conflicts: answer.conflicts,
    candidate,
    provenanceResolution: candidate.provenanceResolution,
  });
}

function proposalFinding(candidate, finding) {
  return freeze({
    ...finding,
    kind: finding.code,
    message: finding.message ?? `Proposal shaping retained ${finding.code} as a finding rather than emitting a null proposal.`,
    composition: "emitProposal returned a finding; no null proposal entered the report",
    candidate,
    provenanceResolution: candidate.provenanceResolution,
  });
}

function acceptorOffer(entry) {
  const key = entry.lane.target?.key ?? (entry.lane.target?.kind === "config" ? entry.lane.target.id : null);
  if (typeof key !== "string" || key === "") return null;
  const step = { key };
  if (own(entry.sourceFacts, "to")) step.to = entry.sourceFacts.to;
  for (const field of ["moves", "arms", "epochId", "observedYield", "now"]) {
    if (own(entry.sourceFacts, field)) step[field] = entry.sourceFacts[field];
  }
  step.provenance = entry.leafCandidate.provenanceResolution.resolved.map((citation) => citation.citation);
  return freeze(step);
}

function mergeResolved(proposals) {
  const resolved = unique(proposals.flatMap((proposal) => proposal.provenanceResolution.resolved ?? []));
  const sourceDocuments = unique(proposals.flatMap((proposal) => proposal.provenanceResolution.sourceDocuments ?? []));
  return freeze({
    citationCount: resolved.length,
    resolved: list(resolved),
    failures: list([]),
    sourceDocuments: list(sourceDocuments),
    distinctSourceDocumentCount: sourceDocuments.length,
  });
}

function mergeProposalEvidence(proposals, provenanceResolution) {
  return freeze({
    count: provenanceResolution.distinctSourceDocumentCount,
    distinctSourceDocumentCount: provenanceResolution.distinctSourceDocumentCount,
    sourceDocuments: provenanceResolution.sourceDocuments,
    citations: provenanceResolution.resolved,
  });
}

function consolidateTunable(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.offer.key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  const consolidated = [];
  const findings = [];
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key);
    const identities = unique(group.map((entry) => {
      const { provenance: _provenance, ...step } = entry.offer;
      return freeze({
        class: entry.leafCandidate.class,
        target: entry.lane.target,
        ...(own(entry.sourceFacts, "from") ? { assumedFrom: entry.sourceFacts.from } : {}),
        step: freeze(step),
      });
    }));
    if (identities.length > 1) {
      findings.push(freeze({
        code: "tunable-step-conflict",
        kind: "tunable-step-conflict",
        key,
        message: `Multiple candidates for ${key} propose incompatible explicit steps.`,
        shapes: list(identities),
        candidates: list(group.map((entry) => entry.leafCandidate)),
      }));
      continue;
    }
    const provenanceResolution = mergeResolved(group.map((entry) => entry.leafCandidate));
    const leafCandidate = freeze({
      ...group[0].leafCandidate,
      sources: list(unique(group.flatMap((entry) => entry.leafCandidate.sources ?? []))),
      evidence: mergeProposalEvidence(group.map((entry) => entry.leafCandidate), provenanceResolution),
      provenanceResolution,
    });
    const offer = freeze({
      ...identities[0].step,
      provenance: list(provenanceResolution.resolved.map((entry) => entry.citation)),
    });
    consolidated.push(freeze({
      leafCandidate,
      sourceFacts: group[0].sourceFacts,
      lane: group[0].lane,
      offer,
    }));
  }
  return freeze({ entries: list(consolidated), findings: list(findings) });
}

function answerRows(report, expectedKeys) {
  const rows = new Map();
  const failures = new Map();
  if (!Array.isArray(report?.proposals)) {
    for (const key of expectedKeys) failures.set(key, freeze({
      code: "acceptor-answer-unreadable",
      message: "The acceptor answer did not carry a proposals array.",
    }));
    return { rows, failures };
  }
  for (const key of expectedKeys) {
    const matches = report.proposals.filter((row) => row?.key === key);
    if (matches.length !== 1) {
      failures.set(key, freeze({
        code: matches.length === 0 ? "acceptor-row-absent" : "acceptor-answer-unreadable",
        message: `The acceptor answer carried ${matches.length} rows for expected key ${key}.`,
      }));
      continue;
    }
    const row = matches[0];
    const shaped = typeof row.verdict === "string"
      && typeof row.eligible === "boolean"
      && row.proposal != null && typeof row.proposal === "object" && !Array.isArray(row.proposal) && own(row.proposal, "from")
      && own(row, "evidence") && (row.evidence === null || (typeof row.evidence === "object" && !Array.isArray(row.evidence)))
      && Array.isArray(row.refusals)
      && Array.isArray(row.constructionRefusals)
      && own(row, "distance") && (row.distance === null || (typeof row.distance === "object" && !Array.isArray(row.distance)))
      && row.admissibility != null && typeof row.admissibility === "object" && !Array.isArray(row.admissibility);
    if (!shaped) failures.set(key, freeze({
      code: "acceptor-answer-unreadable",
      message: `The acceptor row for ${key} was structurally incomplete.`,
    }));
    else rows.set(key, row);
  }
  return { rows, failures };
}

function roundsItems(corpus) {
  const byItem = new Map();
  const lineage = (corpus?.lanes ?? []).find((lane) => lane?.lane === "lineage");
  for (const run of Array.isArray(lineage?.contribution) ? lineage.contribution : []) {
    const item = String(run?.item ?? "");
    if (!byItem.has(item)) byItem.set(item, []);
    byItem.get(item).push(run);
  }
  return [...byItem].map(([item, runs]) => freeze({ item, runs: list(runs) }));
}

function acceptorFields(row) {
  if (row == null) return {};
  return {
    verdict: row.verdict,
    eligible: row.eligible,
    acceptorEvidence: row.evidence,
    refusals: row.refusals,
    constructionRefusals: row.constructionRefusals,
    acceptorDistance: row.distance,
    admissibility: row.admissibility,
  };
}

function obstacleKey(entry) {
  return `${entry?.code ?? entry?.reason ?? "unmeasured"}:${entry?.removal ?? ""}`;
}

function headlineFor(proposals, corpus) {
  if (proposals.length === 0) {
    return freeze({
      summary: corpus?.matched === false
        ? `scope ${corpus.scope ?? "<all>"} matched no work items`
        : "no proposal was emitted; the corpus reads and candidate findings state what stopped one",
      proposals: 0,
      obstacles: list([]),
      reads: list(corpus?.reads),
      findings: list(corpus?.findings),
    });
  }
  const grouped = new Map();
  for (const proposal of proposals) {
    const seenOnProposal = new Set();
    const entries = [
      ...(proposal.distance?.standing ?? []),
      ...(proposal.distance?.unknown ?? []).map((entry) => ({ kind: "unknown", code: entry.reason, detail: entry })),
    ];
    for (const entry of entries) {
      const key = obstacleKey(entry);
      if (seenOnProposal.has(key)) continue;
      seenOnProposal.add(key);
      const current = grouped.get(key) ?? { ...entry, proposals: 0 };
      current.proposals += 1;
      grouped.set(key, current);
    }
  }
  return freeze({
    summary: `${grouped.size} distinct obstacle(s) stand between ${proposals.length} proposal(s) and a commit`,
    proposals: proposals.length,
    obstacles: list([...grouped.values()].map((entry) => freeze(entry))),
  });
}

function noVerdict(proposal, code, message) {
  return freeze({
    ...proposal,
    verdictFailure: freeze({ code, message }),
  });
}

export async function buildTuneReport(input = {}, ctx = {}) {
  const workspace = ctx.workspace;
  const deps = ctx.tune ?? {};
  const scope = typeof input.scope === "string" && input.scope.trim() !== "" ? input.scope.trim() : null;
  const model = deps.model ?? await loadLoops(workspace);
  const tunableKeys = tunableSet(model).keys;
  const corpus = deps.corpus ?? await assembleCorpus({ cwd: workspace.projectRoot, scope });
  const records = corpusRecords(corpus).map((record) => freeze(record));
  const formed = (deps.formCandidates ?? formCandidates)(records, deps.formationOptions);
  const provenanceInput = formed.candidates.map((candidate) => ({
    ...candidate,
    provenance: candidate.citations,
  }));
  const resolved = (deps.resolveProvenance ?? resolveProvenance)(provenanceInput, {
    rootDir: workspace.projectRoot,
  });
  const candidateFindings = [];
  const candidates = [];
  for (const candidate of resolved.proposals) {
    const answer = factsOn(candidate, tunableKeys);
    if (answer.conflicts.length > 0) {
      candidateFindings.push(conflictFinding(candidate, answer));
      continue;
    }
    const evidence = evidenceOn(candidate);
    const { from: _sourceFrom, ...proposalFacts } = answer.leafFacts;
    const groundedCandidate = freeze({
      ...candidate,
      ...proposalFacts,
      ...(own(answer.facts, "from") ? { assumedFrom: answer.facts.from } : {}),
      evidence,
      ...(typeof answer.sourceTarget === "string" && tunableKeys.includes(answer.sourceTarget)
        ? { key: answer.sourceTarget }
        : {}),
    });
    const lane = computeProposalLane(groundedCandidate, model);
    const leafCandidate = lane.lane === PROPOSAL_LANES.TUNABLE
      ? freeze({ ...groundedCandidate, applierId: ACCEPTOR_COMMAND_ID })
      : groundedCandidate;
    candidates.push(freeze({
      leafCandidate,
      sourceFacts: answer.facts,
      lane,
    }));
  }

  let registry = deps.registry ?? null;
  if (registry == null && candidates.some((entry) => entry.lane.lane === PROPOSAL_LANES.TUNABLE)) {
    registry = await deferredRegistry();
  }
  const resolveCommand = deps.resolveCommand ?? registry?.getCommand;
  const invokeCommand = deps.invoke ?? registry?.invoke;

  const advisory = [];
  const tunable = [];
  const shapingFindings = [];
  for (const entry of candidates) {
    if (entry.lane.lane === PROPOSAL_LANES.TUNABLE) {
      const offer = acceptorOffer(entry);
      if (offer == null) {
        shapingFindings.push(freeze({
          code: "tunable-target-unaddressable",
          kind: "tunable-target-unaddressable",
          message: "A tunable candidate had no addressable config key.",
          candidate: entry.leafCandidate,
        }));
      } else {
        tunable.push(freeze({ ...entry, offer }));
      }
      continue;
    }
    const result = emitProposal(entry.leafCandidate, {
      model,
      config: workspace.config,
      projectConfig: workspace.config,
      resolveCommand,
    });
    if (result.finding != null) {
      shapingFindings.push(proposalFinding(entry.leafCandidate, result.finding));
      continue;
    }
    const proposal = freeze({
      ...result.proposal,
      provenanceResolution: entry.leafCandidate.provenanceResolution,
      sourceFacts: entry.sourceFacts,
    });
    advisory.push(proposal);
  }
  const consolidated = consolidateTunable(tunable);
  let acceptorReport = null;
  let failure = null;

  if (consolidated.entries.length > 0) {
    if (typeof resolveCommand !== "function" || resolveCommand(ACCEPTOR_COMMAND_ID) == null
        || typeof invokeCommand !== "function") {
      failure = freeze({
        code: "acceptor-unreachable",
        command: ACCEPTOR_COMMAND_ID,
        message: `No registered command answers for ${ACCEPTOR_COMMAND_ID}.`,
      });
    } else {
      try {
        acceptorReport = await invokeCommand(
          ACCEPTOR_COMMAND_ID,
          { proposals: consolidated.entries.map((entry) => entry.offer) },
          ctx,
        );
      } catch (error) {
        failure = freeze({
          code: error?.code ?? "acceptor-failed",
          command: ACCEPTOR_COMMAND_ID,
          message: error?.message ?? String(error),
        });
      }
    }
  }

  const answer = failure == null
    ? answerRows(acceptorReport, consolidated.entries.map((entry) => entry.offer.key))
    : { rows: new Map(), failures: new Map() };
  const shapedTunable = [];
  for (const entry of consolidated.entries) {
    const key = entry.offer.key;
    const row = answer.rows.get(key) ?? null;
    const verdictFailure = failure == null
      ? answer.failures.get(key) ?? null
      : freeze({ code: failure.code, message: failure.message });
    const result = emitProposal(entry.leafCandidate, {
      model,
      config: workspace.config,
      projectConfig: workspace.config,
      resolveCommand,
      ...(row == null ? {} : {
        acceptorReport: freeze({ from: row.proposal.from, fromSource: "acceptor-report" }),
      }),
    });
    if (result.finding != null) {
      shapingFindings.push(proposalFinding(entry.leafCandidate, result.finding));
      continue;
    }
    let proposal = freeze({
      ...result.proposal,
      provenanceResolution: entry.leafCandidate.provenanceResolution,
      sourceFacts: entry.sourceFacts,
    });
    proposal = verdictFailure == null
      ? freeze({ ...proposal, ...acceptorFields(row) })
      : noVerdict(proposal, verdictFailure.code, verdictFailure.message);
    shapedTunable.push(freeze({ proposal, row: verdictFailure == null ? row : null }));
  }
  const rounds = roundsItems(corpus);
  const advisoryReport = failure == null && Array.isArray(acceptorReport?.proposals) ? acceptorReport : null;
  const proposals = list([
    ...attachProposalDistances(advisory, { acceptorReport: advisoryReport, roundsItems: rounds }),
    ...shapedTunable.flatMap(({ proposal, row }) => attachProposalDistances([proposal], {
      acceptorReport: row == null ? null : acceptorReport,
      ...(row == null ? {} : { acceptorRow: row }),
      roundsItems: rounds,
    })),
  ]);
  const headline = headlineFor(proposals, corpus);
  const findings = list([
    ...(resolved.findings ?? []),
    ...candidateFindings,
    ...shapingFindings,
    ...consolidated.findings,
  ]);
  const report = {
    ...(failure == null ? {} : { failure }),
    headline,
    scope: freeze({ requested: scope, matched: corpus?.matched !== false, items: list(corpus?.items) }),
    corpus,
    formation: freeze({ criterion: formed.criterion, considered: records.length, candidates: formed.candidates.length }),
    proposalEvidenceFloor: resolved.proposalEvidenceFloor,
    proposals,
    findings,
    acceptor: acceptorReport,
  };
  return freeze(report);
}

function render(result) {
  const lines = [];
  if (result.failure != null) {
    lines.push(`${result.failure.code}: ${result.failure.message} (${result.failure.command})`);
  }
  lines.push(`Distance: ${result.headline.summary}.`);
  for (const obstacle of result.headline.obstacles) {
    lines.push(`  headline obstacle: ${JSON.stringify(obstacle)}`);
  }
  lines.push(`Scope: ${JSON.stringify(result.scope)}`);
  lines.push(`Formation: ${result.formation.candidates} candidate(s) from ${result.formation.considered} record(s); criterion ${JSON.stringify(result.formation.criterion)}.`);
  lines.push(`Proposal evidence floor: ${result.proposalEvidenceFloor} distinct source document(s).`);
  for (const read of result.corpus.reads) {
    lines.push(`Corpus ${read.sweep}: ${read.count} / floor ${read.floor}; ${read.what}; root ${read.root}`);
  }
  for (const finding of result.corpus.findings) lines.push(`Corpus finding: ${JSON.stringify(finding)}`);
  for (const lane of result.corpus.lanes ?? []) {
    lines.push(`Corpus lane ${lane.lane}: ${JSON.stringify(lane.contribution ?? lane.raw)}`);
    if (lane.lane === "observations") {
      lines.push(`  series ${lane.raw.series}; readings ${lane.raw.readings}; attributed ${lane.raw.attributed}`);
    }
  }
  if (result.acceptor != null) lines.push(`Acceptor answer: ${JSON.stringify(result.acceptor)}`);
  for (const proposal of result.proposals) {
    const target = proposal.target?.key ?? proposal.target?.id ?? proposal.class ?? "unaddressed";
    lines.push(`${proposal.lane} ${target}: distance ${proposal.distance.state}, ${proposal.distance.measuredCount} measured obstacle(s).`);
    lines.push(`  lane basis: ${JSON.stringify(proposal.laneBasis)}`);
    lines.push(`  evidence: ${JSON.stringify(proposal.evidence)}`);
    lines.push(`  provenance: ${JSON.stringify(proposal.provenanceResolution)}`);
    lines.push(`  source facts: ${JSON.stringify(proposal.sourceFacts)}`);
    if (proposal.patch != null) lines.push(`  patch: ${JSON.stringify(proposal.patch)}`);
    else lines.push(`  reason: ${JSON.stringify(proposal.reason)}`);
    lines.push(`  applier: ${proposal.applier ?? "none"}.`);
    lines.push(`  distance: ${JSON.stringify(proposal.distance)}`);
    for (const standing of proposal.distance.standing ?? []) {
      lines.push(`  standing distance: ${JSON.stringify(standing)}`);
    }
    for (const unknown of proposal.distance.unknown ?? []) {
      lines.push(`  unknown distance: ${JSON.stringify(unknown)}`);
    }
    if (proposal.verdictFailure != null) {
      lines.push(`  no verdict: ${proposal.verdictFailure.code} — ${proposal.verdictFailure.message}`);
    } else if (Object.prototype.hasOwnProperty.call(proposal, "verdict")) {
      lines.push(`  verdict ${proposal.verdict}; eligible ${proposal.eligible}; acceptor distance ${JSON.stringify(proposal.acceptorDistance)}.`);
      lines.push(`  acceptor evidence: ${JSON.stringify(proposal.acceptorEvidence)}.`);
      lines.push(`  acceptor admissibility: ${JSON.stringify(proposal.admissibility)}.`);
      for (const refusal of proposal.refusals ?? []) lines.push(`  acceptor refusal: ${JSON.stringify(refusal)}`);
      for (const refusal of proposal.constructionRefusals ?? []) lines.push(`  construction refusal: ${JSON.stringify(refusal)}`);
    }
  }
  for (const finding of result.findings) lines.push(`Finding ${finding.code}: ${JSON.stringify(finding)}`);
  lines.push("To apply an eligible proposal, explicitly run aof work acceptor --commit <key>.");
  return lines.join("\n");
}

export const tuneCommand = {
  id: "work:tune",
  input: {
    type: "object",
    properties: { scope: { type: "string" } },
    additionalProperties: false,
  },
  run: buildTuneReport,
  cli: {
    route: ["work", "tune"],
    spec: {
      usage: "aof work tune [scope] [--json]",
      flags: {},
    },
    argv(positionals) {
      if (positionals.length > 1) {
        throw commandError(`"work tune" accepts at most one scope (got "${positionals.slice(1).join(" ")}").`, "invalid-input", 400);
      }
      return { ...(positionals[0] ? { scope: positionals[0] } : {}) };
    },
    render,
    json: (result) => result,
    exit: (result) => (result.failure == null ? 0 : 1),
  },
};
