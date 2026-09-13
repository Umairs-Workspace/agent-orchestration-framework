// Traceability wiring for milestone 46 / story 03 / task 03 —
// tasks/03_the-socket-url-is-built-from-an-origin.feature (@executable).
//
// THE CHANNEL. `ui/src/terminal/socket-url.mjs` is PURE, so every scenario is confirmed by
// `node:test` importing it under plain `node` and asserting on RETURNED VALUES. The point of
// the second scenario is that under plain `node` there is no browser global in scope AT ALL —
// and then that a decoy one, deliberately placed in its way, changes nothing.
//
// WHERE THE ORIGIN COMES FROM is not this task's business, and that is exactly why the
// argument exists: the `{ fleetOrigin, source }` payload threaded down the server seam is
// story 46/02's, end to end. THE STRUCTURAL HALF — no module under `ui/src/terminal/` names
// a port at all, and no `ws://`/`wss://` URL anywhere in `ui/src` carries a port literal — is
// `acd-terminal-origin-not-port`'s source-analysis sweep. A gate that greps and a test that
// runs the builder fail for different reasons, and the pair is worth having.
//
//   Scenario Outline: the builder turns a source, its params and the origins it is handed
//     into exactly one URL (6 rows)
//   Scenario: the builder reads no browser global, and ignores one put in its way
//   Scenario Outline: a half-tuple yields no URL at all (8 rows)
//   Scenario: a sibling session on the same node is never borrowed to complete a half-tuple
//   Scenario Outline: every param a source declares is required (5 rows)
//   Scenario Outline: an origin the caller could not resolve yields no URL (5 rows)
//   Scenario Outline: no port appears in the URL that the caller did not supply (4 rows)
//   Scenario Outline: the scheme follows the origin being dialled (4 rows)
//   Scenario Outline: each source dials its own route, compared as a WHOLE path (2 rows)
import assert from "node:assert/strict";
import { terminalSocketUrl } from "../../ui/src/terminal/socket-url.mjs";
import { sessionSourceFor } from "../../ui/src/terminal/source-table.mjs";

const LOCAL_PTY = sessionSourceFor("local-pty").source;
const MIRROR = sessionSourceFor("mirror").source;
const SOURCES = { "local-pty": LOCAL_PTY, mirror: MIRROR };

export const terminalCoreSocketUrlTests = [
  // ======================================================================
  // Scenario Outline: the builder turns a source, its params and the origins into ONE URL
  // ======================================================================
  ...[
    {
      case: "the board's own PTY on an ephemeral board origin",
      source: "local-pty",
      params: { ref: "46/03", provider: "claude" },
      origins: { self: "http://127.0.0.1:53219" },
      originRole: "self",
      url: "ws://127.0.0.1:53219/ws/terminal?ref=46%2F03&provider=claude",
    },
    {
      case: "the fleet page peeking at a worker, same-origin",
      source: "mirror",
      params: { nodeId: "aof-wsl", sessionId: "7f3a" },
      origins: { self: "http://127.0.0.1:4181", fleet: "http://127.0.0.1:4181" },
      originRole: "fleet",
      url: "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a",
    },
    {
      case: "the BOARD page opening the same worker's mirror",
      source: "mirror",
      params: { nodeId: "aof-wsl", sessionId: "7f3a" },
      origins: { self: "http://127.0.0.1:53219", fleet: "http://127.0.0.1:4181" },
      originRole: "fleet",
      url: "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a",
    },
    {
      case: "a fleet reached by name rather than by address",
      source: "mirror",
      params: { nodeId: "aof-wsl", sessionId: "7f3a" },
      origins: { self: "http://127.0.0.1:53219", fleet: "http://fleet.internal" },
      originRole: "fleet",
      url: "ws://fleet.internal/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a",
    },
    {
      case: "a session id that needs escaping",
      source: "mirror",
      params: { nodeId: "aof-wsl", sessionId: "a b/c" },
      origins: { fleet: "http://127.0.0.1:4181" },
      originRole: "fleet",
      url: "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=a+b%2Fc",
    },
    {
      case: "a provider other than the default",
      source: "local-pty",
      params: { ref: "46", provider: "codex" },
      origins: { self: "http://127.0.0.1:53219" },
      originRole: "self",
      url: "ws://127.0.0.1:53219/ws/terminal?ref=46&provider=codex",
    },
  ].map((row) => ({
    name: `terminal-core/03 ${row.source} addressed by ${JSON.stringify(row.params)} at ${JSON.stringify(row.origins)} builds exactly one URL (${row.case})`,
    run() {
      // When a URL is built for <source> addressed by <params>
      const built = terminalSocketUrl(SOURCES[row.source], row.params, { origins: row.origins });

      // Then the URL is exactly <url>
      assert.equal(built.url, row.url);

      // And it dials the <origin role> origin — the one that SOURCE declares, never the one
      // the page happens to have been served from.
      assert.equal(built.originRole, row.originRole);
      const dialled = new URL(row.origins[row.originRole]);
      assert.equal(built.authority, dialled.host, "the authority is the dialled origin's, whole");
      if (row.originRole === "fleet" && row.origins.self != null && row.origins.self !== row.origins.fleet) {
        assert.ok(!built.url.includes(new URL(row.origins.self).host), "nothing of the page's own origin reaches a fleet-dialled URL");
      }

      // And it carries every declared param and no others.
      assert.deepEqual(
        built.params.map(([key]) => key),
        [...SOURCES[row.source].params],
        "every declared param, in declaration order, and no others",
      );
      const readBack = [...new URL(built.url.replace(/^ws/, "http")).searchParams.entries()];
      assert.deepEqual(readBack, Object.entries(row.params), "…and each value reads back as the text it was handed (a ref with a slash never becomes a second path segment)");
    },
  })),

  // ======================================================================
  // Scenario: the builder reads no browser global, and ignores one put in its way
  // ======================================================================
  {
    name: "terminal-core/03 the builder reads no browser global and ignores a decoy one placed in its way",
    run() {
      const origins = { self: "http://127.0.0.1:53219", fleet: "http://127.0.0.1:4181" };
      const localParams = { ref: "46/03", provider: "claude" };
      const mirrorParams = { nodeId: "aof-wsl", sessionId: "7f3a" };

      // Given no browser global exists at all, as is the case under plain `node`
      assert.equal(typeof globalThis.window, "undefined", "the harness genuinely has no browser global");
      assert.equal(typeof globalThis.location, "undefined");

      // When a URL is built for each of the two sources from the origins it is handed
      const cleanLocal = terminalSocketUrl(LOCAL_PTY, localParams, { origins });
      const cleanMirror = terminalSocketUrl(MIRROR, mirrorParams, { origins });

      // Then both URLs are produced in full, with no fallback host and no stand-in.
      assert.equal(cleanLocal.url, "ws://127.0.0.1:53219/ws/terminal?ref=46%2F03&provider=claude");
      assert.equal(cleanMirror.url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a");

      // Given a decoy is then placed in scope, naming a different host and a different protocol
      const decoy = { protocol: "https:", host: "decoy.example.test:9999", hostname: "decoy.example.test", port: "9999", origin: "https://decoy.example.test:9999" };
      let decoyLocal;
      let decoyMirror;
      try {
        Object.defineProperty(globalThis, "location", { value: decoy, configurable: true, writable: true });
        Object.defineProperty(globalThis, "window", { value: { location: decoy }, configurable: true, writable: true });
        // When the same two URLs are built from the same origins
        decoyLocal = terminalSocketUrl(LOCAL_PTY, localParams, { origins });
        decoyMirror = terminalSocketUrl(MIRROR, mirrorParams, { origins });
      } finally {
        delete globalThis.location;
        delete globalThis.window;
      }

      // Then both are byte-identical to the ones built with no globals present.
      assert.equal(decoyLocal.url, cleanLocal.url);
      assert.equal(decoyMirror.url, cleanMirror.url);
      assert.deepEqual(decoyLocal, cleanLocal);
      assert.deepEqual(decoyMirror, cleanMirror);

      // And nothing about the decoys appears in either URL — not their host, not their port,
      // not their protocol.
      for (const url of [decoyLocal.url, decoyMirror.url]) {
        for (const trace of ["decoy.example.test", "9999", "wss"]) {
          assert.ok(!url.includes(trace), `${trace} does not appear in ${url}`);
        }
      }
      assert.equal(typeof globalThis.window, "undefined", "the decoys were cleaned up");
      assert.equal(typeof globalThis.location, "undefined");
    },
  },

  // ======================================================================
  // Scenario Outline: a half-tuple yields no URL at all
  // ======================================================================
  ...[
    { case: "both halves present", nodeId: "aof-wsl", sessionId: "7f3a", resolves: true },
    { case: "the worker has not captured its session yet", nodeId: "aof-wsl", sessionId: undefined, resolves: false, missing: ["sessionId"] },
    { case: "the session id arrived as an empty string", nodeId: "aof-wsl", sessionId: "", resolves: false, missing: ["sessionId"] },
    { case: "the session id is explicitly null", nodeId: "aof-wsl", sessionId: null, resolves: false, missing: ["sessionId"] },
    { case: "a malformed dispatch with no target node", nodeId: undefined, sessionId: "7f3a", resolves: false, missing: ["nodeId"] },
    { case: "the node id arrived as an empty string", nodeId: "", sessionId: "7f3a", resolves: false, missing: ["nodeId"] },
    { case: "neither half", nodeId: undefined, sessionId: undefined, resolves: false, missing: ["nodeId", "sessionId"] },
    { case: "a value that is not a string", nodeId: "aof-wsl", sessionId: 7, resolves: false, missing: ["sessionId"] },
  ].map((row) => ({
    name: `terminal-core/03 a mirror addressed by nodeId=${JSON.stringify(row.nodeId) ?? "(absent)"} sessionId=${JSON.stringify(row.sessionId) ?? "(absent)"} ${row.resolves ? "builds a URL carrying exactly that tuple" : "builds no URL at all"} (${row.case})`,
    run() {
      // Given a `mirror` source whose node id is <node id> and whose session id is <session id>
      // And a fleet origin / When a URL is built
      const built = terminalSocketUrl(MIRROR, { nodeId: row.nodeId, sessionId: row.sessionId }, { origins: { fleet: "http://127.0.0.1:4181" } });

      if (row.resolves) {
        assert.equal(built.url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a");
        return;
      }

      // Then no URL at all
      assert.equal(built.url, null);

      // And the refusal names WHICH half was missing, so the caller can say why nothing opened.
      assert.equal(built.reason, "missing-param");
      assert.deepEqual([...built.missing], row.missing);
      for (const name of row.missing) assert.ok(built.message.includes(name), `the refusal names ${name}: ${built.message}`);

      // AND IT NAMES THE TRUE CAUSE. A param that is PRESENT but not a string is not missing,
      // and a refusal that says "missing" sends the caller looking for a value that is sitting
      // right there. "A refusal must name its own cause" — a refusal naming the WRONG cause is
      // worse than a vague one.
      const presentButNotAString = row.sessionId != null && row.sessionId !== "" && typeof row.sessionId !== "string";
      const nodePresentButNotAString = row.nodeId != null && row.nodeId !== "" && typeof row.nodeId !== "string";
      if (presentButNotAString || nodePresentButNotAString) {
        assert.ok(built.message.includes("not a string"), `the refusal names malformation, not absence: ${built.message}`);
        assert.ok(!built.message.includes("is missing"), `…and does not claim the value is absent: ${built.message}`);
      } else {
        assert.ok(built.message.includes("missing"), `a genuinely absent param is reported as missing: ${built.message}`);
      }

      // And nothing partial is produced: no URL with an empty param, no URL with the param
      // omitted, no URL carrying only the node.
      assert.equal(built.authority, null);
      assert.equal(built.path, null);
      assert.equal(built.params, null);
      assert.ok(!JSON.stringify(built).includes("/ws/terminal-view"), "not even a route was minted");
    },
  })),

  {
    name: "terminal-core/03 a sibling session on the same node is never borrowed to complete a half-tuple",
    run() {
      const origins = { fleet: "http://127.0.0.1:4181" };
      // Given one card whose assignment resolved to node `aof-wsl` and session `7f3a`
      const first = terminalSocketUrl(MIRROR, { nodeId: "aof-wsl", sessionId: "7f3a" }, { origins });
      // And a second card on the SAME node whose session has not been captured
      const second = terminalSocketUrl(MIRROR, { nodeId: "aof-wsl" }, { origins });

      // Then the first card's URL carries `7f3a` and the second card has no URL at all.
      assert.ok(first.url.includes("sessionId=7f3a"));
      assert.equal(second.url, null);

      // And the second card's answer mentions NO session id whatsoever — it borrowed nothing
      // from the live sibling beside it.
      const serialised = JSON.stringify(second);
      assert.ok(!serialised.includes("7f3a"), `the refusal borrowed nothing: ${serialised}`);
      assert.ok(serialised.includes("sessionId"), "…while still naming WHICH half was missing");

      // And the two cards' URLs could never be equal, because one of them does not exist.
      assert.notEqual(first.url, second.url);
      assert.equal(second.url, null);
    },
  },

  // ======================================================================
  // Scenario Outline: every param a source declares is required
  // ======================================================================
  ...[
    { case: "a local session with no item ref", source: "local-pty", params: { provider: "claude" }, origins: { self: "http://127.0.0.1:53219" }, resolves: false },
    { case: "a local session with no provider chosen", source: "local-pty", params: { ref: "46/03" }, origins: { self: "http://127.0.0.1:53219" }, resolves: false },
    { case: "a local session with an empty ref", source: "local-pty", params: { ref: "", provider: "claude" }, origins: { self: "http://127.0.0.1:53219" }, resolves: false },
    { case: "a complete local session", source: "local-pty", params: { ref: "46/03", provider: "claude" }, origins: { self: "http://127.0.0.1:53219" }, resolves: true },
    { case: "a mirror with a complete tuple", source: "mirror", params: { nodeId: "aof-wsl", sessionId: "7f3a" }, origins: { fleet: "http://127.0.0.1:4181" }, resolves: true },
  ].map((row) => ({
    name: `terminal-core/03 ${row.source} addressed by ${JSON.stringify(row.params)} ${row.resolves ? "builds a URL carrying both" : "builds no URL at all"} (${row.case})`,
    run() {
      const built = terminalSocketUrl(SOURCES[row.source], row.params, { origins: row.origins });
      if (row.resolves) {
        assert.equal(typeof built.url, "string");
        for (const [key, value] of Object.entries(row.params)) {
          assert.ok(built.url.includes(`${key}=`), `${key} rides the URL`);
          assert.ok(built.params.some(([name, carried]) => name === key && carried === value), `${key} carries the value it was handed`);
        }
      } else {
        // A defaulted provider would silently spawn `claude` for an operator who chose
        // `codex`; an absent provider means something upstream is broken and a URL would
        // hide it.
        assert.equal(built.url, null);
        assert.equal(built.reason, "missing-param");
        assert.ok(built.missing.length > 0);
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: an origin the caller could not resolve yields no URL
  // ======================================================================
  ...[
    { case: "the fleet origin was never served to this page", source: "mirror", origins: { self: "http://127.0.0.1:53219" }, resolves: false },
    { case: "the fleet origin arrived empty", source: "mirror", origins: { fleet: "" }, resolves: false },
    { case: "no origins argument at all", source: "mirror", origins: undefined, resolves: false },
    { case: "no origins argument at all, for the local source too", source: "local-pty", origins: undefined, resolves: false },
    { case: "the origins the source needs are present", source: "mirror", origins: { fleet: "http://127.0.0.1:4181" }, resolves: true },
    // A scheme this control cannot dial is REFUSED BY NAME rather than coerced into a
    // plausible-looking `ws://` URL. There is no default cell in the scheme map, deliberately:
    // the alternative is a nonsense origin producing a URL that looks correct and a socket
    // that never opens, with nothing to say why.
    { case: "an origin whose scheme cannot be dialled", source: "mirror", origins: { fleet: "ftp://fleet.internal" }, resolves: false, reason: "unsupported-scheme" },
    // A bare `host:port` with no scheme parses as a URL whose PROTOCOL is the hostname and
    // whose authority is empty, so it is refused one step earlier, for the accurate reason:
    // it names no host to dial.
    { case: "an origin that is a bare hostname with no scheme at all", source: "mirror", origins: { fleet: "fleet.internal:4181" }, resolves: false, reason: "unresolvable-origin" },
  ].map((row) => ({
    name: `terminal-core/03 ${row.source} with origins ${JSON.stringify(row.origins) ?? "(absent)"} ${row.resolves ? "builds a URL at that origin" : "builds no URL at all"} (${row.case})`,
    run() {
      const params = row.source === "mirror" ? { nodeId: "aof-wsl", sessionId: "7f3a" } : { ref: "46/03", provider: "claude" };
      // Given the source with complete params / And <origins> / When a URL is built
      const built = row.origins === undefined
        ? terminalSocketUrl(SOURCES[row.source], params)
        : terminalSocketUrl(SOURCES[row.source], params, { origins: row.origins });

      if (row.resolves) {
        assert.equal(built.url, "ws://127.0.0.1:4181/ws/terminal-view?nodeId=aof-wsl&sessionId=7f3a");
        return;
      }

      // Then no URL at all, and NOTHING IS GUESSED: no `localhost`, no page origin
      // substituted for a missing fleet origin, no default port.
      assert.equal(built.url, null);
      assert.equal(built.reason, row.reason ?? "missing-origin");
      assert.deepEqual([...built.missing], [SOURCES[row.source].originRole]);
      assert.ok(built.message.includes(SOURCES[row.source].originRole), `the refusal names which origin it wanted: ${built.message}`);
      const serialised = JSON.stringify(built);
      for (const guess of ["localhost", "127.0.0.1", "4177", "4178", "4180", "4181", "ws://", "wss://"]) {
        assert.ok(!serialised.includes(guess), `nothing guessed a ${guess}: ${serialised}`);
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: no port appears in the URL that the caller did not supply
  // ======================================================================
  ...[
    { case: "an unusual ephemeral board port", source: "local-pty", origins: { self: "http://127.0.0.1:59999" }, authority: "127.0.0.1:59999" },
    { case: "a fleet on a port that is not the default", source: "mirror", origins: { fleet: "http://fleet.internal:8443" }, authority: "fleet.internal:8443" },
    { case: "an origin carrying no port at all", source: "mirror", origins: { fleet: "http://fleet.internal" }, authority: "fleet.internal" },
    { case: "the fleet's actual default, supplied by the caller", source: "mirror", origins: { fleet: "http://127.0.0.1:4181" }, authority: "127.0.0.1:4181" },
  ].map((row) => ({
    name: `terminal-core/03 the URL's authority is exactly ${row.authority} and carries no port the caller did not supply (${row.case})`,
    run() {
      const params = row.source === "mirror" ? { nodeId: "aof-wsl", sessionId: "7f3a" } : { ref: "46/03", provider: "claude" };
      const built = terminalSocketUrl(SOURCES[row.source], params, { origins: row.origins });

      // Then its authority is exactly <authority>
      assert.equal(built.authority, row.authority);
      assert.ok(built.url.startsWith(`ws://${row.authority}/`), `the URL dials ${row.authority}: ${built.url}`);

      // And no other port appears anywhere in the URL.
      const suppliedPort = row.authority.includes(":") ? row.authority.split(":")[1] : null;
      const portsInUrl = [...built.url.matchAll(/:(\d+)/g)].map((match) => match[1]);
      assert.deepEqual(portsInUrl, suppliedPort == null ? [] : [suppliedPort], `only the supplied port appears: ${built.url}`);

      // And none of 4177, 4178, 4180 or 4181 appears unless the caller supplied it — the
      // fleet's own default included. (Row 4 is the non-vacuity control: 4181 is not
      // forbidden, it is forbidden as an INVENTION.)
      for (const port of ["4177", "4178", "4180", "4181"]) {
        if (suppliedPort === port) {
          assert.ok(built.url.includes(`:${port}`), "the caller's own port is carried, so this check is not vacuous");
        } else {
          assert.ok(!built.url.includes(port), `${port} was not invented: ${built.url}`);
        }
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: the scheme follows the origin being DIALLED
  // ======================================================================
  ...[
    { case: "an ordinary local board", source: "local-pty", origins: { self: "http://127.0.0.1:53219" }, scheme: "ws" },
    { case: "a board served over TLS", source: "local-pty", origins: { self: "https://board.example.test" }, scheme: "wss" },
    { case: "a fleet served over TLS, dialled from an http board", source: "mirror", origins: { self: "http://127.0.0.1:53219", fleet: "https://fleet.example.test" }, scheme: "wss" },
    { case: "a plain fleet dialled from a TLS board", source: "mirror", origins: { self: "https://board.example.test", fleet: "http://127.0.0.1:4181" }, scheme: "ws" },
    // AN ORIGIN ALREADY HANDED IN AS A SOCKET ORIGIN IS NOT DOWNGRADED. The obvious spelling
    // (`protocol === "https:" ? "wss" : "ws"`) falls through on `wss:` and dials PLAINTEXT — a
    // security level the caller explicitly named, silently dropped, with a URL that looks
    // right and a socket that is not encrypted. No producer threads a `wss` origin today,
    // which is exactly why the row belongs here rather than in an incident.
    { case: "a fleet origin already named as a secure socket origin", source: "mirror", origins: { fleet: "wss://fleet.example.test" }, scheme: "wss" },
    { case: "a fleet origin named as a plaintext socket origin", source: "mirror", origins: { fleet: "ws://127.0.0.1:4181" }, scheme: "ws" },
    { case: "a board origin already named as a secure socket origin", source: "local-pty", origins: { self: "wss://board.example.test" }, scheme: "wss" },
  ].map((row) => ({
    name: `terminal-core/03 the scheme is ${row.scheme}, keyed on the origin being DIALLED (${row.case})`,
    run() {
      const params = row.source === "mirror" ? { nodeId: "aof-wsl", sessionId: "7f3a" } : { ref: "46/03", provider: "claude" };
      const built = terminalSocketUrl(SOURCES[row.source], params, { origins: row.origins });

      // A SECURE ORIGIN IS NEVER DIALLED IN PLAINTEXT. Asserted as its own clause, not as a
      // by-product of the equality above, because this is the failure that would be silent.
      const dialledOrigin = row.origins[SOURCES[row.source].originRole];
      if (/^(https|wss):/.test(dialledOrigin)) {
        assert.equal(built.scheme, "wss", `${dialledOrigin} must never be dialled in plaintext`);
        assert.ok(!built.url.startsWith("ws://"), `no plaintext downgrade: ${built.url}`);
      }

      // Then its scheme is <scheme>. Rows 3 and 4 are the only cases where "the page's
      // protocol" and "the dialled origin's protocol" differ, and they are ruled on the
      // DIALLED origin: today's `mirrorWsUrl` takes the PAGE's protocol with the FLEET's
      // hostname, which is how an `http` fleet gets dialled at `wss://` and fails with
      // nothing but a closed socket to show for it. Row 4 is a genuine mixed-content refusal
      // at the browser, and the builder must not hide it behind a scheme it invented.
      assert.equal(built.scheme, row.scheme);
      assert.ok(built.url.startsWith(`${row.scheme}://`), built.url);
      const dialledProtocol = new URL(row.origins[built.originRole]).protocol;
      const expectedByMap = { "https:": "wss", "wss:": "wss", "http:": "ws", "ws:": "ws" }[dialledProtocol];
      assert.equal(row.scheme, expectedByMap, "the scheme is the DIALLED origin's, not the page's — and it is MAPPED, so there is no fall-through cell that downgrades a secure origin");
      if (row.origins.self != null && row.origins.self !== row.origins[built.originRole]) {
        const pageScheme = { "https:": "wss", "wss:": "wss", "http:": "ws", "ws:": "ws" }[new URL(row.origins.self).protocol];
        if (pageScheme !== expectedByMap) {
          assert.notEqual(built.scheme, pageScheme, "…and where the page and the dialled origin disagree, the DIALLED origin wins");
        }
      }
    },
  })),

  // ======================================================================
  // Scenario Outline: each source dials its own route, compared as a WHOLE path
  // ======================================================================
  ...[
    { case: "the board-side bidirectional PTY route", source: "local-pty", path: "/ws/terminal", other: "/ws/terminal-view", origins: { self: "http://127.0.0.1:53219" }, params: { ref: "46/03", provider: "claude" } },
    { case: "the fleet-side read-only mirror route", source: "mirror", path: "/ws/terminal-view", other: "/ws/terminal", origins: { fleet: "http://127.0.0.1:4181" }, params: { nodeId: "aof-wsl", sessionId: "7f3a" } },
  ].map((row) => ({
    name: `terminal-core/03 ${row.source} dials exactly ${row.path}, matched WHOLE (${row.case})`,
    run() {
      const built = terminalSocketUrl(SOURCES[row.source], row.params, { origins: row.origins });

      // Then its path is exactly <path> — matched WHOLE, because `/ws/terminal` is a prefix
      // of `/ws/terminal-view` and a substring check would pass vacuously.
      assert.equal(built.path, row.path);
      const parsed = new URL(built.url.replace(/^ws/, "http"));
      assert.equal(parsed.pathname, row.path, "the pathname of the built URL, parsed rather than matched");

      // And it is NOT <the other route>.
      assert.notEqual(parsed.pathname, row.other);
      // The vacuity trap, made explicit: a substring test would pass for the wrong route.
      if (row.path === "/ws/terminal") {
        assert.ok("/ws/terminal-view".includes("/ws/terminal"), "…which is precisely why the check above is a WHOLE-path comparison");
      }

      // And the route is the SOURCE's own declaration, not something the call site chose.
      assert.equal(built.path, SOURCES[row.source].path);
      const relabelled = terminalSocketUrl({ ...SOURCES[row.source], kind: "some-future-source" }, row.params, { origins: row.origins });
      assert.equal(relabelled.path, row.path, "the route came off the descriptor, not off the kind");
    },
  })),
];
