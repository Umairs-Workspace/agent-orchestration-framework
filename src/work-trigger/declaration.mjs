// The trigger declaration and its ONE compiler (milestone 63 / ADR-002).
//
// The declaration is data. A trigger vocabulary spread across a config key, a scheduler entry and
// a call site is one nobody reviews, because there is no artifact to review; the first time anyone
// assembles it is after an unattended run did something surprising. This module is the only place
// that knows how a declared member becomes a runtime-shaped trigger, and `.aof/triggers.jsonc` is
// the one file a reviewer reads in a diff.
//
// THE COMPILER IS HANDED ITS DECLARATION, and that is the difference between a compiler and a
// loader (`compileFrozenSet`'s shape, `src/frozen-set.mjs:129`). Declaration in, one whole answer
// or one coded refusal out; no disk read, no workspace, no clock. An implementation that reached
// for the installed file whenever it was asked to compile would be untestable against every case
// the shipped declaration does not happen to contain — which is every case that matters.
//
// A MEMBER THAT DOES NOT COMPILE REFUSES THE WHOLE SET (55/ADR-004 §4, carried by ADR-002 §2).
// Never a warning, never a `skipped` list, never a partially-compiled answer: a trigger set with
// one member silently dropped is worse than no trigger set, because it reports as armed. Members
// are therefore validated in FULL before anything is assembled, so where the bad member sits in
// the list cannot change the answer.
//
// TWO GRAMMARS ARE IMPORTED RATHER THAN AUTHORED HERE. The cadence is `parseCadence`'s
// (ADR-002 §3 — one additive FUNCTION export from the loop loader, no twelfth set), and the scope
// is `decideLoopScope`'s (ADR-007 §2 — TECH_DEBT item 49 measured what a fourth scope parser
// costs). What IS 63's own is the SOURCE vocabulary (ADR-002 §4): `EVENT_TRIGGERS` are scope
// ordinals in a containment relation, a source is where a signal came from, and merging the two
// axes would give the loop registry a vocabulary about the outside world.
import path from "node:path";
import { readFile } from "node:fs/promises";
import { readAssetText } from "../asset-base.mjs";
import { parseCadence } from "../work/loops.mjs";
import { LOOP_LEVELS, decideLoopScope } from "../work/loop.mjs";

export const TRIGGER_DECLARATION_RELPATH = ".aof/triggers.jsonc";
export const TRIGGER_DECLARATION_ASSET = "triggers.jsonc";

// ADR-002 §4 — 63's own closed axis, and the four members are SPEC §Scope's four sources: a cron
// cadence over a range, a mesh work-assignment, a PR/CI signal, and an inbound `aof:feedback`
// finding. Closed means closed: an ordinal (`per-item`), a cadence in the source field, a
// neighbour in the wrong case and a neighbour with whitespace are all refused rather than read as
// their nearest real member.
//
// THE CLOCK SOURCE IS `cron`, NOT `cadence`, AND THE NAME IS LOAD-BEARING. A source is where a
// signal came from — an external scheduler — while `cadence` is the loop registry's own FIELD
// name, and ADR-002 §4's invariant is that no trigger source vocabulary appears in that loader at
// all. Spelling this member `cadence` would have made that invariant unassertable: the token
// occurs nineteen times in `src/work/loops.mjs` for an unrelated reason, so FF-6302's sweep could
// never tell a leaked source from the field it was separated from.
export const TRIGGER_SOURCES = Object.freeze([
  "cron",
  "mesh-assignment",
  "ci-signal",
  "feedback-finding",
]);

// A member may name the loop-registry entry it wakes in its `wakes` field (ADR-002 §3a). A loop
// record's own node id already READS `loop:<id>`, so the declared pointer and the registry id are
// the same token: nothing here re-spells a scheme, and no pointer grammar is authored.

// Every state a trigger/loop cadence pair can be in. "Not comparable" and "not in contradiction"
// are DIFFERENT answers: one is a pair that was checked and agreed, the other a pair nobody could
// check, and an implementation returning the same value for both hides every incomparable pair
// behind a clean result.
export const TRIGGER_PAIRING_STATES = Object.freeze(["compared", "not-compared", "contradiction"]);

// …and every reason a pair went uncompared, because "not compared" collapses in exactly the same
// way one level down if its reasons are allowed to share a string. Each of these is a DIFFERENT
// fact about the world, and a reader (63/05's face) renders them as sentences:
//
//   registry-not-supplied        nobody asked the registry — the pointer was never looked up
//   loop-not-declared            the registry WAS asked, and holds no entry with that id
//   trigger-declares-no-loop     the trigger points at nothing
//   trigger-declares-no-cadence  the trigger is silent
//   loop-declares-no-cadence     the loop record is silent
//   loop-cadence-invalid         the loop declared a cadence the grammar does not admit
//   not-comparable               both declared, but a duration and an ordinal do not compare
//
// The first two are the pair this vocabulary exists to keep apart. Answering "no entry declares
// that loop" for a question nobody asked is this feature's own indictment — "one is a pair that
// was checked and agreed, the other a pair nobody could check" — raised one level up.
export const TRIGGER_PAIRING_REASONS = Object.freeze([
  "registry-not-supplied",
  "loop-not-declared",
  "trigger-declares-no-loop",
  "trigger-declares-no-cadence",
  "loop-declares-no-cadence",
  "loop-cadence-invalid",
  "not-comparable",
]);

export class TriggerDeclarationError extends Error {
  constructor(code, memberId, message, details = {}) {
    super(message);
    this.name = "TriggerDeclarationError";
    this.code = code;
    this.memberId = memberId ?? null;
    Object.assign(this, details);
  }
}

// --- reading the declaration ------------------------------------------------
// The same one-line JSONC affordance `src/frozen-set.mjs` gives its declaration: a single leading
// `//` banner so the file can say what it is to the reviewer opening it.
function parseDeclaration(text) {
  return JSON.parse(String(text).replace(/^\s*\/\/[^\r\n]*(?:\r?\n|$)/, ""));
}

export function bundledTriggerDeclaration() {
  return parseDeclaration(readAssetText("bundle", TRIGGER_DECLARATION_ASSET));
}

export function triggerDeclarationPath(targetDir) {
  return path.join(targetDir, ...TRIGGER_DECLARATION_RELPATH.split("/"));
}

/**
 * Read a workspace's INSTALLED declaration — the copy `aof work update` wrote, never the bundled
 * source standing in for it. A missing or unparseable file is a coded refusal naming the path:
 * ADR-007 §5's rule that an empty answer from an unattended caller is indistinguishable from
 * "nothing to do", which is how a wake path dies silently.
 */
export async function readTriggerDeclaration(targetDir) {
  const declarationPath = triggerDeclarationPath(targetDir);
  let text;
  try {
    text = await readFile(declarationPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new TriggerDeclarationError(
        "trigger-declaration-missing",
        null,
        `Refusing trigger compilation: ${declarationPath} is not installed. Run \`aof work update\`.`,
        { path: declarationPath },
      );
    }
    throw error;
  }
  try {
    return parseDeclaration(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TriggerDeclarationError(
        "trigger-declaration-unparseable",
        null,
        `Refusing trigger compilation: ${declarationPath} is not parseable JSON.`,
        { path: declarationPath },
      );
    }
    throw error;
  }
}

// --- refusals ---------------------------------------------------------------
// A member with no usable id is located by its POSITION, because a null in the members array has
// no id to name it by and a refusal that named nothing would be no refusal at all.
function memberLabel(member, index) {
  return typeof member?.id === "string" && member.id.length > 0 ? member.id : `#${index}`;
}

function refuse(member, index, message, code = "trigger-member-invalid", details = {}) {
  const label = memberLabel(member, index);
  throw new TriggerDeclarationError(code, label, `Trigger member "${label}" refused: ${message}`, {
    index,
    ...details,
  });
}

function refuseDeclaration(message) {
  throw new TriggerDeclarationError(
    "trigger-declaration-invalid",
    null,
    `Refusing trigger compilation: ${message}`,
  );
}

// --- member validation ------------------------------------------------------
function validateMember(member, index, ids) {
  if (member == null || typeof member !== "object" || Array.isArray(member)) {
    refuse(member, index, "the member must be an object.");
  }
  if (typeof member.id !== "string" || member.id.length === 0) refuse(member, index, "id is required.");
  if (ids.has(member.id)) {
    refuse(member, index, `id "${member.id}" is declared twice.`, "trigger-member-duplicate-id", {
      duplicateId: member.id,
    });
  }
  ids.add(member.id);

  if (typeof member.protects !== "string" || member.protects.trim().length === 0) {
    refuse(member, index, "protects is required — a declaration says what it is for.");
  }

  if (typeof member.source !== "string" || member.source.length === 0) {
    refuse(member, index, "source is required.", "trigger-source-missing");
  }
  // The near-misses are refused rather than repaired: no trim, no case fold. A source read as its
  // neighbour is a declaration nobody reviewed saying something its author did not write.
  if (!TRIGGER_SOURCES.includes(member.source)) {
    refuse(
      member,
      index,
      `unknown source "${member.source}"; the sources that exist: ${TRIGGER_SOURCES.join(", ")}.`,
      "trigger-source-unknown",
      { source: member.source, sources: [...TRIGGER_SOURCES] },
    );
  }

  if (member.scope === undefined || member.scope === null) refuse(member, index, "scope is required.");
  // ADR-007 §2 — the scope grammar is `decideLoopScope`'s and this module authors none. A
  // story-shaped ref (`63/01`) and a range with no end (`63-`) are refused there, by the same
  // decision `work:loop` already makes, rather than by a second parser that could disagree.
  const scope = decideLoopScope(member.scope);
  if (scope.admitted !== true) {
    refuse(
      member,
      index,
      `scope ${JSON.stringify(member.scope)} matches no admitted loop scope form.`,
      "trigger-scope-unsupported",
      { scope: typeof member.scope === "string" ? member.scope : null, admits: scope.admits ?? null },
    );
  }

  if (typeof member.level !== "string" || member.level.length === 0) {
    refuse(member, index, "level is required.", "trigger-level-missing");
  }
  if (!LOOP_LEVELS.includes(member.level)) {
    refuse(
      member,
      index,
      `unknown level "${member.level}"; the levels that exist: ${LOOP_LEVELS.join(", ")}.`,
      "trigger-level-unknown",
      { level: member.level, levels: [...LOOP_LEVELS] },
    );
  }

  // ABSENCE IS NOT A VALUE. A member declaring no cadence carries none; a member declaring the
  // sentinel carries the sentinel. Filling the first in with the second would make every
  // uncadenced trigger comparable against the loop it points at — a comparison nobody declared,
  // reading as agreement rather than as silence.
  let cadence = null;
  if (member.cadence !== undefined) {
    cadence = parseCadence(member.cadence);
    if (cadence === null) {
      refuse(
        member,
        index,
        `cadence ${JSON.stringify(member.cadence)} is not one the loop registry admits.`,
        "trigger-cadence-invalid",
        { cadence: typeof member.cadence === "string" ? member.cadence : null },
      );
    }
  }

  if (member.wakes !== undefined && (typeof member.wakes !== "string" || member.wakes.length === 0)) {
    refuse(member, index, "wakes must be the id of a loop-registry entry.");
  }

  return { member, index, scope: scope.scope, cadence };
}

// --- the cadence comparison (ADR-002 §3a, ADR-010 §8) -----------------------
// REPORTED, NEVER REFUSED. ADR-002 §2's refusal rule governs a member that does not COMPILE. A
// cadence contradiction is a semantic disagreement between two WELL-FORMED declarations, and
// refusing the set because a loop record disagrees would let the registry's content silently
// disarm a trigger.
function declaredCadenceOf(record) {
  const field = record?.fields?.cadence;
  const raw = field === undefined || field === null
    ? record?.cadence
    : (Array.isArray(field) ? field[0]?.raw : field.raw);
  return typeof raw === "string" ? raw : null;
}

function pairing(trigger, extra) {
  return Object.freeze({
    triggerId: trigger.id,
    loop: trigger.wakes ?? null,
    triggerCadence: trigger.cadence?.raw ?? null,
    ...extra,
  });
}

const notCompared = (trigger, reason, loopCadence = null) =>
  pairing(trigger, { state: "not-compared", reason, loopCadence, faster: null });

// The comparison is on the OPERANDS the parsed cadence already carries, never on the strings:
// sixty minutes and one hour are one duration spelled two ways. A duration and an ordinal are not
// comparable at all — neither is convertible into the other, and inventing a week for a milestone
// would make every pair comparable and every comparison fiction.
function faster(left, right) {
  if (left.kind === "periodic" && right.kind === "periodic") {
    return left.ms === right.ms ? "neither" : (left.ms < right.ms ? "trigger" : "loop");
  }
  if (left.kind === "event" && right.kind === "event") {
    // Ranked by CONTAINMENT, not by list position — and two of them share a rank, so a run-start
    // and a phase are the same rung and neither is faster than the other.
    if (left.scopeRank === right.scopeRank) return "neither";
    return left.scopeRank < right.scopeRank ? "trigger" : "loop";
  }
  return null;
}

function pairTrigger(trigger, registry) {
  if (trigger.wakes == null) return notCompared(trigger, "trigger-declares-no-loop");

  // A QUESTION NOBODY ASKED IS NOT AN ANSWER. With no registry handed in, the pointer was never
  // looked up, and "no entry declares that loop" would assert a fact about a registry this call
  // never saw. The shipped declaration names four loops that ARE declared in `.aof/loops/`, so
  // that answer is not merely imprecise — it is false, and it is the pair this feature separates
  // ("one is a pair that was checked and agreed, the other a pair nobody could check").
  if (!registry.supplied) return notCompared(trigger, "registry-not-supplied");

  const entry = registry.byId.get(trigger.wakes);
  // The registry WAS asked and holds nothing under that id. A pointer resolving to nothing is not
  // a pair that agreed, and it is reported BY NAME.
  if (entry === undefined) return notCompared(trigger, "loop-not-declared");

  if (trigger.cadence == null) return notCompared(trigger, "trigger-declares-no-cadence", entry.raw);
  // Silence and a malformed value are likewise different facts: one is a record with no opinion,
  // the other a record whose cadence the loader itself refuses. Reporting them as one string
  // would file every broken registry entry under "had nothing to say".
  if (entry.raw === null) return notCompared(trigger, "loop-declares-no-cadence");
  if (entry.parsed === null) return notCompared(trigger, "loop-cadence-invalid", entry.raw);

  const which = faster(trigger.cadence, entry.parsed);
  if (which === null) return notCompared(trigger, "not-comparable", entry.raw);
  return pairing(trigger, {
    state: which === "trigger" ? "contradiction" : "compared",
    reason: null,
    loopCadence: entry.raw,
    faster: which,
  });
}

// --- the compiler -----------------------------------------------------------
/**
 * Compile a trigger declaration.
 *
 * @param {unknown} declaration the declaration itself — handed in, never read from disk
 * @param {{ loops?: Iterable<object> }} [options] the loop-registry entries to compare cadences
 *        against. Each entry may be a loaded loop node (`{ id, fields: { cadence } }`) or the
 *        plain `{ id, cadence }` shape; nothing else about a registry is read. OMITTING `loops`
 *        is NOT the same as passing an empty one: every pointer is then reported
 *        `registry-not-supplied` rather than as a loop the registry does not declare.
 * @returns {Readonly<{ version: unknown, triggers: readonly object[], accepted: readonly string[],
 *          pairings: readonly object[], contradictions: readonly object[] }>}
 * @throws {TriggerDeclarationError} one coded refusal — of the WHOLE declaration
 */
export function compileTriggerDeclaration(declaration, options = {}) {
  if (declaration == null || typeof declaration !== "object" || Array.isArray(declaration)) {
    refuseDeclaration("declaration must be an object.");
  }
  if (!Array.isArray(declaration.members)) {
    refuseDeclaration("members must be an array.");
  }

  // PASS ONE — every member is validated before any member is compiled, so a bad member in the
  // last position refuses exactly as one in the first does. The in-order validator that collects
  // good members as it goes is the plausible wrong implementation, and it passes a naive test.
  const ids = new Set();
  const validated = declaration.members.map((member, index) => validateMember(member, index, ids));

  // PASS TWO — nothing above can throw now, so the answer is assembled whole.
  const triggers = validated.map(({ member, scope, cadence }) => Object.freeze({
    id: member.id,
    protects: member.protects,
    source: member.source,
    scope,
    level: member.level,
    ...(member.wakes === undefined ? {} : { wakes: member.wakes }),
    // The cadence is `parseCadence`'s answer VERBATIM — the same object the loop loader puts on a
    // record's typed field, so the two readers cannot drift into two shapes for one string.
    ...(cadence === null ? {} : { cadence: Object.freeze(cadence) }),
  }));

  // WHETHER A REGISTRY WAS SUPPLIED IS ITSELF A FACT, captured here rather than inferred from an
  // empty map further down: an EMPTY registry was still asked and still answers "no such loop",
  // while an ABSENT one was never asked at all. The parsed cadence is kept BESIDE its raw, so a
  // record that declared a malformed cadence stays distinguishable from one that declared none.
  const supplied = options.loops !== undefined && options.loops !== null;
  const byId = new Map();
  for (const record of options.loops ?? []) {
    if (typeof record?.id !== "string" || record.id.length === 0) continue;
    const raw = declaredCadenceOf(record);
    byId.set(record.id, { raw, parsed: raw === null ? null : parseCadence(raw) });
  }

  const pairings = triggers.map((trigger) => pairTrigger(trigger, { supplied, byId }));

  return Object.freeze({
    version: declaration.version ?? null,
    triggers: Object.freeze(triggers),
    accepted: Object.freeze(triggers.map((trigger) => trigger.id)),
    pairings: Object.freeze(pairings),
    contradictions: Object.freeze(pairings.filter((entry) => entry.state === "contradiction")),
  });
}
