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
