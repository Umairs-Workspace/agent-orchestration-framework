// Type declarations for diagrams.mjs (the diagram figure — milestone 133 / story 04, ADR-007 §4).

import type { DocResponse } from "./api";

// DESIGN's four figure states.
export type FigureState =
  | { state: "loading" }
  | { state: "populated"; uri: string; width: number | null }
  | { state: "missing"; text: string }
  | { state: "error"; text: string };

// A diagram fetch's answer: undefined while pending, the doc response once answered, or the failure.
export type DiagramResponse = DocResponse | { error: string } | undefined;

// A diagram image `src` (`diagrams/<member>.svg`) → its figure state.
export type DiagramImages = Record<string, FigureState>;

export function diagramMember(src: string | null | undefined): string | null;
export function diagramMembers(markdown: string): string[];
export function diagramFileUrl(ref: string, file: string): string;
export function svgDataUri(body: string): string;
export function figureState(response: DiagramResponse, context?: { member?: string; elsewhere?: string | null }): FigureState;
export function figureHtml(figure: { alt?: string; state: FigureState["state"]; uri?: string; text?: string; width?: number | null; expand?: string | null }): string;

// The marked renderer overrides the panel's Markdown hands a per-call `Marked` instance.
export function diagramRenderer(images?: DiagramImages, context?: { ref?: string | null }): {
  link(token: { href: string; text: string }): string | false;
  paragraph(token: { tokens?: Array<{ type: string; raw: string; href?: string; text?: string }> }): string | false;
  image(token: { href: string; text: string }): string | false;
};

export declare function sceneFileName(svgFile: string): string;
export declare function sceneFingerprint(scene: {elements: unknown; files: unknown; appState?: Record<string, unknown>} | null): string;
export declare function diagramReviewInvocation(ref: string, file: string, requestId: string): string;
export type ReviewOperation = { op: "add"; element: { id?: string } } | { op: "update"; id: string; patch: Record<string, unknown> } | { op: "delete"; id: string };
export type ReviewProposal = { id: string; requestId?: string; summary: string; rationale: string; status: string; operations: ReviewOperation[]; reason?: string | null };
export type ReviewRequest = { id: string; request: string; status: string; answer: string | null };
export declare const POLL_MS: number;
export declare function pendingProposals<T extends { status: string }>(proposals: T[] | null | undefined): T[];
export declare function operationCounts(proposal: { operations?: unknown[] } | null | undefined): { add: number; update: number; delete: number };
export declare function describeCounts(proposal: { operations?: unknown[] } | null | undefined): string;
export declare function touchedIds(proposal: { operations?: unknown[] } | null | undefined, options?: { existingOnly?: boolean }): string[];
export declare function selectionFor(ids: string[]): Record<string, true>;
export declare function staleConflictIds(message: string | null | undefined): string[];
export declare function describeError(code: string | null | undefined, message: string | null | undefined): string;
export declare function shouldPoll(state?: { open?: boolean; visible?: boolean }): boolean;
