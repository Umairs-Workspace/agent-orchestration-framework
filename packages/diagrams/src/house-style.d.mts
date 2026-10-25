// Type declarations for house-style.mjs (the project's diagram style guide, read into a palette — @aof/diagrams).

export type Palette = Record<string, string> & { paper: string; ink: string };
export declare function readPalette(text: string | null | undefined): Palette | null;
export declare function defaultNodeStyle(palette: Palette | null | undefined): { fill: string; stroke: string; color: string } | null;
export declare function canvasDefaults(palette: Palette | null | undefined): { currentItemStrokeColor?: string; currentItemBackgroundColor?: string; currentItemFillStyle?: "solid" };
