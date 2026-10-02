// C1's PROVIDER PICKER — the interactive-only segment control that completes a `local-pty`'s
// addressing tuple (milestone 46; DESIGN §S1's C1, `mocks/CONFORMANCE.md` §2·S1).
//
// Extracted from `TerminalControl.tsx` at story 46/05 under `acd-ui-surface-file-budget`'s own
// remedy — "a surface gains CHILD COMPONENTS, not blocks" — and it is a real component rather
// than a slice taken to fit under a number: it has one job, three props and no knowledge of the
// session, the socket or the host. No explanation was deleted to make it fit (ADR-014/E3).
//
// WHETHER IT IS OFFERED AT ALL IS NOT DECIDED HERE. `model.providerPickerOffered` is derived by
// `input-policy.mjs` from two facts — the source declares a `provider` param, and the mount
// permits input — and the host's affordance table decides whether this host shows one. Its
// ABSENCE is therefore a consequence and never the read-only signal; the `read-only` LABEL is.
//
// REAL RADIO SEMANTICS, and they are an accessibility requirement rather than a styling choice
// (DESIGN §Accessibility 5): `role="radiogroup"` with a name, `role="radio"` + `aria-checked` per
// segment, exactly one checked, and the lock carries a `title` naming WHY. The selected dot is
// decoration (`aria-hidden`); `aria-checked` is the programmatic signal.
import { cn } from "@/lib/utils";
import { isSelected, VISIBLE_PROVIDER_IDS } from "./provider-picker.mjs";
import type { PickerState } from "./provider-picker.mjs";
import { TERMINAL_BORDER_CLASS, TERMINAL_PICKER_WELL_BG_CLASS, TERMINAL_YIELD_FIELD_LABEL_CLASS } from "./palette.mjs";

export function ProviderPicker({
  picker,
  locked,
  onSelect,
}: {
  picker: PickerState;
  // A LIVE SESSION LOCKS THE PICK, and the descriptor decides that — not a state word compared
  // here. Switching provider mid-session would address a tuple the running PTY was not started
  // with.
  locked: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      {/* THE FIELD LABEL YIELDS; THE PICKER NEVER DOES. It is decoration in the same sense `item`
          is, and the group keeps its accessible name (`aria-label="Agent provider"`) when the word
          goes — so the drop costs a sighted reader a hint and a screen-reader user nothing. One
          home for the threshold, in palette.mjs, where the rest of C1's yield order lives. */}
      <span className={cn("mono hidden text-[11px] text-zinc-500", TERMINAL_YIELD_FIELD_LABEL_CLASS)}>provider:</span>
      <div
        role="radiogroup"
        aria-label="Agent provider"
        // The WELL dims as a whole while the session is live — which is what makes "you cannot
        // switch right now" read at a glance rather than segment by segment.
        className={cn(
          "grid grid-flow-col gap-1 rounded-md border p-1",
          TERMINAL_BORDER_CLASS,
          TERMINAL_PICKER_WELL_BG_CLASS,
          locked && "opacity-50",
        )}
      >
        {VISIBLE_PROVIDER_IDS.map((id) => {
          const active = isSelected(picker, id);
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={locked}
              title={locked ? "Stop the session to switch provider" : undefined}
              onClick={() => onSelect(id)}
              className={cn(
                // `mono`, NOT `capitalize` — the segment shows the PROVIDER ID, which is the same
                // token the CLI takes (`mocks/CONFORMANCE.md` §2·S1: the copy string is `claude`,
                // "11px mono"). Title-casing it into `Claude` in the UI sans face turned a machine
                // identifier into a brand name the rest of the product does not use, and made the
                // picker read as a product switcher rather than a field value. Design GAP G3, ruled
                // by `aof-designer` against the committed mock, 2026-08-09.
                "mono flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-zinc-100",
                locked && "cursor-not-allowed hover:text-zinc-400",
              )}
            >
              <span
                className={cn("inline-block h-1.5 w-1.5 rounded-full", active ? "bg-primary-foreground" : "bg-transparent")}
                aria-hidden="true"
              />
              {id}
            </button>
          );
        })}
      </div>
    </span>
  );
}
