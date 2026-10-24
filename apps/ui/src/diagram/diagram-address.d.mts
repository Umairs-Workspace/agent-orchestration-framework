// Type declarations for diagram-address.mjs (the `/diagram` route's address vocabulary).

export declare const DIAGRAM_ROUTE_ID: "diagram";

export interface DiagramAddress {
  readonly ref: string;
  readonly file: string;
}

export declare function isDiagramMember(file: unknown): file is string;
export declare function diagramHref(ref: string, file: string): string | null;
export declare function diagramAddressOf(search: string | null | undefined): DiagramAddress | null;
export declare function boardHref(ref: string | null | undefined): string;
