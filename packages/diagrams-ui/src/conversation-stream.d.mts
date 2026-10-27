// Type declarations for conversation-stream.mjs (the live turn — @aof/diagrams-ui).

export type SessionState = "not-started" | "starting" | "answering" | "idle" | "ended" | "unavailable";
export type LiveActivity = { tool: string | null; label: string };
export type LiveDenial = { tool: string; input: string };
export type LiveTurn = { requestId: string | null; text: string; activity: LiveActivity[]; denials: LiveDenial[]; outcome: "done" | "failed" | null; startedAt: string | null };
export type ConversationState = { session: SessionState; reason: string | null; queued: string[]; current: string | null | undefined; live: Record<string, LiveTurn>; batch: LiveTurn | null };
export type ConversationEvent = { type: string; at?: string; requestId?: string | null; state?: string; reason?: string | null; text?: string; tool?: string; label?: string; outcome?: string; denials?: LiveDenial[]; queued?: string[] };

export declare const SESSION: Readonly<{ notStarted: "not-started"; starting: "starting"; answering: "answering"; idle: "idle"; ended: "ended"; unavailable: "unavailable" }>;
export declare const CONVERSATION_INITIAL: ConversationState;
export declare function conversationStep(state: ConversationState | null | undefined, event: ConversationEvent): ConversationState;
export declare function denialLine(denial: LiveDenial | null | undefined): string;
export declare function batchLine(state: ConversationState | null | undefined): string | null;
export declare function sessionChip(state: ConversationState | null | undefined): { label: string; live: boolean; title?: string };
