// FF-7102 — milestone 71 / ADR-005 (as amended by ADR-009 §C, §D, §5).
//
// "No bundled asset renders through `npx playwright`, and no render is attempted before a
//  renderability precondition."
//
// The defect this closes, measured at HEAD before 71: `continue.md` and `verify.md` both mandated
// `npx playwright screenshot`, which is policy-blocked on this machine, while `.aof/aof.config.json`
// carried no `work.ui` key at all. Every UI story therefore burned three breakpoints x N surfaces of
// failed invocations plus two agent spawns to reach an INCONCLUSIVE the config had already
// determined. The verdict rule was stated as a VERDICT after the attempt, never as a PRECONDITION
// before it.
//
// THE SUPERSESSION IS LEGITIMATE AND IS RECORDED, not smuggled: 07's delivered `.feature` files are
// IMMUTABLE and are not touched — never edited, never annotated, never tagged `@superseded`. The new
// rule is stated in 71/03's own contract, and the three milestone-07 ARCH TESTS are amended, because
// tests are code and may change. Leg (c) below is what proves that amendment happened in place
// rather than by deletion: the legs 07 actually cared about are asserted STILL ENFORCED.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (rel) => readFileSync(path.join(root, rel), "utf8");
const has = (rel, needle) => read(rel).toLowerCase().includes(needle.toLowerCase());

const VERIFY = "src/bundle/commands/verify.md";
const CONTINUE = "src/bundle/commands/continue.md";
const QA = "src/bundle/agents/aof-qa.md";
const COMMANDS = [VERIFY, CONTINUE];

// The three milestone-07 controls this milestone supersedes (ADR-009 §5 — the count is THREE; the
// third was missed by ADR-005 as originally written, and finding it late is why it is named here).
const SUPERSEDED = [
  "test/arch/ui/acd-conformance-verdict-contract.test.mjs",
  "test/arch/ui/acd-design-conformance-bundled.test.mjs",
  "test/arch/ui/acd-design-role-split.test.mjs",
];

// Every file under src/bundle/, walked rather than listed: a new asset joins the sweep with no edit
// here, which is the only way leg (a) stays true of the BUNDLE rather than of a snapshot of it.
function bundleFiles(dir = path.join(root, "src", "bundle"), acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) bundleFiles(full, acc);
    else acc.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return acc;
}

// The design step, cut between its own declaration sentinels. Both ends are asserted found, so a
// renamed step fails loudly here instead of silently slicing an empty region and passing.
const DESIGN_STEP = {
  [CONTINUE]: ["**Design conformance (when the story has UI)", "**Mark it reviewed**"],
  [VERIFY]: ["the item has UI (a `DESIGN.md`", "**Human acceptance"],
};

function designStep(rel) {
  const [open, close] = DESIGN_STEP[rel];
  const text = read(rel);
  const start = text.indexOf(open);
  assert.notEqual(start, -1, `${rel}: NOT FOUND — the design step's opening sentinel "${open}"`);
  const end = text.indexOf(close, start);
  assert.notEqual(end, -1, `${rel}: NOT FOUND — the design step's closing sentinel "${close}"`);
  return text.slice(start, end);
}

export const archTests = [
  {
    name: "arch/FF-7102 (a): no bundled asset names `npx playwright`, and the render invocation carries the breakpoint width — while QA's own Playwright lane survives",
    run: async () => {
      const offenders = bundleFiles().filter((rel) => read(rel).toLowerCase().includes("npx playwright"));
      assert.deepEqual(offenders, [], "no file under src/bundle/ names the superseded `npx playwright` render");

      // The render invocation the commands DO name, including the token ADR-009 §C added: without
      // `--window-size` a render silently drops 07's 390/768/1280 breakpoints, which would be a real
      // regression in a delivered conformance contract wearing a mechanism swap's clothes.
      //
      // THE FLAGS ARE ASSERTED INSIDE THE INVOCATION, not anywhere in the file. Measured by a plant:
      // deleting `--window-size=<W>,<H>` from the invocation left a file-wide `has(cmd, …)` GREEN,
      // because the Breakpoints bullet names the flag in prose one paragraph below. A control that
      // passes over a render which no longer carries the width is not the control this row claims.
      for (const cmd of COMMANDS) {
        const invocation = /`([^`]*--headless=new[^`]*)`/u.exec(read(cmd))?.[1];
        assert.ok(invocation, `${cmd}: NOT FOUND — a render invocation naming --headless=new`);
        for (const flag of ["--screenshot=", "--window-size="]) {
          assert.ok(invocation.includes(flag), `${cmd}: the render INVOCATION itself carries ${flag}`);
        }
        assert.ok(has(cmd, "forward-slash"), `${cmd}: the output path is absolute and forward-slashed`);

        // ADR-009 §C's actual worry: a mechanism swap that silently drops 07's breakpoints would be
        // a real regression in a delivered conformance contract. The widths are asserted PRESENT
        // alongside the flag that carries them, so a `--window-size=` with nothing to put in it fails.
        for (const width of ["390", "768", "1280"]) {
          assert.ok(has(cmd, width), `${cmd}: the ${width} breakpoint survives the mechanism swap`);
        }
        assert.ok(has(cmd, "one render per breakpoint"), `${cmd}: one invocation per breakpoint`);
        assert.ok(has(cmd, "own output path"), `${cmd}: …each writing its own screenshot`);
      }

      // THE BAN IS ON THE RENDER INVOCATION ONLY. Without this leg the control could be satisfied by
      // deleting design conformance altogether, which is the opposite of what the milestone wants.
      assert.ok(has(QA, "playwright") && has(QA, "harness"), "QA still runs the Playwright harness");
      assert.ok(has(QA, "tohavescreenshot"), "QA still owns the toHaveScreenshot regression");
      for (const cmd of COMMANDS) {
        assert.ok(has(cmd, "aof-designer") && has(cmd, "judge"), `${cmd}: the designer hand-off survives`);
        assert.ok(has(cmd, "aof-qa"), `${cmd}: the QA spawn survives`);
      }
    },
  },
  {
    name: "arch/FF-7102 (b): in both commands the precondition is stated BEFORE the render — asserted by order, not by presence — and names the skip-and-record outcome",
    run: async () => {
      for (const cmd of COMMANDS) {
        const step = designStep(cmd);
        const lower = step.toLowerCase();

        const precondition = lower.indexOf("renderability precondition");
        const render = lower.indexOf("--headless=new");
        assert.notEqual(precondition, -1, `${cmd}: the design step states a renderability precondition`);
        assert.notEqual(render, -1, `${cmd}: the design step states the render invocation`);
        // ORDER, which is the whole point: a precondition stated AFTER the render documents a lane
        // that still spawns-and-fails, and mere presence would pass it.
        assert.ok(precondition < render, `${cmd}: the precondition is stated before the render, not after it`);

        // Both halves, and the resolution order within each.
        assert.ok(lower.includes("--url") && lower.includes("work.ui.baseurl"), `${cmd}: the base-URL half names --url and work.ui.baseUrl`);
        assert.ok(lower.includes("work.ui.renderer"), `${cmd}: the renderer half names work.ui.renderer`);
        assert.ok(lower.includes("ms-playwright"), `${cmd}: …with the cache it falls back to`);

        // ADR-009 §D — "resolvable" is exists-and-executable, and discovery GLOBS rather than
        // templating a path, because the cache layout is not stable across revisions.
        assert.ok(lower.includes("exists and is executable"), `${cmd}: resolvable means exists-and-executable, not "the key is set"`);
        assert.ok(/glob/u.test(lower), `${cmd}: discovery globs the cache`);
        assert.ok(lower.includes("never template") || lower.includes("never templating"), `${cmd}: …and never templates a path`);

        // The skip is a first-class outcome: no render, no spawn, a recorded reason, and the lane
        // carries on. A precondition that failed loudly instead would just be a crash with a plan.
        assert.ok(lower.includes("attempt no render") || lower.includes("no render is attempted"), `${cmd}: a failed precondition attempts no render`);
        assert.ok(lower.includes("spawn no designer") && lower.includes("no qa session"), `${cmd}: …and spawns neither agent`);
        assert.ok(lower.includes("record the reason"), `${cmd}: …and records the reason`);
        assert.ok(lower.includes("inconclusive"), `${cmd}: …returning INCONCLUSIVE`);

        // The precondition is PER SURFACE: one unrenderable surface must not silently take a
        // sibling that resolves down with it.
        assert.ok(lower.includes("per surface"), `${cmd}: the precondition is evaluated per surface`);

        // A render that FAILED is not a render. All four failure modes are named, because "exits
        // zero but wrote nothing" is the one that would otherwise be judged as a screenshot.
        for (const mode of ["exits non-zero", "writes no file", "zero-byte", "does not return"]) {
          assert.ok(lower.includes(mode), `${cmd}: a render that ${mode} is INCONCLUSIVE, not a verdict`);
        }

        // The three verdict literals 07 delivered are preserved VERBATIM (ADR-009 §5's stated trap):
        // rewriting the Verdict bullet is what would otherwise force a fourth amendment to
        // acd-conformance-verdict-contract, which this milestone must not need.
        assert.ok(lower.includes("no baseline exists"), `${cmd}: the "no baseline exists" literal survives`);
        assert.ok(lower.includes("inferring from component code"), `${cmd}: the "inferring from component code" literal survives`);
        assert.ok(lower.includes("no renderable") && lower.includes("route"), `${cmd}: the "no renderable Route" literal survives`);
      }
    },
  },
  {
    name: "arch/FF-7102 (c): the three superseded milestone-07 controls are amended IN PLACE — no npx render assertion survives, the legs 07 cared about do, and no wiki/work/07_* file is written",
    run: async () => {
      for (const rel of SUPERSEDED) {
        const source = read(rel);
        // An amendment, not a deletion: where the token still appears in an assertion it is NEGATED.
        // The negation is spelled two ways in the tree — `!has(rel, …)` and `!body.includes(…)` — so
        // the test is for a `!` opening the asserted expression, not for one particular helper.
        const positive = source
          .split("\n")
          .filter((line) => line.toLowerCase().includes("npx playwright")
            && /assert\.\w+\(/u.test(line)
            && !/assert\.\w+\(\s*!/u.test(line));
        assert.deepEqual(positive, [], `${rel}: no surviving assertion REQUIRES the superseded npx playwright render`);
      }

      // 07/ADR-002's untouched invariant — the mechanism changed, this did not.
      const verdict = read(SUPERSEDED[0]);
      assert.ok(verdict.includes("devDependencies") && verdict.includes("@playwright/test"),
        "the Playwright-is-not-a-dependency leg is still enforced by the verdict contract");
      // 07/ADR-001's role split — the legs this milestone actively wants kept.
      const roleSplit = read(SUPERSEDED[2]);
      assert.ok(roleSplit.includes("not instruct the designer to run the browser"),
        "the designer is still never told to run the browser");
      assert.ok(roleSplit.includes("the designer body never names the `npx playwright` render command"),
        "the designer body is still asserted free of the render command");
      const bundled = read(SUPERSEDED[1]);
      assert.ok(bundled.includes("aof-designer") && bundled.includes("judge"),
        "the render->hand-off marker still carries the hand-off half");

      // DELIVERED CRITERIA ARE IMMUTABLE. The supersession lives in 71's own contract, so no story of
      // this milestone may declare a write anywhere under wiki/work/07_*.
      const stories = path.join(root, "wiki", "work", "archive", "71_milestone_loop-discipline", "stories");
      const declared = readdirSync(stories).map((slug) => {
        const text = readFileSync(path.join(stories, slug, "STORY.md"), "utf8");
        return [slug, /^files:\s*\[(.*)\]\s*$/mu.exec(text)?.[1] ?? ""];
      });
      assert.ok(declared.length > 0, "the milestone's stories were found");
      for (const [slug, files] of declared) {
        assert.equal(/wiki\/work\/07_/u.test(files), false, `${slug}: declares no write under wiki/work/07_*`);
      }
    },
  },
];
