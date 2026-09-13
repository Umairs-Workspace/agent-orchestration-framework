// arch/70 FF-7001 (ADR-001) — ONE BRIEF BAG.
//
// The phase context rides `brief.*` and nothing else: the driver's first parameter is the
// existing `brief` bag, widened by the additive `context` key. No module constructs a rival
// context/payload/digest object passed to the driver, and the four existing brief keys
// (itemRef, worktreeCwd, task, command) keep their meaning — `context` sits beside them,
// never replacing any. The @executable behaviour lives in test/work/phase-brief-seams.test.mjs;
// this is the STRUCTURAL half.
//
// EXTENDED by milestone 70 / story 05 with arch/70 FF-7010 (ADR-009 §4) — THE COMPILER IS
// HANDED EXTRACTS, NEVER DOCUMENTS. What rides the bag and what is put ON it are the same
// subject; this file already owns the shape of the payload, so the shape of what fills it
// belongs here rather than in a sibling.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { matchedBraceBody, stripComments } from "../../support/source-slice.mjs";
import { assertFamilyPurity } from "../../support/module-family.mjs";
import { BRIEF_SECTION_PRIORITY } from "../../../src/phase-brief.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcRoot = path.join(root, "src");
const FOUR_KEYS = ["itemRef", "worktreeCwd", "task", "command"];

// The `compilePhaseBrief` input key each declared section arrives under. `item` is the one
// section whose input is not named for it, so the mapping is written down rather than
// derived by convention — an eighth section is added HERE or this guard fails on it.
const SECTION_INPUT_KEY = Object.freeze({
  item: "itemRef",
  story: "story",
  objective: "objective",
  tasks: "tasks",
  architecture: "architecture",
  fitness: "fitness",
  dependencies: "dependencies",
});

// The reader's own I/O verbs. An identifier bound from one of these IS a document.
const DISK_READS = ["readFile", "readdir", "readOptional", "readTaskContracts"];

// THERE IS EXACTLY ONE. `callSitePairs` takes the FIRST `compilePhaseBrief(` it finds, so
// without this the guard says nothing about a second one added later — and a second call
// site in the reader is precisely where an unaddressed document would come back, since the
// whole check is "what is bound at the call site". Today `src/` holds one; asserted, not
// assumed, and asserted as a COUNT rather than as an existence so both directions fail.
function assertOneCallSite(reader) {
  assert.equal(
    (reader.match(/compilePhaseBrief\(/gu) ?? []).length,
    1,
    "the reader calls compilePhaseBrief exactly once — a second call site is unexamined by every assertion below it",
  );
}

// splitTopLevel(list) — the elements of an argument/array list, split on the commas that are
// not inside brackets, braces, parens or a string. A few lines of care rather than a
// `split(",")` that would tear `path.join(dir, "STORY.md")` in half.
function splitTopLevel(list) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    const ch = list[i];
    if (quote != null) { if (ch === quote && list[i - 1] !== "\\") quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if ("([{".includes(ch)) depth += 1;
    else if (")]}".includes(ch)) depth -= 1;
    else if (ch === "," && depth === 0) { out.push(list.slice(start, i)); start = i + 1; }
  }
  out.push(list.slice(start));
  return out.map((entry) => entry.trim());
}

// The `[ … ]` an index points at, brackets balanced — the array-literal twin of
// `matchedBraceBody`, which source-slice.mjs provides for `{ … }`.
function matchedBracketBody(code, at) {
  let depth = 0;
  for (let i = at; i < code.length; i += 1) {
    if (code[i] === "[") depth += 1;
    else if (code[i] === "]") { depth -= 1; if (depth === 0) return code.slice(at + 1, i); }
  }
  return null;
}

// documentBindings(code) — every identifier the reader binds STRAIGHT OUT OF a disk read.
// This is the set the section values at the call site must be disjoint from, and the guard
// is only as good as this set is complete: an unrecognised binding form does not make the
// guard pass honestly, it makes it pass VACUOUSLY. Its own non-emptiness is asserted before
// it is used, and that assertion is exactly what caught the second form below the day the
// reader started issuing its four independent reads together.
//
// TWO binding forms, both real in this reader:
//   const doc = await readOptional(…)
//   const [a, b] = await Promise.all([readOptional(…), readTaskContracts(…)])
// The second is matched POSITIONALLY — name i is a document only if element i is a disk
// read — so a later `const [doc, count] = await Promise.all([readFile(x), tally()])` marks
// `doc` and leaves `count` alone, rather than forcing production source into whatever shape
// this regex happens to like.
function documentBindings(code) {
  const documents = new Set();
  const verbs = DISK_READS.join("|");
  const isRead = new RegExp(String.raw`^(?:await\s+)?(?:${verbs})\s*\(`, "u");
  for (const match of code.matchAll(new RegExp(String.raw`const\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+(?:${verbs})\s*\(`, "gu"))) {
    documents.add(match[1]);
  }
  for (const match of code.matchAll(/const\s*\[([^\]]*)\]\s*=\s*await\s+Promise\.all\(\s*\[/gu)) {
    const body = matchedBracketBody(code, match.index + match[0].length - 1);
    if (body == null) continue;
    const elements = splitTopLevel(body);
    splitTopLevel(match[1]).forEach((name, index) => {
      if (/^[A-Za-z_$][\w$]*$/u.test(name) && isRead.test(elements[index] ?? "")) documents.add(name);
    });
  }
  return documents;
}

function callSitePairs(code) {
  const at = code.indexOf("compilePhaseBrief(");
  if (at < 0) return null;
  const body = matchedBraceBody(code, at);
  if (body == null) return null;
  const pairs = new Map();
  for (const match of body.matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*(?::\s*([^,\n]+))?/gu)) {
    const key = match[1];
    if (key === "") continue;
    pairs.set(key, (match[2] ?? key).trim());
  }
  return pairs;
}

export const archTests = [
  {
    name: "arch/70 FF-7001 (acd-phase-brief-single-bag): the driver still takes (brief, options) and reads the additive brief.context — no rival context/payload/digest parameter",
    run: async () => {
      const driver = await readFile(path.join(srcRoot, "agent-session-driver.mjs"), "utf8");
      assert.match(driver, /driveInteractiveClaudeSession\s*\(\s*brief\s*,\s*options\s*=\s*\{\s*\}\)/u, "the driver's signature stays (brief, options) — the brief bag is the one context carrier");
      assert.match(driver, /brief\.context/u, "the driver reads the additive brief.context key");
      assert.doesNotMatch(driver, /driveInteractiveClaudeSession\s*\(\s*(?:context|payload|digest)\b/u, "no rival-named first parameter was introduced");
    },
  },
  {
    name: "arch/70 FF-7001 (acd-phase-brief-single-bag): both callers construct the brief bag with the four existing keys and add context additively, never replacing any",
    run: async () => {
      const drive = await readFile(path.join(srcRoot, "commands", "drive.mjs"), "utf8");
      const mesh = await readFile(path.join(srcRoot, "mesh/worker-execution.mjs"), "utf8");
      for (const [name, src] of [["drive.mjs", drive], ["mesh/worker-execution.mjs", mesh]]) {
        for (const key of FOUR_KEYS) {
          assert.ok(new RegExp(`\\b${key}\\b`, "u").test(src), `${name} still constructs the brief bag with ${key}`);
        }
        assert.ok(src.includes("context"), `${name} passes the compiled context on the bag`);
      }
    },
  },
  {
    name: "arch/70 FF-7001 (acd-phase-brief-single-bag): the four existing brief keys keep their meaning — the context is a sibling spread, not a replacement (drive.mjs's additive spread is present)",
    run: async () => {
      const drive = await readFile(path.join(srcRoot, "commands", "drive.mjs"), "utf8");
      // drive.mjs adds context as a conditional sibling spread on the SAME bag that carries
      // the four keys — never a standalone argument, never replacing a key.
      assert.match(drive, /\{\s*context:\s*phaseContext\s*\}/u, "context is a sibling key on the brief bag");
      assert.doesNotMatch(drive, /driverOptions\s*=\s*\{\s*context/u, "context is never a driver OPTION (a rival payload position)");
    },
  },

  // ── FF-7010 (ADR-009 §4) — THE COMPILER IS HANDED EXTRACTS, NEVER DOCUMENTS ────────────
  {
    name: "arch/70 FF-7010 (acd-phase-brief-single-bag): every section at the compilePhaseBrief call site is bound to a named `const …Section = <helper>(…)` whose helper is imported from ./phase-brief.mjs — all seven of them",
    run: async () => {
      const reader = stripComments(await readFile(path.join(srcRoot, "phase-brief-read.mjs"), "utf8"));
      assertOneCallSite(reader);
      const pairs = callSitePairs(reader);
      assert.ok(pairs != null, "the reader has one compilePhaseBrief call site with an object argument");

      // What the reader imports from the pure compiler — the only place an addressing
      // helper may come from (ADR-009 §5: one policy, one home).
      // `[^{}]` rather than `[\s\S]` so the match cannot start at an EARLIER import and run
      // through this one — the failure mode that made a lazy quantifier read the wrong list.
      const fromCompiler = /import\s*\{([^{}]*?)\}\s*from\s*"\.\/phase-brief\.mjs"/u.exec(reader);
      assert.ok(fromCompiler != null, "the reader imports from ./phase-brief.mjs by name");
      const imported = new Set(fromCompiler[1].split(",").map((name) => name.trim()).filter(Boolean));

      // WHOLE-SURFACE SCOPE (m03/R5): the call site's keys are exactly the seven declared
      // sections' input keys plus `phase`. An eighth section cannot be handed over without
      // being examined here.
      assert.deepEqual(
        [...pairs.keys()].sort(),
        [...new Set([...BRIEF_SECTION_PRIORITY.map((id) => SECTION_INPUT_KEY[id]), "phase"])].sort(),
        "the call site supplies exactly the declared sections (plus the phase) — no unexamined key",
      );

      for (const id of BRIEF_SECTION_PRIORITY) {
        const key = SECTION_INPUT_KEY[id];
        const value = pairs.get(key);
        assert.ok(value != null, `${id} is supplied at the call site under ${key}`);
        assert.match(value, /^[A-Za-z_$][\w$]*Section$/u, `${id} is bound to a named const …Section, not to an expression (${key}: ${value})`);
        const binding = new RegExp(`const\\s+${value}\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*\\(`, "u").exec(reader);
        assert.ok(binding != null, `${value} is bound by a named const from a helper call`);
        assert.ok(imported.has(binding[1]), `${value}'s helper (${binding[1]}) is imported from ./phase-brief.mjs, where addressing lives because it is pure`);
      }
    },
  },
  {
    name: "arch/70 FF-7010 (acd-phase-brief-single-bag): no identifier bound directly from a disk read appears in any section value at the compilePhaseBrief call site — `objective: spec` and `story` were the measured violations",
    run: async () => {
      const reader = stripComments(await readFile(path.join(srcRoot, "phase-brief-read.mjs"), "utf8"));
      assertOneCallSite(reader);
      const pairs = callSitePairs(reader);
      assert.ok(pairs != null, "the reader has one compilePhaseBrief call site with an object argument");

      // Every identifier this module binds straight out of a disk read. This is the set the
      // section values must be DISJOINT from; if it is empty the check is vacuous, so its
      // non-emptiness is asserted before it is used (the reader really does read documents).
      const documents = documentBindings(reader);
      assert.ok(documents.size >= 3, `the reader binds documents from disk (found ${[...documents].join(", ") || "none"}) — otherwise this check asserts nothing`);

      // THE NEGATIVE ASSERTION. Before 70/05 this failed on two of the seven: the call site
      // read `objective: spec` (the entire SPEC.md, 9,514 chars) and `story` (the entire
      // STORY.md, frontmatter and scaffold comments included).
      for (const [key, value] of pairs) {
        assert.ok(!documents.has(value), `no document reaches the compiler: ${key}: ${value} is an identifier bound directly from a disk read`);
      }

      // …and the same rule, from the other side: no addressing helper is applied INSIDE the
      // call site (which would put the addressing in an expression this cheap exact check
      // cannot verify) and no document identifier is smuggled in as part of one.
      const body = matchedBraceBody(reader, reader.indexOf("compilePhaseBrief("));
      for (const document of documents) {
        assert.ok(!new RegExp(`\\b${document}\\b`, "u").test(body), `${document} does not appear anywhere in the call site, in any expression`);
      }

      // The pure compiler is where addressing lives, and it stays pure while it does so — as a
      // FAMILY (119/ADR-002): the subject is `src/phase-brief/` when that directory exists and
      // `src/phase-brief.mjs` when it does not, an intra-family specifier is admitted, and every
      // external dependency — a bare specifier, a node builtin, a relative path leaving the family —
      // is still a violation naming the file and the specifier.
      await assertFamilyPurity(assert, root, "src/phase-brief");
      const compiler = await readFile(path.join(srcRoot, "phase-brief.mjs"), "utf8");
      for (const verb of DISK_READS) {
        assert.doesNotMatch(compiler, new RegExp(`\\b${verb}\\b`, "u"), `the compiler performs no ${verb}`);
      }
    },
  },
];
