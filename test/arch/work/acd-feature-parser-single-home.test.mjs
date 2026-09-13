// FF-6601 (milestone 66 / ADR-003) — ONE GHERKIN PARSER.
//
// "`src/feature-parse.mjs` is the only module under `src/` recognising a Gherkin
//  keyword; `src/work.mjs` carries no `Feature:`/`Scenario:`/step-keyword regex and
//  reaches the grammar only by import."
//
// MEASURED AT HEAD before story 66/00: TWO recognisers (`work.mjs:719-755`,
// `feature-parse.mjs:18-55`) plus ONE renderer (`migrate-folder.mjs:571-580`) — the
// invariant was FALSE at HEAD, and 66/00 makes it true (ADR-009/A: a "no code path
// does X" invariant is a MEASUREMENT, and may not be frozen until it has been run
// against HEAD and the result recorded).
//
// THE SCAN DISTINGUISHES A RECOGNISER FROM A RENDERER (ROUND 3/9). A recogniser is a
// pattern TESTED against input; a renderer EMITS a keyword into a scaffold —
// `src/commands/migrate-folder.mjs:611-620` (`:571-580` before 66/00 edited above it)
// writes `Feature:`/`Scenario:`/`Given `
// into a migrated task stub. A bare keyword-string scan reports THREE homes and is
// wrong about the tree, so the two shapes are classified separately and the renderer
// is asserted by NAME (m47/R9 — a named site, never a count).
//
// WHAT COUNTS AS A RECOGNISER — three shapes, stated so the gate's reach is a decision
// and not an accident:
//   1. a REGEX LITERAL carrying a keyword — `/^Feature:/`, `/^Scenario( Outline)?:/`;
//   2. a keyword STRING handed to a matcher — `line.startsWith("Given ")`, `=== "Feature:"`;
//   3. a keyword string that is a member of a KEYWORD TABLE — an ARRAY literal
//      (`["Given ", "When ", …]`) or an OBJECT one (`{ head: "Feature:", step: "Given " }`).
// Shape 3 was added at 66/00's review: the one home's own step lexer
// (`src/feature-parse.mjs:58-60`) is an array of keywords plus `startsWith` over a
// VARIABLE, so shapes 1 and 2 could not see a copy-paste of it — the single likeliest
// way a third parser arrives. The object half was added at round 2, after the same
// table with names on its cells measured invisible. Deliberately broad: a table of
// keyword strings under `src/` is a grammar, wherever it sits — and measured, widening
// it to `{` costs 0 false positives across all 226 modules.
//
// WHAT THIS SCAN DOES NOT SEE, stated rather than discovered:
//   • a keyword assembled at runtime (`"Scen" + "ario:"`) or read from config/disk;
//   • a keyword reaching a matcher through a variable defined in ANOTHER module (the
//     scan is per-file — but the table shape above catches the copy-paste case, which
//     is the one measured to happen);
//   • a renderer that builds its document out of a TABLE of lines rather than
//     concatenation — that table reads as shape 3 and is reported as a RECOGNISER,
//     which fails toward review rather than toward silence.
// A bare keyword string that is neither tested nor emitted as a document — a UI label
// or an error message such as `"Feature: coming soon"` — is NEITHER, on purpose: a
// renderer must emit a LINE (a keyword at line start plus a newline), so a future
// label under `src/` cannot fail this gate with a message pointing at the wrong thing.
//
// THE COMMENT HANDLING IS A LEXER, NOT A REGEX STRIPPER — TECH_DEBT item 24's trap
// (`//` containing `/*` opens a phantom block and deletes the rest of the file) cannot
// arise here: comments are consumed character by character, in order, by the same pass
// that reads the literals.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// The one home for structural cuts (milestone 47 / F-47-04-ARCH-2). Used here for the
// outward cut — the call a keyword string is an argument of — so this gate never
// measures the LENGTH of what sits before a literal, which is a quantity no rule about
// the Gherkin grammar mentions.
import { enclosingParenGroup } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcDir = path.join(repoRoot, "src");

const THE_ONE_PARSER = "src/feature-parse.mjs";
const THE_NAMED_RENDERER = "src/commands/migrate-folder.mjs";

// THE_FORBIDDEN_IMPORTER — the one module that carries a headline recogniser and may
// NOT reach the one home, named here because two invariants in this repository were in
// direct conflict and only one of them could stand as written.
//
// `src/phase-brief.mjs` condenses a contract to its headlines under a character budget.
// It is a PURE LEAF whose emptiness is not a preference but a guarded contract, twice
// over: `arch/70 FF-7010` asserts it "pulls in nothing — not even a node builtin", and
// `arch/53 FF-7002` (extended) asserts "the phase-brief leaf imports nothing from src/
// (pure)". Those exist because the driver's export contract is frozen and a bound is
// only testable if the thing bounded is deterministic. So the ordinary remedy for a
// second recogniser — import the grammar from its home — is forbidden to this module by
// a stronger, older rule; measured, taking it fails both of those gates.
//
// This gate's own header states that its reach is "a decision and not an accident". The
// decision: a module that is STRUCTURALLY BARRED from importing the one home is exempt
// from the one-home rule, and the exemption is bounded by the assertion below rather
// than granted wholesale. What the rule protects against is a second PARSER of the
// grammar; four headline keywords under a budget is a condenser, and it is held to
// exactly that.
//
// A third module wanting on this list is a review question, not a precedent: the
// exemption is a named site (m47/R9 — a named site, never a count), so adding one is a
// visible edit here with its own justification, exactly as this one is.
const THE_FORBIDDEN_IMPORTER = "src/phase-brief.mjs";

// The Gherkin vocabulary, exactly as the grammar spells it — step keywords carry
// their trailing space, because that is what makes them keywords.
const KEYWORDS = ["Feature:", "Scenario:", "Scenario Outline", "Background:", "Examples:", "Given ", "When ", "Then ", "And ", "But "];
const KEYWORD_RE = new RegExp(KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));

// A recogniser spells the grammar with regex metacharacters in it —
// `/^Scenario( Outline)?:/` never contains the literal string "Scenario:". Stripping
// the metacharacters is what lets ONE keyword list serve both shapes.
const asPlainGrammar = (pattern) => pattern.replace(/[\\^$?*+|()[\]{}]/g, "");

// A RENDERER emits a Gherkin DOCUMENT: a LINE — a structural keyword (or an indented
// step) at line start, and a line ending. Both halves are load-bearing. Narrower than
// "carries a keyword" because six CLI usage strings in `src/cli.mjs` carry a bare
// `Examples:` line; narrower than "a keyword at line start" because a UI label or an
// error message (`"Feature: coming soon"`) is not a scaffold, and a gate that named it
// one would fail with a message pointing at the wrong thing.
const EMITS_DOCUMENT = /^[ \t]*(?:Feature:|Scenario:|Scenario Outline:|Background:)|^[ \t]{2,}(?:Given|When|Then|And|But) /m;
const emitsGherkin = (value) => {
  const text = value.replaceAll("\\n", "\n");
  return EMITS_DOCUMENT.test(text) && /\n/.test(text);
};

// A single-pass LEXER over the source: comments are skipped (a comment is prose ABOUT
// the grammar — `src/effects/assignment-transitions.mjs:41` says "Then the FACT is
// written" — and 40-odd modules carry one, so an unstripped scan is noise), and every
// string / template / regex literal is emitted with its kind and its position. Linear
// by construction: a regex-based scan of ~120 modules backtracks catastrophically.
function literals(text) {
  const out = [];
  const opensRegex = (previous) => previous === "" || "(,=:[!&|?{};+-*%~^<>".includes(previous);
  let index = 0;
  let previous = "";
  while (index < text.length) {
    const char = text[index];
    if (char === "/" && text[index + 1] === "/") {
      const start = index;
      while (index < text.length && text[index] !== "\n") index += 1;
      out.push({ kind: "comment", value: "", start, end: index - 1 });
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      const start = index;
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) index += 1;
      index += 2;
      out.push({ kind: "comment", value: "", start, end: index - 1 });
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      let cursor = index + 1;
      let value = "";
      while (cursor < text.length) {
        if (text[cursor] === "\\") {
          value += text[cursor] + (text[cursor + 1] ?? "");
          cursor += 2;
          continue;
        }
        if (text[cursor] === char) break;
        value += text[cursor];
        cursor += 1;
      }
      out.push({ kind: char === "`" ? "template" : "string", value, start: index, end: cursor });
      previous = char;
      index = cursor + 1;
      continue;
    }
    if (char === "/" && opensRegex(previous)) {
      let cursor = index + 1;
      let value = "";
      let inClass = false;
      let closed = false;
      while (cursor < text.length && text[cursor] !== "\n") {
        if (text[cursor] === "\\") {
          value += text[cursor] + (text[cursor + 1] ?? "");
          cursor += 2;
          continue;
        }
        if (text[cursor] === "[") inClass = true;
        else if (text[cursor] === "]") inClass = false;
        else if (text[cursor] === "/" && !inClass) {
          closed = true;
          break;
        }
        value += text[cursor];
        cursor += 1;
      }
      if (closed) {
        out.push({ kind: "regex", value, start: index, end: cursor });
        previous = "/";
        index = cursor + 1;
        continue;
      }
    }
    if (!/\s/.test(char)) previous = char;
    index += 1;
  }
  return out;
}

// A keyword STRING is a RECOGNISER when it is handed to a matcher, or compared with
// one; otherwise it is being EMITTED, and that is a renderer.
const TESTED_AGAINST_INPUT =
  /(?:\.(?:startsWith|endsWith|includes|indexOf|match|test|search|split|replace|replaceAll)\s*\(\s*|(?:===|!==|==|!=)\s*)$/;

// Every literal and comment span blanked out, positions preserved — so the bracket
// walk below counts REAL brackets and never one inside a string or a comment.
function maskTokens(text, tokens) {
  const chars = [...text];
  for (const token of tokens) {
    for (let index = token.start; index <= Math.min(token.end, chars.length - 1); index += 1) chars[index] = " ";
  }
  return chars.join("");
}

// The unclosed opener enclosing `index` — `[` means "this literal is an element of an
// array literal", which is shape 3 (see the header).
function enclosingOpener(masked, index) {
  const depth = { ")": 0, "]": 0, "}": 0 };
  const pairs = { "(": ")", "[": "]", "{": "}" };
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const char = masked[cursor];
    if (char in depth) depth[char] += 1;
    else if (char in pairs) {
      if (depth[pairs[char]] === 0) return char;
      depth[pairs[char]] -= 1;
    }
  }
  return null;
}

// classify(sources) → { recognisers, renderers } — pure, so the planted-defect lanes
// below drive the SAME function the real scan uses (a guard whose passing state is
// "found nothing" is indistinguishable from a broken one by every signal except a
// red probe).
export function classify(sources) {
  const recognisers = [];
  const renderers = [];
  for (const { file, text } of sources) {
    const hits = { recogniser: [], renderer: [] };
    const tokens = literals(text);
    const masked = maskTokens(text, tokens);
    // The text on the literal's own line that precedes it, and — for a call whose
    // argument list spans lines — the same cut ahead of the ENCLOSING call's opener.
    // Both are boundaries the language draws; neither is a character window.
    const lineHeadBefore = (index) => text.slice(masked.lastIndexOf("\n", Math.max(0, index - 1)) + 1, index);
    for (const literal of tokens) {
      if (literal.kind === "comment") continue;
      const call = enclosingParenGroup(masked, literal.start);
      const before = lineHeadBefore(literal.start);
      const beforeCall = call == null ? "" : `${lineHeadBefore(call.open)}(`;
      if (literal.kind === "regex") {
        if (KEYWORD_RE.test(asPlainGrammar(literal.value))) hits.recogniser.push(literal.value);
        continue;
      }
      if (!KEYWORD_RE.test(literal.value)) continue;
      // Shape 2 — tested against input.
      if (TESTED_AGAINST_INPUT.test(before) || TESTED_AGAINST_INPUT.test(beforeCall)) {
        hits.recogniser.push(literal.value);
        continue;
      }
      // Shape 3 — a member of a KEYWORD TABLE: an array literal (the one home's own
      // step lexer is exactly this — `STEP_KEYWORDS = ["Given ", …]` + `startsWith`
      // over a variable, and a copy-paste of it is how a third parser arrives) or an
      // object literal (`{ head: "Feature:", step: "Given " }` — the same table with
      // names on its cells, added at round 2 after the architect measured it invisible;
      // widening to `{` costs 0 false positives across all 226 modules).
      if (["[", "{"].includes(enclosingOpener(masked, literal.start))) {
        hits.recogniser.push(literal.value);
        continue;
      }
      if (emitsGherkin(literal.value)) hits.renderer.push(literal.value);
    }
    if (hits.recogniser.length > 0) recognisers.push({ file, hits: hits.recogniser });
    if (hits.renderer.length > 0) renderers.push({ file, hits: hits.renderer });
  }
  return { recognisers, renderers };
}

async function readSources() {
  const sources = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        sources.push({ file: path.relative(repoRoot, full).replaceAll("\\", "/"), text: await readFile(full, "utf8") });
      }
    }
  };
  await walk(srcDir);
  return sources;
}

export const archTests = [
  {
    name: "arch/FF-6601: the Gherkin grammar has exactly ONE recogniser under src/ — src/feature-parse.mjs",
    run: async () => {
      const sources = await readSources();
      assert.ok(sources.length > 100, `non-vacuity: the scan walked src/ (${sources.length} modules)`);
      const { recognisers } = classify(sources);
      assert.deepEqual(
        recognisers.map((entry) => entry.file).sort(),
        [THE_ONE_PARSER, THE_FORBIDDEN_IMPORTER].sort(),
        `the grammar must have one home; recogniser hits: ${JSON.stringify(recognisers, null, 1)}`,
      );
      const home = recognisers.find((entry) => entry.file === THE_ONE_PARSER);
      assert.ok(home.hits.length >= 3, `non-vacuity: the one home really does carry the grammar (${home.hits.length} patterns)`);

      // THE EXEMPTION IS CONDITIONAL, and this is the condition. `phase-brief.mjs` may
      // recognise the four block HEADLINES and nothing else: the moment it grows a step
      // keyword, a docstring delimiter or an `Examples:` table it has stopped condensing
      // and started parsing, and it must then earn its place the way any second reader
      // would — by not existing.
      const exempt = recognisers.find((entry) => entry.file === THE_FORBIDDEN_IMPORTER);
      assert.ok(exempt.hits.length > 0, "non-vacuity: the exemption has a subject — the condenser really does carry a headline pattern");
      // Stated as the rule rather than as a list of today's hits: a STEP keyword, an
      // `Examples:` table or a `Background:` block means it has stopped condensing
      // headlines and started parsing, at which point the exemption's premise is gone.
      const PARSER_ONLY_KEYWORDS = ["Given ", "When ", "Then ", "And ", "But ", "Examples:", "Scenarios:", "Background:"];
      for (const hit of exempt.hits) {
        for (const keyword of PARSER_ONLY_KEYWORDS) {
          assert.ok(
            !hit.includes(keyword),
            `${THE_FORBIDDEN_IMPORTER} recognises block headlines ONLY — it must never grow a step lexer or a table reader, and this hit carries "${keyword}": ${hit}`,
          );
        }
      }
    },
  },
  {
    name: "arch/FF-6601: the ONE renderer is the named migrate scaffold, not a second reader of the grammar",
    run: async () => {
      const { renderers } = classify(await readSources());
      assert.deepEqual(
        renderers.map((entry) => entry.file).sort(),
        [THE_NAMED_RENDERER],
        `a keyword EMITTED into a scaffold is admitted only at the named site; renderer hits: ${JSON.stringify(renderers, null, 1)}`,
      );
    },
  },
  {
    name: "arch/FF-6601: src/work.mjs carries no keyword regex and reaches the grammar only by importing the leaf",
    run: async () => {
      const text = await readFile(path.join(srcDir, "work.mjs"), "utf8");
      const { recognisers, renderers } = classify([{ file: "src/work.mjs", text }]);
      assert.deepEqual(recognisers, [], `work.mjs carries no Gherkin recogniser: ${JSON.stringify(recognisers)}`);
      assert.deepEqual(renderers, [], `and emits no Gherkin either: ${JSON.stringify(renderers)}`);
      // The import-statement parse: the god node reaches the grammar by import.
      const imports = [...text.matchAll(/^import\s+([\s\S]*?)\s+from\s+"([^"]+)"/gm)].map((m) => ({ what: m[1], from: m[2] }));
      const edge = imports.find((entry) => entry.from === "./feature-parse.mjs");
      assert.ok(edge, `work.mjs imports the one parser; imports: ${JSON.stringify(imports.map((i) => i.from))}`);
      assert.match(edge.what, /\bparseFeature\b/, "…and takes the parser itself, not a re-export of the grammar");
    },
  },
  {
    name: "arch/FF-6601: NON-VACUITY — a planted keyword regex in a SECOND module is detected",
    run: () => {
      const planted = [
        { file: THE_ONE_PARSER, text: 'const SCENARIO_RE = /^Scenario( Outline)?:/;\nif (/^Feature:/.test(line)) {}\nif (line.startsWith("Given ")) {}\n' },
        { file: "src/pretend-second-home.mjs", text: 'for (const raw of lines) {\n  if (/^Scenario( Outline)?:/.test(raw.trim())) count += 1;\n}\n' },
      ];
      const { recognisers } = classify(planted);
      assert.deepEqual(
        recognisers.map((entry) => entry.file).sort(),
        ["src/feature-parse.mjs", "src/pretend-second-home.mjs"],
        "a second hand-rolled parse must be visible to this gate — the whole point of FF-6601",
      );
    },
  },
  {
    name: "arch/FF-6601: NON-VACUITY — a planted copy of the ONE HOME'S OWN step lexer (a keyword ARRAY + startsWith over a variable) is detected",
    run: () => {
      // The shape `src/feature-parse.mjs:58-60` itself uses. Neither a regex literal
      // nor a keyword string next to a matcher, so shapes 1 and 2 are blind to it —
      // and a copy-paste of the one home is the likeliest way a third parser arrives.
      const planted = [
        {
          file: "src/pretend-third-parser.mjs",
          text:
            'const STEP_KEYWORDS = ["Given ", "When ", "Then ", "And ", "But "];\n' +
            "const isStepLine = (line) => STEP_KEYWORDS.some((keyword) => line.startsWith(keyword));\n",
        },
      ];
      const { recognisers, renderers } = classify(planted);
      assert.deepEqual(
        recognisers.map((entry) => entry.file),
        ["src/pretend-third-parser.mjs"],
        "an array of Gherkin keywords under src/ IS a grammar, wherever it sits",
      );
      assert.equal(recognisers[0].hits.length, 5, "every keyword in the array is reported, not just the first");
      assert.deepEqual(renderers, [], "and it is never mistaken for a renderer");
      // The SAME table with names on its cells — an object literal — is the fourth
      // shape, invisible to this gate until round 2.
      const asObject = classify([
        {
          file: "src/pretend-object-table.mjs",
          text: 'const K = { head: "Feature:", step: "Given " };\nexport const isStep = (line) => line.startsWith(K.step);\n',
        },
      ]);
      assert.deepEqual(asObject.recognisers.map((entry) => entry.file), ["src/pretend-object-table.mjs"], "a keyword table is a grammar with or without cell names");
      assert.deepEqual(asObject.recognisers[0].hits, ["Feature:", "Given "]);
      // The one home carries this shape, which is why the real sweep still names it.
      const real = classify([{ file: THE_ONE_PARSER, text: 'const STEP_KEYWORDS = ["Given ", "When "];\n' }]);
      assert.deepEqual(real.recognisers.map((entry) => entry.file), [THE_ONE_PARSER]);
    },
  },
  {
    name: "arch/FF-6601: a UI label or error string carrying a keyword is NEITHER — the gate never fails pointing at the wrong thing",
    run: () => {
      const planted = [
        { file: "src/pretend-label.mjs", text: 'const EMPTY = "Feature: coming soon";\nconst ERR = `Scenario: ${name} not found`;\n' },
      ];
      assert.deepEqual(classify(planted), { recognisers: [], renderers: [] }, "a label is not a scaffold and not a parser");
      // …while the scaffold shape — a keyword line WITH its line ending — still is.
      const scaffold = classify([{ file: "src/pretend-scaffold.mjs", text: 'return `Feature: ${title}\\n`;\n' }]);
      assert.deepEqual(scaffold.renderers.map((entry) => entry.file), ["src/pretend-scaffold.mjs"]);
    },
  },
  {
    name: "arch/FF-6601: NON-VACUITY — a planted keyword STRING matcher is detected, and a planted RENDERER is not mistaken for one",
    run: () => {
      const planted = [
        { file: "src/pretend-string-matcher.mjs", text: 'if (line.startsWith("Scenario:")) return true;\nif (trimmed === "Feature:") return false;\n' },
        { file: "src/pretend-renderer.mjs", text: 'return `Feature: ${title}\\n  Scenario: ${title}\\n    Given the migrated work\\n`;\n' },
        { file: "src/pretend-comment.mjs", text: '// Then the FACT is written and the EVENT appended (write-then-append)\nconst x = 1;\n' },
      ];
      const { recognisers, renderers } = classify(planted);
      assert.deepEqual(recognisers.map((e) => e.file), ["src/pretend-string-matcher.mjs"], "a string matcher IS a recogniser");
      assert.deepEqual(renderers.map((e) => e.file), ["src/pretend-renderer.mjs"], "a template literal is a RENDERER, and a comment is neither");
      // …including when the call's argument list spans LINES — the cut is the enclosing
      // call, so a matcher does not escape by being formatted across four of them.
      const multiline = classify([
        { file: "src/pretend-multiline.mjs", text: 'if (\n  line.startsWith(\n    "Given "\n  )\n) return true;\n' },
      ]);
      assert.deepEqual(multiline.recognisers.map((e) => e.file), ["src/pretend-multiline.mjs"]);
    },
  },
];
