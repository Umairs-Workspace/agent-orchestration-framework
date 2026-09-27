// SLICING SOURCE FOR A STRUCTURAL GATE — the one home (milestone 47 / story 04; F-47-03-ARCH-4).
//
// A fitness function that reads source has to cut a region out of it before it can assert
// anything about that region. This milestone found FIVE gates wrong about the TREE rather than
// about the rule, and THREE of the five were the same mechanism: a positional slice — an
// `indexOf` sentinel that assumed a declaration order, or a fixed byte window over source.
// F-47-03-ARCH-4 is the worst of them: `acd-mesh-ui-scope-visible` sliced `Fleet()` with a
// `+ 4000`-character window and required two markers inside it, and the second marker sat
// **158 characters** from the cutoff — so one `useState` would turn it red with a message about
// scope visibility. It had already distorted a build before anyone read it.
//
// The remedy is not a better window. It is to cut on the language's own structure, and to do it
// in ONE place: a second brace-balancer written beside the first is the duplicated home these
// ADRs refuse, on the very mechanism this milestone has already been bitten by. ADR-013's gate
// wrote the first one; this module is where it now lives, and both gates read it from here.
//
// [F-47-04-ARCH-2, 2026-08-12] F-47-03-ARCH-4 WAS FILED AGAINST ONE FILE AND CLOSED AS THOUGH IT
// WERE FILED AGAINST THE SPECIES. A sweep of all 266 gates in `test/arch/` measured **nineteen**
// surviving positional cuts across **twelve** files — five of them fixed CHARACTER WINDOWS,
// including the `+ 400` in the gate ADR-011 rests on (its two markers sat 231 and 243 characters
// inside it) and a `+ 400` over a callback in `acd-active-runs-frozen-string-array` — plus two the
// mechanical detector cannot see at all, because the end offset is bound to a variable first.
// Milestone 47 converted SIX cuts in three gates onto this module (two windows, three declaration
// sentinels, and one lane of unbounded marker searches); the remaining **sixteen lines across ten
// files** are enumerated and ledgered by
// `test/arch/testing/acd-test-suite-registration.test.mjs` (lanes 3-4 — the one gate that already asserts a
// property of the fitness-function suite ITSELF, and the one that is registered in the runner; a
// dedicated file would have been imported by neither runner, which by that gate's own invariant
// makes it no gate at all), so the nineteenth fails CI instead of needing an architect's eyes.
// Two cuts were added for those conversions — `enclosingParenGroup` (the
// outward cut: the call a callback parameter belongs to) and `blockOrStatementAfter` (the block a
// loop header owns) — because the alternative was a fixed window per gate, again.

// A SCANNER, NOT TWO REGEXES — TECH_DEBT item 24, and that item's own defect class surviving
// inside the one home it consolidated 29 copies into (found at 119/01's review, round 3).
//
// The pair this replaces was `/(^|[^:])\/\/[^\n]*/` then `/\/\*[\s\S]*?\*\//`. Both halves are
// blind to the only thing that separates a comment from its own text: whether the `//` is INSIDE
// a string. Measured — a source line
//
//     import { loadLoops } from ".//loops.mjs";
//
// was truncated to `import { loadLoops } from ".`, so `52/FF-5202`'s resolved-edge sweep could not
// see an import that Node loads, and 107 test files read source through this function. The `[^:]`
// guard was the same defect patched once, narrowly: it rescues `http://` by requiring a non-colon
// before the slashes, which is a property of that one spelling rather than of strings.
//
// The scanner tracks what the language tracks — string, template (with `${…}` nesting), regex
// literal, line comment, block comment — so a `//` opens a comment exactly when it is in none of
// the first four. Item 24's own lesson is kept by construction rather than by ordering: a `/*`
// inside a line comment cannot open a block run, because a line comment is a state the scanner is
// already in and leaves only at the newline.
//
// THE OUTPUT CONTRACT IS UNCHANGED, which is what makes it safe for 107 readers: a line comment is
// removed with its newline kept, a block comment becomes a single space, every other byte passes
// through. What changes is only that string, template and regex CONTENT is no longer eaten.
export function stripComments(source) {
  let out = "";
  let index = 0;
  // `${` nesting per open template literal. An entry of 0 means "in that template's TEXT".
  const templates = [];

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    const inTemplateText = templates.length > 0 && templates.at(-1) === 0;

    // TEMPLATE TEXT FIRST — before the comment checks, because a `//` in template text is content.
    if (inTemplateText) {
      if (char === "\\") { out += char + (next ?? ""); index += 2; continue; }
      if (char === "$" && next === "{") { templates[templates.length - 1] = 1; out += "${"; index += 2; continue; }
      if (char === "`") { templates.pop(); out += char; index += 1; continue; }
      out += char;
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      out += " ";
      continue;
    }
    if (char === "'" || char === '"') {
      out += char;
      index += 1;
      while (index < source.length && source[index] !== char && source[index] !== "\n") {
        if (source[index] === "\\") { out += source[index] + (source[index + 1] ?? ""); index += 2; continue; }
        out += source[index];
        index += 1;
      }
      if (index < source.length && source[index] === char) { out += char; index += 1; }
      continue;
    }
    if (char === "`") { out += char; index += 1; templates.push(0); continue; }
    if (templates.length > 0 && char === "{") templates[templates.length - 1] += 1;
    if (templates.length > 0 && char === "}") {
      templates[templates.length - 1] -= 1;
      if (templates.at(-1) === 0) { out += char; index += 1; continue; }
    }
    if (char === "/" && startsRegex(out)) {
      out += char;
      index += 1;
      let inClass = false;
      while (index < source.length && source[index] !== "\n") {
        const inner = source[index];
        if (inner === "\\") { out += inner + (source[index + 1] ?? ""); index += 2; continue; }
        out += inner;
        index += 1;
        if (inner === "[") inClass = true;
        else if (inner === "]") inClass = false;
        else if (inner === "/" && !inClass) break;
      }
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

// Every STRING and TEMPLATE literal replaced by a same-length run of spaces, with all other bytes
// and every newline kept so offsets and line numbers still line up. Regex literals are scanned
// but PASSED THROUGH — the callers that need this are hunting them.
//
// This exists because a gate that hunts for CODE — a regex literal, a call, an operator — has to
// be able to tell it from a string that merely contains the same characters. `item-24`'s own
// ratchet was bitten by exactly that: its regex-literal finder read the string `"/"` in this
// module's scanner as the start of a literal and concluded the one home had become block-first.
// A pattern cannot make that distinction; a scan can, and there is already one here.
export function blankStringLiterals(source) {
  const stripped = stripComments(source);
  let out = "";
  let index = 0;
  // NO `u` FLAG, on purpose: under it an astral character (an emoji, a CJK ideograph outside the
  // BMP) is one match and becomes ONE space, while it occupies TWO UTF-16 units in the source —
  // so every offset after it is off by one and the "same length" promise above is broken.
  // Measured (chore 120): `test/session/agent-session-driver-transcript.test.mjs` carries a `🌍`
  // in a fixture string and came back one unit short.
  const blank = (text) => text.replace(/[^\n]/g, " ");
  while (index < stripped.length) {
    const char = stripped[index];
    if (char === "'" || char === '"' || char === "`") {
      const start = index;
      index += 1;
      while (index < stripped.length && stripped[index] !== char) {
        if (stripped[index] === "\\") index += 1;
        index += 1;
      }
      index += 1;
      out += char + blank(stripped.slice(start + 1, index - 1)) + (stripped[index - 1] ?? "");
      continue;
    }
    if (char === "/" && startsRegex(out)) {
      const start = index;
      index += 1;
      let inClass = false;
      while (index < stripped.length && stripped[index] !== "\n") {
        const inner = stripped[index];
        if (inner === "\\") { index += 2; continue; }
        index += 1;
        if (inner === "[") inClass = true;
        else if (inner === "]") inClass = false;
        else if (inner === "/" && !inClass) break;
      }
      // COPIED, not blanked: the callers that need this are looking for regex literals, and a
      // blanked one is a literal they can no longer see. It is scanned rather than skipped so a
      // quote inside it — `/["']/` — cannot be read as opening a string.
      out += stripped.slice(start, index);
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

// Whether a `/` here opens a REGEX rather than dividing. The last significant character decides:
// after a value (identifier, literal, `)`, `]`) a slash divides; after an operator, a punctuator or
// one of the keywords below it opens a literal. Erring toward DIVISION is harmless — the slash is
// copied through either way — while erring toward regex would swallow source, so the keyword set is
// closed and division is the default.
const REGEX_PRECEDERS = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "^", "~", "<", ">"]);
const REGEX_KEYWORDS = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "do", "else", "case", "yield", "await"]);
function startsRegex(before) {
  const trimmed = before.replace(/\s+$/u, "");
  if (trimmed === "") return true;
  if (REGEX_PRECEDERS.has(trimmed.at(-1))) return true;
  const word = /([A-Za-z_$][\w$]*)$/u.exec(trimmed);
  return word != null && REGEX_KEYWORDS.has(word[1]);
}

// The `{ … }` block that opens at or after `from`, delimited by MATCHING BRACES rather than by
// the first `};` or by a fixed character window. Returns the body WITHOUT its outer braces, or
// null when no block opens — callers assert on the null so a moved declaration fails loudly with
// "the block was not found" instead of silently asserting over the wrong region.
//
// Deliberately brace-only: it is run over comment-stripped source, where the remaining `{`/`}`
// inside string literals are rare enough in the declarations these gates cut that a full lexer
// would be more machinery than the risk. If that stops being true, this is the one place to fix.
export function matchedBraceBody(code, from) {
  const open = code.indexOf("{", from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}" && --depth === 0) return code.slice(open + 1, i);
  }
  return null;
}

// The `( … )` group that opens at or after `from`, by MATCHING PARENS. Returns
// `{ open, close, body }` (indices into `code`; `body` excludes the outer parens) or null when no
// group opens or it never closes. The span is what callers need: `functionBody` cuts from the
// header's closing paren, and a caller asserting "the region was found" wants the indices.
export function matchedParenSpan(code, from) {
  const open = code.indexOf("(", from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "(") depth += 1;
    else if (code[i] === ")" && --depth === 0) return { open, close: i, body: code.slice(open + 1, i) };
  }
  return null;
}

// A FUNCTION'S BODY, given the text of its header (`function TopBar(`, `export function Fleet()`).
//
// The trap this exists to close, found by running the converted gate against a build known to be
// CORRECT: `matchedBraceBody(source, indexOf("function TopBar("))` returns the PARAMETER
// DESTRUCTURING — `{ scope, onScopeChange, … }` — because that is the first `{` after the name.
// The gate then asserts over a parameter list and reports that TopBar does not render
// <ScopeControl>. That is the same class of defect as the `+ 4000` window it replaced: an
// instrument confidently measuring the wrong region, with a message about the rule.
//
// So the parameter list is skipped by balancing PARENS first, and only then is the body cut.
// Returns null when the header is absent or unbalanced — callers assert on that, so a moved or
// renamed declaration fails as "not found" rather than as a false claim about the rule.
export function functionBody(code, header) {
  const start = code.indexOf(header);
  if (start < 0) return null;
  const params = matchedParenSpan(code, start);
  if (params == null) return null;
  return matchedBraceBody(code, params.close);
}

// The INNERMOST `( … )` group that CONTAINS `at` — the outward cut, where the three above are
// inward ones. Returns `{ open, close, body }` or null when `at` is not inside any group.
// A `(` sitting exactly at `at` counts as that group's opener, which is what lets a caller step
// outward one group at a time (`enclosingParenGroup(code, group.open - 1)` … or from `group.open`
// itself) without special-casing the boundary.
//
// WHAT IT IS FOR — F-47-04-ARCH-2's third instance. A gate that finds an element binding by regex
// (`runs.map((run) => …`, `runs.iter().map(|run| …`) has to cut the CALLBACK to ask what the
// callback does with the element, and the tempting cut is a fixed window from the match
// (`code.slice(match.index, match.index + 400)`). That measures the LENGTH of what follows the
// binding, which is a quantity no rule about the binding mentions: a violation at +401 is invisible
// and a neighbour at +399 is attributed to the wrong callback. The argument list is the region the
// language itself draws.
export function enclosingParenGroup(code, at) {
  let depth = 0;
  for (let i = Math.min(at, code.length - 1); i >= 0; i -= 1) {
    if (code[i] === ")" && i !== at) depth += 1;
    else if (code[i] === "(") {
      if (depth === 0) return matchedParenSpan(code, i);
      depth -= 1;
    }
  }
  return null;
}

// THE REGION BETWEEN TWO AUTHORED MARKERS — `// <suite-door>` … `// </suite-door>`, and the like.
// Returns the text from the opening marker through the END of the closing one, or null when either
// marker is absent or the closer does not follow the opener.
//
// Why it belongs here rather than at the call site (milestone 52 / story 05, at review): a suite
// that asserts "every finding read happens inside one marked block" has to cut that block first,
// and the tempting cut — `source.slice(source.indexOf(open), source.indexOf(close) + close.length)`
// — is the SENTINEL_END shape this module exists to remove. Its failure is quiet: with the closer
// deleted or renamed, `indexOf` returns −1, the cut becomes `slice(start, close.length - 1)`, and
// the "region" is a few characters of the opener — or, with the OPENER missing, `slice(-1, …)`
// wraps to the last character. Either way the suite-wide rule is then asserted over a region that
// is not the block, and the caller's own not-found guard is what has to catch it. Returning null
// makes that guard the only outcome.
export function markedRegion(code, open, close) {
  const start = code.indexOf(open);
  if (start < 0) return null;
  const end = code.indexOf(close, start + open.length);
  if (end < 0) return null;
  return code.slice(start, end + close.length);
}

// The BLOCK a construct owns, given the index just past its header: the `{ … }` body when the next
// token is `{`, and otherwise the single unbraced statement (`for (const r of runs) use(r.ref);`).
// Returns `{ braced, body }` or null at end of input.
//
// THE DISTINCTION IS THE POINT and it is not defensive: `matchedBraceBody` from a braceless `for`
// header runs forward to the NEXT `{` ANYWHERE — the following function, a later object literal —
// and hands back a region the loop does not own. That is this module's own founding defect
// (an instrument confidently measuring the wrong region) re-entered from the other side, so the
// unbraced case is cut here rather than left to each caller to remember.
export function blockOrStatementAfter(code, from) {
  let i = from;
  while (i < code.length && /\s/.test(code[i])) i += 1;
  if (i >= code.length) return null;
  if (code[i] === "{") {
    const body = matchedBraceBody(code, i);
    return body == null ? null : { braced: true, body };
  }
  const end = code.indexOf(";", i);
  const line = code.indexOf("\n", i);
  const stop = Math.min(end < 0 ? code.length : end + 1, line < 0 ? code.length : line);
  return { braced: false, body: code.slice(i, stop) };
}

// THE ENCLOSING-FUNCTION RULE — sites classified by the declaration that owns them (129/05).
//
// Lifted from `test/arch/work/acd-number-null-safe.test.mjs`'s `classifyNumberSites` (the
// `.number` parse sweep), which is the one instance of this shape in the tree and the one FF-12702
// and FF-12906 both reuse: a SITE (`siteRe`, sticky or global) is guarded when the text from its
// enclosing declaration's line down to the site matches `guardRe`. The rule is deliberately
// textual and forward-only — a guard that stands BELOW the site does not cover it, and a site
// with no declaration above it is owned by `(module scope)`. Generic so a third sweep is a pair
// of regexes and not a 124th stripper (TECH_DEBT item 24); comments are stripped THROUGH THIS
// MODULE's scanner and nowhere else.
//
// `declarationRe` names what counts as an owning declaration, matched per line: the default is
// the number sweep's — a `function` (optionally exported/async) or a `const`/`let` at column 0 —
// and a caller whose subject nests its functions (`src/loop/wave.mjs` declares `tick`, `runLane`
// and `mintWaveRun` two spaces in) passes one that admits indentation. Both capture groups name
// the declaration; whichever matched is the owner's name.
//
// Answers `[{ line, text, fn, guarded }]` with `line` the site's ORIGINAL line (the stripper
// keeps code bytes in order and drops whole-comment lines, so a monotonic forward search over
// trimmed lines recovers it).
export const TOP_LEVEL_DECLARATION_RE = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/u;
export const NESTED_FUNCTION_DECLARATION_RE = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/u;

function originalLineOf(strippedLines, originalLines, strippedIndex) {
  let cursor = 0;
  for (let index = 0; index <= strippedIndex; index += 1) {
    const needle = strippedLines[index].trim();
    if (needle === "") continue;
    while (cursor < originalLines.length && !originalLines[cursor].trim().startsWith(needle)) cursor += 1;
    if (index === strippedIndex) return cursor + 1;
    cursor += 1;
  }
  return strippedIndex + 1;
}

export function classifySites(source, { siteRe, guardRe, declarationRe = TOP_LEVEL_DECLARATION_RE } = {}) {
  if (!(siteRe instanceof RegExp) || !(guardRe instanceof RegExp)) {
    throw new TypeError("classifySites: `siteRe` and `guardRe` must both be regular expressions");
  }
  // `matchAll` needs a global regex; a caller's non-global site pattern is re-flagged rather than
  // refused, and a global guard is never `.test`ed directly (its `lastIndex` would carry over).
  const site = siteRe.global ? siteRe : new RegExp(siteRe.source, `${siteRe.flags}g`);
  const guard = new RegExp(guardRe.source, guardRe.flags.replace(/[gy]/gu, ""));
  const stripped = stripComments(source);
  const strippedLines = stripped.split("\n");
  const originalLines = source.split("\n");
  const declarations = [];
  strippedLines.forEach((line, index) => {
    const match = line.match(declarationRe);
    if (match) declarations.push({ line: index, name: match[1] ?? match[2] });
  });
  const sites = [];
  strippedLines.forEach((line, index) => {
    for (const match of line.matchAll(site)) {
      const owner = [...declarations].reverse().find((declaration) => declaration.line <= index) ?? null;
      const from = owner ? owner.line : 0;
      const window = strippedLines.slice(from, index).join("\n") + "\n" + line.slice(0, match.index);
      sites.push({
        line: originalLineOf(strippedLines, originalLines, index),
        text: match[0],
        fn: owner?.name ?? "(module scope)",
        guarded: guard.test(window),
      });
    }
  });
  return sites;
}

// A CALL'S ARGUMENTS, split at depth-0 commas — the body a `matchedParenSpan` answered, cut into
// the arguments the language sees (129/05). A regex split with a bracket lookahead cannot do this:
// an options object holding a nested call splits at its own commas, and a gate then judges half
// an argument. Brace, bracket and paren depth are tracked; string and template literals are not
// (callers cut comment-stripped source, where a comma inside a literal is rare enough that a full
// lexer would be more machinery than the risk — the same ruling `matchedBraceBody` states).
export function topLevelArguments(body) {
  const args = [];
  let depth = 0;
  let current = "";
  for (const char of String(body ?? "")) {
    if (char === "(" || char === "[" || char === "{") depth += 1;
    else if (char === ")" || char === "]" || char === "}") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim().length > 0 || args.length > 0) args.push(current.trim());
  return args;
}
