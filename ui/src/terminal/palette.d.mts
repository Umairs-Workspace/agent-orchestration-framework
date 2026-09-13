// Type declarations for the ONE terminal control's design values (milestone 46 / story 03 —
// DG-46-2). Framework-free by contract; the `.tsx` consumer gets its types from here.

export declare const TERMINAL_VIEWPORT_BG: string;
export declare const TERMINAL_CHROME_BG: string;
export declare const TERMINAL_BORDER: string;
export declare const TERMINAL_PICKER_WELL_BG: string;
export declare const TERMINAL_FOREGROUND: string;

export interface XtermTheme {
  readonly background: string;
  readonly foreground: string;
}
export declare const TERMINAL_XTERM_THEME: XtermTheme;

export declare const TERMINAL_VIEWPORT_BG_CLASS: string;
export declare const TERMINAL_CHROME_BG_CLASS: string;
export declare const TERMINAL_BORDER_CLASS: string;
export declare const TERMINAL_PICKER_WELL_BG_CLASS: string;
export declare const TERMINAL_FOREGROUND_CLASS: string;
export declare const TERMINAL_HOVER_BG_CLASS: string;
export declare const TERMINAL_READ_ONLY_PILL_CLASS: string;

// The chrome type ramp, from the committed mock.
export declare const TERMINAL_LOCKUP_CLASS: string;
export declare const TERMINAL_FONT_SIZE: number;
export declare const TERMINAL_LINE_HEIGHT_PX: number;
export declare const TERMINAL_LINE_HEIGHT: number;
export declare const TERMINAL_FONT_FAMILY: string;
export declare const TERMINAL_BYTE_AREA_FRAME_CLASS: string;
// The byte BOX per host shape: a tile is the mirror's own aspect, the card is its 192px panel
// (m49/DESIGN §S2's C2 — the module says why the second one had to be named).
export declare const TERMINAL_TILE_BOX_CLASS: string;
export declare const TERMINAL_CARD_BOX_CLASS: string;
export declare function terminalPaneBoxClass(paneBox: string | null | undefined): string;
// The HOUSE focus ring (`--color-ring`), 2px with an offset — outward on a tile frame, inset on the
// expanded byte area whose box is the viewport's own edge (DESIGN §focus model 5; BASELINE §S3).
export declare const TERMINAL_FOCUS_RING_CLASS: string;
export declare const TERMINAL_FOCUS_RING_INSET_CLASS: string;
export declare const TERMINAL_YIELD_TAIL_CLASS: string;
export declare const TERMINAL_YIELD_WORD_CLASS: string;
export declare const TERMINAL_YIELD_FIELD_LABEL_CLASS: string;
export declare const TERMINAL_HEADER_CHROME_CLASS: string;
export declare const TERMINAL_STATE_DOT_CLASS: string;

export declare const TERMINAL_DOT_CLASS_MUTED: string;
export declare const TERMINAL_DOT_CLASS_SECONDARY: string;
export declare const TERMINAL_DOT_CLASS_PRIMARY: string;
export declare const TERMINAL_DOT_CLASS_DESTRUCTIVE: string;
export declare const TERMINAL_DOT_CLASS_ABSENT: string;

export declare const TERMINAL_LABEL_CLASS_MUTED: string;
export declare const TERMINAL_LABEL_CLASS_PRIMARY: string;
export declare const TERMINAL_LABEL_CLASS_FAILURE: string;

export declare const TERMINAL_MOTION_CLASS: {
  readonly none: "";
  readonly pulse: "animate-pulse";
};

export declare const TERMINAL_UNAVAILABLE_BLOCK_CLASS: string;
