// Type declarations for mermaid-profile.mjs (the aof Mermaid profile — the one diagram format).

export type Direction = "LR" | "RL" | "TB" | "TD" | "BT";
export type Shape = "rect" | "round" | "stadium" | "subroutine" | "cylinder" | "circle" | "diamond" | "hexagon" | "asymmetric";
export type EdgeKind = "arrow" | "open" | "dotted" | "dotted-open" | "thick" | "thick-open";

export interface ProfileNode { id: string; label: string; shape: Shape; parent: string | null }
export interface ProfileSubgraph { id: string; label: string; parent: string | null }
export interface ProfileEdge { key: string; from: string; to: string; kind: EdgeKind; label: string | null }
export interface ProfileStyle { fill?: string; stroke?: string; color?: string }
export interface ProfileBox { x: number; y: number; w?: number; h?: number }
export interface ProfilePath { x: number; y: number; points: Array<[number, number]> }
export interface ProfileModel {
  direction: Direction;
  header: string[];
  subgraphs: ProfileSubgraph[];
  nodes: ProfileNode[];
  edges: ProfileEdge[];
  styles: Record<string, ProfileStyle>;
  layout: Record<string, ProfileBox>;
  paths: Record<string, ProfilePath>;
  libs: Record<string, { library: string; item: string }>;
  sketches: Record<string, string>;
}
export interface ProfileChange { key: string; change: "added" | "changed" | "removed" }

export declare const PROFILE_VERSION: number;
export declare const DIRECTIONS: readonly Direction[];
export declare const SHAPES: Readonly<Record<Shape, readonly [string, string]>>;
export declare const EDGE_KINDS: Readonly<Record<EdgeKind, string>>;
export declare const STYLE_PROPS: readonly string[];
export declare const LIMITS: Readonly<{ nodes: number; edges: number; label: number; id: number; bytes: number }>;

export declare function encodeLabel(text: string): string;
export declare function decodeLabel(text: string): string;
export declare function parseProfile(text: string): ProfileModel;
export declare function validateModel(model: ProfileModel): string[];
export declare function canonicalEdges(model: ProfileModel): { edges: ProfileEdge[]; paths: Record<string, ProfilePath> };
export declare function serializeProfile(model: ProfileModel): string;
export declare function canonicalize(text: string): string;
export declare function emptyProfile(direction?: Direction): string;
export declare function diffModels(before: ProfileModel, after: ProfileModel): ProfileChange[];
export declare function changedIds(changes: ProfileChange[]): string[];
