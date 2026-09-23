// Traceability wiring for milestone 49 / story 04, task 00 —
// `stories/04_story_route-becomes-the-home/tasks/00_the-route-is-the-home.feature`
// (@ui @work @design). Its LAST scenario is `@manual`: no headless lane can see a deployed
// build's first paint, because `test/support/mini-react.mjs` never assigns a node to a ref and
// the built Tailwind bundle is not in play here at all. That one is recorded at `aof:verify 49`.
//
// WHAT THIS SUITE IS ABOUT, IN ONE SENTENCE: `/` stops being a card the shell draws itself and
// becomes a surface the shell HOSTS — inside `SurfaceBoundary`'s crash containment, at
// `content:fixed`, with `ui/src/app/Landing.tsx` DELETED rather than parked beside it.
//
// AND THE DANGEROUS FAILURE IS THE HALF-LANDED ONE, which is why scenario 2 is an Outline over
// a truth table rather than a sentence. `surfaceMountFor` returns THREE booleans off TWO inputs,
// and with `SHELL_RENDERED_ROUTES` still naming `landing` while `SURFACES` already holds it,
// `shellRenders` wins: `mounts` is false, `surfaceFailed` is false, nothing is red, nothing is
// logged, the address bar says `/`, and the operator sees a placeholder pointing at pages they
// are already on. The function's own comment tells a reviewer that state is FINE. It is not.
//
// ISOLATION. Nothing here touches a store, a database or the mesh. The model lanes run under
// plain `node:test`; the harness lanes mount through test/support/shell-app-harness.mjs, which
// serves from `http://127.0.0.1:9` and supplies `identity` so the shell's one probe never fires,
// or through `withShellComposedHome` against an ephemeral loopback face. NO LANE BINDS A FIXED
// PORT — `:4181` and `:4182` are held by live daemons on this machine.
import assert from "node:assert/strict";
import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NOT_FOUND_ROUTE, ROUTES, routeFor } from "../../ui/src/app/routes.mjs";
import { HISTORY_NONE, HISTORY_REPLACE, SHELL_RENDERED_ROUTES, entryPlanFor, surfaceMountFor } from "../../ui/src/app/entry.mjs";
import {
  CONTENT_MODE_FIXED,
  CONTENT_MODE_PAGE,
  SHELL_CARD_WRAPPER_CLASS,
  STATE_POPULATED,
  contentModeFor,
  contentStateFor,
} from "../../ui/src/app/shell-layout.mjs";
import { withShellApp, withShellComposedHome, findAll, textOf } from "../support/shell-app-harness.mjs";
import { isUiSourceFile } from "../support/ui-source-files.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ADDRESS = (pathname, search = "", hash = "") => ({ pathname, search, hash });

// The shell's own placeholder sentence and its decorative mark — the two strings that must not
// survive anywhere. Spelled here once, so "unreachable" is one fact with one home.
const PLACEHOLDER_SENTENCE = "Live terminals will appear here.";
const PLACEHOLDER_MARK = "✦";

// ── READING `SURFACES` ─────────────────────────────────────────────────────────────────────
// The entry's surface map is a module-scope const in `ui/src/main.tsx`, and that file cannot be
// imported: its last statement is `createRoot(...).render(...)`, so importing it mounts an app.
// So the map is read where it is DECLARED, off its one declaration site — which is also what
// makes the reading non-vacuous: if the declaration moves or is renamed, this returns null and
// every lane below fails loudly rather than asserting about an empty list.
//
// Every existing suite that needed this list hand-typed `["fleet", "board", "config"]`
// (test/ui/shell-entry-plan.test.mjs). A hand-typed list is exactly what cannot catch a HALF-LANDED
// diff: it would go on saying the map has three keys long after the map had four.
async function surfaceMapKeys() {
  const source = await readFile(path.join(repoRoot, "ui", "src", "main.tsx"), "utf8");
  const declaredAt = source.indexOf("const SURFACES");
  if (declaredAt < 0) return null;
  const open = source.indexOf("{", declaredAt);
  const close = source.indexOf("};", open);
  if (open < 0 || close < 0) return null;
  return source
    .slice(open + 1, close)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-z_$][\w$-]*\s*:/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")).trim());
}

// Every import specifier in a file, comment-stripped so a `// see ./Landing` note is history and
// not an edge. LINE comments first, block second — the order TECH_DEBT 24 records.
function importSpecifiersOf(source) {
  const clean = String(source)
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  return [...clean.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((match) => match[1]);
}

// The sweep both non-vacuity claims below rest on — "ui/src was actually walked" for the
// no-importer clause and for the placeholder-sentence clause.
//
// IT TAKES THE SHIPPED PREDICATE AND DOES NOT RE-TYPE ONE. `test/support/ui-source-files.mjs`
// was extracted in THIS milestone precisely so the per-file gate and the per-directory gate
// cannot disagree about what a file is, and its header states the failure it exists to prevent:
// "a second copy is how the per-file gate would come to count 98 files while the directory gate
// counted 96". A third copy here would be worse than either, because this sweep is what makes
// the DELETION claim mean anything: if the predicates drift, this walks a different tree than
// the gates meter and reports green over the difference.
async function uiSourceFiles(relative = "ui/src", out = []) {
  for (const entry of await readdir(path.join(repoRoot, relative), { withFileTypes: true })) {
    const next = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await uiSourceFiles(next, out);
    else if (isUiSourceFile(entry.name)) out.push(next);
  }
  return out;
}

// The gate's OWN arithmetic — `source.split(/\r?\n/).length`, which is `wc -l` PLUS ONE for any
// file ending in a newline. Every earlier pass over these numbers used `wc -l` and was understated
// by one in the unsafe direction, on a table where one row has ZERO headroom.
async function gateLineCount(file) {
  return (await readFile(path.join(repoRoot, file), "utf8")).split(/\r?\n/).length;
}

// A real fixture face for the ONE route the home reads. Binds :0 and reads back `address().port`.
async function withStatusFace(payload, body) {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    return await body({ url });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const QUIET_FLEET = { scope: "global", workspaces: [], items: [], nodes: [], sessions: [], diagnostics: {} };

// The console the boundary writes its loud line to. Captured rather than silenced: "the boundary
// is LOUD" is itself a clause, and a swallowed error is how the next one takes a day to find.
async function capturingConsoleError(fn) {
  const captured = [];
  const original = console.error;
  console.error = (...args) => captured.push(args.map((arg) => (arg instanceof Error ? arg.message : String(arg))).join(" "));
  try {
    return await fn(captured);
  } finally {
    console.error = original;
  }
}

export const terminalsHomeRouteTests = [
  // ======================================================================
  // Scenario 1: the four edits are ONE diff
  // ======================================================================
  {
    name: "home-route/00 the four edits are ONE diff — SURFACES gains `/`, SHELL_RENDERED_ROUTES loses it, the inline branch goes and Landing.tsx is gone (00 scenario 1)",
    async run() {
      // (1) the shell-rendered list is down to one member, and it is still frozen.
      assert.deepEqual([...SHELL_RENDERED_ROUTES], ["not-found"], "SHELL_RENDERED_ROUTES is exactly [\"not-found\"]");
      assert.equal(SHELL_RENDERED_ROUTES.length, 1, "…one member");
      assert.equal(Object.isFrozen(SHELL_RENDERED_ROUTES), true, "…and still frozen: a list handed out by reference is one careless push away from a route that changes meaning mid-session");

      // (2) `landing` is a key of SURFACES, alongside the other three.
      const keys = await surfaceMapKeys();
      assert.ok(Array.isArray(keys), "the SURFACES declaration was FOUND in ui/src/main.tsx (non-vacuous: a null read fails here rather than asserting over an empty list)");
      assert.ok(keys.length >= 4, `…and it really has entries: ${JSON.stringify(keys)}`);
      assert.deepEqual(keys, ["landing", "fleet", "board", "config"], "landing is a key of SURFACES, alongside fleet, board and config");

      // (3) the same id now MOUNTS, through the shipped decision and against the entry's own map.
      const mount = surfaceMountFor("landing", keys);
      assert.equal(mount.mounts, true, "landing mounts a surface");
      assert.equal(mount.shellRenders, false, "…the shell no longer renders it itself");
      assert.equal(mount.surfaceFailed, false, "…and nothing is wrong");

      // (4) the file is GONE from a real directory listing — not merely unimported.
      const appDir = await readdir(path.join(repoRoot, "ui", "src", "app"));
      assert.ok(appDir.length > 5, `ui/src/app/ was actually listed: ${appDir.length} entries`);
      assert.equal(appDir.includes("Landing.tsx"), false, `a real directory listing of ui/src/app/ contains no Landing.tsx: ${JSON.stringify(appDir)}`);

      // (5) …and NOTHING imports it, in any spelling. A retained import with no file is a build
      // break; a retained FILE with no importer is the dead code m46/ADR-007 diagnosed.
      const files = await uiSourceFiles();
      assert.ok(files.length > 50, `ui/src was actually swept: ${files.length} modules`);
      const importers = [];
      for (const file of files) {
        for (const specifier of importSpecifiersOf(await readFile(path.join(repoRoot, file), "utf8"))) {
          if (/(^|\/)Landing(\.tsx?)?$/.test(specifier)) importers.push(`${file} → ${specifier}`);
        }
      }
      assert.deepEqual(importers, [], "no module under ui/src/ imports ./Landing, ../app/Landing or any spelling of that path");

      // (6) ONE claimant. The route has one component, not two.
      assert.equal(keys.filter((key) => key === "landing").length, 1, "exactly ONE entry of SURFACES maps the landing id");
    },
  },

  // ======================================================================
  // Scenario Outline 2: every combination of the two lists, and only one is the landed state
  // ======================================================================
  {
    name: "home-route/00 the half-landed truth table — all four (shellRenders, known) cells through the SHIPPED decision, and rows 1 and 2 are byte-identical (00 scenario 2, all four rows)",
    async run() {
      // HOW THE ROWS ARE DRIVEN, stated rather than left to be reverse-engineered.
      // `surfaceMountFor` closes over the module-level `SHELL_RENDERED_ROUTES`, so "the list"
      // is not an argument and the two rows whose list still names `landing` are UNREACHABLE for
      // that id on this tree — which is itself the landed state's proof, asserted first.
      // The function is TOTAL over the two booleans it actually reads (`shellRenders` = the id is
      // in the frozen list, `known` = the id is in the map), so every cell of the table is driven
      // through the SHIPPED function by choosing an id on the right side of the list: `not-found`
      // for the two `shellRenders: true` cells, `landing` for the two that are false.
      assert.equal(SHELL_RENDERED_ROUTES.includes("landing"), false, "on this tree `landing` is NOT shell-rendered — rows 1 and 2 are unreachable for it, which is what 'landed' means");

      // THE GIVEN'S OWN CONTENT, WHICH THE CELL DRIVE ALONE DOES NOT CARRY (QA F2). Choosing the
      // routeId to put an id on the right side of the list proves the three OUTPUTS are right for
      // each combination — but it says nothing about `shellRenders` being read FROM the frozen
      // list, which is the Given's first clause and the whole reason editing that list is one of
      // the four edits. A derivation that never looks at the list has quietly turned it into
      // decoration, and the next milestone's shell-rendered route is then un-declarable.
      //
      // (a) THE VALUE HALF. Driven over ids on BOTH sides of the list, against the list itself,
      // with an EMPTY map so only this input can move the answer. This kills a derivation that
      // hard-codes the WRONG id (`routeId === "landing"` answers true where the list says false).
      for (const id of ["landing", "not-found", "fleet", "board", "config", "terminals"]) {
        assert.equal(
          surfaceMountFor(id, []).shellRenders,
          SHELL_RENDERED_ROUTES.includes(id),
          `${id}: shellRenders agrees with the frozen list`,
        );
      }

      // (b) THE SOURCE HALF, AND IT IS NOT BELT-AND-BRACES — IT IS THE ONLY INSTRUMENT THAT CAN
      // SEE THIS. The list has exactly ONE member today, so `SHELL_RENDERED_ROUTES.includes(id)`
      // and a hard-coded `routeId === "not-found"` are behaviourally INDISTINGUISHABLE for every
      // input: measured, a mutant that hard-codes the id passes clause (a) for all six ids. No
      // in-process assertion can tell them apart while the list is single-valued — so the
      // derivation is read where it is written, exactly as GAP-5's own clause reads `Shell.tsx`'s
      // root line for a fact about the cascade that no model-level check can reach.
      const entrySource = await readFile(path.join(repoRoot, "ui", "src", "app", "entry.mjs"), "utf8");
      const derivation = entrySource.split("\n").find((line) => /\bconst\s+shellRenders\s*=/.test(line));
      assert.ok(derivation, "surfaceMountFor derives `shellRenders` (non-vacuous: the derivation was found in the shipped source)");
      assert.match(
        derivation,
        /SHELL_RENDERED_ROUTES\s*\.\s*includes\s*\(\s*routeId\s*\)/,
        `shellRenders is READ FROM the frozen list rather than from a hard-coded id — the list is what a milestone EDITS to declare a shell-rendered route, and a derivation that does not read it makes that edit a no-op: ${derivation.trim()}`,
      );

      // AND THE HAZARD IS CLOSED GENERICALLY, not just for `landing` (architect F5). The state
      // whose three booleans say "nothing is wrong" while nothing renders is reachable for ANY id
      // that appears in both the list and the map — this story's own near-miss, made impossible
      // for every future route rather than pinned for this one. The two sets must be DISJOINT.
      const mapped = await surfaceMapKeys();
      assert.ok(Array.isArray(mapped), "the SURFACES declaration was found (non-vacuous)");
      assert.deepEqual(
        SHELL_RENDERED_ROUTES.filter((id) => mapped.includes(id)),
        [],
        "SHELL_RENDERED_ROUTES and SURFACES are DISJOINT — an id in both is the half-landed state, and `surfaceMountFor` reports it as `nothing is wrong`",
      );

      const cell = (routeId, map) => {
        const answer = surfaceMountFor(routeId, map);
        return { shellRenders: answer.shellRenders, mounts: answer.mounts, surfaceFailed: answer.surfaceFailed };
      };

      const rows = [
        // case                                   routeId       the map                                       shellRenders mounts surfaceFailed
        ["today, before the story", "not-found", ["fleet", "board", "config"], { shellRenders: true, mounts: false, surfaceFailed: false }],
        ["HALF-LANDED A — the map moved alone", "not-found", ["fleet", "board", "config", "not-found"], { shellRenders: true, mounts: false, surfaceFailed: false }],
        ["HALF-LANDED B — the list moved alone", "landing", ["fleet", "board", "config"], { shellRenders: false, mounts: false, surfaceFailed: true }],
        ["LANDED — both moved", "landing", ["fleet", "board", "config", "landing"], { shellRenders: false, mounts: true, surfaceFailed: false }],
      ];

      for (const [label, routeId, map, expected] of rows) {
        assert.deepEqual(cell(routeId, map), expected, `${label}: the three booleans`);
      }

      // ROW 2 IS THE WHOLE REASON THIS SCENARIO EXISTS: its answer is byte-identical to row 1's.
      // Nothing is red, nothing is logged, and a reviewer reading `surfaceMountFor`'s own comment
      // ("there is nothing to mount and nothing is wrong") is told the state is fine.
      assert.deepEqual(cell(rows[0][1], rows[0][2]), cell(rows[1][1], rows[1][2]), "the half-landed map-moved-alone answer is INDISTINGUISHABLE from today's — that is the danger, stated as an equality");

      // ROW 3 IS THE SAFE PARTIAL FAILURE, and it is worth having on the record: it is loud, it
      // names the surface and it offers the retry — an argument for editing entry.mjs FIRST.
      assert.equal(cell("landing", ["fleet", "board", "config"]).surfaceFailed, true, "the list-moved-alone half-landing is LOUD");

      // ROW 4's `mounts: true` is the cell that did not exist before this story, and it is the
      // one the SHIPPED map actually produces.
      assert.equal(surfaceMountFor("landing", ["fleet", "board", "config", "landing"]).mounts, true);

      // THE OUTLINE'S FIFTH THEN — "what the operator gets at `/` is <what renders>" — IS DRIVEN
      // IN NO ROW HERE, and that is stated rather than implied (QA F2). Rows 3 and 4 have their
      // render consequences covered where a rendered tree exists to read: row 4's "the terminals
      // home" is scenario 6's "at `/` the content region holds the home's own tree", and row 3's
      // "the shell's failed state, naming `landing`" is scenario 4's failed-state assertions
      // against the REAL shell. Rows 1 and 2 are COUNTERFACTUAL on a landed tree — the component
      // that would render "the shell's own placeholder card" is deleted, so there is nothing left
      // to render it with, which is scenario 6's own subject stated from the other side.
    },
  },

  // ======================================================================
  // Scenario 3: the route TABLE survives verbatim, and the same id now mounts a surface
  // ======================================================================
  {
    name: "home-route/00 the route table is untouched and the `landing` id survives — and that SAME id now answers mounts:true (00 scenario 3)",
    async run() {
      // The table's shape, order and freezing, exactly as m45 shipped it.
      assert.deepEqual(ROUTES.map((route) => route.id), ["landing", "fleet", "board", "config", "not-found"], "four addressable paths plus the shared not-found entry, in that order");
      assert.deepEqual(ROUTES.map((route) => route.path), ["/", "/fleet", "/board", "/config", null]);
      assert.deepEqual({ ...ROUTES[0] }, { id: "landing", path: "/" }, "ROUTES still holds { id: \"landing\", path: \"/\" }");
      assert.equal(Object.isFrozen(ROUTES), true, "…still frozen");
      for (const route of ROUTES) assert.equal(Object.isFrozen(route), true, "…entry by entry");

      // `routeFor` is not renegotiated here: the trailing-slash tolerance and the double-slash
      // refusal are m45's rulings and this story touches neither.
      assert.equal(routeFor("/").id, "landing");
      assert.equal(routeFor("//"), NOT_FOUND_ROUTE, "the bare protocol-relative root stays unknown — normalising it would make `//` a second spelling of the landing");
      assert.equal(routeFor("/Fleet").id, "not-found", "matching is case-sensitive");

      // The entry plan for `/` is unchanged, and asks for NO history rewrite.
      const bare = entryPlanFor(ADDRESS("/"));
      assert.equal(bare.surface, "landing");
      assert.equal(bare.replace, null);
      assert.equal(bare.history, HISTORY_NONE);

      // Every legacy address still rewrites exactly once to the path it always did, and none of
      // them resolves to `landing`.
      const legacy = [
        ["?mode=fleet", "/fleet", "fleet"],
        ["?mode=board", "/board", "board"],
        ["?mode=assets", "/config", "config"],
        ["?mode=wat", "/config", "config"],
      ];
      for (const [search, pathname, surface] of legacy) {
        const plan = entryPlanFor(ADDRESS("/", search));
        assert.equal(plan.history, HISTORY_REPLACE, `${search}: rewritten`);
        assert.equal(plan.replace.pathname, pathname, `${search} → ${pathname}`);
        assert.equal(plan.surface, surface);
        assert.notEqual(plan.surface, "landing", `${search} does not resolve to the landing`);
        // EXACTLY ONCE: re-deciding over the plan's own output asks for nothing further.
        assert.equal(entryPlanFor(plan.address).replace, null, `${search}: idempotent, so the rewrite cannot loop`);
      }

      // …and the last clause, the only one that was red before this story: that SAME `landing`
      // id now mounts, against the ENTRY's own surface map rather than a list typed here.
      const keys = await surfaceMapKeys();
      assert.equal(surfaceMountFor(bare.surface, keys).mounts, true, "the id the table yields for `/` is an id the entry mounts");
    },
  },

  // ======================================================================
  // Scenario 4: a home that throws takes down ITSELF and nothing else
  // ======================================================================
  {
    name: "home-route/00 a surface that throws at `landing` takes down itself and nothing else — the chrome, the nav and the skip link survive (00 scenario 4)",
    async run() {
      await capturingConsoleError(async (captured) => {
        await withShellApp(
          { routeId: "landing", address: ADDRESS("/"), identity: "aof", viewportWidth: 1280, surface: "throwing" },
          async (app) => {
            // The chrome survives, whole.
            assert.ok(app.row("top-bar"), "the top bar is still in the tree");
            assert.ok(app.nav(), "…the nav too");
            const skip = app.focusables()[0];
            assert.equal(skip?.type, "a", "…and the skip link is still the FIRST focusable element");
            assert.match(String(skip?.props?.href ?? ""), /^#/, "…pointing at the content region");

            assert.equal(app.banners().length, 1, "exactly one banner");
            assert.equal(app.mains().length, 1, "…and exactly one <main>");

            // The content region holds the shell's surface-failed treatment, naming the surface
            // and offering the retry.
            const main = textOf(app.mains()[0]);
            assert.match(main, /Could not load the landing view/, "the failed state NAMES the surface");
            assert.match(main, /Retry/, "…and offers the retry");

            // A surface that failed is not an unmatched address: the nav item stays current.
            assert.equal(app.navItem("landing").props["aria-current"], "page");

            // The boundary is LOUD — a swallowed throw is how the next one takes a day to find.
            assert.ok(captured.length > 0, "the boundary wrote to the console");
          },
        );

        // …and the caught surface is the one keyed by ROUTE: asking the same shell for a
        // different route afterwards renders that route normally.
        await withShellApp(
          { routeId: "fleet", address: ADDRESS("/fleet"), identity: "aof", viewportWidth: 1280, surface: "plain" },
          async (app) => {
            assert.ok(app.surfaceBody(), "a different route renders its surface normally after the throw");
            assert.doesNotMatch(textOf(app.mains()[0]), /Could not load the/, "…and carries no residue of the caught one");
          },
        );
      });
    },
  },

  // ======================================================================
  // Scenario 5: `/` declares `content:fixed`
  // ======================================================================
  {
    name: "home-route/00 `/` declares content:fixed with scrollOwner `descendants`, and the shell hands it a LOADED surface so the mounting shimmer is never its first paint (00 scenario 5)",
    run() {
      const landing = contentModeFor("landing");
      assert.equal(landing.mode, CONTENT_MODE_FIXED, "landing is content:fixed — the page never scrolls and the grid owns scroll");
      assert.equal(landing.scrollOwner, "descendants");
      assert.equal(landing.regionOwnsScroll, false, "the content region is NEVER itself the scroll owner in content:fixed");
      assert.equal(landing.minHeight, 0);

      // The rest of the map is untouched by this story.
      assert.equal(contentModeFor("board").mode, CONTENT_MODE_FIXED, "board is still content:fixed");
      for (const routeId of ["fleet", "config", "not-found"]) {
        assert.equal(contentModeFor(routeId).mode, CONTENT_MODE_PAGE, `${routeId} is still content:page`);
      }

      // The root establishes no scrollport in `content:page`, and that rule is unchanged.
      for (const routeId of ["fleet", "config", "not-found", "unknown-future-route"]) {
        assert.equal(contentModeFor(routeId).rootEstablishesScrollport, false, `${routeId}: page mode, no scrollport`);
      }

      // The mode is read from the ROUTE ID, so nothing about the address, the origin or the
      // viewport can change any of these answers — there is nowhere to put one.
      assert.equal(contentModeFor("landing").mode, contentModeFor("landing").mode);
      assert.deepEqual(contentModeFor("landing"), landing, "the same id yields the same answer, always");

      // TRAP 2, pinned. `STATE_MOUNTING`'s treatment is a `pulse-placeholder` with no
      // reduced-motion escape (story 06's subject), and `/` could never reach it before. It still
      // cannot: there is no code-split import here, so the shell is handed a surface it can render
      // synchronously and `surfaceLoaded` is never false.
      const state = contentStateFor({ routeId: "landing", surfaceLoaded: true });
      assert.equal(state.state, STATE_POPULATED, "the home is handed a LOADED surface, so `/` paints `populated` and never the mounting shimmer");
      assert.equal(state.treatment, "none", "…and the shell draws nothing of its own over it");
    },
  },

  // ======================================================================
  // Scenario 6: the placeholder is unreachable from every address
  // ======================================================================
  {
    name: "home-route/00 the placeholder is unreachable from every address, and the shell's shared card wrapper is reached by not-found ALONE (00 scenario 6)",
    async run() {
      // It is not merely unrouted — it is not in the product. The sentence and the decorative
      // mark are gone from every `ui/src` module, which is the claim "deleted" actually makes.
      for (const file of await uiSourceFiles()) {
        const source = await readFile(path.join(repoRoot, file), "utf8");
        assert.equal(source.includes(PLACEHOLDER_SENTENCE), false, `${file} still carries the placeholder sentence`);
      }

      // …and nothing renders it, at any address. The shell is what drew it, so the shell is
      // mounted at every route it knows.
      for (const [routeId, pathname] of [["landing", "/"], ["fleet", "/fleet"], ["board", "/board"], ["config", "/config"], ["not-found", "/nope"]]) {
        await withShellApp(
          { routeId, address: ADDRESS(pathname), identity: "aof", viewportWidth: 1280, surface: routeId === "not-found" ? "none" : "plain" },
          async (app) => {
            const rendered = textOf(app.tree());
            assert.equal(rendered.includes(PLACEHOLDER_SENTENCE), false, `${pathname}: no rendered tree contains the placeholder sentence`);
            const main = app.mains()[0];
            if (routeId === "landing") {
              assert.equal(textOf(main).includes(PLACEHOLDER_MARK), false, "at `/` the content region carries no `✦` mark");
            }
            // The shared centred card wrapper is now the not-found state's ALONE. The two states
            // that shared it are one.
            const wrappers = findAll(main, (node) => node.props?.className === SHELL_CARD_WRAPPER_CLASS);
            assert.equal(wrappers.length, routeId === "not-found" ? 1 : 0, `${pathname}: the shell's shared card wrapper is ${routeId === "not-found" ? "present" : "absent"}`);
          },
        );
      }

      // AT `/` THE CONTENT REGION HOLDS THE HOME'S OWN TREE and nothing the shell drew itself —
      // read off the REAL home inside the REAL shell.
      await withStatusFace(QUIET_FLEET, async ({ url }) => {
        await withShellComposedHome({ url, routeId: "landing", address: ADDRESS("/"), identity: "aof", viewportWidth: 1280 }, async (app) => {
          const main = app.mains()[0];
          assert.equal(findAll(main, (node) => node.props?.className === SHELL_CARD_WRAPPER_CLASS).length, 0, "the shell draws no card of its own at `/`");
          assert.ok(app.homeState(), "the content region holds the HOME's own state treatment");
          assert.equal(textOf(main).includes(PLACEHOLDER_SENTENCE), false);

          // …and the shell's nav still offers every destination the placeholder used to link,
          // so nothing the deleted file said is lost. (Landing rendered `nav.items` minus its own
          // id — i.e. it restated the nav two rows below the nav.)
          const navIds = app.navItems().map((item) => item.props["data-nav-item"]);
          for (const destination of ["fleet", "board", "config"]) {
            assert.ok(navIds.includes(destination), `the nav still offers ${destination}`);
          }
        });
      });
    },
  },

  // ======================================================================
  // Scenario Outline 7: the milestone's file-budget accounting, by the gate's own arithmetic
  // ======================================================================
  {
    name: "home-route/00 the file-budget accounting by acd-ui-surface-file-budget's OWN arithmetic — Shell.tsx is net-negative and the other five have not moved (00 scenario 7, all six rows)",
    async run() {
      // ROW 1 IS THE ONE THIS STORY IS JUDGED ON, and it is an INEQUALITY rather than a number:
      // the story removes a branch and an import, and a build that came out even has absorbed
      // grid logic into the shell — the signal ARCHITECTURE names.
      const shell = await gateLineCount("ui/src/app/Shell.tsx");
      assert.ok(shell < 931, `ui/src/app/Shell.tsx is ${shell} lines, and must be STRICTLY FEWER than the 931 measured at refine`);
      assert.ok(shell <= 940, `…and inside its 940-line ceiling (${shell})`);

      // ROW 2 IS TECH_DEBT 33'S NAMED PREDICTION FOR THIS MILESTONE, and it is stated as an
      // EXACT count because "zero vocabulary added" is not observable from a ceiling with 44
      // lines of room: the failure it predicts would stay green all the way through.
      assert.equal(await gateLineCount("ui/src/app/shell-layout.mjs"), 1016, "ui/src/app/shell-layout.mjs gains ZERO lines — one row's VALUE changed and nothing else");
      assert.ok(1016 <= 1060, "…inside its 1060-line ceiling");

      // ROWS 3-6: the blast radius this story must not touch. Row 5 is on the table because a
      // diff that spills ONE line into DetailPanel.tsx fails CI — it is AT its ceiling — and a
      // reviewer would look for the cause in this story's own files.
      // ROW 4 WAS RE-AIMED 2026-08-13 BY STORY 05, and the re-aim is the point rather than a
      // repair: ADR-007's amendment ruled that `TerminalControl.tsx` DOES change (it loses the
      // `{subscribed ? … : null}` byte-area guard to a host declaration and replaces the
      // hard-coded `openerRef`), and the grid's own wiring — the arbitrated subscription, the
      // roving stop, the pane-activation door — lands there too. It is pinned at its CEILING
      // rather than at a count this story chose: 840 of 840, paid for by two extractions into
      // existing components (the header region and the fullscreen door), with ZERO headroom left.
      // The next author here EXTRACTS; there is no room to append.
      const untouched = [
        // +4 by 49/05's R-2 (the node card's work line carries its whole value in `title`, so a
        // truncation cannot silently under-count repos — m48's own defect re-created by CSS). The
        // card PEEK still does not move, which is what this row was really about.
        // 1550 -> 1560 on 2026-09-21 by 130/03 (ADR-005 §5): the loop line and its Stop on the node
        // card — `nodeWorkRegion` in place of `nodeCurrentWork`, one `LoopStopRow`, the rung memory —
        // with every rendered fact precomputed in runs.mjs/scope.mjs. AT its ceiling with ZERO
        // headroom (the ceiling's own rule: the next region belongs in its own file, and
        // ui/src/fleet/ is itself at 20/20 — TECH_DEBT item 33). The card peek still does not move.
        ["ui/src/fleet/Fleet.tsx", 1560, 1560, "130/03's loop line + Stop, inside its ceiling with zero headroom; the card peek does not move"],
        ["ui/src/terminal/TerminalControl.tsx", 840, 840, "story 05's wiring, inside its ceiling with zero headroom"],
        // 1000 -> 994 on 2026-09-15 by 127/04: `humanizeSlug` moved to `model.ts` (the backlog row
        // shares it) and the archived pill joined the header cluster — net −6, so the ZERO
        // headroom this row was really about is now six lines. The re-aim is the Fleet.tsx row's idiom.
        // 994 -> 996 by 133/04 (ADR-007 §5): the ARCHITECTURE tab, its Records row and the one
        // `DiagramMarkdown` call — everything else went to `diagrams.mjs`. Four lines of headroom.
        ["ui/src/board/DetailPanel.tsx", 996, 1000, "127/04's move out and pill in, then 133/04's tab; four lines of headroom now"],
        ["ui/src/config/App.tsx", 1298, 1300, "untouched"],
      ];
      for (const [file, expected, ceiling, why] of untouched) {
        const lines = await gateLineCount(file);
        assert.equal(lines, expected, `${file}: exactly ${expected} — ${why}`);
        assert.ok(lines <= ceiling, `${file}: at or under its ${ceiling}-line ceiling`);
      }
    },
  },
];
