// Fitness function: acd-no-per-surface-fixed-overlay (m45/ADR-005; m46/ADR-009) —
//
//   "NO per-surface `fixed inset-0` layer. A full-viewport overlay is the SHELL's, reached
//    through `requestFullscreen`; a surface that paints one has built a second stacking
//    vocabulary and a second `Escape` handler beside the shell's."
//
// EXPECTED GREEN from milestone 46 / story 05, which re-homes the one surviving violation.
//
// ═══ WHY THIS FILE EXISTS AT ALL, AND IT IS THE WHOLE POINT ═══════════════════════════════════
//
// ADR-005 named this prohibition in m45 and gave it NO DETECTOR. What it gave instead was an
// EXEMPTION: `acd-shell-z-ladder-single-home` carried `ui/src/fleet/terminal-view/FleetTerminalView.tsx`
// on a shrink-only list, "because milestone 46 deletes the file". That exemption caught only the
// `z-50` HALF of the violation — the `fixed inset-0` half was never detected anywhere — and it
// was keyed to a FILE.
//
// So when story 46/04 deleted that file, the exemption retired exactly as designed and
// `acd-shell-z-ladder-single-home` went green… while the SHAPE survived under a new name. The
// extracted control re-created it verbatim: `createPortal(<div className="fixed inset-0 …
// z-50">, document.body)`. Every gate green, the prohibition permanently unenforced, and the one
// artefact that had ever pointed at it now pointing at nothing.
//
//   A RULE WHOSE ONLY ENFORCEMENT WAS AN EXEMPTION ON A DELETED FILE IS NOT ENFORCED.
//   An exemption retires with the FILE; the RULE it was an exemption from does not.
//
// ═══ AND WHY ITS FIRST CUT WAS ALSO WRONG (architect's review, 2026-08-08) ════════════════════
//
// The first version of this gate was CALIBRATED TO ITS OWN PLANT rather than to a diff. Two
// measured failures, both fixed below and both re-proved in the self-check:
//
//   1. The portal clause matched `createPortal(` … `document.body` within 400 characters. The
//      REAL historical violation's span is **1,593 characters** (measured against
//      `git show HEAD:ui/src/fleet/terminal-view/FleetTerminalView.tsx`), so the clause fired on
//      the seven-line synthesized plant and NOT on the actual thing it was written about. That
//      fixture is now committed (`test/fixtures/fleet-terminal-view-fullscreen-portal.txt`,
//      verbatim from history) and every clause is asserted against IT — a detector calibrated
//      against its own plant proves the plant.
//   2. The extent test was the literal pair `fixed` + `inset-0`. Nine other spellings of the same
//      layer walked past it: `inset-x-0 inset-y-0`, `inset-[0px]`, `[inset:0px]`, the four-offset
//      long form, `h-screen w-screen`, `inset-x-0 top-0 h-dvh`, and the style-object form. Extent
//      is now a SET over two AXES (see `fullViewportExtent`), which is what the shape actually
//      is: something pinned to the viewport that covers all of it.
//
// ═══ WHAT COUNTS AS THE SHAPE ═════════════════════════════════════════════════════════════════
//
// A `fixed` positioning fact AND full extent on BOTH axes, IN ONE CLASS STRING (or one style
// object, or one CSS rule). Scoped to one group rather than OR-ed across a file: a component with
// `fixed bottom-4` in one place and `inset-0` in another has not built an overlay, and a gate
// that said it had would be relaxed rather than obeyed.
//
// AND WHAT DELIBERATELY DOES NOT COUNT. `position: fixed` is NOT forbidden — the board's dispatch
// toast is `fixed bottom-4 right-4 z-40`, correctly on the ladder's `toast` rung, and the shell's
// own dock band is `fixed inset-x-0 bottom-0`. Neither covers the viewport, neither traps a key,
// neither competes with the fullscreen occupant. `absolute inset-0` is not it either: filling
// your OWN box is what a byte area does. The prohibition is about a layer that takes the WHOLE
// SCREEN — because that is the one that needs a rung, a focus trap, an `Escape` handler and a way
// out, i.e. the one the shell already owns.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const UI_SRC = "ui/src";

// THE SHELL'S ONE HOME. The overlay that presents a `shell:fullscreen` occupant, on the ladder's
// top rung, with the focus trap, the `Escape` listener and the adoption host beside it. It is
// named rather than inferred: "whichever file happens to have one" is a description, not an
// invariant.
//
// IT IS EXEMPT FROM THE EXTENT CLAUSE ONLY. The portal clause below binds the shell as hard as it
// binds a surface — the shell ADOPTS a node into its own React-childless host, and a shell that
// portalled into `document.body` would have the same escape-from-the-tree defect it exists to
// take away from everybody else.
const SHELL_OVERLAY = "ui/src/app/Shell.tsx";

// THE NAMED SUBJECT (m46/05). The file the prohibition escaped into once already — the extracted
// control that replaced `FleetTerminalView.tsx` — asserted to EXIST and to be swept, so this gate
// can never repeat the failure it was written about: an assertion aimed at a file that is gone.
const NAMED_SUBJECT = "ui/src/terminal/TerminalControl.tsx";

// The REAL violation, verbatim from `git show HEAD:ui/src/fleet/terminal-view/FleetTerminalView.tsx`
// before story 46/04 deleted it. Committed as a fixture because history is not a test dependency:
// once this milestone lands, `HEAD` no longer carries the file, and a self-check that reached for
// it would quietly stop asserting.
const HISTORICAL_VIOLATION = "test/fixtures/fleet-terminal-view-fullscreen-portal.txt";

// ─────────────────────────────────────────────────── the exemption list ───────
//
// EMPTY, AND ITS EMPTINESS IS ASSERTED (architect's review, 2026-08-08). The first cut said
// "shrink-only" in prose and enforced only STALENESS — so a single added line, with a reason
// verbatim from the list of reasons this file's own header BARS ("milestone 47 deletes this
// file"), waved a live violation through with every clause green. That is the exact failure this
// gate exists to prevent, reproduced against the gate.
//
// So: growth requires DELETING an assertion that says why, in the diff that grows it. And if an
// entry is ever genuinely wanted, its value is `{ reason, expires }` with an ISO date — an expiry
// that is not a filename — and the gate fails the day it passes. `validateExemptions` below holds
// both halves, and it runs over whatever the map contains rather than over what it should.
const FIXED_OVERLAY_EXEMPTIONS = new Map([]);

// A reason that rests on a file's future is not a reason. This is the m45 exemption's own text,
// generalised: it retired with the file and left the rule unenforced.
const BARRED_REASONING = /\bdelete[sd]?\b|\bremove[sd]?\b|\bretire[sd]?\b|\bnext milestone\b|\bmilestone \d+ (deletes|removes)\b/i;

export function validateExemptions(entries, today = new Date()) {
  const problems = [];
  for (const [file, value] of entries) {
    if (value == null || typeof value !== "object" || typeof value.reason !== "string" || typeof value.expires !== "string") {
      problems.push(`${file}: an exemption's value must be \`{ reason, expires }\` — a bare string is a permission slip with no end date, which is how the m45 entry outlived the rule it exempted`);
      continue;
    }
    if (BARRED_REASONING.test(value.reason)) {
      problems.push(`${file}: the reason "${value.reason}" rests on the file being deleted. That is BARRED, and it is barred because it is the exact reasoning that let this prohibition go unenforced for a whole milestone: an exemption retires with a FILE while the RULE does not.`);
    }
    const expires = Date.parse(value.expires);
    if (!Number.isFinite(expires)) {
      problems.push(`${file}: \`expires\` must be an ISO date; got ${JSON.stringify(value.expires)}`);
    } else if (expires <= today.getTime()) {
      problems.push(`${file}: the exemption expired on ${value.expires}. Re-home the overlay through \`requestFullscreen\`, or take a NEW decision with a new date — silence is not a renewal.`);
    }
  }
  return problems;
}

// ───────────────────────────────────────────────────────── the detectors ──────

// Line comments FIRST, block comments SECOND (TECH_DEBT item 24): the other order lets a line
// comment containing `/*` open a phantom block that eats the file below it — and every clause
// here is an ABSENCE sweep, so a blinded stripper turns all of them green while asserting
// nothing. This file's own subjects carry long headers by design.
function stripComments(source) {
  return source.replace(/^[ \t]*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
}

const token = (name) => new RegExp(`(^|[\\s"'\`:])${name}(?=[\\s"'\`]|$)`);

// Utilities whose presence means "this edge is pinned to the viewport's edge".
const FIXED = token("fixed");
const INSET_0 = token("inset-0");
const INSET_X_0 = token("inset-x-0");
const INSET_Y_0 = token("inset-y-0");
const TOP_0 = token("top-0");
const RIGHT_0 = token("right-0");
const BOTTOM_0 = token("bottom-0");
const LEFT_0 = token("left-0");
// Arbitrary-value spellings of the same thing: `inset-[0px]`, `inset-[0]`, `[inset:0px]`.
const INSET_ARBITRARY = /(^|[\s"'`:])inset-\[0[a-z%]*\]|(^|[\s"'`:])\[inset:\s*0[a-z%]*\]/;
// Full-viewport SIZES. `h-full`/`w-full` are deliberately absent: filling the box you were given
// is not covering the screen, and it is what every well-behaved child does.
const FULL_HEIGHT = /(^|[\s"'`:])h-(screen|dvh|lvh|svh)(?=[\s"'`]|$)/;
const FULL_WIDTH = /(^|[\s"'`:])w-(screen|dvw|lvw|svw)(?=[\s"'`]|$)/;

// The CSS / style-object spellings, for a stylesheet or a `style={{ … }}`.
const CSS_FIXED = /position\s*:\s*["']?fixed/;
const CSS_INSET_0 = /\binset\s*:\s*["']?0/;
const CSS_OFFSET_0 = (side) => new RegExp(`\\b${side}\\s*:\\s*["']?0`);
const CSS_FULL_HEIGHT = /\bheight\s*:\s*["']?100(vh|dvh|lvh|svh)/;
const CSS_FULL_WIDTH = /\bwidth\s*:\s*["']?100(vw|dvw|lvw|svw)/;

// fullViewportExtent(group) — extent as a SET over TWO AXES, which is what the shape actually is.
// A layer covers the screen when both axes are pinned edge-to-edge, however that is spelled.
export function fullViewportExtent(group) {
  const both = INSET_0.test(group) || INSET_ARBITRARY.test(group) || CSS_INSET_0.test(group);
  const vertical =
    both
    || INSET_Y_0.test(group)
    || (TOP_0.test(group) && BOTTOM_0.test(group))
    || FULL_HEIGHT.test(group)
    || (CSS_OFFSET_0("top").test(group) && CSS_OFFSET_0("bottom").test(group))
    || CSS_FULL_HEIGHT.test(group);
  const horizontal =
    both
    || INSET_X_0.test(group)
    || (LEFT_0.test(group) && RIGHT_0.test(group))
    || FULL_WIDTH.test(group)
    || (CSS_OFFSET_0("left").test(group) && CSS_OFFSET_0("right").test(group))
    || CSS_FULL_WIDTH.test(group);
  return vertical && horizontal;
}

const isFixed = (group) => FIXED.test(group) || CSS_FIXED.test(group);

// classGroups(source) — the candidate "one class string" units, so the pair is scoped to a single
// string rather than OR-ed across a whole file (a component with `fixed bottom-4` in one place and
// `inset-0` in another has not built an overlay).
//
// THREE KINDS OF GROUP, because all three are how one class string gets written here:
//   · every string / template literal on its own (`const OVERLAY = "fixed inset-0 …"`);
//   · every `cn(…)` / `clsx(…)` call, whose literals COMPOSE into one class string;
//   · every `className={…}` / `style={{…}}` attribute value, likewise.
// Balanced-delimiter scanning, never a fixed character window — the window is precisely what made
// the first cut miss the real violation.
export function classGroups(source) {
  const groups = [];
  for (const match of source.matchAll(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g)) groups.push(match[0]);
  for (const opener of [/\bcn\s*\(/g, /\bclsx\s*\(/g, /\bclassName\s*=\s*\{/g, /\bstyle\s*=\s*\{/g, /\bclassName\s*=\s*"/g]) {
    for (const match of source.matchAll(opener)) {
      const span = balancedFrom(source, match.index + match[0].length - 1);
      if (span !== null) groups.push(span);
    }
  }
  return groups;
}

// The balanced span starting at an opening delimiter. Returns null on an unbalanced source rather
// than guessing, so a parse failure cannot silently produce a quiet group.
function balancedFrom(source, open) {
  const pairs = { "(": ")", "{": "}", '"': '"' };
  const close = pairs[source[open]];
  if (close === undefined) return null;
  if (source[open] === '"') {
    const end = source.indexOf('"', open + 1);
    return end === -1 ? null : source.slice(open, end + 1);
  }
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === source[open]) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

// CSS rule blocks, so `position: fixed` in one rule and `inset: 0` in another do not combine.
function cssRules(source) {
  return [...source.matchAll(/\{[^{}]*\}/g)].map((match) => match[0]);
}

// fixedOverlayProblems(file, source) — a PURE function over `{ file, source }`, so the self-check
// can feed it the REAL tree with a violation re-planted in memory and prove each assertion can
// actually fail. A fitness function nobody has seen go red is a fitness function nobody knows is
// wired up.
export function fixedOverlayProblems(file, source) {
  const problems = [];
  const clean = stripComments(source);

  // ── clause 1: the full-viewport fixed LAYER. The shell's own overlay is the one home.
  if (file !== SHELL_OVERLAY) {
    const groups = [...classGroups(clean), ...cssRules(clean)];
    const offending = groups.find((group) => isFixed(group) && fullViewportExtent(group));
    if (offending !== undefined) {
      problems.push(
        `${file}: paints a FULL-VIEWPORT fixed layer — \`${offending.replace(/\s+/g, " ").trim().slice(0, 120)}\`. ADR-005: a surface ASKS the shell to present it — \`requestFullscreen({ id, label, node, home, opener, claimsEscape, onLayout })\` in ui/src/app/shell-bus.mjs — and hands over the LIVE node. A layer of its own is a second stacking vocabulary, a second \`Escape\` handler and a second focus trap beside the shell's one overlay.`,
      );
    }
  }

  // ── clause 2: the surface-owned PORTAL, which is how such a layer escapes its own tree. It
  //    binds the shell too: the shell ADOPTS a node into its own React-childless host and has no
  //    business in `document.body` either.
  //
  //    NO CHARACTER WINDOW. The real historical violation's `createPortal(` → `document.body`
  //    span is 1,593 characters, and a 400-character window made this clause inert against the
  //    one thing it was written about. A file that portals AND names a document-level mount point
  //    is the fact; how many lines of JSX sit between them is not.
  if (/\bcreatePortal\s*\(/.test(clean)) {
    if (/\bdocument\s*\.\s*body\b/.test(clean)) {
      problems.push(
        `${file}: portals into \`document.body\` (the reference may be aliased — \`const MOUNT = document.body\` counts, and so does 1,500 characters of JSX between the two). ADR-005 names this shape specifically: it is how a per-surface overlay escapes its own tree, and it is what the shell's adoption host replaces. DESIGN §S3: "reached through \`requestFullscreen\` — NOT a component-owned \`createPortal(document.body)\`".`,
      );
    }
    if (/document\s*\.\s*getElementById\s*\(/.test(clean)) {
      problems.push(
        `${file}: portals into a document-level element found by id — the application root by another name, and the same escape from the component's own tree as \`document.body\`. A portal's target must be a node the component OWNS (\`document.createElement\`), which is what makes adoption possible.`,
      );
    }
  }
  return problems;
}

// ───────────────────────────────────────────────────────────── the sweep ──────

async function uiSourceFiles() {
  const found = [];
  async function walk(relative) {
    const entries = await readdir(path.join(repoRoot, relative), { withFileTypes: true });
    for (const entry of entries) {
      const next = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await walk(next);
      else if (/\.(tsx?|mts|mjs|css)$/.test(entry.name)) found.push(next);
    }
  }
  await walk(UI_SRC);
  return found.sort();
}

async function readUiTree() {
  const files = await uiSourceFiles();
  return Promise.all(files.map(async (file) => ({ file, source: await readFile(path.join(repoRoot, file), "utf8") })));
}

function offendersIn(records) {
  const problems = [];
  for (const { file, source } of records) problems.push(...fixedOverlayProblems(file, source));
  return problems;
}

// The gate's own verdict over a tree, EXEMPTIONS APPLIED — one function, so the self-check
// exercises the same path the real assertion does rather than a paraphrase of it. This is what
// the first cut lacked: its self-check fed the pure detector synthesized strings and never once
// asked what the ASSERTION would say about a tree.
export function verdictFor(records, exemptions = FIXED_OVERLAY_EXEMPTIONS) {
  return offendersIn(records).filter((problem) => !exemptions.has(problem.split(":")[0]));
}

export const archTests = [
  {
    name: "arch/45 ADR-005 + 46 ADR-009 (acd-no-per-surface-fixed-overlay): no module in ui/src outside the shell paints a full-viewport fixed layer, and nothing anywhere portals into document.body",
    run: async () => {
      const tree = await readUiTree();

      // NON-VACUITY, FIRST AND EXPLICITLY, because vacuity is the failure this gate was written
      // about. The tree was really read; the shell's one home really exists; and the NAMED
      // SUBJECT — the file the prohibition escaped into once — is really among the files swept.
      assert.ok(tree.length > 30, `ui/src was actually read: ${tree.length} files`);
      const shell = tree.find((record) => record.file === SHELL_OVERLAY);
      assert.ok(shell, `${SHELL_OVERLAY} is missing — the shell's ONE overlay home has moved, so this gate's exemption-by-name is now pointing at nothing. Re-point it at the module that renders the shell root; do NOT delete the clause.`);
      const subject = tree.find((record) => record.file === NAMED_SUBJECT);
      assert.ok(
        subject,
        `${NAMED_SUBJECT} is missing. THIS IS THE FAILURE MODE THIS GATE EXISTS TO REFUSE: \`acd-shell-z-ladder-single-home\` carried the one live violation on an exemption keyed to \`FleetTerminalView.tsx\` "because m46 deletes the file" — so when m46 deleted it the gate went green while the SHAPE survived under a new name in this very file. If the control has moved, re-point this constant at it in the same diff. A gate aimed at a file that is gone passes vacuously forever.`,
      );

      const problems = verdictFor(tree);
      assert.deepEqual(
        problems,
        [],
        `per-surface full-viewport overlay(s) found:\n  ${problems.join("\n  ")}\nThe shell owns exactly one (${SHELL_OVERLAY}), on the ladder's \`fullscreen\` rung, with the focus trap and the \`Escape\` listener beside it.`,
      );

      // …and the shell's one home really does carry the layer, so the exemption is a MEASUREMENT
      // rather than a spelling. If this fails, the shell no longer has the overlay the rest of
      // the rule assumes it has, and the prohibition has nowhere to redirect a surface TO.
      const shellGroups = classGroups(stripComments(shell.source));
      assert.ok(
        shellGroups.some((group) => isFixed(group) && fullViewportExtent(group)),
        `${SHELL_OVERLAY} no longer paints the shell's own full-viewport occupant. The prohibition on surfaces only makes sense while the shell provides the alternative it points them at.`,
      );
    },
  },

  {
    name: "arch/45 ADR-005 (acd-no-per-surface-fixed-overlay): the exemption list is EMPTY and its emptiness is ASSERTED — growth requires deleting the assertion that says why, and any entry needs a reason that is not a deletion plus an expiry that is not a filename",
    run: async () => {
      // THE ENFORCEMENT, not the prose. Measured failure of the first cut (architect's review):
      // one added line whose reason was "milestone 47 deletes this file" waved a LIVE violation
      // through with all three clauses green — the m45 exemption's own reasoning, reproduced
      // against the gate written to end it.
      assert.equal(
        FIXED_OVERLAY_EXEMPTIONS.size,
        0,
        `FIXED_OVERLAY_EXEMPTIONS has ${FIXED_OVERLAY_EXEMPTIONS.size} entr${FIXED_OVERLAY_EXEMPTIONS.size === 1 ? "y" : "ies"}. THE LIST IS EMPTY AND THIS ASSERTION IS WHAT KEEPS IT EMPTY: adding one means deleting this line, in the diff that adds it, where a reviewer reads both together. There is no "temporary" here that has not already been tried — m45's one entry ("m46 deletes the file") retired with its file and left the RULE unenforced for a whole milestone.`,
      );

      // …and the SHAPE an entry would have to take, enforced over whatever the map holds rather
      // than over what it should. Dead code today; the point is that it is not dead the day
      // somebody adds a line.
      assert.deepEqual(validateExemptions([...FIXED_OVERLAY_EXEMPTIONS.entries()]), []);

      // The validator genuinely refuses both barred shapes.
      const barred = validateExemptions([
        ["ui/src/terminal/TerminalControl.tsx", "milestone 47 deletes this file"],
        ["ui/src/fleet/Fleet.tsx", { reason: "we will remove it next milestone", expires: "2099-01-01" }],
        ["ui/src/board/Board.tsx", { reason: "a genuinely temporary carve-out", expires: "2020-01-01" }],
        ["ui/src/config/App.tsx", { reason: "a genuinely temporary carve-out", expires: "soon" }],
      ]);
      assert.equal(barred.length, 4);
      assert.match(barred[0], /must be `\{ reason, expires \}`/, "a bare string is refused: a permission slip with no end date");
      assert.match(barred[1], /BARRED/, "a reason that rests on the file being deleted is refused BY NAME");
      assert.match(barred[2], /expired on 2020-01-01/, "…and an expiry that has passed is not renewed by silence");
      assert.match(barred[3], /ISO date/);
      // A well-formed, unexpired, honestly-reasoned entry is accepted — so the refusals above are
      // the rule doing its job rather than the validator refusing everything.
      assert.deepEqual(validateExemptions([["ui/src/x.tsx", { reason: "the shell cannot host it yet", expires: "2099-01-01" }]]), []);

      // AND THE ASSERTION PATH ITSELF: an exemption cannot wave a LIVE violation through the
      // real sweep silently — it is `verdictFor` that would have to be neutered, and this lane
      // measures exactly that rather than trusting it.
      const tree = await readUiTree();
      const planted = tree.map((record) =>
        record.file === NAMED_SUBJECT
          ? { ...record, source: `${record.source}\nconst OVERLAY = "fixed inset-0 bg-black";\n` }
          : record,
      );
      assert.equal(verdictFor(planted).length, 1, "a live violation in the named subject is reported by the real verdict path");
      assert.equal(
        verdictFor(planted, new Map([[NAMED_SUBJECT, { reason: "milestone 47 deletes this file", expires: "2099-01-01" }]])).length,
        0,
        "…and an exemption WOULD silence it — which is precisely why the list is asserted empty above rather than merely described as shrink-only",
      );
    },
  },

  {
    name: "arch/45 ADR-005 (acd-no-per-surface-fixed-overlay): self-check — the REAL deleted violation (verbatim from history) trips BOTH clauses, ten spellings of the same layer trip the extent clause, and every sanctioned shape stays quiet",
    run: async () => {
      // ══ THE REAL THING, FIRST. Verbatim from
      //    `git show HEAD:ui/src/fleet/terminal-view/FleetTerminalView.tsx` before 46/04 deleted
      //    it. A detector calibrated against its own plant proves the plant: the first cut's
      //    portal clause matched within 400 characters and this span is 1,593.
      const historical = await readFile(path.join(repoRoot, HISTORICAL_VIOLATION), "utf8");
      const span = historical.indexOf("document.body") - historical.indexOf("createPortal(");
      assert.ok(span > 1000, `the fixture really is the long-span shape (${span} characters between \`createPortal(\` and \`document.body\`) — if this shrinks, the fixture has been trimmed and the calibration is lost`);
      const onHistory = fixedOverlayProblems("ui/src/fleet/terminal-view/FleetTerminalView.tsx", historical);
      assert.ok(onHistory.some((problem) => /FULL-VIEWPORT fixed layer/i.test(problem)), "the extent clause fires on the REAL violation");
      assert.ok(onHistory.some((problem) => /document\.body/.test(problem)), "…and so does the portal clause, across 1,593 characters of JSX");

      // ══ TEN SPELLINGS OF ONE LAYER. Each is a diff someone would plausibly write; a detector
      //    that saw only the first would be walked past by the other nine.
      const layers = [
        ["the canonical pair", 'const c = "fixed inset-0 flex flex-col";'],
        ["…in the other order, with a rung between them", 'const c = "z-50 fixed inset-0 bg-black";'],
        ["the two-axis pair", 'const c = "fixed inset-x-0 inset-y-0 bg-black";'],
        ["an arbitrary inset value", 'const c = "fixed inset-[0px] bg-black";'],
        ["an arbitrary PROPERTY", 'const c = "fixed [inset:0px] bg-black";'],
        ["the four-offset long form", 'const c = "fixed top-0 right-0 bottom-0 left-0 flex";'],
        ["viewport sizes instead of offsets", 'const c = "fixed top-0 left-0 h-screen w-screen";'],
        ["one axis by inset, the other by size", 'const c = "fixed inset-x-0 top-0 h-dvh";'],
        ["the style-object form", 'return <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }} />;'],
        ["plain CSS", ".overlay { position: fixed; inset: 0; }"],
      ];
      for (const [label, plant] of layers) {
        assert.ok(
          fixedOverlayProblems("ui/src/fleet/Plant.tsx", plant).some((problem) => /FULL-VIEWPORT fixed layer/i.test(problem)),
          `self-check: ${label} — ${plant}`,
        );
      }

      // ══ THREE PORTAL ESCAPES, including the two the first cut missed.
      const portals = [
        ["the direct portal", 'import { createPortal } from "react-dom";\nreturn createPortal(<div />, document.body);'],
        ["an ALIASED body reference", 'const MOUNT = document.body;\nreturn createPortal(<div />, MOUNT);'],
        ["the app root by id", 'return createPortal(<div />, document.getElementById("root"));'],
      ];
      for (const [label, plant] of portals) {
        assert.ok(fixedOverlayProblems("ui/src/board/Plant.tsx", plant).length > 0, `self-check: ${label} — ${plant}`);
      }

      // ══ THE SANCTIONED SHAPES STAY QUIET, and this half matters as much: a gate that fired on
      //    the board's toast or on the shell's own dock band would be relaxed rather than obeyed.
      const quiet = [
        ["a TOAST on its own rung", "ui/src/board/Board.tsx", 'className="fixed bottom-4 right-4 z-40 max-w-md rounded-md"'],
        ["the shell's dock band across the bottom edge", "ui/src/app/Probe.tsx", 'className={`fixed inset-x-0 bottom-0 ${Z_CLASSES.dock}`}'],
        ["a child filling its OWN box", "ui/src/terminal/Probe.tsx", 'className="absolute inset-0 overflow-hidden"'],
        ["…and one sized to the box it was given", "ui/src/terminal/Probe.tsx", 'className={cn("flex h-full min-h-0 flex-col", TERMINAL_VIEWPORT_BG_CLASS)}'],
        ["a portal into a node the component OWNS — which is what adoption requires", "ui/src/terminal/Probe.tsx", 'const host = document.createElement("div");\nreturn createPortal(<div className="h-full" />, host);'],
        [
          "`fixed bottom-4` in one string and `inset-0` in another — two facts, not one layer",
          "ui/src/board/Probe.tsx",
          'const toast = "fixed bottom-4 right-4";\nconst fill = "absolute inset-0";',
        ],
        ["a sticky bar", "ui/src/app/Probe.tsx", 'className="sticky top-0 z-10 shrink-0"'],
      ];
      for (const [label, file, plant] of quiet) {
        assert.deepEqual(fixedOverlayProblems(file, plant), [], `self-check (quiet): ${label}`);
      }

      // ══ THE SHELL'S EXEMPTION IS SCOPED TO THE EXTENT CLAUSE ONLY. Its overlay is sanctioned;
      //    its portalling into `document.body` would not be.
      assert.deepEqual(fixedOverlayProblems(SHELL_OVERLAY, 'className="fixed inset-0 flex flex-col bg-background"'), [], "the shell's own layer is the one home");
      assert.equal(
        fixedOverlayProblems(SHELL_OVERLAY, "return createPortal(<div />, document.body);").length,
        1,
        "…but the portal clause binds the shell exactly as hard: adoption means a node the shell OWNS, not the document's body",
      );
    },
  },
];
