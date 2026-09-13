// The mount entry for the REAL terminals home inside the REAL app shell (milestone 49 / story
// 04).
//
// THE FOURTH `shell-*-entry.tsx`, and ADR-001 required it by name: "the three shell harnesses
// gain a home entry or explicitly do not — TECH_DEBT 29's lesson binds: a surface tested only
// through a stub is untested". This is the entry that makes the home a REAL routed surface in a
// lane, rather than the harness's `data-stub-surface` stand-in.
//
// WHY IT HAS TO BE A THIRD COMPOSITION rather than mounting `<Home/>` alone (the same argument
// `shell-fleet-entry.tsx` records, and it applies here for one extra reason). The surface → shell
// channel's host flag is MODULE state (`ui/src/app/shell-bus.mjs`'s `shellPresent`, set by
// importing Shell.tsx), so two harnesses that each bundle one half each get their own copy of the
// bus and every clause about the JOIN is true in neither. The home's own G0 contribution — one
// summary line, present from the FIRST paint rather than once data arrives — is exactly such a
// clause. The extra reason: this story's headline is that `/` is now mounted THROUGH the shell's
// `SurfaceBoundary`, and a home mounted alone cannot observe a containment it is not inside.
//
// NOTHING IS STUBBED. The home imports no terminal control and no xterm in this story — it
// renders no session row at all (ARCHITECTURE bad cut 3: rows and sockets are ONE cut, and story
// 05 makes it) — so the bundle is the real shell, the real home and their real siblings.
import { Shell } from "../../ui/src/app/Shell";
import { Home } from "../../ui/src/home/Home";

type CompositionProps = Record<string, unknown>;

function readProps(): CompositionProps {
  return ((globalThis as Record<string, unknown>).__AOF_SHELL_PROPS__ as CompositionProps) ?? {};
}

export function ShellHomeHarness() {
  const props = readProps();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the lane's props are the shell's own, checked by tsc at every real call site.
  return <Shell {...(props as any)} surface={<Home />} />;
}
