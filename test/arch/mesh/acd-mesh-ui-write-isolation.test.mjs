// Fitness function: acd-mesh-ui-write-isolation (milestone 25 / story 02;
// ARCHITECTURE 25/ADR-003 decision 5 + ADR-004 read-only — the 03/ADR-004
// write-isolation posture mirrored onto the fleet face; the mesh-face sibling of
// acd-board-write-isolation).
//
// "The fleet face performs ZERO fs write and NO shell-out (read-only render); it
//  serves NO /ws/terminal and no write route."
//
// SUPERSEDED IN PLACE (m27 → m38 → m50), and the sentence above is kept because the
// zero-fs-write / no-shell-out half of it has never changed. What changed is the
// second half: the face now carries a BOUNDED, NAMED write surface of exactly TWO
// routes — POST /api/mesh/assign (m38/ADR-012, wrapping `assignWork`) and
// POST /api/mesh/session (m50/ADR-001, pushing ONE relay envelope). Neither writes a
// file or shells out; the mutation is inside the verb in one case and on the WORKER
// in the other. The gate's job is to keep the enumeration an enumeration.
//
// A structural grep of src/mesh/ui-serve.mjs (comments discounted) PLUS a
// behavioural snapshot: serving the fleet view end-to-end (a static GET, several
// GET /api/mesh/status reads) mutates NO file under the workspace fixture.
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, mkdir, writeFile, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveMeshUi, meshUiDist } from "../../../src/mesh/ui-serve.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MESH_UI_SERVE = path.join(repoRoot, "src", "mesh", "ui-serve.mjs");

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// ── milestone 50 / story 02 (ADR-001 decision 5) — THE BOUND, ENUMERATED ─────────
//
// The fleet face's write surface grew from ONE named route to TWO. That is an
// EXPANSION OF AN ENUMERATION, never a relaxation into a pattern: the m25→m27→m38
// history of this file is a bound that was superseded IN PLACE each time, and
// `/api/mesh/*`-as-writable was considered and rejected by ADR-001 ("defeats the
// purpose of a bound").
//
// So the detector below is stated POSITIVELY over the whole declared route table
// rather than as a deny-list of the two names anyone happened to think of
// (`route|revoke`). A deny-list is green for `/api/mesh/terminate` — a third write
// route nobody enumerated — which is exactly the failure the locked task feature's
// Examples table asks about. Every `pathname === "/api/mesh/<name>"` the face
// declares must be in ONE of the two lists below, and the READ list is stated here
// too so a future read route cannot be smuggled in as "not a write".
//
// milestone 50 / story 04 (ADR-008 decision 5) — the READ list grows by one and THE WRITE
// LIST DOES NOT MOVE. That non-movement is the load-bearing statement of story 04, so it
// is written here as the thing a reviewer reads first: `session-outcome` is a GET that
// reads an in-memory Map, and the mutation surface is still exactly two named routes.
const READ_ROUTES = Object.freeze(["board-url", "session-outcome", "status"]);
const WRITE_ROUTES = Object.freeze(["assign", "session"]);

// THE CAPTURE IS THE WHOLE STRING LITERAL, NOT A NAME-SHAPE (review fix, 2026-08-14).
// It used to be `[a-zA-Z0-9-]+`, a character class that cannot match `/` or `_` — so
// `pathname === "/api/mesh/session/kill"` and `pathname === "/api/mesh/kill_session"`
// were INVISIBLE to this detector and left the gate green while its own name promised
// "any third write route fires whatever it is named". A route name is whatever the
// author typed between the quotes, so that is what is read: `[^"']+` is bounded by the
// literal's own closing quote and therefore cannot swallow adjacent source, and it
// cannot start matching a read route either (the READ_ROUTES/WRITE_ROUTES enumeration
// below is what decides membership — this function only reports what is declared).
function declaredMeshRoutes(source) {
  const names = [...source.matchAll(/pathname\s*===\s*["']\/api\/mesh\/([^"']+)["']/g)].map((match) => match[1]);
  return [...new Set(names)].sort();
}

// The "no OTHER write route" detector: every declared /api/mesh/* name that is
// neither a known read route nor a named member of the write allowlist. Empty is
// green; anything in it is a route the bound does not know about.
function unenumeratedRoutes(source) {
  return declaredMeshRoutes(source).filter((name) => !READ_ROUTES.includes(name) && !WRITE_ROUTES.includes(name));
}

// ══ THE FORM EVERY ROUTE TABLE IS BLIND TO (structural review, 2026-08-14) ═════════════
//
// EVERY detector above — and every sibling detector in the other three route-table gates
// (`acd-mesh-ui-read-only`, `acd-fleet-face-single-mutation-route`, and the
// `pathname === "/api/mesh/status"` slice in `acd-fleet-filter-read-only`) — anchors on
// `pathname\s*===\s*["']/api/mesh/…`. `===` is the ONLY form any of them can see.
//
// MEASURED, NOT INFERRED. This was planted into the REAL src/mesh/ui-serve.mjs:
//
//     if (pathname.startsWith("/api/mesh/session/")) {
//       if (request.method === "POST") { sendJson(response, 200, { ok: true, killed: … }); return; }
//       sendMethodNotAllowed(response, "POST");
//       return;
//     }
//
// A THIRD WRITE ROUTE, POST, answering 200 — and all four route-table detectors stayed
// green, as did test/mesh/ui/mesh-ui-read-only-contract.test.mjs and test/command/advertised-paths.test.mjs.
// It breaks ADR-001 decision 5 as written ("the declared write routes are EXACTLY
// {assign, session}, never more") while satisfying every instrument that decision has.
//
// It is also the unclosed half of ADR-008 decision 5's OWN argument, which named the hazard
// verbatim — "A path-parameter route would evade the bound rather than join it" — and then
// shipped no detector against it. And it is the SECOND instance of "the route detector
// cannot see a route" in this one file in a single day: the first was the
// `[a-zA-Z0-9-]+` name capture widened to `[^"']+` above.
//
// SO THE CLAUSE IS AN ABSENCE SWEEP, and the remedy it demands is one line: declare the
// route with `pathname ===` and let it join the enumeration. That is not a workaround —
// ADR-001 decision 5's bound IS an enumeration of names, and a route whose name is a
// pattern cannot be a member of it.
//
// THE ONE SANCTIONED PREFIX TEST ON THIS FACE STAYS GREEN BY SHAPE, not by exemption:
// `pathname.startsWith("/api/")` (the catch-all 404 for any unrecognised API path) names
// no `mesh` segment, so it is not matched below. It is also a REFUSAL rather than a route,
// which is the distinction the forms below are drawn around.
const PREFIX_ROUTE_FORMS = Object.freeze([
  {
    label: 'pathname.startsWith("/api/mesh…")',
    pattern: /pathname\s*\.\s*startsWith\s*\(\s*["'`]\/api\/mesh/,
  },
  {
    label: "pathname.match(/^\\/api\\/mesh…/)",
    pattern: /pathname\s*\.\s*match\s*\(\s*\/\^?\\\/api\\\/mesh/,
  },
  {
    label: "/^\\/api\\/mesh…/.test(pathname)",
    pattern: /\/\^?\\\/api\\\/mesh[^\n]*?\/\s*\.\s*test\s*\(\s*pathname\s*\)/,
  },
  {
    label: 'new RegExp("^/api/mesh…").test(pathname)',
    pattern: /new\s+RegExp\s*\(\s*["'`]\^?\/api\/mesh/,
  },
]);

const PREFIX_ROUTE_REFUSAL = "A PREFIX- or REGEX-matched /api/mesh route is INVISIBLE to all four route tables: "
  + "every one of them anchors on `pathname === \"/api/mesh/<name>\"`, so a route matched any other way is not "
  + "merely unenumerated — it is unseen, and the gates that claim to bound this face's write surface read green "
  + "while it serves POSTs. (Measured: `if (pathname.startsWith(\"/api/mesh/session/\")) { … 200 … }` planted into "
  + "the real face left every detector, mesh-ui-read-only-contract and advertised-paths green.) Declare the route "
  + "with `pathname === \"/api/mesh/<name>\"` so it JOINS the enumeration — ADR-001 decision 5's bound is a list of "
  + "NAMES, and a route whose name is a pattern cannot be a member of one. A path parameter belongs in the query "
  + "string or the body, which is where the two existing write routes put theirs.";

function prefixMatchedRouteProblems(source) {
  const problems = [];
  for (const form of PREFIX_ROUTE_FORMS) {
    if (form.pattern.test(source)) {
      problems.push(`mesh-ui-serve.mjs matches a mesh route with \`${form.label}\`. ${PREFIX_ROUTE_REFUSAL}`);
    }
  }
  return problems;
}

// ── milestone 50 / story 04 (ADR-008 FF-D) — THE OUTCOME ROUTE STAYS A MAP READ ───
//
// TECH_DEBT item 44 measured that `/api/mesh/session` is 63 lines VERBATIM-IDENTICAL to
// `/api/mesh/assign` across five blocks, that three fitness functions now REQUIRE those
// copies in place, and closed with "do this BEFORE a fourth write route is added, not
// after". ADR-008's route is shaped so it adds ZERO instances of that duplication — being
// a GET it needs no SECURITY T13 admission guard, no `readJsonBody`, no
// `queryGlobalMeshStatus` → row → `existsSync` probe and no `controlNodeId()`.
//
// That is asserted here rather than trusted, because "it is only a Map read" is exactly
// the kind of claim that stays in a comment while the region grows a store open. The
// region is cut by BRACE BALANCE on the language's own structure — never a character
// window, which reaches into a neighbouring branch and reports the sibling's calls as
// this one's (the correction acd-fleet-face-single-mutation-route and
// acd-fleet-board-link-resolved both had to make).
const OUTCOME_ROUTE = "/api/mesh/session-outcome";
const OUTCOME_ROUTE_FORBIDDEN = Object.freeze([
  "queryGlobalMeshStatus(",
  "existsSync(",
  "controlNodeId(",
  "readJsonBody(",
  "assignWork(",
  ".push(",
]);

function routeRegion(source, route) {
  const anchor = new RegExp(`if\\s*\\(\\s*pathname\\s*===\\s*["']${route}["']\\s*\\)\\s*\\{`).exec(source);
  if (anchor == null) return null;
  const open = anchor.index + anchor[0].length - 1;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

function outcomeRouteProblems(source) {
  const region = routeRegion(source, OUTCOME_ROUTE);
  if (region == null) {
    return [`no brace-balanced \`if (pathname === "${OUTCOME_ROUTE}") { … }\` region could be cut — this is NOT FOUND rather than a claim about the rule: the route is either gone (ADR-008's lane has no reader) or reshaped, and this detector must be reshaped with it.`];
  }
  const problems = [];
  for (const call of OUTCOME_ROUTE_FORBIDDEN) {
    if (region.includes(call)) {
      problems.push(`${OUTCOME_ROUTE} calls \`${call}\` — it is a method guard and a Map read, and nothing else. A store projection, an fs probe, a body read, a mint or a relay push here is TECH_DEBT item 44's sixth copy arriving on a route that was argued as cheap.`);
    }
  }
  // …and the POSITIVE half, so an EMPTY region cannot satisfy the negatives above: the
  // route must actually guard its method and actually read the registry.
  if (!/request\.method\s*!==\s*["']GET["']\s*&&\s*request\.method\s*!==\s*["']HEAD["']/.test(region)) {
    problems.push(`${OUTCOME_ROUTE} does not guard itself to GET/HEAD before answering`);
  }
  if (!/spawnOutcomes\.read\s*\(/.test(region)) {
    problems.push(`${OUTCOME_ROUTE} makes no \`spawnOutcomes.read(\` call — the route answers without reading the registry, which is a route with no subject`);
  }
  return problems;
}

async function snapshotDir(dir) {
  const snap = new Map();
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const info = await stat(full);
        snap.set(full, `${info.mtimeMs}:${await readFile(full, "utf8")}`);
      }
    }
  }
  await walk(dir);
  return snap;
}

function diffSnapshots(before, after) {
  const changed = [];
  for (const [file, value] of after) if (before.get(file) !== value) changed.push(file);
  for (const file of before.keys()) if (!after.has(file)) changed.push(file);
  return changed;
}

async function makeRepo() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-ui-write-iso-"));
  const workDir = path.join(repo, "wiki", "work");
  const meshDir = path.join(repo, ".aof", "mesh");
  await mkdir(path.join(repo, ".aof"), { recursive: true });
  await mkdir(path.join(meshDir, "nodes"), { recursive: true });
  await mkdir(path.join(meshDir, "presence"), { recursive: true });
  await mkdir(path.join(meshDir, "registry"), { recursive: true });
  await writeFile(
    path.join(repo, ".aof", "aof.config.json"),
    JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(meshDir, "nodes", "n1.json"),
    JSON.stringify({ nodeId: "n1", host: "n1", os: "linux", runtimes: [], skills: [], aofVersion: "0.1.0", publishedAt: "2026-06-29T00:00:00.000Z" }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(meshDir, "presence", "n1.json"),
    JSON.stringify({ nodeId: "n1", heartbeatAt: new Date().toISOString(), activeRuns: [], aofVersion: "0.1.0" }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(meshDir, "registry", "group.json"),
    JSON.stringify({ roster: [{ nodeId: "n1", admittedAt: "2026-07-01T00:00:00.000Z", boards: ["b1"] }], boards: ["b1"], pending: [], revocations: [] }, null, 2),
    "utf8"
  );
  return { repo, workDir };
}

async function writeDist(dir) {
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(
    path.join(dir, "index.html"),
    "<!doctype html><html><head><script type=\"module\" src=\"/assets/index-abc123.js\"></script></head><body><div id=\"root\"></div></body></html>\n",
    "utf8"
  );
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "export const x = 1;\n", "utf8");
  return dir;
}

export const archTests = [
  {
    name: "arch/25 ADR-004: mesh-ui-serve.mjs performs no fs write and no shell-out (read-only render)",
    run: async () => {
      const source = stripComments(await readFile(MESH_UI_SERVE, "utf8"));
      // No fs-write call form.
      for (const verb of ["writeFile", "appendFile", "writeFileSync", "appendFileSync", "mkdir", "rm", "rmdir", "unlink", "rename"]) {
        assert.ok(
          !new RegExp(`\\b${verb}\\s*\\(`).test(source),
          `mesh-ui-serve.mjs makes no ${verb}( call — the fleet face writes nothing`
        );
      }
      // No shell-out.
      assert.ok(!/child_process/.test(source), "mesh-ui-serve.mjs imports no child_process");
      for (const verb of ["spawn", "spawnSync", "exec", "execSync", "execFile"]) {
        assert.ok(
          !new RegExp(`\\b${verb}\\s*\\(`).test(source),
          `mesh-ui-serve.mjs makes no ${verb}( shell-out`
        );
      }
    },
  },
  // milestone 27 / story 02 (ADR-006.2), then milestone 38 / story 04 (ADR-012) —
  // SUPERSEDED IN PLACE a second time: the m25 assertion "the fleet face writes
  // NOTHING and serves no write route" moved to a BOUNDED-WRITE shape at m27
  // (POST /api/mesh/issue, since RETIRED — `aof graph impact` confirms it is gone
  // from the live tree, ADR-012's codebase-graph grounding), and now moves again
  // to m38's bounded-write shape: POST /api/mesh/assign, wrapping `assignWork`
  // VERBATIM (no registry/invoke door this time — ADR-012's own grounding: "the
  // UI route becomes an 8th CALLER of that SAME core, never a re-implementation").
  // XOR/consistency-phrased across THREE trees: the m25 zero-write tree (vacuously
  // satisfied), the RETIRED m27 issue tree (kept live so a reversion is still
  // caught), and the CURRENT m38 assign tree. RED in any broken half: a second
  // write route, a write path that bypasses assignWork, or a /ws/terminal.
  //
  // milestone 50 / story 02 (ADR-001 decision 5) — SUPERSEDED IN PLACE a THIRD time,
  // and this time the change is to the SIZE of the named set rather than to which
  // tree is live: the bounded-write shape is now EXACTLY {assign, session}. The assign
  // tree's own clauses (wraps `assignWork`, no `insertAssignment`, no
  // assignment-record import) are untouched — the session route mints nothing and
  // therefore has no verb to bypass; what it must not do is write a file or shell out,
  // which the tree-independent clauses below already assert over the whole file.
  {
    name: "arch/25-27-38-50 ADR-003/004/006.2/012/50-001: mesh-ui-serve.mjs serves no /ws/terminal, and is EITHER write-nothing (m25) OR bounded-write to exactly POST /api/mesh/issue via invoke (m27, retired) OR bounded-write to exactly the NAMED set {POST /api/mesh/assign via assignWork, POST /api/mesh/session} (m38/ADR-012 + m50/ADR-001, XOR/consistency)",
    run: async () => {
      const source = stripComments(await readFile(MESH_UI_SERVE, "utf8"));

      // No terminal websocket route/path — UNCHANGED on every tree.
      assert.ok(!/["']\/ws\/terminal["']/.test(source), "mesh-ui-serve.mjs serves no /ws/terminal path");
      assert.ok(!/["']\/ws\//.test(source) || !/pathname\s*===\s*["']\/ws\//.test(source), "mesh-ui-serve.mjs declares no /ws/ HTTP route");

      const declaresIssueRoute = /pathname\s*===\s*["']\/api\/mesh\/issue["']/.test(source);
      const declaresAssignRoute = /pathname\s*===\s*["']\/api\/mesh\/assign["']/.test(source);
      const declaresSessionRoute = /pathname\s*===\s*["']\/api\/mesh\/session["']/.test(source);
      const declaresOtherWriteRoute = /pathname\s*===\s*["']\/api\/mesh\/(route|revoke)["']/.test(source);

      assert.ok(
        !(declaresIssueRoute && declaresAssignRoute),
        "mesh-ui-serve.mjs never declares BOTH /api/mesh/issue and /api/mesh/assign — at most one write-route tree is live"
      );
      // m50/ADR-001 — the two NAMED write routes, each asserted by name. The
      // enumeration test below is what forbids a third; these two are the positive
      // half a deny-list cannot state (a face that lost the session route entirely
      // would satisfy every negative assertion in this file).
      assert.ok(
        declaresAssignRoute,
        "mesh-ui-serve.mjs declares pathname === \"/api/mesh/assign\" — the m38 named write route"
      );
      assert.ok(
        declaresSessionRoute,
        "mesh-ui-serve.mjs declares pathname === \"/api/mesh/session\" — the m50 named write route (ADR-001 decision 1)"
      );
      assert.ok(
        !declaresOtherWriteRoute,
        "mesh-ui-serve.mjs declares no /api/mesh/route|revoke sibling — never a THIRD write route"
      );

      if (!declaresIssueRoute && !declaresAssignRoute) {
        // The m25 zero-write tree: no write route at all — vacuously satisfied.
        assert.ok(
          /request\.method\s*!==\s*["']GET["']/.test(source),
          "mesh-ui-serve.mjs guards its one route to GET (read-only) — a write method is rejected, never dispatched"
        );
      } else if (declaresIssueRoute) {
        // The RETIRED m27 tree — kept live only so a reversion is still caught by
        // this detector; the current tree (below) is what mesh-ui-serve.mjs ships.
        assert.ok(
          /invoke\s*\(\s*["']mesh:issue["']/.test(source),
          "mesh-ui-serve.mjs reaches the mutation via invoke(\"mesh:issue\") — the ONE registry door"
        );
        assert.ok(
          !/from\s*["']\.\/mesh-issuance\.mjs["']/.test(source) && !/require\(\s*["']\.\/mesh-issuance\.mjs["']\s*\)/.test(source),
          "mesh-ui-serve.mjs imports NO ./mesh-issuance.mjs — the mutation reaches ONLY through invoke"
        );
      } else {
        // The CURRENT m38 / ADR-012 tree: POST /api/mesh/assign wraps assignWork
        // VERBATIM — no low-level global_assignments writer reachable except
        // through that verb (ADR-012 inv.2).
        assert.ok(
          /assignWork\s*\(/.test(source),
          "mesh-ui-serve.mjs reaches the mutation via assignWork(...) — the gated verb, wrapped verbatim"
        );
        assert.ok(
          !/insertAssignment\s*\(/.test(source),
          "mesh-ui-serve.mjs makes no direct insertAssignment( call — the mint reaches ONLY through assignWork's own gates"
        );
        assert.ok(
          !/from\s*["']\.\/assignment-record\.mjs["']/.test(source),
          "mesh-ui-serve.mjs imports NO ./assignment-record.mjs (the low-level table writer) — the mutation reaches ONLY through the verb"
        );
      }

      // No fs-write call form and no shell-out, on EVERY tree — the face itself
      // performs no mutation of its own regardless of which half is satisfied.
      for (const verb of ["writeFile", "appendFile", "writeFileSync", "appendFileSync", "mkdir", "rm", "rmdir", "unlink", "rename"]) {
        assert.ok(
          !new RegExp(`\\b${verb}\\s*\\(`).test(source),
          `mesh-ui-serve.mjs makes no ${verb}( call — the face itself writes nothing (the mutation, if any, is behind the verb/invoke)`
        );
      }
      assert.ok(!/child_process/.test(source), "mesh-ui-serve.mjs imports no child_process");
      for (const verb of ["spawn", "spawnSync", "exec", "execSync", "execFile"]) {
        assert.ok(
          !new RegExp(`\\b${verb}\\s*\\(`).test(source),
          `mesh-ui-serve.mjs makes no ${verb}( shell-out`
        );
      }

      // --- m03 non-vacuous planted-violation self-check ---
      // A broken-half fixture: a THIRD write route (/api/mesh/route) declared
      // alongside BOTH named ones — the detector must FIRE on this shape, proving
      // it is not vacuously green on the guarded m38+m50 tree either.
      const plantedSecondWriteRoute = stripComments(`
        if (pathname === "/api/mesh/assign") {
          const result = await assignWork(workspace, body.ref, body.nodeId, ctx);
          sendJson(response, 200, result);
        }
        if (pathname === "/api/mesh/session") {
          await terminalInputPush.push(buildSessionSpawnEnvelope(nodeId, frame));
          sendJson(response, 200, { ok: true, sessionId, nodeId, workspaceId });
        }
        if (pathname === "/api/mesh/route") {
          sendJson(response, 200, { ok: true });
        }
      `);
      assert.ok(
        /pathname\s*===\s*["']\/api\/mesh\/route["']/.test(plantedSecondWriteRoute),
        "self-check: the detector sees the planted /api/mesh/route sibling"
      );
      assert.ok(
        /pathname\s*===\s*["']\/api\/mesh\/(route|revoke)["']/.test(plantedSecondWriteRoute),
        "self-check: the detector FIRES on a planted SECOND write route (/api/mesh/route) beside /api/mesh/assign — this is the broken half"
      );

      // A broken-half fixture: /api/mesh/assign reaching the mutation via a DIRECT
      // insertAssignment call, bypassing assignWork's own gates.
      const plantedBypassVerb = stripComments(`
        import { insertAssignment } from "./assignment-record.mjs";
        if (pathname === "/api/mesh/assign") {
          insertAssignment(store, { itemRef: body.ref, targetNodeId: body.nodeId });
        }
      `);
      assert.ok(
        /insertAssignment\s*\(/.test(plantedBypassVerb) && /from\s*["']\.\/assignment-record\.mjs["']/.test(plantedBypassVerb),
        "self-check: the detector sees the planted direct insertAssignment bypass (the broken half — skipping the verb's gates)"
      );

      // The accepted guarded form (the shape this story ships — BOTH named write
      // routes) stays quiet on both checks above.
      const accepted = stripComments(`
        if (pathname === "/api/mesh/assign") {
          const result = await assignWork(assignWorkspace, ref, nodeId, { globalWorkStoreOptions: globalStoreOptions ?? {} });
          sendJson(response, 200, result);
        }
        if (pathname === "/api/mesh/session") {
          await terminalInputPush.push(buildSessionSpawnEnvelope(nodeId, frame));
          sendJson(response, 200, { ok: true, sessionId, nodeId, workspaceId });
        }
      `);
      assert.ok(
        !/pathname\s*===\s*["']\/api\/mesh\/(route|revoke)["']/.test(accepted),
        "self-check: the accepted two-route form declares no THIRD write route"
      );
      assert.deepEqual(
        unenumeratedRoutes(accepted),
        [],
        "self-check: the accepted two-route form is fully enumerated by the {assign, session} allowlist"
      );
      assert.ok(
        /assignWork\s*\(/.test(accepted) && !/insertAssignment\s*\(/.test(accepted),
        "self-check: the accepted form reaches the mutation via assignWork(...), never a direct insertAssignment("
      );
    },
  },
  // ══ milestone 50 / story 02 / task 01 — THE ENUMERATED WRITE ALLOWLIST ═════════
  //
  // The clause the locked feature is about: the face declares EXACTLY the two named
  // write routes, and ANY third — whatever it is called — fires. The predecessor
  // deny-list (`route|revoke`) could only see the two names its author thought of;
  // the Examples table's `/api/mesh/terminate` row is the one it would have passed.
  {
    name: "arch/50 ADR-001.5 (acd-mesh-ui-write-isolation): the fleet face's write allowlist is EXACTLY {assign, session} — every declared /api/mesh/* route is enumerated, and any third write route fires whatever it is named",
    run: async () => {
      const source = stripComments(await readFile(MESH_UI_SERVE, "utf8"));

      // NON-VACUITY FIRST: a detector that reads no routes is green for the same
      // reason a clean face is. (This file's own sibling gate was measured being fed
      // a comment-stripped wreck — TECH_DEBT item 24 — and finding nothing.)
      const declared = declaredMeshRoutes(source);
      assert.deepEqual(
        declared,
        ["assign", "board-url", "session", "session-outcome", "status"],
        "the real fleet face declares exactly the THREE READ routes (board-url, session-outcome, status) and the two NAMED write routes (assign, session) — no sixth /api/mesh/* route exists"
      );
      // m50/ADR-008: the two halves of the bound, stated SEPARATELY, because the story's
      // acceptance criterion is about the second one specifically. A read route joining the
      // enumeration must never be readable as the write set having grown.
      assert.deepEqual(
        WRITE_ROUTES,
        ["assign", "session"],
        "the WRITE allowlist is STILL exactly {assign, session} — story 04 adds a READ route and the mutation surface does not grow (ADR-008 decision 5)"
      );
      assert.ok(
        READ_ROUTES.includes("session-outcome") && !WRITE_ROUTES.includes("session-outcome"),
        "`session-outcome` is in the READ set and in NO write set"
      );
      assert.deepEqual(
        unenumeratedRoutes(source),
        [],
        "no /api/mesh/* route is declared outside the enumerated read/write lists"
      );

      // The locked Examples table, driven through the detector row by row: each
      // route name is planted into a fixture that ALREADY carries both sanctioned
      // routes, so a row can only fire because of the name under test.
      // The last two rows are TEST-INTERNAL additions (review fix, 2026-08-14) — not new
      // Examples rows in the locked feature, which is unchanged. They are the two shapes
      // the previous `[a-zA-Z0-9-]+` capture could not see AT ALL: a route with a PATH
      // SEPARATOR in its name and one with an UNDERSCORE. Both were planted into the real
      // src/mesh/ui-serve.mjs and confirmed to fire before the plants were reverted, so
      // the widened capture is armed against the real file and not just against fixtures.
      const rows = [
        { route: "assign", allowed: true },
        { route: "session", allowed: true },
        // m50/ADR-008 — the fifth route, ALLOWED because it is enumerated as a READ. The row
        // is here rather than merely in the list above so the enumeration is exercised
        // through the same detector every refused name is.
        { route: "session-outcome", allowed: true },
        { route: "route", allowed: false },
        { route: "revoke", allowed: false },
        { route: "terminate", allowed: false },
        { route: "session/kill", allowed: false },
        { route: "kill_session", allowed: false },
      ];
      for (const row of rows) {
        const fixture = stripComments(`
          if (pathname === "/api/mesh/status") { sendJson(response, 200, status); }
          if (pathname === "/api/mesh/board-url") { sendJson(response, 200, { url }); }
          if (pathname === "/api/mesh/assign") { const result = await assignWork(ws, ref, nodeId, ctx); sendJson(response, 200, result); }
          if (pathname === "/api/mesh/session") { await terminalInputPush.push(envelope); sendJson(response, 200, { ok: true, sessionId }); }
          if (pathname === "/api/mesh/${row.route}") { sendJson(response, 200, { ok: true }); }
        `);
        const fired = unenumeratedRoutes(fixture);
        if (row.allowed) {
          assert.deepEqual(fired, [], `Examples row "/api/mesh/${row.route}" is an ALLOWED named write route — the detector stays quiet`);
        } else {
          assert.deepEqual(
            fired,
            [row.route],
            `Examples row "/api/mesh/${row.route}" is NOT enumerated — the detector FIRES, naming it (a deny-list of {route, revoke} would have passed "terminate")`
          );
        }
      }

      // The locked "a planted third write route is detected" scenario, in its own
      // words: a fixture containing BOTH /api/mesh/assign AND /api/mesh/session AND
      // /api/mesh/route.
      const plantedThird = stripComments(`
        if (pathname === "/api/mesh/assign") { sendJson(response, 200, result); }
        if (pathname === "/api/mesh/session") { sendJson(response, 200, { ok: true, sessionId }); }
        if (pathname === "/api/mesh/route") { sendJson(response, 200, { ok: true }); }
      `);
      assert.deepEqual(
        unenumeratedRoutes(plantedThird),
        ["route"],
        "self-check: the 'no OTHER write route' assertion fires on the planted /api/mesh/route beside the two sanctioned ones"
      );

      // …and the second planted-violation shape the feature names: the session route
      // plus a SECOND unregistered one. Fires for the same reason, with the sanctioned
      // route present — so the detector cannot be passing merely because the fixture
      // is unfamiliar.
      const plantedBeside = stripComments(`
        if (pathname === "/api/mesh/session") { sendJson(response, 200, { ok: true, sessionId }); }
        if (pathname === "/api/mesh/route") { sendJson(response, 200, { ok: true }); }
      `);
      assert.ok(
        unenumeratedRoutes(plantedBeside).length > 0,
        "self-check: the detector fires on a planted /api/mesh/route beside /api/mesh/session (non-vacuous)"
      );

      // The BOUND MUST STAY A BOUND. A pattern allowlist (`/api/mesh/*` writable) is
      // the "fix" a future author reaches for when a third route is refused, and
      // ADR-001 considered and rejected exactly that. Stated as a self-check rather
      // than as prose: a detector built on a pattern would be quiet on `terminate`.
      const patternAllowlist = (fixtureSource) => /\/api\/mesh\//.test(fixtureSource);
      assert.ok(
        patternAllowlist(plantedThird) && unenumeratedRoutes(plantedThird).length > 0,
        "self-check: a PATTERN allowlist would pass the planted third route that the ENUMERATED one refuses — the bound is an enumeration, never a prefix"
      );
    },
  },
  // ══ milestone 50 / story 04 (structural review) — EVERY MESH ROUTE IS `===`-DECLARED ══
  {
    name: "arch/50 ADR-001.5 (acd-mesh-ui-write-isolation): src/mesh/ui-serve.mjs matches NO mesh route by prefix or regex — a `pathname.startsWith(\"/api/mesh/…\")`, `pathname.match(/^\\/api\\/mesh…/)` or `/^\\/api\\/mesh…/.test(pathname)` route is INVISIBLE to all four route tables, and a third write route can hide inside one",
    run: async () => {
      const source = stripComments(await readFile(MESH_UI_SERVE, "utf8"));

      // NON-VACUITY FIRST, and it is not the usual boilerplate here: this is an ABSENCE
      // sweep, so a stripper that ate the file, a rename, or a truncated read all produce
      // the same empty answer a clean face does. The file must be present and recognisable.
      assert.ok(source.length > 10000, `the real face was read (non-vacuous): ${source.length} chars after comment-stripping`);
      assert.ok(/pathname\s*===\s*["']\/api\/mesh\/status["']/.test(source), "…and it really is the fleet face — its status route is right there");

      assert.deepEqual(
        prefixMatchedRouteProblems(source),
        [],
        "every /api/mesh route on the real face is declared with `pathname ===`, so the enumeration the other clauses read is the WHOLE route table and not the part that happens to be spelled visibly",
      );

      // …AND THE `/api/` CATCH-ALL 404 STAYS LEGAL. It is the one prefix test this face
      // carries and it must not be collateral: asserted POSITIVELY, so a future tightening
      // of the forms above that starts refusing it fails HERE with the reason, rather than
      // being met by deleting the face's not-found branch.
      assert.ok(
        /pathname\s*\.\s*startsWith\s*\(\s*["']\/api\/["']\s*\)/.test(source),
        "the face still answers a clean 404 for any unrecognised /api/* path (ADR-003's disjoint-face rule) — that prefix test names no `mesh` segment and is a REFUSAL, not a route",
      );

      // ── THE PLANT, hand-written, and it is the EXACT shape that was planted into the real
      //    src/mesh/ui-serve.mjs during review and left all four route tables green ────────
      const clean = stripComments(`
        if (pathname === "/api/mesh/assign") { const result = await assignWork(ws, ref, nodeId, ctx); sendJson(response, 200, result); return; }
        if (pathname === "/api/mesh/session") { await terminalInputPush.push(envelope); sendJson(response, 200, { ok: true, sessionId }); return; }
        if (pathname.startsWith("/api/")) { sendApiError(response, 404, "Mesh API route not found.", "not-found"); return; }
      `);
      assert.deepEqual(prefixMatchedRouteProblems(clean), [], "self-check: the accepted shape — two `===` routes plus the /api/ catch-all 404 — stays quiet");

      const plantedPrefixRoute = `${clean}\n${stripComments(`
        if (pathname.startsWith("/api/mesh/session/")) {
          if (request.method === "POST") { sendJson(response, 200, { ok: true, killed: pathname.slice(18) }); return; }
          sendMethodNotAllowed(response, "POST");
          return;
        }
      `)}`;
      assert.notEqual(plantedPrefixRoute, clean, "the plant LANDED — the planted text differs from the clean text");

      // THE WHOLE POINT, stated as an assertion rather than as prose: the EXISTING detectors
      // are BLIND to it. A third write route answering 200 to a POST, and the enumeration
      // this file's other clauses read reports nothing at all.
      assert.deepEqual(
        declaredMeshRoutes(plantedPrefixRoute),
        ["assign", "session"],
        "self-check: the `===` route reader sees ONLY the two sanctioned routes in a source that also serves POST /api/mesh/session/<id> — this is the blindness, measured",
      );
      assert.deepEqual(
        unenumeratedRoutes(plantedPrefixRoute),
        [],
        "self-check: …and the 'no OTHER write route' clause is therefore GREEN on a face with three write routes — which is why an absence sweep is needed and not a wider name capture",
      );

      // …and the new clause FIRES, naming the form and telling the author what to do.
      const fired = prefixMatchedRouteProblems(plantedPrefixRoute);
      assert.equal(fired.length, 1, `self-check: the planted prefix route trips exactly once. Got: ${JSON.stringify(fired)}`);
      assert.match(fired[0], /startsWith/, "…naming the FORM that was used");
      assert.match(fired[0], /INVISIBLE to all four route tables/, "…and why it matters: not 'unenumerated' but UNSEEN");
      assert.match(fired[0], /pathname === "\/api\/mesh\/<name>"/, "…and the remedy, which is one line: declare it so it joins the enumeration");

      // THE OTHER THREE FORMS, each planted separately — the fix for `startsWith` must not be
      // "use a regex instead".
      for (const [label, planted] of [
        ["match", 'const hit = pathname.match(/^\\/api\\/mesh\\/session\\/(.+)$/); if (hit) { sendJson(response, 200, { ok: true }); return; }'],
        ["regex literal .test", 'if (/^\\/api\\/mesh\\/session\\/.+$/.test(pathname)) { sendJson(response, 200, { ok: true }); return; }'],
        ["new RegExp", 'if (new RegExp("^/api/mesh/session/.+$").test(pathname)) { sendJson(response, 200, { ok: true }); return; }'],
      ]) {
        const withForm = `${clean}\n${stripComments(planted)}`;
        assert.notEqual(withForm, clean, `the ${label} plant LANDED`);
        assert.deepEqual(unenumeratedRoutes(withForm), [], `self-check: the ${label} form is invisible to the \`===\` enumeration too`);
        const formProblems = prefixMatchedRouteProblems(withForm);
        assert.equal(formProblems.length, 1, `self-check: the ${label} form trips exactly once. Got: ${JSON.stringify(formProblems)}`);
        assert.match(formProblems[0], /INVISIBLE to all four route tables/, `…with the same refusal, so no form is the "allowed" way to write a path-parameter route`);
      }

      // AND THE REFUSAL IS NOT OVER-EAGER: a prefix test on a NON-mesh path (the static
      // bundle's own asset check is the live example) is none of this gate's business, and a
      // clause that fired on it would be met by deleting the clause.
      const foreignPrefix = stripComments(`
        if (pathname.startsWith("/assets/")) { serveAsset(response, pathname); return; }
        if (pathname.startsWith("/api/")) { sendApiError(response, 404, "Mesh API route not found.", "not-found"); return; }
      `);
      assert.deepEqual(prefixMatchedRouteProblems(foreignPrefix), [], "self-check: a prefix test on a non-mesh path does NOT trip — the clause is about the bounded namespace, not about `startsWith`");
    },
  },
  // ══ milestone 50 / story 04 (ADR-008 FF-D) — the READ route that must stay one ═════
  {
    name: "arch/50 ADR-008 FF-D (acd-mesh-ui-write-isolation): GET /api/mesh/session-outcome is a method guard and a Map read — it opens no store, probes no filesystem, reads no body, mints nothing and pushes nothing",
    run: async () => {
      const source = stripComments(await readFile(MESH_UI_SERVE, "utf8"));
      assert.deepEqual(outcomeRouteProblems(source), [], "the real outcome route is a guard and a registry read");

      // --- planted-violation self-checks, hand-written (never a string-replace on the real
      // file), each asserted to LAND before the detector is asked about it ---
      const clean = stripComments(`
        if (pathname === "/api/mesh/session-outcome") {
          if (request.method !== "GET" && request.method !== "HEAD") { sendMethodNotAllowed(response, "GET, HEAD"); return; }
          const outcomeNodeId = (requestUrl.searchParams.get("nodeId") ?? "").trim();
          const outcomeSessionId = (requestUrl.searchParams.get("sessionId") ?? "").trim();
          if (!outcomeNodeId || !outcomeSessionId) { sendApiError(response, 400, "required", "invalid-query"); return; }
          const outcome = spawnOutcomes.read(outcomeNodeId, outcomeSessionId);
          sendJson(response, 200, { ok: true, state: "pending" });
          return;
        }
      `);
      assert.deepEqual(outcomeRouteProblems(clean), [], "self-check: the clean synthesized route shape stays quiet");

      // (a) THE EXPENSIVE READ, which is the one a future author reaches for first — "while
      // we are here, resolve the workspace row". It is the route's whole cost argument.
      const plantedStoreRead = clean.replace(
        "const outcome = spawnOutcomes.read(outcomeNodeId, outcomeSessionId);",
        "const status = await queryGlobalMeshStatus({ ...globalStoreOptions });\n          const outcome = spawnOutcomes.read(outcomeNodeId, outcomeSessionId);",
      );
      assert.notEqual(plantedStoreRead, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outcomeRouteProblems(plantedStoreRead).some((problem) => /queryGlobalMeshStatus\(/.test(problem)),
        "self-check: a machine-wide store projection planted into the outcome route trips",
      );

      // (b) THE WRITE-ROUTE COPY ARRIVING BY HABIT: the admission/body/probe block pasted in
      // from the session route next door. This is TECH_DEBT item 44's actual mechanism.
      const plantedBodyRead = clean.replace(
        "const outcomeNodeId",
        "const body = await readJsonBody(request);\n          const outcomeNodeId",
      );
      assert.notEqual(plantedBodyRead, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outcomeRouteProblems(plantedBodyRead).some((problem) => /readJsonBody\(/.test(problem)),
        "self-check: a body read planted into a GET route trips",
      );

      // (c) A RELAY PUSH — the route quietly becoming a WRITE while staying in the read set.
      const plantedPush = clean.replace(
        "sendJson(response, 200, { ok: true, state: \"pending\" });",
        "await terminalInputPush.push(envelope);\n          sendJson(response, 200, { ok: true, state: \"pending\" });",
      );
      assert.notEqual(plantedPush, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outcomeRouteProblems(plantedPush).some((problem) => /\.push\(/.test(problem)),
        "self-check: a relay push planted into the READ route trips — a read route that dispatches is a write route in the wrong list",
      );

      // (d) THE VACUOUS REGION: the negatives above are all satisfied by a route that does
      // nothing at all, so the positive half is planted too.
      const plantedNoRead = clean.replace("const outcome = spawnOutcomes.read(outcomeNodeId, outcomeSessionId);", "");
      assert.notEqual(plantedNoRead, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outcomeRouteProblems(plantedNoRead).some((problem) => /spawnOutcomes\.read\(/.test(problem)),
        "self-check: a route that never reads the registry trips — an absence sweep must not be green on an empty region",
      );

      const plantedNoGuard = clean.replace('if (request.method !== "GET" && request.method !== "HEAD") { sendMethodNotAllowed(response, "GET, HEAD"); return; }', "");
      assert.notEqual(plantedNoGuard, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        outcomeRouteProblems(plantedNoGuard).some((problem) => /GET\/HEAD/.test(problem)),
        "self-check: an unguarded method on the read route trips",
      );

      // (e) THE REGION IS CUT ON BRACES, NOT ON A WINDOW. A neighbouring branch's forbidden
      // calls must NOT be attributed to this route — a detector that read a character window
      // would report the session route's `queryGlobalMeshStatus` as the outcome route's.
      const withNeighbour = stripComments(`
        ${clean}
        if (pathname === "/api/mesh/session") {
          const status = await queryGlobalMeshStatus({ ...globalStoreOptions });
          await terminalInputPush.push(buildSessionSpawnEnvelope(nodeId, frame));
          return;
        }
      `);
      assert.deepEqual(
        outcomeRouteProblems(withNeighbour),
        [],
        "self-check: the SESSION route's store read and relay push next door are NOT attributed to the outcome route — the cut is brace-balanced, with no reach to leak",
      );
    },
  },
  {
    name: "arch/25 ADR-004 (behavioural): serving the fleet view + reading /api/mesh/status repeatedly mutates no file under the workspace",
    run: async () => {
      const { repo, workDir } = await makeRepo();
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-mesh-ui-write-iso-root-"));
      await writeDist(meshUiDist(root));
      let server;
      try {
        const before = await snapshotDir(repo);
        let url;
        // scope:"local" (milestone 34 / story 03, ADR-006) — this fitness assertion
        // is about read-only-ness of the WORKSPACE directory, orthogonal to
        // global-vs-local; isolated from the ambient global store.
        ({ server, url } = await serveMeshUi({ projectDir: repo, port: 0, repoRoot: root, scope: "local" }));
        // Serve the page + read the aggregate several times.
        await fetch(new URL("/", url));
        for (let i = 0; i < 3; i += 1) {
          const res = await fetch(new URL("/api/mesh/status", url));
          assert.equal(res.status, 200, "the aggregate read answers");
        }
        const after = await snapshotDir(repo);
        assert.deepEqual(
          diffSnapshots(before, after),
          [],
          "serving + reading the fleet view changed no file under the workspace (read-only render)"
        );
      } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await rm(repo, { recursive: true, force: true });
        await rm(root, { recursive: true, force: true });
      }
    },
  },
];
