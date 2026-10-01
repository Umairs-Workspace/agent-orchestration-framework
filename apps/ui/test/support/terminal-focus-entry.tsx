// A HARNESS ENTRY FOR THE FOCUS MODEL AND FOR EVENT PROPAGATION (m49 / story 08 / task 01), and
// the SECOND entry the bundle cache is proved multi-valued against (task 00).
//
// WHY IT RENDERS NO TERMINAL. The two things it exists to observe are properties of the HARNESS,
// not of any component: that `focus()` moves a document-level `activeElement` and the previous
// holder loses it, and that one gesture dispatched at a descendant reaches its ancestors unless a
// handler stops it. Driving those through the terminal control would mean asserting the harness
// through a component that has its own opinions about focus — and the component's own keyboard
// behaviour is proved separately, at the SHIPPED drag separator, which is a known answer.
//
// IT IS ALSO ENTRY B. `bundleSurface` caches on `(entry, sorted stub names)`, a key that has been
// effectively single-valued for this harness since m46 because the entry was a module constant.
// A caller-supplied entry makes it genuinely multi-valued for the first time, and a collision
// would hand one lane another lane's component. This entry and `terminal-grid-entry.tsx` share
// the harness's stub set exactly and export different components, so a lane can mount both in one
// process and read back which tree it got.
//
// EVERY OBSERVATION IS REPORTED THROUGH A PROP THE CALLER PASSED. Nothing is recorded on a global
// and nothing is asserted here: the fixture says what happened, the lane says what should have.
import type * as React from "react";

export type FocusEvent = {
  where: string;
  type: string;
  key: string | null;
};

export function FocusFixture({
  showA = true,
  showB = true,
  stopAtDescendant = false,
  onEvent,
}: {
  showA?: boolean;
  showB?: boolean;
  // When true the DESCENDANT calls `stopPropagation()`. It is a prop rather than two fixtures
  // because the pair of rows is the whole assertion: the ancestor runs, or it does not, for one
  // gesture at one node with one handler changed.
  stopAtDescendant?: boolean;
  onEvent?: (event: FocusEvent) => void;
}): React.ReactElement {
  const record = (where: string, event: { type: string; key?: string }) => {
    onEvent?.({ where, type: event.type, key: event.key ?? null });
  };
  return (
    <div
      data-fixture="ancestor"
      onClick={(event: React.MouseEvent) => record("ancestor", event as unknown as { type: string })}
      onKeyDown={(event: React.KeyboardEvent) => record("ancestor", event as unknown as { type: string; key: string })}
    >
      {showA ? (
        <div
          data-fixture="a"
          tabIndex={0}
          onClick={(event: React.MouseEvent) => record("a", event as unknown as { type: string })}
          onKeyDown={(event: React.KeyboardEvent) => record("a", event as unknown as { type: string; key: string })}
        />
      ) : null}
      {showB ? (
        <div
          data-fixture="b"
          tabIndex={0}
          onClick={(event: React.MouseEvent) => record("b", event as unknown as { type: string })}
          onKeyDown={(event: React.KeyboardEvent) => record("b", event as unknown as { type: string; key: string })}
        />
      ) : null}
      <div
        data-fixture="descendant"
        onClick={(event: React.MouseEvent) => {
          record("descendant", event as unknown as { type: string });
          if (stopAtDescendant) event.stopPropagation();
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          record("descendant", event as unknown as { type: string; key: string });
          if (stopAtDescendant) event.stopPropagation();
        }}
      />
    </div>
  );
}
