// The pure session/run current-work-line projection (milestone 38 / story 00 /
// task 04; ARCHITECTURE ADR-004; DESIGN.md §Surface 1 state table). A
// framework-free ESM module — no React, no DOM, no I/O, no clock — the
// fleet-model SIBLING of ui/src/fleet/assignments.mjs / ui/src/board/runs.mjs: it
// projects a presence record's `{ activeRuns, sessions }` (the ADR-001 additive
// shape) down to the NodeCard's row-3 "current-work" line set, so BOTH the desktop
// (36) and web (25) views render byte-identically from the SAME helper (the
// single-data-path discipline, ADR-004's "no divergent collapse rules").
//
// REVIEW FIX (F1, MAJOR): this helper does NOT — and structurally CANNOT — perform
// run→workspace attribution. `activeRuns` on the wire is the FROZEN m23 `string[]`
// of bare run ids (23/ADR-002, `ui/src/fleet/api.ts`'s `PresenceRecord.activeRuns`;
// `readActiveRuns` emits `run.runId` strings) — it carries NO workspace id. The
// per-workspace attribution the ADR-004 "run subsumes a same-workspace session"
// rule needs exists only in the assembler (src/mesh/launcher.mjs), which loops
// per-workspace and therefore knows which workspace each run came from.
//
// MILESTONE 48 / ADR-004 — THE RULE MOVED HERE, and the premise of the paragraph
// above moved with it. The assembler no longer DROPS a same-workspace session: the
// wire now carries EVERY live session (so any of them is addressable as
// `(nodeId, sessionId)` — m48's whole premise), each stamped with the FACT
// `workspaceHasRun` that the assembler alone can compute. This helper applies the
// POLICY over that fact — the identical predicate, one hop later, over a fact it was
// HANDED. It still invents no attribution of its own, and rendered output is
// unchanged for every payload.
//   - m48/ADR-010 R3 — a session is subsumed IFF `workspaceHasRun === true`, a STRICT
//     comparison against the boolean and never truthiness. An ABSENT key renders (a
//     pre-m48 node already subsumed at its OWN producer, so rendering it is what keeps
//     that node's output identical — and absent⇒true would HIDE live work, the m38-F7
//     defect class returning); `null`, `"true"`, `"false"`, `1`, `0` and any object
//     render too. One rule covers the missing key and the malformed value.
//   - m48/ADR-010 R4 — the repo list did NOT deduplicate: two sessions in one repo named
//     that repo twice, and whether it should was routed to milestone 49's DESIGN as an
//     explicit HOLD. **THAT HOLD IS LIFTED — see the rule immediately below.**
//
// MILESTONE 49 / story 01 (DESIGN §The `(session)` line — the dedupe rule, RULED;
// ARCHITECTURE ADR-010) — THE REPO LIST NOW DEDUPLICATES **AND COUNTS**. m48 made a
// session individually addressable, which is what made a second session in one repo
// exist as a distinct record at all; this is the summary line catching up:
//
//     working · demo ×2 (session)          two sessions in `demo`
//     working · aof, demo ×2 (session)     one in `aof`, two in `demo`
//     working · aof, demo (session)        one each — UNCHANGED
//
// The rule, exactly as DESIGN ruled it (the designer's call, not this module's):
//   1. filter on `workspaceHasRun !== true`, strict — UNCHANGED;
//   2. map to `repo`, drop non-strings and empties — UNCHANGED;
//   3. GROUP BY THE EXACT REPO STRING and count. The key is the RAW string: no trim, no
//      case-fold, no normalisation. `Demo` and `demo` are two repos; `demo` and `demo `
//      are two repos; a repo that is only a space is a repo. (A `Map` keys on
//      SameValueZero — string identity — so the grouping cannot normalise by accident.)
//   4. sort the DISTINCT repos with the SAME plain codepoint comparison the line already
//      used, for the same locale-independence reason (the Rust surface sorts byte-wise);
//   5. render a part as `<repo>` at count 1 and `<repo> ×<count>` above it — ONE space
//      before the sign, NONE after it, and the sign is U+00D7 MULTIPLICATION SIGN, never
//      the letter `x` (the same species of typographic character as the U+00B7 the line
//      already carries). `×1` is never written;
//   6. join with `", "` — the frame `working · <parts> (session)` is UNCHANGED.
// DESIGN records what it rejected: a BARE dedupe under-counts the very sessions m48 made
// addressable; one line per session breaks the card row's measured 286px width floor;
// repo+assistant names a tool and still duplicates.
//
// The count is of SURVIVORS, not of sessions: grouping happens AFTER the subsumption
// filter and after blanks/non-strings drop, so a repo holding one live session and one
// the run already accounts for renders `demo`, with no count at all.
//
// THE SECOND IMPLEMENTATION MOVES IN THE SAME COMMIT (ADR-010): Rust
// `session_line_parts()` (app/desktop/crates/core/src/status.rs — spelled
// `session_repos()` in DESIGN and ADR-010, renamed at review because an element is now
// a rendered PART, not a repo name) carries the identical rule, and the two are
// tied together by `crossSurfaceDriftViolations`
// (test/arch/session/acd-captured-producer-fixture.test.mjs) over a CAPTURED payload that — as of
// this milestone — finally exercises two live sessions in one repo.
//
// Rendering rule (node-level, ADR-004's rule applied HERE since m48) — WHICH LINES
// EXIST. What the `(session)` line SAYS is stated ONCE, in the six numbered steps
// above; it is deliberately not restated here (a rule with two homes in one file is a
// rule that can disagree with itself — the m49 review's own finding):
//   - `activeRuns` non-empty ⇒ the aggregate `running N runs` line (N =
//     activeRuns.length, the verbatim m23 baseline reading — ONE line for the
//     whole node, since the wire carries no per-workspace run breakdown).
//   - every session in `sessions[]` that the run set does NOT already account for
//     (`workspaceHasRun !== true`) contributes its repo to ONE shared fallback line
//     `working · <part>[, <part>…] (session)` — DESIGN's "two repos show BOTH,
//     comma-joined under one `working ·` prefix, one trailing `(session)`" reading.
//     The PARTS are the DISTINCT surviving repos (steps 3-5: grouped on the raw
//     string, each said once, carrying ` ×<count>` above one session), in ascending
//     plain-codepoint order (DESIGN §Surface 1 S6) — deterministic across polls, and
//     matched byte-for-byte by the Rust `session_line_parts()`/`current_work()`
//     projection.
//   - a run line AND a session-fallback line can both be present (a run in one
//     workspace + a live session in ANOTHER, unsubsumed, workspace — SPEC's "a
//     node working two repos shows both").
//   - neither anywhere ⇒ the single line `idle`.
// PURE over `{ activeRuns, sessions }` — it re-reads nothing, introduces no third
// signal, and NEVER recomputes session LIVENESS (the publisher TTL-filters before the
// wire and is the single filtering authority; a formatter that filtered by age would
// be a second staleness authority — refused here as ADR-007 refuses it at the
// control). Subsumption is the one POLICY it applies, and only over a fact it was
// handed — it derives nothing.

function plural(n, word) {
  return n === 1 ? word : `${word}s`;
}

// fleetCurrentWorkLines(presence) — the ONE pure projection both the desktop and
// web views call. Returns `{ lines: string[], token: "primary"|"muted", state:
// "working"|"idle" }`:
//   - `lines` — the exact rendered text set, in order: the `running N runs` line
//     first (when `activeRuns` is non-empty), THEN, if any live session survives the
//     subsumption filter, ONE trailing fallback line `working ·
//     <repo>[ ×<count>][, <repo>[ ×<count>]…] (session)` naming every DISTINCT
//     surviving repo ONCE, comma-joined, with the count wherever a repo holds more
//     than one session (m49/ADR-010); or the single line `idle` when neither exists.
//   - `token` — "primary" when ANY line is active work, else "muted" for the
//     single `idle` line (colour+label always travel together — DESIGN).
//   - `state` — the node's overall liveness: "working" iff activeRuns is non-empty
//     OR sessions is non-empty, else "idle" (self-expiring via the TTL upstream).
export function fleetCurrentWorkLines(presence) {
  const activeRuns = Array.isArray(presence?.activeRuns) ? presence.activeRuns : [];
  const sessions = Array.isArray(presence?.sessions) ? presence.sessions : [];

  const lines = [];
  if (activeRuns.length > 0) {
    lines.push(`running ${activeRuns.length} ${plural(activeRuns.length, "run")}`);
  }

  // THE SUBSUMPTION POLICY (m48/ADR-004, applied here since the wire stopped hiding
  // sessions; m48/ADR-010 R3 fixes the comparison): a session whose workspace already
  // has a running run is one the `running N runs` line above ALREADY accounts for, so
  // it contributes no repo to the fallback line. `!== true` is STRICT on purpose — an
  // absent or non-boolean `workspaceHasRun` is an UNSTATED fact, and an unstated fact
  // never subsumes (a truthiness test would read the string "false" as true and hide a
  // live session). Filtered BEFORE the repo map — so the m49 grouping below counts
  // SURVIVORS, never raw `sessions[]` entries.
  // DESIGN.md §Surface 1 S6: the repo list is ordered deterministically —
  // alphabetical (ascending) by repo short name, a plain locale-independent
  // codepoint comparison (never a locale-sensitive collation, which could
  // disagree with the Rust surface's byte-wise `sort()`). Sorted AFTER
  // filtering so both projections agree on the exact same list.
  const surviving = sessions
    .filter((session) => session?.workspaceHasRun !== true)
    .map((session) => session?.repo)
    .filter((repo) => typeof repo === "string" && repo.length > 0);

  // m49/ADR-010 step 3 — GROUP ON THE RAW STRING. A Map keys on SameValueZero (string
  // identity), so nothing here can trim, case-fold or otherwise normalise a repo name
  // into another repo's bucket. Insertion order is the wire's; it is NOT the line's —
  // step 4 sorts the DISTINCT keys.
  const countByRepo = new Map();
  for (const repo of surviving) countByRepo.set(repo, (countByRepo.get(repo) ?? 0) + 1);

  // Steps 4-5 — the distinct repos in ascending codepoint order, each rendered
  // `<repo>` at one session and `<repo> ×<count>` above one. The sign is U+00D7
  // MULTIPLICATION SIGN (never the letter `x`, U+0078), one space before it and none
  // after; `×1` is never written.
  const parts = [...countByRepo.keys()]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((repo) => (countByRepo.get(repo) === 1 ? repo : `${repo} ×${countByRepo.get(repo)}`));
  if (parts.length > 0) {
    lines.push(`working · ${parts.join(", ")} (session)`);
  }

  const state = lines.length > 0 ? "working" : "idle";
  return {
    lines: lines.length > 0 ? lines : ["idle"],
    token: state === "working" ? "primary" : "muted",
    state,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// milestone 130 / story 03 (ADR-005 §5; DESIGN §Surface 1) — THE LOOP LINE AND ITS BUTTON
// ARE PURE PROJECTIONS, siblings of `fleetCurrentWorkLines` and never lines inside it: that
// function is byte-pinned to the Rust `current_work()` over captured fixtures
// (`acd-captured-producer-fixture`), so the loop lines are composed BESIDE it, in
// `nodeWorkRegion` (./scope.mjs), and the desktop's node row gains no loop text. Every fact
// the card renders — the line, its `title`, which rung the button offers and whether one is
// offered at all — is computed here, in a module node:test drives without React.
//
// THE WIRE'S TWO WORDS, AND THE THREE RUNGS. `presence.loops[].stop` is `null`, `"drain"` or
// `"cancel"` (ADR-001 §2's STOP_LEVELS, spoken by the presence read). The line speaks them as
// `stopping` / `cancelling`, second in the line right after `loop <scope>` — the line
// truncates from its tail, and the request state is the one fact that must survive on the
// card that has no button (a remote node's). A button's `rung` is the rung a click REQUESTS:
// 1 = drain (`Stop`), 2 = cancel (`Stop now`); the wire maps null → 1, drain → 2,
// cancel → 3, and rung 3 is "nothing left to ask" — no button (36's rule: omit, never show a
// dead item; the line's `cancelling` is the receipt until the line disappears).
//
// THE MEMORY IS KEYED TO THE DRIVE, NOT TO THE LOOP'S LIFE (PO ruling, 2026-09-13). A stop's
// wire receipt lags up to ~20 s (a 15 s propagation tick plus the 5 s poll), and a hold that
// DECAYED on a timer would re-offer `Stop` inside that gap — where a reassuring second click
// cancels a session. So the card remembers the rung it reached per `loopRunId` AGAINST the
// drive's `runId`, never lowers it for the same drive, and never expires it on a timer; the
// wire wins by `max`, so the memory is replaced by the wire once the wire has caught up. A
// `--resume` mints a NEW drive (a new `runId`, ADR-003 §6 clears the request), so its entry
// reads a memory from another drive as ABSENT and the button returns on its own — no timer,
// no reload. The propagation gap keeps the SAME `runId` (the drive continues while
// draining), which is exactly where the guard must hold.

const STOP_WORDS = Object.freeze({ drain: "stopping", cancel: "cancelling" });
// The rung the wire's word puts the card at: the request that stands, plus one — the rung the
// NEXT click would ask for. `null` → 1 (nothing stands, `Stop` drains).
const WIRE_RUNG = Object.freeze({ drain: 2, cancel: 3 });
// The word a remembered rung holds the line at until the wire confirms it (DESIGN "held
// locally"): rung 2 means a drain was asked for, rung 3 a cancel.
const HELD_WORD = Object.freeze({ 2: "drain", 3: "cancel" });
const NO_BUTTON_RUNG = 3;

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function stopWord(value) {
  return value === "drain" || value === "cancel" ? value : null;
}

// The plain codepoint comparison the region already uses (38 S6; the `(session)` line's step
// 4) — never a locale collation, which could disagree with the Rust surface's byte-wise sort.
function byScopeThenLoopRunId(left, right) {
  if (left.scope !== right.scope) return left.scope < right.scope ? -1 : 1;
  return left.loopRunId < right.loopRunId ? -1 : left.loopRunId > right.loopRunId ? 1 : 0;
}

// fleetLoopLines(presence, memory) — one entry per `presence.loops[]` element, ascending by
// `scope` (ties by `loopRunId`), each `{ key, line, title, loopRunId, scope, workspaceId, runId,
// stop }`. `memory` (optional — the card's, a Map of `{ rung, runId }` per `loopRunId` from
// `rememberStopRung`) raises each entry's `stop` to the HELD word for the same drive before
// the line is composed (DESIGN "held locally"); without it the projection is wire-only.
//
// THE ANATOMY (DESIGN §Surface 1, left → right):
//   `loop <scope> [· stopping | · cancelling] [· <phase> <ref>] · cycle <n>[ of <cap>]`
// FAIL-CLOSED — the line never prints a value the mint could not have produced: the
// `<phase> <ref>` segment only when both are non-empty strings (between drives the loop has
// no ref, so it reads `loop 129 · cycle 2 of 3` rather than asserting one); the `cycle`
// segment only for a positive-integer `cycle`; ` of <cap>` only for a positive-integer `cap`;
// and an unrecognised `stop` renders no state word and is reported `null`. `level` and
// `supervised` are NOT on the line — a level is configuration, not liveness, and
// "supervised" matters only for what happens after the stop, the desktop's row to say — both
// ride the `title` tail: `… · L2 · supervised`. An absent, null or non-array `loops` is `[]`,
// never a throw. PURE: the presence record is read, never mutated.
export function fleetLoopLines(presence, memory) {
  const loops = Array.isArray(presence?.loops) ? presence.loops : [];
  return loops
    .filter((loop) => loop != null && typeof loop === "object")
    .map((loop) => {
      const scope = String(loop.scope ?? "");
      const stop = heldStopWord(loop, memory instanceof Map ? memory.get(loop.loopRunId) : undefined);
      const parts = [`loop ${scope}`];
      if (stop) parts.push(STOP_WORDS[stop]);
      if (nonEmptyString(loop.phase) && nonEmptyString(loop.ref)) parts.push(`${loop.phase} ${loop.ref}`);
      if (positiveInteger(loop.cycle)) parts.push(positiveInteger(loop.cap) ? `cycle ${loop.cycle} of ${loop.cap}` : `cycle ${loop.cycle}`);
      const line = parts.join(" · ");
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
      };
    })
    .sort(byScopeThenLoopRunId);
}

// heldStopWord(loop, remembered) — the wire's word raised to the remembered rung, for the
// SAME drive only: the "held locally" word the line shows between a 2xx and the wire's
// confirmation. A memory from another drive is absent; a wire word higher than the memory
// wins by construction (it is the max of the two).
function heldStopWord(loop, remembered) {
  const wire = stopWord(loop?.stop);
  const rung = Math.max(wire ? WIRE_RUNG[wire] : 1, rememberedRung(loop, remembered));
  return HELD_WORD[rung] ?? null;
}

// The remembered rung, admitted ONLY while it names this entry's drive (`runId`), else 0.
function rememberedRung(loop, remembered) {
  if (remembered == null || typeof remembered !== "object") return 0;
  if (!Number.isInteger(remembered.rung) || remembered.runId !== loop?.runId) return 0;
  return remembered.rung;
}

// The DESIGN's two buttons, verbatim — label, `title`/`aria-label` and tone. Rung 0 is
// `muted` (draining is the ordinary way a loop ends and loses nothing; the quietest control
// the card renders); rung 1 is `destructive` (the second press cancels a live session
// mid-flight — work is lost), and the tone AND the label change together so the escalation is
// never colour-only and never label-only.
function buttonFor(rung, scope) {
  if (rung === 1) return { rung: 1, label: "Stop", title: `Stop loop ${scope} — the current drive finishes first`, tone: "muted" };
  return { rung: 2, label: "Stop now", title: `Stop loop ${scope} now — cancels the in-flight session`, tone: "destructive" };
}

// loopStopAffordance({ loop, node, localNodeId, remembered }) → `{ button, remote }`.
//
// A button ONLY on THIS node's card: `localNodeId` a non-empty string AND `node.nodeId ===
// localNodeId` — a strict `===`, never a case fold, because a node id is an identity, not a
// label. A `null`/empty `localNodeId` (an unconfigured serving machine, DESIGN default 6) is
// neither local nor remote: no button, `remote: false`, no tail; a `localNodeId` no card
// carries makes EVERY card remote. The rung is `max(wire, remembered)` — the memory admitted
// only for the same drive — and rung 3 is `null`: nothing left to ask. `remote` is what
// `nodeWorkRegion` turns into the line's `title` tail (`· remote — stop from <nodeId>'s own
// console`): every absence carries its reason (49's affordance-table rule).
export function loopStopAffordance({ loop, node, localNodeId, remembered } = {}) {
  const local = nonEmptyString(localNodeId) && node?.nodeId === localNodeId;
  if (!local) return { button: null, remote: nonEmptyString(localNodeId) };
  const wire = stopWord(loop?.stop);
  const rung = Math.max(wire ? WIRE_RUNG[wire] : 1, rememberedRung(loop, remembered));
  if (rung >= NO_BUTTON_RUNG) return { button: null, remote: false };
  return { button: buttonFor(rung, String(loop?.scope ?? "")), remote: false };
}

// rememberStopRung(memory, loopRunId, rung, runId) → a NEW Map (the input is never mutated —
// React state) holding `{ rung, runId }` for `loopRunId`. For the SAME drive the rung never
// lowers (a memory of 2 over a request of 1 stays 2); a DIFFERENT `runId` is a new drive and
// starts a new memory at the requested rung, whatever the old one held. Every other key rides
// through unchanged. Nothing here expires — the wire is the only thing that retires a memory,
// by naming a new drive or by the line disappearing with the loop.
export function rememberStopRung(memory, loopRunId, rung, runId) {
  const next = new Map(memory instanceof Map ? memory : []);
  const prior = next.get(loopRunId);
  const sameDrive = prior != null && prior.runId === runId;
  next.set(loopRunId, { rung: sameDrive ? Math.max(prior.rung, rung) : rung, runId });
  return next;
}
