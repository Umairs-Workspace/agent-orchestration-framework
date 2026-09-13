// C1's IDENTITY FRAGMENT — the lockup, the one identity line, the `read-only` pill, the provider
// picker and the state chip (milestone 46; DESIGN §S1/§S2's C1).
//
// EXTRACTED at the 2026-08-09 UI-defect pass under `acd-ui-surface-file-budget`'s own remedy —
// "a surface gains CHILD COMPONENTS, not blocks" — when the ratchet fired on `TerminalControl.tsx`
// at 863 lines against its 840 ceiling. The ceiling was NOT raised: this milestone's own precedent
// is that the author who trips the ratchet extracts (46/05 did exactly this at 859), and ADR-014/E3
// bars deleting explanation to fit under a number. No comment was dropped to make this fit.
//
// IT IS A REAL SEAM RATHER THAN A SLICE TAKEN TO FIT. The fragment already had TWO consumers —
// the inline header and the fullscreen occupant render it VERBATIM, which is what makes the two
// surfaces speak one identity and carry the posture on both — so it was already being passed
// around as a value. It now travels as an element instead of a fragment, which changes nothing
// about where it renders and gives it a prop boundary a reader can see.
//
// IT DECIDES NOTHING. Every field it paints is derived upstream: the identity by
// `terminalPaneIdentity`, the pill and the picker's offer by `input-policy.mjs`, the dot, word,
// motion and picker lock by `describeTerminalState`. ADR-001's split is the reason — a decision
// that lives in JSX is a decision no test in this repo could reach, which is exactly how the
// blocker of 2026-08-09 shipped.
//
// ═══ MILESTONE 49 ADDS TWO THINGS HERE, AND BOTH ARE THINGS THIS FILE ALREADY ASKS THE HOST ══
//   · THE HEADER HAS TWO ROWS ON A GRID TILE (DESIGN §S2's C1a/C1b). The fragment is rendered in
//     PARTS rather than restructured: a host with one header row asks for the whole thing and
//     gets byte-for-byte what it always got; a host with two asks for each row.
//   · THE PER-PANE `aria-live` IS A HOST DECLARATION (DG-49-7). It was right for one pane on one
//     card and is a screen reader narrating the fleet on a grid of twelve, so the grid host
//     declares silence and the grid owns ONE region. That is m46's design GAP G1's own shape —
//     "the declaration was correct and the JSX simply never asked it" — not a new prop.
import type * as React from "react";
import { cn } from "@/lib/utils";
import { ProviderPicker } from "./ProviderPicker";
import { AFFORDANCE_PROVIDER_PICKER, declaresAffordance, hostAnnouncesState, hostHeaderRows } from "./host-model.mjs";
import type { TerminalHost } from "./host-model.mjs";
import type { MountModel } from "./input-policy.mjs";
import type { PickerState } from "./provider-picker.mjs";
import type { TerminalPaneIdentity, TerminalPaneNotRendered } from "./pane-identity.mjs";
import type { TerminalStateDescriptor } from "./state-ramp.mjs";
import {
  TERMINAL_BORDER_CLASS,
  TERMINAL_HEADER_CHROME_CLASS,
  TERMINAL_LOCKUP_CLASS,
  TERMINAL_READ_ONLY_PILL_CLASS,
  TERMINAL_STATE_DOT_CLASS,
  TERMINAL_YIELD_FIELD_LABEL_CLASS,
  TERMINAL_YIELD_TAIL_CLASS,
  TERMINAL_YIELD_WORD_CLASS,
} from "./palette.mjs";

// WHICH ROW IS BEING RENDERED. `all` is m46's single header, byte-for-byte; the other two are
// DESIGN §S2's C1a/C1b, and the split is declared by the HOST (`hostHeaderRows`), not decided here.
export const IDENTITY_PART_ALL = "all";
export const IDENTITY_PART_IDENTITY = "identity";
export const IDENTITY_PART_STATUS = "status";

// C1 — THE HEADER REGION, beside the fragment it composes.
//
// THE DOCK'S HEADER NEVER WRAPS and the card's is the one m46 host where wrapping is permitted —
// DESIGN §S1 and §S2 say so and the committed mock draws exactly that. At 390 the card yields in
// discrete drops: the `session <id>` tail goes whole, then the `TERMINAL` word (the glyph stays),
// then the row wraps. The `read-only` pill, the state chip, the owner ref and the toggle are
// never dropped.
//
// A GRID TILE HAS TWO ROWS and the host says so: identity and its pills first, then the status
// row carrying the chip, the repo field and the controls at `ml-auto`. At a ≈394px track one row
// cannot hold both without the yield order eating the identity — the element it forbids dropping.
export function TerminalHeader({
  host,
  isDock,
  controls,
  ...identity
}: Omit<Parameters<typeof TerminalIdentity>[0], "part" | "controls"> & {
  isDock: boolean;
  controls?: React.ReactNode;
}): React.ReactElement {
  const twoRows = hostHeaderRows(host) === 2;
  return (
    <header
      className={cn(
        // `@container` — THE YIELD IS KEYED TO THIS HEADER'S OWN WIDTH, NEVER THE VIEWPORT. See
        // `TERMINAL_YIELD_*` in palette.mjs: a viewport media query answers a question nobody
        // asked, because the box that runs out of room is this one. Measured defects it fixes: the
        // fleet card is ~395px wide inside a 1280 viewport, so `md:` read TRUE and the header kept
        // the whole `· session <id>` tail and truncated the REF instead — the exact inversion of
        // CONFORMANCE C13; and the 390 dock overflowed its frame by 61px.
        "@container flex min-w-0 border-b",
        TERMINAL_BORDER_CLASS,
        isDock
          ? cn("flex-nowrap items-center py-2", TERMINAL_HEADER_CHROME_CLASS)
          : twoRows
            ? "flex-col gap-y-1 py-1.5"
            : "flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5",
      )}
    >
      {twoRows ? (
        <>
          <div className="flex min-w-0 items-center gap-x-2.5 px-3">
            <TerminalIdentity {...identity} host={host} part={IDENTITY_PART_IDENTITY} />
          </div>
          <div className="flex min-w-0 items-center gap-x-2.5 px-3">
            <TerminalIdentity {...identity} host={host} part={IDENTITY_PART_STATUS} controls={controls} />
          </div>
        </>
      ) : (
        <>
          <TerminalIdentity {...identity} host={host} />
          {controls}
        </>
      )}
    </header>
  );
}

export function TerminalIdentity({
  identity,
  detail,
  model,
  host,
  descriptor,
  picker,
  subscribed,
  onSelectProvider,
  part = IDENTITY_PART_ALL,
  standing = null,
  controls = null,
}: {
  identity: TerminalPaneIdentity | TerminalPaneNotRendered;
  // The identity line's TAIL, from the mount — a mirror names the session the operator did not
  // start; a local PTY's `ref` IS its name and a tail would repeat it.
  detail: string | null;
  model: MountModel;
  host: TerminalHost;
  descriptor: TerminalStateDescriptor;
  picker: PickerState;
  subscribed: boolean;
  onSelectProvider: (id: string) => void;
  // C1a or C1b, for a host whose header has two rows. Defaults to the whole fragment.
  part?: string;
  // What the SURFACE says about this pane beyond its mount: the agent-state MARK (one value —
  // `needs input` — and absence asserts nothing, DG-49-3), the secondary identity FIELD (the repo,
  // shown only where it is not already the owner) and a NOTE the transport cannot know.
  standing?: { readonly mark?: string | null; readonly field?: string | null; readonly note?: string | null } | null;
  // The control cluster, rendered INSIDE the status row for a two-row header so the row can put it
  // at `ml-auto`. A one-row host renders it as this fragment's sibling, exactly as it ships.
  controls?: React.ReactNode;
}): React.ReactElement {
  const identityRow = (
    <>
      <span className={cn("flex shrink-0 items-center gap-1.5", TERMINAL_LOCKUP_CLASS)}>
        <span aria-hidden="true">▣</span>
        {/* THE WORD YIELDS BEFORE THE HEADER WRAPS, and the glyph never does (DESIGN §S2's yield
            order, confirmed by the mock's 390 sample). A discrete drop, never a shrink factor.
            ONE RULE FOR BOTH HOSTS: the dock used to keep the word unconditionally, which is what
            made its 390 header overflow the frame by 61px — a host does not stop running out of
            room for being a dock. */}
        <span className={cn("hidden", TERMINAL_YIELD_WORD_CLASS)}>TERMINAL</span>
      </span>
      {/* ONE IDENTITY LINE, SOURCE-SHAPED. A source whose far end is elsewhere names it and its
          session (`46/02 → aof-wsl · session 7f3a91c`); a local PTY's far end is this server's
          own, so it reads `item 46/02` — and `item` is a muted FIELD LABEL, never part of the
          identity, which is why the core's `label` does not carry it. */}
      <span
        className="mono flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-400"
        title={identity.rendered ? [identity.label, detail].filter(Boolean).join(" · ") : undefined}
      >
        {identity.rendered && identity.farEnd == null ? (
          <span className={cn("hidden shrink-0 text-zinc-500", TERMINAL_YIELD_FIELD_LABEL_CLASS)}>item</span>
        ) : null}
        {/* TRUNCATION BELONGS TO THE LONG IDENTITY, NOT TO EVERY IDENTITY (design GAP G4, ruled by
            `aof-designer` against the renders, 2026-08-09). A far-end identity is
            `46/02 → aof-wsl · session 7f3a91c` — long, variable, and DESIGN authorises dropping its
            TAIL, so truncating what is left degrades gracefully. A local PTY's identity is the bare
            ref: short, fixed-length, and on the never-dropped list. Truncating THAT is not a
            graceful degradation, it is corruption of a name — measured at 390 as `46…` on `waiting`
            (the ramp's longest chip word) and `46/_` on `ended` (the state that gains `↻`), while
            `streaming` fitted. So CSS was acting as an unowned step 4 of the yield order, eating
            exactly the element the order forbids dropping — and it only bit in the two widest
            states, which is why measuring `streaming` alone missed it.
            With no `truncate` here an overflow surfaces as a layout bug instead of a silent lie. */}
        <span
          className={cn(
            identity.rendered && identity.farEnd == null ? "shrink-0 text-zinc-300" : "min-w-0 truncate",
          )}
        >
          {identity.rendered ? identity.label : "no session"}
        </span>
        {/* THE TAIL IS THE FIRST THING TO YIELD — dropped WHOLE, with its separator, because half
            an id names nothing. The ref and the node still identify the pane without it. */}
        {identity.rendered && detail ? (
          <span className={cn("hidden shrink-0", TERMINAL_YIELD_TAIL_CLASS)}>· {detail}</span>
        ) : null}
      </span>
      {model.readOnlyLabel ? (
        <span className={cn("shrink-0", TERMINAL_READ_ONLY_PILL_CLASS)} title={model.readOnlyLabelTitle ?? undefined}>
          {model.readOnlyLabel}
        </span>
      ) : null}
      {/* AGENT STATE IS A MARK, NOT A CHIP (DG-49-3) — the SECOND axis, in the pill's form,
          immediately after the `read-only` pill, never in the connection chip's form or position.
          Exactly one value exists (`needs input`) and ABSENCE ASSERTS NOTHING: an "unknown" badge
          on most tiles trains the eye to ignore the one that matters. The WORD is decided upstream
          on the EXACT code, never on truthiness — `code` is multi-valued and carries `resumed` and
          a family of settled words, so a `!= null` test would claim a human is waiting on a
          session nobody is waiting on. It never pulses and it never re-orders the grid. */}
      {standing?.mark ? (
        <span className={cn("shrink-0", TERMINAL_READ_ONLY_PILL_CLASS)}>{standing.mark}</span>
      ) : null}
      {model.providerPickerOffered && declaresAffordance(host, AFFORDANCE_PROVIDER_PICKER) ? (
        <ProviderPicker picker={picker} locked={descriptor.locksProviderPicker} onSelect={onSelectProvider} />
      ) : null}
    </>
  );

  const statusRow = subscribed ? (
    // The state chip. It announces its changes POLITELY where the HOST declares it does — one pane
    // on one card learns that a session connected, ended or failed; a grid of a dozen would narrate
    // the whole fleet from N places with no way to tell which tile spoke, so there the grid owns
    // ONE region and this goes quiet (DG-49-7). The WORD is unchanged everywhere.
    <span
      className="flex shrink-0 items-center gap-1.75 text-[11px] whitespace-nowrap"
      {...(hostAnnouncesState(host) ? { "aria-live": "polite" } : null)}
    >
      <span
        className={cn("inline-block shrink-0 rounded-full", TERMINAL_STATE_DOT_CLASS, descriptor.dotClass, descriptor.motionClass)}
        aria-hidden="true"
      />
      <span className={descriptor.labelClass}>{descriptor.text}</span>
    </span>
  ) : null;

  // THE REPO, and only where it is not already the owner (DESIGN §S2's identity table): a free
  // session's owner IS its repo, so printing it twice says one fact in two places on the row that
  // has least room for either.
  const fieldRow =
    standing?.field != null && standing.field !== "" ? (
      <span className="mono shrink-0 text-[11px] text-zinc-500">{standing.field}</span>
    ) : null;

  // THE SURFACE'S ANNOTATION — a fact about this pane the TRANSPORT cannot know, so it may not
  // wear a transport word: the chip still says what the socket is doing (`streaming` is what the
  // pane can observe) and this says the mesh has stopped listing the session. Truncated with the
  // whole sentence in `title`, the house's own degradation for a long value.
  const noteRow =
    standing?.note != null && standing.note !== "" ? (
      <span className="mono min-w-0 truncate text-[11px] text-zinc-500" title={standing.note}>
        {standing.note}
      </span>
    ) : null;

  if (part === IDENTITY_PART_IDENTITY) return identityRow;
  if (part === IDENTITY_PART_STATUS) {
    return (
      <>
        {statusRow}
        {statusRow != null && fieldRow != null ? <span className="shrink-0 text-[11px] text-zinc-500">·</span> : null}
        {fieldRow}
        {noteRow}
        {controls}
      </>
    );
  }
  return (
    <>
      {identityRow}
      {statusRow}
    </>
  );
}
