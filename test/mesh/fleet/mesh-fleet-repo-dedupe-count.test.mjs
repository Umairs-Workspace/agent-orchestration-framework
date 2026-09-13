// Traceability wiring for milestone 49 / story 01 — task 00
// (tasks/00_the-line-deduplicates-and-counts.feature): "one repo, said once, with a
// count — the node's current-work line stops repeating a repo name and starts saying how
// many sessions are in it".
//
// THE RULE IS DESIGN'S, ALREADY RULED (§The `(session)` line — the dedupe rule, RULED),
// and this suite enumerates its cases: group the surviving sessions on the RAW repo
// string (no trim, no case-fold), sort the DISTINCT repos by the plain codepoint
// comparison the line already used, render `<repo>` at one session and `<repo> ×<count>`
// above one — the sign being U+00D7, never the letter `x` — and join with ", " inside the
// unchanged frame `working · … (session)`.
//
// THE FUNCTION UNDER TEST is the PURE `fleetCurrentWorkLines` (ui/src/fleet/runs.mjs) —
// no React, no DOM, no I/O, no clock — imported directly and called with literal presence
// objects. NO STORE, NO SERVER, NO PORT: nothing here touches `~/.aof` and nothing binds.
// (The suite still runs under the house per-test hermetic `AOF_GLOBAL_HOME`; it simply has
// nothing to write there.)
//
// THE OTHER IMPLEMENTATION. The same rule has a second implementation in Rust
// (`session_line_parts()`, app/desktop/crates/core/src/status.rs, read by `current_work()` and
// rendered by `CurrentWork::display()`), and ADR-010 lands both in ONE commit. Two
// distinct checks hold them together and NEITHER is this file alone:
//   · the RUNTIME half runs under `cargo test --manifest-path app/desktop/Cargo.toml`
//     (view_model.rs's `m49_*` tests) — and is SILENTLY ABSENT on a machine with no Rust
//     toolchain, because scripts/test.mjs's cargo lane is guard-if-present;
//   · the SOURCE-TEXT half is `crossSurfaceDriftViolations`
//     (test/arch/session/acd-captured-producer-fixture.test.mjs), which runs in the NODE suite
//     with no toolchain at all — and which, before this story, had no captured fixture
//     exercising two sessions in one repo and so could not see this change AT ALL. Task
//     01 lands that fixture and the clause that stops anyone dropping it.
// The cross-language scenario below asserts the SOURCE-TEXT half by the same mechanism the
// shipped gate uses, so this suite still says something about the desktop where cargo is
// absent — it is a complement to the cargo lane, never a replacement for it.
//
// NOT ASSERTED HERE, each with an owner: the captured fixture and the gate's teeth (task
// 01, the arch suite); the formatter's SHAPE — one `.filter(…)` reading `workspaceHasRun`,
// strict `!== true` (test/arch/session/acd-session-run-reconciliation.test.mjs); who enumerates
// sessions and the terminals-home grid (stories 49/02-05); who filters liveness (the
// publisher, before the wire — m48, unchanged); typography, colour and card geometry (the
// designer, through the task's `@uat`).
//
// THE PRE-EXISTING CROSS-LANGUAGE DIVERGENCE IS DELIBERATELY NOT TOUCHED. Rust's
// `current_work` short-circuits to `Running{…}` when `activeRuns` is non-empty and never
// reads sessions, while the JS renders BOTH lines. That is real, measured and
// pre-existing; ADR-010 routes it to TECH_DEBT and every cross-language row below
// therefore carries an EMPTY `activeRuns` — the rows that carry a run are asserted against
// the JS only.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fleetCurrentWorkLines } from "../../../ui/src/fleet/runs.mjs";
import { sessionLineRuleViolations, survivingRepos } from "../../support/session-line-rule.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RUST_VIEW_MODEL = path.join(REPO, "app", "desktop", "crates", "core", "src", "view_model.rs");
const M48_PIN = path.join(REPO, "test", "mesh", "fleet", "mesh-fleet-session-subsumption-render.test.mjs");

const PING = "2026-08-13T12:00:00.000Z";

// A session entry in the m48/ADR-005 frozen ordered six. Every distinct session gets its
// own `sessionId` — two live sessions in ONE repo are two RECORDS (m48/ADR-002's 4-part
// leaf), never one read twice.
let seq = 0;
function session(repo, { workspaceId, sessionId, workspaceHasRun = false, lastPingAt = PING } = {}) {
  seq += 1;
  return {
    sessionId: sessionId ?? `sess-${seq}`,
    workspaceId: workspaceId ?? `ws-${seq}`,
    repo,
    assistant: "claude-code",
    lastPingAt,
    workspaceHasRun,
  };
}

// A presence carrying one session per element of `repos`, in the order given (the wire's
// order — deliberately NOT the line's order).
function presenceOf(repos, { activeRuns = [] } = {}) {
  return { activeRuns, sessions: repos.map((repo) => session(repo)) };
}

const sessionLineOf = (presence) => fleetCurrentWorkLines(presence).lines.find((line) => line.endsWith(" (session)"));

// The Rust string-literal form of a rendered line — the SHIPPED gate's own escape
// (`rustLiteral`, test/arch/session/acd-captured-producer-fixture.test.mjs): `·` is written
// `\u{b7}` in the Rust source's literals and NOTHING ELSE is escaped, so U+00D7 must
// appear RAW there.
const rustLiteral = (line) => `"${line.replace(/·/g, "\\u{b7}")}"`;

export const meshFleetRepoDedupeCountTests = [
  // ══ Scenario: two live sessions in one repo name that repo once and say how many ══
  //    THE HEADLINE — the outcome m48 routed to this milestone. Against the unmodified
  //    tree this renders `working · demo, demo (session)` and fails.
  {
    name: "mesh-fleet-repo-dedupe-count/00 two live sessions in one repo name that repo once and say how many",
    async run() {
      const presence = presenceOf(["demo", "demo"]);

      const rendered = fleetCurrentWorkLines(presence);
      assert.deepEqual(rendered.lines, ["working · demo ×2 (session)"], "`lines` is exactly one element: the deduplicated, counted (session) line");
      assert.equal(rendered.lines[0].split("demo").length - 1, 1, "the repo name `demo` occurs exactly ONCE in that line");
      assert.equal(rendered.state, "working", "state is `working`");
      assert.equal(rendered.token, "primary", "token is `primary`");

      // …and it is a pure projection: the identical payload renders deep-equal again.
      assert.deepEqual(fleetCurrentWorkLines(presence), rendered, "rendering the identical payload a second time returns a deep-equal result");
    },
  },

  // ══ Scenario: the sign is U+00D7 and a count of one is never written ══
  //    Read as CODEPOINTS, because `×` (U+00D7) and `x` (U+0078) are indistinguishable in
  //    a review diff.
  {
    name: "mesh-fleet-repo-dedupe-count/00 the sign is U+00D7 and a count of one is never written",
    async run() {
      const line = sessionLineOf(presenceOf(["demo", "demo", "aof"]));
      assert.equal(line, "working · aof, demo ×2 (session)", "the `(session)` line");

      const chars = [...line];
      const digit = chars.indexOf("2");
      assert.ok(digit > 0, "the count's digit is in the line");
      assert.equal(chars[digit - 1].codePointAt(0), 0x00d7, "the character immediately before the digit `2` is U+00D7, read as a codepoint");
      assert.equal(chars[digit - 2].codePointAt(0), 0x0020, "exactly one space between `demo` and the sign — and none between the sign and the digit");
      assert.equal(line.includes("x"), false, "the line contains no LATIN SMALL LETTER X (U+0078) anywhere");
      assert.equal(line.includes("×1"), false, "the part for `aof` is exactly `aof` — no ` ×1`, and `×1` appears nowhere");
      assert.equal(line.startsWith("working · "), true, "the frame is unchanged: it starts `working · `");
      assert.equal(line.endsWith(" (session)"), true, "…and ends ` (session)`");
    },
  },

  // ══ Scenario Outline: the line groups, counts and orders the distinct repos ══
  //    Rows 1 and 7 are the "unchanged from today" floor and are byte-identical to the
  //    pre-m49 rendering; every other row fails against the unmodified formatter.
  {
    name: "mesh-fleet-repo-dedupe-count/00 the line groups, counts and orders the distinct repos (Examples: grouping and counting, 8 rows)",
    async run() {
      const rows = [
        { case: "one session — UNCHANGED from today", repos: ["demo"], line: "working · demo (session)" },
        { case: "two sessions, one repo", repos: ["demo", "demo"], line: "working · demo ×2 (session)" },
        { case: "three sessions, one repo", repos: ["demo", "demo", "demo"], line: "working · demo ×3 (session)" },
        { case: "a two-digit count needs no separator", repos: Array.from({ length: 10 }, () => "demo"), line: "working · demo ×10 (session)" },
        { case: "two repos, one of them doubled", repos: ["demo", "aof", "demo"], line: "working · aof, demo ×2 (session)" },
        { case: "two repos, both doubled", repos: ["demo", "aof", "demo", "aof"], line: "working · aof ×2, demo ×2 (session)" },
        { case: "two repos, one session each — UNCHANGED", repos: ["aof", "demo"], line: "working · aof, demo (session)" },
        // ROW 8 — the anti-echo row: a build that grouped but preserved first-seen order
        // passes every row above and fails here. Rows 5-6 carry a doubled repo that is NOT
        // last in codepoint order, so sorting the multiset and grouping adjacent equals is
        // pinned to the same answer as grouping and sorting the DISTINCT repos.
        { case: "the wire's order is not the line's order", repos: ["zeta", "alpha", "zeta", "mid"], line: "working · alpha, mid, zeta ×2 (session)" },
      ];
      for (const row of rows) {
        const rendered = fleetCurrentWorkLines(presenceOf(row.repos));
        assert.deepEqual(rendered.lines, [row.line], `${row.case}: lines`);
        assert.equal(rendered.state, "working", `${row.case}: state`);
        assert.equal(rendered.token, "primary", `${row.case}: token`);
      }
    },
  },

  // ══ Scenario Outline: the grouping key is the RAW string — no trim, no case-fold ══
  //    DESIGN step 3, made failable. A trimming build renders `demo ×3` for rows 2-3; a
  //    case-folding build renders `demo ×3` for row 1. Rows 5-6 are the adversarial pair:
  //    the sign is DATA as well as syntax, so nothing may parse this line back apart —
  //    and their placement is arithmetic, not taste (U+00D7 sorts after every ASCII
  //    letter, which is why `a×b` follows `aof` and a bare `×` follows `demo`).
  {
    name: "mesh-fleet-repo-dedupe-count/00 the grouping key is the RAW repo string — no trim, no case-fold (Examples: 6 rows)",
    async run() {
      const rows = [
        { case: "case differs, so they are two repos", repos: ["Demo", "demo", "demo"], line: "working · Demo, demo ×2 (session)" },
        { case: "a leading space differs, so two repos", repos: [" demo", "demo", "demo"], line: "working ·  demo, demo ×2 (session)" },
        { case: "a trailing space differs, so two repos", repos: ["demo ", "demo", "demo"], line: "working · demo ×2, demo  (session)" },
        { case: "a repo that is only a space is not empty", repos: [" ", " "], line: "working ·   ×2 (session)" },
        { case: "a repo whose name CONTAINS the sign", repos: ["a×b", "a×b"], line: "working · a×b ×2 (session)" },
        { case: "a repo whose name IS the sign", repos: ["×", "×"], line: "working · × ×2 (session)" },
      ];
      for (const row of rows) {
        const rendered = fleetCurrentWorkLines(presenceOf(row.repos));
        assert.deepEqual(rendered.lines, [row.line], `${row.case}: lines`);
        assert.equal(rendered.state, "working", `${row.case}: state`);
        assert.equal(rendered.token, "primary", `${row.case}: token`);
      }
    },
  },

  // ══ Scenario Outline: the count is taken after the run filter, never before it ══
  //    Subsumption runs FIRST — m48's rule is untouched by this story, and a build that
  //    counts before filtering passes the matrix above and lies here.
  {
    name: "mesh-fleet-repo-dedupe-count/00 the count is taken after the run filter, never before it (Examples: 4 rows)",
    async run() {
      const rows = [
        {
          // THE SHARPEST ROW: two sessions in one repo, ONE of them doing assignment work,
          // and the honest line says `demo` with NO count. A build that deduplicates the
          // mapped repos but counts the raw `sessions[]` renders `demo ×2` here.
          case: "one of the two is accounted for by the run",
          presence: { activeRuns: ["run-1"], sessions: [session("demo", { workspaceHasRun: true }), session("demo", { workspaceHasRun: false })] },
          lines: ["running 1 run", "working · demo (session)"],
        },
        {
          case: "both are accounted for by the run",
          presence: { activeRuns: ["run-1"], sessions: [session("demo", { workspaceHasRun: true }), session("demo", { workspaceHasRun: true })] },
          lines: ["running 1 run"],
        },
        {
          // m48/ADR-010 R3 kept alive through the rewrite: the comparison stays STRICT
          // against the boolean `true`, so an ABSENT key and the STRING "false" both still
          // render — and both still COUNT.
          case: "an unstated run fact never subsumes, so both count",
          presence: {
            activeRuns: ["run-1"],
            sessions: [
              (() => { const entry = session("demo"); delete entry.workspaceHasRun; return entry; })(),
              session("demo", { workspaceHasRun: "false" }),
            ],
          },
          lines: ["running 1 run", "working · demo ×2 (session)"],
        },
        {
          // The count is over what SURVIVED the blank/non-string drop, never over
          // `sessions.length`.
          case: "blanks and non-strings drop out before the count",
          presence: {
            activeRuns: [],
            sessions: [
              session("demo"),
              session(""),
              session(null),
              session(7),
              session(undefined),
              session("demo"),
            ],
          },
          lines: ["working · demo ×2 (session)"],
        },
      ];
      for (const row of rows) {
        assert.deepEqual(fleetCurrentWorkLines(row.presence).lines, row.lines, `${row.case}: lines`);
      }

      // Non-vacuity for row 3: the first entry genuinely carries NO `workspaceHasRun` key.
      assert.equal(Object.hasOwn(rows[2].presence.sessions[0], "workspaceHasRun"), false, "the unstated-fact row's entry really has no workspaceHasRun key");
      // Non-vacuity for row 4: six sessions went in, two survived.
      assert.equal(rows[3].presence.sessions.length, 6, "six session entries went in");
      assert.equal(survivingRepos(rows[3].presence.sessions).length, 2, "…and exactly two survived to be counted");
    },
  },

  // ══ Scenario: the line's arithmetic is checkable without reading it as a string ══
  //    The RULE, not the string (ADR-010: m48's rule-form assertion is replaced by another
  //    RULE so the next milestone cannot reword its way past this behaviour either). Four
  //    clauses, each rejecting a different wrong build — stated once, in
  //    test/support/session-line-rule.mjs, and driven here over the whole case matrix.
  {
    name: "mesh-fleet-repo-dedupe-count/00 the line's arithmetic is checkable without reading it as a string",
    async run() {
      const payloads = [
        ["demo"],
        ["demo", "demo"],
        ["demo", "demo", "demo"],
        Array.from({ length: 10 }, () => "demo"),
        ["demo", "aof", "demo"],
        ["demo", "aof", "demo", "aof"],
        ["aof", "demo"],
        ["zeta", "alpha", "zeta", "mid"],
        ["Demo", "demo", "demo"],
        [" demo", "demo", "demo"],
        ["demo ", "demo", "demo"],
        [" ", " "],
        ["a×b", "a×b"],
        ["×", "×"],
        // The PART SEPARATOR is data too (review fix — measured against the shipped
        // formatter, these three were reported as violations by a rule that took the line
        // apart with `split(", ")`, calling correct renderings wrong):
        //   ["a, b", "a, b"]          → `working · a, b ×2 (session)`        (3 violations)
        //   ["demo ×2", "demo", "demo"] → `working · demo ×2, demo ×2 (session)` (2)
        //   ["demo, demo", "demo"]    → `working · demo, demo, demo (session)` — the
        //     AMBIGUOUS body, readable two ways, only one of which is the formatter's.
        ["a, b", "a, b"],
        ["demo ×2", "demo", "demo"],
        ["demo, demo", "demo"],
        ["a, b", "a", "b"],
      ];
      for (const repos of payloads) {
        const presence = presenceOf(repos);
        const line = sessionLineOf(presence);
        assert.deepEqual(
          sessionLineRuleViolations(line, presence.sessions),
          [],
          `${JSON.stringify(repos)} → ${JSON.stringify(line)} satisfies all four clauses`,
        );
      }

      // …and over a payload that ALSO carries a run and a subsumed session, so the
      // "surviving sessions" the arithmetic is about is the filtered set, not `sessions[]`.
      const mixed = {
        activeRuns: ["run-1"],
        sessions: [session("demo", { workspaceHasRun: true }), session("demo"), session("demo"), session("aof")],
      };
      assert.deepEqual(sessionLineRuleViolations(sessionLineOf(mixed), mixed.sessions), [], "the rule holds over a payload with a run and a subsumed session");
      assert.equal(sessionLineOf(mixed), "working · aof, demo ×2 (session)", "…and the line counts the two survivors, not the three sessions");

      // EACH CLAUSE REJECTS ITS OWN WRONG BUILD — the rule is not vacuous. Every candidate
      // below is handed to the SHIPPED rule alongside the payload it claims to describe.
      const twoInOne = presenceOf(["demo", "demo"]);
      const ordered = presenceOf(["zeta", "alpha", "zeta", "mid"]);
      const spaced = presenceOf([" demo", "demo", "demo"]);
      const commaRepo = presenceOf(["a, b", "a, b"]);
      const rejections = [
        { case: "clause 1 — today's duplicate rendering", line: "working · demo, demo (session)", sessions: twoInOne.sessions },
        // …and the rule did not get more PERMISSIVE when it stopped splitting on ", ": the
        // pre-m49 rendering of a repo whose NAME carries the separator is still refused, and
        // so is a bare dedupe of it. (Review fix — the resolution is against the published
        // repo set, so `a, b, a, b` reads as the repo `a, b` said twice, not as four repos.)
        { case: "clause 1 — the pre-m49 rendering of a repo named `a, b`", line: "working · a, b, a, b (session)", sessions: commaRepo.sessions },
        { case: "clause 2 — a bare dedupe of a repo named `a, b`", line: "working · a, b (session)", sessions: commaRepo.sessions },
        { case: "clause 2 — a bare dedupe under-counts", line: "working · demo (session)", sessions: twoInOne.sessions },
        { case: "clause 2 — a wrong count", line: "working · demo ×3 (session)", sessions: twoInOne.sessions },
        { case: "clause 3 — a trimming build renders a repo nobody published", line: "working · demo ×3 (session)", sessions: spaced.sessions },
        { case: "clause 4 — first-seen (wire) ordering", line: "working · zeta ×2, alpha, mid (session)", sessions: ordered.sessions },
      ];
      for (const rejection of rejections) {
        assert.ok(
          sessionLineRuleViolations(rejection.line, rejection.sessions).length > 0,
          `the rule REJECTS ${JSON.stringify(rejection.line)} (${rejection.case})`,
        );
      }
    },
  },

  // ══ Scenario: the case m48 pinned is still pinned, as a rule, and it rejects both
  //    wrong answers ══
  //    PO ruling: the pin is REPLACED BY ANOTHER RULE, never deleted. A pin removed by the
  //    diff it was written to catch is a failure this codebase has caught before, so
  //    "the suite still carries the case" is itself asserted rather than assumed.
  {
    name: "mesh-fleet-repo-dedupe-count/00 the case m48 pinned is still pinned, as a rule, and it rejects both wrong answers",
    async run() {
      const pin = await readFile(M48_PIN, "utf8");
      assert.ok(
        pin.includes("two sessions in one repo, no run"),
        "the m48 pin suite STILL carries its case for two live sessions in one repo with no run — it was rewritten to the new rule, never deleted",
      );
      assert.ok(
        pin.includes("working · demo ×2 (session)"),
        "…and that row now pins the deduplicated, counted line",
      );
      assert.ok(
        pin.includes("sessionLineRuleViolations"),
        "…and its rule-form assertion was replaced by ANOTHER RULE, not by a bare string equality",
      );

      // The rule, applied to a candidate line together with the session set it came from.
      const presence = presenceOf(["demo", "demo"]);
      assert.ok(sessionLineRuleViolations("working · demo, demo (session)", presence.sessions).length > 0, "the rule REJECTS today's behaviour");
      assert.ok(sessionLineRuleViolations("working · demo (session)", presence.sessions).length > 0, "the rule REJECTS a bare dedupe");
      assert.deepEqual(sessionLineRuleViolations(sessionLineOf(presence), presence.sessions), [], "the rule ACCEPTS the line the delivered formatter renders");
    },
  },

  // ══ Scenario Outline: the desktop app renders the identical line for the identical
  //    payload ══
  //    The SOURCE-TEXT half of the cross-language tie, by the SAME mechanism the shipped
  //    gate uses — it runs with no Rust toolchain, which is exactly the case where the
  //    cargo lane is silently absent. The RUNTIME half is view_model.rs's own `m49_*`
  //    tests under `cargo test --manifest-path app/desktop/Cargo.toml`.
  //    Every row carries an EMPTY `activeRuns` ON PURPOSE (see the header).
  {
    name: "mesh-fleet-repo-dedupe-count/00 the desktop app renders the identical line for the identical payload (Examples: 3 rows)",
    async run() {
      const rust = await readFile(RUST_VIEW_MODEL, "utf8");
      const rows = [
        { case: "two sessions, one repo", repos: ["demo", "demo"], line: "working · demo ×2 (session)" },
        { case: "one repo doubled beside another", repos: ["demo", "aof", "demo"], line: "working · aof, demo ×2 (session)" },
        { case: "one session each — UNCHANGED", repos: ["aof", "demo"], line: "working · aof, demo (session)" },
      ];
      for (const row of rows) {
        const presence = presenceOf(row.repos);
        assert.equal(presence.activeRuns.length, 0, `${row.case}: the payload's activeRuns is empty`);
        const rendered = fleetCurrentWorkLines(presence);
        assert.deepEqual(rendered.lines, [row.line], `${row.case}: the JS formatter's line`);
        assert.ok(
          rust.includes(rustLiteral(row.line)),
          `${row.case}: the Rust surface pins the byte-identical line as a quoted literal (${rustLiteral(row.line)})`,
        );
      }

      // Trap 2/3, made failable: `rustLiteral` escapes `·` and NOTHING else, so the sign
      // must be a RAW U+00D7 codepoint in the Rust source. A Rust assertion spelled
      // `\u{d7}2` would make the gate report a drift that does not exist.
      assert.ok(rust.includes("\u{d7}2"), "the Rust surface carries the multiplication sign RAW (U+00D7), not as the escape \\u{d7}");
      assert.equal(rust.includes("\\u{d7}2 (session)"), false, "…and no assertion spells the sign as an escape inside a pinned line");
    },
  },

  // ══ Scenario Outline: every case that has no duplicate renders exactly as it does
  //    today ══
  //    The regression floor, so "the dedupe broke the idle line" is a sentence nobody gets
  //    to say at review.
  {
    name: "mesh-fleet-repo-dedupe-count/00 every case that has no duplicate renders exactly as it does today (Examples: 6 rows)",
    async run() {
      const hoursOld = new Date(Date.parse(PING) - 5 * 60 * 60 * 1000).toISOString();
      const rows = [
        { case: "nothing happening", presence: { activeRuns: [], sessions: [] }, outcome: { lines: ["idle"], state: "idle", token: "muted" } },
        { case: "several runs pluralise", presence: { activeRuns: ["run-1", "run-2", "run-3"], sessions: [] }, outcome: { lines: ["running 3 runs"], state: "working", token: "primary" } },
        { case: "a run in one repo, a session in another", presence: { activeRuns: ["run-1"], sessions: [session("other")] }, outcome: { lines: ["running 1 run", "working · other (session)"], state: "working", token: "primary" } },
        { case: "presence absent entirely", presence: undefined, outcome: { lines: ["idle"], state: "idle", token: "muted" } },
        { case: "sessions is not an array", presence: { activeRuns: [], sessions: "not-an-array" }, outcome: { lines: ["idle"], state: "idle", token: "muted" } },
        { case: "a session whose ping is hours old", presence: { activeRuns: [], sessions: [session("demo", { lastPingAt: hoursOld })] }, outcome: { lines: ["working · demo (session)"], state: "working", token: "primary" } },
      ];
      for (const row of rows) {
        let rendered;
        assert.doesNotThrow(() => { rendered = fleetCurrentWorkLines(row.presence); }, `${row.case}: no error is thrown`);
        assert.deepEqual(rendered, row.outcome, `${row.case}: the result`);
      }
      // The last row twice over: no liveness is re-judged, so the hours-old session still
      // contributes its line and the render never reads a clock.
      assert.deepEqual(fleetCurrentWorkLines(rows[5].presence), rows[5].outcome, "the hours-old session renders identically on a second call");
    },
  },
];
