// Type declarations for scene-view.mjs (the stored Excalidraw scene, seen as Mermaid).

import type { ProfileModel } from "./mermaid-profile.mjs";

export interface ViewEntry { kind: "node" | "subgraph" | "edge" | "sketch"; elementIds: string[]; container: string | null; label?: string | null; lib?: boolean; from?: string; to?: string; arrows?: string[] }

export declare function assignAliases(elements: ReadonlyArray<Record<string, unknown>>): { elements: Array<Record<string, unknown>>; assigned: Record<string, string> };
export declare function projectScene(elements: ReadonlyArray<Record<string, unknown>>): { model: ProfileModel; index: Record<string, ViewEntry> };
export declare function sceneView(elements: ReadonlyArray<Record<string, unknown>>): string;
export declare function selectionIds(elements: ReadonlyArray<Record<string, unknown>>, selectedElementIds: Record<string, boolean> | null | undefined): string[];
