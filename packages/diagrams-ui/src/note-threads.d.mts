// Type declarations for note-threads.mjs (note threads on the canvas — @aof/diagrams-ui).

export type Turn = { by: "operator" | "architect"; text: string; at: string | null };
export type ThreadNote = { id: string; status: string; createdAt?: string; request?: string; answer?: string | null; answeredAt?: string | null; selectedIds?: string[]; thread?: Turn[] };
export type NotePin<N extends ThreadNote = ThreadNote> = { key: string; elementIds: string[]; label: string; notes: N[]; count: number; answered: boolean };
export declare function threadOf(note: ThreadNote | null | undefined): Turn[];
export declare function notePins<N extends ThreadNote>(requests: readonly N[] | null | undefined, elements: ReadonlyArray<Record<string, unknown>> | null | undefined): NotePin<N>[];
export declare function noteStatus(note: ThreadNote | null | undefined): string;
export declare function turnAuthor(turn: Turn | null | undefined): "Architect" | "You";
export declare function replyToNote<O>(input: { requestId: string; text: string; record: (reply: { requestId: string; text: string }) => Promise<unknown>; deliver?: ((invocations: string[]) => O) | null; invocations: (requestId: string) => string[] }): Promise<O | "waiting">;
