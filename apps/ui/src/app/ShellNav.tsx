// THE SHELL'S NAVIGATION (milestone 45 / story 03; DESIGN §The navigation model, §Cross-origin
// honesty) — `<nav aria-label="Surfaces">` and the ONE probe that feeds it.
//
// CUT OUT OF Shell.tsx on 2026-09-12, and the cut is the one that file's own budget entry
// named ("the top bar and the nav are the two obvious cuts"): the shell sat at 929 of its
// 940-line ratchet, and DG-45-5's producer — the origin probe DESIGN deferred at m45's end
// gate and m47 carried as DG-47-6 — had to live somewhere. It lives with the nav it feeds.
// `Nav` and `NavLink` moved here unchanged; `useNavResolvable` is the new part.
//
// Everything rendered below is read off the nav model (shell-nav.mjs); this file chooses
// nothing. The probe's ASKING (`probeFleetOrigin`) and its TRANSLATION (`navResolvableFor`)
// are that module's too, so both are driven by node:test with no DOM — what is here is the
// React lifecycle around them: once per mount, cancelled on unmount, overridable by a prop.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  NAV_FORM_DISCLOSURE,
  navModel,
  navResolvableFor,
  probeFleetOrigin,
  type FleetOriginProbe,
  type NavItem,
  type NavResolvable,
} from "./shell-nav.mjs";

// useNavResolvable(override) — the per-destination resolvability the nav model takes.
//
// `override` is the Shell's `resolvable` prop: the test seam, and the door a future producer
// with a better fact walks through. Supplied, nothing is asked. Absent, THIS origin is asked
// once for its fleet-origin fact (`GET /api/fleet-origin`), and until it answers the two
// fleet-served items are UNKNOWN — held at their slot with no live `href` (PO ruling on QA
// F-45-03-C: "not yet known" is a state, never a link that may dead-end).
//
// The page's own origin is read here, in the component, because a `.mjs` module in this
// directory may not touch a browser global — the same split Home.tsx / session-mount.mjs make.
export function useNavResolvable(override?: NavResolvable): NavResolvable {
  const [probe, setProbe] = useState<FleetOriginProbe | null>(null);
  const selfOrigin = typeof window === "undefined" ? null : window.location.origin;

  useEffect(() => {
    if (override !== undefined) return undefined;
    let cancelled = false;
    void probeFleetOrigin(typeof fetch === "function" ? fetch : null).then((answer) => {
      if (!cancelled) setProbe(answer);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- asked once per mount, deliberately.
  }, []);

  return useMemo(() => override ?? navResolvableFor({ selfOrigin, probe }), [override, selfOrigin, probe]);
}

// `<nav aria-label="Surfaces">` — real `<a href>` links in a real landmark, never `<button>` +
// pushState: middle-click, Ctrl-click and "copy link address" must all work, and the entire
// milestone exists so that the address is worth copying. Everything below is read off the nav
// model; this component chooses nothing.
export function Nav({ nav }: { nav: ReturnType<typeof navModel> }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);

  if (nav.form === NAV_FORM_DISCLOSURE) {
    const disclosure = nav.disclosure!;
    return (
      <nav aria-label={nav.landmark.ariaLabel} className="relative -mb-px flex h-full items-center">
        <button
          ref={trigger}
          type="button"
          aria-haspopup={disclosure.ariaHasPopup}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            setOpen(false);
            trigger.current?.focus?.();
          }}
          className={disclosure.className}
        >
          <span>{disclosure.label}</span>
          <span className="text-muted-foreground" aria-hidden="true">
            {disclosure.caret}
          </span>
        </button>
        {open ? (
          <div role="menu" className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-card p-1 shadow-lg">
            {disclosure.items.map((item) => (
              <NavLink key={item.id} item={item} className="flex w-full items-center px-2 py-1.5 text-sm" />
            ))}
          </div>
        ) : null}
      </nav>
    );
  }

  return (
    <nav aria-label={nav.landmark.ariaLabel} className="-mb-px flex h-12 items-center gap-4">
      {nav.items.map((item) => (
        <NavLink key={item.id} item={item} className="flex h-12 items-center px-1 text-sm" />
      ))}
    </nav>
  );
}

// One nav item. An UNAVAILABLE destination is present, marked and explained — never a dead
// `href` that dead-ends here — and it stays FOCUSABLE (`tabIndex={0}`), because an item skipped
// by the keyboard hides its explanation from exactly the users who need it.
function NavLink({ item, className }: { item: NavItem; className: string }) {
  const shared = `${className} ${item.marking.className}`;
  if (item.href === null) {
    return (
      <span
        // Read off the MODEL, never retyped as a literal `"true"` here: `aria-disabled` is
        // reserved for UNAVAILABLE, and an item whose probe has not answered (UNKNOWN) also
        // has no `href` while being emphatically not disabled (PO ruling on QA F-45-03-C).
        // Hard-coding it here is precisely how the model's distinction stops being true of
        // the document.
        aria-disabled={item.ariaDisabled ?? undefined}
        tabIndex={0}
        title={item.title ?? undefined}
        data-nav-item={item.id}
        data-nav-availability={item.availability}
        className={shared}
      >
        {item.label}
      </span>
    );
  }
  return (
    <a
      href={item.href}
      aria-current={item.ariaCurrent ?? undefined}
      data-nav-item={item.id}
      data-nav-availability={item.availability}
      className={shared}
    >
      {item.label}
    </a>
  );
}
