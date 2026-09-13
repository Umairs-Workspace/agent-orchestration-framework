// Fitness function: acd-fleet-filter-read-only (m47 / ADR-002) —
//
//   "The repo filter is READ-SIDE ONLY, and it is CLIENT-SIDE. It reaches no wire: the status
//    route's accepted input stays exactly one parameter, the fleet client mints no filter
//    parameter, and `src/` grows no home for the filter at all."
//
// EXPECTED, at refine time (2026-08-10): **3 GREEN on arrival.** This is a RATCHET, not a
// forecast — it pins a property the current tree already has, so the accident that would break it
// cannot happen quietly. m45's table draws the same distinction for `acd-shell-bus-single-host`
// and it is worth keeping: a ratchet written at refine forecasts a contract; a ratchet that is
// green on arrival preserves one. Conflating them is how a green test gets mistaken for a
// satisfied forecast.
//
// WHY THE FILTER IS CLIENT-SIDE, and therefore why this file is the honest pin. Both mechanisms
// already exist: `queryGlobalMeshStatus({ workspaceId })` narrows server-side (it is how
// `?scope=local` is answered, `mesh-ui-serve.mjs:556-564`), and `filterToWorkspace` narrows
// client-side. m47/ADR-002 chooses the client on three measurements:
//   (1) the switch is an INTERACTION, not a page load — a server-side filter makes the filter a
//       third key on the poll effect (Fleet.tsx:147-159), so every change costs a round trip and
//       every poll re-sends it;
//   (2) a request parameter WIDENS the accepted-input surface of a route 26 modules depend on —
//       today `/api/mesh/status` validates exactly one parameter and refuses an unrecognised
//       value with a coded 400 (`mesh-ui-serve.mjs:543-547`), so `?repo=` would need its own
//       validation branch, its own refusal code, and a decision about what an unknown workspace
//       means over the wire;
//   (3) THE DECIDING ONE — the server's narrowing DOES NOT FILTER THE NODE ROSTER, on purpose
//       (`src/global-node-registry.mjs:170-172`, pinned behaviourally by
//       `acd-mesh-ui-local-filter-preserves-status`). A server-side repo filter would therefore
//       return every node in the mesh under a repo filter — precisely "a filter that narrows one
//       region and not another", which SPEC says is worse than no filter.
//
// WHAT THIS FILE IS *NOT*. It does not re-assert the fleet face's read-only posture — that is
// `acd-mesh-ui-read-only` (the route table + the 405s) and `acd-fleet-face-single-mutation-route`
// (the ONE write exception), both green and both untouched by m47. SPEC requires those to stay
// green UNTOUCHED, and the cheapest way to keep a promise like that is to make it structurally
// impossible to break rather than to remember it. That is the claim here: the filter has no
// server-side home at all, so nothing they watch is edited.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MESH_UI_SERVE = path.join(repoRoot, "src", "mesh", "ui-serve.mjs");
const GLOBAL_MESH_QUERY = path.join(repoRoot, "src", "global-mesh-query.mjs");
const FLEET_API_TS = path.join(repoRoot, "ui", "src", "fleet", "api.ts");

// The status route's ENTIRE accepted input, today and after m47 (ADR-002). One key.
const STATUS_ROUTE_QUERY_KEYS = ["scope"];

// The page-query vocabulary a repo filter would introduce server-side. `workspaceId` is
// deliberately NOT here: it is a legitimate API ARGUMENT on `/api/mesh/board-url`
// (mesh-ui-serve.mjs:315) and a legitimate OPTION on queryGlobalMeshStatus — the thing this file
// forbids is the FILTER acquiring a server-side home, not the workspace id existing.
const FILTER_QUERY_KEYS = ["repo", "repoFilter", "workspaceFilter"];

// Strip comments LINE-FIRST, then blocks — and the ORDER is the whole point. TECH_DEBT item 24
// ("twenty-FIVE source-reading fitness functions can be BLINDED by a comment") bites THIS FILE'S
// subject harder than any other in the repo, and it was measured here rather than feared:
// `src/mesh/ui-serve.mjs:297-299` carries a LINE comment containing `//api/*`. Under the usual
// block-first order that `/*` opens a block-comment run for the block stripper, which then eats
// everything up to the next `*/` — **9,192 characters of real code, INCLUDING THE ENTIRE ROUTE
// TABLE** (53,188 raw → 10,458 block-first → 19,650 line-first, measured 2026-08-10). A route-key
// sweep over that wreckage would have returned "no keys named" and read as GREEN.
// Stripping line comments first removes the `//api/*` line before any `/*` can be seen, and it is
// byte-identical on every other file this milestone reads (Fleet.tsx, api.ts, scope.mjs,
// routes.mjs, shell-nav.mjs, global-mesh-query.mjs — all measured). The self-check in the first
// assertion below pins the ordering so it cannot be "tidied" back.
function stripComments(source) {
  return source.replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, " ");
}

// The `/api/mesh/status` handler, sliced out of the face so the assertion is about THAT route's
// accepted input rather than the file's. The next route marker after it is the catch-all
// `pathname.startsWith("/api/")` guard (mesh-ui-serve.mjs:583).
function statusRouteSlice(source) {
  const start = source.indexOf('pathname === "/api/mesh/status"');
  assert.ok(start >= 0, "src/mesh/ui-serve.mjs declares the GET /api/mesh/status route");
  const end = source.indexOf('pathname.startsWith("/api/")', start);
  assert.ok(end > start, "the status route is followed by the catch-all /api/* guard — the slice is bounded");
  return source.slice(start, end);
}

function queryKeysNamedIn(slice) {
  return [...new Set([...slice.matchAll(/searchParams\.(?:get|getAll|has)\(\s*["']([^"']+)["']/g)].map((m) => m[1]))].sort();
}

export const archTests = [
  {
    name: "arch/47 ADR-002 (acd-fleet-filter-read-only): the GET /api/mesh/status route's accepted input is EXACTLY `scope` — the repo filter never reaches the wire",
    run: async () => {
      const source = stripComments(await readFile(MESH_UI_SERVE, "utf8"));
      const slice = statusRouteSlice(source);
      const keys = queryKeysNamedIn(slice);

      assert.deepEqual(
        keys,
        [...STATUS_ROUTE_QUERY_KEYS].sort(),
        `the /api/mesh/status route reads the query key(s) ${JSON.stringify(keys)} — m47/ADR-002 says its accepted input stays exactly ${JSON.stringify(STATUS_ROUTE_QUERY_KEYS)}.\n`
          + "A repo parameter here would need its own validation branch, its own refusal code (the route 400s an unrecognised ?scope=, mesh-ui-serve.mjs:543-547) and a decision about what an unknown workspace id means over the wire — every one of them inherited by a route 26 modules depend on. And it would inherit the server's node semantics, which deliberately DO NOT filter the roster (src/global-node-registry.mjs:170-172), i.e. it would return every node in the mesh under a repo filter: exactly the \"narrows one region and not another\" SPEC calls worse than none.\n"
          + "If the payload ever genuinely outgrows the client, ADR-002's overturn clause says the parameter goes on as an EXTENSION of the `workspaceId` option queryGlobalMeshStatus already takes — never a second option beside it — and this ADR is superseded rather than quietly widened.",
      );

      // NON-VACUITY, three halves. First and most important: the STRIPPER did not blind the
      // detector. TECH_DEBT item 24's shape is live in this exact file — mesh-ui-serve.mjs:297-299
      // is a LINE comment containing `//api/*` — and under block-first stripping it deletes the
      // whole route table, after which every assertion above passes by seeing nothing.
      assert.ok(
        source.length > 15000,
        `the comment stripper blinded the detector: ${source.length} chars survived of a ~53,000-char file. That is TECH_DEBT item 24 — mesh-ui-serve.mjs:297-299's line comment contains \`//api/*\`, whose \`/*\` opens a block-comment run for a block-first stripper, eating 9,192 characters INCLUDING THE ROUTE TABLE. Strip line comments FIRST. A route sweep over the wreckage returns "no keys named" and reads as green.`,
      );
      assert.ok(
        stripComments('const a = 1; // note: //api/* dodges the guard\nif (pathname === "/api/mesh/status") { keep(); }\n').includes("/api/mesh/status"),
        "self-check: the stripper survives TECH_DEBT item 24's exact shape — a line comment containing `/*` must not delete the code after it",
      );
      // Second and third: the slicer really found the real route and really read a key out of it,
      // and the detector really fires on a planted second parameter.
      assert.ok(slice.length > 200, `the status route slice is real (non-vacuous): ${slice.length} chars`);
      assert.ok(keys.includes("scope"), "the detector found the route's REAL query key — so an exact match means absence of a second one, not a broken detector");
      const plantedKeys = queryKeysNamedIn(
        'pathname === "/api/mesh/status" ... const requestedScope = requestUrl.searchParams.get("scope"); const repo = requestUrl.searchParams.get("repo");',
      );
      assert.deepEqual(plantedKeys, ["repo", "scope"], "self-check: the detector FIRES on a planted second query parameter on the status route — the broken half");
    },
  },

  {
    name: "arch/47 ADR-002 (acd-fleet-filter-read-only): the fleet CLIENT mints no filter parameter — fleetApi.status still takes only a scope, and no fetch in api.ts names a repo key",
    run: async () => {
      const source = stripComments(await readFile(FLEET_API_TS, "utf8"));

      // The ONE fleet-data read still takes exactly the scope (api.ts:278-282). If the filter ever
      // rides the request, it rides it through here — so this is the one signature to pin.
      assert.match(
        source.replace(/\s+/g, " "),
        /status\s*\(\s*scope\?\s*:\s*["']global["']\s*\|\s*["']local["']\s*\)/,
        "fleetApi.status must keep its single `scope?: \"global\" | \"local\"` parameter — m47/ADR-002: the repo filter is applied to the payload the client ALREADY HOLDS, so it never becomes a request argument. A second parameter here is the first half of a server-side filter.",
      );

      const hits = FILTER_QUERY_KEYS.flatMap((key) => {
        const found = [];
        if (new RegExp(`[?&]${key}=`).test(source)) found.push(`a \`?${key}=\` request literal`);
        if (new RegExp(`\\.(?:get|set|append)\\(\\s*["']${key}["']`).test(source)) found.push(`a URLSearchParams accessor for "${key}"`);
        return found;
      });
      assert.deepEqual(
        hits,
        [],
        `ui/src/fleet/api.ts mints a request carrying the filter (${hits.join(", ")}). The filter is CLIENT-SIDE (m47/ADR-002): no new fetch, no re-poll, no request parameter — which is also what keeps the filter switch synchronous with the click instead of one round trip and one keep-last-good poll behind it (Fleet.tsx:127-159).`,
      );

      // Non-vacuity: the detector reads THIS file's real request-building, and fires on a plant.
      assert.ok(
        /\/api\/mesh\/status/.test(source) && /URLSearchParams/.test(source),
        "the detector is looking at the real client (it names /api/mesh/status and builds a URLSearchParams for board-url) — so an empty result means absence, not a broken detector",
      );
      assert.ok(
        /[?&]repo=/.test('await fetch(`/api/mesh/status?scope=${scope}&repo=${repo}`)'),
        "self-check: the detector FIRES on a planted `&repo=` request literal — the broken half",
      );
      // …and stays silent on the LEGITIMATE workspaceId argument the board-url call already sends.
      assert.ok(
        !FILTER_QUERY_KEYS.some((key) => new RegExp(`\\.(?:get|set|append)\\(\\s*["']${key}["']`).test('new URLSearchParams({ workspaceId, ref })')),
        "self-check: board-url's legitimate `workspaceId` argument is not a filter parameter — the identity existing server-side is fine; the FILTER acquiring a server-side home is not",
      );
    },
  },

  {
    name: "arch/47 ADR-002 (acd-fleet-filter-read-only): `src/` grows NO home for the filter — no filter query key in the fleet face or the query seam, and queryGlobalMeshStatus keeps ONE narrowing option",
    run: async () => {
      for (const file of [MESH_UI_SERVE, GLOBAL_MESH_QUERY]) {
        const source = stripComments(await readFile(file, "utf8"));
        const rel = path.relative(repoRoot, file).replaceAll("\\", "/");
        const named = FILTER_QUERY_KEYS.filter(
          (key) => new RegExp(`\\.(?:get|getAll|has)\\(\\s*["']${key}["']`).test(source) || new RegExp(`[?&]${key}=`).test(source) || new RegExp(`\\boptions\\.${key}\\b`).test(source),
        );
        assert.deepEqual(
          named,
          [],
          `${rel} names the filter vocabulary ${named.join(", ")}. m47/ADR-002 states it as an INVARIANT OF THE MILESTONE, not an expectation: \`src/\` is not edited by the filter at all. That is what makes SPEC's "the filter is read-side only; mesh-ui-read-only-contract.test.mjs stays green untouched" a CHECKABLE claim rather than a hope — nothing those suites watch is touched, so they cannot regress.`,
        );
      }

      // ONE narrowing option on the query seam. `workspaceId` is it — the same option `?scope=local`
      // already rides (global-mesh-query.mjs:48-51). A SECOND option beside it would be two
      // narrowings of one store column with no shared rule, which is the shape ADR-002's overturn
      // clause explicitly forecloses.
      const query = stripComments(await readFile(GLOBAL_MESH_QUERY, "utf8"));
      const options = [...new Set([...query.matchAll(/\boptions\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))].sort();
      assert.ok(options.includes("workspaceId"), `queryGlobalMeshStatus reads its ONE narrowing option \`options.workspaceId\` (non-vacuous; found ${JSON.stringify(options)})`);
      const narrowingOptions = options.filter((name) => /workspace|repo|filter|scope/i.test(name));
      assert.deepEqual(
        narrowingOptions,
        ["workspaceId"],
        `queryGlobalMeshStatus takes more than one narrowing option (${narrowingOptions.join(", ")}). There is ONE: \`workspaceId\`. m47/ADR-005 keeps \`?scope=\` and the repo filter as two DIFFERENT questions that compose by intersection — scope at the server, repo at the client — not as two server-side options that a later reader must work out the precedence of.`,
      );

      // Self-check: the option detector fires on a planted sibling.
      const plantedOptions = [...new Set([...'const ws = options.workspaceId ?? null; const repo = options.repoFilter ?? null;'.matchAll(/\boptions\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))].sort();
      assert.deepEqual(plantedOptions, ["repoFilter", "workspaceId"], "self-check: the detector FIRES on a planted second narrowing option — the broken half");
    },
  },
];
