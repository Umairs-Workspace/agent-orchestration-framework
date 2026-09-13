// A SURFACE MOUNTED THROUGH `withMountedApp`, FOR THE TWO CLAIMS THAT ONLY THAT HARNESS CAN MAKE
// (milestone 49 / story 08 / task 01, sections 4 and 5).
//
// 1 · REFS THAT BIND. `withMountedApp` built its renderer with NO `hostNode`, so `useRef` handed
//     back a `{ current }` nothing ever assigned and every `if (!ref.current) return;` early-
//     returned for the whole life of a mount — which is the exact guard the terminal control
//     opens its WebSocket behind. `createRuntime({ hostNode })` is OPT-IN by design and must stay
//     opt-in (mini-react says why: every existing harness mounts surfaces that pass refs they
//     never dereference, and a default-on factory would hand those surfaces an object where they
//     expect `null`). So the capability is asked for, and this surface is what asks.
//
// 2 · THE STUB BECOMES OPT-OUT. All three surface harnesses stub the control by module path,
//     `/(^|\/)TerminalControl$/`, for a measured reason — it alone pulls `@xterm/*`, which wants
//     a real DOM. This surface is mounted BOTH ways, in one lane, and the difference is the
//     proof: with the stub there is no pane host and no socket; without it there is one of each.
//     One half alone is satisfiable by accident.
//
// THE SPEC COMES FROM A GLOBAL, as `shell-harness-entry.tsx`'s does and for the same reason:
// `withMountedApp` mounts one exported component with NO props. Nothing is decided here — the
// host, the mount and the origins are the lane's, and this file adds no product behaviour.
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { TerminalControl } from "../../ui/src/terminal/TerminalControl";

type SurfaceSpec = {
  host?: string;
  mount?: unknown;
  origins?: unknown;
  // The ref probe's element, rendered or not. "A host element that leaves the tree has its ref
  // set back to `null`" is the other half of binding one, and it needs the element to leave.
  probe?: boolean;
  observe?: (event: { where: string; current: unknown }) => void;
};

function readSpec(): SurfaceSpec {
  return ((globalThis as Record<string, unknown>).__AOF_TERMINAL_SURFACE__ as SurfaceSpec) ?? {};
}

// A ref and an effect GUARDED ON IT — the shape the terminal control's session effect has, with
// nothing else in it. The effect reports what `ref.current` held at the moment it ran, so
// "the guarded effect ran rather than early-returning" is a fact the lane reads rather than one
// it infers from a side effect three modules away.
function RefProbe({ show, observe }: { show: boolean; observe: SurfaceSpec["observe"] }): React.ReactElement | null {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) {
      observe?.({ where: "effect-early-return", current: null });
      return;
    }
    observe?.({ where: "effect-ran", current: ref.current });
  }, [show, observe]);
  if (!show) return null;
  return <div ref={ref} data-probe="host" />;
}

export function TerminalSurface(): React.ReactElement {
  const spec = readSpec();
  // The probe's presence is STATE, with a control that flips it, because `withMountedApp` mounts
  // a propless component: the only way to make a host element LEAVE the tree — which is the other
  // half of "refs bind" — is a re-render the surface itself performs, the way an operator's click
  // would.
  const [probe, setProbe] = useState(spec.probe !== false);
  return (
    <div data-terminal-surface="">
      <button type="button" aria-label="toggle probe" onClick={() => setProbe((current) => !current)} />
      <RefProbe show={probe} observe={spec.observe} />
      {spec.mount == null ? null : (
        <TerminalControl
          host={spec.host as never}
          mount={spec.mount as never}
          origins={(spec.origins ?? {}) as never}
        />
      )}
    </div>
  );
}
