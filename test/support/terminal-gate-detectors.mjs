// Shared detectors for milestone 46's two terminal boundary gates
// (`acd-terminal-origin-not-port` and `acd-terminal-control-boundary`).
//
// WHY THIS FILE EXISTS. Each of those gates is SPLIT in two by what it can turn green:
// the clauses about `ui/src/terminal/` are green the day 46/03 lands and are REGISTERED as
// `*.test.mjs`; the WHOLE-TREE clauses stay red until 46/04 deletes the duplicate terminal
// implementation and are PARKED as `*.mjs` (off the suite glob, so the registration ratchet is
// neither tripped nor satisfied by a mention). Both halves need the same source-analysis
// primitives, and copying them would put the port detector in two places — a second home for
// one fact, in the milestone whose whole purpose is to end exactly that. So: one home, two
// readers, and 46/04 can inline it again when it merges the halves back.
//
// Not named `*.test.mjs` and not under `test/arch/`, so no runner or glob picks it up — it is
// support, like the app harnesses beside it.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TERMINAL_DIR = path.join(repoRoot, "ui", "src", "terminal");
export const UI_SRC = path.join(repoRoot, "ui", "src");

// DG-46-2's five, which get ONE home in the control's own framework-free `.mjs` and are read
// by BOTH consumers — the xterm `theme` object and the documented class list.
export const PALETTE = ["#0b0f14", "#0f1629", "#1e2a44", "#0b1120", "#d7dde3"];
export const PALETTE_HOME = "ui/src/terminal/palette.mjs";

export const NAMED_PRODUCT_PORTS = ["4177", "4178", "4180", "4181"];

// The browser globals the shared `.mjs` set must RECEIVE rather than read (ADR-001).
export const BROWSER_GLOBALS = [
  "window",
  "document",
  "location",
  "navigator",
  "localStorage",
  "sessionStorage",
  "ResizeObserver",
  "requestAnimationFrame",
];

// COMMENTS ARE STRIPPED BEFORE EVERY SWEEP, deliberately. A gate that trips on prose is a gate
// people learn to route around by rewording a comment, and it would forbid this codebase's own
// habit of naming, in the file, the defect it is guarding against.
//
// LINE COMMENTS FIRST, BLOCK COMMENTS SECOND — AND THE ORDER IS LOAD-BEARING (TECH_DEBT item
// 24, and this helper was on its hazardous list until 46/04 corrected it).
//
// Strip BLOCK comments first and a LINE comment containing `/*` opens a block the stripper then
// closes at the next `*/` — hundreds of lines later, or at end of file. Everything between is
// deleted before the detector ever sees it. The measured cost so far is one FALSE RED
// (`acd-rendered-component-fed-by-route` failed about a subject that had not changed, and the
// next reviewer's cheapest hypothesis — "the diff broke it" — was wrong). The cost this file
// was actually exposed to is worse and is a FALSE GREEN: both of its readers assert
// `deepEqual(violations, [])` over `ui/src/terminal/**`, a folder whose own ADRs REQUIRE it to
// explain in prose the defects it guards against. A stripper that eats the file finds no
// violations in it, and the gate passes while asserting nothing — the exact
// reads-green-asserts-nothing shape ADR-006 and ADR-007 exist to end.
//
// A LINE COMMENT IS ONLY STRIPPED WHEN IT STARTS THE LINE. A trailing `// …` after code is left
// alone deliberately: cutting at the first `//` on a line would also cut the `//` inside a
// `"http://…"` string literal, which is the mirror-image blinding.
export function stripComments(text) {
  return text
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

// stripperSelfCheck() — the regression that produced TECH_DEBT item 24, pinned. A marker line
// planted BELOW a line comment carrying `/*` must survive the strip. Returns the problems it
// found so a caller can assert on them; both readers of this module run it first, so a future
// blinding fails LOUDLY, naming the STRIPPER rather than the subject.
export function stripperSelfCheck() {
  const problems = [];
  const planted = ['// see /* the block-comment trap */ below', 'export const MARKER = "survives";'].join("\n");
  const stripped = stripComments(planted);
  if (!stripped.includes("MARKER")) {
    problems.push("stripComments() ate the file: a LINE comment containing `/*` opened a block that swallowed the code below it. Strip line comments FIRST (TECH_DEBT item 24).");
  }
  const urlKept = stripComments('const u = "http://example/ws/terminal";');
  if (!urlKept.includes("ws/terminal")) {
    problems.push("stripComments() ate a URL literal: a `//` inside a string is not a comment.");
  }
  const blockGone = stripComments("/* a block */\nexport const KEEP = 1;");
  if (blockGone.includes("a block") || !blockGone.includes("KEEP")) {
    problems.push("stripComments() no longer removes a genuine block comment while keeping the code around it.");
  }
  return problems;
}

// nonVacuousSource(label, source) — the cheap companion assertion item 24 asks each converted
// suite to carry: a stripped source that came back empty is a BLINDING, not a clean file, and it
// must be reported as one rather than sailing through an absence sweep.
export function nonVacuousSource(label, source) {
  return typeof source === "string" && source.replace(/\s+/g, "").length > 0
    ? null
    : `${label}: the comment-stripped source is EMPTY. That is a blinded stripper, not a clean file — every absence sweep over it would pass vacuously.`;
}

export async function collect(dir, exts) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collect(full, exts)));
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

export const rel = (file) => path.relative(repoRoot, file).replaceAll("\\", "/");

function stringLiteralsIn(text) {
  return [...text.matchAll(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g)].map((match) => match[0]);
}

// Does this literal read as a network authority at all? Either it carries a scheme, or it is a
// bare `host:port` (an IP, `localhost`, or a dotted hostname followed by a colon and digits).
function looksLikeAnAuthority(literal) {
  if (/:\/\//.test(literal)) return true;
  if (/^["'`]\/\//.test(literal)) return true;
  return /(?:\d{1,3}(?:\.\d{1,3}){3}|localhost|[a-z0-9-]+\.[a-z]{2,})\s*:\s*\d{2,5}\b/i.test(literal);
}

// A PORT IS A POSITION, NOT A NUMBER — and getting that wrong is how a gate gets loosened.
//
// The first cut of this detector flagged ANY bare four-or-five digit literal in the range
// 1024-65535. A mutation review showed what that costs: `const DOCK_MAX_HEIGHT = 1200;` and
// `{ width: 1280 }` were both reported AS PORTS. The drag clamp and DESIGN's box-size constants
// (1264x280, 1280x816, 744x216) live in exactly this tree, so a PORT gate would go red for
// reasons that have nothing to do with ports — and a gate that cries wolf is a gate the next
// engineer relaxes rather than obeys, which costs more than the gate ever saved.
//
// So a "port" here is one of exactly three shapes, each of which is a port BY POSITION:
//   1. `:NNNN` in an AUTHORITY position inside a string or template literal;
//   2. a `:${…}` interpolation into that same position whose expression is named for a port;
//   3. an identifier NAMED as a port (`FLEET_PORT`, `DEFAULT_MESH_UI_PORT`, `port: 4181`).
// A number that is merely IN the port range, sitting in a width, a height or a timeout, is not
// a port and is not this gate's business.
export function portLiteralsIn(text) {
  const clean = stripComments(text);
  const hits = [];

  for (const literal of stringLiteralsIn(clean)) {
    if (!looksLikeAnAuthority(literal)) continue;
    for (const match of literal.matchAll(/:(\d{2,5})\b/g)) hits.push(`:${match[1]}`);
    for (const match of literal.matchAll(/:\$\{[^}]*port[^}]*\}/gi)) hits.push(match[0]);
  }

  // The underscore is required so `TRANSPORT` is not read as a port — the same class of false
  // positive as the width above, one letter smaller.
  for (const match of clean.matchAll(/\b[A-Z0-9]+_PORT\b|\bPORT\b/g)) hits.push(match[0]);
  for (const match of clean.matchAll(/\bport\s*[:=]\s*(\d{2,5})\b/g)) hits.push(`port=${match[1]}`);

  return hits;
}

// A file is in scope for the SOCKET-URL sweep iff it takes part in socket URL construction: it
// names one of the two socket routes, or it interpolates a ws/wss scheme. Scoped deliberately —
// an in-app PAGE link carrying a port is `acd-no-surface-mode-url-literal`'s business, and the
// two gates must never fight over one exemption list.
export function buildsASocketUrl(text) {
  const clean = stripComments(text);
  return /\/ws\/terminal(-view)?\b/.test(clean) || /\bwss?:\/\//.test(clean) || /\$\{\s*scheme\s*\}:\/\//.test(clean);
}
