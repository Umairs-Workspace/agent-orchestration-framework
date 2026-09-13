// Traceability wiring for milestone 46 / story 03 / task 00 —
// tasks/00_the-session-source-table.feature (@executable).
//
// THE CHANNEL. `ui/src/terminal/source-table.mjs` is PURE and has no CLI surface, so the
// black-box channel every scenario below is confirmed through is `node:test` importing the
// module directly under plain `node` and asserting on RETURNED VALUES — no bundler, no DOM,
// no socket, no clock. That is the house pattern (test/ui/app-routes.test.mjs does exactly this
// for ui/src/app/routes.mjs), and it is what the feature's own LITMUS demands.
//
// Nothing here reads the module's SOURCE. The five structural invariants the feature
// deliberately withholds — no port literal on a terminal surface, exactly one xterm
// construction site, the shared set imports no React and nothing from either surface folder,
// one state vocabulary, and the descriptor's geometry equals the worker's — belong to
// test/arch/acd-terminal-{origin-not-port,control-boundary,server-only,mirror-geometry-pinned}.
//
//   Scenario Outline: each of the two entries declares its route, its params, its origin,
//     its control-frame and input capabilities, and its geometry (2 rows)
//   Scenario: the table is frozen at exactly two entries, and frozen in fact rather than by
//     convention
//   Scenario Outline: an unknown source kind is refused with its cause named, and is never
//     coerced or defaulted into either entry (10 rows)
//   Scenario: a relayed `local-pty` is not a session source, and the table offers no way to
//     assemble one
//   Scenario Outline: every derivation is total over the table and keys on the descriptor's
//     FIELDS, never on its kind (2 rows)
import assert from "node:assert/strict";
import {
  SESSION_SOURCES,
  SESSION_SOURCE_KINDS,
  SESSION_SOURCE_FIELDS,
  ORIGIN_ROLE_SELF,
  ORIGIN_ROLE_FLEET,
  RESIZE_CONTROL_FRAME,
  sessionSourceTable,
  sessionSourceFor,
} from "../../ui/src/terminal/source-table.mjs";
import * as sourceTableModule from "../../ui/src/terminal/source-table.mjs";
import { geometryModeFor } from "../../ui/src/terminal/geometry.mjs";
import { inputPolicyFor, mountPosture, POSTURE_INTERACTIVE } from "../../ui/src/terminal/input-policy.mjs";
import { terminalSocketUrl } from "../../ui/src/terminal/socket-url.mjs";

const ORIGINS = { self: "http://127.0.0.1:53219", fleet: "http://127.0.0.1:4181" };
const PARAMS = {
  "local-pty": { ref: "46/03", provider: "claude" },
  mirror: { nodeId: "aof-wsl", sessionId: "7f3a" },
};

function sourceOf(kind) {
  const lookup = sessionSourceFor(kind);
  assert.equal(lookup.resolved, true, `${kind} resolves`);
  return lookup.source;
}

// A "descriptor" is a whole row: an object declaring ALL SIX fields. Used to prove that a
// refusal leaks none of one, and that nothing in the module assembles one out of loose
// fields.
function looksLikeDescriptor(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  return SESSION_SOURCE_FIELDS.every((field) => field in value);
}

export const terminalCoreSourceTableTests = [
  // ======================================================================
  // Scenario Outline: each of the two entries declares its route, its params, its origin,
  // its control-frame and input capabilities, and its geometry
  // ======================================================================
  ...[
    {
      case: "the PTY the board server owns",
      kind: "local-pty",
      path: "/ws/terminal",
      params: ["ref", "provider"],
      originRole: ORIGIN_ROLE_SELF,
      resizeControlFrame: RESIZE_CONTROL_FRAME,
      canInput: true,
      fixedGeometry: null,
    },
    {
      case: "a worker's mirrored, absolutely-addressed TUI",
      kind: "mirror",
      path: "/ws/terminal-view",
      params: ["nodeId", "sessionId"],
      originRole: ORIGIN_ROLE_FLEET,
      resizeControlFrame: null,
      canInput: true,
      fixedGeometry: { cols: 80, rows: 24 },
    },
  ].map((row) => ({
    name: `terminal-core/00 the ${row.kind} descriptor declares its route, params, origin, control frame, input capability and geometry as values (${row.case})`,
    run() {
      // Given the session source <kind> / When its descriptor is read
      const source = sourceOf(row.kind);

      // Then its route path is exactly <path>
      assert.equal(source.path, row.path);
      // And the params that address it are exactly <params> — those, in that order, and no others
      assert.deepEqual([...source.params], row.params, "the declared params, in declaration order, and no others");
      // And it dials the <origin role> origin
      assert.equal(source.originRole, row.originRole);
      // And its resize control frame is <resize control frame>
      assert.equal(source.resizeControlFrame, row.resizeControlFrame);
      // And its input capability is <can input> — `yes` on BOTH rows, deliberately: the
      // mirror lane has carried input since m42, and the reason the fleet peek is read-only
      // is the MOUNT's posture, not the source's capability.
      assert.equal(source.canInput, row.canInput);
      // And its fixed geometry is <fixed geometry>
      assert.deepEqual(source.fixedGeometry, row.fixedGeometry);

      // And all six answers come off the descriptor as values — a caller reads them without
      // naming the kind and without a branch of its own.
      const readGenerically = Object.fromEntries(SESSION_SOURCE_FIELDS.map((field) => [field, source[field]]));
      assert.deepEqual(readGenerically, {
        path: row.path,
        params: source.params,
        originRole: row.originRole,
        resizeControlFrame: row.resizeControlFrame,
        canInput: row.canInput,
        fixedGeometry: row.fixedGeometry,
      });
      for (const field of SESSION_SOURCE_FIELDS) {
        assert.ok(field in source, `${field} is a declared field on the descriptor, not a derivation`);
        assert.notEqual(typeof source[field], "function", `${field} is a VALUE, not a callback the caller must run`);
      }
    },
  })),

  // ======================================================================
  // Scenario: the table is frozen at exactly two entries, and frozen in fact
  // ======================================================================
  {
    name: "terminal-core/00 the table is frozen at exactly two entries — local-pty and mirror — in fact rather than by convention, and one table is yielded to every consumer",
    run() {
      // When the table's entries are listed
      const entries = sessionSourceTable();

      // Then there are exactly two, and their kinds are exactly `local-pty` and `mirror`
      assert.equal(entries.length, 2, "exactly two entries");
      assert.deepEqual(entries.map((entry) => entry.kind), ["local-pty", "mirror"]);
      assert.deepEqual([...SESSION_SOURCE_KINDS], ["local-pty", "mirror"]);

      // And no third entry exists under any name — not a relayed variant, not a test double,
      // not a placeholder.
      for (const suspect of ["relay-pty", "relayed-local-pty", "test", "placeholder", "remote", "local", "stub"]) {
        assert.equal(sessionSourceFor(suspect).resolved, false, `${suspect} is not an entry`);
      }

      // And the two entries are told apart by their FIELDS alone.
      const paths = new Set(entries.map((entry) => entry.path));
      assert.equal(paths.size, 2, "no two entries share a route path");
      const pathAndOrigin = new Set(entries.map((entry) => `${entry.path}@${entry.originRole}`));
      assert.equal(pathAndOrigin.size, 2, "no two entries share a route-path-and-origin pair");

      // And a caller that writes to the table, or to either descriptor, changes nothing the
      // next read can see. (A frozen object under ESM's strict mode THROWS on write; the
      // contract is about what the next read sees, so both outcomes satisfy it.)
      const before = JSON.parse(JSON.stringify(entries));
      try { entries.push({ kind: "relay-pty" }); } catch { /* frozen in fact */ }
      try { entries[0].path = "/ws/hijacked"; } catch { /* frozen in fact */ }
      try { entries[1].fixedGeometry.cols = 200; } catch { /* frozen in fact, deeply */ }
      try { entries[1].params.push("token"); } catch { /* frozen in fact, deeply */ }
      assert.deepEqual(JSON.parse(JSON.stringify(sessionSourceTable())), before, "the next read sees the contract, unchanged");
      assert.equal(sessionSourceTable().length, 2, "still exactly two");

      // And the same table object is yielded to every consumer.
      assert.equal(sessionSourceTable(), sessionSourceTable(), "one table object, by reference");
      assert.equal(sessionSourceTable(), SESSION_SOURCES, "…and it is the exported table, not a copy");
      assert.equal(sessionSourceFor("mirror").source, SESSION_SOURCES[1], "a lookup hands back the row itself");
    },
  },

  // ======================================================================
  // Scenario Outline: an unknown source kind is refused with its cause named
  // ======================================================================
  ...[
    { case: "a third kind nobody built", requested: "relay-pty" },
    { case: "the retired transport word ADR-003 exists to remove", requested: "remote" },
    { case: "the other half of the same retired pair", requested: "local" },
    { case: "a kind that differs only in case", requested: "MIRROR" },
    { case: "a kind carrying surrounding whitespace", requested: " mirror " },
    { case: "a kind that is the empty string", requested: "" },
    { case: "no kind at all", requested: undefined },
    { case: "an explicit null", requested: null },
    { case: "a value that is not a string", requested: 7 },
    { case: "an object shaped like a descriptor", requested: { kind: "mirror" } },
  ].map((row) => ({
    name: `terminal-core/00 the source kind ${JSON.stringify(row.requested) ?? "(absent)"} is refused with its cause named and is never coerced into an entry (${row.case})`,
    run() {
      // When the lookup is made
      const answer = sessionSourceFor(row.requested);

      // Then no descriptor comes back — neither `local-pty`'s nor `mirror`'s
      assert.equal(answer.resolved, false, "the lookup did not resolve");
      assert.equal(answer.source, null, "no descriptor came back");
      assert.ok(!looksLikeDescriptor(answer), "the answer is not itself a descriptor");

      // And the refusal names the kind it was handed and the two kinds the table knows, so
      // the caller can print a cause rather than an apology.
      assert.deepEqual([...answer.knownKinds], ["local-pty", "mirror"], "the refusal names the two kinds the table knows");
      assert.equal(typeof answer.message, "string");
      assert.ok(answer.message.includes("local-pty") && answer.message.includes("mirror"), `the cause names both known kinds: ${answer.message}`);
      if (typeof row.requested === "string") {
        assert.equal(answer.requestedKind, row.requested, "the kind it was handed, verbatim");
        assert.ok(answer.message.includes(JSON.stringify(row.requested)), `the cause names the kind it was handed: ${answer.message}`);
      } else {
        assert.equal(answer.requestedKind, null, "a non-string kind is not laundered into a string");
      }

      // And nothing is coerced: a kind that merely resembles a known one is not resolved to it.
      assert.notEqual(answer.source, SESSION_SOURCES[0]);
      assert.notEqual(answer.source, SESSION_SOURCES[1]);

      // And no field of either entry leaks into the answer — no route, no origin, no geometry.
      const serialised = JSON.stringify(answer);
      for (const leak of ["/ws/terminal", "/ws/terminal-view", "originRole", "resizeControlFrame", "fixedGeometry", "canInput", "nodeId", "sessionId", "provider"]) {
        assert.ok(!serialised.includes(leak), `the refusal leaks no ${leak}: ${serialised}`);
      }
      for (const field of SESSION_SOURCE_FIELDS) {
        assert.ok(!(field in answer), `the refusal carries no ${field}`);
      }
    },
  })),

  // ======================================================================
  // Scenario: a relayed `local-pty` is not a session source
  // ======================================================================
  {
    name: "terminal-core/00 a relayed local-pty is not a session source, and the table offers no way to assemble one",
    run() {
      const entries = sessionSourceTable();

      // Then no entry routes `/ws/terminal` at any origin but the surface's own.
      for (const entry of entries) {
        if (entry.path === "/ws/terminal") {
          assert.equal(entry.originRole, ORIGIN_ROLE_SELF, "the board PTY route is only ever dialled at the surface's own origin");
        }
      }

      // And no entry declares BOTH a resize control frame AND the fleet origin — a resizable
      // far end reached over a lane that carries no resize is precisely the combination
      // spike 44 measured as impossible in both directions.
      for (const entry of entries) {
        assert.ok(
          !(entry.resizeControlFrame != null && entry.originRole === ORIGIN_ROLE_FLEET),
          `${entry.kind} does not claim both a resize control frame and the fleet origin`,
        );
      }

      // And asking for it by name is refused exactly as any other unknown kind is.
      for (const name of ["relay-pty", "relayed-local-pty", "local-pty-relayed", "local-pty@fleet"]) {
        const answer = sessionSourceFor(name);
        assert.equal(answer.resolved, false, `${name} is refused`);
        assert.deepEqual([...answer.knownKinds], ["local-pty", "mirror"]);
      }

      // And the table hands out WHOLE ROWS, never fields to assemble: no export of this
      // module turns a bag of fields into a descriptor.
      const assembled = {
        kind: "relayed-local-pty",
        path: "/ws/terminal",
        params: ["ref", "provider"],
        originRole: ORIGIN_ROLE_FLEET,
        resizeControlFrame: RESIZE_CONTROL_FRAME,
        canInput: true,
        fixedGeometry: null,
      };
      let functionsProbed = 0;
      for (const [name, exported] of Object.entries(sourceTableModule)) {
        if (typeof exported !== "function") continue;
        functionsProbed += 1;
        const out = exported(assembled);
        assert.ok(
          !looksLikeDescriptor(out),
          `${name}() does not turn loose fields into a descriptor — the table hands out whole rows`,
        );
        if (out != null && typeof out === "object" && "source" in out) {
          assert.equal(out.source, null, `${name}() resolves no source for an assembled field bag`);
        }
      }
      assert.ok(functionsProbed >= 2, `the module's functions were actually probed (non-vacuous): ${functionsProbed}`);

      // And because that lane does not exist, `local-pty` never needs an origin it was not
      // served from — its origin role is `self` on every surface that mounts it.
      const localPty = sourceOf("local-pty");
      assert.equal(localPty.originRole, ORIGIN_ROLE_SELF);
      assert.equal(sourceOf("local-pty").originRole, ORIGIN_ROLE_SELF, "…on every read, from every surface");
    },
  },

  // ======================================================================
  // Scenario Outline: every derivation is total over the table and keys on the FIELDS
  // ======================================================================
  ...[
    { case: "the board PTY, wearing a name nothing recognises", kind: "local-pty", disguisedAs: "some-future-source" },
    { case: "the worker mirror, wearing the retired transport word", kind: "mirror", disguisedAs: "remote" },
  ].map((row) => ({
    name: `terminal-core/00 every derivation over ${row.kind} keys on the descriptor's FIELDS — disguising its kind as "${row.disguisedAs}" changes nothing (${row.case})`,
    run() {
      const source = sourceOf(row.kind);
      const params = PARAMS[row.kind];
      const mount = mountPosture(POSTURE_INTERACTIVE);

      // When the geometry mode, the input policy and the socket URL are each derived from it
      const mode = geometryModeFor(source);
      const policy = inputPolicyFor(source, mount);
      const built = terminalSocketUrl(source, params, { origins: ORIGINS });

      // Then each derivation yields a value — none of them is undefined for either entry.
      assert.ok(mode === "fit" || mode === "scale", `a geometry mode came back: ${mode}`);
      assert.equal(typeof policy.inputEnabled, "boolean", "an input answer came back");
      assert.equal(typeof built.url, "string", "a URL came back");

      // And handing the same derivations a descriptor whose KIND STRING is replaced —
      // every other field unchanged — yields byte-identical answers.
      const disguised = { ...source, kind: row.disguisedAs };
      assert.equal(geometryModeFor(disguised), mode, "the geometry mode did not notice the kind");
      assert.deepEqual(inputPolicyFor(disguised, mount), policy, "the input policy did not notice the kind");
      assert.deepEqual(terminalSocketUrl(disguised, params, { origins: ORIGINS }), built, "the URL did not notice the kind");

      // And handing them the same fields under a different origin, host or port yields the
      // same geometry mode and the same input answer, because neither is a property of the
      // transport.
      const elsewhere = {
        self: "https://board.elsewhere.test:9443",
        fleet: "https://fleet.elsewhere.test:9444",
      };
      assert.equal(geometryModeFor(source), mode);
      assert.deepEqual(inputPolicyFor(source, mount), policy);
      const rebuilt = terminalSocketUrl(source, params, { origins: elsewhere });
      assert.equal(typeof rebuilt.url, "string", "the URL still builds at another origin");
      assert.notEqual(rebuilt.url, built.url, "…and it is genuinely a different URL, so the check above is not vacuous");
      assert.equal(geometryModeFor(source), mode, "the geometry mode is the same at another origin, host and port");
      assert.deepEqual(inputPolicyFor(source, mount), policy, "the input answer is the same at another origin, host and port");
    },
  })),
];
