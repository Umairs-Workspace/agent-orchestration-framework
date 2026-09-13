// milestone 47 — the VERIFY FIX PASS's regression lanes (2026-08-11).
//
// Every lane here exists because `aof:verify 47` found a defect that NO EXISTING LANE COULD SEE,
// and each one is written so that reverting its fix turns it red. That is the whole point: the
// six defects this suite pins were not found by the 210 green assertions the milestone already
// had — they were found by rendering the page in a real browser and pressing keys at it. A fix
// with no lane would leave the next regression to the next render.
//
// WHAT WAS WRONG WITH THE COVERAGE, stated once, because it is the milestone's own lesson:
//   - `03_deep-link-and-survival.feature`'s lanes assert the address WRITE. The READ-BACK — what
//     the page does when the browser walks its own history — was deferred to an `@manual` lane
//     "until the harness models a history STACK". The defect lived exactly in that gap: the
//     surface pushed entries and never listened for `popstate`, so Back moved the URL and left
//     the page rendering another repo. The harness now models the stack (its own header says
//     why), so clause 1 of that `@manual` scenario is `@executable` here — F-47-V-17's migration.
//   - The picker's dismissal, keyboard and hit-target clauses were classified `@uat` because the
//     a11y lane is off. QA measured all of them with the a11y lane STILL off, which refutes the
//     justification rather than satisfying it: axe-core is not what decides whether `Esc` closes
//     a popover. Six of that scenario's seven clauses are DOM facts and are laned here.
//   - The two VIEWPORT-KEYED rules (DG-47-4's drops, S1-C's clamp) had no executable form at all
//     because this harness has no layout. They are pure functions now, so the DECISION is pinned
//     headlessly and the render only has to prove the wiring.
//
// ISOLATION: this suite exports a test ARRAY; drive it through a runner that IMPORTS the array,
// under `AOF_GLOBAL_HOME=$(mktemp -d)`. Every fixture server binds port 0.
import assert from "node:assert/strict";
import { withTwoWorkspaceAssignFixture } from "../support/mesh-ui-assign-fixture.mjs";
import { withFleetApp } from "../support/fleet-app-harness.mjs";
import {
  trigger,
  triggerLabel,
  pickerRows,
  togglePicker,
  banner,
  bannerChips,
  chipClear,
  regionSummary,
} from "../support/fleet-filter-readers.mjs";
import { slotAidForm, clampedPopover, SLOT_AID_DROP_WIDTH, POPOVER_GUTTER } from "../../ui/src/fleet/slot-aids.mjs";
import { emptyStateCopy } from "../../ui/src/fleet/scope.mjs";

// The resting label. A `.tsx` cannot be imported by `node:test`, so it is pinned here and
// checked against the module's own literal by `fleet-filter-control/01` — the two cannot drift.
const ALL_REPOS = "All repos";

// `REPO_TRIGGER_WIDTH` lives in a `.tsx`, which `node:test` cannot import — so it is READ, the
// same way `fleet-filter-control/01` reads it. The point here is narrow and load-bearing: the
// aids' drop boundary and the trigger's fixed-slot boundary must be the SAME number, and the two
// live in different files. F-47-V-23 is what happens when one moves and the other does not.
async function pickerConstantForBoundary() {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../../ui/src/fleet/RepoPicker.tsx", import.meta.url), "utf8");
  const match = source.match(/export const REPO_TRIGGER_WIDTH =\s*"([^"]*)"/);
  assert.ok(match, "ui/src/fleet/RepoPicker.tsx declares `export const REPO_TRIGGER_WIDTH` as a string literal");
  return match[1];
}

// The listbox, addressed by role — present only while the picker is open, which IS the fact
// every dismissal lane below asserts.
const listboxOpen = (tree) => {
  const found = [];
  const walk = (node) => {
    if (node == null || typeof node !== "object") return;
    if (node.props?.role === "listbox") found.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree);
  return found.length > 0;
};

export const fleetSlotAndPickerTests = [
  // ── DG-47-4's two drops, as a decision (F-47-V-2) ──────────────────────────────────────────
  {
    name: "fleet-slot-and-picker/01 the two slot aids drop TOGETHER below `sm`, at the SAME boundary the fixed slot binds at, keyed to the viewport, defaulting to the form that loses nothing",
    async run() {
      // The rule is "two whole discrete drops, taken TOGETHER below `sm`, keyed to the viewport
      // and never to the data". One function answers for both aids, so they cannot key to two
      // different widths — the failure a per-aid media query invites.
      //
      // RE-POINTED 2026-08-13 (verify pass 3, F-47-V-23). The boundary was 390, keyed there to
      // match the NAV's disclosure drop in a DIFFERENT bar. F-47-V-19 then moved the trigger's
      // fixed slot to `sm` (>=640) and did not move this, which left 391..639 as a band where the
      // two UNPROTECTED aids kept their words while the PROTECTED repo filter had no reserved
      // width — DG-47-4's ruling exactly inverted. This lane now pins the two boundaries as ONE
      // number, which is the only thing that makes the inversion unrepresentable.
      assert.equal(SLOT_AID_DROP_WIDTH, 640, "the breakpoint is `sm` — the SAME boundary S1-B's fixed 150px slot binds at, so one bar has one boundary");
      const trigger = await pickerConstantForBoundary();
      assert.match(trigger, new RegExp(`sm:w-\\[150px\\]`), "…and the trigger's fixed slot starts at that same `sm`, so the aids' drop and the slot's reservation can never disagree about where the bar changes form");

      for (const width of [1920, 1280, 768, 760, 641, 640]) {
        assert.equal(slotAidForm(width), "words", `at ${width} both aids keep their words — the two protected NARROWINGS are never the thing that gives way`);
      }
      for (const width of [639, 480, 391, 390, 375, 360, 320]) {
        assert.equal(slotAidForm(width), "glyph", `at ${width} both aids give up their words whole, keeping their pinned glyphs — below \`sm\` the residual belongs to the protected filter`);
      }
      // THE BOUNDARY IS A CLIFF FOR THE AIDS AND MUST NOT BE ONE FOR THE FILTER. 391 was the
      // failing row: one pixel above the old drop, the aids reclaimed their words and the trigger
      // lost ~75px against its width at 390. Asserting the pair at 390/391 is what makes that
      // regression unrepresentable rather than merely fixed.
      assert.equal(slotAidForm(390), slotAidForm(391), "390 and 391 answer the SAME form: the old boundary sat here, and crossing it made the PROTECTED control narrower as the viewport got WIDER (measured 167.77px at 390 against 92.73px at 480)");
      assert.notEqual(slotAidForm(639), slotAidForm(640), "…and the one boundary that does exist is at `sm`, asserted from both sides so a silent move is loud");
      // An unmeasured host answers WORDS. The wide form loses nothing, so it is the safe answer
      // when there is nothing to key on (a first paint before measurement, a headless mount).
      for (const missing of [null, undefined, Number.NaN, "390"]) {
        assert.equal(slotAidForm(missing), "words", `an unmeasured viewport (${String(missing)}) answers the form that loses nothing, never a guessed drop`);
      }
    },
  },

  // ── S1-C's clamp, as arithmetic (F-47-V-3) ────────────────────────────────────────────────
  {
    name: "fleet-slot-and-picker/02 the popover clamps to the content rail rather than overflowing the viewport, and degrades to its natural position when unmeasured",
    async run() {
      // MEASURED ON THE SHIPPED BUILD, and these are its real numbers: a 288px popover
      // right-anchored to a trigger whose right edge sat at 225 on a 375px content width put its
      // left edge at -63, and the page root's `overflow-x: clip` cut it SILENTLY — every repo
      // name lost its head with nothing on screen saying so.
      const narrow = clampedPopover({ anchorRight: 225, popoverWidth: 288, viewportWidth: 375 });
      const clampedLeft = 225 - narrow.right - Math.min(288, narrow.maxWidth ?? 288);
      assert.ok(narrow.right < 0, "it shifts RIGHTWARDS off its natural right-aligned position, because the ANCHOR is what is wrong — not the width");
      assert.ok(clampedLeft >= POPOVER_GUTTER - 0.001, `…far enough that the left edge lands on the gutter rather than off-screen (got ${clampedLeft})`);

      // A `max-width` ALONE would not have fixed it, and this is the assertion that says so: the
      // available rail (375-16=359) is WIDER than the popover (288), so a width cap never binds.
      assert.ok(288 < 375 - POPOVER_GUTTER * 2, "the popover already fits the rail — which is why capping its width could never have moved it back on screen");

      // Where it fits, nothing moves: right-edge anchoring is retained.
      const roomy = clampedPopover({ anchorRight: 1015, popoverWidth: 288, viewportWidth: 1280 });
      assert.equal(roomy.right, 0, "at 1280 the popover sits exactly where it always did — the clamp is a floor, not a re-layout");

      // An anchor hard against the RIGHT edge on a viewport too narrow for both: the second
      // clamp wins, because a popover pushed off the right would be cut by the same `clip`.
      const tight = clampedPopover({ anchorRight: 374, popoverWidth: 288, viewportWidth: 375 });
      assert.ok(374 - tight.right <= 375 - POPOVER_GUTTER + 0.001, "…and it is never pushed off the RIGHT edge to save the left one");

      // Unmeasured → no clamp. A host with no layout must get today's behaviour, not a fiction
      // computed from guesses.
      for (const input of [{}, { anchorRight: 225 }, { anchorRight: 225, popoverWidth: 288 }, { popoverWidth: 288, viewportWidth: 375 }]) {
        assert.deepEqual(clampedPopover(input), { right: 0, maxWidth: null }, `an unmeasured host (${JSON.stringify(input)}) gets the natural position, never a computed guess`);
      }
    },
  },

  // ── the raw value is marked as the operator's own input (F-47-V-5) ────────────────────────
  {
    name: "fleet-slot-and-picker/03 every empty body that carries the operator's RAW value points at it, every body that carries a resolved NAME does not, and no body text changed",
    async run() {
      // The `value` field is a POINTER INTO `body`, never a second copy — so the strings DESIGN
      // pins and the other suites assert byte-for-byte are untouched by the mono treatment.
      const raw = "not-a-real-workspace-id";
      const cases = [
        { what: "E3 · no payload yet", input: { scope: "global", repo: raw, workspaceId: null }, value: raw },
        { what: "E4 · unknown to the whole mesh", input: { scope: "global", repo: raw, workspaceId: null, resolved: null }, value: raw },
        { what: "E5 · out of scope", input: { scope: "local", repo: raw, workspaceId: "ws-1", resolved: null }, value: raw },
        { what: "E6 · known but quiet", input: { scope: "global", repo: "ws-1", workspaceId: null, resolved: "control" }, value: null },
        { what: "E7 · known, quiet, local", input: { scope: "local", repo: "ws-1", workspaceId: "ws-1", resolved: "control" }, value: null },
        { what: "E1 · no filter at all", input: { scope: "global" }, value: null },
        { what: "E2 · no filter, local", input: { scope: "local" }, value: null },
      ];
      for (const row of cases) {
        const copy = emptyStateCopy(row.input);
        assert.equal(copy.value, row.value, `${row.what}: the pointer names the operator's own input, or null when the sentence carries a NAME the product resolved`);
        if (row.value != null) {
          assert.ok(copy.body.includes(row.value), `${row.what}: …and the pointer actually points INTO the body — a pointer that missed would silently render nothing in mono`);
        }
      }
      // The resolved NAME is deliberately NOT marked: dressing the product's own word as an
      // identifier would misattribute it to the operator.
      const quiet = emptyStateCopy({ scope: "global", repo: "ws-1", workspaceId: null, resolved: "control" });
      assert.ok(quiet.body.includes("control"), "E6's body does carry the resolved name…");
      assert.equal(quiet.value, null, "…and still points at nothing, because a name is the product speaking");
    },
  },

  // ── Back/Forward re-narrows (F-47-V-1) — the @manual clause, migrated ─────────────────────
  {
    name: "fleet-slot-and-picker/04 the surface LISTENS for the browser's own history walk: Back and Forward re-narrow both ?repo= and ?scope=, and walking off the end does nothing",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        const CONTROL = "Per-folder integration descriptor";
        await withFleetApp({ url: fx.url, search: "?mode=fleet" }, async (app) => {
          // The subscription itself is asserted, not inferred from behaviour: this is the
          // difference between "Back happens to work" and "this surface listens for Back".
          assert.equal(app.window().listenerCount("popstate"), 1, "the surface subscribes to `popstate` exactly once — the listener whose ABSENCE was the whole defect");

          // Walk forward through three states the way an operator does: pick A, pick B, clear.
          await togglePicker(app);
          await (async () => { const rows = pickerRows(app.tree()); await rows.find((r) => r.text.includes("control")).node.props.onClick({ stopPropagation() {}, preventDefault() {} }); await app.flush(); })();
          assert.equal(triggerLabel(app.tree()), "control", "picking A narrows the view…");
          await togglePicker(app);
          await (async () => { const rows = pickerRows(app.tree()); await rows.find((r) => r.text.includes("portal")).node.props.onClick({ stopPropagation() {}, preventDefault() {} }); await app.flush(); })();
          assert.equal(triggerLabel(app.tree()), "portal", "…and picking B re-narrows it");

          // BACK. The address walks — that already worked — and the PAGE must walk with it. On
          // the shipped build this is where it stopped: the URL said A and the page said B.
          assert.equal(await app.back(), true, "Back moves the cursor");
          assert.match(app.address(), /repo=/, "…the address returns to the previous entry…");
          assert.equal(triggerLabel(app.tree()), "control", "…AND the page re-narrows to it. The defect: the URL moved and this did not.");
          assert.ok(bannerChips(app.tree()).some((chip) => chip.includes("control")), "the chip names what the address names — never the repo the operator has already left");

          assert.equal(await app.back(), true, "Back again, to the unfiltered start");
          assert.equal(triggerLabel(app.tree()), ALL_REPOS, "the page is unfiltered because the address is");

          // FORWARD walks them again, in order.
          assert.equal(await app.forward(), true, "Forward moves the cursor back down the stack");
          assert.equal(triggerLabel(app.tree()), "control", "…and the page follows it too — Forward is not a special case");

          // The END of the stack is not a wrap and not a throw.
          await app.back(); await app.back();
          assert.equal(await app.back(), false, "walking past the first entry does nothing at all — no wrap, no throw, no invented state");
          assert.equal(triggerLabel(app.tree()), ALL_REPOS, "…and the page is exactly where the first entry left it");
        });
      });
    },
  },
  {
    name: "fleet-slot-and-picker/05 the SAME listener serves the scope narrowing — the defect was never repo-only, and a repo-only fix would have left it in the control next door",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: "?mode=fleet&scope=local" }, async (app) => {
          const localChips = bannerChips(app.tree());
          assert.ok(localChips.some((chip) => chip.includes("Local")), "the view starts scope-narrowed, from the address");
          // Drive a scope change through the real control, then walk back.
          const globalBtn = (() => {
            const found = [];
            const walk = (n) => { if (n && typeof n === "object") { if (n.type === "button" && String(n.props?.title ?? n.props?.["aria-label"] ?? "").length >= 0) found.push(n); (n.children ?? []).forEach(walk); } };
            walk(app.tree());
            return found.find((n) => {
              const text = JSON.stringify(n.children ?? []);
              return text.includes("Global");
            });
          })();
          assert.ok(globalBtn, "the scope control is in the bar in every page state");
          await globalBtn.props.onClick({ stopPropagation() {}, preventDefault() {} });
          await app.flush();
          assert.equal(bannerChips(app.tree()).some((chip) => chip.includes("Local")), false, "switching to Global drops the scope chip");
          assert.equal(await app.back(), true, "Back after a SCOPE change…");
          assert.ok(bannerChips(app.tree()).some((chip) => chip.includes("Local")), "…restores the scope narrowing too. m45's control had the identical defect; one listener fixes both.");
        });
      });
    },
  },

  // ── the picker can be dismissed (F-47-V-12) and returns focus (F-47-V-15) ─────────────────
  {
    name: "fleet-slot-and-picker/06 the picker is DISMISSABLE: Escape closes it, a press outside closes it, and neither commits a filter the operator did not choose",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: "?mode=fleet" }, async (app) => {
          // ESCAPE. On the shipped build the key ARRIVED and was ignored — so this lane asserts
          // the outcome, not the wiring.
          await togglePicker(app);
          assert.equal(listboxOpen(app.tree()), true, "the picker opens");
          assert.equal(app.document().listenerCount("keydown") >= 1, true, "…and while open it owns a document-scoped key listener");
          const escape = await app.press("Escape");
          assert.equal(listboxOpen(app.tree()), false, "Escape CLOSES it — the clause DESIGN §a11y 1 states and the build did not implement");
          assert.equal(escape.defaultPrevented, true, "…and it consumes the key, so a dismissal does not also reach whatever else is listening");
          assert.equal(triggerLabel(app.tree()), ALL_REPOS, "dismissing commits nothing: the filter is exactly what it was before the picker opened");

          // A PRESS OUTSIDE. This is the half that made the finding a blocker rather than a
          // keyboard nicety — the shipped popover could not be dismissed by a MOUSE either.
          await togglePicker(app);
          assert.equal(listboxOpen(app.tree()), true, "the picker opens again");
          await app.pointerDownOutside();
          assert.equal(listboxOpen(app.tree()), false, "a press anywhere outside closes it — a control that overlays the page and cannot be dismissed is a trap");
          assert.equal(triggerLabel(app.tree()), ALL_REPOS, "…and it, too, commits nothing");

          // The listeners are attached ONLY while open: a closed picker must not swallow keys
          // belonging to anything else on the page.
          const idle = app.document().listenerCount("keydown");
          await togglePicker(app);
          assert.ok(app.document().listenerCount("keydown") > idle, "opening attaches the dismissal listeners…");
          await app.press("Escape");
          assert.equal(app.document().listenerCount("keydown"), idle, "…and closing takes them away again");
        });
      });
    },
  },
  {
    name: "fleet-slot-and-picker/07 the rows take a roving tabIndex and the arrows move it, so `Tab` LEAVES the list and the page underneath never scrolls",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: "?mode=fleet" }, async (app) => {
          await togglePicker(app);
          const tabbable = () => pickerRows(app.tree()).map((row) => row.node.props?.tabIndex);
          assert.equal(tabbable().filter((index) => index === 0).length, 1, "exactly ONE row is in the tab order at a time — otherwise `Tab` walks every workspace on the mesh, one press each");
          assert.equal(tabbable()[0], 0, "…and it starts on the current selection, which with no filter in force is `All repos`");

          // The listbox owns the arrows. On the shipped build it did not, and the keys fell
          // through to the document: `End` scrolled the fleet to 11418px while the popover
          // stayed pinned — the page moved under the operator.
          const listbox = (() => {
            const found = [];
            const walk = (n) => { if (n && typeof n === "object") { if (n.props?.role === "listbox") found.push(n); (n.children ?? []).forEach(walk); } };
            walk(app.tree());
            return found[0];
          })();
          assert.equal(typeof listbox.props.onKeyDown, "function", "the listbox owns a key handler rather than letting the document have the arrows");

          let prevented = false;
          const key = async (name) => {
            prevented = false;
            await listbox.props.onKeyDown({ key: name, preventDefault() { prevented = true; }, stopPropagation() {} });
            await app.flush();
          };
          await key("ArrowDown");
          assert.equal(prevented, true, "ArrowDown is CONSUMED — the missing `preventDefault` is what let the page scroll");
          assert.equal(tabbable()[1], 0, "…and the active row moves down one");
          await key("End");
          assert.equal(tabbable().at(-1), 0, "End reaches the last row");
          await key("Home");
          assert.equal(tabbable()[0], 0, "Home reaches the first");
          await key("ArrowUp");
          assert.equal(prevented, true, "ArrowUp at the TOP is still consumed — an arrow that stops moving must not start scrolling instead");
          assert.equal(tabbable()[0], 0, "…and the active row stays put rather than wrapping");
        });
      });
    },
  },

  // ── the two marks, and the recovery target (F-47-V-6, F-47-V-14) ──────────────────────────
  {
    name: "fleet-slot-and-picker/08 the `✦` and the `✓` are two marks in two columns — selecting `All repos` never costs that row its identity mark",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // Unfiltered, `All repos` IS the selection — the exact state in which the shipped build
        // swapped its `✦` for a `✓`, so the row lost its identity mark at the moment it gained
        // a state mark. Two facts were sharing one column.
        await withFleetApp({ url: fx.url, search: "?mode=fleet" }, async (app) => {
          await togglePicker(app);
          const first = pickerRows(app.tree())[0];
          assert.equal(first.selected, true, "with no filter in force the first row is the selected one");
          assert.ok(first.text.includes("✦"), "…and it STILL carries its `✦`: identity and state are two marks, not one slot taking turns");
          assert.ok(first.text.includes("✓"), "…with the selection mark in its own reserved trailing column");
        });
        // Filtered, the SAME row must keep the `✦` while no longer being selected — which is what
        // proves the mark is unconditional rather than merely present in one state.
        await withFleetApp({ url: fx.url, search: `?repo=${fx.workspaceIdA}` }, async (app) => {
          await togglePicker(app);
          const rows = pickerRows(app.tree());
          assert.equal(rows[0].selected, false, "with a filter in force `All repos` is no longer the selection…");
          assert.ok(rows[0].text.includes("✦"), "…and it keeps its `✦` regardless");
          // The reserved column means every row is the same shape whether selected or not, so
          // nothing shifts sideways as the selection moves.
          for (const row of rows) {
            assert.ok(row.text.includes("✓"), "every row reserves the selection column, so no row shifts when the selection moves between them");
          }
        });
      });
    },
  },
  {
    name: "fleet-slot-and-picker/09 the chip's inline clear is a >= 24x24 target that pays for itself out of its own padding, and still clears only the repo",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        await withFleetApp({ url: fx.url, search: `?scope=local&repo=${fx.workspaceIdA}` }, async (app) => {
          const clear = chipClear(app.tree());
          assert.ok(clear, "the mandatory inline clear is on the chip (DOOR ONE — a filter clearable only from inside a closed menu is a hidden affordance)");
          // MEASURED at 9.81 x 16 CSS px on the shipped build — 40% of the floor on its narrow
          // axis, the smallest target on the surface, and the one carrying the recovery. This
          // tree has no layout, so the SIZED BOX is what is asserted: an explicit square at or
          // above the 24px floor (`h-6 w-6` = 24px), taken from the button's own padding.
          const className = String(clear.props?.className ?? "");
          assert.match(className, /(^|\s)h-6(\s|$)/, "it declares an explicit height at the >= 24px floor (§a11y 7), rather than inheriting a 16px line box");
          assert.match(className, /(^|\s)w-6(\s|$)/, "…and an explicit width, rather than being as narrow as the glyph happens to be");
          assert.match(className, /-my-1/, "…and it pays for the growth from its OWN box, so the chip's height and the banner's rhythm are unchanged");
          assert.match(String(clear.props?.["aria-label"] ?? ""), /^Clear repo filter \(/, "its accessible name still says WHAT it clears, never a bare glyph");

          // The behaviour the bigger target must not have changed: it clears the REPO and leaves
          // the scope the operator chose (ADR-005).
          await clear.props.onClick({ stopPropagation() {}, preventDefault() {} });
          await app.flush();
          const chips = bannerChips(app.tree());
          assert.equal(chips.some((chip) => chip.includes("repo ·")), false, "clicking it clears the repo narrowing…");
          assert.ok(chips.some((chip) => chip.includes("Local")), "…and leaves the scope narrowing exactly where it was");
        });
      });
    },
  },
  {
    name: "fleet-slot-and-picker/10 the chip renders the value at full contrast in EVERY form, not only when it resolved",
    async run() {
      await withTwoWorkspaceAssignFixture(async (fx) => {
        // The committed mock draws the value semibold at full contrast even inside the dashed
        // box, and a11y 8 gives the reason: the BOX carries the absence, the VALUE carries the
        // meaning. The shipped build gave weight only to the `resolved` form.
        // THE VALUE'S OWN SPAN, addressed by the value it renders — NOT by "a descendant with
        // `font-semibold` somewhere under the chip row". The first cut of this lane did the
        // latter and stayed GREEN under its own mutation, because the scope chip's `Local` is
        // also semibold and sat under the same ancestor: the lane was reading the neighbour's
        // correctness as its own. It was caught by the mutation battery, which is the entire
        // reason this suite has one.
        // …and scoped to the BANNER, because the workspace card one region below renders the
        // same repo name and would be found first — the second way this lane could have read
        // some other element's correctness as its own.
        const valueSpanFor = (tree, value) => {
          const root = banner(tree);
          if (root == null) return null;
          const found = [];
          const walk = (n) => { if (n && typeof n === "object") { found.push(n); (n.children ?? []).forEach(walk); } };
          walk(root);
          return found.find((n) => n.type === "span"
            && (n.children ?? []).some((child) => typeof child === "string" && child === value)) ?? null;
        };
        for (const [what, search, value] of [
          ["resolved", `?repo=${fx.workspaceIdA}`, "control"],
          ["unknown to the whole mesh", "?repo=not-a-real-workspace-id", "not-a-real-workspace-id"],
          ["unresolvable under scope", "?scope=local&repo=not-a-real-workspace-id", "not-a-real-workspace-id"],
        ]) {
          await withFleetApp({ url: fx.url, search }, async (app) => {
            assert.ok(bannerChips(app.tree()).some((chip) => chip.includes("repo ·")), `${what}: the chip renders`);
            const span = valueSpanFor(app.tree(), value);
            assert.ok(span, `${what}: the value \`${value}\` is rendered in its own span rather than spliced into the sentence`);
            const className = String(span.props?.className ?? "");
            assert.match(className, /font-semibold/, `${what}: the value is at full WEIGHT — the box carries the absence, the value carries the meaning (a11y 8)`);
            assert.match(className, /text-foreground/, `${what}: …and at full CONTRAST, which is the half the shipped build gave only to the resolved form`);
          });
        }
      });
    },
  },
];
