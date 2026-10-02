// The ask card (131/05; ADR-006 §4, DESIGN §1): the operator's answer to a session waiting on a
// question, first in the detail panel's body on every tab. It is a RENDERER. Every word and state
// it paints is `askCardState`'s (action.mjs), where each rule is tested, and it holds only what a
// render needs between clicks: the typed text, the send phase, the refusal, the sent document, the
// expanded flag and whether the question is clamped. It keys on the row's ask fact, never on
// `item.execution`, so a local lane with no mesh overlay shows it too.
//
// No fast path, by design: the reply is empty on mount with no placeholder, Enter is a newline, and
// ONE button sends. The question is plain text and never reaches `Markdown.tsx`, which renders
// unsanitised HTML and trusts only local doc files; a session's last message is model output that
// may echo a hostile repo's text.
import { useLayoutEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { workApi } from "./api";
import type { AnswerDocument, WorkItem } from "./api";
import { askCardState } from "./action.mjs";
import type { AskCardPhase } from "./action.mjs";

export function AskCard({ item, actor, now }: { item: WorkItem; actor: string; now: number }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<AskCardPhase>("idle");
  const [error, setError] = useState<{ code?: string; message?: string } | null>(null);
  const [sent, setSent] = useState<AnswerDocument | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const fieldId = `ask-answer-${item.ref.split("/").join("-")}`;
  const card = askCardState(item.ask, { ref: item.ref, phase, error, sent, text, expanded, nowMs: now });

  // The toggle shows only when the 6-line clamp actually cuts the question.
  useLayoutEffect(() => {
    const element = questionRef.current;
    if (element != null && !expanded) setClamped(element.scrollHeight > element.clientHeight + 1);
  }, [card?.question, expanded]);

  if (card == null) return null;

  const send = async () => {
    setPhase("sending");
    try {
      setSent(await workApi.answer({ ref: item.ref, text, actor }));
      setError(null);
      setPhase("idle");
    } catch (failure) {
      const coded = failure as Error & { code?: string };
      setError({ code: coded.code, message: coded.message });
      setPhase("error");
    }
  };

  return (
    <div className="mb-4 space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
      {/* The heading never breaks; a long parked cost wraps to its own line, still right-aligned. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-amber-500" />
        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-foreground">{card.heading}</span>
        {card.cost ? <span className="mono ml-auto text-[11px] text-muted-foreground">{card.cost}</span> : null}
      </div>

      {card.unreadable ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">{card.unreadable}</p>
      ) : (
        <div className="space-y-1">
          <p
            ref={questionRef}
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground${expanded ? "" : " line-clamp-6"}`}
          >
            {card.question}
          </p>
          {clamped || expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {card.toggle}
            </button>
          ) : null}
        </div>
      )}

      {card.notice ? <p className="text-sm text-foreground">{card.notice}</p> : null}

      {card.receipt ? (
        <div className="space-y-2">
          <p className="mono text-xs text-primary">{card.receipt}</p>
          <p className="whitespace-pre-wrap break-words border-l-2 border-border pl-3 text-sm">{sent != null ? text : item.ask?.answer}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor={fieldId} className="block text-[11px] font-semibold text-muted-foreground">
            Your answer
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            readOnly={card.button?.busy === true}
            className="min-h-20 w-full rounded-md border border-input bg-card p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">{card.helper}</p>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={card.button?.disabled}
              aria-busy={card.button?.busy}
              onClick={() => void send()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {card.button?.label}
            </button>
          </div>
        </div>
      )}

      <p aria-live="polite" title={card.message?.title ?? undefined} className="mono text-xs text-accent">
        {card.message?.text ?? ""}
      </p>
    </div>
  );
}
