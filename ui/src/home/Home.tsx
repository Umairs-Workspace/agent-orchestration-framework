// THE TERMINALS HOME (milestone 49 / story 04; ADR-001; DESIGN §S1 and DG-49-1).
//
// `/` stops being a card the shell draws itself and becomes a surface the shell HOSTS. What
// that buys, for free and by construction, is `SurfaceBoundary`'s crash containment: the
// shell-rendered path sits OUTSIDE it (Shell.tsx's `<main>` ternary short-circuited ahead of
// the boundary), and one static card is safe there while a surface that fetches, polls every
// five seconds and — from story 05 — holds up to sixteen sockets is not. A throw in this
// component takes down this component; m45's finding F-45-M-1 is the whole reason the net
// exists, and its own comment names milestone 49 as the surface it was built for.
//
// WHAT THIS FILE IS, AND WHAT IT DELIBERATELY IS NOT. It is the THIN consumer ADR-001's
// invariant asks for: JSX, one fetch, one poll, and nothing else. Every DECISION — which of the
// five page states this payload is in, which sentence each empty state says, how many runs are
// in flight, what the surface-slot summary reads, which fault the failed state names — lives in
// ./page-state.mjs, which plain `node:test` imports. This repo has no React test harness for
// logic, and TECH_DEBT 29 measured what a decision in JSX costs: milestone 46 shipped its
// headline connecting to nothing past 537 green tests, because every harness stubbed the thing.
//
// IT RENDERS NO SESSION ROW, DELIBERATELY. ARCHITECTURE bad cut 3 forbids splitting "the grid
// renders rows" from "panes open sockets" — that split is what re-creates TECH_DEBT 29 — so
// rows and sockets arrive TOGETHER in story 05. What lands here is the route and the page's own
// states, which have no panes in them by definition. The populated arm below is the region
// story 05 fills; it is present because the page's state machine has five arms and a state with
// no treatment is a state nothing can observe.
import { useCallback, useEffect, useState } from "react";
import { SurfaceSlot } from "../app/SurfaceSlot";
import { CONTENT_FIXED_HEIGHT_CLASS } from "../app/shell-layout.mjs";
import { SessionGrid } from "./SessionGrid";
import { SessionLauncher } from "./SessionLauncher";
import type { TerminalOrigins } from "../terminal/socket-url.mjs";
import {
  HOME_EMPTY_CARD_CLASS,
  HOME_HEADING,
  HOME_LOADING_LINE,
  HOME_PAGE_STATE_ERROR,
  HOME_PAGE_STATE_LOADING,
  HOME_PAGE_STATE_POPULATED,
  HOME_POLL_MS,
  HOME_STATUS_PATH,
  activeRunCount,
  addressableSessionCount,
  homeEmptyCopy,
  homeFaultMessage,
  homePageState,
  homeSlotSummary,
  type HomePageState,
  type HomeStatusPayload,
} from "./page-state.mjs";

// THE GRID IS ITS OWN COMPONENT (story 05): it composes the rows, arbitrates the sockets, owns
// the keyboard and holds the ONE live region, and its track class travels with it. This page
// keeps the page's five states and hands it the payload.

// THE ORIGINS ARE HANDED IN, NEVER READ HERE. `acd-home-layout-is-a-filter` sweeps this whole
// directory for a browser global, and it is right to: a module that reaches for one is a module
// no `node:test` in this repo can drive. `main.tsx` already resolves the address at module scope
// and hands this surface the origins it was served from — the same shape, and the same discipline,
// as `socket-url.mjs`'s own "the origins are RECEIVED" rule (ADR-004).
export function Home({ origins = { self: null, fleet: null } }: { origins?: TerminalOrigins }) {
  const [status, setStatus] = useState<HomeStatusPayload | null>(null);
  // The grid's own counts, reported up for the surface slot. Zero until the grid has answered.
  const [counts, setCounts] = useState({ sessions: 0, live: 0, needInput: 0 });
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  // The m03 load({ silent }) idiom the fleet already runs on, and here it is the mechanism
  // behind a rule rather than a convenience: a SILENT refresh updates in place and never flips
  // the page back to `loading` or to the failed card. Only the FIRST load and an explicit Retry
  // are allowed to do that. Blanking a screen of live terminals every five seconds is a worse
  // failure than a five-second-old count, and story 05 inherits the harder half of the same
  // rule — a grid of live panes must not be torn down and rebuilt on a poll.
  //
  // WHAT A SILENT POLL FAILURE DOES IS A ROUTED DESIGN GAP, NOT A DECISION TAKEN HERE. DESIGN
  // fixes the FIRST-fetch failure and says nothing about a silent re-poll failure after a
  // successful load — whether the page swaps to the failed card or keeps its last-known content
  // with a staleness marker (the shape the fleet already has for a dead server). This build
  // keeps the last-known content and surfaces nothing, which is the ONLY behaviour that does
  // not pre-empt the designer's answer: it changes nothing on screen. The task file routes the
  // question; when it is answered, this branch is where it lands.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setFailure(null);
    }
    try {
      const response = await fetch(HOME_STATUS_PATH);
      if (!response.ok) {
        // The refusal's own coded body, read once. `homeFaultMessage` decides which sentence the
        // operator sees; a body that will not parse is not a second failure, it is no body.
        const body = await response.json().catch(() => null);
        throw new Error(homeFaultMessage(body, response.status));
      }
      const payload = (await response.json()) as HomeStatusPayload;
      setStatus(payload);
    } catch (caught) {
      // The fault is NAMED. A bare "something went wrong" is the one thing DESIGN's failed
      // state may not say — the operator's next move depends on which fault this is.
      //
      // THE LAST-RESORT SENTENCE IS ASKED FOR, NOT RETYPED. A transport rejection (the face
      // refused the connection, DNS failed, the socket died mid-body) carries its own message and
      // that message IS the fault; only a throw with nothing on it falls through, and what a
      // fault with no name reads as is `homeFaultMessage`'s decision like every other. Spelling
      // it here as well would be a fact with two homes in the file that argues against them.
      if (!silent) setFailure(caught instanceof Error && caught.message.length > 0 ? caught.message : homeFaultMessage(null));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const poll = setInterval(() => void load({ silent: true }), HOME_POLL_MS);
    return () => clearInterval(poll);
  }, [load]);

  const state = homePageState({ loading, error: failure, status });
  // ONE population, counted once. The summary and the selector read the same array, because two
  // counts over one array is a fact with two homes — and `live`/`needInput` are the GRID's own
  // answers, reported up rather than recounted here: the number in the chrome and the tiles on
  // screen are then one derivation with two readers (DG-49-7's last clause, one layer up).
  //
  // THE STATE IS HANDED IN, AND IT IS NOT A CONVENIENCE (rule R-3, designer's GAP-7): G0 may
  // assert a count only where the page holds a payload, so the answer is `null` while the first
  // fetch is out and while the last one failed. WHICH states those are is `page-state.mjs`'s
  // decision like every other on this surface — this component asks, and renders what it is told.
  const summary = homeSlotSummary(state, {
    sessions: addressableSessionCount(status),
    live: counts.live,
    needInput: counts.needInput,
  });

  return (
    // THE SURFACE DECLARES `content:fixed` AND MUST ALSO OBTAIN THE BOX (story 04 finding F1,
    // folded in here because story 05 is what makes it bite). The shell's content region is
    // `min-h-0 flex-1 overflow-hidden` and `SurfaceBoundary` adds no wrapper, so `main` is NOT a
    // flex container: `flex-1` on this root is inert, its height is `auto`, and the grid's
    // `overflow-y-auto` can never engage — invisible with one card, and a page that scrolls its
    // whole chrome at sixteen panes. The published constant is what the board's root already
    // applies (`Board.tsx`), imported rather than re-spelled.
    <div className={`flex min-h-0 flex-1 flex-col ${CONTENT_FIXED_HEIGHT_CLASS}`}>
      {/* G1 — the ONE `h1` on the page, carried across from the deleted ui/src/app/Landing.tsx.
          It stays because m45 fixed "the ONE `h1` on the page"; it goes visually silent because
          the grid is its own title and a 432px content box cannot spend a row saying so. It is
          OUTSIDE the state ternary, so it is present in all five states rather than only the
          populated one. */}
      <h1 className="sr-only">{HOME_HEADING}</h1>

      {/* G0 — the page's ONE contribution to the shell's chrome. The shell places it in the top
          bar at >=1024 and in the 40px surface bar at <=1023; the slot MOVES and its contents
          never change form. It is contributed OUTSIDE the state ternary for the same reason the
          fleet contributes its scope control outside its own: a slot that only appears once data
          arrives is missing from the state where it would be missed.
          A SECOND BAR IS A GAP, NOT A VARIANT — this page grows no chrome of its own.
          THE NODE IS CONTRIBUTED IN ALL FIVE STATES; WHAT IT SAYS IS THE PAYLOAD'S (R-3). In the
          loading and failed states `summary` is `null` and this span renders EMPTY — the slot
          holds its place in the bar without asserting a count nobody has. React renders `null` as
          nothing, so there is no `0`, no `—` and no skeleton to mistake for an answer. */}
      {/* MILESTONE 50 / STORY 04 — the slot gains its SECOND occupant, and DG-50-6 fixes the
          yield order STRUCTURALLY rather than as a computed ceiling (F-47-V-18's lesson applied,
          not restated): the trigger is `shrink-0` and keeps its whole label at every width; the
          SUMMARY is the element that yields, `min-w-0 truncate` with its full value in `title`.
          A control outranks a reader aid — this AMENDS 49/DESIGN-CONFORMANCE §3's "full summary
          at 390" row, and the amendment is recorded rather than left to be discovered.
          STILL EXACTLY ONE NODE, contributed OUTSIDE the state ternary, so the launcher is
          present in all five page states — which is the whole of DG-50-5: the state an operator
          most often meets is the one with nothing in it, and that is when they want to start a
          session. `status` is in `deps` because the panel's options are the payload's. */}
      <SurfaceSlot deps={[summary, status]}>
        <span className="flex min-w-0 items-center gap-2">
          <span data-home-slot="summary" title={summary ?? undefined} className="min-w-0 truncate text-[11px] text-muted-foreground">
            {summary}
          </span>
          <SessionLauncher status={status} />
        </span>
      </SurfaceSlot>

      {/* G2/G3 — the fleet's own container measurements, so the home sits on the same page
          rhythm every other surface does. Exactly ONE of the five treatments is inside it. */}
      <div className="flex min-h-0 flex-1 flex-col px-4 py-7 sm:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col">
          {state === HOME_PAGE_STATE_LOADING ? (
            <LoadingCard />
          ) : state === HOME_PAGE_STATE_ERROR ? (
            <PayloadFailed message={failure ?? ""} onRetry={() => void load()} />
          ) : state === HOME_PAGE_STATE_POPULATED ? (
            // G2 — the grid: one S2 tile per addressable session, and the socket each one opens.
            <SessionGrid status={status} origins={origins} onSummary={setCounts} />
          ) : (
            <EmptyCard state={state} runCount={activeRunCount(status)} />
          )}
        </div>
      </div>
    </div>
  );
}

// LOADING IS THE FIRST FETCH ONLY, AND IT IS A LINE RATHER THAN A SHIMMER (DESIGN §S1;
// DG-49-6 clause 3). The two shimmer idioms in this house — `.aof-pending` and the
// `animate-pulse` skeleton pair — are the only animations on the page, and story 06 measured
// that they animate under `prefers-reduced-motion: reduce`. Adding a third here would ship a new
// accessibility defect into the milestone that exists to remove one, so this state is a muted
// centred line in the SAME dashed card the two empty states use.
function LoadingCard() {
  return (
    <div data-home-state={HOME_PAGE_STATE_LOADING} className={HOME_EMPTY_CARD_CLASS}>
      <p className="text-center">{HOME_LOADING_LINE}</p>
    </div>
  );
}

// THE TWO EMPTY STATES. Both are ORDINARY — never red, never a spinner, never a skeleton — and
// they differ in their WORDS, never in their number of exits. Neither prints a command: which
// command wires Claude's session hooks into a workspace is a producer-side decision the
// architect still owns, and the house's own `EmptyFleet` printing three different commands in
// exactly this slot is the precedent NOT to reach for (DG-49-1's own words: no command this
// document cannot vouch for).
//
// The card's className is the house's dashed primitive VERBATIM and nothing is appended to it —
// alignment lives on the children — so "this is the same card the rest of the product uses" is
// a byte comparison rather than a judgement.
function EmptyCard({ state, runCount }: { state: HomePageState; runCount: number }) {
  const copy = homeEmptyCopy(state, runCount);
  return (
    <div data-home-state={copy.state} className={HOME_EMPTY_CARD_CLASS}>
      <p className="text-center">{copy.lines[0]}</p>
      <p className="mt-1 text-center">{copy.lines[1]}</p>
      <p className="mt-4 text-center">
        {/* THE ONE ROUTE OUT, and it is a real anchor an operator can middle-click — not a
            button that navigates. Its href comes off the route table through ./page-state.mjs,
            so it carries no `mode=` selector, no query string and no origin: it is a path, and
            the app has exactly one place that knows what that path is. */}
        <a href={copy.link.href ?? undefined} data-home-exit="" className="text-xs font-semibold text-primary hover:underline">
          {copy.link.label}
        </a>
      </p>
    </div>
  );
}

// THE PAYLOAD FAILED — the fleet page's own failed-state ramp, reused: the accent pill, its `!`
// mark, the named fault and a retry. It is deliberately, VISIBLY a different treatment from the
// dashed empty card, so an operator can tell "this failed" from "there is nothing here" without
// reading the words. NEVER `destructive`: a poll that did not land is a retryable transport
// condition, not data loss.
//
// The ramp is COPIED rather than imported, and that is ADR-001's boundary rather than an
// oversight: `ui/src/home/` imports nothing from `ui/src/fleet/`, and reaching for
// `PageStates.tsx` is precisely how `ui/src/board/` became the shared library by accident
// (TECH_DEBT 18(a)). If a second surface ever wants this pill it goes to `ui/src/components/`.
function PayloadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    // TOP-ANCHORED, LIKE ITS THREE SIBLINGS (designer's GAP-4, ruled 2026-08-13). It was centred in
    // the viewport while E1, E2 and loading sit at the top of the container, so the page's own
    // states did not share a horizon and the failed one read as a different kind of page. The
    // fleet's treatment and its `Retry` are unchanged — only where the box hangs.
    <div data-home-state={HOME_PAGE_STATE_ERROR} className="flex flex-1 justify-center p-10">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">
          <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground" aria-hidden="true">
            !
          </span>
          Could not load the mesh: {message}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          ⟳ Retry
        </button>
      </div>
    </div>
  );
}
