// work:trigger — milestone 63's ONE registered surface and its only convergence
// (63/ADR-001, ADR-003, ADR-004, ADR-011).
//
// THE WHOLE OUTPUT IS A `work:loop` INPUT AND THE ARGV THAT CARRIES IT. A trigger's entire job
// is to say which scope, at which level; the answer is therefore the input `work:loop` already
// declares plus the exact argv that carries it, and nothing else. Four sources converge on one
// command with one input shape, because four shapes that all end at one command are one shape
// with four producers.
//
// THIS FACE LAUNCHES NOTHING, AND THAT IS STRUCTURAL RATHER THAN CAUTIOUS. 53/ADR-005 made
// `work:loop`'s registered `run()` a promptly-returning probe and put the loop body behind
// `cli.launch`, so asking the registry for the loop returns a probe and drives nothing. There is
// no in-process path by which a second registered command can run the loop: a face that wanted
// to would have to start a process of its own (a scheduler, which 63/SPEC puts out of scope) or
// open a second door onto the loop's body (a second launcher for one body, and 53 deliberately
// left exactly one). So this face RESOLVES, and whoever called it runs the argv it was handed —
// a crontab line, a build step, a dispatch tick.
//
// WHICH IS WHY THERE IS NO `--dry-run` AND NO `--strict`. 62/ADR-005 §1's rule, adopted whole:
// not "writes only under a flag" — no write path exists to be flagged, so a dry run would
// advertise a wet one and an operator reading the help would learn something false about what
// running this can do to their repository. This module opens no file for writing, mutates no
// config and raises no event; it reads the installed declaration and asks the registry two
// questions.
//
// IT PROJECTS; IT NEVER PASSES A LEAF'S ANSWER THROUGH (ADR-011 §2). `resolveTriggerLevel`
// answers `{ triggerId, resolved, level, preflight, resolvedFor, gatedAgainAt }` — a PRE-FLIGHT,
// not a resolution. Handed on as a `work:loop` input it is rejected by that command's own schema
// (`additionalProperties: false` over `{ scope, level, resume, cap, reviewClaims, dryRun }`)
// before any gate is consulted. So a leaf's answer is an INPUT to the composition here and never
// the composition's output: a resolved row carries the loop's `{ scope, level }`, the argv
// carrying them, and ONE identity key naming the declaring member — `trigger: { id, source }`,
// which is what lets `--json` say which trigger produced an argv and under which source it was
// declared, and which carries no verdict of any kind.
//
// THE TWO GATE FACTS ARE GATHERED HERE AND HANDED IN, AND NEITHER IS COERCED (ADR-004 §1,
// ADR-011 §3). `src/commands/loop.mjs:747` writes `{ loopReady: doctor?.loopReady ?? null,
// groundedness: groundedness ?? null }`, which is correct THERE — that command asked the registry
// itself, so a nullish reading can only mean the registry had nothing. It is wrong at this seam:
// `src/work-trigger/level.mjs` reads a nullish fact as NOT HANDED IN, while ADR-010 §11 requires
// a registry that ANSWERS with an unusable reading to be a gate refusal at exit 0. A face that
// wrote `?? null` would tell an operator "you did not give me the readings" for a workspace whose
// doctor answered and could not compute — sending them to fix the caller instead of the
// workspace. So the reading is handed over EXACTLY as the registry returned it, and absence is
// reserved for a registry that was never asked or that produced no answer at all, which is a
// different outcome with a different exit code.
//
// AND THE TWO UNAVAILABILITIES ARE TOLD APART, because the operator's next move differs for each.
// A registry that answers for no such command, and a call that raises, are this installation being
// broken: no resolution is produced, so the run reports a failure first and exits non-zero. A
// reading that came back carrying no gate half is a fact about this WORKSPACE: a resolution was
// produced and its content is a refusal, so the triggers that needed it are refused by name at
// exit zero. One sentence: not reaching the registry is this command's own failure, and what a
// reached registry said is about the work.
//
// RESOLUTION HAPPENS AT FIRE TIME, ON EVERY FIRE — the level (ADR-004 §2) and the scope alike.
// A declaration is a request made once; a workspace's anchors, its Loop-Ready score and its
// groundedness all move, and a cached verdict is a permission with no expiry handed to the one
// caller that will never notice it went stale. So the scope a compiled member carries is put back
// through `decideLoopScope` here rather than trusted from compile time, which is also what makes
// a scope no form admits a per-trigger refusal at exit 0 rather than only a whole-declaration
// refusal at compile time.
//
// THAT SECOND DECISION IS DELIBERATELY REDUNDANT ON THE DECLARATION PATH, AND IS SAID SO RATHER
// THAN LEFT TO BE FOUND. `compileTriggerDeclaration` already refuses a member whose scope no form
// admits, and `src/work-trigger/sources.mjs` already puts a signal's scope through the same
// function, so on both of today's paths this decision cannot refuse. It is kept for two reasons
// that are worth more than the branch costs. The claim "every resolved argv carries a scope
// `LOOP_SCOPE_FORMS` admits" becomes a property of the CODE rather than of a control reading the
// code, at the one place the argv is actually composed. And a compiled set handed straight to
// this face — the `compiled` seam below, which is how a caller reuses a set it already compiled —
// has passed through no compiler of ours, so a scope no form admits arrives here refused by name
// rather than composed into an argv `work:loop` would reject.
//
// THE EXIT CODE IS A CAUSE, NOT A LIST (ADR-010 §6). A run that produced an ANSWER exits 0 no
// matter how many refusals it carries — an unresolved scope, a refused level, an unknown source
// and a declaration that declares nothing are all answers. A run that could not produce one at
// all — a declaration that will not compile, a registry that could not be reached for a reading,
// an invocation this command cannot read — is a failure, stated first in `--json` and exited
// non-zero. The mapping is the single expression `src/commands/tune.mjs:590` already ships, so
// the two sides cannot drift into a per-case table.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
// From the comment above this module's registry import:
//   milestone 63 / story 05 (63/ADR-001, ADR-003, ADR-011) — work:trigger, this milestone's ONE
//   registered surface and its only convergence. It composes the four `src/work-trigger/` leaves,
//   obtains the two gate readings through THIS registry (deferred `await import`, so the ring is
//   not closed at module scope), and emits the `work:loop` input each declared trigger resolves to
//   plus the argv that carries it. Its bare face is a READ in the structural sense 62/ADR-005 §1
//   established — no write path exists to be flagged, so there is no `--dry-run` and no `--strict`
//   — and it declares no `cli.launch`: 53/ADR-005 left the loop exactly one launcher, reachable
//   only from outside it, so this face resolves and the caller runs the argv it was handed.
//   BOARD-DEFERRED (63/ADR-008 §7) for a reason of its own: the level pre-flight reaches
//   `work:doctor` and `work:loops-groundedness`, so a served route would let a page load walk the
//   whole work tree. It ships no `/aof:trigger` bundle command for the reason §6 records — the
//   CLI↔bundle parity control is scoped to the `work:insert-*` family, which this is not.
//
// From the comment on `triggerCommand`'s COMMANDS entry:
//   milestone 63 / story 05 — the trigger's face (see the import note). ONE story appends to this
//   array for the whole milestone, and it is the terminal one (59/ADR-008 §1's rule, applied
//   again): five stage-1 stories appending to the registry god-node would be merge friction
//   wearing an independence claim.
import {
  TRIGGER_SOURCES,
  TriggerDeclarationError,
  compileTriggerDeclaration,
  readTriggerDeclaration,
  triggerDeclarationPath,
} from "../work-trigger/declaration.mjs";
import { resolveTriggerLevel } from "../work-trigger/level.mjs";
import { SIGNAL_SOURCES, isResolvedSignal, resolveTriggerSignal } from "../work-trigger/sources.mjs";
import { decideLoopScope, resolveLoopLevel, resolveLoopLevelGate } from "../work/loop.mjs";
// 126/02 (ADR-005 §4) — the loop's argv composer, now a zero-import leaf so the declarations
// producer can reach it without importing a registered command module (TECH_DEBT item 26's ring).
// Re-exported here because `LOOP_INPUT_KEYS` and `LEVEL_FLAG` are asserted through this face by
// two delivered 63 controls: they follow the composer by an import specifier, not by a rewrite.
import { LEVEL_FLAG, LOOP_INPUT_KEYS, argvFor, loopInputOf } from "../loop-argv.mjs";
// Re-exported, never re-declared: the leaf holds the ONE binding of each, and this face keeps the
// surface the two delivered 63 controls already read it through, so the move costs them no edit.
export { LEVEL_FLAG, LOOP_INPUT_KEYS };
import { commandError } from "../command-error.mjs";

// The three commands this face reaches, and the only `work:` ids it spells. Each is a READ: the
// loop's registration answers what its own route is, and the two gate readings are the pair
// `src/commands/loop.mjs` gathers when it fires.
const LOOP_COMMAND_ID = "work:loop";
const DOCTOR_COMMAND_ID = "work:doctor";
const GROUNDEDNESS_COMMAND_ID = "work:loops-groundedness";

// This face's own refusal codes. The gate's codes (`loop-level-gate`, `loop-level-unknown`), the
// scope's (`loop-scope-unsupported`), the compiler's (`trigger-*` from the declaration) and the
// signal leaf's (`trigger-signal-*`) all arrive on their own answers and are carried through
// rather than retyped — a re-phrasing is a second opinion that drifts silently.
export const TRIGGER_UNKNOWN = "trigger-unknown";
export const TRIGGER_SOURCE_UNKNOWN = "trigger-source-unknown";
export const TRIGGER_SOURCE_UNRESOLVABLE_HERE = "trigger-source-unresolvable-here";
export const TRIGGER_SIGNAL_UNMATCHED = "trigger-signal-unmatched";
export const TRIGGER_SIGNAL_UNREADABLE = "trigger-invocation-signal-unreadable";
export const TRIGGER_GATE_READING_UNREACHABLE = "trigger-gate-reading-unreachable";
export const TRIGGER_GATE_READING_FAILED = "trigger-gate-reading-failed";
export const TRIGGER_GATE_READING_UNOBTAINED = "trigger-gate-reading-unobtained";
export const TRIGGER_LOOP_UNREGISTERED = "trigger-loop-command-unregistered";

export const TRIGGER_SOURCE_UNDECLARED_GAP = "trigger-source-undeclared";
export const TRIGGER_SOURCE_UNRESOLVED_GAP = "trigger-source-unresolved";

// THE KEY SET OF A RESOLVED ROW, ENUMERATED RATHER THAN INTENDED. Three keys carry the loop's own
// input and the argv that carries it; the fourth names the declaring member and is not part of
// that input. A fifth key is a defect here, not a remark at review — `acd-trigger-is-a-caller-not
// -a-coordinator` asserts this list exhaustively and asserts the projection below against
// `work:loop`'s declared input.
export const RESOLVED_TRIGGER_KEYS = Object.freeze(["trigger", "scope", "level", "argv"]);

// 126/02 (ADR-005 §4) — THE COMPOSER MOVED TO A ZERO-IMPORT LEAF, and this face imports it. It
// lived here, inside a REGISTERED COMMAND MODULE, and the declarations producer needs the same
// argv; importing one registered command module from another closes the registry TDZ ring
// (TECH_DEBT item 26). `RESOLVED_TRIGGER_KEYS` above does NOT move: it enumerates this face's own
// row contract and is no part of the loop's input.
const freeze = (value) => Object.freeze(value);
const list = (value) => freeze(Array.isArray(value) ? [...value] : []);

// PRESENCE, NEVER TRUTHINESS, at every seam in this module (ADR-012 §1's idiom). A dependency
// that was not supplied and one supplied as `null` are two different requests, and collapsing
// them is the `?? <empty>` species this milestone has now met five times.
const supplied = (bag, key) => bag != null && Object.prototype.hasOwnProperty.call(bag, key);

// A COMPILER REFUSAL'S DETAILS ARE THE CALLER'S NEXT MOVE, so they are carried rather than
// summarised into a sentence. `TriggerDeclarationError` puts its particulars on the error itself
// (`Object.assign(this, details)`, `src/work-trigger/declaration.mjs:159-165`) — the scope that
// matched no form and the forms that are admitted with an example of each, the source given and
// every source the vocabulary declares, the level given and the levels that exist, the cadence the
// grammar refused. A failure reporting only `{ code, member, message }` leaves an unattended
// caller to parse prose for the one thing it needs, which is exactly what reporting BY CODE exists
// to avoid. The four keys the failure states in its own right are skipped, and `stack` with them.
const FAILURE_OWN_KEYS = new Set(["code", "memberId", "name", "message", "stack"]);

function refusalDetails(error) {
  return Object.fromEntries(Object.entries(error).filter(([key]) => !FAILURE_OWN_KEYS.has(key)));
}

// Deferred by design: `command-core` imports this module to register the command, so a static
// import back into the registry would close the TDZ ring (TECH_DEBT item 26, and 62/ADR-013 §2's
// measurement that a LEAF closes it exactly as well as a face does).
async function deferredRegistry() {
  return await import("../command-core.mjs");
}

/**
 * Read `--signal`'s payload. An invocation this command cannot read AS AN INVOCATION is its own
 * machinery failing, never a refusal about the declaration, so it is a coded error naming what it
 * could not read rather than an empty answer.
 */
function parseSignalOption(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw commandError(
      `"work trigger" could not read --signal as JSON: ${error.message}`,
      TRIGGER_SIGNAL_UNREADABLE,
      400,
    );
  }
}

// --- the projection ---------------------------------------------------------
// `loopInputOf` and `argvFor` are the leaf's (`src/loop-argv.mjs`), imported above. The "one
// object, two renderings" discipline they carry is unchanged by the move: the argv is still
// derived FROM the loop input rather than assembled beside it.
function resolvedRow(trigger, route, scope, level) {
  const row = { trigger: identity(trigger), scope, level };
  return freeze({ ...row, argv: argvFor(route, loopInputOf(row)) });
}

// The ONE identity key. It names the declaring member and the source it was declared under, and
// carries no verdict: an anonymous resolved row cannot answer the `--json` claim that each
// declared trigger is listed with its resolved argv, and a row that named the id without the
// source could not be read back to the vocabulary it came from.
function identity(trigger) {
  return freeze({ id: trigger.id, source: trigger.source });
}

// A REFUSAL ANSWERS TO NO `scope`, NO `level` AND NO `argv`. 63/01 re-keys a refused `level` to
// `requestedLevel` and 63/04 re-keys a refused `scope` to `requestedScope`, for one reason: a
// caller reading only the answer keys finds nothing on a refusal and cannot mistake it for a run.
// This face keeps that idiom for its own refusals and carries every other key of a leaf's refusal
// through untouched.
function refusedRow(trigger, payload) {
  return freeze({ ...(trigger === null ? {} : { trigger: identity(trigger) }), ...payload });
}

function scopeRefusal(decision) {
  const { scope, ...rest } = decision;
  return { ...rest, ...(typeof scope === "string" ? { requestedScope: scope } : { requestedScope: null }) };
}

// The leaf's refusal, carried through with its own `triggerId` dropped in favour of this face's
// one identity key. Nothing else is touched: the code, the failing halves, the gate's own reason
// and the readings that failed are the gate's words and stay them.
function levelRefusal(decision) {
  const { triggerId: _triggerId, ...rest } = decision;
  return rest;
}

// --- the gate readings ------------------------------------------------------
// The pair `src/commands/loop.mjs` gathers when it fires, obtained HERE at the command boundary
// through the registry and handed to the leaf (53/ADR-007's rule). The doctor's answer carries
// the score under `loopReady`; the groundedness command's whole answer IS the reading, which is
// the shape the gate reads them under.
const GATE_READINGS = freeze([
  freeze({ fact: "loopReady", command: DOCTOR_COMMAND_ID, input: freeze({}), read: (answer) => answer?.loopReady }),
  freeze({ fact: "groundedness", command: GROUNDEDNESS_COMMAND_ID, input: freeze({}), read: (answer) => answer }),
]);

// IS THIS RUNG GATED AT ALL? Asked of the gate rather than of a rung spelled out here (63/01's
// probe, adopted): put the level to the gate with no facts, and a rung that needs none answers
// admitted while a gated one refuses. That is why this file contains no level literal — including
// the one an `if (level === the top rung)` branch would have needed — and why it computes no
// score, compares no threshold and reads no component verdict.
function needsGateReadings(trigger) {
  const declared = resolveLoopLevel(trigger?.level);
  if (declared.admitted !== true) return false;
  return resolveLoopLevelGate(declared.level, {}).admitted !== true;
}

async function gatherGateReadings(resolveCommand, invokeCommand, ctx) {
  const readings = [];
  const facts = {};
  for (const reading of GATE_READINGS) {
    if (typeof resolveCommand !== "function" || resolveCommand(reading.command) == null
        || typeof invokeCommand !== "function") {
      return {
        failure: freeze({
          code: TRIGGER_GATE_READING_UNREACHABLE,
          fact: reading.fact,
          command: reading.command,
          message: `No registered command answers for ${reading.command}, so the ${reading.fact} gate reading could not be obtained.`,
        }),
      };
    }
    let answer;
    try {
      answer = await invokeCommand(reading.command, reading.input, ctx);
    } catch (error) {
      return {
        failure: freeze({
          code: TRIGGER_GATE_READING_FAILED,
          fact: reading.fact,
          command: reading.command,
          message: `Obtaining the ${reading.fact} gate reading from ${reading.command} raised: ${error?.message ?? String(error)}`,
        }),
      };
    }
    // HANDED THROUGH EXACTLY AS IT CAME BACK. No `??`, no empty stand-in and no re-scoring: an
    // answered-but-unusable reading must reach the leaf as the object the registry returned, so
    // the leaf's own precondition names which reading it could not read — at exit 0, because a
    // resolution WAS produced and its content is a refusal.
    const value = reading.read(answer);
    facts[reading.fact] = value;
    // `present` is the coded discriminator that survives JSON, which has no `undefined`: the
    // reading key is absent from the report exactly when the answer carried no reading, so
    // "the registry said nothing readable" never renders as "the registry returned null".
    const present = value !== undefined && value !== null;
    readings.push(freeze({
      fact: reading.fact,
      command: reading.command,
      answered: true,
      present,
      ...(present ? { reading: value } : {}),
    }));
  }
  return { facts: freeze(facts), readings: freeze(readings) };
}

// --- resolving one trigger --------------------------------------------------
function resolveOne(trigger, scopeValue, route, facts) {
  // ONE — the scope, decided at this fire by the same function `work:loop` decides it with. A
  // story-shaped ref is a coded refusal here exactly as it is there (53/ADR-003), never a silent
  // widening to the driver it belongs to.
  const scope = decideLoopScope(scopeValue);
  if (scope.admitted !== true) return { refused: refusedRow(trigger, scopeRefusal(scope)) };

  // TWO — the level, put to the one gate home over the facts handed in, at this fire.
  const level = resolveTriggerLevel(trigger, facts);
  if (level.resolved !== true) return { refused: refusedRow(trigger, levelRefusal(level)) };

  return { resolved: resolvedRow(trigger, route, scope.scope, level.level) };
}

// --- the answer -------------------------------------------------------------
function sourceRows(considered, resolved, refused) {
  return freeze(TRIGGER_SOURCES.map((source) => freeze({
    source,
    declared: list(considered.filter((trigger) => trigger.source === source).map((trigger) => trigger.id)),
    resolved: list(resolved.filter((row) => row.trigger.source === source).map((row) => row.trigger.id)),
    refused: list(refused
      .filter((row) => row.trigger?.source === source)
      .map((row) => freeze({ id: row.trigger.id, code: row.code }))),
  })));
}

// A GAP IS NAMED, NEVER COUNTED. "3 of 4 sources resolve" tells a reader deciding what to go and
// fix nothing at all, and a stored figure goes stale on the next edit to the very file this run
// reads. Each entry below names the source, and where triggers stand in the way it names each of
// them with its own code.
//
// Gaps are a reading of the WHOLE declaration, so a run narrowed to one trigger or matched to one
// signal states none: reporting "no declared trigger names source ci-signal" because the caller
// asked about a cron trigger would be a gap the declaration does not have.
function gapsFor(rows) {
  const gaps = [];
  for (const row of rows) {
    if (row.declared.length === 0) {
      gaps.push(freeze({
        code: TRIGGER_SOURCE_UNDECLARED_GAP,
        source: row.source,
        message: `No declared trigger names source ${row.source}.`,
      }));
      continue;
    }
    if (row.resolved.length === 0) {
      gaps.push(freeze({
        code: TRIGGER_SOURCE_UNRESOLVED_GAP,
        source: row.source,
        triggers: row.refused,
        message: `No trigger declared under ${row.source} resolves: ${row.refused.map((entry) => `${entry.id} (${entry.code})`).join(", ")}.`,
      }));
    }
  }
  return freeze(gaps);
}

function headlineFor(resolved, refused, declared, declarationPath) {
  const resolvedIds = list(resolved.map((row) => row.trigger.id));
  const refusedIds = list(refused.map((row) => (row.trigger === undefined ? row.code : row.trigger.id)));
  if (resolvedIds.length > 0) {
    const tail = refusedIds.length === 0 ? "" : `; refused ${refusedIds.join(", ")}`;
    return freeze({ summary: `resolved ${resolvedIds.join(", ")}${tail}`, resolved: resolvedIds, refused: refusedIds });
  }
  if (declared.length === 0) {
    return freeze({
      summary: `the declaration at ${declarationPath} declares no trigger`,
      resolved: resolvedIds,
      refused: refusedIds,
    });
  }
  const named = refused
    .map((row) => `${row.trigger === undefined ? "(no trigger)" : row.trigger.id} (${row.code})`)
    .join(", ");
  return freeze({
    summary: `no declared trigger resolves — ${named}`,
    resolved: resolvedIds,
    refused: refusedIds,
  });
}

function report(parts) {
  // The failure is stated FIRST, before anything else, so a caller reading the machine face
  // top-down learns that nothing was armed before it reads a single trigger.
  return freeze({
    ...(parts.failure === null ? {} : { failure: parts.failure }),
    declaration: parts.declaration,
    preflight: parts.preflight,
    gate: parts.gate,
    considered: parts.considered,
    resolved: parts.resolved,
    refused: parts.refused,
    sources: parts.sources,
    gaps: parts.gaps,
    headline: parts.headline,
  });
}

const PREFLIGHT = freeze({
  resolvedFor: "this-fire",
  gatedAgainAt: LOOP_COMMAND_ID,
  isAdmission: false,
  note: `This answer is a pre-flight, not an admission: ${LOOP_COMMAND_ID} resolves the level gate again when it fires, and nothing in a resolution here lets it skip that.`,
});

const NO_GATE = freeze({ consulted: false, readings: freeze([]), reason: "no considered trigger asks for a level the gate governs" });

function emptyAnswer(declaration, failure, considered = []) {
  const rows = sourceRows(considered, [], []);
  return report({
    failure,
    declaration,
    preflight: PREFLIGHT,
    gate: NO_GATE,
    considered: list(considered.map((trigger) => trigger.id)),
    resolved: freeze([]),
    refused: freeze([]),
    sources: rows,
    gaps: freeze([]),
    headline: freeze({
      summary: failure === null
        ? `the declaration at ${declaration.path} declares no trigger`
        : `nothing was armed: ${failure.message}`,
      resolved: freeze([]),
      refused: freeze([]),
    }),
  });
}

/**
 * Resolve this workspace's declared triggers into `work:loop` inputs and the argv that carry
 * them. Reads the installed declaration, obtains the two gate readings through the registry when
 * a considered trigger asks for a level the gate governs, and returns one object both faces
 * render. Writes nothing, starts nothing and schedules nothing.
 *
 * @param {{ trigger?: string, signal?: object }} input
 * @param {{ workspace: object, trigger?: object }} ctx
 * @returns {Promise<Readonly<object>>}
 */
export async function buildTriggerReport(input = {}, ctx = {}) {
  const workspace = ctx.workspace;
  const deps = ctx.trigger ?? {};
  const declarationPath = triggerDeclarationPath(workspace.projectRoot);

  // ONE — the declaration. Missing, unparseable or refusing to compile are all "nothing is
  // armed", so the caller must not proceed as though something were: a failure, stated first,
  // at a non-zero exit.
  let declared;
  let version = null;
  try {
    // Two seams, two stages, and they are not interchangeable: `declaration` hands in the DATA
    // and still pays for the compiler (so a member that will not compile refuses the whole set
    // here), while `compiled` hands in a set that has already been compiled elsewhere. The second
    // is what lets a caller — and a control — put a trigger to this face whose scope the loop's
    // own forms do not admit, which the compiler by design never emits.
    const compiled = supplied(deps, "compiled")
      ? deps.compiled
      : compileTriggerDeclaration(
        supplied(deps, "declaration") ? deps.declaration : await readTriggerDeclaration(workspace.projectRoot),
      );
    declared = compiled.triggers;
    version = compiled.version;
  } catch (error) {
    if (!(error instanceof TriggerDeclarationError)) throw error;
    return emptyAnswer(
      freeze({ path: declarationPath, version: null, declared: freeze([]) }),
      freeze({
        code: error.code,
        ...(error.memberId === null ? {} : { member: error.memberId }),
        ...refusalDetails(error),
        path: declarationPath,
        message: error.message,
      }),
    );
  }

  const declarationFacts = freeze({
    path: declarationPath,
    version,
    declared: list(declared.map((trigger) => trigger.id)),
  });

  // TWO — the registry. The loop's own route is read from its registration rather than spelled
  // here, so the argv's leading tokens ARE the command the registry answers for.
  const registry = supplied(deps, "registry") ? deps.registry : await deferredRegistry();
  const resolveCommand = supplied(deps, "resolveCommand") ? deps.resolveCommand : registry?.getCommand;
  const invokeCommand = supplied(deps, "invoke") ? deps.invoke : registry?.invoke;
  const loopCommand = typeof resolveCommand === "function" ? resolveCommand(LOOP_COMMAND_ID) : undefined;
  const route = loopCommand?.cli?.route;
  if (!Array.isArray(route) || route.length === 0) {
    return emptyAnswer(
      declarationFacts,
      freeze({
        code: TRIGGER_LOOP_UNREGISTERED,
        command: LOOP_COMMAND_ID,
        message: `No registered command answers for ${LOOP_COMMAND_ID}, so no argv could be composed for it.`,
      }),
      declared,
    );
  }

  // THREE — which triggers this run considers, and the refusals that arise before any of them is
  // resolved. A refusal is a positive object with a code: an empty answer handed to an unattended
  // caller is indistinguishable from "nothing to do today".
  const refused = [];
  let considered = declared;
  let narrowed = false;

  if (typeof input.trigger === "string") {
    narrowed = true;
    considered = declared.filter((trigger) => trigger.id === input.trigger);
    if (considered.length === 0) {
      refused.push(refusedRow(null, freeze({
        code: TRIGGER_UNKNOWN,
        given: input.trigger,
        declared: declarationFacts.declared,
        reason: `no declared trigger carries id "${input.trigger}"; the ids that are declared: ${declarationFacts.declared.join(", ") || "(none)"}.`,
      })));
    }
  }

  let pending = considered.map((trigger) => ({ trigger, scope: trigger.scope }));

  if (supplied(input, "signal")) {
    narrowed = true;
    const signal = input.signal;
    if (signal === null || typeof signal !== "object" || Array.isArray(signal)) {
      return emptyAnswer(
        declarationFacts,
        freeze({
          code: TRIGGER_SIGNAL_UNREADABLE,
          message: `"work trigger" could not read the signal in this invocation: a signal is an object naming a source, and this one is ${signal === null ? "null" : Array.isArray(signal) ? "an array" : `a ${typeof signal}`}.`,
        }),
        declared,
      );
    }
    pending = [];
    const source = signal.source;
    if (typeof source !== "string" || !TRIGGER_SOURCES.includes(source)) {
      // NAMES WHAT EXISTS, not only what was wrong. The vocabulary is the DECLARATION's four
      // members, never the three this process resolves signals for: reporting a declared source
      // as unknown would send the caller to fix a spelling that is correct.
      refused.push(refusedRow(null, freeze({
        code: TRIGGER_SOURCE_UNKNOWN,
        given: typeof source === "string" ? source : null,
        sources: list(TRIGGER_SOURCES),
        reason: `the signal names no declared source; the sources the vocabulary declares: ${TRIGGER_SOURCES.join(", ")}.`,
      })));
    } else if (!SIGNAL_SOURCES.includes(source)) {
      // A DECLARED source with no resolver on this side of the seam — the mesh assignment, whose
      // scope is resolved by the worker that already owns the dispatch (ADR-006). Declared but
      // not answerable here is a third answer, and it is not "unknown".
      refused.push(refusedRow(null, freeze({
        code: TRIGGER_SOURCE_UNRESOLVABLE_HERE,
        given: source,
        sources: list(TRIGGER_SOURCES),
        resolvesHere: list(SIGNAL_SOURCES),
        reason: `source ${source} is declared, but its signal is not resolved by this command; the sources resolved here: ${SIGNAL_SOURCES.join(", ")}.`,
      })));
    } else {
      const answer = resolveTriggerSignal(signal);
      if (!isResolvedSignal(answer)) {
        refused.push(refusedRow(null, answer));
      } else {
        const matched = considered.filter((trigger) => trigger.source === answer.source);
        if (matched.length === 0) {
          refused.push(refusedRow(null, freeze({
            code: TRIGGER_SIGNAL_UNMATCHED,
            given: answer.source,
            declared: declarationFacts.declared,
            requestedScope: answer.scope,
            reason: `the signal resolved a scope under source ${answer.source}, and no considered trigger is declared under it.`,
          })));
        } else {
          // THE SIGNAL ANSWERS WHICH SCOPE; THE DECLARATION ANSWERS AT WHICH LEVEL. A level a
          // signal carried would be an admission arriving from outside the reviewed file, which
          // is the whole thing ADR-004 exists to refuse.
          pending = matched.map((trigger) => ({ trigger, scope: answer.scope }));
        }
      }
    }
  }

  // FOUR — the gate readings, obtained ONCE for the run and only when a considered trigger asks
  // for a level the gate governs, so a declaration that asks for none never touches the registry.
  let gate = NO_GATE;
  let facts;
  if (pending.some((entry) => needsGateReadings(entry.trigger))) {
    const gathered = await gatherGateReadings(resolveCommand, invokeCommand, ctx);
    if (gathered.failure !== undefined) {
      // NOT REACHING THE REGISTRY IS THIS COMMAND'S OWN FAILURE. No resolution can be produced,
      // so none is: every considered trigger is refused BY NAME, naming the reading and the
      // command nothing answered for, and the run exits non-zero.
      const unobtained = considered.map((trigger) => refusedRow(trigger, freeze({
        code: TRIGGER_GATE_READING_UNOBTAINED,
        fact: gathered.failure.fact,
        command: gathered.failure.command,
        cause: gathered.failure.code,
        reason: `no level was resolved for this trigger: the ${gathered.failure.fact} reading could not be obtained from ${gathered.failure.command}.`,
      })));
      const rows = sourceRows(considered, [], unobtained);
      return report({
        failure: gathered.failure,
        declaration: declarationFacts,
        preflight: PREFLIGHT,
        gate: freeze({
          consulted: true,
          readings: freeze([]),
          reason: `the ${gathered.failure.fact} reading could not be obtained from ${gathered.failure.command}`,
        }),
        considered: list(considered.map((trigger) => trigger.id)),
        resolved: freeze([]),
        refused: freeze([...refused, ...unobtained]),
        sources: rows,
        gaps: narrowed ? freeze([]) : gapsFor(rows),
        headline: freeze({
          summary: `nothing was armed: ${gathered.failure.message}`,
          resolved: freeze([]),
          refused: list(unobtained.map((row) => row.trigger.id)),
        }),
      });
    }
    gate = freeze({ consulted: true, readings: gathered.readings });
    facts = gathered.facts;
  }

  // FIVE — every considered trigger is decided against the SAME two readings, and each appears
  // exactly once: the resolved and the refused are two halves of one accounting.
  const resolved = [];
  for (const entry of pending) {
    const answer = resolveOne(entry.trigger, entry.scope, route, facts);
    if (answer.resolved !== undefined) resolved.push(answer.resolved);
    else refused.push(answer.refused);
  }

  const rows = sourceRows(considered, resolved, refused);
  return report({
    failure: null,
    declaration: declarationFacts,
    preflight: PREFLIGHT,
    gate,
    considered: list(considered.map((trigger) => trigger.id)),
    resolved: freeze(resolved),
    refused: freeze(refused),
    sources: rows,
    gaps: narrowed ? freeze([]) : gapsFor(rows),
    headline: headlineFor(resolved, refused, declarationFacts.declared, declarationPath),
  });
}

// --- the human face ---------------------------------------------------------
// TWO RENDERINGS OF ONE OBJECT. Every figure printed below is read off the result the machine
// face emits — no line is derived a second time, because a human face that assembled a
// well-formed command line independently of the object `--json` carries reads correctly on the
// day it is written and disagrees about the level on the first edit to either side.
// WHAT A CODED ANSWER NAMES, in one place. A refusal and a failure are different outcomes with
// different exit codes, but a caller reads the same particulars off both — the scope and the forms
// that are admitted, the source given and the sources that exist, the failing half and the reading
// that failed. Rendering them twice is two renderings of one vocabulary, and the second drifts.
function particulars(row) {
  const lines = [];
  if (row.requestedScope !== undefined) lines.push(`requested scope: ${JSON.stringify(row.requestedScope)}`);
  if (row.scope !== undefined) lines.push(`scope: ${JSON.stringify(row.scope)}`);
  if (row.requestedLevel !== undefined) lines.push(`requested level: ${JSON.stringify(row.requestedLevel)}`);
  if (row.level !== undefined) lines.push(`level: ${JSON.stringify(row.level)}`);
  if (row.failingHalves !== undefined) lines.push(`failing half/halves: ${row.failingHalves.join(", ")}`);
  if (row.score !== undefined) lines.push(`reading loopReady: ${JSON.stringify(row.score)}`);
  if (row.groundedness !== undefined) lines.push(`reading groundedness: ${JSON.stringify(row.groundedness)}`);
  if (row.missing !== undefined) lines.push(`readings not handed in: ${row.missing.join(", ")}`);
  if (row.admits !== undefined) lines.push(`admitted scope forms: ${row.admits.map((form) => `${form.id} (e.g. ${form.example})`).join(", ")}`);
  if (row.driver !== undefined) lines.push(`the driver that item belongs to: ${row.driver}`);
  if (row.declared !== undefined) lines.push(`declared trigger ids: ${row.declared.join(", ") || "(none)"}`);
  if (row.source !== undefined) lines.push(`source: ${JSON.stringify(row.source)}`);
  if (row.sources !== undefined) lines.push(`declared sources: ${row.sources.join(", ")}`);
  if (row.levels !== undefined) lines.push(`the levels that exist: ${row.levels.join(", ")}`);
  if (row.cadence !== undefined) lines.push(`cadence: ${JSON.stringify(row.cadence)}`);
  if (row.resolvesHere !== undefined) lines.push(`sources resolved here: ${row.resolvesHere.join(", ")}`);
  if (row.unresolved !== undefined) lines.push(`could not resolve: ${row.unresolved}`);
  return lines;
}

function render(result) {
  const lines = [];
  if (result.failure !== undefined) {
    lines.push(`${result.failure.code}: ${result.failure.message}`);
    if (result.failure.member !== undefined) lines.push(`  member: ${result.failure.member}`);
    if (result.failure.command !== undefined) lines.push(`  command: ${result.failure.command}`);
    lines.push(...particulars(result.failure).map((line) => `  ${line}`));
  }
  lines.push(`Declaration: ${result.declaration.path} (version ${JSON.stringify(result.declaration.version)}) — declares ${result.declaration.declared.join(", ") || "no trigger"}.`);
  lines.push(`Pre-flight: ${result.preflight.note}`);
  if (result.gate.consulted === true) {
    for (const reading of result.gate.readings) {
      lines.push(`Gate reading ${reading.fact} from ${reading.command}: ${reading.present === true ? JSON.stringify(reading.reading) : "the answer carried no such reading"}`);
    }
    if (result.gate.readings.length === 0) lines.push(`Gate readings: ${result.gate.reason}.`);
  } else {
    lines.push(`Gate readings: not consulted — ${result.gate.reason}.`);
  }
  for (const row of result.resolved) {
    lines.push(`resolved ${row.trigger.id} [${row.trigger.source}]: scope ${row.scope} at ${row.level} — argv: ${row.argv.join(" ")}`);
  }
  for (const row of result.refused) {
    const who = row.trigger === undefined ? "(no trigger)" : `${row.trigger.id} [${row.trigger.source}]`;
    lines.push(`refused ${who}: ${row.code} — ${row.reason ?? row.message ?? "refused"}`);
    lines.push(...particulars(row).map((line) => `  ${line}`));
  }
  for (const row of result.sources) {
    lines.push(`source ${row.source}: declared ${row.declared.join(", ") || "(none)"}; resolved ${row.resolved.join(", ") || "(none)"}`);
  }
  for (const gap of result.gaps) lines.push(`gap ${gap.code}: ${gap.message}`);
  lines.push(`Trigger: ${result.headline.summary}.`);
  lines.push("This command resolves; running the argv above is the caller's.");
  return lines.join("\n");
}

export const triggerCommand = {
  id: "work:trigger",
  input: {
    type: "object",
    properties: {
      trigger: { type: "string" },
      signal: { type: "object" },
    },
    additionalProperties: false,
  },
  run: buildTriggerReport,
  cli: {
    route: ["work", "trigger"],
    spec: {
      usage: "aof work trigger [trigger] [--signal JSON] [--json]",
      flags: {
        signal: { type: "string", description: "a JSON signal naming a source and what it points at" },
      },
    },
    argv(positionals, options) {
      if (positionals.length > 1) {
        throw commandError(`"work trigger" accepts at most one trigger id (got "${positionals.slice(1).join(" ")}").`, "invalid-input", 400);
      }
      return {
        ...(positionals[0] ? { trigger: positionals[0] } : {}),
        ...(options.signal != null ? { signal: parseSignalOption(options.signal) } : {}),
      };
    },
    render,
    json: (result) => result,
    exit: (result) => (result.failure == null ? 0 : 1),
  },
};
