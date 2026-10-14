<objective>
Produce (or refresh) a milestone's `RETROSPECTIVE.md` — the distilled lessons from how execution
actually went. The same session the close runs, made standalone so you can **backfill** milestones
accepted before they had a retro.
</objective>

<config>
Parse "$ARGUMENTS":
- a **ref** (`NN`, or a story's `NN/SS`) or **range** (`NN-MM`) → resolve via `aof work find <ref> --json` / iterate the range;
- **omitted** → every milestone that is `done` and has **no** `RETROSPECTIVE.md` yet (backfill mode).

**A STORY REF IS A FIRST-CLASS TARGET, AND ITS RETRO LANDS IN ITS OWN FOLDER (story 85).** Nesting is
not a reason to skip it: `NN/SS` writes `stories/<SS>_story_<slug>/RETROSPECTIVE.md`, a parentless
`NN` writes the story's own folder, and neither is satisfied by the milestone's. They answer
different questions — the milestone's retro carries what running the milestone taught, the story's
what building that story taught — and a reader of one story finds nothing of it in the document
above. Measured before story 85: 57 `RETROSPECTIVE.md` at driver level and **zero** under
`stories/`.
</config>

<process>
For each target item (a milestone NN, or a story — the steps are the same, read against that item's
own folder; a story has no `STATE.md`/`VERIFICATION.md` of its own, so its evidence is its review
findings, its `## Findings` section and any recorded blocker stop):

Before triage, recall the target's domain with `aof work memory recall "<domain / keywords>" --block`.
Use existing lessons to deduplicate, never as invented evidence; an empty block is harmless.

1. **Refresh observability (on by default).** Run `aof work observe NN --write --if-enabled` — the
   CLI self-gates on `work.observability.enabled`, which now defaults **ON** (set it to `false` to opt
   out), so it is always safe to call
   unconditionally (the CLI decides, not you). When enabled it (re)writes
   `NN/observability/{report.md,agents.json}` — the per-agent time / token / **stall** record mined
   from the session transcripts. It re-reads every transcript and overwrites, so a partial run is
   never wrong, only less complete; the close's run (all stories done) is the authoritative snapshot.
2. **Gather the evidence through recall** (read-only). First `aof work memory ingest`, then
   `aof work memory recall "" --item <ref> --area delivery --all --json` — ONE recall of the item's
   whole delivery history, after the observability refresh above. What it returns is the evidence,
   each record cited by its `source`:
   - **findings** → the defects/gaps caught at review, with their triage — the richest source for an
     already-accepted milestone;
   - **feedback** → the raw feedback captured while the item ran;
   - **runs** → each terminal run's outcome, `failureReason` and stalls. A **stall** (an agent idle
     past the threshold — dropped connection / interrupt / machine-off) or a grossly outsized
     time/token consumer is a candidate **process lesson** (Kind: blocker | near-miss · Area:
     process), never a product finding.

   Open a cited source to substantiate a record; never enumerate `VERIFICATION.md`,
   `FEEDBACK.ndjson` or run records as the evidence path. When memory is off, or the recall returns
   nothing, report the episodic evidence as unavailable — do not fall back to reading the raw ledgers.
   This retrospective's own run is still open, so it is correctly absent. This evidence step records
   no recall observation. Beside it, read:
   - `STATE.md` → durable decisions, the closure record and carried follow-ups — anything recording
     a decision-with-hindsight. Its `## Feedback (for retro)` notes project feedback the recall
     already returned: do not count it twice.
   - Any recorded blocker stops.
3. **Triage.** Keep only what carries a **lesson** — a mistake, blocker, near-miss, or misunderstanding
   worth not repeating. A finding that was a clean catch with no process lesson is **not** a retro
   entry (it already lives in VERIFICATION). Dedup against any existing `R<n>` entries.
4. **Distil + write** `RETROSPECTIVE.md` (`doc: retrospective`). One `R<n>` per lesson — **append**,
   never renumber:
   - **Kind:** mistake | blocker | near-miss | misunderstanding · **Area:** code | architecture | contract | security | process
   - **Stage:** refine | build | verify · **Owner:** the role/lane · **Raised by:** who flagged it
   - `aof work validate` holds this line on a live item: Kind, Area and Stage each start with one of
     the words listed above, and a qualifier goes after the word, as `near-miss (recurring)`; Owner
     must be present. A lesson with no meta line fails on all four. An archived item's lessons are
     flagged by `aof work doctor` and never rewritten.
   - **What happened** *(factual)* · **Why** *(root cause)* · **Lesson** *(what to do differently)* · **Refs:** the VERIFICATION `@finding-<id>` / ADR / commit / `observability/report.md` — **reference, never restate**
   - **Watermark first.** Before the first new `R<n>` is appended to a document, write
     `promotionFrom: <the next R number>` in its frontmatter (`1` for a new document). Lessons
     below it are legacy: never rewritten, never backfilled.
   - **Match before you write.** For each NEW lesson, run `aof work memory recurrence "<the
     lesson's what-happened and lesson text>" --exclude <new lesson id> --json`, where `<new lesson id>` (`<item>/R<n>`) is
     the identity the new lesson is about to take. When `qualifying` names a reference, the meta
     line carries `**Recurs:** <item>/R<n>`; when it is null, the lesson has no Recurs field. The
     new incident keeps its own factual evidence and identity, and the prior lesson is not touched.
   - **Promoted to, always.** Every new lesson's meta line carries `**Promoted to:**` — `none`,
     `control:<qualified-id>`, `rule:<repo-path>` or `prompt:<repo-path>`, naming only a prevention
     that exists. A lesson with no completed promotion says `none`; never claim a planned control.
5. **Conditional.** If a milestone surfaced nothing worth a lesson, **write no doc** and say so —
   report no new lesson, leave every existing lesson body byte-identical, and invent no recurrence
   or promotion (absence is information). Never manufacture entries to fill the page. The
   `observability/` folder (when the opt-in is on) is written regardless — it is a diagnostic, not
   a lesson doc.
6. **Index the authored records.** Run `aof work memory ingest` only AFTER the lesson pass has
   authored `promotionFrom`, `Recurs` and `Promoted to`; this is safe when memory is off. Keep the
   shared Kind / Area / Stage / Owner vocabulary above.
</process>

<output>
Per item: created / updated / skipped-clean, with the `R<n>` count and a one-line digest of each
lesson; note whether an `observability/` snapshot was written (or skipped: `work.observability.enabled: false`). Modify only
`RETROSPECTIVE.md` (the `observability/` folder is written by `aof work observe`, not by hand).
</output>