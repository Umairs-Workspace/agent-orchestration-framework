// Fitness function: acd-fleet-board-link-resolved (m47 / ADR-006a; m45/STATE F-45-04-1(a)) —
//
//   "The fleet never hard-codes a board address. Every board drill-in resolves through
//    `GET /api/mesh/board-url` — the ONE resolver that knows which port a board is actually on."
//
// EXPECTED, at refine time (2026-08-10): **1 RED, 2 GREEN.** The RED one is the inherited defect
// itself, at `ui/src/fleet/Fleet.tsx:1427`: `href="/board"`, relative. The two green ones pin the
// resolver path that already exists and the detector that finds the violation.
//
// THE DEFECT, measured. On the fleet origin a relative `/board` resolves to `:4181`, which
// deliberately 404s `/api/work` (`src/mesh/ui-serve.mjs:583-586`, the disjoint-face rule from
// m25/ADR-003) — so the board page loads and cannot load its stream. The file's own comment at
// `:1420-1426` records this and routes it here: "That is TODAY's behaviour for the legacy
// `?mode=board` form, byte for byte; a URL migration that also changed where the link GOES would
// be two changes in one diff."
//
// THE RESOLVER, and why a relative href can never be right on this surface. A board server is
// PER-WORKSPACE and on an EPHEMERAL port — `boardUrlForWorkspace` (`mesh-ui-serve.mjs:820-838`)
// launches one on demand, memoises it per workspace id, and since m46/ADR-004 hands it the
// launching fleet's own origin. `GET /api/mesh/board-url?workspaceId=&ref=` (`:310-340`) is the
// only thing that knows the answer, `ui/src/fleet/api.ts:284-290` is its client, and
// `Fleet.tsx:528-538`'s milestone-card drill-in already goes through it. TECH_DEBT item 31 names
// the same asymmetry from the navigation's side: "the fleet already answers it correctly in its
// content … the nav bypasses the one place the answer lives."
//
// WHY THIS INVARIANT IS DELIBERATELY INDEPENDENT OF THE REGION IT WAS FOUND IN. m47/ADR-006 also
// rules that the unreachable local-shape branch — `BoardsRegion`, `BoardTile`, `BoardDrillIn` and
// the rest of `Fleet.tsx:239-249`'s dead subtree — is DELETED, which removes today's violation
// along with it. This test is NOT written against that deletion: it is written against the RULE,
// so it keeps binding the milestone-card drill-in that survives, and any board affordance a later
// milestone adds. STATE's sequencing worry ("fixing (b) without (a) ships a visible broken link")
// is answered by construction rather than by ordering — but only because the rule outlives the
// region.
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments, matchedBraceBody, enclosingParenGroup, blockOrStatementAfter } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FLEET_DIR = path.join(repoRoot, "ui", "src", "fleet");
const MESH_UI_SERVE = path.join(repoRoot, "src", "mesh", "ui-serve.mjs");

// m47/ADR-011's vocabulary for ONE fact — *this row's checkout is not on this machine*.
// It is the assign route's since m38 and the board-url route's since ADR-011; a second
// spelling of it is the thing the fourth assertion below exists to refuse.
const NOT_LOCAL_CODE = "workspace-not-local";
const NOT_LOCAL_STATUS = "409";

// THE ONE RESOLVER, on both sides of the wire.
const RESOLVER_ROUTE = "/api/mesh/board-url";
const RESOLVER_CLIENT = "boardUrl";

// A hard-coded board ADDRESS, in the three forms it can take on this surface:
//   (a) a relative href — today's violation, Fleet.tsx:1427;
//   (b) an absolute origin literal carrying the board path — the "fix" someone reaches for next,
//       which hard-codes a port that is ephemeral by construction;
//   (c) the legacy `?mode=board` selector, retired by m45/ADR-003 and never to return here.
// `/api/mesh/board-url` must NOT match (a): the guard is that a board PATH literal is `/board`
// followed by an end-quote, a `#`, a `?` or a `"`-ish boundary — never `/board-url`.
const HARD_CODED_BOARD_FORMS = [
  { name: 'a relative `href="/board"`', re: /\bhref\s*=\s*[{("'`]\s*["'`]?\/board(?![\w-])/ },
  { name: "an absolute board origin literal", re: /https?:\/\/[^"'`\s]*\/board(?![\w-])/ },
  { name: "the legacy `?mode=board` selector", re: /[?&]mode=board\b/ },
];

// THE COMMENT STRIPPER AND THE BRACE BALANCER COME FROM THE ONE HOME — `test/support/source-slice.mjs`
// (F-47-03-ARCH-4 / F-47-04-ARCH-2). Both were written here as local copies, and both are the
// mechanisms this milestone has already been bitten by, which is the argument for one home rather
// than one per gate:
//   - the stripper takes LINE COMMENTS FIRST, THEN BLOCKS (TECH_DEBT item 24 — a line comment
//     containing `/*` opens a block-comment run for a block-first stripper, measured at 9,192
//     characters of `src/mesh/ui-serve.mjs` including its whole route table), and its `[^:]` guard
//     is load-bearing for exactly this file's subject: a naive //-stripper deletes from the `//`
//     in `http://…/board` onward, i.e. it hides form (b) entirely. Fleet.tsx:1420-1426 narrates the
//     defect in a COMMENT, which must not count as the defect;
//   - the balancer replaces the hand-rolled depth loop that used to sit in `routeRegions` below.
function hardCodedBoardHits(source) {
  const code = stripComments(source);
  return HARD_CODED_BOARD_FORMS.filter((form) => form.re.test(code)).map((form) => form.name);
}

// ── m47/ADR-011: the routes that resolve a `workspaces` row ───────────────────
//
// Slice each `if (pathname === "…")` branch out of the fleet face by BRACE BALANCE — the shared
// `matchedBraceBody`, so an earlier branch cannot bleed into a later one and a route added between
// them cannot hide inside its neighbour. A branch whose braces never close is DROPPED rather than
// guessed at, and the route-list assertion below is what makes that loud: a region that cannot be
// cut disappears from a list this file pins by name.
function routeRegions(code) {
  const regions = [];
  const opener = /if\s*\(\s*pathname\s*===\s*"([^"]+)"\s*\)\s*\{/g;
  for (let match = opener.exec(code); match; match = opener.exec(code)) {
    const body = matchedBraceBody(code, match.index + match[0].length - 1);
    if (body == null) continue;
    regions.push({ path: match[1], body });
  }
  return regions;
}

// A route RESOLVES a workspaces row when it binds one out of the payload
// `queryGlobalMeshStatus` answers. The binding NAME is what the obligation below is
// stated over, so a third route may spell it however it likes.
function resolvedWorkspaceRow(body) {
  const match = body.match(/const\s+(\w+)\s*=\s*\([^;\n]*\.workspaces\s*\?\?\s*\[\]\s*\)\s*\.find\(/);
  return match ? match[1] : null;
}

// The obligation, checked over the row's own binding: the reachability probe, its 409
// `workspace-not-local` refusal, and the ORDERING — the probe must come before the row is
// used for anything else. The ordering half is the whole rule: the board-url route DID
// hold the row and DID hand it to a collaborator that reads `projectRoot`; what it did not
// do was ask first, and it launched a real board server on a path this machine never had.
function reachabilityProbeFault(body, row) {
  const probe = new RegExp(
    `!\\s*${row}\\.projectRoot\\s*\\|\\|\\s*!\\s*existsSync\\(\\s*${row}\\.projectRoot\\s*\\)`,
  );
  const found = probe.exec(body);
  if (!found) return `no reachability probe on \`${row}.projectRoot\``;

  // THE REFUSAL IS THE PROBE'S OWN CONSEQUENT, cut on the language's structure — never a window.
  //
  // [F-47-04-ARCH-2, 2026-08-12] This line was `body.slice(found.index, found.index + 400)`, and it
  // is the instance the finding names: measured on the REAL route, `409` sat at +169 and
  // `"workspace-not-local"` at +157, i.e. margins of 231 and 243 characters. The rule is about the
  // ORDER of two things — probe, then refuse, then consume — and the instrument measured the
  // LENGTH of the block containing them. A correct route that grew a log line, a second refusal
  // detail or a wider message would go RED with a message about ADR-011, in the gate ADR-011 rests
  // on. Conversely a refusal 401 characters in was invisible. The block the language draws has
  // neither failure mode, and a probe whose braces do not close now fails LOUDLY ("block not
  // found") instead of asserting over a region cut at an arbitrary offset.
  //
  // The cut is the IF'S CONSEQUENT — its braced block, or its single statement when it has no
  // braces (`if (…) return sendApiError(…)` is the same refusal in a legal restyle). Reaching for
  // the next `{` instead would skip a braceless refusal entirely and land in whatever block comes
  // after it: a red about ADR-011 on a route that honours ADR-011, which is this species exactly.
  const header = enclosingParenGroup(body, found.index);
  const consequent = header == null ? null : blockOrStatementAfter(body, header.close + 1);
  if (consequent == null) {
    return `the probe on \`${row}.projectRoot\` has no readable consequent — its refusal cannot be cut (NOT FOUND, rather than a claim about the rule: if the probe was reshaped, this detector must be reshaped with it instead of measuring the wrong region)`;
  }
  const refusal = consequent.body;
  if (!refusal.includes(NOT_LOCAL_STATUS) || !refusal.includes(`"${NOT_LOCAL_CODE}"`)) {
    return `the probe on \`${row}.projectRoot\` does not refuse ${NOT_LOCAL_STATUS} \`${NOT_LOCAL_CODE}\``;
  }

  // Every mention of the row that is NOT the binding, NOT the `!row` not-found guard and
  // NOT the probe itself is a USE. The first of them must come after the probe.
  //
  // THE BOUNDARY EXCLUDES `-`, and that is load-bearing rather than fussy: `\b` treats a
  // hyphen as a word boundary, so a plain `\bworkspace\b` matches INSIDE this very route's
  // own refusal codes — `"invalid-workspace"`, `"workspace-not-found"`,
  // `"workspace-not-local"` — and the first of those sits BEFORE the probe. Measured: the
  // detector reported the REAL, correct route as a violation. A gate that is wrong about
  // the tree rather than about the rule is the species this milestone has already caught
  // three times.
  const probeEnd = found.index + found[0].length;
  const notFound = body.match(new RegExp(`if\\s*\\(\\s*!\\s*${row}\\s*\\)`));
  const binding = body.match(new RegExp(`const\\s+${row}\\s*=`));
  const uses = [...body.matchAll(new RegExp(`(?<![\\w$-])${row}(?![\\w$-])`, "g"))]
    .map((hit) => hit.index)
    .filter((at) => !(binding && at >= binding.index && at < binding.index + binding[0].length))
    .filter((at) => !(notFound && at >= notFound.index && at < notFound.index + notFound[0].length))
    .filter((at) => !(at >= found.index && at < probeEnd));
  const firstUse = uses.find((at) => at !== undefined);
  if (firstUse !== undefined && firstUse < found.index) {
    return `\`${row}\` is used before the reachability probe — the probe must run BEFORE anything consumes the row (a launch is memoised; a refusal reached afterwards has already stranded one)`;
  }
  return null;
}

const SCANNED_EXT = new Set([".ts", ".tsx", ".mjs", ".mts"]);

async function fleetSourceFiles(dir = FLEET_DIR, out = []) {
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) await fleetSourceFiles(full, out);
    else if (SCANNED_EXT.has(path.extname(entry)) || entry.endsWith(".d.mts")) out.push(path.relative(repoRoot, full).replaceAll("\\", "/"));
  }
  return out;
}

export const archTests = [
  {
    name: "arch/47 ADR-006a (acd-fleet-board-link-resolved): NO hard-coded board address anywhere in ui/src/fleet/ — a board's port is ephemeral and per-workspace, so a literal address is wrong by construction [EXPECTED RED: Fleet.tsx:1427]",
    run: async () => {
      const files = await fleetSourceFiles();
      assert.ok(files.length > 5, `ui/src/fleet/ was actually walked (non-vacuous): ${files.length} source files`);
      assert.ok(files.includes("ui/src/fleet/Fleet.tsx"), "the walker reaches the fleet surface itself");

      const violations = [];
      for (const rel of files) {
        const hits = hardCodedBoardHits(await readFile(path.join(repoRoot, rel), "utf8"));
        if (hits.length > 0) violations.push(`${rel} → ${hits.join(", ")}`);
      }

      assert.deepEqual(
        violations,
        [],
        `these fleet modules hard-code a board address:\n  ${violations.join("\n  ")}\n`
          + `m47/ADR-006a: every board drill-in on the fleet resolves through GET ${RESOLVER_ROUTE}. A board server is PER-WORKSPACE and on an EPHEMERAL port (boardUrlForWorkspace, mesh-ui-serve.mjs:820-838, which launches and memoises one per workspace id and hands it the fleet's own origin since m46/ADR-004), so a literal address is not merely stale — it is wrong by construction, on every machine, for every workspace but at most one.\n`
          + "TODAY'S VIOLATION IS THE INHERITED DEFECT, and it is expected: Fleet.tsx:1427 is `href=\"/board\"`, relative, which resolves to :4181 on the fleet origin — a server that deliberately 404s /api/work (mesh-ui-serve.mjs:583-586). The board page loads and cannot load its stream. Routed here by m45/STATE F-45-04-1(a); the file's own comment at :1420-1426 says so and names this fix.",
      );
    },
  },

  {
    name: "arch/47 ADR-006a (acd-fleet-board-link-resolved): the resolver path EXISTS and is what the fleet uses — api.ts declares boardUrl over the ONE route, and Fleet.tsx calls it",
    run: async () => {
      // A deny-list alone would pass a fleet that has no board affordance at all. This is the
      // positive half: the resolver is present on both sides of the wire and is actually called.
      const api = stripComments(await readFile(path.join(FLEET_DIR, "api.ts"), "utf8"));
      assert.ok(
        api.includes(RESOLVER_ROUTE),
        `ui/src/fleet/api.ts must call ${RESOLVER_ROUTE} — the ONE resolver that knows which port a workspace's board is on.`,
      );
      assert.match(
        api,
        new RegExp(`async\\s+${RESOLVER_CLIENT}\\s*\\(`),
        `ui/src/fleet/api.ts must expose \`fleetApi.${RESOLVER_CLIENT}(workspaceId, ref)\` — the named client m47/ADR-006a binds the fleet's board drill-in to.`,
      );

      const fleet = stripComments(await readFile(path.join(FLEET_DIR, "Fleet.tsx"), "utf8"));
      assert.match(
        fleet,
        new RegExp(`fleetApi\\.${RESOLVER_CLIENT}\\s*\\(`),
        `ui/src/fleet/Fleet.tsx must reach a board through fleetApi.${RESOLVER_CLIENT}(...) — Fleet.tsx:528-538's milestone-card drill-in already does, which is precisely why the relative href beside it is an inconsistency rather than an unsolved problem.`,
      );
    },
  },

  {
    name: "arch/47 ADR-006a (acd-fleet-board-link-resolved): self-check — the detector fires on the REAL Fleet.tsx:1427 line and on an absolute board origin, and stays silent on /api/mesh/board-url, on boardUrl(...) and on a comment narrating the defect (non-vacuous)",
    run: () => {
      // The REAL violating line, verbatim from ui/src/fleet/Fleet.tsx:1427.
      assert.ok(hardCodedBoardHits('        href="/board"').length > 0, "the detector catches the real relative href");
      // The form someone reaches for next — a port that is ephemeral by construction. This one
      // lives inside an http:// URL, which is the case a naive comment stripper destroys.
      assert.ok(hardCodedBoardHits('href="http://127.0.0.1:58633/board#47/01"').length > 0, "the detector catches an absolute board origin literal (and survives comment-stripping)");
      // The legacy selector m45/ADR-003 retired.
      assert.ok(hardCodedBoardHits('<a href="/?mode=board">').length > 0, "the detector catches the retired `?mode=board` selector");

      // …and it must NOT fire on the LEGITIMATE resolver route, whose path is one hyphen away.
      assert.deepEqual(hardCodedBoardHits(`const response = await fetch("${RESOLVER_ROUTE}?" + params);`), [], "the resolver route /api/mesh/board-url is the SOLUTION, not a violation — the `(?![\\w-])` boundary is what keeps `/board-url` out of `/board`");
      assert.deepEqual(hardCodedBoardHits("const url = await fleetApi.boardUrl(m.item.workspaceId, m.item.ref);"), [], "a resolver CALL is not a hard-coded address");
      assert.deepEqual(hardCodedBoardHits('window.location.assign(url);'), [], "navigating to a RESOLVED url is the point of the rule, not a breach of it");
      // A comment narrating the defect is history, not code — the exact shape Fleet.tsx:1420-1426
      // carries today, and the reason this file uses the URL-safe stripper.
      assert.deepEqual(
        hardCodedBoardHits('        // m45/ADR-002 — the board\'s PATH, and still RELATIVE, deliberately. href="/board" here\n        // resolves to :4181, which 404s /api/work.'),
        [],
        "a line COMMENT narrating the defect is history, not the defect — TECH_DEBT item 24's hazard, guarded by the URL-safe stripper",
      );
    },
  },

  // ── m47/ADR-011 — THE ONE RESOLVER OWES A TRUTHFUL ANSWER ────────────────────
  //
  // ADR-006(a) made `GET /api/mesh/board-url` the ONE door because it knows the
  // per-workspace ephemeral port. A door that knows the port but not whether the ROOM
  // EXISTS is the single-seam property without the property it was for — measured
  // 2026-08-10 and reproduced independently 2026-08-11 over the committed `Gone` fixture:
  // the route answered 200, `serveBoard` bound a real server on a `projectRoot` this
  // machine has never had, and the operator landed on a page that rendered and showed an
  // empty stream, byte-indistinguishable from a repo with no work.
  //
  // WHY THE RULE IS STATED OVER ALL SUCH ROUTES RATHER THAN THE TWO THAT EXIST. This was
  // never a design call: the SAME file, thirty lines away, has probed the SAME field on
  // the SAME row from the SAME `queryGlobalMeshStatus` call since m38 and refused
  // `409 workspace-not-local` — "a refusal must name its own cause". Two sibling routes,
  // one face, one question, and only one of them consulted the answer. That is a
  // consistency defect, and a consistency defect is fixed by a rule or it recurs: the
  // THIRD route to resolve a workspaces row must meet this on the day it is written, not
  // on the day someone re-measures the fleet. Its non-vacuity half is that the sweep finds
  // BOTH of today's routes and names them — if a refactor renames the payload field or the
  // route opener, this empties and would otherwise pass by finding nothing to check.
  {
    name: "arch/47 ADR-011 (acd-fleet-board-link-resolved): every fleet-face route that resolves a `workspaces` row PROBES reachability first and refuses 409 workspace-not-local — one fact, one code, one vocabulary, and the third such route meets it on the day it is written",
    run: async () => {
      // LINE COMMENTS FIRST (TECH_DEBT item 24), and this is the file the milestone
      // MEASURED that hazard on: `mesh-ui-serve.mjs` carries a line comment containing
      // `//api/*`, whose `/*` opens a block-comment run for a block-first stripper and
      // eats 9,192 characters — its ENTIRE route table. A sweep over that wreckage finds
      // no routes and reads as green.
      const code = stripComments(await readFile(MESH_UI_SERVE, "utf8"));
      assert.ok(
        code.includes("http.createServer"),
        "the stripped source still contains the server's own code — if this fails the comment stripper ate the file, and the ordering (line comments FIRST) is the thing to look at, not the subject",
      );

      const regions = routeRegions(code);
      // DERIVED, NOT RETYPED (FF-11902): the branches the face declares are read off its own
      // openers, and every one must have been cut to a region — a region that cannot be cut is
      // the detector losing its subject, which is what the retyped route list used to catch.
      const declared = [...code.matchAll(/if\s*\(\s*pathname\s*===\s*"([^"]+)"\s*\)/g)].map((match) => match[1]);
      assert.ok(declared.length > 0, "the face declares exact-path branches");
      assert.deepEqual(
        regions.map((region) => region.path),
        declared,
        "the route slicer reaches every exact-path branch this face declares, in source order — a shortfall is the detector losing its subject, not the subject improving",
      );

      const resolvers = regions
        .map((region) => ({ ...region, row: resolvedWorkspaceRow(region.body) }))
        .filter((region) => region.row != null);

      // NON-VACUITY: all of today's are found, by name. A new one joins this list the
      // day it is written, and inherits the obligation without its author knowing the rule
      // exists — which is the whole reason this is a gate rather than a patch.
      //
      // THE THIRD ROUTE ARRIVED, AND THE GATE IS WHY IT COMPLIES. m50/story 02's
      // `POST /api/mesh/session` resolves a `workspaces` row through the same seam, so it
      // is swept here and had to carry the probe + the 409 `workspace-not-local` refusal
      // before the row is consumed — exactly the prediction this clause was written on
      // ("the THIRD route to resolve a workspaces row must meet this on the day it is
      // written, not on the day someone re-measures the fleet").
      //
      // …AND THE FOURTH ROUTE (m50/story 04's `GET /api/mesh/session-outcome`) IS SWEPT AND
      // DELIBERATELY ABSENT FROM THIS LIST, which is a POSITIVE assertion rather than an
      // omission: it binds NO `workspaces` row and opens no store at all (ADR-008 decision 5
      // — it is a method guard and a Map read, gated structurally by
      // acd-mesh-ui-write-isolation's FF-D clause). The route-region list above proves it is
      // reached by the slicer; its absence here proves it resolves nothing. A route that
      // quietly grew a `queryGlobalMeshStatus` would appear in BOTH and inherit the
      // reachability obligation on the day it did.
      // A POLICY ALLOWLIST with its floor (FF-11902): the three routes that resolve a `workspaces`
      // row are named AMONG what the sweep found, and every resolver found is one of them — the
      // fourth route is asserted absent below as a positive claim.
      const RESOLVING_ROUTES = ["/api/mesh/assign", "/api/mesh/board-url", "/api/mesh/session"];
      const resolving = resolvers.map((region) => region.path).sort();
      for (const route of RESOLVING_ROUTES) assert.ok(resolving.includes(route), `${route} resolves a workspaces row — the sweep must find it, or the detector has stopped reaching the subject`);
      for (const route of resolving) assert.ok(RESOLVING_ROUTES.includes(route), `${route} resolves a workspaces row and is not one of the three the fleet admits`);
      assert.ok(
        resolving.length > 0,
        "the sweep finds the routes that resolve a `workspaces` row out of queryGlobalMeshStatus — if this list is empty, the detector has stopped reaching the subject",
      );

      const faults = resolvers
        .map((region) => ({ path: region.path, fault: reachabilityProbeFault(region.body, region.row) }))
        .filter((entry) => entry.fault != null)
        .map((entry) => `${entry.path} → ${entry.fault}`);

      assert.deepEqual(
        faults,
        [],
        `these fleet-face routes resolve a \`workspaces\` row without asking whether its checkout is on this machine:\n  ${faults.join("\n  ")}\n`
          + `m47/ADR-011: the global projection is MACHINE-WIDE and cross-machine, so a row published by ANOTHER node carries a projectRoot this machine has never had. Every such card renders a drill-in and none of them can ever open. The probe is \`if (!row.projectRoot || !existsSync(row.projectRoot))\` → ${NOT_LOCAL_STATUS} \`${NOT_LOCAL_CODE}\`, the vocabulary this same file has minted on the assign route since m38 — never a second code for one fact.\n`
          + "IT MUST COME FIRST. `boardUrlForWorkspace` LAUNCHES and MEMOISES a per-workspace board server, so a refusal reached after the row has been consumed has already stranded a bound port for the fleet's lifetime.",
      );
    },
  },

  {
    name: "arch/47 ADR-011 (acd-fleet-board-link-resolved): self-check — the reachability detector fires on the PRE-ADR-011 board-url route (probe removed), on a probe that refuses the wrong code, and on a probe placed AFTER the row is consumed; and stays silent on the real one (non-vacuous)",
    run: async () => {
      const code = stripComments(await readFile(MESH_UI_SERVE, "utf8"));
      const real = routeRegions(code).find((region) => region.path === "/api/mesh/board-url");
      assert.ok(real, "the real board-url route is sliceable");
      const row = resolvedWorkspaceRow(real.body);
      assert.equal(row, "workspace", "…and its resolved row binding is found");
      assert.equal(reachabilityProbeFault(real.body, row), null, "the REAL route satisfies the rule");

      // Line endings normalised before PLANTING (this repo's tree is CRLF on Windows) —
      // the plants below are multi-line rewrites, and a `\n`-shaped pattern silently
      // matches nothing against `\r\n`, which would make every self-check below vacuous
      // while reading green.
      const body = real.body.replace(/\r\n/g, "\n");
      assert.equal(reachabilityProbeFault(body, row), null, "…and so does its line-normalised twin, which is what the plants are cut from");

      // (a) THE PRE-ADR-011 TREE, reconstructed by deleting the probe from the real region.
      // This is the exact code that answered 200 for a deleted checkout.
      const withoutProbe = body.replace(
        /if \(!workspace\.projectRoot[\s\S]*?\n\s*\}\n/,
        "",
      );
      assert.notEqual(withoutProbe, body, "the plant genuinely removed the probe");
      assert.match(
        String(reachabilityProbeFault(withoutProbe, row)),
        /no reachability probe/,
        "the detector catches the pre-ADR-011 route — a resolver that launches a board for a checkout that is not here",
      );

      // (b) A SECOND SPELLING of the one fact — the duplicated-home shape clause 2 refuses.
      const wrongCode = body.replace(`"${NOT_LOCAL_CODE}"`, '"board-url-failed"');
      assert.match(
        String(reachabilityProbeFault(wrongCode, row)),
        /does not refuse 409 `workspace-not-local`/,
        "the detector catches a probe that mints a second code for a fact this face has already named",
      );

      // (c) THE ORDERING, which is the half a "the probe exists" check cannot see: a probe
      // that runs AFTER `boardUrlForWorkspace` has already launched and memoised a server.
      const probeMatch = body.match(/\n(\s*)if \(!workspace\.projectRoot[\s\S]*?\n\1\}\n/);
      assert.ok(probeMatch, "the probe block is sliceable for the reordering plant");
      const reordered = body
        .replace(probeMatch[0], "\n")
        .replace(/(\n\s*const url = await boardUrlForWorkspace\([^\n]*\n)/, `$1${probeMatch[0]}`);
      assert.notEqual(reordered, body, "the reordering plant genuinely moved the probe");
      assert.match(
        String(reachabilityProbeFault(reordered, row)),
        /used before the reachability probe/,
        "the detector catches a probe that refuses only AFTER the launch it was supposed to prevent",
      );

      // (d) [F-47-04-ARCH-2, 2026-08-12] THE CONVERSION ITSELF, PROVED IN BAND AND RE-RUNNABLY —
      // a CORRECT probe whose refusal sits far past the old `+ 400` cutoff. Measured on the real
      // route, `409` sits at +169 and `"workspace-not-local"` at +157; the plant below inserts ~300
      // characters of ordinary, correct code between the probe and its refusal, which is well
      // inside the 231/243-character margin the finding measured. The rule is untouched by that —
      // it is about the ORDER of probe/refuse/consume — so the correct answer is SILENCE, and the
      // old instrument's answer is a red about ADR-011 that names a violation which does not exist.
      // Both instruments are run here, on the same text, so the difference is a fact this file
      // re-establishes on every run rather than a claim in a review someone has to go and find.
      const padding = Array.from(
        { length: 6 },
        (_, n) => `        const auditNote${n} = \`board-url probe pass ${n} for \${workspace.workspaceId} on \${process.platform}\`;`,
      ).join("\n");
      const padded = body.replace(/(if \(!workspace\.projectRoot[^\n]*\n)/, `$1${padding}\n`);
      assert.notEqual(padded, body, "the padding plant genuinely widened the probe block");
      assert.ok(padded.length - body.length > 300, `the plant really does push the refusal past the old cutoff (+${padded.length - body.length} characters)`);
      assert.equal(
        reachabilityProbeFault(padded, row),
        null,
        "the CONVERTED detector stays silent on a correct probe whose refusal moved past +400 — the block is cut by brace balance, so its LENGTH is not an input to a rule about ORDER",
      );

      // …and the retired instrument, reconstructed verbatim, run beside the converted one on a
      // SYNTHETIC pair. The pair is synthetic on purpose: an assertion about the retired window's
      // verdict on the REAL route would itself go red the day the real route legitimately grows —
      // which is the very defect being retired, re-planted inside its own proof.
      const oldFixedWindow = (text) => {
        const probe = /!\s*workspace\.projectRoot\s*\|\|\s*!\s*existsSync\(\s*workspace\.projectRoot\s*\)/.exec(text);
        if (!probe) return false;
        const refusal = text.slice(probe.index, probe.index + 400); // the retired `+ 400` window
        return refusal.includes(NOT_LOCAL_STATUS) && refusal.includes(`"${NOT_LOCAL_CODE}"`);
      };
      const tight = [
        '  const workspace = (status.workspaces ?? []).find((row) => row.workspaceId === workspaceId);',
        '  if (!workspace) { sendApiError(response, 404, "gone", "workspace-not-found"); return; }',
        '  if (!workspace.projectRoot || !existsSync(workspace.projectRoot)) {',
        `    sendApiError(response, ${NOT_LOCAL_STATUS}, "not on this machine", "${NOT_LOCAL_CODE}");`,
        "    return;",
        "  }",
        "  const url = await boardUrlForWorkspace(boardServers, workspace, {});",
      ].join("\n");
      const tightPadded = tight.replace(/(existsSync\(workspace\.projectRoot\)\) \{\n)/, `$1${padding}\n`);
      assert.equal(reachabilityProbeFault(tight, "workspace"), null, "self-check: the CONVERTED detector is silent on a correct minimal route");
      assert.equal(reachabilityProbeFault(tightPadded, "workspace"), null, "…and stays silent when that same correct route is padded past the retired cutoff — a block cut on the language's structure has no cutoff");
      // …and on the same refusal written WITHOUT braces, which a "find the next `{`" cut would
      // skip over entirely and then judge some later block against ADR-011.
      const braceless = tight.replace(
        /if \(!workspace\.projectRoot \|\| !existsSync\(workspace\.projectRoot\)\) \{\n[\s\S]*?\n  \}/,
        `if (!workspace.projectRoot || !existsSync(workspace.projectRoot)) return sendApiError(response, ${NOT_LOCAL_STATUS}, "not on this machine", "${NOT_LOCAL_CODE}");`,
      );
      assert.notEqual(braceless, tight, "the braceless plant took");
      assert.equal(reachabilityProbeFault(braceless, "workspace"), null, "self-check: a braceless-but-CORRECT refusal is read as the refusal it is — the consequent is cut as a statement when it has no block");
      assert.equal(oldFixedWindow(tight), true, "self-check: the retired `+ 400` window is reconstructed faithfully — it passes the tight correct route, which is why it survived review at all");
      assert.equal(
        oldFixedWindow(tightPadded),
        false,
        "THE FINDING, RE-DEMONSTRATED: the retired `+ 400` window calls a CORRECT route a violation once its block grows past a cutoff the rule never mentions — the rule is about the ORDER of probe/refuse/consume and the instrument measured LENGTH. This assertion is what must fail if anyone re-introduces a character window here.",
      );
    },
  },
];
