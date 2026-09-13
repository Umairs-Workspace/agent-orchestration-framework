// Fitness function: acd-terminal-origin-not-port (milestone 46 / ADR-004) — WHOLE, since 46/04.
//
//   "Every socket URL is built from an ORIGIN THE SURFACE IS HANDED, by ONE pure builder that
//    reads no global. No terminal surface holds a port literal: not a constant, not a
//    template, not a default argument."
//
// THE SPLIT IS OVER. 46/03 authored this gate in two halves because only one of them could be
// green on arrival: the `ui/src/terminal/` clauses shipped here and ran from that story onward,
// while the WHOLE-TREE clause — no socket URL ANYWHERE in `ui/src` carries a port literal — sat
// in a parked `acd-terminal-origin-not-port.mjs`, off the suite glob, because
// `TerminalDock.tsx`'s `const FLEET_PORT = 4181` made it RED. 46/04 deleted that file, so the
// clause is MERGED IN below and the parked sibling is gone. A gate lands in the story that turns
// it GREEN, not the story that writes it — and it lands whole, in one file, rather than leaving
// a second home for one invariant.
//
// WHY THE HALF THAT WAS ALWAYS GREEN MATTERED ANYWAY. 46/04 and 46/05 are the stories that write
// the React component against this `.mjs` set. Without these clauses registered, NOTHING failed
// CI when a port literal returned to the shared set or the builder started reading a browser
// global — and ADR-001 is explicit that this gate is the whole difference between an invariant
// and a preference, "because no reviewer reliably notices an absence".
//
// WHY THIS NEEDS ITS OWN GATE AT ALL, measured rather than assumed. The existing
// `acd-no-surface-mode-url-literal` detects exactly two things — a
// `[?&]mode=(fleet|board|assets)` literal and a minted ROUTE PATH. A bare
// `const FLEET_PORT = 4181` matches NEITHER, which is why `TerminalDock.tsx` is not on that
// gate's allowlist and does not trip it today. Scoping this gate to SOCKET URL construction
// keeps the two from ever fighting over the same exemption list.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  TERMINAL_DIR,
  UI_SRC,
  BROWSER_GLOBALS,
  NAMED_PRODUCT_PORTS,
  collect,
  rel,
  stripComments,
  stripperSelfCheck,
  nonVacuousSource,
  portLiteralsIn,
  buildsASocketUrl,
} from "../../support/terminal-gate-detectors.mjs";

export const archTests = [
  // ══ THE STRIPPER ITSELF, FIRST. Every clause below is an ABSENCE sweep over a
  //    comment-stripped source, and TECH_DEBT item 24 measured what a blinded stripper does to
  //    that shape: it finds no violations and the gate passes. This detector's own subject is
  //    `ui/src/terminal/**`, a folder whose ADRs REQUIRE it to explain in prose the defects it
  //    guards against — so one `// … the /* … */ …` comment is all it would take. The helper
  //    was on item 24's hazardous list until this story corrected it; this clause is what stops
  //    it drifting back, and it names the STRIPPER rather than the subject when it fires.
  {
    name: "arch/46 (acd-terminal-origin-not-port) self-check: the shared comment stripper is not blinded — a line comment containing `/*` does not delete the file below it (TECH_DEBT item 24)",
    run: async () => {
      assert.deepEqual(stripperSelfCheck(), [], "the stripper strips LINE comments first and BLOCK comments second; the other order eats the file at the first `//` containing `/*`");
    },
  },

  {
    name: "arch/46 ADR-004 (acd-terminal-origin-not-port): no module under ui/src/terminal/ names a port at all — not a constant, not a template, not a default argument",
    run: async () => {
      const files = await collect(TERMINAL_DIR, [".mjs", ".d.mts", ".ts", ".tsx"]);
      assert.ok(files.length >= 5, `the shared terminal set was actually read (non-vacuous): ${files.length} files`);

      const offenders = [];
      for (const file of files) {
        const hits = portLiteralsIn(await readFile(file, "utf8"));
        if (hits.length > 0) offenders.push(`${rel(file)} → ${[...new Set(hits)].join(", ")}`);
      }
      assert.deepEqual(
        offenders,
        [],
        "the port is RETIRED, not relocated: a shared control that names a port has simply moved `FLEET_PORT` to a new address. The origin is handed in whole — scheme, host and OPTIONAL port — and an origin with no port must produce a URL with no port.",
      );
    },
  },

  {
    name: "arch/46 ADR-004 (acd-terminal-origin-not-port): the socket URL is built by ONE exported pure builder that takes origins as an argument and reads no browser global",
    run: async () => {
      const files = await collect(TERMINAL_DIR, [".mjs"]);
      assert.ok(files.length >= 5, `non-vacuous: ${files.length} modules`);

      // Exactly ONE module constructs a socket scheme. Three builders collapsed into it
      // (`terminalWsUrl`, `mirrorWsUrl`, `terminalViewSocketUrl`); a second one here would be
      // the drift starting over.
      const builders = [];
      for (const file of files) {
        const clean = stripComments(await readFile(file, "utf8"));
        if (/\bwss?\b/.test(clean) && /:\/\//.test(clean)) builders.push(rel(file));
      }
      assert.deepEqual(builders, ["ui/src/terminal/socket-url.mjs"], "exactly one module builds a socket URL");

      const clean = stripComments(await readFile(path.join(TERMINAL_DIR, "socket-url.mjs"), "utf8"));
      // The companion assertion TECH_DEBT item 24 asks every stripped-source suite to carry: an
      // empty strip is a BLINDING, not a clean file, and the absence sweeps below would all pass.
      assert.equal(nonVacuousSource("ui/src/terminal/socket-url.mjs", clean), null);
      // It is EXPORTED, it takes the origins as an ARGUMENT, and it reads them off that
      // argument rather than off anything ambient.
      assert.match(clean, /export function terminalSocketUrl\s*\([^)]*\{\s*origins\s*\}/s, "the builder takes `{ origins }` as an argument");
      assert.match(clean, /origins\?\.\[|origins\[/, "…and reads the origin it needs OFF that argument");

      // AND IT READS NO BROWSER GLOBAL. Under plain `node` none of these exists, so a builder
      // that read one would pass every headless behavioural test and fail only in a browser —
      // the class of defect this repo has no harness to catch.
      for (const global of BROWSER_GLOBALS) {
        assert.ok(
          !new RegExp(`\\b${global}\\b`).test(clean),
          `the builder does not reach for \`${global}\` — resolvability is an INPUT precisely so the whole task stays headless`,
        );
      }

      // And the whole shared set is loadable by plain `node`, which is the same property
      // asserted as behaviour rather than as text.
      for (const file of files) {
        await import(`file://${file.replaceAll("\\", "/")}`);
      }
    },
  },

  // ══ THE WHOLE-TREE CLAUSE, PROMOTED BY 46/04 out of the parked
  //    `acd-terminal-origin-not-port.mjs` in the same diff that deleted `TerminalDock.tsx`.
  //    Its body is unchanged: it was written against the post-deletion tree.
  //
  //    WHY IT WAS RED UNTIL NOW, which is also its NON-VACUITY PROOF: `TerminalDock.tsx` held
  //    `const FLEET_PORT = 4181`, interpolated it into
  //    `` `${scheme}://${hostname}:${FLEET_PORT}/ws/terminal-view` ``, and fell back to the bare
  //    authority `"127.0.0.1:4177"`. A gate that could not see those is a gate worth nothing.
  {
    name: "arch/46 ADR-004 (acd-terminal-origin-not-port): no socket URL anywhere in ui/src carries a port literal — FLEET_PORT is DELETED, not relocated",
    run: async () => {
      const files = await collect(UI_SRC, [".mjs", ".ts", ".tsx", ".js", ".jsx"]);
      assert.ok(files.length > 30, `ui/src was actually read (non-vacuous): ${files.length} files`);

      const offenders = [];
      let inScope = 0;
      for (const file of files) {
        const text = await readFile(file, "utf8");
        if (!buildsASocketUrl(text)) continue;
        inScope += 1;
        const hits = portLiteralsIn(text);
        if (hits.length > 0) offenders.push(`${rel(file)} → ${[...new Set(hits)].join(", ")}`);
      }

      assert.deepEqual(
        offenders,
        [],
        "a terminal socket URL is dialled at an origin the surface was HANDED. A port literal beside a `/ws/terminal*` route is the defect this milestone exists to delete: the board runs on an ephemeral port and the fleet's address is a served fact, so a constant can only ever be a guess that works on one machine.",
      );

      // NON-VACUOUS IN THE OTHER DIRECTION, and this is the clause that keeps the sweep honest
      // after the move. Once the two components were deleted, "no file under `ui/src` that
      // builds a socket URL holds a port" would go green if NO file built one at all — which is
      // exactly the vacuity ADR-006 caught in invariant 4's sibling. Socket URLs are still
      // built here, and they are built in the ONE place the clause above pins.
      assert.ok(inScope >= 1, `the sweep found ${inScope} files that take part in socket URL construction — zero would make this clause pass vacuously`);
    },
  },

  {
    name: "arch/46 ADR-004 (acd-terminal-origin-not-port) non-vacuity: a port is a POSITION, not a number — every real port shape fires, and the box sizes that share its range do not",
    run: async () => {
      // A synthesized plant, hand-written (never a string-replace on a real file), asserted to
      // LAND before the detector is asserted to fire — the house convention.
      const plant = [
        "const FLEET_PORT = 4181;",
        "function mirrorWsUrl(host, nodeId, sessionId) {",
        "  return `ws://${host}:4181/ws/terminal-view?nodeId=${nodeId}&sessionId=${sessionId}`;",
        "}",
      ].join("\n");
      assert.ok(plant.includes("FLEET_PORT"), "the plant landed");
      const hits = portLiteralsIn(plant);
      assert.ok(hits.includes("FLEET_PORT"), `the detector sees a port-named constant: ${hits.join(", ")}`);
      assert.ok(hits.includes(":4181"), "…and the authority that carries it");

      // Every real shape a port takes on a terminal surface.
      const shapes = [
        ["a port-named constant", "const FLEET_PORT = 4181;"],
        ["a port interpolated into an authority", "const u = `${scheme}://${hostname}:${FLEET_PORT}/ws/terminal-view`;"],
        ["a literal port in a ws authority", 'const u = "ws://127.0.0.1:4181/ws/terminal-view";'],
        ["a bare host:port fallback string", 'const host = fromPage ?? "127.0.0.1:4177";'],
        ["a lower-case port key", "serveBoard({ port: 4178 });"],
      ];
      for (const [label, snippet] of shapes) {
        assert.ok(portLiteralsIn(snippet).length > 0, `the detector fires on ${label}: ${snippet}`);
      }

      // AND THE FALSE POSITIVES IT MUST NOT FIRE ON. These are not hypothetical: the drag
      // clamp and DESIGN's own box sizes live in this very tree, and every one of these was
      // reported as a PORT by the first cut of this detector.
      const notPorts = [
        ["a drag clamp ceiling", "const DOCK_MAX_HEIGHT = 1200;"],
        ["a viewport box", "const box = { width: 1280, height: 816 };"],
        ["DESIGN's documented dock box", "terminalFitScale({ boxWidth: 1264, boxHeight: 280 });"],
        ["the fullscreen overlay box", "const overlay = { boxWidth: 1280, boxHeight: 816 };"],
        ["an intrinsic screen size", "const INTRINSIC = { intrinsicWidth: 640, intrinsicHeight: 408 };"],
        ["a Tailwind arbitrary value", 'const cls = "text-[11px] min-w-[1280px]";'],
        ["a word merely containing PORT", "const TRANSPORT_CAUSE_LINE = 'disconnected — the stream dropped';"],
        ["a timeout in the port range", "setTimeout(tick, 5000);"],
        ["a colon in a CSS-ish literal", 'const style = "grid-template-columns: 1264px";'],
      ];
      for (const [label, snippet] of notPorts) {
        assert.deepEqual(portLiteralsIn(snippet), [], `${label} is NOT a port: ${snippet}`);
      }

      // The clean baseline does NOT trip: a builder taking `{ origins }` and interpolating the
      // origin it was handed.
      const baseline = [
        "export function terminalSocketUrl(source, params, { origins }) {",
        "  const parsed = new URL(origins[source.originRole]);",
        "  return `ws://${parsed.host}${source.path}?${query}`;",
        "}",
      ].join("\n");
      assert.deepEqual(portLiteralsIn(baseline), [], "an origin handed in whole trips nothing");
      for (const port of NAMED_PRODUCT_PORTS) {
        assert.ok(
          portLiteralsIn(`const u = "ws://127.0.0.1:${port}/ws/terminal";`).includes(`:${port}`),
          `${port} is caught in an authority position`,
        );
        assert.deepEqual(portLiteralsIn(`const height = ${port};`), [], `${port} is NOT caught as a bare number — a port is a POSITION, not a value`);
      }
    },
  },
];
