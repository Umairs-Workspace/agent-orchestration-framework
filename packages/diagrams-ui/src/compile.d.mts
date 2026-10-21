// Type declarations for compile.mjs (a proposal compiled into the stored scene).

import type { ProfileModel } from "@aof/diagrams/mermaid-profile";

export type SceneElement = Record<string, unknown> & { id: string; type: string };
export interface LibraryEntry { library: string; item: string; id?: string; elements: SceneElement[] }
export type ElementOperation = { op: "add"; element: SceneElement } | { op: "update"; id: string; patch: Record<string, unknown> };

export declare function straightArrow(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): { x: number; y: number; points: Array<[number, number]> };
export declare function boundsOf(elements: ReadonlyArray<Record<string, unknown>>): { x: number; y: number; w: number; h: number } | null;
export declare function libraryItemsFor(items: ReadonlyArray<LibraryEntry>): Array<{ id: string; status: "unpublished"; created: number; name: string; elements: SceneElement[] }>;
export declare function firstDraftSkeletons(converted: ReadonlyArray<Record<string, unknown>>, proposed: ProfileModel, options: { newId: () => string }): { skeletons: Array<Record<string, unknown>>; frameOf: (nodeId: string) => string | null };
export declare function compileProposal(input: {
  elements: ReadonlyArray<SceneElement>;
  changes: ReadonlyArray<{ key: string; change: string }>;
  proposed: ProfileModel;
  hints?: Map<string, { x: number; y: number; w: number; h: number }>;
  libraries?: ReadonlyArray<LibraryEntry>;
  toElements: (skeletons: ReadonlyArray<Record<string, unknown>>) => SceneElement[];
  newId: () => string;
}): { elements: SceneElement[]; touched: Set<string>; unresolved: string[] };
export declare function operationsFor(before: ReadonlyArray<SceneElement>, after: ReadonlyArray<SceneElement>, touched: Set<string>): ElementOperation[];
