// The loop engine receives facts gathered by commands and returns decisions; it
// never reads the stream, store, clock, or process environment itself.
//
// AND IT IMPORTS NOTHING (53/ADR, `work-loop-determinism`: "the module copied alone
// decides with every source dependency absent"). 69/06 first satisfied its own need for
// the progress authority with `import { decideBuildProgress, evaluateProgressPolicy }
// from "../loop-progress.mjs"`, which made this module unloadable in isolation and turned
// that contract red — VERIFICATION F-69-V11. The two deciders are now HANDED IN by the
// caller (`decideLoopProgress`), which keeps the ordering decision here, where 69/06's
// own consumer guard pins it, while the dependency stays where the commands layer already
// carries it.

const freezeRows = (rows) => Object.freeze(rows.map((row) => Object.freeze(row)));

export const LOOP_SCOPE_FORMS = freezeRows([
  { id: "driver", pattern: /^\d+$/ },
  { id: "range", pattern: /^\d+-\d+$/ },
]);

export const LOOP_LEVELS = Object.freeze(["L1", "L2", "L3"]);

export const LOCKED_LOOP_LEVELS = Object.freeze({});

export const L3_SCORE_THRESHOLD = 100;

export const LOOP_STOPS = Object.freeze([
  "uat-gate",
  "dependency-blocked",
  "cap-exhausted",
  "deadline-exhausted",
  "progress-exhausted",
  "no-progress",
  "grade-indeterminate",
  "session-needs-input",
  "run-not-retryable",
  "retry-parked",
  "unmapped-item-type",
  "operator-interrupt",
  // 129/01 (ADR-008 §5) — THREE LANE STOPS, APPENDED LAST as members 13-15, by the same
  // additive discipline that took this list from 53's eight to 69's eleven to 54's twelve.
  // A lane is a dispatch worktree the loop drives a wave member in (ADR-001 §5); each of these
  // names the one way a lane ends the range rather than the story: `work:dispatch` refuses
  // every member `at-capacity` with no lane of this loop in flight (ADR-006 §2), the merge home
  // is REFUSED by the one merge verb — a dirty primary, a moved base — (ADR-002 §1), or the
  // merge CONFLICTS and the lane is left intact for the operator (ADR-002 §3). The halt's
  // detail (lane, branch, base, tip, files) rides `reportLine`'s details, never a new act key.
  "lane-open-failed",
  "lane-merge-refused",
  "lane-merge-conflict",
]);

export const LOOP_REFUSALS = Object.freeze([
  "loop-scope-unsupported",
  "loop-level-locked",
  "loop-level-gate",
  "loop-level-unknown",
  "loop-bound-unresolved",
  // 102/00 — APPENDED LAST, by the same additive discipline that took this list from
  // 53/02/01's four names to five when 55 added `loop-level-gate`. A declaration built
  // without a loop id is REFUSED rather than carried through, because a key with no
  // producer is exactly the defect F-78-A recorded: everything above it builds, goes
  // green, and reports on nothing. The refusal makes a later edit that drops the id a
  // red seam instead of a silent return to zero coverage.
  "loop-id-missing",
]);

// THE COST LADDER (54/ADR-007 §1; `53/ADR-005` §6 declared this order *"because 54 depends
// on it"*). Four gates, ordered by STRICTLY INCREASING COST, each able to answer alone:
//
//   | # | gate               | cost                                        |
//   |---|--------------------|---------------------------------------------|
//   | 1 | `work:validate`    | in-process, pure, no configuration          |
//   | 2 | `work:doctor`      | in-process, one snapshot of item + texts    |
//   | 3 | `work:grade --run` | one bounded child process, seconds-minutes  |
//   | 4 | `drive verify`     | a whole agent session — minutes and tokens  |
//
// EACH GATE SHORT-CIRCUITS THE ONES AFTER IT — a red `validate` never pays for the doctor, a
// red doctor never pays for the runner, a red runner never pays for a review turn. That is
// "deterministic before model" generalised from a boundary into a LADDER, and it is what
// makes the doctor rung worth landing before the runner is wired at all.
//
// This is a DECLARATION. The rungs are walked in `commands/loop.mjs`'s gate block, which is
// where the invocations live; the `work:grade` rung's own invocation is 54/03's and rebases
// onto this row rather than re-declaring it.
export const GATE_ORDER = freezeRows([
  { act: "drive", phase: "continue" },
  { act: "gate", command: "work:validate" },
  { act: "gate", command: "work:doctor" },
  { act: "gate", command: "work:grade" },
  { act: "drive", phase: "verify" },
]);

const own = (value, key) => value !== null
  && typeof value === "object"
  && Object.prototype.hasOwnProperty.call(value, key);

const refusal = (code, detail) => ({ code, ...detail });

const halt = (stop, producer, detail = {}) => ({
  act: "halt",
  stop,
  producer,
  ...copyPlain(detail),
});

const drive = (ref, phase, cycle, detail = {}) => ({
  act: "drive",
  ref: copyPlain(ref),
  phase: copyPlain(phase),
  cycle: copyPlain(cycle),
  ...copyPlain(detail),
});

const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const nonNegativeInteger = (value) => Number.isSafeInteger(value) && value >= 0;

// A MEMBER IS A REF, HOWEVER IT ARRIVED. `work:next` answers its `wave` / `heldSet` as member
// objects (`{ ref, type, … }`); the shell's own memories (`live`, `setAside`, `unrefined`) are
// refs. Both spellings are read to the ref, and a member that is neither is dropped rather than
// answered as `null` — the SHAPE of the list is the caller's contract, the members are data.
// Shared by `decideWave` and `refineFirstDecision` (129/01), which is why they live with the
// other shared predicates rather than under either decision's banner.
const memberRef = (member) => {
  if (typeof member === "string") return member;
  if (member !== null && typeof member === "object" && typeof member.ref === "string") return member.ref;
  return null;
};

const memberRefs = (members) => (Array.isArray(members) ? members : [])
  .map(memberRef)
  .filter((ref) => ref !== null);

// A memory the shell hands in may be an array OR a `Set` — `src/commands/loop.mjs` keeps its
// set-aside as `new Set()` — so both are read; a string is iterable too and is NOT a memory, so
// it is refused with everything else that is present but unrecognised. `undefined` is an absent
// memory, which is an empty one; the answer for anything else is `null`, and the caller stops.
const memoryRefs = (memory) => {
  if (memory === undefined) return [];
  if (Array.isArray(memory)) return memberRefs(memory);
  if (memory instanceof Set) return memberRefs([...memory]);
  return null;
};

export const REVIEW_BLOCKER_CLASSES = Object.freeze([
  "production-defect",
  "guard-protects-nothing",
  "locked-contract-violation",
]);

const REVIEW_FINDING_CLASSES = Object.freeze({
  "a production defect": REVIEW_BLOCKER_CLASSES[0],
  "a guard that protects nothing": REVIEW_BLOCKER_CLASSES[1],
  "a violation of the locked contract": REVIEW_BLOCKER_CLASSES[2],
});

function copyPlain(value) {
  if (Array.isArray(value)) return value.map(copyPlain);
  if (value !== null && typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort((left, right) => left < right ? -1 : left > right ? 1 : 0)) {
      result[key] = copyPlain(value[key]);
    }
    return result;
  }
  return value;
}

// A blocker claim is an explicit, closed external signal. The description is
// mandatory: a class token by itself has not named the blocker it claims.
export function reviewBlockerClaim(blockerClass, finding, detail = {}) {
  if (!REVIEW_BLOCKER_CLASSES.includes(blockerClass)) return null;
  if (typeof finding !== "string" || finding.trim() === "") return null;
  return {
    ...copyPlain(detail),
    class: blockerClass,
    finding,
  };
}

// Free-form reviewer opinion never becomes a blocker merely because it is
// non-empty. This adapter is for the locked feature matrix; production callers
// pass the structured claim emitted by their deterministic producer.
export function reviewBlockerFromFinding(finding) {
  if (typeof finding !== "string") return null;
  const blockerClass = REVIEW_FINDING_CLASSES[finding.trim().toLowerCase()];
  return blockerClass === undefined ? null : reviewBlockerClaim(blockerClass, finding);
}

export function reviewFindingDisposition(finding) {
  if (typeof finding !== "string" || finding.trim() === "") return null;
  const blocker = reviewBlockerFromFinding(finding);
  return blocker === null
    ? { finding, disposition: "work-item" }
    : { finding, disposition: "blocker", blocker };
}

// ── THE TRIAGE RULE (71/ADR-003, landed as code by ADR-009 §B) ───────────────
//
// `reviewFindingDisposition` above answers `disposition: "work-item"` for every non-Blocker finding
// and, until this milestone, NOTHING consumed that answer: the cap on rounds was enforced and the
// cost of capping was paid by whatever the operator happened to remember. This is the consumer.
//
// It lives HERE, beside the classifier whose dangling answer it finally reads, because triage is a
// REVIEW decision about *whether* to promote — not a promotion mechanic. Both exports are additive
// and nothing existing reads them.
//
// A four-question router stated only in prose is a claim no scenario can drive, which is why this is
// a pure function rather than a paragraph: same inputs, same routing, no filesystem, no context. It
// is five ordered questions since 118/00 added the cost test, by the same reasoning: the rule that
// decides whether a finding earns a driver is worth no less machinery than the four it joined.

// The closed set of routings. Anything not in it is not a routing this loop can take, and the
// ordered questions below can only ever answer with one of these.
//
// `fixed` (118/00) is APPENDED LAST, which is this repository's additive-supersession discipline:
// the original four keep their names, meanings and POSITIONS, so every reader written against the
// four still reads forward. It is the routing a remedy takes when it is cheaper than the driver that
// would carry it — the cost test ADR-003 did not have. 71/ADR-003 is NARROWED, never contradicted:
// the loop creates at most one type in exactly one place, and since 123 spends none of that.
//
// THE SET IS NOT NARROWED WITH THE DECIDER (123). `chore` stays a member, in its delivered position,
// though `routeFinding` can no longer reach it: the set says which routings EXIST, and the operator's
// own `work:promote-gap` still creates a chore by hand. Removing the member would break 118/00's
// delivered "in their prior order" for every reader written against the five, to record a fact the
// decider already states by never answering with it.
export const FINDING_ROUTINGS = Object.freeze(["amendment", "chore", "story", "recorded", "fixed"]);

// The item type the loop's promotion face creates, and — by 118/01 — the one type it may not be
// promoted FROM. Both readings are the same fact, so this module spells it once. Since 123 the
// decider never asks for a creation at all, and what survives here is the second reading: the type
// whose own review folds a checklist remedy into its `## Definition of Done` instead.
//
// IT IS NOT IMPORTED FROM `src/work-promote/promotion.mjs`, and that is a constraint rather than a
// preference: this module IMPORTS NOTHING (53/ADR `work-loop-determinism` — "the module copied alone
// decides with every source dependency absent"), and 69/06 already turned that contract red once by
// reaching for a sibling. The join to the promotion path's `PROMOTED_TYPE` is therefore asserted by
// FF-7103, which reads both and requires them equal — a control rather than an edge, so the two
// cannot drift and the determinism contract stays green.
export const LOOP_CREATED_ITEM_TYPE = "chore";

// The severities 83's reporting bar admits. The bar is the load-bearing bound on the promotion
// rate: only an Important finding can reach question 2, so the queue cannot grow faster than the
// Important-finding rate the bar already caps.
export const FINDING_SEVERITIES = Object.freeze(["blocker", "important", "nit"]);

// Why a finding was NOT put to the questions at all.
export const NOT_ROUTED_REASONS = Object.freeze({
  blockerChased: "blocker-chased",
  blockerOutstanding: "blocker-outstanding",
  notReproduced: "not-reproduced",
});

const severityOf = (finding) => {
  const raw = String(finding?.severity ?? "").trim().toLowerCase();
  return FINDING_SEVERITIES.includes(raw) ? raw : "important";
};

// The dedup key: one finding raised by two lenses is one finding. Normalized so that case and
// spacing do not make two reports of one defect look like two defects — the SAME normalization the
// promoter's idempotence key uses, so a finding routed once is also promoted once.
export function findingKey(finding) {
  const title = String(finding?.title ?? "").trim().toLowerCase().replace(/\s+/gu, " ");
  const location = String(finding?.location ?? "").trim().toLowerCase();
  return `${title}@${location}`;
}

// ADR-003's ordered questions — four as accepted, five since 118/00 — asked in order, first answer
// wins. Returns
//   { title, severity, routed: false, reason }                       — never reached the questions
//   { title, severity, routed: true, routing, vehicle, creates, owner } — the routing it took
// where `creates` is the item type this routing asks the loop to create — since 123, ALWAYS null,
// for every input — and `owner` is who carries it from here. The field is kept rather than dropped
// because it is what the close's `creates` subset is computed from, and a subset that is empty by
// construction is a claim a control can drive; an absent field is not.
//
// It allocates NO finding id and emits no `@finding-<id>` tag: `66/ADR-006` gives allocation to the
// register's single writer, and at review-close time the only findings register — the milestone's
// `VERIFICATION.md` — does not yet exist. `routed-to` closes the trace from the other end at
// `aof:verify`.
//
// THE SECOND ARGUMENT IS THE PASS, NOT THE FINDING (118/01). `reviewedType` is the type of the item
// under review, and it is context rather than a field on the finding precisely because it is the
// SAME for every finding of one close — putting it on the finding would make every caller carry a
// value that never varies within a pass. It defaults to absent, and with it absent this decider
// behaves exactly as it did, so no existing caller changes and no existing row moves.
export function routeFinding(finding, { reviewedType } = {}) {
  if (finding == null || typeof finding !== "object") return null;
  const title = typeof finding.title === "string" ? finding.title.trim() : "";
  if (title === "") return null;
  const severity = severityOf(finding);

  // ── eligibility: which findings reach the questions at all ──
  // A claim that did not reproduce was discarded before the close and is not a finding any more.
  if (finding.reproduced === false) {
    return { title, severity, routed: false, reason: NOT_ROUTED_REASONS.notReproduced };
  }
  // A Blocker is never routed here: it was either chased inside a round, or it is named in the
  // bounded stop the cap already reports. Either way the loop did not decline to chase it.
  if (severity === "blocker") {
    return {
      title,
      severity,
      routed: false,
      reason: finding.outstanding === true ? NOT_ROUTED_REASONS.blockerOutstanding : NOT_ROUTED_REASONS.blockerChased,
    };
  }

  const routed = (routing, vehicle, creates, owner) => ({ title, severity, routed: true, routing, vehicle, creates, owner });

  // Q1 — does it require a change to a LOCKED CONTRACT? An amendment is ratified in the beat that
  // raised it and CREATES NO ITEM. The delivered `.feature` itself is never touched: the new rule
  // lands in the ACCEPTING item's own contract, or as a superseding ADR.
  const contract = String(finding.lockedContract ?? "").trim().toLowerCase();
  if (contract === "feature") return routed("amendment", "accepting-item-contract", null, "loop");
  if (contract === "adr") return routed("amendment", "superseding-adr", null, "loop");

  // A Nit is RECORDED and is never promoted (ADR-003: "Nits are recorded (question 4) and are never
  // promoted"). It skips to question 4 rather than being tested against question 2 — the reporting
  // bar's whole purpose is that the promotion population is the Important one.
  if (severity === "nit") return routed("recorded", "state-feedback", null, "loop");

  // Q2 — THE COST TEST (118/00). Is the remedy CHEAPER than the driver that would carry it? Then it
  // is fixed at the close that found it and creates nothing.
  //
  // ADR-003 routes by SHAPE and never by COST: "discharged by a checklist against existing code" is
  // equally true of a forty-line arch test and a three-day migration, so the cheapest remedies drew
  // the heaviest ceremony — a top-level folder and its record doc, a Definition of Done to author, a
  // validate gate the stream must keep green, and a whole `aof:verify` session to close it. Measured
  // on this repository 2026-09-05: of top-level items 88–117, twenty-three chores carry a
  // `Promotion key`, and chore 101's entire remedy was one line in `.gitattributes`.
  //
  // ITS BAR ROSE AT 123, without a line of it changing. The only driver left below is a story the
  // operator must refine — strictly more ceremony than the chore this question used to weigh against
  // — so more remedies answer here and are fixed in the beat that found them. That is the operator's
  // rule read literally: fix it inline if it is small, otherwise log it as a story.
  //
  // It is asked BEFORE the checklist question, which is the whole point: a remedy that is both cheap
  // and checklist-shaped is fixed, not scheduled. It is asked AFTER the locked-contract question and
  // AFTER the Nit skip, so a locked-contract change is never merely cheap and a Nit is never widened
  // into an action it could not trigger before.
  //
  // TERMINATION IS BY CONSTRUCTION, so no numeric bound is owed and nothing is added to
  // `src/loop-bounds.mjs`: every surviving finding is routed exactly once, so N findings admit at
  // most N fixes, and `<review_rounds>` already sanctions applying a confirmed fix without granting
  // a round for it.
  if (finding.cheaperThanDriver === true) return routed("fixed", "fixed-at-close", null, "loop");

  // Q3 — is it discharged by a CHECKLIST against existing code, with no new acceptance criteria?
  //
  // THE LOOP CREATES NOTHING HERE, since 123. This question routed to a top-level chore, and it was
  // the last door through which a review pass could deposit a driver in the stream as a side effect
  // of being thorough. The operator's rule is: fix tech debt inline if it is small (a chore),
  // otherwise log it as a story. Question 2 is already the small half — a remedy cheaper than the
  // driver that would carry it is fixed at the close. A checklist-shaped remedy that is NOT cheap is
  // therefore neither small enough to fix nor the loop's to schedule, so it takes the `story`
  // routing and its owner is the operator, exactly as question 4's population does.
  //
  // WHY 118/01's DEPTH BOUND WAS NOT ENOUGH. Measured 2026-09-06, milestone 119's review closes
  // minted chores 120, 121 and 122. The bound answered CORRECTLY for all three — the item under
  // review was a milestone or a story, not a chore — and the chore was created anyway. The reviewed
  // item's type was never the problem; the creation authority was.
  //
  // THE COST BAR RISES AS A CONSEQUENCE, and that is intended. The only driver left for question 2
  // to weigh a remedy against is a story, which costs strictly more ceremony than the chore it
  // weighed against before, so more remedies answer question 2 and are fixed in the beat that found
  // them. The rule moves work from "scheduled" to "done", never from "scheduled" to "dropped".
  //
  // THE FOLD-IN SURVIVES UNCHANGED (118/01). Reviewing a chore, the remedy lands in THAT chore's own
  // `## Definition of Done` — the `amendment` routing with its own vehicle, not a sixth routing:
  // what the remedy does is land in the contract of the item under review, creating nothing, which
  // is what `amendment` already means. It is kept as its own branch rather than collapsed into the
  // `story` answer below because an open chore's checklist is a cheaper destination than a story the
  // operator must refine, and 118/01's delivered criterion names it.
  //
  // `FINDING_ROUTINGS` IS NOT NARROWED WITH IT. The export keeps all five members in their delivered
  // order, `chore` included: what changes is which routings this decider can REACH, not which
  // routings exist. `work:promote-gap` still creates a chore for an operator who types it, so the
  // name still names something real.
  if (finding.checklistDischargeable === true) {
    return reviewedType === LOOP_CREATED_ITEM_TYPE
      ? routed("amendment", "reviewed-chore-definition-of-done", null, "loop")
      : routed("story", "operator-refines", null, "operator");
  }

  // Q4 — does it need NEW ACCEPTANCE CRITERIA a `.feature` must state? The loop creates nothing and
  // stops: authoring criteria is a refine act, and a story born without criteria is exactly the
  // unbounded backlog this rule exists to prevent. This is where the machine stops and the human
  // starts, deliberately.
  if (finding.needsNewCriteria === true) return routed("story", "operator-refines", null, "operator");

  // Q5 — otherwise it stays a recorded finding on the path the review close already uses, and is
  // landed in `VERIFICATION.md`'s register with its allocated id by the PO at `aof:verify`.
  return routed("recorded", "state-feedback", null, "loop");
}

// The close's whole answer: every surviving finding routed EXACTLY ONCE, after deduplication.
// Routing happens at the close of the review pass and never inside a round.
//
// Returns `{ routed, creates, nothingToRoute }` where `creates` is the subset the loop may act on —
// which, since 123, is EMPTY by construction: every routing creates nothing, so a close deposits no
// driver in the stream. Chore-shaped work that is not cheap enough to fix at the close leaves as a
// `story` the operator refines.
//
// `context` is the PASS's context — today `{ reviewedType }` — handed straight through to every
// finding, because it is the same for all of them (118/01). Absent, the close routes exactly as it
// did before that task.
export function routeFindings(findings, context = {}) {
  const seen = new Set();
  const routedAll = [];
  for (const finding of Array.isArray(findings) ? findings : []) {
    const decision = routeFinding(finding, context);
    if (decision === null) continue;
    const key = findingKey(finding);
    if (seen.has(key)) continue;
    seen.add(key);
    routedAll.push(decision);
  }
  const surviving = routedAll.filter((decision) => decision.routed);
  return {
    routed: routedAll,
    creates: surviving.filter((decision) => decision.creates !== null),
    nothingToRoute: surviving.length === 0,
  };
}

// ── THE EXECUTION MODE (71/ADR-006, landed as code by ADR-009 §B) ────────────
//
// `work.agents.mode` is STATIC, while the milestone walk has already computed the write-disjoint
// `wave` before it spawns anything. A wave of one is knowably solo, and a fan-out over it pays a
// full cold start for no concurrency at all — so `(configured mode × --solo × wave size) → mode` is
// a decidable function, and a prose-only version is a claim no scenario can drive.
//
// It lives beside `routeFinding` for the same reason that one does: both are REVIEW/ORCHESTRATION
// decisions over facts a command gathered, and this module decides without reading the stream,
// store, clock or environment. The export is additive; nothing existing reads it.
//
// The asymmetry is the whole point and is load-bearing: the derivation only ever REMOVES a fan-out
// that could not have paid for itself. It never ADDS one against a solo setting.
export const EXECUTION_MODES = Object.freeze(["inline", "orchestrated"]);

export const EXECUTION_MODE_REASONS = Object.freeze({
  waveEmpty: "wave-empty",
  soloFlag: "solo-flag",
  soloConfigured: "solo-configured",
  waveOfOne: "wave-of-one",
  waveParallel: "wave-parallel",
});

// The wave is read, never recomputed: an array of members (what `work next --json` answers) or the
// count itself. Anything else is not a wave, and answering `0` for it would report "empty wave" —
// the one answer that must never be inferred from a malformed input, because it reads as a finished
// milestone. So a malformed wave is `null`, and the caller stops and looks.
const waveMemberCount = (wave) => {
  if (Array.isArray(wave)) return wave.length;
  if (Number.isSafeInteger(wave) && wave >= 0) return wave;
  return null;
};

export function decideExecutionMode(input = {}) {
  if (input === null || typeof input !== "object") return null;
  const members = waveMemberCount(input.wave);
  if (members === null) return null;

  const configured = String(input.configuredMode ?? "").trim().toLowerCase();
  const decide = (mode, reason) => Object.freeze({
    mode,
    reason,
    members,
    // Inline is defined by what it does NOT do: no worktree, no agent, no dispatch record.
    dispatches: mode === "orchestrated",
    spawns: mode === "orchestrated",
    emptyWave: members === 0,
  });

  // An empty wave runs nothing at all — and is NOT a finished milestone. The caller reports the
  // held members as held; `emptyWave` is what tells it to.
  if (members === 0) return decide("inline", EXECUTION_MODE_REASONS.waveEmpty);
  // Solo wins over the wave in BOTH directions, which is why it is asked before the size.
  if (input.solo === true) return decide("inline", EXECUTION_MODE_REASONS.soloFlag);
  if (configured === "solo") return decide("inline", EXECUTION_MODE_REASONS.soloConfigured);
  // A wave of one is knowably solo whatever the static default says — including no default at all.
  if (members === 1) return decide("inline", EXECUTION_MODE_REASONS.waveOfOne);
  return decide("orchestrated", EXECUTION_MODE_REASONS.waveParallel);
}

// ── THE WAVE DECISION (129/ADR-006 §3) ───────────────────────────────────────
//
// Which members of a `work:next` answer the loop ASKS `work:dispatch` to admit. `wave` and
// `heldSet` are READ off the answer — 71/ADR-006's rule, the one `decideExecutionMode` above
// already keeps: the engine receives the partition, it never recomputes it. `live` is the refs
// whose lanes this loop already has in flight; `setAside` is the walk's own memory of units
// handed back to their plan (124/ADR-005 §5), and a set-aside unit is still `ready` on every
// re-ask, which is why it has to be subtracted here rather than expected to disappear.
//
//   dispatch = the wave, in the wave's own order, minus live minus setAside
//   hold     = the heldSet's refs minus live
//
// A lane already in flight is LIVE, not held — a through-review answer can still list it under
// `heldSet` when its lane has not merged home yet, and reporting it as held would tell the
// operator to wait on something this loop is itself running. NO BOUND IS AN INPUT: admission is
// dispatch's own (`work:dispatch` reserves under its lock and answers `admitted`/`refused` per
// member), so the engine holds no number and reads no configuration — FF-12901 leg 2 is the
// reason this signature has four keys and not five.
//
// A malformed `wave` or `heldSet` — PRESENT but not an array — is `null`, and the caller stops
// and looks, exactly as `decideExecutionMode` answers a malformed wave: an empty dispatch is the
// one answer that must never be inferred from a shape nobody recognised, because it reads as
// "nothing left to build". An ABSENT `heldSet` is an empty one (a `work:next` answer that holds
// nothing back omits nothing, but a caller may reasonably not pass the key); an absent `wave` is
// not a wave. `live` and `setAside` are the shell's MEMORIES, read as an array or a `Set`
// (`memoryRefs` above); absent is empty, and any other present shape is `null` too.
export function decideWave(input = {}) {
  if (input === null || typeof input !== "object") return null;
  if (!Array.isArray(input.wave)) return null;
  if (input.heldSet !== undefined && !Array.isArray(input.heldSet)) return null;
  const liveRefs = memoryRefs(input.live);
  const setAsideRefs = memoryRefs(input.setAside);
  // A malformed memory is refused the same way a malformed partition is — and for the WORSE
  // reason: a `live` nobody recognised read as empty would re-dispatch every lane already in
  // flight, and a `setAside` read as empty would re-offer every unit handed to its plan on every
  // tick — the "infinite loop dressed as progress" 124/ADR-005 §5 names. A full dispatch inferred
  // from an unrecognised shape spawns; an empty one merely stalls.
  if (liveRefs === null || setAsideRefs === null) return null;
  const live = new Set(liveRefs);
  const setAside = new Set(setAsideRefs);
  const dispatch = memberRefs(input.wave).filter((ref) => !live.has(ref) && !setAside.has(ref));
  const hold = memberRefs(input.heldSet).filter((ref) => !live.has(ref));
  return Object.freeze({ dispatch: Object.freeze(dispatch), hold: Object.freeze(hold) });
}

export function isReviewBlockerClaim(blocker) {
  return blocker !== null
    && typeof blocker === "object"
    && Object.prototype.hasOwnProperty.call(blocker, "class")
    && Object.prototype.hasOwnProperty.call(blocker, "finding")
    && reviewBlockerClaim(blocker.class, blocker.finding) !== null;
}

function reviewBlockerKey(blocker) {
  return `${blocker.class}\0${blocker.finding.trim().toLowerCase()}`;
}

export function reviewBlockerClaims(input = {}, findings = []) {
  const candidates = [
    ...(Array.isArray(input.blockerClaims) ? input.blockerClaims : []),
    ...(Object.prototype.hasOwnProperty.call(input, "blockerClaim") ? [input.blockerClaim] : []),
  ];
  for (const finding of findings) {
    if (Array.isArray(finding?.blockerClaims)) candidates.push(...finding.blockerClaims);
    if (Object.prototype.hasOwnProperty.call(finding ?? {}, "blockerClaim")) candidates.push(finding.blockerClaim);
  }
  const seen = new Set();
  const blockers = [];
  for (const candidate of candidates) {
    if (!isReviewBlockerClaim(candidate)) continue;
    const blocker = copyPlain(candidate);
    const key = reviewBlockerKey(blocker);
    if (seen.has(key)) continue;
    seen.add(key);
    blockers.push(blocker);
  }
  return blockers;
}

// The cap is supplied by loop-bounds.mjs's resolver. Keeping the declaration out
// of this pure decision leaf prevents a second copy of the default from forming.
export function decideReviewRound(input = {}) {
  const completedRounds = Number.isSafeInteger(input.completedRounds) && input.completedRounds >= 0
    ? input.completedRounds
    : 0;
  const cap = input.cap;
  if (!positiveInteger(cap)) return resolveLoopBound(cap, "reviewRounds", "work.loop.reviewRounds");

  const findingDisposition = reviewFindingDisposition(input.finding);
  const blocker = isReviewBlockerClaim(input.blocker)
    ? copyPlain(input.blocker)
    : null;
  const carriesBlockerSet = Array.isArray(input.blockers);
  const blockers = carriesBlockerSet
    ? input.blockers.filter(isReviewBlockerClaim).map(copyPlain)
    : blocker === null ? [] : [blocker];
  const blockerCount = blockers.length;
  const carriesHardCap = positiveInteger(input.hardCap);
  const hardCap = carriesHardCap ? input.hardCap : Number.MAX_SAFE_INTEGER;
  const previousBlockerCount = Number.isSafeInteger(input.previousBlockerCount) && input.previousBlockerCount >= 0
    ? input.previousBlockerCount
    : null;

  if (completedRounds >= hardCap) {
    return halt("cap-exhausted", "review:rounds>=hard-cap", {
      round: completedRounds,
      cap,
      ...(carriesHardCap ? { hardCap } : {}),
      ...(carriesBlockerSet ? { blockerCount } : {}),
      blockerClasses: [...REVIEW_BLOCKER_CLASSES],
      ...(findingDisposition !== null ? { findingDisposition } : {}),
      message: `Review hard cap ${hardCap} reached; no further round can be admitted.`,
    });
  }

  if (blockerCount > 0 && previousBlockerCount !== null && blockerCount >= previousBlockerCount) {
    return halt("no-progress", "review:blocker-count-not-decreasing", {
      round: completedRounds,
      cap,
      ...(carriesHardCap ? { hardCap } : {}),
      ...(carriesBlockerSet ? { blockerCount } : {}),
      previousBlockerCount,
      blockers,
      blockerClasses: [...REVIEW_BLOCKER_CLASSES],
      message: `Review Blocker count ${blockerCount} did not decrease from ${previousBlockerCount}; stopping.`,
    });
  }

  if (completedRounds < cap || blockerCount > 0) {
    return {
      admitted: true,
      act: "review",
      round: completedRounds + 1,
      cap,
      ...(carriesHardCap ? { hardCap } : {}),
      blocker: blockers[0] ?? null,
      ...(carriesBlockerSet ? { blockers, blockerCount } : {}),
    };
  }

  return halt("cap-exhausted", "review:rounds>=cap", {
    round: completedRounds,
    cap,
    ...(carriesHardCap ? { hardCap } : {}),
    ...(carriesBlockerSet ? { blockerCount } : {}),
    blockerClasses: [...REVIEW_BLOCKER_CLASSES],
    ...(findingDisposition !== null ? { findingDisposition } : {}),
    message: `Review cap ${cap} reached; another round requires a production defect, a guard that protects nothing, or a locked-contract violation.`,
  });
}

// Attempt-level stalls are considered before the build derivative. A reset is
// useful while one remains; once resets are exhausted the same evidence must be
// escalated rather than hidden by a failing-count decision from the same round.
export function decideLoopProgress(input = {}) {
  const samples = Array.isArray(input.samples) ? input.samples : [];
  if (samples.length === 0) return { act: "continue", measured: false };

  // Handed in, never imported (F-69-V11 — see this module's header). A caller with
  // samples to decide about is a caller that already holds `src/loop-progress.mjs`.
  const { evaluateProgressPolicy, decideBuildProgress } = input;

  const sampleDecision = evaluateProgressPolicy(samples, {
    maxStalls: input.maxStalls,
    maxResets: input.maxResets,
    resets: input.resets,
  });
  if (sampleDecision.action === "reset") {
    return {
      act: "reset",
      producer: "progress:samples",
      resets: sampleDecision.resets,
      stalls: sampleDecision.stalls,
      summary: copyPlain(sampleDecision.summary),
    };
  }
  if (sampleDecision.action === "escalate") {
    return halt("progress-exhausted", "progress:resets>=bound", {
      resets: sampleDecision.resets,
      stalls: sampleDecision.stalls,
      resetBound: input.maxResets,
      summary: copyPlain(sampleDecision.summary),
      disposition: sampleDecision.disposition,
    });
  }

  const buildDecision = decideBuildProgress(
    samples.map((sample) => sample.failingScenarios),
    { maxStalls: input.maxStalls },
  );
  if (buildDecision.action === "done") {
    return {
      act: "done",
      producer: "work:grade:cases.failed=0",
      failingCount: 0,
      progressBoundConsulted: false,
    };
  }
  if (buildDecision.action === "halt") {
    return halt("no-progress", "progress:failing-count", {
      failingCount: buildDecision.failingCount,
      noProgressRounds: buildDecision.noProgressRounds,
      progressBound: input.maxStalls,
    });
  }
  return {
    act: "continue",
    producer: "progress:failing-count",
    failingCount: buildDecision.failingCount,
    noProgressRounds: buildDecision.noProgressRounds,
    stalls: sampleDecision.stalls,
    resets: sampleDecision.resets,
    measured: true,
  };
}

// The production review decision consumes the gate's real shape. A round is
// consumed only when a findings-bearing gate re-drives the maker; the initial
// continue/build phase is an engine cycle, not a review round.
export function decideReviewGate(input = {}) {
  const findings = Array.isArray(input.findings) ? copyPlain(input.findings) : [];
  const blockers = reviewBlockerClaims(input, findings);
  const decision = decideReviewRound({
    completedRounds: input.completedRounds,
    cap: input.cap,
    hardCap: input.hardCap,
    blockers,
    previousBlockerCount: input.previousBlockerCount,
  });
  if (decision.admitted === true) {
    return {
      ...decision,
      act: "drive",
      phase: "continue",
      findings,
    };
  }
  if (decision.act === "halt") {
    return {
      ...decision,
      findings,
      workItems: findings.map((finding) => ({ finding, disposition: "work-item" })),
    };
  }
  return decision;
}

function matchLoopScope(scope) {
  if (typeof scope !== "string") return null;
  if (LOOP_SCOPE_FORMS[0].pattern.test(scope)) return { form: "driver", only: BigInt(scope) };
  if (!LOOP_SCOPE_FORMS[1].pattern.test(scope)) return null;
  const [lo, hi] = scope.split("-");
  return { form: "range", lo: BigInt(lo), hi: BigInt(hi) };
}

function scopeReason(scope, matched = matchLoopScope(scope)) {
  if (typeof scope !== "string") return "scope must be a string; values are never coerced";
  if (matched?.form === "range" && matched.lo > matched.hi) {
    return "range admits no driver because lo is greater than hi";
  }
  return "scope matched neither admitted loop scope form";
}

export function decideLoopScope(scope) {
  const matched = matchLoopScope(scope);
  if (matched?.form === "driver" || (matched?.form === "range" && matched.lo <= matched.hi)) {
    return { admitted: true, form: matched.form, scope };
  }
  return refusal("loop-scope-unsupported", {
    scope: copyPlain(scope),
    admits: [
      { id: LOOP_SCOPE_FORMS[0].id, example: "53" },
      { id: LOOP_SCOPE_FORMS[1].id, example: "50-53" },
    ],
    reason: scopeReason(scope, matched),
    alternative: "aof work drive <phase> <ref>",
  });
}

export function loopScopeIncludes(scope, ref) {
  const matched = matchLoopScope(scope);
  if (matched === null || (matched.form === "range" && matched.lo > matched.hi) || typeof ref !== "string") return false;
  const driver = /^(\d+)(?:\/|$)/.exec(ref)?.[1];
  if (driver === undefined) return false;
  const number = BigInt(driver);
  if (matched.form === "driver") return number === matched.only;
  return number >= matched.lo && number <= matched.hi;
}

export function resolveLoopLevel(level) {
  if (level === null || level === undefined) return { admitted: true, level: "L2" };
  if (LOOP_LEVELS.includes(level)) return { admitted: true, level };
  if (typeof level === "string" && own(LOCKED_LOOP_LEVELS, level)) {
    return refusal("loop-level-locked", {
      level: copyPlain(level),
      unlockedBy: LOCKED_LOOP_LEVELS[level].unlockedBy,
      reason: LOCKED_LOOP_LEVELS[level].reason,
    });
  }
  return refusal("loop-level-unknown", {
    level: copyPlain(level),
    known: [...LOOP_LEVELS],
    locked: Object.keys(LOCKED_LOOP_LEVELS).map((id) => ({
      id,
      unlockedBy: LOCKED_LOOP_LEVELS[id].unlockedBy,
    })),
  });
}

function l3ScoreFailure(loopReady) {
  if (loopReady?.score === L3_SCORE_THRESHOLD && loopReady?.clears === "L3") return null;
  const checks = Array.isArray(loopReady?.checks) ? loopReady.checks : [];
  return {
    score: Number.isFinite(loopReady?.score) ? loopReady.score : null,
    threshold: L3_SCORE_THRESHOLD,
    clears: typeof loopReady?.clears === "string" ? loopReady.clears : "none",
    blocking: Array.isArray(loopReady?.blocking) ? copyPlain(loopReady.blocking) : [],
    notApplicable: checks.filter((row) => row?.state === "not-applicable").map((row) => row.id),
  };
}

function l3GroundednessFailure(groundedness) {
  const components = Array.isArray(groundedness?.components) ? groundedness.components : [];
  const failing = components.filter((row) => ["exogenous-only", "self-referential", "stale"].includes(row?.verdict));
  if (groundedness?.state === "reported" && groundedness?.present === true && failing.length === 0) return null;
  const authorities = Array.isArray(groundedness?.authorities) ? groundedness.authorities : [];
  return {
    state: typeof groundedness?.state === "string" ? groundedness.state : "unavailable",
    components: failing.map((row) => ({
      verdict: row.verdict,
      members: copyPlain(row.members ?? []),
      groundClasses: copyPlain(row.groundClasses ?? []),
      staleAuthorities: copyPlain(row.staleAuthorities ?? []),
    })),
    staleAuthorities: authorities
      .filter((row) => row?.resolved !== true)
      .map((row) => ({ anchor: copyPlain(row.anchor), pointer: copyPlain(row.pointer) })),
    error: copyPlain(groundedness?.error ?? null),
  };
}

export function resolveLoopLevelGate(level, gate = {}) {
  if (level !== "L3") return { admitted: true, level };
  const score = l3ScoreFailure(gate?.loopReady);
  const groundedness = l3GroundednessFailure(gate?.groundedness);
  if (score === null && groundedness === null) return { admitted: true, level };
  const failingHalves = [
    ...(score === null ? [] : ["score"]),
    ...(groundedness === null ? [] : ["groundedness"]),
  ];
  return refusal("loop-level-gate", {
    level,
    reason: `L3 requires both gate halves; failing: ${failingHalves.join(", ")}.`,
    failingHalves,
    score,
    groundedness,
  });
}

export function resolveLoopBound(value, field = "cap", resolution = "work.autonomous.maxAttempts") {
  if (positiveInteger(value)) return { admitted: true, [field]: value };
  return refusal("loop-bound-unresolved", {
    field,
    value: copyPlain(value),
    resolution,
  });
}

// THE RUN STATES THAT HAVE STOPPED — `src/run-store.mjs`'s own taxonomy ("done/failed/cancelled
// are TERMINAL", `:270`), spelled here rather than imported because this module imports NOTHING
// (`acd-loop-module-import-boundary`, and the property that makes every decider here drivable
// over literal fixtures). A closed vocabulary, not a behaviour: the behaviour that could drift —
// staleness — is handed IN instead (`isStale` below).
const SETTLED_RUN_STATES = Object.freeze(["done", "failed", "cancelled"]);

// THE ONE `retryOf` TRAVERSAL IN THE TREE (126/00 ADR-001, AMENDED). It lives in the engine
// rather than the shell because 126/02's declaration predicate is engine-resident too and cannot
// import a command module — and because two walks that agree until one is edited is not a design.
// Terminates exactly where the shell's `retryLineageStartedAt` terminated: on a `retryOf` naming
// a run no record carries, and on a cycle, visiting each record at most once.
export function retryLineage(input = {}) {
  const runs = Array.isArray(input.runs) ? input.runs : [];
  const byId = new Map(runs.map((run) => [run?.runId, run]));
  const visited = [];
  const seen = new Set();
  let current = input.record;
  while (current != null && !seen.has(current.runId)) {
    seen.add(current.runId);
    visited.push(current);
    if (current.retryOf == null) break;
    const prior = byId.get(current.retryOf);
    if (prior == null) break;
    current = prior;
  }
  return Object.freeze(visited.reverse());
}

// The instant an attempt was last OBSERVED ALIVE. `heartbeatAt` is stamped by consumption
// (69/ADR-003); a run that never beat falls back to its `updatedAt`, the same fallback the
// store's own staleness predicate makes (20/ADR-004).
const livenessMs = (record) => Date.parse(record?.heartbeatAt ?? record?.updatedAt);

// WHERE ONE ATTEMPT ENDED — the whole of ADR-001's amended rule, in one place, over four shapes.
// A RECLAIMED attempt ends at its last liveness and NEVER at the reclaim stamp, which a sweep
// writes hours later; that single line is what deletes the measured 11.49-hour bill. A SETTLED
// attempt ends at its close. A non-terminal attempt that is STALE is the same physical fact as a
// reclaimed one — a runtime that stopped reporting, differing only in whether anyone has written
// the verdict down yet — so it is charged identically; between the lid closing and the sweep the
// measured record was `running` for eleven hours, and a rule that ended it at `now` would have
// reproduced the bill under a state name instead of a stamp.
//
// THE VERDICT IS THE STORE'S, ASKED FOR RATHER THAN RESTATED. `isStale` arrives on the bag beside
// `stalenessMs`, the same way `decideLoopProgress` is handed `evaluateProgressPolicy`, so the
// definition presence and the run layer have shared since 23/ADR-002 has ONE home. The correction
// applies only when BOTH arrive — a positive-integer threshold AND a callable predicate — because
// the same arithmetic answers a second question: absent them, a non-terminal attempt is treated
// as ALIVE and ends at `now`, which is the render's "how long has this been going".
function attemptEndMs(record, nowMs, stalenessMs, isStale) {
  if (record?.reclaimedAt != null) return livenessMs(record);
  if (SETTLED_RUN_STATES.includes(record?.state)) return Date.parse(record?.updatedAt);
  const stale = positiveInteger(stalenessMs)
    && typeof isStale === "function"
    && Number.isFinite(nowMs)
    && isStale(record, nowMs, stalenessMs) === true;
  return stale ? livenessMs(record) : nowMs;
}

// ONE attempt's duration, or `null` when the record carries no readable `createdAt` or no
// readable end instant — a DECLARED absence, never `NaN` and never a 0 that reads as "it was
// instant". The summer below counts a `null` as 0; a renderer can say "unknown" instead.
export function attemptElapsedMs(input = {}) {
  const record = input.record;
  const createdAtMs = Date.parse(record?.createdAt);
  if (!Number.isFinite(createdAtMs)) return null;
  const endMs = attemptEndMs(record, Date.parse(input.now), input.stalenessMs, input.isStale);
  if (!Number.isFinite(endMs)) return null;
  return Math.max(0, endMs - createdAtMs);
}

// THE SUMMER — accumulated ATTEMPT milliseconds over a lineage, which is what `69/ADR-002` means
// by "total across all attempts" and what its ceiling was sized for. Order-blind, empty answers 0,
// and downtime is charged to nobody. No accumulator is persisted anywhere: every instant this
// reads is already on the records (53/ADR-004 applied to itself).
export function lineageElapsedMs(input = {}) {
  const runs = Array.isArray(input.runs) ? input.runs : [];
  let total = 0;
  for (const record of runs) {
    const ms = attemptElapsedMs({
      record,
      now: input.now,
      stalenessMs: input.stalenessMs,
      isStale: input.isStale,
    });
    total += Number.isFinite(ms) ? ms : 0;
  }
  return total;
}

// THE DECIDER TAKES MILLISECONDS, NOT TWO INSTANTS (ADR-001 §3). The instant arithmetic moved out
// to the summer above; the halt, its producer, its detail and both refusal codes are unchanged.
// The two-instant form is REFUSED rather than accepted on a branch — a decider that kept both
// shapes would let the wall-clock reading survive at whichever call site was not re-pointed.
export function decideScheduleToClose(input = {}) {
  const ceilingMs = input.ceilingMs;
  if (!positiveInteger(ceilingMs)) {
    return resolveLoopBound(ceilingMs, "scheduleToCloseMs", "work.loop.scheduleToCloseMs");
  }
  const elapsedMs = input.elapsedMs;
  if (!nonNegativeInteger(elapsedMs)) {
    return refusal("loop-bound-unresolved", {
      field: "scheduleToCloseMs",
      value: copyPlain(elapsedMs),
      resolution: "elapsedMs",
    });
  }
  if (elapsedMs < ceilingMs) return { admitted: true, ceilingMs, elapsedMs };
  return halt("deadline-exhausted", "loop:schedule-to-close>=ceiling", {
    deadline: "scheduleToClose",
    ceilingMs,
    elapsedMs,
    disposition: "preserved-for-triage",
  });
}

function taskFacts(tasksResult) {
  const tasks = Array.isArray(tasksResult?.tasks) ? tasksResult.tasks : [];
  return {
    hasTasks: tasks.length > 0,
    uat: tasks.reduce((sum, task) => {
      const count = task?.counts?.uat;
      return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0),
  };
}

function findingsOf(gate) {
  if (!gate) return null;
  if (Array.isArray(gate.findings)) return { count: gate.findings.length, value: gate.findings };
  if (Number.isSafeInteger(gate.findings) && gate.findings >= 0) {
    return { count: gate.findings, value: gate.findings };
  }
  if (Number.isSafeInteger(gate.count) && gate.count >= 0) {
    return { count: gate.count, value: gate.findings ?? gate.count };
  }
  return null;
}

function nextCycle(current) {
  return positiveInteger(current) ? current + 1 : 1;
}

function boundedDrive(ref, phase, currentCycle, cap, detail = {}) {
  if (positiveInteger(currentCycle) && currentCycle >= cap) {
    return halt("cap-exhausted", "engine:cycle>=cap", {
      ref,
      phase,
      cycle: currentCycle,
      cap,
    });
  }
  return drive(ref, phase, nextCycle(currentCycle), detail);
}


// ─────────────────────── milestone 124 / story 01 — cap exhaustion asks THIS module ──
//
// ADR-005 §2. `src/commands/loop.mjs` used to mint its own `cap-exhausted` halt at the
// cycle-cap branch — the ONE cap this repository actually enforces, sitting behind a counter
// the shell keeps privately and consulted AFTER the act has already been decided. It returned
// without ever re-asking the decider, so it never reached the refine branch sitting one
// function away in the module it had just called. The decision moves here; the shell keeps
// the execution.
//
// NOTHING HERE WAKES THE ENGINE'S OWN CAP. `boundedDrive`'s guard above is dead on the
// `nextDecision` path (124/ADR-006: no call site passes `cycle`), and this is deliberately a
// SEPARATE entry point carrying the SHELL's own `cycle` and `cap`. Half-wiring the other one
// — one live branch beside three dead — is worse than four plainly dead, so it is ledgered
// rather than repaired.

/**
 * THE PLAN A UNIT BELONGS TO, DERIVED FROM THE ITEM GRAPH AND NEVER FROM AN AUTHORED KEY
 * (ADR-005 §4, `62/ADR-003`'s discipline).
 *
 *   · a story's plan is its parent milestone;
 *   · a driver's plan is itself;
 *   · a parentless story IS a driver of the stream (`src/work.mjs:476`), so its plan is itself.
 *
 * `listItems` builds a story's `ref` as `` `${number}/${sNumber}` `` and its `parent` as
 * `number` from the SAME directory walk (`src/work.mjs:395-421`) — one fact with two
 * spellings — and a record doc's authored `parent:` frontmatter is consulted for NEITHER.
 * So the ref grammar answers all three shapes on its own, which is why the shell supplies no
 * `parent` and a story whose `STORY.md` says `parent: 77` while sitting under
 * `124_milestone_…` still hands off to `124`.
 *
 * A `parent` SUPPLIED BY A CALLER STILL WINS, because the decider is a pure function that must
 * be answerable about a plan its caller names — which is the only way ADR-005 §6's
 * out-of-scope guard is reachable at all (see `decideCycleCapExhaustion`).
 */
export function loopPlanRef(input = {}) {
  const parent = input?.parent;
  if (parent !== null && parent !== undefined && String(parent) !== "") return String(parent);
  const ref = input?.ref;
  if (typeof ref !== "string") return copyPlain(ref);
  return /^(\d+)\//u.exec(ref)?.[1] ?? ref;
}

/**
 * THE CYCLE-CAP DECISION, ANSWERED ONCE (ADR-005 §1-§6).
 *
 * Input is the facts the shell already holds: `{ ref, type, parent, phase, cycle, cap, scope,
 * planReEntries }`. The answer is either the EXISTING drive act aimed at the plan —
 * `drive(planRef, "refine", …)`, the same shape `decideLoopPhase` already returns at its two
 * refine branches, with no key those acts lack — or a terminal `cap-exhausted` halt.
 *
 * TWO WAYS TO STAY TERMINAL, and they are different facts:
 *
 *   · `engine:plan-out-of-scope` — the derived plan falls outside the loop's declared scope.
 *     `53/ADR-003` rules the scope a driver number or a range, and a hand-off that walked
 *     outside it would be the silent whole-stream walk that ADR refuses. The halt NAMES the
 *     plan it refused, because a halt that hides its reason sends the reader to the wrong file.
 *   · `engine:plan-re-entry>=cap` — the plan has already been re-entered `cap` times. This is
 *     ADR-005 §5's second bound, and it is the SHELL'S EXISTING COUNTER read under
 *     `${planRef}\0refine`: no new Map, no new bound, no new persisted key. It also closes the
 *     one case that closes itself — a milestone exhausting under phase `refine` derives ITSELF
 *     as its plan, so the key that just tripped IS the key consulted, and the re-entry is
 *     refused on its first attempt without a special case being written for it.
 *
 * The stop vocabulary does not grow: `cap-exhausted` keeps its name, and what changes is what
 * the decision carries (ADR-005 §1).
 */
export function decideCycleCapExhaustion(input = {}) {
  const plan = loopPlanRef(input);
  const detail = {
    ref: copyPlain(input?.ref),
    ...(input?.phase === undefined ? {} : { phase: copyPlain(input.phase) }),
    ...(input?.cycle === undefined ? {} : { cycle: copyPlain(input.cycle) }),
    cap: copyPlain(input?.cap),
    plan: copyPlain(plan),
  };
  if (!loopScopeIncludes(input?.scope, plan)) {
    return halt("cap-exhausted", "engine:plan-out-of-scope", detail);
  }
  const entries = positiveInteger(input?.planReEntries) ? input.planReEntries : 0;
  if (!positiveInteger(input?.cap) || entries >= input.cap) {
    return halt("cap-exhausted", "engine:plan-re-entry>=cap", detail);
  }
  return drive(plan, "refine", nextCycle(entries));
}

/**
 * THE WALK HAS NOTHING LEFT TO OFFER (ADR-005 §5).
 *
 * Set-aside is the walk's own memory, not a bound: `work:next` re-answers on every tick and a
 * still-`ready` unit is offered again forever, so a hand-off without set-aside is an infinite
 * loop dressed as progress. When every member of the ready set has been set aside there is no
 * act left to take, and the invocation is `halted` — never `done`, which would report a range
 * closed that nobody closed. The ref names a unit that exhausted, because that is the item the
 * operator has to go and look at.
 */
export function decideReadySetExhausted(input = {}) {
  return halt("cap-exhausted", "engine:ready-set-exhausted", {
    ref: copyPlain(input?.ref),
    cap: copyPlain(input?.cap),
  });
}

export function mapLoopStoreRefusal(answer) {
  const code = answer?.code ?? answer?.error?.code;
  if (code === "duplicate-run" || code === "no-retryable-run") return null;
  if (code === "attempts-exhausted") {
    return { stop: "cap-exhausted", producer: "run-store:attempts-exhausted" };
  }
  if (code === "retry-parked") {
    const readyAt = answer?.readyAt ?? answer?.detail?.readyAt ?? answer?.error?.detail?.readyAt;
    return {
      stop: "retry-parked",
      producer: "run-store:retry-parked",
      ...(readyAt === undefined ? {} : { readyAt: copyPlain(readyAt) }),
    };
  }
  if (code === "not-retryable") {
    return { stop: "run-not-retryable", producer: "run-store:not-retryable" };
  }
  return {
    stop: "run-not-retryable",
    producer: code === undefined ? "run-store:absent" : `run-store:${code}`,
  };
}

export function mapStoreRefusal(answer) {
  return mapLoopStoreRefusal(answer);
}

// ── THE CONCURRENCY MODE, AS THE ENGINE SEES IT (129/ADR-001 §3-§4, §7) ─────
//
// Two ADDITIVE inputs carry the mode into this decision and, through the `...input` spread,
// into `decideLoop`: `concurrency` — the RESOLVED mode (`src/loop-bounds.mjs` resolves it; the
// engine is handed the answer and never the config, so this is the one mode literal outside
// the bounds home) — and `unrefined` — the in-scope stories with no tasks and not `done`, in
// stream order, as refs. The SHELL gathers facts; the ENGINE decides the phase — ADR-001 §7's
// ruling on TECH_DEBT item 91.
//
// Under `refine_first` a non-empty `unrefined` decides `drive refine <unrefined[0]>` AHEAD of
// whatever the head offers — ahead of a `done` walk, a blocked or held head, a milestone, a
// UAT item, an unmapped type — because REFINE is the first of the three phases and every
// contract must be locked before any lane reads it (ADR-001 §3, §6). The head's own decision
// is reached only once nothing is left to refine. Anything that is not exactly
// `"refine_first"` ignores `unrefined` entirely, and a malformed `unrefined` (present but not
// an array) is an empty one: the default mode is byte-identical to today, which is what
// "`sequential` (unset) is today's loop" (ADR-001 §2) means when it is executable.
//
// The refine drive starts at cycle 1: `cycle` on this input is the HEAD's counter for the
// HEAD's phase, and the story being refined is a different unit in a different phase.
const REFINE_FIRST = "refine_first";

function refineFirstDecision(input) {
  if (input.concurrency !== REFINE_FIRST) return null;
  const unrefined = memberRefs(input.unrefined);
  if (unrefined.length === 0) return null;
  return drive(unrefined[0], "refine", 1);
}

export function decideLoopPhase(input = {}) {
  const { next } = input;
  const refineFirst = refineFirstDecision(input);
  if (refineFirst !== null) return refineFirst;
  if (next?.state === "done") return { act: "done" };
  if (next?.state === "blocked") {
    return halt("dependency-blocked", "work:next:state=blocked", {
      ...(own(next, "ref") ? { ref: next.ref } : {}),
      ...(own(next, "waitingOn") ? { waitingOn: copyPlain(next.waitingOn) } : {}),
    });
  }
  if (next?.state === "held") {
    return halt("dependency-blocked", "work:next:state=held", {
      ...(own(next, "ref") ? { ref: next.ref } : {}),
      ...(own(next, "skipped") ? { skipped: copyPlain(next.skipped) } : {}),
    });
  }

  const ref = next?.ref;
  const type = next?.type;
  if (type === "uat") {
    if (positiveInteger(input.cycle) && input.cycle >= input.cap) {
      return halt("cap-exhausted", "engine:cycle>=cap", {
        ref,
        phase: input.phase ?? input.lastPhase,
        cycle: input.cycle,
        cap: input.cap,
      });
    }
    return halt("uat-gate", "work:next:type=uat", {
      ref,
      alternative: `aof work drive verify ${ref}`,
    });
  }
  if (type === "milestone") {
    const phase = (input.stories?.total ?? 0) === 0 ? "refine" : "verify";
    return boundedDrive(ref, phase, input.cycle, input.cap);
  }
  if (type !== "story") {
    return halt("unmapped-item-type", `work:next:type=${String(type)}`, { ref, type });
  }

  const facts = taskFacts(input.tasks);
  if (!facts.hasTasks) return boundedDrive(ref, "refine", input.cycle, input.cap);

  const gate = findingsOf(input.gate);
  if (gate) {
    if (gate.count === 0) {
      return boundedDrive(ref, "verify", input.verifyCycle, input.cap);
    }
    if (!positiveInteger(input.cycle)) return resolveLoopBound(input.cycle, "cycle");
    if (input.cycle >= input.cap) {
      return halt("cap-exhausted", "engine:cycle>=cap", {
        ref,
        phase: "continue",
        cycle: input.cycle,
        cap: input.cap,
      });
    }
    return drive(ref, "continue", input.cycle + 1, { findings: copyPlain(gate.value) });
  }

  // THE ENGINE ROUTES ON STATUS (129/ADR-001 §4). 127 measured the defect: a RESTARTED cascade
  // re-drove `continue` on an `in-review` story, because this decision never read status and
  // `lastPhase` is in-process only — each restart paid a full session to rediscover the review
  // gate. The record says what the loop DID; the status says what the story IS, and a story
  // moved to `in-review` by hand has no record at all and still must not be re-built. So an
  // `in-review` story WITH tasks answers the gate whatever `lastPhase`, `cycle` or the UAT
  // count say — the same act a `continue` that just settled answers below, reached from the
  // fact rather than from the memory. `next.status` is already on every `work:next` answer,
  // so this is no new input; it is read VERBATIM (no trim, no case-fold), because a variant
  // spelling is not a status the lifecycle admits. A story with NO tasks still refines above,
  // and a supplied `gate` still routes on its findings above — this sits between them
  // deliberately. Mode-independent: `sequential` is changed by this routing alone.
  if (next?.status === "in-review") return { act: "gate", ref: copyPlain(ref), command: "work:validate" };

  if (input.lastPhase === "continue") return { act: "gate", ref: copyPlain(ref), command: "work:validate" };
  if (input.lastPhase === "verify") {
    if (positiveInteger(input.cycle) && input.cycle >= input.cap) {
      return halt("cap-exhausted", "engine:cycle>=cap", {
        ref,
        phase: "verify",
        cycle: input.cycle,
        cap: input.cap,
      });
    }
    if (facts.uat > 0) {
      return halt("uat-gate", "work:tasks:counts.uat", { ref, uat: facts.uat });
    }
    return boundedDrive(ref, "verify", input.cycle, input.cap);
  }
  return boundedDrive(ref, "continue", input.cycle, input.cap);
}

export function decideLoopOutcome(input = {}) {
  const ref = input.next?.ref ?? input.ref;
  const phase = input.phase ?? input.lastPhase;
  if (input.signal === "SIGINT" || input.signal === "SIGTERM") {
    return halt("operator-interrupt", `launcher:signal=${input.signal}`, {
      ...(ref === undefined ? {} : { ref }),
    });
  }
  if (input.session?.outcome === "needs-input") {
    return halt("session-needs-input", "session-driver:outcome=needs-input", {
      ref,
      phase,
      sessionId: input.session.sessionId,
      ...(own(input.session, "message") ? { message: copyPlain(input.session.message) } : {}),
    });
  }
  if (input.session?.outcome === "failed") {
    if (input.storeAnswer?.started === true || input.storeAnswer?.state === "started" || input.storeAnswer?.state === "running") {
      return drive(ref, phase, input.cycle, {
        ...(own(input.storeAnswer, "runId") ? { runId: input.storeAnswer.runId } : {}),
        ...(own(input.storeAnswer, "attempt") ? { attempt: input.storeAnswer.attempt } : {}),
      });
    }
    const mapped = mapLoopStoreRefusal(input.storeAnswer);
    if (mapped === null) return null;
    return halt(mapped.stop, mapped.producer, {
      ref,
      ...(own(input, "runId") ? { runId: input.runId } : {}),
      ...(own(mapped, "readyAt") ? { readyAt: mapped.readyAt } : {}),
    });
  }
  return decideLoopPhase({
    ...input,
    ...(input.session?.outcome === "done" && input.lastPhase === undefined && input.phase !== undefined
      ? { lastPhase: input.phase }
      : {}),
  });
}

export function decideLoopAction(input = {}) {
  return decideLoopOutcome(input);
}

export function decideLoopInvocation(input = {}) {
  const level = resolveLoopLevel(input.level);
  if (!level.admitted) return level;
  const scope = decideLoopScope(input.scope);
  if (!scope.admitted) return scope;
  const cap = resolveLoopBound(input.cap);
  if (!cap.admitted) return cap;
  if (own(input, "cycle") && input.cycle !== undefined && !positiveInteger(input.cycle)) {
    return resolveLoopBound(input.cycle, "cycle");
  }
  const levelGate = resolveLoopLevelGate(level.level, input.l3Gate);
  if (!levelGate.admitted) return levelGate;
  const act = decideLoopOutcome({ ...input, cap: cap.cap });
  return {
    admitted: true,
    scope: scope.scope,
    form: scope.form,
    level: level.level,
    cap: cap.cap,
    next: input.next == null ? null : copyPlain(input.next),
    act,
    stops: [...LOOP_STOPS],
  };
}

export function decideLoop(input = {}) {
  return decideLoopInvocation(input);
}

// 102/00 — THE LOOP ID IS CHECKED FOR SHAPE, NEVER FOR REGISTRY MEMBERSHIP. The engine
// imports nothing and reads nothing (the module-level contract at the head of this file), so
// "is this a loop somebody declared?" is a question it cannot ask and must not pretend to.
// It is the READER's question (`src/loop-record.mjs`, which answers it as `ran-undeclared`
// rather than an error) and a check over the shipped registry's, and never a run-time
// refusal — a consumer repository may legitimately have no `.aof/loops/` at all
// (`loadLoops` answers `present: false` by design), and refusing to run because a record was
// edited would turn a reporting gap into an outage.
function resolveLoopId(value) {
  if (typeof value === "string" && value.length > 0) return { admitted: true, id: value };
  return refusal("loop-id-missing", {
    field: "id",
    value: copyPlain(value),
    resolution: "the registry id of the loop this run belongs to, supplied by the caller",
  });
}

export function buildLoopDeclaration(input = {}) {
  const level = resolveLoopLevel(input.level);
  if (!level.admitted) return level;
  const scope = decideLoopScope(input.scope);
  if (!scope.admitted) return scope;
  const cap = resolveLoopBound(input.cap);
  if (!cap.admitted) return cap;
  const cycle = resolveLoopBound(input.cycle, "cycle");
  if (!cycle.admitted) return cycle;
  const levelGate = resolveLoopLevelGate(level.level, input.l3Gate);
  if (!levelGate.admitted) return levelGate;
  // LAST, so an earlier guard still decides first: an invocation that is missing the id AND
  // carries a refused scope, level or cap answers exactly as it did before this change. A new
  // guard that masked an existing one would be a behaviour change dressed as an addition.
  const id = resolveLoopId(input.id);
  if (!id.admitted) return id;
  return {
    loopRunId: copyPlain(input.loopRunId),
    scope: scope.scope,
    level: level.level,
    cap: cap.cap,
    phase: copyPlain(input.phase),
    cycle: cycle.cycle,
    startedAt: copyPlain(input.startedAt),
    // THE EIGHTH KEY, APPENDED LAST (102/00). 53's seven keep their names, meanings and
    // serialised positions — this repository's additive-supersession discipline, the same one
    // that grew the run record from nine keys to sixteen. It supersedes
    // `53/01/tasks/05_declaration-and-resume.feature`'s "no eighth key appears for any
    // input", deliberately and in the open: that feature is delivered and is therefore not
    // edited, and the new rule lives in this story's own contract.
    id: id.id,
    // THE NINTH KEY, APPENDED LAST, by the same additive-supersession discipline 102/00 used for
    // the eighth (126/02, ADR-004 §5). It supersedes 126/00 task-00's eight-key pin, deliberately
    // and in the open — an expected succession, not a regression. The OPT-IN FAILS CLOSED: only
    // the boolean `true` raises it, so the string `"true"`, the number `1` and `null` are all
    // absences. `SPEC §Out of scope` says why the default is off — auto-resume without an opt-in
    // means every login silently spends tokens re-entering whatever was open when the lid closed.
    supervised: input.supervised === true,
  };
}

function usableDeclaration(loop) {
  if (loop === null || typeof loop !== "object") return false;
  return ["loopRunId", "scope", "level", "cap", "startedAt"]
    .every((key) => own(loop, key) && loop[key] !== null && loop[key] !== undefined);
}

function compareRuns(left, right) {
  const leftTime = String(left.createdAt ?? "");
  const rightTime = String(right.createdAt ?? "");
  if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
  const a = String(left.runId ?? "");
  const b = String(right.runId ?? "");
  return a < b ? -1 : a > b ? 1 : 0;
}

function recoverableDeclaration(loop) {
  if (!usableDeclaration(loop)) return null;
  return {
    loopRunId: copyPlain(loop.loopRunId),
    scope: copyPlain(loop.scope),
    level: copyPlain(loop.level),
    cap: copyPlain(loop.cap),
    startedAt: copyPlain(loop.startedAt),
    // THE SIXTH PROJECTED KEY. A ninth key added to the envelope but not to this projection reads
    // back `false` forever — the defect this line exists to prevent, since nothing but
    // `recoverableDeclaration` survives `readLoopDeclaration`. The USABILITY requirement stays at
    // FIVE: widening it to six would make every declaration already on disk unusable, and none of
    // them carries this key. The projection fails closed for the same reason the mint does.
    supervised: loop.supervised === true,
  };
}

// WHICH DECLARATIONS SHOULD BE RUNNING ON THIS NODE NOW (126/02, ADR-004 §1-§4, §7).
//
// One pure decider, run records in and rows out. The Rust supervisor reconciles the answer against
// what is actually running and never learns what any of it means; a completed loop simply stops
// appearing, so nothing relaunches it. That is what lets reconciliation replace restart-on-exit
// with no completion semantics crossing into Rust.
//
// IT COMPOSES VERDICTS IT DOES NOT OWN. Died-versus-stopped-for-cause already has one home:
// `isRetryable` classifies the reason, `shouldRetry` bounds it by attempt, `retryReadiness`
// answers one of five states, and `isStale` is the ONE staleness predicate presence has shared
// with the run layer since 23/ADR-002. All of them arrive ON THE INPUT BAG rather than by import,
// exactly as `decideLoopProgress` is handed its two policies — because THIS MODULE IMPORTS
// NOTHING, which is what lets `work-loop-determinism` copy it alone into an empty directory and
// decide with every source dependency absent. Reading a fourth derivation of the store's
// classification here is the defect this shape exists to prevent.
//
// THE LISTING RULE, three branches and no fourth. A declaration is listed iff its latest run in
// scope is (a) running and FRESH — listed on its own liveness, whatever the clock says, because
// the clock gates a RELAUNCH and a run already in flight is halted by its own shell; (b) running
// and STALE — the died loop, a relaunch, and therefore subject to the clock; or (c) resumable by
// the store's own readiness, and subject to the clock.
//
// THE CLOCK LEG IS THE ONE PLACE THIS DECIDES RATHER THAN READS, and it is not optional. Nothing
// persists a `deadline-exhausted` halt, so a lineage whose compute budget is spent still looks
// `ready` to the store — and a reconciler fed that row would relaunch it every tick, forever. The
// comparison routes through `decideScheduleToClose` so `>=` is the halt in ONE home.
// THE STOPPED SET'S DEFAULT-ABSENT VALUE (130/ADR-004 §4). `stopped` is an ADDITIVE input — the
// `loopRunId`s whose stop request the loop has honoured, read by the producer and never here —
// and an absent, empty or ill-typed one drops nothing, so every existing caller answers
// byte-identically. `instanceof Set`, never duck-typed: a Set-like is not the producer's set.
// Built from the global; this module still imports nothing.
const EMPTY_STOPPED = Object.freeze(new Set());

export function decideSupervisedDeclarations(input = {}) {
  const workspaces = Array.isArray(input.workspaces) ? input.workspaces : [];
  // `ceilingMs` is resolved PER WORKSPACE below (each declaration against its own workspace's
  // `scheduleToClose`), so it is deliberately not destructured from `input` here — `input.ceilingMs`
  // is the fallback a member with no readable config lands on.
  const { maxAttempts, stalenessMs, now, isRunning, isStale, retryReadiness, stopped } = input;
  const stoppedSet = stopped instanceof Set ? stopped : EMPTY_STOPPED;
  const nowMs = Date.parse(now);
  const rows = [];

  for (const workspace of workspaces) {
    const items = Array.isArray(workspace?.items) ? workspace.items : [];
    // A SCOPE, not an item, is the unit: a loop's runs span every item its range drives, and one
    // row per item would ask the supervisor to start the same loop N times.
    const byScope = new Map();
    for (const item of items) {
      for (const run of Array.isArray(item?.runs) ? item.runs : []) {
        const scope = run?.brief?.loop?.scope;
        if (scope == null) continue;
        if (!byScope.has(scope)) byScope.set(scope, []);
        byScope.get(scope).push(run);
      }
    }

    // THE CEILING IS THE DECLARATION-WORKSPACE'S OWN, NOT THE SUPERVISING NODE'S (2026-09-11).
    // The relaunch budget a declaration is measured against is `scheduleToClose` from the config
    // of the workspace the declaration LIVES in — the same config its resumed `aof work loop`
    // will actually run against. Reading the SUPERVISING node's ceiling here (the prior shape,
    // `input.ceilingMs` for every member) makes the predicate disagree with the executor whenever
    // two workspaces on one node carry different ceilings: a node whose own config raised
    // `scheduleToClose` to 12h listed a member workspace's 8.6h-elapsed lineage as in-budget,
    // relaunched it every poll, and each relaunch halted in <1s on the member's own 2h ceiling —
    // an infinite deadline-exhausted storm (measured against `aof-test-repo`). A per-workspace
    // ceiling handed in on the workspace row closes it; `input.ceilingMs` remains the fallback for
    // a member that could not be read.
    const ceilingMs = positiveInteger(workspace?.ceilingMs) ? workspace.ceilingMs : input.ceilingMs;
    for (const runs of byScope.values()) {
      // The DECLARATION is the latest USABLE one; the VERDICT is the latest record's, usable or
      // not. They are two questions and a record whose envelope lost a required key still says
      // what the loop is doing now.
      const declaration = readLoopDeclaration(runs);
      if (declaration == null || declaration.supervised !== true) continue;
      // A HONOURED stop yields no row (130/ADR-004 §4-§5), whatever the latest record says — the
      // skip PRECEDES the liveness branch, so a stopped loop is never retained on liveness either.
      // A `requested` mark is not in this set: a draining loop keeps its row until it halts. The
      // row is what keeps the reconcile from relaunching a stopped loop; `--resume` clears the mark.
      if (stoppedSet.has(declaration.loopRunId)) continue;
      const latest = [...runs].sort(compareRuns).at(-1);

      const inFlight = typeof isRunning === "function" && isRunning(latest) === true;
      const stale = inFlight
        && positiveInteger(stalenessMs)
        && typeof isStale === "function"
        && Number.isFinite(nowMs)
        && isStale(latest, nowMs, stalenessMs) === true;
      // A run in flight and demonstrably alive is listed on its own liveness. Its own shell owns
      // its bounds; this predicate is not a second enforcer of them.
      if (inFlight && !stale) {
        rows.push(declarationRow(workspace, declaration));
        continue;
      }
      const resumable = typeof retryReadiness === "function"
        && retryReadiness(latest, maxAttempts, nowMs)?.ready === true;
      if (!stale && !resumable) continue;

      // Both remaining branches mean a RELAUNCH, so both are gated by the compute budget.
      const elapsedMs = lineageElapsedMs({
        runs: retryLineage({ runs, record: latest }),
        now,
        stalenessMs,
        isStale,
      });
      if (decideScheduleToClose({ elapsedMs, ceilingMs }).admitted !== true) continue;
      rows.push(declarationRow(workspace, declaration));
    }
  }

  return Object.freeze({ rows: Object.freeze(rows) });
}

// SIX KEYS, NO SEVENTH. The display label, the argv and the `cwd` are the producer's, not the
// engine's: composing an argv here would mean importing the leaf that owns it, and this module
// imports nothing.
function declarationRow(workspace, declaration) {
  return Object.freeze({
    workspaceId: copyPlain(workspace?.workspaceId ?? null),
    projectRoot: copyPlain(workspace?.projectRoot ?? null),
    loopRunId: copyPlain(declaration.loopRunId),
    scope: copyPlain(declaration.scope),
    level: copyPlain(declaration.level),
    cap: copyPlain(declaration.cap),
  });
}

export function readLoopDeclaration(runs = []) {
  const usable = (Array.isArray(runs) ? runs : [])
    .filter((run) => usableDeclaration(run?.brief?.loop))
    .sort(compareRuns);
  const loop = usable.at(-1)?.brief?.loop;
  return recoverableDeclaration(loop);
}

export function resolveLoopResume(input = {}) {
  const scope = decideLoopScope(input.scope);
  if (!scope.admitted) return scope;
  const recovered = recoverableDeclaration(input.declaration ?? readLoopDeclaration(input.runs));
  const explicitLevel = input.level !== null && input.level !== undefined;
  const explicitCap = input.cap !== null && input.cap !== undefined;
  const level = resolveLoopLevel(explicitLevel ? input.level : recovered?.level);
  if (!level.admitted) return level;
  const cap = resolveLoopBound(explicitCap ? input.cap : recovered?.cap);
  if (!cap.admitted) return cap;
  // 126/02 (ADR-004 §6) — supervision follows the SAME rule level and cap already follow: an
  // explicit flag wins, an absent one inherits. No new grammar, and no negation: a declared
  // boolean flag is presence-only in `parseSpecArgv`, so `--supervised=false` opts IN (the value
  // is never read) and `--no-supervised` is a coded `unknown-flag` refusal. Both are facts about
  // the one flag parser rather than choices made here.
  const supervised = input.supervised === true || recovered?.supervised === true;
  return {
    resumed: recovered !== null && recovered !== undefined,
    supervised,
    loopRunId: copyPlain(recovered?.loopRunId ?? null),
    scope: scope.scope,
    priorScope: copyPlain(recovered?.scope ?? null),
    level: level.level,
    cap: cap.cap,
    startedAt: copyPlain(recovered?.startedAt ?? null),
    source: {
      level: explicitLevel ? "overridden" : recovered ? "inherited" : "default",
      cap: explicitCap ? "overridden" : recovered ? "inherited" : "unresolved",
    },
    lastDeclaration: recoverableDeclaration(recovered),
    message: recovered ? null : `No prior loop declaration exists for scope ${scope.scope}.`,
  };
}
