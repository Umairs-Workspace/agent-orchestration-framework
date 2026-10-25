// Type declarations for canvas-anchor.mjs (the canvas overlay's headless half — @aof/diagrams-ui).

export type SceneBounds = readonly [number, number, number, number];
export type AnchorState = { scrollX?: number; scrollY?: number; zoom?: { value: number } } & Record<string, unknown>;
export type Size = { width: number; height: number };
export type Anchor = { x: number; y: number; placement: "above" | "below" };
export declare const ANCHOR_GAP: number;
export declare const ASK_ACTION: "Ask architect";
export declare const MID_GESTURE: readonly string[];
export declare function sceneToCanvas(sceneX: number, sceneY: number, appState: AnchorState | null | undefined): { x: number; y: number };
export declare function anchorFor(input: { bounds: SceneBounds | null | undefined; appState: AnchorState | null | undefined; viewport: Size | null | undefined; size: Size | null | undefined; gap?: number }): Anchor | null;
export declare function cornerAnchor(input: { bounds: SceneBounds | null | undefined; appState: AnchorState | null | undefined; viewport: Size | null | undefined; size: Size | null | undefined }): { x: number; y: number } | null;
export declare function besideAnchor(input: { bounds: SceneBounds | null | undefined; appState: AnchorState | null | undefined; viewport: Size | null | undefined; size: Size | null | undefined; gap?: number }): { x: number; y: number; side: "right" | "left" } | null;
export declare function selectionAction(input: { selectedCount: number; readOnly: boolean | undefined; appState: AnchorState | null | undefined; bounds: SceneBounds | null | undefined; viewport: Size | null | undefined; size: Size | null | undefined; gap?: number }): (Anchor & { label: "Ask architect" }) | null;
export declare function selectionLabel(elements: ReadonlyArray<Record<string, unknown> & { id: string; type: string }> | null | undefined, selectedIds: Record<string, boolean> | null | undefined): string;
export type QuestionField = { open: boolean; text: string; asking: boolean; error: string | null };
export type FieldEvent = { type: "open" } | { type: "type"; text: string } | { type: "submit" } | { type: "escape" } | { type: "asked" } | { type: "failed"; error?: string };
export declare const CLOSED_FIELD: Readonly<QuestionField>;
export declare function canAsk(field: QuestionField | null | undefined): boolean;
export declare function fieldStep(field: QuestionField | null | undefined, event: FieldEvent): { state: QuestionField; ask: string | null };
