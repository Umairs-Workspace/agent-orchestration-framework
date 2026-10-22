// The LOOP LINE — one running loop, composed for any surface that shows it (162/ADR-003 §2).
// A framework-free ESM module: no React, no DOM, no I/O. Its one clock read is the `now` a
// caller hands in (the browser's, at render), defaulted to `Date.now()` and never stored.
//
// WHY IT LIVES HERE. `fleetLoopLines` was the fleet's (130/ADR-005 §5). The terminals home now
// shows the same line above its grid, and the home may not import the fleet (49/ADR-001,
// gated). A copy in the home would give the quiet rule two homes, so the line is PROMOTED to the
// tree's shared directory and both surfaces import it; `apps/ui/src/fleet/runs.mjs` re-exports
// it for the fleet's existing readers.
//
// THE ANATOMY (DESIGN §Surface 1, left → right), with 162's progress segment at the tail:
//   `loop <scope> [· stopping | · cancelling] [· <phase> <ref>] · cycle <n>[ of <cap>]
//    [· <elapsed> [· active <age> ago | · quiet <age>]]`
// FAIL-CLOSED — the line never prints a value the mint could not have produced: the
// `<phase> <ref>` segment only when both are non-empty strings; the `cycle` segment only for a
// positive-integer `cycle`; ` of <cap>` only for a positive-integer `cap`; an unrecognised
// `stop` renders no state word and is reported `null`; and the progress segment only while a
// drive is current (a `ref`) and its start parses. `level` and `supervised` ride the `title`
// tail: `… · L2 · supervised`.
//
// THE QUIET RULE (162/ADR-003 §3, EXAMPLES Q3). "Last activity" is the drive run's consumed
// heartbeat — the value the loop's own stall bound reads — so the flag and the kill agree on
// what quiet is. Under LOOP_QUIET_AFTER_MS it reads `active <age> ago`; at it and beyond,
// `quiet <age>` in the warning tone. With no heartbeat yet it shows the elapsed time alone.

// The ONE threshold: ten minutes without a heartbeat is quiet.
export const LOOP_QUIET_AFTER_MS = 10 * 60 * 1000;

// The ONE warning tone a quiet progress segment renders in (the board's existing warning colour);
// both surfaces read it here rather than re-typing the class (162 verify, F-03).
export const LOOP_QUIET_CLASS = "text-amber-500";

// THE WIRE'S TWO WORDS, AND THE THREE RUNGS — see `apps/ui/src/fleet/runs.mjs`, whose Stop
// button climbs the same ladder this line's state word reads.
const STOP_WORDS = Object.freeze({ drain: "stopping", cancel: "cancelling" });
const WIRE_RUNG = Object.freeze({ drain: 2, cancel: 3 });
const HELD_WORD = Object.freeze({ 2: "drain", 3: "cancel" });

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

export function stopWord(value) {
  return value === "drain" || value === "cancel" ? value : null;
}

// The plain codepoint comparison the region already uses (38 S6) — never a locale collation,
// which could disagree with the Rust surface's byte-wise sort.
function byScopeThenLoopRunId(left, right) {
  if (left.scope !== right.scope) return left.scope < right.scope ? -1 : 1;
  return left.loopRunId < right.loopRunId ? -1 : left.loopRunId > right.loopRunId ? 1 : 0;
}

// The remembered rung, admitted ONLY while it names this entry's drive (`runId`), else 0.
function rememberedRung(loop, remembered) {
  if (remembered == null || typeof remembered !== "object") return 0;
  if (!Number.isInteger(remembered.rung) || remembered.runId !== loop?.runId) return 0;
  return remembered.rung;
}

// loopStopRung(loop, remembered) — the rung the card stands at: the wire's request plus one,
// raised to the memory for the SAME drive. The line's held word and the button read this one
// answer, so the two can never disagree.
export function loopStopRung(loop, remembered) {
  const wire = stopWord(loop?.stop);
  return Math.max(wire ? WIRE_RUNG[wire] : 1, rememberedRung(loop, remembered));
}

// formatLoopDuration(ms) — the one formatter for an elapsed time and an age: `5 s` under a
// minute, `14 min` under an hour (whole minutes, floored — 9 min 59 s is `9 min`), and
// `1 h 05 min` beyond. A negative span (a clock ahead of the browser's) reads as `0 s`.
// `packages/work-loop/src/drive-status.mjs` keeps a twin (`formatDriveDuration`): this file stays
// zero-import and the loop kernel may not import a sibling package, so neither can read the other.
// FF-16202 drives both over the same spans and fails if they ever disagree (162 verify, F-01).
export function formatLoopDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

function instant(value) {
  if (!nonEmptyString(value)) return null;
  const at = Date.parse(value);
  return Number.isFinite(at) ? at : null;
}

// loopProgress(loop, now) → `{ text, quiet }` | null — the progress segment. Null between
// drives (no `ref`) and when the drive's start is absent or unparseable: a time the wire did
// not state is never invented.
export function loopProgress(loop, now = Date.now()) {
  if (!nonEmptyString(loop?.ref)) return null;
  const startedAt = instant(loop?.driveStartedAt);
  if (startedAt == null || !Number.isFinite(now)) return null;
  const elapsed = formatLoopDuration(now - startedAt);
  const activityAt = instant(loop?.lastActivityAt);
  if (activityAt == null) return { text: elapsed, quiet: false };
  const age = now - activityAt;
  const quiet = age >= LOOP_QUIET_AFTER_MS;
  return { text: quiet ? `${elapsed} · quiet ${formatLoopDuration(age)}` : `${elapsed} · active ${formatLoopDuration(age)} ago`, quiet };
}

// fleetLoopLines(presence, memory, now) — one entry per `presence.loops[]` element, ascending
// by `scope` (ties by `loopRunId`), each `{ key, line, title, loopRunId, scope, workspaceId,
// runId, stop, sessionId, head, progress, quiet }`. `memory` (optional — the fleet card's, a Map of
// `{ rung, runId }` per `loopRunId`) raises each entry's `stop` to the HELD word for the same
// drive before the line is composed (DESIGN "held locally"). `progress` is the segment's text
// and `quiet` its warning tone, both null/false when the line carries none. An absent, null or
// non-array `loops` is `[]`, never a throw. The presence record is read, never mutated.
export function fleetLoopLines(presence, memory, now = Date.now()) {
  const loops = Array.isArray(presence?.loops) ? presence.loops : [];
  return loops
    .filter((loop) => loop != null && typeof loop === "object")
    .map((loop) => {
      const scope = String(loop.scope ?? "");
      const stop = HELD_WORD[loopStopRung(loop, memory instanceof Map ? memory.get(loop.loopRunId) : undefined)] ?? null;
      const parts = [`loop ${scope}`];
      if (stop) parts.push(STOP_WORDS[stop]);
      if (nonEmptyString(loop.phase) && nonEmptyString(loop.ref)) parts.push(`${loop.phase} ${loop.ref}`);
      if (positiveInteger(loop.cycle)) parts.push(positiveInteger(loop.cap) ? `cycle ${loop.cycle} of ${loop.cap}` : `cycle ${loop.cycle}`);
      const head = parts.join(" · ");
      const progress = loopProgress(loop, now);
      const line = progress ? `${head} · ${progress.text}` : head;
      const tail = [];
      if (nonEmptyString(loop.level)) tail.push(loop.level);
      if (loop.supervised === true) tail.push("supervised");
      return {
        key: `loop:${loop.loopRunId}`,
        line,
        title: [line, ...tail].join(" · "),
        loopRunId: String(loop.loopRunId ?? ""),
        scope,
        workspaceId: typeof loop.workspaceId === "string" ? loop.workspaceId : null,
        // The drive this entry names — what the rung memory is keyed against.
        runId: typeof loop.runId === "string" ? loop.runId : null,
        stop,
        // The drive's session, when one has been captured — what the home's empty state names.
        sessionId: nonEmptyString(loop.sessionId) ? loop.sessionId : null,
        // The line without its progress, so a surface can tone the progress alone.
        head,
        progress: progress?.text ?? null,
        quiet: progress?.quiet === true,
      };
    })
    .sort(byScopeThenLoopRunId);
}
