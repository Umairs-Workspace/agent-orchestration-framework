// THE HOOK WIRING — milestone 77 / story 01. ADR-005, ADR-010 §3.
//
// A hook registered twice under one event and one matcher fires twice. Each of those is a cold
// process and the second one buys nothing — and the prompt ping fires on every user turn, so the
// cost is paid per turn, per session, for as long as the file stays in that state.
//
// ── THIS LANE DETECTS AND DOES NOT REPAIR, AND THE REASON IS A STANDING DECISION ─────────────
//
// The root cause is not in dispute: the merge recognises an entry as its own ONLY when that entry
// carries the ownership marker, so a copy of an aof hook made before the marker scheme existed is
// treated as the operator's forever, and every update adds a freshly-marked duplicate beside it.
//
// The obvious fix is to collapse the pair inside the merge, and `72/ADR-005 §3` refused it on a
// counter-pressure that is still true: the framework must never silently delete a user's
// hand-authored hook. The escape hatch that carries an unmarked entry through every update is the
// same mechanism keeping THIS repository's own unmarked test-isolation guard alive — the hook that
// stops an unisolated test run writing into the real global home. A collapse rule would delete that
// too.
//
// And there is a measurement, which is why this is not a re-weighting of the same evidence.
// RESEARCH counted three live pairs; by the architecture pass there were ZERO, because 72/03
// deleted them by hand, mid-session. A write path that touches every operator's settings file is
// not changed on **n = 0 observed instances** in the only repository anyone has measured. So this
// lane REPORTS, in any audited repository, and the eventual repair — non-destructive suppression,
// never deletion and never adoption — is recorded in the debt register rather than taken here.
//
// ── WHAT THE RULE MAY NOT CLAIM ──────────────────────────────────────────────────────────────
//
// Three classes, and the first is the one that matters:
//
//   · AN UNMANAGED ENTRY THAT PAIRS WITH NO MANAGED ENTRY IS INVISIBLE. The operator's guard is
//     exactly that. A rule that reported it would be arguing for the very deletion two milestones
//     have now refused, and the person who found out would be whoever it broke.
//   · AN UNMANAGED ENTRY UNDER A DIFFERENT EVENT OR MATCHER. Two rules that happen to run one
//     program are two rules. The matcher is PART of the pairing, not context around it.
//   · ANY MANAGED PAIR. Duplication among marked entries is a merge defect, not an operator fact,
//     and no finding addressed to an operator would help.
//
// ── AND THE MARKER KEY IS INJECTED, NOT IMPORTED ─────────────────────────────────────────────
//
// It arrives beside the settings object. Importing the module that declares it would drag that
// module's own asset reader — and its `createRequire` — into the import closure FF-5904 polices,
// which is a real cost paid for a constant. The injection is not a claim about wiring: the same
// object judged under a different key gives a different answer, and no other kind of evidence
// would tell a parameter from a constant.
import { limitRecord, readRecord } from "./reads.mjs";

// ── THE FROZEN VOCABULARY ────────────────────────────────────────────────────────────────────

export const HOOK_WIRING_FINDING_CODES = Object.freeze(["audit-hook-duplicated"]);

// ── THE SWEEP REGISTRY ───────────────────────────────────────────────────────────────────────
//
// A lane over a PARSED settings document makes a DISK-level claim: it says what is present in that
// object, not what any harness does with it. The floor is 1 because the lane travels — a project
// whose settings object declares no hook entry at all is a project this lane read nothing in, and
// that is the shortfall worth naming rather than a clean pass over a population it never had.
export const HOOK_WIRING_SWEEPS = Object.freeze([
  Object.freeze({
    id: "hook-entries",
    what: "every hook entry in the audited project's settings object, carrying the event and the matcher it fires under",
    root: "<the audited project's settings file>",
    floor: 1,
    basis: "disk",
    question: "does a hook this object does not carry still fire twice?",
    blindness: () => "This lane judges ONE settings object's entries against each other. It cannot see a hook installed by any other mechanism, a duplicate spanning the project's file and the user's global one, or two entries whose commands reach the same program by a spelling the portable-path rule does not normalise. It also REPORTS ONLY: the merge that produces these pairs is unchanged by a standing decision, so a pair named here stays named until someone acts on it.",
  }),
]);

// ── THE RESOLVED INVOCATION ──────────────────────────────────────────────────────────────────
//
// The command PLUS its arguments, as a token vector. Object identity would call a reformatted copy
// distinct and report nothing — and the lane is handed a PARSED object, so the reformatting that
// matters here is not whitespace, which no lane over an object can see. It is key order, an extra
// key that is neither command nor args, and two spellings of one path.

// A command string as a shell would split it, honouring quotes so a quoted path carrying a space
// stays one token.
function tokenise(commandString) {
  const tokens = [];
  for (const match of String(commandString).matchAll(/"([^"]*)"|'([^']*)'|(\S+)/gu)) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

// The merge's own portable-path rule, RESTATED rather than imported — this lane may not reach the
// module that merges, and a second spelling is the deliberate price of that isolation. Nothing is
// expanded: the project-directory variable stays a token character for character, which is why an
// entry spelling the variable and one spelling its expansion are correctly DISTINCT.
function portableToken(token) {
  return typeof token === "string" ? token.replaceAll("\\", "/").replace(/^\.\//u, "") : token;
}

export function resolvedInvocation(entry) {
  const command = typeof entry?.command === "string" ? tokenise(entry.command) : [];
  const args = Array.isArray(entry?.args) ? entry.args.map((arg) => String(arg)) : [];
  return [...command, ...args].map(portableToken);
}

const sameInvocation = (a, b) => JSON.stringify(resolvedInvocation(a)) === JSON.stringify(resolvedInvocation(b));

// Every entry in the object, carrying the event and matcher it fires under. READ ONLY — nothing
// here mutates the object, adds a key to an entry, or reorders anything, which is what lets the
// caller's object come back deep-equal with its key order intact.
function hookEntries(settings) {
  const rows = [];
  for (const [event, groups] of Object.entries(settings?.hooks ?? {})) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      const matcher = typeof group?.matcher === "string" ? group.matcher : "";
      for (const entry of Array.isArray(group?.hooks) ? group.hooks : []) {
        rows.push({ event, matcher, entry });
      }
    }
  }
  return rows;
}

// The matcher as WRITTEN. An empty matcher is named as the empty one rather than left unsaid: a
// finding that silently omitted it would read as a finding about every matcher.
const matcherLabel = (matcher) => (matcher.length === 0 ? "the empty matcher" : JSON.stringify(matcher));

// ── THE LANE ─────────────────────────────────────────────────────────────────────────────────

/**
 * PURE over an injected settings object and marker key. Returns `{ findings, reads, limits }`.
 *
 * It opens no file, reaches no merge, and returns no settings object for anyone to write. The
 * finding says which pair was found and stops there — the repair is a decision that lives in the
 * debt register, and a lane that carried an instruction would be taking it.
 */
export function runHookWiring({
  settings = null,
  markerKey,
  settingsPath = "",
  sweeps = HOOK_WIRING_SWEEPS,
  now = null,
} = {}) {
  void now;
  const rows = hookEntries(settings);
  const marked = rows.filter((row) => row.entry != null && typeof row.entry === "object" && Object.hasOwn(row.entry, markerKey));
  const unmarked = rows.filter((row) => !(row.entry != null && typeof row.entry === "object" && Object.hasOwn(row.entry, markerKey)));

  // ONE PAIR IS ONE FINDING. A rule that reported from both entries' sides would double the number
  // the debt register is waiting on — and that number is what decides whether the merge is ever
  // repaired, so inflating it would corrupt the decision it exists to inform.
  const seen = new Set();
  const findings = [];
  for (const managed of marked) {
    for (const operator of unmarked) {
      if (managed.event !== operator.event || managed.matcher !== operator.matcher) continue;
      if (!sameInvocation(managed.entry, operator.entry)) continue;

      const command = resolvedInvocation(operator.entry).join(" ");
      const key = `${managed.event} ${managed.matcher} ${command}`;
      if (seen.has(key)) continue;
      seen.add(key);

      findings.push(Object.freeze({
        code: "audit-hook-duplicated",
        severity: "error",
        path: settingsPath,
        message: `${managed.event} (matcher ${matcherLabel(managed.matcher)}): one entry carrying the \`${markerKey}\` marker and one carrying none resolve to the same invocation — \`${command}\`. Both fire on every ${managed.event}, so this project pays two processes per event where one was asked for. aof recognises its own and only its own, so the unmarked entry is not the framework's to act on; this lane reports the pair and nothing more.`,
      }));
    }
  }

  const reads = sweeps.map((sweep) => readRecord(sweep, rows.length, settingsPath));
  const limits = sweeps.map((sweep) => limitRecord({
    sweep: sweep.id,
    basis: sweep.basis,
    question: sweep.question,
    answeredBy: null,
    consequence: sweep.blindness(),
    authority: null,
  }));

  return Object.freeze({ findings: Object.freeze(findings), reads: Object.freeze(reads), limits: Object.freeze(limits) });
}
