import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { clockOf, composerSubject, proposalOutcome, replyTarget, turnAuthor } from "./conversation-model.mjs";
import type { Conversation, ConversationNote, ListedProposal, Thread, ThreadNote, ThreadProposal, Turn } from "./conversation-model.mjs";
import { describeCounts } from "./editor-state.mjs";

// THE CONVERSATION PANEL (milestone 172 / ADR-003 §1, DESIGN "The conversation panel"): one panel beside
// the canvas holding every thread, the proposals, and the composer that asks or saves a note. It draws
// `conversation-model.mjs`'s answer and computes nothing the model can; every write is the editor's,
// handed in. At 1280 it is a 380 px column; under 900 px it is a 340 px drawer over the canvas's right
// edge, and collapsing it leaves a slim tab to reopen it. It sits beside the SDK's container, not in it.

type Props<N extends ThreadNote, P extends ThreadProposal> = {
  conversation: Conversation<N, P>;
  openKey: string | null; onOpen: (key: string | null) => void;
  collapsed: boolean; onCollapse: (collapsed: boolean) => void;
  selectionLabel: string; readOnly: boolean; ready: boolean; busy: boolean; loading: boolean; error: string | null;
  session: { label: string; title?: string; live?: boolean };
  waiting: number; canFirstDraft: boolean; notice: string | null; invocation: string | null; previewNote: string | null;
  onAsk: (text: string) => Promise<boolean>; onSaveNote: (text: string) => Promise<boolean>; onReviewNotes: () => void; onFirstDraft: () => void;
  onReply: (note: ConversationNote<N, P>, text: string) => Promise<string | null>; onWithdraw: (note: ConversationNote<N, P>) => void;
  onShowOnCanvas: (thread: Thread<N, P>) => void; onPreview: (proposal: P) => void;
  onAccept: (proposal: P) => Promise<void>; onReject: (proposal: P, reason: string) => Promise<void>;
  onCopyCommand: (command: string) => void;
};

const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const BUTTON = `rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50 ${RING}`;
const PRIMARY = `rounded-md border border-primary bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 ${RING}`;
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
// The SDK binds most single keys on the document, and its keyup clears the canvas selection on a space
// (171 F-171-02): a key typed anywhere in the panel is the panel's alone, so its root stops both.
const keepKeys = { onKeyDown: (event: KeyboardEvent) => event.stopPropagation(), onKeyUp: (event: KeyboardEvent) => event.stopPropagation() };

function TurnView({ turn }: { turn: Turn }) {
  const mine = turn.by !== "architect";
  return <li className="space-y-1">
    <p><span className="font-semibold">{turnAuthor(turn)}</span> <span className="text-[11px] text-muted-foreground">{clockOf(turn.at)}</span></p>
    <p className={mine ? "whitespace-pre-wrap rounded-lg bg-muted px-2 py-1.5" : "whitespace-pre-wrap"}>{turn.text}</p>
  </li>;
}

function ProposalCard<P extends ThreadProposal>({ proposal, subject, readOnly, ready, busy, onPreview, onAccept, onReject }: {
  proposal: P; subject?: string | null; readOnly: boolean; ready: boolean; busy: boolean;
  onPreview: (proposal: P) => void; onAccept: (proposal: P) => Promise<void>; onReject: (proposal: P, reason: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const outcome = proposalOutcome(proposal);
  const run = async (kind: "accept" | "reject", action: () => Promise<void>) => {
    setWorking(kind); setError(null);
    try { await action(); setRejecting(false); setReason(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setWorking(null); }
  };
  return <div data-aof-proposal={proposal.id} className="rounded-md border border-l-[3px] border-border border-l-accent bg-background p-2">
    {subject ? <p className="text-[11px] text-muted-foreground">On {subject}</p> : null}
    <p className="font-semibold">{proposal.summary}</p>
    <p className="text-muted-foreground">{describeCounts(proposal)}</p>
    {outcome ? <p className="mt-1 text-muted-foreground" data-aof-proposal-outcome="">{outcome}</p>
      : readOnly ? null
      : rejecting ? <div className="mt-2 flex flex-wrap items-center gap-2">
        <input aria-label="Rejection reason (optional)" value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" className={`min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1 ${RING}`} />
        <button type="button" aria-label={`Confirm reject proposal: ${proposal.summary}`} disabled={busy || working !== null} onClick={() => void run("reject", () => onReject(proposal, reason.trim()))} className={BUTTON}>{working === "reject" ? "Rejecting…" : "Confirm reject"}</button>
        <button type="button" onClick={() => { setRejecting(false); setReason(""); }} className={BUTTON}>Cancel</button>
      </div>
      : <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" aria-label={`Preview proposal: ${proposal.summary}`} disabled={!ready} onClick={() => onPreview(proposal)} className={BUTTON}>Preview</button>
        <button type="button" aria-label={`Accept proposal: ${proposal.summary}`} disabled={!ready || busy || working !== null} onClick={() => void run("accept", () => onAccept(proposal))} className={PRIMARY}>{working === "accept" ? "Accepting…" : "Accept"}</button>
        <button type="button" aria-label={`Reject proposal: ${proposal.summary}`} disabled={busy || working !== null} onClick={() => setRejecting(true)} className={BUTTON}>Reject</button>
      </div>}
    {error ? <p role="alert" className="mt-1 text-destructive">{error}</p> : null}
  </div>;
}

function ReplyField({ onReply }: { onReply: (text: string) => Promise<string | null> }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true); setError(null); setSent(null);
    try { setSent(await onReply(text.trim())); setText(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setSending(false); }
  };
  return <div className="border-t border-border px-3 py-2">
    <div className="flex items-start gap-2">
      <textarea aria-label="Reply to the architect" rows={Math.min(4, Math.max(1, text.split("\n").length))} value={text} disabled={sending} maxLength={10000}
        placeholder="Reply…" onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
        className={`min-w-0 flex-1 resize-none rounded-md border border-border bg-background px-2 py-1 disabled:opacity-60 ${RING}`} />
      <button type="button" disabled={sending || !text.trim()} onClick={() => void send()} className={BUTTON}>{sending ? "Sending…" : "Reply"}</button>
    </div>
    {error ? <p role="alert" className="mt-1 text-destructive">{error}</p> : null}
    {sent ? <p role="status" className="mt-1 text-muted-foreground">{sent}</p> : null}
  </div>;
}

function ThreadCard<N extends ThreadNote, P extends ThreadProposal>({ thread, open, props }: { thread: Thread<N, P>; open: boolean; props: Props<N, P> }) {
  const card = useRef<HTMLElement | null>(null);
  useEffect(() => { if (open) card.current?.scrollIntoView?.({ block: "nearest" }); }, [open]);
  const count = thread.notes.length;
  const state = `${thread.state}${count > 1 ? ` · ${count} notes` : ""}`;
  if (!open) {
    return <button type="button" data-aof-thread={thread.key} aria-expanded={false} aria-label={`Open the conversation on ${thread.subject}`} onClick={() => props.onOpen(thread.key)}
      className={`block w-full rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-muted/40 ${RING}`}>
      <span className="flex items-baseline gap-2"><span className="min-w-0 flex-1 truncate font-semibold">{thread.subject}</span><span className="shrink-0 text-[11px] text-muted-foreground">{state}</span></span>
      {thread.lastTurn ? <span className="block truncate text-muted-foreground">{turnAuthor(thread.lastTurn)}: {oneLine(thread.lastTurn.text)}</span> : null}
    </button>;
  }
  const target = replyTarget(thread);
  return <section ref={card} data-aof-thread={thread.key} data-open="" aria-label={`Conversation on ${thread.subject}`} className="rounded-lg border border-primary bg-card ring-1 ring-primary">
    <header className="flex items-baseline gap-2 border-b border-border px-3 py-2">
      <button type="button" aria-expanded={true} aria-label={`Collapse the conversation on ${thread.subject}`} onClick={() => props.onOpen(null)} className={`min-w-0 flex-1 truncate text-left font-semibold ${RING}`}>{thread.subject}</button>
      <span className="shrink-0 text-[11px] text-muted-foreground">{state}</span>
      {thread.selectedIds.length ? <button type="button" disabled={!props.ready} onClick={() => props.onShowOnCanvas(thread)} className={`shrink-0 text-[11px] text-muted-foreground hover:text-foreground ${RING}`}>Show on canvas</button> : null}
    </header>
    <ol className="space-y-3 px-3 py-2" aria-label="Turns, oldest first">
      {thread.notes.flatMap((note) => [
        ...note.turns.map((turn, index) => <TurnView key={`${note.id}-${index}`} turn={turn} />),
        ...note.proposals.map((proposal) => <li key={proposal.id} className="space-y-1">
          <p><span className="font-semibold">Architect</span> <span className="text-[11px] text-muted-foreground">{clockOf(proposal.createdAt)}</span></p>
          {proposal.rationale ? <p className="whitespace-pre-wrap">Proposed: {proposal.rationale}</p> : null}
          <ProposalCard proposal={proposal} readOnly={props.readOnly} ready={props.ready} busy={props.busy} onPreview={props.onPreview} onAccept={props.onAccept} onReject={props.onReject} />
        </li>),
        ...(note.status === "open" && !props.readOnly ? [<li key={`${note.id}-withdraw`}><button type="button" aria-label={`Withdraw note: ${note.request ?? ""}`} disabled={props.busy} onClick={() => props.onWithdraw(note)} className={`text-[11px] text-muted-foreground underline hover:text-foreground disabled:opacity-50 ${RING}`}>Withdraw this note</button></li>] : []),
      ])}
    </ol>
    {!props.readOnly && target ? <ReplyField onReply={(text) => props.onReply(target, text)} /> : null}
  </section>;
}

function Composer<N extends ThreadNote, P extends ThreadProposal>({ props }: { props: Props<N, P> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async (action: (text: string) => Promise<boolean>) => {
    setError(null);
    try { if (await action(text.trim())) setText(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
  };
  const disabled = !props.ready || props.busy || !text.trim();
  return <div className="shrink-0 border-t border-border px-3 py-2" data-aof-composer="">
    <label htmlFor="architect-request"><span className="font-semibold">Ask the architect</span> <span className="text-muted-foreground">· {composerSubject(props.selectionLabel)}</span></label>
    <textarea id="architect-request" rows={Math.min(6, Math.max(1, text.split("\n").length))} value={text} maxLength={10000} placeholder="Ask a question or request a change…"
      onChange={(event) => setText(event.target.value)}
      className={`mt-1 w-full resize-none rounded-md border border-border bg-background px-2 py-1 ${RING}`} />
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <button type="button" aria-label="Ask architect" disabled={disabled} onClick={() => void submit(props.onAsk)} className={PRIMARY}>Ask</button>
      <button type="button" aria-label="Save as note" disabled={disabled} onClick={() => void submit(props.onSaveNote)} className={BUTTON}>Save as note</button>
      {props.canFirstDraft ? <button type="button" aria-label="Request a first draft" disabled={!props.ready || props.busy} onClick={props.onFirstDraft} className={BUTTON}>Request a first draft</button> : null}
      {props.waiting > 0 ? <span className="ml-auto text-[11px] text-muted-foreground">{props.waiting} note{props.waiting === 1 ? "" : "s"} waiting · <button type="button" aria-label="Review notes" disabled={!props.ready || props.busy} onClick={props.onReviewNotes} className={`underline hover:text-foreground disabled:opacity-50 ${RING}`}>Review with the architect</button></span> : null}
    </div>
    {error ? <p role="alert" className="mt-1 text-destructive">{error}</p> : null}
    {props.notice ? <p role="status" className="mt-1 text-muted-foreground">{props.notice}</p> : null}
    {props.invocation ? <div className="mt-1 flex items-center gap-2"><code aria-label="Architect command" className="min-w-0 flex-1 truncate rounded-md border border-border px-2 py-1">{props.invocation}</code>
      <button type="button" aria-label="Copy architect command" onClick={() => props.onCopyCommand(props.invocation as string)} className={BUTTON}>Copy</button></div> : null}
  </div>;
}

function Tab({ selected, onSelect, children, count }: { selected: boolean; onSelect: () => void; children: ReactNode; count: number }) {
  return <button type="button" role="tab" aria-selected={selected} onClick={onSelect}
    className={`flex items-center gap-1.5 border-b-2 px-2 py-2 ${selected ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"} ${RING}`}>
    {children}<span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">{count}</span>
  </button>;
}

export function ConversationPanel<N extends ThreadNote, P extends ThreadProposal>(props: Props<N, P>) {
  const [tab, setTab] = useState<"conversations" | "proposals">("conversations");
  const { threads, proposals, pending } = props.conversation;
  // A pin or an ask opens a thread on the Conversations tab.
  useEffect(() => { if (props.openKey) setTab("conversations"); }, [props.openKey]);
  if (props.collapsed) {
    return <button type="button" data-aof-conversation-tab="" aria-label="Open the conversation panel" onClick={() => props.onCollapse(false)}
      className={`absolute right-0 top-3 z-20 rounded-l-md border border-r-0 border-border bg-card px-1.5 py-3 text-xs font-semibold text-foreground shadow-sm [writing-mode:vertical-rl] ${RING}`}>
      Architect{pending ? ` · ${pending}` : ""}
    </button>;
  }
  const open = threads.find((thread) => thread.key === props.openKey) ?? null;
  // The open thread first, then the rest by their latest activity (the model's order).
  const ordered = open ? [open, ...threads.filter((thread) => thread !== open)] : threads;
  return <aside aria-label="Conversations with the architect" data-aof-conversation-panel="" {...keepKeys}
    className="absolute inset-y-0 right-0 z-20 flex w-[340px] flex-col border-l border-border bg-card text-xs text-foreground shadow-lg min-[900px]:static min-[900px]:w-[380px] min-[900px]:shrink-0 min-[900px]:shadow-none">
    <header className="flex items-center gap-2 border-b border-border px-3 py-2">
      <h2 className="text-sm font-semibold">Architect</h2>
      <span title={props.session.title} data-aof-session-chip="" className={`flex items-center gap-1 rounded-full px-2 py-px text-[11px] ${props.session.live ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
        <span aria-hidden="true" className={`size-1.5 rounded-full ${props.session.live ? "bg-primary" : "bg-muted-foreground"}`} />{props.session.label}
      </span>
      <button type="button" aria-label="Collapse the conversation panel" onClick={() => props.onCollapse(true)} className={`ml-auto rounded-md px-1.5 py-0.5 text-muted-foreground hover:bg-muted ${RING}`}>⇥</button>
    </header>
    <div role="tablist" aria-label="Conversation views" className="flex gap-2 border-b border-border px-3">
      <Tab selected={tab === "conversations"} onSelect={() => setTab("conversations")} count={threads.length}>Conversations</Tab>
      <Tab selected={tab === "proposals"} onSelect={() => setTab("proposals")} count={pending}>Proposals</Tab>
    </div>
    <div role="tabpanel" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      {props.error ? <p role="alert" className="text-destructive">{props.error}</p> : null}
      {props.previewNote ? <p role="status" data-aof-preview-note="" className="text-muted-foreground">{props.previewNote}</p> : null}
      {props.loading ? <div aria-hidden="true" className="space-y-2">{[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
        : tab === "conversations"
          ? threads.length === 0 ? <p className="text-muted-foreground">No conversations yet. Select a shape and ask, or ask about the whole diagram below.</p>
            : ordered.map((thread) => <ThreadCard key={thread.key} thread={thread} open={thread === open} props={props} />)
          : proposals.length === 0 ? <p className="text-muted-foreground">No proposals yet. The architect proposes a change when a note asks for one.</p>
            : proposals.map((proposal: ListedProposal<P>) => <ProposalCard key={proposal.id} proposal={proposal} subject={proposal.subject ?? undefined} readOnly={props.readOnly} ready={props.ready} busy={props.busy} onPreview={props.onPreview} onAccept={props.onAccept} onReject={props.onReject} />)}
    </div>
    {props.readOnly ? null : <Composer props={props} />}
  </aside>;
}
