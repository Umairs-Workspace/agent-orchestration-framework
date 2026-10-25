import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { noteStatus, threadOf, turnAuthor } from "./note-threads.mjs";
import type { NotePin, ThreadNote } from "./note-threads.mjs";

// A NOTE'S PIN AND ITS THREAD (milestone 171 / ADR-006) — components of the one canvas overlay
// (ADR-001), which places them through `canvas-anchor.mjs`; nothing here computes a position. The pin
// is a small filled circle on the shape's corner — the console's primary colour when the architect has
// the last word, muted otherwise — with a count when the shape holds more than one note. The thread
// reads the turns oldest first and takes a reply.

const RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const PIN_SIZE = 12;
export const pinSize = (pin: NotePin) => ({ width: pin.count > 1 ? 20 : PIN_SIZE, height: PIN_SIZE });
const timeOf = (at: string | null) => (at ? new Date(at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "");

export function NotePinButton({ pin, at, open, onToggle }: { pin: NotePin; at: { x: number; y: number }; open: boolean; onToggle: () => void }) {
  const size = pinSize(pin);
  return <button type="button" data-aof-note-pin={pin.key} aria-expanded={open}
    aria-label={`${pin.count} note${pin.count === 1 ? "" : "s"} on ${pin.label}${pin.answered ? ", the architect answered" : ""}`}
    onClick={onToggle} style={{ left: at.x, top: at.y, width: size.width, height: size.height }}
    className={`pointer-events-auto absolute flex items-center justify-center rounded-full text-[9px] font-semibold leading-none text-white shadow-sm ${pin.answered ? "bg-primary" : "bg-muted-foreground"} ${RING}`}>
    {pin.count > 1 ? pin.count : null}
  </button>;
}

export function NoteThreadPopover({ pin, at, onClose, onReply, boxRef, canReply }: {
  pin: NotePin; at: { x: number; y: number }; onClose: () => void; canReply: boolean;
  onReply: (note: ThreadNote, text: string) => Promise<string | null>; boxRef: (element: HTMLDivElement | null) => void;
}) {
  // The thread answers its LATEST note: a reply continues the conversation the shape is having now.
  const note = pin.notes[pin.notes.length - 1];
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { input.current?.focus(); }, [pin.key]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true); setError(null); setSent(null);
    try { setSent(await onReply(note, text.trim())); setText(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setSending(false); }
  };
  const onKey = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation(); // the SDK binds most single keys on its container
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
    else if (event.key === "Enter" && !event.shiftKey && event.target === input.current) { event.preventDefault(); void send(); }
  };
  return <div ref={boxRef} role="dialog" aria-label={`Notes on ${pin.label}`} data-aof-note-thread={pin.key} onKeyDown={onKey} onKeyUp={(event) => event.stopPropagation() /* F-171-02: the SDK's document keyup */}
    style={{ left: at.x, top: at.y }}
    className="pointer-events-auto absolute flex max-h-[50%] w-80 flex-col rounded-lg border border-border bg-card text-xs text-foreground shadow-md">
    <header className="flex items-baseline gap-2 border-b border-border px-3 py-2">
      <strong className="min-w-0 flex-1 truncate">{pin.label}</strong>
      <span className="text-muted-foreground">{noteStatus(note)}</span>
    </header>
    <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2" aria-label="Turns, oldest first">
      {pin.notes.flatMap((item) => threadOf(item).map((turn, index) => <li key={`${item.id}-${index}`}>
        <p><span className="font-semibold">{turnAuthor(turn)}</span> <span className="text-muted-foreground">{timeOf(turn.at)}</span></p>
        <p className="whitespace-pre-wrap">{turn.text}</p>
      </li>))}
    </ol>
    {canReply ? <div className="border-t border-border px-3 py-2">
      <div className="flex items-start gap-2">
        <textarea ref={input} aria-label="Reply to the architect" rows={Math.min(4, Math.max(1, text.split("\n").length))} value={text} disabled={sending} maxLength={10000}
          placeholder="Reply" onChange={(event) => setText(event.target.value)}
          className={`min-w-0 flex-1 resize-none rounded border border-border bg-background px-2 py-1 disabled:opacity-60 ${RING}`} />
        <button type="button" disabled={sending || !text.trim()} onClick={() => void send()} className={`rounded border border-border px-2 py-1 disabled:opacity-50 ${RING}`}>{sending ? "Sending…" : "Reply"}</button>
        <button type="button" onClick={onClose} className={`rounded border border-border px-2 py-1 ${RING}`}>Close</button>
      </div>
      {error ? <p role="alert" className="mt-1 text-red-700">{error}</p> : null}
      {sent ? <p role="status" className="mt-1 text-muted-foreground">{sent}</p> : null}
    </div> : <div className="flex justify-end border-t border-border px-3 py-2"><button type="button" onClick={onClose} className={`rounded border border-border px-2 py-1 ${RING}`}>Close</button></div>}
  </div>;
}
