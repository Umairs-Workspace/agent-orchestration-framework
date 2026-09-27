// Fitness function: acd-fleet-face-single-mutation-route (milestone 38 / story
// 04; ARCHITECTURE ADR-012; SECURITY T13).
//
// "The fleet face (mesh-ui-serve.mjs) exposes EXACTLY ONE mutation route,
// POST /api/mesh/assign, and it mints only through the existing assignWork
// verb (no insertAssignment/global_assignments write reachable except through
// the gated verb); a gate miss maps to a coded non-200, never a 200; the face
// keeps its ONE loopback http.createServer, no low-level writer import."
//
// AMENDED by milestone 50 / story 02 (ADR-001, accepted 2026-08-14): the named write
// set is EXACTLY {POST /api/mesh/assign, POST /api/mesh/session}. "Exactly one" was
// never the property worth having — the property is that the write surface is a
// CLOSED, NAMED set whose members each carry a method guard and none of which writes a
// file or shells out. Invariants #2 and #3 stay stated over the ASSIGN route because
// they are about a MINT: the session route mints nothing (ADR-002 decision 6 — "the
// control does NOT persist this"), so it has no verb to bypass and no `result.ok` gate
// to swallow. What it must not do is write or shell out, which invariant #4 and the
// sibling `acd-mesh-ui-write-isolation` gate assert over the whole file.
//
// Arms all FOUR ADR-012 structural invariants:
//   1. EXACTLY ONE mutation route, and it is POST /api/mesh/assign.
//   2. The write route mints through assignWork and no other path (no
//      insertAssignment/global_assignments write reachable except via the verb).
//   3. A gate miss is a coded non-200 — never a 200, never swallowed.
//   4. The face stays otherwise read-only: one loopback http.createServer, no
//      low-level writer import, no /ws/terminal.
//
// STRUCTURAL half: source-analysis over the REAL src/mesh/ui-serve.mjs (comments
// discounted, CRLF-normalised — the repo's tree is CRLF; an "\n"-only needle
// would silently no-op against the checked-out file and leave a self-check
// vacuous). Every plant below is a HAND-WRITTEN synthesized snippet (never a
// string-replace on the real file, the acd-clone-credential-pull-not-pushed
// convention) — each plant asserts it LANDED (`notEqual(planted, clean)`)
// before asserting the detector trips on it and stays quiet on `clean`.
//
// BEHAVIOURAL half: the REAL serveMeshUi stood up over an isolated
// AOF_GLOBAL_HOME v3 store proves invariant #1 (every OTHER path/method is
// refused, never 2xx) and invariant #3 (a real gate miss is a real coded
// non-200 that mints nothing) against the ACTUAL running handler, not just its
// source text.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withAssignRouteFixture, sameOriginAssign, seedTargetNode, readAssignmentRows } from "../../support/mesh-ui-assign-fixture.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MESH_UI_SERVE = path.join(repoRoot, "src", "mesh", "ui-serve.mjs");

function stripComments(source) {
  return source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

// lf(source) — normalise CRLF → LF before every regex probe. The tree is
// checked out with CRLF line endings on this platform (core.autocrlf=true);
// a plant/detector written against "\n" boundaries would silently no-op on a
// raw CRLF read and make the self-check vacuous — the exact failure class this
// milestone was repeatedly burned by (F1/F4/F6/F7/F8).
function lf(source) {
  return source.replace(/\r\n/g, "\n");
}

async function realSource() {
  return lf(stripComments(await readFile(MESH_UI_SERVE, "utf8")));
}

// --- detector #1 — EXACTLY ONE mutation route, and it is POST /api/mesh/assign ---

// milestone 50 / story 02 (ADR-001) — SUPERSEDED IN PLACE: the named write set grows
// from ONE to TWO. ADR-001 decision 1 makes POST /api/mesh/session a SIBLING of the
// assign route on the same namespace with the same admission shape, and ADR-001's
// consequences say it in terms: "the fleet face's write surface grows from 1 to 2
// named routes. The fitness test enumerates both by name and still fails on a third
// unenumerated one."
//
// THE ENUMERATION IS THE BOUND, and it is deliberately still an exact set rather than
// a `/api/mesh/*` pattern (ADR-001 considered and rejected that: "defeats the purpose
// of a bound"). Every write route in the set must ALSO guard itself to POST before it
// dispatches — checked per route below, so adding a name to the set cannot smuggle in
// a method-ungated one.
//
// milestone 50 / story 04 (ADR-008 decision 5) — the READ set gains
// `/api/mesh/session-outcome` and the WRITE set DOES NOT MOVE. This gate is named for the
// mutation surface, so that non-movement is its subject rather than a side note: the whole
// load-bearing statement of story 04 is that the fleet face learned to REPORT a spawn
// outcome without learning to do anything new.
//
// milestone 130 / story 03 (ADR-005 §4; TECH_DEBT item 44 paid) — the named set is THREE:
// `POST /api/mesh/loop-stop`, in assign's exact shape. And the SHAPE moved: the method guard
// (with SECURITY T13's admission) is no longer inline text in each branch — item 44 measured
// that this detector REQUIRED the copy in place, so the first author to hoist it would go red
// for doing the right thing — it is ONE helper, `admitWriteRequest(request, response)`, and
// every write branch CALLS it before it reads a body. That is a strictly stronger statement
// than "the text appears in this branch": a copy that drifts cannot satisfy it. The detector
// below accepts EITHER form per branch (the inline guard, or the call) and, whenever a branch
// relies on the call, requires the helper to exist and to carry the guard itself.
const WRITE_ROUTES = Object.freeze(["/api/mesh/assign", "/api/mesh/session", "/api/mesh/loop-stop"]);
const READ_ROUTES = Object.freeze(["/api/mesh/board-url", "/api/mesh/session-outcome", "/api/mesh/status"]);
const ADMISSION_HELPER = "admitWriteRequest";

// routeBranchBody(source, route) — the BRACE-BALANCED body of `if (pathname === "…") {`.
//
// THE WINDOW HAD TO GO, and the second write route is what proved it. The guard used
// to be looked for in a 200-CHARACTER WINDOW after the route literal, which reaches
// straight past a short branch into its NEIGHBOUR: measured on a plant whose assign
// branch had NO method guard and whose session branch had one, the window found the
// SIBLING's guard and the detector read green about an ungated mutation route. Cutting
// on the language's own structure has no reach to leak (the same correction
// acd-fleet-board-link-resolved's F-47-04-ARCH-2 made, for the same reason).
function routeBranchBody(source, route) {
  const anchor = new RegExp(`if\\s*\\(\\s*pathname\\s*===\\s*["']${route}["']\\s*\\)\\s*\\{`).exec(source);
  if (anchor == null) return null;
  return sliceBalanced(source, anchor.index + anchor[0].length - 1);
}

// The guard must be the branch's OWN and must run FIRST — before a body is read or a
// verb/dispatch is reached. 200 characters of the branch's own body is the same
// "at the top of the handler" bound, now measured inside the handler. A CALL to the hoisted
// helper is the branch's own guard for the same purpose — provided the helper carries it.
const METHOD_GUARD_HEAD_CH = 200;

// admissionHelperBody(source) — the brace-balanced body of `function admitWriteRequest(`, or
// null when the face declares no such helper (then every branch must guard inline).
function admissionHelperBody(source) {
  const anchor = new RegExp(`function\\s+${ADMISSION_HELPER}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  if (anchor == null) return null;
  return sliceBalanced(source, anchor.index + anchor[0].length - 1);
}

function routeTableProblems(source) {
  const problems = [];
  // `[^"']+`, not `[a-zA-Z-]+` (review fix, 2026-08-14) — the old class could match
  // neither a `/` nor a `_`, so `"/api/mesh/session/kill"` and `"/api/mesh/kill_session"`
  // were simply ABSENT from `declared` and the route table read as the sanctioned four.
  // A route name is whatever sits between the quotes; the closing quote bounds the match,
  // so nothing adjacent is swallowed.
  const declared = [...source.matchAll(/pathname\s*===\s*["'](\/api\/mesh\/[^"']+)["']/g)].map((m) => m[1]);
  const unique = [...new Set(declared)].sort();
  const expected = [...WRITE_ROUTES, ...READ_ROUTES].sort();
  if (JSON.stringify(unique) !== JSON.stringify(expected)) {
    problems.push(`route table is ${JSON.stringify(unique)}, expected exactly ${JSON.stringify(expected)}`);
  }
  // EVERY named write route guards ITSELF to POST only — a GET/PUT/DELETE on one is a
  // rejection, never a dispatch. Checked per route, inside that route's own branch, so
  // adding a name to the set cannot inherit its sibling's guard.
  const helper = admissionHelperBody(source);
  for (const route of WRITE_ROUTES) {
    const body = routeBranchBody(source, route);
    if (body == null) {
      problems.push(`${route} has no brace-balanced \`if (pathname === "${route}") { … }\` branch to check`);
      continue;
    }
    const inlineAt = body.search(/request\.method\s*!==\s*["']POST["']/);
    const callAt = body.search(new RegExp(`\\b${ADMISSION_HELPER}\\s*\\(`));
    const inline = inlineAt >= 0 && inlineAt <= METHOD_GUARD_HEAD_CH;
    const called = callAt >= 0 && callAt <= METHOD_GUARD_HEAD_CH;
    if (!inline && !called) {
      problems.push(`POST ${route} is not guarded to POST-only before dispatch — neither an inline method guard nor a call to ${ADMISSION_HELPER}( leads its branch`);
      continue;
    }
    // A branch that RELIES on the call inherits nothing unless the helper is real: it must
    // exist, and it must be the guard it stands in for.
    if (!inline && called) {
      if (helper == null) problems.push(`POST ${route} calls ${ADMISSION_HELPER}( but the face declares no such helper — the call guards nothing`);
      else if (!/request\.method\s*!==\s*["']POST["']/.test(helper)) problems.push(`${ADMISSION_HELPER} carries no POST-only method guard — every branch that calls it is ungated`);
    }
  }
  return problems;
}

// --- detector #2 — mints ONLY through assignWork; no low-level writer reachable ---

function mintPathProblems(source) {
  const problems = [];
  if (!/\bassignWork\s*\(/.test(source)) problems.push("no assignWork( call found — nothing mints through the verb");
  if (/\binsertAssignment\s*\(/.test(source)) problems.push("a direct insertAssignment( call bypasses the verb's own gates");
  if (/\bupdateAssignmentState\s*\(/.test(source)) problems.push("a direct updateAssignmentState( call bypasses the verb's own gates");
  if (/from\s*["']\.\/assignment-record\.mjs["']/.test(source)) problems.push("imports ./assignment-record.mjs directly — the low-level table writer");
  return problems;
}

// --- detector #3 — a gate miss (result.ok===false) is a coded non-200, never 200 ---

function gateSwallowProblems(source) {
  const problems = [];
  const okCheck = /if\s*\(\s*!\s*result\.ok\s*\)\s*\{/.exec(source);
  if (!okCheck) {
    problems.push("no `if (!result.ok)` gate found guarding the mint's failure path");
    return problems;
  }
  const guardStart = okCheck.index;
  const braceOpen = source.indexOf("{", guardStart);
  const guardBody = sliceBalanced(source, braceOpen);
  if (guardBody == null) {
    problems.push("the `if (!result.ok)` guard block is not brace-balanced (could not extract it)");
    return problems;
  }
  if (!/sendApiError\s*\(/.test(guardBody)) problems.push("the gate-miss branch does not call sendApiError( — a miss may fall through silently");
  if (/sendJson\s*\(\s*response\s*,\s*200/.test(guardBody)) problems.push("the gate-miss branch itself sends a 200 — a refusal must never be a 200");
  if (!/\breturn\s*;/.test(guardBody)) problems.push("the gate-miss branch does not return — execution could fall through to a success send");
  // the success 200-send must sit OUTSIDE (after) the guard block, never inside it.
  const guardEnd = braceOpen + 1 + guardBody.length;
  const afterGuard = source.slice(guardEnd);
  if (!/sendJson\s*\(\s*response\s*,\s*200\s*,\s*result\s*\)/.test(afterGuard)) {
    problems.push("no unconditional 200-success send found AFTER the gate-miss guard — the success path itself may be missing");
  }
  return problems;
}

// --- detector #4 — the face stays otherwise read-only ---

function readOnlyPostureProblems(source) {
  const problems = [];
  const serverCount = (source.match(/http\.createServer\s*\(/g) ?? []).length;
  if (serverCount !== 1) problems.push(`http.createServer( appears ${serverCount} times, expected exactly 1`);
  if (/["']\/ws\/terminal["']/.test(source)) problems.push("a /ws/terminal path is declared — the face must serve no terminal upgrade");
  if (!/socket\.destroy\s*\(\s*\)/.test(source)) problems.push("no socket.destroy() — an upgrade is not unconditionally refused");
  // deny-list of low-level mesh-core writers. The ONE sanctioned write door
  // (ADR-012) is `./mesh-assignment.mjs` — m42 wave (d) leg d1 moved the assign
  // cores DOWN out of `commands/`, so the commands/* deny-list below needs no
  // carve-out any more. The ./global-mesh-query.mjs read door (ADR-006) stands.
  const denyPattern = /from\s*["']\.\/(mesh-(store|presence|registry|sync)|global-(work-store|node-registry))\.mjs["']/;
  if (denyPattern.test(source)) problems.push("imports a low-level mesh-core writer module directly");
  const commandsImports = [...source.matchAll(/from\s*["'](\.\/commands\/[a-zA-Z0-9._-]+)["']/g)].map((m) => m[1]);
  if (commandsImports.length > 0) problems.push(`imports a commands/* module (the face's one write door is ./mesh/assignment.mjs): ${commandsImports.join(", ")}`);
  return problems;
}

function sliceBalanced(source, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  return null;
}

export const archTests = [
  // ══ invariant #1 — EXACTLY the NAMED mutation routes {assign, session}, each POST-guarded ══
  {
    name: "arch/38-50 ADR-012 inv.1 + 50/ADR-001: mesh-ui-serve.mjs declares EXACTLY the named mutation routes — POST /api/mesh/assign + POST /api/mesh/session — each guarded to POST only, and no third",
    async run() {
      const source = await realSource();
      assert.deepEqual(routeTableProblems(source), [], "the real source declares exactly the two GET routes + the two guarded POST write routes");

      // PLANT — a THIRD write route (/api/mesh/route) declared beside the two
      // sanctioned ones. Hand-written minimal snippets (never a string-replace on
      // the real file).
      const clean = stripComments(`
        if (pathname === "/api/mesh/status") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/board-url") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/assign") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/session") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/loop-stop") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/session-outcome") { if (request.method !== "GET" && request.method !== "HEAD") return; }
      `);
      const planted = stripComments(`
        if (pathname === "/api/mesh/status") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/board-url") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/assign") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/session") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/loop-stop") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/session-outcome") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/route") { sendJson(response, 200, { ok: true }); }
      `);
      assert.notEqual(planted, clean, "the plant actually differs from the clean synthesized shape");
      assert.deepEqual(routeTableProblems(clean), [], "the clean synthesized shape stays quiet");
      assert.ok(routeTableProblems(planted).length > 0, "self-check: a planted THIRD write route trips the detector");

      // …AND ONE WHOSE NAME THE OLD CAPTURE COULD NOT SPELL. `[a-zA-Z-]+` matched
      // neither `/` nor `_`, so a third route called `/api/mesh/session/kill` or
      // `/api/mesh/kill_session` was not merely allowed — it was INVISIBLE, and the route
      // table read as the sanctioned four. Both were planted into the real
      // src/mesh/ui-serve.mjs and confirmed to fire before being reverted.
      for (const name of ["/api/mesh/session/kill", "/api/mesh/kill_session"]) {
        const oddNamePlant = stripComments(`
          if (pathname === "/api/mesh/status") { if (request.method !== "GET" && request.method !== "HEAD") return; }
          if (pathname === "/api/mesh/board-url") { if (request.method !== "GET" && request.method !== "HEAD") return; }
          if (pathname === "/api/mesh/assign") { if (request.method !== "POST") return; }
          if (pathname === "/api/mesh/session") { if (request.method !== "POST") return; }
          if (pathname === "/api/mesh/loop-stop") { if (request.method !== "POST") return; }
          if (pathname === "/api/mesh/session-outcome") { if (request.method !== "GET" && request.method !== "HEAD") return; }
          if (pathname === "${name}") { sendJson(response, 200, { ok: true }); }
        `);
        assert.notEqual(oddNamePlant, clean, "the plant actually differs from the clean synthesized shape");
        const problems = routeTableProblems(oddNamePlant);
        assert.ok(
          problems.some((problem) => problem.includes(name)),
          `self-check: a planted "${name}" trips the detector BY NAME — got ${JSON.stringify(problems)}`,
        );
      }

      // PLANT — a write route dispatched WITHOUT a method guard (a GET on
      // /api/mesh/assign would reach the mutation).
      const ungatedPlant = stripComments(`
        if (pathname === "/api/mesh/status") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/board-url") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/assign") { const result = await assignWork(workspace, ref, nodeId, ctx); }
        if (pathname === "/api/mesh/session") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/loop-stop") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/session-outcome") { if (request.method !== "GET" && request.method !== "HEAD") return; }
      `);
      assert.notEqual(ungatedPlant, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(routeTableProblems(ungatedPlant).length > 0, "self-check: an ungated (no POST-only guard) assign route trips the detector");

      // PLANT — the NEW write route dispatched without its own method guard. The
      // per-route loop is what makes this fire: a single "is there a POST guard
      // anywhere" needle would be satisfied by the assign route's.
      const ungatedSession = stripComments(`
        if (pathname === "/api/mesh/status") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/board-url") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/assign") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/session") { await terminalInputPush.push(envelope); }
        if (pathname === "/api/mesh/loop-stop") { if (request.method !== "POST") return; }
        if (pathname === "/api/mesh/session-outcome") { if (request.method !== "GET" && request.method !== "HEAD") return; }
      `);
      assert.notEqual(ungatedSession, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(
        routeTableProblems(ungatedSession).some((problem) => problem.includes("/api/mesh/session")),
        "self-check: an ungated SESSION route trips the detector BY NAME — the method guard is checked per write route",
      );

      // ── 130/03 (TECH_DEBT item 44's hoist) — the CALL form, and its two broken halves ──
      // The accepted hoisted shape: every write branch CALLS admitWriteRequest( at its head,
      // and the helper carries the guard. This is what the real face ships now.
      const hoisted = stripComments(`
        function admitWriteRequest(request, response) {
          if (request.method !== "POST") { sendMethodNotAllowed(response, "POST"); return false; }
          return true;
        }
        if (pathname === "/api/mesh/status") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/board-url") { if (request.method !== "GET" && request.method !== "HEAD") return; }
        if (pathname === "/api/mesh/assign") { if (!admitWriteRequest(request, response)) return; }
        if (pathname === "/api/mesh/session") { if (!admitWriteRequest(request, response)) return; }
        if (pathname === "/api/mesh/loop-stop") { if (!admitWriteRequest(request, response)) return; }
        if (pathname === "/api/mesh/session-outcome") { if (request.method !== "GET" && request.method !== "HEAD") return; }
      `);
      assert.deepEqual(routeTableProblems(hoisted), [], "self-check: the hoisted shape — a CALL per branch and a helper that carries the guard — stays quiet");
      // (a) a branch that stops calling the helper is ungated, whatever the others do.
      const droppedCall = hoisted.replace('if (pathname === "/api/mesh/loop-stop") { if (!admitWriteRequest(request, response)) return; }', 'if (pathname === "/api/mesh/loop-stop") { const body = await readJsonBody(request); }');
      assert.notEqual(droppedCall, hoisted, "the plant actually differs from the hoisted shape");
      assert.ok(routeTableProblems(droppedCall).some((problem) => problem.includes("/api/mesh/loop-stop")), "self-check: a branch that neither guards inline nor calls the helper trips BY NAME");
      // (b) the helper exists and is called, but it lost its guard — every caller is ungated at once.
      const hollowHelper = hoisted.replace('if (request.method !== "POST") { sendMethodNotAllowed(response, "POST"); return false; }', "");
      assert.notEqual(hollowHelper, hoisted, "the plant actually differs from the hoisted shape");
      assert.ok(routeTableProblems(hollowHelper).some((problem) => /carries no POST-only method guard/.test(problem)), "self-check: a helper without the guard trips — the call is only as good as what it calls");
      // (c) a call to a helper the face never declares guards nothing.
      const phantomHelper = hoisted.replace(/function admitWriteRequest[\s\S]*?\n\s*\}\n/, "");
      assert.notEqual(phantomHelper, hoisted, "the plant actually differs from the hoisted shape");
      assert.ok(routeTableProblems(phantomHelper).some((problem) => /declares no such helper/.test(problem)), "self-check: a call to an undeclared helper trips");
    },
  },

  // ══ invariant #2 — mints ONLY through assignWork; no low-level writer reachable ══
  {
    name: "arch/38 ADR-012 inv.2: mesh-ui-serve.mjs mints ONLY through assignWork — no insertAssignment/updateAssignmentState/assignment-record.mjs reachable",
    async run() {
      const source = await realSource();
      assert.deepEqual(mintPathProblems(source), [], "the real source mints only through assignWork(...)");

      const clean = "const result = await assignWork(assignWorkspace, ref, nodeId, { globalWorkStoreOptions: globalStoreOptions ?? {} });";
      const plantedBypass = 'import { insertAssignment } from "./assignment-record.mjs";\nconst result = insertAssignment(store, { itemRef: ref, targetNodeId: nodeId });';
      assert.notEqual(plantedBypass, clean, "the plant actually differs from the clean synthesized shape");
      assert.deepEqual(mintPathProblems(clean), [], "the clean synthesized shape stays quiet");
      assert.ok(mintPathProblems(plantedBypass).length > 0, "self-check: a planted direct insertAssignment( bypass trips the detector");

      const plantedUpdate = "const result = updateAssignmentState(store, forgedId, \"assigned\", {});";
      assert.notEqual(plantedUpdate, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(mintPathProblems(plantedUpdate).length > 0, "self-check: a planted direct updateAssignmentState( bypass trips the detector");
    },
  },

  // ══ invariant #3 — a gate miss is a coded non-200, never a 200, never swallowed ══
  {
    name: "arch/38 ADR-012 inv.3: mesh-ui-serve.mjs surfaces a gate miss as a coded non-200 — never a 200, never a second success path around the gates",
    async run() {
      const source = await realSource();
      assert.deepEqual(gateSwallowProblems(source), [], "the real source's !result.ok branch sends a coded error and returns, before the unconditional 200 send");

      const clean = stripComments(`
        const result = await assignWork(assignWorkspace, ref, nodeId, ctx);
        if (!result.ok) {
          const { ok: _ok, error: message, code, ...extra } = result;
          sendApiError(response, assignGateStatus(code), message, code, extra);
          return;
        }
        sendJson(response, 200, result);
      `);
      // PLANT — the gate-miss branch is swallowed: it logs but still falls
      // through to the unconditional 200 send (the exact "never a 200 for a
      // refusal" violation this invariant forbids).
      const plantedSwallow = stripComments(`
        const result = await assignWork(assignWorkspace, ref, nodeId, ctx);
        if (!result.ok) {
          console.warn(result.error);
        }
        sendJson(response, 200, result);
      `);
      assert.notEqual(plantedSwallow, clean, "the plant actually differs from the clean synthesized shape");
      assert.deepEqual(gateSwallowProblems(clean), [], "the clean synthesized shape stays quiet");
      assert.ok(gateSwallowProblems(plantedSwallow).length > 0, "self-check: a swallowed gate-miss (falls through to 200) trips the detector");

      // PLANT — the gate-miss branch itself sends a 200 (a "refusal" that is
      // still, somehow, a success envelope).
      const plantedFake200 = stripComments(`
        const result = await assignWork(assignWorkspace, ref, nodeId, ctx);
        if (!result.ok) {
          sendJson(response, 200, { ok: false, code: result.code });
          return;
        }
        sendJson(response, 200, result);
      `);
      assert.notEqual(plantedFake200, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(gateSwallowProblems(plantedFake200).length > 0, "self-check: a gate-miss branch that itself sends 200 trips the detector");
    },
  },

  // ══ invariant #4 — the face stays otherwise read-only ══
  {
    name: "arch/38 ADR-012 inv.4: mesh-ui-serve.mjs stays otherwise read-only — one loopback http.createServer, no low-level writer import, no /ws/terminal",
    async run() {
      const source = await realSource();
      assert.deepEqual(readOnlyPostureProblems(source), [], "the real source keeps exactly one server, no /ws/terminal, no low-level writer import beyond the sanctioned door");

      const clean = 'const server = http.createServer(async (request, response) => {});\nimport { assignWork } from "./assignment.mjs";\nsocket.destroy();';
      const plantedSecondServer = 'const server = http.createServer(async (request, response) => {});\nconst mirror = http.createServer(async (request, response) => {});\nimport { assignWork } from "./assignment.mjs";\nsocket.destroy();';
      assert.notEqual(plantedSecondServer, clean, "the plant actually differs from the clean synthesized shape");
      assert.deepEqual(readOnlyPostureProblems(clean), [], "the clean synthesized shape stays quiet");
      assert.ok(readOnlyPostureProblems(plantedSecondServer).length > 0, "self-check: a planted SECOND http.createServer( trips the detector");

      const plantedTerminal = 'const server = http.createServer(async (request, response) => {});\nimport { assignWork } from "./assignment.mjs";\nif (pathname === "/ws/terminal") { attachTerminalWebSocket(request, socket); }\nsocket.destroy();';
      assert.notEqual(plantedTerminal, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(readOnlyPostureProblems(plantedTerminal).length > 0, "self-check: a planted /ws/terminal path trips the detector");

      const plantedWriterImport = 'const server = http.createServer(async (request, response) => {});\nimport { assignWork } from "./assignment.mjs";\nimport { insertAssignment } from "./assignment-record.mjs";\nimport { deleteWorkItem } from "./commands/mesh-issue.mjs";\nsocket.destroy();';
      assert.notEqual(plantedWriterImport, clean, "the plant actually differs from the clean synthesized shape");
      assert.ok(readOnlyPostureProblems(plantedWriterImport).length > 0, "self-check: a planted second commands/* import trips the detector");
    },
  },

  // ══ behavioural — proving invariants #1 + #3 against the REAL running handler ══
  {
    name: "arch/38 ADR-012 (behavioural): the REAL fleet face — every OTHER path/method stays 405/404, and a REAL gate miss is a REAL coded non-200 that mints nothing",
    async run() {
      await withAssignRouteFixture(async ({ url, home, workspaceId }) => {
        // invariant #1 — every other route/method is refused, never a 2xx.
        //
        // REVIEW FIX (2026-08-14): the "a POST that skips the admission guard is still a
        // refusal" half of this lane's own comment WAS NOT RUN — every row below sent a
        // same-origin header, and there was no `POST /api/mesh/session` row at all. A
        // comment that claims a clause the table does not contain is worse than no
        // comment: it reads as coverage. `origin: "NONE"` is now spelled per row (the
        // sentinel convention the assign fixture's REVIEW FIX F-C established — omission
        // must be SAID, never meant by an absent key), and both write routes are probed
        // with and without it.
        const rows = [
          { method: "POST", path: "/api/mesh/status" },
          { method: "POST", path: "/api/mesh/board-url" },
          { method: "PUT", path: "/api/mesh/assign" },
          { method: "DELETE", path: "/api/mesh/assign" },
          { method: "GET", path: "/api/mesh/assign" },
          // m50/ADR-001 — the SECOND named write route answers the same way on every
          // method but POST…
          { method: "PUT", path: "/api/mesh/session" },
          { method: "DELETE", path: "/api/mesh/session" },
          { method: "GET", path: "/api/mesh/session" },
          // …and a POST is a refusal too unless it clears BOTH gates: the CSRF guard
          // (which runs before the body is read — the `origin: "NONE"` rows) and the
          // body-shape guard (the same-origin rows below carry no nodeId/workspaceId).
          { method: "POST", path: "/api/mesh/session" },
          { method: "POST", path: "/api/mesh/session", origin: "NONE" },
          { method: "POST", path: "/api/mesh/assign", origin: "NONE" },
          { method: "POST", path: "/api/mesh/issue" },
          { method: "POST", path: "/api/mesh/revoke" },
        ];
        // 130/03 — the THIRD named write route answers the same way on every method but POST,
        // and a POST is refused by the SAME admission before any body is read.
        rows.push(
          { method: "PUT", path: "/api/mesh/loop-stop" },
          { method: "DELETE", path: "/api/mesh/loop-stop" },
          { method: "GET", path: "/api/mesh/loop-stop" },
          { method: "POST", path: "/api/mesh/loop-stop" },
          { method: "POST", path: "/api/mesh/loop-stop", origin: "NONE" },
        );
        for (const row of rows) {
          const headers = { "content-type": "application/json" };
          if (row.origin !== "NONE") headers.origin = new URL(url).origin;
          const label = `${row.method} ${row.path}${row.origin === "NONE" ? " (no Origin)" : ""}`;
          const res = await fetch(new URL(row.path, url), { method: row.method, headers });
          assert.notEqual(res.status, 200, `${label} is never a 200`);
          const body = await res.json();
          assert.notEqual(body.ok, true, `${label} never succeeds`);
          // A refusal NAMES its cause — an uncoded body is how "it failed somehow"
          // becomes indistinguishable from "it worked and returned nothing".
          assert.equal(typeof body.code, "string", `${label} carries a coded refusal — got ${JSON.stringify(body)}`);
          if (row.origin === "NONE") {
            assert.equal(body.code, "cross-origin-refused", `${label} is refused by the ADMISSION guard, before any body is read`);
          }
        }

        // invariant #3 — a REAL gate miss (an unregistered node) is a REAL coded
        // non-200 that mints nothing.
        const refused = await sameOriginAssign(url, "38/04", "ghost", "OWN");
        assert.notEqual(refused.status, 200, "a real gate miss is never a 200");
        assert.ok(refused.status >= 400 && refused.status < 500, `a real gate miss is a coded 4xx — got ${refused.status}`);
        const refusedBody = await refused.json();
        assert.equal(refusedBody.code, "assignment-target-unknown");
        assert.notEqual(refusedBody.ok, true, "a real gate miss never carries an ok:true envelope");
        const minted = await readAssignmentRows({ home }, workspaceId, "38/04");
        assert.equal(minted.length, 0, "a real gate miss mints nothing");

        // …and a REAL eligible assign still mints through the verb (the ONE
        // sanctioned path stays live even after every refusal above).
        await seedTargetNode({ home }, { nodeId: "worker-a", workspaceId, member: true, published: true });
        const accepted = await sameOriginAssign(url, "38/04", "worker-a", "OWN");
        assert.equal(accepted.status, 200, "the one sanctioned mutation route still mints for an eligible request");
        const mintedAfter = await readAssignmentRows({ home }, workspaceId, "38/04");
        assert.equal(mintedAfter.length, 1);
      });
    },
  },
];
