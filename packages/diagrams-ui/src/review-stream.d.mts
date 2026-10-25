// Type declarations for review-stream.mjs (the editor's side of the "look now" stream — @aof/diagrams-ui).

export type StreamStatus = "connecting" | "open" | "down" | "closed";
export type StreamState = { stream: StreamStatus; review: string | null; offered: string | null };
export type StreamEvent =
  | { type: "connect" } | { type: "open" } | { type: "error" } | { type: "hidden" } | { type: "visible" } | { type: "reload" }
  | { type: "stamp"; review: string | null; revision: string | null }
  | { type: "review"; review: string | null }
  | { type: "scene"; revision: string | null };
export type StreamEffect = "refresh" | "replace" | "offer-reload" | "close-line" | "defer" | "connect" | "disconnect";
export type EditorFacts = { revision: string | null; dirty: boolean; writing: boolean };
export declare const STREAM_INITIAL: Readonly<StreamState>;
export declare const CANVAS_UPDATED: string;
export declare const CHANGED_ELSEWHERE: string;
export declare function streamStep(state: StreamState | null | undefined, event: StreamEvent, facts: EditorFacts): { state: StreamState; effects: StreamEffect[] };
