// Fitness function: acd-mesh-ui-scope-visible (milestone 34 / story 03;
// ARCHITECTURE ADR-006; DESIGN.md's scope-control checklist item).
//
// "The rendered fleet UI makes Global vs Local scope visible in the top-level
//  shell and keeps the selected scope across refresh/poll cycles."
//
// There is NO React test harness in this repo (no vitest/testing-library — per
// the story's own build guidance), so this fitness unit is TWO structural halves
// over the real source, plus the shared behavioural contract (the URL scope
// round-trip) already exercised directly against ./scope.mjs by
// fleet-scope.test.mjs:
//   (a) ui/src/fleet/Fleet.tsx renders the ScopeControl INSIDE the TopBar (the
//       top-level shell, mounted in EVERY page state — loading/error/empty/
//       populated all render the same <TopBar>), not inside a body region that
//       swaps out under load/error/empty;
//   (b) the poll interval AND the manual refresh handler both pass the CURRENT
//       `scope` state through to fleetApi.status(scope) — never a hard-coded
//       scope literal that would silently revert to the default on every poll.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scopeFromSearch, withScopeParam } from "../../../ui/src/fleet/scope.mjs";
// THE SLICER IS SHARED, AND THAT IS THE FIX (F-47-03-ARCH-4, closed by m47/04).
//
// Both halves of this gate used to cut source POSITIONALLY, and the second cut was the
// milestone's worst instrument defect: `Fleet()` sliced with a fixed `+ 4000`-character
// window that had to contain two markers, the later of which measured **158 characters**
// from the cutoff. The rule this gate states is "the scope control mounts above the state
// ternary"; what it MEASURED was how much code the function contains before its return —
// a quantity the rule does not mention. One `useState` turned it red with a message about
// scope visibility, and it had already distorted a build (47/03's developer moved three
// derivations to module scope to get under it; independently correct, so no harm landed).
//
// A gate that can be satisfied by contorting the code leaves no record that it was wrong.
// Both cuts are now brace-balanced, so they hold whatever the declaration's length or the
// file's declaration ORDER — the first cut assumed TopBar was declared immediately before
// ScopeControl, which is a second positional assumption nobody had noticed.
import { stripComments, functionBody } from "../../support/source-slice.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FLEET_TSX = path.join(repoRoot, "ui", "src", "fleet", "Fleet.tsx");

export const archTests = [
  {
    name: "arch/34 ADR-006: <ScopeControl> is rendered inside <TopBar> — the top-level shell mounted in every page state",
    async run() {
      const source = stripComments(await readFile(FLEET_TSX, "utf8"));

      const topBarBodyStart = source.indexOf("function TopBar(");
      assert.ok(topBarBodyStart >= 0, "Fleet.tsx defines TopBar");
      // TopBar's OWN body, brace-balanced — not "everything up to wherever ScopeControl
      // happens to be declared next". Reordering the two declarations is not a change to
      // this rule, and used to break this assertion.
      const topBarBody = functionBody(source, "function TopBar(");
      assert.ok(topBarBody != null, "…and TopBar's body is a balanced block this gate can read");
      assert.ok(/<ScopeControl\b/.test(topBarBody), "TopBar renders <ScopeControl> — the Global/Local switch lives in the top-level shell");

      // The Fleet() component renders <TopBar> UNCONDITIONALLY (outside the
      // loading/error/empty/populated branch) — i.e. before the state ternary that
      // swaps the body region.
      const fleetBodyStart = source.indexOf("export function Fleet()");
      assert.ok(fleetBodyStart >= 0, "Fleet.tsx exports the Fleet component");
      // Fleet()'s WHOLE body, however long it grows. The rule is about the ORDER of two
      // things inside it; the window was about its LENGTH, which is why it measured the
      // wrong quantity.
      const fleetBody = functionBody(source, "export function Fleet()");
      assert.ok(fleetBody != null, "…and Fleet()'s body is a balanced block this gate can read");
      const topBarCallIndex = fleetBody.indexOf("<TopBar");
      const stateTernaryIndex = fleetBody.indexOf('state === "loading"');
      assert.ok(topBarCallIndex >= 0, "Fleet() renders <TopBar>");
      assert.ok(stateTernaryIndex >= 0, "Fleet() branches on the loading state");
      assert.ok(stateTernaryIndex > topBarCallIndex, "<TopBar> renders BEFORE the loading/error/empty/populated state ternary — it is not one of the swapped branches");
    },
  },
  {
    name: "arch/34 ADR-006: both the poll interval and the manual refresh pass the CURRENT scope through to fleetApi.status — no hard-coded scope literal",
    async run() {
      const source = stripComments(await readFile(FLEET_TSX, "utf8"));

      // The initial load, the poll, and the refresh handler must all call
      // load(scope, …) — the STATE variable, never a bare "global"/"local" string
      // literal (which would silently ignore whatever the operator selected).
      const loadCalls = source.match(/load\s*\(\s*scope\b[^)]*\)/g) ?? [];
      assert.ok(loadCalls.length >= 3, `at least 3 call sites pass the live \`scope\` state into load(...) (initial load effect, poll interval, and refresh handler) — found ${loadCalls.length}`);

      assert.ok(
        !/load\s*\(\s*["']global["']/.test(source) && !/load\s*\(\s*["']local["']/.test(source),
        "no call site hard-codes load(\"global\") / load(\"local\") — every read scope-tracks the live state",
      );

      // fleetApi.status itself is called with the scope argument somewhere down
      // the chain (api.ts's status(scope) — the transport-level proof that the
      // scope actually reaches the wire, not just an internal variable).
      const apiSource = await readFile(path.join(repoRoot, "ui", "src", "fleet", "api.ts"), "utf8");
      assert.ok(
        /status\s*\(\s*scope\s*\?\s*:\s*["']global["']\s*\|\s*["']local["']\s*\)/.test(stripComments(apiSource).replace(/\s+/g, " ")),
        "fleetApi.status accepts an explicit scope parameter the caller threads through",
      );
    },
  },
  {
    name: "arch/34 ADR-006 (behavioural): the URL scope param round-trips — switching scope updates the URL, and reading it back reproduces the same scope (survives a refresh/poll/bookmark)",
    run() {
      for (const scope of ["global", "local"]) {
        const nextSearch = withScopeParam("", scope);
        assert.equal(scopeFromSearch(nextSearch), scope, `withScopeParam("", "${scope}") round-trips through scopeFromSearch to "${scope}"`);
      }
      // Switching TO local then reading the URL back never silently reverts to
      // global (the exact "keeps the selected scope across refresh/poll" bar).
      const afterSwitchToLocal = withScopeParam("?scope=global", "local");
      assert.equal(scopeFromSearch(afterSwitchToLocal), "local", "after switching to local, a refresh (re-reading the URL) still resolves scope local");
    },
  },
];
