// THE NEW-SESSION AFFORDANCE — the terminals home's trigger and panel (milestone 50 / story 04,
// lane C; ADR-008 decision 10; DESIGN §S1 the trigger, §S2 the panel, §S3 the outcome region).
//
// ONE COMPONENT, AND IT HOLDS NO DECISION. Which options exist, which value is chosen, what the
// body carries, which of the eight states this is, what the line says and when the two deadlines
// expire are ALL `./session-launcher.mjs`'s — a `node:test`-drivable module, because this repo
// has no React harness and "a rule that can only be exercised through a component is a rule with
// no test" (./feed-axis.mjs:6-9). What lives here is JSX, four dismissal doors, the POST and the
// outcome poll.
//
// NO BROWSER GLOBAL, ANYWHERE (`acd-home-layout-is-a-filter` sweeps this directory for one). The
// fleet's own picker attaches DOCUMENT-scoped `pointerdown`/`keydown` listeners; this surface may
// not, so dismissal rides React's own events — `onKeyDown` for `Escape` and a container-scoped
// `onBlur` for focus leaving, which is also what a press outside produces (the press moves focus
// off the panel). Both are on the container, so they cover the trigger and every field.
//
// ITS OWN POST AND ITS OWN POLL, NOT THE PAGE'S. `Home.tsx` is the thin consumer its own header
// declares — "JSX, one fetch, one poll, and nothing else" — and handing it a second fetch, a
// second cadence and a state machine would give that file the second author its budget entry
// warns against. The launcher's calls belong to the launcher.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as React from "react";
import {
  HOME_SESSION_PATH,
  LAUNCHER_ACTION_BUSY,
  LAUNCHER_ACTION_REST,
  LAUNCHER_DISPATCHED,
  LAUNCHER_DISPATCHING,
  LAUNCHER_OUTCOME_POLL_MS,
  LAUNCHER_STARTED,
  LAUNCHER_TRIGGER_WIDTH_CH,
  launcherOpenDefaults,
  launcherReduce,
  launcherRest,
  sessionLauncherView,
  type LauncherField,
  type LauncherMachine,
  type LauncherStatusPayload,
} from "./session-launcher.mjs";

// The house's own trigger skin, verbatim (RepoPicker's), and NOT the `primary` tint: a filled
// primary block in a bar means an active scope/segment, and a permanently-tinted control in the
// chrome would out-shout the page. The panel's submit action is where `primary` lives.
const TRIGGER_SKIN = "flex shrink-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition";
const PANEL_SKIN =
  "absolute right-0 top-full z-20 mt-1 block max-h-[60vh] w-[320px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-xs text-popover-foreground shadow-md";
const LABEL_SKIN = "block text-[11px] text-muted-foreground";
const SELECT_SKIN = "mono w-full rounded-md border border-border bg-muted px-2 py-1 text-[11px] disabled:opacity-60";
const ACTION_SKIN =
  "rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50";

// The three states a DEADLINE is still running in — the two the module waits on and the `started`
// decay. Everything else is settled, and a settled attempt has no later time-driven transition.
const TICKING_STATES: ReadonlySet<string> = new Set([LAUNCHER_DISPATCHING, LAUNCHER_DISPATCHED, LAUNCHER_STARTED]);

const optionLabel = (option: { label: string; annotation?: string | null }) =>
  option.annotation == null ? option.label : `${option.label} · ${option.annotation}`;

// A native `<select>` coerces a value it has no option for to its first option — which is the
// measured "names one target, posts another" defect (Fleet.tsx:1235-1249). So a value the payload
// no longer carries is rendered as its OWN row, disabled, with K50-9 beneath the field: the DOM
// value and the module's value stay the same string, and the operator re-aims.
function FieldRow({
  field,
  onChoose,
  inputRef,
}: {
  field: LauncherField;
  onChoose: (value: string | null) => void;
  inputRef?: React.Ref<HTMLSelectElement>;
}) {
  const id = `aof-launcher-${field.id}`;
  const grouped = field.options.some((option) => (option as { group?: string | null }).group != null);
  const groups = grouped
    ? [...new Set(field.options.map((option) => (option as { group?: string | null }).group ?? ""))]
    : [""];
  return (
    <div className="px-1 py-1">
      <label className={LABEL_SKIN} htmlFor={id}>
        {field.label}
      </label>
      <select
        id={id}
        ref={inputRef}
        className={SELECT_SKIN}
        value={field.value ?? ""}
        disabled={field.disabled}
        title={field.reason ?? field.value ?? undefined}
        onChange={(event) => onChoose(event.target.value === "" ? null : event.target.value)}
      >
        {field.value != null && field.note != null ? (
          <option value={field.value} disabled>
            {`${field.value} · ${field.note}`}
          </option>
        ) : null}
        {/* The empty row belongs to a REQUIRED field with nothing chosen — never to the item
            field, whose own first row (`none — open the repo root`) already carries `""` and
            states the default's EFFECT rather than its absence. */}
        {field.value == null && field.required ? <option value="">—</option> : null}
        {groups.map((group) => {
          const rows = field.options.filter((option) => ((option as { group?: string | null }).group ?? "") === group);
          const body = rows.map((option) => (
            <option key={option.value ?? "__root"} value={option.value ?? ""}>
              {optionLabel(option as { label: string; annotation?: string | null })}
            </option>
          ));
          return group === "" ? body : <optgroup key={group} label={group}>{body}</optgroup>;
        })}
      </select>
      {/* K50-9 — the anti-coercion rule, made visible in the field it is about, in the module's
          own words for THAT field: F3's list is repo-scoped, so K50-9's "no longer in the mesh"
          would be a second sentence and a false one. */}
      {field.note != null ? <p className="mt-0.5 text-[11px] text-muted-foreground">{field.note}</p> : null}
    </div>
  );
}

export function SessionLauncher({ status }: { status?: LauncherStatusPayload | null }) {
  const [machine, setMachine] = useState<LauncherMachine>(launcherRest);
  // The clock the two deadlines are read against. It ticks only while something is in flight —
  // a resting launcher costs no timer at all.
  const [now, setNow] = useState(() => Date.now());
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  const view = useMemo(() => sessionLauncherView({ status: status ?? null, machine, now }), [status, machine, now]);
  const open = view.panel != null;
  const poll = view.outcomePoll;
  const inFlight = machine.attempt != null;

  // CLOSING IS ONE ACT WITH FOUR DOORS (Escape, a press outside, focus leaving, the `started`
  // decay) and every one of them returns focus to the trigger — splitting them is how the fleet's
  // shipped picker ended up openable and not closable. A dismissal NEVER cancels a dispatch: the
  // reducer's `close` leaves the attempt alone and the trigger carries its residue.
  const close = useCallback((returnFocus = true) => {
    setMachine((current) => launcherReduce(current, { type: "close" }));
    if (returnFocus) triggerRef.current?.focus?.();
  }, []);

  // …and it STOPS once the attempt is settled: a refused/failed/no-answer attempt is held for its
  // residue and has no further deadline, so a clock still ticking every second is a timer running
  // for the life of the page over a state that cannot change with time. (A late grid arrival still
  // revives it — `observe` re-renders, the state becomes `started`, and this effect restarts.)
  const ticking = inFlight && TICKING_STATES.has(view.state);
  useEffect(() => {
    if (!ticking) return undefined;
    // ONE cadence, derived from `HOME_POLL_MS` like everything else here — never a second
    // literal interval that could drift from the deadlines it is used to observe.
    const timer = setInterval(() => setNow(Date.now()), LAUNCHER_OUTCOME_POLL_MS);
    return () => clearInterval(timer);
  }, [ticking]);

  // The grid is the SUCCESS authority: a session appearing under the minted id is the only
  // signal that resolves a dispatch, and it clears a `no answer` line whenever it arrives.
  useEffect(() => {
    if (!inFlight) return;
    setMachine((current) => launcherReduce(current, { type: "observe", at: Date.now(), sessions: (status as { sessions?: unknown } | null)?.sessions }));
  }, [status, inFlight]);

  // The outcome lane — ONLY while `dispatched` holds, always on the CURRENT session id, and it
  // stops the moment the window closes because `outcomePoll` becomes null.
  const pollNode = poll?.nodeId;
  const pollSession = poll?.sessionId;
  const pollEvery = poll?.everyMs;
  const pollPath = poll?.path;
  useEffect(() => {
    if (pollNode == null || pollSession == null || pollPath == null) return undefined;
    let dropped = false;
    const ask = async () => {
      try {
        const response = await fetch(`${pollPath}?nodeId=${encodeURIComponent(pollNode)}&sessionId=${encodeURIComponent(pollSession)}`);
        const body = await response.json().catch(() => null);
        if (dropped || body == null) return;
        setMachine((current) => launcherReduce(current, { type: "outcome", at: Date.now(), outcome: body }));
      } catch {
        // A lane that will not answer is not a second failure to report: the window is still
        // running and the grid is still the success authority.
      }
    };
    void ask();
    const timer = setInterval(() => void ask(), pollEvery);
    return () => {
      dropped = true;
      clearInterval(timer);
    };
  }, [pollNode, pollSession, pollEvery, pollPath]);

  // The `started` decay: the tile is the record from that moment on, so the launcher lets go and
  // the panel closes (DESIGN open question 5).
  useEffect(() => {
    if (!view.settled) return;
    setMachine((current) => launcherReduce(current, { type: "settle" }));
    triggerRef.current?.focus?.();
  }, [view.settled]);

  // Focus moves INTO the panel's first field on open (accessibility requirement 3).
  useEffect(() => {
    if (open) firstFieldRef.current?.focus?.();
  }, [open]);

  const submit = useCallback(async () => {
    const request = view.panel?.request;
    if (request == null) return;
    setMachine((current) => launcherReduce(current, { type: "submit", at: Date.now(), request }));
    setNow(Date.now());
    try {
      const response = await fetch(HOME_SESSION_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => null);
      setMachine((current) => launcherReduce(current, { type: "answer", at: Date.now(), response: { ok: response.ok, status: response.status, body } }));
    } catch (error) {
      setMachine((current) => launcherReduce(current, { type: "answer", at: Date.now(), response: { error } }));
    }
    setNow(Date.now());
  }, [view.panel]);

  const choose = useCallback((field: "node" | "repo" | "item", value: string | null) => {
    setMachine((current) => launcherReduce(current, { type: "choose", field, value }));
  }, []);

  const tone = view.outcome.tone === "destructive" ? "text-destructive" : "text-muted-foreground";

  return (
    <span
      className="relative shrink-0"
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        close();
      }}
      onBlur={(event) => {
        if (!open) return;
        const next = event.relatedTarget as Node | null;
        const container = containerRef.current;
        if (next && container && typeof container.contains === "function" && container.contains(next)) return;
        close(false);
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        // `aria-disabled`, NEVER the `disabled` attribute: the trigger's `title` is the only
        // explanation an unavailable control has, and an element the keyboard skips hides it
        // from exactly the users who need it.
        aria-disabled={view.trigger.disabled ? true : undefined}
        title={view.trigger.reason ?? undefined}
        // DG-50-6 rule 4 — the width is reserved to the LONGEST label the trigger ever reads,
        // including its compact outcome forms, so a state change never moves the summary or the
        // nav. It errs WIDE deliberately: the shell ramp's average advance is under 1ch.
        style={{ minWidth: `${LAUNCHER_TRIGGER_WIDTH_CH}ch` }}
        className={`${TRIGGER_SKIN} ${view.trigger.disabled ? "text-muted-foreground/60" : "hover:border-primary/50"}`}
        onClick={() => {
          if (view.trigger.disabled) return;
          if (open) close();
          else setMachine((current) => launcherReduce(current, { type: "open", defaults: launcherOpenDefaults(status ?? null) }));
        }}
      >
        <span className="whitespace-nowrap">{view.trigger.words}</span>
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          {view.trigger.caret}
        </span>
      </button>
      {view.panel != null ? (
        <span role="dialog" aria-label={view.panel.title} className={PANEL_SKIN}>
          {/* L2 — the panel names its own act, and the ONE caption says what opens. Nothing on
              this surface ever claims a launched session is an assistant (DG-50-4). */}
          <span className="block px-1 pt-1 font-semibold">{view.panel.title}</span>
          <span className="block px-1 pb-1 text-[11px] text-muted-foreground">{view.panel.caption}</span>
          {/* L3/L4 — STACKED, one per row, full width: a 320px panel with three fields on one
              row would reproduce every yield defect the assign row spent two milestones fixing. */}
          {view.panel.fields.map((field, index) => (
            <FieldRow key={field.id} field={field} inputRef={index === 0 ? firstFieldRef : undefined} onChoose={(value) => choose(field.id, value)} />
          ))}
          {/* L5 — the action, right-aligned, its width reserved to its longest label. */}
          <span className="flex justify-end px-1 py-1">
            <button
              type="button"
              className={ACTION_SKIN}
              disabled={view.panel.actionDisabled}
              // DG-13 clause 1, one bar over: the action reserves its LONGEST label in every
              // state, so a label swap cannot move the field above it.
              style={{ minWidth: `${Math.max(LAUNCHER_ACTION_REST.length, LAUNCHER_ACTION_BUSY.length)}ch` }}
              onClick={() => void submit()}
            >
              {view.panel.actionLabel}
            </button>
          </span>
          {/* L6 — the outcome region: ONE line, one state, ever. `role="status"` and never
              `alert` — a refused dispatch is information about the operator's own action — and
              it is the launcher's OWN region, distinct from the grid's. */}
          <span role="status" aria-live="polite" className={`block px-1 pb-1 text-[10.5px] ${tone}`} title={view.outcome.title ?? undefined}>
            {view.outcome.line}
          </span>
        </span>
      ) : null}
    </span>
  );
}
