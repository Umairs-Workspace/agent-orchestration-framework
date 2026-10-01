import { scopeLabel, emptyStateCopy } from "./scope.mjs";
import type { Scope } from "./scope.d.mts";

// THE FLEET'S WHOLE-PAGE STATES — loading, error and empty — extracted from Fleet.tsx by
// milestone 47 / story 03 (ADR-001 [Feasibility-2]; acd-ui-surface-file-budget), for the
// reason stated at the head of ./AssignmentChip.tsx and under the same two rules: the ceiling
// may not be met by raising the number (that needs an ADR, not a diff) and may not be met by
// trimming rationale (ADR-014/E3), so it is met by a sibling component with a prop boundary.
//
// THEY MOVED AS A GROUP because they are one thing: the three branches of the page's state
// ternary that are NOT the region column. The fourth branch, `GlobalScopeView`, stays in
// Fleet.tsx — it is the region fan-out ADR-004's seam feeds, and two committed gates slice it
// out of that file.
//
// NOTHING HERE DECIDES A STATE. `pageState` (the ONE selector, ./scope.mjs) chooses which of
// them renders and `emptyStateCopy` chooses which sentence the empty one says; these
// components render what they are handed. That is what keeps the five empty conditions
// drivable by `node:test` through the module rather than through a React harness this repo
// does not have.

// milestone 34 / story 03 (task 02 scenario 4) — the loading state reserves the
// SAME region layout the populated global view uses (workspace summary / milestones /
// node panel / diagnostics), so nothing reflows when data arrives and no
// text overlaps at a 360px viewport (each placeholder is a fixed-height block, not
// text that could wrap unpredictably). The scope control itself lives in the
// TopBar (always mounted, task 02 scenario 4's "the scope control region is
// visible" — true even here, one level up from this body).
export function LoadingState() {
  return (
    <div className="flex-1 px-4 py-7 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8">
        <RegionPlaceholder label="Workspaces" />
        <RegionPlaceholder label="Milestones" />
        <RegionPlaceholder label="Nodes" />
        <RegionPlaceholder label="Diagnostics" />
      </div>
    </div>
  );
}

export function RegionPlaceholder({ label }: { label: string }) {
  return (
    <section className="flex flex-col gap-2" aria-busy="true" aria-label={`Loading ${label}`}>
      <span className="h-3 w-24 animate-pulse rounded bg-muted" aria-hidden="true" />
      <span className="h-16 w-full animate-pulse rounded-lg border border-border bg-card/40" aria-hidden="true" />
    </section>
  );
}

// A PAGE-level failure to reach the mesh (distinct from a stale node, which is
// normal rendered degradation) — an accent pill + Retry. milestone 34 / story 03
// (task 03 scenario 2) — a global-store-unavailable error names the global mesh
// PATH so the operator knows exactly which file to inspect, and Retry keeps the
// CURRENT scope (never silently falling back to the other scope). review fix
// P0.5: `path` is passed down ALREADY resolved (Fleet.tsx's errorPathFor call) —
// this component only renders it, it does not re-derive it from `status` (which is
// null on a first-load failure and so was never a reliable source on its own).
export function ErrorState({ message, path, scope, onRetry }: { message: string; path: string | null; scope: Scope; onRetry: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">
          <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground" aria-hidden="true">!</span>
          Could not load the mesh: {message}
        </div>
        {path ? (
          <p className="mono text-[11px] text-muted-foreground">Global mesh store: {path}</p>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          ⟳ Retry {scopeLabel(scope)}
        </button>
      </div>
    </div>
  );
}

// Empty fleet — a centered dashed placeholder, NOT an error (mirrors the CLI's "No
// nodes in the mesh roster."). milestone 34 / story 03 (task 03 scenario 1) — the
// GLOBAL empty copy explains that no mesh-enabled workspace has published yet
// (never "broken"/"failed"); the LOCAL empty copy keeps the pre-existing
// enrol-a-node guidance, unchanged.
// milestone 47 / story 02 (ADR-007) — CALL-SITE ADAPTATION ONLY. `emptyStateCopy`
// grew from `(scope) => string` to `(narrowings) => { heading, body }` in the same
// window this story ran, because DESIGN pins a heading AND a body per filtered
// state and the heading used to be inline JSX right here (two homes for one fact).
// This file's call is updated to the new shape and NOTHING else: passing `{ scope }`
// with no `repo` returns byte-identically the two strings this component rendered
// before. Wiring the repo narrowing into it is 47/03's, not this story's.
// milestone 47 / story 03 (DG-47-3; ADR-007/009/010) — FIVE DISTINGUISHABLE CONDITIONS, ONE
// CARD PRIMITIVE. The box never changes: E1–E7 differ in their words, in whether the value on
// screen is a NAME or the RAW id, and in their recovery control. Which sentence is a pure
// function of the narrowings in force, and the narrowings are read off the PAYLOAD — this
// component invents no copy and decides no case.
//
// NONE OF THEM IS DRESSED AS A FAILURE. Three of the five are produced by the operator's own
// filter and the other two by a quiet mesh; the card keeps the calm dashed primitive it has
// always had, and the ERROR state stays visibly different (its `accent` pill, its `!` mark, the
// mesh path and `⟳ Retry <Scope>`). Dressing one of these as an error teaches an operator to
// distrust their own address bar.
export function EmptyFleet({
  scope,
  narrowings,
  onClearRepo,
}: {
  scope: Scope;
  narrowings: { scope: Scope; workspaceId: string | null; repo: string | null; resolved: string | null | undefined };
  onClearRepo: () => void;
}) {
  const copy = emptyStateCopy(narrowings);
  const filtered = narrowings.repo != null;
  // `Show all repos` is promoted in E4–E7 and ABSENT in E1–E3, each for its own stated reason.
  // E3 is the one that reads like an omission and is not: in that state the FILTER is not why
  // the page is empty (no payload has arrived), so the control would name a false cause — and
  // taking it would land the operator on a LESS honest page. The operator is not stranded: the
  // picker and the ⟳ refresh are in the bar in every page state.
  const recovery = filtered && narrowings.resolved !== undefined;
  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-8 py-9 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-dashed border-muted-foreground/40 text-xl text-muted-foreground" aria-hidden="true">✦</span>
        <span className="text-[15px] font-semibold text-foreground">{copy.heading}</span>
        {/* THE OPERATOR'S OWN VALUE RENDERS IN `mono`, INSIDE THE SENTENCE (F-47-V-5; DESIGN
            §E-table as amended 2026-08-11). The chip and the trigger both marked the raw value
            as an identifier and the body — the one place it is read at full size — rendered it
            in the prose face, so at 390 it even broke mid-token across two lines. The mono face
            is what says "this is the string YOU typed", which is what an operator hunting their
            own typo needs. `copy.value` is a pointer into `copy.body` rather than a second copy
            of it, so the sentence DESIGN pins stays byte-identical and this stays presentation. */}
        <span className="text-[12.5px] leading-relaxed text-muted-foreground">
          <BodyWithValue body={copy.body} value={copy.value} />
        </span>
        {recovery ? (
          // The existing recovery-button ramp, `⟳ Retry`'s own — a way forward, not an apology.
          // It clears ONLY the repo narrowing: the scope the operator chose survives (ADR-005),
          // because a recovery that also reset it would silently widen the view past what they
          // asked for and they would have no way to tell which of their two narrowings the page
          // had just discarded.
          <button
            type="button"
            onClick={onClearRepo}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            Show all repos
          </button>
        ) : filtered ? null : scope === "local" ? (
          <span className="flex w-full flex-col gap-2">
            <span className="mono rounded-md border border-border bg-muted px-3 py-2 text-left text-[11.5px] text-muted-foreground">aof mesh invite</span>
            <span className="mono rounded-md border border-border bg-muted px-3 py-2 text-left text-[11.5px] text-muted-foreground">aof mesh join</span>
          </span>
        ) : (
          <span className="flex w-full flex-col gap-2">
            <span className="mono rounded-md border border-border bg-muted px-3 py-2 text-left text-[11.5px] text-muted-foreground">config.mesh.enabled: true</span>
          </span>
        )}
      </div>
    </div>
  );
}

// The empty-state body, with the operator's own raw value marked as an identifier rather than
// as prose (F-47-V-5). Splits on the FIRST occurrence only: the value appears once in every
// body DESIGN pins, and a global split would also re-face any incidental substring match — a
// one-character filter like `a` would otherwise turn half the sentence monospace.
//
// `value == null` (E1/E2, and E6/E7's resolved NAME) renders the body untouched, which is the
// whole point of the field being a pointer rather than a flag: the sentence is the same string
// either way and only its presentation differs.
function BodyWithValue({ body, value }: { body: string; value: string | null }) {
  if (!value) return <>{body}</>;
  const at = body.indexOf(value);
  if (at < 0) return <>{body}</>;
  return (
    <>
      {body.slice(0, at)}
      <span className="mono">{value}</span>
      {body.slice(at + value.length)}
    </>
  );
}
