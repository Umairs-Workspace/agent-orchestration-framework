// Fitness function for milestone 07 / ADR-005 (the bundle drift guard — NEW):
// "The design-conformance contract markers (role-split, render→judge hand-off,
//  CONFORMS/GAPS/INCONCLUSIVE verdict, committed-`mocks/`+binding-checklist convention) are
//  present in the BUNDLED assets under src/bundle/ — not only in .claude/."
//
// The loop was prototyped in .claude/ while src/bundle/ shipped the stale versions (the exact
// drift ADR-005 fixes). This guard source-greps the five BUNDLED assets for the contract markers
// each must carry, so the loop can never ship lifted-into-.claude/-only again. It is the
// marker-PRESENCE roll-up; the per-ADR structural assertions live in their own arch-tests
// (acd-design-role-split, acd-conformance-verdict-contract, acd-design-template-baseline,
// acd-a11y-config-schema), which also read the bundled assets.
//
// The guard is load-bearing only if it actually TRIPS when a marker is missing (else it is
// vacuously green). The self-test below proves that: it strips a marker from a copy of an asset
// and asserts assertMarker throws, naming the missing marker (02_..._bundled.feature self-test).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { registeredSuitePaths } from "../../support/registration/registration-surface.mjs";

const root = new URL("../../../", import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), "utf8");

const DESIGNER = "src/bundle/agents/aof-designer.md";
const QA = "src/bundle/agents/aof-qa.md";
const VERIFY = "src/bundle/commands/verify.md";
const CONTINUE = "src/bundle/commands/continue.md";
const REFINE = "src/bundle/commands/refine.md";
const TEMPLATE = "src/bundle/templates/milestone/DESIGN.md";

// The {bundled asset × the contract marker(s) it must carry} matrix. Each marker is one or more
// case-insensitive needles ALL of which must appear in that bundled asset. (02_..._bundled.feature.)
const MARKERS = [
  // The designer carries the judge-from-provided-screenshot + verdict markers.
  { asset: DESIGNER, label: "judges a provided screenshot (read-only)", needles: ["screenshot", "read-only"] },
  { asset: DESIGNER, label: "CONFORMS / GAPS / INCONCLUSIVE verdict", needles: ["CONFORMS", "GAPS", "INCONCLUSIVE"] },
  // The QA agent carries the runs-the-harness markers.
  { asset: QA, label: "runs the Playwright harness", needles: ["playwright", "harness"] },
  { asset: QA, label: "owns the toHaveScreenshot regression", needles: ["toHaveScreenshot"] },
  // The verify/continue commands carry the render→hand-off markers.
  // AMENDED BY MILESTONE 71 / ADR-005 (§2): the render mechanism 07 chose is policy-blocked on the
  // platform 07 ships to, so the marker becomes the cached-Chromium invocation. The hand-off half of
  // the marker — `aof-designer` + `judge` — is 07/ADR-001's and is unchanged.
  { asset: VERIFY, label: "render via the cached Chromium + hand to designer", needles: ["--headless=new", "aof-designer", "judge"] },
  { asset: CONTINUE, label: "render via the cached Chromium + hand to designer", needles: ["--headless=new", "aof-designer", "judge"] },
  // The refine command + DESIGN template carry the committed-mock convention markers (all four
  // refine obligations of 02/00: elicit · commit under mocks/ · reference as source of truth · no-mock
  // makes the checklist the mandatory source).
  { asset: REFINE, label: "elicits + commits a mock under mocks/", needles: ["elicit", "mocks/"] },
  { asset: REFINE, label: "references the committed mock as source of truth; no-mock → checklist mandatory", needles: ["conformance source of truth", "mandatory and is the source of truth"] },
  { asset: TEMPLATE, label: "committed-mocks/ + mandatory binding-checklist", needles: ["mocks/", "binding checklist"] }
];

// Throws naming the missing marker (and the offending needle) when any required needle is absent.
function assertMarker(content, marker) {
  const lc = content.toLowerCase();
  for (const needle of marker.needles) {
    if (!lc.includes(needle.toLowerCase())) {
      throw new Error(`missing contract marker "${marker.label}" (needle "${needle}") in the bundled asset`);
    }
  }
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Remove every case-insensitive occurrence of a needle from content (for the self-test mutation).
const strip = (content, needle) => content.replace(new RegExp(escapeRegExp(needle), "gi"), "");

export const archTests = [
  {
    name: "arch/ADR-005: every design-conformance contract marker is present in its BUNDLED asset under src/bundle/ (not only .claude/)",
    run: async () => {
      for (const marker of MARKERS) {
        assertMarker(read(marker.asset), marker); // throws (failing the test) if a marker is missing
      }
    }
  },
  {
    name: "arch/ADR-005 (self-test): the drift guard FAILS, naming the missing marker, when a required marker is removed from its bundled asset",
    run: async () => {
      // Removing any one marker MUST trip the guard — the negative case that proves it guards.
      const samples = [
        { asset: DESIGNER, label: "CONFORMS / GAPS / INCONCLUSIVE verdict", needle: "INCONCLUSIVE" },
        // Sample follows the marker amended by 71/ADR-005 — the mechanism changed, the guard did not.
        { asset: VERIFY, label: "render via the cached Chromium + hand to designer", needle: "--headless=new" },
        { asset: TEMPLATE, label: "committed-mocks/ + mandatory binding-checklist", needle: "binding checklist" }
      ];
      for (const s of samples) {
        const marker = MARKERS.find((m) => m.asset === s.asset && m.label === s.label);
        assert.ok(marker, `the sampled marker exists in the matrix: ${s.label}`);
        // Sanity: the marker passes against the real (unmutated) asset.
        assert.doesNotThrow(() => assertMarker(read(s.asset), marker), `the real ${s.asset} carries "${s.label}"`);
        // Mutate: strip the needle, and assert the guard trips naming the marker.
        const mutated = strip(read(s.asset), s.needle);
        assert.throws(
          () => assertMarker(mutated, marker),
          new RegExp(escapeRegExp(s.label)),
          `the guard trips, naming "${s.label}", when "${s.needle}" is removed from ${s.asset}`
        );
      }
    }
  },
  {
    name: "arch/ADR-005: the drift guard is registered, so it runs in CI rather than sitting orphaned",
    run: async () => {
      // Since 119/03 the runner names DIRECTORIES and each directory's index names its own suites,
      // so "is this guard wired in?" is answered by the registration surface, not by the runner's
      // text. The set requires both hops (index imports+spreads the suite, runner imports+spreads
      // that index), which is the orphan question this leg has always been asking.
      const registered = await registeredSuitePaths(fileURLToPath(root));
      assert.ok(
        registered.has("test/arch/ui/acd-design-conformance-bundled.test.mjs"),
        "acd-design-conformance-bundled is registered so the guard runs in CI (not orphaned)"
      );
    }
  }
];
