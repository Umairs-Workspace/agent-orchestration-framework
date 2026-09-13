// THE `(session)` LINE, STATED AS A RULE — milestone 49 / story 01 / task 00
// (`tasks/00_the-line-deduplicates-and-counts.feature`, "the line's arithmetic is
// checkable without reading it as a string"; ARCHITECTURE ADR-010).
//
// WHY A RULE AND NOT A LITERAL. m48 pinned its own behaviour twice over: once as the
// exact string `working · demo, demo (session)` and once as a RULE — `split(", ").length
// === sessions.length` — written that way, in its own words, "so a future dedupe cannot
// slip past by rewording the expectation". That rule is DESIGNED to fail on milestone
// 49's change; ADR-010 therefore requires it to be REPLACED BY ANOTHER RULE, never by a
// literal and never by deletion: "replacing a rule with a literal would be this milestone
// quietly deleting the guard m48 wrote to constrain it."
//
// This module is that replacement, and it lives here — one home — because BOTH the m48
// pin (test/mesh/fleet/mesh-fleet-session-subsumption-render.test.mjs, its row for two sessions in
// one repo) and this story's own suite (test/mesh/fleet/mesh-fleet-repo-dedupe-count.test.mjs) state
// it. A rule with two implementations is a rule that can disagree with itself.
//
// FOUR CLAUSES, each rejecting a different wrong build:
//   1. the number of parts equals the number of DISTINCT surviving repo strings
//      — rejects today's duplicate rendering (`demo, demo`);
//   2. the counts the parts carry (a part with no sign reads as 1) sum to the number of
//      SURVIVING sessions — rejects a bare dedupe, which under-counts the very sessions
//      m48 made addressable;
//   3. every part's repo text appears BYTE-IDENTICALLY in at least one surviving
//      session's `repo` — rejects a normalising (trimming / case-folding) build, which
//      renders a repo nobody published;
//   4. the parts are in ascending codepoint order of their repo text — rejects
//      first-seen (wire) ordering.
//
// THE LINE IS TAKEN APART AGAINST THE PUBLISHED REPO SET — NEVER ON THE SIGN, AND (REVIEW
// FIX, m49/01) NEVER ON THE COMMA EITHER. Both U+00D7 and `, ` are DATA as well as syntax:
// a repo may legitimately be named `a×b`, or `×`, or `demo ×2`, or `a, b`. This module used
// to state that care in its header and then hand the body to `split(", ")` — measured
// against the SHIPPED formatter's own output, that reported 3 violations for the repos
// `["a, b", "a, b"]` (rendered `working · a, b ×2 (session)`) and 2 for
// `["demo ×2", "demo", "demo"]` (rendered `working · demo ×2, demo ×2 (session)`): a rule
// calling correct renderings wrong. Both are now resolved with the SAME technique the file
// already used for the sign, applied to the whole body: the parts are resolved GREEDILY
// against the repos the payload ACTUALLY published, which is information a reader of the
// line alone does not have. That asymmetry is the point, and it is why this is a rule about
// a (line, payload) PAIR rather than about a string — and why the header's claim is now
// TRUE rather than narrowed to fit the code.

const PREFIX = "working \u{b7} ";
const SUFFIX = " (session)";
// The count separator: ONE space, then U+00D7 MULTIPLICATION SIGN (never the letter `x`).
const SIGN = " \u{d7}";
// The part separator — syntax here, and legal DATA inside a repo name, which is why it is
// only ever recognised at a boundary a published repo actually ends on.
const SEPARATOR = ", ";

// The sessions a run does NOT already account for, projected to their repo — the exact
// filter+map `fleetCurrentWorkLines` applies before it groups (m48/ADR-010 R3's STRICT
// `!== true`, and the non-string/empty drop). The COUNT is over these survivors, never
// over `sessions[]`.
export function survivingRepos(sessions) {
  return (Array.isArray(sessions) ? sessions : [])
    .filter((session) => session?.workspaceHasRun !== true)
    .map((session) => session?.repo)
    .filter((repo) => typeof repo === "string" && repo.length > 0);
}

// Resolve ONE part against the published repo set: which repo produced it, and with what
// count. Returns null when no published repo could have. Candidates are scored so the
// interpretation consistent with what the payload actually carries wins — a payload that
// published BOTH `demo` (twice) and `demo ×2` (once) is genuinely ambiguous to any
// reader, and the resolution is deterministic rather than clever.
// Used ONLY on the last-resort path below, to WORD a violation that has already been
// established — never to decide whether the line is legal.
function resolvePart(part, actualCounts) {
  const candidates = [];
  for (const repo of actualCounts.keys()) {
    if (part === repo) candidates.push({ repo, count: 1 });
    if (part.startsWith(`${repo}${SIGN}`)) {
      const digits = part.slice(repo.length + SIGN.length);
      if (/^[0-9]+$/.test(digits)) candidates.push({ repo, count: Number(digits) });
    }
  }
  if (candidates.length === 0) return null;
  return candidates.find((candidate) => actualCounts.get(candidate.repo) === candidate.count) ?? candidates[0];
}

// Every way ONE part could start at `at`: for each published repo the body carries
// VERBATIM at that position, the plain form `<repo>` and the counted form `<repo> ×<n>` —
// each admitted only when what FOLLOWS it is a `", "` boundary or the end of the body, so
// a comma inside a repo name is never mistaken for a separator. The digit run is maximal:
// a shorter one would leave a digit where a boundary must be.
function partsStartingAt(body, at, actualCounts) {
  const candidates = [];
  for (const repo of actualCounts.keys()) {
    if (!body.startsWith(repo, at)) continue;
    const plainEnd = at + repo.length;
    if (plainEnd === body.length || body.startsWith(SEPARATOR, plainEnd)) {
      candidates.push({ part: body.slice(at, plainEnd), repo, count: 1, end: plainEnd });
    }
    if (body.startsWith(SIGN, plainEnd)) {
      const digitsFrom = plainEnd + SIGN.length;
      let end = digitsFrom;
      while (end < body.length && body[end] >= "0" && body[end] <= "9") end += 1;
      if (end > digitsFrom && (end === body.length || body.startsWith(SEPARATOR, end))) {
        candidates.push({ part: body.slice(at, end), repo, count: Number(body.slice(digitsFrom, end)), end });
      }
    }
  }
  // GREEDY: the longest part first, so a repo whose own name ends in ` ×<digits>` wins over
  // the shorter repo whose name it happens to begin with. Ties break on the repo text, so
  // the reading is deterministic and never depends on wire order.
  return candidates.sort((a, b) => b.part.length - a.part.length || (a.repo < b.repo ? -1 : a.repo > b.repo ? 1 : 0));
}

// A parse is CONSISTENT when it says what the payload actually carries: one part per
// distinct published repo, each with that repo's true count. ORDER is judged separately —
// clause 4 owns it — so a consistent parse can still be a wrong line.
function isConsistent(chain, actualCounts) {
  if (chain.length !== actualCounts.size) return false;
  const named = new Set(chain.map((entry) => entry.repo));
  if (named.size !== chain.length) return false;
  return chain.every((entry) => actualCounts.get(entry.repo) === entry.count);
}

function isAscending(chain) {
  return chain.every((entry, i) => i === 0 || chain[i - 1].repo < entry.repo);
}

// Take the whole body apart against the published repo set: a depth-first search over the
// segmentations `partsStartingAt` admits, preferring — in this order —
//   1. a parse that is CONSISTENT AND ASCENDING, i.e. a reading under which the line IS
//      what a correct formatter emits for this payload. It is preferred rather than merely
//      accepted because a body can be genuinely AMBIGUOUS: repos `["demo, demo", "demo"]`
//      render `working · demo, demo, demo (session)`, which reads BOTH as
//      `["demo", "demo, demo"]` (the formatter's own, sorted) and as
//      `["demo, demo", "demo"]` (consistent, unsorted). Taking the first greedy reading
//      would report a clause-4 violation against a correct line — the same false-red class
//      as the `split(", ")` this replaced, one level subtler;
//   2. else any CONSISTENT parse, so a genuinely mis-ordered line is reported as one;
//   3. else the first complete parse, so the clauses can report exactly HOW it is wrong;
//   4. else — no segmentation into published repos exists at all, which already makes the
//      line illegal — a `", "` split, purely so clause 3 can NAME the text nobody
//      published. Legality is never DECIDED by that split.
// The search is budgeted: a pathological repo name cannot turn a test into a hang.
function resolveBody(body, actualCounts) {
  const fallback = () => body.split(SEPARATOR).map((part) => ({ part, ...(resolvePart(part, actualCounts) ?? { repo: null, count: null }) }));
  if (body.length === 0 || actualCounts.size === 0) return fallback();

  let budget = 20000;
  let anyComplete = null;
  let anyConsistent = null;
  const walk = (at, chain) => {
    if (budget <= 0) return null;
    if (at === body.length) {
      if (anyComplete === null) anyComplete = chain;
      if (!isConsistent(chain, actualCounts)) return null;
      if (anyConsistent === null) anyConsistent = chain;
      return isAscending(chain) ? chain : null;
    }
    for (const candidate of partsStartingAt(body, at, actualCounts)) {
      budget -= 1;
      if (budget <= 0) return null;
      const next = candidate.end === body.length ? candidate.end : candidate.end + SEPARATOR.length;
      const found = walk(next, [...chain, candidate]);
      if (found) return found;
    }
    return null;
  };

  return walk(0, []) ?? anyConsistent ?? anyComplete ?? fallback();
}

// sessionLineRuleViolations(line, sessions) — [] when `line` is a legal rendering of
// `sessions` under milestone 49's rule, else one message per broken clause. A PURE
// function over (string, array): it calls no formatter, so it can be handed a CANDIDATE
// line the formatter did not produce (which is how its own rejections are proven).
export function sessionLineRuleViolations(line, sessions) {
  const violations = [];
  if (typeof line !== "string" || !line.startsWith(PREFIX) || !line.endsWith(SUFFIX)) {
    return [`the line is not framed \`working · … (session)\`: ${JSON.stringify(line)}`];
  }
  const survivors = survivingRepos(sessions);
  const actualCounts = new Map();
  for (const repo of survivors) actualCounts.set(repo, (actualCounts.get(repo) ?? 0) + 1);

  // The parts, resolved against what the payload published — NOT split out of the string.
  const resolved = resolveBody(line.slice(PREFIX.length, line.length - SUFFIX.length), actualCounts);

  // Clause 1 — one part per DISTINCT surviving repo.
  if (resolved.length !== actualCounts.size) {
    violations.push(
      `clause 1: the line carries ${resolved.length} part(s) but the surviving sessions name ${actualCounts.size} DISTINCT repo(s) — a repo is said once, no more and no less`,
    );
  }

  // Clause 3 — no part names a repo nobody published (byte-identically).
  for (const entry of resolved) {
    if (entry.repo == null) {
      violations.push(
        `clause 3: the part ${JSON.stringify(entry.part)} names no repo any surviving session published, byte-for-byte — the line may not normalise (trim/case-fold) what it renders`,
      );
    }
  }

  // Clause 2 — the counts sum to the number of SURVIVING sessions.
  if (resolved.every((entry) => entry.repo != null)) {
    const total = resolved.reduce((sum, entry) => sum + entry.count, 0);
    if (total !== survivors.length) {
      violations.push(
        `clause 2: the line's counts sum to ${total} but ${survivors.length} session(s) survived the run filter — the line must say how many, not merely which`,
      );
    }
    const named = new Set(resolved.map((entry) => entry.repo));
    if (named.size !== resolved.length) {
      violations.push("clause 2: two parts resolve to the SAME repo — the line names a repo more than once");
    }
    for (const entry of resolved) {
      if (actualCounts.get(entry.repo) !== entry.count) {
        violations.push(
          `clause 2: the part ${JSON.stringify(entry.part)} claims ${entry.count} session(s) in ${JSON.stringify(entry.repo)}, but ${actualCounts.get(entry.repo)} survived`,
        );
      }
    }
  }

  // Clause 4 — ascending codepoint order of the repo TEXT (not of the rendered part).
  const repos = resolved.map((entry) => entry.repo);
  if (repos.every((repo) => repo != null)) {
    const sorted = [...repos].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (JSON.stringify(repos) !== JSON.stringify(sorted)) {
      violations.push(
        `clause 4: the parts are ordered ${JSON.stringify(repos)} — the DISTINCT repos must ascend by plain codepoint comparison, never by first-seen (wire) order`,
      );
    }
  }

  return violations;
}
