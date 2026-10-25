// Type declarations for editor-state.mjs (the editor's pure state — @aof/diagrams-ui).

export declare function sceneFileName(svgFile: string): string;
export declare function sceneFingerprint(scene: {elements: unknown; files: unknown; appState?: Record<string, unknown>} | null): string;
export declare function diagramReviewInvocation(ref: string, file: string, requestId?: string | null): string;
export declare function reviewInvocations(input: { ref: string; file: string; requestId?: string | null; waiting?: number }): string[];
export declare function askArchitect(input: { text: string; selection: () => readonly string[]; unsaved: boolean; revision: string | null; save: () => Promise<{ revision: string | null }>; record: (request: { baseRevision: string | null; selectedIds: string[]; request: string }) => Promise<string | null>; launch: (command: string, requestId: string) => void; invocation: (requestId: string) => string }): Promise<string | null>;
export type ReviewChange = { key: string; change: "added" | "changed" | "removed" };
export type ReviewProposal = { id: string; requestId?: string; summary: string; rationale: string; status: string; changes: ReviewChange[]; reason?: string | null };
export type ReviewRequest = { id: string; request: string; status: string; answer: string | null; selectedIds?: string[] };
export declare const POLL_MS: number;
export declare function pendingProposals<T extends { status: string }>(proposals: T[] | null | undefined): T[];
export declare function operationCounts(proposal: { changes?: ReadonlyArray<{ key: string; change: string }> } | null | undefined): { add: number; update: number; delete: number };
export declare function describeCounts(proposal: { changes?: ReadonlyArray<{ key: string; change: string }> } | null | undefined): string;
export declare function touchedIds(proposal: { changes?: ReadonlyArray<{ key: string; change: string }> } | null | undefined, options?: { existingOnly?: boolean }): string[];
export declare function selectionFor(ids: string[]): Record<string, true>;
export declare function staleConflictIds(message: string | null | undefined): string[];
export declare function describeError(code: string | null | undefined, message: string | null | undefined): string;
export declare function shouldPoll(state?: { open?: boolean; visible?: boolean; stream?: "connecting" | "open" | "down" | "closed" }): boolean;
export declare function openNotes<T extends { status: string }>(requests: T[] | null | undefined): T[];
