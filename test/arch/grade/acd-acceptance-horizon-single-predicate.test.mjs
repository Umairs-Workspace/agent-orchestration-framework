// FF-6602 (milestone 66 / ADR-002 + ADR-009) — THE ACCEPTANCE HORIZON HAS ONE HOME
// AND NEVER GATES AN IMMUTABLE RECORD.
//
// "A single exported predicate decides it; every check calls it; no `severity:"error"`
//  finding is emitted for a path under a `done` item; no code path in `src/` opens an
//  EXISTING `.feature` for writing (create-only scaffolding is admitted)."
//
// MEASURED AT HEAD (ADR-009/A): ONE write site, create-only
// (`src/commands/migrate-folder.mjs:244-248` — ADR-009/A cited `:225-229`, which is
// where it sat before 66/00 declared the flag at that call, and `:231-235` until 119/02's
// prose sweep moved this module's registry rationale into its header, 11 lines above the
// call, and `:242-246` until 127/01 retired its private `ITEM_RE` + `nextFreeSlot` onto the one
// enumerator and the one mint); ZERO overwrite sites — the
// corrected invariant is TRUE at HEAD. The ratchet that correction carries is this
// milestone's own lesson third time round: a "no code path does X" invariant is a
// MEASUREMENT, and may not be frozen until it has been run against HEAD. The line
// number below is ASSERTED, not narrated, so this citation cannot go stale silently.
//
// CREATE-ONLY IS STRUCTURAL, NOT NARRATED (ROUND 3/10). `writeFile(p, t, "utf8")`
// TRUNCATES, so without a flag the claim is a property of surrounding control flow
// and no static gate can decide it. The admitted site therefore carries
// `{ encoding: "utf8", flag: "wx" }`, and this gate asserts the flag AT THE CALL.
//
// THE SCAN'S HONEST BOUNDARY. It reaches write calls whose argument text NAMES a
// `.feature` — the same reading ADR-009/A's measurement was made with. A write whose
// path is computed entirely at runtime (a member name off a manifest) is outside it;
// none exists under `src/` today, and saying so here is cheaper than discovering the
// gap later.
//
// ════════════════════════════════════════════════════════════════════════════════════
// EXTENDED BY MILESTONE 61 / STORY 01 — FF-6104, THE EPOCH BOUNDARY.
//
// 61/ADR-004 §2 homes the acceptor's epoch boundary in this same leaf, and the guard is
// EXTENDED here rather than joined by a sibling: "no second horizon-shaped predicate" and
// "the five status words have one home" are exactly the two properties a second file
// asserting them would weaken, because two gates over one rule is how the rule comes to
// have two readings.
//
// What FF-6104 adds, and why each leg is a leg:
//   • `closesEpoch` is exported from this leaf ALONE, compares against the module's own
//     `CLOSED_STATUS`, and takes the field the PAYLOAD spells — `status`, not `to`. `to`
//     is the lifecycle TABLE's word and no payload carries it, so a predicate written
//     against it reads `undefined` forever and never closes an epoch at all.
//   • It reads no `from`. SPIKE §8 corrects its own first pass here: all 11 milestones
//     that reached the closed status took `in-progress` → closed, so a `from`-keyed
//     predicate passes on every case in this tree and would silently never close an epoch
//     for a milestone parked in review — which the lifecycle admits and 3 of 4 spikes have
//     already done.
//   • No module under `src/work-acceptor/` — nor `src/commands/acceptor.mjs` — spells any
//     of the five status words, so the acceptor cannot acquire a second opinion about them.
//   • The criterion-revision window is computed from the two record sources ADR-004 §1b
//     names and NOT from the set of open milestones. That reading is an off switch and the
//     measurement says so: `isOpen` admits seven milestones in this repository today, so
//     the criterion would be frozen permanently and "at a boundary" a zero-width window.
//     It is PLANTED here, not narrated.
//   • The acceptor's declared cadence equals the auditing loop's, compared by reading BOTH
//     records — an acceptor scoring on a clock of its own is trusting instruments audited
//     on somebody else's.
// ════════════════════════════════════════════════════════════════════════════════════
import assert from "node:assert/strict";
import { readdir, readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ITEM_STATUS_EDGES, closesEpoch, isOpen, severityFor, VALID_STATUS } from "../../../src/acceptance-horizon.mjs";
import { validateWork } from "../../../src/work.mjs";
import { ACCEPTOR_EPOCH_CADENCE, criterionRevisionWindow } from "../../../src/work-acceptor/criterion.mjs";
// THE ONE HOME for cutting source (milestone 47 / F-47-04-ARCH-2). Its `stripComments`
// strips LINE COMMENTS FIRST (TECH_DEBT item 24), and its cuts are structural — a
// second brace balancer written beside it, or a fixed character window, is the exact
// species this repo has already been bitten by six times.
import { stripComments, functionBody, matchedBraceBody, matchedParenSpan, blockOrStatementAfter } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const srcDir = path.join(repoRoot, "src");

const THE_ONE_HOME = "src/acceptance-horizon.mjs";
// 61/FF-6104's subjects. The acceptor's directory, and the face that has not landed yet —
// named rather than globbed, so the day it arrives it is already inside the sweep.
const ACCEPTOR_DIR = "src/work-acceptor";
const ACCEPTOR_FACE = "src/commands/acceptor.mjs";
// The lifecycle's five words, spelled ONCE here so the two 61 legs below and the 66 lane
// above ask the same question of the tree.
const THE_FROZEN_FIVE = ["not-started", "in-progress", "blocked", "in-review", "done"];
// The auditor's own record, read where a workspace carries it (ADR-004 §3 cites `:8`).
const AUDITOR_RECORD = path.join(repoRoot, ".aof", "loops", "instrument-audit.md");
const THE_NAMED_WRITE_SITE = "src/commands/migrate-folder.mjs";
// The line the call sits on — a citation a test can check is a citation that stays true.
// And it did what it was built to do: 119/02 added no code to this module and still moved this
// call eleven lines, by putting the registry's rationale into the module's own header. A stored
// LINE is the same species as a stored PATH (item 81), one axis over, and this is the assertion
// that made the drift loud instead of leaving a comment quietly pointing at the wrong statement.
// …and 127/01 moved it two more, to :244 — the module's private `ITEM_RE` copy and its
// `nextFreeSlot` scan retired onto the one enumerator and the one mint (127/ADR-001 §5), and the
// import that replaced them carries its rationale above the call.
const THE_NAMED_WRITE_LINE = 244;

// Write-shaped callees: every door under `src/` through which bytes reach a path.
const WRITE_CALLS = [
  "writeFile",
  "writeFileSync",
  "appendFile",
  "appendFileSync",
  "writeText",
  "createWriteStream",
  "copyFile",
  "copyFileSync",
  "cp",
  "rename",
  "truncate",
];

// THE STRIPPER IS IMPORTED, NOT WRITTEN. This file was COPY 33 of TECH_DEBT item 24's
// trap until 66/00's review caught it: it stripped block comments FIRST, so a `//`
// comment containing `/*` opened a PHANTOM block running to the next `*/`. Measured
// over this tree, that hid 1,362 lines across five modules (`mesh-ui-serve.mjs` -695,
// `mesh-worktree.mjs` -343, `mesh-worker-execution.mjs` -162, `import/recovery.mjs`
// -149, `commands/insert-shared.mjs` -13) from every sweep below — and lane (b) was
// GREEN ONLY BECAUSE `import/recovery.mjs`'s second copy of the frozen five sat inside
// the swallowed region. Copy 34 is not written here: the correct-order stripper already
// has one home, and this gate reads it from there.

// The module's last line that is neither blank nor a `//` comment — the cheapest
// witness that a stripper did not swallow a tail.
function lastCodeLine(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//") && !line.startsWith("*") && !line.startsWith("/*"));
  return lines[lines.length - 1] ?? "";
}

// item 24 fix (b) — THE NON-VACUITY ASSERTION ON THE SWEEP ITSELF. A stripper is a
// detector's eyesight, and its failure mode is silent: the sweep still runs, finds
// nothing in the region it can no longer see, and reports green. So every sweep below
// strips through HERE, and HERE refuses a body that carries less code than the ONE
// HOME's stripper leaves behind.
//
// THE WITNESS IS THE NON-BLANK CODE-LINE COUNT, and its reach is MEASURED rather than
// asserted. Over this tree, four modules are genuinely blinded by the trap order
// (`import/recovery.mjs` −110 lines, `mesh-ui-serve.mjs` −326, `mesh-worktree.mjs`
// −113, `mesh-worker-execution.mjs` −83). Candidates, measured 2026-08-15:
//   • last-code-line survives — 0 of 4 (a phantom block usually ends MID-file)
//   • export count            — 2 of 4; silent on `mesh-ui-serve.mjs` AND on
//                               `import/recovery.mjs`, the very module whose blinding
//                               produced this story's false green
//   • declaration count       — 3 of 4; silent on `mesh-ui-serve.mjs`
//   • NON-BLANK CODE LINES    — 4 of 4, with 0 false positives under the shipped
//                               stripper across all 226 modules ← this one
// The tail check is kept as a cheap second witness for a whole-file swallow; the
// line-count witness is the load-bearing one. `strip` is a parameter for exactly one
// reason — so the lane at the bottom of this file can drive the guard with a
// trap-order stripper and prove it has teeth, without anyone editing a file to run a
// red probe.
function strippedSources(sources, strip = stripComments) {
  const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
  return sources.map((entry) => {
    const body = strip(entry.text);
    // The reference is the ONE HOME's own output: whatever stripper this gate is handed
    // may not see LESS code than the module every other gate in the repo reads through.
    const reference = codeLines(stripComments(entry.text));
    const hidden = reference - codeLines(body);
    assert.ok(
      hidden <= 0,
      `the comment stripper hid ${hidden} line(s) of code in ${entry.file} that the one home (test/support/source-slice.mjs) keeps — TECH_DEBT item 24, the phantom block a \`//\` comment containing \`/*\` opens: every sweep below is blind to that region, and would report green over it`,
    );
    const tail = lastCodeLine(entry.text);
    assert.ok(
      tail === "" || body.includes(tail),
      `the comment stripper swallowed the tail of ${entry.file} (TECH_DEBT item 24): its last code line \`${tail}\` is gone`,
    );
    return { ...entry, body };
  });
}

// The names declared in a module whose own DECLARATION BODY mentions a `.feature` path
// — so a write whose target is computed by a LOCAL HELPER (`taskFeatureName(task)`) is
// still a `.feature` write to this scan. One hop, within one module: 66/00's own
// de-duplication moved the extension out of the call, and a scan reading only the call
// text reported ZERO sites for a tree that still had one.
//
// EACH REGION IS CUT ON THE LANGUAGE'S OWN STRUCTURE — `functionBody` for a declaration,
// `blockOrStatementAfter` for an initialiser — never by a character window. A window
// here would measure the LENGTH of what follows a declaration, which is a quantity no
// rule about `.feature` writes mentions (F-47-04-ARCH-2; the window this replaced was
// caught by `acd-test-suite-registration`'s own positional-slice lane).
function featureNamers(code) {
  const names = [];
  for (const match of code.matchAll(/\b(function|const|let|var)\s+([A-Za-z0-9_$]+)/g)) {
    const [, keyword, name] = match;
    let region = null;
    if (keyword === "function") {
      region = functionBody(code, `function ${name}`);
    } else {
      const equals = code.indexOf("=", match.index + match[0].length);
      const lineEnd = code.indexOf("\n", match.index);
      if (equals >= 0 && (lineEnd < 0 || equals < lineEnd)) region = blockOrStatementAfter(code, equals + 1)?.body ?? null;
    }
    if (region != null && /\.feature\b/.test(region)) names.push(name);
  }
  return names;
}

// featureWriteSites(sources) → every write call under `src/` whose target NAMES a
// `.feature` — directly, or through a local helper that does. Records whether the call
// declares itself create-only AT THE CALL. Pure, so the planted-defect lanes drive the
// same function the real scan uses.
export function featureWriteSites(sources) {
  const sites = [];
  for (const { file, text } of sources) {
    const body = stripComments(text);
    const namers = featureNamers(body);
    const namesAFeature = (args) =>
      /\.feature\b/.test(args) || namers.some((name) => new RegExp(`\\b${name}\\s*\\(`).test(args));
    for (const callee of WRITE_CALLS) {
      const re = new RegExp(`\\b${callee}\\s*\\(`, "g");
      for (const match of body.matchAll(re)) {
        // The argument list is the region the LANGUAGE draws — matched parens, from
        // the one home, never a window.
        const args = matchedParenSpan(body, match.index)?.body ?? "";
        if (!namesAFeature(args)) continue;
        // No line number is recorded here on purpose: the stripped body's offsets are
        // not the file's (a block comment collapses to one space), and a citation
        // computed off the wrong coordinates is worse than none. The cited line is
        // checked directly against the raw file in the lane below.
        sites.push({ file, callee, createOnly: /flag:\s*"wx"/.test(args), args: args.replace(/\s+/g, " ").trim().slice(0, 160) });
      }
    }
  }
  return sites;
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

// The horizon's severity ruling (ADR-002 §2/§3) is IMPORTED from the one home
// (F-09, closed by 66/02): it was a local copy here and a second one in
// `test/grade/acceptance-horizon.test.mjs` for as long as no shipped code emitted a
// severity. 66/02's controls lane emits one, so the decision lives in `src/` and
// both copies are deleted rather than kept in sync.

const frontmatter = (fields) =>
  `---\n${Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n`;

// Two fixtures differing ONLY in the story's `status` word, each carrying the same
// planted violation: a `.feature` whose step position holds free text.
async function fixture(storyStatus) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-arch-horizon-"));
  const workDir = path.join(root, "work");
  const storyDir = path.join(workDir, "00_milestone_foundation", "stories", "00_story_alpha");
  await mkdir(path.join(storyDir, "tasks"), { recursive: true });
  await writeFile(
    path.join(workDir, "00_milestone_foundation", "SPEC.md"),
    frontmatter({ type: "milestone", number: "00", slug: "foundation", status: "in-progress", created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
    "utf8",
  );
  await writeFile(
    path.join(storyDir, "STORY.md"),
    frontmatter({ type: "story", number: "00", slug: "alpha", status: storyStatus, parent: "00", created: "2026-08-01", updated: "2026-08-01", schema: 1 }),
    "utf8",
  );
  const featurePath = path.join(storyDir, "tasks", "00_thing.feature");
  await writeFile(
    featurePath,
    "@executable\nFeature: Thing\n\n  Scenario: does a thing\n    Given a wrapped step that runs onto\n      a second indented line of prose\n    Then y\n",
    "utf8",
  );
  return { root, workDir, featurePath };
}

export const archTests = [
  {
    name: "arch/FF-6602: the horizon predicate has exactly ONE home, exported from a zero-import leaf",
    run: async () => {
      assert.equal(typeof isOpen, "function", "the predicate is importable");
      assert.equal(isOpen("done"), false);
      assert.equal(isOpen("in-progress"), true);

      // Every sweep reads the SAME stripped bodies, and `strippedSources` refuses to
      // hand over a body whose tail a phantom block ate (item 24 fix (b)).
      const sources = strippedSources(await readSources());
      assert.ok(sources.length > 100, `non-vacuity: the scan walked src/ (${sources.length} modules)`);

      // (a) No SECOND module declares a horizon-shaped predicate…
      const HORIZON_NAME = /\b(?:function|const|let)\s+(is(?:Open|Closed|Editable|Immutable|Accepted|WithinHorizon)|withinHorizon|acceptanceHorizon)\b/;
      const second = sources.filter((entry) => entry.file !== THE_ONE_HOME && HORIZON_NAME.test(entry.body));
      assert.deepEqual(second.map((entry) => entry.file), [], "no second implementation of the same decision exists anywhere under src/");

      // (b) …and no second copy of the vocabulary it closes on. `src/import/recovery.mjs`
      // WAS that copy — `normalizeStatus` spelled all five words as literals — and it
      // now destructures them out of `VALID_STATUS`, so the copy is gone rather than
      // excused. This lane was green before the stripper fix ONLY because that module's
      // tail was invisible.
      const fiveWords = sources.filter((entry) =>
        ["not-started", "in-progress", "blocked", "in-review", "done"].every((word) => entry.body.includes(`"${word}"`)),
      );
      assert.deepEqual(
        fiveWords.map((entry) => entry.file),
        [THE_ONE_HOME],
        "the frozen five have ONE home — leaving a copy behind is the debt this milestone exists to close",
      );
      assert.equal(VALID_STATUS.size, 5, "and it is exactly five values");

      // (c) The leaf imports NOTHING — the property story 66/02's FF-6605 depends on.
      const leaf = sources.find((entry) => entry.file === THE_ONE_HOME);
      assert.equal(/^import\s|require\(/m.test(leaf.body), false, "the horizon leaf has zero imports");
    },
  },
  {
    name: "arch/FF-6602: every check calls it — validate's lane reaches the decision by import, never by re-deciding it",
    run: async () => {
      const text = await readFile(path.join(srcDir, "work.mjs"), "utf8");
      assert.match(text, /import\s*\{[^}]*\bisOpen\b[^}]*\}\s*from\s*"\.\/acceptance-horizon\.mjs"/);
      // Cut on the language's structure (the one home), so a moved declaration fails as
      // "not found" rather than as a false claim about the rule.
      const cut = functionBody(stripComments(text), "export async function validateWork");
      assert.ok(cut != null, "validateWork's body was found — a null here is a moved declaration, not a green");
      const body = cut;
      assert.ok(body.length > 500, "non-vacuity: validateWork's body was actually extracted");
      assert.match(body, /isOpen\(/, "the gate asks the predicate");
      assert.equal(
        /"done"/.test(body),
        false,
        "and never re-derives the decision from the literal — two copies of \"is this item still open\" is how ITEM_RE came to exist in four places",
      );
    },
  },
  {
    name: "arch/FF-6602: every `.feature` write site under src/ is create-only, and the ONE site is the named migrate scaffold",
    run: async () => {
      const sources = strippedSources(await readSources());
      const sites = featureWriteSites(sources);
      assert.deepEqual(
        sites.map((site) => site.file),
        [THE_NAMED_WRITE_SITE],
        `exactly one admitted write site, named (never a count): ${JSON.stringify(sites, null, 1)}`,
      );
      assert.equal(sites[0].createOnly, true, `the site declares create-only AT THE CALL: ${sites[0].args}`);
      // The CITATION, checked against the raw file rather than narrated in a comment:
      // a test is code, and a citation it cannot check is one that goes stale.
      const rawLines = (await readFile(path.join(repoRoot, THE_NAMED_WRITE_SITE), "utf8")).split(/\r?\n/);
      assert.match(
        rawLines[THE_NAMED_WRITE_LINE - 1] ?? "",
        /await writeFile\(/,
        `the named write site is no longer at :${THE_NAMED_WRITE_LINE} (found "${(rawLines[THE_NAMED_WRITE_LINE - 1] ?? "").trim()}") — update THE_NAMED_WRITE_LINE and this file's header together`,
      );
    },
  },
  {
    name: "arch/FF-6602: the same planted violation is an ERROR inside the horizon and never a gating finding outside it",
    run: async () => {
      const open = await fixture("in-progress");
      const closed = await fixture("done");
      try {
        const openFindings = await validateWork(open.workDir, { name: "fixture" }, undefined);
        const closedFindings = await validateWork(closed.workDir, { name: "fixture" }, undefined);
        // Lane 1 — `aof work validate`: reported inside, silent outside.
        assert.equal(openFindings.filter((f) => f.path === open.featurePath).length, 1, "inside the horizon the violation is reported");
        assert.deepEqual(closedFindings, [], "outside it, validate emits no finding at all against the `.feature`");
        // Lane 2 — the severity the horizon owns (ADR-002 §2/§3). There is no ninth
        // code (ADR-009/E), so this drives the RULING rather than a doctor finding
        // this milestone does not ship.
        assert.equal(severityFor("in-progress"), "error", "inside the horizon a violation is an ERROR and gates");
        assert.equal(severityFor("done"), "warn", "outside it the same fact is at most advisory — never `error` against a done item");
        // The two fixtures differ in ONE WORD, which is what makes the horizon the cause.
        const openStory = await readFile(path.join(open.workDir, "00_milestone_foundation", "stories", "00_story_alpha", "STORY.md"), "utf8");
        const closedStory = await readFile(path.join(closed.workDir, "00_milestone_foundation", "stories", "00_story_alpha", "STORY.md"), "utf8");
        assert.equal(
          openStory.replace("status: in-progress", "status: done"),
          closedStory,
          "the fixtures differ only in `status`",
        );
      } finally {
        await rm(open.root, { recursive: true, force: true });
        await rm(closed.root, { recursive: true, force: true });
      }
    },
  },
  {
    name: "arch/FF-6602: NON-VACUITY — a planted FLAGLESS `.feature` write is detected, and the create-only shape is not",
    run: () => {
      const flagless = featureWriteSites([
        {
          file: "src/pretend-rewriter.mjs",
          text: 'await writeFile(path.join(tasksDir, `${slug}.feature`), render(task), "utf8");\n',
        },
      ]);
      assert.deepEqual(flagless.map((site) => [site.file, site.createOnly]), [["src/pretend-rewriter.mjs", false]], "a truncating write IS a finding");
      const guarded = featureWriteSites([
        {
          file: "src/pretend-scaffold.mjs",
          text: 'await writeFile(path.join(tasksDir, `${slug}.feature`), render(task), { encoding: "utf8", flag: "wx" });\n',
        },
      ]);
      assert.deepEqual(guarded.map((site) => site.createOnly), [true], "…and the create-only shape is admitted");
      // ONE HOP OF INDIRECTION: a write whose target is computed by a local helper is
      // still a `.feature` write. 66/00's own de-duplication produced exactly this
      // shape, and a scan reading only the call text reported ZERO sites for it.
      const indirect = featureWriteSites([
        {
          file: "src/pretend-indirect.mjs",
          text:
            "function taskFeatureName(task) {\n  return `${task.number}_${task.slug}.feature`;\n}\n" +
            'await writeFile(path.join(tasksDir, taskFeatureName(task)), render(task), "utf8");\n',
        },
      ]);
      assert.deepEqual(
        indirect.map((site) => [site.file, site.createOnly]),
        [["src/pretend-indirect.mjs", false]],
        "a flagless write through a local name-builder is still detected",
      );
      // A comment is not a write site, and neither is a `.feature` read.
      assert.deepEqual(
        featureWriteSites([
          { file: "src/pretend-reader.mjs", text: '// writeFile(x, y) would rewrite a .feature\nif (entry.name.endsWith(".feature")) await readFile(entry.path, "utf8");\n' },
        ]),
        [],
        "reading a `.feature` is not writing one",
      );
    },
  },
  {
    name: "arch/FF-6602: NON-VACUITY — the item-24 stripper guard has teeth: a TRAP-ORDER stripper is refused before any sweep runs",
    run: async () => {
      // The trap: block comments stripped FIRST, so a `//` comment containing `/*`
      // opens a phantom block. This is the shape this file itself shipped as copy 33,
      // and it is driven HERE rather than by editing a file, so the probe is repeatable.
      const trapOrder = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
      const sources = await readSources();
      assert.throws(
        () => strippedSources(sources, trapOrder),
        /hid \d+ line\(s\) of code .*TECH_DEBT item 24/s,
        "a blinded stripper must be refused at the door — a sweep that cannot see a region reports green over it",
      );
      // The reach is a property, not a count: EVERY module the trap order blinds is
      // caught, one at a time, rather than the walk happening to include one that is.
      const codeLines = (code) => code.split(/\r?\n/).filter((line) => line.trim() !== "").length;
      const blinded = sources.filter((entry) => codeLines(trapOrder(entry.text)) < codeLines(stripComments(entry.text)));
      assert.ok(blinded.length > 0, "non-vacuity: the trap order really does blind this tree");
      for (const entry of blinded) {
        assert.throws(() => strippedSources([entry], trapOrder), /TECH_DEBT item 24/, `${entry.file} is blinded and must be caught`);
      }
      // …and the shipped stripper is 0 false positives over the same tree.
      assert.equal(strippedSources(sources).length, sources.length);
    },
  },
  {
    name: "arch/FF-6602: NON-VACUITY — a planted SECOND horizon implementation is detected",
    run: () => {
      const HORIZON_NAME = /\b(?:function|const|let)\s+(is(?:Open|Closed|Editable|Immutable|Accepted|WithinHorizon)|withinHorizon|acceptanceHorizon)\b/;
      assert.equal(HORIZON_NAME.test('export function isOpen(status) { return status !== "done"; }'), true, "a second predicate is visible");
      assert.equal(HORIZON_NAME.test("const isClosed = (status) => status === \"done\";"), true, "under any of its names");
      assert.equal(HORIZON_NAME.test("const openItems = items.filter(Boolean);"), false, "and an unrelated name is not");
    },
  },

  // ═══ milestone 61 / story 01 — FF-6104 ══════════════════════════════════════════════

  {
    name: "arch/61 FF-6104: the epoch boundary is exported from the one horizon leaf, keys on the PAYLOAD's own field name, and reads no from-state",
    run: async () => {
      const sources = strippedSources(await readSources());
      assert.ok(sources.length > 100, `non-vacuity: the scan walked src/ (${sources.length} modules)`);

      // (a) ONE HOME. `closesEpoch` is declared in the horizon leaf and nowhere else under
      // `src/` — every other module reaches the decision by import.
      const declares = sources.filter((entry) => /\b(?:function|const|let)\s+closesEpoch\b/.test(entry.body));
      assert.deepEqual(declares.map((entry) => entry.file), [THE_ONE_HOME], "the boundary predicate has exactly one home");
      assert.equal(typeof closesEpoch, "function", "…and it is exported from it");

      // (b) IT COMPARES AGAINST THE MODULE'S OWN CONSTANT, so no second `"done"` literal is
      // created beside the one the horizon already owns.
      const leaf = sources.find((entry) => entry.file === THE_ONE_HOME);
      const cut = functionBody(leaf.body, "export function closesEpoch");
      assert.ok(cut != null, "closesEpoch's body was found — a null here is a moved declaration, not a green");
      assert.match(cut, /CLOSED_STATUS/, "it compares against the module's own CLOSED_STATUS");
      for (const word of THE_FROZEN_FIVE) {
        assert.equal(cut.includes(`"${word}"`), false, `…and spells no status literal of its own (${word})`);
      }

      // (c) IT TAKES THE FIELD THE PAYLOAD SPELLS. `item-status.changed` carries `status`
      // and `from`; `to` is the lifecycle TABLE's word and appears on no payload, so a
      // predicate written against it would read `undefined` on every record it is handed.
      const signature = /export function closesEpoch\(([^)]*)\)/.exec(leaf.body);
      assert.ok(signature != null, "the declaration is readable");
      assert.deepEqual(signature[1].split(",").map((part) => part.trim()).filter(Boolean), ["status"], "one parameter, named for the payload's own field");
      assert.equal(closesEpoch.length, 1, "…and it really takes one argument, so a from-state cannot be passed to it");
      // The payload's own object literal, cut on matched braces from the ONE HOME — never
      // an `indexOf("};")` sentinel, which assumes a declaration order nothing pins.
      const payload = stripComments(await readFile(path.join(srcDir, "effects", "item-transitions.mjs"), "utf8"));
      const payloadAt = payload.indexOf("const payload =");
      assert.ok(payloadAt >= 0, "the transition seam still builds a payload");
      const payloadBody = matchedBraceBody(payload, payload.indexOf("{", payloadAt));
      assert.ok(payloadBody != null, "the payload literal was found — a null here is a moved declaration, not a green");
      assert.match(payloadBody, /^\s*status: record\.status,$/m, "the payload really spells `status`");
      assert.match(payloadBody, /^\s*from: record\.from,$/m, "…beside a `from` it carries for provenance");
      assert.equal(/^\s*to:\s/m.test(payloadBody), false, "…and carries no `to` at all");

      // (d) IT READS NO from-STATE. The correction SPIKE §8 made to its own first pass:
      // the narrower predicate passes on every milestone in this tree and would never fire
      // for one parked in review.
      assert.equal(/\bfrom\b/.test(cut), false, "the predicate's body names no from-state");
      assert.equal(closesEpoch("done"), true);
      assert.equal(closesEpoch("in-progress"), false);

      // (e) THE LEAF STILL IMPORTS NOTHING — 66/02's FF-6605 depends on it, and the new
      // predicate must not be what opens the first import edge.
      assert.equal(/^import\s|require\(/m.test(leaf.body), false, "the horizon leaf still has zero imports");
    },
  },

  {
    name: "arch/61 FF-6104: no acceptor module spells a lifecycle word — the acceptor cannot acquire a second opinion about what `done` means",
    run: async () => {
      const sources = strippedSources(await readSources());
      const acceptorSources = sources.filter((entry) => entry.file.startsWith(`${ACCEPTOR_DIR}/`) || entry.file === ACCEPTOR_FACE);
      assert.ok(acceptorSources.length > 0, `non-vacuity: the acceptor's modules were found (${acceptorSources.map((entry) => entry.file).join(", ")})`);
      const offenders = [];
      for (const entry of acceptorSources) {
        for (const word of THE_FROZEN_FIVE) {
          if (entry.body.includes(`"${word}"`) || entry.body.includes(`'${word}'`)) offenders.push(`${entry.file}: "${word}"`);
        }
      }
      assert.deepEqual(offenders, [], "no module under the acceptor spells any of the five status words");
      // …and it reaches the decision by IMPORT, which is what makes the absence a routing
      // fact rather than a coincidence.
      const criterion = acceptorSources.find((entry) => entry.file === `${ACCEPTOR_DIR}/criterion.mjs`);
      assert.ok(criterion != null, "the criterion module is in the sweep");
      assert.match(criterion.body, /import\s*\{[^}]*\bclosesEpoch\b[^}]*\}\s*from\s*"\.\.\/acceptance-horizon\.mjs"/);
    },
  },

  {
    name: "arch/61 FF-6104: the criterion-revision window comes off the two declared record sources — PLANTED, seven open milestones leave it open",
    run: async () => {
      // THE PLANT. Seven open milestones and one closed — the shape of this repository
      // today. Under the reading this leg refuses (identify the open epoch with the OPEN
      // milestones) the window would be shut, permanently, and "at a boundary" would be a
      // zero-width window: an off switch installed in the epoch instead of the threshold.
      const openMilestones = ["not-started", "not-started", "not-started", "not-started", "not-started", "not-started", "in-progress"];
      assert.equal(openMilestones.filter((status) => isOpen(status)).length, 7, "the plant really is seven open milestones");

      const lastClose = { epochId: "60", at: "2026-08-29T00:00:00.000Z" };
      const atBoundary = criterionRevisionWindow({ lastClose, rulings: [] });
      assert.equal(atBoundary.atBoundary, true, "with no ruling since the last close the window is OPEN, whatever the open milestones are");
      assert.equal(atBoundary.closedEpoch, "60", "…and it names the epoch that close ended");

      // It shuts on the ledger, which is the other of ADR-004 §1b's two record sources.
      const shut = criterionRevisionWindow({ lastClose, rulings: [{ at: "2026-08-29T12:00:00.000Z" }] });
      assert.equal(shut.atBoundary, false, "once the acceptor has ruled in the new epoch the criterion is frozen");
      assert.equal(shut.openEpoch, "since:60", "…and the refusal has a name to print");

      // AND THE OPEN MILESTONES CANNOT REACH THE ANSWER AT ALL: the function takes one
      // options object naming the two record sources, and its body asks nothing else.
      const acceptor = stripComments(await readFile(path.join(srcDir, "work-acceptor", "criterion.mjs"), "utf8"));
      const body = functionBody(acceptor, "export function criterionRevisionWindow");
      assert.ok(body != null, "the window's body was found");
      assert.equal(/\bisOpen\b|milestones|VALID_STATUS|ITEM_STATUS_EDGES/.test(body), false, "it derives nothing from the set of open milestones");
      assert.match(body, /rulings/, "it reads the ledger…");
      assert.match(body, /lastClose/, "…and the most recent milestone close, and those two only");
    },
  },

  {
    name: "arch/61 FF-6104: the acceptor's declared epoch equals the auditing loop's cadence, read from BOTH records",
    run: async () => {
      // Each side off its OWN declaration. The auditor's cadence is a line on the auditor's
      // record; the acceptor's is a constant on the acceptor's module. Neither reads the
      // other, so this is a comparison and not a tautology — an acceptor scoring on a clock
      // of its own is trusting instruments audited on somebody else's.
      const auditor = await readFile(AUDITOR_RECORD, "utf8");
      const declared = /^cadence:\s*(\S+)\s*$/m.exec(auditor);
      assert.ok(declared != null, `the auditing loop's record declares a cadence (${AUDITOR_RECORD})`);
      assert.equal(declared[1], "event:per-milestone", "the auditor's record says what ADR-004 §3 cites");
      assert.equal(ACCEPTOR_EPOCH_CADENCE, declared[1], "and the acceptor's declared epoch equals it");

      const acceptor = await readFile(path.join(srcDir, "work-acceptor", "criterion.mjs"), "utf8");
      assert.equal(
        /readFile\([^)]*instrument-audit/.test(stripComments(acceptor)),
        false,
        "the acceptor does not read the auditor's record to define its own epoch — a value read out of the other's file is a copy, not a declaration",
      );
      assert.equal(auditor.includes("acceptor"), false, "…and the auditor's record does not restate the acceptor's epoch inside itself");
    },
  },

  {
    name: "arch/61 FF-6104: NON-VACUITY — the from-keyed predicate this replaced passes on every milestone in the tree and fails the one that matters",
    run: () => {
      // The rejected reading, driven rather than narrated. Over the 11 milestones that have
      // reached the closed status — all of which took `in-progress` → closed — it agrees
      // with the shipped predicate on every one, which is exactly why it survived a review
      // pass once. It disagrees on the case the lifecycle admits and 3 of 4 spikes take.
      const fromKeyed = (transition) => transition.from === "in-progress";
      const asShipped = (transition) => closesEpoch(transition.status);

      const everyMilestoneSoFar = Array.from({ length: 11 }, () => ({ from: "in-progress", status: "done" }));
      for (const transition of everyMilestoneSoFar) {
        assert.equal(fromKeyed(transition), asShipped(transition), "the narrower reading is indistinguishable on the tree as it stands");
      }

      const parkedInReview = { from: "in-review", status: "done" };
      assert.equal(asShipped(parkedInReview), true, "an item accepted from review closes its epoch");
      assert.equal(fromKeyed(parkedInReview), false, "…and the from-keyed reading silently never would");
      assert.ok(ITEM_STATUS_EDGES["in-review"].includes("done"), "the lifecycle really admits that move");

      // …and the mirror defect: a predicate reading `to` off a payload that spells `status`.
      const toKeyed = (transition) => transition.to === "done";
      assert.equal(toKeyed({ status: "done", from: "in-review" }), false, "a `to`-keyed predicate reads undefined on the real payload and never fires");
    },
  },
];
