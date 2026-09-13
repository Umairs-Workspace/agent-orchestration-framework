// Type declarations for the ONE terminal control's provider picker (milestone 46 / story 03
// / task 04; moved from ui/src/board/terminal/ under ADR-001 with its vibeyard MIT
// attribution intact).

export declare const PROVIDER_IDS: string[];
export declare const DEFAULT_PROVIDER_ID: string;

export interface PickerState {
  readonly selected: string;
}

export declare function initialPicker(): PickerState;
export declare function selectProvider(state: PickerState | null | undefined, id: unknown): PickerState;
export declare function isSelected(state: PickerState | null | undefined, id: string): boolean;
export declare function selectedCount(state: PickerState | null | undefined): number;

// The providers offered today — a SUBSET of PROVIDER_IDS, never a second vocabulary.
export declare const VISIBLE_PROVIDER_IDS: readonly string[];

// The picker's selection joining the addressing tuple, for a source that DECLARES `provider`.
// The ONE seam where a `local-pty`'s tuple is completed, and the one production uses.
export declare function withSelectedProvider(
  source: { params?: readonly string[] } | null | undefined,
  params: Record<string, string> | null | undefined,
  picker: PickerState | null | undefined,
): Record<string, string>;
