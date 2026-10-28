// Type declarations for conversation-model.mjs (the conversation panel's pure model — @aof/diagrams-ui).

export type Turn = { by: "operator" | "architect"; text: string; at: string | null };
export type ThreadNote = { id: string; status: string; createdAt?: string; request?: string; answer?: string | null; answeredAt?: string | null; selectedIds?: string[]; thread?: Turn[] };
export type ThreadProposal = { id: string; requestId?: string; summary: string; rationale: string; status: string; createdAt?: string; decidedAt?: string | null; text?: string; changes?: Array<{ key: string; change: string }>; reason?: string | null };
export type ConversationNote<N extends ThreadNote = ThreadNote, P extends ThreadProposal = ThreadProposal> = N & { turns: Turn[]; proposals: P[]; state: string; updatedAt: string | null };
export type Thread<N extends ThreadNote = ThreadNote, P extends ThreadProposal = ThreadProposal> = {
  key: string; subject: string; elementIds: string[]; selectedIds: string[]; notes: ConversationNote<N, P>[];
  state: string; lastTurn: Turn | null; proposal: P | null; updatedAt: string | null;
};
export type ListedProposal<P extends ThreadProposal = ThreadProposal> = P & { threadKey: string | null; subject: string | null };
export type Conversation<N extends ThreadNote = ThreadNote, P extends ThreadProposal = ThreadProposal> = { threads: Thread<N, P>[]; proposals: ListedProposal<P>[]; pending: number };
export type NotePin<N extends ThreadNote = ThreadNote> = { key: string; elementIds: string[]; label: string; notes: N[]; count: number; answered: boolean; answering: boolean };
export type ThreadLiveTurn = { requestId: string; text: string; activity: Array<{ tool: string | null; label: string }>; denials: Array<{ tool: string; input: string }>; outcome: "done" | "failed" | null; startedAt: string | null; stopped: boolean; startingLine: string | null };
export type LiveThread<N extends ThreadNote = ThreadNote, P extends ThreadProposal = ThreadProposal> = Thread<N, P> & { live?: ThreadLiveTurn | null; denials?: Array<{ tool: string; input: string }> };

export declare const WHOLE_DIAGRAM: string;
export declare const WHOLE_DIAGRAM_KEY: string;
export declare const STATE: Readonly<{ answered: string; waiting: string; proposed: string; accepted: string; rejected: string; answering: string; queued: string }>;
export declare const STARTING_LINE: string;
export declare const STOPPED_LINE: string;
export declare function threadOf(note: ThreadNote | null | undefined): Turn[];
export declare function turnAuthor(turn: Turn | null | undefined): "Architect" | "You";
export declare function noteStatus(note: ThreadNote | null | undefined, proposal?: ThreadProposal | null): string;
export declare function clockOf(at: string | null | undefined): string;
export declare function proposalOutcome(proposal: ThreadProposal | null | undefined): string | null;
export declare function threadsOf<N extends ThreadNote, P extends ThreadProposal>(requests: readonly N[] | null | undefined, proposals: readonly P[] | null | undefined, elements: ReadonlyArray<Record<string, unknown>> | null | undefined): Thread<N, P>[];
export declare function conversationOf<N extends ThreadNote, P extends ThreadProposal>(requests: readonly N[] | null | undefined, proposals: readonly P[] | null | undefined, elements: ReadonlyArray<Record<string, unknown>> | null | undefined): Conversation<N, P>;
export declare function replyTarget<N extends ThreadNote, P extends ThreadProposal>(thread: Thread<N, P> | null | undefined): ConversationNote<N, P> | null;
export declare function notePins<N extends ThreadNote, P extends ThreadProposal>(threads: readonly LiveThread<N, P>[] | null | undefined): NotePin<ConversationNote<N, P>>[];
export declare function withLiveTurns<N extends ThreadNote, P extends ThreadProposal>(threads: readonly Thread<N, P>[] | null | undefined, conversation: { session?: string; queued?: string[]; live?: Record<string, { requestId: string | null; text: string; activity: Array<{ tool: string | null; label: string }>; denials: Array<{ tool: string; input: string }>; outcome: "done" | "failed" | null; startedAt: string | null }> } | null | undefined): LiveThread<N, P>[];
export declare function threadHolding<N extends ThreadNote, P extends ThreadProposal>(threads: readonly Thread<N, P>[] | null | undefined, noteId: string | null | undefined): Thread<N, P> | null;
export declare function composerSubject(label: string | null | undefined): string;
export declare function replyToNote<O>(input: { requestId: string; text: string; record: (reply: { requestId: string; text: string }) => Promise<unknown>; deliver?: ((invocations: string[]) => O) | null; invocations: (requestId: string) => string[] }): Promise<O | "waiting">;
