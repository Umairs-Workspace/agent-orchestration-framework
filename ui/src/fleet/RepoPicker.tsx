import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type * as React from "react";
import type { GlobalWorkspace } from "./api";
import type { Scope } from "./scope.d.mts";
import { scopeLabel } from "./scope.mjs";
import { clampedPopover } from "./slot-aids.mjs";
import { relativeTime } from "../board/runs.mjs";

// The repo filter's CONTROL (milestone 47 / story 03; ARCHITECTURE ADR-007; DESIGN §Surface 1).
//
// A PRESENTATIONAL CHILD, and that is a decision ADR-001 makes explicitly rather than a
// convenience. "One home" means one LOGIC home, and the test for it is what a file EXPORTS:
// this file exports a COMPONENT and no narrowing vocabulary — no URL read, no URL write, no
// predicate, no resolution. It takes `{ value, label, form, options, onPick }` as props and
// imports nothing from the one home, which is the better shape (`ADR-001 [Feasibility-2]`:
// "requiring the import would push state down into the leaf, which is the opposite of what
// this ADR is protecting"). It is extracted rather than inlined because `Fleet.tsx` is 1,390
// lines against a 1,560 ratchet and `acd-ui-surface-file-budget`'s own remedy is this move.
//
// WHY A DISCLOSURE and not a segmented control or a text box (DESIGN §Surface 1): the option
// set is data-derived and unbounded — every workspace the payload carries — a segment can only
// express a closed set and would collide with the scope control's vocabulary, and a text input
// would ask the operator to type an opaque id they can only get by reading the page. It is the
// same shape the milestone switcher already is.
//
// WHY THE OPTIONS ARE THE PAYLOAD'S OWN WORKSPACES AND NOTHING ELSE: `assignableNodeOptions`'
// discipline one control over — no invented placeholder target, and an empty roster DISABLES
// rather than fabricates. A hidden control cannot explain itself; a disabled one with a `title`
// can. Note the options are the UN-narrowed roster on purpose: a picker fed the narrowed
// payload would offer exactly the repo already in force and could never be used to leave it.
//
// THE FIVE FORMS ARE DERIVED ONCE, AT THE SEAM, AND HANDED IN. This component decides nothing
// about what the filter MEANS; it renders the form it is told. That is what keeps the bar and
// the page (the banner's chip) from ever disagreeing — one derivation, two consumers.

// The repo narrowing's rendered form (DESIGN §Surface 1 "States" + §Surface 2's E3/E4/E5
// discrimination). The names are the empty-state rows they correspond to, so the two documents
// can be read against each other:
//   "none"         — no filter in force. The trigger reads `All repos`.
//   "unresolved"   — a filter is in force and NO payload has landed (E3). NEUTRAL, raw value:
//                    "not yet known is not not found" — a control that accused a valid filter
//                    of being unknown for the length of a round trip is the defect DG-47-3 is
//                    about, and it is the natural shape of a naive build.
//   "unknown"      — a payload that SAW THE WHOLE MESH carries no such row (E4). The ONE form
//                    that earns the house dashed absent/not-yet mark, because absence is a
//                    claim and only a view that could have observed the thing may make it.
//   "out-of-scope" — a SCOPE-NARROWED payload does not carry it (E5, ADR-010 clause 5).
//                    NEUTRAL, never dashed: a client served one workspace was not served the
//                    mesh and may not mark a value absent from a mesh it never saw.
//   "resolved"     — the payload carries it; the label is the workspace's name.
export type RepoFilterForm = "none" | "unresolved" | "unknown" | "out-of-scope" | "resolved";

// THE RESERVED WIDTH, STATED ONCE, AS A LITERAL THE CSS SCANNER CAN SEE (DESIGN §Surface 1, as
// amended 2026-08-11 at verify — F-47-V-4). Tailwind scans source TEXT, so the class has to
// appear here spelled out; a composed string would produce no CSS at all.
//
// A FIXED 150px SLOT AT >= 768, CONTENT-HUGGING AT <= 390. The fixed half is the first rule the
// committed baseline states (`mocks/README.md`): "The filter button occupies a fixed 150px slot
// in EVERY state, so no state change moves the scope control, the nav, or the bar." At 390 the
// mock deliberately hugs instead — 150px does not fit beside the scope control in a 358px band,
// and DG-47-4's two drops are what pay for that row.
//
// WHAT THIS REPLACES, AND WHY IT IS RECORDED RATHER THAN QUIETLY SWAPPED. The shipped pair was
// `min-w-[calc(9ch+1.375rem)] max-w-[18ch]`, and it failed in BOTH directions, measured on the
// live build:
//   - It was never a reserved slot. The trigger ran 82.0 -> 119.9px across four states at 1280
//     and MOVED THE SCOPE CONTROL'S LEFT EDGE BY 23.0px — the exact thing the reservation exists
//     to prevent, in the file whose comment claimed it was prevented.
//   - `max-w-[18ch]` computes to 119.918px as a BORDER-BOX maximum, so after `px-2.5` (20px),
//     the border (2px) and the `▾`, the label ceiling was ~11 characters rather than 18.
// The `min` had been corrected for border-box at m45 (GAP-4); the `max` had not. The comment
// three lines above it read "this bar does not get to learn that twice" — over a class that had
// already learned it once. A ceiling in `ch` cannot be border-box-correct without the same
// arithmetic the min carries, so the fix is one honest pixel width instead of two derived ones.
// THE <= SM CEILING IS `45vw`, AND THE FIT IS NOT THE CEILING'S JOB — `min-w-0` IS.
//
// [CORRECTED 2026-08-13 (verify pass 2), F-47-V-18 — and the correction is the point.] The
// ceiling above USED to be justified by this arithmetic, transcribed into this comment:
// "the content rail is 358px and the slot's other children are rigid — scope 105.2 + gap 12 +
// gap 12 + the two dropped aids 53 = 182.2 — so the trigger's budget is 175.8px, and 45vw =
// 175.5px at 390", recorded in STATE as "proved to bind ... one y-band, no overflow".
//
// Measured on the shipped build, it did not bind. The slot row is
// `Shell.tsx`'s `data-shell-slot="surface-bar"` span, whose gap is **`gap-4` = 16px**, not the
// 12px transcribed here — the 12px is the BAR's `gap-3`, one element up. Two gaps, eight pixels:
// the real residual is 358 − 105.23 − 32 − 53 = **167.77px**, so a 175.5px ceiling is 7.73px too
// generous. At the ceiling the row needed 365.73px in a 358px rail and, because that span is
// `flex-wrap`, it WRAPPED — 70px in two y-bands inside a fixed `h-10` (40px) `overflow: visible`
// bar, drawing across the top bar's rule above and into the content below. Every term in that
// derivation was measured except the one that was assumed, and the assumed one was the defect.
//
// SO THE FIX IS NOT A BETTER NUMBER. A ceiling can only ever be right for the occupants it was
// computed against, and it is recomputed by hand every time any of them changes — which is how
// this went wrong. `min-w-0` makes the trigger a genuinely shrinkable flex item, so the LAYOUT
// ENGINE does the arithmetic: the row's min-content now fits the rail at every width, the trigger
// takes whatever is left over, and the label truncates inside it (`truncate`, already on the
// label span). A row that can always fit cannot wrap, whatever the other occupants do — including
// occupants a later milestone adds, which no transcribed constant could have anticipated.
// `max-w-[45vw]` stays, demoted to what it honestly is: a SHARE cap so the trigger never eats
// half the bar when there IS room. It is no longer load-bearing for fit, and `acd-fleet-slot-fits`
// couples it to `Shell.tsx`'s real gap so a future edit to either fails loudly at the gate
// instead of silently in the chrome (ADR-014 Gate B's precedent).
//
// WHAT THIS REPLACED BEFORE THAT, AND WHY IT IS RECORDED RATHER THAN QUIETLY SWAPPED. The shipped
// pair was `min-w-[calc(9ch+1.375rem)] max-w-[18ch]`, and it failed in BOTH directions, measured
// on the live build: it was never a reserved slot (82.0 -> 119.9px across four states at 1280,
// moving the scope control's left edge by 23.0px), and `max-w-[18ch]` computed to 119.918px as a
// BORDER-BOX maximum, so the real label ceiling was ~11 characters rather than 18.
//
// THE FIXED SLOT BINDS AT `sm` (>=640), NOT `md` (>=768) — F-47-V-19. `mocks/README.md`'s first
// rule is a fixed 150px slot "so no state change moves the scope control, the nav, or the bar",
// and DESIGN pinned it at >=768 while §Render breakpoints records the desktop-app window as
// **760**x520. 760 < 768, so the rule never applied in the product's own window and the 23px
// state-change shift returned there. `sm` is a boundary this page already keeps (`px-4 sm:px-8`),
// so this introduces no new breakpoint, and it closes the 391-767 band the checklist never pinned.
// `w-full`, not `w-auto`, below `sm`: a `<button>`'s `width: auto` is SHRINK-TO-FIT, not fill, so
// with `auto` the button sized itself to its own content and clamped at `max-w-[45vw]` — ignoring
// the width the flex algorithm had already worked out for its wrapper, and overflowing it by the
// exact shortfall. `w-full` makes the button take the width its wrapper was given, so the wrapper
// hugs for short labels (its own basis is still the button's content) and the label truncates
// inside it for long ones. The hug the mock draws is preserved; the overflow is not.
export const REPO_TRIGGER_WIDTH = "w-full min-w-0 max-w-[45vw] sm:w-[150px] sm:min-w-[150px] sm:max-w-none";

// The label the trigger reads at rest — never blank, never a bare funnel glyph, never absent.
// "No filter" is a value the control STATES, not a state it expresses by silence.
export const ALL_REPOS = "All repos";

// `justify-between` pins the `▾` to the box's RIGHT EDGE (F-47-V-20). Without it the caret
// tracked the label at a constant 8px gap and sat 11 / 73.09 / 103.63px from the box's right edge
// across `willow-shield-portal` / `All repos` / `aof` — so a correctly reserved 150px slot still
// read as a wide button whose glyph wandered. `mocks/design-source.html:54` draws
// `justify-content: space-between`; the box itself was already right (width 150.00 and `right`
// 1029.97 identical in all three states), so this is the caret inside a correct slot, not the slot.
const TRIGGER_BASE =
  "flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1 text-xs font-medium transition";

// The trigger's per-form skin. The filtered form adds WEIGHT and nothing else — there is still
// exactly ONE filled teal block in the bar and it is the active scope segment (DESIGN §The
// two-narrowings ruling 2: a second fill would read as a second scope switch).
function triggerSkin(form: RepoFilterForm, disabled: boolean): string {
  if (disabled) return `${TRIGGER_BASE} border-border text-muted-foreground/60`;
  if (form === "unknown") return `${TRIGGER_BASE} border-dashed border-muted-foreground/40 text-muted-foreground`;
  if (form === "none") return `${TRIGGER_BASE} border-border text-foreground hover:border-primary/50`;
  return `${TRIGGER_BASE} border-border font-semibold text-foreground hover:border-primary/50`;
}

export function RepoPicker({
  value,
  label,
  form,
  options,
  onPick,
}: {
  // The RAW requested value, or null for no filter. It is what a row is marked selected
  // against — never the resolved name, which two workspaces can share.
  value: string | null;
  // What the trigger reads: `All repos`, the resolved workspace name, or the raw value.
  label: string;
  form: RepoFilterForm;
  // The payload's own workspaces, in the payload's own order. Never a fabricated row.
  options: GlobalWorkspace[];
  onPick: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  // An EMPTY roster disables the trigger rather than hiding it or offering an invented target.
  // `aria-disabled` and NOT the `disabled` attribute, deliberately: DESIGN requires it to stay
  // FOCUSABLE, because an element the keyboard skips hides its explanation from exactly the
  // users who need it.
  const disabled = options.length === 0;

  // CLOSING IS ONE ACT, NOT THREE (F-47-V-12, F-47-V-15). Every dismissal path — `Esc`, a click
  // away, focus leaving, picking a row — closes AND returns focus to the trigger, because those
  // are one behaviour and splitting them is how the shipped build ended up with a picker that
  // could be opened and not closed. `focus()` is guarded: the headless harness's tree has
  // elements without DOM methods, and a control must not throw in a host that cannot focus.
  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus?.();
  }, []);

  // THE DISMISSAL CONTRACT. Measured on the shipped build, the popover could not be dismissed at
  // all: `Escape` arrived and was ignored, an outside click was ignored, and tabbing out left it
  // mounted. The only ways out were re-toggling the trigger or committing to a row — so a mouse
  // operator who opened it and changed their mind had no way back. That is why this is not
  // filed as a keyboard nicety: a control that overlays the page and cannot be dismissed is a
  // trap, and at 390 it is a trap that also covers what is under it.
  //
  // `pointerdown`, not `click`: dismissal should happen when the operator commits to pressing
  // elsewhere, and a `click` listener never fires if the press lands on something that unmounts.
  // Both listeners are DOCUMENT-scoped because the point is that they work wherever the press or
  // the key lands — the same reasoning the shell states for its own `Escape` owner — and they
  // are attached ONLY while open, so a closed picker costs nothing and cannot swallow a key.
  useEffect(() => {
    if (!open) return undefined;
    const view = typeof window === "undefined" ? undefined : window;
    const doc = view?.document;
    if (!doc?.addEventListener) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      const container = containerRef.current;
      // A press INSIDE the control is the control's own business — the trigger toggles, a row
      // picks. Only a press genuinely outside dismisses, and it does NOT steal focus back to the
      // trigger: the operator is on their way somewhere else and yanking focus would fight them.
      if (container && target && typeof container.contains === "function" && container.contains(target)) return;
      close(false);
    };
    doc.addEventListener("keydown", onKeyDown);
    doc.addEventListener("pointerdown", onPointerDown);
    return () => {
      doc.removeEventListener("keydown", onKeyDown);
      doc.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  // THE CLAMP (F-47-V-3). The popover is right-anchored to the trigger, which at 390 put its left
  // edge at x = -62.9 — and the page root is `overflow-x: clip`, so the overflow was not scrolled
  // to but silently CUT: every repo name lost its head, in the one control whose whole job is
  // choosing a repo. The arithmetic lives in `slot-aids.mjs` so it is executable; this effect
  // only supplies the three measurements and applies the answer.
  //
  // `useLayoutEffect` rather than `useEffect`: the shift must land in the same frame the popover
  // paints, or it visibly jumps. It degrades silently in any host without layout — `clampedPopover`
  // answers "no clamp" when a measurement is missing, which is exactly today's 1280 behaviour.
  const [anchor, setAnchor] = useState<{ right: number; maxWidth: number | null }>({ right: 0, maxWidth: null });
  useLayoutEffect(() => {
    if (!open) return;
    const view = typeof window === "undefined" ? undefined : window;
    const container = containerRef.current;
    const popover = popoverRef.current;
    if (!view || typeof container?.getBoundingClientRect !== "function" || typeof popover?.getBoundingClientRect !== "function") return;
    setAnchor(clampedPopover({
      anchorRight: container.getBoundingClientRect().right,
      popoverWidth: popover.getBoundingClientRect().width,
      viewportWidth: view.innerWidth,
    }));
  }, [open, options.length]);
  const title = disabled ? "No workspaces have published to this mesh yet" : label;
  // A value in `mono` wherever it is the RAW id rather than a name — the id is opaque and the
  // one thing an operator may need to spot a typo in.
  const raw = form === "unresolved" || form === "unknown" || form === "out-of-scope";

  // ROVING FOCUS OVER THE ROWS (F-47-V-13). Built as shipped, the rows were ordinary tabbable
  // buttons and the arrow keys did nothing to them — worse than nothing, in fact: the keys fell
  // through to the document and SCROLLED THE FLEET BEHIND THE OPEN PICKER, with `End` taking the
  // page to 11418px while the popover stayed pinned. The page moved under the operator.
  //
  // The fix is the ordinary listbox model, and it buys three things at once: the arrows move the
  // active row, `preventDefault` stops the page scrolling, and a roving `tabIndex` means `Tab`
  // LEAVES the list (which, with the focus-out handler below, also closes it) instead of walking
  // seven rows one at a time.
  const rowCount = options.length + 1;                       // `All repos` + one row per workspace
  const selectedIndex = value == null ? 0 : Math.max(0, options.findIndex((w) => w.workspaceId === value) + 1);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Opening puts the active row ON the current selection, not at the top: the operator's mental
  // starting point is what the filter is set to now.
  useEffect(() => { if (open) setActiveIndex(selectedIndex); }, [open, selectedIndex]);
  useEffect(() => { if (open) rowRefs.current[activeIndex]?.focus?.(); }, [open, activeIndex]);

  const onListKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowDown: activeIndex + 1, ArrowUp: activeIndex - 1, Home: 0, End: rowCount - 1 };
    const next = moves[event.key];
    if (next === undefined) return;
    // ALWAYS `preventDefault`, including at the ends — an ArrowDown on the last row must not fall
    // through and scroll the page just because the selection cannot move further.
    event.preventDefault();
    setActiveIndex(Math.min(rowCount - 1, Math.max(0, next)));
  };

  return (
    // `min-w-0` on the WRAPPER, not only on the button (F-47-V-18). This span — not the button —
    // is the slot's direct flex child, so it is the one whose `min-width: auto` decides whether
    // the trigger may yield at all. With the ceiling on the button and `auto` here, the shrink
    // stopped one element short of the thing it was meant to shrink.
    <span className="relative min-w-0" ref={containerRef as React.RefObject<HTMLSpanElement>}>
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled ? true : undefined}
        // The accessible name says BOTH what it filters and what it is set to — never a bare
        // `▾`, and never a name that is only the value (DESIGN §Surface 1's S1-B).
        aria-label={`Filter by repo (${label})`}
        title={title}
        onClick={() => { if (disabled) return; if (open) close(); else setOpen(true); }}
        className={`${triggerSkin(form, disabled)} ${REPO_TRIGGER_WIDTH}`}
      >
        {/* `flex-1 min-w-0` is what makes the label the element that YIELDS: it takes the slot's
            spare width, and truncates inside it rather than pushing the `▾` off the right edge or
            forcing the row wider than the rail (F-47-V-18/20). */}
        <span className={`min-w-0 flex-1 truncate text-left ${raw ? "mono" : ""}`}>{label}</span>
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">▾</span>
      </button>
      {open && !disabled ? (
        <span
          role="listbox"
          ref={popoverRef as React.RefObject<HTMLSpanElement>}
          onKeyDown={onListKeyDown}
          // Tabbing out of the list closes it. Without this the popover stayed mounted over the
          // page while focus was somewhere else entirely — a floating panel belonging to nothing.
          onBlur={(event: React.FocusEvent) => {
            const next = event.relatedTarget as Node | null;
            const container = containerRef.current;
            if (next && container && typeof container.contains === "function" && container.contains(next)) return;
            close(false);
          }}
          style={anchor.right !== 0 || anchor.maxWidth != null
            ? { right: `${anchor.right}px`, maxWidth: anchor.maxWidth == null ? undefined : `${anchor.maxWidth}px` }
            : undefined}
          className="absolute right-0 top-full z-20 mt-1 block max-h-[60vh] w-72 overflow-y-auto rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-md"
        >
          {/* `All repos` is the FIRST row, above a separator, and is present whatever else is —
              the switcher's own `All milestones` precedent, and the SECOND of the filter's two
              clear doors. It is not sufficient on its own (a filter clearable only from inside
              a closed menu is a hidden affordance), which is why the banner's chip carries the
              first one. */}
          <PickerRow
            rowRef={(node) => { rowRefs.current[0] = node; }}
            active={activeIndex === 0}
            selected={value == null}
            label={ALL_REPOS}
            hint="full fleet"
            mark="✦"
            onPick={() => { close(); onPick(null); }}
          />
          <span className="my-1 block border-t border-border" aria-hidden="true" />
          {options.map((workspace, index) => (
            <PickerRow
              key={workspace.workspaceId}
              rowRef={(node) => { rowRefs.current[index + 1] = node; }}
              active={activeIndex === index + 1}
              selected={value === workspace.workspaceId}
              label={workspace.name ?? workspace.workspaceId}
              // The `projectRoot` is on the row for one measured reason: two workspaces may
              // share a `name`, and this is the only place the page tells them apart before
              // the operator commits to one.
              path={workspace.projectRoot}
              meshEnabled={workspace.meshEnabled}
              onPick={() => { close(); onPick(workspace.workspaceId); }}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}

// One row of the listbox. The selected row carries THREE signals and colour is the last of
// them: a `✓` glyph (shape), `font-semibold` (weight) and only then the `bg-primary/10` tint —
// the same "never colour alone" discipline the run-state chip already keeps.
//
// THE `✦` AND THE `✓` ARE TWO MARKS IN TWO COLUMNS (F-47-V-6, DESIGN §S1-C as amended). Built as
// shipped they shared one leading slot and the `✓` REPLACED the `✦`, so selecting `All repos`
// cost that row its identity mark at exactly the moment it gained a state mark — two different
// facts taking turns in one column. The `✦` now always leads, and the selection mark lives in a
// RESERVED trailing column that is rendered transparent rather than absent when unselected, so
// no row shifts sideways as the selection moves between rows.
// The row's node comes back through `rowRef`, a PLAIN CALLBACK PROP rather than `forwardRef`.
// That is deliberate and it is not a workaround: the headless harness renders this tree against
// a minimal React stub, `forwardRef` is not part of it, and a component that can only mount in a
// real DOM is a component the milestone's own lanes cannot drive. A named prop costs one line
// and keeps the roving-focus model testable in the place the defect was found.
function PickerRow({
  active,
  selected,
  label,
  hint,
  path,
  mark,
  meshEnabled,
  onPick,
  rowRef,
}: {
  active: boolean;
  selected: boolean;
  label: string;
  hint?: string;
  path?: string;
  mark?: string;
  meshEnabled?: boolean | null;
  onPick: () => void;
  rowRef?: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      type="button"
      ref={rowRef}
      role="option"
      aria-selected={selected}
      // ROVING TABINDEX: exactly one row is in the tab order at a time, so `Tab` leaves the
      // listbox rather than walking every workspace on the mesh one press at a time.
      tabIndex={active ? 0 : -1}
      onClick={onPick}
      title={path ?? label}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition hover:bg-muted ${selected ? "bg-primary/10 text-foreground" : ""}`}
    >
      <span className="w-3 shrink-0 text-center" aria-hidden="true">{mark ?? ""}</span>
      {mark ? null : (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${meshEnabled ? "bg-primary" : "border border-muted-foreground/50"}`}
          aria-hidden="true"
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate ${selected ? "font-semibold" : ""}`}>{label}</span>
        {path ? <span className="mono truncate text-[11px] text-muted-foreground">{path}</span> : null}
      </span>
      {hint ? <span className="shrink-0 text-muted-foreground">{hint}</span> : null}
      {/* The reserved trailing column — always occupied, so the row's geometry is the same
          whether it is the selected one or not. `aria-hidden` because `aria-selected` on the
          option already carries the fact to assistive tech; this is the SHAPE half of the
          three signals, for the eye. */}
      <span className={`w-3 shrink-0 text-center ${selected ? "" : "opacity-0"}`} aria-hidden="true">✓</span>
    </button>
  );
}

// ═══════════════════════════════════ the other two narrowing CONTROLS (2026-09-11) ═
//
// Both moved/added here rather than into `Fleet.tsx`, for the reason this file's own header
// states: `Fleet.tsx` sits 17 lines under its 1,560 ratchet and `acd-ui-directory-budget` caps
// `ui/src/fleet/` at its current 20 files, so the next region can be neither a new line there
// nor a new sibling here. This file is already the narrowing controls' presentational home —
// the repo picker — and a scope toggle and a status select are the same kind of thing: a
// control that renders the form it is told and decides nothing about what the narrowing MEANS.
// Neither exports narrowing vocabulary (the one-home gate's test); `ScopeControl` reads the
// one label helper, which is a string, not a decision.

// The scope control (DESIGN "Scope control: shows Global as the active scope and
// exposes a clear local/current-workspace option" / "--local: shows Local as
// active"). A two-way toggle, ALWAYS both options visible (never a hidden
// dropdown) so the operator can never mistake which scope is active — colour AND
// label travel together, mirroring the run-state chip's own "never colour alone"
// discipline.
// `shrink-0` (F-47-V-18): DG-47-4 protects BOTH narrowings in full at every width — the scope
// control never yields, so under the slot's `flex-nowrap` it must say so rather than leave the
// browser to distribute the shortfall across whatever happens to be shrinkable.
export function ScopeControl({ scope, onScopeChange }: { scope: Scope; onScopeChange: (next: Scope) => void }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted p-0.5 text-xs" role="group" aria-label="Scope">
      {(["global", "local"] as const).map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-pressed={scope === candidate}
          onClick={() => onScopeChange(candidate)}
          className={`rounded px-2 py-1 font-semibold transition ${
            scope === candidate
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          {scopeLabel(candidate)}
        </button>
      ))}
    </span>
  );
}

// The work-status control — which milestones the page shows, by status, defaulting to OPEN
// work (operator request, 2026-09-11: 158 milestones on the live mesh, 123 of them done, and
// the page read as history). A NATIVE `<select>`, deliberately, where the repo picker is a
// custom listbox: the option set here is CLOSED and seven long, every option is a word the
// operator already knows, and a native control gets keyboard, type-ahead and the platform's
// own popover for free — the custom listbox exists because the repo set is unbounded and
// data-derived, and neither reason applies here. Options and the selected value are handed
// in; this component neither reads the address nor knows what "open" admits.
export const WORK_STATUS_CONTROL_LABEL = "Show work by status";

export function WorkStatusPicker({
  value,
  options,
  onPick,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onPick: (next: string) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span>Show</span>
      <select
        aria-label={WORK_STATUS_CONTROL_LABEL}
        value={value}
        onChange={(event) => onPick(event.target.value)}
        className="h-7 rounded-md border border-border bg-muted px-1.5 text-xs font-semibold text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

// The workspaces summary (DESIGN "lists mesh-enabled workspaces known to the
// global store, with status/freshness").
//
// DESIGN GAP D1 (review fix) — a long `projectRoot` path's INTRINSIC content
// width can exceed its grid track even with `truncate` set, because a grid/flex
// item's default `min-width` is `auto` (its content), not `0`; `truncate` alone
// only takes effect once `min-width:0` lets the box actually shrink below that
// content width. `min-w-0` on the card is what makes the pre-existing `truncate`
// genuinely clip a long path instead of forcing the grid — and the page — wider.
// Each card is a BUTTON into the repo narrowing (2026-09-11): clicking a workspace narrows the
// page to its work through the SAME `onRepoChange` the picker uses — a second door, not a
// second filter — and clicking the one already in force clears it. `aria-pressed` carries the
// state to assistive tech; the banner chip and the picker say the same thing in words.
// Moved here from `Fleet.tsx` (2026-09-11) for the reason the section above states; the region
// header is handed in as a node so `RegionHeader` and `countPhrase` keep their one home there.
export function WorkspacesSummary({ workspaces, header, repo, onPick }: { workspaces: GlobalWorkspace[]; header: React.ReactNode; repo: string | null; onPick: (next: string | null) => void }) {
  return (
    <section className="flex min-w-0 flex-col gap-3.5">
      {header}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
        {workspaces.map((workspace) => (
          <button
            key={workspace.workspaceId}
            type="button"
            aria-pressed={repo === workspace.workspaceId}
            title={repo === workspace.workspaceId ? "Show every workspace's work" : "Show only this workspace's work"}
            onClick={() => onPick(repo === workspace.workspaceId ? null : workspace.workspaceId)}
            className={`flex min-w-0 flex-col gap-1.5 rounded-lg border bg-card px-4 py-3.5 text-left shadow-sm transition hover:border-primary/60 ${repo === workspace.workspaceId ? "border-primary" : "border-border"}`}
          >
            <span className="truncate text-[13px] font-bold text-foreground">{workspace.name ?? workspace.workspaceId}</span>
            <span className="mono truncate text-[11px] text-muted-foreground" title={workspace.projectRoot}>{workspace.projectRoot}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${workspace.meshEnabled ? "bg-primary" : "border border-muted-foreground/50"}`} aria-hidden="true" />
              {workspace.meshEnabled ? "mesh enabled" : "not propagating"}
              {workspace.lastPublishedAt ? ` · ${relativeTime(workspace.lastPublishedAt)}` : ""}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
