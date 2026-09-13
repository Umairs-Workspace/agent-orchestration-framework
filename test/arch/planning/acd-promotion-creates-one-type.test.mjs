// Fitness function FF-7103 for milestone 71 / ADR-003 (amended by ADR-009 §1):
// "The loop's item-creation authority is one type, one placement, and zero shifts."
//
// A promotion path with no bound converts a bounded ROUND loop into an unbounded WORK loop, which is
// strictly worse — the queue would then be produced by the same agent whose thoroughness the cap
// exists to bound. ADR-003's answer is structural rather than numeric: the loop may create exactly
// one type (`chore`) in exactly one place (top level, where the walk that created it cannot see it),
// and it may never renumber.
//
// SINCE 123 THE LOOP SPENDS NONE OF THAT. The decider creates nothing at all: a chore-shaped remedy
// is fixed at the close when it is cheap enough, and otherwise handed back as a story shape the
// operator refines. ADR-003's authority is narrowed to zero rather than contradicted, so this
// register entry keeps its name and its legs — leg (a) and leg (c) still bind the OPERATOR-reachable
// promotion path, which still creates exactly one type — and leg (b) is re-pointed at the stronger
// claim the block now makes. The exhaustive leg at the foot is the second layer: the prose layer
// failed before 118/01 and again at 119, so what is asserted is the whole input space.
//
// LEG (a) IS LOAD-BEARING, NOT BELT-AND-BRACES. `runInsertTopLevel` performs NO type validation: a
// wrong type does not refuse, it indexes `DOCS_BY_TYPE[type] → undefined` and crashes at
// `insert-shared.mjs:182`. This control is the only thing standing between the two. The admissible
// set is read from `DOCS_BY_TYPE` itself by SOURCE-PARSING — deliberately, because exporting a
// module-private constant to satisfy a test would widen a module's public surface for a control's
// convenience, which is the inversion this register should never cause (ADR-009).
//
// LEG (c) IS SPLIT AT THE SEAM WHERE THE CLAIM IS TRUE (ADR-009 §1). `work:promote-gap` ships `--at
// <P>` as a delivered 39/03 flag and keeps it: the OPERATOR may choose a position on a promotion
// they type. The LOOP never may, because a renumber mid-walk invalidates every ref in flight. So the
// leg binds the FINDING face only — and the gap face's surviving `--at` leaving this control green is
// the assertion that proves the two seams are really separated.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markedRegion, matchedBraceBody, stripComments } from "../../support/source-slice.mjs";
import { promoteFindingToChoreCommand } from "../../../src/commands/promote-finding-to-chore.mjs";
import { PROMOTED_TYPE } from "../../../src/work-promote/promotion.mjs";
import { FINDING_ROUTINGS, LOOP_CREATED_ITEM_TYPE } from "../../../src/work/loop.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const INSERT_ENGINE = "src/commands/insert-shared.mjs";
const GAP_FACE = "src/commands/promote-gap-to-chore.mjs";
const FINDING_FACE = "src/commands/promote-finding-to-chore.mjs";
const PROMOTION_PATH = Object.freeze([
  "src/work-promote/chore-seed.mjs",
  "src/work-promote/promotion.mjs",
  GAP_FACE,
  FINDING_FACE,
]);
const CONTINUE = "src/bundle/commands/continue.md";
// The cost question (118/00) and the depth bound (118/01), located in the block by the claims they
// make rather than by question NUMBER — the numbers shift whenever a question is inserted, and a
// control keyed to them would red on a renumber that changed no rule.
const COST_QUESTION_RE = /cheaper than the driver that would carry it/iu;
// 123 — the checklist question no longer routes to `**top-level chore**`, so the anchor moves to the
// question's own words. It is the SAME question in the same position; only its answer changed, and a
// control keyed to the answer would have gone vacuously green in exactly the beat the answer moved.
const CHECKLIST_QUESTION_RE = /discharged by a checklist against existing code/iu;
const CRITERIA_QUESTION_RE = /new acceptance criteria a `\.feature` must state/iu;
// 123 — the block's own statement that the close creates nothing. This is the claim leg (b) asserts
// now: not "which one creating verb it names" (it names none), but that it creates no item at all.
const NO_CREATION_RE = /\*\*The loop creates NO item\.\*\*/u;
// The ceremony a driver costs — the four 118/00's own contract enumerates. The cost question weighs
// the remedy against THESE and never against a line count or a duration: a size in lines or hours is
// a judgement about the code, and the question being asked is what SCHEDULING it would cost.
const CEREMONY_MARKERS = Object.freeze([/top-level\s+folder/iu, /Definition\s+of\s+Done/u, /validate\s+gate/iu, /`aof:verify`\s+session/u]);
const SIZE_MEASURE_RE = /\b\d+\s*[-\s]?\s*(?:lines?|loc|characters?|minutes?|hours?|days?|weeks?)\b/iu;
// The depth bound's two destinations: the reviewed chore's own checklist, and the operator.
const FOLD_DESTINATION_RE = /reviewed chore's own\s+`## Definition of Done`/u;
const OPERATOR_DESTINATION_RE = /handed back to the operator/iu;
const TRIAGE_OPEN = "<finding_triage>";
const TRIAGE_CLOSE = "</finding_triage>";

// ADR-003's closed routing set, READ FROM ITS ONE HOME rather than spelled a second time (118/00).
// It was a hand-written copy of the four until `fixed` was appended, and a control whose expected
// set is maintained by hand is one that goes stale in exactly the beat a routing is added — the
// beat it most needs to be right. Derived, a routing added to the export is asserted against the
// block with no edit to this file.
const CLOSED_ROUTINGS = FINDING_ROUTINGS;
// The item types the loop must never be told to create from a finding, and the verbs that create them.
const FORBIDDEN_CREATIONS = Object.freeze(["insert-story", "insert-milestone", "insert-uat", "add-story", "add-milestone", "add-uat"]);

const read = (rel) => readFile(path.join(root, rel), "utf8");

// The insert engine's OWN admissible type set, source-parsed from its module-private `DOCS_BY_TYPE`.
// Returns null when the declaration cannot be cut, so a moved constant fails as NOT FOUND rather
// than as an empty set that would make every other leg vacuous.
export function admissibleTypes(engineSource) {
  const code = stripComments(engineSource);
  const at = code.indexOf("DOCS_BY_TYPE");
  if (at < 0) return null;
  const body = matchedBraceBody(code, at);
  if (body == null) return null;
  return [...body.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gmu)].map((match) => match[1]);
}

// Leg (a) — nothing on the promotion path can emit a type other than `chore`.
export function typeAuthorityProblems(units, admissible) {
  const problems = [];
  for (const { rel, code } of units) {
    const stripped = stripComments(code);

    // No insert call names a type other than the one constant or the literal `"chore"`.
    for (const match of stripped.matchAll(/type:\s*("([^"]*)"|[A-Za-z_$][\w$]*)/gu)) {
      const literal = match[2];
      const named = match[1];
      if (literal === undefined) {
        if (named !== "PROMOTED_TYPE") problems.push(`${rel}: passes type \`${named}\` — the promotion path emits only PROMOTED_TYPE`);
        continue;
      }
      // A JSON-schema `type:` is not an ITEM type; only a value the insert engine would accept is.
      if (!admissible.includes(literal)) continue;
      if (literal !== PROMOTED_TYPE) problems.push(`${rel}: names the insert type "${literal}" — the loop creates only "${PROMOTED_TYPE}"`);
    }

    // …and no module on the path reaches the nested-story engine at all.
    if (/runInsertStory/u.test(stripped)) problems.push(`${rel}: imports or calls runInsertStory — the promotion path can create no nested item`);
  }
  return problems;
}

// Leg (b) — no bundled command instructs the creation of a milestone or a story from a finding, and
// the routings the review close names are ADR-003's closed four.
export function triageProseProblems(triage) {
  const problems = [];
  if (triage == null) return [`${CONTINUE}: NOT FOUND — the ${TRIAGE_OPEN} region could not be cut`];

  for (const verb of FORBIDDEN_CREATIONS) {
    if (triage.includes(verb)) problems.push(`${CONTINUE}: the review close names \`${verb}\` — the loop creates no story and no milestone`);
  }
  problems.push(...noCreationProblems(triage));
  for (const routing of CLOSED_ROUTINGS) {
    if (!new RegExp(routing, "iu").test(triage)) problems.push(`${CONTINUE}: the review close does not name the "${routing}" routing`);
  }
  problems.push(...costQuestionProblems(triage), ...depthBoundProblems(triage));
  return problems;
}

// Leg (b), 123 — the block instructs NO creation. Until 123 this leg asserted WHICH creating verb
// the close may name, which is a weaker claim than the rule now makes and — worse — one the block
// can satisfy by saying nothing at all. So both halves are asserted: the block states in its own
// words that the loop creates no item, and it names no `aof work` verb that would create one.
//
// The verb half stays a whitelist of ZERO rather than a blacklist of known creators: a verb added to
// the CLI tomorrow is caught without an edit here, which is the property the `FORBIDDEN_CREATIONS`
// list above cannot have on its own.
export function noCreationProblems(triage) {
  const problems = [];
  if (!NO_CREATION_RE.test(triage)) {
    problems.push(`${CONTINUE}: the review close does not state that the loop creates no item`);
  }
  const verbs = [...new Set([...triage.matchAll(/aof work ([a-z][a-z-]*)/gu)].map((match) => match[1]))];
  for (const verb of verbs) {
    problems.push(`${CONTINUE}: the review close names \`aof work ${verb}\` — the close creates nothing, so it invokes no verb`);
  }
  return problems;
}

// Leg (b), 118/00 — the block states the COST question the decider asks, and states it AHEAD of the
// question that routes to a top-level chore. The order IS the rule: a remedy that is both cheap and
// checklist-shaped is fixed rather than scheduled only because the cost question answers first.
export function costQuestionProblems(triage) {
  const problems = [];
  const cost = triage.search(COST_QUESTION_RE);
  const chore = triage.search(CHECKLIST_QUESTION_RE);
  if (cost < 0) {
    problems.push(`${CONTINUE}: the review close does not ask whether the remedy is cheaper than the driver that would carry it`);
    return problems;
  }
  if (chore < 0) return problems;
  if (cost > chore) problems.push(`${CONTINUE}: the cost question is asked AFTER the top-level-chore question — a cheap, checklist-shaped remedy would be scheduled rather than fixed`);

  // The question's OWN region: what it weighs the remedy against is asserted where it is asked, not
  // anywhere in the block, so a ceremony word borrowed from a neighbouring paragraph cannot satisfy it.
  const region = triage.slice(cost, chore > cost ? chore : triage.length);
  for (const marker of CEREMONY_MARKERS) {
    if (!marker.test(region)) problems.push(`${CONTINUE}: the cost question does not name the ceremony /${marker.source}/ a driver costs`);
  }
  if (SIZE_MEASURE_RE.test(region)) problems.push(`${CONTINUE}: the cost question states a line count or a duration — it weighs the remedy against a driver's ceremony, not against a size`);
  return problems;
}

// Leg (b), 118/01 — the block states the DEPTH BOUND and both destinations open to a remedy raised
// while reviewing a chore. A bound naming no destination schedules nothing and simply drops the
// remedy, which is the failure the whole triage rule exists to prevent.
export function depthBoundProblems(triage) {
  const problems = [];
  const chore = triage.search(CHECKLIST_QUESTION_RE);
  if (chore < 0) return problems;
  const criteria = triage.search(CRITERIA_QUESTION_RE);
  const region = triage.slice(chore, criteria > chore ? criteria : triage.length);
  if (!/itself\s+a\s+chore/iu.test(region) || !/creates\s+nothing/iu.test(region)) {
    problems.push(`${CONTINUE}: the chore-routing question does not state that the loop creates nothing when the item under review is itself a chore`);
  }
  if (!FOLD_DESTINATION_RE.test(region)) {
    problems.push(`${CONTINUE}: the chore-routing question does not name the reviewed chore's own Definition of Done as the fold-in destination`);
  }
  if (!OPERATOR_DESTINATION_RE.test(region)) {
    problems.push(`${CONTINUE}: the chore-routing question does not name the operator hand-back as the destination for a remedy that does not fold`);
  }
  return problems;
}

// Leg (c), 118/01 — the LOOP's face refuses a finding raised while reviewing a chore, and refuses it
// BEFORE the idempotence scan. A bound that can be crossed by having already crossed it once is not
// a bound: every one of the six measured recursions would otherwise answer "already promoted" and
// pass straight through it.
export function depthRefusalProblems(findingFaceSource) {
  const problems = [];
  const code = stripComments(findingFaceSource);
  const refusal = code.indexOf("promote-finding-reviewing-a-chore");
  if (refusal < 0) {
    problems.push(`${FINDING_FACE}: does not refuse a finding raised while reviewing a chore — the depth bound has no gate at the act`);
    return problems;
  }
  if (!/\.type === PROMOTED_TYPE/u.test(code)) {
    problems.push(`${FINDING_FACE}: does not decide the depth bound on the reviewed item's own type against PROMOTED_TYPE`);
  }
  const idempotence = code.indexOf("await findPromotedChore(");
  if (idempotence >= 0 && refusal > idempotence) {
    problems.push(`${FINDING_FACE}: refuses the reviewed-a-chore case AFTER the idempotence scan — an already-promoted finding would answer "already promoted" and cross the bound`);
  }
  return problems;
}

// Leg (c) — the LOOP's face neither accepts nor forwards a caller-chosen position or type.
export function loopAppendOnlyProblems(command, findingFaceSource) {
  const problems = [];
  const properties = Object.keys(command?.input?.properties ?? {});
  for (const forbidden of ["at", "type", "parent", "under"]) {
    if (properties.includes(forbidden)) problems.push(`${FINDING_FACE}: declares an \`${forbidden}\` input — the loop chooses no position and no type`);
  }
  const flags = Object.keys(command?.cli?.spec?.flags ?? {});
  for (const forbidden of ["at", "type", "parent", "under"]) {
    if (flags.includes(forbidden)) problems.push(`${FINDING_FACE}: offers an \`--${forbidden}\` flag — the loop chooses no position and no type`);
  }
  // …and an input outside the declared set is REFUSED rather than ignored: `invoke` treats the
  // schema as advisory, so `additionalProperties: false` alone would not have closed the set.
  if (!/unknown input\(s\)/u.test(stripComments(findingFaceSource))) {
    problems.push(`${FINDING_FACE}: does not refuse an unknown input — a closed set the schema alone declares is not closed`);
  }
  // …and the position it passes is RESOLVED FROM THE STREAM by the engine's own append rule, never
  // taken from an input. This is asserted as the PRESENCE of that resolution rather than as the
  // absence of a forward: "no caller position reaches the engine" is only true if something else
  // supplies one, and this is that something.
  if (!/const at = await appendPosition\(/u.test(stripComments(findingFaceSource))) {
    problems.push(`${FINDING_FACE}: does not resolve its position through appendPosition — the loop's append-only bound has no mechanism behind it`);
  }
  return problems;
}

export const archTests = [
  {
    name: "arch/71 FF-7103 (acd-promotion-creates-one-type): one type, one placement, zero shifts — over the shipped tree",
    run: async () => {
      const engine = await read(INSERT_ENGINE);
      const admissible = admissibleTypes(engine);
      assert.ok(Array.isArray(admissible) && admissible.length > 0, `${INSERT_ENGINE}: NOT FOUND — DOCS_BY_TYPE could not be cut`);
      assert.deepEqual([...admissible].sort(), ["chore", "milestone", "uat"], "recorded: the engine's own admissible top-level types, source-parsed");
      assert.ok(admissible.includes(PROMOTED_TYPE), "…and the one type the loop may create is one of them");

      const units = [];
      for (const rel of PROMOTION_PATH) units.push({ rel, code: await read(rel) });
      assert.deepEqual(typeAuthorityProblems(units, admissible), [], "leg (a) — the promotion path emits only a chore");

      const prompt = await read(CONTINUE);
      const triage = markedRegion(prompt, TRIAGE_OPEN, TRIAGE_CLOSE);
      assert.deepEqual(triageProseProblems(triage), [], "leg (b) — the review close instructs one creation, names the closed routings, asks the cost question first and states the depth bound");

      const findingFace = await read(FINDING_FACE);
      assert.deepEqual(
        loopAppendOnlyProblems(promoteFindingToChoreCommand, findingFace),
        [],
        "leg (c) — the loop's face takes no position and no type",
      );
      assert.deepEqual(depthRefusalProblems(findingFace), [], "leg (c), 118/01 — the loop's face refuses a chore's own review, before the idempotence scan");

      // THE JOIN 118/01's write set could not make with an import. `src/work/loop.mjs` imports
      // nothing (53/ADR `work-loop-determinism`), so the decider spells the type it may create — and
      // may not be promoted FROM — in its own module. Two spellings of one fact is the drift FF-7103
      // exists to refuse, so the two are pinned HERE, where both are readable.
      assert.equal(LOOP_CREATED_ITEM_TYPE, PROMOTED_TYPE, "the type the decider names and the type the promotion path creates are one type");
    },
  },
  {
    name: "arch/71 FF-7103: leg (a) — a face passing another type, or reaching the nested-story engine, is reported",
    run: async () => {
      const admissible = admissibleTypes(await read(INSERT_ENGINE));
      const units = [];
      for (const rel of PROMOTION_PATH) units.push({ rel, code: await read(rel) });

      for (const type of ["milestone", "uat"]) {
        const planted = units.map((unit) => (unit.rel === FINDING_FACE
          ? { ...unit, code: unit.code.replace("type: PROMOTED_TYPE", `type: "${type}"`) }
          : unit));
        assert.ok(
          typeAuthorityProblems(planted, admissible).some((problem) => problem.includes(FINDING_FACE) && problem.includes(type)),
          `a face passing type "${type}" is reported`,
        );
      }

      const nested = units.map((unit) => (unit.rel === GAP_FACE
        ? { ...unit, code: `import { runInsertStory } from "./insert-shared.mjs";\n${unit.code}` }
        : unit));
      assert.ok(
        typeAuthorityProblems(nested, admissible).some((problem) => problem.includes("runInsertStory")),
        "a face reaching the nested-story engine is reported",
      );

      // A moved DOCS_BY_TYPE fails as NOT FOUND rather than deriving an empty admissible set that
      // would make the whole leg vacuously green.
      assert.equal(admissibleTypes("const NOTHING = 1;\n"), null, "a missing declaration answers null");
    },
  },
  {
    name: "arch/71 FF-7103: leg (b) — a review close that names another creating verb, or drops a routing, is reported",
    run: async () => {
      const prompt = await read(CONTINUE);
      const triage = markedRegion(prompt, TRIAGE_OPEN, TRIAGE_CLOSE);

      const nested = triageProseProblems(`${triage}\nIf it needs criteria, run \`aof work insert-story --under 71\` and refine it.\n`);
      assert.ok(nested.some((problem) => problem.includes("insert-story")), `a review close instructing a story creation is reported\n${nested.join("\n")}`);

      const otherVerb = triageProseProblems(`${triage}\nThen run \`aof work add-milestone\` for the rest.\n`);
      assert.ok(otherVerb.some((problem) => problem.includes("add-milestone")), "…and so is a milestone creation");

      for (const routing of CLOSED_ROUTINGS) {
        const stripped = triage.replaceAll(new RegExp(routing, "giu"), "xxx");
        assert.ok(
          triageProseProblems(stripped).some((problem) => problem.includes(routing)),
          `a review close that stops naming the "${routing}" routing is reported`,
        );
      }
    },
  },
  {
    name: "arch/71 FF-7103: leg (c) — the FINDING face is bound and the GAP face's delivered `--at` leaves it green",
    run: async () => {
      const findingSource = await read(FINDING_FACE);
      assert.deepEqual(loopAppendOnlyProblems(promoteFindingToChoreCommand, findingSource), [], "the shipped finding face is green");

      // The plant: the finding face gains an `at` the caller can choose.
      const withAt = {
        ...promoteFindingToChoreCommand,
        input: { ...promoteFindingToChoreCommand.input, properties: { ...promoteFindingToChoreCommand.input.properties, at: { type: "number" } } },
      };
      assert.ok(
        loopAppendOnlyProblems(withAt, findingSource).some((problem) => problem.includes("`at` input")),
        "a finding face gaining a caller-chosen position is reported",
      );

      // A face that stopped resolving its own append position — and so could be handed one — is
      // reported, which is what keeps leg (c) from being a claim with no mechanism behind it.
      assert.ok(
        loopAppendOnlyProblems(promoteFindingToChoreCommand, findingSource.replace("const at = await appendPosition(", "const at = Number(input.at ?? 0); void appendPosition("))
          .some((problem) => problem.includes("appendPosition")),
        "a face that takes its position from anywhere but the stream is reported",
      );

      // …and dropping the unknown-input refusal is reported, because the schema alone does not close
      // the set — `invoke` never enforces it.
      assert.ok(
        loopAppendOnlyProblems(promoteFindingToChoreCommand, findingSource.replace("unknown input(s)", "surprising input(s)"))
          .some((problem) => problem.includes("does not refuse an unknown input")),
        "a face that stops refusing unknown inputs is reported",
      );

      // THE SEPARATION PROOF: the OPERATOR's face still ships `--at <P>`, and that leaves this
      // control green — the leg binds the loop's seam, not every promotion in the tree.
      const { promoteGapToChoreCommand } = await import("../../../src/commands/promote-gap-to-chore.mjs");
      assert.ok("at" in promoteGapToChoreCommand.input.properties, "work:promote-gap still ships its delivered --at flag");
      assert.deepEqual(loopAppendOnlyProblems(promoteFindingToChoreCommand, findingSource), [], "…and the finding face is still green beside it");
    },
  },
  {
    name: "arch/118 FF-7103: leg (b), the cost question — a block that drops it, asks it too late, or prices it in lines is reported",
    run: async () => {
      const triage = markedRegion(await read(CONTINUE), TRIAGE_OPEN, TRIAGE_CLOSE);
      assert.deepEqual(costQuestionProblems(triage), [], "the shipped block asks the cost question, first, against a driver's ceremony");

      // Dropped entirely — the block would route by shape alone, which is the defect 118 was raised for.
      const dropped = costQuestionProblems(triage.replace(COST_QUESTION_RE, "is worth doing"));
      assert.ok(
        dropped.some((problem) => problem.includes("cheaper than the driver")),
        `a block that drops the cost question is reported\n${dropped.join("\n")}`,
      );

      // Asked AFTER the chore question — the order IS the rule, so a block that keeps the words and
      // loses the position is still red. Built by moving the whole question below the chore one.
      const cost = triage.search(COST_QUESTION_RE);
      const chore = triage.search(CHECKLIST_QUESTION_RE);
      const question = triage.slice(cost, chore);
      const reordered = `${triage.slice(0, cost)}${triage.slice(chore)}${question}`;
      assert.ok(
        costQuestionProblems(reordered).some((problem) => problem.includes("asked AFTER")),
        "a block that asks the cost question after the top-level-chore question is reported",
      );

      // Priced in lines rather than in ceremony — a judgement about the code, not about scheduling.
      const priced = costQuestionProblems(triage.replace(COST_QUESTION_RE, "cheaper than the driver that would carry it, meaning under 40 lines"));
      assert.ok(
        priced.some((problem) => problem.includes("line count or a duration")),
        "a cost question stated as a line count is reported",
      );
      for (const marker of CEREMONY_MARKERS) {
        const stripped = costQuestionProblems(triage.replace(marker, "xxx"));
        assert.ok(
          stripped.some((problem) => problem.includes(marker.source)),
          `a cost question that stops naming /${marker.source}/ is reported`,
        );
      }
    },
  },
  {
    name: "arch/118 FF-7103: leg (b), the depth bound — a block that drops the bound or either destination is reported",
    run: async () => {
      const triage = markedRegion(await read(CONTINUE), TRIAGE_OPEN, TRIAGE_CLOSE);
      assert.deepEqual(depthBoundProblems(triage), [], "the shipped block states the bound and both destinations");

      const unbounded = depthBoundProblems(triage.replace(/itself\s+a\s+chore/giu, "a driver"));
      assert.ok(
        unbounded.some((problem) => problem.includes("itself a chore")),
        `a block that stops bounding a chore's own review is reported\n${unbounded.join("\n")}`,
      );

      assert.ok(
        depthBoundProblems(triage.replace(FOLD_DESTINATION_RE, "somewhere else")).some((problem) => problem.includes("fold-in destination")),
        "a block that drops the fold-in destination is reported",
      );
      assert.ok(
        depthBoundProblems(triage.replace(OPERATOR_DESTINATION_RE, "dropped")).some((problem) => problem.includes("operator hand-back")),
        "a block that drops the operator hand-back is reported",
      );
    },
  },
  {
    name: "arch/118 FF-7103: leg (c), the depth bound at the act — a removed check, or one moved past the idempotence scan, is reported",
    run: async () => {
      const findingFace = await read(FINDING_FACE);
      assert.deepEqual(depthRefusalProblems(findingFace), [], "the shipped finding face refuses a chore's own review");

      // THE CHECK REMOVED — the verb every one of the six measured recursions arrived through would
      // promote again, with only the prose layer between the loop and the treadmill.
      const removed = depthRefusalProblems(findingFace.replaceAll("promote-finding-reviewing-a-chore", "promote-finding-unknown-ref"));
      assert.ok(
        removed.some((problem) => problem.includes("does not refuse a finding raised while reviewing a chore")),
        `a face with the type check removed is reported\n${removed.join("\n")}`,
      );

      // …and the check DECIDED ON SOMETHING OTHER THAN THE REVIEWED ITEM'S TYPE — a provenance key
      // would have caught only four of the six, because 95 and 97 were raised by a person.
      assert.ok(
        depthRefusalProblems(findingFace.replace("reviewed.type === PROMOTED_TYPE", 'String(key).startsWith("finding:")'))
          .some((problem) => problem.includes("reviewed item's own type")),
        "a face deciding the bound on anything but the reviewed item's type is reported",
      );

      // THE CHECK MOVED PAST THE IDEMPOTENCE SCAN. A bound that can be crossed by having already
      // crossed it once is not a bound: the second promotion answers "already promoted" and passes.
      // The plant reorders the source so the refusal follows `findPromotedChore`, which is exactly
      // the shape a well-meant "check the cheap things first" refactor would produce.
      const refusalAt = findingFace.indexOf("  if (reviewed.type === PROMOTED_TYPE) {");
      const refusalEnd = findingFace.indexOf("  // Idempotence on (reviewed ref + finding title)");
      assert.ok(refusalAt > 0 && refusalEnd > refusalAt, "the refusal block could be cut from the shipped face");
      const refusalBlock = findingFace.slice(refusalAt, refusalEnd);
      const withoutRefusal = findingFace.slice(0, refusalAt) + findingFace.slice(refusalEnd);
      const anchor = withoutRefusal.indexOf("  // No caller-chosen position ever reaches the insert engine");
      assert.ok(anchor > 0, "…and the post-scan anchor is present");
      const moved = withoutRefusal.slice(0, anchor) + refusalBlock + withoutRefusal.slice(anchor);
      const reported = depthRefusalProblems(moved);
      assert.ok(
        reported.some((problem) => problem.includes("AFTER the idempotence scan")),
        `a face refusing after the idempotence scan is reported\n${reported.join("\n")}`,
      );
    },
  },
  {
    name: "arch/123 FF-7103: the decider creates NOTHING — over every declared input, not an enumerated few",
    run: async () => {
      // THE EXHAUSTIVE LEG. 118/01 put the depth bound in two layers because the prose layer had
      // already failed once; it failed again at 119, where three chores were minted reviewing a
      // milestone and a story and the bound answered correctly for all three. The claim that holds
      // is not "the loop creates one type" — it is "the loop creates nothing" — and that one is
      // provable over the whole input space rather than over the rows someone thought to write.
      const { routeFinding, routeFindings, FINDING_SEVERITIES } = await import("../../../src/work/loop.mjs");

      // Every declared input of the decider, at every value that changes its answer. `reviewedType`
      // carries the stream's item types plus `undefined` — the no-context default every existing
      // caller still takes.
      const severities = [...FINDING_SEVERITIES, "unknown", undefined];
      const contracts = ["feature", "adr", "", undefined];
      const flags = [true, false, undefined];
      const reviewedTypes = [undefined, "chore", "story", "milestone", "spike", "uat"];

      let combinations = 0;
      const routings = new Set();
      for (const severity of severities) {
        for (const lockedContract of contracts) {
          for (const cheaperThanDriver of flags) {
            for (const checklistDischargeable of flags) {
              for (const needsNewCriteria of flags) {
                for (const reproduced of flags) {
                  for (const outstanding of flags) {
                    for (const reviewedType of reviewedTypes) {
                      combinations += 1;
                      const finding = {
                        title: "F", location: "src/x.mjs:1",
                        severity, lockedContract, cheaperThanDriver, checklistDischargeable,
                        needsNewCriteria, reproduced, outstanding,
                      };
                      const decision = routeFinding(finding, { reviewedType });
                      const where = JSON.stringify({ ...finding, reviewedType });
                      if (decision.routed) {
                        assert.equal(decision.creates, null, `the decider asked the loop to create "${decision.creates}" for ${where}`);
                        routings.add(decision.routing);
                      } else {
                        // A finding that never reached the questions carries no `creates` at all —
                        // asserted as ABSENT rather than as null, so a shape that started answering
                        // with a creation on the not-routed path could not pass as "nullish".
                        assert.equal("creates" in decision, false, `an unrouted decision carries a creates field for ${where}`);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // The sweep is not vacuous: it really walked the space, and it really reached every routing
      // the decider can still answer with. `chore` is absent by construction — that is the change.
      assert.ok(combinations > 2000, `the sweep covered ${combinations} combinations`);
      assert.deepEqual([...routings].sort(), ["amendment", "fixed", "recorded", "story"], "the routings the decider can still reach");
      assert.ok(FINDING_ROUTINGS.includes("chore"), "…while `chore` stays a member of the delivered routing set");
      assert.ok(!routings.has("chore"), "…that the decider can no longer reach");

      // …and the close's `creates` subset is empty for a mixed close, which is the shape the review
      // pass actually hands back.
      const close = routeFindings([
        { title: "F-cheap", location: "a:1", severity: "important", cheaperThanDriver: true },
        { title: "F-list", location: "b:2", severity: "important", checklistDischargeable: true },
        { title: "F-nit", location: "c:3", severity: "nit", checklistDischargeable: true },
      ], { reviewedType: "milestone" });
      assert.deepEqual(close.creates, [], "a close deposits no driver in the stream");
      assert.deepEqual(close.routed.map((decision) => decision.routing), ["fixed", "story", "recorded"]);
      assert.equal(close.routed[1].owner, "operator", "…and the chore-shaped remedy leaves as the operator's story");
    },
  },
  {
    name: "arch/123 FF-7103: leg (b) — a block that re-opens the door, or stops saying it is shut, is reported",
    run: async () => {
      const triage = markedRegion(await read(CONTINUE), TRIAGE_OPEN, TRIAGE_CLOSE);
      assert.deepEqual(noCreationProblems(triage), [], "the shipped block states the close creates no item and names no verb");

      const silent = noCreationProblems(triage.replace(NO_CREATION_RE, "**The loop is careful.**"));
      assert.ok(
        silent.some((problem) => problem.includes("creates no item")),
        `a block that stops stating the bound is reported\n${silent.join("\n")}`,
      );

      // THE REGRESSION ITSELF: the promotion instruction put back. It is reported for naming a verb,
      // whatever the verb is — the whitelist is empty, so a creating verb added to the CLI tomorrow
      // is caught here with no edit to this control.
      const reopened = noCreationProblems(`${triage}\n  Otherwise run \`aof work promote-finding <ref> "<title>" --remedy "…"\`.\n`);
      assert.ok(
        reopened.some((problem) => problem.includes("promote-finding")),
        "a block that re-instructs the promotion is reported",
      );
      assert.ok(
        noCreationProblems(`${triage}\n  Or \`aof work invent-a-driver\`.\n`).some((problem) => problem.includes("invent-a-driver")),
        "…and so is a verb this control has never heard of",
      );

      // The whole leg (b) is still green over the shipped block, with the routing set and the two
      // 118 questions asserted beside the new claim.
      assert.deepEqual(triageProseProblems(triage), [], "leg (b) — the shipped block passes every claim it now makes");
    },
  },
];
