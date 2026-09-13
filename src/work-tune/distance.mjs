// Milestone 62 / story 03 — the measured distance from a proposal to a commit.
//
// This leaf is pure. It reads the acceptor report and corpus records handed to it;
// it neither walks the source tree nor keeps a second copy of the acceptor's ruling
// vocabulary or removal text.
import { NOT_ADMISSIBLE } from "../work-acceptor/admissibility.mjs";
import { COUNTER_STATUS, roundsToAccept } from "../work/counters.mjs";

export const DISTANCE_STATES = Object.freeze({
  MEASURED: "measured",
  PARTIAL: "partial",
  UNKNOWN: "unknown",
});

export const DISTANCE_LIMBS = Object.freeze({
  DECISION_SITE_CONSUMER: "decision-site-consumer",
  RUN_ATTRIBUTION: "run-attribution",
});

export const RUN_ATTRIBUTION_ABSENT_REASON = "run-attribution-absent";

const freeze = (value) => Object.freeze(value);
const own = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key);
const list = (values) => freeze(values.map((value) => (
  value != null && typeof value === "object" ? freeze({ ...value }) : value
)));

function reportRows(report) {
  return Array.isArray(report?.proposals) ? report.proposals : [];
}

function proposalKey(proposal) {
  return proposal?.target?.key
    ?? (proposal?.target?.kind === "config" ? proposal.target.id : null)
    ?? proposal?.key
    ?? null;
}

function rowFor(proposal, report) {
  const key = proposalKey(proposal);
  return key == null ? null : reportRows(report).find((row) => row?.key === key) ?? null;
}

function consumerGroundReading(row) {
  // The assessment is the measurement's canonical source. Rendered refusals may
  // be suppressed when construction itself failed, but the assessment still ran.
  const assessment = row?.admissibility;
  if (assessment?.considered === true && Array.isArray(assessment.refusals)) {
    return {
      asked: true,
      key: row?.key ?? null,
      grounds: assessment.refusals.filter((ground) => ground?.code === NOT_ADMISSIBLE),
    };
  }
  return { asked: false, key: row?.key ?? null, grounds: [] };
}

function unresolvedSubject(ground, fallbackKey = null) {
  return freeze({
    key: ground?.key ?? fallbackKey,
    declaringHome: ground?.declaringHome ?? null,
    records: list(Array.isArray(ground?.records) ? ground.records : []),
    sites: list(Array.isArray(ground?.sites) ? ground.sites : []),
    inspections: list(Array.isArray(ground?.inspections) ? ground.inspections : []),
    consumers: list(Array.isArray(ground?.consumers) ? ground.consumers : []),
  });
}

function consumerMeasurement(readings) {
  const asked = readings.filter((reading) => reading.asked);
  const subjects = asked.flatMap((reading) => reading.grounds.map((ground) => (
    unresolvedSubject(ground, reading.key)
  )));
  return freeze({
    subject: "knobs-the-acceptor-reported",
    examined: asked.length,
    consumed: asked.filter((reading) => reading.grounds.length === 0).length,
    remaining: subjects.length,
    subjects: list(subjects),
  });
}

function allConsumerGrounds(report) {
  const readings = reportRows(report).map(consumerGroundReading);
  return {
    asked: readings.length > 0 && readings.every((reading) => reading.asked),
    readings,
  };
}

function consumedRuns(items) {
  return (Array.isArray(items) ? items : []).flatMap((item) => (
    Array.isArray(item?.runs) ? item.runs : []
  ));
}

export function runAttributionReading(items = [], options = {}) {
  const malformed = !Array.isArray(items)
    || items.some((item) => item == null
      || typeof item !== "object"
      || (own(item, "runs") && !Array.isArray(item.runs)));
  if (malformed) {
    return freeze({
      counter: freeze({
        kind: "rounds",
        status: COUNTER_STATUS.UNMEASURABLE,
        value: null,
        reason: "run-record-corpus-malformed",
      }),
      examined: null,
      attributed: null,
      missing: list([]),
    });
  }
  const runs = consumedRuns(items);
  const attributed = runs.filter((run) => (
    typeof run?.sessionId === "string" && run.sessionId.length > 0
  ));
  let counter;
  try {
    counter = options.roundsReading ?? (options.counter ?? roundsToAccept)(items);
  } catch (error) {
    counter = freeze({
      kind: "rounds",
      status: COUNTER_STATUS.UNMEASURABLE,
      value: null,
      reason: "rounds-counter-unreadable",
      message: error?.message ?? String(error),
    });
  }
  return freeze({
    counter,
    examined: runs.length,
    attributed: attributed.length,
    missing: list(Array.isArray(counter?.missing) ? counter.missing : []),
  });
}

function attributionPart(items, options) {
  const reading = runAttributionReading(items, options);
  if (reading.counter?.status === COUNTER_STATUS.MEASURED
      && typeof reading.counter.value === "number"
      && Number.isFinite(reading.counter.value)) {
    return { entry: null, unknown: null, reading };
  }
  if (reading.counter?.reason === RUN_ATTRIBUTION_ABSENT_REASON) {
    return {
      entry: freeze({
        kind: "limb",
        code: DISTANCE_LIMBS.RUN_ATTRIBUTION,
        source: "rounds-to-accept",
        reading,
        removal: "populate the run-record session join used by the rounds counter",
        owner: "outside-this-milestone",
      }),
      unknown: null,
      reading,
    };
  }
  return {
    entry: null,
    unknown: freeze({
      part: DISTANCE_LIMBS.RUN_ATTRIBUTION,
      input: "run-record corpus",
      reason: reading.counter?.reason ?? "rounds-counter-unreadable",
      reading,
    }),
    reading,
  };
}

function acceptorRefusalEntries(row, unknown, consumerReading) {
  const entries = [];
  for (const refusal of Array.isArray(row?.refusals) ? row.refusals : []) {
    const grounds = refusal.code === NOT_ADMISSIBLE ? consumerReading.grounds : [];
    const measurement = grounds.length === 0 ? null : consumerMeasurement([consumerReading]);
    entries.push(freeze({
      kind: "refusal",
      code: refusal.code,
      source: "acceptor-report",
      removal: typeof refusal.removal === "string" && refusal.removal.length > 0
        ? refusal.removal
        : null,
      ...(measurement == null ? {} : { measurement }),
      ...(refusal.detail == null ? {} : { detail: refusal.detail }),
    }));
    if (refusal.code === NOT_ADMISSIBLE && grounds.length === 0 && !consumerReading.asked) {
      unknown.push(freeze({
        part: DISTANCE_LIMBS.DECISION_SITE_CONSUMER,
        input: "acceptor admissibility grounds",
        reason: "admissibility-grounds-absent",
      }));
    }
    if (typeof refusal.removal !== "string" || refusal.removal.length === 0) {
      unknown.push(freeze({
        part: "removal",
        input: `acceptor refusal ${String(refusal.code)}`,
        reason: "removal-absent-from-acceptor-report",
      }));
    }
  }
  return entries;
}

function proposalOwnedEntries(proposal) {
  const entries = [];
  const ground = proposal?.laneBasis?.ground;
  if (ground != null) {
    entries.push(freeze({
      kind: "lane",
      code: ground.code ?? "advisory-lane",
      source: "proposal-lane",
      permanent: ground.permanent === true,
      removal: ground.permanent === true ? null : "declare the target on the tuning edge",
      detail: ground,
    }));
  }
  if (proposal?.reason != null) {
    entries.push(freeze({
      kind: "uncomputable-change",
      code: proposal.reason.code ?? "change-uncomputable",
      source: "proposal",
      removal: null,
      detail: proposal.reason,
    }));
  }
  return entries;
}

function constructionEntries(row) {
  return (Array.isArray(row?.constructionRefusals) ? row.constructionRefusals : []).map((refusal) => freeze({
    kind: "construction-refusal",
    code: refusal?.code ?? "construction-refused",
    source: "acceptor-report",
    removal: null,
    detail: refusal,
  }));
}

function stateOf(entries, unknown) {
  if (unknown.length === 0) return DISTANCE_STATES.MEASURED;
  return entries.length === 0 ? DISTANCE_STATES.UNKNOWN : DISTANCE_STATES.PARTIAL;
}

function standaloneConsumerEntry(reading) {
  if (!reading.asked) return null;
  const measurement = consumerMeasurement(reading.readings ?? [reading]);
  if (measurement.remaining === 0) return null;
  return freeze({
    kind: "limb",
    code: DISTANCE_LIMBS.DECISION_SITE_CONSUMER,
    source: "acceptor-report",
    measurement,
    removal: "give an admitted knob a resolved value that reaches a decision",
    owner: "outside-this-milestone",
  });
}

/** Compute one proposal's complete distance using the one acceptor report for the run. */
export function distanceToLive(proposal, context = {}) {
  const entries = proposalOwnedEntries(proposal);
  const unknown = [];
  const rows = reportRows(context.acceptorReport);
  const row = context.acceptorRow ?? rowFor(proposal, context.acceptorReport);

  if (row != null) {
    const consumerReading = consumerGroundReading(row);
    const refusals = acceptorRefusalEntries(row, unknown, consumerReading);
    entries.push(...refusals, ...constructionEntries(row));
    const renderedConsumerRefusal = refusals.some((refusal) => refusal.code === NOT_ADMISSIBLE);
    if (!renderedConsumerRefusal) {
      const standalone = standaloneConsumerEntry(consumerReading);
      if (standalone != null) entries.push(standalone);
      else if (!consumerReading.asked) {
        unknown.push(freeze({
          part: DISTANCE_LIMBS.DECISION_SITE_CONSUMER,
          input: "acceptor admissibility grounds",
          reason: "admissibility-grounds-absent",
        }));
      }
    }
  } else if (proposal?.laneBasis?.presence === "present") {
    unknown.push(freeze({
      part: "verdict",
      input: `acceptor report for ${proposalKey(proposal) ?? "proposal"}`,
      reason: "acceptor-verdict-not-obtained",
    }));
    unknown.push(freeze({
      part: DISTANCE_LIMBS.DECISION_SITE_CONSUMER,
      input: "acceptor admissibility grounds",
      reason: "acceptor-question-not-answered",
    }));
  }

  // Advisory proposals never have their own acceptor row. The one report obtained for
  // the run supplies the consumer measurement to them as a standalone limb.
  if (row == null && proposal?.laneBasis?.presence !== "present") {
    const reading = allConsumerGrounds(context.acceptorReport);
    const standalone = standaloneConsumerEntry(reading);
    if (standalone != null) entries.push(standalone);
    if (!reading.asked) {
      unknown.push(freeze({
        part: DISTANCE_LIMBS.DECISION_SITE_CONSUMER,
        input: "acceptor admissibility grounds",
        reason: rows.length === 0 ? "acceptor-question-not-asked" : "admissibility-grounds-absent",
      }));
    }
  }

  const attribution = attributionPart(context.roundsItems ?? context.items ?? [], context);
  if (attribution.entry != null) entries.push(attribution.entry);
  if (attribution.unknown != null) unknown.push(attribution.unknown);

  const state = stateOf(entries, unknown);
  return freeze({
    state,
    measured: state === DISTANCE_STATES.MEASURED,
    clear: entries.length === 0 && unknown.length === 0,
    count: unknown.length === 0 ? entries.length : null,
    measuredCount: entries.length,
    standing: list(entries),
    unknown: list(unknown),
    acceptor: row == null ? null : freeze({
      verdict: row.verdict ?? null,
      eligible: row.eligible === true,
      evidence: row.evidence ?? null,
      distance: row.distance ?? null,
    }),
  });
}

/** Attach a distance without filtering or reordering the emitted proposal set. */
export function attachProposalDistances(proposals = [], context = {}) {
  return list((Array.isArray(proposals) ? proposals : []).map((proposal) => freeze({
    ...proposal,
    distance: distanceToLive(proposal, context),
  })));
}
