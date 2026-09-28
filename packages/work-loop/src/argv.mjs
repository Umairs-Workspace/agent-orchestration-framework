// THE LOOP'S ARGV, COMPOSED IN ONE PLACE — a zero-import leaf (126/02, ADR-005 §4).
//
// These four bindings lived inside `src/commands/trigger.mjs`, a REGISTERED COMMAND MODULE. The
// declarations producer (`mesh:status --declarations`) needs the same composer, and TECH_DEBT
// item 26 measures what importing one registered command module from another does: it closes the
// registry TDZ ring. `src/loop-bounds.mjs` is the precedent for the shape — 30 dependents, 0
// imports — and this leaf follows it: nothing here imports anything, so any caller may reach it
// without joining a cycle.
//
// THE ROUTE IS A PARAMETER, NOT A CONSTANT HERE, and that is 63/ADR-001's rule rather than a
// preference: `src/commands/trigger.mjs` reads `work:loop`'s own `cli.route` off its registration
// through a deferred dynamic import and refuses `trigger-loop-unregistered` when the registry
// answers for no such command, so the argv's leading tokens ARE the command the registry answers
// for. A leaf that spelled `["work","loop"]` itself would retire that reading and the control that
// asserts it.
//
// THE LEAF VALIDATES NOTHING. A scope the grammar refuses is composed verbatim: a check here would
// be a second scope grammar beside `decideLoopScope`, and `work:loop` refuses it at its own door
// anyway. Likewise no level vocabulary is consulted — `resolveLoopLevel` is where a refused level
// is answered.

const freeze = (value) => Object.freeze(value);

// The keys of `work:loop`'s input a caller fills. The projection is taken FROM the resolved row
// rather than assembled a second time, so the object the argv carries and the object the report
// states are provably one object.
export const LOOP_INPUT_KEYS = freeze(["scope", "level"]);

// The loop's own flags, each spelled ONCE and bound to a constant. They are EXPORTED because a
// claim nobody can read is a claim nothing holds: `acd-trigger-is-a-caller-not-a-coordinator`
// asserts every `--flag` token a caller composes is one `work:loop` DECLARES — in its
// `cli.spec.flags` as well as in its input — so renaming the loop's flag reds there rather than at
// three in the morning in a log nobody reads. A third token spelled here would be parsed as an
// unknown flag and refused at the loop's door.
export const LEVEL_FLAG = "--level";
export const RESUME_FLAG = "--resume";

export function loopInputOf(row) {
  const input = {};
  for (const key of LOOP_INPUT_KEYS) input[key] = row[key];
  return freeze(input);
}

// ONE OBJECT, TWO RENDERINGS. The argv is derived FROM the loop input rather than assembled beside
// it: two derivations of one object is two answers, and the second one drifts the first time
// either is edited — an operator's copied command line and their pipeline's parsed argv
// disagreeing about the level, which is exactly the failure a caller cannot see.
//
// Called with two arguments this composes exactly what it composed inside the trigger face, which
// is what makes that move a move and not a change. An ABSENT level emits neither the flag nor a
// value token, because `--level undefined` is a token the loop's parser would have to reject.
export function argvFor(route, input, options = {}) {
  const level = input?.level;
  return freeze([
    ...route,
    input?.scope,
    ...(level == null ? [] : [LEVEL_FLAG, level]),
    ...(options?.resume === true ? [RESUME_FLAG] : []),
  ]);
}
