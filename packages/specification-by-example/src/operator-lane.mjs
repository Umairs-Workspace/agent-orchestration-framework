// Application policy is supplied by core: the switch's one resolver and the profile's.
//
// work:doctor — milestone 193 / story 03: THE OPERATOR LANE (193/ADR-006 §5), its own check group,
// which core appends through the engine's `extensionGroups` seam right after the examples lane. It
// asks one question of the loaded workspace's config: is operator-aware discovery on with no
// operator profile declared, here or on the machine? A project that turned the switch on and said
// nothing about its operator has every domain treated as `new` — every fact researched, every
// question explained — and nothing would say why. The lane says it, once, and names the fix.
//
//   operator-profile-undeclared   the switch is on and the resolved profile is undeclared — ALWAYS
//                                 `warn`: nothing is refused for want of a profile (193/ADR-003 §9)
//
// ONCE, WHATEVER IS ASKED. The finding is anchored at the work directory, a stream-level fact the
// engine's scope filter always keeps and its dedupe reports once — never at an item, which would
// repeat it per story or hide it from a scope that names none.
//
// ONE SENTENCE, THREE MOUTHS. `operatorProfileWarnings(config)` is the function the doctor's group,
// `aof work update` and `aof work init-config --operator-aware on` all call (190/ADR-008 §5), so the
// three can never say it differently. It is a separate module from `doctor-lane.mjs` so the map's
// lane names no operator code, and it imports nothing: both resolvers arrive by injection, as the
// examples lane takes its gate (FF-13501).
export const OPERATOR_PROFILE_UNDECLARED = "operator-profile-undeclared";
export const OPERATOR_LANE_CODES = Object.freeze([OPERATOR_PROFILE_UNDECLARED]);

const MESSAGE = "operator-aware discovery is on, but no operator profile is declared in this project or on this machine, "
  + "so every domain is being treated as new: every fact is researched and every question explained. "
  + "Say who you are with `aof work init-config --operator-role \"<a sentence or two>\"`, "
  + "and how well you know a domain with `--expertise <domain>=expert|working|new` (add `--global` for every project on this machine).";

export function createOperatorLane({ operatorAwareFromConfig, operatorProfileFromConfig }) {
  // The warning a loaded workspace's config owes, as `{ code, severity, message }` entries: one when
  // the switch is on and the resolved profile is undeclared, none otherwise.
  function operatorProfileWarnings(config) {
    if (!operatorAwareFromConfig(config ?? {})) return [];
    if (operatorProfileFromConfig(config ?? {}).declared) return [];
    return [{ code: OPERATOR_PROFILE_UNDECLARED, severity: "warn", message: MESSAGE }];
  }

  function operatorGroup(snapshot, ctx = {}) {
    if (typeof snapshot?.workDir !== "string") return [];
    return operatorProfileWarnings(ctx.config).map((warning) => ({ ...warning, path: snapshot.workDir }));
  }

  return { OPERATOR_LANE_CODES, operatorProfileWarnings, operatorGroup };
}
