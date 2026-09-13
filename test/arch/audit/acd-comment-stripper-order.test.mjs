// TECH_DEBT item 24's ratchet — A HAND-ROLLED COMMENT STRIPPER MUST REMOVE LINE COMMENTS
// FIRST. Paid 2026-09-05 at `aof:pay-debt`; this control is what stops the 31st arrival.
//
// THE MECHANISM, because it is invisible at the call site. The house idiom for "comments are
// not code" is two chained replaces, and the ORDER is load-bearing. Stripping block comments
// first means a LINE comment that merely contains the two characters that open a block — an
// API glob in prose, a path pattern, a regex quoted in English — opens a PHANTOM block that
// runs to the next block terminator anywhere in the file and deletes everything between.
//
// IT WAS NOT HYPOTHETICAL. At the paying pass, `src/mesh/worktree.mjs:89` carried the line
// comment `// no control chars/space/~/^/:/?/[*][/][/[\, …`, whose accidental opener ran to a
// terminator 343 lines below — inside `catch { /[*] best effort [*]/ }` at `:432`. Under the
// old order `acd-no-new-silent-catch` could not see that catch, and reported the file clean.
// Correcting the order made it visible on the first run: a guard whose whole job is to find
// something that must not be there had been passing because it could no longer read the file.
// That is the FALSE-GREEN half, and it is why this is a control rather than a note.
//
// WHAT IS ASSERTED. For every module under the scanned roots that removes block comments at
// all: some LINE-comment removal must come FIRST. Both house spellings of "remove line
// comments" count — a `.replace(` over a `//` pattern, and the `.filter(`/`.map(` form that
// drops or blanks `//` lines while walking them (`test/support/terminal-gate-detectors.mjs`,
// which was already correct and already carries the self-check this file generalises).
//
// THE BASELINE IS NAMED AND SHRINK-ONLY, in `acd-test-suite-registration`'s idiom: four files
// carry a block-first stripper ON PURPOSE, as a `trapOrder` RED PROBE that asserts their own
// stripper refuses a blinded read. Those are the fix, not the defect, so they are carried by
// name with their reason — never counted, and never absorbed into a number.
//
// SELF-BLINDING IS THE OBVIOUS TRAP AND IS AVOIDED BY CONSTRUCTION: every needle below is
// ASSEMBLED FROM PARTS at runtime, so this file's own source contains no comment-stripping
// call site and cannot match itself. The self-check at the end proves the detector fires on a
// planted block-first stripper and stays silent on each accepted line-first spelling.
import { blankStringLiterals } from "../../support/source-slice.mjs";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ROOTS = ["src", "test", "scripts", path.join("ui", "src")];
const SCANNED = new Set([".mjs", ".js", ".ts", ".tsx"]);

// Assembled rather than written, so this module is not its own subject (see the note above).
const SLASH = "\\/";
const STAR = "\\*";
const BLOCK_OPEN = SLASH + STAR; // the escaped opener, as it appears inside a regex literal
const BLOCK_CLOSE = STAR + SLASH; // the escaped closer
const LINE_MARK = SLASH + SLASH; // the escaped line-comment marker

// A regex literal's source text, as written in a `.replace(` / `.filter(` / `.map(` argument.
const PATTERN = /\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\\n])+)\/[gimsuy]*/g;

// A pattern that removes BLOCK comments names both the opener and the closer.
const removesBlock = (body) => body.includes(BLOCK_OPEN) && body.includes(BLOCK_CLOSE);
// A pattern that removes LINE comments names the line marker and NOT the block closer (which
// would make it a block pattern that happens to contain two slashes).
const removesLine = (body) => body.includes(LINE_MARK) && !body.includes(BLOCK_CLOSE);

// The four deliberate red probes. SHRINK-ONLY: an entry names its file and why it is carried.
export const TRAP_ORDER_BASELINE = Object.freeze([
  Object.freeze({ file: "test/arch/grade/acd-acceptance-horizon-single-predicate.test.mjs", why: "drives a local `trapOrder` stripper and asserts the sweep REFUSES the blinded read it produces" }),
  Object.freeze({ file: "test/arch/audit/acd-controls-never-execute.test.mjs", why: "same red probe, over the controls lane's sources" }),
  Object.freeze({ file: "test/arch/command/acd-declared-id-single-home.test.mjs", why: "same red probe, over the declared-id readers" }),
  Object.freeze({ file: "test/arch/grade/acd-grade-green-needs-evidence.test.mjs", why: "same red probe, over the grade lane's sources" }),
]);

// The order verdict for ONE source text: null when the file removes no block comments at all,
// otherwise the offsets so a caller can report which came first.
export function stripperOrder(source) {
  let block = -1;
  let line = -1;
  // READ THROUGH THE ONE HOME'S STRING-BLANKER (119/01). `PATTERN` hunts regex literals, and a
  // string containing slashes and a `/*` looks exactly like one to it — which is how this gate
  // came to report that `test/support/source-slice.mjs` had become block-first, when what it had
  // actually become is a stateful scanner with no regex pair to order at all. A gate that hunts
  // for code must be able to tell code from a string that quotes it.
  for (const match of blankStringLiterals(source).matchAll(PATTERN)) {
    const body = match[1];
    if (block === -1 && removesBlock(body)) block = match.index;
    if (line === -1 && removesLine(body)) line = match.index;
  }
  if (block === -1) return null;
  return { block, line, blockFirst: line === -1 || block < line };
}

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out; // a scanned root that does not exist on this checkout is not a violation
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
      await walk(full, out);
    } else if (SCANNED.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const rel = (full) => path.relative(root, full).split(path.sep).join("/");

export const archTests = [
  {
    name: "arch/item-24 (acd-comment-stripper-order): every hand-rolled comment stripper removes LINE comments before block comments — a line comment containing a block opener can never blind a source-reading gate",
    run: async () => {
      const carried = new Set(TRAP_ORDER_BASELINE.map((entry) => entry.file));
      const files = [];
      for (const dir of ROOTS) files.push(...(await walk(path.join(root, dir))));
      assert.ok(files.length > 500, `the tree was walked before any claim about it (${files.length} modules)`);

      const violations = [];
      let strippers = 0;
      for (const full of files) {
        const name = rel(full);
        const verdict = stripperOrder(await readFile(full, "utf8"));
        if (verdict == null) continue;
        strippers += 1;
        if (!verdict.blockFirst || carried.has(name)) continue;
        violations.push(verdict.line === -1
          ? `${name}: removes block comments and never removes line comments`
          : `${name}: removes block comments at offset ${verdict.block}, before the line-comment removal at ${verdict.line}`);
      }

      assert.ok(strippers > 100, `the sweep found real strippers to judge, not an empty tree (${strippers})`);
      assert.deepEqual(
        violations.sort(),
        [],
        "a stripper that removes block comments FIRST can be blinded by a line comment containing a block opener — every source-reading assertion over that file then reads a truncated source, and an absence sweep passes over what it can no longer see. Remove line comments first (TECH_DEBT item 24). A DELIBERATE block-first probe belongs in TRAP_ORDER_BASELINE with its reason, never absorbed silently.",
      );
    },
  },
  {
    name: "arch/item-24 (acd-comment-stripper-order): self-check — the detector fires on a planted block-first stripper, is silent on every accepted line-first spelling, and the shrink-only baseline names four live files with reasons",
    run: async () => {
      // Built from the same assembled parts, so this file still contains no stripping call site.
      const blockCall = `.replace(/${BLOCK_OPEN}[\\s\\S]*?${BLOCK_CLOSE}/g, "")`;
      const lineReplace = `.replace(/^[ \\t]*${LINE_MARK}.*$/gm, "")`;
      const lineFilter = `.filter((l) => !/^\\s*${LINE_MARK}/.test(l))`;
      const lineMap = `.map((l) => l.replace(/${LINE_MARK}.*$/, ""))`;

      assert.equal(stripperOrder("const x = 1;"), null, "a module with no block-comment removal is not this control's subject");
      assert.ok(stripperOrder(`s${blockCall}`).blockFirst, "a block-only stripper is a violation — nothing removes the line comment that would open the phantom");
      assert.ok(stripperOrder(`s${blockCall}${lineReplace}`).blockFirst, "block-then-line is the trap order itself");
      for (const [label, after] of [["replace", lineReplace], ["filter", lineFilter], ["map", lineMap]]) {
        assert.equal(stripperOrder(`s${after}${blockCall}`).blockFirst, false, `the ${label} spelling of line-comment removal counts as removing line comments first`);
      }

      // The baseline is a ledger, not a count: every entry must name a file that still exists
      // and still carries the shape, or it is stale and the list has stopped being shrink-only.
      assert.equal(TRAP_ORDER_BASELINE.length, 4, "the baseline carries exactly four deliberate red probes; a fifth is a decision, not an edit");
      for (const entry of TRAP_ORDER_BASELINE) {
        assert.ok(entry.why && entry.why.length > 20, `${entry.file} is carried with a stated reason`);
        const verdict = stripperOrder(await readFile(path.join(root, entry.file), "utf8"));
        assert.ok(verdict != null && verdict.blockFirst, `${entry.file} still carries the deliberate block-first probe this baseline exists for — an entry whose subject is gone must be deleted, not left`);
      }
    },
  },
];
