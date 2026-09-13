// Milestone 62 / story 01 — proposal shaping, lane selection and complete patches.
//
// This leaf is PURE. The loop model, project config, acceptor reports and command
// resolver are handed in. In particular, command-core.mjs is deliberately not imported:
// an applier is data until a human elects to run it.
import { tunableSet } from "../work-acceptor/admissibility.mjs";
import { AGENT_MODEL_MAP_PATH, agentModelMap } from "../work/bundle.mjs";

export const PROPOSAL_CLASSES = Object.freeze({
  CAP_ADJUSTMENT: "cap-adjustment",
  MODEL_REALLOCATION: "model-reallocation",
  PROMPT_REVISION: "prompt-or-brief-revision",
  STORY_SIZING: "story-sizing",
});

export const PROPOSAL_LANES = Object.freeze({
  TUNABLE: "tunable",
  ADVISORY: "advisory",
});

export const PROPOSAL_REASONS = Object.freeze({
  TARGET_ABSENT_FROM_EDGE: "target-absent-from-tuning-edge",
  NOT_AN_ORDINAL_CLASS: "not-an-ordinal-class",
  REPLACEMENT_PROSE_NOT_COMPUTABLE: "replacement-prose-not-computable",
  NO_TARGET_TO_CHANGE: "no-target-to-change",
  PATCH_PART_MISSING: "patch-part-missing",
  APPLIER_NOT_REGISTERED: "applier-not-registered",
  PREMISE_MOVED: "premise-moved",
  UNEXPECTED_VALUE_SHAPE: "unexpected-value-shape",
  TARGET_UNREADABLE: "target-unreadable",
  PROPOSED_VALUE_UNEXPECTED_SHAPE: "proposed-value-unexpected-shape",
  PROPOSED_MODEL_UNEXPECTED_SHAPE: "proposed-model-unexpected-shape",
  ALREADY_IN_FORCE: "already-in-force",
});

// `"absent"` is the report/patch representation, not the in-memory sentinel. A
// configured scalar is allowed to equal this string and must remain a real value.
export const ABSENT = "absent";
export const ABSENT_READING = Object.freeze({ present: false });
const ABSENT_VALUE = Symbol("work-tune.absent");

const own = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key);
const freeze = (value) => Object.freeze(value);

function classOf(candidate) {
  return candidate?.class ?? candidate?.proposalClass ?? candidate?.kind ?? null;
}

function targetOf(candidate) {
  const target = candidate?.target;
  if (typeof target === "string") {
    const colon = target.indexOf(":");
    if (colon > 0) return freeze({ kind: target.slice(0, colon), id: target.slice(colon + 1), raw: target });
    return freeze({ kind: null, id: target, raw: target });
  }
  if (target != null && typeof target === "object") {
    const kind = target.kind ?? target.type ?? target.scheme ?? null;
    const id = target.key ?? target.role ?? target.path ?? target.id ?? target.operand ?? null;
    const raw = kind === "model" && id != null
      ? `${AGENT_MODEL_MAP_PATH}.${id}`
      : (kind && id ? `${kind}:${id}` : id);
    return freeze({ ...target, kind, id, raw: target.raw ?? raw });
  }
  if (typeof candidate?.key === "string") {
    return freeze({ kind: "config", id: candidate.key, key: candidate.key, raw: `config:${candidate.key}` });
  }
  if (typeof candidate?.role === "string") {
    return freeze({ kind: "model", id: candidate.role, role: candidate.role, raw: `${AGENT_MODEL_MAP_PATH}.${candidate.role}` });
  }
  return null;
}

/** Classify only declared target structure; no proposal outcome depends on this map. */
export function proposalClassForTarget(target) {
  const normalized = targetOf({ target });
  if (normalized == null) return PROPOSAL_CLASSES.STORY_SIZING;
  switch (normalized.kind) {
    case "config": return PROPOSAL_CLASSES.CAP_ADJUSTMENT;
    case "model": return PROPOSAL_CLASSES.MODEL_REALLOCATION;
    case "prompt":
    case "brief": return PROPOSAL_CLASSES.PROMPT_REVISION;
    default: return null;
  }
}

function configKey(target) {
  return target?.kind === "config" && typeof target.id === "string" && target.id.length > 0
    ? target.id
    : null;
}

function advisoryGround(candidate, target) {
  switch (classOf(candidate)) {
    case PROPOSAL_CLASSES.MODEL_REALLOCATION:
      return freeze({ code: PROPOSAL_REASONS.NOT_AN_ORDINAL_CLASS, permanent: true });
    case PROPOSAL_CLASSES.PROMPT_REVISION:
      return freeze({ code: PROPOSAL_REASONS.REPLACEMENT_PROSE_NOT_COMPUTABLE, permanent: true });
    case PROPOSAL_CLASSES.STORY_SIZING:
      return freeze({ code: PROPOSAL_REASONS.NO_TARGET_TO_CHANGE, permanent: true });
    default:
      return freeze({
        code: PROPOSAL_REASONS.TARGET_ABSENT_FROM_EDGE,
        permanent: false,
        target: target?.raw ?? null,
      });
  }
}

/** Compute lane membership from the registry edge, never from proposal class. */
export function computeProposalLane(candidate, model) {
  const target = targetOf(candidate);
  const declared = tunableSet(model);
  const key = configKey(target);
  const lane = key !== null && declared.keys.includes(key)
    ? PROPOSAL_LANES.TUNABLE
    : PROPOSAL_LANES.ADVISORY;
  return freeze({
    lane,
    target,
    edge: declared.edge,
    declaredBy: declared.declaredBy,
    declarations: declared.declarations,
    presence: lane === PROPOSAL_LANES.TUNABLE ? "present" : "absent",
    ground: lane === PROPOSAL_LANES.ADVISORY ? advisoryGround(candidate, target) : null,
  });
}

export const proposalLane = (candidate, model) => computeProposalLane(candidate, model).lane;

/** Route only tunable proposals to the injected acceptor. Advisory means never assessed. */
export function laneProposals(candidates = [], { model, assessTunable } = {}) {
  const tunable = [];
  const advisory = [];
  const all = [];
  let acceptorConsulted = 0;
  for (const candidate of candidates) {
    const lane = computeProposalLane(candidate, model);
    const entry = freeze({ candidate, ...lane });
    if (lane.lane === PROPOSAL_LANES.TUNABLE) {
      let assessment = null;
      if (typeof assessTunable === "function") {
        acceptorConsulted += 1;
        assessment = assessTunable(candidate);
      }
      const assessed = freeze({ ...entry, assessment });
      tunable.push(assessed);
      all.push(assessed);
    } else {
      advisory.push(entry);
      all.push(entry);
    }
  }
  return freeze({
    tunable: freeze(tunable),
    advisory: freeze(advisory),
    all: freeze(all),
    acceptorConsulted,
  });
}

function proposedValue(candidate) {
  if (own(candidate, "to") && candidate.to !== undefined) return { present: true, value: candidate.to };
  if (own(candidate, "proposedValue") && candidate.proposedValue !== undefined) {
    return { present: true, value: candidate.proposedValue };
  }
  if (own(candidate, "proposed") && candidate.proposed !== undefined) {
    return { present: true, value: candidate.proposed };
  }
  return { present: false, value: undefined };
}

function assumedValue(candidate) {
  for (const key of ["assumedFrom", "assumedValue", "evidenceBase", "fromAssumed"]) {
    if (own(candidate, key)) {
      const value = candidate[key];
      const absent = value === undefined || value?.present === false || value?.absent === true;
      return { known: true, value: absent ? ABSENT_VALUE : value };
    }
  }
  return { known: false, value: undefined };
}

function normalizeReading(value, source) {
  if (value?.readable === false || value?.error != null) {
    return { readable: false, value: undefined, source, error: value?.error ?? "unreadable" };
  }
  if (value?.present === false || value?.absent === true) {
    return { readable: true, value: ABSENT_VALUE, source: ABSENT };
  }
  if (value?.present === true) {
    return own(value, "value")
      ? { readable: true, value: value.value, source: value.source ?? source }
      : { readable: false, value: undefined, source, error: "reading-value-missing" };
  }
  if (value != null && typeof value === "object" && own(value, "value")) {
    return { readable: true, value: value.value, source: value.source ?? source };
  }
  if (value === undefined) return { readable: false, value: undefined, source, error: "no-reading" };
  return { readable: true, value, source };
}

function reportReading(candidate, context) {
  const report = context.acceptorReport ?? candidate?.acceptorReport ?? candidate?.assessment ?? null;
  if (report == null || typeof report !== "object") {
    return { readable: false, value: undefined, source: "acceptor-report", error: "acceptor-report-missing" };
  }
  if (own(report, "valueAt")) return normalizeReading(report.valueAt, report.valueSource ?? "acceptor-report");
  if (own(report, "from")) return normalizeReading(report.from, report.fromSource ?? "acceptor-report");
  if (own(report, "value")) return normalizeReading(report.value, report.valueSource ?? "acceptor-report");
  return { readable: false, value: undefined, source: "acceptor-report", error: "acceptor-report-malformed" };
}

function modelReading(candidate, context, target) {
  try {
    const map = agentModelMap(context.projectConfig ?? context.config ?? {});
    const role = target?.id ?? candidate?.role;
    return own(map, role)
      ? normalizeReading(map[role], AGENT_MODEL_MAP_PATH)
      : normalizeReading(ABSENT_READING, ABSENT);
  } catch (error) {
    return { readable: false, value: undefined, source: AGENT_MODEL_MAP_PATH, error: error.message };
  }
}

function currentReading(candidate, context, lane, target) {
  // The tunable reading has already been resolved by the acceptor. Asking a generic
  // accessor as well creates a second home and can silently re-base the proposal.
  if (lane === PROPOSAL_LANES.TUNABLE) return reportReading(candidate, context);
  if (typeof context.readTarget === "function") {
    try {
      return normalizeReading(context.readTarget(target, candidate), "target-accessor");
    } catch (error) {
      return { readable: false, value: undefined, source: "target-accessor", error: error.message };
    }
  }
  if (classOf(candidate) === PROPOSAL_CLASSES.MODEL_REALLOCATION) return modelReading(candidate, context, target);
  return {
    readable: false,
    value: undefined,
    source: "target-accessor",
    error: "target-accessor-missing",
  };
}

function valuesEqual(left, right) {
  return Object.is(left, right);
}

const externalValue = (value) => (value === ABSENT_VALUE ? ABSENT : value);
const refusalValue = (value) => (value === ABSENT_VALUE ? ABSENT_READING : value);

function missingPatchReason(parts) {
  return freeze({
    code: PROPOSAL_REASONS.PATCH_PART_MISSING,
    missing: freeze(parts),
  });
}

function patchFor(candidate, context, laneInfo) {
  const kind = classOf(candidate);
  const target = laneInfo.target;
  if (kind === PROPOSAL_CLASSES.PROMPT_REVISION) {
    return { patch: null, reason: freeze({ code: PROPOSAL_REASONS.REPLACEMENT_PROSE_NOT_COMPUTABLE }) };
  }
  if (kind === PROPOSAL_CLASSES.STORY_SIZING) {
    return { patch: null, reason: freeze({ code: PROPOSAL_REASONS.NO_TARGET_TO_CHANGE }) };
  }

  const proposed = proposedValue(candidate);
  const missing = [];
  if (typeof target?.id !== "string" || target.id.length === 0) missing.push("target");
  if (!proposed.present) missing.push("to");
  if (missing.length > 0) return { patch: null, reason: missingPatchReason(missing) };

  if (kind === PROPOSAL_CLASSES.CAP_ADJUSTMENT && !Number.isSafeInteger(proposed.value)) {
    return {
      patch: null,
      reason: freeze({
        code: PROPOSAL_REASONS.PROPOSED_VALUE_UNEXPECTED_SHAPE,
        target: target.raw,
        found: typeof proposed.value,
      }),
    };
  }
  if (kind === PROPOSAL_CLASSES.MODEL_REALLOCATION
      && (typeof proposed.value !== "string"
        || proposed.value.length === 0
        || /\s/u.test(proposed.value))) {
    return {
      patch: null,
      reason: freeze({
        code: PROPOSAL_REASONS.PROPOSED_MODEL_UNEXPECTED_SHAPE,
        target: target.raw,
        found: typeof proposed.value,
        expected: "non-empty-model-id-without-whitespace",
      }),
    };
  }

  const current = currentReading(candidate, context, laneInfo.lane, target);
  if (!current.readable) {
    return {
      patch: null,
      reason: freeze({ code: PROPOSAL_REASONS.TARGET_UNREADABLE, target: target.raw, error: current.error }),
    };
  }
  if (kind === PROPOSAL_CLASSES.CAP_ADJUSTMENT
      && current.value !== ABSENT_VALUE
      && !Number.isSafeInteger(current.value)) {
    return {
      patch: null,
      reason: freeze({
        code: PROPOSAL_REASONS.UNEXPECTED_VALUE_SHAPE,
        target: target.raw,
        found: typeof current.value,
      }),
    };
  }

  const assumed = assumedValue(candidate);
  // A no-op is a finding regardless of what an older observation assumed. It cannot
  // enter the proposal count merely because the premise moved before it became true.
  if (valuesEqual(current.value, proposed.value)) {
    return {
      patch: null,
      finding: freeze({
        code: PROPOSAL_REASONS.ALREADY_IN_FORCE,
        target: target.raw,
        value: externalValue(current.value),
      }),
    };
  }
  if (assumed.known && !valuesEqual(assumed.value, current.value)) {
    return {
      patch: null,
      reason: freeze({
        code: PROPOSAL_REASONS.PREMISE_MOVED,
        target: target.raw,
        assumed: refusalValue(assumed.value),
        inForce: refusalValue(current.value),
      }),
    };
  }
  return {
    patch: freeze({ target, from: externalValue(current.value), to: proposed.value, fromSource: current.source }),
    reason: null,
  };
}

function resolveApplier(candidate, context, patch) {
  if (patch == null) return { applier: null, reason: null };
  const asked = candidate?.applierId ?? candidate?.applier ?? null;
  const command = typeof context.resolveCommand === "function" ? context.resolveCommand(asked) : undefined;
  if (typeof asked === "string" && asked.length > 0 && command != null) {
    return { applier: asked, command, reason: null };
  }
  return {
    applier: null,
    reason: freeze({
      code: PROPOSAL_REASONS.APPLIER_NOT_REGISTERED,
      asked,
      handEdit: true,
    }),
  };
}

/** Shape one already-formed candidate. A no-op is returned only as a finding. */
export function emitProposal(candidate, context = {}) {
  const laneInfo = computeProposalLane(candidate, context.model);
  const built = patchFor(candidate, context, laneInfo);
  if (built.finding != null) return freeze({ proposal: null, finding: built.finding });
  const resolved = resolveApplier(candidate, context, built.patch);
  const reason = built.reason ?? resolved.reason;
  const proposal = freeze({
    class: classOf(candidate),
    target: laneInfo.target,
    lane: laneInfo.lane,
    laneBasis: laneInfo,
    evidence: candidate?.evidence ?? null,
    patch: built.patch,
    applier: resolved.applier,
    reason,
    finding: built.patch == null,
  });
  return freeze({ proposal, finding: null });
}

export function emitProposals(candidates = [], context = {}) {
  const proposals = [];
  const findings = [];
  for (const candidate of candidates) {
    const result = emitProposal(candidate, context);
    if (result.proposal != null) proposals.push(result.proposal);
    if (result.finding != null) findings.push(result.finding);
  }
  return freeze({ proposals: freeze(proposals), findings: freeze(findings) });
}
